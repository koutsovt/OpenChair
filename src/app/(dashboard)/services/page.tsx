import { Scissors } from 'lucide-react';
import { getAuthenticatedSalon } from '@/server/auth';
import { prisma } from '@/lib/prisma';
import { formatPrice, formatDuration } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AddServiceDialog } from './_components/add-service-dialog';
import { EditServiceDialog } from './_components/edit-service-dialog';
import { DeleteServiceButton } from './_components/delete-service-button';
import { StylistAssignment } from './_components/stylist-assignment';
import { CategoryManager } from './_components/category-manager';

export default async function ServicesPage() {
  const salon = await getAuthenticatedSalon();
  const salonId = salon.id;

  const [services, categories, stylists] = await Promise.all([
    prisma.service.findMany({
      where: { salonId },
      include: { category: true, stylists: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.serviceCategory.findMany({
      where: { salonId },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.stylist.findMany({
      where: { salonId, isActive: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const categorized = new Map<string, typeof services>();
  const uncategorized: typeof services = [];

  for (const service of services) {
    if (service.categoryId && service.category) {
      const existing = categorized.get(service.categoryId) ?? [];
      existing.push(service);
      categorized.set(service.categoryId, existing);
    } else {
      uncategorized.push(service);
    }
  }

  const categoryList = categories.map((c) => ({ id: c.id, name: c.name }));
  const stylistList = stylists.map((s) => ({ id: s.id, name: s.name }));

  function renderServiceCard(service: (typeof services)[number]) {
    const assignedStylistIds = service.stylists.map((ss) => ss.stylistId);

    return (
      <Card key={service.id}>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-base">{service.name}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={service.isActive ? 'default' : 'secondary'}>
                {service.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <EditServiceDialog service={service} categories={categoryList} />
            <DeleteServiceButton serviceId={service.id} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium">{formatPrice(service.price)}</span>
            <span className="text-muted-foreground">{formatDuration(service.duration)}</span>
          </div>
          {service.description && (
            <p className="text-sm text-muted-foreground">{service.description}</p>
          )}
          <Separator />
          <StylistAssignment
            serviceId={service.id}
            stylists={stylistList}
            assignedStylistIds={assignedStylistIds}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Services</h1>
          <p className="text-muted-foreground">Manage your salon services and pricing.</p>
        </div>
        <AddServiceDialog categories={categoryList} />
      </div>

      {services.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Scissors className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium">No services yet</p>
            <p className="text-sm text-muted-foreground">Add your first service to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {categories.map((category) => {
            const categoryServices = categorized.get(category.id);
            if (!categoryServices?.length) return null;
            return (
              <div key={category.id} className="space-y-4">
                <h2 className="text-lg font-semibold">{category.name}</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {categoryServices.map(renderServiceCard)}
                </div>
              </div>
            );
          })}
          {uncategorized.length > 0 && (
            <div className="space-y-4">
              {categorized.size > 0 && <h2 className="text-lg font-semibold">Uncategorized</h2>}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {uncategorized.map(renderServiceCard)}
              </div>
            </div>
          )}
        </>
      )}

      <Separator />

      <div className="max-w-md space-y-3">
        <h2 className="text-lg font-semibold">Categories</h2>
        <p className="text-sm text-muted-foreground">
          Organize services into categories for your booking menu.
        </p>
        <CategoryManager categories={categoryList} />
      </div>
    </div>
  );
}
