import { NextResponse } from 'next/server'
import { bsFetch } from '@/lib/bs/client'
import { BsError } from '@/lib/bs/errors'
import { parseBrawlTime } from '@/lib/bs/parse'
import { getBrawlers, getRanges } from '@/lib/game-data'
import type { EventSlot } from '@/types/api'

export const dynamic = 'force-dynamic'

/**
 * 배포 진단용. 프록시 경유 호출이 실제로 통하는지 확인한다.
 * 공식 API 키는 IP 화이트리스트가 걸려 있어 이 경로가 v1 의 유일한 외부 의존이다.
 */
export async function GET() {
  const started = Date.now()
  const gameData = {
    brawlers: getBrawlers().length,
    ranges: getRanges(),
  }

  try {
    // 로테이션은 2KB 남짓이라 진단용으로 가볍다
    const rotation = await bsFetch<EventSlot[]>('/events/rotation')
    const first = rotation[0]
    return NextResponse.json({
      ok: true,
      proxy: { reachable: true, latencyMs: Date.now() - started, slots: rotation.length },
      sample: first
        ? {
            mode: first.event.mode,
            map: first.event.map,
            // 변형 ISO 파서가 서버에서도 도는지 확인
            endsAt: parseBrawlTime(first.endTime)?.toISOString() ?? null,
          }
        : null,
      gameData,
      region: process.env.VERCEL_REGION ?? 'local',
    })
  } catch (e) {
    const kind = e instanceof BsError ? e.kind : 'Unknown'
    const status = e instanceof BsError ? e.status : 0
    return NextResponse.json(
      {
        ok: false,
        proxy: { reachable: false, latencyMs: Date.now() - started, kind, status },
        gameData,
        region: process.env.VERCEL_REGION ?? 'local',
        // Forbidden 이면 키 또는 IP 화이트리스트 문제다
        hint:
          kind === 'Forbidden'
            ? 'BRAWL_STARS_TOKEN 이 없거나 프록시 IP(45.79.218.79)가 키에 등록되지 않았다'
            : undefined,
      },
      { status: 503 },
    )
  }
}
