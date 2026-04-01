import { describe, it, expect, vi, beforeEach } from 'vitest';
import { matchWaitlistEntries, notifyWaitlistClient } from '../scheduling/waitlist';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    waitlistEntry: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('@/lib/twilio', () => ({
  sendSMS: vi.fn().mockResolvedValue({ success: true }),
  logSms: vi.fn().mockResolvedValue({}),
}));

import { prisma } from '@/lib/prisma';
import { sendSMS } from '@/lib/twilio';

const mockPrisma = prisma as unknown as {
  waitlistEntry: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};
const mockSendSMS = sendSMS as ReturnType<typeof vi.fn>;

function makeEntry(id: string, overrides = {}) {
  return {
    id,
    serviceId: 'svc1',
    stylistId: null,
    preferredTimeStart: null,
    preferredTimeEnd: null,
    client: { id: `c-${id}`, name: `Client ${id}`, phone: '0400000000' },
    ...overrides,
  };
}

describe('matchWaitlistEntries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when no entries match', async () => {
    mockPrisma.waitlistEntry.findMany.mockResolvedValue([]);
    const result = await matchWaitlistEntries(
      'salon1',
      'st1',
      'svc1',
      new Date('2026-04-06T09:00:00Z'),
      new Date('2026-04-06T10:00:00Z')
    );
    expect(result).toEqual([]);
  });

  it('returns entries in FIFO order (matches DB orderBy: createdAt asc)', async () => {
    mockPrisma.waitlistEntry.findMany.mockResolvedValue([
      makeEntry('w1'),
      makeEntry('w2'),
      makeEntry('w3'),
    ]);

    const result = await matchWaitlistEntries(
      'salon1',
      'st1',
      'svc1',
      new Date('2026-04-06T09:00:00Z'),
      new Date('2026-04-06T10:00:00Z')
    );
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.id)).toEqual(['w1', 'w2', 'w3']);
  });

  it('includes entries with matching stylist AND entries with no stylist preference', async () => {
    mockPrisma.waitlistEntry.findMany.mockResolvedValue([
      makeEntry('w1', { stylistId: 'st1' }), // specific stylist match
      makeEntry('w2', { stylistId: null }), // any stylist
    ]);

    const result = await matchWaitlistEntries(
      'salon1',
      'st1',
      'svc1',
      new Date('2026-04-06T09:00:00Z'),
      new Date('2026-04-06T10:00:00Z')
    );
    expect(result).toHaveLength(2);
  });

  it('filters out entry whose preferredTimeStart is after the slot start', async () => {
    mockPrisma.waitlistEntry.findMany.mockResolvedValue([
      makeEntry('w1', { preferredTimeStart: '14:00', preferredTimeEnd: '17:00' }),
    ]);

    // Slot is 09:00-10:00 local but client wants 14:00+
    const slotStart = new Date(2026, 3, 6, 9, 0, 0, 0);
    const slotEnd = new Date(2026, 3, 6, 10, 0, 0, 0);
    const result = await matchWaitlistEntries('salon1', 'st1', 'svc1', slotStart, slotEnd);
    expect(result).toHaveLength(0);
  });

  it('filters out entry whose preferredTimeEnd is before the slot end', async () => {
    mockPrisma.waitlistEntry.findMany.mockResolvedValue([
      makeEntry('w1', { preferredTimeStart: '09:00', preferredTimeEnd: '10:00' }),
    ]);

    // Slot is 10:00-11:00 local but client only wants before 10:00
    const slotStart = new Date(2026, 3, 6, 10, 0, 0, 0);
    const slotEnd = new Date(2026, 3, 6, 11, 0, 0, 0);
    const result = await matchWaitlistEntries('salon1', 'st1', 'svc1', slotStart, slotEnd);
    expect(result).toHaveLength(0);
  });

  it('includes entry when slot falls within time preference', async () => {
    mockPrisma.waitlistEntry.findMany.mockResolvedValue([
      makeEntry('w1', { preferredTimeStart: '09:00', preferredTimeEnd: '14:00' }),
    ]);

    // Slot 10:00-11:00 local — within 09:00-14:00 preference
    const slotStart = new Date(2026, 3, 6, 10, 0, 0, 0);
    const slotEnd = new Date(2026, 3, 6, 11, 0, 0, 0);
    const result = await matchWaitlistEntries('salon1', 'st1', 'svc1', slotStart, slotEnd);
    expect(result).toHaveLength(1);
  });

  it('maps return data correctly', async () => {
    mockPrisma.waitlistEntry.findMany.mockResolvedValue([
      makeEntry('w1', {
        serviceId: 'svc1',
        stylistId: 'st1',
        client: { id: 'c1', name: 'Jane Doe', phone: '0412345678' },
      }),
    ]);

    const result = await matchWaitlistEntries(
      'salon1',
      'st1',
      'svc1',
      new Date('2026-04-06T09:00:00Z'),
      new Date('2026-04-06T10:00:00Z')
    );
    expect(result[0]).toEqual({
      id: 'w1',
      clientId: 'c1',
      clientName: 'Jane Doe',
      clientPhone: '0412345678',
      serviceId: 'svc1',
      stylistId: 'st1',
    });
  });
});

describe('notifyWaitlistClient', () => {
  const slotDetails = {
    salonName: 'Test Salon',
    serviceName: 'Haircut',
    stylistName: 'Alice',
    startTime: new Date('2026-04-06T09:00:00Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when entry not found', async () => {
    mockPrisma.waitlistEntry.findUnique.mockResolvedValue(null);
    const result = await notifyWaitlistClient('w1', slotDetails);
    expect(result).toEqual({ notified: false });
    expect(mockPrisma.waitlistEntry.update).not.toHaveBeenCalled();
  });

  it('returns false when entry status is not WAITING', async () => {
    mockPrisma.waitlistEntry.findUnique.mockResolvedValue({
      id: 'w1',
      status: 'NOTIFIED', // already notified
      client: { name: 'Jane', phone: '0400000000' },
    });
    const result = await notifyWaitlistClient('w1', slotDetails);
    expect(result).toEqual({ notified: false });
  });

  it('updates entry to NOTIFIED with notifiedAt and expiry', async () => {
    const now = Date.now();
    vi.setSystemTime(now);

    mockPrisma.waitlistEntry.findUnique.mockResolvedValue({
      id: 'w1',
      status: 'WAITING',
      client: { name: 'Jane', phone: '0400000000' },
    });
    mockPrisma.waitlistEntry.update.mockResolvedValue({});

    await notifyWaitlistClient('w1', slotDetails);

    const updateCall = mockPrisma.waitlistEntry.update.mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: 'w1' });
    expect(updateCall.data.status).toBe('NOTIFIED');
    expect(updateCall.data.notifiedAt).toBeInstanceOf(Date);
    // Expiry should be ~2 hours from now
    const expiryMs = updateCall.data.expiresAt.getTime() - now;
    expect(expiryMs).toBeGreaterThanOrEqual(2 * 60 * 60 * 1000 - 1000);
    expect(expiryMs).toBeLessThanOrEqual(2 * 60 * 60 * 1000 + 1000);

    vi.useRealTimers();
  });

  it('sends SMS with correct phone and slot details', async () => {
    mockPrisma.waitlistEntry.findUnique.mockResolvedValue({
      id: 'w1',
      status: 'WAITING',
      client: { name: 'Jane', phone: '0412345678' },
    });
    mockPrisma.waitlistEntry.update.mockResolvedValue({});

    await notifyWaitlistClient('w1', slotDetails);

    expect(mockSendSMS).toHaveBeenCalledOnce();
    const [phone, message] = mockSendSMS.mock.calls[0];
    expect(phone).toBe('0412345678');
    expect(message).toContain('Jane');
    expect(message).toContain('Test Salon');
    expect(message).toContain('Haircut');
    expect(message).toContain('Alice');
    expect(message).toContain('BOOK');
  });

  it('does not send SMS when client has no phone number', async () => {
    mockPrisma.waitlistEntry.findUnique.mockResolvedValue({
      id: 'w1',
      status: 'WAITING',
      client: { name: 'Jane', phone: null },
    });
    mockPrisma.waitlistEntry.update.mockResolvedValue({});

    const result = await notifyWaitlistClient('w1', slotDetails);

    expect(result).toEqual({ notified: true });
    expect(mockSendSMS).not.toHaveBeenCalled();
  });
});
