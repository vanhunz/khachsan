import test from 'node:test';
import assert from 'node:assert/strict';
import { hotelStore, getTodayDateString } from './hotelStore.js';
import { parseNoteColumn } from '../utils/excelParser.js';

// Setup Mock LocalStorage
const storage = {};
global.localStorage = {
  getItem: (k) => (k in storage ? storage[k] : null),
  setItem: (k, v) => {
    storage[k] = String(v);
  },
  removeItem: (k) => {
    delete storage[k];
  },
  clear: () => {
    Object.keys(storage).forEach((k) => delete storage[k]);
  },
};

global.window = {
  dispatchEvent: () => {},
  CustomEvent: class CustomEvent {
    constructor(type, detail) {
      this.type = type;
      this.detail = detail;
    }
  },
};

test('User Scenario: Thu trước Ca 1 (100k) chốt +100k, Ca 2 trả phòng thu 100k chốt tiếp +100k', async () => {
  global.localStorage.clear();
  const today = '2026-09-22';

  // 1. Initial State: Seed rooms
  const rooms = hotelStore.getRooms();
  assert.ok(rooms.length > 0);

  // 2. Check-in Room 101 overnight (200,000 VND) in Shift 1
  const shift1Time = new Date('2026-09-22T08:00:00Z').toISOString();
  const checkinRes = hotelStore.checkInRoom({
    roomNumber: '101',
    rentalType: 'overnight',
    checkInTime: shift1Time,
    customerName: 'Anh Nam',
  });
  assert.equal(checkinRes.booking.room_number, '101');
  assert.equal(checkinRes.booking.status, 'active');

  // 3. Collect 100k advance payment (Thu trước 100k) during Shift 1
  const advancePaymentRes = hotelStore.collectAdvancePayment({
    bookingId: checkinRes.booking.id,
    roomNumber: '101',
    amount: 100000,
    method: 'cash',
    note: 'Thu trước 100k tiền phòng qua đêm',
    createdAt: new Date('2026-09-22T08:30:00Z').toISOString(),
  });
  assert.equal(advancePaymentRes.booking.paid_amount, 100000);
  assert.equal(advancePaymentRes.booking.deposit_amount, 100000);

  // Verify Shift 1 summary before closing
  const shift1Summary = hotelStore.getLedgerSummary(today, 'shift');
  assert.equal(shift1Summary.netCash, 100000);
  assert.equal(shift1Summary.totalRevenueRecognized, 100000);

  // 4. Close Shift 1 (Chốt Ca 1)
  const shift1Closure = hotelStore.closeShift({
    date: today,
    shiftName: 'Ca sáng (06:00 - 14:00)',
    initialCash: 1000000,
    notes: 'Bàn giao ca 1',
    closedAt: new Date('2026-09-22T14:00:00Z').toISOString(),
  });
  assert.equal(shift1Closure.closure.net_cash, 100000);
  assert.equal(shift1Closure.closure.total_revenue_recognized, 100000);
  assert.equal(shift1Closure.closure.total_cash_in_drawer, 1100000); // 1,000,000 + 100,000

  // 5. Shift 2 starts: Check-out Room 101 at 15:00
  // Total bill is 200,000 VND (overnight). Previous deposit is 100,000 VND.
  // Remaining balance due is 100,000 VND.
  const shift2CheckoutTime = new Date('2026-09-22T15:00:00Z').toISOString();
  const checkoutRes = hotelStore.checkOutWithSplitAndRefund({
    bookingId: checkinRes.booking.id,
    roomNumber: '101',
    checkOutTime: shift2CheckoutTime,
    paymentCreatedAt: shift2CheckoutTime,
    rentalType: 'overnight',
    cashReceived: 100000, // Pay remaining 100k
    transferReceived: 0,
  });

  assert.equal(checkoutRes.booking.status, 'completed');
  assert.equal(checkoutRes.booking.total_amount, 200000);
  assert.equal(checkoutRes.booking.paid_amount, 200000);
  assert.equal(checkoutRes.booking.deposit_amount, 100000);
  assert.equal(checkoutRes.changeDue, 0);

  // 6. Verify Shift 2 ledger summary (only includes payments created after Shift 1 closure)
  const shift2Summary = hotelStore.getLedgerSummary(today, 'shift');
  assert.equal(shift2Summary.netCash, 100000);
  assert.equal(shift2Summary.totalRevenueRecognized, 100000);

  // 7. Close Shift 2 (Chốt Ca 2)
  const shift2Closure = hotelStore.closeShift({
    date: today,
    shiftName: 'Ca chiều (14:00 - 22:00)',
    initialCash: 1000000,
    notes: 'Bàn giao ca 2',
    closedAt: new Date('2026-09-22T22:00:00Z').toISOString(),
  });
  assert.equal(shift2Closure.closure.net_cash, 100000);
  assert.equal(shift2Closure.closure.total_revenue_recognized, 100000);
  assert.equal(shift2Closure.closure.total_cash_in_drawer, 1100000);

  // 8. Total across whole day (all shifts)
  const allPayments = hotelStore.getPayments().filter((p) => p.booking_id === checkinRes.booking.id);
  assert.equal(allPayments.length, 2);
  const totalPaidAcrossShifts = allPayments.reduce((sum, p) => sum + p.amount, 0);
  assert.equal(totalPaidAcrossShifts, 200000);
});

test('Bidirectional Management: Excel -> POS and POS -> Excel sync seamlessly', async () => {
  global.localStorage.clear();

  // 1. Enter Room 201 in Excel as active (Đang ở) with 14:00 check-in, overnight, and 100k deposit
  const excelRow201 = {
    id: 201001,
    bookingId: null,
    date: '22/09/2026',
    roomNumber: '201',
    roomType: 'Qua đêm',
    checkIn: '14:00',
    checkOut: '',
    beer: 1,
    filteredWater: 2,
    softDrink: 0,
    waterAmount: 40000,
    roomAmount: 200000,
    extra: 0,
    totalAmount: 240000,
    depositAmount: 100000,
    note: 'Cọc 100k tiền mặt',
    status: 'Đang ở',
  };

  hotelStore.syncFromExcelRows([excelRow201]);

  // Check POS state: Room 201 must be OCCUPIED with active booking
  const rooms = hotelStore.getRooms();
  const room201 = rooms.find((r) => r.room_number === '201');
  assert.equal(room201.status, 'occupied');

  const bookings = hotelStore.getBookings();
  const active201 = bookings.find((b) => String(b.room_number) === '201' && b.status === 'active');
  assert.ok(active201);
  assert.equal(active201.beer_qty, 1);
  assert.equal(active201.water_qty, 2);
  assert.equal(active201.paid_amount, 100000);
  assert.equal(active201.deposit_amount, 100000);

  // Verify advance payment was recorded for Room 201
  const payments201 = hotelStore.getPayments().filter((p) => sameEntityId(p.booking_id, active201.id));
  assert.equal(payments201.length, 1);
  assert.equal(payments201[0].payment_type, 'advance');
  assert.equal(payments201[0].amount, 100000);

  // 2. Checkout Room 201 from Excel directly
  const excelRow201Done = {
    ...excelRow201,
    bookingId: active201.id,
    checkOut: '08:00',
    status: 'Xong',
    totalAmount: 240000,
  };

  hotelStore.syncFromExcelRows([excelRow201Done]);

  // Check POS state: Room 201 must be AVAILABLE and completed
  const updatedRooms = hotelStore.getRooms();
  assert.equal(updatedRooms.find((r) => r.room_number === '201').status, 'available');

  const updatedBookings = hotelStore.getBookings();
  const completed201 = updatedBookings.find((b) => sameEntityId(b.id, active201.id));
  assert.equal(completed201.status, 'completed');

  // Verify remaining balance settlement (240k - 100k = 140k) recorded
  const allPayments201 = hotelStore.getPayments().filter((p) => sameEntityId(p.booking_id, active201.id));
  assert.equal(allPayments201.length, 2);
  const settlementPayment = allPayments201.find((p) => p.payment_type === 'settlement');
  assert.ok(settlementPayment);
  assert.equal(settlementPayment.amount, 140000);
});

test('POS check-in propagates to Excel with status Đang ở and empty checkOut', () => {
  global.localStorage.clear();

  const { booking: b302 } = hotelStore.checkInRoom({
    roomNumber: '302',
    rentalType: 'hourly',
    checkInTime: new Date().toISOString(),
    customerName: 'Khách POS 302',
    drinks: { beer_qty: 2, water_qty: 1 },
    depositAmount: 50000,
  });

  assert.equal(b302.status, 'active');

  // Verify Excel rows stored in localStorage
  const excelRows = hotelStore.getExcelRows();
  const row302 = excelRows.find((r) => String(r.roomNumber) === '302' && sameEntityId(r.bookingId, b302.id));
  assert.ok(row302, 'Excel rows must contain active row for room 302');
  assert.equal(row302.status, 'Đang ở', 'Status on Excel must be Đang ở');
  assert.equal(row302.checkOut, '', 'checkOut on Excel must be empty for active stay');
  assert.equal(row302.beer, 2);
  assert.equal(row302.depositAmount, 50000);
});

test('Excel new stay for room with past completed stay with identical amount is NOT hijacked as completed', () => {
  global.localStorage.clear();

  // 1. Existing completed booking on Room 102 (Overnight, 200k)
  const oldCompletedBooking = {
    id: 999102,
    room_id: 2,
    room_number: '102',
    customer_name: 'Khách cũ 102',
    customer_phone: '',
    rental_type: 'overnight',
    check_in: '2026-09-20T14:00:00.000Z',
    check_out: '2026-09-21T08:00:00.000Z',
    beer_qty: 0,
    water_qty: 0,
    soft_drink_qty: 0,
    room_amount: 200000,
    service_amount: 0,
    surcharge_amount: 0,
    total_amount: 200000,
    paid_amount: 200000,
    balance_amount: 0,
    deposit_amount: 0,
    status: 'completed',
    created_at: '2026-09-20T14:00:00.000Z',
  };
  hotelStore.saveBookings([oldCompletedBooking]);

  // 2. User enters a NEW stay for Room 102 in Excel: Overnight (200k), status 'Đang ở'
  const newExcelRow102 = {
    id: 102002,
    bookingId: null,
    date: '22/09/2026',
    roomNumber: '102',
    roomType: 'Qua đêm',
    checkIn: '15:00',
    checkOut: '',
    beer: '',
    filteredWater: '',
    softDrink: '',
    waterAmount: 0,
    roomAmount: 200000,
    extra: 0,
    totalAmount: 200000,
    depositAmount: 0,
    note: 'Khách mới',
    status: 'Đang ở',
  };

  hotelStore.syncFromExcelRows([newExcelRow102]);

  // Verify POS state: Room 102 must be OCCUPIED with a NEW active booking!
  const rooms = hotelStore.getRooms();
  assert.equal(rooms.find((r) => r.room_number === '102').status, 'occupied');

  const bookings = hotelStore.getBookings();
  const activeBookings = bookings.filter((b) => String(b.room_number) === '102' && b.status === 'active');
  assert.equal(activeBookings.length, 1, 'Room 102 must have exactly 1 active booking');
  assert.notEqual(activeBookings[0].id, oldCompletedBooking.id);
  assert.equal(activeBookings[0].rental_type, 'overnight');

  // Verify the old completed booking remains intact
  const completedBookings = bookings.filter((b) => String(b.room_number) === '102' && b.status === 'completed');
  assert.equal(completedBookings.length, 1);
});

test('Bidirectional live updates: change drinks & notes in Excel -> reflected on POS -> checkout on POS -> reflected on Excel', () => {
  global.localStorage.clear();

  // 1. Start room 103 on POS
  const { booking: b103 } = hotelStore.checkInRoom({
    roomNumber: '103',
    rentalType: 'hourly',
    checkInTime: '2026-09-22T10:00:00.000Z',
    customerName: 'Khách 103',
  });
  assert.equal(b103.status, 'active');

  // 2. User adds 3 beers and note in Excel
  const excelRows = hotelStore.getExcelRows();
  const row103 = excelRows.find((r) => String(r.roomNumber) === '103' && sameEntityId(r.bookingId, b103.id));
  assert.ok(row103);

  const updatedExcelRow103 = {
    ...row103,
    beer: 3,
    filteredWater: 1,
    note: 'Khách xin thêm chăn',
    waterAmount: 70000,
    totalAmount: 150000,
  };

  hotelStore.syncFromExcelRows([updatedExcelRow103]);

  // Check POS booking updated
  const posBooking = hotelStore.getBookings().find((b) => sameEntityId(b.id, b103.id));
  assert.equal(posBooking.beer_qty, 3);
  assert.equal(posBooking.water_qty, 1);
  assert.equal(posBooking.notes, 'Khách xin thêm chăn');

  // 3. User checks out on POS
  const checkoutRes = hotelStore.checkOutWithSplitAndRefund({
    bookingId: b103.id,
    roomNumber: '103',
    checkOutTime: '2026-09-22T12:00:00.000Z',
    rentalType: 'hourly',
    cashReceived: 150000,
  });
  assert.equal(checkoutRes.booking.status, 'completed');

  // Check Excel row is now 'Xong' and has checkOut filled
  const excelAfterCheckout = hotelStore.getExcelRows();
  const finalRow103 = excelAfterCheckout.find((r) => String(r.roomNumber) === '103' && sameEntityId(r.bookingId, b103.id));
  assert.ok(finalRow103);
  assert.equal(finalRow103.status, 'Xong');
  assert.ok(finalRow103.checkOut && finalRow103.checkOut !== '', 'Excel row must have checkOut time populated');
});

test('User Scenario: Thu trước Ca 1 (100k) chốt, Ca 2 thu trước tiếp 100k (không trả phòng) chốt tiếp +100k', async () => {
  global.localStorage.clear();
  const today = '2026-09-22';

  // 1. Check-in Room 102 overnight (200k)
  const checkin = hotelStore.checkInRoom({
    roomNumber: '102',
    rentalType: 'overnight',
    checkInTime: new Date('2026-09-22T08:00:00Z').toISOString(),
    customerName: 'Chị Mai',
  });

  // 2. Shift 1: Thu trước 100k
  hotelStore.collectAdvancePayment({
    bookingId: checkin.booking.id,
    roomNumber: '102',
    amount: 100000,
    method: 'cash',
    createdAt: new Date('2026-09-22T08:30:00Z').toISOString(),
  });

  // 3. Close Shift 1
  const shift1 = hotelStore.closeShift({
    date: today,
    shiftName: 'Ca sáng',
    initialCash: 1000000,
    closedAt: new Date('2026-09-22T14:00:00Z').toISOString(),
  });
  assert.equal(shift1.closure.net_cash, 100000);
  assert.equal(shift1.closure.total_cash_in_drawer, 1100000);

  // 4. Shift 2: Thu trước TIẾP 100k cho phòng 102
  hotelStore.collectAdvancePayment({
    bookingId: checkin.booking.id,
    roomNumber: '102',
    amount: 100000,
    method: 'cash',
    createdAt: new Date('2026-09-22T16:00:00Z').toISOString(),
  });

  // 5. Shift 2 summary must reflect +100k and total drawer 1100k
  const shift2Summary = hotelStore.getLedgerSummary(today, 'shift');
  assert.equal(shift2Summary.netCash, 100000);
  assert.equal(shift2Summary.totalRevenueRecognized, 100000);

  const shift2 = hotelStore.closeShift({
    date: today,
    shiftName: 'Ca chiều',
    initialCash: 1000000,
    closedAt: new Date('2026-09-22T22:00:00Z').toISOString(),
  });
  assert.equal(shift2.closure.net_cash, 100000);
  assert.equal(shift2.closure.total_cash_in_drawer, 1100000);
});

test('Excel deposit updated incrementally in Shift 2 correctly registers new payment for Shift 2', async () => {
  global.localStorage.clear();
  const today = '2026-09-22';

  // 1. Shift 1: Row with 100k deposit
  const excelRow = {
    id: 103001,
    bookingId: null,
    date: '22/09/2026',
    roomNumber: '103',
    roomType: 'Qua đêm',
    checkIn: '08:00',
    checkOut: '',
    beer: 0,
    filteredWater: 0,
    softDrink: 0,
    waterAmount: 0,
    roomAmount: 200000,
    extra: 0,
    totalAmount: 200000,
    depositAmount: 100000,
    note: 'Cọc 100k',
    status: 'Đang ở',
  };
  hotelStore.syncFromExcelRows([excelRow]);

  // Small delay then close Shift 1
  await new Promise((r) => setTimeout(r, 20));
  hotelStore.closeShift({
    date: today,
    shiftName: 'Ca 1',
    initialCash: 1000000,
  });

  // 2. Shift 2: Small delay to ensure timestamp is strictly after Shift 1 closure
  await new Promise((r) => setTimeout(r, 20));
  const updatedRow = {
    ...excelRow,
    depositAmount: 200000,
  };
  hotelStore.syncFromExcelRows([updatedRow]);

  // Shift 2 ledger must now have the incremental 100k payment
  const shift2Summary = hotelStore.getLedgerSummary(today, 'shift');
  assert.equal(shift2Summary.netCash, 100000);
  assert.equal(shift2Summary.totalRevenueRecognized, 100000);
});

test('Excel operations (filling checkout preview time, editing drinks/notes, adding rows) NEVER auto-check out active rooms', () => {
  global.localStorage.clear();

  // 1. Room 101 has past completed stay
  hotelStore.saveBookings([
    {
      id: 111111,
      room_id: 1,
      room_number: '101',
      customer_name: 'Khách cũ',
      rental_type: 'hourly',
      status: 'completed',
    },
  ]);

  // 2. Room 101 checks in a NEW guest (active)
  const { booking: active101 } = hotelStore.checkInRoom({
    roomNumber: '101',
    rentalType: 'hourly',
    customerName: 'Khách mới 101',
  });
  assert.equal(active101.status, 'active');
  assert.equal(hotelStore.getRooms().find((r) => r.room_number === '101').status, 'occupied');

  // 3. User is in Excel and enters/edits rows:
  // - Excel has a historical completed row for 101 from past stay
  // - Excel has an active row for 101
  const excelRows = [
    {
      id: 111111,
      bookingId: null, // Unlinked historical row
      date: '22/09/2026',
      roomNumber: '101',
      roomType: 'Giờ',
      checkIn: '06:00',
      checkOut: '07:00',
      totalAmount: 80000,
      status: 'Xong',
    },
    {
      id: active101.id,
      bookingId: active101.id,
      date: '22/09/2026',
      roomNumber: '101',
      roomType: 'Giờ',
      checkIn: '08:00',
      checkOut: '09:00', // Preview checkout time filled!
      beer: 2,
      note: 'Khách xin thêm gối',
      status: 'Đang ở', // Still active!
    },
  ];

  // Sync from Excel
  hotelStore.syncFromExcelRows(excelRows);

  // Active stay MUST remain active and occupied!
  const current101 = hotelStore.getBookings().find((b) => b.id === active101.id);
  assert.ok(current101);
  assert.equal(current101.status, 'active', 'Room 101 must remain active!');
  assert.equal(current101.beer_qty, 2);
  assert.equal(current101.notes, 'Khách xin thêm gối');
  assert.equal(hotelStore.getRooms().find((r) => r.room_number === '101').status, 'occupied', 'Room 101 must remain occupied!');
});

test('Excel row stability: A new row added at the bottom stays at the bottom and does not jump into middle', async () => {
  const { sortExcelRows } = await import('../utils/excelParser.js');

  const rows = [
    { id: 100, date: '23/09/2026', roomNumber: '101', checkIn: '08:00', status: 'Đang ở' },
    { id: 200, date: '23/09/2026', roomNumber: '201', checkIn: '14:00', status: 'Đang ở' },
    { id: 300, date: '23/09/2026', roomNumber: '102', checkIn: '09:00', status: 'Đang ở' }, // Entered later at the bottom
  ];

  const sorted = sortExcelRows(rows);
  assert.equal(sorted[0].roomNumber, '101');
  assert.equal(sorted[1].roomNumber, '201');
  assert.equal(sorted[2].roomNumber, '102', 'Row 102 must remain at the bottom where it was entered, NOT jump between 101 and 201');
});

test('Room Transfer on POS: Switch active stay from Room 101 to Room 102', () => {
  global.localStorage.clear();

  // 1. Check in Room 101 with drinks and deposit
  const { booking: b101 } = hotelStore.checkInRoom({
    roomNumber: '101',
    customerName: 'Anh Nam',
    customerPhone: '0912345678',
    rentalType: 'hourly',
    roomRateMode: 'single',
    checkInTime: '2026-09-23T08:00:00.000Z',
    drinks: { beer_qty: 2, water_qty: 1 },
    depositAmount: 100000,
    depositMethod: 'cash',
    notes: 'Khách VIP',
  });

  assert.equal(hotelStore.getRooms().find((r) => r.room_number === '101').status, 'occupied');
  assert.equal(hotelStore.getRooms().find((r) => r.room_number === '102').status, 'available');

  // 2. Transfer Room 101 -> Room 102
  hotelStore.transferRoom('101', '102', 'Đổi sang phòng to hơn');

  // 3. Verify Room statuses
  assert.equal(hotelStore.getRooms().find((r) => r.room_number === '101').status, 'available', 'Old room 101 must be available');
  assert.equal(hotelStore.getRooms().find((r) => r.room_number === '102').status, 'occupied', 'New room 102 must be occupied');

  // 4. Verify Booking updated
  const updatedBooking = hotelStore.getBookings().find((b) => b.id === b101.id);
  assert.equal(updatedBooking.room_number, '102');
  assert.equal(updatedBooking.beer_qty, 2);
  assert.equal(updatedBooking.water_qty, 1);
  assert.equal(updatedBooking.deposit_amount, 100000);
  assert.ok(updatedBooking.notes.includes('Chuyển từ P.101 sang P.102'));

  // 5. Verify Payments updated
  const payments = hotelStore.getPayments().filter((p) => p.booking_id === b101.id);
  assert.equal(payments.length, 1);
  assert.equal(payments[0].room_number, '102');

  // 6. Verify Excel row updated to 102
  const excelRows = hotelStore.getExcelRows();
  const linkedExcelRow = excelRows.find((r) => r.bookingId === b101.id);
  assert.ok(linkedExcelRow);
  assert.equal(linkedExcelRow.roomNumber, '102');
});

test('Excel Room Number Edit: Changing roomNumber in Excel seamlessly switches POS room', () => {
  global.localStorage.clear();

  // 1. Check in Room 201
  const { booking: b201 } = hotelStore.checkInRoom({
    roomNumber: '201',
    customerName: 'Chị Mai',
    rentalType: 'hourly',
    roomRateMode: 'single',
    checkInTime: '2026-09-23T09:00:00.000Z',
    depositAmount: 50000,
  });

  assert.equal(hotelStore.getRooms().find((r) => r.room_number === '201').status, 'occupied');
  assert.equal(hotelStore.getRooms().find((r) => r.room_number === '202').status, 'available');

  // 2. In Excel, user simply edits roomNumber column from '201' to '202'
  const excelRow = {
    id: b201.id,
    bookingId: b201.id,
    date: '23/09/2026',
    roomNumber: '202', // Edited in Excel!
    roomType: 'Giờ',
    checkIn: '09:00',
    checkOut: '',
    beer: 1,
    filteredWater: 0,
    softDrink: 0,
    waterAmount: 20000,
    roomAmount: 80000,
    extra: 0,
    totalAmount: 100000,
    depositAmount: 50000,
    note: 'Đổi phòng từ Excel',
    status: 'Đang ở',
  };

  hotelStore.syncFromExcelRows([excelRow]);

  // 3. Verify Room 201 is available and Room 202 is occupied
  assert.equal(hotelStore.getRooms().find((r) => r.room_number === '201').status, 'available');
  assert.equal(hotelStore.getRooms().find((r) => r.room_number === '202').status, 'occupied');

  const syncedBooking = hotelStore.getBookings().find((b) => b.id === b201.id);
  assert.equal(syncedBooking.room_number, '202');
  assert.equal(syncedBooking.beer_qty, 1);
});

test('Excel Split Payment note syntax: ck100k tm100k correctly splits Cash and Transfer', () => {
  const tot = 200000;
  const parsed1 = parseNoteColumn('ck100k tm100k', tot, 0);
  assert.equal(parsed1.paymentMethod, 'split');
  assert.equal(parsed1.transferAmount, 100000);
  assert.equal(parsed1.cashAmount, 100000);
  assert.equal(parsed1.recognizedRevenue, 200000);

  const parsed2 = parseNoteColumn('ck150k tm50k khach quen', tot, 0);
  assert.equal(parsed2.paymentMethod, 'split');
  assert.equal(parsed2.transferAmount, 150000);
  assert.equal(parsed2.cashAmount, 50000);
  assert.equal(parsed2.recognizedRevenue, 200000);
});

test('Shift Closeout accurately calculates Cash (TM) and Transfer (CK) breakdowns', () => {
  global.localStorage.clear();
  const today = getTodayDateString();

  // 1. Room 101 checks in and pays split (100k Cash + 100k Transfer)
  const { booking: b101 } = hotelStore.checkInRoom({
    roomNumber: '101',
    customerName: 'Anh An',
    rentalType: 'overnight',
    checkInTime: '2026-09-23T08:00:00.000Z',
  });

  hotelStore.checkOutWithSplitAndRefund({
    bookingId: b101.id,
    roomNumber: '101',
    checkOutTime: '2026-09-23T09:00:00.000Z',
    cashReceived: 100000,
    transferReceived: 100000,
    notes: 'ck100k tm100k',
  });

  // 2. Room 102 checks in and pays 200k Transfer
  const { booking: b102 } = hotelStore.checkInRoom({
    roomNumber: '102',
    customerName: 'Chị Bình',
    rentalType: 'overnight',
    checkInTime: '2026-09-23T08:30:00.000Z',
  });

  hotelStore.checkOutWithSplitAndRefund({
    bookingId: b102.id,
    roomNumber: '102',
    checkOutTime: '2026-09-23T09:30:00.000Z',
    cashReceived: 0,
    transferReceived: 200000,
    notes: 'CK',
  });

  // 3. Shift ledger summary
  const summary = hotelStore.getLedgerSummary(today, 'shift');
  assert.equal(summary.netCash, 100000, 'Cash should be 100k');
  assert.equal(summary.netTransfer, 300000, 'Transfer should be 300k (100k + 200k)');
  assert.equal(summary.totalRevenueRecognized, 400000, 'Total recognized revenue should be 400k');
});

function sameEntityId(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return String(a).trim() === String(b).trim();
}


