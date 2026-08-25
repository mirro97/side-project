import { describe, it, expect } from 'vitest'
import { filterBrawlers, sortBrawlers, countByRole, countByRarity } from './brawlers'
import { getBrawlers } from './game-data'

const all = getBrawlers()

describe('filterBrawlers', () => {
  it('조건이 없으면 전부 준다', () => {
    expect(filterBrawlers(all, {}).length).toBe(all.length)
  })
  it('영문명으로 검색한다', () => {
    expect(filterBrawlers(all, { query: 'shel' }).map(b => b.name.en)).toContain('Shelly')
  })
  it('현재 언어와 무관하게 한글명으로도 검색된다', () => {
    expect(filterBrawlers(all, { query: '쉘리' }).map(b => b.name.en)).toContain('Shelly')
  })
  it('역할로 거른다', () => {
    const r = filterBrawlers(all, { role: 'tank' })
    expect(r.every(b => b.role === 'tank')).toBe(true)
    expect(r.length).toBeGreaterThan(0)
  })
  it('역할이 없는 브롤러는 역할 필터에 걸리지 않는다', () => {
    expect(all.filter(b => b.role === null).length).toBeGreaterThan(0)
    expect(filterBrawlers(all, { role: 'tank' }).some(b => b.role === null)).toBe(false)
  })
  it('희귀도로 거른다', () => {
    expect(filterBrawlers(all, { rarityId: 5 }).every(b => b.rarity.id === 5)).toBe(true)
  })
  it('검색과 역할을 함께 적용한다', () => {
    expect(filterBrawlers(all, { query: 'a', role: 'tank' }).every(b => b.role === 'tank')).toBe(true)
  })
})

describe('sortBrawlers', () => {
  it('출시순은 id 내림차순이다 — 최신이 먼저', () => {
    const r = sortBrawlers(all, 'released', 'en')
    expect(r[0].id).toBeGreaterThan(r[r.length - 1].id)
  })
  it('이름순은 로케일을 따른다', () => {
    const en = sortBrawlers(all, 'name', 'en')
    const ko = sortBrawlers(all, 'name', 'ko')
    expect(en[0].name.en.localeCompare(en[1].name.en)).toBeLessThanOrEqual(0)
    expect(ko[0].name.ko.localeCompare(ko[1].name.ko, 'ko')).toBeLessThanOrEqual(0)
  })
  it('희귀도순은 높은 등급이 먼저다', () => {
    const r = sortBrawlers(all, 'rarity', 'en')
    expect(r[0].rarity.id).toBeGreaterThanOrEqual(r[r.length - 1].rarity.id)
  })
  it('원본 배열을 바꾸지 않는다', () => {
    const before = all[0].id
    sortBrawlers(all, 'name', 'en')
    expect(all[0].id).toBe(before)
  })
})

describe('개수 집계', () => {
  it('역할별 개수 합이 역할 있는 브롤러 수와 같다', () => {
    const sum = Object.values(countByRole(all)).reduce((a, b) => a + b, 0)
    expect(sum).toBe(all.filter(b => b.role !== null).length)
  })
  it('희귀도별 개수 합은 전체와 같다', () => {
    const sum = Object.values(countByRarity(all)).reduce((a, b) => a + b, 0)
    expect(sum).toBe(all.length)
  })
})
