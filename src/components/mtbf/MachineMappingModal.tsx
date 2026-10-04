import React, { useState } from 'react';
import { RoomConfig } from '../../types/mtbf';
import { RepairLog } from '../../types';
import { resolveRepairToRoomAndMachine } from '../../utils/mtbfCalculator';
import { X, Check, Link2, AlertTriangle, ShieldCheck, Plus, Trash2, RotateCcw } from 'lucide-react';

interface MachineMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: RoomConfig[];
  repairs: RepairLog[];
  customMappings: Record<string, { roomId: string; machineId: string }>;
  onSaveMappings: (mappings: Record<string, { roomId: string; machineId: string }>) => void;
}

export const MachineMappingModal: React.FC<MachineMappingModalProps> = ({
  isOpen,
  onClose,
  rooms,
  repairs,
  customMappings,
  onSaveMappings
}) => {
  const [localMappings, setLocalMappings] = useState<Record<string, { roomId: string; machineId: string }>>({
    ...customMappings
  });

  const [newRepairIdInput, setNewRepairIdInput] = useState('');
  const [newRoomIdInput, setNewRoomIdInput] = useState(rooms[0]?.id || 'room-1');
  const [newMachineIdInput, setNewMachineIdInput] = useState(rooms[0]?.machines[0]?.id || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  // Extract all unique machineIds from repair history
  const repairMachineStats = new Map<string, { count: number; sampleDate: string }>();
  repairs.forEach(r => {
    const rawId = (r.machineId || '').trim();
    if (!rawId) return;
    if (!repairMachineStats.has(rawId)) {
      repairMachineStats.set(rawId, { count: 0, sampleDate: r.date || '' });
    }
    const item = repairMachineStats.get(rawId)!;
    item.count++;
  });

  const allDistinctMachineIds = Array.from(repairMachineStats.keys()).sort();

  const handleUpdateMapping = (repairMachId: string, roomId: string, machineId: string) => {
    setLocalMappings(prev => ({
      ...prev,
      [repairMachId]: { roomId, machineId }
    }));
  };

  const handleRemoveMapping = (repairMachId: string) => {
    setLocalMappings(prev => {
      const copy = { ...prev };
      delete copy[repairMachId];
      return copy;
    });
  };

  const handleAddNewMapping = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newRepairIdInput.trim();
    if (!cleanId) return;

    setLocalMappings(prev => ({
      ...prev,
      [cleanId]: { roomId: newRoomIdInput, machineId: newMachineIdInput }
    }));

    setNewRepairIdInput('');
  };

  const handleResetToSmartDefaults = () => {
    setLocalMappings({});
  };

  const handleSave = () => {
    onSaveMappings(localMappings);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="bg-[#0b1325] border border-slate-700 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Link2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>ตั้งค่าการจับคู่เครื่องจักรและห้อง (Machine & Room Mapping)</span>
              </h3>
              <p className="text-xs text-slate-400">
                กำหนดว่ารหัสเครื่องจากประวัติงานซ่อม ให้จัดเข้าห้องใดและเครื่องใดในการคำนวณ MTBF / MTTR (บันทึกถาวร)
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

        {/* Add custom mapping form bar */}
        <form onSubmit={handleAddNewMapping} className="p-4 bg-slate-900/80 border-b border-slate-800 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-bold text-slate-300 whitespace-nowrap">+ เพิ่มการจับคู่ใหม่:</span>
          <input
            type="text"
            value={newRepairIdInput}
            onChange={(e) => setNewRepairIdInput(e.target.value)}
            placeholder="รหัสในใบซ่อม เช่น BCV01"
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-cyan-500 w-36"
          />
          <span className="text-slate-500">→</span>
          <select
            value={newRoomIdInput}
            onChange={(e) => {
              const rId = e.target.value;
              setNewRoomIdInput(rId);
              const room = rooms.find(r => r.id === rId);
              if (room && room.machines.length > 0) {
                setNewMachineIdInput(room.machines[0].id);
              }
            }}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            {rooms.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <select
            value={newMachineIdInput}
            onChange={(e) => setNewMachineIdInput(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
          >
            {rooms.find(r => r.id === newRoomIdInput)?.machines.map(m => (
              <option key={m.id} value={m.id}>{m.id} ({m.name})</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!newRepairIdInput.trim()}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Plus size={14} />
            <span>จับคู่</span>
          </button>

          <button
            type="button"
            onClick={handleResetToSmartDefaults}
            className="ml-auto text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>คืนค่า Smart Auto-Mapping</span>
          </button>
        </form>

        {/* Table of all machines found in repairs */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          <div className="rounded-2xl border border-slate-800 overflow-hidden">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-300 border-b border-slate-800">
                  <th className="py-2.5 px-3 font-bold">รหัสเครื่องในประวัติซ่อม</th>
                  <th className="py-2.5 px-3 font-bold text-center">จำนวนงานซ่อม</th>
                  <th className="py-2.5 px-3 font-bold">ห้องที่จับคู่ (Room)</th>
                  <th className="py-2.5 px-3 font-bold">เครื่องจักรเป้าหมาย (Target M/C)</th>
                  <th className="py-2.5 px-3 font-bold text-center">สถานะการจับคู่</th>
                  <th className="py-2.5 px-3 font-bold text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {allDistinctMachineIds.map(machId => {
                  const stats = repairMachineStats.get(machId)!;
                  const mockRepair: RepairLog = {
                    id: 'temp',
                    type: 'Repair',
                    machineId: machId,
                    technician: '',
                    date: stats.sampleDate || '2026-01-01',
                    breakdownTime: '',
                    repairDoneTime: '',
                    symptoms: machId,
                    why1: '',
                    why2: '',
                    why3: '',
                    why4: '',
                    why5: '',
                    correctiveAction: '',
                    duration: 0
                  };

                  const resolved = resolveRepairToRoomAndMachine(mockRepair, rooms, localMappings);
                  const isCustom = Boolean(localMappings[machId]);
                  const currentRoomId = resolved.room?.id || rooms[0]?.id || 'room-1';
                  const currentMachineId = resolved.machine?.id || rooms.find(r => r.id === currentRoomId)?.machines[0]?.id || '';

                  return (
                    <tr key={machId} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-cyan-300">
                        {machId}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                          {stats.count} ครั้ง
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={currentRoomId}
                          onChange={(e) => {
                            const newRId = e.target.value;
                            const newRoom = rooms.find(r => r.id === newRId);
                            const firstMId = newRoom?.machines[0]?.id || '';
                            handleUpdateMapping(machId, newRId, firstMId);
                          }}
                          className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-cyan-500 w-full"
                        >
                          {rooms.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={currentMachineId}
                          onChange={(e) => {
                            handleUpdateMapping(machId, currentRoomId, e.target.value);
                          }}
                          className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500 w-full"
                        >
                          {rooms.find(r => r.id === currentRoomId)?.machines.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.id} : {m.name} (Rank {m.ranking})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {resolved.room ? (
                          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            isCustom 
                              ? 'bg-purple-950 text-purple-300 border border-purple-500/40' 
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          }`}>
                            <ShieldCheck size={11} />
                            {isCustom ? 'กำหนดเอง' : 'ตรงกัน'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-950 text-rose-300 border border-rose-500/40">
                            <AlertTriangle size={11} />
                            ยังไม่จับคู่
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isCustom && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMapping(machId)}
                            className="p-1 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                            title="ยกเลิกการจับคู่กำหนดเอง"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
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
            id="btn-save-machine-mapping"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/20 transition flex items-center gap-2 cursor-pointer"
          >
            {savedSuccess ? (
              <>
                <Check size={16} className="text-emerald-950" />
                <span>บันทึก Mapping แล้ว</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>บันทึกการจับคู่ถาวร</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
