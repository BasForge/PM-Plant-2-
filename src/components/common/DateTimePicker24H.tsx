import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, Clock, RotateCcw } from 'lucide-react';

export interface DateTimePicker24HProps {
  id?: string;
  label?: string;
  value: string; // ISO string format: "YYYY-MM-DDTHH:mm" e.g. "2026-09-24T09:00"
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  quickAddButtons?: Array<{ label: string; minutes: number }>;
}

// 24 Hours: "00" through "23"
const HOURS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

// 60 Minutes: "00" through "59"
const MINUTES_60 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

// Convert YYYY-MM-DD (CE) to D/M/BE_YEAR (e.g. 24/9/2569)
function isoToDmy(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length < 3) return isoDate;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return isoDate;
  const beYear = y + 543;
  return `${d}/${m}/${beYear}`;
}

// Convert D/M/YYYY (BE or CE) to YYYY-MM-DD (CE)
function dmyToIso(dmy: string): string | null {
  const cleaned = dmy.trim();
  const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return null;
  const d = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  let y = parseInt(match[3], 10);

  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;

  // Handle 2-digit years (e.g. 69 -> 2569, 26 -> 2026)
  if (match[3].length === 2) {
    if (y >= 50) {
      y = 2500 + y;
    } else {
      y = 2000 + y;
    }
  }

  // If year is BE (พ.ศ. >= 2400), convert to CE (subtract 543)
  let ceYear = y;
  if (ceYear >= 2400) {
    ceYear = ceYear - 543;
  }

  if (ceYear < 1900 || ceYear > 2200) return null;

  return `${ceYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export const DateTimePicker24H: React.FC<DateTimePicker24HProps> = ({
  id,
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  className = ''
}) => {
  const hiddenDateInputRef = useRef<HTMLInputElement>(null);

  // Parse date and time safely
  const { datePart, hourPart, minutePart } = useMemo(() => {
    if (!value || typeof value !== 'string' || !value.includes('T')) {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const h = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      return {
        datePart: `${y}-${m}-${d}`,
        hourPart: h,
        minutePart: min
      };
    }

    const [dPart, tPart] = value.split('T');
    const [hRaw, mRaw] = (tPart || '00:00').split(':');
    const h = (hRaw || '00').padStart(2, '0').slice(0, 2);
    const min = (mRaw || '00').padStart(2, '0').slice(0, 2);

    return {
      datePart: dPart || '',
      hourPart: h,
      minutePart: min
    };
  }, [value]);

  // Local state for Day/Month/Year BE text: "D/M/YYYY" (e.g. 24/9/2569)
  const [dmyText, setDmyText] = useState<string>(() => isoToDmy(datePart));

  // Sync dmyText when datePart changes externally
  useEffect(() => {
    setDmyText(isoToDmy(datePart));
  }, [datePart]);

  const handleDateChange = (newIsoDate: string) => {
    if (!newIsoDate) return;
    setDmyText(isoToDmy(newIsoDate));
    onChange(`${newIsoDate}T${hourPart}:${minutePart}`);
  };

  const handleDmyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cleaned = raw.replace(/[^\d/]/g, '');
    setDmyText(cleaned);

    const iso = dmyToIso(cleaned);
    if (iso) {
      onChange(`${iso}T${hourPart}:${minutePart}`);
    }
  };

  const handleDmyBlur = () => {
    // If not a valid full date on blur, reset to current valid datePart
    const iso = dmyToIso(dmyText);
    if (!iso) {
      setDmyText(isoToDmy(datePart));
    } else {
      // Re-format cleanly to D/M/BE (e.g. 24/9/2569)
      setDmyText(isoToDmy(iso));
    }
  };

  const handleHourChange = (newHour: string) => {
    const h = newHour.padStart(2, '0').slice(0, 2);
    onChange(`${datePart || getTodayStr()}T${h}:${minutePart}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    const m = newMinute.padStart(2, '0').slice(0, 2);
    onChange(`${datePart || getTodayStr()}T${hourPart}:${m}`);
  };

  const handleSetNow = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const isoDate = `${y}-${m}-${d}`;
    setDmyText(isoToDmy(isoDate));
    onChange(`${isoDate}T${h}:${min}`);
  };

  const triggerCalendarPicker = () => {
    try {
      if (hiddenDateInputRef.current && 'showPicker' in hiddenDateInputRef.current) {
        hiddenDateInputRef.current.showPicker();
      } else {
        hiddenDateInputRef.current?.focus();
      }
    } catch {
      hiddenDateInputRef.current?.focus();
    }
  };

  function getTodayStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return (
    <div
      className={`bg-slate-900/95 border border-slate-750 hover:border-slate-700 rounded-xl p-3 space-y-2.5 transition-all shadow-sm ${className}`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-1 pb-1 border-b border-slate-800/80">
        <div className="flex items-center gap-1.5 min-w-0">
          <CalendarIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          {label ? (
            <label htmlFor={id} className="text-[11px] font-bold text-slate-200 truncate cursor-pointer">
              {label}
            </label>
          ) : (
            <span className="text-[11px] font-bold text-slate-300">ระบุวันเวลา</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[9px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 px-1.5 py-0.5 rounded">
            24 ชม.
          </span>
          <button
            type="button"
            onClick={handleSetNow}
            disabled={disabled}
            className="text-[10px] text-cyan-400 hover:text-cyan-200 font-bold bg-slate-800/90 hover:bg-slate-750 active:scale-95 px-2 py-0.5 rounded border border-slate-700 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="ตั้งค่าเป็นวันและเวลาปัจจุบันทันที"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            ตอนนี้
          </button>
        </div>
      </div>

      {/* Main Inputs Row: Date วัน/เดือน/พ.ศ. (24/9/2569) + Time 24H (HH:mm น.) */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
        {/* Date Selector: Arranged strictly as วัน/เดือน/ปี พ.ศ. (24/9/2569) */}
        <div className="sm:col-span-7">
          <div className="relative flex items-center bg-slate-950 border border-slate-700/90 hover:border-slate-600 rounded-lg px-2.5 py-1.5 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500/40">
            {/* Input field displaying 24/9/2569 */}
            <input
              type="text"
              id={id}
              required={required}
              disabled={disabled}
              value={dmyText}
              onChange={handleDmyChange}
              onBlur={handleDmyBlur}
              placeholder="ว/ด/ป เช่น 24/9/2569"
              maxLength={10}
              className="bg-transparent text-xs text-slate-100 font-mono font-bold focus:outline-none w-full tracking-wider"
              title="ระบุ วัน/เดือน/ปี พ.ศ. เช่น 24/9/2569"
            />

            {/* Tag indicating วัน/เดือน/ปี (พ.ศ.) */}
            <span className="text-[9px] text-cyan-400/90 font-mono font-semibold bg-cyan-950/70 border border-cyan-800/50 px-1 py-0.5 rounded mr-1.5 shrink-0 select-none">
              ว/ด/ป
            </span>

            {/* Calendar button to open browser's native date picker */}
            <div className="relative shrink-0 flex items-center">
              <button
                type="button"
                onClick={triggerCalendarPicker}
                disabled={disabled}
                className="text-slate-400 hover:text-cyan-300 transition p-0.5 rounded cursor-pointer"
                title="เปิดปฏิทินเลือกวัน"
              >
                <CalendarIcon className="w-4 h-4" />
              </button>

              {/* Native hidden date input */}
              <input
                type="date"
                ref={hiddenDateInputRef}
                tabIndex={-1}
                value={datePart}
                onChange={(e) => {
                  if (e.target.value) {
                    handleDateChange(e.target.value);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full pointer-events-auto"
                title="คลิกเลือกวันจากปฏิทิน"
              />
            </div>
          </div>
        </div>

        {/* 24-Hour Time Selector: Hour & Minute Dropdowns */}
        <div className="sm:col-span-5 flex items-center justify-between bg-slate-950 border border-slate-700/90 hover:border-slate-600 rounded-lg px-2 py-1.5 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500/40">
          <Clock className="w-3.5 h-3.5 text-cyan-400 mr-1 shrink-0" />

          {/* Hours (00 - 23) */}
          <select
            value={hourPart}
            disabled={disabled}
            onChange={(e) => handleHourChange(e.target.value)}
            className="bg-transparent text-xs text-cyan-300 font-mono font-bold focus:outline-none cursor-pointer text-center w-full appearance-none disabled:opacity-50"
            title="ชั่วโมง (00 ถึง 23)"
          >
            {HOURS_24.map((h) => (
              <option key={h} value={h} className="bg-slate-900 text-slate-100">
                {h}
              </option>
            ))}
          </select>

          <span className="text-slate-400 font-bold px-0.5 text-xs select-none">:</span>

          {/* Minutes (00 - 59) */}
          <select
            value={minutePart}
            disabled={disabled}
            onChange={(e) => handleMinuteChange(e.target.value)}
            className="bg-transparent text-xs text-cyan-300 font-mono font-bold focus:outline-none cursor-pointer text-center w-full appearance-none disabled:opacity-50"
            title="นาที (00 ถึง 59)"
          >
            {MINUTES_60.map((m) => (
              <option key={m} value={m} className="bg-slate-900 text-slate-100">
                {m}
              </option>
            ))}
          </select>

          <span className="text-[10px] text-slate-400 font-mono ml-1 shrink-0 font-medium select-none">
            น.
          </span>
        </div>
      </div>
    </div>
  );
};
