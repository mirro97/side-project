import { describe, it, expect } from 'vitest'
import {
  isRankingKind,
  normalizeCountry,
  nextCursorOf,
  toPlayerRow,
  toClubRow,
  sameTag,
} from './ranking'
import type { ClubRankingEntry, RankingEntry } from '@/types/api'

const player: RankingEntry = {
  tag: '#2V0UL0GQV8',
  name: 'VITAL SHARK',
  nameColor: '0xffcb5aff',
  icon: { id: 28000977 },
  trophies: 317958,
  rank: 1,
  club: { name: 'Heaven🍁' },
}

const club: ClubRankingEntry = {
  tag: '#808VR8JGR',
  name: 'Heaven🍁',
  badgeId: 8000055,
  trophies: 7262032,
  rank: 1,
  memberCount: 30,
}

describe('isRankingKind', () => {
  it('두 종류만 통과시킨다', () => {
    expect(isRankingKind('players')).toBe(true)
    expect(isRankingKind('clubs')).toBe(true)
    expect(isRankingKind('brawlers')).toBe(false)
    expect(isRankingKind(null)).toBe(false)
  })
})

describe('normalizeCountry', () => {
  it('대소문자를 가리지 않고 대문자로 맞춘다', () => {
    // API 는 kr 도 받지만 캐시 키가 갈리지 않게 하나로 모은다
    expect(normalizeCountry('kr')).toBe('KR')
    expect(normalizeCountry('KR')).toBe('KR')
  })
  it('global 은 소문자 그대로다', () => {
    expect(normalizeCountry('GLOBAL')).toBe('global')
  })
  it('목록에 없으면 null 이다', () => {
    // API 는 200 에 빈 목록을 주므로 여기서 걸러야 사용자에게 원인을 말할 수 있다
    expect(normalizeCountry('ZZ')).toBeNull()
    expect(normalizeCountry('')).toBeNull()
    expect(normalizeCountry(null)).toBeNull()
  })
})

describe('nextCursorOf', () => {
  it('커서가 있으면 그대로 돌려준다', () => {
    expect(nextCursorOf({ items: [], paging: { cursors: { after: 'eyJwb3MiOjN9' } } })).toBe(
      'eyJwb3MiOjN9',
    )
  })
  it('빈 cursors 는 종료 신호다', () => {
    // 200위 끝에서 실제로 이렇게 온다
    expect(nextCursorOf({ items: [], paging: { cursors: {} } })).toBeUndefined()
  })
  it('paging 이 통째로 없어도 터지지 않는다', () => {
    expect(nextCursorOf({ items: [] } as never)).toBeUndefined()
  })
})

describe('toPlayerRow', () => {
  it('프로필 아이콘 경로와 클럽명을 붙인다', () => {
    const r = toPlayerRow(player)
    expect(r.iconUrl).toBe('https://cdn.brawlify.com/profile-icons/regular/28000977.png')
    expect(r.subtitle).toBe('Heaven🍁')
    expect(r.nameColor).toBe('0xffcb5aff')
  })
  it('클럽이 없으면 부제도 없다', () => {
    expect(toPlayerRow({ ...player, club: undefined }).subtitle).toBeUndefined()
  })
})

describe('toClubRow', () => {
  it('배지 경로와 멤버 수를 붙인다', () => {
    const r = toClubRow(club)
    expect(r.iconUrl).toBe('https://cdn.brawlify.com/club-badges/regular/8000055.png')
    expect(r.subtitle).toBe('30/30')
  })
  it('클럽에는 이름 색상이 없다', () => {
    expect(toClubRow(club).nameColor).toBeUndefined()
  })
})

describe('sameTag', () => {
  it('# 유무와 대소문자를 무시하고 비교한다', () => {
    expect(sameTag('#2V0UL0GQV8', '2v0ul0gqv8')).toBe(true)
    expect(sameTag('2V0UL0GQV8', '#2V0UL0GQV8')).toBe(true)
  })
  it('다른 태그는 구분한다', () => {
    expect(sameTag('#2V0UL0GQV8', '#808VR8JGR')).toBe(false)
  })
  it('한쪽이 비면 false 다', () => {
    expect(sameTag(null, '#2V0UL0GQV8')).toBe(false)
    expect(sameTag('#2V0UL0GQV8', undefined)).toBe(false)
  })
})
