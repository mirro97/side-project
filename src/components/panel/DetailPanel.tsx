'use client'
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer'

/**
 * 데스크톱 사이드 드로어와 모바일 바텀시트를 한 컴포넌트로 처리한다.
 * 열림 상태는 쿼리 파라미터로 표현하므로 여기서는 open/onClose 만 받는다.
 */
export function DetailPanel({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <Drawer
      open={open}
      onOpenChange={o => {
        if (!o) onClose()
      }}
      direction="bottom"
    >
      <DrawerContent className="border-border-subtle bg-bg-elevated max-h-[85dvh] md:left-auto md:right-0 md:h-dvh md:max-h-none md:w-[420px]">
        <DrawerTitle className="sr-only">{title}</DrawerTitle>
        <div className="overflow-y-auto px-4 pb-8">{children}</div>
      </DrawerContent>
    </Drawer>
  )
}
