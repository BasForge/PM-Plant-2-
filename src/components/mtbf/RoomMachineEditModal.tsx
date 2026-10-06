import React, { useState, useEffect, useMemo } from 'react';
import { RoomConfig, RoomMachineConfig } from '../../types/mtbf';
import { Machine, RepairLog } from '../../types';
import { X, Check, Wrench, Search, AlertTriangle, Plus, Trash2, ShieldCheck, ArrowRight, Info } from 'lucide-react';

interface RoomMachineEditModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  room: RoomConfig;
  machine?: RoomMachineConfig | null;
  allRegisteredMachines: Machine[];
  repairs: RepairLog[];
  year: number;
  onSave: (machineData: RoomMachineConfig, oldMachineId?: string) => void;
  onDelete?: (machineId: string) => void;
  onClose: () => void;
}

export const RoomMachineEditModal: React.FC<RoomMachineEditModalProps> = ({
  isOpen,
  mode,
  room,
  machine,
  allRegisteredMachines,
  repairs,
  year,
  onSave,
  onDelete,
  onClose
}) => {
  const [machineId, setMachineId] = useState('');
  const [machineName, setMachineName] = useState('');
  const [ranking, setRanking] = useState<'A' | 'B' | 'C'>('A');
  const [altIdsInput, setAltIdsInput] = useState('');
  const [searchRegistry, setSearchRegistry] = useState('');
  const [showRegistryList, setShowRegistryList] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Initialize form state
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && machine) {
        setMachineId(machine.id);
        setMachineName(machine.name);
        setRanking(machine.ranking || 'A');
        setAltIdsInput((machine.altIds || []).join(', '));
      } else {
        setMachineId('');
        setMachineName('');
        setRanking('A');
        setAltIdsInput('');
      }
      setSearchRegistry('');
      setShowRegistryList(false);
      setShowDeleteConfirm(false);
      setErrorMsg('');
    }
  }, [isOpen, mode, machine]);

  // Filtered registry machines for quick picking
  const filteredRegistry = useMemo(() => {
    const q = searchRegistry.trim().toLowerCase();
    if (!q) {
      // Suggest machines matching room's lineGroup or top machines
      return allRegisteredMachines.slice(0, 15);
    }
    return allRegisteredMachines.filter(m => 
      m.id.toLowerCase().includes(q) ||
      m.name.toLowerCase().includes(q) ||
      (m.lineGroup && m.lineGroup.toLowerCase().includes(q))
    ).slice(0, 20);
  }, [allRegisteredMachines, searchRegistry]);

  // Match repairs count for real-time preview
  const matchingStats = useMemo(() => {
    const targetIds = [
      machineId.trim().toUpperCase(),
      ...altIdsInput.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    ].filter(Boolean);

    if (targetIds.length === 0) return { count: 0, totalDuration: 0 };

    const yearStr = String(year);
    let count = 0;
    let totalDuration = 0;

    for (const r of repairs) {
      const rDate = r.date || r.breakdownTime || '';
      if (!rDate.startsWith(yearStr)) continue;

      const rId = (r.machineId || '').trim().toUpperCase();
      if (targetIds.includes(rId)) {
        count++;
        totalDuration += r.duration || 0;
      }
    }

    return { count, totalDuration };
  }, [machineId, altIdsInput, repairs, year]);

  if (!isOpen) return null;

  const handleSelectFromRegistry = (selectedM: Machine) => {
    setMachineId(selectedM.id);
    setMachineName(selectedM.name);
    // If machine ID changed, keep old ID in altIds if in edit mode
    if (mode === 'edit' && machine && machine.id !== selectedM.id) {
      const currentAlts = altIdsInput.split(',').map(s => s.trim()).filter(Boolean);
      if (!currentAlts.includes(machine.id)) {
        currentAlts.unshift(machine.id);
        setAltIdsInput(currentAlts.join(', '));
      }
    }
    setShowRegistryList(false);
    setSearchRegistry('');
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = machineId.trim().toUpperCase();
    const cleanName = machineName.trim();

    if (!cleanId) {
      setErrorMsg('กรุณาระบุรหัสเครื่องจักร (Machine ID)');
      return;
    }
    if (!cleanName) {
      setErrorMsg('กรุณาระบุชื่อเครื่องจักร (Machine Name)');
      return;
    }

    // Check duplicate ID in room
    const isDuplicate = room.machines.some(m => 
      m.id.toUpperCase() === cleanId && (mode === 'add' || m.id.toUpperCase() !== machine?.id.toUpperCase())
    );
    if (isDuplicate) {
      setErrorMsg(`รหัสเครื่อง "${cleanId}" มีอยู่ในห้องนี้แล้ว`);
      return;
    }

    const cleanAltIds = altIdsInput
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(s => s && s !== cleanId);

    const newConfig: RoomMachineConfig = {
      id: cleanId,
      name: cleanName,
      ranking,
      altIds: cleanAltIds.length > 0 ? Array.from(new Set(cleanAltIds)) : undefined
    };

    onSave(newConfig, mode === 'edit' ? machine?.id : undefined);
    onClose();
  };

  const handleDelete = () => {
    if (mode === 'edit' && machine && onDelete) {
      onDelete(machine.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="bg-[#0b1325] border border-slate-700 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Wrench size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{mode === 'edit' ? 'แก้ไขรหัสและข้อมูลเครื่องจักร' : 'เพิ่มเครื่องจักรใหม่ในห้องนี้'}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 font-normal border border-cyan-800/40">
                  {room.name}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                กำหนดรหัส ID เพื่อให้ซิงค์ตรงกับทะเบียนเครื่องจักรและดึงประวัติงานซ่อมบำรุงจริง (Repair Logs)
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

        {/* Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(92vh-140px)]">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Quick Select From Registered Machines */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Search size={13} />
                <span>ค้นหาและเลือกจากทะเบียนเครื่องจักร ({allRegisteredMachines.length} เครื่อง)</span>
              </label>
              <span className="text-[10px] text-slate-500">คลิกเพื่อเติมข้อมูล ID & ชื่ออัตโนมัติ</span>
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchRegistry}
                onChange={(e) => {
                  setSearchRegistry(e.target.value);
                  setShowRegistryList(true);
                }}
                onFocus={() => setShowRegistryList(true)}
                placeholder="พิมพ์ค้นหารหัส เช่น TLP, ATS, VAC, RIM หรือชื่อเครื่อง..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />

              {showRegistryList && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#091122] border border-cyan-800/60 rounded-xl shadow-2xl max-h-52 overflow-y-auto z-30 divide-y divide-slate-800/60">
                  <div className="p-2 bg-slate-900 text-[10px] text-slate-400 font-bold flex justify-between">
                    <span>ผลลัพธ์ในทะเบียนเครื่องจักร:</span>
                    <button
                      type="button"
                      onClick={() => setShowRegistryList(false)}
                      className="text-cyan-400 hover:underline cursor-pointer"
                    >
                      ปิด
                    </button>
                  </div>
                  {filteredRegistry.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-500">
                      ไม่พบเครื่องจักรที่ตรงกับคำค้นหา
                    </div>
                  ) : (
                    filteredRegistry.map(reg => (
                      <button
                        key={reg.id}
                        type="button"
                        onClick={() => handleSelectFromRegistry(reg)}
                        className="w-full text-left p-2.5 hover:bg-cyan-950/40 transition flex items-center justify-between text-xs cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-cyan-900/60">
                            {reg.id}
                          </span>
                          <span className="text-slate-200 font-medium group-hover:text-cyan-200">
                            {reg.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {reg.lineGroup || reg.location || '-'}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 2. Main Machine Form */}
          <form id="room-machine-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Machine ID */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  รหัสเครื่องจักร (Machine ID / M/C No.) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={machineId}
                  onChange={(e) => {
                    setMachineId(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="เช่น TLP02 หรือ TFD002"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  รหัสนี้จะใช้จับคู่กับ <code>machineId</code> ในใบแจ้งซ่อมจริง
                </p>
              </div>

              {/* Ranking */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  ระดับความสำคัญเครื่องจักร (Ranking)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRanking('A')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      ranking === 'A'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-md shadow-rose-950/40'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <span>Ranking A</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRanking('B')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      ranking === 'B'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-950/40'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <span>Ranking B</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRanking('C')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      ranking === 'C'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300 shadow-md shadow-blue-950/40'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <span>Ranking C</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  A = เครื่องหลักไลน์หยุด, B = เครื่องรอง/ขนาน, C = อุปกรณ์สนับสนุน
                </p>
              </div>
            </div>

            {/* Machine Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                ชื่อเครื่องจักร (Machine Name) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={machineName}
                onChange={(e) => {
                  setMachineName(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="เช่น TOP SEALER SALAD"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-semibold text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Alternate / Alias IDs */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>รหัสอ้างอิงอื่น / รหัสเดิมในใบซ่อม (Alternate / Alias IDs)</span>
                <span className="text-[10px] font-normal text-slate-500">(คั่นด้วยเครื่องหมายจุลภาค ,)</span>
              </label>
              <input
                type="text"
                value={altIdsInput}
                onChange={(e) => setAltIdsInput(e.target.value)}
                placeholder="เช่น TFD002, TFD02, TLP02"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
              />
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                💡 <strong>เคล็ดลับ:</strong> หากเคยมีงานซ่อมที่ช่างบันทึกด้วยรหัสอื่น (เช่น พิมพ์ <code>TFD002</code> แทน <code>TLP02</code>) สามารถใส่รหัสทั้งหมดไว้ที่นี่ ระบบจะดึงยอด Breakdown มารวมให้ครบถ้วนทันที
              </p>
            </div>

            {/* 3. Live Detection Preview */}
            <div className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between transition ${
              matchingStats.count > 0 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
                : 'bg-slate-900/60 border-slate-800 text-slate-400'
            }`}>
              <div className="flex items-center gap-2.5">
                {matchingStats.count > 0 ? (
                  <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
                ) : (
                  <Info size={18} className="text-slate-500 shrink-0" />
                )}
                <div>
                  <p className="font-bold">
                    {matchingStats.count > 0 ? (
                      <span>ตรวจพบประวัติซ่อม {matchingStats.count} ครั้ง ในปี {year}</span>
                    ) : (
                      <span>ยังไม่พบประวัติซ่อมในปี {year} สำหรับรหัสนี้</span>
                    )}
                  </p>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    เวลารวม {matchingStats.totalDuration.toLocaleString()} นาที (MTTR รวม) พร้อมซิงค์เข้าตารางและกราฟทันที
                  </p>
                </div>
              </div>

              {matchingStats.count > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 font-bold font-mono text-emerald-300 text-xs shrink-0">
                  Sync Ready ✓
                </span>
              )}
            </div>
          </form>

          {/* Delete Confirmation Alert (Edit Mode) */}
          {showDeleteConfirm && (
            <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500 text-rose-200 text-xs space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold">
                <AlertTriangle size={16} />
                <span>ยืนยันการลบเครื่องจักร "{machine?.name}" ออกจากห้องนี้?</span>
              </div>
              <p className="text-[11px] text-rose-300/90">
                เครื่องนี้จะถูกนำออกจากแดชบอร์ดของห้อง {room.name} ข้อมูลประวัติงานซ่อมจะไม่ถูกลบ แต่จะไม่แสดงในกราฟห้องนี้
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer transition text-xs"
                >
                  ยืนยันลบออกจากห้อง
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer transition text-xs"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div>
            {mode === 'edit' && onDelete && !showDeleteConfirm && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/60 transition text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={14} />
                <span>ลบเครื่องออกจากห้อง</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              form="room-machine-form"
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              <Check size={14} />
              <span>{mode === 'edit' ? 'บันทึกการแก้ไข' : 'บันทึกและเพิ่มเข้าห้อง'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
