import { createApp, defineAsyncComponent } from 'vue'
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import type { FileRenderContext } from '@file-viewer/core'

const DataAssetViewer = defineAsyncComponent(() => import('./DataAssetViewer.vue'))

interface DataPreview {
  title: string;
  summary: Array<{ label: string; value: string }>;
  rows?: Array<Record<string, unknown>>;
  text?: string;
  image?: string;
  fontFamily?: string;
}

const fontMimeMap: Record<string, string> = {
  otf: 'font/otf',
  ttf: 'font/ttf',
  woff: 'font/woff',
  woff2: 'font/woff2'
}

const formatBytes = (value: number) => {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

const makeRows = (rows: Array<Record<string, unknown>>) => {
  return rows.slice(0, 30).map(row => {
    const next: Record<string, unknown> = {}
    Object.entries(row).slice(0, 24).forEach(([key, value]) => {
      if (typeof value === 'bigint') {
        next[key] = value.toString()
      } else if (value instanceof Uint8Array) {
        next[key] = `[bytes:${value.byteLength}]`
      } else if (value && typeof value === 'object') {
        next[key] = JSON.stringify(value).slice(0, 180)
      } else {
        next[key] = value
      }
    })
    return next
  })
}

const extractReadableText = (buffer: ArrayBuffer, max = 8000) => {
  const bytes = new Uint8Array(buffer)
  const ascii = Array.from(bytes.slice(0, Math.min(bytes.length, max)))
    .map(byte => (byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9 ? String.fromCharCode(byte) : ' ')
    .join('')
    .replace(/[ \t]{3,}/g, ' ')
  return ascii.trim().slice(0, max)
}

const readMagic = (buffer: ArrayBuffer, length = 12) => {
  return String.fromCharCode(...new Uint8Array(buffer.slice(0, length)))
}

const imageDataToUrl = (imageData: ImageData) => {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  const context = canvas.getContext('2d')
  context?.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}

const renderFont = async (buffer: ArrayBuffer, type: string): Promise<DataPreview> => {
  const family = `FlyfishPreviewFont-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const face = new FontFace(family, buffer)
  await face.load()
  document.fonts.add(face)
  return {
    title: '字体文件预览',
    fontFamily: family,
    summary: [
      { label: '格式', value: type.toUpperCase() },
      { label: '大小', value: formatBytes(buffer.byteLength) },
      { label: '渲染方式', value: 'Browser FontFace API' }
    ]
  }
}

const renderPsd = async (buffer: ArrayBuffer): Promise<DataPreview> => {
  const { readPsd } = await import('ag-psd')
  const psd = readPsd(buffer, { useImageData: true })
  const image = psd.imageData ? imageDataToUrl(psd.imageData as ImageData) : undefined
  return {
    title: 'PSD 图像结构预览',
    image,
    summary: [
      { label: '画布', value: `${psd.width || 0} x ${psd.height || 0}` },
      { label: '图层', value: String(psd.children?.length || 0) },
      { label: '渲染方式', value: 'ag-psd' }
    ],
    rows: makeRows((psd.children || []).map((layer: any) => ({
      name: layer.name || '-',
      left: layer.left,
      top: layer.top,
      right: layer.right,
      bottom: layer.bottom,
      hidden: Boolean(layer.hidden)
    })))
  }
}

const renderSqlite = async (buffer: ArrayBuffer): Promise<DataPreview> => {
  const { default: initSqlJs } = await import('sql.js')
  const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl })
  const db = new SQL.Database(new Uint8Array(buffer))
  try {
    const tableResult = db.exec("select name, type from sqlite_master where type in ('table','view') and name not like 'sqlite_%' order by type, name")
    const tables = tableResult[0]?.values || []
    const firstTable = String(tables[0]?.[0] || '')
    const rows = firstTable
      ? db.exec(`select * from "${firstTable.replace(/"/g, '""')}" limit 30`)[0]
      : null
    return {
      title: 'SQLite 数据库预览',
      summary: [
        { label: '对象数', value: String(tables.length) },
        { label: '示例表', value: firstTable || '-' },
        { label: '渲染方式', value: 'sql.js WASM' }
      ],
      rows: rows
        ? makeRows((rows.values as unknown[][]).map((values: unknown[]) => Object.fromEntries(rows.columns.map((column: string, index: number) => [column, values[index]]))))
        : makeRows((tables as unknown[][]).map((value: unknown[]) => ({ name: value[0], type: value[1] })))
    }
  } finally {
    db.close()
  }
}

const renderParquet = async (buffer: ArrayBuffer): Promise<DataPreview> => {
  const { parquetMetadataAsync, parquetReadObjects } = await import('hyparquet')
  const file = {
    byteLength: buffer.byteLength,
    slice: (start: number, end?: number) => buffer.slice(start, end)
  }
  const metadata = await parquetMetadataAsync(file)
  const rows = await parquetReadObjects({ file, rowFormat: 'object', rowEnd: 30 })
  return {
    title: 'Parquet 列式数据预览',
    summary: [
      { label: '行数', value: metadata.num_rows?.toString?.() || '-' },
      { label: '列数', value: String(metadata.schema?.filter(item => item.name).length || 0) },
      { label: '渲染方式', value: 'hyparquet' }
    ],
    rows: makeRows(rows)
  }
}

const renderAvro = async (buffer: ArrayBuffer): Promise<DataPreview> => {
  const avro = await import('avsc/etc/browser/avsc.js')
  const decoder = (avro as any).createBlobDecoder(new Blob([buffer]))
  const rows: Array<Record<string, unknown>> = []
  let schema = ''
  await new Promise<void>((resolve, reject) => {
    decoder.on('metadata', (type: any) => {
      schema = type?.toString?.() || ''
    })
    decoder.on('data', (value: Record<string, unknown>) => {
      if (rows.length < 30) rows.push(value)
    })
    decoder.on('end', resolve)
    decoder.on('error', reject)
  })
  return {
    title: 'Avro 对象容器预览',
    summary: [
      { label: '示例行', value: String(rows.length) },
      { label: 'Schema', value: schema ? '已读取' : '未读取' },
      { label: '渲染方式', value: 'avsc' }
    ],
    rows: makeRows(rows),
    text: schema.slice(0, 6000)
  }
}

const renderWasm = async (buffer: ArrayBuffer): Promise<DataPreview> => {
  const module = await WebAssembly.compile(buffer.slice(0))
  const imports = WebAssembly.Module.imports(module)
  const exports = WebAssembly.Module.exports(module)
  return {
    title: 'WebAssembly 模块预览',
    summary: [
      { label: '导入', value: String(imports.length) },
      { label: '导出', value: String(exports.length) },
      { label: '渲染方式', value: 'WebAssembly.Module' }
    ],
    rows: makeRows([
      ...imports.map(item => ({ kind: 'import', module: item.module, name: item.name, type: item.kind })),
      ...exports.map(item => ({ kind: 'export', module: '-', name: item.name, type: item.kind }))
    ])
  }
}

const renderPostScriptLike = async (buffer: ArrayBuffer, type: string): Promise<DataPreview> => {
  return {
    title: type === 'eps' ? 'EPS 矢量文件摘要' : 'Illustrator 文件摘要',
    summary: [
      { label: 'Magic', value: readMagic(buffer).replace(/\s/g, ' ') },
      { label: '大小', value: formatBytes(buffer.byteLength) },
      { label: '说明', value: type === 'ai' ? '非 PDF-compatible AI 按摘要展示' : 'PostScript 摘要展示' }
    ],
    text: extractReadableText(buffer)
  }
}

const renderWebArchive = async (buffer: ArrayBuffer): Promise<DataPreview> => {
  return {
    title: 'WebArchive 摘要预览',
    summary: [
      { label: '容器', value: readMagic(buffer).startsWith('bplist') ? 'Binary plist' : 'WebArchive' },
      { label: '大小', value: formatBytes(buffer.byteLength) },
      { label: '说明', value: '安全提取可读片段，不执行网页脚本' }
    ],
    text: extractReadableText(buffer)
  }
}

const buildPreview = async (buffer: ArrayBuffer, type: string): Promise<DataPreview> => {
  if (type in fontMimeMap) return renderFont(buffer, type)
  if (type === 'psd') return renderPsd(buffer)
  if (type === 'sqlite') return renderSqlite(buffer)
  if (type === 'parquet') return renderParquet(buffer)
  if (type === 'avro') return renderAvro(buffer)
  if (type === 'wasm') return renderWasm(buffer)
  if (type === 'ai' || type === 'eps') return renderPostScriptLike(buffer, type)
  if (type === 'webarchive') return renderWebArchive(buffer)
  return {
    title: '数据资产摘要',
    summary: [
      { label: '格式', value: type.toUpperCase() },
      { label: '大小', value: formatBytes(buffer.byteLength) }
    ],
    text: extractReadableText(buffer)
  }
}

/**
 * 字体、设计资产和结构化数据预览。
 *
 * 这里独立成一个异步链路，避免 sql.js / hyparquet / ag-psd 等解析器进入
 * 普通 Office、PDF、代码预览的加载路径。
 */
export default async function renderDataAsset(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext
) {
  const normalizedType = (type || 'bin').toLowerCase()
  if (normalizedType === 'ai' && readMagic(buffer, 5) === '%PDF-') {
    const { default: renderPdf } = await import('../pdf')
    return renderPdf(buffer, target, context)
  }
  const preview = await buildPreview(buffer, normalizedType)
  const app = createApp({
    render: () => (
      <DataAssetViewer
        title={preview.title}
        type={normalizedType}
        summary={preview.summary}
        rows={preview.rows}
        text={preview.text}
        image={preview.image}
        fontFamily={preview.fontFamily}
      />
    )
  })
  app.mount(target)
  return app
}
