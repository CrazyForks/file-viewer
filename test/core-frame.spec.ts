import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildFileViewerFrameSrc,
  createFileViewerDirectFrameController,
  createFileViewerFrame,
  createFileViewerFrameFilePostController,
  mountFileViewerFrame,
  getFileViewerFrameOrigin,
  getFileViewerFrameSourceFilename,
  getFileViewerFrameUrl,
  postFileToFileViewerFrame,
  syncFileViewerFrame,
  toFileViewerFrameMessageBlob
} from '../packages/core/src'

const installFrameDom = () => {
  const frameListeners = new Map<string, Set<(event?: unknown) => void>>()
  const windowListeners = new Map<string, Set<(event: MessageEvent) => void>>()
  const attributes = new Map<string, string>()
  const contentWindow = {
    postMessage: vi.fn()
  }
  const frame = {
    className: '',
    contentWindow,
    src: '',
    style: {},
    title: '',
    addEventListener: vi.fn((type: string, listener: (event?: unknown) => void) => {
      const listeners = frameListeners.get(type) || new Set()
      listeners.add(listener)
      frameListeners.set(type, listeners)
    }),
    dispatchFrameEvent(type: string) {
      frameListeners.get(type)?.forEach(listener => listener({ type }))
    },
    getAttribute: vi.fn((name: string) => attributes.get(name) || null),
    remove: vi.fn(),
    removeEventListener: vi.fn((type: string, listener: (event?: unknown) => void) => {
      frameListeners.get(type)?.delete(listener)
    }),
    setAttribute: vi.fn((name: string, value: string) => {
      attributes.set(name, value)
      if (name === 'src') {
        frame.src = value
      }
    })
  } as unknown as HTMLIFrameElement & {
    dispatchFrameEvent(type: string): void
    style: Record<string, string>
  }
  const container = {
    appendChild: vi.fn()
  } as unknown as HTMLElement
  const fakeWindow = {
    location: {
      href: 'https://host.example/app/',
      origin: 'https://host.example'
    },
    addEventListener: vi.fn((type: string, listener: (event: MessageEvent) => void) => {
      const listeners = windowListeners.get(type) || new Set()
      listeners.add(listener)
      windowListeners.set(type, listeners)
    }),
    dispatchMessage(data: unknown, source = contentWindow) {
      windowListeners.get('message')?.forEach(listener => listener({
        data,
        source
      } as MessageEvent))
    },
    removeEventListener: vi.fn((type: string, listener: (event: MessageEvent) => void) => {
      windowListeners.get(type)?.delete(listener)
    })
  }
  const fakeDocument = {
    createElement: vi.fn(() => frame)
  }

  vi.stubGlobal('window', fakeWindow)
  vi.stubGlobal('document', fakeDocument)

  return {
    container,
    contentWindow,
    fakeDocument,
    fakeWindow,
    frame
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('@file-viewer/core iframe frame helpers', () => {
  it('builds viewer iframe URLs with runtime options and cache keys', () => {
    const src = buildFileViewerFrameSrc({
      viewerUrl: '/vendor/file-viewer/',
      defaultCacheKey: '1.2.3',
      url: '/files/archive.zip',
      options: {
        theme: 'light',
        toolbar: {
          print: true,
          beforePrint: () => false
        },
        archive: {
          cache: true
        },
        beforeOperation: () => false
      } as any
    })

    const parsed = new URL(src, 'https://example.com')
    const options = JSON.parse(parsed.searchParams.get('options') || '{}')
    expect(parsed.pathname).toBe('/vendor/file-viewer/index.html')
    expect(parsed.searchParams.get('url')).toBe('/files/archive.zip')
    expect(parsed.searchParams.get('__flyfish_viewer_version')).toBe('1.2.3')
    expect(options).toEqual({
      theme: 'light',
      toolbar: {
        print: true
      },
      archive: {
        cache: true
      }
    })
  })

  it('prefers local file handoff over URL query parameters', () => {
    const file = new File(['demo'], '合同.docx')
    const src = buildFileViewerFrameSrc({
      viewerUrl: '/file-viewer/index.html',
      url: '/remote.pdf',
      file,
      from: 'https://host.example',
      defaultCacheKey: 'next'
    })

    const parsed = new URL(src, 'https://example.com')
    expect(parsed.searchParams.has('url')).toBe(false)
    expect(parsed.searchParams.get('name')).toBe('合同.docx')
    expect(parsed.searchParams.get('from')).toBe('https://host.example')
    expect(parsed.searchParams.get('__flyfish_viewer_version')).toBe('next')
  })

  it('keeps absolute viewer URLs absolute and allows disabling cache keys', () => {
    const src = buildFileViewerFrameSrc({
      viewerUrl: 'https://cdn.example.com/viewer/',
      url: '/demo.pdf',
      cacheKey: false
    })

    const parsed = new URL(src)
    expect(src.startsWith('https://cdn.example.com/viewer/index.html?')).toBe(true)
    expect(parsed.searchParams.get('url')).toBe('/demo.pdf')
    expect(parsed.searchParams.has('__flyfish_viewer_version')).toBe(false)
    expect(getFileViewerFrameOrigin('https://cdn.example.com/viewer/')).toBe('https://cdn.example.com')
  })

  it('normalizes viewer URLs and source filenames', () => {
    expect(getFileViewerFrameUrl('/file-viewer/')).toBe('/file-viewer/index.html')
    expect(getFileViewerFrameSourceFilename({
      name: 'manual.xlsx',
      url: '/ignored.pdf'
    })).toBe('manual.xlsx')
    expect(getFileViewerFrameSourceFilename({
      url: '/files/%E6%8A%A5%E5%91%8A.pdf?token=1'
    })).toBe('%E6%8A%A5%E5%91%8A.pdf')
  })

  it('prepares binary file messages and posts them to viewer frames', () => {
    const blob = new Blob(['hello'])
    expect(toFileViewerFrameMessageBlob(blob)).toBe(blob)
    expect(toFileViewerFrameMessageBlob(new Uint8Array([1, 2, 3]).buffer)).toBeInstanceOf(Blob)

    const postMessage = vi.fn()
    const frame = {
      contentWindow: {
        postMessage
      }
    } as unknown as HTMLIFrameElement

    expect(postFileToFileViewerFrame(frame, {
      file: blob,
      targetOrigin: 'https://viewer.example'
    })).toBe(true)
    expect(postMessage).toHaveBeenCalledWith(blob, 'https://viewer.example')
    expect(postFileToFileViewerFrame(undefined, { file: blob })).toBe(false)
    expect(postFileToFileViewerFrame(frame, {})).toBe(false)
  })

  it('retries local file posts until the viewer lifecycle is acknowledged', () => {
    const blob = new Blob(['hello'])
    const frame = {} as HTMLIFrameElement
    const postFile = vi.fn(() => true)
    const clearTimeout = vi.fn()
    const scheduledCallbacks: Array<() => void> = []
    const controller = createFileViewerFrameFilePostController({
      getFrame: () => frame,
      getOptions: () => ({ file: blob }),
      retryLimit: 3,
      retryInterval: 10,
      postFile,
      setTimeout: callback => {
        scheduledCallbacks.push(callback)
        return scheduledCallbacks.length
      },
      clearTimeout
    })

    controller.schedule()
    expect(postFile).toHaveBeenCalledTimes(1)
    expect(scheduledCallbacks).toHaveLength(1)

    scheduledCallbacks.shift()?.()
    expect(postFile).toHaveBeenCalledTimes(2)
    expect(scheduledCallbacks).toHaveLength(1)

    expect(controller.handleFrameEvent({
      type: 'flyfish-viewer:lifecycle',
      event: 'load-start',
      payload: null
    })).toBe(true)
    expect(clearTimeout).toHaveBeenCalled()

    scheduledCallbacks.shift()?.()
    expect(postFile).toHaveBeenCalledTimes(2)
  })

  it('does not schedule local file posts when no binary file is present', () => {
    const postFile = vi.fn(() => true)
    const setTimeout = vi.fn(() => 1)
    const controller = createFileViewerFrameFilePostController({
      getFrame: () => ({} as HTMLIFrameElement),
      getOptions: () => ({ url: '/demo.pdf' }),
      postFile,
      setTimeout
    })

    controller.schedule()
    expect(postFile).not.toHaveBeenCalled()
    expect(setTimeout).not.toHaveBeenCalled()
  })

  it('centralizes direct iframe lifecycle for framework wrappers', () => {
    const firstFile = new Blob(['first'])
    const secondFile = new Blob(['second'])
    const contentWindow = {
      postMessage: vi.fn()
    }
    const frame = {
      contentWindow,
      src: '/viewer/old.html'
    } as unknown as HTMLIFrameElement
    const onEvent = vi.fn()
    let options = {
      file: firstFile,
      targetOrigin: 'https://viewer.example'
    }
    let src = '/viewer/index.html?name=first.txt'

    const controller = createFileViewerDirectFrameController({
      getFrame: () => frame,
      getOptions: () => options,
      getSrc: () => src,
      getOnEvent: () => onEvent
    })

    expect(controller.ready).toBe(false)
    controller.syncOptions()
    expect(contentWindow.postMessage).not.toHaveBeenCalled()

    controller.handleLoad()
    expect(controller.ready).toBe(true)
    expect(contentWindow.postMessage).toHaveBeenCalledWith(firstFile, 'https://viewer.example')

    const lifecycleEvent = {
      data: {
        type: 'flyfish-viewer:lifecycle',
        event: 'load-start',
        payload: null
      },
      source: contentWindow
    } as unknown as MessageEvent
    expect(controller.handleMessage(lifecycleEvent)).toBe(true)
    expect(onEvent).toHaveBeenCalledWith(lifecycleEvent.data, lifecycleEvent)

    contentWindow.postMessage.mockClear()
    options = {
      file: secondFile,
      targetOrigin: 'https://viewer.example'
    }
    controller.syncOptions()
    expect(contentWindow.postMessage).toHaveBeenCalledWith(secondFile, 'https://viewer.example')

    controller.resetForSrcChange()
    expect(controller.ready).toBe(false)
    contentWindow.postMessage.mockClear()
    controller.syncOptions()
    expect(contentWindow.postMessage).not.toHaveBeenCalled()

    src = '/viewer/index.html?name=second.txt'
    controller.reload()
    expect(frame.src).toBe('/viewer/index.html?name=second.txt')
    expect(controller.handleMessage({
      data: lifecycleEvent.data,
      source: {}
    } as MessageEvent)).toBe(false)

    controller.destroy()
    expect(controller.ready).toBe(false)
  })

  it('creates, syncs and mounts iframe frames through the core DOM controller', () => {
    const { container, fakeDocument, fakeWindow, frame } = installFrameDom()
    const created = createFileViewerFrame({
      className: 'viewer-frame',
      defaultCacheKey: 'core',
      style: { height: '80vh' },
      url: '/demo.pdf'
    })

    expect(fakeDocument.createElement).toHaveBeenCalledWith('iframe')
    expect(created).toBe(frame)
    expect(frame.className).toBe('viewer-frame')
    expect(frame.title).toBe('Flyfish Viewer 文件预览')
    expect(frame.style.width).toBe('100%')
    expect(frame.style.height).toBe('80vh')
    expect(frame.getAttribute('src')).toContain('/file-viewer/index.html?')
    expect(frame.getAttribute('src')).toContain('url=%2Fdemo.pdf')
    expect(frame.getAttribute('src')).toContain('__flyfish_viewer_version=core')

    const nextSrc = syncFileViewerFrame(frame, {
      defaultCacheKey: 'core',
      url: '/next.pdf'
    })
    expect(nextSrc).toContain('url=%2Fnext.pdf')
    expect(frame.getAttribute('src')).toBe(nextSrc)

    const onEvent = vi.fn()
    const controller = mountFileViewerFrame(container, {
      defaultCacheKey: 'core',
      onEvent,
      url: '/mounted.pdf'
    })
    expect(container.appendChild).toHaveBeenCalledWith(frame)
    expect(controller.src).toContain('url=%2Fmounted.pdf')

    fakeWindow.dispatchMessage({
      type: 'flyfish-viewer:lifecycle',
      event: 'load-start',
      payload: null
    })
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: 'load-start',
      type: 'flyfish-viewer:lifecycle'
    }), expect.any(Object))

    expect(controller.update({ url: '/updated.pdf' })).toContain('url=%2Fupdated.pdf')
    controller.destroy()
    expect(frame.remove).toHaveBeenCalled()
    expect(fakeWindow.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function))
  })
})
