import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Banknote,
  CreditCard,
  CheckCircle2,
  Clock,
  Wine,
  Tag,
  Receipt,
  Sparkles,
  AlertCircle,
  Plus,
  Minus,
} from 'lucide-react';
import {
  formatCurrencyVND,
  formatNumber,
  formatDateTimeDisplay,
  HOTEL_CONFIG,
} from '../services/hotelStore';
import { calculateStayMinutes, calculateTotalBill, PRICE_CONSTANTS } from '../utils/calculateTotalBill';

export default function AdvancePaymentModal({
  isOpen,
  onClose,
  room,
  booking,
  onConfirmAdvancePayment,
}) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash'); // 'cash' | 'transfer'
  const [beerQty, setBeerQty] = useState(0);
  const [waterQty, setWaterQty] = useState(0);
  const [softDrinkQty, setSoftDrinkQty] = useState(0);
  const [note, setNote] = useState('');

  const now = new Date();

  useEffect(() => {
    if (isOpen && booking) {
      setAmount('');
      setMethod('cash');
      setBeerQty(Number(booking.beer_qty) || 0);
      setWaterQty(Number(booking.water_qty) || 0);
      setSoftDrinkQty(Number(booking.soft_drink_qty) || 0);
      setNote('');
    }
  }, [isOpen, booking]);

  // Dynamic live calculation including current minibar selection
  const liveBill = useMemo(() => {
    if (!booking?.check_in) return null;
    return calculateTotalBill(
      booking.check_in,
      null,
      booking.rental_type || 'hourly',
      {
        beer_qty: beerQty,
        water_qty: waterQty,
        soft_drink_qty: softDrinkQty,
      },
      booking.surcharge_amount || 0,
      now
    );
  }, [booking, beerQty, waterQty, softDrinkQty, isOpen]);

  const prevPaid = Number(booking?.paid_amount) || 0;
  const liveTotal = liveBill ? liveBill.total_amount : 0;
  const liveRemaining = Math.max(0, liveTotal - prevPaid);

  if (!isOpen || !room || !booking) return null;

  const rentalTypeNames = {
    hourly: 'Theo Giờ',
    overnight: 'Qua Đêm',
    daily: 'Ngày Đêm',
  };

  const handleAddPreset = (addVal) => {
    const current = Number(amount) || 0;
    setAmount(String(current + addVal));
  };

  const handleSetExact = (val) => {
    setAmount(String(val));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = Number(amount) || 0;
    if (num <= 0) return;

    onConfirmAdvancePayment({
      bookingId: booking.id,
      roomNumber: booking.room_number,
      amount: num,
      method,
      drinks: {
        beer_qty: beerQty,
        water_qty: waterQty,
        soft_drink_qty: softDrinkQty,
      },
      note: note || `Thu trước tiền phòng P.${booking.room_number}`,
    });
    onClose();
  };

  const numAmount = Number(amount) || 0;
  const totalWaterAmount =
    beerQty * PRICE_CONSTANTS.BEER +
    waterQty * PRICE_CONSTANTS.WATER +
    softDrinkQty * PRICE_CONSTANTS.SOFT_DRINK;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative my-8 w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm">
              <Banknote className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                  Thu Trước Tiền Phòng / Tạm Ứng
                </h2>
                <span className="rounded-lg bg-rose-50 px-2 py-0.5 text-xs font-black text-rose-700 border border-rose-200">
                  P.{room.room_number}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cập nhật nước uống & thu trước tiền phòng đang ở
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Room & Stay Status Overview */}
        <div className="mt-4 rounded-2xl bg-slate-50 p-3.5 border border-slate-200 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700">Khách hàng:</span>
            <span className="font-black text-slate-950 text-sm">
              {booking.customer_name || 'Khách vãng lai'}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600">
            <span>Hình thức & Giờ vào:</span>
            <span className="font-semibold text-slate-800 font-mono-nums">
              {rentalTypeNames[booking.rental_type] || 'Theo Giờ'} • Vào lúc{' '}
              {booking.check_in ? new Date(booking.check_in).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '---'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-200">
            <div className="rounded-xl bg-white p-2.5 border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-medium">Tạm tính hiện tại:</span>
              <span className="font-mono-nums font-bold text-slate-900 text-sm">
                {formatCurrencyVND(liveTotal)}
              </span>
            </div>

            <div className="rounded-xl bg-white p-2.5 border border-emerald-200 bg-emerald-50/50">
              <span className="text-[10px] text-emerald-700 block font-medium">Đã thu trước đó:</span>
              <span className="font-mono-nums font-black text-emerald-700 text-sm">
                {formatCurrencyVND(prevPaid)}
              </span>
            </div>
          </div>
        </div>

        {/* Minibar / Nước Uống Update Section */}
        <div className="mt-3 rounded-2xl border border-purple-200 bg-purple-50/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-purple-900">
              <Wine className="h-4 w-4 text-purple-600" />
              <span>Nước Uống / Minibar Phòng Đã Lấy</span>
            </div>
            <span className="text-xs font-bold text-purple-700 font-mono-nums">
              +{formatCurrencyVND(totalWaterAmount)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Beer */}
            <div className="flex flex-col items-center justify-between rounded-xl bg-white p-2 border border-purple-100 shadow-xs">
              <span className="text-xs font-bold text-slate-800">Bia ({PRICE_CONSTANTS.BEER / 1000}k)</span>
              <div className="flex items-center gap-1.5 mt-1">
                <button
                  type="button"
                  onClick={() => setBeerQty((q) => Math.max(0, q - 1))}
                  className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-4 text-center font-black font-mono-nums text-xs">{beerQty}</span>
                <button
                  type="button"
                  onClick={() => setBeerQty((q) => q + 1)}
                  className="flex h-6 w-6 items-center justify-center rounded bg-purple-600 text-white hover:bg-purple-700 font-bold"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Water */}
            <div className="flex flex-col items-center justify-between rounded-xl bg-white p-2 border border-purple-100 shadow-xs">
              <span className="text-xs font-bold text-slate-800">Nước suối ({PRICE_CONSTANTS.WATER / 1000}k)</span>
              <div className="flex items-center gap-1.5 mt-1">
                <button
                  type="button"
                  onClick={() => setWaterQty((q) => Math.max(0, q - 1))}
                  className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-4 text-center font-black font-mono-nums text-xs">{waterQty}</span>
                <button
                  type="button"
                  onClick={() => setWaterQty((q) => q + 1)}
                  className="flex h-6 w-6 items-center justify-center rounded bg-purple-600 text-white hover:bg-purple-700 font-bold"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Soft Drink */}
            <div className="flex flex-col items-center justify-between rounded-xl bg-white p-2 border border-purple-100 shadow-xs">
              <span className="text-xs font-bold text-slate-800">Nước ngọt ({PRICE_CONSTANTS.SOFT_DRINK / 1000}k)</span>
              <div className="flex items-center gap-1.5 mt-1">
                <button
                  type="button"
                  onClick={() => setSoftDrinkQty((q) => Math.max(0, q - 1))}
                  className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-4 text-center font-black font-mono-nums text-xs">{softDrinkQty}</span>
                <button
                  type="button"
                  onClick={() => setSoftDrinkQty((q) => q + 1)}
                  className="flex h-6 w-6 items-center justify-center rounded bg-purple-600 text-white hover:bg-purple-700 font-bold"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-3 space-y-3.5">
          {/* Amount Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Số Tiền Thu Trước (VND) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1000"
                step="1000"
                required
                placeholder="Nhập số tiền..."
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-2 text-base font-black font-mono-nums text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
              <span className="absolute right-4 top-2.5 text-xs font-bold text-slate-400">VND</span>
            </div>

            {/* Quick preset amount buttons */}
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <button
                type="button"
                onClick={() => handleAddPreset(50000)}
                className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
              >
                +50k
              </button>
              <button
                type="button"
                onClick={() => handleAddPreset(100000)}
                className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
              >
                +100k
              </button>
              <button
                type="button"
                onClick={() => handleAddPreset(200000)}
                className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
              >
                +200k
              </button>
              <button
                type="button"
                onClick={() => handleAddPreset(500000)}
                className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
              >
                +500k
              </button>
              {liveRemaining > 0 && (
                <button
                  type="button"
                  onClick={() => handleSetExact(liveRemaining)}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition ml-auto"
                >
                  Thu đủ ({formatCurrencyVND(liveRemaining)})
                </button>
              )}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Phương Thức Nhận Tiền
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <label
                className={`flex items-center gap-2.5 rounded-xl border-2 p-2.5 cursor-pointer transition ${
                  method === 'cash'
                    ? 'border-emerald-600 bg-emerald-50/60 text-emerald-900 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="advanceMethod"
                  value="cash"
                  checked={method === 'cash'}
                  onChange={() => setMethod('cash')}
                  className="hidden"
                />
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                  <Banknote className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Tiền mặt (Két)</div>
                  <div className="text-[10px] text-slate-500">Cộng vào két</div>
                </div>
              </label>

              <label
                className={`flex items-center gap-2.5 rounded-xl border-2 p-2.5 cursor-pointer transition ${
                  method === 'transfer'
                    ? 'border-blue-600 bg-blue-50/60 text-blue-900 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="advanceMethod"
                  value="transfer"
                  checked={method === 'transfer'}
                  onChange={() => setMethod('transfer')}
                  className="hidden"
                />
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 shrink-0">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Chuyển khoản (CK)</div>
                  <div className="text-[10px] text-slate-500">Vào tài khoản ngân hàng</div>
                </div>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Ghi Chú Thu Tiền
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Khách tạm ứng trước tiền phòng..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={numAmount <= 0}
              className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 py-2.5 text-xs sm:text-sm font-black text-white shadow-md shadow-emerald-600/25 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] transition"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Xác Nhận Thu {numAmount > 0 ? formatCurrencyVND(numAmount) : ''}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
