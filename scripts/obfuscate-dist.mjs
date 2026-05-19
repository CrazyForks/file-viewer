import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'
import JavaScriptObfuscator from 'javascript-obfuscator'

const distDir = process.env.FILE_VIEWER_DIST_DIR
  ? resolve(process.env.FILE_VIEWER_DIST_DIR)
  : join(process.cwd(), 'dist')
const requestedTargets = process.argv.slice(2)
const targets = requestedTargets.map(target => isAbsolute(target) ? target : join(distDir, target))

async function collectFiles(dir) {
  const entries = await readdir(dir)
  for (const entry of entries) {
    const filePath = join(dir, entry)
    const fileStat = await stat(filePath)
    if (fileStat.isDirectory()) {
      await collectFiles(filePath)
    } else if (/\.(mjs|js)$/.test(entry)) {
      targets.push(filePath)
    }
  }
}

if (!requestedTargets.length) {
  await collectFiles(distDir)
}

for (const filePath of targets) {
  let source
  try {
    source = await readFile(filePath, 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') {
      console.warn(`skipped missing ${filePath.replace(`${process.cwd()}/`, '')}`)
      continue
    }
    throw error
  }
  const isLargeBundle = source.length > 1_000_000
  const result = JavaScriptObfuscator.obfuscate(source, {
    compact: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    identifierNamesGenerator: 'mangled',
    ignoreImports: true,
    renameGlobals: false,
    selfDefending: false,
    simplify: true,
    sourceMap: false,
    splitStrings: false,
    // Large UMD and worker bundles can exceed local memory when every string is lifted.
    stringArray: !isLargeBundle,
    stringArrayEncoding: [],
    stringArrayThreshold: isLargeBundle ? 0 : 0.2,
    target: 'browser',
    unicodeEscapeSequence: false
  })
  await writeFile(filePath, result.getObfuscatedCode(), 'utf8')
  console.log(`obfuscated ${filePath.replace(`${process.cwd()}/`, '')}`)
}
