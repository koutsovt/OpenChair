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
    allergies: string | null;
    hairType: string | null;
    hairTexture: string | null;
    naturalColour: string | null;
    preferredStylistId: string | null;
    productPreferences: string | null;
  };
  stylists?: { id: string; name: string }[];
}

export function EditClientDialog({ client, stylists = [] }: EditClientDialogProps) {
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
        <ClientForm
          defaultValues={client}
          stylists={stylists}
          onSubmit={handleSubmit}
          submitLabel="Update Client"
        />
      </DialogContent>
    </Dialog>
  );
}
