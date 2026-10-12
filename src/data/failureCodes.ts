import { WorkOrderFailureSubsystem } from '../types';

export interface FailureSubsystemDef {
  key: WorkOrderFailureSubsystem;
  label: string;
  icon: string;
  description: string;
}

export interface FailureSymptomDef {
  code: string;
  label: string;
  subsystem: WorkOrderFailureSubsystem;
  description: string;
}

export interface FailureCauseDef {
  code: string;
  label: string;
  description: string;
  category?: string;
}

export interface FailureActionDef {
  code: string;
  label: string;
  description: string;
}

export const FAILURE_SUBSYSTEMS: FailureSubsystemDef[] = [
  {
    key: 'MECHANICAL',
    label: 'เครื่องกล & ระบบส่งกำลัง (Mechanical)',
    icon: '⚙️',
    description: 'สายพาน, โซ่, เกียร์ทด, ตลับลูกปืน, เพลา, ใบมีด, คัปปลิ้ง'
  },
  {
    key: 'ELECTRICAL',
    label: 'ไฟฟ้า & มอเตอร์ (Electrical)',
    icon: '⚡',
    description: 'มอเตอร์ขับ, แมกเนติก, โอเวอร์โหลด, อินเวอร์เตอร์, สายไฟ, แหล่งจ่ายไฟ'
  },
  {
    key: 'PNEUMATIC',
    label: 'ระบบลมนิวเมติกส์ (Pneumatics)',
    icon: '💨',
    description: 'กระบอกลม, โซลินอยด์วาล์ว, สายลม, เรกูเลเตอร์, ชุดกรองดักน้ำ FRL'
  },
  {
    key: 'SENSOR_CONTROL',
    label: 'เซนเซอร์ & คอนโทรล (Sensor & PLC)',
    icon: '🎛️',
    description: 'โฟโตเซนเซอร์, พร็อกซิมิตี้, ลิมิตสวิตช์, PLC, จอ HMI, สัญญาณ IO'
  },
  {
    key: 'THERMAL',
    label: 'ระบบความร้อน & ฮีตเตอร์ (Thermal)',
    icon: '🔥',
    description: 'ฮีตเตอร์แท่ง/แผ่น, เทอร์โมคัปเปิล RTD, โซลิดสเตทรีเลย์ SSR, ฉนวน'
  },
  {
    key: 'HYDRAULIC_VACUUM',
    label: 'สุญญากาศ & ไฮดรอลิก (Vacuum/Hydraulic)',
    icon: '🌀',
    description: 'ปั๊มสุญญากาศ Vacuum Pump, ถ้วยดูดยาง Suction Cup, วาล์วดูดอากาศ'
  },
  {
    key: 'OTHER',
    label: 'โครงสร้าง & อื่นๆ (Structure/Other)',
    icon: '🔧',
    description: 'โครงสร้างเฟรม, ฝาครอบนิรภัย, บานพับ, ท่อลำเลียง, การ์ดป้องกัน'
  }
];

export const FAILURE_SYMPTOMS: FailureSymptomDef[] = [
  // Mechanical
  { code: 'FS-M01', label: 'เสียงดังผิดปกติ หรือการสั่นสะเทือนรุนแรง', subsystem: 'MECHANICAL', description: 'เสียงลูกปืนหอน เสียงเฟืองขบกัน หรือโครงเครื่องสั่น' },
  { code: 'FS-M02', label: 'สายพาน/โซ่ หย่อน รูด หรือขาด', subsystem: 'MECHANICAL', description: 'สายพานลำเลียงลื่น รูดตกขอบ หรือข้อต่อโซ่ขับขาด' },
  { code: 'FS-M03', label: 'แบริ่ง/ตลับลูกปืนติดขัด หรือร้อนจัด', subsystem: 'MECHANICAL', description: 'Bearing ร้อนเกิน 75°C เพลาหมุนฝืด ติดขัด' },
  { code: 'FS-M04', label: 'ชิ้นงานติดขัดในกลไกส่งกำลัง (Jam)', subsystem: 'MECHANICAL', description: 'ถาดบรรจุหรือกล่องติดขัดในรางนำทาง ส่งผลให้สายพานหยุด' },
  { code: 'FS-M05', label: 'ใบมีดทื่อ ชิ้นงานตัดไม่ขาด ขอบเป็นขุย', subsystem: 'MECHANICAL', description: 'ใบมีดซีลหรือใบมีดตัดชิ้นงานสึกหรอ ตัดฟิล์มไม่เรียบ' },
  { code: 'FS-M06', label: 'น็อตคลายตัว โครงยึดหลวม สลักหลุด', subsystem: 'MECHANICAL', description: 'จุดยึดแท่นเครื่องหรือชุดยึดมอเตอร์สั่นคลอน' },

  // Electrical
  { code: 'FS-E01', label: 'มอเตอร์ไม่หมุน / โอเวอร์โหลดทริป', subsystem: 'ELECTRICAL', description: 'กระแสไฟเกิน Motor Overload Trip หรือฟิวส์ขาด' },
  { code: 'FS-E02', label: 'สายไฟขาดใน / ขั้วต่อหลวม สัญญาณติดๆ ดับๆ', subsystem: 'ELECTRICAL', description: 'Terminal หลวม สายไฟพับงอทำให้กระแสไฟไม่นิ่ง' },
  { code: 'FS-E03', label: 'อินเวอร์เตอร์ตัดการทำงาน (Drive Fault)', subsystem: 'ELECTRICAL', description: 'VFD แสดง Error เช่น OC (Overcurrent) หรือ OH (Overheat)' },
  { code: 'FS-E04', label: 'แหล่งจ่ายไฟ 24VDC ดรอป หรือดับ', subsystem: 'ELECTRICAL', description: 'Switching Power Supply มีปัญหา จ่ายไฟเลี้ยงระบบควบคุมไม่ได้' },

  // Pneumatics
  { code: 'FS-P01', label: 'ลมรั่ว มีเสียงฟู่ แรงดันลมตก', subsystem: 'PNEUMATIC', description: 'ข้อต่อลมแตก สายลมรั่ว หรือซีลกระบอกลมเสื่อม' },
  { code: 'FS-P02', label: 'กระบอกลมเคลื่อนที่ค้าง หรือช้าผิดปกติ', subsystem: 'PNEUMATIC', description: 'แกนกระบอกลมฝืด ซีลลูกสูบชำรุด หรือ Speed Controller อุดตัน' },
  { code: 'FS-P03', label: 'โซลินอยด์วาล์วไม่ตอบสนอง / วาล์วค้าง', subsystem: 'PNEUMATIC', description: 'ขดลวด Solenoid ขาด หรือสปูลวาล์วติดขัดจากคราบน้ำมันแห้ง' },
  { code: 'FS-P04', label: 'ชุดกรองลมตัน หรือมีน้ำสะสมในระบบลม', subsystem: 'PNEUMATIC', description: 'ไส้กรองลมตัน ไม่เดรนน้ำทิ้ง ทำให้หยดน้ำปนเปื้อนระบบ' },

  // Sensor & Control
  { code: 'FS-S01', label: 'เซนเซอร์ไม่ตรวจจับ / สัญญาณหลอก (False Trigger)', subsystem: 'SENSOR_CONTROL', description: 'มีฝุ่นผงแป้งเกาะหน้าเลนส์ หรือระยะตรวจจับคลาดเคลื่อน' },
  { code: 'FS-S02', label: 'ลิมิตสวิตช์ หรือ พร็อกซิมิตี้ชำรุด', subsystem: 'SENSOR_CONTROL', description: 'ก้านสวิตช์หัก หรือไฟสถานะ LED ไม่ติดเมื่อมีวัตถุตัดผ่าน' },
  { code: 'FS-S03', label: 'PLC / HMI แจ้งเตือน Alarm Interlock', subsystem: 'SENSOR_CONTROL', description: 'ระบบความปลอดภัย Safety Relay ไม่ยอมรีเซ็ต หรือเกิด Timeout' },
  { code: 'FS-S04', label: 'ระบบชั่งน้ำหนัก / Loadcell คลาดเคลื่อน', subsystem: 'SENSOR_CONTROL', description: 'ค่าน้ำหนักเพี้ยน เกินพิกัดความเผื่อ (Tolerance) ต้อง Re-Zero' },

  // Thermal
  { code: 'FS-T01', label: 'อุณหภูมิไม่ถึงค่าที่ตั้งไว้ (Heat Loss)', subsystem: 'THERMAL', description: 'ฮีตเตอร์ขาด ขั้วต่อสายไหม้ หรือเทอร์โมคอนโทรลเลอร์สั่งงานไม่ได้' },
  { code: 'FS-T02', label: 'อุณหภูมิสูงเกินกำหนด ฮีตเตอร์ไม่ตัด (Overheat)', subsystem: 'THERMAL', description: 'Solid State Relay (SSR) ช็อตค้าง หรือเซนเซอร์วัดค่าเพี้ยน' },
  { code: 'FS-T03', label: 'เทอร์โมคัปเปิลขาด (Thermocouple Open)', subsystem: 'THERMAL', description: 'หน้าจอแสดงผล Er.1 / Sensor Break ไม่สามารถวัดอุณหภูมิได้' },

  // Vacuum / Hydraulic
  { code: 'FS-V01', label: 'แรงดูดสุญญากาศตก / ถ้วยดูดจับชิ้นงานหลุด', subsystem: 'HYDRAULIC_VACUUM', description: 'ยางดูด Suction Pad ฉีกขาด หรือไส้กรองแวคคั่มอุดตัน' },
  { code: 'FS-V02', label: 'ปั๊มสุญญากาศเสียงดัง หรือความดันตก', subsystem: 'HYDRAULIC_VACUUM', description: 'ใบพัดคาร์บอน (Carbon Vane) สึกหรอ หรือน้ำมันปั๊มขาด' },

  // Other
  { code: 'FS-O99', label: 'อาการอื่นๆ / ต้องวิเคราะห์เพิ่มเติม', subsystem: 'OTHER', description: 'อาการไม่ระบุแน่ชัด หรือเกิดจากหลายระบบร่วมกัน' }
];

export const FAILURE_CAUSES: FailureCauseDef[] = [
  { code: 'FC-01', label: 'การสึกหรอตามอายุการใช้งานปกติ (Normal Wear & Tear)', description: 'ชิ้นส่วนหมดอายุการใช้งานตาม MTBF เช่น ลูกปืน สายพาน ซีล' },
  { code: 'FC-02', label: 'ขาดการหล่อลื่น / จาระบีแห้ง / น้ำมันหมด', description: 'ไม่ได้อัดจาระบีตามรอบ หรือประเภทสารหล่อลื่นไม่เหมาะสม' },
  { code: 'FC-03', label: 'ฝุ่นผง / แป้ง / เศษวัตถุดิบสะสมขัดกลไก', description: 'ขาดการทำความสะอาดประจำวัน หรือไม่มีฝาครอบกันฝุ่น' },
  { code: 'FC-04', label: 'น็อตคลายตัว / Alignment แนวตั้งศูนย์คลาดเคลื่อน', description: 'แรงสั่นสะเทือนต่อเนื่องทำให้น็อตคลายตัวหรือไม่ได้ทากาวล็อคไทท์' },
  { code: 'FC-05', label: 'ชิ้นส่วนอุปกรณ์ไฟฟ้าเสื่อมสภาพตามเวลา', description: 'ขดลวดฉนวนเสื่อม คาปาซิเตอร์แห้ง หน้าสัมผัสไหม้' },
  { code: 'FC-06', label: 'สปริงล้า / ยางเสื่อมสภาพ / ซีลแตกกรอบ', description: 'สัมผัสความร้อน สารเคมีล้างทำความสะอาด หรือแรงเค้นต่อเนื่อง' },
  { code: 'FC-07', label: 'ผู้ปฏิบัติงานใช้งานหรือตั้งค่าผิดวิธี (Operator Error)', description: 'ปรับพารามิเตอร์ไม่ตรงสเปก หรือป้อนชิ้นงานติดขัด' },
  { code: 'FC-08', label: 'แรงกระแทกจากสิ่งแปลกปลอมตกหล่นในไลน์', description: 'เศษวัสดุภายนอกตกลงไปในร่องฟันเฟืองหรือรางเลื่อน' },
  { code: 'FC-09', label: 'อะไหล่ไม่ได้คุณภาพ / ชำรุดก่อนเวลาอันควร', description: 'เกรดอะไหล่ไม่ได้มาตรฐานการผลิต หรือเกิด Defect จากโรงงานผู้ผลิต' },
  { code: 'FC-10', label: 'ความดันลมหรือระบบจ่ายพลังงานไม่เสถียร', description: 'แรงดัน Main Air Drop หรือไฟตก ไฟกระชาก' },
  { code: 'FC-99', label: 'สาเหตุอื่นๆ / อยู่ระหว่างวิเคราะห์ Why-Why เพิ่มเติม', description: 'ยังไม่สามารถระบุได้ชัดเจนทันที ต้องทำ Why-Why Analysis' }
];

export const FAILURE_ACTIONS: FailureActionDef[] = [
  { code: 'AC-01', label: 'ปรับตั้ง / ทำความสะอาด / ขันแน่น (Adjust, Clean & Tighten)', description: 'ล้างสิ่งสกปรก ปรับแนวศูนย์ และขันย้ำน็อตให้แน่นตามแรงทอร์ก' },
  { code: 'AC-02', label: 'เบิกเปลี่ยนอะไหล่ใหม่จากคลัง (Replace with New Part)', description: 'ถอดชิ้นส่วนที่ชำรุดออกและติดตั้งอะไหล่ใหม่จากคลังสินค้า' },
  { code: 'AC-03', label: 'ซ่อมแซม / ปรับแต่งชิ้นส่วนเดิมใช้งานต่อ (Refurbish & Reuse)', description: 'กลึง ดัด เชื่อม หรือขัดทำความสะอาดชิ้นงานเดิมเพื่อเดินเครื่องต่อ' },
  { code: 'AC-04', label: 'ทำความสะอาดและอัดจาระบี/หล่อลื่นใหม่ (Re-lubricate)', description: 'ล้างคราบสารหล่อลื่นเก่าและอัดจาระบี Food Grade ใหม่' },
  { code: 'AC-05', label: 'คาลิเบรตตั้งระยะเซนเซอร์ใหม่ (Calibrate Sensor)', description: 'ปรับระยะตรวจจับ ทำความสะอาดหน้าเลนส์ และจูนค่าความไว' },
  { code: 'AC-06', label: 'แก้ไขวงจรไฟฟ้า / ย้ำหางปลา / เข้าสายใหม่ (Rewire)', description: 'ขันจุดต่อ Terminal และเปลี่ยนสายไฟที่ชำรุดเสียหาย' },
  { code: 'AC-07', label: 'รีเซ็ตพารามิเตอร์และทดสอบระบบควบคุม (Reset & Test)', description: 'ตั้งค่าพารามิเตอร์อินเวอร์เตอร์หรือเคลียร์ Fault บนจอสัมผัส' },
  { code: 'AC-08', label: 'ปรับปรุงเชิงวิศวกรรมเพื่อป้องกันการเกิดซ้ำ (Engineering Kaizen)', description: 'ออกแบบการ์ดกันฝุ่น หรือปรับโครงสร้างไม่ให้เกิดปัญหาเดิมซ้ำ' },
  { code: 'AC-99', label: 'วิธีแก้ไขอื่นๆ (Other Remedy Action)', description: 'วิธีดำเนินการเฉพาะทางอื่นๆ' }
];

/**
 * Helper: ค้นหาข้อมูล Failure Code ตาม Subsystem
 */
export function getSymptomsBySubsystem(subsystem: WorkOrderFailureSubsystem): FailureSymptomDef[] {
  if (subsystem === 'OTHER') return FAILURE_SYMPTOMS;
  return FAILURE_SYMPTOMS.filter(s => s.subsystem === subsystem || s.subsystem === 'OTHER');
}

export function findSymptomByCode(code: string): FailureSymptomDef | undefined {
  return FAILURE_SYMPTOMS.find(s => s.code.toUpperCase() === code.toUpperCase());
}

export function findCauseByCode(code: string): FailureCauseDef | undefined {
  return FAILURE_CAUSES.find(c => c.code.toUpperCase() === code.toUpperCase());
}

export function findActionByCode(code: string): FailureActionDef | undefined {
  return FAILURE_ACTIONS.find(a => a.code.toUpperCase() === code.toUpperCase());
}

export function findSubsystemDef(key: WorkOrderFailureSubsystem): FailureSubsystemDef {
  return FAILURE_SUBSYSTEMS.find(s => s.key === key) || FAILURE_SUBSYSTEMS[0];
}
