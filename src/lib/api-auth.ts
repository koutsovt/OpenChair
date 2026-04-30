import { compare } from 'bcryptjs';
import { prisma } from '@/lib/prisma';

/**
 * Authenticate a salon by comparing the bearer token against hashed API keys.
 * API keys must be stored as bcrypt hashes (hash on creation/rotation).
 */
export async function authenticateSalonByApiKey(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const apiKey = authHeader.slice(7);
  if (!apiKey) {
    return null;
  }

  const salons = await prisma.salon.findMany({
    where: { apiKey: { not: null } },
  });

  for (const salon of salons) {
    if (salon.apiKey && (await compare(apiKey, salon.apiKey))) {
      return salon;
    }
  }

  return null;
}
