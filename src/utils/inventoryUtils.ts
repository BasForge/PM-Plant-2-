import { SparePart, StockTransaction } from '../types';

export type StockLevelStatus = 'OUT' | 'LOW' | 'OK' | 'OVER';

export const SPARE_PART_CATEGORIES = [
  'สายพานและระบบส่งกำลัง',
  'อุปกรณ์ไฟฟ้าและเซนเซอร์',
  'ลูกปืนและตลับลูกปืน',
  'ระบบเครื่องกล / เพลา / บูช',
  'ใบมีดและชิ้นส่วนตัด',
  'นิวเมติกส์และซีล',
  'ความร้อนและเทอร์โมคัปเปิล',
  'วัสดุสิ้นเปลืองและทั่วไป'
] as const;

export function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getEffectiveMaxStock(part: SparePart): number {
  if (typeof part.maxStock === 'number' && part.maxStock > 0) {
    return part.maxStock;
  }
  const minVal = Math.max(0, Number(part.minRequired) || 0);
  return minVal > 0 ? minVal * 2 : 0;
}

export function getStockLevelStatus(part: SparePart): StockLevelStatus {
  const qty = Number(part.quantity) || 0;
  const minVal = Math.max(0, Number(part.minRequired) || 0);
  const maxVal = typeof part.maxStock === 'number' && part.maxStock > 0 ? part.maxStock : 0;

  if (qty <= 0) return 'OUT';
  if (qty <= minVal) return 'LOW';
  if (maxVal > 0 && qty > maxVal) return 'OVER';
  return 'OK';
}

export function getSuggestedOrderQty(part: SparePart): number {
  const status = getStockLevelStatus(part);
  if (status !== 'OUT' && status !== 'LOW') return 0;
  const qty = Math.max(0, Number(part.quantity) || 0);
  const targetMax = getEffectiveMaxStock(part);
  if (targetMax > qty) return targetMax - qty;
  const minVal = Math.max(1, Number(part.minRequired) || 1);
  return Math.max(1, minVal * 2 - qty);
}

export function formatThaiShortDate(isoDate?: string): string {
  if (!isoDate) return '-';
  const trimmed = isoDate.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (!match) return trimmed;
  const months = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const yBe = String(Number(match[1]) + 543).slice(-2);
  const mIdx = Number(match[2]);
  const d = Number(match[3]);
  return `${d} ${months[mIdx] || match[2]} ${yBe}`;
}

/**
 * Parses Excel serial numbers, M/D/YYYY (e.g. 7/15/2026), D/M/YYYY, YYYY-MM-DD, and Buddhist Era years into YYYY-MM-DD.
 */
export function parseExcelOrTextDate(raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return '';

  // Date object directly from XLSX cellDates
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    let y = raw.getFullYear();
    if (y > 2400) y -= 543;
    const m = String(raw.getMonth() + 1).padStart(2, '0');
    const d = String(raw.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Excel serial date number (e.g. 46218)
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 25000 && raw < 90000) {
    const utcDays = Math.floor(raw - 25569);
    const utcMs = utcDays * 86400 * 1000;
    const date = new Date(utcMs);
    if (!Number.isNaN(date.getTime())) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const str = String(raw).trim();
  if (!str) return '';

  // ISO YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(str);
  if (isoMatch) {
    let y = Number(isoMatch[1]);
    if (y > 2400) y -= 543;
    return `${y}-${String(Number(isoMatch[2])).padStart(2, '0')}-${String(Number(isoMatch[3])).padStart(2, '0')}`;
  }

  // Slash or dash date: M/D/YYYY (like SAP export 7/15/2026) or D/M/YYYY (like 15/7/2026)
  const slashMatch = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/.exec(str);
  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    let year = Number(slashMatch[3]);
    if (year < 100) year += 2000;
    if (year > 2400) year -= 543;

    let month: number;
    let day: number;
    if (first > 12 && second <= 12) {
      // Unambiguously D/M/YYYY
      day = first;
      month = second;
    } else if (second > 12 && first <= 12) {
      // Unambiguously M/D/YYYY (SAP standard like 7/15/2026, 7/31/2026)
      month = first;
      day = second;
    } else {
      // Ambiguous (both <= 12): default to M/D/YYYY if year is CE 2000+ (SAP export format)
      month = first;
      day = second;
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return '';
}

export function parseNumericCell(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (raw === null || raw === undefined) return 0;
  const cleaned = String(raw).replace(/,/g, '').replace(/[^\d.-]/g, '').trim();
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

export function inferPartCategory(partName: string): string {
  const lower = partName.toLowerCase();
  if (/สายพาน|belt|pulley|คัปปลิ้ง|coupling|โซ่|chain/.test(lower)) {
    return 'สายพานและระบบส่งกำลัง';
  }
  if (/เซนเซอร์|sensor|omron|ifm|panasonic|สวิตช์|switch|relay|รีเลย์|อินเวอร์เตอร์|มอเตอร์/.test(lower)) {
    return 'อุปกรณ์ไฟฟ้าและเซนเซอร์';
  }
  if (/ลูกปืน|bearing|ucp|ucf|pillow|620|630|r1510/.test(lower)) {
    return 'ลูกปืนและตลับลูกปืน';
  }
  if (/ใบมีด|blade|knife|สไลด์|cutter/.test(lower)) {
    return 'ใบมีดและชิ้นส่วนตัด';
  }
  if (/thermocouple|เทอร์โม|heater|ฮีตเตอร์|ความร้อน|pt100/.test(lower)) {
    return 'ความร้อนและเทอร์โมคัปเปิล';
  }
  if (/ซีล|seal|โอริง|o-ring|กระบอกลม|โซลินอยด์|solenoid|วาล์ว|valve|สายลม/.test(lower)) {
    return 'นิวเมติกส์และซีล';
  }
  if (/บูช|เพลา|shaft|roller|ลูกกลิ้ง|สปริง|spring|เฟือง|gear/.test(lower)) {
    return 'ระบบเครื่องกล / เพลา / บูช';
  }
  return 'วัสดุสิ้นเปลืองและทั่วไป';
}

export interface InventoryImportColumnMap {
  sku: string;
  name: string;
  category: string;
  unit: string;
  pricePerUnit: string;
  supplier: string;
  machine: string;
  location: string;
  minRequired: string;
  maxStock: string;
  requisitionDate: string;
  receiveDate: string;
  issueDate: string;
  prNo: string;
  poNo: string;
  qtyRequested: string;
  receivedQty: string;
  issuedQty: string;
  remainingQty: string;
  status: string;
  workRequestNo: string;
}

export const EMPTY_IMPORT_MAP: InventoryImportColumnMap = {
  sku: '',
  name: '',
  category: '',
  unit: '',
  pricePerUnit: '',
  supplier: '',
  machine: '',
  location: '',
  minRequired: '',
  maxStock: '',
  requisitionDate: '',
  receiveDate: '',
  issueDate: '',
  prNo: '',
  poNo: '',
  qtyRequested: '',
  receivedQty: '',
  issuedQty: '',
  remainingQty: '',
  status: '',
  workRequestNo: ''
};

export function autoDetectInventoryColumns(headers: string[]): InventoryImportColumnMap {
  const map: InventoryImportColumnMap = { ...EMPTY_IMPORT_MAP };
  const used = new Set<string>();

  const findHeader = (patterns: RegExp[]): string => {
    for (const pattern of patterns) {
      const match = headers.find((h) => !used.has(h) && pattern.test(h.trim().toLowerCase()));
      if (match) {
        used.add(match);
        return match;
      }
    }
    return '';
  };

  map.sku = findHeader([/^sku$/, /รหัสอะไหล่/, /part\s*code/, /material\s*(no|code)/, /^รหัส$/]);
  map.name = findHeader([/short\s*text/, /ชื่ออะไหล่/, /รายการอะไหล่/, /description/, /part\s*name/, /^ชื่อ$/]);
  map.requisitionDate = findHeader([/requisition\s*date/, /วันที่ขอซื้อ/, /pr\s*date/]);
  map.receiveDate = findHeader([/วันที่รับเข้า/, /receive\s*date/, /วันที่รับ/]);
  map.issueDate = findHeader([/วันที่จ่ายออก/, /issue\s*date/, /วันที่เบิก/]);
  map.prNo = findHeader([/purchase\s*requisition/, /^pr(\s*no)?$/, /เลข\s*pr/]);
  map.poNo = findHeader([/purchase\s*order/, /^po(\s*no)?$/, /เลข\s*po/]);
  map.qtyRequested = findHeader([/quantity\s*requested/, /จำนวนสั่งซื้อ/, /order\s*qty/]);
  map.unit = findHeader([/unit\s*of\s*measure/, /^uom$/, /หน่วยนับ/, /^หน่วย$/, /^unit$/]);
  map.pricePerUnit = findHeader([/valuation\s*price/, /ราคาต่อหน่วย/, /unit\s*price/, /^ราคา$/, /^price$/]);
  map.supplier = findHeader([/name\s*of\s*desired\s*supplier/, /supplier/, /vendor/, /ซัพพลายเออร์/, /ผู้ขาย/, /ร้านค้า/]);
  map.machine = findHeader([/^เครื่อง$/, /เครื่องจักร/, /machine/]);
  map.status = findHeader([/^สถานะ$/, /^status$/]);
  map.receivedQty = findHeader([/^รับเข้า$/, /จำนวนรับเข้า/, /received\s*qty/, /stock\s*in/]);
  map.issuedQty = findHeader([/^จ่าย$/, /จ่ายออก/, /จำนวนจ่าย/, /เบิกออก/, /issued\s*qty/, /stock\s*out/]);
  map.remainingQty = findHeader([/จำนวนคงเหลือ/, /คงเหลือ/, /balance/, /remaining/, /^quantity$/, /^qty$/, /stock/]);
  map.workRequestNo = findHeader([/ใบเบิก/, /เลขที่แจ้งซ่อม/, /work\s*request/, /ticket/, /wr\s*no/]);
  map.minRequired = findHeader([/^min/, /ขั้นต่ำ/, /safety\s*stock/, /จุดสั่งซื้อ/]);
  map.maxStock = findHeader([/^max/, /สูงสุด/, /สต๊อกสูงสุด/]);
  map.location = findHeader([/location/, /ตำแหน่ง/, /ชั้นวาง/, /ตู้/, /shelf/, /bin/]);
  map.category = findHeader([/category/, /หมวดหมู่/, /ประเภท/]);

  return map;
}

export interface BuildImportOptions {
  fillDownSupplier: boolean;
  groupSamePartName: boolean;
  generateStockTransactions: boolean;
  autoMinMaxWhenMissing: boolean;
  defaultMin: number;
  defaultMaxMultiplier: number;
  defaultLocation: string;
  operatorName: string;
  existingParts: SparePart[];
}

export interface InventoryImportResult {
  parts: SparePart[];
  transactions: StockTransaction[];
  rawRowCount: number;
  mergedDuplicateCount: number;
  filledSupplierCount: number;
}

export function buildInventoryImportPreview(
  rawRows: Record<string, unknown>[],
  colMap: InventoryImportColumnMap,
  options: BuildImportOptions
): InventoryImportResult {
  const today = getTodayIso();
  const createdAt = new Date().toISOString();

  // Compute starting sequential SKU index from existing SP-XXX parts
  let maxSeq = options.existingParts.reduce((max, p) => {
    const m = /^SP-(\d+)$/i.exec(p.id.trim());
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);

  const existingByName = new Map<string, SparePart>();
  const existingById = new Map<string, SparePart>();
  options.existingParts.forEach((p) => {
    existingByName.set(p.name.trim().toLowerCase(), p);
    existingById.set(p.id.trim().toUpperCase(), p);
  });

  const partsMap = new Map<string, SparePart>();
  const transactions: StockTransaction[] = [];

  let lastSupplier = '';
  let lastPoNo = '';
  let filledSupplierCount = 0;
  let mergedDuplicateCount = 0;
  let validRowCount = 0;

  rawRows.forEach((row, idx) => {
    const getCell = (colName: string) => (colName ? row[colName] : undefined);

    const rawName = String(getCell(colMap.name) ?? '').trim();
    if (!rawName) return; // skip blank lines
    validRowCount += 1;

    const rawSku = String(getCell(colMap.sku) ?? '').trim().toUpperCase();
    const prNo = String(getCell(colMap.prNo) ?? '').trim();
    const poNo = String(getCell(colMap.poNo) ?? '').trim();
    const reqDate = parseExcelOrTextDate(getCell(colMap.requisitionDate));
    const explicitReceiveDate = parseExcelOrTextDate(getCell(colMap.receiveDate));
    const explicitIssueDate = parseExcelOrTextDate(getCell(colMap.issueDate));
    const receiveDate = explicitReceiveDate || reqDate || today;
    const issueDate = explicitIssueDate || receiveDate || today;

    let supplier = String(getCell(colMap.supplier) ?? '').trim();
    if (!supplier && options.fillDownSupplier && lastSupplier && (!poNo || poNo === lastPoNo)) {
      supplier = lastSupplier;
      filledSupplierCount += 1;
    }
    if (supplier) {
      lastSupplier = supplier;
    }
    if (poNo) {
      lastPoNo = poNo;
    }

    const unit = String(getCell(colMap.unit) ?? '').trim() || 'EA';
    const price = parseNumericCell(getCell(colMap.pricePerUnit));
    const rawMachine = String(getCell(colMap.machine) ?? '').trim();
    const machinesArr = rawMachine
      ? rawMachine
          .split(/[,;/\n]+/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const statusText = String(getCell(colMap.status) ?? '').trim();
    const workRequestNo = String(getCell(colMap.workRequestNo) ?? '').trim();
    const location = String(getCell(colMap.location) ?? '').trim() || options.defaultLocation;
    const category = String(getCell(colMap.category) ?? '').trim() || inferPartCategory(rawName);

    const receivedQty = parseNumericCell(getCell(colMap.receivedQty));
    const issuedQty = parseNumericCell(getCell(colMap.issuedQty));
    const rawRemCell = getCell(colMap.remainingQty);
    const hasExplicitRemaining = rawRemCell !== undefined && rawRemCell !== null && String(rawRemCell).trim() !== '';
    const qtyRequested = parseNumericCell(getCell(colMap.qtyRequested));

    let rowBalance = hasExplicitRemaining
      ? Math.max(0, parseNumericCell(rawRemCell))
      : Math.max(0, receivedQty - issuedQty);

    // If user uploaded a pure master stock sheet where receivedQty is 0 and remainingQty is populated
    const effectiveReceiveQty = receivedQty > 0 ? receivedQty : (!hasExplicitRemaining && qtyRequested > 0 ? qtyRequested : 0);
    if (!hasExplicitRemaining && receivedQty === 0 && qtyRequested > 0) {
      rowBalance = Math.max(0, qtyRequested - issuedQty);
    }

    const rawMinCell = getCell(colMap.minRequired);
    const hasMin = rawMinCell !== undefined && rawMinCell !== null && String(rawMinCell).trim() !== '';
    const rawMaxCell = getCell(colMap.maxStock);
    const hasMax = rawMaxCell !== undefined && rawMaxCell !== null && String(rawMaxCell).trim() !== '';

    const calcDefaultMin = () => {
      if (!options.autoMinMaxWhenMissing) return options.defaultMin;
      const base = Math.max(rowBalance, effectiveReceiveQty, qtyRequested);
      if (base >= 15) return Math.max(2, Math.round(base * 0.25));
      if (base >= 4) return Math.max(1, Math.floor(base * 0.5));
      return 1;
    };

    const rowMin = hasMin ? Math.max(0, parseNumericCell(rawMinCell)) : calcDefaultMin();
    const rowMax = hasMax
      ? Math.max(rowMin, parseNumericCell(rawMaxCell))
      : Math.max(rowMin * options.defaultMaxMultiplier, rowBalance, effectiveReceiveQty, rowMin + 1);

    // Determine dedupe key
    const normalizedName = rawName.toLowerCase();
    const groupKey = rawSku
      ? `SKU:${rawSku}`
      : options.groupSamePartName
      ? `NAME:${normalizedName}`
      : `ROW:${idx}`;

    let existingInBatch = partsMap.get(groupKey);
    let resolvedId = rawSku;

    if (!existingInBatch) {
      if (rawSku && existingById.has(rawSku)) {
        resolvedId = rawSku;
      } else if (options.groupSamePartName && existingByName.has(normalizedName)) {
        resolvedId = existingByName.get(normalizedName)!.id;
      } else if (!resolvedId) {
        maxSeq += 1;
        resolvedId = `SP-${String(maxSeq).padStart(3, '0')}`;
      }

      const newPart: SparePart = {
        id: resolvedId,
        name: rawName,
        category,
        machineIds: machinesArr,
        quantity: rowBalance,
        minRequired: rowMin,
        maxStock: rowMax,
        unit,
        location,
        pricePerUnit: price,
        supplier: supplier || undefined,
        lastRestockedDate: receiveDate,
        lastReceiveDate: effectiveReceiveQty > 0 ? receiveDate : undefined,
        lastIssueDate: issuedQty > 0 ? issueDate : undefined,
        lastPRNo: prNo || undefined,
        lastPONo: poNo || undefined,
        workRequestNo: workRequestNo || undefined,
        lastWorkRequestNo: workRequestNo || undefined,
        specifications: statusText ? `สถานะนำเข้า: ${statusText}` : undefined
      };
      partsMap.set(groupKey, newPart);
      existingInBatch = newPart;
    } else {
      mergedDuplicateCount += 1;
      const mergedMachines = Array.from(new Set([...existingInBatch.machineIds, ...machinesArr]));
      existingInBatch.machineIds = mergedMachines;
      existingInBatch.quantity += rowBalance;
      if (price > 0) existingInBatch.pricePerUnit = price;
      if (supplier && !existingInBatch.supplier) existingInBatch.supplier = supplier;
      if (effectiveReceiveQty > 0 && (!existingInBatch.lastReceiveDate || receiveDate > existingInBatch.lastReceiveDate)) {
        existingInBatch.lastReceiveDate = receiveDate;
        existingInBatch.lastRestockedDate = receiveDate;
      }
      if (issuedQty > 0 && (!existingInBatch.lastIssueDate || issueDate > existingInBatch.lastIssueDate)) {
        existingInBatch.lastIssueDate = issueDate;
      }
      if (prNo) existingInBatch.lastPRNo = prNo;
      if (poNo) existingInBatch.lastPONo = poNo;
      if (workRequestNo) existingInBatch.lastWorkRequestNo = workRequestNo;
      if (existingInBatch.maxStock && existingInBatch.quantity > existingInBatch.maxStock && !hasMax) {
        existingInBatch.maxStock = Math.max(existingInBatch.maxStock, existingInBatch.quantity);
      }
    }

    // Generate Stock Card Transactions (IN & OUT)
    if (options.generateStockTransactions) {
      if (effectiveReceiveQty > 0) {
        transactions.push({
          id: `TX-IMP-IN-${Date.now()}-${idx}`,
          partId: existingInBatch.id,
          partName: rawName,
          type: 'IN',
          date: receiveDate,
          quantity: effectiveReceiveQty,
          balanceBefore: Math.max(0, existingInBatch.quantity - rowBalance),
          balanceAfter: Math.max(0, existingInBatch.quantity - rowBalance + effectiveReceiveQty),
          unit,
          unitPrice: price,
          totalValue: effectiveReceiveQty * price,
          prNo: prNo || undefined,
          poNo: poNo || undefined,
          requisitionDate: reqDate || undefined,
          supplier: supplier || undefined,
          machineName: rawMachine || undefined,
          operatorName: options.operatorName,
          note: statusText ? `นำเข้า Excel (${statusText})` : 'นำเข้าจากไฟล์ Excel',
          createdAt
        });
      }

      if (issuedQty > 0) {
        transactions.push({
          id: `TX-IMP-OUT-${Date.now()}-${idx}`,
          partId: existingInBatch.id,
          partName: rawName,
          type: 'OUT',
          date: issueDate,
          quantity: issuedQty,
          balanceBefore: existingInBatch.quantity + issuedQty,
          balanceAfter: existingInBatch.quantity,
          unit,
          unitPrice: price,
          totalValue: issuedQty * price,
          machineName: rawMachine || undefined,
          workRequestNo: workRequestNo || undefined,
          operatorName: options.operatorName,
          note: workRequestNo ? `เบิกจ่ายตามใบเบิก/แจ้งซ่อม ${workRequestNo} (นำเข้า Excel)` : 'บันทึกจ่ายออกจากไฟล์ Excel',
          createdAt
        });
      }
    }
  });

  return {
    parts: Array.from(partsMap.values()),
    transactions,
    rawRowCount: validRowCount,
    mergedDuplicateCount,
    filledSupplierCount
  };
}
