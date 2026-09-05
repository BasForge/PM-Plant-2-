import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ScheduleItem, PMScheduleItem, OperationScheduleItem, 
  RepairLog, ImprovementProject, PMPlan, Machine 
} from '../types';
import { 
  ChevronLeft, ChevronRight, Calendar, Plus, UserPlus, 
  Play, Sparkles, Clock, AlertTriangle, CheckCircle2, UserCheck, HelpCircle,
  Trash2, UserX
} from 'lucide-react';

// Helper to get current Thailand Date in noon to avoid timezone/DST issues
const getNowInThailand = (): Date => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const thTime = new Date(utc + (3600000 * 7));
  return new Date(thTime.getFullYear(), thTime.getMonth(), thTime.getDate(), 12, 0, 0);
};

const formatHyphenDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Get start of the week (Monday)
const getMondayOfDate = (d: Date): Date => {
  const copy = new Date(d.getTime());
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday being 0
  return new Date(copy.setDate(diff));
};

const getWeekDays = (monday: Date): Date[] => {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const nextDay = new Date(monday.getTime());
    nextDay.setDate(monday.getDate() + i);
    days.push(nextDay);
  }
  return days;
};

export const SchedulePage: React.FC = () => {
  const { 
    schedules, setSchedules, 
    technicians, pmPlans, machines, 
    repairs, setRepairs,
    improvements, setImprovements,
    setupLogs, setSetupLogs,
    leaves, setLeaves,
    settings 
  } = useApp();

  // Navigation and date states (defaults to today and current week)
  const [currentDate, setCurrentDate] = useState<Date>(getNowInThailand);
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly' | 'leave_stats'>('weekly');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = getNowInThailand();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [monthlySubTab, setMonthlySubTab] = useState<'calendar' | 'hours_summary'>('calendar');
  const [quickMngTask, setQuickMngTask] = useState<PMScheduleItem | null>(null);
  const [quickMngOp, setQuickMngOp] = useState<OperationScheduleItem | null>(null);
  const [isConfirmingDeleteOp, setIsConfirmingDeleteOp] = useState(false);

  // Quick PM management states (controlled components sync)
  const [qmTech, setQmTech] = useState<string>('');
  const [qmCoTechs, setQmCoTechs] = useState<string[]>([]);
  const [qmDate, setQmDate] = useState<string>('');
  const [qmDuration, setQmDuration] = useState<number>(60);
  const [qmActualDuration, setQmActualDuration] = useState<number>(60);
  const [qmOvertimeReason, setQmOvertimeReason] = useState<string>('');
  const [qmStatus, setQmStatus] = useState<'รอดำเนินการ' | 'กำลังทำ' | 'เสร็จสิ้น'>('รอดำเนินการ');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Common delay reason presets for PM operations
  const PM_OVERTIME_REASON_PRESETS = [
    'พบชิ้นส่วนสึกหรอผิดปกติ ต้องซ่อมแซม/ปรับแต่งหน้างานเพิ่มเติม',
    'น็อต/สลัก/เกลียวยึดแน่นสนิมเกาะ ถอด-ประกอบยากกว่าปกติ',
    'รอฝ่ายผลิตส่งมอบเครื่องจักร / เคลียร์พื้นที่หน้างานล่าช้า',
    'ต้องปรับตั้งค่าละเอียด (Calibration & Parameter Tuning) ซ้ำ',
    'รอเบิกอะไหล่เสริม หรือค้นหาเครื่องมือวัด/เครื่องมือพิเศษ',
    'ขั้นตอนทำความสะอาดคราบฝังแน่นและกำจัดเศษสะสมใช้เวลานาน',
    'ทีมช่างติดงานซ่อมฉุกเฉิน Break Down แทรกระหว่างทำ PM',
    'พบปัญหาระบบไฟฟ้า/เซนเซอร์ ต้องตรวจเช็ค Wiring ซ้ำ'
  ];

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (quickMngTask) {
      const mainTech = quickMngTask.technician || 'ช่าง 1';
      setQmTech(mainTech);
      
      const allTechs = quickMngTask.technicians || [mainTech];
      const others = allTechs.filter(t => t !== mainTech);
      setQmCoTechs(others);

      setQmDate(quickMngTask.date);
      setQmDuration(quickMngTask.duration);
      setQmActualDuration(quickMngTask.actualDuration ?? quickMngTask.duration);
      setQmOvertimeReason(quickMngTask.overtimeReason || '');
      setQmStatus(quickMngTask.status);
      setIsConfirmingDelete(false); // Reset confirmation state
    }
  }, [quickMngTask]);

  // Target date/tech for modal assignment
  const [selectedCell, setSelectedCell] = useState<{ dateStr: string; technician: string } | null>(null);
  const [modalTechnicians, setModalTechnicians] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'PM' | 'Operation' | 'Repair' | 'Improvement' | 'Leave'>('PM');

  // FORM STATES: 🔵 PM Task
  const [pmFormMachine, setPmFormMachine] = useState('');
  const [pmFormPlan, setPmFormPlan] = useState('');
  const [pmFormStatus, setPmFormStatus] = useState<'รอดำเนินการ' | 'กำลังทำ' | 'เสร็จสิ้น'>('รอดำเนินการ');

  // FORM STATES: 🟡 Operation Task
  const [opFormLine, setOpFormLine] = useState('');
  const [opFormStart, setOpFormStart] = useState('08:00');
  const [opFormEnd, setOpFormEnd] = useState('16:00');
  const [opFormRecur, setOpFormRecur] = useState(false);
  const [opFormRecurDays, setOpFormRecurDays] = useState<number[]>([1, 2, 3, 4, 5]);

  // FORM STATES: 🔴 Emergency Repair Task
  const [repFormMachine, setRepFormMachine] = useState('');
  const [repFormBreakdown, setRepFormBreakdown] = useState('09:00');
  const [repFormDone, setRepFormDone] = useState('11:00');
  const [repFormSymptoms, setRepFormSymptoms] = useState('');
  const [repFormCorrection, setRepFormCorrection] = useState('');
  const [repFormWhy1, setRepFormWhy1] = useState('');
  const [repFormWhy2, setRepFormWhy2] = useState('');
  const [repFormWhy3, setRepFormWhy3] = useState('');
  const [repFormWhy4, setRepFormWhy4] = useState('');
  const [repFormWhy5, setRepFormWhy5] = useState('');

  // FORM STATES: 🟣 Improvement Task
  const [impFormTitle, setImpFormTitle] = useState('');
  const [impFormDescription, setImpFormDescription] = useState('');
  const [impFormMachine, setImpFormMachine] = useState('');
  const [impFormPlannedEnd, setImpFormPlannedEnd] = useState('2569-06-15');
  const [impFormHours, setImpFormHours] = useState(2);

  // FORM STATES: 🛌 Leave (on cell click)
  const [leaveFormType, setLeaveFormType] = useState<'ลากิจ' | 'ลาป่วย' | 'ลาพักร้อน' | 'วันหยุดประจำสัปดาห์' | 'ลาอื่น ๆ'>('ลากิจ');
  const [leaveFormNote, setLeaveFormNote] = useState('');

  // FORM STATES: 🛌 Leave Stats Tab direct input
  const [quickLeaveTech, setQuickLeaveTech] = useState(technicians[0] || 'ช่าง 1');
  const [quickLeaveDate, setQuickLeaveDate] = useState(() => formatHyphenDate(getNowInThailand()));
  const [quickLeaveType, setQuickLeaveType] = useState<'ลากิจ' | 'ลาป่วย' | 'ลาพักร้อน' | 'วันหยุดประจำสัปดาห์' | 'ลาอื่น ๆ'>('ลากิจ');
  const [quickLeaveNote, setQuickLeaveNote] = useState('');

  const weekMonday = getMondayOfDate(currentDate);
  const weekDays = getWeekDays(weekMonday);

  const prevWeek = () => {
    const newD = new Date(currentDate.getTime());
    newD.setDate(currentDate.getDate() - 7);
    setCurrentDate(newD);
  };

  const nextWeek = () => {
    const newD = new Date(currentDate.getTime());
    newD.setDate(currentDate.getDate() + 7);
    setCurrentDate(newD);
  };

  const thDays = ["จันทร์", "อังคาร", "พุธ", "พฤหัสฯ", "ศุกร์", "เสาร์", "อาทิตย์"];
  const thMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  const thShortMonths = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];

  const getThaiDateLabel = (d: Date): string => {
    return `${d.getDate()} ${thMonths[d.getMonth()]} ${d.getFullYear() + 543}`;
  };

  const isToday = (d: Date): boolean => {
    const today = getNowInThailand();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  };

  // Helper inside loop: Extract tasks details per tech per day
  const getTasksForTechOnDay = (tech: string, dateStr: string) => {
    const dayDate = new Date(dateStr);
    const dayOfWeek = dayDate.getDay(); // 0 is Sun, 1 is Mon, etc.

    // 1. PM
    const pmList = schedules.filter(s => {
      const isMyPM = s.technicians ? s.technicians.includes(tech) : s.technician === tech;
      return s.type === 'PM' && isMyPM && s.date === dateStr;
    }) as PMScheduleItem[];

    // 2. Operations (including weekly recuring)
    const opList = (schedules.filter(s => {
      const isMyOp = s.technicians ? s.technicians.includes(tech) : s.technician === tech;
      if (s.type !== 'Operation' || !isMyOp) return false;
      const op = s as OperationScheduleItem;
      if (op.date === dateStr) return true;
      if (op.isWeeklyRecurring && op.recurringDays.includes(dayOfWeek)) {
        // Only if scheduled date of creation is <= this date
        return op.date <= dateStr;
      }
      return false;
    }) as OperationScheduleItem[]);

    // 3. Repairs (from maint_repairs)
    const repairList = repairs.filter(r => (r.technicians ? r.technicians.includes(tech) : r.technician === tech) && r.date === dateStr);

    // 4. Improvements (from maint_improvements worklogs)
    const activeImprovements: { projId: string; title: string; duration: number }[] = [];
    improvements.forEach(proj => {
      const isMyProj = proj.technicians ? proj.technicians.includes(tech) : proj.technician === tech;
      proj.workLogs.forEach(wl => {
        if (wl.date === dateStr && isMyProj) {
          activeImprovements.push({
            projId: proj.id,
            title: proj.title,
            duration: wl.hours * 60
          });
        }
      });
    });

    // 5. Setup & Adjustments
    const setupList = setupLogs ? setupLogs.filter(log => log.technicians.includes(tech) && log.date === dateStr) : [];

    return { pmList, opList, repairList, activeImprovements, setupList };
  };

  // Workload calculations
  const calculateWorkload = (tech: string, dateStr: string) => {
    const { pmList, opList, repairList, activeImprovements, setupList } = getTasksForTechOnDay(tech, dateStr);

    const pmMin = pmList.reduce((sum, item) => sum + item.duration, 0);
    const opMin = opList.reduce((sum, item) => sum + item.duration, 0);
    const repairMin = repairList.reduce((sum, item) => sum + item.duration, 0);
    const impMin = activeImprovements.reduce((sum, item) => sum + item.duration, 0);
    const setupMin = setupList ? setupList.reduce((sum, item) => sum + item.totalDuration, 0) : 0;

    const totalMin = pmMin + opMin + repairMin + impMin + setupMin;
    const activeLeave = leaves?.find(l => l.technician === tech && l.date === dateStr);
    const capacity = activeLeave ? 0 : settings.workingHoursPerDay * 60; // default 480
    const utilization = capacity > 0 ? (totalMin / capacity) * 100 : (activeLeave ? 0 : 0);

    let barColor = 'bg-emerald-500';
    if (activeLeave) barColor = 'bg-slate-600';
    else if (utilization >= 80 && utilization <= 100) barColor = 'bg-amber-500';
    else if (utilization > 100) barColor = 'bg-rose-500';

    return { totalMin, capacity, utilization, barColor, breakdown: { pmMin, opMin, repairMin, impMin, setupMin }, activeLeave };
  };

  // Open modal for day-cell
  const handleCellClick = (tech: string, date: Date) => {
    const dateStr = formatHyphenDate(date);
    setSelectedCell({ dateStr, technician: tech });
    setModalTechnicians([]);
    
    // Auto populate defaults
    setPmFormMachine(machines[0]?.id || '');
    setPmFormStatus('รอดำเนินการ');
    setOpFormLine('ไลน์ผลิตหลัก A');
    setRepFormMachine(machines[0]?.id || '');
    setRepFormWhy1(''); setRepFormWhy2(''); setRepFormWhy3(''); setRepFormWhy4(''); setRepFormWhy5('');
    setRepFormSymptoms(''); setRepFormCorrection('');
    setImpFormTitle(''); setImpFormDescription(''); setImpFormMachine(machines[0]?.id || '');

    // Reset plans based on machine
    const firstMachinePlans = pmPlans.filter(p => p.machineId === (machines[0]?.id || ''));
    setPmFormPlan(firstMachinePlans[0]?.id || '');
  };

  // Dynamic selector for PM plans inside PM tab modal
  const handleMachineChangeInForm = (mId: string) => {
    setPmFormMachine(mId);
    const filtered = pmPlans.filter(p => p.machineId === mId);
    setPmFormPlan(filtered[0]?.id || '');
  };

  const handleSaveAssignedTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCell) return;

    const { dateStr, technician } = selectedCell;
    const allAssignedTechs = [technician, ...modalTechnicians];

    if (activeTab === 'PM') {
      if (!pmFormPlan) {
        alert("กรุณาเลือกแผนบำรุงรักษา PM");
        return;
      }
      const plan = pmPlans.find(p => p.id === pmFormPlan);
      if (!plan) return;

      const newPM: PMScheduleItem = {
        id: `sched-${Date.now()}`,
        type: 'PM',
        technician,
        technicians: allAssignedTechs,
        date: dateStr,
        machineId: pmFormMachine,
        pmPlanId: pmFormPlan,
        status: pmFormStatus,
        duration: plan.ttm
      };

      setSchedules(prev => [...prev, newPM]);
    } 
    else if (activeTab === 'Operation') {
      if (!opFormLine.trim()) {
        alert("กรุณาระบุไลน์ผลิต");
        return;
      }
      
      const startParts = opFormStart.split(':').map(Number);
      const endParts = opFormEnd.split(':').map(Number);
      const diffMins = (endParts[0] * 60 + endParts[1]) - (startParts[0] * 60 + startParts[1]);

      if (diffMins <= 0) {
        alert("เวลาสิ้นสุดต้องหลังจากเวลาเริ่มต้น");
        return;
      }

      const newOp: OperationScheduleItem = {
        id: `sched-${Date.now()}`,
        type: 'Operation',
        technician,
        technicians: allAssignedTechs,
        date: dateStr,
        line: opFormLine,
        startTime: opFormStart,
        endTime: opFormEnd,
        isWeeklyRecurring: opFormRecur,
        recurringDays: opFormRecurDays,
        duration: diffMins
      };

      setSchedules(prev => [...prev, newOp]);
    } 
    else if (activeTab === 'Repair') {
      if (!repFormMachine) {
        alert("กรุณาเลือกเครื่องจักร");
        return;
      }
      
      const bParts = repFormBreakdown.split(':').map(Number);
      const dParts = repFormDone.split(':').map(Number);
      const diffRep = (dParts[0] * 60 + dParts[1]) - (bParts[0] * 60 + bParts[1]);

      if (diffRep <= 0) {
        alert("เวลาซ่อมเสร็จต้องหลังจากเวลาส้มชำรุด");
        return;
      }

      const newRep: RepairLog = {
        id: `rep-${Date.now()}`,
        type: 'Repair',
        technician,
        technicians: allAssignedTechs,
        date: dateStr,
        machineId: repFormMachine,
        breakdownTime: `${dateStr}T${repFormBreakdown}`,
        repairDoneTime: `${dateStr}T${repFormDone}`,
        symptoms: repFormSymptoms.trim() || 'สายพานตึงผิดรูป',
        why1: repFormWhy1.trim(),
        why2: repFormWhy2.trim(),
        why3: repFormWhy3.trim(),
        why4: repFormWhy4.trim(),
        why5: repFormWhy5.trim(),
        correctiveAction: repFormCorrection.trim() || 'ปรับแต่งความตึงสายพานและตั้งบ่าลูกกลิ้งใหม่',
        duration: diffRep
      };

      setRepairs(prev => [newRep, ...prev]);
    } 
    else if (activeTab === 'Improvement') {
      if (!impFormTitle.trim()) {
        alert("กรุณาระบุชื่อโครงการปรับปรุง");
        return;
      }

      const newImp: ImprovementProject = {
        id: `imp-${Date.now()}`,
        type: 'Improvement',
        title: impFormTitle.trim(),
        description: impFormDescription.trim(),
        machineId: impFormMachine || undefined,
        startDate: dateStr,
        plannedEndDate: impFormPlannedEnd,
        workLogs: [
          { id: `wl-${Date.now()}`, date: dateStr, hours: impFormHours, note: 'เริ่มต้นโครงการปรับปรุง Kaizen' }
        ],
        status: 'กำลังดำเนินการ',
        technician,
        technicians: allAssignedTechs
      };

      setImprovements(prev => [...prev, newImp]);
    }
    else if (activeTab === 'Leave') {
      // Create new technician leave
      const newLeave = {
        id: `leave-${Date.now()}`,
        technician,
        date: dateStr,
        type: leaveFormType,
        note: leaveFormNote.trim() || undefined
      };
      setLeaves(prev => [...prev, newLeave]);
      setLeaveFormNote('');
    }

    setSelectedCell(null);
  };

  const handleDeleteTask = (taskId: string, type: 'Schedule' | 'Repair') => {
    if (window.confirm('คุณยืนยันที่จะลบงานช่างนี้ออกจากตารางหรือไม่?')) {
      if (type === 'Schedule') {
        setSchedules(prev => prev.filter(s => s.id !== taskId));
      } else {
        setRepairs(prev => prev.filter(r => r.id !== taskId));
      }
    }
  };

  // AUTO ASSIGN PM ALGORITHM (Round-Robin)
  const handleAutoAssignPM = () => {
    if (pmPlans.length === 0) {
      alert("ไม่มีแผนงาน PM ในระบบที่จะจัดการกระจาย กรุณาคลิกสร้างแผน PM บนเพจอื่นเป็นอันดับแรก");
      return;
    }

    if (window.confirm('คุณต้องการใช้ AI หรือระบบวิเคราะห์คิวเพื่อจัดสรรงาน PM สัปดาห์นี้ไปยังช่าง 20 คน อย่างคุ้มค่าที่สุด โดยเฉลี่ยไม่ให้เกินชั่วโมงทำงานหรือไม่?')) {
      // Find all due PM plans. We can schedule one PM instance per machine for each PM plan in the current week.
      const newSchedulesToAppend: ScheduleItem[] = [];
      let techIndex = 0;
      let dayIndex = 1; // Start Mon, Tue, etc.

      // Map to track daily loaded minutes per technician
      // key: `${technician}_${dateStr}`
      const loadTracker: Record<string, number> = {};

      // Initialize load trackers with existing tasks load
      technicians.forEach(t => {
        weekDays.forEach(day => {
          const dateStr = formatHyphenDate(day);
          const { totalMin } = calculateWorkload(t, dateStr);
          loadTracker[`${t}_${dateStr}`] = totalMin;
        });
      });

      // Distribute pm plans
      pmPlans.forEach(plan => {
        // Try to place this plan for the current week Mon-Sun
        let assigned = false;
        let attempts = 0;
        const maxAttempts = 140; // Avoid infinite loops

        while (!assigned && attempts < maxAttempts) {
          const targetTech = technicians[techIndex];
          const targetDay = weekDays[dayIndex % 7];
          const dateStr = formatHyphenDate(targetDay);
          const key = `${targetTech}_${dateStr}`;

          const currentLoad = loadTracker[key] || 0;
          const limit = settings.workingHoursPerDay * 60; // 480 mins

          // Check if adding this PM plan exceeds 100% capacity limit
          if (currentLoad + plan.ttm <= limit) {
            const newPM: PMScheduleItem = {
              id: `sched-auto-${Date.now()}-${attempts}-${Math.random()}`,
              type: 'PM',
              technician: targetTech,
              date: dateStr,
              machineId: plan.machineId,
              pmPlanId: plan.id,
              status: 'รอดำเนินการ',
              duration: plan.ttm
            };
            newSchedulesToAppend.push(newPM);
            loadTracker[key] = currentLoad + plan.ttm;
            assigned = true;
          }

          // Cycle to next technician and shift days
          techIndex = (techIndex + 1) % technicians.length;
          dayIndex += 1;
          attempts++;
        }
      });

      if (newSchedulesToAppend.length > 0) {
        setSchedules(prev => [...prev, ...newSchedulesToAppend]);
        alert(`จัดสรรงานสำเร็จ! ระบบได้กระจายงาน PM เชิงรุกจำนวน ${newSchedulesToAppend.length} รายการลงตารางงานของช่วงสัปดาห์นี้อย่างมีประสิทธิภาพ`);
      } else {
        alert("ไม่สามารถเพิ่มงาน PM ได้ชั่วคราวเนื่องจากช่วงสัปดาห์ช่างมีตารางงานควบคุมเครื่องจักร 100% หรือล้นพิกัดทั้งหมดแล้ว");
      }
    }
  };

  const getWeekTotalWorkloadMins = (tech: string) => {
    let sum = 0;
    weekDays.forEach(day => {
      const { totalMin } = calculateWorkload(tech, formatHyphenDate(day));
      sum += totalMin;
    });
    return sum;
  };

  const daysThisMonth = 30; // Mock average days of month

  return (
    <div className="space-y-6 relative" id="schedule-page-root">
      
      {/* Toast Notification Banner */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg py-3 px-4 shadow-2xl animate-in slide-in-from-bottom duration-200 ${
          toast.type === 'success' ? 'border-l-4 border-l-emerald-500' :
          toast.type === 'error' ? 'border-l-4 border-l-rose-500' : 'border-l-4 border-l-cyan-500'
        }`}>
          <span className="text-sm">
            {toast.type === 'success' ? '🟢' : toast.type === 'error' ? '🔴' : '🔵'}
          </span>
          <p className="text-xs font-bold leading-normal">{toast.text}</p>
          <button 
            type="button"
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-100 text-[10px] ml-2 leading-none p-1 bg-slate-900 border border-slate-750 rounded"
          >
            ✕
          </button>
        </div>
      )}
      
      {/* Upper Navigation & Trigger */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-cyan-400 tracking-tight flex items-center gap-2">
            📅 ตารางงานบำรุงรักษาประจำเครื่อง
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            มาสเตอร์แพลนเนอร์งานช่างซ่อมบำรุงในอุตสาหกรรม โดยมีข้อมูลครอบคลุมทั้ง 4 ประเภทงานอย่างลงตัว
          </p>
        </div>

        {/* Auto PM assignment & details */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            id="btn-auto-assign-pm"
            onClick={handleAutoAssignPM}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-bold px-4 py-2.5 rounded-lg transition-all shadow-md focus:ring-2 focus:ring-amber-400"
          >
            <Sparkles size={16} />
            Auto-assign PM
          </button>
          
          <div id="schedule-view-mode-tabs" className="flex bg-slate-900 border border-slate-700/80 rounded-lg p-1.5 shrink-0 gap-1">
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                viewMode === 'weekly' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              รายสัปดาห์
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                viewMode === 'monthly' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              สรุปรายเดือน
            </button>
            <button
              onClick={() => setViewMode('leave_stats')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                viewMode === 'leave_stats' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🛌 สถิติหยุด/ลา
            </button>
          </div>
        </div>
      </div>

      {(() => {
        const todayRef = getNowInThailand();
        const todayStr = formatHyphenDate(todayRef);

        const threeDaysAhead = new Date(todayRef.getTime());
        threeDaysAhead.setDate(todayRef.getDate() + 3);
        const threeDaysAheadStr = formatHyphenDate(threeDaysAhead);

        // PM Overdue (due before today with status not completed)
        const overduePmSchedules = schedules.filter(s => {
          return s.type === 'PM' && s.date < todayStr && s.status !== 'เสร็จสิ้น';
        }) as PMScheduleItem[];

        // PM Upcoming (due from today to 3 days ahead with status not completed)
        const upcomingPmSchedules = schedules.filter(s => {
          return s.type === 'PM' && s.date >= todayStr && s.date <= threeDaysAheadStr && s.status !== 'เสร็จสิ้น';
        }) as PMScheduleItem[];

        // Predictive Frequency Violations (past frequency limit relative to last completed)
        const predictivePmAlerts = (() => {
          const alertsList: {
            machineId: string;
            machineName: string;
            planTitle: string;
            frequency: string;
            lastDoneDate: string | null;
            daysOver: number;
            riskLevel: 'CRITICAL' | 'WARNING';
          }[] = [];

          machines.forEach(mach => {
            const linkedPlans = pmPlans.filter(p => p.machineId === mach.id);
            linkedPlans.forEach(plan => {
              // Find latest completed schedule for this plan
              const completedSchedulesForPlan = schedules
                .filter(s => s.type === 'PM' && s.pmPlanId === plan.id && s.status === 'เสร็จสิ้น')
                .sort((a, b) => b.date.localeCompare(a.date));
                
              let limitDays = 7;
              if (plan.frequency === 'รายวัน') limitDays = 1;
              else if (plan.frequency === 'รายสัปดาห์') limitDays = 7;
              else if (plan.frequency === 'รายเดือน') limitDays = 30;
              else if (plan.frequency === 'รายปี') limitDays = 365;

              if (completedSchedulesForPlan.length > 0) {
                const latestDateStr = completedSchedulesForPlan[0].date;
                const latestDateObj = new Date(latestDateStr);
                const referenceTodayObj = todayRef;
                const diffTime = referenceTodayObj.getTime() - latestDateObj.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays > limitDays) {
                  alertsList.push({
                    machineId: mach.id,
                    machineName: mach.name,
                    planTitle: plan.title,
                    frequency: plan.frequency,
                    lastDoneDate: latestDateStr,
                    daysOver: diffDays - limitDays,
                    riskLevel: (diffDays - limitDays > 10) ? 'CRITICAL' : 'WARNING'
                  });
                }
              } else {
                // Never completed. Generate a realistic mock warning for default plans to educate
                let assumedDays = 0;
                let lastDate = "";
                if (plan.id === 'plan-pm-01') { // RIM01 weekly
                  assumedDays = 11;
                  const dPast = new Date(todayRef.getTime());
                  dPast.setDate(todayRef.getDate() - 11);
                  lastDate = formatHyphenDate(dPast);
                } else if (plan.id === 'plan-pm-02') { // VAC01 monthly
                  assumedDays = 45;
                  const dPast = new Date(todayRef.getTime());
                  dPast.setDate(todayRef.getDate() - 45);
                  lastDate = formatHyphenDate(dPast);
                } else if (plan.id === 'plan-pm-03') { // FFS01 weekly
                  assumedDays = 9;
                  const dPast = new Date(todayRef.getTime());
                  dPast.setDate(todayRef.getDate() - 9);
                  lastDate = formatHyphenDate(dPast);
                }

                if (assumedDays > limitDays) {
                  alertsList.push({
                    machineId: mach.id,
                    machineName: mach.name,
                    planTitle: plan.title,
                    frequency: plan.frequency,
                    lastDoneDate: lastDate || null,
                    daysOver: assumedDays - limitDays,
                    riskLevel: (assumedDays - limitDays > 10) ? 'CRITICAL' : 'WARNING'
                  });
                }
              }
            });
          });

          return alertsList;
        })();

        const totalAlertsCount = overduePmSchedules.length + upcomingPmSchedules.length + predictivePmAlerts.length;

        return (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4.5 space-y-4" id="pm-early-warning-control-board">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-gradient-to-br from-amber-500/15 to-red-500/15 text-amber-400 rounded-lg border border-amber-500/20">
                  <AlertTriangle size={18} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                    🔔 ศูนย์ตรวจเช็คสภาวะกระชั้นชิดเครื่องจักร (PM Safety Monitoring & Alert Center)
                  </h3>
                  <p className="text-[10px] text-slate-450 mt-1 leading-none font-medium">
                    วิเคราะห์เวลาบำรุงล่วงหน้าและคาดการณ์ความถี่เสีย เพื่อเปลี่ยนอะไหล่ก่อนชำรุดเสียหายหนักคาไลน์
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/10">
                  REF DATE: {todayStr}
                </span>
                <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/10 animate-pulse">
                  ⚠️ มี {totalAlertsCount} รายการเฝ้าระวัง
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Box 1: Overdue PM tasks */}
              <div id="pm-alert-overdue-box" className="bg-slate-950/40 border border-red-500/20 rounded-xl p-4 flex flex-col justify-between min-h-[180px]">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                      🚨 เกินกำหนดแผนหลัก (Overdue PM)
                    </span>
                    <span className="font-mono text-xs font-bold text-red-400">{overduePmSchedules.length} งานค้าง</span>
                  </div>

                  {overduePmSchedules.length === 0 ? (
                    <div className="text-[10px] text-slate-500 italic py-6 text-center">
                      ✅ ไม่มีรายการ PM ตกหล่นกะผลิต
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                      {overduePmSchedules.map(pm => (
                        <div key={pm.id} className="bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-lg p-2 flex justify-between items-center transition">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-200">{pm.machineId}</span>
                              <span className="text-[9px] bg-red-500/15 text-red-400 px-1.5 py-0.2 rounded font-mono font-bold">{pm.date}</span>
                            </div>
                            <p className="text-[9px] text-slate-400 truncate max-w-[150px] mt-0.5">
                              {pmPlans.find(plan => plan.id === pm.pmPlanId)?.title || "แผนบำรุงรักษา"}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setSchedules(prev => prev.map(s => s.id === pm.id ? { ...s, date: todayStr } : s));
                              alert(`Rescheduled: ปรับคิวเลื่อนงาน PM เครื่อง ${pm.machineId} มาปฏิบัติการหลักในวันนี้เรียบร้อย!`);
                            }}
                            className="text-[9.5px] font-bold bg-red-400 hover:bg-red-350 text-slate-950 px-2 py-1 rounded transition"
                          >
                            เลื่อนมาวันนี้
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Box 2: Pre-alerts for upcoming maintenance within 3 days */}
              <div id="pm-alert-pre-box" className="bg-slate-950/40 border border-amber-500/15 rounded-xl p-4 flex flex-col justify-between min-h-[180px]">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      ⏱️ แผนสะกิดเตือนล่วงหน้า (PM 1-3 Days Ahead)
                    </span>
                    <span className="font-mono text-xs font-bold text-amber-400">{upcomingPmSchedules.length} จ่อคิว</span>
                  </div>

                  {upcomingPmSchedules.length === 0 ? (
                    <div className="text-[10px] text-slate-500 italic py-6 text-center">
                      ☕ ไม่มีงาน PM เร่งด่วนจัดกระบวน 3 วันนี้
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                      {upcomingPmSchedules.map(pm => (
                        <div key={pm.id} className="bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 rounded-lg p-2 flex justify-between items-center transition">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-200">{pm.machineId}</span>
                              <span className="text-[9px] bg-amber-500/15 text-amber-400 px-1.5 py-0.2 rounded font-mono">{pm.date}</span>
                            </div>
                            <p className="text-[9px] text-slate-400 truncate max-w-[150px] mt-0.5">
                              {pmPlans.find(plan => plan.id === pm.pmPlanId)?.title || "แผนบำรุงรักษา"}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setSchedules(prev => prev.map(s => s.id === pm.id ? { ...s, status: 'กำลังทำ' } : s));
                              alert(`Started: ได้ปรับสถานะแผนของเครื่อง ${pm.machineId} เป็น "กำลังทำ" เข้าดำเนินการทันที!`);
                            }}
                            className="text-[9.5px] font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 px-2.5 py-1 rounded transition"
                          >
                            เริ่มดำเนินงาน
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Box 3: Predictive analysis and wear warning */}
              <div id="pm-alert-predictive-box" className="bg-slate-950/40 border border-purple-500/20 rounded-xl p-4 flex flex-col justify-between min-h-[180px]">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={13} />
                      ⚙️ คาดการณ์ความความเสียหาย (Predictive Risk Alert)
                    </span>
                    <span className="font-mono text-xs font-bold text-purple-400">{predictivePmAlerts.length} เครื่องเสี่ยง</span>
                  </div>

                  {predictivePmAlerts.length === 0 ? (
                    <div className="text-[10px] text-slate-500 italic py-6 text-center">
                      ✅ ทุกเครื่องจักรบำรุงสอดคล้องตามมาตรฐานแผนดีเยี่ยม
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                      {predictivePmAlerts.map((alertItem, idx) => (
                        <div key={idx} className="bg-purple-550/5 hover:bg-purple-500/10 border border-purple-500/10 rounded-lg p-2.5 transition flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <span className="text-[10.5px] font-bold text-slate-100">{alertItem.machineId} ({alertItem.machineName})</span>
                            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300 animate-pulse">
                              {alertItem.frequency}
                            </span>
                          </div>
                          <p className="text-[9px] text-red-400 font-medium leading-normal">
                            ⚠️ เลยคาบตรวจเช็ค {alertItem.daysOver} วัน! ประวัติล่าสุด: {alertItem.lastDoneDate || "ไม่มีบันทึก"} (เสี่ยงชำรุดเสียหายกระชั้นชิด)
                          </p>
                          <button
                            onClick={() => {
                              const newPM: PMScheduleItem = {
                                id: `sched-${Date.now()}-${idx}`,
                                type: 'PM',
                                technician: 'ช่าง 1',
                                date: todayStr,
                                machineId: alertItem.machineId,
                                pmPlanId: pmPlans.find(plan => plan.machineId === alertItem.machineId)?.id || 'plan-pm-01',
                                status: 'รอดำเนินการ',
                                duration: 45
                              };
                              setSchedules(prev => [...prev, newPM]);
                              alert(`📅 ได้เพิ่มใบสั่งงานบำรุงเร่งด่วนสำหรับเครื่อง ${alertItem.machineId} ในวันนี้ (${todayStr}) สำเร็จ!`);
                            }}
                            className="mt-1 self-end text-[8.5px] font-extrabold bg-purple-500 hover:bg-purple-450 text-slate-950 px-2 py-0.5 rounded transition"
                          >
                            ➕ สร้างใบสั่ง PM ด่วนวันนี้
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Week Navigation bar */}
      <div id="pm-week-nav-bar" className="bg-slate-800 border border-slate-700/80 p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4">
        {viewMode === 'weekly' ? (
          <>
            <div id="pm-week-nav-label-wrapper" className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700/40">
              <Calendar className="text-cyan-400" size={16} />
              <span className="text-xs text-slate-300 font-medium">
                {weekDays.some(d => isToday(d)) ? 'สัปดาห์ปัจจุบัน: ' : 'สัปดาห์: '}
                {getThaiDateLabel(weekMonday)} - {getThaiDateLabel(weekDays[6])}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={prevWeek}
                className="bg-slate-900 hover:bg-slate-950 border border-slate-700 p-2 rounded-lg text-slate-350 hover:text-cyan-400 transition"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentDate(getNowInThailand())}
                className="bg-slate-900 hover:bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-cyan-400 font-semibold"
              >
                สัปดาห์นี้
              </button>
              <button
                onClick={nextWeek}
                className="bg-slate-900 hover:bg-slate-950 border border-slate-700 p-2 rounded-lg text-slate-350 hover:text-cyan-400 transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </>
        ) : viewMode === 'monthly' ? (
          <>
            <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700/40">
              <Calendar className="text-cyan-400" size={16} />
              <span className="text-xs text-slate-300 font-medium">สัดส่วนสรุปงานช่าง ประจำเดือน</span>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 mr-2">เลือกเดือนสรุปตาราง:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg text-xs px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {(() => {
                  const curYear = getNowInThailand().getFullYear();
                  const options: { val: string; label: string }[] = [];
                  for (let yr = curYear - 1; yr <= curYear + 1; yr++) {
                    for (let m = 1; m <= 12; m++) {
                      const val = `${yr}-${String(m).padStart(2, '0')}`;
                      const label = `${thMonths[m - 1]} ${yr + 543}`;
                      options.push({ val, label });
                    }
                  }
                  return options.map(opt => (
                    <option key={opt.val} value={opt.val}>{opt.label}</option>
                  ));
                })()}
              </select>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5 bg-slate-900 px-3.5 py-1.5 rounded-lg border border-slate-700/40">
              <Calendar className="text-emerald-400" size={16} />
              <span className="text-xs text-slate-300 font-semibold">สถิติวันหยุด-วันลาพนักงาน บำรุงรักษา</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              ช่างทั้งหมด: {technicians.length} คน | ประวัติระบุวันหยุด/ลาดารารวม: {leaves?.length || 0} รายการ
            </div>
          </>
        )}
      </div>

      {viewMode === 'weekly' ? (
        /* WEEKLY MATRIX GRID VIEW MODE */
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl" id="weekly-matrix-container">
          <div className="overflow-x-auto">
            {/* The table container requires width for full desktop view */}
            <div className="min-w-[1400px]">
              
              {/* Table header */}
              <div className="grid grid-cols-12 bg-slate-800/80 border-b border-slate-700 text-slate-300 text-xs font-semibold py-4 uppercase text-center items-center">
                <div className="col-span-3 text-left pl-5">ข้อมูลช่างประจำกะ / Utilization%</div>
                {weekDays.map((day, i) => (
                  <div key={i} className={`col-span-1 border-l border-slate-700/60 py-1 ${isToday(day) ? 'bg-cyan-500/10 rounded-t-md text-cyan-400' : ''}`}>
                    <p className="font-bold text-xs">{thDays[i]}</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      {day.getDate()} {thShortMonths[day.getMonth()]} {(day.getFullYear() + 543) % 100}
                    </p>
                  </div>
                ))}
              </div>

              {/* Rows of 20 technicians */}
              <div className="divide-y divide-slate-700/55 bg-slate-900/10">
                {technicians.map((tech) => {
                  const weekMins = getWeekTotalWorkloadMins(tech);
                  
                  return (
                    <div key={tech} className="grid grid-cols-12 items-stretch hover:bg-slate-800/20 text-center">
                      
                      {/* Left Header for Technician: Name, Capacity progress, breakdown tooltips */}
                      <div className="col-span-3 text-left px-5 py-4 flex flex-col justify-center border-r border-slate-700/40 bg-slate-900/15">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-sm font-bold text-slate-200">{tech}</span>
                          <span className="text-[10px] font-mono text-slate-400">
                            สัปดาห์นี้: {(weekMins / 60).toFixed(1)} ชม.
                          </span>
                        </div>

                        {/* Average utilization indicator of Mon-Sun */}
                        {(() => {
                          const totalCapacity = settings.workingHoursPerDay * 60 * 7;
                          const percent = Math.min(100, Math.round((weekMins / totalCapacity) * 100)) || 0;
                          
                          let progressColor = 'bg-emerald-500';
                          if (percent >= 80 && percent <= 100) progressColor = 'bg-amber-500';
                          else if (percent > 100) progressColor = 'bg-rose-500';

                          return (
                            <div className="space-y-1">
                              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div className={`h-full ${progressColor}`} style={{ width: `${percent}%` }}></div>
                              </div>
                              <div className="flex justify-between text-[9px] text-slate-400">
                                <span className="font-mono">สะสม: {percent}%</span>
                                <span>ลิมิต {settings.workingHoursPerDay * 7} ชม.</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* 7 Days cells for this technician */}
                      {weekDays.map((day, dIdx) => {
                        const dateStr = formatHyphenDate(day);
                        const workload = calculateWorkload(tech, dateStr);
                        const { pmList, opList, repairList, activeImprovements, setupList } = getTasksForTechOnDay(tech, dateStr);

                        // Check overdue PM: scheduled < today, status != เสร็จสิ้น
                        const overduePMCount = pmList.filter(pm => {
                          const todayStr = formatHyphenDate(getNowInThailand());
                          return pm.date < todayStr && pm.status !== 'เสร็จสิ้น';
                        }).length;

                        return (
                          <div 
                            key={dIdx}
                            onClick={() => handleCellClick(tech, day)}
                            className={`col-span-1 p-2 border-l border-slate-700/40 min-h-[145px] flex flex-col gap-1.5 cursor-pointer hover:bg-slate-700/10 group transition duration-150 ${
                              isToday(day) ? 'bg-cyan-500/5' : ''
                            } ${workload.activeLeave ? 'bg-slate-900/40' : ''}`}
                          >
                            {/* Capacity overview and plus sign */}
                            <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono mb-1 shrink-0">
                              <span className={`font-bold font-sans ${
                                workload.activeLeave ? 'text-slate-500 line-through' :
                                workload.utilization > 100 ? 'text-rose-455' :
                                workload.utilization >= 80 ? 'text-amber-455' : 'text-emerald-455'
                              }`}>
                                {workload.activeLeave ? `🛌 ${workload.activeLeave.type}` : `${workload.totalMin} / ${workload.capacity} นาที`}
                              </span>
                              <div className="opacity-0 group-hover:opacity-100 bg-cyan-500/15 hover:bg-cyan-400 p-0.5 rounded text-cyan-400 hover:text-slate-900 transition">
                                <Plus size={10} />
                              </div>
                            </div>

                            {/* Stacked Task Chips */}
                            <div className="flex-1 space-y-1 overflow-hidden flex flex-col justify-start">
                              
                              {/* Leave chip details if active */}
                              {workload.activeLeave && (() => {
                                const activeLeaveType = workload.activeLeave.type;
                                const leaveStyle = 
                                  activeLeaveType === 'ลาป่วย' ? 'bg-red-500/15 border-red-500/40 text-red-300' :
                                  activeLeaveType === 'ลากิจ' ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' :
                                  activeLeaveType === 'ลาพักร้อน' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' :
                                  activeLeaveType === 'วันหยุดประจำสัปดาห์' ? 'bg-blue-500/15 border-blue-500/45 text-blue-300' :
                                  'bg-purple-500/15 border border-purple-500/40 text-purple-300';
                                return (
                                  <div 
                                    className={`text-[9.5px] px-1.5 py-1 rounded text-left shrink-0 font-medium border flex flex-col gap-0.5 ${leaveStyle}`}
                                    title={`คลิกขวาหรือคลิกไอคอนเพื่อยกเลิกวันลา: ${workload.activeLeave.type}${workload.activeLeave.note ? ` - ${workload.activeLeave.note}` : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm(`คุณต้องการยกเลิก/ลบบันทึกวันลาเลี้ยง วันที่ ${workload.activeLeave.date} ของ ${workload.activeLeave.technician} หรือไม่?`)) {
                                        setLeaves(prev => prev.filter(l => l.id !== workload.activeLeave.id));
                                      }
                                    }}
                                  >
                                    <div className="flex items-center justify-between font-bold">
                                      <span>🛌 {activeLeaveType}</span>
                                      <span className="text-[8px] hover:text-red-400 font-sans font-bold">✕ ยกเลิก</span>
                                    </div>
                                    {workload.activeLeave.note && (
                                      <p className="text-[8px] opacity-80 leading-tight border-t border-current/10 pt-0.5 truncate">{workload.activeLeave.note}</p>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* PM chips */}
                              {pmList.map(pm => {
                                const todayStr = formatHyphenDate(getNowInThailand());
                                const isOverdue = pm.date < todayStr && pm.status !== 'เสร็จสิ้น';
                                const plan = pmPlans.find(p => p.id === pm.pmPlanId);
                                return (
                                  <div 
                                    key={pm.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setQuickMngTask(pm);
                                    }}
                                    className={`group text-[9.5px] px-2 py-1.5 rounded-lg text-left shrink-0 truncate transition-all duration-150 font-sans cursor-pointer hover:scale-[1.03] active:scale-95 border ${
                                      isOverdue 
                                        ? 'bg-rose-500/10 border-rose-500/80 text-rose-300 hover:border-rose-450 shadow-sm font-bold' 
                                        : pm.status === 'เสร็จสิ้น'
                                          ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-300 line-through hover:opacity-100 opacity-75 font-medium'
                                          : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300 hover:border-indigo-400 shadow-sm font-bold'
                                    }`}
                                    title={`คลิกแก้ไขหรือลบ: PM ${pm.machineId} (${pm.duration} นาที) Assigned: ${pm.technicians ? pm.technicians.join(', ') : pm.technician}`}
                                  >
                                    <div className="flex justify-between items-center font-bold">
                                      <span>⚙️ {pm.machineId}</span>
                                      <div className="flex items-center gap-1">
                                        <span className="text-[7.5px] scale-90 px-1 rounded bg-black/40 text-slate-350" title={pm.technicians ? pm.technicians.join(', ') : pm.technician}>
                                          {pm.technician.slice(-2)}
                                          {(pm.technicians && pm.technicians.length > 1) ? `+${pm.technicians.length - 1}` : ''}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm(`ต้องการลบแผนงาน PM เครื่อง ${pm.machineId} (${plan?.title || 'บำรุงรักษา'}) ออกจากตารางงานใช่หรือไม่?`)) {
                                              setSchedules(prev => prev.filter(s => s.id !== pm.id));
                                              setToast({ text: `ลบแผน PM เครื่อง ${pm.machineId} เรียบร้อยแล้ว`, type: 'success' });
                                            }
                                          }}
                                          className="opacity-0 group-hover:opacity-100 hover:text-rose-300 text-slate-400 p-0.5 rounded text-[10px] transition font-bold leading-none"
                                          title="ลบงาน PM นี้ออกจากตาราง"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>
                                    <p className="text-[8px] mt-0.5 truncate opacity-90">{plan?.title || "บำรุงรักษา"}</p>
                                  </div>
                                );
                              })}

                              {/* Operation chips */}
                              {opList.map(op => (
                                <div 
                                  key={op.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setQuickMngOp(op);
                                  }}
                                  className="group text-[9px] px-1.5 py-1 rounded text-left shrink-0 truncate border bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/25 hover:border-amber-500/50 text-amber-300 font-sans font-medium cursor-pointer transition-all flex items-center justify-between gap-1"
                                  title={`Line: ${op.line} (${op.startTime} - ${op.endTime}) - คลิกเพื่อดูรายละเอียดหรือลบงาน`}
                                >
                                  <span className="truncate">🟡 Line {op.line}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (window.confirm(`ต้องการลบงานคุมไลน์ "${op.line}" (${op.startTime}-${op.endTime}) ของช่าง ${op.technicians?.join(', ') || op.technician} ออกจากตารางงานใช่หรือไม่?`)) {
                                        setSchedules(prev => prev.filter(s => s.id !== op.id));
                                        setToast({ text: `ลบงานคุมไลน์ ${op.line} เรียบร้อยแล้ว`, type: 'success' });
                                      }
                                    }}
                                    className="opacity-0 group-hover:opacity-100 hover:text-rose-300 text-amber-400/80 p-0.5 rounded text-[10px] transition font-bold leading-none shrink-0"
                                    title="ลบงานคุมไลน์นี้"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}

                              {/* Repair chips */}
                              {repairList.map(rep => (
                                <div 
                                  key={rep.id}
                                  className="group text-[9px] px-1.5 py-1 rounded text-left shrink-0 truncate border bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/30 text-rose-300 font-sans font-bold flex items-center justify-between gap-1 transition-all"
                                  title={`ซ่อมด่วน: เครื่อง ${rep.machineId} (${rep.symptoms})`}
                                >
                                  <span className="truncate">🚨 ซ่อม: {rep.machineId}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (window.confirm(`ต้องการลบรายการซ่อมเครื่อง ${rep.machineId} (${rep.symptoms}) ใช่หรือไม่?`)) {
                                        setRepairs(prev => prev.filter(r => r.id !== rep.id));
                                        setToast({ text: `ลบรายการซ่อมเครื่อง ${rep.machineId} เรียบร้อยแล้ว`, type: 'success' });
                                      }
                                    }}
                                    className="opacity-0 group-hover:opacity-100 hover:text-rose-200 text-rose-400 p-0.5 rounded text-[10px] transition font-bold leading-none shrink-0"
                                    title="ลบรายการซ่อมนี้"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}

                              {/* Kaizen Improvement chips */}
                              {activeImprovements.map(imp => (
                                <div 
                                  key={imp.projId}
                                  className="group text-[9px] px-1.5 py-1 rounded text-left shrink-0 truncate border bg-purple-500/15 hover:bg-purple-500/25 border-purple-500/30 text-purple-300 font-sans font-medium flex items-center justify-between gap-1 transition-all"
                                  title={`Kaizen: ${imp.title}`}
                                >
                                  <span className="truncate">✨ Kaizen: {imp.title}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (window.confirm(`ต้องการลบงาน Kaizen "${imp.title}" ออกจากตารางงานใช่หรือไม่?`)) {
                                        setImprovements(prev => prev.filter(i => i.id !== imp.projId));
                                        setToast({ text: `ลบงาน Kaizen "${imp.title}" เรียบร้อยแล้ว`, type: 'success' });
                                      }
                                    }}
                                    className="opacity-0 group-hover:opacity-100 hover:text-purple-200 text-purple-400 p-0.5 rounded text-[10px] transition font-bold leading-none shrink-0"
                                    title="ลบงาน Kaizen นี้"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}

                              {/* Setup chips */}
                              {setupList.map(setup => (
                                <div 
                                  key={setup.id}
                                  className="group text-[9px] px-1.5 py-1 rounded text-left shrink-0 truncate border bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/25 text-cyan-300 font-sans font-medium flex items-center justify-between gap-1 transition-all"
                                  title={`เซ็ตเครื่อง: ${setup.machineId}`}
                                >
                                  <span className="truncate">🔧 เซ็ตติ้ง: {setup.machineId}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (window.confirm(`ต้องการลบรายการเซ็ตติ้งเครื่อง ${setup.machineId} ใช่หรือไม่?`)) {
                                        setSetupLogs(prev => prev.filter(s => s.id !== setup.id));
                                        setToast({ text: `ลบรายการเซ็ตติ้งเครื่อง ${setup.machineId} เรียบร้อยแล้ว`, type: 'success' });
                                      }
                                    }}
                                    className="opacity-0 group-hover:opacity-100 hover:text-cyan-200 text-cyan-400 p-0.5 rounded text-[10px] transition font-bold leading-none shrink-0"
                                    title="ลบรายการเซ็ตติ้งนี้"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : viewMode === 'monthly' ? (
        /* 📅 MONTH PLAN SUMMARY PORTAL */
        <div className="space-y-6 animate-in fade-in" id="monthly-schedule-panel">
          {/* Header Card */}
          <div id="monthly-header-card" className="bg-slate-800 border border-slate-700 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="text-cyan-400" size={22} />
                <h2 className="text-lg font-extrabold text-slate-100 uppercase tracking-tight">ศูนย์บริหารงาน PM และกำลังพลรายเดือน</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-xl font-sans">
                สอดส่องคิวซ่อมบำรุงเชิงป้องกัน คุมไลน์ผลิต และประเมินพิกัดชั่วโมงภาระงานสะสมรายบุคคลในเดือนที่กำหนด
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div id="monthly-month-picker" className="flex items-center bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-700/70">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-xs text-slate-100 font-extrabold focus:outline-none cursor-pointer p-0.5 accent-cyan-500 font-mono"
                />
              </div>

              <div id="monthly-sub-tabs" className="flex bg-slate-950 p-1 rounded-lg border border-slate-700/60 gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setMonthlySubTab('calendar')}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition ${
                    monthlySubTab === 'calendar' ? 'bg-cyan-500 text-slate-950 font-extrabold shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  📅 ปฏิทินแผน PM รายเดือน
                </button>
                <button
                  type="button"
                  onClick={() => setMonthlySubTab('hours_summary')}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition ${
                    monthlySubTab === 'hours_summary' ? 'bg-cyan-500 text-slate-950 font-extrabold shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  📊 สรุปชั่วโมงช่างสะสม
                </button>
              </div>
            </div>
          </div>

          {monthlySubTab === 'hours_summary' ? (
            /* Cumulative hours statistics of technicians (Durable Representation) */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" id="technician-hours-card-grid">
              {technicians.map(tech => {
                const [yStr, mStr] = selectedMonth.split('-');
                const calYear = parseInt(yStr);
                const calMonth = parseInt(mStr);
                const daysThisMonth = new Date(calYear, calMonth, 0).getDate();

                let totalPM = 0;
                schedules.filter(s => s.type === 'PM' && s.date.startsWith(selectedMonth)).forEach(s => {
                  const isMyPM = s.technician === tech || (s.technicians && s.technicians.includes(tech));
                  if (isMyPM) totalPM += s.duration;
                });

                let totalOp = 0;
                schedules.filter(s => s.type === 'Operation' && s.date.startsWith(selectedMonth)).forEach(s => {
                  const isMyOp = s.technician === tech || (s.technicians && s.technicians.includes(tech));
                  if (isMyOp) totalOp += s.duration;
                });

                let totalRepair = 0;
                repairs.filter(r => r.date.startsWith(selectedMonth)).forEach(r => {
                  const isMyRepair = r.technician === tech || (r.technicians && r.technicians.includes(tech));
                  if (isMyRepair) totalRepair += r.duration;
                });

                let totalImp = 0;
                improvements.forEach(proj => {
                  const isMyImprovement = proj.technician === tech || (proj.technicians && proj.technicians.includes(tech));
                  if (isMyImprovement) {
                    proj.workLogs.forEach(wl => {
                      if (wl.date.startsWith(selectedMonth)) {
                        totalImp += wl.hours * 60;
                      }
                    });
                  }
                });

                let totalSetup = 0;
                if (setupLogs) {
                  setupLogs.forEach(s => {
                    const isMySetup = s.technicians && s.technicians.includes(tech);
                    if (isMySetup && s.date.startsWith(selectedMonth)) {
                      totalSetup += s.totalDuration;
                    }
                  });
                }

                const totalCumulativeMin = totalPM + totalOp + totalRepair + totalImp + totalSetup;
                const totalCumulativeHrs = Number((totalCumulativeMin / 60).toFixed(1));
                const capacityHrs = settings.workingHoursPerDay * daysThisMonth;
                const utilizationPct = capacityHrs > 0 ? Math.round((totalCumulativeHrs / capacityHrs) * 85) : 0;

                let cardBorder = "border-slate-700/60";
                if (utilizationPct > 100) cardBorder = "border-rose-500/40 bg-rose-950/5";
                else if (utilizationPct >= 80) cardBorder = "border-amber-500/40 bg-amber-950/5";

                return (
                  <div key={tech} className={`bg-slate-900/50 border ${cardBorder} p-4 rounded-xl flex flex-col justify-between space-y-3`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">{tech}</h4>
                        <p className="text-[10px] text-slate-500 font-sans mt-0.5 font-bold">พิกัดสะสมเต็มเดือน</p>
                      </div>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        utilizationPct > 100 ? 'bg-rose-500/10 text-rose-300' :
                        utilizationPct >= 80 ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-emerald-300'
                      }`}>
                        {utilizationPct}%
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
                      <div className="bg-indigo-500/5 p-1 rounded border border-indigo-505/10 text-indigo-400">
                        <p className="text-[7.5px] uppercase font-bold text-indigo-500">PM</p>
                        <p className="font-mono font-bold text-[10px] mt-0.5">{(totalPM / 60).toFixed(1)} ชม.</p>
                      </div>
                      <div className="bg-amber-500/5 p-1 rounded border border-amber-500/10 text-amber-400">
                        <p className="text-[7.5px] uppercase font-bold text-amber-500 font-sans">คุมผลิต</p>
                        <p className="font-mono font-bold text-[10px] mt-0.5">{(totalOp / 60).toFixed(1)} ชม.</p>
                      </div>
                      <div className="bg-rose-500/5 p-1 rounded border border-rose-500/10 text-rose-400">
                        <p className="text-[7.5px] uppercase font-bold text-rose-500">ซ่อม</p>
                        <p className="font-mono font-bold text-[10px] mt-0.5">{(totalRepair / 60).toFixed(1)} ชม.</p>
                      </div>
                      <div className="bg-purple-500/5 p-1 rounded border border-purple-500/10 text-purple-400 font-sans text-purple-300">
                        <p className="text-[7.5px] uppercase font-bold text-purple-550 font-sans">ไคเซ็น</p>
                        <p className="font-mono font-bold text-[10px] mt-0.5">{(totalImp / 60).toFixed(1)} ชม.</p>
                      </div>
                      <div className="bg-cyan-500/5 p-1 rounded border border-cyan-500/10 text-cyan-400">
                        <p className="text-[7.5px] uppercase font-bold text-cyan-505">เซ็ตเครื่อง</p>
                        <p className="font-mono font-bold text-[10px] mt-0.5">{(totalSetup / 60).toFixed(1)} ชม.</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-cyan-400" style={{ width: `${Math.min(100, utilizationPct)}%` }}></div>
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-500 font-sans">
                        <span>รวมสะสม: {totalCumulativeHrs} ชม.</span>
                        <span>จากขีดจุสูงสุด: {capacityHrs} ชม.</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* NEW FEATURE: 7-COLUMN HIGH INTERACTIVE PM PLAN CALENDAR GRID */
            <div className="space-y-4 animate-in fade-in duration-250" id="pm-calendar-subtab-view">
              <div id="pm-calendar-instructions-bar" className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900/40 p-3 rounded-lg border border-slate-750 gap-2">
                <span className="text-xs text-slate-300 font-medium font-sans">
                  💡 คำแนะนำ: เจาะจงคลิก <strong className="text-cyan-400">ช่องวันที่ใดๆ</strong> บนปฏิทินเพื่อเพิ่มคิวงาน PM ใหม่ หรือจิ้ม <strong className="text-indigo-400">การ์ด PM แถบสี</strong> เพื่อสลับช่าง ถอน หรือเลื่อนวันบำรุงรักษา
                </span>
                <span id="pm-calendar-ref-date-badge" className="text-[10px] font-mono text-slate-400 whitespace-nowrap bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  วันอ้างอิง: {formatHyphenDate(getNowInThailand())}
                </span>
              </div>

              {/* Day names row */}
              <div id="pm-calendar-day-names-row" className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 py-2 border-b border-slate-700 bg-slate-900/30 rounded-lg">
                {["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"].map((dLabel, idx) => (
                  <div key={idx} className={idx === 0 || idx === 6 ? "text-cyan-400 font-bold" : "text-slate-300"}>
                    {dLabel}
                  </div>
                ))}
              </div>

              {/* Calendars boxes */}
              <div className="grid grid-cols-7 gap-2">
                {(() => {
                  const todayStr = formatHyphenDate(getNowInThailand());
                  const [yStr, mStr] = selectedMonth.split('-');
                  const calYear = parseInt(yStr);
                  const calMonth = parseInt(mStr);
                  const daysInMonthCalculated = new Date(calYear, calMonth, 0).getDate();
                  const firstDayOfWeekIndex = new Date(calYear, calMonth - 1, 1).getDay();

                  const cells: React.ReactNode[] = [];

                  // Dummy days (prior month space offset)
                  for (let i = 0; i < firstDayOfWeekIndex; i++) {
                    cells.push(
                      <div key={`dummy-${i}`} className="bg-slate-950/20 border border-slate-900 rounded-xl min-h-[145px] opacity-15 pointer-events-none"></div>
                    );
                  }

                  // Active days rendering
                  for (let dNum = 1; dNum <= daysInMonthCalculated; dNum++) {
                    const dayDateStr = `${yStr}-${mStr}-${String(dNum).padStart(2, '0')}`;
                    const isTodayRef = dayDateStr === todayStr;

                    // Retrieve PM jobs for this exact date
                    const dayPmTasks = schedules.filter(s => s.type === 'PM' && s.date === dayDateStr) as PMScheduleItem[];

                    // Support tags counting
                    const dayRepairCount = repairs.filter(r => r.date === dayDateStr).length;
                    const dayOpCount = schedules.filter(s => s.type === 'Operation' && s.date === dayDateStr).length;
                    const daySetupCount = (setupLogs || []).filter(s => s.date === dayDateStr).length;

                    cells.push(
                      <div
                        key={`real-day-${dNum}`}
                        onClick={() => setSelectedCell({ dateStr: dayDateStr, technician: 'ช่าง 1' })}
                        className={`bg-[#0a0f1d] border rounded-xl p-2.5 min-h-[145px] flex flex-col justify-between hover:border-cyan-500/50 transition duration-150 relative cursor-pointer group ${
                          isTodayRef
                            ? 'border-cyan-500 bg-cyan-500/10 shadow-lg ring-1 ring-cyan-500/30'
                            : 'border-slate-800/85 hover:bg-slate-900/20'
                        }`}
                      >
                        {/* Day numbers & small KPIs */}
                        <div className="flex justify-between items-center mb-1 shrink-0">
                          <span className={`text-[11px] font-mono font-black rounded px-1.5 py-0.5 leading-none ${
                            isTodayRef 
                              ? 'bg-cyan-500 text-slate-950 font-extrabold shadow' 
                              : 'text-slate-400 group-hover:text-slate-200'
                          }`}>
                            {dNum}
                          </span>

                          <div className="flex gap-1">
                            {dayRepairCount > 0 && (
                              <span className="text-[7.5px] leading-none font-bold bg-rose-500/15 text-rose-300 border border-rose-500/25 px-1 py-0.5 rounded font-sans" title={`มีงานซ่อมด่วน: ${dayRepairCount} เครื่อง`}>
                                🆘 {dayRepairCount}
                              </span>
                            )}
                            {dayOpCount > 0 && (
                              <span className="text-[7.5px] leading-none font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25 px-1 py-0.5 rounded font-sans" title={`คุมผลิตไลน์: ${dayOpCount} รายการ`}>
                                ⚙️ {dayOpCount}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Middle: Stacked list of PMs */}
                        <div className="flex-1 overflow-y-auto space-y-1 py-1 max-h-[85px] scrollbar-none">
                          {dayPmTasks.length === 0 ? (
                            <div className="text-[8px] text-slate-600 italic mt-6 text-center select-none opacity-40 group-hover:opacity-100 transition duration-100">
                              + วางแผน PM
                            </div>
                          ) : (
                            dayPmTasks.map(task => {
                              const isOverdue = task.status !== 'เสร็จสิ้น' && dayDateStr < todayStr;
                              const statusStyles = isOverdue
                                ? 'bg-rose-500/15 border border-rose-500/40 text-rose-300 font-bold'
                                : task.status === 'เสร็จสิ้น'
                                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 line-through opacity-70'
                                  : task.status === 'กำลังทำ'
                                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                                    : 'bg-indigo-500/10 border border-indigo-500/25 text-indigo-300';

                              return (
                                <div
                                  key={task.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setQuickMngTask(task);
                                  }}
                                  className={`p-1.5 rounded-lg text-[9px] text-left leading-normal truncate transition duration-150 hover:scale-[1.03] active:scale-95 border cursor-pointer ${statusStyles}`}
                                  title={`คลิกแก้ไข: PM ${task.machineId} (${task.duration} นาที) Assigned: ${task.technician}`}
                                >
                                  <div className="flex justify-between items-center font-bold">
                                    <span className="font-mono text-[9.5px] text-slate-100">{task.machineId}</span>
                                    <span className="text-[7.5px] scale-90 px-1 rounded bg-black/40 text-slate-300">{task.technician.slice(-2)}</span>
                                  </div>
                                  <p className="text-[8px] mt-0.5 truncate opacity-90">
                                    {isOverdue && '⚠️ '}
                                    {pmPlans.find(p => p.id === task.pmPlanId)?.title || "บำรุงเครื่องจักร"}
                                  </p>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Bottom hint */}
                        <div className="text-[7px] text-slate-500 font-mono text-right opacity-0 group-hover:opacity-100 transition shrink-0 select-none">
                          + Assign PM
                        </div>
                      </div>
                    );
                  }

                  return cells;
                })()}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 🛌 LEAVE & VACATION STATISTICS CONTROL CENTER */
        <div className="space-y-6 animate-in fade-in" id="leave-statistics-panel">
          {/* 1. KPI Cards row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-slate-800 border border-slate-700/80 p-4 rounded-xl flex items-center gap-3">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-700 text-slate-300">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-sans font-bold">บันทึกวันหยุด/ลาสะสม</p>
                <p className="text-xl font-bold text-slate-100 font-mono">{leaves?.length || 0} วัน</p>
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700/80 p-4 rounded-xl flex items-center gap-3">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-700 text-red-400">
                <Calendar size={20} className="text-red-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-450 uppercase font-sans font-bold">🤒 ลาป่วยรวม</p>
                <p className="text-xl font-bold text-red-300 font-mono">{leaves ? leaves.filter(l => l.type === 'ลาป่วย').length : 0} วัน</p>
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700/80 p-4 rounded-xl flex items-center gap-3">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-700 text-amber-400">
                <Calendar size={20} className="text-amber-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-450 uppercase font-sans font-bold">📝 ลากิจรวม</p>
                <p className="text-xl font-bold text-amber-400 font-mono">{leaves ? leaves.filter(l => l.type === 'ลากิจ').length : 0} วัน</p>
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700/80 p-4 rounded-xl flex items-center gap-3">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-700 text-emerald-400">
                <Calendar size={20} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-450 uppercase font-sans font-bold">✈️ ลาพักร้อนรวม</p>
                <p className="text-xl font-bold text-emerald-400 font-mono">{leaves ? leaves.filter(l => l.type === 'ลาพักร้อน').length : 0} วัน</p>
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700/80 p-4 rounded-xl flex items-center gap-3 col-span-2 lg:col-span-1">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-700 text-blue-400">
                <Calendar size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-450 uppercase font-sans font-bold">🗓️ วันหยุดประจำกะ</p>
                <p className="text-xl font-bold text-blue-400 font-mono">{leaves ? leaves.filter(l => l.type === 'วันหยุดประจำสัปดาห์').length : 0} วัน</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* COLUMN 1: Quick form to add leave */}
            <div id="leave-quick-form-card" className="xl:col-span-1 bg-slate-800 border border-slate-700/80 rounded-xl p-5 space-y-4">
              <div className="border-b border-slate-700/60 pb-3">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  ✍️ บันทึกขอลาหยุด / หยุดชดเชยด่วน
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  กรอกรายละเอียดข้อมูลการขอลางานเพื่อปรับลดโควต้าและแจ้งเตือนภาระเวลาช่างอัตโนมัติแบบเรียลไทม์
                </p>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!quickLeaveTech) {
                    alert("กรุณาเลือกช่างผู้ลา");
                    return;
                  }
                  if (!quickLeaveDate) {
                    alert("กรุณาระบุวันที่หยุด/ลา");
                    return;
                  }
                  const isExist = leaves?.some(l => l.technician === quickLeaveTech && l.date === quickLeaveDate);
                  if (isExist) {
                    alert(`ช่าง ${quickLeaveTech} มีประวัติบันทึกการลาหยุดในวันที่ ${quickLeaveDate} อยู่แล้วในระบบ`);
                    return;
                  }
                  const newLeave = {
                    id: `leave-${Date.now()}`,
                    technician: quickLeaveTech,
                    date: quickLeaveDate,
                    type: quickLeaveType,
                    note: quickLeaveNote.trim() || undefined
                  };
                  setLeaves(prev => [...prev, newLeave]);
                  setQuickLeaveNote('');
                  alert(`ลงทะเบียนบันทึกการลาของ ${quickLeaveTech} สำเร็จเรียบร้อย!`);
                }} 
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">พนักงานช่าง / ผู้ประสงค์หยุดลา*</label>
                  <select
                    value={quickLeaveTech}
                    onChange={(e) => setQuickLeaveTech(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-bold"
                  >
                    {technicians.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">วันที่เริ่มต้นการลาหยุด*</label>
                  <input
                    type="date"
                    required
                    value={quickLeaveDate}
                    onChange={(e) => setQuickLeaveDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-center text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">ประเภทการหยุดลา*</label>
                  <select
                    value={quickLeaveType}
                    onChange={(e) => setQuickLeaveType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ลากิจ">📝 ลากิจ (Personal Leave)</option>
                    <option value="ลาป่วย">🤒 ลาป่วย (Sick Leave)</option>
                    <option value="ลาพักร้อน">✈️ ลาพักร้อน (Annual Vacation)</option>
                    <option value="วันหยุดประจำสัปดาห์">🗓️ วันหยุดประจำสัปดาห์ / Day-off</option>
                    <option value="ลาอื่น ๆ">💼 ลาอื่น ๆ (Other Leave)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">เหตุผลประกอบการลา / บันทึกความต้องการเพิ่มเติม</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ไปพบแพทย์เฉพาะทางโรงพยาบาล, ติดธุระสำคัญทางครอบครัว"
                    value={quickLeaveNote}
                    onChange={(e) => setQuickLeaveNote(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-450 hover:to-teal-500 text-slate-950 font-bold py-2.5 rounded-lg text-xs tracking-wide transition shadow"
                >
                  ➕ ยืนยันระบุขอลาหยุดพนักงาน
                </button>
              </form>
            </div>

            {/* COLUMN 2: Technician Leave frequencies table */}
            <div className="xl:col-span-2 space-y-4">
              <div id="leave-frequencies-table-card" className="bg-slate-800 border border-slate-700/80 rounded-xl p-5 space-y-4">
                <div className="border-b border-slate-700/60 pb-3">
                  <h3 className="text-sm font-bold text-slate-200">
                    📊 รายงานประวัติอัตราความพิกัดการลารายบุคคล (เก็บสถิติ)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">รวมความถี่การแจ้งลางานและการขอหยุดชดเชยของช่างประจำกะ คอยวัดเสถียรภาพกำลังพลบำรุงรักษา</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-700/80 text-slate-400 font-bold pb-2 uppercase text-[10px] tracking-wider">
                        <th className="py-2.5">รายชื่อทีมช่างเทคนิค</th>
                        <th className="py-2.5 text-center text-red-400">🤒 ป่วย</th>
                        <th className="py-2.5 text-center text-amber-400">📝 กิจ</th>
                        <th className="py-2.5 text-center text-emerald-400">✈️ พักร้อน</th>
                        <th className="py-2.5 text-center text-blue-400">🗓️ วันหยุด</th>
                        <th className="py-2.5 text-center text-purple-400">อื่น ๆ</th>
                        <th className="py-2.5 text-center font-bold text-slate-100 border-l border-slate-700 pl-3">หยุดลาสะสม</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {technicians.map(tech => {
                        const techLeaves = leaves ? leaves.filter(l => l.technician === tech) : [];
                        const sick = techLeaves.filter(l => l.type === 'ลาป่วย').length;
                        const pers = techLeaves.filter(l => l.type === 'ลากิจ').length;
                        const vac = techLeaves.filter(l => l.type === 'ลาพักร้อน').length;
                        const wk = techLeaves.filter(l => l.type === 'วันหยุดประจำสัปดาห์').length;
                        const oth = techLeaves.filter(l => l.type === 'ลาอื่น ๆ').length;
                        const total = techLeaves.length;

                        return (
                          <tr key={tech} className="hover:bg-slate-900/30 text-slate-200">
                            <td className="py-2.5 font-bold text-xs">{tech}</td>
                            <td className="py-2.5 text-center font-mono text-xs">{sick || '-'}</td>
                            <td className="py-2.5 text-center font-mono text-xs">{pers || '-'}</td>
                            <td className="py-2.5 text-center font-mono text-xs">{vac || '-'}</td>
                            <td className="py-2.5 text-center font-mono text-xs">{wk || '-'}</td>
                            <td className="py-2.5 text-center font-mono text-xs">{oth || '-'}</td>
                            <td className="py-2.5 text-center font-mono font-bold text-emerald-400 border-l border-slate-700 pl-3">
                              {total > 0 ? `${total} วัน` : <span className="text-slate-655 font-normal text-slate-500">-</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Detailed Data Log Table */}
          <div id="leave-data-log-table-card" className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-200">
                ⌛ ประวัติบันทึกการขอหยุดลารรวม (ตรวจสอบและแก้ไขดึงพิกัดคืน)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                รายการประวัติวันหยุดวันลาทั้งหมดในระบบ คอยให้ผู้จัดการตรวจเช็คและกู้คืนเพื่อปลดมาสเตอร์พิกัดช่างในตารางได้ตลอดเวลา
              </p>
            </div>

            {(!leaves || leaves.length === 0) ? (
              <div className="text-center py-8 text-slate-500 text-xs italic">
                ไม่มีประวัติวันหยุด-วันลาขัดข้องใดๆ ที่เก็บบันทึกในประวัติทีมขณะนี้
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-405 uppercase font-mono text-[9.5px] tracking-wider">
                    <tr>
                      <th className="p-3 rounded-l-lg">วันที่ลางาน</th>
                      <th className="p-3">พนักงานช่าง</th>
                      <th className="p-3 text-center">ประเภทการลา</th>
                      <th className="p-3">จุดประสงค์เพิ่มเติม / ความจำเป็นเสริม</th>
                      <th className="p-3 text-center rounded-r-lg">ลบด่วน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/40">
                    {[...leaves].sort((a,b) => b.date.localeCompare(a.date)).map(lv => {
                      const leaveBadgeColor = 
                        lv.type === 'ลาป่วย' ? 'bg-red-500/15 text-red-300 border border-red-500/25' :
                        lv.type === 'ลากิจ' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25' :
                        lv.type === 'ลาพักร้อน' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25' :
                        lv.type === 'วันหยุดประจำสัปดาห์' ? 'bg-blue-500/15 text-blue-300 border border-blue-500/25' :
                        'bg-purple-500/15 text-purple-300 border border-purple-500/25';
                      return (
                        <tr key={lv.id} className="hover:bg-slate-900/20 transition-colors">
                          <td className="p-3 font-mono text-cyan-400 font-semibold">{lv.date}</td>
                          <td className="p-3 font-bold text-slate-200">{lv.technician}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-semibold inline-block ${leaveBadgeColor}`}>
                              🛌 {lv.type}
                            </span>
                          </td>
                          <td className="p-3 text-slate-300 italic max-w-sm truncate" title={lv.note}>{lv.note || <span className="text-slate-655 font-sans not-italic text-slate-500">ไม่ได้ระบุบันทึกเสริม</span>}</td>
                          <td className="p-3 text-slate-300 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`คุณต้องการลบประวัติวันลาของ (${lv.technician}) วันที่ ${lv.date} ออกจากตารางเพื่อดึงเวลากลับคืนหรือไม่?`)) {
                                  setLeaves(prev => prev.filter(l => l.id !== lv.id));
                                }
                              }}
                              className="text-slate-500 hover:text-red-400 transition-all p-1.5 focus:outline-none"
                              title="ลบวันหยุดลาช่าง"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CELL CLICK ADD TASK MODAL POPUP */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div id="cell-click-add-task-modal-container" className="bg-slate-800 border border-slate-700 rounded-2xl max-w-xl w-full flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-155">
            {/* Header detail */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700/80 p-5 shrink-0 flex justify-between items-center">
              <div>
                <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono px-2 py-0.5 rounded">
                  {selectedCell.technician}
                </span>
                <h3 className="text-sm font-semibold text-slate-200 mt-1">
                  ➕ เพิ่มงานใหม่ถ้วนลงตารางวันที่ {selectedCell.dateStr}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedCell(null)}
                className="text-slate-400 hover:text-slate-205 text-xl font-medium focus:outline-none"
              >
                &times;
              </button>
            </div>

            {/* TAB SELECTOR */}
            <div className="bg-slate-900 p-2 border-b border-slate-700/80 grid grid-cols-5 gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('PM')}
                className={`py-2 text-[11px] font-semibold rounded-md transition ${
                  activeTab === 'PM' ? 'bg-indigo-500/20 border border-indigo-500/35 text-indigo-300' : 'text-slate-400 hover:text-slate-205'
                }`}
              >
                🔵 งาน PM
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('Operation')}
                className={`py-2 text-[11px] font-semibold rounded-md transition ${
                  activeTab === 'Operation' ? 'bg-amber-500/20 border border-amber-500/35 text-amber-300' : 'text-slate-400 hover:text-slate-205'
                }`}
              >
                🟡 คุมเครื่อง
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('Repair')}
                className={`py-2 text-[11px] font-semibold rounded-md transition ${
                  activeTab === 'Repair' ? 'bg-rose-500/20 border border-rose-500/35 text-rose-300' : 'text-slate-400 hover:text-slate-205'
                }`}
              >
                🔴 ซ่อมด่วน
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('Improvement')}
                className={`py-2 text-[11px] font-semibold rounded-md transition ${
                  activeTab === 'Improvement' ? 'bg-purple-500/20 border border-purple-500/35 text-purple-300' : 'text-slate-400 hover:text-slate-205'
                }`}
              >
                🟣 ปรับปรุง
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('Leave')}
                className={`py-2 text-[11px] font-semibold rounded-md transition ${
                  activeTab === 'Leave' ? 'bg-emerald-500/20 border border-emerald-500/35 text-emerald-300' : 'text-slate-400 hover:text-slate-205'
                }`}
              >
                🛌 หยุด/ลา
              </button>
            </div>

            {/* Dynamic Form fields by active tab */}
            <form onSubmit={handleSaveAssignedTask} className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              
              {/* TAB 1: 🔵 PM */}
              {activeTab === 'PM' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-350">เลือกเครื่องจักร*</label>
                    <select
                      id="sch-pm-machine-select"
                      value={pmFormMachine}
                      onChange={(e) => handleMachineChangeInForm(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                    >
                      <option value="">-- เลือกเครื่องจักร --</option>
                      {machines.map(m => (
                        <option key={m.id} value={m.id}>{m.id} : {m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-355">เลือกแบบแผน PM (เฉพาะแผนที่จับคู่กับเครื่องนี้)*</label>
                    <select
                      id="sch-pm-plan-select"
                      value={pmFormPlan}
                      onChange={(e) => setPmFormPlan(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      {pmPlans.filter(p => p.machineId === pmFormMachine).length === 0 ? (
                        <option value="">❌ เครื่องนี้ไม่มีแผน PM กรุณาจับคู่ก่อนหรือเพิ่มเครื่องอื่น</option>
                      ) : (
                        pmPlans.filter(p => p.machineId === pmFormMachine).map(plan => (
                          <option key={plan.id} value={plan.id}>
                            {plan.title} ({plan.ttm} นาที, {plan.frequency})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-355">สถานะงานเริ่มต้น*</label>
                    <select
                      value={pmFormStatus}
                      onChange={(e) => setPmFormStatus(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="รอดำเนินการ">รอดำเนินการ (Draft / Scheduled)</option>
                      <option value="กำลังทำ">กำลังทำ (In Progress)</option>
                      <option value="เสร็จสิ้น">เสร็จสิ้น (Completed)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* TAB 2: 🟡 Operation */}
              {activeTab === 'Operation' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">ไลผลิตที่ต้องการมอบหมายเพื่อเฝ้าระวังควบคุม*</label>
                    <input
                      id="sch-op-line"
                      type="text"
                      required
                      placeholder="ตัวอย่างเช่น ไลน์ผลิตซูชิ A, ไลน์ข้าวต้มมัด, ขนมปังกรอบ"
                      value={opFormLine}
                      onChange={(e) => setOpFormLine(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">เวลาเริ่มเฝ้าระวัง*</label>
                      <input
                        id="sch-op-start"
                        type="time"
                        required
                        value={opFormStart}
                        onChange={(e) => setOpFormStart(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono text-center focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">เวลาสิ้นสุดเฝ้าระวัง*</label>
                      <input
                        id="sch-op-end"
                        type="time"
                        required
                        value={opFormEnd}
                        onChange={(e) => setOpFormEnd(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono text-center focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Recurring options */}
                  <div className="bg-slate-900/50 p-4 border border-slate-700 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs font-semibold text-slate-200">ทำซ้ำรายสัปดาห์โดยอัตโนมัติ?</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">ระบบจะลงคิวมอบหมายตามวันในสัปดาห์ที่ลงลึกไว้เป็นประจำ</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={opFormRecur}
                        onChange={(e) => setOpFormRecur(e.target.checked)}
                        className="w-4.5 h-4.5 text-cyan-500 bg-slate-800 border-slate-700 rounded focus:ring-cyan-400"
                      />
                    </div>

                    {opFormRecur && (
                      <div className="grid grid-cols-7 gap-1 text-center pt-2">
                        {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((w, index) => {
                          const isActive = opFormRecurDays.includes(index);
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                setOpFormRecurDays(prev => 
                                  prev.includes(index) 
                                    ? prev.filter(d => d !== index)
                                    : [...prev, index]
                                );
                              }}
                              className={`py-1 rounded text-xs transition font-mono font-bold border ${
                                isActive 
                                  ? 'bg-cyan-500 border-cyan-550 text-slate-950 font-extrabold' 
                                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                              }`}
                            >
                              {w}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: 🔴 Repair */}
              {activeTab === 'Repair' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">เลือกเครื่องจักรชำรุด*</label>
                    <select
                      id="sch-rep-machine"
                      value={repFormMachine}
                      onChange={(e) => setRepFormMachine(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-[#ced4da] font-mono focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">-- เลือกเครื่องจักร --</option>
                      {machines.map(m => (
                        <option key={m.id} value={m.id}>{m.id} : {m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-305">เวลารับแจ้งเสียชำรุด (HH:MM)*</label>
                      <input
                        id="sch-rep-breakdown"
                        type="time"
                        required
                        value={repFormBreakdown}
                        onChange={(e) => setRepFormBreakdown(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-205 font-mono text-center focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-305">เวลาซ่อมเสร็จพร้อมผลิต (HH:MM)*</label>
                      <input
                        id="sch-rep-done"
                        type="time"
                        required
                        value={repFormDone}
                        onChange={(e) => setRepFormDone(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-205 font-mono text-center focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-305">อาการเสียชำรุด*</label>
                    <input
                      id="sch-rep-symptoms"
                      type="text"
                      required
                      placeholder="เช่น ขอบพัดระบายลมหมุนช้ามีกลิ่นไหม้โพรเทคเตอร์"
                      value={repFormSymptoms}
                      onChange={(e) => setRepFormSymptoms(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Why-Why brief */}
                  <div className="space-y-2 bg-slate-900/40 p-4 border border-slate-700 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">❓ Why-Why Analysis (วิเคราะห์รากเหง้าปัญหา 5 ระดับ):</p>
                    <div className="space-y-1.5 pt-1.5">
                      <input
                        type="text"
                        placeholder="Why 1: ทำไมถึงหยุดทำงาน?"
                        value={repFormWhy1}
                        onChange={(e) => setRepFormWhy1(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-305 focus:outline-none focus:border-cyan-500"
                      />
                      <input
                        type="text"
                        placeholder="Why 2: ทำไมจึงร้อนขึ้น?"
                        value={repFormWhy2}
                        onChange={(e) => setRepFormWhy2(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-305 focus:outline-none focus:border-cyan-500"
                      />
                      <input
                        type="text"
                        placeholder="Why 3: ทำไมจึงลัดวงจร?"
                        value={repFormWhy3}
                        onChange={(e) => setRepFormWhy3(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-305 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">มาตรการแก้ไขป้องกัน*</label>
                    <input
                      id="sch-rep-correction"
                      type="text"
                      required
                      placeholder="เช่น พันคอยล์ทองแดงตัวต่อพินใหม่และเปลี่ยนตลับฟิวส์"
                      value={repFormCorrection}
                      onChange={(e) => setRepFormCorrection(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: 🟣 Improvement */}
              {activeTab === 'Improvement' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">ชื่อโครงการปรับปรุง (Kaizen Title)*</label>
                    <input
                      id="sch-imp-title"
                      type="text"
                      required
                      placeholder="เช่น ติดตั้งจุดแปรผันอุณหภูมิสติกเกอร์"
                      value={impFormTitle}
                      onChange={(e) => setImpFormTitle(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">รายละเอียดแผนงาน</label>
                    <textarea
                      id="sch-imp-desc"
                      rows={2}
                      placeholder="อธิบายสรุปหรือเป้าหมายของการปรับปรุง..."
                      value={impFormDescription}
                      onChange={(e) => setImpFormDescription(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">เครื่องของโครงการ</label>
                      <select
                        id="sch-imp-machine"
                        value={impFormMachine}
                        onChange={(e) => setImpFormMachine(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200"
                      >
                        <option value="">-- ไม่ระบุ --</option>
                        {machines.map(m => (
                          <option key={m.id} value={m.id}>{m.id} : {m.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">ชั่วโมงทำงานจริงหน้างานวันนี้นะปัจจุบัน*</label>
                      <input
                        id="sch-imp-hours"
                        type="number"
                        min={1}
                        max={24}
                        required
                        value={impFormHours}
                        onChange={(e) => setImpFormHours(Math.max(1, Number(e.target.value) || 0))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-200 text-center font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">วันคาดความเสร็จโครงการ (YYYY-MM-DD)</label>
                    <input
                      id="sch-imp-end"
                      type="date"
                      value={impFormPlannedEnd}
                      onChange={(e) => setImpFormPlannedEnd(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-200 font-mono text-center"
                    />
                  </div>
                </div>
              )}

              {/* TAB 5: 🛌 Leave */}
              {activeTab === 'Leave' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">ประเภทการหยุดลาสำหรับช่าง {selectedCell.technician}*</label>
                    <select
                      value={leaveFormType}
                      onChange={(e) => setLeaveFormType(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-bold"
                    >
                      <option value="ลากิจ">📝 ลากิจ (Personal Leave)</option>
                      <option value="ลาป่วย">🤒 ลาป่วย (Sick Leave)</option>
                      <option value="ลาพักร้อน">✈️ ลาพักร้อน (Annual Vacation)</option>
                      <option value="วันหยุดประจำสัปดาห์">🗓️ วันหยุดประจำสัปดาห์ / Day-off</option>
                      <option value="ลาอื่น ๆ">💼 ลาอื่น ๆ (Other Leave)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">ระบุเหตุผลและรายละเอียดเพิ่มเติมประกอบการพิจารณา*</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น ปวดหัวตัวร้อนมีไข้, ไปยื่นคำขอที่ราชการ, ลาพักผ่อนประจำทีม"
                      value={leaveFormNote}
                      onChange={(e) => setLeaveFormNote(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-205 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              {/* Co-Technicians Multi-Select Checkboxes */}
              {activeTab !== 'Leave' && (
                <div className="bg-slate-900/60 p-4 border border-slate-700/80 rounded-xl space-y-2 mt-4 shrink-0">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-extrabold text-cyan-400 flex items-center gap-1">
                      👥 ระบุช่างร่วมปฏิบัติการเพิ่มเติม (Co-Technicians)
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      เลือกช่างเสริมนอกเหนือจาก {selectedCell.technician}: {modalTechnicians.length} คน
                    </span>
                  </div>
                  
                  {/* Scrollable list of other technicians */}
                  <div className="max-h-[110px] overflow-y-auto bg-slate-950/60 border border-slate-750 rounded-lg p-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5 scrollbar-thin">
                    {technicians
                      .filter(t => t !== selectedCell.technician)
                      .map(t => {
                        const isChecked = modalTechnicians.includes(t);
                        return (
                          <label 
                            key={t}
                            className={`flex items-center gap-1.5 p-1.5 rounded border cursor-pointer select-none transition-all ${
                              isChecked 
                                ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 font-bold' 
                                : 'bg-slate-900/30 border-slate-800 text-slate-400 hover:text-slate-350 hover:border-slate-755'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setModalTechnicians(prev => 
                                  prev.includes(t) 
                                    ? prev.filter(x => x !== t) 
                                    : [...prev, t]
                                );
                              }}
                              className="w-3.5 h-3.5 rounded accent-cyan-500 cursor-pointer"
                            />
                            <span className="text-[10.5px] truncate font-medium">{t}</span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Submit panel */}
              <div className="pt-4 border-t border-slate-700/60 shrink-0 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedCell(null)}
                  className="border border-slate-700 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2.5 rounded-lg transition"
                >
                  ยกเลิก
                </button>
                <button
                  id="btn-save-cell-assignment"
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-lg transition shadow-md"
                >
                  มอบหมายเข้าตาราง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK PM MANAGEMENT MODAL POPUP */}
      {quickMngTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 text-left">
          <div id="quick-pm-mng-modal-container" className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="bg-slate-900 border-b border-slate-700 p-5 flex justify-between items-center text-left">
              <div>
                <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono px-2 py-0.5 rounded font-black">
                  MACHINE ID: {quickMngTask.machineId}
                </span>
                <h3 className="text-sm font-bold text-slate-100 mt-1 uppercase flex items-center gap-1.5">
                  🛠️ แก้ไข/ย้ายแผนกำหนดระบบบำรุงรักษา PM
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickMngTask(null)}
                className="text-slate-400 hover:text-slate-200 text-xs bg-slate-950 p-2 border border-slate-800 rounded-lg hover:bg-slate-900 leading-none"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!qmTech) {
                  setToast({ text: 'กรุณาเลือกช่างปฏิบัติงาน', type: 'error' });
                  return;
                }
                if (!qmDate) {
                  setToast({ text: 'กรุณาระบุวันนัดหมายบำรุงรักษา', type: 'error' });
                  return;
                }
                setSchedules(prev => prev.map(s => {
                  if (s.id === quickMngTask.id) {
                    return {
                      ...s,
                      technician: qmTech,
                      technicians: Array.from(new Set([qmTech, ...qmCoTechs])),
                      date: qmDate,
                      duration: Number(qmDuration),
                      actualDuration: qmStatus === 'เสร็จสิ้น' ? Number(qmActualDuration) : undefined,
                      overtimeReason: (qmStatus === 'เสร็จสิ้น' && Number(qmActualDuration) > Number(qmDuration)) ? qmOvertimeReason.trim() : undefined,
                      status: qmStatus
                    } as PMScheduleItem;
                  }
                  return s;
                }));
                setQuickMngTask(null);
                setToast({ text: 'อัปเดตและบันทึกกำหนดเวลา PM เรียบร้อยแล้ว! ⚙️', type: 'success' });
              }}
              className="p-5 space-y-4 text-left font-sans"
            >
              {/* Info row */}
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-750">
                <p className="text-[11px] text-slate-300 font-medium">
                  <strong>แผนงานหลัก:</strong> {pmPlans.find(plan => plan.id === quickMngTask.pmPlanId)?.title || "บำรุงรักษาประจำรอบ"}
                </p>
                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  ⏱️ ความถี่ตั้งหลัก: ทุกๆ {pmPlans.find(plan => plan.id === quickMngTask.pmPlanId)?.frequency || 30} วัน
                </p>
              </div>

              {/* Technician Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300">ช่างเทคนิคผู้รับผิดชอบหลัก*</label>
                <select
                  value={qmTech}
                  onChange={(e) => {
                    const newTech = e.target.value;
                    setQmTech(newTech);
                    setQmCoTechs(prev => prev.filter(t => t !== newTech));
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-bold focus:outline-none focus:border-cyan-500"
                  required
                >
                  {technicians.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Co-Technicians Multi-Select Checkboxes inside Quick PM Management */}
              <div className="bg-slate-900/60 p-4 border border-slate-700/80 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-extrabold text-cyan-400 flex items-center gap-1">
                    👥 ช่างร่วมรับผิดชอบปฏิบัติการเพิ่มเติม (Co-Technicians)
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ช่างร่วมทีม: {qmCoTechs.length} คน
                  </span>
                </div>
                
                {/* Scrollable checklist of other technicians */}
                <div className="max-h-[100px] overflow-y-auto bg-slate-950/60 border border-slate-750 rounded-lg p-2 grid grid-cols-2 gap-1.5 scrollbar-thin">
                  {technicians
                    .filter(t => t !== qmTech)
                    .map(t => {
                      const isChecked = qmCoTechs.includes(t);
                      return (
                        <label 
                          key={t}
                          className={`flex items-center gap-1.5 p-1.5 rounded border cursor-pointer select-none transition-all ${
                            isChecked 
                              ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 font-bold' 
                              : 'bg-slate-900/30 border-slate-800 text-slate-400 hover:text-slate-350'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setQmCoTechs(prev => 
                                prev.includes(t) 
                                  ? prev.filter(x => x !== t) 
                                  : [...prev, t]
                              );
                            }}
                            className="w-3.5 h-3.5 rounded accent-cyan-500 cursor-pointer"
                          />
                          <span className="text-[11px] truncate font-medium">{t}</span>
                        </label>
                      );
                    })}
                </div>
              </div>

              {/* Date Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300">วันที่ปฏิบัติงาน PM*</label>
                <input
                  type="date"
                  value={qmDate}
                  onChange={(e) => setQmDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono text-center focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              {/* Duration & Status (split row) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300">ระยะเวลาเข้าซ่อมบำรุง (นาที)*</label>
                  <input
                    type="number"
                    min={5}
                    max={720}
                    value={qmDuration}
                    onChange={(e) => setQmDuration(Math.max(5, Number(e.target.value) || 0))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 text-center font-mono focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300">สถานะความคืบหน้า PM*</label>
                  <select
                    value={qmStatus}
                    onChange={(e) => setQmStatus(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    required
                  >
                    <option value="รอดำเนินการ">🟡 รอดำเนินการ</option>
                    <option value="กำลังทำ">🟠 กำลังทำการบำรุง</option>
                    <option value="เสร็จสิ้น">🟢 เสร็จสิ้นเสร็จสมบูรณ์</option>
                  </select>
                </div>
              </div>

              {/* Actual Duration and Overtime Reason input when status is 'เสร็จสิ้น' */}
              {qmStatus === 'เสร็จสิ้น' && (
                <div className="space-y-3 p-3.5 bg-slate-950/80 border border-slate-750 rounded-xl">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-200 flex items-center justify-between">
                      <span>⏱ บันทึกเวลาที่ใช้ทำงานจริง (นาที)*</span>
                      <span className="text-[10px] text-slate-400 font-normal">เกณฑ์มาตรฐาน: {qmDuration} นาที</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={720}
                      value={qmActualDuration}
                      onChange={(e) => setQmActualDuration(Math.max(1, Number(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 text-center font-mono font-bold focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  {/* Variance Calculation */}
                  {qmActualDuration > 0 && qmDuration > 0 && (
                    <div className="text-[10.5px] p-2 rounded-lg bg-slate-900 border border-slate-800">
                      {qmActualDuration === qmDuration ? (
                        <span className="text-slate-300 font-bold">⏱ ตรงตามเวลามาตรฐาน 100%</span>
                      ) : qmActualDuration > qmDuration ? (
                        <span className="text-rose-450 font-bold flex items-center gap-1">
                          ⚠️ ช้ากว่ามาตรฐาน +{qmActualDuration - qmDuration} นาที (+{Math.round(((qmActualDuration - qmDuration)/qmDuration)*100)}%)
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          ⚡️ เสร็จเร็วกว่ามาตรฐาน -{qmDuration - qmActualDuration} นาที (-{Math.round(((qmDuration - qmActualDuration)/qmDuration)*100)}%)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Overtime Reason Input */}
                  {qmActualDuration > qmDuration && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                      <label className="text-[10.5px] font-extrabold text-rose-300 flex items-center gap-1">
                        <AlertTriangle size={13} className="text-rose-400" />
                        ระบุสาเหตุที่ใช้เวลาเกินมาตรฐาน (Overtime / Delay Reason)*
                      </label>

                      {/* Preset buttons */}
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                        {PM_OVERTIME_REASON_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setQmOvertimeReason(preset)}
                            className={`text-[9.5px] px-2 py-0.5 rounded border text-left transition cursor-pointer ${
                              qmOvertimeReason === preset
                                ? 'bg-rose-500 text-white font-bold border-rose-400'
                                : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>

                      <textarea
                        value={qmOvertimeReason}
                        onChange={(e) => setQmOvertimeReason(e.target.value)}
                        placeholder="ระบุสาเหตุที่ใช้เวลาเกินมาตรฐาน..."
                        rows={2}
                        className="w-full bg-slate-900 border border-rose-500/40 rounded-lg p-2 text-xs text-rose-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-400"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Footer buttons / Delete Button */}
              <div className="pt-4 border-t border-slate-700 shrink-0 flex flex-col space-y-3">
                {isConfirmingDelete ? (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-200">
                    <p className="text-[11px] text-rose-300 font-bold flex items-center gap-1.5 leading-snug">
                      ⚠️ ยืนยันต้องการลบแผนงาน PM นี้จริงๆ ใช่หรือไม่? (ไม่สามารถกู้คืนได้)
                    </p>
                    <div className="flex gap-1.5 w-full sm:w-auto shrink-0 justify-end">
                      <button
                        type="button"
                        onClick={() => setIsConfirmingDelete(false)}
                        className="bg-slate-750 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSchedules(prev => prev.filter(s => s.id !== quickMngTask.id));
                          setQuickMngTask(null);
                          setIsConfirmingDelete(false);
                          setToast({ text: `ยกเลิกและลบแผน PM ของเครื่อง ${quickMngTask.machineId} ออกจากระบบแล้ว`, type: 'success' });
                        }}
                        className="bg-rose-650 hover:bg-rose-550 text-white border border-rose-500/30 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition"
                      >
                        ใช่, ลบเลย
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 w-full">
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(true)}
                      className="bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 text-rose-400 text-[11px] px-3.5 py-2.5 rounded-lg transition font-bold"
                    >
                      🗑️ ลบแผน PM
                    </button>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setQuickMngTask(null)}
                        className="border border-slate-700 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2.5 rounded-lg transition"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs px-5 py-2.5 rounded-lg transition shadow-md"
                      >
                        💾 บันทึกการอัปเดต
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK OPERATION MANAGEMENT & DELETE MODAL */}
      {quickMngOp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-750 w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 text-sm">
                  🟡
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">รายละเอียดงานคุมไลน์ผลิต</h3>
                  <p className="text-[11px] text-slate-400">จัดการหรือลบงานคุมกะที่มอบหมายให้ช่าง</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setQuickMngOp(null);
                  setIsConfirmingDeleteOp(false);
                }}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content Details */}
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>ไลน์การผลิต:</span>
                <span className="font-bold text-amber-300 text-sm">{quickMngOp.line}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>ช่างผู้รับผิดชอบ:</span>
                <span className="font-bold text-slate-200">{quickMngOp.technician}</span>
              </div>
              {quickMngOp.technicians && quickMngOp.technicians.length > 1 && (
                <div className="flex justify-between items-center text-slate-400">
                  <span>ช่างร่วมปฏิบัติการ:</span>
                  <span className="text-slate-300">{quickMngOp.technicians.join(', ')}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-slate-400">
                <span>เวลาทำงาน:</span>
                <span className="font-mono text-slate-200">{quickMngOp.startTime} - {quickMngOp.endTime} ({quickMngOp.duration} นาที)</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>วันที่เริ่มต้น:</span>
                <span className="font-mono text-slate-300">{quickMngOp.date}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>ลักษณะการจ่ายงาน:</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  {quickMngOp.isWeeklyRecurring ? '🔄 วนซ้ำทุกสัปดาห์ (จันทร์-ศุกร์)' : '📅 เฉพาะวันที่กำหนด'}
                </span>
              </div>
            </div>

            {/* Delete Confirmation or Buttons */}
            <div className="pt-2 border-t border-slate-800 flex flex-col space-y-3">
              {isConfirmingDeleteOp ? (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-200">
                  <p className="text-[11px] text-rose-300 font-bold leading-snug">
                    ⚠️ ยืนยันต้องการลบงานคุมไลน์นี้ออกจากตารางงานช่างใช่หรือไม่?
                  </p>
                  <div className="flex gap-1.5 w-full sm:w-auto shrink-0 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDeleteOp(false)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSchedules(prev => prev.filter(s => s.id !== quickMngOp.id));
                        setQuickMngOp(null);
                        setIsConfirmingDeleteOp(false);
                        setToast({ text: `ลบงานคุมไลน์ ${quickMngOp.line} ของช่าง ${quickMngOp.technician} เรียบร้อยแล้ว`, type: 'success' });
                      }}
                      className="bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      ใช่, ลบเลย
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDeleteOp(true)}
                    className="bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 text-rose-400 text-xs px-3.5 py-2.5 rounded-xl transition font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={14} />
                    ลบงานคุมไลน์นี้ (ถอนจ่ายงาน)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickMngOp(null);
                      setIsConfirmingDeleteOp(false);
                    }}
                    className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs px-4 py-2.5 rounded-xl transition font-bold cursor-pointer"
                  >
                    ปิด
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
