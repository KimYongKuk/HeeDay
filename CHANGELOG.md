# Changelog

## [2026-09-15] - 담당자 부재(휴가·출장) 표시와 휴관·부재 화면 통합

- **추가** [drizzle/0003_absences.sql, src/lib/db/schema.ts, src/lib/db/repos/absences.ts, src/app/api/absences] 담당자 부재 기간 테이블 `absences`(시작일~종료일, 구분 휴가/출장/기타, 이름, 최대 90일)와 `GET/POST /api/absences`, `DELETE /api/absences/:id`. 히의 요구는 "특정 할 일의 출장 여부"가 아니라 "그 날 자리에 있는지"라서 할 일 플래그 대신 날짜 단위로 잡음. 휴관일 테이블에 종류를 얹지 않고 분리한 이유는 부재가 기간 단위이고 공휴일과 겹치며(휴관일은 날짜 고유 제약) 의미도 다르기 때문. **마이그레이션 필요** → [상세](docs/history/2026-09-15_부재-휴가-출장-표시.md)
- **추가** [src/components/calendar/AbsenceBadge.tsx, DayCell.tsx, WeekView.tsx, MobileMonth.tsx, RightPanel.tsx, src/app/globals.css] 월·주·모바일 캘린더의 날짜 숫자 옆에 구분별 아이콘(출장 위치핀, 휴가 야자수, 기타 사람)과 이름, 셀에는 휴관일의 붉은색과 구분되는 옅은 호박색(`bg-away-soft`/`text-away`). 휴관일 이름이 있는 날은 아이콘만 남긴다. 우측 패널 오늘 섹션 위에 오늘 부재 한 줄 → [상세](docs/history/2026-09-15_부재-휴가-출장-표시.md)
- **개선** [src/components/closures/ClosuresScreen.tsx, AbsenceForm.tsx, src/components/calendar/QuickAdd.tsx, SideNav.tsx, MobileNav.tsx, CommandPalette.tsx] 휴관일 화면을 **휴관·부재**로 확장(경로 `/closures` 유지): 목록에 두 종류가 날짜순으로 섞이고, 오른쪽 폼은 휴관일/부재 탭. 날짜 셀 `+` 팝오버에도 "이 날 부재 표시" 링크로 같은 폼을 띄워 메뉴를 찾아가지 않아도 되게 함. 자동 이동이 사라진 뒤에도 남아 있던 "직전 근무일로 조정됩니다" 부제를 사실에 맞게 고침 → [상세](docs/history/2026-09-15_부재-휴가-출장-표시.md)
- **개선** [src/lib/services/placement.ts, src/components/wizard/StepPlace.tsx, RepeatPopover.tsx] 마법사 3단계에서 부재일을 휴관일과 같은 "일할 수 없는 날"로 취급: `dateWarning` 에 `ABSENCE`("부재") 경고 추가(우선순위 기간 외 > 휴관 > 부재 > 주말), 균등 배치·반복 배치가 부재일을 건너뛴다. 기존 원칙대로 옮기지는 않는다 → [상세](docs/history/2026-09-15_부재-휴가-출장-표시.md)
- **개선** [CLAUDE.md] 부재 도메인 규칙(휴관과 합치지 말 것, 단일 직원, 경고 전용)과 nav 이름 반영
- **추가** [scripts/migrate.ts, package.json, .env.example, .claude/ship.md] `pnpm db:migrate:prod`: `.env.local` 의 `PROD_DATABASE_URL` 로 운영 DB 마이그레이션. 운영 URL 을 앱이 읽는 `DATABASE_URL` 에 넣지 않으려는 분리이고, 2026-09-14 비밀번호 재발급 장애 뒤 접속값 규칙을 문서에 고정

## [2026-09-14] - 히 요청 기능(반복 배치·중요 표시·메모·일정 수정)과 Netlify keepalive

- **추가** [src/components/wizard/RepeatPopover.tsx, src/lib/services/placement.ts, src/stores/wizardStore.ts] 일정 등록 3단계에서 날짜가 있는 할 일을 매주·2주마다·매월 같은 날짜·매월 같은 주차 요일로 반복해 회차로 한 번에 펼치는 반복 버튼. 규칙은 저장하지 않고 `repeatDates()` 결과를 `addOccurrences()` 로 회차에 넣기만 해서 기존 회차 모델·DB 를 그대로 둔다. 기간 밖은 만들지 않고 상한 60회 → [상세](docs/history/2026-09-14_반복배치-중요표시-메모-일정수정.md)
- **추가** [drizzle/0001_task_important.sql, src/lib/db/schema.ts, src/components/calendar/TaskChip.tsx, TaskPopover.tsx, QuickAdd.tsx, RightPanel.tsx] 할 일 **중요(★)** 표시. 히가 제목에 `★` 를 손으로 붙이던 것을 `tasks.important` 로 대체. 마법사 행(회차별)·팝오버·빠른 추가에서 토글, 칩에 별, 우측 패널 **중요** 섹션(월과 무관한 미완료 전체, `GET /api/tasks?important=1`). **마이그레이션 필요** → [상세](docs/history/2026-09-14_반복배치-중요표시-메모-일정수정.md)
- **추가** [drizzle/0002_memos.sql, src/lib/db/repos/memos.ts, src/app/api/memos, src/components/memos, src/app/(app)/memos] 못한 일·해야 할 일을 적는 **메모**. 메모 단위로 프로그램 하나를 `#` 피커로 태그(등록 후 변경·해제 가능, 본문 파싱 없음). 우측 패널은 최근 3건 + `+` 팝오버로만 두고, `/memos` 전체 페이지와 프로그램 상세에 목록. 좌측 nav·모바일 탭에 메모 추가. **마이그레이션 필요** → [상세](docs/history/2026-09-14_반복배치-중요표시-메모-일정수정.md)
- **추가** [src/components/programs/ProgramEditDialog.tsx, src/lib/domain/zod.ts programPatchSchema] 등록된 일정의 이름·기간·담당자·색 수정 다이얼로그. 기간에 `startDate`/`endDate` PATCH 허용. 기간을 줄여도 할 일은 옮기지 않고 "기간 밖 N건" 만 알린다 → [상세](docs/history/2026-09-14_반복배치-중요표시-메모-일정수정.md)
- **개선** [src/lib/services/calendarLayout.ts compareDayTasks] 날짜 셀·패널 안 정렬을 미완료 → 중요 → 등록순으로 통일
- **개선** [CLAUDE.md] 반복 배치·중요·메모·일정 수정 규칙, nav 순서, DB 타임스탬프가 KST 벽시계를 `Z` 로 돌려준다는 주의 추가
- **추가** [netlify/functions/keepalive.mts] 평일 KST 07–19시 15분마다 `/api/health` 를 호출해 Next.js 서버 핸들러와 TiDB Serverless 의 콜드 스타트를 막는 Netlify Scheduled Function. 유휴 후 첫 응답 5.9초(DB 1.9초)가 보통 1초 안팎이 되게 한다. **배포 필요** (다른 변경과 묶어서) → [상세](docs/history/2026-09-14_netlify-keepalive-함수.md)
- **추가** [.claude/verify.md, .claude/ship.md] verify·ship 스킬용 검증·배포 절차. Netlify Free 크레딧(production 배포 1회 = 15, 월 300) 잔량 확인을 배포 사전 조건으로 넣음
- **개선** [README.md] 배포 절에 keepalive 항목
