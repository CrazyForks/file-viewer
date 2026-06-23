import { createReadStream, existsSync } from 'node:fs'
import { cp, mkdir, readFile, readdir, rename, rm, stat, utimes, writeFile } from 'node:fs/promises'
import { basename, join, relative, resolve, sep } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { loadEcosystemReleaseContext, readJson } from './lib/ecosystem-packages.mjs'
import { assertOpenSourceMainRepoLayout } from './lib/public-main.mjs'

const sourceRoot = process.cwd()
const args = process.argv.slice(2)

function readArg(name, fallback) {
  const index = args.indexOf(name)
  if (index >= 0) {
    return args[index + 1]
  }
  return fallback
}

const publicRepoDir = resolve(
  readArg('--public-repo-dir', process.env.FILE_VIEWER_PUBLIC_REPO_DIR || '../file-viewer-public')
)
const skipBuild = args.includes('--skip-build')
const keepOldArtifacts = args.includes('--keep-old-artifacts')
const includeLegacyVue2Tarball =
  args.includes('--include-legacy-vue2-tarball') ||
  process.env.FILE_VIEWER_INCLUDE_LEGACY_VUE2_TARBALL === '1'
const skipVue2Tarball = args.includes('--skip-vue2-tarball') || !includeLegacyVue2Tarball
const slimArtifacts =
  (args.includes('--slim') || process.env.FILE_VIEWER_PUBLIC_SLIM === '1') &&
  !args.includes('--expanded-assets')
const keepExpandedAssets = !slimArtifacts
const {
  rootPackage: packageJson,
  wrapperManifest,
  entries: ecosystemPackageEntries
} = await loadEcosystemReleaseContext(sourceRoot)
const branchRoles = await readJson(join(sourceRoot, 'ecosystem', 'branch-roles.json'))
const releaseSourceBranch = branchRoles.currentSourceBranch || currentBranch()
const version = packageJson.version
const vue2Tarball = resolve(
  readArg(
    '--vue2-tarball',
    process.env.FILE_VIEWER_VUE2_TARBALL ||
      join(sourceRoot, '..', 'file-viewer', `flyfish-group-file-viewer-${version}.tgz`)
  )
)
const releaseDir = join(sourceRoot, '.release', `file-viewer-v2-${version}`)
const demoStagingDir = join(releaseDir, 'demo')
const wrapperDemoStagingDir = join(releaseDir, 'component-demo')
const ecosystemPackDir = join(releaseDir, 'ecosystem')
const legacyStandaloneDemoArtifactSegment = ['adapter', 'demo'].join('-')
const viewerDemoDistDir = join(sourceRoot, 'apps', 'viewer-demo', 'dist')
const viewerDemoExampleDir = join(sourceRoot, 'apps', 'viewer-demo', 'public', 'example')
const vue3LibraryDistDir = join(sourceRoot, 'packages', 'components', 'vue3', 'dist')
const stableArchiveDate = new Date('2020-01-01T00:00:00.000Z')

function run(command, commandArgs, options = {}) {
  console.log(`$ ${[command, ...commandArgs].join(' ')}`)
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd || sourceRoot,
    stdio: options.capture ? 'pipe' : 'inherit',
    encoding: 'utf8'
  })
  if (result.status !== 0) {
    const details = result.stderr || result.stdout || ''
    throw new Error(`Command failed: ${command} ${commandArgs.join(' ')}\n${details}`)
  }
  return result.stdout?.trim() || ''
}

async function assertDirectory(path, label) {
  if (!existsSync(path)) {
    throw new Error(`${label} does not exist: ${path}`)
  }
  const info = await stat(path)
  if (!info.isDirectory()) {
    throw new Error(`${label} is not a directory: ${path}`)
  }
}

async function assertFile(path, label) {
  if (!existsSync(path)) {
    throw new Error(`${label} does not exist: ${path}`)
  }
  const info = await stat(path)
  if (!info.isFile()) {
    throw new Error(`${label} is not a file: ${path}`)
  }
}

async function assertCleanGitRepo(repoDir, label) {
  const gitMetadataPath = join(repoDir, '.git')
  if (!existsSync(gitMetadataPath)) {
    throw new Error(`${label} git metadata does not exist: ${gitMetadataPath}`)
  }
  const gitMetadata = await stat(gitMetadataPath)
  if (!gitMetadata.isDirectory() && !gitMetadata.isFile()) {
    throw new Error(`${label} git metadata must be a .git directory or worktree .git file: ${gitMetadataPath}`)
  }
  const status = run('git', ['status', '--porcelain'], { cwd: repoDir, capture: true })
  if (status) {
    throw new Error(`${label} has uncommitted changes. Commit or clean it first:\n${status}`)
  }
}

function currentBranch() {
  return run('git', ['branch', '--show-current'], { capture: true })
}

function currentCommit() {
  return run('git', ['rev-parse', 'HEAD'], { capture: true })
}

function remoteHeadForBranch(remoteName, branchName) {
  const refs = run('git', ['ls-remote', '--heads', remoteName, branchName], { capture: true })
  const line = refs
    .split('\n')
    .map(value => value.trim())
    .find(Boolean)
  return line ? line.split(/\s+/)[0] : ''
}

function assertReleaseSourceBranch() {
  const sourceRemoteName = branchRoles.sourceRemote?.name || 'origin'
  const branch = currentBranch()
  if (branch === releaseSourceBranch) {
    return
  }
  const remoteHead = remoteHeadForBranch(sourceRemoteName, releaseSourceBranch)
  if (remoteHead && remoteHead === currentCommit()) {
    return
  }
  if (process.env.FILE_VIEWER_ALLOW_NON_SOURCE_BRANCH === '1') {
    return
  }
  throw new Error(
    `Open-source main repository releases must be prepared from ${releaseSourceBranch} or an identical HEAD. Current branch ${branch || '(detached)'} does not match ${sourceRemoteName}/${releaseSourceBranch}.`
  )
}

async function removePath(path) {
  await rm(path, { recursive: true, force: true })
}

async function fileDigest(path) {
  return new Promise((resolveDigest, rejectDigest) => {
    const hash = createHash('sha256')
    const stream = createReadStream(path)
    stream.on('data', chunk => hash.update(chunk))
    stream.on('error', rejectDigest)
    stream.on('end', () => resolveDigest(hash.digest('hex')))
  })
}

async function filesEqual(left, right) {
  if (!existsSync(left) || !existsSync(right)) {
    return false
  }
  const [leftStat, rightStat] = await Promise.all([stat(left), stat(right)])
  if (leftStat.size !== rightStat.size) {
    return false
  }
  const [leftDigest, rightDigest] = await Promise.all([fileDigest(left), fileDigest(right)])
  return leftDigest === rightDigest
}

async function replaceFileIfChanged(sourceFile, targetFile, label = targetFile) {
  if (await filesEqual(sourceFile, targetFile)) {
    await removePath(sourceFile)
    console.log(`unchanged ${label}`)
    return false
  }
  await removePath(targetFile)
  await rename(sourceFile, targetFile)
  return true
}

async function copyFileIfChanged(sourceFile, targetFile, label = targetFile) {
  if (await filesEqual(sourceFile, targetFile)) {
    console.log(`unchanged ${label}`)
    return false
  }
  await cp(sourceFile, targetFile, { force: true })
  return true
}

async function writeTextIfChanged(targetFile, content, label = targetFile) {
  if (existsSync(targetFile) && (await readFile(targetFile, 'utf8')) === content) {
    console.log(`unchanged ${label}`)
    return false
  }
  await writeFile(targetFile, content, 'utf8')
  return true
}

async function copyCleanDir(from, to) {
  await removePath(to)
  await cp(from, to, {
    recursive: true,
    force: true,
    filter: source => {
      const name = basename(source)
      return name !== '.DS_Store' && name !== '.git' && name !== '.vercel' && name !== '.gitignore'
    }
  })
}

async function copySourceDir(from, to, options = {}) {
  const excludedRelativePaths = new Set(options.exclude || [])
  await removePath(to)
  await cp(from, to, {
    recursive: true,
    force: true,
    filter: source => {
      const name = basename(source)
      const relativePath = relative(from, source).split(sep).join('/')
      if (
        name === '.DS_Store' ||
        name === '.git' ||
        name === '.vercel' ||
        name === 'node_modules' ||
        name === 'dist' ||
        name === 'tsconfig.tsbuildinfo'
      ) {
        return false
      }
      return !excludedRelativePaths.has(relativePath)
    }
  })
}

async function walkFiles(dir, callback) {
  if (!existsSync(dir)) {
    return
  }
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') {
        continue
      }
      await walkFiles(path, callback)
      continue
    }
    await callback(path, entry.name)
  }
}

async function normalizeArchiveTimestamps(path) {
  if (!existsSync(path)) {
    return
  }
  const info = await stat(path)
  if (info.isDirectory()) {
    const entries = await readdir(path, { withFileTypes: true })
    for (const entry of entries) {
      await normalizeArchiveTimestamps(join(path, entry.name))
    }
  }
  await utimes(path, stableArchiveDate, stableArchiveDate)
}

function normalizePublicWorkspaceRange(dependencyName, range) {
  if (!range?.startsWith?.('workspace:')) {
    return range
  }
  return range
}

function normalizePublicDependencyBlock(block) {
  if (!block) {
    return
  }
  for (const [dependencyName, range] of Object.entries(block)) {
    block[dependencyName] = normalizePublicWorkspaceRange(dependencyName, range)
  }
}

function normalizePublicPackageScripts(packageJson, relativePackageDir) {
  if (relativePackageDir === 'apps/viewer-demo') {
    packageJson.scripts = {
      dev: 'vite --host 127.0.0.1',
      build: 'vue-tsc --noEmit -p tsconfig.json && vite build',
      preview: 'vite preview --host 127.0.0.1',
      'type-check': 'vue-tsc --noEmit -p tsconfig.json'
    }
  }
  if (relativePackageDir === 'apps/component-demo') {
    packageJson.scripts = {
      'prepare-viewer': 'node scripts/sync-viewer-assets.mjs',
      dev: 'pnpm prepare-viewer && vite --host 127.0.0.1',
      build: 'pnpm prepare-viewer && tsc -b tsconfig.json && vite build',
      preview: 'vite preview --host 127.0.0.1'
    }
  }
}

async function rewritePublicPackageJsons(repoDir) {
  await walkFiles(repoDir, async (path, filename) => {
    if (filename !== 'package.json') {
      return
    }
    const packageJson = await readJson(path)
    const relativePackageDir = relative(repoDir, resolve(path, '..')).split(sep).join('/')
    normalizePublicDependencyBlock(packageJson.dependencies)
    normalizePublicDependencyBlock(packageJson.devDependencies)
    normalizePublicDependencyBlock(packageJson.peerDependencies)
    normalizePublicDependencyBlock(packageJson.optionalDependencies)
    normalizePublicPackageScripts(packageJson, relativePackageDir)
    await writeFile(path, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8')
  })
}

async function rewritePublicTsConfigs(repoDir) {
  await walkFiles(join(repoDir, 'packages'), async (path, filename) => {
    if (filename !== 'tsconfig.json') {
      return
    }
    const tsconfig = await readJson(path)
    if (Array.isArray(tsconfig.references)) {
      const references = tsconfig.references.filter(reference => reference.path !== '../../core')
      if (references.length) {
        tsconfig.references = references
      } else {
        delete tsconfig.references
      }
    }
    await writeFile(path, `${JSON.stringify(tsconfig, null, 2)}\n`, 'utf8')
  })
}

async function writePublicWorkspace(repoDir) {
  await writeFile(
    join(repoDir, 'pnpm-workspace.yaml'),
    [
      'packages:',
      '  - packages/core',
      '  - packages/renderers/*',
      '  - packages/components/*',
      '  - packages/compat/*',
      '  - apps/*',
      '',
      'peerDependencyRules:',
      '  allowedVersions:',
      "    '@types/react': '>=17 <20'",
      "    react: '>=17 <20'",
      "    react-dom: '>=17 <20'",
      '',
      'allowBuilds:',
      "  '@parcel/watcher': true",
      '  canvas: true',
      '  core-js: true',
      '  es5-ext: true',
      '  esbuild: true',
      ''
    ].join('\n'),
    'utf8'
  )
}

async function writePublicRootPackage(repoDir) {
  const publicPackage = {
    name: '@flyfish-group/file-viewer-open-source',
    version,
    private: true,
    type: 'module',
    packageManager: packageJson.packageManager,
    description: 'Flyfish File Viewer open source official site, demo, core, renderer engines, standard component packages, compatibility aliases, and documentation.',
    scripts: {
      dev: 'pnpm --filter @flyfish-group/file-viewer-demo dev',
      'site:dev': 'pnpm --filter @flyfish-group/file-viewer-site dev',
      'site:build': 'pnpm --filter @flyfish-group/file-viewer-site build',
      'site:preview': 'pnpm --filter @flyfish-group/file-viewer-site preview',
      build: 'pnpm build:components && pnpm build:demo',
      'build:demo': 'pnpm --filter @flyfish-group/file-viewer-demo build',
      'build:component-demo': 'pnpm --filter @flyfish-group/file-viewer-component-demo build',
      'build:pptx': 'pnpm --filter @file-viewer/pptx build',
      'build:core': 'pnpm --filter @file-viewer/core build',
      'build:components': 'pnpm build:core && pnpm --filter @file-viewer/web build && pnpm --filter @file-viewer/react build && pnpm --filter @file-viewer/react-legacy build && pnpm --filter @file-viewer/vue3 build && pnpm --filter @file-viewer/vue2.7 build && pnpm --filter @file-viewer/vue2.6 build && pnpm --filter @file-viewer/jquery build && pnpm --filter @file-viewer/svelte build',
      'type-check': 'pnpm --filter @flyfish-group/file-viewer-demo type-check && pnpm type-check:core && pnpm type-check:components',
      'type-check:core': 'pnpm --filter @file-viewer/core type-check',
      'type-check:components': 'pnpm --filter @file-viewer/web type-check && pnpm --filter @file-viewer/react type-check && pnpm --filter @file-viewer/react-legacy type-check && pnpm --filter @file-viewer/vue3 type-check && pnpm --filter @file-viewer/vue2.7 type-check && pnpm --filter @file-viewer/vue2.6 type-check && pnpm --filter @file-viewer/jquery type-check && pnpm --filter @file-viewer/svelte type-check',
      'docs:dev': 'vitepress dev docs',
      'docs:build': 'vitepress build docs',
      'docs:preview': 'vitepress preview docs'
    },
    devDependencies: {
      '@types/node': packageJson.devDependencies['@types/node'],
      prettier: packageJson.devDependencies.prettier,
      typescript: packageJson.devDependencies.typescript,
      vitepress: packageJson.devDependencies.vitepress
    },
    license: packageJson.license
  }
  await writeFile(join(repoDir, 'package.json'), `${JSON.stringify(publicPackage, null, 2)}\n`, 'utf8')
}

async function copyPublicSourceTree(repoDir) {
  await copySourceDir(join(sourceRoot, 'apps'), join(repoDir, 'apps'), {
    exclude: [
      'component-demo/public/file-viewer',
      'component-demo/public/vendor',
      'component-demo/public/wasm'
    ]
  })
  await mkdir(join(repoDir, 'packages'), { recursive: true })
  await copySourceDir(join(sourceRoot, 'packages', 'core'), join(repoDir, 'packages', 'core'))
  await copySourceDir(join(sourceRoot, 'packages', 'renderers'), join(repoDir, 'packages', 'renderers'))
  await copySourceDir(join(sourceRoot, 'packages', 'components'), join(repoDir, 'packages', 'components'))
  await copySourceDir(join(sourceRoot, 'packages', 'compat'), join(repoDir, 'packages', 'compat'))
  await copySourceDir(join(sourceRoot, 'docs'), join(repoDir, 'docs'), {
    exclude: [
      '.vitepress/dist'
    ]
  })
  await writePublicWorkspace(repoDir)
  await writePublicRootPackage(repoDir)
  await rewritePublicPackageJsons(repoDir)
}

async function removeOldArtifacts(artifactsDir) {
  await mkdir(artifactsDir, { recursive: true })
  if (keepOldArtifacts) {
    return
  }
  const entries = await readdir(artifactsDir)
  const currentEcosystemTarballs = new Set(
    ecosystemPackageEntries.map(ecosystemPackage => ecosystemPackage.tarballName)
  )
  const currentStaticArchives = new Set([
    `file-viewer-v2-${version}-demo.tar.gz`,
    `file-viewer-v2-${version}-component-demo.tar.gz`,
    `file-viewer-v2-${version}-lib-dist.tar.gz`,
    `file-viewer-v2-${version}-docs.tar.gz`
  ])
  for (const entry of entries) {
    if (
      /^file-viewer-v[23]-.*-(demo|component-demo|lib-dist|docs)\.tar\.gz$/.test(entry) ||
      entry.includes(`-${legacyStandaloneDemoArtifactSegment}.tar.gz`)
    ) {
      if (!currentStaticArchives.has(entry)) {
        await removePath(join(artifactsDir, entry))
      }
    }
    if (entry.endsWith('.tgz')) {
      if (!currentEcosystemTarballs.has(entry)) {
        await removePath(join(artifactsDir, entry))
      }
    }
  }
}

async function createTarball(sourceDir, targetFile) {
  const tempTar = `${targetFile}.tar-${process.pid}-${Date.now()}`
  const tempGzip = `${tempTar}.gz`
  await removePath(tempTar)
  await removePath(tempGzip)
  await normalizeArchiveTimestamps(sourceDir)
  run('tar', ['-cf', tempTar, '-C', sourceDir, '.'])
  run('gzip', ['-n', '-f', tempTar])
  await replaceFileIfChanged(tempGzip, targetFile, basename(targetFile))
}

function shouldPublishArtifactTarball(packageRecord) {
  return packageRecord.releaseArtifact?.includeTarball !== false
}

async function readEcosystemPackManifest() {
  const manifestPath = join(ecosystemPackDir, 'npm-release-manifest.json')
  await assertFile(manifestPath, 'Ecosystem npm release manifest')
  const manifest = await readJson(manifestPath)
  const packageRecords = manifest.packages || []
  const packedPackages = new Set(packageRecords.map(packageRecord => packageRecord.packageName))
  for (const entry of ecosystemPackageEntries) {
    if (!packedPackages.has(entry.packageName)) {
      throw new Error(`Ecosystem pack manifest is missing ${entry.packageName}`)
    }
  }
  for (const packageRecord of packageRecords) {
    if (shouldPublishArtifactTarball(packageRecord)) {
      await assertFile(join(ecosystemPackDir, packageRecord.tarball), `${packageRecord.packageName} tarball`)
    }
  }
  return manifest
}

async function writeReleaseManifest(repoDir, ecosystemPackManifest) {
  const allowedRoots = keepExpandedAssets
    ? ['README.md', 'README.en.md', 'BRANCHES.md', 'WRAPPER_ECOSYSTEM.md', 'LICENSE', 'package.json', 'pnpm-workspace.yaml', 'apps', 'packages', 'dist', 'demo', 'component-demo', 'docs', 'docs-dist', 'example', 'artifacts']
    : ['README.md', 'README.en.md', 'BRANCHES.md', 'WRAPPER_ECOSYSTEM.md', 'LICENSE', 'package.json', 'pnpm-workspace.yaml', 'apps', 'packages', 'dist', 'artifacts']
  const wrappersByPackageName = new Map(wrapperManifest.wrappers.map(wrapper => [wrapper.packageName, wrapper]))
  const renderersByPackageName = new Map((wrapperManifest.renderers || []).map(renderer => [renderer.packageName, renderer]))
  const packages = ecosystemPackManifest.packages || []
  const metadataAssets = [
    {
      name: 'release-manifest.json',
      role: 'release-manifest',
      required: true,
      description: 'Release index for ecosystem packages, repositories, source policy and public artifacts.'
    },
    {
      name: 'release-status.json',
      role: 'release-status',
      required: true,
      description: 'Machine-readable channel status, remaining gaps and blocker classification.'
    },
    {
      name: 'release-status.schema.json',
      role: 'release-status-schema',
      required: true,
      description: 'JSON Schema for release-status.json.'
    }
  ]
  const manifest = {
    version,
    package: packageJson.name,
    generatedAt: new Date().toISOString(),
    sourceBranch: releaseSourceBranch,
    sourceCommit: run('git', ['rev-parse', '--short', 'HEAD'], { capture: true }),
    corePackage: wrapperManifest.corePackage,
    ecosystemPackages: Object.fromEntries(
      packages.map(packageRecord => [packageRecord.packageName, packageRecord.version])
    ),
    metadataAssets,
    ecosystemArtifacts: packages.map(packageRecord => {
      const wrapper = wrappersByPackageName.get(packageRecord.packageName)
      const renderer = renderersByPackageName.get(packageRecord.packageName)
      const includeTarball = shouldPublishArtifactTarball(packageRecord)
      return {
        name: packageRecord.packageName,
        version: packageRecord.version,
        kind: packageRecord.kind,
        framework: wrapper?.framework ?? null,
        packageDir: packageRecord.packageDir,
        tarball: includeTarball ? packageRecord.tarball : null,
        artifactIncluded: includeTarball,
        artifactDuplicateOf: packageRecord.releaseArtifact?.duplicateOf ?? null,
        artifactNote: packageRecord.releaseArtifact?.reason ?? null,
        github: packageRecord.github ?? null,
        gitee: packageRecord.gitee ?? null,
        entryFormats: wrapper?.entryFormats ?? renderer?.entryFormats ?? [],
        historicalPackages: wrapper?.historicalPackages ?? []
      }
    }),
    rendererRepositories: (wrapperManifest.renderers || []).map(renderer => ({
      packageName: renderer.packageName,
      repository: renderer.repository,
      github: renderer.github,
      gitee: renderer.gitee,
      entryFormats: renderer.entryFormats
    })),
    wrapperRepositories: wrapperManifest.wrappers.map(wrapper => ({
      framework: wrapper.framework,
      packageName: wrapper.packageName,
      repository: wrapper.repository,
      github: wrapper.github,
      gitee: wrapper.gitee,
      entryFormats: wrapper.entryFormats,
      historicalPackages: wrapper.historicalPackages
    })),
    vue2Package: skipVue2Tarball
      ? null
      : {
          name: '@flyfish-group/file-viewer',
          version,
          tarball: basename(vue2Tarball)
    },
    publicRepo: repoDir,
    openSourceMain: true,
    coreSourceIncluded: true,
    sourcePolicy: 'public-open-source-main-repository',
    repositoryRole: 'open-source-main-repository',
    layout: keepExpandedAssets ? 'expanded' : 'slim',
    allowedRoots,
    archiveOnlyRoots: keepExpandedAssets ? [] : ['demo', 'component-demo', 'docs-dist', 'example'],
    slimMode: slimArtifacts
  }
  const manifestPath = join(repoDir, 'artifacts', 'release-manifest.json')
  if (existsSync(manifestPath)) {
    const previousManifest = await readJson(manifestPath)
    const previousComparable = {
      ...previousManifest,
      generatedAt: manifest.generatedAt
    }
    if (JSON.stringify(previousComparable) === JSON.stringify(manifest)) {
      manifest.generatedAt = previousManifest.generatedAt
    }
  }
  await writeTextIfChanged(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    'artifacts/release-manifest.json'
  )
}

assertReleaseSourceBranch()

await assertCleanGitRepo(publicRepoDir, 'Open-source main repository')
await assertOpenSourceMainRepoLayout(publicRepoDir)

if (!skipBuild) {
  await removePath(releaseDir)
  await mkdir(demoStagingDir, { recursive: true })
  await mkdir(wrapperDemoStagingDir, { recursive: true })
  await mkdir(ecosystemPackDir, { recursive: true })

  run('pnpm', ['run', 'build:viewer-assets'])
  await copyCleanDir(viewerDemoDistDir, demoStagingDir)

  run('pnpm', ['run', 'build:component-demo'])
  await copyCleanDir(join(sourceRoot, 'apps', 'component-demo', 'dist'), wrapperDemoStagingDir)

  run('pnpm', ['--filter', '@file-viewer/core', 'build'])
  run('pnpm', ['run', 'build:component-packages'])
  run('pnpm', ['run', 'obfuscate'])
  run('pnpm', ['run', 'docs:build'])
  run('node', ['scripts/release-ecosystem-packages.mjs', '--pack', '--pack-dir', ecosystemPackDir, '--clean'])
} else {
  await assertDirectory(demoStagingDir, 'Demo staging directory')
  await assertDirectory(wrapperDemoStagingDir, 'Component demo staging directory')
  await assertDirectory(vue3LibraryDistDir, 'Vue3 library dist directory')
  await assertDirectory(join(sourceRoot, 'docs', '.vitepress', 'dist'), 'Docs dist directory')
  await assertDirectory(ecosystemPackDir, 'Ecosystem pack directory')
}

const artifactsDir = join(publicRepoDir, 'artifacts')
await removeOldArtifacts(artifactsDir)

await removePath(join(publicRepoDir, 'demo'))
await removePath(join(publicRepoDir, legacyStandaloneDemoArtifactSegment))
await removePath(join(publicRepoDir, 'component-demo'))
await removePath(join(publicRepoDir, 'docs'))
await removePath(join(publicRepoDir, 'docs-dist'))
await removePath(join(publicRepoDir, 'example'))
await removePath(join(publicRepoDir, 'apps'))
await removePath(join(publicRepoDir, 'packages'))
await removePath(join(publicRepoDir, 'ecosystem'))
await removePath(join(publicRepoDir, 'pnpm-workspace.yaml'))

await copyPublicSourceTree(publicRepoDir)

if (keepExpandedAssets) {
  await copyCleanDir(demoStagingDir, join(publicRepoDir, 'demo'))
  await copyCleanDir(wrapperDemoStagingDir, join(publicRepoDir, 'component-demo'))
  await copyCleanDir(join(sourceRoot, 'docs', '.vitepress', 'dist'), join(publicRepoDir, 'docs-dist'))
  await copyCleanDir(viewerDemoExampleDir, join(publicRepoDir, 'example'))
}

await copyCleanDir(vue3LibraryDistDir, join(publicRepoDir, 'dist'))
await cp(join(sourceRoot, 'README.md'), join(publicRepoDir, 'README.md'), { force: true })
await cp(join(sourceRoot, 'README.en.md'), join(publicRepoDir, 'README.en.md'), { force: true })
await cp(join(sourceRoot, 'BRANCHES.md'), join(publicRepoDir, 'BRANCHES.md'), { force: true })
await cp(join(sourceRoot, 'WRAPPER_ECOSYSTEM.md'), join(publicRepoDir, 'WRAPPER_ECOSYSTEM.md'), { force: true })
await cp(join(sourceRoot, 'LICENSE'), join(publicRepoDir, 'LICENSE'), { force: true })

const ecosystemPackManifest = await readEcosystemPackManifest()
for (const packageRecord of ecosystemPackManifest.packages || []) {
  if (!shouldPublishArtifactTarball(packageRecord)) {
    continue
  }
  await copyFileIfChanged(
    join(ecosystemPackDir, packageRecord.tarball),
    join(artifactsDir, packageRecord.tarball),
    packageRecord.tarball
  )
}
if (!skipVue2Tarball) {
  await assertFile(vue2Tarball, 'Vue2 npm tarball')
  await copyFileIfChanged(vue2Tarball, join(artifactsDir, basename(vue2Tarball)), basename(vue2Tarball))
}

await createTarball(demoStagingDir, join(artifactsDir, `file-viewer-v2-${version}-demo.tar.gz`))
await createTarball(wrapperDemoStagingDir, join(artifactsDir, `file-viewer-v2-${version}-component-demo.tar.gz`))
await createTarball(join(publicRepoDir, 'dist'), join(artifactsDir, `file-viewer-v2-${version}-lib-dist.tar.gz`))
await createTarball(join(sourceRoot, 'docs', '.vitepress', 'dist'), join(artifactsDir, `file-viewer-v2-${version}-docs.tar.gz`))
await copyFileIfChanged(
  join(sourceRoot, 'ecosystem', 'release-status.schema.json'),
  join(artifactsDir, 'release-status.schema.json'),
  'release-status.schema.json'
)
await writeReleaseManifest(publicRepoDir, ecosystemPackManifest)
run('node', ['scripts/write-release-status-report.mjs', '--public-repo-dir', publicRepoDir, '--fast'])
await assertOpenSourceMainRepoLayout(publicRepoDir)
run('node', ['scripts/verify-public-main.mjs', '--public-repo-dir', publicRepoDir])

console.log(`Open-source main repository prepared in ${publicRepoDir}`)
console.log('Review with:')
console.log(`  git -C ${publicRepoDir} status --short`)
console.log(`  git -C ${publicRepoDir} diff --stat`)
