/**
 * Render a report into the isolated print root and invoke the browser print
 * dialog. The application UI is hidden by the print stylesheet.
 *
 * @param {string} innerHtml markup for the `.print-document` container
 */
export function printHtml(innerHtml) {
  const root = document.getElementById('print-root');
  if (!root) {
    return;
  }

  root.innerHTML = `<div class="print-document">${innerHtml}</div>`;

  const cleanup = () => {
    root.innerHTML = '';
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  window.print();
  window.setTimeout(cleanup, 1000);
}