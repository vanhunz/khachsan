import { useState, useEffect } from 'react';
import {
  LogIn,
  LogOut,
  Sparkles,
  Clock,
  CheckCircle2,
  Coins,
  User,
  Edit3,
} from 'lucide-react';
import {
  calculateTotalBill,
  formatStayDuration,
  calculateStayMinutes,
  isSpecialRoomNumber,
} from '../utils/calculateTotalBill';
import { formatCurrencyVND } from '../services/hotelStore';

export default function RoomCard({
  room,
  activeBooking,
  isInputLocked = false,
  onCheckIn,
  onCheckOut,
  onOpenAdvancePayment,
  onOpenEditBooking,
  onSetStatus,
}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const hasActiveBooking = Boolean(activeBooking && activeBooking.status === 'active');
  const isOccupied = hasActiveBooking || (room.status === 'occupied' && Boolean(activeBooking));
  const isAvailable = !isOccupied;
  const isSpecial = isSpecialRoomNumber(room.room_number);

  // Dynamic live calculation if occupied
  let liveStayMinutes = 0;
  let liveBill = null;
  let liveBalanceDue = 0;
  const depositPaid = Number(activeBooking?.paid_amount || 0);

  if (isOccupied && activeBooking?.check_in) {
    liveStayMinutes = calculateStayMinutes(activeBooking.check_in, null, now);
    liveBill = calculateTotalBill(
      activeBooking.check_in,
      null,
      activeBooking.rental_type || 'hourly',
      {
        beer_qty: activeBooking.beer_qty || 0,
        water_qty: activeBooking.water_qty || 0,
        soft_drink_qty: activeBooking.soft_drink_qty || 0,
      },
      activeBooking.surcharge_amount || 0,
      now,
      activeBooking.room_rate_mode || 'single',
      room.room_number
    );
    liveBalanceDue = Math.max(0, liveBill.total_amount - depositPaid);
  }

  const rentalTypeLabels = {
    hourly: 'Giờ',
    overnight: 'Qua Đêm',
    daily: 'Ngày Đêm',
  };

  return (
    <div
      className={`relative flex flex-col justify-between rounded-xl border-2 transition-all duration-100 p-2 sm:p-2.5 select-none shadow-2xs ${
        isOccupied
          ? 'border-rose-400 bg-rose-50/40 hover:border-rose-500'
          : 'border-emerald-400 bg-emerald-50/30 hover:border-emerald-500'
      }`}
    >
      {/* Top Header: Room Number + Floor + Special Badge + Status */}
      <div>
        <div className="flex items-center justify-between border-b pb-1 border-slate-200">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black font-mono-nums tracking-tight text-slate-950">
              {room.room_number}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              T.{room.floor || String(room.room_number)[0]}
            </span>
            {isSpecial && !isOccupied && (
              <span className="text-[9px] font-bold text-amber-900 bg-amber-100 px-1 py-0.2 rounded border border-amber-300">
                Đơn 200k • Đôi 350k
              </span>
            )}
          </div>

          {/* Status Badge */}
          {isOccupied ? (
            <div className="flex items-center gap-1 rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              <span>Đang Ở</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-2xs">
              <CheckCircle2 className="h-2.5 w-2.5" />
              <span>Trống</span>
            </div>
          )}
        </div>

        {/* --- 1. OCCUPIED ROOM BODY --- */}
        {isOccupied && liveBill && (
          <div className="my-1.5 space-y-1 rounded-lg bg-white p-1.5 border border-rose-200 text-xs shadow-2xs">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
              <span className="truncate max-w-[100px] flex items-center gap-0.5">
                <User className="h-3 w-3 text-slate-400 shrink-0" />
                <span className="truncate">{activeBooking.customer_name || 'Khách vãng lai'}</span>
              </span>
              <span className="font-mono text-rose-700 font-black">
                {formatCurrencyVND(depositPaid > 0 ? liveBalanceDue : liveBill.total_amount)}
              </span>
            </div>

            {depositPaid > 0 && (
              <div className="flex items-center justify-between text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
                <span className="flex items-center gap-0.5">
                  <Coins className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                  <span>Đã thu: {formatCurrencyVND(depositPaid)}</span>
                </span>
                <span className="text-slate-600 font-medium">
                  (Tổng: {formatCurrencyVND(liveBill.total_amount)})
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-[10px] text-slate-600 font-medium">
              <span className="flex items-center gap-1">
                {isSpecial && (
                  <span className="rounded bg-amber-100 text-amber-900 border border-amber-300 px-1 py-0.2 font-black text-[9px]">
                    {activeBooking.room_rate_mode === 'double' ? 'Đôi' : 'Đơn'}
                  </span>
                )}
                <span>{rentalTypeLabels[activeBooking.rental_type] || 'Giờ'}</span>
              </span>
              <span className="flex items-center gap-0.5 font-mono text-slate-700 font-bold bg-slate-100 px-1 rounded">
                <Clock className="h-2.5 w-2.5 text-rose-600" />
                {formatStayDuration(liveStayMinutes)}
              </span>
            </div>
          </div>
        )}

        {/* --- 2. AVAILABLE ROOM BODY --- */}
        {isAvailable && (
          <div className="my-1.5 flex items-center justify-center gap-1.5 py-1 text-xs font-bold text-emerald-900 bg-emerald-100/50 rounded-lg">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Phòng Trống</span>
          </div>
        )}
      </div>

      {/* Action Buttons Footer (Ultra-Compact POS Buttons) */}
      <div className="pt-1 border-t border-slate-200">
        {isOccupied ? (
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => onOpenEditBooking && onOpenEditBooking(room, activeBooking)}
              className="flex items-center justify-center gap-0.5 rounded-md bg-indigo-600 py-1.5 px-0.5 text-xs font-bold text-white hover:bg-indigo-700 active:scale-[0.98] transition shadow-2xs"
              title="Sửa nước, phụ thu, loại phòng..."
            >
              <Edit3 className="h-3 w-3 shrink-0" />
              <span>Sửa/DV</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenAdvancePayment(room, activeBooking)}
              className="flex items-center justify-center gap-0.5 rounded-md bg-emerald-600 py-1.5 px-0.5 text-xs font-bold text-white hover:bg-emerald-700 active:scale-[0.98] transition shadow-2xs"
              title="Thu trước một phần tiền"
            >
              <Coins className="h-3 w-3 shrink-0" />
              <span>Thu trước</span>
            </button>

            <button
              type="button"
              onClick={() => onCheckOut(room, activeBooking)}
              className="flex items-center justify-center gap-0.5 rounded-md bg-rose-600 py-1.5 px-0.5 text-xs font-bold text-white hover:bg-rose-700 active:scale-[0.98] transition shadow-2xs"
              title="Thanh toán & Trả phòng"
            >
              <LogOut className="h-3 w-3 shrink-0" />
              <span>Trả phòng</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onCheckIn(room)}
            className="w-full flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 py-1.5 px-2 text-xs font-black text-white hover:bg-emerald-700 active:scale-[0.98] transition shadow-2xs"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>NHẬN PHÒNG</span>
          </button>
        )}
      </div>
    </div>
  );
}

