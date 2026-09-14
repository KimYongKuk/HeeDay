# 2026-09-14 Netlify keepalive 함수 — 콜드 스타트 대응과 배포 크레딧 규칙

> CHANGELOG: [2026-09-14] Netlify keepalive 스케줄 함수와 배포 크레딧 규칙
> → [그림](artifacts/2026-09-14_netlify-keepalive-함수.html)

## 배경

"실제 서비스가 죽었다"는 보고가 있어 운영(https://heeday.netlify.app)을 점검했다. 점검 시점(2026-09-14 09:56 KST)에는 살아 있었고, 화면 10종 × 데스크톱/모바일 스모크(`SMOKE_BASE=https://heeday.netlify.app pnpm smoke`)와 API 6종 모두 200, 콘솔 에러 0 이었다. 관측된 문제는 두 가지.

1. **유휴 후 첫 요청이 느리다.** `/api/health` 첫 호출 5.9초(그중 DB 1.9초), 바로 이어진 호출은 0.9초(DB 16ms). Netlify 함수(Next.js 서버 핸들러) 콜드 스타트 + TiDB Serverless 컴퓨트 콜드 스타트가 겹친 것. 사용자는 이걸 "죽었다"로 볼 수 있다.
2. **Netlify Free 는 크레딧제이고 배포가 비싸다.** Usage 화면: production 배포 7회 = 105 크레딧(**1회 = 15**, 툴팁으로 공식 확인), web requests 6,584회 = 1.3 크레딧, 월 한도 300. 크레딧 0 이면 리셋일까지 사이트가 정지된다. 8월 장애의 원인으로 콜드 스타트보다 이쪽이 유력하지만 **8월 usage 를 아직 확인하지 않아 미확정**.

## 변경 내용

| 파일 | 구분 | 설명 |
| --- | --- | --- |
| `netlify/functions/keepalive.mts` | 추가 | Scheduled Function. cron `*/15 22-23,0-10 * * *`(UTC = KST 07:00–19:59), 주말은 함수 안에서 `isWeekendInKst` 로 즉시 종료. `${URL}/api/health?source=keepalive` 를 25초 타임아웃으로 호출하고 `{keepalive, status, totalMs, dbMs}` 한 줄 JSON 로그. non-200 이면 throw |
| `README.md` | 수정 | 배포 절 5번에 keepalive 설명 |
| `.claude/verify.md` | 추가 | test/lint/typecheck/build 네 명령. smoke·db 명령은 제외 |
| `.claude/ship.md` | 추가 | push → Netlify 자동 배포, health 확인, 롤백, 크레딧 규칙 |
| `CHANGELOG.md`, `docs/history/` | 추가 | 이 저장소의 첫 기록. 기록 규약은 `~/.claude/skills/CONVENTIONS.md` |

## 핵심 결정과 이유

- **`/api/health` 를 공개 URL 로 호출한다** (DB 에 직접 붙지 않음) — 함수 → DB 순서로 둘 다 깨어난다. DB 만 깨우면 함수 콜드 스타트 2–3초는 그대로 남는다. `route.ts` 가 이미 `force-dynamic` + `select 1` 이라 코드 변경 없이 대상이 된다.
- **15분 · 평일 · KST 07–19시** — 처음엔 5분/24시간(월 ~17,000회)으로 잡았다가 무료 티어를 감안해 줄였다(월 ~2,300회). 이후 Usage 로 단가를 확인하니 요청 5,000회 ≈ 1 크레딧이라 어느 쪽이든 월 1 크레딧 미만. 즉 주기는 비용이 아니라 효과로 정하면 되고, 15분은 Netlify 함수 웜 유지 범위 바깥이라 함수 콜드 스타트는 가끔 샐 수 있다. `dbMs` 로그를 보고 부족하면 10분으로 좁힌다.
- **주말 판정을 cron 이 아니라 함수 안에서** — KST 하루가 UTC 22:00 에서 시작해 요일 경계가 UTC 창 한가운데 있다. cron 으로 하려면 표현식 두 개가 필요하고 Netlify 는 함수당 하나만 받는다. 주말 호출은 수 ms 라 비용이 없다.
- **스케줄러를 Netlify 안에 둔다** (GitHub Actions cron 대신) — 정시성이 좋고 외부 의존이 없다. 크레딧이 빠듯해지면 GitHub Actions(공개 저장소 무료)로 옮겨 Netlify 부담을 절반으로 줄이는 대안을 남겨둔다.
- **바로 배포하지 않는다** — 배포 1회 = 15 크레딧이라 keepalive 하나로 배포를 쓰지 않고 다른 세션의 변경과 묶는다.

## 여기가 어려웠다

- **크레딧 = 배포 횟수.** 트래픽·핑은 사실상 공짜고 push 가 비용이다. 월 300 ÷ 15 = 20회, 트래픽 몫 남기면 15회 안팎. 작은 커밋을 따로 push 하면 안 된다. Deploy Previews / Branch deploys 도 같은 단가라 켜면 안 된다.
- **8월 장애 원인은 아직 가설이다.** 크레딧 고갈이 가장 그럴듯하지만 Usage 의 8월 기록을 보지 않았다. 확인 전에 "콜드 스타트가 원인"이라고 단정하지 말 것.
- **Netlify 함수 웜 유지 시간은 보장값이 아니다.** 15분 주기로 함수 콜드 스타트가 새면 `totalMs` 가 5초 넘게 튄다. 그건 버그가 아니라 예상 범위.
- **cron 은 UTC.** `22-23,0-10` 이 KST 07–19시라는 걸 모르고 "왜 밤에 도냐"고 고치면 근무시간에 안 돈다.
- **Netlify 환경변수는 자동 모드에서 읽을 수 없다.** `DATABASE_URL` 조회가 비밀번호 때문에 차단된다. 운영 DB 종류는 사용자가 알려줘야 한다(TiDB Serverless).
- **로컬 Node 는 26.4, 프로젝트 요구는 22.** typecheck·build·migrate 는 문제없이 돌았지만 차이가 있다는 건 알고 있을 것.
- **스모크의 `/programs/1` 은 운영에서 항상 404.** 운영 프로그램 id 는 90002, 120003 같은 값이라 픽스처 id 1 이 없다. 서비스 버그가 아니다.

## 검증

- `pnpm typecheck`, `pnpm exec eslint netlify`, `pnpm exec prettier --check netlify`, `pnpm build` 통과 (2026-09-14, `.env.local` 있는 로컬).
- 함수를 로컬에서 `URL=https://heeday.netlify.app` 로 직접 실행 → `{"keepalive":true,"status":200,"totalMs":943,"dbMs":16}`.
- `Date` 를 2026-09-12T22:00Z(KST 일요일 07:00)로 고정해 실행 → 호출 없이 종료.
- 운영 스모크: 데스크톱·모바일 각 10화면 중 `/programs/1` 만 404(픽스처 문제), 나머지 200·콘솔 에러 0·가로 넘침 없음.
- **미검증:** Netlify 에 실제 배포 후 스케줄이 등록되는지, 로그가 찍히는지. 배포를 묶어서 하기로 해서 아직 안 했다.

## 남은 것

- 배포(다른 변경과 묶어서). 배포 후: Functions 에 `keepalive` 가 Scheduled 로 보이는지, 30분 뒤 로그 2회 이상, 다음 날 아침 첫 `/api/health` 가 1초 안팎인지.
- Netlify Usage 에서 8월 기록 확인 → 장애 원인 확정.
- 외부 모니터링(UptimeRobot 등)은 별도 결정. keepalive 는 알림을 주지 않는다.
- Deploy Previews / Branch deploys 가 꺼져 있는지 Site configuration 에서 확인.
