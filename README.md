# HeeDay

달성군남부노인복지관 프로그램 일정 관리. 프로그램 양식(상대 날짜로 정의한 할 일)에 기간과 회차를 넣으면 캘린더에 할 일이 자동 배치됩니다.

## 로컬 실행

요구 사항: Node 22, pnpm 10, MySQL 호환 DB(로컬 MariaDB 11.8 또는 `docker compose up -d`).

```bash
cp .env.example .env.local      # DATABASE_URL 확인
pnpm install
pnpm db:migrate                 # 테이블 생성
pnpm db:seed --with-programs    # 분류·할 일 항목·양식·공휴일 + 샘플 일정 2건
pnpm dev                        # http://localhost:3000
```

검증 명령: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm smoke`(개발 서버 실행 중일 때 화면 스크린샷과 콘솔 오류 확인).

## 구조

- `src/app` 화면과 API Route Handler. 별도 백엔드 없음.
- `src/lib/services/placement.ts` 배치 도우미(경고 판정, 균등 배치 옵션. 순수 함수, Vitest).
- `src/lib/db` Drizzle 스키마·리포지토리. 마이그레이션은 `drizzle/`.
- `design/` 초기 디자인 목업(참고용).

도메인 규칙과 개발 주의사항은 `CLAUDE.md`에 있습니다.

## 배포

1. **DB 준비.** TiDB Serverless 또는 Aiven MySQL에서 `heeday` 데이터베이스를 만듭니다. 둘 다 TLS 필수입니다.
2. **마이그레이션.** 로컬에서 운영 DB를 가리키고 실행합니다.
   ```bash
   DATABASE_URL="mysql://..." DATABASE_SSL=1 pnpm db:migrate
   DATABASE_URL="mysql://..." DATABASE_SSL=1 pnpm db:seed   # 분류·공휴일 등 기본 데이터
   ```
3. **앱 배포.** GitHub 저장소를 Netlify 또는 Vercel에 연결합니다. 환경 변수 `DATABASE_URL`, `DATABASE_SSL=1`을 설정합니다. `netlify.toml`이 포함되어 있고 Vercel은 설정 없이 동작합니다.
4. **확인.** `https://<도메인>/api/health` 가 `{"ok":true}`를 반환하면 DB 연결이 정상입니다.

주의: 무료 서버리스 함수는 실행 시간이 짧습니다. 이 앱의 요청은 모두 밀리초 단위라 문제가 없지만, DB 커넥션 풀은 인스턴스당 3개로 제한되어 있습니다(`src/lib/db/client.ts`).

## 데이터

어르신 개인정보는 저장하지 않습니다. 프로그램명, 일정, 할 일, 담당자 이름만 다룹니다.
