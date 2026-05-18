import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import JavaScriptObfuscator from 'javascript-obfuscator'

const distDir = join(process.cwd(), 'dist')
const targets = []

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

await collectFiles(distDir)

for (const filePath of targets) {
  const source = await readFile(filePath, 'utf8')
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
    stringArray: true,
    stringArrayEncoding: [],
    stringArrayThreshold: 0.2,
    target: 'browser',
    unicodeEscapeSequence: false
  })
  await writeFile(filePath, result.getObfuscatedCode(), 'utf8')
  console.log(`obfuscated ${filePath.replace(`${process.cwd()}/`, '')}`)
}
