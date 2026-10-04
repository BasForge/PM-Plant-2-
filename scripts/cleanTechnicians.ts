import fs from 'fs';
import path from 'path';

const FACTORY_TECHNICIANS = [
  "ช่างอุ้ย",
  "ช่างโอเว่น",
  "ช่างปอ",
  "ช่างเชฟ",
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

function isFakeName(name: string): boolean {
  if (!name) return true;
  const trimmed = name.trim();
  if (/^ช่าง\s*\d+$/.test(trimmed)) return true;
  if (trimmed === 'ช่างสมชาย' || trimmed === 'ช่างวิชัย' || trimmed === 'ช่างประสิทธิ์') return true;
  if (trimmed.includes('Outsource') || trimmed.includes('ซัพพลายเออร์')) return true;
  if (trimmed.includes('ช่าง 1') || trimmed.includes('ช่าง 2')) return true;
  return false;
}

function cleanTech(name: string, index: number): string {
  if (!isFakeName(name) && FACTORY_TECHNICIANS.includes(name.trim())) {
    return name.trim();
  }
  return FACTORY_TECHNICIANS[index % FACTORY_TECHNICIANS.length];
}

function cleanTechs(names: string[] | undefined, index: number): string[] {
  if (!Array.isArray(names) || names.length === 0) {
    return [FACTORY_TECHNICIANS[index % FACTORY_TECHNICIANS.length]];
  }
  const valid = names.filter(n => !isFakeName(n) && FACTORY_TECHNICIANS.includes(n.trim()));
  if (valid.length > 0) {
    return valid;
  }
  return [FACTORY_TECHNICIANS[index % FACTORY_TECHNICIANS.length]];
}

// 1. Update src/data/cpramRepairHistory.ts
const repairHistoryPath = path.join(process.cwd(), 'src/data/cpramRepairHistory.ts');
if (fs.existsSync(repairHistoryPath)) {
  let content = fs.readFileSync(repairHistoryPath, 'utf-8');
  const jsonStart = content.indexOf('[');
  const jsonEnd = content.lastIndexOf(']');
  if (jsonStart !== -1 && jsonEnd !== -1) {
    const repairs = JSON.parse(content.substring(jsonStart, jsonEnd + 1));
    const cleanedRepairs = repairs.map((r: any, idx: number) => {
      const assignedTech = FACTORY_TECHNICIANS[idx % FACTORY_TECHNICIANS.length];
      return {
        ...r,
        technician: assignedTech,
        technicians: [assignedTech]
      };
    });
    const newTsContent = `import { RepairLog } from '../types';\n\nexport const CPRAM_PDF_REPAIRS: RepairLog[] = ${JSON.stringify(cleanedRepairs, null, 2)};\n`;
    fs.writeFileSync(repairHistoryPath, newTsContent, 'utf-8');
    console.log(`Updated ${cleanedRepairs.length} records in cpramRepairHistory.ts with factory technicians.`);
  }
}

// 2. Update db.json
const dbPath = path.join(process.cwd(), 'db.json');
if (fs.existsSync(dbPath)) {
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  
  // Set technicians list
  db.technicians = FACTORY_TECHNICIANS;

  // Clean repairs
  if (Array.isArray(db.repairs)) {
    db.repairs = db.repairs.map((r: any, idx: number) => {
      const assignedTech = FACTORY_TECHNICIANS[idx % FACTORY_TECHNICIANS.length];
      return {
        ...r,
        technician: assignedTech,
        technicians: [assignedTech]
      };
    });
  }

  // Clean schedules
  if (Array.isArray(db.schedules)) {
    db.schedules = db.schedules.map((s: any, idx: number) => {
      const cleanMain = cleanTech(s.technician, idx);
      const cleanList = cleanTechs(s.technicians, idx);
      return {
        ...s,
        technician: cleanMain,
        technicians: cleanList
      };
    });
  }

  // Clean improvements
  if (Array.isArray(db.improvements)) {
    db.improvements = db.improvements.map((imp: any, idx: number) => {
      return {
        ...imp,
        technician: cleanTech(imp.technician, idx),
        technicians: cleanTechs(imp.technicians, idx)
      };
    });
  }

  // Clean setupLogs
  if (Array.isArray(db.setupLogs)) {
    db.setupLogs = db.setupLogs.map((log: any, idx: number) => {
      return {
        ...log,
        technician: cleanTech(log.technician, idx),
        technicians: cleanTechs(log.technicians, idx)
      };
    });
  }

  // Clean leaves
  if (Array.isArray(db.leaves)) {
    db.leaves = db.leaves.map((lv: any, idx: number) => {
      return {
        ...lv,
        technician: cleanTech(lv.technician, idx)
      };
    });
  }

  // Clean users
  if (Array.isArray(db.users)) {
    db.users = db.users.map((u: any) => {
      if (u.id === 'usr-tech-01') {
        return { ...u, name: 'ช่างอุ้ย (หัวหน้าช่างประจำโรงงาน)' };
      }
      if (u.id === 'usr-tech-02') {
        return { ...u, name: 'ช่างโอเว่น (ช่างประจำโรงงาน)' };
      }
      return u;
    });
  }

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
  console.log(`Updated db.json cleanly.`);
}
