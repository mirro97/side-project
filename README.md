<div align="center">
  <h1>✦ Brawl Companion</h1>
  <p><b>브롤스타즈 전적 · 브롤러 도감 · 이벤트를 한 화면에서</b></p>
  <p>
    <a href="https://brawl-side.vercel.app"><img src="https://img.shields.io/badge/브롤%20컴패니언-brawl--side.vercel.app-8B5CF6?style=flat-square" alt="Live" /></a>
    <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-16-000?style=flat-square&logo=nextdotjs" alt="Next.js 16" /></a>
    <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript" alt="TypeScript" /></a>
    <img src="https://img.shields.io/badge/tests-278%20passing-3DD68C?style=flat-square" alt="278 tests passing" />
  </p>
  <p><sub>한국어 · English · 비공식 팬 프로젝트</sub></p>
  <img src="docs/screenshots/home.png" width="820" alt="홈 화면 — 유저 순위, 클랜 순위, 진행 중인 이벤트" />
</div>

---

## 무엇을 하나

| | |
|---|---|
| 🏠 **홈** | 유저·클랜 순위와 진행 중인 이벤트, 내 계정 요약 |
| 🎯 **브롤러** | 108종 도감. 영문·한글 동시 검색, 역할·희귀도 필터 |
| 🏆 **랭킹** | 국가 10종 × 플레이어/클럽. 무한 스크롤, 내 계정 하이라이트 |
| 🗺️ **이벤트** | 현재 로테이션을 종료 임박순으로. 맵 이미지와 카운트다운 |
| 💡 **추천** | 설문 4문항 + 내 계정 성향을 섞어 맞는 브롤러를 고름 |
| 👤 **프로필** | 태그 조회, 대표 계정 지정, 즐겨찾기, 최근 전투 25전 |
| ✦ **AI 도우미** | 본인 API 키로 쓰는 채팅 (BYOK) |

---

## 화면

### 브롤러 상세

게임이 쓴 **기본 공격·특수 공격 설명**, 능력과 기어의 실제 수치, 그리고 미리 생성해 둔 **사용법·추천 기어**가 한 장에 들어갑니다. AI 키가 없어도 보입니다.

<img src="docs/screenshots/brawler-detail.jpg" width="820" alt="브롤러 상세 — 기본 공격, 특수 공격, 스타파워, 가젯, 기어, 사용법, 추천 기어" />

### 브롤러 도감 · 이벤트

<table>
<tr>
<td width="50%"><img src="docs/screenshots/brawlers.jpg" alt="브롤러 도감 — 108종 그리드와 역할·희귀도 필터" /></td>
<td width="50%"><img src="docs/screenshots/events.jpg" alt="이벤트 — 로테이션을 종료 임박순으로" /></td>
</tr>
<tr>
<td align="center"><sub>대표 계정이 있으면 카드에 내 트로피가 얹힙니다</sub></td>
<td align="center"><sub>맵 이미지 배경과 실시간 카운트다운</sub></td>
</tr>
</table>

---

## 설계에서 신경 쓴 것

> **개인 데이터와 공유 데이터의 캐시를 나눴습니다.**
> 랭킹·이벤트처럼 모두에게 같은 응답은 서버에서 받아 캐시하고, 계정 정보만 클라이언트가 가져옵니다. 한 응답에 섞으면 개인 데이터 때문에 전체가 캐시 불가능해집니다. 공식 API 가 프록시를 거쳐 왕복 500ms 라 캐시가 선택이 아니었습니다.

> **AI 키는 브라우저 밖으로 나가지 않습니다.**
> 채팅은 브라우저가 제공자(Gemini · OpenAI · Anthropic)를 직접 호출합니다. 우리 서버는 키를 보지도, 저장하지도 않습니다.

> **AI 설명은 미리 만들어 파일로 커밋합니다.**
> 실시간 호출이 아니라 정적 파일이라 응답이 즉시 나오고, 무엇보다 **사람이 읽고 고칠 수 있습니다.** 생성 스크립트는 손으로 고친 파일을 덮지 않습니다.

> **추천은 AI 가 하지 않습니다.**
> 규칙 기반 벡터 스코어링이 브롤러를 고르고 AI 는 설명만 씁니다. 그래야 없는 브롤러를 지어내지 않고 같은 입력에 같은 답이 나옵니다.

---

## 데이터는 직접 만듭니다

공식 API 는 **브롤러 이름과 ID 만** 줍니다. 이미지도, 역할도, 능력 설명도, 수치도 없습니다. 도감을 만들려면 게임 데이터를 직접 조립해야 합니다.

`npm run build:data` 가 공식 API · BrawlAPI · 게임 CSV 12개 · 로케일 파일을 엮어 번들에 넣을 JSON 하나를 만듭니다. 앱은 런타임에 게임 데이터를 받지 않습니다.

**능력 설명 432개를 전부 복원했습니다.** 게임 원문에는 수치 자리가 치환자로 비어 있고, 그 치환자가 CSV 를 건너뛰며 참조합니다.

```
원문   HP가 <!card.value>% 이하로 떨어지면 <!card.character.maxHealth>만큼 회복합니다
       → cards → characters 를 따라가 실제 값을 찾는다
결과   HP가 40% 이하로 떨어지면 3900만큼 회복합니다
```

경로를 따라 실제 수치를 채운 게 191개, 값이 어느 CSV 에도 없어 *"일정 비율"* 같은 자연어로 바꾼 게 나머지입니다. **빈칸이나 `<VALUE1>` 을 그대로 내보내지 않습니다.**

**필드 이름을 믿으면 기능이 통째로 죽습니다.** 사거리를 `characters.AutoAttackRange` 에서 가져오면 106종 중 100종이 값 12 로 같습니다 — 엘 프리모와 파이퍼가 똑같아지고 추천 알고리즘의 사거리 축이 무의미해집니다. 실제 사거리는 `WeaponSkill → skills.CastingRange` 이고 6~30 범위에 23개 고유값으로 갈립니다.

이런 함정과 실측 결과는 [API 레퍼런스](.claude/docs/brawl-stars-api-reference.md)에 정리해 뒀습니다.

---

## 기술 스택

```
Next.js 16 (App Router) · React 19 · TypeScript
Tailwind v4 · shadcn/ui · Radix · vaul
next-intl (en/ko) · TanStack Query
Vitest + Testing Library
Vercel
```

---

## 시작하기

```bash
npm install
cp .env.example .env.local   # 필요한 키와 IP 화이트리스트 안내가 들어 있다
npm run dev
```

게임 데이터와 AI 설명은 빌드 산출물이라 **게임 업데이트로 브롤러가 추가됐을 때만** 다시 만듭니다 — `npm run build:data` · `npm run build:ai`.

---

## 구조

```
src/
  app/[locale]/       페이지 — 홈 · 브롤러 · 랭킹 · 이벤트 · 추천 · 프로필
  app/api/            라우트 핸들러 5개. 캐시 정책이 여기 있다
  components/
    display/          순수 표시. props 만 받는다
    state/            빈 상태 · 에러 · 스켈레톤
    {page}/           페이지 전용
    ui/               shadcn 생성물
  lib/                순수 함수와 도메인 로직. 테스트가 여기 붙는다
  data/               빌드 산출물 — 게임 데이터 · AI 성향 색인
scripts/              생성 스크립트
public/data/ai/       AI 설명 (브롤러별 · 로케일별)
```

설계 근거와 API 실측 결과는 [`.claude/`](.claude/) 아래에 있습니다 — 설계서, 코딩 컨벤션, [API 레퍼런스](.claude/docs/brawl-stars-api-reference.md), 기능별 구현 플랜.

---

## 한계

- **랭킹은 200위까지** — 공식 API 제약입니다
- **전적은 최근 25전** — 배틀로그가 그만큼만 줍니다. 추이를 쌓으려면 DB 가 필요해 다음 버전으로 미뤘습니다
- **신규 브롤러는 데이터가 늦습니다** — 한글명·이미지가 순차적으로 채워집니다. 빌드를 실패시키지 않고 폴백으로 처리합니다
- **기본·특수 공격 설명은 한국어만** — 게임 로케일 파일에만 있고 영문 소스가 없습니다

---

**고지** — This material is unofficial and is not endorsed by Supercell.
For more information see Supercell's [Fan Content Policy](https://www.supercell.com/fan-content-policy).
이미지는 [Brawlify CDN](https://github.com/Brawlify/CDN) 을 사용합니다.
