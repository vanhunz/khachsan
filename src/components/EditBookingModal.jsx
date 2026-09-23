import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Edit3,
  Wine,
  Sparkles,
  Plus,
  Minus,
  Coins,
  CheckCircle2,
  FileText,
  User,
  Clock,
  Tag,
  AlertCircle,
} from 'lucide-react';
import {
  calculateTotalBill,
  formatStayDuration,
  calculateStayMinutes,
  isSpecialRoomNumber,
} from '../utils/calculateTotalBill';
import { formatCurrencyVND } from '../services/hotelStore';

export default function EditBookingModal({
  isOpen,
  onClose,
  room,
  booking,
  onSave,
}) {
  const [beerQty, setBeerQty] = useState(0);
  const [waterQty, setWaterQty] = useState(0);
  const [softDrinkQty, setSoftDrinkQty] = useState(0);
  const [surchargeAmount, setSurchargeAmount] = useState(0);
  const [surchargeReason, setSurchargeReason] = useState('');
  const [rentalType, setRentalType] = useState('hourly');
  const [roomRateMode, setRoomRateMode] = useState('single');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');

  const isSpecial = room ? isSpecialRoomNumber(room.room_number) : false;

  useEffect(() => {
    if (booking) {
      setBeerQty(Number(booking.beer_qty) || 0);
      setWaterQty(Number(booking.water_qty) || 0);
      setSoftDrinkQty(Number(booking.soft_drink_qty) || 0);
      setSurchargeAmount(Number(booking.surcharge_amount) || 0);
      setSurchargeReason(booking.surcharge_reason || '');
      setRentalType(booking.rental_type || 'hourly');
      setRoomRateMode(booking.room_rate_mode || 'single');
      setCustomerName(booking.customer_name || '');
      setCustomerPhone(booking.customer_phone || '');
      setNotes(booking.notes || '');
    }
  }, [booking, isOpen]);

  // Live estimated bill with updated drinks & surcharge
  const liveBill = useMemo(() => {
    if (!booking?.check_in) return null;
    return calculateTotalBill(
      booking.check_in,
      null,
      rentalType,
      {
        beer_qty: beerQty,
        water_qty: waterQty,
        soft_drink_qty: softDrinkQty,
      },
      surchargeAmount,
      new Date(),
      roomRateMode,
      room?.room_number
    );
  }, [booking, rentalType, beerQty, waterQty, softDrinkQty, surchargeAmount, roomRateMode, room]);

  if (!isOpen || !room || !booking) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      bookingId: booking.id,
      roomNumber: room.room_number,
      rentalType,
      roomRateMode,
      drinks: {
        beer_qty: Math.max(0, Number(beerQty) || 0),
        water_qty: Math.max(0, Number(waterQty) || 0),
        soft_drink_qty: Math.max(0, Number(softDrinkQty) || 0),
      },
      surchargeAmount: Number(surchargeAmount) || 0,
      surchargeReason: surchargeReason.trim(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      notes: notes.trim(),
    });
    onClose();
  };

  const depositPaid = Number(booking.paid_amount || 0);
  const balanceDue = liveBill ? Math.max(0, liveBill.total_amount - depositPaid) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative my-4 w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-300 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950 px-5 py-3.5 text-white border-b border-indigo-900/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-white uppercase">
                  Cập Nhật Phòng {room.room_number}
                </h2>
                <span className="rounded bg-indigo-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-200 border border-indigo-500/40">
                  Đang Ở
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Thêm nước minibar, điều chỉnh phụ thu/giảm giá, đổi hình thức thuê & thông tin
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Top Live KPI summary */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Tiền phòng tạm tính:</span>
              <span className="font-mono font-black text-slate-900 text-sm">
                {formatCurrencyVND(liveBill?.room_amount || 0)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Tiền nước ({beerQty + waterQty + softDrinkQty} món):</span>
              <span className="font-mono font-bold text-blue-700 text-sm">
                {formatCurrencyVND(liveBill?.drink_amount || 0)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Phụ thu:</span>
              <span className="font-mono font-bold text-amber-700 text-sm">
                {formatCurrencyVND(surchargeAmount)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[11px]">Tổng hóa đơn hiện tại:</span>
              <span className="font-mono font-black text-rose-700 text-base">
                {formatCurrencyVND(liveBill?.total_amount || 0)}
              </span>
            </div>
          </div>

          {/* 1. Hình Thức Thuê (Rental Type) & Chế độ Đơn/Đôi */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-indigo-600" />
              Hình Thức Thuê Phòng
            </label>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRentalType('hourly')}
                className={`rounded-lg py-2 px-1 text-xs font-bold transition border ${
                  rentalType === 'hourly'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                ⏱️ Theo Giờ
              </button>

              <button
                type="button"
                onClick={() => setRentalType('overnight')}
                className={`rounded-lg py-2 px-1 text-xs font-bold transition border ${
                  rentalType === 'overnight'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                🌙 Qua Đêm (20h-9h)
              </button>

              <button
                type="button"
                onClick={() => setRentalType('daily')}
                className={`rounded-lg py-2 px-1 text-xs font-bold transition border ${
                  rentalType === 'daily'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                ☀️ Ngày Đêm (12h-12h)
              </button>
            </div>

            {/* Phòng Đôi/Đơn toggle for 104, 204, 303 */}
            {isSpecial && (
              <div className="pt-2 flex items-center justify-between border-t border-slate-200">
                <span className="text-xs font-bold text-amber-900">
                  Phòng đa năng ({room.room_number}):
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRoomRateMode('single')}
                    className={`rounded px-3 py-1 text-xs font-bold transition ${
                      roomRateMode === 'single'
                        ? 'bg-amber-600 text-white'
                        : 'bg-white border border-slate-300 text-slate-700'
                    }`}
                  >
                    Giá Đơn ({rentalType === 'overnight' ? '200k' : '350k'})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoomRateMode('double')}
                    className={`rounded px-3 py-1 text-xs font-bold transition ${
                      roomRateMode === 'double'
                        ? 'bg-amber-600 text-white'
                        : 'bg-white border border-slate-300 text-slate-700'
                    }`}
                  >
                    Giá Đôi ({rentalType === 'overnight' ? '350k' : '500k'})
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. Thêm Nước Uống / Minibar */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5 shadow-2xs">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Wine className="h-3.5 w-3.5 text-blue-600" />
              Nước Uống & Minibar
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Bia */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-center">
                <span className="block text-xs font-bold text-slate-800">🍺 Bia (20k)</span>
                <div className="mt-1.5 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBeerQty((prev) => Math.max(0, prev - 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-200"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-mono font-black text-sm text-slate-900">
                    {beerQty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBeerQty((prev) => prev + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 font-bold text-white hover:bg-blue-700"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Suối */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-center">
                <span className="block text-xs font-bold text-slate-800">💧 Suối (10k)</span>
                <div className="mt-1.5 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWaterQty((prev) => Math.max(0, prev - 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-200"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-mono font-black text-sm text-slate-900">
                    {waterQty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setWaterQty((prev) => prev + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 font-bold text-white hover:bg-blue-700"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Nước ngọt */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-center">
                <span className="block text-xs font-bold text-slate-800">🥤 Nước Ngọt (15k)</span>
                <div className="mt-1.5 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSoftDrinkQty((prev) => Math.max(0, prev - 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-200"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-mono font-black text-sm text-slate-900">
                    {softDrinkQty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSoftDrinkQty((prev) => prev + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 font-bold text-white hover:bg-blue-700"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Phụ Thu / Giảm Trừ */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-amber-600" />
              Phụ Thu / Giảm Trừ (Có thể nhập số âm)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <input
                  type="number"
                  step="5000"
                  placeholder="0 (VNĐ)"
                  value={surchargeAmount || ''}
                  onChange={(e) => setSurchargeAmount(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold font-mono text-slate-900 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Lý do phụ thu / giảm giá..."
                  value={surchargeReason}
                  onChange={(e) => setSurchargeReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 4. Khách Hàng & Ghi Chú */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Tên Khách Hàng
              </label>
              <input
                type="text"
                placeholder="Tên khách hàng..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Ghi Chú
              </label>
              <input
                type="text"
                placeholder="Ghi chú thêm..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Action Buttons Footer */}
          <div className="flex gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white py-2.5 px-4 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              Đóng
            </button>

            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 px-4 text-xs sm:text-sm font-black text-white hover:bg-indigo-700 active:scale-[0.99] transition shadow-md shadow-indigo-600/20"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Lưu & Cập Nhật Phòng</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
