import renders from "@/package/vendors/renders";
import type { FileRenderContext } from '@/package/common/type'

const errorHandler = renders.get('error');

export function getExtend(name: string) {
  const dot = name.lastIndexOf('.')
  return name.substring(dot + 1);
}

export async function render(buffer: ArrayBuffer, type: string, target: HTMLDivElement, context?: FileRenderContext) {
  const normalizedType = type.toLowerCase()
  const handler = renders.get(normalizedType);
  if (handler) {
    return handler(buffer, target, normalizedType, context);
  }
  if (errorHandler) {
    return errorHandler(buffer, target, normalizedType, context)
  }
}
