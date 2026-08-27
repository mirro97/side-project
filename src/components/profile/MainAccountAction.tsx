'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useMainAccount } from '@/hooks/useMainAccount'
import { sameTag } from '@/lib/ranking'

/**
 * 대표 계정 지정/해제.
 *
 * 확인 대화라서 DetailPanel(드로어)이 아니라 Dialog 를 쓴다.
 * 해제는 되돌리기 쉬우므로 모달 없이 바로 처리한다.
 */
export function MainAccountAction({ tag }: { tag: string }) {
  const t = useTranslations('profile')
  const { mainAccountTag, setMainAccount } = useMainAccount()
  const [open, setOpen] = useState(false)

  const isMain = sameTag(tag, mainAccountTag)
  // 이미 다른 계정이 지정돼 있으면 덮어쓴다는 걸 먼저 알린다
  const overwriting = Boolean(mainAccountTag) && !isMain

  if (isMain) {
    return (
      <div className="flex items-center gap-2">
        <span className="bg-brand rounded-chip px-2 py-1 text-[11px] font-bold text-white">
          {t('mainBadge')}
        </span>
        <button
          type="button"
          onClick={() => setMainAccount(null)}
          className="border-border-strong text-text-secondary rounded-card border px-3 py-1.5 text-[12px] font-semibold"
        >
          {t('unsetMain')}
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-brand rounded-card px-3 py-1.5 text-[12px] font-semibold text-white"
      >
        {t('setMain')}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('setMainConfirm')}</DialogTitle>
            <DialogDescription>{tag}</DialogDescription>
          </DialogHeader>
          {overwriting && <p className="text-warning px-4 text-[12px]">{t('setMainOverwrite')}</p>}
          <DialogFooter className="flex-row justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="border-border-strong text-text-secondary rounded-card border px-3 py-1.5 text-[12px] font-semibold"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                setMainAccount(tag)
                setOpen(false)
              }}
              className="bg-brand rounded-card px-3 py-1.5 text-[12px] font-semibold text-white"
            >
              {t('confirm')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
