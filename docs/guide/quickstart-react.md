# React 集成

<div class="doc-kicker">For React 17 / 18 / 19</div>

<p class="doc-lead">
  React 包只做 iframe 适配，不复制预览器渲染逻辑。它复用 Vue3 基线构建产物，并通过私有化静态目录
  <code>/file-viewer/index.html</code> 加载完整预览能力。
</p>

## 安装

推荐用 `npm` 安装，安装脚本会自动把私有化 viewer 静态产物复制到宿主项目:

```bash
npm install --save @flyfish-group/file-viewer-react@1.0.10
```

如果使用 pnpm 10，可能会看到 `Ignored build scripts: @flyfish-group/file-viewer-web`。这是 pnpm 的依赖脚本审批机制，不是包安装失败。请执行:

```bash
pnpm approve-builds
```

并允许 `@flyfish-group/file-viewer-web`。也可以安装后手动运行:

```bash
pnpm exec file-viewer-copy-assets ./public/file-viewer
```

`@flyfish-group/file-viewer-react` 依赖 `@flyfish-group/file-viewer-web@^1.0.10`。使用 `npm install` 或已允许 pnpm 安装脚本后，web 包会把随包携带的 Vue3 基线 viewer 产物复制到宿主项目的 `public/file-viewer`，所以默认地址就是:

```txt
/file-viewer/index.html
```

## 最短示例

```tsx
import FileViewer from '@flyfish-group/file-viewer-react'

export function Preview() {
  return (
    <div style={{ height: '100vh' }}>
      <FileViewer url="/files/demo.docx" />
    </div>
  )
}
```

父容器必须有明确高度；组件内部的 iframe 默认会填满父容器。

## 预览鉴权文件

如果文件必须由宿主系统鉴权下载，请先拿到 `Blob`，再传给组件。传 `Blob` 或 `ArrayBuffer` 时一定要同时传 `name`，用于识别扩展名。

```tsx
import { useEffect, useState } from 'react'
import FileViewer, { type FileRef } from '@flyfish-group/file-viewer-react'

export function PrivatePreview() {
  const [file, setFile] = useState<FileRef>()

  useEffect(() => {
    fetch('/api/files/contract', { credentials: 'include' })
      .then(response => response.blob())
      .then(setFile)
  }, [])

  return (
    <div style={{ height: '100vh' }}>
      <FileViewer file={file} name="contract.pdf" />
    </div>
  )
}
```

## 自定义静态目录

如果业务项目不是把静态资源放在 `public/file-viewer`，可以手动复制到自己的目录:

```bash
npx file-viewer-copy-assets ./public/vendor/file-viewer
```

然后覆盖 `viewerUrl`:

```tsx
<FileViewer
  viewerUrl="/vendor/file-viewer/index.html"
  url="/files/demo.pdf"
/>
```

## 可用参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `viewerUrl` | `string` | 私有化部署后的 viewer 页面地址，默认 `/file-viewer/index.html` |
| `url` | `string` | 可直接被浏览器访问的文件地址 |
| `file` | `File \| Blob \| ArrayBuffer` | 本地文件或鉴权下载后的二进制内容，优先级高于 `url` |
| `name` | `string` | `Blob` / `ArrayBuffer` 的文件名，建议带扩展名 |
| `from` | `string` | 二进制推送时允许的宿主 origin，默认当前页面 origin |
| `targetOrigin` | `string` | `postMessage` 目标 origin，默认从 `viewerUrl` 推导 |
| `params` | `Record<string, string \| number \| boolean>` | 透传给 Vue3 基线 viewer 的查询参数 |

组件支持普通 iframe 属性，例如 `className`、`style`、`allow`、`sandbox`、`loading`。

## 本地调试

仓库内置了 React + 纯 JS 双入口演示:

```bash
pnpm dev:adapters
```

它会构建 Vue3 基线 viewer、同步到 `packages/demo/public/file-viewer`，再启动本地调试服务。打开页面后，React 和纯 JS 两个预览面板应当都能显示同一份本地 Markdown 示例。

## 构建上线

如果你使用 Vite、Next.js、Rsbuild 等现代前端框架，只要确保最终静态目录包含:

```txt
file-viewer/index.html
file-viewer/assets/*
```

构建后的业务页面就能继续使用默认 `viewerUrl`。如果你的部署路径有前缀，请复制 viewer 到对应静态目录，并显式传入 `viewerUrl`。
