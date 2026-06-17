import { spawnSync } from 'node:child_process'
import { cp, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import rootPackage from '../package.json' with { type: 'json' }

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const source = resolve(root, 'dist')
const target = resolve(root, 'packages/web/viewer')
const coreAssetsEntry = resolve(root, 'packages/core/dist/assets.js')

if (!existsSync(resolve(source, 'index.html'))) {
  throw new Error('缺少 dist/index.html，请先运行 pnpm build-only')
}

const removeMacMetadata = async dir => {
  const entries = await readdir(dir, { withFileTypes: true })
  await Promise.all(entries.map(entry => {
    const path = resolve(dir, entry.name)
    if (entry.name === '.DS_Store') {
      return rm(path, { force: true })
    }
    if (entry.isDirectory()) {
      return removeMacMetadata(path)
    }
    return undefined
  }))
}

const run = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit'
  })
  if (result.status !== 0) {
    throw new Error(`命令执行失败: ${command} ${args.join(' ')}`)
  }
}

run('pnpm', ['--filter', '@file-viewer/core', 'build'])
const {
  listFileViewerRendererAssetManifests
} = await import(pathToFileURL(coreAssetsEntry).href)

const validateViewerAssets = async dir => {
  const assets = await Promise.all(
    listFileViewerRendererAssetManifests()
      .flatMap(manifest => manifest.assets)
      .filter(asset => asset.target === 'public' && asset.defaultPath)
      .map(async asset => {
        const absolutePath = resolve(dir, asset.defaultPath)
        let exists = false

        try {
          const info = await stat(absolutePath)
          exists = asset.kind === 'wasm-directory' ? info.isDirectory() : info.isFile()
        } catch {
          exists = false
        }

        return {
          id: asset.id,
          rendererId: asset.rendererId,
          kind: asset.kind,
          target: asset.target,
          required: asset.required,
          relativePath: asset.defaultPath,
          absolutePath,
          exists,
          description: asset.description
        }
      })
  )
  const missingRequired = assets.filter(asset => asset.required && !asset.exists)
  const missingOptional = assets.filter(asset => !asset.required && !asset.exists)

  return {
    sourceDir: dir,
    valid: missingRequired.length === 0,
    checkedAt: new Date().toISOString(),
    assets,
    missingRequired,
    missingOptional
  }
}

const toManifestValidationItem = item => {
  const { absolutePath: _absolutePath, ...manifestItem } = item
  return manifestItem
}

const toManifestValidation = validation => ({
  valid: validation.valid,
  checkedAt: validation.checkedAt,
  assets: validation.assets.map(toManifestValidationItem),
  missingRequired: validation.missingRequired.map(toManifestValidationItem),
  missingOptional: validation.missingOptional.map(toManifestValidationItem)
})

await rm(target, { force: true, recursive: true })
await mkdir(target, { recursive: true })
await cp(source, target, { recursive: true })
await rm(resolve(target, 'example'), { force: true, recursive: true })
await removeMacMetadata(target)

await writeFile(
  resolve(target, 'flyfish-viewer-manifest.json'),
  `${JSON.stringify({
    name: rootPackage.name,
    version: rootPackage.version,
    entry: 'index.html'
  }, null, 2)}\n`
)

const validation = await validateViewerAssets(target)
await writeFile(
  resolve(target, 'flyfish-viewer-assets.json'),
  `${JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    rendererAssetManifests: listFileViewerRendererAssetManifests(),
    validation: toManifestValidation(validation)
  }, null, 2)}\n`
)

if (!validation.valid) {
  throw new Error(
    `Vue 基线 viewer 缺少必要 worker/WASM 资源: ${
      validation.missingRequired.map(asset => `${asset.rendererId}:${asset.relativePath}`).join(', ')
    }`
  )
}

console.log(`已同步 Vue 基线构建产物到 ${target}`)
