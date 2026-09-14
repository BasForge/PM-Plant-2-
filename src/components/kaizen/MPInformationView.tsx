import React, { useState, useRef } from 'react';
import { ImprovementProject, Machine, isExcelAttachment, MediaPhotoItem, PDFFileAttachment } from '../../types';
import { 
  FileCheck, Plus, FileText, FileSpreadsheet, Wrench, CheckCircle2, 
  ArrowRight, ShieldCheck, Sparkles, Trash2, Image as ImageIcon, 
  Edit3, Sliders, Send, Clock, Layers, AlertCircle, Tag, Printer
} from 'lucide-react';
import { compressImageFile } from '../../utils/imageUtils';

interface MPInformationViewProps {
  mpList: ImprovementProject[];
  machines: Machine[];
  onSelectProject: (proj: ImprovementProject) => void;
  onOpenPDF: (pdf: any) => void;
  onOpenPhoto: (photo: any) => void;
  onOpenCreateModal: () => void;
  onDeleteProject: (id: string) => void;
  onEditProject: (proj: ImprovementProject) => void;
  onUpdateProject?: (proj: ImprovementProject) => void;
}

export const MPInformationView: React.FC<MPInformationViewProps> = ({
  mpList,
  machines,
  onSelectProject,
  onOpenPDF,
  onOpenPhoto,
  onOpenCreateModal,
  onDeleteProject,
  onEditProject,
  onUpdateProject
}) => {
  const [activeMPModal, setActiveMPModal] = useState<ImprovementProject | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPhase, setSelectedPhase] = useState<string>('all');

  const mpPhotoInputRef = useRef<HTMLInputElement>(null);
  const mpFileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize modal state with updated list
  const currentMPModal = activeMPModal 
    ? (mpList.find(m => m.id === activeMPModal.id) || activeMPModal)
    : null;

  const handleQuickAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentMPModal || !onUpdateProject) return;
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
        ...currentMPModal,
        photos: [...(currentMPModal.photos || []), ...newPhotos]
      };
      onUpdateProject(updated);
      setActiveMPModal(updated);
    }
    if (e.target) e.target.value = '';
  };

  const handleQuickAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentMPModal || !onUpdateProject) return;
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
            ...currentMPModal,
            pdfFiles: [...(currentMPModal.pdfFiles || []), ...newDocs]
          };
          onUpdateProject(updated);
          setActiveMPModal(updated);
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

  const filteredList = mpList.filter(item => {
    if (selectedCategory !== 'all') {
      if (!item.mpData?.mpCategory?.includes(selectedCategory)) return false;
    }
    if (selectedPhase !== 'all') {
      if (!item.mpData?.targetPhase?.includes(selectedPhase)) return false;
    }
    return true;
  });

  const categoryFilters = [
    { id: 'all', label: 'ทั้งหมด', count: mpList.length },
    { id: 'Maintainability', label: 'บำรุงรักษาง่าย (Maintainability)', count: mpList.filter(m => m.mpData?.mpCategory?.includes('Maintainability')).length },
    { id: 'Reliability', label: 'ความน่าเชื่อถือ (Reliability)', count: mpList.filter(m => m.mpData?.mpCategory?.includes('Reliability')).length },
    { id: 'Safety', label: 'ความปลอดภัย & การยศาสตร์', count: mpList.filter(m => m.mpData?.mpCategory?.includes('Safety')).length },
    { id: 'Clean', label: 'ทำความสะอาด & ตรวจสอบ', count: mpList.filter(m => m.mpData?.mpCategory?.includes('Clean')).length },
    { id: 'Quick Setup', label: 'ลดเวลาปรับตั้ง/เปลี่ยนรุ่น', count: mpList.filter(m => m.mpData?.mpCategory?.includes('Quick Setup')).length },
    { id: 'New Machine', label: 'สเปกเครื่องใหม่ (New Machine Spec)', count: mpList.filter(m => m.mpData?.mpCategory?.includes('New Machine')).length },
  ];

  const getActionBadgeClass = (status?: string) => {
    if (!status) return 'bg-slate-800 text-slate-300 border-slate-700';
    if (status.includes('บรรจุในมาตรฐาน')) return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    if (status.includes('ปรับปรุงสำเร็จ')) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    if (status.includes('กำลังศึกษา')) return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-emerald-950/40 p-5 rounded-2xl border border-emerald-800/40 shadow-xl">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
              <FileCheck size={14} />
              MP INFORMATION SHEET (MAINTENANCE PREVENTION)
            </span>
            <span className="text-xs text-slate-400">ใบข้อมูลเพื่อการป้องกันการบำรุงรักษาและการออกแบบเครื่องจักร</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1.5">
            กระดานใบข้อมูลการป้องกันการบำรุงรักษา (MP Information Sheet Hub)
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            รวบรวมข้อเสนอแนะจากการซ่อมบำรุงหน้างาน เพื่อส่งต่อ (Feedback) ไปยังผู้ออกแบบ ผู้จัดซื้อ และผู้ผลิตเครื่องจักร (Maker) สำหรับการปรับปรุงความง่ายในการบำรุงรักษา (Maintainability) ความน่าเชื่อถือ (Reliability) และบรรจุเป็นข้อกำหนดสเปกเครื่องจักรใหม่
          </p>
        </div>

        <button
          id="btn-create-mp-sheet"
          onClick={onOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all whitespace-nowrap cursor-pointer"
        >
          <Plus size={16} />
          สร้าง MP Information Sheet ใหม่
        </button>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {categoryFilters.map(filter => (
          <button
            key={filter.id}
            onClick={() => setSelectedCategory(filter.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedCategory === filter.id
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <span>{filter.label}</span>
            <span className={`px-1.5 py-0.2 text-[10px] font-mono rounded-full ${
              selectedCategory === filter.id ? 'bg-emerald-950 text-emerald-200' : 'bg-slate-800 text-slate-400'
            }`}>
              {filter.count}
            </span>
          </button>
        ))}
      </div>

      {/* MP Information Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredList.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-slate-900/40 rounded-2xl border border-slate-800/80">
            <FileCheck size={40} className="text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-400">ยังไม่มีบันทึก MP Information Sheet ในหมวดนี้</h3>
            <p className="text-xs text-slate-500 mt-1">คลิกปุ่ม &quot;สร้าง MP Information Sheet ใหม่&quot; เพื่อเพิ่มใบข้อมูลป้องกันการบำรุงรักษา</p>
          </div>
        ) : (
          filteredList.map(mp => {
            const hasBefore = Boolean(mp.photoBefore);
            const hasAfter = Boolean(mp.photoAfter);
            const totalPhotos = (hasBefore ? 1 : 0) + (hasAfter ? 1 : 0) + (mp.photos?.length || 0);

            return (
              <div
                key={mp.id}
                className="bg-slate-900/90 rounded-2xl border border-emerald-900/40 hover:border-emerald-500/60 p-5 space-y-4 shadow-xl transition-all group flex flex-col justify-between"
              >
                <div className="space-y-3.5">
                  {/* Card Header */}
                  <div className="flex justify-between items-start gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {mp.mpData?.mpCategory?.split('(')[0] || 'MP SHEET'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-cyan-400 border border-slate-800">
                          ⚙️ {getMachineName(mp.machineId)}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getActionBadgeClass(mp.mpData?.actionStatus)}`}>
                          {mp.mpData?.actionStatus || 'เสนอแนะ'}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug">
                        {mp.title}
                      </h3>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                      mp.status === 'เสร็จแล้ว'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}>
                      {mp.status}
                    </span>
                  </div>

                  {/* Target Phase & Feedback Target */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                    <div>
                      <span className="text-slate-500 block text-[10px] font-medium">เป้าหมาย (Phase):</span>
                      <span className="text-cyan-300 font-semibold truncate block">
                        {mp.mpData?.targetPhase || 'ปรับปรุงเครื่องปัจจุบัน'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] font-medium">ส่งต่อข้อมูลถึง (Feedback To):</span>
                      <span className="text-amber-300 font-semibold truncate block">
                        {mp.mpData?.feedbackTarget || 'แผนกวิศวกรรม & Maker'}
                      </span>
                    </div>
                  </div>

                  {/* Current Weakness vs Proposed MP Design Comparison */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Weakness */}
                    <div className="bg-rose-950/20 p-3 rounded-xl border border-rose-900/40 space-y-1">
                      <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
                        <AlertCircle size={13} />
                        สภาพปัญหา / จุดอ่อนเดิม:
                      </span>
                      <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                        {mp.mpData?.issueDescription || mp.description}
                      </p>
                    </div>

                    {/* Proposed MP Improvement */}
                    <div className="bg-emerald-950/20 p-3 rounded-xl border border-emerald-900/40 space-y-1">
                      <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                        <Sparkles size={13} />
                        ข้อเสนอแนะการออกแบบ (MP Design):
                      </span>
                      <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                        {mp.mpData?.proposedDesignChange || 'รอดำเนินการระบุแนวทางการออกแบบ'}
                      </p>
                    </div>
                  </div>

                  {/* Expected Benefits pill */}
                  {mp.mpData?.expectedBenefits && (
                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                        <span className="text-slate-400 text-[11px]">ประโยชน์ที่คาดว่าจะได้รับ:</span>
                        <span className="text-slate-200 font-medium truncate text-xs">{mp.mpData.expectedBenefits}</span>
                      </div>
                      {mp.mpData.costSavingEstimate ? (
                        <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/40 shrink-0">
                          +฿{mp.mpData.costSavingEstimate.toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                  )}

                  {/* Photos and Attachments Bar */}
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <ImageIcon size={13} className="text-cyan-400" />
                        {totalPhotos} รูปภาพ
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText size={13} className="text-rose-400" />
                        {mp.pdfFiles?.length || 0} ไฟล์แนบ
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-mono text-[11px]">ผู้จัดทำ: {mp.technician}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveMPModal(mp)}
                    className="flex-1 py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <FileCheck size={14} />
                    เปิดอ่าน MP Sheet ฉบับเต็ม
                  </button>

                  <button
                    type="button"
                    onClick={() => onEditProject(mp)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-colors cursor-pointer"
                    title="แก้ไขข้อมูล"
                  >
                    <Edit3 size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('คุณแน่ใจว่าต้องการลบ MP Information Sheet นี้ใช่หรือไม่?')) {
                        onDeleteProject(mp.id);
                      }
                    }}
                    className="p-2 bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-400 rounded-xl text-xs transition-colors cursor-pointer"
                    title="ลบรายการ"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Hidden file inputs for quick uploads inside modal */}
      <input
        type="file"
        ref={mpPhotoInputRef}
        onChange={handleQuickAddPhotos}
        accept="image/*"
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={mpFileInputRef}
        onChange={handleQuickAddFiles}
        accept=".pdf,.xlsx,.xls,.csv"
        multiple
        className="hidden"
      />

      {/* FULL MODAL: MP INFORMATION SHEET DETAILS & PRINT */}
      {currentMPModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-emerald-900/50 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/70">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <FileCheck size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {currentMPModal.id.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-400">• TPM MAINTENANCE PREVENTION SHEET</span>
                  </div>
                  <h3 className="text-base font-bold text-white line-clamp-1">
                    {currentMPModal.title}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="พิมพ์ / Print MP Sheet"
                >
                  <Printer size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const p = currentMPModal;
                    setActiveMPModal(null);
                    onEditProject(p);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-slate-700"
                >
                  <Edit3 size={13} />
                  แก้ไข
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMPModal(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* Machine & Metadata Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block">เครื่องจักร:</span>
                  <span className="text-cyan-400 font-semibold">{getMachineName(currentMPModal.machineId)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">ผู้จัดทำข้อมูล:</span>
                  <span className="text-white font-semibold">{currentMPModal.technician}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">วันที่จัดทำ:</span>
                  <span className="text-slate-300 font-mono">{currentMPModal.startDate}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">สถานะผลงาน:</span>
                  <span className="text-emerald-400 font-semibold">{currentMPModal.status}</span>
                </div>
              </div>

              {/* MP Classification & Target Spec Details */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-emerald-900/30 space-y-3">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <Tag size={14} />
                  การจัดหมวดหมู่ข้อมูล MP (Maintenance Prevention Classification)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block text-[11px] mb-1">หมวดหมู่ MP:</span>
                    <span className="text-white font-bold block">{currentMPModal.mpData?.mpCategory || 'ความง่ายในการบำรุงรักษา'}</span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block text-[11px] mb-1">เป้าหมายการประยุกต์ใช้:</span>
                    <span className="text-cyan-300 font-bold block">{currentMPModal.mpData?.targetPhase || 'ปรับปรุงเครื่องจักรปัจจุบัน'}</span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block text-[11px] mb-1">สถานะข้อเสนอแนะ:</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[11px] inline-block ${getActionBadgeClass(currentMPModal.mpData?.actionStatus)}`}>
                      {currentMPModal.mpData?.actionStatus || 'เสนอแนะ'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Core Comparison: Current Weakness vs Proposed MP Design */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Left: Current Weakness */}
                <div className="bg-slate-950 p-4 rounded-xl border border-rose-800/40 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="text-rose-400" />
                    <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                      สภาพปัญหา / จุดอ่อนเดิมหน้างาน (Current Weakness)
                    </h4>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900 p-3 rounded-lg border border-slate-800 min-h-[90px]">
                    {currentMPModal.mpData?.issueDescription || currentMPModal.description}
                  </p>

                  {/* Before Photo */}
                  {currentMPModal.photoBefore && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                        <ImageIcon size={12} />
                        ภาพถ่ายจุดเกิดเหตุ / สภาพปัญหาเดิม:
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenPhoto({
                          url: currentMPModal.photoBefore!,
                          title: currentMPModal.title,
                          subtitle: 'สภาพปัญหาเดิมหน้างาน (Current Weakness)',
                          badge: 'CURRENT ISSUE'
                        })}
                        className="w-full overflow-hidden rounded-lg border border-slate-800 group/img cursor-pointer"
                      >
                        <img
                          src={currentMPModal.photoBefore}
                          alt="Before Issue"
                          className="w-full h-48 object-cover group-hover/img:scale-105 transition-transform"
                        />
                      </button>
                    </div>
                  )}
                </div>

                {/* Right: Proposed MP Design & Improvement */}
                <div className="bg-slate-950 p-4 rounded-xl border border-emerald-800/40 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-emerald-400" />
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      ข้อเสนอแนะการออกแบบ / แบบร่าง MP (Proposed MP Design)
                    </h4>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900 p-3 rounded-lg border border-slate-800 min-h-[90px]">
                    {currentMPModal.mpData?.proposedDesignChange || 'รอดำเนินการระบุแนวทางการออกแบบ'}
                  </p>

                  {/* After Photo / Proposal Drawing */}
                  {currentMPModal.photoAfter && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                        <ImageIcon size={12} />
                        ภาพแบบเสนอ MP / หลังปรับปรุงสำเร็จ:
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenPhoto({
                          url: currentMPModal.photoAfter!,
                          title: currentMPModal.title,
                          subtitle: 'แบบเสนอ MP / สภาพหลังปรับปรุง (MP Design)',
                          badge: 'MP PROPOSAL'
                        })}
                        className="w-full overflow-hidden rounded-lg border border-slate-800 group/img cursor-pointer"
                      >
                        <img
                          src={currentMPModal.photoAfter}
                          alt="After Proposal"
                          className="w-full h-48 object-cover group-hover/img:scale-105 transition-transform"
                        />
                      </button>
                    </div>
                  )}
                </div>

              </div>

              {/* Handover / Feedback Target & Expected Benefits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Benefits */}
                <div className="bg-slate-950 p-4 rounded-xl border border-cyan-800/30 space-y-2">
                  <h4 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    ประโยชน์ที่คาดว่าจะได้รับ (Expected Benefits):
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900 p-3 rounded-lg border border-slate-800">
                    {currentMPModal.mpData?.expectedBenefits || 'ลดความถี่ในการขัดข้องและย่นระยะเวลาการซ่อมบำรุง'}
                  </p>
                  {currentMPModal.mpData?.costSavingEstimate ? (
                    <div className="flex justify-between items-center text-xs bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400">ผลประหยัดหรือลดค่าซ่อมประเมิน:</span>
                      <span className="text-emerald-400 font-mono font-bold">
                        ฿{currentMPModal.mpData.costSavingEstimate.toLocaleString()} บาท/ปี
                      </span>
                    </div>
                  ) : null}
                </div>

                {/* Handover / Feedback Target */}
                <div className="bg-slate-950 p-4 rounded-xl border border-amber-800/30 space-y-2">
                  <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Send size={14} />
                    หน่วยงานที่ส่งต่อข้อมูล (Feedback To / Handover):
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900 p-3 rounded-lg border border-slate-800">
                    {currentMPModal.mpData?.feedbackTarget || 'แผนกวิศวกรรม & ผู้ผลิตเครื่องจักร Maker'}
                  </p>
                  {currentMPModal.mpData?.referenceSource && (
                    <div className="flex justify-between items-center text-xs bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400">เอกสารหรือกรณีอ้างอิง:</span>
                      <span className="text-cyan-400 font-mono">
                        {currentMPModal.mpData.referenceSource}
                      </span>
                    </div>
                  )}
                </div>

              </div>

              {/* Additional Photos Gallery */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <ImageIcon size={14} />
                    รูปภาพประกอบเพิ่มเติม ({currentMPModal.photos?.length || 0} รูป)
                  </span>
                  <button
                    type="button"
                    onClick={() => mpPhotoInputRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer"
                  >
                    <Plus size={12} />
                    + แนบรูปภาพเพิ่ม
                  </button>
                </div>

                {currentMPModal.photos && currentMPModal.photos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {currentMPModal.photos.map((photo, pIdx) => (
                      <button
                        key={photo.id || pIdx}
                        type="button"
                        onClick={() => onOpenPhoto({
                          url: photo.url,
                          title: currentMPModal.title,
                          subtitle: photo.caption || `ภาพประกอบ ${pIdx + 1}`,
                          badge: 'MP EVIDENCE'
                        })}
                        className="group/thumb relative rounded-lg overflow-hidden border border-slate-800 hover:border-cyan-500/60 bg-slate-900 text-left transition-all cursor-pointer"
                      >
                        <img
                          src={photo.url}
                          alt={photo.caption || 'Evidence'}
                          className="w-full h-24 object-cover group-hover/thumb:scale-105 transition-transform"
                        />
                        <div className="p-1.5 bg-slate-950 text-[10px] text-slate-300 truncate">
                          {photo.caption || `รูปที่ ${pIdx + 1}`}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-1">ยังไม่มีรูปภาพประกอบเพิ่มเติม (คลิก &quot;+ แนบรูปภาพเพิ่ม&quot;)</p>
                )}
              </div>

              {/* Excel & PDF Documents Attachment */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <FileSpreadsheet size={14} className="text-emerald-400" />
                    <FileText size={14} className="text-rose-400" />
                    เอกสารแบบสเปกและไฟล์แนบ ({currentMPModal.pdfFiles?.length || 0} ไฟล์):
                  </h5>
                  <button
                    type="button"
                    onClick={() => mpFileInputRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer"
                  >
                    <Plus size={12} />
                    + แนบไฟล์เอกสาร
                  </button>
                </div>

                {currentMPModal.pdfFiles && currentMPModal.pdfFiles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {currentMPModal.pdfFiles.map(file => {
                      const isExcel = isExcelAttachment(file);
                      return (
                        <button
                          key={file.id}
                          onClick={() => onOpenPDF(file)}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                            isExcel
                              ? 'bg-emerald-950/20 border-emerald-500/30 hover:bg-emerald-950/40 text-emerald-300'
                              : 'bg-rose-950/20 border-rose-500/30 hover:bg-rose-950/40 text-rose-300'
                          }`}
                        >
                          {isExcel ? <FileSpreadsheet size={16} /> : <FileText size={16} />}
                          <div className="text-xs">
                            <span className="font-bold block truncate max-w-[200px]">{file.name}</span>
                            <span className="text-[10px] text-slate-400">{file.size || 'ไฟล์แนบ'}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-1">ยังไม่มีเอกสารแบบสเปกแนบ (คลิก &quot;+ แนบไฟล์เอกสาร&quot; เพื่อแนบแบบ CAD, Excel หรือ PDF)</p>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex justify-between items-center text-xs text-slate-400">
              <span>ใบข้อมูลเพื่อการป้องกันการบำรุงรักษาและการกำหนดสเปกเครื่องจักร (TPM MP Sheet)</span>
              <button
                type="button"
                onClick={() => setActiveMPModal(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
