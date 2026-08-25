import { describe, it, expect } from 'vitest'
import en from '../../messages/en.json'
import ko from '../../messages/ko.json'

function flatten(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null
      ? flatten(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  )
}

describe('메시지 파일', () => {
  it('en과 ko의 키 집합이 동일하다', () => {
    expect(flatten(en).sort()).toEqual(flatten(ko).sort())
  })
})
