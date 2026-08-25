export function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="border-border-subtle bg-bg-surface rounded-panel flex flex-col items-center gap-3 border px-6 py-10 text-center">
      <p className="text-text-secondary text-[13px]">{message}</p>
      {action}
    </div>
  )
}
