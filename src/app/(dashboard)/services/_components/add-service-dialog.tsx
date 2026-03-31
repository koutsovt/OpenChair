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
import { ServiceForm } from './service-form';
import { createService } from '@/server/actions/services';

interface Category {
  id: string;
  name: string;
}

interface AddServiceDialogProps {
  categories: Category[];
}

export function AddServiceDialog({ categories }: AddServiceDialogProps) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    const result = await createService(formData);
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
          Add Service
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Service</DialogTitle>
          <DialogDescription>Add a new service to your salon menu.</DialogDescription>
        </DialogHeader>
        <ServiceForm categories={categories} onSubmit={handleSubmit} submitLabel="Add Service" />
      </DialogContent>
    </Dialog>
  );
}
