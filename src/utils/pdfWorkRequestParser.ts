import * as pdfjsLib from 'pdfjs-dist';
import { Machine, WorkRequestPriority } from '../types';
import { getTodayDateString } from './pmAlerts';

// Configure pdfjs worker
try {
  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
  }
} catch (e) {
  console.warn('PDF Worker setup warning:', e);
}

export interface ParsedWorkRequestItem {
  tempId: string;
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
  
  // DD/MM/YYYY
  const parts = clean.split('/');
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);

    if (day > 1900) {
      // YYYY/MM/DD
      const temp = day;
      day = year;
      year = temp;
    }

    if (year > 2500) {
      year -= 543;
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
  // First, check for explicit keywords e.g. "รหัสเครื่อง: ATS03" or "Machine ID: FFS02"
  const labelPatterns = [
    /(?:รหัสเครื่องจักร|รหัสเครื่อง|Machine\s*ID|MC\s*ID|M\/C\s*ID|ID\s*เครื่อง|Machine\s*Code|ID)[:\s]+([A-Za-z0-9_-]+)/i,
    /เครื่อง[:\s]+([A-Za-z0-9_-]+)/i,
    /([A-Za-z]{2,5}[-_]?[0-9]{2,4})/
  ];

  for (const pat of labelPatterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      const candidateId = match[1].trim();
      const mach = findMatchingMachine(candidateId, machines);
      if (mach) {
        return { machine: mach, rawId: mach.id };
      }
      // If looks like valid ID pattern
      if (/^[A-Za-z]{2,5}[-_]?[0-9]{2,4}$/i.test(candidateId)) {
        return { machine: undefined, rawId: candidateId.toUpperCase() };
      }
    }
  }

  // Next, scan all known machine IDs directly in the text (sorted by length desc to match ATS03 before AT)
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

  // Date patterns e.g. "14/09/2026", "14/09/2569", "2026-09-14", "วันที่ 14 ก.ย. 2569"
  const dateMatch = text.match(/(?:วันที่|Date)?[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}|\d{4}-\d{2}-\d{2})/i);
  if (dateMatch && dateMatch[1]) {
    date = normalizeThaiDate(dateMatch[1]);
  }

  // Time patterns e.g. "เวลา 08:30", "08.30 น.", "Time: 14:15"
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
 * Extracts problem title and details from lines / text
 */
function detectProblemFromText(text: string, lines: string[]): { title: string; details: string; location: string } {
  let title = '';
  let details = '';
  let location = '';

  // 1. Explicit Problem Label
  const problemMatch = text.match(/(?:อาการเสีย|ปัญหาที่พบ|หัวข้อปัญหา|ลักษณะความชำรุด|อาการชำรุด|ปัญหา|งานที่แจ้ง|Problem|Symptoms|Issue|Defect)[:\s]+([^\n\r]+)/i);
  if (problemMatch && problemMatch[1]) {
    title = problemMatch[1].trim();
  }

  // 2. Explicit Details Label
  const detailMatch = text.match(/(?:รายละเอียดปัญหา|รายละเอียดเพิ่มเติม|ผลกระทบ|Details|Description)[:\s]+([^\n\r]+)/i);
  if (detailMatch && detailMatch[1]) {
    details = detailMatch[1].trim();
  }

  // 3. Explicit Location Label
  const locationMatch = text.match(/(?:จุดที่แจ้งซ่อม|จุดที่ชำรุด|ตำแหน่ง|จุดที่เกิดเหตุ|Location|Position)[:\s]+([^\n\r]+)/i);
  if (locationMatch && locationMatch[1]) {
    location = locationMatch[1].trim();
  }

  // If title is still empty, look through lines for symptom keywords
  if (!title) {
    const symptomLine = lines.find(l => 
      /เสีย|ชำรุด|ไม่ทำงาน|มีเสียงดัง|ร้อน|รั่ว|หลุด|แตก|ขาด|ติดขัด|alarm|error|sensor|motor|belt|heater|ซีลไม่|ตัดไม่/i.test(l) &&
      !/^(วันที่|เวลา|ผู้แจ้ง|รหัส|แผนก)/i.test(l.trim())
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

  const nameMatch = text.match(/(?:ผู้แจ้งซ่อม|ผู้แจ้ง|ชื่อผู้แจ้ง|ผู้รายงาน|Requester|Reported\s*by)[:\s]+([^\n\r\t,]+)/i);
  if (nameMatch && nameMatch[1]) {
    name = nameMatch[1].trim().replace(/(?:เบอร์โทร|โทร|Tel|Phone|แผนก|ฝ่าย).*$/i, '').trim();
  }

  const phoneMatch = text.match(/(?:เบอร์โทร|โทร|Tel|Phone|Ext|เบอร์ต่อ)[:\s]*([0-9\-\s]{4,15})/i) ||
                     text.match(/\b(0[689]\d[-]?\d{3}[-]?\d{4}|\d{4})\b/);
  if (phoneMatch && phoneMatch[1]) {
    phone = phoneMatch[1].trim();
  }

  const deptMatch = text.match(/(?:แผนก|ฝ่าย|ไลน์การผลิต|สังกัด|Department|Line)[:\s]+([^\n\r\t,]+)/i);
  if (deptMatch && deptMatch[1]) {
    dept = deptMatch[1].trim().replace(/(?:ผู้แจ้ง|วันที่|โทร).*$/i, '').trim();
  }

  return { name, phone, dept };
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

  // Split into chunks if there are multiple work requests in the text (e.g. numbered items, "ใบแจ้งซ่อมที่", or lines starting with "-")
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Check if text has multiple delimited work requests
  const chunkSeparators = /(?:--- PAGE \d+ ---|===+|ใบแจ้งซ่อมที่|เลขที่ใบแจ้งซ่อม|Work Order No|REQ-\d+)/i;
  let textChunks = rawText.split(chunkSeparators).map(c => c.trim()).filter(c => c.length > 15);

  if (textChunks.length <= 1) {
    // Check if bulleted list of multiple repairs e.g. "- เครื่อง ATS03 ... \n - เครื่อง FFS02 ..."
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

    const finalMachineId = machine?.id || rawId || 'UNKNOWN';
    const finalMachineName = machine?.name || (finalMachineId !== 'UNKNOWN' ? `เครื่องจักร ${finalMachineId}` : 'เครื่องจักรทั่วไป');
    const finalLineGroup = machine?.lineGroup || machine?.location || requester.dept || 'สายการผลิต';

    results.push({
      tempId: `draft-req-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
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
 */
export async function parseWorkRequestPDF(
  file: File,
  machines: Machine[],
  defaultRequester: string = 'ฝ่ายผลิต'
): Promise<PDFParseWorkRequestResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;

    const pageTexts: string[] = [];
    const allLines: string[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageLines = textContent.items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => (item.str ? item.str.trim() : ''))
        .filter((str: string) => str.length > 0);

      const pageJoined = pageLines.join(' ');
      pageTexts.push(`--- PAGE ${pageNum} ---\n` + pageLines.join('\n'));
      allLines.push(...pageLines);
    }

    const fullText = pageTexts.join('\n\n');
    const items = parseWorkRequestsFromRawText(fullText, machines, defaultRequester, file.name);

    return {
      items,
      rawText: fullText,
      fileName: file.name,
      pageCount: numPages,
      totalFound: items.length
    };
  } catch (err: unknown) {
    console.error('PDF parsing error:', err);
    throw new Error(err instanceof Error ? err.message : 'ไม่สามารถอ่านไฟล์ PDF ได้');
  }
}
