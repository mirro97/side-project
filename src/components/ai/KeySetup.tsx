'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { callModels } from '@/lib/ai/providers'
import { PROVIDERS, type ByokConfig, type Provider } from '@/lib/ai/types'

const PROVIDER_LABEL: Record<Provider, string> = {
  gemini: 'Google Gemini',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
}

/** 무료 한도가 있는 곳을 먼저 보여준다 */
const KEY_URL: Record<Provider, string> = {
  gemini: 'https://aistudio.google.com/apikey',
  openai: 'https://platform.openai.com/api-keys',
  anthropic: 'https://console.anthropic.com/settings/keys',
}

export function KeySetup({
  current,
  onSave,
  onCancel,
}: {
  current: ByokConfig | null
  onSave: (c: ByokConfig) => void
  onCancel?: () => void
}) {
  const t = useTranslations('ai')
  const [provider, setProvider] = useState<Provider>(current?.provider ?? 'gemini')
  const [key, setKey] = useState(current?.key ?? '')
  const [model, setModel] = useState(current?.model ?? '')
  const [models, setModels] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  /** 모델 이름을 코드에 박지 않는다. 사용자 키로 그 API 에서 받아온다 */
  const fetchModels = async () => {
    if (!key) return
    setLoading(true)
    setFailed(false)
    const list = await callModels(provider, key)
    setLoading(false)
    if (!list || list.length === 0) {
      // 막다른 길이 아니다 — 직접 입력하면 된다
      setFailed(true)
      setModels(null)
      return
    }
    setModels(list)
    if (!model || !list.includes(model)) setModel(list[0])
  }

  const canSave = Boolean(key && model)

  return (
    <div className="flex flex-col gap-3 p-3.5">
      <p className="text-text-secondary text-[12px] leading-relaxed">{t('setupIntro')}</p>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold">{t('provider')}</span>
        <div className="flex gap-1.5">
          {PROVIDERS.map(p => (
            <button
              key={p}
              onClick={() => {
                setProvider(p)
                setModels(null)
                setModel('')
                setFailed(false)
              }}
              aria-pressed={provider === p}
              className={`rounded-card flex-1 border px-2 py-2 text-[11px] font-semibold ${
                provider === p
                  ? 'border-brand bg-brand/15 text-brand-hover'
                  : 'border-border-subtle bg-bg-surface text-text-secondary'
              }`}
            >
              {PROVIDER_LABEL[p]}
            </button>
          ))}
        </div>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold">{t('apiKey')}</span>
        <input
          type="password"
          value={key}
          onChange={e => setKey(e.target.value)}
          placeholder="sk-… / AIza…"
          autoComplete="off"
          spellCheck={false}
          className="border-border-strong bg-bg-surface rounded-card px-3 py-2 text-[12px] outline-none"
        />
        <a
          href={KEY_URL[provider]}
          target="_blank"
          rel="noreferrer noopener"
          className="text-brand-hover text-[11px] underline"
        >
          {t('getKey', { provider: PROVIDER_LABEL[provider] })}
        </a>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold">{t('model')}</span>
        <div className="flex gap-1.5">
          <button
            onClick={() => void fetchModels()}
            disabled={!key || loading}
            className="border-border-strong text-text-secondary rounded-card shrink-0 border px-2.5 py-2 text-[11px] font-semibold disabled:opacity-40"
          >
            {loading ? t('loadingModels') : t('loadModels')}
          </button>
          {models ? (
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              className="border-border-strong bg-bg-surface rounded-card min-w-0 flex-1 px-2 py-2 text-[12px] outline-none"
            >
              {models.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder={t('modelPlaceholder')}
              spellCheck={false}
              className="border-border-strong bg-bg-surface rounded-card min-w-0 flex-1 px-3 py-2 text-[12px] outline-none"
            />
          )}
        </div>
        {failed && <span className="text-warning text-[11px]">{t('modelsFailed')}</span>}
      </label>

      {/* 저장 위치와 위험을 숨기지 않는다 */}
      <p className="border-border-subtle text-text-tertiary rounded-card border border-dashed px-3 py-2 text-[10px] leading-relaxed">
        {t('keyWarning')}
      </p>

      <div className="flex gap-2">
        <button
          onClick={() => onSave({ provider, model, key })}
          disabled={!canSave}
          className="bg-brand rounded-card flex-1 py-2.5 text-[12px] font-semibold text-white disabled:opacity-40"
        >
          {t('save')}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="border-border-strong text-text-secondary rounded-card border px-4 py-2.5 text-[12px] font-semibold"
          >
            {t('cancel')}
          </button>
        )}
      </div>
    </div>
  )
}
