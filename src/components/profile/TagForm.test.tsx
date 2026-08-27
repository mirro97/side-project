import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { TagForm } from './TagForm'
import messages from '../../../messages/en.json'

function wrap(onSubmit: (tag: string) => void, defaultValue = '') {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <TagForm defaultValue={defaultValue} onSubmit={onSubmit} />
    </NextIntlClientProvider>,
  )
}

function submit(value: string) {
  const input = screen.getByLabelText(messages.profile.tagPlaceholder)
  fireEvent.change(input, { target: { value } })
  fireEvent.click(screen.getByRole('button', { name: messages.profile.lookup }))
  return input
}

describe('TagForm', () => {
  it('태그를 정규화해서 넘긴다', () => {
    const onSubmit = vi.fn()
    wrap(onSubmit)
    submit('  2gpp2p0p ')
    expect(onSubmit).toHaveBeenCalledWith('#2GPP2P0P')
  })

  it('태그에 없는 문자면 조회하지 않고 그 자리에서 알린다', () => {
    // 잘못된 태그로 외부 API 를 때리지 않는 것이 이 폼의 존재 이유다
    const onSubmit = vi.fn()
    wrap(onSubmit)
    const input = submit('#ABC')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(messages.profile.invalidTag)
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('고치기 시작하면 경고를 지운다', () => {
    const onSubmit = vi.fn()
    wrap(onSubmit)
    const input = submit('#ABC')
    fireEvent.change(input, { target: { value: '#2G' } })
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
