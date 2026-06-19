import fs from 'node:fs'
import path from 'node:path'

const outputDir =
  process.env.DEMO_OUTPUT_DIR ||
  process.env.CLOUDFLARE_PAGES_OUTPUT_DIR ||
  'apps/viewer-demo/dist'
const requiredHtmlEntries = ['index.html', 'compare.html']

const fail = message => {
  console.error(`[demo-output] ${message}`)
  process.exit(1)
}

const assertFile = filePath => {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    fail(`Missing required file: ${filePath}`)
  }
}

const readText = filePath => fs.readFileSync(filePath, 'utf8')

const stripQuery = value => value.split(/[?#]/)[0]

const resolveAssetPath = (htmlFile, reference) => {
  const normalized = stripQuery(reference)
  if (/^(https?:)?\/\//.test(normalized) || normalized.startsWith('data:')) {
    return null
  }
  const baseDir = path.dirname(htmlFile)
  return normalized.startsWith('/')
    ? path.join(outputDir, normalized.slice(1))
    : path.resolve(baseDir, normalized)
}

const collectReferences = html => {
  const references = new Set()
  const attributePattern = /\b(?:src|href)=["']([^"']+)["']/g
  let match
  while ((match = attributePattern.exec(html))) {
    references.add(match[1])
  }
  return references
}

for (const entry of requiredHtmlEntries) {
  const htmlFile = path.join(outputDir, entry)
  assertFile(htmlFile)

  const html = readText(htmlFile)
  if (entry === 'compare.html' && !html.includes('compare-app')) {
    fail('compare.html does not contain the compare app mount node.')
  }
  if (entry === 'index.html' && !html.includes('id="app"')) {
    fail('index.html does not contain the main app mount node.')
  }

  for (const reference of collectReferences(html)) {
    const assetPath = resolveAssetPath(htmlFile, reference)
    if (!assetPath) {
      continue
    }
    assertFile(assetPath)
    if (/\.(?:js|css)$/i.test(assetPath)) {
      const head = readText(assetPath).slice(0, 80).trimStart().toLowerCase()
      if (head.startsWith('<!doctype html') || head.startsWith('<html')) {
        fail(`Referenced asset resolved to HTML instead of a static asset: ${reference}`)
      }
    }
  }
}

console.log(`[demo-output] Verified ${requiredHtmlEntries.join(', ')} in ${outputDir}`)
