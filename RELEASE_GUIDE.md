# Flyfish Viewer 上线指南

这份指南用于后续发布 Flyfish Viewer。核心目标是把源码仓库、线上部署、npm 包和 GitHub 成品仓库彻底分开，避免再次把源码误上传到公开 GitHub。

这是一份维护者手册，不进入官方文档站。

## 目录和仓库边界

本机固定使用两个目录:

| 目录 | 远端 | 用途 | 是否允许源码 |
| --- | --- | --- | --- |
| `/Users/wangyu/IdeaProjects/file-viewer3` | `https://git.flyfish.dev/flyfish-group/file-viewer.git` | 源码、Demo、文档源码、构建脚本、npm 发布 | 允许 |
| `/Users/wangyu/IdeaProjects/file-viewer-public` | `https://github.com/flyfish-dev/file-viewer.git` | 公开成品仓库，只放构建产物和说明 | 禁止 |

公开 GitHub 仓库只允许出现这些根目录或文件:

- `README.md`
- `LICENSE`
- `package.json`
- `dist/`
- `demo/`
- `docs/`
- `example/`
- `artifacts/`

源码仓库内部目录职责:

- `apps/viewer-demo/`: 正式在线 Demo 和 `/compare.html` 文档比对页
- `apps/component-demo/`: 各生态 wrapper 的原生接入示例
- `packages/core/`: framework-neutral TypeScript core
- `packages/components/`: 标准组件包源码
- `packages/compat/`: 历史 npm 包名兼容 alias

公开 GitHub 仓库严禁出现这些源码工作区内容:

- `src/`
- `scripts/`
- `public/`
- `docs/.vitepress/`
- `.env`
- `.vscode/`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- 根目录 `index.html`
- 根目录 `build.sh`

## 初始化成品仓库目录

第一次在新机器上准备发布时，只需要初始化一次:

```bash
cd /Users/wangyu/IdeaProjects
git clone https://github.com/flyfish-dev/file-viewer.git file-viewer-public
cd file-viewer-public
git status -sb
git remote -v
```

确认结果必须满足:

- 当前分支是 `main`
- 远端只有公开成品仓库 `https://github.com/flyfish-dev/file-viewer.git`
- 仓库根目录没有 `src/`、`scripts/`、`public/`、`docs/.vitepress/`

## 发布前检查

源码仓库永远从 `v3` 分支上线。Vue2 包需要同步发布时，再切到 `main` 处理 npm 包；线上 Demo、文档站和 GitHub 成品仓库都以 `v3` 为准。

```bash
cd /Users/wangyu/IdeaProjects/file-viewer3
git checkout v3
git pull origin v3
git status -sb
pnpm install --frozen-lockfile
```

检查远端，源码仓库只能推 Gitea:

```bash
git remote -v
```

如果你看到源码仓库里存在 GitHub 远端，不要推送源码分支到 GitHub。公开 GitHub 只在 `/Users/wangyu/IdeaProjects/file-viewer-public` 中操作。

## 本地测试和构建

每次发布前至少执行:

```bash
pnpm run type-check
pnpm exec vitest run
pnpm run docs:build
```

需要更新线上 Demo 或公开成品仓库时，执行完整构建链路:

```bash
pnpm run build-only
pnpm run build:vue3
pnpm run obfuscate
pnpm run docs:build
```

说明:

- `build-only` 生成 `apps/viewer-demo/dist/` 正式 Demo 静态站点。
- `build:vue3` 生成 Vue3 标准 wrapper 包产物；完整生态包统一使用 `release:ecosystem:*`。
- `obfuscate` 只处理 `packages/components/vue3/dist/` 下的 JS/MJS 产物，公开仓库必须使用这一步之后同步出的 `dist/`。
- `docs:build` 生成 `docs/.vitepress/dist`，这是文档站的静态产物。

## npm 发布

Vue3 包在 `v3` 分支发布:

```bash
npm publish --dry-run --access public --registry=https://registry.npmjs.org/
npm publish --access public --registry=https://registry.npmjs.org/
```

Vue2.7 包在 `main` 分支发布:

```bash
git checkout main
git pull origin main
pnpm install --frozen-lockfile
pnpm run type-check
pnpm exec vitest run
pnpm run build:vue3
pnpm run obfuscate
npm publish --dry-run --access public --registry=https://registry.npmjs.org/
npm publish --access public --registry=https://registry.npmjs.org/
git checkout v3
pnpm install --frozen-lockfile
```

npm 账号启用 MFA 时，使用交互式会话完成浏览器确认。发布完成后确认:

```bash
npm view @flyfish-group/file-viewer3 version --registry=https://registry.npmjs.org/
npm view @flyfish-group/file-viewer version --registry=https://registry.npmjs.org/
```

## Vercel 上线

线上 Demo 使用 `v3`，域名是 `viewer.flyfish.dev`。从源码仓库执行:

```bash
cd /Users/wangyu/IdeaProjects/file-viewer3
git checkout v3
npx -y vercel@latest deploy --prod --yes
```

文档站域名是 `doc.flyfish.dev`，部署的是静态构建目录，不是源码:

```bash
pnpm run docs:build
npx -y vercel@latest deploy docs/.vitepress/dist --prod --yes
```

部署完成后至少打开以下地址冒烟:

- `https://viewer.flyfish.dev/?smoke=<本次标识>`
- `https://viewer.flyfish.dev/?url=%2Fexample%2Fpdf.pdf&smoke=<本次标识>`
- `https://doc.flyfish.dev/?smoke=<本次标识>`
- `https://doc.flyfish.dev/guide/?smoke=<本次标识>`

## 同步公开成品仓库

公开 GitHub 成品仓库使用独立目录 `/Users/wangyu/IdeaProjects/file-viewer-public`。不要在源码仓库里直接把 `v3` 推到 GitHub。

推荐使用脚本同步成品:

```bash
cd /Users/wangyu/IdeaProjects/file-viewer3
pnpm run release:public -- --public-repo-dir /Users/wangyu/IdeaProjects/file-viewer-public
```

脚本会完成:

- 构建 Demo 产物并复制到 `file-viewer-public/demo`
- 构建并混淆库产物，复制到 `file-viewer-public/dist`
- 构建文档站，复制到 `file-viewer-public/docs`
- 复制示例文件到 `file-viewer-public/example`
- 生成 npm tarball 到 `file-viewer-public/artifacts`
- 生成 Demo、库产物、文档站 tarball
- 写入 `artifacts/release-manifest.json`
- 检查公开仓库根目录是否误出现 `src/`、`scripts/`、`public/` 等源码内容

如果你已经手动完成构建，也可以复用 `.release/` 暂存目录并跳过构建:

```bash
pnpm run release:public -- --public-repo-dir /Users/wangyu/IdeaProjects/file-viewer-public --skip-build
```

同步完成后必须在成品仓库里检查:

```bash
cd /Users/wangyu/IdeaProjects/file-viewer-public
git status -sb
git diff --stat
test ! -d src
test ! -d scripts
test ! -d public
test ! -d docs/.vitepress
```

确认只包含成品目录后再提交:

```bash
git add -A
git commit -m "chore: refresh public artifacts for <version>"
git push origin main
```

## 源码提交规则

源码只提交到 Gitea:

```bash
cd /Users/wangyu/IdeaProjects/file-viewer3
git status -sb
git add <本次源码变更>
git commit -m "<message>"
git push origin v3
```

禁止执行:

```bash
git push https://github.com/flyfish-dev/file-viewer.git v3
git push github v3
git push --all https://github.com/flyfish-dev/file-viewer.git
git push --mirror https://github.com/flyfish-dev/file-viewer.git
```

## 最终上线检查清单

发布完成后逐项确认:

| 检查项 | 命令或地址 | 预期 |
| --- | --- | --- |
| 源码 v3 | `git ls-remote --heads origin v3` | Gitea 有最新 v3 |
| GitHub 分支 | `git ls-remote --heads https://github.com/flyfish-dev/file-viewer.git` | 只应看到 `main` |
| GitHub 默认分支 | `gh repo view flyfish-dev/file-viewer --json defaultBranchRef` | `main` |
| Vue3 npm | `npm view @flyfish-group/file-viewer3 version --registry=https://registry.npmjs.org/` | 最新版本 |
| Vue2 npm | `npm view @flyfish-group/file-viewer version --registry=https://registry.npmjs.org/` | 最新版本 |
| Demo | `https://viewer.flyfish.dev` | 页面可打开，样例可预览 |
| 文档站 | `https://doc.flyfish.dev` | 页面可打开，导航和样式正常 |
| 成品仓库 | `https://github.com/flyfish-dev/file-viewer` | 只有构建产物，无源码目录 |

## 误上传应急处理

如果发现公开 GitHub 出现源码分支:

1. 立即把 GitHub 默认分支切回 `main`。
2. 删除源码分支。
3. 检查 fork 列表。
4. 检查 tag 是否指向源码树。
5. 如有 fork 保存源码，联系 fork 作者删除，必要时走 GitHub Support / DMCA / Private Information Removal。

常用命令:

```bash
gh repo edit flyfish-dev/file-viewer --default-branch main
git push https://github.com/flyfish-dev/file-viewer.git --delete v3
gh api repos/flyfish-dev/file-viewer/forks --paginate
git ls-remote --heads https://github.com/flyfish-dev/file-viewer.git
git ls-remote --tags https://github.com/flyfish-dev/file-viewer.git
```

这类应急命令只用于止损，正常发布流程不要操作 GitHub 源码分支。
