import { describe, expect, it, vi } from 'vitest'
import {
  buildFileViewerFrameSrc,
  createFileViewerFrameFilePostController,
  getFileViewerFrameOrigin,
  getFileViewerFrameSourceFilename,
  getFileViewerFrameUrl,
  postFileToFileViewerFrame,
  toFileViewerFrameMessageBlob
} from '../packages/core/src'

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
})
