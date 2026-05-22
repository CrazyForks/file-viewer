import { renderDoc, renderDocx } from './word'
import renderPptx from './pptx'
import renderXlsx from './xlsx'
import renderPdf from './pdf'
import renderImage from './image'
import renderMd from './md'
import renderText from './text'
import renderMp4 from './mp4'
import renderAudio from './audio'
import renderOfd from './ofd'
import renderCad from './cad'
import renderDrawing from './drawing'
import renderEpub from './ebook'
import renderUmd from './umd'
import renderModel, { MODEL_EXTENSIONS } from './model'
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
    accepts: ['docx'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement) => {
      const rendered = await renderDocx(buffer, target)
      window.dispatchEvent(new Event('resize'))
      return rendered
    }
  },
  {
    accepts: ['doc'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement) => {
      return renderDoc(buffer, target)
    }
  },
  // 使用pptx2html，已通过默认值更替
  {
    accepts: ['pptx'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement) => {
      await renderPptx(buffer, target)
      window.dispatchEvent(new Event('resize'))
      return createWrapper(target)
    }
  },
  // 使用 styled-exceljs + e-virt-table，统一处理 XLSX / XLS 的数据和样式读取。
  {
    accepts: ['xlsx'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement) => {
      return renderXlsx(buffer, target)
    }
  },
  // 二进制工作簿也走同一解析链路，避免 XLS / XLSX 出现样式能力差异。
  {
    accepts: ['xlsm', 'xlsb', 'xls', 'csv', 'ods', 'fods', 'numbers'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement) => {
      return renderXlsx(buffer, target)
    }
  },
  // 使用pdfjs，渲染pdf，效果最好
  {
    accepts: ['pdf'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement) => {
      return renderPdf(buffer, target)
    }
  },
  // OFD 是国产版式文档格式，解析和页面渲染依赖较重，必须保持在独立异步块里按需加载。
  {
    accepts: ['ofd'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement) => {
      return renderOfd(buffer, target)
    }
  },
  // CAD 内置 DXF 几何预览；DWG 会识别误命名 DXF，并尽量提取二进制内嵌预览图。
  {
    accepts: ['dxf', 'dwg'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string) => {
      return renderCad(buffer, target, type)
    }
  },
  // 3D 模型使用 Three.js 按需解析，覆盖浏览器可交互渲染的主流交换格式。
  {
    accepts: MODEL_EXTENSIONS,
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string, context?: FileRenderContext) => {
      return renderModel(buffer, target, type, context)
    }
  },
  // Excalidraw / draw.io 都是绘图类文本格式，使用官方预览库并保持独立异步加载。
  {
    accepts: ['excalidraw', 'drawio', 'dio'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string) => {
      return renderDrawing(buffer, target, type)
    }
  },
  // EPUB 使用成熟的 epubjs 阅读引擎，目录、资源和分页都保持在独立异步块里按需加载。
  {
    accepts: ['epub'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement) => {
      return renderEpub(buffer, target)
    }
  },
  // UMD 是老移动端电子书格式，当前没有可靠前端整库，按格式结构解析文本/图集并用 pako 解压正文段。
  {
    accepts: ['umd'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement) => {
      return renderUmd(buffer, target)
    }
  },
  // 图片过滤器
  {
    accepts: ['gif', 'jpg', 'jpeg', 'bmp', 'tiff', 'tif', 'png', 'svg','webp'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement) => {
      return renderImage(buffer, target)
    }
  },
  {
    accepts: ['md', 'markdown'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement) => {
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
      return renderText(buffer, target, type)
    }
  },
  // 视频预览，仅支持MP4
  {
    accepts: ['mp4'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement) => {
      renderMp4(buffer, target)
      return createWrapper(target)
    }
  },
  // 音频文件交给浏览器原生 `<audio>` 播放，扩展名入口覆盖主流 Web 可播放格式。
  {
    accepts: ['mp3', 'mpeg', 'wav', 'ogg', 'oga', 'opus', 'm4a', 'aac', 'flac', 'weba'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string) => {
      return renderAudio(buffer, target, type)
    }
  },
  // 错误处理
  {
    accepts: ['error'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string) => {
      target.innerHTML = `<div style='text-align: center; margin-top: 80px'>不支持.${type}格式的在线预览，请下载后预览或转换为支持的格式</div>
<div style='text-align: center'>支持 Word、Excel、PPT、PDF、OFD、CAD、3D 模型、Excalidraw、draw.io、EPUB、UMD、Markdown、代码/文本、图片、音频和 MP4 的在线预览</div>`
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
