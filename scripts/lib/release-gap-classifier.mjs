const RULES = [
  {
    test: message => message.includes('local source worktree') || message.startsWith('local HEAD'),
    channel: 'source-worktree',
    scope: 'local',
    externalBlocker: false,
    nextAction: 'Commit or clean the local source worktree, then rerun the release audit.'
  },
  {
    test: message => message.startsWith('source remote') || message.includes('source remote missing branch'),
    channel: 'source-remote',
    scope: 'private-gitea',
    externalBlocker: true,
    nextAction: 'Restore the private Gitea source branch or push the expected release source.'
  },
  {
    test: message => message.includes('open-source main GitHub') || message.endsWith('GitHub repository missing'),
    channel: 'github',
    scope: 'public-source',
    externalBlocker: true,
    nextAction: 'Create or refresh the GitHub public repository, then rerun the GitHub content verifier.'
  },
  {
    test: message => message.includes('GitHub Release'),
    channel: 'github-release',
    scope: 'release-assets',
    externalBlocker: true,
    nextAction: 'Upload the missing GitHub Release metadata or artifact and rerun verify:github-release-assets.'
  },
  {
    test: message => message.includes('open-source main Gitee repository'),
    channel: 'gitee',
    scope: 'public-mirror',
    externalBlocker: true,
    nextAction:
      'Run `pnpm public:gitee:snapshot -- --push --confirm-rewrite-history` to publish a shallow Gitee mirror with the same file tree.'
  },
  {
    test: message => message.includes('Gitee'),
    channel: 'gitee',
    scope: 'component-repository',
    externalBlocker: true,
    nextAction: 'Set `FILE_VIEWER_GITEE_TOKEN_FILE=<repo-external-token-file>` and run `pnpm components:gitee:publish`.'
  },
  {
    test: message => message.includes('npm') || message.includes('published'),
    channel: 'npm',
    scope: 'package-registry',
    externalBlocker: true,
    nextAction: 'Complete npm login/passkey and publish the ecosystem packages.'
  }
]

function defaultRule(message) {
  return {
    channel: 'unknown',
    scope: 'release',
    externalBlocker: true,
    nextAction: `Inspect and resolve this release gap: ${message}`
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^a-z0-9@._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
}

export function classifyReleaseGap(message) {
  const rule = RULES.find(candidate => candidate.test(message)) ?? defaultRule(message)
  return {
    id: slugify(`${rule.channel}-${message}`),
    channel: rule.channel,
    scope: rule.scope,
    externalBlocker: rule.externalBlocker,
    message,
    nextAction: rule.nextAction
  }
}

export function describeReleaseGaps(messages) {
  const details = messages.map(classifyReleaseGap)
  const byChannel = {}

  for (const detail of details) {
    byChannel[detail.channel] = (byChannel[detail.channel] || 0) + 1
  }

  const externalBlockerChannels = [
    ...new Set(details.filter(detail => detail.externalBlocker).map(detail => detail.channel))
  ].sort()
  const localActionableChannels = [
    ...new Set(details.filter(detail => !detail.externalBlocker).map(detail => detail.channel))
  ].sort()

  return {
    details,
    summary: {
      total: details.length,
      externalBlockers: details.filter(detail => detail.externalBlocker).length,
      localActionable: details.filter(detail => !detail.externalBlocker).length,
      byChannel,
      externalBlockerChannels,
      localActionableChannels
    }
  }
}
