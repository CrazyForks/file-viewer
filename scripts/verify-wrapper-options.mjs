import { constants } from 'node:fs'
import { access, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEcosystemReleaseContext } from './lib/ecosystem-packages.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const { wrapperManifest } = await loadEcosystemReleaseContext(sourceRoot)

const requiredViewerTypeExports = [
  'CreateViewerFrameOptions',
  'FileRef',
  'ViewerAiOptions',
  'ViewerArchiveOptions',
  'ViewerCadOptions',
  'ViewerDocxOptions',
  'ViewerFrameComponentBridgeOptions',
  'ViewerFrameComponentProps',
  'ViewerFrameContainerComponentProps',
  'ViewerFrameControllerAccessor',
  'ViewerFrameController',
  'ViewerFrameEventHandler',
  'ViewerFrameEventPayload',
  'ViewerFrameEventType',
  'ViewerFrameFilePostController',
  'ViewerFrameFilePostControllerOptions',
  'ViewerFrameHostComponentProps',
  'ViewerFrameIframeComponentProps',
  'ViewerFrameOptions',
  'ViewerPdfOptions',
  'ViewerRuntimeOptions',
  'ViewerSearchOptions',
  'ViewerThemeMode',
  'ViewerToolbarOptions',
  'ViewerToolbarPosition',
  'ViewerTypstOptions',
  'ViewerWatermarkOptions'
]

const requiredWebCoreTypes = [
  'FileViewerAiOptions',
  'FileViewerArchiveOptions',
  'FileViewerDocxOptions',
  'FileViewerPdfOptions',
  'FileViewerSearchOptions',
  'FileViewerSerializableCadOptions',
  'FileViewerSerializableOptions',
  'FileViewerSerializableToolbarOptions',
  'FileViewerThemeMode',
  'FileViewerTypstOptions',
  'FileViewerWatermarkOptions'
]

const forbiddenDirectCoreOptionTypes = [
  'FileViewerAiOptions',
  'FileViewerArchiveOptions',
  'FileViewerCadOptions',
  'FileViewerDocxOptions',
  'FileViewerOptions',
  'FileViewerPdfOptions',
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
    join(sourceRoot, packageDir, 'src', 'index.tsx')
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hasTypeToken(source, typeName) {
  return new RegExp(`\\b${escapeRegExp(typeName)}\\b`).test(source)
}

function hasExportedViewerType(source, typeName) {
  const directAlias = new RegExp(`export\\s+type\\s+${escapeRegExp(typeName)}\\b`)
  const reexportBlock = new RegExp(
    `export\\s+type\\s*{[\\s\\S]*\\b${escapeRegExp(typeName)}\\b[\\s\\S]*}\\s+from\\s+['"]@file-viewer/web['"]`
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
  const fieldDeclaration = new RegExp(`(^|\\n)\\s*${escapeRegExp(fieldName)}\\??\\s*:`, 'm')
  return fieldDeclaration.test(source)
}

const webWrapper = wrapperManifest.wrappers.find(wrapper => wrapper.packageName === '@file-viewer/web')
assert(webWrapper, 'Missing @file-viewer/web wrapper in ecosystem/wrappers.json')

let checked = 0
for (const wrapper of wrapperManifest.wrappers) {
  const { content, path } = await readWrapperSource(wrapper.packageDir)

  if (wrapper.packageName === '@file-viewer/web') {
    for (const coreType of requiredWebCoreTypes) {
      assert(
        hasTypeToken(content, coreType),
        `${path} must bridge ${coreType} from @file-viewer/core`
      )
    }
    for (const typeName of requiredViewerTypeExports) {
      assert(
        hasTypeToken(content, typeName),
        `${path} must export ${typeName} for the shared wrapper option surface`
      )
    }
    checked += 1
    continue
  }

  assert(
    content.includes('from \'@file-viewer/web\'') || content.includes('from "@file-viewer/web"'),
    `${path} must consume the shared @file-viewer/web wrapper contract`
  )

  for (const typeName of requiredViewerTypeExports) {
    assert(
      hasExportedViewerType(content, typeName),
      `${path} must re-export ${typeName} from @file-viewer/web`
    )
  }

  for (const typeName of forbiddenDirectCoreOptionTypes) {
    assert(
      !hasForbiddenCoreOptionImport(content, typeName),
      `${path} must not import ${typeName} directly from @file-viewer/core; use @file-viewer/web`
    )
  }

  for (const fieldName of forbiddenLocalOptionFields) {
    assert(
      !hasForbiddenLocalOptionField(content, fieldName),
      `${path} must not redeclare option field "${fieldName}"; pass it through ViewerRuntimeOptions`
    )
  }

  checked += 1
}

console.log(`Verified ${checked} standard wrapper option surfaces against @file-viewer/web.`)
