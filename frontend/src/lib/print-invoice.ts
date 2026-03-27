/**
 * Opens the invoice in a new browser window for viewing.
 * On mobile, scales the invoice to fit the screen width.
 * If autoPrint=true, also triggers the print dialog (for Print / Save PDF).
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
    * { box-sizing: border-box; }
    body { margin: 0; padding: 8px; font-family: Arial, sans-serif; font-size: 11px; background: #f5f5f5; color: #000; overflow-x: hidden; }
    #inv { background: #fff; transform-origin: top left; width: fit-content; }
    @page { size: A4; margin: 6mm; }
    @media print { body { padding: 0; background: #fff; } #inv { transform: none !important; width: auto !important; } }
    table { border-collapse: collapse; }
    ol, ul { padding-left: 16px; margin: 0; }
  </style>
</head>
<body>
  <div id="inv">${element.innerHTML}</div>
  <script>
    function scaleToFit() {
      var el = document.getElementById('inv');
      if (!el) return;
      var naturalWidth = el.offsetWidth;
      var naturalHeight = el.offsetHeight;
      var availWidth = window.innerWidth - 16;
      if (naturalWidth > availWidth) {
        var scale = availWidth / naturalWidth;
        el.style.transform = 'scale(' + scale + ')';
        document.body.style.height = (naturalHeight * scale + 16) + 'px';
      } else {
        el.style.transform = '';
        document.body.style.height = '';
      }
    }
    window.addEventListener('load', function() {
      scaleToFit();
      ${autoPrint ? "setTimeout(function() { window.print(); }, 400);" : ""}
    });
    window.addEventListener('resize', scaleToFit);
  </script>
</body>
</html>`);
    win.document.close();
}

/**
 * Prints the invoice directly on the current page (no new tab).
 * Uses @media print CSS to hide everything except the invoice.
 * Works on both desktop and mobile without opening a new window.
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
    styleEl.id = '__pfp_style__';
    styleEl.textContent = `
        @media print {
            html, body { visibility: hidden; }
            #__pfp_root__ { visibility: visible; position: absolute; top: 0; left: 0; width: 100%; background: white; }
            #__pfp_root__ * { visibility: visible; }
        }
    `;

    const printEl = document.createElement('div');
    printEl.id = '__pfp_root__';
    printEl.innerHTML = element.innerHTML;

    document.head.appendChild(styleEl);
    document.body.appendChild(printEl);
    window.print();
    document.head.removeChild(styleEl);
    document.body.removeChild(printEl);
    document.title = originalTitle;
}
