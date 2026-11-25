import { IAssureItem } from '../types/iAssure';

/**
 * ข้อมูลตั้งต้นจากเอกสาร "iAssure Videojet 6530.pdf" (งาน QA)
 * สรุปตามต้นฉบับ:
 * - เครื่องทั้งหมด: 7 เครื่อง
 * - เปิดใช้งานแล้ว (ACTIVE): 3 เครื่อง (43%)
 * - เทสผ่าน แต่ยังไม่เปิดใช้งาน (PASSED_STANDBY): 1 เครื่อง (14%)
 * - ไม่ผ่าน (FAILED): 3 เครื่อง (43%)
 * - อุปกรณ์ที่ต้องเปลี่ยน: Light box จำนวน 4 ชุด (Ulma 1, Ulma 2, เครื่องติดสติ๊กเกอร์ 2, เครื่อง FFS BG)
 */
export const PRELOADED_IASSURE_ITEMS: IAssureItem[] = [
  {
    id: 'ias-001',
    orderNo: 1,
    machineName: 'Ulma 1',
    status: 'FAILED',
    partToReplace: 'Light box',
    serialNumber: '',
    testResult: 'คาลิเบทไม่ผ่าน',
    lightBoxCalibrate: 'FAIL',
    iAssureCalibrate: 'FAIL',
    prPoNo: '',
    estimatedCost: 0,
    targetDate: '',
    activatedDate: '',
    responsibleTech: ''
  },
  {
    id: 'ias-002',
    orderNo: 2,
    machineName: 'Ulma 2',
    status: 'FAILED',
    partToReplace: 'Light box',
    serialNumber: 'S/n 2028810037TZH ติดกับเครื่องแพ็คUlma 2',
    testResult:
      'ทำการ reset light box, reset iAssure\nคาลิเบท light box ผ่าน แต่คาลิเบท iAssure ไม่ผ่าน\nโดยการลองปรับตั้งค่าความเข้มและแรงกดของหัวพิมพ์หลายๆ ค่า แต่ก็ยังคาลิเบทไม่ผ่าน น่าจะเป็นที่ light box ต้องลองเปลี่ยนดู',
    lightBoxCalibrate: 'PASS',
    iAssureCalibrate: 'FAIL',
    prPoNo: '',
    estimatedCost: 0,
    targetDate: '',
    activatedDate: '',
    responsibleTech: ''
  },
  {
    id: 'ias-003',
    orderNo: 3,
    machineName: 'เครื่องติดสติ๊กเกอร์ 1',
    status: 'ACTIVE',
    partToReplace: '',
    serialNumber: 'S/n. 201491009TZH.',
    testResult:
      'ทำการ reset light box, reset iAssure\nคาลิเบท light box ผ่าน คาลิเบท iAssure ผ่าน เปิดใช้งาน iAssure ได้ปกติ\nได้ทำการโคลนเครื่องที่คาลิเบท iAssure ผ่าน ไปลองใส่กับเครื่องที่ calibrate ไม่ผ่าน เครื่องก็ยังแจ้งเตือนให้ calibrate iAssure ไม่สามารถโคลนค่ามาใช้ได้\nเนื่องจากไลน์ผลิตมีเวลาจำกัดไม่สามารถตรวจสอบเครื่องที่มีปัญหาให้ละเอียดได้',
    lightBoxCalibrate: 'PASS',
    iAssureCalibrate: 'PASS',
    prPoNo: '',
    estimatedCost: 0,
    targetDate: '',
    activatedDate: '',
    responsibleTech: ''
  },
  {
    id: 'ias-004',
    orderNo: 4,
    machineName: 'เครื่องติดสติ๊กเกอร์ 2',
    status: 'FAILED',
    partToReplace: 'Light box',
    serialNumber: 'S/n 201491005TZH. Sticker line 2',
    testResult:
      'ทำการ reset light box, reset iAssure\nคาลิเบท light box ไม่ผ่าน light box มีปัญหา ต้องเปลี่ยน',
    lightBoxCalibrate: 'FAIL',
    iAssureCalibrate: 'FAIL',
    prPoNo: '',
    estimatedCost: 0,
    targetDate: '',
    activatedDate: '',
    responsibleTech: ''
  },
  {
    id: 'ias-005',
    orderNo: 5,
    machineName: 'เครื่อง Topseal ข้าวเหนียว',
    status: 'ACTIVE',
    partToReplace: '',
    serialNumber: '',
    testResult: '',
    lightBoxCalibrate: 'PASS',
    iAssureCalibrate: 'PASS',
    prPoNo: '',
    estimatedCost: 0,
    targetDate: '',
    activatedDate: '',
    responsibleTech: ''
  },
  {
    id: 'ias-006',
    orderNo: 6,
    machineName: 'เครื่อง FFS BG',
    status: 'PASSED_STANDBY',
    partToReplace: 'Light box',
    serialNumber: '',
    testResult: 'เทสผ่านแล้ว แต่ต้องเปลี่ยน light box',
    lightBoxCalibrate: 'PASS',
    iAssureCalibrate: 'PASS',
    prPoNo: '',
    estimatedCost: 0,
    targetDate: '',
    activatedDate: '',
    responsibleTech: ''
  },
  {
    id: 'ias-007',
    orderNo: 7,
    machineName: 'เครื่อง Topseal สลัด',
    status: 'ACTIVE',
    partToReplace: '',
    serialNumber: '',
    testResult: '',
    lightBoxCalibrate: 'PASS',
    iAssureCalibrate: 'PASS',
    prPoNo: '',
    estimatedCost: 0,
    targetDate: '',
    activatedDate: '',
    responsibleTech: ''
  }
];
