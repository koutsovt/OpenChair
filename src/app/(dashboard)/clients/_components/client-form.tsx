'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';

const clientFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  birthDate: z.date().optional(),
  source: z.string().optional().or(z.literal('')),
  allergies: z.string().optional().or(z.literal('')),
  hairType: z.string().optional().or(z.literal('')),
  hairTexture: z.string().optional().or(z.literal('')),
  naturalColour: z.string().optional().or(z.literal('')),
  preferredStylistId: z.string().optional().or(z.literal('')),
  productPreferences: z.string().optional().or(z.literal('')),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

const CLIENT_SOURCES = [
  { value: 'walk-in', label: 'Walk-in' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' },
  { value: 'other', label: 'Other' },
];

const HAIR_TYPES = [
  { value: 'straight', label: 'Straight' },
  { value: 'wavy', label: 'Wavy' },
  { value: 'curly', label: 'Curly' },
  { value: 'coily', label: 'Coily' },
];

const HAIR_TEXTURES = [
  { value: 'fine', label: 'Fine' },
  { value: 'medium', label: 'Medium' },
  { value: 'thick', label: 'Thick' },
];

interface ClientFormProps {
  defaultValues?: {
    name?: string;
    phone?: string | null;
    email?: string | null;
    notes?: string | null;
    birthDate?: Date | string | null;
    source?: string | null;
    allergies?: string | null;
    hairType?: string | null;
    hairTexture?: string | null;
    naturalColour?: string | null;
    preferredStylistId?: string | null;
    productPreferences?: string | null;
  };
  stylists?: { id: string; name: string }[];
  onSubmit: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  submitLabel?: string;
}

export function ClientForm({
  defaultValues,
  stylists = [],
  onSubmit,
  submitLabel = 'Save',
}: ClientFormProps) {
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      phone: defaultValues?.phone ?? '',
      email: defaultValues?.email ?? '',
      notes: defaultValues?.notes ?? '',
      birthDate: defaultValues?.birthDate ? new Date(defaultValues.birthDate) : undefined,
      source: defaultValues?.source ?? '',
      allergies: defaultValues?.allergies ?? '',
      hairType: defaultValues?.hairType ?? '',
      hairTexture: defaultValues?.hairTexture ?? '',
      naturalColour: defaultValues?.naturalColour ?? '',
      preferredStylistId: defaultValues?.preferredStylistId ?? '',
      productPreferences: defaultValues?.productPreferences ?? '',
    },
  });

  async function handleSubmit(values: ClientFormValues) {
    const formData = new FormData();
    formData.set('name', values.name);
    formData.set('phone', values.phone);
    formData.set('email', values.email ?? '');
    formData.set('notes', values.notes ?? '');
    formData.set('birthDate', values.birthDate ? values.birthDate.toISOString() : '');
    formData.set('source', values.source ?? '');
    formData.set('allergies', values.allergies ?? '');
    formData.set('hairType', values.hairType ?? '');
    formData.set('hairTexture', values.hairTexture ?? '');
    formData.set('naturalColour', values.naturalColour ?? '');
    formData.set('preferredStylistId', values.preferredStylistId ?? '');
    formData.set('productPreferences', values.productPreferences ?? '');

    const result = await onSubmit(formData);
    if (result?.error) {
      form.setError('root', { message: result.error });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone *</FormLabel>
                <FormControl>
                  <Input placeholder="0400 000 000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="email@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="birthDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Birth Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date > new Date()}
                      captionLayout="dropdown"
                      defaultMonth={field.value}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="How did they find you?" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CLIENT_SOURCES.map((source) => (
                      <SelectItem key={source.value} value={source.value}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="allergies"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-red-600">⚠ Allergies / Sensitivities</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g. PPD allergy, sensitive scalp..."
                  rows={2}
                  className="border-red-200 focus-visible:ring-red-400"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="hairType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hair Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select hair type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {HAIR_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hairTexture"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hair Texture</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select hair texture" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {HAIR_TEXTURES.map((texture) => (
                      <SelectItem key={texture.value} value={texture.value}>
                        {texture.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="naturalColour"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Natural Colour</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Dark brown" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="preferredStylistId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred Stylist</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="No preference" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {stylists.map((stylist) => (
                      <SelectItem key={stylist.id} value={stylist.id}>
                        {stylist.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="productPreferences"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Preferences</FormLabel>
              <FormControl>
                <Textarea placeholder="Preferred products, brands..." rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="General notes, colour history..." rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.formState.errors.root && (
          <p className="text-sm font-medium text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving...' : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
