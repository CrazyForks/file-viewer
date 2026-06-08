import type { AppWrapper, Rendered } from '@/package/common/type'

export const WPS_COMPAT_EXTENSIONS = ['wps', 'wpt', 'et', 'ett', 'dps', 'dpt']

const createWrapper = (el: HTMLDivElement): AppWrapper => ({
  $el: el,
  unmount() {
    el.innerHTML = ''
  }
})

const getOfficeFamilyLabel = (type: string) => {
  if (type === 'wps' || type === 'wpt') {
    return 'WPS 文字'
  }
  if (type === 'et' || type === 'ett') {
    return 'WPS 表格'
  }
  return 'WPS 演示'
}

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const renderCompatibilityFallback = (target: HTMLDivElement, type: string, error: unknown): AppWrapper => {
  const detail = escapeHtml(error instanceof Error ? error.message : String(error))
  const safeType = escapeHtml(type)
  target.innerHTML = `
    <section class="office-compat-fallback" style="box-sizing:border-box;height:100%;display:grid;place-items:center;padding:32px;background:#f4f7f6;color:#1c2b3a;font-family:Aptos,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;">
      <div style="width:min(680px,100%);padding:28px;border:1px solid rgba(28,43,58,.12);border-radius:16px;background:#fff;box-shadow:0 18px 46px rgba(25,42,54,.08);">
        <div style="display:inline-flex;align-items:center;height:34px;padding:0 12px;border-radius:999px;background:#eef8f3;color:#14784f;font-weight:800;font-size:13px;">${getOfficeFamilyLabel(type)} 兼容入口</div>
        <h2 style="margin:18px 0 10px;font-size:24px;line-height:1.25;color:#172033;">当前文件需要先转换为 Office 标准格式</h2>
        <p style="margin:0 0 14px;line-height:1.7;color:#526478;">预览器已经尝试按最接近的 Word / Excel / PowerPoint 链路打开 <strong>.${safeType}</strong>。如果文件是 WPS 保存的 OOXML 或 Office-compatible 容器，通常可以直接预览；如果是 WPS 专有二进制结构，则浏览器端没有可靠的纯前端开箱即用解析器。</p>
        <p style="margin:0 0 18px;line-height:1.7;color:#526478;">生产环境建议在上传或归档环节把该文件转换为 <code>.docx</code>、<code>.xlsx</code>、<code>.pptx</code> 或 <code>.pdf</code>，再交给 Flyfish Viewer 预览。</p>
        <pre style="margin:0;padding:12px 14px;overflow:auto;border-radius:10px;background:#101923;color:#d8e8f0;font-size:12px;line-height:1.5;">${detail}</pre>
      </div>
    </section>`
  return createWrapper(target)
}

/**
 * WPS 原生格式没有稳定、成熟、浏览器端纯 JS 解析库。
 *
 * 这里先复用最接近的 Office 渲染链路，覆盖 WPS 文件保存为 OOXML
 * 或旧 Office 兼容容器的情况；真正的 WPS 专有二进制会在失败后展示
 * 清晰的转换建议，而不是让用户只看到通用异常。
 */
export const withWpsCompatibilityFallback = async (
  type: string | undefined,
  target: HTMLDivElement,
  task: () => Promise<Rendered>
) => {
  try {
    return await task()
  } catch (error) {
    if (type && WPS_COMPAT_EXTENSIONS.includes(type)) {
      console.warn(`WPS compatibility preview failed for .${type}`, error)
      return renderCompatibilityFallback(target, type, error)
    }
    throw error
  }
}
