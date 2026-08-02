/**
 * Opens the invoice in a new browser window for viewing (eye button).
 * On mobile, scales the invoice to fit the screen width.
 */
export function printInvoiceNewWindow(
    element: HTMLElement,
    invoiceNumber: string,
    customerName?: string,
    autoPrint: boolean = true
) {
    const title = customerName
        ? `${customerName} (${invoiceNumber})`
        : `Invoice - ${invoiceNumber}`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; min-width: 0; }
    html, body { margin: 0; padding: 0; background: #eef2f7; color: #000; font-family: Arial, sans-serif; }
    body { font-size: 11px; }
    @page { size: A4; margin: 6mm; }
    table { border-collapse: collapse; }
    ol, ul { padding-left: 16px; margin: 0; }

    #pfp-preview-shell {
      min-height: 100vh;
      padding: 8px;
      overflow: auto;
    }

    #pfp-preview-viewport {
      width: 100%;
      margin: 0 auto;
    }

    #pfp-preview-stage {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
    }

    #pfp-preview-stage > * {
      width: 100% !important;
      max-width: 210mm !important;
      margin: 0 auto !important;
      border-radius: 0 !important;
      box-shadow: none !important;
    }

    @media screen and (max-width: 768px) {
      html, body {
        background: #e7ecf3;
      }

      #pfp-preview-shell {
        padding: 6px;
      }

      #pfp-preview-stage {
        max-width: 100%;
      }

      #pfp-preview-stage > * {
        width: calc(100vw - 12px) !important;
        max-width: calc(100vw - 12px) !important;
      }

      .invoice-header {
        padding: 8px 6px 6px !important;
      }

      .invoice-header-inner {
        flex-direction: column !important;
        gap: 6px !important;
      }

      .invoice-compliance {
        gap: 6px !important;
        padding: 4px 6px !important;
      }

      .invoice-meta-grid,
      .invoice-summary-grid,
      .invoice-footer-grid {
        grid-template-columns: 1fr !important;
      }

      .invoice-billto,
      .invoice-gst-summary,
      .invoice-bank-panel {
        border-right: none !important;
        border-bottom: 1px solid #444 !important;
      }

      .invoice-meta,
      .invoice-totals-panel,
      .invoice-sign-panel {
        padding: 6px !important;
      }

      .invoice-sign-panel {
        min-height: 90px !important;
      }

      .invoice-items-table,
      .invoice-gst-table,
      .invoice-totals-table {
        width: 100% !important;
        table-layout: fixed !important;
      }

      .invoice-items-table th,
      .invoice-items-table td,
      .invoice-gst-table th,
      .invoice-gst-table td,
      .invoice-totals-table td {
        line-height: 1.15 !important;
        padding: 3px 2px !important;
        white-space: normal !important;
        word-break: normal !important;
        overflow-wrap: break-word !important;
      }

      .invoice-items-table .item-col-name {
        width: 38% !important;
        text-align: left !important;
      }

      .invoice-items-table .item-col-name div {
        word-break: normal !important;
        overflow-wrap: break-word !important;
      }

      .invoice-items-table .item-mobile-meta {
        display: flex !important;
        gap: 6px !important;
        flex-wrap: wrap !important;
      }

      .invoice-items-table .item-col-packing,
      .invoice-items-table .item-col-hsn,
      .invoice-items-table .item-col-batch,
      .invoice-items-table .item-col-exp,
      .invoice-items-table .item-col-gst,
      .invoice-items-table th:nth-child(3),
      .invoice-items-table th:nth-child(4),
      .invoice-items-table th:nth-child(5),
      .invoice-items-table th:nth-child(6),
      .invoice-items-table th:nth-child(11) {
        display: none !important;
      }

      .invoice-items-table .item-col-sno { width: 8% !important; }
      .invoice-items-table .item-col-qty { width: 9% !important; }
      .invoice-items-table .item-col-free { width: 9% !important; }
      .invoice-items-table .item-col-mrp { width: 13% !important; }
      .invoice-items-table .item-col-rate { width: 13% !important; }
      .invoice-items-table .item-col-taxable { width: 16% !important; }

    }

    @media print {
      html, body {
        background: #fff !important;
        overflow: visible !important;
      }

      #pfp-preview-shell {
        min-height: auto !important;
        padding: 0 !important;
        overflow: visible !important;
        background: #fff !important;
      }

      #pfp-preview-viewport {
        width: auto !important;
        margin: 0 !important;
      }

      #pfp-preview-stage {
        width: auto !important;
        margin: 0 !important;
        transform: none !important;
      }

      #pfp-preview-stage > * {
        width: 210mm !important;
        max-width: 210mm !important;
        min-width: 210mm !important;
        margin: 0 auto !important;
      }
    }

    @media print and (max-width: 210mm) {
      #pfp-preview-stage > * {
        max-width: 100% !important;
      }
    }
  </style>
</head>
<body>
  <div id="pfp-preview-shell">
    <div id="pfp-preview-viewport">
      <div id="pfp-preview-stage">
        ${element.innerHTML}
      </div>
    </div>
  </div>
  <script>
    window.addEventListener('load', function() {
      ${autoPrint ? "setTimeout(function(){ window.print(); }, 300);" : ""}
    });
  <\/script>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const previewUrl = URL.createObjectURL(blob);
    const win = window.open(previewUrl, "_blank");
    if (!win) {
        URL.revokeObjectURL(previewUrl);
        alert("Popup blocked. Please allow popups for this site to view invoices.");
        return;
    }

    win.addEventListener("beforeunload", () => URL.revokeObjectURL(previewUrl), { once: true });
}

export async function generatePdfFromElement(element: HTMLElement, filename: string) {
    if (!element || typeof window === "undefined") {
        throw new Error("PDF export is available only in the browser.");
    }

    const { default: html2pdf } = await import("html2pdf.js");
    const options = {
        margin: 10,
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
    };

    await html2pdf().set(options).from(element).save();
}

/**
 * Prints the invoice on the current page — no new tab.
 * Uses afterprint event for cleanup so mobile async print works correctly.
 */
export function printOnPage(
    element: HTMLElement,
    invoiceNumber: string,
    customerName?: string
) {
    const isMobileViewport = typeof window !== "undefined" && window.innerWidth < 768;
    const isAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
    const isTouchDevice = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;

    // Android/mobile print preview is much more reliable from a dedicated window.
    if (isMobileViewport || isAndroid || isTouchDevice) {
        printInvoiceNewWindow(element, invoiceNumber, customerName, true);
        return;
    }

    const title = customerName
        ? `${customerName} (${invoiceNumber})`
        : `Invoice - ${invoiceNumber}`;
    const originalTitle = document.title;
    document.title = title;

    const styleEl = document.createElement('style');
    styleEl.textContent = [
        '@page { size: A4; margin: 6mm; }',
        '@media print {',
        '  body > *:not(#__pfp_root__) { display: none !important; }',
        '  html, body { background: #fff !important; overflow: visible !important; }',
        '  #__pfp_root__ { display: block !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }',
        '  #__pfp_root__ > * { width: auto !important; max-width: 100% !important; margin: 0 auto !important; border-radius: 0 !important; box-shadow: none !important; }',
        '}'
    ].join('\n');

    const printEl = document.createElement('div');
    printEl.id = '__pfp_root__';
    printEl.innerHTML = element.innerHTML;
    printEl.style.width = '210mm';
    printEl.style.maxWidth = '210mm';
    printEl.style.margin = '0 auto';
    printEl.style.background = '#fff';

    document.head.appendChild(styleEl);
    document.body.appendChild(printEl);

    const cleanup = () => {
        if (document.head.contains(styleEl)) document.head.removeChild(styleEl);
        if (document.body.contains(printEl)) document.body.removeChild(printEl);
        document.title = originalTitle;
    };

    // afterprint fires when print dialog closes — works on desktop and mobile
    window.addEventListener('afterprint', cleanup, { once: true });
    // Safety fallback: clean up after 60s if afterprint never fires
    setTimeout(() => {
        window.removeEventListener('afterprint', cleanup);
        cleanup();
    }, 60000);

    window.print();
}
