import { describe, expect, it, vi } from 'vitest';
import { parseHTML } from 'linkedom';
import {
  DEFAULT_FILE_VIEWER_DOWNLOAD_FILENAME,
  DEFAULT_FILE_VIEWER_EXPORT_FILENAME,
  DEFAULT_FILE_VIEWER_PREVIEW_TITLE,
  buildFileViewerLifecycleContext,
  buildFileViewerLifecycleContextFromNormalizedSource,
  buildFileViewerOperationContext,
  buildFileViewerOperationContextFromLifecycleState,
  cloneFileViewerOperationAvailability,
  createFileViewerLifecycleStateController,
  createFileViewerOriginalSourceState,
  createFileViewerOriginalSourceStateFromNormalizedSource,
  createFileViewerPostMessagePayload,
  createFileViewerRawPostMessagePayload,
  executeFileViewerDownloadOperation,
  executeFileViewerExportHtmlOperation,
  executeFileViewerPrintOperation,
  hasVisibleFileViewerToolbarActions,
  isFileViewerFrameEvent,
  isFileViewerZoomButtonDisabled,
  normalizeFileViewerToolbar,
  postFileViewerLifecycleEvent,
  postFileViewerLocationChange,
  postFileViewerOperationContextEvent,
  postFileViewerOperationAvailabilityChange,
  postFileViewerMessageToParent,
  postFileViewerSearchChange,
  postFileViewerZoomChange,
  resolveFileViewerLifecycleFallbackSource,
  resolveFileViewerOperationFilename,
  resolveFileViewerOriginalFilename,
  resolveFileViewerOperationAvailability,
  resolveFileViewerToolbarState,
  resolveFileViewerToolbarPosition,
  resolveFileViewerDisplayFilename,
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

    expect(buildFileViewerLifecycleContext({
      phase: 'load-complete',
      source: 'url',
      url: '/docs/zero.pdf',
      version: 7,
      startedAt: 0,
      timestamp: 240,
    }).duration).toBe(240);

    expect(buildFileViewerOperationContext('print', context, 1300)).toMatchObject({
      operation: 'print',
      label: '打印完整渲染内容',
      filename: '报告.pdf',
      timestamp: 1300,
    });

    expect(buildFileViewerLifecycleContextFromNormalizedSource({
      phase: 'load-complete',
      source: {
        kind: 'url',
        filename: '计划.pdf',
        extension: 'pdf',
        url: '/docs/%E8%AE%A1%E5%88%92.pdf',
        size: 2048,
      },
      version: 8,
      startedAt: 0,
      timestamp: 320,
    })).toMatchObject({
      phase: 'load-complete',
      type: 'pdf',
      filename: '计划.pdf',
      source: 'url',
      url: '/docs/%E8%AE%A1%E5%88%92.pdf',
      size: 2048,
      version: 8,
      timestamp: 320,
      duration: 320,
    });
  });

  it('tracks lifecycle state in the framework-neutral core controller', () => {
    const controller = createFileViewerLifecycleStateController();
    const context = buildFileViewerLifecycleContext({
      phase: 'load-complete',
      source: 'file',
      filename: 'demo.pdf',
      version: 3,
      timestamp: 120,
    });

    controller.markLoadStarted(3, 100);

    expect(controller.getLoadStartedAt(3)).toBe(100);
    expect(controller.getActiveDocumentContext()).toBeNull();

    controller.setActiveDocumentContext(context);
    expect(controller.getActiveDocumentContext()).toBe(context);
    expect(controller.buildActiveUnloadContext('unload-start', context, 'replace', 130)).toMatchObject({
      phase: 'unload-start',
      filename: 'demo.pdf',
      reason: 'replace',
      timestamp: 130,
    });
    expect(controller.buildActiveUnloadContext('unload-complete', context, 'replace', 140)).toMatchObject({
      phase: 'unload-complete',
      filename: 'demo.pdf',
      reason: 'replace',
      timestamp: 140,
    });

    controller.clearLoadStarted(3);
    controller.clearActiveDocumentContext();

    expect(controller.getLoadStartedAt(3)).toBeUndefined();
    expect(controller.getActiveDocumentContext()).toBeNull();
    expect(controller.buildActiveUnloadContext('unload-start', null)).toBeNull();
  });

  it('builds operation contexts from lifecycle state without wrapper fallback logic', () => {
    const controller = createFileViewerLifecycleStateController();
    const activeContext = buildFileViewerLifecycleContext({
      phase: 'load-complete',
      source: 'file',
      filename: 'active.pdf',
      version: 5,
      timestamp: 320,
    });

    controller.setActiveDocumentContext(activeContext);
    expect(buildFileViewerOperationContextFromLifecycleState({
      operation: 'download',
      lifecycleState: controller,
      version: 5,
      fallbackUrl: '/ignored.docx',
      timestamp: 360,
    })).toMatchObject({
      operation: 'download',
      source: 'file',
      filename: 'active.pdf',
      version: 5,
      timestamp: 360,
    });

    controller.clearActiveDocumentContext();
    controller.markLoadStarted(8, 100);

    expect(buildFileViewerOperationContextFromLifecycleState({
      operation: 'print',
      lifecycleState: controller,
      version: 8,
      filename: 'fallback.docx',
      bufferSize: 512,
      fallbackUrl: '/docs/fallback.docx',
      lifecycleTimestamp: 150,
      timestamp: 170,
    })).toMatchObject({
      operation: 'print',
      label: '打印完整渲染内容',
      type: 'docx',
      filename: 'fallback.docx',
      source: 'url',
      url: '/docs/fallback.docx',
      size: 512,
      version: 8,
      timestamp: 170,
      duration: 50,
    });
  });

  it('resolves lifecycle fallback sources without wrapper-specific branching', () => {
    expect(resolveFileViewerLifecycleFallbackSource({
      file: new File(['demo'], 'demo.txt'),
      url: '/ignored.txt',
    })).toEqual({ source: 'file' });
    expect(resolveFileViewerLifecycleFallbackSource({
      url: '/example/demo.pdf',
    })).toEqual({ source: 'url', sourceUrl: '/example/demo.pdf' });
    expect(resolveFileViewerLifecycleFallbackSource()).toEqual({ source: 'empty' });
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

  it('posts lifecycle and operation context events through named core helpers', () => {
    const parent = {
      postMessage: vi.fn(),
    };
    const child = {
      parent,
    } as unknown as Window;
    const lifecycleContext = buildFileViewerLifecycleContext({
      phase: 'load-complete',
      source: 'file',
      file: new File(['demo'], 'demo.pdf'),
      version: 2,
      timestamp: 200,
    });
    const operationContext = buildFileViewerOperationContext('download', lifecycleContext, 220);

    expect(postFileViewerLifecycleEvent(lifecycleContext, 'https://host.example', child)).toBe(true);
    expect(postFileViewerOperationContextEvent(
      'operation-before',
      operationContext,
      'https://host.example',
      child
    )).toBe(true);

    expect(parent.postMessage).toHaveBeenNthCalledWith(1, {
      type: 'flyfish-viewer:lifecycle',
      event: 'load-complete',
      payload: {
        phase: 'load-complete',
        type: 'pdf',
        filename: 'demo.pdf',
        source: 'file',
        url: undefined,
        size: 4,
        version: 2,
        timestamp: 200,
        duration: undefined,
        reason: undefined,
        hasFile: true,
      },
    }, 'https://host.example');
    expect(parent.postMessage).toHaveBeenNthCalledWith(2, {
      type: 'flyfish-viewer:operation',
      event: 'operation-before',
      payload: {
        type: 'pdf',
        filename: 'demo.pdf',
        source: 'file',
        url: undefined,
        size: 4,
        version: 2,
        timestamp: 220,
        duration: undefined,
        reason: undefined,
        operation: 'download',
        label: '下载原始文件',
        hasFile: true,
      },
    }, 'https://host.example');
  });

  it('posts operation, search and location changes through named core helpers', () => {
    const parent = {
      postMessage: vi.fn(),
    };
    const child = {
      parent,
    } as unknown as Window;

    expect(postFileViewerOperationAvailabilityChange({
      download: true,
      print: false,
      exportHtml: true,
      zoom: true,
      zoomIn: true,
      zoomOut: false,
      zoomReset: false,
    }, 'https://host.example', child)).toBe(true);
    expect(postFileViewerZoomChange({
      scale: 1,
      label: '100%',
      canZoomIn: true,
      canZoomOut: false,
      canReset: false,
    }, 'https://host.example', child)).toBe(true);
    expect(postFileViewerSearchChange({
      query: 'pdf',
      total: 1,
      currentIndex: 0,
      current: {
        id: 'match-1',
        index: 0,
        text: 'PDF',
        anchor: null,
        line: 3,
      },
      matches: [],
    }, 'https://host.example', child)).toBe(true);
    expect(postFileViewerLocationChange({
      id: 'anchor-1',
      index: 0,
      line: 3,
      type: 'line',
      label: 'PDF intro',
      text: 'PDF intro text',
      top: 32,
      left: 0,
      width: 120,
      height: 18,
    }, 'https://host.example', child)).toBe(true);
    expect(parent.postMessage).toHaveBeenNthCalledWith(1, {
      type: 'flyfish-viewer:operation',
      event: 'operation-availability-change',
      payload: {
        download: true,
        print: false,
        exportHtml: true,
        zoom: true,
        zoomIn: true,
        zoomOut: false,
        zoomReset: false,
      },
    }, 'https://host.example');
    expect(parent.postMessage).toHaveBeenNthCalledWith(2, {
      type: 'flyfish-viewer:operation',
      event: 'zoom-change',
      payload: {
        scale: 1,
        label: '100%',
        canZoomIn: true,
        canZoomOut: false,
        canReset: false,
      },
    }, 'https://host.example');
    expect(parent.postMessage).toHaveBeenNthCalledWith(3, {
      type: 'flyfish-viewer:search',
      event: 'search-change',
      payload: {
        query: 'pdf',
        total: 1,
        currentIndex: 0,
        current: {
          id: 'match-1',
          index: 0,
          text: 'PDF',
          anchor: null,
          line: 3,
        },
        matches: [],
      },
    }, 'https://host.example');
    expect(parent.postMessage).toHaveBeenNthCalledWith(4, {
      type: 'flyfish-viewer:location',
      event: 'location-change',
      payload: {
        id: 'anchor-1',
        index: 0,
        line: 3,
        type: 'line',
        label: 'PDF intro',
        text: 'PDF intro text',
        top: 32,
        left: 0,
        width: 120,
        height: 18,
      },
    }, 'https://host.example');
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
    expect(hasVisibleFileViewerToolbarActions({
      download: false,
      print: false,
      exportHtml: false,
      zoom: false,
    })).toBe(false);
    expect(hasVisibleFileViewerToolbarActions({
      download: false,
      print: false,
      exportHtml: true,
      zoom: false,
    })).toBe(true);
    expect(isFileViewerZoomButtonDisabled({
      action: 'canZoomIn',
      availability,
      zoomState: {
        scale: 1,
        label: '100%',
        canZoomIn: true,
        canZoomOut: false,
        canReset: false,
      },
    })).toBe(false);
    expect(isFileViewerZoomButtonDisabled({
      action: 'canZoomOut',
      availability,
      zoomState: {
        scale: 1,
        label: '100%',
        canZoomIn: true,
        canZoomOut: false,
        canReset: false,
      },
    })).toBe(true);
    expect(isFileViewerZoomButtonDisabled({
      action: 'canZoomIn',
      availability,
      toolbarDisabled: true,
      zoomState: {
        scale: 1,
        label: '100%',
        canZoomIn: true,
        canZoomOut: false,
        canReset: false,
      },
    })).toBe(true);
    expect(resolveFileViewerToolbarState({
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
      toolbar: {
        download: true,
        print: false,
        exportHtml: true,
        zoom: true,
      },
      loading: true,
    })).toMatchObject({
      operationAvailability: {
        download: true,
        print: true,
        exportHtml: true,
        zoom: true,
      },
      visibleToolbar: {
        download: true,
        print: false,
        exportHtml: true,
        zoom: true,
      },
      showToolbar: true,
      toolbarPosition: 'bottom-right',
      toolbarDisabled: true,
    });
    expect(resolveFileViewerOperationAvailability({
      extension: 'docx',
      source: {
        file: new File(['demo'], 'demo.docx'),
      },
      renderedReady: false,
      zoomState: {
        scale: 1,
        label: '100%',
        canZoomIn: false,
        canZoomOut: false,
        canReset: false,
      },
    }).download).toBe(true);
    expect(resolveFileViewerOperationAvailability({
      extension: 'docx',
      source: {},
      renderedReady: false,
      zoomState: {
        scale: 1,
        label: '100%',
        canZoomIn: false,
        canZoomOut: false,
        canReset: false,
      },
    }).download).toBe(false);
    expect(resolveFileViewerToolbarPosition(undefined, 'pdf')).toBe('bottom-right');
    expect(resolveFileViewerToolbarPosition({ toolbar: { position: 'top' } }, 'pdf')).toBe('top');
  });

  it('resolves operation filenames from display names, original source metadata, and core defaults', () => {
    expect(resolveFileViewerOperationFilename({
      filename: '显示文档.pdf',
      fallback: DEFAULT_FILE_VIEWER_DOWNLOAD_FILENAME,
    })).toBe('显示文档.pdf');
    expect(resolveFileViewerOperationFilename({
      source: {
        file: new File(['demo'], '原始文档.docx'),
      },
      fallback: DEFAULT_FILE_VIEWER_DOWNLOAD_FILENAME,
    })).toBe('原始文档.docx');
    expect(resolveFileViewerOperationFilename({
      fallback: DEFAULT_FILE_VIEWER_DOWNLOAD_FILENAME,
    })).toBe(DEFAULT_FILE_VIEWER_DOWNLOAD_FILENAME);
    expect(resolveFileViewerOperationFilename({
      fallback: DEFAULT_FILE_VIEWER_EXPORT_FILENAME,
    })).toBe(DEFAULT_FILE_VIEWER_EXPORT_FILENAME);
    expect(resolveFileViewerOperationFilename({})).toBe(DEFAULT_FILE_VIEWER_PREVIEW_TITLE);
    expect(resolveFileViewerDisplayFilename({
      kind: 'url',
      filename: '线上报告.pdf',
      extension: 'pdf',
      url: '/docs/report.pdf',
    })).toBe('线上报告.pdf');
    expect(resolveFileViewerDisplayFilename(null)).toBe(DEFAULT_FILE_VIEWER_EXPORT_FILENAME);
    expect(createFileViewerOriginalSourceStateFromNormalizedSource({
      kind: 'url',
      filename: '线上报告.pdf',
      extension: 'pdf',
      url: '/docs/report.pdf',
      size: 1024,
    })).toMatchObject({
      buffer: null,
      file: null,
      url: '/docs/report.pdf',
      filename: '线上报告.pdf',
    });
  });

  it('clones operation availability snapshots without sharing mutable references', () => {
    const availability = resolveFileViewerOperationAvailability({
      extension: 'pdf',
      hasOriginalSource: true,
      renderedReady: true,
      adapter: { toHtml: () => '<main>pdf</main>' },
      zoomState: {
        scale: 1.25,
        label: '125%',
        canZoomIn: false,
        canZoomOut: true,
        canReset: true,
      },
    });

    const snapshot = cloneFileViewerOperationAvailability(availability);

    expect(snapshot).toEqual(availability);
    expect(snapshot).not.toBe(availability);

    snapshot.download = false;
    snapshot.zoomReset = false;

    expect(availability.download).toBe(true);
    expect(availability.zoomReset).toBe(true);
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

  it('normalizes original source state in core', () => {
    const file = new File(['demo'], 'demo.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const source = createFileViewerOriginalSourceState({
      file,
      filename: 'display.docx',
    });

    expect(source).toEqual({
      buffer: null,
      file,
      url: null,
      filename: 'display.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    expect(resolveFileViewerOriginalFilename(source)).toBe('display.docx');
    expect(createFileViewerOriginalSourceState({
      buffer: new ArrayBuffer(2),
      mimeType: 'application/octet-stream',
    }).mimeType).toBe('application/octet-stream');
  });
});
