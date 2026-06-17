import { afterEach, describe, expect, it, vi } from 'vitest'
import { useViewerLifecycle } from '../src/package/components/FileViewer/hooks/useViewerLifecycle'
import type {
  FileViewerLifecycleContext,
  FileViewerLifecyclePhase,
  FileViewerOperationContext,
  FileViewerOptions
} from '../src/package/common/type'

describe('Vue FileViewer lifecycle hook', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps lifecycle timing, unload events and operation guards aligned with core contracts', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(1240)

    const lifecycleEvents: Array<{ event: FileViewerLifecyclePhase; context: FileViewerLifecycleContext }> = []
    const operationEvents: Array<{ event: string; context: FileViewerOperationContext }> = []
    const options: FileViewerOptions = {
      beforeOperation: context => {
        operationEvents.push({ event: `guard:${context.operation}`, context })
        return false
      }
    }
    const lifecycle = useViewerLifecycle({
      getOptions: () => options,
      getFilename: () => 'demo.pdf',
      getBufferSize: () => 4096,
      getCurrentFile: () => null,
      getCurrentVersion: () => 3,
      getFallbackFile: () => undefined,
      getFallbackUrl: () => '/example/demo.pdf',
      emitLifecycle: (event, context) => {
        lifecycleEvents.push({ event, context })
      },
      emitOperationBefore: context => {
        operationEvents.push({ event: `before:${context.operation}`, context })
      },
      emitOperationCancel: context => {
        operationEvents.push({ event: `cancel:${context.operation}`, context })
      },
      handleLifecycleError: vi.fn(),
      handleOperationError: vi.fn()
    })

    lifecycle.markLoadStarted(3, 1000)
    const loadedContext = lifecycle.buildLifecycleContext({
      phase: 'load-complete',
      version: 3,
      source: 'url',
      sourceUrl: '/example/demo.pdf'
    })

    expect(loadedContext).toMatchObject({
      phase: 'load-complete',
      filename: 'demo.pdf',
      source: 'url',
      size: 4096,
      duration: 240
    })

    lifecycle.setActiveDocumentContext(loadedContext)
    await expect(lifecycle.runBeforeOperation('download')).resolves.toBe(false)
    expect(operationEvents.map(item => item.event)).toEqual([
      'before:download',
      'guard:download',
      'cancel:download'
    ])

    const unloadContext = lifecycle.notifyActiveUnloadStart('replace')
    lifecycle.clearActiveDocumentContext()
    lifecycle.notifyActiveUnloadComplete(unloadContext, 'replace')

    expect(lifecycleEvents.map(item => item.event)).toEqual([
      'unload-start',
      'unload-complete'
    ])
    expect(lifecycleEvents.every(item => item.context.reason === 'replace')).toBe(true)
  })
})
