import { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  Lock,
  Unlock,
  Printer,
  FileSpreadsheet,
  Banknote,
  CreditCard,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Receipt,
  BookOpen,
  FileText,
  Clock,
  Layers,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Building,
  Coins,
} from 'lucide-react';
import {
  HOTEL_CONFIG,
  getTodayDateString,
  getStartAndEndOfWeek,
  getStartAndEndOfMonth,
  formatDateTimeDisplay,
  formatTimeOnlyDisplay,
  formatCurrencyVND,
  hotelStore,
} from '../services/hotelStore';

export default function DailyCloseoutDetailModal({
  isOpen,
  onClose,
  initialDate = getTodayDateString(),
  initialPeriod = 'day',
  onOpenClosureModal,
  onReopenClosure,
}) {
  const [periodType, setPeriodType] = useState(initialPeriod || 'day'); // 'day' | 'week' | 'month'
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedWeekDate, setSelectedWeekDate] = useState(initialDate);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'ledger' | 'bookings' | 'printable'

  const detail = useMemo(() => {
    return hotelStore.getPeriodSummary({
      periodType,
      targetDate: selectedDate,
      targetWeekDate: selectedWeekDate,
      targetMonth: selectedMonth,
      targetYear: selectedYear,
    });
  }, [periodType, selectedDate, selectedWeekDate, selectedMonth, selectedYear, isOpen]);

  if (!isOpen || !detail) return null;

  // Steppers
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

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const csvData = hotelStore.exportDailyAuditCSV(detail.startDateStr);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bao_cao_quyet_toan_${detail.startDateStr}_${detail.endDateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const paymentTypeLabels = {
    advance: { label: 'Thu Trước / Tạm Ứng', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
    deposit: { label: 'Thu Trước', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
    settlement: { label: 'Thanh Toán', color: 'bg-blue-100 text-blue-900 border-blue-300' },
    refund: { label: 'Thối Lại / Hoàn', color: 'bg-rose-100 text-rose-900 border-rose-300' },
  };

  const rentalTypeNames = {
    hourly: 'Theo Giờ',
    overnight: 'Qua Đêm',
    daily: 'Ngày Đêm',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-3 sm:p-5 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative my-4 w-full max-w-4xl rounded-3xl bg-white p-5 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
                  Xem Lại Báo Cáo Chốt Tiền & Đối Soát
                </h2>
                {detail.isClosed ? (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Đã khóa {detail.closuresCount} ca
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-300">
                    <Clock className="h-3.5 w-3.5" />
                    Chưa khóa sổ ca
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Kỳ đối soát: <strong className="text-slate-800 font-mono-nums">{detail.periodLabel}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
            {/* Period Selector: Day / Week / Month */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setPeriodType('day')}
                className={`rounded-xl px-2.5 py-1 text-xs font-bold transition ${
                  periodType === 'day'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ngày
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('week')}
                className={`rounded-xl px-2.5 py-1 text-xs font-bold transition ${
                  periodType === 'week'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tuần
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('month')}
                className={`rounded-xl px-2.5 py-1 text-xs font-bold transition ${
                  periodType === 'month'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tháng
              </button>
            </div>

            {/* Stepper Control */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
              {periodType === 'day' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleStepDay(-1)}
                    className="p-1 rounded-xl hover:bg-white text-slate-600 shadow-xs"
                    title="Hôm trước"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-2 py-0.5 font-bold font-mono-nums text-slate-900 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleStepDay(1)}
                    className="p-1 rounded-xl hover:bg-white text-slate-600 shadow-xs"
                    title="Hôm sau"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}

              {periodType === 'week' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleStepWeek(-1)}
                    className="p-1 rounded-xl hover:bg-white text-slate-600 shadow-xs"
                    title="Tuần trước"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="font-bold text-slate-800 font-mono-nums px-2">
                    {detail.periodLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStepWeek(1)}
                    className="p-1 rounded-xl hover:bg-white text-slate-600 shadow-xs"
                    title="Tuần sau"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}

              {periodType === 'month' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleStepMonth(-1)}
                    className="p-1 rounded-xl hover:bg-white text-slate-600 shadow-xs"
                    title="Tháng trước"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="font-bold text-slate-800 font-mono-nums px-2">
                    Tháng {String(selectedMonth).padStart(2, '0')}/{selectedYear}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStepMonth(1)}
                    className="p-1 rounded-xl hover:bg-white text-slate-600 shadow-xs"
                    title="Tháng sau"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto pr-1 py-4 space-y-5 flex-1">
          {/* 1. TOP 4 KEY METRIC CARDS */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Net Cash in Drawer */}
            <div className="rounded-2xl bg-white p-4 border border-emerald-200/80 shadow-xs bg-gradient-to-br from-emerald-50/50 to-white">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-800 mb-1">
                <span className="flex items-center gap-1.5">
                  <Banknote className="h-4 w-4 text-emerald-600" />
                  Két Tiền Mặt Thực Tế
                </span>
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-800">
                  ∑ Két
                </span>
              </div>
              <div className="text-xl font-black font-mono-nums text-emerald-700">
                {formatCurrencyVND(detail.netCash)}
              </div>
              <div className="mt-1 text-[10px] text-slate-500 font-mono-nums flex justify-between">
                <span>Thu: +{formatCurrencyVND(detail.cashInflow)}</span>
                <span className="text-rose-500">Thối: -{formatCurrencyVND(detail.cashOutflow)}</span>
              </div>
            </div>

            {/* Card 2: Net Transfer */}
            <div className="rounded-2xl bg-white p-4 border border-blue-200/80 shadow-xs bg-gradient-to-br from-blue-50/50 to-white">
              <div className="flex items-center justify-between text-xs font-bold text-blue-800 mb-1">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  Tài Khoản Chuyển Khoản (CK)
                </span>
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-800">
                  ∑ CK
                </span>
              </div>
              <div className="text-xl font-black font-mono-nums text-blue-700">
                {formatCurrencyVND(detail.netTransfer)}
              </div>
              <div className="mt-1 text-[10px] text-slate-500">
                Đối soát khớp biến động số dư ngân hàng
              </div>
            </div>

            {/* Card 3: Grand Revenue Recognized */}
            <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-4 text-white shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-amber-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" />
                  Tổng Thu Thực Nhận
                </span>
                <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] text-amber-300">
                  Két + CK
                </span>
              </div>
              <div className="text-xl font-black font-mono-nums text-amber-400">
                {formatCurrencyVND(detail.totalRevenueRecognized)}
              </div>
              <div className="mt-1 text-[10px] text-slate-300">
                {detail.dayPayments.length} Giao dịch dòng tiền trong kỳ
              </div>
            </div>

            {/* Card 4: Revenue Structure */}
            <div className="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-xs bg-gradient-to-br from-purple-50/50 to-white">
              <div className="flex items-center justify-between text-xs font-bold text-purple-900 mb-1">
                <span className="flex items-center gap-1.5">
                  <Building className="h-4 w-4 text-purple-700" />
                  Cơ Cấu Doanh Thu
                </span>
                <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] text-purple-800">
                  Phòng & Dịch Vụ
                </span>
              </div>
              <div className="text-xs font-bold text-slate-800 space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-normal">Tiền phòng:</span>
                  <span className="font-mono-nums text-slate-900">{formatCurrencyVND(detail.roomRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-normal">Minibar:</span>
                  <span className="font-mono-nums text-purple-700">{formatCurrencyVND(detail.serviceRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-normal">Phụ thu:</span>
                  <span className="font-mono-nums text-slate-900">{formatCurrencyVND(detail.surchargeRevenue)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. CLOSED SHIFTS IN THIS PERIOD */}
          {detail.existingClosures.length > 0 && (
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-amber-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Danh Sách Các Ca Đã Khóa Sổ ({detail.existingClosures.length} ca)
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  Ghi nhận từ bảng `shift_closures`
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {detail.existingClosures.map((closure) => (
                  <div
                    key={closure.id}
                    className="rounded-xl bg-white p-3 border border-slate-200 shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-xs rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-200 px-2 py-0.5">
                          {closure.shift_name}
                        </span>
                        <span className="text-xs font-bold font-mono-nums text-slate-600">
                          {closure.closed_date}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono-nums text-slate-500">
                        {formatDateTimeDisplay(closure.created_at)}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Két tiền mặt:</span>
                        <span className="font-mono-nums font-bold text-emerald-700">
                          {formatCurrencyVND(closure.net_cash)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Chuyển khoản:</span>
                        <span className="font-mono-nums font-bold text-blue-700">
                          {formatCurrencyVND(closure.net_transfer)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Tổng doanh thu:</span>
                        <span className="font-mono-nums font-black text-amber-700">
                          {formatCurrencyVND(closure.total_revenue_recognized)}
                        </span>
                      </div>
                    </div>

                    {closure.notes && (
                      <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg italic">
                        <strong>Ghi chú bàn giao:</strong> {closure.notes}
                      </div>
                    )}

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => onReopenClosure(closure.id)}
                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1"
                      >
                        <Unlock className="h-3 w-3" />
                        <span>Mở lại ca này</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. SUB-TABS NAVIGATION */}
          <div className="border-b border-slate-200 flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition ${
                activeTab === 'summary'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Tổng Quan & Đối Soát</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition ${
                activeTab === 'ledger'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="h-4 w-4" />
              <span>Sổ Quỹ Dòng Tiền ({detail.dayPayments.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('bookings')}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition ${
                activeTab === 'bookings'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Phiếu Thuê Phòng ({detail.dayBookings.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('printable')}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition ${
                activeTab === 'printable'
                  ? 'border-amber-500 text-amber-700'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Printer className="h-4 w-4 text-amber-600" />
              <span>Bản In Quyết Toán Kỳ</span>
            </button>
          </div>

          {/* 3.1 TAB: SUMMARY & BREAKDOWN */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Breakdown by Payment Types */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Receipt className="h-4 w-4 text-blue-600" />
                    Phân Loại Dòng Tiền Phát Sinh
                  </h4>

                  <div className="space-y-2 text-xs">
                    {/* Advance Payments */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                      <div>
                        <span className="font-bold text-emerald-900">Tiền Thu Trước / Tạm Ứng</span>
                        <div className="text-[10px] text-emerald-700">
                          {detail.paymentsByType.advance?.count || detail.paymentsByType.deposit?.count || 0} lần thu trước
                        </div>
                      </div>
                      <div className="text-right font-mono-nums font-bold text-emerald-900">
                        {formatCurrencyVND((detail.paymentsByType.advance?.total || 0) + (detail.paymentsByType.deposit?.total || 0))}
                      </div>
                    </div>

                    {/* Settlements */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50 border border-blue-100">
                      <div>
                        <span className="font-bold text-blue-900">Tiền Thanh Toán Trả Phòng</span>
                        <div className="text-[10px] text-blue-700">
                          {detail.paymentsByType.settlement?.count || 0} lần thanh toán hoàn tất
                        </div>
                      </div>
                      <div className="text-right font-mono-nums font-bold text-blue-900">
                        {formatCurrencyVND(detail.paymentsByType.settlement?.total || 0)}
                      </div>
                    </div>

                    {/* Refunds */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50 border border-rose-100">
                      <div>
                        <span className="font-bold text-rose-900">Tiền Thối Lại / Hoàn Trả</span>
                        <div className="text-[10px] text-rose-700">
                          {detail.paymentsByType.refund?.count || 0} lần thối tiền mặt
                        </div>
                      </div>
                      <div className="text-right font-mono-nums font-bold text-rose-700">
                        {formatCurrencyVND(detail.paymentsByType.refund?.total || 0)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Minibar & Room Statistics */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Building className="h-4 w-4 text-purple-600" />
                    Thống Kê Phòng & Tiêu Thụ Minibar
                  </h4>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-600">Lượt thuê theo giờ:</span>
                      <span className="font-bold font-mono-nums text-slate-900">
                        {detail.bookingsByType.hourly || 0} lượt
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-600">Lượt thuê qua đêm:</span>
                      <span className="font-bold font-mono-nums text-slate-900">
                        {detail.bookingsByType.overnight || 0} lượt
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-600">Lượt thuê ngày đêm:</span>
                      <span className="font-bold font-mono-nums text-slate-900">
                        {detail.bookingsByType.daily || 0} lượt
                      </span>
                    </div>

                    {/* Minibar items count */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-purple-50 border border-purple-100 font-semibold text-purple-900">
                      <span>Tổng Minibar tiêu thụ:</span>
                      <span className="font-mono-nums">
                        {detail.totalBeerQty} Bia • {detail.totalWaterQty} Nước • {detail.totalSoftDrinkQty} Nước ngọt
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3.2 TAB: PAYMENTS LEDGER TABLE */}
          {activeTab === 'ledger' && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3">Mã GD</th>
                    <th className="p-3">Thời Điểm</th>
                    <th className="p-3">Phòng</th>
                    <th className="p-3 text-center">Loại Dòng Tiền</th>
                    <th className="p-3 text-center">Phương Thức</th>
                    <th className="p-3 text-right">Số Tiền</th>
                    <th className="p-3">Ghi Chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {detail.dayPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Không có giao dịch dòng tiền nào trong kỳ {detail.periodLabel}
                      </td>
                    </tr>
                  ) : (
                    detail.dayPayments.map((p) => {
                      const isPositive = Number(p.amount) >= 0;
                      const typeInfo = paymentTypeLabels[p.payment_type] || {
                        label: p.payment_type,
                        color: 'bg-slate-100 text-slate-700',
                      };
                      return (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="p-3 font-mono-nums font-bold text-slate-700">#{p.id}</td>
                          <td className="p-3 font-mono-nums text-[11px] text-slate-500">
                            {formatDateTimeDisplay(p.created_at)}
                          </td>
                          <td className="p-3 font-bold text-slate-900">P.{p.room_number}</td>
                          <td className="p-3 text-center">
                            <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold border ${typeInfo.color}`}>
                              {typeInfo.label}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {p.method === 'transfer' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                                <CreditCard className="h-3 w-3" />
                                Chuyển khoản (CK)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
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
                          <td className="p-3 text-slate-600 text-[11px] max-w-[200px] truncate">
                            {p.note || '---'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 3.3 TAB: BOOKINGS TABLE */}
          {activeTab === 'bookings' && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3">Mã Đơn</th>
                    <th className="p-3">Phòng & Khách</th>
                    <th className="p-3">Giờ Vào - Giờ Ra</th>
                    <th className="p-3 text-center">Minibar</th>
                    <th className="p-3 text-right">Tiền Phòng</th>
                    <th className="p-3 text-right">Phụ Thu</th>
                    <th className="p-3 text-right">Tổng Bill</th>
                    <th className="p-3 text-right">Đã Thu</th>
                    <th className="p-3 text-center">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {detail.dayBookings.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        Không có phiếu thuê phòng nào phát sinh trong kỳ {detail.periodLabel}
                      </td>
                    </tr>
                  ) : (
                    detail.dayBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono-nums font-bold text-slate-800">#{b.id}</td>
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
                        <td className="p-3 text-center font-mono-nums text-[10px]">
                          {b.beer_qty > 0 || b.water_qty > 0 || b.soft_drink_qty > 0 ? (
                            <span className="rounded bg-purple-50 px-1.5 py-0.5 text-purple-700 font-bold border border-purple-200">
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
                              {b.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 3.4 TAB: PRINTABLE VOUCHER */}
          {activeTab === 'printable' && (
            <div
              id="printable-daily-closure"
              className="rounded-2xl border border-dashed border-slate-400 bg-white p-6 sm:p-8 text-slate-800 font-sans shadow-sm max-w-2xl mx-auto space-y-4"
            >
              {/* Print Header */}
              <div className="text-center border-b border-dashed border-slate-300 pb-4">
                <h2 className="text-base font-black tracking-tight text-slate-950 uppercase">
                  {HOTEL_CONFIG.hotelName}
                </h2>
                <p className="text-[11px] text-slate-600 mt-0.5">{HOTEL_CONFIG.address}</p>
                <p className="text-[11px] text-slate-600">Hotline: {HOTEL_CONFIG.phone}</p>

                <div className="mt-3 inline-block rounded-lg bg-slate-900 px-4 py-1.5 text-white">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider">
                    BIÊN BẢN ĐỐI SOÁT & QUYẾT TOÁN DOANH THU ({periodType === 'day' ? 'NGÀY' : periodType === 'week' ? 'TUẦN' : 'THÁNG'})
                  </h3>
                </div>
                <p className="text-[11px] font-bold text-slate-800 mt-1 font-mono-nums">
                  Kỳ đối soát: {detail.periodLabel} • Thời điểm in: {new Date().toLocaleTimeString('vi-VN')} {new Date().toLocaleDateString('vi-VN')}
                </p>
              </div>

              {/* I. BẢNG KÊ DÒNG TIỀN */}
              <div className="space-y-2 border-b border-dashed border-slate-300 pb-4 text-xs">
                <h4 className="font-black text-slate-900 uppercase text-[11px]">
                  I. BẢNG KÊ THỰC THU DÒNG TIỀN (CASH & BANK)
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
                    <span className="text-slate-600 block text-[11px]">1. Két Tiền Mặt Thực Tế:</span>
                    <span className="font-mono-nums font-black text-emerald-800 text-sm">
                      {formatCurrencyVND(detail.netCash)}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      (Thu: +{formatCurrencyVND(detail.cashInflow)} | Thối: -{formatCurrencyVND(detail.cashOutflow)})
                    </div>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
                    <span className="text-slate-600 block text-[11px]">2. Tài Khoản Chuyển Khoản (CK):</span>
                    <span className="font-mono-nums font-black text-blue-800 text-sm">
                      {formatCurrencyVND(detail.netTransfer)}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      ({HOTEL_CONFIG.bankName} - STK: {HOTEL_CONFIG.bankAccount})
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-100 font-bold border border-slate-300 mt-2">
                  <span className="text-xs uppercase text-slate-900">TỔNG DOANH THU THỰC NHẬN:</span>
                  <span className="font-mono-nums text-base font-black text-slate-950">
                    {formatCurrencyVND(detail.totalRevenueRecognized)}
                  </span>
                </div>
              </div>

              {/* II. CƠ CẤU DOANH THU */}
              <div className="space-y-2 border-b border-dashed border-slate-300 pb-4 text-xs">
                <h4 className="font-black text-slate-900 uppercase text-[11px]">
                  II. CƠ CẤU DOANH THU THEO HẠNG MỤC
                </h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-600">- Doanh thu tiền phòng ({detail.dayBookings.length} lượt):</span>
                    <span className="font-mono-nums font-bold text-slate-900">{formatCurrencyVND(detail.roomRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">- Doanh thu Minibar / Nước uống ({detail.totalBeerQty}B / {detail.totalWaterQty}N / {detail.totalSoftDrinkQty}NG):</span>
                    <span className="font-mono-nums font-bold text-purple-700">{formatCurrencyVND(detail.serviceRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">- Phụ thu (Check-in/out trễ, quá người...):</span>
                    <span className="font-mono-nums font-bold text-slate-900">{formatCurrencyVND(detail.surchargeRevenue)}</span>
                  </div>
                </div>
              </div>

              {/* III. CHỮ KÝ BÀN GIAO */}
              <div className="pt-4 text-xs">
                <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div>
                    <p className="font-bold text-slate-900">Người Lập Báo Cáo</p>
                    <p className="text-[10px] text-slate-500 italic">(Ký & ghi rõ họ tên)</p>
                    <div className="h-14" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Thủ Quỹ / Kế Toán</p>
                    <p className="text-[10px] text-slate-500 italic">(Ký & ghi rõ họ tên)</p>
                    <div className="h-14" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Chủ Khách Sạn / Giám Đốc</p>
                    <p className="text-[10px] text-slate-500 italic">(Ký duyệt)</p>
                    <div className="h-14" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-100 pt-4 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition"
            >
              <Printer className="h-4 w-4" />
              <span>In Phiếu Quyết Toán</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Xuất File CSV Kỳ Này</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenClosureModal(detail.startDateStr);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-sm hover:bg-amber-400 transition"
            >
              <Lock className="h-4 w-4" />
              <span>Khóa Sổ Ca Cho Ngày Này</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
