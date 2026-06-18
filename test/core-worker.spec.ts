import { describe, expect, it, vi } from 'vitest';
import { parseHTML } from 'linkedom';
import {
  DEFAULT_FILE_VIEWER_RENDER_TARGET_CLASS,
  WorkerRefImpl,
  applyFileViewerRenderSurfaceState,
  clearFileViewerRenderSurface,
  createFileRenderHandlerRendererSession,
  createFileRenderHandlerRegistry,
  createFileRenderHandlerLoader,
  createFileViewerRenderSurfaceState,
  createFileViewerRenderTarget,
  createFileViewerRendererDispatcher,
  disposeActiveFileViewerRendererSession,
  disposeFileViewerRendered,
  disposeFileViewerRendererSession,
  normalizeSource,
  removeFileViewerRenderTarget,
  resetFileViewerRenderSurface,
  renderFileViewerHandler,
  runFileViewerRenderSurfaceMount,
  refWorker,
  type FileRenderContext,
  type FileRenderHandler,
  type RendererDefinition,
} from '../packages/core/src';

describe('@file-viewer/core worker and render contracts', () => {
  it('creates worker refs lazily and reuses the created worker', () => {
    const worker = { terminate: vi.fn() } as unknown as Worker;
    const provider = vi.fn(() => worker);
    const ref = refWorker('demo.worker.js');

    expect(ref.name).toBe('demo.worker.js');
    expect(ref.worker).toBeNull();
    expect(ref.defaults(provider)).toBe(worker);
    expect(ref.defaults(provider)).toBe(worker);
    expect(provider).toHaveBeenCalledTimes(1);
  });

  it('keeps WorkerRefImpl constructible for compatibility wrappers', () => {
    const worker = { postMessage: vi.fn() } as unknown as Worker;
    const ref = new WorkerRefImpl('compat.worker.js', worker);

    expect(ref.name).toBe('compat.worker.js');
    expect(ref.defaults(() => {
      throw new Error('should not replace existing worker');
    })).toBe(worker);
  });

  it('keeps the legacy one-argument WorkerRefImpl constructor working', () => {
    const worker = { postMessage: vi.fn() } as unknown as Worker;
    const ref = new WorkerRefImpl(worker);

    expect(ref.name).toBe('');
    expect(ref.defaults(() => {
      throw new Error('should not replace existing worker');
    })).toBe(worker);
  });

  it('exposes renderer context and handler contracts from core', async () => {
    const context: FileRenderContext = {
      filename: 'demo.pdf',
      url: '/demo.pdf',
      streamUrl: '/demo.pdf',
      onProgressiveRender: vi.fn(),
      registerExportAdapter: vi.fn(),
    };
    const handler: FileRenderHandler<string, HTMLDivElement> = async (_buffer, target, type, nextContext) => {
      nextContext?.onProgressiveRender?.();
      target.dataset.renderedType = type || '';
      return nextContext?.filename || '';
    };
    const target = { dataset: {} } as HTMLDivElement;

    await expect(handler(new ArrayBuffer(1), target, 'pdf', context)).resolves.toBe('demo.pdf');
    expect(target.dataset.renderedType).toBe('pdf');
    expect(context.onProgressiveRender).toHaveBeenCalledTimes(1);
  });

  it('invokes render handlers through the core dispatcher contract', async () => {
    const context: FileRenderContext = {
      filename: 'demo.pdf',
      onProgressiveRender: vi.fn(),
    };
    const handler: FileRenderHandler<string, HTMLDivElement> = async (_buffer, target, type, nextContext) => {
      nextContext?.onProgressiveRender?.();
      target.dataset.renderedType = type || '';
      return nextContext?.filename || '';
    };
    const dispatcher = createFileViewerRendererDispatcher({
      registry: {
        list: () => [{
          id: 'pdf',
          label: 'PDF',
          category: 'document',
          extensions: ['pdf'],
        } as RendererDefinition],
        register: () => undefined,
        unregister: () => false,
        getById: () => undefined,
        getByExtension: () => undefined,
        hasExtension: () => false,
        listExtensions: () => [],
      },
      handlers: [{ rendererId: 'pdf', handler }],
    });
    const target = { dataset: {} } as HTMLDivElement;

    await expect(renderFileViewerHandler({
      dispatcher,
      buffer: new ArrayBuffer(1),
      target,
      type: '.PDF',
      context,
    })).resolves.toBe('demo.pdf');

    expect(target.dataset.renderedType).toBe('pdf');
    expect(context.onProgressiveRender).toHaveBeenCalledTimes(1);
  });

  it('adapts legacy render handlers into renderer loaders', async () => {
    const unmount = vi.fn();
    const onProgressiveRender = vi.fn();
    const registerExportAdapter = vi.fn();
    const handler: FileRenderHandler<{ unmount: () => void }, HTMLDivElement> = async (_buffer, target, type, context) => {
      context?.onProgressiveRender?.();
      target.dataset.renderedType = type || '';
      target.dataset.filename = context?.filename || '';
      target.dataset.streamUrl = context?.streamUrl || '';
      return { unmount };
    };
    const loader = createFileRenderHandlerLoader({ handler });
    const target = { dataset: {} } as HTMLDivElement;
    const session = await loader({
      source: normalizeSource({
        buffer: new ArrayBuffer(1),
        filename: 'demo.docx',
      }),
      surface: { container: target },
      options: {},
      registerExportAdapter,
      renderContext: {
        filename: 'legacy.docx',
        streamUrl: '/legacy-stream.docx',
        onProgressiveRender,
      },
    });

    expect(target.dataset.renderedType).toBe('docx');
    expect(target.dataset.filename).toBe('legacy.docx');
    expect(target.dataset.streamUrl).toBe('/legacy-stream.docx');
    expect(onProgressiveRender).toHaveBeenCalledTimes(1);
    await session.destroy?.();
    expect(unmount).toHaveBeenCalledTimes(1);

    const destroy = vi.fn();
    disposeFileViewerRendered({ destroy });
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('wraps legacy rendered instances into core renderer sessions', async () => {
    const unmount = vi.fn();
    const rendered = { unmount };
    const session = createFileRenderHandlerRendererSession(rendered);

    expect(session.rendered).toBe(rendered);
    await session.destroy?.();
    expect(unmount).toHaveBeenCalledTimes(1);
  });

  it('creates and clears framework-neutral render surface targets', () => {
    const { document } = parseHTML('<main id="root"><span>old</span></main>');
    const root = document.getElementById('root') as HTMLElement;

    clearFileViewerRenderSurface(root);
    expect(root.childElementCount).toBe(0);

    const target = createFileViewerRenderTarget(root);
    expect(target.className).toBe(DEFAULT_FILE_VIEWER_RENDER_TARGET_CLASS);
    expect(root.firstElementChild).toBe(target);

    const customTarget = createFileViewerRenderTarget(root, { className: 'custom-render' });
    expect(customTarget.className).toBe('custom-render');
    expect(root.childElementCount).toBe(2);
    expect(removeFileViewerRenderTarget(root, customTarget)).toBe(true);
    expect(removeFileViewerRenderTarget(root, customTarget)).toBe(false);
  });

  it('applies framework-neutral render surface state and disposes the active session', () => {
    const { document } = parseHTML('<main id="root"><section>rendered</section></main>');
    const root = document.getElementById('root') as HTMLElement;
    const onError = vi.fn();
    const destroy = vi.fn();
    const session = { destroy };
    const adapter = { print: true };
    const state = createFileViewerRenderSurfaceState<typeof session>();
    const readiness = {
      renderedReady: true,
      progressiveReady: true,
    };

    expect(state.session).toBeNull();
    expect(state.exportAdapter).toBeNull();
    expect(applyFileViewerRenderSurfaceState(state, {
      session,
      exportAdapter: adapter,
    })).toBe(state);
    expect(state.session).toBe(session);
    expect(state.exportAdapter).toBe(adapter);

    expect(disposeActiveFileViewerRendererSession(state, { onError })).toBe(session);
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
    expect(state.session).toBeNull();
    expect(state.exportAdapter).toBe(adapter);

    applyFileViewerRenderSurfaceState(state, { exportAdapter: null });
    expect(state.exportAdapter).toBeNull();

    applyFileViewerRenderSurfaceState(state, {
      session,
      exportAdapter: adapter,
    });
    expect(resetFileViewerRenderSurface({
      surfaceState: state,
      readinessState: readiness,
      container: root,
      disposeOptions: { onError },
    })).toBe(session);
    expect(destroy).toHaveBeenCalledTimes(2);
    expect(onError).not.toHaveBeenCalled();
    expect(state.session).toBeNull();
    expect(state.exportAdapter).toBeNull();
    expect(readiness).toEqual({
      renderedReady: false,
      progressiveReady: false,
    });
    expect(root.childElementCount).toBe(0);
  });

  it('runs framework-neutral render surface mount orchestration', async () => {
    const { document } = parseHTML('<main id="root"><span>old</span></main>');
    const root = document.getElementById('root') as HTMLElement;
    const session = { destroy: vi.fn() };
    const adapter = { exportHtml: true };
    const state = createFileViewerRenderSurfaceState<typeof session>();
    const readiness = {
      renderedReady: false,
      progressiveReady: false,
    };
    const clearRenderedContent = vi.fn(() => clearFileViewerRenderSurface(root));
    const waitForContainer = vi.fn();
    const waitForPaint = vi.fn();
    const startZoomObserver = vi.fn();
    const refreshDocumentIndex = vi.fn();
    const refreshZoomProvider = vi.fn();
    const render = vi.fn(async context => {
      expect(context.type).toBe('pdf');
      expect(context.filename).toBe('demo.pdf');
      expect(context.sourceUrl).toBe('/example/demo.pdf');
      expect(context.streamUrl).toBe('/stream/demo.pdf');
      expect(context.target.className).toBe(DEFAULT_FILE_VIEWER_RENDER_TARGET_CLASS);
      context.registerExportAdapter(adapter);
      context.onProgressiveRender();
      context.target.appendChild(document.createElement('strong'));
      return session;
    });

    const result = await runFileViewerRenderSurfaceMount({
      buffer: new ArrayBuffer(4),
      file: new File(['demo'], 'demo.pdf'),
      version: 1,
      sourceUrl: '/example/demo.pdf',
      streamUrl: '/stream/demo.pdf',
      getContainer: () => root,
      surfaceState: state,
      readinessState: readiness,
      isCurrent: version => version === 1,
      clearRenderedContent,
      render,
      waitForContainer,
      waitForPaint,
      onStartZoomObserver: startZoomObserver,
      onRefreshDocumentIndex: refreshDocumentIndex,
      onRefreshZoomProvider: refreshZoomProvider,
    });

    expect(result).toBe(session);
    expect(clearRenderedContent).toHaveBeenCalledWith('replace');
    expect(waitForContainer).toHaveBeenCalledTimes(1);
    expect(waitForPaint).toHaveBeenCalledTimes(1);
    expect(startZoomObserver).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledTimes(1);
    expect(root.innerHTML).not.toContain('old');
    expect(root.innerHTML).toContain('file-render');
    expect(root.innerHTML).toContain('strong');
    expect(state.exportAdapter).toBe(adapter);
    expect(readiness.progressiveReady).toBe(true);
    expect(refreshDocumentIndex).toHaveBeenCalledTimes(1);
    expect(refreshZoomProvider).toHaveBeenCalledTimes(1);
  });

  it('removes stale render targets and disposes stale sessions during surface mount', async () => {
    const { document } = parseHTML('<main id="root"></main>');
    const root = document.getElementById('root') as HTMLElement;
    const session = { destroy: vi.fn() };
    const state = createFileViewerRenderSurfaceState<typeof session>();
    const readiness = {
      renderedReady: false,
      progressiveReady: false,
    };
    let currentVersion = 1;
    const render = vi.fn(async context => {
      context.target.appendChild(document.createElement('strong'));
      currentVersion = 2;
      return session;
    });

    await expect(runFileViewerRenderSurfaceMount({
      buffer: new ArrayBuffer(4),
      file: new File(['demo'], 'demo.pdf'),
      version: 1,
      getContainer: () => root,
      surfaceState: state,
      readinessState: readiness,
      isCurrent: version => version === currentVersion,
      clearRenderedContent: () => clearFileViewerRenderSurface(root),
      render,
    })).resolves.toBeUndefined();

    expect(render).toHaveBeenCalledTimes(1);
    expect(session.destroy).toHaveBeenCalledTimes(1);
    expect(root.innerHTML).not.toContain('file-render');
  });

  it('safely disposes renderer sessions and reports teardown errors', async () => {
    const onError = vi.fn();
    const syncError = new Error('sync teardown failed');
    const asyncError = new Error('async teardown failed');
    const syncDestroy = vi.fn(() => {
      throw syncError;
    });
    const asyncDestroy = vi.fn(() => Promise.reject(asyncError));

    disposeFileViewerRendererSession({ destroy: syncDestroy }, { onError });
    disposeFileViewerRendererSession({ destroy: asyncDestroy }, { onError });
    disposeFileViewerRendererSession(null, { onError });
    await Promise.resolve();

    expect(syncDestroy).toHaveBeenCalledTimes(1);
    expect(asyncDestroy).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(syncError);
    expect(onError).toHaveBeenCalledWith(asyncError);
  });

  it('builds renderer registries from legacy render handlers', async () => {
    const unmount = vi.fn();
    const handler: FileRenderHandler<{ unmount: () => void }, HTMLDivElement> = async (_buffer, target, type, context) => {
      target.dataset.renderedType = type || '';
      target.dataset.filename = context?.filename || '';
      return { unmount };
    };
    const target = { dataset: {} } as HTMLDivElement;
    const { registry, missingRendererIds } = createFileRenderHandlerRegistry({
      definitions: [{
        id: 'text-fixture',
        label: 'Text Fixture',
        category: 'code',
        extensions: ['txt-fixture'],
      }],
      handlers: [{
        rendererId: 'text-fixture',
        handler,
      }],
    });
    const renderer = registry.getByExtension('TXT-FIXTURE');

    expect(missingRendererIds).toEqual([]);
    expect(renderer?.load).toBeTypeOf('function');

    const session = await renderer?.load?.({
      source: normalizeSource({
        buffer: new ArrayBuffer(1),
        filename: 'demo.txt-fixture',
      }),
      surface: { container: target },
      options: {},
    });

    expect(target.dataset.renderedType).toBe('txt-fixture');
    expect(target.dataset.filename).toBe('demo.txt-fixture');
    await session?.destroy?.();
    expect(unmount).toHaveBeenCalledTimes(1);
  });
});
