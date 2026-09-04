# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

HeeDay is a program/schedule management app for a Korean senior welfare center (달성군남부노인복지관). A Next.js 16 app lives at the repo root (scaffolded 2026-09-03); `design/` holds the reference mockups. Next.js 16 has breaking changes vs. older training data — see `AGENTS.md` (maintained by `next dev`) and `node_modules/next/dist/docs/` before writing framework code.

The UI language is Korean. Keep all user-facing strings in Korean and use the existing terminology below rather than inventing translations.

## Stack and commands

- Next.js 16 App Router + TypeScript, pnpm, Tailwind v4, shadcn/ui (`base-nova` style on `@base-ui/react`, components in `src/components/ui`), TanStack Query, react-hook-form + zod v4, Zustand, dnd-kit, date-fns, Drizzle ORM + mysql2, Vitest.
- No separate backend: Route Handlers under `src/app/api/*` call services in `src/lib/services/*`; DB access in `src/lib/db/*`. AI (AWS Bedrock) is a seam only in `src/lib/ai/`.
- Local DB: MariaDB 11.8 installed on the dev PC (`mysql://heeday:heeday@127.0.0.1:3306/heeday`, see `.env.example`). `docker-compose.yml` is an optional MySQL 8 alternative. Production target is a MySQL-compatible managed DB (TiDB Serverless / Aiven), so use only standard MySQL SQL: no `RETURNING`, no JSON column defaults, no MariaDB-only syntax.

```
pnpm dev            # http://localhost:3000 (redirects to /calendar)
pnpm build          # production build (also the strictest type check)
pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint .
pnpm test           # vitest run (src/**/*.test.ts)
pnpm db:generate    # drizzle-kit generate -> drizzle/*.sql (after editing src/lib/db/schema.ts)
pnpm db:migrate     # apply migrations (scripts/migrate.ts)
pnpm db:seed        # idempotent seed (scripts/seed.ts); --with-programs registers sample programs
pnpm db:studio      # drizzle-kit studio
pnpm smoke [outDir] # Playwright: screenshots + console errors for every screen (needs `pnpm dev` running)
```

Gotchas learned:
- Drizzle drops table qualifiers when the outer query has a single table, so a correlated subquery must qualify the outer column itself: `` sql`(select count(*) from ${child} c where c.parent_id = ${parent}.id)` `` (see `src/lib/db/repos/templates.ts`). `${parent.id}` renders as bare `id` and silently matches the inner table.
- React Compiler lint (`react-hooks/set-state-in-effect`, `react-hooks/refs`) is on: derive state during render with a `syncedFrom` marker instead of `useEffect` + `setState`; keep refs out of render.
- shadcn here is the `base-nova` style on `@base-ui/react`: `Select` takes `items` for labels, triggers compose via `render={<Comp/>}` (add `nativeButton={false}` for non-button triggers), `onValueChange(value, eventDetails)`.
- `CommandDialog` in this shadcn version does NOT render a `<Command>` root; wrap `CommandInput`/`CommandList` in `<Command>` yourself or cmdk throws "Cannot read properties of undefined (reading 'subscribe')".

## Domain rules that are decided (do not re-propose)

- A program template is just an **ordered list of action items** (plus required flag and optional checklist override). There are **no phases (준비/진행/정리), no anchors, no offsets, no example dates, and no session rules**. All of those were removed on 2026-09-03 by the user; do not reintroduce them.
- Scheduling is manual: in the registration wizard step 3 the user places each template task on a date (date picker or drag onto the period calendar). Nothing is auto-placed; "남은 항목 균등 배치" is an optional button the user presses. Weekend/closure/out-of-range dates are only warned about (`src/lib/services/placement.ts` `dateWarning`), never moved.
- **회차 exist only inside wizard step 3**, added on 2026-09-04. A task can occur several times in one program: press 회차 추가 on its row, or drag an already-dated row onto another day. Templates still carry no 회차 count and the DB has no session column. `buildWizardDrafts` clones the base draft per occurrence, numbers the group 1..n **by date** (unplaced last), and approval bakes the number into the title (`수업 진행 2회차`). A task placed once stays unnumbered. Store keys: `item:3` / `adhoc:<uuid>` for the base, `<baseKey>#<uuid>` for each extra 회차, tracked in `wizardStore.occurrences`.
- There is no overdue (지연) concept in the UI for now. The right panel shows 오늘, 이번 주, 프로그램 현황 (done/total).
- Approval snapshots the template into `programs.template_snapshot` and stores the tasks exactly as placed; editing a template never changes registered programs.
- Dates are `'YYYY-MM-DD'` strings end to end (`src/lib/utils/dates.ts`); "today" is Asia/Seoul via `todayInSeoul()`.
- No login in the MVP. Do not store 어르신 personal data. The single staff user is `DEFAULT_ASSIGNEE` in `src/lib/domain/defaults.ts` (노성희); it prefills the wizard 담당자 field, the seed templates and the placeholders.
- The wizard draft persists in localStorage (`heeday.wizard.v2`, `src/stores/wizardStore.ts`) **on purpose**: leaving to the calendar and coming back resumes the same draft at the same step. 새로 시작 clears it, 초안으로 저장 leaves and keeps it. Do not "fix" this into a reset-on-entry flow.
- Switching to a **different** template in step 1 clears the task side (placements, 회차, exclusions, hand-added 할 일) and takes the new template's color, but keeps 기간 and 담당자 because those describe the program, not the template. 일정 이름 follows the new template unless the user typed their own (compared against `nameSuggestion`). `StepTemplate` confirms first via `draftWorkCount` and then reports both halves in a toast; never make this switch silent.
- Enum codes in DB are ASCII (`PREP/RUN/WRAP`, `START/END/EACH_SESSION/SESSION_N`, …); Korean labels live in `src/lib/domain/labels.ts`. Categories are rows, not enums.

## Design artboards (`design/*.dc.html`)

These are Claude Design canvas artboards, not standalone pages. Each is a fixed 1440×900 frame wrapped in `<x-dc><helmet>…</helmet>…</x-dc>` and references `./support.js`, which is intentionally absent. Do not "fix" them into normal HTML; edit them as artboards or use them as the spec for implementation.

| File | View | Notes |
|---|---|---|
| `Main.dc.html` | Month (월) | Source of truth for the app shell (top bar, left nav, right panel) |
| `Week.dc.html` | Week (주) | 7 columns, session cards + task rows |
| `Timeline.dc.html` | Timeline (타임라인) | Gantt-style: one row per program, 8 week columns |
| `Wizard.dc.html` | 일정 등록 마법사 3단계 | Mockup shows phase groups and computed dates; the product's step 3 is manual placement instead |
| `Template.dc.html` | 프로그램 양식 편집 | Mockup shows 기준점/오프셋/예시 날짜 columns; the product has a plain ordered list |
| `Library.dc.html` | 할 일 목록 관리 | List + detail with checklist editor |

The mockups predate the simplification: phases, anchors, offsets and overdue shown there do not exist in the product, and their 회차 are scheduled entities rather than the per-task occurrences the wizard now has.

Month view right panel sections: **오늘**, **이번 주** (upcoming undone tasks), **프로그램 현황** (done/total per program).

## Domain model

- **할 일 항목 (action item)** — reusable task definition: name, category (기획/행정/홍보/운영/정산/보고), default checklist. Shared by templates.
- **프로그램 양식 (template)** — name, color, ordered template items. Each item = action item + required flag + optional checklist override. Order is the only scheduling hint.
- **일정 (program)** — a template instance with name, start/end, 담당자, color, snapshot, and the tasks the user placed.
- **할 일 (task)** — checkbox item on a date; 완료 shows strikethrough; optional checklist and notes.
- **휴관일 / 공휴일** — closure days tint the day cell and show a label next to the date; in the wizard they only produce a warning tag.

Left nav order: 캘린더 · 할 일 목록 · 프로그램 양식 · 휴관일 · (spacer) · 설정 (할 일 목록 is the master; templates are built from it).

Categories (분류) are a user-managed table (`categories`), not an enum: staff add/remove tabs with the +/− buttons on the 할 일 목록 screen. A category with items cannot be deleted. Tasks keep a denormalized `category_name` so history survives deletion.

Copy style: business register, no em-dashes, no chatty phrasing ("~해 보세요", "함께 씁니다"). Prefer short noun phrases and "~합니다/~됩니다".

## Visual conventions

- Font: Pretendard Variable (npm `pretendard`, imported in `src/app/layout.tsx`) with `font-feature-settings: "tnum"`. The mockups used IBM Plex Sans KR only because Google Fonts lacks Pretendard.
- Design tokens are Tailwind theme colors in `src/app/globals.css` (`bg-app`, `bg-surface`, `border-line`, `text-ink`, `text-ink-muted`, `text-ink-faint`, `bg-brand`, `text-sun`, `text-sat`, …); program palettes are in `src/lib/domain/colors.ts`.
- Neutrals: page bg `#f4f3f0`, surface `#ffffff`, border `#e7e5e0`, text `#1b1a18`, muted `#6b6963` / `#8b8983`. Accent/brand `#4b5bd6` (used for "today" markers and the logo).
- Week starts **Monday**. Saturday is blue (`#6f86c4`), Sunday and holidays are red (`#c2413f`). Weekend cells use `#faf9f7`; today's cell uses `#f7f8fe`.
- Each program has a fixed palette triple — a solid dot/lane color, a tinted chip background, and a dark chip text color:

| Program | Solid | Chip bg | Chip text |
|---|---|---|---|
| 웰다잉 프로그램 | `#e26b82` | `#fbe7ea` | `#a12c42` |
| 스마트폰 활용교실 | `#e2a53a` | `#fbefd6` | `#8a5a09` |
| 실버 건강체조 | `#4faa72` | `#e2f2e7` / `#b6dcc3` | `#1f6b3e` |
| 하반기 노인일자리 | `#5b8ae0` | `#e3ecfb` / `#b7c9ef` | `#24509a` |

- Element vocabulary: **sessions** render as bordered white pills (`.sess`) or filled cards (`.card`); **tasks** render as tinted chips with a checkbox (`.chip` / `.task`); a program's active date span renders as a thin 4px **lane** under the day-number row in month view, and as phase **segments** (준비/진행/정리) with circular **milestones** for sessions and diamond markers for tasks in timeline view.
