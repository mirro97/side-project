# 프로젝트 컨벤션

> 현재 무엇이 만들어졌는지는 [프로젝트 현황](../STATUS.md) 을 본다.

작성일: 2026-08-26
전제: 전역 [프론트엔드 코딩 컨벤션](~/.claude/skills/frontend-conventions) 을 따른다. 이 문서는 **그 위에 얹는 프로젝트 고유 결정**만 담는다.

관련 문서: [설계](2026-08-25-brawl-stars-webapp-design.md) · [디자인 시스템](2026-08-25-design-system.md)

---

## 1. API 계층

### 1-1. 세 층으로 나눈다

호출 경로가 길어서 층을 섞으면 어디서 실패했는지 알 수 없다.

```
  lib/bs/client.ts   전송 계층    bsFetch · 태그 검증 · 인코딩
                                 프록시 URL 과 Bearer 헤더를 여기서만 다룬다

  lib/bs/api.ts      엔드포인트   getRankingsPlayersApi 등 호출 함수
                                 경로 조립과 쿼리스트링만. 가공하지 않는다

  app/api/*/route.ts 응답 계층    캐시 정책 · 부분 실패 · 도메인 에러 변환
                                 클라이언트가 받는 형태를 정한다
```

**`bsFetch` 를 라우트나 컴포넌트에서 직접 부르지 않는다.** 항상 `api.ts` 의 함수를 거친다. 그래야 엔드포인트가 어디서 쓰이는지 한 파일에서 보인다.

### 1-2. 네이밍

전역 컨벤션의 `동사 + 리소스 + Api` 를 따른다. 리소스는 **실제 경로를 그대로** 옮긴다.

```
  GET /rankings/{country}/players    getRankingsPlayersApi
  GET /rankings/{country}/clubs      getRankingsClubsApi
  GET /events/rotation               getEventsRotationApi
  GET /players/{tag}                 getPlayerApi
  GET /brawlers                      getBrawlersApi
```

**쓰지 않는 래퍼는 두지 않는다.** `/players/{tag}/battlelog` 는 전적 축적(v1.5)에서 필요해지면
그때 추가한다. 미리 만들어 두면 "구현됐다"로 오해된다.

경로를 그대로 옮기는 이유는 **API 레퍼런스와 대조하기 쉽기 때문**이다. `fetchPlayerRanking` 같은 이름은 어느 엔드포인트인지 다시 찾아봐야 한다.

전부 named export 다. `api.ts` 하나에 모으고 개별 파일로 쪼개지 않는다.

### 1-3. 타입 위치

```
  types/api.ts    브롤스타즈 API 응답      Player · RankingEntry · EventSlot · Paged<T>
  types/game.ts   빌드타임 생성 데이터      Brawler · GameMode · GameData
```

**두 갈래를 섞지 않는다.** 하나는 런타임에 받는 것이고 하나는 번들에 든 것이다. 이름이 비슷해도 다른 타입이다 (`PlayerBrawler` ≠ `Brawler`).

### 1-4. 라우트 핸들러 응답 형태

클라이언트가 분기할 수 있게 성공·실패를 같은 모양으로 내린다.

```ts
type ApiResult<T> = { ok: true; data: T } | { ok: false; kind: BsErrorKind }
```

HTTP 상태 코드도 함께 맞추되, **클라이언트는 `ok` 필드로 분기한다.** 상태 코드는 캐시·재시도 같은 인프라 동작을 위한 것이다.

### 1-5. 캐시 경계

**한 응답에 공유 데이터와 개인 데이터를 섞지 않는다.** 섞으면 개인 데이터 때문에 전체가 캐시 불가능해진다.

```
  공유 (모든 방문자 동일)   랭킹 · 클럽 · 이벤트 · 브롤러
    → 서버 컴포넌트에서 직접 호출 + revalidate
    → 클라이언트 왕복이 없다

  개인 (대표 계정별)        플레이어
    → 태그가 로컬스토리지에 있어 서버가 모른다
    → 클라이언트가 /api/player/[tag] 를 부른다. dynamic = 'force-dynamic'
```

근거는 실측이다. **프록시 경유 호출의 바닥값이 약 500ms** 라서, 캐시를 잃으면 모든 방문자가 매번 그 비용을 낸다.

### 1-6. 여러 소스를 부를 때

**반드시 `Promise.allSettled` 로 병렬 호출한다.** 순차로 부르면 500ms 씩 쌓인다.

```ts
const [players, clubs, events] = await Promise.allSettled([...])
```

`all` 이 아니라 `allSettled` 인 이유는 **한 조각이 실패해도 나머지 섹션을 보여주기 위해서**다. 홈에서 이벤트 API 가 죽었다고 랭킹까지 안 보이면 안 된다.

---

## 2. 컴포넌트

### 2-1. 배치 규칙

```
  components/shell/     앱 셸. 모든 페이지가 쓴다
  components/display/   순수 표시. props 만 받고 데이터를 모른다
  components/state/     빈 상태 · 에러 · 스켈레톤
  components/panel/     상세 패널 셸
  components/rank/      랭킹 행. 홈과 랭킹 탭이 공유한다
  components/{page}/    해당 페이지 전용
  components/ui/        shadcn 생성물. 직접 수정하지 않는다
```

**두 페이지 이상이 쓰면 페이지 폴더에 두지 않는다.** 처음부터 공유 위치에 만든다. 나중에 옮기면 import 경로가 전부 바뀐다.

`components/ui/` 는 shadcn 이 관리한다. 색을 바꾸고 싶으면 파일을 고치지 말고 `globals.css` 의 alias 를 조정한다.

### 2-2. 서버 · 클라이언트 경계

`'use client'` 를 붙이는 경우는 넷뿐이다.

```
  1. 로컬스토리지를 읽는다          useMainAccount 를 쓰는 컴포넌트
  2. 타이머·인터벌이 있다           CountdownTimer
  3. 사용자 입력 상태를 들고 있다    검색 · 필터 · 설문
  4. next-intl 의 useTranslations 를 클라이언트에서 써야 한다
```

넷째는 함정이 있다. **서버 컴포넌트에서는 `getTranslations` 를, 클라이언트에서는 `useTranslations` 를 쓴다.** 번역이 필요하다는 이유만으로 `'use client'` 를 붙이면 안 된다.

데이터를 가져오는 컴포넌트는 기본적으로 서버 컴포넌트다. 클라이언트에서 fetch 하는 건 **로컬스토리지에 의존하는 개인 데이터뿐**이다.

### 2-3. 반응형이 CSS 로 안 되는 경우가 있다

`vaul` 기반 Drawer 는 `direction` 에 따라 transform 으로 위치를 잡는다. **Tailwind 의 `md:right-0` 같은 클래스로 방향을 덮을 수 없다.** 데스크톱 사이드 드로어와 모바일 바텀시트를 함께 지원하려면 `direction` prop 자체를 화면 폭에 따라 바꿔야 한다.

라이브러리가 인라인 스타일이나 transform 으로 배치를 제어하면 CSS 로 싸우지 말고 **API 를 바꾼다.**

### 2-4. 이미지

**CDN 이미지에 `next/image` 를 쓰지 않는다.** Vercel Hobby 의 이미지 최적화 한도가 월 5,000 변환인데, 브롤러 106종이면 금방 찬다. `cdn.brawlify.com` 은 이미 최적화된 PNG 를 CDN 으로 서빙하므로 최적화가 필요 없다.

```tsx
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={brawler.images.portrait} alt="" width={64} height={64} />
```

`width` 와 `height` 는 반드시 넣는다. 레이아웃 시프트를 막는다.

### 2-5. 게임 데이터 접근

**`game-data.generated.json` 을 직접 import 하지 않는다.** 항상 `lib/game-data.ts` 의 함수를 쓴다.

```ts
getBrawlers()  getBrawler(id)  getMode(modeId)  getRanges()  searchBrawlers(q)
```

이미지 URL 도 직접 조립하지 않는다. 브롤러는 `brawler.images.portrait`, 게임모드는 **`mode.imageId`** 를 쓴다.

**게임모드 이미지에 `modeId` 를 그대로 넣으면 404 다.** `48000000` 오프셋이 붙은 `imageId` 가 따로 있다.

**능력 아이콘(스타파워·가젯·기어)은 `regular` 변형만 쓴다.** `borderless` 는 신규 브롤러 능력에 존재하지 않는다.

**CDN 이미지에는 폴백을 둔다.** 공식 API 가 ID 를 주는 시점과 커뮤니티 CDN 이 이미지를 만드는 시점이 달라서, 게임 업데이트 직후에는 반드시 빠진 이미지가 생긴다. 빈 칸으로 두지 말고 자리를 유지한 채 대체 표시를 넣는다.

### 2-6. 외부 문자열은 그대로 렌더하지 않는다

브롤스타즈 플레이어·클럽 이름에는 게임 내 색상 마크업이 섞여 온다.

```
  Only<c3>Pro</c>      Zero<c9>Win</c>      🌴|<c3>HM</c>
```

**API 가 준 이름을 표시할 때는 항상 `stripNameMarkup()` 을 거친다.** 색을 재현하려면 게임 팔레트와 HTML 삽입이 필요해서 v1 은 태그만 벗긴다.

적용 대상은 `player.name`, `club.name`, 랭킹 항목의 `name` 과 `subtitle` 이다.

### 2-7. 다국어

```
  게임 데이터 이름   brawler.name[locale] · mode.name[locale]
                    빌드 산출물에 en/ko 가 들어 있다

  UI 문구           useTranslations / getTranslations
                    messages/*.json
```

**게임 데이터 이름을 메시지 파일에 넣지 않는다.** 106종이 게임 업데이트마다 바뀐다.

문구를 추가하면 `en.json` 과 `ko.json` 양쪽에 넣는다. 키 일치 테스트가 누락을 잡는다.

---

## 3. 훅

### 3-1. ref 와 state 를 나누는 기준

`useInfiniteList` 를 만들다 실제로 버그를 냈다. **렌더에 쓰이는 값을 ref 에 두면 값이 바뀌어도 UI 가 갱신되지 않는다.**

```
  state   렌더 결과에 반영돼야 하는 값        items · loading · hasMore
  ref     비동기 콜백 안에서만 읽는 제어값     busyRef · cursorRef · doneRef
```

같은 사실을 양쪽에 둬야 할 때가 있다. `doneRef` 는 콜백의 중복 실행을 막고 `hasMore` 는 UI 를 갱신한다. 이건 중복이 아니라 역할이 다른 것이다.

**렌더 중에 ref 를 읽거나 쓰지 않는다.** 최신 값을 ref 에 넣어야 하면 `useEffect` 안에서 한다. ESLint 의 `react-hooks/refs` 가 이걸 잡아준다.

### 3-2. matchMedia 는 useSyncExternalStore 로 구독한다

`useEffect` + `setState` 로 만들면 초기값을 동기 `setState` 로 넣게 돼 캐스케이딩 렌더가 생기고 ESLint 가 막는다. `useSyncExternalStore` 가 이 용도로 만들어졌다.

```ts
useSyncExternalStore(subscribe, () => mq.matches, () => false)
```

세 번째 인자가 서버 스냅샷이다. `false` 를 주면 SSR 은 항상 모바일 레이아웃으로 그려진다.

### 3-3. 의존성에 상태를 넣지 않는다

`useCallback` 의존성에 `loading` 같은 상태를 넣으면 콜백이 매번 새로 생겨 무한 루프가 난다. 중복 실행 가드는 ref 로 만든다.

---

## 4. 에러

### 4-1. 상태 코드를 UI 까지 끌고 가지 않는다

```
  전송 계층   HTTP 상태 코드 → BsError(kind, status)
  UI         kind 로 분기. 숫자를 모른다
```

전용 화면을 갖는 건 둘뿐이다.

```
  Maintenance   게임 점검. 슈퍼셀 업데이트마다 실제로 발생한다
  NotFound      존재하지 않는 태그
  나머지        일반 오류 문구 + 재시도 버튼
```

**`Forbidden` 은 사용자에게 그대로 노출하지 않는다.** 키나 IP 화이트리스트 문제라 운영 이슈다. 서버 로그에만 남기고 사용자에게는 일반 오류로 보여준다.

### 4-2. 모르는 것은 건너뛰되 조용히 넘기지 않는다

게임 업데이트로 새 모드·브롤러가 언제든 추가된다. 파서가 모르는 구조를 만나면 **예외를 던지지 말고 그 항목만 건너뛰고 경고를 남긴다.** 배틀 하나 때문에 목록 전체가 죽으면 안 된다.

빌드 파이프라인도 같다. 한글명이나 역할이 없다고 빌드를 실패시키면 신규 브롤러가 나올 때마다 배포가 막힌다. **폴백 + 경고 로그**가 원칙이다.

---

## 5. 검증

### 5-1. 커밋 전 세 가지

```bash
npx tsc --noEmit && npx eslint . && npm test
```

`eslint` 를 빼먹지 않는다. `useInfiniteList` 의 ref 버그를 타입 검사도 테스트도 못 잡았고 ESLint 만 잡았다.

### 5-2. 픽스처는 실제 응답을 쓴다

손으로 만든 가짜 데이터는 실제 구조를 반영하지 못한다. 조사 과정에서 확보한 실제 응답을 그대로 쓴다.

### 5-3. 외부 데이터의 불변식은 테스트로 고정한다

값이 조용히 바뀌면 기능이 망가지는 지점들이다.

```ts
expect(getRanges().range).toEqual([6, 30])   // [12,20] 이면 사거리 축이 죽은 것
expect(getMode(5)?.imageId).toBe(48000005)   // 오프셋이 빠지면 이미지가 전부 404
```

---

## 6. 이 프로젝트에서 반복해서 틀린 것

같은 실수를 다시 하지 않기 위해 남긴다. 전부 실제로 겪은 것들이다.

**추측한 값을 코드에 넣었다.** TID 오버라이드 4종을 규칙에서 유추해 적었는데 전부 틀렸다. 외부 데이터의 키나 ID 는 **반드시 실제 응답에서 확인**한다.

**falsy 와 nullish 를 구분하지 않았다.** `CastingRange` 가 `0` 으로 오는 브롤러가 있는데 `?? null` 로 걸러 0 이 통과했다. 결측 판정에는 `?? ` 대신 명시적 검사를 쓴다.

**외부 문자열을 그대로 렌더했다.** 클럽명에 `<c3>` 같은 게임 내 색상 마크업이 섞여 오는데 그대로 출력해 태그가 글자로 보였다. **외부에서 온 표시 문자열은 정제 함수를 거친다.**

**한 브롤러로 검증하고 전체가 된다고 봤다.** 쉘리의 능력 아이콘이 뜨길래 경로가 맞다고 판단했는데 신규 브롤러 36개가 404 였다. 기본 정렬이 최신순이라 **사용자가 가장 먼저 보는 것이 가장 깨진 것**이었다. 외부 리소스 경로는 **표본이 아니라 전수로 확인**한다.

**정적 페이지에서 시간을 서버 렌더에 넣었다.** `CountdownTimer` 가 `formatRemaining(end)` 을 렌더 중에 계산했다. 페이지가 정적으로 생성되니 HTML 에는 **빌드 시각** 기준 값이 박히고 클라이언트는 **지금 시각**으로 계산해 하이드레이션이 어긋난다 (프로덕션 홈·이벤트에서 React #418 확인).

**dev 에서는 재현되지 않는다** — 요청마다 렌더하므로 두 시각이 같다. **시간·타임존·로컬스토리지에 의존하는 값은 마운트 후에만 그린다** (`useSyncExternalStore` 로 서버 스냅샷과 클라이언트 스냅샷을 나눈다).

**같은 fetch 를 다섯 파일에 복붙했다.** `/api/player` 를 부르는 `interface PlayerResult` + `fetchPlayer` 가 홈·브롤러×2·랭킹·추천에 똑같이 있었다. 응답 형태가 바뀌면 다섯 곳을 고쳐야 했다. **두 번째로 같은 것을 붙여넣게 되면 훅으로 뺀다** (`usePlayer`).

**클릭 가능한 `div` 를 만들었다.** `RankRow` 에 `onClick` 을 붙이면서 탭으로 도달할 수도 엔터로 누를 수도 없는 행이 됐다. **누를 수 있으면 `button` 으로 낸다.** 같은 목적의 `BrawlerCard` 는 처음부터 `button` 이었는데 여기서만 어긋났다.

**setState 업데이터 안에서 네트워크를 호출했다.** React 는 업데이터를 순수 함수로 보고 StrictMode 에서 두 번 부른다. **부수효과는 effect 로 빼고 중복 실행을 ref 로 잠근다.**

**`useSearchParams` 를 격리했다고 믿고 재보지 않았다.** 랭킹에서 목록을 `useSearchParams` 아래에 두고 Suspense 로 감쌌더니 프리렌더 HTML 의 행이 0개가 됐다. 브롤러에서 같은 실수를 하고 고쳤는데 또 했다. **격리할 수 있는 건 파라미터에 의존하지 않는 부분뿐이다.** URL 상태로 둘지 결정하기 전에 "이 값에 목록이 의존하는가"를 먼저 묻는다. 확인 방법은 빌드 산출물에서 실제 태그를 세는 것이다.

```bash
grep -o '<img[^>]*src="[^"]*프리픽스[^"]*"' .next/server/app/ko/<라우트>.html | wc -l
```

**"소스에 없다"를 소스를 다 보지 않고 결론냈다.** 능력 설명의 치환자를 못 푼다고 단정했는데, BrawlAPI 의 `GET /game` 에 csv_logic 파일 119개 목록이 있었고 그중 필요한 8개를 안 쓰고 있었다. 없다고 말하기 전에 **인덱스가 있는지부터 찾는다.** 쓰고 있는 엔드포인트가 소스의 전부라고 가정하지 않는다.

**조사 교정을 문장 전체에 걸어 멀쩡한 문장을 깼다.** 치환한 수치 뒤의 조사를 고치려고 전역 정규식을 돌렸더니 "갇혀있**는** 동안"의 어미까지 조사로 보고 '은'으로 바꿨다. **텍스트 후처리는 내가 바꾼 자리에만 건다.** 전역 치환은 손대지 않기로 한 부분까지 반드시 건드린다.

**중간 결과를 검증하지 않고 커버리지를 셌다.** 능력 설명이 352/424 확보됐다고 집계했는데, 실제로는 치환자 문법이 두 종류라 한쪽을 정규식이 놓치고 있었다. 화면에 `<VALUE1>` 이 그대로 찍히고 나서야 드러났다. **집계 숫자를 믿기 전에 산출물 샘플을 눈으로 본다.**

**외부 데이터의 원본값을 표시값으로 착각했다.** 카드의 `Value` 를 그대로 넣었더니 "로켓의 수가 2050% 늘어납니다" 가 나왔다. 게임 데이터의 수치는 스케일링을 거쳐 화면에 나온다. **값을 그대로 쓰기 전에 결과가 상식적인지 확인한다.**

**이름이 같으면 의미도 같다고 가정했다.** `AutoAttackRange` 는 사거리가 아니었고, shadcn 의 `--accent` 는 브랜드색이 아니었다. 필드 이름만 보고 쓰지 말고 **값의 분포를 확인**한다.

**클라이언트 훅이 필요한 컴포넌트를 너무 크게 잡았다.** `useSearchParams` 를 그리드와 같은 컴포넌트에 두는 바람에 `BAILOUT_TO_CLIENT_SIDE_RENDERING` 이 걸려 서버 렌더 결과가 빈 화면이 됐다. **정적 렌더링을 깨는 훅은 그것이 실제로 필요한 최소 단위로 격리한다.**

**한 응답에 성격이 다른 데이터를 섞었다.** 공유 데이터와 개인 데이터를 묶으면 캐시가 죽는다. 캐시 수명이 다르면 응답을 나눈다.
