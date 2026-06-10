export function cellKey(row: number, col: number) {
  return `${row}-${col}`
}

export function flatten(routes: Array<any>): Array<any> {
  return routes.flatMap(route => route.children ? [route, ...flatten(route.children)] : [route])
}

// 转化style对象为style字符串
export function toStyleString(style: any) {
  return [...style].map(key => `${key}: ${style[key]}`).join(';')
}

