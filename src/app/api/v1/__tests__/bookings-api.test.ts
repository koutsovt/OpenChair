import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockSalonFindUnique = vi.fn();
const mockServiceFindFirst = vi.fn();
const mockStylistFindFirst = vi.fn();
const mockStylistServiceFindUnique = vi.fn();
const mockClientFindFirst = vi.fn();
const mockClientCreate = vi.fn();
const mockBookingFindUnique = vi.fn();
const mockCreateBookingCore = vi.fn();
const mockSendSMS = vi.fn();
const mockLogSms = vi.fn();
const mockRateLimit = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    salon: { findUnique: (...args: unknown[]) => mockSalonFindUnique(...args) },
    service: { findFirst: (...args: unknown[]) => mockServiceFindFirst(...args) },
    stylist: { findFirst: (...args: unknown[]) => mockStylistFindFirst(...args) },
    stylistService: { findUnique: (...args: unknown[]) => mockStylistServiceFindUnique(...args) },
    client: {
      findFirst: (...args: unknown[]) => mockClientFindFirst(...args),
      create: (...args: unknown[]) => mockClientCreate(...args),
    },
    booking: { findUnique: (...args: unknown[]) => mockBookingFindUnique(...args) },
  },
}));

vi.mock('@/server/services/booking-service', () => ({
  createBookingCore: (...args: unknown[]) => mockCreateBookingCore(...args),
}));

vi.mock('@/lib/twilio', () => ({
  sendSMS: (...args: unknown[]) => mockSendSMS(...args),
  logSms: (...args: unknown[]) => mockLogSms(...args),
}));

vi.mock('@/lib/sms-templates', () => ({
  bookingConfirmationMessage: vi.fn(() => 'Confirmation'),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}));

import { POST, GET } from '@/app/api/v1/bookings/route';

// ── Helpers ──────────────────────────────────────────────────────────────

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/v1/bookings', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeGetRequest(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/v1/bookings');
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  return new NextRequest(url);
}

const validBody = {
  salonSlug: 'test-salon',
  stylistId: 'sty-1',
  serviceId: 'svc-1',
  startTime: '2026-04-01T10:00:00Z',
  clientName: 'John Doe',
  clientPhone: '+1234567890',
};

// ── Tests ────────────────────────────────────────────────────────────────

describe('POST /api/v1/bookings', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockRateLimit.mockReturnValue({ allowed: true, remaining: 9, resetMs: 60000 });
    mockSalonFindUnique.mockResolvedValue({
      id: 'salon-1',
      name: 'Test Salon',
      slug: 'test-salon',
      isActive: true,
    });
    mockServiceFindFirst.mockResolvedValue({
      id: 'svc-1',
      name: 'Haircut',
      duration: 60,
      price: 5000,
      isActive: true,
      salonId: 'salon-1',
    });
    mockStylistFindFirst.mockResolvedValue({
      id: 'sty-1',
      name: 'Jane',
      isActive: true,
      salonId: 'salon-1',
    });
    mockStylistServiceFindUnique.mockResolvedValue({
      stylistId: 'sty-1',
      serviceId: 'svc-1',
      durationOverride: null,
      priceOverride: null,
    });
    mockClientFindFirst.mockResolvedValue(null);
    mockClientCreate.mockResolvedValue({
      id: 'cli-1',
      name: 'John',
      phone: '+1234567890',
      salonId: 'salon-1',
    });
    mockCreateBookingCore.mockResolvedValue({
      id: 'b-1',
      status: 'CONFIRMED',
      startTime: new Date(),
      endTime: new Date(),
    });
    mockSendSMS.mockResolvedValue({ success: true, sid: 'SM123' });
  });

  it('returns 201 on successful booking', async () => {
    const req = makePostRequest(validBody);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.id).toBe('b-1');
    expect(json.status).toBe('CONFIRMED');
    expect(json.startTime).toBeDefined();
    expect(json.endTime).toBeDefined();

    expect(mockRateLimit).toHaveBeenCalled();
    expect(mockSalonFindUnique).toHaveBeenCalled();
    expect(mockServiceFindFirst).toHaveBeenCalled();
    expect(mockStylistFindFirst).toHaveBeenCalled();
    expect(mockStylistServiceFindUnique).toHaveBeenCalled();
    expect(mockClientFindFirst).toHaveBeenCalled();
    expect(mockClientCreate).toHaveBeenCalled();
    expect(mockCreateBookingCore).toHaveBeenCalled();
    expect(mockSendSMS).toHaveBeenCalled();
  });

  it('returns 400 for invalid JSON', async () => {
    const req = new NextRequest('http://localhost/api/v1/bookings', {
      method: 'POST',
      body: 'not json',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid JSON');
  });

  it('returns 400 for invalid schema', async () => {
    const { salonSlug: _, ...incomplete } = validBody;
    const req = makePostRequest(incomplete);
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it('returns 429 when rate limited', async () => {
    mockRateLimit.mockReturnValue({ allowed: false, remaining: 0, resetMs: 30000 });

    const req = makePostRequest(validBody);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.error).toContain('Too many booking requests');
    expect(res.headers.get('Retry-After')).toBe('30');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('returns 404 when salon not found', async () => {
    mockSalonFindUnique.mockResolvedValue(null);

    const req = makePostRequest(validBody);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe('Salon not found');
  });

  it('returns 404 when service not found', async () => {
    mockServiceFindFirst.mockResolvedValue(null);

    const req = makePostRequest(validBody);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe('Service not found');
  });

  it('returns 404 when stylist not found', async () => {
    mockStylistFindFirst.mockResolvedValue(null);

    const req = makePostRequest(validBody);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe('Stylist not found');
  });

  it('returns 400 when stylist does not offer service', async () => {
    mockStylistServiceFindUnique.mockResolvedValue(null);

    const req = makePostRequest(validBody);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('This stylist does not offer this service');
  });

  it('returns 409 when booking conflicts', async () => {
    mockCreateBookingCore.mockRejectedValue(new Error('conflict'));

    const req = makePostRequest(validBody);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error).toBe('conflict');
  });
});

describe('GET /api/v1/bookings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns booking by id', async () => {
    const bookingData = {
      id: 'b-1',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      status: 'CONFIRMED',
      price: 5000,
      notes: null,
      guestName: 'John Doe',
      guestPhone: '+1234567890',
      createdAt: new Date().toISOString(),
      service: { id: 'svc-1', name: 'Haircut', duration: 60, price: 5000 },
      stylist: { id: 'sty-1', name: 'Jane', imageUrl: null },
      salon: {
        id: 'salon-1',
        name: 'Test Salon',
        slug: 'test-salon',
        phone: '+10000000000',
        address: '123 Main St',
      },
    };
    mockBookingFindUnique.mockResolvedValue(bookingData);

    const req = makeGetRequest({ id: 'b-1' });
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.id).toBe('b-1');
    expect(json.status).toBe('CONFIRMED');
    expect(json.service.name).toBe('Haircut');
    expect(json.stylist.name).toBe('Jane');
    expect(json.salon.name).toBe('Test Salon');
    expect(mockBookingFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'b-1' } })
    );
  });

  it('returns 400 when id missing', async () => {
    const req = makeGetRequest();
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('id query parameter is required');
  });

  it('returns 404 when booking not found', async () => {
    mockBookingFindUnique.mockResolvedValue(null);

    const req = makeGetRequest({ id: 'nonexistent' });
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe('Booking not found');
  });
});
