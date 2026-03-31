'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { format, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function DatePickerNav({ currentDate }: { currentDate: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const date = new Date(currentDate);

  function navigate(newDate: Date) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('date', format(newDate, 'yyyy-MM-dd'));
    router.push(`/bookings?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={() => navigate(subDays(date, 1))}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-[180px]">
            {format(date, 'EEEE, d MMM yyyy')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar mode="single" selected={date} onSelect={(d) => d && navigate(d)} initialFocus />
        </PopoverContent>
      </Popover>

      <Button variant="outline" size="icon" onClick={() => navigate(addDays(date, 1))}>
        <ChevronRight className="h-4 w-4" />
      </Button>

      <Button variant="ghost" size="sm" onClick={() => navigate(new Date())} className="ml-2">
        Today
      </Button>
    </div>
  );
}
