import { describe, it, expect } from 'vitest'
import { formatTrophies } from './format'

describe('formatTrophies', () => {
  it('천 단위 구분자를 넣는다', () => {
    expect(formatTrophies(317958)).toBe('317,958')
  })
  it('0을 그대로 표시한다', () => {
    expect(formatTrophies(0)).toBe('0')
  })
})

import { argbToHex, formatRemaining } from './format'

describe('argbToHex', () => {
  it('ARGB 문자열에서 알파를 떼고 RGB만 남긴다', () => {
    expect(argbToHex('0xffcb5aff')).toBe('#cb5aff')
    expect(argbToHex('0xffffffff')).toBe('#ffffff')
  })
  it('형식이 다르면 null을 준다', () => {
    expect(argbToHex('#cb5aff')).toBeNull()
    expect(argbToHex('')).toBeNull()
  })
})

describe('formatRemaining', () => {
  const now = new Date('2026-08-24T15:00:00Z')
  it('한 시간 이상이면 시간과 분을 준다', () => {
    expect(formatRemaining(new Date('2026-08-24T17:30:00Z'), now)).toEqual({ h: 2, m: 30, ended: false })
  })
  it('한 시간 미만이면 시간이 0이다', () => {
    expect(formatRemaining(new Date('2026-08-24T15:20:00Z'), now)).toEqual({ h: 0, m: 20, ended: false })
  })
  it('지난 시각이면 ended 를 세운다', () => {
    expect(formatRemaining(new Date('2026-08-24T14:00:00Z'), now)).toEqual({ h: 0, m: 0, ended: true })
  })
})

import { stripNameMarkup } from './format'

describe('stripNameMarkup', () => {
  it('게임 내 색상 태그를 벗긴다', () => {
    // 브롤스타즈 이름에 <c3>..</c> 형태의 색상 마크업이 들어온다
    expect(stripNameMarkup('Only<c3>Pro</c>')).toBe('OnlyPro')
    expect(stripNameMarkup('Zero<c9>Win</c>')).toBe('ZeroWin')
    expect(stripNameMarkup('🌴|<c3>HM</c>')).toBe('🌴|HM')
  })
  it('마크업이 없으면 그대로 둔다', () => {
    expect(stripNameMarkup('VITAL SHARK')).toBe('VITAL SHARK')
    expect(stripNameMarkup('『火|Tɪᴇs🥀』')).toBe('『火|Tɪᴇs🥀』')
  })
  it('빈 값도 안전하게 처리한다', () => {
    expect(stripNameMarkup('')).toBe('')
    expect(stripNameMarkup(undefined)).toBe('')
  })
})
