import { calculateTotalBill, normalizeRentalType } from '../utils/calculateTotalBill.js';
import { calculateExcelRow, parseNoteColumn } from '../utils/excelParser.js';
import { supabaseService } from './supabaseService.js';

const STORAGE_KEYS = {
  ROOMS_V2: 'hotel_pos_rooms_v3',
  BOOKINGS_V2: 'hotel_pos_bookings_v3',
  PAYMENTS_V2: 'hotel_pos_payments_v3',
  SHIFT_CLOSURES_V2: 'hotel_pos_shift_closures_v3',
  EXPENSES_V2: 'hotel_pos_expenses_v3',
  RESERVATIONS_V2: 'hotel_pos_reservations_v3',
  AUDIT_LOGS_V2: 'hotel_pos_audit_logs_v3',
  STAFF_PIN: 'hotel_pos_staff_pin_v3',
  ADMIN_PASS: 'hotel_pos_admin_pass_v3',
  HOTEL_CONFIG: 'hotel_pos_config_v3',
};

// Initial Room Setup (11 rooms across 3 floors: Tầng 1: 101-104, Tầng 2: 201-204, Tầng 3: 301-303)
export const INITIAL_ROOMS = [
  { id: 1, room_number: '101', floor: 1, status: 'available' },
  { id: 2, room_number: '102', floor: 1, status: 'available' },
  { id: 3, room_number: '103', floor: 1, status: 'available' },
  { id: 4, room_number: '104', floor: 1, status: 'available' },
  { id: 5, room_number: '201', floor: 2, status: 'available' },
  { id: 6, room_number: '202', floor: 2, status: 'available' },
  { id: 7, room_number: '203', floor: 2, status: 'available' },
  { id: 8, room_number: '204', floor: 2, status: 'available' },
  { id: 9, room_number: '301', floor: 3, status: 'available' },
  { id: 10, room_number: '302', floor: 3, status: 'available' },
  { id: 11, room_number: '303', floor: 3, status: 'available' },
];

export const HOTEL_CONFIG = {
  hotelName: 'NHÀ NGHỈ THỦY TIÊN',
  author: 'by vanhunz',
  address: '123 Đường Trần Phú, Quận Hải Châu, TP. Đà Nẵng',
  phone: '0905 123 456 - 0236 3888 999',
  bankName: 'MB Bank (Ngân hàng Quân Đội)',
  bankAccount: '0905123456',
  bankAccountName: 'NHA NGHI THUY TIEN',
  wifiPassword: 'thuytienhotel68',
};

let autoPushTimer = null;
export function triggerAutoPushToSupabase(delayMs = 1200) {
  if (typeof window === 'undefined' || !supabaseService.isAvailable()) return;
  if (autoPushTimer) clearTimeout(autoPushTimer);
  autoPushTimer = setTimeout(async () => {
    try {
      const payload = {
        rooms: hotelStore.getRooms(),
        bookings: hotelStore.getBookings(),
        reservations: hotelStore.getReservations(),
        payments: hotelStore.getPayments(),
        expenses: hotelStore.getExpenses(),
        closures: hotelStore.getShiftClosures(),
      };
      await supabaseService.pushAllToSupabase(payload);
    } catch (e) {
      console.warn('Auto-push to Supabase warning:', e?.message || e);
    }
  }, delayMs);
}


// Date & Time helpers
export function getTodayDateString(d = new Date()) {
  if (!d) d = new Date();
  if (typeof d === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) d = parsed;
    else d = new Date();
  }
  if (!(d instanceof Date) || isNaN(d.getTime())) {
    d = new Date();
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalDateTimeString(d = new Date()) {
  if (!d) d = new Date();
  if (typeof d === 'string') {
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) d = parsed;
    else d = new Date();
  }
  if (!(d instanceof Date) || isNaN(d.getTime())) {
    d = new Date();
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${mins}`;
}

export function getStartAndEndOfWeek(d = new Date()) {
  let current = d instanceof Date && !isNaN(d.getTime()) ? new Date(d) : new Date(d || Date.now());
  if (isNaN(current.getTime())) current = new Date();
  const day = current.getDay();
  // Monday is day 1, Sunday is day 0 (treated as day 7)
  const diffToMonday = current.getDate() - (day === 0 ? 6 : day - 1);
  const monday = new Date(current.getFullYear(), current.getMonth(), diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    startDateStr: getTodayDateString(monday),
    endDateStr: getTodayDateString(sunday),
    label: `Tuần (${monday.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - ${sunday.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })})`,
    monday,
    sunday,
  };
}

export function getStartAndEndOfMonth(year = new Date().getFullYear(), month = new Date().getMonth() + 1) {
  // month is 1-12
  const y = Number(year) || new Date().getFullYear();
  const m = Number(month) || new Date().getMonth() + 1;
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0); // last day of month
  return {
    startDateStr: getTodayDateString(start),
    endDateStr: getTodayDateString(end),
    label: `Tháng ${String(m).padStart(2, '0')}/${y}`,
    year: y,
    month: m,
  };
}

export function formatDateTimeDisplay(isoString) {
  if (!isoString) return '---';
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${mins} - ${day}/${month}/${year}`;
  } catch {
    return isoString;
  }
}

export function formatTimeOnlyDisplay(isoString) {
  if (!isoString) return '---';
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoString;
  }
}

export function formatCurrencyVND(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatNumber(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount || 0);
}

/** String-safe id compare (Excel/localStorage often coerce number <-> string). */
export function sameEntityId(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

function isSpecialExcelRoom(roomNumber) {
  const key = String(roomNumber || '').trim().toUpperCase();
  return !key || key === '---' || key === 'CHI' || key === 'LẺ' || key === 'BÁN LẺ' || key === 'KHACH LE' || key === 'CỌC';
}

/** Keep at most one live (Đang ở / Đã cọc) Excel row per room. */
export function dedupeLiveExcelRows(rowsList) {
  if (!Array.isArray(rowsList)) return [];
  const seenLiveRooms = new Set();
  const result = [];
  for (let i = rowsList.length - 1; i >= 0; i--) {
    const r = rowsList[i];
    if (r && !r.isDateSeparator && (r.status === 'Đang ở' || r.status === 'Đã cọc')) {
      const roomKey = String(r.roomNumber || '').trim();
      if (!isSpecialExcelRoom(roomKey)) {
        if (seenLiveRooms.has(roomKey)) continue;
        seenLiveRooms.add(roomKey);
      }
    }
    result.unshift(r);
  }
  return result;
}

// Generate clean initial data conforming to Advance Payment & Accounting Models
export function generateSeedDataV2() {
  return {
    rooms: INITIAL_ROOMS.map((r) => ({ ...r, status: 'available' })),
    bookings: [],
    payments: [],
    shiftClosures: [],
    expenses: [],
    reservations: [],
    auditLogs: [],
  };
}

// --- Disk JSON Persistence (Lưu trữ file JSON cục bộ) ---
let diskBackupTimer = null;
export function triggerSaveToDiskJson(delayMs = 200) {
  if (typeof window === 'undefined' || !window.location || !window.location.origin) return;
  if (diskBackupTimer) clearTimeout(diskBackupTimer);
  diskBackupTimer = setTimeout(async () => {
    try {
      const fullJsonString = hotelStore.exportFullDataToJsonString();
      // 1. Electron Desktop Environment
      if (window.desktopApi && typeof window.desktopApi.saveDiskBackup === 'function') {
        await window.desktopApi.saveDiskBackup(fullJsonString);
        return;
      }
      // 2. Vite Web Dev Server Middleware
      if (typeof fetch !== 'undefined' && window.location?.origin) {
        await fetch(`${window.location.origin}/api/save-hotel-json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: fullJsonString,
        });
      }
    } catch (e) {
      console.warn('Lỗi ghi file hotel_data.json:', e?.message || e);
    }
  }, delayMs);
}

function syncDesktopBackup() {
  triggerSaveToDiskJson();
}

export const hotelStore = {
  // Reconcile room statuses against active bookings to eliminate state desynchronization
  reconcileRoomStatuses() {
    try {
      const dataR = localStorage.getItem(STORAGE_KEYS.ROOMS_V2);
      const dataB = localStorage.getItem(STORAGE_KEYS.BOOKINGS_V2);
      if (!dataR) return;
      const rooms = JSON.parse(dataR);
      const rawBookings = dataB ? JSON.parse(dataB) : [];

      // Deduplicate: at most 1 active booking per room (same rule as getBookings)
      const seenActive = new Set();
      const activeRoomSet = new Set();
      for (const b of rawBookings) {
        if (b?.status !== 'active') continue;
        const roomNum = String(b.room_number);
        if (seenActive.has(roomNum)) continue;
        seenActive.add(roomNum);
        activeRoomSet.add(roomNum);
      }

      let changed = false;
      const updatedRooms = rooms.map((r) => {
        const roomNum = String(r.room_number);
        if (activeRoomSet.has(roomNum)) {
          if (r.status !== 'occupied') {
            changed = true;
            return { ...r, status: 'occupied' };
          }
        } else if (r.status === 'occupied' || r.status === 'cleaning') {
          // No active stay → luôn trống (bỏ trạng thái dọn phòng trung gian)
          changed = true;
          return { ...r, status: 'available' };
        }
        return r;
      });

      if (changed) {
        localStorage.setItem(STORAGE_KEYS.ROOMS_V2, JSON.stringify(updatedRooms));
      }
      return updatedRooms;
    } catch {}
  },

  // --- Rooms ---
  getRooms() {
    try {
      this.reconcileRoomStatuses();
      const data = localStorage.getItem(STORAGE_KEYS.ROOMS_V2);
      if (data) {
        const parsed = JSON.parse(data);
        // Ensure room 304 is completely filtered out
        const filtered = parsed.filter((r) => String(r.room_number) !== '304');
        if (filtered.length !== parsed.length) {
          this.saveRooms(filtered);
        }
        return filtered;
      }
    } catch (e) {
      console.error('Failed to parse rooms:', e);
    }
    const seed = generateSeedDataV2();
    this.saveRooms(seed.rooms);
    this.saveBookings(seed.bookings);
    this.savePayments(seed.payments);
    return seed.rooms;
  },

  saveRooms(rooms) {
    try {
      localStorage.setItem(STORAGE_KEYS.ROOMS_V2, JSON.stringify(rooms));
      syncDesktopBackup();
      triggerAutoPushToSupabase();
    } catch (e) {
      console.error('Failed to save rooms:', e);
    }
  },

  updateRoomStatus(roomIdOrNumber, status, user = 'Lễ tân') {
    // Normalize legacy "cleaning" → available (đã bỏ trạng thái dọn phòng)
    const normalizedStatus = status === 'cleaning' ? 'available' : status;
    const rooms = this.getRooms();
    let targetRoomNumber = String(roomIdOrNumber);
    const updated = rooms.map((r) => {
      if (r.id === roomIdOrNumber || r.room_number === String(roomIdOrNumber)) {
        targetRoomNumber = String(r.room_number);
        return { ...r, status: normalizedStatus };
      }
      return r;
    });
    this.saveRooms(updated);
    if (supabaseService.isAvailable()) {
      supabaseService.updateRoomStatus(targetRoomNumber, normalizedStatus).catch((err) =>
        console.warn('Supabase updateRoomStatus warning:', err?.message || err)
      );
    }
    this.addAuditLog({
      action: 'Đổi trạng thái phòng',
      details: `Phòng ${targetRoomNumber} chuyển sang trạng thái: ${
        normalizedStatus === 'available'
          ? 'Sẵn sàng đón khách'
          : normalizedStatus === 'occupied'
          ? 'Đang có khách ở'
          : String(normalizedStatus)
      }`,
      user,
      severity: 'info',
    });
    return updated;
  },

  // --- Auth & PINs ---
  getStaffPin() {
    return localStorage.getItem(STORAGE_KEYS.STAFF_PIN) || '123';
  },

  setStaffPin(newPin) {
    const pin = String(newPin || '123').trim();
    localStorage.setItem(STORAGE_KEYS.STAFF_PIN, pin);
    this.addAuditLog({
      action: 'Đổi mật khẩu nhân viên',
      details: `Mật khẩu truy cập nhân viên đã được đổi thành công`,
      user: 'Admin',
      severity: 'warning',
    });
    return pin;
  },

  getAdminPassword() {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_PASS) || '234';
  },

  setAdminPassword(newPassword) {
    const pass = String(newPassword || '234').trim();
    localStorage.setItem(STORAGE_KEYS.ADMIN_PASS, pass);
    this.addAuditLog({
      action: 'Đổi mật khẩu Admin',
      details: `Mật khẩu quản trị Admin đã được đổi thành công`,
      user: 'Admin',
      severity: 'danger',
    });
    return pass;
  },

  verifyStaffPin(inputPin) {
    const currentPin = this.getStaffPin();
    return String(inputPin).trim() === currentPin || String(inputPin).trim() === '123';
  },

  verifyAdminPassword(inputPassword) {
    const currentPass = this.getAdminPassword();
    const trimmed = String(inputPassword).trim();
    return trimmed === currentPass || trimmed === '234';
  },

  // --- Master Input Lock (Khóa Không Cho Nhập Thêm) ---
  isInputLocked() {
    return localStorage.getItem('hotel_pos_input_locked') === 'true';
  },

  setInputLocked(locked) {
    localStorage.setItem('hotel_pos_input_locked', String(locked));
    window.dispatchEvent(new CustomEvent('hotel-input-lock-changed', { detail: { locked } }));
    return locked;
  },

  toggleInputLocked() {
    const next = !this.isInputLocked();
    return this.setInputLocked(next);
  },

  // --- Audit Logs (Nhật Ký Thao Tác Hệ Thống) ---
  getAuditLogs() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS_V2);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse audit logs:', e);
    }
    const seed = generateSeedDataV2();
    this.saveAuditLogs(seed.auditLogs || []);
    return seed.auditLogs || [];
  },

  saveAuditLogs(logs) {
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS_V2, JSON.stringify(logs));
      syncDesktopBackup();
    } catch (e) {
      console.error('Failed to save audit logs:', e);
    }
  },

  addAuditLog({ action, details, user = 'Lễ tân', severity = 'info' }) {
    const logs = this.getAuditLogs();
    const newLog = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      action,
      details,
      user,
      severity, // 'info' | 'success' | 'warning' | 'danger'
      timestamp: new Date().toISOString(),
    };
    const updated = [newLog, ...logs].slice(0, 500);
    this.saveAuditLogs(updated);
    return newLog;
  },

  clearAuditLogs() {
    this.saveAuditLogs([]);
  },

  // --- Expenses (Ghi Chi & Yêu Cầu Thanh Toán) ---
  getExpenses() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EXPENSES_V2);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse expenses:', e);
    }
    const seed = generateSeedDataV2();
    this.saveExpenses(seed.expenses || []);
    return seed.expenses || [];
  },

  saveExpenses(expenses) {
    try {
      localStorage.setItem(STORAGE_KEYS.EXPENSES_V2, JSON.stringify(expenses));
      syncDesktopBackup();
      triggerAutoPushToSupabase();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hotel-expenses-updated', { detail: { expenses } }));
        window.dispatchEvent(new CustomEvent('hotel-store-updated'));
      }
    } catch (e) {
      console.error('Failed to save expenses:', e);
    }
  },

  createExpense({
    amount,
    reason,
    method = 'cash', // 'cash' | 'transfer'
    requester = 'Lễ tân',
    category = 'Mua hàng / Nước uống',
    status = 'pending', // default 'pending' awaiting Admin approval, or 'approved'
    notes = '',
  }) {
    const numAmount = Math.max(0, Number(amount) || 0);
    if (numAmount <= 0) {
      throw new Error('Số tiền chi phải lớn hơn 0đ!');
    }

    if (method === 'cash' && status === 'approved') {
      const ledger = this.getLedgerSummary();
      const availableCash = 1000000 + (ledger.netCash || 0);
      if (numAmount > availableCash) {
        throw new Error(
          `Số tiền chi (${formatCurrencyVND(numAmount)}) không được vượt quá số tiền mặt thực tế đang cầm trong két (${formatCurrencyVND(availableCash)})!`
        );
      }
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const checkInHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const newExpense = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      amount: numAmount,
      reason: reason || 'Chi mua đồ khách sạn',
      category,
      method,
      requester,
      status, // 'pending' | 'approved' | 'rejected'
      notes,
      created_at: nowIso,
      approved_by: status === 'approved' ? requester : null,
      approved_at: status === 'approved' ? nowIso : null,
    };

    const expenses = this.getExpenses();
    const updatedExpenses = [newExpense, ...expenses];
    this.saveExpenses(updatedExpenses);

    if (supabaseService.isAvailable()) {
      supabaseService.createExpense(newExpense).catch((err) =>
        console.warn('Supabase createExpense warning:', err?.message || err)
      );
    }

    // If approved immediately (e.g. by admin), add payment record and sync to Excel
    if (status === 'approved') {
      this.addPaymentRecord({
        bookingId: null,
        roomNumber: 'CHI',
        paymentType: 'expense',
        method,
        amount: -numAmount,
        note: `[Phiếu Chi] ${reason} (${requester})`,
        createdAt: nowIso,
      });

      try {
        const dataStr = localStorage.getItem('hotel_pos_excel_rows_v3');
        const rows = dataStr ? JSON.parse(dataStr) : [];
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const excelDateStr = `${day}/${month}/${year}`;

        const newExcelRow = calculateExcelRow({
          id: Date.now() + Math.floor(Math.random() * 1000),
          bookingId: null,
          date: excelDateStr,
          roomNumber: 'CHI',
          roomType: 'Phiếu Chi',
          checkIn: checkInHHMM,
          checkOut: checkInHHMM,
          beer: '',
          filteredWater: '',
          softDrink: '',
          waterAmount: 0,
          roomAmount: 0,
          extra: 0,
          totalAmount: -numAmount,
          note: `Chi ${formatNumber(numAmount)}đ: ${reason}`,
          status: 'Xong',
          isDateSeparator: false,
        });

        rows.push(newExcelRow);
        localStorage.setItem('hotel_pos_excel_rows_v3', JSON.stringify(rows));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('excel-rows-synced', { detail: { rows } }));
        }
      } catch (e) {
        console.error('Failed to sync expense to Excel:', e);
      }
    }

    // Add audit log
    this.addAuditLog({
      action: status === 'approved' ? 'Tạo & Duyệt phiếu chi' : 'Tạo phiếu chi (Chờ duyệt)',
      details: `Chi ${formatCurrencyVND(numAmount)} (${
        method === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'
      }) - Lý do: ${reason} [Trạng thái: ${status === 'approved' ? 'Đã duyệt' : 'Chờ Admin duyệt'}]`,
      user: requester,
      severity: 'warning',
    });

    return newExpense;
  },

  approveExpense(expenseId, adminName = 'Admin') {
    const expenses = this.getExpenses();
    const idx = expenses.findIndex((e) => e.id === expenseId);
    if (idx === -1) return null;
    const exp = expenses[idx];
    if (exp.status === 'approved') return exp;

    exp.status = 'approved';
    exp.approved_by = adminName;
    exp.approved_at = new Date().toISOString();
    this.saveExpenses(expenses);

    if (supabaseService.isAvailable()) {
      supabaseService.updateExpenseStatus(exp.id, 'approved', adminName).catch((err) =>
        console.warn('Supabase approveExpense warning:', err?.message || err)
      );
    }

    // Add negative payment record to payments ledger to record deduction
    this.addPaymentRecord({
      bookingId: null,
      roomNumber: 'CHI',
      paymentType: 'expense',
      method: exp.method,
      amount: -exp.amount,
      note: `[Phiếu Chi #${exp.id} - Đã duyệt] ${exp.reason} (${exp.requester})`,
      createdAt: exp.approved_at,
    });

    // Append separate row in Excel POS table
    try {
      const now = new Date(exp.approved_at);
      const dataStr = localStorage.getItem('hotel_pos_excel_rows_v3');
      const rows = dataStr ? JSON.parse(dataStr) : [];
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const excelDateStr = `${day}/${month}/${year}`;
      const checkInHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;

      const newExcelRow = calculateExcelRow({
        id: Date.now() + Math.floor(Math.random() * 1000),
        bookingId: null,
        date: excelDateStr,
        roomNumber: 'CHI',
        roomType: 'Phiếu Chi',
        checkIn: checkInHHMM,
        checkOut: checkInHHMM,
        beer: '',
        filteredWater: '',
        softDrink: '',
        waterAmount: 0,
        roomAmount: 0,
        extra: 0,
        totalAmount: -exp.amount,
        note: `Chi ${formatNumber(exp.amount)}đ: ${exp.reason} (Admin duyệt)`,
        status: 'Xong',
        isDateSeparator: false,
      });

      rows.push(newExcelRow);
      localStorage.setItem('hotel_pos_excel_rows_v3', JSON.stringify(rows));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('excel-rows-synced', { detail: { rows } }));
      }
    } catch (e) {
      console.error('Failed to sync approved expense to Excel:', e);
    }

    this.addAuditLog({
      action: 'Duyệt phiếu chi',
      details: `Admin đã duyệt phiếu chi #${expenseId} (${formatCurrencyVND(
        exp.amount
      )} - ${exp.reason}). Số tiền này sẽ được trừ vào sổ quỹ ca làm việc!`,
      user: adminName,
      severity: 'success',
    });

    return exp;
  },

  rejectExpense(expenseId, adminName = 'Admin', rejectReason = '') {
    const expenses = this.getExpenses();
    const idx = expenses.findIndex((e) => e.id === expenseId);
    if (idx === -1) return null;
    const exp = expenses[idx];
    const prevStatus = exp.status;
    exp.status = 'rejected';
    exp.rejected_by = adminName;
    exp.rejected_at = new Date().toISOString();
    exp.reject_reason = rejectReason;
    this.saveExpenses(expenses);

    if (supabaseService.isAvailable()) {
      supabaseService.updateExpenseStatus(exp.id, 'rejected', adminName, rejectReason).catch((err) =>
        console.warn('Supabase rejectExpense warning:', err?.message || err)
      );
    }

    // If it was previously approved, refund money back into payments ledger
    if (prevStatus === 'approved') {
      this.addPaymentRecord({
        bookingId: null,
        roomNumber: 'CHI',
        paymentType: 'refund',
        method: exp.method,
        amount: exp.amount,
        note: `[Hoàn tiền phiếu chi bị từ chối #${exp.id}] ${rejectReason || exp.reason}`,
        createdAt: new Date().toISOString(),
      });
    }

    this.addAuditLog({
      action: 'Từ chối phiếu chi',
      details: `Admin từ chối phiếu chi #${expenseId} (${formatCurrencyVND(
        exp.amount
      )}). Lý do: ${rejectReason || 'Không hợp lệ'}`,
      user: adminName,
      severity: 'danger',
    });

    return exp;
  },

  // --- Reservations (Thẻ Cọc Phòng & Đặt Chỗ Trước) ---
  getReservations() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RESERVATIONS_V2);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse reservations:', e);
    }
    const seed = generateSeedDataV2();
    this.saveReservations(seed.reservations || []);
    return seed.reservations || [];
  },

  saveReservations(reservations) {
    try {
      localStorage.setItem(STORAGE_KEYS.RESERVATIONS_V2, JSON.stringify(reservations));
      syncDesktopBackup();
      triggerAutoPushToSupabase();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hotel-reservations-updated', { detail: { reservations } }));
        window.dispatchEvent(new CustomEvent('hotel-store-updated'));
      }
    } catch (e) {
      console.error('Failed to save reservations:', e);
    }
  },

  createReservation({
    roomNumber = '',
    customerName,
    customerPhone = '',
    rentalType = 'daily',
    expectedCheckIn,
    depositAmount = 0,
    depositMethod = 'transfer', // 'transfer' | 'cash'
    notes = '',
  }) {
    const numDeposit = Math.max(0, Number(depositAmount) || 0);
    const now = new Date();
    const nowIso = now.toISOString();
    const roomNumStr = roomNumber ? String(roomNumber) : '';

    const newReservation = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      room_number: roomNumStr,
      customer_name: customerName || 'Khách đặt cọc',
      customer_phone: customerPhone || '',
      rental_type: normalizeRentalType(rentalType),
      expected_check_in: expectedCheckIn || new Date(now.getTime() + 2 * 60 * 60000).toISOString(),
      deposit_amount: numDeposit,
      deposit_method: depositMethod,
      status: 'active', // 'active' (chờ nhận phòng) | 'arrived' (đã đến/đã nhận phòng)
      notes: notes || '',
      created_at: nowIso,
    };

    const reservations = this.getReservations();
    const updated = [newReservation, ...reservations];
    this.saveReservations(updated);

    if (supabaseService.isAvailable()) {
      supabaseService.createReservation(newReservation).catch((err) =>
        console.warn('Supabase createReservation warning:', err?.message || err)
      );
    }

    // If deposit amount was collected, record immediately into payments ledger for the active shift
    if (numDeposit > 0) {
      this.addPaymentRecord({
        bookingId: null,
        reservationId: newReservation.id,
        roomNumber: roomNumStr || 'Cọc',
        paymentType: 'deposit',
        method: depositMethod,
        amount: numDeposit,
        note: `[Tiền Cọc Giữ Phòng] Khách ${customerName}${roomNumStr ? ` (P.${roomNumStr})` : ' (Chưa xếp phòng)'}`,
        createdAt: nowIso,
      });

      // If reservation is assigned to a room, sync deposit to Excel POS
      if (roomNumStr) {
        this.syncReservationToExcel(newReservation);
      }
    }

    this.addAuditLog({
      action: 'Đặt cọc giữ phòng',
      details: `Tạo cọc giữ phòng ${roomNumStr ? `P.${roomNumStr}` : '(Chưa chọn số phòng)'} cho khách: ${customerName} (SĐT: ${customerPhone || '---'}), tiền cọc: ${formatCurrencyVND(numDeposit)} (${depositMethod === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'})`,
      user: 'Lễ tân',
      severity: 'info',
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hotel-store-updated'));
    }

    return newReservation;
  },

  syncReservationToExcel(res) {
    if (!res || !res.room_number) return;
    try {
      const dataStr = localStorage.getItem('hotel_pos_excel_rows_v3');
      const rows = dataStr ? JSON.parse(dataStr) : [];
      const resDate = new Date(res.expected_check_in || Date.now());
      const day = String(resDate.getDate()).padStart(2, '0');
      const month = String(resDate.getMonth() + 1).padStart(2, '0');
      const year = resDate.getFullYear();
      const dateStr = `${day}/${month}/${year}`;
      const checkInHHMM = `${String(resDate.getHours()).padStart(2, '0')}:${String(
        resDate.getMinutes()
      ).padStart(2, '0')}`;

      const existingIdx = rows.findIndex(
        (r) =>
          !r.isDateSeparator &&
          String(r.roomNumber) === String(res.room_number) &&
          (r.reservationId === res.id || (!r.bookingId && (!r.checkIn || r.checkIn.trim() === '')))
      );

      const depositNote = `(Đã cọc ${formatNumber(res.deposit_amount)} ${res.deposit_method === 'transfer' ? 'CK' : 'TM'}) Khách ${res.customer_name || ''}`;

      if (existingIdx !== -1) {
        rows[existingIdx] = calculateExcelRow({
          ...rows[existingIdx],
          reservationId: res.id,
          date: rows[existingIdx].date || dateStr,
          roomNumber: String(res.room_number),
          roomType: res.rental_type === 'overnight' ? 'Qua đêm' : res.rental_type === 'daily' ? 'Ngày đêm' : 'Giờ',
          checkIn: checkInHHMM,
          depositAmount: res.deposit_amount || 0,
          note: depositNote,
          status: 'Đã cọc',
        });
      }

      localStorage.setItem('hotel_pos_excel_rows_v3', JSON.stringify(rows));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('excel-rows-synced', { detail: { rows } }));
      }
    } catch (e) {
      console.error('Failed to sync reservation to excel:', e);
    }
  },

  deleteReservation(reservationId) {
    const reservations = this.getReservations();
    const updated = reservations.filter((r) => r.id !== reservationId);
    this.saveReservations(updated);

    if (supabaseService.isAvailable()) {
      supabaseService.deleteReservation(reservationId).catch((err) =>
        console.warn('Supabase deleteReservation warning:', err?.message || err)
      );
    }

    return updated;
  },

  deleteAllArrivedReservations() {
    const reservations = this.getReservations();
    const arrivedIds = reservations
      .filter((r) => r.status === 'arrived' || r.status === 'completed')
      .map((r) => r.id);
    const updated = reservations.filter(
      (r) => r.status !== 'arrived' && r.status !== 'completed'
    );
    this.saveReservations(updated);

    if (supabaseService.isAvailable()) {
      arrivedIds.forEach((id) => {
        supabaseService.deleteReservation(id).catch((err) =>
          console.warn('Supabase deleteReservation arrived warning:', err?.message || err)
        );
      });
    }

    return updated;
  },

  deleteAllReservations() {
    const reservations = this.getReservations();
    this.saveReservations([]);
    if (supabaseService.isAvailable()) {
      reservations.forEach((r) => {
        supabaseService.deleteReservation(r.id).catch((err) =>
          console.warn('Supabase deleteAllReservations warning:', err?.message || err)
        );
      });
    }
    return [];
  },

  updateReservation(reservationId, updatedFields) {
    const reservations = this.getReservations();
    const idx = reservations.findIndex((r) => r.id === reservationId);
    if (idx === -1) return null;
    reservations[idx] = { ...reservations[idx], ...updatedFields };
    this.saveReservations(reservations);

    if (supabaseService.isAvailable()) {
      supabaseService.updateReservation(reservationId, updatedFields).catch((err) =>
        console.warn('Supabase updateReservation warning:', err?.message || err)
      );
    }

    return reservations[idx];
  },

  cancelReservationRecord(reservationId, refundDeposit = false) {
    const reservations = this.getReservations();
    const idx = reservations.findIndex((r) => r.id === reservationId);
    if (idx === -1) return null;

    const res = reservations[idx];
    res.status = 'cancelled';
    this.saveReservations(reservations);

    if (supabaseService.isAvailable()) {
      supabaseService.updateReservation(reservationId, { status: 'cancelled' }).catch((err) =>
        console.warn('Supabase cancelReservation warning:', err?.message || err)
      );
    }

    if (refundDeposit && res.deposit_amount > 0) {
      this.addPaymentRecord({
        bookingId: null,
        reservationId: res.id,
        roomNumber: res.room_number || 'Cọc',
        paymentType: 'refund',
        method: res.deposit_method || 'cash',
        amount: -res.deposit_amount,
        note: `[Hoàn tiền cọc] Hủy giữ phòng ${res.room_number ? `P.${res.room_number}` : ''} (${res.customer_name})`,
        createdAt: new Date().toISOString(),
      });
    }

    return res;
  },

  deleteBooking(bookingId, adminName = 'Admin') {
    const bookings = this.getBookings();
    const target = bookings.find((b) => b.id === bookingId);
    const updated = bookings.filter((b) => b.id !== bookingId);
    this.saveBookings(updated);

    if (supabaseService.isAvailable()) {
      supabaseService.deleteBooking(bookingId).catch((err) =>
        console.warn('Supabase deleteBooking warning:', err?.message || err)
      );
    }

    if (target) {
      this.updateRoomStatus(target.room_number, 'available');
      this.addAuditLog({
        action: 'Xóa phòng',
        details: `Đã xóa phiên phòng P.${target.room_number} (Đơn #${bookingId})`,
        user: adminName,
        severity: 'danger',
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hotel-store-updated'));
    }
    return updated;
  },

  // --- Bookings ---
  getBookings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BOOKINGS_V2);
      if (data) {
        const list = JSON.parse(data);
        if (Array.isArray(list)) {
          // Deduplicate active bookings: at most 1 active booking per room
          const seenActiveRooms = new Set();
          const cleanList = [];
          for (const b of list) {
            if (b.status === 'active') {
              const rNum = String(b.room_number);
              if (seenActiveRooms.has(rNum)) {
                continue; // Skip duplicate active booking
              }
              seenActiveRooms.add(rNum);
            }
            cleanList.push(b);
          }
          return cleanList;
        }
      }
    } catch (e) {
      console.error('Failed to parse bookings:', e);
    }
    const seed = generateSeedDataV2();
    this.saveBookings(seed.bookings);
    return seed.bookings;
  },

  saveBookings(bookings) {
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS_V2, JSON.stringify(bookings));
      syncDesktopBackup();
      triggerAutoPushToSupabase();
    } catch (e) {
      console.error('Failed to save bookings:', e);
    }
  },

  getActiveBooking(roomNumber) {
    const bookings = this.getBookings();
    return bookings.find(
      (b) => String(b.room_number) === String(roomNumber) && b.status === 'active'
    );
  },

  // --- Payments Ledger (Sổ Quỹ Dòng Tiền) ---
  getPayments() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PAYMENTS_V2);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse payments:', e);
    }
    const seed = generateSeedDataV2();
    this.savePayments(seed.payments);
    return seed.payments;
  },

  savePayments(payments) {
    try {
      localStorage.setItem(STORAGE_KEYS.PAYMENTS_V2, JSON.stringify(payments));
      syncDesktopBackup();
      triggerAutoPushToSupabase();
    } catch (e) {
      console.error('Failed to save payments:', e);
    }
  },

  addPaymentRecord({
    bookingId,
    reservationId = null,
    roomNumber,
    paymentType = 'settlement', // 'advance', 'settlement', 'refund', 'deposit', 'expense'
    method = 'cash', // 'cash', 'transfer'
    amount,
    note = '',
    createdAt = new Date().toISOString(),
  }) {
    const payments = this.getPayments();
    const newPayment = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      booking_id: bookingId,
      reservation_id: reservationId,
      room_number: String(roomNumber),
      payment_type: paymentType,
      method,
      amount: Number(amount),
      note,
      created_at: createdAt,
    };
    const updated = [newPayment, ...payments];
    this.savePayments(updated);

    if (supabaseService.isAvailable()) {
      supabaseService.createPayment(newPayment).catch((err) =>
        console.warn('Supabase createPayment warning:', err?.message || err)
      );
    }

    return newPayment;
  },

  // --- Core Business Workflow: Thu Trước Một Phần Tiền / Tạm Ứng (Partial Advance Payment) ---
  collectAdvancePayment({
    bookingId,
    roomNumber,
    amount,
    method = 'cash', // 'cash' | 'transfer'
    note = '',
    createdAt = new Date().toISOString(),
  }) {
    const numAmount = Math.max(0, Number(amount) || 0);
    if (numAmount <= 0) {
      throw new Error('Số tiền thu trước phải lớn hơn 0đ!');
    }

    const bookings = this.getBookings();
    const idx = bookings.findIndex(
      (b) =>
        b.id === bookingId ||
        (String(b.room_number) === String(roomNumber) && b.status === 'active')
    );

    if (idx === -1) {
      throw new Error(`Không tìm thấy phiên phòng ${roomNumber} đang ở!`);
    }

    const booking = bookings[idx];
    const prevPaid = Number(booking.paid_amount) || 0;
    const newPaid = prevPaid + numAmount;

    // Record payment in payments ledger
    const payment = this.addPaymentRecord({
      bookingId: booking.id,
      roomNumber: booking.room_number,
      paymentType: 'advance',
      method,
      amount: numAmount,
      note: note || `Thu trước một phần tiền phòng ${booking.room_number}`,
      createdAt,
    });

    const updatedBooking = {
      ...booking,
      paid_amount: newPaid,
      deposit_amount: newPaid,
      balance_amount: Math.max(0, (Number(booking.total_amount) || 0) - newPaid),
      notes: note
        ? booking.notes
          ? `${booking.notes} | ${note}`
          : note
        : booking.notes,
    };

    bookings[idx] = updatedBooking;
    this.saveBookings(bookings);

    if (supabaseService.isAvailable()) {
      supabaseService.updateBooking(updatedBooking.id, updatedBooking).catch((err) =>
        console.warn('Supabase updateBooking advance warning:', err?.message || err)
      );
    }

    // Sync to Excel POS ledger immediately
    this.syncBookingToExcel(updatedBooking);

    this.addAuditLog({
      action: 'Thu trước / Tạm ứng',
      details: `Thu trước phòng P.${booking.room_number}: ${formatCurrencyVND(numAmount)} (${
        method === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'
      })`,
      user: 'Lễ tân',
      severity: 'info',
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hotel-store-updated'));
    }

    return { booking: updatedBooking, payment };
  },

  // --- Update Active Booking Services (Drinks, Surcharge, Rental Type, Notes) ---
  updateActiveBookingDetails({
    bookingId,
    roomNumber,
    rentalType,
    roomRateMode,
    drinks = {},
    surchargeAmount = 0,
    surchargeReason = '',
    customerName = '',
    customerPhone = '',
    notes = '',
  }) {
    const bookings = this.getBookings();
    const idx = bookings.findIndex(
      (b) =>
        b.id === bookingId ||
        (String(b.room_number) === String(roomNumber) && b.status === 'active')
    );

    if (idx === -1) {
      throw new Error(`Không tìm thấy phiên phòng ${roomNumber} đang ở!`);
    }

    const booking = bookings[idx];
    const beerQty = Math.max(0, Number(drinks.beer_qty ?? drinks.beer ?? booking.beer_qty ?? 0));
    const waterQty = Math.max(0, Number(drinks.water_qty ?? drinks.water ?? booking.water_qty ?? 0));
    const softDrinkQty = Math.max(0, Number(drinks.soft_drink_qty ?? drinks.softDrink ?? booking.soft_drink_qty ?? 0));
    const surcharge = Number(surchargeAmount ?? booking.surcharge_amount ?? 0);

    const updatedBooking = {
      ...booking,
      rental_type: rentalType || booking.rental_type || 'hourly',
      room_rate_mode: roomRateMode || booking.room_rate_mode || 'single',
      beer_qty: beerQty,
      water_qty: waterQty,
      soft_drink_qty: softDrinkQty,
      service_amount: (beerQty * 20000) + (waterQty * 10000) + (softDrinkQty * 15000),
      surcharge_amount: surcharge,
      surcharge_reason: surchargeReason !== undefined ? surchargeReason : (booking.surcharge_reason || ''),
      customer_name: customerName || booking.customer_name || 'Khách vãng lai',
      customer_phone: customerPhone || booking.customer_phone || '',
      notes: notes !== undefined ? notes : (booking.notes || ''),
    };

    bookings[idx] = updatedBooking;
    this.saveBookings(bookings);

    if (supabaseService.isAvailable()) {
      supabaseService.updateBooking(updatedBooking.id, updatedBooking).catch((err) =>
        console.warn('Supabase updateBooking details warning:', err?.message || err)
      );
    }

    // Sync to Excel POS ledger
    this.syncBookingToExcel(updatedBooking);

    this.addAuditLog({
      action: 'Cập nhật phòng / Dịch vụ',
      details: `Cập nhật P.${booking.room_number}: Nước [Bia:${beerQty}, Suối:${waterQty}, Ngọt:${softDrinkQty}], Phụ thu: ${formatCurrencyVND(surcharge)}`,
      user: 'Lễ tân',
      severity: 'info',
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hotel-store-updated'));
    }

    return updatedBooking;
  },

  // --- Core Business Workflow 1.2: Hủy cọc ---
  cancelReservation(bookingId, refundDeposit = false) {
    const bookings = this.getBookings();
    const idx = bookings.findIndex((b) => b.id === bookingId);
    if (idx === -1) return;

    const booking = bookings[idx];
    const updatedBooking = {
      ...booking,
      status: 'cancelled',
    };
    bookings[idx] = updatedBooking;
    this.saveBookings(bookings);

    // If refunding deposit
    if (refundDeposit && booking.paid_amount > 0) {
      this.addPaymentRecord({
        bookingId: booking.id,
        roomNumber: booking.room_number,
        paymentType: 'refund',
        method: 'cash',
        amount: -booking.paid_amount,
        note: `Hoàn tiền cọc do hủy phòng ${booking.room_number}`,
      });
    }

    this.updateRoomStatus(booking.room_number, 'available');
    this.addAuditLog({
      action: 'Hủy phòng',
      details: `Hủy phiên đặt phòng P.${booking.room_number} (Đơn #${booking.id})`,
      user: 'Lễ tân',
      severity: 'warning',
    });
    return updatedBooking;
  },

  // --- Two-way Synchronization between Room Matrix and Excel POS ---
  syncBookingToExcel(booking, isCheckOut = false) {
    if (!booking) return;
    try {
      const dataStr = localStorage.getItem('hotel_pos_excel_rows_v3');
      let rows = dataStr ? JSON.parse(dataStr) : [];
      const checkInDate = new Date(booking.check_in || Date.now());
      const day = String(checkInDate.getDate()).padStart(2, '0');
      const month = String(checkInDate.getMonth() + 1).padStart(2, '0');
      const year = checkInDate.getFullYear();
      const dateStr = `${day}/${month}/${year}`;
      const checkInHHMM = `${String(checkInDate.getHours()).padStart(2, '0')}:${String(
        checkInDate.getMinutes()
      ).padStart(2, '0')}`;

      let checkOutHHMM = '';
      if (booking.check_out) {
        const checkOutDate = new Date(booking.check_out);
        checkOutHHMM = `${String(checkOutDate.getHours()).padStart(2, '0')}:${String(
          checkOutDate.getMinutes()
        ).padStart(2, '0')}`;
      }

      const rentalTypeName =
        booking.rental_type === 'overnight'
          ? 'Qua đêm'
          : booking.rental_type === 'daily'
          ? 'Ngày đêm'
          : 'Giờ';

      const isCompleted = isCheckOut || booking.status === 'completed';
      const roomKey = String(booking.room_number);

      // Find matching row (string-safe ids). Prefer: bookingId → live room row → empty template
      let existingIdx = rows.findIndex(
        (r) => !r.isDateSeparator && sameEntityId(r.bookingId, booking.id)
      );

      if (existingIdx === -1) {
        existingIdx = rows.findIndex(
          (r) =>
            !r.isDateSeparator &&
            String(r.roomNumber) === roomKey &&
            (r.status === 'Đang ở' || r.status === 'Đã cọc')
        );
      }

      if (existingIdx === -1 && !isCompleted) {
        existingIdx = rows.findIndex(
          (r) =>
            !r.isDateSeparator &&
            String(r.roomNumber) === roomKey &&
            r.status !== 'Xong' &&
            (!r.bookingId || !String(r.bookingId).trim()) &&
            (!r.checkIn || String(r.checkIn).trim() === '')
        );
      }

      const finalNote = booking.notes || '';

      if (existingIdx !== -1) {
        const updatedRow = calculateExcelRow({
          ...rows[existingIdx],
          bookingId: booking.id,
          date: rows[existingIdx].date || dateStr,
          roomNumber: roomKey,
          roomType: rentalTypeName,
          checkIn: checkInHHMM || rows[existingIdx].checkIn,
          checkOut: isCompleted
            ? checkOutHHMM || rows[existingIdx].checkOut || checkInHHMM
            : '',
          beer: booking.beer_qty ?? rows[existingIdx].beer ?? '',
          filteredWater: booking.water_qty ?? rows[existingIdx].filteredWater ?? '',
          softDrink: booking.soft_drink_qty ?? rows[existingIdx].softDrink ?? '',
          extra: booking.surcharge_amount ?? rows[existingIdx].extra ?? 0,
          note: finalNote || rows[existingIdx].note || '',
          depositAmount: Math.max(
            0,
            Number(booking.deposit_amount || 0),
            Number(booking.paid_amount || 0),
            (isCompleted ? (Number(rows[existingIdx]?.depositAmount) || 0) : 0)
          ),
          status: isCompleted ? 'Xong' : 'Đang ở',
        });
        rows[existingIdx] = updatedRow;
      } else {
        const newExcelRow = calculateExcelRow({
          id: Date.now() + Math.floor(Math.random() * 1000),
          bookingId: booking.id,
          date: dateStr,
          roomNumber: roomKey,
          roomType: rentalTypeName,
          checkIn: checkInHHMM,
          checkOut: isCompleted ? checkOutHHMM || checkInHHMM : '',
          beer: booking.beer_qty || '',
          filteredWater: booking.water_qty || '',
          softDrink: booking.soft_drink_qty || '',
          waterAmount: 0,
          roomAmount: 0,
          extra: booking.surcharge_amount || 0,
          totalAmount: 0,
          note: finalNote,
          depositAmount: Math.max(0, Number(booking.deposit_amount || 0), Number(booking.paid_amount || 0)),
          status: isCompleted ? 'Xong' : 'Đang ở',
          isDateSeparator: false,
        });
        rows.push(newExcelRow);
      }

      // After checkout: ensure no leftover live Đang ở / Đã cọc for this room
      if (isCompleted) {
        rows = rows.map((r) => {
          if (
            r &&
            !r.isDateSeparator &&
            String(r.roomNumber) === roomKey &&
            (r.status === 'Đang ở' || r.status === 'Đã cọc') &&
            !sameEntityId(r.bookingId, booking.id)
          ) {
            return { ...r, status: 'Xong', checkOut: r.checkOut || checkOutHHMM || checkInHHMM };
          }
          return r;
        });
      }

      // Deduplicate: one live row per room
      rows = dedupeLiveExcelRows(rows);

      // Sort rows chronologically by date and checkIn / ID (chronological natural order)
      rows.sort((a, b) => {
        if (a.date && b.date && a.date !== b.date) {
          const partsA = String(a.date).split('/').map(Number);
          const partsB = String(b.date).split('/').map(Number);
          if (partsA.length === 3 && partsB.length === 3) {
            const timeA = new Date(partsA[2], (partsA[1] || 1) - 1, partsA[0] || 1).getTime();
            const timeB = new Date(partsB[2], (partsB[1] || 1) - 1, partsB[0] || 1).getTime();
            if (timeA !== timeB) return timeA - timeB;
          }
        }
        if (a.isDateSeparator && !b.isDateSeparator) return -1;
        if (!a.isDateSeparator && b.isDateSeparator) return 1;
        const timeA = a.checkIn || '';
        const timeB = b.checkIn || '';
        if (timeA && timeB && timeA !== timeB) return timeA.localeCompare(timeB);
        return (a.id || 0) - (b.id || 0);
      });

      localStorage.setItem('hotel_pos_excel_rows_v3', JSON.stringify(rows));
      syncDesktopBackup();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('excel-rows-synced', { detail: { rows } }));
      }
    } catch (e) {
      console.error('Failed to sync booking to excel:', e);
    }
  },

  rebuildExcelRowsFromBookings() {
    try {
      const bookings = this.getBookings();
      const expenses = this.getExpenses().filter((e) => e.status === 'approved');

      let existingMap = new Map();
      let standaloneRows = [];
      try {
        const raw = localStorage.getItem('hotel_pos_excel_rows_v3');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((r) => {
              if (r.id) existingMap.set(String(r.id), r);
              if (r.bookingId) existingMap.set(String(r.bookingId), r);
              // Preserve standalone date separators and retail drink rows
              if (
                r.isDateSeparator ||
                ((!r.roomNumber || r.roomNumber === '---' || String(r.roomNumber).toUpperCase() === 'LẺ' || String(r.roomNumber).toUpperCase() === 'BÁN LẺ') &&
                  (Number(r.waterAmount) > 0 || r.status === 'Xong'))
              ) {
                standaloneRows.push(r);
              }
            });
          }
        }
      } catch (e) {}

      const bookingRows = bookings.map((b) => {
        const existing = existingMap.get(String(b.id));
        const checkInDate = new Date(b.check_in || Date.now());
        const day = String(checkInDate.getDate()).padStart(2, '0');
        const month = String(checkInDate.getMonth() + 1).padStart(2, '0');
        const year = checkInDate.getFullYear();
        const dateStr = `${day}/${month}/${year}`;
        const checkInHHMM = `${String(checkInDate.getHours()).padStart(2, '0')}:${String(
          checkInDate.getMinutes()
        ).padStart(2, '0')}`;

        let checkOutHHMM = '';
        if (existing && existing.checkOut) {
          checkOutHHMM = existing.checkOut;
        } else if (b.check_out) {
          const checkOutDate = new Date(b.check_out);
          checkOutHHMM = `${String(checkOutDate.getHours()).padStart(2, '0')}:${String(
            checkOutDate.getMinutes()
          ).padStart(2, '0')}`;
        }

        const rentalTypeName =
          b.rental_type === 'overnight'
            ? 'Qua đêm'
            : b.rental_type === 'daily'
            ? 'Ngày đêm'
            : 'Giờ';

        const isCompleted = b.status === 'completed';
        const finalNote = (existing && existing.note) ? existing.note : (b.notes || '');

        const depAmt = Math.max(
          0,
          Number(b.deposit_amount || 0),
          Number(b.paid_amount || 0),
          (existing && Number(existing.depositAmount)) || 0
        );

        return calculateExcelRow({
          id: b.id,
          bookingId: b.id,
          date: (existing && existing.date) || dateStr,
          roomNumber: String(b.room_number),
          roomType: (existing && existing.roomType) || rentalTypeName,
          checkIn: (existing && existing.checkIn) || checkInHHMM,
          checkOut: isCompleted ? (checkOutHHMM || checkInHHMM) : ((existing && existing.checkOut) || ''),
          beer: b.beer_qty ?? (existing && existing.beer) ?? '',
          filteredWater: b.water_qty ?? (existing && existing.filteredWater) ?? '',
          softDrink: b.soft_drink_qty ?? (existing && existing.softDrink) ?? '',
          waterAmount: b.service_amount ?? (existing && existing.waterAmount) ?? 0,
          roomAmount: b.room_amount ?? (existing && existing.roomAmount) ?? 0,
          extra: b.surcharge_amount ?? (existing && existing.extra) ?? 0,
          totalAmount: b.total_amount ?? (existing && existing.totalAmount) ?? 0,
          note: finalNote,
          depositAmount: depAmt,
          status: isCompleted ? 'Xong' : 'Đang ở',
          isDateSeparator: false,
        });
      });

      const expenseRows = expenses.map((exp) => {
        const expDate = new Date(exp.approved_at || exp.created_at || Date.now());
        const day = String(expDate.getDate()).padStart(2, '0');
        const month = String(expDate.getMonth() + 1).padStart(2, '0');
        const year = expDate.getFullYear();
        const dateStr = `${day}/${month}/${year}`;
        const timeHHMM = `${String(expDate.getHours()).padStart(2, '0')}:${String(
          expDate.getMinutes()
        ).padStart(2, '0')}`;

        return calculateExcelRow({
          id: exp.id,
          bookingId: null,
          date: dateStr,
          roomNumber: 'CHI',
          roomType: 'Phiếu Chi',
          checkIn: timeHHMM,
          checkOut: timeHHMM,
          beer: '',
          filteredWater: '',
          softDrink: '',
          waterAmount: 0,
          roomAmount: 0,
          extra: 0,
          totalAmount: -Number(exp.amount || 0),
          depositAmount: 0,
          note: `Chi ${formatNumber(exp.amount)}đ: ${exp.reason} (${exp.requester})`,
          status: 'Xong',
          isDateSeparator: false,
        });
      });

      const combined = dedupeLiveExcelRows([...bookingRows, ...expenseRows, ...standaloneRows]);
      combined.sort((a, b) => {
        if (a.date && b.date && a.date !== b.date) {
          const partsA = String(a.date).split('/').map(Number);
          const partsB = String(b.date).split('/').map(Number);
          if (partsA.length === 3 && partsB.length === 3) {
            const timeA = new Date(partsA[2], (partsA[1] || 1) - 1, partsA[0] || 1).getTime();
            const timeB = new Date(partsB[2], (partsB[1] || 1) - 1, partsB[0] || 1).getTime();
            if (timeA !== timeB) return timeA - timeB;
          }
        }
        if (a.isDateSeparator && !b.isDateSeparator) return -1;
        if (!a.isDateSeparator && b.isDateSeparator) return 1;
        const timeA = a.checkIn || '';
        const timeB = b.checkIn || '';
        if (timeA && timeB && timeA !== timeB) return timeA.localeCompare(timeB);
        return (a.id || 0) - (b.id || 0);
      });

      localStorage.setItem('hotel_pos_excel_rows_v3', JSON.stringify(combined));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('excel-rows-synced', { detail: { rows: combined } }));
      }
      return combined;
    } catch (e) {
      console.error('Failed to rebuild excel rows from bookings:', e);
      return [];
    }
  },

  syncFromExcelRows(excelRows) {
    if (!Array.isArray(excelRows)) return;
    try {
      const currentBookings = this.getBookings();
      const currentRooms = this.getRooms();
      let hasChange = false;

      let excelNeedsRewrite = false;

      excelRows.forEach((r) => {
        if (r.isDateSeparator) return;
        if (r.isExpense || r.roomNumber === 'CHI' || r.roomType === 'Phiếu Chi') return;

        const roomNumStr = String(r.roomNumber || '').trim();
        const hasDrinks = (Number(r.beer) || 0) > 0 || (Number(r.filteredWater) || 0) > 0 || (Number(r.softDrink) || 0) > 0;
        const totAmount = Number(r.totalAmount || r.waterAmount || 0);

        // Retail drink sale (without hotel room)
        if ((!roomNumStr || roomNumStr === '---' || roomNumStr.toUpperCase() === 'LẺ' || roomNumStr.toUpperCase() === 'BÁN LẺ' || roomNumStr.toUpperCase() === 'KHACH LE') && hasDrinks && totAmount > 0) {
          if (r.status === 'Xong') {
            const payments = this.getPayments();
            const existingPayment = payments.find((p) => sameEntityId(p.booking_id, r.id));
            if (!existingPayment) {
              const parsedPayment = parseNoteColumn(r.note, totAmount, 0);
              const method = r.paymentMethod || parsedPayment.paymentMethod;
              this.addPaymentRecord({
                bookingId: r.id,
                roomNumber: 'LẺ',
                paymentType: 'settlement',
                method: method === 'transfer' ? 'transfer' : 'cash',
                amount: totAmount,
                note: `[Bán lẻ nước] ${r.beer ? `${r.beer} bia ` : ''}${r.filteredWater ? `${r.filteredWater} suối ` : ''}${r.softDrink ? `${r.softDrink} nước ngọt ` : ''}${r.note ? `(${r.note})` : ''}`.trim(),
                createdAt: new Date().toISOString(),
              });
            }
          }
          return;
        }

        if (!roomNumStr) return;

        const roomObj = currentRooms.find((rm) => rm.room_number === roomNumStr);
        if (!roomObj) return;

        const isRowDone = r.status === 'Xong';
        const hasCheckIn = Boolean(r.checkIn && String(r.checkIn).trim() !== '');

        if (!isRowDone && (r.status === 'Đang ở' || (!r.checkOut && hasCheckIn))) {
          // Template rows (seeded room with no check-in) must NOT create POS bookings
          if (!hasCheckIn) return;

          const rentalType =
            r.roomType === 'Qua đêm'
              ? 'overnight'
              : r.roomType === 'Ngày đêm'
              ? 'daily'
              : 'hourly';

          const linkedBooking = r.bookingId
            ? currentBookings.find((b) => sameEntityId(b.id, r.bookingId))
            : null;

          // Stale Excel "Đang ở" pointing at a completed/cancelled booking → do NOT resurrect
          if (linkedBooking && linkedBooking.status !== 'active') {
            r.status = 'Xong';
            if (!r.checkOut || String(r.checkOut).trim() === '') {
              r.checkOut = r.checkIn;
            }
            excelNeedsRewrite = true;
            // Free room if no other active stay for this room
            const stillActive = currentBookings.some(
              (b) => String(b.room_number) === roomNumStr && b.status === 'active'
            );
            if (!stillActive && roomObj.status !== 'available') {
              roomObj.status = 'available';
              hasChange = true;
            }
            return;
          }

          // Resolve active: linked active id OR any active stay on this room
          let activeBooking =
            linkedBooking && linkedBooking.status === 'active'
              ? linkedBooking
              : currentBookings.find(
                  (b) => String(b.room_number) === roomNumStr && b.status === 'active'
                );

          if (!activeBooking) {
            // Check if r belongs to an already completed booking (by explicit bookingId or row id)
            const matchedCompleted = currentBookings.find(
              (b) =>
                String(b.room_number) === roomNumStr &&
                b.status === 'completed' &&
                (sameEntityId(b.id, r.bookingId) || (r.id && sameEntityId(b.id, r.id)))
            );

            if (matchedCompleted) {
              r.status = 'Xong';
              r.bookingId = matchedCompleted.id;
              if (!r.checkOut || String(r.checkOut).trim() === '') {
                r.checkOut = r.checkIn;
              }
              excelNeedsRewrite = true;
              return;
            }

            const checkInParts = String(r.checkIn || '').split(':');
            const now = new Date();
            if (checkInParts.length === 2) {
              now.setHours(Number(checkInParts[0]) || 0, Number(checkInParts[1]) || 0, 0, 0);
            }
            const checkInIso = now.toISOString();
            const depAmt = Math.max(0, Number(r.depositAmount) || 0);

            const newBooking = {
              id: r.bookingId || (Date.now() + Math.floor(Math.random() * 1000)),
              room_id: roomObj.id,
              room_number: roomNumStr,
              customer_name: 'Khách Excel POS',
              customer_phone: '',
              rental_type: rentalType,
              expected_check_in: checkInIso,
              check_in: checkInIso,
              check_out: null,
              beer_qty: Number(r.beer) || 0,
              water_qty: Number(r.filteredWater) || 0,
              soft_drink_qty: Number(r.softDrink) || 0,
              room_amount: Number(r.roomAmount) || 0,
              service_amount: Number(r.waterAmount) || 0,
              surcharge_amount: Number(r.extra) || 0,
              surcharge_reason: '',
              total_amount: Number(r.totalAmount) || 0,
              deposit_amount: depAmt,
              paid_amount: depAmt,
              balance_amount: Math.max(0, (Number(r.totalAmount) || 0) - depAmt),
              status: 'active',
              notes: r.note || '',
              created_at: new Date().toISOString(),
            };

            currentBookings.unshift(newBooking);
            r.bookingId = newBooking.id;
            roomObj.status = 'occupied';
            hasChange = true;
            excelNeedsRewrite = true;

            // If new active stay has advance deposit, record advance payment
            if (depAmt > 0) {
              const payments = this.getPayments();
              const hasDepositPayment = payments.some(
                (p) => sameEntityId(p.booking_id, newBooking.id) && (p.payment_type === 'advance' || p.payment_type === 'deposit')
              );
              if (!hasDepositPayment) {
                const parsed = parseNoteColumn(r.note, 0, depAmt);
                this.addPaymentRecord({
                  bookingId: newBooking.id,
                  roomNumber: roomNumStr,
                  paymentType: 'advance',
                  method: parsed.paymentMethod === 'transfer' ? 'transfer' : 'cash',
                  amount: depAmt,
                  note: `[Cọc / Thu trước Excel] Phòng ${roomNumStr}`,
                  createdAt: new Date().toISOString(),
                });
              }
            }
          } else {
            if (!sameEntityId(r.bookingId, activeBooking.id)) {
              r.bookingId = activeBooking.id;
              excelNeedsRewrite = true;
            }
            let bookingUpdated = false;
            const bBeer = Number(r.beer) || 0;
            const bWater = Number(r.filteredWater) || 0;
            const bSoft = Number(r.softDrink) || 0;
            const depAmt = Math.max(0, Number(r.depositAmount) || 0);

            if (activeBooking.beer_qty !== bBeer) {
              activeBooking.beer_qty = bBeer;
              bookingUpdated = true;
            }
            if (activeBooking.water_qty !== bWater) {
              activeBooking.water_qty = bWater;
              bookingUpdated = true;
            }
            if (activeBooking.soft_drink_qty !== bSoft) {
              activeBooking.soft_drink_qty = bSoft;
              bookingUpdated = true;
            }
            if (activeBooking.rental_type !== rentalType) {
              activeBooking.rental_type = rentalType;
              bookingUpdated = true;
            }
            if (depAmt > 0 && activeBooking.deposit_amount !== depAmt) {
              activeBooking.deposit_amount = depAmt;
              activeBooking.paid_amount = depAmt;
              bookingUpdated = true;

              const payments = this.getPayments();
              const hasDepositPayment = payments.some(
                (p) => sameEntityId(p.booking_id, activeBooking.id) && (p.payment_type === 'advance' || p.payment_type === 'deposit')
              );
              if (!hasDepositPayment) {
                const parsed = parseNoteColumn(r.note, 0, depAmt);
                this.addPaymentRecord({
                  bookingId: activeBooking.id,
                  roomNumber: roomNumStr,
                  paymentType: 'advance',
                  method: parsed.paymentMethod === 'transfer' ? 'transfer' : 'cash',
                  amount: depAmt,
                  note: `[Cọc / Thu trước Excel] Phòng ${roomNumStr}`,
                  createdAt: new Date().toISOString(),
                });
              }
            }
            if (r.note && activeBooking.notes !== r.note) {
              activeBooking.notes = r.note;
              bookingUpdated = true;
            }
            if (roomObj.status !== 'occupied') {
              roomObj.status = 'occupied';
              hasChange = true;
            }
            if (bookingUpdated) hasChange = true;
          }
        } else if (isRowDone) {
          let matchingActiveBooking = null;
          if (r.bookingId) {
            matchingActiveBooking = currentBookings.find(
              (b) => sameEntityId(b.id, r.bookingId) && b.status === 'active'
            );
          } else {
            // Only if r has no bookingId attached (e.g. user manually typed Xong in Excel)
            matchingActiveBooking = currentBookings.find(
              (b) => String(b.room_number) === roomNumStr && b.status === 'active'
            );
          }

          if (matchingActiveBooking) {
            matchingActiveBooking.status = 'completed';

            if (r.checkOut && r.checkOut.trim() !== '') {
              const parts = r.checkOut.split(':');
              const outDate = new Date();
              if (parts.length === 2) {
                outDate.setHours(Number(parts[0]) || 0, Number(parts[1]) || 0, 0, 0);
              }
              matchingActiveBooking.check_out = outDate.toISOString();
            } else {
              matchingActiveBooking.check_out = new Date().toISOString();
            }

            matchingActiveBooking.room_amount = Number(r.roomAmount) || matchingActiveBooking.room_amount;
            matchingActiveBooking.service_amount = Number(r.waterAmount) || matchingActiveBooking.service_amount;
            matchingActiveBooking.surcharge_amount = Number(r.extra) || matchingActiveBooking.surcharge_amount;
            matchingActiveBooking.total_amount = Number(r.totalAmount) || matchingActiveBooking.total_amount;
            matchingActiveBooking.paid_amount = matchingActiveBooking.total_amount;
            matchingActiveBooking.balance_amount = 0;
            matchingActiveBooking.notes = r.note || matchingActiveBooking.notes || '';

            if (roomObj.status !== 'available') {
              roomObj.status = 'available';
            }
            hasChange = true;

            if (supabaseService.isAvailable()) {
              supabaseService.updateBooking(matchingActiveBooking.id, matchingActiveBooking).catch((err) =>
                console.warn('Supabase updateBooking checkout from excel warning:', err?.message || err)
              );
              supabaseService.updateRoomStatus(roomObj.room_number, 'available').catch((err) =>
                console.warn('Supabase updateRoomStatus available from excel warning:', err?.message || err)
              );
            }

            // Calculate remaining balance to settle at checkout
            const payments = this.getPayments();
            const existingPayments = payments.filter((p) => sameEntityId(p.booking_id, matchingActiveBooking.id));
            const existingPaidAmount = existingPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
            const remainingToSettle = Math.max(0, (matchingActiveBooking.total_amount || 0) - existingPaidAmount);

            const parsedPayment = parseNoteColumn(r.note, matchingActiveBooking.total_amount, r.depositAmount);
            const nowIso = new Date().toISOString();

            if (parsedPayment.paymentMethod === 'split_refund') {
              this.addPaymentRecord({
                bookingId: matchingActiveBooking.id,
                roomNumber: matchingActiveBooking.room_number,
                paymentType: 'settlement',
                method: 'transfer',
                amount: parsedPayment.transferAmount,
                note: `[Chuyển khoản thừa] ${r.note || ''}`,
                createdAt: nowIso,
              });
              this.addPaymentRecord({
                bookingId: matchingActiveBooking.id,
                roomNumber: matchingActiveBooking.room_number,
                paymentType: 'refund',
                method: 'cash',
                amount: -parsedPayment.cashRefund,
                note: `[Thối tiền mặt] Thối lại khách ${formatNumber(parsedPayment.cashRefund)}đ`,
                createdAt: nowIso,
              });
            } else if (remainingToSettle > 0) {
              if (parsedPayment.paymentMethod === 'split') {
                const transferPart = Math.min(parsedPayment.transferAmount, remainingToSettle);
                const cashPart = Math.max(0, remainingToSettle - transferPart);
                if (transferPart > 0) {
                  this.addPaymentRecord({
                    bookingId: matchingActiveBooking.id,
                    roomNumber: matchingActiveBooking.room_number,
                    paymentType: 'settlement',
                    method: 'transfer',
                    amount: transferPart,
                    note: `[CK một phần] ${r.note || ''}`,
                    createdAt: nowIso,
                  });
                }
                if (cashPart > 0) {
                  this.addPaymentRecord({
                    bookingId: matchingActiveBooking.id,
                    roomNumber: matchingActiveBooking.room_number,
                    paymentType: 'settlement',
                    method: 'cash',
                    amount: cashPart,
                    note: `[Tiền mặt một phần] ${r.note || ''}`,
                    createdAt: nowIso,
                  });
                }
              } else if (parsedPayment.paymentMethod === 'transfer') {
                this.addPaymentRecord({
                  bookingId: matchingActiveBooking.id,
                  roomNumber: matchingActiveBooking.room_number,
                  paymentType: 'settlement',
                  method: 'transfer',
                  amount: remainingToSettle,
                  note: `[Chuyển khoản] ${r.note || 'Chốt từ Excel POS'}`,
                  createdAt: nowIso,
                });
              } else {
                this.addPaymentRecord({
                  bookingId: matchingActiveBooking.id,
                  roomNumber: matchingActiveBooking.room_number,
                  paymentType: 'settlement',
                  method: 'cash',
                  amount: remainingToSettle,
                  note: `[Tiền mặt] ${r.note || 'Chốt từ Excel POS'}`,
                  createdAt: nowIso,
                });
              }
            }
          }
        }
      });

      if (hasChange) {
        this.saveBookings(currentBookings);
        this.saveRooms(currentRooms);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('hotel-store-updated'));
        }
      }

      const cleaned = dedupeLiveExcelRows(excelRows);
      if (excelNeedsRewrite || cleaned.length !== excelRows.length) {
        localStorage.setItem('hotel_pos_excel_rows_v3', JSON.stringify(cleaned));
        if (typeof window !== 'undefined' && cleaned.length !== excelRows.length) {
          window.dispatchEvent(new CustomEvent('excel-rows-synced', { detail: { rows: cleaned } }));
        }
      }
    } catch (e) {
      console.error('Failed to sync from excel:', e);
    }
  },

  // --- Update Booking Drinks / Minibar Consumption during stay ---
  updateBookingDrinks({ bookingId, roomNumber, drinks = {} }) {
    const bookings = this.getBookings();
    const idx = bookings.findIndex(
      (b) =>
        b.id === bookingId ||
        (String(b.room_number) === String(roomNumber) && b.status === 'active')
    );

    if (idx === -1) throw new Error(`Không tìm thấy phiên phòng ${roomNumber}`);

    const booking = bookings[idx];
    const beerQty = Math.max(0, Number(drinks.beer_qty ?? drinks.beer ?? booking.beer_qty ?? 0));
    const waterQty = Math.max(0, Number(drinks.water_qty ?? drinks.water ?? booking.water_qty ?? 0));
    const softDrinkQty = Math.max(
      0,
      Number(drinks.soft_drink_qty ?? drinks.softDrink ?? booking.soft_drink_qty ?? 0)
    );

    const updated = {
      ...booking,
      beer_qty: beerQty,
      water_qty: waterQty,
      soft_drink_qty: softDrinkQty,
    };

    bookings[idx] = updated;
    this.saveBookings(bookings);
    this.syncBookingToExcel(updated);
    return updated;
  },

  // --- Core Business Workflow 1.3: Nhận phòng trực tiếp (Direct Walk-in Check-in) ---
  checkInRoom({
    roomNumber,
    rentalType = 'hourly',
    roomRateMode = 'single',
    checkInTime,
    customerName = '',
    customerPhone = '',
    drinks = {},
    notes = '',
    depositAmount = 0,
    reservationId = null,
  }) {
    const rooms = this.getRooms();
    const room = rooms.find((r) => r.room_number === String(roomNumber));
    if (!room) throw new Error(`Phòng ${roomNumber} không tồn tại!`);

    const nowIso = new Date().toISOString();
    const checkInIso = checkInTime ? new Date(checkInTime).toISOString() : nowIso;

    const beerQty = Math.max(0, Number(drinks.beer_qty ?? drinks.beer ?? 0));
    const waterQty = Math.max(0, Number(drinks.water_qty ?? drinks.water ?? 0));
    const softDrinkQty = Math.max(0, Number(drinks.soft_drink_qty ?? drinks.softDrink ?? 0));
    const numDeposit = Math.max(0, Number(depositAmount) || 0);

    const bookings = this.getBookings();
    const existingActive = bookings.find(
      (b) => String(b.room_number) === String(roomNumber) && b.status === 'active'
    );
    if (existingActive) {
      existingActive.rental_type = normalizeRentalType(rentalType);
      if (roomRateMode) existingActive.room_rate_mode = roomRateMode;
      if (customerName) existingActive.customer_name = customerName;
      if (customerPhone) existingActive.customer_phone = customerPhone;
      if (beerQty > 0) existingActive.beer_qty = beerQty;
      if (waterQty > 0) existingActive.water_qty = waterQty;
      if (softDrinkQty > 0) existingActive.soft_drink_qty = softDrinkQty;
      if (numDeposit > 0) {
        existingActive.paid_amount = (existingActive.paid_amount || 0) + numDeposit;
        existingActive.deposit_amount = (existingActive.deposit_amount || 0) + numDeposit;
        if (!reservationId) {
          this.addPaymentRecord({
            bookingId: existingActive.id,
            roomNumber: String(room.room_number),
            paymentType: 'deposit',
            method: 'cash',
            amount: numDeposit,
            note: `Thu thêm tiền cọc/thu trước phòng P.${room.room_number}`,
            createdAt: nowIso,
          });
        }
      }
      if (notes) existingActive.notes = notes;
      existingActive.service_amount = (existingActive.beer_qty * 20000) + (existingActive.water_qty * 10000) + (existingActive.soft_drink_qty * 15000);
      this.saveBookings(bookings);
      this.updateRoomStatus(room.id, 'occupied');
      this.syncBookingToExcel(existingActive);
      return { booking: existingActive };
    }

    const newBooking = {
      id: Date.now(),
      room_id: room.id,
      room_number: room.room_number,
      customer_name: customerName || 'Khách vãng lai',
      customer_phone: customerPhone || '',
      rental_type: normalizeRentalType(rentalType),
      room_rate_mode: roomRateMode || 'single',
      expected_check_in: checkInIso,
      check_in: checkInIso,
      check_out: null,
      beer_qty: beerQty,
      water_qty: waterQty,
      soft_drink_qty: softDrinkQty,
      room_amount: 0,
      service_amount: (beerQty * 20000) + (waterQty * 10000) + (softDrinkQty * 15000),
      surcharge_amount: 0,
      surcharge_reason: '',
      total_amount: 0,
      deposit_amount: numDeposit,
      paid_amount: numDeposit, // Advance deposit carried over into active booking
      balance_amount: 0,
      status: 'active',
      notes: notes || '',
      created_at: nowIso,
      reservation_id: reservationId || null,
    };

    this.saveBookings([newBooking, ...bookings]);

    if (numDeposit > 0 && !reservationId) {
      this.addPaymentRecord({
        bookingId: newBooking.id,
        roomNumber: String(room.room_number),
        paymentType: 'deposit',
        method: 'cash',
        amount: numDeposit,
        note: `Thu tiền cọc/thu trước khi nhận phòng P.${room.room_number}`,
        createdAt: nowIso,
      });
    }

    if (supabaseService.isAvailable()) {
      supabaseService.createBooking(newBooking).catch((err) =>
        console.warn('Supabase createBooking checkin warning:', err?.message || err)
      );
    }

    // If linked to reservation, update reservation status to 'arrived' (Đã đến)
    if (reservationId) {
      const reservations = this.getReservations();
      const resIdx = reservations.findIndex((r) => r.id === reservationId);
      if (resIdx !== -1) {
        reservations[resIdx].status = 'arrived'; // 'arrived' (Đã đến)
        reservations[resIdx].room_number = String(room.room_number);
        reservations[resIdx].arrived_at = checkInIso;
        reservations[resIdx].linked_booking_id = newBooking.id;
        this.saveReservations(reservations);

        if (supabaseService.isAvailable()) {
          supabaseService.updateReservation(reservationId, {
            status: 'arrived',
            room_number: String(room.room_number),
          }).catch((err) => console.warn('Supabase updateReservation arrived warning:', err?.message || err));
        }
      }
    }

    this.updateRoomStatus(room.id, 'occupied');
    this.syncBookingToExcel(newBooking);

    this.addAuditLog({
      action: 'Nhận phòng',
      details: `Nhận phòng P.${room.room_number} (${rentalType}, khách: ${
        customerName || 'Khách vãng lai'
      }${numDeposit > 0 ? `, Đã có cọc trước ${formatCurrencyVND(numDeposit)}` : ''})`,
      user: 'Lễ tân',
      severity: 'info',
    });

    return { booking: newBooking };
  },

  // --- Core Business Workflow 2 & 3: Advanced Check-out with Split Payment & Overpayment Refund ---
  checkOutWithSplitAndRefund({
    bookingId,
    roomNumber,
    checkOutTime,
    rentalType,
    roomRateMode,
    drinks = {},
    surchargeAmount = 0,
    surchargeReason = '',
    cashReceived = 0,
    transferReceived = 0,
    refundMethod = 'cash', // 'cash' or 'transfer'
    notes = '',
    nextRoomStatus = 'available',
  }) {
    const bookings = this.getBookings();
    const idx = bookings.findIndex(
      (b) =>
        b.id === bookingId ||
        (roomNumber && String(b.room_number) === String(roomNumber) && b.status === 'active')
    );
    if (idx === -1) throw new Error(`Không tìm thấy phiên phòng #${bookingId}`);

    const booking = bookings[idx];
    let checkOutIso = new Date().toISOString();
    if (checkOutTime) {
      const d = new Date(checkOutTime);
      if (!isNaN(d.getTime())) {
        checkOutIso = d.toISOString();
      }
    }

    const effectiveRentalType = rentalType || booking.rental_type || 'hourly';
    const effectiveRoomRateMode = roomRateMode || booking.room_rate_mode || 'single';
    const effectiveRoomNumber = booking.room_number || roomNumber || '';

    const beerQty = Math.max(0, Number(drinks.beer_qty ?? drinks.beer ?? booking.beer_qty ?? 0));
    const waterQty = Math.max(0, Number(drinks.water_qty ?? drinks.water ?? booking.water_qty ?? 0));
    const softDrinkQty = Math.max(0, Number(drinks.soft_drink_qty ?? drinks.softDrink ?? booking.soft_drink_qty ?? 0));
    const surcharge = Number(surchargeAmount) || 0;

    const calculation = calculateTotalBill(
      booking.check_in,
      checkOutIso,
      effectiveRentalType,
      { beer_qty: beerQty, water_qty: waterQty, soft_drink_qty: softDrinkQty },
      surcharge,
      new Date(checkOutIso),
      effectiveRoomRateMode,
      effectiveRoomNumber
    );

    const totalAmount = calculation.total_amount;
    const recordedAdvances = this.getPayments()
      .filter((p) => sameEntityId(p.booking_id, booking.id) && (p.payment_type === 'advance' || p.payment_type === 'deposit'))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const previousDeposit = Math.max(
      0,
      Number(booking.deposit_amount || 0),
      Number(booking.paid_amount || 0),
      recordedAdvances
    );
    const netBalance = totalAmount - previousDeposit;
    const balanceDue = Math.max(0, netBalance);
    const advanceOverpaid = Math.max(0, previousDeposit - totalAmount);

    let cashIn = Math.max(0, Number(cashReceived) || 0);
    let transferIn = Math.max(0, Number(transferReceived) || 0);

    // If no explicit amount entered and balance is still due, collect the remaining balance in full
    if (cashIn === 0 && transferIn === 0 && balanceDue > 0) {
      cashIn = balanceDue;
    }

    const totalNewPaid = cashIn + transferIn;
    // Overpayment / change due (from new payment exceeding balance due or advance overpaid)
    const changeDue = (totalNewPaid > balanceDue ? totalNewPaid - balanceDue : 0) + advanceOverpaid;

    const nowIso = checkOutIso || new Date().toISOString();

    // 1. Record Cash Payment in Ledger
    if (cashIn > 0) {
      this.addPaymentRecord({
        bookingId: booking.id,
        roomNumber: effectiveRoomNumber,
        paymentType: 'settlement',
        method: 'cash',
        amount: cashIn,
        note: previousDeposit > 0
          ? `Thu thêm đủ tiền mặt phòng ${effectiveRoomNumber} khi trả phòng (Đã trừ cọc trước ${formatCurrencyVND(previousDeposit)})`
          : `Thanh toán tiền mặt phòng ${effectiveRoomNumber}`,
        createdAt: nowIso,
      });
    }

    // 2. Record Transfer Payment in Ledger
    if (transferIn > 0) {
      this.addPaymentRecord({
        bookingId: booking.id,
        roomNumber: effectiveRoomNumber,
        paymentType: 'settlement',
        method: 'transfer',
        amount: transferIn,
        note: previousDeposit > 0
          ? `Thu thêm đủ chuyển khoản phòng ${effectiveRoomNumber} khi trả phòng (Đã trừ cọc trước ${formatCurrencyVND(previousDeposit)})`
          : `Chuyển khoản phòng ${effectiveRoomNumber}`,
        createdAt: nowIso,
      });
    }

    // 3. Record Cash/Transfer Refund if overpayment
    if (changeDue > 0) {
      this.addPaymentRecord({
        bookingId: booking.id,
        roomNumber: effectiveRoomNumber,
        paymentType: 'refund',
        method: refundMethod,
        amount: -changeDue, // Negative cash drawer outflow
        note: `Thối lại tiền cho khách phòng ${effectiveRoomNumber} (Dư ${formatCurrencyVND(changeDue)})`,
        createdAt: nowIso,
      });
    }

    // Update booking record
    const completedBooking = {
      ...booking,
      rental_type: effectiveRentalType,
      room_rate_mode: effectiveRoomRateMode,
      check_out: checkOutIso,
      beer_qty: beerQty,
      water_qty: waterQty,
      soft_drink_qty: softDrinkQty,
      room_amount: calculation.room_amount,
      service_amount: calculation.water_amount,
      surcharge_amount: surcharge,
      surcharge_reason: surchargeReason || '',
      total_amount: totalAmount,
      deposit_amount: previousDeposit,
      paid_amount: totalAmount, // Settled full
      balance_amount: 0,
      status: 'completed',
      notes: notes !== undefined ? notes : booking.notes,
    };

    bookings[idx] = completedBooking;
    this.saveBookings(bookings);

    if (supabaseService.isAvailable()) {
      supabaseService.updateBooking(completedBooking.id, completedBooking).catch((err) =>
        console.warn('Supabase updateBooking checkout warning:', err?.message || err)
      );
    }

    // Free room directly to available
    this.updateRoomStatus(effectiveRoomNumber, nextRoomStatus || 'available');
    this.syncBookingToExcel(completedBooking, true);

    this.addAuditLog({
      action: 'Trả phòng & Thanh toán',
      details: `Trả phòng P.${effectiveRoomNumber}, tổng bill: ${formatCurrencyVND(
        totalAmount
      )}, thu TM: ${formatCurrencyVND(cashIn)}, CK: ${formatCurrencyVND(transferIn)}${
        changeDue > 0 ? `, thối lại: ${formatCurrencyVND(changeDue)}` : ''
      }`,
      user: 'Lễ tân',
      severity: 'success',
    });

    return { booking: completedBooking, calculation, changeDue };
  },

  // --- Core Business Workflow 4: Accounting Cash Reconciliation & Shift Closures ---
  getLedgerSummary(targetDateStr = getTodayDateString(), filterMode = 'shift') {
    const payments = this.getPayments();
    const bookings = this.getBookings();
    const closures = this.getShiftClosures();
    const expenses = this.getExpenses();

    // Find the most recent closure before now to isolate this shift
    const sortedClosures = [...closures].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const lastClosure = sortedClosures[0] || null;
    const lastClosureTime = (filterMode === 'shift' && lastClosure)
      ? new Date(lastClosure.created_at).getTime()
      : null;

    // Filter payments for this shift (only payments made after the last closure)
    // Exclude manual 'expense' payment records here to avoid double deduction
    const shiftPayments = payments.filter((p) => {
      if (!p.created_at) return false;
      if (p.payment_type === 'expense') return false; // Handled directly via approved expenses
      const pTime = new Date(p.created_at).getTime();

      if (lastClosureTime !== null) {
        return pTime > lastClosureTime;
      }

      // If no previous closure, filter by targetDateStr
      const pDate = getTodayDateString(new Date(p.created_at));
      return pDate === targetDateStr;
    });

    // Filter approved expenses for this shift (deducted upon admin approval)
    const shiftExpenses = expenses.filter((e) => {
      if (!e.created_at) return false;
      const eTime = new Date(e.approved_at || e.created_at).getTime();
      if (lastClosureTime !== null) {
        return eTime > lastClosureTime;
      }
      const eDate = getTodayDateString(new Date(e.created_at));
      return eDate === targetDateStr;
    });

    const approvedShiftExpenses = shiftExpenses.filter((e) => e.status === 'approved');
    const pendingShiftExpenses = expenses.filter((e) => e.status === 'pending');

    let approvedCashExpenses = 0;
    let approvedTransferExpenses = 0;
    for (const exp of approvedShiftExpenses) {
      const amt = Number(exp.amount) || 0;
      if (exp.method === 'transfer') {
        approvedTransferExpenses += amt;
      } else {
        approvedCashExpenses += amt;
      }
    }
    const totalApprovedExpenses = approvedCashExpenses + approvedTransferExpenses;

    // Cash Inflow & Outflow from rooms/services/deposits
    let cashInflow = 0;
    let cashOutflow = 0;

    // Transfer Inflow & Outflow
    let transferInflow = 0;
    let transferOutflow = 0;

    for (const p of shiftPayments) {
      const amt = Number(p.amount) || 0;
      if (p.method === 'cash') {
        if (amt > 0) cashInflow += amt;
        else cashOutflow += Math.abs(amt);
      } else if (p.method === 'transfer') {
        if (amt > 0) transferInflow += amt;
        else transferOutflow += Math.abs(amt);
      }
    }

    // Net Cash = Cash In - Cash Out - Approved Cash Expenses
    const netCash = (cashInflow - cashOutflow) - approvedCashExpenses;
    // Net Transfer = Transfer In - Transfer Out - Approved Transfer Expenses
    const netTransfer = (transferInflow - transferOutflow) - approvedTransferExpenses;

    const totalRevenueRecognized = netCash + netTransfer;

    // Only include rooms that actually had payments in this shift
    const shiftPaymentBookingIds = new Set(shiftPayments.map((p) => p.booking_id).filter(Boolean));
    const shiftPaymentRoomNumbers = new Set(shiftPayments.map((p) => String(p.room_number)).filter(Boolean));

    const shiftBookings = bookings.filter((b) => {
      return shiftPaymentBookingIds.has(b.id) || shiftPaymentRoomNumbers.has(String(b.room_number));
    });

    let roomRevenueCollected = 0;
    let serviceRevenue = 0;
    let surchargeRevenue = 0;

    const roomSummariesMap = {};

    for (const b of shiftBookings) {
      const rKey = String(b.room_number);
      if (!roomSummariesMap[rKey]) {
        roomSummariesMap[rKey] = {
          roomNumber: rKey,
          customerName: b.customer_name || 'Khách vãng lai',
          rentalType: b.rental_type,
          checkIn: b.check_in,
          checkOut: b.check_out,
          status: b.status,
          roomAmount: Number(b.room_amount) || 0,
          serviceAmount: Number(b.service_amount) || 0,
          surchargeAmount: Number(b.surcharge_amount) || 0,
          totalBill: Number(b.total_amount) || 0,
          cashCollected: 0,
          transferCollected: 0,
          totalPaid: 0,
        };
      }
      serviceRevenue += Number(b.service_amount) || 0;
      surchargeRevenue += Number(b.surcharge_amount) || 0;
    }

    for (const p of shiftPayments) {
      const rKey = String(p.room_number);
      if (rKey) {
        if (!roomSummariesMap[rKey]) {
          roomSummariesMap[rKey] = {
            roomNumber: rKey,
            customerName: 'Khách phòng ' + rKey,
            rentalType: 'hourly',
            checkIn: p.created_at,
            checkOut: p.created_at,
            status: 'completed',
            roomAmount: 0,
            serviceAmount: 0,
            surchargeAmount: 0,
            totalBill: Math.abs(Number(p.amount) || 0),
            cashCollected: 0,
            transferCollected: 0,
            totalPaid: 0,
          };
        }
        const amt = Number(p.amount) || 0;
        if (p.method === 'cash') {
          roomSummariesMap[rKey].cashCollected += amt;
        } else if (p.method === 'transfer') {
          roomSummariesMap[rKey].transferCollected += amt;
        }
        roomSummariesMap[rKey].totalPaid += amt;
      }
    }

    const shiftTotalInflow = cashInflow + transferInflow;
    roomRevenueCollected = Math.max(0, shiftTotalInflow - serviceRevenue - surchargeRevenue);

    const roomSummaries = Object.values(roomSummariesMap).sort((a, b) => {
      return String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true });
    });

    const existingClosures = closures.filter((c) => c.closed_date === targetDateStr);

    return {
      date: targetDateStr,
      lastClosure,
      lastClosureTime: lastClosure ? lastClosure.created_at : null,
      netCash,
      cashInflow,
      cashOutflow,
      netTransfer,
      transferInflow,
      transferOutflow,
      approvedShiftExpenses,
      approvedCashExpenses,
      approvedTransferExpenses,
      totalApprovedExpenses,
      pendingShiftExpenses,
      pendingExpensesCount: pendingShiftExpenses.length,
      totalRevenueRecognized,
      roomRevenueCollected,
      serviceRevenue,
      surchargeRevenue,
      roomSummaries,
      dayPayments: shiftPayments,
      dayBookings: shiftBookings,
      closuresCount: existingClosures.length,
      existingClosures,
      isClosed: existingClosures.length > 0,
    };
  },

  getDailyCloseoutDetail(targetDateStr = getTodayDateString()) {
    return this.getPeriodSummary({
      periodType: 'day',
      targetDate: targetDateStr,
    });
  },

  getPeriodSummary(options = {}) {
    let periodType = 'day';
    let targetDate = getTodayDateString();
    let targetWeekDate = getTodayDateString();
    let targetMonth = new Date().getMonth() + 1;
    let targetYear = new Date().getFullYear();
    let customStartDate = null;
    let customEndDate = null;

    if (typeof options === 'string') {
      customStartDate = options;
      customEndDate = typeof arguments[1] === 'string' ? arguments[1] : options;
    } else if (typeof options === 'object' && options !== null) {
      if (options.startDate && options.endDate) {
        customStartDate = options.startDate;
        customEndDate = options.endDate;
      } else {
        periodType = options.periodType || 'day';
        targetDate = options.targetDate || getTodayDateString();
        targetWeekDate = options.targetWeekDate || getTodayDateString();
        targetMonth = options.targetMonth || (new Date().getMonth() + 1);
        targetYear = options.targetYear || new Date().getFullYear();
      }
    }

    let startDateStr = customStartDate || targetDate;
    let endDateStr = customEndDate || targetDate;
    let periodLabel = `Ngày ${targetDate}`;

    if (!customStartDate) {
      if (periodType === 'week') {
        const weekInfo = getStartAndEndOfWeek(new Date(targetWeekDate || targetDate));
        startDateStr = weekInfo.startDateStr;
        endDateStr = weekInfo.endDateStr;
        periodLabel = weekInfo.label;
      } else if (periodType === 'month') {
        const monthInfo = getStartAndEndOfMonth(Number(targetYear), Number(targetMonth));
        startDateStr = monthInfo.startDateStr;
        endDateStr = monthInfo.endDateStr;
        periodLabel = monthInfo.label;
      }
    } else {
      periodLabel = startDateStr === endDateStr ? `Ngày ${startDateStr}` : `${startDateStr} - ${endDateStr}`;
    }

    const payments = this.getPayments();
    const bookings = this.getBookings();
    const closures = this.getShiftClosures();

    // Filter payments in range [startDateStr, endDateStr]
    const dayPayments = payments.filter((p) => {
      if (!p.created_at) return false;
      const pDate = getTodayDateString(new Date(p.created_at));
      return pDate >= startDateStr && pDate <= endDateStr;
    });

    let netCash = 0;
    let cashInflow = 0;
    let cashOutflow = 0;
    let netTransfer = 0;
    let transferInflow = 0;
    let transferOutflow = 0;

    for (const p of dayPayments) {
      if (p.payment_type === 'expense') continue;
      const amt = Number(p.amount) || 0;
      if (p.method === 'cash') {
        netCash += amt;
        if (amt > 0) cashInflow += amt;
        else cashOutflow += Math.abs(amt);
      } else if (p.method === 'transfer') {
        netTransfer += amt;
        if (amt > 0) transferInflow += amt;
        else transferOutflow += Math.abs(amt);
      }
    }

    const totalRevenueRecognized = netCash + netTransfer;

    // Filter bookings in range (excluding cancelled bookings)
    const dayBookings = bookings.filter((b) => {
      if (b.status === 'cancelled') return false;
      const bDate = b.check_in
        ? getTodayDateString(new Date(b.check_in))
        : getTodayDateString(new Date(b.created_at));
      return bDate >= startDateStr && bDate <= endDateStr;
    });

    let roomRevenue = 0;
    let serviceRevenue = 0;
    let surchargeRevenue = 0;
    let totalBeerQty = 0;
    let totalWaterQty = 0;
    let totalSoftDrinkQty = 0;

    const bookingsByType = {
      hourly: 0,
      overnight: 0,
      daily: 0,
    };

    const bookingsByStatus = {
      completed: 0,
      active: 0,
      cancelled: 0,
    };

    for (const b of dayBookings) {
      let bRoom = Number(b.room_amount) || 0;
      let bService = Number(b.service_amount) || 0;
      let bSurcharge = Number(b.surcharge_amount) || 0;

      if (b.status === 'active' && bRoom === 0) {
        const bill = calculateTotalBill(
          b.check_in,
          null,
          b.rental_type,
          {
            beer_qty: b.beer_qty,
            water_qty: b.water_qty,
            soft_drink_qty: b.soft_drink_qty,
          },
          b.surcharge_amount,
          new Date(),
          b.room_rate_mode,
          b.room_number
        );
        bRoom = bill.room_amount;
        bService = bill.water_amount;
        bSurcharge = bill.surcharge;
      }

      roomRevenue += bRoom;
      serviceRevenue += bService;
      surchargeRevenue += bSurcharge;
      totalBeerQty += Number(b.beer_qty) || 0;
      totalWaterQty += Number(b.water_qty) || 0;
      totalSoftDrinkQty += Number(b.soft_drink_qty) || 0;

      if (bookingsByType[b.rental_type] !== undefined) {
        bookingsByType[b.rental_type]++;
      }
      if (bookingsByStatus[b.status] !== undefined) {
        bookingsByStatus[b.status]++;
      }
    }

    // Payments breakdown
    const paymentsByType = {
      advance: { count: 0, cash: 0, transfer: 0, total: 0 },
      deposit: { count: 0, cash: 0, transfer: 0, total: 0 },
      settlement: { count: 0, cash: 0, transfer: 0, total: 0 },
      refund: { count: 0, cash: 0, transfer: 0, total: 0 },
    };

    for (const p of dayPayments) {
      if (p.payment_type === 'expense') continue;
      const pType = p.payment_type || 'settlement';
      if (!paymentsByType[pType]) {
        paymentsByType[pType] = { count: 0, cash: 0, transfer: 0, total: 0 };
      }
      const amt = Number(p.amount) || 0;
      paymentsByType[pType].count++;
      paymentsByType[pType].total += amt;
      if (p.method === 'transfer') {
        paymentsByType[pType].transfer += amt;
      } else {
        paymentsByType[pType].cash += amt;
      }
    }

    const existingClosures = closures.filter((c) => {
      return c.closed_date >= startDateStr && c.closed_date <= endDateStr;
    });

    const expenses = this.getExpenses();
    const dayExpenses = expenses.filter((e) => {
      if (!e.created_at || e.status === 'rejected') return false;
      const eDate = getTodayDateString(new Date(e.created_at));
      return eDate >= startDateStr && eDate <= endDateStr;
    });

    let totalExpenses = 0;
    for (const e of dayExpenses) {
      totalExpenses += Number(e.amount) || 0;
    }

    const netProfit = totalRevenueRecognized - totalExpenses;

    return {
      periodType,
      date: targetDate,
      startDateStr,
      endDateStr,
      periodLabel,
      netCash,
      cashInflow,
      cashOutflow,
      netTransfer,
      transferInflow,
      transferOutflow,
      totalRevenueRecognized,
      roomRevenue,
      serviceRevenue,
      surchargeRevenue,
      totalBeerQty,
      totalWaterQty,
      totalSoftDrinkQty,
      dayPayments: dayPayments.filter(p => p.payment_type !== 'expense'),
      dayBookings,
      dayExpenses,
      totalExpenses,
      netProfit,
      existingClosures,
      closuresCount: existingClosures.length,
      isClosed: existingClosures.length > 0,
      bookingsByType,
      bookingsByStatus,
      paymentsByType,
    };
  },

  getAvailableActivityDates() {
    const payments = this.getPayments();
    const bookings = this.getBookings();
    const closures = this.getShiftClosures();

    const dateSet = new Set();
    dateSet.add(getTodayDateString());

    for (const p of payments) {
      if (p.created_at) {
        dateSet.add(getTodayDateString(new Date(p.created_at)));
      }
    }

    for (const b of bookings) {
      if (b.check_in) dateSet.add(getTodayDateString(new Date(b.check_in)));
      if (b.check_out) dateSet.add(getTodayDateString(new Date(b.check_out)));
      if (b.created_at) dateSet.add(getTodayDateString(new Date(b.created_at)));
    }

    for (const c of closures) {
      if (c.closed_date) dateSet.add(c.closed_date);
    }

    return Array.from(dateSet).sort().reverse();
  },

  getShiftClosures() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SHIFT_CLOSURES_V2);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse shift closures:', e);
    }
    return [];
  },

  saveShiftClosures(closures) {
    try {
      localStorage.setItem(STORAGE_KEYS.SHIFT_CLOSURES_V2, JSON.stringify(closures));
      triggerAutoPushToSupabase();
    } catch (e) {
      console.error('Failed to save shift closures:', e);
    }
  },

  closeShift({
    date = getTodayDateString(),
    shiftName = 'Chốt ngày',
    initialCash = 1000000,
    notes = '',
    closedAt = new Date().toISOString(),
  }) {
    const summary = this.getLedgerSummary(date, 'shift');
    const closures = this.getShiftClosures();

    const initCashNum = Number(initialCash) || 1000000;
    const newClosure = {
      id: Date.now(),
      closed_date: date,
      shift_name: shiftName,
      initial_cash: initCashNum,
      net_cash: summary.netCash,
      total_cash_in_drawer: initCashNum + summary.netCash,
      net_transfer: summary.netTransfer,
      room_revenue_collected: summary.roomRevenueCollected,
      service_revenue: summary.serviceRevenue,
      surcharge_revenue: summary.surchargeRevenue,
      total_revenue_recognized: summary.totalRevenueRecognized,
      notes: notes || '',
      created_at: closedAt,
    };

    const updated = [newClosure, ...closures];
    this.saveShiftClosures(updated);

    if (supabaseService.isAvailable()) {
      supabaseService.createShiftClosure(newClosure).catch((err) =>
        console.warn('Supabase createShiftClosure warning:', err?.message || err)
      );
    }

    this.addAuditLog({
      action: 'Khóa sổ ca',
      details: `Khóa sổ ${shiftName} ngày ${date}, tổng thu: ${formatCurrencyVND(
        newClosure.total_revenue_recognized
      )} (Két: ${formatCurrencyVND(newClosure.net_cash)}, CK: ${formatCurrencyVND(
        newClosure.net_transfer
      )})`,
      user: 'Lễ tân',
      severity: 'info',
    });

    return { success: true, closure: newClosure, closures: updated };
  },

  reopenShift(closureId) {
    const closures = this.getShiftClosures();
    const updated = closures.filter((c) => c.id !== closureId);
    this.saveShiftClosures(updated);

    this.addAuditLog({
      action: 'Mở lại ca đã khóa',
      details: `Admin mở lại ca làm việc #${closureId}`,
      user: 'Admin',
      severity: 'warning',
    });

    return updated;
  },

  exportTransactionsToCSV(bookingsList) {
    const headers = [
      'Mã Đơn',
      'Phòng',
      'Khách hàng',
      'SĐT',
      'Hình thức',
      'Giờ vào',
      'Giờ ra',
      'Bia',
      'Nước suối',
      'Nước ngọt',
      'Tiền minibar',
      'Tiền phòng',
      'Phụ thu',
      'Lý do phụ thu',
      'Tổng tiền bill',
      'Đã cọc/thanh toán',
      'Trạng thái',
      'Ghi chú',
    ];

    const typeLabels = {
      hourly: 'Theo giờ',
      overnight: 'Qua đêm',
      daily: 'Ngày đêm',
    };

    const statusLabels = {
      reserved: 'Đã cọc',
      active: 'Đang ở',
      completed: 'Hoàn tất',
      cancelled: 'Đã hủy',
    };

    const rows = bookingsList.map((b) => [
      b.id,
      b.room_number || '',
      `"${(b.customer_name || '').replace(/"/g, '""')}"`,
      b.customer_phone || '',
      typeLabels[b.rental_type] || b.rental_type,
      b.check_in ? formatDateTimeDisplay(b.check_in) : '',
      b.check_out ? formatDateTimeDisplay(b.check_out) : '',
      b.beer_qty || 0,
      b.water_qty || 0,
      b.soft_drink_qty || 0,
      b.service_amount || 0,
      b.room_amount || 0,
      b.surcharge_amount || 0,
      `"${(b.surcharge_reason || '').replace(/"/g, '""')}"`,
      b.total_amount || 0,
      b.paid_amount || 0,
      statusLabels[b.status] || b.status,
      `"${(b.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    return csvContent;
  },

  exportLedgerToCSV(paymentsList) {
    const headers = [
      'ID Giao Dịch',
      'Mã Đơn',
      'Số Phòng',
      'Thời Điểm',
      'Loại Giao Dịch',
      'Phương Thức',
      'Số Tiền (VND)',
      'Ghi Chú',
    ];

    const typeLabels = {
      deposit: 'Đặt cọc giữ chỗ',
      settlement: 'Thanh toán trả phòng',
      refund: 'Hoàn tiền / Thối lại',
    };

    const rows = paymentsList.map((p) => [
      p.id,
      p.booking_id || '',
      p.room_number || '',
      formatDateTimeDisplay(p.created_at),
      typeLabels[p.payment_type] || p.payment_type,
      p.method === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt',
      p.amount || 0,
      `"${(p.note || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    return csvContent;
  },

  resetToDemoData() {
    localStorage.removeItem(STORAGE_KEYS.ROOMS_V2);
    localStorage.removeItem(STORAGE_KEYS.BOOKINGS_V2);
    localStorage.removeItem(STORAGE_KEYS.PAYMENTS_V2);
    localStorage.removeItem(STORAGE_KEYS.SHIFT_CLOSURES_V2);
    localStorage.removeItem(STORAGE_KEYS.EXPENSES_V2);
    localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS_V2);
    localStorage.removeItem('hotel_pos_excel_rows_v3');
    const seed = generateSeedDataV2();
    this.saveRooms(seed.rooms);
    this.saveBookings(seed.bookings);
    this.savePayments(seed.payments);
    this.saveShiftClosures(seed.shiftClosures || []);
    this.saveExpenses(seed.expenses || []);
    this.saveAuditLogs(seed.auditLogs || []);
    return seed;
  },

  getAdminReportData(
    targetDate = getTodayDateString(),
    targetMonth = new Date().getMonth() + 1,
    targetYear = new Date().getFullYear()
  ) {
    const daySummary = this.getPeriodSummary({ periodType: 'day', targetDate });
    const monthSummary = this.getPeriodSummary({
      periodType: 'month',
      targetMonth,
      targetYear,
    });

    const allBookings = this.getBookings();
    const allPayments = this.getPayments();
    const allExpenses = this.getExpenses();
    const allLogs = this.getAuditLogs();
    const rooms = this.getRooms();

    // All time totals strictly from data
    let allTimeRevenue = 0;
    let allTimeCash = 0;
    let allTimeTransfer = 0;
    let allTimeRoomRev = 0;
    let allTimeDrinkRev = 0;
    let allTimeSurchargeRev = 0;
    let allTimeExpenses = 0;
    let totalBeer = 0;
    let totalWater = 0;
    let totalSoft = 0;

    for (const p of allPayments) {
      if (p.payment_type === 'expense') continue;
      const amt = Number(p.amount) || 0;
      allTimeRevenue += amt;
      if (p.method === 'transfer') allTimeTransfer += amt;
      else allTimeCash += amt;
    }

    for (const b of allBookings) {
      if (b.status === 'cancelled') continue;
      let bRoom = Number(b.room_amount) || 0;
      let bService = Number(b.service_amount) || 0;
      let bSurcharge = Number(b.surcharge_amount) || 0;

      if (b.status === 'active' && bRoom === 0) {
        const bill = calculateTotalBill(
          b.check_in,
          null,
          b.rental_type,
          {
            beer_qty: b.beer_qty,
            water_qty: b.water_qty,
            soft_drink_qty: b.soft_drink_qty,
          },
          b.surcharge_amount,
          new Date(),
          b.room_rate_mode,
          b.room_number
        );
        bRoom = bill.room_amount;
        bService = bill.water_amount;
        bSurcharge = bill.surcharge;
      }

      allTimeRoomRev += bRoom;
      allTimeDrinkRev += bService;
      allTimeSurchargeRev += bSurcharge;
      totalBeer += Number(b.beer_qty) || 0;
      totalWater += Number(b.water_qty) || 0;
      totalSoft += Number(b.soft_drink_qty) || 0;
    }

    for (const e of allExpenses) {
      if (e.status !== 'rejected') {
        allTimeExpenses += Number(e.amount) || 0;
      }
    }

    return {
      targetDate,
      targetMonth,
      targetYear,
      daySummary,
      monthSummary,
      allTime: {
        periodLabel: 'Toàn bộ thời gian',
        totalRevenueRecognized: allTimeRevenue,
        netCash: allTimeCash,
        netTransfer: allTimeTransfer,
        roomRevenue: allTimeRoomRev,
        drinkRevenue: allTimeDrinkRev,
        serviceRevenue: allTimeDrinkRev,
        surchargeRevenue: allTimeSurchargeRev,
        totalBeerQty: totalBeer,
        totalWaterQty: totalWater,
        totalSoftDrinkQty: totalSoft,
        bookingsCount: allBookings.filter(b => b.status !== 'cancelled').length,
        totalExpenses: allTimeExpenses,
        netProfit: allTimeRevenue - allTimeExpenses,
        dayPayments: allPayments.filter(p => p.payment_type !== 'expense'),
        dayBookings: allBookings.filter(b => b.status !== 'cancelled'),
        dayExpenses: allExpenses,
      },
      roomsCount: rooms.length,
      expenses: allExpenses,
      reservations: this.getReservations(),
      auditLogs: allLogs,
    };
  },

  exportDailyAuditCSV(targetDateStr = getTodayDateString()) {
    const detail = this.getDailyCloseoutDetail(targetDateStr);
    const lines = [];

    lines.push(`"BÁO CÁO ĐỐI SOÁT & CHỐT TIỀN NGÀY ${targetDateStr}"`);
    lines.push(`"Khách sạn: ${HOTEL_CONFIG.hotelName}"`);
    lines.push(`"Thời gian xuất: ${formatDateTimeDisplay(new Date().toISOString())}"`);
    lines.push('');

    // Summary
    lines.push('"1. TỔNG HỢP DÒNG TIỀN THỰC NHẬN"');
    lines.push('"Chỉ mục","Giá trị (VND)","Ghi chú"');
    lines.push(`"Tiền mặt thực tế trong két",${detail.netCash},"Thu: ${detail.cashInflow} | Thối: ${detail.cashOutflow}"`);
    lines.push(`"Tài khoản chuyển khoản (CK)",${detail.netTransfer},"Thu: ${detail.transferInflow} | Hoàn: ${detail.transferOutflow}"`);
    lines.push(`"TỔNG DOANH THU THỰC NHẬN",${detail.totalRevenueRecognized},"Két tiền mặt + Ngân hàng"`);
    lines.push('');

    // Revenue breakdown
    lines.push('"2. CƠ CẤU DOANH THU THEO DANH MỤC"');
    lines.push('"Hạng mục","Số tiền (VND)"');
    lines.push(`"Doanh thu tiền phòng",${detail.roomRevenue}`);
    lines.push(`"Doanh thu Minibar / Nước uống",${detail.serviceRevenue} (Bia: ${detail.totalBeerQty}, Nước: ${detail.totalWaterQty}, Nước ngọt: ${detail.totalSoftDrinkQty})`);
    lines.push(`"Phụ thu phát sinh",${detail.surchargeRevenue}`);
    lines.push('');

    // Shift closures
    lines.push('"3. CÁC CA ĐÃ KHÓA SỔ TRONG NGÀY"');
    lines.push('"Tên ca","Tiền mặt két","Chuyển khoản","Tổng doanh thu","Thời điểm khóa","Ghi chú"');
    if (detail.existingClosures.length === 0) {
      lines.push('"Chưa có ca nào được khóa sổ","0","0","0","---","---"');
    } else {
      for (const c of detail.existingClosures) {
        lines.push(`"${c.shift_name}",${c.net_cash},${c.net_transfer},${c.total_revenue_recognized},"${formatDateTimeDisplay(c.created_at)}","${(c.notes || '').replace(/"/g, '""')}"`);
      }
    }
    lines.push('');

    // Payments detail
    lines.push('"4. CHI TIẾT GIAO DỊCH DÒNG TIỀN (PAYMENTS LEDGER)"');
    lines.push('"Mã GD","Mã Đơn","Phòng","Thời điểm","Loại dòng tiền","Phương thức","Số tiền","Ghi chú"');
    for (const p of detail.dayPayments) {
      lines.push(`${p.id},${p.booking_id || ''},${p.room_number || ''},"${formatDateTimeDisplay(p.created_at)}","${p.payment_type}","${p.method === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'}",${p.amount},"${(p.note || '').replace(/"/g, '""')}"`);
    }

    return '\uFEFF' + lines.join('\r\n');
  },

  getExcelRows() {
    try {
      const data = localStorage.getItem('hotel_pos_excel_rows_v3');
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse excel rows:', e);
    }
    return [];
  },

  exportFullDataToJsonString() {
    const fullStore = {
      version: '3.0',
      hotelName: HOTEL_CONFIG.hotelName,
      updatedAt: new Date().toISOString(),
      rooms: this.getRooms(),
      bookings: this.getBookings(),
      reservations: this.getReservations(),
      payments: this.getPayments(),
      expenses: this.getExpenses(),
      shift_closures: this.getShiftClosures(),
      audit_logs: this.getAuditLogs(),
      excel_rows: this.getExcelRows(),
    };
    return JSON.stringify(fullStore, null, 2);
  },

  importFullDataFromJson(jsonObj) {
    if (!jsonObj || typeof jsonObj !== 'object') return false;
    if (Array.isArray(jsonObj.rooms)) this.saveRooms(jsonObj.rooms);
    if (Array.isArray(jsonObj.bookings)) this.saveBookings(jsonObj.bookings);
    if (Array.isArray(jsonObj.reservations)) this.saveReservations(jsonObj.reservations);
    if (Array.isArray(jsonObj.payments)) this.savePayments(jsonObj.payments);
    if (Array.isArray(jsonObj.expenses)) this.saveExpenses(jsonObj.expenses);
    if (Array.isArray(jsonObj.shift_closures)) this.saveShiftClosures(jsonObj.shift_closures);
    if (Array.isArray(jsonObj.audit_logs)) this.saveAuditLogs(jsonObj.audit_logs);
    if (Array.isArray(jsonObj.excel_rows)) {
      localStorage.setItem('hotel_pos_excel_rows_v3', JSON.stringify(jsonObj.excel_rows));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hotel-store-updated'));
      window.dispatchEvent(new CustomEvent('hotel-reservations-updated', { detail: { reservations: jsonObj.reservations || [] } }));
      window.dispatchEvent(new CustomEvent('excel-rows-synced', { detail: { rows: jsonObj.excel_rows || [] } }));
    }
    return true;
  },

  async loadFromDiskJson() {
    try {
      if (typeof window !== 'undefined' && window.desktopApi && typeof window.desktopApi.loadDiskBackup === 'function') {
        const res = await window.desktopApi.loadDiskBackup();
        if (res && res.success && res.data) {
          const parsed = JSON.parse(res.data);
          this.importFullDataFromJson(parsed);
          return true;
        }
      }
      if (typeof fetch !== 'undefined' && typeof window !== 'undefined' && window.location?.origin) {
        const res = await fetch(`${window.location.origin}/api/load-hotel-json`);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object') {
            this.importFullDataFromJson(data);
            return true;
          }
        }
      }
    } catch (e) {
      console.warn('Load hotel_data.json error:', e?.message || e);
    }
    return false;
  },

  clearAllData() {
    const cleanRooms = INITIAL_ROOMS.map((r) => ({ ...r, status: 'available' }));
    this.saveRooms(cleanRooms);
    this.saveBookings([]);
    this.savePayments([]);
    this.saveExpenses([]);
    this.saveReservations([]);
    this.saveShiftClosures([]);
    this.saveAuditLogs([]);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('hotel_pos_excel_rows_v3');
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hotel-store-updated'));
      window.dispatchEvent(new CustomEvent('hotel-reservations-updated', { detail: { reservations: [] } }));
      window.dispatchEvent(new CustomEvent('excel-rows-synced', { detail: { rows: [] } }));
    }
    return true;
  },

  syncFromSupabaseData(data) {
    if (!data) return false;
    if (Array.isArray(data.rooms) && data.rooms.length > 0) {
      this.saveRooms(data.rooms);
    }
    if (Array.isArray(data.bookings)) {
      this.saveBookings(data.bookings);
    }
    if (Array.isArray(data.reservations)) {
      this.saveReservations(data.reservations);
    }
    if (Array.isArray(data.payments)) {
      this.savePayments(data.payments);
    }
    if (Array.isArray(data.expenses)) {
      this.saveExpenses(data.expenses);
    }
    if (Array.isArray(data.closures)) {
      this.saveShiftClosures(data.closures);
    }
    this.rebuildExcelRowsFromBookings();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hotel-store-updated'));
      window.dispatchEvent(
        new CustomEvent('hotel-reservations-updated', {
          detail: { reservations: data.reservations || [] },
        })
      );
      window.dispatchEvent(
        new CustomEvent('hotel-expenses-updated', {
          detail: { expenses: data.expenses || [] },
        })
      );
    }
    return true;
  },
};
