'use client';

import { useState } from 'react';
import { Calendar, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateCalendarLink } from '@/server/actions/team';

interface CalendarSyncButtonProps {
  stylistId: string;
}

export function CalendarSyncButton({ stylistId }: CalendarSyncButtonProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    const result = await generateCalendarLink(stylistId);
    setLoading(false);
    if (result.success) {
      setUrl(result.url);
    }
  }

  async function handleCopy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!url) {
    return (
      <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading}>
        <Calendar className="h-4 w-4" />
        {loading ? 'Generating...' : 'Calendar Sync'}
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Subscribe to this URL in Google Calendar or Apple Calendar:
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{url}</code>
        <Button variant="outline" size="icon" onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
