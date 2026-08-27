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

export interface ChatOptions {
  /** 검색 그라운딩을 켤지. 할당량이 소진됐을 때 끄고 다시 부른다 */
  search?: boolean
}

export interface ChatReply {
  text: string
  /**
   * Gemini 검색 그라운딩이 돌려주는 "검색 추천" 위젯 HTML.
   * 이걸 화면에 그리는 것이 그라운딩 ToS 의무라 응답과 함께 들고 다닌다.
   */
  searchWidget?: string
}

/**
 * provider 세 곳의 차이는 요청 조립과 응답 파싱뿐이다. 그것만 감싼다.
 * 호출 자체는 브라우저가 직접 한다 — 우리 서버를 거치지 않아야 키가 안 샌다.
 */
export interface Adapter {
  /** 모델 목록. 실패하면 사용자가 직접 입력한다 */
  listModels(key: string): Call
  parseModels(json: unknown): string[]
  chat(
    key: string,
    model: string,
    system: string,
    messages: ChatMessage[],
    opts?: ChatOptions,
  ): Call
  parseChat(json: unknown): ChatReply
}
