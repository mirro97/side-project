"use client"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import { useMediaQuery } from "@/hooks/useMediaQuery"

/**
 * 데스크톱은 오른쪽 사이드 드로어, 모바일은 바텀시트다.
 *
 * vaul 은 direction 에 따라 transform 으로 위치를 잡으므로
 * CSS 로 방향을 덮을 수 없다. direction 자체를 바꿔야 한다.
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
  const isDesktop = useMediaQuery("(min-width: 768px)")

  return (
    <Drawer
      open={open}
      onOpenChange={o => {
        if (!o) onClose()
      }}
      direction={isDesktop ? "right" : "bottom"}
    >
      <DrawerContent
        className={
          isDesktop
            ? "border-border-subtle bg-bg-elevated h-dvh w-[420px]"
            : "border-border-subtle bg-bg-elevated max-h-[85dvh]"
        }
      >
        <DrawerTitle className="sr-only">{title}</DrawerTitle>
        {/*
          direction="right" 일 때 shadcn 이 드래그 핸들을 hidden 으로 감춘다.
          모바일에서는 핸들의 mt-4 가 상단 여백을 만들어주지만 데스크톱에는 그게 없어
          콘텐츠가 화면 최상단에 붙어 잘린 것처럼 보인다. 직접 여백을 준다.
        */}
        <div className={`overflow-y-auto px-4 pb-8 ${isDesktop ? "pt-6" : "pt-2"}`}>
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
