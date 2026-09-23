import { useState, useMemo } from 'react';
import {
  CalendarCheck,
  Lock,
  Banknote,
  CreditCard,
  TrendingUp,
  Search,
  Eye,
  Printer,
  Calendar,
  Sparkles,
  Unlock,
  ShieldCheck,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  formatDateTimeDisplay,
  formatCurrencyVND,
  getTodayDateString,
  getStartAndEndOfWeek,
  getStartAndEndOfMonth,
  hotelStore,
} from '../services/hotelStore';

export default function ClosureHistory({
  closures = [],
  onReopenClosure,
  onOpenDetailModal,
  onOpenClosureModal,
}) {
  const [periodType, setPeriodType] = useState('all'); // 'all' | 'day' | 'week' | 'month'
  const [inspectDate, setInspectDate] = useState(getTodayDateString());
  const [selectedWeekDate, setSelectedWeekDate] = useState(getTodayDateString());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');

  // Date range depending on periodType
  const dateRange = useMemo(() => {
    if (periodType === 'day') {
      return {
        startDate: inspectDate,
        endDate: inspectDate,
        label: `Ngày ${inspectDate}`,
      };
    }
    if (periodType === 'week') {
      const w = getStartAndEndOfWeek(new Date(selectedWeekDate));
      return {
        startDate: w.startDateStr,
        endDate: w.endDateStr,
        label: w.label,
      };
    }
    if (periodType === 'month') {
      const m = getStartAndEndOfMonth(selectedYear, selectedMonth);
      return {
        startDate: m.startDateStr,
        endDate: m.endDateStr,
        label: m.label,
      };
    }
    return {
      startDate: '1970-01-01',
      endDate: '2099-12-31',
      label: 'Toàn Bộ Thời Gian',
    };
  }, [periodType, inspectDate, selectedWeekDate, selectedMonth, selectedYear]);

  // Filtered closures
  const filteredClosures = useMemo(() => {
    return closures.filter((c) => {
      if (periodType !== 'all') {
        if (c.closed_date < dateRange.startDate || c.closed_date > dateRange.endDate) {
          return false;
        }
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchDate = (c.closed_date || '').toLowerCase().includes(term);
        const matchShift = (c.shift_name || '').toLowerCase().includes(term);
        const matchNote = (c.notes || '').toLowerCase().includes(term);
        if (!matchDate && !matchShift && !matchNote) return false;
      }

      return true;
    });
  }, [closures, periodType, dateRange, searchTerm]);

  // Summary of filtered closures
  const totalStats = useMemo(() => {
    let totalCash = 0;
    let totalTransfer = 0;
    let totalGrand = 0;
    for (const c of filteredClosures) {
      totalCash += Number(c.net_cash) || 0;
      totalTransfer += Number(c.net_transfer) || 0;
      totalGrand += Number(c.total_revenue_recognized) || 0;
    }
    return {
      count: filteredClosures.length,
      totalCash,
      totalTransfer,
      totalGrand,
    };
  }, [filteredClosures]);

  const handleStepDay = (days) => {
    try {
      const parts = inspectDate.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      d.setDate(d.getDate() + days);
      setInspectDate(getTodayDateString(d));
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
      {/* 1. TOP BANNER & STATS CARDS */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-xl border border-slate-700/50">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-700/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <CalendarCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white sm:text-xl">
                Lịch Sử Khóa Sổ Ca & Đối Soát Doanh Thu
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Xem lại báo cáo đối soát theo Ngày, theo Tuần, theo Tháng
              </p>
            </div>
          </div>

          {/* Quick Action Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenDetailModal(inspectDate)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-xs sm:text-sm font-black text-slate-950 shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition"
            >
              <Eye className="h-4 w-4" />
              <span>Xem Báo Cáo Chi Tiết Ngày</span>
            </button>
          </div>
        </div>

        {/* PERIOD MODE SELECTOR: TOÀN BỘ / THEO NGÀY / THEO TUẦN / THEO THÁNG */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-slate-800/70 p-3 rounded-2xl border border-slate-700">
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setPeriodType('all')}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                periodType === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Tất Cả
            </button>
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

          {/* Steppers */}
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
                  value={inspectDate}
                  onChange={(e) => setInspectDate(e.target.value)}
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
                  onClick={() => setInspectDate(getTodayDateString())}
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
                  {dateRange.label}
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

        {/* 3 Metric Tiles */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-800/90 p-4 border border-slate-700/80">
            <div className="flex items-center justify-between text-xs font-medium text-emerald-400 mb-1">
              <span className="flex items-center gap-1.5 font-bold">
                <Banknote className="h-4 w-4" />
                Tổng Tiền Mặt Đã Khóa
              </span>
              <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold">
                {totalStats.count} ca
              </span>
            </div>
            <div className="text-2xl font-black font-mono-nums text-white">
              {formatCurrencyVND(totalStats.totalCash)}
            </div>
            <div className="mt-1 text-[11px] text-slate-400 font-mono-nums">
              Tiền mặt thực tế trong két
            </div>
          </div>

          <div className="rounded-2xl bg-slate-800/90 p-4 border border-slate-700/80">
            <div className="flex items-center justify-between text-xs font-medium text-blue-400 mb-1">
              <span className="flex items-center gap-1.5 font-bold">
                <CreditCard className="h-4 w-4" />
                Tổng Chuyển Khoản Đã Khóa
              </span>
              <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold">
                CK
              </span>
            </div>
            <div className="text-2xl font-black font-mono-nums text-white">
              {formatCurrencyVND(totalStats.totalTransfer)}
            </div>
            <div className="mt-1 text-[11px] text-slate-400 font-mono-nums">
              Đối soát số dư tài khoản ngân hàng
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-indigo-900/90 to-blue-900/90 p-4 border border-blue-600/50">
            <div className="flex items-center justify-between text-xs font-bold text-amber-300 mb-1">
              <span>TỔNG QUYẾT TOÁN CÁC CA</span>
              <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[10px] text-amber-300 font-bold">
                {dateRange.label}
              </span>
            </div>
            <div className="text-2xl font-black font-mono-nums text-amber-400">
              {formatCurrencyVND(totalStats.totalGrand)}
            </div>
            <div className="mt-1 text-[11px] text-slate-300">
              Doanh thu thực nhận tích lũy các ca
            </div>
          </div>
        </div>
      </div>

      {/* 2. TABLE OF CLOSED SHIFTS */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black tracking-tight text-slate-900">
              Danh Sách Các Ca Đã Khóa Sổ ({filteredClosures.length})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm ngày, ca, ghi chú..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3">Ngày Khóa Sổ</th>
                <th className="p-3">Tên Ca</th>
                <th className="p-3 text-right">Tiền Phòng Đã Thu</th>
                <th className="p-3 text-right">Tiền Mặt (Két)</th>
                <th className="p-3 text-right">Chuyển Khoản</th>
                <th className="p-3 text-right">Tổng Thực Thu</th>
                <th className="p-3">Thời Điểm Khóa</th>
                <th className="p-3">Ghi Chú Ca</th>
                <th className="p-3 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredClosures.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Lock className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-sm font-semibold">Chưa có ca nào được khóa sổ trong kỳ {dateRange.label}</p>
                    <p className="text-xs mt-1">
                      Bấm "Khóa sổ ca" ở thanh điều hướng để thực hiện chốt ca
                    </p>
                  </td>
                </tr>
              ) : (
                filteredClosures.map((c) => (
                  <tr key={c.id || c.closed_date} className="hover:bg-slate-50 transition">
                    {/* Date */}
                    <td className="p-3 font-bold font-mono text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>{c.closed_date}</span>
                      </div>
                    </td>

                    {/* Shift Name */}
                    <td className="p-3 font-bold text-slate-800">
                      <span className="rounded-lg bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 text-xs">
                        {c.shift_name || 'Chốt ngày'}
                      </span>
                    </td>

                    {/* Room Revenue */}
                    <td className="p-3 text-right font-mono text-slate-700 font-bold">
                      {formatCurrencyVND(c.room_revenue_collected || 0)}
                    </td>

                    {/* Net Cash */}
                    <td className="p-3 text-right font-mono font-bold text-emerald-800">
                      {formatCurrencyVND(c.net_cash)}
                    </td>

                    {/* Net Transfer */}
                    <td className="p-3 text-right font-mono font-bold text-blue-800">
                      {formatCurrencyVND(c.net_transfer)}
                    </td>

                    {/* Total Recognized Revenue */}
                    <td className="p-3 text-right font-mono font-black text-slate-900 text-sm">
                      {formatCurrencyVND(c.total_revenue_recognized)}
                    </td>

                    {/* Created At */}
                    <td className="p-3 text-slate-500 font-mono text-[11px]">
                      {formatDateTimeDisplay(c.created_at)}
                    </td>

                    {/* Notes */}
                    <td className="p-3.5 text-slate-600 max-w-[180px] truncate text-[11px]">
                      {c.notes || '---'}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenDetailModal(c.closed_date)}
                          className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
                          title="Xem chi tiết & in biên bản quyết toán ca này"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Chi tiết</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onReopenClosure(c.id)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition"
                          title="Mở lại sổ ca này"
                        >
                          <Unlock className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
