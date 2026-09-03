import { notFound } from 'next/navigation';
import { ProgramDetail } from '@/components/programs/ProgramDetail';

export const metadata = { title: '일정' };

export default async function ProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const programId = Number(id);
  if (!Number.isInteger(programId) || programId <= 0) notFound();
  return <ProgramDetail id={programId} />;
}
