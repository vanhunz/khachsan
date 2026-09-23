import { useState, useEffect } from 'react';
import { Minus, Square, Copy, X, Hotel } from 'lucide-react';
import { HOTEL_CONFIG } from '../services/hotelStore';

export default function DesktopTitlebar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const isDesktop = typeof window !== 'undefined' && Boolean(window.desktopApi?.isDesktopApp);

  useEffect(() => {
    if (isDesktop && window.desktopApi?.onWindowStateChange) {
      window.desktopApi.onWindowStateChange((state) => {
        setIsMaximized(Boolean(state?.isMaximized));
      });
      window.desktopApi.isMaximized().then((max) => setIsMaximized(Boolean(max)));
    }
  }, [isDesktop]);

  const handleMinimize = () => {
    if (isDesktop) {
      window.desktopApi.minimizeWindow();
    }
  };

  const handleToggleMaximize = () => {
    if (isDesktop) {
      window.desktopApi.toggleMaximizeWindow();
    }
  };

  const handleClose = () => {
    if (isDesktop) {
      window.desktopApi.closeWindow();
    }
  };

  return (
    <div
      style={{ WebkitAppRegion: 'drag' }}
      className="flex h-8 w-full items-center justify-between bg-slate-950 px-3 text-slate-300 select-none border-b border-slate-800 text-xs"
    >
      {/* Left: App Logo & Window Title */}
      <div className="flex items-center gap-2">
        <Hotel className="h-3.5 w-3.5 text-blue-400" />
        <span className="font-bold text-slate-200 tracking-wide">
          {HOTEL_CONFIG.hotelName} <span className="text-slate-400 font-normal">({HOTEL_CONFIG.author})</span> - Quản Lý Nhà Nghỉ POS
        </span>
      </div>

      {/* Right: Window Controls */}
      {isDesktop ? (
        <div style={{ WebkitAppRegion: 'no-drag' }} className="flex h-full items-center">
          <button
            type="button"
            onClick={handleMinimize}
            className="flex h-8 w-11 items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white transition"
            title="Thu nhỏ"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleToggleMaximize}
            className="flex h-8 w-11 items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white transition"
            title={isMaximized ? 'Khôi phục cửa sổ' : 'Phóng to'}
          >
            {isMaximized ? <Copy className="h-3 w-3" /> : <Square className="h-3 w-3" />}
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-11 items-center justify-center text-slate-400 hover:bg-rose-600 hover:text-white transition"
            title="Đóng ứng dụng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <span className="text-[10px] text-slate-500 font-mono">Chế độ Desktop POS</span>
      )}
    </div>
  );
}
