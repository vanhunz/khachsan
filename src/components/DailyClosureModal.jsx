import { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Calendar,
  Banknote,
  CreditCard,
  Building2,
  Receipt,
  Wallet,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  getTodayDateString,
  formatCurrencyVND,
  formatDateTimeDisplay,
  hotelStore,
} from '../services/hotelStore';

export default function DailyClosureModal({
  isOpen,
  onClose,
  targetDate = getTodayDateString(),
  onConfirmClosure,
}) {
  const [date, setDate] = useState(targetDate);
  const [shiftName, setShiftName] = useState('Ca sáng (06:00 - 14:00)');
  const [initialCash, setInitialCash] = useState('1000000'); // Mặc định trong ví có sẵn 1.000.000đ
  const [notes, setNotes] = useState('');
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setDate(targetDate || getTodayDateString());
      setShiftName('Ca sáng (06:00 - 14:00)');
      setInitialCash('1000000');
      setNotes('');
      // Load ledger for current shift (since last closure)
      const ledgerSummary = hotelStore.getLedgerSummary(targetDate || getTodayDateString(), 'shift');
      setSummary(ledgerSummary);
    }
  }, [isOpen, targetDate]);

  useEffect(() => {
    if (isOpen && date) {
      const ledgerSummary = hotelStore.getLedgerSummary(date, 'shift');
      setSummary(ledgerSummary);
    }
  }, [isOpen, date]);

  if (!isOpen || !summary) return null;

  const initCashNum = Number(initialCash) || 0;
  const netCashInShift = summary.netCash || 0;
  const totalCashInDrawer = initCashNum + netCashInShift;

  const handleCloseShift = (e) => {
    e.preventDefault();
    onConfirmClosure(date, shiftName, notes, initCashNum);
    onClose();
  };

  const shiftPresets = [
    'Ca sáng (06:00 - 14:00)',
    'Ca chiều (14:00 - 22:00)',
    'Ca đêm (22:00 - 06:00)',
    'Chốt ca làm việc',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative my-6 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800 border border-slate-300">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Chốt Sổ Ca Làm Việc
              </h2>
              <p className="text-xs text-slate-500">
                Chỉ tính doanh thu thực thu trong ca này (không cộng dồn các ca đã chốt)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleCloseShift} className="mt-4 space-y-4">
          {/* Thông tin mốc thời gian của ca */}
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-500" />
                Thời gian ca hiện tại:
              </span>
              <span className="font-mono font-bold text-slate-900">
                {summary.lastClosure
                  ? `Từ ${formatDateTimeDisplay(summary.lastClosure.created_at)} ➔ Hiện tại`
                  : 'Từ đầu ngày ➔ Hiện tại'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200">
              {/* Ngày */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Ngày chốt
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold font-mono text-slate-900 focus:outline-none"
                />
              </div>

              {/* Tên Ca */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Tên ca làm việc
                </label>
                <select
                  value={shiftName}
                  onChange={(e) => setShiftName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none"
                >
                  {shiftPresets.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tiền có sẵn trong ví / két */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                  <Wallet className="h-3.5 w-3.5 text-emerald-700" />
                  Tiền thối sẵn trong ví
                </label>
                <input
                  type="number"
                  step="10000"
                  value={initialCash}
                  onChange={(e) => setInitialCash(e.target.value)}
                  placeholder="1000000"
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-black font-mono text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>
            </div>
          </div>

          {/* 4 KHỐI THÔNG TIN TÀI CHÍNH CA HIỆN TẠI (KHÔNG CỘNG DỒN) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. KIỂM ĐẾM TIỀN MẶT THỰC TẾ TRONG KÉT/VÍ */}
            <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/50 p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <Banknote className="h-4 w-4 text-emerald-700" />
                  TIỀN MẶT TRONG VÍ/KÉT (KIỂM ĐẾM)
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                  Vốn + Thu - Chi duyệt
                </span>
              </div>

              <div className="text-2xl font-black font-mono text-emerald-900">
                {formatCurrencyVND(totalCashInDrawer)}
              </div>

              <div className="text-[11px] text-slate-700 pt-1 border-t border-emerald-200/80 space-y-0.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tiền thối có sẵn trong ví:</span>
                  <span className="font-bold">{formatCurrencyVND(initCashNum)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tiền mặt thu được ca này:</span>
                  <span className="font-bold text-emerald-800">+{formatCurrencyVND((summary.cashInflow || 0) - (summary.cashOutflow || 0))}</span>
                </div>
                {summary.approvedCashExpenses > 0 && (
                  <div className="flex justify-between text-rose-700 font-bold">
                    <span>Chi quỹ TM đã Admin duyệt:</span>
                    <span>-{formatCurrencyVND(summary.approvedCashExpenses)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. CHUYỂN KHOẢN (CK) TRONG CA */}
            <div className="rounded-xl border-2 border-blue-300 bg-blue-50/50 p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-blue-700" />
                  TIỀN CHUYỂN KHOẢN (CK) CA NÀY
                </span>
                <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded">
                  CK
                </span>
              </div>

              <div className="text-2xl font-black font-mono text-blue-900">
                {formatCurrencyVND(summary.netTransfer)}
              </div>

              <div className="text-[11px] text-slate-600 pt-1 border-t border-blue-200/80 font-mono">
                <div className="flex justify-between">
                  <span>Thu chuyển khoản:</span>
                  <span className="font-bold">+{formatCurrencyVND((summary.transferInflow || 0) - (summary.transferOutflow || 0))}</span>
                </div>
                {summary.approvedTransferExpenses > 0 && (
                  <div className="flex justify-between text-rose-700 font-bold">
                    <span>Chi CK đã duyệt:</span>
                    <span>-{formatCurrencyVND(summary.approvedTransferExpenses)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 3. TIỀN PHÒNG ĐÃ THU TRONG CA */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-slate-600" />
                  TIỀN PHÒNG ĐÃ THU CA NÀY
                </span>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">
                  {summary.roomSummaries?.length || 0} phòng
                </span>
              </div>

              <div className="text-xl font-black font-mono text-slate-900">
                {formatCurrencyVND(summary.roomRevenueCollected)}
              </div>

              <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                Nước uống: {formatCurrencyVND(summary.serviceRevenue)} {summary.surchargeRevenue !== 0 && `| Phụ thu/giảm: ${formatCurrencyVND(summary.surchargeRevenue)}`}
              </div>
            </div>

            {/* 4. TỔNG THU THỰC TẾ TRONG CA (KHÔNG CỘNG DỒN) */}
            <div className="rounded-xl border-2 border-slate-900 bg-slate-900 p-3.5 text-white space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Receipt className="h-4 w-4 text-amber-400" />
                  TỔNG DOANH THU THỰC THU CA NÀY
                </span>
                <span className="text-[10px] font-bold text-amber-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                  Đã trừ chi phí
                </span>
              </div>

              <div className="text-2xl font-black font-mono text-amber-400">
                {formatCurrencyVND(summary.totalRevenueRecognized)}
              </div>

              <div className="text-[11px] text-slate-300 pt-1 border-t border-slate-700 flex justify-between">
                <span>Giao dịch: {summary.dayPayments.length} lượt</span>
                {summary.totalApprovedExpenses > 0 && (
                  <span className="text-rose-400 font-bold">Đã trừ chi: -{formatCurrencyVND(summary.totalApprovedExpenses)}</span>
                )}
              </div>
            </div>
          </div>

          {/* CẢNH BÁO NẾU CÓ PHIẾU CHI CHỜ ADMIN DUYỆT */}
          {summary.pendingExpensesCount > 0 && (
            <div className="rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-900 border border-amber-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>⚠️ Có <strong>{summary.pendingExpensesCount}</strong> phiếu chi đang chờ Admin duyệt.</span>
              </span>
              <span className="text-[11px] text-amber-800 underline font-normal">
                (Chỉ sau khi Admin duyệt mới được trừ vào chốt sổ)
              </span>
            </div>
          )}

          {/* CHI TIẾT CÁC PHÒNG ĐÃ THU TIỀN TRONG CA NÀY */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Các Phòng Đã Thu Tiền Trong Ca ({summary.roomSummaries?.length || 0} phòng)
              </span>
              <span className="text-[11px] text-slate-500">
                (Không tính các phòng đang ở chưa thanh toán)
              </span>
            </div>

            <div className="max-h-40 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                    <th className="py-2 px-3">Phòng</th>
                    <th className="py-2 px-3">Khách</th>
                    <th className="py-2 px-3 text-center">Giao Dịch</th>
                    <th className="py-2 px-3 text-right">Tiền Mặt</th>
                    <th className="py-2 px-3 text-right">Chuyển Khoản</th>
                    <th className="py-2 px-3 text-right">Tổng Thu Ca</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(!summary.roomSummaries || summary.roomSummaries.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-400 text-xs">
                        Chưa có phòng nào phát sinh thu tiền trong ca này
                      </td>
                    </tr>
                  ) : (
                    summary.roomSummaries.map((r) => (
                      <tr key={r.roomNumber} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-slate-900">P.{r.roomNumber}</td>
                        <td className="py-2 px-3 text-slate-600 max-w-[120px] truncate">{r.customerName}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                            {r.status === 'active' ? 'Thu trước / Cọc' : 'Trả phòng'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-800 font-bold">
                          {r.cashCollected > 0 ? formatCurrencyVND(r.cashCollected) : '---'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-blue-800 font-bold">
                          {r.transferCollected > 0 ? formatCurrencyVND(r.transferCollected) : '---'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-black text-slate-900">
                          {formatCurrencyVND(r.cashCollected + r.transferCollected || r.totalPaid || r.totalBill)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ghi chú bàn giao */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ghi chú bàn giao ca (nếu có)
            </label>
            <textarea
              rows={2}
              placeholder="Ghi chú bàn giao két tiền, số tiền mặt để lại cho ca sau..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
            />
          </div>

          {/* Nút thao tác */}
          <div className="flex gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-black active:scale-[0.99] transition"
            >
              <Lock className="h-4 w-4" />
              <span>Xác Nhận Khóa Sổ ({shiftName})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
