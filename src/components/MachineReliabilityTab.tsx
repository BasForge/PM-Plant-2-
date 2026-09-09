import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Machine, RepairLog } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts';
import { 
  Activity, ShieldAlert, Zap, Clock, ShieldCheck, CheckCircle2, 
  AlertTriangle, Search, Filter, ArrowUpDown, Eye, Wrench, 
  Package, BarChart3, TrendingUp, TrendingDown, Layers, X, HelpCircle
} from 'lucide-react';

interface MachineReliabilityTabProps {
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
}

export const MachineReliabilityTab: React.FC<MachineReliabilityTabProps> = ({
  selectedMonth,
  onSelectMonth
}) => {
  const { machines, repairs, settings, pmPlans } = useApp();

  // Filter States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLine, setSelectedLine] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'all'>('month');
  const [filterFailureStatus, setFilterFailureStatus] = useState<'all' | 'breakdown-only' | 'zero-breakdown'>('all');
  const [sortField, setSortField] = useState<'mttr' | 'mtbf' | 'downtime' | 'failures' | 'availability'>('failures');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Modal for Machine Breakdown Audit
  const [inspectMachineId, setInspectMachineId] = useState<string | null>(null);

  // Helper: Operating parameters
  const daysInPeriod = timeRange === 'month' ? 30 : timeRange === 'quarter' ? 90 : 365;
  const hoursPerDay = settings.workingHoursPerDay || 16; // Standard 2 shifts (16 hrs)
  const plannedOperatingHours = daysInPeriod * hoursPerDay;
  const plannedOperatingMins = plannedOperatingHours * 60;

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

  // Calculate reliability metrics per machine
  const machineMetrics = useMemo(() => {
    return machines.map(machine => {
      const machRepairs = scopedRepairs.filter(r => r.machineId === machine.id);
      const failureCount = machRepairs.length;
      const totalDowntimeMins = machRepairs.reduce((sum, r) => sum + r.duration, 0);
      const totalDowntimeHrs = parseFloat((totalDowntimeMins / 60).toFixed(1));

      // 1. MTTR (Mean Time to Repair in minutes)
      const mttrMins = failureCount > 0 ? parseFloat((totalDowntimeMins / failureCount).toFixed(1)) : 0;
      
      // Standard MTTR from settings
      const prefix = machine.id.substring(0, 3).toUpperCase();
      const stdMttr = settings.stdMttr[prefix] || 60;
      const mttrVariance = failureCount > 0 ? parseFloat((mttrMins - stdMttr).toFixed(1)) : 0;
      const isMttrOver = mttrMins > stdMttr;

      // 2. MTBF (Mean Time Between Failures)
      // Operating time = Planned Time - Breakdown Time
      const actualOperatingMins = Math.max(0, plannedOperatingMins - totalDowntimeMins);
      const actualOperatingHrs = actualOperatingMins / 60;
      
      let mtbfHours = 0;
      let mtbfDays = 0;
      if (failureCount === 0) {
        mtbfHours = actualOperatingHrs;
        mtbfDays = daysInPeriod;
      } else {
        mtbfHours = parseFloat((actualOperatingHrs / failureCount).toFixed(1));
        mtbfDays = parseFloat((mtbfHours / hoursPerDay).toFixed(1));
      }

      // 3. Availability (% Uptime)
      const availabilityPct = plannedOperatingMins > 0 
        ? parseFloat(((actualOperatingMins / plannedOperatingMins) * 100).toFixed(2))
        : 100;

      // 4. Reliability Evaluation Rating
      let reliabilityStatus: 'excellent' | 'normal' | 'warning' | 'critical' = 'excellent';
      if (failureCount === 0) {
        reliabilityStatus = 'excellent';
      } else if (failureCount >= 3 || (isMttrOver && mttrVariance > 30)) {
        reliabilityStatus = 'critical';
      } else if (isMttrOver || mtbfDays < 10) {
        reliabilityStatus = 'warning';
      } else {
        reliabilityStatus = 'normal';
      }

      return {
        machine,
        failureCount,
        totalDowntimeMins,
        totalDowntimeHrs,
        mttrMins,
        stdMttr,
        mttrVariance,
        isMttrOver,
        mtbfHours,
        mtbfDays,
        availabilityPct,
        reliabilityStatus,
        repairs: machRepairs
      };
    });
  }, [machines, scopedRepairs, plannedOperatingMins, daysInPeriod, hoursPerDay, settings]);

  // Overall Statistics across all machines
  const summaryStats = useMemo(() => {
    const totalCount = machineMetrics.length;
    const withFailures = machineMetrics.filter(m => m.failureCount > 0);
    const zeroBreakdown = machineMetrics.filter(m => m.failureCount === 0);
    const totalBreakdowns = machineMetrics.reduce((sum, m) => sum + m.failureCount, 0);
    const totalDowntimeMins = machineMetrics.reduce((sum, m) => sum + m.totalDowntimeMins, 0);

    const avgMttr = withFailures.length > 0 
      ? parseFloat((withFailures.reduce((sum, m) => sum + m.mttrMins, 0) / withFailures.length).toFixed(1))
      : 0;

    const avgMtbfDays = totalCount > 0
      ? parseFloat((machineMetrics.reduce((sum, m) => sum + m.mtbfDays, 0) / totalCount).toFixed(1))
      : 0;

    const avgAvailability = totalCount > 0
      ? parseFloat((machineMetrics.reduce((sum, m) => sum + m.availabilityPct, 0) / totalCount).toFixed(2))
      : 100;

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
      avgMttr,
      avgMtbfDays,
      avgAvailability,
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

      if (sortField === 'mttr') {
        valA = a.mttrMins;
        valB = b.mttrMins;
      } else if (sortField === 'mtbf') {
        valA = a.mtbfDays;
        valB = b.mtbfDays;
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

  // Data for Charts: Top 10 machines with failures for MTTR comparison
  const mttrChartData = useMemo(() => {
    return [...machineMetrics]
      .filter(m => m.failureCount > 0)
      .sort((a, b) => b.mttrMins - a.mttrMins)
      .slice(0, 10)
      .map(m => ({
        id: m.machine.id,
        name: m.machine.name.length > 15 ? m.machine.name.substring(0, 15) + '...' : m.machine.name,
        "MTTR จริง (นาที)": m.mttrMins,
        "Std. MTTR เป้าหมาย": m.stdMttr,
        overTarget: m.isMttrOver
      }));
  }, [machineMetrics]);

  // Data for Charts: MTBF Comparison
  const mtbfChartData = useMemo(() => {
    return [...machineMetrics]
      .filter(m => m.failureCount > 0)
      .sort((a, b) => a.mtbfDays - b.mtbfDays)
      .slice(0, 10)
      .map(m => ({
        id: m.machine.id,
        name: m.machine.name.length > 15 ? m.machine.name.substring(0, 15) + '...' : m.machine.name,
        "MTBF (วัน)": m.mtbfDays,
        "จำนวนครั้งที่เสีย": m.failureCount
      }));
  }, [machineMetrics]);

  // Selected Machine Details for Modal
  const inspectedData = useMemo(() => {
    if (!inspectMachineId) return null;
    return machineMetrics.find(m => m.machine.id === inspectMachineId) || null;
  }, [inspectMachineId, machineMetrics]);

  const toggleSort = (field: 'mttr' | 'mtbf' | 'downtime' | 'failures' | 'availability') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" id="machine-reliability-tab-root">
      
      {/* 1. TOP CONTROL BAR & PERIOD SELECTOR */}
      <div className="bg-slate-900/60 border border-slate-800 p-4.5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 px-2 bg-amber-500/10 border border-amber-500/20 rounded-md text-[10px] font-mono font-bold text-amber-400 uppercase">
              TPM Reliability Engine
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ความเชื่อมั่นและการบำรุงรักษาเชิงตัวเลข (MTTR / MTBF Per Machine)
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight mt-1 flex items-center gap-2">
            🏭 ดัชนี MTTR & MTBF ของแต่ละเครื่องจักร
          </h2>
        </div>

        {/* Period Filter Buttons & Month Selector */}
        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto">
          {/* Time Range Pills */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex text-xs">
            <button
              onClick={() => setTimeRange('month')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                timeRange === 'month'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📅 รายเดือน
            </button>
            <button
              onClick={() => setTimeRange('quarter')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                timeRange === 'quarter'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📊 ไตรมาส (3 เดือน)
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
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

      {/* 2. SUMMARY METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="reliability-summary-cards">
        
        {/* Card 1: Overall Average MTTR */}
        <div className="bg-slate-800/90 border border-slate-700/80 p-4.5 rounded-2xl relative overflow-hidden group hover:border-rose-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              เวลาซ่อมเฉลี่ยทั้งระบบ (System MTTR)
            </span>
            <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-400">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-rose-400">
              {summaryStats.avgMttr}
            </span>
            <span className="text-xs text-rose-300 font-sans">นาที / ครั้ง</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400">
            <span>เครื่องที่มีประวัติซ่อม:</span>
            <span className="font-mono font-bold text-rose-300">{summaryStats.withFailuresCount} เครื่อง</span>
          </div>
          {summaryStats.worstMttr && (
            <p className="text-[9.5px] text-slate-400 mt-1 truncate">
              ⚠️ MTTR ช้าสุด: <strong className="text-rose-400 font-mono">{summaryStats.worstMttr.machine.id}</strong> ({summaryStats.worstMttr.mttrMins} นาที)
            </p>
          )}
        </div>

        {/* Card 2: Overall Average MTBF */}
        <div className="bg-slate-800/90 border border-slate-700/80 p-4.5 rounded-2xl relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              รอบห่างเครื่องพร้อมใช้ (System MTBF)
            </span>
            <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
              <Zap size={18} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-amber-400">
              {summaryStats.avgMtbfDays}
            </span>
            <span className="text-xs text-amber-300 font-sans">วัน / เสีย 1 ครั้ง</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400">
            <span>ความถี่เสียรวม:</span>
            <span className="font-mono font-bold text-amber-300">{summaryStats.totalBreakdowns} ครั้ง</span>
          </div>
          <p className="text-[9.5px] text-slate-400 mt-1 truncate">
            🕒 คิดจากเกณฑ์เดินเครื่อง {hoursPerDay} ชม./วัน
          </p>
        </div>

        {/* Card 3: Machine Availability Rate */}
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
            <span className="text-xs text-emerald-300 font-sans">Uptime</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400">
            <span>เวลารวมเครื่องหยุดซ่อม:</span>
            <span className="font-mono font-bold text-slate-300">{(summaryStats.totalDowntimeMins / 60).toFixed(1)} ชม.</span>
          </div>
          <p className="text-[9.5px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            <CheckCircle2 size={12} /> เป้าหมายโรงงานระดับ World Class &gt; 95%
          </p>
        </div>

        {/* Card 4: Zero-Breakdown Fleet */}
        <div className="bg-slate-800/90 border border-slate-700/80 p-4.5 rounded-2xl relative overflow-hidden group hover:border-cyan-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              เครื่องจักรไร้การหยุดเสีย (Zero-Breakdown)
            </span>
            <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-400">
              <Activity size={18} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-cyan-400">
              {summaryStats.zeroBreakdownCount}
            </span>
            <span className="text-xs text-slate-400 font-sans">/ {summaryStats.totalCount} เครื่อง</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400">
            <span>อัตราความสมบูรณ์ 100%:</span>
            <span className="font-mono font-bold text-cyan-300">
              {summaryStats.totalCount > 0 ? Math.round((summaryStats.zeroBreakdownCount / summaryStats.totalCount) * 100) : 0}%
            </span>
          </div>
          <p className="text-[9.5px] text-slate-400 mt-1 truncate">
            ✨ เครื่องจักรทำงานได้อย่างราบรื่นต่อเนื่อง
          </p>
        </div>

      </div>

      {/* 3. COMPARATIVE VISUAL CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="reliability-charts-row">
        
        {/* CHART 1: MTTR vs Std. MTTR for Top 10 Machines with Failures */}
        <div className="lg:col-span-6 bg-slate-800 border border-slate-700/80 p-5 rounded-2xl flex flex-col h-[380px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Clock size={15} className="text-rose-400" />
                เปรียบเทียบ MTTR จริง vs Std. MTTR เป้าหมาย (นาที)
              </h3>
              <p className="text-[10.5px] text-slate-400 mt-0.5">
                เปรียบเทียบเวลาซ่อมเฉลี่ยต่อเครื่องเทียบเกณฑ์มาตรฐาน (ต่ำกว่าเกณฑ์ = ซ่อมได้เร็ว)
              </p>
            </div>
          </div>

          <div className="flex-1 w-full min-h-0">
            {mttrChartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 italic">
                <CheckCircle2 size={36} className="text-emerald-500 mb-2 opacity-80" />
                <span>ยอดเยี่ยม! ไม่มีประวัติเครื่องจักรชำรุดในรอบเวลาที่เลือก</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mttrChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="id" 
                    stroke="#94a3b8" 
                    tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fill: '#94a3b8' }} />
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
                  <Bar dataKey="MTTR จริง (นาที)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Std. MTTR เป้าหมาย" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* CHART 2: MTBF (Continuous Operating Days) for Machines */}
        <div className="lg:col-span-6 bg-slate-800 border border-slate-700/80 p-5 rounded-2xl flex flex-col h-[380px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Zap size={15} className="text-amber-400" />
                รอบห่างเครื่องพร้อมใช้ (MTBF วันที่ทำงานต่อเนื่องก่อนเสีย)
              </h3>
              <p className="text-[10.5px] text-slate-400 mt-0.5">
                เครื่องที่มี MTBF ต่ำ หมายถึงเกิดเหตุเสียบ่อย เสถียรภาพต่ำ ต้องปรับปรุงเชิงรุก
              </p>
            </div>
          </div>

          <div className="flex-1 w-full min-h-0">
            {mtbfChartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 italic">
                <ShieldCheck size={36} className="text-cyan-500 mb-2 opacity-80" />
                <span>เครื่องจักรทุกตัวทำงานต่อเนื่องสมบูรณ์ ไม่มีอาการเสียหยุด</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mtbfChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="id" 
                    stroke="#94a3b8" 
                    tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fill: '#94a3b8' }} />
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
                  <Bar dataKey="MTBF (วัน)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="จำนวนครั้งที่เสีย" fill="#64748b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* 4. FILTER CONTROLS FOR TABLE */}
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
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
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

      {/* 5. COMPREHENSIVE MACHINE MTTR & MTBF TABLE */}
      <div className="bg-slate-800 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl" id="machine-reliability-table-container">
        <div className="p-4 bg-slate-850/80 border-b border-slate-700/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Layers size={16} className="text-cyan-400" />
              ตารางรายละเอียด MTTR / MTBF และดัชนีความเชื่อมั่นรายเครื่องจักร
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              คลิกที่หัวตารางเพื่อเรียงลำดับ หรือคลิก "🔍 ดูประวัติ" เพื่อวิเคราะห์สาเหตุเชิงลึกรายเครื่อง
            </p>
          </div>

          {/* Formula Tooltip Helper */}
          <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-750">
            <HelpCircle size={12} className="text-cyan-400" />
            <span>MTTR = รวมเวลาซ่อม/ครั้ง | MTBF = เวลาเดินเครื่อง/ครั้ง</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-700 text-slate-400 font-semibold uppercase text-[10.5px]">
                <th className="py-3 px-4 text-left">รหัส & ชื่อเครื่องจักร</th>
                <th className="py-3 px-3 text-left">ไลน์ / กลุ่มผลิต</th>
                
                <th 
                  onClick={() => toggleSort('failures')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-cyan-300 transition select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>จำนวนเสีย</span>
                    <ArrowUpDown size={11} className={sortField === 'failures' ? 'text-cyan-400' : 'opacity-40'} />
                  </div>
                </th>

                <th 
                  onClick={() => toggleSort('downtime')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-cyan-300 transition select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Downtime รวม</span>
                    <ArrowUpDown size={11} className={sortField === 'downtime' ? 'text-cyan-400' : 'opacity-40'} />
                  </div>
                </th>

                <th 
                  onClick={() => toggleSort('mttr')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-cyan-300 transition select-none bg-rose-500/5"
                >
                  <div className="flex items-center justify-center gap-1 text-rose-300">
                    <span>⏱ MTTR (นาที)</span>
                    <ArrowUpDown size={11} className={sortField === 'mttr' ? 'text-rose-400' : 'opacity-40'} />
                  </div>
                </th>

                <th className="py-3 px-3 text-center">Std. MTTR</th>

                <th 
                  onClick={() => toggleSort('mtbf')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-cyan-300 transition select-none bg-amber-500/5"
                >
                  <div className="flex items-center justify-center gap-1 text-amber-300">
                    <span>⚡ MTBF (วัน)</span>
                    <ArrowUpDown size={11} className={sortField === 'mtbf' ? 'text-amber-400' : 'opacity-40'} />
                  </div>
                </th>

                <th 
                  onClick={() => toggleSort('availability')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-cyan-300 transition select-none bg-emerald-500/5"
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
                  <td colSpan={10} className="py-12 text-center text-slate-500 italic">
                    ไม่พบเครื่องจักรที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              ) : (
                filteredMachines.map((item) => {
                  const m = item.machine;
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
                            <span className="font-bold text-slate-200">{item.totalDowntimeMins} นาที</span>
                            <span className="text-[9.5px] text-slate-400 block">({item.totalDowntimeHrs} ชม.)</span>
                          </div>
                        )}
                      </td>

                      {/* MTTR (Mean Time to Repair) */}
                      <td className="py-3 px-3 text-center font-mono bg-rose-500/5">
                        {item.failureCount === 0 ? (
                          <span className="text-emerald-400 font-bold text-[10.5px]">0 นาที (สมบูรณ์)</span>
                        ) : (
                          <div>
                            <span className={`text-xs font-black ${item.isMttrOver ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {item.mttrMins} นาที
                            </span>
                            <span className={`text-[9px] block ${item.isMttrOver ? 'text-rose-400/80' : 'text-emerald-400/80'}`}>
                              {item.isMttrOver ? `+${item.mttrVariance} น.` : `${item.mttrVariance} น.`}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Std. MTTR */}
                      <td className="py-3 px-3 text-center font-mono text-slate-400 text-xs">
                        {item.stdMttr} นาที
                      </td>

                      {/* MTBF (Mean Time Between Failures) */}
                      <td className="py-3 px-3 text-center font-mono bg-amber-500/5">
                        {item.failureCount === 0 ? (
                          <div>
                            <span className="text-emerald-400 font-bold text-xs">{item.mtbfDays}+ วัน</span>
                            <span className="text-[9px] text-emerald-500 block">ไม่เคยเสีย</span>
                          </div>
                        ) : (
                          <div>
                            <span className={`text-xs font-black ${item.mtbfDays < 10 ? 'text-rose-400' : item.mtbfDays < 20 ? 'text-amber-400' : 'text-slate-200'}`}>
                              {item.mtbfDays} วัน
                            </span>
                            <span className="text-[9px] text-slate-400 block">
                              ({item.mtbfHours} ชม.)
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
                          <div className="w-16 bg-slate-900 h-1 rounded-full mt-1 overflow-hidden">
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
                            🟡 เฝ้าระวัง MTTR
                          </span>
                        )}
                        {item.reliabilityStatus === 'critical' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 inline-block animate-pulse">
                            🔴 เสี่ยงสูงเร่งแก้ไข
                          </span>
                        )}
                      </td>

                      {/* Action: View Breakdown History */}
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
        <div className="p-3 bg-slate-900 border-t border-slate-700/80 flex flex-col sm:flex-row justify-between items-center text-[10.5px] text-slate-400 gap-2">
          <span>
            แสดงผล <strong className="text-slate-200">{filteredMachines.length}</strong> จากทั้งหมด {machines.length} เครื่องจักร
          </span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> 
              MTTR ต่ำกว่าเป้า: {machineMetrics.filter(m => m.failureCount > 0 && !m.isMttrOver).length} เครื่อง
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span> 
              MTTR เกินเป้าหมาย: {machineMetrics.filter(m => m.isMttrOver).length} เครื่อง
            </span>
          </div>
        </div>

      </div>

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
                    รายงานประวัติการหยุดเสียและการคำนวณ MTTR / MTBF ในรอบเวลาที่เลือก
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

            {/* Machine Reliability Summary Bar inside Modal */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-950/60 border-b border-slate-800 text-xs">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">จำนวนครั้งที่ชำรุด</span>
                <span className="text-lg font-mono font-black text-slate-100 mt-0.5 block">
                  {inspectedData.failureCount} ครั้ง
                </span>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">เวลาซ่อมเฉลี่ย (MTTR)</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className={`text-lg font-mono font-black ${inspectedData.isMttrOver ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {inspectedData.mttrMins}
                  </span>
                  <span className="text-[10px] text-slate-400">นาที (เป้า {inspectedData.stdMttr} น.)</span>
                </div>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">รอบเครื่องพร้อมใช้ (MTBF)</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-lg font-mono font-black text-amber-400">
                    {inspectedData.mtbfDays}
                  </span>
                  <span className="text-[10px] text-slate-400">วัน</span>
                </div>
              </div>

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
                              ⏱ {rep.duration} นาที {isOverStd ? `(เกินเป้า ${rep.duration - inspectedData.stdMttr} น.)` : '(อยู่ในเกณฑ์)'}
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

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
              <button
                onClick={() => setInspectMachineId(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
