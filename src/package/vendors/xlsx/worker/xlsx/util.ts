// 映射值
import type { Alignment, CellErrorValue, CellValue, Row } from 'exceljs/index.d'
import { getTintColor, indexedColors } from './color'

export function valuesOf(row: Row): CellValue[] {
  const values = row.values
  if (Array.isArray(values)) {
    values.shift()
    return values
  }
  return Object.keys(values).map(key => values[key])
}

// 得到真实的值
export function valueOf(value: CellValue | { error: CellErrorValue }): string {
  if (value) {
    if (value instanceof Date) {
      return value.toLocaleDateString()
    }
    if (typeof value === 'object') {
      if ('text' in value) return value.text
      if ('richText' in value) return value.richText.map(text => text.text).join('')
      if ('formula' in value || 'sharedFormula' in value) return valueOf(value.result)
      if ('error' in value) return ''
    }
    return String(value)
  }
  return ''
}


// 获取真实的颜色
export function getColor(color: any, themeColors: string[]) {
  if (color) {
    const { theme, argb, indexed, tint } = color
    let value
    if (typeof theme !== 'undefined') {
      value = themeColors[theme]
      if (tint) {
        value = getTintColor(value, tint)
      }
    } else if (argb) {
      value = argb
    } else if (indexed) {
      value = indexed && indexedColors[indexed]
    }
    // 根据透明通道决定返回值
    if (value) {
      if (value.length > 6) {
        return `#${toRgba(value)}`
      }
      return `#${value}`
    }
  }
}

function toRgba(argb: string) {
  return argb.substring(2) + argb.substring(0, 2)
}

// 对其到类名样式
export function alignToClass({ horizontal, vertical }: Partial<Alignment>) {
  return [horizontal, vertical].filter(i => i)
    .map((key) => {
      const fixed = key ?? ''
      return `ht${fixed.charAt(0).toUpperCase()}${fixed.slice(1)}`
    })
    .join(' ')
}

// 修复矩阵的宽度
export function fixMatrix(data: string[][], colLen: number) {
  for (const row of data) {
    for (let j = 0; j < colLen; j++) {
      if (!row[j]) {
        row[j] = ''
      }
    }
  }
  return data
}

// 首字母大写
export function captain(str: string) {
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}`
}

// 连字符转驼峰
export function camelCase(str: string) {
  return str.split('-').map((part, index) => {
    if (index !== 0) {
      return captain(part)
    } else {
      return part
    }
  }).join('')
}
