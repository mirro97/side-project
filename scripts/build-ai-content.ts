/**
 * AI 사전 생성물을 만든다 (설계서 2-8).
 *
 * 결과는 `public/data/ai/{locale}/{id}.json` 과 번들용 색인으로 나가고 **레포에 커밋한다.**
 * DB 대신 파일을 고른 이유가 사람이 읽고 고칠 수 있다는 것이므로, 이 스크립트는
 * `--force` 없이는 기존 파일을 절대 덮지 않는다.
 *
 * **재생성 정책**
 *
 *   전면 재생성   게임 업데이트로 브롤러가 추가됐을 때만. `npm run build:ai`
 *                (이미 있는 종은 건너뛰므로 신규분만 채워진다)
 *   프롬프트 변경  `--force` 로 전면. 문구 기준이 바뀌었으니 전체가 흔들려야 맞다
 *   문구 다듬기    `--id 16000000` 로 그 종만. 전면으로 돌리면 멀쩡한 107종까지
 *                새 문장으로 바뀌고 git 히스토리에 130KB 가 통째로 다시 쌓인다
 *
 * 사용 예
 *   npm run build:ai                    없는 것만
 *   npm run build:ai -- --id 16000000   한 종만
 *   npm run build:ai -- --force         전부 다시
 *   npm run build:ai -- --limit 5       한도가 걱정될 때 나눠서
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { buildContentPrompt, AI_CONTENT_SCHEMA } from './ai-prompt'
import { isEntry, parseContent } from './ai-content-parse'
import { getBrawlers } from '../src/lib/game-data'
import type { AiContentByLocale, AiTraits } from '../src/types/ai-content'
import type { Brawler, Locale } from '../src/types/game'

const LOCALES: Locale[] = ['en', 'ko']
const OUT_DIR = path.join('public', 'data', 'ai')
const TRAITS_FILE = path.join('src', 'data', 'ai-traits.generated.json')

/** 무료 티어의 분당 한도를 넘지 않게. 106종이면 약 7분 걸린다 */
const DELAY_MS = 4_000
/** 429 를 연속으로 이만큼 맞으면 멈춘다. 끝까지 밀면 실패 로그만 106줄 남는다 */
const GIVE_UP_AFTER = 3

/**
 * thinking 모델(3.6-flash 등)은 응답이 안 오거나 매우 느리다 (실측: 120초 무응답).
 * 짧은 글 106편이라 추론이 필요 없고, 가벼운 쪽이 반복 호출에 유리하다.
 */
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-lite'

/** 응답이 안 와도 매달려 있지 않는다. 실제로 5분간 아무 출력 없이 멈춘 적이 있다 */
const TIMEOUT_MS = 90_000
/** 성공·실패를 가리지 않고 이만큼 시도하면 멈춘다. --limit 은 성공만 세서 이걸 못 막는다 */
const MAX_ERRORS = 5
/** 로컬 스텁으로 스크립트 전체를 돌려보기 위해 열어둔다 (BRAWL_STARS_API_BASE 와 같은 이유) */
const BASE = process.env.GEMINI_API_BASE ?? 'https://generativelanguage.googleapis.com/v1beta'

/**
 * `.env.local` 을 직접 읽는다.
 * dotenv 는 선언된 의존성이 아니고, node 의 --env-file 은 tsx 를 거치면 전달이 번거롭다.
 */
async function loadEnvLocal(): Promise<void> {
  let text: string
  try {
    text = await fs.readFile('.env.local', 'utf8')
  } catch {
    return
  }
  for (const line of text.split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line)
    if (!m) continue
    const [, key, rawValue] = m
    if (process.env[key]) continue
    process.env[key] = rawValue.trim().replace(/^["']|["']$/g, '')
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

class QuotaError extends Error {}

async function generate(b: Brawler, key: string): Promise<AiContentByLocale> {
  const res = await fetch(`${BASE}/interactions`, {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      model: MODEL,
      input: buildContentPrompt(b),
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: AI_CONTENT_SCHEMA,
      },
    }),
  })

  if (res.status === 429) throw new QuotaError('429 Too Many Requests')
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`)

  const json = (await res.json()) as {
    steps?: { type?: string; content?: { type?: string; text?: string }[] }[]
  }
  // thought 스텝이 함께 온다. 답은 model_output 뿐이다
  const text = (json.steps ?? [])
    .filter(s => s.type === 'model_output')
    .flatMap(s => s.content ?? [])
    .filter(c => c.type === 'text')
    .map(c => c.text ?? '')
    .join('')
  if (!text) throw new Error('응답이 비어 있습니다')

  const parsed = parseContent(text)
  // 스키마를 줬는데도 모양이 어긋나면 그 브롤러만 건너뛴다. 반쪽짜리를 커밋하지 않는다
  if (!parsed) throw new Error(`형식이 어긋납니다 — ${text.slice(0, 160)}`)
  return parsed
}

function fileFor(locale: Locale, id: number): string {
  return path.join(OUT_DIR, locale, `${id}.json`)
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

/**
 * 트레이트 색인은 **디스크의 파일에서** 다시 만든다.
 * 이번에 생성한 것만 모으면 사람이 손으로 고친 문장이 반영되지 않는다.
 */
async function rebuildTraits(): Promise<number> {
  const out: AiTraits = {}
  for (const b of getBrawlers()) {
    const entry: Partial<Record<Locale, string>> = {}
    for (const locale of LOCALES) {
      try {
        const raw = await fs.readFile(fileFor(locale, b.id), 'utf8')
        const parsed: unknown = JSON.parse(raw)
        if (isEntry(parsed)) entry[locale] = parsed.trait
      } catch {
        /* 없으면 그냥 빠진다 */
      }
    }
    if (entry.en && entry.ko) out[String(b.id)] = { en: entry.en, ko: entry.ko }
  }
  await fs.writeFile(TRAITS_FILE, JSON.stringify(out, null, 2) + '\n')
  return Object.keys(out).length
}

async function main(): Promise<void> {
  await loadEnvLocal()
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    throw new Error(
      'GEMINI_API_KEY 가 없습니다. .env.local 에 GEMINI_API_KEY=... 를 넣거나 환경변수로 주세요',
    )
  }

  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const onlyId = args.includes('--id') ? Number(args[args.indexOf('--id') + 1]) : null
  const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : Infinity

  for (const locale of LOCALES) {
    await fs.mkdir(path.join(OUT_DIR, locale), { recursive: true })
  }

  const targets = getBrawlers().filter(b => onlyId === null || b.id === onlyId)
  if (onlyId !== null && targets.length === 0) throw new Error(`브롤러 ${onlyId} 를 찾지 못했습니다`)

  let made = 0
  let skipped = 0
  let failed = 0
  let quotaStreak = 0

  for (const b of targets) {
    if (made >= limit) break
    // 사람이 고친 파일을 덮지 않는다. 다시 만들려면 --force
    if (!force && (await exists(fileFor('en', b.id))) && (await exists(fileFor('ko', b.id)))) {
      skipped++
      continue
    }

    try {
      const content = await generate(b, key)
      for (const locale of LOCALES) {
        await fs.writeFile(fileFor(locale, b.id), JSON.stringify(content[locale], null, 2) + '\n')
      }
      made++
      quotaStreak = 0
      console.log(`  ✓ ${b.name.en} (${b.id})`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (e instanceof QuotaError) {
        quotaStreak++
        console.warn(`  ! ${b.name.en} — 할당량 (${quotaStreak}/${GIVE_UP_AFTER})`)
        if (quotaStreak >= GIVE_UP_AFTER) {
          console.error('할당량이 계속 막혀 중단합니다. 나중에 다시 실행하면 이어서 만듭니다')
          break
        }
        // 한도는 시간이 지나야 풀린다. 점점 길게 기다린다
        await sleep(DELAY_MS * 2 ** quotaStreak)
        continue
      }
      failed++
      quotaStreak = 0
      console.warn(`  ✗ ${b.name.en} — ${msg}`)
      // 같은 이유로 계속 실패하면 106줄을 쌓지 않고 멈춘다.
      // --limit 은 성공만 세므로 전부 실패하면 끝까지 돈다 (실측: 5분간 무출력)
      if (failed >= MAX_ERRORS) {
        console.error(`오류가 ${failed}건이라 중단합니다. 원인을 고친 뒤 다시 실행하세요`)
        break
      }
    }

    await sleep(DELAY_MS)
  }

  const traitCount = await rebuildTraits()
  console.log(
    `\n생성 ${made} · 건너뜀 ${skipped} · 실패 ${failed}\n` +
      `트레이트 색인 ${traitCount}/${getBrawlers().length}종 → ${TRAITS_FILE}`,
  )
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
