import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const require = createRequire(import.meta.url)
const resolveViteEntrypoint = () => {
  try {
    return require.resolve('vite')
  } catch {
    const demoRequire = createRequire(resolve(root, 'apps/viewer-demo/package.json'))
    return demoRequire.resolve('vite')
  }
}
const { build } = await import(pathToFileURL(resolveViteEntrypoint()).href)
const rawArgs = process.argv.slice(2)
const readArgValue = name => {
  const index = rawArgs.indexOf(name)
  if (index === -1) {
    return undefined
  }
  const value = rawArgs[index + 1]
  return value && !value.startsWith('--') ? value : undefined
}
const outputDir = resolve(
  root,
  readArgValue('--out-dir') ||
    process.env.FILE_VIEWER_DEMO_OUTPUT_DIR ||
    process.env.DEMO_OUTPUT_DIR ||
    'apps/viewer-demo/dist'
)

const workerBuilds = [
  {
    label: 'docx',
    entry: resolve(root, 'packages/core/src/renderers/wordDocx.worker.ts'),
    outDir: resolve(outputDir, 'vendor/docx'),
    fileName: 'docx.worker.js'
  },
  {
    label: 'spreadsheet',
    entry: resolve(root, 'packages/core/src/renderers/spreadsheet/worker/sheetjs/sheet.worker.ts'),
    outDir: resolve(outputDir, 'vendor/xlsx'),
    fileName: 'sheet.worker.js'
  }
]

for (const worker of workerBuilds) {
  await mkdir(worker.outDir, { recursive: true })
  await build({
    configFile: false,
    publicDir: false,
    logLevel: 'warn',
    build: {
      emptyOutDir: false,
      minify: true,
      codeSplitting: false,
      outDir: worker.outDir,
      target: 'es2019',
      lib: {
        entry: worker.entry,
        formats: ['es'],
        fileName: () => worker.fileName
      },
      rollupOptions: {}
    }
  })
  console.log(`[file-viewer] Built ${worker.label} worker to ${worker.outDir}/${worker.fileName}`)
}
