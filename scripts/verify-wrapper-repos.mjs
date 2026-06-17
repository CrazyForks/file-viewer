import { existsSync } from 'node:fs'
import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

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

const wrapperManifest = await readJson(join(sourceRoot, 'ecosystem', 'wrappers.json'))
const formatModule = await loadTypescriptModule(join(sourceRoot, 'packages/core/src/formats.ts'))
const rendererCount = formatModule.DEFAULT_RENDERER_DEFINITIONS.length
const extensionCount = formatModule.DEFAULT_SUPPORTED_EXTENSIONS.length

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

function dependencyBlocks(packageJson) {
  return [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.peerDependencies,
    packageJson.optionalDependencies
  ].filter(Boolean)
}

function isParentPath(value) {
  return typeof value === 'string' && (
    value.startsWith('../') ||
    value.startsWith('..\\') ||
    value.includes('/../') ||
    value.includes('\\..\\')
  )
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

async function verifyReadmePair(dir, wrapper, label) {
  const zhPath = join(dir, 'README.md')
  const enPath = join(dir, 'README.en.md')
  await assertFile(zhPath, `${label} README.md`)
  await assertFile(enPath, `${label} README.en.md`)

  const zh = await readFile(zhPath, 'utf8')
  const en = await readFile(enPath, 'utf8')
  for (const [locale, readme] of [['zh', zh], ['en', en]]) {
    const readmeLabel = `${label} ${locale} README`
    assertIncludes(readme, wrapper.packageName, readmeLabel)
    assertIncludes(readme, wrapper.github, readmeLabel)
    assertIncludes(readme, wrapper.gitee, readmeLabel)
    assertIncludes(readme, wrapperManifest.corePackage.packageName, readmeLabel)
    assertIncludes(readme, 'FILE_VIEWER_GENERATED:START', readmeLabel)
    assertIncludes(readme, 'FILE_VIEWER_GENERATED:END', readmeLabel)
    assertIncludes(readme, 'https://doc.flyfish.dev/', readmeLabel)
    assertIncludes(readme, 'https://viewer.flyfish.dev/', readmeLabel)
    assertIncludes(readme, 'Apache-2.0', readmeLabel)
    assertIncludes(readme, String(rendererCount), readmeLabel)
    assertIncludes(readme, String(extensionCount), readmeLabel)
    assertNotIncludes(readme, '4.99', readmeLabel)
    assertNotIncludes(readme, '6.22', readmeLabel)
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
  await verifyPackageEntrypointMetadata(repoDir, packageJson, wrapper.repository)
  for (const block of dependencyBlocks(packageJson)) {
    for (const [dependencyName, range] of Object.entries(block)) {
      if (String(range).includes('workspace:')) {
        throw new Error(`${wrapper.repository} dependency ${dependencyName} still uses ${range}`)
      }
    }
  }

  const standaloneManifest = await readJson(join(repoDir, 'wrapper-repo-manifest.json'))
  for (const [key, expected] of Object.entries({
    organization: wrapperManifest.organization,
    framework: wrapper.framework,
    packageName: wrapper.packageName,
    repository: wrapper.repository,
    github: wrapper.github,
    gitee: wrapper.gitee,
    sourcePackageDir: wrapper.packageDir,
    corePackage: wrapperManifest.corePackage.packageName,
    coreSourceVisibility: wrapperManifest.corePackage.visibility
  })) {
    if (standaloneManifest[key] !== expected) {
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
    const content = await readFile(file, 'utf8').catch(() => '')
    verifyStandalonePortableText(content, `${wrapper.repository}/${relativePath}`, exportedRepoForbiddenPatterns)
  }
}

for (const wrapper of wrapperManifest.wrappers) {
  await verifyPackageDir(wrapper)
  if (!sourceOnly) {
    await verifyExportedRepo(wrapper)
  }
  console.log(`Verified ${wrapper.packageName}`)
}

console.log(
  `Verified ${wrapperManifest.wrappers.length} wrapper package${wrapperManifest.wrappers.length === 1 ? '' : 's'}${sourceOnly ? '' : ` and standalone exports in ${outputRoot}`}.`
)
