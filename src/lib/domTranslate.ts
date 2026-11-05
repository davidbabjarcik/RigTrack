import { lookup } from './i18n'

// Poistka pre angličtinu: čo sa zobrazí a slovník to pozná, prepíše sa aj vtedy, keď text v kóde nie je obalený
// v tx() (napr. názvy zo zoznamov mimo obrazoviek). Mení len text a popisy (placeholder, title, aria-label, alt) –
// nikdy hodnoty polí. Tlačové hárky, štítky a ponuky pre klientov ostávajú po slovensky.

const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'] as const
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE'])
/** Stránky, ktoré sa tlačia alebo posielajú klientom (bez podpriečinka appky). */
export const PRINT_PATH = /(^|\/)(o\/|qr\/|labels\/|print\/batch|networks\/(qr|print)|loans\/[^/]+\/sheet|events\/[^/]+\/(print|patch|dmx|crew)|offers\/[^/]+\/print|cases\/[^/]+\/label|patch\/[^/]+\/print)/

function skipped(node: Node | null): boolean {
  for (let el = node instanceof Element ? node : node?.parentElement; el; el = el.parentElement) {
    if (SKIP_TAGS.has(el.tagName) || (el instanceof HTMLElement && el.isContentEditable) || el.hasAttribute('data-no-translate')) return true
  }
  return false
}

function translateText(node: Text) {
  const value = node.nodeValue ?? ''
  const core = value.trim()
  if (core.length < 2) return
  const english = lookup(core)
  if (english === undefined || english === core) return
  const start = value.indexOf(core)
  node.nodeValue = value.slice(0, start) + english + value.slice(start + core.length)
}

function translateAttrs(el: Element) {
  for (const name of ATTRS) {
    const value = el.getAttribute(name)
    if (!value) continue
    const english = lookup(value.trim())
    if (english !== undefined && english !== value) el.setAttribute(name, english)
  }
}

function translateTree(root: Node) {
  if (skipped(root)) return
  if (root.nodeType === Node.TEXT_NODE) return translateText(root as Text)
  if (!(root instanceof Element)) return
  translateAttrs(root)
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) => (node instanceof Element && (SKIP_TAGS.has(node.tagName) || node.hasAttribute('data-no-translate')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  })
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) translateText(node as Text)
    else translateAttrs(node as Element)
  }
}

/** Zapne poistku na celej stránke; vráti funkciu, ktorá ju vypne. */
export function startDomTranslation(root: HTMLElement = document.body, isPrintPage: () => boolean = () => false): () => void {
  const run = (node: Node) => {
    if (!isPrintPage()) translateTree(node)
  }
  run(root)
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') run(mutation.target)
      else if (mutation.type === 'attributes') run(mutation.target)
      else mutation.addedNodes.forEach(run)
    }
  })
  observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] })
  return () => observer.disconnect()
}
