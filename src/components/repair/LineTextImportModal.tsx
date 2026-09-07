import React, { useState, useEffect, useMemo } from 'react';
import { Machine, RepairLog } from '../../types';
import { 
  X, Sparkles, Clock, Wrench, CheckCircle2, AlertTriangle, 
  Trash2, Plus, MessageSquare, ArrowRight, Check, HelpCircle, FileText
} from 'lucide-react';
import { getTodayDateString } from '../../utils/pmAlerts';
import { sendLineNotification } from '../../utils/lineNotify';

interface ParsedRepairItem {
  tempId: string;
  machineId: string;
  machineName?: string;
  symptoms: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  date: string; // YYYY-MM-DD
  duration: number; // MTTR in minutes
  status: 'กำลังซ่อม' | 'ปิดงาน';
  technician: string;
  correctiveAction: string;
  why1: string;
  rawText: string;
  isMachineFound: boolean;
}

interface LineTextImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  machines: Machine[];
  technicians: string[];
  onImportRepairs: (newRepairs: RepairLog[]) => void;
}

const SAMPLE_LINE_TEXT = `-เครื่อง ATS03 top seal ยำสาหร่ายถ้วย พบปัญหา ฟองอากาศบนขอบถ้วย
ตั้งแต่เวลา 08.48-10.32
-เครื่อง ONG01 โอนิกิริ no.2 เมนูย่างเกลือสติกเกอร์หลังขึ้น alarm 
ตั้งแต่เวลา 15.00-17.12
-เครื่อง ATS03 top seal เนื่องจากไม่ tpp 
ตั้งแต่ 17.25-21.25 ✅️
- ATS03 topseal sealไม่เต็มขอบถ้วย ตั้งแต่ 22.24-22.45✅️`;

export const LineTextImportModal: React.FC<LineTextImportModalProps> = ({
  isOpen,
  onClose,
  machines,
  technicians,
  onImportRepairs,
}) => {
  const [rawInput, setRawInput] = useState<string>('');
  const [batchDate, setBatchDate] = useState<string>(() => getTodayDateString());
  const [defaultTech, setDefaultTech] = useState<string>(technicians[0] || 'ช่าง 1');
  const [parsedItems, setParsedItems] = useState<ParsedRepairItem[]>([]);
  const [hasParsed, setHasParsed] = useState<boolean>(false);

  // Keep defaultTech synced if technicians list changes
  useEffect(() => {
    if (technicians.length > 0 && !technicians.includes(defaultTech)) {
      setDefaultTech(technicians[0]);
    }
  }, [technicians, defaultTech]);

  // Helper to find machine details
  const findMachine = (idOrQuery: string): Machine | undefined => {
    if (!idOrQuery) return undefined;
    const clean = idOrQuery.trim().toLowerCase();
    return machines.find(m => 
      m.id.toLowerCase() === clean || 
      m.id.toLowerCase().replace(/[-_]/g, '') === clean.replace(/[-_]/g, '')
    );
  };

  // Helper to normalize time "08.48" or "8:48" to "08:48"
  const normalizeTime = (tStr: string): string => {
    if (!tStr) return '';
    const cleaned = tStr.trim().replace('.', ':');
    const parts = cleaned.split(':');
    if (parts.length >= 2) {
      const hh = parts[0].padStart(2, '0');
      const mm = parts[1].padEnd(2, '0').slice(0, 2);
      return `${hh}:${mm}`;
    }
    return cleaned;
  };

  // Helper to calculate minutes between two times
  const calculateDurationMinutes = (start: string, end: string): number => {
    if (!start || !end) return 60;
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 60;
    
    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diff < 0) {
      // Overnight cross midnight shift (e.g. 23:00 to 01:30)
      diff += 24 * 60;
    }
    return diff > 0 ? diff : 30;
  };

  // Main Parser Function
  const parseLineMessages = (text: string, targetDate: string, tech: string): ParsedRepairItem[] => {
    if (!text.trim()) return [];

    // Split text into distinct items/records
    // Strategy: Look for lines that start a new item (e.g., starts with '-', '*', '•', numbers like '1.', or machine patterns)
    const lines = text.split('\n');
    const chunks: string[] = [];
    let currentChunk: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.join('\n'));
          currentChunk = [];
        }
        continue;
      }

      // Check if line looks like the beginning of a new record:
      // Starts with bullet (- or * or •) OR starts with number like "1.", "1)" OR begins with "เครื่อง" or known machine ID
      const isBulletStart = /^[-*•\u2022]\s*/.test(trimmed);
      const isNumberedStart = /^\d+[\.\)]\s*/.test(trimmed);
      const isMachineStart = /^(?:เครื่อง\s*[:#-]?\s*|[A-Za-z]{2,8}[-_]?[0-9]{1,4}\b)/i.test(trimmed);

      // If we already have items in currentChunk and this line looks like a new item
      // BUT make sure it's not just a time line like "ตั้งแต่เวลา 08.48-10.32"
      const isTimeLine = /^(?:ตั้งแต่|เวลา|time)/i.test(trimmed);

      if ((isBulletStart || isNumberedStart || isMachineStart) && !isTimeLine && currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n'));
        currentChunk = [trimmed];
      } else {
        currentChunk.push(trimmed);
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n'));
    }

    // Now parse each chunk
    const results: ParsedRepairItem[] = [];

    chunks.forEach((chunk, idx) => {
      if (!chunk.trim()) return;

      const singleLine = chunk.replace(/\n+/g, ' ').trim();

      // 1. Detect Machine ID
      // First try to match against actual machines in the database (longest IDs first)
      const sortedMachines = [...machines].sort((a, b) => b.id.length - a.id.length);
      let detectedMachineId = '';
      let isFoundInDb = false;

      for (const m of sortedMachines) {
        const regex = new RegExp(`(?:เครื่อง\\s*)?\\b${m.id}\\b`, 'i');
        if (regex.test(singleLine)) {
          detectedMachineId = m.id;
          isFoundInDb = true;
          break;
        }
      }

      // If not found in database machines, use generic pattern (e.g. ATS03, ONG01, RIM01, FFS01)
      if (!detectedMachineId) {
        const genericMatch = singleLine.match(/(?:เครื่อง\s*[:#-]?\s*|Machine\s*[:#-]?\s*|\b)([A-Za-z]{2,8}[-_]?[0-9]{1,4})\b/i);
        if (genericMatch) {
          detectedMachineId = genericMatch[1].toUpperCase();
          const matched = findMachine(detectedMachineId);
          if (matched) {
            detectedMachineId = matched.id;
            isFoundInDb = true;
          }
        }
      }

      // Default fallback machine if none extracted
      if (!detectedMachineId) {
        detectedMachineId = machines[0]?.id || 'ATS03';
      }

      const machineObj = findMachine(detectedMachineId);
      const machineName = machineObj ? machineObj.name : undefined;

      // 2. Detect Times (Start and End)
      // Patterns:
      // "ตั้งแต่เวลา 08.48-10.32" or "ตั้งแต่ 17.25-21.25" or "เวลา 15.00-17.12" or "22.24-22.45"
      let startTime = '09:00';
      let endTime = '10:00';
      let hasFoundTime = false;

      const rangeTimeMatch = singleLine.match(
        /(?:ตั้งแต่เวลา|ตั้งแต่|เวลา|ช่วงเวลา|time)?\s*([0-2]?[0-9][.:][0-5][0-9])\s*(?:-|ถึง|to|–|—)\s*([0-2]?[0-9][.:][0-5][0-9])/i
      );

      if (rangeTimeMatch) {
        startTime = normalizeTime(rangeTimeMatch[1]);
        endTime = normalizeTime(rangeTimeMatch[2]);
        hasFoundTime = true;
      } else {
        // Look for single time e.g. "เวลา 14.30"
        const singleTimeMatch = singleLine.match(/(?:ตั้งแต่เวลา|ตั้งแต่|เวลา|ตอน|at)?\s*([0-2]?[0-9][.:][0-5][0-9])/i);
        if (singleTimeMatch) {
          startTime = normalizeTime(singleTimeMatch[1]);
          // Default end time + 1 hour
          const [sh, sm] = startTime.split(':').map(Number);
          const eh = (sh + 1) % 24;
          endTime = `${String(eh).padStart(2, '0')}:${String(sm || 0).padStart(2, '0')}`;
          hasFoundTime = true;
        }
      }

      const duration = calculateDurationMinutes(startTime, endTime);

      // 3. Detect Status
      // If checkmark ✅, ✔️ is in text or end time exists, defaults to 'ปิดงาน'
      const hasCheckmark = /[✅️✔️\u2705\u2714\uFE0F]/.test(chunk) || /ปิดงาน|เสร็จ|complete|เรียบร้อย/i.test(chunk);
      const status: 'กำลังซ่อม' | 'ปิดงาน' = hasCheckmark || hasFoundTime ? 'ปิดงาน' : 'กำลังซ่อม';

      // 4. Extract Symptoms & Clean up text
      let cleanedSymptoms = chunk;
      // Strip leading bullets
      cleanedSymptoms = cleanedSymptoms.replace(/^[\s-*•\d.)]+/g, '');
      // Strip machine mention
      if (detectedMachineId) {
        cleanedSymptoms = cleanedSymptoms.replace(new RegExp(`(?:เครื่อง\\s*[:#-]?\\s*)?${detectedMachineId}`, 'gi'), '');
      }
      cleanedSymptoms = cleanedSymptoms.replace(/เครื่อง\s*[:#-]?\s*/gi, '');
      // Strip time pattern
      cleanedSymptoms = cleanedSymptoms.replace(
        /(?:ตั้งแต่เวลา|ตั้งแต่|เวลา|ช่วงเวลา)?\s*[0-2]?[0-9][.:][0-5][0-9]\s*(?:-|ถึง|to|–|—)\s*[0-2]?[0-9][.:][0-5][0-9]/gi, 
        ''
      );
      // Strip trailing or isolated time phrases
      cleanedSymptoms = cleanedSymptoms.replace(/(?:ตั้งแต่เวลา|ตั้งแต่|เวลา)\s*[0-2]?[0-9][.:][0-5][0-9]/gi, '');
      cleanedSymptoms = cleanedSymptoms.replace(/(?:ตั้งแต่เวลา|ตั้งแต่|เวลา)\s*$/gi, '');
      // Strip checkmarks
      cleanedSymptoms = cleanedSymptoms.replace(/[✅️✔️\u2705\u2714\uFE0F]/g, '');
      // Clean leading and trailing punctuation & spaces
      cleanedSymptoms = cleanedSymptoms.replace(/^[,\s:\-]+/, '').replace(/[,\s:\-]+$/, '').trim();
      cleanedSymptoms = cleanedSymptoms.replace(/\s+/g, ' ');

      if (!cleanedSymptoms || cleanedSymptoms.length < 2) {
        cleanedSymptoms = `แจ้งซ่อมฉุกเฉินเครื่อง ${detectedMachineId}`;
      }

      results.push({
        tempId: `parsed-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        machineId: detectedMachineId,
        machineName,
        symptoms: cleanedSymptoms,
        startTime,
        endTime,
        date: targetDate,
        duration,
        status,
        technician: tech,
        correctiveAction: status === 'ปิดงาน' 
          ? 'แก้ไขปรับตั้งเครื่องจักร ตรวจเช็คการทำงาน และส่งมอบไลน์ผลิตเรียบร้อย' 
          : 'อยู่ระหว่างเข้าตรวจสอบและแก้ไขปัญหาหน้างาน',
        why1: cleanedSymptoms,
        rawText: chunk,
        isMachineFound: isFoundInDb
      });
    });

    return results;
  };

  // Trigger parsing whenever rawInput or batch settings change
  const handleParse = () => {
    const items = parseLineMessages(rawInput, batchDate, defaultTech);
    setParsedItems(items);
    setHasParsed(true);
  };

  const handleLoadSample = () => {
    setRawInput(SAMPLE_LINE_TEXT);
    const items = parseLineMessages(SAMPLE_LINE_TEXT, batchDate, defaultTech);
    setParsedItems(items);
    setHasParsed(true);
  };

  const handleClear = () => {
    setRawInput('');
    setParsedItems([]);
    setHasParsed(false);
  };

  // Edit item inline
  const updateParsedItem = (tempId: string, updates: Partial<ParsedRepairItem>) => {
    setParsedItems(prev => prev.map(item => {
      if (item.tempId !== tempId) return item;
      const updated = { ...item, ...updates };
      // If times changed, recalculate duration
      if (updates.startTime || updates.endTime) {
        updated.duration = calculateDurationMinutes(updated.startTime, updated.endTime);
      }
      // If machineId changed, update machineName and found flag
      if (updates.machineId) {
        const m = findMachine(updates.machineId);
        updated.machineName = m?.name;
        updated.isMachineFound = !!m;
      }
      return updated;
    }));
  };

  // Delete row
  const deleteParsedItem = (tempId: string) => {
    setParsedItems(prev => prev.filter(item => item.tempId !== tempId));
  };

  // Add new empty row
  const handleAddNewRow = () => {
    const newItem: ParsedRepairItem = {
      tempId: `parsed-manual-${Date.now()}`,
      machineId: machines[0]?.id || 'ATS03',
      machineName: machines[0]?.name || 'AUTOMATIC TOP SEALER',
      symptoms: '',
      startTime: '10:00',
      endTime: '11:00',
      date: batchDate,
      duration: 60,
      status: 'ปิดงาน',
      technician: defaultTech,
      correctiveAction: 'แก้ไขปรับตั้งเครื่องจักร ตรวจเช็คการทำงาน และส่งมอบไลน์ผลิตเรียบร้อย',
      why1: '',
      rawText: 'บันทึกเพิ่มเติมด้วยตนเอง',
      isMachineFound: true
    };
    setParsedItems(prev => [...prev, newItem]);
  };

  // Batch Import
  const handleConfirmImport = () => {
    if (parsedItems.length === 0) {
      alert('ไม่มีรายการซ่อมสำหรับนำเข้า กรุณาวางข้อความและคลิกประมวลผลก่อน');
      return;
    }

    const newRepairLogs: RepairLog[] = parsedItems.map((item, index) => {
      const breakdownTime = `${item.date}T${item.startTime}`;
      const repairDoneTime = item.status === 'ปิดงาน' ? `${item.date}T${item.endTime}` : '';

      return {
        id: `rep-${Date.now()}-${index}`,
        type: 'Repair',
        technician: item.technician,
        technicians: [item.technician],
        date: item.date,
        machineId: item.machineId,
        breakdownTime,
        repairDoneTime,
        symptoms: item.symptoms,
        why1: item.why1 || item.symptoms,
        why2: 'ชิ้นส่วนทำงานผิดจังหวะ หรือเกิดความคลาดเคลื่อนในการทำงาน',
        why3: '',
        why4: '',
        why5: '',
        correctiveAction: item.correctiveAction,
        duration: item.duration,
        status: item.status,
        usedParts: [],
        otherCost: 0
      };
    });

    onImportRepairs(newRepairLogs);

    // Send LINE notify summary if configured
    const totalMinutes = newRepairLogs.reduce((acc, curr) => acc + (curr.duration || 0), 0);
    const summaryMsg = `📲 [นำเข้าประวัติซ่อมจากข้อความไลน์]
📊 จำนวนงานซ่อม: ${newRepairLogs.length} รายการ
⏱️ เวลารวม MTTR: ${totalMinutes} นาที (${(totalMinutes / 60).toFixed(1)} ชม.)
📅 วันที่บันทึก: ${batchDate}
👨‍🔧 ช่างหลัก: ${defaultTech}
🔧 เครื่องที่ซ่อม: ${Array.from(new Set(newRepairLogs.map(r => r.machineId))).join(', ')}`;

    sendLineNotification(summaryMsg).catch(console.error);

    alert(`✅ นำเข้าข้อมูลงานซ่อมบำรุงสำเร็จจำนวน ${newRepairLogs.length} รายการ!`);
    handleClear();
    onClose();
  };

  const totalMttrMinutes = useMemo(() => {
    return parsedItems.reduce((sum, item) => sum + (item.duration || 0), 0);
  }, [parsedItems]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-green-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <MessageSquare size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">
                  นำเข้าประวัติงานซ่อมด่วนจากข้อความไลน์ (Smart LINE Text Parser)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Auto-Detect ID & Time
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                วางข้อความสรุปอาการเสียจากไลน์กลุ่มช่าง/ฝ่ายผลิต ระบบจะแยก ID เครื่อง, ช่วงเวลา, MTTR และอาการเสียให้โดยอัตโนมัติ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-950/40">
          
          {/* Top Options Bar (Shift Date & Default Tech) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock size={13} className="text-cyan-400" />
                วันที่เกิดเหตุ / วันที่ของกะ:
              </label>
              <input
                type="date"
                value={batchDate}
                onChange={(e) => {
                  setBatchDate(e.target.value);
                  if (parsedItems.length > 0) {
                    setParsedItems(prev => prev.map(item => ({ ...item, date: e.target.value })));
                  }
                }}
                className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Wrench size={13} className="text-amber-400" />
                ช่างผู้รับผิดชอบหลัก (Default):
              </label>
              <select
                value={defaultTech}
                onChange={(e) => {
                  setDefaultTech(e.target.value);
                  if (parsedItems.length > 0) {
                    setParsedItems(prev => prev.map(item => ({ ...item, technician: e.target.value })));
                  }
                }}
                className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
              >
                {technicians.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleLoadSample}
                className="flex-1 bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-cyan-500/30 font-semibold px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                title="ทดลองโหลดข้อความตัวอย่างจริงจากไลน์ฝ่ายผลิต"
              >
                <Sparkles size={13} className="text-cyan-400" />
                โหลดตัวอย่างข้อความ
              </button>
              {rawInput && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700 font-semibold px-3 py-2 rounded-lg text-xs transition-colors"
                  title="ล้างข้อความทั้งหมด"
                >
                  ล้าง
                </button>
              )}
            </div>
          </div>

          {/* Raw Text Input Box */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare size={14} className="text-emerald-400" />
                วางข้อความจากไลน์ฝ่ายผลิต (Paste LINE Message Here):
              </label>
              <span className="text-[11px] text-slate-400">
                รองรับทั้งข้อความหลายบรรทัด, มีสัญลักษณ์ -, เครื่อง [ID], ช่วงเวลา 08.48-10.32
              </span>
            </div>
            <textarea
              rows={5}
              value={rawInput}
              onChange={(e) => {
                setRawInput(e.target.value);
                if (hasParsed) {
                  // auto refresh parsed if user had already pressed parse
                  const items = parseLineMessages(e.target.value, batchDate, defaultTech);
                  setParsedItems(items);
                }
              }}
              placeholder={`ตัวอย่างเช่น:\n-เครื่อง ATS03 top seal ยำสาหร่ายถ้วย พบปัญหา ฟองอากาศบนขอบถ้วย\nตั้งแต่เวลา 08.48-10.32\n-เครื่อง ONG01 โอนิกิริ no.2 เมนูย่างเกลือสติกเกอร์หลังขึ้น alarm\nตั้งแต่เวลา 15.00-17.12`}
              className="w-full bg-slate-950 border border-slate-750 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors leading-relaxed placeholder:text-slate-600"
            />
            <div className="flex justify-between items-center pt-1">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <HelpCircle size={12} className="text-cyan-400" />
                ระบบจะตรวจสอบความสัมพันธ์กับเครื่องจักรในทะเบียนโรงงานโดยอัตโนมัติ
              </span>
              <button
                type="button"
                onClick={handleParse}
                disabled={!rawInput.trim()}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md ${
                  rawInput.trim() 
                    ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white cursor-pointer' 
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-750'
                }`}
              >
                <Sparkles size={14} />
                ประมวลผลข้อความ (Parse Data)
              </button>
            </div>
          </div>

          {/* Parsed Results Section */}
          {parsedItems.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-100">
                    รายการงานซ่อมที่แปลงได้ ({parsedItems.length} รายการ)
                  </h3>
                  <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
                    เวลารวม MTTR: <strong className="text-amber-400 font-mono">{totalMttrMinutes}</strong> นาที ({(totalMttrMinutes / 60).toFixed(1)} ชม.)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddNewRow}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-slate-700 rounded-lg text-xs font-semibold transition-colors self-start sm:self-auto"
                >
                  <Plus size={13} />
                  เพิ่มแถวใหม่
                </button>
              </div>

              {/* Editable Cards / Table for each record */}
              <div className="space-y-3">
                {parsedItems.map((item, index) => {
                  return (
                    <div 
                      key={item.tempId}
                      className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 space-y-3 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Machine selector / badge */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-400">เครื่อง:</span>
                            <select
                              value={item.machineId}
                              onChange={(e) => updateParsedItem(item.tempId, { machineId: e.target.value })}
                              className="bg-slate-900 border border-slate-700 text-cyan-300 font-bold font-mono text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-cyan-500"
                            >
                              {machines.map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.id} - {m.name}
                                </option>
                              ))}
                              {/* In case the extracted machine is not in list */}
                              {!machines.some(m => m.id.toLowerCase() === item.machineId.toLowerCase()) && (
                                <option value={item.machineId}>{item.machineId} (รหัสใหม่)</option>
                              )}
                            </select>
                          </div>

                          {item.machineName && (
                            <span className="text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 truncate max-w-[200px]">
                              {item.machineName}
                            </span>
                          )}

                          {!item.isMachineFound && (
                            <span className="text-[10px] text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded flex items-center gap-1">
                              <AlertTriangle size={10} />
                              ไม่พบในทะเบียน (กรุณาตรวจรหัส)
                            </span>
                          )}
                        </div>

                        {/* Status & Delete */}
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={item.status}
                            onChange={(e) => updateParsedItem(item.tempId, { status: e.target.value as any })}
                            className={`text-xs font-bold px-2 py-1 rounded-lg border focus:outline-none ${
                              item.status === 'ปิดงาน'
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                                : 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                            }`}
                          >
                            <option value="ปิดงาน">✅ ปิดงาน (เสร็จสิ้น)</option>
                            <option value="กำลังซ่อม">⏳ กำลังซ่อม</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => deleteParsedItem(item.tempId)}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded transition-colors"
                            title="ลบรายการนี้"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Symptoms Input */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          อาการเสียชำรุด / รายละเอียดปัญหา:
                        </label>
                        <input
                          type="text"
                          value={item.symptoms}
                          onChange={(e) => updateParsedItem(item.tempId, { symptoms: e.target.value, why1: e.target.value })}
                          placeholder="ระบุอาการเสียชำรุด..."
                          className="w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      {/* Time, MTTR, Tech, Corrective Action */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">เวลาเริ่มเสีย:</label>
                          <input
                            type="time"
                            value={item.startTime}
                            onChange={(e) => updateParsedItem(item.tempId, { startTime: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-750 rounded-lg px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">เวลาซ่อมเสร็จ:</label>
                          <input
                            type="time"
                            value={item.endTime}
                            onChange={(e) => updateParsedItem(item.tempId, { endTime: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-750 rounded-lg px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">MTTR (นาที):</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={1}
                              value={item.duration}
                              onChange={(e) => updateParsedItem(item.tempId, { duration: Number(e.target.value) || 0 })}
                              className="w-full bg-slate-900 border border-slate-750 rounded-lg px-2 py-1 text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                            />
                            <span className="text-[11px] text-slate-500 shrink-0">น.</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">ช่างผู้รับผิดชอบ:</label>
                          <select
                            value={item.technician}
                            onChange={(e) => updateParsedItem(item.tempId, { technician: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-750 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                          >
                            {technicians.map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Corrective Action inline */}
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">มาตรการแก้ไข / การปฏิบัติงาน:</label>
                        <input
                          type="text"
                          value={item.correctiveAction}
                          onChange={(e) => updateParsedItem(item.tempId, { correctiveAction: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {hasParsed && parsedItems.length === 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center text-slate-400 space-y-2">
              <AlertTriangle size={32} className="mx-auto text-amber-400" />
              <p className="text-sm font-semibold text-slate-200">ไม่สามารถแยกรายการจากข้อความที่ระบุได้</p>
              <p className="text-xs text-slate-400">กรุณาตรวจสอบว่ามีเครื่องหมายขีด (-) นำหน้า หรือระบุชื่อเครื่องและเวลา เช่น &quot;08.48-10.32&quot;</p>
              <button
                type="button"
                onClick={handleLoadSample}
                className="mt-2 px-3 py-1.5 bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-semibold"
              >
                ลองกดโหลดตัวอย่างข้อความ
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
          >
            ยกเลิก
          </button>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              {parsedItems.length > 0 ? (
                <>พร้อมบันทึก: <strong className="text-emerald-400">{parsedItems.length}</strong> รายการ</>
              ) : (
                'ยังไม่มีรายการที่พร้อมนำเข้า'
              )}
            </span>

            <button
              type="button"
              id="btn-confirm-line-import"
              onClick={handleConfirmImport}
              disabled={parsedItems.length === 0}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-md ${
                parsedItems.length > 0
                  ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white cursor-pointer shadow-emerald-600/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-750'
              }`}
            >
              <Check size={16} />
              บันทึกประวัติซ่อมทั้งหมด ({parsedItems.length} รายการ)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
