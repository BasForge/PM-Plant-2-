import { WorkOrder, WorkOrderReadinessCheck, WorkOrderPartRequirement } from '../types';

/**
 * คำนวณตรวจสอบ 4 เสาหลักความพร้อมของใบสั่งงาน (Readiness Gatekeeper Checklist)
 * 1. กำหนดวัน-เวลาเริ่ม (Scheduled Start Date & Time)
 * 2. มีประมาณการระยะเวลาการทำงาน (Estimated Duration)
 * 3. มีช่างผู้รับผิดชอบประจำกะ (Labor Assigned)
 * 4. อะไหล่สำรองในคลังพร้อมครบ (Spare Parts Available / Kitted)
 */
export function evaluateWorkOrderReadiness(
  wo: Partial<WorkOrder>,
  sparePartsStock?: Record<string, number>
): WorkOrderReadinessCheck {
  const timeScheduled = Boolean(wo.scheduledDate && wo.scheduledStartTime);
  const estimatedDurationValid = Boolean((wo.estimatedDurationMins || 0) > 0);
  const laborAssigned = Boolean(wo.assignedTechnicians && wo.assignedTechnicians.length > 0);
  
  let partsAvailable = true;
  const missingReasons: string[] = [];

  if (!timeScheduled) {
    missingReasons.push('ยังไม่ระบุวันหรือเวลาเริ่มงาน');
  }
  if (!estimatedDurationValid) {
    missingReasons.push('ยังไม่ระบุเวลาประเมินที่ต้องใช้ (นาที)');
  }
  if (!laborAssigned) {
    missingReasons.push('ยังไม่ได้มอบหมายช่างผู้รับผิดชอบ');
  }

  if (wo.requiresParts && wo.requiredParts && wo.requiredParts.length > 0) {
    for (const part of wo.requiredParts) {
      const currentStock = sparePartsStock && sparePartsStock[part.partId] !== undefined
        ? sparePartsStock[part.partId]
        : (part.quantityAvailable ?? 0);
      
      if (currentStock < part.quantityRequired) {
        partsAvailable = false;
        missingReasons.push(`อะไหล่ ${part.partName} ขาดสต็อก (ต้องการ ${part.quantityRequired}, มีในคลัง ${currentStock})`);
      }
    }
  }

  const gatePassed = timeScheduled && estimatedDurationValid && laborAssigned && partsAvailable;

  return {
    timeScheduled,
    estimatedDurationValid,
    laborAssigned,
    partsAvailable,
    gatePassed,
    missingReasons
  };
}

/**
 * โครงสร้างข้อมูลสรุปผลชี้วัด % Planned Work Ratio และความพร้อม CMMS
 */
export interface PlannedWorkMetrics {
  totalCount: number;
  plannedCount: number;
  unplannedCount: number;
  plannedRatioPercent: number; // % งานตามแผน
  unplannedRatioPercent: number; // % งานฉุกเฉิน
  targetPercent: number; // ค่าเป้าหมายมาตรฐาน (default 85%)
  isTargetAchieved: boolean;
  statusGrade: 'WORLD_CLASS' | 'GOOD' | 'WARNING' | 'CRITICAL';
  statusLabel: string;
  totalHours: number;
  plannedHours: number;
  unplannedHours: number;
  plannedHoursRatioPercent: number;
  readinessCounts: {
    draft: number;
    pendingSchedule: number;
    waitingParts: number;
    readyToRelease: number;
    released: number;
    completedPendingHandover: number;
    closed: number;
  };
}

/**
 * คำนวณ KPI สัดส่วน % Planned Work ตามมาตรฐาน World-Class TPM / SMRP (เป้าหมาย 80 - 90%)
 */
export function calculatePlannedWorkMetrics(
  workOrders: WorkOrder[],
  targetPercent = 85
): PlannedWorkMetrics {
  const totalCount = workOrders.length;
  const plannedWOs = workOrders.filter(w => w.workCategory === 'PLANNED');
  const unplannedWOs = workOrders.filter(w => w.workCategory === 'UNPLANNED');

  const plannedCount = plannedWOs.length;
  const unplannedCount = unplannedWOs.length;

  const plannedRatioPercent = totalCount > 0
    ? Number(((plannedCount / totalCount) * 100).toFixed(1))
    : 100;

  const unplannedRatioPercent = totalCount > 0
    ? Number(((unplannedCount / totalCount) * 100).toFixed(1))
    : 0;

  // คำนวณตามชั่วโมงการทำงาน (Man-Hours)
  const calcHours = (items: WorkOrder[]) => {
    return items.reduce((sum, w) => {
      const mins = w.actualDurationMins || w.estimatedDurationMins || 60;
      return sum + (mins / 60);
    }, 0);
  };

  const plannedHours = Number(calcHours(plannedWOs).toFixed(1));
  const unplannedHours = Number(calcHours(unplannedWOs).toFixed(1));
  const totalHours = Number((plannedHours + unplannedHours).toFixed(1));
  const plannedHoursRatioPercent = totalHours > 0
    ? Number(((plannedHours / totalHours) * 100).toFixed(1))
    : 100;

  // ประเมินเกรดมาตรฐาน World-Class TPM
  let statusGrade: PlannedWorkMetrics['statusGrade'] = 'GOOD';
  let statusLabel = 'ดี (ผ่านเกณฑ์มาตรฐาน TPM)';

  if (plannedRatioPercent >= 85) {
    statusGrade = 'WORLD_CLASS';
    statusLabel = 'ระดับยอดเยี่ยม (World-Class Maintenance ≥ 85%)';
  } else if (plannedRatioPercent >= 75) {
    statusGrade = 'GOOD';
    statusLabel = 'ระดับดี (ใกล้เคียงเป้าหมาย 80-90%)';
  } else if (plannedRatioPercent >= 60) {
    statusGrade = 'WARNING';
    statusLabel = 'เฝ้าระวัง (งานฉุกเฉินเบรกดาวน์เริ่มแทรกแซงแผนงาน)';
  } else {
    statusGrade = 'CRITICAL';
    statusLabel = 'วิกฤต (เน้นงานเชิงรับมากกว่างานบำรุงรักษาเชิงป้องกัน)';
  }

  const readinessCounts = {
    draft: workOrders.filter(w => w.status === 'DRAFT').length,
    pendingSchedule: workOrders.filter(w => w.status === 'PENDING_SCHEDULE').length,
    waitingParts: workOrders.filter(w => w.status === 'WAITING_PARTS').length,
    readyToRelease: workOrders.filter(w => w.status === 'READY_TO_RELEASE').length,
    released: workOrders.filter(w => w.status === 'RELEASED').length,
    completedPendingHandover: workOrders.filter(w => w.status === 'COMPLETED_PENDING_HANDOVER').length,
    closed: workOrders.filter(w => w.status === 'CLOSED').length,
  };

  return {
    totalCount,
    plannedCount,
    unplannedCount,
    plannedRatioPercent,
    unplannedRatioPercent,
    targetPercent,
    isTargetAchieved: plannedRatioPercent >= targetPercent,
    statusGrade,
    statusLabel,
    totalHours,
    plannedHours,
    unplannedHours,
    plannedHoursRatioPercent,
    readinessCounts
  };
}

/**
 * รูปแบบรหัสใบสั่งงานอัตโนมัติ: WO-YYYY-XXXX
 */
export function generateWorkOrderNo(existingWorkOrders: WorkOrder[], year = 2026): string {
  let maxNum = 0;
  const prefix = `WO-${year}-`;
  
  for (const wo of existingWorkOrders) {
    const id = wo.id || wo.workOrderNo || '';
    if (id.startsWith(prefix)) {
      const numPart = parseInt(id.replace(prefix, ''), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}
