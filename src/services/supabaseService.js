import { supabase, isSupabaseConfigured } from './supabaseClient.js';

// Allowed fields mapping strictly to Supabase Database Tables
const BOOKING_COLUMNS = new Set([
  'id', 'room_id', 'room_number', 'customer_name', 'customer_phone', 'rental_type',
  'room_rate_mode', 'expected_check_in', 'check_in', 'check_out', 'beer_qty',
  'water_qty', 'soft_drink_qty', 'room_amount', 'service_amount', 'surcharge_amount',
  'surcharge_reason', 'total_amount', 'paid_amount', 'balance_amount', 'payment_method',
  'status', 'notes', 'created_at', 'updated_at'
]);

const RESERVATION_COLUMNS = new Set([
  'id', 'room_id', 'room_number', 'customer_name', 'customer_phone', 'rental_type',
  'expected_check_in', 'deposit_amount', 'deposit_method', 'status', 'notes',
  'created_at', 'updated_at'
]);

const PAYMENT_COLUMNS = new Set([
  'id', 'booking_id', 'reservation_id', 'room_number', 'payment_type', 'method',
  'amount', 'note', 'created_at'
]);

const EXPENSE_COLUMNS = new Set([
  'id', 'amount', 'reason', 'category', 'method', 'requester', 'status',
  'approved_by', 'approved_at', 'reject_reason', 'notes', 'created_at', 'updated_at'
]);

const SHIFT_CLOSURE_COLUMNS = new Set([
  'id', 'closed_date', 'shift_name', 'net_cash', 'net_transfer',
  'total_revenue_recognized', 'cash_on_hand', 'cash_difference', 'notes',
  'created_at', 'created_by'
]);

const AUDIT_LOG_COLUMNS = new Set([
  'id', 'action', 'details', 'user_name', 'severity', 'created_at'
]);

const ROOM_COLUMNS = new Set([
  'id', 'room_number', 'floor', 'room_type', 'is_double_room', 'hourly_rate_base',
  'hourly_rate_extra', 'overnight_single_rate', 'overnight_double_rate',
  'daily_single_rate', 'daily_double_rate', 'status', 'notes', 'created_at', 'updated_at'
]);

function filterObjectByKeys(obj, allowedKeys) {
  if (!obj || typeof obj !== 'object') return obj;
  const filtered = {};
  for (const key of Object.keys(obj)) {
    if (allowedKeys.has(key)) {
      filtered[key] = obj[key];
    }
  }
  return filtered;
}

export function sanitizeBooking(b) {
  if (!b) return null;
  return filterObjectByKeys(b, BOOKING_COLUMNS);
}

export function sanitizeReservation(r) {
  if (!r) return null;
  const cleaned = filterObjectByKeys(r, RESERVATION_COLUMNS);
  if (!cleaned.expected_check_in) {
    cleaned.expected_check_in = new Date().toISOString();
  }
  return cleaned;
}

export function sanitizePayment(p) {
  if (!p) return null;
  return filterObjectByKeys(p, PAYMENT_COLUMNS);
}

export function sanitizeExpense(e) {
  if (!e) return null;
  return filterObjectByKeys(e, EXPENSE_COLUMNS);
}

export function sanitizeShiftClosure(c) {
  if (!c) return null;
  return filterObjectByKeys(c, SHIFT_CLOSURE_COLUMNS);
}

export function sanitizeAuditLog(l) {
  if (!l) return null;
  const copy = { ...l };
  if (copy.user && !copy.user_name) {
    copy.user_name = copy.user;
  }
  return filterObjectByKeys(copy, AUDIT_LOG_COLUMNS);
}

export function sanitizeRoom(r) {
  if (!r) return null;
  return filterObjectByKeys(r, ROOM_COLUMNS);
}

export const ENABLE_SUPABASE_SYNC = false;

export const supabaseService = {
  isAvailable() {
    return ENABLE_SUPABASE_SYNC && isSupabaseConfigured && Boolean(supabase);
  },

  // ---------------------------------------------------------------------------
  // 0. INIT & AUTO-SEED IF EMPTY
  // ---------------------------------------------------------------------------
  async initAndSeedIfNeeded(defaultRooms = []) {
    if (!this.isAvailable()) return null;
    try {
      const { data: existingRooms, error } = await supabase
        .from('rooms')
        .select('id, room_number')
        .limit(20);

      if (error) {
        console.warn('Supabase query rooms check:', error.message);
        return false;
      }

      if (!existingRooms || existingRooms.length === 0) {
        if (defaultRooms.length > 0) {
          const formatted = defaultRooms.map((r) =>
            sanitizeRoom({
              room_number: String(r.room_number),
              floor: r.floor || Number(String(r.room_number)[0]) || 1,
              room_type: r.room_type || 'Phòng Đơn',
              is_double_room: Boolean(r.is_double_room),
              status: 'available',
            })
          );
          await supabase.from('rooms').upsert(formatted, { onConflict: 'room_number' });
        }
      }
      return true;
    } catch (e) {
      console.warn('Supabase auto-seed warning:', e);
      return false;
    }
  },

  // ---------------------------------------------------------------------------
  // 1. ROOMS (PHÒNG)
  // ---------------------------------------------------------------------------
  async fetchRooms() {
    if (!this.isAvailable()) return null;
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('room_number', { ascending: true });
    if (error) throw error;
    return data;
  },

  async updateRoomStatus(roomNumber, status) {
    if (!this.isAvailable()) return null;
    const { data, error } = await supabase
      .from('rooms')
      .update({ status })
      .eq('room_number', String(roomNumber))
      .select();
    if (error) throw error;
    return data;
  },

  // ---------------------------------------------------------------------------
  // 2. BOOKINGS (PHIÊN THUÊ PHÒNG)
  // ---------------------------------------------------------------------------
  async fetchBookings() {
    if (!this.isAvailable()) return null;
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createBooking(bookingData) {
    if (!this.isAvailable()) return null;
    const sanitized = sanitizeBooking(bookingData);
    const { data, error } = await supabase
      .from('bookings')
      .insert([sanitized])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateBooking(bookingId, updatedFields) {
    if (!this.isAvailable()) return null;
    const sanitized = sanitizeBooking(updatedFields);
    const { data, error } = await supabase
      .from('bookings')
      .update(sanitized)
      .eq('id', bookingId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async deleteBooking(bookingId) {
    if (!this.isAvailable()) return null;
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId);
    if (error) throw error;
    return true;
  },

  // ---------------------------------------------------------------------------
  // 3. RESERVATIONS (CỌC GIỮ PHÒNG)
  // ---------------------------------------------------------------------------
  async fetchReservations() {
    if (!this.isAvailable()) return null;
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createReservation(resData) {
    if (!this.isAvailable()) return null;
    const sanitized = sanitizeReservation(resData);
    const { data, error } = await supabase
      .from('reservations')
      .insert([sanitized])
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async updateReservation(resId, updatedFields) {
    if (!this.isAvailable()) return null;
    const sanitized = sanitizeReservation(updatedFields);
    const { data, error } = await supabase
      .from('reservations')
      .update(sanitized)
      .eq('id', resId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async deleteReservation(resId) {
    if (!this.isAvailable()) return null;
    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('id', resId);
    if (error) throw error;
    return true;
  },

  // ---------------------------------------------------------------------------
  // 4. PAYMENTS (SỔ QUỸ DÒNG TIỀN)
  // ---------------------------------------------------------------------------
  async fetchPayments() {
    if (!this.isAvailable()) return null;
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createPayment(paymentData) {
    if (!this.isAvailable()) return null;
    const sanitized = sanitizePayment(paymentData);
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert([sanitized])
        .select()
        .maybeSingle();
      if (error) {
        if (error.message && error.message.includes('foreign key constraint')) {
          // Retry with invalid foreign keys set to null
          const fallback = {
            ...sanitized,
            ...(error.message.includes('booking_id') || !sanitized.booking_id ? { booking_id: null } : {}),
            ...(error.message.includes('reservation_id') || !sanitized.reservation_id ? { reservation_id: null } : {}),
          };
          const { data: fbData, error: fbError } = await supabase
            .from('payments')
            .insert([fallback])
            .select()
            .maybeSingle();
          if (fbError) throw fbError;
          return fbData;
        }
        throw error;
      }
      return data;
    } catch (err) {
      console.warn('Supabase createPayment warning:', err?.message || err);
      return null;
    }
  },

  // ---------------------------------------------------------------------------
  // 5. EXPENSES (CHI QUỸ)
  // ---------------------------------------------------------------------------
  async fetchExpenses() {
    if (!this.isAvailable()) return null;
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createExpense(expenseData) {
    if (!this.isAvailable()) return null;
    const sanitized = sanitizeExpense(expenseData);
    const { data, error } = await supabase
      .from('expenses')
      .insert([sanitized])
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async updateExpenseStatus(expenseId, status, approvedBy = 'Admin', rejectReason = '') {
    if (!this.isAvailable()) return null;
    const updatePayload = sanitizeExpense({
      status,
      approved_by: status === 'approved' ? approvedBy : null,
      approved_at: status === 'approved' ? new Date().toISOString() : null,
      reject_reason: status === 'rejected' ? rejectReason : null,
    });
    const { data, error } = await supabase
      .from('expenses')
      .update(updatePayload)
      .eq('id', expenseId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // ---------------------------------------------------------------------------
  // 6. SHIFT CLOSURES (CHỐT CA)
  // ---------------------------------------------------------------------------
  async fetchShiftClosures() {
    if (!this.isAvailable()) return null;
    const { data, error } = await supabase
      .from('shift_closures')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createShiftClosure(closureData) {
    if (!this.isAvailable()) return null;
    const sanitized = sanitizeShiftClosure(closureData);
    const { data, error } = await supabase
      .from('shift_closures')
      .insert([sanitized])
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // ---------------------------------------------------------------------------
  // 7. AUDIT LOGS (NHẬT KÝ HỆ THỐNG)
  // ---------------------------------------------------------------------------
  async fetchAuditLogs() {
    if (!this.isAvailable()) return null;
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) throw error;
    return data;
  },

  async createAuditLog(logData) {
    if (!this.isAvailable()) return null;
    const sanitized = sanitizeAuditLog(logData);
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([sanitized])
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // ---------------------------------------------------------------------------
  // 8. FULL PUSH & PULL FROM SUPABASE (ĐỒNG BỘ TOÀN DIỆN VỀ MÁY & LÊN CLOUD)
  // ---------------------------------------------------------------------------
  async pushAllToSupabase({ rooms = [], bookings = [], reservations = [], payments = [], expenses = [], closures = [] }) {
    if (!this.isAvailable()) return null;
    try {
      if (rooms.length > 0) {
        const formattedRooms = rooms.map((r) =>
          sanitizeRoom({
            room_number: String(r.room_number),
            floor: r.floor || Number(String(r.room_number)[0]) || 1,
            room_type: r.room_type || 'Phòng Đơn',
            is_double_room: Boolean(r.is_double_room),
            status: r.status || 'available',
          })
        );
        await supabase.from('rooms').upsert(formattedRooms, { onConflict: 'room_number' });
      }

      if (bookings.length > 0) {
        const sanitizedBookings = bookings.map(sanitizeBooking).filter(Boolean);
        await supabase.from('bookings').upsert(sanitizedBookings, { onConflict: 'id' });
      }

      if (reservations.length > 0) {
        const sanitizedReservations = reservations.map(sanitizeReservation).filter(Boolean);
        await supabase.from('reservations').upsert(sanitizedReservations, { onConflict: 'id' });
      }

      if (payments.length > 0) {
        const sanitizedPayments = payments.map(sanitizePayment).filter(Boolean);
        await supabase.from('payments').upsert(sanitizedPayments, { onConflict: 'id' });
      }

      if (expenses.length > 0) {
        const sanitizedExpenses = expenses.map(sanitizeExpense).filter(Boolean);
        await supabase.from('expenses').upsert(sanitizedExpenses, { onConflict: 'id' });
      }

      if (closures.length > 0) {
        const sanitizedClosures = closures.map(sanitizeShiftClosure).filter(Boolean);
        await supabase.from('shift_closures').upsert(sanitizedClosures, { onConflict: 'id' });
      }

      return true;
    } catch (err) {
      console.error('Error pushing all to Supabase:', err);
      throw err;
    }
  },

  async pullAllFromSupabase() {
    if (!this.isAvailable()) return null;
    try {
      const [rooms, bookings, reservations, payments, expenses, closures] = await Promise.all([
        this.fetchRooms(),
        this.fetchBookings(),
        this.fetchReservations(),
        this.fetchPayments(),
        this.fetchExpenses(),
        this.fetchShiftClosures(),
      ]);

      return {
        rooms: rooms || [],
        bookings: bookings || [],
        reservations: reservations || [],
        payments: payments || [],
        expenses: expenses || [],
        closures: closures || [],
      };
    } catch (err) {
      console.error('Error pulling data from Supabase:', err);
      throw err;
    }
  },

  // ---------------------------------------------------------------------------
  // 9. REALTIME SUBSCRIPTION (ĐỒNG BỘ TỨC THÌ ĐA THIẾT BỊ)
  // ---------------------------------------------------------------------------
  subscribeToAllChanges(onUpdateCallback) {
    if (!this.isAvailable()) return () => {};

    const channel = supabase
      .channel('hotel-supabase-realtime-all')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        (payload) => {
          if (onUpdateCallback) onUpdateCallback(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          if (onUpdateCallback) onUpdateCallback(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        (payload) => {
          if (onUpdateCallback) onUpdateCallback(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        (payload) => {
          if (onUpdateCallback) onUpdateCallback(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        (payload) => {
          if (onUpdateCallback) onUpdateCallback(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shift_closures' },
        (payload) => {
          if (onUpdateCallback) onUpdateCallback(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          if (onUpdateCallback) onUpdateCallback(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('⚡ Supabase Realtime connected and listening to all tables');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
