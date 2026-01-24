import React from 'react';
import { format } from 'date-fns';

interface InvoicePrintProps {
    invoiceNumber: string;
    date: Date;
    customer: {
        name: string;
        address: string;
        gstin?: string;
        phone?: string;
    };
    items: Array<{
        id: string;
        name: string;
        batchNumber: string;
        expiryDate?: string;
        quantity: number;
        freeQuantity?: number;
        unitPrice: number;
        gstRate: number;
        gstAmount: number;
        total: number;
    }>;
    totals: {
        subtotal: number;
        gst: number;
        net: number;
    };
}

export const InvoicePrint = React.forwardRef<HTMLDivElement, InvoicePrintProps>(
    ({ invoiceNumber, date, customer, items, totals }, ref) => {
        return (
            <div ref={ref} className="hidden print:block p-6 bg-white text-black font-sans max-w-[210mm] mx-auto h-auto">
                {/* Header */}
                <div className="flex justify-between items-start mb-8 border-b-2 border-slate-800 pb-4">
                    <div className="flex items-center gap-4">
                        <img
                            src="/pharmaflow-logo.png"
                            alt="PharmaFlow Logo"
                            className="h-16 w-16 object-contain rounded-lg"
                        />
                        <div>
                            <h1 className="text-3xl font-bold uppercase tracking-wide text-slate-900">PharmaFlow</h1>
                            <p className="text-sm font-medium text-slate-500">Pro Edition</p>
                        </div>
                    </div>
                    <div className="text-right text-sm">
                        <h2 className="font-bold text-lg mb-1">Tax Invoice</h2>
                        <p className="text-slate-600">Original for Recipient</p>
                        <p className="mt-2 text-xs text-slate-400">GSTIN: 27AAACN1234F1Z1</p>
                    </div>
                </div>

                {/* Company & Customer Details */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">Billed By</h3>
                        <p className="font-bold text-lg">Antigravity Medical Systems</p>
                        <p className="text-sm text-slate-600">123 Pharma Plaza, Industrial Area</p>
                        <p className="text-sm text-slate-600">Pune, Maharashtra - 411001</p>
                        <p className="text-sm text-slate-600">Email: info@pharmaflow.pro</p>
                    </div>
                    <div>
                        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">Billed To</h3>
                        <p className="font-bold text-lg">{customer.name}</p>
                        <p className="text-sm text-slate-600 max-w-[250px]">{customer.address || 'Address not provided'}</p>
                        {customer.gstin && <p className="text-sm font-medium mt-1">GSTIN: {customer.gstin}</p>}
                        {customer.phone && <p className="text-sm text-slate-600">Phone: {customer.phone}</p>}
                    </div>
                </div>

                {/* Invoice Meta */}
                <div className="flex justify-between mb-8 bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div>
                        <span className="text-xs text-slate-500 uppercase font-bold">Invoice No.</span>
                        <p className="font-mono font-bold text-lg">{invoiceNumber}</p>
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-slate-500 uppercase font-bold">Invoice Date</span>
                        <p className="font-bold">{format(date, 'dd MMM yyyy')}</p>
                    </div>
                </div>

                {/* Items Table */}
                <table className="w-full mb-8 text-sm">
                    <thead>
                        <tr className="border-b-2 border-slate-800">
                            <th className="text-left py-2 font-bold w-[40%]">Product Description</th>
                            <th className="text-left py-2 font-bold">Batch</th>
                            <th className="text-right py-2 font-bold">Qty</th>
                            <th className="text-right py-2 font-bold">Price</th>
                            <th className="text-right py-2 font-bold">GST</th>
                            <th className="text-right py-2 font-bold">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={item.id} className="border-b border-slate-100">
                                <td className="py-3">
                                    <p className="font-bold text-slate-900">{item.name}</p>
                                    <p className="text-[10px] text-slate-500">HSN: 3004</p>
                                </td>
                                <td className="py-3 text-slate-600">{item.batchNumber}</td>
                                <td className="py-3 text-right font-medium">
                                    {item.quantity}
                                    {item.freeQuantity ? <span className="text-xs text-slate-500"> + {item.freeQuantity}</span> : null}
                                </td>
                                <td className="py-3 text-right text-slate-600">{item.unitPrice.toFixed(2)}</td>
                                <td className="py-3 text-right text-xs text-slate-500">{item.gstRate}%</td>
                                <td className="py-3 text-right font-bold text-slate-900">
                                    {(item.total + item.gstAmount).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end mb-12">
                    <div className="w-[300px] space-y-3">
                        <div className="flex justify-between text-sm text-slate-600">
                            <span>Subtotal</span>
                            <span>₹{totals.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-600">
                            <span>Taxable Amount</span>
                            <span>₹{totals.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-600">
                            <span>Total GST</span>
                            <span>₹{totals.gst.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t border-slate-800 pt-3 text-slate-900">
                            <span>Grand Total</span>
                            <span>₹{totals.net.toFixed(2)}</span>
                        </div>
                        <div className="text-right text-[10px] text-slate-500 uppercase font-medium">
                            (Amount in Words)
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t-2 border-slate-100 pt-8 mt-auto">
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <h4 className="font-bold text-xs uppercase mb-2 text-slate-500">Terms & Conditions</h4>
                            <ul className="text-[10px] text-slate-600 list-disc pl-3 space-y-1">
                                <li>Goods once sold will not be taken back.</li>
                                <li>Interest @ 18% p.a. will be charged if payment is not made within the due date.</li>
                                <li>Subject to Pune Jurisdiction only.</li>
                            </ul>
                        </div>
                        <div className="text-right">
                            <h4 className="font-bold text-xs uppercase mb-12 text-slate-500">For PharmaFlow Pro</h4>
                            <div className="h-px bg-slate-300 w-[150px] ml-auto mb-1"></div>
                            <p className="text-[10px] text-slate-500">Authorized Signatory</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
);

InvoicePrint.displayName = 'InvoicePrint';
