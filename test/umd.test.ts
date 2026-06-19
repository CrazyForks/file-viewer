import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseUmdBook } from './helpers/umdParser'

function loadFixture(name: string): ArrayBuffer {
  const buffer = readFileSync(join(__dirname, '..', 'apps', 'viewer-demo', 'public', 'example', name))
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
}

describe('umd ebook parser', () => {
  it('parses metadata, chapter titles and zlib text segments', () => {
    const book = parseUmdBook(loadFixture('book.umd'))

    expect(book.kind).toBe('text')
    expect(book.title).toBe('Flyfish UMD 电子书样本')
    expect(book.author).toBe('Flyfish Viewer')
    expect(book.chapters).toHaveLength(2)
    expect(book.chapters[0].title).toBe('第一章 旧格式醒来')
    expect(book.chapters[0].content).toContain('UMD 是早期移动阅读器常见的电子书封装格式')
    expect(book.chapters[1].content).toContain('预览器会把章节偏移还原成目录')
    expect(book.warnings).toEqual([])
  })
})
