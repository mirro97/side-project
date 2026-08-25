export function formatTrophies(n: number): string {
  return n.toLocaleString('en-US')
}

/** 랭킹 응답의 nameColor 는 0xffcb5aff 형태의 ARGB 다. 앞 2바이트가 알파 */
export function argbToHex(v: string): string | null {
  const m = /^0x[0-9a-fA-F]{2}([0-9a-fA-F]{6})$/.exec(v)
  return m ? `#${m[1].toLowerCase()}` : null
}

export function formatRemaining(end: Date, now: Date = new Date()) {
  const ms = end.getTime() - now.getTime()
  if (ms <= 0) return { h: 0, m: 0, ended: true }
  return { h: Math.floor(ms / 3_600_000), m: Math.floor((ms % 3_600_000) / 60_000), ended: false }
}

/**
 * 브롤스타즈 플레이어·클럽 이름에는 게임 내 색상 마크업이 섞여 온다.
 * 예: "Only<c3>Pro</c>" — 상위 클럽 열 개 중 셋이 이 형태였다.
 * 색을 재현하려면 게임 팔레트와 HTML 삽입이 필요해서 v1 은 태그만 벗긴다.
 */
export function stripNameMarkup(name: string | undefined | null): string {
  if (!name) return ''
  return name.replace(/<\/?c\d*>/g, '')
}
