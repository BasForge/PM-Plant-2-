import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PMPlan, PMFrequency, Machine, PMScheduleItem } from '../types';
import { 
  CalendarRange, Calendar, Clock, Wrench, CheckCircle2, AlertTriangle, 
  Search, Filter, Plus, Download, Sparkles, Layers, Eye, RefreshCw, 
  ChevronRight, ArrowRight, ShieldCheck, Tag, Building2, User,
  FileSpreadsheet, X, Check, ArrowUpDown, ChevronDown, ListChecks, Info,
  Printer, PlayCircle, Clock3, AlertCircle, Edit3, Trash2,
  CheckSquare, Square
} from 'lucide-react';
import { 
  FREQUENCY_INTERVAL_MAP, 
  FREQUENCY_BADGE_STYLES, 
  getPlannedMonthsForFrequency, 
  calculateNextDueDate, 
  generateRecommendedTbmPlans,
  getMachineCriticality,
  getWeekOfMonth,
  getWeekDateRange,
  MachineCriticality
} from '../utils/tbmHelper';
import { getTodayDateString, isPMOverdue, getPMOverdueDays } from '../utils/pmAlerts';

interface TBMPlanSchedulePageProps {
  initialMachineId?: string;
  onNavigateToSchedule?: () => void;
  onNavigateToHistory?: () => void;
}

export const TBMPlanSchedulePage: React.FC<TBMPlanSchedulePageProps> = ({
  initialMachineId,
  onNavigateToSchedule,
  onNavigateToHistory
}) => {
  const { 
    machines, 
    pmPlans, 
    setPmPlans, 
    schedules, 
    setSchedules, 
    technicians,
    canEdit, 
    canDelete 
  } = useApp();

  const todayStr = getTodayDateString();
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(6); // Default June 2026
  const [viewMode, setViewMode] = useState<'annual' | 'monthly_weeks' | 'machine_cards'>('annual');

  // Display style for Annual Matrix: 'dual' (P & A boxes) or 'unified' (single badge)
  const [matrixDisplayMode, setMatrixDisplayMode] = useState<'dual' | 'unified'>('dual');

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMachineId, setSelectedMachineId] = useState<string>(initialMachineId || 'ALL');
  const [selectedLineGroup, setSelectedLineGroup] = useState<string>('ALL');
  const [selectedCriticality, setSelectedCriticality] = useState<string>('ALL');
  const [selectedFrequency, setSelectedFrequency] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DUE_THIS_MONTH' | 'OVERDUE' | 'COMPLETED' | 'IN_PROGRESS'>('ALL');

  // Modals & Popovers
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [targetPlanForSchedule, setTargetPlanForSchedule] = useState<PMPlan | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>(todayStr);
  const [scheduleTech, setScheduleTech] = useState<string>(technicians[0] || 'ช่าง 1');
  const [scheduleNotes, setScheduleNotes] = useState<string>('');

  // Add Plan Modal State
  const [showAddPlanModal, setShowAddPlanModal] = useState<boolean>(false);
  const [newMachineId, setNewMachineId] = useState<string>(machines[0]?.id || '');
  const [newTitle, setNewTitle] = useState<string>('');
  const [newFrequency, setNewFrequency] = useState<PMFrequency>('รายเดือน');
  const [newIntervalDays, setNewIntervalDays] = useState<number>(30);
  const [newCategory, setNewCategory] = useState<'Mechanical' | 'Electrical' | 'Pneumatic' | 'Lubrication' | 'Sanitation' | 'General'>('Mechanical');
  const [newSpareParts, setNewSpareParts] = useState<string>('');
  const [newTargetMonths, setNewTargetMonths] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const [autoScheduleOnCreate, setAutoScheduleOnCreate] = useState<boolean>(false);
  const [autoScheduleTech, setAutoScheduleTech] = useState<string>(technicians[0] || 'ช่างสมชาย');
  const [newSteps, setNewSteps] = useState<{ title: string; stdTime: number }[]>([
    { title: 'ตรวจสอบสภาพภายนอกและการทำงาน', stdTime: 15 },
    { title: 'ตรวจเช็คจุดยึดและทำความสะอาด', stdTime: 15 }
  ]);

  // Edit Plan Modal State
  const [showEditPlanModal, setShowEditPlanModal] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<PMPlan | null>(null);
  const [editMachineId, setEditMachineId] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('');
  const [editFrequency, setEditFrequency] = useState<PMFrequency>('รายเดือน');
  const [editIntervalDays, setEditIntervalDays] = useState<number>(30);
  const [editCategory, setEditCategory] = useState<'Mechanical' | 'Electrical' | 'Pneumatic' | 'Lubrication' | 'Sanitation' | 'General'>('Mechanical');
  const [editSpareParts, setEditSpareParts] = useState<string>('');
  const [editTargetMonths, setEditTargetMonths] = useState<number[]>([]);
  const [editSteps, setEditSteps] = useState<{ title: string; stdTime: number }[]>([]);

  // Delete Plan Confirmation State
  const [planToDelete, setPlanToDelete] = useState<PMPlan | null>(null);
  const [deleteLinkedSchedules, setDeleteLinkedSchedules] = useState<boolean>(true);

  // Bulk Selection and Delete State (เลือกทั้งหมด & ลบแบบกลุ่ม)
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState<boolean>(false);
  const [bulkDeleteLinkedSchedules, setBulkDeleteLinkedSchedules] = useState<boolean>(true);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState<boolean>(false);

  // Task Checklist & Work Order Modal (Image 4)
  const [checklistPlan, setChecklistPlan] = useState<PMPlan | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Distinct line groups
  const lineGroups = useMemo(() => {
    const set = new Set<string>();
    machines.forEach(m => {
      if (m.lineGroup) set.add(m.lineGroup);
    });
    return Array.from(set).sort();
  }, [machines]);

  // Map machineId to machine details
  const machineMap = useMemo(() => {
    const map = new Map<string, Machine>();
    machines.forEach(m => map.set(m.id, m));
    return map;
  }, [machines]);

  // Combine pmPlans with machine information and calculate schedule executions
  const enrichedPlans = useMemo(() => {
    return pmPlans.map(plan => {
      const machine = machineMap.get(plan.machineId);
      const criticality = getMachineCriticality(machine);
      const plannedMonths = plan.targetMonths && plan.targetMonths.length > 0 
        ? plan.targetMonths 
        : getPlannedMonthsForFrequency(plan.frequency);

      // Find all schedule items linked to this plan
      const planSchedules = schedules.filter(
        s => s.type === 'PM' && s.machineId === plan.machineId && (s.pmPlanId === plan.id || s.title?.includes(plan.title))
      );

      // Find executions by month in the selected year
      const monthStatusMap: Record<number, {
        status: 'completed' | 'in_progress' | 'overdue' | 'scheduled' | 'planned' | 'none';
        item?: PMScheduleItem;
        hasPlanned: boolean;
        hasActualDone: boolean;
        completedDate?: string;
        technician?: string;
      }> = {};

      for (let m = 1; m <= 12; m++) {
        const monthPrefix = `${currentYear}-${String(m).padStart(2, '0')}`;
        const match = planSchedules.find(s => s.date.startsWith(monthPrefix));
        const isPlannedInMonth = plannedMonths.includes(m);

        if (match) {
          const techName = match.technician || match.technicians?.[0] || 'ช่าง';
          if (match.status === 'เสร็จสิ้น') {
            monthStatusMap[m] = {
              status: 'completed',
              item: match,
              hasPlanned: isPlannedInMonth,
              hasActualDone: true,
              completedDate: match.date,
              technician: techName
            };
          } else if (match.status === 'กำลังทำ') {
            monthStatusMap[m] = {
              status: 'in_progress',
              item: match,
              hasPlanned: isPlannedInMonth,
              hasActualDone: false,
              completedDate: match.date,
              technician: techName
            };
          } else if (isPMOverdue(match, todayStr)) {
            monthStatusMap[m] = {
              status: 'overdue',
              item: match,
              hasPlanned: isPlannedInMonth,
              hasActualDone: false,
              completedDate: match.date,
              technician: techName
            };
          } else {
            monthStatusMap[m] = {
              status: 'scheduled',
              item: match,
              hasPlanned: isPlannedInMonth,
              hasActualDone: false,
              technician: techName
            };
          }
        } else if (isPlannedInMonth) {
          // Check if this planned month is in the past without execution
          const currentActualMonth = parseInt(todayStr.split('-')[1], 10);
          const currentActualYear = parseInt(todayStr.split('-')[0], 10);

          if (currentYear < currentActualYear || (currentYear === currentActualYear && m < currentActualMonth)) {
            monthStatusMap[m] = { 
              status: 'overdue', 
              hasPlanned: true, 
              hasActualDone: false 
            };
          } else {
            monthStatusMap[m] = { 
              status: 'planned', 
              hasPlanned: true, 
              hasActualDone: false 
            };
          }
        } else {
          monthStatusMap[m] = { 
            status: 'none', 
            hasPlanned: false, 
            hasActualDone: false 
          };
        }
      }

      // Next due date calculation
      const lastExecution = planSchedules
        .filter(s => s.status === 'เสร็จสิ้น')
        .sort((a, b) => b.date.localeCompare(a.date))[0];

      const nextDue = calculateNextDueDate(
        lastExecution?.date || plan.lastCompletedDate, 
        plan.frequency, 
        todayStr
      );

      return {
        ...plan,
        machine,
        criticality,
        plannedMonths,
        monthStatusMap,
        lastExecutionDate: lastExecution?.date || plan.lastCompletedDate || null,
        nextDueDate: nextDue
      };
    });
  }, [pmPlans, machines, machineMap, schedules, currentYear, todayStr]);

  // Filtered plans
  const filteredPlans = useMemo(() => {
    return enrichedPlans.filter(plan => {
      // Machine filter
      if (selectedMachineId !== 'ALL' && plan.machineId !== selectedMachineId) return false;

      // Line group filter
      if (selectedLineGroup !== 'ALL' && plan.machine?.lineGroup !== selectedLineGroup) return false;

      // Criticality filter
      if (selectedCriticality !== 'ALL' && plan.criticality.level !== selectedCriticality) return false;

      // Frequency filter
      if (selectedFrequency !== 'ALL' && plan.frequency !== selectedFrequency) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesMachine = plan.machineId.toLowerCase().includes(q) || (plan.machine?.name.toLowerCase().includes(q) ?? false);
        const matchesTitle = plan.title.toLowerCase().includes(q);
        const matchesParts = plan.spareParts?.toLowerCase().includes(q);
        const matchesLocation = plan.machine?.location?.toLowerCase().includes(q);
        if (!matchesMachine && !matchesTitle && !matchesParts && !matchesLocation) return false;
      }

      // Status filter
      if (statusFilter === 'DUE_THIS_MONTH') {
        const status = plan.monthStatusMap[selectedMonth]?.status;
        if (status === 'none') return false;
      } else if (statusFilter === 'OVERDUE') {
        const hasOverdue = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].some(m => plan.monthStatusMap[m]?.status === 'overdue');
        if (!hasOverdue) return false;
      } else if (statusFilter === 'COMPLETED') {
        const hasCompleted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].some(m => plan.monthStatusMap[m]?.status === 'completed');
        if (!hasCompleted) return false;
      } else if (statusFilter === 'IN_PROGRESS') {
        const hasInProg = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].some(m => plan.monthStatusMap[m]?.status === 'in_progress');
        if (!hasInProg) return false;
      }

      return true;
    });
  }, [enrichedPlans, selectedMachineId, selectedLineGroup, selectedCriticality, selectedFrequency, searchQuery, statusFilter, selectedMonth]);

  // Key KPI stats
  const kpiStats = useMemo(() => {
    const totalPlans = enrichedPlans.length;
    const machinesWithPlans = new Set(enrichedPlans.map(p => p.machineId)).size;
    const totalMachines = machines.length;

    let dueThisMonthCount = 0;
    let completedThisMonthCount = 0;
    let inProgressThisMonthCount = 0;
    let overdueCount = 0;
    let scheduledThisMonthCount = 0;

    enrichedPlans.forEach(p => {
      const monthData = p.monthStatusMap[selectedMonth];
      if (monthData && monthData.status !== 'none') {
        dueThisMonthCount++;
        if (monthData.status === 'completed') completedThisMonthCount++;
        if (monthData.status === 'in_progress') inProgressThisMonthCount++;
        if (monthData.status === 'overdue') overdueCount++;
        if (monthData.status === 'scheduled') scheduledThisMonthCount++;
      }
    });

    const completionRate = dueThisMonthCount > 0 
      ? Math.round((completedThisMonthCount / dueThisMonthCount) * 100) 
      : 100;

    return {
      totalPlans,
      machinesWithPlans,
      totalMachines,
      dueThisMonthCount,
      completedThisMonthCount,
      inProgressThisMonthCount,
      overdueCount,
      scheduledThisMonthCount,
      completionRate
    };
  }, [enrichedPlans, machines, selectedMonth]);

  // Handler: Open Schedule PM Modal
  const handleOpenScheduleModal = (plan: PMPlan, presetMonth?: number) => {
    setTargetPlanForSchedule(plan);
    const m = presetMonth || selectedMonth;
    const monthStr = String(m).padStart(2, '0');
    
    // Check if an existing schedule is already booked for this month
    const existing = schedules.find(
      s => s.type === 'PM' && s.machineId === plan.machineId && (s.pmPlanId === plan.id || s.title?.includes(plan.title)) && s.date.startsWith(`${currentYear}-${monthStr}`)
    );

    if (existing) {
      setScheduleDate(existing.date);
      setScheduleTech(existing.technician || technicians[0] || 'ช่างสมชาย');
      setScheduleNotes(existing.notes || `ใบงานบำรุงรักษาตามรอบ TBM (${plan.frequency}) เครื่อง ${plan.machineId}`);
    } else {
      setScheduleDate(`${currentYear}-${monthStr}-15`);
      setScheduleTech(technicians[0] || 'ช่างสมชาย');
      setScheduleNotes(`ใบงานบำรุงรักษาตามรอบ TBM (${plan.frequency}) เครื่อง ${plan.machineId}`);
    }
    setShowScheduleModal(true);
  };

  // Handler: Confirm Create / Update PM Schedule Task
  const handleConfirmSchedule = () => {
    if (!targetPlanForSchedule) return;

    const m = parseInt(scheduleDate.split('-')[1], 10);
    const monthStr = String(m).padStart(2, '0');
    const existingIndex = schedules.findIndex(
      s => s.type === 'PM' && s.machineId === targetPlanForSchedule.machineId && (s.pmPlanId === targetPlanForSchedule.id || s.title?.includes(targetPlanForSchedule.title)) && s.date.startsWith(`${currentYear}-${monthStr}`)
    );

    if (existingIndex >= 0) {
      setSchedules(prev => {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          technician: scheduleTech,
          technicians: [scheduleTech],
          date: scheduleDate,
          notes: scheduleNotes
        };
        return next;
      });
      setShowScheduleModal(false);
      showToast(`✏️ ปรับปรุงนัดหมายงาน PM เครื่อง ${targetPlanForSchedule.machineId} เรียบร้อยแล้ว (${scheduleDate})`);
    } else {
      const newJob: PMScheduleItem = {
        id: `sched-tbm-${Date.now()}`,
        type: 'PM',
        technician: scheduleTech,
        technicians: [scheduleTech],
        date: scheduleDate,
        machineId: targetPlanForSchedule.machineId,
        pmPlanId: targetPlanForSchedule.id,
        status: 'รอดำเนินการ',
        duration: targetPlanForSchedule.ttm || 45,
        notes: scheduleNotes
      };

      setSchedules(prev => [newJob, ...prev]);
      setShowScheduleModal(false);
      showToast(`✅ ออกใบงาน PM เครื่อง ${targetPlanForSchedule.machineId} เข้าตารางช่างเรียบร้อยแล้ว (${scheduleDate})`);
    }
  };

  // Handler: Delete/Cancel a specific scheduled month job
  const handleDeleteMonthSchedule = (scheduleId: string) => {
    setSchedules(prev => prev.filter(s => s.id !== scheduleId));
    setShowScheduleModal(false);
    showToast(`🗑️ ลบ/ยกเลิกใบงานในตารางเดือนนี้เรียบร้อยแล้ว`);
  };

  // Handler: Quick Complete PM
  const handleQuickComplete = (plan: PMPlan, month: number) => {
    const monthStr = String(month).padStart(2, '0');
    const defaultDate = `${currentYear}-${monthStr}-15`;
    const executionDate = month === parseInt(todayStr.split('-')[1], 10) ? todayStr : defaultDate;

    // Check if there's already an item
    const existingIndex = schedules.findIndex(
      s => s.type === 'PM' && s.machineId === plan.machineId && s.pmPlanId === plan.id && s.date.startsWith(`${currentYear}-${monthStr}`)
    );

    if (existingIndex >= 0) {
      setSchedules(prev => {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          status: 'เสร็จสิ้น',
          actualDuration: plan.ttm || 45
        };
        return next;
      });
    } else {
      const completedJob: PMScheduleItem = {
        id: `sched-comp-${Date.now()}`,
        type: 'PM',
        technician: technicians[0] || 'ช่างสมชาย',
        technicians: [technicians[0] || 'ช่างสมชาย'],
        date: executionDate,
        machineId: plan.machineId,
        pmPlanId: plan.id,
        status: 'เสร็จสิ้น',
        duration: plan.ttm || 45,
        actualDuration: plan.ttm || 45
      };
      setSchedules(prev => [completedJob, ...prev]);
    }

    showToast(`✓ บันทึกผลเสร็จสิ้นงาน PM ${plan.machineId} (${plan.title}) ในเดือน ${monthNamesThai[month - 1]}/${currentYear}`);
  };

  // Handler: Change Technician in Monthly View
  const handleAssignTechnician = (plan: PMPlan, newTech: string, month: number) => {
    const monthStr = String(month).padStart(2, '0');
    const existingIndex = schedules.findIndex(
      s => s.type === 'PM' && s.machineId === plan.machineId && s.pmPlanId === plan.id && s.date.startsWith(`${currentYear}-${monthStr}`)
    );

    if (existingIndex >= 0) {
      setSchedules(prev => {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          technician: newTech,
          technicians: [newTech]
        };
        return next;
      });
    } else {
      const newJob: PMScheduleItem = {
        id: `sched-tbm-${Date.now()}`,
        type: 'PM',
        technician: newTech,
        technicians: [newTech],
        date: `${currentYear}-${monthStr}-15`,
        machineId: plan.machineId,
        pmPlanId: plan.id,
        status: 'รอดำเนินการ',
        duration: plan.ttm || 45
      };
      setSchedules(prev => [newJob, ...prev]);
    }

    showToast(`👤 มอบหมายช่าง "${newTech}" รับผิดชอบงาน PM ${plan.machineId}`);
  };

  // Handler: Change Status in Monthly View
  const handleUpdateMonthlyStatus = (plan: PMPlan, newStatus: 'เสร็จสิ้น' | 'กำลังทำ' | 'รอดำเนินการ', month: number) => {
    const monthStr = String(month).padStart(2, '0');
    const existingIndex = schedules.findIndex(
      s => s.type === 'PM' && s.machineId === plan.machineId && s.pmPlanId === plan.id && s.date.startsWith(`${currentYear}-${monthStr}`)
    );

    if (existingIndex >= 0) {
      setSchedules(prev => {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          status: newStatus,
          actualDuration: newStatus === 'เสร็จสิ้น' ? (plan.ttm || 45) : undefined
        };
        return next;
      });
    } else {
      const newJob: PMScheduleItem = {
        id: `sched-tbm-${Date.now()}`,
        type: 'PM',
        technician: technicians[0] || 'ช่างสมชาย',
        technicians: [technicians[0] || 'ช่างสมชาย'],
        date: `${currentYear}-${monthStr}-15`,
        machineId: plan.machineId,
        pmPlanId: plan.id,
        status: newStatus,
        duration: plan.ttm || 45,
        actualDuration: newStatus === 'เสร็จสิ้น' ? (plan.ttm || 45) : undefined
      };
      setSchedules(prev => [newJob, ...prev]);
    }

    showToast(`🔄 อัปเดตสถานะงาน PM เป็น "${newStatus}" เรียบร้อยแล้ว`);
  };

  // Handler: Move Plan to Week (W1-W5)
  const handleAssignWeek = (plan: PMPlan, weekNumber: number, month: number) => {
    const monthStr = String(month).padStart(2, '0');
    // Map week to representative day: W1->4, W2->11, W3->18, W4->25, W5->29
    const dayMap = [4, 11, 18, 25, 29];
    const targetDay = String(dayMap[weekNumber - 1] || 15).padStart(2, '0');
    const newDateStr = `${currentYear}-${monthStr}-${targetDay}`;

    const existingIndex = schedules.findIndex(
      s => s.type === 'PM' && s.machineId === plan.machineId && s.pmPlanId === plan.id && s.date.startsWith(`${currentYear}-${monthStr}`)
    );

    if (existingIndex >= 0) {
      setSchedules(prev => {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          date: newDateStr
        };
        return next;
      });
    } else {
      const newJob: PMScheduleItem = {
        id: `sched-tbm-${Date.now()}`,
        type: 'PM',
        technician: technicians[0] || 'ช่างสมชาย',
        technicians: [technicians[0] || 'ช่างสมชาย'],
        date: newDateStr,
        machineId: plan.machineId,
        pmPlanId: plan.id,
        status: 'รอดำเนินการ',
        duration: plan.ttm || 45
      };
      setSchedules(prev => [newJob, ...prev]);
    }

    showToast(`📅 ย้ายงาน PM ไปสัปดาห์ W${weekNumber} (${newDateStr})`);
  };

  // Handler: Auto-generate standard TBM plans
  const handleAutoGeneratePlans = () => {
    let newPlansCount = 0;
    const generated: PMPlan[] = [];

    machines.forEach(m => {
      const existing = pmPlans.filter(p => p.machineId === m.id);
      if (existing.length < 2) {
        const stdPlans = generateRecommendedTbmPlans(m);
        stdPlans.forEach(sp => {
          if (!existing.some(e => e.frequency === sp.frequency)) {
            generated.push(sp);
            newPlansCount++;
          }
        });
      }
    });

    if (generated.length === 0) {
      showToast('ℹ️ เครื่องจักรทุกเครื่องมีแผน TBM ครบถ้วนแล้ว');
      return;
    }

    setPmPlans(prev => [...prev, ...generated]);
    showToast(`✨ สร้างแผน TBM มาตรฐานสำเร็จ ${newPlansCount} รายการ ครอบคลุมทุกเครื่องจักร!`);
  };

  // Handler: Open Add Plan Modal
  const handleOpenAddPlan = (presetMachineId?: string) => {
    const targetMachId = presetMachineId || (selectedMachineId !== 'ALL' ? selectedMachineId : (machines[0]?.id || ''));
    setNewMachineId(targetMachId);
    setNewTitle('');
    setNewFrequency('รายเดือน');
    setNewIntervalDays(30);
    setNewCategory('Mechanical');
    setNewSpareParts('');
    setNewTargetMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    setAutoScheduleOnCreate(false);
    setAutoScheduleTech(technicians[0] || 'ช่างสมชาย');
    setNewSteps([
      { title: 'ตรวจสอบสภาพภายนอกและการทำงาน', stdTime: 15 },
      { title: 'ตรวจเช็คจุดยึดและทำความสะอาด', stdTime: 15 }
    ]);
    setShowAddPlanModal(true);
  };

  // Handler: Add New Custom TBM Plan
  const handleCreateNewPlan = () => {
    if (!newMachineId || !newTitle.trim()) {
      alert('กรุณาระบุรหัสเครื่องจักรและหัวข้องาน PM');
      return;
    }

    const calculatedTtm = newSteps.reduce((sum, s) => sum + (Number(s.stdTime) || 0), 0) || 30;
    const interval = newIntervalDays || FREQUENCY_INTERVAL_MAP[newFrequency] || 30;
    const plannedMonths = newTargetMonths.length > 0 ? newTargetMonths.sort((a, b) => a - b) : getPlannedMonthsForFrequency(newFrequency);

    const newPlanObj: PMPlan = {
      id: `plan-custom-${Date.now()}`,
      machineId: newMachineId,
      title: newTitle.trim(),
      frequency: newFrequency,
      intervalDays: interval,
      category: newCategory,
      steps: newSteps.map(s => ({ title: s.title.trim() || 'ตรวจเช็คตามเกณฑ์มาตรฐาน', stdTime: Number(s.stdTime) || 10 })),
      spareParts: newSpareParts.trim() || undefined,
      ttm: calculatedTtm,
      targetMonths: plannedMonths
    };

    setPmPlans(prev => [newPlanObj, ...prev]);

    // If user checked autoScheduleOnCreate, create schedule items for selected target months!
    if (autoScheduleOnCreate && plannedMonths.length > 0) {
      const newSchedules: PMScheduleItem[] = plannedMonths.map((m, idx) => ({
        id: `sched-auto-${Date.now()}-${idx}`,
        type: 'PM',
        technician: autoScheduleTech,
        technicians: [autoScheduleTech],
        date: `${currentYear}-${String(m).padStart(2, '0')}-15`,
        machineId: newMachineId,
        pmPlanId: newPlanObj.id,
        status: 'รอดำเนินการ',
        duration: calculatedTtm,
        notes: `สร้างอัตโนมัติพร้อมแผน TBM (${newFrequency})`
      }));
      setSchedules(prev => [...newSchedules, ...prev]);
    }

    setShowAddPlanModal(false);
    setNewTitle('');
    setNewSpareParts('');
    setNewSteps([
      { title: 'ตรวจสอบสภาพภายนอกและการทำงาน', stdTime: 15 },
      { title: 'ตรวจเช็คจุดยึดและทำความสะอาด', stdTime: 15 }
    ]);
    showToast(`✅ เพิ่มแผนและงาน PM "${newPlanObj.title}" สำหรับเครื่อง ${newMachineId} สำเร็จ`);
  };

  // Handler: Open Edit Plan Modal
  const handleOpenEditPlan = (plan: PMPlan) => {
    setEditingPlan(plan);
    setEditMachineId(plan.machineId);
    setEditTitle(plan.title);
    setEditFrequency(plan.frequency);
    setEditIntervalDays(plan.intervalDays || FREQUENCY_INTERVAL_MAP[plan.frequency] || 30);
    setEditCategory(plan.category || 'Mechanical');
    setEditSpareParts(plan.spareParts || '');
    setEditTargetMonths(
      plan.targetMonths && plan.targetMonths.length > 0 
        ? [...plan.targetMonths] 
        : getPlannedMonthsForFrequency(plan.frequency)
    );
    setEditSteps(
      plan.steps && plan.steps.length > 0 
        ? plan.steps.map(s => ({ title: s.title, stdTime: s.stdTime || 15 })) 
        : [
            { title: 'ตรวจสอบสภาพภายนอกและการทำงาน', stdTime: 15 },
            { title: 'ตรวจเช็คจุดยึดและทำความสะอาด', stdTime: 15 }
          ]
    );
    setShowEditPlanModal(true);
  };

  // Handler: Save Edited Plan
  const handleSaveEditPlan = () => {
    if (!editingPlan) return;
    if (!editMachineId || !editTitle.trim()) {
      alert('กรุณาระบุรหัสเครื่องจักรและหัวข้องาน PM');
      return;
    }

    const calculatedTtm = editSteps.reduce((sum, s) => sum + (Number(s.stdTime) || 0), 0) || 30;
    const cleanSteps = editSteps.map(s => ({
      title: s.title.trim() || 'ตรวจเช็คตามเกณฑ์มาตรฐาน',
      stdTime: Number(s.stdTime) || 10
    }));
    const plannedMonths = editTargetMonths.length > 0 ? editTargetMonths.sort((a, b) => a - b) : getPlannedMonthsForFrequency(editFrequency);

    const updatedPlan: PMPlan = {
      ...editingPlan,
      machineId: editMachineId,
      title: editTitle.trim(),
      frequency: editFrequency,
      intervalDays: editIntervalDays || FREQUENCY_INTERVAL_MAP[editFrequency] || 30,
      category: editCategory,
      spareParts: editSpareParts.trim() || undefined,
      ttm: calculatedTtm,
      steps: cleanSteps,
      targetMonths: plannedMonths
    };

    setPmPlans(prev => prev.map(p => p.id === editingPlan.id ? updatedPlan : p));

    // Also update any future uncompleted schedules linked to this plan if machineId or duration changed
    setSchedules(prev => prev.map(s => {
      if (s.type === 'PM' && s.pmPlanId === editingPlan.id && s.status !== 'เสร็จสิ้น') {
        return {
          ...s,
          machineId: editMachineId,
          duration: calculatedTtm
        };
      }
      return s;
    }));

    // If checklist modal is open with this plan, update it too
    if (checklistPlan?.id === editingPlan.id) {
      setChecklistPlan(updatedPlan);
    }

    setShowEditPlanModal(false);
    setEditingPlan(null);
    showToast(`✏️ อัปเดตข้อมูลและแก้ไขแผน TBM "${updatedPlan.title}" (${updatedPlan.machineId}) สำเร็จ`);
  };

  // Handler: Open Delete Confirmation Modal
  const handleOpenDeleteConfirm = (plan: PMPlan) => {
    setPlanToDelete(plan);
    setDeleteLinkedSchedules(true);
  };

  // Handler: Confirm Delete Plan
  const handleConfirmDeletePlan = () => {
    if (!planToDelete) return;

    const targetId = planToDelete.id;
    const targetTitle = planToDelete.title;
    const targetMachineId = planToDelete.machineId;

    // Remove from pmPlans
    setPmPlans(prev => prev.filter(p => p.id !== targetId));

    // Optionally remove uncompleted schedules
    if (deleteLinkedSchedules) {
      setSchedules(prev => prev.filter(s => {
        const isThisPlan = s.type === 'PM' && (s.pmPlanId === targetId || (s.machineId === targetMachineId && s.title?.includes(targetTitle)));
        if (isThisPlan && s.status !== 'เสร็จสิ้น') {
          return false;
        }
        return true;
      }));
    }

    // Close checklist modal if it was open for this plan
    if (checklistPlan?.id === targetId) {
      setChecklistPlan(null);
    }

    // Also remove from selection if selected
    setSelectedPlanIds(prev => {
      const next = new Set(prev);
      next.delete(targetId);
      return next;
    });

    setPlanToDelete(null);
    showToast(`🗑️ ลบแผนงาน PM "${targetTitle}" ของเครื่อง ${targetMachineId} สำเร็จเรียบร้อย`);
  };

  // ---------------------------------------------------------------------------
  // BULK SELECTION & BULK DELETION LOGIC (ระบบเลือกทั้งหมด & ลบแผน TBM เป็นชุด)
  // ---------------------------------------------------------------------------
  const isAllFilteredSelected = useMemo(() => {
    if (filteredPlans.length === 0) return false;
    return filteredPlans.every(p => selectedPlanIds.has(p.id));
  }, [filteredPlans, selectedPlanIds]);

  const isSomeFilteredSelected = useMemo(() => {
    if (filteredPlans.length === 0) return false;
    return filteredPlans.some(p => selectedPlanIds.has(p.id)) && !isAllFilteredSelected;
  }, [filteredPlans, selectedPlanIds, isAllFilteredSelected]);

  const handleToggleSelectPlan = (planId: string) => {
    setSelectedPlanIds(prev => {
      const next = new Set(prev);
      if (next.has(planId)) {
        next.delete(planId);
      } else {
        next.add(planId);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      // ยกเลิกเลือกทั้งหมดในตารางที่แสดงผล
      setSelectedPlanIds(prev => {
        const next = new Set(prev);
        filteredPlans.forEach(p => next.delete(p.id));
        return next;
      });
    } else {
      // เลือกแผนทั้งหมดในตารางที่แสดงผล
      setSelectedPlanIds(prev => {
        const next = new Set(prev);
        filteredPlans.forEach(p => next.add(p.id));
        return next;
      });
    }
  };

  const handleSelectAllInSystem = () => {
    const allIds = pmPlans.map(p => p.id);
    setSelectedPlanIds(new Set(allIds));
    showToast(`☑️ เลือกแผน TBM ทั้งหมดในระบบแล้ว (${allIds.length} แผน)`);
  };

  const handleClearSelection = () => {
    setSelectedPlanIds(new Set());
  };

  const handleOpenBulkDeleteModal = () => {
    if (selectedPlanIds.size === 0) {
      showToast('⚠️ กรุณาเลือกแผน TBM ที่ต้องการลบก่อน');
      return;
    }
    setBulkDeleteLinkedSchedules(true);
    setShowBulkDeleteModal(true);
  };

  const handleConfirmBulkDelete = () => {
    if (selectedPlanIds.size === 0) return;
    const count = selectedPlanIds.size;
    const idsToDelete = new Set(selectedPlanIds);

    // 1. Remove from pmPlans
    setPmPlans(prev => prev.filter(p => !idsToDelete.has(p.id)));

    // 2. Remove linked uncompleted schedules if requested
    if (bulkDeleteLinkedSchedules) {
      setSchedules(prev => prev.filter(s => {
        const isLinked = s.type === 'PM' && s.pmPlanId && idsToDelete.has(s.pmPlanId);
        if (isLinked && s.status !== 'เสร็จสิ้น') {
          return false;
        }
        return true;
      }));
    }

    // 3. Clear checklist if open with a deleted plan
    if (checklistPlan && idsToDelete.has(checklistPlan.id)) {
      setChecklistPlan(null);
    }

    setSelectedPlanIds(new Set());
    setShowBulkDeleteModal(false);
    showToast(`🗑️ ลบแผน TBM ที่เลือกสำเร็จทั้งหมด ${count} รายการเรียบร้อยแล้ว`);
  };

  const handleConfirmDeleteAllInSystem = () => {
    const totalCount = pmPlans.length;
    if (totalCount === 0) return;

    setPmPlans([]);
    if (bulkDeleteLinkedSchedules) {
      setSchedules(prev => prev.filter(s => !(s.type === 'PM' && s.status !== 'เสร็จสิ้น')));
    }
    if (checklistPlan) {
      setChecklistPlan(null);
    }
    setSelectedPlanIds(new Set());
    setShowDeleteAllModal(false);
    showToast(`🗑️ ล้างแผน TBM ทั้งหมดในระบบเรียบร้อย (${totalCount} รายการ)`);
  };

  // Selected plans list & affected machines for modal
  const selectedPlansList = useMemo(() => {
    return pmPlans.filter(p => selectedPlanIds.has(p.id));
  }, [pmPlans, selectedPlanIds]);

  const affectedMachinesCount = useMemo(() => {
    return new Set(selectedPlansList.map(p => p.machineId)).size;
  }, [selectedPlansList]);

  // Export Table to CSV
  const handleExportCSV = () => {
    const headers = [
      'Machine ID', 'Machine Name', 'Location', 'Criticality', 'PM Task', 
      'Frequency', 'Interval Days', 'Category', 'Std Time (min)', 
      'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12',
      'Spare Parts'
    ];

    const rows = filteredPlans.map(p => {
      const monthCols = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
        const st = p.monthStatusMap[m]?.status;
        if (st === 'completed') return 'Actual Done';
        if (st === 'in_progress') return 'In Progress';
        if (st === 'overdue') return 'Overdue';
        if (st === 'scheduled') return 'Scheduled';
        if (st === 'planned') return 'Planned';
        return '-';
      });

      return [
        `"${p.machineId}"`,
        `"${p.machine?.name || ''}"`,
        `"${p.machine?.location || p.machine?.lineGroup || ''}"`,
        `"${p.criticality.level}"`,
        `"${p.title}"`,
        `"${p.frequency}"`,
        p.intervalDays || FREQUENCY_INTERVAL_MAP[p.frequency],
        `"${p.category || 'Mechanical'}"`,
        p.ttm,
        ...monthCols,
        `"${p.spareParts || '-'}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `TBM_PM_Master_Schedule_${currentYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('📥 ดาวน์โหลดตารางแผนการ PM สำเร็จแล้ว');
  };

  const monthNamesThai = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];

  const monthNamesFullThai = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-emerald-950/95 border border-emerald-500/50 text-emerald-200 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-700/60 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                <CalendarRange className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                  ตารางแผนการบำรุงรักษาตามรอบเวลา
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-semibold uppercase">
                    TBM Master Plan
                  </span>
                </h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  ระบบบริหารตาราง PM รายเครื่องจักร ควบคุมความถี่รอบเวลา ติดตามสถานะ Plan (P) vs Actual (A) และจัดสรรช่างผู้รับผิดชอบ
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Bulk Selection Actions in Top Toolbar */}
            {(canDelete || canEdit) && pmPlans.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-tbm-toggle-select-all"
                  onClick={handleSelectAllFiltered}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all shadow-sm active:scale-95 cursor-pointer ${
                    isAllFilteredSelected
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-900/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                  title={isAllFilteredSelected ? "ยกเลิกการเลือกทั้งหมด" : `เลือกแผนทั้งหมดที่แสดง (${filteredPlans.length} แผน)`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>{isAllFilteredSelected ? `ยกเลิกเลือก (${filteredPlans.length})` : `เลือกทั้งหมด (${filteredPlans.length})`}</span>
                </button>

                {selectedPlanIds.size > 0 && (
                  <button
                    type="button"
                    id="btn-tbm-bulk-delete-selected"
                    onClick={handleOpenBulkDeleteModal}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-md shadow-rose-950/50 transition-all active:scale-95 cursor-pointer animate-in fade-in"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบที่เลือก ({selectedPlanIds.size})</span>
                  </button>
                )}

                <button
                  type="button"
                  id="btn-tbm-delete-all-in-system"
                  onClick={() => {
                    setBulkDeleteLinkedSchedules(true);
                    setShowDeleteAllModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-rose-950/30 hover:bg-rose-950/60 text-rose-300 border border-rose-800/40 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                  title="ลบแผน TBM ทั้งหมดในระบบ (รีเซ็ตตารางแผน)"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>ล้างแผนทั้งหมด</span>
                </button>
              </div>
            )}

            {canEdit && (
              <>
                <button
                  onClick={handleAutoGeneratePlans}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-indigo-600/30 hover:bg-indigo-600/40 border border-indigo-500/40 text-indigo-200 rounded-xl transition-all shadow-sm active:scale-95"
                  title="สร้างแผน TBM มาตรฐานให้เครื่องจักรที่ยังไม่มีแผน"
                >
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  สร้างแผน TBM แนะนำอัตโนมัติ
                </button>
                <button
                  onClick={() => setShowAddPlanModal(true)}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-md active:scale-95 shadow-emerald-900/30"
                >
                  <Plus className="w-4 h-4" />
                  เพิ่มแผน TBM ใหม่
                </button>
              </>
            )}

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-600/60 text-slate-200 rounded-xl transition-all shadow-sm active:scale-95"
            >
              <Download className="w-4 h-4 text-slate-400" />
              ส่งออก Excel / CSV
            </button>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-700/60">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3">
            <span className="text-xs text-slate-400 block mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              เครื่องในระบบ TBM
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-white">{kpiStats.machinesWithPlans}</span>
              <span className="text-xs text-slate-400">/ {kpiStats.totalMachines} เครื่อง</span>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3">
            <span className="text-xs text-slate-400 block mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              แผน PM ทั้งปี (Master)
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-sky-300">{kpiStats.totalPlans}</span>
              <span className="text-xs text-slate-400">รายการ</span>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3">
            <span className="text-xs text-slate-400 block mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              แผนเดือนนี้ ({monthNamesThai[selectedMonth - 1]})
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-blue-300">{kpiStats.dueThisMonthCount}</span>
              <span className="text-xs text-slate-400">งาน</span>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3">
            <span className="text-xs text-slate-400 block mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              เสร็จสิ้นแล้ว (Actual)
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-emerald-400">{kpiStats.completedThisMonthCount}</span>
              <span className="text-xs text-slate-400">({kpiStats.completionRate}%)</span>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3">
            <span className="text-xs text-slate-400 block mb-1 flex items-center gap-1.5">
              <PlayCircle className="w-3.5 h-3.5 text-blue-400" />
              กำลังทำ / นัดแล้ว
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-blue-300">{kpiStats.inProgressThisMonthCount + kpiStats.scheduledThisMonthCount}</span>
              <span className="text-xs text-slate-400">งาน</span>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3">
            <span className="text-xs text-slate-400 block mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              เลยกำหนด (Overdue)
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-xl font-bold ${kpiStats.overdueCount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                {kpiStats.overdueCount}
              </span>
              <span className="text-xs text-slate-400">งาน</span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Navigation Mode Switcher (Matching User Reference Image 1) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tab 1: แผนการทำงานประจำปี (PM Yearly Master Plan) */}
        <button
          onClick={() => setViewMode('annual')}
          className={`text-left p-5 rounded-2xl border transition-all relative overflow-hidden flex items-start gap-4 ${
            viewMode === 'annual'
              ? 'bg-slate-900 border-indigo-500 shadow-xl shadow-indigo-950/40 ring-2 ring-indigo-500/20'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 text-slate-400'
          }`}
        >
          <div className={`p-3.5 rounded-xl shrink-0 transition-colors ${
            viewMode === 'annual' 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
              : 'bg-slate-800 text-slate-400'
          }`}>
            <CalendarRange className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">มุมมองหลัก 1</span>
              {viewMode === 'annual' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                  กำลังแสดงผล
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-white mt-1">
              1. แผนการทำงานประจำปี (PM Yearly Master Plan)
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              ตาราง Matrix ภาพรวมทั้งปี 12 เดือน (ม.ค. - ธ.ค.) ตรวจสอบคิวล่วงหน้า พร้อมสัญลักษณ์ P (Plan) และ A (Actual)
            </p>
          </div>
        </button>

        {/* Tab 2: แผนงานรายเดือน/รายสัปดาห์ (Monthly/Weekly Schedule) */}
        <button
          onClick={() => setViewMode('monthly_weeks')}
          className={`text-left p-5 rounded-2xl border transition-all relative overflow-hidden flex items-start gap-4 ${
            viewMode === 'monthly_weeks'
              ? 'bg-slate-900 border-indigo-500 shadow-xl shadow-indigo-950/40 ring-2 ring-indigo-500/20'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 text-slate-400'
          }`}
        >
          <div className={`p-3.5 rounded-xl shrink-0 transition-colors ${
            viewMode === 'monthly_weeks' 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
              : 'bg-slate-800 text-slate-400'
          }`}>
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">มุมมองหลัก 2</span>
              {viewMode === 'monthly_weeks' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                  กำลังแสดงผล
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-white mt-1">
              2. แผนงานรายเดือน/รายสัปดาห์ (Monthly/Weekly Schedule)
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              ตารางซอยย่อยรายสัปดาห์ W1 - W5 จัดสรรช่างผู้รับผิดชอบ (Manpower Allocation) และออกใบงานเข้าตาราง
            </p>
          </div>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              ตัวกรองข้อมูลและค้นหาแผน TBM
            </h4>
          </div>

          {/* Year & Month Picker */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl">
              <span className="text-xs text-slate-400">ปีแผนงาน:</span>
              <select
                value={currentYear}
                onChange={(e) => setCurrentYear(Number(e.target.value))}
                className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer"
              >
                <option value={2025} className="bg-slate-900">2025 (2568)</option>
                <option value={2026} className="bg-slate-900">2026 (2569)</option>
                <option value={2027} className="bg-slate-900">2027 (2570)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl">
              <span className="text-xs text-slate-400">เดือนโฟกัส:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-sm font-bold text-indigo-400 outline-none cursor-pointer"
              >
                {monthNamesFullThai.map((name, idx) => (
                  <option key={idx} value={idx + 1} className="bg-slate-900">
                    {name} ({monthNamesThai[idx]})
                  </option>
                ))}
              </select>
            </div>

            {/* Optional Card View button */}
            <button
              onClick={() => setViewMode(viewMode === 'machine_cards' ? 'annual' : 'machine_cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                viewMode === 'machine_cards'
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              {viewMode === 'machine_cards' ? 'กลับสู่ตาราง' : 'มุมมองการ์ด'}
            </button>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-800/80">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหารหัส, ชื่อเครื่อง, งาน PM, อะไหล่..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Machine Filter */}
          <div>
            <select
              value={selectedMachineId}
              onChange={(e) => setSelectedMachineId(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-slate-950/70 border border-slate-700/80 rounded-xl text-white outline-none focus:border-indigo-500"
            >
              <option value="ALL">เครื่องจักร: ทั้งหมด ({machines.length} เครื่อง)</option>
              {machines.map(m => (
                <option key={m.id} value={m.id}>
                  {m.id} - {m.name} ({m.location || m.lineGroup || 'ทั่วไป'})
                </option>
              ))}
            </select>
          </div>

          {/* Location / Line Group Filter */}
          <div>
            <select
              value={selectedLineGroup}
              onChange={(e) => setSelectedLineGroup(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-slate-950/70 border border-slate-700/80 rounded-xl text-white outline-none focus:border-indigo-500"
            >
              <option value="ALL">ตำแหน่ง/ไลน์: ทั้งหมด ({lineGroups.length} โซน)</option>
              {lineGroups.map(line => (
                <option key={line} value={line}>{line}</option>
              ))}
            </select>
          </div>

          {/* Criticality Filter (Image 2: Class A/B/C) */}
          <div>
            <select
              value={selectedCriticality}
              onChange={(e) => setSelectedCriticality(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-slate-950/70 border border-slate-700/80 rounded-xl text-white outline-none focus:border-indigo-500"
            >
              <option value="ALL">ระดับความสำคัญ (Criticality): ทั้งหมด</option>
              <option value="A">Class A - วิกฤต (Critical Equipment)</option>
              <option value="B">Class B - สำคัญ (Line Essential)</option>
              <option value="C">Class C - ทั่วไป (General Equipment)</option>
            </select>
          </div>

          {/* Frequency Filter */}
          <div>
            <select
              value={selectedFrequency}
              onChange={(e) => setSelectedFrequency(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-slate-950/70 border border-slate-700/80 rounded-xl text-white outline-none focus:border-indigo-500"
            >
              <option value="ALL">รอบความถี่ (Frequency): ทั้งหมด</option>
              <option value="รายวัน">ทุก 1 วัน (Daily)</option>
              <option value="รายสัปดาห์">ทุกสัปดาห์ (Weekly)</option>
              <option value="ราย 2 สัปดาห์">ทุก 2 สัปดาห์ (Bi-Weekly)</option>
              <option value="รายเดือน">ทุก 1 เดือน (Monthly)</option>
              <option value="ราย 3 เดือน">ทุก 3 เดือน (Quarterly)</option>
              <option value="ราย 6 เดือน">ทุก 6 เดือน (Half-Year)</option>
              <option value="รายปี">ทุก 1 ปี (Annually)</option>
            </select>
          </div>
        </div>

        {/* Legend strip (Matching User Reference Image 2) */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800/60">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-300">สัญลักษณ์สีสถานะ:</span>
            
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/30">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 font-mono text-[9px] text-white flex items-center justify-center font-bold">P</span>
              <span className="text-blue-300 text-[11px]">แผนงาน (Plan)</span>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 font-mono text-[9px] text-white flex items-center justify-center font-bold">A</span>
              <span className="text-emerald-300 text-[11px]">✓ เสร็จสิ้น (Actual Done)</span>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-sky-500/20 border border-sky-500/40">
              <span className="w-2.5 h-2.5 rounded-sm bg-sky-500 font-mono text-[9px] text-white flex items-center justify-center font-bold">⚙️</span>
              <span className="text-sky-300 text-[11px]">กำลังทำ (In Progress)</span>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 font-mono text-[9px] text-white flex items-center justify-center font-bold">⏳</span>
              <span className="text-amber-300 text-[11px]">นัดในตาราง (Scheduled)</span>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 font-mono text-[9px] text-white flex items-center justify-center font-bold">!</span>
              <span className="text-rose-300 text-[11px]">⚠️ เลยกำหนด (Overdue)</span>
            </div>
          </div>

          {/* Dual vs Unified display toggle for matrix */}
          {viewMode === 'annual' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">รูปแบบช่องเดือน:</span>
              <button
                onClick={() => setMatrixDisplayMode('dual')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                  matrixDisplayMode === 'dual'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                แสดง P & A แยกกล่องคู่
              </button>
              <button
                onClick={() => setMatrixDisplayMode('unified')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                  matrixDisplayMode === 'unified'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                ป้ายสถานะเดี่ยว
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FLOATING STICKY SELECTION ACTION BAR (เมื่อมีการเลือกแผน TBM) */}
      {selectedPlanIds.size > 0 && (
        <div 
          id="tbm-floating-selection-bar"
          className="sticky top-2 z-40 bg-slate-900/95 border-2 border-indigo-500/80 backdrop-blur-md rounded-2xl p-3.5 shadow-2xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>เลือกอยู่ <span className="text-amber-400 font-mono text-sm font-bold">{selectedPlanIds.size}</span> จาก {filteredPlans.length} แผนที่แสดง</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400">ทั้งหมดในระบบ {pmPlans.length} แผน</span>
              </div>
              <div className="text-[11px] text-slate-400">
                คุณสามารถเลือกลบแผน TBM เป็นชุด หรือเลือกทุกเครื่องจักรในระบบเพื่อล้างแผน
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors cursor-pointer"
            >
              {isAllFilteredSelected ? 'ยกเลิกเลือกที่แสดง' : `เลือกทั้งหมดที่แสดง (${filteredPlans.length})`}
            </button>

            {pmPlans.length > filteredPlans.length && (
              <button
                type="button"
                onClick={handleSelectAllInSystem}
                className="px-3 py-1.5 text-xs font-semibold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 rounded-xl border border-indigo-500/40 transition-colors cursor-pointer"
              >
                เลือกทุกเครื่องในระบบ ({pmPlans.length})
              </button>
            )}

            {(canDelete || canEdit) && (
              <button
                type="button"
                id="btn-confirm-bulk-delete-bar"
                onClick={handleOpenBulkDeleteModal}
                className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-950/60 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                ลบแผนที่เลือก ({selectedPlanIds.size} รายการ)
              </button>
            )}

            <button
              type="button"
              onClick={handleClearSelection}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ml-1"
              title="ยกเลิกการเลือกทั้งหมด"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: PM YEARLY MASTER PLAN (12-MONTH MATRIX - ตาม Image 2)            */}
      {/* ========================================================================= */}
      {viewMode === 'annual' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">
                ตารางแผนการทำงานประจำปี (PM Yearly Master Plan) - ประจำปี {currentYear}
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                ({filteredPlans.length} รายการแผน)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 hidden lg:inline">
                *คลิกที่เซลล์เดือนเพื่อออกใบงานหรือบันทึกผลงาน PM
              </span>
              {canEdit && (
                <button
                  onClick={() => handleOpenAddPlan()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-all active:scale-95 shadow-emerald-950/40"
                >
                  <Plus className="w-3.5 h-3.5" />
                  เพิ่มงาน PM ใหม่
                </button>
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1280px]">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-xs font-semibold text-slate-300">
                    {/* 0. Selection Checkbox Header */}
                    <th className="py-3 px-3 w-12 text-center sticky left-0 z-30 bg-slate-950 border-r border-slate-800">
                      <input
                        type="checkbox"
                        id="checkbox-bulk-all-annual"
                        checked={isAllFilteredSelected}
                        ref={el => {
                          if (el) el.indeterminate = isSomeFilteredSelected;
                        }}
                        onChange={handleSelectAllFiltered}
                        title={isAllFilteredSelected ? "ยกเลิกเลือกทั้งหมด" : "เลือกแผนทั้งหมดที่แสดง"}
                        className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 cursor-pointer accent-indigo-500"
                      />
                    </th>

                    {/* 1. Asset Code */}
                    <th className="py-3 px-3 w-32 border-r border-slate-800">
                      รหัสเครื่องจักร (Asset Code)
                    </th>

                    {/* 2. Machine Name */}
                    <th className="py-3 px-3 w-44">
                      ชื่อเครื่องจักร (Machine Name)
                    </th>

                    {/* 3. Location / Line */}
                    <th className="py-3 px-3 w-36">
                      ตำแหน่ง / ไลน์ (Location)
                    </th>

                    {/* 4. Frequency */}
                    <th className="py-3 px-2 w-32 text-center">
                      ความถี่ (Frequency)
                    </th>

                    {/* 5. TBM Task + Checklist Link */}
                    <th className="py-3 px-3 min-w-[240px]">
                      กิจกรรม / ชื่องาน PM (TBM Task)
                    </th>

                    {/* 6. 12 Months (ม.ค. - ธ.ค.) */}
                    {monthNamesThai.map((mName, idx) => {
                      const mNum = idx + 1;
                      const isFocus = mNum === selectedMonth;
                      return (
                        <th
                          key={idx}
                          className={`py-2 px-1 text-center w-14 transition-colors cursor-pointer border-l border-slate-800/80 ${
                            isFocus 
                              ? 'bg-indigo-950/90 text-indigo-300 border-x border-indigo-500/40 font-bold' 
                              : 'hover:bg-slate-900/80 text-slate-400'
                          }`}
                          onClick={() => setSelectedMonth(mNum)}
                          title={`คลิกเพื่อเลือกเดือน ${monthNamesFullThai[idx]} เป็นเดือนโฟกัส`}
                        >
                          <div className="font-semibold text-[11px]">{mName}</div>
                          <div className="text-[9px] text-slate-500 font-normal">M{mNum}</div>
                        </th>
                      );
                    })}

                    {/* 7. Actions */}
                    <th className="py-3 px-2 min-w-[175px] text-center border-l border-slate-800">
                      การจัดการ
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredPlans.length === 0 ? (
                    <tr>
                      <td colSpan={19} className="py-14 text-center text-slate-500">
                        <Layers className="w-10 h-10 mx-auto mb-2 text-slate-600 opacity-60" />
                        <p className="font-semibold text-slate-400">ไม่พบข้อมูลแผน PM ตามเงื่อนไขที่เลือก</p>
                        <p className="text-xs text-slate-500 mt-1">ลองเปลี่ยนตัวกรอง หรือกดปุ่ม "สร้างแผน TBM แนะนำอัตโนมัติ" ด้านบน</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPlans.map((plan, idx) => {
                      const freqStyle = FREQUENCY_BADGE_STYLES[plan.frequency] || FREQUENCY_BADGE_STYLES['รายเดือน'];
                      const crit = plan.criticality;

                      return (
                        <tr 
                          key={plan.id}
                          className={`transition-colors group ${
                            selectedPlanIds.has(plan.id)
                              ? 'bg-indigo-950/30 hover:bg-indigo-950/50'
                              : 'hover:bg-slate-800/40'
                          }`}
                        >
                          {/* 0. Row Selection Checkbox */}
                          <td className="py-2.5 px-3 text-center sticky left-0 z-20 bg-slate-900/95 group-hover:bg-slate-800/95 border-r border-slate-800">
                            <input
                              type="checkbox"
                              checked={selectedPlanIds.has(plan.id)}
                              onChange={() => handleToggleSelectPlan(plan.id)}
                              title={selectedPlanIds.has(plan.id) ? "ยกเลิกเลือกแผนนี้" : "เลือกแผนนี้"}
                              className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 cursor-pointer accent-indigo-500"
                            />
                          </td>

                          {/* 1. Asset Code */}
                          <td className="py-2.5 px-3 border-r border-slate-800">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white tracking-wide font-mono text-xs">
                                {plan.machineId}
                              </span>
                              {/* Criticality Badge */}
                              <span 
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${crit.badgeClass}`}
                                title={`Criticality Class ${crit.shortLabel}: ${crit.desc}`}
                              >
                                [{crit.shortLabel}]
                              </span>
                            </div>
                          </td>

                          {/* 2. Machine Name */}
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-slate-200 truncate max-w-[160px]" title={plan.machine?.name}>
                              {plan.machine?.name || '-'}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[160px]">
                              {plan.machine?.model || ''}
                            </div>
                          </td>

                          {/* 3. Location / Line */}
                          <td className="py-2.5 px-3">
                            <div className="text-slate-300 text-[11px] truncate max-w-[140px]" title={plan.machine?.location || plan.machine?.lineGroup}>
                              {plan.machine?.location || plan.machine?.lineGroup || '-'}
                            </div>
                          </td>

                          {/* 4. Frequency */}
                          <td className="py-2.5 px-2 text-center">
                            <div className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${freqStyle.bg} ${freqStyle.text} ${freqStyle.border}`}>
                              {freqStyle.label}
                            </div>
                            <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                              รอบ {plan.intervalDays || FREQUENCY_INTERVAL_MAP[plan.frequency]} วัน
                            </div>
                          </td>

                          {/* 5. TBM Task + Task Checklist Link */}
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-slate-100 group-hover:text-indigo-200 transition-colors">
                              {plan.title}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {/* Task Checklist Link (Image 4 trigger) */}
                              <button
                                onClick={() => {
                                  setChecklistPlan(plan);
                                  setCheckedSteps({});
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-[10px] font-medium transition-all"
                                title="คลิกเพื่อดูรายการตรวจเช็คมาตรฐาน (Task Checklist Link)"
                              >
                                <ListChecks className="w-3 h-3" />
                                📋 เช็กลิสต์/ใบงาน
                              </button>

                              <span className="text-[10px] text-slate-400 font-mono">
                                ⏱ {plan.ttm} นาที
                              </span>

                              {plan.spareParts && (
                                <span className="truncate max-w-[160px] text-slate-500 text-[10px]" title={`อะไหล่: ${plan.spareParts}`}>
                                  📦 {plan.spareParts}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 6. 12 Month Cells */}
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
                            const mData = plan.monthStatusMap[m];
                            const isFocus = m === selectedMonth;
                            const hasPlan = mData?.hasPlanned;
                            const isDone = mData?.status === 'completed';
                            const isInProg = mData?.status === 'in_progress';
                            const isOverdue = mData?.status === 'overdue';
                            const isSched = mData?.status === 'scheduled';
                            const isNone = mData?.status === 'none';

                            return (
                              <td
                                key={m}
                                className={`py-1.5 px-1 text-center border-l border-slate-800/50 transition-colors ${
                                  isFocus ? 'bg-indigo-950/20' : ''
                                }`}
                              >
                                {isNone ? (
                                  <span className="text-slate-700 select-none text-xs font-mono">-</span>
                                ) : matrixDisplayMode === 'dual' ? (
                                  /* Dual P & A View (Matching Reference Image 2) */
                                  <div className="flex flex-col items-center justify-center gap-1">
                                    {/* P (Plan) Block */}
                                    {hasPlan && (
                                      <button
                                        onClick={() => handleOpenScheduleModal(plan, m)}
                                        className={`w-6 h-5 rounded text-[10px] font-mono font-bold flex items-center justify-center transition-all ${
                                          isOverdue
                                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                                            : isSched
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                            : isInProg
                                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                            : 'bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30'
                                        }`}
                                        title={
                                          isOverdue 
                                            ? 'เลยกำหนดแผน! คลิกเพื่อจัดสรรช่าง'
                                            : isSched
                                            ? `นัดหมายในตาราง (${mData?.item?.date}) โดย ${mData?.technician}`
                                            : isInProg
                                            ? `กำลังดำเนินการ โดย ${mData?.technician}`
                                            : 'มีแผน TBM ในเดือนนี้ คลิกเพื่อออกใบงาน'
                                        }
                                      >
                                        P
                                      </button>
                                    )}

                                    {/* A (Actual) Block */}
                                    {isDone ? (
                                      <button
                                        onClick={() => {
                                          setChecklistPlan(plan);
                                          setCheckedSteps({});
                                        }}
                                        className="w-6 h-5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 flex items-center justify-center transition-transform hover:scale-105"
                                        title={`ผลจริงเสร็จสิ้น (Done: ${mData?.completedDate || ''}) โดย ${mData?.technician || 'ช่าง'}`}
                                      >
                                        A ✓
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleQuickComplete(plan, m)}
                                        className="w-6 h-4 rounded text-[9px] font-mono text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center justify-center"
                                        title="คลิกเพื่อบันทึกผลเสร็จสิ้น (A)"
                                      >
                                        -
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  /* Unified Single Badge Mode */
                                  <div className="flex items-center justify-center">
                                    {isDone ? (
                                      <button
                                        onClick={() => {
                                          setChecklistPlan(plan);
                                          setCheckedSteps({});
                                        }}
                                        className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center justify-center hover:bg-emerald-500/30"
                                        title={`เสร็จสิ้นแล้ว (${mData?.completedDate || ''}) โดย ${mData?.technician || 'ช่าง'}`}
                                      >
                                        ✓
                                      </button>
                                    ) : isInProg ? (
                                      <button
                                        onClick={() => handleOpenScheduleModal(plan, m)}
                                        className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold flex items-center justify-center animate-pulse"
                                        title={`กำลังดำเนินการ โดย ${mData?.technician || 'ช่าง'}`}
                                      >
                                        ⚙️
                                      </button>
                                    ) : isOverdue ? (
                                      <button
                                        onClick={() => handleOpenScheduleModal(plan, m)}
                                        className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/50 font-bold flex items-center justify-center animate-pulse"
                                        title="เลยกำหนดแผน! คลิกเพื่อเปิดใบงานเข้าตารางช่างด่วน"
                                      >
                                        !
                                      </button>
                                    ) : isSched ? (
                                      <button
                                        onClick={() => handleOpenScheduleModal(plan, m)}
                                        className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center justify-center"
                                        title={`นัดหมายในตาราง (${mData?.item?.date}) โดย ${mData?.technician}`}
                                      >
                                        ⏳
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleOpenScheduleModal(plan, m)}
                                        className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 font-medium flex items-center justify-center"
                                        title="ตามแผน TBM คลิกเพื่อเปิดใบงานเข้าตารางช่าง"
                                      >
                                        P
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}

                          {/* 7. Action Column */}
                          <td className="py-2 px-2 text-center border-l border-slate-800">
                            <div className="flex items-center justify-center gap-1">
                              {/* Edit Plan Button */}
                              {canEdit && (
                                <button
                                  onClick={() => handleOpenEditPlan(plan)}
                                  className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg border border-amber-500/30 transition-all hover:scale-105"
                                  title="แก้ไขข้อมูลแผน PM และขั้นตอนตรวจเช็ค"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete Plan Button */}
                              {(canDelete || canEdit) && (
                                <button
                                  onClick={() => handleOpenDeleteConfirm(plan)}
                                  className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg border border-rose-500/30 transition-all hover:scale-105"
                                  title="ลบแผนงาน PM นี้ออกจากระบบ"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Open Schedule / Dispatch Job */}
                              <button
                                onClick={() => handleOpenScheduleModal(plan, selectedMonth)}
                                className="p-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 rounded-lg border border-indigo-500/40 transition-all hover:scale-105"
                                title="เปิด/ออกใบงาน PM เข้าตารางช่าง"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                              </button>

                              {/* Quick Complete */}
                              <button
                                onClick={() => handleQuickComplete(plan, selectedMonth)}
                                className="p-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 rounded-lg border border-emerald-500/40 transition-all hover:scale-105"
                                title={`บันทึกผลเสร็จสิ้นในเดือน ${monthNamesThai[selectedMonth - 1]}`}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>

                              {/* Checklist */}
                              <button
                                onClick={() => {
                                  setChecklistPlan(plan);
                                  setCheckedSteps({});
                                }}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-all hover:scale-105"
                                title="ดูเช็กลิสต์และขั้นตอนมาตรฐาน"
                              >
                                <ListChecks className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: MONTHLY/WEEKLY SCHEDULE (W1-W5 - ตาม Image 3)                    */}
      {/* ========================================================================= */}
      {viewMode === 'monthly_weeks' && (
        <div className="space-y-4">
          {/* Month Bar & Navigation */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  ตารางแผนงานรายเดือน / รายสัปดาห์: เดือน{monthNamesFullThai[selectedMonth - 1]} {currentYear}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold font-mono">
                    W1 - W5
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  จัดสรรช่างผู้รับผิดชอบ (Manpower Allocation) และระบุสัปดาห์ปฏิบัติงานจริง (W1: 1-7, W2: 8-14, W3: 15-21, W4: 22-28, W5: 29-31)
                </p>
              </div>
            </div>

            {/* Quick Month Switch Buttons & Add Plan Button */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1">
                {monthNamesThai.map((m, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedMonth(idx + 1)}
                    className={`px-2.5 py-1.5 text-xs rounded-lg font-semibold transition-all shrink-0 ${
                      selectedMonth === idx + 1
                        ? 'bg-indigo-600 text-white shadow shadow-indigo-600/30 font-bold'
                        : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              {canEdit && (
                <button
                  onClick={() => handleOpenAddPlan()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-all active:scale-95 shadow-emerald-950/40 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  เพิ่มงาน PM ใหม่
                </button>
              )}
            </div>
          </div>

          {/* Weekly Schedule Table (Matching Image 3) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1100px]">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-xs font-semibold text-slate-300">
                    {/* 0. Selection Checkbox Header */}
                    <th className="py-3 px-3 w-12 text-center border-r border-slate-800">
                      <input
                        type="checkbox"
                        id="checkbox-bulk-all-monthly"
                        checked={isAllFilteredSelected}
                        ref={el => {
                          if (el) el.indeterminate = isSomeFilteredSelected;
                        }}
                        onChange={handleSelectAllFiltered}
                        title={isAllFilteredSelected ? "ยกเลิกเลือกทั้งหมด" : "เลือกแผนทั้งหมดที่แสดง"}
                        className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 cursor-pointer accent-indigo-500"
                      />
                    </th>

                    {/* 1. Asset Info */}
                    <th className="py-3 px-3 w-40">
                      รายการ / เครื่องจักร (Asset)
                    </th>

                    {/* 2. TBM Task + Checklist Link */}
                    <th className="py-3 px-3 min-w-[260px]">
                      กิจกรรมที่ต้องทำ (TBM Task)
                    </th>

                    {/* 3. Manpower Allocation (ช่างผู้รับผิดชอบ) */}
                    <th className="py-3 px-3 w-44">
                      ช่างผู้รับผิดชอบ (Manpower)
                    </th>

                    {/* 4. Weekly Columns W1 to W5 */}
                    <th className="py-3 px-2 text-center w-28 bg-slate-900/60 border-l border-slate-800">
                      <div className="font-bold text-slate-200">W1</div>
                      <div className="text-[10px] text-slate-500 font-normal">1-7 {monthNamesThai[selectedMonth - 1]}</div>
                    </th>
                    <th className="py-3 px-2 text-center w-28 bg-slate-900/40 border-l border-slate-800">
                      <div className="font-bold text-slate-200">W2</div>
                      <div className="text-[10px] text-slate-500 font-normal">8-14 {monthNamesThai[selectedMonth - 1]}</div>
                    </th>
                    <th className="py-3 px-2 text-center w-28 bg-slate-900/60 border-l border-slate-800">
                      <div className="font-bold text-slate-200">W3</div>
                      <div className="text-[10px] text-slate-500 font-normal">15-21 {monthNamesThai[selectedMonth - 1]}</div>
                    </th>
                    <th className="py-3 px-2 text-center w-28 bg-slate-900/40 border-l border-slate-800">
                      <div className="font-bold text-slate-200">W4</div>
                      <div className="text-[10px] text-slate-500 font-normal">22-28 {monthNamesThai[selectedMonth - 1]}</div>
                    </th>
                    <th className="py-3 px-2 text-center w-28 bg-slate-900/60 border-l border-slate-800">
                      <div className="font-bold text-slate-200">W5</div>
                      <div className="text-[10px] text-slate-500 font-normal">29-31 {monthNamesThai[selectedMonth - 1]}</div>
                    </th>

                    {/* 5. Status */}
                    <th className="py-3 px-3 w-32 text-center border-l border-slate-800">
                      สถานะ (Status)
                    </th>

                    {/* 6. Action */}
                    <th className="py-3 px-2 min-w-[155px] text-center border-l border-slate-800">
                      การจัดการ
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredPlans.filter(p => p.monthStatusMap[selectedMonth]?.status !== 'none').length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-14 text-center text-slate-500">
                        <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-600 opacity-60" />
                        <p className="font-semibold text-slate-400">ไม่มีแผน PM ที่มีกำหนดในเดือน{monthNamesFullThai[selectedMonth - 1]}</p>
                        <p className="text-xs text-slate-500 mt-1">ลองสลับเดือน หรือตรวจสอบตัวกรองด้านบน</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPlans
                      .filter(p => p.monthStatusMap[selectedMonth]?.status !== 'none')
                      .map(plan => {
                        const mData = plan.monthStatusMap[selectedMonth];
                        const freqStyle = FREQUENCY_BADGE_STYLES[plan.frequency] || FREQUENCY_BADGE_STYLES['รายเดือน'];
                        const crit = plan.criticality;

                        // Find active week for this task
                        const scheduledItem = mData?.item;
                        const dayOfSched = scheduledItem ? parseInt(scheduledItem.date.split('-')[2], 10) : 12;
                        const activeWeek = dayOfSched <= 7 ? 1 : dayOfSched <= 14 ? 2 : dayOfSched <= 21 ? 3 : dayOfSched <= 28 ? 4 : 5;

                        // Assigned technician
                        const assignedTech = scheduledItem?.technician || scheduledItem?.technicians?.[0] || 'ช่างสมชาย';

                        // Current status string
                        const currentStatus = scheduledItem?.status || (mData?.status === 'completed' ? 'เสร็จสิ้น' : 'รอดำเนินการ');

                        return (
                          <tr 
                            key={plan.id} 
                            className={`transition-colors ${
                              selectedPlanIds.has(plan.id)
                                ? 'bg-indigo-950/30 hover:bg-indigo-950/50'
                                : 'hover:bg-slate-800/40'
                            }`}
                          >
                            {/* 0. Row Selection Checkbox */}
                            <td className="py-3 px-3 text-center border-r border-slate-800">
                              <input
                                type="checkbox"
                                checked={selectedPlanIds.has(plan.id)}
                                onChange={() => handleToggleSelectPlan(plan.id)}
                                title={selectedPlanIds.has(plan.id) ? "ยกเลิกเลือกแผนนี้" : "เลือกแผนนี้"}
                                className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 cursor-pointer accent-indigo-500"
                              />
                            </td>

                            {/* 1. Asset Info */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white font-mono text-xs">{plan.machineId}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${crit.badgeClass}`}>
                                  [{crit.shortLabel}]
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-300 font-medium truncate max-w-[150px]" title={plan.machine?.name}>
                                {plan.machine?.name}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                                {plan.machine?.location || plan.machine?.lineGroup || '-'}
                              </div>
                            </td>

                            {/* 2. TBM Task + Task Checklist Link */}
                            <td className="py-3 px-3">
                              <div className="font-medium text-slate-200">
                                {plan.title}
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                {/* Task Checklist Link (Image 4 trigger) */}
                                <button
                                  onClick={() => {
                                    setChecklistPlan(plan);
                                    setCheckedSteps({});
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-[10px] font-medium transition-all"
                                  title="คลิกเพื่อดูขั้นตอนและเช็กลิสต์ตรวจเช็ค"
                                >
                                  <ListChecks className="w-3 h-3" />
                                  📋 ดูเช็กลิสต์ / ขั้นตอนตรวจเช็ค
                                </button>

                                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${freqStyle.bg} ${freqStyle.text} ${freqStyle.border}`}>
                                  {freqStyle.label}
                                </span>

                                <span className="text-[10px] text-slate-400 font-mono">
                                  ⏱ {plan.ttm} น.
                                </span>
                              </div>
                            </td>

                            {/* 3. Manpower Allocation (Technician Selector - Image 3) */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <select
                                  value={assignedTech}
                                  onChange={(e) => handleAssignTechnician(plan, e.target.value, selectedMonth)}
                                  className="w-full py-1.5 px-2 bg-slate-950 border border-slate-700/80 rounded-lg text-slate-200 text-xs outline-none focus:border-indigo-500 font-medium cursor-pointer"
                                >
                                  {technicians.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                              </div>
                            </td>

                            {/* 4. Weekly Columns (W1 - W5) */}
                            {[1, 2, 3, 4, 5].map(wNum => {
                              const isThisWeek = activeWeek === wNum;
                              return (
                                <td 
                                  key={wNum} 
                                  className="py-2.5 px-2 text-center border-l border-slate-800/40"
                                >
                                  {isThisWeek ? (
                                    <div 
                                      className={`p-1.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                                        currentStatus === 'เสร็จสิ้น'
                                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                          : currentStatus === 'กำลังทำ'
                                          ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                                          : mData?.status === 'overdue'
                                          ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                                          : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                                      }`}
                                    >
                                      {/* Big Wrench Icon (Image 3) */}
                                      <Wrench className="w-4 h-4" />
                                      <span className="font-mono text-[10px] font-bold">
                                        {scheduledItem ? `${scheduledItem.date.split('-')[2]} ${monthNamesThai[selectedMonth - 1]}` : `W${wNum}`}
                                      </span>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleAssignWeek(plan, wNum, selectedMonth)}
                                      className="w-full h-8 flex items-center justify-center text-slate-700 hover:text-indigo-400 hover:bg-slate-800/60 rounded-lg transition-colors text-xs"
                                      title={`คลิกเพื่อย้ายงานมาสัปดาห์ W${wNum}`}
                                    >
                                      -
                                    </button>
                                  )}
                                </td>
                              );
                            })}

                            {/* 5. Status Selector */}
                            <td className="py-3 px-3 text-center border-l border-slate-800">
                              <select
                                value={currentStatus}
                                onChange={(e) => handleUpdateMonthlyStatus(plan, e.target.value as any, selectedMonth)}
                                className={`py-1 px-2 rounded-lg text-xs font-semibold outline-none border cursor-pointer ${
                                  currentStatus === 'เสร็จสิ้น'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : currentStatus === 'กำลังทำ'
                                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                }`}
                              >
                                <option value="เสร็จสิ้น" className="bg-slate-900 text-emerald-300">เสร็จสิ้น (Done)</option>
                                <option value="กำลังทำ" className="bg-slate-900 text-sky-300">กำลังทำ (In Progress)</option>
                                <option value="รอดำเนินการ" className="bg-slate-900 text-amber-300">รอดำเนินการ (Pending)</option>
                              </select>
                            </td>

                            {/* 6. Action Column */}
                            <td className="py-2 px-2 text-center border-l border-slate-800">
                              <div className="flex items-center justify-center gap-1">
                                {canEdit && (
                                  <button
                                    onClick={() => handleOpenEditPlan(plan)}
                                    className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg border border-amber-500/30 transition-all hover:scale-105"
                                    title="แก้ไขข้อมูลแผน PM และขั้นตอนตรวจเช็ค"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {(canDelete || canEdit) && (
                                  <button
                                    onClick={() => handleOpenDeleteConfirm(plan)}
                                    className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg border border-rose-500/30 transition-all hover:scale-105"
                                    title="ลบแผนงาน PM นี้ออกจากระบบ"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <button
                                  onClick={() => handleOpenScheduleModal(plan, selectedMonth)}
                                  className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition-all hover:scale-105"
                                  title="เปิด/แก้ไขใบงาน PM ในตารางช่าง"
                                >
                                  <Calendar className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => {
                                    setChecklistPlan(plan);
                                    setCheckedSteps({});
                                  }}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-all hover:scale-105"
                                  title="ดูเช็กลิสต์และขั้นตอนมาตรฐาน"
                                >
                                  <ListChecks className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: MACHINE CARDS VIEW                                                */}
      {/* ========================================================================= */}
      {viewMode === 'machine_cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {machines
            .filter(m => selectedMachineId === 'ALL' || m.id === selectedMachineId)
            .filter(m => selectedLineGroup === 'ALL' || m.lineGroup === selectedLineGroup)
            .map(machine => {
              const machinePlans = enrichedPlans.filter(p => p.machineId === machine.id);
              const crit = getMachineCriticality(machine);

              return (
                <div 
                  key={machine.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-white tracking-wide font-mono">{machine.id}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${crit.badgeClass}`}>
                            Class {crit.shortLabel}
                          </span>
                        </div>
                        <h4 className="text-xs text-slate-400 mt-0.5">{machine.name}</h4>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {machine.location || machine.lineGroup || 'ทั่วไป'}
                        </div>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                        {machinePlans.length} แผน TBM
                      </span>
                    </div>

                    {/* Plans List for this Machine */}
                    <div className="space-y-2 mt-4">
                      {machinePlans.length === 0 ? (
                        <div className="p-4 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                          ยังไม่มีแผน TBM สำหรับเครื่องนี้
                        </div>
                      ) : (
                        machinePlans.map(p => {
                          const freqStyle = FREQUENCY_BADGE_STYLES[p.frequency] || FREQUENCY_BADGE_STYLES['รายเดือน'];
                          return (
                            <div 
                              key={p.id}
                              className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl hover:border-slate-700 transition-all flex items-start justify-between gap-3"
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${freqStyle.bg} ${freqStyle.text} ${freqStyle.border}`}>
                                    {freqStyle.label}
                                  </span>
                                  <span className="text-xs font-medium text-slate-200 truncate">{p.title}</span>
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-3">
                                  <span>⏱ {p.ttm} นาที</span>
                                  {p.nextDueDate && (
                                    <span>🗓 รอบถัดไป: {p.nextDueDate}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {canEdit && (
                                  <button
                                    onClick={() => handleOpenEditPlan(p)}
                                    className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg border border-amber-500/30 transition-all hover:scale-105"
                                    title="แก้ไขแผน PM นี้"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {(canDelete || canEdit) && (
                                  <button
                                    onClick={() => handleOpenDeleteConfirm(p)}
                                    className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg border border-rose-500/30 transition-all hover:scale-105"
                                    title="ลบแผน PM นี้"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setChecklistPlan(p);
                                    setCheckedSteps({});
                                  }}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-all hover:scale-105"
                                  title="ดูเช็กลิสต์"
                                >
                                  <ListChecks className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenScheduleModal(p)}
                                  className="p-1.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white rounded-lg border border-indigo-500/30 transition-all hover:scale-105"
                                  title="เปิดใบงาน PM"
                                >
                                  <Calendar className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500">สถานะเครื่อง: <strong className="text-emerald-400 font-normal">{machine.status || 'ปกติ'}</strong></span>
                    {canEdit && (
                      <button
                        onClick={() => handleOpenAddPlan(machine.id)}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        เพิ่มหัวข้อ PM
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TASK CHECKLIST & WORK ORDER DETAILS (ตาม Image 4: Task Checklist)*/}
      {/* ========================================================================= */}
      {checklistPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/90 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                  <ListChecks className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      {checklistPlan.machineId}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${checklistPlan.criticality.badgeClass}`}>
                      Class {checklistPlan.criticality.shortLabel} ({checklistPlan.criticality.label})
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">
                    {checklistPlan.title}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {checklistPlan.machine?.name} • ตำแหน่ง: {checklistPlan.machine?.location || checklistPlan.machine?.lineGroup || '-'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {canEdit && (
                  <button
                    onClick={() => {
                      const p = checklistPlan;
                      setChecklistPlan(null);
                      handleOpenEditPlan(p);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg border border-amber-500/30 transition-all hover:scale-105"
                    title="แก้ไขแผนงานนี้"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>แก้ไข</span>
                  </button>
                )}
                {(canDelete || canEdit) && (
                  <button
                    onClick={() => {
                      const p = checklistPlan;
                      setChecklistPlan(null);
                      handleOpenDeleteConfirm(p);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg border border-rose-500/30 transition-all hover:scale-105"
                    title="ลบแผนงานนี้"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบ</span>
                  </button>
                )}
                <button 
                  onClick={() => setChecklistPlan(null)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">ความถี่รอบเวลา:</span>
                <span className="font-bold text-indigo-300">{checklistPlan.frequency}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">ระยะคาบเวลา:</span>
                <span className="font-mono font-bold text-slate-200">
                  {checklistPlan.intervalDays || FREQUENCY_INTERVAL_MAP[checklistPlan.frequency]} วัน
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">เวลามาตรฐานรวม (TTM):</span>
                <span className="font-mono font-bold text-emerald-400">{checklistPlan.ttm} นาที</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">หมวดหมู่:</span>
                <span className="font-semibold text-slate-300">{checklistPlan.category || 'Mechanical'}</span>
              </div>
            </div>

            {/* Spare parts note */}
            {checklistPlan.spareParts && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
                <Tag className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">อะไหล่สำรองที่ต้องเตรียมก่อนปฏิบัติงาน:</strong>
                  <p className="text-slate-300 mt-0.5">{checklistPlan.spareParts}</p>
                </div>
              </div>
            )}

            {/* Standard Steps Checklist (Image 4) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  ขั้นตอนการตรวจเช็คมาตรฐาน (Standard Inspection Steps):
                </h4>
                <span className="text-[11px] text-slate-500">
                  ตรวจเสร็จแล้ว {Object.values(checkedSteps).filter(Boolean).length}/{checklistPlan.steps.length} ข้อ
                </span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {checklistPlan.steps.map((step, idx) => {
                  const isChecked = !!checkedSteps[idx];
                  return (
                    <label 
                      key={idx}
                      className={`p-3 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition-all ${
                        isChecked 
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-100'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => setCheckedSteps(prev => ({ ...prev, [idx]: !prev[idx] }))}
                          className="mt-0.5 w-4 h-4 rounded text-emerald-600 bg-slate-900 border-slate-700 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-medium block leading-snug">
                            <strong className="text-indigo-400 font-mono mr-1.5">Step {idx + 1}:</strong>
                            {step.title}
                          </span>
                        </div>
                      </div>

                      <span className="text-[11px] font-mono text-slate-400 shrink-0 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                        {step.stdTime} นาที
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Action Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 font-semibold transition-colors"
              >
                <Printer className="w-4 h-4" />
                พิมพ์เช็กลิสต์ (Print Sheet)
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = checklistPlan;
                    setChecklistPlan(null);
                    handleOpenScheduleModal(target, selectedMonth);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
                >
                  <Calendar className="w-4 h-4" />
                  ออกใบงานเข้าตารางช่าง
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleQuickComplete(checklistPlan, selectedMonth);
                    setChecklistPlan(null);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  บันทึกเสร็จสิ้น
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SCHEDULE PM TASK (ออกใบงานเข้าตารางช่าง)                         */}
      {/* ========================================================================= */}
      {showScheduleModal && targetPlanForSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">ออกใบงาน PM เข้าตารางช่าง</h3>
                  <p className="text-xs text-slate-400">กำหนดวันและช่างผู้รับผิดชอบงานบำรุงรักษาเชิงป้องกัน</p>
                </div>
              </div>
              <button 
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">เครื่องจักร:</span>
                <span className="font-bold text-white font-mono">{targetPlanForSchedule.machineId} ({targetPlanForSchedule.machine?.name})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">หัวข้องาน PM:</span>
                <span className="font-semibold text-indigo-300">{targetPlanForSchedule.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">รอบเวลา (Frequency):</span>
                <span className="text-slate-300 font-mono">{targetPlanForSchedule.frequency} ({targetPlanForSchedule.intervalDays || 30} วัน)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">เวลามาตรฐาน (TTM):</span>
                <span className="text-emerald-400 font-mono font-bold">{targetPlanForSchedule.ttm} นาที</span>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  วันที่ต้องการเข้าปฏิบัติงาน:
                </label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  ช่างผู้รับผิดชอบหลัก (Lead Technician):
                </label>
                <select
                  value={scheduleTech}
                  onChange={(e) => setScheduleTech(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-indigo-500"
                >
                  {technicians.map(tech => (
                    <option key={tech} value={tech}>{tech}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  หมายเหตุ / ข้อควรระวังพิเศษ:
                </label>
                <textarea
                  value={scheduleNotes}
                  onChange={(e) => setScheduleNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-indigo-500 resize-none"
                  placeholder="เช่น ต้องดับเบรคเกอร์ก่อนเข้าทำงาน, ติดต่อหัวหน้ากะผลิต..."
                />
              </div>
            </div>

            {(() => {
              const m = parseInt(scheduleDate.split('-')[1], 10);
              const monthStr = String(m).padStart(2, '0');
              const existingSchedule = schedules.find(
                s => s.type === 'PM' && s.machineId === targetPlanForSchedule.machineId && (s.pmPlanId === targetPlanForSchedule.id || s.title?.includes(targetPlanForSchedule.title)) && s.date.startsWith(`${currentYear}-${monthStr}`)
              );

              return (
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
                  {existingSchedule && (canDelete || canEdit) ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteMonthSchedule(existingSchedule.id)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl border border-rose-500/30 transition-colors"
                      title="ยกเลิกนัดหมายงานในตารางเดือนนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ยกเลิกงานเดือนนี้</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowScheduleModal(false)}
                      className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmSchedule}
                      className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
                    >
                      {existingSchedule ? 'บันทึกแก้ไขตารางช่าง' : 'ยืนยันออกใบงานเข้าตาราง'}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADD NEW CUSTOM TBM PLAN                                          */}
      {/* ========================================================================= */}
      {showAddPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">เพิ่มแผนบำรุงรักษา TBM ใหม่</h3>
                  <p className="text-xs text-slate-400">สร้างมาตรฐานการบำรุงรักษาเชิงป้องกันตามรอบเวลา</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddPlanModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    เครื่องจักร (Machine):
                  </label>
                  <select
                    value={newMachineId}
                    onChange={(e) => setNewMachineId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-indigo-500"
                  >
                    {machines.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.id} - {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    ความถี่ตามรอบเวลา (TBM Frequency):
                  </label>
                  <select
                    value={newFrequency}
                    onChange={(e) => {
                      const f = e.target.value as PMFrequency;
                      setNewFrequency(f);
                      setNewIntervalDays(FREQUENCY_INTERVAL_MAP[f] || 30);
                      setNewTargetMonths(getPlannedMonthsForFrequency(f));
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-indigo-500"
                  >
                    <option value="รายวัน">ทุก 1 วัน (รายวัน)</option>
                    <option value="รายสัปดาห์">ทุกสัปดาห์ (รายสัปดาห์)</option>
                    <option value="ราย 2 สัปดาห์">ทุก 2 สัปดาห์ (14 วัน)</option>
                    <option value="รายเดือน">ทุก 1 เดือน (รายเดือน)</option>
                    <option value="ราย 3 เดือน">ทุก 3 เดือน (ไตรมาส)</option>
                    <option value="ราย 6 เดือน">ทุก 6 เดือน (ครึ่งปี)</option>
                    <option value="รายปี">ทุก 1 ปี (รายปี)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  ชื่องานบำรุงรักษาเชิงป้องกัน (TBM Task Title):
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="เช่น ตรวจสอบความตึงสายพานและอัดจาระบีลูกปืน..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    ระยะคาบเวลา (รอบวัน / Interval Days):
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={730}
                      value={newIntervalDays}
                      onChange={(e) => setNewIntervalDays(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono outline-none focus:border-indigo-500"
                    />
                    <span className="text-slate-400 font-medium">วัน</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    หมวดหมู่งาน (Category):
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-indigo-500"
                  >
                    <option value="Mechanical">Mechanical (กลไกเครื่องกล)</option>
                    <option value="Electrical">Electrical (ระบบไฟฟ้า/คอนโทรล)</option>
                    <option value="Pneumatic">Pneumatic (ระบบนิวเมติกส์/ลม)</option>
                    <option value="Lubrication">Lubrication (การหล่อลื่น/จาระบี)</option>
                    <option value="Sanitation">Sanitation (สุขาภิบาล/ทำความสะอาด)</option>
                    <option value="General">General (งานทั่วไป)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  อะไหล่ที่ต้องใช้ / เปลี่ยนตามอายุ:
                </label>
                <input
                  type="text"
                  value={newSpareParts}
                  onChange={(e) => setNewSpareParts(e.target.value)}
                  placeholder="เช่น ซีลยาง, น้ำมันเกียร์, กรองอากาศ..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-indigo-500"
                />
              </div>

              {/* Target Months Selector for 12-Month Matrix */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold">
                    เดือนที่ต้องทำตามแผนประจำปี (Target Months):
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setNewTargetMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold px-1.5 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20"
                    >
                      ทุกเดือน
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTargetMonths(getPlannedMonthsForFrequency(newFrequency))}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20"
                    >
                      ตามรอบความถี่
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTargetMonths([])}
                      className="text-[10px] text-slate-400 hover:text-slate-300 font-semibold px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700"
                    >
                      ล้าง
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
                    const isSelected = newTargetMonths.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setNewTargetMonths(prev => 
                            prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m].sort((a, b) => a - b)
                          );
                        }}
                        className={`py-1.5 rounded text-center text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow shadow-indigo-600/30'
                            : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
                        }`}
                      >
                        M{m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auto Schedule Checkbox */}
              <div className="p-3 bg-indigo-950/20 rounded-xl border border-indigo-500/30 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-200 font-semibold">
                  <input
                    type="checkbox"
                    checked={autoScheduleOnCreate}
                    onChange={(e) => setAutoScheduleOnCreate(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                  <span>สร้างงานนัดหมายเข้าตารางช่างทันทีสำหรับเดือนที่เลือก</span>
                </label>
                {autoScheduleOnCreate && (
                  <div className="pl-6 pt-1 flex items-center gap-2">
                    <span className="text-slate-400 shrink-0">ช่างผู้รับผิดชอบ:</span>
                    <select
                      value={autoScheduleTech}
                      onChange={(e) => setAutoScheduleTech(e.target.value)}
                      className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs outline-none focus:border-indigo-500"
                    >
                      {technicians.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Steps Management */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-slate-300 font-semibold">
                    ขั้นตอนการตรวจเช็ค (Standard Steps) & เวลามาตรฐาน (นาที):
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewSteps([...newSteps, { title: '', stdTime: 10 }])}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    เพิ่มขั้นตอน
                  </button>
                </div>

                <div className="space-y-2">
                  {newSteps.map((step, sIdx) => (
                    <div key={sIdx} className="flex items-center gap-2">
                      <span className="w-5 text-center text-slate-500 font-mono text-[11px]">{sIdx + 1}.</span>
                      <input
                        type="text"
                        value={step.title}
                        onChange={(e) => {
                          const updated = [...newSteps];
                          updated[sIdx].title = e.target.value;
                          setNewSteps(updated);
                        }}
                        placeholder="รายละเอียดขั้นตอน..."
                        className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs outline-none focus:border-indigo-500"
                      />
                      <div className="flex items-center gap-1 w-24">
                        <input
                          type="number"
                          min={1}
                          max={999}
                          value={step.stdTime}
                          onChange={(e) => {
                            const updated = [...newSteps];
                            updated[sIdx].stdTime = Number(e.target.value);
                            setNewSteps(updated);
                          }}
                          className="w-14 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs font-mono text-center outline-none focus:border-indigo-500"
                        />
                        <span className="text-[11px] text-slate-400">นาที</span>
                      </div>
                      {newSteps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setNewSteps(newSteps.filter((_, i) => i !== sIdx))}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-3 p-2 bg-slate-950/80 rounded-lg border border-slate-800 text-right text-xs text-slate-300">
                  เวลารวมมาตรฐาน (Total TTM): <strong className="text-emerald-400 font-mono text-sm">{newSteps.reduce((acc, s) => acc + (s.stdTime || 0), 0)} นาที</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddPlanModal(false)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleCreateNewPlan}
                className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg transition-all active:scale-95"
              >
                บันทึกแผน TBM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: EDIT TBM PLAN & CHECKLIST                                        */}
      {/* ========================================================================= */}
      {showEditPlanModal && editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">แก้ไขแผนบำรุงรักษา TBM</h3>
                  <p className="text-xs text-slate-400">ปรับปรุงรายละเอียดแผน รอบเวลา เดือนเป้าหมาย และขั้นตอนตรวจเช็ค</p>
                </div>
              </div>
              <button 
                onClick={() => setShowEditPlanModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    เครื่องจักร (Machine):
                  </label>
                  <select
                    value={editMachineId}
                    onChange={(e) => setEditMachineId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-indigo-500"
                  >
                    {machines.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.id} - {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    ความถี่ตามรอบเวลา (TBM Frequency):
                  </label>
                  <select
                    value={editFrequency}
                    onChange={(e) => {
                      const f = e.target.value as PMFrequency;
                      setEditFrequency(f);
                      setEditIntervalDays(FREQUENCY_INTERVAL_MAP[f] || 30);
                      setEditTargetMonths(getPlannedMonthsForFrequency(f));
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-indigo-500"
                  >
                    <option value="รายวัน">ทุก 1 วัน (รายวัน)</option>
                    <option value="รายสัปดาห์">ทุกสัปดาห์ (รายสัปดาห์)</option>
                    <option value="ราย 2 สัปดาห์">ทุก 2 สัปดาห์ (14 วัน)</option>
                    <option value="รายเดือน">ทุก 1 เดือน (รายเดือน)</option>
                    <option value="ราย 3 เดือน">ทุก 3 เดือน (ไตรมาส)</option>
                    <option value="ราย 6 เดือน">ทุก 6 เดือน (ครึ่งปี)</option>
                    <option value="รายปี">ทุก 1 ปี (รายปี)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  ชื่องานบำรุงรักษาเชิงป้องกัน (TBM Task Title):
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="เช่น ตรวจสอบความตึงสายพานและอัดจาระบีลูกปืน..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    ระยะคาบเวลา (รอบวัน / Interval Days):
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={730}
                      value={editIntervalDays}
                      onChange={(e) => setEditIntervalDays(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono outline-none focus:border-indigo-500"
                    />
                    <span className="text-slate-400 font-medium">วัน</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    หมวดหมู่งาน (Category):
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-indigo-500"
                  >
                    <option value="Mechanical">Mechanical (กลไกเครื่องกล)</option>
                    <option value="Electrical">Electrical (ระบบไฟฟ้า/คอนโทรล)</option>
                    <option value="Pneumatic">Pneumatic (ระบบนิวเมติกส์/ลม)</option>
                    <option value="Lubrication">Lubrication (การหล่อลื่น/จาระบี)</option>
                    <option value="Sanitation">Sanitation (สุขาภิบาล/ทำความสะอาด)</option>
                    <option value="General">General (งานทั่วไป)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  อะไหล่ที่ต้องใช้ / เปลี่ยนตามอายุ:
                </label>
                <input
                  type="text"
                  value={editSpareParts}
                  onChange={(e) => setEditSpareParts(e.target.value)}
                  placeholder="เช่น ซีลยาง, น้ำมันเกียร์, กรองอากาศ..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-indigo-500"
                />
              </div>

              {/* Target Months Selector */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold">
                    เดือนที่ต้องทำตามแผนประจำปี (Target Months):
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditTargetMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold px-1.5 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20"
                    >
                      ทุกเดือน
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditTargetMonths(getPlannedMonthsForFrequency(editFrequency))}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20"
                    >
                      ตามรอบความถี่
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditTargetMonths([])}
                      className="text-[10px] text-slate-400 hover:text-slate-300 font-semibold px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700"
                    >
                      ล้าง
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
                    const isSelected = editTargetMonths.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setEditTargetMonths(prev => 
                            prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m].sort((a, b) => a - b)
                          );
                        }}
                        className={`py-1.5 rounded text-center text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-amber-600 text-white shadow shadow-amber-600/30'
                            : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
                        }`}
                      >
                        M{m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Steps Management */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-slate-300 font-semibold">
                    ขั้นตอนการตรวจเช็ค (Standard Steps) & เวลามาตรฐาน (นาที):
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditSteps([...editSteps, { title: '', stdTime: 10 }])}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    เพิ่มขั้นตอน
                  </button>
                </div>

                <div className="space-y-2">
                  {editSteps.map((step, sIdx) => (
                    <div key={sIdx} className="flex items-center gap-2">
                      <span className="w-5 text-center text-slate-500 font-mono text-[11px]">{sIdx + 1}.</span>
                      <input
                        type="text"
                        value={step.title}
                        onChange={(e) => {
                          const updated = [...editSteps];
                          updated[sIdx].title = e.target.value;
                          setEditSteps(updated);
                        }}
                        placeholder="รายละเอียดขั้นตอน..."
                        className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs outline-none focus:border-amber-500"
                      />
                      <div className="flex items-center gap-1 w-24">
                        <input
                          type="number"
                          min={1}
                          max={999}
                          value={step.stdTime}
                          onChange={(e) => {
                            const updated = [...editSteps];
                            updated[sIdx].stdTime = Number(e.target.value);
                            setEditSteps(updated);
                          }}
                          className="w-14 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs font-mono text-center outline-none focus:border-amber-500"
                        />
                        <span className="text-[11px] text-slate-400">นาที</span>
                      </div>
                      {editSteps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setEditSteps(editSteps.filter((_, i) => i !== sIdx))}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-3 p-2 bg-slate-950/80 rounded-lg border border-slate-800 text-right text-xs text-slate-300">
                  เวลารวมมาตรฐาน (Total TTM): <strong className="text-amber-400 font-mono text-sm">{editSteps.reduce((acc, s) => acc + (s.stdTime || 0), 0)} นาที</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowEditPlanModal(false)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveEditPlan}
                className="px-5 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-lg transition-all active:scale-95"
              >
                บันทึกการแก้ไข
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: CONFIRM DELETE TBM PLAN                                          */}
      {/* ========================================================================= */}
      {planToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">ยืนยันการลบแผนงาน PM?</h3>
                <p className="text-xs text-slate-400">
                  คุณแน่ใจหรือไม่ว่าต้องการลบแผนงาน TBM นี้ออกจากระบบ ข้อมูลนี้จะไม่สามารถกู้คืนได้
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">รหัสเครื่องจักร:</span>
                <span className="font-bold text-white font-mono">{planToDelete.machineId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">หัวข้องาน PM:</span>
                <span className="font-semibold text-rose-300 text-right truncate max-w-[220px]">{planToDelete.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">ความถี่รอบเวลา:</span>
                <span className="text-slate-300 font-mono">{planToDelete.frequency}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">เวลามาตรฐาน (TTM):</span>
                <span className="text-emerald-400 font-mono font-bold">{planToDelete.ttm} นาที</span>
              </div>
            </div>

            <label className="flex items-center gap-2.5 p-3 bg-rose-950/20 rounded-xl border border-rose-500/30 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={deleteLinkedSchedules}
                onChange={(e) => setDeleteLinkedSchedules(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 bg-slate-900 border-slate-700 cursor-pointer shrink-0"
              />
              <span>ลบงานนัดหมายในตารางช่างที่ยังไม่เสร็จสิ้นซึ่งผูกกับแผนนี้ด้วย</span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setPlanToDelete(null)}
                className="px-4 py-2 font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePlan}
                className="px-5 py-2 font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-600/30 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                ยืนยันการลบแผนงาน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: CONFIRM BULK DELETE SELECTED TBM PLANS                           */}
      {/* ========================================================================= */}
      {showBulkDeleteModal && (
        <div 
          id="tbm-bulk-delete-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  ยืนยันการลบแผน TBM ที่เลือก ({selectedPlanIds.size} รายการ)?
                </h3>
                <p className="text-xs text-slate-400">
                  คุณได้เลือกแผนงานบำรุงรักษาเชิงป้องกัน (TBM) จำนวน <strong className="text-rose-400 font-bold">{selectedPlanIds.size} แผน</strong> เพื่อทำการลบออกจากระบบ ข้อมูลนี้จะไม่สามารถกู้คืนได้
                </p>
              </div>
            </div>

            {/* Summary Box */}
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-slate-400">จำนวนแผนงานที่เลือก:</span>
                <span className="font-bold text-rose-400 font-mono text-sm">{selectedPlanIds.size} แผน</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">ครอบคลุมเครื่องจักร:</span>
                <span className="font-semibold text-white font-mono">{affectedMachinesCount} เครื่อง</span>
              </div>

              {/* Scrollable plan list preview */}
              <div className="pt-2 border-t border-slate-800/80 flex-1 overflow-hidden flex flex-col">
                <div className="text-[11px] text-slate-400 mb-1.5 font-medium flex items-center justify-between">
                  <span>รายการแผนงานที่จะถูกลบ:</span>
                  <span className="text-[10px] text-slate-500">แสดงทั้งหมด {selectedPlansList.length} รายการ</span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-[11px] custom-scrollbar">
                  {selectedPlansList.map(plan => (
                    <div key={plan.id} className="flex items-center justify-between bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
                      <div className="flex items-center gap-2 truncate">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono text-[10px] font-bold shrink-0">
                          {plan.machineId}
                        </span>
                        <span className="text-slate-200 truncate">{plan.title}</span>
                      </div>
                      <span className="text-slate-400 text-[10px] font-mono shrink-0 ml-2">
                        {plan.frequency}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Option: delete linked uncompleted schedules */}
            <label className="flex items-center gap-2.5 p-3 bg-rose-950/20 rounded-xl border border-rose-500/30 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={bulkDeleteLinkedSchedules}
                onChange={(e) => setBulkDeleteLinkedSchedules(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 bg-slate-900 border-slate-700 cursor-pointer shrink-0 accent-rose-600"
              />
              <span>ลบงานนัดหมาย PM ในตารางช่างที่ยังไม่เสร็จสิ้นซึ่งผูกกับแผนเหล่านี้ด้วย</span>
            </label>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-4 py-2 font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                id="btn-confirm-bulk-delete-action"
                onClick={handleConfirmBulkDelete}
                className="px-5 py-2 font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-600/30 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                ยืนยันลบ {selectedPlanIds.size} แผนที่เลือก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: CONFIRM DELETE ALL TBM PLANS IN SYSTEM                           */}
      {/* ========================================================================= */}
      {showDeleteAllModal && (
        <div 
          id="tbm-delete-all-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="bg-slate-900 border-2 border-rose-500/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-2xl bg-rose-600 text-white shadow-lg shadow-rose-900/50 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-rose-400">
                  คำเตือน: ลบแผน TBM ทั้งหมดในระบบ ({pmPlans.length} แผน)
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  คุณกำลังจะล้างแผน PM ตามรอบเวลา (TBM) ทุกแผนของทุกเครื่องจักรในระบบทั้งหมด ({pmPlans.length} แผน) ออกจากระบบ
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-200 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <span>⚠️ การดำเนินการนี้ไม่สามารถย้อนกลับได้</span>
              </p>
              <p className="text-[11px] text-rose-300/90 leading-relaxed">
                เมื่อลบแล้ว แผนงาน PM ทั้งหมดจะถูกล้างออกจากระบบ หากต้องการสร้างแผนใหม่ คุณสามารถใช้ปุ่ม "สร้างแผน TBM แนะนำอัตโนมัติ" หรือเพิ่มแผนใหม่เองได้ตลอดเวลา
              </p>
            </div>

            <label className="flex items-center gap-2.5 p-3 bg-slate-950/80 rounded-xl border border-slate-800 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={bulkDeleteLinkedSchedules}
                onChange={(e) => setBulkDeleteLinkedSchedules(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 bg-slate-900 border-slate-700 cursor-pointer shrink-0 accent-rose-600"
              />
              <span>ลบงานนัดหมาย PM ในตารางช่างที่ยังไม่เสร็จสิ้นทั้งหมดด้วย</span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setShowDeleteAllModal(false)}
                className="px-4 py-2 font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                id="btn-confirm-delete-all-action"
                onClick={handleConfirmDeleteAllInSystem}
                className="px-5 py-2 font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-600/30 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                ยืนยันลบแผนทั้งหมด ({pmPlans.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
