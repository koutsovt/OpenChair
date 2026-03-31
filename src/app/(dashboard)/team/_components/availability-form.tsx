'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateAvailability } from '@/server/actions/team';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 6; h <= 22; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 22) {
      slots.push(`${String(h).padStart(2, '0')}:30`);
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

interface DayAvailability {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface AvailabilityFormProps {
  stylistId: string;
  existing: DayAvailability[];
}

function buildInitialState(existing: DayAvailability[]): DayAvailability[] {
  return Array.from({ length: 7 }, (_, i) => {
    const found = existing.find((e) => e.dayOfWeek === i);
    return found ?? { dayOfWeek: i, startTime: '09:00', endTime: '17:00', isActive: false };
  });
}

export function AvailabilityForm({ stylistId, existing }: AvailabilityFormProps) {
  const [days, setDays] = useState<DayAvailability[]>(() => buildInitialState(existing));
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function updateDay(dayOfWeek: number, update: Partial<DayAvailability>) {
    setDays((prev) => prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...update } : d)));
  }

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateAvailability(stylistId, days);
      if (result?.error) {
        setMessage(result.error);
      } else {
        setMessage('Availability saved');
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {days.map((day) => (
          <div key={day.dayOfWeek} className="flex items-center gap-4 rounded-lg border p-3">
            <div className="flex w-28 items-center gap-2">
              <Switch
                checked={day.isActive}
                onCheckedChange={(checked) => updateDay(day.dayOfWeek, { isActive: checked })}
              />
              <Label className="text-sm font-medium">{DAY_NAMES[day.dayOfWeek]}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={day.startTime}
                onValueChange={(value) => updateDay(day.dayOfWeek, { startTime: value })}
                disabled={!day.isActive}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">to</span>
              <Select
                value={day.endTime}
                onValueChange={(value) => updateDay(day.dayOfWeek, { endTime: value })}
                disabled={!day.isActive}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>
      {message && (
        <p
          className={`text-sm font-medium ${message.includes('saved') ? 'text-green-600' : 'text-destructive'}`}
        >
          {message}
        </p>
      )}
      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? 'Saving...' : 'Save Availability'}
      </Button>
    </div>
  );
}
