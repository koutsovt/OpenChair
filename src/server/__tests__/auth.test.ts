import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUserFindUnique = vi.fn();
const mockUserCreate = vi.fn();
const mockSalonCreate = vi.fn();
const mockHash = vi.fn();
const mockRedirect = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      create: (...args: unknown[]) => mockUserCreate(...args),
    },
    salon: {
      create: (...args: unknown[]) => mockSalonCreate(...args),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  hash: (...args: unknown[]) => mockHash(...args),
}));

vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error('NEXT_REDIRECT');
  },
}));

import { signUp } from '@/server/actions/auth';

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    fd.set(key, value);
  }
  return fd;
}

describe('signUp', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockHash.mockResolvedValue('hashed-pw');
    mockUserCreate.mockResolvedValue({ id: 'usr-abcdef' });
    mockUserFindUnique.mockResolvedValue(null);
  });

  it('returns error when fields are missing', async () => {
    const fd = makeFormData({
      password: 'secret123',
      firstName: 'Jane',
      lastName: 'Doe',
    });

    const result = await signUp(fd);

    expect(result).toEqual({ error: 'All fields are required' });
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockUserCreate).not.toHaveBeenCalled();
    expect(mockSalonCreate).not.toHaveBeenCalled();
  });

  it('returns error when email already exists', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'existing-user', email: 'jane@example.com' });

    const fd = makeFormData({
      email: 'jane@example.com',
      password: 'secret123',
      firstName: 'Jane',
      lastName: 'Doe',
    });

    const result = await signUp(fd);

    expect(result).toEqual(
      expect.objectContaining({
        error: expect.stringContaining('already exists'),
      })
    );
    expect(mockUserCreate).not.toHaveBeenCalled();
    expect(mockSalonCreate).not.toHaveBeenCalled();
  });

  it('hashes password with bcryptjs', async () => {
    mockHash.mockResolvedValue('hashed123');

    const fd = makeFormData({
      email: 'jane@example.com',
      password: 'mypassword',
      firstName: 'Jane',
      lastName: 'Doe',
    });

    try {
      await signUp(fd);
    } catch {
      // redirect throws NEXT_REDIRECT
    }

    expect(mockHash).toHaveBeenCalledWith('mypassword', 12);
  });

  it('creates user and salon', async () => {
    mockUserCreate.mockResolvedValue({ id: 'usr-123456-rest' });

    const fd = makeFormData({
      email: 'jane@example.com',
      password: 'secret123',
      firstName: 'Jane',
      lastName: 'Doe',
    });

    try {
      await signUp(fd);
    } catch {
      // redirect throws NEXT_REDIRECT
    }

    expect(mockUserCreate).toHaveBeenCalledWith({
      data: {
        email: 'jane@example.com',
        password: 'hashed-pw',
        firstName: 'Jane',
        lastName: 'Doe',
      },
    });

    expect(mockSalonCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: expect.stringContaining('Jane'),
          slug: expect.stringContaining('usr-12'),
          ownerId: 'usr-123456-rest',
        }),
      })
    );
  });

  it('redirects to /sign-in on success', async () => {
    const fd = makeFormData({
      email: 'jane@example.com',
      password: 'secret123',
      firstName: 'Jane',
      lastName: 'Doe',
    });

    await expect(signUp(fd)).rejects.toThrow('NEXT_REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/sign-in');
  });

  it('generates correct slug format', async () => {
    mockUserCreate.mockResolvedValue({ id: 'usr-abcdef' });

    const fd = makeFormData({
      email: 'john@example.com',
      password: 'secret123',
      firstName: 'John',
      lastName: "O'Brien",
    });

    try {
      await signUp(fd);
    } catch {
      // redirect throws NEXT_REDIRECT
    }

    expect(mockSalonCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: 'john-o-brien-salon-usr-ab',
        }),
      })
    );
  });
});
