import { useState, useMemo } from 'react';
import {
  X,
  MinusCircle,
  Banknote,
  CreditCard,
  FileText,
  User,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { hotelStore, formatCurrencyVND } from '../services/hotelStore';

export default function ExpenseModal({
  isOpen,
  onClose,
  onSubmitExpense,
}) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [method, setMethod] = useState('cash'); // 'cash' | 'transfer'
  const [requester, setRequester] = useState('Lễ tân');

  // Cash in drawer calculation
  const todayLedger = useMemo(() => {
    if (!isOpen) return { netCash: 0 };
    return hotelStore.getLedgerSummary();
  }, [isOpen]);

  const availableCashInDrawer = Math.max(0, 1000000 + (todayLedger?.netCash || 0));

  if (!isOpen) return null;

  const numAmount = Number(amount) || 0;
  const isCashOverLimit = method === 'cash' && numAmount > availableCashInDrawer;

  const quickAmounts = [50000, 100000, 200000, 500000, 1000000, 2000000];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (numAmount <= 0) {
      alert('Vui lòng nhập số tiền chi lớn hơn 0đ!');
      return;
    }
    if (method === 'cash' && numAmount > availableCashInDrawer) {
      alert(
        `Số tiền chi (${formatCurrencyVND(numAmount)}) vượt quá tiền mặt trong két (${formatCurrencyVND(availableCashInDrawer)})!`
      );
      return;
    }
    if (!reason.trim()) {
      alert('Vui lòng nhập lý do chi tiền!');
      return;
    }

    onSubmitExpense({
      amount: numAmount,
      reason: reason.trim(),
      category: 'Chi phí',
      method,
      requester: requester.trim() || 'Lễ tân',
      notes: '',
    });

    // Reset form
    setAmount('');
    setReason('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative my-6 w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700 border border-rose-200 font-bold">
              <MinusCircle className="h-5 w-5" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              Ghi Chi Tiền
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-3.5 space-y-3.5">
          {/* Thông tin tiền mặt thực tế trong két */}
          {method === 'cash' && (
            <div className={`rounded-xl px-3.5 py-2.5 text-xs border transition flex items-center justify-between ${
              isCashOverLimit
                ? 'bg-rose-50 border-rose-300 text-rose-900'
                : 'bg-emerald-50 border-emerald-300 text-emerald-950'
            }`}>
              <span className="flex items-center gap-1.5 font-bold">
                <Banknote className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Tiền mặt trong két:</span>
              </span>
              <span className="font-mono font-black text-sm text-emerald-700">
                {formatCurrencyVND(availableCashInDrawer)}
              </span>
            </div>
          )}

          {/* Số tiền chi */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Banknote className="h-4 w-4 text-rose-600" />
                Số Tiền Chi (VND) <span className="text-rose-600 font-black">*</span>
              </label>
              {numAmount > 0 && (
                <span className={`text-xs font-black font-mono ${isCashOverLimit ? 'text-rose-700' : 'text-rose-600'}`}>
                  -{formatCurrencyVND(numAmount)}
                </span>
              )}
            </div>

            <input
              type="number"
              step="1000"
              placeholder="VD: 100000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
              className={`w-full rounded-lg border bg-white px-3 py-2 text-lg font-black font-mono text-slate-900 focus:outline-none ${
                isCashOverLimit
                  ? 'border-rose-500 ring-2 ring-rose-300 text-rose-700'
                  : 'border-slate-300 focus:border-rose-600'
              }`}
            />

            {/* Warning if exceeds cash drawer */}
            {isCashOverLimit && (
              <div className="rounded-lg bg-rose-100/90 p-2 text-xs font-bold text-rose-800 border border-rose-300 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>Không thể chi quá số tiền mặt trong két!</span>
              </div>
            )}

            {/* Quick Amount Buttons */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {quickAmounts.map((q) => {
                const isQuickOver = method === 'cash' && q > availableCashInDrawer;
                return (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setAmount(String(q))}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold font-mono transition ${
                      numAmount === q
                        ? 'bg-rose-600 text-white'
                        : isQuickOver
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-pointer'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {q >= 1000000 ? `${q / 1000000}tr` : `${q / 1000}k`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lý do chi */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-slate-600" />
              Lý Do Chi <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Mua nước, xà phòng, vật tư..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-slate-800 focus:outline-none"
            />
          </div>

          {/* Nguồn tiền & Người chi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Nguồn Tiền
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setMethod('cash')}
                  className={`flex items-center justify-center gap-1 rounded-lg py-2 px-1 text-xs font-bold border transition ${
                    method === 'cash'
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Banknote className="h-3.5 w-3.5" />
                  <span>Tiền Mặt</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('transfer')}
                  className={`flex items-center justify-center gap-1 rounded-lg py-2 px-1 text-xs font-bold border transition ${
                    method === 'transfer'
                      ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Chuyển Khoản</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-slate-600" />
                Người Chi
              </label>
              <input
                type="text"
                placeholder="Lễ tân"
                value={requester}
                onChange={(e) => setRequester(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2.5 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white py-2.5 px-4 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              Hủy
            </button>

            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 px-4 text-xs sm:text-sm font-black text-white hover:bg-rose-700 active:scale-[0.99] transition shadow-md shadow-rose-600/20"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {numAmount > 0
                  ? `Lưu Phiếu Chi (${formatCurrencyVND(numAmount)})`
                  : 'Lưu Phiếu Chi'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
