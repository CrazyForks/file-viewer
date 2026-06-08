import { ARCHIVE_EXTENSIONS } from './archive/shared'
import { MODEL_EXTENSIONS } from './model/shared'
import type { AppWrapper, FileHandler, FileHandlerComposite, FileRenderContext } from '@/package/common/type'

// 假装构造一个vue的包装，让上层统一处理销毁和替换节点
const createWrapper = (el: HTMLDivElement): AppWrapper => ({
  $el: el,
  unmount() {
    // 什么也不需要 nothing to do
  }
})

const handlers: Array<FileHandlerComposite> = [
  // 使用docxjs支持，目前效果最好的渲染器
  {
    accepts: ['docx', 'docm', 'dotx', 'dotm'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, _type?: string, context?: FileRenderContext) => {
      const { renderDocx } = await import('./word')
      const rendered = await renderDocx(buffer, target, context)
      window.dispatchEvent(new Event('resize'))
      return rendered
    }
  },
  {
    accepts: ['doc', 'dot'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, _type?: string, context?: FileRenderContext) => {
      const { renderDoc } = await import('./word')
      return renderDoc(buffer, target, context)
    }
  },
  // 使用pptx2html，已通过默认值更替
  {
    accepts: ['pptx', 'pptm', 'potx', 'potm', 'ppsx', 'ppsm'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string) => {
      const { default: renderPptx } = await import('./pptx')
      await renderPptx(buffer, target, type)
      window.dispatchEvent(new Event('resize'))
      return createWrapper(target)
    }
  },
  // 使用 styled-exceljs + e-virt-table，统一处理 XLSX / XLS 的数据和样式读取。
  {
    accepts: ['xlsx', 'xltx'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string) => {
      const { default: renderXlsx } = await import('./xlsx')
      return renderXlsx(buffer, target, type)
    }
  },
  // 二进制工作簿也走同一解析链路，避免 XLS / XLSX 出现样式能力差异。
  {
    accepts: ['xlsm', 'xlsb', 'xls', 'xlt', 'xltm', 'csv', 'ods', 'fods', 'numbers'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string) => {
      const { default: renderXlsx } = await import('./xlsx')
      return renderXlsx(buffer, target, type)
    }
  },
  // 使用pdfjs，渲染pdf，效果最好
  {
    accepts: ['pdf'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, _type?: string, context?: FileRenderContext) => {
      const { default: renderPdf } = await import('./pdf')
      return renderPdf(buffer, target, context)
    }
  },
  // OFD 是国产版式文档格式，解析和页面渲染依赖较重，必须保持在独立异步块里按需加载。
  {
    accepts: ['ofd'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement) => {
      const { default: renderOfd } = await import('./ofd')
      return renderOfd(buffer, target)
    }
  },
  // Typst 使用 WASM 编译器和 SVG 渲染链路，只有打开 .typ/.typst 时才加载重型运行时。
  {
    accepts: ['typ', 'typst'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string, context?: FileRenderContext) => {
      const { default: renderTypst } = await import('./typst')
      return renderTypst(buffer, target, type, context)
    }
  },
  // 压缩包依赖 libarchive.js 的 WASM Worker。只在命中压缩包扩展名时加载，并且内部文件按点击解压。
  {
    accepts: ARCHIVE_EXTENSIONS,
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, _type?: string, context?: FileRenderContext) => {
      const { default: renderArchive } = await import('./archive')
      return renderArchive(buffer, target, context)
    }
  },
  // EML/MSG 使用成熟邮件解析库读取头信息、正文与附件，附件继续交给统一渲染器预览。
  {
    accepts: ['eml', 'msg'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string, context?: FileRenderContext) => {
      const { default: renderEmail } = await import('./email')
      return renderEmail(buffer, target, type, context)
    }
  },
  // OLB/DRA 常见于 OrCAD / Allegro 生态，优先按 CFB 容器解析结构树、对象和属性，失败时退化为安全的二进制结构预览。
  {
    accepts: ['olb', 'dra'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string, context?: FileRenderContext) => {
      const { default: renderEda } = await import('./eda')
      return renderEda(buffer, target, type, context)
    }
  },
  // CAD 内置 DXF 几何预览；DWG 会识别误命名 DXF，并尽量提取二进制内嵌预览图。
  {
    accepts: ['dxf', 'dwg'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string) => {
      const { default: renderCad } = await import('./cad')
      return renderCad(buffer, target, type)
    }
  },
  // 3D 模型使用 Three.js 按需解析，覆盖浏览器可交互渲染的主流交换格式。
  {
    accepts: MODEL_EXTENSIONS,
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string, context?: FileRenderContext) => {
      const { default: renderModel } = await import('./model')
      return renderModel(buffer, target, type, context)
    }
  },
  // Excalidraw / draw.io 都是绘图类文本格式，使用官方预览库并保持独立异步加载。
  {
    accepts: ['excalidraw', 'drawio', 'dio'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string) => {
      const { default: renderDrawing } = await import('./drawing')
      return renderDrawing(buffer, target, type)
    }
  },
  // EPUB 使用成熟的 epubjs 阅读引擎，目录、资源和分页都保持在独立异步块里按需加载。
  {
    accepts: ['epub'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement) => {
      const { default: renderEpub } = await import('./ebook')
      return renderEpub(buffer, target)
    }
  },
  // UMD 是老移动端电子书格式，当前没有可靠前端整库，按格式结构解析文本/图集并用 pako 解压正文段。
  {
    accepts: ['umd'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement) => {
      const { default: renderUmd } = await import('./umd')
      return renderUmd(buffer, target)
    }
  },
  // 图片过滤器
  {
    accepts: ['gif', 'jpg', 'jpeg', 'bmp', 'tiff', 'tif', 'png', 'svg','webp'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement) => {
      const { default: renderImage } = await import('./image')
      return renderImage(buffer, target)
    }
  },
  {
    accepts: ['md', 'markdown'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement) => {
      const { default: renderMd } = await import('./md')
      return renderMd(buffer, target)
    }
  },
  // 纯文本 / 代码预览：使用 highlight.js 按扩展名高亮，HTML 也只作为源码显示。
  {
    accepts: [
      'txt', 'json', 'js', 'mjs', 'cjs', 'css', 'java', 'py', 'html', 'htm', 'jsx', 'ts', 'tsx', 'xml', 'log',
      'vue', 'yaml', 'yml', 'ini', 'sh', 'bash', 'sql', 'go', 'rs', 'php', 'c', 'cpp', 'cc', 'h', 'hpp', 'cs', 'diff'
    ],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string) => {
      const { default: renderText } = await import('./text')
      return renderText(buffer, target, type)
    }
  },
  // 视频预览，仅支持MP4
  {
    accepts: ['mp4'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement) => {
      const { default: renderMp4 } = await import('./mp4')
      renderMp4(buffer, target)
      return createWrapper(target)
    }
  },
  // 音频文件交给浏览器原生 `<audio>` 播放，扩展名入口覆盖主流 Web 可播放格式。
  {
    accepts: ['mp3', 'mpeg', 'wav', 'ogg', 'oga', 'opus', 'm4a', 'aac', 'flac', 'weba'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string) => {
      const { default: renderAudio } = await import('./audio')
      return renderAudio(buffer, target, type)
    }
  },
  // 错误处理
  {
    accepts: ['error'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string) => {
      target.innerHTML = `<div style='text-align: center; margin-top: 80px'>不支持.${type}格式的在线预览，请下载后预览或转换为支持的格式</div>
<div style='text-align: center'>支持 Word、Excel、PPT、PDF、OFD、Typst、压缩包、邮件、OLB/DRA、CAD、3D 模型、Excalidraw、draw.io、EPUB、UMD、Markdown、代码/文本、图片、音频和 MP4 的在线预览</div>`
      return createWrapper(target)
    }
  }
]

// 匹配
const renders = handlers.reduce((result, { accepts, handler }) => {
  accepts.forEach(type => result.set(type, handler))
  return result
}, new Map<string, FileHandler>())

export default renders
