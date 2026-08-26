'use client'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useByok } from '@/hooks/useByok'
import { callChat } from '@/lib/ai/providers'
import { buildSystemPrompt } from '@/lib/ai/prompt'
import { getBrawlers } from '@/lib/game-data'
import { KeySetup } from './KeySetup'
import type { ChatMessage } from '@/lib/ai/types'
import type { Brawler, Locale } from '@/types/game'

interface Turn extends ChatMessage {
  /** 실패한 응답은 말풍선 대신 경고로 그린다 */
  error?: boolean
}

/**
 * 이 이상 오래된 대화는 보내지 않는다.
 * 매 요청이 전체 히스토리를 다시 실어 보내므로 토큰이 계속 커진다 — 요금은 사용자 몫이다.
 */
const MAX_SENT_TURNS = 12

export function ChatPanel({ locale, focus }: { locale: Locale; focus: Brawler | null }) {
  const t = useTranslations('ai')
  const { byok, survey, setByok } = useByok()
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [editingKey, setEditingKey] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  // 패널을 닫아 언마운트된 뒤에 응답이 와도 상태를 건드리지 않는다
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  // 새 말풍선이 붙은 뒤에 스크롤한다. setTurns 직후에 부르면 아직 그려지지 않았다
  useEffect(() => {
    if (turns.length) endRef.current?.scrollIntoView({ block: 'end' })
  }, [turns.length])

  if (!byok || editingKey) {
    return (
      <KeySetup
        current={byok}
        onSave={c => {
          setByok(c)
          setEditingKey(false)
        }}
        onCancel={byok ? () => setEditingKey(false) : undefined}
      />
    )
  }

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    const next: Turn[] = [...turns, { role: 'user', text }]
    setTurns(next)
    setInput('')
    setBusy(true)

    const system = buildSystemPrompt({
      locale,
      brawlerNames: getBrawlers().map(b => b.name.en),
      focus,
      survey,
    })
    // 브라우저가 직접 부른다. 키는 우리 서버를 지나가지 않는다
    const res = await callChat(
      byok.provider,
      byok.key,
      byok.model,
      system,
      next.slice(-MAX_SENT_TURNS).map(({ role, text: body }) => ({ role, text: body })),
    )
    if (!alive.current) return
    setBusy(false)
    setTurns([...next, { role: 'assistant', text: res.text, error: !res.ok }])
  }

  return (
    // DetailPanel 이 이미 스크롤 컨테이너라 여기서 또 h-full 로 스크롤을 만들지 않는다.
    // 중첩되면 모바일 바텀시트에서 입력창이 화면 밖으로 밀린다
    <div className="flex flex-col gap-3">
      <div className="text-text-tertiary flex items-center justify-between gap-2 text-[11px]">
        <span className="truncate">
          {byok.provider} · {byok.model}
          {focus && ` · ${focus.name[locale]}`}
        </span>
        <button
          onClick={() => setEditingKey(true)}
          className="text-brand-hover shrink-0 font-semibold"
        >
          {t('changeKey')}
        </button>
      </div>

      {turns.length === 0 ? (
        <p className="text-text-tertiary text-[12px] leading-relaxed">
          {focus ? t('emptyWithFocus', { name: focus.name[locale] }) : t('empty')}
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {turns.map((m, i) => (
            <div
              key={i}
              className={`rounded-card px-3 py-2 text-[12px] leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-brand/15 ml-8'
                  : m.error
                    ? 'border-warning text-warning mr-8 border'
                    : 'bg-bg-surface mr-8'
              }`}
            >
              {m.text}
            </div>
          ))}
          {busy && <div className="text-text-tertiary text-[11px]">{t('thinking')}</div>}
          <div ref={endRef} />
        </div>
      )}

      {/* 스크롤 컨테이너 안이므로 붙박이로 두지 않는다 */}
      <div className="bg-bg-elevated sticky bottom-0 flex gap-2 pt-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            // 한글 입력 중 엔터는 조합 확정이라 전송하면 안 된다
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) void send()
          }}
          placeholder={t('placeholder')}
          aria-label={t('placeholder')}
          className="border-border-strong bg-bg-surface rounded-card min-w-0 flex-1 px-3 py-2 text-[12px] outline-none"
        />
        <button
          onClick={() => void send()}
          disabled={busy || !input.trim()}
          className="bg-brand rounded-card shrink-0 px-3.5 py-2 text-[12px] font-semibold text-white disabled:opacity-40"
        >
          {t('send')}
        </button>
      </div>
    </div>
  )
}
