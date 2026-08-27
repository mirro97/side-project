import { axisBand, AXES, type Vector } from '@/lib/recommend'
import { modeLabel } from '@/lib/game-data'
import { formatRemaining } from '@/lib/format'
import type { EventView } from '@/lib/events'
import type { Brawler, Locale, LocalizedText } from '@/types/game'

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
  brawlerNames: LocalizedText[]
  /** 지금 화면에서 보고 있는 브롤러 */
  focus?: Brawler | null
  /** 설문 결과 */
  survey?: Vector | null
  /** 지금 돌아가는 로테이션. 공식 API 가 주는 유일한 "지금" 정보다 */
  events?: EventView[] | null
  /** provider 가 웹검색을 지원하는가. 지원할 때만 쓰라고 알린다 */
  hasSearch?: boolean
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
    ...TONE,
    '',
    ...STYLE,
    '',
    ...nameSection(ctx.brawlerNames, ctx.locale),
    'Never mention or invent a brawler outside this list.',
    'If you are unsure about a number or a mechanic, say so instead of guessing.',
  ]

  if (ctx.hasSearch) parts.push('', ...SEARCH)
  if (ctx.events?.length) parts.push('', eventsBlock(ctx.events, ctx.locale))
  if (ctx.focus) parts.push('', focusBlock(ctx.focus, ctx.locale))
  if (ctx.survey) parts.push('', surveyBlock(ctx.survey))

  return parts.join('\n')
}

/**
 * 검색을 쓸 수 있을 때만 붙인다.
 *
 * 도구를 켜두기만 하면 모델이 자기가 안다고 생각하는 질문에는 검색을 건너뛴다.
 * 메타·밸런스는 **모델이 아는 것 자체가 낡았다**는 걸 명시해야 실제로 찾아본다.
 */
const SEARCH: string[] = [
  'You can search the web. The game gets balance changes and new brawlers constantly, so your own knowledge of the current meta is out of date.',
  'Search before answering anything about the current meta, tier lists, recent balance changes, or a brawler being strong or weak right now.',
  'Say when something you found is recent, and do not present a community tier list as official.',
]

/**
 * 말투.
 *
 * 밝은 톤과 팩트 고수는 부딪히기 쉽다 — 상냥하려다 사용자 말에 맞춰주는 쪽으로 흐른다.
 * 그래서 둘을 나란히 두지 않고 **톤이 사실을 굽히지 않는다**고 관계를 명시한다.
 */
const TONE: string[] = [
  'Be upbeat and encouraging. Sound like a friendly teammate, not a manual.',
  'Warmth never bends a fact. If the user pushes back, insists, repeats themselves, or leads you toward a different answer, keep the correct answer and explain why — in the same friendly tone.',
  'Never agree just to please. Politely correcting the user is more helpful than going along with them.',
  'Do not invent facts to fill a gap. "I am not sure" is a valid answer.',
]

/**
 * 답변 형식.
 *
 * 화면이 12px 짜리 좁은 드로어이고 본문을 평문으로 그린다(whitespace-pre-wrap).
 * 마크다운을 그대로 받으면 `**굵게**` 와 `###` 가 글자로 보인다 — 실제로 그렇게 나왔다.
 * 렌더러를 붙이는 대신 형식을 막는 쪽을 골랐다. 문서가 아니라 대화창이라 헤딩 네 개짜리
 * 구조가 들어갈 자리가 아니다.
 *
 * 길이는 굳이 조이지 않는다. 내용의 깊이는 살려두고 형식만 걷어낸다.
 */
const STYLE: string[] = [
  'Write plain conversational text. This is a small chat panel, not a document.',
  'Never use Markdown: no headings, no ** or __ emphasis, no --- rules, no tables, no code fences.',
  'If you need a list, write short lines starting with "- ".',
  'Prefer a few tight paragraphs over a long structured report.',
]

/**
 * 실재하는 이름 목록.
 *
 * 영어가 아닌 UI 에서는 "English (현지명)" 쌍으로 낸다. 한국어 사용자는 "쉘리" 라고 묻는데
 * 영문 이름만 주면 모델이 스스로 매핑해야 하고, **신규 브롤러일수록 그 매핑이 없다.**
 * 106종을 전부 쌍으로 내도 727자 → 1300자라 비용은 사실상 없다 (실측).
 */
function nameSection(names: LocalizedText[], locale: Locale): string[] {
  const localized = locale !== 'en'
  const list = names
    // 현지명이 아직 없는 신규 브롤러는 영문이 그대로 들어와 있다. 같은 걸 두 번 쓰지 않는다
    .map(n => (localized && n[locale] !== n.en ? `${n.en} (${n[locale]})` : n.en))
    .join(', ')
  return [
    localized
      ? 'These are the ONLY brawlers that exist in the game right now, listed as "English name (local name)" — match the user\'s wording against both:'
      : 'These are the ONLY brawlers that exist in the game right now:',
    list,
  ]
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

/**
 * 지금 돌아가는 모드와 맵.
 *
 * 검색 없이도 확실한 "지금" 정보다 — 공식 API 에서 온 것이고 우리가 이미 갖고 있다.
 * 커뮤니티 티어표를 긁어오는 것보다 출처가 분명하다.
 */
function eventsBlock(views: EventView[], locale: Locale): string {
  const lines = views.map(v => {
    const r = formatRemaining(v.end)
    const left = r.ended ? 'ending now' : r.h > 0 ? `${r.h}h ${r.m}m left` : `${r.m}m left`
    return `- ${modeLabel(v.modeKey, locale)} — ${v.mapName} (${left})`
  })
  return [
    'These modes and maps are live in the rotation right now (from the official API):',
    ...lines,
  ].join('\n')
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
