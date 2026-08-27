/** 역할 칩(FilterChips)과 희귀도 체크박스(RarityFilter)가 같은 필 모양을 쓴다 */
export function chipClassName(active: boolean): string {
  return `rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
    active
      ? 'border-brand bg-brand/15 text-brand-hover'
      : 'border-border-subtle bg-bg-surface text-text-secondary'
  }`
}
