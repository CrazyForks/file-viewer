import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  dependencyToRendererLine,
  dependencyToRendererLines,
  modularizedRendererLines
} from './renderer-dependency-plan.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const readJson = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'))

const args = process.argv.slice(2)
const strict = args.includes('--strict')

const baseline = {
  maxDirectDependencies: 5,
  maxRendererDependencies: 4,
  maxPhaseDependencies: {
    2: 4,
    3: 0,
    4: 0
  }
}

const numberArg = (name, fallback) => {
  const prefix = `${name}=`
  const value = args.find(arg => arg.startsWith(prefix))?.slice(prefix.length)
  if (value === undefined) {
    return fallback
  }
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer, got ${value}`)
  }
  return parsed
}

const corePackage = readJson('packages/core/package.json')
const dependencies = Object.keys(corePackage.dependencies || {}).sort()
const isRetainedDependency = name => dependencyToRendererLine.get(name)?.status === 'retained'
const rendererDependencies = dependencies.filter(name => dependencyToRendererLine.has(name) && !isRetainedDependency(name))
const unclassifiedDependencies = dependencies.filter(name => !dependencyToRendererLine.has(name))

const phaseDependencySets = modularizedRendererLines.reduce((result, line) => {
  result[line.phase] ||= new Set()
  line.dependencies
    .filter(name => dependencies.includes(name))
    .forEach(name => result[line.phase].add(name))
  return result
}, {})
const phaseDependencyCount = Object.fromEntries(
  Object.entries(phaseDependencySets).map(([phase, names]) => [phase, names.size])
)

const maxDirectDependencies = strict ? 0 : numberArg('--max-direct', baseline.maxDirectDependencies)
const maxRendererDependencies = strict ? 0 : numberArg('--max-renderer', baseline.maxRendererDependencies)
const maxPhaseDependencies = Object.fromEntries(
  Object.entries(baseline.maxPhaseDependencies).map(([phase, value]) => [
    phase,
    strict ? 0 : numberArg(`--max-phase-${phase}`, value)
  ])
)

const errors = []

if (dependencies.length > maxDirectDependencies) {
  errors.push(
    `@file-viewer/core has ${dependencies.length} direct runtime dependencies, budget is ${maxDirectDependencies}`
  )
}

if (rendererDependencies.length > maxRendererDependencies) {
  errors.push(
    `@file-viewer/core has ${rendererDependencies.length} renderer runtime dependencies, budget is ${maxRendererDependencies}`
  )
}

if (unclassifiedDependencies.length) {
  errors.push(
    `@file-viewer/core has unclassified runtime dependencies: ${unclassifiedDependencies.join(', ')}`
  )
}

for (const [phase, max] of Object.entries(maxPhaseDependencies)) {
  const actual = phaseDependencyCount[phase] || 0
  if (actual > max) {
    errors.push(`phase ${phase} still has ${actual} core runtime dependencies, budget is ${max}`)
  }
}

if (errors.length) {
  console.error('[core-dependency-budget] Failed')
  errors.forEach(error => console.error(`  - ${error}`))
  console.error('\nCurrent renderer dependency ownership:')
  rendererDependencies.forEach(name => {
    const lines = dependencyToRendererLines.get(name) || []
    console.error(`  - ${name} -> ${lines.map(line => line.targetPackage).join(', ')}`)
  })
  process.exitCode = 1
} else {
  console.log(
    `[core-dependency-budget] Passed: ${dependencies.length} direct dependencies, ${rendererDependencies.length} renderer dependencies, phase budgets ${Object.entries(maxPhaseDependencies).map(([phase, max]) => `P${phase}<=${
      max
    }`).join(', ')}${strict ? ' (strict)' : ''}.`
  )
}
