export type Locale = 'en' | 'ko'
export type LocalizedText = Record<Locale, string>

export type RoleKey =
  | 'damage' | 'tank' | 'assassin' | 'support'
  | 'controller' | 'marksman' | 'artillery'

export interface Ability {
  id: number
  name: LocalizedText
  /**
   * 게임 원본 설명에는 <!card.accessory.skill...> 같은 플레이스홀더가 섞여 있고
   * 대부분은 게임 엔진 없이는 값을 알 수 없다. 치환하지 못한 설명은 null 이다.
   */
  description: LocalizedText | null
}

/** 기어는 수치 효과를 따로 들고 있다 (예: 속도 +15%) */
export interface Gear extends Ability {
  modifier: { value: number; type: string } | null
}

export interface Brawler {
  id: number
  name: LocalizedText
  description: LocalizedText
  /** 역할 데이터가 없는 브롤러가 23종이다 */
  role: RoleKey | null
  rarity: { id: number; name: string; color: string }
  /** range 는 skills.CastingRange 다. characters.AutoAttackRange 가 아니다 */
  stats: { hp: number; speed: number; range: number | null }
  /**
   * 게임이 직접 쓴 기본 공격·특수 공격 설명과 한 줄 역할 요약.
   *
   * **한국어뿐이다.** BrawlAPI 에도 영문 로케일 엔드포인트에도 이 문구가 없다.
   * AI 사전 생성물의 근거로 쓰는 게 주 목적이고, 화면에는 있을 때만 그린다.
   * 초기 브롤러 8종은 로케일에 키 자체가 없어 null 이다.
   */
  attackDesc: string | null
  superDesc: string | null
  shortDesc: string | null
  vector: { range: number; durability: number; mobility: number; risk: number }
  images: { portrait: string; emoji: string }
  starPowers: Ability[]
  gadgets: Ability[]
  gears: Gear[]
}

export interface GameMode {
  /** 공식 API 의 event.modeId */
  modeId: number
  /** 48000000 + modeId — CDN 경로용 */
  imageId: number
  name: LocalizedText
  /** 'gemGrab' 등 원본 문자열. 표시용이 아니다 */
  apiKey: string
}

export interface GameData {
  version: string
  brawlers: Brawler[]
  modes: GameMode[]
  /** 정규화 기준. StatBar 눈금과 공유한다 */
  ranges: {
    hp: [number, number]
    speed: [number, number]
    range: [number, number]
  }
}
