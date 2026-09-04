/**
 * Idempotent seed. Safe to re-run: matches categories, action items and templates by name,
 * closure days by date. `--with-programs` additionally registers two sample programs through
 * the real approval path.
 */
import { config } from 'dotenv';
import { eq, sql } from 'drizzle-orm';
import { getDb, getPool } from '@/lib/db/client';
import {
  actionItems,
  categories,
  closureDays,
  programTemplates,
  templateItems,
} from '@/lib/db/schema';
import type { TagColorKey } from '@/lib/domain/colors';
import { DEFAULT_ASSIGNEE } from '@/lib/domain/defaults';
import type { ColorKey } from '@/lib/domain/enums';
import { KR_HOLIDAY_SEED } from '@/lib/services/holidays';

config({ path: '.env.local' });
config();

const CATEGORIES: { name: string; color: TagColorKey }[] = [
  { name: '기획', color: 'indigo' },
  { name: '행정', color: 'stone' },
  { name: '홍보', color: 'amber' },
  { name: '운영', color: 'green' },
  { name: '정산', color: 'teal' },
  { name: '보고', color: 'rose' },
];

interface ActionItemSeed {
  name: string;
  category: string;
  description?: string;
  checklist?: string[];
}

const ACTION_ITEMS: ActionItemSeed[] = [
  { name: '기획서 작성', category: '기획', checklist: ['사업 목적·대상 정리', '예산안 첨부'] },
  { name: '예산 신청', category: '기획', checklist: ['품의서 작성'] },
  { name: '사업계획서 제출', category: '기획', checklist: ['계획서 작성', '결재', '군청 제출'] },
  { name: '중간 점검 회의', category: '기획' },
  {
    name: '강사 섭외 · 계약',
    category: '행정',
    checklist: ['후보 연락', '이력서 수령', '계약서 작성', '계약서 서명'],
  },
  { name: '강사 계약서 회수', category: '행정' },
  { name: '공문 발송', category: '행정' },
  { name: '강사 최종 확인', category: '행정' },
  { name: '참여자 모집 홍보', category: '홍보', checklist: ['현수막', '안내문 게시', '문자 발송'] },
  { name: '모집 공고 게시', category: '홍보' },
  { name: '현수막 제작', category: '홍보' },
  {
    name: '준비물 점검',
    category: '운영',
    description:
      '회차 전날 강의실과 준비물을 확인합니다. 체크리스트는 양식별로 조정할 수 있습니다.',
    checklist: [
      '출석부 · 명찰',
      '강의자료 출력',
      '다과 · 생수',
      '음향 · 빔프로젝터 확인',
      '강사 도착 시간 재확인',
    ],
  },
  { name: '출석부 정리', category: '운영' },
  { name: '사진 정리', category: '운영' },
  { name: '참여자 면접', category: '운영', checklist: ['면접 질문지', '평가표'] },
  { name: '오리엔테이션 준비', category: '운영', checklist: ['안내문', '명찰', '출석부', '다과'] },
  { name: '강사비 지급', category: '정산' },
  { name: '영수증 제출', category: '정산' },
  { name: '만족도 조사', category: '보고' },
  { name: '결과보고서 작성', category: '보고' },
  { name: '수료증 발주', category: '보고' },
];

interface TemplateItemSeed {
  item: string;
  required?: boolean;
}

interface TemplateSeed {
  name: string;
  color: ColorKey;
  description?: string;
  defaultAssignee?: string;
  items: TemplateItemSeed[];
}

const TEMPLATES: TemplateSeed[] = [
  {
    name: '웰다잉 프로그램',
    color: 'rose',
    description: '삶의 마무리를 준비하는 6회기 교육 프로그램',
    defaultAssignee: DEFAULT_ASSIGNEE,
    items: [
      { item: '기획서 작성' },
      { item: '예산 신청' },
      { item: '강사 섭외 · 계약' },
      { item: '참여자 모집 홍보', required: false },
      { item: '강사 최종 확인' },
      { item: '준비물 점검' },
      { item: '출석부 정리' },
      { item: '중간 점검 회의', required: false },
      { item: '만족도 조사' },
      { item: '강사비 지급' },
      { item: '결과보고서 작성' },
    ],
  },
  {
    name: '스마트폰 활용교실',
    color: 'amber',
    description: '어르신 대상 스마트폰 기초 활용 교육',
    defaultAssignee: DEFAULT_ASSIGNEE,
    items: [
      { item: '강사 섭외 · 계약' },
      { item: '참여자 모집 홍보' },
      { item: '준비물 점검' },
      { item: '출석부 정리' },
      { item: '수료증 발주' },
      { item: '강사비 지급' },
      { item: '결과보고서 작성' },
    ],
  },
  {
    name: '실버 건강체조',
    color: 'green',
    description: '상시 운영 건강체조',
    defaultAssignee: DEFAULT_ASSIGNEE,
    items: [
      { item: '강사 섭외 · 계약' },
      { item: '준비물 점검' },
      { item: '출석부 정리' },
      { item: '강사비 지급' },
    ],
  },
  {
    name: '노인일자리 사업',
    color: 'blue',
    defaultAssignee: DEFAULT_ASSIGNEE,
    items: [
      { item: '사업계획서 제출' },
      { item: '모집 공고 게시' },
      { item: '참여자 면접' },
      { item: '오리엔테이션 준비' },
      { item: '결과보고서 작성' },
    ],
  },
  {
    name: '미술치료',
    color: 'violet',
    items: [
      { item: '기획서 작성' },
      { item: '강사 섭외 · 계약' },
      { item: '준비물 점검' },
      { item: '출석부 정리' },
      { item: '만족도 조사' },
      { item: '결과보고서 작성' },
    ],
  },
  {
    name: '명절 행사',
    color: 'teal',
    items: [
      { item: '기획서 작성' },
      { item: '예산 신청' },
      { item: '공문 발송' },
      { item: '현수막 제작' },
      { item: '사진 정리' },
      { item: '영수증 제출' },
      { item: '결과보고서 작성' },
    ],
  },
];

async function seedCategories() {
  const db = getDb();
  const idByName = new Map<string, number>();
  for (const [index, c] of CATEGORIES.entries()) {
    const existing = await db.query.categories.findFirst({
      where: eq(categories.name, c.name),
      columns: { id: true },
    });
    if (existing) {
      idByName.set(c.name, existing.id);
      continue;
    }
    const [res] = await db
      .insert(categories)
      .values({ name: c.name, color: c.color, sortOrder: index + 1 });
    idByName.set(c.name, res.insertId);
  }
  return idByName;
}

async function seedActionItems(categoryIdByName: Map<string, number>) {
  const db = getDb();
  const idByName = new Map<string, number>();
  for (const seed of ACTION_ITEMS) {
    const existing = await db.query.actionItems.findFirst({
      where: eq(actionItems.name, seed.name),
      columns: { id: true },
    });
    if (existing) {
      idByName.set(seed.name, existing.id);
      continue;
    }
    const categoryId = categoryIdByName.get(seed.category);
    if (!categoryId) throw new Error(`Unknown category in seed: ${seed.category}`);
    const [res] = await db.insert(actionItems).values({
      name: seed.name,
      categoryId,
      description: seed.description ?? null,
      defaultChecklist: seed.checklist ?? [],
    });
    idByName.set(seed.name, res.insertId);
  }
  return idByName;
}

async function seedTemplates(actionIdByName: Map<string, number>) {
  const db = getDb();
  let created = 0;
  for (const seed of TEMPLATES) {
    let template = await db.query.programTemplates.findFirst({
      where: eq(programTemplates.name, seed.name),
      columns: { id: true },
    });
    if (!template) {
      const [res] = await db.insert(programTemplates).values({
        name: seed.name,
        color: seed.color,
        description: seed.description ?? null,
        defaultAssignee: seed.defaultAssignee ?? null,
      });
      template = { id: res.insertId };
      created += 1;
    }
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(templateItems)
      .where(eq(templateItems.templateId, template.id));
    if (Number(count) > 0) continue;

    await db.insert(templateItems).values(
      seed.items.map((it, index) => {
        const actionItemId = actionIdByName.get(it.item);
        if (!actionItemId) throw new Error(`Unknown action item in seed: ${it.item}`);
        return {
          templateId: template!.id,
          actionItemId,
          required: it.required ?? true,
          checklistOverride: null,
          sortOrder: index,
        };
      }),
    );
  }
  return created;
}

async function seedClosures() {
  const db = getDb();
  await db
    .insert(closureDays)
    .values(
      KR_HOLIDAY_SEED.map((h) => ({ date: h.date, name: h.name, kind: h.kind, source: 'seed' })),
    )
    .onDuplicateKeyUpdate({ set: { name: sql`values(name)`, kind: sql`values(kind)` } });
}

async function seedPrograms() {
  try {
    const modulePath = '../src/lib/services/samplePrograms';
    const mod = (await import(modulePath)) as { seedSamplePrograms: () => Promise<void> };
    await mod.seedSamplePrograms();
    console.log('sample programs registered');
  } catch (err) {
    console.warn('--with-programs skipped:', (err as Error).message);
  }
}

async function main() {
  const withPrograms = process.argv.includes('--with-programs');
  const categoryIds = await seedCategories();
  console.log(`categories: ${categoryIds.size}`);
  const ids = await seedActionItems(categoryIds);
  console.log(`action items: ${ids.size}`);
  const created = await seedTemplates(ids);
  console.log(`templates: ${TEMPLATES.length} (${created} created)`);
  await seedClosures();
  console.log(`closure days: ${KR_HOLIDAY_SEED.length}`);
  if (withPrograms) await seedPrograms();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => getPool().end());
