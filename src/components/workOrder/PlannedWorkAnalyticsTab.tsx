import React, { useMemo } from 'react';
import { WorkOrder } from '../../types';
import { calculatePlannedWorkMetrics } from '../../utils/workOrderUtils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie 
} from 'recharts';
import { 
  CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, Target, 
  ShieldCheck, Clock, Layers, Award, Zap, AlertCircle, Wrench 
} from 'lucide-react';

interface PlannedWorkAnalyticsTabProps {
  workOrders: WorkOrder[];
}

export const PlannedWorkAnalyticsTab: React.FC<PlannedWorkAnalyticsTabProps> = ({ workOrders }) => {
  const metrics = useMemo(() => {
    return calculatePlannedWorkMetrics(workOrders, 85);
  }, [workOrders]);

  // Data for Category Pie Chart
  const pieData = [
    { name: 'Planned Work (งานตามแผน)', value: metrics.plannedCount, color: '#06b6d4' },
    { name: 'Unplanned Breakdown (งานฉุกเฉิน)', value: metrics.unplannedCount, color: '#f43f5e' }
  ];

  // Data for Work Type Bar Chart
  const typeBreakdown = useMemo(() => {
    const pmCount = workOrders.filter(w => w.sourceType === 'PM').length;
    const correctiveCount = workOrders.filter(w => w.sourceType === 'CORRECTIVE').length;
    const improvementCount = workOrders.filter(w => w.sourceType === 'IMPROVEMENT').length;
    const operationCount = workOrders.filter(w => w.sourceType === 'OPERATION').length;
    const breakdownCount = workOrders.filter(w => w.sourceType === 'BREAKDOWN').length;

    return [
      { type: 'PM ตามแผน', count: pmCount, category: 'Planned', fill: '#06b6d4' },
      { type: 'Corrective ซ่อมตามแผน', count: correctiveCount, category: 'Planned', fill: '#3b82f6' },
      { type: 'Kaizen / ปรับปรุง', count: improvementCount, category: 'Planned', fill: '#10b981' },
      { type: 'Routine ประจำกะ', count: operationCount, category: 'Planned', fill: '#8b5cf6' },
      { type: 'Breakdown ฉุกเฉิน', count: breakdownCount, category: 'Unplanned', fill: '#f43f5e' }
    ];
  }, [workOrders]);

  return (
    <div className="space-y-6" id="planned-work-analytics">
      {/* 1. TOP HERO KPI SECTION: % PLANNED WORK RATIO */}
      <div className="bg-gradient-to-br from-[#0c162c] via-[#091124] to-[#060b18] border border-cyan-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
          {/* Left: Headline & Rationale */}
          <div className="space-y-3 max-w-xl text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
              <Award size={14} />
              <span>ดัชนีชี้วัดวินัยการวางแผนงานซ่อมบำรุง (Planning Discipline KPI)</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              อัตราส่วนงานตามแผน % Planned Work Ratio
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              ตามมาตรฐาน <strong>World-Class Maintenance (SMRP / JIPM TPM PM Pillar)</strong> การที่ทีมบำรุงรักษามีสัดส่วนงานตามแผน <strong>≥ 80 - 90%</strong> จะลดการหยุดฉุกเฉินของเครื่องจักรลงได้กว่า 70% และลดต้นทุนการทำงานล่วงเวลา (Overtime) ของช่างลงอย่างมีนัยสำคัญ
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1">
              <span className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border shadow-sm ${
                metrics.statusGrade === 'WORLD_CLASS'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                  : metrics.statusGrade === 'GOOD'
                  ? 'bg-blue-950 text-blue-300 border-blue-500/40'
                  : metrics.statusGrade === 'WARNING'
                  ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                  : 'bg-rose-950 text-rose-300 border-rose-500/40'
              }`}>
                {metrics.statusGrade === 'WORLD_CLASS' && <CheckCircle2 size={14} className="text-emerald-400" />}
                {metrics.statusLabel}
              </span>

              <span className="text-xs text-slate-400 font-medium">
                เป้าหมายมาตรฐานโรงงาน: <strong className="text-white font-mono">≥ {metrics.targetPercent}%</strong>
              </span>
            </div>
          </div>

          {/* Right: Big KPI Radial Gauge / Percent Box */}
          <div className="flex flex-col items-center justify-center p-6 bg-slate-950/80 border border-cyan-500/30 rounded-2xl shadow-xl min-w-[260px] text-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
              % Planned Work ปัจจุบัน
            </span>

            <div className="flex items-baseline justify-center gap-1">
              <span className={`font-mono text-5xl sm:text-6xl font-black tracking-tight ${
                metrics.plannedRatioPercent >= 85
                  ? 'text-cyan-400'
                  : metrics.plannedRatioPercent >= 75
                  ? 'text-blue-400'
                  : 'text-amber-400'
              }`}>
                {metrics.plannedRatioPercent}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-800 h-3 rounded-full mt-3 overflow-hidden p-0.5 border border-slate-700">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-500"
                style={{ width: `${Math.min(100, metrics.plannedRatioPercent)}%` }}
              />
            </div>

            <div className="flex items-center justify-between w-full text-[11px] font-mono text-slate-400 mt-2">
              <span>0%</span>
              <span className="text-amber-400 font-bold">เป้าหมาย 85%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Planned Jobs */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-medium block">จำนวนงานตามแผน (Planned)</span>
            <div className="font-mono text-2xl font-black text-cyan-400 mt-1">
              {metrics.plannedCount} <span className="text-xs font-normal text-slate-400">ใบสั่งงาน</span>
            </div>
            <span className="text-[11px] text-slate-500">
              รวม {metrics.plannedHours} ชั่วโมงงาน
            </span>
          </div>
          <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 text-cyan-400">
            <ShieldCheck size={22} />
          </div>
        </div>

        {/* Unplanned Jobs */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-medium block">งานฉุกเฉินเบรกดาวน์ (Unplanned)</span>
            <div className="font-mono text-2xl font-black text-rose-400 mt-1">
              {metrics.unplannedCount} <span className="text-xs font-normal text-slate-400">ใบสั่งงาน</span>
            </div>
            <span className="text-[11px] text-slate-500">
              สัดส่วน {metrics.unplannedRatioPercent}% (ไม่เกิน 15%)
            </span>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-rose-400">
            <Zap size={22} />
          </div>
        </div>

        {/* Total CMMS Work Orders */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-medium block">ใบสั่งงานทั้งหมด (All WOs)</span>
            <div className="font-mono text-2xl font-black text-white mt-1">
              {metrics.totalCount} <span className="text-xs font-normal text-slate-400">ใบสั่งงาน</span>
            </div>
            <span className="text-[11px] text-emerald-400 font-semibold">
              ✓ 100% ออกจากระบบ CMMS
            </span>
          </div>
          <div className="p-3 bg-slate-800 rounded-2xl border border-slate-700 text-slate-300">
            <Layers size={22} />
          </div>
        </div>

        {/* Total Man-Hours */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-medium block">ชั่วโมงช่างรวม (Man-Hours)</span>
            <div className="font-mono text-2xl font-black text-amber-400 mt-1">
              {metrics.totalHours} <span className="text-xs font-normal text-slate-400">ชม.</span>
            </div>
            <span className="text-[11px] text-slate-500">
              % Planned Hours: {metrics.plannedHoursRatioPercent}%
            </span>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-400">
            <Clock size={22} />
          </div>
        </div>
      </div>

      {/* 3. CHARTS ROW: PIE CHART & BREAKDOWN BY WORK TYPE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Planned vs Unplanned Breakdown */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Target size={16} className="text-cyan-400" />
              <span>สัดส่วน Planned vs Unplanned Work</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              เป้าหมาย ≥ 85%
            </span>
          </div>

          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-400" />
              <span className="text-slate-300">Planned Work ({metrics.plannedCount} งาน / {metrics.plannedRatioPercent}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="text-slate-300">Unplanned ({metrics.unplannedCount} งาน / {metrics.unplannedRatioPercent}%)</span>
            </div>
          </div>
        </div>

        {/* Chart 2: Work Orders by Source Type */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Wrench size={16} className="text-cyan-400" />
              <span>การกระจายตัวของประเภทใบสั่งงาน (Work Type Distribution)</span>
            </h3>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey="type" 
                  stroke="#64748b" 
                  fontSize={11} 
                  angle={-15} 
                  textAnchor="end" 
                />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {typeBreakdown.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="text-[11.5px] text-slate-400 text-center">
            * งานประเภท PM, Corrective, Kaizen และ Routine จัดเป็น <strong>Planned Work</strong> ทั้งหมด
          </div>
        </div>
      </div>

      {/* 4. READINESS FUNNEL & DISCIPLINE POLICY BANNER */}
      <div className="p-5 bg-gradient-to-r from-cyan-950/30 via-slate-900 to-slate-950 border border-cyan-800/40 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck size={18} className="text-cyan-400" />
            <span>กฎเหล็กการบำรุงรักษา: No Work Order - No Work</span>
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
            ทุกงานบำรุงรักษาในโรงงานต้องมี Work Order รองรับเสมอ ช่างไม่รับทำงานนอกระบบ เพื่อให้มั่นใจว่า 1) มีการประเมินความปลอดภัย LOTO 2) มีการจองอะไหล่ในคลังก่อนปล่อยงาน และ 3) ประวัติงานซ่อมและเวลาหยุดเครื่องถูกบันทึกเพื่อวิเคราะห์ MTBF/MTTR 100%
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1.5 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold">
            สถานะวินัย: 100% Compliant
          </span>
        </div>
      </div>
    </div>
  );
};
