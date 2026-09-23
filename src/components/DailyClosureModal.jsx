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
  Zap,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-xs overflow-y-auto">
      <div className="relative my-3 w-full max-w-xl rounded-xl bg-white p-4 sm:p-5 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-black">
              <Zap className="h-4 w-4 fill-slate-950 text-slate-950" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                ⚡ Chốt Nhanh Ca Làm Việc
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleCloseShift} className="mt-3 space-y-3">
          {/* Thông tin mốc thời gian của ca */}
          <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                Thời gian ca:
              </span>
              <span className="font-mono font-bold text-slate-900">
                {summary.lastClosure
                  ? `Từ ${formatDateTimeDisplay(summary.lastClosure.created_at)} ➔ Hiện tại`
                  : 'Từ đầu ngày ➔ Hiện tại'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200">
              {/* Ngày */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                  Ngày chốt
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-bold font-mono text-slate-900 focus:outline-none"
                />
              </div>

              {/* Tên Ca */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                  Tên ca
                </label>
                <select
                  value={shiftName}
                  onChange={(e) => setShiftName(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-900 focus:outline-none"
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
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5 flex items-center gap-1">
                  <Wallet className="h-3 w-3 text-emerald-700" />
                  Tiền sẵn trong ví
                </label>
                <input
                  type="number"
                  step="10000"
                  value={initialCash}
                  onChange={(e) => setInitialCash(e.target.value)}
                  placeholder="1000000"
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-black font-mono text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>
            </div>
          </div>

          {/* 4 KHỐI THÔNG TIN TÀI CHÍNH RÕ RÀNG TRONG CA */}
          <div className="grid grid-cols-2 gap-2">
            {/* 1. TIỀN MẶT (TM) THỰC THU TRONG CA */}
            <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50/60 p-2.5 space-y-1 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-emerald-950 flex items-center gap-1">
                  <Banknote className="h-3.5 w-3.5 text-emerald-700" />
                  TIỀN MẶT (TM) THU CA
                </span>
                <span className="text-[9px] font-bold text-emerald-900 bg-emerald-200/80 px-1.5 py-0.5 rounded border border-emerald-300">
                  Tiền mặt
                </span>
              </div>

              <div className="text-xl font-black font-mono text-emerald-900">
                {formatCurrencyVND(summary.netCash)}
              </div>

              <div className="text-[10px] text-slate-700 pt-1 border-t border-emerald-200/80 space-y-0.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-600">Thu TM:</span>
                  <span className="font-bold text-emerald-800">+{formatCurrencyVND(summary.cashInflow || 0)}</span>
                </div>
                {summary.cashOutflow > 0 && (
                  <div className="flex justify-between text-rose-700 font-bold">
                    <span>Thối TM:</span>
                    <span>-{formatCurrencyVND(summary.cashOutflow)}</span>
                  </div>
                )}
                {summary.approvedCashExpenses > 0 && (
                  <div className="flex justify-between text-rose-700 font-bold">
                    <span>Chi TM:</span>
                    <span>-{formatCurrencyVND(summary.approvedCashExpenses)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. CHUYỂN KHOẢN (CK) TRONG CA */}
            <div className="rounded-lg border-2 border-blue-300 bg-blue-50/60 p-2.5 space-y-1 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-blue-950 flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5 text-blue-700" />
                  CHUYỂN KHOẢN (CK) CA
                </span>
                <span className="text-[9px] font-bold text-blue-900 bg-blue-200/80 px-1.5 py-0.5 rounded border border-blue-300">
                  Ngân hàng
                </span>
              </div>

              <div className="text-xl font-black font-mono text-blue-900">
                {formatCurrencyVND(summary.netTransfer)}
              </div>

              <div className="text-[10px] text-slate-700 pt-1 border-t border-blue-200/80 space-y-0.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-600">Thu CK:</span>
                  <span className="font-bold text-blue-800">+{formatCurrencyVND(summary.transferInflow || 0)}</span>
                </div>
                {summary.approvedTransferExpenses > 0 && (
                  <div className="flex justify-between text-rose-700 font-bold">
                    <span>Chi CK:</span>
                    <span>-{formatCurrencyVND(summary.approvedTransferExpenses)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 3. TỔNG DOANH THU THỰC THU CA NÀY (TM + CK) */}
            <div className="rounded-lg border-2 border-slate-900 bg-slate-900 p-2.5 text-white space-y-1 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1">
                  <Receipt className="h-3.5 w-3.5 text-amber-400" />
                  TỔNG DOANH THU CA NÀY
                </span>
                <span className="text-[9px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-400/40">
                  TM + CK
                </span>
              </div>

              <div className="text-xl font-black font-mono text-amber-400">
                {formatCurrencyVND(summary.totalRevenueRecognized)}
              </div>

              <div className="text-[10px] text-slate-300 pt-1 border-t border-slate-700 flex justify-between font-mono">
                <span>{summary.dayPayments.length} giao dịch</span>
                <span>TM: {formatCurrencyVND(summary.netCash)} • CK: {formatCurrencyVND(summary.netTransfer)}</span>
              </div>
            </div>

            {/* 4. TIỀN MẶT TRONG KÉT/VÍ KHI BÀN GIAO (KIỂM ĐẾM THỰC TẾ) */}
            <div className="rounded-lg border-2 border-amber-300 bg-amber-50/60 p-2.5 space-y-1 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-amber-950 flex items-center gap-1">
                  <Wallet className="h-3.5 w-3.5 text-amber-700" />
                  TIỀN MẶT TRONG VÍ (BÀN GIAO)
                </span>
                <span className="text-[9px] font-bold text-amber-900 bg-amber-200/80 px-1.5 py-0.5 rounded border border-amber-300">
                  Kiểm đếm
                </span>
              </div>

              <div className="text-xl font-black font-mono text-amber-950">
                {formatCurrencyVND(totalCashInDrawer)}
              </div>

              <div className="text-[10px] text-slate-700 pt-1 border-t border-amber-200/80 space-y-0.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-600">Vốn sẵn:</span>
                  <span className="font-bold">{formatCurrencyVND(initCashNum)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Thu TM ca này:</span>
                  <span className="font-bold text-emerald-800">+{formatCurrencyVND(summary.netCash)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* CẢNH BÁO NẾU CÓ PHIẾU CHI CHỜ ADMIN DUYỆT */}
          {summary.pendingExpensesCount > 0 && (
            <div className="rounded-lg bg-amber-50 p-2 text-xs font-bold text-amber-900 border border-amber-300 flex items-center justify-between">
              <span>⚠️ Có <strong>{summary.pendingExpensesCount}</strong> phiếu chi chờ duyệt.</span>
            </div>
          )}

          {/* CHI TIẾT CÁC PHÒNG ĐÃ THU TIỀN TRONG CA NÀY */}
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                Phòng Đã Thu Trong Ca ({summary.roomSummaries?.length || 0})
              </span>
            </div>

            <div className="max-h-36 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[10px]">
                    <th className="py-1.5 px-2.5">Phòng</th>
                    <th className="py-1.5 px-2.5">Khách</th>
                    <th className="py-1.5 px-2.5 text-center">Giao Dịch</th>
                    <th className="py-1.5 px-2.5 text-right">TM</th>
                    <th className="py-1.5 px-2.5 text-right">CK</th>
                    <th className="py-1.5 px-2.5 text-right">Tổng Thu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(!summary.roomSummaries || summary.roomSummaries.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="py-3 text-center text-slate-400 text-xs">
                        Chưa phát sinh thu tiền trong ca này
                      </td>
                    </tr>
                  ) : (
                    summary.roomSummaries.map((r) => (
                      <tr key={r.roomNumber} className="hover:bg-slate-50 text-[11px]">
                        <td className="py-1.5 px-2.5 font-bold text-slate-900">P.{r.roomNumber}</td>
                        <td className="py-1.5 px-2.5 text-slate-600 max-w-[100px] truncate">{r.customerName}</td>
                        <td className="py-1.5 px-2.5 text-center">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${r.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                            {r.status === 'active' ? 'Cọc/Trước' : 'Trả phòng'}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono text-emerald-800 font-bold">
                          {r.cashCollected > 0 ? formatCurrencyVND(r.cashCollected) : '---'}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono text-blue-800 font-bold">
                          {r.transferCollected > 0 ? formatCurrencyVND(r.transferCollected) : '---'}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono font-black text-slate-900">
                          {formatCurrencyVND(r.cashCollected + r.transferCollected || r.totalPaid || r.totalBill)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {summary.roomSummaries && summary.roomSummaries.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900 text-[11px]">
                      <td colSpan={3} className="py-1.5 px-2.5 uppercase text-[10px]">Tổng cộng:</td>
                      <td className="py-1.5 px-2.5 text-right font-mono text-emerald-800">
                        {formatCurrencyVND(summary.roomSummaries.reduce((sum, r) => sum + (r.cashCollected || 0), 0))}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono text-blue-800">
                        {formatCurrencyVND(summary.roomSummaries.reduce((sum, r) => sum + (r.transferCollected || 0), 0))}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono font-black text-slate-950">
                        {formatCurrencyVND(summary.roomSummaries.reduce((sum, r) => sum + (r.cashCollected + r.transferCollected || r.totalPaid || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Ghi chú bàn giao */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
              Ghi chú bàn giao (nếu có)
            </label>
            <input
              type="text"
              placeholder="Ghi chú bàn giao ca..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
            />
          </div>

          {/* Nút thao tác */}
          <div className="flex gap-2 pt-1 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-[2] flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-2 text-xs font-bold text-white hover:bg-black active:scale-[0.99] transition"
            >
              <Zap className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span>⚡ Xác Nhận Chốt Nhanh</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
