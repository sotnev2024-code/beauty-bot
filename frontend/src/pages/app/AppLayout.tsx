import { Outlet } from 'react-router-dom';

import { TabBar } from '@/components/TabBar';
import { useTelegramBack } from '@/hooks/useTelegramBack';

export function AppLayout() {
  useTelegramBack();
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <main className="flex-1 overflow-y-auto px-4 pt-5 pb-4">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}
