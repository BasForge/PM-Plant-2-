import { PMPlan, PMFrequency, Machine, PMScheduleItem } from '../types';

export const FREQUENCY_INTERVAL_MAP: Record<PMFrequency, number> = {
  'รายวัน': 1,
  'รายสัปดาห์': 7,
  'ราย 2 สัปดาห์': 14,
  'รายเดือน': 30,
  'ราย 3 เดือน': 90,
  'ราย 6 เดือน': 180,
  'รายปี': 365
};

export const FREQUENCY_BADGE_STYLES: Record<PMFrequency, { bg: string; text: string; border: string; label: string; intervalText: string }> = {
  'รายวัน': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'ทุก 1 วัน (Daily)', intervalText: '1 วัน' },
  'รายสัปดาห์': { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30', label: 'ทุกสัปดาห์ (Weekly)', intervalText: '7 วัน' },
  'ราย 2 สัปดาห์': { bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/30', label: 'ทุก 2 สัปดาห์ (Bi-Weekly)', intervalText: '14 วัน' },
  'รายเดือน': { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', label: 'ทุก 1 เดือน (Monthly)', intervalText: '30 วัน' },
  'ราย 3 เดือน': { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/30', label: 'ทุก 3 เดือน (Quarterly)', intervalText: '90 วัน' },
  'ราย 6 เดือน': { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', label: 'ทุก 6 เดือน (Half-Year)', intervalText: '180 วัน' },
  'รายปี': { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30', label: 'ทุก 1 ปี (Annually)', intervalText: '365 วัน' }
};

export type MachineCriticality = 'A' | 'B' | 'C';

export interface CriticalityInfo {
  level: MachineCriticality;
  label: string;
  shortLabel: string;
  desc: string;
  badgeClass: string;
  dotClass: string;
}

/**
 * Calculates machine criticality (A/B/C) based on equipment type, name, and importance
 */
export function getMachineCriticality(machine?: Machine): CriticalityInfo {
  if (!machine) {
    return { 
      level: 'C', 
      label: 'ระดับ C (ทั่วไป)', 
      shortLabel: 'C',
      desc: 'เครื่องจักรรอง/ทั่วไป การหยุดไม่กระทบไลน์ทันที', 
      badgeClass: 'bg-slate-700/60 text-slate-300 border-slate-600',
      dotClass: 'bg-slate-400'
    };
  }
  
  const mName = (machine.name || '').toUpperCase();
  const mId = (machine.id || '').toUpperCase();
  const remark = (machine.remark || '').toUpperCase();

  // Class A: Critical utility & core processing
  if (
    mName.includes('COMPRESSOR') || 
    mName.includes('CHILLER') || 
    mName.includes('BOILER') || 
    mName.includes('PASTEUR') || 
    mName.includes('FILLER') || 
    mName.includes('RETORT') ||
    mName.includes('CNC') ||
    mId.startsWith('CHL') ||
    mId.startsWith('CMP') ||
    mId.startsWith('MCH-001') ||
    mId.startsWith('MCH-002') ||
    remark.includes('วิกฤต') ||
    remark.includes('CRITICAL') ||
    remark.includes('CLASS A')
  ) {
    return { 
      level: 'A', 
      label: 'ระดับ A (วิกฤต)', 
      shortLabel: 'A',
      desc: 'เครื่องจักรสำคัญสูง หยุดทำงานแล้วกระทบทั้งโรงงาน', 
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      dotClass: 'bg-rose-400'
    };
  }

  // Class B: Essential line equipment
  if (
    mName.includes('PUMP') || 
    mName.includes('CUTTER') || 
    mName.includes('WASHER') || 
    mName.includes('MIXER') || 
    mName.includes('SEALER') || 
    mName.includes('CONVEYOR') ||
    mName.includes('PACK') ||
    mId.startsWith('PMP') ||
    mId.startsWith('CUT') ||
    mId.startsWith('RIM') ||
    mId.startsWith('VAC') ||
    remark.includes('CLASS B')
  ) {
    return { 
      level: 'B', 
      label: 'ระดับ B (สำคัญ)', 
      shortLabel: 'B',
      desc: 'เครื่องจักรหลักประจำไลน์ มีผลกระทบต่ออัตราผลิต', 
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      dotClass: 'bg-amber-400'
    };
  }

  // Class C: General equipment
  return { 
    level: 'C', 
    label: 'ระดับ C (ทั่วไป)', 
    shortLabel: 'C',
    desc: 'เครื่องจักรทั่วไป มีเครื่องสำรองหรือซ่อมบำรุงไม่เร่งด่วน', 
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    dotClass: 'bg-sky-400'
  };
}

/**
 * Returns week index (1 to 5) of the month from a date string (YYYY-MM-DD)
 */
export function getWeekOfMonth(dateStr: string): number {
  if (!dateStr) return 1;
  const parts = dateStr.split('-');
  const day = parseInt(parts[2], 10) || 1;
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  if (day <= 28) return 4;
  return 5;
}

/**
 * Returns date range string for week 1 to 5 of a given month
 */
export function getWeekDateRange(week: number, monthName: string): string {
  switch (week) {
    case 1: return `1-7 ${monthName}`;
    case 2: return `8-14 ${monthName}`;
    case 3: return `15-21 ${monthName}`;
    case 4: return `22-28 ${monthName}`;
    case 5: return `29-31 ${monthName}`;
    default: return `W${week}`;
  }
}

/**
 * Returns planned months (1-12) for a given frequency in a standard annual maintenance calendar
 */
export function getPlannedMonthsForFrequency(frequency: PMFrequency): number[] {
  switch (frequency) {
    case 'รายวัน':
    case 'รายสัปดาห์':
    case 'ราย 2 สัปดาห์':
    case 'รายเดือน':
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    case 'ราย 3 เดือน':
      return [3, 6, 9, 12];
    case 'ราย 6 เดือน':
      return [6, 12];
    case 'รายปี':
      return [12];
    default:
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  }
}

/**
 * Calculates next due date based on last completion date or default offset
 */
export function calculateNextDueDate(lastDateStr: string | undefined, frequency: PMFrequency, fallbackDate: string): string {
  const baseDate = lastDateStr ? new Date(lastDateStr) : new Date(fallbackDate);
  const daysToAdd = FREQUENCY_INTERVAL_MAP[frequency] || 30;
  baseDate.setDate(baseDate.getDate() + daysToAdd);
  const y = baseDate.getFullYear();
  const m = String(baseDate.getMonth() + 1).padStart(2, '0');
  const d = String(baseDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Generates recommended Time-Based Maintenance (TBM) plans for a machine according to its equipment type
 */
export function generateRecommendedTbmPlans(machine: Machine): PMPlan[] {
  const mId = machine.id;
  const mName = machine.name.toUpperCase();
  const now = Date.now();

  const plans: PMPlan[] = [];

  // 1. Daily autonomous check (รายวัน)
  plans.push({
    id: `tbm-${mId}-daily-${now}`,
    machineId: mId,
    title: `ตรวจเช็คความพร้อมก่อนเดินเครื่อง & ระบบสุขาภิบาลประจำวัน (${machine.id})`,
    frequency: 'รายวัน',
    intervalDays: 1,
    category: 'Sanitation',
    spareParts: 'น้ำยาทำความสะอาด Food Grade, ผ้าไมโครไฟเบอร์',
    steps: [
      { title: 'ตรวจสอบสภาพภายนอก รอยแตกร้าว และความสะอาดพื้นที่ติดตั้ง', stdTime: 5 },
      { title: 'ตรวจเช็คจุดยึด ปลั๊กไฟ สายดิน และท่อลมแรงดัน', stdTime: 5 },
      { title: 'ทดสอบปุ่ม Emergency Stop และสัญญาณเตือนความปลอดภัย', stdTime: 5 }
    ],
    ttm: 15,
    targetMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  });

  // 2. Weekly mechanical & lubrication inspection (รายสัปดาห์)
  if (mName.includes('MIXER') || mName.includes('CONVEYOR') || mName.includes('SEAL') || mName.includes('COOLER')) {
    plans.push({
      id: `tbm-${mId}-weekly-${now}`,
      machineId: mId,
      title: `ตรวจเช็คระบบขับเคลื่อน สายพาน ลูกปืน และการหล่อลื่นประจำสัปดาห์`,
      frequency: 'รายสัปดาห์',
      intervalDays: 7,
      category: 'Lubrication',
      spareParts: 'จาระบีสังเคราะห์ Food Grade NSF H1, น้ำมันหล่อลื่น',
      steps: [
        { title: 'ตรวจสอบความตึงและการสึกหรอของสายพานขับ/โซ่ลำเลียง', stdTime: 10 },
        { title: 'อัดจาระบีชุดตลับลูกปืนแบริ่งแกนหมุนหลัก', stdTime: 15 },
        { title: 'ตรวจเช็คระดับเสียงการทำงานและตรวจการสั่นสะเทือน (Vibration)', stdTime: 10 }
      ],
      ttm: 35,
      targetMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    });
  }

  // 3. Monthly deep maintenance (รายเดือน)
  plans.push({
    id: `tbm-${mId}-monthly-${now}`,
    machineId: mId,
    title: `บำรุงรักษาเชิงป้องกันประจำเดือน: ระบบนิวเมติกส์ & ตู้ควบคุมไฟฟ้า`,
    frequency: 'รายเดือน',
    intervalDays: 30,
    category: 'Pneumatic',
    spareParts: 'ไส้กรองอากาศลม, ซีลโอริงสำรอง',
    steps: [
      { title: 'เดรนน้ำทิ้งและทำความสะอาดไส้กรองลม Air Filter Regulator', stdTime: 10 },
      { title: 'ตรวจเช็คโซลินอยด์วาล์ว กระบอกสูบลม และทดสอบรอยรั่ว', stdTime: 15 },
      { title: 'กวดขันขั้วต่อสายไฟในตู้ควบคุม (Terminal Retorque) และเป่าฝุ่น', stdTime: 20 },
      { title: 'ตรวจสอบกระแสไฟฟ้า (Amp Clamp) ของมอเตอร์ขับเคลื่อนขณะโหลด', stdTime: 15 }
    ],
    ttm: 60,
    targetMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  });

  // 4. Quarterly sensor calibration & wear parts replacement (ราย 3 เดือน)
  plans.push({
    id: `tbm-${mId}-quarterly-${now}`,
    machineId: mId,
    title: `ตรวจวัดค่าเทียบมาตรฐาน Calibrate เซนเซอร์ & ตรวจวัดอุณหภูมิความร้อน (3 เดือน)`,
    frequency: 'ราย 3 เดือน',
    intervalDays: 90,
    category: 'Electrical',
    spareParts: 'เซนเซอร์โฟโต้, เทอร์โมคัปเปิลสำรอง',
    steps: [
      { title: 'ทำความสะอาดเลนส์เซนเซอร์ตาแมว และปรับตั้งระยะตรวจจับ', stdTime: 15 },
      { title: 'วัดเทียบอุณหภูมิหัวฮีตเตอร์และตรวจเช็คโซลิดสเตตรีเลย์ (SSR)', stdTime: 20 },
      { title: 'ตรวจเช็คความสึกหรอของใบมีดตัด ซีลยางสุญญากาศ หรือบูชแกนหมุน', stdTime: 25 }
    ],
    ttm: 60,
    targetMonths: [3, 6, 9, 12]
  });

  // 5. Yearly major inspection & overhaul (รายปี)
  plans.push({
    id: `tbm-${mId}-yearly-${now}`,
    machineId: mId,
    title: `โอเวอร์ฮอลย่อย (Minor Overhaul) ตรวจวัดฉนวนมอเตอร์ & เปลี่ยนถ่ายน้ำมันเกียร์ประจำปี`,
    frequency: 'รายปี',
    intervalDays: 365,
    category: 'Mechanical',
    spareParts: 'น้ำมันเกียร์อุตสาหกรรม, ชุดซีลกันน้ำมัน, ปะเก็นฝาครอบ',
    steps: [
      { title: 'ถ่ายน้ำมันเกียร์ทดรอบ ล้างอ่างเกียร์ และเติมน้ำมันใหม่', stdTime: 40 },
      { title: 'วัดค่าความเป็นฉนวนมอเตอร์ (Megger Test Insulation Resistance)', stdTime: 25 },
      { title: 'ตรวจสอบ Alignment และแกนเพลาขับเคลื่อนอย่างละเอียด', stdTime: 30 },
      { title: 'ทดสอบประสิทธิภาพการทำงานเต็มพิกัดและบันทึกมาตรฐาน TBM ประจำปี', stdTime: 25 }
    ],
    ttm: 120,
    targetMonths: [12]
  });

  return plans;
}
