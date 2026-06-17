import { existsSync } from 'node:fs'
import { cp, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { loadEcosystemReleaseContext, readJson } from './lib/ecosystem-packages.mjs'
import { assertPublicArtifactOnlyRepo } from './lib/public-artifacts.mjs'

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
const skipVue2Tarball = args.includes('--skip-vue2-tarball')
const slimArtifacts =
  (args.includes('--slim') || process.env.FILE_VIEWER_PUBLIC_SLIM === '1') &&
  !args.includes('--expanded-assets')
const keepExpandedAssets = !slimArtifacts
const {
  rootPackage: packageJson,
  wrapperManifest,
  entries: ecosystemPackageEntries
} = await loadEcosystemReleaseContext(sourceRoot)
const version = packageJson.version
const vue2Tarball = resolve(
  readArg(
    '--vue2-tarball',
    process.env.FILE_VIEWER_VUE2_TARBALL ||
      join(sourceRoot, '..', 'file-viewer', `flyfish-group-file-viewer-${version}.tgz`)
  )
)
const releaseDir = join(sourceRoot, '.release', `file-viewer-v3-${version}`)
const demoStagingDir = join(releaseDir, 'demo')
const adapterDemoStagingDir = join(releaseDir, 'adapter-demo')
const ecosystemPackDir = join(releaseDir, 'ecosystem')

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
  await assertDirectory(join(repoDir, '.git'), `${label} .git`)
  const status = run('git', ['status', '--porcelain'], { cwd: repoDir, capture: true })
  if (status) {
    throw new Error(`${label} has uncommitted changes. Commit or clean it first:\n${status}`)
  }
}

function currentBranch() {
  return run('git', ['branch', '--show-current'], { capture: true })
}

async function removePath(path) {
  await rm(path, { recursive: true, force: true })
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

async function removeOldArtifacts(artifactsDir) {
  await mkdir(artifactsDir, { recursive: true })
  if (keepOldArtifacts) {
    return
  }
  const entries = await readdir(artifactsDir)
  const currentEcosystemTarballs = new Set(
    ecosystemPackageEntries.map(ecosystemPackage => ecosystemPackage.tarballName)
  )
  for (const entry of entries) {
    if (/^file-viewer-v3-.*-(demo|adapter-demo|lib-dist|docs)\.tar\.gz$/.test(entry)) {
      await removePath(join(artifactsDir, entry))
    }
    if (/^flyfish-group-file-viewer(3|-web|-react)?-.*\.tgz$/.test(entry)) {
      await removePath(join(artifactsDir, entry))
    }
    if (
      currentEcosystemTarballs.has(entry) ||
      /^(file-viewer3|file-viewer-core)-.*\.tgz$/.test(entry) ||
      /^file-viewer-(vue3|vue2\.7|vue2\.6|react|react-legacy|web|jquery|svelte)-.*\.tgz$/.test(entry)
    ) {
      await removePath(join(artifactsDir, entry))
    }
  }
}

async function createTarball(sourceDir, targetFile) {
  await removePath(targetFile)
  run('tar', ['-czf', targetFile, '-C', sourceDir, '.'])
}

function shouldPublishArtifactTarball(packageRecord) {
  return packageRecord.publicArtifact?.includeTarball !== false
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
    ? ['README.md', 'README.en.md', 'LICENSE', 'package.json', 'dist', 'demo', 'adapter-demo', 'docs', 'example', 'artifacts']
    : ['README.md', 'README.en.md', 'LICENSE', 'package.json', 'dist', 'artifacts']
  const wrappersByPackageName = new Map(wrapperManifest.wrappers.map(wrapper => [wrapper.packageName, wrapper]))
  const packages = ecosystemPackManifest.packages || []
  const manifest = {
    version,
    package: packageJson.name,
    generatedAt: new Date().toISOString(),
    sourceBranch: currentBranch(),
    sourceCommit: run('git', ['rev-parse', '--short', 'HEAD'], { capture: true }),
    corePackage: wrapperManifest.corePackage,
    adapterPackages: Object.fromEntries(
      packages.map(packageRecord => [packageRecord.packageName, packageRecord.version])
    ),
    adapterArtifacts: packages.map(packageRecord => {
      const wrapper = wrappersByPackageName.get(packageRecord.packageName)
      const includeTarball = shouldPublishArtifactTarball(packageRecord)
      return {
        name: packageRecord.packageName,
        version: packageRecord.version,
        kind: packageRecord.kind,
        framework: wrapper?.framework ?? null,
        packageDir: packageRecord.packageDir,
        tarball: includeTarball ? packageRecord.tarball : null,
        artifactIncluded: includeTarball,
        artifactDuplicateOf: packageRecord.publicArtifact?.duplicateOf ?? null,
        artifactNote: packageRecord.publicArtifact?.reason ?? null,
        github: packageRecord.github ?? null,
        gitee: packageRecord.gitee ?? null,
        historicalPackages: wrapper?.historicalPackages ?? []
      }
    }),
    wrapperRepositories: wrapperManifest.wrappers.map(wrapper => ({
      framework: wrapper.framework,
      packageName: wrapper.packageName,
      repository: wrapper.repository,
      github: wrapper.github,
      gitee: wrapper.gitee,
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
    artifactOnly: true,
    layout: keepExpandedAssets ? 'expanded' : 'slim',
    allowedRoots,
    archiveOnlyRoots: keepExpandedAssets ? [] : ['demo', 'adapter-demo', 'docs', 'example'],
    slimMode: slimArtifacts
  }
  await writeFile(
    join(repoDir, 'artifacts', 'release-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8'
  )
}

if (currentBranch() !== 'v3' && process.env.FILE_VIEWER_ALLOW_NON_V3 !== '1') {
  throw new Error('Public artifacts must be prepared from v3. Set FILE_VIEWER_ALLOW_NON_V3=1 only for emergency maintenance.')
}

await assertCleanGitRepo(publicRepoDir, 'Public artifact repository')
await assertPublicArtifactOnlyRepo(publicRepoDir)

if (!skipBuild) {
  await removePath(releaseDir)
  await mkdir(demoStagingDir, { recursive: true })
  await mkdir(adapterDemoStagingDir, { recursive: true })
  await mkdir(ecosystemPackDir, { recursive: true })

  run('pnpm', ['run', 'build:viewer-assets'])
  await copyCleanDir(join(sourceRoot, 'dist'), demoStagingDir)

  run('pnpm', ['run', 'build:adapter-demo'])
  await copyCleanDir(join(sourceRoot, 'packages', 'demo', 'dist'), adapterDemoStagingDir)

  run('pnpm', ['--filter', '@file-viewer/core', 'build'])
  run('pnpm', ['run', 'build:adapter-packages'])
  run('pnpm', ['run', 'build-lib-only'])
  run('pnpm', ['run', 'obfuscate'])
  run('pnpm', ['run', 'docs:build'])
  run('node', ['scripts/release-ecosystem-packages.mjs', '--pack', '--pack-dir', ecosystemPackDir, '--clean'])
} else {
  await assertDirectory(demoStagingDir, 'Demo staging directory')
  await assertDirectory(adapterDemoStagingDir, 'Adapter demo staging directory')
  await assertDirectory(join(sourceRoot, 'dist'), 'Library dist directory')
  await assertDirectory(join(sourceRoot, 'docs', '.vitepress', 'dist'), 'Docs dist directory')
  await assertDirectory(ecosystemPackDir, 'Ecosystem pack directory')
}

const artifactsDir = join(publicRepoDir, 'artifacts')
await removeOldArtifacts(artifactsDir)

await removePath(join(publicRepoDir, 'demo'))
await removePath(join(publicRepoDir, 'adapter-demo'))
await removePath(join(publicRepoDir, 'docs'))
await removePath(join(publicRepoDir, 'example'))

if (keepExpandedAssets) {
  await copyCleanDir(demoStagingDir, join(publicRepoDir, 'demo'))
  await copyCleanDir(adapterDemoStagingDir, join(publicRepoDir, 'adapter-demo'))
  await copyCleanDir(join(sourceRoot, 'docs', '.vitepress', 'dist'), join(publicRepoDir, 'docs'))
  await copyCleanDir(join(sourceRoot, 'public', 'example'), join(publicRepoDir, 'example'))
}

await copyCleanDir(join(sourceRoot, 'dist'), join(publicRepoDir, 'dist'))
await cp(join(sourceRoot, 'README.md'), join(publicRepoDir, 'README.md'), { force: true })
await cp(join(sourceRoot, 'README.en.md'), join(publicRepoDir, 'README.en.md'), { force: true })
await cp(join(sourceRoot, 'LICENSE'), join(publicRepoDir, 'LICENSE'), { force: true })
await cp(join(sourceRoot, 'package.json'), join(publicRepoDir, 'package.json'), { force: true })

const ecosystemPackManifest = await readEcosystemPackManifest()
for (const packageRecord of ecosystemPackManifest.packages || []) {
  if (!shouldPublishArtifactTarball(packageRecord)) {
    continue
  }
  await cp(join(ecosystemPackDir, packageRecord.tarball), join(artifactsDir, packageRecord.tarball), {
    force: true
  })
}
if (!skipVue2Tarball) {
  await assertFile(vue2Tarball, 'Vue2 npm tarball')
  await cp(vue2Tarball, join(artifactsDir, basename(vue2Tarball)), { force: true })
}

await createTarball(demoStagingDir, join(artifactsDir, `file-viewer-v3-${version}-demo.tar.gz`))
await createTarball(adapterDemoStagingDir, join(artifactsDir, `file-viewer-v3-${version}-adapter-demo.tar.gz`))
await createTarball(join(publicRepoDir, 'dist'), join(artifactsDir, `file-viewer-v3-${version}-lib-dist.tar.gz`))
await createTarball(join(sourceRoot, 'docs', '.vitepress', 'dist'), join(artifactsDir, `file-viewer-v3-${version}-docs.tar.gz`))
await writeReleaseManifest(publicRepoDir, ecosystemPackManifest)
await assertPublicArtifactOnlyRepo(publicRepoDir)
run('node', ['scripts/verify-public-artifacts.mjs', '--public-repo-dir', publicRepoDir])

console.log(`Public artifacts prepared in ${publicRepoDir}`)
console.log('Review with:')
console.log(`  git -C ${publicRepoDir} status --short`)
console.log(`  git -C ${publicRepoDir} diff --stat`)
