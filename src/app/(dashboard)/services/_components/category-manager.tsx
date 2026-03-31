'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createCategory, deleteCategory } from '@/server/actions/services';

interface Category {
  id: string;
  name: string;
}

interface CategoryManagerProps {
  categories: Category[];
}

export function CategoryManager({ categories }: CategoryManagerProps) {
  const [name, setName] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!name.trim()) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set('name', name.trim());
      const result = await createCategory(formData);
      if (result?.success) {
        setName('');
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteCategory(id);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="New category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          disabled={isPending}
        />
        <Button
          variant="outline"
          size="icon"
          onClick={handleAdd}
          disabled={isPending || !name.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">No categories yet.</p>
      ) : (
        <ul className="space-y-1">
          {categories.map((cat) => (
            <li
              key={cat.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              {cat.name}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleDelete(cat.id)}
                disabled={isPending}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
