import { existsSync } from 'node:fs'
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const args = process.argv.slice(2)

function readArg(name, fallback) {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}

const outputRoot = resolve(
  sourceRoot,
  readArg('--out-dir', process.env.FILE_VIEWER_BRANCH_CUTOVER_DIR || '.release/branch-cutover')
)
const exportRoot = join(outputRoot, 'exports')
const verifyOnly = args.includes('--verify-only')

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function writeText(path, value) {
  await writeFile(path, value, 'utf8')
}

async function removePath(path) {
  await rm(path, { recursive: true, force: true })
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

function run(command, commandArgs, options = {}) {
  const printable = `${[command, ...commandArgs].join(' ')}`
  console.log(`$ ${printable}`)
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd || sourceRoot,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit'
  })
  if (result.status !== 0) {
    throw new Error(`Command failed: ${printable}\n${result.stderr || result.stdout || ''}`)
  }
  return result.stdout?.trim() || ''
}

const wrappers = await readJson(join(sourceRoot, 'ecosystem', 'wrappers.json'))
const branchRoles = await readJson(join(sourceRoot, 'ecosystem', 'branch-roles.json'))
const rootPackage = await readJson(join(sourceRoot, 'package.json'))

const vue27 = wrappers.wrappers.find(wrapper => wrapper.id === 'vue2.7')
const vue3 = wrappers.wrappers.find(wrapper => wrapper.id === 'vue3')
if (!vue27 || !vue3) {
  throw new Error('Missing vue2.7 or vue3 wrapper metadata in ecosystem/wrappers.json')
}

const sourceBranch = run('git', ['branch', '--show-current'], { capture: true })
const sourceCommit = run('git', ['rev-parse', '--short', 'HEAD'], { capture: true })

const cutoverTargets = [
  {
    branch: 'main',
    role: 'core',
    sourceDir: join(exportRoot, wrappers.corePackage.repository),
    packageName: wrappers.corePackage.packageName,
    repository: wrappers.corePackage.repository,
    publicRepositories: {
      github: wrappers.corePackage.github,
      gitee: wrappers.corePackage.gitee
    },
    compatibilityPackages: []
  },
  {
    branch: 'v2',
    role: 'vue2.7-component',
    sourceDir: join(exportRoot, vue27.repository),
    packageName: vue27.packageName,
    repository: vue27.repository,
    publicRepositories: {
      github: vue27.github,
      gitee: vue27.gitee
    },
    compatibilityPackages: vue27.historicalPackages || []
  },
  {
    branch: 'v3',
    role: 'vue3-component',
    sourceDir: join(exportRoot, vue3.repository),
    packageName: vue3.packageName,
    repository: vue3.repository,
    publicRepositories: {
      github: vue3.github,
      gitee: vue3.gitee
    },
    compatibilityPackages: vue3.historicalPackages || []
  }
]

function branchDirectoryName(target) {
  return `${target.branch}-${target.role}`
}

async function writeBranchReadme(target, targetDir) {
  const lines = [
    '# Branch Cutover Snapshot',
    '',
    `- Branch: \`${target.branch}\``,
    `- Role: \`${target.role}\``,
    `- Package: \`${target.packageName}\``,
    `- Source baseline: \`${sourceBranch}@${sourceCommit}\``,
    `- Public GitHub: ${target.publicRepositories.github}`,
    `- Public Gitee: ${target.publicRepositories.gitee}`,
    ''
  ]
  if (target.compatibilityPackages.length) {
    lines.push(`Compatibility npm aliases: ${target.compatibilityPackages.map(name => `\`${name}\``).join(', ')}`, '')
  }
  lines.push(
    'This folder is a dry-run file tree for the private aggregate repository branch cutover.',
    'It is generated from the current monorepo source package export and is safe to inspect before replacing any remote branch.',
    ''
  )
  await writeText(join(targetDir, 'BRANCH_ROLE.md'), `${lines.join('\n')}\n`)
}

async function copyBranchSnapshot(target) {
  const targetDir = join(outputRoot, branchDirectoryName(target))
  await removePath(targetDir)
  await cp(target.sourceDir, targetDir, {
    recursive: true,
    force: true,
    filter: source => !source.split('/').includes('.git')
  })
  await writeBranchReadme(target, targetDir)
  await writeJson(join(targetDir, 'branch-cutover-manifest.json'), {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    branch: target.branch,
    role: target.role,
    packageName: target.packageName,
    packageVersion: rootPackage.version,
    sourceBranch,
    sourceCommit,
    repository: target.repository,
    publicRepositories: target.publicRepositories,
    compatibilityPackages: target.compatibilityPackages,
    aggregateRemote: branchRoles.sourceRemote.url
  })
  return targetDir
}

async function verifySnapshot(target) {
  const targetDir = join(outputRoot, branchDirectoryName(target))
  await assertDirectory(targetDir, `${target.branch} snapshot`)
  await assertFile(join(targetDir, 'package.json'), `${target.branch} package.json`)
  await assertFile(join(targetDir, 'README.md'), `${target.branch} README.md`)
  await assertFile(join(targetDir, 'README.en.md'), `${target.branch} README.en.md`)
  await assertFile(join(targetDir, 'LICENSE'), `${target.branch} LICENSE`)
  await assertFile(join(targetDir, 'BRANCH_ROLE.md'), `${target.branch} BRANCH_ROLE.md`)
  await assertFile(join(targetDir, 'branch-cutover-manifest.json'), `${target.branch} branch-cutover-manifest.json`)
  const packageJson = await readJson(join(targetDir, 'package.json'))
  if (packageJson.name !== target.packageName) {
    throw new Error(`${target.branch} package name mismatch: ${packageJson.name} !== ${target.packageName}`)
  }
  if (JSON.stringify(packageJson).includes('workspace:')) {
    throw new Error(`${target.branch} snapshot leaks workspace dependency ranges`)
  }
  if (existsSync(join(targetDir, 'node_modules')) || existsSync(join(targetDir, 'dist'))) {
    throw new Error(`${target.branch} snapshot must not include node_modules or dist`)
  }
}

if (!verifyOnly) {
  await removePath(outputRoot)
  await mkdir(exportRoot, { recursive: true })
  run('node', ['scripts/sync-wrapper-readmes.mjs'])
  run('node', ['scripts/sync-core-repo.mjs', '--out-dir', exportRoot])
  run('node', ['scripts/sync-wrapper-repos.mjs', '--out-dir', exportRoot, '--id=vue2.7'])
  run('node', ['scripts/sync-wrapper-repos.mjs', '--out-dir', exportRoot, '--id=vue3'])
  for (const target of cutoverTargets) {
    await assertDirectory(target.sourceDir, `${target.branch} exported source`)
    await copyBranchSnapshot(target)
  }
  await writeJson(join(outputRoot, 'branch-cutover-summary.json'), {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceBranch,
    sourceCommit,
    aggregateRemote: branchRoles.sourceRemote.url,
    targets: cutoverTargets.map(target => ({
      branch: target.branch,
      role: target.role,
      packageName: target.packageName,
      snapshotDir: branchDirectoryName(target),
      publicRepositories: target.publicRepositories,
      compatibilityPackages: target.compatibilityPackages
    }))
  })
}

for (const target of cutoverTargets) {
  await verifySnapshot(target)
}
await assertFile(join(outputRoot, 'branch-cutover-summary.json'), 'branch-cutover-summary.json')

console.log(`Prepared branch cutover snapshots in ${outputRoot}`)
for (const target of cutoverTargets) {
  console.log(`${target.branch}\t${target.role}\t${target.packageName}\t${join(outputRoot, branchDirectoryName(target))}`)
}
