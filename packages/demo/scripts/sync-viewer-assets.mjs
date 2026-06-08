import { cp, mkdir, readdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const demoDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoDir = resolve(demoDir, '../..')
const sourceDir = resolve(repoDir, 'packages/web/viewer')
const targetDirs = [
  resolve(demoDir, 'public/file-viewer'),
  resolve(demoDir, 'public/vendor/file-viewer')
]
const exampleSourceDir = resolve(repoDir, 'public/example')
const exampleTargetDir = resolve(demoDir, 'public/example')

if (!existsSync(resolve(sourceDir, 'index.html'))) {
  throw new Error('缺少 packages/web/viewer/index.html，请先运行 pnpm build:viewer-assets')
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

for (const targetDir of targetDirs) {
  await rm(targetDir, { force: true, recursive: true })
  await mkdir(targetDir, { recursive: true })
  await cp(sourceDir, targetDir, { recursive: true })
  await removeMacMetadata(targetDir)
  console.log(`[file-viewer-demo] viewer assets copied to ${targetDir}`)
}

await mkdir(exampleTargetDir, { recursive: true })
await cp(resolve(exampleSourceDir, 'word.docx'), resolve(exampleTargetDir, 'word.docx'))
console.log(`[file-viewer-demo] docx example copied to ${exampleTargetDir}`)
