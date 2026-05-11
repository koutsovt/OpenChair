'use server';

import { redirect } from 'next/navigation';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logger';

export async function signUp(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;

  if (!email || !password || !firstName || !lastName) {
    return { error: 'All fields are required' };
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { error: 'An account with this email already exists' };
    }

    const hashedPassword = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
      },
    });

    const slug = `${firstName}-${lastName}-salon`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-');

    await prisma.salon.create({
      data: {
        name: `${firstName}'s Salon`,
        slug: `${slug}-${user.id.slice(0, 6)}`,
        ownerId: user.id,
      },
    });
  } catch (error) {
    // Re-throw Next.js redirect so the framework can handle it
    if (
      error instanceof Error &&
      (error.message === 'NEXT_REDIRECT' ||
        (error as { digest?: string }).digest?.startsWith('NEXT_REDIRECT'))
    ) {
      throw error;
    }
    log.error({ err: error, email }, 'signUp failed');
    return { error: 'Something went wrong. Please try again.' };
  }

  redirect('/sign-in');
}

export async function signOut() {
  redirect('/api/auth/signout');
}
