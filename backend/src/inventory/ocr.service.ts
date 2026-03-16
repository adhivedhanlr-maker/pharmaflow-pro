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

    async extractFromInvoice(fileBuffer: Buffer): Promise<any> {
        if (!this.genAI) {
            throw new Error('GEMINI_API_KEY is not configured');
        }

        try {
            // 1. Extract text from PDF
            this.logger.log('Extracting text from PDF...');
            const data = await pdf(fileBuffer);
            const text = data.text;

            if (!text || text.trim().length === 0) {
                throw new Error('No text could be extracted from the PDF');
            }

            // 2. Use Gemini to parse the text
            this.logger.log('Parsing text with Gemini AI...');
            const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const prompt = `
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

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const responseText = response.text();

            // Clean response text in case it includes markdown
            const cleanJson = responseText.replace(/```json|```/g, '').trim();
            
            return JSON.parse(cleanJson);
        } catch (error) {
            this.logger.error(`Error in OCR extraction: ${error.message}`);
            throw error;
        }
    }
}
