/**
 * Core Price Constants according to User Rules:
 * - Beer (beer_qty): 20,000 VND / unit
 * - Water (water_qty): 10,000 VND / unit
 * - Soft Drink (soft_drink_qty): 15,000 VND / unit
 *
 * PHÒNG ĐƠN (Single Room):
 * - Qua đêm (20:00 tối -> 09:00 sáng hôm sau): 200,000 VND
 * - Ngày đêm (12:00 trưa -> 12:00 trưa hôm sau): 350,000 VND
 * - Theo giờ: 80,000 VND block đầu (<= 60 min) + 20,000 VND mỗi giờ tiếp theo (ân hạn 10 phút)
 *
 * PHÒNG ĐÔI (Double Room) (áp dụng cho phòng 104, 204, 303 khi chọn phòng đôi):
 * - Qua đêm (20:00 tối -> 09:00 sáng hôm sau): 350,000 VND
 * - Ngày đêm (12:00 trưa -> 12:00 trưa hôm sau): 500,000 VND
 * - Theo giờ: 80,000 VND block đầu + 20,000 VND mỗi giờ tiếp theo
 */

export const SPECIAL_ROOM_NUMBERS = ['104', '204', '303'];

export const PRICE_CONSTANTS = {
  BEER: 20000,
  WATER: 10000,
  SOFT_DRINK: 15000,
  // Phòng Đơn
  OVERNIGHT_SINGLE: 200000,
  DAILY_SINGLE: 350000,
  // Phòng Đôi
  OVERNIGHT_DOUBLE: 350000,
  DAILY_DOUBLE: 500000,
  // Fallbacks for backward compatibility
  OVERNIGHT: 200000,
  DAILY: 350000,
  // Theo Giờ
  HOURLY_FIRST_BLOCK: 80000,
  HOURLY_EXTRA_PER_HOUR: 20000,
  HOURLY_GRACE_PERIOD_MINUTES: 10,
};

/**
 * Checks if a room number is in the special rooms list (104, 204, 303).
 */
export function isSpecialRoomNumber(roomNumber) {
  if (!roomNumber) return false;
  return SPECIAL_ROOM_NUMBERS.includes(String(roomNumber).trim());
}

/**
 * Calculates total minutes between checkIn and checkOut (or referenceTime if still active).
 */
export function calculateStayMinutes(checkIn, checkOut, referenceTime = new Date()) {
  if (!checkIn) return 0;
  const start = new Date(checkIn);
  const end = checkOut ? new Date(checkOut) : new Date(referenceTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return 0;
  }

  return Math.floor((end.getTime() - start.getTime()) / 60000);
}

/**
 * Formats duration in minutes to human-readable string (e.g. "1h 45m" or "45 phút").
 */
export function formatStayDuration(minutes) {
  if (minutes <= 0) return '0 phút';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins} phút`;
  }
  if (mins === 0) {
    return `${hours} giờ`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Normalizes rental type to standard internal keys ('hourly', 'overnight', 'daily').
 */
export function normalizeRentalType(type) {
  if (!type) return 'hourly';
  const lower = String(type).trim().toLowerCase();
  if (lower === 'overnight' || lower === 'qua đêm' || lower === 'qua dem') {
    return 'overnight';
  }
  if (lower === 'daily' || lower === 'ngày đêm' || lower === 'ngay dem' || lower === 'ngày' || lower === 'ngay') {
    return 'daily';
  }
  return 'hourly';
}

/**
 * Minibar calculation:
 * water_amount = (beer_qty * 20000) + (water_qty * 10000) + (soft_drink_qty * 15000)
 */
export function calculateWaterAmount(drinks = {}) {
  const beerQty = Math.max(0, Number(drinks.beer ?? drinks.beer_qty ?? 0) || 0);
  const waterQty = Math.max(0, Number(drinks.water ?? drinks.water_qty ?? drinks.filteredWater ?? 0) || 0);
  const softDrinkQty = Math.max(0, Number(drinks.softDrink ?? drinks.soft_drink_qty ?? 0) || 0);

  return (
    beerQty * PRICE_CONSTANTS.BEER +
    waterQty * PRICE_CONSTANTS.WATER +
    softDrinkQty * PRICE_CONSTANTS.SOFT_DRINK
  );
}

/**
 * Room charge calculation:
 * - Phòng Đơn:
 *     - Qua đêm (20h - 9h): 200,000 VND
 *     - Ngày đêm (12h - 12h): 350,000 VND
 *     - Giờ: 80,000 VND first block + 20,000 VND/hour
 * - Phòng Đôi (104, 204, 303):
 *     - Qua đêm (20h - 9h): 350,000 VND
 *     - Ngày đêm (12h - 12h): 500,000 VND
 *     - Giờ: 80,000 VND first block + 20,000 VND/hour
 */
export function calculateRoomAmount(
  checkIn,
  checkOut,
  rentalType = 'hourly',
  referenceTime = new Date(),
  roomRateMode = 'single',
  roomNumber = ''
) {
  const normType = normalizeRentalType(rentalType);
  const isDouble = roomRateMode === 'double' || (isSpecialRoomNumber(roomNumber) && roomRateMode === 'double');

  if (normType === 'overnight') {
    return isDouble ? PRICE_CONSTANTS.OVERNIGHT_DOUBLE : PRICE_CONSTANTS.OVERNIGHT_SINGLE;
  }

  if (normType === 'daily') {
    return isDouble ? PRICE_CONSTANTS.DAILY_DOUBLE : PRICE_CONSTANTS.DAILY_SINGLE;
  }

  // Hourly calculation
  const totalMinutes = calculateStayMinutes(checkIn, checkOut, referenceTime);

  if (totalMinutes <= 0) {
    return PRICE_CONSTANTS.HOURLY_FIRST_BLOCK;
  }

  const delta = totalMinutes - 60 - PRICE_CONSTANTS.HOURLY_GRACE_PERIOD_MINUTES;
  const extraHours = delta <= 0 ? 0 : Math.ceil(delta / 60);

  return PRICE_CONSTANTS.HOURLY_FIRST_BLOCK + extraHours * PRICE_CONSTANTS.HOURLY_EXTRA_PER_HOUR;
}

/**
 * Full calculation according to User Rules:
 * total_amount = room_amount + water_amount + surcharge
 */
export function calculateTotalBill(
  checkIn,
  checkOut,
  rentalType = 'hourly',
  drinks = {},
  surcharge = 0,
  referenceTime = new Date(),
  roomRateMode = 'single',
  roomNumber = ''
) {
  const normType = normalizeRentalType(rentalType);
  const minutes = calculateStayMinutes(checkIn, checkOut, referenceTime);
  const roomCost = calculateRoomAmount(checkIn, checkOut, normType, referenceTime, roomRateMode, roomNumber);
  const waterAmount = calculateWaterAmount(drinks);
  const surchargeAmount = Number(surcharge) || 0;
  const totalAmount = Math.max(0, roomCost + waterAmount + surchargeAmount);

  return {
    stayMinutes: minutes,
    stayDurationLabel: formatStayDuration(minutes),
    rentalType: normType,
    roomCost,
    room_amount: roomCost,
    drinkCost: waterAmount,
    water_amount: waterAmount,
    surcharge: surchargeAmount,
    totalCost: totalAmount,
    total_amount: totalAmount,
    roomRateMode,
  };
}


