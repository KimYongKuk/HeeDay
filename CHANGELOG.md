# Changelog

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
