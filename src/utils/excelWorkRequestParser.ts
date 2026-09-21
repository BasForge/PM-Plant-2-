import * as XLSX from 'xlsx';
import { Machine, WorkRequestPriority, WorkRequestStatus } from '../types';
import { getTodayDateString } from './pmAlerts';

export interface ParsedWorkRequestItem {
  tempId: string;
  sequenceNo?: number; // ลำดับที่ เช่น 1, 2, 3...
  ticketNo?: string; // เลขที่แจ้งซ่อม e.g. "167311"
  machineId: string;
  machineName: string;
  lineGroup: string;
  locationPoint: string;
  priority: WorkRequestPriority;
  problemTitle: string;
  problemDetails: string;
  productionDepartment: string;
  requesterName: string;
  requesterPhone: string;
  requestDate: string; // YYYY-MM-DD
  requestTime: string; // HH:MM
  status?: WorkRequestStatus;
  rawStatus?: string; // e.g. "เปิดงาน", "รออนุมัติ", "ปิดงาน"
  isMachineFound: boolean;
  rawText?: string;
  sourceFileName?: string;
  sourceRowIndex?: number;
}

export interface ExcelParseWorkRequestResult {
  items: ParsedWorkRequestItem[];
  fileName: string;
  sheetNames: string[];
  totalFound: number;
  warnings?: string[];
}

/**
 * Normalizes date string into YYYY-MM-DD format
 * Supports Thai BE years (2560-2575) and CE years (2020-2035), as well as Excel serial dates
 */
export function normalizeExcelDate(val: any): string {
  if (!val) return getTodayDateString();

  // Excel serial number (e.g. 45550)
  if (typeof val === 'number') {
    try {
      const dateObj = XLSX.SSF.parse_date_code(val);
      if (dateObj) {
        const y = dateObj.y;
        const m = String(dateObj.m).padStart(2, '0');
        const d = String(dateObj.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch {
      // Fallback
    }
  }

  const dateStr = String(val).trim().replace(/[.]/g, '/').replace(/[-]/g, '/');

  // DD/MM/YYYY or M/D/YYYY or YYYY/MM/DD
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    let p1 = parseInt(parts[0], 10);
    let p2 = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);

    if (p1 > 1900) {
      // YYYY/MM/DD
      const temp = p1;
      p1 = year;
      year = temp;
    }

    if (year > 2500) {
      year -= 543; // Convert Thai BE to CE
    }

    let day = p1;
    let month = p2;
    // Typical Thai ERP date like 9/1/2569 -> month 9, day 1 or day 9, month 1
    if (p1 <= 12 && p2 <= 31 && p1 === 9) {
      month = p1;
      day = p2;
    } else if (p1 > 12 && p2 <= 12) {
      day = p1;
      month = p2;
    }

    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      const dStr = String(day).padStart(2, '0');
      const mStr = String(month).padStart(2, '0');
      return `${year}-${mStr}-${dStr}`;
    }
  }

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  return getTodayDateString();
}

/**
 * Normalizes time value to HH:MM format
 */
export function normalizeExcelTime(val: any): string {
  if (val === undefined || val === null || val === '') {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  // Excel time fraction (e.g. 0.434 -> 10:25)
  if (typeof val === 'number') {
    const totalMinutes = Math.round(val * 24 * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  const str = String(val).trim().replace('.', ':');
  const match = str.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const hh = match[1].padStart(2, '0');
    const mm = match[2];
    return `${hh}:${mm}`;
  }

  return '09:00';
}

/**
 * Maps raw status from document/table to WorkRequestStatus
 */
export function mapRawStatusToWorkRequestStatus(rawStatus: string): WorkRequestStatus {
  if (!rawStatus) return 'รอตอบรับ';
  const clean = rawStatus.trim();
  if (clean.includes('ปิดงาน') || clean.includes('เสร็จ') || clean.includes('สำเร็จ') || clean.includes('Completed')) {
    return 'ปิดงานสมบูรณ์';
  }
  if (clean.includes('กำลัง') || clean.includes('ดำเนินการ') || clean.includes('กำลังซ่อม') || clean.includes('In Progress')) {
    return 'กำลังดำเนินการซ่อม';
  }
  if (clean.includes('อะไหล่') || clean.includes('รอของ') || clean.includes('Waiting Spare Part')) {
    return 'รออะไหล่/สั่งของ';
  }
  if (clean.includes('ตอบรับ') || clean.includes('อนุมัติ') || clean.includes('มีแผน') || clean.includes('Scheduled') || clean.includes('Accepted')) {
    return 'ตอบรับแล้ว/มีแผนงาน';
  }
  // "เปิดงาน", "รออนุมัติ", "ใหม่", "Pending"
  return 'รอตอบรับ';
}

/**
 * Detects Priority from text or string
 */
export function detectPriorityFromText(text: string): WorkRequestPriority {
  const lower = (text || '').toLowerCase();
  if (
    lower.includes('ฉุกเฉิน') || 
    lower.includes('หยุดสาย') || 
    lower.includes('หยุดผลิต') || 
    lower.includes('emergency') || 
    lower.includes('critical') ||
    lower.includes('ด่วนที่สุด')
  ) {
    return 'ฉุกเฉินไลน์หยุด';
  }

  if (
    lower.includes('ด่วนมาก') || 
    lower.includes('ด่วน') || 
    lower.includes('เร่งด่วน') ||
    lower.includes('urgent') || 
    lower.includes('high')
  ) {
    return 'เร่งด่วน';
  }

  if (
    lower.includes('แผน') || 
    lower.includes('นัด') || 
    lower.includes('ไม่กระทบ') || 
    lower.includes('กะหยุด') || 
    lower.includes('medium') ||
    lower.includes('รอรอบหยุด')
  ) {
    return 'ตามแผนนัดหมาย';
  }

  return 'ปกติ';
}

/**
 * Finds a machine by ID or query in the machine registry
 */
export function findMatchingMachine(idOrQuery: string, machines: Machine[]): Machine | undefined {
  if (!idOrQuery) return undefined;
  const clean = idOrQuery.trim().toUpperCase().replace(/[-_\s]/g, '');
  
  // 1. Exact match
  const exact = machines.find(m => m.id.toUpperCase().replace(/[-_\s]/g, '') === clean);
  if (exact) return exact;

  // 2. Partial match in ID
  const partial = machines.find(m => {
    const mClean = m.id.toUpperCase().replace(/[-_\s]/g, '');
    return mClean === clean || mClean.includes(clean) || clean.includes(mClean);
  });
  if (partial) return partial;

  // 3. Match by machine name
  const nameMatch = machines.find(m => 
    m.name.toLowerCase().includes(idOrQuery.trim().toLowerCase())
  );
  return nameMatch;
}

// Sample work requests for quick test
export const SAMPLE_EXCEL_WORK_REQUESTS: ParsedWorkRequestItem[] = [
  {
    tempId: 'sample-wr-1',
    sequenceNo: 1,
    ticketNo: '167311',
    machineId: 'BAN01',
    machineName: 'BANDING (TXL32-20-62)',
    lineGroup: 'ฝ่ายขึ้นรูป - ข้าวกล่อง',
    locationPoint: 'จุดป้อนกล่องเข้าเครื่อง Banding Line 1',
    priority: 'ฉุกเฉินไลน์หยุด',
    problemTitle: 'แจ้งส่งเทอร์โมเครื่อง banding ลงข้าวกล่อง ปลั๊กหลวมและอุณหภูมิตก',
    problemDetails: 'แจ้งส่งเทอร์โมเครื่อง banding ลงข้าวกล่อง ปลั๊กหลวมและอุณหภูมิตก ส่งผลให้ซีลสายรัดไม่ติด ข้าวกล่องหลุดออกจากแพ็ค ขอช่างเข้าแก้ไขด่วน',
    productionDepartment: '542107 ฝ่ายขึ้นรูป - ข้าวกล่อง',
    requesterName: 'จุฑามาศ',
    requesterPhone: '089-123-4567',
    requestDate: '2026-09-14',
    requestTime: '10:21',
    status: 'รอตอบรับ',
    rawStatus: 'เปิดงาน',
    isMachineFound: true,
    sourceFileName: 'ตัวอย่างใบแจ้งซ่อม_CPRAM_Plant2.xlsx'
  },
  {
    tempId: 'sample-wr-2',
    sequenceNo: 2,
    ticketNo: '167312',
    machineId: 'ATS03',
    machineName: 'AUTOMATIC TOPSEAL Line 3',
    lineGroup: 'TOP SEALING ROOM',
    locationPoint: 'ชุดหัวซีลฮีตเตอร์ตัดฟิล์ม Station 2',
    priority: 'ฉุกเฉินไลน์หยุด',
    problemTitle: 'ซีลไม่สนิท ฟิล์มตัดไม่ขาด มีเสียงกระแทกจากกระบอกลม',
    problemDetails: 'ซีลไม่สนิท ฟิล์มตัดไม่ขาด มีเสียงกระแทกจากกระบอกลมหัวตัด อุณหภูมิหน้าจอแกว่ง 135-155 C เกิดฟองอากาศบนขอบถ้วย',
    productionDepartment: '542108 ฝ่ายบรรจุและซีลถ้วย',
    requesterName: 'สมศรี',
    requesterPhone: '081-998-1234 (ต่อ 1402)',
    requestDate: '2026-09-14',
    requestTime: '11:15',
    status: 'รอตอบรับ',
    rawStatus: 'เปิดงาน',
    isMachineFound: true,
    sourceFileName: 'ตัวอย่างใบแจ้งซ่อม_CPRAM_Plant2.xlsx'
  },
  {
    tempId: 'sample-wr-3',
    sequenceNo: 3,
    ticketNo: '167313',
    machineId: 'FFS02',
    machineName: 'FORM-FILL-SEAL M/C 2',
    lineGroup: 'PACKAGING HALL B',
    locationPoint: 'ชุดดึงซองล่างและลูกกลิ้งรีดฟิล์ม',
    priority: 'เร่งด่วน',
    problemTitle: 'ลูกปืนลูกกลิ้งรีดฟิล์มมีเสียงหอนดัง และซองเริ่มเอียง',
    problemDetails: 'ลูกปืนลูกกลิ้งรีดฟิล์มมีเสียงหอนดัง และซองเริ่มเอียง ซองขยับเบี้ยวประมาณ 2-3 มม. ต้องคอยปรับ Guide ตลอดเวลา',
    productionDepartment: '542102 ฝ่ายบรรจุอัตโนมัติ',
    requesterName: 'วิชัย กะบ่าย',
    requesterPhone: '084-555-8899',
    requestDate: '2026-09-14',
    requestTime: '13:00',
    status: 'ตอบรับแล้ว/มีแผนงาน',
    rawStatus: 'ตอบรับแล้ว',
    isMachineFound: true,
    sourceFileName: 'ตัวอย่างใบแจ้งซ่อม_CPRAM_Plant2.xlsx'
  },
  {
    tempId: 'sample-wr-4',
    sequenceNo: 4,
    ticketNo: '167314',
    machineId: 'MET01',
    machineName: 'METAL DETECTOR Line 1',
    lineGroup: 'QUALITY CONTROL / PACK',
    locationPoint: 'สายพานลำเลียงผ่านอุโมงค์ตรวจจับโลหะ',
    priority: 'ปกติ',
    problemTitle: 'สายพานลำเลียงหย่อนเล็กน้อย และเซ็นเซอร์ Reject ทำงานหน่วง',
    problemDetails: 'สายพานลำเลียงหย่อนเล็กน้อย วิ่งกระตุกเบาๆ และเซ็นเซอร์ Reject ทำงานหน่วงเวลาประมาณ 0.5 วินาที ยังไม่กระทบการผลิตโดยตรง',
    productionDepartment: '542110 แผนกควบคุมคุณภาพ (QC)',
    requesterName: 'กนกวรรณ',
    requesterPhone: '082-345-6789',
    requestDate: '2026-09-14',
    requestTime: '14:30',
    status: 'รอตอบรับ',
    rawStatus: 'เปิดงาน',
    isMachineFound: true,
    sourceFileName: 'ตัวอย่างใบแจ้งซ่อม_CPRAM_Plant2.xlsx'
  },
  {
    tempId: 'sample-wr-5',
    sequenceNo: 5,
    ticketNo: '167315',
    machineId: 'ROB01',
    machineName: 'ROBOT PALLETIZER 1',
    lineGroup: 'END OF LINE / WAREHOUSE',
    locationPoint: 'แขนจับ Vacuum Gripper',
    priority: 'ตามแผนนัดหมาย',
    problemTitle: 'ยางดูดยูนิต Vacuum Gripper สึกหรอ ขอเปลี่ยนรอบพักกะ',
    problemDetails: 'ยางดูดยูนิต Vacuum Gripper สึกหรอจำนวน 2 ลูก ดูดกล่องแล้วมีอาการหลวมช่วงยกจังหวะเร็ว ขอเปลี่ยนในรอบพักสายการผลิต 17:00 น.',
    productionDepartment: '542115 แผนกคลังและขนถ่าย',
    requesterName: 'ประสิทธิ์',
    requesterPhone: '086-789-0123',
    requestDate: '2026-09-14',
    requestTime: '15:10',
    status: 'รอตอบรับ',
    rawStatus: 'เปิดงาน',
    isMachineFound: true,
    sourceFileName: 'ตัวอย่างใบแจ้งซ่อม_CPRAM_Plant2.xlsx'
  }
];

/**
 * Parses raw Excel data from Buffer or string into Work Request items
 */
export function parseWorkRequestExcelBuffer(
  data: ArrayBuffer | Uint8Array | string,
  machines: Machine[],
  defaultRequester: string = 'ฝ่ายผลิต',
  fileName: string = 'work_requests.xlsx'
): ExcelParseWorkRequestResult {
  const workbook = typeof data === 'string'
    ? XLSX.read(data, { type: 'string' })
    : XLSX.read(data, { type: 'array' });

  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('ไม่พบแผ่นงาน (Worksheet) ในไฟล์ Excel ที่ระบุ');
  }

  // Use the first sheet or the sheet named "WorkRequests" / "ใบแจ้งซ่อม"
  const targetSheetName = sheetNames.find(s => 
    s.includes('แจ้งซ่อม') || s.includes('Work') || s.includes('Request') || s.includes('Job')
  ) || sheetNames[0];

  const sheet = workbook.Sheets[targetSheetName];
  if (!sheet) {
    throw new Error('ไม่พบข้อมูลในแผ่นงาน');
  }

  // Convert sheet to 2D array of rows
  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('ไฟล์ Excel ไม่มีข้อมูล');
  }

  // Find header row by scanning first 10 rows
  let headerRowIndex = -1;
  let colMap: Record<string, number> = {};

  for (let r = 0; r < Math.min(rawRows.length, 12); r++) {
    const row = rawRows[r];
    if (!row || !Array.isArray(row)) continue;

    const rowStrings = row.map(cell => String(cell || '').trim().toLowerCase());
    
    // Check if row contains key identifiers like "เลขที่", "รหัสเครื่อง", "อาการ", "ผู้ของาน", "ticket", "machine"
    const hasTicket = rowStrings.some(s => s.includes('เลขที่') || s.includes('ticket') || s.includes('wo') || s.includes('job'));
    const hasMachine = rowStrings.some(s => s.includes('รหัสเครื่อง') || s.includes('เครื่องจักร') || s.includes('machine') || s.includes('mc'));
    const hasProblem = rowStrings.some(s => s.includes('อาการ') || s.includes('ปัญหา') || s.includes('รายละเอียด') || s.includes('problem') || s.includes('symptom') || s.includes('issue'));

    if ((hasTicket || hasMachine) && (hasProblem || rowStrings.some(s => s.includes('ลำดับ') || s.includes('ผู้ของาน') || s.includes('หน่วยงาน')))) {
      headerRowIndex = r;

      // Build column mapping
      row.forEach((cell, colIdx) => {
        const h = String(cell || '').trim().toLowerCase();
        if (!h) return;

        if (h.includes('ลำดับ') || h === 'no' || h === 'seq' || h === '#') colMap.seq = colIdx;
        else if (h.includes('เลขที่แจ้งซ่อม') || h.includes('เลขที่ใบแจ้ง') || h.includes('เลขที่') || h.includes('ticket') || h.includes('wo') || h.includes('job no')) colMap.ticket = colIdx;
        else if (h.includes('รหัสเครื่อง') || h.includes('machine id') || h.includes('mc id') || h.includes('m/c id') || h === 'code') colMap.machineId = colIdx;
        else if (h.includes('ชื่อเครื่อง') || h.includes('เครื่องจักร') || h.includes('machine name') || h.includes('equipment')) colMap.machineName = colIdx;
        else if (h.includes('รายละเอียด') || h.includes('อาการ') || h.includes('ปัญหา') || h.includes('หัวข้อ') || h.includes('problem') || h.includes('symptom') || h.includes('description') || h.includes('details')) colMap.problem = colIdx;
        else if (h.includes('ผู้ของาน') || h.includes('ผู้แจ้ง') || h.includes('ชื่อผู้แจ้ง') || h.includes('requester') || h.includes('reported by')) colMap.requester = colIdx;
        else if (h.includes('หน่วยงาน') || h.includes('ฝ่าย') || h.includes('แผนก') || h.includes('department') || h.includes('dept') || h.includes('line') || h.includes('section')) colMap.dept = colIdx;
        else if (h.includes('วันที่') || h.includes('date')) colMap.date = colIdx;
        else if (h.includes('เวลา') || h.includes('time')) colMap.time = colIdx;
        else if (h.includes('ความเร่งด่วน') || h.includes('ระดับ') || h.includes('priority') || h.includes('urgency')) colMap.priority = colIdx;
        else if (h.includes('สถานะ') || h.includes('status')) colMap.status = colIdx;
        else if (h.includes('จุดที่') || h.includes('ตำแหน่ง') || h.includes('location')) colMap.location = colIdx;
        else if (h.includes('โทร') || h.includes('phone') || h.includes('tel')) colMap.phone = colIdx;
      });

      break;
    }
  }

  // If no header found, fallback to standard column order:
  // Col 0: ลำดับ, Col 1: เลขที่แจ้งซ่อม, Col 2: รหัสเครื่อง, Col 3: เครื่องจักร, Col 4: อาการเสีย, Col 5: ผู้ของาน, Col 6: หน่วยงาน, Col 7: วันที่, Col 8: สถานะ
  if (headerRowIndex === -1) {
    headerRowIndex = 0;
    colMap = {
      seq: 0,
      ticket: 1,
      machineId: 2,
      machineName: 3,
      problem: 4,
      requester: 5,
      dept: 6,
      date: 7,
      status: 8
    };
  }

  const items: ParsedWorkRequestItem[] = [];
  const startRow = headerRowIndex + 1;

  for (let r = startRow; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.every(cell => cell === '' || cell === null || cell === undefined)) {
      continue;
    }

    const getVal = (colKey: string): string => {
      const idx = colMap[colKey];
      if (idx === undefined || idx < 0 || idx >= row.length) return '';
      return String(row[idx] || '').trim();
    };

    const rawSeq = colMap.seq !== undefined ? row[colMap.seq] : undefined;
    const seqNo = rawSeq !== undefined && !isNaN(parseInt(rawSeq, 10)) ? parseInt(rawSeq, 10) : (items.length + 1);

    // เอาลำดับที่ ไปใส่เลขแจ้งซ่อม:
    // If ticket column is empty or not provided, use sequence number (rawSeq) as ticketNo!
    const rawTicket = getVal('ticket');
    const seqString = rawSeq !== undefined && String(rawSeq).trim() ? String(rawSeq).trim() : '';
    const ticketNo = rawTicket || seqString || `REQ-${Date.now().toString().slice(-6)}-${items.length + 1}`;
    let rawMachineId = getVal('machineId');
    let rawMachineName = getVal('machineName');
    const problemText = getVal('problem');
    const requesterName = getVal('requester') || defaultRequester;
    const department = getVal('dept') || 'ฝ่ายผลิต';
    const rawDate = colMap.date !== undefined ? row[colMap.date] : '';
    const rawTime = colMap.time !== undefined ? row[colMap.time] : '';
    const rawPriority = getVal('priority');
    const rawStatus = getVal('status');
    const locationPoint = getVal('location');
    const requesterPhone = getVal('phone');

    // Skip row if completely empty of meaningful content (no machine, no problem, no ticket)
    if (!rawMachineId && !rawMachineName && !problemText && !getVal('ticket')) {
      continue;
    }

    // Attempt to match machine ID or machine Name in registry
    let matchedMachine: Machine | undefined;
    if (rawMachineId) {
      matchedMachine = findMatchingMachine(rawMachineId, machines);
    }
    if (!matchedMachine && rawMachineName) {
      matchedMachine = findMatchingMachine(rawMachineName, machines);
    }
    // Also try detecting from problem text if machine is still unknown
    if (!matchedMachine && problemText) {
      for (const m of machines) {
        if (problemText.toUpperCase().includes(m.id.toUpperCase())) {
          matchedMachine = m;
          break;
        }
      }
    }

    const finalMachineId = matchedMachine?.id || (rawMachineId ? rawMachineId.toUpperCase() : 'UNKNOWN');
    const finalMachineName = matchedMachine?.name || rawMachineName || (finalMachineId !== 'UNKNOWN' ? `เครื่องจักร ${finalMachineId}` : 'เครื่องจักรทั่วไป');
    const finalLineGroup = matchedMachine?.lineGroup || matchedMachine?.location || department;

    // Separate problem title and details if long
    let title = problemText;
    let details = problemText;
    if (problemText.includes('\n')) {
      const parts = problemText.split('\n').map(p => p.trim()).filter(Boolean);
      title = parts[0];
      details = parts.join(' ');
    } else if (problemText.length > 60) {
      title = problemText.substring(0, 57) + '...';
      details = problemText;
    }

    if (!title) {
      title = `แจ้งซ่อม ${finalMachineName}`;
      details = `แจ้งซ่อม ${finalMachineName} อาการผิดปกติจากสายการผลิต`;
    }

    const finalDate = normalizeExcelDate(rawDate);
    const finalTime = normalizeExcelTime(rawTime);
    const priority = rawPriority ? detectPriorityFromText(rawPriority) : detectPriorityFromText(problemText);
    const status = mapRawStatusToWorkRequestStatus(rawStatus);

    items.push({
      tempId: `excel-wr-${ticketNo}-${Date.now()}-${r}`,
      sequenceNo: seqNo,
      ticketNo: ticketNo,
      machineId: finalMachineId,
      machineName: finalMachineName,
      lineGroup: finalLineGroup,
      locationPoint: locationPoint || matchedMachine?.location || finalLineGroup,
      priority: priority,
      problemTitle: title,
      problemDetails: details,
      productionDepartment: department,
      requesterName: requesterName,
      requesterPhone: requesterPhone,
      requestDate: finalDate,
      requestTime: finalTime,
      status: status,
      rawStatus: rawStatus || (status === 'ปิดงานสมบูรณ์' ? 'ปิดงาน' : 'เปิดงาน'),
      isMachineFound: Boolean(matchedMachine),
      sourceFileName: fileName,
      sourceRowIndex: r + 1
    });
  }

  return {
    items,
    fileName,
    sheetNames,
    totalFound: items.length
  };
}

/**
 * Downloads a template Excel file for Work Requests
 */
export function downloadWorkRequestTemplateExcel(): void {
  const headers = [
    'ลำดับ',
    'เลขที่แจ้งซ่อม',
    'รหัสเครื่องจักร',
    'ชื่อเครื่องจักร',
    'รายละเอียด / อาการเสีย',
    'ผู้ของาน',
    'หน่วยงาน / แผนก',
    'วันที่แจ้ง (วว/ดด/ปปปป)',
    'เวลาที่แจ้ง (นน:นน)',
    'ความเร่งด่วน',
    'สถานะงาน',
    'เบอร์โทรติดต่อ'
  ];

  const sampleRows = [
    [
      1,
      '167311',
      'BAN01',
      'BANDING (TXL32-20-62)',
      'แจ้งส่งเทอร์โมเครื่อง banding ลงข้าวกล่อง ปลั๊กหลวมและอุณหภูมิตก ซีลไม่ติด',
      'จุฑามาศ',
      '542107 ฝ่ายขึ้นรูป - ข้าวกล่อง',
      '14/09/2026',
      '10:21',
      'ฉุกเฉินไลน์หยุด',
      'เปิดงาน',
      '089-123-4567'
    ],
    [
      2,
      '167312',
      'ATS03',
      'AUTOMATIC TOPSEAL Line 3',
      'ซีลไม่สนิท ฟิล์มตัดไม่ขาด มีเสียงกระแทกจากกระบอกลมหัวตัด อุณหภูมิแกว่ง',
      'สมศรี',
      '542108 ฝ่ายบรรจุและซีลถ้วย',
      '14/09/2026',
      '11:15',
      'ฉุกเฉินไลน์หยุด',
      'เปิดงาน',
      '081-998-1234'
    ],
    [
      3,
      '167313',
      'FFS02',
      'FORM-FILL-SEAL M/C 2',
      'ลูกปืนลูกกลิ้งรีดฟิล์มมีเสียงหอนดัง และซองเริ่มเอียง 2-3 มม.',
      'วิชัย กะบ่าย',
      '542102 ฝ่ายบรรจุอัตโนมัติ',
      '14/09/2026',
      '13:00',
      'เร่งด่วน',
      'ตอบรับแล้ว',
      '084-555-8899'
    ],
    [
      4,
      '167314',
      'MET01',
      'METAL DETECTOR Line 1',
      'สายพานลำเลียงหย่อน วิ่งกระตุกเล็กน้อย เซ็นเซอร์ทำงานหน่วง',
      'กนกวรรณ',
      '542110 แผนกควบคุมคุณภาพ (QC)',
      '14/09/2026',
      '14:30',
      'ปกติทั่วไป',
      'เปิดงาน',
      '082-345-6789'
    ],
    [
      5,
      '167315',
      'ROB01',
      'ROBOT PALLETIZER 1',
      'ยางดูดยูนิต Vacuum Gripper สึกหรอ ขอเปลี่ยนรอบพักกะ 17:00 น.',
      'ประสิทธิ์',
      '542115 แผนกคลังและขนถ่าย',
      '14/09/2026',
      '15:10',
      'แผนหยุดผลิต',
      'เปิดงาน',
      '086-789-0123'
    ]
  ];

  const wsData = [headers, ...sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 8 },  // ลำดับ
    { wch: 15 }, // เลขที่แจ้งซ่อม
    { wch: 15 }, // รหัสเครื่องจักร
    { wch: 26 }, // ชื่อเครื่องจักร
    { wch: 45 }, // รายละเอียด / อาการเสีย
    { wch: 16 }, // ผู้ของาน
    { wch: 28 }, // หน่วยงาน / แผนก
    { wch: 20 }, // วันที่แจ้ง
    { wch: 16 }, // เวลาที่แจ้ง
    { wch: 18 }, // ความเร่งด่วน
    { wch: 14 }, // สถานะงาน
    { wch: 18 }  // เบอร์โทร
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'WorkRequests');

  // Trigger download
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `แบบฟอร์มนำเข้าใบแจ้งซ่อม_WorkRequests_${getTodayDateString()}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
