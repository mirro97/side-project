"use client"
import { useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import { useMediaQuery } from "@/hooks/useMediaQuery"

/**
 * 데스크톱은 가운데 모달, 모바일은 바텀시트다.
 *
 * vaul Drawer 는 방향(top/bottom/left/right)만 지원해서 CSS 로는 "가운데 모달"을
 * 만들 수 없다. 방향을 바꾸는 대신 데스크톱은 Dialog(radix), 모바일은 기존
 * Drawer 로 컴포넌트 자체를 나눈다.
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

  // Dialog 와 Drawer 는 서로 다른 컴포넌트 트리라 isDesktop 이 바뀔 때마다 그대로
  // 반영하면 렌더 중에 통째로 언마운트/리마운트된다 — 패널이 열려있는 도중에
  // 창 크기를 데스크톱↔모바일 경계로 넘기면 스크롤 위치·전환 애니메이션이 날아간다.
  // open 이 바뀌는(닫힘→열림, 열림→닫힘) 그 순간의 isDesktop 값으로 고정하고,
  // 열려있는 동안 리사이즈해도 바뀌지 않게 한다. (React 공식 "prop 변화에 따른
  // state 조정" 패턴 — effect 없이 렌더 중에 처리해 깜빡임도 없다)
  const [prevOpen, setPrevOpen] = useState(open)
  const [renderAsDesktop, setRenderAsDesktop] = useState(isDesktop)
  if (open !== prevOpen) {
    setPrevOpen(open)
    setRenderAsDesktop(isDesktop)
  }

  const handleOpenChange = (o: boolean) => {
    if (!o) onClose()
  }

  if (renderAsDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="border-border-subtle bg-bg-elevated w-[480px] max-w-[calc(100%-2rem)] gap-0 p-0">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <div className="overflow-y-auto px-4 pt-6 pb-8">{children}</div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="border-border-subtle bg-bg-elevated max-h-[85dvh]">
        <DrawerTitle className="sr-only">{title}</DrawerTitle>
        <div className="overflow-y-auto px-4 pt-2 pb-8">{children}</div>
      </DrawerContent>
    </Drawer>
  )
}
