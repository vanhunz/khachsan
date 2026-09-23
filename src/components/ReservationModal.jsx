import { useState, useEffect } from 'react';
import {
  X,
  BookmarkPlus,
  Clock,
  Moon,
  Sun,
  User,
  Phone,
  Banknote,
  CreditCard,
  FileText,
  Calendar,
  Sparkles,
  Check,
} from 'lucide-react';
import {
  getLocalDateTimeString,
  formatCurrencyVND,
} from '../services/hotelStore';
import { PRICE_CONSTANTS } from '../utils/calculateTotalBill';

export default function ReservationModal({
  isOpen,
  onClose,
  room,
  availableRooms = [],
  onConfirmReservation,
}) {
  const [selectedRoomNumber, setSelectedRoomNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [rentalType, setRentalType] = useState('overnight');
  const [expectedCheckIn, setExpectedCheckIn] = useState('');
  const [depositAmount, setDepositAmount] = useState(100000);
  const [depositMethod, setDepositMethod] = useState('transfer'); // 'transfer' | 'cash'
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedRoomNumber(room ? String(room.room_number) : '');
      setCustomerName('');
      setCustomerPhone('');
      setRentalType('overnight');
      // default expected checkin 2 hours from now
      const defaultExp = new Date(Date.now() + 2 * 60 * 60000);
      setExpectedCheckIn(getLocalDateTimeString(defaultExp));
      setDepositAmount(100000);
      setDepositMethod('transfer');
      setNotes('');
    }
  }, [isOpen, room]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerName.trim()) return;

    onConfirmReservation({
      roomNumber: selectedRoomNumber || '',
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      rentalType,
      expectedCheckIn,
      depositAmount: Number(depositAmount) || 0,
      depositMethod,
      notes: notes.trim(),
    });
    onClose();
  };

  const rentalOptions = [
    {
      id: 'hourly',
      name: 'Theo Giờ',
      icon: Clock,
      price: '80.000đ block đầu',
    },
    {
      id: 'overnight',
      name: 'Qua Đêm',
      icon: Moon,
      price: formatCurrencyVND(PRICE_CONSTANTS.OVERNIGHT),
    },
    {
      id: 'daily',
      name: 'Ngày Đêm (24h)',
      icon: Sun,
      price: formatCurrencyVND(PRICE_CONSTANTS.DAILY),
    },
  ];

  const depositPresets = [50000, 100000, 200000, 350000];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative my-8 w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 font-black">
              <BookmarkPlus className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase">
              Đặt Cọc Giữ Phòng
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {/* Room Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Phòng giữ chỗ <span className="text-slate-400 font-normal lowercase">(tùy chọn)</span>
              </label>
              {selectedRoomNumber && (
                <button
                  type="button"
                  onClick={() => setSelectedRoomNumber('')}
                  className="text-[11px] font-bold text-amber-700 hover:underline"
                >
                  Để trống
                </button>
              )}
            </div>
            <select
              value={selectedRoomNumber}
              onChange={(e) => setSelectedRoomNumber(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none"
            >
              <option value="">-- Chưa gán số phòng (Xếp khi khách đến) --</option>
              {room ? (
                <option value={room.room_number}>
                  Phòng {room.room_number} (Tầng {room.floor || room.room_number[0]})
                </option>
              ) : (
                availableRooms.map((r) => (
                  <option key={r.id} value={r.room_number}>
                    Phòng {r.room_number} (Tầng {r.floor || r.room_number[0]})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Tên Khách Hàng <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Anh Hoàng Nam"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Số Điện Thoại
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="tel"
                  placeholder="0912 345 678"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Rental Type */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Hình Thức Đặt Phòng
            </label>
            <div className="grid grid-cols-3 gap-2">
              {rentalOptions.map((opt) => {
                const isSel = rentalType === opt.id;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRentalType(opt.id)}
                    className={`rounded-xl border p-2.5 text-left transition ${
                      isSel
                        ? 'border-amber-600 bg-amber-50/80 ring-2 ring-amber-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className={`h-4 w-4 ${isSel ? 'text-amber-700' : 'text-slate-400'}`} />
                      {isSel && <Check className="h-3.5 w-3.5 text-amber-700 stroke-[3]" />}
                    </div>
                    <span className="block text-xs font-bold text-slate-900 mt-1">{opt.name}</span>
                    <span className="block text-[10px] text-slate-500">{opt.price}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expected Check-in Time */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Giờ Dự Kiến Nhận Phòng <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="datetime-local"
                required
                value={expectedCheckIn}
                onChange={(e) => setExpectedCheckIn(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm font-bold font-mono-nums text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Deposit Amount & Quick chips */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Số Tiền Đặt Cọc (VND) <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-1">
                {depositPresets.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDepositAmount(amt)}
                    className={`rounded-lg px-2 py-0.5 text-[11px] font-bold transition ${
                      depositAmount === amt
                        ? 'bg-amber-600 text-white'
                        : 'bg-white border border-amber-200 text-amber-900 hover:bg-amber-100'
                    }`}
                  >
                    {amt / 1000}k
                  </button>
                ))}
              </div>
            </div>

            <input
              type="number"
              step="10000"
              required
              value={depositAmount}
              onChange={(e) => setDepositAmount(Math.max(0, Number(e.target.value) || 0))}
              className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-base font-black font-mono-nums text-amber-900 focus:outline-none"
            />

            {/* Deposit Payment Method */}
            <div className="pt-1">
              <span className="block text-[11px] font-bold text-amber-900 mb-1.5 uppercase">
                Hình thức nhận cọc:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDepositMethod('transfer')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-bold transition ${
                    depositMethod === 'transfer'
                      ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <span>Chuyển Khoản (CK)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDepositMethod('cash')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-bold transition ${
                    depositMethod === 'cash'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <Banknote className="h-4 w-4 text-emerald-600" />
                  <span>Tiền Mặt (TM)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Ghi Chú Đặt Phòng
            </label>
            <input
              type="text"
              placeholder="Yêu cầu thêm gối, check-in muộn..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-3 text-sm font-black text-white shadow-md shadow-amber-500/25 hover:from-amber-600 hover:to-amber-700 active:scale-[0.99] transition"
            >
              <BookmarkPlus className="h-4 w-4" />
              <span>Xác Nhận Giữ Phòng ({formatCurrencyVND(depositAmount)})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
