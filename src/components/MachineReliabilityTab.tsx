import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Machine, RepairLog } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts';
import { 
  Activity, ShieldAlert, Zap, Clock, ShieldCheck, CheckCircle2, 
  AlertTriangle, Search, Filter, ArrowUpDown, Eye, Wrench, 
  Package, BarChart3, TrendingUp, TrendingDown, Layers, X, HelpCircle,
  Settings, Edit3, Save, Check, RotateCcw, Percent, Sliders, Info, Sparkles, ChevronDown, ChevronUp
} from 'lucide-react';
import { PlannedProductionTimeModal } from './PlannedProductionTimeModal';

interface MachineReliabilityTabProps {
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
}

export const MachineReliabilityTab: React.FC<MachineReliabilityTabProps> = ({
  selectedMonth,
  onSelectMonth
}) => {
  const { 
    machines, 
    repairs, 
    settings, 
    pmPlans, 
    updateMachinePlannedTime, 
    updateAllMachinesPlannedTime 
  } = useApp();

  // Filter States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLine, setSelectedLine] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'all'>('month');
  const [filterFailureStatus, setFilterFailureStatus] = useState<'all' | 'breakdown-only' | 'zero-breakdown'>('all');
  const [sortField, setSortField] = useState<'breakdown' | 'mttr' | 'mtbf' | 'planned' | 'downtime' | 'failures' | 'availability'>('breakdown');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Modals & Quick Edit States
  const [inspectMachineId, setInspectMachineId] = useState<string | null>(null);
  const [isBatchPlannedModalOpen, setIsBatchPlannedModalOpen] = useState<boolean>(false);
  const [inlineEditMachineId, setInlineEditMachineId] = useState<string | null>(null);
  const [inlineEditHours, setInlineEditHours] = useState<number>(600);
  const [showFormulaGuide, setShowFormulaGuide] = useState<boolean>(true);
  const [activeChartTab, setActiveChartTab] = useState<'breakdown' | 'mttr' | 'mtbf'>('breakdown');
  
  // Toast notifications
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 3500);
  };

  // Helper: Operating parameters
  const daysInPeriod = timeRange === 'month' ? 30 : timeRange === 'quarter' ? 90 : 365;
  const periodFactor = timeRange === 'month' ? 1 : timeRange === 'quarter' ? 3 : 12;
  const defaultPlannedMonthlyHours = settings.defaultPlannedProductionHours || 600;

  // Distinct production lines for filtering
  const lineGroups = useMemo(() => {
    const lines = new Set<string>();
    machines.forEach(m => {
      if (m.lineGroup) lines.add(m.lineGroup);
    });
    return Array.from(lines).sort();
  }, [machines]);

  // Filter repairs based on time range
  const scopedRepairs = useMemo(() => {
    if (timeRange === 'month') {
      return repairs.filter(r => r.date.startsWith(selectedMonth));
    }
    if (timeRange === 'quarter') {
      // Last 3 months based on selectedMonth
      const [year, month] = selectedMonth.split('-').map(Number);
      const months = [];
      for (let i = 0; i < 3; i++) {
        let m = month - i;
        let y = year;
        if (m <= 0) {
          m += 12;
          y -= 1;
        }
        months.push(`${y}-${String(m).padStart(2, '0')}`);
      }
      return repairs.filter(r => months.some(m => r.date.startsWith(m)));
    }
    // All time
    return repairs;
  }, [repairs, timeRange, selectedMonth]);

  // Calculate reliability metrics per machine using CPRAM TPM Standards:
  // 1. % Breakdown = (Breakdown Time / Planned Production Time) * 100
  // 2. MTTR = Total Breakdown Repair Time / Number of Failures
  // 3. MTBF = Total Operating Time / Number of Failures (Operating Time = Planned Time - Breakdown Time)
  const machineMetrics = useMemo(() => {
    return machines.map(machine => {
      const machRepairs = scopedRepairs.filter(r => r.machineId === machine.id);
      const failureCount = machRepairs.length;
      const totalDowntimeMins = machRepairs.reduce((sum, r) => sum + r.duration, 0);
      const totalDowntimeHrs = parseFloat((totalDowntimeMins / 60).toFixed(2));

      // Planned Production Time (เวลาที่วางแผนให้เครื่องจักรพร้อมสำหรับการผลิต)
      const machinePlannedMonthlyHours = machine.plannedProductionHours ?? defaultPlannedMonthlyHours;
      const plannedHours = machinePlannedMonthlyHours * periodFactor;
      const plannedMins = plannedHours * 60;

      // 1. % Breakdown — เปอร์เซ็นต์เวลาที่เครื่องจักรเสีย (Breakdown Time Rate %)
      // % Breakdown = (Breakdown Time / Planned Production Time) * 100
      const breakdownPercent = plannedMins > 0 
        ? parseFloat(((totalDowntimeMins / plannedMins) * 100).toFixed(2)) 
        : 0;

      // 2. MTTR — Mean Time To Repair (เวลาซ่อมเฉลี่ย)
      // MTTR = Total Breakdown Repair Time / Number of Failures
      const mttrHours = failureCount > 0 ? parseFloat((totalDowntimeHrs / failureCount).toFixed(2)) : 0;
      const mttrMins = failureCount > 0 ? parseFloat((totalDowntimeMins / failureCount).toFixed(1)) : 0;
      
      // Standard MTTR from settings
      const prefix = machine.id.substring(0, 3).toUpperCase();
      const stdMttr = settings.stdMttr[prefix] || 60;
      const mttrVariance = failureCount > 0 ? parseFloat((mttrMins - stdMttr).toFixed(1)) : 0;
      const isMttrOver = mttrMins > stdMttr;

      // 3. MTBF — Mean Time Between Failures (ระยะเวลาเฉลี่ยก่อนเครื่องจักรชำรุด)
      // Operating time = Planned Time - Breakdown Time
      const actualOperatingMins = Math.max(0, plannedMins - totalDowntimeMins);
      const actualOperatingHrs = parseFloat((actualOperatingMins / 60).toFixed(1));
      
      let mtbfHours = 0;
      let mtbfDays = 0;
      if (failureCount === 0) {
        mtbfHours = actualOperatingHrs;
        mtbfDays = parseFloat((actualOperatingHrs / (plannedHours / daysInPeriod)).toFixed(1));
      } else {
        mtbfHours = parseFloat((actualOperatingHrs / failureCount).toFixed(1));
        mtbfDays = parseFloat((mtbfHours / (plannedHours / daysInPeriod)).toFixed(1));
      }

      // Availability (% Uptime)
      // Availability = (MTBF / (MTBF + MTTR)) * 100 = 100% - % Breakdown
      const availabilityPct = plannedMins > 0 
        ? parseFloat(Math.max(0, 100 - breakdownPercent).toFixed(2))
        : 100;

      // 4. Reliability Evaluation Rating
      let reliabilityStatus: 'excellent' | 'normal' | 'warning' | 'critical' = 'excellent';
      if (failureCount === 0) {
        reliabilityStatus = 'excellent';
      } else if (failureCount >= 3 || breakdownPercent >= 5.0 || (isMttrOver && mttrVariance > 30)) {
        reliabilityStatus = 'critical';
      } else if (isMttrOver || breakdownPercent >= 2.0 || mtbfDays < 10) {
        reliabilityStatus = 'warning';
      } else {
        reliabilityStatus = 'normal';
      }

      return {
        machine,
        machinePlannedMonthlyHours,
        plannedHours,
        plannedMins,
        failureCount,
        totalDowntimeMins,
        totalDowntimeHrs,
        breakdownPercent,
        mttrHours,
        mttrMins,
        stdMttr,
        mttrVariance,
        isMttrOver,
        actualOperatingHrs,
        actualOperatingMins,
        mtbfHours,
        mtbfDays,
        availabilityPct,
        reliabilityStatus,
        repairs: machRepairs
      };
    });
  }, [machines, scopedRepairs, defaultPlannedMonthlyHours, periodFactor, daysInPeriod, settings]);

  // Overall Statistics across all machines
  const summaryStats = useMemo(() => {
    const totalCount = machineMetrics.length;
    const withFailures = machineMetrics.filter(m => m.failureCount > 0);
    const zeroBreakdown = machineMetrics.filter(m => m.failureCount === 0);
    const totalBreakdowns = machineMetrics.reduce((sum, m) => sum + m.failureCount, 0);
    const totalDowntimeMins = machineMetrics.reduce((sum, m) => sum + m.totalDowntimeMins, 0);
    const totalDowntimeHrs = parseFloat((totalDowntimeMins / 60).toFixed(2));
    const totalPlannedHours = machineMetrics.reduce((sum, m) => sum + m.plannedHours, 0);
    const totalPlannedMins = totalPlannedHours * 60;

    // 1. Overall % Breakdown
    const systemBreakdownRate = totalPlannedMins > 0
      ? parseFloat(((totalDowntimeMins / totalPlannedMins) * 100).toFixed(2))
      : 0;

    // 2. Overall MTTR
    const avgMttrMins = totalBreakdowns > 0 
      ? parseFloat((totalDowntimeMins / totalBreakdowns).toFixed(1))
      : 0;
    const avgMttrHours = totalBreakdowns > 0 
      ? parseFloat((totalDowntimeHrs / totalBreakdowns).toFixed(2))
      : 0;

    // 3. Overall MTBF
    const totalOperatingHours = Math.max(0, totalPlannedHours - totalDowntimeHrs);
    const avgMtbfHours = totalBreakdowns > 0
      ? parseFloat((totalOperatingHours / totalBreakdowns).toFixed(1))
      : totalCount > 0 ? parseFloat((totalOperatingHours / totalCount).toFixed(1)) : 0;
    const avgMtbfDays = parseFloat((avgMtbfHours / 20).toFixed(1));

    // Overall Availability
    const avgAvailability = parseFloat(Math.max(0, 100 - systemBreakdownRate).toFixed(2));

    // Worst % Breakdown machine
    const worstBreakdown = [...machineMetrics].sort((a, b) => b.breakdownPercent - a.breakdownPercent)[0] || null;

    // Worst MTTR machine
    const worstMttr = [...withFailures].sort((a, b) => b.mttrMins - a.mttrMins)[0] || null;
    
    // Most failures machine
    const mostFailures = [...withFailures].sort((a, b) => b.failureCount - a.failureCount)[0] || null;

    return {
      totalCount,
      withFailuresCount: withFailures.length,
      zeroBreakdownCount: zeroBreakdown.length,
      totalBreakdowns,
      totalDowntimeMins,
      totalDowntimeHrs,
      totalPlannedHours,
      totalPlannedMins,
      systemBreakdownRate,
      avgMttrMins,
      avgMttrHours,
      avgMtbfHours,
      avgMtbfDays,
      avgAvailability,
      worstBreakdown,
      worstMttr,
      mostFailures
    };
  }, [machineMetrics]);

  // Filtered & Sorted Machines
  const filteredMachines = useMemo(() => {
    return machineMetrics.filter(m => {
      // Search
      const matchSearch = 
        m.machine.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.machine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.machine.lineGroup && m.machine.lineGroup.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchSearch) return false;

      // Line filter
      if (selectedLine !== 'all' && m.machine.lineGroup !== selectedLine) {
        return false;
      }

      // Breakdown status
      if (filterFailureStatus === 'breakdown-only' && m.failureCount === 0) return false;
      if (filterFailureStatus === 'zero-breakdown' && m.failureCount > 0) return false;

      return true;
    }).sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (sortField === 'breakdown') {
        valA = a.breakdownPercent;
        valB = b.breakdownPercent;
      } else if (sortField === 'mttr') {
        valA = a.mttrMins;
        valB = b.mttrMins;
      } else if (sortField === 'mtbf') {
        valA = a.mtbfHours;
        valB = b.mtbfHours;
      } else if (sortField === 'planned') {
        valA = a.plannedHours;
        valB = b.plannedHours;
      } else if (sortField === 'downtime') {
        valA = a.totalDowntimeMins;
        valB = b.totalDowntimeMins;
      } else if (sortField === 'availability') {
        valA = a.availabilityPct;
        valB = b.availabilityPct;
      } else {
        valA = a.failureCount;
        valB = b.failureCount;
      }

      if (sortDirection === 'asc') {
        return valA - valB;
      }
      return valB - valA;
    });
  }, [machineMetrics, searchTerm, selectedLine, filterFailureStatus, sortField, sortDirection]);

  // Data for Chart 1: Top 10 machines with highest % Breakdown
  const breakdownChartData = useMemo(() => {
    return [...machineMetrics]
      .filter(m => m.breakdownPercent > 0)
      .sort((a, b) => b.breakdownPercent - a.breakdownPercent)
      .slice(0, 10)
      .map(m => ({
        id: m.machine.id,
        name: m.machine.name.length > 15 ? m.machine.name.substring(0, 15) + '...' : m.machine.name,
        "% Breakdown": m.breakdownPercent,
        "Downtime (ชม.)": m.totalDowntimeHrs,
        "Planned (ชม.)": m.plannedHours
      }));
  }, [machineMetrics]);

  // Data for Chart 2: Top 10 machines with failures for MTTR comparison
  const mttrChartData = useMemo(() => {
    return [...machineMetrics]
      .filter(m => m.failureCount > 0)
      .sort((a, b) => b.mttrMins - a.mttrMins)
      .slice(0, 10)
      .map(m => ({
        id: m.machine.id,
        name: m.machine.name.length > 15 ? m.machine.name.substring(0, 15) + '...' : m.machine.name,
        "MTTR จริง (นาที)": m.mttrMins,
        "MTTR (ชม.)": m.mttrHours,
        "Std. MTTR เป้าหมาย": m.stdMttr,
        overTarget: m.isMttrOver
      }));
  }, [machineMetrics]);

  // Data for Chart 3: MTBF Comparison (Low MTBF = High Risk)
  const mtbfChartData = useMemo(() => {
    return [...machineMetrics]
      .filter(m => m.failureCount > 0)
      .sort((a, b) => a.mtbfHours - b.mtbfHours)
      .slice(0, 10)
      .map(m => ({
        id: m.machine.id,
        name: m.machine.name.length > 15 ? m.machine.name.substring(0, 15) + '...' : m.machine.name,
        "MTBF (ชม.)": m.mtbfHours,
        "MTBF (วัน)": m.mtbfDays,
        "จำนวนครั้งที่เสีย": m.failureCount
      }));
  }, [machineMetrics]);

  // Selected Machine Details for Modal
  const inspectedData = useMemo(() => {
    if (!inspectMachineId) return null;
    return machineMetrics.find(m => m.machine.id === inspectMachineId) || null;
  }, [inspectMachineId, machineMetrics]);

  // Handle Sort Toggle
  const toggleSort = (field: 'breakdown' | 'mttr' | 'mtbf' | 'planned' | 'downtime' | 'failures' | 'availability') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Handle Save Inline Edit of Planned Production Time
  const handleSaveInlineEdit = (machineId: string) => {
    const validHours = Math.max(1, inlineEditHours);
    updateMachinePlannedTime(machineId, validHours);
    setInlineEditMachineId(null);
    showToast(`✅ บันทึก Planned Production Time ของ ${machineId} (${validHours} ชม./เดือน) ลงฐานข้อมูลแล้ว`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" id="machine-reliability-tab-root">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-cyan-500/50 text-cyan-300 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 size={16} className="text-cyan-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. TOP CONTROL BAR & PERIOD SELECTOR */}
      <div className="bg-slate-900/60 border border-slate-800 p-4.5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 px-2 bg-amber-500/10 border border-amber-500/20 rounded-md text-[10px] font-mono font-bold text-amber-400 uppercase">
              TPM – Planned Maintenance (PM Pillar)
            </span>
            <span className="text-xs text-slate-400 font-mono">
              เกณฑ์มาตรฐาน CPRAM & ISO 14224
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-100 tracking-tight mt-1 flex items-center gap-2">
            🏭 ดัชนี % Breakdown, MTTR & MTBF ของแต่ละเครื่องจักร
          </h2>
        </div>

        {/* Period Filter Buttons & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 self-stretch md:self-auto">
          {/* Button to open Batch Planned Production Time Modal */}
          <button
            onClick={() => setIsBatchPlannedModalOpen(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs transition flex items-center gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer"
            title="ปรับ Planned Production Time ของแต่ละเครื่องจักรในฐานข้อมูล MTTR"
          >
            <Sliders size={14} />
            <span>⚙️ ปรับ Planned Production Time</span>
          </button>

          {/* Time Range Pills */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex text-xs">
            <button
              onClick={() => setTimeRange('month')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                timeRange === 'month'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📅 รายเดือน
            </button>
            <button
              onClick={() => setTimeRange('quarter')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                timeRange === 'quarter'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📊 ไตรมาส (3 เดือน)
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                timeRange === 'all'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🌐 ประวัติทั้งหมด
            </button>
          </div>

          {/* Month Selector if month view */}
          {timeRange === 'month' && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => onSelectMonth(e.target.value)}
              className="bg-slate-950 text-cyan-400 font-mono text-xs px-3 py-1.5 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500 cursor-pointer"
            />
          )}
        </div>
      </div>

      {/* 2. INFORMATIVE STANDARD GUIDE BANNER (CPRAM PM PILLAR & ISO 14224) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
        <div 
          className="flex justify-between items-center cursor-pointer select-none"
          onClick={() => setShowFormulaGuide(prev => !prev)}
        >
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">
              <Info size={16} />
            </span>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                มาตรฐานการคำนวณ PM Pillar (PM KPI Calculation Standard)
              </h3>
              <p className="text-[10.5px] text-slate-400">
                สูตรมาตรฐาน JIPM TPM / CPRAM: ทิศทางความสำเร็จคือ <strong className="text-emerald-400">% Breakdown ↓</strong> + <strong className="text-cyan-400">MTTR ↓</strong> + <strong className="text-amber-400">MTBF ↑</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>{showFormulaGuide ? 'ซ่อนสูตรคำนวณ' : 'แสดงสูตรคำนวณ'}</span>
            {showFormulaGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {showFormulaGuide && (
          <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in duration-200">
            {/* Box 1: % Breakdown */}
            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                  <Percent size={13} />
                  1. % Breakdown (Breakdown Time Rate)
                </span>
                <span className="text-[10px] text-rose-300 font-mono bg-rose-500/10 px-1.5 py-0.5 rounded">
                  เป้าหมาย &lt; 2.0%
                </span>
              </div>
              <div className="font-mono text-[11px] text-slate-200 bg-slate-900 p-2 rounded border border-slate-800">
                % Breakdown = (Breakdown Time / Planned Time) × 100
              </div>
              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                ตัวอย่าง: Planned Time = 600 ชม., เครื่องเสีย 12 ชม. → <strong>(12 / 600) × 100 = 2.00%</strong>
              </p>
            </div>

            {/* Box 2: MTTR */}
            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                  <Clock size={13} />
                  2. MTTR (Mean Time To Repair)
                </span>
                <span className="text-[10px] text-cyan-300 font-mono bg-cyan-500/10 px-1.5 py-0.5 rounded">
                  ยิ่งต่ำยิ่งดี
                </span>
              </div>
              <div className="font-mono text-[11px] text-slate-200 bg-slate-900 p-2 rounded border border-slate-800">
                MTTR = Total Breakdown Repair Time / Number of Failures
              </div>
              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                ตัวอย่าง: เสีย 4 ครั้ง รวมเวลาซ่อม 8.0 ชม. → <strong>8 / 4 = 2.0 ชม./ครั้ง (120 นาที)</strong>
              </p>
            </div>

            {/* Box 3: MTBF */}
            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                  <Zap size={13} />
                  3. MTBF (Mean Time Between Failures)
                </span>
                <span className="text-[10px] text-amber-300 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded">
                  ยิ่งสูงยิ่งดี
                </span>
              </div>
              <div className="font-mono text-[11px] text-slate-200 bg-slate-900 p-2 rounded border border-slate-800">
                MTBF = Total Operating Time / Number of Failures
              </div>
              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                Operating = 600 - 12 = 588 ชม. เสีย 4 ครั้ง → <strong>588 / 4 = 147 ชม./ครั้ง (9.2 วัน)</strong>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. SUMMARY METRICS CARDS (THE 3 CORE TPM PM PILLAR METRICS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="reliability-summary-cards">
        
        {/* Card 1: 1. % Breakdown รวมทั้งระบบ (Breakdown Time Rate %) */}
        <div className="bg-slate-800/90 border border-slate-700/80 p-4.5 rounded-2xl relative overflow-hidden group hover:border-rose-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              1. % Breakdown รวมทั้งระบบ
            </span>
            <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-400">
              <Percent size={18} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className={`text-2xl font-black font-mono ${summaryStats.systemBreakdownRate > 2 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {summaryStats.systemBreakdownRate}%
            </span>
            <span className="text-xs text-slate-400 font-sans">Breakdown Time Rate</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>เสียรวม: <strong className="text-rose-300">{summaryStats.totalDowntimeHrs} ชม.</strong></span>
            <span>แผนผลิต: <strong className="text-cyan-300">{summaryStats.totalPlannedHours} ชม.</strong></span>
          </div>
          <p className="text-[9.5px] text-slate-400 mt-1 truncate">
            {summaryStats.worstBreakdown ? (
              <>⚠️ % สูงสุด: <strong className="text-rose-400 font-mono">{summaryStats.worstBreakdown.machine.id}</strong> ({summaryStats.worstBreakdown.breakdownPercent}%)</>
            ) : (
              '✨ ทุกเครื่องจักรไม่มีการหยุดเสีย'
            )}
          </p>
        </div>

        {/* Card 2: 2. MTTR เฉลี่ยทั้งระบบ (Mean Time To Repair) */}
        <div className="bg-slate-800/90 border border-slate-700/80 p-4.5 rounded-2xl relative overflow-hidden group hover:border-cyan-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              2. MTTR เฉลี่ยทั้งระบบ
            </span>
            <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-400">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-cyan-400">
              {summaryStats.avgMttrHours}
            </span>
            <span className="text-xs text-cyan-300 font-sans">ชม./ครั้ง ({summaryStats.avgMttrMins} นาที)</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400">
            <span>เครื่องที่มีประวัติเสีย:</span>
            <span className="font-mono font-bold text-rose-300">{summaryStats.withFailuresCount} เครื่อง</span>
          </div>
          {summaryStats.worstMttr ? (
            <p className="text-[9.5px] text-slate-400 mt-1 truncate">
              ⚠️ MTTR ช้าสุด: <strong className="text-rose-400 font-mono">{summaryStats.worstMttr.machine.id}</strong> ({summaryStats.worstMttr.mttrMins} น.)
            </p>
          ) : (
            <p className="text-[9.5px] text-emerald-400 mt-1 truncate">
              🟢 สมบูรณ์แบบ ไม่มีการชำรุด
            </p>
          )}
        </div>

        {/* Card 3: 3. MTBF เฉลี่ยทั้งระบบ (Mean Time Between Failures) */}
        <div className="bg-slate-800/90 border border-slate-700/80 p-4.5 rounded-2xl relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              3. MTBF เฉลี่ยทั้งระบบ
            </span>
            <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
              <Zap size={18} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-amber-400">
              {summaryStats.avgMtbfHours}
            </span>
            <span className="text-xs text-amber-300 font-sans">ชม./เสีย 1 ครั้ง (~{summaryStats.avgMtbfDays} วัน)</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400">
            <span>ความถี่เสียรวม:</span>
            <span className="font-mono font-bold text-amber-300">{summaryStats.totalBreakdowns} ครั้ง</span>
          </div>
          <p className="text-[9.5px] text-slate-400 mt-1 truncate">
            📈 คำนวณจาก Operating Time / จำนวนครั้งที่เสีย
          </p>
        </div>

        {/* Card 4: Machine Availability Rate */}
        <div className="bg-slate-800/90 border border-slate-700/80 p-4.5 rounded-2xl relative overflow-hidden group hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              อัตราความพร้อมใช้งานเฉลี่ย (Availability)
            </span>
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-emerald-400">
              {summaryStats.avgAvailability}%
            </span>
            <span className="text-xs text-emerald-300 font-sans">Uptime (100% - %BD)</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400">
            <span>เครื่อง Zero-Breakdown:</span>
            <span className="font-mono font-bold text-cyan-300">{summaryStats.zeroBreakdownCount} / {summaryStats.totalCount} เครื่อง</span>
          </div>
          <p className="text-[9.5px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            <CheckCircle2 size={12} /> มาตรฐาน World Class &gt; 95%
          </p>
        </div>

      </div>

      {/* 4. COMPARATIVE VISUAL CHARTS (TABS FOR % BREAKDOWN, MTTR, MTBF) */}
      <div className="bg-slate-850 border border-slate-750/80 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <BarChart3 size={15} className="text-cyan-400" />
              การเปรียบเทียบเชิงวิเคราะห์ความเชื่อมั่น 3 มิติ (Top 10 Machines)
            </h3>
            <p className="text-[10.5px] text-slate-400 mt-0.5">
              เลือกดูกราฟเปรียบเทียบตาม % Breakdown, MTTR หรือ MTBF เพื่อระบุเครื่องจักรที่มีความเสี่ยงสูง
            </p>
          </div>

          {/* Chart selector tabs */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex text-xs">
            <button
              onClick={() => setActiveChartTab('breakdown')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeChartTab === 'breakdown'
                  ? 'bg-rose-500 text-slate-950 font-black shadow-sm shadow-rose-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Percent size={12} />
              <span>1. % Breakdown สูงสุด</span>
            </button>
            <button
              onClick={() => setActiveChartTab('mttr')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeChartTab === 'mttr'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-sm shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock size={12} />
              <span>2. MTTR ช้าสุด</span>
            </button>
            <button
              onClick={() => setActiveChartTab('mtbf')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeChartTab === 'mtbf'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap size={12} />
              <span>3. MTBF เสี่ยงต่ำสุด</span>
            </button>
          </div>
        </div>

        <div className="h-[320px] w-full">
          {activeChartTab === 'breakdown' && (
            breakdownChartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 italic">
                <ShieldCheck size={36} className="text-emerald-500 mb-2 opacity-80" />
                <span>ไม่มีเครื่องจักรที่มี Breakdown ในรอบเวลานี้ (Zero Breakdown สมบูรณ์ 100%)</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breakdownChartData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="id" stroke="#94a3b8" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fill: '#94a3b8' }} unit="%" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: '#334155', 
                      borderRadius: '10px', 
                      color: '#f8fafc', 
                      fontSize: '11px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '6px' }} />
                  <Bar dataKey="% Breakdown" fill="#f43f5e" radius={[4, 4, 0, 0]}>
                    {breakdownChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry['% Breakdown'] > 3 ? '#e11d48' : '#fb7185'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          )}

          {activeChartTab === 'mttr' && (
            mttrChartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 italic">
                <ShieldCheck size={36} className="text-emerald-500 mb-2 opacity-80" />
                <span>ไม่มีประวัติงานซ่อมฉุกเฉินในรอบเวลานี้</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mttrChartData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="id" stroke="#94a3b8" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fill: '#94a3b8' }} unit="น." />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: '#334155', 
                      borderRadius: '10px', 
                      color: '#f8fafc', 
                      fontSize: '11px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '6px' }} />
                  <Bar dataKey="MTTR จริง (นาที)" fill="#06b6d4" radius={[4, 4, 0, 0]}>
                    {mttrChartData.map((entry, index) => (
                      <Cell key={`cell-mttr-${index}`} fill={entry.overTarget ? '#f43f5e' : '#06b6d4'} />
                    ))}
                  </Bar>
                  <Bar dataKey="Std. MTTR เป้าหมาย" fill="#64748b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          )}

          {activeChartTab === 'mtbf' && (
            mtbfChartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 italic">
                <ShieldCheck size={36} className="text-amber-500 mb-2 opacity-80" />
                <span>เครื่องจักรทุกเครื่องทำงานต่อเนื่องสมบูรณ์ ไม่มีเหตุการณ์เสีย</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mtbfChartData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="id" stroke="#94a3b8" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fill: '#94a3b8' }} unit="ชม." />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: '#334155', 
                      borderRadius: '10px', 
                      color: '#f8fafc', 
                      fontSize: '11px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '6px' }} />
                  <Bar dataKey="MTBF (ชม.)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="จำนวนครั้งที่เสีย" fill="#475569" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          )}
        </div>
      </div>

      {/* 5. FILTER CONTROLS FOR TABLE */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหารหัส / ชื่อเครื่องจักร / ไลน์..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-750 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Line Group Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter size={13} className="text-cyan-400" />
            <select
              value={selectedLine}
              onChange={(e) => setSelectedLine(e.target.value)}
              className="bg-slate-950 border border-slate-750 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">ทุกไลน์การผลิต ({machines.length})</option>
              {lineGroups.map(line => (
                <option key={line} value={line}>{line}</option>
              ))}
            </select>
          </div>

          {/* Breakdown Status Filter */}
          <select
            value={filterFailureStatus}
            onChange={(e) => setFilterFailureStatus(e.target.value as any)}
            className="bg-slate-950 border border-slate-750 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="breakdown-only">🚨 มีประวัติชำรุด (Breakdowns &gt; 0)</option>
            <option value="zero-breakdown">✨ ไร้การหยุดเสีย (0 Breakdown)</option>
          </select>

          <span className="text-xs text-slate-400 font-mono pl-1">
            พบ <strong className="text-cyan-400">{filteredMachines.length}</strong> เครื่อง
          </span>
        </div>

      </div>

      {/* 6. COMPREHENSIVE MACHINE MTTR, MTBF & % BREAKDOWN TABLE */}
      <div className="bg-slate-800 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl" id="machine-reliability-table-container">
        <div className="p-4 bg-slate-850/80 border-b border-slate-700/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Layers size={16} className="text-cyan-400" />
              ตาราง TPM PM Pillar รายเครื่องจักร: 1. % Breakdown | 2. MTTR | 3. MTBF | Planned Time
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              สามารถคลิกที่ปุ่มดินสอเพื่อแก้ไข <strong className="text-cyan-300">Planned Production Time</strong> ของแต่ละเครื่องได้โดยตรงในตาราง
            </p>
          </div>

          {/* Action button */}
          <button
            onClick={() => setIsBatchPlannedModalOpen(true)}
            className="px-2.5 py-1 bg-slate-750 hover:bg-cyan-500 hover:text-slate-950 text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Sliders size={13} />
            <span>ปรับ Planned Time ทุกเครื่อง</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-700 text-slate-400 font-semibold uppercase text-[10.5px]">
                <th className="py-3 px-4 text-left">รหัส & ชื่อเครื่องจักร</th>
                <th className="py-3 px-3 text-left">ไลน์ / กลุ่มผลิต</th>
                
                {/* Planned Production Time Column */}
                <th 
                  onClick={() => toggleSort('planned')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-cyan-300 transition select-none bg-cyan-500/5"
                >
                  <div className="flex items-center justify-center gap-1 text-cyan-300">
                    <span>Planned Time</span>
                    <ArrowUpDown size={11} className={sortField === 'planned' ? 'text-cyan-400' : 'opacity-40'} />
                  </div>
                </th>

                {/* Number of Failures */}
                <th 
                  onClick={() => toggleSort('failures')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-cyan-300 transition select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>จำนวนเสีย</span>
                    <ArrowUpDown size={11} className={sortField === 'failures' ? 'text-cyan-400' : 'opacity-40'} />
                  </div>
                </th>

                {/* Total Downtime */}
                <th 
                  onClick={() => toggleSort('downtime')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-cyan-300 transition select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Downtime รวม</span>
                    <ArrowUpDown size={11} className={sortField === 'downtime' ? 'text-cyan-400' : 'opacity-40'} />
                  </div>
                </th>

                {/* 1. % Breakdown Column */}
                <th 
                  onClick={() => toggleSort('breakdown')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-rose-300 transition select-none bg-rose-500/10"
                >
                  <div className="flex items-center justify-center gap-1 text-rose-300 font-black">
                    <span>1. % Breakdown</span>
                    <ArrowUpDown size={11} className={sortField === 'breakdown' ? 'text-rose-400' : 'opacity-40'} />
                  </div>
                </th>

                {/* 2. MTTR Column */}
                <th 
                  onClick={() => toggleSort('mttr')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-cyan-300 transition select-none bg-blue-500/5"
                >
                  <div className="flex items-center justify-center gap-1 text-cyan-300">
                    <span>2. ⏱ MTTR</span>
                    <ArrowUpDown size={11} className={sortField === 'mttr' ? 'text-cyan-400' : 'opacity-40'} />
                  </div>
                </th>

                {/* 3. MTBF Column */}
                <th 
                  onClick={() => toggleSort('mtbf')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-amber-300 transition select-none bg-amber-500/5"
                >
                  <div className="flex items-center justify-center gap-1 text-amber-300">
                    <span>3. ⚡ MTBF</span>
                    <ArrowUpDown size={11} className={sortField === 'mtbf' ? 'text-amber-400' : 'opacity-40'} />
                  </div>
                </th>

                {/* Availability Column */}
                <th 
                  onClick={() => toggleSort('availability')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-emerald-300 transition select-none bg-emerald-500/5"
                >
                  <div className="flex items-center justify-center gap-1 text-emerald-300">
                    <span>Uptime (%)</span>
                    <ArrowUpDown size={11} className={sortField === 'availability' ? 'text-emerald-400' : 'opacity-40'} />
                  </div>
                </th>

                <th className="py-3 px-3 text-center">สถานะความเชื่อมั่น</th>
                <th className="py-3 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40">
              {filteredMachines.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500 italic">
                    ไม่พบเครื่องจักรที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              ) : (
                filteredMachines.map((item) => {
                  const m = item.machine;
                  const isInlineEditing = inlineEditMachineId === m.id;

                  return (
                    <tr 
                      key={m.id} 
                      className="hover:bg-slate-750/30 transition group"
                    >
                      {/* Machine ID and Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-bold text-cyan-400 text-xs bg-slate-950 px-2 py-1 rounded border border-slate-800">
                            {m.id}
                          </span>
                          <div className="min-w-0">
                            <span className="text-slate-100 font-bold block truncate max-w-[180px]" title={m.name}>
                              {m.name}
                            </span>
                            {m.model && (
                              <span className="text-[10px] text-slate-400 block truncate">
                                รุ่น: {m.model}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Line Group */}
                      <td className="py-3 px-3 text-slate-400 text-[11px] truncate max-w-[140px]" title={m.lineGroup}>
                        {m.lineGroup || '-'}
                      </td>

                      {/* Planned Production Time (Editable per machine) */}
                      <td className="py-3 px-3 text-center bg-cyan-500/5">
                        {isInlineEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="1"
                              max="10000"
                              value={inlineEditHours}
                              onChange={(e) => setInlineEditHours(Number(e.target.value))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveInlineEdit(m.id);
                                if (e.key === 'Escape') setInlineEditMachineId(null);
                              }}
                              autoFocus
                              className="w-18 bg-slate-950 border border-cyan-400 text-cyan-300 font-mono font-bold text-xs px-1.5 py-0.5 rounded text-center focus:outline-none"
                            />
                            <button
                              onClick={() => handleSaveInlineEdit(m.id)}
                              className="p-1 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 rounded transition cursor-pointer"
                              title="บันทึก"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={() => setInlineEditMachineId(null)}
                              className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded transition cursor-pointer"
                              title="ยกเลิก"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1 group/edit">
                            <div className="text-center">
                              <span className="font-mono font-bold text-slate-200 block text-xs">
                                {item.plannedHours} ชม.
                              </span>
                              {timeRange !== 'month' && (
                                <span className="text-[9px] text-slate-400 block font-mono">
                                  ({item.machinePlannedMonthlyHours}/ด.)
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                setInlineEditMachineId(m.id);
                                setInlineEditHours(item.machinePlannedMonthlyHours);
                              }}
                              className="opacity-0 group-hover/edit:opacity-100 p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition cursor-pointer"
                              title="คลิกเพื่อปรับ Planned Production Time ของเครื่องนี้"
                            >
                              <Edit3 size={11} />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Failure Count */}
                      <td className="py-3 px-3 text-center">
                        {item.failureCount === 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            0 ครั้ง
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            item.failureCount >= 3 
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse' 
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                          }`}>
                            {item.failureCount} ครั้ง
                          </span>
                        )}
                      </td>

                      {/* Downtime Total */}
                      <td className="py-3 px-3 text-center font-mono">
                        {item.totalDowntimeMins === 0 ? (
                          <span className="text-slate-500 text-[11px]">-</span>
                        ) : (
                          <div>
                            <span className="font-bold text-slate-200">{item.totalDowntimeMins} น.</span>
                            <span className="text-[9.5px] text-slate-400 block">({item.totalDowntimeHrs} ชม.)</span>
                          </div>
                        )}
                      </td>

                      {/* 1. % Breakdown — เปอร์เซ็นต์เวลาที่เครื่องจักรเสีย */}
                      <td className="py-3 px-3 text-center font-mono bg-rose-500/10">
                        {item.breakdownPercent === 0 ? (
                          <span className="text-emerald-400 font-bold text-xs">
                            0.00%
                          </span>
                        ) : (
                          <div>
                            <span className={`text-xs font-black ${
                              item.breakdownPercent > 3.0 ? 'text-rose-400' : item.breakdownPercent > 1.5 ? 'text-amber-400' : 'text-slate-100'
                            }`}>
                              {item.breakdownPercent}%
                            </span>
                            <div className="w-14 bg-slate-900 h-1 rounded-full mt-1 mx-auto overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${item.breakdownPercent > 3.0 ? 'bg-rose-500' : 'bg-amber-400'}`}
                                style={{ width: `${Math.min(100, item.breakdownPercent * 10)}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 2. MTTR (Mean Time to Repair) */}
                      <td className="py-3 px-3 text-center font-mono bg-blue-500/5">
                        {item.failureCount === 0 ? (
                          <span className="text-emerald-400 font-bold text-[10.5px]">0 นาที (สมบูรณ์)</span>
                        ) : (
                          <div>
                            <span className={`text-xs font-black ${item.isMttrOver ? 'text-rose-400' : 'text-cyan-300'}`}>
                              {item.mttrHours} ชม.
                            </span>
                            <span className="text-[9px] text-slate-400 block">
                              ({item.mttrMins} นาที)
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 3. MTBF (Mean Time Between Failures) */}
                      <td className="py-3 px-3 text-center font-mono bg-amber-500/5">
                        {item.failureCount === 0 ? (
                          <div>
                            <span className="text-emerald-400 font-bold text-xs">{item.mtbfHours} ชม.</span>
                            <span className="text-[9px] text-emerald-500 block">ไม่เคยเสีย ({item.mtbfDays} ว.)</span>
                          </div>
                        ) : (
                          <div>
                            <span className={`text-xs font-black ${item.mtbfDays < 10 ? 'text-rose-400' : item.mtbfDays < 20 ? 'text-amber-400' : 'text-slate-200'}`}>
                              {item.mtbfHours} ชม.
                            </span>
                            <span className="text-[9px] text-slate-400 block">
                              (~{item.mtbfDays} วัน)
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Availability Rate */}
                      <td className="py-3 px-3 text-center bg-emerald-500/5">
                        <div className="flex flex-col items-center">
                          <span className={`font-mono font-extrabold text-xs ${item.availabilityPct < 95 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {item.availabilityPct}%
                          </span>
                          <div className="w-14 bg-slate-900 h-1 rounded-full mt-1 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${item.availabilityPct < 95 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                              style={{ width: `${Math.min(100, item.availabilityPct)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Reliability Status Badge */}
                      <td className="py-3 px-3 text-center">
                        {item.reliabilityStatus === 'excellent' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-block">
                            🟢 สมบูรณ์แบบ
                          </span>
                        )}
                        {item.reliabilityStatus === 'normal' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 inline-block">
                            🔵 อยู่ในเกณฑ์ดี
                          </span>
                        )}
                        {item.reliabilityStatus === 'warning' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 inline-block">
                            🟡 เฝ้าระวัง
                          </span>
                        )}
                        {item.reliabilityStatus === 'critical' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 inline-block animate-pulse">
                            🔴 เสี่ยงสูง
                          </span>
                        )}
                      </td>

                      {/* Action: View Breakdown History & Quick Config */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setInspectMachineId(m.id)}
                          className="px-2.5 py-1 bg-slate-700/70 hover:bg-cyan-600 hover:text-slate-950 text-slate-200 rounded-lg text-[10.5px] font-bold transition flex items-center gap-1 mx-auto cursor-pointer"
                          title="ดูประวัติการชำรุดและการซ่อมบำรุงของเครื่องนี้"
                        >
                          <Eye size={12} />
                          <span>ดูประวัติ ({item.failureCount})</span>
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        <div className="p-3.5 bg-slate-900 border-t border-slate-700/80 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-3">
            <span>แสดงทั้งหมด <strong className="text-slate-200 font-mono">{filteredMachines.length}</strong> เครื่อง</span>
            <span className="text-slate-600">|</span>
            <span>เวลารวมเครื่องหยุด: <strong className="text-rose-400 font-mono">{summaryStats.totalDowntimeHrs} ชม.</strong> ({summaryStats.totalDowntimeMins} น.)</span>
            <span className="text-slate-600">|</span>
            <span>เวลาผลิตที่วางแผน: <strong className="text-cyan-400 font-mono">{summaryStats.totalPlannedHours} ชม.</strong></span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> 
              Zero-Breakdown: {summaryStats.zeroBreakdownCount} เครื่อง
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span> 
              Breakdown &gt; 0: {summaryStats.withFailuresCount} เครื่อง
            </span>
          </div>
        </div>

      </div>

      {/* ==================== BATCH PLANNED PRODUCTION TIME MODAL ==================== */}
      <PlannedProductionTimeModal
        isOpen={isBatchPlannedModalOpen}
        onClose={() => setIsBatchPlannedModalOpen(false)}
        machines={machines}
        defaultHours={defaultPlannedMonthlyHours}
        onSaveMachine={(mId, hrs) => updateMachinePlannedTime(mId, hrs)}
        onApplyToAll={(hrs) => updateAllMachinesPlannedTime(hrs)}
        showToast={showToast}
      />

      {/* ==================== MODAL: MACHINE BREAKDOWN AUDIT & DETAILS ==================== */}
      {inspectedData && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
          id="machine-audit-modal-overlay"
          onClick={() => setInspectMachineId(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            id="machine-audit-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-slate-950 to-slate-900 flex justify-between items-start">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400 mt-0.5">
                  <Activity size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-cyan-500/15 text-cyan-300 font-mono font-black text-xs rounded border border-cyan-500/25">
                      {inspectedData.machine.id}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {inspectedData.machine.lineGroup || 'ไม่ระบุไลน์'}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-100 mt-1">
                    {inspectedData.machine.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    รายงานประวัติการหยุดเสียและการคำนวณ % Breakdown, MTTR และ MTBF ในรอบเวลาที่เลือก
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setInspectMachineId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Planned Production Time adjust bar inside Modal */}
            <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Sliders size={14} className="text-cyan-400" />
                <span>Planned Production Time ของเครื่องนี้:</span>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  defaultValue={inspectedData.machinePlannedMonthlyHours}
                  id="inspect-modal-planned-hours"
                  className="w-20 bg-slate-900 border border-slate-700 text-cyan-300 font-mono font-bold text-xs px-2 py-1 rounded text-center focus:outline-none focus:border-cyan-400"
                />
                <span className="text-[11px] text-slate-400">ชม./เดือน</span>
                <button
                  type="button"
                  onClick={() => {
                    const inputEl = document.getElementById('inspect-modal-planned-hours') as HTMLInputElement;
                    if (inputEl) {
                      const val = Number(inputEl.value);
                      if (val > 0) {
                        updateMachinePlannedTime(inspectedData.machine.id, val);
                        showToast(`✅ บันทึก Planned Time ของ ${inspectedData.machine.id} เป็น ${val} ชม./เดือน เรียบร้อย`);
                      }
                    }
                  }}
                  className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded text-xs transition cursor-pointer"
                >
                  บันทึก
                </button>
              </div>

              <div className="text-[11px] text-slate-400 font-mono">
                Planned ประจำรอบนี้: <strong className="text-slate-200">{inspectedData.plannedHours} ชม.</strong>
              </div>
            </div>

            {/* Machine Reliability 4 Metrics Bar inside Modal */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-950/60 border-b border-slate-800 text-xs">
              {/* 1. % Breakdown */}
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">1. % Breakdown</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className={`text-lg font-mono font-black ${inspectedData.breakdownPercent > 2 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {inspectedData.breakdownPercent}%
                  </span>
                  <span className="text-[10px] text-slate-400">({inspectedData.totalDowntimeHrs} ชม.)</span>
                </div>
              </div>

              {/* 2. MTTR */}
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">2. เวลาซ่อมเฉลี่ย (MTTR)</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className={`text-lg font-mono font-black ${inspectedData.isMttrOver ? 'text-rose-400' : 'text-cyan-300'}`}>
                    {inspectedData.mttrHours} ชม.
                  </span>
                  <span className="text-[10px] text-slate-400">({inspectedData.mttrMins} น.)</span>
                </div>
              </div>

              {/* 3. MTBF */}
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">3. รอบเครื่องพร้อมใช้ (MTBF)</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-lg font-mono font-black text-amber-400">
                    {inspectedData.mtbfHours} ชม.
                  </span>
                  <span className="text-[10px] text-slate-400">(~{inspectedData.mtbfDays} ว.)</span>
                </div>
              </div>

              {/* Availability */}
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">ความพร้อมใช้งาน (Uptime)</span>
                <span className="text-lg font-mono font-black text-emerald-400 mt-0.5 block">
                  {inspectedData.availabilityPct}%
                </span>
              </div>
            </div>

            {/* Modal Body: Repair Logs List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Wrench size={14} className="text-rose-400" />
                ประวัติใบงานซ่อมฉุกเฉิน / Breakdown Logs ({inspectedData.repairs.length} รายการ)
              </h4>

              {inspectedData.repairs.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
                  <ShieldCheck size={40} className="text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-200">เครื่องจักรอยู่ในเกณฑ์สมบูรณ์แบบ (Zero Breakdown)</p>
                  <p className="text-xs text-slate-400 mt-1">
                    ไม่มีประวัติการแจ้งซ่อมหรือการหยุดฉุกเฉินในรอบเวลานี้ การบำรุงรักษาเชิงป้องกัน (PM) ดำเนินการได้อย่างมีประสิทธิผล
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {inspectedData.repairs.map((rep: RepairLog, idx: number) => {
                    const isOverStd = rep.duration > inspectedData.stdMttr;
                    return (
                      <div 
                        key={rep.id || idx}
                        className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3 hover:border-slate-700 transition"
                      >
                        {/* Top Metadata */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded font-mono font-bold text-[10px]">
                              เคสซ่อม #{rep.id}
                            </span>
                            <span className="font-mono text-xs text-slate-300">
                              📅 {rep.date}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">เวลาซ่อม:</span>
                            <span className={`px-2.5 py-0.5 rounded-full font-mono font-bold text-xs ${
                              isOverStd 
                                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' 
                                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              ⏱ {rep.duration} นาที ({(rep.duration / 60).toFixed(1)} ชม.) {isOverStd ? `(เกินเป้า ${rep.duration - inspectedData.stdMttr} น.)` : '(อยู่ในเกณฑ์)'}
                            </span>
                          </div>
                        </div>

                        {/* Symptoms & Tech */}
                        <div className="space-y-1">
                          <div className="text-xs text-slate-200">
                            <span className="text-slate-400">🚨 อาการเสีย: </span>
                            <span className="font-medium text-slate-100">{rep.symptoms}</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            <span>ช่างผู้รับผิดชอบ: </span>
                            <span className="text-cyan-400 font-bold">
                              {rep.technicians && rep.technicians.length > 0 ? rep.technicians.join(', ') : rep.technician}
                            </span>
                          </div>
                        </div>

                        {/* 5-Why and Corrective Action */}
                        {(rep.why5 || rep.correctiveAction) && (
                          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            {rep.why5 && (
                              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-850">
                                <span className="text-amber-400 font-bold block">🔍 สาเหตุรากเหง้า (Root Cause Why-5):</span>
                                <p className="text-slate-300 mt-0.5">{rep.why5}</p>
                              </div>
                            )}
                            {rep.correctiveAction && (
                              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-850">
                                <span className="text-emerald-400 font-bold block">🛠 มาตรการแก้ไข & ป้องกัน:</span>
                                <p className="text-slate-300 mt-0.5">{rep.correctiveAction}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Spare Parts */}
                        {rep.usedParts && rep.usedParts.length > 0 && (
                          <div className="pt-1.5 flex items-center gap-1.5 text-[10.5px] text-slate-400">
                            <Package size={12} className="text-cyan-400" />
                            <span>อะไหล่ที่เปลี่ยน: {rep.usedParts.map(p => `${p.partId} (${p.quantity} ชิ้น)`).join(', ')}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
