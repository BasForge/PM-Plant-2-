import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ScheduleItem, PMScheduleItem, OperationScheduleItem, 
  RepairLog, ImprovementProject, PMPlan, Machine 
} from '../types';
import { 
  Send, UserCheck, Activity, ClipboardList, Wrench, PenTool,
  Clock, CheckCircle, Flame, Calendar, Trash2, CheckSquare, 
  AlertTriangle, ShieldCheck, RefreshCw, Layers, Sparkles, Edit2, X,
  Search, Info, Lock, Unlock, HelpCircle, SlidersHorizontal, Check
} from 'lucide-react';
import { notifyPMDispatched, notifyRepairOpened, notifyRepairClosed } from '../utils/lineNotify';
import { getTodayDateString } from '../utils/pmAlerts';

export const DispatchPage: React.FC = () => {
  const { 
    schedules, setSchedules,
    technicians, pmPlans, machines, setMachines,
    repairs, setRepairs,
    improvements, setImprovements,
    setupLogs, setSetupLogs,
    settings,
    spareParts, setSpareParts
  } = useApp();

  // Active Date selector for dispatching and tracking (defaults to actual today)
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayDateString());
  const [activeFormTab, setActiveFormTab] = useState<'Operation' | 'PM' | 'Repair' | 'Improvement'>('Operation');

  // --- MASTER VIEW TABS - CHOOSE CREATOR OR SUMMARY TAB ---
  const [dispatchTab, setDispatchTab] = useState<'create' | 'summary'>('create');
  const [showDetailedReport, setShowDetailedReport] = useState<boolean>(true);
  const [printReportModal, setPrintReportModal] = useState<boolean>(false);

  // --- SUMMARY TAB FILTERS & SEARCH ---
  const [summarySearch, setSummarySearch] = useState<string>("");
  const [summaryType, setSummaryType] = useState<string>("All");
  const [summaryStatus, setSummaryStatus] = useState<string>("All");
  const [summaryFilterBySelectedDate, setSummaryFilterBySelectedDate] = useState<boolean>(true);

  // --- LOTO DIALOG STATE ---
  const [lotoItem, setLotoItem] = useState<{ type: 'PM' | 'Repair'; item: any } | null>(null);
  const [lotoTagNumber, setLotoTagNumber] = useState<string>("");
  const [lotoBreakerChecked, setLotoBreakerChecked] = useState<boolean>(false);
  const [lotoPneumaticChecked, setLotoPneumaticChecked] = useState<boolean>(false);
  const [lotoSteamChecked, setLotoSteamChecked] = useState<boolean>(false);
  const [lotoTagoutChecked, setLotoTagoutChecked] = useState<boolean>(false);
  const [lotoPpeChecked, setLotoPpeChecked] = useState<boolean>(false);

  // --- REPAIR CLOSING STATE & FORM FIELDS ---
  const [closingRepairItem, setClosingRepairItem] = useState<RepairLog | null>(null);
  const [repDoneTimeField, setRepDoneTimeField] = useState<string>("12:00");
  const [repSymptomsField, setRepSymptomsField] = useState<string>("");
  const [repCorrectionField, setRepCorrectionField] = useState<string>("");
  const [repWhy1Field, setRepWhy1Field] = useState<string>("");
  const [repWhy2Field, setRepWhy2Field] = useState<string>("");
  const [repWhy3Field, setRepWhy3Field] = useState<string>("");
  const [repWhy4Field, setRepWhy4Field] = useState<string>("");
  const [repWhy5Field, setRepWhy5Field] = useState<string>("");
  const [repWhyCount, setRepWhyCount] = useState<number>(3);
  const [repUsedParts, setRepUsedParts] = useState<{ partId: string; quantity: number; pricePerUnit: number; totalCost: number }[]>([]);
  const [repPartSearch, setRepPartSearch] = useState<string>("");
  const [repSelectedPartId, setRepSelectedPartId] = useState<string>("");
  const [repSelectedPartQty, setRepSelectedPartQty] = useState<number>(1);

  // --- SPARE PARTS STATE FOR PM CLOSING ---
  const [pmUsedParts, setPmUsedParts] = useState<{ partId: string; quantity: number; pricePerUnit: number; totalCost: number }[]>([]);
  const [pmPartSearch, setPmPartSearch] = useState<string>("");
  const [pmSelectedPartId, setPmSelectedPartId] = useState<string>("");
  const [pmSelectedPartQty, setPmSelectedPartQty] = useState<number>(1);

  // --- CLOSING PM TASK STATE FOR ACTUAL TIME TRACKING ---
  const [closingPMItem, setClosingPMItem] = useState<PMScheduleItem | null>(null);
  const [actualPMDuration, setActualPMDuration] = useState<number>(0);
  const [pmOvertimeReason, setPmOvertimeReason] = useState<string>('');

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

  // Custom confirmation overlays for deletion of tasks
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);
  const [repairToDelete, setRepairToDelete] = useState<string | null>(null);
  const [improvementToDelete, setImprovementToDelete] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<{ id: string; type: string; label: string; tech: string; duration?: number; isRecurring?: boolean } | null>(null);

  // Multi-Form Validation Status / Success Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // --- FORM FIELDS STATE ---
  // A. Technician Selection (shared)
  const [assignedTech, setAssignedTech] = useState<string>(technicians[0] || "");
  const [assignedTechs, setAssignedTechs] = useState<string[]>(technicians[0] ? [technicians[0]] : []);

  React.useEffect(() => {
    if (technicians.length > 0 && assignedTechs.length === 0) {
      setAssignedTechs([technicians[0]]);
      setAssignedTech(technicians[0]);
    }
  }, [technicians]);

  // 1. OPERATION FORM FIELDS
  const [opLine, setOpLine] = useState<string>("ไลน์ผลิตหลัก A");
  const [opStartTime, setOpStartTime] = useState<string>("08:00");
  const [opEndTime, setOpEndTime] = useState<string>("16:00");
  const [opIsRecurring, setOpIsRecurring] = useState<boolean>(false);
  const [opRecurDays, setOpRecurDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri

  // 2. PM PLAN FORM FIELDS
  const [pmMachine, setPmMachine] = useState<string>(machines[0]?.id || "");
  const [pmPlan, setPmPlan] = useState<string>("");
  const [pmStatus, setPmStatus] = useState<'รอดำเนินการ' | 'กำลังทำ' | 'เสร็จสิ้น'>('รอดำเนินการ');

  // Trigger PMPlan auto-selection when Machine changes
  React.useEffect(() => {
    const matchedPlans = pmPlans.filter(p => p.machineId === pmMachine);
    if (matchedPlans.length > 0) {
      setPmPlan(matchedPlans[0].id);
    } else {
      setPmPlan("");
    }
  }, [pmMachine, pmPlans]);

  // 3. REPAIR FORM FIELDS
  const [repMachine, setRepMachine] = useState<string>(machines[0]?.id || "");
  const [repBreakdownTime, setRepBreakdownTime] = useState<string>("09:00");
  const [repDoneTime, setRepDoneTime] = useState<string>("10:30");
  const [repSymptoms, setRepSymptoms] = useState<string>("เสียงดังผิดปกติบริเวณเพลาขับเคลื่อนมอเตอร์หลัก");
  const [repWhy1, setRepWhy1] = useState<string>("ตลับลูกปืนแบริ่งหลวมและแห้งขาดจาระบี");
  const [repWhy2, setRepWhy2] = useState<string>("อุณหภูมิสภาวะแวดล้อมหน้างานค่อนข้างอบอ้าว");
  const [repWhy3, setRepWhy3] = useState<string>("รอบการบำรุงรักษาอัดจาระบีขาดช่วงเวลาจริง");
  const [repWhy4, setRepWhy4] = useState<string>("");
  const [repWhy5, setRepWhy5] = useState<string>("");
  const [repCorrection, setRepCorrection] = useState<string>("ทำการเปลี่ยนลูกปืนแบริ่งตัวใหม่พร้อมอัดจาระบีทนความร้อนสูง");
  const [repDispatchStatus, setRepDispatchStatus] = useState<'กำลังซ่อม' | 'ปิดงาน'>('ปิดงาน');

  // 4. IMPROVEMENT (KAIZEN) FORM FIELDS
  const [impTitle, setImpTitle] = useState<string>("ปรับปรุงท่อระบายน้ำขังเพื่อป้องกันก๊าซกลิ่นเปรี้ยว");
  const [impDesc, setImpDesc] = useState<string>("ทำการปรับระดับความลาดเอียงเพิ่มสลิปทางระบายน้ำอีก 2% พร้อมซ่อมแซมฝาตะแกรงสแตนเลสให้ได้มาตรฐานฟู้ดเกรด");
  const [impMachine, setImpMachine] = useState<string>(machines[0]?.id || "");
  const [impPlannedEnd, setImpPlannedEnd] = useState<string>("2026-06-15");
  const [impLoggedHours, setImpLoggedHours] = useState<number>(3);

  // Display flash notifications helper
  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  // --- FORM SUBMISSIONS ---
  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (assignedTechs.length === 0) {
      showFeedback('error', 'กรุณาระบุช่างผู้ปฏิบัติการอย่างน้อย 1 คนในการรับงานสั่งการ');
      return;
    }

    const primaryTech = assignedTechs[0] || assignedTech || 'ช่าง 1';
    const techDisplayNames = assignedTechs.join(', ');

    if (activeFormTab === 'Operation') {
      // 1. Dispatched Daily Line Controls (Operation)
      if (!opLine) {
        showFeedback('error', 'กรุณาระบุไลน์ผลิตที่ต้องการมอบหมาย');
        return;
      }
      const [sh, sm] = opStartTime.split(':').map(Number);
      const [eh, em] = opEndTime.split(':').map(Number);
      const duration = (eh * 60 + em) - (sh * 60 + sm);

      if (duration <= 0) {
        showFeedback('error', 'เวลาสิ้นสุดกะการทำงาน ต้องอยู่พิกัดหลังจากเวลาเริ่มต้นเสมอ');
        return;
      }

      const newOp: OperationScheduleItem = {
        id: `sched-dispatch-op-${Date.now()}`,
        type: 'Operation',
        technician: primaryTech,
        technicians: assignedTechs,
        date: selectedDate,
        line: opLine,
        startTime: opStartTime,
        endTime: opEndTime,
        isWeeklyRecurring: opIsRecurring,
        recurringDays: opRecurDays,
        duration: duration
      };

      setSchedules(prev => [...prev, newOp]);
      showFeedback('success', `สั่งการช่าง [${techDisplayNames}] ประจำกะไลน์เครื่องจักรอุตสาหกรรม [${opLine}] เรียบร้อยแล้ว`);
      
    } else if (activeFormTab === 'PM') {
      // 2. Dispatched PM Tasks
      if (!pmPlan) {
        showFeedback('error', 'เครื่องจักรนี้ไม่มีความถี่ระบุ หรือไม่มีแผนบำรุงรักษา PM เผยแพร่ในระบบ');
        return;
      }
      const plan = pmPlans.find(p => p.id === pmPlan);
      if (!plan) return;

      const newPM: PMScheduleItem = {
        id: `sched-dispatch-pm-${Date.now()}`,
        type: 'PM',
        technician: primaryTech,
        technicians: assignedTechs,
        date: selectedDate,
        machineId: pmMachine,
        pmPlanId: pmPlan,
        status: pmStatus,
        duration: plan.ttm
      };

      setSchedules(prev => [...prev, newPM]);
      showFeedback('success', `บันทึกแบบสั่งการใบงาน PM เรื่อง: [${plan.title}] ถ่ายทอดไปยัง [${techDisplayNames}] เรียบร้อยแล้ว`);
      
      // Notify LINE if enabled
      const machineObj = machines.find(m => m.id === pmMachine);
      notifyPMDispatched(newPM, machineObj?.name || '', plan.title).catch(console.error);

    } else if (activeFormTab === 'Repair') {
      // 3. Dispatched Emergency Repair
      if (!repMachine) {
        showFeedback('error', 'กรุณาระบุรหัสเครื่องจักรที่เกิดเหตุขัดข้อง');
        return;
      }
      
      const isPendingCase = repDispatchStatus === 'กำลังซ่อม';
      let duration = 0;
      let rDoneTime = `${selectedDate}T${repDoneTime}`;
      
      if (!isPendingCase) {
        const [bh, bm] = repBreakdownTime.split(':').map(Number);
        const [dh, dm] = repDoneTime.split(':').map(Number);
        duration = (dh * 60 + dm) - (bh * 60 + bm);

        if (duration <= 0) {
          showFeedback('error', 'เวลาแก้ไขซ่อมคืนสภาพต้องอยู่หลังแจ้งขัดข้องจริง');
          return;
        }
      } else {
        rDoneTime = ""; // Clear or empty since it is in progress
      }

      const newRep: RepairLog = {
        id: `rep-dispatch-${Date.now()}`,
        type: 'Repair',
        technician: primaryTech,
        technicians: assignedTechs,
        date: selectedDate,
        machineId: repMachine,
        breakdownTime: `${selectedDate}T${repBreakdownTime}`,
        repairDoneTime: rDoneTime,
        symptoms: repSymptoms.trim() || 'แจ้งซ่อมด่วน',
        why1: isPendingCase ? "" : repWhy1.trim(),
        why2: isPendingCase ? "" : repWhy2.trim(),
        why3: isPendingCase ? "" : repWhy3.trim(),
        why4: isPendingCase ? "" : repWhy4.trim(),
        why5: isPendingCase ? "" : repWhy5.trim(),
        correctiveAction: isPendingCase ? "" : (repCorrection.trim() || 'ดำเนินการปรับปรุงแก้ไขสภาพทันที'),
        duration: duration,
        status: repDispatchStatus
      };

       // Push repair to repairs history
      setRepairs(prev => [newRep, ...prev]);

      // Update machine status in registry: 'เสีย/ซ่อม' if pending, otherwise 'ปกติ'
      setMachines(prev => prev.map(m => {
        if (m.id === repMachine) {
          return { ...m, status: isPendingCase ? 'เสีย/ซ่อม' : 'ปกติ' };
        }
        return m;
      }));

      // Notify LINE if enabled
      const machineObj = machines.find(m => m.id === repMachine);
      if (isPendingCase) {
        showFeedback('success', `เปิดเคสแจ้งซ่อมด่วนฉุกเฉินสเตตัส [กำลังซ่อม] ของอุปกรณ์ [${repMachine}] มอบหมาย [${techDisplayNames}] เรียบร้อยแล้ว`);
        notifyRepairOpened(newRep, machineObj?.name || '').catch(console.error);
      } else {
        showFeedback('success', `จ่ายงานซ่อมด่วนฉุกเฉินและปิดประวัติซ่อม (MTTR) ของอุปกรณ์ [${repMachine}] มอบหมาย [${techDisplayNames}] เรียบร้อยแล้ว`);
        const prefix = repMachine.substring(0, 3);
        const stdMttr = settings.stdMttr[prefix] || 60;
        notifyRepairClosed(newRep, machineObj?.name || '', stdMttr).catch(console.error);
      }

    } else if (activeFormTab === 'Improvement') {
      // 4. Dispatched Kaizen/Improvement Projects
      if (!impTitle.trim()) {
        showFeedback('error', 'กรุณาระบุหัวข้อโครงสร้างโครงการทางวิศวกรรมให้ครบถ้วน');
        return;
      }

      const newImp: ImprovementProject = {
        id: `imp-dispatch-${Date.now()}`,
        type: 'Improvement',
        title: impTitle.trim(),
        description: impDesc.trim(),
        machineId: impMachine || undefined,
        startDate: selectedDate,
        plannedEndDate: impPlannedEnd,
        workLogs: [
          { id: `wl-${Date.now()}`, date: selectedDate, hours: impLoggedHours, note: 'เริ่มรับจ่ายงานและเข้าวิเคราะห์การปรับปรุงหน้างานรอบตรวจประเมิน' }
        ],
        status: 'กำลังดำเนินการ',
        technician: primaryTech,
        technicians: assignedTechs
      };

      setImprovements(prev => [...prev, newImp]);
      showFeedback('success', `สั่งงานปรับปรุง Kaizen: [${impTitle}] ลงโครงการหลัก ให้ปฏิบัติการโดย [${techDisplayNames}]`);
    }
  };

  // --- EDIT MODAL STATES ---
  const [editingItem, setEditingItem] = useState<{
    type: 'PM' | 'Operation' | 'Repair' | 'Improvement';
    item: any;
  } | null>(null);

  // States for PM editing
  const [editPmMachine, setEditPmMachine] = useState<string>("");
  const [editPmPlan, setEditPmPlan] = useState<string>("");
  const [editPmStatus, setEditPmStatus] = useState<'รอดำเนินการ' | 'กำลังทำ' | 'เสร็จสิ้น'>('รอดำเนินการ');
  const [editPmTechs, setEditPmTechs] = useState<string[]>([]);
  const [editPmDuration, setEditPmDuration] = useState<number>(60);

  // States for Operation editing
  const [editOpLine, setEditOpLine] = useState<string>("");
  const [editOpStartTime, setEditOpStartTime] = useState<string>("08:00");
  const [editOpEndTime, setEditOpEndTime] = useState<string>("16:00");
  const [editOpTechs, setEditOpTechs] = useState<string[]>([]);
  const [editOpIsRecurring, setEditOpIsRecurring] = useState<boolean>(false);
  const [editOpRecurDays, setEditOpRecurDays] = useState<number[]>([]);

  // States for Repair editing
  const [editRepMachine, setEditRepMachine] = useState<string>("");
  const [editRepSymptoms, setEditRepSymptoms] = useState<string>("");
  const [editRepCorrective, setEditRepCorrective] = useState<string>("");
  const [editRepTechs, setEditRepTechs] = useState<string[]>([]);
  const [editRepDuration, setEditRepDuration] = useState<number>(30);
  const [editRepBreakdownTime, setEditRepBreakdownTime] = useState<string>("12:00");
  const [editRepDoneTime, setEditRepDoneTime] = useState<string>("13:00");

  // States for Improvement editing
  const [editImpTitle, setEditImpTitle] = useState<string>("");
  const [editImpMachine, setEditImpMachine] = useState<string>("");
  const [editImpDesc, setEditImpDesc] = useState<string>("");
  const [editImpStatus, setEditImpStatus] = useState<'วางแผน' | 'กำลังดำเนินการ' | 'เสร็จแล้ว'>('วางแผน');
  const [editImpTechs, setEditImpTechs] = useState<string[]>([]);
  const [editImpEndDate, setEditImpEndDate] = useState<string>("");

  // Function to initialize edit states when an item is selected
  const handleStartEdit = (type: 'PM' | 'Operation' | 'Repair' | 'Improvement', item: any) => {
    setEditingItem({ type, item });
    
    if (type === 'PM') {
      const pm = item as PMScheduleItem;
      setEditPmMachine(pm.machineId);
      setEditPmPlan(pm.pmPlanId || "");
      setEditPmStatus(pm.status);
      setEditPmTechs(pm.technicians || (pm.technician ? [pm.technician] : []));
      setEditPmDuration(pm.duration);
    } else if (type === 'Operation') {
      const op = item as OperationScheduleItem;
      setEditOpLine(op.line);
      setEditOpStartTime(op.startTime);
      setEditOpEndTime(op.endTime);
      setEditOpTechs(op.technicians || (op.technician ? [op.technician] : []));
      setEditOpIsRecurring(op.isWeeklyRecurring || false);
      setEditOpRecurDays(op.recurringDays || [1, 2, 3, 4, 5]);
    } else if (type === 'Repair') {
      const rep = item as RepairLog;
      const bTime = rep.breakdownTime ? rep.breakdownTime.split('T')[1]?.substring(0, 5) || "09:00" : "09:00";
      const dTime = rep.repairDoneTime ? rep.repairDoneTime.split('T')[1]?.substring(0, 5) || "10:00" : "10:00";
      setEditRepMachine(rep.machineId);
      setEditRepSymptoms(rep.symptoms);
      setEditRepCorrective(rep.correctiveAction);
      setEditRepTechs(rep.technicians || (rep.technician ? [rep.technician] : []));
      setEditRepDuration(rep.duration);
      setEditRepBreakdownTime(bTime);
      setEditRepDoneTime(dTime);
    } else if (type === 'Improvement') {
      const imp = item as ImprovementProject;
      setEditImpTitle(imp.title);
      setEditImpMachine(imp.machineId || "");
      setEditImpDesc(imp.description);
      setEditImpStatus(imp.status);
      setEditImpTechs(imp.technicians || (imp.technician ? [imp.technician] : []));
      setEditImpEndDate(imp.plannedEndDate);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const { type, item } = editingItem;

    if (type === 'PM') {
      if (editPmTechs.length === 0) {
        showFeedback('error', 'กรุณาระบุช่างผู้ปฏิบัติการอย่างน้อย 1 คน');
        return;
      }
      setSchedules(prev => prev.map(s => {
        if (s.id === item.id) {
          return {
            ...s,
            machineId: editPmMachine,
            pmPlanId: editPmPlan,
            status: editPmStatus,
            technician: editPmTechs[0] || 'ช่าง 1',
            technicians: editPmTechs,
            duration: Number(editPmDuration)
          } as PMScheduleItem;
        }
        return s;
      }));
      showFeedback('success', 'แก้ไขตารางแผน PM สำเร็จแล้ว');
    } else if (type === 'Operation') {
      if (editOpTechs.length === 0) {
        showFeedback('error', 'กรุณาระบุช่างผู้ปฏิบัติการอย่างน้อย 1 คน');
        return;
      }
      const [sh, sm] = editOpStartTime.split(':').map(Number);
      const [eh, em] = editOpEndTime.split(':').map(Number);
      let diffMins = (eh * 60 + em) - (sh * 60 + sm);
      if (diffMins < 0) diffMins += 24 * 60;

      setSchedules(prev => prev.map(s => {
        if (s.id === item.id) {
          return {
            ...s,
            line: editOpLine,
            startTime: editOpStartTime,
            endTime: editOpEndTime,
            duration: diffMins,
            technician: editOpTechs[0] || 'ช่าง 1',
            technicians: editOpTechs,
            isWeeklyRecurring: editOpIsRecurring,
            recurringDays: editOpRecurDays
          } as OperationScheduleItem;
        }
        return s;
      }));
      showFeedback('success', 'แก้ไขตารางกะควบคุมไลน์ผลิตสำเร็จแล้ว');
    } else if (type === 'Repair') {
      if (editRepTechs.length === 0) {
        showFeedback('error', 'กรุณาระบุช่างผู้ปฏิบัติการอย่างน้อย 1 คน');
        return;
      }
      const [sh, sm] = editRepBreakdownTime.split(':').map(Number);
      const [eh, em] = editRepDoneTime.split(':').map(Number);
      let diffMins = (eh * 60 + em) - (sh * 60 + sm);
      if (diffMins < 0) diffMins += 24 * 60;

      setRepairs(prev => prev.map(r => {
        if (r.id === item.id) {
          return {
            ...r,
            machineId: editRepMachine,
            symptoms: editRepSymptoms,
            correctiveAction: editRepCorrective,
            duration: editRepDuration || diffMins,
            technician: editRepTechs[0] || 'ช่าง 1',
            technicians: editRepTechs,
            breakdownTime: `${item.date}T${editRepBreakdownTime}`,
            repairDoneTime: `${item.date}T${editRepDoneTime}`
          } as RepairLog;
        }
        return r;
      }));
      showFeedback('success', 'แก้ไขข้อมูลงานซ่อมฉุกเฉินสำเร็จแล้ว');
    } else if (type === 'Improvement') {
      if (editImpTechs.length === 0) {
        showFeedback('error', 'กรุณาระบุช่างผู้ปฏิบัติการอย่างน้อย 1 คน');
        return;
      }
      setImprovements(prev => prev.map(i => {
        if (i.id === item.id) {
          return {
            ...i,
            title: editImpTitle,
            machineId: editImpMachine || undefined,
            description: editImpDesc,
            status: editImpStatus,
            plannedEndDate: editImpEndDate,
            technician: editImpTechs[0] || 'ช่าง 1',
            technicians: editImpTechs
          } as ImprovementProject;
        }
        return i;
      }));
      showFeedback('success', 'แก้ไขข้อมูลโครงการปรับปรุง Kaizen สำเร็จแล้ว');
    }

    setEditingItem(null);
  };

  // --- ACTIONS & MUTATORS FOR RECENT DISPATCHES ON THIS DATE ---
  // Get active tasks assigned to technicians on selectedDate
  const getDispatchedTasksOnDate = () => {
    // 1. PM & Operation Schedules
    const directSchedules = schedules.filter(s => s.date === selectedDate);
    
    // Operations with weekly recurring matching day of week
    const targetDateObj = new Date(selectedDate);
    const dayOfWeek = targetDateObj.getDay();
    const recurringSchedules = schedules.filter(s => {
      if (s.type !== 'Operation') return false;
      const op = s as OperationScheduleItem;
      return op.isWeeklyRecurring && op.recurringDays.includes(dayOfWeek) && op.date <= selectedDate && op.date !== selectedDate;
    });

    const combinedSchedules = [...directSchedules, ...recurringSchedules];

    // 2. Repairs logged on this date
    const dailyRepairs = repairs.filter(r => r.date === selectedDate);

    // 3. Improvements started on this date, or has work log on this date
    const dailyImprovements = improvements.filter(p => {
      const hasLogOnDate = p.workLogs.some(wl => wl.date === selectedDate);
      return p.startDate === selectedDate || hasLogOnDate;
    });

    return { 
      schedules: combinedSchedules, 
      repairs: dailyRepairs, 
      improvements: dailyImprovements 
    };
  };

  const currentDayDispatches = getDispatchedTasksOnDate();
  const totalDispatchedCount = currentDayDispatches.schedules.length + 
                               currentDayDispatches.repairs.length + 
                               currentDayDispatches.improvements.length;

  const handleDeleteScheduleTask = (id: string) => {
    setScheduleToDelete(id);
  };

  const confirmDeleteScheduleTask = () => {
    if (!scheduleToDelete) return;
    setSchedules(prev => prev.filter(s => s.id !== scheduleToDelete));
    showFeedback('success', 'ถอนตารางงานสำเร็จ');
    setScheduleToDelete(null);
  };

  const handleDeleteRepairTask = (id: string) => {
    setRepairToDelete(id);
  };

  const confirmDeleteRepairTask = () => {
    if (!repairToDelete) return;
    setRepairs(prev => prev.filter(r => r.id !== repairToDelete));
    showFeedback('success', 'ลบประวัติซ่อมแซมสำเร็จแล้ว');
    setRepairToDelete(null);
  };

  const handleDeleteImprovementTask = (id: string) => {
    setImprovementToDelete(id);
  };

  const confirmDeleteImprovementTask = () => {
    if (!improvementToDelete) return;
    setImprovements(prev => prev.filter(i => i.id !== improvementToDelete));
    showFeedback('success', 'ยกเลิกโครงสร้างปรับปรุงสำเร็จ');
    setImprovementToDelete(null);
  };

  // Toggle status inside list easily
  const handleTogglePMStatus = (id: string, current: string) => {
    const nextStatus = current === 'รอดำเนินการ' ? 'กำลังทำ' : current === 'กำลังทำ' ? 'เสร็จสิ้น' : 'รอดำเนินการ';
    
    // If transitioning to completed status, intercept to open actual time tracking modal
    if (nextStatus === 'เสร็จสิ้น') {
      const pmItem = schedules.find(s => s.id === id) as PMScheduleItem;
      if (pmItem) {
        setClosingPMItem(pmItem);
        setActualPMDuration(pmItem.actualDuration ?? pmItem.duration); // Default to standard duration
        setPmOvertimeReason(pmItem.overtimeReason || '');
        return;
      }
    }

    setSchedules(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, status: nextStatus } as PMScheduleItem;
      }
      return s;
    }));
    showFeedback('success', `ปรับเปลี่ยนสถานะงาน PM เป็น: ${nextStatus}`);
  };

  const handleSaveClosePM = (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingPMItem) return;

    // Deduct spare parts inventory
    let tempParts = [...spareParts];
    for (const np of pmUsedParts) {
      tempParts = tempParts.map(sp => {
        if (sp.id === np.partId) {
          return { ...sp, quantity: Math.max(0, sp.quantity - np.quantity) };
        }
        return sp;
      });
    }
    setSpareParts(tempParts);

    setSchedules(prev => prev.map(s => {
      if (s.id === closingPMItem.id) {
        return { 
          ...s, 
          status: 'เสร็จสิ้น', 
          actualDuration: actualPMDuration,
          overtimeReason: actualPMDuration > closingPMItem.duration ? pmOvertimeReason.trim() : undefined,
          usedParts: pmUsedParts
        } as PMScheduleItem;
      }
      return s;
    }));

    showFeedback('success', `ปิดงาน PM สำเร็จ บันทึกเวลาปฏิบัติงานจริง ${actualPMDuration} นาที และตัดจ่ายคลังอะไหล่เรียบร้อยแล้ว`);
    setClosingPMItem(null);
    setPmOvertimeReason('');
    setPmUsedParts([]);
  };

  // Helper to add a part during Repair closing
  const handleAddRepairPart = () => {
    if (!repSelectedPartId) return;
    const partObj = spareParts.find(p => p.id === repSelectedPartId);
    if (!partObj) return;

    if (repSelectedPartQty <= 0) {
      showFeedback('error', 'จำนวนอะไหล่ต้องมากกว่า 0');
      return;
    }
    if (repSelectedPartQty > partObj.quantity) {
      showFeedback('error', `สต็อกคงเหลือไม่พอ (มีเพียง ${partObj.quantity} ${partObj.unit})`);
      return;
    }

    const existingIndex = repUsedParts.findIndex(p => p.partId === repSelectedPartId);
    if (existingIndex >= 0) {
      setRepUsedParts(prev => prev.map((item, idx) => {
        if (idx === existingIndex) {
          const newQty = item.quantity + repSelectedPartQty;
          return {
            ...item,
            quantity: newQty,
            totalCost: newQty * item.pricePerUnit
          };
        }
        return item;
      }));
    } else {
      const price = partObj.pricePerUnit || 150;
      setRepUsedParts(prev => [...prev, {
        partId: repSelectedPartId,
        quantity: repSelectedPartQty,
        pricePerUnit: price,
        totalCost: repSelectedPartQty * price
      }]);
    }

    // reset selection
    setRepSelectedPartId("");
    setRepSelectedPartQty(1);
    setRepPartSearch("");
  };

  // Helper to add a part during PM closing
  const handleAddPMPart = () => {
    if (!pmSelectedPartId) return;
    const partObj = spareParts.find(p => p.id === pmSelectedPartId);
    if (!partObj) return;

    if (pmSelectedPartQty <= 0) {
      showFeedback('error', 'จำนวนอะไหล่ต้องมากกว่า 0');
      return;
    }
    if (pmSelectedPartQty > partObj.quantity) {
      showFeedback('error', `สต็อกคงเหลือไม่พอ (มีเพียง ${partObj.quantity} ${partObj.unit})`);
      return;
    }

    const existingIndex = pmUsedParts.findIndex(p => p.partId === pmSelectedPartId);
    if (existingIndex >= 0) {
      setPmUsedParts(prev => prev.map((item, idx) => {
        if (idx === existingIndex) {
          const newQty = item.quantity + pmSelectedPartQty;
          return {
            ...item,
            quantity: newQty,
            totalCost: newQty * item.pricePerUnit
          };
        }
        return item;
      }));
    } else {
      const price = partObj.pricePerUnit || 150;
      setPmUsedParts(prev => [...prev, {
        partId: pmSelectedPartId,
        quantity: pmSelectedPartQty,
        pricePerUnit: price,
        totalCost: pmSelectedPartQty * price
      }]);
    }

    // reset selection
    setPmSelectedPartId("");
    setPmSelectedPartQty(1);
    setPmPartSearch("");
  };

  // Save LOTO safety activation
  const handleSaveLOTO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lotoItem) return;

    const { type, item } = lotoItem;

    if (!lotoTagNumber.trim()) {
      showFeedback('error', 'กรุณาระบุหมายเลขกุญแจ/ป้าย LOTO Tag Number');
      return;
    }
    if (!lotoBreakerChecked || !lotoPneumaticChecked || !lotoTagoutChecked || !lotoPpeChecked) {
      showFeedback('error', 'กรุณายืนยันการปฏิบัติตามมาตรการความปลอดภัยวิศวกรรมให้ครบถ้วน');
      return;
    }

    // Update in schedules or repairs
    if (type === 'PM') {
      setSchedules(prev => prev.map(s => {
        if (s.id === item.id) {
          return {
            ...s,
            status: 'กำลังทำ',
            lotoTag: lotoTagNumber.trim(),
            lotoTime: new Date().toISOString(),
            lotoActive: true
          } as any;
        }
        return s;
      }));
      showFeedback('success', `ล็อคระบบความปลอดภัยเรียบร้อย! เริ่มซ่อมงาน PM ด้วยกุญแจหมายเลข [${lotoTagNumber}]`);
    } else if (type === 'Repair') {
      setRepairs(prev => prev.map(r => {
        if (r.id === item.id) {
          return {
            ...r,
            status: 'กำลังซ่อม',
            lotoTag: lotoTagNumber.trim(),
            lotoTime: new Date().toISOString(),
            lotoActive: true
          } as any;
        }
        return r;
      }));
      showFeedback('success', `ล็อคระบบความปลอดภัยเรียบร้อย! เริ่มซ่อมด่วนกะทันหันด้วยกุญแจหมายเลข [${lotoTagNumber}]`);
    }

    setLotoItem(null);
  };

  // Close repair case with detailed information
  const handleSaveCloseRepair = (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingRepairItem) return;

    const [dh, dm] = repDoneTimeField.split(':').map(Number);
    const bDateStr = closingRepairItem.breakdownTime ? closingRepairItem.breakdownTime.split('T')[0] : selectedDate;
    const bTimeStr = closingRepairItem.breakdownTime ? closingRepairItem.breakdownTime.split('T')[1]?.substring(0, 5) || "09:00" : "09:00";
    const [bh, bm] = bTimeStr.split(':').map(Number);
    
    let duration = (dh * 60 + dm) - (bh * 60 + bm);
    if (duration <= 0) {
      showFeedback('error', 'เวลาซ่อมบำรุงแล้วเสร็จ ต้องอยู่พิกัดหลังจากเวลาเริ่มต้นเสมอ');
      return;
    }

    // Deduct spare parts inventory
    let tempParts = [...spareParts];
    for (const np of repUsedParts) {
      tempParts = tempParts.map(sp => {
        if (sp.id === np.partId) {
          return { ...sp, quantity: Math.max(0, sp.quantity - np.quantity) };
        }
        return sp;
      });
    }
    setSpareParts(tempParts);

    setRepairs(prev => prev.map(r => {
      if (r.id === closingRepairItem.id) {
        return {
          ...r,
          status: 'ปิดงาน',
          repairDoneTime: `${bDateStr}T${repDoneTimeField}`,
          symptoms: repSymptomsField.trim() || r.symptoms,
          why1: repWhy1Field.trim(),
          why2: repWhy2Field.trim(),
          why3: repWhy3Field.trim(),
          why4: repWhy4Field.trim(),
          why5: repWhy5Field.trim(),
          correctiveAction: repCorrectionField.trim() || 'ทำความสะอาดเครื่องและทดสอบเดินระบบ',
          duration: duration,
          usedParts: repUsedParts,
          lotoActive: false // clear LOTO on close
        } as RepairLog;
      }
      return r;
    }));

    // Update machine status back to normal
    setMachines(prev => prev.map(m => {
      if (m.id === closingRepairItem.machineId) {
        return { ...m, status: 'ปกติ' };
      }
      return m;
    }));

    showFeedback('success', `ปิดเคสงานซ่อม Breakdown อุปกรณ์ [${closingRepairItem.machineId}] และเก็บประวัติ MTTR ${duration} นาที เรียบร้อยแล้ว`);
    setClosingRepairItem(null);
  };

  const handleToggleImpStatus = (id: string, current: string) => {
    const nextStatus = current === 'วางแผน' ? 'กำลังดำเนินการ' : current === 'กำลังดำเนินการ' ? 'เสร็จแล้ว' : 'วางแผน';
    setImprovements(prev => prev.map(i => {
      if (i.id === id) {
        return { ...i, status: nextStatus } as ImprovementProject;
      }
      return i;
    }));
    showFeedback('success', `ปรับสเตตัสโครงการปรับปรุงเป็น: ${nextStatus}`);
  };

  // --- CALC TECHNICIAN LOADS TODAY (To help dispatching logic) ---
  const getTechnicianLoadsMap = () => {
    const tracker: Record<string, { 
      total: number; 
      capacity: number; 
      percent: number; 
      list: { id: string; type: 'Operation' | 'PM' | 'Repair' | 'Improvement' | 'Setup'; label: string; duration?: number; tech: string; isRecurring?: boolean }[] 
    }> = {};
    const dayOfWeek = new Date(selectedDate + 'T12:00:00').getDay();

    technicians.forEach(tech => {
      let pmMins = 0;
      let opMins = 0;
      let repMins = 0;
      let impMins = 0;
      const tasksList: { id: string; type: 'Operation' | 'PM' | 'Repair' | 'Improvement' | 'Setup'; label: string; duration?: number; tech: string; isRecurring?: boolean }[] = [];

      // 1. PM and Operations
      schedules.forEach(s => {
        const isMySchedule = s.technicians ? s.technicians.includes(tech) : s.technician === tech;
        if (!isMySchedule) return;
        if (s.type === 'PM' && s.date === selectedDate) {
          pmMins += s.duration;
          tasksList.push({
            id: s.id,
            type: 'PM',
            label: `🔵 PM: ${s.machineId}`,
            duration: s.duration,
            tech
          });
        } else if (s.type === 'Operation') {
          const op = s as OperationScheduleItem;
          if (op.date === selectedDate) {
            opMins += op.duration;
            tasksList.push({
              id: op.id,
              type: 'Operation',
              label: `🟡 คุมไลน์ ${op.line}`,
              duration: op.duration,
              tech,
              isRecurring: false
            });
          } else if (op.isWeeklyRecurring && op.recurringDays.includes(dayOfWeek) && op.date <= selectedDate) {
            opMins += op.duration;
            tasksList.push({
              id: op.id,
              type: 'Operation',
              label: `🟡 คุมกะสัปดาห์ ${op.line}`,
              duration: op.duration,
              tech,
              isRecurring: true
            });
          }
        }
      });

      // 2. Repairs
      repairs.forEach(r => {
        const isMyRepair = r.technicians ? r.technicians.includes(tech) : r.technician === tech;
        if (isMyRepair && r.date === selectedDate) {
          repMins += r.duration;
          tasksList.push({
            id: r.id,
            type: 'Repair',
            label: `🔴 ซ่อม: ${r.machineId}`,
            duration: r.duration,
            tech
          });
        }
      });

      // 3. Improvements
      improvements.forEach(p => {
        const isMyImprovement = p.technicians ? p.technicians.includes(tech) : p.technician === tech;
        if (!isMyImprovement) return;
        p.workLogs.forEach(wl => {
          if (wl.date === selectedDate) {
            impMins += wl.hours * 60;
            tasksList.push({
              id: p.id,
              type: 'Improvement',
              label: `🟣 Kaizen: ${p.title.substring(0, 15)}...`,
              duration: wl.hours * 60,
              tech
            });
          }
        });
      });

      // 4. Setup and Adjustments
      let setupMins = 0;
      if (setupLogs) {
        setupLogs.forEach(s => {
          const isMySetup = s.technicians && s.technicians.includes(tech);
          if (isMySetup && s.date === selectedDate) {
            setupMins += s.totalDuration;
            tasksList.push({
              id: s.id,
              type: 'Setup',
              label: `⚙️ ${s.type === 'Setupก่อนผลิต' ? 'เซ็ต' : 'จูน'}: ${s.machineId} (${s.totalDuration}m)`,
              duration: s.totalDuration,
              tech
            });
          }
        });
      }

      const totalMins = pmMins + opMins + repMins + impMins + setupMins;
      const limitMins = settings.workingHoursPerDay * 60;
      const utilization = Math.round((totalMins / limitMins) * 100);

      tracker[tech] = {
        total: totalMins,
        capacity: limitMins,
        percent: utilization,
        list: tasksList
      };
    });

    return tracker;
  };

  const technicianLoads = getTechnicianLoadsMap();

  // Create unified work orders list
  const getUnifiedWorkOrders = () => {
    const list: any[] = [];

    // 1. Operations
    schedules.filter(s => s.type === 'Operation').forEach(op => {
      const lineOp = op as OperationScheduleItem;
      list.push({
        id: lineOp.id,
        type: 'Operation',
        title: `ประจำการคุมกะไลน์ผลิต ${lineOp.line}`,
        machineId: '-',
        technicians: lineOp.technicians || [lineOp.technician],
        date: lineOp.date,
        status: 'เสร็จสิ้น',
        duration: lineOp.duration,
        rawItem: lineOp
      });
    });

    // 2. PM
    schedules.filter(s => s.type === 'PM').forEach(pm => {
      const pmItem = pm as PMScheduleItem;
      const plan = pmPlans.find(p => p.id === pmItem.pmPlanId);
      list.push({
        id: pmItem.id,
        type: 'PM',
        title: plan?.title || 'งานบำรุงรักษาเชิงป้องกัน PM',
        machineId: pmItem.machineId,
        technicians: pmItem.technicians || [pmItem.technician],
        date: pmItem.date,
        status: pmItem.status,
        duration: pmItem.duration,
        actualDuration: pmItem.actualDuration,
        usedParts: pmItem.usedParts || [],
        lotoTag: (pmItem as any).lotoTag || "",
        lotoActive: (pmItem as any).lotoActive || false,
        rawItem: pmItem
      });
    });

    // 3. Repairs
    repairs.forEach(rep => {
      list.push({
        id: rep.id,
        type: 'Repair',
        title: rep.symptoms || 'ซ่อม Breakdown ด่วน',
        machineId: rep.machineId,
        technicians: rep.technicians || [rep.technician],
        date: rep.date,
        status: rep.status || 'ปิดงาน',
        duration: rep.duration,
        usedParts: rep.usedParts || [],
        lotoTag: (rep as any).lotoTag || "",
        lotoActive: (rep as any).lotoActive || false,
        rawItem: rep
      });
    });

    // 4. Improvements
    improvements.forEach(imp => {
      list.push({
        id: imp.id,
        type: 'Improvement',
        title: imp.title,
        machineId: imp.machineId || '-',
        technicians: imp.technicians || [imp.technician],
        date: imp.startDate,
        status: imp.status,
        duration: imp.workLogs.reduce((sum, wl) => sum + wl.hours * 60, 0),
        rawItem: imp
      });
    });

    return list;
  };

  const unifiedList = getUnifiedWorkOrders();

  // Compute total counts based on unified list
  const totalCount = unifiedList.length;
  const pendingCount = unifiedList.filter(u => u.status === 'รอดำเนินการ' || u.status === 'กำลังซ่อม' || u.status === 'วางแผน').length;
  const activeLotoCount = unifiedList.filter(u => u.lotoActive).length;
  const completedCount = unifiedList.filter(u => u.status === 'เสร็จสิ้น' || u.status === 'ปิดงาน' || u.status === 'เสร็จแล้ว').length;

  // Apply filters
  const filteredUnified = unifiedList.filter(item => {
    // A. Search
    if (summarySearch.trim() !== "") {
      const q = summarySearch.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchMachine = item.machineId.toLowerCase().includes(q);
      const matchId = item.id.toLowerCase().includes(q);
      const matchTechs = item.technicians.some((t: string) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchMachine && !matchId && !matchTechs) {
        return false;
      }
    }

    // B. Type
    if (summaryType !== 'All' && item.type !== summaryType) {
      return false;
    }

    // C. Status
    if (summaryStatus !== 'All') {
      if (summaryStatus === 'Pending') {
        // Not started yet
        const isPending = item.status === 'รอดำเนินการ' || item.status === 'วางแผน' || (item.status === 'กำลังซ่อม' && !item.lotoActive);
        if (!isPending) return false;
      } else if (summaryStatus === 'InProgress') {
        // Doing / LOTO
        const isInProgress = item.status === 'กำลังทำ' || item.status === 'กำลังดำเนินการ' || item.lotoActive;
        if (!isInProgress) return false;
      } else if (summaryStatus === 'Completed') {
        const isDone = item.status === 'เสร็จสิ้น' || item.status === 'ปิดงาน' || item.status === 'เสร็จแล้ว';
        if (!isDone) return false;
      }
    }

    // D. Date
    if (summaryFilterBySelectedDate && item.date !== selectedDate) {
      return false;
    }

    return true;
  });

  // Calculate detailed statistics for our reports
  const statsByType = (() => {
    const types = ['PM', 'Repair', 'Operation', 'Improvement'];
    return types.map(t => {
      const items = filteredUnified.filter(item => item.type === t);
      const total = items.length;
      const completed = items.filter(u => u.status === 'เสร็จสิ้น' || u.status === 'ปิดงาน' || u.status === 'เสร็จแล้ว').length;
      const pending = items.filter(u => u.status === 'รอดำเนินการ' || u.status === 'วางแผน' || u.status === 'กำลังซ่อม').length;
      const inProgress = total - completed - pending;
      const totalDuration = items.reduce((sum, item) => sum + (item.actualDuration ?? item.duration), 0);
      return {
        type: t,
        total,
        completed,
        pending,
        inProgress,
        totalDuration,
        avgDuration: total > 0 ? Math.round(totalDuration / total) : 0
      };
    });
  })();

  const statsByTech = (() => {
    const techStats: Record<string, { total: number; completed: number; pending: number; totalDuration: number }> = {};
    
    technicians.forEach(t => {
      techStats[t] = { total: 0, completed: 0, pending: 0, totalDuration: 0 };
    });

    filteredUnified.forEach(item => {
      const techs = item.technicians || [];
      techs.forEach((t: string) => {
        if (!techStats[t]) {
          techStats[t] = { total: 0, completed: 0, pending: 0, totalDuration: 0 };
        }
        techStats[t].total += 1;
        const isDone = item.status === 'เสร็จสิ้น' || item.status === 'ปิดงาน' || item.status === 'เสร็จแล้ว';
        const isPending = item.status === 'รอดำเนินการ' || item.status === 'วางแผน' || item.status === 'กำลังซ่อม';
        if (isDone) {
          techStats[t].completed += 1;
        } else if (isPending) {
          techStats[t].pending += 1;
        }
        techStats[t].totalDuration += (item.actualDuration ?? item.duration);
      });
    });

    return Object.entries(techStats).map(([name, data]) => ({
      name,
      ...data,
      inProgress: data.total - data.completed - data.pending,
      rate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0
    })).sort((a, b) => b.total - a.total);
  })();

  const statsByMachine = (() => {
    const machineStats: Record<string, { total: number; completed: number; totalDuration: number }> = {};
    filteredUnified.forEach(item => {
      const mId = item.machineId;
      if (!mId || mId === '-') return;
      if (!machineStats[mId]) {
        machineStats[mId] = { total: 0, completed: 0, totalDuration: 0 };
      }
      machineStats[mId].total += 1;
      const isDone = item.status === 'เสร็จสิ้น' || item.status === 'ปิดงาน' || item.status === 'เสร็จแล้ว';
      if (isDone) {
        machineStats[mId].completed += 1;
      }
      machineStats[mId].totalDuration += (item.actualDuration ?? item.duration);
    });

    return Object.entries(machineStats)
      .map(([machineId, data]) => ({
        machineId,
        ...data,
        avgDuration: Math.round(data.totalDuration / data.total)
      }))
      .sort((a, b) => b.total - a.total);
  })();

  return (
    <div className="space-y-6" id="dispatch-page-container">
      
      {/* Upper header styling with high industrial fidelity */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/60 p-5 border border-slate-800 rounded-2xl relative">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 px-2.5 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-full text-[10px] font-mono font-extrabold text-cyan-400 uppercase tracking-widest">
              Live Work Order Assign Terminal
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-100 tracking-tight mt-1.5 flex items-center gap-2">
            📋 ศูนย์รวมสั่งงานช่างและบริหารกำลังแผนก (Work Order Dispatch Console)
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">
            เครื่องมือสั่งการช่างทั้ง 4 หมวดงาน: หน้างานเครื่องจักรไลน์กะประจำวัน, แผนงานบำรุงรักษาเชิงป้อง PM, ปรับปรุง Kaizen, และลุยซ่อมบำรุงด่วน (Breakdown)
          </p>
        </div>

        {/* Selected Date Indicator & Sync */}
        <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 self-stretch md:self-auto justify-center shrink-0">
          <Calendar size={14} className="text-cyan-400" />
          <label className="text-[11px] font-bold text-slate-400">วันที่ดำเนินสั่งการ:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-900 border border-slate-750 text-xs text-cyan-300 font-mono font-bold rounded px-2.5 py-1 focus:outline-none focus:border-cyan-500 max-w-[135px] cursor-pointer"
          />
        </div>
      </div>

      {/* MASTER PAGE TABS (Sub-pages layout matching user's Request 3) */}
      <div className="flex bg-slate-900/60 p-1 border border-slate-800 rounded-xl max-w-md" id="dispatch-subtabs-nav">
        <button
          onClick={() => setDispatchTab('create')}
          className={`flex-1 py-2 text-xs font-black rounded-lg transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${
            dispatchTab === 'create'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Send size={14} />
          จ่ายงานใหม่ (Dispatch Control)
        </button>
        <button
          onClick={() => setDispatchTab('summary')}
          className={`flex-1 py-2 text-xs font-black rounded-lg transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${
            dispatchTab === 'summary'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          id="dispatch-summary-subtab"
        >
          <ClipboardList size={14} />
          สรุปและติดตามสถานะงาน (Job Summary Terminal)
        </button>
      </div>

      {/* FLASH NOTIFICATION BLOCK */}
      {feedback && (
        <div 
          className={`p-3.5 rounded-xl border flex items-center gap-3 text-xs font-bold animate-in fade-in duration-200 shadow-md ${
            feedback.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
          id="dispatch-alert"
        >
          {feedback.type === 'success' ? <ShieldCheck size={16} /> : <AlertTriangle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {dispatchTab === 'create' && (
        /* GRID COLUMN SECTION: LEFT FOR DISPATCH ORDERING FORMS, RIGHT FOR LIVE TECHNICIANS WORKLOADS & TASKS TODAY */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LEFT COMPONENT: DISPATCH FORM BUILDER (Col span 7) */}
        <div className="xl:col-span-7 bg-slate-800 border border-slate-700/80 p-5 rounded-2xl flex flex-col justify-between" id="dispatch-form-card">
          
          <div>
            <div className="flex items-center justify-between border-b border-slate-750 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                  <Send size={15} className="text-cyan-400" />
                  สั่งจ่ายงานใหม่ (New Work Order Dispatcher)
                </h3>
                <p className="text-[11px] text-slate-400">เลือกระบบงานที่ต้องการส่งมอบให้ช่างปฏิบัติราชการบำรุงรักษา</p>
              </div>

              {/* Dynamic counters */}
              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-slate-950/80 rounded border border-slate-700 font-mono text-slate-400">
                DATE: {selectedDate}
              </span>
            </div>

            {/* TAB SELECTORS BETWEEN THE 4 INDUSTRIAL TASKS */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-950 border border-slate-850 rounded-xl mb-5">
              <button
                onClick={() => setActiveFormTab('Operation')}
                className={`py-2 text-[10.5px] font-extrabold rounded-lg transition-all flex flex-col items-center justify-center gap-1.5 ${
                  activeFormTab === 'Operation'
                    ? 'bg-slate-900 border border-slate-750 text-amber-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Activity size={15} />
                คุมไลน์ผลิตกะ
              </button>

              <button
                onClick={() => setActiveFormTab('PM')}
                className={`py-2 text-[10.5px] font-extrabold rounded-lg transition-all flex flex-col items-center justify-center gap-1.5 ${
                  activeFormTab === 'PM'
                    ? 'bg-slate-900 border border-slate-750 text-indigo-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ClipboardList size={15} />
                งานตามแผน PM
              </button>

              <button
                onClick={() => setActiveFormTab('Repair')}
                className={`py-2 text-[10.5px] font-extrabold rounded-lg transition-all flex flex-col items-center justify-center gap-1.5 ${
                  activeFormTab === 'Repair'
                    ? 'bg-slate-900 border border-slate-750 text-rose-455 text-red-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Wrench size={15} />
                งานซ่อม Breakdown
              </button>

              <button
                onClick={() => setActiveFormTab('Improvement')}
                className={`py-2 text-[10.5px] font-extrabold rounded-lg transition-all flex flex-col items-center justify-center gap-1.5 ${
                  activeFormTab === 'Improvement'
                    ? 'bg-slate-900 border border-slate-750 text-purple-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <PenTool size={15} />
                งานพัฒนา Kaizen
              </button>
            </div>

            {/* SHARED TECHNICIAN SELECT BOX */}
            <div className="bg-slate-900/40 p-3.5 border border-slate-750/70 rounded-xl mb-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-extrabold text-[#38bdf8] flex items-center gap-1">
                  <UserCheck size={14} />
                  1. เลือกพนักงานช่างผู้ปฏิบัติการ (มอบหมายร่วมกันได้หลายคน/Multi-Assign) *
                </label>
                <span className="font-mono text-[10px] text-cyan-400 font-bold">เลือกแล้ว: {assignedTechs.length} คน</span>
              </div>
              
              {/* Scrollable grid area for technicians with load labels */}
              <div className="max-h-[160px] overflow-y-auto border border-slate-750 bg-slate-950 rounded-lg p-2.5 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {technicians.map(t => {
                  const isChecked = assignedTechs.includes(t);
                  const currentLoad = technicianLoads[t]?.percent || 0;
                  const workloadEmoji = currentLoad >= 100 ? '🔥' : currentLoad >= 80 ? '⚡' : '✔';
                  
                  return (
                    <label 
                      key={t} 
                      className={`flex items-center gap-1.5 p-2 rounded-md border cursor-pointer select-none transition-all ${
                        isChecked 
                          ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 font-bold shadow-sm' 
                          : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:text-slate-300 hover:border-slate-750'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setAssignedTechs(prev => {
                            const newTechs = prev.includes(t) 
                              ? prev.filter(x => x !== t) 
                              : [...prev, t];
                            
                            // Keep assignedTech state in sync with the primary (first selected) technician
                            if (newTechs.length > 0) {
                              setAssignedTech(newTechs[0]);
                            } else {
                              setAssignedTech('');
                            }
                            return newTechs;
                          });
                        }}
                        className="w-3.5 h-3.5 rounded accent-cyan-500 cursor-pointer"
                      />
                      <div className="flex flex-col min-w-0 flex-1 leading-tight">
                        <span className="text-[11px] truncate font-medium">{t}</span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {workloadEmoji} {currentLoad}% load
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* DYNAMIC FORM INNER VIEW */}
            <form onSubmit={handleDispatch} className="space-y-4" id="dispatch-inputs-layout">
              <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest border-b border-slate-750/60 pb-1 flex items-center gap-1">
                <Layers size={11} />
                2. กรอกรายละเอียดงานชนิด: {activeFormTab === 'Operation' ? 'ไลน์กะผลิต' : activeFormTab === 'PM' ? ' Preventive Maintenance' : activeFormTab === 'Repair' ? 'งานซ่อมบำรุง MTTR' : 'ปรับปรุง Kaizen'}
              </p>

              {/* A. OPERATION (DAILY MACHINE CONTROL) TAB VIEW */}
              {activeFormTab === 'Operation' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-200">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-400">เลือกไลน์การผลิต หรือระบุระบบประจำการ (Line Name/Area)*</label>
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                      value={opLine}
                      onChange={(e) => setOpLine(e.target.value)}
                      placeholder="เช่น ไลน์ผลิตข้าวสวย A, คลังแช่แข็งเป็ดตู้อบ"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">เวลาเริ่มกะ (Start Time)</label>
                    <input
                      type="time"
                      className="w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
                      value={opStartTime}
                      onChange={(e) => setOpStartTime(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">เวลาเลิกกะ (End Time)</label>
                    <input
                      type="time"
                      className="w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
                      value={opEndTime}
                      onChange={(e) => setOpEndTime(e.target.value)}
                    />
                  </div>

                  {/* Recurring Check */}
                  <div className="sm:col-span-2 bg-slate-900/30 p-2.5 border border-slate-750/40 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-slate-300">เป็นตารางงานวนซ้ำรายสัปดาห์ (Weekly Recurring Schedule)</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">ระบบจะจัดสรรให้ช่างผู้ใช้งานทำงานนี้อัตโนมัติในวันถัดๆ ไปตามกะผลิต</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={opIsRecurring} 
                        onChange={(e) => setOpIsRecurring(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                  </div>
                </div>
              )}

              {/* B. PM TASK FORM */}
              {activeFormTab === 'PM' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">1. เลือกเครื่องจักรตามทะเบียนอุตสาหกรรม (Machine)*</label>
                    <select
                      value={pmMachine}
                      onChange={(e) => setPmMachine(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      {machines.map(m => (
                        <option key={m.id} value={m.id}>{m.id} - {m.name} ({m.lineGroup})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">2. แผน PM ประจำเครื่องจักรอัตโนมัติ (Tied PM Plan)*</label>
                    <select
                      value={pmPlan}
                      onChange={(e) => setPmPlan(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                      disabled={!pmPlan}
                    >
                      {pmPlans.filter(p => p.machineId === pmMachine).length > 0 ? (
                        pmPlans.filter(p => p.machineId === pmMachine).map(p => (
                          <option key={p.id} value={p.id}>{p.title} ({p.frequency}) - {p.ttm} นาที</option>
                        ))
                      ) : (
                        <option value="">❌ ไม่มีสูตรหรือแผนงานผูกกับเครื่องจักรนี้</option>
                      )}
                    </select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-400">สถานะเริ่มต้นสั่งงาน (Initial Status)</label>
                    <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-lg">
                      {(['รอดำเนินการ', 'กำลังทำ', 'เสร็จสิ้น'] as const).map(st => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setPmStatus(st)}
                          className={`py-1 text-[10.5px] rounded-md font-bold transition-all ${
                            pmStatus === st
                              ? st === 'เสร็จสิ้น' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : st === 'กำลังทำ' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                                : 'bg-slate-800 border border-slate-700 text-slate-100'
                              : 'text-slate-450 hover:text-slate-200'
                          }`}
                        >
                          {st === 'เสร็จสิ้น' ? '✔ ' : st === 'กำลังทำ' ? '⏱ ' : '💤 '}{st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* C. EMERGENCY REPAIR (BREAKDOWN) TASK */}
              {activeFormTab === 'Repair' && (
                <div className="space-y-3.5 animate-in fade-in duration-200 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11.5px] font-semibold text-rose-400">เครื่องจักรเสียหาย*</label>
                      <select
                        value={repMachine}
                        onChange={(e) => setRepMachine(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-750 rounded-lg px-2.5 py-1.8 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                      >
                        {machines.map(m => (
                          <option key={m.id} value={m.id}>{m.id} - {m.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11.5px] font-semibold text-slate-400">เวลาที่เสีย (Breakdown)</label>
                      <input
                        type="time"
                        value={repBreakdownTime}
                        onChange={(e) => setRepBreakdownTime(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-750 rounded-lg px-2.5 py-1.5 font-mono text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11.5px] font-semibold text-slate-400">เวลาซ่อมเสร็จ (Resolved)</label>
                      <input
                        type="time"
                        value={repDoneTime}
                        onChange={(e) => setRepDoneTime(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-750 rounded-lg px-2.5 py-1.5 font-mono text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11.5px] font-semibold text-slate-400">อาการขัดข้องหลักหน้างาน (Symptoms Description)*</label>
                    <input
                      type="text"
                      value={repSymptoms}
                      onChange={(e) => setRepSymptoms(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none"
                      placeholder="อาการเสียของเครื่องจักร เช่น โซ่ขาด มอเตอร์ไม่หมุน"
                      required
                    />
                  </div>

                  {/* 3 Why-Why Mini questions for immediate industrial logic archiving */}
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-750/70 space-y-2.5">
                    <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles size={11} />
                      ระบุสาระ Why-Why Root Cause (วิเคราะห์แก้ไขปัญหา)
                    </p>
                    <div className="grid grid-cols-1 s:grid-cols-3 gap-2 text-[10px]">
                      <div className="space-y-1">
                        <span className="text-slate-500 font-bold block">Why 1: ทำไมจึงหยุดชำรุด?</span>
                        <input
                          type="text"
                          value={repWhy1}
                          onChange={(e) => setRepWhy1(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300"
                          placeholder="เช่น ตลับแบริ่งสลายตัว"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 font-bold block">Why 2: ทำไมจึงสลายตัว?</span>
                        <input
                          type="text"
                          value={repWhy2}
                          onChange={(e) => setRepWhy2(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300"
                          placeholder="เช่น อุณหภูมิพัดลมหล่อเย็นไม่ติด"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 font-bold block">Why 3 (มาตรการ): ทำไมพัดลมไม่ติด?</span>
                        <input
                          type="text"
                          value={repWhy3}
                          onChange={(e) => setRepWhy3(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300"
                          placeholder="เช่น มีน้ำเกลือเข้าไปกัดหน้าสัมผัสขดลวด"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11.5px] font-semibold text-slate-400">มาตรการแก้ไขและการสั่งซื้ออะไหล่เปลี่ยนถ่าย (Corrective Action)</label>
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none"
                      value={repCorrection}
                      onChange={(e) => setRepCorrection(e.target.value)}
                      placeholder="การซ่อมและป้องกัน เช่น ปิดทับฝาซิลิโคนพร้อมเคลือบล้างน้ำสัมผัส"
                    />
                  </div>
                </div>
              )}

              {/* D. IMPROVEMENT KAIZEN TASK FORM */}
              {activeFormTab === 'Improvement' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-200">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-400">ชื่อแผนโครงสร้างปรับปรุง Kaizen (Project Title)*</label>
                    <input
                      type="text"
                      value={impTitle}
                      onChange={(e) => setImpTitle(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                      placeholder="เขียนระบุ เช่น เสริมขากรอบสแตนเลสเครื่องติดฉลากฝาปิด"
                      required
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-400">รายละเอียดขอบเขตการดัดแปลง (Description/Specs)</label>
                    <textarea
                      value={impDesc}
                      onChange={(e) => setImpDesc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 h-16 resize-none"
                      placeholder="อธิบายว่าต้องการปรับปรุงอะไร อย่างไรบ้าง..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">เครื่องจักรที่ดัดแปลงปรับปรุง</label>
                    <select
                      value={impMachine}
                      onChange={(e) => setImpMachine(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="">-- ไม่จำกัดเครื่องจักรเฉพาะ (ท่อ/อาคาร) --</option>
                      {machines.map(m => (
                        <option key={m.id} value={m.id}>{m.id} - {m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">วันที่คาดหมายว่าจะส่งมอบเสร็จสิ้น (Target End Date)</label>
                    <input
                      type="date"
                      value={impPlannedEnd}
                      onChange={(e) => setImpPlannedEnd(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-400">ชั่วโมงทำงานเปิดตัววันนี้ (Worked Hours today) - ชั่วโมง</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      className="w-full bg-slate-900 border border-slate-750 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none"
                      value={impLoggedHours}
                      onChange={(e) => setImpLoggedHours(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}

              {/* Submit Dispatch Button */}
              <button
                type="submit"
                id="btn-submit-dispatch"
                className="w-full mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs uppercase py-3 rounded-xl transition duration-150 shadow-lg shadow-cyan-500/10 focus:ring-2 focus:ring-cyan-400 cursor-pointer"
              >
                <Send size={14} />
                นำส่งใบกะและสั่งการลงปฏิทินปฏิบัติงานช่าง (Dispatch Work Order)
              </button>
            </form>
          </div>

          {/* Guide tip line */}
          <div className="mt-5 p-3.5 bg-slate-900/60 border border-slate-750/90 rounded-xl text-[10.5px] text-slate-400 flex items-start gap-2">
            <Clock size={16} className="text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-200">ข้อควรจำของฝ่ายมาสเตอร์แพลนเนอร์อุตสาหกรรม (Instruction tips)</p>
              <p className="mt-0.5 leading-relaxed text-slate-400">
                เมื่อสั่งจ่ายงานเสร็จ ระบบจะนำข้อมูลไปคำนวณอัตราความคุ้มค่าและกระจายกำลังช่าง (Workload) บนแดชบอร์ดสถิติสด รวมถึงปักหมุดสเตตัสในหน้าปฏิทินหลักทันที หลีกเลี่ยงสั่งงานให้ช่างที่เกินลิมิต 100% (480 นาที / กะ 8 ชม.) เพื่อคุณลักษณะความปลอดภัยมาตรฐานโรงงาน GMP
              </p>
            </div>
          </div>

        </div>

        {/* RIGHT COMPONENT: REAL-TIME TECHNICIAN LOADS & DISPATCH BOARD SUMMARY ON THIS DATE (Col span 5) */}
        <div className="xl:col-span-5 space-y-6">
          
          {/* Box 1: Technicians Load status specifically "TODAY / SELECTED DATE" */}
          <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-2xl flex flex-col justify-between" id="dispatch-load-card">
            <div>
              <div className="border-b border-slate-750 pb-3 mb-4 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                    <UserCheck size={16} className="text-[#38bdf8]" />
                    ภาระสะสมรายช่าง ประจำวันที่เลือก
                  </h3>
                  <p className="text-[10.5px] text-slate-450 mt-0.5">พิกัดสะสมตารางงานเป้าหมาย {settings.workingHoursPerDay} ชม. (480 นาที)</p>
                </div>
                
                <span className="text-[10px] bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/20 px-2.5 py-0.5 rounded-full font-mono font-bold">
                  {selectedDate}
                </span>
              </div>

              {/* Grid or scroll area of technicians current workloads */}
              <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                {technicians.map(t => {
                  const data = technicianLoads[t];
                  const percentage = data ? data.percent : 0;
                  const minutes = data ? data.total : 0;
                  const limit = data ? data.capacity : 480;
                  const tasks = data ? data.list : [];

                  const stateColor = percentage > 100 ? 'text-red-400 font-bold bg-red-500/10' : 
                                     percentage >= 80 ? 'text-amber-400 font-bold bg-amber-500/10' : 
                                     percentage > 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 bg-slate-900/40';

                  return (
                    <div key={t} className="bg-slate-900/45 p-3 rounded-xl border border-slate-750/90 hover:border-slate-700 transition duration-150 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-200 block">{t}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${stateColor}`}>
                          {minutes} / {limit} นาที ({percentage}%)
                        </span>
                      </div>

                      {/* Load progress bar visual */}
                      <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            percentage > 100 ? 'bg-gradient-to-r from-red-500 to-rose-600' :
                            percentage >= 80 ? 'bg-gradient-to-r from-amber-500 to-yellow-500' : 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                          }`}
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        ></div>
                      </div>

                      {/* Micro tasks bullets list */}
                      {tasks.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mt-1.5 shrink-0">
                          {tasks.map((task, i) => (
                            <div 
                              key={`${task.id}-${i}`} 
                              className="group text-[9px] px-2 py-0.5 bg-slate-950 font-bold border border-slate-800 hover:border-rose-500/50 rounded-md text-slate-300 flex items-center gap-1.5 transition-all shadow-sm"
                              title={`${task.label}${task.duration ? ` (${task.duration} นาที)` : ''} - คลิกปุ่มถังขยะเพื่อลบงานที่จ่ายให้ช่าง`}
                            >
                              <span className="truncate max-w-[130px]">{task.label}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTaskToDelete(task);
                                }}
                                className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition cursor-pointer hover:bg-rose-500/15"
                                title="ลบงานที่จ่ายให้ช่างรายการนี้"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[9.5px] text-slate-600 italic">💤 สแตนด์บายพร้อมจ่ายงาน (ไม่มีประวัติตารางวันนี้)</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Box 2: Live Dispatch Board on selectedDate */}
          <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-2xl flex flex-col justify-between" id="dispatch-board-card">
            <div>
              <div className="border-b border-slate-750 pb-3 mb-4 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                    <CheckSquare size={16} className="text-[#10b981]" />
                    ตารางใบสั่งการทั้งหมดในวันนี้
                  </h3>
                  <p className="text-[10.5px] text-slate-450 mt-0.5">รวมงานสังการหน้างาน {totalDispatchedCount} ฉบับ เพื่อการติดตามติดตามสถานะ</p>
                </div>
                
                <span className="flex h-2.5 w-2.5 bg-emerald-500 rounded-full animate-ping"></span>
              </div>

              {/* Tasks List */}
              <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1 text-xs">
                {totalDispatchedCount === 0 ? (
                  <div className="py-10 text-center text-slate-550 italic space-y-1">
                    <p className="text-xs">ยังไม่มีงานสั่งการในวันที่ {selectedDate}</p>
                    <p className="text-[10px] text-slate-600 font-mono">กรุณากรอกฟอร์มนำส่งใบสั่งงานซ่อมบำรุงข้างต้น</p>
                  </div>
                ) : (
                  <>
                    {/* A. PM schedules */}
                    {currentDayDispatches.schedules.filter(s => s.type === 'PM').map(item => {
                      const pm = item as PMScheduleItem;
                      const plan = pmPlans.find(p => p.id === pm.pmPlanId);
                      return (
                        <div key={pm.id} className="bg-slate-900 border border-indigo-500/15 p-3 rounded-xl space-y-2">
                          <div className="flex justify-between items-start text-xs">
                            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded font-black text-[9.5px]">
                              🔵 PM PLAN
                            </span>
                            <div className="flex gap-1 items-center">
                              <button 
                                onClick={() => handleTogglePMStatus(pm.id, pm.status)}
                                className="text-[9.5px] bg-slate-950 text-slate-350 hover:bg-slate-850 px-2 py-0.5 border border-slate-800 rounded font-bold transition"
                                title="สลับเปลี่ยนสถานะ"
                              >
                                {pm.status} ⇄
                              </button>
                              <button 
                                onClick={() => handleStartEdit('PM', pm)}
                                className="text-slate-500 hover:text-[#38bdf8] p-0.5 transition"
                                title="แก้ไขงานสั่งการ"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button 
                                onClick={() => handleDeleteScheduleTask(pm.id)}
                                className="text-slate-500 hover:text-red-400 p-0.5 text-rose-450/80 hover:text-rose-400"
                                title="ยกเลิกสั่งงาน"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <p className="text-xs text-slate-202 font-bold leading-tight">
                              บำรุงรักษา: <span className="text-[#38bdf8] font-bold">{plan?.title || "ตรวจสอบระบบหลัก"}</span>
                            </p>
                            <div className="space-y-1 text-[10px] text-slate-500 font-mono">
                              <div className="flex justify-between">
                                <span>เครื่อง: {pm.machineId}</span>
                                <span>ช่าง: {pm.technician}</span>
                              </div>
                              <div className="flex justify-between border-t border-slate-800/40 pt-1 mt-1">
                                <span>แผนมาตรฐาน: <b className="text-slate-400">{pm.duration} นาที</b></span>
                                {pm.status === 'เสร็จสิ้น' && (
                                  <span>
                                    เวลาจริง:{' '}
                                    <b className={pm.actualDuration !== undefined && pm.actualDuration > pm.duration ? "text-rose-400" : "text-emerald-400"}>
                                      {pm.actualDuration ?? pm.duration} นาที
                                    </b>
                                  </span>
                                )}
                              </div>
                              {pm.status === 'เสร็จสิ้น' && pm.actualDuration !== undefined && (
                                <div className="text-right text-[9px] font-sans pt-0.5">
                                  {pm.actualDuration === pm.duration ? (
                                    <span className="text-slate-400">⏱ ตรงเวลาเป๊ะ</span>
                                  ) : pm.actualDuration > pm.duration ? (
                                    <span className="text-rose-400 font-medium">⚠️ ช้ากว่าแผน {pm.actualDuration - pm.duration} นาที ({Math.round(((pm.actualDuration - pm.duration)/pm.duration)*100)}%)</span>
                                  ) : (
                                    <span className="text-emerald-400 font-medium font-bold">⚡️ เร็วกว่าแผน {pm.duration - pm.actualDuration} นาที (-{Math.round(((pm.duration - pm.actualDuration)/pm.duration)*100)}%)</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* B. Operation schedules */}
                    {currentDayDispatches.schedules.filter(s => s.type === 'Operation').map(item => {
                      const op = item as OperationScheduleItem;
                      return (
                        <div key={op.id} className="bg-slate-900 border border-amber-500/15 p-3 rounded-xl space-y-2">
                          <div className="flex justify-between items-start text-xs">
                            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-black text-[9.5px]">
                              🟡 คุมไลน์ผลิต
                            </span>
                            <div className="flex gap-1.5 items-center">
                              {op.isWeeklyRecurring && (
                                <span className="text-[8.5px] bg-cyan-500/10 text-cyan-400 px-1 rounded animate-pulse">ซ้ำสัปดาห์</span>
                              )}
                              <button 
                                onClick={() => handleStartEdit('Operation', op)}
                                className="text-slate-500 hover:text-[#38bdf8] p-0.5 transition"
                                title="แก้ไขงานสั่งการ"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button 
                                onClick={() => handleDeleteScheduleTask(op.id)}
                                className="text-slate-500 hover:text-red-400 p-0.5 text-rose-450/80 hover:text-rose-400"
                                title="ยกเลิกจัดงาน"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <p className="text-xs text-slate-202 font-bold leading-tight">
                              ประจำการกะ: <span className="text-amber-300 font-bold">{op.line}</span>
                            </p>
                            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                              <span>เวลา: {op.startTime} - {op.endTime}</span>
                              <span>ช่าง: {op.technician}</span>
                              <span>รวม: {op.duration} นาที</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* C. Daily repairs */}
                    {currentDayDispatches.repairs.map(rep => {
                      return (
                        <div key={rep.id} className="bg-slate-900 border border-rose-500/15 p-3 rounded-xl space-y-2">
                          <div className="flex justify-between items-start text-xs">
                            <span className="px-2 py-0.5 bg-rose-500/10 text-rose-455 text-red-400 border border-rose-500/20 rounded font-black text-[9.5px]">
                              🔴 EMERGENCY REPAIR (RESOLVED)
                            </span>
                            <div className="flex gap-1 items-center">
                              <button 
                                onClick={() => handleStartEdit('Repair', rep)}
                                className="text-slate-500 hover:text-[#38bdf8] p-0.5 transition"
                                title="แก้ไขงานสั่งการ"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button 
                                onClick={() => handleDeleteRepairTask(rep.id)}
                                className="text-slate-500 hover:text-red-400 p-0.5 text-rose-450/80 hover:text-rose-400"
                                title="ลบรายงานซ่อม"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <p className="text-xs text-slate-202 font-bold leading-tight">
                              ซ่อมด่วน: <span className="text-red-400">{rep.symptoms}</span>
                            </p>
                            <p className="text-[10px] text-slate-400 truncate leading-tight">
                              มาตรการ: {rep.correctiveAction}
                            </p>
                            <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-1">
                              <span>เครื่อง: {rep.machineId}</span>
                              <span>ช่างซ่อม: {rep.technicians && rep.technicians.length > 0 ? rep.technicians.join(', ') : rep.technician}</span>
                              <span>MTTR: {rep.duration} นาที</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* D. Daily Improvements */}
                    {currentDayDispatches.improvements.map(imp => {
                      return (
                        <div key={imp.id} className="bg-slate-900 border border-purple-500/15 p-3 rounded-xl space-y-2">
                          <div className="flex justify-between items-start text-xs">
                            <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded font-black text-[9.5px]">
                              🟣 IMPROVEMENT KAIZEN
                            </span>
                            <div className="flex gap-1.5 items-center">
                              <button 
                                onClick={() => handleToggleImpStatus(imp.id, imp.status)}
                                className="text-[9.5px] bg-slate-950 text-slate-350 hover:bg-slate-850 px-2 py-0.5 border border-slate-800 rounded font-bold transition"
                              >
                                {imp.status} ⇄
                              </button>
                              <button 
                                onClick={() => handleStartEdit('Improvement', imp)}
                                className="text-slate-500 hover:text-[#38bdf8] p-0.5 transition"
                                title="แก้ไขโครงการ Kaizen"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button 
                                onClick={() => handleDeleteImprovementTask(imp.id)}
                                className="text-slate-500 hover:text-red-400 p-0.5 text-rose-450/80 hover:text-rose-400"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <p className="text-xs text-[#a855f7] font-bold leading-tight">
                              โครง Kaizen: <span>{imp.title}</span>
                            </p>
                            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                              <span>เครื่องมัดจำ: {imp.machineId || "ทั่วไป"}</span>
                              <span>ช่างรับผิดชอบ: {imp.technician}</span>
                              <span>คาดเสร็จ: {imp.plannedEndDate}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          </div>

        </div>

        </div>

      )}

      {/* ================= SUMMARY SUB-PAGE SECTION ================= */}
      {dispatchTab === 'summary' && (
          <div className="space-y-6 animate-in fade-in duration-200" id="dispatch-summary-container">
            
            {/* KPI STATS CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-xl">
                  <Layers size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-450 uppercase font-bold tracking-widest">ใบงานสั่งการสะสม</p>
                  <p className="text-xl font-black text-slate-100 mt-0.5">{totalCount} <span className="text-xs font-normal text-slate-500">ฉบับ</span></p>
                </div>
              </div>

              <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-450 uppercase font-bold tracking-widest">รอดำเนินการ</p>
                  <p className="text-xl font-black text-slate-100 mt-0.5">{pendingCount} <span className="text-xs font-normal text-slate-500">ฉบับ</span></p>
                </div>
              </div>

              <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
                  <Lock size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-450 uppercase font-bold tracking-widest">LOTO Active / กำลังทำ</p>
                  <p className="text-xl font-black text-slate-100 mt-0.5">{activeLotoCount} <span className="text-xs font-normal text-slate-500">จุดเซฟตี้</span></p>
                </div>
              </div>

              <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
                  <CheckSquare size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-450 uppercase font-bold tracking-widest">เสร็จสมบูรณ์แล้ว</p>
                  <p className="text-xl font-black text-slate-100 mt-0.5">
                    {completedCount} <span className="text-xs font-bold text-emerald-500">({totalCount > 0 ? Math.round((completedCount/totalCount)*100) : 0}%)</span>
                  </p>
                </div>
              </div>
            </div>

            {/* COMPREHENSIVE DETAILED REPORT SUMMARY SECTION */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden" id="department-analytical-summary-card">
              <div className="p-4 px-5 bg-gradient-to-r from-slate-950 to-slate-900 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <ClipboardList size={18} className="text-cyan-400" />
                  <div>
                    <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                      📑 สรุปผลรายงานภาพรวมแผนกปฏิบัติการ (Comprehensive Operational Report Summary)
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      สถิติวิเคราะห์จากข้อมูลใบงานประจำสัปดาห์ / วันที่กรอง ({filteredUnified.length} ใบงาน)
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPrintReportModal(true)}
                    className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/50 px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 text-[11px] cursor-pointer shadow-sm"
                  >
                    <Send size={12} className="rotate-45" />
                    📥 พิมพ์รายงานสรุป (Print Report)
                  </button>
                  <button
                    onClick={() => setShowDetailedReport(!showDetailedReport)}
                    className="bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800 px-3 py-1.5 rounded-xl font-bold transition text-[11px] cursor-pointer"
                  >
                    {showDetailedReport ? '▲ พับแผงสถิติ' : '▼ กางแผงสถิติ'}
                  </button>
                </div>
              </div>

              {showDetailedReport && (
                <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5 animate-in slide-in-from-top duration-200">
                  
                  {/* Column 1: Stats by Type */}
                  <div className="bg-slate-950/55 border border-slate-850 rounded-xl p-4 space-y-3">
                    <h4 className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-850 pb-2">
                      <Activity size={13} />
                      1. ผลการปฏิบัติการแบ่งตามหมวดหมู่
                    </h4>
                    
                    <div className="space-y-3">
                      {statsByType.map(st => {
                        const completionRate = st.total > 0 ? Math.round((st.completed / st.total) * 100) : 0;
                        let barColor = "bg-cyan-500";
                        if (st.type === 'Repair') barColor = "bg-rose-500";
                        else if (st.type === 'Operation') barColor = "bg-amber-500";
                        else if (st.type === 'Improvement') barColor = "bg-purple-500";

                        return (
                          <div key={st.type} className="space-y-1.5 text-[11px]">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-300">
                                {st.type === 'PM' ? '🔵 แผนป้องกัน PM' : 
                                 st.type === 'Repair' ? '🔴 ซ่อม Breakdown' : 
                                 st.type === 'Operation' ? '🟡 คุมกะผลิต' : '🟣 ปรับปรุง Kaizen'}
                              </span>
                              <span className="font-mono text-slate-400">
                                {st.completed}/{st.total} ใบ ({completionRate}%)
                              </span>
                            </div>
                            
                            {/* Progress bar */}
                            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${completionRate}%` }}></div>
                            </div>
                            
                            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                              <span>เวลารวม: {st.totalDuration} นาที</span>
                              <span>เฉลี่ย: {st.avgDuration} นาที/ใบ</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Column 2: Stats by Technician */}
                  <div className="bg-slate-950/55 border border-slate-850 rounded-xl p-4 space-y-3">
                    <h4 className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-850 pb-2">
                      <UserCheck size={13} />
                      2. ภาระและการปิดงานรายบุคคล (ช่างเทคนิค)
                    </h4>
                    
                    <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                      {statsByTech.filter(tech => tech.total > 0).length === 0 ? (
                        <p className="text-[10.5px] text-slate-500 italic text-center py-10">ยังไม่มีช่างได้รับมอบหมายงานในวันที่เลือก</p>
                      ) : (
                        statsByTech.filter(tech => tech.total > 0).map(tech => (
                          <div key={tech.name} className="space-y-1 text-[11px]">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-200">{tech.name}</span>
                              <span className="font-mono font-bold text-emerald-400">{tech.rate}% เสร็จ ({tech.completed}/{tech.total})</span>
                            </div>
                            
                            <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${tech.rate}%` }}></div>
                            </div>

                            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                              <span>สะสม: {tech.totalDuration} นาที</span>
                              <span>
                                {tech.pending > 0 && <span className="text-rose-400 font-bold">รอ {tech.pending} ใบ</span>}
                                {tech.inProgress > 0 && <span className="text-amber-400 font-bold">ทำ {tech.inProgress} ใบ</span>}
                                {tech.pending === 0 && tech.inProgress === 0 && <span className="text-emerald-500 font-bold">✔ เคลียร์งานหมดแล้ว</span>}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Column 3: Stats by Machine */}
                  <div className="bg-slate-950/55 border border-slate-850 rounded-xl p-4 space-y-3">
                    <h4 className="text-[11px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-850 pb-2">
                      <Activity size={13} />
                      3. ความถี่การซ่อมบำรุงรายเครื่องจักร (Top 5)
                    </h4>
                    
                    <div className="space-y-2 text-[11px] max-h-[220px] overflow-y-auto scrollbar-thin">
                      {statsByMachine.length === 0 ? (
                        <p className="text-[10.5px] text-slate-500 italic text-center py-10">ไม่พบบันทึกการแจ้งซ่อมของเครื่องจักรใดๆ</p>
                      ) : (
                        statsByMachine.slice(0, 5).map((m, idx) => {
                          const matchingMachine = machines.find(x => x.id === m.machineId);
                          return (
                            <div key={m.machineId} className="flex items-center justify-between p-2 bg-slate-900/35 border border-slate-850 rounded-lg">
                              <div className="min-w-0">
                                <span className="font-mono font-bold text-amber-300 text-[11px] flex items-center gap-1">
                                  <span className="text-slate-500 text-[9.5px]">#{idx+1}</span>
                                  {m.machineId}
                                </span>
                                <p className="text-[9.5px] text-slate-400 truncate max-w-[140px]" title={matchingMachine?.name}>
                                  {matchingMachine?.name || 'อุปกรณ์เสริม'}
                                </p>
                              </div>
                              <div className="text-right font-mono">
                                <span className="font-bold text-slate-200">{m.total} ครั้ง</span>
                                <p className="text-[9px] text-slate-500">เฉลี่ย {m.avgDuration} นาที</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* SEARCH AND FILTERS TOOLBAR */}
            <div className="bg-slate-800 border border-slate-700/80 p-4 rounded-2xl" id="summary-filters-bar">
              <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 text-xs">
                
                {/* Search query input */}
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={summarySearch}
                    onChange={(e) => setSummarySearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    placeholder="พิมพ์รหัสเครื่องจักร, ช่างเทคนิค, อาการชำรุด หรือชื่องานบำรุงรักษา..."
                  />
                </div>

                {/* Filters layout */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Filter Type */}
                  <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 px-3 rounded-xl border border-slate-700">
                    <span className="text-slate-450 font-bold text-[11px]">หมวดหมู่:</span>
                    <select
                      value={summaryType}
                      onChange={(e) => setSummaryType(e.target.value as any)}
                      className="bg-transparent border-none text-slate-200 font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="All" className="bg-slate-900 text-slate-100">ทั้งหมด</option>
                      <option value="PM" className="bg-slate-900 text-slate-100">🔵 งานบำรุงรักษา PM</option>
                      <option value="Repair" className="bg-slate-900 text-slate-100">🔴 ซ่อม Breakdown</option>
                      <option value="Operation" className="bg-slate-900 text-slate-100">🟡 คุมไลน์ประจำกะ</option>
                      <option value="Improvement" className="bg-slate-900 text-slate-100">🟣 งาน Kaizen</option>
                    </select>
                  </div>

                  {/* Filter Status */}
                  <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 px-3 rounded-xl border border-slate-700">
                    <span className="text-slate-450 font-bold text-[11px]">สถานะ:</span>
                    <select
                      value={summaryStatus}
                      onChange={(e) => setSummaryStatus(e.target.value as any)}
                      className="bg-transparent border-none text-slate-200 font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="All" className="bg-slate-900 text-slate-100">ทุกสถานะ</option>
                      <option value="Pending" className="bg-slate-900 text-slate-100">รอดำเนินงาน</option>
                      <option value="InProgress" className="bg-slate-900 text-slate-100">กำลังซ่อม/ล็อก LOTO</option>
                      <option value="Completed" className="bg-slate-900 text-slate-100">เสร็จสมบูรณ์</option>
                    </select>
                  </div>

                  {/* Checkbox display for selectedDate */}
                  <label className="flex items-center gap-2 bg-slate-950 p-2.5 px-3 rounded-xl border border-slate-700 cursor-pointer select-none text-slate-300 font-bold">
                    <input
                      type="checkbox"
                      checked={summaryFilterBySelectedDate}
                      onChange={(e) => setSummaryFilterBySelectedDate(e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-cyan-500 cursor-pointer"
                    />
                    <span>เฉพาะวันที่สั่งการ ({selectedDate})</span>
                  </label>
                </div>

              </div>
            </div>

            {/* UNIFIED JOBS LIST (Responsive grid & table layout) */}
            <div className="bg-slate-800 border border-slate-700/80 rounded-2xl overflow-hidden shadow-sm" id="summary-data-table-card">
              <div className="p-4 px-5 bg-slate-900/40 border-b border-slate-750 flex justify-between items-center">
                <span className="font-extrabold text-slate-250 uppercase tracking-wider text-xs">รายการข้อมูลใบงานและประวัติสั่งงาน ({filteredUnified.length} ฉบับ)</span>
                <span className="text-[10px] bg-slate-950 px-2.5 py-1 border border-slate-800 rounded-lg text-slate-400 font-mono">
                  Database Synced Active
                </span>
              </div>

              {filteredUnified.length === 0 ? (
                <div className="p-16 text-center text-slate-500 space-y-1">
                  <ClipboardList size={32} className="mx-auto text-slate-650" />
                  <p className="text-xs font-bold pt-2 text-slate-400">ไม่พบรายงานสั่งการตามฟิลเตอร์หรือคำค้นข้างต้น</p>
                  <p className="text-[10.5px] text-slate-600">กรุณาลองปรับปรุงฟิลเตอร์ คีย์เวิร์ด หรือเปลี่ยนวันที่เลือก</p>
                </div>
              ) : (
                <>
                  {/* A. DESKTOP VIEW TABLE */}
                  <div className="hidden md:block overflow-x-auto text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950/40 text-slate-400 border-b border-slate-750 font-extrabold uppercase text-[10px] tracking-wider">
                          <th className="py-3 px-4">รหัสใบงาน</th>
                          <th className="py-3 px-4">ประเภทงาน</th>
                          <th className="py-3 px-4">ชื่องาน / อาการขัดข้อง</th>
                          <th className="py-3 px-4">เครื่องจักร</th>
                          <th className="py-3 px-4">ช่างผู้ได้รับจ่าย</th>
                          <th className="py-3 px-4">วันที่สั่งการ</th>
                          <th className="py-3 px-4 text-center">มาตรการความปลอดภัย LOTO</th>
                          <th className="py-3 px-4">สถานะงาน</th>
                          <th className="py-3 px-4 text-right">ดำเนินการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-750/65">
                        {filteredUnified.map((job) => {
                          const isLotoActive = job.lotoActive;
                          const lotoTag = job.lotoTag;

                          // Badges styling
                          let typeBadge = "";
                          if (job.type === 'PM') typeBadge = "bg-indigo-500/10 border-indigo-500/20 text-indigo-400";
                          else if (job.type === 'Repair') typeBadge = "bg-rose-500/10 border-rose-500/20 text-rose-400";
                          else if (job.type === 'Operation') typeBadge = "bg-amber-500/10 border-amber-500/20 text-amber-400";
                          else if (job.type === 'Improvement') typeBadge = "bg-purple-500/10 border-purple-500/20 text-purple-400";

                          let statusBadge = "";
                          let statusText = job.status;
                          if (job.status === 'รอดำเนินการ' || job.status === 'วางแผน') {
                            statusBadge = "bg-slate-900 border-slate-800 text-slate-400";
                          } else if (job.status === 'กำลังทำ' || job.status === 'กำลังดำเนินการ') {
                            statusBadge = "bg-yellow-500/10 border-yellow-500/20 text-yellow-400 font-bold";
                            statusText = isLotoActive ? "กำลังทำ (LOTO Locked)" : "กำลังทำ";
                          } else if (job.status === 'กำลังซ่อม') {
                            statusBadge = "bg-amber-500/10 border-amber-500/20 text-amber-400 font-bold";
                            statusText = isLotoActive ? "กำลังซ่อม (LOTO Locked)" : "กำลังซ่อม";
                          } else {
                            statusBadge = "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-bold";
                          }

                          return (
                            <tr key={job.id} className="hover:bg-slate-900/30 transition duration-150">
                              <td className="py-4 px-4 font-mono font-bold text-slate-400 text-[10px] truncate max-w-[80px]" title={job.id}>
                                {job.id.replace('sched-dispatch-pm-', 'PM-').replace('sched-dispatch-op-', 'OP-').replace('rep-dispatch-', 'RE-')}
                              </td>
                              <td className="py-4 px-4">
                                <span className={`px-2 py-0.5 border rounded text-[9px] font-black uppercase ${typeBadge}`}>
                                  {job.type}
                                </span>
                              </td>
                              <td className="py-4 px-4 max-w-[180px]">
                                <div className="space-y-1">
                                  <p className="font-bold text-slate-200 line-clamp-2">{job.title}</p>
                                  {job.usedParts && job.usedParts.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {job.usedParts.map((up: any, idx: number) => {
                                        const actualPart = spareParts.find(p => p.id === up.partId);
                                        return (
                                          <span key={idx} className="bg-slate-950 px-1.5 py-0.5 text-[8px] rounded border border-slate-800 text-slate-500">
                                            ⚙️ {actualPart?.name || up.partId} x{up.quantity}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-4 font-mono font-bold text-slate-300">
                                {job.machineId}
                              </td>
                              <td className="py-4 px-4 max-w-[120px] truncate">
                                <span className="text-slate-300 font-medium">{job.technicians.join(', ')}</span>
                              </td>
                              <td className="py-4 px-4 font-mono text-slate-450">
                                {job.date}
                              </td>
                              <td className="py-4 px-4 text-center">
                                {isLotoActive ? (
                                  <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/25 px-2.5 py-1 rounded-full text-[9px] font-mono text-red-400 font-black" title="Lockout Tagout Active">
                                    <Lock size={10} className="text-red-500" />
                                    <span>LOTO: {lotoTag}</span>
                                  </div>
                                ) : (job.type === 'Repair' && job.status === 'กำลังซ่อม') || (job.type === 'PM' && job.status === 'รอดำเนินการ') ? (
                                  <button
                                    onClick={() => {
                                      setLotoItem({ type: job.type, item: job.rawItem });
                                      setLotoTagNumber(`LOTO-2026-${job.machineId || "GEN"}-${Math.floor(100+Math.random()*900)}`);
                                      setLotoBreakerChecked(false);
                                      setLotoPneumaticChecked(false);
                                      setLotoSteamChecked(false);
                                      setLotoTagoutChecked(false);
                                      setLotoPpeChecked(false);
                                    }}
                                    className="bg-slate-950 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/30 text-slate-400 hover:text-red-400 px-2 py-1 rounded text-[9.5px] font-black transition flex items-center gap-1 mx-auto"
                                  >
                                    <Unlock size={11} />
                                    สวม LOTO
                                  </button>
                                ) : (
                                  <span className="text-slate-600">-</span>
                                )}
                              </td>
                              <td className="py-4 px-4">
                                <span className={`px-2 py-0.5 border rounded text-[9.5px] ${statusBadge}`}>
                                  {statusText}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <div className="flex gap-2 justify-end items-center">
                                  {/* Repair Close Button inside the Unified jobs list */}
                                  {job.type === 'Repair' && job.status === 'กำลังซ่อม' && (
                                    <button
                                      onClick={() => {
                                        setClosingRepairItem(job.rawItem);
                                        const nowStr = new Date().toTimeString().substring(0, 5);
                                        setRepDoneTimeField(nowStr);
                                        setRepSymptomsField(job.rawItem.symptoms);
                                        setRepCorrectionField("");
                                        setRepWhy1Field("");
                                        setRepWhy2Field("");
                                        setRepWhy3Field("");
                                        setRepWhyCount(3);
                                        setRepUsedParts([]);
                                      }}
                                      className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 text-white px-2.5 py-1 rounded text-[10px] font-black transition cursor-pointer"
                                    >
                                      ปิดงานซ่อม
                                    </button>
                                  )}

                                  {/* PM Close Button */}
                                  {job.type === 'PM' && job.status === 'กำลังทำ' && (
                                    <button
                                      onClick={() => {
                                        setClosingPMItem(job.rawItem);
                                        setActualPMDuration(job.rawItem.duration);
                                        setPmUsedParts([]);
                                      }}
                                      className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 text-white px-2.5 py-1 rounded text-[10px] font-black transition cursor-pointer"
                                    >
                                      ปิดงาน PM
                                    </button>
                                  )}

                                  {/* Toggle statuses fallback */}
                                  {job.type === 'PM' && job.status === 'รอดำเนินการ' && (
                                    <button
                                      onClick={() => handleTogglePMStatus(job.id, job.status)}
                                      className="text-slate-400 hover:text-white bg-slate-950 border border-slate-800 px-2 py-1 rounded text-[9px] font-bold"
                                    >
                                      เริ่มดำเนินงาน PM
                                    </button>
                                  )}

                                  {/* Edit/Delete icons */}
                                  <button
                                    onClick={() => handleStartEdit(job.type, job.rawItem)}
                                    className="text-slate-400 hover:text-cyan-400 p-1"
                                    title="แก้ไขงาน"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (job.type === 'Repair') handleDeleteRepairTask(job.id);
                                      else if (job.type === 'Improvement') handleDeleteImprovementTask(job.id);
                                      else handleDeleteScheduleTask(job.id);
                                    }}
                                    className="text-slate-450 hover:text-red-400 p-1"
                                    title="ลบใบงาน"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* B. MOBILE CARD VIEW LIST */}
                  <div className="md:hidden divide-y divide-slate-750/70 p-4 space-y-3.5">
                    {filteredUnified.map((job) => {
                      const isLotoActive = job.lotoActive;
                      const lotoTag = job.lotoTag;

                      let typeBadge = "";
                      if (job.type === 'PM') typeBadge = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
                      else if (job.type === 'Repair') typeBadge = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                      else if (job.type === 'Operation') typeBadge = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                      else if (job.type === 'Improvement') typeBadge = "bg-purple-500/10 text-purple-400 border-purple-500/20";

                      return (
                        <div key={job.id} className="pt-3.5 first:pt-0 space-y-2 text-xs">
                          <div className="flex justify-between items-center">
                            <span className={`px-2 py-0.5 border rounded text-[8.5px] font-black uppercase ${typeBadge}`}>
                              {job.type}
                            </span>
                            <span className="font-mono text-slate-500 font-bold text-[9px]">{job.date}</span>
                          </div>

                          <p className="font-bold text-slate-200">{job.title}</p>
                          
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-slate-400 font-mono">
                            <span>เครื่อง: <b className="text-slate-300">{job.machineId}</b></span>
                            <span>ผู้ถือปฏิบัติ: <b className="text-slate-300">{job.technicians.join(', ')}</b></span>
                          </div>

                          <div className="flex justify-between items-center pt-1">
                            {isLotoActive ? (
                              <span className="text-red-400 bg-red-500/10 px-2 py-0.5 rounded text-[9.5px] border border-red-500/15 flex items-center gap-1 font-mono">
                                <Lock size={10} /> LOTO: {lotoTag}
                              </span>
                            ) : (job.type === 'Repair' && job.status === 'กำลังซ่อม') || (job.type === 'PM' && job.status === 'รอดำเนินการ') ? (
                              <button
                                onClick={() => {
                                  setLotoItem({ type: job.type, item: job.rawItem });
                                  setLotoTagNumber(`LOTO-2026-${job.machineId || "GEN"}-${Math.floor(100+Math.random()*900)}`);
                                  setLotoBreakerChecked(false);
                                  setLotoPneumaticChecked(false);
                                  setLotoSteamChecked(false);
                                  setLotoTagoutChecked(false);
                                  setLotoPpeChecked(false);
                                }}
                                className="bg-slate-950 text-slate-400 border border-slate-800 px-2 py-1 rounded text-[9px] font-bold"
                              >
                                🔓 สวม LOTO
                              </button>
                            ) : (
                              <span>-</span>
                            )}

                            <div className="flex gap-2">
                              {job.type === 'Repair' && job.status === 'กำลังซ่อม' && (
                                <button
                                  onClick={() => {
                                    setClosingRepairItem(job.rawItem);
                                    const nowStr = new Date().toTimeString().substring(0, 5);
                                    setRepDoneTimeField(nowStr);
                                    setRepSymptomsField(job.rawItem.symptoms);
                                    setRepCorrectionField("");
                                    setRepWhy1Field("");
                                    setRepWhy2Field("");
                                    setRepWhy3Field("");
                                    setRepWhyCount(3);
                                    setRepUsedParts([]);
                                  }}
                                  className="bg-emerald-600 text-white px-2.5 py-1 rounded text-[9px] font-black"
                                >
                                  ปิดงานซ่อม
                                </button>
                              )}

                              {job.type === 'PM' && job.status === 'กำลังทำ' && (
                                <button
                                  onClick={() => {
                                    setClosingPMItem(job.rawItem);
                                    setActualPMDuration(job.rawItem.duration);
                                    setPmUsedParts([]);
                                  }}
                                  className="bg-emerald-600 text-white px-2.5 py-1 rounded text-[9px] font-black"
                                >
                                  ปิดงาน PM
                                </button>
                              )}

                              <button
                                onClick={() => handleStartEdit(job.type, job.rawItem)}
                                className="text-slate-500 hover:text-cyan-400 p-0.5"
                              >
                                <Edit2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

          </div>
        )}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div id="dispatch-edit-modal" className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-slate-950 px-5 py-4 border-b border-slate-755 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Edit2 size={16} className="text-[#38bdf8]" />
                <h3 className="text-sm font-black text-slate-100">
                  แก้ไขงานสั่งการ ({editingItem.type === 'PM' ? 'งาน PM' : editingItem.type === 'Operation' ? 'คุมผลิต' : editingItem.type === 'Repair' ? 'ซ่อมฉุกเฉิน' : ' Kaizen'})
                </h3>
              </div>
              <button 
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-200 transition p-1 rounded"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEdit} className="p-5 overflow-y-auto space-y-4 text-xs flex-1 scrollbar-thin">
              
              {/* Common multi-technician block for editing */}
              <div className="space-y-2 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                <div className="flex justify-between items-center">
                  <label className="font-extrabold text-[#38bdf8] flex items-center gap-1">
                    👥 เจ้าหน้าที่ช่างผู้รับผิดชอบร่วมกัน *
                  </label>
                  <span className="font-mono text-[10px] text-cyan-400 font-bold">
                    เลือก {editingItem.type === 'PM' ? editPmTechs.length : editingItem.type === 'Operation' ? editOpTechs.length : editingItem.type === 'Repair' ? editRepTechs.length : editImpTechs.length} คน
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[110px] overflow-y-auto border border-slate-850 bg-slate-950 rounded p-1.5 scrollbar-thin">
                  {technicians.map(t => {
                    const isChecked = 
                      editingItem.type === 'PM' ? editPmTechs.includes(t) :
                      editingItem.type === 'Operation' ? editOpTechs.includes(t) :
                      editingItem.type === 'Repair' ? editRepTechs.includes(t) :
                      editImpTechs.includes(t);
                    return (
                      <label 
                        key={t}
                        className={`flex items-center gap-1.5 p-1 px-1.5 rounded border cursor-pointer select-none transition-all ${
                          isChecked 
                            ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 font-bold' 
                            : 'bg-slate-900/50 border-slate-850 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const updateTechs = (prev: string[]) => 
                              prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t];
                            
                            if (editingItem.type === 'PM') setEditPmTechs(updateTechs);
                            else if (editingItem.type === 'Operation') setEditOpTechs(updateTechs);
                            else if (editingItem.type === 'Repair') setEditRepTechs(updateTechs);
                            else if (editingItem.type === 'Improvement') setEditImpTechs(updateTechs);
                          }}
                          className="w-3.5 h-3.5 rounded accent-cyan-500 cursor-pointer"
                        />
                        <span className="text-[10px] truncate font-medium">{t}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* DYNAMIC FORM FIELDS */}
              {editingItem.type === 'PM' && (
                <div className="space-y-4">
                  {/* Select machine */}
                  <div className="space-y-1.5">
                    <label className="font-extrabold text-slate-350">อุปกรณ์/เครื่องจักร</label>
                    <select
                      value={editPmMachine}
                      onChange={(e) => {
                        setEditPmMachine(e.target.value);
                        // Matched plans auto selections
                        const matchedPlans = pmPlans.filter(p => p.machineId === e.target.value);
                        if (matchedPlans.length > 0) setEditPmPlan(matchedPlans[0].id);
                      }}
                      className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                    >
                      {machines.map(m => (
                        <option key={m.id} value={m.id}>{m.name} [{m.id}]</option>
                      ))}
                    </select>
                  </div>

                  {/* Select PM Plan */}
                  <div className="space-y-1.5">
                    <label className="font-extrabold text-slate-350">ใบงานบำรุงรักษาเชิงป้องกัน (PM Plan) *</label>
                    <select
                      value={editPmPlan}
                      onChange={(e) => setEditPmPlan(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                    >
                      {pmPlans.filter(p => p.machineId === editPmMachine).map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Status */}
                    <div className="space-y-1.5">
                      <label className="font-extrabold text-slate-350">สถานะปฏิบัติงาน</label>
                      <select
                        value={editPmStatus}
                        onChange={(e) => setEditPmStatus(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      >
                        <option value="รอดำเนินการ">🔴 รอดำเนินการ</option>
                        <option value="กำลังทำ">🟡 กำลังดำเนินงาน</option>
                        <option value="เสร็จสิ้น">🟢 เสร็จสมบูรณ์</option>
                      </select>
                    </div>

                    {/* Duration */}
                    <div className="space-y-1.5">
                      <label className="font-extrabold text-slate-350">เวลาประมาณการ (นาที)</label>
                      <input
                        type="number"
                        value={editPmDuration}
                        onChange={(e) => setEditPmDuration(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {editingItem.type === 'Operation' && (
                <div className="space-y-4">
                  {/* Production Line */}
                  <div className="space-y-1.5">
                    <label className="font-extrabold text-slate-350">ไลน์ผลิตสเตชั่น</label>
                    <input
                      type="text"
                      value={editOpLine}
                      onChange={(e) => setEditOpLine(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Start/End Time */}
                    <div className="space-y-1.5">
                      <label className="font-extrabold text-slate-350">เวลาเริ่มเฝ้าระวัง</label>
                      <input
                        type="time"
                        value={editOpStartTime}
                        onChange={(e) => setEditOpStartTime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-extrabold text-slate-350">เวลาสิ้นสุด</label>
                      <input
                        type="time"
                        value={editOpEndTime}
                        onChange={(e) => setEditOpEndTime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Recurring configs */}
                  <div className="space-y-1.5 bg-slate-950/30 p-3 rounded border border-slate-800">
                    <label className="flex items-center gap-2 font-extrabold text-slate-350 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editOpIsRecurring}
                        onChange={(e) => setEditOpIsRecurring(e.target.checked)}
                        className="w-3.5 h-3.5 accent-cyan-500 rounded"
                      />
                      <span>ตารางเป็นกะควบคุมแบบซ้ำทุกสัปดาห์ (Weekly Recurring)</span>
                    </label>

                    {editOpIsRecurring && (
                      <div className="grid grid-cols-7 gap-1 mt-2.5">
                        {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((label, index) => {
                          const active = editOpRecurDays.includes(index);
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                setEditOpRecurDays(prev => 
                                  prev.includes(index) ? prev.filter(d => d !== index) : [...prev, index]
                                );
                              }}
                              className={`py-1 text-[10px] text-center font-bold rounded border ${
                                active 
                                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400' 
                                  : 'bg-slate-900 border-slate-800 text-slate-500'
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {editingItem.type === 'Repair' && (
                <div className="space-y-4">
                  {/* Select machine */}
                  <div className="space-y-1.5">
                    <label className="font-extrabold text-slate-350">เครื่องจักรเสียหาย</label>
                    <select
                      value={editRepMachine}
                      onChange={(e) => setEditRepMachine(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                    >
                      {machines.map(m => (
                        <option key={m.id} value={m.id}>{m.name} [{m.id}]</option>
                      ))}
                    </select>
                  </div>

                  {/* Symptoms & Corrective Action */}
                  <div className="space-y-1.5">
                    <label className="font-extrabold text-slate-350">อาการเสีย/สาเหตุขัดข้อง</label>
                    <textarea
                      value={editRepSymptoms}
                      onChange={(e) => setEditRepSymptoms(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-extrabold text-slate-350">มาตรการแก้ไขและชิ้นส่วนอะไหล่ที่เปลี่ยน</label>
                    <textarea
                      value={editRepCorrective}
                      onChange={(e) => setEditRepCorrective(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="font-extrabold text-slate-350">เวลาเครื่องเสีย</label>
                      <input
                        type="time"
                        value={editRepBreakdownTime}
                        onChange={(e) => setEditRepBreakdownTime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-extrabold text-slate-350">เวลาเสร็จสิ้น</label>
                      <input
                        type="time"
                        value={editRepDoneTime}
                        onChange={(e) => setEditRepDoneTime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-extrabold text-slate-350">ระยะเวลาซ่อม (นาที)</label>
                      <input
                        type="number"
                        value={editRepDuration}
                        onChange={(e) => setEditRepDuration(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {editingItem.type === 'Improvement' && (
                <div className="space-y-4">
                  {/* Target title */}
                  <div className="space-y-1.5">
                    <label className="font-extrabold text-slate-350">ชื่อโครงการพัฒนา Kaizen</label>
                    <input
                      type="text"
                      value={editImpTitle}
                      onChange={(e) => setEditImpTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Machine connection */}
                    <div className="space-y-1.5">
                      <label className="font-extrabold text-slate-350">เชื่อมต่อเครื่องเฉพาะจุด</label>
                      <select
                        value={editImpMachine}
                        onChange={(e) => setEditImpMachine(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      >
                        <option value="">(ไม่เฉพาะเจาะจง/ทั่วไป)</option>
                        {machines.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* End date */}
                    <div className="space-y-1.5">
                      <label className="font-extrabold text-slate-350">วันสิ้นสุดโครงการหลัก</label>
                      <input
                        type="date"
                        value={editImpEndDate}
                        onChange={(e) => setEditImpEndDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="font-extrabold text-slate-350">คำแนะนำ/รายละเอียดแผน Kaizen</label>
                    <textarea
                      value={editImpDesc}
                      onChange={(e) => setEditImpDesc(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none resize-none"
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-1.5">
                    <label className="font-extrabold text-slate-350">สถานะโครงการ</label>
                    <select
                      value={editImpStatus}
                      onChange={(e) => setEditImpStatus(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="วางแผน">📋 แผนงานบำรุงรักษา</option>
                      <option value="กำลังดำเนินการ">⚡ กำลังดำเนินการพัฒนา</option>
                      <option value="เสร็จแล้ว">✅ บรรลุประสงค์สำเร็จ</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="bg-slate-950 border border-slate-850 hover:bg-slate-850 text-slate-400 px-4 py-2 rounded-xl font-bold transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-5 py-2 rounded-xl transition cursor-pointer shadow-lg"
                >
                  💾 บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PM CLOSURE & ACTUAL DURATION DIALOG */}
      {closingPMItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto">

          <div id="dispatch-pm-closure-modal" className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full flex flex-col overflow-hidden shadow-2xl my-8 animate-in fade-in zoom-in duration-150">
            <div className="bg-gradient-to-r from-indigo-950 to-slate-900 border-b border-indigo-500/20 p-5 flex justify-between items-center">
              <div>
                <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded">
                  🟢 ปิดงาน PM PLAN
                </span>
                <h3 className="text-sm font-semibold text-slate-200 mt-1 pb-0">
                  ปิดรายงานและบันทึกเวลาปฏิบัติงานจริง
                </h3>
              </div>
              <button 
                onClick={() => setClosingPMItem(null)}
                className="text-slate-400 hover:text-slate-200 text-xl font-medium focus:outline-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveClosePM} className="p-5 space-y-4 text-xs font-sans">
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-750 space-y-2">
                <p className="text-xs text-slate-300 font-bold leading-tight">
                  บำรุงรักษา: <span className="text-[#38bdf8] font-bold">{pmPlans.find(p => p.id === closingPMItem.pmPlanId)?.title || "ตรวจสอบระบบหลัก"}</span>
                </p>
                <div className="grid grid-cols-2 gap-2 text-[10.5px] text-slate-400 font-mono">
                  <span>เครื่อง: {closingPMItem.machineId}</span>
                  <span>ผู้ทำ: {closingPMItem.technician}</span>
                  <span className="col-span-2 text-cyan-400 font-bold">⏱ เวลามาตรฐาน (Std. TTM): {closingPMItem.duration} นาที</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-extrabold text-[#94a3b8] block">บันทึกเวลาที่ใช้ทำงานจริง (นาที)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    required
                    value={actualPMDuration || ''}
                    onChange={(e) => setActualPMDuration(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono font-bold focus:outline-none focus:border-indigo-500"
                    placeholder="ป้อนเวลาเป็นจำนวนนาที"
                  />
                  <span className="absolute right-3 top-2.5 text-slate-500 font-bold">นาที</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  ป้อนเวลาจริงเพื่อเปรียบเทียบกับเวลามาตรฐาน {closingPMItem.duration} นาที และนำข้อมูลไปวิเคราะห์ประสิทธิภาพในตัวชี้วัดของระบบ
                </p>
              </div>

              {/* Live difference preview */}
              {actualPMDuration > 0 && (
                <div className="p-3 bg-slate-950 border border-slate-750 rounded-xl flex items-center justify-between">
                  <span className="text-[#94a3b8]">ผลต่างประสิทธิภาพ:</span>
                  <span>
                    {actualPMDuration === closingPMItem.duration ? (
                      <span className="text-slate-300 font-bold">⏱ พอดีกับมาตรฐาน (100%)</span>
                    ) : actualPMDuration > closingPMItem.duration ? (
                      <span className="text-rose-400 font-semibold font-bold">🔴 ช้ากว่าเป้า {actualPMDuration - closingPMItem.duration} นาที (+{Math.round(((actualPMDuration - closingPMItem.duration)/closingPMItem.duration)*100)}%)</span>
                    ) : (
                      <span className="text-emerald-400 font-semibold font-bold">🟢 เร็วกว่าเป้า {closingPMItem.duration - actualPMDuration} นาที (-{Math.round(((closingPMItem.duration - actualPMDuration)/closingPMItem.duration)*100)}%)</span>
                    )}
                  </span>
                </div>
              )}

              {/* Autocomplete spare part search (matches Request 1) */}
              <div className="bg-slate-955 p-4 rounded-xl border border-slate-800 space-y-3 bg-slate-950">
                <label className="font-extrabold text-slate-350 block text-[11px] uppercase tracking-wider text-cyan-400">🔍 ตัดจ่ายวัสดุอะไหล่บำรุงรักษา (Spare Parts Search & Use)</label>
                
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={pmPartSearch}
                      onChange={(e) => {
                        setPmPartSearch(e.target.value);
                        // find if matches any part
                        const matched = spareParts.find(p => p.name.toLowerCase().includes(e.target.value.toLowerCase()) || p.id.toLowerCase().includes(e.target.value.toLowerCase()));
                        if (matched && e.target.value.trim() !== "") {
                          setPmSelectedPartId(matched.id);
                        } else {
                          setPmSelectedPartId("");
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-750 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                      placeholder="พิมพ์ชื่ออะไหล่ หรือ SKU เพื่อค้นหา..."
                    />
                  </div>
                  <div className="w-[80px]">
                    <input
                      type="number"
                      min="1"
                      value={pmSelectedPartQty}
                      onChange={(e) => setPmSelectedPartQty(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-slate-900 border border-slate-750 rounded-lg px-2 py-1.5 text-xs text-center text-slate-200 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPMPart}
                    disabled={!pmSelectedPartId}
                    className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0"
                  >
                    + เพิ่ม
                  </button>
                </div>

                {/* Selected spare parts indicator */}
                {pmSelectedPartId && (
                  <div className="text-[10.5px] text-emerald-400 font-medium">
                    🎯 พบอะไหล่: {spareParts.find(p => p.id === pmSelectedPartId)?.name} (คงเหลือในคลัง {spareParts.find(p => p.id === pmSelectedPartId)?.quantity} {spareParts.find(p => p.id === pmSelectedPartId)?.unit})
                  </div>
                )}

                {/* Used list */}
                {pmUsedParts.length > 0 ? (
                  <div className="border border-slate-850 rounded-lg overflow-hidden mt-2 bg-slate-900">
                    <div className="bg-slate-950 px-3 py-1.5 border-b border-slate-800 text-[10px] text-slate-400 font-bold grid grid-cols-12">
                      <span className="col-span-6">อะไหล่</span>
                      <span className="col-span-2 text-center">จำนวน</span>
                      <span className="col-span-4 text-right">ค่าใช้จ่าย</span>
                    </div>
                    <div className="divide-y divide-slate-850">
                      {pmUsedParts.map(part => {
                        const original = spareParts.find(p => p.id === part.partId);
                        return (
                          <div key={part.partId} className="px-3 py-2 text-[10.5px] text-slate-300 grid grid-cols-12 items-center">
                            <span className="col-span-6 truncate font-medium">{original?.name || part.partId}</span>
                            <span className="col-span-2 text-center font-mono font-bold text-yellow-400">{part.quantity} {original?.unit}</span>
                            <span className="col-span-4 text-right font-mono text-cyan-400">฿{part.totalCost.toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-500 italic mt-1">ไม่มีการตัดอะไหล่สำหรับงานเช็ค PM ครั้งนี้</p>
                )}
              </div>

              {/* Submit buttons */}
              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3 font-sans">
                <button
                  type="button"
                  onClick={() => setClosingPMItem(null)}
                  className="bg-slate-950 border border-slate-850 hover:bg-slate-850 text-slate-400 px-4 py-2 rounded-xl font-bold transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-indigo-600 to-[#6366f1] hover:from-indigo-500 hover:to-indigo-400 text-white font-black px-5 py-2 rounded-xl transition cursor-pointer shadow-lg"
                >
                  💾 บันทึกปิดงานและตัดคลัง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOTO SAFETY OVERLAY DIALOG */}
      {lotoItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-955/85 backdrop-blur-sm p-4 animate-in fade-in duration-150 bg-slate-950/80">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl max-w-lg w-full flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-950 to-slate-900 border-b border-red-500/20 p-5 flex justify-between items-center">
              <div>
                <span className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-450 text-red-400 font-mono px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                  🔒 LOCKOUT TAGOUT (LOTO) INDUSTRIAL SAFETY SAFETY OVERLAY
                </span>
                <h3 className="text-sm font-semibold text-slate-200 mt-1 pb-0 font-sans">
                  มาตรการควบคุมตัดแยกพลังงานก่อนเข้าบำรุงรักษา
                </h3>
              </div>
              <button 
                onClick={() => setLotoItem(null)}
                className="text-slate-400 hover:text-slate-200 text-xl font-medium focus:outline-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveLOTO} className="p-5 space-y-4 text-xs font-sans">
              <div className="bg-red-950/10 p-4 rounded-xl border border-red-500/10 space-y-2">
                <p className="text-xs text-red-400 font-bold leading-tight flex items-center gap-1">
                  <AlertTriangle size={14} /> WARNING: งานอันตราย - พื้นที่มีสิทธิ์เกิดอุบัติเหตุกายภาพ
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 font-mono">
                  <span>ใบงานประเภท: <b className="text-white">{lotoItem.type}</b></span>
                  <span>เครื่องจักรเป้าหมาย: <b className="text-white">{lotoItem.item.machineId || "-"}</b></span>
                  <span className="col-span-2">ช่างเทคนิคผู้ถือครองป้าย: <b className="text-yellow-400">{lotoItem.item.technicians?.join(', ') || lotoItem.item.technician}</b></span>
                </div>
              </div>

              {/* Tag Input */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-350 block">กุญแจหลักและป้าย LOTO Tag Number*</label>
                <input
                  type="text"
                  required
                  value={lotoTagNumber}
                  onChange={(e) => setLotoTagNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-yellow-300 font-mono font-bold focus:outline-none focus:border-red-500"
                  placeholder="ป้อนหมายเลข เช่น LOTO-2026-RIM01"
                />
                <p className="text-[10px] text-slate-500">
                  *ช่างต้องล็อกกุญแจและคล้องป้ายแดงไว้ ณ จุดตัดจ่ายพลังงานเพื่อแจ้งเตือนพนักงานขับเคลื่อนทุกกะ
                </p>
              </div>

              {/* Checklists */}
              <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <label className="font-extrabold text-slate-300 block mb-2 text-red-400">ตรวจสอบรายการความปลอดภัย 5 ขั้นตอน (Engineering Safety Checklist):</label>
                <div className="space-y-3 text-slate-300">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lotoBreakerChecked}
                      onChange={(e) => setLotoBreakerChecked(e.target.checked)}
                      className="w-4 h-4 rounded accent-red-600 cursor-pointer shrink-0 mt-0.5"
                    />
                    <span className="leading-normal">
                      <b>1. ตัดไฟเบรกเกอร์ (Main Electrical Power):</b> ทำการสับเบรกเกอร์จ่ายกระแสไฟฟ้าหลักลง พร้อมสวมกุญแจล็อกเพื่อป้องกันการเปิดระบบไฟฟ้ากะทันหัน
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lotoPneumaticChecked}
                      onChange={(e) => setLotoPneumaticChecked(e.target.checked)}
                      className="w-4 h-4 rounded accent-red-600 cursor-pointer shrink-0 mt-0.5"
                    />
                    <span className="leading-normal">
                      <b>2. ล็อกวาล์วลมหลัก (Main Pneumatic Isolation):</b> ปิดวาล์วท่อจ่ายแรงดันลม ปลดระบายลมค้างกระบอกสูบและตัวดักน้ำ เพื่อป้องกันก้านสูบเลื่อนทับช่าง
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lotoSteamChecked}
                      onChange={(e) => setLotoSteamChecked(e.target.checked)}
                      className="w-4 h-4 rounded accent-red-600 cursor-pointer shrink-0 mt-0.5"
                    />
                    <span className="leading-normal">
                      <b>3. ตัดระบบความร้อน/สารหล่อเย็น (Thermal & Chemical Isolation):</b> ปิดท่อสตีมไอน้ำร้อนสะสม, ล็อกวาล์วแก๊ส หรือสารทำความเย็นหากทำงานกับระบบซีลร้อน
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lotoTagoutChecked}
                      onChange={(e) => setLotoTagoutChecked(e.target.checked)}
                      className="w-4 h-4 rounded accent-red-600 cursor-pointer shrink-0 mt-0.5"
                    />
                    <span className="leading-normal">
                      <b>4. แขวนป้ายชื่อพร้อมรูปถ่าย (Tag-out Registration):</b> แขวนป้ายแดงผู้รับผิดชอบที่แผงควบคุมหลัก เพื่อแจ้งผู้ควบคุมไลน์ว่าช่างกำลังซ่อมบำรุงในตัวถัง
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lotoPpeChecked}
                      onChange={(e) => setLotoPpeChecked(e.target.checked)}
                      className="w-4 h-4 rounded accent-red-600 cursor-pointer shrink-0 mt-0.5"
                    />
                    <span className="leading-normal">
                      <b>5. อุปกรณ์เซฟตี้ช่างครบถ้วน (PPE Validation):</b> ตรวจสอบหน้ากาก ถุงมือกันความร้อน แว่นตานิรภัย และพกพาวิทยุสื่อสารก่อนมุดเข้าไปทำงาน
                    </span>
                  </label>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3 font-sans">
                <button
                  type="button"
                  onClick={() => setLotoItem(null)}
                  className="bg-slate-950 border border-slate-800 hover:bg-slate-850 text-slate-400 px-4 py-2 rounded-xl font-bold transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={!lotoBreakerChecked || !lotoPneumaticChecked || !lotoTagoutChecked || !lotoPpeChecked}
                  className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-red-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black px-5 py-2 rounded-xl transition cursor-pointer shadow-lg flex items-center gap-1.5"
                >
                  <Lock size={14} />
                  สวม LOTO และอนุมัติเข้าซ่อม
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REPAIR CLOSING DETAIL MODAL */}
      {closingRepairItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full flex flex-col overflow-hidden shadow-2xl my-8 animate-in fade-in zoom-in duration-150">
            <div className="bg-gradient-to-r from-emerald-950 to-slate-900 border-b border-emerald-500/20 p-5 flex justify-between items-center">
              <div>
                <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full font-bold">
                  🟢 ปิดรายงานใบแจ้งซ่อม BREAKDOWN
                </span>
                <h3 className="text-sm font-semibold text-slate-200 mt-1 pb-0 font-sans">
                  บันทึกประวัติซ่อมบำรุงและมาตรการวิเคราะห์ Why-Why
                </h3>
              </div>
              <button 
                onClick={() => setClosingRepairItem(null)}
                className="text-slate-400 hover:text-slate-200 text-xl font-medium focus:outline-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveCloseRepair} className="p-5 space-y-4 text-xs font-sans">
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-750 space-y-2">
                <p className="text-xs text-slate-300 font-bold leading-tight">
                  เครื่องจักร: <span className="text-[#38bdf8] font-bold">{closingRepairItem.machineId}</span>
                </p>
                <div className="grid grid-cols-2 gap-2 text-[10.5px] text-slate-400 font-mono">
                  <span>อาการเบื้องต้น: <span className="text-rose-455 text-red-400">{closingRepairItem.symptoms}</span></span>
                  <span>ผู้รับผิดชอบ: {closingRepairItem.technicians?.join(', ') || closingRepairItem.technician}</span>
                  <span className="col-span-2 text-amber-400 font-bold">⏱ เวลาเกิดเหตุ: {closingRepairItem.breakdownTime?.replace('T', ' ')}</span>
                </div>
              </div>

              {/* Resolved Time picker */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-[#94a3b8] block">ป้อนเวลาซ่อมเสร็จสิ้น (Resolved Time)</label>
                <input
                  type="time"
                  required
                  value={repDoneTimeField}
                  onChange={(e) => setRepDoneTimeField(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Symptoms modification */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-400 block">ระบุอาการเสียจริงหลังการรื้อถอน (Symptoms)*</label>
                <input
                  type="text"
                  required
                  value={repSymptomsField}
                  onChange={(e) => setRepSymptomsField(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Why-Why Analysis */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">วิเคราะห์หาสาเหตุรากเหง้า (Why-Why Analysis)</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setRepWhyCount(prev => Math.max(1, prev - 1))}
                      className="px-2 py-0.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 rounded text-[10px]"
                    >
                      ลดระดับ
                    </button>
                    <button
                      type="button"
                      onClick={() => setRepWhyCount(prev => Math.min(5, prev + 1))}
                      className="px-2 py-0.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 rounded text-[10px]"
                    >
                      เพิ่มระดับ (สูงสุด 5)
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <span className="text-slate-500 font-bold block">Why 1: ทำไมสวิตช์เครื่องจึงทริปดับ?</span>
                    <input
                      type="text"
                      required
                      value={repWhy1Field}
                      onChange={(e) => setRepWhy1Field(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 rounded px-2 py-1.5 text-xs text-slate-200"
                      placeholder="ป้อนสาเหตุ Why 1"
                    />
                  </div>

                  {repWhyCount >= 2 && (
                    <div className="space-y-1">
                      <span className="text-slate-500 font-bold block">Why 2: ทำไมจึงลัดวงจรลอยตัว?</span>
                      <input
                        type="text"
                        required
                        value={repWhy2Field}
                        onChange={(e) => setRepWhy2Field(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-850 rounded px-2 py-1.5 text-xs text-slate-200"
                        placeholder="ป้อนสาเหตุ Why 2"
                      />
                    </div>
                  )}

                  {repWhyCount >= 3 && (
                    <div className="space-y-1">
                      <span className="text-slate-500 font-bold block">Why 3: ทำไมน้ำแกงถึงรั่วรดมอเตอร์?</span>
                      <input
                        type="text"
                        required
                        value={repWhy3Field}
                        onChange={(e) => setRepWhy3Field(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-850 rounded px-2 py-1.5 text-xs text-slate-200"
                        placeholder="ป้อนสาเหตุ Why 3"
                      />
                    </div>
                  )}

                  {repWhyCount >= 4 && (
                    <div className="space-y-1">
                      <span className="text-slate-500 font-bold block">Why 4: ทำไมซีลปะเก็นขอบถังซักจึงสลายตัว?</span>
                      <input
                        type="text"
                        value={repWhy4Field}
                        onChange={(e) => setRepWhy4Field(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-850 rounded px-2 py-1.5 text-xs text-slate-200"
                        placeholder="ป้อนสาเหตุ Why 4 (ถ้ามี)"
                      />
                    </div>
                  )}

                  {repWhyCount >= 5 && (
                    <div className="space-y-1">
                      <span className="text-slate-500 font-bold block">Why 5: ทำไมระบบ PM จึงตรวจไม่พบซีลเสื่อม?</span>
                      <input
                        type="text"
                        value={repWhy5Field}
                        onChange={(e) => setRepWhy5Field(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-850 rounded px-2 py-1.5 text-xs text-slate-200"
                        placeholder="ป้อนสาเหตุ Why 5 (ถ้ามี)"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Corrective Action */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-400 block">มาตรการแก้ไขและป้องกันเชิงรับถาวร (Corrective Action)*</label>
                <textarea
                  required
                  rows={2}
                  value={repCorrectionField}
                  onChange={(e) => setRepCorrectionField(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  placeholder="เช่น ทำการติดตั้งแผ่นยางซิลิโคนกันน้ำเซฟตี้ครอบมอเตอร์พร้อมแก้ไขปะเก็นซีลยางหน้าแปลนถังผสม"
                />
              </div>

              {/* Autocomplete spare part search (matches Request 1) */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <label className="font-extrabold text-slate-350 block text-[11px] uppercase tracking-wider text-cyan-400">🔍 ตัดจ่ายวัสดุอะไหล่บำรุงรักษา (Spare Parts Search & Use)</label>
                
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={repPartSearch}
                      onChange={(e) => {
                        setRepPartSearch(e.target.value);
                        // find if matches any part
                        const matched = spareParts.find(p => p.name.toLowerCase().includes(e.target.value.toLowerCase()) || p.id.toLowerCase().includes(e.target.value.toLowerCase()));
                        if (matched && e.target.value.trim() !== "") {
                          setRepSelectedPartId(matched.id);
                        } else {
                          setRepSelectedPartId("");
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-750 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                      placeholder="พิมพ์ชื่ออะไหล่ หรือ SKU เพื่อค้นหา..."
                    />
                  </div>
                  <div className="w-[80px]">
                    <input
                      type="number"
                      min="1"
                      value={repSelectedPartQty}
                      onChange={(e) => setRepSelectedPartQty(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-slate-900 border border-slate-750 rounded-lg px-2 py-1.5 text-xs text-center text-slate-200 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddRepairPart}
                    disabled={!repSelectedPartId}
                    className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0"
                  >
                    + เพิ่ม
                  </button>
                </div>

                {/* Selected spare parts indicator */}
                {repSelectedPartId && (
                  <div className="text-[10.5px] text-emerald-400 font-medium">
                    🎯 พบอะไหล่: {spareParts.find(p => p.id === repSelectedPartId)?.name} (คงเหลือในคลัง {spareParts.find(p => p.id === repSelectedPartId)?.quantity} {spareParts.find(p => p.id === repSelectedPartId)?.unit})
                  </div>
                )}

                {/* Used list */}
                {repUsedParts.length > 0 ? (
                  <div className="border border-slate-800 rounded-lg overflow-hidden mt-2">
                    <div className="bg-slate-900 px-3 py-1.5 border-b border-slate-800 text-[10px] text-slate-400 font-bold grid grid-cols-12">
                      <span className="col-span-6">อะไหล่</span>
                      <span className="col-span-2 text-center">จำนวน</span>
                      <span className="col-span-4 text-right">ค่าใช้จ่าย</span>
                    </div>
                    <div className="divide-y divide-slate-850 bg-slate-900">
                      {repUsedParts.map(part => {
                        const original = spareParts.find(p => p.id === part.partId);
                        return (
                          <div key={part.partId} className="px-3 py-2 text-[10.5px] text-slate-300 grid grid-cols-12 items-center">
                            <span className="col-span-6 truncate font-medium">{original?.name || part.partId}</span>
                            <span className="col-span-2 text-center font-mono font-bold text-yellow-400">{part.quantity} {original?.unit}</span>
                            <span className="col-span-4 text-right font-mono text-cyan-400">฿{part.totalCost.toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-500 italic mt-1">ไม่มีการตัดอะไหล่ในการซ่อมแซมครั้งนี้</p>
                )}
              </div>

              {/* Submit buttons */}
              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3 font-sans">
                <button
                  type="button"
                  onClick={() => setClosingRepairItem(null)}
                  className="bg-slate-950 border border-slate-800 hover:bg-slate-850 text-slate-400 px-4 py-2 rounded-xl font-bold transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-emerald-400 text-white font-black px-5 py-2 rounded-xl transition cursor-pointer shadow-lg flex items-center gap-1"
                >
                  <Check size={14} />
                  ยืนยันบันทึกปิดใบงาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* PM CLOSURE & ACTUAL DURATION DIALOG */}
      {closingPMItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
          <div id="dispatch-pm-closure-modal" className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="bg-gradient-to-r from-indigo-950 to-slate-900 border-b border-indigo-500/20 p-5 flex justify-between items-center">
              <div>
                <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded">
                  🟢 ปิดงาน PM PLAN
                </span>
                <h3 className="text-sm font-semibold text-slate-200 mt-1 pb-0">
                  ปิดรายงานและบันทึกเวลาปฏิบัติงานจริง
                </h3>
              </div>
              <button 
                onClick={() => setClosingPMItem(null)}
                className="text-slate-400 hover:text-slate-200 text-xl font-medium focus:outline-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveClosePM} className="p-5 space-y-4 text-xs">
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-750 space-y-2">
                <p className="text-xs text-slate-300 font-bold leading-tight">
                  บำรุงรักษา: <span className="text-[#38bdf8] font-bold">{pmPlans.find(p => p.id === closingPMItem.pmPlanId)?.title || "ตรวจสอบระบบหลัก"}</span>
                </p>
                <div className="grid grid-cols-2 gap-2 text-[10.5px] text-slate-400 font-mono">
                  <span>เครื่อง: {closingPMItem.machineId}</span>
                  <span>ผู้ทำ: {closingPMItem.technician}</span>
                  <span className="col-span-2 text-cyan-400 font-bold">⏱ เวลามาตรฐาน (Std. TTM): {closingPMItem.duration} นาที</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-extrabold text-[#94a3b8] block">บันทึกเวลาที่ใช้ทำงานจริง (นาที)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    required
                    value={actualPMDuration || ''}
                    onChange={(e) => setActualPMDuration(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono font-bold focus:outline-none focus:border-indigo-500"
                    placeholder="ป้อนเวลาเป็นจำนวนนาที"
                  />
                  <span className="absolute right-3 top-2.5 text-slate-500 font-bold">นาที</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  ป้อนเวลาจริงเพื่อเปรียบเทียบกับเวลามาตรฐาน {closingPMItem.duration} นาที และนำข้อมูลไปวิเคราะห์ประสิทธิภาพในตัวชี้วัดของระบบ
                </p>
              </div>

              {/* Live difference preview */}
              {actualPMDuration > 0 && (
                <div className="p-3 bg-slate-950 border border-slate-750 rounded-xl flex items-center justify-between">
                  <span className="text-[#94a3b8]">ผลต่างประสิทธิภาพ:</span>
                  <span>
                    {actualPMDuration === closingPMItem.duration ? (
                      <span className="text-slate-300 font-bold">⏱ พอดีกับมาตรฐาน (100%)</span>
                    ) : actualPMDuration > closingPMItem.duration ? (
                      <span className="text-rose-400 font-semibold font-bold">🔴 ช้ากว่าเป้า {actualPMDuration - closingPMItem.duration} นาที (+{Math.round(((actualPMDuration - closingPMItem.duration)/closingPMItem.duration)*100)}%)</span>
                    ) : (
                      <span className="text-emerald-400 font-semibold font-bold">🟢 เร็วกว่าเป้า {closingPMItem.duration - actualPMDuration} นาที (-{Math.round(((closingPMItem.duration - actualPMDuration)/closingPMItem.duration)*100)}%)</span>
                    )}
                  </span>
                </div>
              )}

              {/* Overtime Reason Section (Appears when Actual Duration exceeds Standard Duration) */}
              {actualPMDuration > closingPMItem.duration && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border-2 border-rose-500/30 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-extrabold text-rose-300 flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-rose-400 shrink-0" />
                      ระบุสาเหตุที่ใช้เวลาเกินมาตรฐาน (Overtime / Delay Reason)*
                    </label>
                    <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-mono font-bold">
                      +{actualPMDuration - closingPMItem.duration} นาที
                    </span>
                  </div>

                  {/* Quick preset reasons */}
                  <div className="space-y-1">
                    <p className="text-[9.5px] text-slate-400 font-medium">เลือกสาเหตุมาตรฐานเพื่อกรอกอัตโนมัติ:</p>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                      {PM_OVERTIME_REASON_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPmOvertimeReason(preset)}
                          className={`text-[10px] px-2.5 py-1 rounded-lg border text-left transition cursor-pointer ${
                            pmOvertimeReason === preset
                              ? 'bg-rose-500 text-white font-bold border-rose-400 shadow-sm'
                              : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Textarea for custom explanation */}
                  <div className="space-y-1">
                    <textarea
                      value={pmOvertimeReason}
                      onChange={(e) => setPmOvertimeReason(e.target.value)}
                      placeholder="โปรดระบุสาเหตุและรายละเอียดเพิ่มเติมว่าทำไมใช้เวลาเกินมาตรฐาน..."
                      rows={2}
                      className="w-full bg-slate-950 border border-rose-500/40 focus:border-rose-400 rounded-lg p-2.5 text-xs text-rose-100 placeholder:text-slate-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Submit buttons */}
              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setClosingPMItem(null)}
                  className="bg-slate-950 border border-slate-850 hover:bg-slate-850 text-slate-400 px-4 py-2 rounded-xl font-bold transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-indigo-600 to-[#6366f1] hover:from-indigo-500 hover:to-indigo-400 text-white font-black px-5 py-2 rounded-xl transition cursor-pointer shadow-lg"
                >
                  💾 บันทึกปิดงานและเปรียบเทียบเวลา
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION FOR CANCELING DISPATCHED TECH TASK FROM WORKLOAD CARD */}
      {taskToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in duration-100">
          <div id="dispatch-task-delete-modal" className="bg-slate-900 border border-slate-750 rounded-2xl max-w-sm w-full p-6 space-y-5 shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/15 flex items-center justify-center text-rose-450 border border-rose-500/20">
                <Trash2 size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-100">ยืนยันลบงานที่จ่ายให้ช่าง?</h3>
              
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-left w-full space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>ช่างผู้รับผิดชอบ:</span>
                  <span className="font-bold text-slate-100">{taskToDelete.tech}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>งานที่มอบหมาย:</span>
                  <span className="font-bold text-amber-300">{taskToDelete.label}</span>
                </div>
                {taskToDelete.duration && (
                  <div className="flex justify-between text-slate-400">
                    <span>ระยะเวลา:</span>
                    <span className="font-mono text-slate-300">{taskToDelete.duration} นาที</span>
                  </div>
                )}
                {taskToDelete.isRecurring && (
                  <p className="text-[10px] text-cyan-400 mt-1 border-t border-slate-800/80 pt-1">
                    🔄 หมายเหตุ: งานนี้เป็นตารางงานวนซ้ำประจำสัปดาห์ การลบจะถอนตารางกะนี้ออกจากระบบ
                  </p>
                )}
              </div>

              <p className="text-[11px] text-slate-400">คุณแน่ใจหรือไม่ที่จะถอนหรือยกเลิกการจ่ายงานรายการนี้ให้ช่าง?</p>
            </div>
            <div className="flex gap-3 justify-end text-xs font-bold">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="w-1/2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-350 py-2.5 rounded-xl cursor-pointer transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  if (taskToDelete.type === 'Operation' || taskToDelete.type === 'PM') {
                    setSchedules(prev => prev.filter(s => s.id !== taskToDelete.id));
                  } else if (taskToDelete.type === 'Repair') {
                    setRepairs(prev => prev.filter(r => r.id !== taskToDelete.id));
                  } else if (taskToDelete.type === 'Improvement') {
                    setImprovements(prev => prev.filter(i => i.id !== taskToDelete.id));
                  } else if (taskToDelete.type === 'Setup') {
                    setSetupLogs(prev => prev.filter(s => s.id !== taskToDelete.id));
                  }
                  showFeedback('success', `ลบงาน '${taskToDelete.label}' ของ ${taskToDelete.tech} เรียบร้อยแล้ว`);
                  setTaskToDelete(null);
                }}
                className="w-1/2 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl cursor-pointer transition font-bold"
              >
                ยืนยันลบงาน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION FOR CANCELING SCHEDULE TASK */}
      {scheduleToDelete && (() => {
        const targetSched = schedules.find(s => s.id === scheduleToDelete);
        const opTarget = targetSched?.type === 'Operation' ? (targetSched as OperationScheduleItem) : null;
        const pmTarget = targetSched?.type === 'PM' ? (targetSched as PMScheduleItem) : null;
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in duration-100">
            <div id="dispatch-sched-delete-modal" className="bg-slate-900 border border-slate-750 rounded-2xl max-w-sm w-full p-6 space-y-5 shadow-2xl">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-rose-500/15 flex items-center justify-center text-rose-450 border border-rose-500/20">
                  <Trash2 size={24} />
                </div>
                <h3 className="text-sm font-bold text-slate-100">ถอนตารางงานสั่งการ?</h3>
                
                {targetSched && (
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-left w-full space-y-1 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>ประเภทงาน:</span>
                      <span className="font-bold text-slate-200">{targetSched.type === 'Operation' ? '🟡 คุมไลน์ผลิต' : '🔵 บำรุงรักษา PM'}</span>
                    </div>
                    {opTarget && (
                      <div className="flex justify-between text-slate-400">
                        <span>ไลน์ผลิต:</span>
                        <span className="font-bold text-amber-300">{opTarget.line}</span>
                      </div>
                    )}
                    {pmTarget && (
                      <div className="flex justify-between text-slate-400">
                        <span>เครื่องจักร:</span>
                        <span className="font-bold text-indigo-300">{pmTarget.machineId}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-400">
                      <span>ช่างผู้ปฏิบัติการ:</span>
                      <span className="text-slate-200">{targetSched.technicians?.join(', ') || targetSched.technician}</span>
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-slate-400">คุณแน่ใจหรือไม่ที่จะถอนหรือยกเลิกสิทธิ์ตารางงานสั่งการช่างรายการนี้?</p>
              </div>
              <div className="flex gap-3 justify-end text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setScheduleToDelete(null)}
                  className="w-1/2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-350 py-2.5 rounded-xl cursor-pointer transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteScheduleTask}
                  className="w-1/2 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl cursor-pointer transition font-bold"
                >
                  ยืนยันถอนงาน
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* CONFIRMATION FOR DELETING REPAIR LOG */}
      {repairToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in duration-100">
          <div id="dispatch-repair-delete-modal" className="bg-slate-900 border border-slate-750 rounded-2xl max-w-sm w-full p-6 space-y-5 shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/15 flex items-center justify-center text-rose-450">
                <Trash2 size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-100">ลบประวัติแจ้งซ่อมบำรุง?</h3>
              <p className="text-[11px] text-slate-400">คุณแน่ใจหรือไม่ที่จะลบประวัติแจ้งซ่อมบำรุงนี้ออกจากการควบคุมของระบบการแสดงผล?</p>
            </div>
            <div className="flex gap-3 justify-end text-xs font-bold">
              <button
                type="button"
                onClick={() => setRepairToDelete(null)}
                className="w-1/2 bg-slate-805 border border-slate-700 text-slate-350 py-2.5 rounded-xl cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDeleteRepairTask}
                className="w-1/2 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl cursor-pointer"
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION FOR DELETING KAIZEN TASK */}
      {improvementToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in duration-100">
          <div id="dispatch-imp-delete-modal" className="bg-slate-900 border border-slate-750 rounded-2xl max-w-sm w-full p-6 space-y-5 shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/15 flex items-center justify-center text-rose-450">
                <Trash2 size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-100">ลบโครงการสั่งงานปรับปรุง?</h3>
              <p className="text-[11px] text-slate-400">คุณแน่ใจหรือไม่ที่จะลบโครงการสั่งงานปรับปรุง Kaizen นี้ออกถาว?</p>
            </div>
            <div className="flex gap-3 justify-end text-xs font-bold font-sans">
              <button
                type="button"
                onClick={() => setImprovementToDelete(null)}
                className="w-1/2 bg-slate-805 border border-slate-700 text-slate-350 py-2.5 rounded-xl cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDeleteImprovementTask}
                className="w-1/2 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl cursor-pointer"
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT REPORT SUMMARY MODAL */}
      {printReportModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div id="print-report-modal" className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]">
            
            {/* Header toolbar for print dialog */}
            <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <ClipboardList size={16} className="text-cyan-400" />
                <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest">
                  เครื่องมือพิมพ์รายงาน (Print / Export Report Engine)
                </h3>
              </div>
              <div className="flex gap-2.5">
                <button
                  onClick={() => window.print()}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 px-4 py-2 rounded-xl font-bold transition flex items-center gap-1.5 text-xs cursor-pointer shadow-lg"
                >
                  <Send size={13} className="rotate-45" />
                  🖨️ สั่งพิมพ์ออกเครื่องพิมพ์ / PDF
                </button>
                <button
                  onClick={() => setPrintReportModal(false)}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-300 px-4 py-2 rounded-xl font-bold transition text-xs cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>

            {/* Print Content area styled beautifully */}
            <div className="p-8 overflow-y-auto flex-1 bg-white text-slate-900 print:p-0 print:bg-white print:text-black scrollbar-thin" id="print-printable-area">
              <style dangerouslySetInnerHTML={{__html: `
                @media print {
                  body * {
                    visibility: hidden;
                  }
                  #print-printable-area, #print-printable-area * {
                    visibility: visible;
                  }
                  #print-printable-area {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    padding: 0 !important;
                    margin: 0 !important;
                    background: white !important;
                    color: black !important;
                  }
                  .print\\:hidden {
                    display: none !important;
                  }
                }
              `}} />

              {/* Letterhead */}
              <div className="border-b-4 border-slate-800 pb-5 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                <div>
                  <h1 className="text-xl font-black uppercase tracking-wider text-slate-900 leading-tight">
                    THAI FOOD OPERATIONS
                  </h1>
                  <p className="text-xs text-slate-500 font-bold uppercase mt-0.5 tracking-wider">
                    Maintenance & Engineering Service Department (M&E)
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                    ศูนย์ควบคุมสั่งการและจ่ายงานระบบบำรุงรักษาอุตสาหกรรมกลาง
                  </p>
                </div>
                <div className="text-left sm:text-right font-mono text-[11px] text-slate-500 leading-relaxed">
                  <p><b>เลขเอกสาร:</b> TF-MNT-{selectedDate.replace(/-/g, '')}-REP</p>
                  <p><b>วันที่ออกรายงาน:</b> {new Date().toLocaleDateString('th-TH')}</p>
                  <p><b>ช่วงเวลารายงาน:</b> เฉพาะเจาะจงวันที่ {selectedDate}</p>
                  <p><b>ผู้ประสานงาน:</b> baszafortul@gmail.com</p>
                </div>
              </div>

              {/* Report Title */}
              <div className="text-center mb-8">
                <h2 className="text-lg font-extrabold text-slate-950 uppercase tracking-wide">
                  รายงานสรุปผลการสั่งงานและควบคุมตารางซ่อมบำรุงประจำวัน
                </h2>
                <p className="text-xs text-slate-500 font-bold mt-1">
                  (Industrial Work Order Operations & Maintenance Dispatch Digest Ledger)
                </p>
              </div>

              {/* KPI Summary Row */}
              <div className="grid grid-cols-4 gap-4 mb-8 text-center">
                <div className="border border-slate-200 p-3 bg-slate-50 rounded-lg">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">ใบงานสะสมทั้งหมด</p>
                  <p className="text-xl font-black text-slate-900 mt-1">{filteredUnified.length} ใบ</p>
                </div>
                <div className="border border-slate-200 p-3 bg-slate-50 rounded-lg">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">เสร็จสมบูรณ์แล้ว</p>
                  <p className="text-xl font-black text-emerald-700 mt-1">
                    {filteredUnified.filter(u => u.status === 'เสร็จสิ้น' || u.status === 'ปิดงาน' || u.status === 'เสร็จแล้ว').length} ใบ
                  </p>
                </div>
                <div className="border border-slate-200 p-3 bg-slate-50 rounded-lg">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">อยู่ระหว่างทำ/LOTO</p>
                  <p className="text-xl font-black text-amber-700 mt-1">
                    {filteredUnified.filter(u => u.status === 'กำลังทำ' || u.status === 'กำลังดำเนินการ' || u.lotoActive).length} ใบ
                  </p>
                </div>
                <div className="border border-slate-200 p-3 bg-slate-50 rounded-lg">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">รอดำเนินการ</p>
                  <p className="text-xl font-black text-rose-700 mt-1">
                    {filteredUnified.filter(u => u.status === 'รอดำเนินการ' || u.status === 'วางแผน' || u.status === 'กำลังซ่อม').length} ใบ
                  </p>
                </div>
              </div>

              {/* Double column breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-xs">
                
                {/* Tables Part 1: Type Stats */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 p-2.5 px-3.5 border-b border-slate-200 font-extrabold text-slate-800 tracking-wider">
                    1. สรุปประสิทธิภาพตามหมวดหมู่ประเภทงาน
                  </div>
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase text-[9.5px]">
                        <th className="py-2 px-3">หมวดหมู่</th>
                        <th className="py-2 px-3 text-center">ใบงานสะสม</th>
                        <th className="py-2 px-3 text-center">เสร็จสิ้น (%)</th>
                        <th className="py-2 px-3 text-right">เฉลี่ยเวลา (นาที)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {statsByType.map(st => {
                        const rate = st.total > 0 ? Math.round((st.completed / st.total) * 100) : 0;
                        return (
                          <tr key={st.type} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-bold">
                              {st.type === 'PM' ? '🔵 แผน PM' : 
                               st.type === 'Repair' ? '🔴 ซ่อมด่วน BD' : 
                               st.type === 'Operation' ? '🟡 คุมกะผลิต' : '🟣 ปรับปรุง Kaizen'}
                            </td>
                            <td className="py-2 px-3 text-center font-mono">{st.total}</td>
                            <td className="py-2 px-3 text-center font-bold font-mono text-slate-900">{rate}%</td>
                            <td className="py-2 px-3 text-right font-mono">{st.avgDuration} นาที</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Tables Part 2: Tech workload */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 p-2.5 px-3.5 border-b border-slate-200 font-extrabold text-slate-800 tracking-wider">
                    2. สรุปภาระงานและการส่งมอบรายช่าง
                  </div>
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase text-[9.5px]">
                        <th className="py-2 px-3">ชื่อพนักงานช่าง</th>
                        <th className="py-2 px-3 text-center">ใบงานรวม</th>
                        <th className="py-2 px-3 text-center">เสร็จสิ้น (%)</th>
                        <th className="py-2 px-3 text-right">เวลาสะสม</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {statsByTech.filter(tech => tech.total > 0).map(tech => (
                        <tr key={tech.name} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-bold text-slate-800">{tech.name}</td>
                          <td className="py-2 px-3 text-center font-mono">{tech.total}</td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-900">{tech.rate}%</td>
                          <td className="py-2 px-3 text-right font-mono">{tech.totalDuration} นาที</td>
                        </tr>
                      ))}
                      {statsByTech.filter(tech => tech.total > 0).length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400 italic">ไม่มีข้อมูลช่างปฏิบัติการ</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>

              {/* Job Ledger Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden mb-12 text-xs">
                <div className="bg-slate-100 p-3 px-4 border-b border-slate-200 font-extrabold text-slate-800 tracking-wider">
                  3. บันทึกรายละเอียดข้อมูลตารางใบงานทั้งหมดประจำรอบวัน
                </div>
                <table className="w-full text-left border-collapse text-[10.5px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase text-[9.5px]">
                      <th className="py-2 px-3">รหัสใบงาน</th>
                      <th className="py-2 px-3">หมวดหมู่</th>
                      <th className="py-2 px-3">ชื่องานบำรุงรักษา / อาการและขัดข้อง</th>
                      <th className="py-2 px-3">รหัสเครื่องจักร</th>
                      <th className="py-2 px-3">ช่างผู้ได้รับจ่าย</th>
                      <th className="py-2 px-3">LOTO</th>
                      <th className="py-2 px-3 text-right">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-slate-700">
                    {filteredUnified.map((job) => {
                      const isLotoActive = job.lotoActive;
                      const lotoTag = job.lotoTag;
                      return (
                        <tr key={job.id} className="hover:bg-slate-50/40">
                          <td className="py-2 px-3 font-mono font-bold text-slate-500 truncate max-w-[80px]" title={job.id}>
                            {job.id.replace('sched-dispatch-pm-', 'PM-').replace('sched-dispatch-op-', 'OP-').replace('rep-dispatch-', 'RE-')}
                          </td>
                          <td className="py-2 px-3 font-bold uppercase">
                            {job.type}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-800">
                            {job.title}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold">
                            {job.machineId}
                          </td>
                          <td className="py-2 px-3 font-medium">
                            {job.technicians.join(', ')}
                          </td>
                          <td className="py-2 px-3">
                            {isLotoActive ? `LOTO: ${lotoTag}` : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">
                            {job.status}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Sign-off signatures block */}
              <div className="grid grid-cols-2 gap-10 pt-10 border-t border-dashed border-slate-300 text-xs">
                <div className="flex flex-col items-center">
                  <p className="text-slate-550 italic mb-12">รายงานสรุปโดย (Reporter Signature)</p>
                  <div className="w-48 border-b border-slate-900 pb-1 text-center font-bold">
                    baszafortul@gmail.com
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">เจ้าหน้าที่มาสเตอร์แพลนเนอร์แผนกบำรุงรักษา</p>
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-slate-550 italic mb-12">ผู้อนุมัติรับรอง (Authorized Signature)</p>
                  <div className="w-48 border-b border-slate-900 pb-1"></div>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">ผู้จัดการโรงงาน / Plant Manager</p>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
};
