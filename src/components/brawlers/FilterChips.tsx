'use client'

export interface ChipOption {
  key: string
  label: string
  count: number
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
        active
          ? 'border-brand bg-brand/15 text-brand-hover'
          : 'border-border-subtle bg-bg-surface text-text-secondary'
      }`}
    >
      {label}
    </button>
  )
}

/** 개수를 함께 표시한다. 역할 없는 19종 때문에 합이 106 이 아닌 이유가 보여야 한다 */
export function FilterChips({
  options,
  selected,
  allLabel,
  allCount,
  onSelect,
}: {
  options: ChipOption[]
  selected: string | null
  allLabel: string
  allCount: number
  onSelect: (key: string | null) => void
}) {
  return (
    <div className="mb-3 flex flex-wrap gap-1.5">
      <Chip
        label={`${allLabel} ${allCount}`}
        active={selected === null}
        onClick={() => onSelect(null)}
      />
      {options.map(o => (
        <Chip
          key={o.key}
          label={`${o.label} ${o.count}`}
          active={selected === o.key}
          onClick={() => onSelect(o.key)}
        />
      ))}
    </div>
  )
}
