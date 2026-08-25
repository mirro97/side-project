import Link from 'next/link'

export function SectionCard({
  title,
  moreHref,
  moreLabel,
  children,
}: {
  title: string
  moreHref?: string
  moreLabel?: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-6">
      <div className="mb-2.5 flex items-baseline justify-between">
        <h2 className="text-[15px] font-bold tracking-tight">{title}</h2>
        {moreHref && (
          <Link href={moreHref} className="text-text-secondary text-[12px] font-medium">
            {moreLabel} ›
          </Link>
        )}
      </div>
      <div className="border-border-subtle bg-bg-surface rounded-panel overflow-hidden border">
        {children}
      </div>
    </section>
  )
}
