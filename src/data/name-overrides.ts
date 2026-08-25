/**
 * characters 행 키가 TID 규칙에서 벗어나는 브롤러.
 * 일반 규칙은 파스칼 코드명을 SCREAMING_SNAKE 로 바꾸는 것인데,
 * 아래 4종은 언더스코어가 없거나 접미사가 빠진 형태를 쓴다.
 * 게임 원본 로케일에서 한글명을 역으로 찾아 확인한 값이다.
 */
export const TID_OVERRIDES: Record<string, string> = {
  HookDude: 'TID_HOOK',        // 진 — Dude 접미사가 빠진다
  DoorMan: 'TID_DOORMAN',      // 그레이 — 언더스코어 없음
  FishTank: 'TID_FISHTANK',    // 행크
  InsectMan: 'TID_INSECTMAN',  // 안젤로
}

/** 위 오버라이드로도 못 찾을 때 쓰는 한글명 최종 폴백 */
export const NAME_KO_FALLBACK: Record<number, string> = {}
