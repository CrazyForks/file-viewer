import { diffArrays, diffChars } from 'diff'
import type { FileViewerDocumentChunk } from '@file-viewer/core'

export type TextDiffSegmentKind = 'equal' | 'added' | 'removed'
export type TextDiffRowKind = 'equal' | 'added' | 'removed' | 'changed'

export interface TextDiffSegment {
  kind: TextDiffSegmentKind;
  value: string;
}

export interface TextDiffRow {
  id: number;
  kind: TextDiffRowKind;
  leftLine: number | null;
  rightLine: number | null;
  left: TextDiffSegment[];
  right: TextDiffSegment[];
}

export interface TextDiffSummary {
  added: number;
  removed: number;
  changed: number;
  unchanged: number;
}

export interface TextDiffResult {
  rows: TextDiffRow[];
  summary: TextDiffSummary;
  leftCharacters: number;
  rightCharacters: number;
  engine: 'jsdiff';
}

export const MAX_COMPARE_TEXT_CHARACTERS = 1_000_000
export const MAX_COMPARE_TEXT_LINES = 12_000

const normalizeText = (value: string) => value
  .replace(/\r\n?/g, '\n')
  .replace(/\u00a0/g, ' ')

const splitLines = (value: string) => {
  if (!value) {
    return []
  }
  return normalizeText(value).split('\n')
}

/**
 * Text chunks overlap by design. Use each chunk's source anchor once so the
 * comparison receives the actual document text rather than duplicated windows.
 */
export const extractComparableDocumentText = (chunks: FileViewerDocumentChunk[]) => {
  const anchors = new Map<string, FileViewerDocumentChunk['anchor']>()
  chunks.forEach(chunk => {
    if (chunk.anchor?.id && !anchors.has(chunk.anchor.id)) {
      anchors.set(chunk.anchor.id, chunk.anchor)
    }
  })
  if (anchors.size) {
    const seenRenderedAnchors = new Set<string>()
    return Array.from(anchors.values())
      .sort((left, right) => left.index - right.index)
      .filter(anchor => {
        const text = normalizeText(anchor.text || '')
        const geometryKey = [anchor.top, anchor.left, anchor.width, anchor.height]
          .map(value => Number(value).toFixed(2))
          .join(':')
        const key = `${geometryKey}\u0000${text}`
        if (seenRenderedAnchors.has(key)) {
          return false
        }
        seenRenderedAnchors.add(key)
        return true
      })
      .map(anchor => normalizeText(anchor.text || ''))
      .filter(text => text.length > 0)
      .join('\n')
  }
  return chunks.map(chunk => normalizeText(chunk.text || '')).filter(Boolean).join('\n')
}

const equalSegment = (value: string): TextDiffSegment[] => [{ kind: 'equal', value }]

const createChangedSegments = (left: string, right: string) => {
  const changes = diffChars(left, right)
  return {
    left: changes
      .filter(change => !change.added)
      .map(change => ({
        kind: change.removed ? 'removed' : 'equal',
        value: change.value,
      } satisfies TextDiffSegment)),
    right: changes
      .filter(change => !change.removed)
      .map(change => ({
        kind: change.added ? 'added' : 'equal',
        value: change.value,
      } satisfies TextDiffSegment)),
  }
}

export const buildDocumentTextDiff = (leftText: string, rightText: string): TextDiffResult => {
  const normalizedLeft = normalizeText(leftText)
  const normalizedRight = normalizeText(rightText)
  if (normalizedLeft.length + normalizedRight.length > MAX_COMPARE_TEXT_CHARACTERS) {
    throw new RangeError('compare-text-too-large')
  }
  const leftLines = splitLines(normalizedLeft)
  const rightLines = splitLines(normalizedRight)
  if (leftLines.length + rightLines.length > MAX_COMPARE_TEXT_LINES) {
    throw new RangeError('compare-lines-too-large')
  }

  const rows: TextDiffRow[] = []
  const summary: TextDiffSummary = { added: 0, removed: 0, changed: 0, unchanged: 0 }
  let leftLine = 1
  let rightLine = 1
  let removedBuffer: string[] = []
  let addedBuffer: string[] = []

  const pushRow = (row: Omit<TextDiffRow, 'id'>) => {
    rows.push({ id: rows.length + 1, ...row })
  }

  const flushChangedBlock = () => {
    if (!removedBuffer.length && !addedBuffer.length) {
      return
    }
    const paired = Math.min(removedBuffer.length, addedBuffer.length)
    for (let index = 0; index < paired; index += 1) {
      const left = removedBuffer[index] || ''
      const right = addedBuffer[index] || ''
      const segments = createChangedSegments(left, right)
      pushRow({
        kind: 'changed',
        leftLine: leftLine + index,
        rightLine: rightLine + index,
        left: segments.left,
        right: segments.right,
      })
      summary.changed += 1
    }
    for (let index = paired; index < removedBuffer.length; index += 1) {
      pushRow({
        kind: 'removed',
        leftLine: leftLine + index,
        rightLine: null,
        left: [{ kind: 'removed', value: removedBuffer[index] || '' }],
        right: [],
      })
      summary.removed += 1
    }
    for (let index = paired; index < addedBuffer.length; index += 1) {
      pushRow({
        kind: 'added',
        leftLine: null,
        rightLine: rightLine + index,
        left: [],
        right: [{ kind: 'added', value: addedBuffer[index] || '' }],
      })
      summary.added += 1
    }
    leftLine += removedBuffer.length
    rightLine += addedBuffer.length
    removedBuffer = []
    addedBuffer = []
  }

  diffArrays(leftLines, rightLines).forEach(change => {
    const values = change.value as string[]
    if (change.removed) {
      removedBuffer.push(...values)
      return
    }
    if (change.added) {
      addedBuffer.push(...values)
      return
    }
    flushChangedBlock()
    values.forEach(value => {
      pushRow({
        kind: 'equal',
        leftLine,
        rightLine,
        left: equalSegment(value),
        right: equalSegment(value),
      })
      leftLine += 1
      rightLine += 1
      summary.unchanged += 1
    })
  })
  flushChangedBlock()

  return {
    rows,
    summary,
    leftCharacters: normalizedLeft.length,
    rightCharacters: normalizedRight.length,
    engine: 'jsdiff',
  }
}
