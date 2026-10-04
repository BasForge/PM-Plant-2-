import { UserAccount } from '../types';

export const FACTORY_PLANT_TECHNICIANS: string[] = [
  "ช่างอุ้ย",
  "ช่างโอเว่น",
  "ช่างปอ",
  "ช่างเซฟ",
  "ช่างแบ้ง",
  "ช่างเฟิส",
  "ช่างเกื้อ",
  "ช่างเทค",
  "ช่างแทน",
  "ช่างเอ๊ดดี้",
  "ช่างเต้ย",
  "ช่างโจ",
  "ช่างปุ๊ก",
  "ช่างต้อย",
  "ช่างคีน",
  "ช่างเหน่ง",
  "ช่างบิ๊ก"
];

export const DEFAULT_USER_ACCOUNTS: UserAccount[] = [
  {
    id: 'usr-admin',
    username: 'admin',
    password: 'admin',
    name: 'ผู้ดูแลระบบหลัก (Admin)',
    role: 'admin',
    department: 'ฝ่ายวิศวกรรมและซ่อมบำรุง',
    phone: '081-999-8888',
    createdAt: '2026-01-01'
  },
  // บัญชีพนักงานช่างประจำโรงงาน (มีเฉพาะบัญชีพนักงานช่างจริงประจำโรงงาน 17 ท่าน)
  {
    id: 'usr-tech-aui',
    username: 'tech_aui',
    password: '1234',
    name: 'ช่างอุ้ย',
    role: 'technician',
    department: 'ฝ่ายซ่อมบำรุงประจำโรงงาน',
    phone: '082-101-0001',
    createdAt: '2026-01-01'
  },
  {
    id: 'usr-tech-owen',
    username: 'tech_owen',
    password: '1234',
    name: 'ช่างโอเว่น',
    role: 'technician',
    department: 'ฝ่ายซ่อมบำรุงประจำโรงงาน',
    phone: '082-101-0002',
    createdAt: '2026-01-01'
  },
  {
    id: 'usr-tech-por',
    username: 'tech_por',
    password: '1234',
    name: 'ช่างปอ',
    role: 'technician',
    department: 'ฝ่ายซ่อมบำรุงประจำโรงงาน',
    phone: '082-101-0003',
    createdAt: '2026-01-01'
  },
  {
    id: 'usr-tech-safe',
    username: 'tech_safe',
    password: '1234',
    name: 'ช่างเซฟ',
    role: 'technician',
    department: 'ฝ่ายซ่อมบำรุงประจำโรงงาน',
    phone: '082-101-0004',
    createdAt: '2026-01-01'
  },
  {
    id: 'usr-tech-bank',
    username: 'tech_bank',
    password: '1234',
    name: 'ช่างแบ้ง',
    role: 'technician',
    department: 'ฝ่ายซ่อมบำรุงประจำโรงงาน',
    phone: '082-101-0005',
    createdAt: '2026-01-01'
  },
  {
    id: 'usr-tech-first',
    username: 'tech_first',
    password: '1234',
    name: 'ช่างเฟิส',
    role: 'technician',
    department: 'ฝ่ายซ่อมบำรุงประจำโรงงาน',
    phone: '082-101-0006',
    createdAt: '2026-01-01'
  },
  {
    id: 'usr-tech-kuea',
    username: 'tech_kuea',
    password: '1234',
    name: 'ช่างเกื้อ',
    role: 'technician',
    department: 'ฝ่ายซ่อมบำรุงประจำโรงงาน',
    phone: '082-101-0007',
    createdAt: '2026-01-01'
  },
  {
    id: 'usr-tech-tech',
    username: 'tech_tech',
    password: '1234',
    name: 'ช่างเทค',
    role: 'technician',
    department: 'ฝ่ายซ่อมบำรุงประจำโรงงาน',
    phone: '082-101-0008',
    createdAt: '2026-01-01'
  },
  {
    id: 'usr-tech-tan',
    username: 'tech_tan',
    password: '1234',
    name: 'ช่างแทน',
    role: 'technician',
    department: 'ฝ่ายซ่อมบำรุงประจำโรงงาน',
    phone: '082-101-0009',
    createdAt: '2026-01-01'
  },
  {
    id: 'usr-tech-eddy',
    username: 'tech_eddy',
    password: '1234',
    name: 'ช่างเอ๊ดดี้',
    role: 'technician',
    department: 'ฝ่ายซ่อมบำรุงประจำโรงงาน',
    phone: '082-101-0010',
    createdAt: '2026-01-01'
  },
  {
    id: 'usr-tech-toey',
    username: 'tech_toey',
    password: '1234',
    name: 'ช่างเต้ย',
    role: 'technician',
    department: 'ฝ่ายซ่อมบำรุงประจำโรงงาน',
    phone: '082-101-0011',
    createdAt: '2026-01-01'
  },
  {
    id: 'usr-tech-joe',
    username: 'tech_joe',
    password: '1234',
    name: 'ช่างโจ',
    role: 'technician',
    department: 'ฝ่ายซ่อมบำรุงประจำโรงงาน',
    phone: '082-101-0012',
    createdAt: '2026-01-01'
  },
  {
    id: 'usr-tech-pook',
    username: 'tech_pook',
    password: '1234',
    name: 'ช่างปุ๊ก',
    role: 'technician',
    department: 'ฝ่ายซ่อมบำรุงประจำโรงงาน',
    phone: '082-101-0013',
    createdAt: '2026-01-01'
  },
  {
    id: 'usr-tech-toy',
    username: 'tech_toy',
    password: '1234',
    name: 'ช่างต้อย',
    role: 'technician',
    department: 'ฝ่ายซ่อมบำรุงประจำโรงงาน',
    phone: '082-101-0014',
    createdAt: '2026-01-01'
  },
  {
    id: 'usr-tech-keen',
    username: 'tech_keen',
    password: '1234',
    name: 'ช่างคีน',
    role: 'technician',
    department: 'ฝ่ายซ่อมบำรุงประจำโรงงาน',
    phone: '082-101-0015',
    createdAt: '2026-01-01'
  },
  {
    id: 'usr-tech-neng',
    username: 'tech_neng',
    password: '1234',
    name: 'ช่างเหน่ง',
    role: 'technician',
    department: 'ฝ่ายซ่อมบำรุงประจำโรงงาน',
    phone: '082-101-0016',
    createdAt: '2026-01-01'
  },
  {
    id: 'usr-tech-big',
    username: 'tech_big',
    password: '1234',
    name: 'ช่างบิ๊ก',
    role: 'technician',
    department: 'ฝ่ายซ่อมบำรุงประจำโรงงาน',
    phone: '082-101-0017',
    createdAt: '2026-01-01'
  },
  {
    id: 'usr-prod-01',
    username: 'production',
    password: '1234',
    name: 'หัวหน้ากะ/ฝ่ายผลิต (Production)',
    role: 'production',
    department: 'ฝ่ายผลิต/สายการผลิต',
    phone: '085-333-7788',
    createdAt: '2026-01-01'
  },
  {
    id: 'usr-viewer',
    username: 'viewer',
    password: '1234',
    name: 'ผู้สังเกตการณ์ทั่วไป (View Only)',
    role: 'viewer',
    department: 'ฝ่ายบริหาร/ธุรการ',
    phone: '084-777-8899',
    createdAt: '2026-01-01'
  }
];
