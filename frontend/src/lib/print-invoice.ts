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
    * { box-sizing: border-box; }
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
    function fixAndScale() {
      // Fix flex children: set min-width:0 so they don't push page wider than viewport
      var all = document.querySelectorAll('*');
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        if (window.getComputedStyle(el).display === 'flex') {
          for (var j = 0; j < el.children.length; j++) {
            el.children[j].style.minWidth = '0';
          }
        }
      }
      // After flex fix, measure content width and apply zoom if still overflowing on mobile
      requestAnimationFrame(function() {
        var contentW = document.documentElement.scrollWidth;
        var screenW = window.innerWidth;
        if (screenW < 900 && contentW > screenW) {
          document.body.style.zoom = (screenW / contentW).toFixed(4);
          document.documentElement.style.overflowX = 'hidden';
        }
        ${autoPrint ? "setTimeout(function(){ window.print(); }, 200);" : ""}
      });
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fixAndScale);
    } else {
      fixAndScale();
    }
  <\/script>
</body>
</html>`);
    win.document.close();
}

/**
 * Prints the invoice directly on the current page — no new tab opens.
 * Works correctly on both desktop and mobile.
 * InvoicePrint uses all inline styles so print output is clean.
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
    window.print();
    document.head.removeChild(styleEl);
    document.body.removeChild(printEl);
    document.title = originalTitle;
}
