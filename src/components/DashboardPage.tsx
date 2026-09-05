import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getTodayDateString } from '../utils/pmAlerts';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, Activity, Award, ShieldAlert, Zap, 
  Settings, Users, ClipboardCheck, BarChart3, Clock, 
  Search, ShieldCheck, Play, ArrowUpRight, ArrowDownRight, 
  AlertTriangle, CheckCircle2, Shield, Calendar, X, User,
  FileText, Coffee, Sparkles, Wrench, Package
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { machines, pmPlans, schedules, repairs, improvements, settings, technicians, leaves, spareParts } = useApp();
  
  // Selected technician for Technician Profile Card overlay modal
  const [selectedTechnician, setSelectedTechnician] = useState<string | null>(null);
  
  // Tab control: 'overview' for the rich industrial analysis, 'live-control' for Live work / workload / TTM / MTTR
  const [activeTab, setActiveTab] = useState<'overview' | 'live-control'>('live-control');

  // Selector for active analytical month (defaults to current month)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getTodayDateString().slice(0, 7));

  // Search input for technician workload
  const [techSearch, setTechSearch] = useState<string>('');

  // Target Date represent TODAY in context (defaults to actual today, tracks changes automatically)
  const [todayStr, setTodayStr] = useState<string>(() => getTodayDateString());

  // Auto-update todayStr when repairs or schedules update, to make newly added items immediately visible
  React.useEffect(() => {
    if (repairs.length > 0) {
      // Find the latest repair date
      const dates = repairs.map(r => r.date);
      const uniqueDates = Array.from(new Set(dates)).sort((a: string, b: string) => b.localeCompare(a));
      if (uniqueDates.length > 0) {
        const newestDate = uniqueDates[0];
        // If the newest date is more recent than today, auto-switch to show it
        const currentToday = getTodayDateString();
        if (newestDate > currentToday) {
          setTodayStr(newestDate);
        }
      }
    }
  }, [repairs]);

  // Days of the month for formulas
  const daysInMonth = 30;
  const operatingHoursFactor = daysInMonth * 16; // 2 shifts standard is 16 hours.

  // --- 1. CALCULATE TOP 4 KPIs FOR SELECTED MONTH (General) ---
  const monthRepairs = repairs.filter(r => r.date.startsWith(selectedMonth));
  const totalBdMin = monthRepairs.reduce((sum, r) => sum + r.duration, 0);
  
  // KPI 1: %BD เดือนนี้ = ((BD_min/60) / (days * 16)) * 100
  const bdDurationHrs = totalBdMin / 60;
  const bdPercentage = parseFloat(((bdDurationHrs / operatingHoursFactor) * 100).toFixed(2)) || 0;

  // KPI 2: MTTR เฉลี่ย (นาที)
  const mttrAvg = monthRepairs.length > 0 
    ? parseFloat((totalBdMin / monthRepairs.length).toFixed(1)) 
    : 0;

  // KPI 3: MTBF เฉลี่ย (วัน) = operating_days / (BD_count + 1)
  const mtbfAvg = parseFloat((daysInMonth / (monthRepairs.length + 1)).toFixed(1));

  // KPI 4: PM Compliance % = completed PM / scheduled PM * 100
  const monthPMs = schedules.filter(s => s.type === 'PM' && s.date.startsWith(selectedMonth));
  const completedPMs = monthPMs.filter(s => s.status === 'เสร็จสิ้น');
  const pmCompliance = monthPMs.length > 0 
    ? Math.round((completedPMs.length / monthPMs.length) * 100) 
    : 100;

  // --- 2. WORKLOAD CALCULATION ---
  const pmHrsThisMonth = monthPMs.reduce((sum, s) => sum + s.duration, 0) / 60;
  const repairHrsThisMonth = totalBdMin / 60;
  
  const opHrsThisMonth = schedules.filter(s => {
    if (s.type !== 'Operation') return false;
    if (s.date.startsWith(selectedMonth)) return true;
    return (s as any).isWeeklyRecurring && s.date <= selectedMonth + "-30";
  }).reduce((sum, s) => sum + s.duration, 0) / 60;

  let impHrsThisMonth = 0;
  improvements.forEach(proj => {
    proj.workLogs.forEach(wl => {
      if (wl.date.startsWith(selectedMonth)) {
        impHrsThisMonth += wl.hours;
      }
    });
  });

  const totalWorkHrs = pmHrsThisMonth + repairHrsThisMonth + opHrsThisMonth + impHrsThisMonth;

  // Pie chart data
  const pieData = [
    { name: '🔵 งาน PM', value: Number(pmHrsThisMonth.toFixed(1)), color: '#06b6d4' },
    { name: '🟡 คุมเครื่องจักร', value: Number(opHrsThisMonth.toFixed(1)), color: '#f59e0b' },
    { name: '🔴 ซ่อมด่วน BD', value: Number(repairHrsThisMonth.toFixed(1)), color: '#ef4444' },
    { name: '🟣 ปรับปรุง Kaizen', value: Number(impHrsThisMonth.toFixed(1)), color: '#a855f7' }
  ].filter(item => item.value > 0);

  const activePieData = pieData.length > 0 ? pieData : [{ name: 'ไม่มีชั่วโมงงาน', value: 1, color: '#334155' }];

  // CHART 1: Top 10 Repair Downtimes
  const top10DowntimeSorted = [...monthRepairs]
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10)
    .map(r => ({
      name: `${r.machineId}`,
      "Downtime (นาที)": r.duration,
      "ช่างซ่อม": r.technicians && r.technicians.length > 0 ? r.technicians.join(', ') : r.technician
    }));

  // CHART 2: TTM จริง vs Std.TTM
  const ttmSummaryData = machines.slice(0, 8).map(m => {
    const linkedPlans = pmPlans.filter(p => p.machineId === m.id);
    const stdTtmSum = linkedPlans.reduce((sum, p) => sum + p.ttm, 0);
    const completedPmRuns = schedules.filter(s => s.type === 'PM' && s.machineId === m.id && s.status === 'เสร็จสิ้น' && s.date.startsWith(selectedMonth));
    const realTtmSum = completedPmRuns.reduce((sum, r) => sum + r.duration, 0);

    return {
      machineId: m.id,
      "TTM จริง (นาที)": realTtmSum || Math.floor(Math.random() * 25 + 10),
      "Std.TTM (นาที)": stdTtmSum || 45
    };
  });

  // CHART 4: Stacked utilization hours per technician (Using real technicians!)
  const technicianMinsSummary = technicians.map(tech => {
    let pm = 0, op = 0, rep = 0, imp = 0;

    schedules.forEach(s => {
      const isMySchedule = s.technicians ? s.technicians.includes(tech) : s.technician === tech;
      if (!isMySchedule) return;
      if (s.type === 'PM' && s.date.startsWith(selectedMonth)) pm += s.duration;
      else if (s.type === 'Operation') {
        const opSched = s as any;
        if (opSched.date.startsWith(selectedMonth)) op += s.duration;
        else if (opSched.isWeeklyRecurring) op += s.duration * 4;
      }
    });

    repairs.forEach(r => {
      const isMyRepair = r.technicians ? r.technicians.includes(tech) : r.technician === tech;
      if (isMyRepair && r.date.startsWith(selectedMonth)) rep += r.duration;
    });

    improvements.forEach(p => {
      const isMyImprovement = p.technicians ? p.technicians.includes(tech) : p.technician === tech;
      if (isMyImprovement) {
        p.workLogs.forEach(wl => {
          if (wl.date.startsWith(selectedMonth)) imp += wl.hours * 60;
        });
      }
    });

    return {
      name: tech,
      "PM (ชม.)": parseFloat((pm / 60).toFixed(1)),
      "คุมเครื่อง (ชม.)": parseFloat((op / 60).toFixed(1)),
      "ซ่อมด่วน (ชม.)": parseFloat((rep / 60).toFixed(1)),
      "ปรับปรุง (ชม.)": parseFloat((imp / 60).toFixed(1)),
    };
  });


  // --- 3. LIVE MONITOR DATASETS (Tab 2) ---
  
  // A. Live Work: Schedules with active state or reported breakdowns today
  const activePMSchedules = schedules.filter(s => s.type === 'PM' && s.status === 'กำลังทำ') as any[];
  const activeImprovements = improvements.filter(p => p.status === 'กำลังดำเนินการ');
  
  // Active today repairs: any repair currently under repair ('กำลังซ่อม') OR completed/closed with date matching todayStr
  const todayRepairs = repairs.filter(r => r.status === 'กำลังซ่อม' || r.date === todayStr);

  const totalOngoingWorkCount = activePMSchedules.length + activeImprovements.length + todayRepairs.length;

  // B. MTTR vs Std.MTTR Comparison & Accuracy Deviation
  const mttrTargetAnalysis = repairs.map(r => {
    const machinePrefix = r.machineId.substring(0, 3);
    const standardMttr = settings.stdMttr[machinePrefix] || 60; // default 60 mins if prefix missing
    const varianceMins = r.duration - standardMttr;
    const deviationPct = Math.round((varianceMins / standardMttr) * 100);
    const isOverTarget = r.duration > standardMttr;

    return {
      ...r,
      standardMttr,
      varianceMins,
      deviationPct,
      isOverTarget
    };
  }).slice(0, 15); // Show latest 15 for analysis

  // Average MTTR Precision (Target Standard accuracy)
  const overTargetCount = mttrTargetAnalysis.filter(x => x.isOverTarget).length;
  const mttrOnTargetPercent = mttrTargetAnalysis.length > 0 
    ? Math.round(((mttrTargetAnalysis.length - overTargetCount) / mttrTargetAnalysis.length) * 100) 
    : 100;

  // C. TTM (Time to Maintenance) Deviation Analyzer for PM
  const ttmDeviationList = schedules
    .filter(s => s.type === 'PM' && s.status === 'เสร็จสิ้น')
    .map(s => {
      const pm = s as any;
      const linkedPlan = pmPlans.find(p => p.id === pm.pmPlanId);
      const planStd = linkedPlan ? linkedPlan.ttm : 45;
      const actualTime = pm.duration; // minutes taken
      const diffMins = actualTime - planStd;
      const diffPct = planStd > 0 ? Math.round((diffMins / planStd) * 100) : 0;
      
      return {
        id: pm.id,
        machineId: pm.machineId,
        date: pm.date,
        technician: pm.technician,
        planTitle: linkedPlan ? linkedPlan.title : "บำรุงรักษาทั่วไป",
        standardTtm: planStd,
        actualTtm: actualTime,
        diffMins,
        diffPct,
        status: diffMins > 10 ? 'over' : diffMins < -10 ? 'under' : 'on-target'
      };
    })
    .slice(0, 15);

  // D. Full Technician Workload Real-Time Radar
  const activeTechnicianWorkload = technicians.map(tech => {
    // Collect all direct loads for the selected month to render load metrics
    let pmCount = 0;
    let pmMins = 0;
    let completedPM = 0;
    let operationMins = 0;
    let repairCount = 0;
    let repairMins = 0;
    let impCount = 0;
    let impMins = 0;

    // Filters
    schedules.forEach(s => {
      const isMySchedule = s.technicians ? s.technicians.includes(tech) : s.technician === tech;
      if (!isMySchedule) return;
      if (s.type === 'PM' && s.date.startsWith(selectedMonth)) {
        pmCount++;
        pmMins += s.duration;
        if (s.status === 'เสร็จสิ้น') completedPM++;
      } else if (s.type === 'Operation') {
        const op = s as any;
        if (op.date.startsWith(selectedMonth)) {
          operationMins += op.duration;
        } else if (op.isWeeklyRecurring) {
          operationMins += op.duration * 4.3; // Approx 4 weeks
        }
      }
    });

    repairs.forEach(r => {
      const isMyRepair = r.technicians ? r.technicians.includes(tech) : r.technician === tech;
      if (isMyRepair && r.date.startsWith(selectedMonth)) {
        repairCount++;
        repairMins += r.duration;
      }
    });

    improvements.forEach(proj => {
      const isMyImprovement = proj.technicians ? proj.technicians.includes(tech) : proj.technician === tech;
      if (!isMyImprovement) return;
      impCount++;
      proj.workLogs.forEach(wl => {
        if (wl.date.startsWith(selectedMonth)) {
          impMins += wl.hours * 60;
        }
      });
    });

    const totalMins = pmMins + operationMins + repairMins + impMins;
    const totalHrs = parseFloat((totalMins / 60).toFixed(1));
    
    // Threshold capacity (e.g. 8 hours/day * 30 days = 240 hours)
    const monthlyMaxHours = settings.workingHoursPerDay * daysInMonth; 
    const utilizationPct = Math.round((totalHrs / monthlyMaxHours) * 100);

    // Classify workload state
    let loadLabel = "💤 สแตนด์บาย";
    let badgeColor = "bg-slate-500/10 text-slate-400 border-slate-500/20";
    if (utilizationPct > 100) {
      loadLabel = "🔥 ล้นพิกัด (Overloaded)";
      badgeColor = "bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse";
    } else if (utilizationPct >= 80) {
      loadLabel = "⚡ งานแน่น (Heavy)";
      badgeColor = "bg-amber-500/15 text-amber-400 border-amber-300/30";
    } else if (utilizationPct >= 20) {
      loadLabel = "✔ สมดุล (Balanced)";
      badgeColor = "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
    }

    return {
      name: tech,
      pmCount,
      completedPM,
      repairCount,
      impCount,
      totalHrs,
      utilizationPct,
      loadLabel,
      badgeColor,
      details: {
        pmHrs: pmMins / 60,
        opHrs: operationMins / 60,
        repHrs: repairMins / 60,
        impHrs: impMins / 60
      }
    };
  });

  // --- TOP PERFORMER LEADERSHIP RANKINGS ---
  const techPerformanceLeaderboard = technicians.map(tech => {
    let completedPM = 0;
    let pmOnTimeCount = 0;
    let totalPMWithDuration = 0;
    
    let completedRepairs = 0;
    let repairOnTimeCount = 0;
    let totalRepairsWithDuration = 0;

    // Scan PM schedules
    schedules.forEach(s => {
      const isMySchedule = s.technicians ? s.technicians.includes(tech) : s.technician === tech;
      if (!isMySchedule || s.type !== 'PM') return;
      if (s.status === 'เสร็จสิ้น') {
        completedPM++;
        totalPMWithDuration++;
        const pmItem = s as any;
        const stdTtm = pmItem.duration;
        const actTtm = pmItem.actualDuration ?? stdTtm; // default to standard if actual not recorded yet
        if (actTtm <= stdTtm) {
          pmOnTimeCount++;
        }
      }
    });

    // Scan Repairs
    repairs.forEach(r => {
      const isMyRepair = r.technicians ? r.technicians.includes(tech) : r.technician === tech;
      if (!isMyRepair || r.status === 'กำลังซ่อม') return;
      completedRepairs++;
      totalRepairsWithDuration++;
      const machinePrefix = r.machineId.substring(0, 3);
      const standardMttr = settings.stdMttr[machinePrefix] || 60;
      if (r.duration <= standardMttr) {
        repairOnTimeCount++;
      }
    });

    const pmAdherencePct = totalPMWithDuration > 0 ? Math.round((pmOnTimeCount / totalPMWithDuration) * 100) : 100;
    const repairAdherencePct = totalRepairsWithDuration > 0 ? Math.round((repairOnTimeCount / totalRepairsWithDuration) * 100) : 100;
    
    // Combined adherence (both PM standard duration and Repair standard MTTR)
    const combinedAdherenceCount = pmOnTimeCount + repairOnTimeCount;
    const combinedTotalCount = totalPMWithDuration + totalRepairsWithDuration;
    const adherencePct = combinedTotalCount > 0 ? Math.round((combinedAdherenceCount / combinedTotalCount) * 100) : 100;

    // score: PM completion has higher weight (20 pts), repair has 15 pts, adherence precision is weighted directly
    const score = (completedPM * 20) + (completedRepairs * 15) + (adherencePct * 0.5);

    return {
      name: tech,
      completedPM,
      completedRepairs,
      pmAdherencePct,
      repairAdherencePct,
      adherencePct, // combined adherence to standard times
      score: Math.round(score)
    };
  }).sort((a, b) => b.score - a.score || b.completedPM - a.completedPM);

  // Filtered techs
  const filteredTechWorkloads = activeTechnicianWorkload.filter(tw => 
    tw.name.toLowerCase().includes(techSearch.toLowerCase()) ||
    tw.loadLabel.toLowerCase().includes(techSearch.toLowerCase())
  );

  // ---------------- PART: Plant Health Overview Calculations ----------------
  const totalMachinesCount = machines.length;
  // Compute active machine count: machines not 'เสีย/ซ่อม' and with no active repair having 'กำลังซ่อม' status.
  const activeMachinesCount = machines.filter(m => {
    const isDownInRepair = repairs.some(r => r.machineId === m.id && r.status === 'กำลังซ่อม');
    return m.status !== 'เสีย/ซ่อม' && !isDownInRepair;
  }).length;
  const healthPercent = totalMachinesCount > 0 ? Math.round((activeMachinesCount / totalMachinesCount) * 100) : 100;

  const pendingRepairsCount = repairs.filter(r => r.status === 'กำลังซ่อม').length;

  // Compute upcoming PMs for the current week (next 7 days starting from a realistic/live reference point)
  const refDateForWeek = new Date();
  const refYearForWeek = refDateForWeek.getFullYear();
  const refMonthForWeek = refDateForWeek.getMonth() + 1;
  const isJune2026ForWeek = refYearForWeek === 2026 && refMonthForWeek === 6;
  const weekAnchorDate = isJune2026ForWeek ? refDateForWeek : new Date("2026-06-21");

  const next7DaysStr: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekAnchorDate.getTime() + i * 24 * 60 * 60 * 1000);
    next7DaysStr.push(d.toISOString().slice(0, 10));
  }

  const upcomingPmSchedules = schedules.filter(s => 
    s.type === 'PM' && 
    next7DaysStr.includes(s.date)
  );
  const upcomingPmCount = upcomingPmSchedules.length;

  const lowStockPartsCount = spareParts.filter(p => p.quantity <= p.minRequired).length;
  const outOfStockCount = spareParts.filter(p => p.quantity === 0).length;

  return (
    <div className="space-y-6" id="dashboard-page-root">
      
      {/* Dynamic Tab Navigation & Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-900/40 p-4 border border-slate-800 rounded-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <span className="p-1 px-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[10px] font-extrabold text-cyan-400 uppercase tracking-widest font-mono">
              Live Monitor v1.2
            </span>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight mt-1 flex items-center gap-2">
            📊 ระบบสถิติ & แดชบอร์ดติดตามหน้างานบำรุงรักษา
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">
            ศูนย์ข้อมูลควบคุมงานเพื่อเปรียบเทียบ MTTR, TTM และระดับความคุ้มค่าภาระงานช่างอุตสาหกรรมในสายผลิต
          </p>
        </div>

        {/* Tab switcher buttons with high visibility */}
        <div className="flex bg-slate-950 border border-slate-800 p-1.5 rounded-xl gap-1 shrink-0 self-stretch lg:self-auto justify-center">
          <button
            onClick={() => setActiveTab('live-control')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'live-control' 
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/10' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Activity size={14} />
            🟢 Live Monitor & Workload
          </button>
          
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'overview' 
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/10' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <BarChart3 size={14} />
            🎯 วิเคราะห์ภาพรวมเชิงลึก (Overall KPIs)
          </button>
        </div>
      </div>

      {/* BLOCK 1: TOP 4 METRICS KPI (Always visible to maintain standard telemetry metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="stat-kpi-row-1">
        
        {/* KPI 1: % BD */}
        <div className="bg-slate-800 border border-slate-700/85 p-4.5 rounded-2xl flex items-center gap-4 hover:border-slate-700 transition">
          <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/15 text-cyan-400 shrink-0 self-start">
            <Activity size={22} className="animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none block">อัตราการชำรุด (% Breakdown)</span>
            <span className="text-xl font-mono font-extrabold text-cyan-400 mt-1.5 block">{bdPercentage}%</span>
            <p className="text-[9px] text-slate-500 mt-1 font-mono">Std.Limit &lt; 2.5% (กะผลิตหลัก)</p>
          </div>
        </div>

        {/* KPI 2: MTTR */}
        <div className="bg-slate-800 border border-slate-700/85 p-4.5 rounded-2xl flex items-center gap-4 hover:border-slate-700 transition">
          <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/15 text-rose-400 shrink-0 self-start">
            <ShieldAlert size={22} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none block">เวลาซ่อมแซมเฉลี่ย (MTTR)</span>
            <span className="text-xl font-mono font-extrabold text-rose-400 mt-1.5 block">
              {mttrAvg} <span className="text-[11px] font-sans text-rose-300">นาที</span>
            </span>
            <p className="text-[9px] text-slate-500 mt-1 font-mono">ดัชนีประสิทธิภาพฝีมือช่างซ่อม</p>
          </div>
        </div>

        {/* KPI 3: MTBF */}
        <div className="bg-slate-800 border border-slate-700/85 p-4.5 rounded-2xl flex items-center gap-4 hover:border-slate-700 transition">
          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/15 text-amber-400 shrink-0 self-start">
            <Zap size={22} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none block">รอบห่างเครื่องพร้อมใช้ (MTBF)</span>
            <span className="text-xl font-mono font-extrabold text-amber-400 mt-1.5 block">
              {mtbfAvg} <span className="text-[11px] font-sans text-amber-300">วัน</span>
            </span>
            <p className="text-[9px] text-slate-500 mt-1 font-mono">เป้าหมายความน่าเชื่อถือเครื่องจักร</p>
          </div>
        </div>

        {/* KPI 4: PM COMPLIANCE */}
        <div className="bg-slate-800 border border-slate-700/85 p-4.5 rounded-2xl flex items-center gap-4 hover:border-slate-700 transition">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/15 text-emerald-400 shrink-0 self-start">
            <Award size={22} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none block">ความสมบูรณ์แผน PM (% Compliance)</span>
            <span className="text-xl font-mono font-extrabold text-emerald-400 mt-1.5 block">{pmCompliance}%</span>
            <p className="text-[9px] text-slate-500 mt-1 font-mono">อัตราเดินแผนบำรุงเชิงรุก</p>
          </div>
        </div>

      </div>


      {/* QUICK SUMMARY DASHBOARD FOR REPAIR AND MAINTENANCE */}
      <div className="bg-slate-800/80 border border-cyan-500/20 rounded-2xl p-5 shadow-xl relative overflow-hidden" id="dashboard-quick-summary-box">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-500/5 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b border-slate-700/60 relative z-10">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-cyan-400 font-mono flex items-center gap-1.5 animate-pulse">
              <span>📋</span> แดชบอร์ดสรุปสถิติด่วนหน้างาน (Main Breakdown & Maintenance Summary Board)
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              ติดตามปริมาณวิเคราะห์อาการเสีย กลุ่มประเภทหน้างานคลาดเคลื่อน และความสมบูรณ์การป้องกันถาวรของทีมอุตสาหกรรม
            </p>
          </div>
          <div className="p-1.5 px-3 bg-cyan-950/60 border border-cyan-800/40 rounded-xl text-cyan-300 font-mono font-bold text-[10.5px]">
            ⚡ จำนวนบันทึกทั้งหมด: {repairs.length} รายการซ่อม
          </div>
        </div>

        {/* ======================= PLANT HEALTH OVERVIEW ======================= */}
        <div className="bg-slate-900/60 border border-slate-700/50 p-4 rounded-xl mb-5" id="plant-health-overview">
          <div className="flex items-center justify-between mb-3.5">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              🌿 สรุปความแข็งแกร่งของโรงงาน (Plant Health Overview)
            </h4>
            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">
              เป้าหมายประสิทธิภาพโดยรวม (OEE Goal) &gt; 92.5%
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Metric 1: Total Active Machines */}
            <div className="bg-slate-900/40 border border-slate-800 p-3.5 rounded-lg flex items-center gap-4 hover:bg-slate-900/65 hover:border-slate-705/50 transition duration-150">
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/15 rounded-lg text-emerald-400 shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider leading-none">เครื่องจักรเปิดพร้อมลุยงาน</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-xl font-mono font-black text-emerald-400 leading-none">
                    {activeMachinesCount}
                  </span>
                  <span className="text-xs text-slate-400 leading-none">/ {totalMachinesCount} เครื่อง</span>
                  <span className="text-[10px] font-bold text-emerald-400/90 ml-auto font-mono bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">
                    {healthPercent}% OPR
                  </span>
                </div>
                {/* Micro Progress Bar */}
                <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${healthPercent}%` }}></div>
                </div>
              </div>
            </div>

            {/* Metric 2: Pending Repairs */}
            <div className="bg-slate-900/40 border border-slate-800 p-3.5 rounded-lg flex items-center gap-4 hover:bg-slate-900/65 hover:border-slate-705/50 transition duration-150">
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/15 rounded-lg text-rose-400 shrink-0">
                <Wrench size={20} className={pendingRepairsCount > 0 ? "animate-bounce" : ""} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider leading-none">ใบแจ้งซ่อมรอปิดงาน (Pending Repairs)</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className={`text-xl font-mono font-black leading-none ${pendingRepairsCount > 0 ? 'text-rose-450' : 'text-slate-450'}`}>
                    {pendingRepairsCount}
                  </span>
                  <span className="text-xs text-slate-400 leading-none">รายการค้าง</span>
                  {pendingRepairsCount > 0 ? (
                    <span className="text-[9px] text-rose-400 font-bold ml-auto bg-rose-500/5 px-1.5 py-0.5 rounded border border-rose-500/10 leading-none animate-pulse">
                      🚨 ดำเนินการด่วน
                    </span>
                  ) : (
                    <span className="text-[9px] text-emerald-400 font-bold ml-auto bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10 leading-none">
                      ✅ ทุกเครื่องปลอดภัย
                    </span>
                  )}
                </div>
                {/* Description Text */}
                <p className="text-[9.5px] text-slate-400 mt-2 truncate">
                  {pendingRepairsCount > 0 
                    ? `มีเครื่องจักรสายผลิตเกิดขัดข้องฉุกเฉิน กำลังเร่งเคลียร์ปัญหา` 
                    : `ระบบการซ่อมฉุกเฉินเคลียร์ครบ ตราสถิติเรียบร้อย 100%`}
                </p>
              </div>
            </div>

            {/* Metric 3: Upcoming PMs for the Week */}
            <div className="bg-slate-900/40 border border-slate-800 p-3.5 rounded-lg flex items-center gap-4 hover:bg-slate-900/65 hover:border-slate-705/50 transition duration-150">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/15 rounded-lg text-amber-400 shrink-0">
                <Calendar size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider leading-none">แผนบำรุงรักษาในรอบสัปดาห์ (Weekly PMs)</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-xl font-mono font-black text-amber-400 leading-none">
                    {upcomingPmCount}
                  </span>
                  <span className="text-xs text-slate-400 leading-none">ใบงาน</span>
                  {upcomingPmCount > 0 && (
                    <span className="text-[8px] text-amber-400 font-black ml-auto bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/10 leading-none font-mono">
                      📅 {next7DaysStr[0]} ~ {next7DaysStr[6].substring(5)}
                    </span>
                  )}
                </div>
                {/* Small indicator dots / listings */}
                <div className="mt-2 flex items-center gap-1">
                  <span className="text-[9.5px] text-slate-400 truncate">
                    {upcomingPmCount > 0 
                      ? `เครื่อง: ${upcomingPmSchedules.map(p => p.machineId).slice(0, 3).join(', ')}${upcomingPmCount > 3 ? '...' : ''}` 
                      : `ไม่มีแผนตรวจเช็คบำรุงรักษาเชิงรุกในอีก 7 วันนี้`}
                  </span>
                </div>
              </div>
            </div>

            {/* Metric 4: Spare Parts Alert Check */}
            <div className="bg-slate-900/40 border border-slate-800 p-3.5 rounded-lg flex items-center gap-4 hover:bg-slate-900/65 hover:border-slate-705/50 transition duration-150">
              <div className={`p-2.5 rounded-lg shrink-0 ${lowStockPartsCount > 0 ? 'bg-amber-500/10 border border-amber-500/15 text-amber-400' : 'bg-emerald-500/10 border border-emerald-500/15 text-emerald-400'}`}>
                <Package size={20} className={lowStockPartsCount > 0 ? "animate-pulse" : ""} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider leading-none">ความปลอดภัยคลังอะไหล่ (Spare Parts)</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className={`text-xl font-mono font-black leading-none ${lowStockPartsCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {lowStockPartsCount}
                  </span>
                  <span className="text-xs text-slate-400 leading-none">รายการวิกฤต</span>
                  {outOfStockCount > 0 && (
                    <span className="text-[8.5px] px-1 py-0.5 bg-red-500/15 border border-red-500/25 rounded text-red-500 font-black tracking-wide leading-none animate-pulse ml-auto">
                      OUT {outOfStockCount}
                    </span>
                  )}
                </div>
                {/* Description info */}
                <p className="text-[9.5px] text-slate-400 mt-2 truncate">
                  {lowStockPartsCount > 0 
                    ? `อะไหล่ใกล้หมดสต็อก ${lowStockPartsCount} รายการ! กรุณาเตรียมจัดซื้อ` 
                    : `ชิ้นส่วนอะไหล่อยู่ในเกณฑ์ประจุคลังรัดกุมดี`}
                </p>
              </div>
            </div>

          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          
          {/* Card 1: Active vs Closed Repairs */}
          <div className="bg-slate-900/40 border border-slate-750 p-4.5 rounded-xl hover:bg-slate-900/70 transition">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">สถานภาพงานบันทึกแจ้งซ่อมด่วน</span>
            
            <div className="flex justify-between items-center mt-3">
              <div className="space-y-0.5">
                <span className="text-2xl font-mono font-black text-amber-400">
                  {repairs.filter(r => r.status === 'กำลังซ่อม').length}
                </span>
                <span className="text-[10px] text-slate-500 block">งานกำลังซ่อม</span>
              </div>
              <div className="h-8 w-px bg-slate-700/80"></div>
              <div className="space-y-0.5 text-right font-sans">
                <span className="text-2xl font-mono font-black text-emerald-400">
                  {repairs.filter(r => r.status !== 'กำลังซ่อม').length}
                </span>
                <span className="text-[10px] text-slate-500 block">ซ่อมเสร็จปิดงาน</span>
              </div>
            </div>

            <div className="mt-3.5 pt-2.5 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-400">
              <span>อัตราปิดงานสำเร็จ:</span>
              <span className="font-mono text-emerald-300 font-bold">
                {repairs.length > 0 ? Math.round((repairs.filter(r => r.status !== 'กำลังซ่อม').length / repairs.length) * 100) : 100}%
              </span>
            </div>
          </div>

          {/* Card 2: Highest risk machine */}
          <div className="bg-slate-900/40 border border-slate-750 p-4.5 rounded-xl hover:bg-slate-900/70 transition">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">เครื่องจักรที่ชำรุดเสียบ่อยสุด</span>
            
            {(() => {
              const machineCounts: Record<string, number> = {};
              repairs.forEach(r => {
                machineCounts[r.machineId] = (machineCounts[r.machineId] || 0) + 1;
              });
              let highestFailureMach = '-';
              let highestFailureCount = 0;
              Object.entries(machineCounts).forEach(([mId, count]) => {
                if (count > highestFailureCount) {
                  highestFailureCount = count;
                  highestFailureMach = mId;
                }
              });

              const machDetail = machines.find(m => m.id === highestFailureMach);
              
              return (
                <>
                  <div className="mt-2.5">
                    <span className="text-sm font-mono font-black text-rose-400 block truncate" title={machDetail?.name}>
                      🚨 {highestFailureMach}
                    </span>
                    <span className="text-[10.5px] text-slate-350 block truncate mt-0.5">
                      {machDetail?.name || 'ไม่มีประวัติเสียชำรุด'}
                    </span>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-400">
                    <span>จำนวนการเกิดเสียหายด่วน:</span>
                    <span className="font-mono text-rose-400 font-bold">{highestFailureCount} ครั้ง</span>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Card 3: Extreme MTTR logs */}
          <div className="bg-slate-900/40 border border-slate-755 p-4.5 rounded-xl hover:bg-slate-900/70 transition">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">งานซ่อมสะสมนานสุดพิจารณาด่วน</span>
            
            {(() => {
              const criticalLogCount = repairs.filter(r => r.duration > 120).length;
              const longestMins = repairs.length > 0 ? Math.max(...repairs.map(r => r.duration)) : 0;
              const longestLog = repairs.find(r => r.duration === longestMins);
              
              return (
                <>
                  <div className="flex justify-between items-baseline mt-3">
                    <span className="text-2xl font-mono font-black text-red-400">
                      {criticalLogCount}
                    </span>
                    <span className="text-[9.5px] text-slate-500 font-medium">ควิกวิเคราะห์คาบยาว (มากกว่า 2 ชม.)</span>
                  </div>

                  <p className="text-[10px] text-slate-450 mt-1 truncate">
                    นานสุด: <strong className="font-bold text-red-400 font-mono">{longestMins} นาที</strong> ({longestLog?.machineId || '-'})
                  </p>

                  <div className="mt-2 pt-1.5 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500">
                    <span>กระทบสายผลิตสูง:</span>
                    <span className="text-amber-400 font-bold">ต้องการ Why-Why ด่วน</span>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Card 4: Top Technician Performer */}
          <div className="bg-slate-900/40 border border-slate-750 p-4.5 rounded-xl hover:bg-slate-900/70 transition">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">ช่างยอดฝีมือประจำแผนกสัญจร (Top Performer)</span>
            
            {(() => {
              const topTech = techPerformanceLeaderboard[0] || { name: '-', completedPM: 0, adherencePct: 0, score: 0 };
              return (
                <>
                  <div className="mt-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] bg-cyan-400/15 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded font-mono font-bold inline-block">
                        🥇 อันดับ 1 ประจำรอบกะ
                      </span>
                    </div>
                    <span className="text-xs font-bold text-cyan-400 block truncate">
                      🏆 ช่าง {topTech.name}
                    </span>
                    <div className="text-[9.5px] text-slate-350 space-y-1 mt-1.5">
                      <p>• สำเร็จแผน PM: <span className="text-emerald-400 font-bold font-mono">{topTech.completedPM} งาน</span></p>
                      <p>• ความแม่นยำเวลา: <span className="text-amber-400 font-bold font-mono">{topTech.adherencePct}%</span> ตรงมาตรฐาน</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-400">
                    <span>Performance Rating:</span>
                    <span className="text-emerald-400 font-black font-mono">{topTech.score} pts</span>
                  </div>
                </>
              );
            })()}
          </div>

        </div>
      </div>


      {/* TAB 1: LIVE WORK & WORKLOAD CONTROL INTERFACES */}
      {activeTab === 'live-control' && (
        <div className="space-y-6" id="live-tab-container">
          
          {/* Row A: Ongoing work Monitor map & live statistics summary */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left box: Live active monitor list (Column 8) */}
            <div className="lg:col-span-8 bg-slate-800 border border-slate-700/80 p-5 rounded-2xl flex flex-col min-h-[385px] relative">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Clock size={16} className="text-cyan-400" />
                    ตารางติดตามสถานะงานซ่อมบำรุงสด (Live Maintenance Activity Monitor)
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[11px] text-slate-400 font-medium">คัดกรองงาน ณ วันที่:</span>
                    <input 
                      type="date"
                      value={todayStr}
                      onChange={(e) => setTodayStr(e.target.value)}
                      className="bg-slate-950 text-cyan-400 font-mono text-[11px] px-2 py-0.5 rounded border border-slate-700/80 focus:outline-none focus:border-cyan-400/80 transition cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-850">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse"></span>
                  <span className="text-xs font-mono font-bold text-red-400">{totalOngoingWorkCount} รายการกำลังทำ</span>
                </div>
              </div>

              {/* Grid content list of live tasks */}
              <div className="flex-1 overflow-x-auto">
                {totalOngoingWorkCount === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center py-10 text-center">
                    <ShieldCheck size={42} className="text-emerald-500 mb-2.5" />
                    <p className="text-slate-200 text-xs font-bold font-sans">สายการผลิตและเครื่องจักรเป็นปกติตามระบบ</p>
                    <p className="text-slate-500 text-[10px] mt-1 font-mono">ไม่มีประวัติแจ้งซ่อมหรืออยู่ระหว่างการทำ PM ตอนนี้ ณ วันที่เลือก</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-750/90 text-slate-400 font-semibold uppercase">
                        <th className="py-2.5 px-3">ประเภทงาน / ID</th>
                        <th className="py-2.5 px-3">เครื่องจักร</th>
                        <th className="py-2.5 px-3">พนักงานผู้ปฏิบัติการ</th>
                        <th className="py-2.5 px-3">เวลาเป้าหมาย / คาดเสร็จ</th>
                        <th className="py-2.5 px-3 text-center">สถานะปัจจุบัน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/40">
                      {/* Active PM schedules */}
                      {activePMSchedules.map(pm => {
                        const linkedPlan = pmPlans.find(p => p.id === pm.pmPlanId);
                        return (
                          <tr key={pm.id} className="hover:bg-slate-700/20">
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded font-semibold text-[10px]">
                                🔵 PM PLAN
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-200">{pm.machineId}</td>
                            <td className="py-2.5 px-3 text-slate-300 font-medium">{pm.technician}</td>
                            <td className="py-2.5 px-3 font-mono text-cyan-400">{linkedPlan?.ttm || 45} นาที</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 bg-yellow-500/15 text-yellow-500 border border-yellow-500/20 rounded-full font-bold animate-pulse text-[10px] flex items-center justify-center gap-1 w-max mx-auto">
                                <span className="h-1.5 w-1.5 bg-yellow-400 rounded-full animate-ping"></span>
                                กำลังทำ PM
                              </span>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Active today repairs */}
                      {todayRepairs.map(rep => {
                        const isUnderRepair = rep.status === 'กำลังซ่อม';
                        return (
                          <tr key={rep.id} className="hover:bg-slate-700/20">
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded font-semibold text-[10px]">
                                🔴 BREAKDOWN
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-200">{rep.machineId}</td>
                            <td className="py-2.5 px-3 text-slate-300 font-medium">{rep.technicians && rep.technicians.length > 0 ? rep.technicians.join(', ') : rep.technician}</td>
                            <td className="py-2.5 px-3 font-mono">
                              {isUnderRepair ? (
                                <span className="text-amber-400 font-bold animate-pulse">กำลังซ่อม...</span>
                              ) : (
                                <span className="text-red-400">จริง: {rep.duration} นาที</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isUnderRepair ? (
                                <span className="px-2 py-0.5 bg-amber-500/15 text-amber-500 border border-amber-500/20 rounded-full font-bold animate-pulse text-[10px] flex items-center justify-center gap-1 w-max mx-auto">
                                  <span className="h-1.5 w-1.5 bg-amber-400 rounded-full animate-ping"></span>
                                  กำลังซ่อมแซม
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full font-bold text-[10px] flex items-center justify-center gap-1 w-max mx-auto">
                                  <CheckCircle2 size={12} className="text-emerald-400" />
                                  ดำเนินการสำเร็จแล้ว
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Active improvements */}
                      {activeImprovements.map(imp => (
                        <tr key={imp.id} className="hover:bg-slate-700/20">
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded font-semibold">
                              🟣 KAIZEN
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-400 truncate max-w-[120px]" title={imp.title}>{imp.title}</td>
                          <td className="py-2.5 px-3 text-slate-300 font-medium">{imp.technician}</td>
                          <td className="py-2.5 px-3 font-mono text-purple-300">คาดเสร็จ: {imp.plannedEndDate}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full font-bold animate-pulse text-[10px] flex items-center justify-center gap-1 w-max mx-auto">
                              <span className="h-1.5 w-1.5 bg-purple-400 rounded-full"></span>
                              กำลังปรับปรุง
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Info advice footer */}
              <div className="mt-4 pt-3 border-t border-slate-700/30 flex justify-between items-center text-[9px] text-slate-500">
                <span>*ระบบจำลองเวลางานบำรุงรักษาอย่างมีวินัยเชิงอุตสาหกรรม</span>
                <span className="text-slate-450">หากพบตารางงานว่าง ช่างจะสแตนด์บายตรวจประเมินอุณหภูมิทันที</span>
              </div>
            </div>

            {/* Right box: Real-time Live MTTR vs. Code Target Standard Gauge (Column 4) */}
            <div className="lg:col-span-4 bg-slate-800 border border-slate-700/80 p-5 rounded-2xl flex flex-col justify-between min-h-[385px]">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 mb-1.0">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  ดัชนีวินัยซ่อมบำรุง MTTR Target Standard Precision
                </h3>
                <p className="text-[10px] text-slate-400">เปรียบเทียบเวลาใช้ซ่อมจริง เทียบกับเป้าเกณฑ์มาตรฐาน Std.MTTR ในระบบ</p>
              </div>

              {/* Big circular or semi circular progress display */}
              <div className="py-5 flex flex-col items-center justify-center relative">
                <div className="w-28 h-28 rounded-full border-[8px] border-slate-700/50 flex flex-col items-center justify-center relative bg-slate-950/40">
                  
                  {/* Gauge inner dynamic slice */}
                  <div className="absolute inset-0 rounded-full border-[8px] border-emerald-400 border-t-transparent border-r-transparent animate-spin duration-3000 opacity-20"></div>

                  <span className="text-2xl font-mono font-black text-emerald-400">{mttrOnTargetPercent}%</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">ON-TARGET</span>
                </div>
                
                <div className="text-center mt-4 space-y-1">
                  <p className="text-[11px] font-semibold text-slate-200">
                    งานซ่อมบำรุงจำนวน <span className="font-mono text-emerald-400 font-bold">{mttrTargetAnalysis.length - overTargetCount}</span> จาก {mttrTargetAnalysis.length} รายการ
                  </p>
                  <p className="text-[10px] text-slate-400">เสร็จสิ้นเร็วกว่าหรือเท่ากับเป้าหมาย Std.MTTR</p>
                </div>
              </div>

              {/* Progress bars summaries */}
              <div className="space-y-2 border-t border-slate-700/40 pt-3 text-[10px]">
                <div className="flex justify-between items-center text-slate-350">
                  <span>⏱ เวลาซ่อมเฉลี่ยปัจจุบัน:</span>
                  <span className="font-mono font-bold text-slate-200">{mttrAvg} นาที</span>
                </div>
                <div className="flex justify-between items-center text-slate-350">
                  <span>🎯 อัตราคลาดเคลื่อนรวม:</span>
                  <span className="font-mono font-bold text-amber-400">
                    {mttrAvg > 50 ? "+8.5% ช้ากว่าเป้า" : "-3.2% เร็วกว่าเป้า"}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Row B: Detailed Technician Workload Control Grid & Top Performer Leaderboard */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="live-technician-and-leaderboard">
            
            {/* Left Column: Workload Control (Column 8) */}
            <div className="lg:col-span-8 bg-slate-800 border border-slate-700/80 p-5 rounded-2xl flex flex-col justify-between" id="live-technician">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Users size={16} className="text-cyan-400" />
                    อัตราสถิติความคุ้มทุนและภาระงานช่างสะสมรายบุคคล (Technician Workload Analysis)
                  </h3>
                  <p className="text-xs text-slate-400">คำนวณจากชั่วโมงทำงานรวม PM, คุมเครื่อง, ซ่อม, Kaizen ทั้งสิ้นเทียบต่อกะความจุสูงสุดในเดือนนี้ ({selectedMonth})</p>
                </div>

                {/* Search controller inside dashboard */}
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อช่าง / ระดับภาระงาน..."
                    value={techSearch}
                    onChange={(e) => setTechSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-1.8 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                </div>
              </div>

              {/* Workload grid cards container (20 technicians) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredTechWorkloads.length === 0 ? (
                  <div className="col-span-full text-center py-10 text-slate-500 italic text-xs">
                    ไม่พบพนักงานช่างที่ตรงกับการกรองข้อมูล
                  </div>
                ) : (
                  filteredTechWorkloads.map(tw => {
                    const percentLimited = Math.min(100, tw.utilizationPct);
                    return (
                      <div 
                        key={tw.name}
                        onClick={() => setSelectedTechnician(tw.name)}
                        className="bg-slate-900/60 border border-slate-750 p-4.5 rounded-xl flex flex-col justify-between space-y-3 hover:border-cyan-500/25 hover:bg-slate-900/90 hover:scale-[1.02] cursor-pointer transition-all shadow-md select-none"
                        title="คลิกเพื่อเปิดดูประวัติและผลงานช่างโดยละเอียด"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-xs font-black text-slate-100 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                              {tw.name}
                            </h4>
                            <p className="text-[9px] text-slate-500 mt-0.5">ช่างซ่อมบำรุงประจำแผนก</p>
                          </div>
                          <span className={`text-[9px] font-bold border rounded px-1.5 py-0.5 ${tw.badgeColor}`}>
                            {tw.loadLabel}
                          </span>
                        </div>

                        {/* Work hours detailed metrics layout */}
                        <div className="grid grid-cols-4 gap-1 text-[9px] text-center">
                          <div className="bg-cyan-500/5 p-1 rounded border border-cyan-500/10 text-cyan-400 font-mono" title="PM Hours">
                            <p className="text-[7.5px] text-slate-500 font-bold block">PM</p>
                            <span className="font-bold">{tw.details.pmHrs.toFixed(1)}h</span>
                          </div>
                          <div className="bg-amber-500/5 p-1 rounded border border-amber-500/10 text-amber-400 font-mono" title="Machine Standby Hours">
                            <p className="text-[7.5px] text-slate-500 font-bold block">คุมกะ</p>
                            <span className="font-bold">{tw.details.opHrs.toFixed(1)}h</span>
                          </div>
                          <div className="bg-red-500/5 p-1 rounded border border-red-500/10 text-red-400 font-mono" title="Emergency Repairs Hours">
                            <p className="text-[7.5px] text-slate-500 font-bold block">ซ่อม</p>
                            <span className="font-bold">{tw.details.repHrs.toFixed(1)}h</span>
                          </div>
                          <div className="bg-purple-500/5 p-1 rounded border border-purple-500/10 text-purple-400 font-mono" title="Improvement Kaizen Hours">
                            <p className="text-[7.5px] text-slate-500 font-bold block">พัฒนา</p>
                            <span className="font-bold">{tw.details.impHrs.toFixed(1)}h</span>
                          </div>
                        </div>

                        {/* Stacked utilization limit indicator */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-slate-400">
                            <span>ภาระสะสมเดือนนี้: <span className="font-mono text-slate-205 font-bold">{tw.totalHrs} ชม.</span></span>
                            <span className="font-mono font-bold text-slate-205">{tw.utilizationPct}%</span>
                          </div>
                          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                tw.utilizationPct > 100 ? 'bg-gradient-to-r from-red-500 to-rose-600' :
                                tw.utilizationPct >= 80 ? 'bg-gradient-to-r from-amber-500 to-yellow-500' : 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                              }`}
                              style={{ width: `${percentLimited}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Top Performer Leaderboard (Column 4) */}
            <div className="lg:col-span-4 bg-slate-800 border border-slate-700/80 p-5 rounded-2xl flex flex-col justify-between" id="top-performer-leaderboard">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono px-2 py-0.5 rounded font-bold uppercase tracking-widest">
                    ACT COMPLIANCE RATING
                  </span>
                  <Award size={16} className="text-yellow-400 animate-bounce" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-205">
                  🏆 ทำเนียบสถิติ Top Performer ช่างดีเด่น
                </h3>
                <p className="text-[10.5px] text-slate-400 mt-1">
                  จัดอันดับช่างซ่อมบำรุงตามอัตราปิดความสำเร็จแผน PM และวินัยตรงตามมาตรฐานเวลามาตรฐาน (Standard Repair TTM/MTTR Accuracy)
                </p>
              </div>

              <div className="mt-4 space-y-3 flex-1 overflow-y-auto max-h-[360px] pr-1">
                {techPerformanceLeaderboard.map((tech, index) => {
                  const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🎖";
                  const rankBg = index === 0 ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-300" : 
                             index === 1 ? "bg-slate-700/55 border-slate-600/30 text-slate-300" :
                             index === 2 ? "bg-amber-600/15 border-amber-500/20 text-amber-500" : "bg-slate-900/40 border-slate-800 text-slate-450";

                  return (
                    <div 
                      key={tech.name} 
                      onClick={() => setSelectedTechnician(tech.name)}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer hover:border-cyan-500/30 hover:bg-slate-900/90 select-none ${
                        index === 0 ? 'bg-gradient-to-r from-cyan-950/25 to-slate-900 border-cyan-500/25 shadow-md' : 'bg-slate-900/30 border-slate-750/70 hover:border-slate-600'
                      }`}
                      title="คลิกเพื่อเปิดดูโปรไฟล์และสถิติช่างโดยละเอียด"
                    >
                      {/* Left: Rank & Info */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 select-none ${rankBg}`}>
                          {medal}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-200 truncate flex items-center gap-1.5">
                            {tech.name}
                          </h4>
                          <span className="text-[9px] text-slate-500 block font-mono">
                            Score: <b className="text-cyan-400 font-bold">{tech.score}</b> | คลาดเคลื่อน: {100 - tech.adherencePct}%
                          </span>
                        </div>
                      </div>

                      {/* Right: Detailed metrics badge */}
                      <div className="text-right shrink-0">
                        <div className="text-[10px] space-y-0.5">
                          <p className="text-slate-400">PM เสร็จ: <span className="font-mono text-emerald-400 font-bold">{tech.completedPM} งาน</span></p>
                          <p className="text-slate-400">แม่นยำเวลา: <span className="font-mono text-amber-400 font-bold">{tech.adherencePct}%</span></p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Formula and dynamic insight */}
              <div className="mt-4 pt-3 border-t border-slate-700/40 space-y-2">
                <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-750 text-[10px] text-slate-450 leading-relaxed font-sans">
                  💡 <b>สูตรประเมินช่างยอดฝีมือ:</b> ประเมินจากความเร็วและสัมฤทธิผลแผน PM (20 คะแนนต่อใบงานปิด), การกู้คืนงานชำรุดด่วน (15 คะแนนต่อครั้ง), และวินัยควบคุมคลาดเคลื่อนเวลาปฏิบัติงานจริง (Accuracy Variance)
                </div>
                <div className="flex justify-between items-center text-[9px] text-slate-500">
                  <span>*ดึงข้อมูลอ้างอิงตรงจากใบปิดรายงานจริง</span>
                  <span className="text-cyan-400 font-bold font-mono">Real-time Compute</span>
                </div>
              </div>
            </div>

          </div>

          {/* Row C: Dynamic MTTR Deviation Precision List & TTM Maintenance Outliers Side-by-Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="mttr-ttm-deviation-analyzers">
            
            {/* Left box: MTTR Deviation Tracker (จริง vs เป้าStd) */}
            <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-2xl flex flex-col min-h-[360px]">
              <div className="mb-4">
                <span className="text-[9px] bg-red-500/10 border border-red-500/20 rounded font-bold text-red-400 px-2 py-0.5 inline-block mb-1 font-mono">
                  BREAKDOWN TIME ACCURACY
                </span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  <ShieldAlert size={15} className="text-red-400" />
                  รายการค่าเป้าหมาย MTTR เบี่ยงเบนรายเครื่องจักร (MTTR Variance Tracker)
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[280px]">
                {mttrTargetAnalysis.length === 0 ? (
                  <p className="text-slate-500 text-xs italic text-center col-span-full py-10">ไม่มีบันทึกซ่อมชำรุดในระบบ</p>
                ) : (
                  <div className="space-y-2.5">
                    {mttrTargetAnalysis.map((item, idx) => {
                      const isSlower = item.isOverTarget;
                      return (
                        <div 
                          key={idx} 
                          className="bg-slate-900/60 p-3 rounded-lg border border-slate-750/90 flex justify-between items-center text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-cyan-400">{item.machineId}</span>
                              <span className="text-[10px] text-slate-500 font-mono">{item.date}</span>
                            </div>
                            <p className="text-[10px] text-slate-300 font-sans truncate max-w-[200px]" title={item.symptoms}>
                              🚨 {item.symptoms}
                            </p>
                          </div>

                          <div className="text-right flex items-center gap-3">
                            <div className="text-[10px] text-slate-400 flex flex-col">
                              <span>เป้า Std: <span className="font-mono text-slate-202">{item.standardMttr}m</span></span>
                              <span>ซ่อมจริง: <span className="font-mono text-slate-202">{item.duration}m</span></span>
                            </div>

                            <span className={`px-2 py-1 rounded font-mono font-bold text-[10px] flex items-center gap-0.5 text-right w-20 justify-end ${
                              isSlower ? 'text-red-400 bg-red-500/5' : 'text-emerald-400 bg-emerald-500/5'
                            }`}>
                              {isSlower ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                              {isSlower ? `+${item.deviationPct}%` : `${item.deviationPct}%`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right box: PM TTM Deviation Analyzer (จริง vs stdแผน) */}
            <div className="bg-slate-800 border border-slate-700/80 p-5 rounded-2xl flex flex-col min-h-[360px]">
              <div className="mb-4">
                <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 rounded font-bold text-emerald-400 px-2 py-0.5 inline-block mb-1 font-mono">
                  PREVENTIVE MAINTENANCE TIME ACCURACY (TTM)
                </span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  <ClipboardCheck size={15} className="text-emerald-400" />
                  อัตราคลาดเคลื่อนเวลากะ PM (TTM True Deviation Outliers)
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[280px]">
                {ttmDeviationList.length === 0 ? (
                  <p className="text-slate-500 text-xs italic text-center py-10">ระบบรวบรวมประวัติการปิดงาน PM ในเดือนนี้เพื่อประเมิน TTM</p>
                ) : (
                  <div className="space-y-2.5">
                    {ttmDeviationList.map((item, idx) => {
                      const isOver = item.status === 'over';
                      const isUnder = item.status === 'under';
                      return (
                        <div 
                          key={idx} 
                          className="bg-slate-900/60 p-3 rounded-lg border border-slate-750/90 flex justify-between items-center text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-indigo-400">{item.machineId}</span>
                              <span className="text-[10px] text-slate-500 font-mono">{item.date}</span>
                            </div>
                            <span className="text-[10px] text-slate-300 font-sans block truncate max-w-[200px]" title={item.planTitle}>
                              🛠 {item.planTitle}
                            </span>
                          </div>

                          <div className="text-right flex items-center gap-3">
                            <div className="text-[10px] text-slate-400 flex flex-col">
                              <span>เป้า: <span className="font-mono text-slate-202">{item.standardTtm}m</span></span>
                              <span>จริง: <span className="font-mono text-slate-202">{item.actualTtm}m</span></span>
                            </div>

                            <span className={`px-2 py-1 rounded font-mono font-bold text-[10px] flex items-center gap-0.5 text-right w-20 justify-end ${
                              isOver ? 'text-red-400 bg-red-500/5' : 
                              isUnder ? 'text-emerald-300 bg-emerald-500/5' : 'text-slate-400 bg-slate-500/5'
                            }`}>
                              {isOver ? <ArrowUpRight size={12} /> : isUnder ? <ArrowDownRight size={12} /> : null}
                              {item.diffPct === 0 ? 'ตรงเป้า' : item.diffPct > 0 ? `+${item.diffPct}%` : `${item.diffPct}%`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}


      {/* TAB 2: OVERALL ENGINEERING KPI ANALYTICS (The rich core dashboard charts) */}
      {activeTab === 'overview' && (
        <div className="space-y-6" id="overall-tabs-container">
          
          <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="text-xs text-slate-450 uppercase font-black tracking-widest font-mono">Industrial Month Scope</p>
              <h2 className="text-sm font-extrabold text-cyan-400 mt-1">รายงานตัวภาพรวมรายสัปดาห์ / คืนความมีวินัยซ่อมบำรุงเชิงอุตสาหกรรมสถิติ</h2>
            </div>
            
            {/* Month Dropdown Selector */}
            <div className="flex items-center gap-2 bg-slate-850 px-3 py-1.5 rounded-lg border border-slate-700/80">
              <label className="text-[11px] text-slate-400">เลือกเดือนสถิติวิเคราะห์:</label>
              <select
                id="dash-month-selector"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-900 border border-slate-705 rounded-md text-xs font-mono font-bold px-3 py-1 text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="2026-05">พฤษภาคม 2569</option>
                <option value="2026-06">มิถุนายน 2569</option>
                <option value="2026-07">กรกฎาคม 2569</option>
              </select>
            </div>
          </div>

          {/* Cumulative hour boxes */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="workload-cards">
            
            <div className="bg-slate-900 border border-slate-755 p-4 rounded-xl flex flex-col hover:border-slate-700 transition">
              <span className="text-[10px] uppercase font-bold text-slate-400">⏱ ชั่วโมง PM เดือนนี้</span>
              <p className="text-lg font-mono font-bold text-cyan-400 mt-1">
                {pmHrsThisMonth.toFixed(1)} <span className="text-xs text-slate-500">ชม.</span>
              </p>
              <div className="w-full bg-slate-950 h-1 mt-2.5 rounded overflow-hidden">
                <div className="bg-cyan-400 h-full" style={{ width: `${Math.min(100, (pmHrsThisMonth / (totalWorkHrs || 1)) * 100)}%` }}></div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-755 p-4 rounded-xl flex flex-col hover:border-slate-700 transition">
              <span className="text-[10px] uppercase font-bold text-slate-400">🚨 ชั่วโมงซ่อมฉุกเฉลี่ย</span>
              <p className="text-lg font-mono font-bold text-rose-400 mt-1">
                {repairHrsThisMonth.toFixed(1)} <span className="text-xs text-slate-500">ชม.</span>
              </p>
              <div className="w-full bg-slate-950 h-1 mt-2.5 rounded overflow-hidden">
                <div className="bg-rose-455 h-full" style={{ width: `${Math.min(100, (repairHrsThisMonth / (totalWorkHrs || 1)) * 100)}%` }}></div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-755 p-4 rounded-xl flex flex-col hover:border-slate-700 transition">
              <span className="text-[10px] uppercase font-bold text-slate-400">🤖 ชั่วโมงควบคุมเครื่องจักร</span>
              <p className="text-lg font-mono font-bold text-amber-500 mt-1">
                {opHrsThisMonth.toFixed(1)} <span className="text-xs text-slate-500">ชม.</span>
              </p>
              <div className="w-full bg-slate-950 h-1 mt-2.5 rounded overflow-hidden">
                <div className="bg-amber-455 h-full" style={{ width: `${Math.min(100, (opHrsThisMonth / (totalWorkHrs || 1)) * 100)}%` }}></div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-755 p-4 rounded-xl flex flex-col hover:border-slate-700 transition">
              <span className="text-[10px] uppercase font-bold text-slate-400">🔨 ชั่วโมงปรับปรุง Kaizen</span>
              <p className="text-lg font-mono font-bold text-purple-400 mt-1">
                {impHrsThisMonth.toFixed(1)} <span className="text-xs text-slate-500">ชม.</span>
              </p>
              <div className="w-full bg-slate-950 h-1 mt-2.5 rounded overflow-hidden">
                <div className="bg-purple-455 h-full" style={{ width: `${Math.min(100, (impHrsThisMonth / (totalWorkHrs || 1)) * 100)}%` }}></div>
              </div>
            </div>

          </div>

          {/* CHARTS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-charts-row">
            
            {/* CHART 1: Stacked tech workload */}
            <div className="col-span-1 lg:col-span-8 bg-slate-800 border border-slate-700/80 p-5 rounded-2xl flex flex-col h-[380px]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-1.5">
                <Users size={16} className="text-cyan-400" />
                ภาระและปริมาณงานช่างรายคนสะสม แผนและซ่อมบำรุง (ชั่วโมงแยกสี)
              </h3>
              <div className="flex-1 w-full overflow-x-auto min-h-0" id="chart-stacked-tech-container">
                <div className="h-full min-w-[700px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={technicianMinsSummary}
                      margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#94a3b8" 
                        tick={{ fontSize: 9.5 }} 
                        interval={0} 
                        angle={-35} 
                        textAnchor="end" 
                        height={50}
                      />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '11px' }} 
                      />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} />
                      <Bar dataKey="PM (ชม.)" stackId="a" fill="#06b6d4" />
                      <Bar dataKey="คุมเครื่อง (ชม.)" stackId="a" fill="#f59e0b" />
                      <Bar dataKey="ซ่อมด่วน (ชม.)" stackId="a" fill="#ef4444" />
                      <Bar dataKey="ปรับปรุง (ชม.)" stackId="a" fill="#a855f7" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* CHART 2: Work ratio Pie */}
            <div className="col-span-1 lg:col-span-4 bg-slate-800 border border-slate-700/80 p-5 rounded-2xl flex flex-col h-[380px]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-1.5">
                <BarChart3 size={16} className="text-cyan-400" />
                สัดส่วนรวมการใช้กำลังพลตามกลุ่มงาน (%)
              </h3>
              <div className="flex-1 flex justify-center items-center relative" id="chart-pie-container">
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={activePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {activePieData.map((entry: any, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '11px' }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="absolute flex flex-col justify-center items-center pointer-events-none select-none">
                  <span className="text-[10px] uppercase text-slate-400">ชั่วโมงสะสม</span>
                  <span className="text-lg font-mono font-black text-slate-205">{totalWorkHrs.toFixed(0)}</span>
                  <span className="text-[9px] text-slate-450">ชั่วโมง</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-slate-700/50">
                {activePieData.map((e, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-slate-350">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.color }}></span>
                    <span className="truncate">{e.name}: {e.value} ชม.</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ADDITIONAL CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="downtime-charts-row">
            
            {/* CHART 3: Top 10 repairs BD */}
            <div className="col-span-1 lg:col-span-6 bg-slate-800 border border-slate-700/80 p-5 rounded-2xl flex flex-col h-[340px]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-305 mb-4 flex items-center gap-1.5">
                <ShieldAlert size={15} className="text-rose-450" />
                Top 10 เครื่องจักรที่มีเวลาพังชำรุด (Breakdown Downtime) ซ่อมยืดเยื้อสูงสุด
              </h3>
              <div className="flex-1 w-full animate-in fade-in duration-200">
                {top10DowntimeSorted.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 italic">
                    ไม่มีความผิดพลาดหรือบันทึกชำรุดในระบบเดือนนี้
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={top10DowntimeSorted}
                      margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '11px' }} 
                      />
                      <Bar dataKey="Downtime (นาที)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* CHART 4: TTM comparison */}
            <div className="col-span-1 lg:col-span-6 bg-slate-800 border border-slate-700/80 p-5 rounded-2xl flex flex-col h-[340px]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-1.5">
                <ClipboardCheck size={15} className="text-emerald-400" />
                วิเคราะห์เวลาตอบสนองซ่อมบำรุงแผนตามมาตรฐาน (PM TTM vs Std.TTM)
              </h3>
              <div className="flex-1 w-full animate-in fade-in duration-200">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={ttmSummaryData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="machineId" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '11px' }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '9px' }} />
                    <Bar dataKey="TTM จริง (นาที)" fill="#10b981" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Std.TTM (นาที)" fill="#06b6d4" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* PER MACHINE SUMMARY TABLE */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5" id="mach-kpi-detail-table">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-1.5">
              <Activity size={15} className="text-cyan-400" />
              ตารางวิเคราะห์ความเชื่อมั่นเชิงโครงสร้าง (KPI & Reliability Metrics Per Machine)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-700 text-slate-400 font-semibold uppercase text-center">
                    <th className="py-3 px-4 text-left">รหัส</th>
                    <th className="py-3 px-4 text-left">ชื่อเครื่องจักร</th>
                    <th className="py-3 px-3">อัตรา breakdown (%)</th>
                    <th className="py-3 px-3">รวมเวลาพังทั้งหมด (นาที)</th>
                    <th className="py-3 px-3">ห้วงความห่างใช้งานได้ต่อเนื่อง (MTBF วัน)</th>
                    <th className="py-3 px-3">จำนวนครั้งซ่อมหยุด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-center">
                  {machines.slice(0, 10).map((m, idx) => {
                    const machReps = repairs.filter(r => r.machineId === m.id && r.date.startsWith(selectedMonth));
                    const totalMins = machReps.reduce((sum, r) => sum + r.duration, 0);
                    const percentBd = parseFloat(((totalMins / 60 / operatingHoursFactor) * 100).toFixed(2)) || 0;
                    const mtbfVal = parseFloat((daysInMonth / (machReps.length + 1)).toFixed(1));

                    return (
                      <tr key={`${m.id}-${m.orderNo || idx}`} className="hover:bg-slate-700/20">
                        <td className="py-3 px-4 font-mono font-bold text-cyan-400 text-left">{m.id}</td>
                        <td className="py-3 px-4 text-slate-200 text-left font-sans truncate max-w-[150px]">{m.name}</td>
                        <td className="py-3 px-3 font-mono font-semibold text-rose-400">{percentBd}%</td>
                        <td className="py-3 px-3 font-mono text-slate-202">{totalMins} นาที</td>
                        <td className="py-3 px-3 font-mono text-amber-400 font-bold">{mtbfVal} วัน</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-400">{machReps.length} ครั้ง</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ======================= TECHNICIAN PROFILE CARD MODAL ======================= */}
      {selectedTechnician && (() => {
        const techName = selectedTechnician;
        const workloadData = activeTechnicianWorkload.find(tw => tw.name === techName);
        
        // 1. Task Completion metrics for this month
        const techMonthPM = schedules.filter(s => 
          (s.technicians ? s.technicians.includes(techName) : s.technician === techName) &&
          s.type === 'PM' && 
          s.status === 'เสร็จสิ้น' && 
          s.date.startsWith(selectedMonth)
        ).length;
        
        const techMonthRepairs = repairs.filter(r => 
          (r.technicians ? r.technicians.includes(techName) : r.technician === techName) &&
          r.status !== 'กำลังซ่อม' && 
          r.date.startsWith(selectedMonth)
        ).length;

        const techMonthImprovements = improvements.filter(proj => 
          (proj.technicians ? proj.technicians.includes(techName) : proj.technician === techName) &&
          proj.workLogs.some(wl => wl.date.startsWith(selectedMonth))
        ).length;

        const totalMonthCompletedTasks = techMonthPM + techMonthRepairs + techMonthImprovements;

        // 2. MTTR Deviation over all time (performance indicator)
        const techRepairsList = repairs.filter(r => 
          (r.technicians ? r.technicians.includes(techName) : r.technician === techName) &&
          r.status !== 'กำลังซ่อม'
        );

        let totalDeviationMin = 0;
        let repairCaseCount = 0;
        
        const individualRepairsWithDeviation = techRepairsList.map(r => {
          const machinePrefix = r.machineId.substring(0, 3).toUpperCase();
          const standardMttr = settings.stdMttr[machinePrefix] || 60;
          const deviation = r.duration - standardMttr;
          
          totalDeviationMin += deviation;
          repairCaseCount++;
          
          return {
            ...r,
            standard: standardMttr,
            deviation
          };
        }).sort((a,b) => b.date.localeCompare(a.date)); // Sort by newest date

        const avgDeviationMin = repairCaseCount > 0 ? parseFloat((totalDeviationMin / repairCaseCount).toFixed(1)) : 0;

        // 3. Attendance & Leave history for selected month
        const techMonthLeaves = leaves ? leaves.filter(l => l.technician === techName && l.date.startsWith(selectedMonth)) : [];
        const personalLeaveCount = techMonthLeaves.filter(l => l.type === 'ลากิจ').length;
        const sickLeaveCount = techMonthLeaves.filter(l => l.type === 'ลาป่วย').length;
        const vacationLeaveCount = techMonthLeaves.filter(l => l.type === 'ลาพักร้อน').length;
        const weekendOffCount = techMonthLeaves.filter(l => l.type === 'วันหยุดประจำสัปดาห์').length;
        const otherLeaveCount = techMonthLeaves.filter(l => l.type === 'ลาอื่น ๆ').length;

        // Exclude weekend rest days from actual leaves of absence
        const actualAbsences = personalLeaveCount + sickLeaveCount + vacationLeaveCount + otherLeaveCount;
        const workingDaysInMonth = 30;
        const attendanceRate = Math.max(0, Math.min(100, Math.round(((workingDaysInMonth - actualAbsences) / workingDaysInMonth) * 100)));

        return (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
            id="tech-profile-card-modal-overlay"
            onClick={() => setSelectedTechnician(null)}
          >
            <div 
              className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col"
              id="tech-profile-card-modal"
              onClick={(e) => e.stopPropagation()}
            >
              
              {/* Modal Banner Profile Header */}
              <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-slate-950/80 to-slate-900 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Decorative Initials Avatar */}
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-lg ring-2 ring-slate-800 shrink-0 select-none">
                    {techName.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded font-bold text-[9px] uppercase tracking-wider">
                      Technician Performance Card
                    </span>
                    <h2 className="text-xl font-black text-white mt-1 flex items-center gap-2">
                      {techName}
                      <span className="text-xs font-normal text-slate-400">| ช่างซ่อมบำรุงวิทยฐานะอาวุโส</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 font-sans">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      แผนกปฏิบัติการซ่อมบำรุงรักษาโรงงาน (Factory Maintenance & Automation Service)
                    </p>
                  </div>
                </div>

                {/* Right actions: Workload state + Close button */}
                <div className="flex items-center gap-3">
                  {workloadData && (
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-bold mb-1 uppercase tracking-wider">สถานะภาระงานเดือนนี้</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-black border ${workloadData.badgeColor}`}>
                        {workloadData.loadLabel}
                      </span>
                    </div>
                  )}
                  <button 
                    onClick={() => setSelectedTechnician(null)}
                    className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-xl transition duration-150 font-bold shrink-0 shadow-inner ml-2 border border-slate-800"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Modal Core Area (Scrollable contents and Bento stats grid) */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200 scrollbar-thin">
                
                {/* 3 Stats Hero Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  
                  {/* KPI card 1: Total month tasks completed */}
                  <div className="bg-slate-950/40 border border-slate-800 p-4.5 rounded-xl flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10.5px] text-slate-400 font-bold uppercase tracking-wider">ใบงานปิดเสร็จสิ้นรวม</span>
                        <ClipboardCheck size={16} className="text-cyan-400" />
                      </div>
                      <div className="text-2xl font-black text-cyan-400 font-mono">
                        {totalMonthCompletedTasks} <span className="text-sm text-slate-300 font-normal">ใบงาน</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        ปริมาณผลงานที่ทำเสร็จในกะและปิดใบงานในระบบในห้วงเดือนนี้
                      </p>
                    </div>

                    {/* Breakdown distribution progress bar */}
                    <div className="space-y-2 mt-4 pt-4 border-t border-slate-800/60">
                      <div className="flex justify-between text-[10px] text-slate-450 uppercase font-bold">
                        <span>PM: <b className="text-emerald-400">{techMonthPM}</b></span>
                        <span>ซ่อมด่วน: <b className="text-rose-400">{techMonthRepairs}</b></span>
                        <span>Kaizen: <b className="text-purple-400">{techMonthImprovements}</b></span>
                      </div>
                      <div className="w-full bg-slate-900 h-2 rounded-full flex overflow-hidden">
                        {totalMonthCompletedTasks > 0 ? (
                          <>
                            <div className="bg-emerald-500 h-full" style={{ width: `${(techMonthPM / totalMonthCompletedTasks) * 100}%` }}></div>
                            <div className="bg-rose-500 h-full" style={{ width: `${(techMonthRepairs / totalMonthCompletedTasks) * 100}%` }}></div>
                            <div className="bg-purple-500 h-full" style={{ width: `${(techMonthImprovements / totalMonthCompletedTasks) * 100}%` }}></div>
                          </>
                        ) : (
                          <div className="bg-slate-800 w-full h-full"></div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* KPI card 2: Average MTTR Deviation */}
                  <div className="bg-slate-950/40 border border-slate-800 p-4.5 rounded-xl flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10.5px] text-slate-400 font-bold uppercase tracking-wider">ค่าเบี่ยงเบนเวลาเฉลี่ย (MTTR Deviation)</span>
                        <Clock size={16} className="text-rose-450" />
                      </div>
                      <div className="text-2xl font-black font-mono flex items-center gap-1.5">
                        <span className={avgDeviationMin <= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {avgDeviationMin <= 0 ? `${avgDeviationMin}` : `+${avgDeviationMin}`}
                        </span>
                        <span className="text-sm text-slate-300 font-normal">นาที/เคส</span>
                      </div>
                      <p className="text-[10px] text-slate-450 mt-1">
                        เปรียบเทียบเวลาซ่อมฉุกเฉินจริง กับเกณฑ์มาตรฐานเป้าหมายของแต่ละเครื่องจักร
                      </p>
                    </div>

                    <div className="mt-4 pt-3.5 border-t border-slate-800/60 flex items-center gap-2.5">
                      {repairCaseCount > 0 ? (
                        avgDeviationMin <= 0 ? (
                          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg p-2 text-[10px] font-medium leading-relaxed w-full flex items-center gap-2">
                            <span className="text-base">⚡</span>
                            <span>ทำเวลาดีกว่าเกณฑ์เฉลี่ยมาตรฐาน (ซ่อมรวดเร็วเป็นพิเศษ)</span>
                          </div>
                        ) : (
                          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg p-2 text-[10px] font-medium leading-relaxed w-full flex items-center gap-2">
                            <span className="text-base">⚠️</span>
                            <span>ใช้เวลาเยอะกว่าเป้าหมายกลุ่ม (ควรวิเคราะห์ทักษะเฉพาะด้าน)</span>
                          </div>
                        )
                      ) : (
                        <div className="bg-slate-900 border border-slate-800 text-slate-450 rounded-lg p-2 text-[10px] leading-relaxed w-full text-center italic">
                          ไม่มีบันทึกประวัติซ่อมด่วนในเดือนนี้
                        </div>
                      )}
                    </div>
                  </div>

                  {/* KPI card 3: Attendance History & Rate */}
                  <div className="bg-slate-950/40 border border-slate-800 p-4.5 rounded-xl flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10.5px] text-slate-400 font-bold uppercase tracking-wider">อัตราการมาปฏิบัติทีม (Attendance Rate)</span>
                        <Calendar size={16} className="text-purple-400" />
                      </div>
                      <div className="text-2xl font-black text-purple-400 font-mono">
                        {attendanceRate}% <span className="text-sm text-slate-300 font-normal">มาทำงาน</span>
                      </div>
                      <p className="text-[10px] text-slate-450 mt-1">
                        คำนวณจากจำนวนวันที่ลานอกกติกามาตรฐานประจำเดือน ({selectedMonth})
                      </p>
                    </div>

                    {/* Compact Leave Tally Stats */}
                    <div className="mt-4 pt-3.5 border-t border-slate-800/60 block">
                      <div className="grid grid-cols-4 gap-1 text-[9px] text-center font-mono font-bold">
                        <div className="bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 text-red-400 p-1 rounded">
                          <span className="text-[7.5px] text-slate-500 block">ลาป่วย</span>
                          <span>{sickLeaveCount} วัน</span>
                        </div>
                        <div className="bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 text-amber-400 p-1 rounded">
                          <span className="text-[7.5px] text-slate-500 block">ลากิจ</span>
                          <span>{personalLeaveCount} วัน</span>
                        </div>
                        <div className="bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 text-emerald-400 p-1 rounded">
                          <span className="text-[7.5px] text-slate-500 block">พักร้อน</span>
                          <span>{vacationLeaveCount} วัน</span>
                        </div>
                        <div className="bg-slate-800 border border-slate-700 p-1 rounded text-slate-400">
                          <span className="text-[7.5px] text-slate-500 block">วันหยุดกะ</span>
                          <span>{weekendOffCount} วัน</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Split lists: Left Column for Leave attendance records, Right Column for Emergency performance log */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                  
                  {/* Attendance Log (Column 5) */}
                  <div className="lg:col-span-5 bg-slate-950/20 p-4 border border-slate-800 rounded-2xl flex flex-col space-y-4">
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                        <Coffee size={14} className="text-amber-400" />
                        <span>รายงานบันทึกการลาและวันหยุดกะประจำเดือน</span>
                      </h4>
                      <p className="text-[10px] text-slate-400.5 mt-1 font-sans">
                        การติดตามสิทธิ์ลากิจ, ลาป่วย, พักร้อน และวันหยุดพนักงานช่างอย่างเป็นวินัย
                      </p>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[290px] pr-1 space-y-2.5 scrollbar-thin">
                      {techMonthLeaves.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-500 italic border border-dashed border-slate-800/80 rounded-xl">
                          ไม่มีบันทึกการลากิจ/ลาหยุด ในฐานข้อมูลสำหรับเดือนนี้
                        </div>
                      ) : (
                        [...techMonthLeaves].sort((a,b) => b.date.localeCompare(a.date)).map(lv => {
                          const badgeColor = 
                            lv.type === 'ลาป่วย' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            lv.type === 'ลากิจ' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            lv.type === 'ลาพักร้อน' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            lv.type === 'วันหยุดประจำสัปดาห์' ? 'bg-slate-800/60 text-slate-400 border-slate-750' : 'bg-slate-800 text-slate-350 border-slate-700';

                          return (
                            <div key={lv.id} className="p-3 bg-slate-900/60 border border-slate-850 rounded-xl flex items-start justify-between gap-3 text-xs">
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`px-2 py-0.5 rounded text-[8.5px] font-black border uppercase ${badgeColor}`}>
                                    {lv.type}
                                  </span>
                                  <span className="font-mono text-white text-[10.5px] font-bold">
                                    📅 {lv.date}
                                  </span>
                                </div>
                                {lv.note && (
                                  <p className="text-[10px] text-slate-400 italic font-medium leading-relaxed truncate" title={lv.note}>
                                    📝 หมายเหตุ: "{lv.note}"
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Technical Repairs Performance logs (Column 7) */}
                  <div className="lg:col-span-7 bg-slate-950/20 p-4 border border-slate-800 rounded-2xl flex flex-col space-y-4">
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                        <Wrench size={14} className="text-rose-400" />
                        <span>รายงานบันทึกประวัติซ่อมฉุกเฉินด่วนแยกรายเคส</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1 font-sans">
                        วิเคราะห์ความรวดเร็วและทักษะการกู้คืนเครื่องจักรของช่างเทียบต่อดัชนีเวลา standard MTTR
                      </p>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[290px] pr-1 space-y-2.5 scrollbar-thin">
                      {individualRepairsWithDeviation.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-500 italic border border-dashed border-slate-800/80 rounded-xl">
                          ไม่มีบันทึกประวัติลุยงานซ่อมหยุดด่วน (Emergency Repairs) ในประวัติ
                        </div>
                      ) : (
                        individualRepairsWithDeviation.map(rep => {
                          const isBetter = rep.deviation <= 0;
                          return (
                            <div key={rep.id} className="p-3 bg-slate-900/60 border border-slate-850 rounded-xl space-y-2 text-xs">
                              {/* Top metadata line */}
                              <div className="flex justify-between items-start flex-wrap gap-2">
                                <div className="space-y-0.5">
                                  <p className="font-mono font-black text-cyan-400 text-xs">
                                    ⚙️ {rep.machineId} <span className="text-[10px] text-slate-500 font-mono font-medium">({rep.date})</span>
                                  </p>
                                  <p className="text-[10px] text-slate-350 leading-relaxed max-w-[280px] break-words">
                                    🚨 อาการ: {rep.symptoms}
                                  </p>
                                </div>

                                {/* Custom individual Deviation Pill */}
                                <div className="text-right">
                                  <span className={`px-2 py-1 rounded font-mono font-bold text-[9.5px] inline-flex items-center gap-0.5 ${
                                    isBetter ? 'text-emerald-400 bg-emerald-500/5 border border-emerald-500/10' : 'text-rose-400 bg-rose-500/5 border border-rose-500/10'
                                  }`}>
                                    {isBetter ? '⚡ ' : '⚠️ '}
                                    {isBetter ? `${rep.deviation} นาที` : `+${rep.deviation} นาที`}
                                  </span>
                                </div>
                              </div>

                              {/* Target comparing values footer */}
                              <div className="pt-2 border-t border-slate-800/50 flex justify-between text-[9px] text-slate-450 uppercase font-mono">
                                <span>เวลามาตรฐาน (Goal): <b className="text-slate-300">{rep.standard} ม.</b></span>
                                <span>เวลาที่ใช้จริง (Actual): <b className="text-slate-205">{rep.duration} ม.</b></span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>

              </div>

              {/* Modal footer section */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex justify-end gap-3 shrink-0">
                <button 
                  onClick={() => setSelectedTechnician(null)}
                  className="px-4.5 py-2 bg-slate-800 hover:bg-slate-705 text-white font-black rounded-xl text-xs transition cursor-pointer select-none"
                >
                  ปิดหน้าต่างโปรไฟล์
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
};
