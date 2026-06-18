import {
  buildFileViewerDocumentTextChunks,
} from './document';
import {
  collectFileViewerDocumentAnchors,
  scrollToFileViewerDocumentAnchor,
} from './documentDom';
import { createFileViewerDomSearchController } from './documentSearch';
import {
  createFileViewerSearchChangeState,
  resolveFileViewerLocationChangeAnchor,
} from './documentEvents';
import { createFileViewerZoomController } from './documentZoom';
import {
  DEFAULT_FILE_VIEWER_DOWNLOAD_FILENAME,
  DEFAULT_FILE_VIEWER_EXPORT_FILENAME,
  DEFAULT_FILE_VIEWER_PREVIEW_TITLE,
  createFileViewerOriginalSourceStateFromNormalizedSource,
  executeFileViewerDownloadOperation,
  executeFileViewerExportHtmlOperation,
  executeFileViewerPrintOperation,
  resolveFileViewerDisplayFilename,
  resolveFileViewerOperationFilename,
} from './viewerOperations';
import { getRendererAvailability, createUnsupportedAvailability } from './capabilities';
import {
  buildFileViewerLifecycleContextFromNormalizedSource,
  buildFileViewerOperationContext,
  runFileViewerBeforeOperation,
  runFileViewerLifecycleHook,
} from './operations';
import { createRendererRegistry } from './registry';
import {
  applyFileViewerRenderSurfaceState,
  createFileViewerRenderSurfaceState,
} from './rendererHandler';
import { createFileViewerRequestScope } from './sourceLoading';
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
  const context = buildFileViewerLifecycleContextFromNormalizedSource({
    phase,
    source,
    version,
    timestamp: now,
    startedAt,
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
  const renderSurfaceState = createFileViewerRenderSurfaceState<RendererSession>();
  const requestScope = createFileViewerRequestScope();
  let anchors: FileViewerDocumentAnchor[] = [];

  const buildCurrentLifecycleContext = () => {
    const source = currentSource || normalizeSource({});
    return buildFileViewerLifecycleContextFromNormalizedSource({
      phase: 'load-complete',
      source,
      version: requestScope.getCurrentVersion(),
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

  const getWatermarkInlineStyle = (override?: string) => {
    if (typeof override === 'string') {
      return override;
    }
    return buildFileViewerWatermarkInlineStyle(options.watermark);
  };

  const getCapabilitiesForExtension = (extension?: string) => {
    const targetExtension = extension || currentSource?.extension || '';
    const renderer = registry.getByExtension(targetExtension);
    if (!renderer) {
      return createUnsupportedAvailability(targetExtension);
    }
    return getRendererAvailability(renderer, renderSurfaceState.session);
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
    const version = requestScope.getCurrentVersion();
    await emitLifecycle(options, 'unload-start', source, version, startedAt, reason);
    await renderSurfaceState.session?.destroy?.();
    currentSource = null;
    applyFileViewerRenderSurfaceState(renderSurfaceState, {
      session: null,
      exportAdapter: null,
    });
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
      const version = requestScope.requestController.createVersion();

      const renderer = registry.getByExtension(normalized.extension);
      const startedAt = Date.now();
      await emitLifecycle(options, 'load-start', normalized, version, startedAt);

      if (!renderer?.load) {
        applyFileViewerRenderSurfaceState(renderSurfaceState, { session: null });
        await emitLifecycle(options, 'load-complete', normalized, version, startedAt);
        return null;
      }

      const session = await renderer.load({
        source: normalized,
        surface: { container },
        options,
        signal: createOptions.signal,
        registerExportAdapter: adapter => {
          applyFileViewerRenderSurfaceState(renderSurfaceState, { exportAdapter: adapter });
        },
      });
      applyFileViewerRenderSurfaceState(renderSurfaceState, { session });
      zoomController.refreshProvider();
      anchors = collectFileViewerDocumentAnchors(container);
      await emitLifecycle(options, 'load-complete', normalized, version, startedAt);
      return session;
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
      applyFileViewerRenderSurfaceState(renderSurfaceState, { exportAdapter: adapter });
    },
    getExportAdapter() {
      return renderSurfaceState.exportAdapter;
    },
    async download(downloadOptions: FileViewerDownloadOptions = {}) {
      const source = createFileViewerOriginalSourceStateFromNormalizedSource(currentSource);
      await executeFileViewerDownloadOperation({
        source,
        filename: downloadOptions.filename || resolveFileViewerOperationFilename({
          source,
          fallback: DEFAULT_FILE_VIEWER_DOWNLOAD_FILENAME,
        }),
        beforeOperation: runBeforeViewerOperation,
      });
    },
    async exportHtml(exportOptions: FileViewerExportHtmlOptions = {}) {
      return executeFileViewerExportHtmlOperation({
        source: container,
        adapter: renderSurfaceState.exportAdapter,
        download: exportOptions.download,
        filename: exportOptions.filename || resolveFileViewerOperationFilename({
          filename: resolveFileViewerDisplayFilename(currentSource),
          fallback: DEFAULT_FILE_VIEWER_EXPORT_FILENAME,
        }),
        title: exportOptions.title || resolveFileViewerOperationFilename({
          filename: resolveFileViewerDisplayFilename(currentSource),
          fallback: DEFAULT_FILE_VIEWER_PREVIEW_TITLE,
        }),
        watermarkInlineStyle: getWatermarkInlineStyle(exportOptions.watermarkInlineStyle),
        beforeOperation: runBeforeViewerOperation,
      });
    },
    async print(printOptions: FileViewerPrintOptions = {}) {
      await executeFileViewerPrintOperation({
        source: container,
        adapter: renderSurfaceState.exportAdapter,
        autoPrint: printOptions.autoPrint,
        openWindow: printOptions.openWindow,
        printWindow: printOptions.printWindow,
        title: printOptions.title || resolveFileViewerOperationFilename({
          filename: resolveFileViewerDisplayFilename(currentSource),
          fallback: DEFAULT_FILE_VIEWER_PREVIEW_TITLE,
        }),
        watermarkInlineStyle: getWatermarkInlineStyle(printOptions.watermarkInlineStyle),
        printAvailable: getCapabilitiesForExtension().print,
        beforeOperation: runBeforeViewerOperation,
      });
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
      return createFileViewerSearchChangeState(searchController.state);
    },
    async collectDocumentAnchors() {
      anchors = collectFileViewerDocumentAnchors(container);
      return anchors;
    },
    getCurrentDocumentAnchor() {
      return resolveFileViewerLocationChangeAnchor({ root: container, anchors });
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
