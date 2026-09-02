import { RepairLog, PMScheduleItem, OperationScheduleItem, SetupLog, Machine, PMPlan } from '../types';

/**
 * Send a notification to LINE Notify via our server-side proxy
 */
export async function sendLineNotification(message: string, token?: string): Promise<{ success: boolean; message?: string }> {
  try {
    const activeToken = token || getSavedToken();
    const isEnabled = isNotificationEnabled();

    // If explicit token isn't provided, and notifications aren't enabled or token is missing, skip silently
    if (!token && (!isEnabled || !activeToken)) {
      return { success: false, message: "LINE Notify ไม่ได้เปิดใช้งานหรือไม่มี Token ในระบบ" };
    }

    const response = await fetch("/api/line-notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, token: activeToken }),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      return { success: true };
    } else {
      return { success: false, message: data.message || "เกิดข้อผิดพลาดในการส่งข้อความแจ้งเตือน" };
    }
  } catch (error) {
    console.error("Error sending LINE notification:", error);
    return { success: false, message: (error as Error).message };
  }
}

// Local helper to read from localSettings if stored in localStorage
function getSavedToken(): string {
  try {
    const stored = localStorage.getItem('maint_settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.lineNotifyToken || "";
    }
  } catch (e) {
    console.error(e);
  }
  return "";
}

function isNotificationEnabled(): boolean {
  try {
    const stored = localStorage.getItem('maint_settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      return !!parsed.lineNotifyEnabled;
    }
  } catch (e) {
    console.error(e);
  }
  return false;
}

/**
 * Format and send a Repair Opened notification
 */
export async function notifyRepairOpened(repair: RepairLog, machineName: string) {
  const techs = repair.technicians && repair.technicians.length > 0 
    ? repair.technicians.join(', ') 
    : repair.technician;
    
  const message = `
⚠️ [แจ้งเหตุเครื่องจักรเสีย - EMERGENCY]
🛠️ สถานะ: กำลังซ่อม (Repairing)
🔴 เครื่องจักร: ${repair.machineId} (${machineName})
🔴 อาการเสีย: ${repair.symptoms}
👤 ช่างรับงาน: ${techs}
📅 วันที่แจ้ง: ${repair.date}
⏰ เวลาเสียจริง: ${repair.breakdownTime.split('T')[1] || repair.breakdownTime}
  `.trim();

  return sendLineNotification(message);
}

/**
 * Format and send a Repair Closed notification
 */
export async function notifyRepairClosed(repair: RepairLog, machineName: string, stdMttr?: number) {
  const techs = repair.technicians && repair.technicians.length > 0 
    ? repair.technicians.join(', ') 
    : repair.technician;

  const mttrText = stdMttr 
    ? `${repair.duration} นาที (Std.MTTR: ${stdMttr} นาที)` 
    : `${repair.duration} นาที`;

  const performanceEmoji = stdMttr && repair.duration > stdMttr * 1.2 ? "⚠️ ช้ากว่าเกณฑ์" : "✅ ตามเกณฑ์";

  const message = `
✅ [ปิดใบงานซ่อมบำรุงสำเร็จ]
🟢 เครื่องจักร: ${repair.machineId} (${machineName})
🟢 อาการเสีย: ${repair.symptoms}
🟢 มาตรการแก้ไข: ${repair.correctiveAction}
👤 ช่างผู้ปิดงาน: ${techs}
⏱️ เวลาที่ใช้ (MTTR): ${mttrText} ${performanceEmoji}
📅 วันที่ปิดงาน: ${repair.date}
  `.trim();

  return sendLineNotification(message);
}

/**
 * Format and send a PM Dispatched notification
 */
export async function notifyPMDispatched(pm: PMScheduleItem, machineName: string, planTitle: string) {
  const techs = pm.technicians && pm.technicians.length > 0 
    ? pm.technicians.join(', ') 
    : pm.technician;

  const message = `
📅 [ใบสั่งการบำรุงรักษาเชิงป้องกัน (PM)]
📋 แผนงาน: ${planTitle}
⚙️ เครื่องจักร: ${pm.machineId} (${machineName})
👤 ช่างที่รับมอบหมาย: ${techs}
⏱️ เกณฑ์เวลามาตรฐาน: ${pm.duration} นาที
📅 วันที่เริ่มดำเนินการ: ${pm.date}
🎯 สถานะ: ${pm.status}
  `.trim();

  return sendLineNotification(message);
}

/**
 * Format and send a Setup Log notification
 */
export async function notifySetupLogged(setup: SetupLog, machineName: string) {
  const techs = setup.technicians && setup.technicians.length > 0 
    ? setup.technicians.join(', ') 
    : 'ช่างบำรุงรักษา';

  const stepsSummary = setup.steps
    .map(s => `- ${s.stepName}: ${s.duration} นาที (${s.completed ? 'เสร็จ' : 'ไม่เสร็จ'})`)
    .join('\n');

  const message = `
⚙️ [บันทึกประวัติการตั้งเครื่อง (Setup Log)]
🔘 เครื่องจักร: ${setup.machineId} (${machineName})
🔘 ประเภทงาน: ${setup.type}
⏱️ เวลารวมทั้งหมด: ${setup.totalDuration} นาที
👤 รายชื่อทีมช่าง: ${techs}
📊 สรุปแต่ละขั้นตอน:
${stepsSummary}
  `.trim();

  return sendLineNotification(message);
}
