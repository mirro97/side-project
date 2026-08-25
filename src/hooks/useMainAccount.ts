'use client'
import { useCallback, useEffect, useState } from 'react'
import { loadSettings, saveSettings, DEFAULT_SETTINGS, type Settings } from '@/lib/storage'

/**
 * 서버는 로컬스토리지를 모르므로 DEFAULT_SETTINGS 로 시작한다.
 * 바로 loadSettings() 로 시작하면 하이드레이션 불일치가 난다.
 */
export function useMainAccount() {
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

  const setMainAccount = useCallback((tag: string | null) => {
    const next = { ...loadSettings(), mainAccountTag: tag }
    saveSettings(next)
    setSettings(next)
  }, [])

  return { mainAccountTag: settings.mainAccountTag, settings, setMainAccount }
}
