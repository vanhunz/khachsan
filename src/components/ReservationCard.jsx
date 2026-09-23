import {
  BookmarkPlus,
  LogIn,
  User,
  Clock,
  Plus,
  ListOrdered,
  Calendar,
} from 'lucide-react';
import { formatCurrencyVND, formatDateTimeDisplay } from '../services/hotelStore';

export default function ReservationCard({
  reservations = [],
  isInputLocked = false,
  onCheckInReservation,
  onOpenNewReservation,
  onOpenFullList,
}) {
  const activeReservations = reservations.filter((r) => r.status === 'active');
  const arrivedReservations = reservations.filter(
    (r) => r.status === 'arrived' || r.status === 'completed'
  );

  const totalActive = activeReservations.length;
  const totalArrived = arrivedReservations.length;
  const topActive = activeReservations[0];

  return (
    <div className="relative flex flex-col justify-between rounded-xl border-2 border-amber-400 bg-amber-50/40 p-2 sm:p-2.5 select-none shadow-2xs hover:border-amber-500 transition-all duration-100">
      {/* Top Header: Title & Status Badge */}
      <div>
        <div className="flex items-center justify-between border-b pb-1 border-amber-200">
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-600 text-white shadow-2xs">
              <BookmarkPlus className="h-3.5 w-3.5" />
            </div>
            <span className="text-base sm:text-lg font-black tracking-tight uppercase text-amber-950">
              CỌC PHÒNG
            </span>
          </div>

          {/* Status Badge */}
          {totalActive > 0 ? (
            <div className="flex items-center gap-1 rounded bg-amber-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              <span>Đang có {totalActive} phòng đặt</span>
            </div>
          ) : totalArrived > 0 ? (
            <div className="flex items-center gap-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-2xs">
              <span>Đã nhận hết ({totalArrived})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
              <span>0 cọc</span>
            </div>
          )}
        </div>

        {/* Middle Body: Matching RoomCard Height */}
        {totalActive > 0 && topActive ? (
          <div className="my-1.5 space-y-1 rounded-lg bg-white p-1.5 border border-amber-300 text-xs shadow-2xs">
            {/* Row 1: Room / Unassigned + Customer Name + Deposit */}
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-900">
              <div className="flex items-center gap-1 min-w-0 flex-1">
                {topActive.room_number ? (
                  <span className="font-mono bg-amber-600 text-white px-1 rounded text-[10px] font-black shrink-0">
                    P.{topActive.room_number}
                  </span>
                ) : (
                  <span className="bg-amber-100 text-amber-900 border border-amber-300 px-1 rounded text-[9px] font-black shrink-0">
                    Chưa xếp
                  </span>
                )}
                <span className="truncate flex items-center gap-0.5">
                  <User className="h-3 w-3 text-amber-700 shrink-0 inline" />
                  <span className="truncate">{topActive.customer_name}</span>
                </span>
              </div>
              <span className="font-mono text-emerald-700 font-black shrink-0">
                +{formatCurrencyVND(topActive.deposit_amount)}
              </span>
            </div>

            {/* Row 2: Expected check-in time & Extra count badge */}
            <div className="flex items-center justify-between text-[10px] text-slate-600 font-medium">
              <span className="flex items-center gap-1 font-mono text-slate-500">
                <Clock className="h-2.5 w-2.5 text-amber-600 shrink-0" />
                <span>{formatDateTimeDisplay(topActive.expected_check_in)}</span>
              </span>
              {totalActive > 1 ? (
                <button
                  type="button"
                  onClick={onOpenFullList}
                  className="font-bold text-[10px] text-amber-800 bg-amber-100 hover:bg-amber-200 px-1 rounded transition"
                >
                  +{totalActive - 1} đơn khác
                </button>
              ) : (
                <span className="font-bold text-[9px] text-blue-700 font-mono">
                  {topActive.deposit_method === 'transfer' ? 'CK' : 'Tiền mặt'}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="my-1.5 flex items-center justify-center gap-1.5 py-1 text-xs font-semibold text-slate-600 bg-amber-100/50 rounded-lg">
            <BookmarkPlus className="h-3.5 w-3.5 text-amber-600" />
            <span>Chưa có khách đặt cọc</span>
          </div>
        )}
      </div>

      {/* Action Buttons Footer: 1 Compact Row matching RoomCard's button grid */}
      <div className="pt-1 border-t border-amber-200">
        {totalActive > 0 ? (
          <div className="grid grid-cols-3 gap-1">
            {/* Button 1: Chọn phòng đang trống */}
            <button
              type="button"
              disabled={isInputLocked}
              onClick={() => topActive && onCheckInReservation && onCheckInReservation(topActive)}
              className="flex items-center justify-center gap-0.5 rounded-md bg-emerald-600 py-1.5 px-0.5 text-xs font-bold text-white hover:bg-emerald-700 active:scale-[0.98] transition shadow-2xs disabled:opacity-50"
              title="Chọn phòng đang trống để giao cho khách"
            >
              <LogIn className="h-3 w-3 shrink-0" />
              <span>Chọn phòng</span>
            </button>

            {/* Button 2: Danh sách */}
            <button
              type="button"
              onClick={onOpenFullList}
              className="flex items-center justify-center gap-0.5 rounded-md border border-amber-300 bg-white py-1.5 px-0.5 text-xs font-bold text-amber-900 hover:bg-amber-100 active:scale-[0.98] transition shadow-2xs"
              title="Xem và quản lý tất cả đơn cọc"
            >
              <ListOrdered className="h-3 w-3 shrink-0" />
              <span>Danh sách</span>
            </button>

            {/* Button 3: Nhập cọc mới */}
            <button
              type="button"
              disabled={isInputLocked}
              onClick={onOpenNewReservation}
              className="flex items-center justify-center gap-0.5 rounded-md bg-amber-600 py-1.5 px-0.5 text-xs font-bold text-white hover:bg-amber-700 active:scale-[0.98] transition shadow-2xs disabled:opacity-50"
              title="Nhập thêm đơn cọc mới"
            >
              <Plus className="h-3 w-3 shrink-0" />
              <span>+ Cọc</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1">
            <button
              type="button"
              disabled={isInputLocked}
              onClick={onOpenNewReservation}
              className="col-span-3 flex items-center justify-center gap-1.5 rounded-md bg-amber-600 py-1.5 px-1 text-xs font-black text-white hover:bg-amber-700 active:scale-[0.98] transition shadow-2xs disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ NHẬP CỌC</span>
            </button>

            <button
              type="button"
              onClick={onOpenFullList}
              title="Xem danh sách cọc"
              className="col-span-1 flex items-center justify-center rounded-md border border-amber-300 bg-white text-amber-900 hover:bg-amber-100 transition shadow-2xs"
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
