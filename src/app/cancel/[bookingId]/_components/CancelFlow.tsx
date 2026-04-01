'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface CancelFlowProps {
  bookingId: string;
  phone: string;
}

export function CancelFlow({ bookingId, phone }: CancelFlowProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleCancel() {
    setStatus('loading');
    setError('');

    try {
      const response = await fetch(`/api/v1/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, reason: 'Cancelled by client via web' }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? 'Something went wrong. Please try again.');
        setStatus('error');
        return;
      }

      setStatus('done');
    } catch {
      setError('Network error. Please check your connection and try again.');
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <svg
          className="mx-auto mb-3 h-10 w-10 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <p className="font-medium text-green-900">Booking cancelled</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Would you like to cancel this booking?</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <Button
          variant="destructive"
          onClick={handleCancel}
          disabled={status === 'loading'}
          className="flex-1"
        >
          {status === 'loading' ? 'Cancelling...' : 'Yes, cancel'}
        </Button>
      </div>
    </div>
  );
}
