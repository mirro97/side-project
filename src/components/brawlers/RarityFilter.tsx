'use client'
import { chipClassName } from './chipStyles'

export interface RarityOption {
  id: number
  label: string
  color: string
  count: number
}

/**
 * 역할 칩과 다르게 희귀도는 체크박스다 — 배타적 선택이 아니라
 * 여러 등급을 동시에 켜고 끌 수 있어야 한다. 아무것도 안 켜면 필터 없음(전체)이다.
 */
function RarityCheckbox({
  option,
  checked,
  onToggle,
}: {
  option: RarityOption
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={checked}
      className={`flex items-center gap-1.5 ${chipClassName(checked)}`}
    >
      <span
        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border ${
          checked ? 'border-brand bg-brand' : 'border-border-strong'
        }`}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 fill-none stroke-white stroke-[2]">
            <path d="M2.5 6.5L5 9L9.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: option.color }} />
      {option.label} {option.count}
    </button>
  )
}

export function RarityFilter({
  options,
  selected,
  onToggle,
}: {
  options: RarityOption[]
  selected: Set<number>
  onToggle: (id: number) => void
}) {
  return (
    <div className="mb-3 flex flex-wrap gap-1.5">
      {options.map(o => (
        <RarityCheckbox
          key={o.id}
          option={o}
          checked={selected.has(o.id)}
          onToggle={() => onToggle(o.id)}
        />
      ))}
    </div>
  )
}
