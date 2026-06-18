import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseHTML } from 'linkedom';
import {
  applyFileViewerSearchState,
  applyFileViewerZoomState,
  buildFileViewerDocumentTextChunks,
  clearFileViewerZoomControllerProvider,
  collectFileViewerDocumentAnchors,
  cloneFileViewerSearchState,
  createFileViewerZoomChangeState,
  createFileViewerDocumentChangeSnapshot,
  createEmptyFileViewerSearchState,
  createFileViewerDomSearchController,
  createFileViewerSearchChangeState,
  createFileViewerZoomController,
  createFileViewerZoomState,
  destroyFileViewerDomSearchController,
  dispatchFileViewerLocationChange,
  dispatchFileViewerSearchChange,
  findFileViewerSearchProvider,
  findFileViewerZoomProvider,
  getCurrentFileViewerDocumentAnchor,
  getFileViewerScrollableRange,
  isFileViewerScrollableElement,
  normalizeFileViewerAiOptions,
  normalizeFileViewerSearchOptions,
  observeFileViewerDomSearchController,
  observeFileViewerZoomController,
  registerFileViewerSearchProvider,
  registerFileViewerZoomProvider,
  refreshFileViewerZoomControllerProvider,
  resolveFileViewerLocationChangeAnchor,
  resolveFileViewerScrollContainer,
  runFileViewerDomSearchControllerAction,
  runFileViewerZoomControllerAction,
  syncFileViewerDomSearchControllerState,
  syncFileViewerZoomControllerState,
  unregisterFileViewerSearchProvider,
  unregisterFileViewerZoomProvider,
  type FileViewerDocumentAnchor,
  type FileViewerSearchProvider,
  type FileViewerZoomProvider,
} from '../packages/core/src';

const anchor = (id: string, text: string, line = 1): FileViewerDocumentAnchor => ({
  id,
  index: line - 1,
  line,
  type: 'line',
  label: text.slice(0, 12),
  text,
  top: line * 10,
  left: 0,
  width: 100,
  height: 20,
});

const setRect = (element: Element, rect: Partial<DOMRect>) => {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      bottom: rect.bottom ?? (rect.top || 0) + (rect.height || 0),
      height: rect.height ?? 0,
      left: rect.left ?? 0,
      right: rect.right ?? (rect.left || 0) + (rect.width || 0),
      top: rect.top ?? 0,
      width: rect.width ?? 0,
      x: rect.x ?? rect.left ?? 0,
      y: rect.y ?? rect.top ?? 0,
      toJSON: () => ({}),
    } as DOMRect),
  });
};

const setScrollMetrics = (element: HTMLElement, metrics: {
  clientHeight: number;
  scrollHeight: number;
}) => {
  Object.defineProperty(element, 'clientHeight', { configurable: true, value: metrics.clientHeight });
  Object.defineProperty(element, 'scrollHeight', { configurable: true, value: metrics.scrollHeight });
};

describe('@file-viewer/core document helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes zoom state for wrapper toolbars', () => {
    expect(createFileViewerZoomState()).toEqual({
      scale: 1,
      label: '100%',
      canZoomIn: false,
      canZoomOut: false,
      canReset: false,
      minScale: undefined,
      maxScale: undefined,
    });
    expect(createFileViewerZoomState({ scale: 1.25, canZoomIn: true })).toMatchObject({
      scale: 1.25,
      label: '125%',
      canZoomIn: true,
    });
  });

  it('normalizes search and AI option shorthands', () => {
    expect(normalizeFileViewerSearchOptions(false)).toEqual({ enabled: false });
    expect(normalizeFileViewerSearchOptions(true)).toEqual({});
    expect(createEmptyFileViewerSearchState('pdf')).toEqual({
      query: 'pdf',
      total: 0,
      currentIndex: -1,
      current: null,
      matches: [],
    });

    expect(normalizeFileViewerAiOptions(false)).toEqual({ enabled: false, collectText: false });
    expect(normalizeFileViewerAiOptions({ chunkSize: 256 })).toEqual({ chunkSize: 256 });
  });

  it('clones search state snapshots without sharing match or anchor references', () => {
    const source = createEmptyFileViewerSearchState('pdf');
    source.total = 1;
    source.currentIndex = 0;
    source.current = {
      id: 'match-1',
      index: 0,
      text: 'PDF',
      anchor: anchor('intro', 'PDF intro'),
      line: 1,
      page: 2,
    };
    source.matches = [source.current];

    const cloned = cloneFileViewerSearchState(source);
    const eventState = createFileViewerSearchChangeState(source);

    expect(cloned).toEqual(source);
    expect(cloned).not.toBe(source);
    expect(cloned.current).not.toBe(source.current);
    expect(cloned.current?.anchor).not.toBe(source.current.anchor);
    expect(cloned.matches[0]).not.toBe(source.matches[0]);
    expect(cloned.matches[0].anchor).not.toBe(source.matches[0].anchor);
    expect(eventState).toEqual(source);
    expect(eventState).not.toBe(source);
    expect(eventState.current).not.toBe(source.current);

    const target = createEmptyFileViewerSearchState('old');
    expect(applyFileViewerSearchState(target, source)).toBe(target);
    expect(target).toEqual(source);
    expect(target.current).not.toBe(source.current);
    expect(target.current?.anchor).not.toBe(source.current.anchor);
    expect(target.matches[0]).not.toBe(source.matches[0]);
  });

  it('dispatches document search and location notifications in wrapper event order', () => {
    const events: string[] = [];
    const parent = {
      postMessage: vi.fn((payload: unknown) => {
        events.push(`post:${(payload as { event: string }).event}`);
      }),
    };
    const child = {
      parent,
    } as unknown as Window;
    const source = createEmptyFileViewerSearchState('PDF');
    const currentAnchor = anchor('intro', 'PDF intro', 2);
    source.total = 1;
    source.currentIndex = 0;
    source.current = {
      id: 'match-1',
      index: 0,
      text: 'PDF',
      anchor: currentAnchor,
      line: 2,
    };
    source.matches = [source.current];
    const locationAnchor = anchor('chapter-1', 'Chapter 1', 4);
    let emittedSearchState: typeof source | null = null;
    let emittedLocationAnchor: FileViewerDocumentAnchor | null | undefined;

    expect(dispatchFileViewerSearchChange({
      state: source,
      targetOrigin: 'https://host.example',
      targetWindow: child,
      onChange: state => {
        events.push('emit:search-change');
        emittedSearchState = state;
        state.query = 'mutated';
      },
    })).toBe(true);
    expect(dispatchFileViewerLocationChange({
      anchor: locationAnchor,
      targetOrigin: 'https://host.example',
      targetWindow: child,
      onChange: nextAnchor => {
        events.push('emit:location-change');
        emittedLocationAnchor = nextAnchor;
      },
    })).toBe(true);

    expect(events).toEqual([
      'emit:search-change',
      'post:search-change',
      'emit:location-change',
      'post:location-change',
    ]);
    expect(emittedSearchState).not.toBe(source);
    expect(emittedSearchState?.current).not.toBe(source.current);
    expect(emittedSearchState?.current?.anchor).not.toBe(source.current.anchor);
    expect(source.query).toBe('PDF');
    expect(emittedLocationAnchor).toBe(locationAnchor);
    expect(parent.postMessage).toHaveBeenNthCalledWith(1, {
      type: 'flyfish-viewer:search',
      event: 'search-change',
      payload: {
        query: 'mutated',
        total: 1,
        currentIndex: 0,
        current: {
          id: 'match-1',
          index: 0,
          text: 'PDF',
          anchor: currentAnchor,
          line: 2,
        },
        matches: [{
          id: 'match-1',
          index: 0,
          text: 'PDF',
          anchor: currentAnchor,
          line: 2,
        }],
      },
    }, 'https://host.example');
    expect(parent.postMessage).toHaveBeenNthCalledWith(2, {
      type: 'flyfish-viewer:location',
      event: 'location-change',
      payload: locationAnchor,
    }, 'https://host.example');
  });

  it('builds AI-friendly document text chunks with overlap and limits', () => {
    const longText = Array.from({ length: 450 }, (_, index) => String.fromCharCode(97 + (index % 26))).join('');
    const chunks = buildFileViewerDocumentTextChunks(
      [anchor('intro', longText, 3)],
      { chunkSize: 120, chunkOverlap: 50, maxTextLength: 420 }
    );

    expect(chunks.map(chunk => ({
      id: chunk.id,
      length: chunk.text.length,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
    }))).toEqual([
      { id: 'intro-chunk-1', length: 200, startLine: 3, endLine: 3 },
      { id: 'intro-chunk-2', length: 200, startLine: 3, endLine: 3 },
      { id: 'intro-chunk-3', length: 120, startLine: 3, endLine: 3 },
    ]);

    expect(buildFileViewerDocumentTextChunks([anchor('intro', 'text')], false)).toEqual([]);
  });

  it('exposes renderer provider contracts from core', async () => {
    const zoomProvider: FileViewerZoomProvider = {
      zoomIn: async () => createFileViewerZoomState({ scale: 1.1 }),
      zoomOut: async () => createFileViewerZoomState({ scale: 0.9 }),
      resetZoom: async () => createFileViewerZoomState(),
      getState: () => createFileViewerZoomState(),
    };
    const searchProvider: FileViewerSearchProvider = {
      search: async query => ({
        query,
        total: 0,
        currentIndex: -1,
        current: null,
        matches: [],
      }),
    };

    await expect(zoomProvider.zoomIn()).resolves.toMatchObject({ scale: 1.1 });
    await expect(searchProvider.search('cad')).resolves.toMatchObject({ query: 'cad' });
  });

  it('collects DOM anchors and resolves the current document location', () => {
    const { document } = parseHTML(`
      <main id="root">
        <article>
          <h1>PDF 沉浸式翻译</h1>
          <p>第一段正文，包含可用于搜索和定位的文本。</p>
          <div class="state-panel"><p>loading should be ignored</p></div>
        </article>
      </main>
    `);
    const root = document.getElementById('root') as HTMLElement;
    const heading = root.querySelector('h1') as HTMLElement;
    const paragraph = root.querySelector('article > p') as HTMLElement;
    const ignored = root.querySelector('.state-panel p') as HTMLElement;

    Object.defineProperty(root, 'clientHeight', { configurable: true, value: 120 });
    Object.defineProperty(root, 'scrollTop', { configurable: true, writable: true, value: 35 });
    Object.defineProperty(root, 'scrollLeft', { configurable: true, writable: true, value: 0 });
    setRect(root, { top: 0, left: 0, width: 800, height: 120 });
    setRect(heading, { top: 10, left: 12, width: 400, height: 32 });
    setRect(paragraph, { top: 70, left: 12, width: 600, height: 24 });
    setRect(ignored, { top: 100, left: 12, width: 600, height: 24 });

    const anchors = collectFileViewerDocumentAnchors(root);

    expect(anchors.map(item => ({
      line: item.line,
      type: item.type,
      label: item.label,
      top: item.top,
    }))).toEqual([
      { line: 1, type: 'block', label: 'PDF 沉浸式翻译', top: 45 },
      { line: 2, type: 'line', label: '第一段正文，包含可用于搜索和定位的文本。', top: 105 },
    ]);
    expect(ignored.dataset.viewerAnchorId).toBeUndefined();
    expect(getCurrentFileViewerDocumentAnchor(root, anchors)?.line).toBe(1);
    expect(resolveFileViewerLocationChangeAnchor({ root, anchors })?.line).toBe(1);
    expect(createFileViewerDocumentChangeSnapshot({
      root,
      anchors,
      searchState: createEmptyFileViewerSearchState('PDF'),
    })).toMatchObject({
      searchState: { query: 'PDF', total: 0, currentIndex: -1 },
      locationAnchor: { line: 1 },
    });
  });

  it('resolves the best document scroll container with framework-neutral DOM rules', () => {
    const { document } = parseHTML(`
      <main id="root" style="overflow-y:visible">
        <section class="pdf-wrapper" style="overflow-y:hidden"></section>
        <article id="small" style="overflow-y:auto"></article>
        <article id="large" style="overflow-y:auto"></article>
      </main>
    `);
    const root = document.getElementById('root') as HTMLElement;
    const preferred = root.querySelector('.pdf-wrapper') as HTMLElement;
    const small = document.getElementById('small') as HTMLElement;
    const large = document.getElementById('large') as HTMLElement;

    vi.stubGlobal('window', {
      getComputedStyle: (element: HTMLElement) => ({
        overflow: element.style.overflow,
        overflowY: element.style.overflowY,
      }),
    });
    setScrollMetrics(root, { clientHeight: 100, scrollHeight: 800 });
    setScrollMetrics(preferred, { clientHeight: 100, scrollHeight: 160 });
    setScrollMetrics(small, { clientHeight: 100, scrollHeight: 180 });
    setScrollMetrics(large, { clientHeight: 100, scrollHeight: 420 });

    expect(getFileViewerScrollableRange(large)).toBe(320);
    expect(isFileViewerScrollableElement(root)).toBe(false);
    expect(resolveFileViewerScrollContainer(root)).toBe(large);

    preferred.style.overflowY = 'auto';
    expect(resolveFileViewerScrollContainer(root)).toBe(preferred);
  });

  it('registers framework-neutral search and zoom providers on DOM hosts', async () => {
    const { document } = parseHTML('<div id="root"><section id="search" data-viewer-search-provider="pdf"></section><section id="zoom"></section></div>');
    const root = document.getElementById('root') as HTMLElement;
    const searchHost = document.getElementById('search') as HTMLElement;
    const zoomHost = document.getElementById('zoom') as HTMLElement;
    const searchProvider: FileViewerSearchProvider = {
      search: query => createEmptyFileViewerSearchState(query),
    };
    const zoomProvider: FileViewerZoomProvider = {
      zoomIn: () => createFileViewerZoomState({ scale: 1.1 }),
      zoomOut: () => createFileViewerZoomState({ scale: 0.9 }),
      resetZoom: () => createFileViewerZoomState(),
      getState: () => createFileViewerZoomState(),
    };

    registerFileViewerSearchProvider(searchHost, searchProvider);
    registerFileViewerZoomProvider(zoomHost, zoomProvider);

    expect(findFileViewerSearchProvider(root)).toBe(searchProvider);
    expect(findFileViewerZoomProvider(zoomHost)).toBe(zoomProvider);
    expect(zoomHost.dataset.viewerZoomProvider).toBe('custom');
    await expect(Promise.resolve(findFileViewerSearchProvider(root)?.search('pdf'))).resolves.toMatchObject({ query: 'pdf' });

    unregisterFileViewerSearchProvider(searchHost);
    unregisterFileViewerZoomProvider(zoomHost);

    expect(findFileViewerSearchProvider(root)).toBeNull();
    expect(findFileViewerZoomProvider(zoomHost)).toBeNull();
    expect(zoomHost.dataset.viewerZoomProvider).toBeUndefined();
  });

  it('runs the DOM search controller without framework state', async () => {
    const { document } = parseHTML(`
      <main id="root">
        <article>
          <p>Alpha PDF beta pdf.</p>
          <button>pdf ignored</button>
          <canvas>pdf ignored</canvas>
        </article>
      </main>
    `);
    const root = document.getElementById('root') as HTMLElement;
    const paragraph = root.querySelector('p') as HTMLElement;

    Object.defineProperty(root, 'clientHeight', { configurable: true, value: 80 });
    Object.defineProperty(root, 'scrollHeight', { configurable: true, value: 400 });
    Object.defineProperty(root, 'clientWidth', { configurable: true, value: 200 });
    Object.defineProperty(root, 'scrollWidth', { configurable: true, value: 200 });
    Object.defineProperty(root, 'scrollTop', { configurable: true, writable: true, value: 0 });
    Object.defineProperty(root, 'scrollLeft', { configurable: true, writable: true, value: 18 });
    root.scrollTo = (options?: ScrollToOptions | number, y?: number) => {
      if (typeof options === 'number') {
        root.scrollLeft = options;
        root.scrollTop = y || 0;
        return;
      }
      root.scrollTop = Number(options?.top || 0);
      root.scrollLeft = Number(options?.left || 0);
    };
    setRect(root, { top: 0, left: 0, width: 200, height: 80 });
    setRect(paragraph, { top: 40, left: 10, width: 180, height: 20 });

    const controller = createFileViewerDomSearchController({
      root: () => root,
      waitForDomUpdate: () => Promise.resolve(),
      preferredScrollContainer: () => root,
    });
    const target = {
      anchors: { value: [] as FileViewerDocumentAnchor[] },
      state: createEmptyFileViewerSearchState(),
    };

    await runFileViewerDomSearchControllerAction(target, controller, () => controller.search('pdf'));

    expect(controller.state).toMatchObject({
      query: 'pdf',
      total: 2,
      currentIndex: 0,
    });
    expect(target.state).toMatchObject({ query: 'pdf', total: 2, currentIndex: 0 });
    expect(target.anchors.value).toBe(controller.anchors);
    expect(Array.from(root.querySelectorAll('mark')).map(mark => mark.textContent)).toEqual(['PDF', 'pdf']);
    expect(root.querySelectorAll('.flyfish-search-match--active')).toHaveLength(1);
    expect(root.scrollLeft).toBe(18);

    await runFileViewerDomSearchControllerAction(target, controller, () => controller.next());
    expect(controller.state.currentIndex).toBe(1);
    expect(target.state.currentIndex).toBe(1);

    expect(observeFileViewerDomSearchController(target, controller)).toBe(target.state);
    expect(syncFileViewerDomSearchControllerState(target, controller)).toBe(target.state);

    await runFileViewerDomSearchControllerAction(target, controller, () => controller.clear());
    expect(controller.state).toMatchObject({
      query: '',
      total: 0,
      currentIndex: -1,
      current: null,
    });
    expect(target.state).toMatchObject({ query: '', total: 0, currentIndex: -1 });
    expect(root.querySelectorAll('mark')).toHaveLength(0);
    expect(paragraph.textContent).toBe('Alpha PDF beta pdf.');

    destroyFileViewerDomSearchController(target, controller);
  });

  it('runs the zoom controller without framework state', async () => {
    const { document } = parseHTML('<main id="root"><section id="zoom" data-viewer-zoom-provider="docx"></section></main>');
    const root = document.getElementById('root') as HTMLElement;
    const zoomHost = document.getElementById('zoom') as HTMLElement;
    const listeners = new Set<() => void>();
    const beforeOperations: string[] = [];
    const stateTarget = createFileViewerZoomState();
    expect(applyFileViewerZoomState(stateTarget, { scale: 2, canZoomOut: true })).toBe(stateTarget);
    expect(stateTarget).toMatchObject({
      scale: 2,
      label: '200%',
      canZoomOut: true,
    });
    applyFileViewerZoomState(stateTarget, null);
    expect(stateTarget).toEqual(createFileViewerZoomState());

    let scale = 1;
    let allowZoomOut = false;
    const getState = () => createFileViewerZoomState({
      scale,
      canZoomIn: scale < 2,
      canZoomOut: scale > 0.5,
      canReset: scale !== 1,
      minScale: 0.5,
      maxScale: 2,
    });
    const emit = () => {
      listeners.forEach(listener => listener());
    };
    const zoomProvider: FileViewerZoomProvider = {
      zoomIn: () => {
        scale = 1.25;
        emit();
        return getState();
      },
      zoomOut: () => {
        scale = 0.75;
        emit();
        return getState();
      },
      resetZoom: () => {
        scale = 1;
        emit();
        return getState();
      },
      getState,
      subscribe(listener) {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    };

    registerFileViewerZoomProvider(zoomHost, zoomProvider);
    const controller = createFileViewerZoomController({
      root: () => root,
      beforeZoom: operation => {
        beforeOperations.push(operation);
        return operation !== 'zoom-out' || allowZoomOut;
      },
    });

    expect(controller.hasProvider()).toBe(true);
    expect(syncFileViewerZoomControllerState(stateTarget, controller)).toBe(stateTarget);
    expect(controller.state).toMatchObject({
      scale: 1,
      label: '100%',
      canZoomIn: true,
    });
    expect(createFileViewerZoomChangeState(stateTarget)).toEqual(controller.getState());

    await expect(runFileViewerZoomControllerAction(stateTarget, () => controller.zoomIn()))
      .resolves.toMatchObject({ scale: 1.25, label: '125%' });
    expect(beforeOperations).toEqual(['zoom-in']);
    expect(controller.state.canReset).toBe(true);
    expect(stateTarget).toMatchObject({ scale: 1.25, label: '125%' });

    scale = 1.5;
    emit();
    expect(controller.state).toMatchObject({ scale: 1.5, label: '150%' });
    expect(refreshFileViewerZoomControllerProvider(stateTarget, controller)).toBe(zoomProvider);
    expect(stateTarget).toMatchObject({ scale: 1.5, label: '150%' });
    expect(observeFileViewerZoomController(stateTarget, controller)).toBe(stateTarget);

    await expect(controller.zoomOut()).resolves.toMatchObject({ scale: 1.5 });
    expect(beforeOperations).toEqual(['zoom-in', 'zoom-out']);

    allowZoomOut = true;
    await expect(controller.zoomOut()).resolves.toMatchObject({ scale: 0.75, label: '75%' });

    clearFileViewerZoomControllerProvider(stateTarget, controller);
    expect(controller.provider).toBeNull();
    expect(controller.getState()).toEqual(createFileViewerZoomState());
    expect(stateTarget).toEqual(createFileViewerZoomState());

    controller.destroy();
    unregisterFileViewerZoomProvider(zoomHost);
  });
});
