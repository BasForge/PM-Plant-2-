import { UserAccount } from '../types';

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
  {
    id: 'usr-tech-01',
    username: 'tech1',
    password: '1234',
    name: 'ช่าง 1 (นายสมชาย - ช่างกลหลัก)',
    role: 'technician',
    department: 'แผนกซ่อมบำรุงเชิงป้องกัน (PM)',
    phone: '082-111-2233',
    createdAt: '2026-01-01'
  },
  {
    id: 'usr-tech-02',
    username: 'tech2',
    password: '1234',
    name: 'ช่าง 2 (นายวิชัย - ช่างไฟฟ้าระบบ)',
    role: 'technician',
    department: 'แผนกไฟฟ้าและคอนโทรล',
    phone: '083-444-5566',
    createdAt: '2026-01-01'
  },
  {
    id: 'usr-viewer',
    username: 'viewer',
    password: '1234',
    name: 'ฝ่ายผลิต/ผู้สังเกตการณ์ (View Only)',
    role: 'viewer',
    department: 'ฝ่ายผลิตอาหารและแปรรูป',
    phone: '084-777-8899',
    createdAt: '2026-01-01'
  }
];
