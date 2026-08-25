import { describe, it, expect, beforeEach } from 'vitest'
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from './storage'

beforeEach(() => localStorage.clear())

describe('설정 저장소', () => {
  it('비어 있으면 기본값을 준다', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })
  it('저장한 값을 그대로 읽는다', () => {
    saveSettings({ ...DEFAULT_SETTINGS, mainAccountTag: '#2VUL0L00R' })
    expect(loadSettings().mainAccountTag).toBe('#2VUL0L00R')
  })
  it('버전이 다르면 기본값으로 리셋한다', () => {
    localStorage.setItem('bc.settings', JSON.stringify({ version: 99, mainAccountTag: '#X' }))
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })
  it('깨진 JSON이면 기본값을 준다', () => {
    localStorage.setItem('bc.settings', '{{{')
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })
  it('저장하면 변경 이벤트를 쏜다', () => {
    let fired = 0
    window.addEventListener('bc:settings', () => { fired++ })
    saveSettings({ ...DEFAULT_SETTINGS, mainAccountTag: '#A' })
    expect(fired).toBe(1)
  })
})
