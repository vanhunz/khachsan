/**
 * Excel POS & Ledger Parsing and Calculation Engine conforming to SRS.
 */

export const EXCEL_PRICES = {
  BEER: 20000,
  WATER: 10000,
  SOFT_DRINK: 15000,
  OVERNIGHT_SINGLE: 200000,
  OVERNIGHT_DOUBLE: 350000,
  OVERNIGHT: 200000,
  DAILY_SINGLE: 350000,
  DAILY_DOUBLE: 500000,
  DAILY: 350000,
  HOURLY_BASE: 80000,
  HOURLY_EXTRA_HOUR: 20000,
  GRACE_PERIOD_HOURS: 10 / 60, // 10 minutes = 0.16667 hours
  CLEANING_BUFFER_MINUTES: 30,
};

/**
 * Converts "HH:mm" string into decimal hours (e.g. "15:15" -> 15.25).
 */
export function timeStringToDecimalHours(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h + m / 60;
}

/**
 * Converts decimal hours into "HH:mm" string (e.g. 21.5 -> "21:30").
 */
export function decimalHoursToTimeString(decHours) {
  let normalized = decHours % 24;
  if (normalized < 0) normalized += 24;
  const h = Math.floor(normalized);
  const m = Math.round((normalized - h) * 60);
  const hh = String(h).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Calculates time difference (in decimal hours) between two "HH:mm" strings,
 * handling cross-midnight cases.
 */
export function calculateDeltaHours(checkInStr, checkOutStr) {
  const inHours = timeStringToDecimalHours(checkInStr);
  const outHours = timeStringToDecimalHours(checkOutStr);

  if (inHours === null || outHours === null) return 0;

  if (outHours < inHours) {
    // Crosses midnight to next day
    return outHours + 24 - inHours;
  }
  return outHours - inHours;
}

/**
 * Calculates Column I (Tiền nước):
 * I = (F * 20000) + (G * 10000) + (H * 15000)
 */
export function calculateExcelWaterAmount(beerQty = 0, waterQty = 0, softDrinkQty = 0) {
  const b = Math.max(0, Number(beerQty) || 0);
  const w = Math.max(0, Number(waterQty) || 0);
  const s = Math.max(0, Number(softDrinkQty) || 0);
  return b * EXCEL_PRICES.BEER + w * EXCEL_PRICES.WATER + s * EXCEL_PRICES.SOFT_DRINK;
}

/**
 * Calculates Column J (Tiền phòng):
 * - Phòng đơn: Qua đêm: 200.000 VND (20h-9h), Ngày đêm: 350.000 VND (12h-12h)
 * - Phòng đôi: Qua đêm: 350.000 VND (20h-9h), Ngày đêm: 500.000 VND (12h-12h)
 * - Giờ: 80.000 VND giờ đầu + 20.000 VND/giờ tiếp theo (ân hạn 10p)
 */
export function calculateExcelRoomAmount(roomType = 'Giờ', checkInStr = '', checkOutStr = '', referenceTime = new Date(), hasRoomNumber = true, roomNumber = '') {
  if (!hasRoomNumber || !checkInStr) {
    return 0;
  }
  const type = String(roomType || '').trim().toLowerCase();
  const isDouble = type.includes('đôi') || type.includes('doi');

  if (type.includes('qua đêm') || type.includes('qua dem') || type === 'overnight') {
    return isDouble ? EXCEL_PRICES.OVERNIGHT_DOUBLE : EXCEL_PRICES.OVERNIGHT_SINGLE;
  }

  if (type.includes('ngày đêm') || type.includes('ngay dem') || type === 'daily' || type === 'ngày' || type === 'ngay') {
    return isDouble ? EXCEL_PRICES.DAILY_DOUBLE : EXCEL_PRICES.DAILY_SINGLE;
  }

  // Hourly
  let outStr = checkOutStr;
  if (!outStr) {
    // If checkOut is empty (currently active), calculate based on referenceTime
    const refH = referenceTime.getHours();
    const refM = referenceTime.getMinutes();
    outStr = `${String(refH).padStart(2, '0')}:${String(refM).padStart(2, '0')}`;
  }

  const deltaHours = calculateDeltaHours(checkInStr, outStr);
  if (deltaHours <= 0) {
    return EXCEL_PRICES.HOURLY_BASE;
  }

  // Delta beyond first 1 hour + 10 minute grace period
  const extraHours = Math.max(
    0,
    Math.ceil(deltaHours - 1 - EXCEL_PRICES.GRACE_PERIOD_HOURS - 1e-9)
  );

  return EXCEL_PRICES.HOURLY_BASE + extraHours * EXCEL_PRICES.HOURLY_EXTRA_HOUR;
}

/**
 * Calculates entire row values (I, J, L) and returns updated row object.
 */
/**
 * Calculates entire row values (I, J, L) and returns updated row object.
 */
export function calculateExcelRow(row, referenceTime = new Date()) {
  if (row.isDateSeparator) {
    return {
      ...row,
      checkIn: '',
      checkOut: '',
      waterAmount: 0,
      roomAmount: 0,
      extra: 0,
      totalAmount: 0,
      depositAmount: 0,
    };
  }

  if (row.isExpense || row.roomNumber === 'CHI' || row.roomType === 'Phiếu Chi') {
    const expAmount = Number(row.totalAmount ?? -(Number(row.amount || 0)));
    return {
      ...row,
      waterAmount: 0,
      roomAmount: 0,
      extra: 0,
      totalAmount: expAmount,
      depositAmount: 0,
    };
  }

  const hasRoom = Boolean(row.roomNumber && String(row.roomNumber).trim() !== '' && row.roomNumber !== '---');
  const effectiveCheckIn = hasRoom ? (row.checkIn || '') : '';
  const waterAmount = calculateExcelWaterAmount(row.beer, row.filteredWater ?? row.water, row.softDrink);
  const roomAmount = calculateExcelRoomAmount(row.roomType, effectiveCheckIn, row.checkOut, referenceTime, hasRoom, row.roomNumber);
  const surcharge = Number(row.extra ?? row.surcharge ?? 0) || 0;
  const totalAmount = !hasRoom && waterAmount === 0 && surcharge === 0 ? 0 : Math.max(0, waterAmount + roomAmount + surcharge);

  // Extract or preserve deposit amount
  let depositAmount = Math.max(0, Number(row.depositAmount) || 0);
  if (depositAmount === 0 && row.note) {
    const parsed = parseNoteColumn(row.note, totalAmount, 0);
    if (parsed.isDeposit && parsed.depositAmount > 0) {
      depositAmount = parsed.depositAmount;
    }
  }

  return {
    ...row,
    checkIn: effectiveCheckIn,
    waterAmount,
    roomAmount,
    extra: surcharge,
    totalAmount,
    depositAmount,
  };
}

/**
 * Parser for Column M (Ghi chú) strictly according to SRS Section 4:
 *
 * Case 1: Cash 100% -> note is empty or no payment prefix.
 * Case 2: Transfer 100% -> note has 'CK' or 'ck' without specific split.
 * Case 3: Split Payment -> note has 'ck [amount]k' or 'ck [amount]' (e.g. 'ck100k' -> Transfer: 100k, Cash: Total - 100k).
 * Case 4: Overpayment & Cash Refund -> note has 'ck [received]k thoi [refund]k' or 'ck200k thoi 40k'.
 * Case 5: Deposit / Advance -> note has 'coc [amount]k', 'thu truoc [amount]', etc.
 */
export function parseNoteColumn(note = '', totalAmount = 0, explicitDeposit = 0) {
  const text = String(note || '').trim().toLowerCase();
  const tot = Math.max(0, Number(totalAmount) || 0);
  const propDeposit = Math.max(0, Number(explicitDeposit) || 0);

  if (!text && propDeposit === 0) {
    return {
      paymentMethod: 'cash',
      cashAmount: tot,
      transferAmount: 0,
      cashRefund: 0,
      netCash: tot,
      netTransfer: 0,
      recognizedRevenue: tot,
      isDeposit: false,
      depositAmount: 0,
    };
  }

  // 1. Check for Overpayment & Refund syntax: "ck [X]k thoi [Y]k", "ck 100.000 thối lại 20.000", "ck [X] - thoi [Y]"
  const normalizedOverpay = text
    .replace(/thối lại|thoi lai|trả lại|tra lai|thối tiền|thoi tien|thôi tiền|thoi|thối|thôi|trả|thừa|thua|dư tiền|du tien|dư|du/gi, 'thoi')
    .replace(/(\d+)[\.\,](\d{3})/g, '$1$2')
    .replace(/[\,\đ\₫\:\-]/g, ' ');

  const overpayMatch =
    normalizedOverpay.match(/ck\s*(\d+)(k|000)?\s*.*thoi\s*(\d+)(k|000)?/i);

  if (overpayMatch) {
    let received = Number(overpayMatch[1]);
    if (overpayMatch[2] === 'k' || (received > 0 && received < 1000)) received *= 1000;

    let refund = Number(overpayMatch[3]);
    if (overpayMatch[4] === 'k' || (refund > 0 && refund < 1000)) refund *= 1000;

    return {
      paymentMethod: 'split_refund',
      cashAmount: 0,
      transferAmount: received,
      cashRefund: refund,
      netCash: -refund,
      netTransfer: received,
      recognizedRevenue: received - refund,
      isDeposit: false,
      depositAmount: 0,
      rawReceived: received,
      rawRefund: refund,
    };
  }

  // 2. Check for Deposit / Advance syntax: "coc [X]k", "cọc [X]k", "đã cọc [X]", "thu trước [X]", "tạm ứng [X]"
  const normalizedForCoc = text
    .replace(/đã thu trước|da thu truoc|thu trước|thu truc|tạm ứng|tam ung|đã cọc trước|da coc truoc|đã cọc|da coc|cọc trước|coc truoc|cọc|tiền cọc|tien coc/gi, 'coc')
    .replace(/[\.\,đ₫\:\-\|\(\)]/g, ' ');

  const cocMatch = normalizedForCoc.match(/coc\s*(\d+)(k|000)?/);
  if (cocMatch || propDeposit > 0) {
    let deposit = propDeposit;
    if (cocMatch) {
      deposit = Number(cocMatch[1]);
      if (cocMatch[2] === 'k' || deposit < 1000) deposit *= 1000;
    }
    const isTransfer = text.includes('ck') || text.includes('chuyen');
    const revenue = tot > 0 ? tot : deposit;
    const balanceDue = Math.max(0, tot - deposit);

    return {
      paymentMethod: isTransfer ? 'transfer' : 'cash',
      cashAmount: isTransfer ? 0 : revenue,
      transferAmount: isTransfer ? revenue : 0,
      cashRefund: 0,
      netCash: isTransfer ? 0 : revenue,
      netTransfer: isTransfer ? revenue : 0,
      recognizedRevenue: revenue,
      isDeposit: true,
      depositAmount: deposit,
      balanceDue,
    };
  }

  // 3. Check for Split Transfer amount: "ck [X]k" or "ck [X]" (e.g. 'ck100k tm100k')
  const splitMatch = text.match(/ck\s*(\d+)(k|000)?/);
  if (splitMatch) {
    let transfer = Number(splitMatch[1]);
    if (splitMatch[2] === 'k' || transfer < 1000) transfer *= 1000;

    let cash = Math.max(0, tot - transfer);
    const tmMatch = text.match(/tm\s*(\d+)(k|000)?/);
    if (tmMatch) {
      let explicitCash = Number(tmMatch[1]);
      if (tmMatch[2] === 'k' || explicitCash < 1000) explicitCash *= 1000;
      if (tot === 0 || explicitCash > 0) {
        cash = explicitCash;
      }
    }

    const recognizedRevenue = tot > 0 ? tot : transfer + cash;

    return {
      paymentMethod: 'split',
      cashAmount: cash,
      transferAmount: transfer,
      cashRefund: 0,
      netCash: cash,
      netTransfer: transfer,
      recognizedRevenue,
      isDeposit: false,
      depositAmount: 0,
    };
  }

  // 4. Check for 100% Transfer: "ck" or "chuyen khoan"
  if (text.includes('ck') || text.includes('chuyen') || text.includes('vietqr')) {
    return {
      paymentMethod: 'transfer',
      cashAmount: 0,
      transferAmount: tot,
      cashRefund: 0,
      netCash: 0,
      netTransfer: tot,
      recognizedRevenue: tot,
      isDeposit: false,
      depositAmount: 0,
    };
  }

  // 5. Default Cash
  return {
    paymentMethod: 'cash',
    cashAmount: tot,
    transferAmount: 0,
    cashRefund: 0,
    netCash: tot,
    netTransfer: 0,
    recognizedRevenue: tot,
    isDeposit: false,
    depositAmount: 0,
  };
}

/**
 * Buffer Time & Conflict Detection Engine (SRS Section 5.2):
 * Checks if an active hourly row is approaching an upcoming reservation on the same room.
 */
export function detectExcelConflict(row, allRows = [], currentTime = new Date()) {
  if (!row || row.isDateSeparator || row.status !== 'Đang ở' || row.roomType !== 'Giờ') {
    return { hasConflict: false };
  }

  const roomNum = String(row.roomNumber || '').trim();
  const dateStr = String(row.date || '').trim();

  // Find if there is a reserved row for the same room & date
  const reservedRow = allRows.find(
    (r) =>
      r.id !== row.id &&
      !r.isDateSeparator &&
      String(r.roomNumber || '').trim() === roomNum &&
      String(r.date || '').trim() === dateStr &&
      r.status === 'Đã cọc' &&
      Boolean(r.checkIn)
  );

  if (!reservedRow) {
    return { hasConflict: false };
  }

  // Reserved expected arrival time
  const arrivalDecHours = timeStringToDecimalHours(reservedRow.checkIn);
  if (arrivalDecHours === null) return { hasConflict: false };

  // Max check-out time = expected_check_in - 30 minutes
  const maxCheckOutDecHours = arrivalDecHours - EXCEL_PRICES.CLEANING_BUFFER_MINUTES / 60;
  const maxCheckOutStr = decimalHoursToTimeString(maxCheckOutDecHours);

  // Current time decimal hours
  const curDecHours = currentTime.getHours() + currentTime.getMinutes() / 60;

  // Remaining minutes until deadline
  let diffHours = maxCheckOutDecHours - curDecHours;
  if (diffHours < 0 && curDecHours < arrivalDecHours) {
    diffHours = 0;
  }
  const remainingMinutes = Math.round(diffHours * 60);

  return {
    hasConflict: true,
    reservedRow,
    expectedArrivalTime: reservedRow.checkIn,
    maxCheckOutTime: maxCheckOutStr,
    remainingMinutes,
    isWarning: remainingMinutes <= 45 && remainingMinutes > 15,
    isCritical: remainingMinutes <= 15,
    placeholderText: `Tối đa ${maxCheckOutStr} (Tránh cọc ${reservedRow.checkIn})`,
  };
}

export function parseRoomSortValue(roomNumber) {
  if (!roomNumber) return 99999;
  const str = String(roomNumber).trim();
  if (str === '---' || str === '') return 99999;
  if (str.toUpperCase() === 'CHI') return 99998;
  if (str.toUpperCase() === 'LẺ' || str.toUpperCase() === 'BÁN LẺ') return 99997;
  const num = parseInt(str.replace(/\D/g, ''), 10);
  return isNaN(num) ? 99999 : num;
}

export function isExcelRowBlank(r) {
  if (!r || r.isDateSeparator) return false;
  const hasRoom = r.roomNumber && String(r.roomNumber).trim() !== '' && r.roomNumber !== '---';
  const hasBeer = Number(r.beer) > 0;
  const hasWater = Number(r.filteredWater) > 0;
  const hasSoft = Number(r.softDrink) > 0;
  const hasExtra = Number(r.extra) > 0;
  const hasCheckIn = r.checkIn && String(r.checkIn).trim() !== '';
  const hasCheckOut = r.checkOut && String(r.checkOut).trim() !== '';
  const hasNote = r.note && String(r.note).trim() !== '';
  const isDone = r.status === 'Xong';
  return !hasRoom && !hasBeer && !hasWater && !hasSoft && !hasExtra && !hasCheckIn && !hasCheckOut && !hasNote && !isDone;
}

export function ensureFiveBlankRows(rowsList, defaultDate = '') {
  if (!Array.isArray(rowsList)) return [];
  const list = [...rowsList];

  let blankCountAtEnd = 0;
  for (let i = list.length - 1; i >= 0; i--) {
    if (isExcelRowBlank(list[i])) {
      blankCountAtEnd++;
    } else {
      break;
    }
  }

  const needed = 5 - blankCountAtEnd;
  if (needed > 0) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const todayStr = defaultDate || `${day}/${month}/${year}`;

    for (let k = 0; k < needed; k++) {
      list.push(
        calculateExcelRow({
          id: Date.now() + Math.floor(Math.random() * 100000) + k,
          date: todayStr,
          roomNumber: '',
          roomType: 'Giờ',
          checkIn: '',
          checkOut: '',
          beer: '',
          filteredWater: '',
          softDrink: '',
          waterAmount: 0,
          roomAmount: 0,
          extra: 0,
          totalAmount: 0,
          depositAmount: 0,
          note: '',
          status: 'Đang ở',
          isDateSeparator: false,
        })
      );
    }
  }

  return list;
}

export function deduplicateExcelRows(rowsList) {
  if (!Array.isArray(rowsList)) return [];
  const seenActiveRooms = new Set();
  const result = [];
  for (let i = rowsList.length - 1; i >= 0; i--) {
    const r = rowsList[i];
    if (r && !r.isDateSeparator && (r.status === 'Đang ở' || r.status === 'Đã cọc')) {
      const roomKey = String(r.roomNumber || '').trim();
      if (roomKey && roomKey !== '---' && roomKey.toUpperCase() !== 'CHI' && roomKey.toUpperCase() !== 'LẺ' && roomKey.toUpperCase() !== 'BÁN LẺ' && roomKey.toUpperCase() !== 'KHACH LE') {
        if (seenActiveRooms.has(roomKey)) {
          continue; // Skip duplicate active row
        }
        seenActiveRooms.add(roomKey);
      }
    }
    result.unshift(r);
  }
  return result;
}

export function sortExcelRows(rowsList) {
  if (!Array.isArray(rowsList)) return [];
  const nonBlankRows = rowsList.filter((r) => !isExcelRowBlank(r));
  const blankRows = rowsList.filter((r) => isExcelRowBlank(r));

  nonBlankRows.sort((a, b) => {
    // 1. Group / sort by Date if different (DD/MM/YYYY)
    if (a.date && b.date && a.date !== b.date) {
      const partsA = String(a.date).split('/').map(Number);
      const partsB = String(b.date).split('/').map(Number);
      if (partsA.length === 3 && partsB.length === 3) {
        const timeA = new Date(partsA[2], (partsA[1] || 1) - 1, partsA[0] || 1).getTime();
        const timeB = new Date(partsB[2], (partsB[1] || 1) - 1, partsB[0] || 1).getTime();
        if (timeA !== timeB) return timeA - timeB;
      }
    }

    // 2. Date separators
    if (a.isDateSeparator && !b.isDateSeparator) return -1;
    if (!a.isDateSeparator && b.isDateSeparator) return 1;

    // 3. Stable chronological creation order (keeps rows in place without wedging into middle)
    return (a.id || 0) - (b.id || 0);
  });

  return [...nonBlankRows, ...blankRows];
}
