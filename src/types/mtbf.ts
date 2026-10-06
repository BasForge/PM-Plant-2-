export interface RoomMachineConfig {
  id: string; // M/C No. เช่น "RIM01"
  name: string; // Machine Name เช่น "RICE MIXER 1"
  ranking: 'A' | 'B' | 'C';
  altIds?: string[]; // รหัสอื่นๆ ที่อาจพบในประวัติซ่อม เช่น "VAC01" สำหรับ "VCA01"
}

export interface RoomConfig {
  id: string;
  name: string; // ชื่อห้อง เช่น "ห้องซุยข้าว"
  machines: RoomMachineConfig[];
}

export interface MonthlyBreakdownMetric {
  monthIndex: number; // 0..11
  monthName: string; // "Jan-26" หรือ "ม.ค."
  productionTime: number; // ชั่วโมง
  breakdownMin: number; // นาที
  breakdownCount: number; // ครั้ง
  cumProductionTime: number; // ชั่วโมงสะสม ม.ค. ถึงเดือนนี้
  cumBreakdownMin: number; // นาทีสะสม ม.ค. ถึงเดือนนี้
  cumBreakdownCount: number; // ครั้งสะสม ม.ค. ถึงเดือนนี้
  mtbf: number | null; // ชั่วโมงสะสม (null ถ้ายังไม่มีข้อมูลในเดือนอนาคต)
  mttr: number | null; // นาทีรายเดือน (null ถ้ายังไม่มีข้อมูลในเดือนอนาคต)
  hasData: boolean;
  repairIds?: string[]; // IDs of matching repair logs
}

export interface YTDMetric {
  productionTime: number;
  breakdownMin: number;
  breakdownCount: number;
  mtbf: number;
  mttr: number;
  repairIds?: string[]; // IDs of matching repair logs for YTD
}

export interface RoomCalculatedMetrics {
  roomId: string;
  roomName: string;
  monthly: MonthlyBreakdownMetric[];
  ytd: YTDMetric;
}

export interface MachineCalculatedMetrics {
  machineId: string;
  machineName: string;
  ranking: 'A' | 'B' | 'C';
  monthly: MonthlyBreakdownMetric[];
  ytd: YTDMetric;
}

export interface SumCalculatedMetrics {
  monthly: {
    monthIndex: number;
    monthName: string;
    productionTime: number;
    breakdownMin: number;
    breakdownCount: number;
    mtbf: number | null; // ค่าเฉลี่ยเลขคณิตของ MTBF ทั้ง 8 ห้อง
    mttr: number | null; // Σ BD ทุกห้อง / Σ N ทุกห้อง
    hasData: boolean;
    repairIds?: string[];
  }[];
  ytd: {
    productionTime: number;
    breakdownMin: number;
    breakdownCount: number;
    mtbf: number;
    mttr: number;
    repairIds?: string[];
  };
  baseline: Record<number, {
    breakdownMin: number[];
    count: number[];
    mtbf: number[];
    mttr: number[];
    totalBD: number;
    totalCount: number;
    avgMTBF: number;
    totalMTTR: number;
    repairIdsByRoom?: Record<number, string[]>;
    totalRepairIds?: string[];
  }>;
}

export interface CustomMachineMapping {
  repairMachineId: string;
  roomId: string;
  targetMachineId: string;
}
