import type {
  FileViewerPdfBoundingBox,
  FileViewerViewStateChangeSource,
} from '@file-viewer/core';
import {
  normalizePdfBoundingBox,
  normalizePdfBoundingBoxInput,
  rotateNormalizedPdfBoundingBox,
  serializePdfBoundingBoxes,
} from './pdfBbox.js';

interface PdfBoundingBoxPage {
  view?: number[];
  getViewport: (options: { scale: number; rotation: number }) => {
    width: number;
    height: number;
  };
}

interface PdfBoundingBoxDocument {
  getPage: (pageNumber: number) => Promise<PdfBoundingBoxPage>;
}

export interface CreatePdfBoundingBoxControllerOptions {
  documentRef: Document;
  targetWindow: Window;
  viewerRoot: HTMLElement;
  scrollContainer: HTMLElement;
  initial?: FileViewerPdfBoundingBox | readonly FileViewerPdfBoundingBox[];
  getDocument: () => PdfBoundingBoxDocument | null;
  getPageCount: () => number;
  getCurrentPage: () => number;
  getRotation: () => number;
  goToPage: (page: number, source: FileViewerViewStateChangeSource) => void;
  suppressProgrammaticScrollEvents: () => void;
  waitForPaint: (view?: Window | null) => Promise<void>;
}

export interface PdfBoundingBoxRenderOptions {
  focus?: boolean;
  pageNumber?: number;
  source?: FileViewerViewStateChangeSource;
}

export interface PdfBoundingBoxController {
  hasBoxes(): boolean;
  getStateValue(): FileViewerPdfBoundingBox | FileViewerPdfBoundingBox[] | null;
  set(
    input: unknown,
    options?: Pick<PdfBoundingBoxRenderOptions, 'focus' | 'source'>
  ): Promise<boolean>;
  render(options?: PdfBoundingBoxRenderOptions): Promise<void>;
  destroy(): void;
}

export const createPdfBoundingBoxController = ({
  documentRef,
  targetWindow,
  viewerRoot,
  scrollContainer,
  initial,
  getDocument,
  getPageCount,
  getCurrentPage,
  getRotation,
  goToPage,
  suppressProgrammaticScrollEvents,
  waitForPaint,
}: CreatePdfBoundingBoxControllerOptions): PdfBoundingBoxController => {
  let renderVersion = 0;
  let destroyed = false;
  let active = normalizePdfBoundingBoxInput(initial);
  let fingerprint = serializePdfBoundingBoxes(active);

  const removeLayers = (pageNumber?: number) => {
    const selector = pageNumber
      ? `.page[data-page-number="${pageNumber}"] > .pdf-bbox-layer`
      : '.pdf-bbox-layer';
    viewerRoot.querySelectorAll(selector).forEach(layer => layer.remove());
  };

  const getPageBox = async (pageNumber: number) => {
    const document = getDocument();
    if (!document) {
      return null;
    }
    const page = await document.getPage(pageNumber);
    const view = page.view;
    if (Array.isArray(view) && view.length >= 4) {
      return {
        x: Number(view[0]) || 0,
        y: Number(view[1]) || 0,
        width: Math.abs(Number(view[2]) - Number(view[0])),
        height: Math.abs(Number(view[3]) - Number(view[1])),
      };
    }
    const viewport = page.getViewport({ scale: 1, rotation: 0 });
    return { x: 0, y: 0, width: viewport.width, height: viewport.height };
  };

  const focusNodes = (pageNode: HTMLElement, nodes: HTMLElement[]) => {
    if (!nodes.length) {
      return;
    }
    const pageRect = pageNode.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    const nodeRects = nodes.map(node => node.getBoundingClientRect());
    const left = Math.min(...nodeRects.map(rect => rect.left));
    const top = Math.min(...nodeRects.map(rect => rect.top));
    const right = Math.max(...nodeRects.map(rect => rect.right));
    const bottom = Math.max(...nodeRects.map(rect => rect.bottom));
    suppressProgrammaticScrollEvents();
    scrollContainer.scrollTop = Math.max(
      0,
      scrollContainer.scrollTop + (top + bottom) / 2 - (containerRect.top + containerRect.bottom) / 2
    );
    if (pageRect.width > containerRect.width) {
      scrollContainer.scrollLeft = Math.max(
        0,
        scrollContainer.scrollLeft + (left + right) / 2 - (containerRect.left + containerRect.right) / 2
      );
    }
  };

  const render = async ({
    focus = false,
    pageNumber,
    source = 'api',
  }: PdfBoundingBoxRenderOptions = {}) => {
    const currentVersion = pageNumber ? renderVersion : ++renderVersion;
    removeLayers(pageNumber);
    const document = getDocument();
    if (!active.length || !document || destroyed) {
      return;
    }

    const fallbackPage = getCurrentPage() || 1;
    const pageCount = getPageCount();
    const grouped = new Map<number, FileViewerPdfBoundingBox[]>();
    active.forEach(box => {
      const page = Math.min(
        pageCount || Number.MAX_SAFE_INTEGER,
        Math.max(1, Math.round(Number(box.page) || fallbackPage))
      );
      if (pageNumber && page !== pageNumber) {
        return;
      }
      const boxes = grouped.get(page) || [];
      boxes.push(box);
      grouped.set(page, boxes);
    });

    const focusPage = Math.min(...grouped.keys());
    if (focus && Number.isFinite(focusPage)) {
      goToPage(focusPage, source);
      await waitForPaint(targetWindow);
    }

    for (const [page, boxes] of grouped) {
      if (currentVersion !== renderVersion || destroyed) {
        return;
      }
      const pageNode = viewerRoot.querySelector<HTMLElement>(`.page[data-page-number="${page}"]`);
      const pageBox = await getPageBox(page);
      if (!pageNode || !pageBox || currentVersion !== renderVersion || destroyed) {
        continue;
      }
      pageNode.querySelector(':scope > .pdf-bbox-layer')?.remove();
      const layer = documentRef.createElement('div');
      layer.className = 'pdf-bbox-layer';
      layer.dataset.pdfBboxPage = String(page);
      const nodes: HTMLElement[] = [];
      boxes.forEach((box, index) => {
        const normalized = normalizePdfBoundingBox(box, pageBox, fallbackPage);
        if (!normalized) {
          return;
        }
        const rotated = rotateNormalizedPdfBoundingBox(normalized, getRotation());
        const node = documentRef.createElement('div');
        node.className = 'pdf-bbox-highlight';
        node.dataset.pdfBboxId = box.id || `${page}-${index}`;
        node.style.left = `${rotated.x * 100}%`;
        node.style.top = `${rotated.y * 100}%`;
        node.style.width = `${rotated.width * 100}%`;
        node.style.height = `${rotated.height * 100}%`;
        if (box.color) {
          node.style.setProperty('--pdf-bbox-color', box.color);
        }
        if (box.label) {
          node.setAttribute('role', 'note');
          node.setAttribute('aria-label', box.label);
        } else {
          node.setAttribute('aria-hidden', 'true');
        }
        layer.append(node);
        nodes.push(node);
      });
      if (!nodes.length) {
        continue;
      }
      pageNode.append(layer);
      if (focus && page === focusPage) {
        await waitForPaint(targetWindow);
        focusNodes(pageNode, nodes);
        // PDF.js can settle dimensions one frame after fit or rotation.
        await waitForPaint(targetWindow);
        focusNodes(pageNode, nodes);
      }
    }
  };

  return {
    hasBoxes: () => active.length > 0,
    getStateValue: () => {
      if (!active.length) {
        return null;
      }
      return active.length === 1
        ? { ...active[0] }
        : active.map(box => ({ ...box }));
    },
    async set(input, options = {}) {
      const next = normalizePdfBoundingBoxInput(input);
      const nextFingerprint = serializePdfBoundingBoxes(next);
      if (nextFingerprint === fingerprint) {
        return false;
      }
      active = next;
      fingerprint = nextFingerprint;
      await render({
        focus: options.focus ?? true,
        source: options.source,
      });
      return true;
    },
    render,
    destroy() {
      destroyed = true;
      renderVersion += 1;
      removeLayers();
      active = [];
    },
  };
};
