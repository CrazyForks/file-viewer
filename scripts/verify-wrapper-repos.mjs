import { existsSync } from 'node:fs'
import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'
import { allowedEntryFormats, entryFormatLabels } from './lib/wrapper-entry-formats.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const args = process.argv.slice(2)

const readArg = (name, fallback) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}

const outputRoot = resolve(
  sourceRoot,
  readArg('--out-dir', process.env.FILE_VIEWER_WRAPPER_REPO_DIR || '.release/wrapper-repos')
)
const sourceOnly = args.includes('--source-only')
const selectedPackages = new Set(
  args
    .filter(arg => arg.startsWith('--package='))
    .map(arg => arg.slice('--package='.length))
)
const selectedIds = new Set(
  args
    .filter(arg => arg.startsWith('--id='))
    .map(arg => arg.slice('--id='.length))
)

const wrapperManifest = await readJson(join(sourceRoot, 'ecosystem', 'wrappers.json'))
const readmeTemplate = await readJson(join(sourceRoot, 'ecosystem', 'wrapper-readme-template.json'))
const formatModule = await loadTypescriptModule(join(sourceRoot, 'packages/core/src/formats.ts'))
const rendererCount = formatModule.DEFAULT_RENDERER_DEFINITIONS.length
const extensionCount = formatModule.DEFAULT_SUPPORTED_EXTENSIONS.length
const historicalPackageNames = new Set(
  wrapperManifest.wrappers.flatMap(wrapper => wrapper.historicalPackages)
)
const currentSourceBranch = runGit(['branch', '--show-current'])
const currentSourceCommit = runGit(['rev-parse', '--short', 'HEAD'])
async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function loadTypescriptModule(path) {
  const source = await readFile(path, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    },
    fileName: path
  })
  const module = { exports: {} }
  const sandbox = {
    exports: module.exports,
    module,
    require(specifier) {
      throw new Error(`Unexpected runtime import while reading ${path}: ${specifier}`)
    }
  }
  vm.runInNewContext(transpiled.outputText, sandbox, { filename: path })
  return module.exports
}

function runGit(commandArgs) {
  const result = spawnSync('git', commandArgs, {
    cwd: sourceRoot,
    encoding: 'utf8',
    stdio: 'pipe'
  })
  if (result.status !== 0) {
    throw new Error(`Command failed: git ${commandArgs.join(' ')}\n${result.stderr || result.stdout}`)
  }
  return result.stdout.trim()
}

async function assertDirectory(path, label = path) {
  if (!existsSync(path)) {
    throw new Error(`Missing directory: ${label}`)
  }
  const info = await stat(path)
  if (!info.isDirectory()) {
    throw new Error(`Not a directory: ${label}`)
  }
}

async function assertFile(path, label = path) {
  if (!existsSync(path)) {
    throw new Error(`Missing file: ${label}`)
  }
  const info = await stat(path)
  if (!info.isFile()) {
    throw new Error(`Not a file: ${label}`)
  }
}

function assertIncludes(text, expected, label) {
  if (!text.includes(expected)) {
    throw new Error(`${label} does not include ${expected}`)
  }
}

function assertNotIncludes(text, forbidden, label) {
  if (text.includes(forbidden)) {
    throw new Error(`${label} unexpectedly includes ${forbidden}`)
  }
}

const monorepoOnlyForbiddenPatterns = [
  '../../scripts/',
  '../..\\scripts\\',
  'pnpm --dir',
  'npm --prefix ../..',
  'yarn --cwd ../..'
]

const exportedRepoForbiddenPatterns = [
  ...monorepoOnlyForbiddenPatterns,
  'workspace:'
]

function verifyStandalonePortableText(text, label, patterns = monorepoOnlyForbiddenPatterns) {
  for (const pattern of patterns) {
    assertNotIncludes(text, pattern, label)
  }
}

function shouldVerifyExportedPortableText(relativePath) {
  return !relativePath.startsWith('viewer/')
}

function dependencyBlocks(packageJson) {
  return [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.peerDependencies,
    packageJson.optionalDependencies
  ].filter(Boolean)
}

function verifyNoHistoricalPackageDependency(packageJson, label) {
  for (const block of dependencyBlocks(packageJson)) {
    for (const dependencyName of Object.keys(block)) {
      if (historicalPackageNames.has(dependencyName)) {
        throw new Error(`${label} must not depend on historical compatibility package ${dependencyName}`)
      }
    }
  }
}

function verifyWrapperEntryFormats(wrapper, packageJson, label) {
  if (!Array.isArray(wrapper.entryFormats) || !wrapper.entryFormats.length) {
    throw new Error(`${label} wrapper manifest must declare entryFormats`)
  }

  for (const format of wrapper.entryFormats) {
    if (!allowedEntryFormats.has(format)) {
      throw new Error(`${label} wrapper manifest has unsupported entry format: ${format}`)
    }
  }

  if (wrapper.entryFormats.includes('esm')) {
    if (!packageJson.module || !packageJson.exports?.['.']?.import) {
      throw new Error(`${label} declares ESM but package.json is missing module or exports["."].import`)
    }
  }

  if (wrapper.entryFormats.includes('types')) {
    if (!packageJson.types || !packageJson.exports?.['.']?.types) {
      throw new Error(`${label} declares type declarations but package.json is missing types or exports["."].types`)
    }
  }

  if (wrapper.entryFormats.includes('iife')) {
    if (!packageJson.unpkg || !packageJson.jsdelivr) {
      throw new Error(`${label} declares IIFE but package.json is missing unpkg/jsdelivr browser bundle metadata`)
    }
  }

  if (wrapper.entryFormats.includes('viewer-assets')) {
    if (!packageJson.exports?.['./viewer/*']) {
      throw new Error(`${label} declares bundled viewer assets but package.json is missing exports["./viewer/*"]`)
    }
    if (!packageJson.files?.includes('viewer')) {
      throw new Error(`${label} declares bundled viewer assets but package.json files does not include viewer`)
    }
  }

  if (wrapper.entryFormats.includes('copy-assets-cli')) {
    if (!packageJson.bin?.['file-viewer-copy-assets']) {
      throw new Error(`${label} declares asset copy CLI but package.json is missing bin.file-viewer-copy-assets`)
    }
  }

  if (wrapper.entryFormats.includes('svelte-component')) {
    if (!packageJson.exports?.['.']?.svelte || !String(packageJson.exports['.'].svelte).endsWith('.svelte')) {
      throw new Error(`${label} declares Svelte component but exports["."].svelte is missing`)
    }
  }
}

function isParentPath(value) {
  return typeof value === 'string' && (
    value.startsWith('../') ||
    value.startsWith('..\\') ||
    value.includes('/../') ||
    value.includes('\\..\\')
  )
}

const sourceBoundaryExtensions = new Set([
  '.js',
  '.mjs',
  '.ts',
  '.tsx',
  '.svelte',
  '.json'
])

function extensionOf(path) {
  const dotIndex = path.lastIndexOf('.')
  return dotIndex >= 0 ? path.slice(dotIndex) : ''
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hasPackageReference(content, packageName) {
  const escaped = escapeRegExp(packageName)
  return new RegExp(`(^|[^@\\w./-])['"]${escaped}['"]`, 'm').test(content) ||
    new RegExp(`['"]${escaped}['"]\\s*:`, 'm').test(content)
}

function shouldVerifyBoundaryFile(relativePath) {
  if (
    relativePath === 'README.md' ||
    relativePath === 'README.en.md' ||
    relativePath === 'wrapper-repo-manifest.json' ||
    relativePath.startsWith('viewer/')
  ) {
    return false
  }
  return (
    relativePath === 'package.json' ||
    relativePath === 'tsconfig.json' ||
    relativePath.startsWith('src/') ||
    relativePath.startsWith('scripts/')
  ) && sourceBoundaryExtensions.has(extensionOf(relativePath))
}

async function verifyNoHistoricalPackageReferences(dir, label) {
  const files = await readAllFiles(dir)
  for (const file of files) {
    const relativePath = file.slice(dir.length + 1)
    if (!shouldVerifyBoundaryFile(relativePath)) {
      continue
    }
    const content = await readFile(file, 'utf8').catch(() => '')
    for (const historicalPackage of historicalPackageNames) {
      if (hasPackageReference(content, historicalPackage)) {
        throw new Error(`${label}/${relativePath} must not reference historical compatibility package ${historicalPackage}`)
      }
    }
  }
}

function collectExportEntrypoints(value, paths = new Set()) {
  if (!value) {
    return paths
  }
  if (typeof value === 'string') {
    paths.add(value)
    return paths
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectExportEntrypoints(item, paths)
    }
    return paths
  }
  if (typeof value === 'object') {
    for (const item of Object.values(value)) {
      collectExportEntrypoints(item, paths)
    }
  }
  return paths
}

function collectPackageEntrypoints(packageJson) {
  const entrypoints = new Set()
  for (const field of ['main', 'module', 'browser', 'types', 'svelte']) {
    if (typeof packageJson[field] === 'string') {
      entrypoints.add(packageJson[field])
    }
  }
  for (const item of collectExportEntrypoints(packageJson.exports)) {
    entrypoints.add(item)
  }
  return [...entrypoints].filter(entrypoint =>
    !entrypoint.startsWith('/') &&
    !entrypoint.includes(':') &&
    !entrypoint.includes('*') &&
    !entrypoint.startsWith('#') &&
    entrypoint !== './' &&
    entrypoint !== '.'
  )
}

async function verifyPackageEntrypointMetadata(dir, packageJson, label) {
  for (const field of ['main', 'module', 'types']) {
    if (!packageJson[field]) {
      throw new Error(`${label} package.json is missing ${field}`)
    }
  }
  if (!packageJson.exports?.['.']) {
    throw new Error(`${label} package.json is missing exports["."]`)
  }

  for (const entrypoint of collectPackageEntrypoints(packageJson)) {
    if (entrypoint.includes('/dist/') || entrypoint.startsWith('dist/')) {
      continue
    }
    await assertFile(join(dir, entrypoint), `${label} package entry ${entrypoint}`)
  }
}

async function verifyExportedTsConfig(repoDir, label) {
  const tsconfigPath = join(repoDir, 'tsconfig.json')
  if (!existsSync(tsconfigPath)) {
    return
  }

  const tsconfig = await readJson(tsconfigPath)
  const paths = tsconfig.compilerOptions?.paths || {}
  for (const [alias, targets] of Object.entries(paths)) {
    const targetList = Array.isArray(targets) ? targets : [targets]
    for (const target of targetList) {
      if (isParentPath(target)) {
        throw new Error(`${label} tsconfig paths.${alias} still points outside the standalone repo: ${target}`)
      }
    }
  }

  for (const reference of tsconfig.references || []) {
    if (isParentPath(reference?.path)) {
      throw new Error(`${label} tsconfig reference still points outside the standalone repo: ${reference.path}`)
    }
  }
}

async function verifyExportedWebViewerAssets(repoDir, label) {
  const viewerDir = join(repoDir, 'viewer')
  await assertDirectory(viewerDir, `${label}/viewer`)
  for (const file of [
    'index.html',
    'compare.html',
    'flyfish-viewer-assets.json',
    'flyfish-viewer-manifest.json'
  ]) {
    await assertFile(join(viewerDir, file), `${label}/viewer/${file}`)
  }
  await assertDirectory(join(viewerDir, 'assets'), `${label}/viewer/assets`)
  await assertDirectory(join(viewerDir, 'wasm'), `${label}/viewer/wasm`)
}

async function verifyReadmePair(dir, wrapper, label) {
  if (readmeTemplate.schemaVersion !== 1) {
    throw new Error('ecosystem/wrapper-readme-template.json schemaVersion must be 1')
  }

  const zhPath = join(dir, 'README.md')
  const enPath = join(dir, 'README.en.md')
  await assertFile(zhPath, `${label} README.md`)
  await assertFile(enPath, `${label} README.en.md`)

  const zh = await readFile(zhPath, 'utf8')
  const en = await readFile(enPath, 'utf8')
  for (const [locale, readme] of [['zh', zh], ['en', en]]) {
    const template = readmeTemplate.locales[locale]
    const readmeLabel = `${label} ${locale} README`
    assertIncludes(readme, wrapper.packageName, readmeLabel)
    assertIncludes(readme, wrapper.github, readmeLabel)
    assertIncludes(readme, wrapper.gitee, readmeLabel)
    assertIncludes(readme, wrapperManifest.corePackage.packageName, readmeLabel)
    assertIncludes(readme, readmeTemplate.markers.wrapperGenerated.start, readmeLabel)
    assertIncludes(readme, readmeTemplate.markers.wrapperGenerated.end, readmeLabel)
    assertIncludes(readme, template.wrapperEcosystemHeading, readmeLabel)
    assertIncludes(readme, template.wrapperFormatHeading, readmeLabel)
    for (const header of [
      ...template.wrapperMatrixHeaders,
      ...template.formatMatrixHeaders
    ]) {
      assertIncludes(readme, header, readmeLabel)
    }
    for (const requiredLink of readmeTemplate.requiredLinks) {
      assertIncludes(readme, requiredLink, readmeLabel)
    }
    for (const requiredTerm of readmeTemplate.requiredTerms) {
      assertIncludes(readme, requiredTerm, readmeLabel)
    }
    assertIncludes(readme, String(rendererCount), readmeLabel)
    assertIncludes(readme, String(extensionCount), readmeLabel)
    assertNotIncludes(readme, '4.99', readmeLabel)
    assertNotIncludes(readme, '6.22', readmeLabel)
    for (const ecosystemWrapper of wrapperManifest.wrappers) {
      assertIncludes(readme, ecosystemWrapper.packageName, readmeLabel)
      assertIncludes(readme, ecosystemWrapper.github, readmeLabel)
      assertIncludes(readme, ecosystemWrapper.gitee, readmeLabel)
      const labels = entryFormatLabels(locale)
      for (const format of ecosystemWrapper.entryFormats || []) {
        assertIncludes(readme, labels[format] || format, readmeLabel)
      }
    }
    for (const historicalPackage of wrapper.historicalPackages) {
      assertIncludes(readme, historicalPackage, readmeLabel)
    }
  }

  assertIncludes(zh, 'npm install', `${label} README.md`)
  assertIncludes(en, 'npm install', `${label} README.en.md`)
}

async function verifyPackageDir(wrapper) {
  const packageDir = join(sourceRoot, wrapper.packageDir)
  await assertDirectory(packageDir, wrapper.packageDir)
  await verifyReadmePair(packageDir, wrapper, wrapper.packageDir)

  const packageJsonPath = join(packageDir, 'package.json')
  await assertFile(packageJsonPath, `${wrapper.packageDir}/package.json`)
  const packageJson = await readJson(packageJsonPath)
  if (packageJson.name !== wrapper.packageName) {
    throw new Error(`${wrapper.packageDir} package name mismatch: ${packageJson.name} !== ${wrapper.packageName}`)
  }
  if (packageJson.private === true) {
    throw new Error(`${wrapper.packageDir} must be publishable, but package.json has private=true`)
  }
  verifyNoHistoricalPackageDependency(packageJson, `${wrapper.packageDir}/package.json`)
  verifyWrapperEntryFormats(wrapper, packageJson, `${wrapper.packageDir}/package.json`)
  await verifyNoHistoricalPackageReferences(packageDir, wrapper.packageDir)
  verifyStandalonePortableText(JSON.stringify(packageJson), `${wrapper.packageDir}/package.json`)
  await verifyPackageEntrypointMetadata(packageDir, packageJson, wrapper.packageDir)
}

async function readAllFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await readAllFiles(path))
    } else if (entry.isFile()) {
      files.push(path)
    }
  }
  return files
}

async function verifyExportedRepo(wrapper) {
  const repoDir = join(outputRoot, wrapper.repository)
  await assertDirectory(repoDir, wrapper.repository)
  await verifyReadmePair(repoDir, wrapper, wrapper.repository)
  await assertFile(join(repoDir, 'LICENSE'), `${wrapper.repository}/LICENSE`)
  await assertFile(join(repoDir, '.gitignore'), `${wrapper.repository}/.gitignore`)
  await assertFile(join(repoDir, 'wrapper-repo-manifest.json'), `${wrapper.repository}/wrapper-repo-manifest.json`)

  const packageJson = await readJson(join(repoDir, 'package.json'))
  if (packageJson.name !== wrapper.packageName) {
    throw new Error(`${wrapper.repository} package name mismatch: ${packageJson.name} !== ${wrapper.packageName}`)
  }
  if (packageJson.private !== false) {
    throw new Error(`${wrapper.repository} package.json must set private=false`)
  }
  if (packageJson.repository?.url !== `git+${wrapper.github}.git`) {
    throw new Error(`${wrapper.repository} repository URL mismatch`)
  }
  if (packageJson.homepage !== wrapper.github) {
    throw new Error(`${wrapper.repository} homepage mismatch`)
  }
  if (packageJson.bugs?.url !== `${wrapper.github}/issues`) {
    throw new Error(`${wrapper.repository} bugs URL mismatch`)
  }
  await verifyExportedTsConfig(repoDir, wrapper.repository)
  if (wrapper.id === 'web') {
    await verifyExportedWebViewerAssets(repoDir, wrapper.repository)
  }
  await verifyPackageEntrypointMetadata(repoDir, packageJson, wrapper.repository)
  verifyNoHistoricalPackageDependency(packageJson, `${wrapper.repository}/package.json`)
  verifyWrapperEntryFormats(wrapper, packageJson, `${wrapper.repository}/package.json`)
  await verifyNoHistoricalPackageReferences(repoDir, wrapper.repository)
  for (const block of dependencyBlocks(packageJson)) {
    for (const [dependencyName, range] of Object.entries(block)) {
      if (String(range).includes('workspace:')) {
        throw new Error(`${wrapper.repository} dependency ${dependencyName} still uses ${range}`)
      }
    }
  }

  const standaloneManifest = await readJson(join(repoDir, 'wrapper-repo-manifest.json'))
  for (const [key, expected] of Object.entries({
    sourceBranch: currentSourceBranch,
    sourceCommit: currentSourceCommit,
    organization: wrapperManifest.organization,
    framework: wrapper.framework,
    packageName: wrapper.packageName,
    repository: wrapper.repository,
    github: wrapper.github,
    gitee: wrapper.gitee,
    entryFormats: JSON.stringify(wrapper.entryFormats),
    sourcePackageDir: wrapper.packageDir,
    corePackage: wrapperManifest.corePackage.packageName,
    coreSourceVisibility: wrapperManifest.corePackage.visibility
  })) {
    const actual = key === 'entryFormats' ? JSON.stringify(standaloneManifest.entryFormats) : standaloneManifest[key]
    if (actual !== expected) {
      throw new Error(`${wrapper.repository} manifest ${key} mismatch: ${standaloneManifest[key]} !== ${expected}`)
    }
  }

  const allFiles = await readAllFiles(repoDir)
  for (const file of allFiles) {
    const relativePath = file.slice(repoDir.length + 1)
    if (
      relativePath.includes('node_modules/') ||
      relativePath.startsWith('dist/') ||
      relativePath.startsWith('packages/')
    ) {
      throw new Error(`${wrapper.repository} exported build/dependency output leaked: ${relativePath}`)
    }
    if (shouldVerifyExportedPortableText(relativePath)) {
      const content = await readFile(file, 'utf8').catch(() => '')
      verifyStandalonePortableText(content, `${wrapper.repository}/${relativePath}`, exportedRepoForbiddenPatterns)
    }
  }
}

const wrappers = wrapperManifest.wrappers.filter(wrapper => {
  if (selectedPackages.size && !selectedPackages.has(wrapper.packageName)) {
    return false
  }
  if (selectedIds.size && !selectedIds.has(wrapper.id)) {
    return false
  }
  return true
})

if (!wrappers.length) {
  throw new Error('No wrappers selected for verification.')
}

for (const wrapper of wrappers) {
  await verifyPackageDir(wrapper)
  if (!sourceOnly) {
    await verifyExportedRepo(wrapper)
  }
  console.log(`Verified ${wrapper.packageName}`)
}

console.log(
  `Verified ${wrappers.length} wrapper package${wrappers.length === 1 ? '' : 's'}${sourceOnly ? '' : ` and standalone exports in ${outputRoot}`}.`
)
