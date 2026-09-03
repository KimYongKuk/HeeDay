/**
 * HeeDay 로고.
 * 마크: 브랜드 블루 타일 위에 "희"의 초성 ㅎ. ㅇ 자리는 하트.
 * 동일 도형이 public/logo.svg, public/logo-mark.svg, src/app/icon.svg 에도 있으니 수정 시 함께 맞춥니다.
 */

const HEART =
  'M16 26.5C16 26.5 9.5 22.6 9.5 18.3C9.5 16.1 11.1 14.6 13 14.6C14.3 14.6 15.3 15.3 16 16.3C16.7 15.3 17.7 14.6 19 14.6C20.9 14.6 22.5 16.1 22.5 18.3C22.5 22.6 16 26.5 16 26.5Z';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="8" fill="#4b5bd6" />
      <g stroke="#fff" strokeWidth="2.6" strokeLinecap="round" fill="none">
        <path d="M16 6.2v2.8" />
        <path d="M9.5 11.6h13" />
      </g>
      <path d={HEART} fill="#ff9db1" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark className="size-[26px] shrink-0" />
      <span className="text-ink text-[15px] font-semibold tracking-[-0.01em]">HeeDay</span>
    </span>
  );
}
