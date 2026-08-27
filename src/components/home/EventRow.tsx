import { CountdownTimer } from '@/components/display/CountdownTimer'

export function EventRow({
  modeName,
  mapName,
  iconUrl,
  end,
}: {
  modeName: string
  mapName: string
  /** 생성 데이터에 없는 신규 모드면 null 이다 */
  iconUrl: string | null
  end: Date
}) {
  return (
    <div className="border-border-subtle flex items-center gap-2.5 border-b px-3 py-2.5 last:border-b-0">
      {iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={iconUrl} alt="" width={26} height={26} className="h-[26px] w-[26px] shrink-0" />
      ) : (
        // 아이콘 ID 를 모르면 자리만 남긴다. 0.png 를 넣으면 404 로 깨진 이미지가 뜬다
        <span className="bg-bg-elevated rounded-chip h-[26px] w-[26px] shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-semibold">{modeName}</div>
        <div className="text-text-tertiary truncate text-[11px]">{mapName}</div>
      </div>
      <CountdownTimer end={end} />
    </div>
  )
}
