import { useMemo, useState } from 'react';
import { calculateTotalBill } from '../utils/calculateTotalBill';

const roomTypes = ['Giờ', 'Qua đêm', 'Ngày đêm'];
const doubleRooms = new Set(['104', '204', '303']);
const allRooms = ['101', '102', '103', '104', '201', '202', '203', '204', '301', '302', '303'];

const initialFormState = {
  roomNumber: '',
  checkIn: '',
  checkOut: '',
  roomType: 'Giờ',
  roomRateMode: 'single',
  drinks: {
    filteredWater: 0,
    softDrink: 0,
    beer: 0,
  },
};

function createBlankFormState(roomNumber = '', roomRateMode = 'single') {
  return {
    ...initialFormState,
    roomNumber,
    roomRateMode,
    drinks: {
      filteredWater: 0,
      softDrink: 0,
      beer: 0,
    },
  };
}

function createRoomState(roomNumber, existingRoom = {}) {
  return {
    roomNumber,
    isDoubleRoom: doubleRooms.has(roomNumber),
    activeStay: existingRoom.activeStay || null,
    lastCheckIn: existingRoom.lastCheckIn || '',
    lastCheckOut: existingRoom.lastCheckOut || '',
    lastRoomType: existingRoom.lastRoomType || '',
    lastDrinks: existingRoom.lastDrinks || {
      filteredWater: 0,
      softDrink: 0,
      beer: 0,
    },
    lastPaymentMethod: existingRoom.lastPaymentMethod || '',
    lastPaidAmount: existingRoom.lastPaidAmount || 0,
    lastChangeDue: existingRoom.lastChangeDue || 0,
    lastShortage: existingRoom.lastShortage || 0,
    lastPaymentMode: existingRoom.lastPaymentMode || '',
    roomRateMode: existingRoom.roomRateMode || 'single',
  };
}

const initialRoomState = allRooms.map((roomNumber) => createRoomState(roomNumber));

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN').format(value);
}

function formatShortCurrency(value) {
  return `${formatCurrency(value / 1000)}k`;
}

function formatDateTimeLocal(date) {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
}

function Field({ label, children, hint }) {
  return (
    <label className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-neutral-900">{label}</span>
        {hint ? <span className="text-xs text-neutral-500">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

function RoomCard({ room, selected, onSelect, onCheckout, onChooseRate, onCheckIn }) {
  const isDouble = room.isDoubleRoom;
  const selectedModeLabel = room.roomRateMode === 'double' ? 'Đôi' : 'Đơn';
  const isOccupied = Boolean(room.activeStay);
  const roomStateLabel = room.activeStay ? 'Đang có khách' : room.lastCheckIn ? 'Đã ở' : 'Trống';

  return (
    <div
      onClick={() => onSelect(room.roomNumber)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(room.roomNumber);
        }
      }}
      className={`group relative rounded-3xl border p-4 text-left transition ${
        selected
          ? 'border-neutral-950 bg-neutral-950 text-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]'
          : isOccupied
            ? 'border-neutral-400 bg-neutral-200 text-neutral-900'
            : room.lastCheckIn
              ? 'border-neutral-300 bg-neutral-100 hover:border-neutral-950 hover:bg-neutral-50'
              : 'border-neutral-300 bg-white hover:border-neutral-950 hover:bg-neutral-50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-lg font-semibold ${selected ? 'text-white' : 'text-neutral-950'}`}>
            Phòng {room.roomNumber}
          </p>
          <p className={`mt-1 text-xs uppercase tracking-[0.28em] ${selected ? 'text-neutral-300' : 'text-neutral-500'}`}>
            {isDouble ? 'Phòng đôi' : 'Phòng đơn'}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isOccupied
              ? selected
                ? 'bg-white text-neutral-950'
                : 'bg-neutral-950 text-white'
              : selected
                ? 'bg-white/10 text-white'
                : room.lastCheckIn
                  ? 'bg-neutral-200 text-neutral-800'
                  : 'bg-neutral-100 text-neutral-900'
          }`}
        >
          {roomStateLabel}
        </span>
      </div>

      <div className={`mt-4 flex items-center justify-between gap-3 text-sm ${selected ? 'text-neutral-100' : 'text-neutral-700'}`}>
        <span>Giá: {isDouble ? selectedModeLabel : 'Đơn'}</span>
        <span className={`text-xs ${selected ? 'text-neutral-300' : 'text-neutral-500'}`}>Chọn trước, bấm Nhận phòng để bắt đầu tính tiền</span>
      </div>

      {selected && isDouble && !isOccupied ? (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onChooseRate(room.roomNumber, 'single');
            }}
            className={`flex-1 rounded-2xl border px-3 py-2 text-sm font-medium transition ${
              room.roomRateMode === 'single'
                ? 'border-neutral-950 bg-neutral-950 text-white'
                : 'border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50'
            }`}
          >
            Đơn
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onChooseRate(room.roomNumber, 'double');
            }}
            className={`flex-1 rounded-2xl border px-3 py-2 text-sm font-medium transition ${
              room.roomRateMode === 'double'
                ? 'border-neutral-950 bg-neutral-950 text-white'
                : 'border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50'
            }`}
          >
            Đôi
          </button>
        </div>
      ) : null}

      {selected ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className={`text-xs ${selected ? 'text-neutral-200' : 'text-neutral-600'}`}>Đã chọn phòng</span>
          {isOccupied ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onCheckout(room.roomNumber);
              }}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                selected
                  ? 'border-white bg-white text-neutral-950 hover:bg-neutral-100'
                  : 'border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              Trả phòng
            </button>
          ) : (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onCheckIn(room.roomNumber);
              }}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                selected
                  ? 'border-white bg-white text-neutral-950 hover:bg-neutral-100'
                  : 'border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              Nhận phòng
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function RoomBooking() {
  const [formData, setFormData] = useState(initialFormState);
  const [rooms, setRooms] = useState(initialRoomState);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState('');
  const [checkoutDialog, setCheckoutDialog] = useState(null);
  const [roomListInput, setRoomListInput] = useState(allRooms.join(', '));

  const bill = useMemo(() => {
    return calculateTotalBill(
      formData.checkIn,
      formData.checkOut,
      formData.roomType,
      formData.drinks,
      formData.roomRateMode === 'double' ? 2 : 1,
    );
  }, [formData]);

  const selectedRoom = rooms.find((room) => room.roomNumber === selectedRoomNumber) || null;
  const roomTypeOptions = ['Giờ', 'Qua đêm', 'Ngày đêm'];
  const roomRows = rooms.map((room) => ({
      ...room,
      rateLabel: (room.activeStay?.roomRateMode || room.roomRateMode) === 'double' ? 'Đôi x2' : 'Đơn x1',
      stayLabel: room.activeStay ? 'Đang có khách' : 'Đã ở',
      checkInLabel: room.activeStay?.checkIn || room.lastCheckIn || '---',
      checkOutLabel: room.activeStay ? '---' : room.lastCheckOut || '---',
      roomTypeLabel: room.activeStay?.roomType || room.lastRoomType || '---',
      drinks: room.activeStay?.drinks || room.lastDrinks,
      paymentLabel: room.lastPaymentMethod
        ? `${room.lastPaymentMethod === 'ck' ? 'CK' : 'TM'} ${formatShortCurrency(room.lastPaidAmount || 0)}`
        : '---',
    }));

  const updateRoomByNumber = (roomNumber, updater) => {
    setRooms((currentRooms) =>
      currentRooms.map((room) => {
        if (room.roomNumber !== roomNumber) {
          return room;
        }

        return updater(room);
      }),
    );
  };

  const updateRoomRoomType = (roomNumber, roomType) => {
    updateRoomByNumber(roomNumber, (room) => {
      if (room.activeStay) {
        return {
          ...room,
          activeStay: {
            ...room.activeStay,
            roomType,
          },
          lastRoomType: roomType,
        };
      }

      return {
        ...room,
        lastRoomType: roomType,
      };
    });
  };

  const updateRoomRateMode = (roomNumber, roomRateMode) => {
    updateRoomByNumber(roomNumber, (room) => ({
      ...room,
      roomRateMode,
      activeStay: room.activeStay
        ? {
            ...room.activeStay,
            roomRateMode,
          }
        : room.activeStay,
    }));
  };

  const updateRoomDrinkField = (roomNumber, key, value) => {
    const parsedValue = Number(value);
    const drinkValue = Number.isNaN(parsedValue) ? 0 : parsedValue;

    updateRoomByNumber(roomNumber, (room) => {
      const nextDrinks = {
        ...(room.activeStay?.drinks || room.lastDrinks || { filteredWater: 0, softDrink: 0, beer: 0 }),
        [key]: drinkValue,
      };

      if (room.activeStay) {
        return {
          ...room,
          activeStay: {
            ...room.activeStay,
            drinks: nextDrinks,
          },
          lastDrinks: nextDrinks,
        };
      }

      return {
        ...room,
        lastDrinks: nextDrinks,
      };
    });
  };

  const handleQuickCheckIn = (roomNumber) => {
    const room = rooms.find((item) => item.roomNumber === roomNumber);

    if (!room || room.activeStay) {
      return;
    }

    const checkInTime = formatDateTimeLocal(new Date());
    const roomType = room.lastRoomType || 'Giờ';
    const roomRateMode = room.roomRateMode || 'single';
    const drinks = { ...(room.lastDrinks || { filteredWater: 0, softDrink: 0, beer: 0 }) };

    updateRoomByNumber(roomNumber, (currentRoom) => ({
      ...currentRoom,
      activeStay: {
        checkIn: checkInTime,
        roomType,
        roomRateMode,
        drinks,
      },
      lastCheckIn: checkInTime,
      lastCheckOut: '',
      lastRoomType: roomType,
      lastDrinks: drinks,
      roomRateMode,
    }));

    setSelectedRoomNumber(roomNumber);
    setFormData({
      ...createBlankFormState(roomNumber, roomRateMode),
      roomType,
      checkIn: checkInTime,
      drinks,
    });
  };

  const getRoomPrice = (room) => {
    const roomType = room.activeStay?.roomType || room.lastRoomType;
    const roomRateMultiplier = (room.activeStay?.roomRateMode || room.roomRateMode) === 'double' ? 2 : 1;

    if (!roomType) {
      return 0;
    }

    const priceSource = room.activeStay
      ? calculateTotalBill(room.activeStay.checkIn, '', roomType, {}, roomRateMultiplier, new Date()).roomCost
      : calculateTotalBill(room.lastCheckIn, room.lastCheckOut, roomType, {}, roomRateMultiplier).roomCost;

    return priceSource;
  };

  const getRoomDrinkCost = (room) => {
    const drinks = room.activeStay?.drinks || room.lastDrinks || {};

    return calculateTotalBill(
      room.activeStay?.checkIn || room.lastCheckIn,
      room.activeStay ? '' : room.lastCheckOut,
      room.activeStay?.roomType || room.lastRoomType,
      drinks,
      (room.activeStay?.roomRateMode || room.roomRateMode) === 'double' ? 2 : 1,
      new Date(),
    ).drinkCost;
  };

  const getRoomTotalCost = (room) => {
    const roomType = room.activeStay?.roomType || room.lastRoomType;
    const roomRateMultiplier = (room.activeStay?.roomRateMode || room.roomRateMode) === 'double' ? 2 : 1;
    const drinks = room.activeStay?.drinks || room.lastDrinks || {};

    if (!roomType) {
      return 0;
    }

    return calculateTotalBill(
      room.activeStay?.checkIn || room.lastCheckIn,
      room.activeStay ? '' : room.lastCheckOut,
      roomType,
      drinks,
      roomRateMultiplier,
      new Date(),
    ).totalCost;
  };

  const getCheckoutRoom = () => {
    if (!checkoutDialog?.roomNumber) {
      return null;
    }

    return rooms.find((room) => room.roomNumber === checkoutDialog.roomNumber) || null;
  };

  const getCheckoutPreview = () => {
    const checkoutRoom = getCheckoutRoom();

    if (!checkoutRoom) {
      return { due: 0, paidAmount: 0, changeDue: 0, shortage: 0 };
    }

    const due = getRoomTotalCost(checkoutRoom);
    const paidAmount = Number(checkoutDialog?.paidAmount || 0);

    return {
      due,
      paidAmount,
      changeDue: Math.max(0, paidAmount - due),
      shortage: Math.max(0, due - paidAmount),
    };
  };

  const getSelectedRoomNotice = () => {
    if (!selectedRoom?.activeStay) {
      return null;
    }

    return {
      roomNumber: selectedRoom.roomNumber,
      checkIn: selectedRoom.activeStay.checkIn,
      status: 'Đang có khách',
    };
  };

  const loadRoomIntoForm = (roomNumber) => {
    const room = rooms.find((item) => item.roomNumber === roomNumber);

    if (!room) {
      return;
    }

    setSelectedRoomNumber(roomNumber);
    setFormData({
      roomNumber,
      checkIn: room.activeStay?.checkIn || room.lastCheckIn || '',
      checkOut: room.activeStay ? '' : room.lastCheckOut || '',
      roomType: room.activeStay?.roomType || room.lastRoomType || 'Giờ',
      roomRateMode: room.activeStay?.roomRateMode || room.roomRateMode || 'single',
      drinks: {
        ...(room.activeStay?.drinks || room.lastDrinks || {
          filteredWater: 0,
          softDrink: 0,
          beer: 0,
        }),
      },
    });
  };

  const updateDrink = (key, value) => {
    const parsedValue = Number(value);
    setFormData((current) => ({
      ...current,
      drinks: {
        ...current.drinks,
        [key]: Number.isNaN(parsedValue) ? 0 : parsedValue,
      },
    }));
  };

  const handleRoomSelect = (roomNumber) => {
    const room = rooms.find((item) => item.roomNumber === roomNumber);

    if (!room) {
      return;
    }

    setSelectedRoomNumber(roomNumber);
    setFormData(createBlankFormState(roomNumber, room.roomRateMode || 'single'));
  };

  const handleRoomRateChoice = (roomNumber, roomRateMode) => {
    setSelectedRoomNumber(roomNumber);
    setRooms((currentRooms) =>
      currentRooms.map((room) => (room.roomNumber === roomNumber ? { ...room, roomRateMode } : room)),
    );
    setFormData((current) => ({
      ...current,
      roomNumber,
      roomRateMode,
    }));
  };

  const handleCheckIn = () => {
    if (!selectedRoomNumber) {
      return;
    }

    const room = rooms.find((item) => item.roomNumber === selectedRoomNumber);

    if (!room || room.activeStay) {
      return;
    }

    const checkInTime = formatDateTimeLocal(new Date());

    setRooms((currentRooms) =>
      currentRooms.map((currentRoom) =>
        currentRoom.roomNumber === selectedRoomNumber
          ? {
              ...currentRoom,
              activeStay: {
                checkIn: checkInTime,
                roomType: formData.roomType,
                roomRateMode: formData.roomRateMode,
                drinks: { ...formData.drinks },
              },
              lastCheckIn: checkInTime,
              lastCheckOut: '',
              lastRoomType: formData.roomType,
              lastDrinks: { ...formData.drinks },
              roomRateMode: formData.roomRateMode,
            }
          : currentRoom,
      ),
    );

    setFormData((current) => ({
      ...current,
      roomNumber: selectedRoomNumber,
      checkIn: checkInTime,
      checkOut: '',
      roomRateMode: room.roomRateMode,
      roomType: formData.roomType,
    }));
  };

  const handleCheckout = (roomNumber) => {
    const checkoutRoom = rooms.find((room) => room.roomNumber === roomNumber);

    if (!checkoutRoom?.activeStay) {
      return;
    }

    setSelectedRoomNumber(roomNumber);
    setCheckoutDialog({
      roomNumber,
      paymentMethod: 'cash',
      paidAmount: String(getRoomTotalCost(checkoutRoom)),
    });
  };

  const handleFinalizeCheckout = () => {
    const checkoutRoom = getCheckoutRoom();

    if (!checkoutRoom?.activeStay || !checkoutDialog?.roomNumber) {
      return;
    }

    const checkoutTime = formatDateTimeLocal(new Date());
    const preview = getCheckoutPreview();

    setRooms((currentRooms) =>
      currentRooms.map((room) =>
        room.roomNumber === checkoutDialog.roomNumber
          ? {
              ...room,
              activeStay: null,
              lastCheckOut: checkoutTime,
              lastDrinks: room.activeStay?.drinks || room.lastDrinks,
              lastPaymentMethod: checkoutDialog.paymentMethod,
              lastPaidAmount: preview.paidAmount,
              lastChangeDue: preview.changeDue,
              lastShortage: preview.shortage,
            }
          : room,
      ),
    );

    if (selectedRoomNumber === checkoutDialog.roomNumber) {
      setFormData((current) => ({
        ...current,
        checkOut: checkoutTime,
      }));
    }

    setCheckoutDialog(null);
  };

  const updateCheckoutMethod = (paymentMethod) => {
    setCheckoutDialog((current) => ({
      ...current,
      paymentMethod,
    }));
  };

  const setCheckoutAsOtherTransfer = () => {
    setCheckoutDialog((current) => ({
      ...current,
      paymentMethod: 'ck',
      transferMode: 'other',
    }));
  };

  const updateCheckoutAmount = (value) => {
    setCheckoutDialog((current) => ({
      ...current,
      paidAmount: value,
    }));
  };

  const handleUpdateRoom = () => {
    if (!selectedRoomNumber) {
      return;
    }

    setRooms((currentRooms) =>
      currentRooms.map((room) => {
        if (room.roomNumber !== selectedRoomNumber) {
          return room;
        }

        const snapshot = {
          filteredWater: Number(formData.drinks.filteredWater || 0),
          softDrink: Number(formData.drinks.softDrink || 0),
          beer: Number(formData.drinks.beer || 0),
        };

        if (room.activeStay) {
          return {
            ...room,
            activeStay: {
              ...room.activeStay,
              checkIn: formData.checkIn || room.activeStay.checkIn,
              roomType: formData.roomType,
              roomRateMode: formData.roomRateMode,
              drinks: snapshot,
            },
            lastCheckIn: formData.checkIn || room.lastCheckIn,
            lastRoomType: formData.roomType,
            lastDrinks: snapshot,
            roomRateMode: formData.roomRateMode,
          };
        }

        return {
          ...room,
          lastCheckIn: formData.checkIn || room.lastCheckIn,
          lastCheckOut: formData.checkOut || room.lastCheckOut,
          lastRoomType: formData.roomType,
          lastDrinks: snapshot,
          roomRateMode: formData.roomRateMode,
        };
      }),
    );
  };

  const handleApplyRoomList = () => {
    const roomNumbers = roomListInput
      .split(/[,\s]+/)
      .map((value) => value.trim())
      .filter(Boolean);

    if (roomNumbers.length === 0) {
      return;
    }

    const uniqueRoomNumbers = [...new Set(roomNumbers)];

    setRooms((currentRooms) =>
      uniqueRoomNumbers.map((roomNumber) => {
        const existingRoom = currentRooms.find((room) => room.roomNumber === roomNumber);
        return createRoomState(roomNumber, existingRoom);
      }),
    );

    if (!uniqueRoomNumbers.includes(selectedRoomNumber)) {
      setSelectedRoomNumber('');
      setFormData(initialFormState);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log('Room booking payload', formData);
  };

  return (
    <main className="min-h-screen bg-[#f4f4f5] text-neutral-950">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-neutral-300 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] xl:p-8">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-neutral-500">Danh sách phòng</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">Quản lý bằng danh sách</h1>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  value={roomListInput}
                  onChange={(event) => setRoomListInput(event.target.value)}
                  placeholder="Nhập số phòng: 101, 102, 203"
                  className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-neutral-950 outline-none transition focus:border-neutral-950 sm:w-48"
                />
                <button
                  type="button"
                  onClick={handleApplyRoomList}
                  className="rounded-2xl bg-neutral-950 px-5 py-3 font-semibold text-white transition hover:bg-neutral-800"
                >
                  Giữ danh sách
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {rooms.map((room) => (
                <RoomCard
                  key={room.roomNumber}
                  room={room}
                  selected={selectedRoomNumber === room.roomNumber}
                  onSelect={handleRoomSelect}
                  onChooseRate={handleRoomRateChoice}
                  onCheckout={handleCheckout}
                  onCheckIn={handleQuickCheckIn}
                />
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-neutral-300 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] xl:p-8">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-neutral-500">Thao tác phòng</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
                  Quản lý bằng bảng
                </h2>
              </div>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Room Number">
                  <input
                    value={formData.roomNumber}
                    onChange={(event) => {
                      const value = event.target.value;
                      setFormData((current) => ({ ...current, roomNumber: value }));
                      setSelectedRoomNumber(value);
                    }}
                    placeholder="VD: 101"
                    className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-neutral-950 outline-none transition focus:border-neutral-950"
                  />
                </Field>

                <Field label="Loại phòng">
                  <select
                    value={formData.roomType}
                    onChange={(event) => setFormData((current) => ({ ...current, roomType: event.target.value }))}
                    className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-neutral-950 outline-none transition focus:border-neutral-950"
                  >
                    {roomTypes.map((roomType) => (
                      <option key={roomType} value={roomType} className="bg-white text-neutral-950">
                        {roomType}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Check-in Time">
                  <input
                    type="datetime-local"
                    value={formData.checkIn}
                    onChange={(event) => setFormData((current) => ({ ...current, checkIn: event.target.value }))}
                    className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-neutral-950 outline-none transition focus:border-neutral-950"
                  />
                </Field>

                <Field label="Check-out Time">
                  <input
                    type="datetime-local"
                    value={formData.checkOut}
                    onChange={(event) => setFormData((current) => ({ ...current, checkOut: event.target.value }))}
                    className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-neutral-950 outline-none transition focus:border-neutral-950"
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Nước lọc" hint="10,000 VND / item">
                  <input
                    type="number"
                    min="0"
                    value={formData.drinks.filteredWater}
                    onChange={(event) => updateDrink('filteredWater', event.target.value)}
                    className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-neutral-950 outline-none transition focus:border-neutral-950"
                  />
                </Field>

                <Field label="Nước ngọt" hint="15,000 VND / item">
                  <input
                    type="number"
                    min="0"
                    value={formData.drinks.softDrink}
                    onChange={(event) => updateDrink('softDrink', event.target.value)}
                    className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-neutral-950 outline-none transition focus:border-neutral-950"
                  />
                </Field>

                <Field label="Bia" hint="20,000 VND / item">
                  <input
                    type="number"
                    min="0"
                    value={formData.drinks.beer}
                    onChange={(event) => updateDrink('beer', event.target.value)}
                    className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-neutral-950 outline-none transition focus:border-neutral-950"
                  />
                </Field>
              </div>

              <div className="rounded-3xl border border-neutral-300 bg-neutral-100 p-4">
                <button
                  type="button"
                  onClick={handleCheckIn}
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                  disabled={!selectedRoomNumber || selectedRoom?.activeStay}
                >
                  {selectedRoom?.activeStay ? 'Đang có khách' : 'Nhận phòng'}
                </button>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleUpdateRoom}
                  className="inline-flex items-center justify-center rounded-2xl bg-neutral-950 px-5 py-3 font-semibold text-white transition hover:bg-neutral-800"
                >
                  Cập nhật
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(initialFormState)}
                  className="inline-flex items-center justify-center rounded-2xl border border-neutral-300 bg-white px-5 py-3 font-semibold text-neutral-950 transition hover:bg-neutral-100"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>

          <aside className="flex flex-col gap-6">
            <div className="rounded-[2rem] border border-neutral-300 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
              <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">Thanh toán</p>
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-neutral-300 bg-neutral-100 p-4">
                  <div className="flex items-center justify-between gap-4 text-sm text-neutral-700">
                    <span>Phòng đang chọn</span>
                    <span>{formData.roomNumber || 'Chưa chọn'}</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-neutral-300 bg-neutral-100 p-4">
                  <div className="flex items-center justify-between gap-4 text-sm text-neutral-700">
                    <span>Giá phòng</span>
                    <span>{formData.roomRateMode === 'double' ? 'Đôi x2' : 'Đơn x1'}</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-neutral-300 bg-neutral-100 p-4">
                  <div className="flex items-center justify-between gap-4 text-sm text-neutral-700">
                    <span>Tiền phòng</span>
                    <span>{formatCurrency(bill.roomCost)} VND</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-neutral-300 bg-neutral-100 p-4">
                  <div className="flex items-center justify-between gap-4 text-sm text-neutral-700">
                    <span>Tiền nước</span>
                    <span>{formatCurrency(bill.drinkCost)} VND</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-neutral-950 bg-neutral-950 p-5 text-white">
                <p className="text-sm uppercase tracking-[0.28em] text-neutral-300">Tổng tiền</p>
                <p className="mt-3 text-4xl font-bold text-white">{formatCurrency(bill.totalCost)} VND</p>
                <p className="mt-2 text-sm text-neutral-300">
                  Tự cập nhật khi đổi phòng, loại phòng, check-in/check-out hoặc số lượng đồ uống.
                </p>
              </div>
            </div>

          </aside>
        </section>

        <section className="rounded-[2rem] border border-neutral-300 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] xl:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-neutral-500">Danh sách</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">Quản lý bằng bảng</h3>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                value={roomListInput}
                onChange={(event) => setRoomListInput(event.target.value)}
                placeholder="Nhập số phòng: 101, 102, 203"
                className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-neutral-950 outline-none transition focus:border-neutral-950 sm:w-48"
              />
              <button
                type="button"
                onClick={handleApplyRoomList}
                className="rounded-2xl bg-neutral-950 px-5 py-3 font-semibold text-white transition hover:bg-neutral-800"
              >
                Giữ danh sách
              </button>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-neutral-300">
            <table className="min-w-full divide-y divide-neutral-300 bg-white text-sm">
              <thead className="bg-neutral-950 text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Phòng</th>
                  <th className="px-4 py-3 text-left font-semibold">Loại</th>
                  <th className="px-4 py-3 text-left font-semibold">Giá đang dùng</th>
                  <th className="px-4 py-3 text-left font-semibold">Tiền phòng</th>
                  <th className="px-4 py-3 text-left font-semibold">Tiền nước</th>
                  <th className="px-4 py-3 text-left font-semibold">Tổng tiền</th>
                  <th className="px-4 py-3 text-left font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 text-left font-semibold">Check-in</th>
                  <th className="px-4 py-3 text-left font-semibold">Check-out</th>
                  <th className="px-4 py-3 text-left font-semibold">Thanh toán</th>
                  <th className="px-4 py-3 text-left font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {roomRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-neutral-500" colSpan={11}>
                      Chưa có phòng đang ở hoặc đã ở.
                    </td>
                  </tr>
                ) : (
                  roomRows.map((room) => (
                    <tr
                      key={room.roomNumber}
                      className={`cursor-pointer ${room.stayLabel === 'Đang có khách' ? 'bg-neutral-50' : 'bg-white'}`}
                      onClick={() => loadRoomIntoForm(room.roomNumber)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          loadRoomIntoForm(room.roomNumber);
                        }
                      }}
                    >
                      <td className="px-4 py-3 font-medium text-neutral-950">{room.roomNumber}</td>
                      <td className="px-4 py-3 text-neutral-700">
                        <select
                          value={room.roomTypeLabel === '---' ? 'Giờ' : room.roomTypeLabel}
                          onChange={(event) => {
                            event.stopPropagation();
                            updateRoomRoomType(room.roomNumber, event.target.value);
                          }}
                          onClick={(event) => event.stopPropagation()}
                          className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-950 outline-none"
                        >
                          {roomTypeOptions.map((roomType) => (
                            <option key={roomType} value={roomType}>
                              {roomType}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-neutral-700">
                        <select
                          value={room.rateLabel.startsWith('Đôi') ? 'double' : 'single'}
                          onChange={(event) => {
                            event.stopPropagation();
                            updateRoomRateMode(room.roomNumber, event.target.value);
                          }}
                          onClick={(event) => event.stopPropagation()}
                          className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-950 outline-none"
                          disabled={!room.isDoubleRoom}
                        >
                          <option value="single">Đơn x1</option>
                          <option value="double">Đôi x2</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 font-semibold text-neutral-950">{formatCurrency(getRoomPrice(room))} VND</td>
                      <td className="px-4 py-3 text-neutral-700">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2 text-xs text-neutral-500">
                            <span>Nước lọc</span>
                            <span>{room.drinks.filteredWater || 0}</span>
                          </div>
                          <input
                            type="number"
                            min="0"
                            value={room.drinks.filteredWater || 0}
                            onChange={(event) => updateRoomDrinkField(room.roomNumber, 'filteredWater', event.target.value)}
                            onClick={(event) => event.stopPropagation()}
                            className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-950 outline-none"
                          />
                          <div className="flex items-center justify-between gap-2 text-xs text-neutral-500">
                            <span>Nước ngọt</span>
                            <span>{room.drinks.softDrink || 0}</span>
                          </div>
                          <input
                            type="number"
                            min="0"
                            value={room.drinks.softDrink || 0}
                            onChange={(event) => updateRoomDrinkField(room.roomNumber, 'softDrink', event.target.value)}
                            onClick={(event) => event.stopPropagation()}
                            className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-950 outline-none"
                          />
                          <div className="flex items-center justify-between gap-2 text-xs text-neutral-500">
                            <span>Bia</span>
                            <span>{room.drinks.beer || 0}</span>
                          </div>
                          <input
                            type="number"
                            min="0"
                            value={room.drinks.beer || 0}
                            onChange={(event) => updateRoomDrinkField(room.roomNumber, 'beer', event.target.value)}
                            onClick={(event) => event.stopPropagation()}
                            className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-950 outline-none"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-neutral-950">{formatCurrency(getRoomTotalCost(room))} VND</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            room.stayLabel === 'Đang có khách' ? 'bg-neutral-950 text-white' : 'bg-neutral-200 text-neutral-800'
                          }`}
                        >
                          {room.stayLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-700">{room.checkInLabel}</td>
                      <td className="px-4 py-3 text-neutral-700">{room.checkOutLabel}</td>
                      <td className="px-4 py-3 text-neutral-700">
                        <div className="space-y-1">
                          <p className="font-medium text-neutral-950">{room.paymentLabel}</p>
                          {room.lastChangeDue > 0 ? <p className="text-xs text-neutral-500">Thối {formatShortCurrency(room.lastChangeDue)}</p> : null}
                          {room.lastShortage > 0 ? <p className="text-xs text-neutral-500">Thiếu {formatShortCurrency(room.lastShortage)}</p> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              loadRoomIntoForm(room.roomNumber);
                            }}
                            className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs font-medium text-neutral-950 transition hover:bg-neutral-100"
                          >
                            Chọn
                          </button>
                          {room.stayLabel !== 'Đang có khách' ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleQuickCheckIn(room.roomNumber);
                              }}
                              className="rounded-full border border-emerald-400 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                            >
                              Nhận phòng
                            </button>
                          ) : null}
                          {room.stayLabel === 'Đang có khách' ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleCheckout(room.roomNumber);
                              }}
                              className="rounded-full border border-neutral-950 bg-neutral-950 px-3 py-1 text-xs font-medium text-white transition hover:bg-neutral-800"
                            >
                              Trả phòng
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {checkoutDialog ? (() => {
          const preview = getCheckoutPreview();
          const checkoutRoom = getCheckoutRoom();

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
              <div className="w-full max-w-lg rounded-[2rem] border border-neutral-300 bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-neutral-500">Trả phòng</p>
                    <h3 className="mt-2 text-2xl font-semibold text-neutral-950">
                      Phòng {checkoutRoom?.roomNumber}
                    </h3>
                    <p className="mt-2 text-sm text-neutral-600">
                      Chọn phương thức thanh toán và nhập số tiền thực nhận để hiện rõ thừa hoặc thiếu.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCheckoutDialog(null)}
                    className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-sm text-neutral-950"
                  >
                    Đóng
                  </button>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => updateCheckoutMethod('cash')}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        checkoutDialog.paymentMethod === 'cash'
                          ? 'border-neutral-950 bg-neutral-950 text-white'
                          : 'border-neutral-300 bg-white text-neutral-950 hover:bg-neutral-100'
                      }`}
                    >
                      <p className="font-semibold">Tiền mặt</p>
                      <p className={`text-xs ${checkoutDialog.paymentMethod === 'cash' ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        Khách trả trực tiếp
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCheckoutMethod('ck')}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        checkoutDialog.paymentMethod === 'ck'
                          ? 'border-neutral-950 bg-neutral-950 text-white'
                          : 'border-neutral-300 bg-white text-neutral-950 hover:bg-neutral-100'
                      }`}
                    >
                      <p className="font-semibold">CK</p>
                      <p className={`text-xs ${checkoutDialog.paymentMethod === 'ck' ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        Chuyển khoản
                      </p>
                    </button>
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={setCheckoutAsOtherTransfer}
                      className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100"
                    >
                      CK khác
                    </button>
                  </div>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-neutral-900">
                      {checkoutDialog.paymentMethod === 'ck' ? 'Số tiền CK khác' : 'Số tiền nhận'}
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={checkoutDialog.paidAmount}
                      onChange={(event) => updateCheckoutAmount(event.target.value)}
                      className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-neutral-950 outline-none transition focus:border-neutral-950"
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-neutral-300 bg-neutral-100 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Cần thu</p>
                      <p className="mt-2 text-lg font-semibold text-neutral-950">{formatCurrency(preview.due)} VND</p>
                    </div>
                    <div className="rounded-2xl border border-neutral-300 bg-neutral-100 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Thối khách</p>
                      <p className="mt-2 text-lg font-semibold text-neutral-950">{formatCurrency(preview.changeDue)} VND</p>
                    </div>
                    <div className="rounded-2xl border border-neutral-300 bg-neutral-100 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Còn thiếu</p>
                      <p className="mt-2 text-lg font-semibold text-neutral-950">{formatCurrency(preview.shortage)} VND</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-neutral-300 bg-neutral-100 p-4 text-sm text-neutral-700">
                    {preview.changeDue > 0 ? (
                      <p>Khách trả dư {formatCurrency(preview.changeDue)} VND, cần thối lại số tiền này.</p>
                    ) : preview.shortage > 0 ? (
                      <p>Khách còn thiếu {formatCurrency(preview.shortage)} VND. Có thể thu thêm tiền mặt hoặc CK bổ sung.</p>
                    ) : (
                      <p>Số tiền đã khớp đúng với tổng tiền cần thu.</p>
                    )}
                    {checkoutDialog.paymentMethod === 'ck' && checkoutDialog.transferMode === 'other' ? (
                      <p className="mt-2 text-neutral-500">
                        Sẽ lưu thành {`CK ${formatShortCurrency(Number(checkoutDialog.paidAmount || 0))}`} phía sau khi xác nhận.
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setCheckoutDialog(null)}
                    className="inline-flex items-center justify-center rounded-2xl border border-neutral-300 bg-white px-5 py-3 font-semibold text-neutral-950 transition hover:bg-neutral-100"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleFinalizeCheckout}
                    className="inline-flex items-center justify-center rounded-2xl bg-neutral-950 px-5 py-3 font-semibold text-white transition hover:bg-neutral-800"
                  >
                    Xác nhận trả phòng
                  </button>
                </div>
              </div>
            </div>
          );
        })() : null}
      </div>
    </main>
  );
}
