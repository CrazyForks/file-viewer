# Flyfish Viewer 上线指南

这份指南用于后续发布 Flyfish Viewer。核心目标是把私有 Gitea 聚合仓、GitHub/Gitee 开源总仓库、线上部署和 npm 包保持一致，同时避免把密钥、本地缓存或内部自动化上下文误提交到公开仓库。

这是一份维护者手册，不进入官方文档站。

## 目录和仓库边界

本机固定使用两个目录:

| 目录 | 远端 | 用途 | 是否允许源码 |
| --- | --- | --- | --- |
| `/Users/wangyu/IdeaProjects/file-viewer3` | `https://git.flyfish.dev/flyfish-group/file-viewer.git` | 私有聚合仓、完整发布自动化、内部集成历史、优先支持上下文 | 允许 |
| `/Users/wangyu/IdeaProjects/file-viewer-public` | `https://github.com/flyfish-dev/file-viewer.git` / `https://gitee.com/flyfish-dev/file-viewer.git` | 开源总仓库，一站式主入口，包含可运行源码、Demo、文档、构建产物和 release 下载物 | 允许且必须包含 |

开源总仓库应包含这些根目录或文件:

- `README.md`
- `README.en.md`
- `BRANCHES.md`
- `ECOSYSTEM_REFACTOR_CHECKLIST.md`
- `WRAPPER_ECOSYSTEM.md`
- `LICENSE`
- `package.json`
- `pnpm-workspace.yaml`
- `apps/`
- `packages/`
- `dist/`
- `demo/`
- `component-demo/`
- `docs/`
- `docs-dist/`
- `example/`
- `artifacts/`

源码目录职责:

- `apps/viewer-demo/`: 正式在线 Demo 和 `/compare.html` 文档比对页
- `apps/component-demo/`: 各生态标准组件的原生接入示例
- `packages/core/`: framework-neutral TypeScript core
- `packages/components/`: 标准组件包源码
- `packages/compat/`: 历史 npm 包名兼容 alias
- `docs/`: VitePress 文档站源码
- `BRANCHES.md` / `WRAPPER_ECOSYSTEM.md` / `ECOSYSTEM_REFACTOR_CHECKLIST.md`: 公开架构边界、生态仓库矩阵和迁移验收清单

开源总仓库仍然严禁出现这些本地或内部内容:

- `.env`、`.env.local`
- `.release/`
- `.vercel/`
- `node_modules/`
- `.vscode/`
- `pnpm-lock.yaml`、`package-lock.json`、`yarn.lock`
- 根目录内部发布脚本目录 `scripts/`

注意: `apps/`、`packages/`、`docs/` 是开源总仓库的一部分；根目录 `scripts/` 暂时只保留在私有聚合仓，因为其中包含完整发布编排和内部仓库维护逻辑。

## 初始化开源总仓库目录

第一次在新机器上准备发布时，只需要初始化一次:

```bash
cd /Users/wangyu/IdeaProjects
git clone https://github.com/flyfish-dev/file-viewer.git file-viewer-public
cd file-viewer-public
git remote add gitee https://gitee.com/flyfish-dev/file-viewer.git
git status -sb
git remote -v
```

确认结果必须满足:

- 当前分支是 `main`
- `origin` 指向 `https://github.com/flyfish-dev/file-viewer.git`
- `gitee` 指向 `https://gitee.com/flyfish-dev/file-viewer.git`
- 仓库根目录没有 `.env`、`.release/`、`node_modules/`、根目录 `scripts/`

## 发布前检查

私有 Gitea 的 `main` 是完整原始聚合仓，承载完整 monorepo、统一发布自动化和内部集成历史；它不缩减为 core-only，也不等同于 GitHub 开源总仓库。若本机仍处在分支整理过渡期，可从当前聚合工作分支生成线上 Demo、文档站、npm 包和开源总仓库；完成分支整理后，以私有 `main` 为完整原始仓的发布基线，`v3` / `v2` 可作为 Vue3 / Vue2.7 标准组件分支快照；core 源码通过 `packages/core`、独立 `flyfish-dev/file-viewer-core` 和开源总仓库分发。

```bash
cd /Users/wangyu/IdeaProjects/file-viewer3
git checkout v3
git pull origin v3
git status -sb
pnpm install --frozen-lockfile
```

检查远端，私有聚合仓只能推 Gitea:

```bash
git remote -v
```

如果你看到私有聚合仓里存在 GitHub 远端，不要推送聚合分支到 GitHub。GitHub/Gitee 开源总仓库只在 `/Users/wangyu/IdeaProjects/file-viewer-public` 中操作。

## 本地测试和构建

每次发布前至少执行:

```bash
pnpm type-check
pnpm exec vitest run
pnpm docs:build
```

需要更新线上 Demo 或开源总仓库时，执行完整构建链路:

```bash
pnpm build-only
pnpm build:vue3
pnpm obfuscate
pnpm docs:build
```

说明:

- `build-only` 生成 `apps/viewer-demo/dist/` 正式 Demo 静态站点。
- `build:vue3` 生成 Vue3 标准组件包产物；完整生态包统一使用 `release:ecosystem:*`。
- `obfuscate` 处理 `packages/components/vue3/dist/` 下的 JS/MJS 产物，开源总仓库的兼容 `dist/` 使用这一步之后同步出的产物。
- `docs:build` 生成 `docs/.vitepress/dist`，这是文档站的静态产物。

## 分支切换预演

当前分支角色整理必须先生成本地快照，再人工核对。不要直接把私有聚合仓推成 GitHub/Gitee 开源总仓库，也不要跳过预演去更新私有 Gitea 的 `main` / `v2` / `v3`。

```bash
cd /Users/wangyu/IdeaProjects/file-viewer3
pnpm branch:cutover:prepare
pnpm branch:cutover:verify
pnpm branch:cutover:apply
```

预演目录在 `.release/branch-cutover/`:

| 目录 | 目标分支 | 目标职责 |
| --- | --- | --- |
| `v2-vue2.7-component` | `v2` | `@file-viewer/vue2.7` 和 `@flyfish-group/file-viewer` Vue 2.7 组件线 |
| `v3-vue3-component` | `v3` | `@file-viewer/vue3`、`@flyfish-group/file-viewer3`、`file-viewer3` Vue 3 组件线 |

每个组件快照目录都必须包含 `package.json`、`README.md`、`README.en.md`、`LICENSE`、`BRANCH_ROLE.md` 和 `branch-cutover-manifest.json`，并且不能包含 `node_modules/`、`dist/` 或 `workspace:` 依赖范围。私有 `main` 不生成 core-only 快照，而是保持当前完整原始仓库内容。确认这些快照之后，才进入远端分支更新和 npm 发布。

`pnpm branch:cutover:apply` 默认只输出推送计划，不会修改远端。确认计划无误后，维护者再显式执行:

```bash
pnpm branch:cutover:apply -- --push
```

脚本会先把现有远端 `main` / `v2` / `v3` 的 HEAD 备份到 `workspace/pre-branch-cutover-*/*`，再把当前完整原始仓库推到私有 Gitea `main`，并用组件快照更新 `v2` / `v3`。所有目标更新都使用 `--force-with-lease`；如果远端分支在预演后被他人更新，脚本会拒绝覆盖，需要重新生成快照。

## 全渠道发布前置检查

正式发布 npm、Gitee 组件分仓、开源总仓和 release 前，先跑聚合 preflight:

```bash
pnpm release:channels:preflight
```

这一步不会构建或发布，只验证分支角色、生态 checklist、README 覆盖、npm 发布元数据、开源总仓安全边界、npm 登录态和 Gitee API token。当前机器缺少交互式 npm 登录或 Gitee token 时会快速失败，先补凭据再继续上线。只做本地结构检查时可以跳过外部凭据:

```bash
pnpm release:channels:preflight -- --skip-external
```

## npm 发布

所有标准包和历史兼容包使用统一生态发布脚本:

```bash
pnpm release:ecosystem:list
pnpm release:ecosystem:publish:preflight
pnpm release:ecosystem:publish:dry-run
pnpm release:ecosystem:publish
```

`publish:preflight` 会在构建前确认 npm 登录态和 14 个发布包的基础元数据，避免未登录时先跑一轮完整构建再失败。发布脚本会统一执行版本、入口文件、`publishConfig.access=public` 和包体校验，并在调用 `pnpm publish` 时传入 `--no-git-checks --ignore-scripts`。这是为了兼容本地过渡 checkout 仍显示为 `v3`、但审计基线已经是远端 `origin/main` 完整原始聚合仓的发布场景，同时避免包内 `prepublishOnly` 重新构建并覆盖统一构建、混淆后的产物；不要绕过脚本手工逐包发布。

npm 账号启用 MFA/passkey 时，使用交互式会话完成浏览器确认。发布完成后确认关键包:

```bash
npm view @file-viewer/core version --registry=https://registry.npmjs.org/
npm view @file-viewer/vue3 version --registry=https://registry.npmjs.org/
npm view @file-viewer/vue2.7 version --registry=https://registry.npmjs.org/
npm view @flyfish-group/file-viewer3 version --registry=https://registry.npmjs.org/
npm view @flyfish-group/file-viewer version --registry=https://registry.npmjs.org/
```

## Cloudflare Pages 上线

线上 Demo 域名是 `viewer.flyfish.dev`:

```bash
cd /Users/wangyu/IdeaProjects/file-viewer3
pnpm deploy:cloudflare
```

文档站域名是 `doc.flyfish.dev`:

```bash
pnpm docs:deploy:cloudflare
```

注意: 私有 Gitea `main` 是源码发布基线；Cloudflare Pages 项目的自定义域名当前绑定生产分支 `v3`，因此 `docs:deploy:cloudflare` 会把 `docs/.vitepress/dist` 发布到 Pages 的 `v3` 分支，确保 `doc.flyfish.dev` 直接更新。

部署完成后至少打开以下地址冒烟:

- `https://viewer.flyfish.dev/?smoke=<本次标识>`
- `https://viewer.flyfish.dev/?url=%2Fexample%2Fpdf.pdf&smoke=<本次标识>`
- `https://viewer.flyfish.dev/compare.html?smoke=<本次标识>`
- `https://doc.flyfish.dev/?smoke=<本次标识>`
- `https://doc.flyfish.dev/guide/?smoke=<本次标识>`

## 同步开源总仓库

GitHub/Gitee 开源总仓库使用独立目录 `/Users/wangyu/IdeaProjects/file-viewer-public`。不要在私有聚合仓里直接把 `v3` 推到 GitHub。

推荐使用脚本同步源码、Demo、文档和 release 下载物:

```bash
cd /Users/wangyu/IdeaProjects/file-viewer3
pnpm release:public -- --public-repo-dir /Users/wangyu/IdeaProjects/file-viewer-public
```

脚本会完成:

- 复制 `apps/`、`packages/core/`、`packages/components/`、`packages/compat/` 和 `docs/` 源码
- 构建 Demo 产物并复制到 `file-viewer-public/demo`
- 构建 component demo 产物并复制到 `file-viewer-public/component-demo`
- 构建并混淆 Vue3 兼容库产物，复制到 `file-viewer-public/dist`
- 构建文档站，复制到 `file-viewer-public/docs-dist`
- 复制示例文件到 `file-viewer-public/example`
- 生成 npm tarball 到 `file-viewer-public/artifacts`
- 生成 Demo、组件 Demo、库产物、文档站 tarball
- 写入 `artifacts/release-manifest.json`
- 检查开源总仓库根目录是否误出现 `.env`、`.release/`、`node_modules/`、根目录 `scripts/` 等内部内容

脚本会使用稳定的 gzip 头生成静态 tarball，并在复制/打包前做内容比较；如果产物字节完全一致，会保留旧文件，避免 GitHub/Gitee 历史因为无意义的二进制重写继续膨胀。Gitee 已提示仓库接近或超过 1GB 时，务必优先确认 `git diff --stat` 中没有重复变化的大型 `.tar.gz`。

如果你已经手动完成构建，也可以复用 `.release/` 暂存目录并跳过构建:

```bash
pnpm release:public -- --public-repo-dir /Users/wangyu/IdeaProjects/file-viewer-public --skip-build
```

同步完成后必须在开源总仓库里检查:

```bash
cd /Users/wangyu/IdeaProjects/file-viewer-public
git status -sb
git diff --stat
test -d apps
test -d packages/core
test -d packages/components
test -d docs
test -d docs-dist
test -d artifacts
test -f BRANCHES.md
test -f WRAPPER_ECOSYSTEM.md
test -f ECOSYSTEM_REFACTOR_CHECKLIST.md
test ! -d .release
test ! -d node_modules
test ! -d scripts
```

确认源码、静态产物、示例和 release 下载物都符合预期后再提交:

```bash
git add -A
git commit -m "chore: refresh open-source main repository for <version>"
git push origin main
git push gitee main
```

## 同步 core 和组件分仓

GitHub/Gitee 的 core 和标准组件分仓由 `ecosystem/wrappers.json` 驱动。GitHub 仓库可直接通过 `components:publish` 更新；Gitee 需要先确保组织下仓库存在:

```bash
cd /Users/wangyu/IdeaProjects/file-viewer3
FILE_VIEWER_GITEE_TOKEN_FILE=~/.config/flyfish/gitee-token pnpm components:gitee:preflight
FILE_VIEWER_GITEE_TOKEN_FILE=~/.config/flyfish/gitee-token pnpm components:gitee:create
FILE_VIEWER_GITEE_TOKEN_FILE=~/.config/flyfish/gitee-token pnpm components:gitee:publish
pnpm verify:wrapper-public-remotes --host=gitee
```

说明:

- `components:gitee:preflight` 只验证 Gitee API token 和本次将处理的仓库数量，不创建仓库、不导出产物、不推送远端。
- `components:gitee:create` 只创建缺失仓库，已存在仓库会跳过；可加 `--dry-run` 预览。
- `components:gitee:publish` 会先执行 preflight，再创建缺失仓库、导出 core + 标准组件包，只推送 Gitee 远端并验证 `main` 分支可达。
- token 不要出现在命令历史、日志或仓库文件中；推荐放在仓库外的 `FILE_VIEWER_GITEE_TOKEN_FILE`，或只通过当前 shell 的 `FILE_VIEWER_GITEE_TOKEN` / `GITEE_TOKEN` / `GITEE_ACCESS_TOKEN` 传入。
- 如果本机 `git credential` 中保存的 gitee.com password 本身就是 Gitee API access token，可以显式追加 `-- --use-git-credential`；普通 Git HTTPS 密码不能用于 Gitee API。

## 私有聚合仓提交规则

私有聚合仓只提交到 Gitea:

```bash
cd /Users/wangyu/IdeaProjects/file-viewer3
git status -sb
git add <本次源码变更>
git commit -m "<message>"
git push origin v3
```

禁止把私有聚合仓分支直接推到开源总仓库:

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
| 私有聚合仓 main | `git ls-remote --heads origin main` | Gitea `main` 是完整原始聚合仓 |
| Vue2 / Vue3 分支 | `git ls-remote --heads origin v2 v3` | Gitea `v2` / `v3` 分别是 Vue2.7 / Vue3 标准组件分支 |
| GitHub 默认分支 | `gh repo view flyfish-dev/file-viewer --json defaultBranchRef` | `main` |
| GitHub 开源总仓库 | `https://github.com/flyfish-dev/file-viewer` | README、apps、packages、docs、demo、docs-dist、example、artifacts 均存在 |
| Gitee 开源总仓库 | `https://gitee.com/flyfish-dev/file-viewer` | 国内镜像目标；如远端配额阻塞，以 GitHub 开源总仓库和 release 为准 |
| 发布前门禁 | `pnpm release:channels:preflight` | 本地结构、npm 登录态、Gitee token、公开仓边界全部通过 |
| npm | `pnpm release:ecosystem:list` + `npm view` | 所有标准包和兼容包版本一致 |
| Demo | `https://viewer.flyfish.dev` | 页面可打开，样例可预览 |
| 文档站 | `https://doc.flyfish.dev` | 页面可打开，导航和样式正常 |
| Release | `https://github.com/flyfish-dev/file-viewer/releases` | 当前版本 tarball 和 manifest 已上传 |

## 敏感内容应急处理

如果发现开源总仓库出现密钥、本地缓存、内部发布脚本或错误的私有聚合分支:

1. 立即把 GitHub 默认分支切回 `main`。
2. 删除错误分支或回滚敏感提交。
3. 检查 fork 列表。
4. 检查 tag 是否指向敏感提交。
5. 如有 fork 保存敏感内容，联系 fork 作者删除，必要时走 GitHub Support / Private Information Removal。

常用命令:

```bash
gh repo edit flyfish-dev/file-viewer --default-branch main
git push https://github.com/flyfish-dev/file-viewer.git --delete <bad-branch>
gh api repos/flyfish-dev/file-viewer/forks --paginate
git ls-remote --heads https://github.com/flyfish-dev/file-viewer.git
git ls-remote --tags https://github.com/flyfish-dev/file-viewer.git
```

这类应急命令只用于止损，正常发布流程不要从私有聚合仓直接操作 GitHub 分支。
