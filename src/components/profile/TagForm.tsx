'use client'
import { useId, useState } from 'react'
import { useTranslations } from 'next-intl'
import { normalizeTag } from '@/lib/profile'

/**
 * 태그 입력. 검증은 여기서 끝낸다 —
 * 태그 문자 집합에 없는 글자면 API 를 때리지 않고 그 자리에서 알린다.
 */
export function TagForm({
  defaultValue,
  onSubmit,
}: {
  defaultValue: string
  onSubmit: (tag: string) => void
}) {
  const t = useTranslations('profile')
  const errorId = useId()
  const [value, setValue] = useState(defaultValue)
  const [invalid, setInvalid] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const tag = normalizeTag(value)
    if (!tag) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    onSubmit(tag)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={e => {
            setValue(e.target.value)
            // 고치는 중에 빨간 문구가 남아 있으면 방해가 된다
            if (invalid) setInvalid(false)
          }}
          placeholder={t('tagPlaceholder')}
          aria-label={t('tagPlaceholder')}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          className={`border-border-strong bg-bg-surface rounded-card min-w-0 flex-1 border px-3 py-2 text-[13px] outline-none ${
            invalid ? 'border-danger' : 'focus:border-brand'
          }`}
        />
        <button
          type="submit"
          className="bg-brand rounded-card shrink-0 px-4 py-2 text-[12px] font-semibold text-white"
        >
          {t('lookup')}
        </button>
      </div>
      {/* 입력 직후 나타나므로 스크린리더에 바로 읽히게 한다 */}
      {invalid && (
        <p id={errorId} role="alert" className="text-danger text-[11px]">
          {t('invalidTag')}
        </p>
      )}
    </form>
  )
}
