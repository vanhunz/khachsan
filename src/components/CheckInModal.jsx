import { useState, useEffect } from 'react';
import {
  X,
  LogIn,
  Clock,
  Moon,
  Sun,
  User,
  Phone,
  FileText,
  Wine,
  Plus,
  Minus,
  BedDouble,
  BedSingle,
  BookmarkPlus,
  CheckCircle2,
} from 'lucide-react';
import { getLocalDateTimeString, formatCurrencyVND } from '../services/hotelStore';
import {
  PRICE_CONSTANTS,
  isSpecialRoomNumber,
} from '../utils/calculateTotalBill';

export default function CheckInModal({
  isOpen,
  onClose,
  room,
  availableRooms = [],
  initialData = null,
  onConfirmCheckIn,
}) {
  const [selectedRoomNumber, setSelectedRoomNumber] = useState('');
  const [rentalType, setRentalType] = useState('hourly'); // 'hourly' | 'overnight' | 'daily'
  const [roomRateMode, setRoomRateMode] = useState('single'); // 'single' | 'double'
  const [checkInTime, setCheckInTime] = useState('');
  const [beerQty, setBeerQty] = useState(0);
  const [waterQty, setWaterQty] = useState(0);
  const [softDrinkQty, setSoftDrinkQty] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [depositAmount, setDepositAmount] = useState(0);
  const [reservationId, setReservationId] = useState(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const matchedRoom = availableRooms.find((r) => String(r.room_number) === String(initialData.roomNumber));
        const initRoomNum = matchedRoom ? String(matchedRoom.room_number) : (room ? String(room.room_number) : (availableRooms[0]?.room_number || '101'));
        setSelectedRoomNumber(initRoomNum);
        setRentalType(initialData.rentalType || 'hourly');
        setRoomRateMode(initialData.roomRateMode || 'single');
        setCheckInTime(getLocalDateTimeString(new Date()));
        setBeerQty(0);
        setWaterQty(0);
        setSoftDrinkQty(0);
        setCustomerName(initialData.customerName || '');
        setCustomerPhone(initialData.customerPhone || '');
        setDepositAmount(Number(initialData.depositAmount) || 0);
        setReservationId(initialData.reservationId || null);
        setNotes(initialData.notes || '');
      } else {
        const initRoomNum = room ? String(room.room_number) : (availableRooms[0]?.room_number || '101');
        setSelectedRoomNumber(initRoomNum);
        setRentalType('hourly');
        setRoomRateMode('single');
        setCheckInTime(getLocalDateTimeString(new Date()));
        setBeerQty(0);
        setWaterQty(0);
        setSoftDrinkQty(0);
        setCustomerName('');
        setCustomerPhone('');
        setDepositAmount(0);
        setReservationId(null);
        setNotes('');
      }
    }
  }, [isOpen, room, availableRooms, initialData]);

  if (!isOpen) return null;

  const isSpecial = isSpecialRoomNumber(selectedRoomNumber);
  const isDouble = isSpecial && roomRateMode === 'double';

  const totalWaterAmount =
    beerQty * PRICE_CONSTANTS.BEER +
    waterQty * PRICE_CONSTANTS.WATER +
    softDrinkQty * PRICE_CONSTANTS.SOFT_DRINK;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedRoomNumber) return;

    onConfirmCheckIn({
      roomNumber: selectedRoomNumber,
      rentalType,
      roomRateMode: isSpecial ? roomRateMode : 'single',
      checkInTime,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      depositAmount,
      reservationId,
      drinks: {
        beer_qty: beerQty,
        water_qty: waterQty,
        soft_drink_qty: softDrinkQty,
      },
      notes: notes.trim(),
    });
    onClose();
  };

  const rentalOptions = [
    {
      id: 'hourly',
      name: 'Theo Giờ',
      icon: Clock,
      price: '80.000đ / đầu',
      desc: '+20.000đ/giờ (ân hạn 10p)',
    },
    {
      id: 'overnight',
      name: 'Qua Đêm',
      icon: Moon,
      price: isDouble
        ? formatCurrencyVND(PRICE_CONSTANTS.OVERNIGHT_DOUBLE)
        : formatCurrencyVND(PRICE_CONSTANTS.OVERNIGHT_SINGLE),
      desc: '20:00 tối - 09:00 sáng',
    },
    {
      id: 'daily',
      name: 'Ngày Đêm',
      icon: Sun,
      price: isDouble
        ? formatCurrencyVND(PRICE_CONSTANTS.DAILY_DOUBLE)
        : formatCurrencyVND(PRICE_CONSTANTS.DAILY_SINGLE),
      desc: '12:00 trưa - 12:00 trưa',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative my-4 w-full max-w-lg rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
              <LogIn className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  Nhận Phòng P.{selectedRoomNumber}
                </h2>
                {isSpecial && (
                  <span className="rounded bg-amber-100 border border-amber-300 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                    Phòng Đơn / Đôi
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Nhập thông tin nhận phòng và bắt đầu tính giờ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Deposit Banner if check-in is originating from reservation deposit */}
        {depositAmount > 0 && (
          <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <BookmarkPlus className="h-4 w-4 text-amber-700 shrink-0" />
              <span>
                Đã thu cọc trước: <strong className="font-mono text-emerald-800 text-sm font-black">{formatCurrencyVND(depositAmount)}</strong>
              </span>
            </div>
            <span className="rounded bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold">
              ✓ Đã trừ vào đơn phòng
            </span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-3 space-y-3.5">
          {/* Chọn phòng & Giờ vào */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Số phòng <span className="text-rose-600">*</span>
              </label>
              <select
                value={selectedRoomNumber}
                onChange={(e) => setSelectedRoomNumber(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs sm:text-sm font-bold text-slate-900 focus:border-slate-800 focus:outline-none"
              >
                {availableRooms.length > 0 ? (
                  availableRooms.map((r) => (
                    <option key={r.id} value={r.room_number}>
                      Phòng {r.room_number} (Tầng {r.floor || r.room_number[0]} - {r.status === 'available' ? 'Trống' : 'Đang dọn'})
                    </option>
                  ))
                ) : room ? (
                  <option value={room.room_number}>
                    Phòng {room.room_number} (Tầng {room.floor || room.room_number[0]})
                  </option>
                ) : (
                  <option value="">Không có phòng trống</option>
                )}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Giờ nhận phòng <span className="text-rose-600">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setCheckInTime(getLocalDateTimeString(new Date()))}
                  className="text-[11px] font-semibold text-blue-600 hover:underline"
                >
                  Lấy giờ hiện tại
                </button>
              </div>
              <input
                type="datetime-local"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold font-mono text-slate-900 focus:border-slate-800 focus:outline-none"
              />
            </div>
          </div>

          {/* DÀNH CHO PHÒNG 104, 204, 303: CHỌN PHÒNG ĐƠN HAY ĐÔI */}
          {isSpecial && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3">
              <label className="block text-xs font-black text-amber-950 mb-1.5">
                Lựa chọn loại phòng (Áp dụng cho P.{selectedRoomNumber}) <span className="text-rose-600">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRoomRateMode('single')}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2.5 px-2 text-xs font-black border transition ${
                    roomRateMode === 'single'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-800 border-amber-200 hover:bg-amber-100/60'
                  }`}
                >
                  <BedSingle className="h-4 w-4 text-amber-400" />
                  <div className="text-left leading-tight">
                    <div>Phòng Đơn</div>
                    <div className={`text-[10px] font-mono ${roomRateMode === 'single' ? 'text-amber-300' : 'text-slate-500'}`}>
                      Qua đêm: 200k • Ngày: 350k
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRoomRateMode('double')}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2.5 px-2 text-xs font-black border transition ${
                    roomRateMode === 'double'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-800 border-amber-200 hover:bg-amber-100/60'
                  }`}
                >
                  <BedDouble className="h-4 w-4 text-amber-400" />
                  <div className="text-left leading-tight">
                    <div>Phòng Đôi</div>
                    <div className={`text-[10px] font-mono ${roomRateMode === 'double' ? 'text-amber-300' : 'text-slate-500'}`}>
                      Qua đêm: 350k • Ngày: 500k
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Hình thức thuê - 3 nút đơn giản, hiện rõ tiền */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Hình thức thuê phòng <span className="text-rose-600">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {rentalOptions.map((opt) => {
                const isSelected = rentalType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRentalType(opt.id)}
                    className={`flex flex-col items-center justify-center rounded-xl p-2.5 text-center border transition ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-bold">{opt.name}</span>
                    <span
                      className={`text-xs font-mono font-bold mt-0.5 ${
                        isSelected ? 'text-amber-300' : 'text-slate-900'
                      }`}
                    >
                      {opt.price}
                    </span>
                    <span
                      className={`text-[10px] mt-0.5 ${
                        isSelected ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nước uống / Minibar ban đầu (nếu khách lấy) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Wine className="h-4 w-4 text-slate-600" />
                Nước uống / Minibar lấy trước
              </span>
              <span className="text-xs font-bold font-mono text-slate-900">
                +{formatCurrencyVND(totalWaterAmount)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Bia */}
              <div className="flex items-center justify-between bg-white p-1.5 rounded-lg border border-slate-200">
                <div className="text-[11px] font-bold text-slate-800">
                  Bia (20k)
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setBeerQty((q) => Math.max(0, q - 1))}
                    className="h-5 w-5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-4 text-center font-bold font-mono text-xs">{beerQty}</span>
                  <button
                    type="button"
                    onClick={() => setBeerQty((q) => q + 1)}
                    className="h-5 w-5 rounded bg-slate-800 text-white hover:bg-black flex items-center justify-center font-bold"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Nước suối */}
              <div className="flex items-center justify-between bg-white p-1.5 rounded-lg border border-slate-200">
                <div className="text-[11px] font-bold text-slate-800">
                  Nước (10k)
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setWaterQty((q) => Math.max(0, q - 1))}
                    className="h-5 w-5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-4 text-center font-bold font-mono text-xs">{waterQty}</span>
                  <button
                    type="button"
                    onClick={() => setWaterQty((q) => q + 1)}
                    className="h-5 w-5 rounded bg-slate-800 text-white hover:bg-black flex items-center justify-center font-bold"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Nước ngọt */}
              <div className="flex items-center justify-between bg-white p-1.5 rounded-lg border border-slate-200">
                <div className="text-[11px] font-bold text-slate-800">
                  Ngọt (15k)
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSoftDrinkQty((q) => Math.max(0, q - 1))}
                    className="h-5 w-5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-4 text-center font-bold font-mono text-xs">{softDrinkQty}</span>
                  <button
                    type="button"
                    onClick={() => setSoftDrinkQty((q) => q + 1)}
                    className="h-5 w-5 rounded bg-slate-800 text-white hover:bg-black flex items-center justify-center font-bold"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tên khách, SĐT & Ghi chú */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tên khách hàng
              </label>
              <div className="relative">
                <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ví dụ: Anh Tuấn..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Số điện thoại
              </label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="tel"
                  placeholder="0912 345 678"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-800 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ghi chú nhận phòng
              </label>
              <div className="relative">
                <FileText className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ghi chú thêm..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Nút thao tác */}
          <div className="flex gap-2.5 pt-2.5 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-300 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="flex-[2] flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2 text-xs sm:text-sm font-bold text-white hover:bg-black active:scale-[0.99] transition"
            >
              <LogIn className="h-4 w-4" />
              <span>Xác Nhận Nhận Phòng {selectedRoomNumber ? `P.${selectedRoomNumber}` : ''}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

