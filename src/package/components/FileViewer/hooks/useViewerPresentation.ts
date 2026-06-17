import { computed, type ComputedRef, type Ref } from 'vue'
import {
  createFileViewerErrorState,
  formatFileViewerErrorMessage,
  getExtension,
  normalizeFileViewerTheme,
  normalizeFileViewerToolbar,
  resolveFileViewerSourceFilename,
  type FileViewerStateTheme
} from '@file-viewer/core'
import type {
  FileViewerFileRef as FileRef,
  FileViewerOptions
} from '@file-viewer/core'

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
  const displayFilename = computed(() => resolveFileViewerSourceFilename({
    filename: filename.value,
    file: getFile(),
    url: getUrl()
  }))
  const currentExtend = computed(() => getExtension(displayFilename.value))
  const normalizedToolbar = computed(() => normalizeFileViewerToolbar(getOptions()))
  const viewerTheme = computed(() => normalizeFileViewerTheme(getOptions()?.theme))

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
