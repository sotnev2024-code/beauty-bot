import { Outlet } from 'react-router-dom';

import { TabBar } from '@/components/TabBar';

export function AppLayout() {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <main className="flex-1 overflow-y-auto px-4 pt-5 pb-4">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}
