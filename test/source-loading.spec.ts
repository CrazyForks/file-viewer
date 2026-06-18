import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FILE_VIEWER_SOURCE_FILENAME,
  DEFAULT_FILE_VIEWER_STREAMING_PDF_FILENAME,
  FILE_VIEWER_PREVIEW_MESSAGES,
  applyFileViewerEmptyPreviewState,
  applyFileViewerPreviewFilenameState,
  applyFileViewerPreviewSourceUrlState,
  applyFileViewerReadPreviewState,
  applyFileViewerRenderReadinessState,
  applyFileViewerPreviewRequestResetState,
  commitFileViewerLoadStartState,
  commitFileViewerRenderCompleteState,
  createFileViewerEmptyPreviewState,
  createFileViewerLoadStartState,
  createFileViewerReadPreviewState,
  createFileViewerPreviewRequestResetState,
  createFileViewerRenderCompleteState,
  createFileViewerStreamingPdfPlaceholderFile,
  createFileViewerRequestController,
  hasFileViewerPreviewSource,
  isFileViewerAbortError,
  normalizeFileViewerSourceUrl,
  normalizePdfStreamingMode,
  resolveFileViewerFileRefSourcePlan,
  resolveFileViewerLoadStartMessage,
  resolveFileViewerPreviewRequestReason,
  resolveFileViewerRemoteSourcePlan,
  resolveFileViewerRuntimePageHref,
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

  it('plans FileRef sources and applies filenames in core', () => {
    const file = new File(['demo'], '合同.docx')
    const filePlan = resolveFileViewerFileRefSourcePlan({ source: file })

    expect(filePlan.file).toBe(file)
    expect(filePlan.filename).toBe('合同.docx')

    const blobPlan = resolveFileViewerFileRefSourcePlan({
      source: new Blob(['demo'], { type: 'text/plain' }),
      currentFilename: '/tmp/manual.txt?token=1'
    })

    expect(blobPlan.file.name).toBe('manual.txt')
    expect(blobPlan.filename).toBe('manual.txt')

    const target = { filename: 'old.bin' }
    expect(applyFileViewerPreviewFilenameState(target, '/example/%E5%90%88%E5%90%8C.pdf?download=1')).toBe(target)
    expect(target.filename).toBe('合同.pdf')
    applyFileViewerPreviewFilenameState(target, '', DEFAULT_FILE_VIEWER_SOURCE_FILENAME)
    expect(target.filename).toBe(DEFAULT_FILE_VIEWER_SOURCE_FILENAME)
  })

  it('applies render readiness state without framework-specific refs', () => {
    const target = {
      renderedReady: false,
      progressiveReady: false
    }

    expect(applyFileViewerRenderReadinessState(target, { renderedReady: true })).toBe(target)
    expect(target).toEqual({
      renderedReady: true,
      progressiveReady: false
    })

    applyFileViewerRenderReadinessState(target, {
      renderedReady: false,
      progressiveReady: true
    })
    expect(target).toEqual({
      renderedReady: false,
      progressiveReady: true
    })
  })

  it('creates load-start lifecycle state and default loading messages in core', () => {
    const file = new File(['demo'], '合同.docx')

    expect(resolveFileViewerLoadStartMessage('file')).toBe(FILE_VIEWER_PREVIEW_MESSAGES.reading)
    expect(resolveFileViewerLoadStartMessage('url')).toBe(FILE_VIEWER_PREVIEW_MESSAGES.downloading)

    expect(createFileViewerLoadStartState({
      version: 8,
      source: 'file',
      file,
      timestamp: 120
    })).toMatchObject({
      loadingMessage: FILE_VIEWER_PREVIEW_MESSAGES.reading,
      lifecycleContext: {
        phase: 'load-start',
        type: 'docx',
        filename: '合同.docx',
        source: 'file',
        size: file.size,
        version: 8,
        timestamp: 120
      }
    })

    expect(createFileViewerLoadStartState({
      version: 9,
      source: 'url',
      filename: 'stream.pdf',
      sourceUrl: '',
      loadingMessage: '自定义加载文案',
      timestamp: 140
    })).toMatchObject({
      loadingMessage: '自定义加载文案',
      lifecycleContext: {
        phase: 'load-start',
        type: 'pdf',
        filename: 'stream.pdf',
        source: 'url',
        url: undefined,
        version: 9,
        timestamp: 140
      }
    })
  })

  it('commits load-start state in the shared core order', () => {
    const events: string[] = []
    const filenameTarget = { filename: 'old.pdf' }
    const file = new File(['demo'], 'start.pdf')

    const loadStart = commitFileViewerLoadStartState({
      version: 11,
      filename: '/example/start.pdf?token=1',
      filenameTarget,
      buildState: () => {
        events.push('build')
        return createFileViewerLoadStartState({
          version: 11,
          source: 'file',
          file,
          timestamp: 200
        })
      },
      onMarkLoadStarted: version => {
        events.push(`mark:${version}:${filenameTarget.filename}`)
      },
      onLifecycle: context => {
        events.push(`lifecycle:${context.phase}:${context.filename}`)
      },
      onStartLoading: message => {
        events.push(`loading:${message}`)
      }
    })

    expect(events).toEqual([
      'mark:11:start.pdf',
      'build',
      'lifecycle:load-start:start.pdf',
      `loading:${FILE_VIEWER_PREVIEW_MESSAGES.reading}`
    ])
    expect(filenameTarget.filename).toBe('start.pdf')
    expect(loadStart.lifecycleContext).toMatchObject({
      phase: 'load-start',
      filename: 'start.pdf',
      source: 'file',
      version: 11
    })
  })

  it('creates render complete lifecycle state from preview source data', () => {
    const file = new File(['demo'], '合同.docx')
    const complete = createFileViewerRenderCompleteState({
      version: 9,
      source: 'file',
      file,
      bufferSize: 16,
      startedAt: 0,
      timestamp: 240
    })

    expect(complete.readiness).toEqual({
      renderedReady: true,
      progressiveReady: false
    })
    expect(complete.lifecycleContext).toMatchObject({
      phase: 'load-complete',
      type: 'docx',
      filename: '合同.docx',
      source: 'file',
      size: file.size,
      version: 9,
      timestamp: 240,
      duration: 240
    })

    expect(createFileViewerRenderCompleteState({
      version: 10,
      source: 'url',
      filename: 'stream.pdf',
      sourceUrl: '',
      bufferSize: 0,
      lifecycleState: {
        getLoadStartedAt: () => 100
      },
      timestamp: 125
    }).lifecycleContext).toMatchObject({
      filename: 'stream.pdf',
      source: 'url',
      url: undefined,
      size: 0,
      duration: 25
    })
  })

  it('commits render complete state in the shared core order', () => {
    const events: string[] = []
    const file = new File(['demo'], 'complete.pdf')
    const session = { id: 'session-1' }
    const readiness = {
      renderedReady: false,
      progressiveReady: true
    }

    const complete = commitFileViewerRenderCompleteState({
      version: 12,
      session,
      readinessTarget: readiness,
      buildState: () => {
        events.push('build')
        return createFileViewerRenderCompleteState({
          version: 12,
          source: 'file',
          file,
          bufferSize: 4,
          timestamp: 260
        })
      },
      onSession: nextSession => {
        events.push(nextSession === session ? 'session:set' : 'session:miss')
      },
      onActiveDocumentContext: context => {
        events.push(`active:${context.phase}:${context.filename}`)
      },
      onLifecycle: context => {
        events.push(`lifecycle:${context.phase}`)
      },
      onClearLoadStarted: version => {
        events.push(`clear:${version}`)
      }
    })

    expect(events).toEqual([
      'session:set',
      'build',
      'active:load-complete:complete.pdf',
      'lifecycle:load-complete',
      'clear:12'
    ])
    expect(readiness).toEqual({
      renderedReady: true,
      progressiveReady: false
    })
    expect(complete.lifecycleContext).toMatchObject({
      phase: 'load-complete',
      filename: 'complete.pdf',
      source: 'file',
      version: 12
    })
  })

  it('defaults PDF streaming to same-origin URLs', () => {
    expect(resolveFileViewerRuntimePageHref({ href: pageHref })).toBe(pageHref)
    expect(resolveFileViewerRuntimePageHref({ href: '' })).toBeUndefined()
    expect(resolveFileViewerRuntimePageHref(undefined)).toBeUndefined()
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
