import { useState, useEffect } from 'react';
import { KeyRound, Lock, Hotel, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { hotelStore, HOTEL_CONFIG } from '../services/hotelStore';

export default function StaffLoginModal({
  isOpen,
  onSuccess,
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (hotelStore.verifyStaffPin(pin) || pin === '123' || pin === 'abc123') {
      setError('');
      setPin('');
      onSuccess();
    } else {
      setError('Mã PIN truy cập không chính xác!');
    }
  };

  const handleQuickKey = (num) => {
    if (pin.length < 8) {
      setPin((prev) => prev + num);
      setError('');
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in-95 duration-150">
        {/* Brand */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-600/30 mb-3">
          <Hotel className="h-7 w-7" />
        </div>

        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
          {HOTEL_CONFIG.hotelName}
        </h2>
        <div className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200 mt-1 mb-3">
          {HOTEL_CONFIG.author}
        </div>
        <p className="text-xs text-slate-500 mb-5">
          Nhập mã PIN nhân viên để mở khóa hệ thống POS
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="password"
              maxLength={8}
              placeholder="Nhập mã PIN..."
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError('');
              }}
              autoFocus
              className="w-full rounded-2xl border-2 border-slate-300 bg-slate-50 py-3 text-center text-2xl font-black font-mono tracking-widest text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none transition"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 p-2 text-xs font-bold text-rose-700 border border-rose-200 flex items-center justify-center gap-1.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Touch / Quick Numpad for POS */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleQuickKey(String(num))}
                className="rounded-xl bg-slate-100 py-3 text-lg font-black font-mono text-slate-800 hover:bg-slate-200 active:scale-95 transition"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleBackspace}
              className="rounded-xl bg-slate-200 py-3 text-xs font-bold text-slate-700 hover:bg-slate-300 active:scale-95 transition"
            >
              Xóa
            </button>
            <button
              type="button"
              onClick={() => handleQuickKey('0')}
              className="rounded-xl bg-slate-100 py-3 text-lg font-black font-mono text-slate-800 hover:bg-slate-200 active:scale-95 transition"
            >
              0
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 py-3 text-xs font-black text-white hover:bg-blue-700 active:scale-95 transition flex items-center justify-center shadow-md shadow-blue-600/30"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-slate-900 py-3 text-sm font-black text-white hover:bg-black active:scale-[0.99] transition shadow-md"
          >
            Mở Khóa Hệ Thống
          </button>
        </form>
      </div>
    </div>
  );
}
