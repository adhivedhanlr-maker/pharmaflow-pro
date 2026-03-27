/**
 * Opens the invoice in a new browser window and triggers print.
 * Works reliably on both desktop and mobile (mobile can save as PDF from the print dialog).
 * The PDF filename is set to: "CustomerName (InvoiceNumber)" via the window <title>.
 */
export function printInvoiceNewWindow(
    element: HTMLElement,
    invoiceNumber: string,
    customerName?: string,
    autoPrint: boolean = true
) {
    const win = window.open("", "_blank");
    if (!win) {
        alert("Popup blocked. Please allow popups for this site to print invoices.");
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
    @media print { body { padding: 0; } }
    table { border-collapse: collapse; }
    ol, ul { padding-left: 16px; margin: 0; }
  </style>
</head>
<body>
  ${element.innerHTML}
  ${autoPrint ? `<script>
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 400);
    });
  </script>` : ""}
</body>
</html>`);
    win.document.close();
}
