import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Receipt,
  Clock,
  Wine,
  Banknote,
  CreditCard,
  Printer,
  CheckCircle2,
  Plus,
  Minus,
  RotateCcw,
  Sparkles,
  BedDouble,
  Tag,
} from 'lucide-react';
import {
  calculateTotalBill,
  PRICE_CONSTANTS,
  isSpecialRoomNumber,
} from '../utils/calculateTotalBill';
import {
  getLocalDateTimeString,
  formatDateTimeDisplay,
  formatCurrencyVND,
  HOTEL_CONFIG,
} from '../services/hotelStore';

export default function CheckOutModal({
  isOpen,
  onClose,
  room,
  booking,
  onConfirmCheckOut,
  onOpenReceiptPreview,
}) {
  const [checkOutTime, setCheckOutTime] = useState('');
  const [rentalType, setRentalType] = useState('hourly');
  const [roomRateMode, setRoomRateMode] = useState('single');
  const [beerQty, setBeerQty] = useState(0);
  const [waterQty, setWaterQty] = useState(0);
  const [softDrinkQty, setSoftDrinkQty] = useState(0);

  // Phụ thu / Giảm trừ: đúng 1 ô tiền (có cho số âm) + 1 ô lý do
  const [surchargeAmount, setSurchargeAmount] = useState('');
  const [surchargeReason, setSurchargeReason] = useState('');

  // Phương thức thanh toán mặc định: 'cash' hoặc 'transfer'
  const [paymentMode, setPaymentMode] = useState('cash'); // 'cash' | 'transfer'
  // Nút dấu + mở rộng cho trường hợp khách đưa thừa hoặc trả kết hợp cả TM + CK
  const [showCustomSplit, setShowCustomSplit] = useState(false);
  const [customCash, setCustomCash] = useState('');
  const [customTransfer, setCustomTransfer] = useState('');
  const [refundMethod, setRefundMethod] = useState('cash'); // 'cash' | 'transfer'

  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen && booking) {
      setCheckOutTime(getLocalDateTimeString(new Date()));
      setRentalType(booking.rental_type || 'hourly');
      setRoomRateMode(booking.room_rate_mode || 'single');
      setBeerQty(Number(booking.beer_qty) || 0);
      setWaterQty(Number(booking.water_qty) || 0);
      setSoftDrinkQty(Number(booking.soft_drink_qty) || 0);

      const existingSurcharge = Number(booking.surcharge_amount) || 0;
      setSurchargeAmount(existingSurcharge !== 0 ? String(existingSurcharge) : '');
      setSurchargeReason(booking.surcharge_reason || '');

      setPaymentMode('cash');
      setShowCustomSplit(false);
      setCustomCash('');
      setCustomTransfer('');
      setRefundMethod('cash');
      setNotes(booking.notes || '');
    }
  }, [isOpen, booking]);

  const numSurcharge = Number(surchargeAmount) || 0;
  const roomNumber = booking?.room_number || room?.room_number || '';
  const isSpecial = isSpecialRoomNumber(roomNumber);

  // Safe parse ISO date
  const safeCheckOutIso = useMemo(() => {
    if (!checkOutTime) return new Date().toISOString();
    const d = new Date(checkOutTime);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }, [checkOutTime]);

  // Tính bill
  const bill = useMemo(() => {
    if (!booking?.check_in) return null;
    return calculateTotalBill(
      booking.check_in,
      safeCheckOutIso,
      rentalType || 'hourly',
      {
        beer_qty: beerQty,
        water_qty: waterQty,
        soft_drink_qty: softDrinkQty,
      },
      numSurcharge,
      new Date(safeCheckOutIso),
      roomRateMode || 'single',
      roomNumber
    );
  }, [booking, safeCheckOutIso, rentalType, beerQty, waterQty, softDrinkQty, numSurcharge, roomRateMode, roomNumber]);

  const depositPaid = Math.max(0, Number(booking?.deposit_amount || 0), Number(booking?.paid_amount || 0));
  const totalAmount = bill ? bill.total_amount : 0;
  const balanceDue = Math.max(0, totalAmount - depositPaid);
  const advanceOverpaid = Math.max(0, depositPaid - totalAmount);

  // Tính số tiền thực nhận dựa trên chế độ
  let finalCash = 0;
  let finalTransfer = 0;
  let changeDue = 0;
  let isOverpaid = false;

  if (!showCustomSplit) {
    if (paymentMode === 'cash') {
      finalCash = balanceDue;
      finalTransfer = 0;
    } else {
      finalCash = 0;
      finalTransfer = balanceDue;
    }
    if (advanceOverpaid > 0) {
      changeDue = advanceOverpaid;
      isOverpaid = true;
    }
  } else {
    finalCash = Number(customCash) || 0;
    finalTransfer = Number(customTransfer) || 0;
    const totalGiven = finalCash + finalTransfer;
    changeDue = Math.max(0, totalGiven - balanceDue) + advanceOverpaid;
    isOverpaid = changeDue > 0;
  }

  if (!isOpen || !booking || !bill) return null;

  const rentalTypeNames = {
    hourly: 'Theo Giờ',
    overnight: 'Qua Đêm',
    daily: 'Ngày Đêm',
  };

  const handleCompletePayment = () => {
    let actualCash = finalCash;
    let actualTransfer = finalTransfer;

    const actualTotalReceived = actualCash + actualTransfer;

    if (showCustomSplit && actualTotalReceived < balanceDue && balanceDue > 0) {
      const shortage = balanceDue - actualTotalReceived;
      if (
        !window.confirm(
          `Khách mới đưa ${formatCurrencyVND(actualTotalReceived)}, còn thiếu ${formatCurrencyVND(
            shortage
          )}.\n\nBạn có chắc chắn muốn hoàn tất trả phòng không?`
        )
      ) {
        return;
      }
    }

    const totalRefund = changeDue;
    let finalNote = notes;

    if (totalRefund > 0) {
      if (actualTransfer > 0 && refundMethod === 'cash') {
        const overpayTag = `ck${Math.round(actualTransfer / 1000)}k thoi ${Math.round(totalRefund / 1000)}k`;
        finalNote = finalNote ? `${overpayTag} | ${finalNote}` : overpayTag;
      } else {
        const refundText = `Thối lại khách: ${formatCurrencyVND(totalRefund)} (${
          refundMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'
        })`;
        finalNote = finalNote ? `${finalNote} | ${refundText}` : refundText;
      }
    } else if (actualTransfer > 0 && actualCash > 0) {
      const splitTag = `ck${Math.round(actualTransfer / 1000)}k`;
      finalNote = finalNote ? `${splitTag} | ${finalNote}` : splitTag;
    } else if (actualTransfer > 0 && actualCash === 0) {
      if (!finalNote.toLowerCase().includes('ck')) {
        finalNote = finalNote ? `CK | ${finalNote}` : 'CK';
      }
    }

    if (depositPaid > 0) {
      const advanceText = `Đã thu trước: ${formatCurrencyVND(depositPaid)}, thu khi trả phòng: ${formatCurrencyVND(
        actualTotalReceived
      )}`;
      if (!finalNote.includes('Đã thu trước:')) {
        finalNote = finalNote ? `${finalNote} | ${advanceText}` : advanceText;
      }
    }

    onConfirmCheckOut({
      bookingId: booking.id,
      roomNumber,
      checkOutTime: safeCheckOutIso,
      rentalType,
      roomRateMode,
      drinks: { beer_qty: beerQty, water_qty: waterQty, soft_drink_qty: softDrinkQty },
      surchargeAmount: numSurcharge,
      surchargeReason,
      cashReceived: actualCash,
      transferReceived: actualTransfer,
      refundMethod,
      notes: finalNote,
      nextRoomStatus: 'available',
      bill,
      depositPaid,
      balanceDue,
      changeDue: totalRefund,
    });
    onClose();
  };

  const handlePrintReceipt = () => {
    if (onOpenReceiptPreview) {
      onOpenReceiptPreview({
        room: room || { room_number: roomNumber },
        booking: {
          ...booking,
          rental_type: rentalType,
          room_rate_mode: roomRateMode,
        },
        checkOutTime: safeCheckOutIso,
        beerQty,
        waterQty,
        softDrinkQty,
        surchargeAmount: numSurcharge,
        surchargeReason,
        depositPaid,
        balanceDue,
        cashReceived: finalCash,
        transferReceived: finalTransfer,
        changeDue,
        refundMethod,
        notes,
        bill,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative my-6 w-full max-w-lg rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-950">
                  Trả Phòng & Thanh Toán P.{roomNumber}
                </h2>
                <span className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs font-bold text-blue-800">
                  {rentalTypeNames[rentalType] || 'Theo Giờ'}
                </span>
                {isSpecial && (
                  <span className="rounded-md bg-amber-50 border border-amber-300 px-2 py-0.5 text-xs font-bold text-amber-900">
                    {roomRateMode === 'double' ? 'Phòng Đôi' : 'Phòng Đơn'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Khách: <strong>{booking.customer_name || 'Khách vãng lai'}</strong>{' '}
                {booking.customer_phone ? `• SĐT: ${booking.customer_phone}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="mt-3.5 space-y-3 max-h-[75vh] overflow-y-auto pr-1">
          {/* Quick Switchers: Loại hình thuê & Phòng Đơn/Đôi */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span className="font-bold text-slate-700">Loại thuê:</span>
              <div className="flex rounded-lg bg-slate-200/80 p-0.5 border border-slate-300">
                <button
                  type="button"
                  onClick={() => setRentalType('hourly')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                    rentalType === 'hourly'
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Giờ (80k)
                </button>
                <button
                  type="button"
                  onClick={() => setRentalType('overnight')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                    rentalType === 'overnight'
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Đêm ({roomRateMode === 'double' && isSpecial ? '350k' : '200k'})
                </button>
                <button
                  type="button"
                  onClick={() => setRentalType('daily')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                    rentalType === 'daily'
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ngày ({roomRateMode === 'double' && isSpecial ? '500k' : '350k'})
                </button>
              </div>
            </div>

            {isSpecial && (
              <div className="flex items-center gap-1">
                <BedDouble className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                <div className="flex rounded-lg bg-amber-100 p-0.5 border border-amber-300">
                  <button
                    type="button"
                    onClick={() => setRoomRateMode('single')}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                      roomRateMode === 'single'
                        ? 'bg-white text-amber-950 shadow-xs'
                        : 'text-amber-800 hover:text-amber-950'
                    }`}
                  >
                    Đơn
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoomRateMode('double')}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                      roomRateMode === 'double'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-amber-800 hover:text-amber-950'
                    }`}
                  >
                    Đôi
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Giờ vào, giờ ra, thời gian ở */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="block text-[11px] font-bold text-slate-500">GIỜ VÀO</span>
              <span className="font-mono font-bold text-slate-900">
                {formatDateTimeDisplay(booking.check_in)}
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="block text-[11px] font-bold text-slate-500">GIỜ RA</span>
                <button
                  type="button"
                  onClick={() => setCheckOutTime(getLocalDateTimeString(new Date()))}
                  className="text-[10px] text-blue-600 hover:underline font-semibold"
                >
                  Hiện tại
                </button>
              </div>
              <input
                type="datetime-local"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs font-mono font-bold text-slate-900"
              />
            </div>

            <div>
              <span className="block text-[11px] font-bold text-slate-500">THỜI GIAN Ở</span>
              <span className="inline-flex items-center gap-1 font-bold text-slate-900 font-mono mt-0.5">
                <Clock className="h-3.5 w-3.5 text-slate-600" />
                {bill.stayDurationLabel}
              </span>
            </div>
          </div>

          {/* Minibar / Nước uống */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Wine className="h-4 w-4 text-slate-600" />
                Nước Uống / Minibar
              </span>
              <span className="text-xs font-bold font-mono text-slate-900">
                +{formatCurrencyVND(bill.water_amount)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Bia */}
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                <span className="text-xs font-bold text-slate-800">Bia (20k)</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setBeerQty((q) => Math.max(0, q - 1))}
                    className="h-6 w-6 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-4 text-center font-bold font-mono text-xs">{beerQty}</span>
                  <button
                    type="button"
                    onClick={() => setBeerQty((q) => q + 1)}
                    className="h-6 w-6 rounded bg-slate-800 text-white hover:bg-black flex items-center justify-center font-bold"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Nước */}
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                <span className="text-xs font-bold text-slate-800">Nước (10k)</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setWaterQty((q) => Math.max(0, q - 1))}
                    className="h-6 w-6 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-4 text-center font-bold font-mono text-xs">{waterQty}</span>
                  <button
                    type="button"
                    onClick={() => setWaterQty((q) => q + 1)}
                    className="h-6 w-6 rounded bg-slate-800 text-white hover:bg-black flex items-center justify-center font-bold"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Nước ngọt */}
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                <span className="text-xs font-bold text-slate-800">Ngọt (15k)</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSoftDrinkQty((q) => Math.max(0, q - 1))}
                    className="h-6 w-6 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-4 text-center font-bold font-mono text-xs">{softDrinkQty}</span>
                  <button
                    type="button"
                    onClick={() => setSoftDrinkQty((q) => q + 1)}
                    className="h-6 w-6 rounded bg-slate-800 text-white hover:bg-black flex items-center justify-center font-bold"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Phụ thu / Giảm trừ: đúng 1 ô tiền (có cho số âm) + 1 ô lý do */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Phụ thu / Giảm trừ (Có thể nhập số âm)
              </span>
              <span
                className={`text-xs font-bold font-mono ${
                  numSurcharge < 0 ? 'text-rose-600' : numSurcharge > 0 ? 'text-slate-900' : 'text-slate-400'
                }`}
              >
                {numSurcharge !== 0 ? (numSurcharge > 0 ? `+${formatCurrencyVND(numSurcharge)}` : formatCurrencyVND(numSurcharge)) : '0đ'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="1000"
                placeholder="Số tiền (VD: 50000 hoặc -30000)"
                value={surchargeAmount}
                onChange={(e) => setSurchargeAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-slate-800"
              />
              <input
                type="text"
                placeholder="Lý do phụ thu / giảm giá..."
                value={surchargeReason}
                onChange={(e) => setSurchargeReason(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
              />
            </div>
          </div>

          {/* BẢNG TÍNH TIỀN TỔNG QUAN */}
          <div className="rounded-xl border-2 border-slate-900 bg-slate-50 p-3.5 space-y-1.5 shadow-sm">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Tiền phòng ({rentalTypeNames[rentalType] || 'Giờ'}):</span>
              <span className="font-mono font-bold text-slate-900">{formatCurrencyVND(bill.room_amount)}</span>
            </div>

            <div className="flex justify-between text-xs text-slate-600">
              <span>Tiền nước uống:</span>
              <span className="font-mono font-bold text-slate-900">+{formatCurrencyVND(bill.water_amount)}</span>
            </div>

            {numSurcharge !== 0 && (
              <div className="flex justify-between text-xs text-slate-600">
                <span>{numSurcharge > 0 ? 'Phụ thu' : 'Giảm trừ'} ({surchargeReason || 'Khác'}):</span>
                <span className={`font-mono font-bold ${numSurcharge < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {numSurcharge > 0 ? `+${formatCurrencyVND(numSurcharge)}` : formatCurrencyVND(numSurcharge)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-xs font-bold text-slate-800 border-t border-slate-200 pt-1.5">
              <span>TỔNG TIỀN PHÒNG & DỊCH VỤ:</span>
              <span className="font-mono">{formatCurrencyVND(totalAmount)}</span>
            </div>

            {depositPaid > 0 && (
              <div className="flex justify-between text-xs font-bold text-emerald-800 bg-emerald-100/70 px-2 py-1 rounded">
                <span>Đã thu trước / Đặt cọc:</span>
                <span className="font-mono">-{formatCurrencyVND(depositPaid)}</span>
              </div>
            )}

            {/* SỐ TIỀN CÒN PHẢI THU HOẶC THỐI LẠI */}
            <div className="flex items-baseline justify-between border-t-2 border-slate-900 pt-2 text-slate-900">
              <span className="text-xs font-black uppercase">
                {advanceOverpaid > 0
                  ? 'TIỀN THỐI LẠI KHÁCH (DƯ CỌC):'
                  : depositPaid > 0
                  ? 'CÒN PHẢI THU THÊM:'
                  : 'TỔNG CẦN THANH TOÁN:'}
              </span>
              <span className={`text-2xl font-black font-mono ${advanceOverpaid > 0 ? 'text-emerald-700' : 'text-slate-900'}`}>
                {formatCurrencyVND(advanceOverpaid > 0 ? advanceOverpaid : balanceDue)}
              </span>
            </div>
          </div>

          {/* CHỌN HÌNH THỨC THANH TOÁN: TM HOẶC CK */}
          {balanceDue > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Hình thức thanh toán
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomSplit(!showCustomSplit);
                    if (!showCustomSplit) {
                      setCustomCash('');
                      setCustomTransfer('');
                    }
                  }}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold border transition ${
                    showCustomSplit
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                  title="Bấm để mở ô nhập khách đưa thừa hoặc trả kết hợp cả TM + CK"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{showCustomSplit ? 'Đóng tùy chỉnh' : 'Khách đưa thừa / Kết hợp'}</span>
                </button>
              </div>

              {/* CHẾ ĐỘ 1: CHỌN TRỰC TIẾP TM HOẶC CK */}
              {!showCustomSplit ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Nút Tiền Mặt */}
                    <button
                      type="button"
                      onClick={() => setPaymentMode('cash')}
                      className={`relative flex flex-col items-center justify-center gap-1.5 rounded-2xl p-4 text-center border-2 transition-all cursor-pointer ${
                        paymentMode === 'cash'
                          ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-emerald-400 shadow-lg shadow-emerald-700/30 ring-3 ring-emerald-400/30 scale-[1.02]'
                          : 'bg-emerald-50/70 text-emerald-950 border-emerald-300 hover:bg-emerald-100/90 hover:border-emerald-400 hover:scale-[1.01]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                            paymentMode === 'cash'
                              ? 'bg-white/20 text-white'
                              : 'bg-emerald-200 text-emerald-900'
                          }`}
                        >
                          <Banknote className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-wide">
                          💵 TIỀN MẶT (TM)
                        </span>
                      </div>
                      <div
                        className={`text-base sm:text-lg font-black font-mono-nums ${
                          paymentMode === 'cash' ? 'text-white' : 'text-emerald-900'
                        }`}
                      >
                        {formatCurrencyVND(balanceDue)}
                      </div>
                    </button>

                    {/* Nút Chuyển Khoản */}
                    <button
                      type="button"
                      onClick={() => setPaymentMode('transfer')}
                      className={`relative flex flex-col items-center justify-center gap-1.5 rounded-2xl p-4 text-center border-2 transition-all cursor-pointer ${
                        paymentMode === 'transfer'
                          ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-blue-400 shadow-lg shadow-blue-700/30 ring-3 ring-blue-400/30 scale-[1.02]'
                          : 'bg-blue-50/70 text-blue-950 border-blue-300 hover:bg-blue-100/90 hover:border-blue-400 hover:scale-[1.01]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                            paymentMode === 'transfer'
                              ? 'bg-white/20 text-white'
                              : 'bg-blue-200 text-blue-900'
                          }`}
                        >
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-wide">
                          💳 CHUYỂN KHOẢN (CK)
                        </span>
                      </div>
                      <div
                        className={`text-base sm:text-lg font-black font-mono-nums ${
                          paymentMode === 'transfer' ? 'text-white' : 'text-blue-900'
                        }`}
                      >
                        {formatCurrencyVND(balanceDue)}
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                /* CHẾ ĐỘ 2 (KHI BẤM DẤU +): NHẬP TIỀN KHÁCH ĐƯA / CK THỪA */
                <div className="space-y-2.5 pt-1">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <Banknote className="h-3.5 w-3.5 text-emerald-700" />
                        Tiền mặt TM nhận (VND)
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={customCash}
                        onChange={(e) => setCustomCash(e.target.value)}
                        className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm font-black font-mono text-slate-900 focus:outline-none focus:border-slate-800"
                      />
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <CreditCard className="h-3.5 w-3.5 text-blue-700" />
                        Chuyển khoản CK nhận (VND)
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={customTransfer}
                        onChange={(e) => setCustomTransfer(e.target.value)}
                        className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm font-black font-mono text-slate-900 focus:outline-none focus:border-slate-800"
                      />
                    </div>
                  </div>

                  {/* Khách đưa thừa / Tiền thối */}
                  {changeDue > 0 && (
                    <div className="rounded-lg bg-amber-50 p-2.5 border border-amber-300 flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-900 flex items-center gap-1">
                        <RotateCcw className="h-4 w-4 text-amber-700" />
                        Tiền thối lại khách ({refundMethod === 'cash' ? 'Rút két TM' : 'Chuyển khoản'}):
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black font-mono text-rose-700">
                          {formatCurrencyVND(changeDue)}
                        </span>
                        <select
                          value={refundMethod}
                          onChange={(e) => setRefundMethod(e.target.value)}
                          className="rounded border border-amber-300 bg-white px-1.5 py-0.5 text-xs font-semibold text-amber-950"
                        >
                          <option value="cash">Tiền mặt</option>
                          <option value="transfer">Chuyển khoản</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* If advance overpaid (already fully paid before checkout) */}
          {advanceOverpaid > 0 && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-300 p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-emerald-700" />
                <span className="font-bold text-emerald-950">
                  Khách đã thu trước dư, cần thối lại khách:
                </span>
              </div>
              <span className="text-lg font-black font-mono text-emerald-800">
                {formatCurrencyVND(advanceOverpaid)}
              </span>
            </div>
          )}

          {/* Ghi chú */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ghi chú thanh toán
            </label>
            <input
              type="text"
              placeholder="Ghi chú thêm (VD: ck100k, khách quen giảm 20k...)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
            />
          </div>
        </div>

        {/* Nút thao tác */}
        <div className="mt-4 flex gap-2.5 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={handlePrintReceipt}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            <Printer className="h-4 w-4" />
            <span>In Phiếu</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white py-2.5 px-4 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            Đóng
          </button>

          <button
            type="button"
            onClick={handleCompletePayment}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 px-4 text-xs sm:text-sm font-black text-white hover:bg-black active:scale-[0.99] transition shadow-md"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>
              {balanceDue > 0
                ? `Xác Nhận Trả Phòng & Thu ${formatCurrencyVND(balanceDue)}`
                : advanceOverpaid > 0
                ? `Xác Nhận Trả Phòng & Thối ${formatCurrencyVND(advanceOverpaid)}`
                : `Xác Nhận Trả Phòng`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
