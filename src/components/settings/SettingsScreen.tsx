'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

interface Health {
  ok: boolean;
  db: 'up' | 'down';
  latencyMs?: number;
  time: string;
}

export function SettingsScreen() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await fetch('/api/health', { cache: 'no-store' });
      return (await res.json()) as Health;
    },
    refetchInterval: 30_000,
  });

  return (
    <div className="flex w-full max-w-[640px] flex-col gap-4 p-6">
      <section className="rounded-xl border border-line bg-surface p-[18px]">
        <h2 className="text-[13.5px] font-semibold">기관</h2>
        <dl className="mt-3 grid grid-cols-[120px_minmax(0,1fr)] gap-y-2 text-[13.5px]">
          <dt className="text-ink-faint">기관명</dt>
          <dd>달성군남부노인복지관</dd>
          <dt className="text-ink-faint">기준 시간대</dt>
          <dd>Asia/Seoul</dd>
          <dt className="text-ink-faint">휴관일</dt>
          <dd>
            <Link href="/closures" className="text-brand hover:underline">
              휴관일 관리
            </Link>
          </dd>
        </dl>
      </section>

      <section className="rounded-xl border border-line bg-surface p-[18px]">
        <h2 className="text-[13.5px] font-semibold">시스템</h2>
        <dl className="mt-3 grid grid-cols-[120px_minmax(0,1fr)] gap-y-2 text-[13.5px]">
          <dt className="text-ink-faint">데이터베이스</dt>
          <dd className="flex items-center gap-2">
            <span
              className={`size-2 rounded-full ${health.data?.ok ? 'bg-[#4faa72]' : health.isLoading ? 'bg-ink-ghost' : 'bg-sun'}`}
            />
            {health.isLoading ? '확인 중' : health.data?.ok ? `정상 (${health.data.latencyMs}ms)` : '연결 실패'}
          </dd>
          <dt className="text-ink-faint">서버 시간</dt>
          <dd>{health.data?.time ? new Date(health.data.time).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '-'}</dd>
          <dt className="text-ink-faint">단축키</dt>
          <dd>Ctrl K 또는 ⌘ K: 검색 및 명령</dd>
        </dl>
      </section>
    </div>
  );
}
