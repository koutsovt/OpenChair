import { describe, it, expect } from 'vitest';
import {
  bookingConfirmationMessage,
  bookingReminderMessage,
  bookingCancellationMessage,
  bookingRescheduledMessage,
  recurringBookingMessage,
  waitlistNotificationMessage,
  waitlistExpiredMessage,
} from '../sms-templates';

const baseParams = {
  clientName: 'Alice',
  salonName: 'Luxe Salon',
  serviceName: 'Haircut',
  stylistName: 'Maria',
  startTime: new Date('2026-04-01T10:00:00Z'),
};

describe('bookingConfirmationMessage', () => {
  const msg = bookingConfirmationMessage({ ...baseParams, price: 5000 });

  it('includes client name', () => {
    expect(msg).toContain('Alice');
  });

  it('includes salon name', () => {
    expect(msg).toContain('Luxe Salon');
  });

  it('includes service and stylist', () => {
    expect(msg).toContain('Haircut');
    expect(msg).toContain('Maria');
  });

  it('includes formatted date and time', () => {
    expect(msg).toMatch(/April/);
    expect(msg).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
  });

  it('includes price', () => {
    expect(msg).toMatch(/\$50/);
  });

  it('includes cancel instruction', () => {
    expect(msg).toContain('Reply CANCEL');
  });
});

describe('bookingReminderMessage', () => {
  const msg = bookingReminderMessage(baseParams);

  it('includes reminder and tomorrow', () => {
    expect(msg).toContain('Reminder');
    expect(msg).toContain('tomorrow');
  });

  it('includes all participant names', () => {
    expect(msg).toContain('Alice');
    expect(msg).toContain('Luxe Salon');
    expect(msg).toContain('Haircut');
    expect(msg).toContain('Maria');
  });

  it('includes cancel instruction', () => {
    expect(msg).toContain('Reply CANCEL');
  });
});

describe('bookingCancellationMessage', () => {
  const msg = bookingCancellationMessage({
    clientName: 'Alice',
    salonName: 'Luxe Salon',
    startTime: baseParams.startTime,
  });

  it('includes cancelled confirmation', () => {
    expect(msg).toContain('has been cancelled');
  });

  it('includes client and salon name', () => {
    expect(msg).toContain('Alice');
    expect(msg).toContain('Luxe Salon');
  });

  it('includes formatted date', () => {
    expect(msg).toMatch(/April/);
  });
});

describe('bookingRescheduledMessage', () => {
  const msg = bookingRescheduledMessage(baseParams);

  it('includes moved to indication', () => {
    expect(msg).toContain('moved to');
  });

  it('includes all names', () => {
    expect(msg).toContain('Alice');
    expect(msg).toContain('Luxe Salon');
    expect(msg).toContain('Haircut');
    expect(msg).toContain('Maria');
  });

  it('includes cancel instruction', () => {
    expect(msg).toContain('Reply CANCEL');
  });
});

describe('recurringBookingMessage', () => {
  const msg = recurringBookingMessage(baseParams);

  it('includes recurring indicator', () => {
    expect(msg).toContain('recurring');
  });

  it('includes all names and cancel instruction', () => {
    expect(msg).toContain('Alice');
    expect(msg).toContain('Luxe Salon');
    expect(msg).toContain('Reply CANCEL');
  });
});

describe('waitlistNotificationMessage', () => {
  const msg = waitlistNotificationMessage(baseParams);

  it('includes slot opened indication', () => {
    expect(msg).toContain('opened up');
  });

  it('includes book instruction', () => {
    expect(msg).toContain('Reply BOOK');
  });

  it('includes all names', () => {
    expect(msg).toContain('Alice');
    expect(msg).toContain('Luxe Salon');
    expect(msg).toContain('Haircut');
    expect(msg).toContain('Maria');
  });
});

describe('waitlistExpiredMessage', () => {
  const msg = waitlistExpiredMessage({ clientName: 'Alice', salonName: 'Luxe Salon' });

  it('includes expired indication', () => {
    expect(msg).toContain('expired');
  });

  it('includes client and salon name', () => {
    expect(msg).toContain('Alice');
    expect(msg).toContain('Luxe Salon');
  });
});
