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
import { ServiceForm } from './service-form';
import { updateService } from '@/server/actions/services';

interface Category {
  id: string;
  name: string;
}

interface EditServiceDialogProps {
  service: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    duration: number;
    categoryId: string | null;
  };
  categories: Category[];
}

export function EditServiceDialog({ service, categories }: EditServiceDialogProps) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    const result = await updateService(service.id, formData);
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
          <DialogTitle>Edit Service</DialogTitle>
          <DialogDescription>Update service details.</DialogDescription>
        </DialogHeader>
        <ServiceForm
          defaultValues={service}
          categories={categories}
          onSubmit={handleSubmit}
          submitLabel="Update Service"
        />
      </DialogContent>
    </Dialog>
  );
}
