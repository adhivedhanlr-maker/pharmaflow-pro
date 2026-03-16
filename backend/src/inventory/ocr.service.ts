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

            let parts: any[] = [];

            if (file.mimetype === 'application/pdf') {
                this.logger.log('Extracting text from PDF...');
                const data = await pdf(file.buffer);
                const extractedText = data.text;

                if (!extractedText || extractedText.trim().length === 0) {
                    throw new Error('No text could be extracted from the PDF');
                }

                parts = [`${prompt}\n\nInvoice Text Content:\n${extractedText}`];
            } else {
                this.logger.log('Processing image with Gemini AI (Multimodal)...');
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

            // Robust JSON extraction
            const jsonStart = responseText.indexOf('{');
            const jsonEnd = responseText.lastIndexOf('}');
            
            if (jsonStart === -1 || jsonEnd === -1) {
                this.logger.error("AI did not return valid JSON: " + responseText);
                throw new Error("The AI model returned an invalid response format. Please try again or enter details manually.");
            }

            const cleanJson = responseText.substring(jsonStart, jsonEnd + 1);
            return JSON.parse(cleanJson);
        } catch (error: any) {
            this.logger.error(`Error in OCR extraction: ${error.message}`);
            throw error;
        }
    }
}
