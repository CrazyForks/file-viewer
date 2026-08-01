export type SvgMatrix = {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
}

export type SvgPoint = {
  x: number
  y: number
}

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value))
}

const normalizeNearZero = (value: number) => {
  return Math.abs(value) < 1e-12 ? 0 : value
}

const formatSvgNumber = (value: number) => {
  return String(Math.round(normalizeNearZero(value) * 1_000_000) / 1_000_000)
}

export const getTrapezoidPoints = (
  width: number,
  height: number,
  adjustment = 25_000
): SvgPoint[] => {
  const safeWidth = Math.max(0, width)
  const safeHeight = Math.max(0, height)
  const shortSide = Math.min(safeWidth, safeHeight)
  if (!shortSide) {
    return [
      { x: 0, y: safeHeight },
      { x: 0, y: 0 },
      { x: safeWidth, y: 0 },
      { x: safeWidth, y: safeHeight }
    ]
  }

  // ECMA-376 presetShapeDefinitions.xml defines maxAdj as
  // 50000 * w / ss and the top inset as ss * adj / 100000.
  const maxAdjustment = (50_000 * safeWidth) / shortSide
  const pinnedAdjustment = clamp(
    Number.isFinite(adjustment) ? adjustment : 25_000,
    0,
    maxAdjustment
  )
  const inset = (shortSide * pinnedAdjustment) / 100_000

  return [
    { x: 0, y: safeHeight },
    { x: inset, y: 0 },
    { x: safeWidth - inset, y: 0 },
    { x: safeWidth, y: safeHeight }
  ]
}

export const formatSvgPoints = (points: SvgPoint[]) => {
  return points.map(({ x, y }) => `${formatSvgNumber(x)} ${formatSvgNumber(y)}`).join(',')
}

export const getInverseCenteredShapeMatrix = ({
  width,
  height,
  rotation = 0,
  flipH = false,
  flipV = false
}: {
  width: number
  height: number
  rotation?: number
  flipH?: boolean
  flipV?: boolean
}): SvgMatrix => {
  const radians = (rotation * Math.PI) / 180
  const cosine = normalizeNearZero(Math.cos(radians))
  const sine = normalizeNearZero(Math.sin(radians))
  const scaleX = flipH ? -1 : 1
  const scaleY = flipV ? -1 : 1

  // CSS applies rotate(...) scale(...) as R * F. Group fills live in the
  // parent coordinate space, so the image needs the inverse F * R^-1.
  const a = normalizeNearZero(scaleX * cosine)
  const b = normalizeNearZero(-scaleY * sine)
  const c = normalizeNearZero(scaleX * sine)
  const d = normalizeNearZero(scaleY * cosine)
  const centerX = width / 2
  const centerY = height / 2

  return {
    a,
    b,
    c,
    d,
    e: normalizeNearZero(centerX - a * centerX - c * centerY),
    f: normalizeNearZero(centerY - b * centerX - d * centerY)
  }
}

export const getInverseCenteredShapeTransform = (
  options: Parameters<typeof getInverseCenteredShapeMatrix>[0]
) => {
  const matrix = getInverseCenteredShapeMatrix(options)
  if (
    matrix.a === 1 &&
    matrix.b === 0 &&
    matrix.c === 0 &&
    matrix.d === 1 &&
    matrix.e === 0 &&
    matrix.f === 0
  ) {
    return ''
  }

  return `matrix(${[matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f]
    .map(formatSvgNumber)
    .join(' ')})`
}
