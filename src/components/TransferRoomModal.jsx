import { useState, useMemo } from 'react';
import { ArrowRightLeft, X, Building, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatCurrencyVND } from '../services/hotelStore';

export default function TransferRoomModal({
  isOpen,
  onClose,
  currentRoom,
  activeBooking,
  availableRooms = [],
  onConfirmTransfer,
}) {
  const [selectedTargetRoom, setSelectedTargetRoom] = useState('');
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const availableTargetRooms = useMemo(() => {
    return availableRooms.filter(
      (r) => String(r.room_number) !== String(currentRoom?.room_number)
    );
  }, [availableRooms, currentRoom]);

  if (!isOpen || !currentRoom || !activeBooking) return null;

  const handleConfirm = () => {
    if (!selectedTargetRoom) {
      setErrorMsg('Vui lòng chọn một phòng trống để chuyển đến!');
      return;
    }
    setErrorMsg('');
    onConfirmTransfer(currentRoom.room_number, selectedTargetRoom, reason.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <ArrowRightLeft className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight">CHUYỂN PHÒNG KHÁCH ĐANG Ở</h3>
              <p className="text-[11px] text-slate-300">
                Phòng hiện tại: <span className="font-bold text-amber-300">P.{currentRoom.room_number}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3.5 text-xs text-slate-800">
          {/* Current Stay Summary */}
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Khách hàng:</span>
              <span className="font-bold text-slate-900">{activeBooking.customer_name || 'Khách vãng lai'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Hình thức thuê:</span>
              <span className="font-bold text-slate-900">
                {activeBooking.rental_type === 'overnight'
                  ? 'Qua đêm'
                  : activeBooking.rental_type === 'daily'
                  ? 'Ngày đêm'
                  : 'Giờ'}
              </span>
            </div>
            {Number(activeBooking.deposit_amount || 0) > 0 && (
              <div className="flex items-center justify-between text-emerald-700 font-bold">
                <span>Đã thu trước:</span>
                <span>{formatCurrencyVND(activeBooking.deposit_amount)}</span>
              </div>
            )}
          </div>

          {/* Target Room Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Chọn phòng trống chuyển sang <span className="text-rose-600">*</span>:
            </label>
            {availableTargetRooms.length === 0 ? (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Hiện không còn phòng nào khác đang trống để chuyển!</span>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {availableTargetRooms.map((r) => {
                  const isSelected = String(selectedTargetRoom) === String(r.room_number);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setSelectedTargetRoom(String(r.room_number));
                        setErrorMsg('');
                      }}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border-2 transition active:scale-95 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 text-blue-900 font-black shadow-sm'
                          : 'border-slate-200 hover:border-slate-400 bg-white text-slate-800 font-bold'
                      }`}
                    >
                      <Building className={`h-4 w-4 mb-0.5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span className="text-sm font-mono-nums">P.{r.room_number}</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        Tầng {r.floor || String(r.room_number)[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reason / Note input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Lý do / Ghi chú chuyển phòng:
            </label>
            <input
              type="text"
              placeholder="VD: Khách muốn tầng cao hơn, hỏng điều hòa..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 font-bold bg-rose-50 p-2 rounded-lg border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            Đóng / Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedTargetRoom || availableTargetRooms.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-black text-white hover:bg-blue-700 active:scale-95 transition shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>XÁC NHẬN CHUYỂN PHÒNG</span>
          </button>
        </div>
      </div>
    </div>
  );
}
