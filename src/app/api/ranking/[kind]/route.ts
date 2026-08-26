import { NextResponse } from 'next/server'
import { getRankingsClubsApi, getRankingsPlayersApi } from '@/lib/bs/api'
import { BsError } from '@/lib/bs/errors'
import { PAGE_SIZE, isRankingKind, normalizeCountry } from '@/lib/ranking'

export async function GET(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params
  const q = new URL(req.url).searchParams

  // 잘못된 값으로 외부 API 를 때리지 않는다.
  // 공식 API 는 없는 국가 코드에도 200 에 빈 목록을 주기 때문에,
  // 여기서 막아야 사용자에게 "데이터 없음"이 아니라 원인을 말해줄 수 있다
  if (!isRankingKind(kind)) {
    return NextResponse.json({ ok: false, kind: 'BadRequest' }, { status: 400 })
  }
  const country = normalizeCountry(q.get('country') ?? 'global')
  if (!country) {
    return NextResponse.json({ ok: false, kind: 'BadRequest' }, { status: 400 })
  }

  // 커서는 불투명 토큰이다. 해석하거나 다시 만들면 400 이 난다
  const after = q.get('after') ?? undefined

  try {
    const data =
      kind === 'players'
        ? await getRankingsPlayersApi(country, PAGE_SIZE, after)
        : await getRankingsClubsApi(country, PAGE_SIZE, after)
    return NextResponse.json({ ok: true, data })
  } catch (e) {
    const errKind = e instanceof BsError ? e.kind : 'Unknown'
    const status = e instanceof BsError ? e.status : 500
    // 403 은 키·IP 문제라 운영 이슈다
    if (errKind === 'Forbidden') console.error('[api/ranking] Forbidden — 키 또는 IP 확인 필요')
    return NextResponse.json({ ok: false, kind: errKind }, { status })
  }
}
