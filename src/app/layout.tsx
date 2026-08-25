import type { Metadata } from 'next'
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
