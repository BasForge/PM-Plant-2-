import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { RepairLog, Machine, getRepairStoppageType } from '../../types';
import { RoomConfig } from '../../types/mtbf';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ReferenceLine,
  Cell
} from 'recharts';
import { 
  Flame, AlertTriangle, TrendingUp, TrendingDown, Layers, 
  BarChart3, Search, Filter, ArrowUpDown, FileSpreadsheet, 
  ChevronRight, Calendar, ShieldAlert, ShieldCheck, Clock, 
  Wrench, Sparkles, ExternalLink, FileText, CheckCircle2, 
  Zap, DollarSign, Activity, Eye, X, ArrowUpRight, Tag, HelpCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface BadActorReportViewProps {
  year: number;
  rooms: RoomConfig[];
  repairs: RepairLog[];
  machines: Machine[];
  onSelectMachineDrillDown?: (machineId: string, repairIds: string[]) => void;
}

export interface ChronicPattern {
  symptomKey: string;
  count: number;
  totalDowntime: number;
  sampleSymptoms: string[];
  sampleParts: string[];
}

export interface BadActorMachineStat {
  machineId: string;
  machineName: string;
  roomName: string;
  ranking: 'A' | 'B' | 'C' | string;
  failureCount: number;
  totalDowntimeMins: number;
  totalDowntimeHours: number;
  totalPartsCost: number;
  partsReplacedCount: number;
  mttrMins: number;
  cumCount: number;
  cumDowntimeMins: number;
  cumCost: number;
  cumDowntimePct: number;
  cumCountPct: number;
  cumCostPct: number;
  isPareto80Downtime: boolean;
  isPareto80Count: boolean;
  bciScore: number; // Bad Actor Criticality Index (0-100)
  bciTier: 'CRITICAL' | 'WATCHLIST' | 'MODERATE';
  repairs: RepairLog[];
  chronicPatterns: ChronicPattern[];
  topSymptom: string;
}

export const BadActorReportView: React.FC<BadActorReportViewProps> = ({
  year,
  rooms,
  repairs,
  machines,
  onSelectMachineDrillDown
}) => {
  const { navigateToKaizen, navigateToRepairs, setActivePage } = useApp();

  // Filters
  const [timeRange, setTimeRange] = useState<'YTD' | 'MONTH' | 'QUARTER' | 'ALL'>('YTD');
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1); // 1..12
  const [selectedQuarter, setSelectedQuarter] = useState<number>(1); // 1..4
  const [selectedRoomId, setSelectedRoomId] = useState<string>('ALL');
  const [stoppageFilter, setStoppageFilter] = useState<'BREAKDOWN_ONLY' | 'ALL_STOPPAGE'>('BREAKDOWN_ONLY');
  const [rankingFilter, setRankingFilter] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'downtime' | 'frequency' | 'cost' | 'bci'>('downtime');

  // Selected Machine modal for local drill down
  const [inspectMachine, setInspectMachine] = useState<BadActorMachineStat | null>(null);

  // Machine to Room lookup
  const machineRoomMap = useMemo(() => {
    const map = new Map<string, string>();
    rooms.forEach(r => {
      r.machines.forEach(m => {
        map.set(m.id.toLowerCase(), r.name);
        if (m.altIds) {
          m.altIds.forEach(alt => map.set(alt.toLowerCase(), r.name));
        }
      });
    });
    return map;
  }, [rooms]);

  // Machine to Registered Machine lookup
  const machineInfoMap = useMemo(() => {
    const map = new Map<string, Machine>();
    machines.forEach(m => {
      map.set(m.id.toLowerCase(), m);
    });
    return map;
  }, [machines]);

  // Filter scoped repairs based on time range and stoppage
  const scopedRepairs = useMemo(() => {
    return repairs.filter(r => {
      if (!r.date) return false;
      const rDate = new Date(r.date);
      const rYear = rDate.getFullYear();
      const rMonth = rDate.getMonth() + 1;

      // Stoppage filter
      if (stoppageFilter === 'BREAKDOWN_ONLY') {
        const stopType = getRepairStoppageType(r);
        if (stopType !== 'BREAKDOWN') return false;
      }

      // Time horizon filter
      if (timeRange === 'YTD') {
        return rYear === year;
      }
      if (timeRange === 'MONTH') {
        return rYear === year && rMonth === selectedMonth;
      }
      if (timeRange === 'QUARTER') {
        if (rYear !== year) return false;
        const q = Math.ceil(rMonth / 3);
        return q === selectedQuarter;
      }
      // ALL
      return true;
    });
  }, [repairs, year, timeRange, selectedMonth, selectedQuarter, stoppageFilter]);

  // Group and compute metrics per machine
  const { allMachineStats, totalDowntimeAll, totalCountAll, totalCostAll } = useMemo(() => {
    const groups: Record<string, RepairLog[]> = {};

    scopedRepairs.forEach(r => {
      const mid = (r.machineId || 'UNKNOWN').trim().toUpperCase();
      if (!groups[mid]) groups[mid] = [];
      groups[mid].push(r);
    });

    let totalDT = 0;
    let totalC = 0;
    let totalK = 0;

    // Helper: Identify chronic patterns / repeated keywords in symptoms
    const extractChronicPatterns = (machRepairs: RepairLog[]): ChronicPattern[] => {
      const keywords = [
        'ซีล', 'รั่ว', 'มอเตอร์', 'เซนเซอร์', 'สายพาน', 'ลูกปืน', 'ปั๊ม', 
        'นิวเมติกส์', 'ลม', 'ไฟ', 'ฮีตเตอร์', 'ใบมีด', 'โซ่', 'สวิตช์', 
        'ขาด', 'ไหม้', 'หลวม', 'ติดขัด', 'สึก', 'แวคคัม', 'ความร้อน', 'วาล์ว'
      ];

      const counts: Record<string, { count: number; dt: number; samples: string[]; parts: string[] }> = {};

      machRepairs.forEach(r => {
        const text = (r.symptoms || '') + ' ' + (r.why1 || '') + ' ' + (r.why5 || '');
        keywords.forEach(kw => {
          if (text.includes(kw)) {
            if (!counts[kw]) counts[kw] = { count: 0, dt: 0, samples: [], parts: [] };
            counts[kw].count += 1;
            counts[kw].dt += r.duration || 0;
            if (counts[kw].samples.length < 2 && r.symptoms) {
              counts[kw].samples.push(r.symptoms);
            }
            if (r.usedParts && r.usedParts.length > 0) {
              r.usedParts.forEach(p => {
                if (p.partName && !counts[kw].parts.includes(p.partName)) {
                  counts[kw].parts.push(p.partName);
                }
              });
            }
          }
        });
      });

      return Object.entries(counts)
        .filter(([_, v]) => v.count >= 2) // repeated at least twice
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 3)
        .map(([k, v]) => ({
          symptomKey: k,
          count: v.count,
          totalDowntime: v.dt,
          sampleSymptoms: v.samples,
          sampleParts: v.parts
        }));
    };

    const rawStats = Object.entries(groups).map(([mid, mRepairs]) => {
      const reg = machineInfoMap.get(mid.toLowerCase());
      const room = machineRoomMap.get(mid.toLowerCase()) || reg?.lineGroup || 'ไม่ระบุห้อง';
      const ranking = reg?.ranking || 'B';

      const count = mRepairs.length;
      const dtMins = mRepairs.reduce((sum, r) => sum + (r.duration || 0), 0);
      const dtHours = parseFloat((dtMins / 60).toFixed(2));
      
      const cost = mRepairs.reduce((sum, r) => {
        const partsCost = (r.usedParts || []).reduce((pSum, p) => pSum + (p.totalCost || p.quantity * p.pricePerUnit || 0), 0);
        return sum + partsCost + (r.otherCost || 0);
      }, 0);

      const partsReplaced = mRepairs.filter(r => (r.usedParts && r.usedParts.length > 0) || r.hasPartsReplaced).length;
      const mttr = count > 0 ? Math.round(dtMins / count) : 0;

      totalDT += dtMins;
      totalC += count;
      totalK += cost;

      const chronic = extractChronicPatterns(mRepairs);
      const topSymptom = mRepairs[0]?.symptoms || 'ไม่ระบุอาการ';

      return {
        machineId: mid,
        machineName: reg?.name || mid,
        roomName: room,
        ranking,
        failureCount: count,
        totalDowntimeMins: dtMins,
        totalDowntimeHours: dtHours,
        totalPartsCost: cost,
        partsReplacedCount: partsReplaced,
        mttrMins: mttr,
        cumCount: 0,
        cumDowntimeMins: 0,
        cumCost: 0,
        cumDowntimePct: 0,
        cumCountPct: 0,
        cumCostPct: 0,
        isPareto80Downtime: false,
        isPareto80Count: false,
        bciScore: 0,
        bciTier: 'MODERATE' as const,
        repairs: mRepairs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        chronicPatterns: chronic,
        topSymptom
      };
    });

    // Find maximums for normalizing BCI score
    const maxDT = Math.max(1, ...rawStats.map(s => s.totalDowntimeMins));
    const maxCount = Math.max(1, ...rawStats.map(s => s.failureCount));
    const maxCost = Math.max(1, ...rawStats.map(s => s.totalPartsCost));

    // Calculate BCI (Bad Actor Criticality Index: 40% Downtime + 35% Frequency + 25% Cost)
    const withScores = rawStats.map(s => {
      const dtScore = (s.totalDowntimeMins / maxDT) * 40;
      const freqScore = (s.failureCount / maxCount) * 35;
      const costScore = (s.totalPartsCost / maxCost) * 25;
      const bci = Math.round(dtScore + freqScore + costScore);

      let tier: 'CRITICAL' | 'WATCHLIST' | 'MODERATE' = 'MODERATE';
      if (bci >= 55 || s.totalDowntimeHours >= 10 || s.failureCount >= 5) {
        tier = 'CRITICAL';
      } else if (bci >= 30 || s.totalDowntimeHours >= 4 || s.failureCount >= 3) {
        tier = 'WATCHLIST';
      }

      return {
        ...s,
        bciScore: bci,
        bciTier: tier
      };
    });

    // Default sort by downtime to calculate Pareto cumulative percentages
    const sortedByDT = [...withScores].sort((a, b) => b.totalDowntimeMins - a.totalDowntimeMins);
    let runDT = 0;
    sortedByDT.forEach(s => {
      runDT += s.totalDowntimeMins;
      s.cumDowntimeMins = runDT;
      s.cumDowntimePct = totalDT > 0 ? parseFloat(((runDT / totalDT) * 100).toFixed(1)) : 0;
      s.isPareto80Downtime = (s.cumDowntimePct - (s.totalDowntimeMins / totalDT * 100)) <= 80;
    });

    // Sort by count for frequency cumulative
    const sortedByCount = [...withScores].sort((a, b) => b.failureCount - a.failureCount);
    let runCount = 0;
    sortedByCount.forEach(s => {
      runCount += s.failureCount;
      s.cumCount = runCount;
      s.cumCountPct = totalC > 0 ? parseFloat(((runCount / totalC) * 100).toFixed(1)) : 0;
      s.isPareto80Count = (s.cumCountPct - (s.failureCount / totalC * 100)) <= 80;
    });

    return {
      allMachineStats: withScores,
      totalDowntimeAll: totalDT,
      totalCountAll: totalC,
      totalCostAll: totalK
    };
  }, [scopedRepairs, machineInfoMap, machineRoomMap]);

  // Apply UI Filters to list
  const filteredMachines = useMemo(() => {
    return allMachineStats.filter(m => {
      // Room
      if (selectedRoomId !== 'ALL' && m.roomName !== selectedRoomId) {
        return false;
      }
      // Ranking
      if (rankingFilter !== 'ALL' && m.ranking !== rankingFilter) {
        return false;
      }
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchId = m.machineId.toLowerCase().includes(q);
        const matchName = m.machineName.toLowerCase().includes(q);
        const matchRoom = m.roomName.toLowerCase().includes(q);
        const matchSymptom = m.topSymptom.toLowerCase().includes(q);
        if (!matchId && !matchName && !matchRoom && !matchSymptom) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'downtime') return b.totalDowntimeMins - a.totalDowntimeMins;
      if (sortBy === 'frequency') return b.failureCount - a.failureCount;
      if (sortBy === 'cost') return b.totalPartsCost - a.totalPartsCost;
      return b.bciScore - a.bciScore;
    });
  }, [allMachineStats, selectedRoomId, rankingFilter, searchTerm, sortBy]);

  // Pareto Chart Data (Top 12 machines for readability)
  const paretoChartData = useMemo(() => {
    const list = [...filteredMachines].slice(0, 12);
    let runningSum = 0;
    const baseTotal = sortBy === 'frequency' 
      ? totalCountAll 
      : sortBy === 'cost' 
      ? totalCostAll 
      : totalDowntimeAll;

    return list.map(m => {
      const val = sortBy === 'frequency' 
        ? m.failureCount 
        : sortBy === 'cost' 
        ? m.totalPartsCost 
        : m.totalDowntimeHours;

      const rawValForSum = sortBy === 'frequency'
        ? m.failureCount
        : sortBy === 'cost'
        ? m.totalPartsCost
        : m.totalDowntimeMins;

      runningSum += rawValForSum;
      const cumPct = baseTotal > 0 ? parseFloat(((runningSum / baseTotal) * 100).toFixed(1)) : 0;

      return {
        id: m.machineId,
        name: m.machineName,
        value: val,
        cumPct,
        bciTier: m.bciTier
      };
    });
  }, [filteredMachines, sortBy, totalCountAll, totalCostAll, totalDowntimeAll]);

  // Executive KPI summary for current view
  const kpiSummary = useMemo(() => {
    const criticalCount = filteredMachines.filter(m => m.bciTier === 'CRITICAL').length;
    const watchlistCount = filteredMachines.filter(m => m.bciTier === 'WATCHLIST').length;
    
    // Top 20% machines impact
    const top20Count = Math.max(1, Math.ceil(filteredMachines.length * 0.2));
    const top20Machines = filteredMachines.slice(0, top20Count);
    const top20Downtime = top20Machines.reduce((sum, m) => sum + m.totalDowntimeMins, 0);
    const top20Cost = top20Machines.reduce((sum, m) => sum + m.totalPartsCost, 0);
    const top20DowntimePct = totalDowntimeAll > 0 ? Math.round((top20Downtime / totalDowntimeAll) * 100) : 0;
    const top20CostPct = totalCostAll > 0 ? Math.round((top20Cost / totalCostAll) * 100) : 0;

    const totalChronicCases = filteredMachines.reduce((sum, m) => sum + m.chronicPatterns.length, 0);

    return {
      criticalCount,
      watchlistCount,
      top20Count,
      top20DowntimePct,
      top20CostPct,
      totalChronicCases
    };
  }, [filteredMachines, totalDowntimeAll, totalCostAll]);

  // Export to Excel
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Bad Actor Ranking
    const rankData = filteredMachines.map((m, idx) => ({
      'อันดับ (Rank)': idx + 1,
      'รหัสเครื่องจักร': m.machineId,
      'ชื่อเครื่องจักร': m.machineName,
      'ห้อง/ไลน์ผลิต': m.roomName,
      'ระดับความสำคัญ (Rank A/B/C)': m.ranking,
      'ความวิกฤต (BCI Tier)': m.bciTier === 'CRITICAL' ? 'วิกฤตสูง (Critical)' : m.bciTier === 'WATCHLIST' ? 'เฝ้าระวังพิเศษ (Watchlist)' : 'ทั่วไป (Moderate)',
      'คะแนน BCI (0-100)': m.bciScore,
      'จำนวนครั้งที่หยุด (ครั้ง)': m.failureCount,
      'เวลาหยุดรวม (นาที)': m.totalDowntimeMins,
      'เวลาหยุดรวม (ชั่วโมง)': m.totalDowntimeHours,
      '% Downtime สะสม (Pareto)': `${m.cumDowntimePct}%`,
      'เวลาซ่อมเฉลี่ย MTTR (นาที)': m.mttrMins,
      'มูลค่าอะไหล่และค่าซ่อม (บาท)': m.totalPartsCost,
      'จำนวนครั้งเปลี่ยนอะไหล่': m.partsReplacedCount,
      'อาการเสียซ้ำซาก (Chronic Issues)': m.chronicPatterns.map(c => `${c.symptomKey} (${c.count} ครั้ง)`).join(', ') || 'ไม่มีปัญหาซ้ำ',
      'อาการเสียล่าสุด': m.topSymptom
    }));
    const wsRank = XLSX.utils.json_to_sheet(rankData);
    XLSX.utils.book_append_sheet(wb, wsRank, 'Bad_Actor_Ranking');

    // Sheet 2: Chronic Failure Analysis
    const chronicData: any[] = [];
    filteredMachines.filter(m => m.chronicPatterns.length > 0).forEach(m => {
      m.chronicPatterns.forEach(c => {
        chronicData.push({
          'รหัสเครื่องจักร': m.machineId,
          'ชื่อเครื่องจักร': m.machineName,
          'ห้อง/ไลน์ผลิต': m.roomName,
          'กลุ่มปัญหาซ้ำซาก': c.symptomKey,
          'เกิดซ้ำ (ครั้ง)': c.count,
          'เวลารวมที่หยุด (นาที)': c.totalDowntime,
          'ตัวอย่างอาการ': c.sampleSymptoms.join(' | '),
          'อะไหล่ที่เกี่ยวข้อง': c.sampleParts.join(', ') || 'ไม่มีบันทึกอะไหล่'
        });
      });
    });
    const wsChronic = XLSX.utils.json_to_sheet(chronicData.length > 0 ? chronicData : [{ 'ผลลัพธ์': 'ไม่พบปัญหาซ้ำซาก' }]);
    XLSX.utils.book_append_sheet(wb, wsChronic, 'Chronic_Failures');

    XLSX.writeFile(wb, `Bad_Actor_Analysis_Report_${year}.xlsx`);
  };

  return (
    <div className="space-y-6" id="bad-actor-report-root">
      {/* 1. HEADER & CONTROL PANEL */}
      <div className="bg-[#0b1325]/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-rose-500/30 text-rose-400 shadow-inner">
              <Flame size={26} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  รายงานวิเคราะห์อัตโนมัติ Bad Actor Report
                </h1>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-300 font-bold border border-rose-800/40">
                  Pareto 80/20 & Chronic Failure Detection
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 font-bold border border-cyan-800/40">
                  Active CMMS Phase 1
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                จำแนกเครื่องจักรวิกฤตที่สร้างผลกระทบ Downtime สูงสุดและเสียซ้ำซากตามหลัก World-Class Reliability Engineering
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Export Excel */}
            <button
              type="button"
              id="btn-export-bad-actor-excel"
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition cursor-pointer"
            >
              <FileSpreadsheet size={15} />
              <span>Export Bad Actor Excel</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-800/80 text-xs">
          {/* 1. Time Horizon */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 flex flex-col justify-between">
            <label className="text-[10px] text-slate-400 font-medium uppercase mb-1 flex items-center gap-1">
              <Calendar size={12} className="text-cyan-400" /> ช่วงเวลาวิเคราะห์
            </label>
            <div className="flex items-center gap-1.5">
              <select
                id="select-bad-actor-time-horizon"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="bg-transparent text-white font-bold focus:outline-none w-full cursor-pointer"
              >
                <option value="YTD" className="bg-slate-900">ปี {year} สะสม (YTD)</option>
                <option value="MONTH" className="bg-slate-900">ระบุเดือน (Monthly)</option>
                <option value="QUARTER" className="bg-slate-900">ระบุไตรมาส (Quarter)</option>
                <option value="ALL" className="bg-slate-900">ข้อมูลทั้งหมด (All Time)</option>
              </select>
            </div>
          </div>

          {/* Sub-selector for Month / Quarter if selected */}
          {timeRange === 'MONTH' && (
            <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 flex flex-col justify-between animate-in fade-in">
              <label className="text-[10px] text-slate-400 font-medium uppercase mb-1">เลือกเดือน ({year})</label>
              <select
                id="select-bad-actor-month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-white font-bold focus:outline-none w-full cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m} className="bg-slate-900">เดือนที่ {m}</option>
                ))}
              </select>
            </div>
          )}

          {timeRange === 'QUARTER' && (
            <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 flex flex-col justify-between animate-in fade-in">
              <label className="text-[10px] text-slate-400 font-medium uppercase mb-1">เลือกไตรมาส ({year})</label>
              <select
                id="select-bad-actor-quarter"
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(Number(e.target.value))}
                className="bg-transparent text-white font-bold focus:outline-none w-full cursor-pointer"
              >
                <option value={1} className="bg-slate-900">Q1 (ม.ค. - มี.ค.)</option>
                <option value={2} className="bg-slate-900">Q2 (เม.ย. - มิ.ย.)</option>
                <option value={3} className="bg-slate-900">Q3 (ก.ค. - ก.ย.)</option>
                <option value={4} className="bg-slate-900">Q4 (ต.ค. - ธ.ค.)</option>
              </select>
            </div>
          )}

          {/* 2. Room/Line */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 flex flex-col justify-between">
            <label className="text-[10px] text-slate-400 font-medium uppercase mb-1 flex items-center gap-1">
              <Layers size={12} className="text-cyan-400" /> ห้อง/ไลน์ผลิต
            </label>
            <select
              id="select-bad-actor-room"
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none w-full cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">ทุกห้องผลิต (8 ห้อง)</option>
              {rooms.map(r => (
                <option key={r.id} value={r.name} className="bg-slate-900">{r.name}</option>
              ))}
            </select>
          </div>

          {/* 3. Stoppage Criteria */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 flex flex-col justify-between">
            <label className="text-[10px] text-slate-400 font-medium uppercase mb-1 flex items-center gap-1">
              <ShieldAlert size={12} className="text-amber-400" /> เกณฑ์การนับ
            </label>
            <select
              id="select-bad-actor-stoppage"
              value={stoppageFilter}
              onChange={(e) => setStoppageFilter(e.target.value as any)}
              className="bg-transparent text-white font-bold focus:outline-none w-full cursor-pointer"
            >
              <option value="BREAKDOWN_ONLY" className="bg-slate-900">เฉพาะ Breakdown (TPM Standard)</option>
              <option value="ALL_STOPPAGE" className="bg-slate-900">ทุกการหยุด (รวม Minor Stoppage)</option>
            </select>
          </div>

          {/* 4. Rank Filter */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 flex flex-col justify-between">
            <label className="text-[10px] text-slate-400 font-medium uppercase mb-1 flex items-center gap-1">
              <Tag size={12} className="text-purple-400" /> ระดับความสำคัญเครื่อง
            </label>
            <select
              id="select-bad-actor-rank"
              value={rankingFilter}
              onChange={(e) => setRankingFilter(e.target.value as any)}
              className="bg-transparent text-white font-bold focus:outline-none w-full cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">ทั้งหมด (Rank A, B, C)</option>
              <option value="A" className="bg-slate-900">Rank A (เครื่องวิกฤตโรงงาน)</option>
              <option value="B" className="bg-slate-900">Rank B (เครื่องสำคัญ)</option>
              <option value="C" className="bg-slate-900">Rank C (เครื่องทั่วไป)</option>
            </select>
          </div>

          {/* 5. Sort By */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 flex flex-col justify-between">
            <label className="text-[10px] text-slate-400 font-medium uppercase mb-1 flex items-center gap-1">
              <ArrowUpDown size={12} className="text-emerald-400" /> เรียงลำดับ Pareto ตาม
            </label>
            <select
              id="select-bad-actor-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-white font-bold focus:outline-none w-full cursor-pointer"
            >
              <option value="downtime" className="bg-slate-900">Total Downtime (เวลานานสุด)</option>
              <option value="frequency" className="bg-slate-900">Frequency (เสียบ่อยที่สุด)</option>
              <option value="cost" className="bg-slate-900">Repair Cost (ค่าใช้จ่ายสูงสุด)</option>
              <option value="bci" className="bg-slate-900">BCI Index (ดัชนีวิกฤตรวม)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE SUMMARY CARDS (PARETO 80/20 HIGHLIGHTS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Critical Bad Actors */}
        <div className="bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-950 border border-rose-800/40 p-5 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-rose-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Critical Bad Actors</span>
            <Flame size={20} className="animate-pulse" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">{kpiSummary.criticalCount}</span>
            <span className="text-xs text-rose-300 font-medium">เครื่องวิกฤตระดับสูง</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            เฝ้าระวังพิเศษ (Watchlist): <strong className="text-amber-300 font-mono">{kpiSummary.watchlistCount}</strong> เครื่อง
          </p>
          <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-5 pointer-events-none">
            <Flame size={80} />
          </div>
        </div>

        {/* Card 2: Pareto 80/20 Downtime Share */}
        <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border border-amber-800/40 p-5 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pareto Loss Share</span>
            <AlertTriangle size={20} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-300 font-mono">{kpiSummary.top20DowntimePct}%</span>
            <span className="text-xs text-slate-300 font-medium">ของ Downtime ทั้งหมด</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            เกิดขึ้นจากเครื่องจักรเพียง <strong className="text-white font-mono">{kpiSummary.top20Count}</strong> เครื่องแรก (Top 20%)
          </p>
          <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-5 pointer-events-none">
            <BarChart3 size={80} />
          </div>
        </div>

        {/* Card 3: Total Downtime in Scope */}
        <div className="bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-950 border border-blue-800/40 p-5 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-blue-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Impact Downtime</span>
            <Clock size={20} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-cyan-300 font-mono">{(totalDowntimeAll / 60).toFixed(1)}</span>
            <span className="text-xs text-slate-300 font-medium">ชม. ({totalDowntimeAll.toLocaleString()} นาที)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            เกิดการหยุดรวม <strong className="text-white font-mono">{totalCountAll}</strong> ครั้ง ในช่วงที่เลือก
          </p>
          <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-5 pointer-events-none">
            <Clock size={80} />
          </div>
        </div>

        {/* Card 4: Chronic Failure Cases */}
        <div className="bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-950 border border-purple-800/40 p-5 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-purple-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Chronic Issue Alert</span>
            <Zap size={20} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-purple-300 font-mono">{kpiSummary.totalChronicCases}</span>
            <span className="text-xs text-slate-300 font-medium">จุดปัญหาซ้ำซาก</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            ตรวจพบอาการเสียเดิมซ้ำตั้งแต่ 2 ครั้งขึ้นไปในเครื่องเดียว
          </p>
          <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-5 pointer-events-none">
            <Zap size={80} />
          </div>
        </div>
      </div>

      {/* 3. PARETO CHART VISUALIZATION */}
      <div className="bg-[#0b1325]/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 size={20} className="text-cyan-400" />
              แผนภูมิพาเรโต (Pareto 80/20 Chart): Top 12 Bad Actor Machines
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              แท่งกราฟ = ค่าความสูญเสีย ({sortBy === 'downtime' ? 'Downtime ชม.' : sortBy === 'frequency' ? 'จำนวนครั้ง' : sortBy === 'cost' ? 'บาท' : 'BCI'}) | เส้นสีส้ม = % สะสม (Cumulative % สะท้อนเส้น 80% Cutoff)
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span> Critical
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-800 text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Watchlist
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-800 text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-500"></span> Moderate
            </span>
          </div>
        </div>

        {/* Chart Viewport */}
        <div className="h-80 w-full pt-2">
          {paretoChartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              ไม่พบข้อมูลบันทึกซ่อมในช่วงเวลาที่เลือก
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={paretoChartData} margin={{ top: 20, right: 30, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey="id" 
                  stroke="#64748b" 
                  tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 'bold' }} 
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                />
                {/* Left Y Axis: Value */}
                <YAxis 
                  yAxisId="left" 
                  stroke="#64748b" 
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  label={{ 
                    value: sortBy === 'downtime' ? 'Downtime (ชม.)' : sortBy === 'frequency' ? 'ครั้ง' : 'มูลค่า (บาท)', 
                    angle: -90, 
                    position: 'insideLeft', 
                    fill: '#94a3b8', 
                    fontSize: 10 
                  }}
                />
                {/* Right Y Axis: Cumulative % */}
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  domain={[0, 100]} 
                  stroke="#f59e0b" 
                  tick={{ fill: '#f59e0b', fontSize: 11 }}
                  label={{ value: '% สะสม (Cumulative %)', angle: 90, position: 'insideRight', fill: '#f59e0b', fontSize: 10 }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '1rem', color: '#fff' }}
                  formatter={(val: any, name: any) => {
                    if (name === 'Cumulative %') return [`${val}%`, 'สะสม %'];
                    return [val, sortBy === 'downtime' ? 'ชม.' : sortBy === 'frequency' ? 'ครั้ง' : 'บาท'];
                  }}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />

                {/* Pareto 80% Reference Line */}
                <ReferenceLine 
                  yAxisId="right" 
                  y={80} 
                  stroke="#ef4444" 
                  strokeDasharray="4 4" 
                  strokeWidth={2}
                  label={{ value: '80% Pareto Cutoff (The Vital Few)', fill: '#ef4444', fontSize: 10, position: 'top' }}
                />

                {/* Bar by Metric */}
                <Bar 
                  yAxisId="left" 
                  dataKey="value" 
                  name={sortBy === 'downtime' ? 'Downtime (ชม.)' : sortBy === 'frequency' ? 'ความถี่ (ครั้ง)' : 'ค่าใช้จ่าย'} 
                  radius={[6, 6, 0, 0]}
                  barSize={32}
                >
                  {paretoChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.bciTier === 'CRITICAL' ? '#f43f5e' : entry.bciTier === 'WATCHLIST' ? '#f59e0b' : '#06b6d4'} 
                    />
                  ))}
                </Bar>

                {/* Cumulative Line */}
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="cumPct" 
                  name="Cumulative %" 
                  stroke="#fbbf24" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#fbbf24' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 4. BAD ACTOR RANKING TABLE & ACTION INTEGRATION */}
      <div className="bg-[#0b1325]/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Flame size={20} className="text-rose-400" />
              ตารางจัดอันดับเครื่องจักร Bad Actor & ระบบสั่งการแก้ไขเชิงรุก (Action Triggers)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              พร้อมปุ่มด่วนเชื่อมโยง: เปิดเคส Why-Why • ทบทวนแผน TBM/PM • ออกใบงาน Work Order • เจาะลึกประวัติซ่อม
            </p>
          </div>

          {/* Quick search inside table */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              id="input-bad-actor-search"
              placeholder="ค้นหาเครื่อง, อาการเสีย..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Table Viewport */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs" id="table-bad-actors">
            <thead className="bg-slate-900/90 text-slate-400 font-bold border-b border-slate-800 uppercase text-[10px]">
              <tr>
                <th className="py-3 px-3 text-center">Rank</th>
                <th className="py-3 px-3">เครื่องจักร (M/C)</th>
                <th className="py-3 px-3">ห้องผลิต</th>
                <th className="py-3 px-3 text-center">ระดับ BCI</th>
                <th className="py-3 px-3 text-center">จำนวนครั้ง</th>
                <th className="py-3 px-3 text-right">Downtime รวม</th>
                <th className="py-3 px-3 text-right">% สะสม</th>
                <th className="py-3 px-3 text-right">MTTR (เฉลี่ย)</th>
                <th className="py-3 px-3">ปัญหาซ้ำซาก (Chronic Issues)</th>
                <th className="py-3 px-3 text-center">เชื่อมโยงแก้ไข (Action)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredMachines.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    ไม่พบข้อมูลเครื่องจักรตามเงื่อนไขที่ค้นหา
                  </td>
                </tr>
              ) : (
                filteredMachines.map((m, idx) => {
                  const isTop3 = idx < 3;
                  return (
                    <tr 
                      key={m.machineId} 
                      className={`hover:bg-slate-800/40 transition ${
                        m.bciTier === 'CRITICAL' ? 'bg-rose-950/15' : m.bciTier === 'WATCHLIST' ? 'bg-amber-950/10' : ''
                      }`}
                    >
                      {/* Rank Index */}
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-mono text-xs font-black ${
                          idx === 0 
                            ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-500/30' 
                            : idx === 1 
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30' 
                            : idx === 2 
                            ? 'bg-yellow-500 text-slate-950' 
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>

                      {/* Machine ID & Name */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-cyan-300 text-xs">{m.machineId}</span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                m.ranking === 'A' ? 'bg-rose-900/60 text-rose-300 border border-rose-700/50' : 'bg-slate-800 text-slate-400'
                              }`}>
                                Rank {m.ranking}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 font-semibold truncate max-w-[180px]">{m.machineName}</p>
                          </div>
                        </div>
                      </td>

                      {/* Room */}
                      <td className="py-3 px-3 text-slate-300 text-[11px] truncate max-w-[130px]">
                        {m.roomName}
                      </td>

                      {/* BCI Tier */}
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.bciTier === 'CRITICAL'
                            ? 'bg-rose-900/60 text-rose-300 border border-rose-600/50'
                            : m.bciTier === 'WATCHLIST'
                            ? 'bg-amber-900/60 text-amber-300 border border-amber-600/50'
                            : 'bg-cyan-950/60 text-cyan-300 border border-cyan-700/40'
                        }`}>
                          {m.bciTier === 'CRITICAL' && <Flame size={10} />}
                          {m.bciTier === 'WATCHLIST' && <AlertTriangle size={10} />}
                          <span>BCI {m.bciScore}</span>
                        </span>
                      </td>

                      {/* Breakdown Count */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-200">
                        {m.failureCount} ครั้ง
                      </td>

                      {/* Total Downtime */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-mono font-black text-rose-300">
                          {m.totalDowntimeHours} ชม.
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ({m.totalDowntimeMins} นาที)
                        </div>
                      </td>

                      {/* Cumulative % */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-mono font-bold text-amber-400">
                          {m.cumDowntimePct}%
                        </div>
                        {m.isPareto80Downtime && (
                          <span className="text-[9px] text-rose-400 block font-semibold">
                            (ในเกณฑ์ 80%)
                          </span>
                        )}
                      </td>

                      {/* MTTR */}
                      <td className="py-3 px-3 text-right font-mono text-slate-300">
                        {m.mttrMins} นาที
                      </td>

                      {/* Chronic Patterns */}
                      <td className="py-3 px-3">
                        {m.chronicPatterns.length > 0 ? (
                          <div className="space-y-1">
                            {m.chronicPatterns.map((c, i) => (
                              <span 
                                key={i} 
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-800 text-[10px] text-rose-300 mr-1 font-semibold"
                                title={`พบคำว่า "${c.symptomKey}" ซ้ำ ${c.count} ครั้ง รวมหยุด ${c.totalDowntime} นาที`}
                              >
                                <Zap size={10} className="text-amber-400" />
                                {c.symptomKey} ({c.count}x)
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px] truncate block max-w-[140px]">
                            {m.topSymptom}
                          </span>
                        )}
                      </td>

                      {/* Action Trigger Buttons */}
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* 1. Open Why-Why Case */}
                          <button
                            type="button"
                            id={`btn-why-why-${m.machineId}`}
                            onClick={() => {
                              navigateToKaizen({
                                category: 'WHY_WHY',
                                machineId: m.machineId,
                                searchQuery: m.chronicPatterns[0]?.symptomKey || m.topSymptom
                              });
                            }}
                            className="p-1.5 rounded-lg bg-purple-950 hover:bg-purple-900 border border-purple-700/60 text-purple-300 transition cursor-pointer"
                            title="เปิดเคสวิเคราะห์ Why-Why สำหรับเครื่องนี้ทันที"
                          >
                            <Sparkles size={13} />
                          </button>

                          {/* 2. Adjust PM / TBM Plan */}
                          <button
                            type="button"
                            id={`btn-tbm-plan-${m.machineId}`}
                            onClick={() => {
                              setActivePage(15); // TBM Matrix Schedule
                            }}
                            className="p-1.5 rounded-lg bg-blue-950 hover:bg-blue-900 border border-blue-700/60 text-blue-300 transition cursor-pointer"
                            title="ไปที่แผน TBM / ปรับรอบการเปลี่ยนชิ้นส่วน"
                          >
                            <Calendar size={13} />
                          </button>

                          {/* 3. Drill down inspect repairs */}
                          <button
                            type="button"
                            id={`btn-drilldown-${m.machineId}`}
                            onClick={() => setInspectMachine(m)}
                            className="p-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 transition cursor-pointer"
                            title="ส่องเจาะลึกประวัติซ่อมทั้งหมดของเครื่องนี้"
                          >
                            <Eye size={13} />
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

      {/* 5. MACHINE DRILL-DOWN MODAL */}
      {inspectMachine && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0b1325] border border-slate-700 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400">
                  <Flame size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-white">
                      เจาะลึกประวัติ Breakdown: {inspectMachine.machineId}
                    </h3>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
                      {inspectMachine.roomName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{inspectMachine.machineName}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectMachine(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-700 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Summary Stats Row */}
              <div className="grid grid-cols-4 gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 text-center font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">จำนวนครั้ง</span>
                  <strong className="text-base text-white">{inspectMachine.failureCount}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">เวลารวม (นาที)</span>
                  <strong className="text-base text-rose-400">{inspectMachine.totalDowntimeMins}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">MTTR เฉลี่ย</span>
                  <strong className="text-base text-cyan-400">{inspectMachine.mttrMins} นาที</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">ค่าอะไหล่รวม</span>
                  <strong className="text-base text-amber-400">{inspectMachine.totalPartsCost.toLocaleString()} ฿</strong>
                </div>
              </div>

              {/* Chronic Alerts banner if any */}
              {inspectMachine.chronicPatterns.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-300">
                    <Zap size={14} className="text-amber-400" />
                    ตรวจพบความผิดปกติซ้ำซาก (Chronic Failures) ในเครื่องนี้:
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-[11px] text-rose-200">
                    {inspectMachine.chronicPatterns.map((c, i) => (
                      <li key={i}>
                        อาการกลุ่ม <strong>"{c.symptomKey}"</strong> เกิดซ้ำ <strong>{c.count} ครั้ง</strong> (Downtime รวม {c.totalDowntime} นาที)
                        {c.sampleParts.length > 0 && (
                          <span className="text-slate-300 block">อะไหล่ที่เกี่ยวข้อง: {c.sampleParts.join(', ')}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Repairs List */}
              <div className="space-y-2">
                <h4 className="font-bold text-white uppercase text-[11px] tracking-wider text-slate-400">
                  รายการประวัติการหยุดซ่อมบำรุง ({inspectMachine.repairs.length} รายการ):
                </h4>
                {inspectMachine.repairs.map((r, i) => (
                  <div key={r.id || i} className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-cyan-400 font-bold">{r.date}</span>
                      <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/40 font-mono font-bold text-[10px]">
                        หยุด {r.duration || 0} นาที
                      </span>
                    </div>
                    <div className="text-slate-200">
                      <strong>อาการเสีย:</strong> {r.symptoms || '-'}
                    </div>
                    {r.why1 && (
                      <div className="text-slate-400 text-[11px]">
                        <strong>สาเหตุ (Why 1):</strong> {r.why1}
                      </div>
                    )}
                    {r.correctiveAction && (
                      <div className="text-emerald-300 text-[11px]">
                        <strong>วิธีแก้ไข:</strong> {r.correctiveAction}
                      </div>
                    )}
                    {r.usedParts && r.usedParts.length > 0 && (
                      <div className="text-amber-300 text-[10px] pt-1 border-t border-slate-800">
                        <strong>อะไหล่ที่เปลี่ยน:</strong> {r.usedParts.map(p => `${p.partName || p.partId} (${p.quantity})`).join(', ')}
                      </div>
                    )}
                    <div className="text-slate-500 text-[10px] flex items-center justify-between pt-1">
                      <span>ช่างผู้ซ่อม: {r.technician || '-'}</span>
                      {r.workOrderNo && <span className="font-mono text-cyan-500">WO: {r.workOrderNo}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  navigateToKaizen({
                    category: 'WHY_WHY',
                    machineId: inspectMachine.machineId,
                    searchQuery: inspectMachine.chronicPatterns[0]?.symptomKey || inspectMachine.topSymptom
                  });
                  setInspectMachine(null);
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-1.5 transition cursor-pointer text-xs"
              >
                <Sparkles size={14} />
                <span>เปิดทำ Why-Why ป้องกันซ้ำ</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectMachine(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition cursor-pointer text-xs"
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
