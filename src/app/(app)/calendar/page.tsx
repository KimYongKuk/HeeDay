import { Suspense } from 'react';
import { CalendarScreen } from '@/components/calendar/CalendarScreen';

export const metadata = { title: '캘린더' };

export default function CalendarPage() {
  return (
    <Suspense fallback={null}>
      <CalendarScreen />
    </Suspense>
  );
}
