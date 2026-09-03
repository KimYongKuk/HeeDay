'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
      <p className="text-[15px] font-semibold">화면을 표시하지 못했습니다</p>
      <p className="text-ink-faint max-w-md text-[13px] leading-relaxed">
        일시적인 오류일 수 있습니다. 다시 시도해도 반복되면 데이터베이스 연결 상태를 확인하세요.
        {error.digest ? ` (오류 코드 ${error.digest})` : ''}
      </p>
      <Button onClick={reset} className="mt-2 h-9 font-semibold">
        다시 시도
      </Button>
    </div>
  );
}
