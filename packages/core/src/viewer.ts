import {
  buildFileViewerDocumentTextChunks,
} from './document';
import {
  collectFileViewerDocumentAnchors,
  getCurrentFileViewerDocumentAnchor,
  scrollToFileViewerDocumentAnchor,
} from './documentDom';
import { createFileViewerDomSearchController, cloneFileViewerSearchState } from './documentSearch';
import { createFileViewerZoomController } from './documentZoom';
import {
  buildFileViewerRenderedHtmlDocument,
  triggerFileViewerBlobDownload,
  triggerFileViewerUrlDownload,
  waitForFileViewerPrintWindowReady,
} from './export';
import { getRendererAvailability, createUnsupportedAvailability } from './capabilities';
import {
  buildFileViewerLifecycleContext,
  buildFileViewerOperationContext,
  runFileViewerBeforeOperation,
  runFileViewerLifecycleHook,
} from './operations';
import { createRendererRegistry } from './registry';
import { normalizeSource } from './source';
import { buildFileViewerWatermarkInlineStyle } from './watermark';
import type {
  FileRenderExportAdapter,
  FileViewerAiOptions,
  FileViewerDocumentAnchor,
  FileViewerDownloadOptions,
  FileViewerExportHtmlOptions,
  FileViewerInstance,
  FileViewerLifecycleContext,
  FileViewerOperationType,
  FileViewerOptions,
  FileViewerPrintOptions,
  FileViewerSource,
  NormalizedFileViewerSource,
  RendererRegistry,
  RendererSession,
} from './types';

export interface CreateViewerOptions {
  registry?: RendererRegistry;
  options?: FileViewerOptions;
  signal?: AbortSignal;
}

const emitLifecycle = async (
  options: FileViewerOptions,
  phase: FileViewerLifecycleContext['phase'],
  source: NormalizedFileViewerSource,
  version: number,
  startedAt: number,
  reason?: FileViewerLifecycleContext['reason']
) => {
  const now = Date.now();
  const context = buildFileViewerLifecycleContext({
    phase,
    filename: source.filename,
    source: source.kind,
    url: source.url,
    file: typeof File !== 'undefined' && source.file instanceof File ? source.file : undefined,
    size: source.size,
    version,
    timestamp: now,
    duration: phase.endsWith('complete') ? now - startedAt : undefined,
    reason,
  });

  await runFileViewerLifecycleHook(context, options.hooks, error => {
    throw error;
  });
};

export const createViewer = (
  container: HTMLElement,
  createOptions: CreateViewerOptions = {}
): FileViewerInstance => {
  const registry = createOptions.registry || createRendererRegistry();
  let options = createOptions.options || {};
  let currentSource: NormalizedFileViewerSource | null = null;
  let currentSession: RendererSession | null = null;
  let activeExportAdapter: FileRenderExportAdapter | null = null;
  let version = 0;
  let anchors: FileViewerDocumentAnchor[] = [];

  const buildCurrentLifecycleContext = () => {
    const source = currentSource || normalizeSource({});
    return buildFileViewerLifecycleContext({
      phase: 'load-complete',
      filename: source.filename,
      source: source.kind,
      url: source.url,
      file: typeof File !== 'undefined' && source.file instanceof File ? source.file : undefined,
      size: source.size,
      version,
      timestamp: Date.now(),
    });
  };

  const runBeforeViewerOperation = async (operation: FileViewerOperationType) => {
    const context = buildFileViewerOperationContext(operation, buildCurrentLifecycleContext());
    return runFileViewerBeforeOperation({
      context,
      options,
      onError(error) {
        throw error;
      },
    });
  };

  const getDisplayFilename = () => currentSource?.filename || 'preview';

  const getWatermarkInlineStyle = (override?: string) => {
    if (typeof override === 'string') {
      return override;
    }
    return buildFileViewerWatermarkInlineStyle(options.watermark);
  };

  const buildRenderedHtmlDocument = async (
    mode: 'export' | 'print',
    exportOptions: FileViewerExportHtmlOptions | FileViewerPrintOptions = {}
  ) => {
    const title = exportOptions.title || getDisplayFilename() || 'file-viewer-preview';
    return buildFileViewerRenderedHtmlDocument({
      source: container,
      mode,
      title,
      adapter: activeExportAdapter,
      watermarkInlineStyle: getWatermarkInlineStyle(exportOptions.watermarkInlineStyle),
    });
  };

  const getCapabilitiesForExtension = (extension?: string) => {
    const targetExtension = extension || currentSource?.extension || '';
    const renderer = registry.getByExtension(targetExtension);
    if (!renderer) {
      return createUnsupportedAvailability(targetExtension);
    }
    return getRendererAvailability(renderer, currentSession);
  };

  const zoomController = createFileViewerZoomController({
    root: () => container,
    beforeZoom: runBeforeViewerOperation,
  });
  const searchController = createFileViewerDomSearchController({
    root: () => container,
    options: () => options.search,
  });
  zoomController.observe();
  searchController.observe();

  const destroyCurrent = async (reason: FileViewerLifecycleContext['reason'] = 'replace') => {
    if (!currentSource) {
      return;
    }
    const source = currentSource;
    const startedAt = Date.now();
    await emitLifecycle(options, 'unload-start', source, version, startedAt, reason);
    await currentSession?.destroy?.();
    currentSession = null;
    currentSource = null;
    activeExportAdapter = null;
    anchors = [];
    await searchController.clear();
    zoomController.clearProvider();
    await emitLifecycle(options, 'unload-complete', source, version, startedAt, reason);
  };

  return {
    container,
    async load(source: FileViewerSource) {
      await destroyCurrent('replace');

      const normalized = normalizeSource(source);
      currentSource = normalized;
      version += 1;

      const renderer = registry.getByExtension(normalized.extension);
      const startedAt = Date.now();
      await emitLifecycle(options, 'load-start', normalized, version, startedAt);

      if (!renderer?.load) {
        currentSession = null;
        await emitLifecycle(options, 'load-complete', normalized, version, startedAt);
        return null;
      }

      currentSession = await renderer.load({
        source: normalized,
        surface: { container },
        options,
        signal: createOptions.signal,
        registerExportAdapter: adapter => {
          activeExportAdapter = adapter;
        },
      });
      zoomController.refreshProvider();
      anchors = collectFileViewerDocumentAnchors(container);
      await emitLifecycle(options, 'load-complete', normalized, version, startedAt);
      return currentSession;
    },
    async destroy(reason = 'component-unmount') {
      await destroyCurrent(reason);
      searchController.destroy();
      zoomController.destroy();
    },
    updateOptions(nextOptions: Partial<FileViewerOptions>) {
      options = {
        ...options,
        ...nextOptions,
      };
    },
    getCapabilities(extension?: string) {
      return getCapabilitiesForExtension(extension);
    },
    getRenderer(extension?: string) {
      return registry.getByExtension(extension || currentSource?.extension || '');
    },
    getSource() {
      return currentSource;
    },
    registerExportAdapter(adapter: FileRenderExportAdapter | null) {
      activeExportAdapter = adapter;
    },
    getExportAdapter() {
      return activeExportAdapter;
    },
    async download(downloadOptions: FileViewerDownloadOptions = {}) {
      if (!currentSource) {
        throw new Error('当前没有可下载的源文件');
      }
      if (!await runBeforeViewerOperation('download')) {
        return;
      }
      const filename = downloadOptions.filename || getDisplayFilename() || 'preview.bin';
      if (currentSource.buffer) {
        triggerFileViewerBlobDownload(
          new Blob([currentSource.buffer], { type: 'application/octet-stream' }),
          filename
        );
        return;
      }
      if (currentSource.file) {
        const blob = currentSource.file;
        triggerFileViewerBlobDownload(blob, filename);
        return;
      }
      if (currentSource.url) {
        triggerFileViewerUrlDownload(currentSource.url, filename);
        return;
      }
      throw new Error('当前没有可下载的源文件');
    },
    async exportHtml(exportOptions: FileViewerExportHtmlOptions = {}) {
      if (!await runBeforeViewerOperation('export-html')) {
        return '';
      }
      const html = await buildRenderedHtmlDocument('export', exportOptions);
      if (exportOptions.download !== false) {
        const baseName = exportOptions.filename || getDisplayFilename() || 'preview';
        triggerFileViewerBlobDownload(
          new Blob([html], { type: 'text/html;charset=utf-8' }),
          `${baseName}.rendered.html`
        );
      }
      return html;
    },
    async print(printOptions: FileViewerPrintOptions = {}) {
      if (!getCapabilitiesForExtension().print) {
        throw new Error('当前文件类型不支持完整打印，请下载原文件后在本地应用中打印');
      }
      if (!await runBeforeViewerOperation('print')) {
        return;
      }
      const html = await buildRenderedHtmlDocument('print', printOptions);
      const printWindow = printOptions.printWindow ||
        printOptions.openWindow?.() ||
        (typeof window !== 'undefined' ? window.open('', '_blank') : null);
      if (!printWindow) {
        throw new Error('浏览器拦截了打印窗口');
      }
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      await waitForFileViewerPrintWindowReady(printWindow);
      if (printOptions.autoPrint !== false) {
        printWindow.print();
      }
    },
    zoomIn() {
      return zoomController.zoomIn();
    },
    zoomOut() {
      return zoomController.zoomOut();
    },
    resetZoom() {
      return zoomController.resetZoom();
    },
    getZoomState() {
      return zoomController.getState();
    },
    search(query: string) {
      return searchController.search(query);
    },
    nextSearchResult() {
      return searchController.next();
    },
    previousSearchResult() {
      return searchController.previous();
    },
    clearSearch() {
      return searchController.clear();
    },
    getSearchState() {
      return cloneFileViewerSearchState(searchController.state);
    },
    async collectDocumentAnchors() {
      anchors = collectFileViewerDocumentAnchors(container);
      return anchors;
    },
    getCurrentDocumentAnchor() {
      return getCurrentFileViewerDocumentAnchor(container, anchors);
    },
    scrollToDocumentAnchor(anchor: FileViewerDocumentAnchor | string | number | null | undefined) {
      return scrollToFileViewerDocumentAnchor(container, anchor);
    },
    async scrollToLine(line: number) {
      if (!anchors.length) {
        anchors = collectFileViewerDocumentAnchors(container);
      }
      return scrollToFileViewerDocumentAnchor(container, line);
    },
    getDocumentTextChunks(textOptions?: boolean | FileViewerAiOptions) {
      return buildFileViewerDocumentTextChunks(anchors, textOptions ?? options.ai);
    },
  };
};
