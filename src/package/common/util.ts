// 读取结果
type ReadResult = string | ArrayBuffer | undefined | null;

export async function readBuffer(file: File): Promise<ReadResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = loadEvent => resolve(loadEvent.target?.result)
    reader.onerror = e => reject(e)
    reader.readAsArrayBuffer(file)
  })
}

export async function readDataURL(buffer: ArrayBuffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = loadEvent => {
      const result = loadEvent.target?.result
      if (typeof result === 'string') resolve(result)
    }
    reader.onerror = e => reject(e)
    reader.readAsDataURL(new Blob([buffer]))
  })
}

export async function readText(buffer: ArrayBuffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = loadEvent => {
      const result = loadEvent.target?.result
      if (typeof result === 'string') resolve(result)
    }
    reader.onerror = e => reject(e)
    reader.readAsText(new Blob([buffer]), 'utf-8')
  })
}

