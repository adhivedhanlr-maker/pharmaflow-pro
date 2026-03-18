import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class OCRService {
    private genAI: GoogleGenerativeAI;
    private readonly logger = new Logger(OCRService.name);
    private readonly modelName: string;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        this.modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
        }
    }

    private normalizeMimeType(mimeType: string): string {
        if (mimeType === 'image/jpg' || mimeType === 'image/pjpeg') return 'image/jpeg';
        if (mimeType === 'image/x-png') return 'image/png';
        return mimeType;
    }

    private sanitizeItem(item: unknown) {
        const safeItem: Record<string, unknown> = item && typeof item === 'object' ? item as Record<string, unknown> : {};
        return {
            name: typeof safeItem.name === 'string' ? safeItem.name.trim() : '',
            composition: typeof safeItem.composition === 'string' ? safeItem.composition.trim() : '',
            hsn: typeof safeItem.hsn === 'string' ? safeItem.hsn.trim() : '',
            pack: typeof safeItem.pack === 'string' ? safeItem.pack.trim() : '',
            batch: typeof safeItem.batch === 'string' ? safeItem.batch.trim() : '',
            expiry: typeof safeItem.expiry === 'string' ? safeItem.expiry.trim() : '',
            quantity: Number.isFinite(Number(safeItem.quantity)) ? Number(safeItem.quantity) : 0,
            free: Number.isFinite(Number(safeItem.free)) ? Number(safeItem.free) : 0,
            ptr: Number.isFinite(Number(safeItem.ptr)) ? Number(safeItem.ptr) : 0,
            mrp: Number.isFinite(Number(safeItem.mrp)) ? Number(safeItem.mrp) : 0,
            discount: Number.isFinite(Number(safeItem.discount)) ? Number(safeItem.discount) : 0,
            gstPercent: Number.isFinite(Number(safeItem.gstPercent)) ? Number(safeItem.gstPercent) : 0,
            amount: Number.isFinite(Number(safeItem.amount)) ? Number(safeItem.amount) : 0,
        };
    }

    private sanitizeExtractedInvoice(data: unknown) {
        const safeData: Record<string, unknown> = data && typeof data === 'object' ? data as Record<string, unknown> : {};
        const rawItems = safeData.items;
        const items = Array.isArray(rawItems)
            ? rawItems
                .map((item: unknown) => this.sanitizeItem(item))
                .filter((item: ReturnType<OCRService['sanitizeItem']>) => item.name || item.batch || item.pack || item.quantity > 0)
            : [];

        return {
            supplierName: typeof safeData.supplierName === 'string' ? safeData.supplierName.trim() : '',
            invoiceNumber: typeof safeData.invoiceNumber === 'string' ? safeData.invoiceNumber.trim() : '',
            date: typeof safeData.date === 'string' ? safeData.date.trim() : '',
            items,
        };
    }

    async extractFromInvoice(file: { buffer: Buffer, mimetype: string }): Promise<any> {
        if (!this.genAI) {
            throw new HttpException('GEMINI_API_KEY is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: this.modelName });
            const prompt = `
          You are an expert at parsing medical distribution invoices (GST Invoices). 
          Extract the following information and return ONLY a valid JSON object.
          Do not include any markdown formatting like \`\`\`json or explanations.

          Fields to extract:
          - supplierName: Name of the company selling the products
          - invoiceNumber: The bill or invoice number
          - date: Invoice date (format: YYYY-MM-DD)
          - items: An array of objects, each containing:
            - name: Product name
            - hsn: HSN code
            - pack: Packing (e.g., 10'S, 100ML)
            - batch: Batch number
            - expiry: Expiry date (format: MM/YY or YYYY-MM-DD)
            - quantity: Quantity purchased
            - free: Free quantity (0 if not mentioned)
            - ptr: Purchase Price to Retailer
            - mrp: Maximum Retail Price
            - discount: Discount percentage
            - gstPercent: GST percentage (SGST + CGST)
            - amount: Total amount for this item
          `;

            this.logger.log(`Processing ${file.mimetype} with Gemini AI model ${this.modelName}...`);
            
            // Normalize mimetype for Gemini compatibility
            const mimeType = this.normalizeMimeType(file.mimetype);
            
            const parts = [
                prompt,
                {
                    inlineData: {
                        data: file.buffer.toString('base64'),
                        mimeType: mimeType
                    }
                }
            ];

            const result = await model.generateContent(parts);
            const response = await result.response;
            const responseText = response.text();

            // Robust JSON extraction
            const jsonStart = responseText.indexOf('{');
            const jsonEnd = responseText.lastIndexOf('}');
            
            if (jsonStart === -1 || jsonEnd === -1) {
                this.logger.error("AI did not return valid JSON: " + responseText);
                throw new HttpException("The AI provided a response but it was not in the expected format. Please ensure the invoice is clear and readable.", HttpStatus.UNPROCESSABLE_ENTITY);
            }

            const cleanJson = responseText.substring(jsonStart, jsonEnd + 1);
            const parsedJson = JSON.parse(cleanJson);
            const sanitizedInvoice = this.sanitizeExtractedInvoice(parsedJson);

            if (sanitizedInvoice.items.length === 0) {
                throw new HttpException('We could not read any line items from that invoice. Please try a clearer PDF or image.', HttpStatus.UNPROCESSABLE_ENTITY);
            }

            return sanitizedInvoice;
        } catch (error: any) {
            this.logger.error(`Error in OCR extraction: ${error.message}`, error.stack);
            
            if (error instanceof HttpException) {
                throw error;
            }
            
            // Re-throw with a more user-friendly message that includes the original error
            if (error.message && error.message.includes('400')) {
                 throw new HttpException(`AI Service Error (400): ${error.message} - Please ensure the file is a valid image or PDF.`, HttpStatus.BAD_REQUEST);
            }
            throw new HttpException(`AI Extraction Failed: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
