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
