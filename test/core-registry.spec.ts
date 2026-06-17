import { describe, expect, it } from 'vitest';
import { parseHTML } from 'linkedom';
import {
  DEFAULT_RENDERER_DEFINITIONS,
  DEFAULT_SUPPORTED_EXTENSIONS,
  createFileViewerZoomState,
  createRendererRegistry,
  createViewer,
  getExtension,
  normalizeSource,
  readFileViewerBuffer,
  registerFileViewerZoomProvider,
  unregisterFileViewerZoomProvider,
  type FileViewerZoomProvider,
  type RendererDefinition,
  wrapFileViewerFileRef,
} from '../packages/core/src';

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

describe('@file-viewer/core registry', () => {
  it('keeps the current public format matrix at 194 extensions', () => {
    expect(DEFAULT_SUPPORTED_EXTENSIONS).toHaveLength(194);
    expect(DEFAULT_SUPPORTED_EXTENSIONS).toContain('pdf');
    expect(DEFAULT_SUPPORTED_EXTENSIONS).toContain('docx');
    expect(DEFAULT_SUPPORTED_EXTENSIONS).toContain('dwf');
    expect(DEFAULT_SUPPORTED_EXTENSIONS).toContain('zip');
    expect(DEFAULT_SUPPORTED_EXTENSIONS).toContain('typst');
  });

  it('normalizes file names, query strings and explicit type overrides', () => {
    expect(getExtension('/docs/report.PDF?token=1')).toBe('pdf');
    expect(normalizeSource({ url: '/example/PDF%20%E6%B2%89%E6%B5%B8.pdf?token=1' })).toMatchObject({
      kind: 'url',
      filename: 'PDF 沉浸.pdf',
      extension: 'pdf',
    });
    expect(normalizeSource({ url: 'https://example.com/a/b/合同.docx?download=1' })).toMatchObject({
      kind: 'url',
      filename: '合同.docx',
      extension: 'docx',
    });
    expect(normalizeSource({ buffer: new ArrayBuffer(8), filename: 'raw.bin', type: '.ofd' })).toMatchObject({
      kind: 'buffer',
      filename: 'raw.bin',
      extension: 'ofd',
      size: 8,
    });
  });

  it('wraps browser file inputs and reads ArrayBuffer data in core', async () => {
    const file = wrapFileViewerFileRef(new Blob(['hello'], { type: 'text/plain' }), '/tmp/%E6%96%87%E6%A1%A3.txt?download=1');
    expect(file.name).toBe('文档.txt');
    expect(file.type).toBe('text/plain');
    expect(await readFileViewerBuffer(file)).toEqual(new TextEncoder().encode('hello').buffer);

    const rawFile = wrapFileViewerFileRef(new Uint8Array([1, 2, 3]).buffer, 'raw.bin');
    expect(rawFile.name).toBe('raw.bin');
    expect(await readFileViewerBuffer(rawFile)).toEqual(new Uint8Array([1, 2, 3]).buffer);
  });

  it('resolves renderers by extension and rejects duplicate extension ownership', () => {
    const registry = createRendererRegistry();

    expect(registry.getByExtension('.PDF')?.id).toBe('pdf');
    expect(registry.getByExtension('dwfx')?.id).toBe('cad');
    expect(registry.getByExtension('zip')?.id).toBe('archive');

    expect(() => {
      registry.register({
        id: 'duplicate-pdf',
        label: 'Duplicate PDF',
        category: 'document',
        extensions: ['pdf'],
      });
    }).toThrow(/already registered/);
  });

  it('runs a minimal framework-neutral load and unload lifecycle', async () => {
    const events: string[] = [];
    const renderer: RendererDefinition = {
      id: 'fixture',
      label: 'Fixture',
      category: 'document',
      extensions: ['fixture'],
      capabilities: { download: true, print: true, exportHtml: true, zoom: true, search: true },
      load: async ({ surface, source }) => {
        surface.container.dataset.loaded = source.filename;
        return {
          destroy: () => {
            surface.container.dataset.destroyed = 'true';
          },
          getAvailability: () => ({
            zoomIn: true,
            zoomOut: true,
            zoomReset: true,
          }),
        };
      },
    };

    const registry = createRendererRegistry([
      ...DEFAULT_RENDERER_DEFINITIONS,
      renderer,
    ]);
    const { document } = parseHTML('<main id="viewer"></main>');
    const container = document.getElementById('viewer') as HTMLElement;
    const viewer = createViewer(container, {
      registry,
      options: {
        hooks: {
          onLoadStart: context => events.push(`${context.phase}:${context.type}`),
          onLoadComplete: context => events.push(`${context.phase}:${context.filename}`),
          onUnloadStart: context => events.push(`${context.phase}:${context.reason}`),
          onUnloadComplete: context => events.push(`${context.phase}:${context.reason}`),
        },
      },
    });

    await viewer.load({ buffer: new ArrayBuffer(1), filename: 'demo.fixture' });

    expect(container.dataset.loaded).toBe('demo.fixture');
    expect(viewer.getCapabilities()).toMatchObject({
      download: true,
      print: true,
      exportHtml: true,
      zoom: true,
      zoomIn: true,
      zoomOut: true,
      zoomReset: true,
    });

    await viewer.destroy();

    expect(container.dataset.destroyed).toBe('true');
    expect(events).toEqual([
      'load-start:fixture',
      'load-complete:demo.fixture',
      'unload-start:component-unmount',
      'unload-complete:component-unmount',
    ]);
  });

  it('exposes framework-neutral viewer interaction APIs', async () => {
    const { document } = parseHTML('<main id="viewer"></main>');
    const container = document.getElementById('viewer') as HTMLElement;
    const beforeOperations: string[] = [];
    let scale = 1;
    let scrolledToLine = 0;

    Object.defineProperty(container, 'clientHeight', { configurable: true, value: 120 });
    Object.defineProperty(container, 'scrollHeight', { configurable: true, value: 520 });
    Object.defineProperty(container, 'clientWidth', { configurable: true, value: 320 });
    Object.defineProperty(container, 'scrollWidth', { configurable: true, value: 320 });
    Object.defineProperty(container, 'scrollTop', { configurable: true, writable: true, value: 0 });
    Object.defineProperty(container, 'scrollLeft', { configurable: true, writable: true, value: 0 });
    container.scrollTo = (options?: ScrollToOptions | number, y?: number) => {
      if (typeof options === 'number') {
        container.scrollLeft = options;
        container.scrollTop = y || 0;
        return;
      }
      container.scrollTop = Number(options?.top || 0);
      container.scrollLeft = Number(options?.left || 0);
    };
    setRect(container, { top: 0, left: 0, width: 320, height: 120 });

    const renderer: RendererDefinition = {
      id: 'core-api-fixture',
      label: 'Core API Fixture',
      category: 'document',
      extensions: ['coreapi'],
      capabilities: { download: true, zoom: 'provider', search: true },
      load: async ({ surface }) => {
        surface.container.innerHTML = `
          <section id="zoom-host" data-viewer-zoom-provider="fixture">
            <article>
              <h1>Alpha PDF heading</h1>
              <p>Beta pdf line with enough content for text chunks.</p>
            </article>
          </section>
        `;

        const zoomHost = surface.container.querySelector('#zoom-host') as HTMLElement;
        const heading = surface.container.querySelector('h1') as HTMLElement;
        const paragraph = surface.container.querySelector('p') as HTMLElement;
        const getState = () => createFileViewerZoomState({
          scale,
          canZoomIn: scale < 2,
          canZoomOut: scale > 0.5,
          canReset: scale !== 1,
        });
        const zoomProvider: FileViewerZoomProvider = {
          zoomIn: () => {
            scale = 1.25;
            return getState();
          },
          zoomOut: () => {
            scale = 0.75;
            return getState();
          },
          resetZoom: () => {
            scale = 1;
            return getState();
          },
          getState,
        };

        registerFileViewerZoomProvider(zoomHost, zoomProvider);
        setRect(zoomHost, { top: 0, left: 0, width: 320, height: 160 });
        setRect(heading, { top: 12, left: 16, width: 260, height: 32 });
        setRect(paragraph, { top: 68, left: 16, width: 280, height: 24 });
        heading.scrollIntoView = () => {
          scrolledToLine = 1;
        };
        paragraph.scrollIntoView = () => {
          scrolledToLine = 2;
        };

        return {
          destroy: () => {
            unregisterFileViewerZoomProvider(zoomHost);
          },
          getAvailability: () => ({
            zoomIn: true,
            zoomOut: true,
            zoomReset: true,
          }),
        };
      },
    };
    const registry = createRendererRegistry([
      ...DEFAULT_RENDERER_DEFINITIONS,
      renderer,
    ]);
    const viewer = createViewer(container, {
      registry,
      options: {
        search: { maxMatches: 10 },
        ai: { chunkSize: 200 },
        beforeOperation: context => {
          beforeOperations.push(context.operation);
          return context.operation !== 'zoom-out';
        },
      },
    });

    await viewer.load({ buffer: new ArrayBuffer(4), filename: 'demo.coreapi' });

    await expect(viewer.zoomIn()).resolves.toMatchObject({ scale: 1.25, label: '125%' });
    await expect(viewer.zoomOut()).resolves.toMatchObject({ scale: 1.25 });
    expect(beforeOperations).toEqual(['zoom-in', 'zoom-out']);
    expect(viewer.getZoomState()).toMatchObject({ scale: 1.25, canReset: true });

    await expect(viewer.search('pdf')).resolves.toMatchObject({ query: 'pdf', total: 2, currentIndex: 0 });
    await expect(viewer.nextSearchResult()).resolves.toMatchObject({ currentIndex: 1 });
    expect(viewer.getSearchState().matches.map(match => match.text)).toEqual(['PDF', 'pdf']);

    const anchors = await viewer.collectDocumentAnchors();
    expect(anchors.map(anchor => anchor.label)).toEqual([
      'Alpha PDF heading',
      'Beta pdf line with enough content for text chunks.',
    ]);
    expect(viewer.getCurrentDocumentAnchor()?.line).toBe(1);
    await expect(viewer.scrollToLine(2)).resolves.toBe(true);
    expect(scrolledToLine).toBe(2);
    expect(viewer.getDocumentTextChunks()).toHaveLength(2);

    await viewer.destroy();
  });

  it('exposes framework-neutral viewer file operations', async () => {
    const { document } = parseHTML('<html><body><main id="viewer"></main></body></html>');
    const container = document.getElementById('viewer') as HTMLElement;
    const beforeOperations: string[] = [];
    let downloadedName = '';
    let revokedUrl = '';
    let printed = false;
    let printHtml = '';

    const originalDocument = globalThis.document;
    const originalWindow = globalThis.window;
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    const originalCreateElement = document.createElement.bind(document);

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
        setTimeout: (callback: () => void) => {
          callback();
          return 1;
        },
      },
    });
    URL.createObjectURL = () => 'blob:viewer-test';
    URL.revokeObjectURL = url => {
      revokedUrl = url;
    };

    try {
      const renderer: RendererDefinition = {
        id: 'core-file-operation-fixture',
        label: 'Core File Operation Fixture',
        category: 'document',
        extensions: ['coreops'],
        capabilities: { download: true, print: 'adapter', exportHtml: 'adapter' },
        load: async ({ surface, registerExportAdapter }) => {
          surface.container.innerHTML = '<article><h1>Rendered preview</h1></article>';
          registerExportAdapter?.({
            exportHtml: true,
            print: true,
            includeDocumentStyles: false,
            printStyle: '@page { size: A4; }',
            toHtml: options => `<section data-mode="${options.mode}">Adapter ${options.title}</section>`,
          });
          return {};
        },
      };
      const viewer = createViewer(container, {
        registry: createRendererRegistry([
          ...DEFAULT_RENDERER_DEFINITIONS,
          renderer,
        ]),
        options: {
          watermark: { text: 'Confidential' },
          beforeOperation: context => {
            beforeOperations.push(context.operation);
          },
        },
      });

      await viewer.load({ buffer: new Uint8Array([1, 2, 3]).buffer, filename: 'demo.coreops' });

      const html = await viewer.exportHtml({ download: false });
      expect(html).toContain('data-mode="export"');
      expect(html).toContain('Adapter demo.coreops');
      expect(html).toContain('viewer-export-watermark');
      expect(html).toContain('Confidential');

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

      await viewer.print({ printWindow });
      expect(printed).toBe(true);
      expect(printHtml).toContain('data-mode="print"');
      expect(printHtml).toContain('@page { size: A4; }');

      await viewer.download();
      expect(downloadedName).toBe('demo.coreops');
      expect(revokedUrl).toBe('blob:viewer-test');
      expect(beforeOperations).toEqual(['export-html', 'print', 'download']);
    } finally {
      document.createElement = originalCreateElement as Document['createElement'];
      URL.createObjectURL = originalCreateObjectUrl;
      URL.revokeObjectURL = originalRevokeObjectUrl;
      Object.defineProperty(globalThis, 'document', { configurable: true, value: originalDocument });
      Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
    }
  });
});
