import type { AppWrapper, FileRenderContext, Rendered } from '@/package/common/type'
import { ARCHIVE_EXTENSIONS } from './archive/shared'
import { MODEL_EXTENSIONS } from './model/shared'
import { withWpsCompatibilityFallback } from './officeCompat'

const DOCX_COMPAT_EXTENSIONS = ['docx', 'docm', 'dotx', 'dotm']
const DOC_COMPAT_EXTENSIONS = ['doc', 'dot', 'wps', 'wpt']
const PRESENTATION_EXTENSIONS = ['pptx', 'pptm', 'potx', 'potm', 'ppsx', 'ppsm', 'dps', 'dpt']
const SPREADSHEET_EXTENSIONS = [
  'xlsx', 'xltx', 'xlsm', 'xlsb', 'xls', 'xlt', 'xltm', 'csv', 'ods', 'fods', 'numbers', 'et', 'ett'
]
const IMAGE_EXTENSIONS = ['gif', 'jpg', 'jpeg', 'bmp', 'tiff', 'tif', 'png', 'svg', 'webp']
const DRAWING_EXTENSIONS = ['excalidraw', 'drawio', 'dio']
const AUDIO_EXTENSIONS = ['mp3', 'mpeg', 'wav', 'ogg', 'oga', 'opus', 'm4a', 'aac', 'flac', 'weba']
const TEXT_EXTENSIONS = [
  'txt', 'json', 'js', 'mjs', 'cjs', 'css', 'java', 'py', 'html', 'htm', 'jsx', 'ts', 'tsx', 'xml', 'log',
  'vue', 'yaml', 'yml', 'ini', 'sh', 'bash', 'sql', 'go', 'rs', 'php', 'c', 'cpp', 'cc', 'h', 'hpp', 'cs', 'diff'
]

const createWrapper = (el: HTMLDivElement): AppWrapper => ({
  $el: el,
  unmount() {
    // 非 Vue 渲染器没有额外销毁动作，保留统一的卸载接口。
  }
})

const renderUnsupported = async (target: HTMLDivElement, type: string): Promise<Rendered> => {
  target.innerHTML = `<div style="text-align:center;margin-top:80px">不支持.${type}格式的在线预览，请下载后预览或转换为支持的格式</div>
<div style="text-align:center">压缩包和邮件附件会复用主预览器的格式能力，当前附件类型暂未命中可预览链路。</div>`
  return createWrapper(target)
}

/**
 * 压缩包内文件和邮件附件的嵌套预览入口。
 *
 * 主预览器的 `util.ts` 会间接导入 `renders.ts`，而 `renders.ts` 又会注册
 * 压缩包与邮件渲染器；在生产构建里从内部组件再动态导入它容易落到应用
 * 主入口 chunk，导致导出被摇掉。这里用独立的按需分发表保持完整支持面，
 * 同时避免 ArchiveViewer / EmailViewer 与主渲染注册表形成循环依赖。
 */
export const renderNestedBuffer = async (
  buffer: ArrayBuffer,
  type: string,
  target: HTMLDivElement,
  context?: FileRenderContext
): Promise<Rendered> => {
  const normalizedType = type.toLowerCase()

  if (DOCX_COMPAT_EXTENSIONS.includes(normalizedType)) {
    const { renderDocx } = await import('./word')
    const rendered = await renderDocx(buffer, target)
    window.dispatchEvent(new Event('resize'))
    return rendered
  }

  if (DOC_COMPAT_EXTENSIONS.includes(normalizedType)) {
    const { renderDoc } = await import('./word')
    return withWpsCompatibilityFallback(normalizedType, target, () => renderDoc(buffer, target))
  }

  if (PRESENTATION_EXTENSIONS.includes(normalizedType)) {
    const { default: renderPptx } = await import('./pptx')
    return withWpsCompatibilityFallback(normalizedType, target, async () => {
      await renderPptx(buffer, target, normalizedType)
      window.dispatchEvent(new Event('resize'))
      return createWrapper(target)
    })
  }

  if (SPREADSHEET_EXTENSIONS.includes(normalizedType)) {
    const { default: renderXlsx } = await import('./xlsx')
    return withWpsCompatibilityFallback(normalizedType, target, () => renderXlsx(buffer, target))
  }

  if (normalizedType === 'pdf') {
    const { default: renderPdf } = await import('./pdf')
    return renderPdf(buffer, target)
  }

  if (normalizedType === 'ofd') {
    const { default: renderOfd } = await import('./ofd')
    return renderOfd(buffer, target)
  }

  if (ARCHIVE_EXTENSIONS.includes(normalizedType)) {
    const { default: renderArchive } = await import('./archive')
    return renderArchive(buffer, target, context)
  }

  if (normalizedType === 'eml' || normalizedType === 'msg') {
    const { default: renderEmail } = await import('./email')
    return renderEmail(buffer, target, normalizedType, context)
  }

  if (normalizedType === 'olb' || normalizedType === 'dra') {
    const { default: renderEda } = await import('./eda')
    return renderEda(buffer, target, normalizedType, context)
  }

  if (normalizedType === 'dxf' || normalizedType === 'dwg') {
    const { default: renderCad } = await import('./cad')
    return renderCad(buffer, target, normalizedType)
  }

  if (MODEL_EXTENSIONS.includes(normalizedType)) {
    const { default: renderModel } = await import('./model')
    return renderModel(buffer, target, normalizedType, context)
  }

  if (DRAWING_EXTENSIONS.includes(normalizedType)) {
    const { default: renderDrawing } = await import('./drawing')
    return renderDrawing(buffer, target, normalizedType)
  }

  if (normalizedType === 'epub') {
    const { default: renderEpub } = await import('./ebook')
    return renderEpub(buffer, target)
  }

  if (normalizedType === 'umd') {
    const { default: renderUmd } = await import('./umd')
    return renderUmd(buffer, target)
  }

  if (IMAGE_EXTENSIONS.includes(normalizedType)) {
    const { default: renderImage } = await import('./image')
    return renderImage(buffer, target)
  }

  if (normalizedType === 'md' || normalizedType === 'markdown') {
    const { default: renderMd } = await import('./md')
    return renderMd(buffer, target)
  }

  if (TEXT_EXTENSIONS.includes(normalizedType)) {
    const { default: renderText } = await import('./text')
    return renderText(buffer, target, normalizedType)
  }

  if (normalizedType === 'mp4') {
    const { default: renderMp4 } = await import('./mp4')
    renderMp4(buffer, target)
    return createWrapper(target)
  }

  if (AUDIO_EXTENSIONS.includes(normalizedType)) {
    const { default: renderAudio } = await import('./audio')
    return renderAudio(buffer, target, normalizedType)
  }

  return renderUnsupported(target, normalizedType)
}
