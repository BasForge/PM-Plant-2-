import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PMScheduleItem, PMRescheduleHistoryItem } from '../types';
import { 
  Calendar, Clock, AlertTriangle, RefreshCw, Send, CheckCircle2, 
  X, HelpCircle, User, Wrench, FileText, ArrowRight, History
} from 'lucide-react';
import { RESCHEDULE_REASONS, getTodayDateString, getPMOverdueDays, isPMOverdue } from '../utils/pmAlerts';

interface PMRescheduleModalProps {
  job: PMScheduleItem;
  onClose: () => void;
  onSuccess?: (updatedJob: PMScheduleItem) => void;
}

export const PMRescheduleModal: React.FC<PMRescheduleModalProps> = ({ job, onClose, onSuccess }) => {
  const { schedules, setSchedules, machines, pmPlans, technicians, settings } = useApp();

  const todayStr = getTodayDateString();
  const isOverdue = isPMOverdue(job, todayStr);
  const overdueDays = getPMOverdueDays(job, todayStr);

  const machineObj = machines.find(m => m.id === job.machineId);
  const planObj = pmPlans.find(p => p.id === job.pmPlanId);

  // Form states
  const [newDate, setNewDate] = useState<string>(() => {
    // Default to tomorrow or next 3 days
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  const [selectedReason, setSelectedReason] = useState<string>(RESCHEDULE_REASONS[0]);
  const [customReasonText, setCustomReasonText] = useState<string>('');
  const [selectedTech, setSelectedTech] = useState<string>(job.technician || technicians[0] || 'ช่าง 1');
  const [selectedCoTechs, setSelectedCoTechs] = useState<string[]>(job.technicians || [job.technician || 'ช่าง 1']);
  const [notes, setNotes] = useState<string>('');
  const [sendLineAlert, setSendLineAlert] = useState<boolean>(settings.lineNotifyEnabled || false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // Quick date jump helpers
  const handleQuickAddDays = (days: number) => {
    const base = new Date();
    base.setDate(base.getDate() + days);
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, '0');
    const d = String(base.getDate()).padStart(2, '0');
    setNewDate(`${y}-${m}-${d}`);
  };

  const handleToggleCoTech = (tech: string) => {
    setSelectedCoTechs(prev => 
      prev.includes(tech) ? prev.filter(t => t !== tech) : [...prev, tech]
    );
  };

  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newDate) {
      alert('กรุณาระบุกำหนดการวันที่ใหม่');
      return;
    }

    if (newDate === job.date) {
      if (!confirm('วันที่ใหม่ตรงกับวันที่เดิม คุณแน่ใจหรือไม่ว่าต้องการใช้ตอนนี้?')) {
        return;
      }
    }

    const finalReason = selectedReason.includes('อื่น ๆ') && customReasonText.trim()
      ? `อื่น ๆ: ${customReasonText.trim()}`
      : selectedReason;

    setIsSubmitting(true);

    const nowIso = new Date().toISOString();
    const newHistoryEntry: PMRescheduleHistoryItem = {
      id: `reshist-${Date.now()}`,
      fromDate: job.date,
      toDate: newDate,
      reason: finalReason,
      rescheduledAt: nowIso.replace('T', ' ').slice(0, 19),
      byTech: selectedTech,
      notes: notes.trim() || undefined
    };

    const previousHistory = job.rescheduleHistory || [];
    const newCount = (job.rescheduledCount || 0) + 1;
    const originalFromDate = job.rescheduledFromDate || job.date;

    const updatedJob: PMScheduleItem = {
      ...job,
      date: newDate,
      technician: selectedTech,
      technicians: selectedCoTechs.length > 0 ? selectedCoTechs : [selectedTech],
      rescheduledFromDate: originalFromDate,
      rescheduledReason: finalReason,
      rescheduledCount: newCount,
      rescheduleHistory: [newHistoryEntry, ...previousHistory],
      status: 'รอดำเนินการ'
    };

    // Update schedules
    setSchedules(prev => prev.map(s => (s.id === job.id ? updatedJob : s)));

    // Send LINE Notify if requested
    if (sendLineAlert && settings.lineNotifyEnabled && settings.lineNotifyToken) {
      try {
        const lineMsg = `\n🔄 [แจ้งเตือนการเลื่อนแผน PM]\n` +
          `⚙️ เครื่องจักร: [${job.machineId}] ${machineObj?.name || ''}\n` +
          `📋 แผนงาน: ${planObj?.title || 'งาน PM'}\n` +
          `📅 แผนเดิม: ${job.date} ${isOverdue ? `(เลยกำหนดมาแล้ว ${overdueDays} วัน)` : ''}\n` +
          `➡️ เลื่อนไปวันที่ใหม่: ${newDate}\n` +
          `📌 สาเหตุที่เลื่อน: ${finalReason}\n` +
          `👨‍🔧 ช่างผู้ดูแล: ${selectedTech}\n` +
          `${notes ? `💬 หมายเหตุ: ${notes}\n` : ''}` +
          `------------------------------------\n` +
          `ระบบลงบันทึกประวัติการเลื่อนแผนเรียบร้อยแล้ว`;

        await fetch('/api/line-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: lineMsg,
            token: settings.lineNotifyToken
          })
        });
      } catch (err) {
        console.error('Failed to send LINE notification for reschedule:', err);
      }
    }

    setIsSubmitting(false);
    if (onSuccess) onSuccess(updatedJob);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto"
      id="pm-reschedule-modal-overlay"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-[#0b1222] border border-cyan-500/40 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 text-slate-100 my-8"
        onClick={(e) => e.stopPropagation()}
        id="pm-reschedule-modal-container"
      >
        {/* Header */}
        <div className="p-4 bg-[#080d1a] border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/25 text-amber-400">
              <RefreshCw size={18} className="animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wide text-white flex items-center gap-2">
                จัดการเลื่อนแผนงาน PM (Reschedule Plan)
              </h2>
              <p className="text-[10px] text-slate-400">
                บันทึกการขยับวันนัดหมายใหม่ พร้อมจัดเก็บสถิติสาเหตุความคลาดเคลื่อนตามมาตรฐาน TPM
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleConfirmReschedule} className="p-5 space-y-4 text-xs font-sans">
          
          {/* Overdue Warning Alert Box (if past due) */}
          {isOverdue && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3">
              <AlertTriangle className="text-rose-400 shrink-0 mt-0.5" size={18} />
              <div className="space-y-0.5">
                <p className="font-bold text-rose-300 text-xs flex items-center gap-1.5">
                  งานนี้เลยกำหนดตามแผนแล้ว {overdueDays} วัน
                  <span className="text-[10px] px-1.5 py-0.2 bg-rose-500/20 text-rose-300 rounded font-mono">
                    เลยกำหนดแผน
                  </span>
                </p>
                <p className="text-[10.5px] text-slate-300">
                  กำหนดเดิมคือ <b className="text-white font-mono">{job.date}</b> แต่ยังไม่ได้ลงบันทึกเสร็จงาน ระบบจำเป็นต้องบันทึกเหตุผลการเลื่อนแผนเพื่อการปรับปรุง KPI
                </p>
              </div>
            </div>
          )}

          {/* Machine & PM Plan Card Info */}
          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 grid grid-cols-2 gap-3">
            <div>
              <span className="text-[9.5px] text-slate-400 uppercase font-bold tracking-wider">เครื่องจักรเป้าหมาย</span>
              <p className="text-xs font-black text-cyan-400 mt-0.5 flex items-center gap-1">
                <Wrench size={12} /> {job.machineId} - {machineObj?.name || 'เครื่องจักร'}
              </p>
              <span className="text-[10px] text-slate-400 font-medium">{machineObj?.lineGroup || '-'}</span>
            </div>
            <div>
              <span className="text-[9.5px] text-slate-400 uppercase font-bold tracking-wider">รายการแผน PM</span>
              <p className="text-xs font-bold text-slate-200 mt-0.5 truncate" title={planObj?.title}>
                {planObj?.title || 'งานบำรุงรักษา'}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                <span className="px-1.5 py-0.2 bg-slate-800 rounded font-mono text-[9px]">{planObj?.frequency || 'รายเดือน'}</span>
                <span>มาตรฐาน {job.duration} นาที</span>
              </div>
            </div>
          </div>

          {/* Previous Reschedule Indicator */}
          {(job.rescheduledCount || 0) > 0 && (
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/25 rounded-xl flex items-center justify-between text-[11px] text-indigo-300">
              <div className="flex items-center gap-1.5">
                <History size={14} className="text-indigo-400" />
                <span>
                  งานนี้เคยเลื่อนแผนมาแล้ว <b>{job.rescheduledCount} ครั้ง</b> (แผนดั้งเดิม: <span className="font-mono font-bold text-white">{job.rescheduledFromDate}</span>)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="text-[10px] font-bold text-indigo-400 hover:underline cursor-pointer"
              >
                {showHistory ? 'ซ่อนประวัติ' : 'ดูประวัติการเลื่อน'}
              </button>
            </div>
          )}

          {/* Previous History Expanded List */}
          {showHistory && job.rescheduleHistory && job.rescheduleHistory.length > 0 && (
            <div className="bg-[#050a14] p-3 rounded-xl border border-slate-800 space-y-2 max-h-36 overflow-y-auto">
              <p className="text-[10px] font-bold text-slate-400 uppercase">ประวัติการเลื่อนแผนที่ผ่านมา:</p>
              {job.rescheduleHistory.map((hist, idx) => (
                <div key={idx} className="text-[10.5px] border-b border-slate-850 pb-1.5 last:border-0 last:pb-0">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="font-mono text-cyan-400 font-bold">
                      {hist.fromDate} <ArrowRight size={10} className="inline mx-1" /> {hist.toDate}
                    </span>
                    <span className="text-[9px] text-slate-500">{hist.rescheduledAt}</span>
                  </div>
                  <p className="text-[10px] text-amber-300/90 mt-0.5">📌 {hist.reason}</p>
                  {hist.notes && <p className="text-[9.5px] text-slate-400 italic mt-0.5">💬 {hist.notes}</p>}
                </div>
              ))}
            </div>
          )}

          {/* DATE ADJUSTMENT PICKER */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] text-slate-300 font-bold uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Calendar size={13} /> วันที่นัดหมายใหม่ตามแผนเลื่อน <span className="text-rose-400">*</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                (แผนเดิม: <span className="font-mono font-bold text-amber-400">{job.date}</span>)
              </span>
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full bg-[#050a14] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-cyan-500 font-mono font-bold"
              required
            />
            
            {/* Quick date jumps */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[9.5px] text-slate-400">เลือกด่วน:</span>
              <button
                type="button"
                onClick={() => handleQuickAddDays(1)}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] border border-slate-700 transition"
              >
                +1 วัน (พรุ่งนี้)
              </button>
              <button
                type="button"
                onClick={() => handleQuickAddDays(3)}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] border border-slate-700 transition"
              >
                +3 วัน
              </button>
              <button
                type="button"
                onClick={() => handleQuickAddDays(7)}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] border border-slate-700 transition"
              >
                +7 วัน (สัปดาห์หน้า)
              </button>
              <button
                type="button"
                onClick={() => handleQuickAddDays(14)}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] border border-slate-700 transition"
              >
                +14 วัน
              </button>
            </div>
          </div>

          {/* REASON FOR RESCHEDULE */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span>สาเหตุและเหตุผลการเลื่อนแผน (Reschedule Reason)</span>
              <span className="text-rose-400">*</span>
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full bg-[#050a14] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-cyan-500"
              required
            >
              {RESCHEDULE_REASONS.map((reason, idx) => (
                <option key={idx} value={reason}>{reason}</option>
              ))}
            </select>

            {selectedReason.includes('อื่น ๆ') && (
              <input
                type="text"
                placeholder="ระบุสาเหตุเพิ่มเติม..."
                value={customReasonText}
                onChange={(e) => setCustomReasonText(e.target.value)}
                className="w-full bg-[#050a14] border border-amber-500/50 rounded-xl px-3 py-1.8 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 mt-1"
                required
              />
            )}
          </div>

          {/* ASSIGNED TECHNICIAN & CO-TECHNICIANS */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <User size={13} className="text-cyan-400" />
              <span>ช่างผู้รับผิดชอบหลัก & ทีมช่างในรอบใหม่</span>
            </label>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[9.5px] text-slate-400">ช่างหลัก:</span>
                <select
                  value={selectedTech}
                  onChange={(e) => setSelectedTech(e.target.value)}
                  className="w-full bg-[#050a14] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-cyan-500 mt-0.5"
                >
                  {technicians.map((t, idx) => (
                    <option key={idx} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[9.5px] text-slate-400">ช่างร่วม ({selectedCoTechs.length} คน):</span>
                <div className="flex flex-wrap gap-1 mt-1 max-h-20 overflow-y-auto p-1 bg-[#050a14] border border-slate-800 rounded-lg">
                  {technicians.map((t, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleToggleCoTech(t)}
                      className={`px-1.5 py-0.5 text-[9.5px] rounded transition ${
                        selectedCoTechs.includes(t) 
                          ? 'bg-cyan-500 text-slate-950 font-bold' 
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* NOTES & REMARKS */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={13} className="text-cyan-400" />
              <span>หมายเหตุเพิ่มเติม / ข้อตกลงกับฝ่ายผลิต</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ระบุข้อตกลง เช่น ประสานงานหัวหน้ากะ A เรียบร้อยแล้ว ย้ายไปทำช่วงพักเที่ยง..."
              className="w-full bg-[#050a14] border border-slate-700 rounded-xl px-3 py-1.8 text-xs text-white placeholder-slate-600 focus:outline-hidden focus:border-cyan-500"
            />
          </div>

          {/* SEND LINE NOTIFY OPTION */}
          {settings.lineNotifyEnabled && (
            <label className="flex items-center gap-2 p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl cursor-pointer hover:bg-emerald-500/10 transition">
              <input
                type="checkbox"
                checked={sendLineAlert}
                onChange={(e) => setSendLineAlert(e.target.checked)}
                className="rounded border-slate-700 text-emerald-500 focus:ring-0"
              />
              <span className="text-[11px] text-slate-300 flex items-center gap-1.5">
                <Send size={12} className="text-emerald-400" />
                <span>ส่งข้อความแจ้งเตือนการเลื่อนแผนเข้ากลุ่ม LINE ซ่อมบำรุงทันที</span>
              </span>
            </label>
          )}

          {/* ACTION BUTTONS */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 rounded-xl text-xs font-black transition cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              <CheckCircle2 size={15} />
              <span>{isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันการเลื่อนแผน PM'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
