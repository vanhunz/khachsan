import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  Calendar,
  Banknote,
  CreditCard,
  FileSpreadsheet,
  Lock,
  Printer,
  Sparkles,
  Wine,
  Tag,
  CheckCircle2,
  Clock,
  RotateCcw,
  Check,
  AlertCircle,
  TrendingUp,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  Eye,
  ChevronLeft,
  ChevronRight,
  Coins,
  Zap,
} from 'lucide-react';
import {
  getTodayDateString,
  getStartAndEndOfWeek,
  getStartAndEndOfMonth,
  formatDateTimeDisplay,
  formatTimeOnlyDisplay,
  formatCurrencyVND,
  hotelStore,
} from '../services/hotelStore';

export default function TransactionLog({
  bookings = [],
  payments = [],
  rooms = [],
  onOpenClosureModal,
  onOpenDetailModal,
  onOpenReceipt,
  onCancelBooking,
  onExportCSV,
  onExportLedgerCSV,
}) {
  const [activeSubTab, setActiveSubTab] = useState('ledger'); // 'ledger' | 'bookings' | 'audit'
  const [auditFilter, setAuditFilter] = useState('all'); // 'all' | 'deleted' | 'shift'

  // Period filter: 'day' | 'week' | 'month'
  const [periodType, setPeriodType] = useState('day');
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [selectedWeekDate, setSelectedWeekDate] = useState(getTodayDateString());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all'); // 'all' | 'cash' | 'transfer'
  const [selectedPaymentType, setSelectedPaymentType] = useState('all'); // 'all' | 'advance' | 'settlement' | 'refund'
  const [selectedRoom, setSelectedRoom] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state (10 items per page as requested)
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Period Summary calculation with full defensive fallback
  const periodSummary = useMemo(() => {
    try {
      const res = hotelStore.getPeriodSummary({
        periodType,
        targetDate: selectedDate,
        targetWeekDate: selectedWeekDate,
        targetMonth: selectedMonth,
        targetYear: selectedYear,
      });
      return (
        res || {
          startDateStr: selectedDate,
          endDateStr: selectedDate,
          periodLabel: selectedDate,
          netCash: 0,
          cashInflow: 0,
          cashOutflow: 0,
          netTransfer: 0,
          totalRevenueRecognized: 0,
          isClosed: false,
          closuresCount: 0,
        }
      );
    } catch (e) {
      console.error('Failed to get period summary:', e);
      return {
        startDateStr: selectedDate,
        endDateStr: selectedDate,
        periodLabel: selectedDate,
        netCash: 0,
        cashInflow: 0,
        cashOutflow: 0,
        netTransfer: 0,
        totalRevenueRecognized: 0,
        isClosed: false,
        closuresCount: 0,
      };
    }
  }, [payments, bookings, periodType, selectedDate, selectedWeekDate, selectedMonth, selectedYear]);

  // Filtered Payments (Ledger) based on date range [startDateStr, endDateStr]
  const filteredPayments = useMemo(() => {
    const startDateStr = periodSummary?.startDateStr || selectedDate;
    const endDateStr = periodSummary?.endDateStr || selectedDate;
    return (payments || []).filter((p) => {
      if (!p) return false;
      const pDate = p.created_at ? getTodayDateString(new Date(p.created_at)) : selectedDate;
      if (pDate < startDateStr || pDate > endDateStr) return false;

      // Method filter
      if (selectedPaymentMethod !== 'all' && p.method !== selectedPaymentMethod) {
        return false;
      }

      // Payment type filter
      if (selectedPaymentType !== 'all') {
        if (selectedPaymentType === 'advance' || selectedPaymentType === 'deposit') {
          if (p.payment_type !== 'advance' && p.payment_type !== 'deposit') return false;
        } else if (selectedPaymentType === 'expense') {
          if (p.payment_type !== 'expense' && String(p.room_number) !== 'CHI') return false;
        } else if (p.payment_type !== selectedPaymentType) {
          return false;
        }
      }

      // Room filter
      if (selectedRoom !== 'all' && String(p.room_number) !== String(selectedRoom)) {
        return false;
      }

      // Search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchRoom = String(p.room_number || '').toLowerCase().includes(term);
        const matchNote = String(p.note || '').toLowerCase().includes(term);
        const matchId = String(p.id || '').includes(term);
        if (!matchRoom && !matchNote && !matchId) return false;
      }

      return true;
    });
  }, [payments, periodSummary, selectedPaymentMethod, selectedPaymentType, selectedRoom, searchTerm, selectedDate]);

  // Paginated Payments (10 items per page)
  const totalPaymentPages = Math.max(1, Math.ceil((filteredPayments?.length || 0) / PAGE_SIZE));
  const paginatedPayments = useMemo(() => {
    const safePage = Math.max(1, Math.min(currentPage, totalPaymentPages));
    const start = (safePage - 1) * PAGE_SIZE;
    return (filteredPayments || []).slice(start, start + PAGE_SIZE);
  }, [filteredPayments, currentPage, totalPaymentPages]);

  // Filtered Bookings based on date range
  const filteredBookings = useMemo(() => {
    const startDateStr = periodSummary?.startDateStr || selectedDate;
    const endDateStr = periodSummary?.endDateStr || selectedDate;
    return (bookings || []).filter((b) => {
      if (!b) return false;
      const bDate = b.check_in
        ? getTodayDateString(new Date(b.check_in))
        : b.created_at
        ? getTodayDateString(new Date(b.created_at))
        : selectedDate;
      if (bDate < startDateStr || bDate > endDateStr) return false;

      if (selectedRoom !== 'all' && String(b.room_number) !== String(selectedRoom)) {
        return false;
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchRoom = String(b.room_number || '').toLowerCase().includes(term);
        const matchName = String(b.customer_name || '').toLowerCase().includes(term);
        const matchNote = String(b.notes || '').toLowerCase().includes(term);
        if (!matchRoom && !matchName && !matchNote) return false;
      }

      return true;
    });
  }, [bookings, periodSummary, selectedRoom, searchTerm, selectedDate]);

  // Paginated Bookings (10 items per page)
  const totalBookingPages = Math.max(1, Math.ceil((filteredBookings?.length || 0) / PAGE_SIZE));
  const paginatedBookings = useMemo(() => {
    const safePage = Math.max(1, Math.min(currentPage, totalBookingPages));
    const start = (safePage - 1) * PAGE_SIZE;
    return (filteredBookings || []).slice(start, start + PAGE_SIZE);
  }, [filteredBookings, currentPage, totalBookingPages]);

  const auditLogs = useMemo(() => {
    return hotelStore.getAuditLogs();
  }, [payments, bookings, activeSubTab]);

  const filteredAuditLogs = useMemo(() => {
    return (auditLogs || []).filter((log) => {
      const isDelete = (log.action || '').toLowerCase().includes('xóa') || (log.action || '').toLowerCase().includes('hủy');
      const isShift = (log.action || '').toLowerCase().includes('chốt') || (log.action || '').toLowerCase().includes('khóa');

      if (auditFilter === 'deleted' && !isDelete) return false;
      if (auditFilter === 'shift' && !isShift) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          (log.action || '').toLowerCase().includes(term) ||
          (log.details || '').toLowerCase().includes(term) ||
          (log.user || '').toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [auditLogs, auditFilter, searchTerm]);

  // Reset to page 1 when subTab or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeSubTab, periodType, selectedDate, selectedWeekDate, selectedMonth, selectedYear, selectedPaymentMethod, selectedPaymentType, selectedRoom, searchTerm, auditFilter]);

  const rentalTypeNames = {
    hourly: 'Theo Giờ',
    overnight: 'Qua Đêm',
    daily: 'Ngày Đêm',
  };

  const paymentTypeLabels = {
    advance: { label: 'Thu Trước / Tạm Ứng', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
    deposit: { label: 'Tiền Cọc Giữ Phòng', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
    settlement: { label: 'Thanh Toán Trả Phòng', color: 'bg-blue-100 text-blue-900 border-blue-300' },
    refund: { label: 'Thối Lại Tiền Thừa', color: 'bg-rose-100 text-rose-900 border-rose-300' },
    expense: { label: 'Phiếu Chi Tiền', color: 'bg-rose-100 text-rose-900 border-rose-300' },
  };

  // Steppers for Day, Week, Month
  const handleStepDay = (days) => {
    try {
      const parts = selectedDate.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      d.setDate(d.getDate() + days);
      setSelectedDate(getTodayDateString(d));
    } catch {}
  };

  const handleStepWeek = (weeks) => {
    try {
      const parts = selectedWeekDate.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      d.setDate(d.getDate() + weeks * 7);
      setSelectedWeekDate(getTodayDateString(d));
    } catch {}
  };

  const handleStepMonth = (months) => {
    let newM = selectedMonth + months;
    let newY = selectedYear;
    if (newM > 12) {
      newM = 1;
      newY += 1;
    } else if (newM < 1) {
      newM = 12;
      newY -= 1;
    }
    setSelectedMonth(newM);
    setSelectedYear(newY);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP BANNER: SỔ QUỸ & ĐỐI SOÁT DÒNG TIỀN (NGÀY / TUẦN / THÁNG) */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-xl border border-slate-700/50">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-700/80 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-black tracking-tight text-white sm:text-xl">
                Bảng Đối Soát Dòng Tiền & Sổ Quỹ
              </h2>
              {periodSummary.isClosed ? (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Đã Khóa {periodSummary.closuresCount} ca
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-bold text-amber-300 border border-amber-500/30">
                  <Clock className="h-3.5 w-3.5" />
                  Chưa Khóa Sổ
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-300">
              Đối chiếu dòng tiền thực tế kỳ:{' '}
              <strong className="text-amber-400 font-mono-nums text-sm">
                {periodSummary.periodLabel}
              </strong>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onOpenDetailModal && onOpenDetailModal(selectedDate)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-500 active:scale-[0.98] transition"
            >
              <Eye className="h-4 w-4" />
              <span>Xem Báo Cáo Chi Tiết Ngày</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenClosureModal(selectedDate)}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs sm:text-sm font-black text-slate-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 active:scale-[0.98] transition"
            >
              <Zap className="h-4 w-4 fill-slate-950 text-slate-950" />
              <span>⚡ Chốt Nhanh</span>
            </button>

            <button
              type="button"
              onClick={() =>
                activeSubTab === 'ledger'
                  ? onExportLedgerCSV(filteredPayments)
                  : onExportCSV(filteredBookings)
              }
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span>Xuất CSV</span>
            </button>
          </div>
        </div>

        {/* PERIOD MODE SELECTOR: THEO NGÀY / THEO TUẦN / THEO THÁNG */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-slate-800/70 p-3 rounded-2xl border border-slate-700">
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setPeriodType('day')}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                periodType === 'day'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Theo Ngày
            </button>
            <button
              type="button"
              onClick={() => setPeriodType('week')}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                periodType === 'week'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Theo Tuần
            </button>
            <button
              type="button"
              onClick={() => setPeriodType('month')}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                periodType === 'month'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Theo Tháng
            </button>
          </div>

          {/* Stepper Controls according to Period */}
          <div className="flex items-center gap-2 text-xs">
            {periodType === 'day' && (
              <div className="flex items-center gap-1 bg-slate-900/90 px-2 py-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => handleStepDay(-1)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300"
                  title="Hôm trước"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent font-bold font-mono-nums text-white focus:outline-none px-1"
                />
                <button
                  type="button"
                  onClick={() => handleStepDay(1)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300"
                  title="Hôm sau"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(getTodayDateString())}
                  className="ml-1 text-[11px] font-bold text-amber-400 hover:underline"
                >
                  Hôm nay
                </button>
              </div>
            )}

            {periodType === 'week' && (
              <div className="flex items-center gap-1 bg-slate-900/90 px-2 py-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => handleStepWeek(-1)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300"
                  title="Tuần trước"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-bold text-white font-mono-nums px-2">
                  {periodSummary.periodLabel}
                </span>
                <button
                  type="button"
                  onClick={() => handleStepWeek(1)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300"
                  title="Tuần sau"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedWeekDate(getTodayDateString())}
                  className="ml-1 text-[11px] font-bold text-amber-400 hover:underline"
                >
                  Tuần này
                </button>
              </div>
            )}

            {periodType === 'month' && (
              <div className="flex items-center gap-1 bg-slate-900/90 px-2 py-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => handleStepMonth(-1)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300"
                  title="Tháng trước"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-bold text-white font-mono-nums px-2">
                  Tháng {String(selectedMonth).padStart(2, '0')}/{selectedYear}
                </span>
                <button
                  type="button"
                  onClick={() => handleStepMonth(1)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300"
                  title="Tháng sau"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMonth(new Date().getMonth() + 1);
                    setSelectedYear(new Date().getFullYear());
                  }}
                  className="ml-1 text-[11px] font-bold text-amber-400 hover:underline"
                >
                  Tháng này
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 3 Accounting Tiles */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Net Cash in Drawer */}
          <div className="rounded-2xl bg-slate-800/90 p-4 border border-slate-700/80 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-emerald-400 mb-1">
              <span className="flex items-center gap-1.5 font-bold">
                <Banknote className="h-4 w-4" />
                Tiền Mặt Két ({periodType === 'day' ? 'Ngày' : periodType === 'week' ? 'Tuần' : 'Tháng'})
              </span>
              <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold">
                ∑ Két
              </span>
            </div>
            <div className="text-2xl font-black font-mono-nums text-white">
              {formatCurrencyVND(periodSummary.netCash)}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 font-mono-nums">
              <span>Thu: +{formatCurrencyVND(periodSummary.cashInflow)}</span>
              <span className="text-rose-400">Thối: -{formatCurrencyVND(periodSummary.cashOutflow)}</span>
            </div>
          </div>

          {/* Net Transfer in Bank */}
          <div className="rounded-2xl bg-slate-800/90 p-4 border border-slate-700/80 shadow-xs">
            <div className="flex items-center justify-between text-xs font-medium text-blue-400 mb-1">
              <span className="flex items-center gap-1.5 font-bold">
                <CreditCard className="h-4 w-4" />
                Tiền Tài Khoản Ngân Hàng
              </span>
              <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold">
                ∑ CK
              </span>
            </div>
            <div className="text-2xl font-black font-mono-nums text-white">
              {formatCurrencyVND(periodSummary.netTransfer)}
            </div>
            <div className="mt-1 text-[11px] text-slate-400 font-mono-nums">
              Đối soát số dư tài khoản ngân hàng
            </div>
          </div>

          {/* Total Net Revenue Recognized */}
          <div className="rounded-2xl bg-gradient-to-br from-indigo-900/90 to-blue-900/90 p-4 border border-blue-600/50 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-amber-300 mb-1">
              <span>TỔNG DOANH THU THỰC NHẬN</span>
              <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[10px] text-amber-300 font-bold">
                Két + Ngân Hàng
              </span>
            </div>
            <div className="text-2xl font-black font-mono-nums text-amber-400">
              {formatCurrencyVND(periodSummary.totalRevenueRecognized)}
            </div>
            <div className="mt-1 text-[11px] text-slate-300">
              {filteredPayments.length} Giao dịch dòng tiền trong kỳ
            </div>
          </div>
        </div>
      </div>

      {/* 2. SUB-TABS & DATA TABLES */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        {/* Sub-tab Navigation */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('ledger')}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs sm:text-sm font-black transition ${
                activeSubTab === 'ledger'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <Receipt className="h-4 w-4" />
              <span>Sổ Quỹ Dòng Tiền (Payments Ledger)</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">
                {filteredPayments.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('bookings')}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs sm:text-sm font-black transition ${
                activeSubTab === 'bookings'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Nhật Ký Phiếu Thuê (Bookings)</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">
                {filteredBookings.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('audit')}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs sm:text-sm font-black transition ${
                activeSubTab === 'audit'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <Clock className="h-4 w-4 text-amber-500" />
              <span>Nhật Ký Xóa Phòng & Chốt Ca</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">
                {filteredAuditLogs.length}
              </span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center gap-3 py-3 text-xs border-b border-slate-100">
          {activeSubTab === 'ledger' && (
            <>
              {/* Payment Method Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Phương thức:</span>
                <select
                  value={selectedPaymentMethod}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-semibold text-slate-800"
                >
                  <option value="all">Tất cả (TM + CK)</option>
                  <option value="cash">Tiền mặt (Két)</option>
                  <option value="transfer">Chuyển khoản (CK)</option>
                </select>
              </div>

              {/* Payment Type Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Loại giao dịch:</span>
                <select
                  value={selectedPaymentType}
                  onChange={(e) => setSelectedPaymentType(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-semibold text-slate-800"
                >
                  <option value="all">Tất cả loại giao dịch</option>
                  <option value="advance">Thu trước / Cọc giữ phòng (Advance/Deposit)</option>
                  <option value="settlement">Thanh toán trả phòng (Settlement)</option>
                  <option value="refund">Thối tiền thừa (Refund)</option>
                  <option value="expense">Phiếu chi tiền (Expense)</option>
                </select>
              </div>
            </>
          )}

          {/* Room Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Phòng:</span>
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-semibold text-slate-800"
            >
              <option value="all">Tất cả phòng</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.room_number}>
                  Phòng {r.room_number}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo phòng, mã, ghi chú..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1 text-xs text-slate-900 focus:outline-none"
            />
          </div>
        </div>

        {/* 2.1 TAB A: SỔ QUỸ DÒNG TIỀN (PAYMENTS LEDGER TABLE) */}
        {activeSubTab === 'ledger' && (
          <div className="mt-3 space-y-3">
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-black uppercase tracking-wider text-[11px]">
                    <th className="p-3">Mã GD</th>
                    <th className="p-3">Thời Điểm</th>
                    <th className="p-3">Phòng / Mã Đơn</th>
                    <th className="p-3 text-center">Loại Dòng Tiền</th>
                    <th className="p-3 text-center">Phương Thức</th>
                    <th className="p-3 text-right">Số Tiền (VND)</th>
                    <th className="p-3">Nội Dung & Đối Soát</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium bg-white">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Receipt className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                        <p className="text-sm font-semibold">Chưa có giao dịch dòng tiền nào trong kỳ này</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedPayments.map((p) => {
                      const isPositive = Number(p.amount) >= 0;
                      const isExpense = p.payment_type === 'expense' || String(p.room_number) === 'CHI';
                      const typeInfo = isExpense
                        ? { label: 'Phiếu Chi Tiền', color: 'bg-rose-100 text-rose-900 border-rose-300' }
                        : paymentTypeLabels[p.payment_type] || {
                            label: p.payment_type,
                            color: 'bg-slate-100 text-slate-700',
                          };

                      return (
                        <tr key={p.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-mono-nums font-bold text-slate-700">
                            #{p.id}
                          </td>
                          <td className="p-3 font-mono-nums text-[11px] text-slate-500">
                            {formatDateTimeDisplay(p.created_at)}
                          </td>
                          <td className="p-3">
                            <span className={`font-black block ${isExpense ? 'text-rose-700' : 'text-slate-950'}`}>
                              {isExpense ? '[-] PHIẾU CHI' : `P.${p.room_number}`}
                            </span>
                            {p.booking_id && (
                              <span className="text-[10px] text-slate-400">Đơn #{p.booking_id}</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold border ${typeInfo.color}`}>
                              {typeInfo.label}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {p.method === 'transfer' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                                <CreditCard className="h-3 w-3" />
                                Chuyển khoản (CK)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                <Banknote className="h-3 w-3" />
                                Tiền mặt (TM)
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono-nums text-sm font-black">
                            <span className={isPositive ? 'text-emerald-700' : 'text-rose-600'}>
                              {isPositive ? `+${formatCurrencyVND(p.amount)}` : formatCurrencyVND(p.amount)}
                            </span>
                          </td>
                          <td className="p-3 text-slate-700 text-[11px]">
                            {p.note || '---'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls for Payments Ledger (10 items / page) */}
            {filteredPayments.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                <div className="text-slate-600 font-medium">
                  Hiển thị <strong className="text-slate-900 font-mono-nums">{(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, filteredPayments.length)}</strong> trên tổng số <strong className="text-slate-900 font-mono-nums">{filteredPayments.length}</strong> giao dịch (10 dòng/trang)
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Trang đầu"
                  >
                    « Đầu
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-0.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Trước</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPaymentPages }, (_, i) => i + 1)
                      .filter((p) => Math.abs(p - currentPage) <= 2 || p === 1 || p === totalPaymentPages)
                      .map((p, idx, arr) => {
                        const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                        return (
                          <div key={p} className="flex items-center">
                            {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                            <button
                              type="button"
                              onClick={() => setCurrentPage(p)}
                              className={`h-7 w-7 rounded-lg text-xs font-black font-mono-nums transition ${
                                currentPage === p
                                  ? 'bg-slate-900 text-white shadow-xs'
                                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {p}
                            </button>
                          </div>
                        );
                      })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPaymentPages, p + 1))}
                    disabled={currentPage === totalPaymentPages}
                    className="flex items-center gap-0.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>Sau</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPaymentPages)}
                    disabled={currentPage === totalPaymentPages}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Trang cuối"
                  >
                    Cuối »
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2.2 TAB B: NHẬT KÝ PHIẾU THUÊ PHÒNG (BOOKINGS TABLE) */}
        {activeSubTab === 'bookings' && (
          <div className="mt-3 space-y-3">
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-black uppercase tracking-wider text-[11px]">
                    <th className="p-3">Mã Đơn</th>
                    <th className="p-3">Phòng & Khách</th>
                    <th className="p-3">Giờ Vào - Giờ Ra</th>
                    <th className="p-3 text-center">Minibar (B/N/NG)</th>
                    <th className="p-3 text-right">Tiền Phòng</th>
                    <th className="p-3 text-right">Phụ Thu</th>
                    <th className="p-3 text-right">Tổng Bill</th>
                    <th className="p-3 text-right">Đã Thu Trước / Đóng</th>
                    <th className="p-3 text-center">Trạng Thái</th>
                    <th className="p-3">Ghi Chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium bg-white">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <p className="text-sm font-semibold">Chưa có phiếu thuê phòng nào trong kỳ này</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono-nums font-bold text-slate-800">
                          #{b.id}
                        </td>
                        <td className="p-3">
                          <span className="font-black text-slate-950 block">P.{b.room_number}</span>
                          <span className="text-[11px] text-slate-600 block">
                            {b.customer_name || 'Khách vãng lai'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {rentalTypeNames[b.rental_type] || b.rental_type}
                          </span>
                        </td>
                        <td className="p-3 font-mono-nums text-[11px]">
                          <div>Vào: {formatTimeOnlyDisplay(b.check_in)}</div>
                          <div className="text-slate-500">Ra: {formatTimeOnlyDisplay(b.check_out)}</div>
                        </td>
                        <td className="p-3 text-center font-mono-nums">
                          {b.beer_qty > 0 || b.water_qty > 0 || b.soft_drink_qty > 0 ? (
                            <span className="rounded bg-purple-50 px-1.5 py-0.5 text-purple-700 font-bold border border-purple-200 text-[10px]">
                              {b.beer_qty}B / {b.water_qty}N / {b.soft_drink_qty}NG
                            </span>
                          ) : (
                            '0'
                          )}
                        </td>
                        <td className="p-3 text-right font-mono-nums">
                          {formatCurrencyVND(b.room_amount)}
                        </td>
                        <td className="p-3 text-right font-mono-nums">
                          {b.surcharge_amount > 0 ? `+${formatCurrencyVND(b.surcharge_amount)}` : '0'}
                        </td>
                        <td className="p-3 text-right font-mono-nums font-black text-slate-950">
                          {formatCurrencyVND(b.total_amount)}
                        </td>
                        <td className="p-3 text-right font-mono-nums font-bold text-emerald-700">
                          {formatCurrencyVND(b.paid_amount)}
                        </td>
                        <td className="p-3 text-center">
                          {b.status === 'completed' ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              Hoàn tất
                            </span>
                          ) : b.status === 'active' ? (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 animate-pulse">
                              Đang ở
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                              Đã hủy
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600 text-[11px] max-w-[140px] truncate">
                          {b.surcharge_reason || b.notes || '---'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls for Bookings (10 items / page) */}
            {filteredBookings.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                <div className="text-slate-600 font-medium">
                  Hiển thị <strong className="text-slate-900 font-mono-nums">{(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, filteredBookings.length)}</strong> trên tổng số <strong className="text-slate-900 font-mono-nums">{filteredBookings.length}</strong> phiếu thuê (10 dòng/trang)
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Trang đầu"
                  >
                    « Đầu
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-0.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Trước</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalBookingPages }, (_, i) => i + 1)
                      .filter((p) => Math.abs(p - currentPage) <= 2 || p === 1 || p === totalBookingPages)
                      .map((p, idx, arr) => {
                        const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                        return (
                          <div key={p} className="flex items-center">
                            {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                            <button
                              type="button"
                              onClick={() => setCurrentPage(p)}
                              className={`h-7 w-7 rounded-lg text-xs font-black font-mono-nums transition ${
                                currentPage === p
                                  ? 'bg-slate-900 text-white shadow-xs'
                                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {p}
                            </button>
                          </div>
                        );
                      })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalBookingPages, p + 1))}
                    disabled={currentPage === totalBookingPages}
                    className="flex items-center gap-0.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>Sau</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalBookingPages)}
                    disabled={currentPage === totalBookingPages}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Trang cuối"
                  >
                    Cuối »
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AUDIT LOG (NHẬT KÝ XÓA PHÒNG & THỜI GIAN CHỐT CA) */}
        {activeSubTab === 'audit' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAuditFilter('all')}
                  className={`rounded-xl px-3 py-1.5 font-bold transition ${
                    auditFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Tất Cả ({auditLogs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAuditFilter('deleted')}
                  className={`rounded-xl px-3 py-1.5 font-bold transition ${
                    auditFilter === 'deleted'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  ⚠️ Phòng Đã Xóa / Hủy
                </button>
                <button
                  type="button"
                  onClick={() => setAuditFilter('shift')}
                  className={`rounded-xl px-3 py-1.5 font-bold transition ${
                    auditFilter === 'shift'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  🔒 Thời Gian Chốt Ca
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm phòng, tiền, nội dung..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3">Thời Gian</th>
                    <th className="p-3">Sự Kiện</th>
                    <th className="p-3">Chi Tiết Sự Kiện (Phòng / Tiền / Thời Điểm Chốt)</th>
                    <th className="p-3 text-center">Người Thực Hiện</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400">
                        <Clock className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                        <p className="text-sm font-semibold">Không có bản ghi nhật ký nào phù hợp</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => {
                      const isDelete = (log.action || '').toLowerCase().includes('xóa') || (log.action || '').toLowerCase().includes('hủy');
                      const isShift = (log.action || '').toLowerCase().includes('chốt') || (log.action || '').toLowerCase().includes('khóa');

                      return (
                        <tr key={log.id} className={`hover:bg-slate-50 transition ${isDelete ? 'bg-rose-50/20' : isShift ? 'bg-amber-50/20' : ''}`}>
                          <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap font-bold">
                            {formatDateTimeDisplay(log.timestamp)}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              isDelete
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : isShift
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-slate-100 text-slate-800 border-slate-200'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3 text-slate-800 font-medium">{log.details}</td>
                          <td className="p-3 text-center font-bold text-slate-600">{log.user || 'Lễ tân'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
