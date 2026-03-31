'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { StylistForm } from './stylist-form';
import { createStylist } from '@/server/actions/team';

export function AddStylistDialog() {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    const result = await createStylist(formData);
    if (result?.success) {
      setOpen(false);
    }
    return result;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Add Stylist
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Stylist</DialogTitle>
          <DialogDescription>Add a new stylist to your team.</DialogDescription>
        </DialogHeader>
        <StylistForm onSubmit={handleSubmit} submitLabel="Add Stylist" />
      </DialogContent>
    </Dialog>
  );
}
