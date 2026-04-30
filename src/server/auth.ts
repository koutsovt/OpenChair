import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function getAuthenticatedSalon() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { salon: true },
  });

  if (!user?.salon) {
    throw new Error('No salon found');
  }

  return user.salon;
}
