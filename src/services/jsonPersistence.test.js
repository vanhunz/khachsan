import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

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

import { hotelStore, INITIAL_ROOMS } from './hotelStore.js';
import { supabaseService } from './supabaseService.js';

test('Supabase Cloud Sync is completely disabled', () => {
  assert.equal(supabaseService.isAvailable(), false, 'Supabase must be disabled in offline JSON mode');
});

test('JSON Persistence: exportFullDataToJsonString and importFullDataFromJson', () => {
  hotelStore.saveRooms(INITIAL_ROOMS);
  hotelStore.saveBookings([]);
  hotelStore.savePayments([]);

  // Check in room 102
  const { booking } = hotelStore.checkInRoom({
    roomNumber: '102',
    customerName: 'Khách JSON Test',
    rentalType: 'hourly',
    roomRateMode: 'single',
    checkInTime: new Date().toISOString(),
    drinks: { beer_qty: 1, water_qty: 1 },
    depositAmount: 50000,
  });

  const jsonStr = hotelStore.exportFullDataToJsonString();
  assert.ok(jsonStr.length > 50);

  const parsed = JSON.parse(jsonStr);
  assert.ok(Array.isArray(parsed.rooms));
  assert.ok(Array.isArray(parsed.bookings));
  assert.equal(parsed.bookings.length, 1);
  assert.equal(parsed.bookings[0].customer_name, 'Khách JSON Test');

  // Verify import restores exact state
  localStorage.clear();
  assert.equal(hotelStore.getBookings().length, 0);

  const importSuccess = hotelStore.importFullDataFromJson(parsed);
  assert.equal(importSuccess, true);
  assert.equal(hotelStore.getBookings().length, 1);
  assert.equal(hotelStore.getBookings()[0].room_number, '102');
});

test('Anti-Resurrection Test: Checkout Room 101 -> Multiple Excel sync passes -> Room 101 NEVER resurrects', () => {
  hotelStore.saveRooms(INITIAL_ROOMS.map((r) => ({ ...r, status: 'available' })));
  hotelStore.saveBookings([]);
  hotelStore.savePayments([]);

  // 1. Check in Room 101
  const { booking: b101 } = hotelStore.checkInRoom({
    roomNumber: '101',
    customerName: 'Khách 101 Test',
    rentalType: 'hourly',
    roomRateMode: 'single',
    checkInTime: new Date(Date.now() - 60 * 60000).toISOString(),
    drinks: { beer_qty: 2 },
    depositAmount: 0,
  });

  assert.equal(hotelStore.getRooms().find((r) => r.room_number === '101').status, 'occupied');
  assert.equal(hotelStore.getBookings().find((b) => b.id === b101.id).status, 'active');

  // 2. Checkout Room 101
  hotelStore.checkOutWithSplitAndRefund({
    bookingId: b101.id,
    roomNumber: '101',
    checkOutTime: new Date().toISOString(),
    rentalType: 'hourly',
    roomRateMode: 'single',
    drinks: { beer_qty: 2 },
    cashReceived: 120000,
    transferReceived: 0,
    nextRoomStatus: 'available',
  });

  // Verify room is available and booking is completed
  assert.equal(hotelStore.getRooms().find((r) => r.room_number === '101').status, 'available');
  assert.equal(hotelStore.getBookings().find((b) => b.id === b101.id).status, 'completed');

  // 3. Simulate stale Excel row sync (e.g. if Excel tab had an un-synced row linked to b101)
  const staleExcelRows = [
    {
      id: 9999,
      bookingId: b101.id,
      date: '22/09/2026',
      roomNumber: '101',
      roomType: 'Giờ',
      checkIn: '18:00',
      checkOut: '',
      beer: 2,
      filteredWater: 0,
      softDrink: 0,
      waterAmount: 40000,
      roomAmount: 80000,
      extra: 0,
      totalAmount: 120000,
      depositAmount: 0,
      note: '',
      status: 'Đang ở', // Stale status!
      isDateSeparator: false,
    },
  ];

  // Sync pass 1
  hotelStore.syncFromExcelRows(staleExcelRows);

  // Must NOT create a new active booking or set Room 101 to occupied!
  const active101AfterSync = hotelStore.getBookings().filter((b) => String(b.room_number) === '101' && b.status === 'active');
  assert.equal(active101AfterSync.length, 0, 'No active booking should be created from stale Excel row');
  assert.equal(hotelStore.getRooms().find((r) => r.room_number === '101').status, 'available', 'Room 101 must remain available');

  // Sync pass 2 with Excel rows from storage
  const storedExcelRows = hotelStore.getExcelRows();
  hotelStore.syncFromExcelRows(storedExcelRows);

  const active101Pass2 = hotelStore.getBookings().filter((b) => String(b.room_number) === '101' && b.status === 'active');
  assert.equal(active101Pass2.length, 0, 'Room 101 must never resurrect on repeated sync passes');
  assert.equal(hotelStore.getRooms().find((r) => r.room_number === '101').status, 'available');
});
