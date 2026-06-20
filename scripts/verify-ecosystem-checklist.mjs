import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEcosystemReleaseContext, readJson } from './lib/ecosystem-packages.mjs'
import { readCoreRendererDefinitions, summarizeRendererSupport } from './lib/format-support.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const checklistPath = join(sourceRoot, 'ECOSYSTEM_REFACTOR_CHECKLIST.md')
const checklist = await readFile(checklistPath, 'utf8')
const { wrapperManifest, entries } = await loadEcosystemReleaseContext(sourceRoot)
const branchRoles = await readJson(join(sourceRoot, 'ecosystem', 'branch-roles.json'))
const renderers = await readCoreRendererDefinitions(sourceRoot)
const supportSummary = summarizeRendererSupport(renderers)

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function assertIncludes(value, label) {
  assert(typeof value === 'string' && value.length > 0, `${label} received an empty value`)
  assert(checklist.includes(value), `Checklist must include ${label}: ${value}`)
}

function assertIncludesUrl(value, label) {
  const withoutProtocol = value.replace(/^https?:\/\//, '')
  assert(
    checklist.includes(value) || checklist.includes(withoutProtocol),
    `Checklist must include ${label}: ${value}`
  )
}

function assertIncludesAny(values, label) {
  assert(values.some(value => checklist.includes(value)), `Checklist must include ${label}: ${values.join(' or ')}`)
}

for (const requiredTerm of [
  '纯 TypeScript core',
  '@file-viewer/core',
  '@file-viewer/*',
  'React legacy',
  'Vue 2.6',
  'Vue 2.7',
  'Vue 3',
  'Pure JS',
  'jQuery',
  'Svelte',
  'GitHub',
  'Gitee',
  'flyfish-dev',
  '开源总仓库',
  '完成审计标准'
]) {
  assertIncludes(requiredTerm, 'core objective term')
}

assertIncludes(`${supportSummary.uniqueExtensionCount} 个扩展名`, 'supported extension count')
assertIncludes(`${supportSummary.rendererCount} 条预览链路`, 'renderer pipeline count')

assertIncludes(wrapperManifest.corePackage.packageName, 'core package name')
assertIncludesUrl(wrapperManifest.corePackage.sourceRepository, 'public core source repository')
assertIncludes(wrapperManifest.corePackage.visibility, 'core source visibility policy')

for (const entry of entries) {
  assertIncludes(entry.packageName, `${entry.kind} package`)
}

for (const wrapper of wrapperManifest.wrappers) {
  assertIncludes(wrapper.framework, `${wrapper.id} framework`)
  assertIncludes(wrapper.packageName, `${wrapper.id} standard package`)
  assertIncludes(wrapper.repository, `${wrapper.id} repository name`)
  assertIncludesUrl(wrapper.github, `${wrapper.id} GitHub repository`)
  assertIncludesUrl(wrapper.gitee, `${wrapper.id} Gitee repository`)
  for (const historicalPackage of wrapper.historicalPackages || []) {
    assertIncludes(historicalPackage, `${wrapper.id} historical package`)
  }
}

assertIncludes(branchRoles.sourceRemote.name, 'private source remote name')
assertIncludesUrl(branchRoles.sourceRemote.url, 'private source remote URL')
assertIncludes(branchRoles.sourceRemote.visibility, 'private source remote visibility')
assertIncludes(branchRoles.publicOrganization, 'public organization')
assertIncludesUrl(branchRoles.publicMainRepository.github, 'open-source main GitHub repository')
assertIncludesUrl(branchRoles.publicMainRepository.gitee, 'open-source main Gitee repository')
assertIncludes(branchRoles.publicMainRepository.sourcePolicy, 'open-source main repository source policy')

for (const branch of branchRoles.branches) {
  assertIncludes(branch.name, `${branch.name} branch name`)
  assertIncludes(branch.role, `${branch.name} branch role`)
  assertIncludes(branch.packageName, `${branch.name} branch package`)
  assertIncludes(branch.sourcePolicy, `${branch.name} branch source policy`)
  for (const compatibilityPackage of branch.compatibilityPackages || []) {
    assertIncludes(compatibilityPackage, `${branch.name} compatibility package`)
  }
}

for (const requiredAuditItem of [
  '当前私有 Gitea 仓库作为完整原始聚合仓',
  '`v2` / `v3` 分支分别是 Vue2.7 / Vue3 标准组件包',
  '所有目标标准组件包 均存在 GitHub 和 Gitee 公开仓库',
  '所有 `@file-viewer/*` npm 包均发布成功',
  '所有标准组件包的 README 中英文完整',
  'GitHub 开源总仓库包含最新全渠道构建产物',
  'Gitee 开源总仓库使用 `pnpm public:gitee:snapshot` 同步到与 GitHub 开源总仓库相同的文件树',
  '本地 smoke 已通过 `pnpm verify:migration-gates` 与 `pnpm verify:browser-smoke`',
  '生产 smoke 证明 Demo、文档站、开源总仓下载物和 npm/Gitee 发布结果与当前私有 `main` 发布基线一致',
  '发布记录已经证明私有 Gitea `main`、GitHub 开源总仓库、GitHub Release、Demo 构建物和文档构建物的版本口径一致'
]) {
  assertIncludes(requiredAuditItem, 'completion audit requirement')
}

for (const requiredGate of [
  'pnpm verify:browser-smoke',
  'pnpm verify:experience-baseline',
  'pnpm verify:format-support',
  'pnpm verify:migration-gates',
  'pnpm verify:smoke-matrix'
]) {
  assertIncludes(requiredGate, 'non-regression verification gate')
}

for (const requiredChecklistStatus of [
  '## 目标包名和仓库矩阵',
  '## Phase 3: 当前仓库分支职责重排',
  '## Phase 4: 标准组件包实现',
  '## Phase 5: 公开仓库与 README',
  '## Phase 6: npm 发布与兼容别名',
  '## Phase 7: 构建产物与公开分发',
  '## Phase 8: 验证与发布门禁'
]) {
  assertIncludes(requiredChecklistStatus, 'required checklist section')
}

assertIncludesAny(
  ['[ ] 待建', '[~] monorepo', '[~] GitHub 已发布', '[x] v2.0.1 已刷新'],
  'matrix progress status markers'
)

console.log(
  `[ecosystem-checklist] Verified checklist coverage for ${wrapperManifest.wrappers.length} component packages, ${entries.length} npm packages, ${branchRoles.branches.length} branch roles, ${supportSummary.rendererCount} renderer pipelines, and ${supportSummary.uniqueExtensionCount} extensions.`
)
