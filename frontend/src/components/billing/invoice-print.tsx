import React from "react";
import { format } from "date-fns";

function numberToWords(n: number): string {
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    if (n === 0) return "Zero";
    if (n < 0) return "Minus " + numberToWords(-n);

    const rupees = Math.floor(n);
    const paise = Math.round((n - rupees) * 100);

    function convert(num: number): string {
        if (num === 0) return "";
        if (num < 20) return ones[num] + " ";
        if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "") + " ";
        if (num < 1000) return ones[Math.floor(num / 100)] + " Hundred " + convert(num % 100);
        if (num < 100000) return convert(Math.floor(num / 1000)) + "Thousand " + convert(num % 1000);
        if (num < 10000000) return convert(Math.floor(num / 100000)) + "Lakh " + convert(num % 100000);
        return convert(Math.floor(num / 10000000)) + "Crore " + convert(num % 10000000);
    }

    let result = convert(rupees).trim() + " Rupees";
    if (paise > 0) result += " and " + convert(paise).trim() + " Paise";
    result += " Only";
    return result;
}

interface InvoicePrintProps {
    invoiceNumber: string;
    date: Date;
    preview?: boolean;
    paymentMethod?: string;
    businessProfile?: {
        companyName: string;
        address: string;
        email?: string;
        phone?: string;
        logoUrl?: string;
        gstin?: string;
        panNo?: string;
        dlNo?: string;
        fssaiNo?: string;
        bankName?: string;
        bankBranch?: string;
        bankAccountNo?: string;
        bankIfsc?: string;
    };
    customer: {
        name: string;
        address?: string;
        gstin?: string;
        phone?: string;
        email?: string;
        state?: string;
        dlNo?: string;
        fssaiNo?: string;
    };
    items: Array<{
        id: string;
        name: string;
        company?: string;
        packing?: string;
        hsnCode?: string;
        batchNumber: string;
        expiryDate?: string;
        quantity: number;
        freeQuantity?: number;
        mrp?: number;
        unitPrice: number;
        discountPct?: number;
        gstRate: number;
        gstAmount: number;
        total: number;
    }>;
    totals: {
        subtotal: number;
        gst: number;
        discount?: number;
        net: number;
    };
    customerType?: "PHARMACY" | "DISTRIBUTOR";
}

export const InvoicePrint = React.forwardRef<HTMLDivElement, InvoicePrintProps>(
    ({ invoiceNumber, date, customer, items, totals, businessProfile, paymentMethod = "CASH", preview = false, customerType = "PHARMACY" }, ref) => {
        const companyName = businessProfile?.companyName || "PharmaFlow";
        const companyAddress = businessProfile?.address || "";
        const logoUrl = businessProfile?.logoUrl
            ? (businessProfile.logoUrl.startsWith("http") || businessProfile.logoUrl.startsWith("data:")
                ? businessProfile.logoUrl
                : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}${businessProfile.logoUrl}`)
            : null;

        // Group items by GST rate for tax summary (use billed qty only, not free)
        const gstGroups: Record<number, { taxable: number; sgst: number; cgst: number }> = {};
        items.forEach(item => {
            const taxable = item.quantity * item.unitPrice;
            const rate = item.gstRate;
            if (!gstGroups[rate]) gstGroups[rate] = { taxable: 0, sgst: 0, cgst: 0 };
            gstGroups[rate].taxable += taxable;
            gstGroups[rate].sgst += (taxable * rate) / 200;
            gstGroups[rate].cgst += (taxable * rate) / 200;
        });

        const taxableAmount = totals.subtotal - (totals.discount || 0);
        const totalSgst = totals.gst / 2;
        const totalCgst = totals.gst / 2;

        const tdStyle: React.CSSProperties = {
            border: "1px solid #ccc",
            padding: "3px 5px",
            fontSize: "10px",
            verticalAlign: "middle",
        };
        const thStyle: React.CSSProperties = {
            border: "1px solid #999",
            padding: "4px 5px",
            fontSize: "10px",
            fontWeight: "bold",
            backgroundColor: "#f0f0f0",
            textAlign: "center" as const,
        };

        return (
            <div
                ref={ref}
                className={preview
                    ? "p-4 bg-white text-black font-sans rounded-xl border border-slate-200 shadow-sm"
                    : "hidden print:block p-4 bg-white text-black font-sans max-w-[210mm] mx-auto"}
                style={{ fontFamily: "Arial, sans-serif", fontSize: "11px" }}
            >
                {/* OUTER BORDER */}
                <div style={{ border: "2px solid #000", marginBottom: "4px" }}>

                    {/* ── HEADER: Logo + Company ── */}
                    <div style={{ textAlign: "center", borderBottom: "1.5px solid #888", padding: "10px 12px 8px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px" }}>
                            {logoUrl && (
                                <img src={logoUrl} alt="logo"
                                    style={{ height: "64px", width: "64px", objectFit: "contain" }}
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            )}
                            <div>
                                <div style={{ fontSize: "22px", fontWeight: "900", letterSpacing: "1.5px", textTransform: "uppercase" }}>
                                    {companyName}
                                </div>
                                {companyAddress && (
                                    <div style={{ fontSize: "10px", color: "#333", marginTop: "2px" }}>{companyAddress}</div>
                                )}
                                {businessProfile?.phone && (
                                    <div style={{ fontSize: "10px", color: "#333" }}>Ph: {businessProfile.phone}</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── SELLER COMPLIANCE LINE ── */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", padding: "5px 12px", borderBottom: "1px solid #ccc", fontSize: "10px", backgroundColor: "#fafafa" }}>
                        {businessProfile?.gstin && <span><b>GSTIN:</b> {businessProfile.gstin}</span>}
                        {businessProfile?.panNo && <span><b>PAN:</b> {businessProfile.panNo}</span>}
                        {businessProfile?.fssaiNo && <span><b>FSSAI:</b> {businessProfile.fssaiNo}</span>}
                        {businessProfile?.dlNo && <span><b>DL No:</b> {businessProfile.dlNo}</span>}
                        {businessProfile?.email && <span><b>Email:</b> {businessProfile.email}</span>}
                    </div>

                    {/* ── BILL TO + INVOICE INFO ── */}
                    <div style={{ display: "flex", borderBottom: "1px solid #ccc" }}>
                        {/* Bill To */}
                        <div style={{ flex: 1, padding: "8px 12px", borderRight: "1px solid #ccc" }}>
                            <div style={{ fontSize: "9px", fontWeight: "bold", color: "#666", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "4px" }}>
                                Bill To
                            </div>
                            <div style={{ fontWeight: "bold", fontSize: "13px", marginBottom: "2px" }}>{customer.name}</div>
                            {customer.address && <div style={{ fontSize: "10px", color: "#444", marginBottom: "1px" }}>{customer.address}</div>}
                            {customer.phone && <div style={{ fontSize: "10px" }}>Ph: {customer.phone}</div>}
                            {customer.gstin && <div style={{ fontSize: "10px" }}><b>GSTIN:</b> {customer.gstin}</div>}
                            {customer.dlNo && <div style={{ fontSize: "10px" }}><b>DL No:</b> {customer.dlNo}</div>}
                            {customer.fssaiNo && <div style={{ fontSize: "10px" }}><b>FSSAI:</b> {customer.fssaiNo}</div>}
                            {customer.email && <div style={{ fontSize: "10px" }}><b>Email:</b> {customer.email}</div>}
                            {customer.state && <div style={{ fontSize: "10px" }}><b>State:</b> {customer.state}</div>}
                        </div>
                        {/* Invoice Meta */}
                        <div style={{ width: "230px", padding: "8px 12px" }}>
                            <div style={{ textAlign: "center", fontSize: "14px", fontWeight: "bold", marginBottom: "8px", letterSpacing: "1px" }}>
                                TAX INVOICE
                            </div>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
                                <tbody>
                                    <tr>
                                        <td style={{ fontWeight: "bold", paddingBottom: "3px", paddingRight: "8px", whiteSpace: "nowrap" }}>Invoice No:</td>
                                        <td style={{ fontFamily: "monospace", paddingBottom: "3px" }}>{invoiceNumber}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: "bold", paddingBottom: "3px" }}>Date:</td>
                                        <td style={{ paddingBottom: "3px" }}>{format(date, "dd-MM-yyyy hh:mm aa")}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: "bold", paddingBottom: "3px" }}>Payment:</td>
                                        <td style={{ paddingBottom: "3px" }}>{paymentMethod === "CASH" ? "CASH" : "CREDIT"}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: "bold" }}>Customer:</td>
                                        <td>{customerType === "DISTRIBUTOR" ? "Distributor" : "Pharmacy"}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ── ITEMS TABLE ── */}
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr>
                                    <th style={{ ...thStyle, width: "28px" }}>SNo</th>
                                    <th style={{ ...thStyle, textAlign: "left" as const }}>Particulars</th>
                                    <th style={thStyle}>Packing</th>
                                    <th style={thStyle}>HSN</th>
                                    <th style={thStyle}>Batch</th>
                                    <th style={thStyle}>Exp</th>
                                    <th style={thStyle}>Qty</th>
                                    <th style={thStyle}>Free</th>
                                    <th style={thStyle}>MRP</th>
                                    <th style={thStyle}>{customerType === "DISTRIBUTOR" ? "PTS" : "PTR"}</th>
                                    <th style={thStyle}>Disc%</th>
                                    <th style={thStyle}>GST%</th>
                                    <th style={{ ...thStyle, textAlign: "right" as const }}>Taxable</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => {
                                    const taxable = item.quantity * item.unitPrice;
                                    const expFormatted = item.expiryDate
                                        ? format(new Date(item.expiryDate), "MM/yy")
                                        : "-";
                                    return (
                                        <tr key={item.id} style={{ borderBottom: "1px solid #eee" }}>
                                            <td style={{ ...tdStyle, textAlign: "center" as const }}>{idx + 1}</td>
                                            <td style={{ ...tdStyle, textAlign: "left" as const }}>
                                                <div style={{ fontWeight: "bold" }}>{item.name}</div>
                                                {item.company && <div style={{ fontSize: "9px", color: "#555" }}>{item.company}</div>}
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: "center" as const }}>{item.packing || "-"}</td>
                                            <td style={{ ...tdStyle, textAlign: "center" as const }}>{item.hsnCode || "-"}</td>
                                            <td style={{ ...tdStyle, fontFamily: "monospace", textAlign: "center" as const }}>{item.batchNumber}</td>
                                            <td style={{ ...tdStyle, textAlign: "center" as const }}>{expFormatted}</td>
                                            <td style={{ ...tdStyle, textAlign: "center" as const, fontWeight: "bold" }}>{item.quantity}</td>
                                            <td style={{ ...tdStyle, textAlign: "center" as const }}>{item.freeQuantity || 0}</td>
                                            <td style={{ ...tdStyle, textAlign: "right" as const }}>{(item.mrp || 0).toFixed(2)}</td>
                                            <td style={{ ...tdStyle, textAlign: "right" as const, fontWeight: "bold" }}>{item.unitPrice.toFixed(2)}</td>
                                            <td style={{ ...tdStyle, textAlign: "center" as const }}>{(item.discountPct || 0).toFixed(2)}</td>
                                            <td style={{ ...tdStyle, textAlign: "center" as const }}>{item.gstRate}</td>
                                            <td style={{ ...tdStyle, textAlign: "right" as const }}>{taxable.toFixed(2)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* ── FOOTER: GST SUMMARY + TOTALS ── */}
                    <div style={{ display: "flex", borderTop: "1px solid #ccc" }}>
                        {/* Tax breakdown */}
                        <div style={{ flex: 1, padding: "6px 10px", borderRight: "1px solid #ccc", fontSize: "10px" }}>
                            <div style={{ fontWeight: "bold", marginBottom: "4px", fontSize: "10px" }}>GST Summary</div>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr>
                                        <th style={thStyle}>Tax %</th>
                                        <th style={thStyle}>Taxable</th>
                                        <th style={thStyle}>SGST%</th>
                                        <th style={thStyle}>SGST Amt</th>
                                        <th style={thStyle}>CGST%</th>
                                        <th style={thStyle}>CGST Amt</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(gstGroups).map(([rate, vals]) => (
                                        <tr key={rate}>
                                            <td style={{ ...tdStyle, textAlign: "center" as const }}>@{rate}%</td>
                                            <td style={{ ...tdStyle, textAlign: "right" as const }}>{vals.taxable.toFixed(2)}</td>
                                            <td style={{ ...tdStyle, textAlign: "center" as const }}>{(Number(rate) / 2).toFixed(1)}%</td>
                                            <td style={{ ...tdStyle, textAlign: "right" as const }}>{vals.sgst.toFixed(2)}</td>
                                            <td style={{ ...tdStyle, textAlign: "center" as const }}>{(Number(rate) / 2).toFixed(1)}%</td>
                                            <td style={{ ...tdStyle, textAlign: "right" as const }}>{vals.cgst.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{ marginTop: "6px", fontSize: "10px" }}>
                                <b>Total Items:</b> {items.length} &nbsp;&nbsp;
                                <b>Total Qty:</b> {items.reduce((a, i) => a + i.quantity, 0)} &nbsp;&nbsp;
                                <b>Total Free:</b> {items.reduce((a, i) => a + (i.freeQuantity || 0), 0)}
                            </div>
                        </div>

                        {/* Totals */}
                        <div style={{ width: "230px", padding: "6px 12px", fontSize: "10px" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <tbody>
                                    <tr>
                                        <td style={{ paddingBottom: "3px" }}>Sub Total :</td>
                                        <td style={{ textAlign: "right" as const, paddingBottom: "3px" }}>&#8377;{totals.subtotal.toFixed(2)}</td>
                                    </tr>
                                    {(totals.discount || 0) > 0 && (
                                        <tr>
                                            <td style={{ paddingBottom: "3px" }}>Discount :</td>
                                            <td style={{ textAlign: "right" as const, paddingBottom: "3px" }}>- &#8377;{(totals.discount || 0).toFixed(2)}</td>
                                        </tr>
                                    )}
                                    <tr>
                                        <td style={{ paddingBottom: "3px" }}>Taxable Amount :</td>
                                        <td style={{ textAlign: "right" as const, paddingBottom: "3px" }}>&#8377;{taxableAmount.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ paddingBottom: "3px" }}>SGST :</td>
                                        <td style={{ textAlign: "right" as const, paddingBottom: "3px" }}>&#8377;{totalSgst.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ paddingBottom: "3px" }}>CGST :</td>
                                        <td style={{ textAlign: "right" as const, paddingBottom: "3px" }}>&#8377;{totalCgst.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ paddingBottom: "3px" }}>Tax Amount :</td>
                                        <td style={{ textAlign: "right" as const, paddingBottom: "3px" }}>&#8377;{totals.gst.toFixed(2)}</td>
                                    </tr>
                                    <tr style={{ borderTop: "2px solid #000", fontWeight: "bold" }}>
                                        <td style={{ paddingTop: "5px", fontSize: "12px" }}>Net Payable :</td>
                                        <td style={{ textAlign: "right" as const, fontSize: "12px", paddingTop: "5px" }}>&#8377;{totals.net.toFixed(2)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ── AMOUNT IN WORDS ── */}
                    <div style={{ padding: "5px 12px", borderTop: "1px solid #ccc", fontSize: "10px" }}>
                        <b>Amount In Words :</b> {numberToWords(totals.net)}
                    </div>

                    {/* ── BANK DETAILS + SIGNATURE ── */}
                    <div style={{ display: "flex", borderTop: "1px solid #ccc" }}>
                        {(businessProfile?.bankName || businessProfile?.bankAccountNo) && (
                            <div style={{ flex: 1, padding: "6px 12px", borderRight: "1px solid #ccc", fontSize: "10px" }}>
                                <div style={{ fontWeight: "bold", marginBottom: "3px" }}>Bank Details</div>
                                {businessProfile.bankName && <div>{businessProfile.bankName}</div>}
                                {businessProfile.bankBranch && <div>Branch : {businessProfile.bankBranch}</div>}
                                {businessProfile.bankAccountNo && <div>Acc No.: {businessProfile.bankAccountNo}</div>}
                                {businessProfile.bankIfsc && <div>IFSC : {businessProfile.bankIfsc}</div>}
                            </div>
                        )}
                        <div style={{ flex: 1, padding: "6px 12px", textAlign: "right" as const, fontSize: "10px" }}>
                            <div style={{ marginBottom: "28px" }}>For</div>
                            <div style={{ fontWeight: "bold", fontSize: "11px" }}>{companyName}</div>
                            <div style={{ marginTop: "24px", borderTop: "1px solid #555", paddingTop: "3px" }}>Authorised Signatory</div>
                            <div style={{ marginTop: "4px", fontSize: "9px", color: "#888" }}>E.&amp;O.E.</div>
                        </div>
                    </div>
                </div>

                {/* Powered by */}
                <div style={{ textAlign: "center", fontSize: "8px", color: "#aaa", marginTop: "2px" }}>
                    Powered by PharmaFlow Pro
                </div>
            </div>
        );
    }
);

InvoicePrint.displayName = "InvoicePrint";
