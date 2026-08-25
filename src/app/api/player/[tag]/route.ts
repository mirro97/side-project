import { NextResponse } from 'next/server'
import { getPlayerApi } from '@/lib/bs/api'
import { isValidTag } from '@/lib/bs/client'
import { BsError } from '@/lib/bs/errors'

/** 대표 계정마다 다르므로 캐시하지 않는다 */
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params
  const decoded = decodeURIComponent(tag)

  // 잘못된 태그로 외부 API 를 때리지 않는다
  if (!isValidTag(decoded)) {
    return NextResponse.json({ ok: false, kind: 'BadRequest' }, { status: 400 })
  }

  try {
    return NextResponse.json({ ok: true, data: await getPlayerApi(decoded) })
  } catch (e) {
    const kind = e instanceof BsError ? e.kind : 'Unknown'
    const status = e instanceof BsError ? e.status : 500
    // 403 은 키·IP 문제라 운영 이슈다. 사용자에게는 종류만 알린다
    if (kind === 'Forbidden') console.error('[api/player] Forbidden — 키 또는 IP 확인 필요')
    return NextResponse.json({ ok: false, kind }, { status })
  }
}
