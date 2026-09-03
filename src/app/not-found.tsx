import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-app p-10 text-center text-ink">
      <p className="text-[15px] font-semibold">페이지를 찾을 수 없습니다</p>
      <p className="text-[13px] text-ink-faint">주소가 잘못되었거나 삭제된 항목입니다.</p>
      <Link href="/calendar" className="mt-2 rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-deep">
        캘린더로 이동
      </Link>
    </div>
  );
}
