import * as pdfjsLib from 'pdfjs-dist';
import { Machine, WorkRequestPriority, WorkRequestStatus } from '../types';
import { getTodayDateString } from './pmAlerts';

// Configure pdfjs worker
const PDFJS_WORKER_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '6.3.289'}/build/pdf.worker.min.mjs`;

try {
  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
  }
} catch (e) {
  console.warn('PDF Worker setup warning:', e);
}

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
  sourcePage?: number;
}

export interface PDFParseWorkRequestResult {
  items: ParsedWorkRequestItem[];
  rawText: string;
  fileName: string;
  pageCount: number;
  totalFound: number;
  warnings?: string[];
}

/**
 * Normalizes date string into YYYY-MM-DD format
 * Supports Thai BE years (2560-2575) and CE years (2020-2035)
 */
function normalizeThaiDate(dateStr: string): string {
  if (!dateStr) return getTodayDateString();
  const clean = dateStr.trim().replace(/[.]/g, '/').replace(/[-]/g, '/');
  
  // DD/MM/YYYY or M/D/YYYY
  const parts = clean.split('/');
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
      year -= 543;
    }

    // Determine day vs month
    let day = p1;
    let month = p2;
    // In typical Thai ERP / CPRAM export e.g. "9/1/2569", the first digit is month 9 (September)
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

  // Fallback if ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  return getTodayDateString();
}

/**
 * Normalizes time string to HH:MM format
 */
function normalizeTime(timeStr: string): string {
  if (!timeStr) {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }
  const clean = timeStr.trim().replace('.', ':');
  const match = clean.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const hh = match[1].padStart(2, '0');
    const mm = match[2];
    return `${hh}:${mm}`;
  }
  return '09:00';
}

/**
 * Parses date & time string from Thai table format e.g. "9/1/2569 10:21"
 */
function parseThaiTableDateTime(dateTimeStr: string): { date: string; time: string } {
  if (!dateTimeStr) {
    return { date: getTodayDateString(), time: '09:00' };
  }

  const parts = dateTimeStr.trim().split(/\s+/);
  const datePart = parts[0] || '';
  const timePart = parts[1] || '';

  return {
    date: normalizeThaiDate(datePart),
    time: normalizeTime(timePart)
  };
}

/**
 * Maps raw status from document to WorkRequestStatus
 */
function mapRawStatusToWorkRequestStatus(rawStatus: string): WorkRequestStatus {
  if (!rawStatus) return 'รอตอบรับ';
  const clean = rawStatus.trim();
  if (clean.includes('ปิดงาน') || clean.includes('เสร็จ') || clean.includes('สำเร็จ')) {
    return 'ปิดงานสมบูรณ์';
  }
  if (clean.includes('กำลัง') || clean.includes('ดำเนินการ') || clean.includes('กำลังซ่อม')) {
    return 'กำลังดำเนินการซ่อม';
  }
  if (clean.includes('อะไหล่')) {
    return 'รออะไหล่/สั่งของ';
  }
  if (clean.includes('ตอบรับ') || clean.includes('อนุมัติแล้ว')) {
    return 'ตอบรับแล้ว/มีแผนงาน';
  }
  // "เปิดงาน", "รออนุมัติ", etc.
  return 'รอตอบรับ';
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

  // 2. Starts with or includes
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

/**
 * Detects Machine ID from text
 */
function detectMachineIdFromText(text: string, machines: Machine[]): { machine?: Machine; rawId: string } {
  // 1. Explicit keywords e.g. "รหัสเครื่อง: ATS03" or "Machine ID: FFS02"
  const labelPatterns = [
    /(?:รหัสเครื่องจักร|รหัสเครื่อง|Machine\s*ID|MC\s*ID|M\/C\s*ID|ID\s*เครื่อง|Machine\s*Code|ID)[:\s]+([A-Za-z0-9_-]+)/i,
    /เครื่อง[:\s]+([A-Za-z0-9_-]+)/i,
    /\b([A-Za-z]{2,5}[-_]?[0-9]{2,4})\b/
  ];

  for (const pat of labelPatterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      const candidateId = match[1].trim();
      const mach = findMatchingMachine(candidateId, machines);
      if (mach) {
        return { machine: mach, rawId: mach.id };
      }
      if (/^[A-Za-z]{2,5}[-_]?[0-9]{2,4}$/i.test(candidateId)) {
        return { machine: undefined, rawId: candidateId.toUpperCase() };
      }
    }
  }

  // 2. Scan all known machine IDs directly in the text (sorted by length desc to match ATS03 before AT)
  const sortedMachines = [...machines].sort((a, b) => b.id.length - a.id.length);
  for (const m of sortedMachines) {
    const idRegex = new RegExp(`\\b${m.id.replace(/[-]/g, '[-]?')}\\b`, 'i');
    if (idRegex.test(text)) {
      return { machine: m, rawId: m.id };
    }
  }

  return { machine: undefined, rawId: '' };
}

/**
 * Detects Priority from text
 */
function detectPriorityFromText(text: string): WorkRequestPriority {
  const lower = text.toLowerCase();
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
    lower.includes('แผนหยุด') || 
    lower.includes('ไม่กระทบ') || 
    lower.includes('ตามแผน') ||
    lower.includes('นัดหมาย') ||
    lower.includes('pm')
  ) {
    return 'ตามแผนนัดหมาย';
  }

  return 'ปกติ';
}

/**
 * Extracts date and time from text
 */
function detectDateTimeFromText(text: string): { date: string; time: string } {
  let date = getTodayDateString();
  let time = '09:00';

  const dateMatch = text.match(/(?:วันที่|Date)?[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}|\d{4}-\d{2}-\d{2})/i);
  if (dateMatch && dateMatch[1]) {
    date = normalizeThaiDate(dateMatch[1]);
  }

  const timeMatch = text.match(/(?:เวลา|Time)?[:\s]*(\d{1,2}[:\.]\d{2})(?:\s*น\.)?/i);
  if (timeMatch && timeMatch[1]) {
    time = normalizeTime(timeMatch[1]);
  } else {
    const now = new Date();
    time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  return { date, time };
}

/**
 * Extracts problem title, details, and location from text
 */
function detectProblemFromText(text: string, lines: string[]): { title: string; details: string; location: string } {
  let title = '';
  let details = '';
  let location = '';

  const problemMatch = text.match(/(?:อาการเสีย|ปัญหาที่พบ|หัวข้อปัญหา|ลักษณะความชำรุด|อาการชำรุด|ปัญหา|งานที่แจ้ง|Problem|Symptoms|Issue|Defect)[:\s]+([^\n\r]+)/i);
  if (problemMatch && problemMatch[1]) {
    title = problemMatch[1].trim();
  }

  const detailMatch = text.match(/(?:รายละเอียดปัญหา|รายละเอียดเพิ่มเติม|ผลกระทบ|Details|Description)[:\s]+([^\n\r]+)/i);
  if (detailMatch && detailMatch[1]) {
    details = detailMatch[1].trim();
  }

  const locationMatch = text.match(/(?:จุดที่แจ้งซ่อม|จุดที่ชำรุด|ตำแหน่ง|จุดที่เกิดเหตุ|Location|Position)[:\s]+([^\n\r]+)/i);
  if (locationMatch && locationMatch[1]) {
    location = locationMatch[1].trim();
  }

  if (!title) {
    const symptomLine = lines.find(l => 
      /เสีย|ชำรุด|ไม่ทำงาน|มีเสียงดัง|ร้อน|รั่ว|หลุด|แตก|ขาด|ติดขัด|alarm|error|sensor|motor|belt|heater|ซีลไม่|ตัดไม่/i.test(l) &&
      !/^(วันที่|เวลา|ผู้แจ้ง|รหัส|แผนก|ลำดับ|เลขที่)/i.test(l.trim())
    );
    if (symptomLine) {
      title = symptomLine.trim();
    }
  }

  if (!title) {
    title = 'แจ้งซ่อมบำรุงเครื่องจักรตามเอกสาร PDF';
  }

  if (!details) {
    details = title;
  }

  return { title, details, location };
}

/**
 * Extracts requester name, phone and department
 */
function detectRequesterInfo(text: string, defaultDept: string = 'ฝ่ายผลิต'): { name: string; phone: string; dept: string } {
  let name = '';
  let phone = '';
  let dept = defaultDept;

  const nameMatch = text.match(/(?:ผู้แจ้งซ่อม|ผู้แจ้ง|ชื่อผู้แจ้ง|ผู้รายงาน|ผู้ของาน|Requester|Reported\s*by)[:\s]+([^\n\r\t,]+)/i);
  if (nameMatch && nameMatch[1]) {
    name = nameMatch[1].trim().replace(/(?:เบอร์โทร|โทร|Tel|Phone|แผนก|ฝ่าย).*$/i, '').trim();
  }

  const phoneMatch = text.match(/(?:เบอร์โทร|โทร|Tel|Phone|Ext|เบอร์ต่อ)[:\s]*([0-9\-\s]{4,15})/i) ||
                     text.match(/\b(0[689]\d[-]?\d{3}[-]?\d{4}|\d{4})\b/);
  if (phoneMatch && phoneMatch[1]) {
    phone = phoneMatch[1].trim();
  }

  const deptMatch = text.match(/(?:หน่วยงาน|แผนก|ฝ่าย|ไลน์การผลิต|สังกัด|Department|Line)[:\s]+([^\n\r\t,]+)/i);
  if (deptMatch && deptMatch[1]) {
    dept = deptMatch[1].trim().replace(/(?:ผู้แจ้ง|วันที่|โทร).*$/i, '').trim();
  }

  return { name, phone, dept };
}

/**
 * Parses lines matching the CPRAM Work Request Tabular format:
 * ลำดับ เลขที่แจ้งซ่อม | เครื่องจักร | รายละเอียด | ผู้ของาน | หน่วยงาน | วันที่ขอ | สถานะงาน | รหัสเครื่อง
 * Example:
 * 167311 แจ้งซ่อมเทอร์โมเครื่อง banding แจ้งซ่อมเทอร์โมเครื่อง banding no.1 ห้องขึ้นรูปข้าวกล่อง จุฑามาส โยธาธรณ์ 542107 ฝ่ายขึ้นรูป - ข้าวกล่อง 9/1/2569 10:21 เปิดงาน BAN01
 */
export function parseCpramTableLines(
  lines: string[],
  machines: Machine[],
  fileName: string = 'ใบแจ้งซ่อม.pdf'
): ParsedWorkRequestItem[] {
  const items: ParsedWorkRequestItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine || rawLine.length < 10) continue;

    // Skip header lines
    if (rawLine.includes('เลขที่แจ้งซ่อม') || rawLine.includes('รหัสเครื่อง') || rawLine.includes('ลำดับ')) {
      continue;
    }

    // Match table row pattern:
    // Optional: 1) ลำดับ (sequence number e.g. 1, 2, 3...)
    // 2) 5-8 digit ticket number (e.g. 167311)
    // 3) Middle text (machine name, symptom, requester)
    // 4) Department pattern (e.g. 542107 ฝ่ายขึ้นรูป - ข้าวกล่อง or ฝ่ายขึ้นรูป)
    // 5) Date pattern (e.g. 9/1/2569 10:21)
    // 6) Status (e.g. เปิดงาน, รออนุมัติ, ปิดงาน)
    // 7) Machine ID at the end (e.g. BAN01, ATS02, FFS03)
    const tablePattern = /^(?:(?:ลำดับ\s*)?(\d{1,4})[\.\s\t]+)?(\d{5,8})\s+(.+?)\s+([0-9]{4,6}\s+ฝ่าย[^\s]+(?:\s*-\s*[^\s]+)?|ฝ่าย[^\s]+(?:\s*-\s*[^\s]+)?)\s+(\d{1,2}\/\d{1,2}\/25\d{2}\s+\d{1,2}:\d{2})\s+([^\s]+)\s+([A-Za-z0-9_-]+)$/;
    
    const match = rawLine.match(tablePattern);
    if (match) {
      const seqNo = match[1] ? parseInt(match[1], 10) : items.length + 1;
      const ticketNo = match[2];
      const middleText = match[3].trim();
      const department = match[4].trim();
      const dateTimeRaw = match[5].trim();
      const rawStatus = match[6].trim();
      const machineIdRaw = match[7].trim();

      const { date, time } = parseThaiTableDateTime(dateTimeRaw);
      const machine = findMatchingMachine(machineIdRaw, machines);
      const machineId = machine?.id || machineIdRaw.toUpperCase();
      const machineName = machine?.name || `เครื่องจักร ${machineId}`;
      const lineGroup = machine?.lineGroup || machine?.location || department;

      // In middleText, separate title, details, and requester:
      // Typically: [เครื่องจักร/หัวข้อ] [รายละเอียด] [ผู้ของาน]
      let requesterName = 'เจ้าหน้าที่ฝ่ายผลิต';
      let problemTitle = middleText;
      let problemDetails = middleText;

      // Look for requester at the tail of middleText (Thai name pattern)
      const requesterMatch = middleText.match(/^(.*?)\s+([ก-๙a-zA-Z\._]+(?:\s+[ก-๙a-zA-Z\._]+)?)$/);
      if (requesterMatch) {
        requesterName = requesterMatch[2].trim();
        const remaining = requesterMatch[1].trim();
        if (remaining) {
          problemTitle = remaining;
          problemDetails = remaining;
        }
      }

      // If problemDetails is very long, use first 50 chars as title
      if (problemTitle.length > 60) {
        problemTitle = problemTitle.substring(0, 57) + '...';
      }

      items.push({
        tempId: `cpram-${ticketNo}-${Date.now()}-${i}`,
        sequenceNo: seqNo,
        ticketNo: ticketNo,
        machineId: machineId,
        machineName: machineName,
        lineGroup: lineGroup,
        locationPoint: machine?.location || 'ห้องขึ้นรูปข้าวกล่อง',
        priority: detectPriorityFromText(problemDetails),
        problemTitle: problemTitle,
        problemDetails: problemDetails,
        productionDepartment: department,
        requesterName: requesterName,
        requesterPhone: '',
        requestDate: date,
        requestTime: time,
        rawStatus: rawStatus,
        status: mapRawStatusToWorkRequestStatus(rawStatus),
        isMachineFound: Boolean(machine),
        rawText: rawLine,
        sourceFileName: fileName,
        sourcePage: 1
      });
    }
  }

  return items;
}

/**
 * Parses raw text into one or more work request items
 */
export function parseWorkRequestsFromRawText(
  rawText: string,
  machines: Machine[],
  defaultRequester: string = 'ฝ่ายผลิต',
  fileName: string = 'uploaded_file.pdf'
): ParsedWorkRequestItem[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Try parsing as CPRAM tabular format first
  const tableItems = parseCpramTableLines(lines, machines, fileName);
  if (tableItems.length > 0) {
    return tableItems;
  }

  // 2. Otherwise split into chunks if multiple work requests exist
  const chunkSeparators = /(?:--- PAGE \d+ ---|===+|ใบแจ้งซ่อมที่|เลขที่ใบแจ้งซ่อม|Work Order No|REQ-\d+)/i;
  let textChunks = rawText.split(chunkSeparators).map(c => c.trim()).filter(c => c.length > 15);

  if (textChunks.length <= 1) {
    const bulletChunks = rawText.split(/\n(?=[-•*]\s*(?:เครื่อง|[A-Z]{2,4}\d))/i).map(c => c.trim()).filter(c => c.length > 10);
    if (bulletChunks.length > 1) {
      textChunks = bulletChunks;
    } else {
      textChunks = [rawText];
    }
  }

  const results: ParsedWorkRequestItem[] = [];

  textChunks.forEach((chunk, index) => {
    const chunkLines = chunk.split('\n').map(l => l.trim()).filter(Boolean);
    const { machine, rawId } = detectMachineIdFromText(chunk, machines);
    const { date, time } = detectDateTimeFromText(chunk);
    const priority = detectPriorityFromText(chunk);
    const { title, details, location } = detectProblemFromText(chunk, chunkLines);
    const requester = detectRequesterInfo(chunk, machine?.lineGroup || machine?.location || 'ฝ่ายผลิต');

    // Extract ticket number if present (e.g. 167311 or REQ-202609-001)
    const ticketMatch = chunk.match(/\b(1\d{5}|\d{6}|REQ-\d{6,}-\d+)\b/);
    const ticketNo = ticketMatch ? ticketMatch[1] : undefined;

    const finalMachineId = machine?.id || rawId || 'UNKNOWN';
    const finalMachineName = machine?.name || (finalMachineId !== 'UNKNOWN' ? `เครื่องจักร ${finalMachineId}` : 'เครื่องจักรทั่วไป');
    const finalLineGroup = machine?.lineGroup || machine?.location || requester.dept || 'สายการผลิต';

    results.push({
      tempId: `draft-req-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
      ticketNo: ticketNo,
      machineId: finalMachineId,
      machineName: finalMachineName,
      lineGroup: finalLineGroup,
      locationPoint: location,
      priority: priority,
      problemTitle: title,
      problemDetails: details,
      productionDepartment: requester.dept || finalLineGroup,
      requesterName: requester.name || defaultRequester,
      requesterPhone: requester.phone || '',
      requestDate: date,
      requestTime: time,
      status: 'รอตอบรับ',
      isMachineFound: Boolean(machine),
      rawText: chunk.substring(0, 600),
      sourceFileName: fileName,
      sourcePage: index + 1
    });
  });

  return results;
}

/**
 * Parses an uploaded PDF file into WorkRequest items using pdfjs-dist
 * Supports both multi-row table layout and standard multi-page documents
 */
export async function parseWorkRequestPDF(
  file: File,
  machines: Machine[],
  defaultRequester: string = 'ฝ่ายผลิต'
): Promise<PDFParseWorkRequestResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Ensure worker is configured with a working endpoint
    try {
      if (typeof window !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      }
    } catch {
      // Ignored
    }

    let pdfDoc;
    try {
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
      });
      pdfDoc = await loadingTask.promise;
    } catch (workerErr) {
      console.warn('Initial PDF worker load failed, falling back to secondary unpkg worker...', workerErr);
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.3.289'}/build/pdf.worker.min.mjs`;
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
      });
      pdfDoc = await loadingTask.promise;
    }

    const numPages = pdfDoc.numPages;
    const pageTexts: string[] = [];
    const allTableLines: string[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Group text items by Y coordinate to reconstruct visual table rows
      interface TextItemWithPos {
        str: string;
        x: number;
        y: number;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const itemsWithPos: TextItemWithPos[] = textContent.items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => ({
          str: (item.str || '').trim(),
          x: item.transform ? item.transform[4] : 0,
          y: item.transform ? item.transform[5] : 0
        }))
        .filter((i: TextItemWithPos) => i.str.length > 0);

      // Sort items by Y (descending: top of page to bottom)
      itemsWithPos.sort((a, b) => b.y - a.y);

      // Cluster by row Y coordinate (tolerance ~ 4px)
      const rows: TextItemWithPos[][] = [];
      let currentRow: TextItemWithPos[] = [];
      let currentY: number | null = null;

      for (const item of itemsWithPos) {
        if (currentY === null || Math.abs(item.y - currentY) <= 4.5) {
          currentRow.push(item);
          currentY = item.y;
        } else {
          // Sort items in the finished row by X coordinate (left to right)
          currentRow.sort((a, b) => a.x - b.x);
          rows.push(currentRow);
          currentRow = [item];
          currentY = item.y;
        }
      }
      if (currentRow.length > 0) {
        currentRow.sort((a, b) => a.x - b.x);
        rows.push(currentRow);
      }

      // Convert rows into text lines
      const reconstructedLines: string[] = rows.map(r => r.map(it => it.str).join(' '));
      allTableLines.push(...reconstructedLines);

      pageTexts.push(`--- PAGE ${pageNum} ---\n` + reconstructedLines.join('\n'));
    }

    const fullText = pageTexts.join('\n\n');
    
    // First try CPRAM table parsing on the reconstructed lines
    let items = parseCpramTableLines(allTableLines, machines, file.name);

    // If no table lines matched (e.g. different format), fall back to general chunk parser
    if (items.length === 0) {
      items = parseWorkRequestsFromRawText(fullText, machines, defaultRequester, file.name);
    }

    return {
      items,
      rawText: fullText,
      fileName: file.name,
      pageCount: numPages,
      totalFound: items.length
    };
  } catch (err: unknown) {
    console.error('PDF parsing error:', err);
    throw new Error(err instanceof Error ? err.message : 'ไม่สามารถอ่านไฟล์ PDF ได้ กรุณาลองวางข้อความแทน');
  }
}
