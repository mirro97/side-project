import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from './prompt'
import { getBrawlers } from '@/lib/game-data'
import type { Vector } from '@/lib/recommend'

const ALL = getBrawlers()
const NAMES = ALL.map(b => b.name.en)

describe('buildSystemPrompt', () => {
  it('실재하는 브롤러 이름을 전부 넣는다', () => {
    // 없는 브롤러를 지어내는 걸 막는 유일한 근거다
    const p = buildSystemPrompt({ locale: 'ko', brawlerNames: NAMES })
    for (const n of [NAMES[0], NAMES[50], NAMES[NAMES.length - 1]]) {
      expect(p).toContain(n)
    }
    expect(p).toMatch(/never mention or invent/i)
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
