import React from 'react';
import { RoomConfig } from '../../types/mtbf';
import { RoomCalculatedMetrics, SumCalculatedMetrics } from '../../types/mtbf';
import { MtbfBarChart } from './MtbfBarChart';
import { ExternalLink } from 'lucide-react';

export interface DrillDownCellParams {
  title: string;
  scopeLabel: string;
  timeLabel: string;
  metricLabel: 'Breakdown (min)' | 'จำนวนครั้ง Breakdown';
  cellValue: number | string;
  repairIds: string[];
  isBaseline?: boolean;
  baselineYear?: number;
  baselineBDMin?: number;
  baselineCount?: number;
}

interface MtbfSumViewProps {
  year: number;
  rooms: RoomConfig[];
  roomMetrics: RoomCalculatedMetrics[];
  sumMetrics: SumCalculatedMetrics;
  onSelectRoom: (roomId: string) => void;
  onDrillDown: (params: DrillDownCellParams) => void;
}

export const MtbfSumView: React.FC<MtbfSumViewProps> = ({
  year,
  rooms,
  roomMetrics,
  sumMetrics,
  onSelectRoom,
  onDrillDown
}) => {
  const yearShort = String(year).slice(-2);
  const baselineYears = [2023, 2024, 2025];

  // 1. Prepare Chart 1 Data: Breakdown (Min)
  const chart1Data = [
    ...baselineYears.map(y => ({
      name: String(y),
      value: sumMetrics.baseline[y]?.totalBD ?? 0
    })),
    {
      name: String(year),
      value: sumMetrics.ytd.breakdownMin
    },
    {
      name: `YTD ${yearShort}`,
      value: sumMetrics.ytd.breakdownMin
    },
    ...sumMetrics.monthly.map(m => ({
      name: m.monthName,
      value: m.hasData ? m.breakdownMin : null
    }))
  ];

  // 2. Prepare Chart 2 Data: จำนวนครั้ง Breakdown
  const chart2Data = [
    ...baselineYears.map(y => ({
      name: String(y),
      value: sumMetrics.baseline[y]?.totalCount ?? 0
    })),
    {
      name: String(year),
      value: sumMetrics.ytd.breakdownCount
    },
    {
      name: `YTD ${yearShort}`,
      value: sumMetrics.ytd.breakdownCount
    },
    ...sumMetrics.monthly.map(m => ({
      name: m.monthName,
      value: m.hasData ? m.breakdownCount : null
    }))
  ];

  // Table header column list
  const tableColumns = [
    '2023',
    '2024',
    '2025',
    String(year),
    `YTD ${year}`,
    ...sumMetrics.monthly.map(m => m.monthName)
  ];

  // Helper to render clickable breakdown drill-down cell
  const renderDrillDownCell = (params: {
    cellKey: string;
    displayVal: string | number;
    count: number;
    title: string;
    scopeLabel: string;
    timeLabel: string;
    metricLabel: 'Breakdown (min)' | 'จำนวนครั้ง Breakdown';
    cellValue: number | string;
    repairIds: string[];
    isBaseline?: boolean;
    baselineYear?: number;
    baselineBDMin?: number;
    baselineCount?: number;
    customClass?: string;
  }) => {
    return (
      <td 
        key={params.cellKey} 
        className={`py-1.5 px-1.5 text-right font-mono ${params.customClass || ''}`}
      >
        <button
          type="button"
          onClick={() => {
            onDrillDown({
              title: params.title,
              scopeLabel: params.scopeLabel,
              timeLabel: params.timeLabel,
              metricLabel: params.metricLabel,
              cellValue: params.cellValue,
              repairIds: params.repairIds,
              isBaseline: params.isBaseline,
              baselineYear: params.baselineYear,
              baselineBDMin: params.baselineBDMin,
              baselineCount: params.baselineCount
            });
          }}
          className="w-full text-right font-mono py-1 px-1.5 rounded transition inline-flex items-center justify-end gap-1 cursor-pointer hover:bg-cyan-500/25 hover:text-white group"
          title={`คลิกเพื่อเปิดดูประวัติงานซ่อม (${params.count} ครั้ง)`}
        >
          <span className="group-hover:underline underline-offset-2">
            {typeof params.displayVal === 'number' ? params.displayVal.toLocaleString() : params.displayVal}
          </span>
          <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 text-cyan-400 shrink-0 transition" />
        </button>
      </td>
    );
  };

  return (
    <div className="space-y-8 select-none" id="mtbf-sum-view-container">
      {/* 2 CHARTS in 2-Column Grid: Breakdown (Min) & จำนวนครั้ง Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* (1) Breakdown (Min) */}
        <MtbfBarChart
          title="Breakdown (Min)"
          data={chart1Data}
          unit="นาที"
          decimalPlaces={0}
          height={280}
          barColor="#00B0F0"
        />

        {/* (2) จำนวนครั้ง Breakdown */}
        <MtbfBarChart
          title="จำนวนครั้ง Breakdown"
          data={chart2Data}
          unit="ครั้ง"
          decimalPlaces={0}
          height={280}
          barColor="#00B0F0"
        />
      </div>

      {/* TABLE 1: ตาราง Breakdown สะสม */}
      <div className="bg-[#0b1325]/90 border border-slate-800 rounded-2xl p-5 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">ตาราง Breakdown สะสม</h3>
          </div>
          <span className="text-xs text-slate-400">หน่วย: นาที / จำนวนครั้ง</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-300 border-b border-slate-700">
                <th className="py-2.5 px-3 min-w-[150px] font-bold sticky left-0 bg-slate-900 z-10">หมวดหมู่ / ห้อง</th>
                {tableColumns.map((col, idx) => (
                  <th key={col} className={`py-2.5 px-2 text-right font-mono min-w-[70px] ${idx >= 3 && idx <= 4 ? 'text-cyan-300 font-bold bg-cyan-950/20' : ''}`}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Part 1: Breakdown (min) Total Row */}
              <tr className="bg-cyan-500/10 text-cyan-300 font-bold border-b border-slate-800">
                <td className="py-2.5 px-3 sticky left-0 bg-[#0b192e] z-10">Breakdown (min) รวม</td>
                {/* 2023 */}
                {renderDrillDownCell({
                  cellKey: 'bd-sum-2023',
                  displayVal: sumMetrics.baseline[2023]?.totalBD ?? 0,
                  count: sumMetrics.baseline[2023]?.totalCount ?? 0,
                  title: 'Breakdown (min) รวม - ปี 2023',
                  scopeLabel: 'รวมทุกห้อง',
                  timeLabel: 'ปี 2023',
                  metricLabel: 'Breakdown (min)',
                  cellValue: sumMetrics.baseline[2023]?.totalBD ?? 0,
                  repairIds: sumMetrics.baseline[2023]?.totalRepairIds || [],
                  isBaseline: true,
                  baselineYear: 2023,
                  baselineBDMin: sumMetrics.baseline[2023]?.totalBD,
                  baselineCount: sumMetrics.baseline[2023]?.totalCount
                })}
                {/* 2024 */}
                {renderDrillDownCell({
                  cellKey: 'bd-sum-2024',
                  displayVal: sumMetrics.baseline[2024]?.totalBD ?? 0,
                  count: sumMetrics.baseline[2024]?.totalCount ?? 0,
                  title: 'Breakdown (min) รวม - ปี 2024',
                  scopeLabel: 'รวมทุกห้อง',
                  timeLabel: 'ปี 2024',
                  metricLabel: 'Breakdown (min)',
                  cellValue: sumMetrics.baseline[2024]?.totalBD ?? 0,
                  repairIds: sumMetrics.baseline[2024]?.totalRepairIds || [],
                  isBaseline: true,
                  baselineYear: 2024,
                  baselineBDMin: sumMetrics.baseline[2024]?.totalBD,
                  baselineCount: sumMetrics.baseline[2024]?.totalCount
                })}
                {/* 2025 */}
                {renderDrillDownCell({
                  cellKey: 'bd-sum-2025',
                  displayVal: sumMetrics.baseline[2025]?.totalBD ?? 0,
                  count: sumMetrics.baseline[2025]?.totalCount ?? 0,
                  title: 'Breakdown (min) รวม - ปี 2025',
                  scopeLabel: 'รวมทุกห้อง',
                  timeLabel: 'ปี 2025',
                  metricLabel: 'Breakdown (min)',
                  cellValue: sumMetrics.baseline[2025]?.totalBD ?? 0,
                  repairIds: sumMetrics.baseline[2025]?.totalRepairIds || [],
                  isBaseline: true,
                  baselineYear: 2025,
                  baselineBDMin: sumMetrics.baseline[2025]?.totalBD,
                  baselineCount: sumMetrics.baseline[2025]?.totalCount
                })}
                {/* Selected Year Total */}
                {renderDrillDownCell({
                  cellKey: `bd-sum-${year}`,
                  displayVal: sumMetrics.ytd.breakdownMin,
                  count: sumMetrics.ytd.breakdownCount,
                  title: `Breakdown (min) รวม - ปี ${year}`,
                  scopeLabel: 'รวมทุกห้อง',
                  timeLabel: `ปี ${year}`,
                  metricLabel: 'Breakdown (min)',
                  cellValue: sumMetrics.ytd.breakdownMin,
                  repairIds: sumMetrics.ytd.repairIds || [],
                  customClass: 'text-cyan-200 bg-cyan-950/40'
                })}
                {/* YTD Total */}
                {renderDrillDownCell({
                  cellKey: `bd-sum-ytd-${year}`,
                  displayVal: sumMetrics.ytd.breakdownMin,
                  count: sumMetrics.ytd.breakdownCount,
                  title: `Breakdown (min) รวม - YTD ${year}`,
                  scopeLabel: 'รวมทุกห้อง',
                  timeLabel: `YTD ${year}`,
                  metricLabel: 'Breakdown (min)',
                  cellValue: sumMetrics.ytd.breakdownMin,
                  repairIds: sumMetrics.ytd.repairIds || [],
                  customClass: 'text-cyan-200 bg-cyan-950/40'
                })}
                {/* 12 Months */}
                {sumMetrics.monthly.map(m => renderDrillDownCell({
                  cellKey: `bd-sum-m-${m.monthIndex}`,
                  displayVal: m.hasData ? m.breakdownMin : '-',
                  count: m.breakdownCount,
                  title: `Breakdown (min) รวม - ${m.monthName}`,
                  scopeLabel: 'รวมทุกห้อง',
                  timeLabel: m.monthName,
                  metricLabel: 'Breakdown (min)',
                  cellValue: m.breakdownMin,
                  repairIds: m.repairIds || []
                }))}
              </tr>

              {/* 8 Rooms Breakdown */}
              {rooms.map((rm, rIdx) => {
                const metric = roomMetrics.find(r => r.roomId === rm.id);
                const b23 = sumMetrics.baseline[2023]?.breakdownMin[rIdx] ?? 0;
                const c23 = sumMetrics.baseline[2023]?.count[rIdx] ?? 0;
                const b24 = sumMetrics.baseline[2024]?.breakdownMin[rIdx] ?? 0;
                const c24 = sumMetrics.baseline[2024]?.count[rIdx] ?? 0;
                const b25 = sumMetrics.baseline[2025]?.breakdownMin[rIdx] ?? 0;
                const c25 = sumMetrics.baseline[2025]?.count[rIdx] ?? 0;
                const bYtd = metric ? metric.ytd.breakdownMin : 0;
                const cYtd = metric ? metric.ytd.breakdownCount : 0;

                return (
                  <tr key={`bd-room-${rm.id}`} className="border-b border-slate-800/60 hover:bg-slate-800/40 transition">
                    <td className="py-2 px-3 sticky left-0 bg-[#0b1325] z-10">
                      <button
                        type="button"
                        onClick={() => onSelectRoom(rm.id)}
                        className="text-slate-300 hover:text-cyan-400 font-medium flex items-center gap-1.5 transition text-left cursor-pointer"
                      >
                        <span>{rm.name}</span>
                        <ExternalLink size={11} className="opacity-40 hover:opacity-100" />
                      </button>
                    </td>
                    {/* Room 2023 */}
                    {renderDrillDownCell({
                      cellKey: `bd-r-${rm.id}-2023`,
                      displayVal: b23,
                      count: c23,
                      title: `${rm.name} - Breakdown (min) ปี 2023`,
                      scopeLabel: rm.name,
                      timeLabel: 'ปี 2023',
                      metricLabel: 'Breakdown (min)',
                      cellValue: b23,
                      repairIds: sumMetrics.baseline[2023]?.repairIdsByRoom?.[rIdx] || [],
                      isBaseline: true,
                      baselineYear: 2023,
                      baselineBDMin: b23,
                      baselineCount: c23,
                      customClass: 'text-slate-400'
                    })}
                    {/* Room 2024 */}
                    {renderDrillDownCell({
                      cellKey: `bd-r-${rm.id}-2024`,
                      displayVal: b24,
                      count: c24,
                      title: `${rm.name} - Breakdown (min) ปี 2024`,
                      scopeLabel: rm.name,
                      timeLabel: 'ปี 2024',
                      metricLabel: 'Breakdown (min)',
                      cellValue: b24,
                      repairIds: sumMetrics.baseline[2024]?.repairIdsByRoom?.[rIdx] || [],
                      isBaseline: true,
                      baselineYear: 2024,
                      baselineBDMin: b24,
                      baselineCount: c24,
                      customClass: 'text-slate-400'
                    })}
                    {/* Room 2025 */}
                    {renderDrillDownCell({
                      cellKey: `bd-r-${rm.id}-2025`,
                      displayVal: b25,
                      count: c25,
                      title: `${rm.name} - Breakdown (min) ปี 2025`,
                      scopeLabel: rm.name,
                      timeLabel: 'ปี 2025',
                      metricLabel: 'Breakdown (min)',
                      cellValue: b25,
                      repairIds: sumMetrics.baseline[2025]?.repairIdsByRoom?.[rIdx] || [],
                      isBaseline: true,
                      baselineYear: 2025,
                      baselineBDMin: b25,
                      baselineCount: c25,
                      customClass: 'text-slate-400'
                    })}
                    {/* Room Selected Year */}
                    {renderDrillDownCell({
                      cellKey: `bd-r-${rm.id}-${year}`,
                      displayVal: bYtd,
                      count: cYtd,
                      title: `${rm.name} - Breakdown (min) ปี ${year}`,
                      scopeLabel: rm.name,
                      timeLabel: `ปี ${year}`,
                      metricLabel: 'Breakdown (min)',
                      cellValue: bYtd,
                      repairIds: metric?.ytd.repairIds || [],
                      customClass: 'text-cyan-300 bg-cyan-950/20'
                    })}
                    {/* Room YTD */}
                    {renderDrillDownCell({
                      cellKey: `bd-r-${rm.id}-ytd`,
                      displayVal: bYtd,
                      count: cYtd,
                      title: `${rm.name} - Breakdown (min) YTD ${year}`,
                      scopeLabel: rm.name,
                      timeLabel: `YTD ${year}`,
                      metricLabel: 'Breakdown (min)',
                      cellValue: bYtd,
                      repairIds: metric?.ytd.repairIds || [],
                      customClass: 'text-cyan-300 bg-cyan-950/20'
                    })}
                    {/* Room Monthly */}
                    {metric?.monthly.map(m => renderDrillDownCell({
                      cellKey: `bd-r-${rm.id}-${m.monthIndex}`,
                      displayVal: m.hasData ? m.breakdownMin : '-',
                      count: m.breakdownCount,
                      title: `${rm.name} - Breakdown (min) ${m.monthName}`,
                      scopeLabel: rm.name,
                      timeLabel: m.monthName,
                      metricLabel: 'Breakdown (min)',
                      cellValue: m.breakdownMin,
                      repairIds: m.repairIds || [],
                      customClass: 'text-slate-300'
                    }))}
                  </tr>
                );
              })}

              {/* Part 2: จำนวนครั้ง Breakdown Total Row */}
              <tr className="bg-blue-500/10 text-blue-300 font-bold border-t-2 border-b border-slate-700">
                <td className="py-2.5 px-3 sticky left-0 bg-[#0c1830] z-10">จำนวนครั้ง Breakdown รวม</td>
                {/* 2023 */}
                {renderDrillDownCell({
                  cellKey: 'cnt-sum-2023',
                  displayVal: sumMetrics.baseline[2023]?.totalCount ?? 0,
                  count: sumMetrics.baseline[2023]?.totalCount ?? 0,
                  title: 'จำนวนครั้ง Breakdown รวม - ปี 2023',
                  scopeLabel: 'รวมทุกห้อง',
                  timeLabel: 'ปี 2023',
                  metricLabel: 'จำนวนครั้ง Breakdown',
                  cellValue: sumMetrics.baseline[2023]?.totalCount ?? 0,
                  repairIds: sumMetrics.baseline[2023]?.totalRepairIds || [],
                  isBaseline: true,
                  baselineYear: 2023,
                  baselineBDMin: sumMetrics.baseline[2023]?.totalBD,
                  baselineCount: sumMetrics.baseline[2023]?.totalCount
                })}
                {/* 2024 */}
                {renderDrillDownCell({
                  cellKey: 'cnt-sum-2024',
                  displayVal: sumMetrics.baseline[2024]?.totalCount ?? 0,
                  count: sumMetrics.baseline[2024]?.totalCount ?? 0,
                  title: 'จำนวนครั้ง Breakdown รวม - ปี 2024',
                  scopeLabel: 'รวมทุกห้อง',
                  timeLabel: 'ปี 2024',
                  metricLabel: 'จำนวนครั้ง Breakdown',
                  cellValue: sumMetrics.baseline[2024]?.totalCount ?? 0,
                  repairIds: sumMetrics.baseline[2024]?.totalRepairIds || [],
                  isBaseline: true,
                  baselineYear: 2024,
                  baselineBDMin: sumMetrics.baseline[2024]?.totalBD,
                  baselineCount: sumMetrics.baseline[2024]?.totalCount
                })}
                {/* 2025 */}
                {renderDrillDownCell({
                  cellKey: 'cnt-sum-2025',
                  displayVal: sumMetrics.baseline[2025]?.totalCount ?? 0,
                  count: sumMetrics.baseline[2025]?.totalCount ?? 0,
                  title: 'จำนวนครั้ง Breakdown รวม - ปี 2025',
                  scopeLabel: 'รวมทุกห้อง',
                  timeLabel: 'ปี 2025',
                  metricLabel: 'จำนวนครั้ง Breakdown',
                  cellValue: sumMetrics.baseline[2025]?.totalCount ?? 0,
                  repairIds: sumMetrics.baseline[2025]?.totalRepairIds || [],
                  isBaseline: true,
                  baselineYear: 2025,
                  baselineBDMin: sumMetrics.baseline[2025]?.totalBD,
                  baselineCount: sumMetrics.baseline[2025]?.totalCount
                })}
                {/* Selected Year Total */}
                {renderDrillDownCell({
                  cellKey: `cnt-sum-${year}`,
                  displayVal: sumMetrics.ytd.breakdownCount,
                  count: sumMetrics.ytd.breakdownCount,
                  title: `จำนวนครั้ง Breakdown รวม - ปี ${year}`,
                  scopeLabel: 'รวมทุกห้อง',
                  timeLabel: `ปี ${year}`,
                  metricLabel: 'จำนวนครั้ง Breakdown',
                  cellValue: sumMetrics.ytd.breakdownCount,
                  repairIds: sumMetrics.ytd.repairIds || [],
                  customClass: 'text-blue-200 bg-blue-950/40'
                })}
                {/* YTD Total */}
                {renderDrillDownCell({
                  cellKey: `cnt-sum-ytd-${year}`,
                  displayVal: sumMetrics.ytd.breakdownCount,
                  count: sumMetrics.ytd.breakdownCount,
                  title: `จำนวนครั้ง Breakdown รวม - YTD ${year}`,
                  scopeLabel: 'รวมทุกห้อง',
                  timeLabel: `YTD ${year}`,
                  metricLabel: 'จำนวนครั้ง Breakdown',
                  cellValue: sumMetrics.ytd.breakdownCount,
                  repairIds: sumMetrics.ytd.repairIds || [],
                  customClass: 'text-blue-200 bg-blue-950/40'
                })}
                {/* 12 Months */}
                {sumMetrics.monthly.map(m => renderDrillDownCell({
                  cellKey: `cnt-sum-m-${m.monthIndex}`,
                  displayVal: m.hasData ? m.breakdownCount : '-',
                  count: m.breakdownCount,
                  title: `จำนวนครั้ง Breakdown รวม - ${m.monthName}`,
                  scopeLabel: 'รวมทุกห้อง',
                  timeLabel: m.monthName,
                  metricLabel: 'จำนวนครั้ง Breakdown',
                  cellValue: m.breakdownCount,
                  repairIds: m.repairIds || []
                }))}
              </tr>

              {/* 8 Rooms Counts */}
              {rooms.map((rm, rIdx) => {
                const metric = roomMetrics.find(r => r.roomId === rm.id);
                const c23 = sumMetrics.baseline[2023]?.count[rIdx] ?? 0;
                const b23 = sumMetrics.baseline[2023]?.breakdownMin[rIdx] ?? 0;
                const c24 = sumMetrics.baseline[2024]?.count[rIdx] ?? 0;
                const b24 = sumMetrics.baseline[2024]?.breakdownMin[rIdx] ?? 0;
                const c25 = sumMetrics.baseline[2025]?.count[rIdx] ?? 0;
                const b25 = sumMetrics.baseline[2025]?.breakdownMin[rIdx] ?? 0;
                const cYtd = metric ? metric.ytd.breakdownCount : 0;

                return (
                  <tr key={`cnt-room-${rm.id}`} className="border-b border-slate-800/60 hover:bg-slate-800/40 transition">
                    <td className="py-2 px-3 sticky left-0 bg-[#0b1325] z-10">
                      <button
                        type="button"
                        onClick={() => onSelectRoom(rm.id)}
                        className="text-slate-300 hover:text-cyan-400 font-medium flex items-center gap-1.5 transition text-left cursor-pointer"
                      >
                        <span>{rm.name}</span>
                        <ExternalLink size={11} className="opacity-40 hover:opacity-100" />
                      </button>
                    </td>
                    {/* Room 2023 */}
                    {renderDrillDownCell({
                      cellKey: `cnt-r-${rm.id}-2023`,
                      displayVal: c23,
                      count: c23,
                      title: `${rm.name} - จำนวนครั้ง Breakdown ปี 2023`,
                      scopeLabel: rm.name,
                      timeLabel: 'ปี 2023',
                      metricLabel: 'จำนวนครั้ง Breakdown',
                      cellValue: c23,
                      repairIds: sumMetrics.baseline[2023]?.repairIdsByRoom?.[rIdx] || [],
                      isBaseline: true,
                      baselineYear: 2023,
                      baselineBDMin: b23,
                      baselineCount: c23,
                      customClass: 'text-slate-400'
                    })}
                    {/* Room 2024 */}
                    {renderDrillDownCell({
                      cellKey: `cnt-r-${rm.id}-2024`,
                      displayVal: c24,
                      count: c24,
                      title: `${rm.name} - จำนวนครั้ง Breakdown ปี 2024`,
                      scopeLabel: rm.name,
                      timeLabel: 'ปี 2024',
                      metricLabel: 'จำนวนครั้ง Breakdown',
                      cellValue: c24,
                      repairIds: sumMetrics.baseline[2024]?.repairIdsByRoom?.[rIdx] || [],
                      isBaseline: true,
                      baselineYear: 2024,
                      baselineBDMin: b24,
                      baselineCount: c24,
                      customClass: 'text-slate-400'
                    })}
                    {/* Room 2025 */}
                    {renderDrillDownCell({
                      cellKey: `cnt-r-${rm.id}-2025`,
                      displayVal: c25,
                      count: c25,
                      title: `${rm.name} - จำนวนครั้ง Breakdown ปี 2025`,
                      scopeLabel: rm.name,
                      timeLabel: 'ปี 2025',
                      metricLabel: 'จำนวนครั้ง Breakdown',
                      cellValue: c25,
                      repairIds: sumMetrics.baseline[2025]?.repairIdsByRoom?.[rIdx] || [],
                      isBaseline: true,
                      baselineYear: 2025,
                      baselineBDMin: b25,
                      baselineCount: c25,
                      customClass: 'text-slate-400'
                    })}
                    {/* Room Selected Year */}
                    {renderDrillDownCell({
                      cellKey: `cnt-r-${rm.id}-${year}`,
                      displayVal: cYtd,
                      count: cYtd,
                      title: `${rm.name} - จำนวนครั้ง Breakdown ปี ${year}`,
                      scopeLabel: rm.name,
                      timeLabel: `ปี ${year}`,
                      metricLabel: 'จำนวนครั้ง Breakdown',
                      cellValue: cYtd,
                      repairIds: metric?.ytd.repairIds || [],
                      customClass: 'text-blue-300 bg-blue-950/20'
                    })}
                    {/* Room YTD */}
                    {renderDrillDownCell({
                      cellKey: `cnt-r-${rm.id}-ytd`,
                      displayVal: cYtd,
                      count: cYtd,
                      title: `${rm.name} - จำนวนครั้ง Breakdown YTD ${year}`,
                      scopeLabel: rm.name,
                      timeLabel: `YTD ${year}`,
                      metricLabel: 'จำนวนครั้ง Breakdown',
                      cellValue: cYtd,
                      repairIds: metric?.ytd.repairIds || [],
                      customClass: 'text-blue-300 bg-blue-950/20'
                    })}
                    {/* Room Monthly */}
                    {metric?.monthly.map(m => renderDrillDownCell({
                      cellKey: `cnt-r-${rm.id}-${m.monthIndex}`,
                      displayVal: m.hasData ? m.breakdownCount : '-',
                      count: m.breakdownCount,
                      title: `${rm.name} - จำนวนครั้ง Breakdown ${m.monthName}`,
                      scopeLabel: rm.name,
                      timeLabel: m.monthName,
                      metricLabel: 'จำนวนครั้ง Breakdown',
                      cellValue: m.breakdownCount,
                      repairIds: m.repairIds || [],
                      customClass: 'text-slate-300'
                    }))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
