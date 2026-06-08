import { describe, expect, it } from 'vitest'
import { VIEWER_FRAME_CACHE_KEY, buildViewerSrc } from '../packages/web/src/index'

describe('viewer iframe options', () => {
  it('serializes runtime options into the viewer URL', () => {
    const src = buildViewerSrc({
      viewerUrl: '/file-viewer/index.html',
      url: '/files/archive.zip',
      options: {
        toolbar: true,
        watermark: {
          text: '内部预览',
          opacity: 0.14
        },
        archive: {
          workerUrl: '/file-viewer/vendor/libarchive/worker-bundle.js',
          cache: true
        }
      }
    })

    const parsed = new URL(src, 'https://example.com')
    const options = JSON.parse(parsed.searchParams.get('options') || '{}')
    expect(parsed.searchParams.get('url')).toBe('/files/archive.zip')
    expect(options.watermark.text).toBe('内部预览')
    expect(options.archive.cache).toBe(true)
  })

  it('adds a package cache key for nested private viewer deployments', () => {
    const src = buildViewerSrc({
      viewerUrl: '/vendor/file-viewer/',
      url: '/example/word.docx'
    })

    const parsed = new URL(src, 'https://example.com')
    expect(parsed.pathname).toBe('/vendor/file-viewer/index.html')
    expect(parsed.searchParams.get('url')).toBe('/example/word.docx')
    expect(parsed.searchParams.get('__flyfish_viewer_version')).toBe(VIEWER_FRAME_CACHE_KEY)
  })

  it('allows consumers to disable the automatic viewer cache key', () => {
    const src = buildViewerSrc({
      viewerUrl: '/vendor/file-viewer/index.html',
      url: '/example/word.docx',
      cacheKey: false
    })

    const parsed = new URL(src, 'https://example.com')
    expect(parsed.searchParams.has('__flyfish_viewer_version')).toBe(false)
  })
})
