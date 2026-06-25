# GitHub Growth Playbook

核心路径:

> 让精准用户搜得到 -> 第一眼看懂 -> 30 秒愿意试 -> 用完愿意收藏、Star、提 issue 或转发。

File Viewer 的长期定位:

> 面向企业后台、内网和私有化系统的纯前端文件预览组件。

## GitHub 首屏

- H1 使用 `File Viewer`，匹配用户搜索和仓库名。
- 第一屏只讲三件事: 内网 / 私有化附件预览、无需服务端转码、Demo / Docs / Quick Start。
- `206+ 扩展名、24 条预览链路` 放在亮点或格式矩阵里作为证据。
- README 同时给中文和英文入口，英文口径使用 `browser-native file viewer for internal web apps`。

## GitHub Description

短版:

```txt
Browser-native Office / PDF / CAD / archive viewer for internal web apps. No server-side conversion.
```

完整版:

```txt
Browser-native Office / PDF / CAD / archive viewer for internal web apps, with Vue, React, Svelte, jQuery, Web Components, and no server-side conversion.
```

执行:

```bash
node scripts/update-github-repo-descriptions.mjs --dry-run
pnpm github:descriptions:update
```

## Topics

推荐控制在 15 到 20 个:

```txt
file-viewer
document-viewer
document-preview
file-preview
office-viewer
pdf-viewer
docx
pptx
xlsx
cad-viewer
dwg
dxf
vue
react
typescript
web-components
wasm
offline-first
self-hosted
private-deployment
```

执行:

```bash
pnpm github:topics:plan
pnpm github:topics:update
```

`github:topics:update` 会把公开主仓库 Topics 收敛到上面的发现词集合；如果临时要保留额外 topic，可以直接运行 `node scripts/update-github-repo-topics.mjs --apply --keep-existing`。

## Social Preview

素材文件: [.github/social-preview.png](.github/social-preview.png)

上传路径: GitHub repository Settings -> Social preview。
详细设置检查清单见 [GITHUB_SETTINGS_CHECKLIST.md](GITHUB_SETTINGS_CHECKLIST.md)。

重新生成:

```bash
pnpm github:social-preview:render
```

图上只保留核心信息:

- File Viewer
- Browser-native file preview for internal web apps
- Office / PDF/OFD / CAD / Archives / Email
- Vue / React / Svelte / Web Components
- No server-side conversion

## 四类用户入口

| 用户 | 他们关心什么 | 入口文案 |
| --- | --- | --- |
| 企业后台 / OA 开发 | Word、PDF、Excel、PPT 附件预览 | `Office / PDF viewer for internal systems` |
| 工程资料系统 | DWG、DXF、DWF、图纸初筛 | `CAD viewer in browser` |
| 前端组件使用者 | Vue / React / Web Component 怎么接 | `One component, multiple frameworks` |
| 私有化交付团队 | 离线、内网、Worker / WASM 自托管 | `Self-hosted frontend file preview` |

## 内容选题

每篇只讲一个具体痛点，最后自然引到 GitHub:

```txt
内网系统如何实现 Word / PDF / CAD 附件预览？
为什么企业后台里的文件预览会变成格式矩阵？
不想维护 LibreOffice 转码服务，前端能做到什么程度？
在浏览器里预览 DWG / DXF / DWF，我踩了哪些坑？
压缩包里的 Office / PDF 如何按需解压并继续预览？
Vue / React 项目如何接入一个多格式 File Viewer？
Worker / WASM 在私有化部署里有哪些坑？
```

可直接改稿发布的中文 / 英文内容模板见 [CONTENT_DISTRIBUTION_PLAN.md](CONTENT_DISTRIBUTION_PLAN.md)。

## 四周节奏

| 周期 | 重点 | 产出 |
| --- | --- | --- |
| 第 1 周 | 仓库包装 | README、Social Preview、Topics、社区健康文件、Demo 场景入口 |
| 第 2 周 | 中文社区启动 | 真实文件兼容性反馈帖 |
| 第 3 周 | 技术拆解 | Office 按需加载、CAD 浏览器预览、Worker/WASM 私有化部署 |
| 第 4 周 | 英文入口 | Use cases、quick start、limitations 取向的英文文章 |

## Traffic 记录表

详细记录表见 [TRAFFIC_TRACKING.md](TRAFFIC_TRACKING.md)。

重点观察:

- 哪个标题带来的访问多
- 哪个场景带来的 issue 有价值
- 哪个渠道用户更精准
- README、Demo、Docs 哪个入口承接更好

## 完成度审计

逐项证据见 [GITHUB_GROWTH_AUDIT.md](GITHUB_GROWTH_AUDIT.md)。
