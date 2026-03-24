import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

type ParsedItem = {
    name: string;
    composition: string;
    hsn: string;
    pack: string;
    batch: string;
    expiry: string;
    quantity: number;
    free: number;
    pts: number;
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

@Injectable()
export class OCRService {
    private readonly logger = new Logger(OCRService.name);
    private readonly client: Anthropic;

    constructor() {
        this.client = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
    }

    async extractFromInvoice(file: { buffer: Buffer; mimetype: string }): Promise<ParsedInvoice> {
        const mimeType = file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype;
        const base64 = file.buffer.toString('base64');

        const prompt = `You are extracting data from a pharmaceutical distribution GST invoice.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "supplierName": "string",
  "invoiceNumber": "string",
  "date": "YYYY-MM-DD",
  "items": [
    {
      "name": "product brand name",
      "composition": "",
      "hsn": "HSN code or empty string",
      "pack": "packing eg 10'S or 150ML",
      "batch": "batch number",
      "expiry": "YYYY-MM-DD (use 01 for day, eg 5/27 = 2027-05-01)",
      "quantity": number,
      "free": number (free qty, 0 if not present),
      "pts": number (price to stockist, 0 if not present),
      "ptr": number (price to retailer, 0 if not present),
      "mrp": number,
      "discount": number (discount percentage, 0 if not present),
      "gstPercent": number (SGST+CGST combined, eg if SGST=2.5 and CGST=2.5 then 5),
      "amount": number (line total)
    }
  ]
}

Rules:
- supplierName: the company SELLING (top of invoice, the FROM company)
- invoiceNumber: the bill/invoice number
- For expiry dates like "5/27" or "05/27" → "2027-05-01"
- Extract ALL product line items only, skip header/summary rows
- PTS = Price to Stockist (what buyer pays), PTR = Price to Retailer
- If invoice has column labeled "PTR" with purchase amounts, put in pts field too
- amount = quantity × purchase price (before GST)`;

        try {
            let messageContent: any[];

            if (mimeType === 'application/pdf') {
                messageContent = [
                    {
                        type: 'document',
                        source: {
                            type: 'base64',
                            media_type: 'application/pdf',
                            data: base64,
                        },
                    },
                    { type: 'text', text: prompt },
                ];
            } else {
                messageContent = [
                    {
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
                            data: base64,
                        },
                    },
                    { type: 'text', text: prompt },
                ];
            }

            const response = await this.client.messages.create({
                model: 'claude-opus-4-6',
                max_tokens: 4096,
                messages: [{ role: 'user', content: messageContent }],
            });

            const text = response.content[0].type === 'text' ? response.content[0].text : '';
            if (!text) {
                throw new HttpException('No response from AI extraction', HttpStatus.UNPROCESSABLE_ENTITY);
            }

            // Strip markdown code fences if present
            const jsonText = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

            let parsed: ParsedInvoice;
            try {
                parsed = JSON.parse(jsonText);
            } catch {
                this.logger.error('Failed to parse AI response as JSON:', text);
                throw new HttpException(
                    'Could not parse invoice data. Try a clearer image.',
                    HttpStatus.UNPROCESSABLE_ENTITY,
                );
            }

            if (!parsed.items || parsed.items.length === 0) {
                throw new HttpException(
                    'No line items found in invoice. Try a clearer image.',
                    HttpStatus.UNPROCESSABLE_ENTITY,
                );
            }

            this.logger.log(`Extracted ${parsed.items.length} items from invoice`);
            return parsed;

        } catch (error: unknown) {
            if (error instanceof HttpException) throw error;
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Invoice extraction failed: ${message}`);
            throw new HttpException(`Invoice extraction failed: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
