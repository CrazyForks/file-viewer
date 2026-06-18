import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FILE_VIEWER_STATE_THEME,
  DEFAULT_FILE_VIEWER_UNSUPPORTED_DESCRIPTION,
  FILE_VIEWER_PREVIEW_MESSAGES,
  applyFileViewerLoadingRuntimeState,
  createFileViewerLoadingController,
  createFileViewerEmptyState,
  createFileViewerErrorState,
  createFileViewerLoadingRuntimeState,
  createFileViewerLoadingState,
  createFileViewerReadyState,
  createFileViewerUnsupportedState,
  formatFileViewerErrorMessage,
  normalizeFileViewerErrorMessage,
  resolveFileViewerLoadingTheme,
  runFileViewerLoadingControllerAction,
  syncFileViewerLoadingControllerState
} from '../packages/core/src'

describe('@file-viewer/core render state helpers', () => {
  it('keeps preview process messages framework-neutral', () => {
    expect(FILE_VIEWER_PREVIEW_MESSAGES).toEqual({
      downloading: '正在下载文件资源...',
      streamingPdf: '正在建立 PDF 流式预览...',
      reading: '正在解析文件内容...'
    })
  })

  it('creates loading and ready descriptors with stable theme semantics', () => {
    expect(createFileViewerLoadingState('PDF', FILE_VIEWER_PREVIEW_MESSAGES.streamingPdf)).toMatchObject({
      state: 'loading',
      extension: 'pdf',
      title: DEFAULT_FILE_VIEWER_STATE_THEME.label,
      message: FILE_VIEWER_PREVIEW_MESSAGES.streamingPdf,
      description: DEFAULT_FILE_VIEWER_STATE_THEME.hint,
      recoverable: false
    })

    expect(createFileViewerReadyState('.Docx')).toMatchObject({
      state: 'ready',
      extension: 'docx',
      title: '预览完成',
      recoverable: false
    })
  })

  it('creates empty and unsupported descriptors for wrapper fallback UI', () => {
    expect(createFileViewerEmptyState()).toMatchObject({
      state: 'empty',
      extension: '',
      title: '暂无文件',
      recoverable: true
    })

    expect(createFileViewerUnsupportedState('foo')).toMatchObject({
      state: 'unsupported',
      extension: 'foo',
      title: '暂不支持在线预览',
      message: '不支持.foo格式的在线预览，请下载后预览或转换为支持的格式。',
      description: DEFAULT_FILE_VIEWER_UNSUPPORTED_DESCRIPTION,
      recoverable: true
    })
  })

  it('normalizes error messages and descriptors consistently', () => {
    expect(normalizeFileViewerErrorMessage(new Error('boom'))).toBe('boom')
    expect(formatFileViewerErrorMessage('打印失败', new Error('窗口被拦截'))).toBe('打印失败：窗口被拦截')
    expect(createFileViewerErrorState('pdf', new Error('加载失败'))).toMatchObject({
      state: 'error',
      extension: 'pdf',
      title: '预览失败',
      message: '加载失败',
      recoverable: true
    })
  })

  it('keeps loading runtime state and themes framework-neutral', () => {
    expect(resolveFileViewerLoadingTheme('DOCX')).toMatchObject({
      badge: 'W',
      label: 'Word 文档',
      accent: '#2b78f6'
    })
    expect(resolveFileViewerLoadingTheme('unknown')).toEqual(DEFAULT_FILE_VIEWER_STATE_THEME)

    expect(createFileViewerLoadingRuntimeState('pdf')).toMatchObject({
      loading: false,
      error: '',
      message: '',
      theme: {
        badge: 'PDF',
        label: 'PDF 文档'
      },
      styleVars: {
        '--viewer-accent': '#e5534b',
        '--viewer-soft': 'rgba(229, 83, 75, 0.12)'
      }
    })

    const controller = createFileViewerLoadingController('docx')
    expect(controller.startLoading(FILE_VIEWER_PREVIEW_MESSAGES.reading)).toMatchObject({
      loading: true,
      message: FILE_VIEWER_PREVIEW_MESSAGES.reading,
      error: ''
    })
    expect(controller.showError('加载失败')).toMatchObject({
      loading: false,
      message: '',
      error: '加载失败'
    })
    expect(controller.setExtension('xlsx')).toMatchObject({
      theme: {
        badge: 'X',
        label: 'Excel 表格'
      },
      styleVars: {
        '--viewer-accent': '#21a366'
      }
    })
    expect(controller.resetLoading()).toMatchObject({
      loading: false,
      message: '',
      error: ''
    })

    const source = controller.startLoading('再次加载')
    const target = createFileViewerLoadingRuntimeState('pdf')
    expect(syncFileViewerLoadingControllerState(target, controller)).toBe(target)
    expect(target).toMatchObject({
      loading: true,
      message: '再次加载',
      theme: {
        badge: 'X',
        label: 'Excel 表格'
      }
    })

    const nextTarget = createFileViewerLoadingRuntimeState('pdf')
    expect(runFileViewerLoadingControllerAction(nextTarget, () => source)).toBe(nextTarget)
    expect(nextTarget).toMatchObject({
      loading: true,
      message: '再次加载',
      theme: {
        badge: 'X',
        label: 'Excel 表格'
      }
    })

    expect(applyFileViewerLoadingRuntimeState(target, source)).toBe(target)
    expect(target).toMatchObject({
      loading: true,
      message: '再次加载',
      theme: {
        badge: 'X',
        label: 'Excel 表格'
      }
    })
    expect(target.theme).not.toBe(source.theme)
    expect(target.styleVars).not.toBe(source.styleVars)
  })
})
