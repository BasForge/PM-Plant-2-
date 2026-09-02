import React, { useState } from 'react';
import { CD5Project, CD5UsageHistoryItem } from '../../types';
import { 
  X, Plus, Calendar, Clock, CheckCircle2, TrendingUp, 
  Trash2, ShieldCheck, User, FileText, Image as ImageIcon,
  AlertCircle
} from 'lucide-react';

interface CD5UsageHistoryModalProps {
  project: CD5Project;
  technicians: string[];
  onClose: () => void;
  onSaveHistory: (updatedProject: CD5Project) => void;
}

export const CD5UsageHistoryModal: React.FC<CD5UsageHistoryModalProps> = ({
  project,
  technicians,
  onClose,
  onSaveHistory
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formCycle, setFormCycle] = useState<number>((project.usageHistory?.length || 0) + 1);
  const [formPartType, setFormPartType] = useState<'NEW_CUSTOM' | 'ORIGINAL_OEM'>('NEW_CUSTOM');
  const [formInstalledDate, setFormInstalledDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formReplacedDate, setFormReplacedDate] = useState<string>('');
  const [formWearCondition, setFormWearCondition] = useState<string>('สมบูรณ์ดี 95-100% ผิวเรียบ คมกริบ ไร้สนิม');
  const [formTechnician, setFormTechnician] = useState<string>(technicians[0] || 'ช่าง 1');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formPhoto, setFormPhoto] = useState<string>('');

  // Handle Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('ไฟล์ภาพใหญ่เกิน 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setFormPhoto(uploadEvent.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Add new history entry
  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formInstalledDate) {
      alert('กรุณาระบุวันที่เริ่มติดตั้งใช้งาน');
      return;
    }

    const startDate = new Date(formInstalledDate);
    const endDate = formIsActive || !formReplacedDate ? new Date() : new Date(formReplacedDate);
    const diffTime = endDate.getTime() - startDate.getTime();
    const actualDays = Math.max(1, Math.floor(diffTime / (1000 * 3600 * 24)));

    const origDays = project.originalLifespanDays || 30;
    const targetDays = project.newLifespanDays || 60;
    const extensionPercent = origDays > 0 ? Number((((actualDays - origDays) / origDays) * 100).toFixed(1)) : 0;

    const newEntry: CD5UsageHistoryItem = {
      id: `HIST-${Date.now()}`,
      cycleNumber: Number(formCycle) || 1,
      partType: formPartType,
      installedDate: formInstalledDate,
      replacedDate: formIsActive ? undefined : formReplacedDate || undefined,
      status: formIsActive ? 'ACTIVE_RUNNING' : 'COMPLETED_REPLACED',
      actualRunningDays: actualDays,
      targetLifespanDays: targetDays,
      originalOemDays: origDays,
      lifespanExtensionPercent: extensionPercent,
      wearCondition: formWearCondition.trim(),
      technician: formTechnician,
      notes: formNotes.trim() || undefined,
      photoAfterUse: formPhoto || undefined
    };

    const currentHistory = project.usageHistory || [];
    const updatedHistory = [...currentHistory, newEntry];

    const updatedProject: CD5Project = {
      ...project,
      installedDate: formIsActive ? formInstalledDate : project.installedDate,
      usageHistory: updatedHistory
    };

    onSaveHistory(updatedProject);
    setShowAddForm(false);
    setFormPhoto('');
    setFormNotes('');
  };

  // Delete history entry
  const handleDeleteEntry = (entryId: string) => {
    if (window.confirm('ต้องการลบบันทึกประวัติรอบนี้หรือไม่?')) {
      const updatedHistory = (project.usageHistory || []).filter(h => h.id !== entryId);
      const updatedProject: CD5Project = {
        ...project,
        usageHistory: updatedHistory
      };
      onSaveHistory(updatedProject);
    }
  };

  const historyList = project.usageHistory || [];
  const origDays = project.originalLifespanDays || 30;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto" id="cd5-usage-history-modal">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/30 text-emerald-400">
              <Clock size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                  {project.id}
                </span>
                <h2 className="text-base font-bold text-white">
                  ประวัติอายุการใช้งานจริง เทียบกับอะไหล่ Original
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ชิ้นส่วน: <b className="text-slate-200">{project.partName}</b> | เครื่องจักร: <b className="text-cyan-300">{project.machineId}</b>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          
          {/* Top Comparison KPI Box */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-3.5 text-center">
              <span className="text-[10px] text-rose-400 font-bold uppercase block">🔴 อายุการใช้งานเดิม (OEM)</span>
              <span className="text-2xl font-black text-rose-300 block mt-1">{origDays} วัน</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">{project.originalSupplier}</span>
            </div>

            <div className="bg-cyan-950/20 border border-cyan-900/40 rounded-xl p-3.5 text-center">
              <span className="text-[10px] text-cyan-400 font-bold uppercase block">🎯 เป้าหมายอายุใช้งานใหม่ (CD5)</span>
              <span className="text-2xl font-black text-cyan-300 block mt-1">{project.newLifespanDays} วัน</span>
              <span className="text-[10px] text-teal-300 block mt-0.5">เป้าหมายยืดอายุ +{project.lifespanExtensionPercent}%</span>
            </div>

            <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-3.5 text-center">
              <span className="text-[10px] text-emerald-400 font-bold uppercase block">🟢 บันทึกสะสมในระบบ</span>
              <span className="text-2xl font-black text-emerald-300 block mt-1">{historyList.length} รอบ</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">เริ่มติดตั้งล่าสุด: {project.installedDate || 'ยังไม่ระบุ'}</span>
            </div>
          </div>

          {/* Action to Toggle Add Log Form */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <FileText size={15} className="text-emerald-400" />
              บันทึกประวัติการติดตั้งและถอดเปลี่ยนอะไหล่แต่ละรอบ
            </h3>
            
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg inline-flex items-center gap-1 transition shadow-md shadow-emerald-700/20"
            >
              <Plus size={14} />
              <span>{showAddForm ? 'ปิดแบบฟอร์ม' : '+ บันทึกรอบการใช้งาน/ถอดเปลี่ยน'}</span>
            </button>
          </div>

          {/* Add History Form */}
          {showAddForm && (
            <form onSubmit={handleAddEntry} className="bg-slate-950 border border-emerald-500/40 rounded-xl p-4 space-y-3">
              <h4 className="font-bold text-emerald-400 flex items-center gap-1 text-xs">
                <Plus size={14} /> กรอกข้อมูลรอบการใช้งานอะไหล่
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">รอบที่ (Cycle #)</label>
                  <input
                    type="number"
                    min="1"
                    value={formCycle}
                    onChange={(e) => setFormCycle(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ชนิดอะไหล่</label>
                  <select
                    value={formPartType}
                    onChange={(e) => setFormPartType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                  >
                    <option value="NEW_CUSTOM">🟢 อะไหล่สั่งทำ/ปรับปรุงใหม่ (CD5)</option>
                    <option value="ORIGINAL_OEM">🔴 อะไหล่เดิม (Original OEM)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ช่างผู้ติดตั้ง/ตรวจเช็ค</label>
                  <select
                    value={formTechnician}
                    onChange={(e) => setFormTechnician(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                  >
                    {technicians.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">วันที่เริ่มใส่/ใช้งาน *</label>
                  <input
                    type="date"
                    required
                    value={formInstalledDate}
                    onChange={(e) => setFormInstalledDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">สถานะรอบการใช้งาน</label>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="isActiveRunning"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="w-4 h-4 text-emerald-500 rounded bg-slate-900 border-slate-700"
                    />
                    <label htmlFor="isActiveRunning" className="text-emerald-300 font-semibold cursor-pointer">
                      🟢 ยังเดินเครื่องใช้งานอยู่ (คำนวณวันถึงปัจจุบัน)
                    </label>
                  </div>
                </div>

                {!formIsActive && (
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">วันที่ถอดเปลี่ยน (สิ้นสุดรอบ)</label>
                    <input
                      type="date"
                      value={formReplacedDate}
                      onChange={(e) => setFormReplacedDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">สภาพการสึกหรอ / ผลตรวจเช็ค</label>
                <input
                  type="text"
                  value={formWearCondition}
                  onChange={(e) => setFormWearCondition(e.target.value)}
                  placeholder="เช่น คมมีดยังดี 95%, ไร้สนิม, ไม่บิ่น, รอยสึกสม่ำเสมอ"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">หมายเหตุเพิ่มเติม</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="บันทึกผลการตัด/เดินเครื่องเทียบกับของเดิม..."
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">แนบรูปถ่ายสภาพอะไหล่จริง (ถ้ามี)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200"
                  />
                  {formPhoto && (
                    <button
                      type="button"
                      onClick={() => setFormPhoto('')}
                      className="text-rose-400 text-xs"
                    >
                      ลบรูป
                    </button>
                  )}
                </div>
                {formPhoto && (
                  <div className="mt-2 h-20 bg-slate-900 rounded p-1 border border-slate-800 flex items-center justify-center">
                    <img src={formPhoto} alt="Condition Preview" className="h-full object-contain" />
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold"
                >
                  บันทึกประวัติรอบนี้
                </button>
              </div>
            </form>
          )}

          {/* History List Timeline / Table */}
          {historyList.length === 0 ? (
            <div className="text-center py-10 bg-slate-950/60 rounded-xl border border-dashed border-slate-800 p-6">
              <Clock className="mx-auto text-slate-600 mb-2" size={32} />
              <p className="text-slate-400 font-semibold">ยังไม่มีประวัติการใช้งานอะไหล่ที่บันทึกไว้</p>
              <p className="text-slate-500 text-[11px] mt-1">กดปุ่ม "+ บันทึกรอบการใช้งาน/ถอดเปลี่ยน" ด้านบนเพื่อเริ่มบันทึกรอบแรก</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyList.map((item) => {
                const isOngoing = item.status === 'ACTIVE_RUNNING' || !item.replacedDate;
                // Calculate dynamic running days if still active/running up to current date
                const dynamicRunningDays = (isOngoing && item.installedDate)
                  ? Math.max(1, Math.floor((new Date().getTime() - new Date(item.installedDate).getTime()) / (1000 * 3600 * 24)))
                  : (item.actualRunningDays || 1);
                const diffDays = dynamicRunningDays - origDays;
                const dynamicExtensionPercent = origDays > 0 ? Number((((dynamicRunningDays - origDays) / origDays) * 100).toFixed(1)) : 0;
                const isExtended = diffDays >= 0;

                return (
                  <div
                    key={item.id}
                    className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2 relative"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                          รอบที่ {item.cycleNumber}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          item.partType === 'NEW_CUSTOM' 
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' 
                            : 'bg-rose-950/80 text-rose-300 border-rose-800'
                        }`}>
                          {item.partType === 'NEW_CUSTOM' ? '🟢 อะไหล่สั่งทำ CD5' : '🔴 อะไหล่ OEM เดิม'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isOngoing ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {isOngoing ? '⚡ กำลังเดินเครื่องใช้งานอยู่' : '⚪ สิ้นสุดรอบ / ถอดเปลี่ยนแล้ว'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeleteEntry(item.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition"
                          title="ลบบันทึกรอบนี้"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Lifespan Comparison Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-center">
                      <div className="bg-slate-900 p-2 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">วันที่เริ่มใช้งาน</span>
                        <span className="text-xs font-bold text-white font-mono">{item.installedDate}</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">วันที่ถอดเปลี่ยน</span>
                        <span className="text-xs font-bold text-slate-300 font-mono">
                          {item.replacedDate || 'ปัจจุบัน (ยังใช้งาน)'}
                        </span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">ใช้งานจริงสะสม</span>
                        <span className="text-sm font-black text-emerald-400 font-mono">
                          {dynamicRunningDays} วัน
                        </span>
                      </div>
                      <div className={`p-2 rounded border ${
                        isExtended ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}>
                        <span className="text-[10px] text-slate-400 block">เทียบกับ OEM ({origDays} ว.)</span>
                        <span className="text-xs font-black font-mono">
                          {isExtended ? `+${diffDays} วัน (+${dynamicExtensionPercent}%) 🚀` : `${diffDays} วัน`}
                        </span>
                      </div>
                    </div>

                    {/* Condition & Notes */}
                    <div className="text-[11px] text-slate-300 bg-slate-900/60 p-2.5 rounded border border-slate-800/80 space-y-1">
                      <p><b>สภาพการสึกหรอ:</b> {item.wearCondition || 'ปกติ'}</p>
                      {item.notes && <p className="text-slate-400 italic">"{item.notes}"</p>}
                      <p className="text-[10px] text-slate-500">บันทึกโดย: {item.technician}</p>
                    </div>

                    {/* Attached Photo */}
                    {item.photoAfterUse && (
                      <div className="pt-1">
                        <p className="text-[10px] text-slate-400 mb-1">ภาพถ่ายสภาพอะไหล่:</p>
                        <img 
                          src={item.photoAfterUse} 
                          alt="After use" 
                          className="h-28 rounded border border-slate-800 object-contain bg-slate-900 p-1"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            ระบบเก็บประวัติเพื่อวิเคราะห์ความคุ้มค่าและยืดอายุอะไหล่จริง
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
