import test from 'node:test';
import assert from 'node:assert/strict';

// In-memory localStorage mock for Node.js test environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

import { supabaseService, sanitizeBooking, sanitizeReservation, sanitizeShiftClosure, sanitizeAuditLog } from './supabaseService.js';
import { hotelStore, INITIAL_ROOMS } from './hotelStore.js';
import { supabase } from './supabaseClient.js';

test('Supabase schema sanitizers remove extraneous columns', () => {
  const dirtyBooking = {
    id: 12345,
    room_id: 1,
    room_number: '101',
    customer_name: 'Test',
    reservation_id: 999, // Extraneous
    extra_field_123: 'abc', // Extraneous
    status: 'active',
  };
  const cleanBooking = sanitizeBooking(dirtyBooking);
  assert.equal(cleanBooking.reservation_id, undefined);
  assert.equal(cleanBooking.extra_field_123, undefined);
  assert.equal(cleanBooking.room_number, '101');
  assert.equal(cleanBooking.status, 'active');

  const dirtyClosure = {
    id: 9999,
    closed_date: '2026-09-21',
    shift_name: 'Ca Sáng',
    initial_cash: 1000000, // Extraneous
    room_revenue_collected: 500000, // Extraneous
    net_cash: 200000,
  };
  const cleanClosure = sanitizeShiftClosure(dirtyClosure);
  assert.equal(cleanClosure.initial_cash, undefined);
  assert.equal(cleanClosure.room_revenue_collected, undefined);
  assert.equal(cleanClosure.net_cash, 200000);
});

test('Full Cloud & Local Sync Flow with Supabase', async () => {
  if (!supabaseService.isAvailable()) {
    console.log('Skipping cloud test: Supabase not configured');
    return;
  }

  // 1. Test Seed / Rooms Fetch
  await supabaseService.initAndSeedIfNeeded(INITIAL_ROOMS);
  const rooms = await supabaseService.fetchRooms();
  assert.ok(rooms && rooms.length >= 11, 'Must have at least 11 rooms');

  // 2. Create a booking on Supabase with advance payment
  const bookingId = Date.now();
  const testBooking = {
    id: bookingId,
    room_id: rooms[0].id,
    room_number: '101',
    customer_name: 'Khách Test E2E',
    customer_phone: '0901234567',
    rental_type: 'hourly',
    room_rate_mode: 'single',
    expected_check_in: new Date().toISOString(),
    check_in: new Date().toISOString(),
    check_out: null,
    beer_qty: 2,
    water_qty: 1,
    soft_drink_qty: 0,
    room_amount: 80000,
    service_amount: 50000,
    surcharge_amount: 0,
    surcharge_reason: '',
    total_amount: 130000,
    paid_amount: 50000,
    balance_amount: 80000,
    status: 'active',
    notes: 'Đã cọc 50k',
    reservation_id: 888, // Will be sanitized out
  };

  const createdBooking = await supabaseService.createBooking(testBooking);
  assert.ok(createdBooking, 'Booking must be created on Supabase');
  assert.equal(createdBooking.room_number, '101');

  // 3. Update room status on Supabase
  await supabaseService.updateRoomStatus('101', 'occupied');

  // 4. Pull all from Supabase
  const cloudData = await supabaseService.pullAllFromSupabase();
  assert.ok(cloudData, 'Must pull cloud data successfully');
  assert.ok(cloudData.bookings.some((b) => b.id === bookingId), 'Pulled data must contain the active booking');

  // 5. Clean up from cloud
  await supabaseService.deleteBooking(bookingId);
  await supabaseService.updateRoomStatus('101', 'available');

  const afterDelete = await supabaseService.fetchBookings();
  assert.ok(!afterDelete.some((b) => b.id === bookingId), 'Booking must be deleted');
});

test('E2E Flow: Excel Chốt phòng with ck100k thoi 20k -> POS Dọn Xong -> Excel row stays Locked Xong', async () => {
  const testBookingId = Date.now() + 123;
  const checkInDate = new Date(Date.now() - 50 * 60000);
  const nowIso = new Date().toISOString();

  // 1. Initial State: Booking active on Room 102
  const initialBooking = {
    id: testBookingId,
    room_id: 2,
    room_number: '102',
    customer_name: 'Khách Test Overpay',
    customer_phone: '',
    rental_type: 'hourly',
    room_rate_mode: 'single',
    expected_check_in: checkInDate.toISOString(),
    check_in: checkInDate.toISOString(),
    check_out: null,
    beer_qty: 0,
    water_qty: 0,
    soft_drink_qty: 0,
    room_amount: 80000,
    service_amount: 0,
    surcharge_amount: 0,
    total_amount: 80000,
    paid_amount: 0,
    balance_amount: 80000,
    status: 'active',
    notes: '',
  };

  // Mock store bookings & rooms
  hotelStore.saveBookings([initialBooking]);
  hotelStore.saveRooms(INITIAL_ROOMS.map((r) => (r.room_number === '102' ? { ...r, status: 'occupied' } : r)));

  // 2. In Excel POS: Row is checked out with note "ck100k thoi 20k"
  const excelRow = {
    id: testBookingId,
    bookingId: testBookingId,
    date: '21/09/2026',
    roomNumber: '102',
    roomType: 'Giờ',
    checkIn: '14:00',
    checkOut: '15:00',
    beer: 0,
    filteredWater: 0,
    softDrink: 0,
    waterAmount: 0,
    roomAmount: 80000,
    extra: 0,
    totalAmount: 80000,
    note: 'ck100k thoi 20k',
    status: 'Xong',
    depositAmount: 0,
    isDateSeparator: false,
  };

  // Store in excel rows
  localStorage.setItem('hotel_pos_excel_rows_v3', JSON.stringify([excelRow]));

  // Excel syncs to store
  hotelStore.syncFromExcelRows([excelRow]);

  // Verify booking is completed and room is available
  const bookingsAfterExcel = hotelStore.getBookings();
  const updatedBooking = bookingsAfterExcel.find((b) => b.id === testBookingId);
  assert.equal(updatedBooking.status, 'completed', 'Booking must be marked completed');
  assert.equal(updatedBooking.total_amount, 80000);

  const roomsAfterExcel = hotelStore.getRooms();
  const room102AfterExcel = roomsAfterExcel.find((r) => r.room_number === '102');
  assert.equal(room102AfterExcel.status, 'available', 'Room must be available after checkout');

  // Verify Payment Ledger recorded +100k transfer and -20k cash refund
  const payments = hotelStore.getPayments();
  const transferPayment = payments.find((p) => p.booking_id === testBookingId && p.method === 'transfer');
  const cashRefundPayment = payments.find((p) => p.booking_id === testBookingId && p.method === 'cash');

  assert.ok(transferPayment, 'Transfer payment of 100k must be recorded');
  assert.equal(transferPayment.amount, 100000);

  assert.ok(cashRefundPayment, 'Cash refund of 20k must be recorded');
  assert.equal(cashRefundPayment.amount, -20000);

  // 3. Rebuild Excel rows (e.g. on reload or Supabase pull)
  const rebuiltRows = hotelStore.rebuildExcelRowsFromBookings();
  const rebuilt102Row = rebuiltRows.find((r) => r.id === testBookingId || r.bookingId === testBookingId);

  assert.ok(rebuilt102Row, 'Excel row must exist');
  assert.equal(rebuilt102Row.status, 'Xong', 'Excel row MUST remain locked with status "Xong"');
  assert.equal(rebuilt102Row.note, 'ck100k thoi 20k', 'Excel note must be preserved');
  assert.equal(rebuilt102Row.totalAmount, 80000);
});

test('Retail Drink Sale Flow: Enter drink quantities without room -> Select CK/TM -> Chốt creates payment record', () => {
  const retailRowId = Date.now() + 777;

  // 1. Retail drink row: 3 beer, 2 soft drinks, no room number, payment via CK
  const retailRow = {
    id: retailRowId,
    bookingId: null,
    date: '21/09/2026',
    roomNumber: '',
    roomType: 'Giờ',
    checkIn: '',
    checkOut: '',
    beer: 3, // 3 * 20,000 = 60,000
    filteredWater: 0,
    softDrink: 2, // 2 * 15,000 = 30,000
    waterAmount: 90000,
    roomAmount: 0,
    extra: 0,
    totalAmount: 90000,
    paymentMethod: 'transfer',
    note: 'ck',
    status: 'Xong',
    depositAmount: 0,
    isDateSeparator: false,
  };

  // 2. Sync from Excel
  hotelStore.syncFromExcelRows([retailRow]);

  // 3. Verify Payment Ledger recorded transfer payment for retail drinks
  const payments = hotelStore.getPayments();
  const retailPayment = payments.find((p) => p.booking_id === retailRowId);

  assert.ok(retailPayment, 'Payment record for retail drinks must be created');
  assert.equal(retailPayment.amount, 90000);
  assert.equal(retailPayment.method, 'transfer');
  assert.equal(retailPayment.room_number, 'LẺ');
});

test('POS Check-in Room 101 -> Excel tab sync does NOT auto-checkout Room 101', () => {
  // 1. Reset rooms and bookings
  hotelStore.saveRooms(INITIAL_ROOMS);
  hotelStore.saveBookings([]);

  // 2. User checks into Room 101 on POS table
  const result = hotelStore.checkInRoom({
    roomNumber: '101',
    customerName: 'Khách 101',
    customerPhone: '',
    rentalType: 'hourly',
    roomRateMode: 'single',
    checkInTime: new Date().toISOString(),
    drinks: {},
    depositAmount: 0,
    notes: '',
  });

  const newBooking = result.booking;
  assert.equal(newBooking.status, 'active');
  const room101 = hotelStore.getRooms().find((r) => r.room_number === '101');
  assert.equal(room101.status, 'occupied');

  // 3. In Excel, suppose there was an older row for room 101 marked 'Xong' from a previous shift/customer
  const oldArchivedRow = {
    id: 999111,
    bookingId: 888222, // different past booking ID
    date: '20/09/2026',
    roomNumber: '101',
    roomType: 'Giờ',
    checkIn: '08:00',
    checkOut: '09:00',
    beer: 0,
    filteredWater: 0,
    softDrink: 0,
    waterAmount: 0,
    roomAmount: 80000,
    extra: 0,
    totalAmount: 80000,
    note: 'Đã xong',
    status: 'Xong',
    depositAmount: 0,
    isDateSeparator: false,
  };

  // 4. Excel syncs to hotelStore on opening Excel tab
  hotelStore.syncFromExcelRows([oldArchivedRow]);

  // 5. Verify Room 101 is STILL occupied and booking is STILL active!
  const current101Booking = hotelStore.getBookings().find((b) => b.id === newBooking.id);
  assert.equal(current101Booking.status, 'active', 'Booking 101 must NOT be auto-checked out');

  const current101Room = hotelStore.getRooms().find((r) => r.room_number === '101');
  assert.equal(current101Room.status, 'occupied', 'Room 101 must remain occupied');
});

test('Chronological Excel sorting: Newly checked in room stays below earlier rooms instead of wedging in middle by room number', () => {
  const earlyBooking = {
    id: 1001,
    room_id: 201,
    room_number: '201',
    customer_name: 'Khách 201 Sáng',
    rental_type: 'hourly',
    room_rate_mode: 'single',
    check_in: '2026-09-21T08:00:00.000Z',
    status: 'active',
    total_amount: 80000,
  };

  const lateBooking = {
    id: 1002,
    room_id: 101,
    room_number: '101',
    customer_name: 'Khách 101 Chiều',
    rental_type: 'hourly',
    room_rate_mode: 'single',
    check_in: '2026-09-21T14:00:00.000Z',
    status: 'active',
    total_amount: 80000,
  };

  hotelStore.saveBookings([earlyBooking, lateBooking]);
  const rebuilt = hotelStore.rebuildExcelRowsFromBookings();

  // Non-separator rows
  const activeRows = rebuilt.filter((r) => !r.isDateSeparator && (r.roomNumber === '101' || r.roomNumber === '201'));
  assert.equal(activeRows.length, 2);
  // Room 201 (08:00) should come before Room 101 (14:00)
  assert.equal(activeRows[0].roomNumber, '201', 'Earlier check-in (201) must come first');
  assert.equal(activeRows[1].roomNumber, '101', 'Later check-in (101) must follow at the bottom');
});

test('Admin Period Summary calculates accurate net revenue without double-subtracted expenses or phantom totals', () => {
  hotelStore.savePayments([
    {
      id: 1,
      booking_id: 101,
      room_number: '101',
      payment_type: 'settlement',
      method: 'cash',
      amount: 100000,
      created_at: '2026-09-21T10:00:00.000Z',
    },
    {
      id: 2,
      booking_id: 102,
      room_number: '102',
      payment_type: 'settlement',
      method: 'transfer',
      amount: 150000,
      created_at: '2026-09-21T11:00:00.000Z',
    },
  ]);

  hotelStore.saveExpenses([
    {
      id: 10,
      amount: 30000,
      reason: 'Mua đồ dùng',
      requester: 'Lễ tân',
      status: 'approved',
      created_at: '2026-09-21T12:00:00.000Z',
      approved_at: '2026-09-21T12:05:00.000Z',
    },
  ]);

  const summary = hotelStore.getPeriodSummary('2026-09-21', '2026-09-21');
  assert.equal(summary.cashInflow, 100000, 'Cash revenue from settlements must be 100k');
  assert.equal(summary.transferInflow, 150000, 'Transfer revenue must be 150k');
  assert.equal(summary.totalExpenses, 30000, 'Total approved expenses must be 30k');
  assert.equal(summary.netCash, 100000, 'Net cash collected from bookings must be 100k');
  assert.equal(summary.netProfit, 220000, 'Net profit must be 250k - 30k = 220k');
});

test('POS & Excel sync: Room 101 check-in, update and checkout never produces duplicate live rows in Excel', () => {
  hotelStore.saveRooms(INITIAL_ROOMS);
  hotelStore.saveBookings([]);
  localStorage.removeItem('hotel_pos_excel_rows_v3');

  // 1. Check in Room 101 on POS
  const { booking: b1 } = hotelStore.checkInRoom({
    roomNumber: '101',
    customerName: 'Khách 101 Lần 1',
    rentalType: 'hourly',
    roomRateMode: 'single',
    checkInTime: new Date().toISOString(),
    drinks: { beer_qty: 2 },
  });

  const rawRows1 = JSON.parse(localStorage.getItem('hotel_pos_excel_rows_v3') || '[]');
  const live101Rows1 = rawRows1.filter((r) => !r.isDateSeparator && r.roomNumber === '101' && r.status === 'Đang ở');
  assert.equal(live101Rows1.length, 1, 'Exactly one live row for Room 101');
  assert.equal(live101Rows1[0].beer, 2);

  // 2. Checkout Room 101
  hotelStore.checkOutWithSplitAndRefund({
    bookingId: b1.id,
    checkOutTime: new Date().toISOString(),
    drinks: { beer_qty: 2 },
    cashReceived: 120000,
  });

  const room101AfterOut = hotelStore.getRooms().find((r) => r.room_number === '101');
  assert.equal(room101AfterOut.status, 'available', 'Room 101 must be directly available (no cleaning state)');

  const rawRowsAfterOut = JSON.parse(localStorage.getItem('hotel_pos_excel_rows_v3') || '[]');
  const live101AfterOut = rawRowsAfterOut.filter((r) => !r.isDateSeparator && r.roomNumber === '101' && r.status === 'Đang ở');
  assert.equal(live101AfterOut.length, 0, 'No live rows remaining after checkout');

  // 3. New guest checks into Room 101
  const { booking: b2 } = hotelStore.checkInRoom({
    roomNumber: '101',
    customerName: 'Khách 101 Lần 2',
    rentalType: 'hourly',
    roomRateMode: 'single',
    checkInTime: new Date().toISOString(),
    drinks: { water_qty: 1 },
  });

  const rawRows2 = JSON.parse(localStorage.getItem('hotel_pos_excel_rows_v3') || '[]');
  const live101Rows2 = rawRows2.filter((r) => !r.isDateSeparator && r.roomNumber === '101' && r.status === 'Đang ở');
  assert.equal(live101Rows2.length, 1, 'Only one live row for Room 101 for the second guest');
  assert.equal(live101Rows2[0].filteredWater, 1);
});


