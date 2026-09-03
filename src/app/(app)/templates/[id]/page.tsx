import { notFound } from 'next/navigation';
import { TemplateEditor } from '@/components/templates/TemplateEditor';

export const metadata = { title: '프로그램 양식' };

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const templateId = Number(id);
  if (!Number.isInteger(templateId) || templateId <= 0) notFound();
  return <TemplateEditor id={templateId} />;
}
