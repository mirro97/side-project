import { NextResponse } from 'next/server'
import { getEventsRotationApi } from '@/lib/bs/api'
import { BsError } from '@/lib/bs/errors'

/** 슬롯이 전부 만료됐을 때 클라이언트가 다시 부른다. 상류는 30분 캐시를 탄다 */
export async function GET() {
  try {
    return NextResponse.json({ ok: true, data: await getEventsRotationApi() })
  } catch (e) {
    const kind = e instanceof BsError ? e.kind : 'Unknown'
    const status = e instanceof BsError ? e.status : 500
    if (kind === 'Forbidden') console.error('[api/events] Forbidden — 키 또는 IP 확인 필요')
    return NextResponse.json({ ok: false, kind }, { status })
  }
}
