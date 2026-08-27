'use client'
import { useTranslations } from 'next-intl'
import { standoutAxes, type Scored } from '@/lib/recommend'
import type { Locale } from '@/types/game'

/**
 * 카드 문구는 **브롤러 특성**으로 만든다.
 *
 * 처음에는 사용자 성향 문장을 카드마다 붙였는데, 사용자 성향은 브롤러가 바뀌어도
 * 같으니 다섯 카드에 똑같은 문장이 반복됐다. 사용자 성향은 목록 위에 한 번만 쓰고,
 * 카드에는 그 브롤러가 어떤 브롤러인지를 쓴다.
 *
 * 설계서 5-5 의 사전 생성 문구(636건)는 아직 없다. 벡터에서 뽑을 수 있는 만큼만 쓰고,
 * 생성물이 생기면 이 자리를 대체한다.
 */
function useReason() {
  const tr = useTranslations('recommend')

  return (s: Scored) => {
    const traits = standoutAxes(s.brawler.vector)
    // 명사형 구절이라 어느 언어에서도 그대로 이어 붙는다
    const desc = traits.map(x => tr(`trait.${x.axis}.${x.band}`)).join(' · ')
    const tail = s.axes.length
      ? tr('reason.match', { axis: tr(`axis.${s.axes[0]}`) })
      : tr('reason.none')
    return desc ? `${desc} — ${tail}` : tail
  }
}

export function ResultList({
  title,
  items,
  locale,
}: {
  title: string
  items: Scored[]
  locale: Locale
}) {
  const t = useTranslations('recommend')
  const reasonOf = useReason()

  if (items.length === 0) return null

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[13px] font-bold">{title}</h2>
      {items.map(s => (
        <div
          key={s.brawler.id}
          className="border-border-subtle bg-bg-surface rounded-card flex items-start gap-2.5 border p-2.5"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.brawler.images.portrait}
            alt=""
            width={44}
            height={44}
            className="bg-bg-elevated rounded-chip h-11 w-11 shrink-0 object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[13px] font-bold">{s.brawler.name[locale]}</span>
              {/* 숫자만으로는 변별이 안 된다. 배지가 주 정보다 */}
              {s.axes.map(a => (
                <span
                  key={a}
                  className="bg-brand/20 text-brand-hover shrink-0 rounded-[4px] px-1.5 py-0.5 text-[9px] font-bold"
                >
                  {t('axisMatch', { axis: t(`axis.${a}`) })}
                </span>
              ))}
              <span className="text-text-tertiary ml-auto shrink-0 text-[11px] tabular-nums">
                {Math.round(s.score * 100)}% {t('matchScore')}
              </span>
            </div>
            <p className="text-text-secondary mt-1 text-[11px] leading-relaxed">{reasonOf(s)}</p>
          </div>
        </div>
      ))}
    </section>
  )
}
