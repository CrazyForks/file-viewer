import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const coreRoot = join(sourceRoot, 'packages', 'core')
const corePackagePath = join(coreRoot, 'package.json')
const coreSrcRoot = join(coreRoot, 'src')

const forbiddenPackages = [
  'vue',
  '@vue/',
  '@vitejs/plugin-vue',
  '@vitejs/plugin-vue-jsx',
  'vue-tsc',
  '@lucide/vue',
  'react',
  'react-dom',
  'svelte',
  '@file-viewer/vue3',
  '@file-viewer/vue2.7',
  '@file-viewer/vue2.6',
  '@file-viewer/react',
  '@file-viewer/react-legacy',
  '@file-viewer/web',
  '@file-viewer/jquery',
  '@file-viewer/svelte',
  '@flyfish-group/file-viewer',
  '@flyfish-group/file-viewer3',
  '@flyfish-group/file-viewer-react',
  '@flyfish-group/file-viewer-web',
  'file-viewer3',
]

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function matchesForbiddenPackage(name) {
  return forbiddenPackages.some(forbidden =>
    forbidden.endsWith('/')
      ? name.startsWith(forbidden)
      : name === forbidden
  )
}

function collectDependencies(packageJson) {
  return {
    ...(packageJson.dependencies || {}),
    ...(packageJson.peerDependencies || {}),
    ...(packageJson.optionalDependencies || {}),
    ...(packageJson.devDependencies || {}),
  }
}

async function listSourceFiles(dir) {
  const entries = await readdir(dir)
  const files = []
  for (const entry of entries) {
    const path = join(dir, entry)
    const entryStat = await stat(path)
    if (entryStat.isDirectory()) {
      files.push(...await listSourceFiles(path))
      continue
    }
    if (/\.(ts|tsx|mts|cts|js|mjs|cjs)$/.test(entry)) {
      files.push(path)
    }
  }
  return files
}

const corePackageJson = JSON.parse(await readFile(corePackagePath, 'utf8'))
for (const depName of Object.keys(collectDependencies(corePackageJson))) {
  assert(
    !matchesForbiddenPackage(depName),
    `@file-viewer/core must not depend on framework or wrapper package "${depName}"`
  )
}

const importPattern = /\b(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g
const dynamicImportPattern = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g
const files = await listSourceFiles(coreSrcRoot)

for (const file of files) {
  const source = await readFile(file, 'utf8')
  const imports = [
    ...source.matchAll(importPattern),
    ...source.matchAll(dynamicImportPattern),
  ].map(match => match[1])

  for (const importId of imports) {
    assert(
      !matchesForbiddenPackage(importId),
      `@file-viewer/core source must not import framework or wrapper package "${importId}" in ${file}`
    )
  }
}

console.log(`[core-framework-neutral] Verified @file-viewer/core has no framework/component package dependencies across ${files.length} source files.`)
