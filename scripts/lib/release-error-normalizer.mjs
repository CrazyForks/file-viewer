export function normalizeReleaseError(value) {
  if (!value) {
    return ''
  }

  return String(value)
    .replace(/\u001b\[[0-9;]*m/g, '')
    .replace(/\[session-[^\]]+\]/gi, '[session-id]')
    .replace(
      /npm error A complete log of this run can be found in: .+/g,
      'npm error A complete log of this run can be found in: <npm-debug-log>'
    )
    .replace(
      /\/Users\/[^\s]+\/\.npm\/_logs\/[^\s]+-debug-\d+\.log/g,
      '<npm-debug-log>'
    )
    .trim()
}
