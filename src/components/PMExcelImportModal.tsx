import React, { useState, useRef } from 'react';
import { Machine, PMPlan, PMFrequency } from '../types';
import { 
  FileSpreadsheet, Upload, Download, Sparkles, X, CheckCircle2, 
  AlertTriangle, Search, Check, Layers, ArrowRight, ShieldCheck
} from 'lucide-react';
import { 
  parsePMExcelBuffer, 
  downloadPMTemplateExcel, 
  FQMS_SAMPLE_STEPS, 
  ParsedPMFileResult 
} from '../utils/pmExcelParser';

interface PMExcelImportModalProps {
  machines: Machine[];
  selectedMachineId: string;
  onClose: () => void;
  onImport: (plans: PMPlan[]) => void;
}

export const PMExcelImportModal: React.FC<PMExcelImportModalProps> = ({
  machines,
  selectedMachineId,
  onClose,
  onImport
}) => {
  // Target Machine Mode: 'current' | 'specific' | 'multi' | 'excel'
  const [targetMode, setTargetMode] = useState<'current' | 'specific' | 'multi' | 'excel'>('current');
  const [specificMachineId, setSpecificMachineId] = useState<string>(selectedMachineId || machines[0]?.id || '');
  const [selectedMultiMachineIds, setSelectedMultiMachineIds] = useState<string[]>(
    selectedMachineId ? [selectedMachineId] : [machines[0]?.id || '']
  );
  const [machineSearchQuery, setMachineSearchQuery] = useState('');

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedPMFileResult | null>(null);
  const [parseError, setParseError] = useState<string>('');

  // Fallback text paste tab
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');
  const [rawText, setRawText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter machines for selection
  const filteredMachines = machines.filter(m => 
    m.id.toLowerCase().includes(machineSearchQuery.toLowerCase()) ||
    m.name.toLowerCase().includes(machineSearchQuery.toLowerCase()) ||
    (m.lineGroup && m.lineGroup.toLowerCase().includes(machineSearchQuery.toLowerCase()))
  );

  const handleFileProcess = async (file: File) => {
    try {
      setParseError('');
      setUploadedFileName(file.name);
      const buffer = await file.arrayBuffer();
      const result = parsePMExcelBuffer(buffer);
      setParsedData(result);
    } catch (err: any) {
      console.error(err);
      setParseError(err.message || 'เกิดข้อผิดพลาดในการอ่านไฟล์ Excel กรุณาตรวจสอบรูปแบบไฟล์');
      setParsedData(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.match(/\.(xlsx|xls|csv)$/i)) {
        handleFileProcess(file);
      } else {
        setParseError('รองรับเฉพาะไฟล์ .xlsx, .xls หรือ .csv เท่านั้น');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  // Quick load sample F-QMS-011/12
  const handleLoadSampleFQMS = () => {
    setParseError('');
    setUploadedFileName('ตัวอย่างเอกสาร F-QMS-011-12 (AUTOMATIC TOPSEAL).xlsx');
    setParsedData({
      docCode: 'F-QMS-011/12',
      revision: '00',
      effectiveDate: '16-07-2019',
      machineId: 'ATS01',
      machineName: 'เครื่อง AUTOMATIC TOPSEAL Line 2',
      planTitle: 'ใบรายงาน Preventive Maintenance (PM) - AUTOMATIC TOPSEAL',
      frequency: 'รายเดือน',
      steps: FQMS_SAMPLE_STEPS,
      spareParts: 'จาระบีลูกปืนเกรดอาหาร, ซีลยาง, ซีล Plate, ใบมีดตัดฟิล์ม, ลวดฮีตเตอร์สำรอง',
      ttm: FQMS_SAMPLE_STEPS.reduce((sum, s) => sum + s.stdTime, 0),
      warnings: []
    });
  };

  // Process manual text paste if using text tab
  const handleProcessRawText = () => {
    if (!rawText.trim()) return;
    try {
      setParseError('');
      setUploadedFileName('ข้อความวางคัดลอก (Clipboard text)');
      const result = parsePMExcelBuffer(rawText);
      setParsedData(result);
    } catch (err: any) {
      setParseError(err.message || 'ไม่สามารถแปลงข้อมูลข้อความได้');
    }
  };

  // Multi-machine toggling
  const handleToggleMultiMachine = (id: string) => {
    setSelectedMultiMachineIds(prev => 
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredMachines.map(m => m.id);
    const isAllSelected = allFilteredIds.every(id => selectedMultiMachineIds.includes(id));
    if (isAllSelected) {
      setSelectedMultiMachineIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedMultiMachineIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  // Determine which machine IDs will receive the plan
  const getResolvedTargetMachineIds = (): string[] => {
    if (targetMode === 'current') {
      return [selectedMachineId || machines[0]?.id || 'ATS01'];
    }
    if (targetMode === 'specific') {
      return [specificMachineId];
    }
    if (targetMode === 'multi') {
      return selectedMultiMachineIds.length > 0 ? selectedMultiMachineIds : [selectedMachineId];
    }
    if (targetMode === 'excel') {
      // Find matching machine in database, or fallback to current
      if (parsedData?.machineId) {
        const cleanId = parsedData.machineId.replace(/\s+/g, '').toUpperCase();
        const matched = machines.find(m => m.id.toUpperCase() === cleanId || cleanId.includes(m.id.toUpperCase()));
        return [matched?.id || parsedData.machineId];
      }
      return [selectedMachineId || machines[0]?.id || 'ATS01'];
    }
    return [selectedMachineId];
  };

  // Execute Import
  const handleExecuteImport = () => {
    if (!parsedData || parsedData.steps.length === 0) {
      setParseError('ไม่พบขั้นตอนหรือหัวข้อ PM ที่ถูกต้อง กรุณาตรวจสอบไฟล์');
      return;
    }

    const targetMachineIds = getResolvedTargetMachineIds();
    if (targetMachineIds.length === 0) {
      setParseError('กรุณาเลือกเครื่องจักรเป้าหมายอย่างน้อย 1 เครื่อง');
      return;
    }

    const createdPlans: PMPlan[] = [];

    targetMachineIds.forEach((targetId) => {
      const machineObj = machines.find(m => m.id === targetId);
      const targetMachineName = machineObj?.name || parsedData.machineName || 'เครื่องจักร';

      createdPlans.push({
        id: `plan-pm-${Date.now()}-${targetId}-${Math.random().toString(36).substring(2, 6)}`,
        machineId: targetId,
        machineName: targetMachineName,
        title: parsedData.planTitle || `ใบรายงาน Preventive Maintenance (PM) - ${targetMachineName}`,
        docCode: parsedData.docCode || 'F-QMS-011/12',
        revision: parsedData.revision || '00',
        effectiveDate: parsedData.effectiveDate || '16-07-2019',
        frequency: parsedData.frequency || 'รายเดือน',
        steps: parsedData.steps.map(s => ({ ...s })),
        spareParts: parsedData.spareParts || 'จาระบีลูกปืนเกรดอาหาร, โอริง, ลวดฮีตเตอร์สำรอง',
        ttm: parsedData.ttm || parsedData.steps.reduce((sum, s) => sum + s.stdTime, 0),
        signTech: 'ทีมช่างซ่อมบำรุง',
        signProd: 'ฝ่ายผลิต',
        signLeader: 'หัวหน้าหน่วย PM',
        intervalDays: parsedData.frequency === 'รายวัน' ? 1 :
                      parsedData.frequency === 'รายสัปดาห์' ? 7 :
                      parsedData.frequency === 'รายเดือน' ? 30 :
                      parsedData.frequency === 'ราย 6 เดือน' ? 180 : 365
      });
    });

    onImport(createdPlans);
    onClose();
  };

  const resolvedTargetMachineIds = getResolvedTargetMachineIds();

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-5xl w-full max-h-[95vh] flex flex-col shadow-2xl text-slate-200 overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                นำเข้าแผนงาน PM จากไฟล์ Excel
                <span className="text-[11px] bg-cyan-500/10 text-cyan-400 px-2.5 py-0.5 rounded-full font-mono font-bold border border-cyan-500/20">
                  มาตรฐาน F-QMS-011/12
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                รองรับการโยนไฟล์ Excel (.xlsx, .xls, .csv) เพื่อสร้างหัวข้อการ PM และระบุเครื่องจักรเป้าหมาย
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* SECTION 1: TARGET MACHINE SELECTOR (เลือกเครื่องที่จะให้แผนนี้เข้าเครื่องไหนได้) */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="text-cyan-400" size={18} />
                <span className="text-xs font-bold uppercase text-white tracking-wider">
                  1. เลือกเครื่องจักรเป้าหมาย (เลือกเครื่องที่จะให้แผนนี้เข้าเครื่องไหนได้)
                </span>
              </div>
              <div className="text-xs text-slate-400">
                เครื่องที่จะได้รับแผนนี้: <strong className="text-cyan-300 font-mono">{resolvedTargetMachineIds.length} เครื่อง</strong>
              </div>
            </div>

            {/* Target Mode Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTargetMode('current')}
                className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                  targetMode === 'current'
                    ? 'bg-cyan-500/15 border-cyan-500 text-white shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">เครื่องปัจจุบัน</span>
                  {targetMode === 'current' && <Check size={14} className="text-cyan-400" />}
                </div>
                <span className="text-[11px] font-mono text-cyan-400 mt-1 truncate">
                  {selectedMachineId}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTargetMode('specific')}
                className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                  targetMode === 'specific'
                    ? 'bg-cyan-500/15 border-cyan-500 text-white shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">เลือกเครื่องเป้าหมาย</span>
                  {targetMode === 'specific' && <Check size={14} className="text-cyan-400" />}
                </div>
                <span className="text-[11px] text-slate-400 mt-1">เลือก 1 เครื่องเฉพาะ</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetMode('multi')}
                className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                  targetMode === 'multi'
                    ? 'bg-cyan-500/15 border-cyan-500 text-white shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">เลือกหลายเครื่องพร้อมกัน</span>
                  {targetMode === 'multi' && <Check size={14} className="text-cyan-400" />}
                </div>
                <span className="text-[11px] text-emerald-400 mt-1">({selectedMultiMachineIds.length} เครื่องที่เลือก)</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetMode('excel')}
                className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                  targetMode === 'excel'
                    ? 'bg-cyan-500/15 border-cyan-500 text-white shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">อิงตามไฟล์ Excel</span>
                  {targetMode === 'excel' && <Check size={14} className="text-cyan-400" />}
                </div>
                <span className="text-[11px] text-amber-400 mt-1">
                  {parsedData?.machineId || 'ตามที่ระบุในหัวเอกสาร'}
                </span>
              </button>
            </div>

            {/* Target Mode Details Area */}
            {targetMode === 'specific' && (
              <div className="pt-2 flex flex-col sm:flex-row gap-2 items-center">
                <label className="text-xs text-slate-300 shrink-0 font-medium">ระบุเครื่องจักรปลายทาง:</label>
                <select
                  value={specificMachineId}
                  onChange={(e) => setSpecificMachineId(e.target.value)}
                  className="w-full sm:max-w-md bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-sans"
                >
                  {machines.map(m => (
                    <option key={m.id} value={m.id}>
                      [{m.id}] {m.name} ({m.lineGroup})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {targetMode === 'multi' && (
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="relative flex-1 max-w-xs">
                    <Search size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="ค้นหาชื่อ หรือรหัสเครื่อง เช่น ATS, RIM..."
                      value={machineSearchQuery}
                      onChange={(e) => setMachineSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
                  >
                    เลือก/ยกเลิก ทั้งหมดที่ค้นพบ ({filteredMachines.length})
                  </button>
                </div>

                <div className="max-h-36 overflow-y-auto border border-slate-800 rounded-lg p-2 bg-slate-900/50 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {filteredMachines.map(m => {
                    const isChecked = selectedMultiMachineIds.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition text-xs ${
                          isChecked ? 'bg-cyan-500/20 text-white font-semibold' : 'text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleMultiMachine(m.id)}
                          className="rounded text-cyan-500 focus:ring-cyan-500/30"
                        />
                        <span className="font-mono text-[11px] text-cyan-400 font-bold">{m.id}</span>
                        <span className="truncate text-[11px]">{m.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: FILE UPLOAD (DRAG & DROP ZONE) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="text-emerald-400" size={18} />
                <span className="text-xs font-bold uppercase text-white tracking-wider">
                  2. โยนไฟล์ Excel เข้ามาในกล่องด้านล่าง (Drag & Drop)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadPMTemplateExcel(selectedMachineId, machines.find(m => m.id === selectedMachineId)?.name)}
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer"
                  title="ดาวน์โหลดไฟล์ Template Excel รูปแบบ F-QMS-011/12 ไปแก้ไขแล้วโยนกลับมาได้เลย"
                >
                  <Download size={13} />
                  <span>ดาวน์โหลด Template Excel</span>
                </button>

                <button
                  type="button"
                  onClick={handleLoadSampleFQMS}
                  className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer"
                  title="โหลดข้อมูล 21 หัวข้อ PM จากเอกสารตัวอย่าง Automatic Topseal F-QMS-011/12"
                >
                  <Sparkles size={13} />
                  <span>💡 โหลดตัวอย่าง F-QMS-011/12</span>
                </button>
              </div>
            </div>

            {/* Drag & Drop Box */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                isDragging 
                  ? 'border-emerald-500 bg-emerald-500/10 scale-[0.99]' 
                  : uploadedFileName
                    ? 'border-emerald-500/60 bg-slate-950/60 hover:border-emerald-500'
                    : 'border-slate-700 bg-slate-950/50 hover:border-slate-600 hover:bg-slate-950/80'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <FileSpreadsheet size={28} />
              </div>

              {uploadedFileName ? (
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                    <CheckCircle2 size={14} />
                    <span>โหลดไฟล์สำเร็จ: {uploadedFileName}</span>
                  </div>
                  <p className="text-xs text-slate-400">คลิกหรือลากไฟล์ใหม่มาวางเพื่อเปลี่ยนไฟล์</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-200">
                    ลากไฟล์ Excel (.xlsx, .xls) หรือ .csv มาวางที่นี่
                  </p>
                  <p className="text-xs text-slate-400">
                    หรือคลิกเพื่อเปิดหน้าต่างเลือกไฟล์จากคอมพิวเตอร์ของคุณ
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] text-slate-500">
                <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">รองรับแบบฟอร์ม F-QMS-011/12</span>
                <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">รองรับตารางคอลัมน์ทั่วไป</span>
                <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">คำนวณเวลา TTM อัตโนมัติ</span>
              </div>
            </div>

            {parseError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-400 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}
          </div>

          {/* SECTION 3: LIVE PREVIEW OF EXTRACTED TOPICS */}
          {parsedData && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-emerald-400" size={18} />
                  <span className="text-xs font-bold uppercase text-white tracking-wider">
                    3. พรีวิวหัวข้อการ PM ที่ตรวจพบ ({parsedData.steps.length} หัวข้องาน)
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>รหัสเอกสาร: <strong className="text-cyan-400 font-mono">{parsedData.docCode}</strong></span>
                  <span>•</span>
                  <span>ความถี่: <strong className="text-cyan-400">{parsedData.frequency}</strong></span>
                  <span>•</span>
                  <span>เวลารวม TTM: <strong className="text-cyan-400 font-mono">{parsedData.ttm} นาที</strong></span>
                </div>
              </div>

              {/* Table Preview styled after F-QMS-011/12 */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-[11px] font-bold text-slate-300">
                      <tr>
                        <th className="p-2.5 text-center w-12">ลำดับ</th>
                        <th className="p-2.5 w-48">หัวข้อ PM</th>
                        <th className="p-2.5 text-center w-28">วิธีการ</th>
                        <th className="p-2.5">มาตรฐาน / เกณฑ์ยอมรับ</th>
                        <th className="p-2.5 text-center w-24">ความถี่</th>
                        <th className="p-2.5 text-right w-20">เวลา (นาที)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {parsedData.steps.map((step, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/60 transition">
                          <td className="p-2.5 text-center font-bold text-slate-400">
                            {step.itemNo || idx + 1}
                          </td>
                          <td className="p-2.5 font-semibold text-white">
                            {step.title}
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="text-[11px] bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded font-medium">
                              {step.method || 'ดูด้วยสายตา'}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-300 text-[11.5px] leading-relaxed">
                            {step.standard || 'โครงสร้างสมบูรณ์'}
                          </td>
                          <td className="p-2.5 text-center text-slate-400 text-[11px]">
                            {step.frequency || parsedData.frequency || '1 เดือน/ครั้ง'}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-cyan-400">
                            {step.stdTime}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 border-t border-slate-800 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 text-center sm:text-left">
            {parsedData ? (
              <span>
                พร้อมสร้างแผน PM จำนวน <strong className="text-emerald-400">{resolvedTargetMachineIds.length} แผน</strong> สำหรับเครื่อง: {' '}
                <strong className="text-white font-mono">{resolvedTargetMachineIds.join(', ')}</strong>
              </span>
            ) : (
              <span>กรุณาโยนไฟล์ Excel หรือกดโหลดตัวอย่าง F-QMS-011/12 ด้านบนเพื่อเริ่มต้น</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={!parsedData || parsedData.steps.length === 0}
              className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <CheckCircle2 size={16} />
              <span>ยืนยันนำเข้าแผนงาน PM ({resolvedTargetMachineIds.length} เครื่อง)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
