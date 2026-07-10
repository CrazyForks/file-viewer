import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { DOMParser, parseHTML } from 'linkedom'
import JSZip from 'jszip'

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)))
const fixturesDir = join(packageDir, 'test', 'fixtures')

globalThis.DOMParser = DOMParser
const { document, window } = parseHTML('<!doctype html><html><body></body></html>')
globalThis.document = document
globalThis.HTMLElement = window.HTMLElement
if (typeof globalThis.btoa !== 'function') {
  globalThis.btoa = (value) => Buffer.from(value, 'binary').toString('base64')
}

const { parseOfdDocument, renderOfd, setPageScale } = await import(
  pathToFileURL(join(packageDir, 'vendor/dltech/ofd/ofd.js')).href
)

const parseOfd = (bytes) =>
  new Promise((resolve, reject) => {
    parseOfdDocument({
      ofd: bytes,
      success: resolve,
      fail: reject,
    })
  })

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const countSealDivs = (pageDivs) =>
  pageDivs.reduce((total, pageDiv) => total + pageDiv.querySelectorAll('[name="seal_img_div"]').length, 0)

const readPixelStyle = (style, property) => {
  const match = style.match(new RegExp(`${property}:\\s*(-?[\\d.]+)px`))
  return match ? Number(match[1]) : Number.NaN
}

const verifyPngSeals = async () => {
  const bytes = await readFile(join(fixturesDir, 'seal-png.ofd'))
  const docs = await parseOfd(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
  const doc = docs[0]
  const stampPageIds = Object.keys(doc.stampAnnot || {})
  assert(stampPageIds.length >= 5, `Expected PNG seal page refs, got ${stampPageIds.join(',')}`)

  let stampCount = 0
  for (const pageId of stampPageIds) {
    for (const stamp of doc.stampAnnot[pageId]) {
      stampCount += 1
      assert(stamp.type === 'png', `Expected png stamp on page ${pageId}, got ${stamp.type}`)
      assert(stamp.obj?.img?.startsWith('data:image/'), `Missing seal image data URL on page ${pageId}`)
      assert(stamp.obj?.boundary?.w > 0 && stamp.obj?.boundary?.h > 0, `Invalid seal boundary on page ${pageId}`)
    }
  }
  assert(stampCount >= 5, `Expected at least 5 PNG stamps, got ${stampCount}`)

  setPageScale(1)
  const pageDivs = renderOfd(800, doc)
  const sealDivCount = countSealDivs(pageDivs)
  assert(sealDivCount >= 5, `Expected rendered seal_img_div nodes, got ${sealDivCount}`)

  const firstSeal = pageDivs
    .flatMap((pageDiv) => Array.from(pageDiv.querySelectorAll('[name="seal_img_div"]')))
    .find(Boolean)
  assert(firstSeal, 'Missing first seal DOM node')
  const style = firstSeal.getAttribute('style') || ''
  assert(/position:\s*absolute/.test(style), `Seal should be absolutely positioned: ${style}`)
  assert(/width:\s*\d/.test(style) && /height:\s*\d/.test(style), `Seal should have width/height: ${style}`)
  const img = firstSeal.querySelector('img')
  assert(img?.getAttribute('src')?.startsWith('data:image/'), 'Rendered seal img missing data URL')
}

const verifyOfdSeals = async () => {
  const bytes = await readFile(join(fixturesDir, 'seal-ofd.ofd'))
  const docs = await parseOfd(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
  const doc = docs[0]
  const stamps = doc.stampAnnot?.['10'] || []
  assert(stamps.length === 1, `Expected 1 nested OFD seal on page 10, got ${stamps.length}`)
  assert(stamps[0].type === 'ofd', `Expected ofd seal type, got ${stamps[0].type}`)
  assert(stamps[0].obj?.pages?.length >= 1, 'Nested OFD seal pages missing')
  assert(stamps[0].stamp?.stampAnnot?.boundary?.w === 30, 'Nested OFD seal boundary width mismatch')

  setPageScale(1)
  const pageDivs = renderOfd(800, doc)
  const sealDivCount = countSealDivs(pageDivs)
  assert(sealDivCount >= 1, `Expected nested OFD seal_img_div, got ${sealDivCount}`)
}

const verifyOversizedSealGeometry = async () => {
  const bytes = await readFile(join(fixturesDir, 'seal-png.ofd'))
  const zip = await JSZip.loadAsync(bytes)
  const signaturePath = 'Doc_0/Signs/Sign_0/Signature.xml'
  const signatureFile = zip.file(signaturePath)
  assert(signatureFile, `Missing ${signaturePath} in PNG seal fixture`)
  const signatureXml = await signatureFile.async('string')
  const oversizedSignatureXml = signatureXml.replace(
    /<ofd:StampAnnot ID="s002"[^>]*\/>/,
    '<ofd:StampAnnot ID="s002" Boundary="100 100 400 400" PageRef="1"/>'
  )
  assert(oversizedSignatureXml !== signatureXml, 'Could not create oversized seal regression fixture')
  zip.file(signaturePath, oversizedSignatureXml)

  const oversizedBytes = await zip.generateAsync({ type: 'uint8array' })
  const docs = await parseOfd(oversizedBytes.buffer)
  const doc = docs[0]
  const stamp = doc.stampAnnot?.['1']?.find(item => item.stamp?.['@_ID'] === 's002')
    || doc.stampAnnot?.['1']?.[0]
  assert(stamp?.obj?.boundary?.w > 0, 'Oversized seal boundary was not parsed')

  setPageScale(1)
  const pageDivs = renderOfd(800, doc)
  const pageDiv = pageDivs.find(page => page.id === '1')
  assert(pageDiv, 'Missing page 1 for oversized seal regression')
  const pageStyle = pageDiv.getAttribute('style') || ''
  assert(/overflow:\s*hidden/.test(pageStyle), `OFD page must clip off-page content: ${pageStyle}`)

  const sealDiv = pageDiv.querySelector('[name="seal_img_div"]')
  assert(sealDiv, 'Missing oversized seal DOM node')
  const sealStyle = sealDiv.getAttribute('style') || ''
  const pageWidth = readPixelStyle(pageStyle, 'width')
  const sealWidth = readPixelStyle(sealStyle, 'width')
  const sealLeft = readPixelStyle(sealStyle, 'left')
  assert(Number.isFinite(pageWidth) && Number.isFinite(sealWidth), `Missing page/seal width: ${pageStyle} | ${sealStyle}`)
  assert(sealWidth > pageWidth, `Oversized seal must keep its declared width (${sealWidth} <= ${pageWidth})`)
  assert(sealLeft > 0, `Oversized seal must keep its declared left offset: ${sealStyle}`)
}

const verifyExternalIssueFixture = async (fixturePath) => {
  const bytes = await readFile(fixturePath)
  const docs = await parseOfd(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
  const doc = docs[0]
  setPageScale(1)
  const pageDivs = renderOfd(800, doc)
  assert(pageDivs.length > 0, `External issue fixture has no rendered pages: ${fixturePath}`)
  assert(countSealDivs(pageDivs) > 0, `External issue fixture has no rendered seals: ${fixturePath}`)
  assert(
    pageDivs.every(page => /overflow:\s*hidden/.test(page.getAttribute('style') || '')),
    `External issue fixture pages must clip off-page seals: ${fixturePath}`
  )
  const preservesOversizedSeal = pageDivs.some(page => {
    const pageWidth = readPixelStyle(page.getAttribute('style') || '', 'width')
    return Array.from(page.querySelectorAll('[name="seal_img_div"]')).some(seal =>
      readPixelStyle(seal.getAttribute('style') || '', 'width') > pageWidth
    )
  })
  assert(preservesOversizedSeal, `External issue fixture oversized seal was unexpectedly clamped: ${fixturePath}`)
}

await verifyPngSeals()
await verifyOfdSeals()
await verifyOversizedSealGeometry()
if (process.env.FILE_VIEWER_GITHUB_94_OFD) {
  await verifyExternalIssueFixture(process.env.FILE_VIEWER_GITHUB_94_OFD)
}
console.log('verify-github-94: OFD electronic seals parse and render OK')
