import React from 'react';
import { ImprovementProject, Machine } from '../../types';
import { 
  Calendar, Wrench, Clock, CheckSquare, Users, FileText, 
  Image as ImageIcon, Plus, ArrowRight, CheckCircle2, AlertCircle 
} from 'lucide-react';

interface KaizenKanbanViewProps {
  projects: ImprovementProject[];
  machines: Machine[];
  onSelectProject: (proj: ImprovementProject) => void;
  onOpenPDF: (pdf: any) => void;
  onOpenPhoto: (photo: any) => void;
  onOpenCreateModal: () => void;
}

export const KaizenKanbanView: React.FC<KaizenKanbanViewProps> = ({
  projects,
  machines,
  onSelectProject,
  onOpenPDF,
  onOpenPhoto,
  onOpenCreateModal
}) => {
  const getMachineName = (machineId?: string) => {
    if (!machineId) return 'ทั่วไปในโรงงาน';
    const m = machines.find(mac => mac.id === machineId);
    return m ? `${m.id} - ${m.name}` : machineId;
  };

  const calculateProgress = (proj: ImprovementProject): number => {
    if (proj.status === 'เสร็จแล้ว') return 100;
    if (proj.status === 'วางแผน') return 0;
    const totalHrs = proj.workLogs?.reduce((sum, log) => sum + log.hours, 0) || 0;
    return Math.min(95, Math.max(15, Math.round((totalHrs / 16) * 100)));
  };

  const getProjsByStatus = (status: 'วางแผน' | 'กำลังดำเนินการ' | 'เสร็จแล้ว') => {
    return projects.filter(p => p.status === status);
  };

  const columns: {
    status: 'วางแผน' | 'กำลังดำเนินการ' | 'เสร็จแล้ว';
    title: string;
    badgeColor: string;
    dotColor: string;
    borderColor: string;
  }[] = [
    {
      status: 'วางแผน',
      title: 'วางแผนปรับปรุง (PLANNED)',
      badgeColor: 'bg-slate-800 text-slate-400',
      dotColor: 'bg-slate-500',
      borderColor: 'border-slate-800'
    },
    {
      status: 'กำลังดำเนินการ',
      title: 'กำลังดำเนินการ (IN PROGRESS)',
      badgeColor: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      dotColor: 'bg-amber-400 animate-pulse',
      borderColor: 'border-amber-500/20'
    },
    {
      status: 'เสร็จแล้ว',
      title: 'ดำเนินการเสร็จแล้ว (COMPLETED)',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      dotColor: 'bg-emerald-400',
      borderColor: 'border-emerald-500/20'
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Banner with Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">🔨</span>
            บอร์ดขับเคลื่อนโครงการ Kaizen หน้างาน (Kaizen Kanban Board)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            ติดตามงานปรับปรุงอย่างเป็นระบบ บันทึกเวลากิจกรรม แนบเอกสาร PDF และภาพถ่ายก่อน-หลังทำ
          </p>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all"
        >
          <Plus size={16} />
          สร้างโครงการ Kaizen ใหม่
        </button>
      </div>

      {/* Kanban Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {columns.map(col => {
          const list = getProjsByStatus(col.status);
          return (
            <div
              key={col.status}
              className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 flex flex-col min-h-[500px]"
            >
              {/* Column Header */}
              <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4 px-1 shrink-0">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`}></span>
                  {col.title}
                </span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${col.badgeColor}`}>
                  {list.length} โครงการ
                </span>
              </div>

              {/* Card List */}
              <div className="flex-1 space-y-3.5 overflow-y-auto pr-1">
                {list.length === 0 ? (
                  <div className="text-xs text-slate-600 italic text-center py-16">
                    ไม่มีโครงการในสถานะนี้
                  </div>
                ) : (
                  list.map(proj => {
                    const totalHrs = proj.workLogs?.reduce((sum, l) => sum + l.hours, 0) || 0;
                    const progress = calculateProgress(proj);
                    const hasPdf = proj.pdfFiles && proj.pdfFiles.length > 0;
                    const hasPhotos = proj.photoBefore || proj.photoAfter || (proj.photos && proj.photos.length > 0);

                    return (
                      <div
                        key={proj.id}
                        onClick={() => onSelectProject(proj)}
                        className="group bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/50 rounded-xl p-4 transition-all duration-200 cursor-pointer shadow-md hover:shadow-cyan-500/5 flex flex-col justify-between relative overflow-hidden"
                      >
                        {/* Status bar top */}
                        <div 
                          className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r"
                          style={{
                            backgroundImage: proj.status === 'เสร็จแล้ว' 
                              ? 'linear-gradient(to right, #10b981, #059669)' 
                              : proj.status === 'กำลังดำเนินการ'
                              ? 'linear-gradient(to right, #f59e0b, #d97706)'
                              : 'linear-gradient(to right, #64748b, #475569)'
                          }}
                        />

                        <div>
                          {/* Machine & Hours Badge */}
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[11px] font-semibold text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5 rounded-md flex items-center gap-1.5 truncate max-w-[170px]">
                              <Wrench size={12} className="shrink-0" />
                              <span className="truncate">{getMachineName(proj.machineId)}</span>
                            </span>
                            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded">
                              <Clock size={11} className="text-amber-400" />
                              {totalHrs} ชม.
                            </span>
                          </div>

                          {/* Title */}
                          <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug">
                            {proj.title}
                          </h3>

                          {/* Description */}
                          <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                            {proj.description}
                          </p>

                          {/* Before/After Photo Thumbnails */}
                          {hasPhotos && (
                            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-800/60">
                              {proj.photoBefore && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenPhoto({
                                      url: proj.photoBefore,
                                      title: proj.title,
                                      subtitle: 'ภาพถ่ายก่อนปรับปรุง (Before)',
                                      badge: 'BEFORE'
                                    });
                                  }}
                                  className="relative group/img overflow-hidden rounded-lg border border-amber-500/30 w-12 h-10 bg-slate-950 shrink-0 hover:border-amber-400 transition-all"
                                >
                                  <img src={proj.photoBefore} alt="Before" className="w-full h-full object-cover" />
                                  <span className="absolute bottom-0 inset-x-0 bg-slate-950/80 text-[8px] font-bold text-amber-300 text-center py-0.5">ก่อน</span>
                                </button>
                              )}
                              {proj.photoAfter && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenPhoto({
                                      url: proj.photoAfter,
                                      title: proj.title,
                                      subtitle: 'ภาพถ่ายหลังปรับปรุง Kaizen (After)',
                                      badge: 'AFTER'
                                    });
                                  }}
                                  className="relative group/img overflow-hidden rounded-lg border border-emerald-500/30 w-12 h-10 bg-slate-950 shrink-0 hover:border-emerald-400 transition-all"
                                >
                                  <img src={proj.photoAfter} alt="After" className="w-full h-full object-cover" />
                                  <span className="absolute bottom-0 inset-x-0 bg-slate-950/80 text-[8px] font-bold text-emerald-300 text-center py-0.5">หลัง</span>
                                </button>
                              )}

                              {hasPdf && proj.pdfFiles && proj.pdfFiles[0] && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenPDF(proj.pdfFiles![0]);
                                  }}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[10px] font-semibold transition-all ml-auto"
                                >
                                  <FileText size={12} />
                                  PDF ({proj.pdfFiles.length})
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Card Footer: Assignee & Progress */}
                        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                          <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                            <span className="p-1 rounded bg-slate-800 text-slate-300">
                              <Users size={12} />
                            </span>
                            <span className="truncate font-medium text-slate-300">
                              {proj.technician}
                              {proj.technicians && proj.technicians.length > 1 && (
                                <span className="ml-1 text-[10px] bg-slate-800 text-cyan-400 px-1 py-0.2 rounded font-mono">
                                  +{proj.technicians.length - 1}
                                </span>
                              )}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-slate-400">
                              {progress}%
                            </span>
                            <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  proj.status === 'เสร็จแล้ว' ? 'bg-emerald-500' : proj.status === 'กำลังดำเนินการ' ? 'bg-amber-500' : 'bg-slate-600'
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
