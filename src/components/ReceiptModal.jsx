import { X, Printer } from 'lucide-react';
import { HOTEL_CONFIG, formatDateTimeDisplay, formatCurrencyVND } from '../services/hotelStore';
import { PRICE_CONSTANTS } from '../utils/calculateTotalBill';

export default function ReceiptModal({
  isOpen,
  onClose,
  data,
}) {
  if (!isOpen || !data) return null;

  const {
    room,
    booking,
    checkOutTime,
    beerQty = 0,
    waterQty = 0,
    softDrinkQty = 0,
    surchargeAmount = 0,
    surchargeReason = '',
    depositPaid = 0,
    balanceDue = 0,
    cashReceived = 0,
    transferReceived = 0,
    changeDue = 0,
    refundMethod = 'cash',
    notes = '',
    bill,
  } = data;

  const rentalTypeNames = {
    hourly: 'Theo Giờ',
    overnight: 'Qua Đêm',
    daily: 'Ngày Đêm',
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative my-8 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
        {/* Modal Top Actions */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Xem Trước Phiếu Thanh Toán
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Printable Area */}
        <div
          id="printable-receipt"
          className="my-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-slate-800 font-sans shadow-xs"
        >
          {/* Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-4">
            <h2 className="text-base font-black tracking-tight text-slate-950 uppercase">
              {HOTEL_CONFIG.hotelName}
            </h2>
            <p className="text-[11px] text-slate-600 mt-0.5">{HOTEL_CONFIG.address}</p>
            <p className="text-[11px] text-slate-600">Hotline: {HOTEL_CONFIG.phone}</p>
            <p className="text-[10px] text-slate-500 italic mt-0.5">Wifi: {HOTEL_CONFIG.wifiPassword}</p>

            <div className="mt-3 inline-block rounded-md bg-slate-100 px-3 py-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                PHIẾU THANH TOÁN TIỀN PHÒNG
              </h3>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Mã HĐ: #{booking?.id || Date.now()} • Ngày: {new Date().toLocaleDateString('vi-VN')}
            </p>
          </div>

          {/* Stay Info */}
          <div className="py-3 text-xs space-y-1.5 border-b border-dashed border-slate-300">
            <div className="flex justify-between font-bold">
              <span>Số phòng:</span>
              <span className="text-sm font-black text-slate-950">
                PHÒNG {room?.room_number || booking?.room_number}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Hình thức thuê:</span>
              <span className="font-semibold text-slate-900">
                {rentalTypeNames[booking?.rental_type] || 'Theo Giờ'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Khách hàng:</span>
              <span className="font-semibold text-slate-900">
                {booking?.customer_name || 'Khách vãng lai'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Giờ nhận phòng:</span>
              <span className="font-mono-nums font-semibold">
                {formatDateTimeDisplay(booking?.check_in)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Giờ trả phòng:</span>
              <span className="font-mono-nums font-semibold">
                {formatDateTimeDisplay(checkOutTime || booking?.check_out)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Thời gian lưu trú:</span>
              <span className="font-bold text-slate-900">
                {bill?.stayDurationLabel || '---'}
              </span>
            </div>
          </div>

          {/* Itemized Charges Table */}
          <div className="py-3 border-b border-dashed border-slate-300">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] text-slate-500 text-left">
                  <th className="pb-1">Khoản thu</th>
                  <th className="pb-1 text-center">SL</th>
                  <th className="pb-1 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono-nums text-[11px]">
                <tr>
                  <td className="py-1.5 font-sans font-medium text-slate-900">
                    Tiền phòng ({rentalTypeNames[booking?.rental_type]})
                  </td>
                  <td className="py-1.5 text-center">1</td>
                  <td className="py-1.5 text-right font-bold">
                    {formatCurrencyVND(bill?.room_amount)}
                  </td>
                </tr>

                {beerQty > 0 && (
                  <tr>
                    <td className="py-1.5 font-sans text-slate-700">Bia lon</td>
                    <td className="py-1.5 text-center">{beerQty}</td>
                    <td className="py-1.5 text-right font-semibold">
                      {formatCurrencyVND(beerQty * PRICE_CONSTANTS.BEER)}
                    </td>
                  </tr>
                )}

                {waterQty > 0 && (
                  <tr>
                    <td className="py-1.5 font-sans text-slate-700">Nước suối</td>
                    <td className="py-1.5 text-center">{waterQty}</td>
                    <td className="py-1.5 text-right font-semibold">
                      {formatCurrencyVND(waterQty * PRICE_CONSTANTS.WATER)}
                    </td>
                  </tr>
                )}

                {softDrinkQty > 0 && (
                  <tr>
                    <td className="py-1.5 font-sans text-slate-700">Nước ngọt</td>
                    <td className="py-1.5 text-center">{softDrinkQty}</td>
                    <td className="py-1.5 text-right font-semibold">
                      {formatCurrencyVND(softDrinkQty * PRICE_CONSTANTS.SOFT_DRINK)}
                    </td>
                  </tr>
                )}

                {surchargeAmount !== 0 && (
                  <tr>
                    <td className="py-1.5 font-sans text-slate-700">
                      {surchargeAmount > 0 ? `Phụ thu: ${surchargeReason || 'Phụ thu khác'}` : `Giảm trừ: ${surchargeReason || 'Giảm giá'}`}
                    </td>
                    <td className="py-1.5 text-center">1</td>
                    <td className={`py-1.5 text-right font-semibold ${surchargeAmount < 0 ? 'text-rose-600' : ''}`}>
                      {surchargeAmount > 0 ? `+${formatCurrencyVND(surchargeAmount)}` : formatCurrencyVND(surchargeAmount)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Total, Deposit & Payments Breakdown */}
          <div className="py-3 text-xs space-y-1.5 border-b border-dashed border-slate-300">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span>TỔNG GIÁ TRỊ:</span>
              <span className="font-mono-nums">{formatCurrencyVND(bill?.total_amount)}</span>
            </div>

            {depositPaid > 0 && (
              <div className="flex justify-between text-xs text-amber-800 font-bold">
                <span>ĐÃ THU TRƯỚC / TẠM ỨNG:</span>
                <span className="font-mono-nums">-{formatCurrencyVND(depositPaid)}</span>
              </div>
            )}

            {depositPaid > (bill?.total_amount || 0) ? (
              <div className="flex justify-between text-sm font-black text-emerald-800 pt-1">
                <span>TIỀN THỐI LẠI (DƯ CỌC):</span>
                <span className="font-mono-nums text-base">
                  {formatCurrencyVND(depositPaid - (bill?.total_amount || 0))}
                </span>
              </div>
            ) : (
              <div className="flex justify-between text-sm font-black text-slate-950 pt-1">
                <span>CÒN PHẢI THU:</span>
                <span className="font-mono-nums text-base">
                  {formatCurrencyVND(balanceDue || (bill?.total_amount - depositPaid))}
                </span>
              </div>
            )}
          </div>

          {/* Payment Details */}
          <div className="py-3 text-xs space-y-1">
            <div className="text-[11px] font-bold uppercase text-slate-500 mb-1">
              Chi tiết thanh toán của khách:
            </div>
            {cashReceived > 0 && (
              <div className="flex justify-between">
                <span>Tiền mặt trả:</span>
                <span className="font-mono-nums font-semibold">{formatCurrencyVND(cashReceived)}</span>
              </div>
            )}
            {transferReceived > 0 && (
              <div className="flex justify-between">
                <span>Chuyển khoản trả:</span>
                <span className="font-mono-nums font-semibold">{formatCurrencyVND(transferReceived)}</span>
              </div>
            )}
            {changeDue > 0 && (
              <div className="flex justify-between text-rose-700 font-bold">
                <span>Tiền thối lại khách ({refundMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}):</span>
                <span className="font-mono-nums">{formatCurrencyVND(changeDue)}</span>
              </div>
            )}
            {notes && (
              <div className="text-[11px] text-slate-500 italic mt-1">
                Ghi chú: {notes}
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="mt-4 pt-3 text-center border-t border-dashed border-slate-300 text-[10px] text-slate-500">
            <p className="font-semibold text-slate-700">Cảm ơn Quý Khách & Hẹn Gặp Lại!</p>
            <p className="mt-0.5">Hóa đơn điện tử nội bộ • Ngày in: {new Date().toLocaleTimeString('vi-VN')} {new Date().toLocaleDateString('vi-VN')}</p>
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Đóng lại
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 active:scale-[0.99] transition"
          >
            <Printer className="h-4 w-4" />
            <span>In Phiếu Thu (80mm)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
