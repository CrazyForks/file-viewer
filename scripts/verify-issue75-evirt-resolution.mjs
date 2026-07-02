import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const modulePath = pathToFileURL(resolve('packages/renderers/spreadsheet/dist/spreadsheet.js')).href
const { resolveEVirtTableConstructor } = await import(modulePath)

function FakeEVirtTable() {}

const cases = [
  ['module function', FakeEVirtTable],
  ['default function', { default: FakeEVirtTable }],
  ['named function', { EVirtTable: FakeEVirtTable }],
  ['module.exports function', { 'module.exports': FakeEVirtTable }],
  ['nested default function', { default: { default: FakeEVirtTable } }],
  ['nested named function', { default: { EVirtTable: FakeEVirtTable } }],
  ['module.exports default function', { 'module.exports': { default: FakeEVirtTable } }],
  ['module.exports named function', { 'module.exports': { EVirtTable: FakeEVirtTable } }],
]

for (const [label, moduleShape] of cases) {
  const resolved = resolveEVirtTableConstructor(moduleShape)
  if (resolved !== FakeEVirtTable) {
    throw new Error(`[issue75-evirt-resolution] ${label} resolved the wrong constructor.`)
  }
}

let failed = false
try {
  resolveEVirtTableConstructor({ default: { notConstructor: true } })
} catch (error) {
  failed = /Unable to resolve e-virt-table constructor/.test(error?.message || '')
}

if (!failed) {
  throw new Error('[issue75-evirt-resolution] invalid module shape did not throw the expected error.')
}

console.log(`[issue75-evirt-resolution] Verified ${cases.length} e-virt-table module shapes.`)
