export function isWebUrl(url: string): boolean {
  return /^https?:/i.test(url)
}

// A page of the extension can't open chrome:// or file:// with a link or
// window.open: the tab stays blank or nothing happens. chrome.tabs.create can,
// and needs no permission. Without it (npm run dev) it's a plain window.open.
export function openLink(url: string): void {
  if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
    // Chrome refuses some URLs; there is nothing to do about it here.
    chrome.tabs.create({ url }).catch(() => {})
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}
