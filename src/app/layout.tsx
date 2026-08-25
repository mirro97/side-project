import type { Metadata } from 'next'
// 동적 서브셋 CSS. unicode-range 로 필요한 글리프 파일만 내려받는다.
// complete(1.2MB) 대신 split 을 쓰는 이유는 영어 사용자가 라틴 서브셋만 받게 하기 위함이다.
import 'wanted-sans/fonts/webfonts/variable/split/WantedSansVariable.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'Brawl Companion',
  description: 'Brawl Stars companion — profile, brawlers, ranking, events, recommendations',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
