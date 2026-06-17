import { computed, type ComputedRef, type Ref } from 'vue'
import {
  createFileViewerErrorState,
  formatFileViewerErrorMessage,
  getExtension,
  normalizeFilename,
  normalizeFileViewerToolbar,
  type FileViewerStateTheme
} from '@file-viewer/core'
import type {
  FileRef,
  FileViewerOptions
} from '@/package/common/type'

interface UseViewerPresentationOptions {
  filename: Ref<string>;
  getFile: () => FileRef | undefined;
  getUrl: () => string | undefined;
  getOptions: () => FileViewerOptions | undefined;
}

interface UseViewerErrorStateOptions {
  currentExtend: ComputedRef<string>;
  error: ComputedRef<string>;
  loadingTheme: ComputedRef<FileViewerStateTheme>;
}

/**
 * FileViewer 组件层的展示派生状态门面。
 *
 * 文件名、扩展名、主题和工具栏默认值仍由 core 规则决定；
 * 这里仅把 Vue props/ref 组合成模板和其他 hooks 需要的响应式状态。
 */
export const useViewerPresentation = ({
  filename,
  getFile,
  getUrl,
  getOptions
}: UseViewerPresentationOptions) => {
  const getSourceFilename = () => {
    if (filename.value) {
      return filename.value
    }

    const file = getFile()
    if (file instanceof File && file.name) {
      return normalizeFilename(file.name)
    }

    const url = getUrl()
    if (typeof url === 'string' && url) {
      return normalizeFilename(url)
    }

    return ''
  }

  const displayFilename = computed(() => getSourceFilename())
  const currentExtend = computed(() => getExtension(displayFilename.value))
  const normalizedToolbar = computed(() => normalizeFileViewerToolbar(getOptions()))
  const viewerTheme = computed(() => {
    const theme = getOptions()?.theme
    return theme === 'light' || theme === 'dark' ? theme : 'system'
  })

  return {
    displayFilename,
    currentExtend,
    normalizedToolbar,
    viewerTheme,
    formatErrorMessage: formatFileViewerErrorMessage
  }
}

export const useViewerErrorState = ({
  currentExtend,
  error,
  loadingTheme
}: UseViewerErrorStateOptions) => {
  return computed(() => createFileViewerErrorState(currentExtend.value, error.value, loadingTheme.value))
}
