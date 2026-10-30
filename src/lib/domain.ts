// Parsing a URL is slow next to what the sort and the counters do with it, and
// they ask for the same URLs again on every delete, so each one is parsed once.
const domains = new Map<string, string>()

export function domainOf(url: string): string {
  const known = domains.get(url)
  if (known !== undefined) return known
  let domain: string
  try {
    domain = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    domain = url
  }
  domains.set(url, domain)
  return domain
}
