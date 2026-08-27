export const PROVIDERS = ['gemini', 'openai', 'anthropic'] as const
export type Provider = (typeof PROVIDERS)[number]

export interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

/** 저장되는 BYOK 설정. 키는 사용자 브라우저 밖으로 나가지 않는다 */
export interface ByokConfig {
  provider: Provider
  model: string
  key: string
}

export interface Call {
  url: string
  init: RequestInit
}

/**
 * provider 세 곳의 차이는 요청 조립과 응답 파싱뿐이다. 그것만 감싼다.
 * 호출 자체는 브라우저가 직접 한다 — 우리 서버를 거치지 않아야 키가 안 샌다.
 */
export interface Adapter {
  /** 모델 목록. 실패하면 사용자가 직접 입력한다 */
  listModels(key: string): Call
  parseModels(json: unknown): string[]
  chat(key: string, model: string, system: string, messages: ChatMessage[]): Call
  parseChat(json: unknown): string
}
