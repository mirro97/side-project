'use client'
import { useCallback, useEffect, useState } from 'react'
import { loadSettings, saveSettings, DEFAULT_SETTINGS, type Settings } from '@/lib/storage'
import type { ByokConfig } from '@/lib/ai/types'

/**
 * 서버는 로컬스토리지를 모르므로 DEFAULT_SETTINGS 로 시작한다.
 * 바로 loadSettings() 로 시작하면 하이드레이션 불일치가 난다 (useMainAccount 와 같은 이유).
 */
export function useByok() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

  useEffect(() => {
    const sync = () => setSettings(loadSettings())
    sync()
    window.addEventListener('bc:settings', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('bc:settings', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const setByok = useCallback((byok: ByokConfig | null) => {
    const next = { ...loadSettings(), byok }
    saveSettings(next)
    setSettings(next)
  }, [])

  return { byok: settings.byok, survey: settings.survey, setByok }
}
