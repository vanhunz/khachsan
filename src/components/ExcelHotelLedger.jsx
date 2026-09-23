import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Lock,
  Unlock,
  RotateCcw,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Banknote,
  CreditCard,
  TrendingUp,
  Info,
  Sparkles,
  ArrowUpDown,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import {
  calculateExcelRow,
  parseNoteColumn,
  detectExcelConflict,
  timeStringToDecimalHours,
  parseRoomSortValue,
  isExcelRowBlank,
  ensureFiveBlankRows,
  deduplicateExcelRows,
  sortExcelRows,
} from '../utils/excelParser';
export {
  parseRoomSortValue,
  isExcelRowBlank,
  ensureFiveBlankRows,
  deduplicateExcelRows,
  sortExcelRows,
};
import {
  hotelStore,
  getTodayDateString,
  formatCurrencyVND,
  formatNumber,
  sameEntityId,
} from '../services/hotelStore';

const STORAGE_KEY_EXCEL_ROWS = 'hotel_pos_excel_rows_v3';

// Clean initial state (0 mock data)
const INITIAL_EXCEL_ROWS = [];

export default function ExcelHotelLedger({
  onSyncWithMatrix,
  isInputLocked: propIsInputLocked,
  onToggleInputLock,
}) {
  const isInputLocked = propIsInputLocked !== undefined ? propIsInputLocked : hotelStore.isInputLocked();
  const isSyncingFromStoreRef = useRef(false);

  const [rows, setRows] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EXCEL_ROWS);
      let parsed = saved ? JSON.parse(saved) : [];

      if (!Array.isArray(parsed) || parsed.length === 0) {
        // Rebuild from existing bookings if available
        const rebuilt = hotelStore.rebuildExcelRowsFromBookings();
        if (rebuilt && rebuilt.length > 0) {
          parsed = rebuilt;
        }
      }

      if (Array.isArray(parsed) && parsed.length > 0) {
        // Deduplicate any duplicate active rows
        parsed = deduplicateExcelRows(parsed);

        // Ensure all currently active bookings are present in Excel without duplication
        const activeBookings = hotelStore.getBookings().filter((b) => b.status === 'active');
        activeBookings.forEach((ab) => {
          const roomStr = String(ab.room_number).trim();
          const matchIdx = parsed.findIndex(
            (r) =>
              !r.isDateSeparator &&
              (sameEntityId(r.bookingId, ab.id) ||
                (String(r.roomNumber).trim() === roomStr && (r.status === 'Đang ở' || r.status === 'Đã cọc')))
          );

          const checkInDate = new Date(ab.check_in || Date.now());
          const day = String(checkInDate.getDate()).padStart(2, '0');
          const month = String(checkInDate.getMonth() + 1).padStart(2, '0');
          const year = checkInDate.getFullYear();
          const dateStr = `${day}/${month}/${year}`;
          const checkInHHMM = `${String(checkInDate.getHours()).padStart(2, '0')}:${String(
            checkInDate.getMinutes()
          ).padStart(2, '0')}`;

          const rowData = {
            id: ab.id,
            bookingId: ab.id,
            date: dateStr,
            roomNumber: roomStr,
            roomType:
              ab.rental_type === 'overnight'
                ? 'Qua đêm'
                : ab.rental_type === 'daily'
                ? 'Ngày đêm'
                : 'Giờ',
            checkIn: checkInHHMM,
            checkOut: '',
            beer: ab.beer_qty || '',
            filteredWater: ab.water_qty || '',
            softDrink: ab.soft_drink_qty || '',
            waterAmount: ab.service_amount || 0,
            roomAmount: ab.room_amount || 0,
            extra: ab.surcharge_amount || 0,
            totalAmount: ab.total_amount || 0,
            note: ab.notes || '',
            depositAmount: Math.max(0, Number(ab.deposit_amount || 0), Number(ab.paid_amount || 0)),
            status: 'Đang ở',
            isDateSeparator: false,
          };

          if (matchIdx !== -1) {
            parsed[matchIdx] = {
              ...parsed[matchIdx],
              ...rowData,
              note: ab.notes || parsed[matchIdx].note || '',
            };
          } else {
            // Find if there's an empty template row for this room to populate
            const templateIdx = parsed.findIndex(
              (r) =>
                !r.isDateSeparator &&
                String(r.roomNumber).trim() === roomStr &&
                (!r.checkIn || !String(r.checkIn).trim())
            );

            if (templateIdx !== -1) {
              parsed[templateIdx] = { ...parsed[templateIdx], ...rowData };
            } else {
              parsed.push(rowData);
            }
          }
        });

        const completedBookingIds = new Set(
          hotelStore.getBookings().filter((b) => b.status === 'completed').map((b) => b.id)
        );
        const mapped = parsed.map((r) => {
          const hasRoom = Boolean(r.roomNumber && String(r.roomNumber).trim() !== '' && r.roomNumber !== '---');
          const cleanCheckIn = hasRoom ? (r.checkIn || '') : '';
          let rowStatus = r.status;
          let rowCheckOut = r.checkOut;
          let rowBookingId = r.bookingId;
          if (rowBookingId && completedBookingIds.has(rowBookingId) && (rowStatus === 'Đang ở' || rowStatus === 'Đã cọc')) {
            rowBookingId = null;
          }
          return calculateExcelRow({ ...r, bookingId: rowBookingId, checkIn: cleanCheckIn, status: rowStatus, checkOut: rowCheckOut }, new Date());
        });
        return ensureFiveBlankRows(sortExcelRows(deduplicateExcelRows(mapped)));
      }
    } catch (e) {
      console.error(e);
    }
    return ensureFiveBlankRows(
      INITIAL_EXCEL_ROWS.map((r) => {
        const hasRoom = Boolean(r.roomNumber && String(r.roomNumber).trim() !== '' && r.roomNumber !== '---');
        const cleanCheckIn = hasRoom ? (r.checkIn || '') : '';
        return calculateExcelRow({ ...r, checkIn: cleanCheckIn }, new Date());
      })
    );
  });

  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedCell, setSelectedCell] = useState({ rowIdx: 0, colKey: 'date' });
  const [filterDate, setFilterDate] = useState('');
  const tableRef = useRef(null);

  // Pagination & Modals
  const PAGE_SIZE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  // Split Payment Modal state
  const [splitModalRow, setSplitModalRow] = useState(null);
  const [splitTransferAmount, setSplitTransferAmount] = useState('');
  const [splitCustomNote, setSplitCustomNote] = useState('');

  // Note Confirmation Modal on Check Out
  const [noteConfirmRow, setNoteConfirmRow] = useState(null);

  // Update timer every 10s for reactive stay and buffer checks + 6:00 AM separator check
  useEffect(() => {
    const checkSixAmSeparator = () => {
      const now = new Date();
      if (now.getHours() >= 6) {
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const todayDateStr = `${day}/${month}/${year}`;

        setRows((prev) => {
          const hasSeparatorForToday = prev.some(
            (r) => r.isDateSeparator && r.date === todayDateStr
          );
          if (hasSeparatorForToday) return prev;

          const sepRow = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            date: todayDateStr,
            roomNumber: '---',
            roomType: 'Giờ',
            checkIn: '06:00',
            checkOut: '',
            beer: '',
            filteredWater: '',
            softDrink: '',
            waterAmount: 0,
            roomAmount: 0,
            extra: 0,
            totalAmount: 0,
            depositAmount: 0,
            note: `--- BẮT ĐẦU NGÀY MỚI (06:00 SÁNG ${todayDateStr}) ---`,
            status: 'Xong',
            isDateSeparator: true,
          };

          return sortExcelRows(ensureFiveBlankRows([...prev, sepRow], todayDateStr));
        });
      }
    };

    checkSixAmSeparator();
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      checkSixAmSeparator();
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Listen for sync from Room Matrix (excel-rows-synced)
  useEffect(() => {
    const handleExcelSynced = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_EXCEL_ROWS);
        if (saved) {
          let parsed = JSON.parse(saved);
          if (!Array.isArray(parsed)) return;

          const activeBookings = hotelStore.getBookings().filter((b) => b.status === 'active');
          const completedBookingIds = new Set(
            hotelStore.getBookings().filter((b) => b.status === 'completed').map((b) => b.id)
          );

          activeBookings.forEach((ab) => {
            const roomStr = String(ab.room_number).trim();
            const matchIdx = parsed.findIndex(
              (r) =>
                !r.isDateSeparator &&
                (sameEntityId(r.bookingId, ab.id) ||
                  (String(r.roomNumber).trim() === roomStr && (r.status === 'Đang ở' || r.status === 'Đã cọc')))
            );

            const checkInDate = new Date(ab.check_in || Date.now());
            const day = String(checkInDate.getDate()).padStart(2, '0');
            const month = String(checkInDate.getMonth() + 1).padStart(2, '0');
            const year = checkInDate.getFullYear();
            const dateStr = `${day}/${month}/${year}`;
            const checkInHHMM = `${String(checkInDate.getHours()).padStart(2, '0')}:${String(
              checkInDate.getMinutes()
            ).padStart(2, '0')}`;

            const rowData = {
              id: ab.id,
              bookingId: ab.id,
              date: dateStr,
              roomNumber: roomStr,
              roomType:
                ab.rental_type === 'overnight'
                  ? 'Qua đêm'
                  : ab.rental_type === 'daily'
                  ? 'Ngày đêm'
                  : 'Giờ',
              checkIn: checkInHHMM,
              checkOut: '',
              beer: ab.beer_qty || '',
              filteredWater: ab.water_qty || '',
              softDrink: ab.soft_drink_qty || '',
              waterAmount: ab.service_amount || 0,
              roomAmount: ab.room_amount || 0,
              extra: ab.surcharge_amount || 0,
              totalAmount: ab.total_amount || 0,
              note: ab.notes || '',
              depositAmount: Math.max(0, Number(ab.deposit_amount || 0), Number(ab.paid_amount || 0)),
              status: 'Đang ở',
              isDateSeparator: false,
            };

            if (matchIdx !== -1) {
              parsed[matchIdx] = {
                ...parsed[matchIdx],
                ...rowData,
                note: ab.notes || parsed[matchIdx].note || '',
              };
            } else {
              const templateIdx = parsed.findIndex(
                (r) =>
                  !r.isDateSeparator &&
                  String(r.roomNumber).trim() === roomStr &&
                  (!r.checkIn || !String(r.checkIn).trim())
              );

              if (templateIdx !== -1) {
                parsed[templateIdx] = { ...parsed[templateIdx], ...rowData };
              } else {
                parsed.push(rowData);
              }
            }
          });

          const sanitized = parsed.map((r) => {
            const hasRoom = Boolean(r.roomNumber && String(r.roomNumber).trim() !== '' && r.roomNumber !== '---');
            const cleanCheckIn = hasRoom ? (r.checkIn || '') : '';
            let rowStatus = r.status;
            let rowCheckOut = r.checkOut;
            let rowBookingId = r.bookingId;
            if (rowBookingId && completedBookingIds.has(rowBookingId) && (rowStatus === 'Đang ở' || rowStatus === 'Đã cọc')) {
              rowBookingId = null;
            }
            return calculateExcelRow({ ...r, bookingId: rowBookingId, checkIn: cleanCheckIn, status: rowStatus, checkOut: rowCheckOut }, new Date());
          });

          isSyncingFromStoreRef.current = true;
          setRows(ensureFiveBlankRows(sortExcelRows(deduplicateExcelRows(sanitized))));
        }
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener('excel-rows-synced', handleExcelSynced);
    return () => {
      window.removeEventListener('excel-rows-synced', handleExcelSynced);
    };
  }, []);

  // Save rows on change & sync to hotelStore
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_EXCEL_ROWS, JSON.stringify(rows));
      if (isSyncingFromStoreRef.current) {
        isSyncingFromStoreRef.current = false;
        return;
      }
      hotelStore.syncFromExcelRows(rows);
    } catch (e) {
      console.error(e);
    }
  }, [rows]);

  // Set check-out time (without auto-closing / leaves status editable for manual Chốt)
  const handleSetCheckOutTime = useCallback((rowId) => {
    setRows((currentRows) => {
      const idx = currentRows.findIndex((r) => r.id === rowId);
      if (idx === -1) return currentRows;
      const r = currentRows[idx];
      if (r.isDateSeparator || r.status === 'Xong') return currentRows;

      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const nowHHMM = `${hh}:${mm}`;

      const updated = calculateExcelRow(
        {
          ...r,
          checkOut: nowHHMM,
          // Remains 'Đang ở' until user manually clicks 'Xong' / 'Chốt'
        },
        now
      );

      const nextRows = [...currentRows];
      nextRows[idx] = updated;
      return nextRows;
    });
  }, []);

  // Finalize payment manually (Chốt phòng xong)
  const handleFinalizePayment = useCallback((rowId) => {
    setRows((currentRows) => {
      const idx = currentRows.findIndex((r) => r.id === rowId);
      if (idx === -1) return currentRows;
      const r = currentRows[idx];
      if (r.isDateSeparator) return currentRows;

      let outTime = r.checkOut;
      const now = new Date();
      if (!outTime || String(outTime).trim() === '') {
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        outTime = `${hh}:${mm}`;
      }

      const updated = calculateExcelRow(
        {
          ...r,
          checkOut: outTime,
          status: 'Xong',
        },
        now
      );

      const nextRows = [...currentRows];
      nextRows[idx] = updated;
      return ensureFiveBlankRows(nextRows, r.date);
    });
  }, []);

  // Request Finalize Payment (checks for notes first)
  const requestFinalizePayment = useCallback((row) => {
    const existingNote = (row.note || '').trim();
    if (existingNote !== '') {
      setNoteConfirmRow(row);
    } else {
      handleFinalizePayment(row.id);
    }
  }, [handleFinalizePayment]);

  // Open Split Payment Modal for a row
  const handleOpenSplitModal = useCallback((row) => {
    const tot = Number(row.totalAmount) || 0;
    const parsed = parseNoteColumn(row.note, tot, row.depositAmount);
    setSplitModalRow(row);
    setSplitTransferAmount(parsed.transferAmount > 0 ? String(parsed.transferAmount) : String(Math.round(tot / 2)));
    setSplitCustomNote(row.note ? row.note.replace(/ck\s*\d+\w*/gi, '').replace(/tm\s*\d+\w*/gi, '').replace(/\|/g, '').trim() : '');
  }, []);

  // Recalculate row helper with duplicate active room check & auto-jump for Ngày đêm
  const handleUpdateRow = useCallback((id, updater) => {
    setRows((currentRows) => {
      const idx = currentRows.findIndex((r) => r.id === id);
      if (idx === -1) return currentRows;

      const r = currentRows[idx];
      let updated = typeof updater === 'function' ? updater(r) : { ...r, ...updater };

      // Auto default for "Ngày đêm" -> check-in starts at 12:00
      if (updated.roomType === 'Ngày đêm' && (!updated.checkIn || updated.checkIn.trim() === '')) {
        updated.checkIn = '12:00';
      }

      const calculated = calculateExcelRow(updated, new Date());
      const nextRows = [...currentRows];
      nextRows[idx] = calculated;

      return ensureFiveBlankRows(nextRows, calculated.date);
    });
  }, []);

  // Confirm Split Payment from Modal
  const handleConfirmSplitModal = useCallback(() => {
    if (!splitModalRow) return;
    const tot = Number(splitModalRow.totalAmount) || 0;
    const ckNum = Number(splitTransferAmount) || 0;
    const tmNum = Math.max(0, tot - ckNum);

    let noteParts = [];
    if (ckNum > 0) {
      noteParts.push(`ck${Math.round(ckNum / 1000)}k`);
    }
    if (tmNum > 0 && ckNum > 0) {
      noteParts.push(`tm${Math.round(tmNum / 1000)}k`);
    }
    if (splitCustomNote && splitCustomNote.trim()) {
      noteParts.push(splitCustomNote.trim());
    }
    const finalNote = noteParts.join(' ');

    handleUpdateRow(splitModalRow.id, {
      paymentMethod: 'split',
      note: finalNote,
    });
    setSplitModalRow(null);
  }, [splitModalRow, splitTransferAmount, splitCustomNote, handleUpdateRow]);

  // Toggle unlock for a paid row with user confirmation
  const handleToggleUnlock = useCallback((rowId) => {
    setRows((currentRows) => {
      const idx = currentRows.findIndex((r) => r.id === rowId);
      if (idx === -1) return currentRows;
      const r = currentRows[idx];
      if (r.status === 'Xong') {
        if (window.confirm(`Dòng phòng ${r.roomNumber || ''} đã thanh toán xong. Bạn có chắc chắn muốn mở khóa để chỉnh sửa lại không?`)) {
          const nextRows = [...currentRows];
          nextRows[idx] = calculateExcelRow({ ...r, status: 'Đang ở' }, new Date());
          return nextRows;
        }
      }
      return currentRows;
    });
  }, []);

  // Add new data row (F2 / Button)
  const handleAddRow = () => {
    if (isInputLocked) {
      alert('⚠️ Bảng tính đang ở chế độ KHÓA - không cho nhập thêm dòng!');
      return;
    }
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const dateStr = `${day}/${month}/${year}`;

    const newRow = calculateExcelRow({
      id: Date.now() + Math.floor(Math.random() * 1000),
      date: dateStr,
      roomNumber: '',
      roomType: 'Giờ',
      checkIn: '',
      checkOut: '',
      beer: '',
      filteredWater: '',
      softDrink: '',
      waterAmount: 0,
      roomAmount: 0,
      extra: 0,
      totalAmount: 0,
      depositAmount: 0,
      note: '',
      status: 'Đang ở',
      isDateSeparator: false,
    });

    setRows((prev) => {
      const updated = ensureFiveBlankRows([...prev, newRow], dateStr);
      const nextTotalPages = Math.max(1, Math.ceil(updated.length / PAGE_SIZE));
      setCurrentPage(nextTotalPages);
      return updated;
    });
  };

  // Add blue date separator row (6h sáng)
  const handleAddSeparatorRow = () => {
    if (isInputLocked) {
      alert('⚠️ Bảng tính đang ở chế độ KHÓA - không cho thêm dòng phân cách!');
      return;
    }
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const dateStr = `${day}/${month}/${year}`;

    const sepRow = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      date: dateStr,
      roomNumber: '---',
      roomType: 'Giờ',
      checkIn: '06:00',
      checkOut: '',
      beer: '',
      filteredWater: '',
      softDrink: '',
      waterAmount: 0,
      roomAmount: 0,
      extra: 0,
      totalAmount: 0,
      depositAmount: 0,
      note: `--- BẮT ĐẦU NGÀY MỚI (06:00 SÁNG ${dateStr}) ---`,
      status: 'Xong',
      isDateSeparator: true,
    };

    setRows((prev) => {
      return ensureFiveBlankRows(sortExcelRows([...prev, sepRow]), dateStr);
    });
  };

  const handleDeleteRow = (id) => {
    const targetRow = rows.find((r) => r.id === id);
    if (!targetRow) return;

    const hasData = targetRow.roomNumber || targetRow.totalAmount > 0 || targetRow.checkIn || targetRow.note;

    if (window.confirm(`Bạn có chắc muốn xóa dòng này${targetRow.roomNumber ? ` (Phòng P.${targetRow.roomNumber})` : ''}?`)) {
      if (hasData) {
        hotelStore.addAuditLog({
          action: 'Xóa phòng / Hủy dòng',
          details: `Đã xóa dòng Phòng P.${targetRow.roomNumber || '---'} (Ngày: ${targetRow.date || '---'}, Vào: ${targetRow.checkIn || '---'}, Ra: ${targetRow.checkOut || '---'}, Tiền đã tính: ${formatCurrencyVND(targetRow.totalAmount || 0)}, Trạng thái: ${targetRow.status || '---'}, Ghi chú: ${targetRow.note || '---'})`,
          user: 'Lễ tân / Thu ngân',
          severity: 'danger',
        });
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const handleSortRooms = () => {
    setRows((prev) => sortExcelRows(prev));
  };

  const handleCreateDaily11Rooms = () => {
    if (isInputLocked) {
      alert('⚠️ Bảng tính đang ở chế độ KHÓA - không cho tạo thêm phòng!');
      return;
    }
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const dateStr = `${day}/${month}/${year}`;

    const defaultRoomNumbers = ['101', '102', '103', '104', '201', '202', '203', '204', '301', '302', '303'];

    setRows((prev) => {
      // Find room numbers that are already active ('Đang ở' or 'Đã cọc')
      const existingRooms = new Set(
        prev
          .filter((r) => !r.isDateSeparator && (r.status === 'Đang ở' || r.status === 'Đã cọc') && r.roomNumber)
          .map((r) => String(r.roomNumber).trim())
      );

      const missingRooms = defaultRoomNumbers.filter((rNum) => !existingRooms.has(rNum));

      if (missingRooms.length === 0) {
        alert('Tất cả 11 phòng đã có trong bảng tính!');
        return prev;
      }

      const newRows = missingRooms.map((roomNum, idx) =>
        calculateExcelRow(
          {
            id: Date.now() + idx,
            date: dateStr,
            roomNumber: roomNum,
            roomType: 'Giờ',
            checkIn: '',
            checkOut: '',
            beer: '',
            filteredWater: '',
            softDrink: '',
            waterAmount: 0,
            roomAmount: 0,
            extra: 0,
            totalAmount: 0,
            depositAmount: 0,
            note: '',
            status: 'Đang ở',
            isDateSeparator: false,
          },
          now
        )
      );

      return ensureFiveBlankRows(sortExcelRows(deduplicateExcelRows([...prev, ...newRows])), dateStr);
    });
  };

  const handleClearExcelTable = () => {
    if (window.confirm('Bạn có chắc chắn muốn XÓA SẠCH toàn bộ dữ liệu bảng tính Excel không?')) {
      const activeDataCount = rows.filter((r) => !r.isDateSeparator && (r.roomNumber || r.totalAmount > 0)).length;
      if (activeDataCount > 0) {
        hotelStore.addAuditLog({
          action: 'Xóa sạch bảng Excel',
          details: `Người dùng đã bấm xóa sạch toàn bộ bảng tính Excel (${activeDataCount} dòng có dữ liệu phòng bị xóa)`,
          user: 'Lễ tân / Thu ngân',
          severity: 'danger',
        });
      }
      setRows([]);
      localStorage.removeItem(STORAGE_KEY_EXCEL_ROWS);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('excel-rows-synced', { detail: { rows: [] } }));
      }
    }
  };

  const handleResetDefault = () => {
    if (window.confirm('Xóa sạch bảng tính hiện tại?')) {
      handleClearExcelTable();
    }
  };

  // Keyboard navigation & Shortcuts (Tab, Enter, F2, Arrows)
  const columnsList = [
    'date',
    'roomNumber',
    'roomType',
    'checkIn',
    'checkOut',
    'beer',
    'filteredWater',
    'softDrink',
    'waterAmount',
    'roomAmount',
    'extra',
    'totalAmount',
    'depositAmount',
    'paymentMethod',
    'note',
    'status',
  ];

  const handleKeyDown = (e, rowIdx, colKey) => {
    if (e.key === 'F2') {
      e.preventDefault();
      handleAddRow();
      return;
    }

    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleAddRow();
      return;
    }

    const colIdx = columnsList.indexOf(colKey);

    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        // move left
        const nextCol = colIdx > 0 ? columnsList[colIdx - 1] : columnsList[columnsList.length - 1];
        const nextRow = colIdx === 0 && rowIdx > 0 ? rowIdx - 1 : rowIdx;
        setSelectedCell({ rowIdx: nextRow, colKey: nextCol });
        if (nextRow < startIndex) {
          setCurrentPage(Math.max(1, currentPage - 1));
        }
      } else {
        // move right
        if (colIdx < columnsList.length - 1) {
          setSelectedCell({ rowIdx, colKey: columnsList[colIdx + 1] });
        } else {
          // Last column of row
          if (rowIdx < rows.length - 1) {
            setSelectedCell({ rowIdx: rowIdx + 1, colKey: columnsList[0] });
            if (rowIdx + 1 >= endIndex) {
              setCurrentPage((p) => Math.min(totalPages, p + 1));
            }
          } else {
            // Last column of last row -> Append new row!
            handleAddRow();
            setSelectedCell({ rowIdx: rowIdx + 1, colKey: 'roomNumber' });
          }
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (rowIdx < rows.length - 1) {
        setSelectedCell({ rowIdx: rowIdx + 1, colKey });
        if (rowIdx + 1 >= endIndex) {
          setCurrentPage((p) => Math.min(totalPages, p + 1));
        }
      } else {
        handleAddRow();
        setSelectedCell({ rowIdx: rowIdx + 1, colKey: 'roomNumber' });
      }
    }
  };

  // Filtered rows
  const displayRows = useMemo(() => {
    if (!filterDate) return rows;
    return rows.filter((r) => r.isDateSeparator || r.date === filterDate);
  }, [rows, filterDate]);

  const totalPages = Math.max(1, Math.ceil(displayRows.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, displayRows.length);
  const paginatedRows = useMemo(() => {
    return displayRows.slice(startIndex, endIndex);
  }, [displayRows, startIndex, endIndex]);

  // Aggregate Settlement Calculations strictly according to SRS Section 6
  const settlementSummary = useMemo(() => {
    let totalRevenue = 0; // Sum of Column L where status = 'Xong'
    let totalTransfer = 0; // Sum of transfer parsed from Column M
    let totalCashRefund = 0; // Sum of cash refunds from overpayments
    let totalCashNet = 0; // Net cash in drawer
    let totalDepositCollected = 0; // Sum of all advance deposits collected

    let completedCount = 0;
    let activeCount = 0;
    let reservedCount = 0;
    let depositCount = 0;
    let cashCount = 0;
    let transferCount = 0;

    for (const r of displayRows) {
      if (r.isDateSeparator) continue;

      const depAmt = Math.max(0, Number(r.depositAmount) || 0);
      if (depAmt > 0) {
        totalDepositCollected += depAmt;
        depositCount++;
      }

      if (r.status === 'Xong') {
        completedCount++;
        const tot = Number(r.totalAmount || 0);
        totalRevenue += tot;

        const parsed = parseNoteColumn(r.note, tot, depAmt);
        totalTransfer += parsed.transferAmount;
        totalCashRefund += parsed.cashRefund;
        totalCashNet += parsed.netCash;

        if (parsed.transferAmount > 0 && parsed.cashAmount === 0) {
          transferCount++;
        } else {
          cashCount++;
        }
      } else if (r.status === 'Đang ở') {
        activeCount++;
        // Account for advance deposits on active stays
        if (depAmt > 0) {
          const parsed = parseNoteColumn(r.note, 0, depAmt);
          if (parsed.isDeposit) {
            totalTransfer += parsed.transferAmount;
            totalCashNet += parsed.cashAmount;
          }
        }
      } else if (r.status === 'Đã cọc') {
        reservedCount++;
        const parsed = parseNoteColumn(r.note, 0, depAmt);
        if (parsed.isDeposit) {
          totalTransfer += parsed.transferAmount;
          totalCashNet += parsed.cashAmount;
        }
      }
    }

    return {
      totalRevenue,
      totalDepositCollected,
      totalTransfer,
      totalCashRefund,
      totalCashNet,
      completedCount,
      activeCount,
      reservedCount,
      depositCount,
      cashCount,
      transferCount,
    };
  }, [displayRows]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Ngày (A)',
      'Phòng (B)',
      'Loại phòng (C)',
      'Giờ vào (D)',
      'Giờ ra (E)',
      'Bia (F)',
      'Suối (G)',
      'Nước ngọt (H)',
      'Tiền nước (I)',
      'Tiền phòng (J)',
      'Phụ thu (K)',
      'Tổng tiền (L)',
      'Thu Trước / Cọc',
      'HT Thanh Toán',
      'Ghi chú (M)',
      'Trạng Thái (N)',
    ];

    const lines = rows.map((r) => {
      const parsedPay = parseNoteColumn(r.note, r.totalAmount, r.depositAmount);
      const payLabel =
        r.paymentMethod === 'transfer' || parsedPay.paymentMethod === 'transfer'
          ? 'Chuyển khoản'
          : r.paymentMethod === 'split' || parsedPay.paymentMethod === 'split'
          ? 'Hỗn hợp'
          : 'Tiền mặt';

      return [
        r.date || '',
        r.roomNumber || '',
        r.roomType || '',
        r.checkIn || '',
        r.checkOut || '',
        r.beer || '',
        r.filteredWater || '',
        r.softDrink || '',
        r.waterAmount || 0,
        r.roomAmount || 0,
        r.extra || 0,
        r.totalAmount || 0,
        r.depositAmount || 0,
        payLabel,
        `"${(r.note || '').replace(/"/g, '""')}"`,
        r.status || '',
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...lines.map((l) => l.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bang_tinh_khach_san_Excel_${getTodayDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-white p-3 border border-slate-300 shadow-xs">
        {/* Left: Brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-xs">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black tracking-tight text-slate-900 uppercase">
                Bảng Tính Nhà Nghỉ Thủy Tiên
              </h2>
              <span className="rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 border border-emerald-200">
                Excel POS • by vanhunz
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Nhập tay tức thời, tự tính giờ & minibar, tự nhảy dòng mới
            </p>
          </div>
        </div>

        {/* Center: Master Input Lock Button */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={onToggleInputLock || (() => hotelStore.toggleInputLocked())}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition active:scale-95 shadow-xs ${
              isInputLocked
                ? 'bg-rose-600 text-white hover:bg-rose-700 animate-pulse border border-rose-400'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-400'
            }`}
            title={
              isInputLocked
                ? 'Bảng tính đang KHÓA (Không cho nhập thêm). Nhấp để Mở Khóa'
                : 'Bảng tính đang MỞ. Nhấp để Khóa không cho nhập thêm'
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
        </div>

        {/* Right: Excel Actions */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleSortRooms}
            className="flex items-center gap-1 rounded-lg border border-indigo-300 bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-800 hover:bg-indigo-100 active:scale-95 transition"
            title="Sắp xếp danh sách phòng từ trên xuống dưới (101 -> 303)"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-indigo-700" />
            <span>Sắp Xếp (101 ➔ 303)</span>
          </button>

          <button
            type="button"
            onClick={handleCreateDaily11Rooms}
            className="flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 active:scale-95 transition"
            title="Tự động tạo 11 dòng tương ứng 11 phòng sạch cho hôm nay (101-303)"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            <span>+ 11 Phòng Hôm Nay</span>
          </button>

          <button
            type="button"
            onClick={handleAddRow}
            className="flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 active:scale-95 transition"
            title="Thêm hàng mới (Phím tắt: F2 hoặc Ctrl+Enter)"
          >
            <Plus className="h-4 w-4" />
            <span>+ Thêm Dòng (F2)</span>
          </button>

          <button
            type="button"
            onClick={handleAddSeparatorRow}
            className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            title="Thêm dòng phân cách ngày màu trắng"
          >
            <span className="h-3 w-3 rounded-full border border-slate-400 bg-white inline-block mr-1" />
            <span>+ Phân Cách</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <Download className="h-3.5 w-3.5 text-emerald-600" />
            <span>Xuất Excel</span>
          </button>

          <button
            type="button"
            onClick={handleClearExcelTable}
            className="flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-2 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 active:scale-95 transition"
            title="Xóa toàn bộ dữ liệu trong bảng tính Excel"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
            <span>Xóa Bảng</span>
          </button>
        </div>
      </div>

      {/* Pagination Controls (Top) */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-slate-100 rounded-xl border border-slate-300 text-xs font-bold shadow-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <span>
              Hiển thị dòng <strong className="text-slate-900 font-mono">{startIndex + 1} - {endIndex}</strong> / Tổng <strong className="text-slate-900 font-mono">{displayRows.length}</strong> dòng
            </span>
            <span className="text-[11px] font-normal text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
              20 dòng / trang
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Trang trước</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  className={`h-7 min-w-[28px] px-1.5 rounded-lg text-xs font-black transition ${
                    currentPage === p
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <span>Trang sau</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* PIXEL-PERFECT EXCEL SPREADSHEET TABLE */}
      <div className="overflow-x-auto rounded-xl border border-black shadow-md bg-white">
        <table
          ref={tableRef}
          className="w-full border-collapse select-none"
          style={{
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            fontSize: '13px',
            border: '1px solid #000000',
            borderCollapse: 'collapse',
          }}
        >
          {/* EXCEL HEADER A -> N */}
          <thead>
            <tr style={{ height: '30px' }}>
              {/* STT / Action Header */}
              <th
                style={{
                  background: '#B8CCE4',
                  border: '1px solid #000000',
                  color: '#000000',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  width: '28px',
                  minWidth: '28px',
                  fontSize: '11px',
                  padding: '2px',
                }}
              >
                #
              </th>

              {/* A. Ngày */}
              <th
                style={{
                  background: '#B8CCE4',
                  border: '1px solid #000000',
                  color: '#000000',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  width: '80px',
                  minWidth: '78px',
                  fontSize: '11px',
                  padding: '3px 2px',
                }}
              >
                Ngày (A)
              </th>

              {/* B. Phòng */}
              <th
                style={{
                  background: '#B8CCE4',
                  border: '1px solid #000000',
                  color: '#000000',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  width: '50px',
                  minWidth: '48px',
                  fontSize: '11px',
                  padding: '3px 2px',
                }}
              >
                Phòng (B)
              </th>

              {/* C. Loại phòng */}
              <th
                style={{
                  background: '#B8CCE4',
                  border: '1px solid #000000',
                  color: '#000000',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  width: '75px',
                  minWidth: '72px',
                  fontSize: '11px',
                  padding: '3px 2px',
                }}
              >
                Loại phòng (C)
              </th>

              {/* D. Giờ vào */}
              <th
                style={{
                  background: '#B8CCE4',
                  border: '1px solid #000000',
                  color: '#000000',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  width: '58px',
                  minWidth: '54px',
                  fontSize: '11px',
                  padding: '3px 2px',
                }}
              >
                Giờ vào (D)
              </th>

              {/* E. Giờ ra */}
              <th
                style={{
                  background: '#B8CCE4',
                  border: '1px solid #000000',
                  color: '#000000',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  width: '105px',
                  minWidth: '95px',
                  fontSize: '11px',
                  padding: '3px 2px',
                }}
              >
                Giờ ra (E)
              </th>

              {/* F. Bia */}
              <th
                style={{
                  background: '#B8CCE4',
                  border: '1px solid #000000',
                  color: '#000000',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  width: '34px',
                  minWidth: '32px',
                  fontSize: '11px',
                  padding: '3px 2px',
                }}
                title="Bia (20.000 đ/lon)"
              >
                Bia (F)
              </th>

              {/* G. Suối */}
              <th
                style={{
                  background: '#B8CCE4',
                  border: '1px solid #000000',
                  color: '#000000',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  width: '34px',
                  minWidth: '32px',
                  fontSize: '11px',
                  padding: '3px 2px',
                }}
                title="Nước suối (10.000 đ/chai)"
              >
                Suối (G)
              </th>

              {/* H. Nước ngọt */}
              <th
                style={{
                  background: '#B8CCE4',
                  border: '1px solid #000000',
                  color: '#000000',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  width: '38px',
                  minWidth: '35px',
                  fontSize: '11px',
                  padding: '3px 2px',
                }}
                title="Nước ngọt (15.000 đ/lon)"
              >
                N.ngọt (H)
              </th>

              {/* I. Tiền nước */}
              <th
                style={{
                  background: '#B8CCE4',
                  border: '1px solid #000000',
                  color: '#000000',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  width: '70px',
                  minWidth: '65px',
                  fontSize: '11px',
                  padding: '3px 2px',
                }}
              >
                Tiền nước (I)
              </th>

              {/* J. Tiền phòng */}
              <th
                style={{
                  background: '#B8CCE4',
                  border: '1px solid #000000',
                  color: '#000000',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  width: '78px',
                  minWidth: '72px',
                  fontSize: '11px',
                  padding: '3px 2px',
                }}
              >
                Tiền phòng (J)
              </th>

              {/* K. Phụ thu */}
              <th
                style={{
                  background: '#B8CCE4',
                  border: '1px solid #000000',
                  color: '#000000',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  width: '60px',
                  minWidth: '55px',
                  fontSize: '11px',
                  padding: '3px 2px',
                }}
              >
                Phụ thu (K)
              </th>

              {/* L. Tổng tiền */}
              <th
                style={{
                  background: '#B8CCE4',
                  border: '1px solid #000000',
                  color: '#000000',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  width: '82px',
                  minWidth: '78px',
                  fontSize: '11px',
                  padding: '3px 2px',
                }}
              >
                Tổng tiền (L)
              </th>

              {/* Thu Trước / Cọc */}
              <th
                style={{
                  background: '#B8CCE4',
                  border: '1px solid #000000',
                  color: '#000000',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  width: '82px',
                  minWidth: '74px',
                  fontSize: '11px',
                  padding: '3px 2px',
                }}
                title="Tiền đã thu trước hoặc tiền đặt cọc giữ phòng"
              >
                Thu Trước / Cọc
              </th>

              {/* HT Thanh toán (TM / CK) */}
              <th
                style={{
                  background: '#B8CCE4',
                  border: '1px solid #000000',
                  color: '#000000',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  width: '82px',
                  minWidth: '78px',
                  fontSize: '11px',
                  padding: '3px 2px',
                }}
                title="Phân biệt Tiền Mặt (TM) hoặc Chuyển Khoản (CK)"
              >
                HT Thanh Toán
              </th>

              {/* M. Ghi chú */}
              <th
                style={{
                  background: '#B8CCE4',
                  border: '1px solid #000000',
                  color: '#000000',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  width: '120px',
                  minWidth: '95px',
                  fontSize: '11px',
                  padding: '3px 2px',
                }}
              >
                Ghi chú (M)
              </th>

              {/* N. Trạng Thái */}
              <th
                style={{
                  background: '#F2B280', // Peach header according to SRS
                  border: '1px solid #000000',
                  color: '#000000',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  width: '78px',
                  minWidth: '70px',
                  fontSize: '11px',
                  padding: '3px 2px',
                }}
              >
                Trạng Thái (N)
              </th>

              {/* Actions col */}
              <th
                style={{
                  background: '#B8CCE4',
                  border: '1px solid #000000',
                  color: '#000000',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  width: '28px',
                  minWidth: '28px',
                  fontSize: '11px',
                  padding: '2px',
                }}
              >
                ✕
              </th>
            </tr>
          </thead>

          {/* EXCEL DATA ROWS */}
          <tbody>
            {displayRows.length === 0 ? (
              <tr>
                <td colSpan={17} className="text-center py-10 bg-slate-50 border border-slate-300">
                  <div className="flex flex-col items-center justify-center gap-2 py-4">
                    <FileSpreadsheet className="h-8 w-8 text-slate-400" />
                    <div className="text-xs font-bold text-slate-700">
                      Bảng tính Excel POS đang trống (0 dòng)
                    </div>
                    <p className="text-[11px] text-slate-500 max-w-sm">
                      Nhấn vào nút bên dưới để tạo ngay 11 phòng cho hôm nay (từ 101 ➔ 303) hoặc bấm "Thêm Dòng" để nhập thủ công.
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={handleCreateDaily11Rooms}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Khởi Tạo 11 Phòng Hôm Nay (101 ➔ 303)</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAddRow}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>+ Thêm Dòng (F2)</span>
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, indexOnPage) => {
              const rowIdx = startIndex + indexOnPage;
              const conflict = detectExcelConflict(row, rows, currentTime);
              const isDuplicateActive = Boolean(
                row.roomNumber &&
                String(row.roomNumber).trim() !== '' &&
                row.roomNumber !== '---' &&
                row.roomNumber.toUpperCase() !== 'CHI' &&
                row.roomNumber.toUpperCase() !== 'LẺ' &&
                (row.status === 'Đang ở' || row.status === 'Đã cọc') &&
                rows.some(
                  (other) =>
                    other.id !== row.id &&
                    !other.isDateSeparator &&
                    (other.status === 'Đang ở' || other.status === 'Đã cọc') &&
                    String(other.roomNumber).trim() === String(row.roomNumber).trim()
                )
              );
              const isWarningRow = isDuplicateActive || (conflict.hasConflict && (conflict.isWarning || conflict.isCritical));

              // Status flags
              const isExpenseRow = row.isExpense || row.roomNumber === 'CHI' || row.roomType === 'Phiếu Chi';
              const isPaid = !row.isDateSeparator && (row.status === 'Xong' || isExpenseRow);

              // Payment method parsing
              const parsedPayment = parseNoteColumn(row.note, row.totalAmount);
              const currentPayMethod =
                row.paymentMethod ||
                (parsedPayment.paymentMethod === 'transfer'
                  ? 'transfer'
                  : parsedPayment.paymentMethod === 'split' || parsedPayment.paymentMethod === 'split_refund'
                  ? 'split'
                  : 'cash');

              // Row background color:
              // Blue for 6h date separator, soft rose for expenses, yellow for paid/closed, white for pending
              const rowBgColor = row.isDateSeparator
                ? '#2563EB'
                : isExpenseRow
                ? '#FFE4E6'
                : isPaid
                ? '#FFFF00'
                : '#FFFFFF';
              const colNBgColor = rowBgColor;

              return (
                <tr
                  key={row.id}
                  style={{
                    height: '28px',
                    backgroundColor: rowBgColor,
                  }}
                  className={isWarningRow ? 'animate-pulse' : ''}
                >
                  {/* STT */}
                  <td
                    style={{
                      border: '1px solid #000000',
                      textAlign: 'center',
                      color: row.isDateSeparator ? '#FFFFFF' : isPaid ? '#000000' : '#666666',
                      fontSize: '11px',
                      fontWeight: row.isDateSeparator || isPaid ? 'bold' : 'normal',
                      background: rowBgColor,
                    }}
                    title={row.isDateSeparator ? 'Phân cách ngày mới' : isExpenseRow ? 'Phiếu chi quỹ' : isPaid ? 'Đã thanh toán (Đã khóa)' : 'Chưa thanh toán'}
                  >
                    {row.isDateSeparator ? (
                      <span className="flex items-center justify-center font-black text-white text-xs" title="Phân cách ngày 6h sáng">
                        📅 {rowIdx + 1}
                      </span>
                    ) : isExpenseRow ? (
                      <span className="flex items-center justify-center gap-0.5 text-rose-700 font-bold" title="Phiếu Chi">
                        <span>💸</span>
                        <span>{rowIdx + 1}</span>
                      </span>
                    ) : isPaid ? (
                      <span className="flex items-center justify-center gap-0.5" title="Đã thanh toán (Khóa)">
                        <Lock className="h-3 w-3 text-slate-900 inline" />
                        <span>{rowIdx + 1}</span>
                      </span>
                    ) : (
                      rowIdx + 1
                    )}
                  </td>

                  {/* A. Ngày */}
                  <td style={{ border: '1px solid #000000', padding: 0, background: rowBgColor }}>
                    {row.isDateSeparator ? (
                      <span className="block text-center font-black text-xs text-white">
                        {row.date}
                      </span>
                    ) : (
                      <input
                        type="text"
                        value={row.date || ''}
                        readOnly={isInputLocked}
                        onChange={(e) => handleUpdateRow(row.id, { date: e.target.value })}
                        onKeyDown={(e) => handleKeyDown(e, rowIdx, 'date')}
                        style={{
                          width: '100%',
                          height: '100%',
                          background: 'transparent',
                          border: 'none',
                          textAlign: 'center',
                          fontWeight: isPaid ? 'bold' : 'normal',
                          outline: 'none',
                          color: '#000000',
                          fontSize: '13px',
                          cursor: isInputLocked ? 'not-allowed' : 'text',
                        }}
                      />
                    )}
                  </td>

                  {/* B. Phòng (with conflict highlight) */}
                  <td
                    style={{
                      border: isWarningRow ? '2px solid #DC2626' : '1px solid #000000',
                      background: isWarningRow ? '#FEE2E2' : rowBgColor,
                      padding: 0,
                    }}
                  >
                    {row.isDateSeparator ? (
                      <span className="block text-center text-blue-200 font-bold text-xs">---</span>
                    ) : isExpenseRow ? (
                      <div className="flex items-center justify-center font-bold text-xs text-rose-800 uppercase px-1">
                        💸 CHI
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder=""
                        value={row.roomNumber || ''}
                        readOnly={isInputLocked}
                        title={isDuplicateActive ? `⚠️ Phòng ${row.roomNumber} hiện đang có phòng "Đang ở" khác chưa thanh toán / chốt!` : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleUpdateRow(row.id, (prev) => {
                            const hasRoom = val && val.trim() !== '' && val !== '---';
                            let newCheckIn = prev.checkIn;
                            // "giờ vào là tính khi gõ số phòng"
                            if (hasRoom && (!newCheckIn || newCheckIn.trim() === '')) {
                              const now = new Date();
                              const hh = String(now.getHours()).padStart(2, '0');
                              const mm = String(now.getMinutes()).padStart(2, '0');
                              newCheckIn = `${hh}:${mm}`;
                            } else if (!hasRoom && (!prev.checkOut || prev.checkOut.trim() === '')) {
                              newCheckIn = '';
                            }
                            return {
                              ...prev,
                              roomNumber: val,
                              checkIn: newCheckIn,
                            };
                          });
                        }}
                        onKeyDown={(e) => handleKeyDown(e, rowIdx, 'roomNumber')}
                        style={{
                          width: '100%',
                          height: '100%',
                          background: 'transparent',
                          border: 'none',
                          textAlign: 'center',
                          fontWeight: 'bold',
                          outline: 'none',
                          color: isWarningRow ? '#B91C1C' : '#000000',
                          fontSize: '13px',
                          cursor: isInputLocked ? 'not-allowed' : 'text',
                        }}
                      />
                    )}
                  </td>

                  {/* C. Loại phòng */}
                  <td style={{ border: '1px solid #000000', padding: 0, background: rowBgColor }}>
                    {row.isDateSeparator ? (
                      <span className="block text-center text-blue-200 font-bold text-xs">---</span>
                    ) : isExpenseRow ? (
                      <span className="block text-center text-xs font-bold text-rose-800">
                        Phiếu Chi
                      </span>
                    ) : (
                      <select
                        value={row.roomType || 'Giờ'}
                        disabled={isInputLocked}
                        onChange={(e) => handleUpdateRow(row.id, { roomType: e.target.value })}
                        onKeyDown={(e) => handleKeyDown(e, rowIdx, 'roomType')}
                        style={{
                          width: '100%',
                          height: '100%',
                          background: 'transparent',
                          border: 'none',
                          textAlign: 'center',
                          outline: 'none',
                          color: '#000000',
                          fontSize: '13px',
                          fontWeight: isPaid ? 'bold' : 'normal',
                          cursor: isInputLocked ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <option value="Giờ">Giờ</option>
                        <option value="Qua đêm">Qua đêm</option>
                        <option value="Ngày đêm">Ngày đêm</option>
                      </select>
                    )}
                  </td>

                  {/* D. Giờ vào (with conflict highlight) */}
                  <td
                    style={{
                      border: isWarningRow ? '2px solid #DC2626' : '1px solid #000000',
                      background: isWarningRow ? '#FEE2E2' : rowBgColor,
                      padding: 0,
                    }}
                  >
                    {row.isDateSeparator ? (
                      <span className="block text-center text-white font-mono font-bold text-xs">06:00</span>
                    ) : (
                      <input
                        type="text"
                        placeholder="HH:mm"
                        value={row.checkIn || ''}
                        readOnly={isInputLocked}
                        onChange={(e) => handleUpdateRow(row.id, { checkIn: e.target.value })}
                        onKeyDown={(e) => handleKeyDown(e, rowIdx, 'checkIn')}
                        style={{
                          width: '100%',
                          height: '100%',
                          background: 'transparent',
                          border: 'none',
                          textAlign: 'center',
                          outline: 'none',
                          color: '#000000',
                          fontSize: '13px',
                          fontFamily: 'monospace',
                          cursor: isInputLocked ? 'not-allowed' : 'text',
                        }}
                      />
                    )}
                  </td>

                  {/* E. Giờ ra (Có nút [Trả phòng] lấy giờ ra thủ công) */}
                  <td
                    style={{
                      border: '1px solid #000000',
                      padding: 0,
                      position: 'relative',
                      background: rowBgColor,
                    }}
                  >
                    {row.isDateSeparator ? (
                      <span className="block text-center text-blue-200 font-bold text-xs">---</span>
                    ) : isPaid ? (
                      <span className="block text-center font-mono font-bold text-slate-950 px-1 py-1">
                        {row.checkOut || '---'}
                      </span>
                    ) : (
                      <div className="flex items-center justify-between h-full px-1 gap-1">
                        <input
                          type="text"
                          placeholder="HH:mm"
                          value={row.checkOut || ''}
                          readOnly={isInputLocked}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleUpdateRow(row.id, {
                              checkOut: val,
                            });
                          }}
                          onKeyDown={(e) => handleKeyDown(e, rowIdx, 'checkOut')}
                          style={{
                            width: '100%',
                            height: '100%',
                            background: 'transparent',
                            border: 'none',
                            textAlign: 'center',
                            outline: 'none',
                            color: '#000000',
                            fontSize: '13px',
                            fontFamily: 'monospace',
                            fontWeight: row.checkOut ? 'bold' : 'normal',
                            cursor: isInputLocked ? 'not-allowed' : 'text',
                          }}
                        />
                        {Boolean(row.roomNumber && String(row.roomNumber).trim() !== '' && row.roomNumber !== '---') && !isInputLocked && (
                          !row.checkOut || String(row.checkOut).trim() === '' ? (
                            <button
                              type="button"
                              onClick={() => handleSetCheckOutTime(row.id)}
                              className="shrink-0 flex items-center gap-0.5 rounded bg-blue-600 text-white px-1.5 py-0.5 text-[10px] font-bold hover:bg-blue-700 shadow-2xs transition"
                              title="Bấm để lấy giờ hiện tại điền vào Giờ ra (không tự động chốt phòng)"
                            >
                              <Clock className="h-3 w-3 inline mr-0.5" />
                              <span>Lấy giờ</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetCheckOutTime(row.id)}
                              className="shrink-0 text-[10px] text-blue-700 hover:underline font-semibold"
                              title="Cập nhật giờ trả phòng về thời gian hiện tại"
                            >
                              [Lấy giờ]
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </td>

                  {/* F. Bia */}
                  <td style={{ border: '1px solid #000000', padding: 0, background: rowBgColor }}>
                    {row.isDateSeparator ? (
                      <span className="block text-right pr-2 text-blue-200 font-mono text-xs">0</span>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        value={row.beer || ''}
                        readOnly={isInputLocked}
                        onChange={(e) => handleUpdateRow(row.id, { beer: e.target.value })}
                        onKeyDown={(e) => handleKeyDown(e, rowIdx, 'beer')}
                        style={{
                          width: '100%',
                          height: '100%',
                          background: 'transparent',
                          border: 'none',
                          textAlign: 'right',
                          paddingRight: '6px',
                          outline: 'none',
                          color: '#000000',
                          fontSize: '13px',
                          fontFamily: 'monospace',
                          cursor: isInputLocked ? 'not-allowed' : 'text',
                        }}
                      />
                    )}
                  </td>

                  {/* G. Suối */}
                  <td style={{ border: '1px solid #000000', padding: 0, background: rowBgColor }}>
                    {row.isDateSeparator ? (
                      <span className="block text-right pr-2 text-blue-200 font-mono text-xs">0</span>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        value={row.filteredWater || ''}
                        readOnly={isInputLocked}
                        onChange={(e) => handleUpdateRow(row.id, { filteredWater: e.target.value })}
                        onKeyDown={(e) => handleKeyDown(e, rowIdx, 'filteredWater')}
                        style={{
                          width: '100%',
                          height: '100%',
                          background: 'transparent',
                          border: 'none',
                          textAlign: 'right',
                          paddingRight: '6px',
                          outline: 'none',
                          color: '#000000',
                          fontSize: '13px',
                          fontFamily: 'monospace',
                          cursor: isInputLocked ? 'not-allowed' : 'text',
                        }}
                      />
                    )}
                  </td>

                  {/* H. Nước ngọt */}
                  <td style={{ border: '1px solid #000000', padding: 0, background: rowBgColor }}>
                    {row.isDateSeparator ? (
                      <span className="block text-right pr-2 text-blue-200 font-mono text-xs">0</span>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        value={row.softDrink || ''}
                        readOnly={isInputLocked}
                        onChange={(e) => handleUpdateRow(row.id, { softDrink: e.target.value })}
                        onKeyDown={(e) => handleKeyDown(e, rowIdx, 'softDrink')}
                        style={{
                          width: '100%',
                          height: '100%',
                          background: 'transparent',
                          border: 'none',
                          textAlign: 'right',
                          paddingRight: '6px',
                          outline: 'none',
                          color: '#000000',
                          fontSize: '13px',
                          fontFamily: 'monospace',
                          cursor: isInputLocked ? 'not-allowed' : 'text',
                        }}
                      />
                    )}
                  </td>

                  {/* I. Tiền nước (Formula Read-only) */}
                  <td
                    style={{
                      border: '1px solid #000000',
                      textAlign: 'right',
                      paddingRight: '6px',
                      fontFamily: 'monospace',
                      fontWeight: Number(row.waterAmount) > 0 ? 'bold' : 'normal',
                      color: row.isDateSeparator ? '#BFDBFE' : '#000000',
                      background: rowBgColor,
                    }}
                  >
                    {row.isDateSeparator ? 0 : Number(row.waterAmount || 0) > 0 ? formatNumber(row.waterAmount) : 0}
                  </td>

                  {/* J. Tiền phòng (Formula Read-only) */}
                  <td
                    style={{
                      border: '1px solid #000000',
                      textAlign: 'right',
                      paddingRight: '6px',
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                      color: row.isDateSeparator ? '#BFDBFE' : '#000000',
                      background: rowBgColor,
                    }}
                  >
                    {row.isDateSeparator ? 0 : formatNumber(row.roomAmount)}
                  </td>

                  {/* K. Phụ thu */}
                  <td style={{ border: '1px solid #000000', padding: 0, background: rowBgColor }}>
                    {row.isDateSeparator ? (
                      <span className="block text-right pr-2 text-blue-200 font-mono text-xs">0</span>
                    ) : (
                      <input
                        type="number"
                        step="5000"
                        value={row.extra || ''}
                        readOnly={isInputLocked}
                        onChange={(e) => handleUpdateRow(row.id, { extra: e.target.value })}
                        onKeyDown={(e) => handleKeyDown(e, rowIdx, 'extra')}
                        placeholder="0"
                        style={{
                          width: '100%',
                          height: '100%',
                          background: 'transparent',
                          border: 'none',
                          textAlign: 'right',
                          paddingRight: '6px',
                          outline: 'none',
                          color: '#000000',
                          fontSize: '13px',
                          fontFamily: 'monospace',
                          cursor: isInputLocked ? 'not-allowed' : 'text',
                        }}
                      />
                    )}
                  </td>

                  {/* L. Tổng tiền (Formula Read-only) */}
                  <td
                    style={{
                      border: '1px solid #000000',
                      textAlign: 'right',
                      paddingRight: '6px',
                      fontFamily: 'monospace',
                      fontWeight: '900',
                      color: row.isDateSeparator ? '#FFFFFF' : isExpenseRow || Number(row.totalAmount) < 0 ? '#DC2626' : '#000000',
                      background: rowBgColor,
                    }}
                  >
                    {row.isDateSeparator ? 0 : isExpenseRow && Number(row.totalAmount) < 0 ? `-${formatNumber(Math.abs(row.totalAmount))}` : formatNumber(row.totalAmount)}
                  </td>

                  {/* Thu Trước / Cọc (Strictly Read-Only Display) */}
                  <td
                    style={{
                      border: '1px solid #000000',
                      textAlign: 'right',
                      paddingRight: '6px',
                      fontFamily: 'monospace',
                      fontWeight: Number(row.depositAmount) > 0 ? 'bold' : 'normal',
                      color: row.isDateSeparator ? '#BFDBFE' : Number(row.depositAmount) > 0 ? '#047857' : '#000000',
                      background: rowBgColor,
                    }}
                    title="Tiền đã thu trước hoặc tiền cọc (Chỉ hiển thị, quản lý qua POS)"
                  >
                    {row.isDateSeparator ? (
                      0
                    ) : Number(row.depositAmount || 0) > 0 ? (
                      <span className="inline-flex items-center gap-0.5 px-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                        {formatNumber(row.depositAmount)}
                      </span>
                    ) : (
                      0
                    )}
                  </td>

                  {/* HT Thanh Toán (Phân biệt rõ TM, CK hoặc Hỗn hợp) */}
                  <td style={{ border: '1px solid #000000', padding: '0 2px', background: rowBgColor, textAlign: 'center' }}>
                    {row.isDateSeparator ? (
                      <span className="block text-center text-blue-200 font-bold text-xs">---</span>
                    ) : isPaid ? (
                      <span
                        className={`inline-flex items-center gap-1 font-bold text-xs px-1.5 py-0.5 rounded ${
                          currentPayMethod === 'transfer'
                            ? 'bg-blue-100 text-blue-900 border border-blue-300'
                            : currentPayMethod === 'split'
                            ? 'bg-purple-100 text-purple-900 border border-purple-300'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}
                      >
                        {currentPayMethod === 'transfer'
                          ? '💳 CK'
                          : currentPayMethod === 'split'
                          ? '🔄 Hỗn hợp'
                          : '💵 Tiền mặt'}
                      </span>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <select
                          value={currentPayMethod}
                          disabled={isInputLocked}
                          onChange={(e) => {
                            const method = e.target.value;
                            if (method === 'transfer') {
                              handleUpdateRow(row.id, {
                                paymentMethod: 'transfer',
                                note: row.note && row.note.toLowerCase().includes('ck') ? row.note : `ck ${row.note || ''}`.trim(),
                              });
                            } else if (method === 'split') {
                              handleOpenSplitModal(row);
                            } else {
                              // cash
                              handleUpdateRow(row.id, {
                                paymentMethod: 'cash',
                                note: (row.note || '').replace(/ck\s*\d*\w*/gi, '').replace(/tm\s*\d*\w*/gi, '').trim(),
                              });
                            }
                          }}
                          style={{
                            width: '100%',
                            height: '100%',
                            background: 'transparent',
                            border: 'none',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            outline: 'none',
                            color:
                              currentPayMethod === 'transfer'
                                ? '#1D4ED8'
                                : currentPayMethod === 'split'
                                ? '#7E22CE'
                                : '#047857',
                            fontSize: '11px',
                            cursor: isInputLocked ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <option value="cash">💵 Tiền mặt</option>
                          <option value="transfer">💳 Chuyển khoản (CK)</option>
                          <option value="split">🔄 Hỗn hợp (CK+TM)</option>
                        </select>
                        {currentPayMethod === 'split' && !isInputLocked && (
                          <button
                            type="button"
                            onClick={() => handleOpenSplitModal(row)}
                            className="rounded bg-purple-100 text-purple-800 border border-purple-300 px-1 py-0.5 text-[10px] font-bold hover:bg-purple-200 shrink-0"
                            title="Chỉnh sửa số tiền Chuyển khoản và Tiền mặt"
                          >
                            Sửa
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  {/* M. Ghi chú (Parser Target) */}
                  <td style={{ border: '1px solid #000000', padding: 0, background: rowBgColor }}>
                    {row.isDateSeparator ? (
                      <span className="block text-left pl-2 text-white font-black text-xs">
                        {row.note || `--- BẮT ĐẦU NGÀY MỚI (06:00 SÁNG ${row.date || ''}) ---`}
                      </span>
                    ) : (
                      <input
                        type="text"
                        placeholder=""
                        value={row.note || ''}
                        readOnly={isInputLocked}
                        onChange={(e) => handleUpdateRow(row.id, { note: e.target.value })}
                        onKeyDown={(e) => handleKeyDown(e, rowIdx, 'note')}
                        style={{
                          width: '100%',
                          height: '100%',
                          background: 'transparent',
                          border: 'none',
                          textAlign: 'left',
                          paddingLeft: '6px',
                          outline: 'none',
                          color: '#000000',
                          fontSize: '12px',
                          cursor: isInputLocked ? 'not-allowed' : 'text',
                        }}
                      />
                    )}
                  </td>

                  {/* N. Trạng Thái (Nút Xong / Chốt thủ công) */}
                  <td
                    style={{
                      border: '1px solid #000000',
                      background: colNBgColor,
                      padding: '0 2px',
                      textAlign: 'center',
                    }}
                  >
                    {row.isDateSeparator ? (
                      <span className="block text-center text-blue-200 font-bold text-xs">---</span>
                    ) : isExpenseRow ? (
                      <div
                        className="flex items-center justify-center gap-1 font-bold text-rose-800 px-1 select-none"
                        title="Phiếu chi quỹ đã thực hiện"
                      >
                        <span className="text-xs">Đã chi</span>
                      </div>
                    ) : isPaid ? (
                      <div
                        className="flex items-center justify-center gap-1 font-bold text-slate-950 px-1 select-none"
                        title="Đã thanh toán (Đã khóa, không sửa)"
                      >
                        <Lock className="h-3.5 w-3.5 text-slate-900" />
                        <span className="text-xs">Xong</span>
                      </div>
                    ) : isExcelRowBlank(row) ? (
                      <div className="flex items-center justify-center text-[11px] text-slate-400 select-none">
                        <span>---</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <select
                          value={row.status || 'Đang ở'}
                          disabled={isInputLocked}
                          onChange={(e) => {
                            const newStatus = e.target.value;
                            if (newStatus === 'Xong') {
                              requestFinalizePayment(row);
                            } else {
                              handleUpdateRow(row.id, { status: newStatus });
                            }
                          }}
                          onKeyDown={(e) => handleKeyDown(e, rowIdx, 'status')}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            outline: 'none',
                            color: '#000000',
                            fontSize: '11px',
                            cursor: isInputLocked ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <option value="Đang ở">Đang ở</option>
                          <option value="Đã cọc">Đã cọc</option>
                          <option value="Xong">Xong</option>
                        </select>

                        {!isInputLocked && (
                          <button
                            type="button"
                            onClick={() => requestFinalizePayment(row)}
                            className="rounded bg-slate-900 text-white px-1.5 py-0.5 text-[10px] font-black hover:bg-black shadow-2xs transition shrink-0"
                            title="Bấm để Chốt thanh toán & Khóa dòng này"
                          >
                            ✔️ Chốt
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Action (Lock / Delete button) */}
                  <td
                    style={{
                      border: '1px solid #000000',
                      textAlign: 'center',
                      padding: 0,
                      background: rowBgColor,
                    }}
                  >
                    {isPaid ? (
                      <button
                        type="button"
                        onClick={() => handleToggleUnlock(row.id)}
                        className="text-slate-700 hover:text-blue-700 p-1 text-xs font-bold"
                        title="Đã thanh toán (Đã khóa). Nhấp để mở khóa chỉnh sửa nếu cần"
                      >
                        <Lock className="h-3.5 w-3.5 mx-auto" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(row.id)}
                        className="text-slate-400 hover:text-red-600 p-1 text-xs"
                        title="Xóa hàng này"
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              );
            })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls (Bottom) */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-slate-100 rounded-xl border border-slate-300 text-xs font-bold shadow-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <span>
              Hiển thị dòng <strong className="text-slate-900 font-mono">{startIndex + 1} - {endIndex}</strong> / Tổng <strong className="text-slate-900 font-mono">{displayRows.length}</strong> dòng
            </span>
            <span className="text-[11px] font-normal text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
              20 dòng / trang
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Trang trước</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  className={`h-7 min-w-[28px] px-1.5 rounded-lg text-xs font-black transition ${
                    currentPage === p
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <span>Trang sau</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Quick Add Row Action Bar below Table */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleAddRow}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-md hover:bg-emerald-700 active:scale-[0.99] transition"
        >
          <Plus className="h-5 w-5" />
          <span>➕ THÊM DÒNG PHÒNG MỚI (Nhấn F2 hoặc Enter)</span>
        </button>

        <button
          type="button"
          onClick={handleAddSeparatorRow}
          className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-xs"
        >
          <span>➕ Thêm Dòng Phân Cách Ngày Mới</span>
        </button>
      </div>

      {/* 3. KHỐI CHỐT NGÀY DƯỚI ĐÁY BẢNG TÍNH (SRS Section 6) */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-5 text-white shadow-lg border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-700/80 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              Bảng Tổng Hợp Chốt Ngày (Daily Settlement Summary)
            </h3>
          </div>
          <div className="text-xs text-slate-300 font-mono-nums">
            {settlementSummary.completedCount} đơn hoàn tất ({settlementSummary.cashCount} Tiền mặt • {settlementSummary.transferCount} Chuyển khoản) • {settlementSummary.activeCount} phòng đang ở • {settlementSummary.reservedCount} phòng đã cọc
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Revenue */}
          <div className="rounded-xl bg-slate-800/90 p-3.5 border border-slate-700">
            <div className="flex items-center justify-between text-xs text-amber-300 font-bold mb-1">
              <span>TỔNG DOANH THU (∑ Cột L)</span>
              <span className="text-[10px] bg-amber-400/20 px-1.5 py-0.5 rounded text-amber-300">
                {settlementSummary.completedCount} Đơn đã Xong
              </span>
            </div>
            <div className="text-2xl font-black font-mono-nums text-amber-400">
              {formatCurrencyVND(settlementSummary.totalRevenue)}
            </div>
          </div>

          {/* Total Advance / Deposit */}
          <div className="rounded-xl bg-slate-800/90 p-3.5 border border-slate-700">
            <div className="flex items-center justify-between text-xs text-emerald-300 font-bold mb-1">
              <span className="flex items-center gap-1">
                <span>🛡️</span>
                ĐÃ THU TRƯỚC / CỌC ({settlementSummary.depositCount || 0} phòng)
              </span>
            </div>
            <div className="text-2xl font-black font-mono-nums text-emerald-400">
              {formatCurrencyVND(settlementSummary.totalDepositCollected || 0)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Tiền đặt cọc & tạm ứng đã nhận
            </div>
          </div>

          {/* Total Transfer */}
          <div className="rounded-xl bg-slate-800/90 p-3.5 border border-slate-700">
            <div className="flex items-center justify-between text-xs text-blue-400 font-bold mb-1">
              <span className="flex items-center gap-1">
                <CreditCard className="h-4 w-4" />
                TỔNG CHUYỂN KHOẢN ({settlementSummary.transferCount} đơn)
              </span>
            </div>
            <div className="text-2xl font-black font-mono-nums text-white">
              {formatCurrencyVND(settlementSummary.totalTransfer)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Đối soát số dư tài khoản ngân hàng
            </div>
          </div>

          {/* Net Cash in Drawer */}
          <div className="rounded-xl bg-slate-800/90 p-3.5 border border-slate-700">
            <div className="flex items-center justify-between text-xs text-amber-200 font-bold mb-1">
              <span className="flex items-center gap-1">
                <Banknote className="h-4 w-4" />
                TIỀN MẶT KÉT THỰC TẾ ({settlementSummary.cashCount} đơn)
              </span>
            </div>
            <div className="text-2xl font-black font-mono-nums text-amber-300">
              {formatCurrencyVND(settlementSummary.totalCashNet)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              = Doanh thu - Tổng CK - Thối lại
            </div>
          </div>
        </div>
      </div>

      {/* MODAL THU 1 PHẦN TIỀN MẶT + 1 PHẦN CK TRÊN EXCEL */}
      {splitModalRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm rounded-xl bg-white p-4 shadow-2xl border border-slate-300 space-y-3 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600 text-white">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Thu Hỗn Hợp CK + TM (P.{splitModalRow.roomNumber || '---'})
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSplitModalRow(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-lg bg-slate-50 p-2 border border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Tổng Bill:</span>
              <span className="text-base font-black font-mono text-slate-900">
                {formatCurrencyVND(splitModalRow.totalAmount)}
              </span>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold text-blue-900 mb-0.5 flex items-center gap-1">
                  <CreditCard className="h-3 w-3 text-blue-700" />
                  Số tiền Chuyển Khoản (CK)
                </label>
                <input
                  type="number"
                  step="10000"
                  placeholder="0"
                  value={splitTransferAmount}
                  onChange={(e) => setSplitTransferAmount(e.target.value)}
                  className="w-full rounded-lg border border-blue-300 bg-blue-50/40 p-1.5 text-sm font-black font-mono text-blue-950 focus:outline-none focus:border-blue-700"
                />

                {/* Nút bấm nhanh */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {[50000, 100000, 150000, 200000, Math.round((splitModalRow.totalAmount || 0) / 2)].map((amt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSplitTransferAmount(String(amt))}
                      className="rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-800"
                    >
                      {idx === 4 ? `50% (${formatCurrencyVND(amt)})` : formatCurrencyVND(amt)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-emerald-50 border border-emerald-300 p-2 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                    <Banknote className="h-3.5 w-3.5 text-emerald-700" />
                    Tiền mặt (TM) còn lại:
                  </span>
                </div>
                <span className="text-base font-black font-mono text-emerald-900">
                  {formatCurrencyVND(Math.max(0, (splitModalRow.totalAmount || 0) - (Number(splitTransferAmount) || 0)))}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  Ghi chú thêm
                </label>
                <input
                  type="text"
                  placeholder="Ghi chú thêm..."
                  value={splitCustomNote}
                  onChange={(e) => setSplitCustomNote(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSplitModalRow(null)}
                className="flex-1 rounded-lg border border-slate-300 bg-white py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmSplitModal}
                className="flex-[2] rounded-lg bg-purple-700 py-1.5 text-xs font-bold text-white hover:bg-purple-800 active:scale-[0.99] transition shadow-xs"
              >
                Lưu Thu Kết Hợp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CẢNH BÁO GHI CHÚ TRƯỚC KHI CHỐT PHÒNG TRÊN EXCEL */}
      {noteConfirmRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-3 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm rounded-xl bg-white p-4 shadow-2xl border-2 border-amber-400 space-y-3 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                <AlertTriangle className="h-4 w-4 text-amber-700" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  ⚠️ Ghi Chú Phòng {noteConfirmRow.roomNumber || '---'}
                </h3>
              </div>
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-300 p-2.5 text-xs font-bold text-amber-950 whitespace-pre-wrap">
              "{noteConfirmRow.note}"
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span>Tổng Bill:</span>
              <span className="font-mono text-slate-900">{formatCurrencyVND(noteConfirmRow.totalAmount)}</span>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setNoteConfirmRow(null)}
                className="flex-1 rounded-lg border border-slate-300 bg-white py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = noteConfirmRow.id;
                  setNoteConfirmRow(null);
                  handleFinalizePayment(id);
                }}
                className="flex-[2] rounded-lg bg-emerald-600 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 active:scale-[0.99] transition shadow-xs flex items-center justify-center gap-1"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Đã đọc & Chốt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
