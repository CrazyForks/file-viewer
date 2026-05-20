import { renderDoc, renderDocx } from './word'
import renderPptx from './pptx'
import renderXlsx from './xlsx'
import renderPdf from './pdf'
import renderImage from './image'
import renderMd from './md'
import renderText from './text'
import renderMp4 from './mp4'
import renderOfd from './ofd'
import renderCad from './cad'
import renderDrawing from './drawing'
import type { AppWrapper, FileHandler, FileHandlerComposite } from '@/package/common/type'

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
  // CAD 预览当前内置 DXF。DWG 因专有格式和 GPL 转换器约束，不默认打进库里。
  {
    accepts: ['dxf', 'dwg'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string) => {
      return renderCad(buffer, target, type)
    }
  },
  // Excalidraw / draw.io 都是绘图类文本格式，使用官方预览库并保持独立异步加载。
  {
    accepts: ['excalidraw', 'drawio', 'dio'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string) => {
      return renderDrawing(buffer, target, type)
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
      'vue', 'yaml', 'yml', 'ini', 'sh', 'bash', 'sql', 'go', 'rs', 'php', 'c', 'cpp', 'cc', 'h', 'hpp', 'cs', 'diff',
      'umd'
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
  // 错误处理
  {
    accepts: ['error'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement, type?: string) => {
      target.innerHTML = `<div style='text-align: center; margin-top: 80px'>不支持.${type}格式的在线预览，请下载后预览或转换为支持的格式</div>
<div style='text-align: center'>支持 Word、Excel、PPT、PDF、OFD、CAD、Excalidraw、draw.io、Markdown、代码/文本、图片和 MP4 的在线预览</div>`
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
