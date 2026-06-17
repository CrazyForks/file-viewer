import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseHTML } from 'linkedom'
import { ref } from 'vue'
import { useViewerRenderSurface } from '../src/package/components/FileViewer/hooks/useViewerRenderSurface'
import type { FileRenderExportAdapter } from '../src/package/common/type'

const renderSessionMock = vi.hoisted(() => vi.fn())

vi.mock('../src/package/components/FileViewer/util', () => ({
  renderSession: renderSessionMock
}))

describe('Vue FileViewer render surface hook', () => {
  afterEach(() => {
    renderSessionMock.mockReset()
    vi.unstubAllGlobals()
  })

  const installDom = () => {
    const { document, window } = parseHTML('<div id="root"><span class="old">old</span></div>')
    vi.stubGlobal('window', window)
    vi.stubGlobal('document', document)
    return document.getElementById('root') as HTMLDivElement
  }

  it('mounts rendered content, wires export adapters and clears old DOM through one surface facade', async () => {
    const root = installDom()
    const output = ref<HTMLDivElement | null>(root)
    const session = { destroy: vi.fn() }
    const adapter: FileRenderExportAdapter = { exportHtml: true }
    const refreshDocumentIndex = vi.fn()
    const refreshZoomProvider = vi.fn()
    const stopZoomObserver = vi.fn()
    const clearZoomProvider = vi.fn()
    const clearDocumentState = vi.fn()

    renderSessionMock.mockImplementation(async (_buffer, _type, target, context) => {
      context.registerExportAdapter(adapter)
      context.onProgressiveRender()
      target.appendChild(document.createElement('strong'))
      return session
    })

    const surface = useViewerRenderSurface({
      output,
      getOptions: () => ({ theme: 'light' }),
      isCurrentRequest: version => version === 1,
      notifyActiveUnloadStart: vi.fn(() => null),
      notifyActiveUnloadComplete: vi.fn(),
      clearActiveDocumentContext: vi.fn(),
      clearDocumentState,
      refreshDocumentIndex,
      startZoomObserver: vi.fn(),
      stopZoomObserver,
      clearZoomProvider,
      refreshZoomProvider
    })

    const renderedSession = await surface.mountRenderedContent(
      new ArrayBuffer(4),
      new File(['demo'], 'demo.pdf'),
      1,
      '/example/demo.pdf'
    )

    expect(renderedSession).toBe(session)
    expect(renderSessionMock).toHaveBeenCalledWith(
      expect.any(ArrayBuffer),
      'pdf',
      expect.objectContaining({ className: 'file-render' }),
      expect.objectContaining({
        filename: 'demo.pdf',
        url: '/example/demo.pdf',
        options: { theme: 'light' }
      })
    )
    expect(root.innerHTML).not.toContain('old')
    expect(root.innerHTML).toContain('file-render')
    expect(root.innerHTML).toContain('strong')
    expect(surface.activeExportAdapter.value).toBe(adapter)
    expect(surface.progressiveReady.value).toBe(true)
    expect(refreshDocumentIndex).toHaveBeenCalledTimes(1)
    expect(refreshZoomProvider).toHaveBeenCalledTimes(1)

    surface.renderedReady.value = true
    surface.setActiveRenderSession(session)
    surface.clearRenderedContent('replace')

    expect(session.destroy).toHaveBeenCalledTimes(1)
    expect(surface.activeExportAdapter.value).toBeNull()
    expect(surface.renderedReady.value).toBe(false)
    expect(surface.progressiveReady.value).toBe(false)
    expect(clearDocumentState).toHaveBeenCalled()
    expect(stopZoomObserver).toHaveBeenCalled()
    expect(clearZoomProvider).toHaveBeenCalled()
    expect(root.childElementCount).toBe(0)
  })

  it('disposes stale render sessions and removes stale DOM before returning', async () => {
    const root = installDom()
    const output = ref<HTMLDivElement | null>(root)
    const session = { destroy: vi.fn() }
    let currentVersion = 1

    renderSessionMock.mockImplementation(async () => {
      currentVersion = 2
      return session
    })

    const surface = useViewerRenderSurface({
      output,
      getOptions: () => undefined,
      isCurrentRequest: version => version === currentVersion,
      notifyActiveUnloadStart: vi.fn(() => null),
      notifyActiveUnloadComplete: vi.fn(),
      clearActiveDocumentContext: vi.fn(),
      clearDocumentState: vi.fn(),
      refreshDocumentIndex: vi.fn(),
      startZoomObserver: vi.fn(),
      stopZoomObserver: vi.fn(),
      clearZoomProvider: vi.fn(),
      refreshZoomProvider: vi.fn()
    })

    await expect(surface.mountRenderedContent(
      new ArrayBuffer(4),
      new File(['demo'], 'demo.pdf'),
      1
    )).resolves.toBeUndefined()

    expect(session.destroy).toHaveBeenCalledTimes(1)
    expect(root.innerHTML).not.toContain('file-render')
  })
})
