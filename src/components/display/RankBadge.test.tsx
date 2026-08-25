import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RankBadge } from './RankBadge'

describe('RankBadge', () => {
  it('1~3위는 메달 색 배경을 갖는다', () => {
    render(<RankBadge rank={1} />)
    expect(screen.getByText('1').className).toContain('bg-rank-1')
  })
  it('4위 이상은 배경이 없다', () => {
    render(<RankBadge rank={4} />)
    expect(screen.getByText('4').className).not.toContain('bg-rank')
  })
  it('세 자리 순위도 폭이 고정된 클래스를 쓴다', () => {
    render(<RankBadge rank={200} />)
    expect(screen.getByText('200').className).toContain('w-7')
  })
})
