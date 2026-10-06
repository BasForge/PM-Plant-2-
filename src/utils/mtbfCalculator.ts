import { RepairLog, getRepairStoppageType } from '../types';
import { 
  RoomConfig, 
  RoomMachineConfig, 
  RoomCalculatedMetrics, 
  MachineCalculatedMetrics, 
  SumCalculatedMetrics, 
  CustomMachineMapping 
} from '../types/mtbf';
import { 
  OFFICIAL_MTBF_ROOMS, 
  DEFAULT_PRODUCTION_TIME_MONTHLY_2026, 
  DEFAULT_BASELINE_HISTORY, 
  MONTH_NAMES_ENG, 
  MONTH_NAMES_THAI 
} from '../data/mtbfRooms';
import * as XLSX from 'xlsx';

/**
 * แปลงค่า Production Time ที่กรอกมา:
 * เลขทศนิยมหมายถึงนาที (รูปแบบ ชม.นาที) คือ ชั่วโมงจริง = INT(x) + MOD(x,1)*100/60
 * ถ้า x เป็นจำนวนเต็ม ก็คือชั่วโมงตรงๆ
 */
export function parseProductionTimeValue(val: number | string): number {
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return 0;
  const intPart = Math.floor(num);
  const fracPart = num - intPart;
  if (fracPart === 0) return intPart;
  // นาทีทศนิยม เช่น 558.30 -> 558 + 30/60 = 558.5 ชม.
  const minutes = Math.round(fracPart * 100);
  return Number((intPart + minutes / 60).toFixed(4));
}

/**
 * ค้นหา Room และ Machine ที่จับคู่กับงานซ่อม
 */
export function resolveRepairToRoomAndMachine(
  repair: RepairLog,
  rooms: RoomConfig[],
  customMappings: Record<string, { roomId: string; machineId: string }>
): { room: RoomConfig | null; machine: RoomMachineConfig | null; isExplicitlyMapped: boolean } {
  const rawId = (repair.machineId || '').trim();
  const rawName = (repair.symptoms || '').trim().toLowerCase();

  // 1. ตรวจสอบ Custom Mapping ของผู้ใช้ก่อน
  if (customMappings[rawId]) {
    const { roomId, machineId } = customMappings[rawId];
    const room = rooms.find(r => r.id === roomId) || null;
    const machine = room?.machines.find(m => m.id === machineId) || null;
    if (room && machine) {
      return { room, machine, isExplicitlyMapped: true };
    }
  }

  // 2. ตรวจสอบรหัส M/C No. ตรงๆ หรือผ่าน AltIds
  for (const room of rooms) {
    for (const machine of room.machines) {
      if (machine.id.toLowerCase() === rawId.toLowerCase()) {
        return { room, machine, isExplicitlyMapped: true };
      }
      if (machine.altIds && machine.altIds.some(alt => alt.toLowerCase() === rawId.toLowerCase())) {
        return { room, machine, isExplicitlyMapped: true };
      }
    }
  }

  // 3. Smart Matching: ตามชื่อเครื่อง หรือหมวดหมู่อุปกรณ์
  const normRawId = rawId.toUpperCase();
  for (const room of rooms) {
    for (const machine of room.machines) {
      const normMachId = machine.id.toUpperCase();
      // เช็คการสลับอักษรย่อทั่วไป เช่น VAC กับ VCA
      if (normRawId.startsWith('VAC') && normMachId.startsWith('VCA')) {
        const numPartRaw = normRawId.replace(/\D/g, '');
        const numPartMach = normMachId.replace(/\D/g, '');
        if (numPartRaw && numPartRaw === numPartMach) {
          return { room, machine, isExplicitlyMapped: false };
        }
      }
      // เช็คการ match prefix เช่น FFS01 -> FFS01
      if (normRawId === normMachId) {
        return { room, machine, isExplicitlyMapped: false };
      }
    }
  }

  // 4. กรณีพิเศษที่ระบุในคำสั่งผู้ใช้:
  // - STICKY RICE FORMING (map ตาม SRM01 หรือ RPT02)
  if (normRawId.includes('SRM') || rawName.includes('sticky rice')) {
    const r4 = rooms.find(r => r.id === 'room-4');
    const srm = r4?.machines.find(m => m.id === 'SRM01');
    if (r4 && srm) return { room: r4, machine: srm, isExplicitlyMapped: false };
  }

  // - BCV / SBC / MBC สายพานขึ้นรูปในห้องข้าวกล่อง
  if (normRawId.startsWith('BCV') || normRawId.startsWith('SBC') || normRawId.startsWith('MBC')) {
    const r4 = rooms.find(r => r.id === 'room-4');
    // ให้ fallback ไปที่ FFS หรือเครื่องขึ้นรูปหลักในห้องข้าวกล่อง
    const fallbackM = r4?.machines.find(m => m.id === 'FFS01') || r4?.machines[0] || null;
    if (r4 && fallbackM) return { room: r4, machine: fallbackM, isExplicitlyMapped: false };
  }

  // - TLP01 / TSY01 Top Seal ยำสาหร่าย
  if (normRawId.startsWith('TLP01') || normRawId === 'TLP01') {
    const r5 = rooms.find(r => r.id === 'room-5');
    const tsy = r5?.machines.find(m => m.id === 'TSY01');
    if (r5 && tsy) return { room: r5, machine: tsy, isExplicitlyMapped: false };
  }

  // - OFR01 / ONR01 Onigiri Robot
  if (normRawId === 'OFR01' || normRawId === 'ONR01') {
    const r5 = rooms.find(r => r.id === 'room-5');
    const onr = r5?.machines.find(m => m.id === 'ONR01');
    if (r5 && onr) return { room: r5, machine: onr, isExplicitlyMapped: false };
  }

  return { room: null, machine: null, isExplicitlyMapped: false };
}

/**
 * คำนวณ MTBF / MTTR ทั้งหมดสำหรับปีที่เลือก
 */
export function calculateMTBFMTTRData(params: {
  year: number;
  repairs: RepairLog[];
  rooms: RoomConfig[];
  productionTimes: Record<string, number[]>; // roomId -> 12 months array (hours)
  customMappings?: Record<string, { roomId: string; machineId: string }>;
  stoppageFilter?: 'ALL_BREAKDOWNS' | 'PARTS_ONLY' | 'ALL_REPAIRS';
  baselineHistory?: typeof DEFAULT_BASELINE_HISTORY;
}): {
  roomMetrics: RoomCalculatedMetrics[];
  machineMetrics: Record<string, MachineCalculatedMetrics[]>; // roomId -> machines metrics
  sumMetrics: SumCalculatedMetrics;
  unmappedRepairs: RepairLog[];
} {
  const {
    year,
    repairs,
    rooms,
    productionTimes,
    customMappings = {},
    stoppageFilter = 'ALL_BREAKDOWNS',
    baselineHistory = DEFAULT_BASELINE_HISTORY
  } = params;

  // 1. คัดกรองงานซ่อมที่เข้าเงื่อนไขปีและประเภทงาน
  const currentYearStr = String(year);
  const relevantRepairs: RepairLog[] = [];
  const unmappedRepairs: RepairLog[] = [];

  // หาเดือนล่าสุดที่มีข้อมูลในระบบ (เพื่อแสดงว่างในเดือนอนาคต)
  let maxMonthWithData = -1;

  for (const r of repairs) {
    const rDate = r.date || r.breakdownTime || '';
    if (!rDate.startsWith(currentYearStr)) continue;

    // กรองประเภทงาน:
    // ตามคำสั่งและมาตรฐาน TPM/CPRAM: นำเฉพาะเบรกดาวน์ (BREAKDOWN) มาคิด MTTR / MTBF
    // ส่วน Minor stoppage (< 15 นาที ไม่เปลี่ยนอะไหล่) และ Adjustment loss (> 15 นาที ไม่เปลี่ยนอะไหล่) ไม่นำมาคิดเด็ดขาด!
    const stoppageType = getRepairStoppageType(r);
    if (stoppageType !== 'BREAKDOWN') {
      continue; // ข้าม Minor stoppage และ Adjustment loss ทันที ไม่นำมาคิด MTTR / MTBF
    }
    if (stoppageFilter === 'PARTS_ONLY') {
      const hasParts = Boolean((r.usedParts && r.usedParts.length > 0) || r.hasPartsReplaced);
      if (!hasParts) continue;
    }

    const monthNum = parseInt(rDate.slice(5, 7), 10) - 1; // 0..11
    if (monthNum >= 0 && monthNum <= 11) {
      if (monthNum > maxMonthWithData) {
        maxMonthWithData = monthNum;
      }
    }

    const resolved = resolveRepairToRoomAndMachine(r, rooms, customMappings);
    if (!resolved.room || !resolved.machine) {
      unmappedRepairs.push(r);
    }
    relevantRepairs.push(r);
  }

  // ถ้าเป็นปีปัจจุบัน ให้คำนึงถึงเดือนปัจจุบันเป็นอย่างน้อย
  const now = new Date();
  const currentActualYear = now.getFullYear();
  const currentActualMonth = now.getMonth();
  const activeMonthLimit = year === currentActualYear 
    ? Math.max(maxMonthWithData, currentActualMonth)
    : (year < currentActualYear ? 11 : maxMonthWithData);

  // 2. คำนวณรายเครื่องและรายห้อง
  const roomMetrics: RoomCalculatedMetrics[] = [];
  const machineMetrics: Record<string, MachineCalculatedMetrics[]> = {};

  for (const room of rooms) {
    const roomPTArray = productionTimes[room.id] || DEFAULT_PRODUCTION_TIME_MONTHLY_2026;
    const machinesInRoom = room.machines;

    // เตรียม bucket ข้อมูลสำหรับแต่ละเครื่องในห้อง
    const machineBDMin: Record<string, number[]> = {};
    const machineBDCount: Record<string, number[]> = {};
    const machineRepairIds: Record<string, string[][]> = {};

    machinesInRoom.forEach(m => {
      machineBDMin[m.id] = new Array(12).fill(0);
      machineBDCount[m.id] = new Array(12).fill(0);
      machineRepairIds[m.id] = Array.from({ length: 12 }, () => []);
    });

    // นำประวัติงานซ่อมลง bucket
    for (const r of relevantRepairs) {
      const rDate = r.date || r.breakdownTime || '';
      const mIdx = parseInt(rDate.slice(5, 7), 10) - 1;
      if (mIdx < 0 || mIdx > 11) continue;

      const resolved = resolveRepairToRoomAndMachine(r, rooms, customMappings);
      if (resolved.room?.id === room.id && resolved.machine) {
        const mId = resolved.machine.id;
        if (machineBDMin[mId]) {
          const duration = r.duration || 0;
          machineBDMin[mId][mIdx] += duration;
          machineBDCount[mId][mIdx] += 1;
          machineRepairIds[mId][mIdx].push(r.id);
        }
      }
    }

    // คำนวณผลลัพธ์รายเครื่อง
    const roomMachMetricsList: MachineCalculatedMetrics[] = [];
    for (const machine of machinesInRoom) {
      const bdMins = machineBDMin[machine.id];
      const counts = machineBDCount[machine.id];

      let cumPT = 0;
      let cumBD = 0;
      let cumN = 0;

      const monthlyMetrics: MachineCalculatedMetrics['monthly'] = [];

      for (let m = 0; m < 12; m++) {
        const pt = roomPTArray[m] || 0;
        const bd = bdMins[m];
        const n = counts[m];

        cumPT += pt;
        cumBD += bd;
        cumN += n;

        const isMonthFuture = m > activeMonthLimit;

        // MTBF[m] = ( Σ(PT[1..m]) − Σ(BD[1..m]) / 60 ) / ( Σ(N[1..m]) + 1 )
        const mtbf = isMonthFuture ? null : Number(((cumPT - cumBD / 60) / (cumN + 1)).toFixed(1));

        // MTTR[m] = BD[m] / N[m] (ถ้า N=0 ให้ 0)
        const mttr = isMonthFuture ? null : (n > 0 ? Number((bd / n).toFixed(1)) : 0);

        monthlyMetrics.push({
          monthIndex: m,
          monthName: `${MONTH_NAMES_ENG[m]}-${String(year).slice(-2)}`,
          productionTime: pt,
          breakdownMin: bd,
          breakdownCount: n,
          cumProductionTime: cumPT,
          cumBreakdownMin: cumBD,
          cumBreakdownCount: cumN,
          mtbf,
          mttr,
          hasData: !isMonthFuture,
          repairIds: machineRepairIds[machine.id][m]
        });
      }

      const totalPT = cumPT;
      const totalBD = cumBD;
      const totalN = cumN;
      const ytdMTBF = Number(((totalPT - totalBD / 60) / (totalN + 1)).toFixed(1));
      const ytdMTTR = totalN > 0 ? Number((totalBD / totalN).toFixed(1)) : 0;

      roomMachMetricsList.push({
        machineId: machine.id,
        machineName: machine.name,
        ranking: machine.ranking,
        monthly: monthlyMetrics,
        ytd: {
          productionTime: totalPT,
          breakdownMin: totalBD,
          breakdownCount: totalN,
          mtbf: ytdMTBF,
          mttr: ytdMTTR,
          repairIds: machineRepairIds[machine.id].slice(0, activeMonthLimit + 1).flat()
        }
      });
    }

    machineMetrics[room.id] = roomMachMetricsList;

    // รวมระดับห้อง: BD และ N = ผลรวมของทุกเครื่องในห้อง, PT ใช้ค่าห้อง
    let roomCumPT = 0;
    let roomCumBD = 0;
    let roomCumN = 0;

    const roomMonthly: RoomCalculatedMetrics['monthly'] = [];

    for (let m = 0; m < 12; m++) {
      const pt = roomPTArray[m] || 0;
      let monthBD = 0;
      let monthN = 0;

      for (const mach of roomMachMetricsList) {
        monthBD += mach.monthly[m].breakdownMin;
        monthN += mach.monthly[m].breakdownCount;
      }

      roomCumPT += pt;
      roomCumBD += monthBD;
      roomCumN += monthN;

      const isMonthFuture = m > activeMonthLimit;

      const mtbf = isMonthFuture ? null : Number(((roomCumPT - roomCumBD / 60) / (roomCumN + 1)).toFixed(2));
      const mttr = isMonthFuture ? null : (monthN > 0 ? Number((monthBD / monthN).toFixed(2)) : 0);

      const roomMonthRepairIds = roomMachMetricsList.flatMap(mach => mach.monthly[m].repairIds || []);

      roomMonthly.push({
        monthIndex: m,
        monthName: `${MONTH_NAMES_ENG[m]}-${String(year).slice(-2)}`,
        productionTime: pt,
        breakdownMin: monthBD,
        breakdownCount: monthN,
        cumProductionTime: roomCumPT,
        cumBreakdownMin: roomCumBD,
        cumBreakdownCount: roomCumN,
        mtbf,
        mttr,
        hasData: !isMonthFuture,
        repairIds: roomMonthRepairIds
      });
    }

    const roomTotalPT = roomCumPT;
    const roomTotalBD = roomCumBD;
    const roomTotalN = roomCumN;
    const roomYtdMTBF = Number(((roomTotalPT - roomTotalBD / 60) / (roomTotalN + 1)).toFixed(2));
    const roomYtdMTTR = roomTotalN > 0 ? Number((roomTotalBD / roomTotalN).toFixed(2)) : 0;

    roomMetrics.push({
      roomId: room.id,
      roomName: room.name,
      monthly: roomMonthly,
      ytd: {
        productionTime: roomTotalPT,
        breakdownMin: roomTotalBD,
        breakdownCount: roomTotalN,
        mtbf: roomYtdMTBF,
        mttr: roomYtdMTTR,
        repairIds: roomMonthly.slice(0, activeMonthLimit + 1).flatMap(rm => rm.repairIds || [])
      }
    });
  }

  // 3. รวมระดับ SUM (ภาพรวมทุกห้อง)
  // - Breakdown (min) รวม = Σ BD ของทุกห้อง
  // - จำนวนครั้ง Breakdown รวม = Σ N ของทุกห้อง
  // - MTBF รวม = ค่าเฉลี่ยเลขคณิตของ MTBF ทั้ง 8 ห้อง (simple AVERAGE ไม่ถ่วงน้ำหนัก)
  // - MTTR รวม = Σ BD ทุกห้อง / Σ N ทุกห้อง (คำนวณจากยอดรวม ไม่ใช่ค่าเฉลี่ยของ MTTR แต่ละห้อง) ถ้าหารศูนย์ให้ 0
  const sumMonthly: SumCalculatedMetrics['monthly'] = [];

  let sumCumPT = 0;
  let sumCumBD = 0;
  let sumCumN = 0;

  for (let m = 0; m < 12; m++) {
    let monthTotalPT = 0;
    let monthTotalBD = 0;
    let monthTotalN = 0;
    const roomMtbfList: number[] = [];

    for (const rm of roomMetrics) {
      monthTotalPT += rm.monthly[m].productionTime;
      monthTotalBD += rm.monthly[m].breakdownMin;
      monthTotalN += rm.monthly[m].breakdownCount;
      if (rm.monthly[m].mtbf !== null) {
        roomMtbfList.push(rm.monthly[m].mtbf as number);
      }
    }

    sumCumPT += monthTotalPT;
    sumCumBD += monthTotalBD;
    sumCumN += monthTotalN;

    const isMonthFuture = m > activeMonthLimit;

    const avgMtbf = roomMtbfList.length > 0 && !isMonthFuture
      ? Number((roomMtbfList.reduce((acc, v) => acc + v, 0) / roomMtbfList.length).toFixed(2))
      : null;

    const sumMttr = !isMonthFuture
      ? (monthTotalN > 0 ? Number((monthTotalBD / monthTotalN).toFixed(2)) : 0)
      : null;

    const sumMonthRepairIds = roomMetrics.flatMap(rm => rm.monthly[m].repairIds || []);

    sumMonthly.push({
      monthIndex: m,
      monthName: `${MONTH_NAMES_ENG[m]}-${String(year).slice(-2)}`,
      productionTime: monthTotalPT,
      breakdownMin: monthTotalBD,
      breakdownCount: monthTotalN,
      mtbf: avgMtbf,
      mttr: sumMttr,
      hasData: !isMonthFuture,
      repairIds: sumMonthRepairIds
    });
  }

  // YTD ระดับ SUM
  let sumYtdBD = 0;
  let sumYtdN = 0;
  let sumYtdPT = 0;
  const roomYtdMtbfList: number[] = [];

  for (const rm of roomMetrics) {
    sumYtdBD += rm.ytd.breakdownMin;
    sumYtdN += rm.ytd.breakdownCount;
    sumYtdPT += rm.ytd.productionTime;
    roomYtdMtbfList.push(rm.ytd.mtbf);
  }

  const sumYtdAvgMTBF = roomYtdMtbfList.length > 0
    ? Number((roomYtdMtbfList.reduce((acc, v) => acc + v, 0) / roomYtdMtbfList.length).toFixed(2))
    : 0;

  const sumYtdTotalMTTR = sumYtdN > 0 ? Number((sumYtdBD / sumYtdN).toFixed(2)) : 0;

  // Baseline data calculations for 2023..2025
  const parsedBaseline: SumCalculatedMetrics['baseline'] = {};
  for (const bYear of [2023, 2024, 2025] as const) {
    const rawB = (baselineHistory as any)[bYear] || (DEFAULT_BASELINE_HISTORY as any)[bYear];
    if (rawB) {
      const bBD = rawB.breakdownMin || [];
      const bCount = rawB.count || [];
      const bMTBF = rawB.mtbf || [];
      const bMTTR = rawB.mttr || [];

      const totalBD = bBD.reduce((acc: number, v: number) => acc + (v || 0), 0);
      const totalCount = bCount.reduce((acc: number, v: number) => acc + (v || 0), 0);
      const avgMTBF = bMTBF.length > 0 
        ? Number((bMTBF.reduce((acc: number, v: number) => acc + (v || 0), 0) / bMTBF.length).toFixed(2))
        : 0;
      const totalMTTR = totalCount > 0 ? Number((totalBD / totalCount).toFixed(2)) : 0;

      // ค้นหาว่ามีประวัติงานซ่อมของปี Baseline นี้ในระบบหรือไม่
      const yearStr = String(bYear);
      const bYearRepairs = repairs.filter(r => (r.date || r.breakdownTime || '').startsWith(yearStr));
      const bYearRepairIds = bYearRepairs.map(r => r.id);
      const bYearRepairIdsByRoom: Record<number, string[]> = {};
      rooms.forEach((_, idx) => { bYearRepairIdsByRoom[idx] = []; });
      bYearRepairs.forEach(r => {
        const resolved = resolveRepairToRoomAndMachine(r, rooms, customMappings);
        if (resolved.room) {
          const rIdx = rooms.findIndex(rm => rm.id === resolved.room?.id);
          if (rIdx >= 0) {
            bYearRepairIdsByRoom[rIdx].push(r.id);
          }
        }
      });

      parsedBaseline[bYear] = {
        breakdownMin: bBD,
        count: bCount,
        mtbf: bMTBF,
        mttr: bMTTR,
        totalBD,
        totalCount,
        avgMTBF,
        totalMTTR,
        totalRepairIds: bYearRepairIds,
        repairIdsByRoom: bYearRepairIdsByRoom
      };
    }
  }

  const sumMetrics: SumCalculatedMetrics = {
    monthly: sumMonthly,
    ytd: {
      productionTime: sumYtdPT,
      breakdownMin: sumYtdBD,
      breakdownCount: sumYtdN,
      mtbf: sumYtdAvgMTBF,
      mttr: sumYtdTotalMTTR,
      repairIds: sumMonthly.slice(0, activeMonthLimit + 1).flatMap(sm => sm.repairIds || [])
    },
    baseline: parsedBaseline
  };

  return {
    roomMetrics,
    machineMetrics,
    sumMetrics,
    unmappedRepairs
  };
}

/**
 * ส่งออกตาราง MTBF / MTTR ทั้งหมดเป็น Excel Workbook (.xlsx)
 */
export function exportMtbfMttrToExcel(params: {
  year: number;
  rooms: RoomConfig[];
  roomMetrics: RoomCalculatedMetrics[];
  sumMetrics: SumCalculatedMetrics;
  activeRoomId?: string | null;
}) {
  const { year, rooms, roomMetrics, sumMetrics, activeRoomId } = params;
  const wb = XLSX.utils.book_new();

  const yearShort = String(year).slice(-2);
  const monthHeaders = MONTH_NAMES_ENG.map(m => `${m}-${yearShort}`);

  // Sheet 1: SUM Overview
  const sumHeaders = ['หัวข้อ / รายการ', '2023', '2024', '2025', String(year), `YTD ${year}`, ...monthHeaders];
  const sumRows: (string | number)[][] = [];

  sumRows.push(['ตารางที่ 1: Breakdown (นาที)']);
  sumRows.push(sumHeaders);

  // แถวรวม Breakdown
  const b23 = sumMetrics.baseline[2023]?.totalBD ?? 0;
  const b24 = sumMetrics.baseline[2024]?.totalBD ?? 0;
  const b25 = sumMetrics.baseline[2025]?.totalBD ?? 0;
  const bYear = sumMetrics.ytd.breakdownMin; // 2026 เท่ากับ YTD 2026 ตามข้อ 5

  sumRows.push([
    'รวมทุกห้อง (Total)',
    b23,
    b24,
    b25,
    bYear,
    bYear,
    ...sumMetrics.monthly.map(m => (m.hasData ? m.breakdownMin : ''))
  ]);

  // แถวรายห้อง Breakdown
  rooms.forEach((rm, rIdx) => {
    const rmMetric = roomMetrics.find(r => r.roomId === rm.id);
    const r23 = sumMetrics.baseline[2023]?.breakdownMin[rIdx] ?? 0;
    const r24 = sumMetrics.baseline[2024]?.breakdownMin[rIdx] ?? 0;
    const r25 = sumMetrics.baseline[2025]?.breakdownMin[rIdx] ?? 0;
    const rYtd = rmMetric ? rmMetric.ytd.breakdownMin : 0;

    sumRows.push([
      rm.name,
      r23,
      r24,
      r25,
      rYtd,
      rYtd,
      ...(rmMetric ? rmMetric.monthly.map(m => (m.hasData ? m.breakdownMin : '')) : [])
    ]);
  });

  sumRows.push([]);
  sumRows.push(['ตารางที่ 2: จำนวนครั้ง Breakdown (ครั้ง)']);
  sumRows.push(sumHeaders);

  const c23 = sumMetrics.baseline[2023]?.totalCount ?? 0;
  const c24 = sumMetrics.baseline[2024]?.totalCount ?? 0;
  const c25 = sumMetrics.baseline[2025]?.totalCount ?? 0;
  const cYear = sumMetrics.ytd.breakdownCount;

  sumRows.push([
    'รวมทุกห้อง (Total)',
    c23,
    c24,
    c25,
    cYear,
    cYear,
    ...sumMetrics.monthly.map(m => (m.hasData ? m.breakdownCount : ''))
  ]);

  rooms.forEach((rm, rIdx) => {
    const rmMetric = roomMetrics.find(r => r.roomId === rm.id);
    const cr23 = sumMetrics.baseline[2023]?.count[rIdx] ?? 0;
    const cr24 = sumMetrics.baseline[2024]?.count[rIdx] ?? 0;
    const cr25 = sumMetrics.baseline[2025]?.count[rIdx] ?? 0;
    const crYtd = rmMetric ? rmMetric.ytd.breakdownCount : 0;

    sumRows.push([
      rm.name,
      cr23,
      cr24,
      cr25,
      crYtd,
      crYtd,
      ...(rmMetric ? rmMetric.monthly.map(m => (m.hasData ? m.breakdownCount : '')) : [])
    ]);
  });

  sumRows.push([]);
  sumRows.push(['ตารางที่ 3: MTBF สะสม (ชั่วโมง)']);
  sumRows.push(sumHeaders);

  const m23 = sumMetrics.baseline[2023]?.avgMTBF ?? 0;
  const m24 = sumMetrics.baseline[2024]?.avgMTBF ?? 0;
  const m25 = sumMetrics.baseline[2025]?.avgMTBF ?? 0;
  const mYear = sumMetrics.ytd.mtbf;

  sumRows.push([
    'ค่าเฉลี่ยรวม (Average)',
    m23,
    m24,
    m25,
    mYear,
    mYear,
    ...sumMetrics.monthly.map(m => (m.hasData && m.mtbf !== null ? m.mtbf : ''))
  ]);

  rooms.forEach((rm, rIdx) => {
    const rmMetric = roomMetrics.find(r => r.roomId === rm.id);
    const mr23 = sumMetrics.baseline[2023]?.mtbf[rIdx] ?? 0;
    const mr24 = sumMetrics.baseline[2024]?.mtbf[rIdx] ?? 0;
    const mr25 = sumMetrics.baseline[2025]?.mtbf[rIdx] ?? 0;
    const mrYtd = rmMetric ? rmMetric.ytd.mtbf : 0;

    sumRows.push([
      rm.name,
      mr23,
      mr24,
      mr25,
      mrYtd,
      mrYtd,
      ...(rmMetric ? rmMetric.monthly.map(m => (m.hasData && m.mtbf !== null ? m.mtbf : '')) : [])
    ]);
  });

  sumRows.push([]);
  sumRows.push(['ตารางที่ 4: MTTR รายเดือน (นาที)']);
  sumRows.push(sumHeaders);

  const tr23 = sumMetrics.baseline[2023]?.totalMTTR ?? 0;
  const tr24 = sumMetrics.baseline[2024]?.totalMTTR ?? 0;
  const tr25 = sumMetrics.baseline[2025]?.totalMTTR ?? 0;
  const trYear = sumMetrics.ytd.mttr;

  sumRows.push([
    'แถวรวม (ΣBD / ΣN)',
    tr23,
    tr24,
    tr25,
    trYear,
    trYear,
    ...sumMetrics.monthly.map(m => (m.hasData && m.mttr !== null ? m.mttr : ''))
  ]);

  rooms.forEach((rm, rIdx) => {
    const rmMetric = roomMetrics.find(r => r.roomId === rm.id);
    const trr23 = sumMetrics.baseline[2023]?.mttr[rIdx] ?? 0;
    const trr24 = sumMetrics.baseline[2024]?.mttr[rIdx] ?? 0;
    const trr25 = sumMetrics.baseline[2025]?.mttr[rIdx] ?? 0;
    const trrYtd = rmMetric ? rmMetric.ytd.mttr : 0;

    sumRows.push([
      rm.name,
      trr23,
      trr24,
      trr25,
      trrYtd,
      trrYtd,
      ...(rmMetric ? rmMetric.monthly.map(m => (m.hasData && m.mttr !== null ? m.mttr : '')) : [])
    ]);
  });

  const sumWs = XLSX.utils.aoa_to_sheet(sumRows);
  XLSX.utils.book_append_sheet(wb, sumWs, 'SUM_Overview');

  // Sheet 2: รายห้อง
  rooms.forEach(rm => {
    const rmMetric = roomMetrics.find(r => r.roomId === rm.id);
    if (!rmMetric) return;

    const roomRows: (string | number)[][] = [];
    const rHeaders = ['รายการ', ...monthHeaders, `YTD-${yearShort}`];

    roomRows.push([`ตารางคำนวณ MTBF MTTR: ${rm.name} (ปี ${year})`]);
    roomRows.push(rHeaders);

    roomRows.push([
      'Production Time (Hour)',
      ...rmMetric.monthly.map(m => m.productionTime),
      rmMetric.ytd.productionTime
    ]);
    roomRows.push([
      'Breakdown (min)',
      ...rmMetric.monthly.map(m => (m.hasData ? m.breakdownMin : '')),
      rmMetric.ytd.breakdownMin
    ]);
    roomRows.push([
      'จำนวนครั้ง Breakdown',
      ...rmMetric.monthly.map(m => (m.hasData ? m.breakdownCount : '')),
      rmMetric.ytd.breakdownCount
    ]);
    roomRows.push([
      'MTBF (hour)',
      ...rmMetric.monthly.map(m => (m.hasData && m.mtbf !== null ? m.mtbf : '')),
      rmMetric.ytd.mtbf
    ]);
    roomRows.push([
      'MTTR (min)',
      ...rmMetric.monthly.map(m => (m.hasData && m.mttr !== null ? m.mttr : '')),
      rmMetric.ytd.mttr
    ]);

    const rWs = XLSX.utils.aoa_to_sheet(roomRows);
    const safeSheetName = rm.name.slice(0, 28);
    XLSX.utils.book_append_sheet(wb, rWs, safeSheetName);
  });

  XLSX.writeFile(wb, `MTBF_MTTR_Dashboard_${year}.xlsx`);
}
