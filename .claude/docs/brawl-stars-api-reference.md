# 브롤스타즈 API 레퍼런스

> 현재 무엇이 만들어졌는지는 [프로젝트 현황](../STATUS.md) 을 본다.

조사일: 2026-08-24
목적: 사이드 프로젝트에서 사용 가능한 브롤스타즈 관련 API 전수 조사 및 제약 정리
검증 상태: 발급한 실제 키로 직접 호출(`api.brawlstars.com`)과 프록시 호출(`bsproxy.royaleapi.dev`) 양쪽 200 OK 확인 완료

---

## 1. 공식 API (Supercell)

- 베이스 URL: `https://api.brawlstars.com/v1`
- 개발자 포털: https://developer.brawlstars.com
- 인증: `Authorization: Bearer {JWT_TOKEN}` 헤더
- 응답 포맷: JSON
- 태그 표기: `#`으로 시작하는 플레이어/클럽 태그는 URL 인코딩 필수 (`#2VUL0L00R` → `%232VUL0L00R`)
- 유효 태그 문자: `0289PYLQGRJCUV` (숫자 1, 알파벳 I/O 등은 존재하지 않음)

### 1-1. 엔드포인트 목록

**플레이어**

- **`GET /players/{playerTag}`**
  - 용도: 플레이어 상세 정보 조회
  - 주요 응답 필드: `tag`, `name`, `nameColor`, `icon.id`, `trophies`, `highestTrophies`, `expLevel`, `expPoints`, `3vs3Victories`, `soloVictories`, `duoVictories`, `bestRoboRumbleTime`, `bestTimeAsBigBrawler`, `club{tag,name}`, `brawlers[]`
  - `brawlers[]` 각 항목: `id`, `name`, `power`, `rank`, `trophies`, `highestTrophies`, `gears[]`, `starPowers[]`, `gadgets[]`
  - 비고: 이 프로젝트의 "본인 계정 조회" + "성향 기반 추천"의 핵심 데이터 소스

- **`GET /players/{playerTag}/battlelog`**
  - 용도: 최근 전투 기록 조회 (최대 25건)
  - 주요 응답 필드: `items[].battleTime`, `items[].event{id,mode,map}`, `items[].battle{mode,type,result,duration,trophyChange,starPlayer,teams[]|players[]}`
  - 비고: 실제 플레이 성향(선호 모드/브롤러/승률)을 뽑아낼 수 있는 유일한 행동 데이터. 단, 25건 한정이라 장기 통계를 원하면 주기적으로 수집·저장해야 함

**클럽**

- **`GET /clubs/{clubTag}`**
  - 용도: 클럽 상세 정보 조회
  - 주요 응답 필드: `tag`, `name`, `description`, `type`, `badgeId`, `requiredTrophies`, `trophies`, `members[]`

- **`GET /clubs/{clubTag}/members`**
  - 용도: 클럽 멤버 목록 (트로피 내림차순)
  - 쿼리 파라미터: `limit`, `after`, `before` (페이지네이션)
  - 주요 응답 필드: `items[].tag`, `name`, `nameColor`, `role`, `trophies`, `icon.id`

**랭킹**

- **`GET /rankings/{countryCode}/players`**
  - 용도: 국가별/글로벌 플레이어 트로피 랭킹
  - 파라미터: `countryCode`는 ISO 2자리 국가코드(`kr`, `us` 등) 또는 `global`, 쿼리 `limit`, `after`, `before`
  - 응답 필드: `items[].tag`, `name`, `nameColor`, `icon.id`, `trophies`, `rank`, `club.name` / `paging.cursors`
  - **커서 페이지네이션 실측 검증**
    - `limit=30` → 30개 + `paging.cursors.after` (예: `eyJwb3MiOjMwfQ` = base64 `{"pos":30}`)
    - 받은 `after` 값을 그대로 다음 요청에 넘기면 `rank` 31부터 이어진다. 2페이지부터 `before`도 함께 온다
    - 커서를 직접 만들어 쓰면(`after=30`) `400 badRequest`. 불투명 토큰으로 취급해야 한다
    - **총 200위가 상한.** `limit=200`이면 `paging.cursors`가 빈 객체로 오고 그게 종료 신호다
    - `limit=201` 이상은 에러 없이 조용히 200으로 클램프된다
  - `nameColor`는 `0xffcb5aff` 형태의 ARGB 문자열. CSS에 쓰려면 알파 2바이트를 떼고 `#RRGGBB`로 변환
  - ⚠️ **플레이어·클럽 이름에 게임 내 색상 마크업이 섞여 온다.** `Only<c3>Pro</c>`, `Zero<c9>Win</c>`, `🌴|<c3>HM</c>` 처럼 `<cN>...</c>` 형태다. 실측 시 상위 10개 클럽 중 3개가 해당됐다. 그대로 렌더하면 태그가 글자로 보인다

- **`GET /rankings/{countryCode}/clubs`**
  - 용도: 국가별/글로벌 클럽 랭킹
  - 파라미터와 페이지네이션 동작은 플레이어 랭킹과 동일
  - 응답 필드: `items[].tag`, `name`, `badgeId`, `trophies`, `rank`, `memberCount`
  - 플레이어 랭킹과 구조가 거의 같아 목록 컴포넌트를 재사용할 수 있다

- **`GET /rankings/{countryCode}/brawlers/{brawlerId}`**
  - 용도: 특정 브롤러 기준 상위 플레이어 랭킹
  - 파라미터: `brawlerId`는 `/brawlers`에서 얻는 숫자 ID (예: 셸리 16000000)

**브롤러**

- **`GET /brawlers`**
  - 용도: 전체 브롤러 목록
  - 응답 구조: `{ items: [], paging: {} }`, 실측 106종 (2026-08-24 기준)
  - `items[]` 각 항목: `id`, `name`, `starPowers[]{id,name}`, `hyperCharges[]{id,name}`, `gadgets[]{id,name}`, `gears[]{id,name,level}`
  - 하이퍼차지는 106종 중 104종이 보유. 기어는 브롤러별 사용 가능 목록이 내려옴 (공용 SPEED/HEALTH/DAMAGE/VISION/SHIELD + 브롤러 전용 기어)
  - 비고: **이미지·역할(class)·희귀도·설명·수치 스탯은 없음.** 영문 대문자 이름과 ID만 제공 → 브롤러 도감 UI를 만들려면 비공식 API 병행 필수

- **`GET /brawlers/{brawlerId}`**
  - 용도: 단일 브롤러 조회
  - 응답: 위 항목과 동일 구조 (단일 객체)

**이벤트**

- **`GET /events/rotation`**
  - 용도: 현재 로테이션 중인 이벤트 목록
  - 주요 응답 필드: `[].startTime`, `endTime`, `slotId`, `event{id,mode,modeId,map}`
  - 실측 15개 슬롯. `mode` 값 예: `gemGrab`, `brawlBall`, `brawlBall5V5`, `knockout`, `bounty`, `hotZone`, `soloShowdown`, `duoShowdown`, `trioShowdown`, `deathmatch`, `airHockey`, `brawlArena`
  - 시각 포맷이 ISO8601 변형(`20260824T080000.000Z`)이라 `new Date()`로 바로 파싱되지 않음 → 별도 파서 필요

### 1-2. 제거되었거나 더 이상 유효하지 않은 엔드포인트

- `GET /rankings/{countryCode}/powerplay/seasons/{seasonId}` — 게임에서 파워플레이 모드가 삭제되면서 사실상 무의미. 구형 래퍼 문서에만 남아있음
- `getIcons`, `getGamemodes`, `getSeasons` 등 일부 커뮤니티 래퍼가 노출하는 메서드는 공식 API가 아니라 Brawlify 데이터를 섞어 제공하는 것 → 아래 2번 섹션 참고

### 1-3. ⚠️ 가장 중요한 제약: API 키의 IP 화이트리스트

발급 시 **허용할 IP 주소를 반드시 지정**해야 하며, 그 IP에서 온 요청만 통과한다.

이 제약이 아키텍처를 결정한다:
  - 브라우저에서 직접 호출 불가 (사용자마다 IP가 다름 + 키가 노출됨)
  - Vercel/Netlify 등 서버리스 함수도 IP가 유동적이라 그대로는 불가
  - 즉 **어떤 형태로든 서버 사이드 프록시 계층이 필요**하다

우회 수단:
  - **RoyaleAPI 프록시** (권장): `https://bsproxy.royaleapi.dev/v1`를 베이스 URL로 쓰고, 공식 포털에서 키 발급 시 IP `45.79.218.79`를 화이트리스트에 등록. 무료이며 서버리스 환경에서 가장 널리 쓰이는 방식
  - **고정 IP 서버**: VPS/전용 서버에 배포하고 그 IP를 등록
  - **런타임 키 재발급**: 개발자 포털에 로그인해 현재 IP로 키를 새로 발급받는 스크립트(get-sc-key 류). 계정 자격증명을 서버에 두어야 해서 권장하지 않음

### 1-4. 레이트리밋 / 에러

- 공식 문서상 정확한 수치는 비공개. 커뮤니티 래퍼들은 **분당 약 3,200 요청**을 기준으로 캐시를 구성함. 개인 프로젝트 규모에서는 사실상 걸리지 않음
- 주요 상태 코드:
```
  400  잘못된 요청 (태그 인코딩 누락 등)
  403  잘못된 키 또는 화이트리스트에 없는 IP  ← 가장 흔한 실수
  404  존재하지 않는 태그
  429  레이트리밋 초과
  503  게임 점검 중 (Supercell 업데이트 시간대)
```
- `503`은 게임 업데이트마다 발생하므로 UI에 "점검 중" 상태를 반드시 만들어야 함

---

## 2. 비공식 API — BrawlAPI / Brawlify

공식 API에 없는 **이미지, 맵, 게임모드, 브롤러 메타데이터**를 채워주는 정적 JSON API.

- 베이스 URL: `https://api.brawlapi.com` (구 `api.brawlify.com`은 301 리다이렉트)
- 인증: **불필요**
- 레이트리밋: 없음
- CORS: `Access-Control-Allow-Origin: *` → **브라우저에서 직접 호출 가능**
- 캐시: `Cache-Control: public, max-age=3600`

### 2-1. 엔드포인트 목록

```
  GET /v1/brawlers          전체 브롤러 (약 107종), { list: [...] } 래핑
  GET /v1/brawlers/{id}     단일 브롤러 (래핑 없음)
  GET /v1/maps              전체 맵 (약 1,239종), stats 미포함
  GET /v1/maps/{id}         단일 맵 (stats[], teamStats[] 포함)
  GET /v1/gamemodes         전체 게임모드 (약 68종)
  GET /v1/gamemodes/{id}    단일 게임모드
  GET /v1/icons             플레이어/클럽 아이콘 { player: {...}, club: {...} }
  GET /v1/events            { active: [], upcoming: [] } — 정적 API라 항상 비어있음
  GET /game                 게임 원본 CSV 인덱스 (168개 파일)
  GET /game/{path}          CSV → JSON 변환본
  GET /v2/raw/{path}        메타데이터 래핑된 원본 CSV JSON
```

주의: `/v1/events`는 비어있으므로 **실시간 이벤트 로테이션은 공식 API의 `/events/rotation`을 써야 한다.**

### 2-2. 브롤러 객체가 제공하는 추가 정보

실측 기준 107종(공식보다 1종 많음). 공식 API에 없고 여기에만 있는 필드들:
  - `class` — ~~역할~~. **2026-09-02 부터 역할이 아니다.** 브롤러별 한 줄 소개로 바뀌었고 값이 전부 다르다
    ("Collect Caterpillars To Become More Powerful", "Use Gravity To Target Enemies"). 역할 매핑에 쓰면 전 종이 null 이 된다.
    옛 값은 Artillery, Assassin, Controller, Damage Dealer, Marksman, Support, Tank, Unknown 이었다
  - ⚠️ **역할은 이제 `characters` CSV 의 `ClassArchetype` 에서 가져온다.** 값은 `damage_dealer` · `tank` · `assassin` ·
    `support` · `controller` · `marksman` · `artillery` 이고 **108/108 이 채워져 있다**. 구 방식(BrawlAPI class)은 87/106 이었다.
    비공식 API 의 필드는 예고 없이 의미가 바뀐다는 게 이 건의 교훈이다 — 게임 CSV 쪽이 더 안정적이다
  - `rarity` — 희귀도 (Common ~ Legendary)
  - `description` — 브롤러 설명 텍스트
  - `starPowers[]`, `gadgets[]` — 이름 + **설명 + 이미지**
  - `gears[]` — 추천 기어 정보
  - `imageUrl`, `imageUrl2`, `imageUrl3` — CDN 이미지 경로

### 2-3. CDN 이미지 경로 패턴

```
  브롤러(테두리)      https://cdn.brawlify.com/brawlers/borders/{id}.png
  브롤러(테두리 없음)  https://cdn.brawlify.com/brawlers/borderless/{id}.png
  브롤러(이모지)      https://cdn.brawlify.com/brawlers/emoji/{id}.png
  스타파워            https://cdn.brawlify.com/star-powers/borderless/{id}.png
  가젯                https://cdn.brawlify.com/gadgets/borderless/{id}.png
  맵                  https://cdn.brawlify.com/maps/regular/{id}.png
  게임모드 아이콘      https://cdn.brawlify.com/game-modes/regular/{48000000 + modeId}.png
  기어                https://cdn.brawlify.com/gears/regular/{id}.png
  게임모드 헤더        https://cdn-misc.brawlify.com/gamemode/header/{name}.png
  프로필 아이콘        https://cdn.brawlify.com/profile-icons/regular/{id}.png
  클럽 뱃지           https://cdn.brawlify.com/club-badges/regular/{id}.png
```

`{id}`는 공식 API의 브롤러 ID와 동일하므로 두 API를 ID 기준으로 조인할 수 있다.

**게임모드만 ID 체계가 다르다.** 공식 `/events/rotation`이 주는 `event.modeId`는 0~48의 작은 수인데 Brawlify는 `48000000` 오프셋을 쓴다. 실측으로 12개 모드 전부 검증한 변환식은 다음과 같다.

```
  BrawlAPI 게임모드 ID = 48000000 + event.modeId
  예: brawlBall(5) → 48000005, hotZone(17) → 48000017, brawlArena(48) → 48000048
```

`modeId`를 그대로 이미지 경로에 넣으면 404가 난다.

**능력 아이콘은 `regular` 만 쓴다.** 기어는 애초에 `borderless` 가 없고, 스타파워·가젯도 **신규 브롤러의 능력에는 `borderless` 변형이 생성되지 않는다.**

전수 확인 결과 (스타파워·가젯 424개):
```
  borderless   36개 404   최신 12종의 능력이 전부 여기 걸린다
  regular       0개 404
```

공식 API 가 능력 ID 를 주는 시점과 커뮤니티 CDN 이 이미지를 만드는 시점이 달라서 생기는 간극이다. 게임 업데이트 직후에는 `regular` 조차 없을 수 있으므로 이미지 폴백이 필요하다.

**공식 API의 `event.mode` 문자열은 표시용 이름이 아니다.** `deathmatch`의 실제 게임 내 이름은 "Wipeout", `airHockey`는 "Brawl Hockey"다. 표시 이름은 반드시 `TID_GAME_MODE_{modeId}` 현지화를 거쳐야 한다.

### 2-4. 게임 원본 데이터 — 수치 스탯과 다국어 (실측 검증)

`/game/*` 경로는 게임 클라이언트의 원본 CSV를 JSON으로 변환해 제공한다. 여기에 **공식 API에도 BrawlAPI v1에도 없는 두 가지**가 들어 있다.

**수치 스탯 — `GET /game/csv_logic/characters`**
  - 435행, 그중 공식 브롤러 106종이 전부 매칭된다 (`id` 필드가 공식 API 브롤러 ID와 동일)
  - 행 키는 내부 코드명이다 (`ShotgunGirl` = Shelly, `Gunslinger` = Colt, `BullDude` = Bull)
  - 사용 가능한 필드: `Hitpoints`, `Speed`, `AutoAttackRange`, `AutoAttackSpeedMs`, `UltiCharge*` 등 40여 개
  - 실측 예: 쉘리 = Hitpoints 3900, Speed 770, AutoAttackRange 12
  - **커버리지 106/106.** `class`가 Unknown인 신규 브롤러도 수치는 들어 있으므로, 역할 라벨 대신 이 수치로 특성 벡터를 만드는 편이 안정적이다
  - 주의: `AutoAttackDamage`는 0인 경우가 많다. 실제 대미지는 투사체·스킬 행에 있다

**한국어 데이터 — `GET /game/localization/kr`**
  - 로케일 코드는 `kr`이다 (`ko`는 404)
  - 15,480개 항목, `{ TID, KR }` 구조
  - 사용 가능한 로케일 전체: ar, cn, cnt, de, es, es-419, fi, fr, he, id, it, jp, kr, ms, nl, pl, pt, ru, th, tr, vi (+ texts, texts_patch)

조인 규칙:
```
  브롤러 이름   characters 행 키 → TID_{SCREAMING_SNAKE} → localization/kr
                예: ShotgunGirl → TID_SHOTGUN_GIRL → "쉘리"
  브롤러 설명   TID_{...}_DESC                      → "산탄총을 능숙하게 다루는..."
  브롤러 한 줄   TID_{...}_SHORT_DESC                → "폭발적인 피해량으로 탱커와 어쌔신에 대응하세요."
                (역할 라벨이었으나 지금은 문장이다. 역할은 ClassArchetype 을 쓴다)
  게임모드      TID_GAME_MODE_{modeId}              → "젬 그랩"
                (modeId는 공식 /events/rotation의 event.modeId와 동일)
```

**실측 커버리지 (공식 106종 기준)**
  - 한글 이름: 102/106 — 누락 `GENE`, `GRAY`, `HANK`, `ANGELO` (내부 코드명이 TID 규칙에서 벗어남)
  - 한글 설명: 102/106 — 위와 동일
  - 한 줄 요약(SHORT_DESC): 108/108 — 역할 라벨이 아니라 플레이 요약 문장이다
  - 기본 공격 설명: 100/108, 특수 공격 설명: 98/108 — `skills` 의 TID 컬럼은 713행 중 6행에만 있어 쓸 수 없다.
    스킬 이름을 TID 형태로 바꿔 로케일에서 찾고, 변형 무기(`SamuraiWeaponDash`)는 접미사를 떼고 한 번 더 본다.
    초기 8종(쉘리·콜트·불·브록·다이너마이크·그레이·행크·안젤로)은 키 자체가 없다

**중요**: 이 로케일 파일은 게임 버전 스냅샷이라 **최신 브롤러가 항상 빠져 있다.** 상시 상태이므로 빌드 실패가 아니라 영문 폴백으로 처리해야 한다.

### 2-4-1. 화면 필드별 출처 정리

한 화면에 세 소스가 섞여 있어 헷갈리기 쉽다. 공식 API 는 이름과 id 만 주고,
**설명은 어디에도 한국어로 오지 않는다** — 전부 TID 로 로케일을 조회해 만든다.

```
  화면 필드          영문                        한국어
  ────────────────────────────────────────────────────────────────────────
  브롤러 이름        공식 API name (대문자)       characters 코드 → TID → 로케일
                     BrawlAPI name 로 교정
  브롤러 소개문       BrawlAPI description        TID_{코드}_DESC → 로케일
  브롤러 역할        characters.ClassArchetype   (수치가 아니라 코드값이라 공통)
  브롤러 한 줄 요약   없음                        TID_{코드}_SHORT_DESC
  기본·특수 공격 설명  없음                        스킬 이름 → TID → 로케일 (2-4-1)
  스탯(HP/속도/사거리) characters + skills CSV     (수치라 공통)
  능력 이름          BrawlAPI 능력 name           cards.TID → 로케일
  능력 설명          BrawlAPI 능력 description    cards.TID + '_DESC' → 로케일
                     ↑ 양쪽 다 치환자가 박혀 있다. 2-5 참조
  기어 이름          공식 API name               gear_boosts.TID → 로케일
  기어 설명          없음                        없음 (_DESC TID 자체가 없다)
```

한국어가 없으면 영문으로 폴백한다. 신규 브롤러는 로케일 반영이 늦어 한동안 영문이 보인다.

### 2-5. 능력 상세 정보 — 어디까지 얻을 수 있나

스타파워·가젯·기어의 **이름은 완전히, 설명은 일부만** 얻을 수 있다. 실측(웬디 기준으로 시작해 424개 전수 확인)한 결과다.

**소스 세 갈래**
```
  공식 /brawlers/{id}          id, name(대문자) 만. 설명 없음
  BrawlAPI /v1/brawlers/{id}   정식 영문명 + 영문 설명 + 이미지
  game/csv_logic/cards         스타파워·가젯의 TID 와 Value 필드 (1438행, 424/424 매칭)
  game/csv_logic/gear_boosts   기어의 TID 와 ModifierValue/Type (기어 종류 19개, 19/19 매칭)
  localization/kr              위 TID 로 한글명·한글설명 조회
```

**소스는 위 다섯 개로 끝나지 않는다.** 설명의 치환자가 다른 CSV 를 참조하기 때문에
아래 파일도 필요하다. 전체 목록은 `GET /game` 이 준다 (csv_logic 119개).

```
  csv_logic/traits                 카드 -> 트레잇
  csv_logic/status_effects_logic   트레잇·투사체 -> 상태이상 (수치의 종착지)
  csv_logic/accessories            카드 -> 가젯 본체
  csv_logic/projectiles_logic      스킬 -> 투사체
  csv_logic/area_effects_logic     스킬 -> 범위 효과   ※ area_effects 아님. 수치는 _logic 쪽에 있다
  csv_logic/character_components_logic  캐릭터 -> 컴포넌트 (Values 가 배열)
  csv_logic/character_actions      투사체 -> 액션 -> 상태이상
  csv_logic/items                  가젯 -> 설치물
```

**⚠️ 설명에 미치환 치환자가 섞여 있다.** 두 가지 문법이 있고 처리가 다르다.

```
  <!card.value1.ticksasseconds>   카드 안에서 끝난다 → 바로 푼다
  <!card.trait.statusEffect.…>    다른 CSV 로 이어진다 → 참조를 따라가 푼다
  <VALUE1>                        경로 정보가 없다 → 풀 수 없다
```

**참조를 따라가는 예 (콜트 스피드 부츠)**
```
  cards["Gunslinger_unique"].Traits          = "ColtSpeedSp"
  traits["ColtSpeedSp"].StatusEffect         = "GunslingerStarPowerMovementSpeed"
  status_effects_logic[…].SpeedBoostPercent  = 13
  → "콜트의 이동 속도가 13% 증가합니다."
```

경로를 다루며 확인한 것들이다.
- 세그먼트 이름과 컬럼명이 다르다: `maxHealth`→`Hitpoints`, `duration`→`DurationTicks`,
  `maxAmmo`→`MaxCharge`, `customValue1`→`CustomValue`, `areaEffect`→`AreaEffectObject`
- 다중 값 컬럼은 **JSON 배열**로 온다 (`Values: [40, 10, 35, 60]`). 문자열 분리로는 못 읽는다
- `scaleToLevel` 은 레벨 1 기준값이다. 우리 `stats.hp` 와 같은 기준이라 값을 바꾸지 않는다
- 검증: `card.character.maxHealth` 를 106종 전부 풀어 확정된 `stats.hp` 와 대조 → **106/106 일치**

`<VALUEn>` 이 위험한 이유는 **카드의 `Value` 가 화면 표시값이 아니라 스케일링 전 원본**이기 때문이다.

```
  브록 "로켓의 수가 <VALUE1>% 늘어납니다"   Value=2050 → "2050%"  (틀림)
  쉘리 "<VALUE3>초마다 사용할 수 있습니다"   Value3=15000 → 실제 15초 (밀리초)
```

**영문도 같은 한계가 있다.** BrawlAPI 영문 설명 430개 중 245개가 `x` 리터럴을 쓴다 ("increased by x%"). 완전히 깨끗한 것은 영문 101개(23%), 한글 95개(22%)다.

**수치 복원은 불가능하다고 결론냈다.** 같은 `Value` 필드에 원값·틱(20/초)·밀리초가 마커 없이 섞여 있다. "초" 단위 토큰이 참조하는 값의 분포만 봐도 1~9(6건), 10~99(64건), 100~999(10건), 1000+(3건)로 갈려 어느 스케일인지 판별할 근거가 없다. 변환이 이름에 명시된 `ticksasseconds` 사례는 4건뿐이라 규칙을 세울 표본도 못 된다. BrawlAPI 영문·Brawlify 모두 같은 자리를 비워두고 있어 대조군도 없다.

**그래서 수치 대신 단위째로 자연어로 바꾼다.** 크기는 잃지만 능력이 무엇을 하는지는 그대로 남는다.

```
  <VALUE1>%   → 일정 비율     a percentage
  <VALUE1>초  → 일정 시간     a short time
  <VALUE1>초간 → 일정 시간 동안
  <VALUE1>개  → 일정 수       some
  <VALUE1>HP  → 일정량의 HP
  <VALUE1>    → 일정량        some

  "로켓의 수가 <VALUE1>% 늘어납니다"  →  "로켓의 수가 일정 비율 늘어납니다"
```

한국어는 치환 자리에 붙는 조사를 받침에 맞춰 함께 고친다. **조사 교정을 문장 전체에 걸면 안 된다** — "갇혀있**는** 동안"의 '는'은 조사가 아니라 어미인데 '은'으로 바뀌어 멀쩡한 문장이 깨진다. 내가 바꾼 자리 바로 뒤만 손댄다. 뒷 단어와 붙지 않게 띄어쓰기도 보정한다(`일정량피해` → `일정량 피해`, `만큼·씩·마다·의` 같은 접미사는 붙여 쓴다).

**결론: 424/424 전부 표시한다.** 그중 411개는 실제 수치까지 들어가고, 13개는 수치만 자연어로 대체된다.

```
  실제 수치까지 표시   411 / 424   (97%)
  수치를 자연어로 대체   13 / 424
```

수치가 끝내 안 나오는 13개는 게임 클라이언트가 계산하거나 이 CSV 덤프에 없는 컬럼이다
(`cactusMinionHealing`, `bulletExplosionTriggerCount`, `spawnAreaEffectObject`,
`healingTotal`, `largerAreaUlti` — 119개 파일 어디에도 없음을 확인했다).
투사체의 `statusEffectEnemy` 계열도 `projectiles_logic` 에 컬럼이 없다.

**기어에는 설명이 아예 없다.** `gear_boosts` 에 `_DESC` TID 가 없어 671개 전부 설명이 없다. 대신 수치가 있다.

```
  ModifierType   percent 349 · value 216 · ticks 106
  표시 예시       속도 +15% · 회복 +50 · 시야 +2s
```

`ticks` 는 게임의 시간 단위로 **1초가 20틱**이다. 변환하지 않으면 "시야 +40" 처럼 의미 없는 값이 된다.

기어 종류는 19개지만 브롤러마다 사용 가능 목록이 달라, 106종에 걸친 슬롯 총합은 671개다.

### 2-8. 이벤트 로테이션 — 실측

```
  슬롯 수          15개
  상태             진행중 15 / 예정 0 / 종료 0      ← 지금 도는 것만 온다
  모드 매칭         12/12 생성 데이터와 매칭
  시각 형식         20260826T080000.000Z (UTC. 전용 파서 필요)
  맵 이미지         cdn.brawlify.com/maps/regular/{event.id}.png   ※ slotId 아니다
  모드 아이콘        cdn.brawlify.com/game-modes/regular/{48000000 + modeId}.png
  modifiers        15슬롯 중 2개에만. 값 예: ["unknown"], ["unknown", "showdown+"]
```

**모디파이어 이름은 자동으로 붙일 수 없다.** 공식 API 가 쓰는 문자열과 `csv_logic/event_modifiers` 의 내부 이름이 갈라진다. 대소문자·기호를 지우고 맞춰봐도 18개 중 9개만 맞았다.

```
  angryRobo       →  CSV BigRobo             이름이 다르다
  meteorShower    →  CSV Meteors
  graveyardShift  →  CSV LifeLeech
  superCharge     →  CSV FastSuperCharge
  fastBrawlers    →  CSV FastPlayers
  showdown+       →  CSV 에 없음 (로케일에는 TID_EVENT_MODIFIER_15 로 존재)
  unknown         →  API 가 모르는 신규 모디파이어. 이름이 아니다
```

추측해서 매핑하면 틀린 이름을 보여주게 되므로, **로케일 값과 대조해 확인한 것만** 표에 넣고 나머지는 "특수 룰" 로 표시한다.

**영문 원본은 `localization/texts` 다.** `localization/en` 은 없다. `texts` 가 15,480행짜리 영문 베이스이고 `EN` 컬럼을 가진다.

```
  TID_EVENT_MODIFIER_15   texts: "SHOWDOWN+"   kr: "쇼다운+"
  TID_GAME_MODE_5         texts: "BRAWL BALL"  kr: "브롤 볼"
```

### 2-6. 공식 API와의 목록 불일치

실측 시점 기준 공식 106종 / BrawlAPI 107종. 차이는 `Buzz Lightyear`(id 16000088, 콜라보 브롤러)로 BrawlAPI에만 있다. 어느 쪽이 앞설지 알 수 없으므로 **존재 여부의 기준은 공식 API로 고정**하고 BrawlAPI는 부가 정보만 붙이는 용도로 쓴다.

### 2-7. 리스크

비공식·비보증 서비스이므로 다운되거나 스펙이 바뀔 수 있다. 정적 데이터(브롤러/게임모드)는 빌드 타임에 한 번 받아 레포에 스냅샷으로 저장해두면 런타임 의존을 없앨 수 있다.

---

## 3. 두 API의 역할 분담

```
  공식 API      실시간·개인화 데이터  플레이어, 배틀로그, 클럽, 랭킹, 이벤트 로테이션
  BrawlAPI      정적·표현용 데이터    브롤러 메타(역할/희귀도/설명), 맵, 게임모드, 모든 이미지
```

**정의 리스트형 비교**

**인증**
  - 공식: Bearer 토큰 + IP 화이트리스트
  - BrawlAPI: 없음

**호출 위치**
  - 공식: 서버 사이드 전용 (프록시 필수)
  - BrawlAPI: 브라우저에서 직접 가능

**데이터 성격**
  - 공식: 자주 바뀜 → 짧은 캐시(수 분)
  - BrawlAPI: 게임 업데이트 시에만 바뀜 → 긴 캐시 또는 빌드 타임 스냅샷

**이미지**
  - 공식: 제공 안 함
  - BrawlAPI: cdn.brawlify.com 전량 제공

---

## 4. AI 연동 후보 (개발자 과금 없이)

프로젝트 요구사항이 "개발자에게 과금이 발생하지 않을 것"이므로 두 갈래가 있다.

**A. BYOK (Bring Your Own Key) — 사용자가 자기 키를 넣는 방식**
  - 사용자가 발급받은 API 키를 브라우저 로컬에 저장하고 클라이언트에서 직접 호출
  - 개발자 비용 0원이 확실히 보장됨
  - 단점: 일반 사용자에게는 진입 장벽이 높음. 키를 로컬스토리지에 두는 것에 대한 보안 안내 필요

**B. 무료 티어 제공자 — 개발자 키 하나를 무료 한도 내에서 공유**
  - Google Gemini API: 무료 티어가 가장 넉넉함. Gemini 2.5 Flash / Flash-Lite 기준 일 1,500 요청 수준, 신용카드 불필요. 다만 구글이 무료 한도를 공개 문서에서 내려서 AI Studio 로그인 후 확인해야 함
  - Groq: 무료, 카드 불필요, 속도가 매우 빠름. 모델별로 분당 30 요청 / 일 1,000 요청 수준
  - OpenRouter: 무료 모델 기준 분당 20 요청, 일 50 요청(크레딧 $10 이상 구매 시 일 1,000). 모델 다양성이 최대 강점
  - 공통 리스크: 무료 한도를 넘기면 실패하거나 과금으로 전환될 수 있으므로 **한도 초과 시 기능을 끄는 안전장치**가 필요

권장: 기본은 B(무료 티어)로 누구나 바로 써보게 하고, 한도 초과 시 A(BYOK) 입력을 유도하는 하이브리드.

---

## 5. 참고 링크

- 공식 개발자 포털: https://developer.brawlstars.com
- BrawlAPI 레퍼런스: https://brawlapi.com
- RoyaleAPI 프록시 문서: https://docs.royaleapi.com/proxy
- brawlstats (Python 래퍼, 엔드포인트 확인용): https://github.com/SharpBit/brawlstats
- brawlstars-api (JS 래퍼 문서): https://github.com/Nick-Gabe/brawlstars-api/blob/main/docs.md
