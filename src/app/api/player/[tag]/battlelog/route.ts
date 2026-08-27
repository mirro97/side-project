import { NextResponse } from 'next/server'
import { getPlayerBattlelogApi } from '@/lib/bs/api'
import { isValidTag } from '@/lib/bs/client'
import { BsError } from '@/lib/bs/errors'

/** 개인 데이터이고 전투마다 바뀐다. 캐시하지 않는다 */
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params
  const decoded = decodeURIComponent(tag)

  // 잘못된 태그로 외부 API 를 때리지 않는다
  if (!isValidTag(decoded)) {
    return NextResponse.json({ ok: false, kind: 'BadRequest' }, { status: 400 })
  }

  try {
    const { items } = await getPlayerBattlelogApi(decoded)
    // 파싱은 클라이언트가 parseBattle 로 한다. 여기서는 모양만 좁힌다
    return NextResponse.json({ ok: true, data: { items } })
  } catch (e) {
    const kind = e instanceof BsError ? e.kind : 'Unknown'
    const status = e instanceof BsError ? e.status : 500
    if (kind === 'Forbidden') console.error('[api/battlelog] Forbidden — 키 또는 IP 확인 필요')
    return NextResponse.json({ ok: false, kind }, { status })
  }
}
