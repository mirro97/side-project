'use client'
import { useTranslations } from 'next-intl'
import { QUESTIONS, type Axis } from '@/lib/recommend'

/**
 * 4문항을 한 화면에 세로로 놓는다.
 * 단계별 전환은 만들지 않는다 — 4개뿐이라 한눈에 보이는 게 낫고,
 * 다시 할 때 어디를 바꿀지 바로 보인다.
 */
export function SurveyForm({
  answers,
  onPick,
}: {
  answers: Partial<Record<Axis, string>>
  onPick: (axis: Axis, key: string, value: number) => void
}) {
  const t = useTranslations('recommend')

  return (
    <div className="flex flex-col gap-4">
      {QUESTIONS.map(q => (
        <fieldset key={q.axis} className="flex flex-col gap-2">
          <legend className="mb-1.5 text-[13px] font-semibold">{t(`q.${q.axis}.label`)}</legend>
          <div className="flex gap-1.5">
            {q.options.map(o => {
              const active = answers[q.axis] === o.key
              return (
                <button
                  key={o.key}
                  onClick={() => onPick(q.axis, o.key, o.value)}
                  aria-pressed={active}
                  className={`rounded-card flex-1 border px-2 py-2.5 text-[12px] font-semibold transition-colors ${
                    active
                      ? 'border-brand bg-brand/15 text-brand-hover'
                      : 'border-border-subtle bg-bg-surface text-text-secondary'
                  }`}
                >
                  {t(`q.${q.axis}.${o.key}`)}
                </button>
              )
            })}
          </div>
        </fieldset>
      ))}
    </div>
  )
}
