import { useState, useEffect } from 'react';
import {
  Hotel,
  Clock,
  CalendarCheck,
  Receipt,
  Lock,
  RotateCcw,
  Layers,
  HelpCircle,
  Table,
  Wifi,
  WifiOff,
  MinusCircle,
  Cloud,
  CloudOff,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { HOTEL_CONFIG } from '../services/hotelStore';
import { networkService } from '../services/networkService';

export default function Navbar({
  activeTab,
  setActiveTab,
  rooms = [],
  supabaseStatus = 'disabled',
  onOpenClosureModal,
  onOpenExpenseModal,
  onOpenAdminPortal,
  onResetData,
  onOpenPriceRules,
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(() => networkService.isOnline);

  useEffect(() => {
    const handleNet = (e) => setIsOnline(e.detail.isOnline);
    window.addEventListener('network-status-changed', handleNet);
    return () => window.removeEventListener('network-status-changed', handleNet);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcut listener for desktop F1-F4
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setActiveTab('matrix');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('excel');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setActiveTab('transactions');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setActiveTab('closures');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTab]);

  const occupiedCount = rooms.filter((r) => r.status === 'occupied').length;
  const availableCount = rooms.filter((r) => r.status === 'available').length;

  const timeString = currentTime.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const dateString = currentTime.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <header className="sticky top-0 z-30 border-b-2 border-slate-300 bg-slate-900 text-white shadow-md">
      {/* Top PC App Bar */}
      <div className="mx-auto flex w-full items-center justify-between px-3 py-1.5 sm:px-4 sm:py-2">
        {/* Left: Brand & Hotel Info (Hotline removed as requested) */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs font-black">
            <Hotel className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white uppercase">
                {HOTEL_CONFIG.hotelName}
              </h1>
              <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-500/30">
                {HOTEL_CONFIG.author}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Main Navigation Tabs (Desktop POS) */}
        <nav className="hidden md:flex items-center gap-1 rounded-lg bg-slate-800/90 p-0.5 border border-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-black transition ${
              activeTab === 'matrix'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Sơ Đồ Phòng</span>
            <span className="text-[9px] opacity-70 font-mono">F1</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('excel')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-black transition ${
              activeTab === 'excel'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Table className="h-3.5 w-3.5" />
            <span>Bảng Tính Excel POS</span>
            <span className="text-[9px] opacity-70 font-mono">F2</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-black transition ${
              activeTab === 'transactions'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Receipt className="h-3.5 w-3.5" />
            <span>Sổ Quỹ Dòng Tiền</span>
            <span className="text-[9px] opacity-70 font-mono">F3</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('closures')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-black transition ${
              activeTab === 'closures'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <CalendarCheck className="h-3.5 w-3.5" />
            <span>Lịch Sử Chốt Ca</span>
            <span className="text-[9px] opacity-70 font-mono">F4</span>
          </button>
        </nav>

        {/* Right: Real-time Stats, Digital Clock & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Room quick pills */}
          <div className="flex items-center gap-1 text-[11px] font-mono font-bold">
            <span className="rounded-md bg-rose-600 px-2 py-0.5 text-white shadow-2xs">
              {occupiedCount} Ở
            </span>
            <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-white shadow-2xs">
              {availableCount} Trống
            </span>
          </div>

          {/* Online/Offline Network Status Indicator */}
          <div
            className={`hidden sm:flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold border transition ${
              isOnline
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                : 'bg-rose-950/80 text-rose-300 border-rose-800'
            }`}
            title={isOnline ? 'Mạng Internet: Đang trực tuyến' : 'Mạng Internet: Ngoại tuyến'}
          >
            {isOnline ? (
              <Wifi className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-rose-400" />
            )}
            <span className="hidden lg:inline">{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* Supabase Cloud Live Status Indicator */}
          {supabaseStatus !== 'disabled' && (
            <div
              className={`hidden sm:flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold border transition ${
                supabaseStatus === 'connected'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                  : supabaseStatus === 'syncing' || supabaseStatus === 'connecting'
                  ? 'bg-amber-950/80 text-amber-300 border-amber-700'
                  : 'bg-rose-950/80 text-rose-300 border-rose-700'
              }`}
              title={
                supabaseStatus === 'connected'
                  ? 'Supabase Cloud: Đã kết nối & Đồng bộ trực tiếp Realtime'
                  : supabaseStatus === 'syncing' || supabaseStatus === 'connecting'
                  ? 'Supabase Cloud: Đang kết nối...'
                  : 'Supabase Cloud: Lỗi kết nối'
              }
            >
              {supabaseStatus === 'connected' ? (
                <Cloud className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              ) : supabaseStatus === 'syncing' || supabaseStatus === 'connecting' ? (
                <RefreshCw className="h-3.5 w-3.5 text-amber-400 animate-spin" />
              ) : (
                <CloudOff className="h-3.5 w-3.5 text-rose-400" />
              )}
              <span className="hidden xl:inline">
                {supabaseStatus === 'connected'
                  ? 'Cloud Live'
                  : supabaseStatus === 'syncing'
                  ? 'Đang đồng bộ...'
                  : 'Cloud Lỗi'}
              </span>
            </div>
          )}

          {/* Button: GHI CHI TIỀN (Thẻ Chi Tiền trên thanh trên) */}
          <button
            type="button"
            onClick={onOpenExpenseModal}
            className="flex items-center gap-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-1.5 text-xs font-black transition shadow-xs active:scale-95"
            title="Ghi chi tiền / Yêu cầu xuất quỹ (Cần Admin duyệt)"
          >
            <MinusCircle className="h-3.5 w-3.5" />
            <span>[-] Ghi Chi</span>
          </button>

          {/* Button: ADMIN PORTAL */}
          <button
            type="button"
            onClick={onOpenAdminPortal}
            className="flex items-center gap-1 rounded-lg bg-purple-600 px-2.5 py-1.5 text-xs font-black text-white hover:bg-purple-500 active:scale-95 transition shadow-xs"
            title="Cổng quản trị Admin"
          >
            <span>👑 Admin</span>
          </button>

          {/* Quick Shift Closeout Button (Chốt Nhanh) */}
          <button
            type="button"
            onClick={onOpenClosureModal}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 px-3 py-1.5 text-xs font-black text-slate-950 shadow-md shadow-amber-500/20 active:scale-[0.98] transition"
            title="Chốt nhanh ca: Xem ngay Tiền Mặt (TM) & Chuyển Khoản (CK) để đếm tiền và đối soát"
          >
            <Zap className="h-3.5 w-3.5 fill-slate-950 text-slate-950" />
            <span>⚡ Chốt Nhanh</span>
          </button>
        </div>
      </div>

      {/* Mobile / Small screen Tabs bar */}
      <div className="flex md:hidden border-t border-slate-800 overflow-x-auto px-2 py-1.5 gap-1 bg-slate-950">
        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap ${
            activeTab === 'matrix' ? 'bg-blue-600 text-white' : 'text-slate-400'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Sơ Đồ Phòng</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('excel')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap ${
            activeTab === 'excel' ? 'bg-emerald-600 text-white' : 'text-slate-400'
          }`}
        >
          <Table className="h-3.5 w-3.5" />
          <span>Excel POS</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap ${
            activeTab === 'transactions' ? 'bg-blue-600 text-white' : 'text-slate-400'
          }`}
        >
          <Receipt className="h-3.5 w-3.5" />
          <span>Sổ Quỹ</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('closures')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap ${
            activeTab === 'closures' ? 'bg-blue-600 text-white' : 'text-slate-400'
          }`}
        >
          <CalendarCheck className="h-3.5 w-3.5" />
          <span>Lịch Sử Chốt</span>
        </button>
      </div>
    </header>
  );
}
