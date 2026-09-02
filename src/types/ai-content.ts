import type { Locale } from './game'

/**
 * 브롤러 하나에 대한 AI 사전 생성물.
 *
 * 설계서 2-8 의 세 종류다. 실시간 호출 없이 정적 파일로 받는다 —
 * **사람이 읽고 고칠 수 있다**는 게 DB 대비 이점이라 형식을 단순하게 둔다.
 */
export interface AiContent {
  /** 브롤러 사용법. 2~3문장 */
  howToPlay: string
  /** 추천 기어와 이유. 우리 데이터에 있는 기어만 언급한다 */
  gears: string
  /** 어떤 성향의 사람에게 맞는지 한 줄. 특정 사용자를 언급하지 않는다 */
  trait: string
}

/** 생성 스크립트가 브롤러 하나에서 한 번에 받는 것 */
export type AiContentByLocale = Record<Locale, AiContent>

/** 추천 화면용. 성향 한 줄만 모아 번들에 넣는다 */
export type AiTraits = Record<string, Record<Locale, string>>
