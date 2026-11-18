export type LevelingFootStatus = 'PENDING' | 'COMPLETED' | 'CANNOT_REPLACE';

export type LevelingFootRowType = 'ITEM' | 'CANNOT_REPLACE' | 'SOLID_FOOT' | 'NO_BELT';

export interface LevelingFootItem {
  id: string;
  orderNo: number;
  zone: string;
  area: string;
  lineGroup?: string;
  machineName: string;
  rowType: LevelingFootRowType;
  footType: string;
  sizeCode: string;
  footCount: number;
  canImprove: boolean;
  qaPlanMonth: string;
  completedDate: string; // ISO YYYY-MM-DD when completed, or ''
  note: string;
  status: LevelingFootStatus;
  unitPrice: number;
  totalCost: number;
  photo?: string;
  updatedAt?: string;
}

export const LEVELING_FOOT_SIZE_OPTIONS = [
  'M12x50',
  'M16x150',
  'M16x200',
  'M16x250',
  'M20x250',
  'M20x300',
  'M20x310',
  'M22x310',
  '-'
] as const;

export const LEVELING_FOOT_THAI_MONTHS = [
  '',
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.'
] as const;
