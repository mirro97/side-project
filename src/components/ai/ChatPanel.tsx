'use client'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useByok } from '@/hooks/useByok'
import { callChat, supportsSearch } from '@/lib/ai/providers'
import { buildSystemPrompt } from '@/lib/ai/prompt'
import { getBrawlers } from '@/lib/game-data'
import { toEventViews } from '@/lib/events'
import { KeySetup } from './KeySetup'
import type { ChatMessage } from '@/lib/ai/types'
import type { EventSlot } from '@/types/api'
import type { Brawler, Locale } from '@/types/game'

interface Turn extends ChatMessage {
  /** 실패한 응답은 말풍선 대신 경고로 그린다 */
  error?: boolean
  /** Gemini 검색 그라운딩이 준 검색 추천 위젯 HTML */
  searchWidget?: string
  /** 검색 할당량이 막혀 검색 없이 답한 경우 */
  searchSkipped?: boolean
}

interface EventsResult {
  ok: boolean
  data?: EventSlot[]
}

/** 로테이션은 30분마다 바뀐다. 채팅 여닫을 때마다 다시 받을 이유가 없다 */
const EVENTS_STALE_MS = 30 * 60_000

async function fetchEvents(): Promise<EventsResult> {
  const res = await fetch('/api/events')
  return (await res.json()) as EventsResult
}

/**
 * 이 이상 오래된 대화는 보내지 않는다.
 * 매 요청이 전체 히스토리를 다시 실어 보내므로 토큰이 계속 커진다 — 요금은 사용자 몫이다.
 */
const MAX_SENT_TURNS = 12

export function ChatPanel({
  locale,
  focus,
  searchBlocked,
  onSearchBlocked,
}: {
  locale: Locale
  focus: Brawler | null
  /** 검색 그라운딩이 이미 막힌 것으로 확인됐는가 */
  searchBlocked: boolean
  onSearchBlocked: () => void
}) {
  const t = useTranslations('ai')
  const { byok, survey, setByok } = useByok()
  // 이벤트 페이지와 같은 라우트를 쓴다. 실패해도 채팅은 그대로 동작한다
  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: fetchEvents,
    staleTime: EVENTS_STALE_MS,
  })
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

  // 지원하더라도 이미 막힌 게 확인됐으면 없는 것으로 친다
  const searchAvailable = supportsSearch(byok.provider) && !searchBlocked

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    const next: Turn[] = [...turns, { role: 'user', text }]
    setTurns(next)
    setInput('')
    setBusy(true)

    const system = buildSystemPrompt({
      locale,
      brawlerNames: getBrawlers().map(b => b.name),
      focus,
      survey,
      // 보내는 시점에 만료된 슬롯을 걸러낸다
      events: events?.ok && events.data ? toEventViews(events.data) : null,
      // 막힌 걸 알면서 "검색할 수 있다"고 하면 모델이 찾아본 척 답한다
      hasSearch: searchAvailable,
    })
    // 브라우저가 직접 부른다. 키는 우리 서버를 지나가지 않는다
    const res = await callChat(
      byok.provider,
      byok.key,
      byok.model,
      system,
      next.slice(-MAX_SENT_TURNS).map(({ role, text: body }) => ({ role, text: body })),
      { search: searchAvailable },
    )
    if (res.searchSkipped) onSearchBlocked()
    if (!alive.current) return
    setBusy(false)
    setTurns([
      ...next,
      {
        role: 'assistant',
        text: res.text,
        error: !res.ok,
        searchWidget: res.searchWidget,
        searchSkipped: res.searchSkipped,
      },
    ])
  }

  return (
    // DetailPanel 이 이미 스크롤 컨테이너라 여기서 또 h-full 로 스크롤을 만들지 않는다.
    // 중첩되면 모바일 바텀시트에서 입력창이 화면 밖으로 밀린다
    <div className="flex flex-col gap-3">
      <div className="text-text-tertiary flex items-center justify-between gap-2 text-[11px]">
        {/* 상태는 전부 왼쪽 한 줄로 모은다. justify-between 에 항목이 셋이면
            가운데 것이 붕 떠서 [키 변경] 과 경쟁한다 */}
        <span className="flex min-w-0 items-center gap-1">
          <span className="truncate">
            {byok.provider} · {byok.model}
            {focus && ` · ${focus.name[locale]}`}
          </span>
          {searchAvailable && (
            // 누를 수 있는 것이 아니므로 칩으로 만들지 않는다. 색만 살짝 준다.
            // 막힌 뒤에도 띄워두면 "검색된 답"이라는 거짓 신호가 된다
            <span className="text-brand-hover shrink-0">· {t('webSearch')}</span>
          )}
        </span>
        <button
          onClick={() => setEditingKey(true)}
          /* 상태 줄에 섞여 있어 글자만으로는 눌리는 것인지 안 보였다.
             테두리로 영역을 주고 hover 에서 반응하게 한다 */
          className="border-border-strong text-text-secondary hover:border-brand hover:text-brand-hover rounded-chip shrink-0 cursor-pointer border px-2 py-0.5 font-semibold transition-colors"
        >
          {t('changeKey')}
        </button>
      </div>

      {turns.length === 0 ? (
        <p className="shimmer shimmer-color-brand-hover shimmer-spread-200 text-text-tertiary text-[12px] leading-relaxed">
          {focus ? t('emptyWithFocus', { name: focus.name[locale] }) : t('empty')}
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {turns.map((m, i) => (
            <div key={i}>
              <div
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
              {m.searchSkipped && (
                // 최신인 줄 알고 읽으면 안 되므로 조용히 넘어가지 않는다
                <p className="text-text-tertiary mt-1 mr-8 text-[10px]">{t('searchSkipped')}</p>
              )}
              {m.searchWidget && (
                /* Google 이 준 HTML·CSS 를 그대로 그린다. 검색 추천 표시는 그라운딩 ToS 의무다.
                   출처는 HTTPS 로 받은 provider 응답이고 <script> 는 React 가 실행하지 않는다 */
                <div
                  className="mt-1.5 mr-8 overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: m.searchWidget }}
                />
              )}
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
