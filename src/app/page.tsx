'use client'
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'

export default function Page() {
  return (
    <main className="p-10">
      <h1 className="text-2xl font-bold">Brawl Companion</h1>
      <p className="text-text-secondary">317,958</p>
      <div className="rounded-card bg-bg-surface mt-4 p-4 text-trophy">토큰 확인</div>
      <pre className="mt-4 text-xl">{'317,958\n111,111'}</pre>
      <Drawer>
        <DrawerTrigger className="bg-brand rounded-card mt-6 px-4 py-2 font-semibold">패널 열기</DrawerTrigger>
        <DrawerContent>
          <DrawerTitle className="sr-only">색상 확인</DrawerTitle>
          <div className="p-6">패널 배경이 bg-elevated 인지 확인</div>
        </DrawerContent>
      </Drawer>
    </main>
  )
}
