import test from 'node:test';
import assert from 'node:assert/strict';

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

import { hotelStore, INITIAL_ROOMS, getTodayDateString } from './hotelStore.js';

function resetStore() {
  localStorage.clear();
  hotelStore.saveRooms(INITIAL_ROOMS.map((r) => ({ ...r, status: 'available' })));
  hotelStore.saveBookings([]);
  hotelStore.savePayments([]);
  hotelStore.saveExpenses([]);
  hotelStore.saveReservations([]);
  hotelStore.saveShiftClosures([]);
  localStorage.setItem('hotel_pos_excel_rows_v3', JSON.stringify([]));
}

test('Smoke: full POS feature flow (PIN, reservation, check-in/out, drinks, expense, lock, close shift)', () => {
  resetStore();

  // 1. Auth defaults (PIN nhân viên 123, Admin 234; 123/234 luôn là master fallback)
  assert.equal(hotelStore.verifyStaffPin('123'), true);
  assert.equal(hotelStore.verifyAdminPassword('234'), true);
  hotelStore.setStaffPin('5678');
  assert.equal(hotelStore.verifyStaffPin('5678'), true);
  assert.equal(hotelStore.verifyStaffPin('123'), true); // master fallback
  hotelStore.setStaffPin('123');
  hotelStore.setAdminPassword('9999');
  assert.equal(hotelStore.verifyAdminPassword('9999'), true);
  assert.equal(hotelStore.verifyAdminPassword('234'), true); // master fallback
  hotelStore.setAdminPassword('234');

  // 2. Rooms seeded
  const rooms = hotelStore.getRooms();
  assert.equal(rooms.length, 11);
  assert.ok(rooms.every((r) => r.status === 'available'));

  // 3. Reservation + deposit
  const reservation = hotelStore.createReservation({
    roomNumber: '201',
    customerName: 'Nguyễn Văn A',
    customerPhone: '0909111222',
    rentalType: 'hourly',
    expectedCheckIn: new Date().toISOString(),
    depositAmount: 100000,
    depositMethod: 'transfer',
    notes: 'Cọc giữ phòng test',
  });
  assert.equal(reservation.status, 'active');
  assert.equal(reservation.deposit_amount, 100000);
  const depositPay = hotelStore.getPayments().find((p) => p.reservation_id === reservation.id);
  assert.ok(depositPay);
  assert.equal(depositPay.amount, 100000);
  assert.equal(depositPay.method, 'transfer');

  // 4. Check-in from reservation (carry deposit)
  const { booking } = hotelStore.checkInRoom({
    roomNumber: '201',
    customerName: 'Nguyễn Văn A',
    customerPhone: '0909111222',
    rentalType: 'hourly',
    roomRateMode: 'single',
    checkInTime: new Date(Date.now() - 90 * 60000).toISOString(),
    drinks: { beer_qty: 1, water_qty: 1, soft_drink_qty: 0 },
    depositAmount: 100000,
    reservationId: reservation.id,
    notes: 'Nhận từ cọc',
  });
  assert.equal(booking.status, 'active');
  assert.equal(booking.paid_amount, 100000);
  assert.equal(booking.beer_qty, 1);
  assert.equal(hotelStore.getRooms().find((r) => r.room_number === '201').status, 'occupied');
  assert.equal(hotelStore.getReservations().find((r) => r.id === reservation.id).status, 'arrived');

  // 5. Update drinks while staying
  hotelStore.updateBookingDrinks({
    bookingId: booking.id,
    roomNumber: '201',
    drinks: { beer_qty: 2, water_qty: 1, soft_drink_qty: 1 },
  });
  const withDrinks = hotelStore.getBookings().find((b) => b.id === booking.id);
  assert.equal(withDrinks.beer_qty, 2);
  assert.equal(withDrinks.soft_drink_qty, 1);

  // 6. Check-out split payment + refund
  const checkout = hotelStore.checkOutWithSplitAndRefund({
    bookingId: booking.id,
    checkOutTime: new Date().toISOString(),
    drinks: { beer_qty: 2, water_qty: 1, soft_drink_qty: 1 },
    surchargeAmount: 10000,
    surchargeReason: 'Phụ thu test',
    cashReceived: 0,
    transferReceived: 50000,
    refundMethod: 'cash',
    notes: 'Trả phòng smoke',
    nextRoomStatus: 'available',
  });
  assert.ok(checkout.booking);
  assert.equal(checkout.booking.status, 'completed');
  assert.ok(checkout.booking.total_amount > 0);
  assert.equal(hotelStore.getRooms().find((r) => r.room_number === '201').status, 'available');

  // 7. Direct check-in another room + overnight rate
  const { booking: b103 } = hotelStore.checkInRoom({
    roomNumber: '103',
    customerName: 'Trần B',
    rentalType: 'overnight',
    roomRateMode: 'single',
    checkInTime: new Date().toISOString(),
    drinks: {},
    depositAmount: 0,
  });
  assert.equal(b103.rental_type, 'overnight');
  assert.equal(hotelStore.getRooms().find((r) => r.room_number === '103').status, 'occupied');

  // 9. Expense pending -> approve
  const expense = hotelStore.createExpense({
    amount: 35000,
    reason: 'Mua nước',
    method: 'cash',
    requester: 'Lễ tân',
    status: 'pending',
  });
  assert.equal(expense.status, 'pending');
  hotelStore.approveExpense(expense.id, 'Admin');
  const approved = hotelStore.getExpenses().find((e) => e.id === expense.id);
  assert.equal(approved.status, 'approved');
  const expensePay = hotelStore.getPayments().find((p) => p.payment_type === 'expense' && p.amount === -35000);
  assert.ok(expensePay);

  // 10. Input lock toggle
  assert.equal(hotelStore.isInputLocked(), false);
  hotelStore.toggleInputLocked();
  assert.equal(hotelStore.isInputLocked(), true);
  hotelStore.toggleInputLocked();
  assert.equal(hotelStore.isInputLocked(), false);

  // 11. Advance payment on active booking
  hotelStore.addPaymentRecord({
    bookingId: b103.id,
    roomNumber: '103',
    paymentType: 'advance',
    method: 'cash',
    amount: 50000,
    note: 'Thu trước',
  });
  const advances = hotelStore.getPayments().filter((p) => p.booking_id === b103.id && p.payment_type === 'advance');
  assert.equal(advances.length, 1);

  // 12. Close shift / reopen
  const today = getTodayDateString();
  const closed = hotelStore.closeShift({
    date: today,
    shiftName: 'Ca smoke test',
    initialCash: 1000000,
    notes: 'Chốt smoke',
  });
  assert.equal(closed.success, true);
  assert.ok(closed.closure.id);
  assert.equal(hotelStore.getShiftClosures().length, 1);
  hotelStore.reopenShift(closed.closure.id);
  assert.equal(hotelStore.getShiftClosures().length, 0);

  // 13. Excel rebuild still works
  const excelRows = hotelStore.rebuildExcelRowsFromBookings();
  assert.ok(Array.isArray(excelRows));
  const completedRow = excelRows.find((r) => r.bookingId === booking.id || r.id === booking.id);
  assert.ok(completedRow);
  assert.equal(completedRow.status, 'Xong');

  // 14. Audit log has actions
  const logs = hotelStore.getAuditLogs();
  assert.ok(logs.length >= 3);
  assert.ok(logs.some((l) => /Nhận phòng|Đặt cọc|Khóa sổ|phiếu chi/i.test(l.action)));

  // 15. Cancel second booking cleanly then free room
  hotelStore.checkOutWithSplitAndRefund({
    bookingId: b103.id,
    checkOutTime: new Date(Date.now() + 8 * 3600000).toISOString(),
    drinks: {},
    cashReceived: 150000,
    transferReceived: 0,
    nextRoomStatus: 'available',
  });
  assert.equal(hotelStore.getRooms().find((r) => r.room_number === '103').status, 'available');
  assert.equal(hotelStore.getBookings().find((b) => b.id === b103.id).status, 'completed');
});

test('Smoke: Excel retail + split note sync still settles ledger', () => {
  resetStore();

  const { booking } = hotelStore.checkInRoom({
    roomNumber: '301',
    customerName: 'Excel Guest',
    rentalType: 'hourly',
    checkInTime: new Date(Date.now() - 45 * 60000).toISOString(),
  });

  const excelRow = {
    id: booking.id,
    bookingId: booking.id,
    date: '21/09/2026',
    roomNumber: '301',
    roomType: 'Giờ',
    checkIn: '20:00',
    checkOut: '21:00',
    beer: 1,
    filteredWater: 0,
    softDrink: 0,
    waterAmount: 20000,
    roomAmount: 80000,
    extra: 0,
    totalAmount: 100000,
    note: 'ck100k thoi 20k',
    status: 'Xong',
    depositAmount: 0,
    isDateSeparator: false,
  };

  hotelStore.syncFromExcelRows([excelRow]);

  const settled = hotelStore.getBookings().find((b) => b.id === booking.id);
  assert.equal(settled.status, 'completed');
  assert.equal(hotelStore.getRooms().find((r) => r.room_number === '301').status, 'available');

  const payments = hotelStore.getPayments().filter((p) => p.booking_id === booking.id);
  assert.ok(payments.some((p) => p.method === 'transfer' && p.amount === 100000));
  assert.ok(payments.some((p) => p.method === 'cash' && p.amount === -20000));
});

test('Full Check-out Suite: Rental type override, Double room override, Discounts, and Overpayment Refund', () => {
  resetStore();

  // Test 1: Check-in room 104 as hourly, override to Overnight Double at checkout
  const { booking: b104 } = hotelStore.checkInRoom({
    roomNumber: '104',
    customerName: 'Khách VIP P.104',
    rentalType: 'hourly',
    roomRateMode: 'single',
    checkInTime: '2026-09-22T20:00:00.000Z',
    drinks: { beer_qty: 2, water_qty: 2, soft_drink_qty: 1 },
    depositAmount: 100000,
  });

  assert.equal(b104.status, 'active');
  assert.equal(hotelStore.getRooms().find((r) => r.room_number === '104').status, 'occupied');

  // Checkout with override: rentalType = 'overnight', roomRateMode = 'double'
  // Overnight Double = 350k, Minibar = 2*20k + 2*10k + 1*15k = 75k, Surcharge = -25k (discount)
  // Total = 350k + 75k - 25k = 400k.
  // Previous deposit = 100k -> Balance due = 300k.
  // Guest transfers 500k -> Change due = 200k (Rút két tiền mặt thối khách).
  const checkout104 = hotelStore.checkOutWithSplitAndRefund({
    bookingId: b104.id,
    roomNumber: '104',
    checkOutTime: '2026-09-23T08:00:00.000Z',
    rentalType: 'overnight',
    roomRateMode: 'double',
    drinks: { beer_qty: 2, water_qty: 2, soft_drink_qty: 1 },
    surchargeAmount: -25000,
    surchargeReason: 'Khách VIP quen giảm 25k',
    cashReceived: 0,
    transferReceived: 500000,
    refundMethod: 'cash',
    notes: 'ck500k thoi 200k',
    nextRoomStatus: 'available',
  });

  assert.equal(checkout104.booking.status, 'completed');
  assert.equal(checkout104.booking.rental_type, 'overnight');
  assert.equal(checkout104.booking.room_rate_mode, 'double');
  assert.equal(checkout104.booking.room_amount, 350000);
  assert.equal(checkout104.booking.service_amount, 75000);
  assert.equal(checkout104.booking.surcharge_amount, -25000);
  assert.equal(checkout104.booking.total_amount, 400000);
  assert.equal(checkout104.changeDue, 200000);
  assert.equal(hotelStore.getRooms().find((r) => r.room_number === '104').status, 'available');

  const payments104 = hotelStore.getPayments().filter((p) => p.booking_id === b104.id);
  // Deposit 100k + Transfer settlement 500k - Cash refund 200k = Net recognized 400k
  assert.ok(payments104.some((p) => p.payment_type === 'deposit' && p.amount === 100000));
  assert.ok(payments104.some((p) => p.payment_type === 'settlement' && p.method === 'transfer' && p.amount === 500000));
  assert.ok(payments104.some((p) => p.payment_type === 'refund' && p.method === 'cash' && p.amount === -200000));

  // Test 2: Advance overpayment refund when deposit > bill
  const { booking: b202 } = hotelStore.checkInRoom({
    roomNumber: '202',
    customerName: 'Khách Cọc Dư',
    rentalType: 'hourly',
    roomRateMode: 'single',
    checkInTime: new Date(Date.now() - 30 * 60000).toISOString(),
    drinks: {},
    depositAmount: 200000, // Deposit 200k
  });

  // Bill is 1h = 80k. Deposit was 200k. Excess deposit = 120k.
  const checkout202 = hotelStore.checkOutWithSplitAndRefund({
    bookingId: b202.id,
    roomNumber: '202',
    checkOutTime: new Date().toISOString(),
    rentalType: 'hourly',
    roomRateMode: 'single',
    drinks: {},
    surchargeAmount: 0,
    cashReceived: 0,
    transferReceived: 0,
    refundMethod: 'cash',
    nextRoomStatus: 'available',
  });

  assert.equal(checkout202.booking.status, 'completed');
  assert.equal(checkout202.booking.total_amount, 80000);
  assert.equal(checkout202.changeDue, 120000); // 120k refunded to guest
  assert.equal(hotelStore.getRooms().find((r) => r.room_number === '202').status, 'available');

  const payments202 = hotelStore.getPayments().filter((p) => p.booking_id === b202.id);
  assert.ok(payments202.some((p) => p.payment_type === 'refund' && p.amount === -120000));
});

