import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FILE_VIEWER_ARCHIVE_WORKER_PATH,
  DEFAULT_FILE_VIEWER_DATA_SQL_WASM_URL,
  DEFAULT_FILE_VIEWER_DOCX_WORKER_PATH,
  DEFAULT_FILE_VIEWER_SPREADSHEET_WORKER_PATH,
  DEFAULT_FILE_VIEWER_TYPST_COMPILER_WASM_URL,
  DEFAULT_FILE_VIEWER_TYPST_RENDERER_WASM_URL,
  resolveFileViewerArchiveWasmUrl,
  resolveFileViewerArchiveWorkerUrl,
  resolveFileViewerAssetUrl,
  resolveFileViewerCadAssetUrls,
  resolveFileViewerDataSqlWasmUrl,
  resolveFileViewerDocxWorkerUrl,
  resolveFileViewerSpreadsheetWorkerUrl,
  resolveFileViewerTypstCompilerWasmUrl,
  resolveFileViewerTypstRendererWasmUrl
} from '../packages/core/src'

describe('@file-viewer/core asset URL helpers', () => {
  it('resolves viewer asset URLs against a directory-style base', () => {
    expect(resolveFileViewerAssetUrl('assets/viewer.js', '', {
      baseUrl: '/vendor/file-viewer',
      documentBaseUrl: 'https://example.com/app/index.html'
    })).toBe('https://example.com/vendor/file-viewer/assets/viewer.js')

    expect(resolveFileViewerAssetUrl('/wasm/cad/', '', {
      documentBaseUrl: 'https://example.com/app/index.html',
      trimTrailingSlash: true
    })).toBe('https://example.com/wasm/cad')
  })

  it('resolves archive worker and wasm URLs', () => {
    expect(resolveFileViewerArchiveWorkerUrl(undefined, '/file-viewer/')).toBe(
      `http://localhost/file-viewer/${DEFAULT_FILE_VIEWER_ARCHIVE_WORKER_PATH}`
    )
    expect(resolveFileViewerArchiveWorkerUrl({ workerUrl: 'workers/archive.js' })).toBe(
      'http://localhost/workers/archive.js'
    )
    expect(resolveFileViewerArchiveWasmUrl({ wasmUrl: 'vendor/libarchive/libarchive.wasm' })).toBe(
      'http://localhost/vendor/libarchive/libarchive.wasm'
    )
    expect(resolveFileViewerArchiveWasmUrl(undefined, '/assets/libarchive.wasm')).toBe('/assets/libarchive.wasm')
  })

  it('resolves CAD asset defaults and overrides together', () => {
    expect(resolveFileViewerCadAssetUrls(undefined, 'https://viewer.example.com/base/index.html')).toEqual({
      wasmPath: 'https://viewer.example.com/base/wasm/cad',
      workerUrl: 'https://viewer.example.com/base/wasm/cad/dwg-worker.js',
      dwfWasmUrl: 'https://viewer.example.com/base/wasm/cad/dwfv-render.wasm'
    })
    expect(resolveFileViewerCadAssetUrls({
      wasmPath: '/static/cad/',
      workerUrl: 'https://cdn.example.com/dwg-worker.js',
      dwfWasmUrl: '/static/cad/dwf.wasm'
    }, 'https://viewer.example.com/app/')).toEqual({
      wasmPath: 'https://viewer.example.com/static/cad',
      workerUrl: 'https://cdn.example.com/dwg-worker.js',
      dwfWasmUrl: 'https://viewer.example.com/static/cad/dwf.wasm'
    })
  })

  it('resolves optional DOCX worker URLs', () => {
    expect(resolveFileViewerDocxWorkerUrl(undefined, 'https://viewer.example.com/app/index.html')).toBe(
      `https://viewer.example.com/app/${DEFAULT_FILE_VIEWER_DOCX_WORKER_PATH}`
    )
    expect(resolveFileViewerDocxWorkerUrl({
      workerUrl: 'https://cdn.example.com/file-viewer/docx.worker.js'
    }, 'https://viewer.example.com/app/index.html')).toBe(
      'https://cdn.example.com/file-viewer/docx.worker.js'
    )
  })

  it('resolves optional Spreadsheet worker URLs', () => {
    expect(resolveFileViewerSpreadsheetWorkerUrl(undefined, 'https://viewer.example.com/app/index.html')).toBe(
      `https://viewer.example.com/app/${DEFAULT_FILE_VIEWER_SPREADSHEET_WORKER_PATH}`
    )
    expect(resolveFileViewerSpreadsheetWorkerUrl({
      workerUrl: 'https://cdn.example.com/file-viewer/sheet.worker.js'
    }, 'https://viewer.example.com/app/index.html')).toBe(
      'https://cdn.example.com/file-viewer/sheet.worker.js'
    )
  })

  it('resolves Typst compiler WASM URL from explicit, override, then default sources', () => {
    expect(resolveFileViewerTypstCompilerWasmUrl({ compilerWasmUrl: '/typst/compiler.wasm' })).toBe('http://localhost/typst/compiler.wasm')
    expect(resolveFileViewerTypstCompilerWasmUrl(undefined, [undefined, '/env/compiler.wasm'])).toBe('http://localhost/env/compiler.wasm')
    expect(resolveFileViewerTypstCompilerWasmUrl()).toBe(`http://localhost/${DEFAULT_FILE_VIEWER_TYPST_COMPILER_WASM_URL}`)
  })

  it('resolves Typst renderer WASM URL from explicit, override, then default sources', () => {
    expect(resolveFileViewerTypstRendererWasmUrl({ rendererWasmUrl: '/typst/renderer.wasm' })).toBe('http://localhost/typst/renderer.wasm')
    expect(resolveFileViewerTypstRendererWasmUrl(undefined, [undefined, '/env/renderer.wasm'])).toBe('http://localhost/env/renderer.wasm')
    expect(resolveFileViewerTypstRendererWasmUrl()).toBe(`http://localhost/${DEFAULT_FILE_VIEWER_TYPST_RENDERER_WASM_URL}`)
  })

  it('resolves data asset SQL WASM URL from explicit, override, then default sources', () => {
    expect(resolveFileViewerDataSqlWasmUrl({ sqlWasmUrl: '/sql/sql-wasm.wasm' })).toBe('http://localhost/sql/sql-wasm.wasm')
    expect(resolveFileViewerDataSqlWasmUrl(undefined, [undefined, '/env/sql-wasm.wasm'])).toBe('http://localhost/env/sql-wasm.wasm')
    expect(resolveFileViewerDataSqlWasmUrl()).toBe(`http://localhost/${DEFAULT_FILE_VIEWER_DATA_SQL_WASM_URL}`)
  })
})
