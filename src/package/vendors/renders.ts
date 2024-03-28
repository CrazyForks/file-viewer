import renderDocx from './docx'
import renderPptx from './pptx'
import renderXlsx from './xlsx'
import renderPdf from './pdf'
import renderImage from './image'
import renderMd from './md'
import renderText from './text'
import renderMp4 from './mp4'
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
      await renderDocx(buffer, target)
      window.dispatchEvent(new Event('resize'))
      return createWrapper(target)
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
  // 使用exceljs + handsontable，全部样式
  {
    accepts: ['xlsx'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement) => {
      return renderXlsx(buffer, target, 'xml')
    }
  },
  // 使用js-xlsx + handsontable，无样式
  {
    accepts: ['xlsm', 'xlsb', 'xls', 'csv', 'ods', 'fods', 'numbers'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement) => {
      return renderXlsx(buffer, target, 'binary')
    }
  },
  // 使用pdfjs，渲染pdf，效果最好
  {
    accepts: ['pdf'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement) => {
      return renderPdf(buffer, target)
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
  // 纯文本预览
  {
    accepts: ['txt', 'json', 'js', 'css', 'java', 'py', 'html', 'jsx', 'ts', 'tsx', 'xml', 'log'],
    handler: async (buffer: ArrayBuffer, target: HTMLDivElement) => {
      return renderText(buffer, target)
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
<div style='text-align: center'>支持docx, xlsx, pptx, pdf, 以及纯文本格式和各种图片格式的在线预览</div>`
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
