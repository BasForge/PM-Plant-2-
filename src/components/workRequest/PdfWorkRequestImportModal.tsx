import React, { useState, useRef } from 'react';
import { Machine, WorkRequestPriority } from '../../types';
import { 
  X, FileUp, Sparkles, CheckCircle2, AlertTriangle, 
  Trash2, Plus, ArrowRight, Check, FileText, BellRing, 
  Search, Building, Clock, Calendar, AlertOctagon, HelpCircle, Loader2
} from 'lucide-react';
import { 
  parseWorkRequestPDF, 
  parseWorkRequestsFromRawText, 
  ParsedWorkRequestItem,
  findMatchingMachine 
} from '../../utils/pdfWorkRequestParser';
import { getTodayDateString } from '../../utils/pmAlerts';

interface PdfWorkRequestImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  machines: Machine[];
  defaultRequester?: string;
  onImportRequests: (items: ParsedWorkRequestItem[], notifyLine: boolean) => void;
}

const SAMPLE_PDF_TEXT = `ใบแจ้งขอรับบริการซ่อมบำรุงและเครื่องจักรหยุดชะงัก (Maintenance Work Request)
เลขที่เอกสาร: REQ-2026-042
วันที่แจ้ง: 14/09/2026   เวลา: 08:45 น.
ผู้แจ้งซ่อม: สมศรี กะเช้า (ฝ่ายผลิตข้าวกล่อง)
เบอร์โทรติดต่อ: 081-998-1234 (ต่อ 1402)
แผนก / ไลน์ผลิต: TOP SEALING ROOM
==================================================
รหัสเครื่องจักร (Machine ID): ATS03
ชื่อเครื่องจักร: TOP SEALER ยำสาหร่ายถ้วย
จุดที่แจ้งซ่อม / ตำแหน่ง: ฮีตเตอร์หัวซีลชุดที่ 2 และสายพานป้อนเข้า
ระดับความเร่งด่วน: ฉุกเฉิน (หยุดสายการผลิต)
อาการเสีย / ปัญหาที่พบ:
ฟองอากาศบนขอบถ้วย ซีลไม่เต็มขอบถ้วย ส่งผลให้สินค้าไม่ผ่านการตรวจสอบ QC
รายละเอียดเพิ่มเติม:
หัวฮีตเตอร์ไม่รักษาความร้อน อุณหภูมิตกเหลือ 120 องศา สายพานมีเสียงดังกุกกัก ขอช่างเข้าตรวจสอบด่วน`;

export const PdfWorkRequestImportModal: React.FC<PdfWorkRequestImportModalProps> = ({
  isOpen,
  onClose,
  machines,
  defaultRequester = 'ฝ่ายผลิต',
  onImportRequests,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  
  // Parsed items list
  const [parsedItems, setParsedItems] = useState<ParsedWorkRequestItem[]>([]);
  const [hasParsed, setHasParsed] = useState<boolean>(false);

  // Manual raw text paste state
  const [rawText, setRawText] = useState<string>('');

  // Notification option
  const [notifyLine, setNotifyLine] = useState<boolean>(true);

  // Machine search popover / input helper per item
  const [machineSearchQuery, setMachineSearchQuery] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handler for uploading PDF file
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setParseError('กรุณาเลือกไฟล์เอกสารนามสกุล .pdf');
      return;
    }

    setIsParsing(true);
    setParseError(null);
    setUploadedFileName(file.name);

    try {
      const result = await parseWorkRequestPDF(file, machines, defaultRequester);
      if (result.items.length === 0) {
        setParseError('ไม่พบข้อความในไฟล์ PDF หรือไฟล์อาจเป็นรูปภาพสแกนที่ไม่มีข้อความ text โปรดลองใช้แท็บวางข้อความ');
      } else {
        setParsedItems(result.items);
        setHasParsed(true);
      }
    } catch (err: unknown) {
      console.error('Error parsing PDF:', err);
      setParseError('เกิดข้อผิดพลาดในการอ่านไฟล์ PDF โปรดตรวจสอบว่าเป็นไฟล์ PDF ที่มีข้อความ หรือลองใช้แท็บวางข้อความ');
    } finally {
      setIsParsing(false);
    }
  };

  // Handler for text parse
  const handleParseRawText = () => {
    if (!rawText.trim()) {
      setParseError('กรุณาระบุหรือวางข้อความใบแจ้งซ่อม');
      return;
    }
    setIsParsing(true);
    setParseError(null);
    try {
      const items = parseWorkRequestsFromRawText(rawText, machines, defaultRequester, 'Text_Import.pdf');
      if (items.length === 0) {
        setParseError('ไม่สามารถจำแนกข้อมูลได้ กรุณาตรวจสอบว่ามีรหัสเครื่องจักรและอาการเสียในข้อความ');
      } else {
        setParsedItems(items);
        setHasParsed(true);
      }
    } catch (err) {
      setParseError('เกิดข้อผิดพลาดในการประมวลผลข้อความ');
    } finally {
      setIsParsing(false);
    }
  };

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Item modifications
  const handleUpdateItem = (tempId: string, updates: Partial<ParsedWorkRequestItem>) => {
    setParsedItems(prev => prev.map(item => {
      if (item.tempId !== tempId) return item;
      const updated = { ...item, ...updates };

      // If machineId changed, try to auto-match machine
      if (updates.machineId !== undefined) {
        const mach = findMatchingMachine(updates.machineId, machines);
        if (mach) {
          updated.machineId = mach.id;
          updated.machineName = mach.name;
          updated.lineGroup = mach.lineGroup || mach.location || item.lineGroup;
          updated.isMachineFound = true;
        } else {
          updated.isMachineFound = false;
        }
      }

      return updated;
    }));
  };

  const handleDeleteItem = (tempId: string) => {
    setParsedItems(prev => prev.filter(item => item.tempId !== tempId));
  };

  const handleAddNewItem = () => {
    const firstMach = machines[0];
    const now = new Date();
    const newItem: ParsedWorkRequestItem = {
      tempId: `draft-manual-${Date.now()}`,
      machineId: firstMach?.id || 'ATS03',
      machineName: firstMach?.name || 'TOP SEALER',
      lineGroup: firstMach?.lineGroup || firstMach?.location || 'สายการผลิต',
      locationPoint: '',
      priority: 'ปกติ',
      problemTitle: '',
      problemDetails: '',
      productionDepartment: 'ฝ่ายผลิต',
      requesterName: defaultRequester,
      requesterPhone: '',
      requestDate: getTodayDateString(),
      requestTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      isMachineFound: Boolean(firstMach)
    };
    setParsedItems(prev => [newItem, ...prev]);
    setHasParsed(true);
  };

  const handleConfirmImport = () => {
    if (parsedItems.length === 0) return;

    // Validate that each item has a problem title and machine ID
    for (const item of parsedItems) {
      if (!item.problemTitle.trim()) {
        alert(`กรุณาระบุหัวข้อปัญหา/อาการเสีย สำหรับเครื่อง ${item.machineId}`);
        return;
      }
      if (!item.machineId.trim()) {
        alert('กรุณาระบุรหัสเครื่องจักรสำหรับทุกรายการ');
        return;
      }
    }

    onImportRequests(parsedItems, notifyLine);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setParsedItems([]);
    setHasParsed(false);
    setRawText('');
    setParseError(null);
    setUploadedFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-750 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
        
        {/* Header */}
        <div className="p-5 bg-slate-850 border-b border-slate-750 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400">
              <FileUp size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-1.5">
                  นำเข้าใบแจ้งซ่อมจากไฟล์ PDF (PDF Work Request Importer)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  AI & OCR Extractor
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                โยนไฟล์ PDF ใบแจ้งซ่อมเข้ามา ระบบจะสแกนหา <strong>ID เครื่องจักร</strong>, วันที่, อาการเสีย, และระดับความเร่งด่วนให้อัตโนมัติ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          
          {/* Tabs: Upload PDF vs Paste Text */}
          {!hasParsed && (
            <div className="flex gap-2 border-b border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => { setActiveTab('upload'); setParseError(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'upload'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-750 hover:text-slate-200'
                }`}
              >
                <FileUp size={15} />
                อัปโหลดไฟล์ PDF (Drag & Drop)
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('paste'); setParseError(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'paste'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-750 hover:text-slate-200'
                }`}
              >
                <FileText size={15} />
                วางข้อความ / ทดสอบตัวอย่าง
              </button>
            </div>
          )}

          {/* Tab 1: Upload PDF Drag & Drop */}
          {!hasParsed && activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                  isDragging
                    ? 'border-emerald-400 bg-emerald-950/20 scale-[0.99]'
                    : 'border-slate-700 bg-slate-950/50 hover:border-emerald-500/70 hover:bg-slate-900/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-inner">
                  {isParsing ? (
                    <Loader2 size={32} className="animate-spin text-emerald-400" />
                  ) : (
                    <FileUp size={32} />
                  )}
                </div>

                <h4 className="text-base font-bold text-slate-100">
                  {isParsing ? 'กำลังวิเคราะห์ข้อความและค้นหา ID เครื่องจักร...' : 'ลากไฟล์ใบแจ้งซ่อม PDF มาวางที่นี่'}
                </h4>
                <p className="text-xs text-slate-400 mt-1.5 max-w-md">
                  หรือคลิกเพื่อเลือกไฟล์จากคอมพิวเตอร์ของคุณ (รองรับไฟล์เอกสารใบแจ้งซ่อม .pdf ทุกรูปแบบ)
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400">
                  <span className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700">
                    ✨ อ่าน Machine ID อัตโนมัติ
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700">
                    🔍 แมตช์ชื่อเครื่อง & ไลน์ผลิตในทะเบียน
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700">
                    ⏱ ดึงวันที่ เวลา อาการเสีย
                  </span>
                </div>
              </div>

              {/* Sample Quick Test */}
              <div className="flex items-center justify-between p-3.5 bg-slate-850/80 rounded-xl border border-slate-750">
                <div className="flex items-center gap-2.5">
                  <Sparkles size={16} className="text-amber-400 shrink-0" />
                  <span className="text-xs text-slate-300">
                    ยังไม่มีไฟล์ PDF อยู่ในมือ? ทดลองด้วยตัวอย่างข้อความแจ้งซ่อมจำลองเพื่อดูการทำงานได้ทันที
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRawText(SAMPLE_PDF_TEXT);
                    setActiveTab('paste');
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-cyan-300 rounded-lg text-xs font-semibold border border-cyan-500/30 transition shrink-0 ml-2"
                >
                  ⚡ โหลดตัวอย่างทดสอบ
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Paste Text */}
          {!hasParsed && activeTab === 'paste' && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    วางข้อความจากใบแจ้งซ่อม หรือข้อความสรุป (ระบุรหัสเครื่อง เช่น ATS03, RIM01):
                  </label>
                  <button
                    type="button"
                    onClick={() => setRawText(SAMPLE_PDF_TEXT)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
                  >
                    ⚡ ใส่ตัวอย่างข้อความ
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`วางข้อความจาก PDF เช่น:\nรหัสเครื่องจักร: ATS03\nอาการเสีย: ฟองอากาศบนขอบถ้วย ซีลไม่เต็มขอบถ้วย\nวันที่: 14/09/2026\nผู้แจ้ง: สมศรี (ฝ่ายผลิต)`}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500 transition leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  disabled={!rawText.trim() || isParsing}
                  onClick={handleParseRawText}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
                >
                  {isParsing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  วิเคราะห์ข้อความและค้นหา ID เครื่องจักร
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {parseError && (
            <div className="p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-400" />
              <div>
                <p className="font-semibold">เกิดข้อผิดพลาดในการดึงข้อมูล</p>
                <p className="text-[11px] text-rose-200/80 mt-0.5">{parseError}</p>
              </div>
            </div>
          )}

          {/* Parsed Items Review & Edit Section */}
          {hasParsed && (
            <div className="space-y-4">
              {/* Header Status Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      ตรวจพบใบแจ้งซ่อมสำเร็จ {parsedItems.length} รายการ
                      {uploadedFileName && (
                        <span className="text-[11px] font-normal text-slate-400 font-mono truncate max-w-[200px]">
                          ({uploadedFileName})
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-emerald-300/90 mt-0.5">
                      โปรดตรวจสอบหรือแก้ไขข้อมูลด้านล่างก่อนกดยืนยันบันทึกเข้าระบบ
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleAddNewItem}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition"
                  >
                    <Plus size={14} className="text-cyan-400" />
                    เพิ่มใบแจ้งซ่อมอีก 1 ใบ
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 rounded-lg text-xs transition"
                  >
                    อัปโหลดไฟล์ใหม่
                  </button>
                </div>
              </div>

              {/* Items Card List */}
              <div className="space-y-3.5">
                {parsedItems.map((item, index) => {
                  const isFound = item.isMachineFound;
                  const searchStr = machineSearchQuery[item.tempId] || '';
                  const filteredMachines = searchStr 
                    ? machines.filter(m => 
                        m.id.toLowerCase().includes(searchStr.toLowerCase()) || 
                        m.name.toLowerCase().includes(searchStr.toLowerCase()) ||
                        (m.lineGroup || '').toLowerCase().includes(searchStr.toLowerCase())
                      ).slice(0, 8)
                    : machines.slice(0, 8);

                  return (
                    <div 
                      key={item.tempId}
                      className="p-4 bg-slate-850/90 border border-slate-750 rounded-xl space-y-3.5 relative hover:border-slate-650 transition shadow-sm"
                    >
                      {/* Top Bar of item: Badge & Index & Delete */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-750 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px] font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                          
                          {/* Machine Badge */}
                          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            isFound 
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}>
                            {isFound ? (
                              <>
                                <Check size={12} className="text-emerald-400" />
                                <span>ตรงกับทะเบียน: {item.machineId}</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle size={12} className="text-amber-400" />
                                <span>รหัสระบุเอง / ไม่พบในทะเบียน: {item.machineId}</span>
                              </>
                            )}
                          </div>

                          <span className="text-xs text-slate-400">
                            • {item.machineName || 'เครื่องจักร'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.tempId)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                            title="ลบรายการนี้"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Machine Selection / Override Row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                            รหัสเครื่องจักร (Machine ID) *
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              value={item.machineId}
                              onChange={(e) => handleUpdateItem(item.tempId, { machineId: e.target.value.toUpperCase() })}
                              placeholder="เช่น ATS03, RIM01, FFS02"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono font-bold focus:outline-none focus:border-cyan-500 uppercase"
                            />
                          </div>
                          {/* Quick machine switcher select */}
                          <select
                            value={isFound ? item.machineId : ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                handleUpdateItem(item.tempId, { machineId: e.target.value });
                              }
                            }}
                            className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-400 focus:outline-none focus:border-cyan-500"
                          >
                            <option value="">-- หรือเลือกเครื่องจากทะเบียน ({machines.length} เครื่อง) --</option>
                            {machines.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.id} - {m.name} ({m.lineGroup || m.department || 'สายการผลิต'})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                            ชื่อเครื่องจักร (Machine Name)
                          </label>
                          <input
                            type="text"
                            value={item.machineName}
                            onChange={(e) => handleUpdateItem(item.tempId, { machineName: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                            ไลน์ / แผนก (Line / Dept)
                          </label>
                          <input
                            type="text"
                            value={item.lineGroup}
                            onChange={(e) => handleUpdateItem(item.tempId, { lineGroup: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>

                      {/* Problem & Details Row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                            หัวข้อปัญหา / อาการชำรุด (Problem Title)*
                          </label>
                          <input
                            type="text"
                            required
                            value={item.problemTitle}
                            onChange={(e) => handleUpdateItem(item.tempId, { problemTitle: e.target.value })}
                            placeholder="ระบุอาการเสีย เช่น ฟองอากาศบนขอบถ้วย, มอเตอร์ร้อนจัด, สายพานหลุด"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-cyan-500"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                            ระดับความเร่งด่วน (Priority)
                          </label>
                          <select
                            value={item.priority}
                            onChange={(e) => handleUpdateItem(item.tempId, { priority: e.target.value as WorkRequestPriority })}
                            className={`w-full border rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none ${
                              item.priority === 'ฉุกเฉินไลน์หยุด'
                                ? 'bg-rose-950/50 border-rose-500 text-rose-300'
                                : item.priority === 'เร่งด่วน'
                                ? 'bg-orange-950/50 border-orange-500 text-orange-300'
                                : item.priority === 'ตามแผนนัดหมาย'
                                ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300'
                                : 'bg-slate-900 border-slate-700 text-cyan-300'
                            }`}
                          >
                            <option value="ฉุกเฉินไลน์หยุด">🚨 ฉุกเฉินไลน์หยุด (ด่วนที่สุด)</option>
                            <option value="เร่งด่วน">⚡ เร่งด่วน</option>
                            <option value="ปกติ">🟡 ปกติ (ทั่วไป)</option>
                            <option value="ตามแผนนัดหมาย">🟢 ตามแผนนัดหมาย</option>
                          </select>
                        </div>
                      </div>

                      {/* Details & Location Point */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                            รายละเอียดปัญหา / ผลกระทบ (Problem Details)
                          </label>
                          <textarea
                            rows={2}
                            value={item.problemDetails}
                            onChange={(e) => handleUpdateItem(item.tempId, { problemDetails: e.target.value })}
                            placeholder="รายละเอียดเพิ่มเติม ผลกระทบต่อไลน์ หรือสาเหตุเบื้องต้น"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 leading-relaxed"
                          />
                        </div>

                        <div className="space-y-2">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                              จุดที่แจ้งซ่อม / ตำแหน่ง (Location Point)
                            </label>
                            <input
                              type="text"
                              value={item.locationPoint}
                              onChange={(e) => handleUpdateItem(item.tempId, { locationPoint: e.target.value })}
                              placeholder="เช่น ฮีตเตอร์หัวซีล, สายพาน, ปั๊มลม"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-0.5">วันที่แจ้ง</label>
                              <input
                                type="date"
                                value={item.requestDate}
                                onChange={(e) => handleUpdateItem(item.tempId, { requestDate: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200 font-mono text-center focus:outline-none focus:border-cyan-500"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-0.5">เวลาแจ้ง</label>
                              <input
                                type="time"
                                value={item.requestTime}
                                onChange={(e) => handleUpdateItem(item.tempId, { requestTime: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200 font-mono text-center focus:outline-none focus:border-cyan-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Requester Info Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">ชื่อผู้แจ้งซ่อม</label>
                          <input
                            type="text"
                            value={item.requesterName}
                            onChange={(e) => handleUpdateItem(item.tempId, { requesterName: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">แผนกผู้แจ้ง</label>
                          <input
                            type="text"
                            value={item.productionDepartment}
                            onChange={(e) => handleUpdateItem(item.tempId, { productionDepartment: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">เบอร์โทร / เบอร์ต่อภายใน</label>
                          <input
                            type="text"
                            value={item.requesterPhone}
                            onChange={(e) => handleUpdateItem(item.tempId, { requesterPhone: e.target.value })}
                            placeholder="เช่น 081-xxx-xxxx หรือ ต่อ 123"
                            className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-850 border-t border-slate-750 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            {hasParsed && (
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={notifyLine}
                  onChange={(e) => setNotifyLine(e.target.checked)}
                  className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                />
                <span className="flex items-center gap-1 font-semibold text-slate-200">
                  <BellRing size={13} className="text-emerald-400" />
                  ส่งแจ้งเตือนเข้ากลุ่ม LINE ช่างซ่อมบำรุงทันที
                </span>
              </label>
            )}
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-850 rounded-xl text-xs font-semibold transition"
            >
              ยกเลิก
            </button>

            {hasParsed ? (
              <button
                type="button"
                id="btn-confirm-import-pdf-requests"
                onClick={handleConfirmImport}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-950/50 cursor-pointer"
              >
                <CheckCircle2 size={16} />
                ยืนยันนำเข้าใบแจ้งซ่อม ({parsedItems.length} ใบ)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsing}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
              >
                <FileUp size={16} />
                เลือกไฟล์ PDF
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
