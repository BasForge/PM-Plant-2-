import * as XLSX from 'xlsx';
import { PMPlan, PMFrequency, PMStep } from '../types';

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
