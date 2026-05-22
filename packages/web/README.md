# @flyfish-group/file-viewer-web

纯 Web 文件预览组件。只提供私有化部署路线: npm 包随包携带 Vue 基线 viewer 产物；使用 `npm install` 或已允许 pnpm 安装脚本后，会自动复制到宿主项目的 `public/file-viewer`，组件默认加载 `/file-viewer/index.html`。

```bash
npm install @flyfish-group/file-viewer-web@1.0.10
```

pnpm 10 默认会拦截依赖包的 `postinstall`。如果安装后提示 `Ignored build scripts: @flyfish-group/file-viewer-web`，请执行 `pnpm approve-builds` 允许该包，或运行 `pnpm exec file-viewer-copy-assets ./public/file-viewer`。

```ts
import { mountViewerFrame } from '@flyfish-group/file-viewer-web'

mountViewerFrame(document.getElementById('viewer')!, {
  url: 'https://example.com/demo.pdf'
})
```

鉴权文件可以由宿主系统先下载成 `Blob`，再通过 `file` 和 `name` 推送给 iframe。

```ts
const blob = await fetch('/api/files/contract', { credentials: 'include' }).then(res => res.blob())

mountViewerFrame(document.getElementById('viewer')!, {
  file: blob,
  name: 'contract.pdf'
})
```

如果你的静态目录不是 `public/file-viewer`，可以在安装后手动复制一次:

```bash
npx file-viewer-copy-assets ./public/vendor/file-viewer
```

然后在组件里覆盖 `viewerUrl`:

```ts
mountViewerFrame(el, {
  viewerUrl: '/vendor/file-viewer/index.html',
  url
})
```
