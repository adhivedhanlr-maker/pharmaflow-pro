import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
const pdf = require('pdf-parse');

@Injectable()
export class OCRService {
    private genAI: GoogleGenerativeAI;
    private readonly logger = new Logger(OCRService.name);

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
        }
    }

    async extractFromInvoice(file: { buffer: Buffer, mimetype: string }): Promise<any> {
        if (!this.genAI) {
            throw new Error('GEMINI_API_KEY is not configured');
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            let prompt = "";
            let parts: any[] = [];

            if (file.mimetype === 'application/pdf') {
                // 1. Extract text from PDF
                this.logger.log('Extracting text from PDF...');
                const data = await pdf(file.buffer);
                const text = data.text;

                if (!text || text.trim().length === 0) {
                    throw new Error('No text could be extracted from the PDF');
                }

                prompt = `
          You are an expert at parsing medical distribution invoices (GST Invoices). 
          Extract the following information from the provided text and return ONLY a valid JSON object.
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

          Invoice Text Content:
          ${text}
          `;
                parts = [prompt];
            } else {
                // 2. Handle Images (Multimodal)
                this.logger.log('Processing image with Gemini AI (Multimodal)...');
                
                prompt = `
          You are an expert at parsing medical distribution invoices (GST Invoices) from images. 
          Extract the following information from the provided image and return ONLY a valid JSON object.
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
                
                parts = [
                    prompt,
                    {
                        inlineData: {
                            data: file.buffer.toString('base64'),
                            mimeType: file.mimetype
                        }
                    }
                ];
            }

            const result = await model.generateContent(parts);
            const response = await result.response;
            const responseText = response.text();

            // Clean response text in case it includes markdown
            const cleanJson = responseText.replace(/```json|```/g, '').trim();
            
            return JSON.parse(cleanJson);
        } catch (error: any) {
            this.logger.error(`Error in OCR extraction: ${error.message}`);
            throw error;
        }
    }
}
