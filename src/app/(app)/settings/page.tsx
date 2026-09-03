import { PageHeader } from '@/components/common/PageHeader';
import { SettingsScreen } from '@/components/settings/SettingsScreen';

export const metadata = { title: '설정' };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="설정" />
      <div className="flex flex-1 border-t border-line bg-surface">
        <SettingsScreen />
      </div>
    </>
  );
}
