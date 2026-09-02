import raw from '@/data/ai-traits.generated.json'
import type { AiContent, AiTraits } from '@/types/ai-content'
import type { Locale } from '@/types/game'

const traits = raw as AiTraits

/**
 * 추천 카드용 성향 한 줄.
 *
 * 상세용 파일과 달리 번들에 들어간다 — 결과 카드가 최대 10장이라
 * 파일을 열 장 받는 대신 106종을 미리 싣는다. 한 줄씩이라 부담이 없다.
 */
export function getAiTrait(id: number, locale: Locale): string | undefined {
  return traits[String(id)]?.[locale]
}

/** 생성이 얼마나 됐는지. 스크립트와 테스트가 본다 */
export function aiTraitCount(): number {
  return Object.keys(traits).length
}

/**
 * 브롤러 상세용 전체 생성물. 상세 패널을 열 때 한 장만 받는다.
 *
 * **없으면 null 이고 던지지 않는다.** 생성이 절반만 됐거나 아예 없어도
 * 화면은 섹션만 빼고 그대로 동작해야 한다 (설계서 2-8).
 */
export async function fetchAiContent(locale: Locale, id: number): Promise<AiContent | null> {
  try {
    const res = await fetch(`/data/ai/${locale}/${id}.json`)
    if (!res.ok) return null
    return (await res.json()) as AiContent
  } catch {
    return null
  }
}
