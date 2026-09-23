import { useState, useMemo } from 'react';
import {
  X,
  BookmarkPlus,
  Search,
  Plus,
  Trash2,
  LogIn,
  User,
  Phone,
  Clock,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { formatCurrencyVND, formatDateTimeDisplay } from '../services/hotelStore';

export default function ReservationListModal({
  isOpen,
  onClose,
  reservations = [],
  isInputLocked = false,
  onCheckInReservation,
  onOpenNewReservation,
  onDeleteReservation,
  onDeleteAllArrived,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'active' | 'arrived'

  // Summary statistics
  const stats = useMemo(() => {
    let totalDeposit = 0;
    let activeDeposit = 0;
    let arrivedDeposit = 0;
    let activeCount = 0;
    let arrivedCount = 0;

    reservations.forEach((r) => {
      const amt = Number(r.deposit_amount) || 0;
      totalDeposit += amt;
      const isArrived = r.status === 'arrived' || r.status === 'completed';
      if (isArrived) {
        arrivedCount += 1;
        arrivedDeposit += amt;
      } else {
        activeCount += 1;
        activeDeposit += amt;
      }
    });

    return {
      totalDeposit,
      activeDeposit,
      arrivedDeposit,
      activeCount,
      arrivedCount,
      totalCount: reservations.length,
    };
  }, [reservations]);

  // Filtered list
  const filteredList = useMemo(() => {
    return reservations.filter((r) => {
      const isArrived = r.status === 'arrived' || r.status === 'completed';
      if (filterTab === 'active' && isArrived) return false;
      if (filterTab === 'arrived' && !isArrived) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const name = (r.customer_name || '').toLowerCase();
        const phone = (r.customer_phone || '').toLowerCase();
        const room = (r.room_number || '').toLowerCase();
        const notes = (r.notes || '').toLowerCase();
        return (
          name.includes(term) ||
          phone.includes(term) ||
          room.includes(term) ||
          notes.includes(term)
        );
      }
      return true;
    });
  }, [reservations, filterTab, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-5 backdrop-blur-xs overflow-y-auto">
      <div className="relative my-4 w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
              <BookmarkPlus className="h-5 w-5" />
            </div>
            <h2 className="text-base font-black uppercase flex items-center gap-2">
              <span>Danh Sách Cọc Phòng</span>
              <span className="rounded bg-amber-500/20 text-amber-300 text-xs px-2 py-0.5 border border-amber-500/40">
                {stats.totalCount} đơn
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {stats.arrivedCount > 0 && onDeleteAllArrived && (
              <button
                type="button"
                onClick={onDeleteAllArrived}
                className="flex items-center gap-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-2.5 py-1.5 shadow-xs active:scale-95 transition"
                title="Xóa tất cả các đơn cọc đã nhận phòng"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Xóa All Đã Nhận ({stats.arrivedCount})</span>
              </button>
            )}

            <button
              type="button"
              disabled={isInputLocked}
              onClick={() => {
                onClose();
                onOpenNewReservation();
              }}
              className="flex items-center gap-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-black text-xs px-3 py-1.5 shadow-xs active:scale-95 transition disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>+ Nhập Cọc</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Quick KPI Stat Cards */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 border-b border-slate-200 text-xs font-mono">
          <div className="rounded-lg bg-white p-2.5 border border-amber-200">
            <span className="text-[10px] font-bold text-amber-900 uppercase font-sans">
              Chờ nhận phòng:
            </span>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="font-black text-amber-700">{stats.activeCount} phòng</span>
              <span className="font-black text-amber-900">{formatCurrencyVND(stats.activeDeposit)}</span>
            </div>
          </div>

          <div className="rounded-lg bg-white p-2.5 border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-900 uppercase font-sans">
              Đã nhận phòng:
            </span>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="font-black text-emerald-700">{stats.arrivedCount} phòng</span>
              <span className="font-black text-emerald-900">{formatCurrencyVND(stats.arrivedDeposit)}</span>
            </div>
          </div>

          <div className="rounded-lg bg-white p-2.5 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-600 uppercase font-sans">
              Tổng tiền cọc:
            </span>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="font-black text-slate-700">{stats.totalCount} tổng</span>
              <span className="font-black text-blue-700">{formatCurrencyVND(stats.totalDeposit)}</span>
            </div>
          </div>
        </div>

        {/* Controls: Search & Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 border-b border-slate-200 bg-white">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên khách, SĐT, số phòng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`rounded px-2.5 py-1 transition ${
                filterTab === 'all' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất Cả ({stats.totalCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('active')}
              className={`rounded px-2.5 py-1 transition ${
                filterTab === 'active' ? 'bg-amber-600 text-white shadow-2xs' : 'text-amber-900 hover:bg-amber-100'
              }`}
            >
              Chờ Nhận ({stats.activeCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('arrived')}
              className={`rounded px-2.5 py-1 transition ${
                filterTab === 'arrived' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-900 hover:bg-emerald-100'
              }`}
            >
              Đã Đến ({stats.arrivedCount})
            </button>
          </div>
        </div>

        {/* Content List Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[50vh]">
          {filteredList.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <BookmarkPlus className="h-8 w-8 mx-auto text-slate-300 mb-1" />
              <p className="font-bold text-slate-600">Không có đơn cọc nào</p>
            </div>
          ) : (
            filteredList.map((res) => {
              const isArrived = res.status === 'arrived' || res.status === 'completed';

              return (
                <div
                  key={res.id}
                  className={`rounded-lg p-2.5 border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    isArrived
                      ? 'bg-emerald-50/50 border-emerald-300'
                      : 'bg-white border-amber-300'
                  }`}
                >
                  {/* Left Column */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Room Badge */}
                    {res.room_number ? (
                      <span
                        className={`font-mono text-xs font-black px-2 py-1 rounded text-white shrink-0 ${
                          isArrived ? 'bg-emerald-700' : 'bg-amber-600'
                        }`}
                      >
                        P.{res.room_number}
                      </span>
                    ) : (
                      <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-1.5 py-1 rounded shrink-0">
                        Chưa xếp
                      </span>
                    )}

                    {/* Customer Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">{res.customer_name}</span>
                        {res.customer_phone && (
                          <span className="text-[11px] font-mono text-slate-600 font-bold">
                            {res.customer_phone}
                          </span>
                        )}
                        {isArrived && (
                          <span className="rounded bg-emerald-600 text-white font-bold text-[9px] px-1 py-0.2">
                            ĐÃ ĐẾN
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                        <span>Giờ đến: {formatDateTimeDisplay(res.expected_check_in)}</span>
                        {res.notes && <span className="font-sans italic text-slate-600">({res.notes})</span>}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Amount & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-black font-mono text-emerald-700">
                        +{formatCurrencyVND(res.deposit_amount)}
                      </span>
                      <span className="block text-[9px] font-bold text-slate-500">
                        {res.deposit_method === 'transfer' ? 'Chuyển khoản (CK)' : 'Tiền mặt (TM)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {!isArrived && (
                        <button
                          type="button"
                          disabled={isInputLocked}
                          onClick={() => {
                            onClose();
                            onCheckInReservation(res);
                          }}
                          className="flex items-center gap-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-2.5 py-1 transition disabled:opacity-50"
                        >
                          <LogIn className="h-3 w-3" />
                          <span>Chọn phòng</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isInputLocked}
                        onClick={() => onDeleteReservation(res.id)}
                        className="flex items-center gap-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs px-2 py-1 transition disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-200 px-4 py-2 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
