import React, { useState } from 'react';
import { RoomConfig } from '../../types/mtbf';
import { MONTH_NAMES_THAI, DEFAULT_PRODUCTION_TIME_MONTHLY_2026 } from '../../data/mtbfRooms';
import { parseProductionTimeValue } from '../../utils/mtbfCalculator';
import { X, Clock, Check, RotateCcw, AlertCircle } from 'lucide-react';

interface ProductionTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  rooms: RoomConfig[];
  productionTimes: Record<string, number[]>;
  onSave: (updatedTimes: Record<string, number[]>) => void;
}

export const ProductionTimeModal: React.FC<ProductionTimeModalProps> = ({
  isOpen,
  onClose,
  year,
  rooms,
  productionTimes,
  onSave
}) => {
  const [localTimes, setLocalTimes] = useState<Record<string, number[]>>(() => {
    const copy: Record<string, number[]> = {};
    rooms.forEach(r => {
      copy[r.id] = productionTimes[r.id] 
        ? [...productionTimes[r.id]] 
        : [...DEFAULT_PRODUCTION_TIME_MONTHLY_2026];
    });
    return copy;
  });

  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id || 'room-1');
  const [successToast, setSuccessToast] = useState(false);

  if (!isOpen) return null;

  const handleCellChange = (roomId: string, monthIndex: number, valStr: string) => {
    const num = parseFloat(valStr);
    const parsed = isNaN(num) ? 0 : parseProductionTimeValue(num);
    setLocalTimes(prev => {
      const roomArr = prev[roomId] ? [...prev[roomId]] : [...DEFAULT_PRODUCTION_TIME_MONTHLY_2026];
      roomArr[monthIndex] = parsed;
      return { ...prev, [roomId]: roomArr };
    });
  };

  const handleApplyToAllRooms = (sourceRoomId: string) => {
    const sourceArr = localTimes[sourceRoomId] || DEFAULT_PRODUCTION_TIME_MONTHLY_2026;
    setLocalTimes(prev => {
      const next: Record<string, number[]> = {};
      rooms.forEach(r => {
        next[r.id] = [...sourceArr];
      });
      return next;
    });
  };

  const handleResetToDefault = () => {
    setLocalTimes(prev => {
      const next: Record<string, number[]> = {};
      rooms.forEach(r => {
        next[r.id] = [...DEFAULT_PRODUCTION_TIME_MONTHLY_2026];
      });
      return next;
    });
  };

  const handleSave = () => {
    onSave(localTimes);
    setSuccessToast(true);
    setTimeout(() => {
      setSuccessToast(false);
      onClose();
    }, 600);
  };

  const currentRoomArr = localTimes[selectedRoomId] || DEFAULT_PRODUCTION_TIME_MONTHLY_2026;
  const currentRoomTotal = currentRoomArr.reduce((acc, v) => acc + (v || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="bg-[#0b1325] border border-slate-700 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>ตั้งค่าเวลาเดินเครื่องจักร (Production Time)</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800/40 text-cyan-300 font-mono">
                  ปี {year}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                กำหนดชั่วโมงเวลาการผลิต (Production Time) รายเดือนแยกตามห้อง (เครื่องทุกเครื่องในห้องใช้ค่าเดียวกัน)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Info guide bar */}
        <div className="px-5 py-2.5 bg-blue-950/40 border-b border-blue-900/30 flex items-center justify-between text-xs text-blue-200">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="text-cyan-400 shrink-0" />
            <span>
              <strong>รูปแบบตัวเลข:</strong> สามารถใส่จำนวนเต็ม (เช่น 558) หรือรูปแบบ ชม.นาที (เช่น 558.30 = 558 ชม. 30 นาที)
            </span>
          </div>
          <button
            type="button"
            onClick={handleResetToDefault}
            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold transition cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>คืนค่ามาตรฐาน (6,570 ชม.)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {/* Room Selector Tab Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800/80">
            {rooms.map(rm => {
              const isSelected = rm.id === selectedRoomId;
              const total = (localTimes[rm.id] || DEFAULT_PRODUCTION_TIME_MONTHLY_2026).reduce((a, b) => a + (b || 0), 0);
              return (
                <button
                  key={rm.id}
                  type="button"
                  onClick={() => setSelectedRoomId(rm.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                      : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>{rm.name}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                    isSelected ? 'bg-slate-950 text-cyan-300 font-bold' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {Math.round(total)}h
                  </span>
                </button>
              );
            })}
          </div>

          {/* Current Room Edit Section */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{rooms.find(r => r.id === selectedRoomId)?.name}</span>
                  <span className="text-xs text-slate-400 font-normal">
                    (รวมทั้งปี: <strong className="text-cyan-300 font-mono">{currentRoomTotal.toLocaleString()}</strong> ชม.)
                  </span>
                </h4>
              </div>
              <button
                type="button"
                onClick={() => handleApplyToAllRooms(selectedRoomId)}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/40 transition cursor-pointer self-start sm:self-auto"
              >
                คัดลอกค่าห้องนี้ ไปใช้กับทุกห้อง (8 ห้อง)
              </button>
            </div>

            {/* 12 Months Input Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {MONTH_NAMES_THAI.map((mName, mIdx) => {
                const val = currentRoomArr[mIdx] ?? DEFAULT_PRODUCTION_TIME_MONTHLY_2026[mIdx];
                return (
                  <div key={mName} className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl">
                    <label className="block text-[11px] font-medium text-slate-400 mb-1" htmlFor={`pt-input-${selectedRoomId}-${mIdx}`}>
                      เดือนที่ {mIdx + 1}: {mName}
                    </label>
                    <div className="relative">
                      <input
                        id={`pt-input-${selectedRoomId}-${mIdx}`}
                        type="number"
                        step="any"
                        value={val}
                        onChange={(e) => handleCellChange(selectedRoomId, mIdx, e.target.value)}
                        className="w-full pl-2.5 pr-8 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-sm text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-500"
                      />
                      <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-500 font-mono pointer-events-none">
                        ชม.
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            id="btn-save-production-time"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/20 transition flex items-center gap-2 cursor-pointer"
          >
            {successToast ? (
              <>
                <Check size={16} className="text-emerald-950" />
                <span>บันทึกสำเร็จแล้ว</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>บันทึกการเปลี่ยนแปลง</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
