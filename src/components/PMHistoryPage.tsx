import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PMScheduleItem, PMPlan, Machine } from '../types';
import { 
  Plus, Search, ClipboardCheck, Clock, ChevronDown, CheckCircle, 
  AlertTriangle, Filter, Trash2, Edit, FileSpreadsheet, Hourglass, 
  HelpCircle, Sparkles, TrendingUp, TrendingDown, Users, RefreshCw,
  Bell, History, Send, ShieldAlert, ArrowRight
} from 'lucide-react';
import { PMRescheduleModal } from './PMRescheduleModal';
import { 
  getTodayDateString, getPMOverdueDays, isPMOverdue, isPMRescheduled, 
  getOverdueAndRescheduledSummary 
} from '../utils/pmAlerts';

export const PMHistoryPage: React.FC = () => {
  const { schedules, setSchedules, pmPlans, machines, technicians, spareParts, setSpareParts, settings } = useApp();
  const todayStr = getTodayDateString();

  // Search/Filters states
  const [machineFilter, setMachineFilter] = useState('');
  const [techFilter, setTechFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [varianceFilter, setVarianceFilter] = useState<'all' | 'delayed' | 'faster' | 'ontime' | 'pending' | 'overdue' | 'rescheduled'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'variance' | 'duration'>('date');

  // Reschedule Modal state
  const [rescheduleTargetJob, setRescheduleTargetJob] = useState<PMScheduleItem | null>(null);

  // Add/Edit Form visibility
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // View Details Modal state
  const [selectedPmDetail, setSelectedPmDetail] = useState<PMScheduleItem | null>(null);

  // Details popover/info
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form Inputs
  const [formMachine, setFormMachine] = useState(machines[0]?.id || '');
  const [formPlan, setFormPlan] = useState('');
  const [formDate, setFormDate] = useState('2026-06-10');
  const [formTechnician, setFormTechnician] = useState(technicians[0] || 'ช่าง 1');
  const [formTechnicians, setFormTechnicians] = useState<string[]>([]);
  const [formDuration, setFormDuration] = useState<number>(30); // Std duration
  const [formActualDuration, setFormActualDuration] = useState<number>(35); // Actual spent
  const [formOvertimeReason, setFormOvertimeReason] = useState<string>(''); // Reason why PM took longer than standard
  const [formStatus, setFormStatus] = useState<'รอดำเนินการ' | 'กำลังทำ' | 'เสร็จสิ้น'>('เสร็จสิ้น');

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

  // Spare parts in PM form state
  const [formUsedParts, setFormUsedParts] = useState<{ partId: string; quantity: number; pricePerUnit: number; totalCost: number }[]>([]);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partSearchQuery, setPartSearchQuery] = useState('');
  const [selectedPartQty, setSelectedPartQty] = useState<number>(1);
  const [selectedPartPrice, setSelectedPartPrice] = useState<number>(0);
  const [formOtherCost, setFormOtherCost] = useState<number>(0);

  // Helper companion to add part to current list
  const handleAddPartToForm = () => {
    if (!selectedPartId) {
      alert("กรุณาเลือกอะไหล่ก่อน");
      return;
    }
    if (selectedPartQty <= 0) {
      alert("จำนวนอะไหล่ต้องมากกว่า 0");
      return;
    }
    const partObj = spareParts.find(p => p.id === selectedPartId);
    if (!partObj) return;

    // Check if part already in list
    const existingIndex = formUsedParts.findIndex(p => p.partId === selectedPartId);
    if (existingIndex >= 0) {
      setFormUsedParts(prev => prev.map((item, idx) => {
        if (idx === existingIndex) {
          const newQty = item.quantity + selectedPartQty;
          return {
            ...item,
            quantity: newQty,
            totalCost: newQty * item.pricePerUnit
          };
        }
        return item;
      }));
    } else {
      const price = selectedPartPrice > 0 ? selectedPartPrice : partObj.pricePerUnit;
      setFormUsedParts(prev => [...prev, {
        partId: selectedPartId,
        quantity: selectedPartQty,
        pricePerUnit: price,
        totalCost: selectedPartQty * price
      }]);
    }

    // Reset part inputs
    setSelectedPartId('');
    setSelectedPartQty(1);
    setSelectedPartPrice(0);
  };

  const handleRemovePartFromForm = (partId: string) => {
    setFormUsedParts(prev => prev.filter(p => p.partId !== partId));
  };

  // When formMachine changes, update recommended plans
  const handleMachineChangeForForm = (mId: string) => {
    setFormMachine(mId);
    const relatedPlans = pmPlans.filter(p => p.machineId === mId);
    if (relatedPlans.length > 0) {
      setFormPlan(relatedPlans[0].id);
      setFormDuration(relatedPlans[0].ttm || 30);
      setFormActualDuration(relatedPlans[0].ttm || 30);
    } else {
      setFormPlan('');
      setFormDuration(30);
      setFormActualDuration(30);
    }
  };

  // When formPlan changes, update recommended standard duration
  const handlePlanChangeForForm = (planId: string) => {
    setFormPlan(planId);
    const selectedPlan = pmPlans.find(p => p.id === planId);
    if (selectedPlan) {
      setFormDuration(selectedPlan.ttm || 30);
      setFormActualDuration(selectedPlan.ttm || 30);
    }
  };

  // Helper companion technician toggling
  const toggleTechnician = (techName: string) => {
    setFormTechnicians(prev => 
      prev.includes(techName) 
        ? prev.filter(t => t !== techName) 
        : [...prev, techName]
    );
  };

  // Extract all PM items from schedules state
  const pmJobs = schedules.filter(s => s.type === 'PM') as PMScheduleItem[];

  // Save history handler
  const handleSavePmHistory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMachine) {
      alert("กรุณาเลือกเครื่องจักร");
      return;
    }
    if (!formPlan) {
      alert("กรุณาเลือกรายการแผน PM");
      return;
    }
    if (formDuration <= 0) {
      alert("เวลาแผนมาตรฐานต้องมากกว่า 0 นาที");
      return;
    }
    if (formStatus === 'เสร็จสิ้น' && formActualDuration <= 0) {
      alert("เวลาที่ใช้ทำจริงต้องมากกว่า 0 นาที เมื่อบันทึกงานเสร็จสิ้น");
      return;
    }

    const primaryTech = formTechnicians.length > 0 ? formTechnicians[0] : (formTechnician || 'ช่าง 1');

    // Adjust inventory stock
    let tempSpareParts = [...spareParts];
    if (editingId) {
      const oldPm = schedules.find(s => s.id === editingId && s.type === 'PM') as PMScheduleItem | undefined;
      if (oldPm && oldPm.usedParts) {
        for (const op of oldPm.usedParts) {
          tempSpareParts = tempSpareParts.map(sp => {
            if (sp.id === op.partId) {
              return { ...sp, quantity: sp.quantity + op.quantity };
            }
            return sp;
          });
        }
      }
    }
    // Deduct new parts
    for (const np of formUsedParts) {
      tempSpareParts = tempSpareParts.map(sp => {
        if (sp.id === np.partId) {
          return { ...sp, quantity: Math.max(0, sp.quantity - np.quantity) };
        }
        return sp;
      });
    }
    setSpareParts(tempSpareParts);

    if (editingId) {
      // Edit existing scheduled PM log
      setSchedules(prev => prev.map(s => {
        if (s.id === editingId && s.type === 'PM') {
          return {
            ...s,
            machineId: formMachine,
            pmPlanId: formPlan,
            date: formDate,
            technician: primaryTech,
            technicians: formTechnicians,
            duration: formDuration,
            actualDuration: formStatus === 'เสร็จสิ้น' ? formActualDuration : undefined,
            overtimeReason: (formStatus === 'เสร็จสิ้น' && formActualDuration > formDuration) ? formOvertimeReason.trim() : undefined,
            status: formStatus,
            usedParts: formUsedParts,
            otherCost: Number(formOtherCost) || 0
          } as PMScheduleItem;
        }
        return s;
      }));
    } else {
      // Add new PM record
      const newPmJob: PMScheduleItem = {
        id: `pm-hist-${Date.now()}`,
        type: 'PM',
        technician: primaryTech,
        technicians: formTechnicians,
        date: formDate,
        machineId: formMachine,
        pmPlanId: formPlan,
        status: formStatus,
        duration: formDuration,
        actualDuration: formStatus === 'เสร็จสิ้น' ? formActualDuration : undefined,
        overtimeReason: (formStatus === 'เสร็จสิ้น' && formActualDuration > formDuration) ? formOvertimeReason.trim() : undefined,
        usedParts: formUsedParts,
        otherCost: Number(formOtherCost) || 0
      };
      setSchedules(prev => [newPmJob, ...prev]);
    }

    setShowFormModal(false);
    setEditingId(null);
    setFormPlan('');
    setFormTechnicians([]);
    setFormOvertimeReason('');
    setFormUsedParts([]);
    setFormOtherCost(0);
    setSelectedPartId('');
    setPartSearchQuery('');
    setSelectedPartQty(1);
    setSelectedPartPrice(0);
  };

  const handleEditClick = (job: PMScheduleItem) => {
    setEditingId(job.id);
    setFormMachine(job.machineId);
    setFormPlan(job.pmPlanId);
    setFormDate(job.date);
    setFormTechnician(job.technician);
    setFormTechnicians(job.technicians || [job.technician]);
    setFormDuration(job.duration);
    setFormActualDuration(job.actualDuration ?? job.duration);
    setFormOvertimeReason(job.overtimeReason || '');
    setFormStatus(job.status);
    setFormUsedParts(job.usedParts || []);
    setFormOtherCost(job.otherCost || 0);
    setSelectedPartId('');
    setPartSearchQuery('');
    setSelectedPartQty(1);
    setSelectedPartPrice(0);
    setShowFormModal(true);
  };

  const handleDeletePmHistory = (id: string) => {
    const logToDelete = schedules.find(s => s.id === id && s.type === 'PM') as PMScheduleItem | undefined;
    if (logToDelete && logToDelete.usedParts) {
      let tempSpareParts = [...spareParts];
      for (const op of logToDelete.usedParts) {
        tempSpareParts = tempSpareParts.map(sp => {
          if (sp.id === op.partId) {
            return { ...sp, quantity: sp.quantity + op.quantity };
          }
          return sp;
        });
      }
      setSpareParts(tempSpareParts);
    }
    setSchedules(prev => prev.filter(s => s.id !== id));
    setDeleteConfirmId(null);
  };

  // Export to spreadsheet/CSV with Thai fallback
  const handleExportToExcel = () => {
    const headers = [
      'รหัสงาน PM',
      'รหัสเครื่องจักร',
      'ชื่อเครื่องจักร',
      'กลุ่มระบบสายผลิต',
      'ชื่องานบำรุงรักษา (PM Plan)',
      'ประเภทความถี่',
      'วันที่ดำเนินการ',
      'เวลามาตรฐานแผน (นาที)',
      'เวลาที่ใช้ปฏิบัติงานจริง (นาที)',
      'ผลต่างเวลา (นาที)',
      'อัตราปรับปรุง (%)',
      'สาเหตุที่ใช้เวลาเกินมาตรฐาน',
      'ช่างเทคนิคผู้ดูแลหลัก',
      'ช่างเทคนิคร่วมปฏิบัติงาน',
      'สถานะการทำงาน'
    ];

    const csvRows = [headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',')];

    filteredPmJobs.forEach(job => {
      const machDetail = machines.find(m => m.id === job.machineId);
      const mName = machDetail ? machDetail.name : 'เครื่องจักรทั่วไป';
      const mGroup = machDetail ? machDetail.lineGroup : '-';
      
      const planDetail = pmPlans.find(p => p.id === job.pmPlanId);
      const pTitle = planDetail ? planDetail.title : 'บำรุงรักษาทั่วไป';
      const pFreq = planDetail ? planDetail.frequency : 'รายเดือน';

      const actualMins = job.actualDuration !== undefined ? job.actualDuration : job.duration;
      const variance = job.status === 'เสร็จสิ้น' && job.actualDuration !== undefined 
        ? job.actualDuration - job.duration 
        : 0;
      
      const variancePercent = job.status === 'เสร็จสิ้น' && job.actualDuration !== undefined && job.duration > 0
        ? Math.round((variance / job.duration) * 100)
        : 0;

      const varianceStr = variance === 0 ? 'ตรงเวลา' : variance > 0 ? `+${variance} (ช้า)` : `${variance} (เร็ว)`;

      const row = [
        job.id,
        job.machineId,
        mName,
        mGroup,
        pTitle,
        pFreq,
        job.date,
        job.duration,
        job.actualDuration !== undefined ? job.actualDuration : 'ยังไม่ได้ลงบันทึก',
        job.status === 'เสร็จสิ้น' ? varianceStr : '-',
        job.status === 'เสร็จสิ้น' ? `${variancePercent}%` : '-',
        job.overtimeReason || '-',
        job.technician,
        job.technicians ? job.technicians.join('; ') : '-',
        job.status
      ];

      csvRows.push(row.map(val => {
        const str = String(val === null || val === undefined ? '' : val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(','));
    });

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `PM_Time_Variance_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter & Sort jobs logic
  const filteredPmJobs = pmJobs.filter(job => {
    // 1. Machine search/filter
    const matchMachine = machineFilter 
      ? job.machineId.toLowerCase().includes(machineFilter.toLowerCase()) 
      : true;
    
    // 2. Tech filter
    const matchTech = techFilter 
      ? (job.technicians ? job.technicians.includes(techFilter) : job.technician === techFilter) 
      : true;
    
    // 3. Month filter
    const matchMonth = monthFilter ? job.date.startsWith(monthFilter) : true;

    // 4. Variance / Status / Overdue filter
    if (varianceFilter === 'delayed') {
      return matchMachine && matchTech && matchMonth && job.status === 'เสร็จสิ้น' && job.actualDuration !== undefined && job.actualDuration > job.duration;
    } else if (varianceFilter === 'faster') {
      return matchMachine && matchTech && matchMonth && job.status === 'เสร็จสิ้น' && job.actualDuration !== undefined && job.actualDuration < job.duration;
    } else if (varianceFilter === 'ontime') {
      return matchMachine && matchTech && matchMonth && job.status === 'เสร็จสิ้น' && job.actualDuration !== undefined && job.actualDuration === job.duration;
    } else if (varianceFilter === 'pending') {
      return matchMachine && matchTech && matchMonth && (job.status !== 'เสร็จสิ้น' || job.actualDuration === undefined);
    } else if (varianceFilter === 'overdue') {
      return matchMachine && matchTech && matchMonth && isPMOverdue(job, todayStr);
    } else if (varianceFilter === 'rescheduled') {
      return matchMachine && matchTech && matchMonth && isPMRescheduled(job);
    }
    
    return matchMachine && matchTech && matchMonth;
  }).sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    } else if (sortBy === 'duration') {
      return b.duration - a.duration;
    } else if (sortBy === 'variance') {
      const varA = a.actualDuration !== undefined ? (a.actualDuration - a.duration) : 0;
      const varB = b.actualDuration !== undefined ? (b.actualDuration - b.duration) : 0;
      return varB - varA; // Worst variance first (longest delaying job first)
    }
    return 0;
  });

  // Calculate high level KPI Metrics for the dashboard
  const { overdueJobs, rescheduledJobs, totalOverdueCount, totalRescheduledCount, criticalCount } = 
    getOverdueAndRescheduledSummary(pmJobs, todayStr);

  const completedJobs = pmJobs.filter(job => job.status === 'เสร็จสิ้น' && job.actualDuration !== undefined);
  const totalCompletedCount = completedJobs.length;

  const totalStdMins = completedJobs.reduce((sum, j) => sum + j.duration, 0);
  const totalActMins = completedJobs.reduce((sum, j) => sum + (j.actualDuration || j.duration), 0);
  const totalDiffMins = totalActMins - totalStdMins;

  const avgVariancePercent = totalStdMins > 0 ? Math.round((totalDiffMins / totalStdMins) * 100) : 0;

  const fasterJobsCount = completedJobs.filter(j => (j.actualDuration || 0) < j.duration).length;
  const delayedJobsCount = completedJobs.filter(j => (j.actualDuration || 0) > j.duration).length;
  const onTimeJobsCount = completedJobs.filter(j => (j.actualDuration || 0) === j.duration).length;

  const onTimeOrFasterRate = totalCompletedCount > 0 
    ? Math.round(((fasterJobsCount + onTimeJobsCount) / totalCompletedCount) * 100) 
    : 100;

  return (
    <div className="space-y-6" id="pm-history-page-root">
      
      {/* HIGH VISIBILITY OVERDUE PM ALERT BANNER */}
      {totalOverdueCount > 0 && (
        <div 
          id="pm-overdue-alert-banner" 
          className="bg-rose-950/40 border-2 border-rose-500/50 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl backdrop-blur-xs animate-in slide-in-from-top-2 duration-300"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/40 shrink-0 mt-0.5">
              <ShieldAlert size={22} className="animate-bounce text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-rose-200">
                  แจ้งเตือนงาน PM เลยกำหนดเวลาตามแผน ({totalOverdueCount} งาน)
                </h3>
                <span className="px-2 py-0.5 bg-rose-500 text-slate-950 rounded-full text-[10px] font-mono font-black animate-pulse">
                  ACTION REQUIRED
                </span>
              </div>
              <p className="text-xs text-rose-300/80 mt-1">
                ตรวจพบงานบำรุงรักษาเชิงป้องกันที่เลยกำหนดวันที่ลงแผนไว้และยังไม่เสร็จสิ้น กรุณาตรวจสอบหรือกด <b>"เลื่อนแผน"</b> เพื่อระบุเหตุผลและบันทึกประวัติการเลื่อน
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
            <button
              id="btn-filter-overdue-pm"
              onClick={() => {
                setVarianceFilter('overdue');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                varianceFilter === 'overdue'
                  ? 'bg-rose-500 text-slate-950 font-black'
                  : 'bg-rose-900/60 hover:bg-rose-900 border border-rose-700 text-rose-200'
              }`}
            >
              <Filter size={13} />
              <span>แสดงเฉพาะงานที่เลยกำหนด ({totalOverdueCount})</span>
            </button>

            {overdueJobs[0] && (
              <button
                id="btn-quick-reschedule-first-overdue"
                onClick={() => setRescheduleTargetJob(overdueJobs[0])}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-450 hover:to-orange-450 text-slate-950 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-lg shadow-amber-500/10 cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>เลื่อนแผนงานแรก</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* HEADER SECTION WITH TITLE AND FORM TRIGGER */}
      <div id="pm-history-header" className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-400">
              <ClipboardCheck size={20} className="text-cyan-400" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                📋 บันทึกประวัติและผลต่างเวลา PM
                <span className="text-xs font-semibold px-2 py-0.5 bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 rounded-full">
                  Std. vs Actual PM Time
                </span>
                {totalOverdueCount > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded-full flex items-center gap-1">
                    <AlertTriangle size={11} /> เลยกำหนด {totalOverdueCount} งาน
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                เปรียบเทียบระยะเวลามาตรฐานแผนบำรุงรักษาเชิงป้องกัน (TTM Plan) ตรวจเช็คงานเลยกำหนด และจัดการเลื่อนแผน
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            id="btn-export-pm-excel"
            onClick={handleExportToExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700/80 hover:border-slate-600 rounded-xl text-xs font-bold transition duration-150 cursor-pointer shadow-md"
            title="ออกรายงานเอกสารเปรียบเทียบความเป๊ะ PM ลง Excel/CSV"
          >
            <FileSpreadsheet size={14} className="text-emerald-400" />
            <span>ออกรายงาน Excel (CSV)</span>
          </button>

          <button
            id="btn-open-add-pm-modal"
            onClick={() => {
              setEditingId(null);
              setPartSearchQuery('');
              setFormDate(new Date().toISOString().slice(0, 10));
              setFormPlan(pmPlans[0]?.id || '');
              const relativePlan = pmPlans[0];
              if (relativePlan) {
                setFormMachine(relativePlan.machineId);
                setFormDuration(relativePlan.ttm || 30);
                setFormActualDuration(relativePlan.ttm || 30);
              }
              setFormTechnicians([technicians[0] || 'ช่าง 1']);
              setFormStatus('เสร็จสิ้น');
              setShowFormModal(true);
            }}
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-450 hover:to-teal-450 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-cyan-500/10 hover:shadow-cyan-450/20 hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus size={15} strokeWidth={3} />
            <span>บันทึกประวัติ PM ใหม่</span>
          </button>
        </div>
      </div>

      {/* DYNAMIC KPI SUMMARY METRICS DASHBOARD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5" id="pm-kpi-dashboard-row">
        
        {/* KPI 1 : Total Jobs Completed */}
        <div id="pm-kpi-completed" className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold font-mono">Completed PM</p>
            <h3 className="text-2xl font-black text-slate-100 mt-1 font-mono">{totalCompletedCount} <span className="text-xs text-slate-400 font-sans">งาน</span></h3>
            <p className="text-[9px] text-slate-400 mt-1 font-sans">
              คีย์ปิดงานเสร็จสิ้นแล้ว
            </p>
          </div>
          <div className="p-2.5 bg-cyan-500/15 border border-cyan-500/20 text-cyan-400 rounded-xl">
            <ClipboardCheck size={18} />
          </div>
        </div>

        {/* KPI 2 : Overdue & Reschedule Tracker (NEW) */}
        <div 
          id="pm-kpi-overdue-tracker" 
          onClick={() => setVarianceFilter(totalOverdueCount > 0 ? 'overdue' : 'all')}
          className={`p-4 rounded-2xl flex items-center justify-between shadow-xs cursor-pointer transition ${
            totalOverdueCount > 0
              ? 'bg-rose-950/30 border border-rose-500/40 hover:bg-rose-950/50'
              : 'bg-slate-900/60 border border-slate-800/80'
          }`}
        >
          <div>
            <p className="text-[10px] text-rose-400 uppercase tracking-wider font-extrabold font-mono">Overdue / Delayed</p>
            <h3 className="text-2xl font-black text-rose-400 mt-1 font-mono">
              {totalOverdueCount} <span className="text-xs text-slate-400 font-sans">งาน</span>
            </h3>
            <p className="text-[9px] text-slate-400 mt-1 font-sans">
              เลื่อนแผนสะสม {totalRescheduledCount} งาน
            </p>
          </div>
          <div className={`p-2.5 rounded-xl border ${totalOverdueCount > 0 ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
            <AlertTriangle size={18} />
          </div>
        </div>

        {/* KPI 3 : Total Variance Variance Over standard */}
        <div id="pm-kpi-variance" className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold font-mono">Time Variance</p>
            <h3 className={`text-2xl font-black mt-1 font-mono flex items-center gap-1 ${totalDiffMins > 0 ? 'text-rose-400' : totalDiffMins < 0 ? 'text-emerald-400' : 'text-slate-100'}`}>
              {totalDiffMins > 0 ? `+${totalDiffMins}` : totalDiffMins}
              <span className="text-xs font-sans font-medium text-slate-400">น.</span>
            </h3>
            <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-400">
              {totalDiffMins > 0 ? (
                <TrendingUp size={10} className="text-rose-400" />
              ) : (
                <TrendingDown size={10} className="text-emerald-400" />
              )}
              <span>ส่วนต่าง {avgVariancePercent}% </span>
            </div>
          </div>
          <div className={`p-2.5 rounded-xl border ${totalDiffMins > 0 ? 'bg-rose-500/20 border-rose-500/20 text-rose-400' : 'bg-emerald-500/20 border-emerald-500/20 text-emerald-400'}`}>
            <Clock size={18} />
          </div>
        </div>

        {/* KPI 4 : On-Time Or Faster Consistency */}
        <div id="pm-kpi-ontime-ratio" className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold font-mono">On-Time Ratio</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1 font-mono">{onTimeOrFasterRate}%</h3>
            <p className="text-[9px] text-slate-400 mt-1 font-sans">
              เป้าหมาย &gt; 80%
            </p>
          </div>
          <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 rounded-xl">
            <Sparkles size={18} />
          </div>
        </div>

        {/* KPI 5 : Speed State Dispersion */}
        <div id="pm-kpi-dispersion" className="bg-slate-900/60 border border-slate-800/80 p-3.5 font-sans rounded-2xl shadow-xs">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold font-mono mb-1.5">PM Efficiency Breakdown</p>
          <div className="space-y-1 text-slate-350 text-[9.5px]">
            <div className="flex justify-between items-center bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">
              <span>⚡️ เร็วกว่ามาตรฐาน</span>
              <b className="text-emerald-400 font-mono text-[10px] font-black">{fasterJobsCount}</b>
            </div>
            <div className="flex justify-between items-center bg-slate-800/40 px-1.5 py-0.5 rounded border border-slate-750">
              <span>⏱ ตรงมาตรฐาน</span>
              <b className="text-slate-300 font-mono text-[10px] font-black">{onTimeJobsCount}</b>
            </div>
            <div className="flex justify-between items-center bg-rose-500/5 px-1.5 py-0.5 rounded border border-rose-500/10">
              <span>⚠️ ช้าเกินมาตรฐาน</span>
              <b className="text-rose-400 font-mono text-[10px] font-black">{delayedJobsCount}</b>
            </div>
          </div>
        </div>

      </div>

      {/* CORE INTERACTIVE FILTER BOXES BAR */}
      <div className="bg-[#0b1222]/90 border border-slate-800 p-4.5 rounded-2xl space-y-4" id="pmhistory-filtering-bar">
        
        <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800/60">
          <div className="flex items-center gap-1.5 text-slate-300 font-extrabold">
            <Filter size={13} className="text-cyan-400" />
            <span>ตัวคัดกรองระบบประวัติการบำรุงรักษาเชิงป้องกัน</span>
          </div>
          <button
            onClick={() => {
              setMachineFilter('');
              setTechFilter('');
              setMonthFilter('');
              setVarianceFilter('all');
              setSortBy('date');
            }}
            className="text-[10.5px] font-bold text-slate-500 hover:text-cyan-400 transition"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* SEARCH BY MACHINE KEYWORDS */}
          <div className="space-y-1.5 flex flex-col">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ค้นหาตามรหัสเครื่องจักร</label>
            <div className="relative">
              <input
                id="pm-history-mach-input"
                type="text"
                value={machineFilter}
                onChange={(e) => setMachineFilter(e.target.value)}
                placeholder="เช่น RIM01, VAC..."
                className="w-full bg-[#050a14] border border-slate-800 rounded-xl px-3 py-1.8 text-xs text-white placeholder-slate-600 focus:outline-hidden focus:border-cyan-500/70"
              />
              <Search className="absolute right-2.5 top-2 text-slate-600" size={13} />
            </div>
          </div>

          {/* CHOOSE BY ASSIGNED TECHNICIAN */}
          <div className="space-y-1.5 flex flex-col">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">กรองด้วยชื่อช่าง</label>
            <select
              id="pm-history-tech-select"
              value={techFilter}
              onChange={(e) => setTechFilter(e.target.value)}
              className="w-full bg-[#050a14] border border-slate-800 rounded-xl px-3 py-1.8 text-xs text-white focus:outline-hidden focus:border-cyan-500/70"
            >
              <option value="">-- แสดงช่างบำรุงทั้งหมด --</option>
              {technicians.map((t, idx) => (
                <option key={idx} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* CHOOSE BY MONTH DATE */}
          <div className="space-y-1.5 flex flex-col">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">กรองด้วยเดือนที่บันทึก</label>
            <input
              id="pm-history-month-input"
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full bg-[#050a14] border border-slate-800 rounded-xl px-3 py-1.8 text-xs text-white focus:outline-hidden focus:border-cyan-500/70 select-none"
            />
          </div>

          {/* CHOOSE BY VARIANCE TYPE / OVERDUE STATE */}
          <div className="space-y-1.5 flex flex-col">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ประสิทธิภาพ / สถานะแผน PM</label>
            <select
              id="pm-history-variance-select"
              value={varianceFilter}
              onChange={(e) => setVarianceFilter(e.target.value as any)}
              className={`w-full bg-[#050a14] border rounded-xl px-3 py-1.8 text-xs focus:outline-hidden ${
                varianceFilter === 'overdue'
                  ? 'border-rose-500 text-rose-300 font-bold'
                  : 'border-slate-800 text-white focus:border-cyan-500/70'
              }`}
            >
              <option value="all">ทั้งหมด (แสดงเกณฑ์ประสิทธิภาพทุกแบบ)</option>
              <option value="overdue">⚠️ งานที่เลยกำหนดแผน (Overdue PM - ต้องเลื่อนแผน)</option>
              <option value="rescheduled">🔄 งานที่มีการเลื่อนแผน (Rescheduled PM)</option>
              <option value="faster">⚡️ เร็วกว่ามาตรฐานแผน (Time Saved)</option>
              <option value="ontime">⏱ ตรงเวลาเป๊ะ (Perfect Match)</option>
              <option value="delayed">⚠️ ช้ากว่ามาตรฐานแผน (Excess Time)</option>
              <option value="pending">⏳ ยังรอดำเนินการ / ไม่ลงประวัติจริง</option>
            </select>
          </div>

        </div>

        {/* TABS SORT BY & RECORD COUNTER STAT */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-2 border-t border-slate-850 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>เรียงลำดับงาน:</span>
            <div id="pm-history-sort-tabs" className="flex bg-[#050a14] border border-slate-800/80 rounded-lg p-0.5">
              <button
                onClick={() => setSortBy('date')}
                className={`px-3 py-1 text-[10.5px] rounded-md transition duration-150 ${sortBy === 'date' ? 'bg-[#0f172a] text-cyan-400 font-bold border border-slate-800' : 'text-slate-500 hover:text-slate-350'}`}
              >
                วันที่ซ่อม (ล่าสุดก่อน)
              </button>
              <button
                onClick={() => setSortBy('variance')}
                className={`px-3 py-1 text-[10.5px] rounded-md transition duration-150 ${sortBy === 'variance' ? 'bg-[#0f172a] text-cyan-400 font-bold border border-slate-800' : 'text-slate-500 hover:text-slate-350'}`}
              >
                ผลต่างดีเลย์มากสุด
              </button>
              <button
                onClick={() => setSortBy('duration')}
                className={`px-3 py-1 text-[10.5px] rounded-md transition duration-150 ${sortBy === 'duration' ? 'bg-[#0f172a] text-cyan-400 font-bold border border-slate-800' : 'text-slate-500 hover:text-slate-350'}`}
              >
                ระยะเวลามาตรฐานแผนสูงสุด
              </button>
            </div>
          </div>

          <div className="text-[10.5px] font-bold text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800/50">
            ค้นพบรายการประวัติบำรุงรักษา: <span className="text-cyan-450">{filteredPmJobs.length}</span> / {pmJobs.length} รายการ
          </div>
        </div>

      </div>

      {/* CORE LOGS TABULAR LISTING */}
      <div className="bg-[#0b1222] border border-slate-800 rounded-2xl overflow-hidden shadow-xl" id="pmhistory-table-container">
        {filteredPmJobs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <ClipboardCheck size={45} className="mx-auto block text-slate-700 mb-3 animate-bounce" />
            <p className="text-sm font-bold text-slate-400">ไม่พบข้อมูลประวัติ PM ตามเงื่อนไขค้นหาเปรียบเทียบที่ระบุ</p>
            <p className="text-xs text-slate-600 mt-1">ลองล้างตัวกรองหรือเพิ่มบันทึกประวัติ PM ด้วยงานใหม่ผ่านปุ่มด้านขวาบน</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table id="pm-history-logs-table" className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#080d1a] border-b border-slate-800 text-[10.5px] uppercase font-black text-slate-400 font-mono tracking-wider select-none">
                  <th className="p-4 w-32">วันที่ปฏิบัติงาน</th>
                  <th className="p-4 w-32">รหัสเละชื่อเครื่อง</th>
                  <th className="p-4">รายการแผน PM บำรุงรักษา</th>
                  <th className="p-4 w-28 text-center text-slate-300">มาตรฐานแผน</th>
                  <th className="p-4 w-28 text-center text-slate-300">เวลาปฏิบัติงานจริง</th>
                  <th className="p-4 w-36 text-center">ความคลาดเคลื่อน</th>
                  <th className="p-4 w-32 text-right">ค่าบำรุงรักษา</th>
                  <th className="p-4 w-36">ทีมช่างเทคนิค</th>
                  <th className="p-4 w-24 text-center">สถานะ</th>
                  <th className="p-4 w-24 text-center">เครื่องมือ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-xs">
                {filteredPmJobs.map((job) => {
                  const mDetail = machines.find(m => m.id === job.machineId);
                  const pDetail = pmPlans.find(p => p.id === job.pmPlanId);

                  const actTime = job.actualDuration;
                  const stdTime = job.duration;
                  const jobIsOverdue = isPMOverdue(job, todayStr);
                  const jobIsRescheduled = isPMRescheduled(job);
                  const overdueDays = getPMOverdueDays(job.date, todayStr);

                  // Evaluate variance styling
                  let varBadge = null;
                  if (job.status !== 'เสร็จสิ้น' || actTime === undefined) {
                    if (jobIsOverdue) {
                      varBadge = (
                        <div className="flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.5 rounded font-black font-mono animate-pulse">
                            <AlertTriangle size={10} /> เลยแผน +{overdueDays} วัน
                          </span>
                          <span className="text-[8.5px] text-rose-450 mt-0.5 font-bold">
                            (ต้องเลื่อนแผน)
                          </span>
                        </div>
                      );
                    } else {
                      varBadge = (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-550 border border-slate-800 px-1.5 py-0.5 rounded font-bold font-sans">
                          <Hourglass size={10} /> รอกลับมาลงบันทึก
                        </span>
                      );
                    }
                  } else if (actTime === stdTime) {
                    varBadge = (
                      <span className="inline-flex items-center gap-1 text-[10.5px] text-slate-300 bg-slate-800/40 border border-slate-700/60 px-1.5 py-0.5 rounded font-black font-mono">
                        ⏱ เป๊ะตามค่าเฉลี่ยแผน
                      </span>
                    );
                  } else {
                    const diff = actTime - stdTime;
                    const diffPercent = Math.round((diff / stdTime) * 100);
                    const isFaster = diff < 0;

                    varBadge = (
                      <div className="flex flex-col items-center">
                        <span className={`inline-flex items-center gap-0.5 text-[10.5px] font-black font-mono px-1.5 py-0.5 rounded border ${
                          isFaster 
                            ? 'bg-emerald-500/10 border-emerald-550/35 text-emerald-400' 
                            : 'bg-rose-500/10 border-rose-550/35 text-rose-450'
                        }`}>
                          {isFaster ? `⚡️ เร็วสะสม ${Math.abs(diff)} น.` : `⚠️ ดีเลย์ +${diff} น.`}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                          ({isFaster ? `-${Math.abs(diffPercent)}` : `+${diffPercent}`}% จากเกณฑ์)
                        </span>
                      </div>
                    );
                  }

                  const allTechs = job.technicians && job.technicians.length > 0 
                    ? job.technicians 
                    : [job.technician];

                  return (
                    <tr 
                      key={job.id} 
                      className={`hover:bg-slate-900/40 transition group cursor-pointer ${
                        job.id === selectedPmDetail?.id ? 'bg-cyan-500/5' : ''
                      } ${
                        jobIsOverdue ? 'bg-rose-950/20 hover:bg-rose-950/30' : ''
                      }`}
                      onClick={() => setSelectedPmDetail(job)}
                    >
                      {/* Date */}
                      <td className="p-4 font-mono font-bold">
                        <div className="flex flex-col">
                          <span className={jobIsOverdue ? 'text-rose-300 font-black' : 'text-slate-400'}>
                            {job.date}
                          </span>
                          
                          {/* Overdue Badge */}
                          {jobIsOverdue && (
                            <span className="text-[9px] font-mono text-rose-400 font-black flex items-center gap-0.5 mt-0.5">
                              <AlertTriangle size={9} /> เลย {overdueDays} วัน
                            </span>
                          )}

                          {/* Rescheduled Badge */}
                          {jobIsRescheduled && (
                            <span 
                              className="text-[8.5px] font-sans text-amber-400/90 flex items-center gap-0.5 mt-0.5"
                              title={`เลื่อนมาจากวันที่ ${job.rescheduledFromDate} (เหตุผล: ${job.rescheduledReason || '-'})`}
                            >
                              <RefreshCw size={8} className="text-amber-400" />
                              เลื่อนแผน ({job.rescheduledCount || 1} ครั้ง)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Machine ID + Group Name */}
                      <td className="p-4">
                        <div className="font-bold text-slate-200">{job.machineId}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[130px]" title={mDetail?.name}>
                          {mDetail?.name || 'บำรุงในจุดทั่วไป'}
                        </div>
                      </td>

                      {/* PM Plan Title */}
                      <td className="p-4">
                        <div className="font-bold text-slate-200 hover:text-cyan-450 transition">
                          {pDetail?.title || 'ชื่องานบำรุงรักษาในระบบ'}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="px-1 py-0.2 bg-slate-800 rounded text-[9px]">{pDetail?.frequency || 'รอบการทำงาน'}</span>
                          <span>{pDetail?.steps?.length || 0} ขั้นตอนตรวจ</span>
                          {job.rescheduledReason && (
                            <span className="text-amber-400/80 truncate max-w-[120px] text-[9px]" title={`เหตุผลเลื่อนแผน: ${job.rescheduledReason}`}>
                              📌 {job.rescheduledReason}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Standard Plan Duration */}
                      <td className="p-4 text-center font-mono font-black text-slate-300">
                        {stdTime} Mins
                      </td>

                      {/* Actual Spent Duration */}
                      <td className="p-4 text-center font-mono font-black">
                        {actTime !== undefined ? (
                          <span className={actTime > stdTime ? 'text-rose-400 font-bold' : actTime < stdTime ? 'text-emerald-400 font-black' : 'text-slate-300'}>
                            {actTime} Mins
                          </span>
                        ) : (
                          <span className="text-slate-650 italic text-[11px]">- (รอดำเนินการ)</span>
                        )}
                      </td>

                      {/* Score variance indicator */}
                      <td className="p-4 text-center">
                        {varBadge}
                        {job.overtimeReason && (
                          <div className="mt-1 flex items-center justify-center gap-1 text-[9px] text-rose-450 font-medium max-w-[150px] mx-auto bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded" title={`สาเหตุที่เกินเวลา: ${job.overtimeReason}`}>
                            <AlertTriangle size={9} className="shrink-0 text-rose-400" />
                            <span className="truncate">{job.overtimeReason}</span>
                          </div>
                        )}
                      </td>

                      {/* Maintenance Cost */}
                      <td className="p-4 text-right font-mono font-bold text-cyan-400 whitespace-nowrap">
                        {((job.usedParts?.reduce((sum, item) => sum + item.totalCost, 0) || 0) + (job.otherCost || 0)).toLocaleString()} ฿
                      </td>

                      {/* Tech team */}
                      <td className="p-4">
                        <div className="flex flex-col gap-0.5 max-w-[140px] truncate">
                          <span className="font-bold text-slate-300 truncate">{allTechs[0]}</span>
                          {allTechs.length > 1 && (
                            <span className="text-[9px] text-slate-500 font-sans flex items-center gap-1 bg-black/30 w-max px-1 rounded border border-slate-800">
                              <Users size={9} /> ช่างเพิ่ม {allTechs.length - 1} คน
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        <span className={`inline-block px-2 py-0.6 text-[10px] font-bold rounded-lg font-sans ${
                          job.status === 'เสร็จสิ้น'
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                            : jobIsOverdue
                              ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400 animate-pulse'
                              : job.status === 'กำลังทำ'
                                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300 animate-pulse'
                                : 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-300'
                        }`}>
                          {jobIsOverdue && job.status !== 'เสร็จสิ้น' ? 'เลยกำหนด' : job.status}
                        </span>
                      </td>

                      {/* Tools edit layout */}
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Reschedule Button */}
                          <button
                            id={`btn-reschedule-pm-job-${job.id}`}
                            onClick={() => setRescheduleTargetJob(job)}
                            className={`p-1.2 rounded transition duration-100 ${
                              jobIsOverdue
                                ? 'text-amber-400 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30'
                                : 'text-slate-500 hover:text-amber-400 hover:bg-slate-800'
                            }`}
                            title="เลื่อนแผนงาน PM กำหนดวันนัดหมายใหม่"
                          >
                            <RefreshCw size={13} />
                          </button>

                          <button
                            id={`btn-edit-pm-job-${job.id}`}
                            onClick={() => handleEditClick(job)}
                            className="p-1 text-slate-500 hover:text-cyan-400 hover:bg-slate-800 rounded transition duration-100"
                            title="แก้ไขบันทึกประวัติ PM และเวลาปฏิบัติงาน"
                          >
                            <Edit size={13.5} />
                          </button>

                          {deleteConfirmId === job.id ? (
                            <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 p-1.2 rounded">
                              <button
                                onClick={() => handleDeletePmHistory(job.id)}
                                className="text-[10px] bg-rose-500 text-slate-950 px-1.5 py-0.5 rounded font-black hover:bg-rose-400"
                              >
                                ยืนยันลบ
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="text-[9px] text-slate-400 hover:text-white"
                              >
                                ยกเลิก
                              </button>
                            </div>
                          ) : (
                            <button
                              id={`btn-confirm-delete-pm-job-${job.id}`}
                              onClick={() => setDeleteConfirmId(job.id)}
                              className="p-1 text-slate-500 hover:text-rose-500 hover:bg-slate-800 rounded transition duration-100"
                              title="ลบเอกสารประวัติชิ้นนี้"
                            >
                              <Trash2 size={13.5} />
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* VIEW PM DETAILS DISPLAY MODAL BOX */}
      {selectedPmDetail && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
          id="pm-detail-info-overlay"
          onClick={() => setSelectedPmDetail(null)}
        >
          <div 
            className="w-full max-w-lg bg-[#0b1222] border border-cyan-500/30 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-100 text-slate-100"
            onClick={(e) => e.stopPropagation()}
            id="pm-detail-info-dialog"
          >
            {/* Header Brand */}
            <div className="p-4 bg-[#080d1a] border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="text-cyan-400" size={16} />
                <span className="text-xs font-black tracking-wider uppercase text-slate-450">ใบตรวจงานบำรุงรักษาบอร์ดกลาง</span>
              </div>
              <button 
                onClick={() => setSelectedPmDetail(null)}
                className="text-xs text-slate-500 hover:text-white px-2 py-1 bg-slate-800 rounded-lg"
              >
                ปิดหน้าต่าง
              </button>
            </div>

            {/* Layout content */}
            <div className="p-5 space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 uppercase font-bold">ชื่อแผนงานบำรุงรักษา</p>
                <h2 className="text-sm font-black text-white">
                  {pmPlans.find(p => p.id === selectedPmDetail.pmPlanId)?.title || 'บำรุงรักษาเครื่องจักร'}
                </h2>
                <p className="text-[10px] text-slate-400 mt-1">
                  รหัสอ้างอิง: <span className="font-mono">{selectedPmDetail.id}</span> | วันที่: <span className="font-mono text-slate-100">{selectedPmDetail.date}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-850">
                <div>
                  <p className="text-[9px] text-slate-550 uppercase">ข้อมูลพิกัดเครื่องจักร</p>
                  <p className="font-bold text-slate-300 mt-0.5">{selectedPmDetail.machineId}</p>
                  <p className="text-[9.5px] text-zinc-500 mt-0.5">{machines.find(m => m.id === selectedPmDetail.machineId)?.name || 'พิกัดทั่วไป'}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-550 uppercase">กลุ่มระบบไลน์</p>
                  <p className="font-bold text-slate-300 mt-0.5">{machines.find(m => m.id === selectedPmDetail.machineId)?.lineGroup || 'ฝ่ายบำรุงโรงแปรรูป'}</p>
                </div>
              </div>

              {/* Time comparative section */}
              <div className="bg-[#050a14] border border-slate-800 p-4 rounded-xl space-y-3">
                <p className="text-[9.5px] uppercase font-extrabold text-slate-450 tracking-wider">⏱ สเกลบันทึกระยะเวลาดำเนินการ (Time Comparative Metrics)</p>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                    <p className="text-[9px] text-slate-500">เกณฑ์มาตรฐาน (TTM Plan)</p>
                    <p className="text-base font-mono font-black text-slate-300 mt-0.5">{selectedPmDetail.duration} นาที</p>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                    <p className="text-[9px] text-slate-500">ปฏิบัติงานเสร็จจริง (Actual Spent)</p>
                    <p className="text-base font-mono font-black text-slate-300 mt-0.5">
                      {selectedPmDetail.actualDuration !== undefined ? `${selectedPmDetail.actualDuration} นาที` : 'ไม่ได้บันทึกเวลา'}
                    </p>
                  </div>
                </div>

                {/* Comparative calculation details */}
                {selectedPmDetail.status === 'เสร็จสิ้น' && selectedPmDetail.actualDuration !== undefined && (
                  <div className="pt-2 border-t border-slate-850 text-center space-y-2">
                    {selectedPmDetail.actualDuration === selectedPmDetail.duration ? (
                      <p className="text-slate-300 font-bold">⏱ สปีดตรงตามเป้าหมาย (On Time Performance Perfect)</p>
                    ) : selectedPmDetail.actualDuration > selectedPmDetail.duration ? (
                      <div className="text-rose-450 font-medium space-y-0.5">
                        <p className="font-bold">⚠️ ล่าช้ากว่าแผนสะสม: <b className="font-mono text-xs">+{selectedPmDetail.actualDuration - selectedPmDetail.duration} นาที</b></p>
                        <p className="text-[10px] text-slate-500">คิดเป็นความลาดเคลื่อนเพิ่มขึ้น +{Math.round(((selectedPmDetail.actualDuration - selectedPmDetail.duration) / selectedPmDetail.duration) * 100)}% ของระยะมาตรฐาน</p>
                      </div>
                    ) : (
                      <div className="text-emerald-400 font-medium space-y-0.5">
                        <p className="font-bold">⚡️ ทำเสร็จเร็วกว่าแผน: <b className="font-mono text-xs">-{selectedPmDetail.duration - selectedPmDetail.actualDuration} นาที</b></p>
                        <p className="text-[10px] text-slate-500">เซฟเวลาลดลง -{Math.round(((selectedPmDetail.duration - selectedPmDetail.actualDuration) / selectedPmDetail.duration) * 100)}% (ประสิทธิภาพยอดเยี่ยม)</p>
                      </div>
                    )}

                    {/* Overtime Reason Display in Detail Modal */}
                    {selectedPmDetail.actualDuration > selectedPmDetail.duration && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-1 text-left">
                        <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[10.5px]">
                          <AlertTriangle size={13} className="shrink-0 text-rose-400" />
                          <span>สาเหตุที่ใช้เวลาเกินมาตรฐาน:</span>
                        </div>
                        <p className="text-xs text-rose-200 font-medium pl-4 leading-relaxed">
                          {selectedPmDetail.overtimeReason || 'ไม่ได้ระบุสาเหตุเพิ่มเติมในระบบ'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Steps overview */}
              {pmPlans.find(p => p.id === selectedPmDetail.pmPlanId)?.steps && (
                <div className="space-y-1.5">
                  <p className="text-[9px] text-slate-500 uppercase tracking-wide">ขั้นตอนมาตรฐานเชิงลึกของแผนนี้:</p>
                  <div className="max-h-24 overflow-y-auto space-y-1 pr-1 border border-slate-850 p-2 rounded-xl bg-slate-900/40">
                    {pmPlans.find(p => p.id === selectedPmDetail.pmPlanId)?.steps?.map((step, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[10px] text-slate-400 py-0.5 border-b border-slate-900 last:border-0">
                        <span>{idx + 1}. {step.title}</span>
                        <span className="font-mono text-slate-500 font-bold">{step.stdTime} นาที</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Used Spare Parts & Cost breakdown in Detail Modal */}
              <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-xl space-y-3">
                <h4 className="text-[10px] font-bold text-slate-350 flex items-center gap-1.5 border-b border-slate-800 pb-2 select-none">
                  🛠️ รายการอะไหล่ที่เปลี่ยนและค่าซ่อมบำรุง
                </h4>
                
                {selectedPmDetail.usedParts && selectedPmDetail.usedParts.length > 0 ? (
                  <div className="border border-slate-850 rounded-lg overflow-hidden bg-slate-950/80">
                    <table className="w-full text-left text-[10.5px]">
                      <thead className="bg-[#050a14] text-slate-400 text-[9px] uppercase border-b border-slate-850 select-none">
                        <tr>
                          <th className="p-2 pl-2.5">ชื่ออะไหล่ / SKU</th>
                          <th className="p-2 text-center w-16">จำนวน</th>
                          <th className="p-2 text-right w-20">หน่วยละ</th>
                          <th className="p-2 text-right w-20">รวม</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {selectedPmDetail.usedParts.map(item => {
                          const partInfo = spareParts.find(p => p.id === item.partId);
                          return (
                            <tr key={item.partId} className="hover:bg-slate-900/40 text-slate-300">
                              <td className="p-2 pl-2.5">
                                <p className="font-semibold">{partInfo?.name || item.partId}</p>
                                <p className="text-[8px] text-slate-500 font-mono">{item.partId}</p>
                              </td>
                              <td className="p-2 text-center font-mono">{item.quantity} {partInfo?.unit}</td>
                              <td className="p-2 text-right font-mono">{item.pricePerUnit.toLocaleString()} ฿</td>
                              <td className="p-2 text-right font-mono text-cyan-400 font-bold">{item.totalCost.toLocaleString()} ฿</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-[10.5px] text-slate-500 italic text-center py-2 bg-slate-950/20 rounded border border-slate-850 select-none">
                    ไม่มีรายงานการเปลี่ยนอะไหล่สำหรับประวัติ PM นี้
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4 pt-1 text-[11px]">
                  <div className="flex flex-col">
                    <span className="text-[9.5px] text-slate-500 font-bold uppercase">ค่าจ้างซ่อม/บริการอื่นๆ</span>
                    <span className="font-mono text-slate-200 mt-0.5 font-semibold">
                      {(selectedPmDetail.otherCost || 0).toLocaleString()} บาท
                    </span>
                  </div>
                  <div className="flex flex-col items-end pr-2">
                    <span className="text-[9.5px] text-slate-500 font-bold uppercase">รวมค่าบำรุงทั้งสิ้น</span>
                    <span className="text-xs font-black text-cyan-400 font-mono mt-0.5">
                      {((selectedPmDetail.usedParts?.reduce((sum, i) => sum + i.totalCost, 0) || 0) + (selectedPmDetail.otherCost || 0)).toLocaleString()} บาท
                    </span>
                  </div>
                </div>
              </div>

              {/* Tech summary */}
              <div>
                <p className="text-[9px] text-slate-500 uppercase">ทีมบุคลากรสายช่างปฏิบัติงาน</p>
                <p className="mt-1 font-bold text-slate-300">
                  {selectedPmDetail.technicians && selectedPmDetail.technicians.length > 0 
                    ? selectedPmDetail.technicians.join(', ') 
                    : selectedPmDetail.technician}
                </p>
              </div>

              {/* Reschedule Info / History in Detail Modal */}
              {(isPMRescheduled(selectedPmDetail) || isPMOverdue(selectedPmDetail, todayStr)) && (
                <div className={`p-4 rounded-xl space-y-2 border ${
                  isPMOverdue(selectedPmDetail, todayStr)
                    ? 'bg-rose-950/30 border-rose-500/40'
                    : 'bg-amber-950/20 border-amber-500/30'
                }`}>
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <RefreshCw size={12} className="text-amber-400" />
                      ข้อมูลสถานะการเลื่อนแผนงาน PM
                    </h4>
                    {isPMOverdue(selectedPmDetail, todayStr) && (
                      <span className="text-[9px] bg-rose-500 text-slate-950 font-black px-2 py-0.5 rounded font-mono">
                        เลยกำหนด +{getPMOverdueDays(selectedPmDetail.date, todayStr)} วัน
                      </span>
                    )}
                  </div>

                  {selectedPmDetail.rescheduledFromDate && (
                    <div className="text-[10.5px] text-slate-300 space-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                      <p className="flex justify-between">
                        <span className="text-slate-500">วันที่แผนเดิม:</span>
                        <span className="font-mono text-slate-400 line-through">{selectedPmDetail.rescheduledFromDate}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-500">วันที่เลื่อนมาใหม่:</span>
                        <span className="font-mono text-cyan-400 font-bold">{selectedPmDetail.date}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-500">เหตุผลที่ขอเลื่อน:</span>
                        <span className="text-amber-300 font-medium">{selectedPmDetail.rescheduledReason || 'ไม่ได้ระบุเหตุผล'}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-500">จำนวนครั้งที่เลื่อน:</span>
                        <span className="font-mono text-slate-300">{selectedPmDetail.rescheduledCount || 1} ครั้ง</span>
                      </p>
                    </div>
                  )}

                  {/* Reschedule audit history if available */}
                  {selectedPmDetail.rescheduleHistory && selectedPmDetail.rescheduleHistory.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <p className="text-[9px] text-slate-400 font-bold uppercase">ประวัติการเลื่อนทั้งหมด:</p>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {selectedPmDetail.rescheduleHistory.map((hist, idx) => (
                          <div key={idx} className="text-[9.5px] bg-slate-900/80 p-1.5 rounded border border-slate-800 text-slate-300">
                            <div className="flex justify-between text-slate-500 text-[8.5px]">
                              <span>ครั้งที่ {idx + 1} ({new Date(hist.rescheduledAt).toLocaleDateString('th-TH')})</span>
                              <span>โดย: {hist.rescheduledBy}</span>
                            </div>
                            <div className="mt-0.5">
                              <span className="line-through text-slate-500">{hist.fromDate}</span> ➔ <span className="text-cyan-400 font-bold">{hist.toDate}</span>: {hist.reason}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Status footer button panel */}
              <div className="pt-3 border-t border-slate-850 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setRescheduleTargetJob(selectedPmDetail);
                    setSelectedPmDetail(null);
                  }}
                  className="px-3.5 py-1.8 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw size={12} />
                  <span>เลื่อนแผนงานนี้</span>
                </button>
                <button
                  onClick={() => {
                    handleEditClick(selectedPmDetail);
                    setSelectedPmDetail(null);
                  }}
                  className="px-3.5 py-1.8 bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 rounded-lg text-xs transition cursor-pointer"
                >
                  แก้ไขใบงาน
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL FOR CREATING AND EDITING PM HISTORIES */}
      {showFormModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4"
          id="pm-log-modal-overlay"
        >
          <div 
            className="w-full max-w-lg bg-[#0e1626] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-155 text-slate-100"
            id="pm-log-modal-container"
          >
            {/* Modal header */}
            <div className="p-4 bg-[#0a0f1d] border-b border-slate-850 flex justify-between items-center">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                {editingId ? "🔧 แก้ไขบันทึก PM และทวนสอบความเป๊ะเวลา" : "➕ สร้างใบกรอกประวัติ PM และเวลาจริง"}
              </h3>
              <button
                onClick={() => {
                  setShowFormModal(false);
                  setEditingId(null);
                  setFormPlan('');
                  setFormTechnicians([]);
                }}
                className="text-slate-500 hover:text-white font-black text-xs px-2.5 py-1.2 bg-slate-900 rounded-lg"
              >
                ยกเลิก
              </button>
            </div>

            {/* Form sheet content */}
            <form onSubmit={handleSavePmHistory} className="p-5 space-y-4 text-xs font-sans max-h-[75vh] overflow-y-auto">
              
              {/* Choose machine */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-black tracking-wider">เลือกเครื่องจักรที่ต้องการ PM *</label>
                  <select
                    value={formMachine}
                    onChange={(e) => handleMachineChangeForForm(e.target.value)}
                    className="w-full bg-[#050a14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-cyan-500/70"
                    required
                  >
                    <option value="">-- เลือกเครื่องจักร --</option>
                    {machines.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.id} - {m.name} ({m.lineGroup})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-black tracking-wider">วันที่ปฏิบัติงาน PM *</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-[#050a14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-cyan-500/70 select-none"
                    required
                  />
                </div>
              </div>

              {/* Choose plan associated with machine */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-black tracking-wider">เชื่อมโยงรายการแผนบำรุงรักษา (PM Plan) *</label>
                <select
                  value={formPlan}
                  onChange={(e) => handlePlanChangeForForm(e.target.value)}
                  className="w-full bg-[#050a14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-cyan-500/70"
                  required
                >
                  <option value="">-- กรุณาเลือกรายการแผน PM ในระบบ --</option>
                  {pmPlans.filter(p => p.machineId === formMachine || !formMachine).map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.machineId}] {p.title} ({p.frequency} - Standard: {p.ttm} นาที)
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration inputs comparison */}
              <div className="grid grid-cols-2 gap-3 bg-[#050a14] border border-slate-800 p-3.5 rounded-xl">
                <div className="space-y-1">
                  <label className="text-[10px] text-cyan-450 uppercase font-bold tracking-wider">
                    ระยะเวลามาตรฐานแผน (นาที)
                  </label>
                  <input
                    type="number"
                    value={formDuration}
                    onChange={(e) => setFormDuration(Number(e.target.value))}
                    min={1}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 font-mono font-bold focus:outline-hidden"
                    required
                  />
                  <p className="text-[9px] text-slate-500">ดึงจาก Standard TTM อัตโนมัติ</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">
                    เวลาปฏิบัติงานจริงหน้าพิกัด (นาที)
                  </label>
                  <input
                    type="number"
                    value={formActualDuration}
                    onChange={(e) => setFormActualDuration(Number(e.target.value))}
                    min={formStatus === 'เสร็จสิ้น' ? 1 : 0}
                    disabled={formStatus !== 'เสร็จสิ้น'}
                    className="w-full bg-slate-900 border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 font-mono font-bold focus:outline-hidden"
                    required={formStatus === 'เสร็จสิ้น'}
                  />
                  <p className="text-[9px] text-slate-500">กรอกเวลาที่ช่างคีย์ทำจริงเสร็จสิ้น</p>
                </div>
              </div>

              {/* Variance Analysis Prompt info */}
              {formStatus === 'เสร็จสิ้น' && formActualDuration > 0 && formDuration > 0 && (
                <div className="p-2.5 border rounded-lg text-[10px] leading-relaxed">
                  {formActualDuration === formDuration ? (
                    <span className="text-slate-400">⏱ เวลาทำจริงตรงเกณฑ์มาตราฐาน 100% ประสิทธิภาพระดับเป๊ะ</span>
                  ) : formActualDuration > formDuration ? (
                    <span className="text-rose-450 font-bold flex items-center gap-1">
                      ⚠️ ระวัง: ทำช้ากว่ามาตรฐานที่ประเมินไว้ +{formActualDuration - formDuration} นาที (+{Math.round(((formActualDuration - formDuration)/formDuration)*100)}%)
                    </span>
                  ) : (
                    <span className="text-emerald-450 font-black flex items-center gap-1">
                      ⚡️ เยี่ยมยอด: บำรุงเสร็จเร็วสปีดเซฟได้ -{formDuration - formActualDuration} นาที (-{Math.round(((formDuration - formActualDuration)/formDuration)*100)}%)
                    </span>
                  )}
                </div>
              )}

              {/* Overtime Reason Input Section (Appears when Actual Duration exceeds Standard Duration) */}
              {formStatus === 'เสร็จสิ้น' && formActualDuration > formDuration && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border-2 border-rose-500/30 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-extrabold text-rose-300 flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-rose-400 shrink-0" />
                      ระบุสาเหตุที่ใช้เวลาเกินมาตรฐาน (Overtime / Delay Reason)*
                    </label>
                    <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-mono font-bold">
                      +{formActualDuration - formDuration} นาที
                    </span>
                  </div>

                  {/* Preset Buttons */}
                  <div className="space-y-1">
                    <p className="text-[9.5px] text-slate-400 font-medium">กดเลือกสาเหตุมาตรฐานเพื่อกรอกอัตโนมัติ:</p>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                      {PM_OVERTIME_REASON_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFormOvertimeReason(preset)}
                          className={`text-[10px] px-2.5 py-1 rounded-lg border text-left transition cursor-pointer ${
                            formOvertimeReason === preset
                              ? 'bg-rose-500 text-white font-bold border-rose-400 shadow-sm'
                              : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Textarea */}
                  <div className="space-y-1">
                    <textarea
                      value={formOvertimeReason}
                      onChange={(e) => setFormOvertimeReason(e.target.value)}
                      placeholder="โปรดระบุสาเหตุและรายละเอียดเพิ่มเติมว่าทำไมใช้เวลาเกินมาตรฐาน..."
                      rows={2}
                      className="w-full bg-[#050a14] border border-rose-500/40 focus:border-rose-400 rounded-lg p-2.5 text-xs text-rose-100 placeholder:text-slate-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Status input */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-black tracking-wider">สถานะของรอบบำรุงรักษา *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="status"
                      checked={formStatus === 'เสร็จสิ้น'}
                      onChange={() => setFormStatus('เสร็จสิ้น')}
                      className="accent-cyan-500"
                    />
                    <span>เสร็จสิ้น (บันทึกเวลาจริงเรียบร้อย)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="status"
                      checked={formStatus === 'กำลังทำ'}
                      onChange={() => setFormStatus('กำลังทำ')}
                      className="accent-cyan-500"
                    />
                    <span>กำลังทำ / รอดำเนินงานหน้าเครื่อง</span>
                  </label>
                </div>
              </div>

              {/* Multi companion technicians selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 uppercase font-black tracking-wider">
                  ทีมช่างที่เข้าร่วมงาน (สามารถเลือกคู่หูร่วมทำ PM ได้หลายคน)
                </label>
                <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  {technicians.map((t, idx) => {
                    const isSelected = formTechnicians.includes(t);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleTechnician(t)}
                        className={`px-2 py-1.5 rounded-lg border text-left transition-all duration-150 flex items-center justify-between text-[10.5px] ${
                          isSelected 
                            ? 'bg-cyan-500/10 border-cyan-550 text-cyan-300 font-bold' 
                            : 'bg-[#050a14] border-slate-800 text-slate-450 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <span className="truncate">{t}</span>
                        {isSelected && <CheckCircle size={10} className="text-cyan-400 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SPARE PARTS AND PM COSTS SECTION */}
              <div className="bg-[#050a14] p-3.5 border border-slate-800 rounded-xl space-y-3">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wide flex items-center gap-1 select-none">
                  🛠️ อะไหล่ที่ใช้และค่าใช้จ่าย (Spare Parts & PM Costs)
                </span>
                
                {/* Add spare part widget */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                  <div className="sm:col-span-7 space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase flex justify-between items-center">
                      <span>เลือกรายการอะไหล่ในคลัง</span>
                      {partSearchQuery && (
                        <button 
                          type="button" 
                          onClick={() => setPartSearchQuery('')} 
                          className="text-[9px] text-cyan-400 hover:underline cursor-pointer"
                        >
                          ล้างค้นหา ✕
                        </button>
                      )}
                    </label>
                    <div className="space-y-1">
                      <input
                        type="text"
                        placeholder="🔍 พิมพ์ค้นหาอะไหล่ (ชื่อ หรือ รหัส)..."
                        value={partSearchQuery}
                        onChange={(e) => setPartSearchQuery(e.target.value)}
                        className="w-full bg-[#050a14] border border-slate-850 rounded px-2 py-1 text-[10.5px] text-slate-200 focus:outline-none focus:border-cyan-500 placeholder-slate-500 font-sans"
                      />
                      <select
                        value={selectedPartId}
                        onChange={(e) => {
                          const pid = e.target.value;
                          setSelectedPartId(pid);
                          const found = spareParts.find(p => p.id === pid);
                          if (found) {
                            setSelectedPartPrice(found.pricePerUnit);
                          } else {
                            setSelectedPartPrice(0);
                          }
                        }}
                        className="w-full bg-[#050a14] border border-slate-850 rounded p-1.5 text-[10.5px] text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
                      >
                        <option value="">
                          {partSearchQuery ? `-- อะไหล่ที่ตรงค้นหา (${spareParts.filter(sp => sp.name.toLowerCase().includes(partSearchQuery.toLowerCase()) || sp.id.toLowerCase().includes(partSearchQuery.toLowerCase())).length} รายการ) --` : "-- เลือกอะไหล่ --"}
                        </option>
                        {spareParts
                          .filter(sp => {
                            if (!partSearchQuery) return true;
                            const q = partSearchQuery.toLowerCase();
                            return sp.name.toLowerCase().includes(q) || sp.id.toLowerCase().includes(q);
                          })
                          .map(sp => {
                            // Highlight if part matches this machine
                            const isMatch = sp.machineIds?.includes(formMachine);
                            return (
                              <option key={sp.id} value={sp.id}>
                                {isMatch ? "⭐ " : ""}{sp.name} [{sp.id}] - {sp.pricePerUnit.toLocaleString()} บาท/หน่วย (คงเหลือ: {sp.quantity} {sp.unit})
                              </option>
                            );
                          })}
                      </select>
                    </div>
                  </div>

                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[9px] text-slate-500 text-center block uppercase">จำนวน</label>
                    <input
                      type="number"
                      min="1"
                      value={selectedPartQty}
                      onChange={(e) => setSelectedPartQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-[#050a14] border border-slate-850 rounded p-1.5 text-[10.5px] text-slate-200 focus:outline-none focus:border-cyan-500 text-center font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1 flex flex-col justify-end">
                    <button
                      type="button"
                      onClick={handleAddPartToForm}
                      className="w-full bg-cyan-550/15 hover:bg-cyan-500 border border-cyan-550/30 hover:text-slate-950 text-cyan-400 font-bold text-[10px] py-1.5 rounded transition flex items-center justify-center"
                    >
                      เพิ่ม
                    </button>
                  </div>
                </div>

                {/* Used spare parts list */}
                {formUsedParts.length > 0 ? (
                  <div className="border border-slate-850 rounded-lg overflow-hidden bg-slate-950">
                    <table className="w-full text-left text-[9.5px] text-slate-350">
                      <thead className="bg-[#050a14] text-slate-400 text-[8.5px] uppercase border-b border-slate-850 select-none">
                        <tr>
                          <th className="p-2 pl-3">รายการอะไหล่</th>
                          <th className="p-2 text-center w-16">จำนวน</th>
                          <th className="p-2 text-right w-20">หน่วยละ</th>
                          <th className="p-2 text-right w-20">รวม</th>
                          <th className="p-2 text-center w-10">ลบ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {formUsedParts.map(item => {
                          const originalPart = spareParts.find(p => p.id === item.partId);
                          return (
                            <tr key={item.partId} className="hover:bg-slate-900/50">
                              <td className="p-2 pl-3">
                                <p className="font-semibold text-slate-200">{originalPart?.name || item.partId}</p>
                                <p className="text-[8px] text-slate-500 font-mono">{item.partId}</p>
                              </td>
                              <td className="p-2 text-center font-mono text-slate-300">{item.quantity} {originalPart?.unit}</td>
                              <td className="p-2 text-right font-mono text-slate-350">{item.pricePerUnit.toLocaleString()} ฿</td>
                              <td className="p-2 text-right font-mono text-cyan-400 font-semibold">{item.totalCost.toLocaleString()} ฿</td>
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemovePartFromForm(item.partId)}
                                  className="text-slate-500 hover:text-rose-400 p-0.5 rounded"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-[9.5px] text-slate-500 italic text-center py-2 bg-slate-950/30 rounded border border-slate-850 select-none">
                    ยังไม่มีการใช้อะไหล่ในใบงานนี้
                  </p>
                )}

                {/* Other costs like contractor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-850">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 font-semibold uppercase">ค่าจ้างซ่อมภายนอก/ค่าบริการอื่นๆ (บาท)</label>
                    <input
                      type="number"
                      min="0"
                      value={formOtherCost || ""}
                      onChange={(e) => setFormOtherCost(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="เช่น 0"
                      className="w-full bg-[#050a14] border border-slate-850 rounded px-2.5 py-1.5 text-[10.5px] text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <div className="flex flex-col justify-center items-end pr-2">
                    <span className="text-[8.5px] text-slate-455 uppercase font-bold tracking-wider">รวมมูลค่างาน PM ทั้งสิ้น</span>
                    <span className="text-xs font-black font-mono text-cyan-400 mt-0.5">
                      {(formUsedParts.reduce((sum, item) => sum + item.totalCost, 0) + Number(formOtherCost || 0)).toLocaleString()} บาท
                    </span>
                  </div>
                </div>
              </div>

              {/* Form submit footer buttons */}
              <div className="pt-3 border-t border-slate-850 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowFormModal(false);
                    setEditingId(null);
                    setFormPlan('');
                    setFormTechnicians([]);
                  }}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-400 font-bold hover:text-white rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5.5 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-450 hover:to-teal-450 text-slate-950 font-black rounded-xl hover:shadow-cyan-500/15 transition-all"
                >
                  {editingId ? "บันทึกการแก้ไข" : "บันทึกข้อมูลเข้าสู่ฐานข้อมูล"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* RESCHEDULE PM MODAL */}
      {rescheduleTargetJob && (
        <PMRescheduleModal 
          job={rescheduleTargetJob} 
          onClose={() => setRescheduleTargetJob(null)} 
        />
      )}

    </div>
  );
};
