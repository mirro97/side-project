'use client'
import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useMainAccount } from '@/hooks/useMainAccount'
import { usePlayer } from '@/hooks/usePlayer'
import { getBrawlers } from '@/lib/game-data'
import { loadSettings, saveSettings } from '@/lib/storage'
import {
  QUESTIONS,
  accountVector,
  axisBand,
  blend,
  dominantAxis,
  recommend,
  type Axis,
  type Vector,
} from '@/lib/recommend'
import { SurveyForm } from './SurveyForm'
import { ResultList } from './ResultList'
import type { Locale } from '@/types/game'

/** 저장된 축 값에서 어떤 선택지를 골랐는지 되찾는다 */
function keysOf(survey: Vector | null): Partial<Record<Axis, string>> {
  if (!survey) return {}
  const out: Partial<Record<Axis, string>> = {}
  for (const q of QUESTIONS) {
    const hit = q.options.find(o => o.value === survey[q.axis])
    if (hit) out[q.axis] = hit.key
  }
  return out
}

/**
 * 설문 답도 대표 계정도 로컬스토리지에 있어 서버는 모른다.
 * 페이지는 정적 셸만 그리고 계산은 전부 여기서 한다 —
 * 브롤러 106종 벡터는 번들에 있어 네트워크가 필요 없다.
 */
export function RecommendView({ locale }: { locale: Locale }) {
  const t = useTranslations('recommend')
  const { mainAccountTag, settings } = useMainAccount()
  const [draft, setDraft] = useState<Partial<Vector> | null>(null)
  const [retaking, setRetaking] = useState(false)

  // 홈·랭킹과 같은 키라 react-query 가 요청을 합친다
  const { player } = usePlayer(mainAccountTag)

  const saved = settings.survey
  const answers = draft ?? saved
  const complete = answers !== null && QUESTIONS.every(q => typeof answers[q.axis] === 'number')

  const all = useMemo(() => getBrawlers(), [])

  const result = useMemo(() => {
    if (!complete) return null
    const q = answers as Vector
    const p = player ? accountVector(player.brawlers, all) : null
    const target = blend(q, p)
    const trophies = player
      ? new Map(player.brawlers.map(b => [b.id, b.trophies] as const))
      : null
    return { target, usedAccount: Boolean(p), ...recommend(target, all, trophies) }
  }, [complete, answers, player, all])

  const pick = (axis: Axis, _key: string, value: number) => {
    const next = { ...(answers ?? {}), [axis]: value } as Partial<Vector>
    setDraft(next)
    // 4개가 다 차면 저장한다. 부분 저장은 다음 방문에 되살릴 수 없다
    if (QUESTIONS.every(q => typeof next[q.axis] === 'number')) {
      saveSettings({ ...loadSettings(), survey: next as Vector })
      setRetaking(false)
    }
  }

  const showSurvey = !complete || retaking

  return (
    <div className="flex flex-col gap-4 px-3 py-4">
      <div>
        <h1 className="text-[17px] font-bold">{t('title')}</h1>
        <p className="text-text-tertiary mt-1 text-[11px]">
          {showSurvey ? t('intro') : result?.usedAccount ? t('usingAccount') : t('noAccount')}
        </p>
      </div>

      {showSurvey ? (
        <SurveyForm answers={keysOf((answers as Vector) ?? null)} onPick={pick} />
      ) : (
        result && (
          <>
            {/* 사용자 성향은 브롤러가 바뀌어도 같다. 목록 위에 한 번만 쓴다 */}
            <p className="border-border-subtle bg-bg-surface rounded-card text-text-secondary border px-3 py-2.5 text-[12px]">
              {t(
                `band.${dominantAxis(result.target)}.${axisBand(
                  result.target[dominantAxis(result.target)],
                )}`,
              )}
            </p>
            <ResultList title={t('groupSingle')} items={result.single} locale={locale} />
            <ResultList title={t('groupFamiliar')} items={result.familiar} locale={locale} />
            <ResultList title={t('groupFresh')} items={result.fresh} locale={locale} />
            <button
              onClick={() => setRetaking(true)}
              className="border-border-strong text-text-secondary rounded-card w-full border py-2.5 text-[12px] font-semibold"
            >
              {t('retake')}
            </button>
          </>
        )
      )}
    </div>
  )
}
