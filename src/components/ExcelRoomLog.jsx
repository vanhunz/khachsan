import { useMemo, useState } from 'react';
import { calculateTotalBill } from '../utils/calculateTotalBill';

const roomTypes = ['Giờ', 'Qua đêm', 'Ngày đêm'];
const statusOptions = ['', 'Đang ở', 'Xong'];

const sampleRows = [
  {
    id: 1,
    date: '05/06/2026',
    roomNumber: '302',
    roomType: 'Ngày đêm',
    checkIn: '12:00',
    checkOut: '',
    beer: 0,
    filteredWater: 0,
    softDrink: 0,
    extra: 350000,
    note: '(dtt)',
    status: '',
  },
  {
    id: 2,
    date: '05/06/2026',
    roomNumber: '102',
    roomType: 'Giờ',
    checkIn: '18:28',
    checkOut: '20:24',
    beer: 0,
    filteredWater: 1,
    softDrink: 1,
    extra: 0,
    note: '',
    status: 'Xong',
  },
  {
    id: 3,
    date: '05/06/2026',
    roomNumber: '103',
    roomType: 'Giờ',
    checkIn: '19:11',
    checkOut: '20:38',
    beer: 0,
    filteredWater: 0,
    softDrink: 1,
    extra: 0,
    note: '',
    status: 'Xong',
  },
  {
    id: 4,
    date: '05/06/2026',
    roomNumber: '101',
    roomType: 'Giờ',
    checkIn: '19:24',
    checkOut: '22:14',
    beer: 0,
    filteredWater: 0,
    softDrink: 1,
    extra: 0,
    note: '',
    status: 'Xong',
  },
  {
    id: 5,
    date: '05/06/2026',
    roomNumber: '104',
    roomType: 'Giờ',
    checkIn: '19:52',
    checkOut: '21:39',
    beer: 0,
    filteredWater: 0,
    softDrink: 0,
    extra: 0,
    note: '',
    status: 'Xong',
  },
  {
    id: 6,
    date: '05/06/2026',
    roomNumber: '201',
    roomType: 'Qua đêm',
    checkIn: '19:52',
    checkOut: '05:35',
    beer: 0,
    filteredWater: 0,
    softDrink: 0,
    extra: 0,
    note: '',
    status: 'Xong',
  },
  {
    id: 7,
    date: '05/06/2026',
    roomNumber: '202',
    roomType: 'Qua đêm',
    checkIn: '20:00',
    checkOut: '06:24',
    beer: 0,
    filteredWater: 0,
    softDrink: 0,
    extra: 0,
    note: '',
    status: 'Xong',
  },
];

function formatMoney(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value || 0));
}

function createBlankRow(id) {
  return {
    id,
    date: '',
    roomNumber: '',
    roomType: 'Giờ',
    checkIn: '',
    checkOut: '',
    beer: 0,
    filteredWater: 0,
    softDrink: 0,
    extra: 0,
    note: '',
    status: '',
  };
}

function normalizeDate(value) {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  return '';
}

function combineDateAndTime(dateValue, timeValue) {
  const normalizedDate = normalizeDate(dateValue);
  const normalizedTime = String(timeValue || '').trim();

  if (!normalizedDate || !normalizedTime) {
    return '';
  }

  const time = normalizedTime.length === 5 ? `${normalizedTime}:00` : normalizedTime;
  return `${normalizedDate}T${time}`;
}

function buildRoomCost(row) {
  if (row.roomType === 'Giờ') {
    const checkIn = combineDateAndTime(row.date, row.checkIn);
    const checkOut = combineDateAndTime(row.date, row.checkOut);
    return calculateTotalBill(checkIn, checkOut, row.roomType, {}, 1, new Date()).roomCost;
  }

  return calculateTotalBill('', '', row.roomType, {}, 1, new Date()).roomCost;
}

function buildDrinkCost(row) {
  return calculateTotalBill('', '', 'Giờ', {
    beer: row.beer,
    filteredWater: row.filteredWater,
    softDrink: row.softDrink,
  }).drinkCost;
}

function RowCellInput({ value, onChange, type = 'text', placeholder, className = '', min }) {
  return (
    <input
      type={type}
      min={min}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full border-0 bg-transparent px-2 py-2 text-sm outline-none ${className}`}
    />
  );
}

export default function ExcelRoomLog() {
  const [rows, setRows] = useState(sampleRows);
  const [nextId, setNextId] = useState(sampleRows.length + 1);

  const totals = useMemo(() => {
    return rows.map((row) => {
      const roomCost = buildRoomCost(row);
      const drinkCost = buildDrinkCost(row);
      const totalCost = roomCost + drinkCost + Number(row.extra || 0);

      return {
        ...row,
        roomCost,
        drinkCost,
        totalCost,
      };
    });
  }, [rows]);

  const updateRow = (id, field, value) => {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  };

  const addRow = () => {
    setRows((currentRows) => [...currentRows, createBlankRow(nextId)]);
    setNextId((current) => current + 1);
  };

  const removeLastRow = () => {
    setRows((currentRows) => currentRows.slice(0, -1));
  };

  return (
    <main className="min-h-screen bg-[#efefef] p-4 text-black sm:p-6">
      <div className="mx-auto max-w-[1400px] rounded-[28px] border border-neutral-300 bg-white p-6 shadow-[0_18px_40px_rgba(0,0,0,0.12)] sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.45em] text-neutral-500">Danh sách</p>
            <h1 className="mt-2 text-3xl font-semibold text-black">Quản lý phòng</h1>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={addRow}
              className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white"
            >
              Thêm dòng
            </button>
            <button
              type="button"
              onClick={removeLastRow}
              className="rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-black"
            >
              Xóa dòng cuối
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-neutral-300">
          <table className="min-w-[1500px] border-collapse text-sm">
            <thead>
              <tr className="bg-[#c7d7eb] text-black">
                {['Ngày', 'Phòng', 'Loại phòng', 'Giờ vào', 'Giờ ra', 'Bia', 'Suối', 'Nước ngọt', 'Tiền nước', 'Tiền phòng', 'Phụ thu', 'Tổng tiền', 'Ghi chú', 'Trạng Thái'].map((header) => (
                  <th key={header} className="border border-neutral-400 px-3 py-3 text-left font-semibold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {totals.map((row, index) => (
                <tr key={row.id} className="bg-[#fff200] align-top">
                  <td className="border border-neutral-400 p-0">
                    <RowCellInput
                      value={row.date}
                      onChange={(event) => updateRow(row.id, 'date', event.target.value)}
                      placeholder="dd/mm/yyyy"
                    />
                  </td>
                  <td className="border border-neutral-400 p-0">
                    <RowCellInput
                      value={row.roomNumber}
                      onChange={(event) => updateRow(row.id, 'roomNumber', event.target.value)}
                      placeholder="302"
                    />
                  </td>
                  <td className="border border-neutral-400 p-0">
                    <select
                      value={row.roomType}
                      onChange={(event) => updateRow(row.id, 'roomType', event.target.value)}
                      className="w-full border-0 bg-transparent px-2 py-2 text-sm outline-none"
                    >
                      {roomTypes.map((roomType) => (
                        <option key={roomType} value={roomType}>
                          {roomType}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border border-neutral-400 p-0">
                    <RowCellInput
                      value={row.checkIn}
                      onChange={(event) => updateRow(row.id, 'checkIn', event.target.value)}
                      placeholder="12:00"
                    />
                  </td>
                  <td className="border border-neutral-400 p-0">
                    <RowCellInput
                      value={row.checkOut}
                      onChange={(event) => updateRow(row.id, 'checkOut', event.target.value)}
                      placeholder="20:24"
                    />
                  </td>
                  <td className="border border-neutral-400 p-0">
                    <RowCellInput
                      type="number"
                      min="0"
                      value={row.beer}
                      onChange={(event) => updateRow(row.id, 'beer', Number(event.target.value))}
                    />
                  </td>
                  <td className="border border-neutral-400 p-0">
                    <RowCellInput
                      type="number"
                      min="0"
                      value={row.filteredWater}
                      onChange={(event) => updateRow(row.id, 'filteredWater', Number(event.target.value))}
                    />
                  </td>
                  <td className="border border-neutral-400 p-0">
                    <RowCellInput
                      type="number"
                      min="0"
                      value={row.softDrink}
                      onChange={(event) => updateRow(row.id, 'softDrink', Number(event.target.value))}
                    />
                  </td>
                  <td className="border border-neutral-400 px-3 py-2 text-right font-semibold">{formatMoney(row.drinkCost)}</td>
                  <td className="border border-neutral-400 px-3 py-2 text-right font-semibold">{formatMoney(row.roomCost)}</td>
                  <td className="border border-neutral-400 p-0">
                    <RowCellInput
                      type="number"
                      min="0"
                      value={row.extra}
                      onChange={(event) => updateRow(row.id, 'extra', Number(event.target.value))}
                    />
                  </td>
                  <td className="border border-neutral-400 px-3 py-2 text-right font-semibold">{formatMoney(row.totalCost)}</td>
                  <td className="border border-neutral-400 p-0">
                    <input
                      value={row.note}
                      onChange={(event) => updateRow(row.id, 'note', event.target.value)}
                      className="w-full border-0 bg-transparent px-2 py-2 text-sm outline-none"
                    />
                  </td>
                  <td className="border border-neutral-400 p-0">
                    <select
                      value={row.status}
                      onChange={(event) => updateRow(row.id, 'status', event.target.value)}
                      className="w-full border-0 bg-[#f5a04a] px-2 py-2 text-sm font-semibold text-black outline-none"
                    >
                      {statusOptions.map((status) => (
                        <option key={status || 'blank'} value={status}>
                          {status || ' '}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-xs text-neutral-500">
          Số dòng: {rows.length}
        </div>
      </div>
    </main>
  );
}
