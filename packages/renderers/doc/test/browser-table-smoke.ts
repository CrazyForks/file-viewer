import { createViewer } from '../../../core/src/index.ts';
import wordRenderer from '../../word/src/index.js';

const output = document.querySelector('[data-testid="result"]') as HTMLElement;
const host = document.querySelector('[data-testid="viewer"]') as HTMLDivElement;

try {
  const response = await fetch('./fixtures/github-34-wps-table.doc');
  if (!response.ok) throw new Error(`Fixture request failed with HTTP ${response.status}.`);
  const viewer = createViewer(host, { options: { renderers: [wordRenderer] } });
  await viewer.load({
    buffer: await response.arrayBuffer(),
    filename: 'github-34-wps-table.doc',
    type: 'doc',
  });

  const tables = host.querySelectorAll('.msdoc-table');
  const rows = host.querySelectorAll('.msdoc-row');
  const cells = host.querySelectorAll('.msdoc-cell');
  const text = host.textContent || '';
  const syntheticGrayBorder = Array.from(cells).some(cell =>
    (cell.getAttribute('style') || '').includes('#666')
  );
  const firstCellStyle = cells[0] ? getComputedStyle(cells[0]) : null;
  const lastCellStyle = cells[cells.length - 1] ? getComputedStyle(cells[cells.length - 1]) : null;
  const outerBorderVisible = firstCellStyle?.borderTopStyle === 'solid' &&
    firstCellStyle.borderInlineStartStyle === 'solid' &&
    lastCellStyle?.borderBottomStyle === 'solid' &&
    lastCellStyle.borderInlineEndStyle === 'solid';
  const passed = tables.length === 1 && rows.length === 16 && cells.length === 80 &&
    text.includes('测试组分A') && !syntheticGrayBorder && outerBorderVisible;
  output.dataset.status = passed ? 'passed' : 'failed';
  output.textContent = JSON.stringify({
    passed,
    tables: tables.length,
    rows: rows.length,
    cells: cells.length,
    syntheticGrayBorder,
    outerBorderVisible,
  }, null, 2);
  const visualSnapshot = host.cloneNode(true);
  await viewer.destroy();
  host.replaceWith(visualSnapshot);
} catch (error) {
  output.dataset.status = 'failed';
  output.textContent = JSON.stringify({
    passed: false,
    error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
  }, null, 2);
}
