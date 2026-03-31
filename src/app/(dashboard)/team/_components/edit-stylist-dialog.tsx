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
import { StylistForm } from './stylist-form';
import { updateStylist } from '@/server/actions/team';

interface EditStylistDialogProps {
  stylist: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    bio: string | null;
  };
}

export function EditStylistDialog({ stylist }: EditStylistDialogProps) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    const result = await updateStylist(stylist.id, formData);
    if (result?.success) {
      setOpen(false);
    }
    return result;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Stylist</DialogTitle>
          <DialogDescription>Update stylist details.</DialogDescription>
        </DialogHeader>
        <StylistForm
          defaultValues={{
            name: stylist.name,
            email: stylist.email ?? '',
            phone: stylist.phone ?? '',
            bio: stylist.bio ?? '',
          }}
          onSubmit={handleSubmit}
          submitLabel="Update"
        />
      </DialogContent>
    </Dialog>
  );
}
