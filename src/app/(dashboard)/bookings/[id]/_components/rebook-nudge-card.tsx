'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquareHeart } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { sendRebookNudge } from '@/server/actions/bookings';

export function RebookNudgeCard({
  bookingId,
  clientName,
  message,
}: {
  bookingId: string;
  clientName: string;
  message: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleSend = () => {
    startTransition(async () => {
      const result = await sendRebookNudge(bookingId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Rebooking nudge sent to ${clientName}`);
      router.refresh();
    });
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-center gap-2 font-medium">
          <MessageSquareHeart className="h-4 w-4 text-primary" />
          {clientName} hasn&apos;t rebooked yet
        </div>
        <p className="whitespace-pre-wrap rounded-md border bg-background p-3 text-sm text-muted-foreground">
          {message}
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSend} disabled={isPending}>
            {isPending ? 'Sending…' : 'Send SMS nudge'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDismissed(true)}>
            Not now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
