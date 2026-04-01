import { describe, it, expect } from 'vitest';
import { scoreSlot } from '../scheduling/smart-suggestions';

/** Create a Date at the given local hours/minutes on Mon 6 Apr 2026 */
function localDate(hours: number, minutes = 0): Date {
  const d = new Date(2026, 3, 6);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

describe('scoreSlot', () => {
  it('returns base score with "Open schedule" for empty schedule', () => {
    const result = scoreSlot(localDate(9), localDate(10), [], 60);
    expect(result.value).toBe(60);
    expect(result.reason).toBe('Open schedule');
  });

  it('scores gap-filling slots highest (+30)', () => {
    const bookings = [
      { startTime: localDate(9), endTime: localDate(10) },
      { startTime: localDate(11), endTime: localDate(12) },
    ];
    const result = scoreSlot(localDate(10), localDate(11), bookings, 60);
    expect(result.value).toBeGreaterThanOrEqual(80);
    expect(result.reason).toBe('Fills gap between bookings');
  });

  it('scores back-to-back slots with +15 bonus', () => {
    // Use 14:00-15:00 to avoid morning bonus interference
    const bookings = [{ startTime: localDate(13), endTime: localDate(14) }];
    const result = scoreSlot(localDate(14), localDate(15), bookings, 60);
    expect(result.value).toBe(65); // 50 base + 15 back-to-back
    expect(result.reason).toBe('Back-to-back efficient');
  });

  it('penalizes slots that leave small unusable gaps (-15)', () => {
    // Use 14:20-15:20 to avoid morning bonus interference
    const bookings = [{ startTime: localDate(13), endTime: localDate(14) }];
    const result = scoreSlot(localDate(14, 20), localDate(15, 20), bookings, 60);
    expect(result.value).toBe(35); // 50 base - 15 small gap
    expect(result.reason).toBe('Leaves small gap');
  });

  it('gap-filling is not triggered when gap is too large for the service', () => {
    const bookings = [
      { startTime: localDate(9), endTime: localDate(10) },
      { startTime: localDate(13), endTime: localDate(14) },
    ];
    const result = scoreSlot(localDate(10), localDate(11), bookings, 60);
    expect(result.reason).not.toBe('Fills gap between bookings');
    expect(result.reason).toBe('Back-to-back efficient');
  });

  it('applies peak avoidance penalty when day is busy (>=4 bookings, 10am-2pm)', () => {
    const busyBookings = [
      { startTime: localDate(8), endTime: localDate(9) },
      { startTime: localDate(9), endTime: localDate(10) },
      { startTime: localDate(14), endTime: localDate(15) },
      { startTime: localDate(15), endTime: localDate(16) },
    ];
    const peakResult = scoreSlot(localDate(12), localDate(13), busyBookings, 60);
    const offPeakResult = scoreSlot(localDate(16), localDate(17), busyBookings, 60);
    expect(offPeakResult.value).toBeGreaterThan(peakResult.value);
  });

  it('gives morning bonus for 8am-10am slots', () => {
    const bookings = [{ startTime: localDate(14), endTime: localDate(15) }];
    const morningResult = scoreSlot(localDate(9), localDate(10), bookings, 60);
    const afternoonResult = scoreSlot(localDate(12), localDate(13), bookings, 60);
    expect(morningResult.value).toBeGreaterThan(afternoonResult.value);
    expect(morningResult.reason).toBe('Morning slot');
  });

  it('clamps score between 0 and 100', () => {
    const bookings = [
      { startTime: localDate(8), endTime: localDate(9) },
      { startTime: localDate(10), endTime: localDate(11) },
    ];
    const result = scoreSlot(localDate(9), localDate(10), bookings, 60);
    expect(result.value).toBeLessThanOrEqual(100);
    expect(result.value).toBeGreaterThanOrEqual(0);
  });
});
