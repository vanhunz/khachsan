import { X, HelpCircle, Check, Info } from 'lucide-react';
import { PRICE_CONSTANTS } from '../utils/calculateTotalBill';
import { formatCurrencyVND } from '../services/hotelStore';

export default function PriceRulesModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <Info className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900">
                Bảng Giá Quy Chuẩn & Công Thức Tính (PRD)
              </h2>
              <p className="text-xs text-slate-500">
                Hệ thống tự động hóa 100% tính toán theo các tham số dưới đây
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

        <div className="mt-5 space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs">
          {/* Room Rates */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-2.5">
              1. Giá Phòng & Quy Tắc Tính Giờ
            </h3>
            <div className="space-y-3 text-slate-700">
              <div className="rounded-xl bg-white p-3 border border-slate-200">
                <div className="font-bold text-slate-900 mb-1">🛏️ PHÒNG ĐƠN (Tất cả các phòng tiêu chuẩn & 104, 204, 303 khi chọn Đơn):</div>
                <div className="grid grid-cols-3 gap-2 text-center mt-1.5">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-500">Theo Giờ</div>
                    <div className="text-xs font-black font-mono text-slate-900">80k + 20k/h</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-500">Qua Đêm (20h - 9h)</div>
                    <div className="text-xs font-black font-mono text-indigo-700">200.000đ</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-500">Ngày Đêm (12h - 12h)</div>
                    <div className="text-xs font-black font-mono text-amber-700">350.000đ</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-amber-50/80 p-3 border border-amber-300">
                <div className="font-bold text-amber-950 mb-1">🛏️🛏️ PHÒNG ĐÔI (Áp dụng cho phòng 104, 204, 303 khi chọn Đôi):</div>
                <div className="grid grid-cols-3 gap-2 text-center mt-1.5">
                  <div className="bg-white p-2 rounded-lg border border-amber-200">
                    <div className="text-[11px] text-slate-500">Theo Giờ</div>
                    <div className="text-xs font-black font-mono text-slate-900">80k + 20k/h</div>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-amber-200">
                    <div className="text-[11px] text-slate-500">Qua Đêm (20h - 9h)</div>
                    <div className="text-xs font-black font-mono text-indigo-700">350.000đ</div>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-amber-200">
                    <div className="text-[11px] text-slate-500">Ngày Đêm (12h - 12h)</div>
                    <div className="text-xs font-black font-mono text-amber-700">500.000đ</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Minibar Rates */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-2">
              2. Bảng Giá Minibar & Nước Uống
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-white p-2.5 border border-slate-200 text-center">
                <span className="block text-slate-500 font-medium">Bia lon</span>
                <span className="text-sm font-black font-mono-nums text-slate-900">
                  {formatCurrencyVND(PRICE_CONSTANTS.BEER)}
                </span>
              </div>
              <div className="rounded-xl bg-white p-2.5 border border-slate-200 text-center">
                <span className="block text-slate-500 font-medium">Nước suối</span>
                <span className="text-sm font-black font-mono-nums text-slate-900">
                  {formatCurrencyVND(PRICE_CONSTANTS.WATER)}
                </span>
              </div>
              <div className="rounded-xl bg-white p-2.5 border border-slate-200 text-center">
                <span className="block text-slate-500 font-medium">Nước ngọt</span>
                <span className="text-sm font-black font-mono-nums text-slate-900">
                  {formatCurrencyVND(PRICE_CONSTANTS.SOFT_DRINK)}
                </span>
              </div>
            </div>
          </div>

          {/* Formulas */}
          <div className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 mb-2">
              3. Công Thức Tổng Thanh Toán
            </h3>
            <div className="space-y-1.5 font-mono-nums text-[11px] text-slate-300">
              <div>Tiền nước = (Bia × 20k) + (Nước × 10k) + (Nước ngọt × 15k)</div>
              <div>Tổng cộng = Tiền phòng + Tiền nước + Phụ thu</div>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
          >
            Đã Hiểu
          </button>
        </div>
      </div>
    </div>
  );
}
