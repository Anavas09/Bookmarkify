export function buildExportFilename(date: Date): string {
  return `bookmarks-${formatDate(date)}_edited.html`
}

// The copy of the bookmarks about to be deleted from Chrome.
export function buildBackupFilename(date: Date): string {
  return `bookmarks-${formatDate(date)}_deleted.html`
}

function formatDate(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
