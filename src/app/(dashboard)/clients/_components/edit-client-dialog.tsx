'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
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
import { updateClient } from '@/server/actions/clients';

interface EditClientDialogProps {
  client: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    notes: string | null;
    birthDate: Date | string | null;
    source: string | null;
  };
}

export function EditClientDialog({ client }: EditClientDialogProps) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    const result = await updateClient(client.id, formData);
    if (result?.success) {
      setOpen(false);
    }
    return result;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
          <DialogDescription>Update client details.</DialogDescription>
        </DialogHeader>
        <ClientForm defaultValues={client} onSubmit={handleSubmit} submitLabel="Update Client" />
      </DialogContent>
    </Dialog>
  );
}
