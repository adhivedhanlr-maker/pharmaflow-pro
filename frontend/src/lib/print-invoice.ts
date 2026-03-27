/**
 * Opens the invoice in a new browser window for viewing (eye button).
 * On mobile, scales the invoice to fit the screen width.
 * autoPrint=false: view only. autoPrint=true: also triggers the print dialog.
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
  <\/script>
</body>
</html>`);
    win.document.close();
}

/**
 * Prints the invoice using a hidden iframe — no new tab opens.
 * The iframe gets the same isolated HTML/CSS as printInvoiceNewWindow,
 * so the print output is identical (proper A4 layout, correct margins).
 */
export function printOnPage(
    element: HTMLElement,
    invoiceNumber: string,
    customerName?: string
) {
    const title = customerName
        ? `${customerName} (${invoiceNumber})`
        : `Invoice - ${invoiceNumber}`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:210mm;height:1px;border:none;visibility:hidden;';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
        document.body.removeChild(iframe);
        return;
    }

    doc.write(`<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 8px; font-family: Arial, sans-serif; font-size: 11px; background: #fff; color: #000; }
    @page { size: A4; margin: 6mm; }
    @media print { body { padding: 0; } }
    table { border-collapse: collapse; }
    ol, ul { padding-left: 16px; margin: 0; }
  </style>
</head>
<body>
  ${element.innerHTML}
</body>
</html>`);
    doc.close();

    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();

    setTimeout(() => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
    }, 2000);
}
