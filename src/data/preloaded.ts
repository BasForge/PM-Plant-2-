import { Machine, CD5Project, ImprovementProject } from '../types';
import { CPRAM_PDF_MACHINES } from './cpramMachines';

export const PRELOADED_MACHINES: Machine[] = CPRAM_PDF_MACHINES;


export const PRELOADED_TECHNICIANS: string[] = [
  "ช่างสมชาย", "ช่างวิชัย", "ช่างประสิทธิ์", "Outsource (ซัพพลายเออร์)",
  "ช่าง 1","ช่าง 2","ช่าง 3","ช่าง 4","ช่าง 5",
  "ช่าง 6","ช่าง 7","ช่าง 8","ช่าง 9","ช่าง 10",
  "ช่าง 11","ช่าง 12","ช่าง 13","ช่าง 14","ช่าง 15",
  "ช่าง 16","ช่าง 17","ช่าง 18","ช่าง 19","ช่าง 20"
];

// Some sample mock data to make first-time loading feel fully-featured and live instantly
export const PRELOADED_PM_PLANS = [
  {
    id: "plan-pm-mch01",
    machineId: "MCH-001",
    title: "เปลี่ยนน้ำมันเครื่อง & ไส้กรองอากาศ (Oil & Air Filter Service)",
    frequency: "ราย 3 เดือน",
    intervalDays: 90,
    category: "Mechanical",
    steps: [
      { title: "หยุดเครื่อง ดับเบรคเกอร์ และเดรนแรงดันลมคงค้าง", stdTime: 10 },
      { title: "ถ่ายน้ำมันเครื่องคอมเพรสเซอร์และเปลี่ยนไส้กรองน้ำมัน", stdTime: 20 },
      { title: "ถอดเปลี่ยนไส้กรองอากาศ Air Intake Filter และเป่าทำความสะอาด", stdTime: 15 },
      { title: "ตรวจเช็คสายพาน ตรวจจุดรั่วซึมลม และทดสอบเดินเครื่องวัดกระแส", stdTime: 15 }
    ],
    spareParts: "น้ำมันคอมเพรสเซอร์ Roto-Inject Fluid, กรองอากาศ 1622065800, กรองน้ำมัน 1622314200",
    ttm: 60,
    targetMonths: [3, 6, 9, 12]
  },
  {
    id: "plan-pm-mch02",
    machineId: "MCH-002",
    title: "ตรวจเช็คระบบสายพานและจาระบีเพลาขับ (Spindle Lubrication & Belt Inspection)",
    frequency: "ราย 6 เดือน",
    intervalDays: 180,
    category: "Lubrication",
    steps: [
      { title: "ตรวจสอบความตึงสายพานขับสปินเดิลและระยะฟรี", stdTime: 20 },
      { title: "อัดจาระบีสังเคราะห์ชุดลูกปืนลิเนียร์ไกด์และบอลสกรู", stdTime: 30 },
      { title: "ตรวจเช็คระดับแรงดันน้ำมันหล่อลื่นและระบบ Coolant", stdTime: 20 },
      { title: "Calibrate Backlash แกน X, Y, Z", stdTime: 20 }
    ],
    spareParts: "จาระบี LHL-X100-7, กรองน้ำมันไฮดรอลิก",
    ttm: 90,
    targetMonths: [6, 12]
  },
  {
    id: "plan-pm-chl01",
    machineId: "CHL-001",
    title: "ล้างคอนเดนเซอร์ & เช็คสารทำความเย็นประจำปี (Condenser Cleaning & Refrigerant Overhaul)",
    frequency: "รายปี",
    intervalDays: 365,
    category: "Mechanical",
    steps: [
      { title: "ล้างทำความสะอาดแผงคอนเดนเซอร์ด้วยน้ำยาเฉพาะทาง", stdTime: 45 },
      { title: "ตรวจสอบแรงดันสารทำความเย็น R-134a และตรวจหารอยรั่วซึม", stdTime: 30 },
      { title: "ตรวจวัดค่าความเป็นฉนวนมอเตอร์คอมเพรสเซอร์ (Megger Test)", stdTime: 20 },
      { title: "ทดสอบระบบความปลอดภัย High/Low Pressure Cut-out", stdTime: 25 }
    ],
    spareParts: "น้ำยาล้างคอนเดนเซอร์, ซีลโอริงเกจวัด, สารทำความเย็น R-134a",
    ttm: 120,
    targetMonths: [12]
  },
  {
    id: "plan-pm-pmp05",
    machineId: "PMP-005",
    title: "ตรวจเช็คระบบซีลกลไก & ลูกปืนปั๊มน้ำ (Mechanical Seal & Bearing Check)",
    frequency: "รายเดือน",
    intervalDays: 30,
    category: "Mechanical",
    steps: [
      { title: "ตรวจเช็คการรั่วซึมของแมคคานิคอลซีล (Mechanical Seal)", stdTime: 10 },
      { title: "ตรวจวัดระดับการสั่นสะเทือน (Vibration) และอุณหภูมิลูกปืน", stdTime: 15 },
      { title: "ตรวจสอบกระแสไฟฟ้ามอเตอร์และแรงดันจ่ายหน้าปั๊ม (Pressure Gauge)", stdTime: 10 },
      { title: "หยอดน้ำมันหล่อลื่นและเช็คจุดยึดฐานรอง", stdTime: 10 }
    ],
    spareParts: "แมคคานิคอลซีล CR-32, จาระบีทนน้ำ",
    ttm: 45,
    targetMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  },
  {
    id: "plan-pm-01",
    machineId: "RIM01",
    title: "ตรวจสภาพและทำความสะอาด Rice Mixer ประจำสัปดาห์",
    frequency: "รายสัปดาห์",
    intervalDays: 7,
    category: "Sanitation",
    steps: [
      { title: "ตรวจสอบใบกวนและจุดยึด", stdTime: 15 },
      { title: "ทำความสะอาดหัวฉีดน้ำส้มสายชู", stdTime: 10 },
      { title: "ตรวจสอบระบบขับเคลื่อนและเฟืองเกียร์", stdTime: 20 }
    ],
    spareParts: "น้ำมันหล่อลื่นเกรดอาหาร NSF-H1",
    ttm: 45,
    targetMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  },
  {
    id: "plan-pm-02",
    machineId: "VAC01",
    title: "ตรวจสอบระบบสุญญากาศและซีลยางประตู",
    frequency: "รายเดือน",
    intervalDays: 30,
    category: "Pneumatic",
    steps: [
      { title: "ตรวจวัดประสิทธิภาพปั๊มสุญญากาศ", stdTime: 30 },
      { title: "ตรวจสอบความตึงและการล้าของซีลยาง", stdTime: 15 },
      { title: "ตรวจเช็ควาล์วควบคุมแรงดันลม", stdTime: 15 }
    ],
    spareParts: "ซีลยางขอบประตู VAC01, น้ำมันแวคคั่มปั๊ม",
    ttm: 60,
    targetMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  },
  {
    id: "plan-pm-03",
    machineId: "FFS01",
    title: "ตรวจเช็คชุดฮีตเตอร์และใบมีดตัดซองสไลด์",
    frequency: "รายสัปดาห์",
    intervalDays: 7,
    category: "Electrical",
    steps: [
      { title: "ตรวจสอบอุณหภูมิฮีตเตอร์และสายไฟ", stdTime: 15 },
      { title: "ทดลองความคมของใบมีดตัดสไลด์", stdTime: 15 }
    ],
    spareParts: "ใบมีดเตเปอร์คัตเตอร์, ลวดความร้อนสำรอง",
    ttm: 30,
    targetMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  }
];

export const PRELOADED_REPAIRS = [
  {
    id: "rep-01",
    type: "Repair",
    technician: "ช่าง 1",
    date: "2026-06-08",
    machineId: "FFS02",
    breakdownTime: "2026-06-08T09:15",
    repairDoneTime: "2026-06-08T10:45",
    symptoms: "เครื่องซีลแนวนอนไม่ร้อน ซีลปากถุงไม่ได้",
    why1: "หัวฮีตเตอร์ไม่ร้อนและอุณหภูมิหน้าจอตกต่อเนื่อง",
    why2: "ไม่มีกระแสไฟฟ้าไหลผ่านขดลวดฮีตเตอร์ตัวนำความร้อน",
    why3: "ตรวจพบว่าสายไฟด้านล่างหลวมจากแรงสั่นสะเทือนเครื่องจักร",
    why4: "สายไม่ได้ยึดเข้ากับสายเกลียวเก็บสายและแคลมป์ยึดแน่นพอ",
    why5: "ไม่มีการตรวจสอบความแน่นของขั้วสายไฟในแผน PM ประจำเครื่อง",
    correctiveAction: "เข้าสายไฟใหม่ ยึดแคลมป์ท่อหดแรงสั่นสะเทือน และเพิ่มจุดตรวจสอบขั้วไฟฟ้าลงในแผน PM ประจำสัปดาห์",
    duration: 90
  },
  {
    id: "rep-02",
    type: "Repair",
    technician: "ช่าง 2",
    date: "2026-06-09",
    machineId: "VAC02",
    breakdownTime: "2026-06-09T14:00",
    repairDoneTime: "2026-06-09T16:15",
    symptoms: "แวคคั่มห้องเย็นไม่ลดแรงดันอุณหภูมิสูงเกินขีดจำกัด",
    why1: "ปั๊มทำลมช้าผิดรูป",
    why2: "โซลินอยด์วาล์วเสียขดลวดละลาย",
    why3: "ไฟกระชากเกิดความร้อนสะสมที่คอยล์ควบคุม",
    why4: "พัดลมระบายความร้อนตู้ควบคุมด้านบนฝุ่นจับหนาแน่นจนหยุดทำงาน",
    why5: "ไม่ได้ทำความสะอาดตู้คอโทรลมากกว่า 3 เดือนเนื่องจากการซ่อมบำรุงเน้นเครื่องจักรเป็นหลัก",
    correctiveAction: "เปลี่ยนโซลินอยด์วาล์วใหม่ ทำความสะอาดฝุ่นตู้คอนโทรล และเปลี่ยนพัดลมระบายความร้อนตัวใหม่",
    duration: 135 // > 120 minutes breakdown! Red warning!
  }
];

export const PRELOADED_IMPROVEMENTS: ImprovementProject[] = [
  // 1. KAIZEN PROJECTS
  {
    id: "imp-00",
    type: "Improvement",
    category: "KAIZEN",
    title: "ออกแบบการ์ดป้องกันเศษแป้งและชุดทำความสะอาดลูกรีดอัตโนมัติ",
    description: "ปรับปรุงโครงสร้างฝาครอบเครื่อง FFS03 โดยติดตั้งแผ่นอะคริลิกใสทนความร้อนพร้อมชุดเป่าลมสะอาด ลดการสะสมของคราบวัตถุดิบและย่นเวลาล้างทำความสะอาดก่อนกะผลิต",
    machineId: "FFS03",
    startDate: "2026-06-01",
    plannedEndDate: "2026-06-07",
    workLogs: [
      { id: "wl-01", date: "2026-06-02", hours: 2, note: "สำรวจจุดสะสมเศษแป้งแปรรูปและออกแบบแบบจำลองการ์ดป้องกัน" },
      { id: "wl-02", date: "2026-06-05", hours: 2, note: "ประกอบติดตั้งการ์ดอะคริลิกและทดสอบเปิดระบบลมเป่าหน้างานจริง" }
    ],
    status: "เสร็จแล้ว",
    technician: "ช่าง 1",
    technicians: ["ช่าง 1", "ช่าง 2"],
    photoBefore: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%231e293b'/><rect x='40' y='40' width='520' height='320' fill='%230f172a' stroke='%23f59e0b' stroke-width='4' stroke-dasharray='8,8' rx='16'/><path d='M150 250 L250 150 L350 220 L450 120' stroke='%23ef4444' stroke-width='6' fill='none'/><circle cx='450' cy='120' r='12' fill='%23ef4444'/><text x='300' y='90' text-anchor='middle' fill='%23f59e0b' font-size='22' font-family='sans-serif' font-weight='bold'>BEFORE [ก่อนปรับปรุง]</text><text x='300' y='290' text-anchor='middle' fill='%2394a3b8' font-size='15' font-family='sans-serif'>พบเศษวัตถุดิบสะสม / กลไกเดิมยังไม่มีชุดการ์ดป้องกัน</text><rect x='160' y='320' width='280' height='30' rx='6' fill='%23ef4444' opacity='0.3'/><text x='300' y='340' text-anchor='middle' fill='%23fca5a5' font-size='12' font-family='sans-serif' font-weight='bold'>⚠️ เสียเวลาทำความสะอาด 35 นาที/วัน</text></svg>",
    photoAfter: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%23064e3b'/><rect x='40' y='40' width='520' height='320' fill='%23022c22' stroke='%2310b981' stroke-width='4' rx='16'/><path d='M150 220 L250 220 L350 220 L450 220' stroke='%2310b981' stroke-width='8' stroke-linecap='round'/><circle cx='450' cy='220' r='14' fill='%2334d399'/><text x='300' y='90' text-anchor='middle' fill='%2334d399' font-size='22' font-family='sans-serif' font-weight='bold'>AFTER [หลังปรับปรุง Kaizen]</text><text x='300' y='280' text-anchor='middle' fill='%23a7f3d0' font-size='15' font-family='sans-serif'>ติดตั้งชุด Teflon Guard & Air Jet ปลดชิ้นงานอัตโนมัติ</text><rect x='160' y='320' width='280' height='30' rx='6' fill='%23059669'/><text x='300' y='340' text-anchor='middle' fill='%23ffffff' font-size='12' font-family='sans-serif' font-weight='bold'>✓ ย่นเวลาทำความสะอาดเหลือเพียง 5 นาที</text></svg>",
    pdfFiles: [
      {
        id: "excel-kz-01",
        name: "Kaizen_Cost_Benefit_Matrix.xlsx",
        size: "45 KB",
        uploadedAt: "2026-06-07",
        content: "sample_excel:kaizen",
        fileType: "excel"
      },
      {
        id: "pdf-kz-01",
        name: "Kaizen_Report_FFS03_Teflon_Guard.pdf",
        size: "1.4 MB",
        uploadedAt: "2026-06-07",
        content: "sample_pdf",
        fileType: "pdf"
      }
    ]
  },
  {
    id: "imp-01",
    type: "Improvement",
    category: "KAIZEN",
    title: "ออกแบบกลไกรีดแผ่นข้าวซูชิตายตัวป้องกันข้าวติด",
    description: "ปรับปรุงลูกรีดและเพิ่มเทมเพลตปัดน้ำมันอัจฉริยะช่วยลดอัตราสูญเสียของแป้งข้าวและย่นระยะเวลาทำความสะอาดระหว่างกะผลิต",
    machineId: "RST01",
    startDate: "2026-06-05",
    plannedEndDate: "2026-06-15",
    workLogs: [
      { id: "wl-1", date: "2026-06-06", hours: 2, note: "หารือแบบร่วมกับทีมซ่อมบำรุงและฝ่ายผลิตโรงงาน" },
      { id: "wl-2", date: "2026-06-08", hours: 4, note: "ขึ้นรูปกลไกรองรับและทดลองติดตั้งลูกรีดเคลือบเทฟลอน" }
    ],
    status: "กำลังดำเนินการ",
    technician: "ช่าง 3",
    technicians: ["ช่าง 3"],
    photoBefore: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%231e293b'/><rect x='40' y='40' width='520' height='320' fill='%230f172a' stroke='%23f59e0b' stroke-width='4' stroke-dasharray='8,8' rx='16'/><text x='300' y='180' text-anchor='middle' fill='%23f59e0b' font-size='22' font-family='sans-serif' font-weight='bold'>BEFORE: ข้าวติดลูกรีดสะสม</text><text x='300' y='230' text-anchor='middle' fill='%2394a3b8' font-size='14' font-family='sans-serif'>สภาพลูกรีดเดิมยังไม่มีสารเคลือบ Teflon</text></svg>"
  },
  {
    id: "imp-02",
    type: "Improvement",
    category: "KAIZEN",
    title: "ติดตั้งระบบเซนเซอร์แจ้งเตือนและปิดฝา Rice Mixer อัตโนมัติ",
    description: "เพิ่ม Limit Switch และระบบลมควบคุมฝาปิดเพื่อความปลอดภัยของพนักงานซ่อมบำรุงและฝ่ายผลิต",
    machineId: "RIM02",
    startDate: "2026-06-01",
    plannedEndDate: "2026-06-08",
    workLogs: [
      { id: "wl-3", date: "2026-06-02", hours: 3, note: "ติดตั้งสวิตช์ความปลอดภัยและต่อขั้วสายควบคุมไฟฟ้าประสานงานหน้าแผงวงจร" },
      { id: "wl-4", date: "2026-06-05", hours: 5, note: "ทดสอบการทำงาน Safety Interlock เสร็จสิ้นสมบูรณ์เป็นที่น่าพอใจ" }
    ],
    status: "เสร็จแล้ว",
    technician: "ช่าง 4",
    technicians: ["ช่าง 4"],
    photoBefore: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%231e293b'/><rect x='40' y='40' width='520' height='320' fill='%230f172a' stroke='%23f59e0b' stroke-width='4' stroke-dasharray='8,8' rx='16'/><text x='300' y='180' text-anchor='middle' fill='%23f59e0b' font-size='22' font-family='sans-serif' font-weight='bold'>BEFORE: เปิดฝาได้โดยไม่มี Interlock</text></svg>",
    photoAfter: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%23064e3b'/><rect x='40' y='40' width='520' height='320' fill='%23022c22' stroke='%2310b981' stroke-width='4' rx='16'/><text x='300' y='180' text-anchor='middle' fill='%2334d399' font-size='22' font-family='sans-serif' font-weight='bold'>AFTER: ติดตั้ง Limit Switch และไฟเตือน Safety</text></svg>"
  },

  // 2. ONE POINT LESSON (OPL)
  {
    id: "opl-01",
    type: "Improvement",
    category: "OPL",
    title: "OPL-042: เทคนิคการปรับตั้งความตึงฟิล์มและระยะกดหัวซีลเครื่อง FFS ป้องกันซองย่น",
    description: "บทเรียนจุดเดียว (One Point Lesson) เพื่อถ่ายทอดวิธีการตั้งระยะ Gap ของลูกกลิ้งดึงฟิล์ม และแรงกดสปริงหัวซีลความร้อน ให้อยู่ในช่วงมาตรฐาน 1.5-2.0 bar ป้องกันการรั่วซึมและฟิล์มขาด",
    machineId: "FFS01",
    startDate: "2026-06-03",
    plannedEndDate: "2026-06-03",
    workLogs: [
      { id: "wl-opl-01", date: "2026-06-03", hours: 2, note: "จัดทำเอกสาร OPL และจัดอบรมถ่ายทอดให้กับช่างและ Operator ประจำไลน์" }
    ],
    status: "เสร็จแล้ว",
    technician: "ช่าง 1",
    technicians: ["ช่าง 1", "ช่าง 5"],
    oplData: {
      category: "การแก้ไขปัญหา (Troubleshooting)",
      purpose: "ถ่ายทอดวิธีการตั้งระยะลูกกลิ้งดึงฟิล์มและแรงกดหัวซีล เพื่อลดของเสียซองรั่วเป็น 0 ppm",
      keyPoints: [
        "1. ตรวจสอบความสะอาดของร่อง Roller ก่อนตั้งความตึงเสมอ",
        "2. ใช้เกจวัดระยะ Thickness Gauge ตั้งระยะห่างซ้าย-ขวาให้เท่ากันที่ 0.35 mm",
        "3. ปรับเกจวัดแรงดันลมหัวซีลไว้ที่ 1.8 ± 0.1 bar ตามสูตรฟิล์ม OPP/CPP",
        "4. สังเกตเส้นซีลต้องเรียบสนิท ไม่มีรอยย่นหรือรอยไหม้เกรียม"
      ],
      reasons: [
        "หากแรงกดไม่เท่ากัน ฟิล์มจะเอียงข้างและฉีกขาดที่ขอบ",
        "หากแรงดันลมต่ำกว่า 1.5 bar อากาศจะรั่วเข้าบรรจุภัณฑ์ทำให้สินค้าเน่าเสีย"
      ],
      cautionPoints: "ห้ามใช้ของมีคมขูดหน้าสัมผัสเทฟลอนหัวซีลโดยเด็ดขาด ให้ใช้แปรงทองเหลืองและผ้าไมโครไฟเบอร์ขณะอุ่นเครื่องเท่านั้น",
      sopDocumentRef: "WI-MNT-FFS-018",
      targetAudience: "ช่างซ่อมบำรุงทุกระดับ & Operator ประจำเครื่อง",
      trainingDurationMins: 15
    },
    photoBefore: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%231e293b'/><rect x='40' y='40' width='520' height='320' fill='%230f172a' stroke='%23ef4444' stroke-width='4' rx='16'/><text x='300' y='180' text-anchor='middle' fill='%23ef4444' font-size='22' font-family='sans-serif' font-weight='bold'>✕ INCORRECT: ฟิล์มเอียงและย่น</text><text x='300' y='220' text-anchor='middle' fill='%2394a3b8' font-size='14' font-family='sans-serif'>ตั้งระยะลูกกลิ้ง 2 ฝั่งไม่เท่ากัน (0.5 mm vs 0.2 mm)</text></svg>",
    photoAfter: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%23064e3b'/><rect x='40' y='40' width='520' height='320' fill='%23022c22' stroke='%2310b981' stroke-width='4' rx='16'/><text x='300' y='180' text-anchor='middle' fill='%2334d399' font-size='22' font-family='sans-serif' font-weight='bold'>✓ CORRECT: ฟิล์มตึงสม่ำเสมอ</text><text x='300' y='220' text-anchor='middle' fill='%23a7f3d0' font-size='14' font-family='sans-serif'>ใช้ฟิลเลอร์เกจตั้งบาลานซ์ซ้าย-ขวา 0.35 mm เท่ากันเป๊ะ</text></svg>",
    pdfFiles: [
      {
        id: "pdf-opl-01",
        name: "OPL_042_FFS_Film_Tension_Standard.pdf",
        size: "950 KB",
        uploadedAt: "2026-06-03",
        content: "sample_pdf"
      }
    ]
  },
  {
    id: "opl-02",
    type: "Improvement",
    category: "OPL",
    title: "OPL-055: วิธีการตรวจสอบระดับน้ำมันและประสิทธิภาพปั๊มสุญญากาศ VAC01",
    description: "บทเรียนมาตรฐานการตรวจเช็คและบำรุงรักษาประจำวัน (Autonomous Maintenance) สำหรับระบบสุญญากาศเครื่องแพ็คสุญญากาศห้องสะอาด",
    machineId: "VAC01",
    startDate: "2026-06-08",
    plannedEndDate: "2026-06-08",
    workLogs: [
      { id: "wl-opl-02", date: "2026-06-08", hours: 2, note: "ถ่ายภาพจุดตรวจสอบและจัดทำแผ่นป้าย OPL ติดหน้าตู้เครื่องจักร" }
    ],
    status: "เสร็จแล้ว",
    technician: "ช่าง 2",
    technicians: ["ช่าง 2"],
    oplData: {
      category: "ความรู้พื้นฐาน (Basic Knowledge)",
      purpose: "ให้ช่างและผู้ปฏิบัติงานเข้าใจการดูสีและระดับน้ำมันแวคคั่มปั๊ม และค่าเกจวัดแรงดัน -0.098 MPa",
      keyPoints: [
        "1. สังเกตตาแมวดูระดับน้ำมัน (Oil Sight Glass) ต้องอยู่กึ่งกลางขีด Max-Min ขณะหยุดเครื่อง",
        "2. สีน้ํามันต้องใสหรือเหลืองอ่อน หากเป็นสีขุ่นขาว (Emulsion) แสดงว่ามีไอน้ำผสม ต้องเปลี่ยนถ่ายทันที",
        "3. ตรวจเช็คเกจสุญญากาศต้องดึงแรงดันลงถึง -0.098 MPa ภายในเวลาไม่เกิน 12 วินาที"
      ],
      reasons: [
        "น้ำมันที่ปนเปื้อนไอน้ำจะทำให้ใบพัดปั๊มสึกหรอและประสิทธิภาพการดูดสุญญากาศลดลง 40%"
      ],
      cautionPoints: "ห้ามเปิดฝาเติมน้ำมันขณะปั๊มกำลังทำงานอยู่ และต้องใช้น้ำมันเกรด Food Grade ISO VG 68 เท่านั้น",
      sopDocumentRef: "WI-MNT-VAC-004",
      targetAudience: "ช่างซ่อมบำรุง & ผู้ควบคุมเครื่องบรรจุ",
      trainingDurationMins: 10
    },
    pdfFiles: [
      {
        id: "excel-opl-01",
        name: "OPL_Standard_Parameters_Sheet.xlsx",
        size: "38 KB",
        uploadedAt: "2026-06-08",
        content: "sample_excel:opl",
        fileType: "excel"
      },
      {
        id: "pdf-opl-02",
        name: "OPL_055_Vacuum_Pump_Inspection.pdf",
        size: "1.1 MB",
        uploadedAt: "2026-06-08",
        content: "sample_pdf",
        fileType: "pdf"
      }
    ]
  },

  // 3. FAILURE ANALYSIS (FA)
  {
    id: "fa-01",
    type: "Improvement",
    category: "FA",
    title: "FA-2026-08: วิเคราะห์การแตกหักแบบล้าตัวของเพลาขับลูกรีดเครื่องคลุกข้าว RIM01",
    description: "รายงานการวิเคราะห์สาเหตุชิ้นส่วนเพลาสแตนเลส SUS304 หักชำรุดกะทันหันขณะเดินเครื่องผสมข้าวซูชิ โดยตรวจสอบพื้นผิวหน้าตัดรอยแตก (Fracture Surface Analysis) และแรงบิดเกินพิกัด",
    machineId: "RIM01",
    startDate: "2026-06-02",
    plannedEndDate: "2026-06-06",
    workLogs: [
      { id: "wl-fa-01", date: "2026-06-02", hours: 4, note: "ตัดชิ้นงานส่งตรวจสอบ Microstructure และวิเคราะห์รอยแตก Beach Marks" },
      { id: "wl-fa-02", date: "2026-06-04", hours: 3, note: "คำนวณ Stress Concentration ที่ร่องลิ่ม และออกแบบเพลาแบบเพิ่มรัศมี Fillet R=3mm" }
    ],
    status: "เสร็จแล้ว",
    technician: "ช่าง 1",
    technicians: ["ช่าง 1", "ช่าง 3"],
    faData: {
      failurePartName: "เพลาขับชุดใบกวนข้าว (Mixing Drive Shaft Ø35mm)",
      failurePartCode: "SFT-RIM-35",
      failureMode: "การล้าตัว (Fatigue)",
      rootCauseCategory: "การออกแบบ (Design)",
      mechanismDescription: "เกิดรอยแตกเริ่มแรก (Crack Initiation) บริเวณมุมฉากของร่องลิ่ม (Keyway corner) ที่ไม่มีรัศมีโค้งมน (Sharp corner R=0) ภายใต้แรงบิดกระชากซ้ำๆ (Cyclic Torsional Fatigue) จนรอยร้าวขยายตัวลึกเข้าสู่แกนกลางและเกิดการแตกหักฉับพลัน",
      immediateContainment: "เปลี่ยนใส่เพลาสำรองเดิมและตั้งค่า Overload Relay ของมอเตอร์ลดลง 15% เพื่อป้องกันกระชาก",
      permanentAction: "ปรับแบบสั่งทำเพลาใหม่โดยเปลี่ยนเกรดเป็น SUS420J2 ชุบแข็ง HRC 45-48 และปรับมุมร่องลิ่มให้มีรัศมีโค้งมน Fillet R=3.0 mm เพื่อกระจายความเค้น (Stress Distribution)",
      estimatedCostLoss: 45000,
      laboratoryFindings: "ตรวจพบรอยคลื่นล้าตัว (Beach marks / Fatigue striations) ชัดเจนครอบคลุม 70% ของพื้นที่หน้าตัด ก่อนถึงโซน Final fast fracture"
    },
    photoBefore: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%231e293b'/><rect x='40' y='40' width='520' height='320' fill='%230f172a' stroke='%23ef4444' stroke-width='4' rx='16'/><text x='300' y='160' text-anchor='middle' fill='%23ef4444' font-size='20' font-family='sans-serif' font-weight='bold'>FAILURE ANALYSIS: รอยแตกหักที่ร่องลิ่ม</text><text x='300' y='210' text-anchor='middle' fill='%23fca5a5' font-size='14' font-family='sans-serif'>ตรวจพบ Beach Marks จากความเค้นกระจุกตัวที่มุมเหลี่ยม R=0</text></svg>",
    pdfFiles: [
      {
        id: "excel-fa-01",
        name: "FA_Stress_Calculation_SUS420J2.xlsx",
        size: "52 KB",
        uploadedAt: "2026-06-06",
        content: "sample_excel:fa",
        fileType: "excel"
      },
      {
        id: "pdf-fa-01",
        name: "FA_Report_RIM01_Drive_Shaft_Fatigue.pdf",
        size: "2.3 MB",
        uploadedAt: "2026-06-06",
        content: "sample_pdf",
        fileType: "pdf"
      }
    ]
  },

  // 4. WHY-WHY ANALYSIS (WHY WHY)
  {
    id: "why-01",
    type: "Improvement",
    category: "WHY_WHY",
    title: "Why-Why 5-Whys: วิเคราะห์หาสาเหตุรากเหง้าแวคคั่มปั๊ม VAC02 มอเตอร์ตัดการทำงานจากความร้อนสูง",
    description: "การวิเคราะห์หาสาเหตุรากเหง้าอย่างเป็นระบบ 5 ระดับ (5 Whys Root Cause Analysis) เพื่อสืบค้นต้นตอที่แท้จริงของการเกิดความร้อนสะสมในตู้คอนโทรลจนมอเตอร์ทริปหยุดฉุกเฉิน",
    machineId: "VAC02",
    startDate: "2026-06-09",
    plannedEndDate: "2026-06-10",
    workLogs: [
      { id: "wl-why-01", date: "2026-06-09", hours: 3, note: "ประชุมทีมสอบสวนวิเคราะห์ 5 Whys หน้างานจริงและกำหนดมาตรการแก้ไขเชิงระบบ" }
    ],
    status: "เสร็จแล้ว",
    technician: "ช่าง 2",
    technicians: ["ช่าง 2", "ช่าง 4"],
    whyWhyData: {
      problemStatement: "มอเตอร์ปั๊มสุญญากาศ VAC02 ตัดการทำงานฉุกเฉิน (Overload Trip) ทำให้ไลน์ผลิตหยุดชะงัก 135 นาที",
      phenomenon: "ขดลวดโซลินอยด์วาล์วและตู้คอนโทรลมีอุณหภูมิพุ่งสูงเกิน 78°C ทำให้ Thermal Overload สั่งตัดวงจร",
      why1: "ทำไมมอเตอร์จึงตัดการทำงาน? -> เพราะ Thermal Relay ตรวจจับกระแสและความร้อนสะสมสูงเกินค่าพิกัด",
      why2: "ทำไมจึงมีความร้อนสะสมสูงในตู้ควบคุม? -> เพราะพัดลมระบายอากาศด้านบนตู้หยุดหมุนและแผ่นกรองฝุ่นตันสนิท",
      why3: "ทำไมพัดลมและแผ่นกรองจึงฝุ่นตันจนหยุดหมุน? -> เพราะมีฝุ่นแป้งแห้งจากกระบวนการผลิตปลิวมาเกาะสะสมหนาแน่นเกิน 3 เดือน",
      why4: "ทำไมฝุ่นสะสมนาน 3 เดือนจึงไม่มีใครทำความสะอาด? -> เพราะไม่มีรายการทำความสะอาดตู้คอนโทรลและเปลี่ยนแผ่นกรองในตาราง PM ประจำสัปดาห์",
      why5: "ทำไมจึงไม่มีรายการนี้ในตาราง PM? -> เพราะตอนจัดทำแผน PM ยึดตามคู่มือเครื่องจักรเฉพาะตัวกลไกภายนอก ไม่ได้รวมชุดตู้ระบายความร้อนไฟฟ้าเข้าในมาตรฐาน (Root Cause)",
      rootCauseSummary: "แผน PM Standard ไม่ครอบคลุมระบบระบายความร้อนของตู้ควบคุมไฟฟ้า ทำให้เกิดการละเลยจุดสำคัญจนความร้อนสะสม",
      countermeasure: "1. ทำความสะอาดตู้คอนโทรลและเปลี่ยนพัดลมพร้อมแผ่นฟิลเตอร์ใหม่ทันที 2. บรรจุหัวข้อ 'ตรวจเช็คพัดลมและล้างแผ่นกรองตู้คอนโทรล' ลงในเช็คลิสต์ PM รายเดือนทุกตู้",
      standardizationRef: "PM-STD-ELEC-009 & OPL-058",
      effectivenessVerification: "ติดตามผล 30 วัน อุณหภูมิตู้คอนโทรลคงที่ 38-42°C ไม่พบเหตุการณ์ Overload ซ้ำ"
    },
    pdfFiles: [
      {
        id: "excel-why-01",
        name: "5Whys_Action_Tracking_Sheet.xlsx",
        size: "42 KB",
        uploadedAt: "2026-06-10",
        content: "sample_excel:why",
        fileType: "excel"
      },
      {
        id: "pdf-why-01",
        name: "5Whys_Analysis_VAC02_Overheating.pdf",
        size: "1.6 MB",
        uploadedAt: "2026-06-10",
        content: "sample_pdf",
        fileType: "pdf"
      }
    ]
  }
];

export const PRELOADED_SCHEDULES = [
  {
    id: "sched-tbm-mch01-q1",
    type: "PM",
    technician: "ช่างสมชาย",
    technicians: ["ช่างสมชาย", "ช่างวิชัย"],
    date: "2026-03-15",
    machineId: "MCH-001",
    pmPlanId: "plan-pm-mch01",
    status: "เสร็จสิ้น",
    duration: 60,
    actualDuration: 55
  },
  {
    id: "sched-tbm-mch01-q2",
    type: "PM",
    technician: "ช่างสมชาย",
    technicians: ["ช่างสมชาย"],
    date: "2026-06-12",
    machineId: "MCH-001",
    pmPlanId: "plan-pm-mch01",
    status: "กำลังทำ",
    duration: 60
  },
  {
    id: "sched-tbm-mch02-h1",
    type: "PM",
    technician: "ช่างวิชัย",
    technicians: ["ช่างวิชัย"],
    date: "2026-06-18",
    machineId: "MCH-002",
    pmPlanId: "plan-pm-mch02",
    status: "รอดำเนินการ",
    duration: 90
  },
  {
    id: "sched-tbm-chl01-y",
    type: "PM",
    technician: "Outsource (ซัพพลายเออร์)",
    technicians: ["Outsource (ซัพพลายเออร์)"],
    date: "2026-12-15",
    machineId: "CHL-001",
    pmPlanId: "plan-pm-chl01",
    status: "รอดำเนินการ",
    duration: 120
  },
  {
    id: "sched-tbm-pmp05-m6",
    type: "PM",
    technician: "ช่างประสิทธิ์",
    technicians: ["ช่างประสิทธิ์"],
    date: "2026-06-05",
    machineId: "PMP-005",
    pmPlanId: "plan-pm-pmp05",
    status: "เสร็จสิ้น",
    duration: 45,
    actualDuration: 40
  },
  {
    id: "sched-01",
    type: "PM",
    technician: "ช่าง 1",
    date: "2026-06-10",
    machineId: "RIM01",
    pmPlanId: "plan-pm-01",
    status: "รอดำเนินการ",
    duration: 45
  },
  {
    id: "sched-02",
    type: "Operation",
    technician: "ช่าง 2",
    date: "2026-06-10",
    line: "ไลน์ซูชิ A",
    startTime: "08:00",
    endTime: "16:00",
    isWeeklyRecurring: true,
    recurringDays: [1, 2, 3, 4, 5],
    duration: 480
  },
  {
    id: "sched-03",
    type: "PM",
    technician: "ช่าง 5",
    date: "2026-06-09", // Overdue PM task on 9 Jun if status is 'รอดำเนินการ'
    machineId: "FFS01",
    pmPlanId: "plan-pm-03",
    status: "รอดำเนินการ",
    duration: 30
  },
  {
    id: "sched-04",
    type: "PM",
    technician: "ช่าง 3",
    technicians: ["ช่าง 3", "ช่าง 4"],
    date: "2026-06-08",
    machineId: "VAC01",
    pmPlanId: "plan-pm-02",
    status: "เสร็จสิ้น",
    duration: 60,
    actualDuration: 85,
    overtimeReason: "พบชิ้นส่วนซีลยางสึกหรอผิดปกติ และน็อตยึดฝาสุญญากาศเกิดสนิมเกาะ ต้องขัดล้างและปรับแต่งหน้างานเพิ่มเติม",
    usedParts: [
      { partId: "SP-002", quantity: 1, pricePerUnit: 450, totalCost: 450 }
    ],
    otherCost: 0
  }
];

export const PRELOADED_SETUPS = [
  {
    id: "setup-01",
    machineId: "FFS01",
    date: "2026-06-10",
    type: "Setupก่อนผลิต",
    technicians: ["ช่าง 1", "ช่าง 2"],
    totalDuration: 55,
    note: "เตรียมความพร้อมไลน์บรรจุ เช้ากะหนึ่ง",
    steps: [
      { stepName: "ตั้งเครื่อง", duration: 15, completed: true },
      { stepName: "ร้อยฟิล์ม", duration: 15, completed: true },
      { stepName: "ตั้งฟิล์ม", duration: 10, completed: true },
      { stepName: "ต่อฟิล์ม", duration: 5, completed: true },
      { stepName: "ตั้งเครื่องพิมพ์วันที่", duration: 10, completed: true }
    ]
  },
  {
    id: "setup-02",
    machineId: "ATS01",
    date: "2026-06-10",
    type: "ปรับเครื่องระหว่างวัน",
    technicians: ["ช่าง 3"],
    totalDuration: 25,
    note: "ปรับตั้งเครื่องพิมพ์วันที่เลอะ ฟิล์มเอียงเล็กน้อย",
    steps: [
      { stepName: "ตั้งเครื่อง", duration: 0, completed: false },
      { stepName: "ร้อยฟิล์ม", duration: 0, completed: false },
      { stepName: "ตั้งฟิล์ม", duration: 10, completed: true },
      { stepName: "ต่อฟิล์ม", duration: 5, completed: true },
      { stepName: "ตั้งเครื่องพิมพ์วันที่", duration: 10, completed: true }
    ]
  },
  {
    id: "setup-03",
    machineId: "FFS02",
    date: "2026-06-09",
    type: "Setupก่อนผลิต",
    technicians: ["ช่าง 4"],
    totalDuration: 40,
    note: "Setup ทั่วไปก่อนเริ่มงานวันจันทร์",
    steps: [
      { stepName: "ตั้งเครื่อง", duration: 10, completed: true },
      { stepName: "ร้อยฟิล์ม", duration: 15, completed: true },
      { stepName: "ตั้งฟิล์ม", duration: 5, completed: true },
      { stepName: "ต่อฟิล์ม", duration: 5, completed: true },
      { stepName: "ตั้งเครื่องพิมพ์วันที่", duration: 5, completed: true }
    ]
  }
];

export const PRELOADED_SPARE_PARTS = [
  {
    id: "SP-01",
    name: "ลวดฮีตเตอร์เครื่องแวคคั่ม (Heating element 10mm)",
    category: "อุปกรณ์ไฟฟ้าและทำความร้อน",
    machineIds: ["VAC01", "VAC02"],
    quantity: 3,
    minRequired: 5,
    unit: "เส้น",
    location: "ตู้ A ชั้น 1",
    pricePerUnit: 350,
    lastRestockedDate: "2026-06-01",
    specifications: "ขนาด 10 มม. ความยาว 600 มม. ทนกำลังไฟสายตรง"
  },
  {
    id: "SP-02",
    name: "เทปเทฟลอนทนความร้อน (Teflon glass fiber tape)",
    category: "วัสดุสิ้นเปลือง",
    machineIds: ["VAC01", "VAC02", "FFS01", "FFS02", "BAN01"],
    quantity: 12,
    minRequired: 4,
    unit: "ม้วน",
    location: "ตู้ A ชั้น 2",
    pricePerUnit: 280,
    lastRestockedDate: "2026-06-15",
    specifications: "หน้ากว้าง 2 นิ้ว ทนความร้อนสูงสุด 300 องศาเซลเซียส"
  },
  {
    id: "SP-03",
    name: "ใบมีดตัดซองฟันปลาเครื่องซีลแนวตั้ง (Zigzag cutter blade)",
    category: "ระบบเครื่องกล",
    machineIds: ["FFS01", "FFS02"],
    quantity: 2,
    minRequired: 2,
    unit: "ใบ",
    location: "ตู้ B ชั้น 1",
    pricePerUnit: 1200,
    lastRestockedDate: "2026-05-20",
    specifications: "ทำจากเหล็กกล้าไฮสปีดชุบแข็ง ทนทานความยาว 210 มม."
  },
  {
    id: "SP-04",
    name: "ลูกยางตัวดูดสุญญากาศซิลิโคน (Vacuum cup silicone)",
    category: "นิวเมติกส์",
    machineIds: ["ATS01", "RJT01"],
    quantity: 18,
    minRequired: 6,
    unit: "ตัว",
    location: "ตู้ B ชั้น 2",
    pricePerUnit: 120,
    lastRestockedDate: "2026-06-10",
    specifications: "ทำจากซิลิโคน Food Grade ทนเย็นและร้อน ไม่แข็งกรอบง่าย"
  },
  {
    id: "SP-05",
    name: "โซลินอยด์วาล์วคุมลมกระบอกสูบ (Solenoid valve 24VDC)",
    category: "นิวเมติกส์",
    machineIds: ["RIM01", "FFS01", "ATS01", "RJT01"],
    quantity: 4,
    minRequired: 3,
    unit: "ตัว",
    location: "ตู้ C ชั้น 1",
    pricePerUnit: 950,
    lastRestockedDate: "2026-06-05",
    specifications: "ขนาดพอร์ต 1/8, แรงดันไฟ 24VDC ยี่ห้อ SMC"
  },
  {
    id: "SP-06",
    name: "ตลับลูกปืนเม็ดกลมสแตนเลส (SS Bearings 6204-2RS)",
    category: "ระบบส่งกำลัง",
    machineIds: ["RIM01", "TOC01", "BAN01"],
    quantity: 1,
    minRequired: 4,
    unit: "ตลับ",
    location: "ตู้ D ชั้น 1",
    pricePerUnit: 450,
    lastRestockedDate: "2026-04-12",
    specifications: "สแตนเลส SUS440C ซีลยางกันน้ำสองข้าง เหมาะสำหรับอุตสาหกรรมอาหาร"
  },
  {
    id: "SP-07",
    name: "สายพานแบนไทม์มิ่งขับเคลื่อน (Conveyor timing belt)",
    category: "ระบบส่งกำลัง",
    machineIds: ["ROC01", "BAN01", "MTD01", "XRA01"],
    quantity: 6,
    minRequired: 2,
    unit: "เส้น",
    location: "ตู้ D ชั้น 2",
    pricePerUnit: 800,
    lastRestockedDate: "2026-06-18",
    specifications: "สายพานยางสังเคราะห์ ทนต่อน้ำมันพืชและความร้อน"
  },
  {
    id: "SP-08",
    name: "เซนเซอร์ตาแมวตรวจจับชิ้นงาน (Photoelectric sensor NPN)",
    category: "อุปกรณ์ไฟฟ้าและทำความร้อน",
    machineIds: ["RIM01", "FFS01", "FFS02", "ATS01", "RJT01"],
    quantity: 1,
    minRequired: 3,
    unit: "ชุด",
    location: "ตู้ E ชั้น 1",
    pricePerUnit: 1500,
    lastRestockedDate: "2026-05-18",
    specifications: "เซนเซอร์จับวัตถุระยะทำงาน 10 ซีซี ชนิด NPN NO/NC"
  }
];

export const PRELOADED_CD5_PROJECTS: CD5Project[] = [
  {
    id: "CD5-2026-001",
    title: "เขียนแบบสั่งทำชุดใบมีดตัดซีลสุญญากาศ สแตนเลส SUS440C แทนสั่ง OEM ญี่ปุ่น",
    category: "เขียนแบบสั่งทำเอง (Custom Fabrication)",
    machineId: "VAC01",
    partName: "ใบมีดตัดปากถุงสุญญากาศ (Vacuum Chamber Sealing Cutter)",
    partCode: "BLD-VAC-440",
    proposerTechnician: "ช่างสมศักดิ์",
    coTechnicians: ["ช่างอนุชา", "ช่างกิตติศักดิ์"],
    startDate: "2026-02-10",
    approvedDate: "2026-04-15",
    installedDate: "2026-04-16",
    status: "อนุมัติใช้งานจริง",
    
    // Original
    originalSupplier: "ผู้ผลิตเครื่องแพ็คสุญญากาศ OEM ประเทศญี่ปุ่น",
    originalPrice: 14500,
    originalLifespanDays: 45,
    originalLifespanUnit: "วัน",
    originalQualityNotes: "เป็นเหล็กคาร์บอนเคลือบ รอสั่งผลิตและขนส่ง 45-60 วัน มีปัญหาสนิมผิวจากไอน้ำเกลือในอาหาร สึกหรอเร็ว",
    
    // New Custom
    newSupplierOrFabricator: "โรงกลึง CNC พรีซิชั่นในประเทศ (ช่างเขียนแบบ CAD 2D/3D เอง)",
    newPrice: 3200,
    newLifespanDays: 120,
    newLifespanUnit: "วัน",
    newQualityNotes: "อัปเกรดเป็น Stainless Steel SUS440C ชุบแข็ง Vacuum Heat Treatment HRC 58-60 คมกริบ ไร้สนิม ทนกรดเกลือ 100% สอดคล้อง Food Grade GMP",
    
    // Metrics
    annualUsageQty: 8,
    annualOriginalCost: 116000,
    annualNewCost: 25600,
    annualSavings: 90400,
    savingsPercent: 77.9,
    lifespanExtensionPercent: 166.7,

    engineeringDetails: "วิศวกรและช่างถอดชิ้นส่วนเดิมมาเขียนแบบ Drawing ใน SolidWorks ปรับมุมคมมีดจาก 30° เป็น 28° พร้อมเพิ่มร่องระบายเศษฟิล์ม ส่งร้านกลึง CNC ชุบแข็งสุญญากาศ",
    foodGradeCompliance: true,
    safetyNotes: "ทดสอบการตัดฟิล์ม Nylon/PE หนา 120 ไมครอน ต่อเนื่อง 100,000 ซอง ขอบตัดเรียบกริบ ไม่มีเศษฝุ่นฟิล์มตกค้าง",
    createdAt: "2026-02-10",

    usageHistory: [
      {
        id: "HIST-001-1",
        cycleNumber: 1,
        partType: "NEW_CUSTOM",
        installedDate: "2026-02-15",
        replacedDate: "2026-06-15",
        status: "COMPLETED_REPLACED",
        actualRunningDays: 120,
        targetLifespanDays: 120,
        originalOemDays: 45,
        lifespanExtensionPercent: 166.7,
        wearCondition: "คมมีดยังตัดได้ดี สึกหรอสม่ำเสมอ ไร้สนิม ถอดเปลี่ยนเพื่อประเมินความล้าของโลหะตามรอบ",
        technician: "ช่างสมศักดิ์",
        notes: "ทดสอบรอบแรกผ่านฉลุย เทียบกับ OEM ที่เปลี่ยนทุก 45 วัน ยืดอายุได้เกือบ 3 เท่าตัว"
      },
      {
        id: "HIST-001-2",
        cycleNumber: 2,
        partType: "NEW_CUSTOM",
        installedDate: "2026-06-16",
        status: "ACTIVE_RUNNING",
        actualRunningDays: 65,
        targetLifespanDays: 120,
        originalOemDays: 45,
        lifespanExtensionPercent: 166.7,
        wearCondition: "สมบูรณ์ 100% คมมีดตัดขาดเรียบ ซีลสุญญากาศไม่รั่วซึม",
        technician: "ช่างอนุชา",
        notes: "ติดตั้งใช้งานจริงชุดที่ 2 เดินเครื่องต่อเนื่องในไลน์แพ็คสุญญากาศ VAC01"
      }
    ]
  },
  {
    id: "CD5-2026-002",
    title: "เปลี่ยนวัสดุบูชสวมแกนลูกกลิ้งลำเลียงเป็น Food Grade PEEK ยืดอายุ 3 เท่า ไม่ต้องทาจาระบี",
    category: "ยืดอายุการใช้งาน (Lifetime Extension)",
    machineId: "TOC01",
    partName: "บูชแบริ่งสวมแกนคอนเวเยอร์ข้าว (Self-Lubricating Conveyor Bushing)",
    partCode: "BSH-PEEK-25",
    proposerTechnician: "ช่างวิชัย",
    coTechnicians: ["ช่างสมศักดิ์"],
    startDate: "2026-03-01",
    approvedDate: "2026-05-20",
    installedDate: "2026-05-22",
    status: "อนุมัติใช้งานจริง",

    // Original
    originalSupplier: "บูชทองเหลืองหล่อลื่นบรอนซ์ OEM เดิม",
    originalPrice: 1850,
    originalLifespanDays: 60,
    originalLifespanUnit: "วัน",
    originalQualityNotes: "ต้องอัดจาระบี Food Grade ทุกสัปดาห์ เสี่ยงปนเปื้อนแป้งข้าว สึกหรอเร็วเมื่อถูกน้ำล้าง CIP ประจำวัน",

    // New Custom
    newSupplierOrFabricator: "สั่งฉีดขึ้นรูปพลาสติกวิศวกรรม PEEK (Polyether ether ketone) Food Contact FDA",
    newPrice: 750,
    newLifespanDays: 240,
    newLifespanUnit: "วัน",
    newQualityNotes: "หล่อลื่นในตัว ทนอุณหภูมิ -50 ถึง +250°C ทนน้ำยาล้างด่าง/กรด CIP ได้ดีเยี่ยม ลดความถี่ PM อัดจาระบีเป็น 0",

    // Metrics
    annualUsageQty: 24,
    annualOriginalCost: 44400,
    annualNewCost: 18000,
    annualSavings: 26400,
    savingsPercent: 59.5,
    lifespanExtensionPercent: 300.0,

    engineeringDetails: "คำนวณพิกัดความเผื่อ H7/e8 สำหรับ PEEK Polymer สั่งตัดและกลึงตามขนาดเพลา SUS316L ไม่กินแกนเพลา",
    foodGradeCompliance: true,
    safetyNotes: "ผ่านการทดสอบ Migration Test ตามมาตรฐาน EU Food Contact 10/2011 และ US FDA 21 CFR 177.2415",
    createdAt: "2026-03-01",

    usageHistory: [
      {
        id: "HIST-002-1",
        cycleNumber: 1,
        partType: "NEW_CUSTOM",
        installedDate: "2026-05-22",
        status: "ACTIVE_RUNNING",
        actualRunningDays: 89,
        targetLifespanDays: 240,
        originalOemDays: 60,
        lifespanExtensionPercent: 300.0,
        wearCondition: "ผิวสัมผัสเรียบเนียน ไม่มีรอยขูดขีดบนแกนเพลา SUS316L ไม่พบการสึกหรอผิดปกติ",
        technician: "ช่างวิชัย",
        notes: "ผ่าน 60 วัน (อายุเดิมของบูชทองเหลือง) ไปแล้วโดยยังไม่ต้องอัดจาระบีแม้แต่ครั้งเดียว"
      }
    ]
  },
  {
    id: "CD5-2026-003",
    title: "เทียบเคียงซีลสุญญากาศ Silicone Sponge โปรไฟล์เทียบเคียงแบรนด์ในประเทศ ลดค่าใช้จ่าย 65%",
    category: "เทียบเคียงแบรนด์ทางเลือก (Equivalent Brand)",
    machineId: "ATS01",
    partName: "ยางซีลขอบฝาเครื่องซีลถาดอัตโนมัติ (Silicone Sponge Gasket Profile)",
    partCode: "GSK-SIL-ATS",
    proposerTechnician: "ช่างธนพล",
    coTechnicians: ["ช่างอนุชา"],
    startDate: "2026-04-10",
    approvedDate: "2026-06-01",
    installedDate: "2026-06-02",
    status: "อนุมัติใช้งานจริง",

    // Original
    originalSupplier: "ผู้แทนจำหน่ายอะไหล่เครื่องซีลถาดต่างประเทศ",
    originalPrice: 4200,
    originalLifespanDays: 90,
    originalLifespanUnit: "วัน",
    originalQualityNotes: "ขายยกชุดขอบพร้อมโครง ราคาแพง ยางแข็งตัวและยุบตัวหลังใช้งาน 3 เดือน",

    // New Custom
    newSupplierOrFabricator: "ผู้ผลิตโปรไฟล์ยางซิลิโคนฟู้ดเกรดในไทย สั่งม้วน 50 เมตร ตัดใส่เอง",
    newPrice: 1450,
    newLifespanDays: 120,
    newLifespanUnit: "วัน",
    newQualityNotes: "ซิลิโคนฟองน้ำความยืดหยุ่นสูง คืนตัวได้ 98% ทนความร้อน 220°C ซีลสุญญากาศแนบสนิท ค่ารั่วไหล 0%",

    // Metrics
    annualUsageQty: 12,
    annualOriginalCost: 50400,
    annualNewCost: 17400,
    annualSavings: 33000,
    savingsPercent: 65.5,
    lifespanExtensionPercent: 33.3,

    engineeringDetails: "ทำ Jig ตัดต่อมุม 45° ด้วยกาวซิลิโคน RTV Food Grade เชื่อมต่อไร้รอยตะเข็บ",
    foodGradeCompliance: true,
    safetyNotes: "ผ่านการทดสอบ Leak Test สุญญากาศ -98 kPa ไม่มีลมรั่ว",
    createdAt: "2026-04-10",

    usageHistory: [
      {
        id: "HIST-003-1",
        cycleNumber: 1,
        partType: "NEW_CUSTOM",
        installedDate: "2026-06-02",
        status: "ACTIVE_RUNNING",
        actualRunningDays: 78,
        targetLifespanDays: 120,
        originalOemDays: 90,
        lifespanExtensionPercent: 33.3,
        wearCondition: "แรงคืนตัวดีเยี่ยม ไม่ยุบตัว สุญญากาศแนบสนิท",
        technician: "ช่างธนพล",
        notes: "ประหยัดต้นทุนไป 65% คุณภาพการซีลถาดเทียบเท่าของ OEM"
      }
    ]
  },
  {
    id: "CD5-2026-004",
    title: "ซ่อมฟื้นฟูสภาพแกนเพลาใบกวนผสมข้าว ด้วยเทคนิคพ่นพอกฮาร์ดโครม & เจียระไนใหม่",
    category: "ซ่อมฟื้นฟูสภาพ (Reconditioning)",
    machineId: "RIM01",
    partName: "แกนเพลาใบกวนผสมข้าวหลัก (Main Mixer Agitator Shaft SUS304)",
    partCode: "SFT-RIM-01",
    proposerTechnician: "ช่างสมศักดิ์",
    coTechnicians: ["ช่างวิชัย", "ช่างกิตติศักดิ์"],
    startDate: "2026-05-15",
    installedDate: "2026-05-28",
    status: "กำลังทดสอบ",

    // Original
    originalSupplier: "สั่งเบิกชุดเพลาใหม่ทั้งท่อนจากตัวแทนจำหน่าย",
    originalPrice: 48000,
    originalLifespanDays: 365,
    originalLifespanUnit: "วัน",
    originalQualityNotes: "เพลาเดิมรอยซีลกัดเป็นร่องลึก 1.5 มม. เมื่อก่อนต้องทิ้งและซื้อเพลาใหม่ทั้งท่อน",

    // New Custom
    newSupplierOrFabricator: "โรงชุบฮาร์ดโครมอุตสาหกรรม + โรงกลึงเจียระไนทรงกระบอกความเที่ยงตรงสูง",
    newPrice: 8500,
    newLifespanDays: 500,
    newLifespanUnit: "วัน",
    newQualityNotes: "พ่นพอกและชุบ Hard Chrome หนา 0.5 มม. ผิวเรียบกระจก Ra 0.2 แข็งแรงทนรอยขีดข่วนกว่าสแตนเลสเปลือย 2 เท่า",

    // Metrics
    annualUsageQty: 2,
    annualOriginalCost: 96000,
    annualNewCost: 17000,
    annualSavings: 79000,
    savingsPercent: 82.3,
    lifespanExtensionPercent: 37.0,

    engineeringDetails: "กลึงปาดร่องเดิมออก 0.8 มม. พ่นพอกผิวด้วยลวดเชื่อมสแตนเลสพิเศษ ชุบฮาร์ดโครม และเจียรนัยจนได้ขนาดเส้นผ่าศูนย์กลางมาตรฐานเดิม 50.00 mm (Tolerance h6)",
    foodGradeCompliance: true,
    safetyNotes: "ตรวจเช็ค Run-out ความคดเพลาด้วย Dial Gauge ได้ค่า < 0.02 mm",
    createdAt: "2026-05-15",

    usageHistory: [
      {
        id: "HIST-004-1",
        cycleNumber: 1,
        partType: "NEW_CUSTOM",
        installedDate: "2026-05-28",
        status: "ACTIVE_RUNNING",
        actualRunningDays: 83,
        targetLifespanDays: 500,
        originalOemDays: 365,
        lifespanExtensionPercent: 37.0,
        wearCondition: "ผิวฮาร์ดโครมเงาใส ไร้รอยซีลกัด อุณหภูมิแบริ่งปกติ 42°C",
        technician: "ช่างสมศักดิ์",
        notes: "ทดสอบเดินเครื่องกวนข้าวผสม 3 กะต่อวัน ไม่พบการรั่วซึมที่ซีลเพลา"
      }
    ]
  },
  {
    id: "CD5-2026-005",
    title: "ออกแบบแผ่นเทฟลอนกันติดรองฮีตเตอร์ตัดฟิล์ม ซ่อมเปลี่ยนเฉพาะจุด ประหยัดค่าเทปทนความร้อน",
    category: "ลดต้นทุนงาน PM/ซ่อม (PM/Repair Cost Down)",
    machineId: "FFS01",
    partName: "ชุดรางประกบฮีตเตอร์ตัดฟิล์ม PTFE Plate Insulator",
    partCode: "PTFE-FFS-01",
    proposerTechnician: "ช่างกิตติศักดิ์",
    coTechnicians: ["ช่างธนพล"],
    startDate: "2026-06-01",
    installedDate: "2026-06-05",
    status: "ประเมินผล",

    // Original
    originalSupplier: "ใช้เทปเทฟลอนแปะทับลวดฮีตเตอร์ เปลี่ยนบ่อยทุก 3 วัน",
    originalPrice: 3500,
    originalLifespanDays: 14,
    originalLifespanUnit: "วัน",
    originalQualityNotes: "เทปไหม้และขาดง่าย กาวเทปเหนียวเกาะติดฮีตเตอร์ทำให้ความร้อนไม่สม่ำเสมอ",

    // New Custom
    newSupplierOrFabricator: "กัดร่องแผ่นแผ่น Virgin PTFE บริสุทธิ์ สอดลวดฮีตเตอร์ด้านใน ถอดกลับด้านได้ 2 ฝั่ง",
    newPrice: 1100,
    newLifespanDays: 90,
    newLifespanUnit: "วัน",
    newQualityNotes: "แผ่นเทฟลอนหนา 5 มม. ทนความร้อนสูง 260°C ฟิล์มไม่ติดไหม้ ผิวสะอาด ทำความสะอาดง่าย",

    // Metrics
    annualUsageQty: 6,
    annualOriginalCost: 21000,
    annualNewCost: 6600,
    annualSavings: 14400,
    savingsPercent: 68.6,
    lifespanExtensionPercent: 542.9,

    engineeringDetails: "เขียนแบบ CAD กัดร่องขนาด 1.2 มม. สำหรับวางลวด Nichrome 80 ให้พอดี ไม่ใช้กาวเคมี",
    foodGradeCompliance: true,
    safetyNotes: "ลดเวลา PM ทำความสะอาดคราบกาวไหม้ลง 30 นาทีต่อเครื่อง",
    createdAt: "2026-06-01",

    usageHistory: [
      {
        id: "HIST-005-1",
        cycleNumber: 1,
        partType: "NEW_CUSTOM",
        installedDate: "2026-06-05",
        status: "ACTIVE_RUNNING",
        actualRunningDays: 75,
        targetLifespanDays: 90,
        originalOemDays: 14,
        lifespanExtensionPercent: 542.9,
        wearCondition: "รอยไหม้ 0% แผ่นเทฟลอนขาวสะอาด ไม่มีคราบพลาสติกติด",
        technician: "ช่างกิตติศักดิ์",
        notes: "ทดลองใช้งานเกิน 70 วันแล้ว เทียบกับของเดิมที่ต้องแปะเทปใหม่ทุก 3-14 วัน ประหยัดเวลาช่างและค่าเทปได้มหาศาล"
      }
    ]
  }
];



