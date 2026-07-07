import DefaultTheme from 'vitepress/theme'
import { inBrowser } from 'vitepress'
import { onMounted } from 'vue'
import './custom.css'

const githubRepositoryUrl = 'https://github.com/flyfish-dev/file-viewer'
const githubRepositoryApiUrl = 'https://api.github.com/repos/flyfish-dev/file-viewer'
const githubStarsCacheKey = 'flyfish-docs-github-stars'
const githubStarsFallback = '938'
const githubStarsCacheTtl = 1000 * 60 * 60 * 6
const docsLocalePreferenceKey = 'flyfish-docs-locale-preference'

function formatGithubStars(stars: number) {
  if (stars >= 100000) {
    return `${Math.round(stars / 1000)}k`
  }

  if (stars >= 1000) {
    return `${(stars / 1000).toFixed(1).replace(/\.0$/, '')}k`
  }

  return String(stars)
}

function enhanceGithubStarLinks(stars = githubStarsFallback) {
  const links = document.querySelectorAll<HTMLAnchorElement>(
    `a.VPSocialLink[href="${githubRepositoryUrl}"]`
  )

  for (const link of links) {
    link.classList.add('docs-github-star-button')
    link.dataset.stars = stars
    link.setAttribute('aria-label', `Star Flyfish Viewer on GitHub, ${stars} stars`)
  }
}

function readCachedGithubStars() {
  try {
    const cached = window.sessionStorage.getItem(githubStarsCacheKey)
    if (!cached) {
      return
    }

    const parsed = JSON.parse(cached) as { expiresAt?: number; stars?: string }
    if (typeof parsed.expiresAt === 'number' && parsed.expiresAt > Date.now() && parsed.stars) {
      return parsed.stars
    }
  } catch {
    return
  }
}

function writeCachedGithubStars(stars: string) {
  try {
    window.sessionStorage.setItem(
      githubStarsCacheKey,
      JSON.stringify({
        expiresAt: Date.now() + githubStarsCacheTtl,
        stars
      })
    )
  } catch {
    // Session storage can be unavailable in privacy-restricted browsing modes.
  }
}

async function hydrateGithubStars() {
  const cachedStars = readCachedGithubStars()
  if (cachedStars) {
    enhanceGithubStarLinks(cachedStars)
    return
  }

  try {
    const response = await fetch(githubRepositoryApiUrl, {
      headers: {
        Accept: 'application/vnd.github+json'
      }
    })

    if (!response.ok) {
      return
    }

    const data = await response.json() as { stargazers_count?: unknown }
    if (typeof data.stargazers_count !== 'number') {
      return
    }

    const stars = formatGithubStars(data.stargazers_count)
    writeCachedGithubStars(stars)
    enhanceGithubStarLinks(stars)
  } catch {
    // Keep the fallback star treatment when GitHub is rate-limited or offline.
  }
}

function setupGithubStarButtons() {
  enhanceGithubStarLinks()
  void hydrateGithubStars()

  let updateScheduled = false
  const observer = new MutationObserver(() => {
    if (updateScheduled) {
      return
    }

    updateScheduled = true
    window.requestAnimationFrame(() => {
      updateScheduled = false
      enhanceGithubStarLinks(readCachedGithubStars() ?? githubStarsFallback)
    })
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
}

type Locale = 'zh' | 'en'

function normalizePathname(pathname: string) {
  return (pathname || '/').replace(/\/index\.html$/, '/') || '/'
}

function resolveDocsLocaleFromPathname(pathname: string): Locale {
  const normalizedPathname = normalizePathname(pathname).toLowerCase()
  return normalizedPathname === '/zh' || normalizedPathname.startsWith('/zh/') ? 'zh' : 'en'
}

function resolveEnglishDocsPath(pathname: string) {
  const normalizedPathname = normalizePathname(pathname)
  if (normalizedPathname === '/zh' || normalizedPathname === '/zh/') {
    return '/'
  }
  if (normalizedPathname.startsWith('/zh/')) {
    return normalizedPathname.replace(/^\/zh/, '') || '/'
  }
  if (normalizedPathname === '/en' || normalizedPathname === '/en/') {
    return '/'
  }
  if (normalizedPathname.startsWith('/en/')) {
    return normalizedPathname.replace(/^\/en/, '') || '/'
  }
  return normalizedPathname
}

function resolveDocsPathForLocale(pathname: string, locale: Locale) {
  const englishPath = resolveEnglishDocsPath(pathname)
  if (locale === 'en') {
    return englishPath
  }
  return englishPath === '/' ? '/zh/' : `/zh${englishPath}`
}

function readStoredDocsLocalePreference(): Locale | undefined {
  try {
    const storedLocale = window.localStorage.getItem(docsLocalePreferenceKey)
    return storedLocale === 'zh' || storedLocale === 'en' ? storedLocale : undefined
  } catch {
    return undefined
  }
}

function writeStoredDocsLocalePreference(locale: Locale) {
  try {
    window.localStorage.setItem(docsLocalePreferenceKey, locale)
  } catch {
    // Storage can be unavailable in privacy-restricted browsing modes.
  }
}

function prefersChineseEnvironment() {
  const languages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language].filter(Boolean)
  return languages.some(language => language.toLowerCase().startsWith('zh'))
}

function applyPreferredDocsLocale() {
  if (window.location.search.includes('no_lang_redirect=1')) {
    return
  }

  const preferredLocale = readStoredDocsLocalePreference() ?? (prefersChineseEnvironment() ? 'zh' : undefined)
  if (!preferredLocale) {
    return
  }

  const currentPath = normalizePathname(window.location.pathname)
  const preferredPath = resolveDocsPathForLocale(currentPath, preferredLocale)
  if (currentPath === preferredPath) {
    return
  }

  window.location.replace(`${preferredPath}${window.location.search}${window.location.hash}`)
}

function setupDocsLocalePreferenceTracking() {
  document.addEventListener(
    'click',
    event => {
      const target = event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>('a[href]')
        : null
      if (!target) {
        return
      }

      const targetUrl = new URL(target.href, window.location.href)
      if (targetUrl.origin !== window.location.origin) {
        return
      }

      const currentLocale = resolveDocsLocaleFromPathname(window.location.pathname)
      const targetLocale = resolveDocsLocaleFromPathname(targetUrl.pathname)
      if (currentLocale !== targetLocale) {
        writeStoredDocsLocalePreference(targetLocale)
      }
    },
    true
  )
}

export default {
  extends: DefaultTheme,
  setup() {
    onMounted(() => {
      if (!inBrowser) {
        return
      }

      setupGithubStarButtons()
      setupDocsLocalePreferenceTracking()
      applyPreferredDocsLocale()
    })
  }
}
