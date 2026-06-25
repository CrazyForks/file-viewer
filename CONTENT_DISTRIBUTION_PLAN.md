# Content Distribution Plan

目标不是到处求 Star，而是围绕真实业务问题建立长期入口:

> 搜得到 -> 看得懂 -> 30 秒愿意试 -> 用完愿意收藏、Star、提 issue 或转发。

## 发布原则

- 每次只讲一个场景，不把所有能力塞进一篇文章。
- 标题围绕用户问题，不写成项目自夸。
- 正文承认边界: 浏览器预览适合附件查看、初筛、内网自托管，不替代专业编辑器或复杂版式最终校验。
- CTA 优先引导 Demo 和兼容性反馈，其次才是收藏 / Star。
- 每次发布后 24 小时、72 小时、7 天记录 GitHub Traffic、npm 下载、Issue 质量。

## 第 2 周: 中文社区启动帖

发布渠道: L 站、掘金、SegmentFault、微信群 / 技术群。

标题:

```text
做了一个纯前端 File Viewer，想请大家帮忙测测真实文件兼容性
```

开头:

```md
最近在整理企业后台、OA、知识库和工单系统里的附件预览问题，发现真实业务文件经常不是单一的 PDF 或图片，而是 Word、Excel、PPT、DWG、压缩包、邮件、图片、音视频、代码混在一起。

传统做法通常会引入 LibreOffice / 转码服务 / 队列 / 缓存 / 字体环境，但在内网和私有化交付里，这套链路的维护成本不低。所以我把 File Viewer 的定位收敛成一个纯前端、自托管、可按需裁剪的文件预览组件。
```

主体结构:

1. 为什么企业后台里的文件预览会变成格式矩阵。
2. 为什么内网 / 私有化场景不总是适合服务端转码。
3. File Viewer 当前能做什么: Office、PDF/OFD、CAD、压缩包、邮件、图片、音视频、代码等业务附件预览。
4. 当前边界: 复杂 Office / CAD 仍需要真实样本回归，不承诺替代专业编辑器。
5. 希望社区帮忙验证什么: 脱敏 DOC / XLS / PPT / DWG / DWF / 压缩包 / 邮件样本。

CTA:

```md
如果你手里有不涉密、可脱敏的业务附件，欢迎拿 Demo 试一下。遇到样式不一致、打不开、内网部署路径问题或移动端异常，都可以提 issue，这类反馈比单纯 Star 更有价值。

- Demo: https://demo.file-viewer.app
- Docs: https://doc.file-viewer.app
- GitHub: https://github.com/flyfish-dev/file-viewer
```

记录指标:

- GitHub visitors / unique visitors
- `/issues` 和 `/blob/main/README.md` 是否进入 popular content
- 新增 issue 中带真实样本或复现信息的比例
- `@file-viewer/vue3-full`、`@file-viewer/react-full`、`@file-viewer/web-full` 下载变化

## 第 3 周: 技术拆解 1

标题:

```text
内网系统如何实现 Word / PDF / CAD 附件预览？我做了一个纯前端方案
```

大纲:

1. 附件中心、OA、合同系统、知识库里的典型文件类型。
2. 服务端转码方案的优点和成本: 队列、缓存、字体、临时文件、权限链路。
3. 纯前端方案的适用边界: 浏览器侧解析、Worker / WASM、自托管静态资产。
4. Demo 路径: Word 合同、Excel 报表、PPT 材料、DWG 图纸、压缩包、邮件。
5. 接入示例: React / Vue / Web Component 任选其一。
6. 兼容性反馈入口。

推荐代码片段:

```tsx
import FileViewer from '@file-viewer/react-full'

export function Preview() {
  return <FileViewer url="/files/contract.docx" style={{ height: 720 }} />
}
```

## 第 3 周: 技术拆解 2

标题:

```text
不想维护 LibreOffice 转码服务，前端文件预览能做到什么程度？
```

大纲:

1. 先承认服务端转码的优势: 统一输出 PDF / 图片，结果更稳定。
2. 再拆内网交付成本: 服务部署、字体环境、队列、缓存、权限、临时文件清理。
3. 纯前端路线的收益: 文件不出浏览器、自托管、按需加载、少一条服务链路。
4. 纯前端路线的局限: 复杂 Office、宏、特殊字体、超大文件、CAD 高保真。
5. 如何组合: 普通附件用 File Viewer，严肃编辑 / 高保真归档走专业引擎或服务端。

CTA:

```md
如果你的目标是企业后台里的附件查看和初筛，可以先用 Demo 验证真实文件。复杂样本欢迎脱敏后提 issue，我会优先看能复现的问题。
```

## 第 3 周: 技术拆解 3

标题:

```text
Worker / WASM 在私有化文件预览部署里的坑
```

大纲:

1. 为什么文件预览会依赖 Worker、WASM、字体、vendor 资源。
2. 私有 CDN / 内网 nginx / Docker 场景下的路径问题。
3. MIME、CORS、Range、CSP、缓存策略的常见坑。
4. 如何验证: Demo、Docs、离线资产、浏览器控制台。
5. File Viewer 的自托管资产约定和排查方式。

## 第 4 周: 英文入口

标题:

```text
A browser-native file viewer for internal web apps, without server-side conversion
```

Opening:

```md
Internal web apps often need to preview real business attachments: Office documents, PDF/OFD files, CAD drawings, archives, email exports, images, media, and source code. A server-side conversion pipeline can work well, but it also adds deployment, queue, cache, font, temporary-file, and permission complexity.

File Viewer is an open-source browser-native file preview component for private and internal web apps. It focuses on self-hosted frontend preview, no server-side conversion, and framework-friendly integration for Vue, React, Svelte, jQuery, and Web Components.
```

Sections:

1. Use cases: OA, knowledge base, ticket systems, engineering archives, private delivery.
2. What it supports: Office, PDF/OFD, CAD, archives, email, media, code.
3. Why browser-native: fewer backend services, self-hosted assets, Worker/WASM where needed.
4. Limitations: not a professional editor, complex Office/CAD still need real-file regression.
5. Quick start and Demo.

CTA:

```md
Try the demo with sanitized files and open compatibility issues when a real document does not render as expected. Those reports are more useful than generic feature requests.

- GitHub: https://github.com/flyfish-dev/file-viewer
- Demo: https://demo.file-viewer.app
- Docs: https://doc.file-viewer.app
```

## 复盘模板

每次发布后记录:

```md
### YYYY-MM-DD 渠道 / 标题

- Link:
- Hook:
- GitHub visitors:
- Unique visitors:
- Stars +:
- Issues +:
- Issues with repro files:
- npm downloads:
- Best referrer:
- Popular content:
- What to change next:
```
