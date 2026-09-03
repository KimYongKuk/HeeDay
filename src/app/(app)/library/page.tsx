import { Suspense } from 'react';
import { LibraryScreen } from '@/components/library/LibraryScreen';

export const metadata = { title: '할 일 목록' };

export default function LibraryPage() {
  return (
    <Suspense fallback={null}>
      <LibraryScreen />
    </Suspense>
  );
}
