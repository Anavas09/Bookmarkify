const TRACKING_PARAM_PATTERNS: RegExp[] = [
  /^utm_/,
  /^fbclid$/,
  /^gclid$/,
  /^mc_/,
]

function isTrackingParam(name: string): boolean {
  const lower = name.toLowerCase()
  return TRACKING_PARAM_PATTERNS.some(p => p.test(lower))
}

export function normalizeUrl(raw: string): string | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null

  const host = url.hostname.toLowerCase()
  const port = url.port ? `:${url.port}` : ''

  const kept = new URLSearchParams()
  for (const [key, value] of url.searchParams) {
    if (isTrackingParam(key)) continue
    kept.append(key, value)
  }
  kept.sort()
  const query = kept.toString() ? `?${kept.toString()}` : ''

  let pathname = url.pathname
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.replace(/\/+$/, '')
  }

  return `${url.protocol}//${host}${port}${pathname}${query}`
}
