# 纯 JS 集成

<div class="doc-kicker">For Plain Web Apps</div>

<p class="doc-lead">
  纯 JS 包提供 iframe 创建、挂载、URL 参数拼接和二进制推送工具。它同样只走私有化静态部署，
  默认加载宿主项目里的 <code>/file-viewer/index.html</code>。
</p>

## 安装

推荐用 `npm` 安装，安装脚本会自动把私有化 viewer 静态产物复制到宿主项目:

```bash
npm install --save @flyfish-group/file-viewer-web@1.0.10
```

如果使用 pnpm 10，可能会看到 `Ignored build scripts: @flyfish-group/file-viewer-web`。这是 pnpm 的依赖脚本审批机制，不是包安装失败。请执行:

```bash
pnpm approve-builds
```

并允许 `@flyfish-group/file-viewer-web`。也可以安装后手动运行:

```bash
pnpm exec file-viewer-copy-assets ./public/file-viewer
```

使用 `npm install` 或已允许 pnpm 安装脚本后，包内的 Vue3 基线 viewer 产物会自动复制到宿主项目的 `public/file-viewer`。上线时请确保这个目录会被你的构建工具作为静态资源发布。

## 最短示例

```html
<div id="viewer" style="height: 100vh"></div>

<script type="module">
  import { mountViewerFrame } from '@flyfish-group/file-viewer-web'

  mountViewerFrame(document.getElementById('viewer'), {
    url: '/files/demo.pdf'
  })
</script>
```

`mountViewerFrame` 会向容器里插入 iframe，并返回控制器。

```ts
const controller = mountViewerFrame(container, { url: '/files/demo.pdf' })

controller.reload()
controller.update({ url: '/files/report.docx' })
controller.destroy()
```

## 预览鉴权文件

```ts
import { mountViewerFrame } from '@flyfish-group/file-viewer-web'

const blob = await fetch('/api/files/contract', {
  credentials: 'include'
}).then(response => response.blob())

mountViewerFrame(document.getElementById('viewer')!, {
  file: blob,
  name: 'contract.pdf'
})
```

当传入 `file` 时，组件会生成 `?name=...&from=...` 的 iframe 地址，并在 iframe 加载完成后通过 `postMessage` 把二进制内容推送给预览器。

## 手动复制 viewer 产物

如果你的项目没有自动执行安装脚本，或者需要复制到自定义目录，可以运行:

```bash
npx file-viewer-copy-assets ./public/vendor/file-viewer
```

再指定 `viewerUrl`:

```ts
mountViewerFrame(container, {
  viewerUrl: '/vendor/file-viewer/index.html',
  url: '/files/demo.xlsx'
})
```

也可以在 Node 脚本中调用:

```ts
import { copyViewerAssets } from '@flyfish-group/file-viewer-web/node'

await copyViewerAssets({
  targetDir: 'public/vendor/file-viewer'
})
```

## 可用 API

| API | 说明 |
| --- | --- |
| `buildViewerSrc(options)` | 根据 `url`、`file`、`name`、`params` 构造 iframe 地址 |
| `createViewerFrame(options)` | 创建 iframe 元素 |
| `mountViewerFrame(container, options)` | 挂载 iframe 并返回控制器 |
| `postFileToViewer(frame, options)` | 主动把 `Blob` / `ArrayBuffer` 推送给 iframe |
| `syncViewerFrame(frame, options)` | 更新 iframe 地址 |
| `copyViewerAssets(options)` | Node 环境下复制 viewer 静态产物 |

## 构建上线

上线只需要发布业务构建产物和 viewer 静态目录。默认结构是:

```txt
dist/
  index.html
  assets/
  file-viewer/
    index.html
    assets/
```

仓库里的适配层演示可以作为上线前 smoke test:

```bash
pnpm build:adapter-demo
pnpm --filter @flyfish-group/file-viewer-demo preview
```

确认页面里的 React 和 Web 两个面板都能看到预览内容后，再部署构建产物。
