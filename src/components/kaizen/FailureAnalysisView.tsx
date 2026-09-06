import React, { useState, useRef } from 'react';
import { ImprovementProject, Machine, isExcelAttachment, MediaPhotoItem, PDFFileAttachment } from '../../types';
import { 
  Search, Plus, FileText, FileSpreadsheet, Wrench, AlertTriangle, ShieldCheck, 
  TrendingDown, DollarSign, Microscope, CheckCircle2, ChevronRight,
  Layers, Trash2, ExternalLink, Image as ImageIcon, Edit3, Upload
} from 'lucide-react';
import { compressImageFile } from '../../utils/imageUtils';

interface FailureAnalysisViewProps {
  faList: ImprovementProject[];
  machines: Machine[];
  onSelectProject: (proj: ImprovementProject) => void;
  onOpenPDF: (pdf: any) => void;
  onOpenPhoto: (photo: any) => void;
  onOpenCreateModal: () => void;
  onDeleteProject: (id: string) => void;
  onEditProject: (proj: ImprovementProject) => void;
  onUpdateProject?: (proj: ImprovementProject) => void;
}

export const FailureAnalysisView: React.FC<FailureAnalysisViewProps> = ({
  faList,
  machines,
  onSelectProject,
  onOpenPDF,
  onOpenPhoto,
  onOpenCreateModal,
  onDeleteProject,
  onEditProject,
  onUpdateProject
}) => {
  const [selectedFailureMode, setSelectedFailureMode] = useState<string>('all');
  const [activeFAModal, setActiveFAModal] = useState<ImprovementProject | null>(null);

  const faPhotoInputRef = useRef<HTMLInputElement>(null);
  const faFileInputRef = useRef<HTMLInputElement>(null);

  // Sync active modal with updated project from faList
  const currentFAModal = activeFAModal 
    ? (faList.find(f => f.id === activeFAModal.id) || activeFAModal) 
    : null;

  const handleQuickAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentFAModal || !onUpdateProject) return;
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
        ...currentFAModal,
        photos: [...(currentFAModal.photos || []), ...newPhotos]
      };
      onUpdateProject(updated);
      setActiveFAModal(updated);
    }
    if (e.target) e.target.value = '';
  };

  const handleQuickAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentFAModal || !onUpdateProject) return;
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
            ...currentFAModal,
            pdfFiles: [...(currentFAModal.pdfFiles || []), ...newDocs]
          };
          onUpdateProject(updated);
          setActiveFAModal(updated);
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

  const filteredList = faList.filter(item => {
    if (selectedFailureMode === 'all') return true;
    return item.faData?.failureMode?.includes(selectedFailureMode);
  });

  const failureModes = [
    { id: 'all', label: 'ทั้งหมด', count: faList.length },
    { id: 'Fatigue', label: 'การล้าตัว (Fatigue)', count: faList.filter(f => f.faData?.failureMode?.includes('Fatigue')).length },
    { id: 'Wear', label: 'การสึกหรอ (Wear)', count: faList.filter(f => f.faData?.failureMode?.includes('Wear')).length },
    { id: 'Fracture', label: 'การแตกหัก (Fracture)', count: faList.filter(f => f.faData?.failureMode?.includes('Fracture')).length },
    { id: 'Corrosion', label: 'การกัดกร่อน (Corrosion)', count: faList.filter(f => f.faData?.failureMode?.includes('Corrosion')).length },
    { id: 'Thermal', label: 'ความร้อน/ช็อต (Thermal)', count: faList.filter(f => f.faData?.failureMode?.includes('Thermal')).length },
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900/90 to-rose-950/40 p-5 rounded-2xl border border-rose-900/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-1.5">
              <Search size={14} />
              FAILURE ANALYSIS (FA)
            </span>
            <span className="text-xs text-slate-400">การวินิจฉัยและวิเคราะห์ความเสียหายชิ้นส่วนเครื่องจักร</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1.5">
            ศูนย์วิเคราะห์ความเสียหายเชิงวิศวกรรม (Failure Analysis Hub)
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            สืบค้นกลไกความเสียหาย (Mechanism), ตรวจสอบรอยแตกหัก (Fractography), ระบุรากเหง้าสาเหตุ พร้อมกำหนดมาตรการถาวรและแนบรายงาน Lab PDF
          </p>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
        >
          <Plus size={16} />
          สร้างบันทึก Failure Analysis ใหม่
        </button>
      </div>

      {/* Failure Mode Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {failureModes.map(fm => (
          <button
            key={fm.id}
            onClick={() => setSelectedFailureMode(fm.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              selectedFailureMode === fm.id
                ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span>{fm.label}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              selectedFailureMode === fm.id ? 'bg-rose-800 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {fm.count}
            </span>
          </button>
        ))}
      </div>

      {/* FA Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredList.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-slate-900/40 rounded-2xl border border-slate-800/80">
            <Microscope size={40} className="text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-400">ยังไม่มีรายการวิเคราะห์ความเสียหายในหมวดนี้</h3>
            <p className="text-xs text-slate-500 mt-1">คลิก &quot;สร้างบันทึก Failure Analysis ใหม่&quot; เพื่อเพิ่มเคสวิเคราะห์ชิ้นส่วนชำรุด</p>
          </div>
        ) : (
          filteredList.map(fa => {
            const data = fa.faData;
            const hasPdf = fa.pdfFiles && fa.pdfFiles.length > 0;
            const hasPhotos = fa.photoBefore || fa.photoAfter || (fa.photos && fa.photos.length > 0);

            return (
              <div
                key={fa.id}
                className="bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-rose-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-xl relative group"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                        {data?.failureMode || 'Failure Mode'}
                      </span>
                      {data?.rootCauseCategory && (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          ต้นเหตุ: {data.rootCauseCategory}
                        </span>
                      )}
                    </div>

                    {data?.estimatedCostLoss && (
                      <span className="text-xs font-mono text-rose-400 bg-rose-950/40 border border-rose-800/40 px-2.5 py-0.5 rounded-lg flex items-center gap-1 font-bold">
                        <DollarSign size={12} />
                        ความเสียหาย {data.estimatedCostLoss.toLocaleString()} ฿
                      </span>
                    )}
                  </div>

                  {/* Machine & Part Info */}
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                    <span className="text-cyan-400 font-semibold flex items-center gap-1">
                      <Wrench size={12} />
                      {getMachineName(fa.machineId)}
                    </span>
                    {data?.failurePartName && (
                      <>
                        <span>•</span>
                        <span className="text-amber-300 font-medium">{data.failurePartName}</span>
                      </>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-white group-hover:text-rose-300 transition-colors leading-snug">
                    {fa.title}
                  </h3>

                  {/* Mechanism Box */}
                  {data?.mechanismDescription && (
                    <div className="mt-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                      <div className="font-bold text-rose-400 flex items-center gap-1">
                        <Microscope size={13} />
                        กลไกการเกิดความเสียหาย (Mechanism):
                      </div>
                      <p className="text-slate-300 leading-relaxed line-clamp-3">
                        {data.mechanismDescription}
                      </p>
                    </div>
                  )}

                  {/* Actions summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-xs">
                    {data?.immediateContainment && (
                      <div className="bg-slate-900 p-2.5 rounded-xl border border-amber-500/20 text-slate-300">
                        <span className="text-amber-400 font-bold block mb-0.5">⚠️ มาตรการเฉพาะหน้า:</span>
                        <span className="line-clamp-2 text-slate-400">{data.immediateContainment}</span>
                      </div>
                    )}
                    {data?.permanentAction && (
                      <div className="bg-slate-900 p-2.5 rounded-xl border border-emerald-500/20 text-slate-300">
                        <span className="text-emerald-400 font-bold block mb-0.5">✓ มาตรการป้องกันถาวร:</span>
                        <span className="line-clamp-2 text-slate-400">{data.permanentAction}</span>
                      </div>
                    )}
                  </div>

                  {/* Photos & PDF */}
                  {hasPhotos && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800/80">
                      {fa.photoBefore && (
                        <button
                          type="button"
                          onClick={() => onOpenPhoto({
                            url: fa.photoBefore!,
                            title: fa.title,
                            subtitle: 'ภาพถ่ายความเสียหายชิ้นส่วน / หน้าตัดรอยแตก',
                            badge: 'DAMAGED PART'
                          })}
                          className="relative group/img overflow-hidden rounded-xl border border-rose-500/40 w-16 h-12 bg-slate-950 shrink-0 hover:scale-105 transition-all"
                        >
                          <img src={fa.photoBefore} alt="Damaged" className="w-full h-full object-cover" />
                          <span className="absolute bottom-0 inset-x-0 bg-rose-950/90 text-[8px] font-bold text-rose-300 text-center py-0.5">รอยแตก/ชำรุด</span>
                        </button>
                      )}

                      {/* Additional Photos badge */}
                      {fa.photos && fa.photos.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onOpenPhoto({
                            url: fa.photos![0].url,
                            title: fa.title,
                            subtitle: fa.photos![0].caption || 'ภาพถ่ายประกอบเพิ่มเติม',
                            badge: `รูปภาพ (${fa.photos!.length})`
                          })}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition-all shrink-0"
                          title={`ดูภาพถ่ายประกอบเพิ่มเติม (${fa.photos.length} รูป)`}
                        >
                          <ImageIcon size={13} />
                          +{fa.photos.length} รูป
                        </button>
                      )}

                      {/* Excel & PDF badges */}
                      {fa.pdfFiles && fa.pdfFiles.length > 0 && (() => {
                        const excelFiles = fa.pdfFiles.filter(isExcelAttachment);
                        const pdfFiles = fa.pdfFiles.filter(f => !isExcelAttachment(f));
                        return (
                          <div className="ml-auto flex items-center gap-1.5">
                            {excelFiles.length > 0 && (
                              <button
                                type="button"
                                onClick={() => onOpenPDF(excelFiles[0])}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-all"
                                title={`เปิดตารางวิเคราะห์ Excel: ${excelFiles[0].name}`}
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
                    <span className="w-6 h-6 rounded-full bg-rose-600/20 text-rose-400 flex items-center justify-center font-bold text-[10px]">
                      {fa.technician.charAt(fa.technician.length - 1)}
                    </span>
                    <span className="font-medium text-slate-300">ผู้วิเคราะห์: {fa.technician}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onEditProject(fa)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
                      title="แก้ไขข้อมูล, แนบไฟล์, รูปภาพเพิ่มเติม"
                    >
                      <Edit3 size={12} className="text-amber-400" />
                      แก้ไข
                    </button>
                    <button
                      onClick={() => setActiveFAModal(fa)}
                      className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <ExternalLink size={12} />
                      ดูรายงานฉบับเต็ม
                    </button>
                    <button
                      onClick={() => onDeleteProject(fa.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="ลบรายงาน FA"
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

      {/* Full FA Report Modal */}
      {currentFAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Hidden file & photo inputs for quick upload */}
            <input
              ref={faPhotoInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleQuickAddPhotos}
              className="hidden"
            />
            <input
              ref={faFileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/pdf"
              multiple
              onChange={handleQuickAddFiles}
              className="hidden"
            />

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <Microscope size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">รายงานวิเคราะห์ความเสียหายชิ้นส่วน (Failure Analysis Report)</h3>
                  <p className="text-xs text-slate-400">ระบบสืบค้นและวินิจฉัยเชิงวิศวกรรม (Engineering Root Cause Diagnosis)</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const proj = currentFAModal;
                    setActiveFAModal(null);
                    onEditProject(proj);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition-all shadow-sm"
                  title="แก้ไขข้อมูลทั้งหมด แนบไฟล์ หรือรูปภาพเพิ่มเติม"
                >
                  <Edit3 size={14} />
                  แก้ไขข้อมูล
                </button>
                <button
                  onClick={() => setActiveFAModal(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6 space-y-5 bg-slate-950/40">
              
              {/* Header Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block">รูปแบบความเสียหาย:</span>
                  <span className="text-rose-400 font-bold">{currentFAModal.faData?.failureMode}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">หมวดหมู่ต้นเหตุ:</span>
                  <span className="text-white font-semibold">{currentFAModal.faData?.rootCauseCategory}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">ชิ้นส่วนที่ชำรุด:</span>
                  <span className="text-amber-300 font-semibold">{currentFAModal.faData?.failurePartName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">เครื่องจักร:</span>
                  <span className="text-cyan-400 font-semibold">{getMachineName(currentFAModal.machineId)}</span>
                </div>
              </div>

              {/* Title & Description */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-bold text-white">เคส: {currentFAModal.title}</h4>
                  <button
                    onClick={() => {
                      const proj = currentFAModal;
                      setActiveFAModal(null);
                      onEditProject(proj);
                    }}
                    className="text-xs text-amber-400 hover:underline flex items-center gap-1 shrink-0"
                  >
                    <Edit3 size={11} />
                    แก้ไขเนื้อหา
                  </button>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{currentFAModal.description}</p>
              </div>

              {/* Damaged photo & Result Photo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentFAModal.photoBefore && (
                  <div className="bg-slate-900 p-4 rounded-xl border border-rose-500/30 space-y-2">
                    <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      <Microscope size={14} />
                      ภาพถ่ายชิ้นส่วนชำรุด (Damaged Part / Fracture):
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenPhoto({
                        url: currentFAModal.photoBefore!,
                        title: currentFAModal.title,
                        subtitle: 'ภาพถ่ายชิ้นส่วนชำรุด',
                        badge: 'DAMAGED PART'
                      })}
                      className="w-full text-left cursor-pointer group/photo overflow-hidden rounded-xl border border-slate-800"
                    >
                      <img src={currentFAModal.photoBefore} alt="Damaged Part" className="w-full h-48 object-cover group-hover/photo:scale-105 transition-transform" />
                    </button>
                  </div>
                )}

                {currentFAModal.photoAfter && (
                  <div className="bg-slate-900 p-4 rounded-xl border border-emerald-500/30 space-y-2">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck size={14} />
                      ภาพหลังแก้ไข / ชิ้นส่วนมาตรฐานใหม่:
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenPhoto({
                        url: currentFAModal.photoAfter!,
                        title: currentFAModal.title,
                        subtitle: 'ภาพหลังแก้ไข / มาตรฐานใหม่',
                        badge: 'CORRECTED PART'
                      })}
                      className="w-full text-left cursor-pointer group/photo overflow-hidden rounded-xl border border-slate-800"
                    >
                      <img src={currentFAModal.photoAfter} alt="Corrected Part" className="w-full h-48 object-cover group-hover/photo:scale-105 transition-transform" />
                    </button>
                  </div>
                )}
              </div>

              {/* Additional Photos Gallery in Report */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <ImageIcon size={14} />
                    รูปภาพประกอบเพิ่มเติม & หลักฐานหน้างาน ({currentFAModal.photos?.length || 0} รูป)
                  </span>
                  <button
                    type="button"
                    onClick={() => faPhotoInputRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-semibold transition-all shadow-sm"
                  >
                    <Plus size={12} />
                    + แนบรูปภาพเพิ่ม
                  </button>
                </div>

                {currentFAModal.photos && currentFAModal.photos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {currentFAModal.photos.map((photo, pIdx) => (
                      <button
                        key={photo.id || pIdx}
                        type="button"
                        onClick={() => onOpenPhoto({
                          url: photo.url,
                          title: currentFAModal.title,
                          subtitle: photo.caption || `ภาพประกอบ ${pIdx + 1}`,
                          badge: 'EVIDENCE'
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
                  <p className="text-xs text-slate-500 py-2">ยังไม่มีรูปภาพประกอบเพิ่มเติม (กดปุ่ม &quot;+ แนบรูปภาพเพิ่ม&quot; ด้านบนเพื่ออัปโหลด)</p>
                )}
              </div>

              {/* Mechanism Description */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                <h5 className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                  <Layers size={14} />
                  ลำดับกลไกการเกิดความเสียหาย (Failure Mechanism):
                </h5>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800">
                  {currentFAModal.faData?.mechanismDescription}
                </p>
                {currentFAModal.faData?.laboratoryFindings && (
                  <div className="text-xs text-slate-400 mt-2 bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                    <span className="text-cyan-400 font-semibold block mb-1">ผลตรวจทางแล็บ/คุณสมบัติวัสดุ:</span>
                    {currentFAModal.faData.laboratoryFindings}
                  </div>
                )}
              </div>

              {/* Containment and Permanent Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-900 p-4 rounded-xl border border-amber-500/30 space-y-1.5">
                  <h5 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle size={14} />
                    มาตรการแก้ไขเฉพาะหน้า (Immediate Action):
                  </h5>
                  <p className="text-xs text-slate-300">{currentFAModal.faData?.immediateContainment || '-'}</p>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-emerald-500/30 space-y-1.5">
                  <h5 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck size={14} />
                    มาตรการป้องกันถาวร (Preventive Action):
                  </h5>
                  <p className="text-xs text-slate-300">{currentFAModal.faData?.permanentAction || '-'}</p>
                </div>
              </div>

              {/* Excel & PDF Documents */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <FileSpreadsheet size={14} className="text-emerald-400" />
                    <FileText size={14} className="text-rose-400" />
                    เอกสารแนบประกอบการวิเคราะห์ ({currentFAModal.pdfFiles?.length || 0} ไฟล์):
                  </h5>
                  <button
                    type="button"
                    onClick={() => faFileInputRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-all shadow-sm"
                  >
                    <Plus size={12} />
                    + แนบไฟล์เอกสาร
                  </button>
                </div>

                {currentFAModal.pdfFiles && currentFAModal.pdfFiles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {currentFAModal.pdfFiles.map(file => {
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
              <span>รายงานวิเคราะห์ความเสียหายเพื่อการปรับปรุงและลดต้นทุน</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const proj = currentFAModal;
                    setActiveFAModal(null);
                    onEditProject(proj);
                  }}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white border border-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Edit3 size={13} />
                  แก้ไขข้อมูล & ไฟล์แนบ
                </button>
                <button
                  onClick={() => setActiveFAModal(null)}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all"
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
