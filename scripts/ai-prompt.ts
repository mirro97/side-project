import type { Brawler } from '../src/types/game'

/**
 * 받을 모양. `generationConfig.responseFormat.text.schema` 로 들어간다.
 *
 * ko·en 을 한 응답에 받는 이유는 **두 언어가 같은 내용을 말한다는 보장** 때문이다.
 * 따로 부르면 한글은 부쉬 기습을 쓰고 영어는 다른 전략을 쓰는 일이 생긴다.
 */
export const AI_CONTENT_SCHEMA = {
  type: 'object',
  properties: {
    en: { $ref: '#/$defs/entry' },
    ko: { $ref: '#/$defs/entry' },
  },
  required: ['en', 'ko'],
  $defs: {
    entry: {
      type: 'object',
      properties: {
        howToPlay: { type: 'string' },
        gears: { type: 'string' },
        trait: { type: 'string' },
      },
      required: ['howToPlay', 'gears', 'trait'],
    },
  },
} as const

/**
 * 이름은 **두 언어를 함께** 준다.
 *
 * 영문만 주면 한글 본문에서 모델이 알아서 옮긴다 — 실제로 기어를 "DAMAGE 기어" 로,
 * 가젯을 "스피드 로더" 로 썼다. 우리 데이터의 이름(피해 · 쾌속 장전기)과 어긋나면
 * 화면의 능력 목록과 본문이 서로 다른 이름을 부르게 된다.
 */
function abilityLines(b: Brawler): string[] {
  const rows = [
    ...b.starPowers.map(a => ['Star Power', a] as const),
    ...b.gadgets.map(a => ['Gadget', a] as const),
  ]
  return rows.map(([kind, a]) => {
    const desc = a.description?.en
    return `- ${kind} "${a.name.en}" (Korean: "${a.name.ko}")${
      desc ? `: ${desc}` : ' (no description available)'
    }`
  })
}

/**
 * 브롤러 하나의 사전 생성물을 받는 프롬프트.
 *
 * 채팅 프롬프트와 같은 원칙이다 — **준 데이터 밖을 지어내지 않는다.**
 * 여기서는 더 강하게 걸어야 한다. 생성물은 파일로 굳어 오래 남고,
 * 틀린 기어 이름이 들어가면 사람이 106종을 다 읽기 전까지 안 드러난다.
 */
export function buildContentPrompt(b: Brawler): string {
  const gearNames = b.gears.map(g => `${g.name.en} (Korean: "${g.name.ko}")`)
  return [
    'You write short reference blurbs for a Brawl Stars companion app.',
    `Subject: ${b.name.en} (Korean name: ${b.name.ko}).`,
    '',
    'Facts you may use — do not go beyond them:',
    `- Role: ${b.role ?? 'unknown'}`,
    `- Rarity: ${b.rarity.name}`,
    `- Health ${b.stats.hp} · Speed ${b.stats.speed} · Range ${b.stats.range ?? 'unknown'}`,
    // 게임이 직접 쓴 문구다. 한국어뿐이라(영문 로케일이 없다) 그대로 싣고 번역은 모델이 한다
    ...(b.shortDesc ? [`- The game's own one-line summary (Korean): ${b.shortDesc}`] : []),
    ...(b.attackDesc ? [`- Basic attack (Korean): ${b.attackDesc}`] : []),
    ...(b.superDesc ? [`- Super (Korean): ${b.superDesc}`] : []),
    ...abilityLines(b),
    gearNames.length
      ? `- Gears this brawler can equip: ${gearNames.join(', ')}`
      : '- No gear data available for this brawler.',
    '',
    'Write three things, each in BOTH English and Korean:',
    '1. howToPlay — how to play this brawler. Two or three sentences.',
    '2. gears — which of the listed gears to pick and why. Name only gears from the list above.',
    '3. trait — one sentence on what kind of player this brawler suits.',
    '',
    'Rules:',
    '- Never invent a gear, star power, gadget, or number that is not listed above.',
    // 공격·특수 공격은 8종에 설명이 없다. 그 자리를 모델 기억으로 채우면 검증할 방법이 없다
    '- If no basic attack or Super is listed above, do not describe what the attack or Super does. Write about the star powers, gadgets, gears, and stats instead.',
    '- Do not mention other brawlers by name.',
    '- For "trait", describe the brawler, not a specific person. Never say "you".',
    '- The Korean and English versions must say the same thing, not two different takes.',
    '- In Korean text use the Korean names given above, exactly. Never transliterate an English name and never leave a gear or ability name in English.',
    '- Plain sentences. No markdown, no headings, no bullet characters.',
  ].join('\n')
}
