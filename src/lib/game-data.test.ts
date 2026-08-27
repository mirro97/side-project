import { describe, it, expect } from 'vitest'
import {
  getBrawlers,
  getBrawler,
  getMode,
  getModeByKey,
  searchBrawlers,
  getRanges,
} from './game-data'

describe('게임 데이터 로더', () => {
  it('브롤러를 100종 이상 읽는다', () => {
    expect(getBrawlers().length).toBeGreaterThan(100)
  })

  it('ID로 한 종을 찾는다', () => {
    expect(getBrawler(16000000)?.name.en).toBe('Shelly')
  })

  it('없는 ID면 undefined 를 준다', () => {
    expect(getBrawler(99999999)).toBeUndefined()
  })

  it('사거리 정규화 범위가 6~30 이다', () => {
    // AutoAttackRange 를 잘못 읽으면 12~20 이 나온다
    expect(getRanges().range).toEqual([6, 30])
  })

  it('체력·이동속도 범위도 실측값과 맞는다', () => {
    expect(getRanges().hp).toEqual([2000, 6800])
    expect(getRanges().speed).toEqual([540, 820])
  })

  it('영문명으로 검색한다', () => {
    expect(searchBrawlers('shel').map(b => b.name.en)).toContain('Shelly')
  })

  it('현재 언어와 무관하게 한글명으로도 검색된다', () => {
    expect(searchBrawlers('쉘리').map(b => b.name.en)).toContain('Shelly')
  })

  it('빈 검색어는 전체를 준다', () => {
    expect(searchBrawlers('  ').length).toBe(getBrawlers().length)
  })

  it('modeId 로 게임모드를 찾고 imageId 에 오프셋이 붙는다', () => {
    expect(getMode(5)?.imageId).toBe(48000005)
    expect(getMode(0)?.imageId).toBe(48000000)
  })

  it('배틀로그의 API 키로도 같은 모드를 찾는다', () => {
    // 배틀로그는 modeId 대신 mode 문자열을 준다. 이 연결이 끊기면 전투 목록의
    // 모드명이 전부 폴백(영문 키)으로 떨어진다
    expect(getModeByKey('brawlBall')?.modeId).toBe(5)
    expect(getModeByKey('soloShowdown')?.modeId).toBe(6)
    expect(getModeByKey('없는모드')).toBeUndefined()
  })

  it('희귀도 색상이 전부 올바른 hex 다', () => {
    const bad = getBrawlers().filter(b => !/^#[0-9a-fA-F]{6}$/.test(b.rarity.color))
    expect(bad.map(b => b.name.en)).toEqual([])
  })

  it('벡터가 0~1 범위를 벗어나지 않는다', () => {
    for (const b of getBrawlers()) {
      for (const v of Object.values(b.vector)) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      }
    }
  })
})
