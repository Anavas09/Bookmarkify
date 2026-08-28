export function faviconUrl(url: string, size = 32): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
  return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=${size}`
}
