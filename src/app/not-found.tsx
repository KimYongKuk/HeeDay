import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="bg-app text-ink flex min-h-dvh flex-col items-center justify-center gap-3 p-10 text-center">
      <p className="text-[15px] font-semibold">페이지를 찾을 수 없습니다</p>
      <p className="text-ink-faint text-[13px]">주소가 잘못되었거나 삭제된 항목입니다.</p>
      <Link
        href="/calendar"
        className="bg-brand hover:bg-brand-deep mt-2 rounded-lg px-4 py-2 text-[13px] font-semibold text-white"
      >
        캘린더로 이동
      </Link>
    </div>
  );
}
