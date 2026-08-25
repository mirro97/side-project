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
