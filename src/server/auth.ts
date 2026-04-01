import { createSupabaseServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function getAuthenticatedSalon() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    throw new Error('Not authenticated');
  }

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { salon: true },
  });

  if (!user?.salon) {
    throw new Error('No salon found');
  }

  return user.salon;
}
