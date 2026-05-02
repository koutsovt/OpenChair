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
import { ClientForm } from './client-form';
import { createClient } from '@/server/actions/clients';

interface AddClientDialogProps {
  stylists?: { id: string; name: string }[];
}

export function AddClientDialog({ stylists = [] }: AddClientDialogProps) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    const result = await createClient(formData);
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
          Add Client
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Client</DialogTitle>
          <DialogDescription>Add a new client to your salon.</DialogDescription>
        </DialogHeader>
        <ClientForm stylists={stylists} onSubmit={handleSubmit} submitLabel="Add Client" />
      </DialogContent>
    </Dialog>
  );
}
