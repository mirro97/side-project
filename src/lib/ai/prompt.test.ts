import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from './prompt'
import { getBrawlers } from '@/lib/game-data'
import type { Vector } from '@/lib/recommend'
import type { EventView } from '@/lib/events'

const ALL = getBrawlers()
const NAMES = ALL.map(b => b.name)

describe('buildSystemPrompt', () => {
  it('실재하는 브롤러 이름을 전부 넣는다', () => {
    // 없는 브롤러를 지어내는 걸 막는 유일한 근거다
    const p = buildSystemPrompt({ locale: 'ko', brawlerNames: NAMES })
    for (const n of [NAMES[0], NAMES[50], NAMES[NAMES.length - 1]]) {
      expect(p).toContain(n.en)
    }
    expect(p).toMatch(/never mention or invent/i)
  })

  it('한국어 UI 에는 현지명을 함께 넣는다', () => {
    // "쉘리 어때?" 를 알아들으려면 매핑이 프롬프트에 있어야 한다.
    // 영문 이름만 주면 모델의 기억에 기대게 되고 신규 브롤러일수록 그게 없다
    const p = buildSystemPrompt({ locale: 'ko', brawlerNames: NAMES })
    expect(p).toContain('Shelly (쉘리)')
  })

  it('영어 UI 에는 영문 이름만 넣는다', () => {
    const p = buildSystemPrompt({ locale: 'en', brawlerNames: NAMES })
    expect(p).toContain('Shelly')
    expect(p).not.toContain('쉘리')
  })

  it('현지명이 아직 없는 브롤러는 이름을 두 번 쓰지 않는다', () => {
    const p = buildSystemPrompt({
      locale: 'ko',
      brawlerNames: [{ en: 'Newbie', ko: 'Newbie' }],
    })
    expect(p).toContain('Newbie')
    expect(p).not.toContain('Newbie (Newbie)')
  })

  it('밝은 말투와 팩트 고수를 함께 지시한다', () => {
    // 둘은 부딪히기 쉬워서 "톤이 사실을 굽히지 않는다"고 관계까지 못 박아야 한다
    const p = buildSystemPrompt({ locale: 'ko', brawlerNames: NAMES })
    expect(p).toMatch(/upbeat and encouraging/i)
    expect(p).toMatch(/warmth never bends a fact/i)
    expect(p).toMatch(/never agree just to please/i)
  })

  it('마크다운을 쓰지 말라고 못 박는다', () => {
    // 본문을 평문으로 그리므로 **굵게** 나 ### 가 글자 그대로 보인다
    const p = buildSystemPrompt({ locale: 'ko', brawlerNames: NAMES })
    expect(p).toMatch(/never use markdown/i)
    expect(p).toMatch(/plain conversational text/i)
  })

  it('답변 언어를 locale 로 고정한다', () => {
    expect(buildSystemPrompt({ locale: 'ko', brawlerNames: NAMES })).toContain('Korean')
    expect(buildSystemPrompt({ locale: 'en', brawlerNames: NAMES })).toContain('English')
  })

  it('보고 있는 브롤러가 없으면 상세를 붙이지 않는다', () => {
    const p = buildSystemPrompt({ locale: 'ko', brawlerNames: NAMES })
    expect(p).not.toMatch(/currently looking at/i)
  })

  it('보고 있는 브롤러의 실제 수치를 넣는다', () => {
    const shelly = ALL.find(b => b.name.en === 'Shelly') as (typeof ALL)[number]
    const p = buildSystemPrompt({ locale: 'ko', brawlerNames: NAMES, focus: shelly })
    expect(p).toContain('Shelly')
    expect(p).toContain(String(shelly.stats.hp))
    // 능력 이름도 함께 들어가야 "얘 스타파워 뭐야" 에 답할 수 있다
    expect(p).toContain(shelly.starPowers[0].name.en)
  })

  it('설명이 없는 능력도 이름은 넣는다', () => {
    const noDesc = ALL.find(b => b.starPowers.some(a => !a.description))
    if (!noDesc) return
    const p = buildSystemPrompt({ locale: 'ko', brawlerNames: NAMES, focus: noDesc })
    expect(p).toContain(noDesc.starPowers[0].name.en)
  })

  it('검색을 쓸 수 있을 때만 검색 지시를 붙인다', () => {
    const off = buildSystemPrompt({ locale: 'ko', brawlerNames: NAMES })
    expect(off).not.toMatch(/you can search the web/i)

    const on = buildSystemPrompt({ locale: 'ko', brawlerNames: NAMES, hasSearch: true })
    expect(on).toMatch(/you can search the web/i)
    // 도구만 켜두면 안다고 생각하는 질문은 그냥 답한다. 낡았다고 말해줘야 찾는다
    expect(on).toMatch(/out of date/i)
  })

  it('진행 중인 로테이션을 모드·맵·남은 시간으로 넣는다', () => {
    // 검색 없이도 확실한 "지금" 정보다
    // 실행 사이에 1ms 만 지나도 분이 29 로 떨어진다. 자릿수만 본다
    const end = new Date(Date.now() + 2 * 3_600_000 + 30 * 60_000)
    const events: EventView[] = [
      {
        slotId: 1,
        modeId: 5,
        modeKey: 'brawlBall',
        modeIconUrl: null,
        mapName: 'Beach Ball',
        mapImageUrl: '',
        end,
        modifiers: [],
      },
    ]
    const p = buildSystemPrompt({ locale: 'ko', brawlerNames: NAMES, events })
    expect(p).toContain('브롤 볼 — Beach Ball')
    expect(p).toMatch(/2h \d+m left/)
  })

  it('로테이션이 없으면 블록이 없다', () => {
    const p = buildSystemPrompt({ locale: 'ko', brawlerNames: NAMES, events: [] })
    expect(p).not.toMatch(/live in the rotation/i)
  })

  it('설문이 없으면 성향 블록이 없다', () => {
    const p = buildSystemPrompt({ locale: 'ko', brawlerNames: NAMES })
    expect(p).not.toMatch(/play-style survey/i)
  })

  it('설문이 있으면 축별 구간을 넣는다', () => {
    const survey: Vector = { range: 0.95, durability: 0.1, mobility: 0.5, risk: 0.05 }
    const p = buildSystemPrompt({ locale: 'ko', brawlerNames: NAMES, survey })
    expect(p).toMatch(/attack range: high/)
    expect(p).toMatch(/durability: low/)
    expect(p).toMatch(/mobility: mid/)
  })

  it('게임 주제로 유도하되 거부하지는 않는다', () => {
    const p = buildSystemPrompt({ locale: 'ko', brawlerNames: NAMES })
    expect(p).toMatch(/steer back/i)
    expect(p).not.toMatch(/refuse|decline/i)
  })
})
