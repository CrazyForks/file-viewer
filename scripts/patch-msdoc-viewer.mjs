import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const rootRequire = createRequire(import.meta.url)
const coreRequire = createRequire(path.resolve('packages/core/package.json'))

const ORIGINAL_READ_SECTOR = `function readSectorAbsolute(bytes, sectorSize, sid) {
    const start = 512 + sid * sectorSize;
    const end = start + sectorSize;
    if (start < 0 || end > bytes.length) {
        throw new Error(\`Sector \${sid} is out of bounds\`);
    }
    return bytes.subarray(start, end);
}`

const PATCHED_READ_SECTOR = `function readSectorAbsolute(bytes, sectorSize, sid) {
    const start = 512 + sid * sectorSize;
    const end = start + sectorSize;
    if (start < 0 || start >= bytes.length) {
        throw new Error(\`Sector \${sid} is out of bounds\`);
    }
    if (end <= bytes.length) {
        return bytes.subarray(start, end);
    }
    const sector = new Uint8Array(sectorSize);
    sector.set(bytes.subarray(start));
    return sector;
}`

function resolveCfbPath() {
  let packageJsonPath
  try {
    packageJsonPath = coreRequire.resolve('msdoc-viewer/package.json')
  } catch {
    packageJsonPath = rootRequire.resolve('msdoc-viewer/package.json')
  }
  return path.join(path.dirname(packageJsonPath), 'dist/core/cfb.js')
}

function patchMsDocViewer() {
  const cfbPath = resolveCfbPath()
  const source = fs.readFileSync(cfbPath, 'utf8')

  if (source.includes(PATCHED_READ_SECTOR)) {
    console.log('[file-viewer] msdoc-viewer CFB patch already applied.')
    return
  }

  if (!source.includes(ORIGINAL_READ_SECTOR)) {
    throw new Error(
      [
        '[file-viewer] Unable to patch msdoc-viewer: expected readSectorAbsolute implementation was not found.',
        `Checked file: ${cfbPath}`,
        'The dependency may have changed; please review the CFB partial-sector compatibility fix manually.'
      ].join('\n')
    )
  }

  fs.writeFileSync(cfbPath, source.replace(ORIGINAL_READ_SECTOR, PATCHED_READ_SECTOR))
  console.log('[file-viewer] Patched msdoc-viewer CFB partial-sector reader.')
}

try {
  patchMsDocViewer()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
