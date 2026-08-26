import type { ByokConfig } from './ai/types'

const KEY = 'bc.settings'

export interface Settings {
  version: 1
  mainAccountTag: string | null
  favoriteTags: string[]
  survey: { range: number; durability: number; mobility: number; risk: number } | null
  /**
   * 사용자 자기 AI 키. 브라우저 밖으로 나가지 않는다 — 우리 서버로도 보내지 않는다.
   * 같은 오리진의 스크립트는 읽을 수 있으므로 입력 화면에 그 사실을 함께 알린다.
   */
  byok: ByokConfig | null
}

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  mainAccountTag: null,
  favoriteTags: [],
  survey: null,
  byok: null,
}

export function loadSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<Settings>
    // 로컬 데이터라 마이그레이션하지 않고 리셋한다
    if (parsed.version !== 1) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...parsed, version: 1 }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(s: Settings): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(s))
  // 같은 탭의 다른 컴포넌트에 알린다. storage 이벤트는 다른 탭에서만 발생한다
  window.dispatchEvent(new CustomEvent('bc:settings'))
}
