import { KnowledgeItem } from '../types/knowledge';

export const PRELOADED_KNOWLEDGE_ITEMS: KnowledgeItem[] = [
  // ==========================================
  // 1. MANUALS (คู่มือเครื่องจักร & แผนผัง)
  // ==========================================
  {
    id: 'kn-man-01',
    type: 'MANUAL',
    title: 'คู่มือการใช้งานและบำรุงรักษาเครื่องผสมข้าว (Operation & Maintenance Manual: RICE MIXER 1)',
    machineId: 'RIM01',
    machineName: 'RICE MIXER 1',
    lineGroup: 'ห้องซุยข้าว',
    tags: ['คู่มือการใช้งาน', 'Maintenance Manual', 'ระบบขับเคลื่อน', 'เกียร์บ็อกซ์'],
    author: 'วิศวกรรมโรงงาน',
    createdAt: '2026-01-10',
    updatedAt: '2026-03-15',
    isVerified: true,
    viewCount: 42,
    manualData: {
      docCode: 'MAN-RIM-2024-V2',
      revision: '02',
      category: 'Maintenance Manual',
      fileName: 'RIM01_Operation_and_Service_Manual_TH.pdf',
      fileSize: '3.4 MB',
      fileType: 'pdf',
      fileContent: 'sample_pdf',
      manufacturer: 'Shinagawa Machinery Works Co., Ltd.',
      modelNumber: 'SMR-800FX',
      summary: 'คู่มือฉบับเต็มภาษาไทย ครอบคลุมโครงสร้างเชิงกล, การตั้งค่าความเร็วรอบใบกวน, มาตรฐานการอัดจารบีแบริ่ง, ระบบหล่อลื่น Reduction Gearbox, และข้อกำหนดความปลอดภัย LOTO'
    }
  },
  {
    id: 'kn-man-02',
    type: 'MANUAL',
    title: 'แผนภาพวงจรไฟฟ้าและการควบคุม VACUUM COOLER (Electrical & PLC Wiring Diagram)',
    machineId: 'VCA01',
    machineName: 'VACUUM COOLER1',
    lineGroup: 'ห้องแวคข้าว',
    tags: ['วงจรไฟฟ้า', 'Wiring Diagram', 'PLC Mitsubishi', 'Inverter'],
    author: 'วิศวกรไฟฟ้าอาวุโส',
    createdAt: '2026-01-20',
    updatedAt: '2026-02-18',
    isVerified: true,
    viewCount: 68,
    manualData: {
      docCode: 'ELEC-VCA-01-REV3',
      revision: '03',
      category: 'Electrical Diagram',
      fileName: 'VCA01_Wiring_Schematic_Diagram_2026.pdf',
      fileSize: '5.1 MB',
      fileType: 'pdf',
      fileContent: 'sample_pdf',
      manufacturer: 'Kajiwara Inc.',
      modelNumber: 'KVC-1200T',
      summary: 'ไดอะแกรมวงจรไฟฟ้าแรงดัน 380V/220V, วงจรควบคุม Inverter ปั๊มสูญญากาศ, แผนผัง I/O PLC FX5U, และวงจรความปลอดภัย Interlock Door Switch'
    }
  },
  {
    id: 'kn-man-03',
    type: 'MANUAL',
    title: 'คู่มือและแคตตาล็อกอะไหล่เครื่องซีลถุงแนวนอน (FFS Spare Parts Catalog & Manual)',
    machineId: 'FFS01',
    machineName: 'HORIZONTAL FORM FILL SEAL1',
    lineGroup: 'ห้องขึ้นรูปข้าวกล่อง',
    tags: ['แคตตาล็อกอะไหล่', 'Heater Jaw', 'Servo Drive', 'Film Feeder'],
    author: 'ทีมจัดซื้ออะไหล่วิศวกรรม',
    createdAt: '2026-02-05',
    updatedAt: '2026-04-01',
    isVerified: true,
    viewCount: 51,
    manualData: {
      docCode: 'CAT-FFS-01-2025',
      revision: '01',
      category: 'Spare Parts Catalog',
      fileName: 'FFS01_Spare_Parts_Exploded_View.pdf',
      fileSize: '8.2 MB',
      fileType: 'pdf',
      fileContent: 'sample_pdf',
      manufacturer: 'Omori Machinery Co.',
      modelNumber: 'S-5000X Alpha',
      summary: 'Exploded View ภาพตัดแยกชิ้นส่วนทุกยูนิต พร้อมรหัสพาร์ตอะไหล่แท้ OEM, มาตรฐานความต้านทานฮีตเตอร์, และสเปกแบริ่งรอบจัด'
    }
  },
  {
    id: 'kn-man-04',
    type: 'MANUAL',
    title: 'คู่มือระบบลมนิวเมติกส์และกระบอกสูบตัดถาด AUTOMATIC TOP SEALER',
    machineId: 'ATS01',
    machineName: 'AUTOMATIC TOP SEARER1',
    lineGroup: 'ห้องขึ้นรูปข้าวกล่อง',
    tags: ['นิวเมติกส์', 'SMC Cylinder', 'Solenoid Valve', 'Air Filter'],
    author: 'ช่างเทคนิคระบบลม',
    createdAt: '2026-02-12',
    updatedAt: '2026-05-10',
    isVerified: true,
    viewCount: 39,
    manualData: {
      docCode: 'PNEU-ATS-01-V1',
      revision: '01',
      category: 'Pneumatic Diagram',
      fileName: 'ATS01_Pneumatic_Circuit_Layout.pdf',
      fileSize: '2.8 MB',
      fileType: 'pdf',
      fileContent: 'sample_pdf',
      manufacturer: 'Multivac Sepp Haggenmüller SE',
      modelNumber: 'T-300 Packaging',
      summary: 'ผังวงจรท่อลมแรงดัน 6 bar, แมนิโฟลด์โซลินอยด์วาล์ว SMC SY Series, วงจรควบคุมกระบอกสูบกดซีลฝาถาด และเซนเซอร์จับตำแหน่ง Magnetic Reed Switch'
    }
  },

  // ==========================================
  // 2. WORK INSTRUCTIONS (WI / SOP ขั้นตอนมาตรฐาน)
  // ==========================================
  {
    id: 'kn-wi-01',
    type: 'WI',
    title: 'WI-MNT-VAC-004: ขั้นตอนมาตรฐานการเปลี่ยนและตั้งค่าความตึงขอบยางซีลประตูตู้แวคคัม (VCA Seal Replacement)',
    machineId: 'VCA01',
    machineName: 'VACUUM COOLER1',
    lineGroup: 'ห้องแวคข้าว',
    tags: ['WI', 'SOP', 'เปลี่ยนยางซีล', 'สูญญากาศ', 'VCA'],
    author: 'หัวหน้าหน่วยบำรุงรักษา',
    createdAt: '2026-02-14',
    updatedAt: '2026-06-01',
    isVerified: true,
    viewCount: 94,
    wiData: {
      docCode: 'WI-MNT-VAC-004',
      revision: '03',
      effectiveDate: '2026-02-01',
      department: 'ฝ่ายวิศวกรรมและบำรุงรักษาโรงงาน',
      targetAudience: 'ช่างกลโรงงาน และ ช่างกะฉุกเฉิน',
      sopDocumentRef: 'SOP-ENG-QA-018',
      precautions: 'ต้อง Lockout/Tagout (LOTO) ระบบไฟฟ้าและปล่อยแรงดันสุญญากาศเป็น 0 mbar (Vent to Atmos) ก่อนเปิดฝาครอบชิ้นส่วนเสมอ สวมถุงมือกันบาดระหว่างดึงยางเก่า',
      safetyAlerts: [
        'ตัดไฟ Breaker QF-03 และแขวนป้าย LOTO',
        'ตรวจสอบให้แน่ใจว่า Chamber อยู่ที่ความดันบรรยากาศ 1 atm',
        'ใช้น้ำยาทำความสะอาด Food Grade ปราศจากซิลิโคนปนเปื้อนผลิตภัณฑ์'
      ],
      toolsRequired: [
        'ไขควงปากแบนปลายมนหุ้มเทป (ป้องกันรอยขูดร่องอลูมิเนียม)',
        'มีดยางซิลิโคนคมพิเศษ 45 องศา',
        'ไม้บรรทัดเหล็กวัดระยะ 100 ซม.',
        'แอลกอฮอล์ Food Grade 75%',
        'กาวซิลิโคน RTV Food Grade (Loctite 5900)'
      ],
      ppeRequired: ['แว่นตานิรภัย Safety Glasses', 'ถุงมือผ้าเคลือบ PU กันบาด', 'รองเท้าเซฟตี้'],
      steps: [
        {
          stepNo: 1,
          title: 'เตรียมการและตัดพลังงานเครื่องจักร (Lockout/Tagout)',
          description: 'กด E-Stop หน้าตู้, สับสวิตช์ Main Isolator ลงตำแหน่ง OFF, ติดตั้งกุญแจ Master Lock และป้ายเตือน "ห้ามเปิดเครื่อง กำลังปฏิบัติงาน"',
          standard: 'แรงดันไฟฟ้าที่ตู้ = 0V, เกจวัดแรงดันสูญญากาศ = 0 bar (บรรยากาศปกติ)',
          caution: 'ห้ามดำเนินการขณะปั๊มสูญญากาศยังคงเดินเครื่องอยู่',
          estimatedMins: 5
        },
        {
          stepNo: 2,
          title: 'ถอดยางซีลซิลิโคนเดิมและทำความสะอาดร่องซีล',
          description: 'ใช้เครื่องมือปลายมนค่อยๆ ดึงยางซีลเดิมออกจากร่องอลูมิเนียมโดยรอบ ทำความสะอาดคราบน้ำมันและกาวเก่าด้วยผ้าสะอาดชุบแอลกอฮอล์ Food Grade',
          standard: 'ร่องขอบประตูสะอาด 100% ไม่มีเศษกาวเก่าหรือผงฝุ่นคั่งค้าง',
          caution: 'ระวังอย่าให้โลหะมีคมขูดขอบร่องอลูมิเนียมเป็นรอยลึก เพราะจะทำให้อากาศรั่วซึมได้',
          estimatedMins: 15
        },
        {
          stepNo: 3,
          title: 'ติดตั้งยางซีล Food Grade ชิ้นใหม่เข้าตามร่อง',
          description: 'เริ่มกดใส่ยางซีลจากมุมทั้ง 4 จุดก่อน เพื่อให้ความยาวกระจายตัวเท่ากัน จากนั้นค่อยๆ กดไล่เข้าสู่ตรงกลางทีละด้าน โดยห้ามดึงยืดขอบยางเกิน 3%',
          standard: 'ยางซีลแนบสนิทกับร่องประตู ไม่โป่งพองหรือบิดเบี้ยว รอยต่อมุมเข้าฉากสมบูรณ์',
          caution: 'ห้ามทากาวซิลิโคนหนาเกินไป จะทำให้บ่าซีลปิดไม่สนิท',
          estimatedMins: 20
        },
        {
          stepNo: 4,
          title: 'ทดสอบการปิดประตูและการสร้างความดันสุญญากาศ (Vacuum Hold Test)',
          description: 'ปลด LOTO, จ่ายไฟเข้าเครื่อง, ปิดประตูห้องแวคคัม, สั่งปั๊มทำงานดูดสุญญากาศจนถึงเกณฑ์ -95 kPa และทดสอบดับปั๊มจับเวลาคงสถานะ (Holding Time)',
          standard: 'ความดันสุญญากาศต้องลดลงถึง ≤ -95 kPa ภายใน 90 วินาที และความดันรั่วไหลไม่เกิน 0.5 kPa ใน 5 นาที',
          caution: 'หากพบแรงดันตกเกินเกณฑ์ ให้ใช้เครื่องวัดฟองสบู่ Food Grade ตรวจหารอยรั่วที่มุมซีล',
          estimatedMins: 15
        }
      ]
    }
  },
  {
    id: 'kn-wi-02',
    type: 'WI',
    title: 'WI-MNT-FFS-008: การตั้งศูนย์และบาลานซ์อุณหภูมิแท่งความร้อนฮีตเตอร์ตัดซอง (Heater Sealing Calibration)',
    machineId: 'FFS01',
    machineName: 'HORIZONTAL FORM FILL SEAL1',
    lineGroup: 'ห้องขึ้นรูปข้าวกล่อง',
    tags: ['WI', 'Heater Jaw', 'Sealing', 'FFS', 'สอบเทียบอุณหภูมิ'],
    author: 'วิศวกรซ่อมบำรุง',
    createdAt: '2026-03-01',
    updatedAt: '2026-05-20',
    isVerified: true,
    viewCount: 77,
    wiData: {
      docCode: 'WI-MNT-FFS-008',
      revision: '02',
      effectiveDate: '2026-03-01',
      department: 'ฝ่ายวิศวกรรมบำรุงรักษา',
      targetAudience: 'ช่างเทคนิคซ่อมบำรุงเครื่องขึ้นรูปและบรรจุ',
      sopDocumentRef: 'SOP-PACK-002',
      precautions: 'ระวังอันตรายจากความร้อนสูง (อุณหภูมิใช้งาน 165°C) สวมถุงมือทนความร้อนชนิดพิเศษและแว่นตานิรภัย',
      safetyAlerts: [
        'พื้นผิวฮีตเตอร์มีอุณหภูมิสูงกว่า 160°C เสี่ยงผิวหนังไหม้',
        'ตัดไฟก่อนสัมผัสขั้วต่อสายไฟด้านหลัง Heating Jaw'
      ],
      toolsRequired: [
        'เครื่องวัดอุณหภูมิอินฟราเรด / Surface Thermocouple Type K',
        'ฟิลเลอร์เกจความละเอียด 0.05 mm (Feeler Gauge)',
        'ประแจปอนด์ขนาดเล็ก 5-25 Nm',
        'กระดาษ Carbon Check Pressure Distribution'
      ],
      ppeRequired: ['ถุงมือหนังทนความร้อน 250°C', 'แว่นตานิรภัย', 'ปลอกแขนกันความร้อน'],
      steps: [
        {
          stepNo: 1,
          title: 'ตรวจสอบความเรียบและรอยขูดขีดบนแท่งซีลความร้อน',
          description: 'ปิดเครื่องและรอให้อุณหภูมิลดลงต่ำกว่า 60°C ตรวจสอบผิวหน้าเทฟลอน (Teflon Coating) ว่ามีคราบไหม้หรือรอยขูดลึกหรือไม่',
          standard: 'ผิวหน้าเทฟลอนเคลือบเรียบสม่ำเสมอ ไม่มีเศษพลาสติกไหม้เกาะติด',
          caution: 'ห้ามใช้โลหะมีคมขูดผิวเทฟลอนเด็ดขาด ให้ใช้ผ้าชุบน้ำมันซิลิโคนเช็ดเท่านั้น',
          estimatedMins: 10
        },
        {
          stepNo: 2,
          title: 'ปรับตั้งระยะขนาน (Parallelism Adjustment) ของขากรรไกร Jaw',
          description: 'ใช้ฟิลเลอร์เกจเสียบวัดช่องว่างระหว่างแท่งบนและแท่งล่าง ทั้งด้านซ้ายและด้านขวา ปรับขันโบลต์ตั้งศูนย์จนระยะห่างเท่ากัน',
          standard: 'ช่องว่างซ้าย-ขวา แตกต่างกันไม่เกิน ±0.03 mm ตลอดแนว 300 mm',
          caution: 'ขันน็อตแบบกากบาทและล็อกด้วยประแจปอนด์ตามเกณฑ์ 14 Nm',
          estimatedMins: 20
        },
        {
          stepNo: 3,
          title: 'ทดสอบการกระจายแรงกดด้วยกระดาษคาร์บอน (Pressure Print Test)',
          description: 'สอดกระดาษคาร์บอนทดสอบระหว่างหน้าซีล สั่ง Jaw ประกบด้วยแรงดัน 4 bar แล้วคลายออก ตรวจดูรอยกดทับ',
          standard: 'รอยกดทับบนกระดาษต้องมีความเข้มสม่ำเสมอตลอดความยาว ไม่มีจุดซีดจางหรือรอยเว้า',
          caution: 'หากพบจุดด่าง ให้ปรับมุมชิมรองด้านล่าง',
          estimatedMins: 10
        },
        {
          stepNo: 4,
          title: 'สอบเทียบอุณหภูมิ 5 จุด (5-Point Temperature Calibration)',
          description: 'เปิดระบบทำความร้อนจนถึง Setpoint 165°C ใช้ Surface Probe วัดอุณหภูมิจริงที่มุมซ้าย, กึ่งกลางซ้าย, กลาง, กึ่งกลางขวา, และมุมขวา',
          standard: 'อุณหภูมิต้องอยู่ในช่วง 165°C ± 2°C ทั่วทุกจุด',
          caution: 'หากอุณหภูมิส่วนปลายน้อยกว่าตรงกลางเกิน 5°C ให้ตรวจสอบไส้ฮีตเตอร์ฮาล์ฟเอ็นด์ (Cartridge Heater)',
          estimatedMins: 15
        }
      ]
    }
  },

  // ==========================================
  // 3. TROUBLESHOOTING GUIDES (คู่มือวิเคราะห์อาการเสีย)
  // ==========================================
  {
    id: 'kn-tb-01',
    type: 'TROUBLESHOOTING',
    title: 'คู่มือวิเคราะห์อาการเสีย: เครื่อง VACUUM COOLER สูญญากาศดูดไม่ลง หรือแรงดันไม่ถึงเกณฑ์ -95 kPa',
    machineId: 'VCA01',
    machineName: 'VACUUM COOLER1',
    lineGroup: 'ห้องแวคข้าว',
    tags: ['Troubleshooting', 'สูญญากาศตก', 'Vacuum Leak', 'ปั๊มแวคคัม', 'ซีลรั่ว'],
    author: 'วิศวกรความน่าเชื่อถือระบบ (Reliability Eng)',
    createdAt: '2026-02-10',
    updatedAt: '2026-05-18',
    isVerified: true,
    viewCount: 135,
    troubleshootingData: {
      symptom: 'เมื่อสั่งเดินเครื่องแวคคัม ปั๊มทำงานแต่เกจวัดความดันลงช้ามากหรือไม่สามารถดูดลดลงต่ำกว่า -80 kPa ได้ (ปกติ -95 kPa)',
      subsystem: 'ระบบสุญญากาศ (Vacuum)',
      urgency: 'วิกฤตไลน์หยุด (Critical)',
      requiredTools: ['เครื่องวัดความดัน Digital Manometer', 'ขวดสเปรย์น้ำยาฟองสบู่ตรวจรอยรั่ว Leak Detection', 'ไขควงวัดไฟ', 'ประแจเลื่อน'],
      safetyNotes: 'ระวังลมดูดที่พอร์ตแวคคัม ห้ามนำมือหรือสิ่งแปลกปลอมเข้าใกล้ท่อดูดขณะปั๊มกำลังสร้างแรงดันลบ',
      quickChecklist: [
        '1. ตรวจดูว่าประตูตู้ Chamber ปิดสนิทและสลักล็อกขบแน่นหรือไม่',
        '2. ดูเกจวัดแรงดันลม Main Air Supply ว่าจ่ายลมเข้าอย่างน้อย 5.5 bar หรือไม่',
        '3. ตรวจเช็กระดับและสีน้ำมันในตาแมวของ Vacuum Pump (น้ำมันต้องใส ไม่ขาวขุ่น)'
      ],
      probableCauses: [
        {
          id: 'pc-1',
          cause: 'ยางขอบประตู Chamber เสื่อมสภาพ แตกร้าว หรือมีเศษอาหารติดคั่นขอบซีล',
          probability: 'สูง (High)',
          checkMethod: 'ใช้ไฟฉายส่องตรวจแนวขอบยางรอบประตู และฉีดพ่นน้ำยาฟองสบู่ดูการดูดอากาศเข้าตามขอบ',
          solution: 'ทำความสะอาดรอยต่อขอบประตู หากพบยางแข็งตัว แตก หรือยุบถาวร ให้เปลี่ยนยางซีลซิลิโคนใหม่ตาม WI-MNT-VAC-004',
          sparePartNeeded: 'SILICONE DOOR GASKET 25x20 mm (PART: GSK-VCA-01)',
          estimatedFixTimeMins: 30
        },
        {
          id: 'pc-2',
          cause: 'โซลินอยด์วาล์วปล่อยลมกลับ (Vent/Bypass Valve) ค้างหรือรั่ว ปิดไม่สนิท',
          probability: 'ปานกลาง (Medium)',
          checkMethod: 'ตรวจฟังเสียงลมฟู่ที่ท่อ Exhaust และตรวจไฟสัญญาณ LED ที่หัวคอยล์โซลินอยด์วาล์ว',
          solution: 'ถอดล้างทำความสะอาดลูกสูบสปริงภายในวาล์ว หรือเปลี่ยนชุด Solenoid Vent Valve ชิ้นใหม่',
          sparePartNeeded: 'PNEUMATIC ANGLE SEAT VALVE 1-1/2" (PART: VLV-VENT-15)',
          estimatedFixTimeMins: 45
        },
        {
          id: 'pc-3',
          cause: 'น้ำมันหล่อลื่นปั๊มแวคคัมเสื่อมสภาพ / มีไอน้ำปนเปื้อนจนเกิด Emulsion',
          probability: 'ปานกลาง (Medium)',
          checkMethod: 'ดูช่องตาแมว (Oil Sight Glass) หากน้ำมันเปลี่ยนเป็นสีขาวขุ่นคล้ายนม แสดงว่ามีไอน้ำปนเปื้อนในน้ำมัน',
          solution: 'ถ่ายน้ำมันเดิมทิ้งทั้งหมด ล้างห้องน้ำมัน และเติมน้ำมันแวคคัมเกรดสังเคราะห์ Food Grade (ISO VG 100) ใหม่จนถึงขีด MAX',
          sparePartNeeded: 'VACUUM PUMP OIL FOOD GRADE ISO VG 100 (5 Liters)',
          estimatedFixTimeMins: 40
        },
        {
          id: 'pc-4',
          cause: 'แผ่นใบพัดคาร์บอน (Carbon Vanes) ของปั๊มแวคคัมสึกหรอเกินเกณฑ์',
          probability: 'ต่ำ (Low)',
          checkMethod: 'ถอดฝาข้างปั๊ม ใช้เวอร์เนียวัดความสูงของใบพัด หากสึกหรอเกิน 5 mm จากสเปกมาตรฐาน',
          solution: 'เปลี่ยนชุดใบพัด Carbon Vane ครบชุด 4 แผ่นพร้อมกัน',
          sparePartNeeded: 'CARBON VANE SET 4 PCS (PART: CV-BECKER-04)',
          estimatedFixTimeMins: 90
        }
      ]
    }
  },
  {
    id: 'kn-tb-02',
    type: 'TROUBLESHOOTING',
    title: 'คู่มือวิเคราะห์อาการเสีย: เครื่อง FFS ซองย่น รอยซีลไม่ติด หรือฟิล์มเลื่อนส่ายเอียงหลุดแท่น',
    machineId: 'FFS01',
    machineName: 'HORIZONTAL FORM FILL SEAL1',
    lineGroup: 'ห้องขึ้นรูปข้าวกล่อง',
    tags: ['Troubleshooting', 'ฟิล์มย่น', 'ซีลรั่ว', 'Heater', 'FFS'],
    author: 'ช่างเทคนิคไลน์แพ็กกิ้ง',
    createdAt: '2026-03-05',
    updatedAt: '2026-05-30',
    isVerified: true,
    viewCount: 112,
    troubleshootingData: {
      symptom: 'ซองบรรจุอาหารที่ออกมาจากเครื่องมีรอยย่นตามแนวขวาง, ตะเข็บซีลไม่ติดแน่น หรือฟิล์มแกว่งหนีศูนย์ออกด้านข้าง',
      subsystem: 'ความร้อน & ซีล (Thermal/Sealing)',
      urgency: 'เร่งด่วน (Urgent)',
      requiredTools: ['ฟิลเลอร์เกจ', 'ประแจหกเหลี่ยม', 'เครื่องวัดอุณหภูมิเลเซอร์', 'ผ้าสะอาดชุบซิลิโคน'],
      safetyNotes: 'ห้ามยื่นมือเข้าในบริเวณชุด Rotary Sealer ขณะลูกรีดกำลังหมุน ระวังความร้อนจากฮีตเตอร์',
      quickChecklist: [
        '1. ตรวจดูว่าม้วนฟิล์มใส่ตรงแนวแกน Air Shaft หรือไม่',
        '2. ตรวจสอบอุณหภูมิหน้าจอ Display เทียบกับ SV/PV ว่าความร้อนถึง 165°C หรือไม่',
        '3. ตรวจดูความสะอาดของร่องยางลูกกลิ้งดึงฟิล์มว่ามีเศษกาวติดหรือไม่'
      ],
      probableCauses: [
        {
          id: 'pc-21',
          cause: 'ระยะห่างของลูกกลิ้งดึงฟิล์มซ้าย-ขวาไม่สมดุล (Uneven Roller Tension)',
          probability: 'สูง (High)',
          checkMethod: 'ใช้ฟิลเลอร์เกจวัดช่องว่างหัวลูกกลิ้งทั้งสองด้าน',
          solution: 'ปรับตั้งระยะสปริงกดลูกกลิ้งให้เสมอกัน 0.35 mm ทั้งสองฝั่งตามมาตรฐาน OPL-042',
          estimatedFixTimeMins: 15
        },
        {
          id: 'pc-22',
          cause: 'ฮีตเตอร์ขาดบางจุด หรือเทอร์โมคัปเปิลหลวม ทำให้อุณหภูมิหน้าแท่งซีลไม่สม่ำเสมอ',
          probability: 'ปานกลาง (Medium)',
          checkMethod: 'ใช้ Infrared Thermometer ยิงตรวจความร้อนตลอดแนวขวางของแท่งซีล',
          solution: 'ขันขั้วต่อสายไฟ Thermocouple หรือเปลี่ยนแท่ง Cartridge Heater แท้',
          sparePartNeeded: 'CARTRIDGE HEATER 220V 400W 12x150mm (PART: HTR-400W-12)',
          estimatedFixTimeMins: 35
        },
        {
          id: 'pc-23',
          cause: 'เทปกันความร้อนเทฟลอน (Teflon Tape) ขาดหรือไหม้กรอบ',
          probability: 'สูง (High)',
          checkMethod: 'ตรวจสอบผิวหน้าซีลว่ามีรอยฉีกขาดหรือมีพลาสติกไหม้เหนียวติดหรือไม่',
          solution: 'ลอกเทปเก่าออก เช็ดคราบกาวด้วยทินเนอร์เบา และติดเทปเทฟลอนทนความร้อนม้วนใหม่',
          sparePartNeeded: 'TEFLON TAPE 0.13mm x 25mm (PART: TFL-TAPE-25)',
          estimatedFixTimeMins: 10
        }
      ]
    }
  },
  {
    id: 'kn-tb-03',
    type: 'TROUBLESHOOTING',
    title: 'คู่มือวิเคราะห์อาการเสีย: เครื่องผสมข้าว RICE MIXER ใบกวนหมุนสะดุด มอเตอร์ตัดโอเวอร์โหลด',
    machineId: 'RIM01',
    machineName: 'RICE MIXER 1',
    lineGroup: 'ห้องซุยข้าว',
    tags: ['Troubleshooting', 'มอเตอร์โอเวอร์โหลด', 'ใบกวนสะดุด', 'แบริ่งแตก', 'RIM'],
    author: 'วิศวกรเครื่องกล',
    createdAt: '2026-03-12',
    updatedAt: '2026-05-15',
    isVerified: true,
    viewCount: 88,
    troubleshootingData: {
      symptom: 'เครื่องผสมข้าวทำงานไปได้ 2-3 นาที แล้วตัดการทำงานด้วยสัญญาณเตือน Inverter Overload Fault (OL1/OL2) หรือมีเสียงดัง กุกๆ จากชุดขับเคลื่อน',
      subsystem: 'เครื่องกล (Mechanical)',
      urgency: 'วิกฤตไลน์หยุด (Critical)',
      requiredTools: ['แคลมป์มิเตอร์วัดกระแสไฟ (Clamp Meter)', 'ประแจเบอร์ 17, 19, 24', 'หัวปืนอัดจารบี Grease Gun', 'Stethoscope ฟังสเตโทสโคปวิศวกรรม'],
      safetyNotes: 'สับเบรกเกอร์ Main Isolator และล็อกกุญแจ LOTO ก่อนตรวจสอบใบกวนภายในถังผสมเด็ดขาด',
      quickChecklist: [
        '1. ตรวจสอบปริมาณข้าวที่บรรจุในถังผสมว่าเกินพิกัด Max 80 kg หรือไม่',
        '2. หมุนพูลเล่ย์ด้วยมือดูว่าแกนเพลาหมุนคล่องตัวหรือไม่',
        '3. ใช้แคลมป์มิเตอร์วัดกระแสไฟฟ้าขณะมอเตอร์ทำงานเทียบกับ Nameplate (พิกัด 7.5A)'
      ],
      probableCauses: [
        {
          id: 'pc-31',
          cause: 'แบริ่งแกนเพลาขับตัวใน (Pillow Block Bearing) เสียหายหรือขาดจารบีอย่างรุนแรง',
          probability: 'สูง (High)',
          checkMethod: 'ใช้สเตโทสโคปฟังเสียงที่เสื้อแบริ่งขณะหมุนเพลา และตรวจวัดอุณหภูมิเสื้อแบริ่ง (>75°C)',
          solution: 'อัดจารบี Food Grade หากยังสะดุดให้ถอดเปลี่ยนชุดตลับลูกปืน Pillow Block ใหม่ทันที',
          sparePartNeeded: 'PILLOW BLOCK BEARING UCP208 STAINLESS (PART: BRG-UCP-208)',
          estimatedFixTimeMins: 60
        },
        {
          id: 'pc-32',
          cause: 'น้ำมันหล่อลื่นเกียร์ทด (Gear Reducer Oil) แห้งหรือเฟืองเกียร์สึกหรอ',
          probability: 'ปานกลาง (Medium)',
          checkMethod: 'เปิดจุกวัดระดับน้ำมันเกียร์ และถ่ายน้ำมันดูเศษโลหะประกายชิป',
          solution: 'เติมหรือเปลี่ยนถ่ายน้ำมันเกียร์เบอร์ ISO VG 220 Food Grade ตามปริมาตร 1.8 ลิตร',
          sparePartNeeded: 'FOOD GRADE GEAR OIL ISO VG 220 (2 Liters)',
          estimatedFixTimeMins: 30
        },
        {
          id: 'pc-33',
          cause: 'สายพานไทม์มิ่งขับใบกวนหย่อนหรือฟันสายพานรูดข้ามร่อง',
          probability: 'ปานกลาง (Medium)',
          checkMethod: 'กดสายพานตรงกลางด้วยแรง 20N ดูระยะแอ่นตัว (Deflection) ต้องไม่เกิน 8 mm',
          solution: 'คลายโบลต์แท่นมอเตอร์และขันน็อตดึงความตึงสายพานใหม่ตามสเปก',
          sparePartNeeded: 'TIMING BELT 8M-1200-30 (PART: BLT-8M-1200)',
          estimatedFixTimeMins: 25
        }
      ]
    }
  },

  // ==========================================
  // 4. WHY-WHY CASE LIBRARY (คลังเคสสืบค้น Why-Why)
  // ==========================================
  {
    id: 'kn-why-01',
    type: 'WHY_WHY',
    title: 'Why-Why เคสประวัติศาสตร์: มอเตอร์ VAC02 ตัดหยุดฉุกเฉินจากความร้อนสะสมในตู้คอนโทรล',
    machineId: 'VCA02',
    machineName: 'VACUUM COOLER2',
    lineGroup: 'ห้องแวคข้าว',
    tags: ['Why-Why', 'Overheat', 'พัดลมตู้คอนโทรล', 'Filter ตัน', 'Root Cause'],
    author: 'ทีมวิเคราะห์ไคเซ็นวิศวกรรม',
    createdAt: '2026-06-10',
    updatedAt: '2026-06-12',
    isVerified: true,
    viewCount: 162,
    whyWhyData: {
      problemStatement: 'เครื่อง VAC02 มอเตอร์ทริปหยุดทำงานฉุกเฉินขณะไลน์กำลังเดินผลิต ทำให้สูญเสียเวลาหยุดเครื่อง 65 นาที',
      phenomenon: 'Inverter ในตู้ควบคุมแสดง Error Code OH1 (Heatsink Overheating) และเบรกเกอร์วงจรช่วยตัดการทำงาน',
      why1: 'ทำไม Inverter จึงแสดง Fault OH1? -> เพราะอุณหภูมิสะสมภายในตู้คอนโทรลสูงเกิน 55°C เกินขีดจำกัดความปลอดภัย',
      why2: 'ทำไมอุณหภูมิตู้คอนโทรลจึงสูงสะสม? -> เพราะพัดลมระบายความร้อนด้านบนตู้หยุดหมุน ไม่สามารถดูดลมร้อนออกได้',
      why3: 'ทำไมพัดลมระบายความร้อนจึงหยุดหมุน? -> เพราะแผ่นฟิลเตอร์กรองฝุ่นด้านล่างตู้มีฝุ่นแป้งเกาะหนาแน่นจนลมไม่ไหลเวียน และมอเตอร์พัดลมไหม้',
      why4: 'ทำไมฟิลเตอร์จึงมีแป้งเกาะหนาแน่นจนมอเตอร์ไหม้? -> เพราะไม่มีรอบการถอดล้างทำความสะอาดฟิลเตอร์ประจำสัปดาห์ในแผน PM',
      why5: 'ทำไมจึงไม่มีรอบถอดล้างในแผน PM? (Root Cause) -> เพราะตอนติดตั้งเครื่องจักรใหม่ไม่ได้ระบุรายการตรวจสอบความสะอาดของตู้คอนโทรลลงใน PM Standard Checklist',
      rootCauseSummary: 'ขาดขั้นตอนการถอดล้างแผ่นกรองฝุ่นตู้คอนโทรลในแผน PM เชิงป้องกัน ทำให้ฝุ่นแป้งอุดตันจนระบายความร้อนไม่ทัน',
      countermeasure: '1. เปลี่ยนพัดลมระบายอากาศตัวใหม่ชนิด Ball Bearing กันฝุ่น IP54\n2. บรรจุหัวข้อ "เป่าฝุ่นและล้างฟิลเตอร์ตู้คอนโทรลทุกวันศุกร์" ลงในเช็กลิสต์ PM Plan ประจำสัปดาห์\n3. ติดตั้งเกจวัดอุณหภูมิ Digital Display หน้าตู้พร้อมระบบแจ้งเตือนเมื่อเกิน 45°C',
      standardizationRef: 'บรรจุลงในเอกสาร PM Checklist F-QMS-VAC-011 Rev.03',
      effectivenessVerification: 'ติดตามผล 60 วัน อุณหภูมิตู้คงที่ 38-41°C ไม่เคยเกิดการตัดหยุดจากความร้อนอีกเลย (Zero Overheat Faults)'
    }
  },
  {
    id: 'kn-why-02',
    type: 'WHY_WHY',
    title: 'Why-Why เคสประวัติศาสตร์: ใบมีดตัดซอง ATS01 ทู่เร็วผิดปกติและมีรอยบิ่นฉีกขาด',
    machineId: 'ATS01',
    machineName: 'AUTOMATIC TOP SEARER1',
    lineGroup: 'ห้องขึ้นรูปข้าวกล่อง',
    tags: ['Why-Why', 'ใบมีดบิ่น', 'ATS01', 'กระบอกสูบ', 'Misalignment'],
    author: 'วิศวกรกระบวนการผลิต',
    createdAt: '2026-05-22',
    updatedAt: '2026-05-25',
    isVerified: true,
    viewCount: 104,
    whyWhyData: {
      problemStatement: 'ซองพลาสติกตัดไม่ขาด ปลายซองฉีกเป็นฝอย ต้องหยุดไลน์เปลี่ยนใบมีดเฉลี่ยทุก 3 วัน (ปกติ 30 วัน)',
      phenomenon: 'คมใบมีดสแตนเลสมีรอยบิ่นละเอียดและรอยเสียดสีกับแท่นรอง Anvil ฝั่งขวา',
      why1: 'ทำไมใบมีดจึงบิ่นเร็วใน 3 วัน? -> เพราะคมใบมีดกระแทกโดนขอบแท่นรองตัด (Anvil) ด้านขวาโดยตรง',
      why2: 'ทำไมใบมีดจึงไปกระแทกขอบแท่นรองตัด? -> เพราะแท่นยึดใบมีดเอียงตัวลง 1.2 mm ขณะกระบอกสูบดันลง',
      why3: 'ทำไมแท่นยึดใบมีดจึงเอียงตัวลง? -> เพราะบูชประคองแกนกระบอกสูบ (Guide Bushing) หลวมคลอนจากแรงสั่นสะเทือน',
      why4: 'ทำไมบูชประคองจึงหลวมคลอน? -> เพราะน็อตล็อกไกด์บุชด้านขวาคลายตัวออก 2 เกลียว',
      why5: 'ทำไมจึงคลายตัว? (Root Cause) -> เพราะไม่ได้ทาน้ำยากันคลาย Loctite 243 ตอนเปลี่ยนอะไหล่รอบที่แล้ว และไม่ได้ขันด้วยประแจทอร์กตามสเปก',
      rootCauseSummary: 'ประกอบชิ้นส่วนไม่ได้มาตรฐาน ไม่มีการทาน้ำยาล็อกเกลียว Loctite และไม่ได้ใช้ประแจทอร์กควบคุมแรงขัน',
      countermeasure: '1. จัดทำ One Point Lesson (OPL) ขั้นตอนการประกอบแท่นใบมีด กำหนดจุดทาน้ำยากันคลาย Loctite 243 ชัดเจน\n2. กำหนดให้ช่างทุกคนต้องใช้ประแจปอนด์ขันที่ 22 Nm และแต้มสี QC Mark\n3. จัดซื้อประแจปอนด์เฉพาะทางประจำโต๊ะซ่อม',
      standardizationRef: 'OPL-ATS-BLADE-005 และปรับปรุง WI-MNT-ATS-002',
      effectivenessVerification: 'อายุการใช้งานของใบมีดเพิ่มขึ้นจาก 3 วัน เป็น 45 วัน ประหยัดค่าใบมีดได้กว่า 78,000 บาท/ปี'
    }
  }
];
