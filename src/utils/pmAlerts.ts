import { PMScheduleItem, PMPlan, Machine } from '../types';

export const RESCHEDULE_REASONS = [
  '🏭 เครื่องจักรกำลังติดคิวผลิตเร่งด่วน / ฝ่ายผลิตยังไม่หยุดเครื่อง',
  '📦 รออะไหล่สำรองที่สั่งซื้อ / ของยังไม่เข้าคลัง',
  '🚨 กำลังพลช่างติดงานซ่อมฉุกเฉิน Break Down เครื่องจักรหลัก',
  '🛠 รอช่วงหยุดซ่อมบำรุงประจำสัปดาห์ (Weekly Planned Shutdown)',
  '⚡️ ปรับลำดับความสำคัญตามคำขอของหัวหน้างาน / ฝ่ายผลิต',
  '👥 ช่างผู้เชี่ยวชาญติดภารกิจ / ลากิจ-ลาป่วย',
  '⚠️ สภาพหน้างานไม่อำนวย / รอทำความสะอาดและตรวจสอบระบบสุขาภิบาล (CIP)',
  '📝 อื่น ๆ (ระบุสาเหตุเพิ่มเติม)'
];

/**
 * Returns today's date in YYYY-MM-DD format (Thailand UTC+7 or current local time)
 */
export function getTodayDateString(): string {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const thTime = new Date(utc + (3600000 * 7));
  const y = thTime.getFullYear();
  const m = String(thTime.getMonth() + 1).padStart(2, '0');
  const d = String(thTime.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Checks if a PM task is overdue (past scheduled date and not completed)
 */
export function isPMOverdue(job: PMScheduleItem, todayStr: string = getTodayDateString()): boolean {
  if (job.type !== 'PM') return false;
  if (job.status === 'เสร็จสิ้น') return false;
  return job.date < todayStr;
}

/**
 * Returns number of overdue days for a PM task (0 if not overdue)
 */
export function getPMOverdueDays(jobOrDate: PMScheduleItem | string, todayStr: string = getTodayDateString()): number {
  const dateStr = typeof jobOrDate === 'string' ? jobOrDate : jobOrDate.date;
  if (typeof jobOrDate !== 'string' && !isPMOverdue(jobOrDate, todayStr)) return 0;
  if (dateStr >= todayStr) return 0;
  const d1 = new Date(dateStr).getTime();
  const d2 = new Date(todayStr).getTime();
  const diffTime = d2 - d1;
  return Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
}

/**
 * Checks if a PM task was previously rescheduled
 */
export function isPMRescheduled(job: PMScheduleItem): boolean {
  if (job.type !== 'PM') return false;
  return Boolean(
    job.rescheduledFromDate || 
    (job.rescheduledCount && job.rescheduledCount > 0) || 
    (job.rescheduleHistory && job.rescheduleHistory.length > 0)
  );
}

/**
 * Summarizes overdue and rescheduled PM jobs
 */
export function getOverdueAndRescheduledSummary(
  schedules: any[], 
  todayStr: string = getTodayDateString()
) {
  const pmJobs = schedules.filter(s => s.type === 'PM') as PMScheduleItem[];
  
  const overdueJobs = pmJobs.filter(j => isPMOverdue(j, todayStr));
  const rescheduledJobs = pmJobs.filter(j => isPMRescheduled(j));
  const overduePendingJobs = overdueJobs.filter(j => j.status === 'รอดำเนินการ');
  const criticalOverdueJobs = overdueJobs.filter(j => getPMOverdueDays(j, todayStr) >= 7);

  return {
    pmJobs,
    overdueJobs,
    rescheduledJobs,
    overduePendingJobs,
    criticalOverdueJobs,
    totalOverdueCount: overdueJobs.length,
    totalRescheduledCount: rescheduledJobs.length,
    criticalCount: criticalOverdueJobs.length
  };
}

/**
 * Formats a message for LINE notification regarding overdue PM jobs
 */
export function formatOverduePMLineMessage(
  overdueJobs: PMScheduleItem[],
  machines: Machine[],
  pmPlans: PMPlan[],
  todayStr: string = getTodayDateString()
): string {
  let msg = `\n🚨 [แจ้งเตือนงาน PM เลยกำหนด - ต้องดำเนินการ/เลื่อนแผน]\n`;
  msg += `📅 วันที่ตรวจสอบ: ${todayStr}\n`;
  msg += `⚠️ ตรวจพบงาน PM ค้างดำเนินการ: ${overdueJobs.length} รายการ\n`;
  msg += `------------------------------------\n`;

  overdueJobs.slice(0, 5).forEach((job, idx) => {
    const m = machines.find(mach => mach.id === job.machineId);
    const p = pmPlans.find(plan => plan.id === job.pmPlanId);
    const overdueDays = getPMOverdueDays(job, todayStr);
    
    msg += `${idx + 1}. [${job.machineId}] ${p?.title || 'งาน PM'}\n`;
    msg += `   - วันที่ตามแผนเดิม: ${job.date} (เลยมาแล้ว ${overdueDays} วัน)\n`;
    msg += `   - ช่างผู้รับผิดชอบ: ${job.technician}\n`;
    msg += `   - สถานะ: ${job.status}\n`;
  });

  if (overdueJobs.length > 5) {
    msg += `... และอีก ${overdueJobs.length - 5} รายการในระบบ\n`;
  }

  msg += `------------------------------------\n`;
  msg += `👉 กรุณาเข้าสู่ระบบเพื่อลงบันทึกเสร็จงาน หรือขยับวันเลื่อนแผนนัดหมายใหม่`;
  return msg;
}
