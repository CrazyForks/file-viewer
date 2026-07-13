# 分发方式

File Viewer 通过 npm、GitHub Releases、Docker 以及在线 demo/文档站分发。

| 需求 | 推荐渠道 |
| --- | --- |
| 应用集成 | npm 上的 `@file-viewer/*` 包 |
| 框架一步集成 | 对应的 `@file-viewer/*-full` 包 |
| 静态/iframe/离线归档 | [GitHub Releases](https://github.com/flyfish-dev/file-viewer/releases) |
| 可直接运行的容器 | Docker Hub 的 `flyfishdev/file-viewer` |
| 源码开发 | 当前 GitHub 总仓 |

大体积发行归档和 npm tarball 不进入 Git 历史。公开仓 `artifacts/` 只保留 manifest、status、matrix 和 schema JSON；发行记录通过下载链接指向 GitHub Release 资产。

## 公开源码构建

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm docs:build
```

完整公开门禁见[参与开发](./development.md)，已发布镜像用法见 [Docker](./docker.md)。

## 维护者边界

<!-- FILE_VIEWER_MAINTAINER_COMMANDS -->

版本管理、npm 发布、官方 Docker 发布、Cloudflare 部署、仓库同步和发行签名属于完整私有工作区的维护者操作。公开边界不复制这些内部脚本，从而保证公开文档中的命令真实可执行。
