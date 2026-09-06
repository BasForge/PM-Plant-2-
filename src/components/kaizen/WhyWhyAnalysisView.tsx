import React, { useState, useRef } from 'react';
import { ImprovementProject, Machine, isExcelAttachment, MediaPhotoItem, PDFFileAttachment } from '../../types';
import { 
  HelpCircle, Plus, FileText, FileSpreadsheet, Wrench, CheckCircle2, 
  ArrowDown, GitCommit, ShieldAlert, Sparkles, Trash2, ExternalLink,
  Layers, AlertTriangle, Image as ImageIcon, Edit3, Upload
} from 'lucide-react';
import { compressImageFile } from '../../utils/imageUtils';

interface WhyWhyAnalysisViewProps {
  whyList: ImprovementProject[];
  machines: Machine[];
  onSelectProject: (proj: ImprovementProject) => void;
  onOpenPDF: (pdf: any) => void;
  onOpenPhoto: (photo: any) => void;
  onOpenCreateModal: () => void;
  onDeleteProject: (id: string) => void;
  onEditProject: (proj: ImprovementProject) => void;
  onUpdateProject?: (proj: ImprovementProject) => void;
}

export const WhyWhyAnalysisView: React.FC<WhyWhyAnalysisViewProps> = ({
  whyList,
  machines,
  onSelectProject,
  onOpenPDF,
  onOpenPhoto,
  onOpenCreateModal,
  onDeleteProject,
  onEditProject,
  onUpdateProject
}) => {
  const [activeWhyModal, setActiveWhyModal] = useState<ImprovementProject | null>(null);

  const whyPhotoInputRef = useRef<HTMLInputElement>(null);
  const whyFileInputRef = useRef<HTMLInputElement>(null);

  // Sync active modal with updated project from whyList
  const currentWhyModal = activeWhyModal 
    ? (whyList.find(w => w.id === activeWhyModal.id) || activeWhyModal) 
    : null;

  const handleQuickAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentWhyModal || !onUpdateProject) return;
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
        ...currentWhyModal,
        photos: [...(currentWhyModal.photos || []), ...newPhotos]
      };
      onUpdateProject(updated);
      setActiveWhyModal(updated);
    }
    if (e.target) e.target.value = '';
  };

  const handleQuickAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentWhyModal || !onUpdateProject) return;
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
            ...currentWhyModal,
            pdfFiles: [...(currentWhyModal.pdfFiles || []), ...newDocs]
          };
          onUpdateProject(updated);
          setActiveWhyModal(updated);
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

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900/90 to-amber-950/40 p-5 rounded-2xl border border-amber-900/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-1.5">
              <HelpCircle size={14} />
              WHY-WHY ANALYSIS (5 WHYS)
            </span>
            <span className="text-xs text-slate-400">การวิเคราะห์หาสาเหตุรากเหง้าอย่างเป็นระบบ 5 ระดับ</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1.5">
            กระดานสืบค้นสาเหตุรากเหง้า Why-Why Analysis
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            เจาะลึกปัญหาตั้งแต่ปรากฏการณ์หน้างาน ไล่เรียงลำดับเหตุและผล 5 ขั้นตอน จนถึงต้นตอความบกพร่องของระบบ พร้อมกำหนดมาตรการแก้ไขและจัดทำมาตรฐาน (Standardization)
          </p>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all"
        >
          <Plus size={16} />
          สร้างการวิเคราะห์ Why-Why ใหม่
        </button>
      </div>

      {/* Why-Why Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {whyList.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-slate-900/40 rounded-2xl border border-slate-800/80">
            <HelpCircle size={40} className="text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-400">ยังไม่มีบันทึกการวิเคราะห์ Why-Why</h3>
            <p className="text-xs text-slate-500 mt-1">คลิกปุ่ม &quot;สร้างการวิเคราะห์ Why-Why ใหม่&quot; เพื่อเริ่มต้นวิเคราะห์ปัญหา</p>
          </div>
        ) : (
          whyList.map(item => {
            const data = item.whyWhyData;
            const hasPdf = item.pdfFiles && item.pdfFiles.length > 0;
            const hasPhotos = item.photoBefore || item.photoAfter || (item.photos && item.photos.length > 0);

            const whys = [
              { label: 'Why 1', text: data?.why1 },
              { label: 'Why 2', text: data?.why2 },
              { label: 'Why 3', text: data?.why3 },
              { label: 'Why 4', text: data?.why4 },
              { label: 'Why 5 (Root Cause)', text: data?.why5, isRoot: true },
            ].filter(w => Boolean(w.text));

            return (
              <div
                key={item.id}
                className="bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-xl relative group"
              >
                <div>
                  {/* Machine Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-semibold text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                      <Wrench size={13} />
                      {getMachineName(item.machineId)}
                    </span>
                    {data?.standardizationRef && (
                      <span className="text-[11px] font-mono text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2.5 py-0.5 rounded-lg">
                        Std: {data.standardizationRef}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors leading-snug">
                    {item.title}
                  </h3>

                  {/* Problem & Phenomenon */}
                  <div className="mt-3 space-y-2 text-xs">
                    {data?.problemStatement && (
                      <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl text-rose-300">
                        <span className="font-bold block text-rose-400 mb-0.5">🚨 สภาพปัญหา (Problem Statement):</span>
                        {data.problemStatement}
                      </div>
                    )}
                    {data?.phenomenon && (
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-slate-300">
                        <span className="font-bold block text-amber-400 mb-0.5">👁️ ปรากฏการณ์หน้างาน (Phenomenon):</span>
                        {data.phenomenon}
                      </div>
                    )}
                  </div>

                  {/* 5-Whys Ladder Flow Preview */}
                  {whys.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-400 block mb-1">
                        ลำดับการถาม-ตอบ 5 Whys:
                      </span>
                      {whys.slice(0, 3).map((w, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono shrink-0 ${
                            w.isRoot ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-slate-800 text-amber-400'
                          }`}>
                            {w.label}
                          </span>
                          <span className="truncate">{w.text}</span>
                        </div>
                      ))}
                      {whys.length > 3 && (
                        <p className="text-[10px] text-slate-500 text-center italic">
                          + อีก {whys.length - 3} ขั้นตอนจนถึง Root Cause
                        </p>
                      )}
                    </div>
                  )}

                  {/* Root cause summary badge */}
                  {data?.rootCauseSummary && (
                    <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
                      <span className="font-bold block text-amber-400 mb-0.5">🎯 สาเหตุรากเหง้า (Root Cause):</span>
                      <p className="line-clamp-2 text-slate-300">{data.rootCauseSummary}</p>
                    </div>
                  )}

                  {/* Photos & PDF */}
                  {hasPhotos && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800/80">
                      {item.photoBefore && (
                        <button
                          type="button"
                          onClick={() => onOpenPhoto({
                            url: item.photoBefore!,
                            title: item.title,
                            subtitle: 'ภาพถ่ายหลักฐานปัญหาหน้างาน',
                            badge: 'EVIDENCE'
                          })}
                          className="relative group/img overflow-hidden rounded-xl border border-amber-500/40 w-16 h-12 bg-slate-950 shrink-0 hover:scale-105 transition-all"
                        >
                          <img src={item.photoBefore} alt="Evidence" className="w-full h-full object-cover" />
                          <span className="absolute bottom-0 inset-x-0 bg-amber-950/90 text-[8px] font-bold text-amber-300 text-center py-0.5">หลักฐาน</span>
                        </button>
                      )}

                      {/* Additional Photos badge */}
                      {item.photos && item.photos.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onOpenPhoto({
                            url: item.photos![0].url,
                            title: item.title,
                            subtitle: item.photos![0].caption || 'ภาพประกอบการวิเคราะห์',
                            badge: `รูปภาพ (${item.photos!.length})`
                          })}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition-all shrink-0"
                          title={`ดูรูปภาพประกอบเพิ่มเติม (${item.photos.length} รูป)`}
                        >
                          <ImageIcon size={13} />
                          +{item.photos.length} รูป
                        </button>
                      )}

                      {/* Excel & PDF badges */}
                      {item.pdfFiles && item.pdfFiles.length > 0 && (() => {
                        const excelFiles = item.pdfFiles.filter(isExcelAttachment);
                        const pdfFiles = item.pdfFiles.filter(f => !isExcelAttachment(f));
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
                                title={`เปิดรายงาน PDF: ${pdfFiles[0].name}`}
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
                    <span className="w-6 h-6 rounded-full bg-amber-600/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">
                      {item.technician.charAt(item.technician.length - 1)}
                    </span>
                    <span className="font-medium text-slate-300">ทีมวิเคราะห์: {item.technician}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onEditProject(item)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
                      title="แก้ไขข้อมูล, แนบไฟล์, รูปภาพเพิ่มเติม"
                    >
                      <Edit3 size={12} className="text-amber-400" />
                      แก้ไข
                    </button>
                    <button
                      onClick={() => setActiveWhyModal(item)}
                      className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <ExternalLink size={12} />
                      เปิดดูลำดับ 5-Whys ฉบับเต็ม
                    </button>
                    <button
                      onClick={() => onDeleteProject(item.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="ลบบันทึก Why-Why"
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

      {/* Full 5-Whys Flow Ladder Modal */}
      {currentWhyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Hidden file & photo inputs for quick upload */}
            <input
              ref={whyPhotoInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleQuickAddPhotos}
              className="hidden"
            />
            <input
              ref={whyFileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/pdf"
              multiple
              onChange={handleQuickAddFiles}
              className="hidden"
            />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <HelpCircle size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">ผังการวิเคราะห์หาสาเหตุรากเหง้า (5-Whys Root Cause Tree)</h3>
                  <p className="text-xs text-slate-400">การวิเคราะห์ห่วงโซ่เหตุและผล (Cause & Effect Chain Analysis)</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const proj = currentWhyModal;
                    setActiveWhyModal(null);
                    onEditProject(proj);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition-all shadow-sm"
                  title="แก้ไขข้อมูลทั้งหมด แนบไฟล์ หรือรูปภาพเพิ่มเติม"
                >
                  <Edit3 size={14} />
                  แก้ไขข้อมูล
                </button>
                <button
                  onClick={() => setActiveWhyModal(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto p-6 space-y-5 bg-slate-950/40">
              
              {/* Header Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block">เครื่องจักร:</span>
                  <span className="text-cyan-400 font-semibold">{getMachineName(currentWhyModal.machineId)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">ผู้รับผิดชอบ / ทีมวิเคราะห์:</span>
                  <span className="text-white font-semibold">{currentWhyModal.technician}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">มาตรฐานอ้างอิง:</span>
                  <span className="text-amber-400 font-mono font-semibold">{currentWhyModal.whyWhyData?.standardizationRef || '-'}</span>
                </div>
              </div>

              {/* Problem and Phenomenon */}
              <div className="space-y-2 bg-slate-900 p-4 rounded-xl border border-slate-800">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-bold text-white">หัวข้อ: {currentWhyModal.title}</h4>
                  <button
                    onClick={() => {
                      const proj = currentWhyModal;
                      setActiveWhyModal(null);
                      onEditProject(proj);
                    }}
                    className="text-xs text-amber-400 hover:underline flex items-center gap-1 shrink-0"
                  >
                    <Edit3 size={11} />
                    แก้ไขเนื้อหา
                  </button>
                </div>
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300">
                  <span className="font-bold text-rose-400 block mb-1">🚨 สภาพปัญหา:</span>
                  {currentWhyModal.whyWhyData?.problemStatement || currentWhyModal.description}
                </div>
                {currentWhyModal.whyWhyData?.phenomenon && (
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300">
                    <span className="font-bold text-amber-400 block mb-1">👁️ ปรากฏการณ์หน้างาน:</span>
                    {currentWhyModal.whyWhyData.phenomenon}
                  </div>
                )}
              </div>

              {/* Photos: Before / After if exists */}
              {(currentWhyModal.photoBefore || currentWhyModal.photoAfter) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {currentWhyModal.photoBefore && (
                    <div className="bg-slate-900 p-3 rounded-xl border border-rose-500/30 space-y-1.5">
                      <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                        🔍 สภาพปัญหาก่อนวิเคราะห์:
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenPhoto({
                          url: currentWhyModal.photoBefore!,
                          title: currentWhyModal.title,
                          subtitle: 'สภาพปัญหาก่อนวิเคราะห์',
                          badge: 'BEFORE'
                        })}
                        className="w-full text-left cursor-pointer group/photo overflow-hidden rounded-lg border border-slate-800"
                      >
                        <img src={currentWhyModal.photoBefore} alt="Before" className="w-full h-44 object-cover group-hover/photo:scale-105 transition-transform" />
                      </button>
                    </div>
                  )}
                  {currentWhyModal.photoAfter && (
                    <div className="bg-slate-900 p-3 rounded-xl border border-emerald-500/30 space-y-1.5">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        ✓ หลังดำเนินมาตรการแก้ไข:
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenPhoto({
                          url: currentWhyModal.photoAfter!,
                          title: currentWhyModal.title,
                          subtitle: 'หลังดำเนินมาตรการแก้ไข',
                          badge: 'AFTER'
                        })}
                        className="w-full text-left cursor-pointer group/photo overflow-hidden rounded-lg border border-slate-800"
                      >
                        <img src={currentWhyModal.photoAfter} alt="After" className="w-full h-44 object-cover group-hover/photo:scale-105 transition-transform" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Additional Photos Gallery */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <ImageIcon size={14} />
                    รูปภาพประกอบหลักฐานและการวิเคราะห์ ({currentWhyModal.photos?.length || 0} รูป)
                  </span>
                  <button
                    type="button"
                    onClick={() => whyPhotoInputRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-semibold transition-all shadow-sm"
                  >
                    <Plus size={12} />
                    + แนบรูปภาพเพิ่ม
                  </button>
                </div>

                {currentWhyModal.photos && currentWhyModal.photos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {currentWhyModal.photos.map((photo, pIdx) => (
                      <button
                        key={photo.id || pIdx}
                        type="button"
                        onClick={() => onOpenPhoto({
                          url: photo.url,
                          title: currentWhyModal.title,
                          subtitle: photo.caption || `ภาพประกอบ ${pIdx + 1}`,
                          badge: '5-WHYS PHOTO'
                        })}
                        className="group/thumb relative rounded-lg overflow-hidden border border-slate-800 hover:border-cyan-500/60 bg-slate-950 text-left transition-all"
                      >
                        <img
                          src={photo.url}
                          alt={photo.caption || 'Evidence'}
                          className="w-full h-24 object-cover group-hover/thumb:scale-105 transition-transform"
                        />
                        <div className="p-1.5 bg-slate-900/90 text-[10px] text-slate-300 truncate">
                          {photo.caption || `รูปที่ ${pIdx + 1}`}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-1">ยังไม่มีรูปภาพประกอบเพิ่มเติม (กดปุ่ม &quot;+ แนบรูปภาพเพิ่ม&quot; เพื่ออัปโหลด)</p>
                )}
              </div>

              {/* Interactive 5-Whys Ladder Flow */}
              <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-3">
                <h5 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Layers size={14} />
                  บันไดสืบค้นสาเหตุ 5 ระดับ (5 Whys Chain of Causation):
                </h5>

                <div className="space-y-3 pl-2">
                  {[
                    { num: 1, text: currentWhyModal.whyWhyData?.why1, label: 'Why 1: ทำไมเกิดปรากฏการณ์นี้?' },
                    { num: 2, text: currentWhyModal.whyWhyData?.why2, label: 'Why 2: ทำไมจึงเกิดสาเหตุที่ 1?' },
                    { num: 3, text: currentWhyModal.whyWhyData?.why3, label: 'Why 3: ทำไมจึงเกิดสาเหตุที่ 2?' },
                    { num: 4, text: currentWhyModal.whyWhyData?.why4, label: 'Why 4: ทำไมจึงเกิดสาเหตุที่ 3?' },
                    { num: 5, text: currentWhyModal.whyWhyData?.why5, label: 'Why 5: ทำไมระบบจึงยอมให้เกิดสิ่งนี้? (Root Cause)', isRoot: true },
                  ].filter(w => Boolean(w.text)).map((w, idx, arr) => (
                    <div key={w.num} className="relative">
                      <div className={`p-3.5 rounded-xl border transition-all ${
                        w.isRoot 
                          ? 'bg-rose-950/40 border-rose-500/50 shadow-lg shadow-rose-500/10' 
                          : 'bg-slate-950 border-slate-800'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-[10px] ${
                            w.isRoot ? 'bg-rose-500 text-white' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {w.num}
                          </span>
                          <span className={`text-xs font-bold ${w.isRoot ? 'text-rose-400' : 'text-amber-400'}`}>
                            {w.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 pl-7 leading-relaxed font-medium">
                          {w.text}
                        </p>
                      </div>

                      {idx < arr.length - 1 && (
                        <div className="flex justify-center my-1 text-slate-600">
                          <ArrowDown size={16} className="text-amber-500/50" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Countermeasure and Standardization */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-900 p-4 rounded-xl border border-emerald-500/30 space-y-1.5">
                  <h5 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    มาตรการแก้ไขเชิงระบบ (Countermeasures):
                  </h5>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {currentWhyModal.whyWhyData?.countermeasure || '-'}
                  </p>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-cyan-500/30 space-y-1.5">
                  <h5 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <Sparkles size={14} />
                    การติดตามผล (Verification):
                  </h5>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {currentWhyModal.whyWhyData?.effectivenessVerification || '-'}
                  </p>
                </div>
              </div>

              {/* Excel & PDF Documents */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <FileSpreadsheet size={14} className="text-emerald-400" />
                    <FileText size={14} className="text-rose-400" />
                    เอกสารแนบการวิเคราะห์ ({currentWhyModal.pdfFiles?.length || 0} ไฟล์):
                  </h5>
                  <button
                    type="button"
                    onClick={() => whyFileInputRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-all shadow-sm"
                  >
                    <Plus size={12} />
                    + แนบไฟล์เอกสาร
                  </button>
                </div>

                {currentWhyModal.pdfFiles && currentWhyModal.pdfFiles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {currentWhyModal.pdfFiles.map(file => {
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
              <span>รายงานวิเคราะห์ 5 Whys เพื่อขจัดปัญหาซ้ำซากให้เป็นศูนย์</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const proj = currentWhyModal;
                    setActiveWhyModal(null);
                    onEditProject(proj);
                  }}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white border border-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Edit3 size={13} />
                  แก้ไขข้อมูล & ไฟล์แนบ
                </button>
                <button
                  onClick={() => setActiveWhyModal(null)}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold"
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
