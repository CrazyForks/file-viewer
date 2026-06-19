import { copyFile, mkdir, readdir, stat } from 'node:fs/promises'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const resolveCadViewerPackageJson = () => {
  try {
    return require.resolve('@flyfish-dev/cad-viewer/package.json')
  } catch {
    const corePackageJson = join(projectRoot, 'packages/core/package.json')
    const coreRequire = createRequire(corePackageJson)
    return coreRequire.resolve('@flyfish-dev/cad-viewer/package.json')
  }
}
const packageJson = resolveCadViewerPackageJson()
const packageRoot = dirname(packageJson)
const distRoot = join(packageRoot, 'dist')
const wasmDir = join(distRoot, 'wasm')
const dwgWorker = join(wasmDir, 'dwg-worker.js')
const rawArgs = process.argv.slice(2)
const args = new Set(rawArgs)
const readArgValue = name => {
  const index = rawArgs.indexOf(name)
  if (index === -1) {
    return undefined
  }
  const value = rawArgs[index + 1]
  return value && !value.startsWith('--') ? value : undefined
}
const resolveFromCwd = value => {
  if (!value) {
    return undefined
  }
  return isAbsolute(value) ? value : resolve(process.cwd(), value)
}
const publicRoot = resolveFromCwd(readArgValue('--public-root')) ?? join(projectRoot, 'apps/viewer-demo/public')
const distBaseRoot = resolveFromCwd(readArgValue('--dist-root')) ?? join(projectRoot, 'apps/viewer-demo/dist')
const targetRoots = [
  !args.has('--dist-only') && join(publicRoot, 'wasm', 'cad'),
  (args.has('--dist') || args.has('--dist-only')) && join(distBaseRoot, 'wasm', 'cad')
].filter(Boolean)

const copyWorkerChunks = async targetRoot => {
  const files = await readdir(wasmDir)
  await Promise.all(
    files
      .filter(file => /^dwg-worker-.+\.js$/.test(file))
      .map(file => copyChecked(join(wasmDir, file), join(targetRoot, file)))
  )
}

const copyChecked = async (from, to) => {
  const info = await stat(from)
  if (!info.isFile() || info.size <= 0) {
    throw new Error(`[file-viewer] Invalid CAD asset: ${from}`)
  }
  await copyFile(from, to)
}

for (const targetRoot of targetRoots) {
  await mkdir(targetRoot, { recursive: true })
  await copyChecked(join(wasmDir, 'libredwg-web.js'), join(targetRoot, 'libredwg-web.js'))
  await copyChecked(join(wasmDir, 'libredwg-web.wasm'), join(targetRoot, 'libredwg-web.wasm'))
  await copyChecked(join(wasmDir, 'dwfv-render.wasm'), join(targetRoot, 'dwfv-render.wasm'))
  await copyWorkerChunks(targetRoot)
  await copyChecked(dwgWorker, join(targetRoot, 'dwg-worker.js'))
}

console.log(`[file-viewer] CAD WASM assets copied to ${targetRoots.map(root => root.replace(`${projectRoot}/`, '')).join(', ')}`)
