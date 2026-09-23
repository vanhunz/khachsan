import { useState, useMemo } from 'react';
import {
  X,
  Shield,
  KeyRound,
  TrendingUp,
  Banknote,
  CreditCard,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Clock,
  Eye,
  EyeOff,
  Search,
  User,
  MinusCircle,
  Settings,
  LogOut,
  Wifi,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  Edit3,
  BookmarkPlus,
  Phone,
  FileSpreadsheet,
  Download,
  Filter,
} from 'lucide-react';
import {
  hotelStore,
  INITIAL_ROOMS,
  getTodayDateString,
  formatDateTimeDisplay,
  formatCurrencyVND,
  formatNumber,
  HOTEL_CONFIG,
} from '../services/hotelStore';
import { calculateTotalBill } from '../utils/calculateTotalBill';
import { networkService } from '../services/networkService';
import { supabaseService } from '../services/supabaseService';

export default function AdminPortalModal({
  isOpen,
  onClose,
  onDataChanged,
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  // Active Admin Sub-Tab: 'revenue' | 'rooms' | 'reservations' | 'expenses' | 'audit_logs' | 'settings'
  const [activeTab, setActiveTab] = useState('revenue');

  // Revenue Filter Mode: 'day' | 'month' | 'all'
  const [revFilterMode, setRevFilterMode] = useState('day');
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [revDetailView, setRevDetailView] = useState('bookings'); // 'bookings' | 'payments'

  // Network & Cloud Sync states
  const [netConfig, setNetConfig] = useState(() => networkService.loadConfig());
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Password change states
  const [newStaffPin, setNewStaffPin] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [confirmAdminPass, setConfirmAdminPass] = useState('');
  const [passSuccessMsg, setPassSuccessMsg] = useState('');
  const [passErrorMsg, setPassErrorMsg] = useState('');

  // Search and Filter states
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [logActionFilter, setLogActionFilter] = useState('all');
  const [resFilterStatus, setResFilterStatus] = useState('all'); // 'all' | 'active' | 'arrived'

  // Edit Modal State
  const [editingReservation, setEditingReservation] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);

  // Load report data strictly from data
  const reportData = useMemo(() => {
    return hotelStore.getAdminReportData(selectedDate, selectedMonth, selectedYear);
  }, [selectedDate, selectedMonth, selectedYear, isOpen, activeTab, revFilterMode]);

  // Current active period data
  const currentPeriodSummary = useMemo(() => {
    if (revFilterMode === 'month') {
      return reportData.monthSummary;
    }
    if (revFilterMode === 'day') {
      return reportData.daySummary;
    }
    return reportData.allTime;
  }, [revFilterMode, reportData]);

  const allRooms = hotelStore.getRooms();
  const allBookings = hotelStore.getBookings();
  const allReservations = hotelStore.getReservations();
  const activeBookings = allBookings.filter((b) => b.status === 'active');

  if (!isOpen) return null;

  const handleClose = () => {
    setIsAuthenticated(false);
    setPasswordInput('');
    setAuthError('');
    onClose();
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPasswordInput('');
    setAuthError('');
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (hotelStore.verifyAdminPassword(passwordInput)) {
      setIsAuthenticated(true);
      setAuthError('');
      setPasswordInput('');
    } else {
      setAuthError('Mật khẩu Admin không chính xác (mặc định: 234)!');
    }
  };

  const handleUpdateStaffPin = (e) => {
    e.preventDefault();
    if (!newStaffPin.trim()) {
      setPassErrorMsg('Mật khẩu nhân viên không được để trống!');
      return;
    }
    hotelStore.setStaffPin(newStaffPin.trim());
    setPassSuccessMsg(`Đã đổi mật khẩu nhân viên: ${newStaffPin.trim()}`);
    setPassErrorMsg('');
    setNewStaffPin('');
    if (onDataChanged) onDataChanged();
  };

  const handleUpdateAdminPass = (e) => {
    e.preventDefault();
    if (!newAdminPass.trim()) {
      setPassErrorMsg('Mật khẩu Admin mới không được để trống!');
      return;
    }
    if (newAdminPass !== confirmAdminPass) {
      setPassErrorMsg('Xác nhận mật khẩu Admin mới không khớp!');
      return;
    }
    hotelStore.setAdminPassword(newAdminPass.trim());
    setPassSuccessMsg('Đã đổi mật khẩu Admin thành công!');
    setPassErrorMsg('');
    setNewAdminPass('');
    setConfirmAdminPass('');
    if (onDataChanged) onDataChanged();
  };

  // --- ROOM MANAGEMENT HANDLERS (No Audit Logs for room deletion as requested) ---
  const handleDeleteBooking = (bookingId, roomNumber) => {
    if (window.confirm(`Xác nhận xóa phiên phòng P.${roomNumber} (Đơn #${bookingId}) và trả phòng về Trống?`)) {
      hotelStore.deleteBooking(bookingId, 'Admin');
      if (onDataChanged) onDataChanged();
    }
  };

  const handleResetRoomStatus = (roomId, status) => {
    hotelStore.updateRoomStatus(roomId, status, 'Admin');
    if (onDataChanged) onDataChanged();
  };

  const handleResetAllRoomsToAvailable = () => {
    if (window.confirm('CẢNH BÁO: Bạn có chắc chắn muốn trả TẤT CẢ các phòng về trạng thái Trống?')) {
      const rooms = hotelStore.getRooms();
      rooms.forEach((r) => {
        hotelStore.updateRoomStatus(r.id, 'available', 'Admin');
      });
      const bookings = hotelStore.getBookings().map((b) =>
        b.status === 'active' ? { ...b, status: 'completed', check_out: new Date().toISOString() } : b
      );
      hotelStore.saveBookings(bookings);
      if (onDataChanged) onDataChanged();
    }
  };

  // --- RESERVATION MANAGEMENT HANDLERS ---
  const handleDeleteSingleReservation = (resId) => {
    if (window.confirm('Xác nhận xóa đơn cọc phòng này?')) {
      hotelStore.deleteReservation(resId);
      if (onDataChanged) onDataChanged();
    }
  };

  const handleDeleteAllArrivedReservations = () => {
    if (window.confirm('Xác nhận xóa TẤT CẢ các đơn cọc đã nhận phòng (Đã đến)?')) {
      hotelStore.deleteAllArrivedReservations();
      if (onDataChanged) onDataChanged();
    }
  };

  const handleDeleteAllReservations = () => {
    if (window.confirm('CẢNH BÁO: Xác nhận xóa TOÀN BỘ danh sách cọc phòng?')) {
      hotelStore.deleteAllReservations();
      if (onDataChanged) onDataChanged();
    }
  };

  const handleSaveEditReservation = (e) => {
    e.preventDefault();
    if (!editingReservation) return;
    hotelStore.updateReservation(editingReservation.id, editingReservation);
    setEditingReservation(null);
    if (onDataChanged) onDataChanged();
  };

  const handleSaveEditBooking = (e) => {
    e.preventDefault();
    if (!editingBooking) return;
    hotelStore.updateActiveBookingDetails({
      bookingId: editingBooking.id,
      roomNumber: editingBooking.room_number,
      rentalType: editingBooking.rental_type,
      roomRateMode: editingBooking.room_rate_mode,
      drinks: {
        beer_qty: editingBooking.beer_qty,
        water_qty: editingBooking.water_qty,
        soft_drink_qty: editingBooking.soft_drink_qty,
      },
      surchargeAmount: editingBooking.surcharge_amount,
      surchargeReason: editingBooking.surcharge_reason,
      customerName: editingBooking.customer_name,
      customerPhone: editingBooking.customer_phone,
      notes: editingBooking.notes,
    });
    setEditingBooking(null);
    if (onDataChanged) onDataChanged();
  };

  // --- EXPENSE HANDLERS ---
  const handleApproveExpense = (expenseId) => {
    hotelStore.approveExpense(expenseId, 'Admin');
    if (onDataChanged) onDataChanged();
  };

  const handleRejectExpense = (expenseId) => {
    const reason = window.prompt('Nhập lý do từ chối phiếu chi:');
    if (reason !== null) {
      hotelStore.rejectExpense(expenseId, 'Admin', reason);
      if (onDataChanged) onDataChanged();
    }
  };

  // --- NETWORK / CLOUD SYNC ---
  const handlePushSupabaseSync = async () => {
    setIsSyncing(true);
    setSyncStatusMsg('');
    try {
      const payload = {
        rooms: hotelStore.getRooms(),
        bookings: hotelStore.getBookings(),
        payments: hotelStore.getPayments(),
        expenses: hotelStore.getExpenses(),
        closures: hotelStore.getShiftClosures(),
        reservations: hotelStore.getReservations(),
      };
      await supabaseService.pushAllToSupabase(payload);
      setSyncStatusMsg('✅ Đã đẩy toàn bộ dữ liệu lên Supabase Cloud thành công!');
    } catch (err) {
      setSyncStatusMsg(`❌ Lỗi Supabase: ${err.message || 'Không thể đồng bộ'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullSupabaseSync = async () => {
    if (!window.confirm('Tải dữ liệu từ Supabase về sẽ cập nhật lại dữ liệu trên máy này. Tiếp tục?')) return;
    setIsSyncing(true);
    setSyncStatusMsg('');
    try {
      const cloudData = await supabaseService.pullAllFromSupabase();
      if (cloudData) {
        hotelStore.syncFromSupabaseData(cloudData);
        setSyncStatusMsg('✅ Đã tải toàn bộ dữ liệu từ Supabase Cloud về thành công!');
        if (onDataChanged) onDataChanged();
      }
    } catch (err) {
      setSyncStatusMsg(`❌ Lỗi Supabase: ${err.message || 'Không thể tải dữ liệu'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSeedSupabaseRooms = async () => {
    setIsSyncing(true);
    setSyncStatusMsg('');
    try {
      await supabaseService.initAndSeedIfNeeded(INITIAL_ROOMS);
      setSyncStatusMsg('✅ Đã khởi tạo 11 phòng mặc định trên Supabase!');
    } catch (err) {
      setSyncStatusMsg(`❌ Lỗi khởi tạo phòng: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportCSV = () => {
    const csvContent = hotelStore.exportDailyAuditCSV(selectedDate);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bao_Cao_Doanh_Thu_${selectedDate.replace(/\//g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClearAuditLogs = () => {
    if (window.confirm('Xác nhận xóa toàn bộ nhật ký Audit Log?')) {
      hotelStore.clearAuditLogs();
      if (onDataChanged) onDataChanged();
    }
  };

  const handleResetAllData = () => {
    if (
      window.confirm(
        '⚠️ CẢNH BÁO:\n\nThao tác này sẽ XÓA SẠCH toàn bộ dữ liệu (các phòng đang ở, cọc, đơn thuê, chi quỹ, dòng tiền) và đưa hệ thống về trạng thái TRỐNG SẠCH 100% (11 phòng đều sẵn sàng đón khách).\n\nBạn có chắc chắn muốn thực hiện không?'
      )
    ) {
      hotelStore.clearAllData();
      alert('✅ Đã làm mới hệ thống về trạng thái 100% sạch sẽ!');
      if (onDataChanged) onDataChanged();
    }
  };

  // Filtered Logs
  const filteredAuditLogs = (reportData.auditLogs || []).filter((log) => {
    if (logActionFilter !== 'all' && !log.action.toLowerCase().includes(logActionFilter.toLowerCase())) return false;
    if (logSearchTerm) {
      const term = logSearchTerm.toLowerCase();
      return (
        log.action.toLowerCase().includes(term) ||
        (log.details || '').toLowerCase().includes(term) ||
        (log.user || '').toLowerCase().includes(term)
      );
    }
    return true;
  });

  // Filtered Reservations
  const filteredReservations = allReservations.filter((r) => {
    const isArrived = r.status === 'arrived' || r.status === 'completed';
    if (resFilterStatus === 'active') return !isArrived;
    if (resFilterStatus === 'arrived') return isArrived;
    return true;
  });

  // Quick Date Selectors
  const setQuickDateToday = () => {
    setRevFilterMode('day');
    setSelectedDate(getTodayDateString());
  };

  const setQuickDateYesterday = () => {
    setRevFilterMode('day');
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    setSelectedDate(`${year}-${month}-${day}`);
  };

  const setQuickMonthThisMonth = () => {
    setRevFilterMode('month');
    const now = new Date();
    setSelectedMonth(now.getMonth() + 1);
    setSelectedYear(now.getFullYear());
  };

  const setQuickMonthLastMonth = () => {
    setRevFilterMode('month');
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    setSelectedMonth(prevMonth);
    setSelectedYear(prevYear);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative my-4 w-full max-w-5xl rounded-3xl bg-white shadow-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between bg-slate-900 px-5 py-3 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600 text-white font-black">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-white uppercase">
                QUẢN TRỊ KHÁCH SẠN (ADMIN)
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 text-xs font-black transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Đăng Xuất</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 1. PASSWORD GATE (WHEN NOT AUTHENTICATED) */}
        {!isAuthenticated ? (
          <div className="p-8 flex flex-col items-center justify-center min-h-[350px] bg-slate-50 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 mb-3">
              <KeyRound className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-black text-slate-900">
              Nhập Mật Khẩu Admin (Mặc định: 234)
            </h3>

            <form onSubmit={handleLogin} className="w-full max-w-xs space-y-3 mt-4">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mật khẩu Admin..."
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  autoFocus
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-center text-sm font-bold text-slate-900 focus:border-purple-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {authError && (
                <div className="rounded-xl bg-rose-50 p-2 text-xs font-bold text-rose-700 border border-rose-200">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-purple-600 py-2.5 text-sm font-black text-white hover:bg-purple-700 transition shadow-md shadow-purple-600/20"
              >
                Đăng Nhập Quản Trị
              </button>
            </form>
          </div>
        ) : (
          /* 2. AUTHENTICATED ADMIN DASHBOARD */
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-100">
            {/* Admin Sub-tabs Navigation */}
            <div className="flex items-center gap-1.5 border-b border-slate-200 bg-white px-4 py-2 shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('revenue')}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition whitespace-nowrap ${
                  activeTab === 'revenue'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                <span>Quản Lý Doanh Thu</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('rooms')}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition whitespace-nowrap ${
                  activeTab === 'rooms'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Layers className="h-4 w-4" />
                <span>Quản Lý Phòng</span>
                <span className="rounded-full bg-slate-200 text-slate-700 px-1.5 py-0.2 text-[10px] font-mono font-bold">
                  {activeBookings.length}/11
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('reservations')}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition whitespace-nowrap ${
                  activeTab === 'reservations'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <BookmarkPlus className="h-4 w-4" />
                <span>Quản Lý Cọc</span>
                <span className="rounded-full bg-slate-200 text-slate-700 px-1.5 py-0.2 text-[10px] font-mono font-bold">
                  {allReservations.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('expenses')}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition whitespace-nowrap ${
                  activeTab === 'expenses'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <MinusCircle className="h-4 w-4" />
                <span>Lịch Sử Chi Quỹ</span>
                <span className="rounded-full bg-rose-100 text-rose-800 px-1.5 py-0.2 text-[10px] font-mono font-bold">
                  {reportData.expenses?.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('audit_logs')}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition whitespace-nowrap ${
                  activeTab === 'audit_logs'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Clock className="h-4 w-4" />
                <span>Nhật Ký Hoạt Động</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition whitespace-nowrap ${
                  activeTab === 'settings'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Settings className="h-4 w-4" />
                <span>Cài Đặt & Mật Khẩu</span>
              </button>
            </div>

            {/* Content Body Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
              {/* TAB 1: QUẢN LÝ DOANH THU & BÁO CÁO (CHÍNH) */}
              {activeTab === 'revenue' && (
                <div className="space-y-4">
                  {/* Filter Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                    {/* Mode Toggle */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setRevFilterMode('day')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          revFilterMode === 'day'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Theo Ngày</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRevFilterMode('month')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          revFilterMode === 'month'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Theo Tháng</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRevFilterMode('all')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          revFilterMode === 'all'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span>Toàn Bộ</span>
                      </button>
                    </div>

                    {/* Date/Month Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                      {revFilterMode === 'day' && (
                        <>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={setQuickDateToday}
                              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100"
                            >
                              Hôm Nay
                            </button>
                            <button
                              type="button"
                              onClick={setQuickDateYesterday}
                              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100"
                            >
                              Hôm Qua
                            </button>
                          </div>
                          <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                          />
                        </>
                      )}

                      {revFilterMode === 'month' && (
                        <>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={setQuickMonthThisMonth}
                              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100"
                            >
                              Tháng Này
                            </button>
                            <button
                              type="button"
                              onClick={setQuickMonthLastMonth}
                              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100"
                            >
                              Tháng Trước
                            </button>
                          </div>
                          <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-900"
                          >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                              <option key={m} value={m}>Tháng {m}</option>
                            ))}
                          </select>
                          <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-900"
                          >
                            {[2025, 2026, 2027].map((y) => (
                              <option key={y} value={y}>Năm {y}</option>
                            ))}
                          </select>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={handleExportCSV}
                        className="flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold transition shadow-xs"
                        title="Xuất báo cáo chi tiết ra file Excel / CSV"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Xuất Excel</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    {/* 1. Tổng Thu */}
                    <div className="rounded-2xl bg-white p-3.5 border border-slate-200 shadow-xs space-y-1">
                      <div className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Tổng Doanh Thu</span>
                      </div>
                      <div className="text-lg sm:text-xl font-black font-mono text-emerald-700">
                        {formatCurrencyVND(currentPeriodSummary.totalRevenueRecognized || 0)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono flex flex-col pt-0.5 border-t border-slate-100">
                        <span>💵 Két: {formatCurrencyVND(currentPeriodSummary.netCash || 0)}</span>
                        <span>💳 CK: {formatCurrencyVND(currentPeriodSummary.netTransfer || 0)}</span>
                      </div>
                    </div>

                    {/* 2. Tiền phòng */}
                    <div className="rounded-2xl bg-white p-3.5 border border-slate-200 shadow-xs space-y-1">
                      <div className="text-[11px] font-bold text-slate-500 uppercase">
                        Tiền Phòng
                      </div>
                      <div className="text-lg sm:text-xl font-black font-mono text-slate-900">
                        {formatCurrencyVND(currentPeriodSummary.roomRevenue || 0)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {currentPeriodSummary.dayBookings?.length || 0} lượt phòng
                      </div>
                    </div>

                    {/* 3. Tiền nước */}
                    <div className="rounded-2xl bg-white p-3.5 border border-slate-200 shadow-xs space-y-1">
                      <div className="text-[11px] font-bold text-slate-500 uppercase">
                        Tiền Nước / Bar
                      </div>
                      <div className="text-lg sm:text-xl font-black font-mono text-purple-700">
                        {formatCurrencyVND(currentPeriodSummary.serviceRevenue || 0)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Bia: {currentPeriodSummary.totalBeerQty || 0} | Suối: {currentPeriodSummary.totalWaterQty || 0}
                      </div>
                    </div>

                    {/* 4. Phụ thu */}
                    <div className="rounded-2xl bg-white p-3.5 border border-slate-200 shadow-xs space-y-1">
                      <div className="text-[11px] font-bold text-slate-500 uppercase">
                        Phụ Thu
                      </div>
                      <div className="text-lg sm:text-xl font-black font-mono text-amber-700">
                        {formatCurrencyVND(currentPeriodSummary.surchargeRevenue || 0)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Phát sinh thêm
                      </div>
                    </div>

                    {/* 5. Tiền chi */}
                    <div className="rounded-2xl bg-white p-3.5 border border-slate-200 shadow-xs space-y-1">
                      <div className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        <MinusCircle className="h-3.5 w-3.5 text-rose-600" />
                        <span>Tổng Chi Quỹ</span>
                      </div>
                      <div className="text-lg sm:text-xl font-black font-mono text-rose-700">
                        -{formatCurrencyVND(currentPeriodSummary.totalExpenses || 0)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {currentPeriodSummary.dayExpenses?.length || 0} phiếu chi
                      </div>
                    </div>

                    {/* 6. Thực thu / Lợi nhuận */}
                    <div className="rounded-2xl bg-slate-900 p-3.5 text-white shadow-xs space-y-1">
                      <div className="text-[11px] font-bold text-purple-300 uppercase">
                        Thực Thu (Lợi Nhuận)
                      </div>
                      <div className="text-lg sm:text-xl font-black font-mono text-amber-400">
                        {formatCurrencyVND((currentPeriodSummary.totalRevenueRecognized || 0) - (currentPeriodSummary.totalExpenses || 0))}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Doanh thu - Chi phí
                      </div>
                    </div>
                  </div>

                  {/* Detail Sub-Table Toggle */}
                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setRevDetailView('bookings')}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                            revDetailView === 'bookings'
                              ? 'bg-slate-900 text-white'
                              : 'text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          🛏️ Danh Sách Đơn Thuê ({currentPeriodSummary.dayBookings?.length || 0})
                        </button>
                        <button
                          type="button"
                          onClick={() => setRevDetailView('payments')}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                            revDetailView === 'payments'
                              ? 'bg-slate-900 text-white'
                              : 'text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          💵 Sổ Quỹ Giao Dịch ({currentPeriodSummary.dayPayments?.length || 0})
                        </button>
                      </div>

                      <span className="text-xs font-bold text-slate-500">
                        {currentPeriodSummary.periodLabel}
                      </span>
                    </div>

                    {/* Bookings View */}
                    {revDetailView === 'bookings' && (
                      <div className="max-h-[350px] overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                            <tr>
                              <th className="p-2.5">Phòng</th>
                              <th className="p-2.5">Khách Hàng</th>
                              <th className="p-2.5">Hình Thức</th>
                              <th className="p-2.5">Giờ Vào</th>
                              <th className="p-2.5">Giờ Ra</th>
                              <th className="p-2.5 text-right">Tiền Phòng</th>
                              <th className="p-2.5 text-right">Tiền Nước</th>
                              <th className="p-2.5 text-right">Phụ Thu</th>
                              <th className="p-2.5 text-right font-black">Tổng Bill</th>
                              <th className="p-2.5 text-center">Trạng Thái</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {(currentPeriodSummary.dayBookings || []).length === 0 ? (
                              <tr>
                                <td colSpan={10} className="py-8 text-center text-slate-400">
                                  Không có đơn thuê phòng nào trong kỳ này.
                                </td>
                              </tr>
                            ) : (
                              (currentPeriodSummary.dayBookings || []).map((b) => {
                                let roomAmt = Number(b.room_amount) || 0;
                                let serviceAmt = Number(b.service_amount) || 0;
                                let surchargeAmt = Number(b.surcharge_amount) || 0;
                                let totalAmt = Number(b.total_amount) || 0;

                                if (b.status === 'active' && roomAmt === 0) {
                                  const liveBill = calculateTotalBill(
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
                                  roomAmt = liveBill.room_amount;
                                  serviceAmt = liveBill.water_amount;
                                  surchargeAmt = liveBill.surcharge;
                                  totalAmt = liveBill.total_amount;
                                }

                                return (
                                  <tr key={b.id} className="hover:bg-slate-50">
                                    <td className="p-2.5 font-bold font-mono text-slate-900">
                                      P.{b.room_number || 'LẺ'}
                                    </td>
                                    <td className="p-2.5 font-semibold text-slate-800">
                                      {b.customer_name || 'Khách vãng lai'}
                                    </td>
                                    <td className="p-2.5">
                                      {b.rental_type === 'overnight'
                                        ? 'Qua đêm'
                                        : b.rental_type === 'daily'
                                        ? 'Ngày đêm'
                                        : 'Giờ'}
                                    </td>
                                    <td className="p-2.5 font-mono text-[11px] text-slate-600">
                                      {b.check_in ? formatDateTimeDisplay(b.check_in) : '---'}
                                    </td>
                                    <td className="p-2.5 font-mono text-[11px] text-slate-600">
                                      {b.check_out ? formatDateTimeDisplay(b.check_out) : 'Đang ở'}
                                    </td>
                                    <td className="p-2.5 text-right font-mono">
                                      {formatNumber(roomAmt)}đ
                                    </td>
                                    <td className="p-2.5 text-right font-mono text-purple-700">
                                      {formatNumber(serviceAmt)}đ
                                    </td>
                                    <td className="p-2.5 text-right font-mono text-amber-700">
                                      {formatNumber(surchargeAmt)}đ
                                    </td>
                                    <td className="p-2.5 text-right font-mono font-black text-emerald-700 text-sm">
                                      {formatCurrencyVND(totalAmt)}
                                    </td>
                                    <td className="p-2.5 text-center">
                                      <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                          b.status === 'completed'
                                            ? 'bg-emerald-100 text-emerald-900'
                                            : b.status === 'active'
                                            ? 'bg-rose-100 text-rose-900'
                                            : 'bg-slate-100 text-slate-600'
                                        }`}
                                      >
                                        {b.status === 'completed' ? 'Hoàn tất' : b.status === 'active' ? 'Đang ở' : b.status}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Payments View */}
                    {revDetailView === 'payments' && (
                      <div className="max-h-[350px] overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                            <tr>
                              <th className="p-2.5">Thời Gian</th>
                              <th className="p-2.5">Phòng</th>
                              <th className="p-2.5">Loại Dòng Tiền</th>
                              <th className="p-2.5">Hình Thức</th>
                              <th className="p-2.5 text-right">Số Tiền</th>
                              <th className="p-2.5">Ghi Chú</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {(currentPeriodSummary.dayPayments || []).length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-8 text-center text-slate-400">
                                  Không có giao dịch dòng tiền nào trong kỳ này.
                                </td>
                              </tr>
                            ) : (
                              (currentPeriodSummary.dayPayments || []).map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50">
                                  <td className="p-2.5 font-mono text-[11px] text-slate-600">
                                    {formatDateTimeDisplay(p.created_at)}
                                  </td>
                                  <td className="p-2.5 font-bold font-mono text-slate-900">
                                    {p.room_number ? `P.${p.room_number}` : '---'}
                                  </td>
                                  <td className="p-2.5">
                                    {p.payment_type === 'deposit'
                                      ? 'Đặt cọc giữ phòng'
                                      : p.payment_type === 'refund'
                                      ? 'Hoàn tiền / Thối tiền'
                                      : 'Thanh toán tiền phòng'}
                                  </td>
                                  <td className="p-2.5">
                                    <span
                                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                        p.method === 'transfer'
                                          ? 'bg-blue-100 text-blue-900'
                                          : 'bg-emerald-100 text-emerald-900'
                                      }`}
                                    >
                                      {p.method === 'transfer' ? '💳 Chuyển khoản' : '💵 Tiền mặt'}
                                    </span>
                                  </td>
                                  <td className={`p-2.5 text-right font-mono font-black ${
                                    Number(p.amount) < 0 ? 'text-rose-700' : 'text-emerald-700'
                                  }`}>
                                    {formatCurrencyVND(p.amount)}
                                  </td>
                                  <td className="p-2.5 text-slate-600 text-[11px]">
                                    {p.note || '---'}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: QUẢN LÝ 11 PHÒNG */}
              {activeTab === 'rooms' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                    <div>
                      <h3 className="text-sm font-black uppercase text-slate-800">
                        Danh Sách 11 Phòng ({activeBookings.length} phòng đang ở)
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetAllRoomsToAvailable}
                      className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-2 transition shadow-xs"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Trả Toàn Bộ Phòng Về Trống</span>
                    </button>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                        <tr>
                          <th className="p-3">Phòng</th>
                          <th className="p-3">Trạng Thái</th>
                          <th className="p-3">Khách Hàng</th>
                          <th className="p-3">Hình Thức</th>
                          <th className="p-3">Giờ Vào</th>
                          <th className="p-3 text-right">Đã Trả / Cọc</th>
                          <th className="p-3 text-center">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {allRooms.map((r) => {
                          const active = allBookings.find(
                            (b) => String(b.room_number) === String(r.room_number) && b.status === 'active'
                          );

                          return (
                            <tr key={r.id} className="hover:bg-slate-50">
                              <td className="p-3 font-black text-slate-900 font-mono text-sm">
                                P.{r.room_number}
                              </td>
                              <td className="p-3">
                                <select
                                  value={r.status}
                                  onChange={(e) => handleResetRoomStatus(r.id, e.target.value)}
                                  className={`rounded-lg px-2.5 py-1 font-bold text-xs border ${
                                    r.status === 'occupied'
                                      ? 'bg-rose-100 text-rose-900 border-rose-300'
                                      : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  }`}
                                >
                                  <option value="available">Sẵn sàng (Trống)</option>
                                  <option value="occupied">Đang có khách</option>
                                </select>
                              </td>
                              <td className="p-3 font-bold text-slate-800">
                                {active ? active.customer_name : '---'}
                              </td>
                              <td className="p-3">
                                {active ? (
                                  active.rental_type === 'overnight'
                                    ? 'Qua đêm'
                                    : active.rental_type === 'daily'
                                    ? 'Ngày đêm'
                                    : 'Giờ'
                                ) : (
                                  '---'
                                )}
                              </td>
                              <td className="p-3 font-mono text-slate-600">
                                {active ? formatDateTimeDisplay(active.check_in) : '---'}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-emerald-700">
                                {active ? formatCurrencyVND(active.paid_amount) : '0đ'}
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {active && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => setEditingBooking(active)}
                                        className="rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 text-xs font-bold"
                                        title="Sửa thông tin đơn phòng"
                                      >
                                        <Edit3 className="h-3.5 w-3.5" />
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleDeleteBooking(active.id, r.room_number)}
                                        className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 text-xs font-bold"
                                        title="Xóa đơn đang ở và trả phòng về trống"
                                      >
                                        Xóa Đơn
                                      </button>
                                    </>
                                  )}
                                  {!active && r.status !== 'available' && (
                                    <button
                                      type="button"
                                      onClick={() => handleResetRoomStatus(r.id, 'available')}
                                      className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-xs font-bold"
                                    >
                                      Về Trống
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: QUẢN LÝ CỌC PHÒNG */}
              {activeTab === 'reservations' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setResFilterStatus('all')}
                        className={`rounded-lg px-3 py-1 ${
                          resFilterStatus === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600'
                        }`}
                      >
                        Tất Cả ({allReservations.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setResFilterStatus('active')}
                        className={`rounded-lg px-3 py-1 ${
                          resFilterStatus === 'active' ? 'bg-amber-600 text-white' : 'text-amber-900'
                        }`}
                      >
                        Chờ Nhận ({allReservations.filter((r) => r.status === 'active').length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setResFilterStatus('arrived')}
                        className={`rounded-lg px-3 py-1 ${
                          resFilterStatus === 'arrived' ? 'bg-emerald-600 text-white' : 'text-emerald-900'
                        }`}
                      >
                        Đã Đến ({allReservations.filter((r) => r.status === 'arrived' || r.status === 'completed').length})
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDeleteAllArrivedReservations}
                        className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-1.5 transition"
                      >
                        Xóa All Đã Nhận
                      </button>

                      <button
                        type="button"
                        onClick={handleDeleteAllReservations}
                        className="rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs px-3.5 py-1.5 transition"
                      >
                        Xóa Toàn Bộ Cọc
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                        <tr>
                          <th className="p-3">Phòng</th>
                          <th className="p-3">Khách Hàng</th>
                          <th className="p-3">SĐT</th>
                          <th className="p-3">Tiền Cọc</th>
                          <th className="p-3">Hình Thức</th>
                          <th className="p-3">Giờ Hẹn Nhận</th>
                          <th className="p-3">Trạng Thái</th>
                          <th className="p-3 text-center">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredReservations.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-400">
                              Không có bản ghi cọc phòng nào.
                            </td>
                          </tr>
                        ) : (
                          filteredReservations.map((res) => {
                            const isArrived = res.status === 'arrived' || res.status === 'completed';

                            return (
                              <tr key={res.id} className="hover:bg-slate-50">
                                <td className="p-3 font-mono font-bold text-slate-900">
                                  {res.room_number ? `P.${res.room_number}` : 'Chưa xếp'}
                                </td>
                                <td className="p-3 font-bold text-slate-900">{res.customer_name}</td>
                                <td className="p-3 font-mono text-slate-600">{res.customer_phone || '---'}</td>
                                <td className="p-3 font-mono font-black text-emerald-700">
                                  {formatCurrencyVND(res.deposit_amount)}
                                </td>
                                <td className="p-3">
                                  {res.deposit_method === 'transfer' ? '💳 Chuyển khoản' : '💵 Tiền mặt'}
                                </td>
                                <td className="p-3 font-mono text-[11px] text-slate-600">
                                  {formatDateTimeDisplay(res.expected_check_in)}
                                </td>
                                <td className="p-3">
                                  {isArrived ? (
                                    <span className="rounded-full bg-emerald-100 text-emerald-900 px-2 py-0.5 font-bold text-[10px]">
                                      ĐÃ ĐẾN
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 font-bold text-[10px]">
                                      CHỜ NHẬN
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setEditingReservation(res)}
                                      className="rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 text-xs font-bold"
                                    >
                                      Sửa
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSingleReservation(res.id)}
                                      className="rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2 py-1 text-xs font-bold"
                                    >
                                      Xóa
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: LỊCH SỬ PHIẾU CHI */}
              {activeTab === 'expenses' && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                        <tr>
                          <th className="p-3">Thời Gian</th>
                          <th className="p-3 text-right">Số Tiền Chi</th>
                          <th className="p-3">Lý Do Chi</th>
                          <th className="p-3">Nguồn Tiền</th>
                          <th className="p-3">Người Chi</th>
                          <th className="p-3">Trạng Thái</th>
                          <th className="p-3 text-center">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {(reportData.expenses || []).length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400">
                              Chưa có phiếu chi nào.
                            </td>
                          </tr>
                        ) : (
                          (reportData.expenses || []).map((exp) => (
                            <tr key={exp.id} className="hover:bg-slate-50">
                              <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                {formatDateTimeDisplay(exp.created_at)}
                              </td>
                              <td className="p-3 font-mono font-black text-rose-700 text-right text-sm">
                                -{formatCurrencyVND(exp.amount)}
                              </td>
                              <td className="p-3 text-slate-900 font-bold">{exp.reason}</td>
                              <td className="p-3">
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  exp.method === 'transfer' ? 'bg-blue-100 text-blue-900' : 'bg-emerald-100 text-emerald-900'
                                }`}>
                                  {exp.method === 'transfer' ? '💳 Chuyển khoản' : '💵 Két tiền mặt'}
                                </span>
                              </td>
                              <td className="p-3 font-semibold text-slate-700">{exp.requester || 'Lễ tân'}</td>
                              <td className="p-3 font-bold">
                                {exp.status === 'approved' ? (
                                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    Đã duyệt
                                  </span>
                                ) : exp.status === 'rejected' ? (
                                  <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                    Đã từ chối
                                  </span>
                                ) : (
                                  <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                    Chờ duyệt
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {exp.status === 'pending' ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleApproveExpense(exp.id)}
                                      className="rounded-lg bg-emerald-600 px-2.5 py-1 text-white font-bold text-xs hover:bg-emerald-700"
                                    >
                                      Duyệt
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRejectExpense(exp.id)}
                                      className="rounded-lg bg-rose-600 px-2.5 py-1 text-white font-bold text-xs hover:bg-rose-700"
                                    >
                                      Từ chối
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">---</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: AUDIT LOGS */}
              {activeTab === 'audit_logs' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                    <select
                      value={logActionFilter}
                      onChange={(e) => setLogActionFilter(e.target.value)}
                      className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-900"
                    >
                      <option value="all">Tất cả hành động</option>
                      <option value="Nhận phòng">Nhận phòng</option>
                      <option value="Trả phòng">Trả phòng</option>
                      <option value="Xóa phòng">Xóa phòng</option>
                      <option value="Thu trước">Thu trước</option>
                      <option value="phiếu chi">Phiếu chi</option>
                      <option value="Đổi trạng thái phòng">Đổi trạng thái phòng</option>
                      <option value="Đổi mật khẩu">Đổi mật khẩu</option>
                    </select>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Tìm trong nhật ký..."
                        value={logSearchTerm}
                        onChange={(e) => setLogSearchTerm(e.target.value)}
                        className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 w-56"
                      />
                      <button
                        type="button"
                        onClick={handleClearAuditLogs}
                        className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                      >
                        Xóa Log
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden max-h-[450px] overflow-y-auto shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                        <tr>
                          <th className="p-3">Thời Gian</th>
                          <th className="p-3">Hành Động</th>
                          <th className="p-3">Chi Tiết</th>
                          <th className="p-3 text-center">Người Thực Hiện</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAuditLogs.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-400">
                              Không có nhật ký hoạt động nào.
                            </td>
                          </tr>
                        ) : (
                          filteredAuditLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50">
                              <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                {formatDateTimeDisplay(log.timestamp)}
                              </td>
                              <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                                {log.action}
                              </td>
                              <td className="p-3 text-slate-700">{log.details}</td>
                              <td className="p-3 text-center font-bold text-slate-600">{log.user || 'Lễ tân'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 6: CÀI ĐẶT & MẬT KHẨU */}
              {activeTab === 'settings' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Mật Khẩu Admin */}
                  <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs space-y-3">
                    <h4 className="text-xs font-black uppercase text-slate-900 flex items-center gap-1.5">
                      <KeyRound className="h-4 w-4 text-purple-600" />
                      <span>Đổi Mật Khẩu Admin (Hiện tại: {hotelStore.getAdminPassword()})</span>
                    </h4>
                    <form onSubmit={handleUpdateAdminPass} className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Mật khẩu Admin mới</label>
                        <input
                          type="password"
                          placeholder="Nhập mật khẩu mới..."
                          value={newAdminPass}
                          onChange={(e) => setNewAdminPass(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold focus:outline-none focus:border-purple-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Xác nhận mật khẩu Admin mới</label>
                        <input
                          type="password"
                          placeholder="Nhập lại mật khẩu..."
                          value={confirmAdminPass}
                          onChange={(e) => setConfirmAdminPass(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold focus:outline-none focus:border-purple-600"
                        />
                      </div>
                      <button
                        type="submit"
                        className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 transition"
                      >
                        Lưu Mật Khẩu Admin
                      </button>
                    </form>
                  </div>

                  {/* Mật Khẩu Nhân Viên */}
                  <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs space-y-3">
                    <h4 className="text-xs font-black uppercase text-slate-900 flex items-center gap-1.5">
                      <User className="h-4 w-4 text-blue-600" />
                      <span>Đổi Mật Khẩu Nhân Viên (Hiện tại: {hotelStore.getStaffPin()})</span>
                    </h4>
                    <form onSubmit={handleUpdateStaffPin} className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Mã PIN nhân viên mới</label>
                        <input
                          type="text"
                          placeholder="Nhập PIN nhân viên (VD: 123)..."
                          value={newStaffPin}
                          onChange={(e) => setNewStaffPin(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-600"
                        />
                      </div>
                      <button
                        type="submit"
                        className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition"
                      >
                        Lưu PIN Nhân Viên
                      </button>
                    </form>
                  </div>

                  {/* Đồng bộ Supabase Cloud */}
                  <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs space-y-3 md:col-span-2">
                    <h4 className="text-xs font-black uppercase text-slate-900 flex items-center gap-1.5">
                      <Wifi className="h-4 w-4 text-emerald-600" />
                      <span>Đồng Bộ Dữ Liệu Cloud Supabase</span>
                    </h4>

                    {syncStatusMsg && (
                      <div className="rounded-xl bg-slate-50 p-2.5 text-xs font-bold text-slate-800 border border-slate-200">
                        {syncStatusMsg}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isSyncing}
                        onClick={handlePushSupabaseSync}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 transition"
                      >
                        <CloudUpload className="h-4 w-4" />
                        <span>Đẩy Dữ Liệu Lên Supabase</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSyncing}
                        onClick={handlePullSupabaseSync}
                        className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 transition"
                      >
                        <CloudDownload className="h-4 w-4" />
                        <span>Tải Dữ Liệu Từ Supabase Về</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSyncing}
                        onClick={handleSeedSupabaseRooms}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs px-4 py-2 transition"
                      >
                        <Sparkles className="h-4 w-4 text-amber-600" />
                        <span>Khởi Tạo 11 Phòng Mặc Định</span>
                      </button>
                    </div>
                  </div>

                  {/* Reset sạch dữ liệu */}
                  <div className="rounded-2xl bg-rose-50 p-5 border border-rose-200 md:col-span-2 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase text-rose-900">
                        Xóa Sạch Dữ Liệu & Đưa Về Trạng Thái Mới (100% Sạch)
                      </h4>
                      <p className="text-xs text-rose-700 mt-0.5">
                        Xóa tất cả đơn phòng ảo, cọc mẫu, chi quỹ mẫu để bắt đầu hoạt động thực tế.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetAllData}
                      className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 transition shadow-xs shrink-0"
                    >
                      Làm Sạch Dữ Liệu
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
