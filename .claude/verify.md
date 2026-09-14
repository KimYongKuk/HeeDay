# 검증 절차

## 테스트
- `pnpm test`

## 린트
- `pnpm lint`

## 타입체크
- `pnpm typecheck`

## 빌드
- `pnpm build`

## 주의
- `pnpm smoke` 는 개발 서버(`pnpm dev`)와 Playwright Chromium(`pnpm exec playwright install chromium`)이 필요하다. 검증 단계에 넣지 않는다. 화면 확인이 필요할 때만 수동으로 돌린다.
- `pnpm db:migrate` / `pnpm db:seed` 는 DB 를 바꾸므로 검증 단계에 넣지 않는다.
- 위 네 명령은 `.env.local` 이 있는 로컬(MariaDB 실행 중)에서 통과를 확인했다(2026-09-14). DB 없이도 `pnpm build` 가 도는지는 확인 안 됨.
- `netlify/functions/*.mts` 도 `tsc`·eslint 대상에 포함된다(tsconfig `**/*.mts`).
