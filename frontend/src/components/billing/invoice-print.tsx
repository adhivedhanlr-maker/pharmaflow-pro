import React from "react";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";

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
        showLogo?: boolean;
        gstin?: string;
        panNo?: string;
        dlNo?: string;
        fssaiNo?: string;
        bankName?: string;
        bankBranch?: string;
        bankAccountNo?: string;
        bankIfsc?: string;
        paymentQrUrl?: string;
        paymentUpiString?: string;
        showPaymentQr?: boolean;
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
        ptr?: number;
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

const cellBase: React.CSSProperties = {
    border: "1px solid #444",
    padding: "3px 4px",
    fontSize: "7.5pt",
    verticalAlign: "top",
    lineHeight: 1.25,
};

const headBase: React.CSSProperties = {
    ...cellBase,
    fontWeight: 700,
    textAlign: "center",
    backgroundColor: "#f3f3f3",
    fontSize: "7pt",
};

const labelStyle: React.CSSProperties = {
    fontWeight: 700,
    whiteSpace: "nowrap",
    paddingRight: "6px",
    fontSize: "8pt",
};

export const InvoicePrint = React.forwardRef<HTMLDivElement, InvoicePrintProps>(
    ({ invoiceNumber, date, customer, items, totals, businessProfile, paymentMethod = "CASH", preview = false, customerType = "PHARMACY" }, ref) => {
        const companyName = businessProfile?.companyName || "PharmaFlow";
        const companyAddress = businessProfile?.address || "";
        const logoUrl = businessProfile?.logoUrl
            ? (businessProfile.logoUrl.startsWith("http") || businessProfile.logoUrl.startsWith("data:")
                ? businessProfile.logoUrl
                : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}${businessProfile.logoUrl}`)
            : null;

        const gstGroups: Record<number, { taxable: number; sgst: number; cgst: number }> = {};
        items.forEach((item) => {
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
        const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
        const totalFree = items.reduce((sum, item) => sum + (item.freeQuantity || 0), 0);

        return (
            <div
                ref={ref}
                className={`invoice-print-root ${preview ? "invoice-print-preview" : "invoice-print-print"}`}
                data-preview={preview ? "true" : "false"}
                style={{
                    width: "210mm",
                    maxWidth: "210mm",
                    fontFamily: "Arial, Helvetica, sans-serif",
                    fontSize: "8pt",
                    color: "#111",
                }}
            >
                <div style={{ border: "2px solid #222", backgroundColor: "#fff" }}>
                    <div className="invoice-header" style={{ borderBottom: "1px solid #444", padding: "8px 10px 6px", textAlign: "center" }}>
                        <div className="invoice-header-inner" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                            {logoUrl && businessProfile?.showLogo !== false && (
                                <img
                                    src={logoUrl}
                                    alt="logo"
                                    style={{ width: "48px", height: "48px", objectFit: "contain" }}
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                />
                            )}
                            <div>
                                <div style={{ fontSize: "14pt", fontWeight: 800, textTransform: "uppercase", lineHeight: 1.1, letterSpacing: "0.5px" }}>
                                    {companyName}
                                </div>
                                {companyAddress && (
                                    <div style={{ fontSize: "8pt", marginTop: "2px", color: "#444" }}>
                                        {companyAddress}
                                    </div>
                                )}
                                <div style={{ fontSize: "8pt", color: "#444" }}>
                                    {businessProfile?.phone ? `Ph: ${businessProfile.phone}` : ""}
                                    {businessProfile?.phone && businessProfile?.email ? "   " : ""}
                                    {businessProfile?.email ? `Email: ${businessProfile.email}` : ""}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="invoice-compliance" style={{ borderBottom: "1px solid #444", padding: "3px 8px", fontSize: "8pt", display: "flex", gap: "14px", flexWrap: "wrap" }}>
                        {businessProfile?.gstin && <span><b>GSTIN:</b> {businessProfile.gstin}</span>}
                        {businessProfile?.panNo && <span><b>PAN:</b> {businessProfile.panNo}</span>}
                        {businessProfile?.dlNo && <span><b>DL No:</b> {businessProfile.dlNo}</span>}
                        {businessProfile?.fssaiNo && <span><b>FSSAI:</b> {businessProfile.fssaiNo}</span>}
                    </div>

                    <div className="invoice-meta-grid" style={{ display: "grid", gridTemplateColumns: "1fr 250px", borderBottom: "1px solid #444" }}>
                        <div className="invoice-billto" style={{ padding: "6px 8px", borderRight: "1px solid #444" }}>
                            <div style={{ fontWeight: 700, fontSize: "7.5pt", marginBottom: "4px", letterSpacing: "0.5px" }}>BILL TO</div>
                            <div style={{ fontWeight: 800, fontSize: "11pt", lineHeight: 1.15 }}>{customer.name}</div>
                            {customer.address && <div style={{ marginTop: "4px", whiteSpace: "pre-line" }}>{customer.address}</div>}
                            {customer.phone && <div><b>Ph:</b> {customer.phone}</div>}
                            {customer.gstin && <div><b>GSTIN:</b> {customer.gstin}</div>}
                            {customer.dlNo && <div><b>DL:</b> {customer.dlNo}</div>}
                            {customer.fssaiNo && <div><b>FSSAI:</b> {customer.fssaiNo}</div>}
                        </div>

                        <div className="invoice-meta" style={{ padding: "6px 8px" }}>
                            <div style={{ textAlign: "center", fontWeight: 800, fontSize: "15pt", letterSpacing: "1px", marginBottom: "4px" }}>
                                TAX INVOICE
                            </div>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8pt" }}>
                                <tbody>
                                    <tr>
                                        <td style={labelStyle}>Invoice No:</td>
                                        <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{invoiceNumber}</td>
                                    </tr>
                                    <tr>
                                        <td style={labelStyle}>Date:</td>
                                        <td>{format(date, "dd-MM-yyyy hh:mm aa")}</td>
                                    </tr>
                                    <tr>
                                        <td style={labelStyle}>Payment:</td>
                                        <td>{paymentMethod}</td>
                                    </tr>
                                    <tr>
                                        <td style={labelStyle}>Customer:</td>
                                        <td>{customerType === "DISTRIBUTOR" ? "Distributor" : "Pharmacy"}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <table className="invoice-items-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                <th style={{ ...headBase, width: "30px" }}>SNo</th>
                                <th style={{ ...headBase, textAlign: "left" as const }}>Particulars</th>
                                <th style={{ ...headBase, width: "52px" }}>Packing</th>
                                <th style={{ ...headBase, width: "68px" }}>HSN</th>
                                <th style={{ ...headBase, width: "72px" }}>Batch</th>
                                <th style={{ ...headBase, width: "52px" }}>Exp</th>
                                <th style={{ ...headBase, width: "34px" }}>Qty</th>
                                <th style={{ ...headBase, width: "34px" }}>Free</th>
                                <th style={{ ...headBase, width: "52px" }}>MRP</th>
                                <th style={{ ...headBase, width: "60px" }}>{customerType === "DISTRIBUTOR" ? "PTS" : "PTR"}</th>
                                <th style={{ ...headBase, width: "42px" }}>GST%</th>
                                <th style={{ ...headBase, width: "72px" }}>Taxable</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => {
                                const taxable = item.quantity * item.unitPrice;
                                const expFormatted = item.expiryDate ? format(new Date(item.expiryDate), "MM/yy") : "-";
                                return (
                                    <tr key={item.id}>
                                        <td className="item-col-sno" style={{ ...cellBase, textAlign: "center" }}>{idx + 1}</td>
                                        <td className="item-col-name" style={cellBase}>
                                            <div style={{ fontWeight: 700 }}>{item.name}</div>
                                            {item.company && <div style={{ color: "#555", marginTop: "1px" }}>{item.company}</div>}
                                            <div className="item-mobile-meta" style={{ display: "none", marginTop: "3px", color: "#444" }}>
                                                {item.batchNumber ? <span>Batch: {item.batchNumber}</span> : null}
                                                {expFormatted !== "-" ? <span>Exp: {expFormatted}</span> : null}
                                                {item.packing ? <span>Pack: {item.packing}</span> : null}
                                            </div>
                                        </td>
                                        <td className="item-col-packing" style={{ ...cellBase, textAlign: "center" }}>{item.packing || ""}</td>
                                        <td className="item-col-hsn" style={{ ...cellBase, textAlign: "center" }}>{item.hsnCode || ""}</td>
                                        <td className="item-col-batch" style={{ ...cellBase, textAlign: "center", fontFamily: "monospace" }}>{item.batchNumber}</td>
                                        <td className="item-col-exp" style={{ ...cellBase, textAlign: "center" }}>{expFormatted}</td>
                                        <td className="item-col-qty" style={{ ...cellBase, textAlign: "center", fontWeight: 700 }}>{item.quantity}</td>
                                        <td className="item-col-free" style={{ ...cellBase, textAlign: "center" }}>{item.freeQuantity || 0}</td>
                                        <td className="item-col-mrp" style={{ ...cellBase, textAlign: "right" }}>{(item.mrp || 0).toFixed(2)}</td>
                                        <td className="item-col-rate" style={{ ...cellBase, textAlign: "right", fontWeight: 700 }}>{item.unitPrice.toFixed(2)}</td>
                                        <td className="item-col-gst" style={{ ...cellBase, textAlign: "center" }}>{item.gstRate}</td>
                                        <td className="item-col-taxable" style={{ ...cellBase, textAlign: "right" }}>{taxable.toFixed(2)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    <div className="invoice-summary-grid" style={{ display: "grid", gridTemplateColumns: "1fr 190px", borderTop: "1px solid #444" }}>
                        <div className="invoice-gst-summary" style={{ borderRight: "1px solid #444" }}>
                            <div style={{ padding: "5px 6px", fontWeight: 700, borderBottom: "1px solid #444" }}>GST Summary</div>
                            <table className="invoice-gst-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr>
                                        <th style={headBase}>Tax %</th>
                                        <th style={headBase}>Taxable</th>
                                        <th style={headBase}>SGST%</th>
                                        <th style={headBase}>SGST Amt</th>
                                        <th style={headBase}>CGST%</th>
                                        <th style={headBase}>CGST Amt</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(gstGroups).map(([rate, vals]) => (
                                        <tr key={rate}>
                                            <td style={{ ...cellBase, textAlign: "center" }}>@{rate}%</td>
                                            <td style={{ ...cellBase, textAlign: "right" }}>{vals.taxable.toFixed(2)}</td>
                                            <td style={{ ...cellBase, textAlign: "center" }}>{(Number(rate) / 2).toFixed(1)}%</td>
                                            <td style={{ ...cellBase, textAlign: "right" }}>{vals.sgst.toFixed(2)}</td>
                                            <td style={{ ...cellBase, textAlign: "center" }}>{(Number(rate) / 2).toFixed(1)}%</td>
                                            <td style={{ ...cellBase, textAlign: "right" }}>{vals.cgst.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{ padding: "4px 6px", fontSize: "8pt" }}>
                                <b>Total Items:</b> {items.length} &nbsp; <b>Total Qty:</b> {totalQty} &nbsp; <b>Total Free:</b> {totalFree}
                            </div>
                        </div>

                        <div className="invoice-totals-panel" style={{ padding: "4px 6px" }}>
                            <table className="invoice-totals-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "8pt" }}>
                                <tbody>
                                    <tr>
                                        <td>Sub Total :</td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace" }}>{totals.subtotal.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td>Taxable Amount :</td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace" }}>{taxableAmount.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td>SGST :</td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace" }}>{totalSgst.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td>CGST :</td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace" }}>{totalCgst.toFixed(2)}</td>
                                    </tr>
                                    {(totals.discount || 0) > 0 && (
                                        <tr>
                                            <td>Discount :</td>
                                            <td style={{ textAlign: "right", fontFamily: "monospace" }}>- {totals.discount?.toFixed(2)}</td>
                                        </tr>
                                    )}
                                    <tr>
                                        <td>Tax Amount :</td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace" }}>{totals.gst.toFixed(2)}</td>
                                    </tr>
                                    <tr style={{ borderTop: "2px solid #222" }}>
                                        <td style={{ fontWeight: 800, fontSize: "10pt", paddingTop: "4px" }}>Net Payable :</td>
                                        <td style={{ textAlign: "right", fontWeight: 800, fontSize: "10pt", paddingTop: "4px", fontFamily: "monospace" }}>
                                            {totals.net.toFixed(2)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style={{ padding: "4px 8px", borderTop: "1px solid #444", fontSize: "8pt" }}>
                        <b>Amount In Words :</b> {numberToWords(totals.net)}
                    </div>

                    {(() => {
                        const hasBankDetails = !!(businessProfile?.bankName || businessProfile?.bankBranch || businessProfile?.bankAccountNo || businessProfile?.bankIfsc);
                        const hasQr = !!(businessProfile?.paymentUpiString && businessProfile?.showPaymentQr !== false);
                        const hasLeftPanel = hasBankDetails || hasQr;
                        return (
                    <div className="invoice-footer-grid" style={{ display: "grid", gridTemplateColumns: hasLeftPanel ? "1fr 1fr" : "1fr", borderTop: "1px solid #444" }}>
                        {hasLeftPanel && (
                        <div className="invoice-bank-panel" style={{ padding: "6px 8px", borderRight: "1px solid #444", minHeight: "100px" }}>
                            {hasBankDetails && (
                                <div style={{ fontWeight: 700, marginBottom: "4px" }}>Bank Details</div>
                            )}
                            {businessProfile?.bankName && <div><b>BANK:</b> {businessProfile.bankName}</div>}
                            {businessProfile?.bankBranch && <div><b>Branch:</b> {businessProfile.bankBranch}</div>}
                            {businessProfile?.bankAccountNo && <div><b>A/c No.:</b> {businessProfile.bankAccountNo}</div>}
                            {businessProfile?.bankIfsc && <div><b>IFSC:</b> {businessProfile.bankIfsc}</div>}
                        </div>
                        )}

                        <div className="invoice-sign-panel" style={{ padding: "6px 8px", minHeight: "100px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                            {businessProfile?.paymentUpiString && businessProfile?.showPaymentQr !== false && (
                                <div style={{ textAlign: "center", flexShrink: 0 }}>
                                    <div style={{ fontSize: "7pt", marginBottom: 4, color: "#555" }}>Scan to Pay</div>
                                    <QRCodeSVG
                                        value={businessProfile.paymentUpiString}
                                        size={90}
                                        level="H"
                                        imageSettings={
                                            logoUrl && businessProfile?.showLogo !== false
                                                ? { src: logoUrl, width: 18, height: 18, excavate: true }
                                                : undefined
                                        }
                                    />
                                </div>
                            )}
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-end", minHeight: "100px", justifyContent: "space-between" }}>
                                <div style={{ textAlign: "right" }}>
                                    <div>For</div>
                                    <div style={{ fontWeight: 700 }}>{companyName}</div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <div style={{ borderTop: "1px solid #444", paddingTop: "3px" }}>Authorised Signatory</div>
                                    <div style={{ fontSize: "7pt", color: "#666" }}>E.&amp;O.E.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                        );
                    })()}
                </div>

                <div style={{ border: "2px solid #222", borderTop: "none", padding: "5px 8px", fontSize: "7pt", lineHeight: 1.4 }}>
                    <div>
                        <b>Declaration :</b> I/We hereby declare that this invoice shows the actual price of the goods described and that all particulars are true and correct to the best of our knowledge and belief. Subject to local jurisdiction.
                    </div>
                    <div style={{ marginTop: "5px", fontWeight: 700 }}>Terms &amp; Conditions :</div>
                    <ol style={{ margin: "3px 0 0", paddingLeft: "16px" }}>
                        <li>Goods once sold will not be taken back or exchanged unless there is a quality issue or wrong supply.</li>
                        <li>Claims, if any, must be made within 24 hours of receipt of goods. No claims will be entertained thereafter.</li>
                        <li>Interest at 18% per annum will be charged on overdue payments.</li>
                        <li>This invoice is computer-generated and valid without a signature unless otherwise stated.</li>
                    </ol>
                </div>
            </div>
        );
    }
);

InvoicePrint.displayName = "InvoicePrint";
