import type { FileRenderExportAdapter } from './type'

const TEXT_EXTENSIONS = [
  'txt', 'json', 'js', 'mjs', 'cjs', 'css', 'java', 'py', 'html', 'htm', 'jsx', 'ts', 'tsx', 'xml', 'log',
  'vue', 'yaml', 'yml', 'ini', 'sh', 'bash', 'sql', 'go', 'rs', 'php', 'c', 'cpp', 'cc', 'h', 'hpp', 'cs', 'diff'
]

const IMAGE_EXTENSIONS = ['gif', 'jpg', 'jpeg', 'bmp', 'tiff', 'tif', 'png', 'svg', 'webp']

/**
 * 这些格式只有专属适配器准备好后才展示打印。
 *
 * 它们的在线预览常依赖分页引擎、虚拟渲染或 Worker 生命周期，直接克隆
 * DOM 很容易只得到当前页或当前视口。
 */
export const ADAPTER_PRINT_REQUIRED_EXTENSIONS = [
  'docx', 'docm', 'dotx', 'dotm', 'doc', 'dot', 'pdf', 'typ', 'typst'
]

/**
 * 这些格式的预览结果是完整 DOM / SVG / Canvas 截图，解除滚动容器裁切后
 * 可以稳定进入浏览器打印流程。
 */
export const DOM_PRINTABLE_EXTENSIONS = [
  'pptx', 'pptm', 'potx', 'potm', 'ppsx', 'ppsm', 'ofd', 'dxf', 'dwg', 'excalidraw', 'drawio', 'dio',
  'umd', 'md', 'markdown', 'olb', 'dra',
  ...TEXT_EXTENSIONS,
  ...IMAGE_EXTENSIONS
]

/**
 * 这些格式默认不展示打印按钮，避免导出半截内容。
 *
 * - 表格链路使用虚拟滚动，只渲染局部窗口；
 * - 压缩包/邮件包含嵌套预览，顶层不是单一可打印文档；
 * - EPUB 使用 iframe/连续分页；
 * - 3D、音视频是交互媒体。
 */
export const NON_PRINTABLE_EXTENSIONS = [
  'xlsx', 'xltx', 'xlsm', 'xlsb', 'xls', 'xlt', 'xltm', 'csv', 'ods', 'fods', 'numbers',
  'zip', 'zipx', '7z', 'rar', 'tar', 'gz', 'gzip', 'tgz', 'bz2', 'bzip2', 'tbz', 'tbz2',
  'xz', 'txz', 'lzma', 'zst', 'tzst', 'cab', 'ar', 'cpio', 'iso', 'xar', 'lha', 'lzh',
  'jar', 'war', 'ear', 'apk', 'cbz', 'cbr', 'eml', 'msg', 'epub', 'mp4',
  'mp3', 'mpeg', 'wav', 'ogg', 'oga', 'opus', 'm4a', 'aac', 'flac', 'weba',
  'gltf', 'glb', 'obj', 'stl', 'ply', 'fbx', 'dae', '3ds', '3mf', 'amf', 'usd', 'usda', 'usdc',
  'usdz', 'kmz', 'step', 'stp', 'iges', 'igs', 'ifc', '3dm', 'pcd', 'wrl', 'vrml', 'xyz', 'vtk', 'vtp'
]

export const normalizeFileExtension = (extension: string) => extension.trim().replace(/^\./, '').toLowerCase()

export const needsDedicatedPrintAdapter = (extension: string) => {
  return ADAPTER_PRINT_REQUIRED_EXTENSIONS.includes(normalizeFileExtension(extension))
}

export const isDomPrintableExtension = (extension: string) => {
  return DOM_PRINTABLE_EXTENSIONS.includes(normalizeFileExtension(extension))
}

export const isKnownNonPrintableExtension = (extension: string) => {
  return NON_PRINTABLE_EXTENSIONS.includes(normalizeFileExtension(extension))
}

export const resolvePrintAvailability = (
  extension: string,
  adapter: FileRenderExportAdapter | null,
  renderedReady: boolean
) => {
  if (!renderedReady) {
    return false
  }

  if (adapter) {
    if (adapter.print === false) {
      return false
    }
    if (adapter.toHtml) {
      return true
    }
  }

  if (needsDedicatedPrintAdapter(extension) || isKnownNonPrintableExtension(extension)) {
    return false
  }

  return isDomPrintableExtension(extension)
}
