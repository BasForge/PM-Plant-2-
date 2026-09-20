import React, { useState, useRef } from 'react';
import { Machine, WorkRequestPriority } from '../../types';
import { 
  X, Upload, Sparkles, CheckCircle2, AlertTriangle, 
  Trash2, Plus, Check, FileSpreadsheet, BellRing, 
  Search, Building, Clock, Calendar, AlertOctagon, Download,
  ClipboardList, FileText, RefreshCw
} from 'lucide-react';
import { 
  parseWorkRequestExcelBuffer,
  downloadWorkRequestTemplateExcel,
  SAMPLE_EXCEL_WORK_REQUESTS,
  ParsedWorkRequestItem,
  findMatchingMachine 
} from '../../utils/excelWorkRequestParser';
import { getTodayDateString } from '../../utils/pmAlerts';

interface ExcelWorkRequestImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  machines: Machine[];
  defaultRequester?: string;
  onImportRequests: (items: ParsedWorkRequestItem[], notifyLine: boolean) => void;
}

export const ExcelWorkRequestImportModal: React.FC<ExcelWorkRequestImportModalProps> = ({
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handler for uploading Excel file
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.xls') && !lowerName.endsWith('.csv')) {
      setParseError('กรุณาเลือกไฟล์เอกสารนามสกุล .xlsx, .xls หรือ .csv เท่านั้น');
      return;
    }

    setIsParsing(true);
    setParseError(null);
    setUploadedFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const result = parseWorkRequestExcelBuffer(buffer, machines, defaultRequester, file.name);
      
      if (result.items.length === 0) {
        setParseError('ไม่พบข้อมูลรายการแจ้งซ่อมในไฟล์ Excel หรือแถวข้อมูลว่างเปล่า โปรดตรวจสอบคอลัมน์ในไฟล์ หรือลองดาวน์โหลด Template แม่แบบ');
      } else {
        setParsedItems(result.items);
        setHasParsed(true);
      }
    } catch (err: unknown) {
      console.error('Error parsing Excel:', err);
      setParseError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการอ่านไฟล์ Excel โปรดตรวจสอบรูปแบบไฟล์');
    } finally {
      setIsParsing(false);
    }
  };

  // Handler for text / CSV paste parse
  const handleParseRawText = () => {
    if (!rawText.trim()) {
      setParseError('กรุณาวางข้อความหรือข้อมูลตารางที่คัดลอกมาจาก Excel/CSV ก่อนกดวิเคราะห์');
      return;
    }

    setIsParsing(true);
    setParseError(null);

    try {
      const result = parseWorkRequestExcelBuffer(rawText, machines, defaultRequester, 'clipboard_data.csv');
      if (result.items.length === 0) {
        setParseError('ไม่พบข้อมูลรายการแจ้งซ่อมที่สมบูรณ์ โปรดตรวจสอบว่าข้อมูลมีหัวข้อปัญหาหรือรหัสเครื่องจักร');
      } else {
        setParsedItems(result.items);
        setHasParsed(true);
      }
    } catch (err: unknown) {
      console.error('Error parsing text:', err);
      setParseError('ไม่สามารถแปลงข้อความได้ กรุณาตรวจสอบว่าเป็นข้อมูลตารางหรือไฟล์ CSV');
    } finally {
      setIsParsing(false);
    }
  };

  // Load sample work requests
  const handleLoadSampleData = () => {
    setParseError(null);
    setUploadedFileName('ตัวอย่างใบแจ้งซ่อม_CPRAM_Plant2.xlsx');
    // Map with latest machines if matched
    const mapped = SAMPLE_EXCEL_WORK_REQUESTS.map(item => {
      const match = findMatchingMachine(item.machineId, machines);
      return {
        ...item,
        tempId: `sample-wr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        isMachineFound: Boolean(match),
        machineName: match?.name || item.machineName,
        lineGroup: match?.lineGroup || match?.location || item.lineGroup
      };
    });
    setParsedItems(mapped);
    setHasParsed(true);
  };

  // Update a field in a parsed item
  const handleUpdateItem = (tempId: string, updates: Partial<ParsedWorkRequestItem>) => {
    setParsedItems(prev => prev.map(item => {
      if (item.tempId !== tempId) return item;
      const updated = { ...item, ...updates };

      // If machine ID changed, re-check registry
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
      tempId: `manual-wr-${Date.now()}`,
      sequenceNo: parsedItems.length + 1,
      ticketNo: '',
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
      status: 'รอตอบรับ',
      rawStatus: 'เปิดงาน',
      isMachineFound: Boolean(firstMach)
    };
    setParsedItems(prev => [newItem, ...prev]);
    setHasParsed(true);
  };

  const handleConfirmImport = () => {
    if (parsedItems.length === 0) return;

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

  const matchedCount = parsedItems.filter(i => i.isMachineFound).length;
  const customCount = parsedItems.length - matchedCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-750 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
        
        {/* Header */}
        <div className="p-5 bg-slate-850 border-b border-slate-750 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 shadow-sm">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-1.5">
                  นำเข้าใบแจ้งซ่อมจากไฟล์ Excel (Excel Work Request Importer)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  .xlsx / .xls / .csv
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                โยนไฟล์ Excel ตารางแจ้งซ่อม ระบบจะแยกแยะ <strong>เลขที่ใบแจ้ง, รหัสเครื่องจักร, อาการเสีย, ผู้แจ้ง, แผนก</strong> และดึงหัวข้องานแสดงให้อัตโนมัติ
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadWorkRequestTemplateExcel}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
              title="ดาวน์โหลดไฟล์ตัวอย่าง Template Excel (.xlsx) เพื่อนำไปกรอกข้อมูลแล้วโยนเข้ามา"
            >
              <Download size={13} className="text-emerald-400" />
              <span>Template Excel</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="ปิดหน้าต่าง"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          
          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Sparkles size={15} className="text-amber-400 shrink-0" />
              <span>รองรับทั้งตาราง Excel จาก ERP/ระบบเดิม หรือไฟล์ส่งออก CSV มาตรฐาน</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLoadSampleData}
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition cursor-pointer"
                title="คลิกเพื่อทดสอบโหลดตัวอย่างข้อมูลใบแจ้งซ่อม 5 รายการทันที"
              >
                <Sparkles size={12} />
                <span>⚡ โหลดตัวอย่างใบแจ้งซ่อม (5 รายการ)</span>
              </button>

              <button
                type="button"
                onClick={downloadWorkRequestTemplateExcel}
                className="sm:hidden flex items-center gap-1 px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium"
              >
                <Download size={12} />
                <span>Template</span>
              </button>
            </div>
          </div>

          {/* Mode Tabs: Upload vs Paste */}
          {!hasParsed && (
            <div className="space-y-4">
              <div className="flex border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                    activeTab === 'upload'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Upload size={14} />
                  <span>โยนไฟล์หรือเลือกไฟล์ Excel (.xlsx, .xls, .csv)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                    activeTab === 'paste'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ClipboardList size={14} />
                  <span>วางข้อมูลตาราง / ข้อความ (Paste Data)</span>
                </button>
              </div>

              {activeTab === 'upload' ? (
                /* Drag & Drop Upload Zone */
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleFileUpload(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                    isDragging 
                      ? 'border-emerald-400 bg-emerald-500/10' 
                      : 'border-slate-750 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/70'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />

                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                    {isParsing ? (
                      <RefreshCw size={28} className="animate-spin" />
                    ) : (
                      <FileSpreadsheet size={32} />
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-200">
                      {isParsing ? 'กำลังอ่านและสแกนข้อมูลจากไฟล์ Excel...' : 'ลากไฟล์ Excel มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์'}
                    </p>
                    <p className="text-xs text-slate-400">
                      รองรับไฟล์ <span className="font-mono text-emerald-300 font-semibold">.XLSX</span>, <span className="font-mono text-emerald-300 font-semibold">.XLS</span> หรือ <span className="font-mono text-emerald-300 font-semibold">.CSV</span>
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] text-slate-300 mt-2">
                    <span>💡 มีคอลัมน์: ลำดับ, เลขที่แจ้งซ่อม, รหัสเครื่อง, รายละเอียด / อาการเสีย, ผู้ของาน, แผนก</span>
                  </div>
                </div>
              ) : (
                /* Paste Text Zone */
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>คัดลอกแถวตารางจาก Excel แล้วนำมากดวาง (Ctrl+V) ที่นี่ได้เลย:</span>
                    <button
                      type="button"
                      onClick={() => setRawText('')}
                      className="text-slate-400 hover:text-slate-200 underline text-[11px]"
                    >
                      ล้างข้อความ
                    </button>
                  </div>

                  <textarea
                    rows={8}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="ตัวอย่างเช่น:
1	167311	BAN01	BANDING	ส่งเทอร์โมเครื่อง banding ลงข้าวกล่อง ปลั๊กหลวม	จุฑามาศ	542107 ฝ่ายขึ้นรูป	14/09/2026	เปิดงาน
2	167312	ATS03	TOP SEALER	ซีลไม่สนิท ฟิล์มตัดไม่ขาด มีเสียงกระแทก	สมศรี	542108 ฝ่ายบรรจุ	14/09/2026	เปิดงาน"
                    className="w-full bg-slate-950 border border-slate-750 rounded-xl p-3.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500 leading-relaxed"
                  />

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={isParsing || !rawText.trim()}
                      onClick={handleParseRawText}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
                    >
                      {isParsing ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      <span>วิเคราะห์และแปลงข้อมูลตาราง</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {parseError && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs">
              <AlertOctagon size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">ไม่สามารถอ่านข้อมูลแจ้งซ่อมได้</p>
                <p className="text-[11px] text-rose-300/90">{parseError}</p>
              </div>
            </div>
          )}

          {/* Parsed Items List / Table */}
          {hasParsed && (
            <div className="space-y-4">
              
              {/* Summary Stats Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-850 border border-slate-750 rounded-xl">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <FileSpreadsheet size={15} className="text-emerald-400" />
                    <span>พบทั้งหมด: <span className="text-emerald-400 font-mono text-sm">{parsedItems.length}</span> รายการ</span>
                  </div>

                  <span className="text-slate-600">|</span>

                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    <Check size={11} />
                    ตรงทะเบียนเครื่องจักร: {matchedCount}
                  </span>

                  {customCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      <AlertTriangle size={11} />
                      ระบุเอง/เครื่องใหม่: {customCount}
                    </span>
                  )}

                  {uploadedFileName && (
                    <span className="text-slate-400 text-[11px] truncate max-w-xs font-mono">
                      (จาก: {uploadedFileName})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddNewItem}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition"
                  >
                    <Plus size={13} className="text-cyan-400" />
                    <span>+ เพิ่มรายการ</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg text-xs transition"
                  >
                    <RefreshCw size={12} />
                    <span>เลือกไฟล์ใหม่</span>
                  </button>
                </div>
              </div>

              {/* Items Card List */}
              <div className="space-y-3.5 max-h-[50vh] overflow-y-auto pr-1">
                {parsedItems.map((item, index) => {
                  const isFound = item.isMachineFound;

                  return (
                    <div 
                      key={item.tempId}
                      className={`p-4 rounded-xl border transition space-y-3 bg-slate-950/70 ${
                        isFound ? 'border-slate-800 hover:border-slate-700' : 'border-amber-500/30 bg-amber-500/5'
                      }`}
                    >
                      {/* Top bar of item */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-mono font-bold">
                            {item.sequenceNo || index + 1}
                          </span>

                          {/* Ticket No */}
                          <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 font-mono text-xs font-bold text-slate-200">
                            <span className="text-[10px] text-slate-500">เลขที่:</span>
                            <input
                              type="text"
                              value={item.ticketNo || ''}
                              onChange={(e) => handleUpdateItem(item.tempId, { ticketNo: e.target.value })}
                              placeholder="เช่น 167311"
                              className="bg-transparent text-slate-100 font-mono text-xs focus:outline-none w-24"
                            />
                          </div>
                          
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
                                <span>รหัสระบุเอง: {item.machineId}</span>
                              </>
                            )}
                          </div>

                          <span className="text-xs text-slate-400 truncate max-w-[200px]">
                            • {item.machineName || 'เครื่องจักร'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Priority Pill */}
                          <select
                            value={item.priority}
                            onChange={(e) => handleUpdateItem(item.tempId, { priority: e.target.value as WorkRequestPriority })}
                            className={`px-2 py-0.5 rounded text-xs font-bold border focus:outline-none cursor-pointer ${
                              item.priority === 'ฉุกเฉินไลน์หยุด' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                              item.priority === 'เร่งด่วน' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                              item.priority === 'ตามแผนนัดหมาย' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' :
                              'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            <option value="ฉุกเฉินไลน์หยุด">ฉุกเฉินไลน์หยุด</option>
                            <option value="เร่งด่วน">เร่งด่วน</option>
                            <option value="ตามแผนนัดหมาย">ตามแผนนัดหมาย</option>
                            <option value="ปกติ">ปกติ</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.tempId)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="ลบรายการนี้"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Machine Selection / Override Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                            รหัสเครื่องจักร (Machine ID) *
                          </label>
                          <input
                            type="text"
                            required
                            value={item.machineId}
                            onChange={(e) => handleUpdateItem(item.tempId, { machineId: e.target.value.toUpperCase() })}
                            placeholder="เช่น BAN01, ATS03, RIM01"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono font-bold focus:outline-none focus:border-emerald-500 uppercase"
                          />
                          {/* Quick machine picker */}
                          <select
                            value={isFound ? item.machineId : ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                handleUpdateItem(item.tempId, { machineId: e.target.value });
                              }
                            }}
                            className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-400 focus:outline-none focus:border-emerald-500"
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
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
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
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Problem Title & Details */}
                      <div className="space-y-2">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                            หัวข้องาน / ปัญหาที่พบ (Problem Title) *
                          </label>
                          <input
                            type="text"
                            required
                            value={item.problemTitle}
                            onChange={(e) => handleUpdateItem(item.tempId, { problemTitle: e.target.value })}
                            placeholder="ระบุหัวข้ออาการเสีย เช่น ปลั๊กหลวม, ซีลไม่ติด, มอเตอร์ร้อน"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-semibold focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                            รายละเอียดอาการเสียเพิ่มเติม (Problem Details)
                          </label>
                          <textarea
                            rows={2}
                            value={item.problemDetails}
                            onChange={(e) => handleUpdateItem(item.tempId, { problemDetails: e.target.value })}
                            placeholder="รายละเอียดอาการผิดปกติ ผลกระทบต่อสายการผลิต..."
                            className="w-full bg-slate-900 border border-slate-750 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Requester, Dept, Date, Time Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">ผู้ของาน / ผู้แจ้ง</label>
                          <input
                            type="text"
                            value={item.requesterName}
                            onChange={(e) => handleUpdateItem(item.tempId, { requesterName: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">หน่วยงาน / ฝ่ายผลิต</label>
                          <input
                            type="text"
                            value={item.productionDepartment}
                            onChange={(e) => handleUpdateItem(item.tempId, { productionDepartment: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">วันที่แจ้ง</label>
                          <input
                            type="date"
                            value={item.requestDate}
                            onChange={(e) => handleUpdateItem(item.tempId, { requestDate: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">เวลาที่แจ้ง</label>
                          <input
                            type="time"
                            value={item.requestTime}
                            onChange={(e) => handleUpdateItem(item.tempId, { requestTime: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
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
              className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              ยกเลิก
            </button>

            {hasParsed ? (
              <button
                type="button"
                id="btn-confirm-import-excel-requests"
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
                <FileSpreadsheet size={16} />
                เลือกไฟล์ Excel
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
