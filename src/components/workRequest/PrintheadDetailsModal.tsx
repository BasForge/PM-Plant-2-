import React, { useState, useEffect } from 'react';
import { Printer, X, Check, Trash2, Calendar, Wrench, Hash } from 'lucide-react';
import { WorkRequest } from '../../types';

interface PrintheadDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workRequest: WorkRequest | null;
  technicians: string[];
  onSave: (requestId: string, details: NonNullable<WorkRequest['printheadDetails']>) => void;
  onRemoveFromPrinthead: (requestId: string) => void;
}

export const PrintheadDetailsModal: React.FC<PrintheadDetailsModalProps> = ({
  isOpen,
  onClose,
  workRequest,
  technicians,
  onSave,
  onRemoveFromPrinthead,
}) => {
  const [model, setModel] = useState('');
  const [newSerial, setNewSerial] = useState('');
  const [oldSerial, setOldSerial] = useState('');
  const [resistance, setResistance] = useState('');
  const [voltage, setVoltage] = useState('');
  const [replacedDate, setReplacedDate] = useState('');
  const [technician, setTechnician] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (workRequest) {
      const details = workRequest.printheadDetails || {};
      setModel(details.model || '');
      setNewSerial(details.newSerial || '');
      setOldSerial(details.oldSerial || '');
      setResistance(details.resistance || '');
      setVoltage(details.voltage || '');
      setReplacedDate(details.replacedDate || workRequest.requestDate || new Date().toISOString().split('T')[0]);
      setTechnician(details.technician || workRequest.engineeringResponse?.assignedTechnicians?.[0] || '');
      setReason(details.reason || workRequest.problemTitle || '');
      setNotes(details.notes || '');
    }
  }, [workRequest]);

  if (!isOpen || !workRequest) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(workRequest.id, {
      model: model.trim() || undefined,
      newSerial: newSerial.trim() || undefined,
      oldSerial: oldSerial.trim() || undefined,
      resistance: resistance.trim() || undefined,
      voltage: voltage.trim() || undefined,
      replacedDate: replacedDate.trim() || workRequest.requestDate,
      technician: technician.trim() || undefined,
      reason: reason.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        <div className="px-6 py-4 bg-purple-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">บันทึกข้อมูลการเปลี่ยนหัวพิมพ์</h3>
              <p className="text-xs text-purple-200">
                เลขที่แจ้งซ่อม: #{workRequest.ticketNo || workRequest.id} • เครื่อง {workRequest.machineId}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Machine and Request summary */}
          <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-3 flex items-center justify-between text-slate-800">
            <div>
              <div className="font-bold text-sm text-purple-950 flex items-center gap-2">
                <span>{workRequest.machineId}</span>
                <span className="font-normal text-xs text-slate-600">({workRequest.machineName || 'เครื่องจักร'})</span>
              </div>
              <div className="text-slate-500 mt-0.5">{workRequest.lineGroup || 'ฝ่ายผลิต'}</div>
            </div>
            <div className="text-right">
              <span className="px-2.5 py-1 rounded bg-white text-purple-800 border border-purple-200 font-bold font-mono">
                {workRequest.ticketNo || workRequest.id}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                รุ่นหัวพิมพ์ (Printhead Model)
              </label>
              <input
                type="text"
                placeholder="เช่น Markem-Imaje SmartDate X40, Videojet 6330, Domino V230i"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                วันที่เปลี่ยนหัวพิมพ์
              </label>
              <input
                type="date"
                value={replacedDate}
                onChange={(e) => setReplacedDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                หมายเลขซีเรียลหัวพิมพ์ใหม่ (New Serial No.)
              </label>
              <input
                type="text"
                placeholder="เช่น PH-2026-0987"
                value={newSerial}
                onChange={(e) => setNewSerial(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-purple-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                หมายเลขซีเรียลเดิมที่ถอดเปลี่ยน (Old Serial No.)
              </label>
              <input
                type="text"
                placeholder="เช่น PH-2024-0341"
                value={oldSerial}
                onChange={(e) => setOldSerial(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                ค่าความต้านทาน / Dots (Resistance/Dot)
              </label>
              <input
                type="text"
                placeholder="เช่น 1080 Ohm, 300 DPI, 53mm"
                value={resistance}
                onChange={(e) => setResistance(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                ช่างผู้ปฏิบัติงานเปลี่ยนหัวพิมพ์
              </label>
              <input
                type="text"
                list="ph-tech-list"
                placeholder="เลือกหรือพิมพ์ชื่อช่าง"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500/20"
              />
              <datalist id="ph-tech-list">
                {technicians.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              สาเหตุการเปลี่ยน / ปัญหาของหัวพิมพ์เดิม
            </label>
            <input
              type="text"
              placeholder="เช่น ดอทขาดเส้นตรงกลางวันที่, เซรามิกบิ่นช็อต, ตัวหนังสือแตกเบลอ"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              หมายเหตุเพิ่มเติม
            </label>
            <textarea
              rows={2}
              placeholder="เช่น ทำความสะอาดลูกกลิ้ง Platen Roller แล้ว, เทสพิมพ์ 50 ชิ้น ผลงานคมชัด"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl leading-relaxed focus:bg-white focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                onRemoveFromPrinthead(workRequest.id);
                onClose();
              }}
              className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ปลดออกจากประวัติหัวพิมพ์</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>บันทึกข้อมูลหัวพิมพ์</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
