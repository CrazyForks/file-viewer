import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FILE_VIEWER_SOURCE_FILENAME,
  DEFAULT_FILE_VIEWER_STREAMING_PDF_FILENAME,
  applyFileViewerEmptyPreviewState,
  applyFileViewerPreviewSourceUrlState,
  applyFileViewerReadPreviewState,
  applyFileViewerPreviewRequestResetState,
  createFileViewerEmptyPreviewState,
  createFileViewerReadPreviewState,
  createFileViewerPreviewRequestResetState,
  createFileViewerStreamingPdfPlaceholderFile,
  createFileViewerRequestController,
  hasFileViewerPreviewSource,
  isFileViewerAbortError,
  normalizeFileViewerSourceUrl,
  normalizePdfStreamingMode,
  resolveFileViewerPreviewRequestReason,
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

  it('keeps preview source reset and refresh reason rules in core', () => {
    const file = new File(['demo'], 'demo.txt')

    expect(hasFileViewerPreviewSource({ file })).toBe(true)
    expect(hasFileViewerPreviewSource({ url: '/example/demo.pdf' })).toBe(true)
    expect(hasFileViewerPreviewSource()).toBe(false)
    expect(resolveFileViewerPreviewRequestReason({ file })).toBe('replace')
    expect(resolveFileViewerPreviewRequestReason({ url: '/example/demo.pdf' })).toBe('replace')
    expect(resolveFileViewerPreviewRequestReason()).toBe('reset')
    expect(normalizeFileViewerSourceUrl('/example/demo.pdf')).toBe('/example/demo.pdf')
    expect(normalizeFileViewerSourceUrl()).toBeNull()
    expect(createFileViewerEmptyPreviewState()).toEqual({
      filename: '',
      file: null,
      buffer: null,
      sourceUrl: null,
      renderedReady: false,
      progressiveReady: false
    })
    expect(createFileViewerPreviewRequestResetState()).toEqual({
      file: null,
      buffer: null,
      sourceUrl: null,
      progressiveReady: false
    })
  })

  it('applies preview reset state through framework-neutral mutable targets', () => {
    const requestTarget = {
      file: new File(['demo'], 'demo.txt'),
      buffer: new ArrayBuffer(4),
      sourceUrl: '/example/demo.txt',
      progressiveReady: true
    }

    expect(applyFileViewerPreviewRequestResetState(requestTarget)).toBe(requestTarget)
    expect(requestTarget).toEqual({
      file: null,
      buffer: null,
      sourceUrl: null,
      progressiveReady: false
    })

    const previewTarget = {
      filename: 'demo.txt',
      file: new File(['demo'], 'demo.txt'),
      buffer: new ArrayBuffer(4),
      sourceUrl: '/example/demo.txt',
      renderedReady: true,
      progressiveReady: true
    }

    expect(applyFileViewerEmptyPreviewState(previewTarget)).toBe(previewTarget)
    expect(previewTarget).toEqual({
      filename: '',
      file: null,
      buffer: null,
      sourceUrl: null,
      renderedReady: false,
      progressiveReady: false
    })
  })

  it('applies read source and stream URL state without framework-specific refs', () => {
    const file = new File(['demo'], '合同.docx')
    const buffer = new ArrayBuffer(4)
    const readState = createFileViewerReadPreviewState({
      file,
      buffer,
      sourceUrl: '/example/%E5%90%88%E5%90%8C.docx?download=1'
    })

    expect(readState).toEqual({
      filename: '合同.docx',
      file,
      buffer,
      sourceUrl: '/example/%E5%90%88%E5%90%8C.docx?download=1'
    })

    const target = {
      filename: '',
      file: null as File | null,
      buffer: null as ArrayBuffer | null,
      sourceUrl: null as string | null,
      renderedReady: false,
      progressiveReady: false
    }

    expect(applyFileViewerReadPreviewState(target, readState)).toBe(target)
    expect(target).toMatchObject(readState)

    expect(applyFileViewerPreviewSourceUrlState(target, '')).toBe(target)
    expect(target.sourceUrl).toBeNull()
    applyFileViewerPreviewSourceUrlState(target, '/example/pdf.pdf')
    expect(target.sourceUrl).toBe('/example/pdf.pdf')
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

  it('keeps source fallback filenames and streaming PDF placeholders in core', () => {
    expect(resolveFileViewerRemoteSourcePlan({
      pageHref,
      url: ''
    }).filename).toBe(DEFAULT_FILE_VIEWER_SOURCE_FILENAME)

    const fallbackPdf = createFileViewerStreamingPdfPlaceholderFile()
    expect(fallbackPdf.name).toBe(DEFAULT_FILE_VIEWER_STREAMING_PDF_FILENAME)
    expect(fallbackPdf.type).toBe('application/pdf')

    const namedPdf = createFileViewerStreamingPdfPlaceholderFile('/tmp/%E5%90%88%E5%90%8C.pdf?download=1')
    expect(namedPdf.name).toBe('合同.pdf')
    expect(namedPdf.type).toBe('application/pdf')
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
