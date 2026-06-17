import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export function quotedValues(text) {
  return [...text.matchAll(/'([^']+)'/g)].map(match => match[1])
}

export async function readCoreRendererDefinitions(sourceRoot) {
  const formatSourcePath = join(sourceRoot, 'packages', 'core', 'src', 'formats.ts')
  const source = await readFile(formatSourcePath, 'utf8')
  const constants = new Map()
  const constantPattern = /export const ([A-Z0-9_]+) = \[([\s\S]*?)\] as const;/g
  for (const match of source.matchAll(constantPattern)) {
    constants.set(match[1], quotedValues(match[2]))
  }

  const renderers = new Map()
  const rendererPattern = /\{\s*id:\s*'([^']+)'([\s\S]*?)capabilities:/g
  for (const match of source.matchAll(rendererPattern)) {
    const id = match[1]
    const body = match[2]
    const extensionMatch = body.match(/extensions:\s*(\[[\s\S]*?\]|[A-Z0-9_]+)/)
    if (!extensionMatch) {
      throw new Error(`Renderer ${id} does not declare extensions`)
    }
    const expression = extensionMatch[1].trim()
    const extensions = expression.startsWith('[')
      ? quotedValues(expression)
      : constants.get(expression)
    if (!extensions?.length) {
      throw new Error(`Renderer ${id} references unknown extension list ${expression}`)
    }
    renderers.set(id, {
      id,
      extensions: new Set(extensions),
      extensionList: extensions
    })
  }

  if (!renderers.size) {
    throw new Error('No renderer definitions were detected')
  }
  return renderers
}

export function summarizeRendererSupport(renderers) {
  const extensionOwners = new Map()
  const duplicateExtensions = []
  let rawExtensionCount = 0

  for (const renderer of renderers.values()) {
    rawExtensionCount += renderer.extensionList.length
    for (const extension of renderer.extensionList) {
      const normalized = extension.toLowerCase()
      const owner = extensionOwners.get(normalized)
      if (owner) {
        duplicateExtensions.push({
          extension: normalized,
          owners: [owner, renderer.id]
        })
        continue
      }
      extensionOwners.set(normalized, renderer.id)
    }
  }

  return {
    rendererCount: renderers.size,
    rawExtensionCount,
    uniqueExtensionCount: extensionOwners.size,
    duplicateExtensions,
    extensions: [...extensionOwners.keys()].sort()
  }
}
