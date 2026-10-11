import * as XLSX from 'xlsx';
import { PMPlan, PMFrequency, PMStep, Machine } from '../types';
import { normalizeExcelDate } from './excelWorkRequestParser';
import { getTodayDateString } from './pmAlerts';

export const FQMS_SAMPLE_STEPS: PMStep[] = [
  {
    itemNo: 1,
    title: 'ตรวจเช็คสภาพทั่วไป',
    method: 'ดูด้วยสายตา',
    standard: 'โครงสร้างสมบูรณ์ ไม่มีส่วนชำรุด',
    frequency: '1 เดือน/ครั้ง',
    stdTime: 5,
    remark: ''
  },
  {
    itemNo: 2,
    title: 'ตรวจวัดค่าแรงดัน',
    method: 'เครื่องมือวัด',
    standard: 'แรงดันไฟฟ้าอยู่ในช่วง 342-418V. (บันทึกค่าที่วัดได้)',
    frequency: '1 เดือน/ครั้ง',
    stdTime: 5,
    remark: ''
  },
  {
    itemNo: 3,
    title: 'ตรวจเช็คระบบกราวด์',
    method: 'เครื่องมือวัด',
    standard: 'กระแสไฟฟ้ามอเตอร์ ไม่เกิน 1.0 A (บันทึกค่าที่วัดได้)',
    frequency: '1 เดือน/ครั้ง',
    stdTime: 5,
    remark: ''
  },
  {
    itemNo: 4,
    title: 'ขันย้ำน็อตขั้วสายไฟและSocketภายในชุดคอนโทรล',
    method: 'เครื่องมือ',
    standard: 'จุดยึดต่อระบบไฟต้องแน่น ไม่หลวม รวมถึง Power Plug ตัวผู้',
    frequency: '1 เดือน/ครั้ง',
    stdTime: 10,
    remark: ''
  },
  {
    itemNo: 5,
    title: 'ตรวจเช็คสภาพมอเตอร์ In Feed',
    method: 'ดูด้วยสายตา',
    standard: '5.1 สภาพสมบูรณ์ | 5.2 ไม่มีสนิม | 5.3 ไม่มีส่วนชำรุด พร้อมขันแน่นฐานยึด',
    frequency: '1 เดือน/ครั้ง',
    stdTime: 5,
    remark: ''
  },
  {
    itemNo: 6,
    title: 'ตรวจเช็คสภาพมอเตอร์ แบ่งเลน',
    method: 'ดูด้วยสายตา',
    standard: '6.1 สภาพสมบูรณ์ | 6.2 ไม่มีสนิม | 6.3 ไม่มีส่วนชำรุด พร้อมขันแน่นฐานยึด',
    frequency: '1 เดือน/ครั้ง',
    stdTime: 5,
    remark: ''
  },
  {
    itemNo: 7,
    title: 'ตรวจเช็คสภาพมอเตอร์ Out Feed',
    method: 'ดูด้วยสายตา',
    standard: '7.1 สภาพสมบูรณ์ | 7.2 ไม่มีสนิม | สภาพสมบูรณ์ พร้อมใช้งาน',
    frequency: '1 เดือน/ครั้ง',
    stdTime: 5,
    remark: ''
  },
  {
    itemNo: 8,
    title: 'ตรวจเช็คสภาพมอเตอร์ ม้วนฟิมส์หน้า',
    method: 'ดูด้วยสายตา',
    standard: '8.1 สภาพสมบูรณ์ | 8.2 ไม่มีสนิม | 8.3 ไม่มีส่วนชำรุด พร้อมขันแน่นฐานยึด',
    frequency: '1 เดือน/ครั้ง',
    stdTime: 5,
    remark: ''
  },
  {
    itemNo: 9,
    title: 'ตรวจเช็คสภาพมอเตอร์ ม้วนฟิมส์หลัง',
    method: 'ดูด้วยสายตา',
    standard: '9.1 สภาพสมบูรณ์ | 9.2 ไม่มีสนิม | 9.3 ไม่มีส่วนชำรุด พร้อมขันแน่นฐานยึด',
    frequency: '1 เดือน/ครั้ง',
    stdTime: 5,
    remark: ''
  },
  {
    itemNo: 10,
    title: 'ตรวจเช็คสภาพมอเตอร์ ฟีดฟิมส์',
    method: 'ดูด้วยสายตา',
    standard: '10.1 สภาพสมบูรณ์ | 10.2 ไม่มีสนิม',
    frequency: '1 เดือน/ครั้ง',
    stdTime: 5,
    remark: ''
  },
  {
    itemNo: 11,
    title: 'ตรวจเช็คสภาพมอเตอร์เกียร์ Top',
    method: 'ดูด้วยสายตา',
    standard: '11.1 สภาพสมบูรณ์ | 11.2 ไม่มีสนิม | 11.3 ไม่มีส่วนชำรุด พร้อมขันแน่นฐานยึด',
    frequency: '1 เดือน/ครั้ง',
    stdTime: 5,
    remark: ''
  },
  {
    itemNo: 12,
    title: 'ตรวจเช็คสภาพสายลมและรอยต่อภายในเครื่อง',
    method: 'เครื่องมือวัด',
    standard: 'สภาพสมบูรณ์ ไม่มีลมรั่ว',
    frequency: '1 เดือน/ครั้ง',
    stdTime: 5,
    remark: ''
  },
  {
    itemNo: 13,
    title: 'ตรวจเช็คสภาพสายพานลำเลียงทุกจุด',
    method: 'ดูด้วยสายตา',
    standard: 'มีสภาพสมบูรณ์ ไม่หย่อน ขาด ฉีก',
    frequency: '1 เดือน/ครั้ง',
    stdTime: 5,
    remark: ''
  },
  {
    itemNo: 14,
    title: 'ตรวจสอบแกนฟิมส์ หน้า-หลัง',
    method: 'มือ สายตา',
    standard: 'สภาพสมบูรณ์ ไม่มีลมรั่ว',
    frequency: '1 เดือน/ครั้ง',
    stdTime: 5,
    remark: ''
  },
  {
    itemNo: 15,
    title: 'ตรวจสอบสภาพ โมลบน-โมลล่าง',
    method: 'มือ สายตา',
    standard: 'สภาพสมบูรณ์ สะอาดไม่มีคราบสกปรกติด',
    frequency: '1 เดือน/ครั้ง',
    stdTime: 10,
    remark: ''
  },
  {
    itemNo: 16,
    title: 'ตรวจสอบสภาพใบมีด และ Seal Plate',
    method: 'มือ สายตา',
    standard: 'สภาพสมบูรณ์ สะอาดไม่มีคราบสกปรกติด',
    frequency: '1 เดือน/ครั้ง',
    stdTime: 10,
    remark: ''
  },
  {
    itemNo: 17,
    title: 'ตรวจสอบสภาพแขวนรับถาด',
    method: 'มือ สายตา',
    standard: 'สภาพสมบูรณ์ ไม่เสียรูป',
    frequency: '1 เดือน/ครั้ง',
    stdTime: 5,
    remark: ''
  },
  {
    itemNo: 18,
    title: 'อัดจารบีลูกปืน หล่อลื่นเกลียวเสาปรับโมลล่าง',
    method: 'มือ สายตา เครื่องมือ',
    standard: 'จุดหมุนไม่มีเสียงดัง',
    frequency: '1 เดือน/ครั้ง',
    stdTime: 15,
    remark: ''
  },
  {
    itemNo: 19,
    title: 'ทำความสะอาดภายใน ตู้คอนโทรล รวมถึงหน้าจอ เครื่องปริ้น',
    method: 'มือ สายตา',
    standard: 'สะอาดไม่มีคราบสกปรก',
    frequency: '1 เดือน/ครั้ง',
    stdTime: 10,
    remark: ''
  },
  {
    itemNo: 20,
    title: 'Overhaul โมลชุดบนพร้อมตรวจสอบ Heater',
    method: 'มือ สายตา เครื่องมือ',
    standard: 'พร้อมใช้งาน รอบ กุมภาพันธ์ สิงหาคม',
    frequency: '6 เดือน/ครั้ง',
    stdTime: 60,
    remark: 'รอบ กุมภาพันธ์ สิงหาคม'
  },
  {
    itemNo: 21,
    title: 'ทดสอบการทำงานของเครื่องจักร',
    method: 'ประสาทสัมผัสทั้ง 5',
    standard: '21.1 มอเตอร์ทำงานปกติไม่มีเสียงดัง ทุกจุด | 21.2 โครงสร้างไม่สั่นสะเทือน | 21.3 หัวพิมพ์ทำงานปกติ (สีเข้ม ตัวหนังสือชัด) | 21.4 ความร้อนที่เครื่องปกติไม่แกว่ง | 21.5 บันทึก Cycle การทำงาน | 21.6 ทดสอบ Sensor Safety 6 จุด | 21.7 ปุ่ม Emergency ทำงานปกติ | 21.8 ตรวจวัดอุณหภูมิ Surface ไม่เกิน 140 องศา',
    frequency: '1 เดือน/ครั้ง',
    stdTime: 20,
    remark: ''
  }
];

export interface ParsedPMFileResult {
  docCode?: string;
  revision?: string;
  effectiveDate?: string;
  machineId?: string;
  machineName?: string;
  planTitle?: string;
  frequency: PMFrequency;
  spareParts?: string;
  steps: PMStep[];
  ttm: number;
  warnings: string[];
}

export interface ParsedPMPlanItem {
  tempId: string;
  machineId: string;
  machineName: string;
  location?: string;
  lineGroup?: string;
  machineRank?: 'A' | 'B' | 'C' | string; // Rank เครื่องจักร (เช่น 1 (A), 2 (B), 3 (C))
  detectedRankParen?: string; // ตัวเลข/ข้อความในวงเล็บ เช่น "(1)", "(2)", "(3)"
  detectedRankNum?: 1 | 2 | 3; // 1, 2, 3
  title: string;
  frequency: PMFrequency;
  scheduledDate?: string; // YYYY-MM-DD
  steps: PMStep[];
  spareParts?: string;
  ttm: number;
  docCode?: string;
  revision?: string;
  effectiveDate?: string;
  signTech?: string;
  signProd?: string;
  signLeader?: string;
  notes?: string;
  mappingStatus: 'exact' | 'fuzzy' | 'unmapped';
  originalMachineCode?: string;
  originalMachineName?: string;
  originalLocation?: string;
}

export interface MultiParsedPMResult {
  mode: 'master_table' | 'fqms_doc';
  plans: ParsedPMPlanItem[];
  sheetNames: string[];
  selectedSheet: string;
  totalRows: number;
  warnings: string[];
}

/**
 * Extracts Rank from text containing parentheses like "(1)", "(2)", "(3)", "(A)", "(B)", "(C)", [1], [2], [3]
 * and cleans the text to allow 100% accurate machine code and name matching.
 */
export function extractRankAndCleanText(rawText: string): {
  cleanText: string;
  detectedRank: 'A' | 'B' | 'C' | null;
  detectedRankNum: 1 | 2 | 3 | null;
  rawParenValue: string | null;
  displayRank: string | null;
} {
  if (!rawText) {
    return { cleanText: '', detectedRank: null, detectedRankNum: null, rawParenValue: null, displayRank: null };
  }

  // Regex matching parentheses containing numbers or letters: (1), (2), [1], (A), (B), (C)
  const match = rawText.match(/[\(\[\{]\s*([0-9]+|[A-Za-z]+)\s*[\)\]\}]/);
  if (match) {
    const val = match[1].trim().toUpperCase();
    const cleanText = rawText.replace(/[\(\[\{]\s*([0-9]+|[A-Za-z]+)\s*[\)\]\}]/g, '').trim();
    let detectedRank: 'A' | 'B' | 'C' | null = null;
    let detectedRankNum: 1 | 2 | 3 | null = null;
    let displayRank: string | null = null;

    if (val === '1' || val === 'A' || val.includes('1') || val === 'วิกฤต') {
      detectedRank = 'A';
      detectedRankNum = 1;
      displayRank = 'Rank 1 (A - วิกฤต)';
    } else if (val === '2' || val === 'B' || val.includes('2') || val === 'สำคัญ') {
      detectedRank = 'B';
      detectedRankNum = 2;
      displayRank = 'Rank 2 (B - สำคัญ)';
    } else if (val === '3' || val === 'C' || val.includes('3') || val === 'ทั่วไป') {
      detectedRank = 'C';
      detectedRankNum = 3;
      displayRank = 'Rank 3 (C - ทั่วไป)';
    } else {
      const num = parseInt(val, 10);
      if (num === 1) {
        detectedRank = 'A';
        detectedRankNum = 1;
        displayRank = 'Rank 1 (A)';
      } else if (num === 2) {
        detectedRank = 'B';
        detectedRankNum = 2;
        displayRank = 'Rank 2 (B)';
      } else if (num >= 3) {
        detectedRank = 'C';
        detectedRankNum = 3;
        displayRank = `Rank ${num} (C)`;
      }
    }

    return {
      cleanText,
      detectedRank,
      detectedRankNum,
      rawParenValue: `(${val})`,
      displayRank
    };
  }

  return { cleanText: rawText.trim(), detectedRank: null, detectedRankNum: null, rawParenValue: null, displayRank: null };
}

/**
 * Smart Mapping: matches raw Excel machine code, name, or location to the app's existing machines,
 * extracting machine Rank from parenthesized numbers like (1), (2), (3) or dedicated rank values.
 */
export function matchMachineFromDatabase(
  rawCode: string,
  rawName: string,
  rawLocation: string,
  machines: Machine[],
  explicitRank?: string
): {
  matchedId: string;
  matchedName: string;
  matchedLineGroup: string;
  status: 'exact' | 'fuzzy' | 'unmapped';
  detectedRank: 'A' | 'B' | 'C';
  detectedRankNum: 1 | 2 | 3;
  rawParenRank: string | null;
} {
  // 1. Extract Rank from parentheses in Code and Name
  const codeRankInfo = extractRankAndCleanText(rawCode || '');
  const nameRankInfo = extractRankAndCleanText(rawName || '');
  const explicitRankInfo = extractRankAndCleanText(explicitRank || '');

  const cleanCode = codeRankInfo.cleanText;
  const cleanName = nameRankInfo.cleanText;
  const cleanLoc = (rawLocation || '').trim();

  // Determine detected rank from parentheses or explicit column
  let detectedRank: 'A' | 'B' | 'C' = 'B';
  let detectedRankNum: 1 | 2 | 3 = 2;
  let rawParenRank: string | null = null;

  if (codeRankInfo.detectedRank) {
    detectedRank = codeRankInfo.detectedRank;
    detectedRankNum = codeRankInfo.detectedRankNum || 2;
    rawParenRank = codeRankInfo.rawParenValue;
  } else if (nameRankInfo.detectedRank) {
    detectedRank = nameRankInfo.detectedRank;
    detectedRankNum = nameRankInfo.detectedRankNum || 2;
    rawParenRank = nameRankInfo.rawParenValue;
  } else if (explicitRankInfo.detectedRank) {
    detectedRank = explicitRankInfo.detectedRank;
    detectedRankNum = explicitRankInfo.detectedRankNum || 2;
    rawParenRank = explicitRankInfo.rawParenValue || `(${explicitRank})`;
  } else if (explicitRank) {
    const norm = explicitRank.trim().toUpperCase();
    if (norm === '1' || norm === 'A' || norm.includes('1') || norm.includes('วิกฤต')) {
      detectedRank = 'A';
      detectedRankNum = 1;
      rawParenRank = `(${norm})`;
    } else if (norm === '2' || norm === 'B' || norm.includes('2') || norm.includes('สำคัญ')) {
      detectedRank = 'B';
      detectedRankNum = 2;
      rawParenRank = `(${norm})`;
    } else if (norm === '3' || norm === 'C' || norm.includes('3') || norm.includes('ทั่วไป')) {
      detectedRank = 'C';
      detectedRankNum = 3;
      rawParenRank = `(${norm})`;
    }
  }

  const applyMachineRankFallback = (m?: Machine) => {
    if (!rawParenRank && m?.ranking) {
      const r = String(m.ranking).trim().toUpperCase();
      if (r === '1' || r === 'A' || r.includes('1') || r.includes('วิกฤต')) {
        detectedRank = 'A';
        detectedRankNum = 1;
      } else if (r === '2' || r === 'B' || r.includes('2') || r.includes('สำคัญ')) {
        detectedRank = 'B';
        detectedRankNum = 2;
      } else if (r === '3' || r === 'C' || r.includes('3') || r.includes('ทั่วไป')) {
        detectedRank = 'C';
        detectedRankNum = 3;
      }
    }
  };

  if (!machines || machines.length === 0) {
    return {
      matchedId: cleanCode || 'ATS01',
      matchedName: cleanName || 'เครื่องจักร',
      matchedLineGroup: cleanLoc || 'ไลน์ผลิตทั่วไป',
      status: 'unmapped',
      detectedRank,
      detectedRankNum,
      rawParenRank
    };
  }

  // 1. Exact ID match (case-insensitive)
  if (cleanCode) {
    const exact = machines.find(m => m.id.toUpperCase() === cleanCode.toUpperCase());
    if (exact) {
      applyMachineRankFallback(exact);
      return {
        matchedId: exact.id,
        matchedName: exact.name,
        matchedLineGroup: exact.lineGroup || exact.location || 'Line 2',
        status: 'exact',
        detectedRank,
        detectedRankNum,
        rawParenRank
      };
    }

    // 2. Alphanumeric stripped match (e.g. "ATS-01" vs "ATS01")
    const strippedCode = cleanCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const strippedMatch = machines.find(m => m.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === strippedCode);
    if (strippedMatch) {
      applyMachineRankFallback(strippedMatch);
      return {
        matchedId: strippedMatch.id,
        matchedName: strippedMatch.name,
        matchedLineGroup: strippedMatch.lineGroup || strippedMatch.location || 'Line 2',
        status: 'exact',
        detectedRank,
        detectedRankNum,
        rawParenRank
      };
    }
  }

  // 3. Name Match
  if (cleanName) {
    const exactName = machines.find(m => m.name.toLowerCase() === cleanName.toLowerCase());
    if (exactName) {
      applyMachineRankFallback(exactName);
      return {
        matchedId: exactName.id,
        matchedName: exactName.name,
        matchedLineGroup: exactName.lineGroup || exactName.location || 'Line 2',
        status: 'exact',
        detectedRank,
        detectedRankNum,
        rawParenRank
      };
    }

    const subName = machines.find(m => 
      m.name.toLowerCase().includes(cleanName.toLowerCase()) || 
      cleanName.toLowerCase().includes(m.name.toLowerCase())
    );
    if (subName) {
      applyMachineRankFallback(subName);
      return {
        matchedId: subName.id,
        matchedName: subName.name,
        matchedLineGroup: subName.lineGroup || subName.location || 'Line 2',
        status: 'fuzzy',
        detectedRank,
        detectedRankNum,
        rawParenRank
      };
    }
  }

  // 4. Code substring match (e.g. "ATS01 Line 2" contains "ATS01")
  if (cleanCode) {
    const subCode = machines.find(m => 
      cleanCode.toUpperCase().includes(m.id.toUpperCase()) || 
      m.id.toUpperCase().includes(cleanCode.toUpperCase())
    );
    if (subCode) {
      applyMachineRankFallback(subCode);
      return {
        matchedId: subCode.id,
        matchedName: subCode.name,
        matchedLineGroup: subCode.lineGroup || subCode.location || 'Line 2',
        status: 'fuzzy',
        detectedRank,
        detectedRankNum,
        rawParenRank
      };
    }
  }

  // 5. Line / Location match
  if (cleanLoc) {
    const locMatch = machines.find(m => 
      (m.lineGroup && m.lineGroup.toLowerCase().includes(cleanLoc.toLowerCase())) ||
      (m.location && m.location.toLowerCase().includes(cleanLoc.toLowerCase()))
    );
    if (locMatch) {
      applyMachineRankFallback(locMatch);
      return {
        matchedId: locMatch.id,
        matchedName: locMatch.name,
        matchedLineGroup: locMatch.lineGroup || locMatch.location || 'Line 2',
        status: 'fuzzy',
        detectedRank,
        detectedRankNum,
        rawParenRank
      };
    }
  }

  // 6. Unmapped fallback: keep original text
  return {
    matchedId: cleanCode || machines[0]?.id || 'ATS01',
    matchedName: cleanName || 'เครื่องจักร',
    matchedLineGroup: cleanLoc || 'ไลน์ผลิตทั่วไป',
    status: 'unmapped',
    detectedRank,
    detectedRankNum,
    rawParenRank
  };
}

/**
 * Downloads a pre-formatted Excel template compliant with F-QMS-011/12
 */
export function downloadPMTemplateExcel(customMachineId?: string, customMachineName?: string) {
  const wb = XLSX.utils.book_new();

  // Create header rows matching F-QMS-011/12
  const data = [
    ['ชื่อเอกสาร :', 'ใบรายงาน Preventive Maintenance (PM)', '', '', '', 'รหัสเอกสาร :', 'F-QMS-011/12'],
    ['', '', '', '', '', 'แก้ไขครั้งที่ :', '00'],
    ['', '', '', '', '', 'วันที่เริ่มใช้ :', '16-07-2019'],
    ['ชื่อเครื่องจักร :', customMachineName || 'เครื่อง AUTOMATIC TOPSEAL', 'รหัสเครื่องจักร :', customMachineId || 'ATS01 Line 2', '', 'วันที่ทำ PM :', ''],
    [''],
    ['ลำดับ', 'หัวข้อ PM', 'วิธีการ', 'มาตรฐาน', 'ความถี่', 'เวลามาตรฐาน(นาที)', 'หมายเหตุ']
  ];

  // Append sample steps
  FQMS_SAMPLE_STEPS.forEach((s) => {
    data.push([
      String(s.itemNo || ''),
      s.title,
      s.method || 'ดูด้วยสายตา',
      s.standard || 'สภาพสมบูรณ์',
      s.frequency || '1 เดือน/ครั้ง',
      String(s.stdTime || 10),
      s.remark || ''
    ]);
  });

  // Footer signatures
  data.push(['']);
  data.push(['ผู้ทำการ PM :', '................................................ ทีมช่าง', '', 'ผู้รับทราบทำการ PM :', '................................................ ฝ่ายผลิต']);
  data.push(['ผู้ตรวจสอบทำการ PM :', '................................................ หัวหน้าหน่วย PM', '', '', '']);

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  ws['!cols'] = [
    { wch: 8 },  // ลำดับ
    { wch: 38 }, // หัวข้อ PM
    { wch: 22 }, // วิธีการ
    { wch: 55 }, // มาตรฐาน
    { wch: 18 }, // ความถี่
    { wch: 18 }, // เวลามาตรฐาน
    { wch: 25 }  // หมายเหตุ
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'PM_Plan_F-QMS-011-12');
  XLSX.writeFile(wb, `Template_PM_FQMS_011_12_${customMachineId || 'ATS01'}.xlsx`);
}

/**
 * Parses an Excel or CSV file buffer and returns structured PM plan data
 */
export function parsePMExcelBuffer(buffer: ArrayBuffer | Uint8Array | string): ParsedPMFileResult {
  const wb = typeof buffer === 'string' 
    ? XLSX.read(buffer, { type: 'string' })
    : XLSX.read(buffer, { type: 'array' });

  const firstSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheetName];
  if (!ws) {
    throw new Error('ไม่พบแผ่นงาน (Sheet) ในไฟล์ Excel นี้');
  }

  // Convert to 2D array of strings
  const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  let docCode = 'F-QMS-011/12';
  let revision = '00';
  let effectiveDate = '16-07-2019';
  let detectedMachineId = '';
  let detectedMachineName = '';
  let planTitle = '';
  let frequency: PMFrequency = 'รายเดือน';
  const warnings: string[] = [];

  // 1. Scan metadata in first 8 rows
  const maxScanRows = Math.min(rawRows.length, 10);
  for (let r = 0; r < maxScanRows; r++) {
    const row = rawRows[r];
    if (!row) continue;
    const rowStr = row.map(c => String(c || '').trim()).join(' ');

    // Scan docCode
    if (rowStr.includes('F-QMS') || rowStr.includes('รหัสเอกสาร')) {
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || '').trim();
        if (val.includes('F-QMS')) {
          docCode = val;
        } else if (val === 'รหัสเอกสาร :' || val === 'รหัสเอกสาร:') {
          if (row[c + 1]) docCode = String(row[c + 1]).trim();
        }
      }
    }

    // Scan revision
    if (rowStr.includes('แก้ไขครั้งที่')) {
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || '').trim();
        if (val.includes('แก้ไขครั้งที่') && row[c + 1]) {
          revision = String(row[c + 1]).trim();
        }
      }
    }

    // Scan effective date
    if (rowStr.includes('วันที่เริ่มใช้')) {
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || '').trim();
        if (val.includes('วันที่เริ่มใช้') && row[c + 1]) {
          effectiveDate = String(row[c + 1]).trim();
        }
      }
    }

    // Scan machine name & ID
    if (rowStr.includes('ชื่อเครื่องจักร') || rowStr.includes('รหัสเครื่องจักร') || rowStr.includes('เครื่องจักร')) {
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || '').trim();
        if (val.includes('ชื่อเครื่องจักร') && row[c + 1]) {
          detectedMachineName = String(row[c + 1]).trim();
        }
        if (val.includes('รหัสเครื่องจักร') && row[c + 1]) {
          detectedMachineId = String(row[c + 1]).trim();
        }
      }
    }

    // Scan plan title
    if (rowStr.includes('ใบรายงาน Preventive Maintenance') || rowStr.includes('ใบรายงาน PM') || rowStr.includes('Preventive Maintenance')) {
      planTitle = 'ใบรายงาน Preventive Maintenance (PM)';
    }
  }

  // 2. Identify the Table Header row
  let headerRowIndex = -1;
  let colIndexNo = -1;
  let colIndexTitle = -1;
  let colIndexMethod = -1;
  let colIndexStandard = -1;
  let colIndexFrequency = -1;
  let colIndexTime = -1;
  let colIndexRemark = -1;

  for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
    const row = rawRows[r];
    if (!row) continue;

    const rowStrs = row.map(c => String(c || '').trim().toLowerCase());
    
    // Check if this row looks like the table headers
    const hasTopic = rowStrs.some(s => s.includes('หัวข้อ') || s.includes('รายการ') || s.includes('title') || s.includes('item'));
    const hasMethod = rowStrs.some(s => s.includes('วิธี') || s.includes('method'));
    const hasStandard = rowStrs.some(s => s.includes('มาตรฐาน') || s.includes('standard') || s.includes('criteria'));

    if (hasTopic || (hasMethod && hasStandard)) {
      headerRowIndex = r;
      rowStrs.forEach((s, idx) => {
        if (s.includes('ลำดับ') || s === 'no' || s === 'no.') colIndexNo = idx;
        else if (s.includes('หัวข้อ') || s.includes('รายการ') || s.includes('title') || s.includes('item')) colIndexTitle = idx;
        else if (s.includes('วิธี') || s.includes('method')) colIndexMethod = idx;
        else if (s.includes('มาตรฐาน') || s.includes('เกณฑ์') || s.includes('standard') || s.includes('criteria')) colIndexStandard = idx;
        else if (s.includes('ความถี่') || s.includes('frequency') || s.includes('freq')) colIndexFrequency = idx;
        else if (s.includes('เวลา') || s.includes('นาที') || s.includes('time') || s.includes('duration') || s.includes('std')) colIndexTime = idx;
        else if (s.includes('หมายเหตุ') || s.includes('remark') || s.includes('note')) colIndexRemark = idx;
      });
      break;
    }
  }

  // Fallback defaults if header row wasn't cleanly identified
  if (headerRowIndex === -1) {
    headerRowIndex = 0; // Assume row 0
    colIndexNo = 0;
    colIndexTitle = 1;
    colIndexMethod = 2;
    colIndexStandard = 3;
    colIndexFrequency = 4;
    colIndexTime = 5;
    colIndexRemark = 6;
  } else {
    // If some columns weren't matched, provide reasonable fallbacks
    if (colIndexTitle === -1) colIndexTitle = colIndexNo === 0 ? 1 : 0;
    if (colIndexMethod === -1) colIndexMethod = colIndexTitle + 1;
    if (colIndexStandard === -1) colIndexStandard = colIndexMethod + 1;
  }

  // 3. Parse step rows
  const steps: PMStep[] = [];
  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    // Check if row is a footer signature row (e.g. ผู้ทำการ PM)
    const combinedText = row.map(c => String(c || '').trim()).join(' ');
    if (
      combinedText.includes('ผู้ทำการ PM') ||
      combinedText.includes('ผู้รับทราบทำการ PM') ||
      combinedText.includes('ผู้ตรวจสอบทำการ PM') ||
      combinedText.includes('รายการอะไหล่ที่เตรียมแก้ไข')
    ) {
      break; // Stop parsing steps
    }

    const titleVal = colIndexTitle >= 0 ? String(row[colIndexTitle] || '').trim() : '';
    const noVal = colIndexNo >= 0 ? String(row[colIndexNo] || '').trim() : '';
    const methodVal = colIndexMethod >= 0 ? String(row[colIndexMethod] || '').trim() : '';
    const standardVal = colIndexStandard >= 0 ? String(row[colIndexStandard] || '').trim() : '';
    const freqVal = colIndexFrequency >= 0 ? String(row[colIndexFrequency] || '').trim() : '';
    const timeVal = colIndexTime >= 0 ? String(row[colIndexTime] || '').trim() : '';
    const remarkVal = colIndexRemark >= 0 ? String(row[colIndexRemark] || '').trim() : '';

    if (!titleVal && !standardVal) continue; // Skip completely empty rows

    // Parse time
    let mins = 10;
    const matchedMins = timeVal.match(/\d+/);
    if (matchedMins) {
      mins = parseInt(matchedMins[0], 10);
    } else {
      mins = 5; // Default standard inspection time
    }

    // Parse itemNo
    let itemNo: number | string = steps.length + 1;
    if (noVal) {
      const parsedNo = parseInt(noVal, 10);
      itemNo = isNaN(parsedNo) ? noVal : parsedNo;
    }

    steps.push({
      itemNo,
      title: titleVal || `การตรวจเช็คจุดที่ ${itemNo}`,
      method: methodVal || 'ดูด้วยสายตา',
      standard: standardVal || 'สภาพสมบูรณ์ พร้อมใช้งาน',
      frequency: freqVal || '1 เดือน/ครั้ง',
      stdTime: mins,
      remark: remarkVal
    });
  }

  // Detect overall plan frequency from steps or metadata
  const freqTexts = steps.map(s => s.frequency || '').join(' ').toLowerCase();
  if (freqTexts.includes('6 เดือน') || freqTexts.includes('6 month')) {
    // Has semi-annual step
  }
  if (freqTexts.includes('เดือน') || freqTexts.includes('monthly') || freqTexts.includes('1 เดือน')) {
    frequency = 'รายเดือน';
  } else if (freqTexts.includes('สัปดาห์') || freqTexts.includes('weekly')) {
    frequency = 'รายสัปดาห์';
  } else if (freqTexts.includes('วัน') || freqTexts.includes('daily')) {
    frequency = 'รายวัน';
  } else if (freqTexts.includes('ปี') || freqTexts.includes('yearly')) {
    frequency = 'รายปี';
  }

  const calculatedTtm = steps.reduce((sum, s) => sum + s.stdTime, 0);

  if (!planTitle) {
    planTitle = detectedMachineName 
      ? `ใบรายงาน PM - ${detectedMachineName}`
      : 'ใบรายงาน Preventive Maintenance (PM)';
  }

  return {
    docCode,
    revision,
    effectiveDate,
    machineId: detectedMachineId,
    machineName: detectedMachineName,
    planTitle,
    frequency,
    steps,
    ttm: calculatedTtm,
    warnings
  };
}

/**
 * Downloads a multi-row PM Master Plan Table template (.xlsx)
 * Suitable for importing PM plans across multiple machines with dates, locations, frequencies, and steps
 */
export function downloadPMMasterTableTemplateExcel(machines: Machine[] = []) {
  const wb = XLSX.utils.book_new();

  const headers = [
    'ลำดับ',
    'รหัสเครื่องจักร (เช่น ATS01 (1))',
    'ชื่อเครื่องจักร (เช่น เครื่อง AUTOMATIC TOPSEAL (1))',
    'Rank เครื่องจักร (1=วิกฤต, 2=สำคัญ, 3=ทั่วไป)',
    'ตำแหน่ง / ไลน์ผลิต',
    'หัวข้องาน PM / แผนการบำรุงรักษา',
    'ความถี่',
    'วันที่จะทำ PM (วันที่กำหนด)',
    'เวลามาตรฐาน TTM (นาที)',
    'ช่างผู้รับผิดชอบ',
    'รายการอะไหล่ที่ต้องใช้',
    'ขั้นตอนและวิธีการตรวจเช็ค (แยกด้วย ; และ : เวลา)',
    'หมายเหตุ'
  ];

  const sampleRows = [
    [
      '1',
      'ATS01 (1)',
      'เครื่อง AUTOMATIC TOPSEAL (1)',
      '1',
      'Line 2',
      'ตรวจเช็คระบบฮีตเตอร์และใบมีดซีลถาด',
      'รายเดือน',
      getTodayDateString(),
      '60',
      'ช่างอุ้ย',
      'ซีลยาง, ใบมีดตัดฟิล์ม, ลวดฮีตเตอร์สำรอง',
      'ตรวจสอบใบมีดและ Seal Plate:15; ตรวจสอบ Heater และอุณหภูมิ:20; ตรวจเช็คสายพาน In-Out Feed:15; ทดสอบเดินเครื่อง:10',
      'ทำรอบต้นเดือน (เครื่องสำคัญ Rank 1/วิกฤต)'
    ],
    [
      '2',
      'RIM01 (1)',
      'เครื่อง RICE MIXER 01 (1)',
      '1',
      'Rice Room',
      'ตรวจเช็คชุดเกียร์ขับและลูกปืนเพลาผสมข้าว',
      'ราย 3 เดือน',
      getTodayDateString(),
      '90',
      'ช่างโอเว่น',
      'น้ำมันเกียร์สังเคราะห์ Food Grade, ซีลยางเพลา',
      'ตรวจระดับน้ำมันเกียร์:20; อัดจาระบีลูกปืนเพลา:30; ตรวจเช็คใบกวน:20; ทดสอบกระแสไฟ:20',
      'รอบไตรมาส Q4 (Rank 1/A)'
    ],
    [
      '3',
      'BCH01 (2)',
      'เครื่อง BLAST CHILLER (2)',
      '2',
      'Blast Room',
      'ล้างทำความสะอาดคอนเดนเซอร์และเช็คน้ำยาทำความเย็น',
      'รายเดือน',
      getTodayDateString(),
      '45',
      'ช่างเซฟ',
      'ฟิลเตอร์แอร์, น้ำยาทำความสะอาดคอยล์',
      'ล้างคอยล์ร้อนคอนเดนเซอร์:20; ตรวจเช็คแรงดันน้ำยา:15; ตรวจสอบพัดลมระบายความร้อน:10',
      'ก่อนเริ่มผลิตกะเช้า (Rank 2/B)'
    ],
    [
      '4',
      'VEG01 (3)',
      'เครื่อง VEGETABLE WASHER (3)',
      '3',
      'Vegetable Room',
      'ตรวจเช็คปั๊มน้ำวนและระบบเป่าลมสะเด็ดน้ำ',
      'รายสัปดาห์',
      getTodayDateString(),
      '30',
      'ช่างปอ',
      'โอริงปั๊มน้ำ, ซีลกันน้ำ',
      'ตรวจสอบปั๊มน้ำวน:10; ล้างตะแกรงกรองเศษผัก:10; ตรวจเช็คหัวฉีดน้ำ:10',
      'ทุกวันศุกร์ (Rank 3/C)'
    ]
  ];

  const data = [headers, ...sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(data);

  ws['!cols'] = [
    { wch: 6 },  // ลำดับ
    { wch: 22 }, // รหัสเครื่องจักร
    { wch: 34 }, // ชื่อเครื่องจักร
    { wch: 24 }, // Rank เครื่องจักร
    { wch: 20 }, // ตำแหน่ง / ไลน์
    { wch: 42 }, // หัวข้องาน PM
    { wch: 14 }, // ความถี่
    { wch: 22 }, // วันที่จะทำ PM
    { wch: 18 }, // เวลา TTM
    { wch: 16 }, // ช่าง
    { wch: 32 }, // อะไหล่
    { wch: 55 }, // ขั้นตอน
    { wch: 30 }  // หมายเหตุ
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'PM_Master_Plan');
  XLSX.writeFile(wb, `Template_PM_Master_Plan_${getTodayDateString()}.xlsx`);
}

/**
 * Universal Parser: Parses either a Multi-Row Master Table or F-QMS-011/12 Sheet
 * Automatically maps machine codes, names, locations from the app's machines database
 */
export function parsePMExcelMultiMode(
  buffer: ArrayBuffer | Uint8Array | string,
  machines: Machine[],
  targetSheetName?: string
): MultiParsedPMResult {
  const wb = typeof buffer === 'string'
    ? XLSX.read(buffer, { type: 'string' })
    : XLSX.read(buffer, { type: 'array' });

  const sheetNames = wb.SheetNames || [];
  if (sheetNames.length === 0) {
    throw new Error('ไม่พบแผ่นงาน (Sheet) ในไฟล์ Excel นี้');
  }

  const selectedSheet = (targetSheetName && sheetNames.includes(targetSheetName))
    ? targetSheetName
    : sheetNames[0];

  const ws = wb.Sheets[selectedSheet];
  if (!ws) {
    throw new Error(`ไม่พบแผ่นงาน ${selectedSheet} ในไฟล์ Excel`);
  }

  const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const warnings: string[] = [];

  // Check if this sheet is an F-QMS-011/12 document format
  const isFQMS = rawRows.slice(0, 10).some(row => {
    const text = row.map(c => String(c || '').trim()).join(' ');
    return text.includes('F-QMS') || text.includes('ใบรายงาน Preventive Maintenance') || text.includes('ใบรายงาน PM');
  });

  if (isFQMS) {
    // Parse using F-QMS standard parser
    const fqmsResult = parsePMExcelBuffer(buffer);
    
    // Check for schedule date in F-QMS metadata
    let fqmsDate = getTodayDateString();
    for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
      const row = rawRows[r];
      if (!row) continue;
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || '').trim();
        if (val.includes('วันที่ทำ PM') || val.includes('วันที่กำหนด')) {
          if (row[c + 1]) {
            fqmsDate = normalizeExcelDate(row[c + 1]);
          }
        }
      }
    }

    const mapping = matchMachineFromDatabase(
      fqmsResult.machineId || '',
      fqmsResult.machineName || '',
      '',
      machines
    );

    const singlePlan: ParsedPMPlanItem = {
      tempId: `parsed-pm-${Date.now()}-1`,
      machineId: mapping.matchedId,
      machineName: mapping.matchedName,
      location: mapping.matchedLineGroup,
      lineGroup: mapping.matchedLineGroup,
      machineRank: mapping.detectedRank,
      detectedRankParen: mapping.rawParenRank || undefined,
      detectedRankNum: mapping.detectedRankNum,
      title: fqmsResult.planTitle || `ใบรายงาน PM - ${mapping.matchedName}`,
      frequency: fqmsResult.frequency,
      scheduledDate: fqmsDate,
      steps: fqmsResult.steps,
      spareParts: fqmsResult.spareParts || 'จาระบีลูกปืนเกรดอาหาร NSF-H1, ซีลยาง, ใบมีดตัดฟิล์ม, ลวดฮีตเตอร์',
      ttm: fqmsResult.ttm,
      docCode: fqmsResult.docCode || 'F-QMS-011/12',
      revision: fqmsResult.revision || '00',
      effectiveDate: fqmsResult.effectiveDate || '16-07-2019',
      signTech: 'ทีมช่างซ่อมบำรุง',
      signProd: 'ฝ่ายผลิต',
      signLeader: 'หัวหน้าหน่วย PM',
      mappingStatus: mapping.status,
      originalMachineCode: fqmsResult.machineId,
      originalMachineName: fqmsResult.machineName
    };

    return {
      mode: 'fqms_doc',
      plans: [singlePlan],
      sheetNames,
      selectedSheet,
      totalRows: fqmsResult.steps.length,
      warnings: fqmsResult.warnings
    };
  }

  // -------------------------------------------------------------
  // Mode: PM Master Table (Multi-plan tabular format)
  // -------------------------------------------------------------
  let headerRowIndex = -1;
  let colIdxNo = -1;
  let colIdxCode = -1;
  let colIdxName = -1;
  let colIdxLoc = -1;
  let colIdxTitle = -1;
  let colIdxFreq = -1;
  let colIdxDate = -1;
  let colIdxTime = -1;
  let colIdxTech = -1;
  let colIdxSpare = -1;
  let colIdxSteps = -1;
  let colIdxMethod = -1;
  let colIdxStandard = -1;
  let colIdxRemark = -1;
  let colIdxRank = -1;

  for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const rowStrs = row.map(c => String(c || '').trim().toLowerCase());
    
    // Check if this row looks like a table header
    const hasCode = rowStrs.some(s => s.includes('รหัส') || s.includes('code') || s.includes('machine id') || s.includes('เครื่อง'));
    const hasTitle = rowStrs.some(s => s.includes('หัวข้อ') || s.includes('รายการ') || s.includes('title') || s.includes('งาน pm') || s.includes('description'));
    const hasDateOrFreq = rowStrs.some(s => s.includes('วัน') || s.includes('ความถี่') || s.includes('date') || s.includes('freq'));

    if ((hasCode && hasTitle) || (hasTitle && hasDateOrFreq)) {
      headerRowIndex = r;
      rowStrs.forEach((s, idx) => {
        if (s.includes('ลำดับ') || s === 'no' || s === 'no.') colIdxNo = idx;
        else if (s.includes('rank') || s.includes('ระดับ') || s.includes('คลาส') || s.includes('class') || s.includes('ความสำคัญ')) colIdxRank = idx;
        else if (s.includes('รหัส') || s.includes('machine id') || s.includes('asset') || s.includes('code')) colIdxCode = idx;
        else if (s.includes('ชื่อเครื่อง') || s.includes('machine name') || s.includes('เครื่องจักร')) colIdxName = idx;
        else if (s.includes('ตำแหน่ง') || s.includes('ไลน์') || s.includes('line') || s.includes('location') || s.includes('แผนก') || s.includes('area')) colIdxLoc = idx;
        else if (s.includes('หัวข้อ') || s.includes('รายการ') || s.includes('title') || s.includes('งาน pm') || s.includes('description') || s.includes('ชื่องาน')) colIdxTitle = idx;
        else if (s.includes('ความถี่') || s.includes('frequency') || s.includes('freq') || s.includes('รอบ')) colIdxFreq = idx;
        else if (s.includes('วันที่จะทำ') || s.includes('วันที่ทำ') || s.includes('วันที่') || s.includes('date') || s.includes('due') || s.includes('schedule') || s.includes('กำหนด')) colIdxDate = idx;
        else if (s.includes('เวลา') || s.includes('นาที') || s.includes('time') || s.includes('ttm') || s.includes('duration') || s.includes('std')) colIdxTime = idx;
        else if (s.includes('ช่าง') || s.includes('ผู้รับผิดชอบ') || s.includes('tech') || s.includes('assignee')) colIdxTech = idx;
        else if (s.includes('อะไหล่') || s.includes('spare') || s.includes('part')) colIdxSpare = idx;
        else if (s.includes('ขั้นตอน') || s.includes('วิธี') || s.includes('method') || s.includes('steps')) colIdxSteps = idx;
        else if (s.includes('มาตรฐาน') || s.includes('เกณฑ์') || s.includes('standard')) colIdxStandard = idx;
        else if (s.includes('หมายเหตุ') || s.includes('remark') || s.includes('note')) colIdxRemark = idx;
      });
      break;
    }
  }

  // Fallbacks if header wasn't cleanly identified
  if (headerRowIndex === -1) {
    headerRowIndex = 0;
    colIdxCode = 1;
    colIdxTitle = 2;
    colIdxFreq = 3;
    colIdxDate = 4;
    colIdxTime = 5;
  } else {
    if (colIdxCode === -1 && colIdxName >= 0) colIdxCode = colIdxName;
    if (colIdxTitle === -1) colIdxTitle = colIdxCode === 0 ? 1 : 0;
  }

  const parsedPlans: ParsedPMPlanItem[] = [];

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const rowText = row.map(c => String(c || '').trim()).join('');
    if (!rowText) continue; // Skip empty row

    // Extract values
    const rawCode = colIdxCode >= 0 ? String(row[colIdxCode] || '').trim() : '';
    const rawName = colIdxName >= 0 ? String(row[colIdxName] || '').trim() : '';
    const rawRank = colIdxRank >= 0 ? String(row[colIdxRank] || '').trim() : '';
    const rawLoc = colIdxLoc >= 0 ? String(row[colIdxLoc] || '').trim() : '';
    const rawTitle = colIdxTitle >= 0 ? String(row[colIdxTitle] || '').trim() : '';
    const rawFreq = colIdxFreq >= 0 ? String(row[colIdxFreq] || '').trim() : '';
    const rawDate = colIdxDate >= 0 ? row[colIdxDate] : '';
    const rawTime = colIdxTime >= 0 ? row[colIdxTime] : '';
    const rawTech = colIdxTech >= 0 ? String(row[colIdxTech] || '').trim() : '';
    const rawSpare = colIdxSpare >= 0 ? String(row[colIdxSpare] || '').trim() : '';
    const rawSteps = colIdxSteps >= 0 ? String(row[colIdxSteps] || '').trim() : '';
    const rawStandard = colIdxStandard >= 0 ? String(row[colIdxStandard] || '').trim() : '';
    const rawRemark = colIdxRemark >= 0 ? String(row[colIdxRemark] || '').trim() : '';

    if (!rawCode && !rawName && !rawTitle) continue;

    // Smart mapping against app's machines with rank extraction
    const mapping = matchMachineFromDatabase(rawCode, rawName, rawLoc, machines, rawRank);

    // Parse frequency
    let frequency: PMFrequency = 'รายเดือน';
    const freqNorm = rawFreq.toLowerCase();
    if (freqNorm.includes('วัน') || freqNorm.includes('daily')) {
      frequency = 'รายวัน';
    } else if (freqNorm.includes('2 สัปดาห์') || freqNorm.includes('bi-week')) {
      frequency = 'ราย 2 สัปดาห์';
    } else if (freqNorm.includes('สัปดาห์') || freqNorm.includes('weekly')) {
      frequency = 'รายสัปดาห์';
    } else if (freqNorm.includes('3 เดือน') || freqNorm.includes('quarter') || freqNorm.includes('ไตรมาส')) {
      frequency = 'ราย 3 เดือน';
    } else if (freqNorm.includes('6 เดือน') || freqNorm.includes('semi')) {
      frequency = 'ราย 6 เดือน';
    } else if (freqNorm.includes('ปี') || freqNorm.includes('year') || freqNorm.includes('annual')) {
      frequency = 'รายปี';
    } else if (freqNorm.includes('เดือน') || freqNorm.includes('month')) {
      frequency = 'รายเดือน';
    }

    // Parse scheduled date
    let scheduledDate = getTodayDateString();
    if (rawDate) {
      scheduledDate = normalizeExcelDate(rawDate);
    }

    // Parse TTM time
    let ttm = 30;
    if (typeof rawTime === 'number') {
      ttm = Math.max(5, rawTime);
    } else if (typeof rawTime === 'string') {
      const match = rawTime.match(/\d+/);
      if (match) ttm = Math.max(5, parseInt(match[0], 10));
    }

    // Parse steps
    const steps: PMStep[] = [];
    if (rawSteps) {
      // Split by semicolon or newline
      const stepItems = rawSteps.split(/[;\n]/).map(s => s.trim()).filter(s => s.length > 0);
      stepItems.forEach((item, idx) => {
        let stepTitle = item;
        let stepTime = 10;
        let stepStd = rawStandard || 'สภาพสมบูรณ์ พร้อมใช้งาน';

        if (item.includes(':')) {
          const parts = item.split(':');
          stepTitle = parts[0].trim();
          const timeMatch = parts[1].match(/\d+/);
          if (timeMatch) stepTime = parseInt(timeMatch[0], 10);
        }

        steps.push({
          itemNo: idx + 1,
          title: stepTitle,
          method: 'ดูด้วยสายตา / เครื่องมือวัด',
          standard: stepStd,
          frequency: rawFreq || '1 เดือน/ครั้ง',
          stdTime: stepTime,
          remark: ''
        });
      });
    }

    // Fallback standard inspection steps if none parsed
    if (steps.length === 0) {
      steps.push(
        { itemNo: 1, title: rawTitle || 'ตรวจเช็คสภาพทั่วไปและโครงสร้าง', method: 'ดูด้วยสายตา', standard: 'โครงสร้างสมบูรณ์ ไม่มีส่วนชำรุด', frequency: rawFreq || '1 เดือน/ครั้ง', stdTime: Math.max(5, Math.floor(ttm * 0.3)), remark: '' },
        { itemNo: 2, title: 'ตรวจเช็คจุดยึด ข้อต่อ ระบบไฟและสายสัญญาณ', method: 'เครื่องมือวัด/มือ', standard: 'จุดเชื่อมต่อแน่นหนา ไม่หลุดหลวม', frequency: rawFreq || '1 เดือน/ครั้ง', stdTime: Math.max(5, Math.floor(ttm * 0.4)), remark: '' },
        { itemNo: 3, title: 'ทดสอบเดินเครื่องและตรวจวัดการทำงาน', method: 'ประสาทสัมผัสทั้ง 5', standard: 'เครื่องจักรทำงานราบรื่น ไม่มีเสียงดังผิดปกติ', frequency: rawFreq || '1 เดือน/ครั้ง', stdTime: Math.max(5, Math.floor(ttm * 0.3)), remark: '' }
      );
    }

    const calculatedTtm = steps.reduce((sum, s) => sum + s.stdTime, 0);

    parsedPlans.push({
      tempId: `parsed-pm-${Date.now()}-${r}`,
      machineId: mapping.matchedId,
      machineName: mapping.matchedName,
      location: mapping.matchedLineGroup,
      lineGroup: mapping.matchedLineGroup,
      machineRank: mapping.detectedRank,
      detectedRankParen: mapping.rawParenRank || (rawRank ? `(${rawRank})` : undefined),
      detectedRankNum: mapping.detectedRankNum,
      title: rawTitle || `แผนงาน PM - ${mapping.matchedName}`,
      frequency,
      scheduledDate,
      steps,
      spareParts: rawSpare || 'อะไหล่สิ้นเปลืองทั่วไป, จาระบี Food Grade',
      ttm: calculatedTtm || ttm,
      docCode: 'F-QMS-011/12',
      revision: '00',
      effectiveDate: '16-07-2019',
      signTech: rawTech || 'ทีมช่างซ่อมบำรุง',
      signProd: 'ฝ่ายผลิต',
      signLeader: 'หัวหน้าหน่วย PM',
      notes: rawRemark,
      mappingStatus: mapping.status,
      originalMachineCode: rawCode,
      originalMachineName: rawName,
      originalLocation: rawLoc
    });
  }

  return {
    mode: 'master_table',
    plans: parsedPlans,
    sheetNames,
    selectedSheet,
    totalRows: parsedPlans.length,
    warnings
  };
}

