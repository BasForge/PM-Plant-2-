import { RoomConfig } from '../types/mtbf';

export const OFFICIAL_MTBF_ROOMS: RoomConfig[] = [
  {
    id: 'room-1',
    name: 'ห้องซุยข้าว',
    machines: [
      { id: 'RIM01', name: 'RICE MIXER 1', ranking: 'A' },
      { id: 'RIM02', name: 'RICE MIXER 2', ranking: 'A' },
      { id: 'TOC01', name: 'RICE TAKE-OUT CONVEYOR 1', ranking: 'A' },
      { id: 'TOC02', name: 'RICE TAKE-OUT CONVEYOR 2', ranking: 'A' }
    ]
  },
  {
    id: 'room-2',
    name: 'ห้องแวคข้าว',
    machines: [
      { id: 'VCA01', name: 'VACUUM COOLER1', ranking: 'B', altIds: ['VAC01'] },
      { id: 'VCA02', name: 'VACUUM COOLER2', ranking: 'B', altIds: ['VAC02'] },
      { id: 'VCA05', name: 'VACUUM COOLER3', ranking: 'B', altIds: ['VAC05'] },
      { id: 'BCH01', name: 'BLAST CHILLER', ranking: 'B' }
    ]
  },
  {
    id: 'room-3',
    name: 'ห้องแวคกับข้าว',
    machines: [
      { id: 'VCA03', name: 'VACUUM COOLER1', ranking: 'B', altIds: ['VAC03'] },
      { id: 'VAC04', name: 'VACUUM COOLER2', ranking: 'B', altIds: ['VCA04'] },
      { id: 'VAC06', name: 'VACUUM COOLER3', ranking: 'B', altIds: ['VCA06'] },
      { id: 'TSC001', name: 'Scroll Shear#1', ranking: 'A', altIds: ['TSC01'] }
    ]
  },
  {
    id: 'room-4',
    name: 'ห้องขึ้นรูปข้าวกล่อง',
    machines: [
      { id: 'ATS01', name: 'AUTOMATIC TOP SEARER1', ranking: 'A' },
      { id: 'ATS02', name: 'AUTOMATIC TOP SEARER2', ranking: 'A' },
      { id: 'FFS01', name: 'HORIZONTAL FORM FILL SEAL1', ranking: 'A' },
      { id: 'FFS02', name: 'HORIZONTAL FORM FILL SEAL2', ranking: 'A' },
      { id: 'FFS03', name: 'HORIZONTAL FORM FILL SEAL3', ranking: 'A' },
      { id: 'STN01', name: 'SHRINK TUNNEL1', ranking: 'A' },
      { id: 'STN02', name: 'SHRINK TUNNEL2', ranking: 'A' },
      { id: 'TSS01', name: 'TOP SEALER RICE STICKY', ranking: 'A', altIds: ['STK01', 'STK02'] },
      { id: 'TSC01', name: 'TOP SEALER CUP TO GO', ranking: 'A', altIds: ['CLM01'] },
      { id: 'RPT01', name: 'RICE PORTION1', ranking: 'A' },
      { id: 'RPT02', name: 'RICE PORTION2', ranking: 'A' },
      { id: 'SRM01', name: 'STICKY RICE FORMING', ranking: 'A', altIds: ['RPT02_STICKY', 'SRM01'] }
    ]
  },
  {
    id: 'room-5',
    name: 'ห้องขึ้นรูปข้าวปั้น',
    machines: [
      { id: 'RFD01', name: 'RICE FEEDER1', ranking: 'A' },
      { id: 'FMC01', name: 'FORMING CONVEYOR', ranking: 'A' },
      { id: 'WRM01', name: 'WRAPPING MACHINE', ranking: 'A', altIds: ['WPM01'] },
      { id: 'RFD02', name: 'RICE FEEDER2', ranking: 'A' },
      { id: 'CTC01', name: 'CUTTING CONVEYOR', ranking: 'A', altIds: ['CUC01'] },
      { id: 'RWM01', name: 'ROLL SUSHI WRAPPING MACHINE', ranking: 'A', altIds: ['RSW01'] },
      { id: 'STF01', name: 'STUFFER1', ranking: 'A' },
      { id: 'STF02', name: 'STUFFER2', ranking: 'A' },
      { id: 'TSY01', name: 'TOP SEAL ยำสาหร่าย', ranking: 'A', altIds: ['TLP01'] },
      { id: 'MIV01', name: 'MIXER VERTICAL 1', ranking: 'A' },
      { id: 'MIV02', name: 'MIXER VERTICAL 2', ranking: 'A' },
      { id: 'ONG01', name: 'ONIGIRI ROBOT (SUPPLY UNIT)', ranking: 'A' },
      { id: 'ONR01', name: 'ONIGIRI ROBOT', ranking: 'A', altIds: ['OFR01'] },
      { id: 'WHD01', name: 'WEIGHING DEVICE', ranking: 'A', altIds: ['OWD01', 'WHS01'] },
      { id: 'WHR01', name: 'WEIGHING DEVICE (REJECT)', ranking: 'A' },
      { id: 'AWR01', name: 'AUTOMATIC RICE BALL WRAPPING MACHINE', ranking: 'A' }
    ]
  },
  {
    id: 'room-6',
    name: 'ห้องขึ้นรูปสลัด',
    machines: [
      { id: 'TFD002', name: 'TOP SEALER SALAD', ranking: 'A', altIds: ['TLP02', 'TFD02'] },
      { id: 'MDT01', name: 'METAL DETECTOR', ranking: 'B', altIds: ['MTD01', 'MTD02'] },
      { id: 'XIS01', name: 'X-RAY INSPECTION SYSTEM', ranking: 'B', altIds: ['XRA01', 'XRA02'] },
      { id: 'RJT01', name: 'REJECTOR', ranking: 'B', altIds: ['RJT02'] },
      { id: 'CVB01', name: 'CONVEYOR BELT', ranking: 'B', altIds: ['SBC08', 'MBC04'] }
    ]
  },
  {
    id: 'room-7',
    name: 'ห้องล้างอุปกรณ์',
    machines: [
      { id: 'EQW01', name: 'EQUIPMENT WASHING', ranking: 'A', altIds: ['EQW02'] },
      { id: 'DLW01', name: 'DOLLY WASHING', ranking: 'B' }
    ]
  },
  {
    id: 'room-8',
    name: 'ห้องแช่เย็นและแช่แข็ง',
    machines: [
      { id: 'BCF01', name: 'BLAST CHILLER & FREEZER1', ranking: 'B' },
      { id: 'BCF02', name: 'BLAST CHILLER & FREEZER2', ranking: 'B' },
      { id: 'BCF03', name: 'BLAST CHILLER & FREEZER3', ranking: 'B' },
      { id: 'BCF04', name: 'BLAST CHILLER & FREEZER4', ranking: 'B' },
      { id: 'BCF05', name: 'BLAST CHILLER & FREEZER5', ranking: 'B' },
      { id: 'BCF06', name: 'BLAST CHILLER & FREEZER6', ranking: 'A' },
      { id: 'CDU01', name: 'CONDENSING UNIT1', ranking: 'B' },
      { id: 'CDU02', name: 'CONDENSING UNIT2', ranking: 'B' },
      { id: 'CDU03', name: 'CONDENSING UNIT3', ranking: 'B' },
      { id: 'CDU04', name: 'CONDENSING UNIT4', ranking: 'B' },
      { id: 'CDU05', name: 'CONDENSING UNIT5', ranking: 'B' },
      { id: 'CDU06', name: 'CONDENSING UNIT6', ranking: 'B' }
    ]
  }
];

// ค่าเริ่มต้น Production Time (ชั่วโมง) รายเดือน (เดือน 1-12) ประจำปี 2026
// ม.ค. 558, ก.พ. 504, มี.ค. 558, เม.ย. 540, พ.ค. 558, มิ.ย. 540, ก.ค. 558, ส.ค. 558, ก.ย. 540, ต.ค. 558, พ.ย. 540, ธ.ค. 558
export const DEFAULT_PRODUCTION_TIME_MONTHLY_2026 = [
  558, 504, 558, 540, 558, 540, 558, 558, 540, 558, 540, 558
];

// Baseline Data ย้อนหลังปี 2023 - 2025 (เรียงตามลำดับห้อง 8 ห้อง)
export const DEFAULT_BASELINE_HISTORY = {
  2023: {
    breakdownMin: [950, 0, 105, 4985, 3810, 40, 0, 720],
    count: [4, 0, 2, 59, 52, 1, 0, 1],
    mtbf: [1310.8, 6570, 2189.4, 180.1, 122.8, 3284.7, 6570, 3279],
    mttr: [238, 0, 53, 84, 73, 40, 0, 720]
  },
  2024: {
    breakdownMin: [380, 0, 0, 5023, 3245, 0, 0, 3960],
    count: [3, 0, 0, 62, 52, 0, 0, 2],
    mtbf: [1640.9, 6570, 6570, 103, 122.9, 6570, 6570, 2168],
    mttr: [127, 0, 0, 81, 62, 0, 0, 198]
  },
  2025: {
    breakdownMin: [80, 0, 0, 5246, 1151, 0, 0, 0],
    count: [1, 0, 0, 40, 18, 0, 0, 0],
    mtbf: [6570, 6570, 6570, 158.1, 344.8, 6570, 3570, 6570], // ค่า 3570 ของห้องล้างอุปกรณ์ ทำเครื่องหมายเตือนตรวจทาน
    mttr: [0, 0, 0, 131, 64, 0, 0, 0]
  }
};

export const MONTH_NAMES_THAI = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export const MONTH_NAMES_ENG = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];
