# 브롤러 페이지 이슈 수정 + UI 업그레이드 플랜

## 배경

`feat/brawler` 브랜치에서 브롤러 탐색 페이지의 버그 6건을 수정하고, 상세 패널에 재미 요소(글리치 이펙트)를 더해 전반적인 UI 완성도를 올린다.

## 범위

- `src/components/brawlers/BrawlerBrowser.tsx`
- `src/components/brawlers/BrawlerCard.tsx`
- `src/components/brawlers/FilterChips.tsx`
- `src/components/brawlers/BrawlerDetail.tsx`
- `src/components/panel/DetailPanel.tsx`
- `src/components/ui/dialog.tsx` (신규)
- `messages/ko.json`, `messages/en.json`
- `package.json` (`react-powerglitch` 추가)

`src/lib/brawlers.ts`는 이미 `filterBrawlers({ rarityId })`, `countByRarity`가 구현·테스트돼 있어 수정 없이 그대로 쓴다.

## 작업 항목

**✅ 1. 검색/필터/정렬 밀림 버그 수정 + 30개씩 로딩 제거**
  - 원인: `applyFilter`가 `setState` 직후 동기적으로 `reset()`을 호출해, 아직 리렌더 전인 이전 `visible`/`loader` 클로저로 목록을 가져옴 — 항상 한 스텝 이전 상태를 보여줌
  - `BrawlerBrowser`에서 `useInfiniteList`/`PAGE`/`loader`/`initial`/"+30개" 버튼을 제거하고 `visible`(필터+정렬된 전체 배열)을 그대로 렌더
  - `applyFilter` 래퍼도 함께 제거 — `setQuery`/`setRole`/`setSort`를 직접 호출하면 `useMemo`가 매 렌더 최신값으로 재계산되므로 이 변경만으로 밀림 현상이 같이 해소됨

**✅ 2. 카드 hover 효과**
  - `BrawlerCard`의 버튼에 확대(`hover:scale-105`) + 테두리 강조(`hover:border-brand`) + `transition-transform`, 이웃 카드에 안 가리도록 `hover:z-10` 추가

**✅ 3. 정렬 드롭다운 위치 고정**
  - 현재 `SelectContent` 기본값 `position="item-aligned"`가 선택된 항목을 트리거 위치에 맞추면서 옵션이 바뀔 때마다 팝업 위치가 흔들림
  - 브롤러 페이지의 정렬 `SelectContent`에 `position="popper"` 지정 → 항상 트리거 하단에 고정

**✅ 4. 희귀도 필터 추가 (체크박스 다중 선택)**
  - 역할 칩은 단일 선택(exclusive)이라 그대로 재사용하지 않고, 희귀도는 **여러 개를 동시에 체크**할 수 있는 별도 컴포넌트로 구현
  - `lib/brawlers.ts`의 `BrawlerFilter.rarityId?: number | null`(단일값)를 `rarityIds?: number[]`(다중값, 빈 배열/undefined면 필터 없음)로 변경 — `lib/brawlers.test.ts`의 관련 테스트도 함께 갱신
  - `messages/ko.json`, `en.json`에 `rarity` 네임스페이스 추가 (common/rare/superRare/epic/mythic/legendary/ultraLegendary)
  - 신규 `src/components/brawlers/RarityFilter.tsx`: 체크박스 + `RarityBadge`와 같은 컬러 도트 + 라벨 + `countByRarity` 개수. 클릭할 때마다 `Set<number>`에 독립적으로 토글(라디오 아님) — 아무것도 안 체크하면 필터 없음(전체 노출)
  - `BrawlerBrowser`에 `rarityIds` 상태 추가 → `filterBrawlers`에 전달, 역할 칩 아래 새 줄로 배치

**✅ 5. 데스크톱 중앙 모달 / 모바일 바텀시트 분기**
  - `vaul` Drawer는 방향(top/bottom/left/right)만 바꿀 수 있어 "가운데 모달"을 표현 못 함
  - `src/components/ui/dialog.tsx` 신규 추가 (`radix-ui`의 `Dialog`, 기존 `select.tsx`/`drawer.tsx`와 같은 패턴)
  - `DetailPanel`을 `isDesktop` 분기: 데스크톱 → `Dialog`(중앙 모달), 모바일 → 기존 `Drawer`(하단 시트)
  - `BrawlerDetailSlot` 등 호출부는 `open`/`onClose`/`title`/`children` 인터페이스 그대로라 변경 불필요

**✅ 6. 브롤러 상세 캐릭터 이미지 글리치 이펙트**
  - `react-powerglitch`(2kb 미만, 의존성 없음) 추가, `BrawlerDetail`의 84×84 포트레이트에 `useGlitch` 적용
  - `playMode: 'hover'` 권장 — 평소엔 정적이다가 포인터를 올릴 때만 0.25초 글리치. 상세 정보 읽기를 방해하지 않으면서 재미 요소가 됨 (`playMode: 'always'`는 계속 흔들려 텍스트 옆에서 산만할 수 있어 배제)
  - 라이브러리 주의사항: `createContainers: true`(기본값)일 때 glitch 대상 엘리먼트를 조건부 렌더링하거나 다른 컴포넌트의 직계 자식으로 두지 말 것 → 포트레이트를 감싸는 `div`에 `ref`를 붙이는 형태로 적용

## 검증 방법

- `npx vitest run src/components/brawlers/BrawlerCard.test.tsx src/lib/brawlers.test.ts` (영향 파일만)
- 브라우저 프리뷰: 검색어 입력 즉시 반영, 역할/희귀도 칩 클릭 즉시 반영, 정렬 변경 시 드롭다운 위치 고정, 카드 hover 확대/보더, 데스크톱 폭에서 중앙 모달 → 리사이즈해서 모바일 폭으로 줄이면 하단 시트로 전환, 상세 패널 포트레이트 hover 시 글리치

## 작업 중 추가/변경

(아직 없음)
