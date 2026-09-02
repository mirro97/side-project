import { describe, it, expect } from 'vitest'
import { buildContentPrompt, AI_CONTENT_SCHEMA } from './ai-prompt'
import { getBrawlers } from '../src/lib/game-data'

const ALL = getBrawlers()
const SHELLY = ALL.find(b => b.name.en === 'Shelly')!

describe('buildContentPrompt', () => {
  it('두 언어 세 종류를 요구한다', () => {
    const p = buildContentPrompt(SHELLY)
    for (const key of ['howToPlay', 'gears', 'trait']) expect(p).toContain(key)
    expect(p).toMatch(/BOTH English and Korean/)
  })

  it('이름과 수치를 사실로 넣는다', () => {
    const p = buildContentPrompt(SHELLY)
    expect(p).toContain('Shelly')
    expect(p).toContain(SHELLY.name.ko)
    expect(p).toContain(String(SHELLY.stats.hp))
  })

  it('장착 가능한 기어 목록을 넣는다', () => {
    // 목록이 없으면 모델이 없는 기어 이름을 지어낸다
    const p = buildContentPrompt(SHELLY)
    expect(p).toContain(SHELLY.gears[0].name.en)
    expect(p).toMatch(/Never invent a gear/)
  })

  it('능력·기어 이름을 두 언어로 준다', () => {
    // 영문만 주면 한글 본문이 "DAMAGE 기어" · "스피드 로더" 처럼 우리 데이터와 어긋난다 (실측)
    const p = buildContentPrompt(SHELLY)
    expect(p).toContain(SHELLY.gears[0].name.ko)
    expect(p).toContain(SHELLY.starPowers[0].name.ko)
    expect(p).toMatch(/use the Korean names given above, exactly/)
  })

  it('설명 없는 능력도 이름은 넣는다', () => {
    const noDesc = ALL.find(b => b.starPowers.some(a => !a.description))
    if (!noDesc) return
    const p = buildContentPrompt(noDesc)
    expect(p).toContain(noDesc.starPowers[0].name.en)
    expect(p).toContain('no description available')
  })

  it('게임이 쓴 공격·특수 공격 설명을 싣는다', () => {
    const withSuper = ALL.find(b => b.superDesc)!
    const p = buildContentPrompt(withSuper)
    expect(p).toContain(withSuper.superDesc!)
    expect(p).toContain(withSuper.shortDesc!)
  })

  it('설명이 없는 브롤러는 공격을 설명하지 말라고 못 박는다', () => {
    // 8종은 로케일에 키가 없다. 비워두면 모델이 자기 기억으로 채운다
    const noAttack = ALL.find(b => !b.attackDesc)
    if (!noAttack) return
    const p = buildContentPrompt(noAttack)
    expect(p).not.toMatch(/Basic attack \(Korean\)/)
    expect(p).toMatch(/do not describe what the attack or Super does/)
  })

  it('성향은 사용자를 지칭하지 않게 못 박는다', () => {
    // 설계서 2-8: 이 브롤러가 어떤 성향의 사람에게 맞는지만 쓰고 특정 사용자를 언급하지 않는다
    expect(buildContentPrompt(SHELLY)).toMatch(/Never say "you"/)
  })

  it('스키마가 두 로케일 × 세 필드를 필수로 잡는다', () => {
    expect(AI_CONTENT_SCHEMA.required).toEqual(['en', 'ko'])
    expect(AI_CONTENT_SCHEMA.$defs.entry.required).toEqual(['howToPlay', 'gears', 'trait'])
  })
})
