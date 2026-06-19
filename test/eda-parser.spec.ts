import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { parseEdaFile } from '../packages/core/src'

describe('EDA parser', () => {
  it('parses generated OLB CFB fixtures into symbol entities and properties', async () => {
    const data = await readFile('apps/viewer-demo/public/example/sample.olb')
    const parsed = await parseEdaFile(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), 'olb')

    expect(parsed.parser).toBe('cfb')
    expect(parsed.type).toBe('olb')
    expect(parsed.tree.length).toBeGreaterThan(0)
    expect(parsed.stats.confidence).toBe('high')
    expect(parsed.stats.symbolCount).toBe(2)
    expect(parsed.streams.some(stream => stream.path.includes('RESISTOR'))).toBe(true)
    expect(parsed.strings.join('\n')).toContain('Demo resistor symbol')

    const resistor = parsed.entities.find(entity => entity.name === 'RESISTOR')
    expect(resistor?.role).toBe('symbol')
    expect(resistor?.pins).toEqual(['1', '2'])
    expect(resistor?.footprint).toBe('R_0603')
    expect(resistor?.description).toBe('Demo resistor symbol')
    expect(resistor?.properties.some(property => property.key === 'Footprint')).toBe(true)
    expect(parsed.diagnostics.some(diagnostic => diagnostic.code === 'coverage')).toBe(true)
  })

  it('parses generated DRA CFB fixtures into drawing, footprint and padstack hints', async () => {
    const data = await readFile('apps/viewer-demo/public/example/sample.dra')
    const parsed = await parseEdaFile(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), 'dra')

    expect(parsed.parser).toBe('cfb')
    expect(parsed.type).toBe('dra')
    expect(parsed.stats.footprintCount).toBe(1)
    expect(parsed.stats.padstackCount).toBe(1)
    expect(parsed.entities.some(entity => entity.role === 'footprint' && entity.path.includes('Footprint'))).toBe(true)

    const padstack = parsed.entities.find(entity => entity.role === 'padstack')
    expect(padstack?.name).toBe('SMD_RECT')
    expect(padstack?.properties.some(property => property.key === 'Drill' && property.value === '0')).toBe(true)

    const header = parsed.streams.find(stream => stream.path.includes('Header.txt'))
    expect(header?.properties.some(property => property.key === 'Layers')).toBe(true)
  })

  it('falls back safely for non-CFB DRA data', async () => {
    const buffer = new TextEncoder().encode('DRA fallback fixture with PADSTACK and ROUTE').buffer
    const parsed = await parseEdaFile(buffer, 'dra')

    expect(parsed.parser).toBe('binary')
    expect(parsed.type).toBe('dra')
    expect(parsed.warnings[0]).toContain('不是标准 CFB')
    expect(parsed.diagnostics.some(diagnostic => diagnostic.code === 'parser')).toBe(true)
    expect(parsed.streams[0].role).toBe('padstack')
    expect(parsed.strings.join('\n')).toContain('PADSTACK')
  })
})
