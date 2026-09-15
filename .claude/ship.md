# 배포 절차

## 사전 조건
- `.claude/verify.md` 의 네 명령 통과
- main 브랜치일 것. Netlify 는 main 에 push 된 커밋만 production 으로 배포한다.
- **크레딧 확인.** Netlify Free 크레딧 플랜: 월 300, **production 배포 1회 = 15 크레딧**. 잔량은 https://app.netlify.com/teams/ykonlytv/usage — 30 미만이면 배포를 미룬다.
- 작은 커밋을 따로 배포하지 않는다. 배포 가능한 변경을 모아 한 번에 push 한다.

## 배포
1. `git push origin main` — Netlify 가 GitHub 연동으로 자동 빌드·배포한다(`netlify.toml`, `pnpm build`). 별도 배포 명령 없음.
2. Netlify → Deploys 에서 새 deploy 가 `Published` 가 될 때까지 기다린다(2026-09-04 기준 약 1분).

## 검증
- `curl -s https://heeday.netlify.app/api/health` → `{"ok":true,"db":"up",...}`
- https://heeday.netlify.app/calendar 가 200 으로 열림
- 화면을 바꿨으면 `SMOKE_BASE=https://heeday.netlify.app pnpm smoke <outDir>` 로 스크린샷·콘솔 에러 확인 (요청 약 5,000회 = 1 크레딧이라 부담 없음)

## 롤백
- Netlify → Deploys → 이전 deploy → "Publish deploy". 코드 push 없이 되돌린다. 이것도 배포 크레딧을 쓰는지는 확인 안 됨.

## 주의
- **배포 1회 = 15 크레딧 (월 300).** 승인 게이트에서 잔량과 함께 상기시킨다.
- 스키마 변경 시 push 전에 운영 DB 에 마이그레이션 먼저: `pnpm db:migrate:prod`. 운영 접속값은 `.env.local` 의 `PROD_DATABASE_URL`(gitignore) 이고 앱·빌드·테스트는 이 변수를 읽지 않는다.
- 운영 DB 는 TiDB Serverless. MySQL 표준 SQL 만 (RETURNING·MariaDB 전용 문법 금지, CLAUDE.md 참조).
- **운영 DB 비밀번호를 재발급하지 않는다.** TiDB Cloud 콘솔은 기존 비밀번호를 가려서 보여주므로 Reset 을 누르기 쉬운데, 그 순간 Netlify env 가 무효가 되어 사이트가 통째로 500 이 된다(2026-09-14 30분 장애). 접속값이 필요하면 Netlify env 의 `DATABASE_URL` 을 복사한다(Claude 는 커넥터 `manage-env-vars` 로 읽을 수 있고, 쓰기는 차단됨). 바꿨다면 env 갱신 + 재배포(15 크레딧)를 한 세트로.
- Deploy Previews / Branch deploys 는 켜지 않는다. 켜면 배포마다 15 크레딧이 추가로 나간다.
