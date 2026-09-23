import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTotalBill,
  calculateStayMinutes,
  calculateWaterAmount,
  calculateRoomAmount,
  PRICE_CONSTANTS,
} from './calculateTotalBill.js';

test('PRICE_CONSTANTS adhere strictly to PRD', () => {
  assert.equal(PRICE_CONSTANTS.BEER, 20000);
  assert.equal(PRICE_CONSTANTS.WATER, 10000);
  assert.equal(PRICE_CONSTANTS.SOFT_DRINK, 15000);
  assert.equal(PRICE_CONSTANTS.OVERNIGHT, 200000);
  assert.equal(PRICE_CONSTANTS.DAILY, 350000);
  assert.equal(PRICE_CONSTANTS.HOURLY_FIRST_BLOCK, 80000);
  assert.equal(PRICE_CONSTANTS.HOURLY_EXTRA_PER_HOUR, 20000);
  assert.equal(PRICE_CONSTANTS.HOURLY_GRACE_PERIOD_MINUTES, 10);
});

test('calculates minibar water_amount correctly', () => {
  // water_amount = (beer_qty * 20000) + (water_qty * 10000) + (soft_drink_qty * 15000)
  const amount = calculateWaterAmount({
    beer_qty: 3,
    water_qty: 2,
    soft_drink_qty: 1,
  });
  assert.equal(amount, 3 * 20000 + 2 * 10000 + 1 * 15000); // 60k + 20k + 15k = 95,000
});

test('calculates overnight rate (Fixed 200,000 VND)', () => {
  const amount = calculateRoomAmount('2026-07-04T20:00', '2026-07-05T08:00', 'overnight');
  assert.equal(amount, 200000);

  const bill = calculateTotalBill(
    '2026-07-04T20:00',
    '2026-07-05T08:00',
    'overnight',
    { beer: 2, water: 1 },
    50000,
  );
  assert.equal(bill.room_amount, 200000);
  assert.equal(bill.water_amount, 2 * 20000 + 1 * 10000); // 50,000
  assert.equal(bill.surcharge, 50000);
  assert.equal(bill.total_amount, 200000 + 50000 + 50000); // 300,000
});

test('calculates daily rate (Fixed 350,000 VND)', () => {
  const amount = calculateRoomAmount('2026-07-04T12:00', '2026-07-05T12:00', 'daily');
  assert.equal(amount, 350000);
});

test('calculates hourly stay within first 60 minutes (80,000 VND)', () => {
  // 45 minutes
  const bill = calculateTotalBill('2026-07-04T10:00', '2026-07-04T10:45', 'hourly', {});
  assert.equal(bill.stayMinutes, 45);
  assert.equal(bill.room_amount, 80000);
  assert.equal(bill.total_amount, 80000);
});

test('calculates hourly stay within 10 minute grace period (up to 70 mins = 80,000 VND)', () => {
  // Exactly 60 minutes + 10 mins grace period = 70 minutes -> still 80,000 VND
  const bill = calculateTotalBill('2026-07-04T10:00', '2026-07-04T11:10', 'hourly', {});
  assert.equal(bill.stayMinutes, 70);
  assert.equal(bill.room_amount, 80000);
});

test('calculates hourly stay exceeding grace period: 71 mins -> 1 extra hour = 100,000 VND', () => {
  // 71 minutes: Delta = 71 - 60 - 10 = 1 min -> ceil(1/60) = 1 extra block -> 80k + 20k = 100,000
  const bill = calculateTotalBill('2026-07-04T10:00', '2026-07-04T11:11', 'hourly', {});
  assert.equal(bill.stayMinutes, 71);
  assert.equal(bill.room_amount, 100000);
});

test('calculates hourly stay: 130 mins (2h10m) = 1 extra hour (100,000 VND)', () => {
  // 130 mins: Delta = 130 - 60 - 10 = 60 mins -> ceil(60/60) = 1 extra block -> 100,000
  const bill = calculateTotalBill('2026-07-04T10:00', '2026-07-04T12:10', 'hourly', {});
  assert.equal(bill.stayMinutes, 130);
  assert.equal(bill.room_amount, 100000);
});

test('calculates hourly stay: 131 mins (2h11m) = 2 extra hours (120,000 VND)', () => {
  // 131 mins: Delta = 131 - 60 - 10 = 61 mins -> ceil(61/60) = 2 extra blocks -> 80k + 40k = 120,000
  const bill = calculateTotalBill('2026-07-04T10:00', '2026-07-04T12:11', 'hourly', {});
  assert.equal(bill.stayMinutes, 131);
  assert.equal(bill.room_amount, 120000);
});

test('calculates full bill with surcharge and drinks reactive total', () => {
  const bill = calculateTotalBill(
    '2026-07-04T10:00',
    '2026-07-04T12:11',
    'hourly',
    { beer_qty: 2, water_qty: 1, soft_drink_qty: 2 },
    30000,
  );
  // room: 120,000
  // drinks: 2*20000 + 1*10000 + 2*15000 = 40k + 10k + 30k = 80,000
  // surcharge: 30,000
  // total: 120k + 80k + 30k = 230,000
  assert.equal(bill.room_amount, 120000);
  assert.equal(bill.water_amount, 80000);
  assert.equal(bill.surcharge, 30000);
  assert.equal(bill.total_amount, 230000);
});
