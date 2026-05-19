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
const packageJson = JSON.parse(await readFile(join(sourceRoot, 'package.json'), 'utf8'))
const version = packageJson.version
const releaseDir = join(sourceRoot, '.release', `file-viewer-v3-${version}`)
const demoStagingDir = join(releaseDir, 'demo')
const npmPackDir = join(releaseDir, 'npm')

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
    if (/^file-viewer-v3-.*-(demo|lib-dist|docs)\.tar\.gz$/.test(entry)) {
      await removePath(join(artifactsDir, entry))
    }
    if (/^flyfish-group-file-viewer3-.*\.tgz$/.test(entry)) {
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
  const manifest = {
    version,
    package: packageJson.name,
    generatedAt: new Date().toISOString(),
    sourceBranch: currentBranch(),
    sourceCommit: run('git', ['rev-parse', '--short', 'HEAD'], { capture: true }),
    publicRepo: repoDir,
    artifactOnly: true,
    allowedRoots: ['README.md', 'LICENSE', 'package.json', 'dist', 'demo', 'docs', 'example', 'artifacts']
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
  await mkdir(npmPackDir, { recursive: true })

  run('pnpm', ['run', 'build-only'])
  await copyCleanDir(join(sourceRoot, 'dist'), demoStagingDir)

  run('pnpm', ['run', 'build-lib-only'])
  run('pnpm', ['run', 'obfuscate'])
  run('pnpm', ['run', 'docs:build'])
  run('npm', ['pack', '--pack-destination', npmPackDir, '--registry=https://registry.npmjs.org/'])
} else {
  await assertDirectory(demoStagingDir, 'Demo staging directory')
  await assertDirectory(join(sourceRoot, 'dist'), 'Library dist directory')
  await assertDirectory(join(sourceRoot, 'docs', '.vitepress', 'dist'), 'Docs dist directory')
}

const artifactsDir = join(publicRepoDir, 'artifacts')
await removeOldArtifacts(artifactsDir)

await copyCleanDir(demoStagingDir, join(publicRepoDir, 'demo'))
await copyCleanDir(join(sourceRoot, 'dist'), join(publicRepoDir, 'dist'))
await copyCleanDir(join(sourceRoot, 'docs', '.vitepress', 'dist'), join(publicRepoDir, 'docs'))
await copyCleanDir(join(sourceRoot, 'public', 'example'), join(publicRepoDir, 'example'))
await cp(join(sourceRoot, 'package.json'), join(publicRepoDir, 'package.json'), { force: true })

const npmTarball = await findPackedNpmTarball()
await cp(npmTarball, join(artifactsDir, basename(npmTarball)), { force: true })

await createTarball(join(publicRepoDir, 'demo'), join(artifactsDir, `file-viewer-v3-${version}-demo.tar.gz`))
await createTarball(join(publicRepoDir, 'dist'), join(artifactsDir, `file-viewer-v3-${version}-lib-dist.tar.gz`))
await createTarball(join(publicRepoDir, 'docs'), join(artifactsDir, `file-viewer-v3-${version}-docs.tar.gz`))
await writeReleaseManifest(publicRepoDir)
await assertArtifactOnlyRepo(publicRepoDir)

console.log(`Public artifacts prepared in ${publicRepoDir}`)
console.log('Review with:')
console.log(`  git -C ${publicRepoDir} status --short`)
console.log(`  git -C ${publicRepoDir} diff --stat`)
