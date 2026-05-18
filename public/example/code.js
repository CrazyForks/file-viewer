const supported = ['ofd', 'dxf', 'json', 'ts']

export function isSupported(filename) {
  const ext = filename.split('.').pop()?.toLowerCase()
  return supported.includes(ext)
}

console.log(isSupported('drawing.dxf'))
