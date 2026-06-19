import { spawnSync } from 'node:child_process'
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import viewerPackage from '../packages/components/web/package.json' with { type: 'json' }

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const source = resolve(
  root,
  process.env.FILE_VIEWER_DEMO_OUTPUT_DIR ||
    process.env.DEMO_OUTPUT_DIR ||
    'apps/viewer-demo/dist'
)
const targets = [
  resolve(root, 'packages/compat/web/viewer'),
  resolve(root, 'packages/components/web/viewer')
]
const coreAssetsEntry = resolve(root, 'packages/core/dist/assets.js')
const viewerAssetManifestFilename = 'flyfish-viewer-assets.json'

if (!existsSync(resolve(source, 'index.html'))) {
  throw new Error(`缺少 ${source}/index.html，请先运行 pnpm build-only`)
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

const readExistingJson = async path => {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch {
    return undefined
  }
}

const stripVolatileAssetManifestFields = manifest => {
  const stableManifest = JSON.parse(JSON.stringify(manifest))
  delete stableManifest.generatedAt
  if (stableManifest.validation) {
    delete stableManifest.validation.checkedAt
  }
  return stableManifest
}

const keepExistingAssetManifestTimestampWhenStable = (existingManifest, nextManifest) => {
  if (!existingManifest) {
    return nextManifest
  }

  const existingStable = stripVolatileAssetManifestFields(existingManifest)
  const nextStable = stripVolatileAssetManifestFields(nextManifest)
  if (JSON.stringify(existingStable) === JSON.stringify(nextStable)) {
    return existingManifest
  }

  return nextManifest
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

const copyDeclaredViewerAssets = async target => {
  const declaredAssets = listFileViewerRendererAssetManifests()
    .flatMap(manifest => manifest.assets)
    .filter(asset => asset.target === 'public' && asset.defaultPath)

  for (const asset of declaredAssets) {
    const sourcePath = resolve(source, asset.defaultPath)
    if (!existsSync(sourcePath)) {
      continue
    }

    const targetPath = resolve(target, asset.defaultPath)
    await mkdir(dirname(targetPath), { recursive: true })
    await cp(sourcePath, targetPath, { recursive: true })
  }
}

for (const target of targets) {
  const previousAssetManifest = await readExistingJson(
    resolve(target, viewerAssetManifestFilename)
  )

  await rm(target, { force: true, recursive: true })
  await mkdir(target, { recursive: true })
  await copyDeclaredViewerAssets(target)
  await removeMacMetadata(target)

  await writeFile(
    resolve(target, 'flyfish-viewer-manifest.json'),
    `${JSON.stringify({
      name: viewerPackage.name,
      version: viewerPackage.version,
      kind: 'viewer-assets',
      assets: viewerAssetManifestFilename
    }, null, 2)}\n`
  )

  const validation = await validateViewerAssets(target)
  const assetManifest = keepExistingAssetManifestTimestampWhenStable(
    previousAssetManifest,
    {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      rendererAssetManifests: listFileViewerRendererAssetManifests(),
      validation: toManifestValidation(validation)
    }
  )

  await writeFile(
    resolve(target, viewerAssetManifestFilename),
    `${JSON.stringify(assetManifest, null, 2)}\n`
  )

  if (!validation.valid) {
    throw new Error(
      `Vue 基线 viewer 缺少必要 worker/WASM 资源: ${
        validation.missingRequired.map(asset => `${asset.rendererId}:${asset.relativePath}`).join(', ')
      }`
    )
  }

  console.log(`已同步 viewer 资源到 ${target}`)
}
