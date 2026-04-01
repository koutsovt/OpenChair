import { prisma } from '@/lib/prisma';

export async function authenticateSalonByApiKey(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const apiKey = authHeader.slice(7);
  if (!apiKey) {
    return null;
  }

  const salon = await prisma.salon.findUnique({
    where: { apiKey },
  });

  return salon;
}
