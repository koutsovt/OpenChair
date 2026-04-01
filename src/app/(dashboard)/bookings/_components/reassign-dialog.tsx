'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { reassignStylistBookings } from '@/server/actions/bookings';

interface ReassignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  absentStylistId: string;
  absentStylistName: string;
  date: string;
  otherStylists: { id: string; name: string }[];
}

export function ReassignDialog({
  open,
  onOpenChange,
  absentStylistId,
  absentStylistName,
  date,
  otherStylists,
}: ReassignDialogProps) {
  const [targetStylistId, setTargetStylistId] = useState<string>('auto');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  function handleReassign() {
    startTransition(async () => {
      const target = targetStylistId === 'auto' ? undefined : targetStylistId;
      const result = await reassignStylistBookings(absentStylistId, date, target);

      if (!result.success) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        return;
      }

      const { reassigned, failed } = result;

      if (failed.length === 0) {
        toast({
          title: 'Bookings reassigned',
          description: `${reassigned} booking${reassigned !== 1 ? 's' : ''} moved successfully.`,
        });
      } else {
        toast({
          title: 'Partial reassignment',
          description: `${reassigned} moved, ${failed.length} could not be reassigned.`,
          variant: 'destructive',
        });
      }

      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Mark {absentStylistName} unavailable
          </DialogTitle>
          <DialogDescription>
            Reassign all of {absentStylistName}&apos;s bookings for this day to another team member.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Reassign to</label>
            <Select value={targetStylistId} onValueChange={setTargetStylistId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a stylist" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-assign (best available)</SelectItem>
                {otherStylists.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleReassign} disabled={isPending} variant="destructive">
              {isPending ? 'Reassigning…' : 'Reassign all bookings'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
