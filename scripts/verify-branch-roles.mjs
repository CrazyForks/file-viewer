import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')

const branchRoles = await readJson(join(sourceRoot, 'ecosystem', 'branch-roles.json'))
const wrapperManifest = await readJson(join(sourceRoot, 'ecosystem', 'wrappers.json'))
const rootPackage = await readJson(join(sourceRoot, 'package.json'))

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

function runGit(args) {
  const result = spawnSync('git', args, {
    cwd: sourceRoot,
    encoding: 'utf8',
    stdio: 'pipe'
  })
  if (result.status !== 0) {
    throw new Error(`Command failed: git ${args.join(' ')}\n${result.stderr || result.stdout}`)
  }
  return result.stdout.trim()
}

function repositoryPath(url) {
  const normalized = url
    .replace(/^git\+/, '')
    .replace(/\.git$/, '')
    .replace(/^https?:\/\//, '')
    .replace(/^git@([^:]+):/, '$1/')
  const segments = normalized.split('/')
  return segments.slice(-2).join('/')
}

function assertPublicRepository(url, expectedOrg, label) {
  const path = repositoryPath(url)
  const [org] = path.split('/')
  assert(org === expectedOrg, `${label} must live under ${expectedOrg}, got ${url}`)
}

assert(branchRoles.schemaVersion === 1, 'branch-roles.json schemaVersion must be 1')
assert(branchRoles.currentSourceBranch, 'branch-roles.json must declare currentSourceBranch')
assert(branchRoles.sourceRemote?.name === 'origin', 'Private source remote must be named origin')
assert(branchRoles.sourceRemote?.visibility === 'private', 'Source remote must be marked private')
assert(
  branchRoles.sourceRemote?.url === wrapperManifest.corePackage.aggregateRepository,
  'branch-roles source remote must match wrappers.json corePackage.aggregateRepository'
)
assert(
  wrapperManifest.corePackage.visibility === 'public-source',
  'wrappers.json corePackage.visibility must be public-source'
)

const originUrl = runGit(['remote', 'get-url', branchRoles.sourceRemote.name])
assert(
  originUrl.replace(/\.git$/, '') === branchRoles.sourceRemote.url.replace(/\.git$/, ''),
  `git origin must point to ${branchRoles.sourceRemote.url}, got ${originUrl}`
)

const currentBranch = runGit(['branch', '--show-current'])
const rolesByName = new Map(branchRoles.branches.map(branch => [branch.name, branch]))
assert(rolesByName.has('main'), 'branch roles must include main')
assert(rolesByName.has('v2'), 'branch roles must include v2')
assert(rolesByName.has('v3'), 'branch roles must include v3')
assert(rolesByName.has(currentBranch), `current branch ${currentBranch} must be declared in branch roles`)

const mainRole = rolesByName.get('main')
assert(mainRole.role === 'private-aggregate-workspace', 'main branch role must be private-aggregate-workspace')
assert(mainRole.packageName === rootPackage.name, `main branch package must be ${rootPackage.name}`)
assert(
  mainRole.sourcePolicy === 'private-complete-original-workspace',
  'main branch source policy must keep the complete original workspace private'
)

const wrappersById = new Map(wrapperManifest.wrappers.map(wrapper => [wrapper.id, wrapper]))
const compatibilityPackagesByName = new Map(
  (wrapperManifest.compatibilityPackages || []).map(compatibilityPackage => [
    compatibilityPackage.packageName,
    compatibilityPackage
  ])
)
for (const branchName of ['v2', 'v3']) {
  const role = rolesByName.get(branchName)
  assert(role.wrapperId, `${branchName} branch must declare wrapperId`)
  const wrapper = wrappersById.get(role.wrapperId)
  assert(wrapper, `${branchName} wrapperId ${role.wrapperId} must exist in wrappers.json`)
  assert(role.packageName === wrapper.packageName, `${branchName} packageName must match wrappers.json`)
  assert(
    role.sourcePolicy === 'component-source-exported-publicly',
    `${branchName} source policy must export component source publicly`
  )
  for (const compatibilityPackage of role.compatibilityPackages || []) {
    assert(
      wrapper.historicalPackages.includes(compatibilityPackage),
      `${branchName} compatibility package ${compatibilityPackage} must be declared in wrappers.json`
    )
    const compatibilityPackageEntry = compatibilityPackagesByName.get(compatibilityPackage)
    assert(
      compatibilityPackageEntry,
      `${branchName} compatibility package ${compatibilityPackage} must have a compatibilityPackages entry`
    )
    assert(
      compatibilityPackageEntry.targetPackage === wrapper.packageName,
      `${branchName} compatibility package ${compatibilityPackage} must target ${wrapper.packageName}`
    )
    assert(
      compatibilityPackageEntry.packageDir,
      `${branchName} compatibility package ${compatibilityPackage} must declare packageDir`
    )
  }
}

for (const wrapper of wrapperManifest.wrappers) {
  for (const historicalPackage of wrapper.historicalPackages || []) {
    assert(
      compatibilityPackagesByName.has(historicalPackage),
      `Historical package ${historicalPackage} must have a compatibilityPackages entry`
    )
  }
}

assert(
  wrapperManifest.sourceBranch === branchRoles.currentSourceBranch,
  `wrappers.json sourceBranch must match branch-roles currentSourceBranch ${branchRoles.currentSourceBranch}`
)
assert(
  branchRoles.targetBranchModel?.main === mainRole.role,
  'targetBranchModel.main must match the declared main branch role'
)
assert(
  branchRoles.targetBranchModel?.v2 === rolesByName.get('v2')?.role,
  'targetBranchModel.v2 must match the declared v2 branch role'
)
assert(
  branchRoles.targetBranchModel?.v3 === rolesByName.get('v3')?.role,
  'targetBranchModel.v3 must match the declared v3 branch role'
)
assert(branchRoles.publicOrganization === wrapperManifest.organization, 'Public organization must match wrappers.json')
assert(
  branchRoles.publicMainRepository?.sourcePolicy === 'public-open-source-main-repository',
  'Open-source main repository must publish source, demo code, documentation, and release artifacts'
)
assertPublicRepository(branchRoles.publicMainRepository.github, branchRoles.publicOrganization, 'Open-source main GitHub repository')
assertPublicRepository(branchRoles.publicMainRepository.gitee, branchRoles.publicOrganization, 'Open-source main Gitee repository')

const publicMainRepo = repositoryPath(branchRoles.publicMainRepository.github)
assertPublicRepository(
  wrapperManifest.corePackage.github,
  wrapperManifest.organization,
  `${wrapperManifest.corePackage.packageName} GitHub repository`
)
assertPublicRepository(
  wrapperManifest.corePackage.gitee,
  wrapperManifest.organization,
  `${wrapperManifest.corePackage.packageName} Gitee repository`
)
assert(
  repositoryPath(wrapperManifest.corePackage.github) !== publicMainRepo,
  `${wrapperManifest.corePackage.packageName} must use a dedicated core repository, not the open-source main repository`
)
for (const wrapper of wrapperManifest.wrappers) {
  assertPublicRepository(wrapper.github, wrapperManifest.organization, `${wrapper.packageName} GitHub repository`)
  assertPublicRepository(wrapper.gitee, wrapperManifest.organization, `${wrapper.packageName} Gitee repository`)
  assert(
    repositoryPath(wrapper.github) !== publicMainRepo,
    `${wrapper.packageName} must use a dedicated component repository, not the open-source main repository`
  )
}

console.log(
  `Verified ${branchRoles.branches.length} branch roles, aggregate origin, and ${wrapperManifest.wrappers.length + 1} public core/component repositories.`
)
