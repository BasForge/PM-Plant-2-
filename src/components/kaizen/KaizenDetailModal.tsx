import React, { useState } from 'react';
import { ImprovementProject, Machine, WorkLog, isExcelAttachment } from '../../types';
import { 
  X, Clock, Calendar, Users, Wrench, FileText, FileSpreadsheet, Image as ImageIcon, 
  CheckCircle2, Plus, Trash2, Edit3, Sparkles, BookOpen, Search, HelpCircle 
} from 'lucide-react';

interface KaizenDetailModalProps {
  project: ImprovementProject | null;
  onClose: () => void;
  onUpdate: (updated: ImprovementProject) => void;
  onEdit: (proj: ImprovementProject) => void;
  onDelete: (id: string) => void;
  machines: Machine[];
  onOpenPDF: (pdf: any) => void;
  onOpenPhoto: (photo: any) => void;
}

export const KaizenDetailModal: React.FC<KaizenDetailModalProps> = ({
  project,
  onClose,
  onUpdate,
  onEdit,
  onDelete,
  machines,
  onOpenPDF,
  onOpenPhoto
}) => {
  const [newLogDate, setNewLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [newLogHours, setNewLogHours] = useState(2);
  const [newLogNote, setNewLogNote] = useState('');

  if (!project) return null;

  const getMachineName = (machineId?: string) => {
    if (!machineId) return 'เครื่องจักรทั่วไป';
    const m = machines.find(mac => mac.id === machineId);
    return m ? `${m.id} - ${m.name} (${m.location})` : machineId;
  };

  const handleAddWorkLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogNote.trim() || newLogHours <= 0) return;

    const newLog: WorkLog = {
      id: `wl-${Date.now()}`,
      date: newLogDate,
      hours: Number(newLogHours),
      note: newLogNote.trim()
    };

    const updated = {
      ...project,
      workLogs: [...(project.workLogs || []), newLog]
    };

    onUpdate(updated);
    setNewLogNote('');
    setNewLogHours(2);
  };

  const handleDeleteWorkLog = (logId: string) => {
    const updated = {
      ...project,
      workLogs: (project.workLogs || []).filter(l => l.id !== logId)
    };
    onUpdate(updated);
  };

  const handleStatusChange = (newStatus: 'วางแผน' | 'กำลังดำเนินการ' | 'เสร็จแล้ว') => {
    const updated = {
      ...project,
      status: newStatus
    };
    onUpdate(updated);
  };

  const totalHours = project.workLogs?.reduce((sum, l) => sum + l.hours, 0) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <span className={`p-2 rounded-xl border ${
              project.category === 'OPL' 
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                : project.category === 'FA'
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                : project.category === 'WHY_WHY'
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
            }`}>
              {project.category === 'OPL' ? <BookOpen size={20} /> : project.category === 'FA' ? <Search size={20} /> : project.category === 'WHY_WHY' ? <HelpCircle size={20} /> : <Wrench size={20} />}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {project.category || 'KAIZEN'}
                </span>
                <span className="text-xs text-slate-400">ID: {project.id}</span>
              </div>
              <h3 className="text-base font-bold text-white tracking-wide mt-0.5 line-clamp-1">
                {project.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(project)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
            >
              <Edit3 size={14} />
              แก้ไข
            </button>
            <button
              onClick={() => {
                if (confirm('คุณแน่ใจว่าต้องการลบรายการนี้ใช่หรือไม่?')) {
                  onDelete(project.id);
                  onClose();
                }
              }}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              title="ลบ"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Key Metric Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 block">เครื่องจักร:</span>
              <span className="text-cyan-400 font-semibold">{getMachineName(project.machineId)}</span>
            </div>
            <div>
              <span className="text-slate-500 block">ช่างผู้รับผิดชอบ:</span>
              <span className="text-white font-semibold">{project.technician}</span>
            </div>
            <div>
              <span className="text-slate-500 block">เวลารวมที่ใช้:</span>
              <span className="text-amber-400 font-bold font-mono text-sm">{totalHours} ชั่วโมง</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-1">สถานะโครงการ:</span>
              <select
                value={project.status}
                onChange={(e) => handleStatusChange(e.target.value as any)}
                className={`text-xs font-bold px-2 py-1 rounded-lg border focus:outline-none ${
                  project.status === 'เสร็จแล้ว'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : project.status === 'กำลังดำเนินการ'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <option value="วางแผน">วางแผน (Planned)</option>
                <option value="กำลังดำเนินการ">กำลังดำเนินการ (In Progress)</option>
                <option value="เสร็จแล้ว">เสร็จแล้ว (Completed)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-1.5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              รายละเอียดสรุป (Description):
            </h4>
            <p className="text-sm text-slate-200 leading-relaxed">
              {project.description}
            </p>
          </div>

          {/* Before & After Photos */}
          {(project.photoBefore || project.photoAfter) && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                ภาพถ่ายเปรียบเทียบผลงาน (Before & After Demonstration):
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {project.photoBefore && (
                  <div
                    onClick={() => onOpenPhoto({
                      url: project.photoBefore!,
                      title: project.title,
                      subtitle: 'ภาพถ่ายก่อนปรับปรุง',
                      badge: 'BEFORE'
                    })}
                    className="group relative cursor-pointer overflow-hidden rounded-xl border border-amber-500/40 bg-slate-950 p-2 flex flex-col items-center hover:border-amber-400 transition-all shadow-md"
                  >
                    <span className="text-xs font-bold text-amber-400 mb-2">ภาพก่อนปรับปรุง (Before)</span>
                    <img src={project.photoBefore} alt="Before" className="w-full h-48 object-cover rounded-lg" />
                    <span className="text-[10px] text-slate-400 mt-2">คลิกเพื่อดูภาพขยาย</span>
                  </div>
                )}

                {project.photoAfter && (
                  <div
                    onClick={() => onOpenPhoto({
                      url: project.photoAfter!,
                      title: project.title,
                      subtitle: 'ภาพถ่ายหลังปรับปรุง Kaizen',
                      badge: 'AFTER'
                    })}
                    className="group relative cursor-pointer overflow-hidden rounded-xl border border-emerald-500/40 bg-slate-950 p-2 flex flex-col items-center hover:border-emerald-400 transition-all shadow-md"
                  >
                    <span className="text-xs font-bold text-emerald-400 mb-2">ภาพหลังปรับปรุง (After / Result)</span>
                    <img src={project.photoAfter} alt="After" className="w-full h-48 object-cover rounded-lg" />
                    <span className="text-[10px] text-slate-400 mt-2">คลิกเพื่อดูภาพขยาย</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Attached Files (Excel & PDF) */}
          {project.pdfFiles && project.pdfFiles.length > 0 && (
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet size={15} className="text-emerald-400" />
                <FileText size={15} className="text-rose-400" />
                ไฟล์เอกสารแนบประกอบ ({project.pdfFiles.length} ไฟล์):
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {project.pdfFiles.map(file => {
                  const isExcel = isExcelAttachment(file);
                  return (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => onOpenPDF(file)}
                      className={`flex items-center justify-between p-3 rounded-lg bg-slate-950 border text-left transition-all group ${
                        isExcel
                          ? 'border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-950/20'
                          : 'border-slate-800 hover:border-rose-500/50 hover:bg-rose-950/20'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate max-w-[80%]">
                        <div
                          className={`p-2 rounded ${
                            isExcel ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {isExcel ? <FileSpreadsheet size={16} /> : <FileText size={16} />}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                isExcel
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              {isExcel ? 'EXCEL' : 'PDF'}
                            </span>
                            <p
                              className={`text-xs font-semibold truncate ${
                                isExcel
                                  ? 'text-slate-200 group-hover:text-emerald-300'
                                  : 'text-slate-200 group-hover:text-rose-300'
                              }`}
                            >
                              {file.name}
                            </p>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {file.size || '12 KB'} • {file.uploadedAt || 'ล่าสุด'}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-[11px] font-semibold px-2 py-1 rounded shrink-0 ${
                          isExcel
                            ? 'text-emerald-400 bg-emerald-500/10 group-hover:bg-emerald-500/20'
                            : 'text-rose-400 bg-rose-500/10 group-hover:bg-rose-500/20'
                        }`}
                      >
                        {isExcel ? 'เปิดดูตาราง' : 'เปิดอ่าน'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Work Log Timeline & Logger */}
          <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={15} className="text-amber-400" />
                บันทึกประวัติการทำงานและชั่วโมงกิจกรรม (Work Logs & Hours):
              </h4>
              <span className="text-xs font-mono text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                รวม {totalHours} ชม.
              </span>
            </div>

            {/* Work logs list */}
            <div className="space-y-2">
              {(!project.workLogs || project.workLogs.length === 0) ? (
                <div className="text-center py-4 text-xs text-slate-500 italic">
                  ยังไม่มีการลงบันทึกเวลาทำงาน
                </div>
              ) : (
                project.workLogs.map(log => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                        {log.date}
                      </span>
                      <span className="text-slate-200 font-medium">{log.note}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                        +{log.hours} ชม.
                      </span>
                      <button
                        onClick={() => handleDeleteWorkLog(log.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add new work log form */}
            <form onSubmit={handleAddWorkLog} className="pt-3 border-t border-slate-800/80 flex flex-wrap gap-2 items-center">
              <input
                type="date"
                value={newLogDate}
                onChange={(e) => setNewLogDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={newLogHours}
                onChange={(e) => setNewLogHours(Number(e.target.value))}
                placeholder="ชม."
                className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono text-center"
              />
              <input
                type="text"
                value={newLogNote}
                onChange={(e) => setNewLogNote(e.target.value)}
                placeholder="บันทึกกิจกรรม เช่น ออกแบบ, ติดตั้ง, อบรม..."
                className="flex-1 min-w-[200px] bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 transition-all"
              >
                <Plus size={14} />
                บันทึกชั่วโมง
              </button>
            </form>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900 flex justify-between items-center text-xs text-slate-400">
          <span>ระบบบันทึกผลงาน Kaizen, OPL, FA และ 5-Whys</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
          >
            ปิด
          </button>
        </div>

      </div>
    </div>
  );
};
