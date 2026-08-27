import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const nextConfig: NextConfig = {
  compiler: {
    /**
     * 프로덕션 번들에서 console 을 걷어낸다.
     *
     * 브롤러 상세를 열 때 찍던 조사용 로그가 배포본까지 따라갔다.
     * 지우는 대신 설정으로 막는 이유는 **남겨야 할 로그가 따로 있기 때문**이다 —
     * 라우트 핸들러의 Forbidden(키·IP 운영 이슈), 배틀로그 파서의 미지 구조 경고,
     * AI 검색 할당량 경고는 운영 중에 봐야 한다. 그래서 error·warn 만 남긴다.
     */
    removeConsole: { exclude: ['error', 'warn'] },
  },
}

export default createNextIntlPlugin()(nextConfig)
