const KEY = 'bc.settings'

export interface Settings {
  version: 1
  mainAccountTag: string | null
  favoriteTags: string[]
  survey: { range: number; durability: number; mobility: number; risk: number } | null
  byokKey: string | null
}

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  mainAccountTag: null,
  favoriteTags: [],
  survey: null,
  byokKey: null,
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
