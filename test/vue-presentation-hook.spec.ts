import { describe, expect, it } from 'vitest'
import { computed, ref } from 'vue'
import { useViewerErrorState, useViewerPresentation } from '../src/package/components/FileViewer/hooks/useViewerPresentation'
import { resolveFileViewerLoadingTheme } from '../packages/core/src'
import type { FileViewerOptions } from '../src/package/common/type'

describe('Vue FileViewer presentation hook', () => {
  it('derives filename, extension, theme and toolbar defaults through core rules', () => {
    const filename = ref('')
    const options = ref<FileViewerOptions | undefined>({
      theme: 'dark',
      toolbar: {
        download: false,
        position: 'bottom-right'
      }
    })
    const presentation = useViewerPresentation({
      filename,
      getFile: () => new File(['demo'], '合同.docx'),
      getUrl: () => '/example/%E6%8A%A5%E5%91%8A.pdf?token=1',
      getOptions: () => options.value
    })

    expect(presentation.displayFilename.value).toBe('合同.docx')
    expect(presentation.currentExtend.value).toBe('docx')
    expect(presentation.viewerTheme.value).toBe('dark')
    expect(presentation.normalizedToolbar.value).toMatchObject({
      download: false,
      print: true,
      exportHtml: true,
      zoom: true
    })

    filename.value = 'manual.PDF'
    expect(presentation.displayFilename.value).toBe('manual.PDF')
    expect(presentation.currentExtend.value).toBe('pdf')

    options.value = { theme: 'system' }
    expect(presentation.viewerTheme.value).toBe('system')
    expect(presentation.normalizedToolbar.value).toMatchObject({
      download: true,
      print: true,
      exportHtml: true,
      zoom: true
    })
    expect(presentation.formatErrorMessage('加载失败', new Error('网络异常'))).toBe('加载失败：网络异常')
  })

  it('builds error state with the active extension and loading theme', () => {
    const currentExtend = ref('pdf')
    const error = ref('解析失败')
    const loadingTheme = computed(() => resolveFileViewerLoadingTheme(currentExtend.value))
    const errorState = useViewerErrorState({
      currentExtend: computed(() => currentExtend.value),
      error: computed(() => error.value),
      loadingTheme
    })

    expect(errorState.value).toMatchObject({
      state: 'error',
      extension: 'pdf',
      title: '预览失败',
      message: '解析失败',
      recoverable: true
    })

    currentExtend.value = 'docx'
    error.value = '读取失败'
    expect(errorState.value).toMatchObject({
      extension: 'docx',
      message: '读取失败'
    })
  })
})
