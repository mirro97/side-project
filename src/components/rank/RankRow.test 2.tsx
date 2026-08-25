import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { RankRow } from './RankRow'
import messages from '../../../messages/en.json'

function wrap(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

describe('RankRow', () => {
  it('플레이어 변형은 이름과 클럽과 트로피를 보여준다', () => {
    wrap(
      <RankRow rank={1} name="VITAL SHARK" trophies={317958}
               iconUrl="x.png" subtitle="Heaven" />,
    )
    expect(screen.getByText('VITAL SHARK')).toBeInTheDocument()
    expect(screen.getByText('Heaven')).toBeInTheDocument()
    expect(screen.getByText('317,958')).toBeInTheDocument()
  })

  it('내 계정이면 라벨을 붙인다', () => {
    wrap(<RankRow rank={1} name="ME" trophies={100} iconUrl="x.png" isMe />)
    expect(screen.getByText(messages.common.myAccount)).toBeInTheDocument()
  })

  it('내 계정이 아니면 라벨이 없다', () => {
    wrap(<RankRow rank={2} name="OTHER" trophies={100} iconUrl="x.png" />)
    expect(screen.queryByText(messages.common.myAccount)).toBeNull()
  })

  it('nameColor 가 있으면 이름에 적용한다', () => {
    wrap(
      <RankRow rank={1} name="C" trophies={1} iconUrl="x.png"
               nameColor="0xffcb5aff" />,
    )
    expect(screen.getByText('C')).toHaveStyle({ color: '#cb5aff' })
  })

  it('클럽 변형은 멤버 수를 보여준다', () => {
    wrap(
      <RankRow rank={1} name="Heaven" trophies={7484545}
               iconUrl="b.png" subtitle="30/30" />,
    )
    expect(screen.getByText('30/30')).toBeInTheDocument()
  })
})
