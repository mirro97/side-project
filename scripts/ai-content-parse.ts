import type { AiContent, AiContentByLocale } from '../src/types/ai-content'

/**
 * 모델 응답에서 생성물을 꺼낸다.
 *
 * 스키마를 줘도 코드펜스로 감싸 보내는 경우가 있고, 필드가 비어 오는 경우도 있다.
 * **반쪽짜리를 파일로 커밋하면 사람이 106종을 다 읽기 전까지 안 드러나므로**
 * 조금이라도 어긋나면 그 브롤러를 통째로 건너뛴다.
 */
export function stripFence(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim()
}

export function isEntry(v: unknown): v is AiContent {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return (['howToPlay', 'gears', 'trait'] as const).every(
    k => typeof o[k] === 'string' && (o[k] as string).trim().length > 0,
  )
}

/** 두 로케일이 모두 성해야 통과시킨다. 한쪽만 있으면 색인이 어긋난다 */
export function parseContent(text: string): AiContentByLocale | null {
  let v: unknown
  try {
    v = JSON.parse(stripFence(text))
  } catch {
    return null
  }
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  if (!isEntry(o.en) || !isEntry(o.ko)) return null
  return { en: o.en, ko: o.ko }
}
