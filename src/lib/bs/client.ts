import { BsError, kindFromStatus } from './errors'

/**
 * 베이스 URL 을 환경변수로 빼둔다.
 * 공식 API 키는 IP 화이트리스트가 걸려 있어 Vercel 함수에서 직접 호출하면 403 이 난다.
 * 고정 IP 서버로 옮길 때 코드 변경 없이 전환하기 위함이다.
 */
const BASE = process.env.BRAWL_STARS_API_BASE ?? 'https://bsproxy.royaleapi.dev/v1'

/** 브롤스타즈 태그에 실제로 존재하는 문자만 */
const TAG_CHARS = /^#?[0289PYLQGRJCUV]+$/

export function isValidTag(tag: string): boolean {
  return tag.length > 0 && TAG_CHARS.test(tag.toUpperCase())
}

export function encodeTag(tag: string): string {
  const bare = tag.startsWith('#') ? tag.slice(1) : tag
  return encodeURIComponent('#' + bare.toUpperCase())
}

export async function bsFetch<T>(pathname: string, init?: RequestInit): Promise<T> {
  const token = process.env.BRAWL_STARS_TOKEN
  if (!token) throw new BsError('Forbidden', 403)

  const res = await fetch(`${BASE}${pathname}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new BsError(kindFromStatus(res.status), res.status)
  return res.json() as Promise<T>
}
