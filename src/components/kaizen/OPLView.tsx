import React, { useState, useRef } from 'react';
import { ImprovementProject, Machine, isExcelAttachment, MediaPhotoItem, PDFFileAttachment } from '../../types';
import { 
  BookOpen, Plus, FileText, FileSpreadsheet, Download, Printer, CheckCircle2, 
  AlertTriangle, Wrench, Clock, Users, ShieldAlert, Sparkles, ExternalLink, Image as ImageIcon, Trash2, Edit3, Upload 
} from 'lucide-react';
import { compressImageFile } from '../../utils/imageUtils';

interface OPLViewProps {
  oplList: ImprovementProject[];
  machines: Machine[];
  onSelectProject: (proj: ImprovementProject) => void;
  onOpenPDF: (pdf: any) => void;
  onOpenPhoto: (photo: any) => void;
  onOpenCreateModal: () => void;
  onDeleteProject: (id: string) => void;
  onEditProject: (proj: ImprovementProject) => void;
  onUpdateProject?: (proj: ImprovementProject) => void;
}

export const OPLView: React.FC<OPLViewProps> = ({
  oplList,
  machines,
  onSelectProject,
  onOpenPDF,
  onOpenPhoto,
  onOpenCreateModal,
  onDeleteProject,
  onEditProject,
  onUpdateProject
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeOPLModal, setActiveOPLModal] = useState<ImprovementProject | null>(null);

  const oplPhotoInputRef = useRef<HTMLInputElement>(null);
  const oplFileInputRef = useRef<HTMLInputElement>(null);

  // Sync active modal with updated project from oplList
  const currentOPLModal = activeOPLModal 
    ? (oplList.find(o => o.id === activeOPLModal.id) || activeOPLModal) 
    : null;

  const handleQuickAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentOPLModal || !onUpdateProject) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPhotos: MediaPhotoItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const compressed = await compressImageFile(file);
        newPhotos.push({
          id: `photo-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
          url: compressed,
          caption: file.name.replace(/\.[^/.]+$/, ""),
          uploadedAt: new Date().toISOString().split('T')[0],
          type: 'evidence'
        });
      } catch (err) {
        console.error('Failed to compress photo', err);
      }
    }

    if (newPhotos.length > 0) {
      const updated: ImprovementProject = {
        ...currentOPLModal,
        photos: [...(currentOPLModal.photos || []), ...newPhotos]
      };
      onUpdateProject(updated);
      setActiveOPLModal(updated);
    }
    if (e.target) e.target.value = '';
  };

  const handleQuickAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentOPLModal || !onUpdateProject) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newDocs: PDFFileAttachment[] = [];
    let completedCount = 0;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const sizeFormatted = file.size > 1024 * 1024 
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`;

        const isExcel = isExcelAttachment({ name: file.name });

        newDocs.push({
          id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          size: sizeFormatted,
          uploadedAt: new Date().toISOString().split('T')[0],
          content: content,
          fileType: isExcel ? 'excel' : 'pdf'
        });

        completedCount++;
        if (completedCount === files.length) {
          const updated: ImprovementProject = {
            ...currentOPLModal,
            pdfFiles: [...(currentOPLModal.pdfFiles || []), ...newDocs]
          };
          onUpdateProject(updated);
          setActiveOPLModal(updated);
        }
      };
      reader.readAsDataURL(file);
    });

    if (e.target) e.target.value = '';
  };

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

                      {/* Additional Photos badge */}
                      {opl.photos && opl.photos.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onOpenPhoto({
                            url: opl.photos![0].url,
                            title: opl.title,
                            subtitle: opl.photos![0].caption || 'ภาพประกอบ OPL',
                            badge: `รูปภาพ (${opl.photos!.length})`
                          })}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition-all shrink-0"
                          title={`ดูรูปภาพประกอบเพิ่มเติม (${opl.photos.length} รูป)`}
                        >
                          <ImageIcon size={13} />
                          +{opl.photos.length} รูป
                        </button>
                      )}

                      {/* Excel & PDF badges */}
                      {opl.pdfFiles && opl.pdfFiles.length > 0 && (() => {
                        const excelFiles = opl.pdfFiles.filter(isExcelAttachment);
                        const pdfFiles = opl.pdfFiles.filter(f => !isExcelAttachment(f));
                        return (
                          <div className="ml-auto flex items-center gap-1.5">
                            {excelFiles.length > 0 && (
                              <button
                                type="button"
                                onClick={() => onOpenPDF(excelFiles[0])}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-all"
                                title={`เปิดตาราง Excel: ${excelFiles[0].name}`}
                              >
                                <FileSpreadsheet size={13} />
                                Excel ({excelFiles.length})
                              </button>
                            )}
                            {pdfFiles.length > 0 && (
                              <button
                                type="button"
                                onClick={() => onOpenPDF(pdfFiles[0])}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold transition-all"
                                title={`เปิดไฟล์ PDF: ${pdfFiles[0].name}`}
                              >
                                <FileText size={13} />
                                PDF ({pdfFiles.length})
                              </button>
                            )}
                          </div>
                        );
                      })()}
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
                      onClick={() => onEditProject(opl)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
                      title="แก้ไขข้อมูล, แนบไฟล์, รูปภาพเพิ่มเติม"
                    >
                      <Edit3 size={12} className="text-amber-400" />
                      แก้ไข
                    </button>
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
      {currentOPLModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Hidden file & photo inputs for quick upload */}
            <input
              ref={oplPhotoInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleQuickAddPhotos}
              className="hidden"
            />
            <input
              ref={oplFileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/pdf"
              multiple
              onChange={handleQuickAddFiles}
              className="hidden"
            />

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
                  onClick={() => {
                    const proj = currentOPLModal;
                    setActiveOPLModal(null);
                    onEditProject(proj);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition-all shadow-sm"
                  title="แก้ไขข้อมูลทั้งหมด แนบไฟล์ หรือรูปภาพเพิ่มเติม"
                >
                  <Edit3 size={14} />
                  แก้ไขข้อมูล
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg"
                >
                  <Printer size={14} />
                  พิมพ์
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
                  <span className="text-blue-400 font-bold">{currentOPLModal.oplData?.category || 'Basic'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">เครื่องจักร:</span>
                  <span className="text-white font-semibold">{getMachineName(currentOPLModal.machineId)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">ผู้จัดทำ (ช่าง):</span>
                  <span className="text-white font-semibold">{currentOPLModal.technician}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">เอกสารอ้างอิง:</span>
                  <span className="text-amber-400 font-mono font-bold">{currentOPLModal.oplData?.sopDocumentRef || '-'}</span>
                </div>
              </div>

              {/* Title & Purpose */}
              <div className="space-y-2 bg-slate-900 p-4 rounded-xl border border-slate-800">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-bold text-white">หัวข้อ: {currentOPLModal.title}</h4>
                  <button
                    onClick={() => {
                      const proj = currentOPLModal;
                      setActiveOPLModal(null);
                      onEditProject(proj);
                    }}
                    className="text-xs text-amber-400 hover:underline flex items-center gap-1 shrink-0"
                  >
                    <Edit3 size={11} />
                    แก้ไขเนื้อหา
                  </button>
                </div>
                <p className="text-xs text-slate-300">
                  <span className="text-blue-400 font-semibold">วัตถุประสงค์:</span> {currentOPLModal.oplData?.purpose || currentOPLModal.description}
                </p>
                {currentOPLModal.oplData?.targetAudience && (
                  <p className="text-xs text-slate-400">
                    <span className="text-slate-500">กลุ่มเป้าหมายการฝึกอบรม:</span> {currentOPLModal.oplData.targetAudience}
                  </p>
                )}
              </div>

              {/* Photos: Incorrect vs Correct */}
              {(currentOPLModal.photoBefore || currentOPLModal.photoAfter) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {currentOPLModal.photoBefore && (
                    <div className="bg-slate-900 p-3 rounded-xl border border-rose-500/30 flex flex-col items-center">
                      <span className="text-xs font-bold text-rose-400 mb-2 flex items-center gap-1">
                        ✕ วิธีปฏิบัติที่ไม่ถูกต้อง (Don&apos;t / Incorrect)
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenPhoto({
                          url: currentOPLModal.photoBefore!,
                          title: currentOPLModal.title,
                          subtitle: 'วิธีปฏิบัติที่ไม่ถูกต้อง',
                          badge: 'INCORRECT'
                        })}
                        className="w-full text-left cursor-pointer group/photo overflow-hidden rounded-lg border border-slate-800"
                      >
                        <img src={currentOPLModal.photoBefore} alt="Incorrect" className="w-full h-48 object-cover group-hover/photo:scale-105 transition-transform" />
                      </button>
                    </div>
                  )}
                  {currentOPLModal.photoAfter && (
                    <div className="bg-slate-900 p-3 rounded-xl border border-emerald-500/30 flex flex-col items-center">
                      <span className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1">
                        ✓ วิธีปฏิบัติที่ถูกต้องตามมาตรฐาน (Do / Standard)
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenPhoto({
                          url: currentOPLModal.photoAfter!,
                          title: currentOPLModal.title,
                          subtitle: 'วิธีปฏิบัติที่ถูกต้องตามมาตรฐาน',
                          badge: 'CORRECT'
                        })}
                        className="w-full text-left cursor-pointer group/photo overflow-hidden rounded-lg border border-slate-800"
                      >
                        <img src={currentOPLModal.photoAfter} alt="Correct" className="w-full h-48 object-cover group-hover/photo:scale-105 transition-transform" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Additional Photos Gallery in OPL */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <ImageIcon size={14} />
                    รูปภาพประกอบขั้นตอน & ตัวอย่างเพิ่มเติม ({currentOPLModal.photos?.length || 0} รูป)
                  </span>
                  <button
                    type="button"
                    onClick={() => oplPhotoInputRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-semibold transition-all shadow-sm"
                  >
                    <Plus size={12} />
                    + แนบรูปภาพเพิ่ม
                  </button>
                </div>

                {currentOPLModal.photos && currentOPLModal.photos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {currentOPLModal.photos.map((photo, pIdx) => (
                      <button
                        key={photo.id || pIdx}
                        type="button"
                        onClick={() => onOpenPhoto({
                          url: photo.url,
                          title: currentOPLModal.title,
                          subtitle: photo.caption || `ภาพขั้นตอน ${pIdx + 1}`,
                          badge: 'OPL PHOTO'
                        })}
                        className="group/thumb relative rounded-lg overflow-hidden border border-slate-800 hover:border-cyan-500/60 bg-slate-950 text-left transition-all"
                      >
                        <img
                          src={photo.url}
                          alt={photo.caption || 'OPL illustration'}
                          className="w-full h-24 object-cover group-hover/thumb:scale-105 transition-transform"
                        />
                        <div className="p-1.5 bg-slate-900/90 text-[10px] text-slate-300 truncate">
                          {photo.caption || `รูปที่ ${pIdx + 1}`}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-1">ยังไม่มีรูปภาพประกอบขั้นตอนเพิ่มเติม (กดปุ่ม &quot;+ แนบรูปภาพเพิ่ม&quot; เพื่ออัปโหลด)</p>
                )}
              </div>

              {/* Key Points & Reasons */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                <h5 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  จุดสำคัญและเหตุผล (Key Points & Principles):
                </h5>
                <div className="space-y-2">
                  {currentOPLModal.oplData?.keyPoints?.map((kp, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs text-slate-300">
                      <p className="font-semibold text-white">{kp}</p>
                      {currentOPLModal.oplData?.reasons?.[idx] && (
                        <p className="text-[11px] text-slate-400 mt-1 pl-3 border-l-2 border-blue-500">
                          เหตุผล: {currentOPLModal.oplData.reasons[idx]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Caution & Don'ts */}
              {currentOPLModal.oplData?.cautionPoints && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-400">
                    <ShieldAlert size={15} />
                    ข้อควรระวัง / สิ่งที่ห้ามทำโดยเด็ดขาด:
                  </div>
                  <p>{currentOPLModal.oplData.cautionPoints}</p>
                </div>
              )}

              {/* Excel & PDF Documents */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <FileSpreadsheet size={14} className="text-emerald-400" />
                    <FileText size={14} className="text-rose-400" />
                    เอกสารแนบประกอบ ({currentOPLModal.pdfFiles?.length || 0} ไฟล์):
                  </h5>
                  <button
                    type="button"
                    onClick={() => oplFileInputRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-all shadow-sm"
                  >
                    <Plus size={12} />
                    + แนบไฟล์เอกสาร
                  </button>
                </div>

                {currentOPLModal.pdfFiles && currentOPLModal.pdfFiles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {currentOPLModal.pdfFiles.map(file => {
                      const isExcel = isExcelAttachment(file);
                      return (
                        <button
                          key={file.id}
                          onClick={() => onOpenPDF(file)}
                          className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-xs font-semibold transition-all ${
                            isExcel
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                              : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-300'
                          }`}
                        >
                          {isExcel ? <FileSpreadsheet size={14} /> : <FileText size={14} />}
                          <span>{file.name}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              isExcel ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {isExcel ? 'EXCEL' : 'PDF'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-1">ยังไม่มีเอกสารแนบ (กดปุ่ม &quot;+ แนบไฟล์เอกสาร&quot; เพื่อแนบไฟล์ Excel หรือ PDF)</p>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-900 flex justify-between items-center text-xs text-slate-400">
              <span>อนุมัติและเผยแพร่มาตรฐาน OPL สำหรับโรงงานอาหาร</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const proj = currentOPLModal;
                    setActiveOPLModal(null);
                    onEditProject(proj);
                  }}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white border border-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Edit3 size={13} />
                  แก้ไขข้อมูล & ไฟล์แนบ
                </button>
                <button
                  onClick={() => setActiveOPLModal(null)}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold"
                >
                  ปิด
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
