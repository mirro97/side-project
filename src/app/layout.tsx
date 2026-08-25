import type { Metadata } from 'next'
// 동적 서브셋 CSS. unicode-range 로 필요한 글리프 파일만 내려받는다.
// complete(1.2MB) 대신 split 을 쓰면 영문 페이지에서 117KB 만 받는다.
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
