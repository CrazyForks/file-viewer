import { describe, expect, it, vi } from 'vitest'
import {
  buildExportHtmlDocument,
  buildFileViewerRenderedHtmlDocument,
  buildPrintPageStyle,
  formatCssPixels,
  resolveFileViewerPrintStyle,
  waitForFileViewerNextPaint,
} from '../packages/core/src'

describe('print layout helpers', () => {
  it('builds a fixed-size print page from CSS pixels', () => {
    const css = buildPrintPageStyle({
      selector: '.viewer-export-content .pdf-export-page',
      width: 816,
      height: 1056
    })

    expect(formatCssPixels(816)).toBe('816px')
    expect(css).toContain('@page { size: 8.5in 11in; margin: 0; }')
    expect(css).toContain('.viewer-export-content .pdf-export-page')
    expect(css).toContain('width: 816px!important')
    expect(css).toContain('height:1056px!important')
    expect(css).toContain('overflow:hidden!important')
  })

  it('can keep converted Word pages flowing when content exceeds one page', () => {
    const css = buildPrintPageStyle({
      selector: '.viewer-export-content .msdoc-page',
      width: 794,
      height: 1123,
      heightMode: 'min'
    })

    expect(css).toContain('height:auto!important')
    expect(css).toContain('min-height:1123px!important')
    expect(css).toContain('overflow:visible!important')
  })

  it('keeps exported print markup isolated from the viewer shell', () => {
    const html = buildExportHtmlDocument({
      contentHtml: '<section class="pdf-export-page">page</section>',
      includeDocumentStyles: false,
      printStyle: '@page { size: 8.5in 11in; margin: 0; }',
      title: 'a<b>"demo".pdf',
      watermarkInlineStyle: 'opacity:0.1'
    })

    expect(html).toContain('<title>a&lt;b&gt;&quot;demo&quot;.pdf</title>')
    expect(html).toContain('<main class="viewer-export-shell">')
    expect(html).toContain('<div class="viewer-export-content"><section class="pdf-export-page">page</section></div>')
    expect(html).toContain('viewer-export-watermark')
    expect(html.trim()).toContain('<style data-viewer-print-style>@page { size: 8.5in 11in; margin: 0; }</style>')
  })

  it('builds rendered HTML through a core export adapter', async () => {
    const html = await buildFileViewerRenderedHtmlDocument({
      source: {} as HTMLElement,
      mode: 'print',
      title: 'adapter.docx',
      adapter: {
        includeDocumentStyles: false,
        printStyle: options => `/* ${options.mode}:${options.title} */`,
        toHtml: options => `<article data-mode="${options.mode}">${options.title}</article>`
      },
      watermarkInlineStyle: 'opacity:0.2'
    })

    await expect(resolveFileViewerPrintStyle(null, { mode: 'print', title: 'x' })).resolves.toBe('')
    expect(html).toContain('<article data-mode="print">adapter.docx</article>')
    expect(html).toContain('<style data-viewer-print-style>/* print:adapter.docx */</style>')
    expect(html).toContain('viewer-export-watermark')
  })

  it('falls back to a timer when requestAnimationFrame is unavailable', async () => {
    const schedule = vi.fn((callback: () => void) => {
      callback()
      return 1
    })

    await expect(waitForFileViewerNextPaint({
      setTimeout: schedule as unknown as Window['setTimeout']
    })).resolves.toBeUndefined()

    expect(schedule).toHaveBeenCalledTimes(1)
  })
})
