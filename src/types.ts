export interface Machine {
  id: string; // รหัสอุปกรณ์ ID e.g. "VEG01"
  name: string; // รายชื่อเครื่องจักร e.g. "VEGETABLE WASHER"
  lineGroup: string; // ไลน์ / กลุ่มการผลิต e.g. "VEGETABLE PROCESSING ROOM"
  orderNo?: number; // ลำดับที่ในทะเบียน
  model?: string; // Model (รุ่น)
  power?: string; // แรงดัน/กำลังไฟ
  installDate?: string; // วันที่ติดตั้ง
  vendor?: string; // บริษัทผู้ขาย(เบอร์ติดต่อ)
  location?: string; // ตำแหน่งที่ติดตั้ง
  serialNumber?: string; // Serial Number
  remark?: string; // หมายเหตุ เช่น "ยกเลิกใช้", "ใช้งบโรง 1", "สลัด"
  status?: 'ปกติ' | 'เสีย/ซ่อม' | 'ยกเลิกใช้'; // สถานะ
  plannedProductionHours?: number; // เวลาที่วางแผนให้เครื่องจักรพร้อมสำหรับการผลิต Planned Production Time (ชม./เดือน เช่น 600 ชม.)
  ranking?: 'A' | 'B' | 'C' | string; // Rank ระดับความสำคัญของเครื่องจักร เช่น A (วิกฤต), B (สำคัญ), C (ทั่วไป)
}

export type PMFrequency = 'รายวัน' | 'รายสัปดาห์' | 'ราย 2 สัปดาห์' | 'รายเดือน' | 'ราย 3 เดือน' | 'ราย 6 เดือน' | 'รายปี';

export interface PMStep {
  itemNo?: number | string; // ลำดับ เช่น 1, 2, 5.1
  title: string; // หัวข้อ PM
  method?: string; // วิธีการ เช่น ดูด้วยสายตา, เครื่องมือวัด, เครื่องมือ, มือ สายตา, ประสาทสัมผัสทั้ง 5
  standard?: string; // มาตรฐาน / เกณฑ์ยอมรับ เช่น โครงสร้างสมบูรณ์ ไม่มีส่วนชำรุด, แรงดัน 342-418V
  frequency?: string; // ความถี่ เช่น 1 เดือน/ครั้ง, 6 เดือน/ครั้ง
  stdTime: number; // in minutes (เวลามาตรฐาน)
  result?: 'ปกติ' | 'ไม่ปกติ' | ''; // ผลการ PM
  abnormalityDetail?: string; // รายละเอียดสิ่งที่ผิดปกติ
  remark?: string; // หมายเหตุ
}

export interface PMPlan {
  id: string;
  machineId: string;
  title: string;
  frequency: PMFrequency;
  steps: PMStep[];
  spareParts?: string;
  ttm: number; // in minutes (sum of stdTime of all steps)
  docCode?: string; // รหัสเอกสาร เช่น F-QMS-011/12
  revision?: string; // แก้ไขครั้งที่ เช่น 00
  effectiveDate?: string; // วันที่เริ่มใช้ เช่น 16-07-2019
  machineName?: string; // ชื่อเครื่องจักรในเอกสาร
  signTech?: string; // ผู้ทำการ PM (ทีมช่าง)
  signProd?: string; // ผู้รับทราบทำการ PM (ฝ่ายผลิต)
  signLeader?: string; // ผู้ตรวจสอบทำการ PM (หัวหน้าหน่วย PM)
  repairPartsNotes?: string; // รายการอะไหล่ที่เตรียมแก้ไข
  intervalDays?: number; // รอบวัน TBM เช่น 1, 7, 14, 30, 90, 180, 365 วัน
  category?: 'Mechanical' | 'Electrical' | 'Pneumatic' | 'Lubrication' | 'Sanitation' | 'General';
  targetMonths?: number[]; // เดือนตามแผน [1-12]
  targetWeeks?: number[]; // สัปดาห์ตามแผน [1-52]
  lastCompletedDate?: string; // YYYY-MM-DD
  nextDueDate?: string; // YYYY-MM-DD
}

export interface PMRescheduleHistoryItem {
  id: string;
  fromDate: string; // วันที่เดิมก่อนเลื่อน
  toDate: string; // วันที่ใหม่ที่เลื่อนไป
  reason: string; // สาเหตุการเลื่อนแผน
  rescheduledAt: string; // วันเวลาที่ทำรายการเลื่อน
  byTech?: string; // ผู้บันทึกการเลื่อนแผน
  notes?: string; // หมายเหตุเพิ่มเติม
}

export interface UsedPartItem {
  partId: string;
  partName?: string; // ชื่ออะไหล่ที่ใช้ (กรณีอะไหล่นอกคลัง หรือพิมพ์ระบุเอง)
  quantity: number;
  pricePerUnit: number;
  totalCost: number;
  isCustom?: boolean; // true หากเป็นอะไหล่ที่พิมพ์ระบุเพิ่มเองนอกคลัง
  unit?: string; // หน่วยนับ เช่น ชิ้น, ตัว, เมตร, ชุด
}

export interface PMScheduleItem {
  id: string;
  type: 'PM';
  technician: string;
  technicians?: string[]; // ช่างที่ปฏิบัติงานร่วมกัน
  date: string; // YYYY-MM-DD
  machineId: string;
  pmPlanId: string;
  status: 'รอดำเนินการ' | 'กำลังทำ' | 'เสร็จสิ้น';
  duration: number; // TTM in minutes
  actualDuration?: number; // actual time spent on PM tasks in minutes
  overtimeReason?: string; // สาเหตุที่ใช้เวลาเกินเกณฑ์มาตรฐาน (Overtime / Delay Reason)
  usedParts?: UsedPartItem[];
  otherCost?: number;
  rescheduledFromDate?: string; // วันที่ตามแผนเดิมก่อนเลื่อน
  rescheduledReason?: string; // เหตุผลในการเลื่อนแผน (เช่น เครื่องติดไลน์ผลิตเร่งด่วน, รออะไหล่)
  rescheduledCount?: number; // จำนวนครั้งที่มีการเลื่อนแผน
  rescheduleHistory?: PMRescheduleHistoryItem[]; // ประวัติการเลื่อนแผนแต่ละครั้ง
  title?: string; // ชื่องาน PM หรือรายละเอียดงาน
  notes?: string; // หมายเหตุหรือข้อควรระวัง
}

export interface OperationScheduleItem {
  id: string;
  type: 'Operation';
  technician: string;
  technicians?: string[]; // ช่างที่ปฏิบัติงานร่วมกัน
  date: string; // YYYY-MM-DD
  line: string; // production line name
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  isWeeklyRecurring: boolean;
  recurringDays: number[]; // 0 for Sun, 1 for Mon, etc.
  duration: number; // in minutes (end - start)
}

export type StoppageType = 'BREAKDOWN' | 'MINOR_STOPPAGE' | 'ADJUSTMENT_LOSS' | 'SHUTDOWN' | 'STARTUP';

export interface CPRAMLossItem {
  lossNumber: number;
  type: StoppageType;
  thaiName: string;
  definition: string;
  topicName: string;
  downtimeType: 'Downtime' | 'Performance' | 'Plan Downtime';
  unit: string;
  examples: string[];
}

export const CPRAM_LOSSES_STANDARD: {
  title: string;
  updateDate: string;
  version: string;
  company: string;
  losses: CPRAMLossItem[];
} = {
  title: 'มาตรฐานนิยาม 5 หัวข้อเครื่องหยุดและความสูญเสีย (Update09. 19/05/25 (Losses Type 1-20))',
  updateDate: '19/05/25',
  version: 'Update09',
  company: 'มาตรฐานโรงงาน (Plant 2)',
  losses: [
    {
      lossNumber: 1,
      type: 'SHUTDOWN',
      thaiName: '1. ความสูญเสียจากการหยุดตามแผน (Shutdown losses)',
      definition: 'เวลาที่เครื่องจักรหยุดตามแผนที่กำหนดล่วงหน้า (Plan Downtime)',
      topicName: 'Shutdown / Plan Downtime',
      downtimeType: 'Plan Downtime',
      unit: 'ชั่วโมง / นาที',
      examples: [
        'ล้างทำความสะอาดเครื่องจักรประจำสัปดาห์/เดือนตามแผนที่กำหนดไว้',
        'การซ่อมบำรุงรักษาเชิงป้องกันตามแผน (PM Planned Maintenance)',
        'การจัดฝึกอบรมพนักงาน หรือวันหยุดตามประเพณีของโรงงาน'
      ]
    },
    {
      lossNumber: 4,
      type: 'BREAKDOWN',
      thaiName: '4. ความสูญเสียจากการชำรุดเสียหายของเครื่องจักร (Breakdown Loss)',
      definition: 'เวลาที่เครื่องจักรหยุดในขณะทำการผลิต อันเนื่องมาจากชิ้นส่วนเครื่องจักรเสียหาย (มีการซ่อมแซม หรือเปลี่ยนอะไหล่) หรือเหตุขัดข้องที่ต้องใช้เวลาซ่อมมากกว่า 1 นาที****',
      topicName: 'Breakdown',
      downtimeType: 'Downtime',
      unit: 'ชั่วโมง / นาที',
      examples: [
        'เช่น สายพานขาดต้องเปลี่ยนสายพาน (เปลี่ยนอะไหล่)',
        'แบริ่งแตกต้องเปลี่ยนแบริ่งใหม่ (เปลี่ยนอะไหล่)',
        'ถอดชิ้นส่วนออกมาซ่อมและใส่กลับเข้าไปใหม่'
      ]
    },
    {
      lossNumber: 5,
      type: 'STARTUP',
      thaiName: '5. ความสูญเสียจากช่วงเริ่มต้นการผลิต (Start Up Loss)',
      definition: 'เวลาที่เครื่องจักรหยุดในช่วงเริ่มเดินเครื่องจักร จนผลิตได้สินค้าชิ้นแรกตามมาตรฐานของสินค้าที่กำหนด มี 2 แนวทางดังนี้',
      topicName: 'Start up2',
      downtimeType: 'Downtime',
      unit: 'ชั่วโมง / นาที',
      examples: [
        'เช่น รออุณหภูมิตู้อบ, รออุณหภูมิตู้, รออุณหภูมิน้ำมัน',
        'รอระดับแรงดันน้ำ, ลม ของเครื่องให้อยู่ในระดับปกติหรืออยู่ในเกณฑ์มาตรฐานก่อนถึงจะสามารถเดินเครื่องได้',
        'ตรวจเช็คเครื่องจักรก่อนเริ่มผลิต'
      ]
    },
    {
      lossNumber: 7,
      type: 'ADJUSTMENT_LOSS',
      thaiName: '7. ความสูญเสียจากการปรับแต่ง (Adjustment Loss)',
      definition: 'เวลาที่เครื่องจักรหยุดในระหว่างผลิตเพื่อปรับแต่ง เนื่องจากมีผลต่อคุณภาพสินค้า นับตั้งแต่เครื่องจักรหยุดจนเริ่มผลิตสินค้าได้คุณภาพสมบูรณ์ทั้งหมด โดยชิ้นส่วนเครื่องจักรไม่ชำรุดเสียหาย และใช้เวลาปรับแต่งเกิน 15 นาที',
      topicName: 'Adjustmen',
      downtimeType: 'Downtime',
      unit: 'ชั่วโมง / นาที',
      examples: [
        'การปรับแต่งแก้ไขปัญหาคุณภาพต่างๆ ระหว่างการผลิต เช่น ปรับน้ำหนักแป้ง',
        'ปรับน้ำหนักไส้',
        'ปรับรอย Seal'
      ]
    },
    {
      lossNumber: 12,
      type: 'MINOR_STOPPAGE',
      thaiName: '12. ความสูญเสียจากการหยุดเล็กๆ น้อยๆ ระหว่างการผลิต (Minor Stoppage Loss)',
      definition: 'การหยุดเครื่องจักรเพื่อปรับแต่งเป็นช่วงๆ ในทุกกรณี โดยชิ้นส่วนเครื่องจักรไม่ชำรุดเสียหาย และใช้เวลาปรับแต่งน้อยกว่า 15 นาที หมายเหตุ : โดยจะบันทึกเป็นจำนวนครั้งที่เครื่องหยุดเพื่อปรับแต่ง ไม่บันทึกเป็นเวลา',
      topicName: 'Minor Stoppage',
      downtimeType: 'Performance',
      unit: 'จำนวนครั้ง',
      examples: [
        '1. หยุดหาความผิดปกติ/ปรับแต่งน้อยกว่า 15 นาที เช่น ฟิล์มขาด, ฟิล์มย่น, ฟิล์มตัดไม่ขาด, รอยซีลพับ, ฟิล์มตัดไม่ได้ระยะ top seal ไม่ติด',
        '2. เครื่อง Portion ข้าวไม่ออก, ข้าวออกไม่เต็มวง, ข้าวแน่นติดเครื่อง Portion, เครื่องค้าง',
        '3. สติ๊กเกอร์ระยะไม่ได้, วันที่สติ๊กเกอร์หลังไม่ได้ตาม STD, เครื่องสติ๊กเกอร์ค้าง'
      ]
    }
  ]
};

export interface StoppageTypeDefinition {
  type: StoppageType;
  lossNumber: number;
  name: string;
  thaiName: string;
  topicName: string;
  downtimeType: 'Downtime' | 'Performance' | 'Plan Downtime';
  unit: string;
  label: string;
  shortLabel: string;
  definition: string;
  condition: string;
  examples: string[];
  color: string;
  badgeClass: string;
  borderClass: string;
  bgClass: string;
  icon: string;
}

export const STOPPAGE_TYPE_DEFINITIONS: Record<StoppageType, StoppageTypeDefinition> = {
  BREAKDOWN: {
    type: 'BREAKDOWN',
    lossNumber: 4,
    name: 'Breakdown Loss',
    thaiName: '4. ความสูญเสียจากการชำรุดเสียหายของเครื่องจักร (Breakdown Loss)',
    topicName: 'Breakdown',
    downtimeType: 'Downtime',
    unit: 'ชั่วโมง / นาที',
    label: '4. Breakdown (ชำรุดเสียหาย / ซ่อมหรือเปลี่ยนอะไหล่ / > 1 นาที)',
    shortLabel: '4. Breakdown',
    definition: 'เวลาที่เครื่องจักรหยุดในขณะทำการผลิต อันเนื่องมาจากชิ้นส่วนเครื่องจักรเสียหาย (มีการซ่อมแซม หรือเปลี่ยนอะไหล่) หรือเหตุขัดข้องที่ต้องใช้เวลาซ่อมมากกว่า 1 นาที****',
    condition: 'ชิ้นส่วนเสียหาย (ซ่อมแซม/เปลี่ยนอะไหล่) หรือใช้เวลาซ่อมมากกว่า 1 นาที',
    examples: [
      'สายพานขาดต้องเปลี่ยนสายพาน (เปลี่ยนอะไหล่)',
      'แบริ่งแตกต้องเปลี่ยนแบริ่งใหม่ (เปลี่ยนอะไหล่)',
      'ถอดชิ้นส่วนออกมาซ่อมและใส่กลับเข้าไปใหม่'
    ],
    color: 'rose',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
    borderClass: 'border-rose-500',
    bgClass: 'bg-rose-950/40',
    icon: '🔴'
  },
  MINOR_STOPPAGE: {
    type: 'MINOR_STOPPAGE',
    lossNumber: 12,
    name: 'Minor Stoppage Loss',
    thaiName: '12. ความสูญเสียจากการหยุดเล็กๆ น้อยๆ ระหว่างการผลิต (Minor Stoppage Loss)',
    topicName: 'Minor Stoppage',
    downtimeType: 'Performance',
    unit: 'จำนวนครั้ง (ไม่บันทึกเป็นเวลา)',
    label: '12. Minor Stoppage (หยุดเล็กๆ น้อยๆ / ไม่ชำรุด / < 15 นาที)',
    shortLabel: '12. Minor Stoppage',
    definition: 'การหยุดเครื่องจักรเพื่อปรับแต่งเป็นช่วงๆ ในทุกกรณี โดยชิ้นส่วนเครื่องจักรไม่ชำรุดเสียหาย และใช้เวลาปรับแต่งน้อยกว่า 15 นาที (หมายเหตุ: โดยจะบันทึกเป็นจำนวนครั้งที่เครื่องหยุดเพื่อปรับแต่ง ไม่บันทึกเป็นเวลา)',
    condition: 'ชิ้นส่วนไม่ชำรุดเสียหาย & ปรับแต่งน้อยกว่า 15 นาที (< 15 นาที)',
    examples: [
      'ฟิล์มขาด, ฟิล์มย่น, ฟิล์มตัดไม่ขาด, รอยซีลพับ, ฟิล์มตัดไม่ได้ระยะ, Top seal ไม่ติด',
      'เครื่อง Portion ข้าวไม่ออก, ข้าวออกไม่เต็มวง, ข้าวแน่นติดเครื่อง Portion, เครื่องค้าง',
      'สติ๊กเกอร์ระยะไม่ได้, วันที่สติ๊กเกอร์หลังไม่ได้ตาม STD, เครื่องสติ๊กเกอร์ค้าง'
    ],
    color: 'amber',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    borderClass: 'border-amber-500',
    bgClass: 'bg-amber-950/40',
    icon: '🟡'
  },
  ADJUSTMENT_LOSS: {
    type: 'ADJUSTMENT_LOSS',
    lossNumber: 7,
    name: 'Adjustment Loss',
    thaiName: '7. ความสูญเสียจากการปรับแต่ง (Adjustment Loss)',
    topicName: 'Adjustmen',
    downtimeType: 'Downtime',
    unit: 'ชั่วโมง / นาที',
    label: '7. Adjustment Loss (ปรับแต่งคุณภาพ / ไม่ชำรุด / > 15 นาที)',
    shortLabel: '7. Adjustment',
    definition: 'เวลาที่เครื่องจักรหยุดในระหว่างผลิตเพื่อปรับแต่ง เนื่องจากมีผลต่อคุณภาพสินค้า นับตั้งแต่เครื่องจักรหยุดจนเริ่มผลิตสินค้าได้คุณภาพสมบูรณ์ทั้งหมด โดยชิ้นส่วนเครื่องจักรไม่ชำรุดเสียหาย และใช้เวลาปรับแต่งเกิน 15 นาที',
    condition: 'ชิ้นส่วนไม่ชำรุดเสียหาย & ปรับแต่งคุณภาพเกิน 15 นาที (> 15 นาที)',
    examples: [
      'ปรับแต่งแก้ไขปัญหาคุณภาพ เช่น ปรับน้ำหนักแป้ง',
      'ปรับน้ำหนักไส้',
      'ปรับรอย Seal'
    ],
    color: 'orange',
    badgeClass: 'bg-orange-500/15 text-orange-300 border-orange-500/40',
    borderClass: 'border-orange-500',
    bgClass: 'bg-orange-950/40',
    icon: '🟠'
  },
  SHUTDOWN: {
    type: 'SHUTDOWN',
    lossNumber: 1,
    name: 'Shutdown losses',
    thaiName: '1. ความสูญเสียจากการหยุดตามแผน (Shutdown losses)',
    topicName: 'Shutdown / Plan Downtime',
    downtimeType: 'Plan Downtime',
    unit: 'ชั่วโมง / นาที',
    label: '1. Shutdown losses (หยุดตามแผน / Plan Downtime)',
    shortLabel: '1. Shutdown',
    definition: 'เวลาที่เครื่องจักรหยุดตามแผนที่กำหนดล่วงหน้า (Plan Downtime)',
    condition: 'หยุดตามแผนงานล่วงหน้า (ล้างทำความสะอาด, PM, อบรม)',
    examples: [
      'ล้างทำความสะอาดเครื่องจักรประจำสัปดาห์/เดือนตามแผน',
      'การซ่อมบำรุงตามแผน (PM Planned Maintenance)',
      'อบรมพนักงานหรือวันหยุดของโรงงาน'
    ],
    color: 'blue',
    badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
    borderClass: 'border-blue-500',
    bgClass: 'bg-blue-950/40',
    icon: '🔵'
  },
  STARTUP: {
    type: 'STARTUP',
    lossNumber: 5,
    name: 'Start Up Loss',
    thaiName: '5. ความสูญเสียจากช่วงเริ่มต้นการผลิต (Start Up Loss)',
    topicName: 'Start up2',
    downtimeType: 'Downtime',
    unit: 'ชั่วโมง / นาที',
    label: '5. Start Up Loss (ช่วงเริ่มต้นการผลิต)',
    shortLabel: '5. Start Up',
    definition: 'เวลาที่เครื่องจักรหยุดในช่วงเริ่มเดินเครื่องจักร จนผลิตได้สินค้าชิ้นแรกตามมาตรฐานของสินค้าที่กำหนด มี 2 แนวทางดังนี้',
    condition: 'หยุดช่วงเริ่มเดินเครื่องเพื่อรออุณหภูมิ/ความดัน/เกณฑ์มาตรฐาน',
    examples: [
      'รออุณหภูมิตู้อบ, รออุณหภูมิตู้, รออุณหภูมิน้ำมัน',
      'รอระดับแรงดันน้ำ, ลม ของเครื่องให้อยู่ในเกณฑ์มาตรฐานก่อนเริ่มผลิต',
      'ตรวจเช็คเครื่องจักรก่อนเริ่มผลิต'
    ],
    color: 'purple',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
    borderClass: 'border-purple-500',
    bgClass: 'bg-purple-950/40',
    icon: '🟣'
  }
};

/**
 * คำนวณจำแนกประเภทความสูญเสียตามมาตรฐานนิยาม Losses ของโรงงาน (Update09. 19/05/25)
 * - Loss 4 (Breakdown): ชิ้นส่วนเสียหาย (มีการซ่อมแซม หรือเปลี่ยนอะไหล่) หรือเหตุขัดข้องใช้เวลาซ่อมมากกว่า 1 นาที
 * - Loss 12 (Minor stoppage): ชิ้นส่วนไม่เสียหาย ปรับแต่ง < 15 นาที (บันทึกเป็นจำนวนครั้ง)
 * - Loss 7 (Adjustment loss): ชิ้นส่วนไม่เสียหาย ปรับแต่งคุณภาพ > 15 นาที
 */
export function detectStoppageType(
  hasPartsOrRepair: boolean, 
  durationMinutes: number,
  isQualityAdjustment: boolean = false
): StoppageType {
  // หากชิ้นส่วนเครื่องจักรเสียหาย (มีการซ่อมแซมหรือเปลี่ยนอะไหล่) -> Breakdown (Loss 4)
  if (hasPartsOrRepair) {
    return 'BREAKDOWN';
  }
  // หากเป็นการปรับแต่งคุณภาพสินค้า (ชิ้นส่วนไม่เสียหาย)
  if (isQualityAdjustment) {
    return durationMinutes < 15 ? 'MINOR_STOPPAGE' : 'ADJUSTMENT_LOSS';
  }
  // หากใช้เวลามากกว่า 1 นาทีและมีอาการชำรุดเสียหาย -> Breakdown ตามนิยามโรงงาน (> 1 นาที)
  if (durationMinutes > 1 && !isQualityAdjustment) {
    return 'BREAKDOWN';
  }
  // หากน้อยกว่า 15 นาทีและหยุดเพื่อปรับแต่งชั่วคราว -> Minor stoppage (Loss 12)
  if (durationMinutes < 15) {
    return 'MINOR_STOPPAGE';
  }
  return 'ADJUSTMENT_LOSS';
}

export function getRepairStoppageType(repair: {
  stoppageType?: StoppageType | string;
  usedParts?: { partId: string; quantity: number }[];
  hasPartsReplaced?: boolean;
  duration?: number;
}): StoppageType {
  if (repair.stoppageType) {
    const raw = String(repair.stoppageType).trim().toUpperCase();
    if (raw === 'BREAKDOWN' || raw === 'BREAKDOWN_LOSS') return 'BREAKDOWN';
    if (raw === 'MINOR_STOPPAGE' || raw === 'MINOR' || raw === 'MINOR_STOP') return 'MINOR_STOPPAGE';
    if (raw === 'ADJUSTMENT_LOSS' || raw === 'ADJUSTMENT' || raw === 'ADJUST') return 'ADJUSTMENT_LOSS';
    if (raw === 'SHUTDOWN' || raw === 'SHUTDOWN_LOSS' || raw === 'PLAN_DOWNTIME') return 'SHUTDOWN';
    if (raw === 'STARTUP' || raw === 'START_UP' || raw === 'START_UP_LOSS') return 'STARTUP';
    return repair.stoppageType as StoppageType;
  }
  const hasParts = Boolean((repair.usedParts && repair.usedParts.length > 0) || repair.hasPartsReplaced);
  return detectStoppageType(hasParts, repair.duration || 0);
}

export interface RepairLog {
  id: string;
  type: 'Repair';
  technician: string;
  technicians?: string[]; // ช่างที่ทำงานร่วมกันหลายคน
  date: string; // YYYY-MM-DD (date of breakdown)
  machineId: string;
  breakdownTime: string; // YYYY-MM-DDTHH:MM
  repairDoneTime: string; // YYYY-MM-DDTHH:MM
  symptoms: string; // อาการเสีย
  why1: string;
  why2: string;
  why3: string;
  why4: string;
  why5: string;
  correctiveAction: string; // มาตรการแก้ไข
  photo?: string; // base64
  duration: number; // MTTR in minutes (repairDoneTime - breakdownTime)
  status?: 'กำลังซ่อม' | 'ปิดงาน'; // สถานะใบงานซ่อม
  usedParts?: UsedPartItem[];
  hasPartsReplaced?: boolean; // ระบุว่ามีการเปลี่ยนอะไหล่หรือไม่ (กรณีอะไหล่นอกคลัง)
  stoppageType?: StoppageType; // การจำแนกประเภท: Breakdown, Minor stoppage, Adjustment loss
  otherCost?: number;
  excelFile?: { name: string; content: string }; // ไฟล์ Excel แนบประกอบใบซ่อม (Base64)
  workOrderId?: string; // รหัสใบสั่งงาน Work Order ที่ผูกกับงานซ่อมนี้ (No Work Order - No Work)
  workOrderNo?: string; // เลขที่ใบสั่งงาน เช่น WO-2026-0001
  faFile?: RepairAttachmentItem; // เอกสาร Failure Analysis
  oplFile?: RepairAttachmentItem; // เอกสาร One Point Lesson
  whyWhyFile?: RepairAttachmentItem; // เอกสาร Why-Why Analysis
  kaizenFile?: RepairAttachmentItem; // เอกสารโครงการ Kaizen
  mpFile?: RepairAttachmentItem; // เอกสาร MP Information Sheet
  repairAttachments?: RepairAttachmentItem[]; // ไฟล์แนบประกอบใบซ่อมทั้งหมด (FA, OPL, Why-Why, Kaizen, MP)
}

export type KaizenCategory = 'KAIZEN' | 'OPL' | 'FA' | 'WHY_WHY' | 'MP_INFO';

export interface RepairAttachmentItem {
  id: string;
  category: 'FA' | 'OPL' | 'WHY_WHY' | 'KAIZEN' | 'MP_INFO';
  name: string;
  content: string; // Base64 or Blob URL or file link
  fileType?: 'pdf' | 'excel' | 'image' | 'word' | 'other';
  size?: string;
  uploadedAt?: string;
  uploadedBy?: string;
  notes?: string;
  kaizenProjectId?: string; // ID ของโครงการ Kaizen ในแถบ Kaizen ที่เชื่อมโยง
}

export interface KaizenNavigationFilter {
  category?: KaizenCategory;
  machineId?: string;
  projectId?: string;
  searchQuery?: string;
  sourceRepairId?: string;
}

export interface PDFFileAttachment {
  id: string;
  name: string;
  content: string; // Base64 or Blob URL
  size?: string;
  uploadedAt?: string;
  fileType?: 'pdf' | 'excel' | 'other';
}

export type FileAttachment = PDFFileAttachment;

export function isExcelAttachment(file: { name?: string; fileType?: string }): boolean {
  if (file.fileType === 'excel') return true;
  if (file.fileType === 'pdf') return false;
  const lower = (file.name || '').toLowerCase();
  return lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv');
}

export interface MediaPhotoItem {
  id: string;
  url: string; // Base64 or Image URL
  caption?: string;
  type?: 'before' | 'after' | 'evidence' | 'analysis' | 'standard' | 'damaged_part';
  uploadedAt?: string;
}

export interface OPLData {
  category: 'ความรู้พื้นฐาน (Basic Knowledge)' | 'การแก้ไขปัญหา (Troubleshooting)' | 'ตัวอย่างการปรับปรุง (Improvement Case)' | 'ความปลอดภัย (Safety & 5S)';
  purpose: string; // วัตถุประสงค์การเรียนรู้
  keyPoints: string[]; // จุดสำคัญ/ขั้นตอนปฏิบัติงาน (Key Points)
  reasons?: string[]; // เหตุผลที่ต้องทำแบบนี้ (Reasons/Principles)
  cautionPoints?: string; // ข้อควรระวัง / ข้อห้าม (Don'ts)
  sopDocumentRef?: string; // รหัสเอกสารมาตรฐานอ้างอิง (เช่น WI-MNT-042, SOP-PRO-105)
  targetAudience?: string; // กลุ่มเป้าหมาย (เช่น ช่างซ่อมบำรุง, พนักงานควบคุมเครื่อง)
  trainingDurationMins?: number; // ระยะเวลาอบรม (นาที)
}

export interface FAData {
  failurePartName: string; // ชื่อชิ้นส่วนที่ชำรุดเสียหาย
  failurePartCode?: string; // รหัสอะไหล่ / SKU
  failureMode: 'การสึกหรอ (Wear)' | 'การล้าตัว (Fatigue)' | 'การแตกหัก (Fracture/Crack)' | 'การกัดกร่อน/สนิม (Corrosion)' | 'ความร้อน/ไหม้ช็อต (Thermal/Electrical)' | 'การอุดตัน/ติดขัด (Jam/Clog)';
  rootCauseCategory: 'การออกแบบ (Design)' | 'คุณภาพวัสดุ (Material)' | 'การใช้งานหน้างาน (Operation)' | 'การบำรุงรักษา (Maintenance)' | 'สภาพแวดล้อม (Environment)';
  mechanismDescription: string; // กลไกและลำดับการเกิดความเสียหาย (Failure Mechanism)
  immediateContainment: string; // มาตรการแก้ไขเฉพาะหน้า (Immediate Action)
  permanentAction: string; // มาตรการป้องกันเกิดซ้ำถาวร (Preventive Action)
  estimatedCostLoss?: number; // ความเสียหายประเมิน (บาท)
  laboratoryFindings?: string; // ผลตรวจวิเคราะห์เชิงลึก / ภาพตัดขวาง
}

export interface WhyWhyData {
  problemStatement: string; // ปัญหาที่เกิดขึ้นจริง (Problem Statement)
  phenomenon: string; // ปรากฏการณ์หน้างาน (Phenomenon)
  why1: string; // ทำไมที่ 1
  why2: string; // ทำไมที่ 2
  why3: string; // ทำไมที่ 3
  why4: string; // ทำไมที่ 4
  why5: string; // ทำไมที่ 5 (Root Cause)
  rootCauseSummary: string; // สรุปสาเหตุรากเหง้า
  countermeasure: string; // มาตรการแก้ไขและป้องกันการเกิดซ้ำ (Countermeasure)
  standardizationRef?: string; // การกำหนดเป็นมาตรฐาน / โยงไปยัง OPL
  effectivenessVerification?: string; // การติดตามประสิทธิผลหลังแก้ไข
}

export interface MPInfoData {
  mpCategory?: 'ความง่ายในการบำรุงรักษา (Maintainability)' | 'ความน่าเชื่อถือ/ยืดอายุการใช้งาน (Reliability)' | 'ความปลอดภัยและการยศาสตร์ (Safety & Ergonomics)' | 'การทำความสะอาดและตรวจสอบ (Clean & Inspect)' | 'ลดเวลาปรับตั้ง/เปลี่ยนรุ่น (Quick Setup)' | 'ข้อกำหนดจัดซื้อเครื่องจักรใหม่ (New Machine Spec)';
  targetPhase?: 'ปรับปรุงเครื่องจักรปัจจุบัน (Current Machine Modification)' | 'จัดซื้อเครื่องจักรใหม่ในอนาคต (Future Machine Spec)' | 'ปรับปรุงแบบวิศวกรรม (Engineering Design Standard)' | 'สเปกอะไหล่และชิ้นส่วน (Component Spec)';
  issueDescription: string; // สภาพปัญหา / จุดอ่อนเดิมที่พบหน้างาน (Current Weakness / Difficulty)
  proposedDesignChange: string; // ข้อเสนอแนะการออกแบบ / มาตรการ MP (Proposed MP Design Change / Preventive Idea)
  expectedBenefits: string; // ผลลัพธ์หรือประโยชน์ที่คาดว่าจะได้รับ (Expected Benefits: เช่น ลด MTTR, เพิ่มอายุใช้งาน)
  feedbackTarget: string; // ส่งต่อข้อมูลถึง (เช่น แผนกวิศวกรรม / ผู้ผลิตเครื่องจักร Maker / จัดซื้อ)
  actionStatus?: 'เสนอแนะ (Proposed)' | 'กำลังศึกษาและออกแบบ (Under Review)' | 'ปรับปรุงสำเร็จแล้ว (Implemented)' | 'บรรจุในมาตรฐานเครื่องใหม่ (Standardized in Spec)';
  costSavingEstimate?: number; // ผลประหยัดคาดการณ์ (บาท/ปี)
  referenceSource?: string; // ที่มาข้อมูลอ้างอิง (เช่น ใบแจ้งซ่อม, งาน FA, Why-Why)
}

export interface ImprovementWorkLog {
  id: string;
  date: string; // YYYY-MM-DD
  hours: number;
  note: string;
}

export type WorkLog = ImprovementWorkLog;

export interface ImprovementProject {
  id: string;
  type: 'Improvement';
  category?: KaizenCategory; // 'KAIZEN' | 'OPL' | 'FA' | 'WHY_WHY' (defaults to 'KAIZEN')
  title: string; // ชื่อโครงการ / หัวข้อบทเรียน / เคสวิเคราะห์
  description: string; // รายละเอียด / ความเป็นมา
  machineId?: string; // เครื่องจักรที่เกี่ยวข้อง (optional)
  startDate: string; // วันที่เริ่ม YYYY-MM-DD
  plannedEndDate: string; // วันที่คาดเสร็จ YYYY-MM-DD
  workLogs: ImprovementWorkLog[];
  status: 'วางแผน' | 'กำลังดำเนินการ' | 'เสร็จแล้ว';
  technician: string; // Main assigned technician
  technicians?: string[]; // ช่างที่ทำงานร่วมกัน
  photoBefore?: string; // base64 (legacy compatible)
  photoAfter?: string; // base64 (legacy compatible)
  photos?: MediaPhotoItem[]; // รูปภาพผลงานและหลักฐานเพิ่มเติม
  pdfFiles?: PDFFileAttachment[]; // ไฟล์ PDF แนบประกอบผลงาน
  
  // Dedicated data for specific tools
  oplData?: OPLData;
  faData?: FAData;
  whyWhyData?: WhyWhyData;
  mpData?: MPInfoData;
}

export type ScheduleItem = PMScheduleItem | OperationScheduleItem;

export interface SystemSettings {
  workingHoursPerDay: number; // working hours per day, defaults to 8 (480 mins)
  stdMttr: Record<string, number>; // machine ID prefix or type -> standard MTTR (mins)
  defaultPlannedProductionHours?: number; // ค่าเวลา Planned Production Time มาตรฐานต่อเดือน (เช่น 600 ชม.)
  lineNotifyEnabled?: boolean;
  lineNotifyToken?: string;
  mtbfRoomsConfig?: any[]; // Custom rooms and machines configuration
  mtbfCustomMappings?: Record<string, { roomId: string; machineId: string }>;
}

export interface SetupStepLog {
  stepName: 'ตั้งเครื่อง' | 'ร้อยฟิล์ม' | 'ตั้งฟิล์ม' | 'ต่อฟิล์ม' | 'ตั้งเครื่องพิมพ์วันที่' | string;
  duration: number; // in minutes
  completed: boolean;
}

export interface SetupLog {
  id: string;
  machineId: string;
  date: string; // YYYY-MM-DD
  type: 'Setupก่อนผลิต' | 'ปรับเครื่องระหว่างวัน';
  technicians: string[]; // รายชื่อช่างที่ปฏิบัติงาน
  steps: SetupStepLog[];
  totalDuration: number; // sum of step durations
  note?: string;
  deviationReason?: string; // สาเหตุ/เหตุผลความเบี่ยงเบนจากเกณฑ์เวลามาตรฐาน
}

export type UserRole = 'admin' | 'technician' | 'production' | 'viewer';

export type WorkRequestPriority = 'ฉุกเฉินไลน์หยุด' | 'เร่งด่วน' | 'ปกติ' | 'ตามแผนนัดหมาย';

export type WorkRequestStatus = 
  | 'รอตอบรับ'                  // รอวิศวกรรมตอบรับ
  | 'ตอบรับแล้ว/มีแผนงาน'        // วิศวกรรมตอบรับและระบุวันเสร็จ/แผนงานแล้ว
  | 'กำลังดำเนินการซ่อม'         // ช่างกำลังเข้าซ่อม
  | 'รออะไหล่/สั่งของ'           // รอเบิกหรือสั่งอะไหล่
  | 'ซ่อมเสร็จ/รอฝ่ายผลิตตรวจรับ'  // ช่างซ่อมเสร็จแล้ว รอฝ่ายผลิตทดสอบเดินเครื่อง
  | 'ปิดงานสมบูรณ์'             // ฝ่ายผลิตตรวจรับและปิดงานเรียบร้อย
  | 'ยกเลิก/ปฏิเสธ';            // ไม่อนุมัติหรือยกเลิก

export interface EngineeringResponse {
  respondedAt: string; // วันเวลาที่ตอบรับ YYYY-MM-DD HH:MM
  respondedBy: string; // ชื่อวิศวกร/ช่างผู้ตอบรับ
  
  // "ว่าจะแล้วเสร็จวันไหน เมื่อไหร่"
  targetStartDate: string; // วันที่เริ่มเข้าซ่อม YYYY-MM-DD
  targetStartTime: string; // เวลาเริ่มเข้าซ่อม HH:MM
  targetFinishDate: string; // วันที่คาดว่าจะแล้วเสร็จ YYYY-MM-DD
  targetFinishTime: string; // เวลาคาดว่าจะแล้วเสร็จ HH:MM
  estimatedDurationMins: number; // ระยะเวลาประเมิน (นาที)

  // "อย่างไร" (แผนงาน / วิธีการซ่อม / อะไหล่)
  actionPlan: string; // ขั้นตอนและวิธีการซ่อม
  assignedTechnicians: string[]; // รายชื่อช่างที่ได้รับมอบหมาย
  sparePartStatus: 'มีอะไหล่พร้อมในคลัง' | 'เบิกอะไหล่ด่วน' | 'สั่งซื้อรออะไหล่' | 'ไม่ต้องใช้อะไหล่';
  sparePartNotes?: string; // รายละเอียดอะไหล่ที่ต้องใช้
  productionCoordinationNotes?: string; // การประสานงานนัดหยุดเครื่องกับไลน์ผลิต
  
  // ข้อความตอบกลับถึงฝ่ายผลิต
  messageToProduction?: string; // คำชี้แจง/คำแนะนำถึงฝ่ายผลิต
  
  // ข้อมูลเมื่อซ่อมเสร็จจริง
  completedAt?: string; // วันเวลาที่ซ่อมเสร็จจริง
  actualDurationMins?: number; // เวลาซ่อมจริง (นาที)
  repairSummaryNotes?: string; // สรุปผลการซ่อมบำรุง
}

export interface WorkRequest {
  id: string; // e.g. "REQ-202609-001"
  sequenceNo?: number; // ลำดับที่ในเอกสาร/รายการ เช่น 1, 2, 3...
  ticketNo?: string; // เลขที่แจ้งซ่อม (เช่น 167311, 167312)
  requestDate: string; // YYYY-MM-DD
  requestTime: string; // HH:MM
  
  // ข้อมูลจากฝ่ายผลิต
  machineId: string; // รหัสเครื่องจักร e.g. "ATS03" หรือ จุดที่แจ้งซ่อม e.g. "โต๊ะตัดซีล"
  machineName?: string; // ชื่อเครื่องจักร e.g. "TOP SEALER ยำสาหร่าย"
  lineGroup?: string; // ไลน์/แผนก e.g. "TOP SEALING ROOM"
  locationPoint?: string; // จุดที่ต้องการแจ้งซ่อม / ตำแหน่ง เช่น "สายพานหน้าเครื่อง", "ฮีตเตอร์หัวซีลชุดที่ 2", "โต๊ะตัด"
  isCustomLocation?: boolean; // ระบุจุดแจ้งซ่อมเองนอกฐานข้อมูล
  priority: WorkRequestPriority; // ระดับความเร่งด่วน
  problemTitle: string; // หัวข้อปัญหา เช่น "ฟองอากาศบนขอบถ้วย ซีลไม่เต็มขอบ"
  problemDetails: string; // รายละเอียดปัญหาและผลกระทบต่อไลน์ผลิต
  productionDepartment: string; // แผนกที่แจ้ง เช่น "ฝ่ายผลิตข้าวกล่อง กะเช้า"
  requesterName: string; // ชื่อผู้แจ้งซ่อม
  requesterPhone?: string; // เบอร์โทร/เบอร์ต่อภายใน
  photoUrl?: string; // รูปถ่ายปัญหาจุดชำรุด (Base64)
  
  // สถานะปัจจุบัน
  status: WorkRequestStatus;
  
  // การตอบรับจากวิศวกรรม
  engineeringResponse?: EngineeringResponse;
  
  // การตรวจรับและส่งมอบงานโดยฝ่ายผลิต
  acceptedBy?: string; // ผู้ตรวจรับงาน (ฝ่ายผลิต)
  acceptedAt?: string; // วันเวลาที่ตรวจรับ
  handoverNotes?: string; // ความเห็นการทดสอบเดินเครื่อง
  satisfactionRating?: number; // ระดับความพึงพอใจ 1-5 ดาว
  
  // การเชื่อมโยงกับโมดูลอื่น
  linkedRepairLogId?: string; // ID ใบงานซ่อมหากแปลงเข้าตารางซ่อม
  linkedWorkOrderId?: string; // ID ใบสั่งงาน Work Order ที่ออกให้กับใบแจ้งซ่อมนี้
  workOrderNo?: string; // เลขที่ใบสั่งงาน e.g. WO-2026-0001
  
  // ข้อมูลประวัติการเปลี่ยนหัวพิมพ์ (Printhead Replacement History)
  isPrintheadReplacement?: boolean; // ติ๊กเลือกเป็นงานเปลี่ยนหัวพิมพ์
  printheadDetails?: {
    model?: string; // รุ่นหัวพิมพ์ (เช่น Markem-Imaje SmartDate X40, Videojet, Domino)
    newSerial?: string; // หมายเลขซีเรียลหัวพิมพ์ใหม่
    oldSerial?: string; // หมายเลขซีเรียลหัวพิมพ์เดิม
    resistance?: string; // ค่าความต้านทาน (Ohm) หรือค่า Dot
    voltage?: string; // แรงดันไฟฟ้าหัวพิมพ์
    replacedDate?: string; // วันที่ทำการเปลี่ยนหัวพิมพ์
    technician?: string; // ช่างผู้เปลี่ยน
    reason?: string; // สาเหตุที่เปลี่ยน (ดอทขาด, เส้นแตก, ช็อต, สึกหรอ)
    notes?: string; // หมายเหตุเพิ่มเติม
  };

  createdAt: string;
  updatedAt?: string;
}

export interface UserAccount {
  id: string; // e.g. "usr-admin", "usr-tech-01"
  username: string; // unique username, e.g. "admin", "somchai"
  password: string; // plain text password for quick maintenance management
  name: string; // display name e.g. "ผู้ดูแลระบบ (Admin)", "ช่างอุ้ย (ช่างซ่อมบำรุง)"
  role: UserRole; // 'admin' | 'technician' | 'viewer'
  department?: string; // แผนก e.g. "วิศวกรรมและซ่อมบำรุง", "ฝ่ายผลิต"
  phone?: string;
  createdAt?: string;
  lastLogin?: string;
}

export interface Employee {
  id: string; // รหัสพนักงาน (เช่น ENG-001)
  name: string; // ชื่อ-นามสกุล
  position: string; // ตำแหน่งงาน
  password?: string; // รหัสผ่านเริ่มต้น คือ 1234
}

export type LeaveType = 'ลากิจ' | 'ลาป่วย' | 'ลาพักร้อน' | 'วันหยุดประจำสัปดาห์' | 'ลาอื่น ๆ';

export interface TechnicianLeave {
  id: string;
  technician: string; // ชื่อช่าง
  date: string; // YYYY-MM-DD
  type: LeaveType;
  note?: string; // หมายเหตุเพิ่มเติม
}

export interface SparePart {
  id: string; // รหัสอะไหล่ (SKU), เช่น SP-01
  name: string; // ชื่ออะไหล่
  category: string; // หมวดหมู่ (ระบบเครื่องกล, นิวเมติกส์, ระบบส่งกำลัง, อุปกรณ์ไฟฟ้า, ฯลฯ)
  machineIds: string[]; // เครื่องจักรที่เกี่ยวข้อง (เช่น ["RIM01", "VAC01"])
  quantity: number; // จำนวนคงเหลือในคลัง
  minRequired: number; // จำนวนขั้นต่ำที่ต้องการ (หากน้อยกว่าหรือเท่ากับจะแจ้งเตือนสต็อกใกล้หมด)
  unit: string; // หน่วยนับ (เช่น ชิ้น, ตลับ, ตัว, ม้วน)
  location: string; // สถานที่จัดเก็บ/ตำแหน่งชั้นวาง (เช่น ตู้ A ชั้น 2)
  pricePerUnit: number; // ราคารวมต่อหน่วย (เช่น 450)
  lastRestockedDate?: string; // วันที่อัปเดตสต็อกล่าสุด (YYYY-MM-DD)
  specifications?: string; // ข้อมูลทางเทคนิค/รายละเอียดเพิ่มเติม
  workRequestNo?: string; // เลขที่แจ้งซ่อมที่ผูกกับอะไหล่นี้
  lastWorkRequestNo?: string; // เลขที่แจ้งซ่อมที่เบิกใช้ล่าสุด
}

export type CD5Category = 
  | 'เขียนแบบสั่งทำเอง (Custom Fabrication)'
  | 'ยืดอายุการใช้งาน (Lifetime Extension)'
  | 'เทียบเคียงแบรนด์ทางเลือก (Equivalent Brand)'
  | 'ซ่อมฟื้นฟูสภาพ (Reconditioning)'
  | 'ลดต้นทุนงาน PM/ซ่อม (PM/Repair Cost Down)';

export type CD5Status = 'กำลังทดสอบ' | 'อนุมัติใช้งานจริง' | 'ประเมินผล';

export interface CD5UsageHistoryItem {
  id: string; // e.g. "HIST-01"
  cycleNumber: number; // รอบที่ 1, 2, ...
  partType: 'NEW_CUSTOM' | 'ORIGINAL_OEM'; // ชนิดอะไหล่ (สั่งทำ CD5 vs เดิม OEM)
  installedDate: string; // วันที่เริ่มติดตั้ง/เริ่มใช้งาน (YYYY-MM-DD)
  replacedDate?: string; // วันที่ถอดเปลี่ยน/สิ้นสุดรอบ (YYYY-MM-DD)
  status: 'ACTIVE_RUNNING' | 'COMPLETED_REPLACED'; // กำลังเดินเครื่องใช้งานอยู่ หรือ ถอดเปลี่ยนแล้ว
  actualRunningDays: number; // จำนวนวันใช้งานจริง (คำนวณอัตโนมัติ)
  targetLifespanDays: number; // อายุเป้าหมายของอะไหล่ใหม่ (วัน)
  originalOemDays: number; // อายุเดิมของอะไหล่ OEM (วัน)
  lifespanExtensionPercent: number; // % ยืดอายุเมื่อเทียบกับ OEM
  wearCondition: string; // สภาพการสึกหรอ / ผลการตรวจเช็ค (เช่น "สมบูรณ์ดี 95% ไร้สนิม", "สึกหรอตามเกณฑ์")
  technician: string; // ช่างผู้ติดตั้ง/ตรวจสอบ
  notes?: string; // หมายเหตุเพิ่มเติม
  photoAfterUse?: string; // ภาพถ่ายสภาพอะไหล่จริง
}

export interface CD5Project {
  id: string; // e.g. "CD5-2026-001"
  title: string; // ชื่อโครงการ เช่น "เขียนแบบสั่งทำใบมีดตัดซีลถุงข้าว SUS440C แทนสั่ง OEM"
  category: CD5Category;
  machineId?: string; // รหัสเครื่องจักร เช่น "VAC01"
  partName: string; // ชื่ออะไหล่ เช่น "ใบมีดซีลสุญญากาศ (Sealing Cutter Blade)"
  partCode?: string; // รหัสอะไหล่เดิม/ใหม่ เช่น "BLD-VAC-04"
  proposerTechnician: string; // ช่างผู้เสนอ/รับผิดชอบหลัก
  coTechnicians?: string[]; // ช่างร่วม
  startDate: string; // วันที่เริ่มทดสอบ/โครงการ (YYYY-MM-DD)
  approvedDate?: string; // วันที่อนุมัติใช้งานจริง (YYYY-MM-DD)
  installedDate?: string; // วันที่เริ่มติดตั้ง/เริ่มใช้งานอะไหล่จริงล่าสุด (YYYY-MM-DD)
  status: CD5Status;

  // Comparison: Original OEM
  originalSupplier: string; // เช่น "ผู้ผลิตเครื่องจักรจากญี่ปุ่น (OEM Japan)"
  originalPrice: number; // ราคาเดิมต่อชิ้น (บาท) เช่น 12500
  originalLifespanDays: number; // อายุการใช้งานเดิม (วัน) เช่น 60
  originalLifespanUnit?: string; // เช่น "วัน", "เดือน", "รอบการผลิต"
  originalQualityNotes: string; // คุณภาพเดิม เช่น "นำเข้าจากต่างประเทศ รอของนาน 45 วัน คมแต่สึกหรอเร็วเมื่อเจอความชื้น"
  photoOriginal?: string; // Base64 or Image URL

  // Comparison: New Custom / Cost Down Part
  newSupplierOrFabricator: string; // เช่น "โรงกลึง CNC ในประเทศ (Local Precision Tooling)"
  newPrice: number; // ราคาใหม่ต่อชิ้น (บาท) เช่น 3200
  newLifespanDays: number; // อายุการใช้งานใหม่ (วัน) เช่น 120
  newLifespanUnit?: string; // เช่น "วัน", "เดือน", "รอบการผลิต"
  newQualityNotes: string; // คุณภาพใหม่ เช่น "เปลี่ยนเกรดเป็น SUS440C ชุบแข็ง HRC 58-60 ทนการสึกหรอและไม่เป็นสนิมตามมาตรฐาน GMP"
  photoNew?: string; // Base64 or Image URL
  drawingPhoto?: string; // Base64 or Image URL สำหรับแบบ Drawing / Sketch

  // Financial & Usage Metrics
  annualUsageQty: number; // ปริมาณที่ใช้ต่อปี (ชิ้น) เช่น 24
  annualOriginalCost: number; // ต้นทุนเดิมต่อปี (บาท)
  annualNewCost: number; // ต้นทุนใหม่ต่อปี (บาท)
  annualSavings: number; // ยอดเงินประหยัดรวมต่อปี (บาท)
  savingsPercent: number; // เปอร์เซ็นต์การลดต้นทุน (%)
  lifespanExtensionPercent: number; // เปอร์เซ็นต์การยืดอายุการใช้งาน (%)
  
  // Implementation & Engineering Notes
  engineeringDetails: string; // รายละเอียดการปรับปรุง/เขียนแบบ/สเปก
  foodGradeCompliance: boolean; // มาตรฐานความปลอดภัย Food Grade (GMP/HACCP)
  safetyNotes?: string; // ความปลอดภัยและการตรวจเช็ค
  createdAt: string;

  // Usage & Lifespan Tracking History
  usageHistory?: CD5UsageHistoryItem[];
}

// ============================================================================
// CMMS Work Order & Planning Discipline Models (No Work Order - No Work)
// ============================================================================

export type WorkOrderPriority = 'ฉุกเฉินไลน์หยุด' | 'เร่งด่วน' | 'ปกติ' | 'ตามแผนนัดหมาย';

export type WorkOrderType = 
  | 'PM'                  // Preventive Maintenance ตามแผน
  | 'BREAKDOWN'           // ซ่อมเครื่องจักรหยุดฉุกเฉิน (Unplanned)
  | 'CORRECTIVE'          // ซ่อมปรับปรุง/งานแก้ไขจากใบแจ้งซ่อม (Planned)
  | 'IMPROVEMENT'         // Kaizen / Overhaul / Cost Down (Planned)
  | 'OPERATION';          // ประจำการคุมกะ/ตรวจเช็คไลน์ประจำวัน (Planned)

export type WorkOrderStatus = 
  | 'DRAFT'                       // แบบร่าง รอวางแผน
  | 'PENDING_SCHEDULE'            // กำลังจัดเตรียมแผน (คน/เวลา/อะไหล่)
  | 'WAITING_PARTS'               // รออะไหล่ (สต็อกไม่พอ)
  | 'READY_TO_RELEASE'            // ผ่านเกณฑ์ความพร้อม 4 ด้าน พร้อมปล่อยงาน
  | 'RELEASED'                    // ปล่อยงานแล้ว ช่างกำลังปฏิบัติงาน (In Progress)
  | 'COMPLETED_PENDING_HANDOVER'  // ซ่อมเสร็จ รอฝ่ายผลิตตรวจรับ
  | 'CLOSED'                      // ฝ่ายผลิตตรวจรับและปิดงานสมบูรณ์
  | 'CANCELLED';                  // ยกเลิก

export interface WorkOrderPartRequirement {
  partId: string;
  partCode: string;
  partName: string;
  quantityRequired: number;
  quantityAvailable: number;
  isAvailable: boolean;
  isReserved: boolean;
  unitCost?: number;
}

export interface WorkOrderReadinessCheck {
  timeScheduled: boolean;           // 1. มีกำหนดวันและเวลาเริ่ม
  estimatedDurationValid: boolean;  // 2. มีประมาณการระยะเวลาการทำงาน (นาที)
  laborAssigned: boolean;           // 3. มีช่างผู้รับผิดชอบประจำกะ
  partsAvailable: boolean;          // 4. อะไหล่สำรองในคลังพร้อมครบ (หรือเคสที่ไม่ต้องใช้อะไหล่)
  gatePassed: boolean;              // ผ่านทั้ง 4 ข้อ พร้อมปล่อยงาน (Ready for Release)
  missingReasons: string[];         // รายการสิ่งที่ยังขาด
}

export interface WorkOrder {
  id: string; // e.g. "WO-2026-0001"
  workOrderNo?: string;
  sourceType: WorkOrderType;
  workCategory: 'PLANNED' | 'UNPLANNED'; // สำหรับคำนวณ % Planned Work Ratio (เป้าหมาย >= 80-90%)
  title: string;
  description: string;
  machineId: string;
  machineName?: string;
  lineGroup?: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  
  // 4 เสาหลัก Readiness Gate
  readiness: WorkOrderReadinessCheck;
  
  // เสาที่ 1: เวลาเริ่ม
  scheduledDate: string; // YYYY-MM-DD
  scheduledStartTime: string; // HH:MM
  scheduledEndTime?: string; // HH:MM
  
  // เสาที่ 2: ระยะเวลา
  estimatedDurationMins: number; // นาที
  
  // เสาที่ 3: กำลังพลช่าง
  assignedTechnicians: string[];
  leadTechnician?: string;
  
  // เสาที่ 4: อะไหล่สำรอง (Kitting / Stock Reservation)
  requiresParts: boolean;
  requiredParts: WorkOrderPartRequirement[];
  
  // มาตรการความปลอดภัย
  lotoRequired: boolean;
  lotoTag?: string;
  lotoActive?: boolean;
  
  // การเชื่อมโยงกับแหล่งงานต้นทาง
  sourceRefId?: string; // ID ใบแจ้งซ่อม (REQ-XXX), แผน PM (plan-xxx), Kaizen (CD5-xxx), ฯลฯ
  workRequestNo?: string;
  
  // ข้อมูลเมื่อลงมือปฏิบัติงานจริง
  actualStartTime?: string;
  actualEndTime?: string;
  actualDurationMins?: number;
  workSummaryNotes?: string;
  rootCauseWhy1?: string;
  correctiveAction?: string;
  
  // การตรวจรับและส่งมอบงานโดยฝ่ายผลิต (Handover & Acceptance)
  productionAcceptedBy?: string;
  productionAcceptedAt?: string;
  productionHandoverNotes?: string;
  satisfactionRating?: number;
  
  // Phase 3: การปิดใบงานสมบูรณ์แบบ (Failure Codes, Actual Parts Deduction & Knowledge Integration)
  failureCode?: WorkOrderFailureCode;
  actualPartsUsed?: UsedPartItem[];
  totalPartsCost?: number;
  savedToKnowledge?: boolean;
  knowledgeItemId?: string;

  // ข้อมูลระบบ
  createdAt: string;
  createdBy: string;
  releasedAt?: string;
  releasedBy?: string;
  closedAt?: string;
  closedBy?: string;
}

export type WorkOrderFailureSubsystem = 
  | 'MECHANICAL'
  | 'ELECTRICAL'
  | 'PNEUMATIC'
  | 'SENSOR_CONTROL'
  | 'THERMAL'
  | 'HYDRAULIC_VACUUM'
  | 'OTHER';

export interface WorkOrderFailureCode {
  subsystem: WorkOrderFailureSubsystem;
  subsystemLabel: string;
  symptomCode: string;
  symptomLabel: string;
  causeCode: string;
  causeLabel: string;
  actionCode: string;
  actionLabel: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}




