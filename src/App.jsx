import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building,
  Banknote,
  CreditCard,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MinusCircle,
  Lock,
  Unlock,
  BookmarkPlus,
} from 'lucide-react';
import Navbar from './components/Navbar';
import DesktopTitlebar from './components/DesktopTitlebar';
import RoomCard from './components/RoomCard';
import ReservationCard from './components/ReservationCard';
import ReservationListModal from './components/ReservationListModal';
import CheckInModal from './components/CheckInModal';
import CheckOutModal from './components/CheckOutModal';
import ReservationModal from './components/ReservationModal';
import AdvancePaymentModal from './components/AdvancePaymentModal';
import ReceiptModal from './components/ReceiptModal';
import DailyClosureModal from './components/DailyClosureModal';
import DailyCloseoutDetailModal from './components/DailyCloseoutDetailModal';
import TransactionLog from './components/TransactionLog';
import ClosureHistory from './components/ClosureHistory';
import PriceRulesModal from './components/PriceRulesModal';
import ExcelHotelLedger from './components/ExcelHotelLedger';
import ExpenseModal from './components/ExpenseModal';
import AdminPortalModal from './components/AdminPortalModal';
import EditBookingModal from './components/EditBookingModal';
import TransferRoomModal from './components/TransferRoomModal';
import ErrorBoundary from './components/ErrorBoundary';
import {
  hotelStore,
  INITIAL_ROOMS,
  getTodayDateString,
  formatCurrencyVND,
} from './services/hotelStore';
import { supabaseService } from './services/supabaseService';
import { isSupabaseConfigured } from './services/supabaseClient';

export default function App() {
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'excel' | 'transactions' | 'closures'
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [closures, setClosures] = useState([]);
  const [reservations, setReservations] = useState([]);

  // Master Input Lock State (Khóa không cho nhập thêm)
  const [isInputLocked, setIsInputLocked] = useState(() => hotelStore.isInputLocked());

  useEffect(() => {
    const handleLockChange = (e) => {
      setIsInputLocked(Boolean(e.detail?.locked));
    };
    window.addEventListener('hotel-input-lock-changed', handleLockChange);
    return () => window.removeEventListener('hotel-input-lock-changed', handleLockChange);
  }, []);

  // Filters for Room Matrix
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  // Modals state
  const [checkInModalData, setCheckInModalData] = useState({
    isOpen: false,
    room: null,
    initialData: null,
  });
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [isReservationListModalOpen, setIsReservationListModalOpen] = useState(false);
  const [checkOutModalData, setCheckOutModalData] = useState({
    isOpen: false,
    room: null,
    booking: null,
  });
  const [editBookingModalData, setEditBookingModalData] = useState({
    isOpen: false,
    room: null,
    booking: null,
  });
  const [transferRoomModalData, setTransferRoomModalData] = useState({
    isOpen: false,
    room: null,
    booking: null,
  });
  const [advancePaymentModalData, setAdvancePaymentModalData] = useState({
    isOpen: false,
    room: null,
    booking: null,
  });
  const [receiptModalData, setReceiptModalData] = useState({ isOpen: false, data: null });
  const [closureModalData, setClosureModalData] = useState({
    isOpen: false,
    date: getTodayDateString(),
  });
  const [dailyCloseoutDetailData, setDailyCloseoutDetailData] = useState({
    isOpen: false,
    date: getTodayDateString(),
  });
  const [isPriceRulesOpen, setIsPriceRulesOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isAdminPortalOpen, setIsAdminPortalOpen] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Load all store data
  const loadStoreData = useCallback(() => {
    const loadedRooms = hotelStore.getRooms();
    const loadedBookings = hotelStore.getBookings();
    const loadedPayments = hotelStore.getPayments();
    const loadedClosures = hotelStore.getShiftClosures();
    const loadedReservations = hotelStore.getReservations();
    setRooms(loadedRooms);
    setBookings(loadedBookings);
    setPayments(loadedPayments);
    setClosures(loadedClosures);
    setReservations(loadedReservations);
  }, []);

  useEffect(() => {
    loadStoreData();
  }, [loadStoreData, activeTab]);

  // Local Disk JSON Storage Mode (100% Offline & File Persistence)
  const [supabaseStatus] = useState('disabled');

  useEffect(() => {
    let isMounted = true;
    const initLocalData = async () => {
      try {
        const loaded = await hotelStore.loadFromDiskJson();
        if (loaded && isMounted) {
          loadStoreData();
        }
      } catch (e) {
        console.warn('Initial local JSON load:', e);
      }
    };
    initLocalData();
    return () => {
      isMounted = false;
    };
  }, [loadStoreData]);

  useEffect(() => {
    const handleStoreUpdate = () => {
      loadStoreData();
    };
    window.addEventListener('hotel-store-updated', handleStoreUpdate);
    window.addEventListener('hotel-reservations-updated', handleStoreUpdate);
    window.addEventListener('hotel-expenses-updated', handleStoreUpdate);
    return () => {
      window.removeEventListener('hotel-store-updated', handleStoreUpdate);
      window.removeEventListener('hotel-reservations-updated', handleStoreUpdate);
      window.removeEventListener('hotel-expenses-updated', handleStoreUpdate);
    };
  }, [loadStoreData]);

  // Active bookings map by room_number
  const activeBookingsMap = useMemo(() => {
    const map = {};
    for (const b of bookings) {
      if (b.status === 'active') {
        map[String(b.room_number)] = b;
      }
    }
    return map;
  }, [bookings]);

  // Floors list extracted from rooms
  const floors = useMemo(() => {
    const set = new Set(rooms.map((r) => r.floor || Number(String(r.room_number)[0]) || 1));
    return Array.from(set).sort();
  }, [rooms]);

  // Filtered Rooms for Matrix Dashboard
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      // Floor filter
      const rFloor = r.floor || Number(String(r.room_number)[0]) || 1;
      if (selectedFloor !== 'all' && Number(selectedFloor) !== rFloor) {
        return false;
      }

      // Status filter
      if (selectedStatusFilter !== 'all' && r.status !== selectedStatusFilter) {
        return false;
      }

      return true;
    });
  }, [rooms, selectedFloor, selectedStatusFilter]);

  // Today Ledger Summary
  const todayLedger = useMemo(() => {
    return hotelStore.getLedgerSummary(getTodayDateString());
  }, [payments, bookings]);

  // --- Handlers ---
  const handleToggleInputLock = () => {
    const nextLocked = hotelStore.toggleInputLocked();
    setIsInputLocked(nextLocked);
    if (nextLocked) {
      showToast('🔒 Đã KHÓA hệ thống - không cho phép nhập hoặc chỉnh sửa thêm!', 'info');
    } else {
      showToast('🔓 Đã MỞ KHÓA hệ thống - cho phép nhập dữ liệu bình thường!', 'success');
    }
  };

  const handleOpenCheckIn = (room = null) => {
    if (isInputLocked) {
      showToast('⚠️ Hệ thống đang ở chế độ KHÓA - không cho nhập thêm!', 'error');
      return;
    }
    setCheckInModalData({ isOpen: true, room, initialData: null });
  };

  const handleConfirmCheckIn = ({
    roomNumber,
    rentalType,
    roomRateMode = 'single',
    checkInTime,
    customerName,
    customerPhone = '',
    drinks,
    notes,
    depositAmount = 0,
    reservationId = null,
  }) => {
    try {
      const { booking } = hotelStore.checkInRoom({
        roomNumber,
        rentalType,
        roomRateMode,
        checkInTime,
        customerName,
        customerPhone,
        drinks,
        notes,
        depositAmount,
        reservationId,
      });
      loadStoreData();
      showToast(
        `Nhận phòng ${roomNumber} thành công!${
          depositAmount > 0 ? ` (Đã trừ cọc ${formatCurrencyVND(depositAmount)})` : ''
        }`,
        'success'
      );
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCheckInFromReservation = (res) => {
    if (isInputLocked) {
      showToast('⚠️ Hệ thống đang ở chế độ KHÓA - không cho nhập thêm!', 'error');
      return;
    }
    const availableOnly = rooms.filter((r) => r.status === 'available');
    if (availableOnly.length === 0) {
      showToast('⚠️ Hiện tại không có phòng nào đang trống để nhận! Vui lòng trả phòng trước.', 'error');
      return;
    }

    // Find target room if available, else first available room
    const targetRoom = availableOnly.find((r) => String(r.room_number) === String(res.room_number));
    const chosenRoom = targetRoom || availableOnly[0];

    setCheckInModalData({
      isOpen: true,
      room: null,
      initialData: {
        roomNumber: String(chosenRoom.room_number),
        customerName: res.customer_name || '',
        customerPhone: res.customer_phone || '',
        rentalType: res.rental_type || 'daily',
        depositAmount: Number(res.deposit_amount) || 0,
        reservationId: res.id,
        notes: res.notes || '',
      },
    });
  };

  const handleConfirmReservation = (payload) => {
    try {
      hotelStore.createReservation(payload);
      loadStoreData();
      showToast(
        `Đã lưu thẻ cọc giữ phòng ${payload.roomNumber ? `P.${payload.roomNumber}` : '(Chưa chọn số phòng)'} (${formatCurrencyVND(payload.depositAmount)})!`,
        'success'
      );
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteReservation = (reservationId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa thẻ cọc này khỏi danh sách?')) {
      hotelStore.deleteReservation(reservationId);
      loadStoreData();
      showToast('Đã xóa thẻ cọc khỏi danh sách!', 'info');
    }
  };

  const handleDeleteAllArrivedReservations = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tất cả các đơn cọc đã nhận phòng?')) {
      hotelStore.deleteAllArrivedReservations();
      loadStoreData();
      showToast('Đã xóa toàn bộ đơn cọc đã nhận phòng!', 'success');
    }
  };

  const handleOpenCheckOut = (room, booking = null) => {
    if (isInputLocked) {
      showToast('⚠️ Hệ thống đang ở chế độ KHÓA - không cho thanh toán/chỉnh sửa!', 'error');
      return;
    }
    const activeBooking = booking || activeBookingsMap[String(room.room_number)];
    if (!activeBooking) {
      showToast(`Không tìm thấy phiên phòng đang ở của phòng ${room.room_number}`, 'error');
      return;
    }
    setCheckOutModalData({ isOpen: true, room, booking: activeBooking });
  };

  const handleConfirmCheckOut = (payload) => {
    try {
      const { booking, changeDue } = hotelStore.checkOutWithSplitAndRefund(payload);
      loadStoreData();

      let successMsg = `Thanh toán hoàn tất phòng ${booking.room_number}!`;
      if (changeDue > 0) {
        successMsg += ` (Đã thối lại ${formatCurrencyVND(changeDue)})`;
      }
      showToast(successMsg, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenEditBooking = (room, booking = null) => {
    if (isInputLocked) {
      showToast('⚠️ Hệ thống đang ở chế độ KHÓA - không cho chỉnh sửa thêm!', 'error');
      return;
    }
    const activeBooking = booking || activeBookingsMap[String(room.room_number)];
    if (!activeBooking) {
      showToast(`Không tìm thấy phiên phòng đang ở của phòng ${room.room_number}`, 'error');
      return;
    }
    setEditBookingModalData({ isOpen: true, room, booking: activeBooking });
  };

  const handleConfirmEditBooking = (payload) => {
    try {
      hotelStore.updateActiveBookingDetails(payload);
      loadStoreData();
      showToast(`Đã cập nhật dịch vụ & phòng ${payload.roomNumber}!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenAdvancePayment = (room, booking = null) => {
    if (isInputLocked) {
      showToast('⚠️ Hệ thống đang ở chế độ KHÓA - không cho thu tiền trước!', 'error');
      return;
    }
    const activeBooking = booking || activeBookingsMap[String(room.room_number)];
    if (!activeBooking) {
      showToast(`Không tìm thấy phiên phòng đang ở của phòng ${room.room_number}`, 'error');
      return;
    }
    setAdvancePaymentModalData({ isOpen: true, room, booking: activeBooking });
  };

  const handleConfirmAdvancePayment = (payload) => {
    try {
      if (payload.drinks) {
        hotelStore.updateBookingDrinks({
          bookingId: payload.bookingId,
          roomNumber: payload.roomNumber,
          drinks: payload.drinks,
        });
      }
      const { booking, payment } = hotelStore.collectAdvancePayment(payload);
      loadStoreData();
      showToast(
        `Đã thu trước ${formatCurrencyVND(payload.amount)} cho phòng ${payload.roomNumber}!`,
        'success'
      );
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSetRoomStatus = (roomId, status) => {
    if (isInputLocked) {
      showToast('⚠️ Hệ thống đang ở chế độ KHÓA - không thể đổi trạng thái!', 'error');
      return;
    }
    hotelStore.updateRoomStatus(roomId, status);
    loadStoreData();
    const statusText = status === 'available' ? 'Phòng trống' : 'Đang có khách';
    showToast(`Đã chuyển trạng thái phòng thành: ${statusText}`, 'info');
  };

  const handleOpenReceiptPreview = (data) => {
    setReceiptModalData({ isOpen: true, data });
  };

  const handleOpenClosureModal = (dateStr = getTodayDateString()) => {
    setClosureModalData({ isOpen: true, date: dateStr });
  };

  const handleOpenCloseoutDetail = (dateStr = getTodayDateString()) => {
    setDailyCloseoutDetailData({ isOpen: true, date: dateStr });
  };

  const handleConfirmClosure = (dateStr, shiftName, notes, initialCash = 1000000) => {
    try {
      hotelStore.closeShift({ date: dateStr, shiftName, initialCash, notes });
      loadStoreData();
      showToast(`Khóa sổ ${shiftName} thành công!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleReopenClosure = (closureId) => {
    if (window.confirm('Bạn có chắc chắn muốn mở lại ca này để tiếp tục hạch toán?')) {
      hotelStore.reopenShift(closureId);
      loadStoreData();
      showToast('Đã mở lại ca làm việc', 'info');
    }
  };

  const handleCancelBooking = (bookingId) => {
    if (window.confirm('Bạn có chắc chắn muốn hủy đơn này?')) {
      const bookingsList = hotelStore.getBookings();
      const updated = bookingsList.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b));
      hotelStore.saveBookings(updated);
      loadStoreData();
      showToast('Đã hủy đơn phòng', 'info');
    }
  };

  const handleExportCSV = (customList = null) => {
    const listToExport = customList || bookings;
    const csvData = hotelStore.exportTransactionsToCSV(listToExport);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Phieu_thue_phong_${getTodayDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Đã xuất file báo cáo phiếu thuê thành công!', 'success');
  };

  const handleExportLedgerCSV = (customList = null) => {
    const listToExport = customList || payments;
    const csvData = hotelStore.exportLedgerToCSV(listToExport);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `So_quy_dong_tien_${getTodayDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Đã xuất file Sổ quỹ dòng tiền (Payments Ledger) thành công!', 'success');
  };

  const handleResetData = () => {
    if (
      window.confirm(
        'Khôi phục lại toàn bộ dữ liệu mẫu?'
      )
    ) {
      hotelStore.resetToDemoData();
      loadStoreData();
      showToast('Đã khôi phục dữ liệu mẫu thành công!', 'info');
    }
  };

  const handleSubmitExpense = (payload) => {
    try {
      hotelStore.createExpense(payload);
      loadStoreData();
      showToast(`Đã lưu phiếu chi ${formatCurrencyVND(payload.amount)}!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenTransferRoom = (room, booking) => {
    if (isInputLocked) {
      showToast('⚠️ Hệ thống đang KHÓA (không cho phép thay đổi dữ liệu)', 'error');
      return;
    }
    setTransferRoomModalData({
      isOpen: true,
      room,
      booking,
    });
  };

  const handleConfirmTransferRoom = (oldRoomNumber, newRoomNumber, customNote) => {
    try {
      hotelStore.transferRoom(oldRoomNumber, newRoomNumber, customNote);
      loadStoreData();
      showToast(`Đã chuyển khách từ P.${oldRoomNumber} sang P.${newRoomNumber} thành công!`, 'success');
    } catch (err) {
      showToast(err.message || 'Lỗi khi chuyển phòng!', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-1 select-none">
      {/* Native Desktop Windows Titlebar */}
      <DesktopTitlebar />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl bg-slate-900 px-4 py-3 text-xs sm:text-sm font-bold text-white shadow-2xl animate-in slide-in-from-bottom-3 duration-150">
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          ) : (
            <Sparkles className="h-5 w-5 text-blue-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Navbar Component */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        rooms={rooms}
        supabaseStatus={supabaseStatus}
        onOpenClosureModal={() => handleOpenClosureModal(getTodayDateString())}
        onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
        onOpenAdminPortal={() => setIsAdminPortalOpen(true)}
        onResetData={handleResetData}
        onOpenPriceRules={() => setIsPriceRulesOpen(true)}
      />

      {/* Main Container - Full Width POS Layout */}
      <main className="w-full px-2.5 sm:px-3 pt-1.5 pb-2">
        <ErrorBoundary onReset={loadStoreData}>
          {/* TAB 1: SƠ ĐỒ PHÒNG / ROOM MATRIX DASHBOARD */}
        {activeTab === 'matrix' && (
          <div className="space-y-1.5 animate-in fade-in duration-100">
            {/* Unified Ultra-Compact Control & Financial KPI Bar (1 Single Row) */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-lg bg-white px-2.5 py-1.5 border border-slate-200 shadow-2xs text-xs">
              {/* Left: Floor & Status Filters */}
              <div className="flex items-center gap-1 overflow-x-auto">
                <span className="text-[10px] font-black uppercase text-slate-500 mr-0.5">
                  TẦNG:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedFloor('all')}
                  className={`rounded px-2 py-0.5 text-xs font-black transition ${
                    selectedFloor === 'all'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  TẤT CẢ ({rooms.length})
                </button>
                {floors.map((fl) => {
                  const count = rooms.filter(
                    (r) => (r.floor || Number(String(r.room_number)[0])) === fl
                  ).length;
                  return (
                    <button
                      key={fl}
                      type="button"
                      onClick={() => setSelectedFloor(fl)}
                      className={`rounded px-2 py-0.5 text-xs font-black transition ${
                        selectedFloor === fl
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      T{fl} ({count})
                    </button>
                  );
                })}

                <span className="h-4 w-px bg-slate-200 mx-1" />

                {/* Status Badges */}
                <button
                  type="button"
                  onClick={() => setSelectedStatusFilter('all')}
                  className={`rounded px-2 py-0.5 text-xs font-bold transition ${
                    selectedStatusFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất Cả
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatusFilter('available')}
                  className={`rounded px-2 py-0.5 text-xs font-bold transition ${
                    selectedStatusFilter === 'available'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  Trống ({rooms.filter((r) => r.status === 'available').length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatusFilter('occupied')}
                  className={`rounded px-2 py-0.5 text-xs font-bold transition ${
                    selectedStatusFilter === 'occupied'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  Ở ({rooms.filter((r) => r.status === 'occupied').length})
                </button>
              </div>

              {/* Center: Master Input Lock Button (Khóa không cho nhập thêm) & Admin Button */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleToggleInputLock}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-black transition active:scale-95 shadow-2xs ${
                    isInputLocked
                      ? 'bg-rose-600 text-white hover:bg-rose-700 animate-pulse border border-rose-400'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-400'
                  }`}
                  title={
                    isInputLocked
                      ? 'Hệ thống đang KHÓA (Không cho nhập thêm). Nhấp để Mở Khóa'
                      : 'Hệ thống đang MỞ. Nhấp để Khóa không cho nhập thêm'
                  }
                >
                  {isInputLocked ? (
                    <>
                      <Lock className="h-3.5 w-3.5 text-white shrink-0" />
                      <span>🔒 ĐÃ KHÓA (KHÔNG CHO NHẬP THÊM)</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="h-3.5 w-3.5 text-white shrink-0" />
                      <span>🔓 ĐANG MỞ (BẤM ĐỂ KHÓA NHẬP)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsAdminPortalOpen(true)}
                  className="flex items-center gap-1 rounded bg-purple-600 px-2 py-1 text-xs font-black text-white hover:bg-purple-700 active:scale-95 shadow-2xs transition"
                  title="Cổng quản trị Admin"
                >
                  <span>👑 Admin</span>
                </button>
              </div>

              {/* Right: Quick Financial Stats Chips */}
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
                <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-slate-600 font-sans text-[11px]">Két:</span>
                  <span className="text-emerald-700 font-black">{formatCurrencyVND(todayLedger.netCash)}</span>
                </div>

                <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-slate-600 font-sans text-[11px]">CK:</span>
                  <span className="text-blue-700 font-black">{formatCurrencyVND(todayLedger.netTransfer)}</span>
                </div>

                <div className="flex items-center gap-1 bg-slate-900 text-white px-2.5 py-0.5 rounded shadow-2xs">
                  <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-slate-300 font-sans text-[11px]">Tổng:</span>
                  <span className="text-amber-400 font-black">{formatCurrencyVND(todayLedger.totalRevenueRecognized)}</span>
                </div>
              </div>
            </div>

            {/* Room Matrix Grid - Clean 4-Column Grid (11 Rooms + 1 Reservation Card = 12 Slots) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2">
              {filteredRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  activeBooking={activeBookingsMap[String(room.room_number)]}
                  isInputLocked={isInputLocked}
                  onCheckIn={handleOpenCheckIn}
                  onCheckOut={handleOpenCheckOut}
                  onOpenAdvancePayment={handleOpenAdvancePayment}
                  onOpenEditBooking={handleOpenEditBooking}
                  onOpenTransferRoom={handleOpenTransferRoom}
                  onSetStatus={handleSetRoomStatus}
                />
              ))}

              {/* 12th Grid Slot: THẺ CỌC PHÒNG (Reservation Card) */}
              {(selectedFloor === 'all' || Number(selectedFloor) === 3) && (
                <ReservationCard
                  reservations={reservations}
                  isInputLocked={isInputLocked}
                  onCheckInReservation={handleCheckInFromReservation}
                  onOpenNewReservation={() => setIsReservationModalOpen(true)}
                  onDeleteReservation={handleDeleteReservation}
                  onOpenFullList={() => setIsReservationListModalOpen(true)}
                />
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BẢNG TÍNH EXCEL-CLONE HOTEL POS */}
        {activeTab === 'excel' && (
          <div className="animate-in fade-in duration-100">
            <ExcelHotelLedger isInputLocked={isInputLocked} onToggleInputLock={handleToggleInputLock} />
          </div>
        )}

        {/* TAB 3: SỔ QUỸ DÒNG TIỀN & ĐỐI SOÁT */}
        {activeTab === 'transactions' && (
          <div className="animate-in fade-in duration-100">
            <TransactionLog
              bookings={bookings}
              payments={payments}
              rooms={rooms}
              onOpenClosureModal={handleOpenClosureModal}
              onOpenDetailModal={handleOpenCloseoutDetail}
              onOpenReceipt={handleOpenReceiptPreview}
              onCancelBooking={handleCancelBooking}
              onExportCSV={handleExportCSV}
              onExportLedgerCSV={handleExportLedgerCSV}
            />
          </div>
        )}

        {/* TAB 4: LỊCH SỬ CHỐT CA */}
        {activeTab === 'closures' && (
          <div className="animate-in fade-in duration-100">
            <ClosureHistory
              closures={closures}
              onReopenClosure={handleReopenClosure}
              onOpenDetailModal={handleOpenCloseoutDetail}
              onOpenClosureModal={handleOpenClosureModal}
            />
          </div>
        )}
        </ErrorBoundary>
      </main>

      {/* Check-in Modal */}
      <CheckInModal
        isOpen={checkInModalData.isOpen}
        onClose={() => setCheckInModalData({ isOpen: false, room: null, initialData: null })}
        room={checkInModalData.room}
        availableRooms={rooms.filter((r) => r.status !== 'occupied')}
        initialData={checkInModalData.initialData}
        onConfirmCheckIn={handleConfirmCheckIn}
      />

      {/* Reservation Modal (Tạo Thẻ Cọc Phòng Mới) */}
      <ReservationModal
        isOpen={isReservationModalOpen}
        onClose={() => setIsReservationModalOpen(false)}
        availableRooms={rooms.filter((r) => r.status === 'available')}
        onConfirmReservation={handleConfirmReservation}
      />

      {/* Reservation Full List & Management Modal */}
      <ReservationListModal
        isOpen={isReservationListModalOpen}
        onClose={() => setIsReservationListModalOpen(false)}
        reservations={reservations}
        isInputLocked={isInputLocked}
        onCheckInReservation={handleCheckInFromReservation}
        onOpenNewReservation={() => setIsReservationModalOpen(true)}
        onDeleteReservation={handleDeleteReservation}
        onDeleteAllArrived={handleDeleteAllArrivedReservations}
      />

      {/* Edit Booking / Services Modal (Thêm nước, phụ thu, loại phòng) */}
      <EditBookingModal
        isOpen={editBookingModalData.isOpen}
        onClose={() => setEditBookingModalData({ isOpen: false, room: null, booking: null })}
        room={editBookingModalData.room}
        booking={editBookingModalData.booking}
        onSave={handleConfirmEditBooking}
      />

      {/* Advance Payment Modal */}
      <AdvancePaymentModal
        isOpen={advancePaymentModalData.isOpen}
        onClose={() => setAdvancePaymentModalData({ isOpen: false, room: null, booking: null })}
        room={advancePaymentModalData.room}
        booking={advancePaymentModalData.booking}
        onConfirmAdvancePayment={handleConfirmAdvancePayment}
      />

      {/* Check-out Modal */}
      <CheckOutModal
        isOpen={checkOutModalData.isOpen}
        onClose={() => setCheckOutModalData({ isOpen: false, room: null, booking: null })}
        room={checkOutModalData.room}
        booking={checkOutModalData.booking}
        onConfirmCheckOut={handleConfirmCheckOut}
        onOpenReceiptPreview={handleOpenReceiptPreview}
      />

      {/* Transfer Room Modal (Chuyển phòng đang ở sang phòng trống) */}
      <TransferRoomModal
        isOpen={transferRoomModalData.isOpen}
        onClose={() => setTransferRoomModalData({ isOpen: false, room: null, booking: null })}
        currentRoom={transferRoomModalData.room}
        activeBooking={transferRoomModalData.booking}
        availableRooms={rooms.filter((r) => r.status === 'available')}
        onConfirmTransfer={handleConfirmTransferRoom}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={receiptModalData.isOpen}
        onClose={() => setReceiptModalData({ isOpen: false, data: null })}
        data={receiptModalData.data}
      />

      {/* Daily Shift Closure Modal */}
      <DailyClosureModal
        isOpen={closureModalData.isOpen}
        onClose={() => setClosureModalData({ isOpen: false, date: getTodayDateString() })}
        targetDate={closureModalData.date}
        onConfirmClosure={handleConfirmClosure}
      />

      {/* Daily / Period Closeout Detail Inspector Modal */}
      <DailyCloseoutDetailModal
        isOpen={dailyCloseoutDetailData.isOpen}
        onClose={() => setDailyCloseoutDetailData({ isOpen: false, date: getTodayDateString() })}
        initialDate={dailyCloseoutDetailData.date}
        onOpenClosureModal={handleOpenClosureModal}
        onReopenClosure={handleReopenClosure}
      />

      {/* Price Rules Modal */}
      <PriceRulesModal
        isOpen={isPriceRulesOpen}
        onClose={() => setIsPriceRulesOpen(false)}
      />

      {/* Expense Modal (Ghi Chi Tiền) */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSubmitExpense={handleSubmitExpense}
      />

      {/* Admin Portal Modal (Cổng Quản Trị Hệ Thống) */}
      <AdminPortalModal
        isOpen={isAdminPortalOpen}
        onClose={() => setIsAdminPortalOpen(false)}
        onDataChanged={loadStoreData}
      />
    </div>
  );
}
