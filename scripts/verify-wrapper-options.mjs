import { constants } from 'node:fs'
import { access, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEcosystemReleaseContext } from './lib/ecosystem-packages.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const { wrapperManifest } = await loadEcosystemReleaseContext(sourceRoot)

const requiredViewerTypeExports = [
  'FileRef',
  'ViewerAiOptions',
  'ViewerArchiveOptions',
  'ViewerCadOptions',
  'ViewerController',
  'ViewerControllerAccessor',
  'ViewerControllerHandle',
  'ViewerDocxOptions',
  'ViewerEvent',
  'ViewerEventHandler',
  'ViewerEventType',
  'ViewerFetchFile',
  'ViewerFetchInput',
  'ViewerMountOptions',
  'ViewerOptions',
  'ViewerPdfOptions',
  'ViewerSpreadsheetOptions',
  'ViewerCoreOptions',
  'ViewerSearchOptions',
  'ViewerSourceInput',
  'ViewerThemeMode',
  'ViewerToolbarOptions',
  'ViewerToolbarPosition',
  'ViewerTypstOptions',
  'ViewerWatermarkOptions'
]

const requiredVue3TypeExports = [
  'FileViewerVue3PluginOptions',
  'FileViewerVue3Handle'
]

const forbiddenLegacyOptionTypes = [
  'CreateViewerFrameOptions',
  'ViewerDirectFrameHandle',
  'ViewerFrameComponentBridgeOptions',
  'ViewerFrameComponentProps',
  'ViewerFrameContainerComponentProps',
  'ViewerFrameController',
  'ViewerFrameControllerAccessor',
  'ViewerFrameControllerHandle',
  'ViewerFrameEventHandler',
  'ViewerFrameEventPayload',
  'ViewerFrameEventType',
  'ViewerFrameFilePostController',
  'ViewerFrameFilePostControllerOptions',
  'ViewerFrameHostComponentProps',
  'ViewerFrameIframeComponentProps',
  'ViewerFrameOptions',
  'ViewerFrameParamValue',
  'ViewerMountedFrameHandle'
]

const forbiddenDirectCoreOptionTypes = [
  'FileViewerAiOptions',
  'FileViewerArchiveOptions',
  'FileViewerCadOptions',
  'FileViewerDocxOptions',
  'FileViewerOptions',
  'FileViewerPdfOptions',
  'FileViewerSpreadsheetOptions',
  'FileViewerSearchOptions',
  'FileViewerSerializableCadOptions',
  'FileViewerSerializableOptions',
  'FileViewerSerializableToolbarOptions',
  'FileViewerThemeMode',
  'FileViewerToolbarOptions',
  'FileViewerToolbarPosition',
  'FileViewerTypstOptions',
  'FileViewerWatermarkOptions'
]

const forbiddenLocalOptionFields = [
  'ai',
  'archive',
  'beforeOperation',
  'cad',
  'docx',
  'pdf',
  'spreadsheet',
  'search',
  'theme',
  'toolbar',
  'typst',
  'watermark'
]

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function exists(path) {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function readWrapperSource(packageDir) {
  const candidates = [
    join(sourceRoot, packageDir, 'src', 'index.ts'),
    join(sourceRoot, packageDir, 'src', 'index.tsx'),
    join(sourceRoot, packageDir, 'src', 'package', 'index.ts')
  ]

  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return {
        path: candidate,
        content: await readFile(candidate, 'utf8')
      }
    }
  }

  throw new Error(`${packageDir} must provide src/index.ts or src/index.tsx`)
}

async function readWrapperControllerSource(packageDir) {
  const candidates = [
    join(sourceRoot, packageDir, 'src', 'controller.ts'),
    join(sourceRoot, packageDir, 'src', 'package', 'controller.ts')
  ]

  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return {
        path: candidate,
        content: await readFile(candidate, 'utf8')
      }
    }
  }

  throw new Error(`${packageDir} must provide a local src/controller.ts wrapper controller`)
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hasTypeToken(source, typeName) {
  return new RegExp(`\\b${escapeRegExp(typeName)}\\b`).test(source)
}

function hasExportedType(source, typeName, specifier) {
  const directAlias = new RegExp(`export\\s+(?:interface|type)\\s+${escapeRegExp(typeName)}\\b`)
  const reexportBlock = new RegExp(
    `export\\s+type\\s*{[\\s\\S]*\\b${escapeRegExp(typeName)}\\b[\\s\\S]*}\\s+from\\s+['"]${escapeRegExp(specifier)}['"]`
  )
  return directAlias.test(source) || reexportBlock.test(source)
}

function hasForbiddenCoreOptionImport(source, typeName) {
  const coreTypeImport = new RegExp(
    `import\\s+type\\s*{[\\s\\S]*\\b${escapeRegExp(typeName)}\\b[\\s\\S]*}\\s+from\\s+['"]@file-viewer/core['"]`
  )
  const mixedCoreImport = new RegExp(
    `import\\s*{[\\s\\S]*\\btype\\s+${escapeRegExp(typeName)}\\b[\\s\\S]*}\\s+from\\s+['"]@file-viewer/core['"]`
  )
  return coreTypeImport.test(source) || mixedCoreImport.test(source)
}

function hasForbiddenLocalOptionField(source, fieldName) {
  const fieldDeclaration = new RegExp(`(^|\\n)\\s*${escapeRegExp(fieldName)}\\??\\s*:\\s*[^,\\n]+;`, 'm')
  return fieldDeclaration.test(source)
}

let checked = 0
for (const wrapper of wrapperManifest.wrappers) {
  const { content, path } = await readWrapperSource(wrapper.packageDir)
  if (wrapper.flavor === 'full') {
    assert(wrapper.basePackage, `${wrapper.packageName} full package must declare basePackage`)
    assert(
      content.includes('\'@file-viewer/preset-all\'') || content.includes('"@file-viewer/preset-all"'),
      `${path} must import @file-viewer/preset-all to enable the complete format matrix`
    )
    assert(
      content.includes(`'${wrapper.basePackage}'`) || content.includes(`"${wrapper.basePackage}"`),
      `${path} must re-export its standard package ${wrapper.basePackage}`
    )
    for (const legacyType of forbiddenLegacyOptionTypes) {
      assert(!hasTypeToken(content, legacyType), `${path} must not expose legacy iframe option type ${legacyType}`)
    }
    checked += 1
    continue
  }
  const { content: controllerContent, path: controllerPath } = await readWrapperControllerSource(wrapper.packageDir)

  for (const legacyType of forbiddenLegacyOptionTypes) {
    assert(!hasTypeToken(content, legacyType), `${path} must not expose legacy iframe option type ${legacyType}`)
    assert(!hasTypeToken(controllerContent, legacyType), `${controllerPath} must not expose legacy iframe option type ${legacyType}`)
  }

  assert(
    controllerContent.includes('from \'@file-viewer/core\'') || controllerContent.includes('from "@file-viewer/core"'),
    `${controllerPath} must consume the shared @file-viewer/core low-level contract`
  )
  for (const forbiddenToken of [
    'createFileViewerNativeController',
    'resolveFileViewerNativeLoadSource',
    'FileViewerNativeController',
    'FileViewerNativeFetchFile',
    'FileViewerNativeFetchInput',
    'FileViewerNativeSource'
  ]) {
    assert(
      !controllerContent.includes(forbiddenToken),
      `${controllerPath} must keep browser mount/source orchestration inside the component package instead of importing ${forbiddenToken} from core`
    )
  }
  assert(
    !content.includes('from \'@file-viewer/web\'') && !content.includes('from "@file-viewer/web"'),
    `${path} must not consume another component package`
  )
  assert(
    !controllerContent.includes('from \'@file-viewer/web\'') && !controllerContent.includes('from "@file-viewer/web"'),
    `${controllerPath} must not consume another component package`
  )
  assert(
    content.includes('from \'./controller\'') ||
      content.includes('from "./controller"') ||
      content.includes('from \'./controller.js\'') ||
      content.includes('from "./controller.js"'),
    `${path} must consume its local component controller instead of core mount helpers`
  )

  if (wrapper.packageName !== '@file-viewer/vue3') {
    assert(
      content.includes('from \'@file-viewer/core\'') || content.includes('from "@file-viewer/core"'),
      `${path} must inject the shared core renderer registry explicitly`
    )
  }

  for (const typeName of requiredViewerTypeExports) {
    assert(
      hasExportedType(content, typeName, './controller') ||
        hasExportedType(content, typeName, './controller.js') ||
        hasTypeToken(content, typeName),
      `${path} must re-export ${typeName} from the local component controller`
    )
  }

  if (wrapper.packageName === '@file-viewer/vue3') {
    for (const typeName of requiredVue3TypeExports) {
      assert(hasTypeToken(content, typeName), `${path} must expose Vue 3 type ${typeName}`)
    }
    checked += 1
    continue
  }

  for (const typeName of forbiddenDirectCoreOptionTypes) {
    assert(
      !hasForbiddenCoreOptionImport(content, typeName),
      `${path} must not import ${typeName} directly from @file-viewer/core; use shared Viewer* aliases`
    )
  }

  for (const fieldName of forbiddenLocalOptionFields) {
    assert(
      !hasForbiddenLocalOptionField(content, fieldName),
      `${path} must not redeclare option field "${fieldName}"; pass it through ViewerMountOptions`
    )
  }

  checked += 1
}

console.log(`Verified ${checked} standard component package option surfaces against the shared core contracts.`)
