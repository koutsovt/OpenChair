'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { List, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ViewToggle({ currentView }: { currentView: 'list' | 'timeline' }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setView(view: 'list' | 'timeline') {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', view);
    router.push(`/bookings?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border p-1">
      <Button
        variant={currentView === 'list' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => setView('list')}
      >
        <List className="mr-1 h-4 w-4" />
        List
      </Button>
      <Button
        variant={currentView === 'timeline' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => setView('timeline')}
      >
        <CalendarDays className="mr-1 h-4 w-4" />
        Timeline
      </Button>
    </div>
  );
}
