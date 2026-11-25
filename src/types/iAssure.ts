export type IAssureStatus = 'ACTIVE' | 'PASSED_STANDBY' | 'FAILED';

export type CalibrationResult = 'PASS' | 'FAIL' | 'PENDING' | 'NA';

export interface IAssureItem {
  id: string;
  orderNo: number;
  machineName: string;
  status: IAssureStatus;
  partToReplace: string; // e.g. 'Light box' or ''
  serialNumber: string; // e.g. 'S/n 2028810037TZH ติดกับเครื่องแพ็คUlma 2'
  testResult: string; // รายละเอียดผลการทดสอบ
  lightBoxCalibrate: CalibrationResult;
  iAssureCalibrate: CalibrationResult;
  prPoNo?: string; // เลข PR/PO สั่งซื้ออุปกรณ์
  estimatedCost?: number; // งบประมาณ/ราคาอะไหล่ (บาท)
  targetDate?: string; // แผนกำหนดแล้วเสร็จ QA (YYYY-MM-DD)
  activatedDate?: string; // วันที่เปิดใช้งานจริง (YYYY-MM-DD)
  responsibleTech?: string; // ช่างผู้รับผิดชอบ
  photo?: string; // รูปภาพหน้างาน/หน้าจอคาลิเบท (compressed)
  updatedAt?: string;
}

export const IASSURE_STATUS_LABELS: Record<IAssureStatus, string> = {
  ACTIVE: 'เปิดใช้งาน',
  PASSED_STANDBY: 'เทสผ่าน แต่ยังไม่เปิดใช้งาน',
  FAILED: 'ไม่ผ่าน'
};

export const CALIBRATION_LABELS: Record<CalibrationResult, string> = {
  PASS: 'ผ่าน',
  FAIL: 'ไม่ผ่าน',
  PENDING: 'รอทดสอบ',
  NA: 'ไม่ระบุ'
};

export const IASSURE_COMMON_PARTS = [
  '',
  'Light box',
  'Printhead (หัวพิมพ์)',
  'Camera / Sensor iAssure',
  'Ribbon Cassette',
  'Mainboard / Controller'
] as const;
