import React, { useState, useMemo } from 'react';
import { Machine } from '../types';
import { 
  X, Check, Clock, Search, Filter, Sparkles, RefreshCw, AlertCircle, 
  Save, RotateCcw, ArrowRight, ShieldCheck, Factory
} from 'lucide-react';

interface PlannedProductionTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  machines: Machine[];
  defaultHours: number;
  onSaveMachine: (machineId: string, hours: number) => void;
  onApplyToAll: (hours: number) => void;
  showToast: (msg: string) => void;
}

export const PlannedProductionTimeModal: React.FC<PlannedProductionTimeModalProps> = ({
  isOpen,
  onClose,
  machines,
  defaultHours,
  onSaveMachine,
  onApplyToAll,
  showToast
}) => {
  // Local state for batch value
  const [batchHours, setBatchHours] = useState<number>(defaultHours || 600);
  
  // Local state for per-machine hours map (machineId -> hours)
  const [machineHoursMap, setMachineHoursMap] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    machines.forEach(m => {
      map[m.id] = m.plannedProductionHours ?? (defaultHours || 600);
    });
    return map;
  });

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLine, setSelectedLine] = useState<string>('all');

  // When machines change or modal opens, re-sync
  React.useEffect(() => {
    if (isOpen) {
      const map: Record<string, number> = {};
      machines.forEach(m => {
        map[m.id] = m.plannedProductionHours ?? (defaultHours || 600);
      });
      setMachineHoursMap(map);
    }
  }, [isOpen, machines, defaultHours]);

  // Distinct lines
  const lineGroups = useMemo(() => {
    const set = new Set<string>();
    machines.forEach(m => {
      if (m.lineGroup) set.add(m.lineGroup);
    });
    return Array.from(set).sort();
  }, [machines]);

  // Filtered machines list
  const filteredMachines = useMemo(() => {
    return machines.filter(m => {
      const matchesSearch = 
        m.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.lineGroup && m.lineGroup.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchesSearch) return false;

      if (selectedLine !== 'all' && m.lineGroup !== selectedLine) {
        return false;
      }

      return true;
    });
  }, [machines, searchTerm, selectedLine]);

  // Handle single machine input change
  const handleHoursChange = (machineId: string, val: number) => {
    const validVal = isNaN(val) ? 0 : Math.max(0, val);
    setMachineHoursMap(prev => ({ ...prev, [machineId]: validVal }));
  };

  // Preset click for batch
  const handlePresetClick = (hrs: number) => {
    setBatchHours(hrs);
  };

  // Apply batch to all machines in the current view or all machines
  const handleApplyBatch = () => {
    if (batchHours <= 0) {
      showToast('⚠️ กรุณาระบุชั่วโมงที่มากกว่า 0');
      return;
    }
    const updatedMap: Record<string, number> = {};
    machines.forEach(m => {
      updatedMap[m.id] = batchHours;
    });
    setMachineHoursMap(updatedMap);
    showToast(`✨ ปรับค่า Planned Production Time เป็น ${batchHours} ชม./เดือน ให้กับทุกเครื่อง (${machines.length} เครื่อง) เรียบร้อย (กด "บันทึก" เพื่อยืนยัน)`);
  };

  // Apply batch to only filtered line
  const handleApplyToFilteredLine = () => {
    if (selectedLine === 'all') return;
    if (batchHours <= 0) return;
    setMachineHoursMap(prev => {
      const updated = { ...prev };
      filteredMachines.forEach(m => {
        updated[m.id] = batchHours;
      });
      return updated;
    });
    showToast(`✨ ปรับค่า ${batchHours} ชม./เดือน ให้กับไลน์ "${selectedLine}" (${filteredMachines.length} เครื่อง) แล้ว`);
  };

  // Save all changes
  const handleSaveAll = () => {
    // Commit to parent
    Object.entries(machineHoursMap).forEach(([mId, hrs]) => {
      onSaveMachine(mId, hrs);
    });
    showToast(`✅ บันทึก Planned Production Time รายเครื่องจักรลงฐานข้อมูลเรียบร้อยแล้ว (${machines.length} เครื่อง)`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      id="planned-production-time-modal-overlay"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col"
        id="planned-production-time-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex justify-between items-start">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400 mt-0.5">
              <Clock size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-cyan-500/15 text-cyan-300 font-mono font-black text-[10.5px] rounded border border-cyan-500/25">
                  TPM PM Pillar Standard
                </span>
                <span className="text-[11px] text-slate-400">
                  ฐานข้อมูล MTTR / MTBF Engine
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-100 mt-1">
                กำหนด Planned Production Time (เวลาผลิตที่วางแผน) รายเครื่องจักร
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                เวลาที่วางแผนให้เครื่องจักรพร้อมสำหรับการผลิต (ชม./เดือน) ใช้เป็นฐานคำนวณ % Breakdown, MTTR และ MTBF ตามมาตรฐาน CPRAM
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Section 1: Presets and Batch Settings */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400" />
                กำหนดค่าด่วนมาตรฐาน (Preset Quick Setting)
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                ค่าปัจจุบันมาตรฐาน: <strong className="text-cyan-400">{batchHours} ชม./เดือน</strong>
              </span>
            </div>

            {/* Quick preset buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handlePresetClick(600)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                  batchHours === 600 
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-sm shadow-cyan-500/30' 
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-200 border-slate-700'
                }`}
              >
                <span>600 ชม./เดือน</span>
                <span className="text-[9.5px] opacity-75 font-normal">(มาตรฐาน CPRAM TPM)</span>
              </button>

              <button
                type="button"
                onClick={() => handlePresetClick(480)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                  batchHours === 480 
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-sm shadow-cyan-500/30' 
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-200 border-slate-700'
                }`}
              >
                <span>480 ชม./เดือน</span>
                <span className="text-[9.5px] opacity-75 font-normal">(2 กะ x 8 ชม. x 30 วัน)</span>
              </button>

              <button
                type="button"
                onClick={() => handlePresetClick(720)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                  batchHours === 720 
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-sm shadow-cyan-500/30' 
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-200 border-slate-700'
                }`}
              >
                <span>720 ชม./เดือน</span>
                <span className="text-[9.5px] opacity-75 font-normal">(24 ชม. เต็มเดือน)</span>
              </button>

              <button
                type="button"
                onClick={() => handlePresetClick(300)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                  batchHours === 300 
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-sm shadow-cyan-500/30' 
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-200 border-slate-700'
                }`}
              >
                <span>300 ชม./เดือน</span>
                <span className="text-[9.5px] opacity-75 font-normal">(1 กะ 10 ชม. x 30 วัน)</span>
              </button>
            </div>

            {/* Batch apply actions */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">ระบุค่ากำหนดเอง:</span>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={batchHours}
                    onChange={(e) => setBatchHours(Number(e.target.value))}
                    className="w-24 bg-slate-900 border border-slate-700 text-cyan-300 font-mono font-bold text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-cyan-400 text-center"
                  />
                  <span className="text-[10px] text-slate-400 ml-1.5">ชม./เดือน</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleApplyBatch}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm shadow-amber-500/20 cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>นำค่า {batchHours} ชม. ไปใช้กับทุกเครื่อง ({machines.length} เครื่อง)</span>
              </button>

              {selectedLine !== 'all' && (
                <button
                  type="button"
                  onClick={handleApplyToFilteredLine}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-cyan-500/30 font-bold rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>ใช้เฉพาะไลน์ "{selectedLine}" ({filteredMachines.length} เครื่อง)</span>
                </button>
              )}
            </div>
          </div>

          {/* Section 2: Individual Machine Adjustments */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Factory size={15} className="text-cyan-400" />
                ปรับแต่ง Planned Production Time แยกตามรายเครื่องจักร ({filteredMachines.length} เครื่อง)
              </h4>

              {/* Filter controls */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาเครื่อง..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-750 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <select
                  value={selectedLine}
                  onChange={(e) => setSelectedLine(e.target.value)}
                  className="bg-slate-950 border border-slate-750 text-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="all">ทุกไลน์ ({machines.length})</option>
                  {lineGroups.map(lg => (
                    <option key={lg} value={lg}>{lg}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table of Machines */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40 max-h-[360px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10 text-slate-400 text-[10.5px] uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">รหัสเครื่องจักร</th>
                    <th className="py-2.5 px-3">ชื่อเครื่องจักร</th>
                    <th className="py-2.5 px-3">ไลน์ผลิต</th>
                    <th className="py-2.5 px-3 text-center">Planned Time (ชม./เดือน)</th>
                    <th className="py-2.5 px-3 text-center">ชั่วโมง/วัน (เฉลี่ย 30 วัน)</th>
                    <th className="py-2.5 px-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredMachines.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                        ไม่พบเครื่องจักรที่ตรงกับคำค้นหา
                      </td>
                    </tr>
                  ) : (
                    filteredMachines.map(m => {
                      const currentHours = machineHoursMap[m.id] ?? (m.plannedProductionHours ?? (defaultHours || 600));
                      const dailyAvg = (currentHours / 30).toFixed(1);
                      const isCustom = currentHours !== 600;

                      return (
                        <tr key={m.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-2 px-3">
                            <span className="font-mono font-bold text-cyan-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-xs">
                              {m.id}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-200 font-medium truncate max-w-[180px]" title={m.name}>
                            {m.name}
                          </td>
                          <td className="py-2 px-3 text-slate-400 text-[11px] truncate max-w-[130px]" title={m.lineGroup}>
                            {m.lineGroup || '-'}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <input
                                type="number"
                                min="1"
                                max="10000"
                                value={currentHours}
                                onChange={(e) => handleHoursChange(m.id, Number(e.target.value))}
                                className={`w-20 font-mono font-bold text-xs px-2 py-1 rounded text-center border focus:outline-none transition ${
                                  isCustom 
                                    ? 'bg-amber-950/30 border-amber-500/50 text-amber-300' 
                                    : 'bg-slate-900 border-slate-750 text-slate-200 focus:border-cyan-400'
                                }`}
                              />
                              <span className="text-[10px] text-slate-400">ชม.</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-400">
                            ~{dailyAvg} ชม./วัน
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleHoursChange(m.id, 600)}
                              className="px-2 py-0.5 text-[10px] text-slate-400 hover:text-cyan-300 bg-slate-800 hover:bg-slate-750 rounded transition cursor-pointer"
                              title="รีเซ็ตเป็นค่ามาตรฐาน 600 ชม."
                            >
                              ตั้ง 600 ชม.
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Standards formula note */}
          <div className="p-3 bg-cyan-950/20 border border-cyan-800/40 rounded-xl flex items-start gap-2.5 text-xs text-slate-300">
            <AlertCircle size={16} className="text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-cyan-300">
                สูตรการคำนวณ PM Pillar ที่สัมพันธ์กับ Planned Production Time:
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-400">
                <li><strong className="text-slate-200">% Breakdown</strong> = (Breakdown Time / Planned Production Time) × 100</li>
                <li><strong className="text-slate-200">MTBF</strong> = (Planned Production Time - Breakdown Time) / Number of Failures</li>
                <li><strong className="text-slate-200">Availability</strong> = (MTBF / (MTBF + MTTR)) × 100 = 100% - % Breakdown</li>
              </ul>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-slate-400">
            เครื่องจักรทั้งหมด: <strong className="text-slate-200 font-mono">{machines.length} เครื่อง</strong> | 
            ค่าที่จะถูกบันทึก: <strong className="text-cyan-400 font-mono"> Planned Production Time รายเครื่อง</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-black rounded-xl transition flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              <Save size={15} />
              <span>บันทึกข้อมูลลงฐานข้อมูล</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
