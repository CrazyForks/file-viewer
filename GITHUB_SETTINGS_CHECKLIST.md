# GitHub Settings Checklist

Use this checklist when preparing or auditing the public GitHub repository:

Repository: `flyfish-dev/file-viewer`

## Description

Expected:

```txt
Browser-native Office / PDF / CAD / archive viewer for internal web apps, with Vue, React, Svelte, jQuery, Web Components, and no server-side conversion.
```

Verify:

```bash
gh repo view flyfish-dev/file-viewer --json description --jq .description
```

Update:

```bash
pnpm github:descriptions:update
```

## Topics

Verify:

```bash
pnpm github:topics:plan
```

Update:

```bash
pnpm github:topics:update
```

## Social Preview

GitHub does not expose a public REST or GraphQL mutation for uploading repository social preview images. Upload through the repository web UI:

1. Render the current image:

   ```bash
   pnpm github:social-preview:render
   ```

2. Open repository settings:

   ```txt
   https://github.com/flyfish-dev/file-viewer/settings
   ```

3. In `Social preview`, click `Edit` -> `Upload an image...`.
4. Upload:

   ```txt
   .github/social-preview.png
   ```

5. Confirm the preview shows the branded File Viewer image with the blue-green logo mark.

Local verification:

```bash
pnpm github:social-preview:render
pnpm github:social-preview:check
pnpm verify:github-growth-assets:strict
```

## Community Health

The repository should include:

- `CONTRIBUTING.md`
- `SUPPORT.md`
- `SECURITY.md`
- `CODE_OF_CONDUCT.md`
- `ROADMAP.md`
- `CHANGELOG.md`
- `.github/FUNDING.yml`
- `.github/ISSUE_TEMPLATE/compatibility.yml`
- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/PULL_REQUEST_TEMPLATE.md`

Verify:

```bash
pnpm verify:github-growth-assets
```
