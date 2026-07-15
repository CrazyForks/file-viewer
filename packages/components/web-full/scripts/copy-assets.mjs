#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { copyViewerAssets } from '@file-viewer/web/node'

const packageDir = fileURLToPath(new URL('..', import.meta.url))
const packageJson = JSON.parse(await readFile(resolve(packageDir, 'package.json'), 'utf8'))
const args = process.argv.slice(2)
const skip = process.env.FILE_VIEWER_SKIP_ASSET_COPY === '1' ||
  process.env.FILE_VIEWER_SKIP_ASSET_COPY === 'true'

if (args.includes('--help') || args.includes('-h')) {
  console.log(`file-viewer-copy-assets ${packageJson.version}

Copy the complete @file-viewer/web-full distribution into a static directory.

Usage:
  file-viewer-copy-assets [target-directory] [--no-clean]

The default target is ./public/file-viewer.`)
  process.exit(0)
}

if (args.includes('--version') || args.includes('-v')) {
  console.log(packageJson.version)
  process.exit(0)
}

if (skip) {
  console.log('[file-viewer-copy-assets] skipped by FILE_VIEWER_SKIP_ASSET_COPY')
  process.exit(0)
}

const unknownOption = args.find(argument => argument.startsWith('-') && argument !== '--no-clean')
if (unknownOption) {
  throw new Error(`Unknown option: ${unknownOption}`)
}

const targets = args.filter(argument => !argument.startsWith('-'))
if (targets.length > 1) {
  throw new Error(`Only one target directory is supported, received: ${targets.join(', ')}`)
}

const result = await copyViewerAssets({
  sourceDir: resolve(packageDir, 'dist'),
  targetDir: targets[0] || process.env.FILE_VIEWER_PUBLIC_DIR,
  clean: !args.includes('--no-clean')
})

console.log(`[file-viewer-copy-assets] copied @file-viewer/web-full to ${result.targetDir}`)
console.log(`[file-viewer-copy-assets] wrote manifest ${result.assetManifestPath}`)
