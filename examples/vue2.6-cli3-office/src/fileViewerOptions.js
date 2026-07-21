import officePreset from '@file-viewer/preset-office'

const normalizeBaseUrl = value => {
  const raw = value || './'
  return raw.endsWith('/') ? raw : `${raw}/`
}

export const fileViewerAssetBaseUrl = `${normalizeBaseUrl(process.env.BASE_URL)}file-viewer/`

export function createViewerOptions(theme) {
  return {
    preset: officePreset,
    rendererMode: 'replace',
    theme,
    toolbar: {
      position: 'auto'
    },
    pdf: {
      workerUrl: `${fileViewerAssetBaseUrl}vendor/pdf/pdf.worker.mjs`,
      cMapUrl: `${fileViewerAssetBaseUrl}vendor/pdf/cmaps/`,
      wasmUrl: `${fileViewerAssetBaseUrl}vendor/pdf/wasm/`,
      standardFontDataUrl: `${fileViewerAssetBaseUrl}vendor/pdf/standard_fonts/`
    },
    docx: {
      workerUrl: `${fileViewerAssetBaseUrl}vendor/docx/docx.worker.js`,
      workerJsZipUrl: `${fileViewerAssetBaseUrl}vendor/docx/jszip.min.js`
    },
    presentation: {
      pptModuleUrl: `${fileViewerAssetBaseUrl}vendor/ppt/index.mjs`,
      pptWorkerUrl: `${fileViewerAssetBaseUrl}vendor/ppt/worker.mjs`,
      pptWasmUrl: `${fileViewerAssetBaseUrl}vendor/ppt/ppt-native.wasm`,
      pptFontUrl: `${fileViewerAssetBaseUrl}vendor/ppt/ppt-font-cjk.otf`,
      workerUrl: `${fileViewerAssetBaseUrl}vendor/pptx/pptx.worker.js`
    },
    spreadsheet: {
      workerUrl: `${fileViewerAssetBaseUrl}vendor/xlsx/sheet.worker.js`,
      enableColumnResize: true
    }
  }
}
