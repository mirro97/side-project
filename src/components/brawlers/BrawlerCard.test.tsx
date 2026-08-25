import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrawlerCard } from './BrawlerCard'
import { getBrawler } from '@/lib/game-data'

const shelly = getBrawler(16000000)!

describe('BrawlerCard', () => {
  it('로케일에 맞는 이름을 보여준다', () => {
    render(<BrawlerCard brawler={shelly} locale="ko" onSelect={() => {}} />)
    expect(screen.getByText('쉘리')).toBeInTheDocument()
  })

  it('진행도가 있으면 파워와 트로피를 얹는다', () => {
    render(
      <BrawlerCard brawler={shelly} locale="en" onSelect={() => {}}
                   progress={{ power: 11, trophies: 743 }} />,
    )
    expect(screen.getByText('P11')).toBeInTheDocument()
    expect(screen.getByText('743')).toBeInTheDocument()
  })

  it('대표 계정이 없으면 진행도도 흐림도 없다', () => {
    const { container } = render(<BrawlerCard brawler={shelly} locale="en" onSelect={() => {}} />)
    expect(screen.queryByText(/^P\d+$/)).toBeNull()
    expect(container.firstChild).not.toHaveClass('opacity-30')
  })

  it('미보유면 흐리게 처리한다', () => {
    const { container } = render(
      <BrawlerCard brawler={shelly} locale="en" onSelect={() => {}} locked />,
    )
    expect(container.firstChild).toHaveClass('opacity-30')
  })
})
