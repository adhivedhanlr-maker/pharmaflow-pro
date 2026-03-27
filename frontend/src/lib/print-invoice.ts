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
    html, body { margin: 0; padding: 0; background: #eef2f7; color: #000; font-family: Arial, sans-serif; }
    body { font-size: 11px; }
    @page { size: A4; margin: 6mm; }
    table { border-collapse: collapse; }
    ol, ul { padding-left: 16px; margin: 0; }

    #pfp-preview-shell {
      min-height: 100vh;
      padding: 12px;
      overflow: auto;
    }

    #pfp-preview-viewport {
      width: 100%;
      margin: 0 auto;
    }

    #pfp-preview-stage {
      width: 210mm;
      max-width: none;
      margin: 0 auto;
      transform-origin: top left;
    }

    #pfp-preview-stage > * {
      width: 210mm !important;
      max-width: none !important;
      margin: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
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
        width: auto !important;
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
      var shell = document.getElementById('pfp-preview-shell');
      var viewport = document.getElementById('pfp-preview-viewport');
      var stage = document.getElementById('pfp-preview-stage');
      if (shell && viewport && stage) {
        var screenW = Math.max(window.innerWidth || 0, 320);
        var availableW = Math.max(screenW - 24, 160);
        var contentW = stage.offsetWidth || 794;
        var scale = Math.min(1, availableW / contentW);
        stage.style.transform = 'scale(' + scale.toFixed(4) + ')';
        viewport.style.width = Math.round(contentW * scale) + 'px';
        viewport.style.height = Math.round(stage.scrollHeight * scale) + 'px';
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
