# Traffic Tracking

Use this table after every README update, release, article, community post, or newsletter submission. GitHub Traffic only keeps a short recent window, so record numbers soon after each campaign.

Generate a current read-only GitHub snapshot:

```bash
pnpm github:traffic:snapshot
pnpm github:traffic:snapshot -- --output=.growth/traffic/$(date +%F).md
pnpm npm:downloads:snapshot
pnpm npm:downloads:snapshot -- --output=.growth/npm/$(date +%F).md
```

## Campaign Log

| Date | Channel | Title / Hook | Link | GitHub Visitors | Unique Visitors | Stars + | Issues + | npm Download Change | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |  |  |  |

## What To Look For

- Which title brings the most qualified repository visits?
- Which scenario brings useful issues rather than drive-by traffic?
- Which channel sends users who actually open the Demo or Docs?
- Which README, Docs, or Demo page becomes popular content after a post?
- Which package download changes after framework-specific posts?

## Weekly Snapshot

| Week | Visitors | Unique Visitors | Stars | Forks | Issues Opened | Issues With Repro Files | npm Downloads | Best Channel | Next Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |  |  |  |

## Source Checklist

- GitHub repository Insights -> Traffic
- `pnpm github:traffic:snapshot`
- GitHub repository Stars / Forks / Issues
- npm package download trends for `@file-viewer/core`, `@file-viewer/web`, `@file-viewer/vue3`, `@file-viewer/react`, and full packages
- `pnpm npm:downloads:snapshot`
- Demo and Docs analytics if available
- Article platform views, comments, bookmarks, and inbound links
