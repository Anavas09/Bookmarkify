export function Key({ children }: { children: string }) {
  return (
    <kbd className="font-mono text-[10.5px] leading-none px-1.5 py-[3px] rounded-sm border border-edge bg-paper-card text-ink-soft">
      {children}
    </kbd>
  )
}
