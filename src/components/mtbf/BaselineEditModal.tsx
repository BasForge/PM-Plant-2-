import React, { useState } from 'react';
import { RoomConfig } from '../../types/mtbf';
import { DEFAULT_BASELINE_HISTORY } from '../../data/mtbfRooms';
import { X, Check, History, AlertTriangle, RotateCcw } from 'lucide-react';

interface BaselineEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: RoomConfig[];
  baselineHistory: typeof DEFAULT_BASELINE_HISTORY;
  onSaveBaseline: (newBaseline: typeof DEFAULT_BASELINE_HISTORY) => void;
}

export const BaselineEditModal: React.FC<BaselineEditModalProps> = ({
  isOpen,
  onClose,
  rooms,
  baselineHistory,
  onSaveBaseline
}) => {
  const [localData, setLocalData] = useState<typeof DEFAULT_BASELINE_HISTORY>(() => {
    return JSON.parse(JSON.stringify(baselineHistory || DEFAULT_BASELINE_HISTORY));
  });

  const [activeYear, setActiveYear] = useState<2023 | 2024 | 2025>(2025);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleCellChange = (
    metric: 'breakdownMin' | 'count' | 'mtbf' | 'mttr',
    roomIndex: number,
    valStr: string
  ) => {
    const num = parseFloat(valStr);
    const parsed = isNaN(num) ? 0 : num;
    setLocalData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next[activeYear][metric][roomIndex] = parsed;
      return next;
    });
  };

  const handleFixRoom7Typo = () => {
    setLocalData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next[2025].mtbf[6] = 6570; // room 7 is index 6
      return next;
    });
  };

  const handleResetDefaults = () => {
    setLocalData(JSON.parse(JSON.stringify(DEFAULT_BASELINE_HISTORY)));
  };

  const handleSave = () => {
    onSaveBaseline(localData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const currentYearData = localData[activeYear];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="bg-[#0b1325] border border-slate-700 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <History size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>จัดการข้อมูลสถิติย้อนหลัง (Baseline 2023 - 2025)</span>
              </h3>
              <p className="text-xs text-slate-400">
                ข้อมูลเปรียบเทียบในอดีตตามเอกสารต้นฉบับ สามารถตรวจสอบและแก้ไขตัวเลขได้
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

        {/* Warning banner for Room 7 Typo */}
        <div className="px-5 py-3 bg-amber-950/40 border-b border-amber-900/30 flex items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={16} className="text-amber-400 shrink-0" />
            <span>
              <strong>ข้อสังเกต:</strong> ปี 2025 ห้องล้างอุปกรณ์มีค่า MTBF = <strong>{localData[2025].mtbf[6]} ชม.</strong> (อาจพิมพ์ผิดจาก 6570 ชม.)
            </span>
          </div>
          {localData[2025].mtbf[6] !== 6570 && (
            <button
              type="button"
              onClick={handleFixRoom7Typo}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition cursor-pointer whitespace-nowrap"
            >
              แก้ไขเป็น 6570 ชม.
            </button>
          )}
        </div>

        {/* Year Tabs */}
        <div className="px-5 pt-4 bg-slate-900/40 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            {([2023, 2024, 2025] as const).map(y => (
              <button
                key={y}
                type="button"
                onClick={() => setActiveYear(y)}
                className={`px-4 py-2 rounded-t-xl text-xs font-bold transition cursor-pointer border-t border-x ${
                  activeYear === y
                    ? 'bg-[#0b1325] text-cyan-400 border-slate-700 border-b-[#0b1325] pb-2.5 shadow'
                    : 'bg-slate-900/60 text-slate-400 border-transparent hover:text-white'
                }`}
              >
                ปี {y}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition cursor-pointer pb-2"
          >
            <RotateCcw size={12} />
            <span>คืนค่าเริ่มต้นเอกสาร</span>
          </button>
        </div>

        {/* Body Table */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div className="border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-300 border-b border-slate-700">
                  <th className="py-2.5 px-3 font-bold">ห้อง / แผนก</th>
                  <th className="py-2.5 px-3 text-right font-bold">Breakdown (นาที)</th>
                  <th className="py-2.5 px-3 text-right font-bold">จำนวนครั้ง</th>
                  <th className="py-2.5 px-3 text-right font-bold">MTBF (ชม.)</th>
                  <th className="py-2.5 px-3 text-right font-bold">MTTR (นาที)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rooms.map((rm, idx) => {
                  const bd = currentYearData.breakdownMin[idx] ?? 0;
                  const cnt = currentYearData.count[idx] ?? 0;
                  const mtbf = currentYearData.mtbf[idx] ?? 0;
                  const mttr = currentYearData.mttr[idx] ?? 0;
                  const isRoom7 = activeYear === 2025 && idx === 6;

                  return (
                    <tr key={rm.id} className="hover:bg-slate-800/20 transition">
                      <td className="py-2 px-3 font-medium text-slate-200">
                        <div className="flex items-center gap-2">
                          <span>{rm.name}</span>
                          {isRoom7 && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/40">
                              ตรวจทาน
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-1.5 px-3 text-right">
                        <input
                          type="number"
                          step="any"
                          value={bd}
                          onChange={(e) => handleCellChange('breakdownMin', idx, e.target.value)}
                          className="w-24 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-right font-mono text-rose-300 font-bold focus:outline-none focus:border-cyan-500"
                        />
                      </td>
                      <td className="py-1.5 px-3 text-right">
                        <input
                          type="number"
                          step="1"
                          value={cnt}
                          onChange={(e) => handleCellChange('count', idx, e.target.value)}
                          className="w-20 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-right font-mono text-amber-300 font-bold focus:outline-none focus:border-cyan-500"
                        />
                      </td>
                      <td className="py-1.5 px-3 text-right">
                        <input
                          type="number"
                          step="any"
                          value={mtbf}
                          onChange={(e) => handleCellChange('mtbf', idx, e.target.value)}
                          className={`w-24 px-2 py-1 bg-slate-950 border rounded-lg text-right font-mono font-bold focus:outline-none focus:border-cyan-500 ${
                            isRoom7 && mtbf === 3570 
                              ? 'border-amber-500 text-amber-300' 
                              : 'border-slate-700 text-emerald-300'
                          }`}
                        />
                      </td>
                      <td className="py-1.5 px-3 text-right">
                        <input
                          type="number"
                          step="any"
                          value={mttr}
                          onChange={(e) => handleCellChange('mttr', idx, e.target.value)}
                          className="w-24 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-right font-mono text-cyan-300 font-bold focus:outline-none focus:border-cyan-500"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
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
            id="btn-save-baseline-history"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/20 transition flex items-center gap-2 cursor-pointer"
          >
            {savedSuccess ? (
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
