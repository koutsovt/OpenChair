import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { ServicePicker } from './_components/ServicePicker';

interface PageProps {
  params: Promise<{ salonSlug: string }>;
}

export default async function BookSalonPage({ params }: PageProps) {
  const { salonSlug } = await params;

  const salon = await prisma.salon.findFirst({
    where: { slug: salonSlug, isActive: true },
    include: {
      services: {
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          category: true,
          stylists: {
            include: {
              stylist: true,
            },
          },
        },
      },
      stylists: {
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          services: true,
        },
      },
    },
  });

  if (!salon) {
    notFound();
  }

  // Group services by category
  const uncategorized = 'General';
  const grouped: Record<string, typeof salon.services> = {};

  for (const service of salon.services) {
    const catName = service.category?.name ?? uncategorized;
    if (!grouped[catName]) {
      grouped[catName] = [];
    }
    grouped[catName].push(service);
  }

  return (
    <AuroraBackground className="min-h-screen">
      <header className="border-b px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold">{salon.name}</h1>
          {salon.description && (
            <p className="mt-1 text-sm text-muted-foreground">{salon.description}</p>
          )}
          {salon.address && <p className="mt-1 text-sm text-muted-foreground">{salon.address}</p>}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <ServicePicker salonSlug={salonSlug} groupedServices={grouped} stylists={salon.stylists} />
      </main>
    </AuroraBackground>
  );
}
