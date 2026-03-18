import { HttpException, HttpStatus, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import { createWorker, type Worker } from 'tesseract.js';

type ParsedItem = {
    name: string;
    composition: string;
    hsn: string;
    pack: string;
    batch: string;
    expiry: string;
    quantity: number;
    free: number;
    ptr: number;
    mrp: number;
    discount: number;
    gstPercent: number;
    amount: number;
};

type ParsedInvoice = {
    supplierName: string;
    invoiceNumber: string;
    date: string;
    items: ParsedItem[];
};

type TableRowShape = string[];

const SUMMARY_KEYWORDS = [
    'total',
    'taxable',
    'discount',
    'cgst',
    'sgst',
    'igst',
    'cess',
    'round',
    'gross',
    'net',
    'balance',
    'amount',
    'invoice value',
    'sub total',
    'subtotal',
    'grand total',
];

@Injectable()
export class OCRService implements OnModuleDestroy {
    private readonly logger = new Logger(OCRService.name);
    private workerPromise: Promise<Worker> | null = null;

    async onModuleDestroy() {
        if (!this.workerPromise) return;
        const worker = await this.workerPromise;
        await worker.terminate();
    }

    private async getWorker(): Promise<Worker> {
        if (!this.workerPromise) {
            this.workerPromise = createWorker('eng');
        }
        return this.workerPromise;
    }

    private normalizeText(text: string): string {
        return text
            .replace(/\r/g, '\n')
            .replace(/[|]/g, ' ')
            .replace(/[ \t]+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    private normalizeMimeType(mimeType: string): string {
        if (mimeType === 'image/jpg' || mimeType === 'image/pjpeg') return 'image/jpeg';
        if (mimeType === 'image/x-png') return 'image/png';
        return mimeType;
    }

    private countNumericTokens(line: string): number {
        const matches = line.match(/\b\d+(?:\.\d+)?\b/g);
        return matches ? matches.length : 0;
    }

    private normalizeDate(dateText: string): string {
        const match = dateText.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
        if (!match) return '';

        const [, dd, mm, yyyy] = match;
        const month = Number(mm);
        const day = Number(dd);
        if (month < 1 || month > 12 || day < 1 || day > 31) return '';

        const fullYear = yyyy.length === 2 ? `20${yyyy}` : yyyy;
        return `${fullYear.padStart(4, '0')}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }

    private normalizeExpiry(expiryText: string): string {
        const trimmed = expiryText.trim();
        const monthYearMatch = trimmed.match(/(\d{1,2})[\/\-.](\d{2,4})/);
        if (!monthYearMatch) return trimmed;

        const [, month, year] = monthYearMatch;
        const monthNumber = Number(month);
        if (monthNumber < 1 || monthNumber > 12) return '';

        const fullYear = year.length === 2 ? `20${year}` : year;
        const yearNumber = Number(fullYear);
        const currentYear = new Date().getFullYear();
        if (yearNumber < currentYear - 1 || yearNumber > currentYear + 20) return '';

        return `${fullYear.padStart(4, '0')}-${month.padStart(2, '0')}-01`;
    }

    private isUsableInvoiceNumber(value: string): boolean {
        const cleaned = value.trim().replace(/[:\-]/g, '');
        if (cleaned.length < 4) return false;
        if (!/\d/.test(cleaned)) return false;
        if (/^(no|number|invoice|bill)$/i.test(cleaned)) return false;
        return true;
    }

    private extractInvoiceNumber(text: string): string {
        const patterns = [
            /(?:invoice|bill)\s*(?:no|number|#|num)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\/-]{3,})/i,
            /\b(?:inv|bill)\s*[:#-]?\s*([A-Z0-9][A-Z0-9\/-]{3,})/i,
        ];

        for (const pattern of patterns) {
            const matches = text.matchAll(pattern);
            for (const match of matches) {
                const candidate = match[1]?.trim() || '';
                if (this.isUsableInvoiceNumber(candidate)) return candidate;
            }
        }

        return '';
    }

    private extractInvoiceDate(text: string): string {
        const patterns = [
            /(?:invoice|bill)?\s*date\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
            /\bdate\b\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match?.[1]) return this.normalizeDate(match[1]);
        }

        return '';
    }

    private extractSupplierName(lines: string[]): string {
        const blockedPatterns = [
            /tax invoice/i,
            /invoice/i,
            /bill/i,
            /gstin/i,
            /phone/i,
            /mobile/i,
            /email/i,
            /address/i,
            /www\./i,
        ];

        for (const line of lines.slice(0, 8)) {
            const trimmed = line.trim();
            if (trimmed.length < 4) continue;
            if (this.countNumericTokens(trimmed) > 2) continue;
            if (blockedPatterns.some((pattern) => pattern.test(trimmed))) continue;
            return trimmed;
        }

        return '';
    }

    private isSummaryLine(line: string): boolean {
        const normalized = line.toLowerCase();
        return SUMMARY_KEYWORDS.some((keyword) => normalized.includes(keyword));
    }

    private parseNumber(token: string): number {
        const cleaned = token.replace(/[,\u20B9]/g, '');
        const value = Number(cleaned);
        return Number.isFinite(value) ? value : 0;
    }

    private isLikelyHeaderToken(token: string): boolean {
        return /^(no|date|batch|exp|expiry|qty|mrp|ptr|pts|nr|amount|rate)$/i.test(token.trim());
    }

    private parseQuantity(tokens: string[]): number {
        for (const token of tokens) {
            if (!/^\d+(?:\.\d+)?$/.test(token)) continue;
            const value = this.parseNumber(token);
            if (value > 0 && value <= 10000) return value;
        }
        return 1;
    }

    private parseLineItem(line: string): ParsedItem | null {
        const expiryMatch = line.match(/\b(\d{1,2}[\/\-.]\d{2,4})\b/);
        const numericTokens = line.match(/\d+(?:\.\d+)?/g) || [];
        if (!expiryMatch || numericTokens.length < 2 || this.isSummaryLine(line)) {
            return null;
        }

        const tokens = line.split(/\s+/).filter(Boolean);
        const expiryIndex = tokens.findIndex((token) => /\d{1,2}[\/\-.]\d{2,4}/.test(token));
        if (expiryIndex === -1) return null;

        const batch = expiryIndex > 0 ? tokens[expiryIndex - 1].replace(/[^A-Z0-9/-]/gi, '') : '';
        const nameTokens = tokens
            .slice(0, Math.max(0, expiryIndex - 1))
            .filter((token, index) => !(index === 0 && /^\d+$/.test(token)))
            .filter((token) => !this.isLikelyHeaderToken(token));
        const name = nameTokens.join(' ').trim();
        if (!name || name.length < 3 || !/[A-Za-z]/.test(name)) return null;

        const trailingTokens = tokens.slice(expiryIndex + 1);
        const values = trailingTokens
            .map((token) => token.replace(/[,\u20B9%]/g, ''))
            .filter((token) => /^\d+(?:\.\d+)?$/.test(token))
            .map((token) => this.parseNumber(token));

        const quantity = this.parseQuantity(trailingTokens);
        const positiveValues = values.filter((value) => value > 0);
        const mrp = positiveValues.length > 0 ? positiveValues[positiveValues.length - 1] : 0;
        const ptr = positiveValues.length > 1 ? positiveValues[positiveValues.length - 2] : mrp;
        const amount = positiveValues.length > 2 ? positiveValues[positiveValues.length - 3] : 0;
        const expiry = this.normalizeExpiry(expiryMatch[1]);

        if (!expiry) return null;

        return {
            name,
            composition: '',
            hsn: '',
            pack: '',
            batch,
            expiry,
            quantity,
            free: 0,
            ptr,
            mrp,
            discount: 0,
            gstPercent: 0,
            amount,
        };
    }

    private extractItems(lines: string[]): ParsedItem[] {
        const items: ParsedItem[] = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length < 8) continue;
            if (this.isSummaryLine(trimmed)) continue;
            if (this.countNumericTokens(trimmed) < 2) continue;

            const item = this.parseLineItem(trimmed);
            if (!item) continue;

            const duplicate = items.find(
                (existing) =>
                    existing.name === item.name &&
                    existing.batch === item.batch &&
                    existing.expiry === item.expiry,
            );
            if (!duplicate) {
                items.push(item);
            }
        }

        return items;
    }

    private buildItemFromCells(cells: string[], columnMap?: Record<string, number>): ParsedItem | null {
        const cleanedCells = cells.map((cell) => cell.trim()).filter(Boolean);
        if (cleanedCells.length < 3) return null;
        if (cleanedCells.some((cell) => this.isSummaryLine(cell))) return null;

        const byIndex = (name: string): string => {
            const index = columnMap?.[name];
            return typeof index === 'number' ? cleanedCells[index] || '' : '';
        };

        const name = byIndex('name') || cleanedCells[0];
        const batch = byIndex('batch');
        const expiryRaw = byIndex('expiry') || cleanedCells.find((cell) => /\d{1,2}[\/\-.]\d{2,4}/.test(cell)) || '';
        const expiry = this.normalizeExpiry(expiryRaw);

        if (!name || name.length < 3 || !/[A-Za-z]/.test(name) || !expiry) return null;
        if (/^(date|batch|expiry|exp|qty|mrp|ptr|pts|nr)$/i.test(name)) return null;

        const quantity = this.parseNumber(byIndex('qty')) || 1;
        const mrp = this.parseNumber(byIndex('mrp'));
        const ptr = this.parseNumber(byIndex('ptr')) || mrp;

        return {
            name,
            composition: '',
            hsn: '',
            pack: byIndex('pack'),
            batch,
            expiry,
            quantity: quantity > 0 ? quantity : 1,
            free: 0,
            ptr,
            mrp,
            discount: 0,
            gstPercent: 0,
            amount: 0,
        };
    }

    private buildColumnMap(headerCells: string[]): Record<string, number> {
        const map: Record<string, number> = {};

        headerCells.forEach((cell, index) => {
            const normalized = cell.toLowerCase();
            if (map.name === undefined && /(product|item|description|particular|name|brand)/.test(normalized)) map.name = index;
            if (map.pack === undefined && /pack/.test(normalized)) map.pack = index;
            if (map.batch === undefined && /batch/.test(normalized)) map.batch = index;
            if (map.expiry === undefined && /(exp|expiry)/.test(normalized)) map.expiry = index;
            if (map.qty === undefined && /(qty|quantity)/.test(normalized)) map.qty = index;
            if (map.mrp === undefined && /mrp/.test(normalized)) map.mrp = index;
            if (map.ptr === undefined && /(ptr|purchase|rate)/.test(normalized)) map.ptr = index;
        });

        return map;
    }

    private extractItemsFromTables(tablePages: Array<{ tables: TableRowShape[] }>): ParsedItem[] {
        const items: ParsedItem[] = [];

        for (const page of tablePages) {
            for (const table of page.tables || []) {
                const rows = table as unknown as TableRowShape[];
                if (!rows.length) continue;

                let columnMap: Record<string, number> | undefined;
                rows.forEach((row, rowIndex) => {
                    const cells = row.map((cell) => cell.trim()).filter(Boolean);
                    if (!cells.length) return;

                    if (rowIndex === 0) {
                        const maybeHeader = this.buildColumnMap(cells);
                        if (maybeHeader.name !== undefined || maybeHeader.batch !== undefined || maybeHeader.expiry !== undefined) {
                            columnMap = maybeHeader;
                            return;
                        }
                    }

                    const item = this.buildItemFromCells(cells, columnMap);
                    if (!item) return;

                    const duplicate = items.find(
                        (existing) =>
                            existing.name === item.name &&
                            existing.batch === item.batch &&
                            existing.expiry === item.expiry,
                    );
                    if (!duplicate) items.push(item);
                });
            }
        }

        return items;
    }

    private sanitizeParsedInvoice(data: ParsedInvoice): ParsedInvoice {
        return {
            supplierName: data.supplierName.trim(),
            invoiceNumber: this.isUsableInvoiceNumber(data.invoiceNumber) ? data.invoiceNumber.trim() : '',
            date: data.date.trim(),
            items: data.items.filter((item) => item.name),
        };
    }

    private parseInvoiceText(rawText: string): ParsedInvoice {
        const text = this.normalizeText(rawText);
        const lines = text
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);

        return this.sanitizeParsedInvoice({
            supplierName: this.extractSupplierName(lines),
            invoiceNumber: this.extractInvoiceNumber(text),
            date: this.extractInvoiceDate(text),
            items: this.extractItems(lines),
        });
    }

    private async extractPdfData(buffer: Buffer): Promise<{ text: string; items: ParsedItem[] }> {
        const parser = new PDFParse({ data: buffer });

        try {
            const textResult = await parser.getText();
            const directText = this.normalizeText(textResult.text || '');
            const tableResult = await parser.getTable();
            const tableItems = this.extractItemsFromTables(tableResult.pages as unknown as Array<{ tables: TableRowShape[] }>);

            if (directText.length >= 50 || tableItems.length > 0) {
                return {
                    text: directText,
                    items: tableItems,
                };
            }

            const screenshotResult = await parser.getScreenshot({ first: 2, scale: 1.5 });
            const ocrTexts: string[] = [];

            for (const page of screenshotResult.pages) {
                const pageText = await this.extractTextFromImage(Buffer.from(page.data));
                if (pageText) ocrTexts.push(pageText);
            }

            return {
                text: this.normalizeText(ocrTexts.join('\n')),
                items: tableItems,
            };
        } finally {
            await parser.destroy();
        }
    }

    private async extractTextFromImage(buffer: Buffer): Promise<string> {
        const worker = await this.getWorker();
        const result = await worker.recognize(buffer);
        return this.normalizeText(result.data.text || '');
    }

    async extractFromInvoice(file: { buffer: Buffer; mimetype: string }): Promise<ParsedInvoice> {
        const mimeType = this.normalizeMimeType(file.mimetype);

        try {
            this.logger.log(`Processing invoice via local OCR pipeline (${mimeType})...`);

            let extractedText = '';
            let tableItems: ParsedItem[] = [];
            if (mimeType === 'application/pdf') {
                const pdfData = await this.extractPdfData(file.buffer);
                extractedText = pdfData.text;
                tableItems = pdfData.items;
            } else {
                extractedText = await this.extractTextFromImage(file.buffer);
            }

            if (!extractedText) {
                throw new HttpException(
                    'We could not read text from that invoice. Try a clearer image or a searchable PDF.',
                    HttpStatus.UNPROCESSABLE_ENTITY,
                );
            }

            const parsedInvoice = this.parseInvoiceText(extractedText);
            if (tableItems.length > 0) {
                parsedInvoice.items = tableItems;
            }

            if (parsedInvoice.items.length === 0) {
                throw new HttpException(
                    'Invoice text was read, but no line items could be extracted. Try a clearer file or enter the items manually.',
                    HttpStatus.UNPROCESSABLE_ENTITY,
                );
            }

            return parsedInvoice;
        } catch (error: unknown) {
            if (error instanceof HttpException) {
                throw error;
            }

            const message = error instanceof Error ? error.message : 'Unknown OCR error';
            this.logger.error(`Error in local OCR extraction: ${message}`, error instanceof Error ? error.stack : undefined);
            throw new HttpException(`Invoice extraction failed: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
