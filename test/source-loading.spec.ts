import { describe, expect, it } from 'vitest'
import {
  createFileViewerRequestController,
  isFileViewerAbortError,
  normalizePdfStreamingMode,
  resolveFileViewerRemoteSourcePlan,
  resolveFileViewerSourceFilename,
  shouldStreamPdfUrl
} from '../packages/core/src'

const pageHref = 'https://viewer.flyfish.dev/app/index.html'

describe('remote source loading helpers', () => {
  it('resolves display filenames from explicit names, file refs and urls', () => {
    expect(resolveFileViewerSourceFilename({
      filename: '/tmp/manual.PDF?token=1',
      file: new File(['demo'], 'ignored.docx'),
      url: '/example/report.docx'
    })).toBe('manual.PDF')
    expect(resolveFileViewerSourceFilename({
      file: new File(['demo'], '合同.docx')
    })).toBe('合同.docx')
    expect(resolveFileViewerSourceFilename({
      url: '/example/%E6%8A%A5%E5%91%8A.pdf?token=1'
    })).toBe('报告.pdf')
    expect(resolveFileViewerSourceFilename({ fallback: '' })).toBe('')
  })

  it('tracks current load versions and aborts stale remote requests', () => {
    const controller = createFileViewerRequestController()
    const firstVersion = controller.createVersion()
    const abortController = controller.createAbortController()

    expect(controller.version).toBe(firstVersion)
    expect(controller.isCurrent(firstVersion)).toBe(true)
    expect(abortController?.signal.aborted).toBe(false)

    const secondVersion = controller.createVersion()

    expect(controller.version).toBe(secondVersion)
    expect(controller.isCurrent(firstVersion)).toBe(false)
    expect(controller.isCurrent(secondVersion)).toBe(true)
    expect(abortController?.signal.aborted).toBe(true)

    const nextAbortController = controller.createAbortController()
    controller.abort()
    expect(nextAbortController?.signal.aborted).toBe(true)
  })

  it('detects browser, fetch and axios cancellation errors without framework code', () => {
    expect(isFileViewerAbortError(new DOMException('aborted', 'AbortError'))).toBe(true)
    expect(isFileViewerAbortError({ name: 'CanceledError' })).toBe(true)
    expect(isFileViewerAbortError({ code: 'ERR_CANCELED' })).toBe(true)
    expect(isFileViewerAbortError({ __CANCEL__: true })).toBe(true)
    expect(isFileViewerAbortError(new Error('network failed'))).toBe(false)
  })

  it('defaults PDF streaming to same-origin URLs', () => {
    expect(normalizePdfStreamingMode(undefined)).toBe('same-origin')
    expect(shouldStreamPdfUrl({
      extension: 'pdf',
      pageHref,
      url: '/example/pdf.pdf'
    })).toBe(true)
  })

  it('builds a framework-neutral remote source loading plan', () => {
    expect(resolveFileViewerRemoteSourcePlan({
      pageHref,
      url: '/example/%E6%8A%A5%E5%91%8A.pdf?token=1'
    })).toEqual({
      url: '/example/%E6%8A%A5%E5%91%8A.pdf?token=1',
      filename: '报告.pdf',
      extension: 'pdf',
      streamPdf: true
    })

    expect(resolveFileViewerRemoteSourcePlan({
      pageHref,
      streaming: true,
      url: 'https://cdn.example.com/files/demo.DOCX?download=1'
    })).toMatchObject({
      filename: 'demo.DOCX',
      extension: 'docx',
      streamPdf: false
    })
  })

  it('keeps cross-origin PDF URLs on the compatible blob-download path by default', () => {
    expect(shouldStreamPdfUrl({
      extension: 'pdf',
      pageHref,
      url: 'https://cdn.example.com/example/pdf.pdf'
    })).toBe(false)
  })

  it('allows hosts to force or disable PDF URL streaming', () => {
    expect(shouldStreamPdfUrl({
      extension: 'PDF',
      pageHref,
      streaming: true,
      url: 'https://cdn.example.com/example/pdf.pdf'
    })).toBe(true)

    expect(shouldStreamPdfUrl({
      extension: 'pdf',
      pageHref,
      streaming: false,
      url: '/example/pdf.pdf'
    })).toBe(false)
  })

  it('never streams non-PDF files through the PDF path', () => {
    expect(shouldStreamPdfUrl({
      extension: 'docx',
      pageHref,
      streaming: true,
      url: '/example/word.docx'
    })).toBe(false)
  })
})
