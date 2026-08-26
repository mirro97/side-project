import { axisBand, AXES, type Vector } from '@/lib/recommend'
import type { Brawler, Locale } from '@/types/game'

const LANGUAGE: Record<Locale, string> = {
  ko: 'Korean',
  en: 'English',
}

/** 성향 축을 프롬프트에 넣을 짧은 영문 라벨로 */
const AXIS_LABEL: Record<(typeof AXES)[number], string> = {
  range: 'attack range',
  durability: 'durability',
  mobility: 'mobility',
  risk: 'risk-taking',
}

export interface PromptContext {
  locale: Locale
  /** 존재하는 브롤러 전부. 없는 브롤러를 지어내는 걸 막는 근거다 */
  brawlerNames: string[]
  /** 지금 화면에서 보고 있는 브롤러 */
  focus?: Brawler | null
  /** 설문 결과 */
  survey?: Vector | null
}

/**
 * 시스템 프롬프트를 조립한다.
 *
 * BYOK 라 한도 폭주와 인젝션 걱정은 줄었지만, **없는 브롤러를 지어내는 문제는 그대로다.**
 * 그래서 실재하는 이름 전부를 넣고 그 밖을 언급하지 말라고 못 박는다.
 *
 * 106종 상세를 매번 넣으면 토큰이 아깝다. 이름만 항상 넣고,
 * 화면에서 보고 있는 브롤러가 있을 때만 그 하나의 상세를 붙인다.
 */
export function buildSystemPrompt(ctx: PromptContext): string {
  const parts: string[] = [
    'You are a helpful assistant for a Brawl Stars companion app.',
    `Answer in ${LANGUAGE[ctx.locale]}.`,
    'Focus on Brawl Stars: brawlers, builds, gears, game modes, and matchups.',
    'If the user asks about something else, answer briefly and steer back to the game.',
    '',
    'These are the ONLY brawlers that exist in the game right now:',
    ctx.brawlerNames.join(', '),
    'Never mention or invent a brawler outside this list.',
    'If you are unsure about a number or a mechanic, say so instead of guessing.',
  ]

  if (ctx.focus) parts.push('', focusBlock(ctx.focus, ctx.locale))
  if (ctx.survey) parts.push('', surveyBlock(ctx.survey))

  return parts.join('\n')
}

/** 화면에서 보고 있는 브롤러의 실제 수치. 추측 대신 이걸 쓰게 한다 */
function focusBlock(b: Brawler, locale: Locale): string {
  const lines = [
    `The user is currently looking at ${b.name.en} (${b.name[locale]}).`,
    `Role: ${b.role ?? 'unknown'} · Rarity: ${b.rarity.name}`,
    `Health ${b.stats.hp} · Speed ${b.stats.speed} · Range ${b.stats.range ?? 'unknown'}`,
  ]
  const abilities = [
    ...b.starPowers.map(a => ['Star Power', a] as const),
    ...b.gadgets.map(a => ['Gadget', a] as const),
  ]
  for (const [kind, a] of abilities) {
    const desc = a.description?.[locale]
    lines.push(`${kind} — ${a.name.en}${desc ? `: ${desc}` : ''}`)
  }
  // 기어는 설명이 없고 수치만 있다
  if (b.gears.length) {
    lines.push(`Available gears: ${b.gears.map(g => g.name.en).join(', ')}`)
  }
  return lines.join('\n')
}

/** 설문 성향. 있으면 답을 개인화할 근거가 된다 */
function surveyBlock(v: Vector): string {
  const traits = AXES.map(a => `${AXIS_LABEL[a]}: ${axisBand(v[a])}`).join(', ')
  return [
    'The user answered a play-style survey. Their preferences (low/mid/high):',
    traits,
    'Take this into account when recommending brawlers, but do not repeat it back verbatim.',
  ].join('\n')
}
