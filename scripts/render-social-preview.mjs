import { existsSync } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')

const optionValue = (name, fallback) => {
  const prefix = `${name}=`
  const match = process.argv.slice(2).find(arg => arg.startsWith(prefix))
  return match ? match.slice(prefix.length) : fallback
}

const source = resolve(sourceRoot, optionValue('--source', '.github/social-preview.svg'))
const output = resolve(sourceRoot, optionValue('--output', '.github/social-preview.png'))
const width = Number(optionValue('--width', '1280'))
const height = Number(optionValue('--height', '640'))

if (!existsSync(source)) {
  throw new Error(`Social preview source not found: ${source}`)
}
if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
  throw new Error(`Invalid social preview size: ${width}x${height}`)
}

await mkdir(dirname(output), { recursive: true })

const result = spawnSync(
  'rsvg-convert',
  [
    source,
    '--width',
    String(width),
    '--height',
    String(height),
    '--format',
    'png',
    '--output',
    output
  ],
  {
    cwd: sourceRoot,
    encoding: 'utf8',
    stdio: 'pipe'
  }
)

if (result.status !== 0) {
  const details = [result.stderr, result.stdout].filter(Boolean).join('\n')
  throw new Error(`Failed to render social preview with rsvg-convert.${details ? `\n${details}` : ''}`)
}

const png = await readFile(output)
const pngSignature = '89504e470d0a1a0a'
if (png.subarray(0, 8).toString('hex') !== pngSignature) {
  throw new Error(`Rendered file is not a PNG: ${output}`)
}

const actualWidth = png.readUInt32BE(16)
const actualHeight = png.readUInt32BE(20)
if (actualWidth !== width || actualHeight !== height) {
  throw new Error(`Expected ${width}x${height}, got ${actualWidth}x${actualHeight}: ${output}`)
}

console.log(`Rendered ${output.replace(`${sourceRoot}/`, '')} (${actualWidth}x${actualHeight}).`)
