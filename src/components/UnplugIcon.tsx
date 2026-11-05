// A disconnected plug: the page does not answer.
export function UnplugIcon({ label }: { label: string }) {
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 24 24"
      className="h-4 w-4 text-accent"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>{label}</title>
      <path d="M9 2v4M15 2v4M7 6h10v4a5 5 0 0 1-10 0V6ZM12 15v3a3 3 0 0 0 3 3h2" />
      <path d="M3 3l18 18" />
    </svg>
  )
}
