import React, { useState } from 'react';
import { ImprovementProject, Machine } from '../../types';
import { 
  BookOpen, Plus, FileText, Download, Printer, CheckCircle2, 
  AlertTriangle, Wrench, Clock, Users, ShieldAlert, Sparkles, ExternalLink, Image as ImageIcon, Trash2, Edit3 
} from 'lucide-react';

interface OPLViewProps {
  oplList: ImprovementProject[];
  machines: Machine[];
  onSelectProject: (proj: ImprovementProject) => void;
  onOpenPDF: (pdf: any) => void;
  onOpenPhoto: (photo: any) => void;
  onOpenCreateModal: () => void;
  onDeleteProject: (id: string) => void;
}

export const OPLView: React.FC<OPLViewProps> = ({
  oplList,
  machines,
  onSelectProject,
  onOpenPDF,
  onOpenPhoto,
  onOpenCreateModal,
  onDeleteProject
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeOPLModal, setActiveOPLModal] = useState<ImprovementProject | null>(null);

  const getMachineName = (machineId?: string) => {
    if (!machineId) return 'เครื่องจักรทั่วไป';
    const m = machines.find(mac => mac.id === machineId);
    return m ? `${m.id} - ${m.name}` : machineId;
  };

  const filteredList = oplList.filter(item => {
    if (selectedCategory === 'all') return true;
    return item.oplData?.category?.includes(selectedCategory);
  });

  const categories = [
    { id: 'all', label: 'ทั้งหมด', count: oplList.length },
    { id: 'Basic', label: 'ความรู้พื้นฐาน (Basic)', count: oplList.filter(o => o.oplData?.category?.includes('Basic')).length },
    { id: 'Troubleshooting', label: 'การแก้ปัญหา (Troubleshooting)', count: oplList.filter(o => o.oplData?.category?.includes('Troubleshooting')).length },
    { id: 'Improvement', label: 'ตัวอย่างปรับปรุง (Improvement)', count: oplList.filter(o => o.oplData?.category?.includes('Improvement')).length },
    { id: 'Safety', label: 'ความปลอดภัย (Safety)', count: oplList.filter(o => o.oplData?.category?.includes('Safety')).length },
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900/90 to-blue-950/40 p-5 rounded-2xl border border-blue-900/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-bold flex items-center gap-1.5">
              <BookOpen size={14} />
              ONE POINT LESSON (OPL)
            </span>
            <span className="text-xs text-slate-400">บทเรียนจุดเดียวเพื่อมาตรฐานงานซ่อมและ Autonomous Maintenance</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1.5">
            คลังบทเรียน One Point Lesson (OPL Knowledge Library)
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            สื่อการสอนสั้น 5-15 นาที ถ่ายทอดองค์ความรู้ จุดสำคัญ ข้อควรระวัง พร้อมภาพประกอบชัดเจนและเอกสาร PDF แนบ
          </p>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
        >
          <Plus size={16} />
          สร้างบทเรียน OPL ใหม่
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span>{cat.label}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              selectedCategory === cat.id ? 'bg-blue-800 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {cat.count}
            </span>
          </button>
        ))}
      </div>

      {/* OPL Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredList.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-slate-900/40 rounded-2xl border border-slate-800/80">
            <BookOpen size={40} className="text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-400">ยังไม่มีบทเรียน OPL ในหมวดหมู่นี้</h3>
            <p className="text-xs text-slate-500 mt-1">คลิกปุ่ม &quot;สร้างบทเรียน OPL ใหม่&quot; ด้านบนเพื่อเริ่มสร้างบทเรียนแรก</p>
          </div>
        ) : (
          filteredList.map(opl => {
            const data = opl.oplData;
            const hasPdf = opl.pdfFiles && opl.pdfFiles.length > 0;
            const hasPhotos = opl.photoBefore || opl.photoAfter || (opl.photos && opl.photos.length > 0);

            let catColor = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
            if (data?.category?.includes('Troubleshooting')) {
              catColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
            } else if (data?.category?.includes('Improvement')) {
              catColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
            } else if (data?.category?.includes('Safety')) {
              catColor = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
            }

            return (
              <div
                key={opl.id}
                className="bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-lg relative group"
              >
                {/* Top header badge */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${catColor}`}>
                      {data?.category || 'One Point Lesson'}
                    </span>
                    {data?.sopDocumentRef && (
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        {data.sopDocumentRef}
                      </span>
                    )}
                  </div>

                  {/* Machine & Target info */}
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                    <span className="text-cyan-400 font-semibold flex items-center gap-1">
                      <Wrench size={12} />
                      {getMachineName(opl.machineId)}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock size={11} className="text-amber-400" />
                      {data?.trainingDurationMins || 15} นาที
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors leading-snug line-clamp-2">
                    {opl.title}
                  </h3>

                  {/* Purpose */}
                  {data?.purpose && (
                    <p className="text-xs text-slate-300 mt-2 line-clamp-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                      <span className="text-blue-400 font-bold mr-1">🎯 วัตถุประสงค์:</span>
                      {data.purpose}
                    </p>
                  )}

                  {/* Key points preview */}
                  {data?.keyPoints && data.keyPoints.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-emerald-400" />
                        จุดสำคัญในการปฏิบัติ (Key Points):
                      </p>
                      <ul className="space-y-1 text-xs text-slate-300">
                        {data.keyPoints.slice(0, 2).map((kp, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 line-clamp-1">
                            <span className="text-blue-400 font-bold">•</span>
                            <span className="truncate">{kp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Demonstration Photos */}
                  {hasPhotos && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800/80">
                      {opl.photoBefore && (
                        <button
                          type="button"
                          onClick={() => onOpenPhoto({
                            url: opl.photoBefore!,
                            title: opl.title,
                            subtitle: 'ภาพตัวอย่างที่ไม่ถูกต้อง (Incorrect / Before)',
                            badge: 'DON\'T'
                          })}
                          className="relative group/img overflow-hidden rounded-xl border border-rose-500/40 w-16 h-12 bg-slate-950 shrink-0 hover:scale-105 transition-all"
                        >
                          <img src={opl.photoBefore} alt="Before" className="w-full h-full object-cover" />
                          <span className="absolute bottom-0 inset-x-0 bg-rose-950/90 text-[8px] font-bold text-rose-300 text-center py-0.5">✕ ผิดวิธี</span>
                        </button>
                      )}
                      {opl.photoAfter && (
                        <button
                          type="button"
                          onClick={() => onOpenPhoto({
                            url: opl.photoAfter!,
                            title: opl.title,
                            subtitle: 'ภาพตัวอย่างที่ถูกต้องตามมาตรฐาน (Correct / Standard)',
                            badge: 'DO'
                          })}
                          className="relative group/img overflow-hidden rounded-xl border border-emerald-500/40 w-16 h-12 bg-slate-950 shrink-0 hover:scale-105 transition-all"
                        >
                          <img src={opl.photoAfter} alt="After" className="w-full h-full object-cover" />
                          <span className="absolute bottom-0 inset-x-0 bg-emerald-950/90 text-[8px] font-bold text-emerald-300 text-center py-0.5">✓ ถูกวิธี</span>
                        </button>
                      )}

                      {/* PDF badge */}
                      {hasPdf && opl.pdfFiles && opl.pdfFiles[0] && (
                        <button
                          type="button"
                          onClick={() => onOpenPDF(opl.pdfFiles![0])}
                          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold transition-all"
                        >
                          <FileText size={13} />
                          เอกสาร PDF
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-[10px]">
                      {opl.technician.charAt(opl.technician.length - 1)}
                    </span>
                    <span className="font-medium text-slate-300">{opl.technician}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActiveOPLModal(opl)}
                      className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <ExternalLink size={12} />
                      เปิดดู OPL Sheet
                    </button>
                    <button
                      onClick={() => onDeleteProject(opl.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="ลบ OPL"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Official OPL Sheet Printable Modal */}
      {activeOPLModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <BookOpen size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">แบบฟอร์มบทเรียนจุดเดียว (One Point Lesson Sheet)</h3>
                  <p className="text-xs text-slate-400">แบบฟอร์มมาตรฐานฝ่ายวิศวกรรมและซ่อมบำรุงโรงงานอาหาร</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg"
                >
                  <Printer size={14} />
                  พิมพ์ (Print)
                </button>
                <button
                  onClick={() => setActiveOPLModal(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body - OPL Sheet format */}
            <div className="flex-1 overflow-auto p-6 space-y-5 bg-slate-950/40">
              
              {/* Sheet Header Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block">หมวดหมู่ OPL:</span>
                  <span className="text-blue-400 font-bold">{activeOPLModal.oplData?.category || 'Basic'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">เครื่องจักร:</span>
                  <span className="text-white font-semibold">{getMachineName(activeOPLModal.machineId)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">ผู้จัดทำ (ช่าง):</span>
                  <span className="text-white font-semibold">{activeOPLModal.technician}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">เอกสารอ้างอิง:</span>
                  <span className="text-amber-400 font-mono font-bold">{activeOPLModal.oplData?.sopDocumentRef || '-'}</span>
                </div>
              </div>

              {/* Title & Purpose */}
              <div className="space-y-2 bg-slate-900 p-4 rounded-xl border border-slate-800">
                <h4 className="text-sm font-bold text-white">หัวข้อ: {activeOPLModal.title}</h4>
                <p className="text-xs text-slate-300">
                  <span className="text-blue-400 font-semibold">วัตถุประสงค์:</span> {activeOPLModal.oplData?.purpose || activeOPLModal.description}
                </p>
                {activeOPLModal.oplData?.targetAudience && (
                  <p className="text-xs text-slate-400">
                    <span className="text-slate-500">กลุ่มเป้าหมายการฝึกอบรม:</span> {activeOPLModal.oplData.targetAudience}
                  </p>
                )}
              </div>

              {/* Photos: Incorrect vs Correct */}
              {(activeOPLModal.photoBefore || activeOPLModal.photoAfter) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeOPLModal.photoBefore && (
                    <div className="bg-slate-900 p-3 rounded-xl border border-rose-500/30 flex flex-col items-center">
                      <span className="text-xs font-bold text-rose-400 mb-2 flex items-center gap-1">
                        ✕ วิธีปฏิบัติที่ไม่ถูกต้อง (Don&apos;t / Incorrect)
                      </span>
                      <img src={activeOPLModal.photoBefore} alt="Incorrect" className="w-full h-44 object-cover rounded-lg border border-slate-800" />
                    </div>
                  )}
                  {activeOPLModal.photoAfter && (
                    <div className="bg-slate-900 p-3 rounded-xl border border-emerald-500/30 flex flex-col items-center">
                      <span className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1">
                        ✓ วิธีปฏิบัติที่ถูกต้องตามมาตรฐาน (Do / Standard)
                      </span>
                      <img src={activeOPLModal.photoAfter} alt="Correct" className="w-full h-44 object-cover rounded-lg border border-slate-800" />
                    </div>
                  )}
                </div>
              )}

              {/* Key Points & Reasons */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                <h5 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  จุดสำคัญและเหตุผล (Key Points & Principles):
                </h5>
                <div className="space-y-2">
                  {activeOPLModal.oplData?.keyPoints?.map((kp, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs text-slate-300">
                      <p className="font-semibold text-white">{kp}</p>
                      {activeOPLModal.oplData?.reasons?.[idx] && (
                        <p className="text-[11px] text-slate-400 mt-1 pl-3 border-l-2 border-blue-500">
                          เหตุผล: {activeOPLModal.oplData.reasons[idx]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Caution & Don'ts */}
              {activeOPLModal.oplData?.cautionPoints && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-400">
                    <ShieldAlert size={15} />
                    ข้อควรระวัง / สิ่งที่ห้ามทำโดยเด็ดขาด:
                  </div>
                  <p>{activeOPLModal.oplData.cautionPoints}</p>
                </div>
              )}

              {/* PDF Documents */}
              {activeOPLModal.pdfFiles && activeOPLModal.pdfFiles.length > 0 && (
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                  <h5 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <FileText size={14} className="text-rose-400" />
                    เอกสาร PDF แนบประกอบ:
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {activeOPLModal.pdfFiles.map(pdf => (
                      <button
                        key={pdf.id}
                        onClick={() => onOpenPDF(pdf)}
                        className="flex items-center gap-2 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg text-xs text-rose-300 font-semibold transition-all"
                      >
                        <FileText size={14} />
                        {pdf.name} ({pdf.size || 'PDF'})
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-900 flex justify-between items-center text-xs text-slate-400">
              <span>อนุมัติและเผยแพร่มาตรฐาน OPL สำหรับโรงงานอาหาร</span>
              <button
                onClick={() => setActiveOPLModal(null)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold"
              >
                ปิด
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
