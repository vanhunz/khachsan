import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateExcelWaterAmount,
  calculateExcelRoomAmount,
  calculateExcelRow,
  parseNoteColumn,
  detectExcelConflict,
  calculateDeltaHours,
} from './excelParser.js';

test('SRS Example: In 15:15, Out 18:01 calculates delta 2.7667h -> 120,000 VND', () => {
  const delta = calculateDeltaHours('15:15', '18:01');
  assert.ok(Math.abs(delta - 2.7667) < 0.001);

  const roomAmount = calculateExcelRoomAmount('Giờ', '15:15', '18:01');
  assert.equal(roomAmount, 120000);
});

test('calculates overnight and daily rates', () => {
  assert.equal(calculateExcelRoomAmount('Qua đêm', '20:00', '08:00'), 200000);
  assert.equal(calculateExcelRoomAmount('Ngày đêm', '12:00', '12:00'), 350000);
});

test('calculates water amount (Column I)', () => {
  // Beer 20k, Water 10k, Soft drink 15k
  const water = calculateExcelWaterAmount(2, 3, 1);
  assert.equal(water, 2 * 20000 + 3 * 10000 + 1 * 15000); // 40k + 30k + 15k = 85,000
});

test('parses Column M: Case 1 - Cash 100%', () => {
  const parsed = parseNoteColumn('', 150000);
  assert.equal(parsed.cashAmount, 150000);
  assert.equal(parsed.transferAmount, 0);
  assert.equal(parsed.netCash, 150000);
  assert.equal(parsed.netTransfer, 0);
  assert.equal(parsed.recognizedRevenue, 150000);
});

test('parses Column M: Case 2 - Transfer 100% (CK)', () => {
  const parsed = parseNoteColumn('CK', 120000);
  assert.equal(parsed.cashAmount, 0);
  assert.equal(parsed.transferAmount, 120000);
  assert.equal(parsed.netCash, 0);
  assert.equal(parsed.netTransfer, 120000);
  assert.equal(parsed.recognizedRevenue, 120000);
});

test('parses Column M: Case 3 - Split payment (ck100k)', () => {
  const parsed = parseNoteColumn('ck100k', 160000);
  assert.equal(parsed.transferAmount, 100000);
  assert.equal(parsed.cashAmount, 60000);
  assert.equal(parsed.netCash, 60000);
  assert.equal(parsed.netTransfer, 100000);
  assert.equal(parsed.recognizedRevenue, 160000);
});

test('parses Column M: Case 4 - Overpayment & Cash refund (ck200k thoi 40k)', () => {
  const parsed = parseNoteColumn('ck200k thoi 40k', 160000);
  assert.equal(parsed.transferAmount, 200000);
  assert.equal(parsed.cashRefund, 40000);
  assert.equal(parsed.netTransfer, 200000);
  assert.equal(parsed.netCash, -40000);
  assert.equal(parsed.recognizedRevenue, 160000);
});

test('User Scenario: Bill 80k, Transfer 100k, Cash Refund 20k (ck100k thoi 20k)', () => {
  const parsed = parseNoteColumn('ck100k thoi 20k', 80000);
  assert.equal(parsed.paymentMethod, 'split_refund');
  assert.equal(parsed.transferAmount, 100000);
  assert.equal(parsed.cashRefund, 20000);
  assert.equal(parsed.netTransfer, 100000);
  assert.equal(parsed.netCash, -20000);
  assert.equal(parsed.recognizedRevenue, 80000);
});

test('User Scenario Variations: ck 100k thôi 20k, ck 100.000 thối lại 20.000, ck100 thoi 20', () => {
  const variations = [
    'ck 100k thôi 20k',
    'ck 100.000 thối lại 20.000',
    'ck100 thoi 20',
    'ck 100k - thoi 20k',
    'ck 100k : trả lại 20k',
  ];

  variations.forEach((text) => {
    const parsed = parseNoteColumn(text, 80000);
    assert.equal(parsed.paymentMethod, 'split_refund', `Failed for "${text}"`);
    assert.equal(parsed.transferAmount, 100000, `Transfer mismatch for "${text}"`);
    assert.equal(parsed.cashRefund, 20000, `Refund mismatch for "${text}"`);
    assert.equal(parsed.netTransfer, 100000, `Net transfer mismatch for "${text}"`);
    assert.equal(parsed.netCash, -20000, `Net cash mismatch for "${text}"`);
    assert.equal(parsed.recognizedRevenue, 80000, `Revenue mismatch for "${text}"`);
  });
});

test('parses Column M: Case 5 - Deposit (coc 200k ck hen 22h)', () => {
  const parsed = parseNoteColumn('coc 200k ck hen 22h', 0);
  assert.equal(parsed.isDeposit, true);
  assert.equal(parsed.depositAmount, 200000);
  assert.equal(parsed.netTransfer, 200000);
});

test('parses Column M: Case 5 - Advance payment (Đã thu trước: 200.000 ₫)', () => {
  const parsed = parseNoteColumn('Đã thu trước: 200.000 ₫', 0);
  assert.equal(parsed.isDeposit, true);
  assert.equal(parsed.depositAmount, 200000);
  assert.equal(parsed.netCash, 200000);
});

test('parses Column M: Case 5 - Advance payment with CK (Thu trước 150k ck)', () => {
  const parsed = parseNoteColumn('Thu trước 150k ck', 0);
  assert.equal(parsed.isDeposit, true);
  assert.equal(parsed.depositAmount, 150000);
  assert.equal(parsed.netTransfer, 150000);
});

test('detects buffer conflict: 22:00 reservation gives max check-out 21:30', () => {
  const allRows = [
    {
      id: 1,
      date: '05/08/2026',
      roomNumber: '101',
      roomType: 'Qua đêm',
      checkIn: '22:00',
      status: 'Đã cọc',
    },
    {
      id: 2,
      date: '05/08/2026',
      roomNumber: '101',
      roomType: 'Giờ',
      checkIn: '18:00',
      checkOut: '',
      status: 'Đang ở',
    },
  ];

  const conflict = detectExcelConflict(allRows[1], allRows, new Date('2026-08-05T19:00:00'));
  assert.equal(conflict.hasConflict, true);
  assert.equal(conflict.maxCheckOutTime, '21:30');
  assert.equal(conflict.expectedArrivalTime, '22:00');
});

test('calculateExcelRow: Retail drink sales without room number calculates water and total amount', () => {
  const retailRow = {
    id: 999,
    roomNumber: '',
    roomType: 'Giờ',
    checkIn: '',
    checkOut: '',
    beer: 2, // 2 * 20,000 = 40,000
    filteredWater: 1, // 1 * 10,000 = 10,000
    softDrink: 1, // 1 * 15,000 = 15,000
    extra: 0,
    status: 'Đang ở',
  };

  const calculated = calculateExcelRow(retailRow);
  assert.equal(calculated.waterAmount, 65000);
  assert.equal(calculated.roomAmount, 0); // No room fee
  assert.equal(calculated.totalAmount, 65000);
});

test('calculateExcelRow: 6:00 AM Date Separator maintains zero amounts', () => {
  const sepRow = {
    id: 888,
    date: '21/09/2026',
    roomNumber: '---',
    roomType: 'Giờ',
    checkIn: '06:00',
    checkOut: '',
    beer: '',
    filteredWater: '',
    softDrink: '',
    note: '--- BẮT ĐẦU NGÀY MỚI (06:00 SÁNG 21/09/2026) ---',
    status: 'Xong',
    isDateSeparator: true,
  };

  const calculated = calculateExcelRow(sepRow);
  assert.equal(calculated.isDateSeparator, true);
  assert.equal(calculated.waterAmount, 0);
  assert.equal(calculated.roomAmount, 0);
  assert.equal(calculated.totalAmount, 0);
  assert.equal(calculated.depositAmount, 0);
});

