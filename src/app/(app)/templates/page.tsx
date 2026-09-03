import { EmptyState } from '@/components/common/EmptyState';

export const metadata = { title: '프로그램 양식' };

export default function TemplatesIndexPage() {
  return (
    <EmptyState
      title="양식을 선택하세요"
      description="왼쪽 목록에서 양식을 선택하거나 새 양식을 등록합니다."
    />
  );
}
