import { computed, nextTick, onBeforeUnmount, reactive, shallowRef, type Ref } from 'vue'
import type {
  FileViewerDocumentAnchor,
  FileViewerSearchMatch,
  FileViewerSearchOptions,
  FileViewerSearchState
} from '@/package/common/type'
import {
  collectDocumentAnchors,
  findAnchorForElement
} from './documentLocation'

interface InternalSearchMatch extends FileViewerSearchMatch {
  element: HTMLElement;
}

const DEFAULT_MATCH_CLASS = 'flyfish-search-match'
const DEFAULT_ACTIVE_CLASS = 'flyfish-search-match--active'
const DEFAULT_MAX_MATCHES = 1000

const SKIP_SELECTOR = [
  'script',
  'style',
  'textarea',
  'input',
  'select',
  'button',
  '.viewer-actions',
  '.viewer-watermark',
  '.state-panel',
  '.pdf-toolbar',
  '.pdf-nav-pane',
  '.flyfish-search-match'
].join(',')

const normalizeOptions = (options?: boolean | FileViewerSearchOptions): FileViewerSearchOptions => {
  if (options === false) {
    return { enabled: false }
  }
  if (options === true || options === undefined) {
    return {}
  }
  return options
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const normalizeQuery = (value: string) => value.replace(/\s+/g, ' ').trim()

const createSearchRegExp = (query: string, options: FileViewerSearchOptions) => {
  const source = options.wholeWord ? `\\b${escapeRegExp(query)}\\b` : escapeRegExp(query)
  return new RegExp(source, options.caseSensitive ? 'g' : 'gi')
}

const getSerializableMatches = (matches: InternalSearchMatch[]): FileViewerSearchMatch[] => {
  return matches.map(({ element: _element, ...match }) => match)
}

const unwrapMark = (mark: HTMLElement) => {
  const parent = mark.parentNode
  if (!parent) {
    return
  }
  while (mark.firstChild) {
    parent.insertBefore(mark.firstChild, mark)
  }
  parent.removeChild(mark)
  parent.normalize()
}

const isSkippableTextNode = (node: Text, root: HTMLElement) => {
  const parent = node.parentElement
  if (!parent || parent.closest(SKIP_SELECTOR)) {
    return true
  }
  return !root.contains(parent) || !node.data.trim()
}

const walkTextNodes = (root: HTMLElement) => {
  const nodes: Text[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return isSkippableTextNode(node as Text, root)
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT
    }
  })

  let current = walker.nextNode()
  while (current) {
    nodes.push(current as Text)
    current = walker.nextNode()
  }
  return nodes
}

export const useDocumentSearch = (
  root: Ref<HTMLElement | null>,
  optionsSource?: () => boolean | FileViewerSearchOptions | undefined,
  scrollContainerSource?: () => HTMLElement | null | undefined
) => {
  const options = computed(() => normalizeOptions(optionsSource?.()))
  const anchors = shallowRef<FileViewerDocumentAnchor[]>([])
  const internalMatches = shallowRef<InternalSearchMatch[]>([])
  const marks = new Set<HTMLElement>()
  const state = reactive<FileViewerSearchState>({
    query: '',
    total: 0,
    currentIndex: -1,
    current: null,
    matches: []
  })

  let observer: MutationObserver | null = null
  let shouldObserve = false
  let debounceTimer: number | null = null
  let applying = false

  const syncState = () => {
    const serializable = getSerializableMatches(internalMatches.value)
    state.total = serializable.length
    state.currentIndex = serializable.length ? Math.max(0, Math.min(state.currentIndex, serializable.length - 1)) : -1
    state.current = state.currentIndex >= 0 ? serializable[state.currentIndex] : null
    state.matches = serializable
  }

  const clearMarks = () => {
    Array.from(marks).forEach(unwrapMark)
    marks.clear()
    internalMatches.value = []
    state.total = 0
    state.currentIndex = -1
    state.current = null
    state.matches = []
  }

  const disconnectObserver = () => {
    observer?.disconnect()
    observer = null
  }

  const startObserver = () => {
    disconnectObserver()
    if (!shouldObserve || !root.value || typeof MutationObserver === 'undefined') {
      return
    }
    observer = new MutationObserver(rerunAfterDomChange)
    observer.observe(root.value, {
      childList: true,
      subtree: true,
      characterData: true
    })
  }

  const resumeObserver = () => {
    if (!shouldObserve || typeof window === 'undefined') {
      return
    }
    window.setTimeout(startObserver, 0)
  }

  const isScrollableElement = (element: HTMLElement) => {
    const range = Math.max(0, element.scrollHeight - element.clientHeight)
    if (range <= 2) {
      return false
    }
    if (typeof window === 'undefined') {
      return true
    }
    const style = window.getComputedStyle(element)
    const overflowY = style.overflowY || style.overflow
    return ['auto', 'scroll', 'overlay', 'visible'].includes(overflowY)
  }

  const getMatchScrollContainer = (element: HTMLElement) => {
    const currentRoot = root.value
    const preferred = scrollContainerSource?.()
    if (preferred && (preferred === element || preferred.contains(element))) {
      return preferred
    }

    let current: HTMLElement | null = element.parentElement
    while (current) {
      if (isScrollableElement(current)) {
        return current
      }
      if (current === currentRoot) {
        break
      }
      current = current.parentElement
    }
    return currentRoot
  }

  const scrollMatchIntoView = (element: HTMLElement) => {
    const container = getMatchScrollContainer(element)
    if (!container) {
      element.scrollIntoView({ block: 'center', inline: 'nearest' })
      return
    }

    const lockedLeft = container.scrollLeft
    const containerRect = container.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()
    const targetTop = elementRect.top - containerRect.top + container.scrollTop
      - (container.clientHeight / 2)
      + (elementRect.height / 2)
    const maxTop = Math.max(0, container.scrollHeight - container.clientHeight)

    container.scrollTo({
      top: Math.max(0, Math.min(targetTop, maxTop)),
      left: lockedLeft,
      behavior: 'auto'
    })
    container.scrollLeft = lockedLeft
  }

  const setActiveMatch = (index: number, scroll = true) => {
    const matches = internalMatches.value
    if (!matches.length) {
      syncState()
      return state
    }
    const normalized = ((index % matches.length) + matches.length) % matches.length
    matches.forEach(match => {
      match.element.classList.remove(options.value.activeClassName || DEFAULT_ACTIVE_CLASS)
    })
    const active = matches[normalized]
    active.element.classList.add(options.value.activeClassName || DEFAULT_ACTIVE_CLASS)
    state.currentIndex = normalized
    syncState()
    if (scroll) {
      scrollMatchIntoView(active.element)
    }
    return state
  }

  const highlightTextNode = (
    node: Text,
    expression: RegExp,
    maxMatches: number,
    nextMatches: InternalSearchMatch[]
  ) => {
    const text = node.data
    let lastIndex = 0
    let match: RegExpExecArray | null
    const fragment = document.createDocumentFragment()
    let matched = false

    expression.lastIndex = 0
    while ((match = expression.exec(text)) && nextMatches.length < maxMatches) {
      if (!match[0]) {
        expression.lastIndex += 1
        continue
      }
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)))
      }

      const mark = document.createElement('mark')
      mark.className = options.value.className || DEFAULT_MATCH_CLASS
      mark.textContent = match[0]
      mark.dataset.searchMatchId = `viewer-search-match-${nextMatches.length + 1}`
      marks.add(mark)
      fragment.appendChild(mark)
      matched = true

      const anchor = findAnchorForElement(node.parentElement, anchors.value, root.value)
      nextMatches.push({
        id: mark.dataset.searchMatchId,
        index: nextMatches.length,
        text: match[0],
        anchor,
        line: anchor?.line,
        page: anchor?.page,
        element: mark
      })

      lastIndex = match.index + match[0].length
    }

    if (!matched) {
      return
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)))
    }
    node.parentNode?.replaceChild(fragment, node)
  }

  const runSearch = async (query: string, preferredIndex = 0) => {
    const normalizedQuery = normalizeQuery(query)
    state.query = normalizedQuery
    disconnectObserver()
    applying = true

    try {
      clearMarks()

      if (!normalizedQuery || options.value.enabled === false || !root.value) {
        return state
      }

      await nextTick()
      anchors.value = collectDocumentAnchors(root.value)
      const expression = createSearchRegExp(normalizedQuery, options.value)
      const maxMatches = Math.max(1, options.value.maxMatches || DEFAULT_MAX_MATCHES)
      const nextMatches: InternalSearchMatch[] = []
      const textNodes = walkTextNodes(root.value)

      for (const node of textNodes) {
        if (nextMatches.length >= maxMatches) {
          break
        }
        highlightTextNode(node, expression, maxMatches, nextMatches)
      }
      internalMatches.value = nextMatches
      syncState()
      if (nextMatches.length) {
        setActiveMatch(preferredIndex, true)
      }
    } finally {
      applying = false
      resumeObserver()
    }

    return state
  }

  const rerunAfterDomChange = () => {
    if (!state.query || applying || options.value.enabled === false) {
      return
    }
    if (debounceTimer !== null) {
      window.clearTimeout(debounceTimer)
    }
    debounceTimer = window.setTimeout(() => {
      debounceTimer = null
      void runSearch(state.query, Math.max(0, state.currentIndex))
    }, options.value.debounce ?? 180)
  }

  const observe = () => {
    shouldObserve = true
    startObserver()
  }

  const refreshAnchors = async () => {
    await nextTick()
    anchors.value = collectDocumentAnchors(root.value)
    return anchors.value
  }

  const search = async (query: string) => runSearch(query, 0)
  const next = () => setActiveMatch(state.currentIndex + 1)
  const previous = () => setActiveMatch(state.currentIndex - 1)

  const clear = () => {
    state.query = ''
    disconnectObserver()
    applying = true
    try {
      clearMarks()
    } finally {
      applying = false
      resumeObserver()
    }
  }

  onBeforeUnmount(() => {
    shouldObserve = false
    disconnectObserver()
    if (debounceTimer !== null) {
      window.clearTimeout(debounceTimer)
      debounceTimer = null
    }
    clearMarks()
  })

  return {
    anchors,
    state,
    observe,
    refreshAnchors,
    search,
    next,
    previous,
    clear
  }
}
