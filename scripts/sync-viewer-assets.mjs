import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import rootPackage from '../package.json' with { type: 'json' }

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const source = resolve(root, 'dist')
const target = resolve(root, 'packages/web/viewer')

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

console.log(`已同步 Vue 基线构建产物到 ${target}`)
