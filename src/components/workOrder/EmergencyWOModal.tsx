import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Zap, AlertTriangle, X, CheckCircle2, ShieldAlert, Clock, User, Wrench } from 'lucide-react';

interface EmergencyWOModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (woId: string) => void;
  initialMachineId?: string;
  initialSymptoms?: string;
  linkedRequestId?: string;
}

export const EmergencyWOModal: React.FC<EmergencyWOModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  initialMachineId,
  initialSymptoms,
  linkedRequestId
}) => {
  const { machines, technicians, currentUser, createEmergencyBreakdownWorkOrder, updateWorkRequest } = useApp();

  const [machineId, setMachineId] = useState<string>(initialMachineId || 'ATS03');
  const [symptoms, setSymptoms] = useState<string>(initialSymptoms || '');
  const [leadTech, setLeadTech] = useState<string>(technicians[0] || 'ช่างอุ้ย');
  const [targetDurationMins, setTargetDurationMins] = useState<number>(45);
  const [lotoTag, setLotoTag] = useState<string>(`LOTO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`);
  const [isLotoNeeded, setIsLotoNeeded] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineId || !symptoms.trim() || !leadTech) return;

    const mach = machines.find(m => m.id === machineId);
    const title = symptoms.trim().slice(0, 50);

    const created = createEmergencyBreakdownWorkOrder({
      machineId,
      title: `${mach?.name || machineId}: ${title}`,
      symptoms: symptoms.trim(),
      leadTech,
      targetDurationMins,
      lotoTag: isLotoNeeded ? lotoTag : undefined
    });

    if (linkedRequestId) {
      updateWorkRequest(linkedRequestId, {
        linkedWorkOrderId: created.id,
        workOrderNo: created.id,
        status: 'รับแจ้งแล้ว'
      });
    }

    if (onCreated) onCreated(created.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-[#0b1325] border border-rose-500/50 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-rose-500/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-950/80 via-rose-900/60 to-slate-900 border-b border-rose-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400">
              <Zap size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                  ⚡ ออกใบสั่งงานฉุกเฉิน (Emergency Fast-Track WO)
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500 text-slate-950 font-black">
                  ไลน์หยุด
                </span>
              </div>
              <p className="text-xs text-rose-200/80 mt-0.5">
                ยึดหลัก <strong>No Work Order - No Work</strong>: ออก WO ด่วนใน 10 วินาที ปล่อยงานทันที ไม่ขวางการกู้เครื่องจักร
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {/* Machine Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              เครื่องจักรที่เกิดเหตุขัดข้อง *
            </label>
            <select
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-semibold focus:outline-none focus:border-rose-500 cursor-pointer"
              required
            >
              {machines.map(m => (
                <option key={m.id} value={m.id}>
                  [{m.id}] {m.name} ({m.lineGroup || 'ทั่วไป'})
                </option>
              ))}
            </select>
          </div>

          {/* Symptoms */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              อาการเสีย / ปัญหาฉุกเฉินที่พบหน้างาน *
            </label>
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="ระบุอาการเสีย เช่น มอเตอร์ไม่หมุน, สายพานหลุด, ซีลรั่วซึม, เกิดความร้อนสูงผิดปกติ..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
              required
            />
          </div>

          {/* Tech and Target Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User size={14} className="text-rose-400" />
                ช่างผู้รับผิดชอบหลัก *
              </label>
              <select
                value={leadTech}
                onChange={(e) => setLeadTech(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-medium focus:outline-none focus:border-rose-500 cursor-pointer"
                required
              >
                {technicians.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock size={14} className="text-rose-400" />
                เป้าหมายกู้เครื่องเสร็จ (นาที) *
              </label>
              <input
                type="number"
                min={5}
                max={480}
                value={targetDurationMins}
                onChange={(e) => setTargetDurationMins(parseInt(e.target.value, 10) || 45)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono font-bold focus:outline-none focus:border-rose-500"
                required
              />
            </div>
          </div>

          {/* Safety & LOTO */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-200">
                <input
                  type="checkbox"
                  checked={isLotoNeeded}
                  onChange={(e) => setIsLotoNeeded(e.target.checked)}
                  className="rounded border-slate-700 text-rose-500 focus:ring-rose-500"
                />
                <span className="flex items-center gap-1.5 text-amber-300">
                  <ShieldAlert size={15} />
                  ต้องตัดพลังงานและล็อกนิรภัย LOTO (Safety Tagout)
                </span>
              </label>
            </div>

            {isLotoNeeded && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">หมายเลขแท็ก:</span>
                <input
                  type="text"
                  value={lotoTag}
                  onChange={(e) => setLotoTag(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-900 border border-amber-500/40 text-amber-300 font-mono text-xs rounded-lg flex-1"
                />
              </div>
            )}
          </div>

          {/* Notice banner */}
          <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/40 text-[11.5px] text-rose-200 flex items-start gap-2">
            <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
            <span>
              เมื่อกดสร้าง ใบสั่งงานจะถูกตั้งสถานะเป็น <strong>"ปล่อยงานแล้ว (Released)"</strong> ทันที ช่างสามารถลงมือปฏิบัติงานได้ทันทีโดยไม่ติดขัดขั้นตอน และจะถูกบันทึกเข้าสู่วินัย CMMS อัตโนมัติ
            </span>
          </div>

          {/* Footer buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-rose-950/50 transition cursor-pointer"
            >
              <Zap size={16} className="fill-slate-950 stroke-none" />
              <span>ออกใบสั่งงานฉุกเฉินและปล่อยงานทันที</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
