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
    const win = window.open("", "_blank");
    if (!win) {
        alert("Popup blocked. Please allow popups for this site to view invoices.");
        return;
    }

    const title = customerName
        ? `${customerName} (${invoiceNumber})`
        : `Invoice - ${invoiceNumber}`;

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; min-width: 0; }
    body { margin: 0; padding: 8px; font-family: Arial, sans-serif; font-size: 11px; background: #fff; color: #000; }
    @page { size: A4; margin: 6mm; }
    @media print { body { padding: 0; zoom: 1 !important; transform: none !important; } }
    table { border-collapse: collapse; }
    ol, ul { padding-left: 16px; margin: 0; }
  </style>
</head>
<body>
  ${element.innerHTML}
  <script>
    window.addEventListener('load', function() {
      var contentW = document.documentElement.scrollWidth;
      var screenW = window.innerWidth;
      if (screenW < 900 && contentW > screenW) {
        document.body.style.zoom = (screenW / contentW).toFixed(4);
        document.documentElement.style.overflowX = 'hidden';
      }
      ${autoPrint ? "setTimeout(function(){ window.print(); }, 300);" : ""}
    });
  <\/script>
</body>
</html>`);
    win.document.close();
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
        '  #__pfp_root__ { display: block !important; width: 100% !important; }',
        '}'
    ].join('\n');

    const printEl = document.createElement('div');
    printEl.id = '__pfp_root__';
    printEl.innerHTML = element.innerHTML;

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
