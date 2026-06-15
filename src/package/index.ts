import styleHref from './style.css?url'
import FileViewer from './components/FileViewer'
import type { App, Component } from 'vue'

/**
 * Flyfish Viewer Vue3 包入口。
 *
 * - Vue3 项目安装 `@flyfish-group/file-viewer3`
 * - Vue2.7 项目安装 `@flyfish-group/file-viewer`
 *
 * 两个包都会注册同名 `<file-viewer>` 组件，并保持 `url` / `file`
 * 这两条输入路径的一致行为。
 */
const components: [[string, Component]] = [
  ['file-viewer', FileViewer]
]

declare interface FileViewerInstaller {

  /**
   * 全局注册 `<file-viewer>` 组件。
   */
  install(app: App): void;
}

/**
 * Vue3 插件安装器。
 *
 * 这里顺手引入库级样式，确保宿主项目只要 `app.use(FileViewer)`，
 * 就能拿到组件渲染所需的基础样式。
 */
class Installer implements FileViewerInstaller {

  private installed: boolean = false

  public install(app: App): void {
    if (this.installed) return
    components.forEach(([name, component]) => app.component(name, component))
    this.installed = true
  }
}

function ensureLibraryStyles(): void {
  if (typeof document === 'undefined') return
  if (document.querySelector('link[data-file-viewer-style="true"]')) return

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = styleHref
  link.dataset.fileViewerStyle = 'true'
  document.head.appendChild(link)
}

ensureLibraryStyles()

export default new Installer()

export {
  FileViewer
}

export type {
  FileRef,
  FileRenderExportAdapter,
  FileRenderExportMode,
  FileRenderExportOptions,
  FileViewerAiOptions,
  FileViewerArchiveOptions,
  FileViewerBeforeOperation,
  FileViewerDocumentAnchor,
  FileViewerDocumentChunk,
  FileViewerLifecycleContext,
  FileViewerLifecycleHooks,
  FileViewerLifecyclePhase,
  FileViewerOperationAvailability,
  FileViewerOperationContext,
  FileViewerOperationType,
  FileViewerOptions,
  FileViewerPdfOptions,
  FileViewerSearchMatch,
  FileViewerSearchOptions,
  FileViewerSearchState,
  FileViewerSourceType,
  FileViewerToolbarOptions,
  FileViewerToolbarPosition,
  FileViewerThemeMode,
  FileViewerTypstOptions,
  FileViewerWatermarkOptions,
  FileViewerZoomProvider,
  FileViewerZoomState
} from './common/type'
