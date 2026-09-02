import { describe, it, expect } from 'vitest'
import { parseContent, isEntry, stripFence } from './ai-content-parse'

const entry = { howToPlay: '가까이 붙어 싸운다.', gears: '속도 기어를 쓴다.', trait: '근접형.' }
const good = JSON.stringify({ en: entry, ko: entry })

describe('stripFence', () => {
  it('코드펜스를 벗긴다', () => {
    expect(stripFence('```json\n{"a":1}\n```')).toBe('{"a":1}')
    expect(stripFence('```\n{"a":1}\n```')).toBe('{"a":1}')
    expect(stripFence('  {"a":1}  ')).toBe('{"a":1}')
  })
})

describe('parseContent', () => {
  it('정상 응답을 두 로케일로 준다', () => {
    const r = parseContent(good)
    expect(r?.en.howToPlay).toBe(entry.howToPlay)
    expect(r?.ko.trait).toBe(entry.trait)
  })

  it('코드펜스로 감싸 와도 읽는다', () => {
    expect(parseContent('```json\n' + good + '\n```')).not.toBeNull()
  })

  it('JSON 이 아니면 null', () => {
    expect(parseContent('죄송합니다, 답변드릴 수 없습니다')).toBeNull()
  })

  it('한쪽 로케일만 오면 null', () => {
    // 색인이 어긋나느니 그 브롤러를 통째로 건너뛴다
    expect(parseContent(JSON.stringify({ en: entry }))).toBeNull()
  })

  it('필드가 비면 null', () => {
    const empty = { ...entry, gears: '   ' }
    expect(parseContent(JSON.stringify({ en: entry, ko: empty }))).toBeNull()
  })

  it('필드가 문자열이 아니면 null', () => {
    expect(parseContent(JSON.stringify({ en: entry, ko: { ...entry, trait: 3 } }))).toBeNull()
  })
})

describe('isEntry', () => {
  it('세 필드가 전부 있어야 통과한다', () => {
    expect(isEntry(entry)).toBe(true)
    expect(isEntry({ howToPlay: 'a', gears: 'b' })).toBe(false)
    expect(isEntry(null)).toBe(false)
  })
})
