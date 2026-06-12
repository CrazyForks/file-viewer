import { existsSync } from 'node:fs'
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

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
const packageJson = JSON.parse(await readFile(join(sourceRoot, 'package.json'), 'utf8'))
const version = packageJson.version
const webPackageJson = JSON.parse(await readFile(join(sourceRoot, 'packages', 'web', 'package.json'), 'utf8'))
const reactPackageJson = JSON.parse(await readFile(join(sourceRoot, 'packages', 'react', 'package.json'), 'utf8'))
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
const npmPackDir = join(releaseDir, 'npm')
const adapterPackDir = join(releaseDir, 'adapters')

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
  for (const entry of entries) {
    if (/^file-viewer-v3-.*-(demo|adapter-demo|lib-dist|docs)\.tar\.gz$/.test(entry)) {
      await removePath(join(artifactsDir, entry))
    }
    if (/^flyfish-group-file-viewer(3|-web|-react)?-.*\.tgz$/.test(entry)) {
      await removePath(join(artifactsDir, entry))
    }
  }
}

async function createTarball(sourceDir, targetFile) {
  await removePath(targetFile)
  run('tar', ['-czf', targetFile, '-C', sourceDir, '.'])
}

async function findPackedNpmTarball() {
  const entries = await readdir(npmPackDir)
  const match = entries.find(entry => entry === `flyfish-group-file-viewer3-${version}.tgz`)
  if (!match) {
    throw new Error(`Expected npm tarball was not found in ${npmPackDir}`)
  }
  return join(npmPackDir, match)
}

async function findAdapterTarballs() {
  const entries = await readdir(adapterPackDir)
  const expected = [
    `flyfish-group-file-viewer-web-${webPackageJson.version}.tgz`,
    `flyfish-group-file-viewer-react-${reactPackageJson.version}.tgz`
  ]
  for (const name of expected) {
    if (!entries.includes(name)) {
      throw new Error(`Expected adapter tarball was not found in ${adapterPackDir}: ${name}`)
    }
  }
  return expected.map(name => join(adapterPackDir, name))
}

async function assertArtifactOnlyRepo(repoDir) {
  const forbiddenTopLevel = [
    '.env',
    '.eslintrc.cjs',
    '.prettierrc.json',
    '.vscode',
    'build.sh',
    'env.d.ts',
    'index.html',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'public',
    'scripts',
    'src',
    'yarn.lock'
  ]
  for (const entry of forbiddenTopLevel) {
    if (existsSync(join(repoDir, entry))) {
      throw new Error(`Forbidden source workspace entry found in public repo: ${entry}`)
    }
  }
  if (existsSync(join(repoDir, 'docs', '.vitepress'))) {
    throw new Error('Forbidden VitePress source directory found in public repo: docs/.vitepress')
  }
}

async function writeReleaseManifest(repoDir) {
  const allowedRoots = keepExpandedAssets
    ? ['README.md', 'README.en.md', 'LICENSE', 'package.json', 'dist', 'demo', 'adapter-demo', 'docs', 'example', 'artifacts']
    : ['README.md', 'README.en.md', 'LICENSE', 'package.json', 'dist', 'artifacts']
  const manifest = {
    version,
    package: packageJson.name,
    generatedAt: new Date().toISOString(),
    sourceBranch: currentBranch(),
    sourceCommit: run('git', ['rev-parse', '--short', 'HEAD'], { capture: true }),
    adapterPackages: {
      [webPackageJson.name]: webPackageJson.version,
      [reactPackageJson.name]: reactPackageJson.version
    },
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
await assertArtifactOnlyRepo(publicRepoDir)

if (!skipBuild) {
  await removePath(releaseDir)
  await mkdir(demoStagingDir, { recursive: true })
  await mkdir(adapterDemoStagingDir, { recursive: true })
  await mkdir(npmPackDir, { recursive: true })
  await mkdir(adapterPackDir, { recursive: true })

  run('pnpm', ['run', 'build-only'])
  await copyCleanDir(join(sourceRoot, 'dist'), demoStagingDir)

  run('pnpm', ['run', 'build:adapter-demo'])
  await copyCleanDir(join(sourceRoot, 'packages', 'demo', 'dist'), adapterDemoStagingDir)
  run('pnpm', ['-C', 'packages/web', 'pack', '--pack-destination', adapterPackDir])
  run('pnpm', ['-C', 'packages/react', 'pack', '--pack-destination', adapterPackDir])

  run('pnpm', ['run', 'build-lib-only'])
  run('pnpm', ['run', 'obfuscate'])
  run('pnpm', ['run', 'docs:build'])
  run('npm', ['pack', '--pack-destination', npmPackDir, '--registry=https://registry.npmjs.org/'])
} else {
  await assertDirectory(demoStagingDir, 'Demo staging directory')
  await assertDirectory(adapterDemoStagingDir, 'Adapter demo staging directory')
  await assertDirectory(join(sourceRoot, 'dist'), 'Library dist directory')
  await assertDirectory(join(sourceRoot, 'docs', '.vitepress', 'dist'), 'Docs dist directory')
  await assertDirectory(adapterPackDir, 'Adapter pack directory')
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

const npmTarball = await findPackedNpmTarball()
await cp(npmTarball, join(artifactsDir, basename(npmTarball)), { force: true })
if (!skipVue2Tarball) {
  await assertFile(vue2Tarball, 'Vue2 npm tarball')
  await cp(vue2Tarball, join(artifactsDir, basename(vue2Tarball)), { force: true })
}
for (const adapterTarball of await findAdapterTarballs()) {
  await cp(adapterTarball, join(artifactsDir, basename(adapterTarball)), { force: true })
}

await createTarball(demoStagingDir, join(artifactsDir, `file-viewer-v3-${version}-demo.tar.gz`))
await createTarball(adapterDemoStagingDir, join(artifactsDir, `file-viewer-v3-${version}-adapter-demo.tar.gz`))
await createTarball(join(publicRepoDir, 'dist'), join(artifactsDir, `file-viewer-v3-${version}-lib-dist.tar.gz`))
await createTarball(join(sourceRoot, 'docs', '.vitepress', 'dist'), join(artifactsDir, `file-viewer-v3-${version}-docs.tar.gz`))
await writeReleaseManifest(publicRepoDir)
await assertArtifactOnlyRepo(publicRepoDir)

console.log(`Public artifacts prepared in ${publicRepoDir}`)
console.log('Review with:')
console.log(`  git -C ${publicRepoDir} status --short`)
console.log(`  git -C ${publicRepoDir} diff --stat`)
