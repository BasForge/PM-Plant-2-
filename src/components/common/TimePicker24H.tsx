import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Clock, Check } from 'lucide-react';

export interface TimePicker24HProps {
  id?: string;
  value: string; // "HH:mm" in 24-hour format, e.g. "09:00", "14:30"
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export const TimePicker24H: React.FC<TimePicker24HProps> = ({
  id,
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder = 'HH:mm (24 ชม.)'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);

  const [hStr, mStr] = (value || '09:00').split(':');
  const selectedHour = (hStr || '09').padStart(2, '0').slice(0, 2);
  const selectedMinute = (mStr || '00').padStart(2, '0').slice(0, 2);

  const [textInput, setTextInput] = useState<string>(value || '09:00');

  useEffect(() => {
    setTextInput(value || '09:00');
  }, [value]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (hourListRef.current) {
          const activeH = hourListRef.current.querySelector('[data-active="true"]');
          if (activeH) activeH.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
        if (minuteListRef.current) {
          const activeM = minuteListRef.current.querySelector('[data-active="true"]');
          if (activeM) activeM.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }, 50);
    }
  }, [isOpen]);

  const hours24 = useMemo(() => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')), []);
  const minutesAll = useMemo(() => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')), []);

  const handleSelectHour = (h: string) => {
    const nextVal = `${h}:${selectedMinute}`;
    setTextInput(nextVal);
    onChange(nextVal);
  };

  const handleSelectMinute = (m: string) => {
    const nextVal = `${selectedHour}:${m}`;
    setTextInput(nextVal);
    onChange(nextVal);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTextInput(val);
    const match = val.match(/^([01]?[0-9]|2[0-3]):([0-5]?[0-9])$/);
    if (match) {
      const h = match[1].padStart(2, '0');
      const m = match[2].padStart(2, '0');
      onChange(`${h}:${m}`);
    }
  };

  const setNow = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const nextVal = `${h}:${m}`;
    setTextInput(nextVal);
    onChange(nextVal);
  };

  return (
    <div className="relative inline-block w-full" ref={containerRef}>
      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          disabled={disabled}
          placeholder={placeholder}
          value={textInput}
          maxLength={5}
          onChange={handleTextChange}
          onClick={() => !disabled && setIsOpen(true)}
          className={`w-full font-mono text-center cursor-pointer ${className}`}
        />
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className="absolute right-2 text-slate-400 hover:text-slate-600 transition"
          title="เลือกระบบเวลา 24 ชม."
        >
          <Clock className="w-3.5 h-3.5" />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 left-0 top-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 w-56 animate-in fade-in duration-100">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> เวลา 24 ชม.
            </span>
            <button
              type="button"
              onClick={setNow}
              className="text-[10px] text-cyan-300 hover:underline font-bold"
            >
              ตอนนี้
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-slate-950 border border-slate-800 rounded-lg p-1.5 h-36">
            {/* Hours */}
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 text-center pb-0.5 border-b border-slate-800 mb-1">
                ชม. (00-23)
              </span>
              <div ref={hourListRef} className="flex-1 overflow-y-auto space-y-0.5 pr-0.5 scrollbar-thin">
                {hours24.map((h) => {
                  const isActive = h === selectedHour;
                  return (
                    <button
                      key={h}
                      type="button"
                      data-active={isActive ? 'true' : 'false'}
                      onClick={() => handleSelectHour(h)}
                      className={`w-full py-0.5 rounded text-[11px] font-mono font-bold transition text-center ${
                        isActive ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minutes */}
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 text-center pb-0.5 border-b border-slate-800 mb-1">
                นาที (00-59)
              </span>
              <div ref={minuteListRef} className="flex-1 overflow-y-auto space-y-0.5 pr-0.5 scrollbar-thin">
                {minutesAll.map((m) => {
                  const isActive = m === selectedMinute;
                  return (
                    <button
                      key={m}
                      type="button"
                      data-active={isActive ? 'true' : 'false'}
                      onClick={() => handleSelectMinute(m)}
                      className={`w-full py-0.5 rounded text-[11px] font-mono font-bold transition text-center ${
                        isActive ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="mt-2 w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-1 rounded text-[11px] flex items-center justify-center gap-1"
          >
            <Check className="w-3 h-3" /> ยืนยันเวลา ({selectedHour}:{selectedMinute} น.)
          </button>
        </div>
      )}
    </div>
  );
};
