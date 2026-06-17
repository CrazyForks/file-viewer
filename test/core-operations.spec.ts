import { describe, expect, it, vi } from 'vitest';
import { parseHTML } from 'linkedom';
import {
  buildFileViewerLifecycleContext,
  buildFileViewerOperationContext,
  createFileViewerPostMessagePayload,
  createFileViewerRawPostMessagePayload,
  executeFileViewerDownloadOperation,
  executeFileViewerExportHtmlOperation,
  executeFileViewerPrintOperation,
  isFileViewerFrameEvent,
  normalizeFileViewerToolbar,
  postFileViewerMessageToParent,
  resolveFileViewerOperationAvailability,
  resolveFileViewerToolbarPosition,
  resolveVisibleFileViewerToolbar,
  runFileViewerBeforeOperation,
  runFileViewerLifecycleHook,
  type FileViewerOperationType,
} from '../packages/core/src';

describe('@file-viewer/core operation helpers', () => {
  it('builds lifecycle and operation contexts without framework state', () => {
    const context = buildFileViewerLifecycleContext({
      phase: 'load-complete',
      source: 'url',
      url: '/docs/%E6%8A%A5%E5%91%8A.pdf?token=1',
      version: 7,
      startedAt: 1000,
      timestamp: 1240,
      bufferSize: 4096,
    });

    expect(context).toMatchObject({
      phase: 'load-complete',
      type: 'pdf',
      filename: '报告.pdf',
      source: 'url',
      url: '/docs/%E6%8A%A5%E5%91%8A.pdf?token=1',
      size: 4096,
      version: 7,
      timestamp: 1240,
      duration: 240,
    });

    expect(buildFileViewerOperationContext('print', context, 1300)).toMatchObject({
      operation: 'print',
      label: '打印完整渲染内容',
      filename: '报告.pdf',
      timestamp: 1300,
    });
  });

  it('serializes postMessage contexts without leaking File objects', () => {
    const file = new File(['demo'], 'demo.docx');
    const context = buildFileViewerLifecycleContext({
      phase: 'load-start',
      source: 'file',
      file,
      version: 1,
      timestamp: 10,
    });

    expect(createFileViewerPostMessagePayload('flyfish-viewer:lifecycle', 'load-start', context)).toEqual({
      type: 'flyfish-viewer:lifecycle',
      event: 'load-start',
      payload: {
        phase: 'load-start',
        type: 'docx',
        filename: 'demo.docx',
        source: 'file',
        url: undefined,
        size: 4,
        version: 1,
        timestamp: 10,
        duration: undefined,
        reason: undefined,
        hasFile: true,
      },
    });
  });

  it('posts raw viewer payloads to parent windows through the core bridge', () => {
    const parent = {
      postMessage: vi.fn(),
    };
    const child = {
      parent,
    } as unknown as Window;
    const payload = createFileViewerRawPostMessagePayload('flyfish-viewer:search', 'search-change', {
      query: 'pdf',
    });

    expect(postFileViewerMessageToParent(payload, 'https://host.example', child)).toBe(true);
    expect(parent.postMessage).toHaveBeenCalledWith(payload, 'https://host.example');

    const topWindow = {} as Window & { parent: Window };
    topWindow.parent = topWindow;
    expect(postFileViewerMessageToParent(payload, '*', topWindow)).toBe(false);
  });

  it('guards iframe postMessage events through the core protocol', () => {
    expect(isFileViewerFrameEvent(createFileViewerRawPostMessagePayload('flyfish-viewer:search', 'search-change', {
      query: 'pdf',
    }))).toBe(true);
    expect(isFileViewerFrameEvent(createFileViewerRawPostMessagePayload('flyfish-viewer:location', 'location-change', null))).toBe(true);
    expect(isFileViewerFrameEvent({
      type: 'flyfish-viewer:unknown',
      event: 'search-change',
      payload: {},
    })).toBe(false);
    expect(isFileViewerFrameEvent({
      type: 'flyfish-viewer:search',
      payload: {},
    })).toBe(false);
    expect(isFileViewerFrameEvent(null)).toBe(false);
  });

  it('runs lifecycle hooks and operation guards in deterministic order', async () => {
    const events: string[] = [];
    const context = buildFileViewerLifecycleContext({
      phase: 'load-start',
      source: 'file',
      filename: 'guard.pdf',
      version: 1,
      timestamp: 10,
    });
    const operationContext = buildFileViewerOperationContext('download', context, 12);

    await runFileViewerLifecycleHook(context, {
      onLoadStart: nextContext => events.push(`lifecycle:${nextContext.phase}`),
    });

    const allowed = await runFileViewerBeforeOperation({
      context: operationContext,
      options: {
        beforeOperation: nextContext => {
          events.push(`global:${nextContext.operation}`);
        },
        toolbar: {
          beforeOperation: nextContext => {
            events.push(`toolbar:${nextContext.operation}`);
          },
          beforeDownload: () => {
            events.push('download:false');
            return false;
          },
        },
      },
      onBefore: nextContext => events.push(`before:${nextContext.operation}`),
      onCancel: nextContext => events.push(`cancel:${nextContext.operation}`),
    });

    expect(allowed).toBe(false);
    expect(events).toEqual([
      'lifecycle:load-start',
      'before:download',
      'global:download',
      'toolbar:download',
      'download:false',
      'cancel:download',
    ]);
  });

  it('normalizes toolbar visibility and operation availability in core', () => {
    expect(normalizeFileViewerToolbar(undefined)).toEqual({
      download: true,
      print: true,
      exportHtml: true,
      zoom: true,
    });
    expect(normalizeFileViewerToolbar({ toolbar: false })).toEqual({
      download: false,
      print: false,
      exportHtml: false,
      zoom: false,
    });

    const availability = resolveFileViewerOperationAvailability({
      extension: 'pdf',
      hasOriginalSource: true,
      renderedReady: true,
      adapter: { toHtml: () => '<main>pdf</main>' },
      zoomState: {
        scale: 1,
        label: '100%',
        canZoomIn: true,
        canZoomOut: false,
        canReset: false,
      },
    });

    expect(availability).toMatchObject({
      download: true,
      print: true,
      exportHtml: true,
      zoom: true,
      zoomIn: true,
      zoomOut: false,
      zoomReset: false,
    });
    expect(resolveVisibleFileViewerToolbar({ download: true, print: false, exportHtml: true, zoom: true }, availability)).toEqual({
      download: true,
      print: false,
      exportHtml: true,
      zoom: true,
    });
    expect(resolveFileViewerToolbarPosition(undefined, 'pdf')).toBe('bottom-right');
    expect(resolveFileViewerToolbarPosition({ toolbar: { position: 'top' } }, 'pdf')).toBe('top');
  });

  it('reports operation guard errors and cancels the operation', async () => {
    const onError = vi.fn();
    const onCancel = vi.fn();
    const context = buildFileViewerOperationContext('print', buildFileViewerLifecycleContext({
      phase: 'load-complete',
      source: 'file',
      filename: 'broken.pdf',
      version: 1,
      timestamp: 10,
    }));

    await expect(runFileViewerBeforeOperation({
      context,
      options: {
        beforeOperation: () => {
          throw new Error('denied');
        },
      },
      onError,
      onCancel,
    })).resolves.toBe(false);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledWith(context);
  });

  it('executes download, export and print through framework-neutral core operations', async () => {
    const { document } = parseHTML('<main id="root"><article><h1>Preview</h1></article></main>');
    const root = document.getElementById('root') as HTMLElement;
    const originalDocument = globalThis.document;
    const originalWindow = globalThis.window;
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    const originalCreateElement = document.createElement.bind(document);
    const beforeOperations: string[] = [];
    let downloadedName = '';
    let printed = false;
    let printHtml = '';

    document.createElement = ((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName.toLowerCase() === 'a') {
        Object.defineProperty(element, 'click', {
          configurable: true,
          value: () => {
            downloadedName = (element as HTMLAnchorElement).download;
          },
        });
      }
      return element;
    }) as Document['createElement'];
    Object.defineProperty(globalThis, 'document', { configurable: true, value: document });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        requestAnimationFrame: (callback: () => void) => {
          callback();
          return 1;
        },
        setTimeout: (callback: () => void) => {
          callback();
          return 1;
        },
      },
    });
    URL.createObjectURL = () => 'blob:viewer-operation-test';
    URL.revokeObjectURL = () => undefined;

    const beforeOperation = (operation: FileViewerOperationType) => {
      beforeOperations.push(operation);
      return true;
    };

    const printWindow = {
      document: {
        readyState: 'complete',
        images: [],
        open: () => undefined,
        write: (nextHtml: string) => {
          printHtml = nextHtml;
        },
        close: () => undefined,
      },
      focus: () => undefined,
      print: () => {
        printed = true;
      },
      requestAnimationFrame: (callback: () => void) => {
        callback();
        return 1;
      },
      setTimeout: (callback: () => void) => {
        callback();
        return 1;
      },
    } as unknown as Window;

    try {
      const html = await executeFileViewerExportHtmlOperation({
        source: root,
        adapter: {
          includeDocumentStyles: false,
          toHtml: options => `<section data-mode="${options.mode}">${options.title}</section>`,
        },
        title: 'demo.viewer',
        filename: 'demo.viewer',
        download: false,
        beforeOperation,
      });
      expect(html).toContain('data-mode="export"');
      expect(html).toContain('demo.viewer');

      await executeFileViewerPrintOperation({
        source: root,
        title: 'demo.viewer',
        printWindow,
        beforeOperation,
      });
      expect(printed).toBe(true);
      expect(printHtml).toContain('<h1>Preview</h1>');

      await executeFileViewerDownloadOperation({
        source: {
          buffer: new Uint8Array([1, 2, 3]).buffer,
          filename: 'demo.bin',
        },
        beforeOperation,
      });
      expect(downloadedName).toBe('demo.bin');
      expect(beforeOperations).toEqual(['export-html', 'print', 'download']);

      await expect(executeFileViewerDownloadOperation({
        source: {},
        throwOnMissingSource: false,
      })).resolves.toBe(false);
    } finally {
      document.createElement = originalCreateElement as Document['createElement'];
      URL.createObjectURL = originalCreateObjectUrl;
      URL.revokeObjectURL = originalRevokeObjectUrl;
      Object.defineProperty(globalThis, 'document', { configurable: true, value: originalDocument });
      Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
    }
  });
});
