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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-xs overflow-y-auto">
      <div className="relative my-3 w-full max-w-md rounded-xl bg-white p-4 shadow-xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Banknote className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">
                  Thu Trước Tiền Phòng P.{room.room_number}
                </h2>
              </div>
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

        {/* Room & Stay Status Overview */}
        <div className="mt-2.5 rounded-lg bg-slate-50 p-2.5 border border-slate-200 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700">Khách hàng:</span>
            <span className="font-bold text-slate-950">
              {booking.customer_name || 'Khách vãng lai'}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600">
            <span>Loại thuê:</span>
            <span className="font-semibold text-slate-800">
              {rentalTypeNames[booking.rental_type] || 'Theo Giờ'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
            <div className="rounded-md bg-white p-2 border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-medium">Tạm tính hiện tại:</span>
              <span className="font-mono font-bold text-slate-900 text-xs">
                {formatCurrencyVND(liveTotal)}
              </span>
            </div>

            <div className="rounded-md bg-white p-2 border border-emerald-200 bg-emerald-50/50">
              <span className="text-[10px] text-emerald-700 block font-medium">Đã thu trước đó:</span>
              <span className="font-mono font-black text-emerald-700 text-xs">
                {formatCurrencyVND(prevPaid)}
              </span>
            </div>
          </div>
        </div>

        {/* Minibar / Nước Uống Update Section */}
        <div className="mt-2 rounded-lg border border-purple-200 bg-purple-50/40 p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[11px] font-bold text-purple-900">
              <Wine className="h-3.5 w-3.5 text-purple-600" />
              <span>Nước uống phòng đã lấy</span>
            </div>
            <span className="text-[11px] font-bold text-purple-700 font-mono">
              +{formatCurrencyVND(totalWaterAmount)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {/* Beer */}
            <div className="flex items-center justify-between rounded-md bg-white p-1 border border-purple-100">
              <span className="text-[10px] font-bold text-slate-800">Bia</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setBeerQty((q) => Math.max(0, q - 1))}
                  className="h-4 w-4 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 text-[10px] font-bold flex items-center justify-center"
                >
                  -
                </button>
                <span className="w-3 text-center font-bold font-mono text-xs">{beerQty}</span>
                <button
                  type="button"
                  onClick={() => setBeerQty((q) => q + 1)}
                  className="h-4 w-4 rounded bg-purple-600 text-white hover:bg-purple-700 text-[10px] font-bold flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {/* Water */}
            <div className="flex items-center justify-between rounded-md bg-white p-1 border border-purple-100">
              <span className="text-[10px] font-bold text-slate-800">Nước</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setWaterQty((q) => Math.max(0, q - 1))}
                  className="h-4 w-4 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 text-[10px] font-bold flex items-center justify-center"
                >
                  -
                </button>
                <span className="w-3 text-center font-bold font-mono text-xs">{waterQty}</span>
                <button
                  type="button"
                  onClick={() => setWaterQty((q) => q + 1)}
                  className="h-4 w-4 rounded bg-purple-600 text-white hover:bg-purple-700 text-[10px] font-bold flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {/* Soft Drink */}
            <div className="flex items-center justify-between rounded-md bg-white p-1 border border-purple-100">
              <span className="text-[10px] font-bold text-slate-800">Ngọt</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSoftDrinkQty((q) => Math.max(0, q - 1))}
                  className="h-4 w-4 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 text-[10px] font-bold flex items-center justify-center"
                >
                  -
                </button>
                <span className="w-3 text-center font-bold font-mono text-xs">{softDrinkQty}</span>
                <button
                  type="button"
                  onClick={() => setSoftDrinkQty((q) => q + 1)}
                  className="h-4 w-4 rounded bg-purple-600 text-white hover:bg-purple-700 text-[10px] font-bold flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-2.5 space-y-2.5">
          {/* Amount Input */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
              Số tiền thu trước (VND) <span className="text-rose-500">*</span>
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
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-black font-mono text-slate-900 focus:border-slate-800 focus:outline-none"
              />
              <span className="absolute right-2.5 top-2 text-[10px] font-bold text-slate-400">VND</span>
            </div>

            {/* Quick preset amount buttons */}
            <div className="flex flex-wrap gap-1 mt-1">
              <button
                type="button"
                onClick={() => handleAddPreset(50000)}
                className="rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700"
              >
                +50k
              </button>
              <button
                type="button"
                onClick={() => handleAddPreset(100000)}
                className="rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700"
              >
                +100k
              </button>
              <button
                type="button"
                onClick={() => handleAddPreset(200000)}
                className="rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700"
              >
                +200k
              </button>
              {liveRemaining > 0 && (
                <button
                  type="button"
                  onClick={() => handleSetExact(liveRemaining)}
                  className="rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 ml-auto"
                >
                  Thu đủ ({formatCurrencyVND(liveRemaining)})
                </button>
              )}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
              Hình thức nhận
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition ${
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
                <Banknote className="h-4 w-4 text-emerald-700 shrink-0" />
                <div className="text-xs font-bold">Tiền mặt</div>
              </label>

              <label
                className={`flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition ${
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
                <CreditCard className="h-4 w-4 text-blue-700 shrink-0" />
                <div className="text-xs font-bold">Chuyển khoản (CK)</div>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
              Ghi chú
            </label>
            <input
              type="text"
              placeholder="Ghi chú thu trước..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 bg-white py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={numAmount <= 0}
              className="flex-[2] flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] transition"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Thu {numAmount > 0 ? formatCurrencyVND(numAmount) : ''}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
