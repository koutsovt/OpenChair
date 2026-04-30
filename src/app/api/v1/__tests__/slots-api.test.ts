import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockSalonFindUnique = vi.fn();
const mockStylistFindFirst = vi.fn();
const mockServiceFindFirst = vi.fn();
const mockStylistServiceFindUnique = vi.fn();
const mockBookingFindMany = vi.fn();
const mockGetAvailableSlots = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    salon: { findUnique: (...args: unknown[]) => mockSalonFindUnique(...args) },
    stylist: { findFirst: (...args: unknown[]) => mockStylistFindFirst(...args) },
    service: { findFirst: (...args: unknown[]) => mockServiceFindFirst(...args) },
    stylistService: { findUnique: (...args: unknown[]) => mockStylistServiceFindUnique(...args) },
    booking: { findMany: (...args: unknown[]) => mockBookingFindMany(...args) },
  },
}));

vi.mock('@/lib/slots', () => ({
  getAvailableSlots: (...args: unknown[]) => mockGetAvailableSlots(...args),
}));

import { GET } from '@/app/api/v1/slots/route';

function makeRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/v1/slots');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

const validParams = {
  salonSlug: 'test',
  stylistId: 'sty-1',
  serviceId: 'svc-1',
  date: '2026-04-01',
};

describe('GET /api/v1/slots', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSalonFindUnique.mockResolvedValue({ id: 'salon-1', timezone: 'UTC' });
    mockStylistFindFirst.mockResolvedValue({
      id: 'sty-1',
      availability: [{ dayOfWeek: 3, startTime: '09:00', endTime: '17:00', isActive: true }],
    });
    mockServiceFindFirst.mockResolvedValue({ id: 'svc-1', duration: 60 });
    mockStylistServiceFindUnique.mockResolvedValue({ durationOverride: null });
    mockBookingFindMany.mockResolvedValue([]);
    mockGetAvailableSlots.mockReturnValue([
      {
        start: new Date('2026-04-01T09:00:00Z'),
        end: new Date('2026-04-01T10:00:00Z'),
      },
    ]);
  });

  it('returns slots for valid request', async () => {
    const res = await GET(makeRequest(validParams));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual([
      {
        start: '2026-04-01T09:00:00.000Z',
        end: '2026-04-01T10:00:00.000Z',
      },
    ]);
  });

  it('returns 400 when params missing', async () => {
    const { stylistId: _, ...incomplete } = validParams;
    const res = await GET(makeRequest(incomplete));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toHaveProperty('error');
  });

  it('returns 404 when salon not found', async () => {
    mockSalonFindUnique.mockResolvedValue(null);

    const res = await GET(makeRequest(validParams));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toHaveProperty('error');
  });

  it('returns 404 when stylist not found', async () => {
    mockStylistFindFirst.mockResolvedValue(null);

    const res = await GET(makeRequest(validParams));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toHaveProperty('error');
  });

  it('returns 404 when service not found', async () => {
    mockServiceFindFirst.mockResolvedValue(null);

    const res = await GET(makeRequest(validParams));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toHaveProperty('error');
  });

  it('uses duration override from stylistService', async () => {
    mockStylistServiceFindUnique.mockResolvedValue({ durationOverride: 90 });

    await GET(makeRequest(validParams));

    expect(mockGetAvailableSlots).toHaveBeenCalledTimes(1);
    const callArgs = mockGetAvailableSlots.mock.calls[0];
    // duration is the 4th argument (index 3)
    expect(callArgs[3]).toBe(90);
  });

  it('passes salon timezone to getAvailableSlots', async () => {
    mockSalonFindUnique.mockResolvedValue({
      id: 'salon-1',
      timezone: 'America/New_York',
    });

    await GET(makeRequest(validParams));

    expect(mockGetAvailableSlots).toHaveBeenCalledTimes(1);
    const callArgs = mockGetAvailableSlots.mock.calls[0];
    // timezone is the 5th argument (index 4)
    expect(callArgs[4]).toBe('America/New_York');
  });
});
