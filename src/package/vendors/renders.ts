import {
  DEFAULT_RENDERER_DEFINITIONS,
  createFileRenderHandlerRegistry,
  createFileViewerRendererDispatcher,
  createFileViewerUnsupportedState
} from '@file-viewer/core'
import type {
  FileRenderContext,
  FileRenderHandler,
  FileViewerRenderedInstance as AppWrapper
} from '@file-viewer/core'

type FileHandler = FileRenderHandler<AppWrapper, HTMLDivElement>

interface VueRendererHandler {
  rendererId: string;
  handler: FileHandler;
}

// 假装构造一个vue的包装，让上层统一处理销毁和替换节点
const createWrapper = (el: HTMLDivElement): AppWrapper => ({
  $el: el,
  unmount() {
    // 什么也不需要 nothing to do
  }
})

const handlers: Array<VueRendererHandler> = [
  // 使用docxjs支持，目前效果最好的渲染器
  {
    rendererId: 'office-word-openxml',
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, _type?: string, context?: FileRenderContext) => {
      const { renderDocx } = await import('./word')
      const rendered = await renderDocx(buffer, target, context)
      window.dispatchEvent(new Event('resize'))
      return rendered
    }
  },
  {
    rendererId: 'office-word-binary',
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, _type?: string, context?: FileRenderContext) => {
      const { renderDoc } = await import('./word')
      return renderDoc(buffer, target, context)
    }
  },
  // 使用pptx2html，已通过默认值更替
  {
    rendererId: 'office-presentation',
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string) => {
      const { default: renderPptx } = await import('./pptx')
      await renderPptx(buffer, target, type)
      window.dispatchEvent(new Event('resize'))
      return createWrapper(target)
    }
  },
  // RTF / ODT / ODP 是兼容型开放文档入口，保持独立异步块，避免影响主 Office 链路。
  {
    rendererId: 'open-document',
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string) => {
      const { default: renderOpenDocument } = await import('./open-document')
      return renderOpenDocument(buffer, target, type)
    }
  },
  // 使用 styled-exceljs + e-virt-table，统一处理 XLSX / XLS 的数据和样式读取。
  {
    rendererId: 'spreadsheet-openxml',
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string) => {
      const { default: renderXlsx } = await import('./xlsx')
      return renderXlsx(buffer, target, type)
    }
  },
  // 使用pdfjs，渲染pdf，效果最好
  {
    rendererId: 'pdf',
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, _type?: string, context?: FileRenderContext) => {
      const { default: renderPdf } = await import('./pdf')
      return renderPdf(buffer, target, context)
    }
  },
  // OFD 是国产版式文档格式，解析和页面渲染依赖较重，必须保持在独立异步块里按需加载。
  {
    rendererId: 'ofd',
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement) => {
      const { default: renderOfd } = await import('./ofd')
      return renderOfd(buffer, target)
    }
  },
  // Typst 使用 WASM 编译器和 SVG 渲染链路，只有打开 .typ/.typst 时才加载重型运行时。
  {
    rendererId: 'typst',
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string, context?: FileRenderContext) => {
      const { default: renderTypst } = await import('./typst')
      return renderTypst(buffer, target, type, context)
    }
  },
  // 压缩包依赖 libarchive.js 的 WASM Worker。只在命中压缩包扩展名时加载，并且内部文件按点击解压。
  {
    rendererId: 'archive',
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, _type?: string, context?: FileRenderContext) => {
      const { default: renderArchive } = await import('./archive')
      return renderArchive(buffer, target, context)
    }
  },
  // EML/MSG 使用成熟邮件解析库读取头信息、正文与附件，附件继续交给统一渲染器预览。
  {
    rendererId: 'email',
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string, context?: FileRenderContext) => {
      const { default: renderEmail } = await import('./email')
      return renderEmail(buffer, target, type, context)
    }
  },
  // OLB/DRA 常见于 OrCAD / Allegro 生态，优先按 CFB 容器解析结构树、对象和属性，失败时退化为安全的二进制结构预览。
  {
    rendererId: 'eda',
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string, context?: FileRenderContext) => {
      const { default: renderEda } = await import('./eda')
      return renderEda(buffer, target, type, context)
    }
  },
  // CAD 使用 @flyfish-dev/cad-viewer。DWG 走 Worker + LibreDWG WASM，DWF/DWFx/XPS 走 native renderer。
  {
    rendererId: 'cad',
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string, context?: FileRenderContext) => {
      const { default: renderCad } = await import('./cad')
      return renderCad(buffer, target, type, context)
    }
  },
  // 3D 模型使用 Three.js 按需解析，覆盖浏览器可交互渲染的主流交换格式。
  {
    rendererId: 'model',
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string, context?: FileRenderContext) => {
      const { default: renderModel } = await import('./model')
      return renderModel(buffer, target, type, context)
    }
  },
  // KML / GPX / Shapefile / GeoJSON 统一转换到 GeoJSON 后离线 SVG 预览，不依赖地图瓦片服务。
  {
    rendererId: 'geo',
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string) => {
      const { default: renderGeo } = await import('./geo')
      return renderGeo(buffer, target, type)
    }
  },
  // Excalidraw / draw.io 都是绘图类文本格式，使用官方预览库并保持独立异步加载。
  {
    rendererId: 'drawing',
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string) => {
      const { default: renderDrawing } = await import('./drawing')
      return renderDrawing(buffer, target, type)
    }
  },
  // EPUB 使用成熟的 epubjs 阅读引擎，目录、资源和分页都保持在独立异步块里按需加载。
  {
    rendererId: 'epub',
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement) => {
      const { default: renderEpub } = await import('./ebook')
      return renderEpub(buffer, target)
    }
  },
  // UMD 是老移动端电子书格式，当前没有可靠前端整库，按格式结构解析文本/图集并用 pako 解压正文段。
  {
    rendererId: 'umd',
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement) => {
      const { default: renderUmd } = await import('./umd')
      return renderUmd(buffer, target)
    }
  },
  // 图片过滤器
  {
    rendererId: 'image',
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string) => {
      const { default: renderImage } = await import('./image')
      return renderImage(buffer, target, type)
    }
  },
  {
    rendererId: 'markdown',
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement) => {
      const { default: renderMd } = await import('./md')
      return renderMd(buffer, target)
    }
  },
  // 纯文本 / 代码预览：使用 highlight.js 按扩展名高亮，HTML 也只作为源码显示。
  {
    rendererId: 'code',
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string) => {
      const { default: renderText } = await import('./text')
      return renderText(buffer, target, type)
    }
  },
  // 视频预览：MP4 / WebM 走原生 video，M3U8 按需加载 hls.js。
  {
    rendererId: 'video',
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string, context?: FileRenderContext) => {
      const { default: renderMp4 } = await import('./mp4')
      return renderMp4(buffer, target, type, context)
    }
  },
  // 音频文件交给浏览器原生 `<audio>` 播放，扩展名入口覆盖主流 Web 可播放格式。
  {
    rendererId: 'audio',
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string) => {
      const { default: renderAudio } = await import('./audio')
      return renderAudio(buffer, target, type)
    }
  },
  // 字体、设计资产和结构化数据使用专属异步链路，避免重型解析器进入常规首屏。
  {
    rendererId: 'data-asset',
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string, context?: FileRenderContext) => {
      const { default: renderDataAsset } = await import('./data')
      return renderDataAsset(buffer, target, type, context)
    }
  }
]

// 错误处理
const renderUnsupported: FileHandler = async (_buffer: ArrayBuffer, target: HTMLDivElement, type?: string) => {
  const state = createFileViewerUnsupportedState(type)
  const wrapper = document.createElement('div')
  wrapper.style.textAlign = 'center'
  wrapper.style.marginTop = '80px'

  const message = document.createElement('div')
  message.textContent = state.message
  wrapper.appendChild(message)

  if (state.description) {
    const description = document.createElement('div')
    description.textContent = state.description
    wrapper.appendChild(description)
  }

  target.replaceChildren(wrapper)
  return createWrapper(target)
}

export const vueRendererRegistryBridge = createFileRenderHandlerRegistry({
  definitions: DEFAULT_RENDERER_DEFINITIONS,
  handlers
})
export const vueRendererRegistry = vueRendererRegistryBridge.registry
export const vueRendererDispatcher = createFileViewerRendererDispatcher({
  registry: vueRendererRegistry,
  handlers,
  fallbackHandler: renderUnsupported
})

export const missingCoreRendererHandlers = vueRendererRegistryBridge.missingRendererIds

// 现有 Vue3 预览器仍负责渲染，扩展名与格式矩阵统一由 core dispatcher 派发。
const renders = vueRendererDispatcher.handlersByExtension

export default renders
