import React, { useState, useRef } from 'react';
import { ImprovementProject, Machine, KaizenCategory, OPLData, FAData, WhyWhyData, PDFFileAttachment, MediaPhotoItem } from '../../types';
import { 
  X, Plus, Trash2, Upload, FileText, Image as ImageIcon, CheckCircle2, 
  HelpCircle, Search, BookOpen, Wrench, Calendar, User, DollarSign, 
  ShieldAlert, Sparkles, Layers, Clock, AlertTriangle 
} from 'lucide-react';
import { compressImageFile } from '../../utils/imageUtils';

interface CreateEditKaizenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (proj: Partial<ImprovementProject>) => void;
  machines: Machine[];
  technicians: string[];
  initialProject?: ImprovementProject | null;
  defaultCategory?: KaizenCategory;
}

export const CreateEditKaizenModal: React.FC<CreateEditKaizenModalProps> = ({
  isOpen,
  onClose,
  onSave,
  machines,
  technicians,
  initialProject,
  defaultCategory = 'KAIZEN'
}) => {
  const [category, setCategory] = useState<KaizenCategory>(
    initialProject?.category || defaultCategory
  );
  
  // Common Fields
  const [title, setTitle] = useState(initialProject?.title || '');
  const [description, setDescription] = useState(initialProject?.description || '');
  const [machineId, setMachineId] = useState(initialProject?.machineId || (machines[0]?.id || ''));
  const [startDate, setStartDate] = useState(initialProject?.startDate || new Date().toISOString().split('T')[0]);
  const [plannedEndDate, setPlannedEndDate] = useState(initialProject?.plannedEndDate || new Date().toISOString().split('T')[0]);
  const [technician, setTechnician] = useState(initialProject?.technician || technicians[0] || 'ช่าง 1');
  const [status, setStatus] = useState<'วางแผน' | 'กำลังดำเนินการ' | 'เสร็จแล้ว'>(initialProject?.status || 'กำลังดำเนินการ');

  // Media
  const [photoBefore, setPhotoBefore] = useState<string>(initialProject?.photoBefore || '');
  const [photoAfter, setPhotoAfter] = useState<string>(initialProject?.photoAfter || '');
  const [pdfFiles, setPdfFiles] = useState<PDFFileAttachment[]>(initialProject?.pdfFiles || []);
  const [photos, setPhotos] = useState<MediaPhotoItem[]>(initialProject?.photos || []);

  // OPL Fields
  const [oplCategory, setOplCategory] = useState(initialProject?.oplData?.category || 'การแก้ไขปัญหา (Troubleshooting)');
  const [oplPurpose, setOplPurpose] = useState(initialProject?.oplData?.purpose || '');
  const [oplKeyPoints, setOplKeyPoints] = useState<string[]>(initialProject?.oplData?.keyPoints || ['']);
  const [oplReasons, setOplReasons] = useState<string[]>(initialProject?.oplData?.reasons || ['']);
  const [oplCautionPoints, setOplCautionPoints] = useState(initialProject?.oplData?.cautionPoints || '');
  const [oplSopDocRef, setOplSopDocRef] = useState(initialProject?.oplData?.sopDocumentRef || '');
  const [oplTargetAudience, setOplTargetAudience] = useState(initialProject?.oplData?.targetAudience || 'ช่างซ่อมบำรุง & Operator');
  const [oplTrainingDuration, setOplTrainingDuration] = useState<number>(initialProject?.oplData?.trainingDurationMins || 15);

  // FA Fields
  const [faPartName, setFaPartName] = useState(initialProject?.faData?.failurePartName || '');
  const [faPartCode, setFaPartCode] = useState(initialProject?.faData?.failurePartCode || '');
  const [faFailureMode, setFaFailureMode] = useState(initialProject?.faData?.failureMode || 'การล้าตัว (Fatigue)');
  const [faRootCategory, setFaRootCategory] = useState(initialProject?.faData?.rootCauseCategory || 'การออกแบบ (Design)');
  const [faMechanism, setFaMechanism] = useState(initialProject?.faData?.mechanismDescription || '');
  const [faImmediate, setFaImmediate] = useState(initialProject?.faData?.immediateContainment || '');
  const [faPermanent, setFaPermanent] = useState(initialProject?.faData?.permanentAction || '');
  const [faCostLoss, setFaCostLoss] = useState<number>(initialProject?.faData?.estimatedCostLoss || 0);
  const [faLabFindings, setFaLabFindings] = useState(initialProject?.faData?.laboratoryFindings || '');

  // Why-Why Fields
  const [whyProblem, setWhyProblem] = useState(initialProject?.whyWhyData?.problemStatement || '');
  const [whyPhenomenon, setWhyPhenomenon] = useState(initialProject?.whyWhyData?.phenomenon || '');
  const [why1, setWhy1] = useState(initialProject?.whyWhyData?.why1 || '');
  const [why2, setWhy2] = useState(initialProject?.whyWhyData?.why2 || '');
  const [why3, setWhy3] = useState(initialProject?.whyWhyData?.why3 || '');
  const [why4, setWhy4] = useState(initialProject?.whyWhyData?.why4 || '');
  const [why5, setWhy5] = useState(initialProject?.whyWhyData?.why5 || '');
  const [whyRootCause, setWhyRootCause] = useState(initialProject?.whyWhyData?.rootCauseSummary || '');
  const [whyCountermeasure, setWhyCountermeasure] = useState(initialProject?.whyWhyData?.countermeasure || '');
  const [whyStdRef, setWhyStdRef] = useState(initialProject?.whyWhyData?.standardizationRef || '');
  const [whyVerification, setWhyVerification] = useState(initialProject?.whyWhyData?.effectivenessVerification || '');

  // File Upload refs
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const beforePhotoRef = useRef<HTMLInputElement>(null);
  const afterPhotoRef = useRef<HTMLInputElement>(null);
  const generalPhotoRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle PDF upload
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const sizeFormatted = file.size > 1024 * 1024 
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`;

        const newPdf: PDFFileAttachment = {
          id: `pdf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          size: sizeFormatted,
          uploadedAt: new Date().toISOString().split('T')[0],
          content: content
        };

        setPdfFiles(prev => [...prev, newPdf]);
      };
      reader.readAsDataURL(file);
    });

    if (e.target) e.target.value = '';
  };

  // Handle image upload helper
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'before' | 'after' | 'general') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    try {
      const compressed = await compressImageFile(file);
      if (target === 'before') {
        setPhotoBefore(compressed);
      } else if (target === 'after') {
        setPhotoAfter(compressed);
      } else {
        const newPhoto: MediaPhotoItem = {
          id: `photo-${Date.now()}`,
          url: compressed,
          caption: file.name,
          uploadedAt: new Date().toISOString().split('T')[0],
          type: 'evidence'
        };
        setPhotos(prev => [...prev, newPhoto]);
      }
    } catch (err) {
      console.error('Failed to compress photo', err);
    }

    if (e.target) e.target.value = '';
  };

  // Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('กรุณาระบุหัวข้องาน');
      return;
    }

    let oplData: OPLData | undefined = undefined;
    if (category === 'OPL') {
      oplData = {
        category: oplCategory,
        purpose: oplPurpose,
        keyPoints: oplKeyPoints.filter(k => k.trim().length > 0),
        reasons: oplReasons.filter(r => r.trim().length > 0),
        cautionPoints: oplCautionPoints,
        sopDocumentRef: oplSopDocRef,
        targetAudience: oplTargetAudience,
        trainingDurationMins: oplTrainingDuration
      };
    }

    let faData: FAData | undefined = undefined;
    if (category === 'FA') {
      faData = {
        failurePartName: faPartName,
        failurePartCode: faPartCode,
        failureMode: faFailureMode,
        rootCauseCategory: faRootCategory,
        mechanismDescription: faMechanism,
        immediateContainment: faImmediate,
        permanentAction: faPermanent,
        estimatedCostLoss: Number(faCostLoss) || 0,
        laboratoryFindings: faLabFindings
      };
    }

    let whyWhyData: WhyWhyData | undefined = undefined;
    if (category === 'WHY_WHY') {
      whyWhyData = {
        problemStatement: whyProblem,
        phenomenon: whyPhenomenon,
        why1: why1,
        why2: why2,
        why3: why3,
        why4: why4,
        why5: why5,
        rootCauseSummary: whyRootCause,
        countermeasure: whyCountermeasure,
        standardizationRef: whyStdRef,
        effectivenessVerification: whyVerification
      };
    }

    const payload: Partial<ImprovementProject> = {
      type: 'Improvement',
      category: category,
      title: title.trim(),
      description: description.trim() || title.trim(),
      machineId: machineId,
      startDate: startDate,
      plannedEndDate: plannedEndDate,
      technician: technician,
      technicians: [technician],
      status: status,
      photoBefore: photoBefore || undefined,
      photoAfter: photoAfter || undefined,
      pdfFiles: pdfFiles,
      photos: photos,
      oplData,
      faData,
      whyWhyData
    };

    onSave(payload);
    onClose();
  };

  const categoryOptions: {
    id: KaizenCategory;
    title: string;
    sub: string;
    icon: React.ReactNode;
    color: string;
    activeBorder: string;
  }[] = [
    {
      id: 'KAIZEN',
      title: 'โครงการ Kaizen',
      sub: 'ปรับปรุงประสิทธิภาพ & ย่นเวลา',
      icon: <Wrench size={18} />,
      color: 'from-cyan-500/20 to-blue-500/10 text-cyan-400',
      activeBorder: 'border-cyan-500 bg-cyan-950/40 text-cyan-300'
    },
    {
      id: 'OPL',
      title: 'One Point Lesson (OPL)',
      sub: 'บทเรียนจุดเดียว & มาตรฐาน',
      icon: <BookOpen size={18} />,
      color: 'from-blue-500/20 to-indigo-500/10 text-blue-400',
      activeBorder: 'border-blue-500 bg-blue-950/40 text-blue-300'
    },
    {
      id: 'FA',
      title: 'Failure Analysis (FA)',
      sub: 'วิเคราะห์ชิ้นส่วนชำรุด/แตกหัก',
      icon: <Search size={18} />,
      color: 'from-rose-500/20 to-red-500/10 text-rose-400',
      activeBorder: 'border-rose-500 bg-rose-950/40 text-rose-300'
    },
    {
      id: 'WHY_WHY',
      title: 'Why-Why Analysis',
      sub: 'สืบค้นรากเหง้า 5 Whys',
      icon: <HelpCircle size={18} />,
      color: 'from-amber-500/20 to-orange-500/10 text-amber-400',
      activeBorder: 'border-amber-500 bg-amber-950/40 text-amber-300'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {initialProject ? 'แก้ไขข้อมูลงานพัฒนาและวิศวกรรม' : 'สร้างงานพัฒนาและบันทึกวิศวกรรมใหม่'}
              </h3>
              <p className="text-xs text-slate-400">
                รองรับ Kaizen, One Point Lesson (OPL), Failure Analysis (FA), Why-Why พร้อมแนบ PDF และรูปภาพ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Category Selector Tabs */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
              เลือกประเภทงาน (Work Category):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {categoryOptions.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCategory(opt.id)}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    category === opt.id
                      ? opt.activeBorder + ' shadow-lg ring-1 ring-cyan-500/30'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="p-1.5 rounded-lg bg-slate-800">{opt.icon}</span>
                    <span className="text-xs font-bold">{opt.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 leading-tight">{opt.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Common General Information */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              ข้อมูลพื้นฐาน (General Information)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  หัวข้อ / ชื่องาน <span className="text-rose-400">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น OPL-042: เทคนิคการปรับตั้งความตึงฟิล์ม หรือ ออกแบบการ์ดป้องกันเศษแป้ง..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  เครื่องจักรที่เกี่ยวข้อง:
                </label>
                <select
                  value={machineId}
                  onChange={(e) => setMachineId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- ไม่ระบุ / เครื่องจักรทั่วไป --</option>
                  {machines.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.id} - {m.name} ({m.location})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  ช่างผู้รับผิดชอบ / ผู้จัดทำ:
                </label>
                <select
                  value={technician}
                  onChange={(e) => setTechnician(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  {technicians.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  วันที่เริ่มดำเนินการ:
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  วันที่เป้าหมายแล้วเสร็จ:
                </label>
                <input
                  type="date"
                  value={plannedEndDate}
                  onChange={(e) => setPlannedEndDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  สถานะการดำเนินงาน:
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="วางแผน">วางแผน (Planned)</option>
                  <option value="กำลังดำเนินการ">กำลังดำเนินการ (In Progress)</option>
                  <option value="เสร็จแล้ว">เสร็จแล้ว (Completed)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  รายละเอียดสรุป / บทนำ:
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="อธิบายสรุปภาพรวมการปรับปรุง หรือสรุปเคสปัญหา..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* DYNAMIC CATEGORY SPECIFIC SECTIONS */}

          {/* 1. OPL SPECIFIC FIELDS */}
          {category === 'OPL' && (
            <div className="bg-blue-950/20 p-5 rounded-2xl border border-blue-800/40 space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-blue-400" />
                <h4 className="text-sm font-bold text-white">รายละเอียดบทเรียนจุดเดียว (One Point Lesson Details)</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    หมวดหมู่ OPL:
                  </label>
                  <select
                    value={oplCategory}
                    onChange={(e) => setOplCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="ความรู้พื้นฐาน (Basic Knowledge)">ความรู้พื้นฐาน (Basic Knowledge)</option>
                    <option value="การแก้ไขปัญหา (Troubleshooting)">การแก้ไขปัญหา (Troubleshooting)</option>
                    <option value="ตัวอย่างการปรับปรุง (Improvement Case)">ตัวอย่างการปรับปรุง (Improvement Case)</option>
                    <option value="ความปลอดภัยและสุขอนามัย (Safety)">ความปลอดภัยและสุขอนามัย (Safety)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    รหัสเอกสารอ้างอิง (WI / SOP Reference):
                  </label>
                  <input
                    type="text"
                    value={oplSopDocRef}
                    onChange={(e) => setOplSopDocRef(e.target.value)}
                    placeholder="เช่น WI-MNT-FFS-018"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    🎯 วัตถุประสงค์ของบทเรียน (Purpose):
                  </label>
                  <input
                    type="text"
                    value={oplPurpose}
                    onChange={(e) => setOplPurpose(e.target.value)}
                    placeholder="เช่น เพื่อให้ช่างเข้าใจการตั้งระยะ Gap ลูกกลิ้ง และลดปัญหาซองย่นรั่วซึมเป็น 0"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Key points builder */}
                <div className="md:col-span-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-400">
                      จุดสำคัญในการปฏิบัติ (Key Points Step-by-Step):
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setOplKeyPoints(prev => [...prev, '']);
                        setOplReasons(prev => [...prev, '']);
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                    >
                      <Plus size={14} />
                      เพิ่มขั้นตอน
                    </button>
                  </div>

                  {oplKeyPoints.map((kp, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <span className="text-xs font-mono text-blue-400 font-bold w-6">{idx + 1}.</span>
                      <input
                        type="text"
                        value={kp}
                        onChange={(e) => {
                          const updated = [...oplKeyPoints];
                          updated[idx] = e.target.value;
                          setOplKeyPoints(updated);
                        }}
                        placeholder={`จุดสำคัญขั้นตอนที่ ${idx + 1}...`}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                      {oplKeyPoints.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setOplKeyPoints(prev => prev.filter((_, i) => i !== idx));
                            setOplReasons(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-rose-400 block mb-1">
                    ⚠️ ข้อควรระวัง / สิ่งที่ห้ามทำเด็ดขาด (Caution & Don&apos;ts):
                  </label>
                  <textarea
                    rows={2}
                    value={oplCautionPoints}
                    onChange={(e) => setOplCautionPoints(e.target.value)}
                    placeholder="เช่น ห้ามใช้ของมีคมขูดหน้าสัมผัสเทฟลอนหัวซีลโดยเด็ดขาด..."
                    className="w-full bg-slate-900 border border-rose-900/50 rounded-xl p-3 text-xs text-rose-200 focus:outline-none focus:border-rose-500 resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    กลุ่มเป้าหมายผู้รับการสอน:
                  </label>
                  <input
                    type="text"
                    value={oplTargetAudience}
                    onChange={(e) => setOplTargetAudience(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    เวลาฝึกอบรมโดยประมาณ (นาที):
                  </label>
                  <input
                    type="number"
                    value={oplTrainingDuration}
                    onChange={(e) => setOplTrainingDuration(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. FA SPECIFIC FIELDS */}
          {category === 'FA' && (
            <div className="bg-rose-950/20 p-5 rounded-2xl border border-rose-800/40 space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2">
                <Search size={18} className="text-rose-400" />
                <h4 className="text-sm font-bold text-white">รายละเอียดการวิเคราะห์ความเสียหาย (Failure Analysis Details)</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    ชื่อชิ้นส่วนที่ชำรุด (Failure Part Name):
                  </label>
                  <input
                    type="text"
                    value={faPartName}
                    onChange={(e) => setFaPartName(e.target.value)}
                    placeholder="เช่น เพลาขับลูกรีด Ø35mm หรือ ลูกปืน Bearing #6204"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    รหัสชิ้นส่วน / Part Code:
                  </label>
                  <input
                    type="text"
                    value={faPartCode}
                    onChange={(e) => setFaPartCode(e.target.value)}
                    placeholder="เช่น SFT-RIM-35"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    รูปแบบความเสียหาย (Failure Mode):
                  </label>
                  <select
                    value={faFailureMode}
                    onChange={(e) => setFaFailureMode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="การล้าตัว (Fatigue)">การล้าตัว (Fatigue)</option>
                    <option value="การสึกหรอ (Wear / Abrasion)">การสึกหรอ (Wear / Abrasion)</option>
                    <option value="การแตกหักฉับพลัน (Brittle / Ductile Fracture)">การแตกหักฉับพลัน (Brittle / Ductile Fracture)</option>
                    <option value="การกัดกร่อน / สนิม (Corrosion / Oxidation)">การกัดกร่อน / สนิม (Corrosion / Oxidation)</option>
                    <option value="ความร้อนสะสม / ไหม้ช็อต (Thermal Degradation / Electrical)">ความร้อนสะสม / ไหม้ช็อต (Thermal / Electrical)</option>
                    <option value="การติดขัด / คลอนหลวม (Mechanical Jam / Loosening)">การติดขัด / คลอนหลวม (Mechanical Jam)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    หมวดหมู่ต้นเหตุหลัก (Root Cause Category):
                  </label>
                  <select
                    value={faRootCategory}
                    onChange={(e) => setFaRootCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="การออกแบบ (Design)">การออกแบบ (Design)</option>
                    <option value="วัสดุและการผลิต (Material / Manufacturing)">วัสดุและการผลิต (Material / Manufacturing)</option>
                    <option value="การใช้งานผิดเงื่อนไข (Operation / Overload)">การใช้งานผิดเงื่อนไข (Operation / Overload)</option>
                    <option value="การบำรุงรักษา / หล่อลื่น (Maintenance / Lubrication)">การบำรุงรักษา / หล่อลื่น (Maintenance / Lubrication)</option>
                    <option value="สิ่งแวดล้อมหน้างาน (Environment / Chemical)">สิ่งแวดล้อมหน้างาน (Environment / Chemical)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    🔬 กลไกการเกิดความเสียหาย (Mechanism Description):
                  </label>
                  <textarea
                    rows={3}
                    value={faMechanism}
                    onChange={(e) => setFaMechanism(e.target.value)}
                    placeholder="อธิบายลำดับเหตุการณ์การเกิดรอยร้าว การกระจายแรงเค้น และการแตกหัก..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500 resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-amber-400 block mb-1">
                    มาตรการเฉพาะหน้า (Immediate Containment):
                  </label>
                  <input
                    type="text"
                    value={faImmediate}
                    onChange={(e) => setFaImmediate(e.target.value)}
                    placeholder="เช่น เปลี่ยนใส่เพลาสำรองเดิมและลดกระแส Overload Relay"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-emerald-400 block mb-1">
                    มาตรการถาวร (Permanent Preventive Action):
                  </label>
                  <input
                    type="text"
                    value={faPermanent}
                    onChange={(e) => setFaPermanent(e.target.value)}
                    placeholder="เช่น ปรับแบบสั่งทำเพลา SUS420J2 ชุบแข็ง HRC 48 พร้อม Fillet R=3.0 mm"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    มูลค่าความเสียหาย / Downtime Loss (บาท):
                  </label>
                  <input
                    type="number"
                    value={faCostLoss}
                    onChange={(e) => setFaCostLoss(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    ผลตรวจแล็บ / รอยแตกหัก (Fracture Findings):
                  </label>
                  <input
                    type="text"
                    value={faLabFindings}
                    onChange={(e) => setFaLabFindings(e.target.value)}
                    placeholder="เช่น พบ Beach Marks ชัดเจน 70% ของหน้าตัด"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. WHY-WHY SPECIFIC FIELDS */}
          {category === 'WHY_WHY' && (
            <div className="bg-amber-950/20 p-5 rounded-2xl border border-amber-800/40 space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2">
                <HelpCircle size={18} className="text-amber-400" />
                <h4 className="text-sm font-bold text-white">รายละเอียดการสืบค้น 5-Whys Analysis</h4>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-xs font-semibold text-rose-400 block mb-1">
                    🚨 สภาพปัญหา (Problem Statement):
                  </label>
                  <input
                    type="text"
                    value={whyProblem}
                    onChange={(e) => setWhyProblem(e.target.value)}
                    placeholder="เช่น มอเตอร์ปั๊มสุญญากาศ VAC02 Overload Trip ตัดการทำงานกะทันหัน"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-amber-400 block mb-1">
                    👁️ ปรากฏการณ์หน้างาน (Phenomenon):
                  </label>
                  <input
                    type="text"
                    value={whyPhenomenon}
                    onChange={(e) => setWhyPhenomenon(e.target.value)}
                    placeholder="เช่น อุณหภูมิตู้คอนโทรลสูงเกิน 78°C มีกลิ่นไหม้จางๆ"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* 5-Whys Ladder input fields */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <span className="font-bold text-amber-400 block">
                    ลำดับการตั้งคำถามและหาคำตอบ (5-Whys Ladder):
                  </span>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-0.5">Why 1 (ทำไม 1):</label>
                    <input
                      type="text"
                      value={why1}
                      onChange={(e) => setWhy1(e.target.value)}
                      placeholder="ทำไมมอเตอร์จึงตัดการทำงาน? -> เพราะ Thermal Relay ตัดวงจร..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-0.5">Why 2 (ทำไม 2):</label>
                    <input
                      type="text"
                      value={why2}
                      onChange={(e) => setWhy2(e.target.value)}
                      placeholder="ทำไมจึงมีความร้อนสะสมสูง? -> เพราะพัดลมระบายอากาศหยุดหมุน..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-0.5">Why 3 (ทำไม 3):</label>
                    <input
                      type="text"
                      value={why3}
                      onChange={(e) => setWhy3(e.target.value)}
                      placeholder="ทำไมพัดลมจึงหยุดหมุน? -> เพราะมีฝุ่นแป้งอุดตันหนาแน่น..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-0.5">Why 4 (ทำไม 4):</label>
                    <input
                      type="text"
                      value={why4}
                      onChange={(e) => setWhy4(e.target.value)}
                      placeholder="ทำไมฝุ่นสะสมนานจึงไม่มีใครทำความสะอาด? -> เพราะไม่มีรายการในตาราง PM..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-rose-400 block mb-0.5">Why 5 (ทำไม 5 - Root Cause สาเหตุรากเหง้า):</label>
                    <input
                      type="text"
                      value={why5}
                      onChange={(e) => setWhy5(e.target.value)}
                      placeholder="ทำไมจึงไม่มีใน PM? -> เพราะตอนทำมาตรฐาน PM ยึดตามคู่มือกลไกภายนอก ไม่ได้รวมชุดตู้ไฟฟ้า..."
                      className="w-full bg-slate-900 border border-rose-800/60 rounded-lg px-3 py-1.5 text-xs text-rose-200 font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-emerald-400 block mb-1">
                      ✓ มาตรการแก้ไขเชิงระบบ (Countermeasures):
                    </label>
                    <textarea
                      rows={2}
                      value={whyCountermeasure}
                      onChange={(e) => setWhyCountermeasure(e.target.value)}
                      placeholder="1. เปลี่ยนพัดลมใหม่ทันที 2. บรรจุหัวข้อลงใน PM Checklist รายเดือน..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-cyan-400 block mb-1">
                      การจัดทำมาตรฐาน / เอกสารอ้างอิง (Standardization):
                    </label>
                    <input
                      type="text"
                      value={whyStdRef}
                      onChange={(e) => setWhyStdRef(e.target.value)}
                      placeholder="เช่น PM-STD-ELEC-009 & OPL-058"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                    />
                    <label className="text-xs font-semibold text-slate-400 block mt-2 mb-1">
                      การติดตามประสิทธิผล (Verification):
                    </label>
                    <input
                      type="text"
                      value={whyVerification}
                      onChange={(e) => setWhyVerification(e.target.value)}
                      placeholder="เช่น ตรวจติดตาม 30 วัน อุณหภูมิคงที่ 38-42°C ไม่พบการตัดวงจร"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ATTACHMENT SECTION: PDF & PHOTOS */}
          <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              การแนบไฟล์เอกสาร PDF และรูปถ่ายผลงาน (Attachments)
            </h4>

            {/* Before / After Photos (For Kaizen & OPL) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Before Photo */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <ImageIcon size={14} />
                    {category === 'OPL' ? 'ภาพตัวอย่างที่ไม่ถูกต้อง (Don\'t)' : category === 'FA' ? 'ภาพชิ้นส่วนชำรุด' : 'ภาพถ่ายก่อนปรับปรุง (Before)'}
                  </span>
                  {photoBefore && (
                    <button
                      type="button"
                      onClick={() => setPhotoBefore('')}
                      className="text-[10px] text-rose-400 hover:underline"
                    >
                      ลบรูป
                    </button>
                  )}
                </div>

                {photoBefore ? (
                  <div className="relative rounded-lg overflow-hidden border border-slate-700 h-32 bg-slate-950 flex items-center justify-center">
                    <img src={photoBefore} alt="Before preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => beforePhotoRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-slate-700 hover:border-amber-400 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-amber-300 transition-all bg-slate-950/40 gap-1.5"
                  >
                    <Upload size={20} />
                    <span className="text-xs font-semibold">อัปโหลดภาพก่อนทำ / ชำรุด</span>
                    <span className="text-[10px] text-slate-500">JPG, PNG, WebP</span>
                  </button>
                )}
                <input
                  ref={beforePhotoRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e, 'before')}
                  className="hidden"
                />
              </div>

              {/* After Photo */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <ImageIcon size={14} />
                    {category === 'OPL' ? 'ภาพตัวอย่างที่ถูกต้อง (Do / Standard)' : 'ภาพถ่ายหลังปรับปรุง (After / Result)'}
                  </span>
                  {photoAfter && (
                    <button
                      type="button"
                      onClick={() => setPhotoAfter('')}
                      className="text-[10px] text-rose-400 hover:underline"
                    >
                      ลบรูป
                    </button>
                  )}
                </div>

                {photoAfter ? (
                  <div className="relative rounded-lg overflow-hidden border border-slate-700 h-32 bg-slate-950 flex items-center justify-center">
                    <img src={photoAfter} alt="After preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => afterPhotoRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-slate-700 hover:border-emerald-400 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-emerald-300 transition-all bg-slate-950/40 gap-1.5"
                  >
                    <Upload size={20} />
                    <span className="text-xs font-semibold">อัปโหลดภาพหลังทำ / มาตรฐาน</span>
                    <span className="text-[10px] text-slate-500">JPG, PNG, WebP</span>
                  </button>
                )}
                <input
                  ref={afterPhotoRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e, 'after')}
                  className="hidden"
                />
              </div>
            </div>

            {/* PDF Attachments Manager */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                  <FileText size={15} />
                  แนบไฟล์เอกสาร PDF (รายงาน / แบบฟอร์ม / Standard Sheet)
                </span>
                <button
                  type="button"
                  onClick={() => pdfInputRef.current?.click()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold transition-all"
                >
                  <Plus size={14} />
                  เพิ่มไฟล์ PDF
                </button>
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={handlePdfUpload}
                  className="hidden"
                />
              </div>

              {pdfFiles.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                  ยังไม่มีไฟล์ PDF แนบ (สามารถแนบแบบฟอร์ม OPL Sheet, รายงานแล็บ FA, หรือรายงาน Kaizen PDF ได้)
                </div>
              ) : (
                <div className="space-y-2">
                  {pdfFiles.map((pdf, idx) => (
                    <div
                      key={pdf.id || idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200"
                    >
                      <div className="flex items-center gap-2.5 truncate max-w-[80%]">
                        <div className="p-1.5 rounded bg-rose-500/20 text-rose-400">
                          <FileText size={14} />
                        </div>
                        <div className="truncate">
                          <p className="font-semibold truncate">{pdf.name}</p>
                          <p className="text-[10px] text-slate-400">
                            ขนาด: {pdf.size || '1.0 MB'} • วันที่: {pdf.uploadedAt || 'ล่าสุด'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPdfFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                        title="ลบไฟล์"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Footer Submit */}
          <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition-all flex items-center gap-2"
            >
              <CheckCircle2 size={16} />
              {initialProject ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
