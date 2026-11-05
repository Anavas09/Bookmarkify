export function formatDate(ms: number | undefined): string | null {
  if (ms === undefined) return null
  const d = new Date(ms)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}·${mm}·${dd}`
}

export function catalogNumber(index: number): string {
  return '№' + String(index + 1).padStart(3, '0')
}
