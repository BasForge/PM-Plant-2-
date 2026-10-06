import React, { useState } from 'react';
import { RoomConfig, RoomMachineConfig } from '../../types/mtbf';
import { RoomCalculatedMetrics, MachineCalculatedMetrics } from '../../types/mtbf';
import { Machine, RepairLog } from '../../types';
import { MtbfBarChart } from './MtbfBarChart';
import { DrillDownCellParams } from './MtbfSumView';
import { RoomMachineEditModal } from './RoomMachineEditModal';
import { ArrowLeft, Clock, Wrench, BarChart2, Tag, ExternalLink, Edit3, Plus, RotateCcw } from 'lucide-react';

interface MtbfRoomViewProps {
  year: number;
  room: RoomConfig;
  roomMetric: RoomCalculatedMetrics;
  machinesMetrics: MachineCalculatedMetrics[];
  allRegisteredMachines?: Machine[];
  repairs?: RepairLog[];
  onBackToSum: () => void;
  onOpenProductionTimeModal?: () => void;
  onDrillDown?: (params: DrillDownCellParams) => void;
  onUpdateRoomMachines?: (roomId: string, newMachines: RoomMachineConfig[]) => void;
  onResetRoomMachines?: (roomId: string) => void;
}

export const MtbfRoomView: React.FC<MtbfRoomViewProps> = ({
  year,
  room,
  roomMetric,
  machinesMetrics,
  allRegisteredMachines = [],
  repairs = [],
  onBackToSum,
  onOpenProductionTimeModal,
  onDrillDown,
  onUpdateRoomMachines,
  onResetRoomMachines
}) => {
  const yearShort = String(year).slice(-2);

  // Edit / Add machine modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editModalMode, setEditModalMode] = useState<'add' | 'edit'>('add');
  const [selectedMachineForEdit, setSelectedMachineForEdit] = useState<RoomMachineConfig | null>(null);

  const handleOpenAddMachine = () => {
    setEditModalMode('add');
    setSelectedMachineForEdit(null);
    setIsEditModalOpen(true);
  };

  const handleOpenEditMachine = (machId: string) => {
    const target = room.machines.find(m => m.id === machId);
    if (!target) return;
    setEditModalMode('edit');
    setSelectedMachineForEdit(target);
    setIsEditModalOpen(true);
  };

  const handleSaveMachine = (machineData: RoomMachineConfig, oldMachineId?: string) => {
    if (!onUpdateRoomMachines) return;
    let newMachines: RoomMachineConfig[];
    if (editModalMode === 'add') {
      newMachines = [...room.machines, machineData];
    } else {
      newMachines = room.machines.map(m => m.id === oldMachineId ? machineData : m);
    }
    onUpdateRoomMachines(room.id, newMachines);
  };

  const handleDeleteMachine = (machId: string) => {
    if (!onUpdateRoomMachines) return;
    const newMachines = room.machines.filter(m => m.id !== machId);
    onUpdateRoomMachines(room.id, newMachines);
  };

  // Room Level 4 Charts Data: X axis = Jan-26 ... Dec-26, YTD-26
  const roomMonthLabels = [
    ...roomMetric.monthly.map(m => m.monthName),
    `YTD-${yearShort}`
  ];

  // Chart 1: Breakdown (min)
  const roomChart1Data = [
    ...roomMetric.monthly.map(m => ({
      name: m.monthName,
      value: m.hasData ? m.breakdownMin : null
    })),
    {
      name: `YTD-${yearShort}`,
      value: roomMetric.ytd.breakdownMin
    }
  ];

  // Chart 2: จำนวนครั้ง Breakdown
  const roomChart2Data = [
    ...roomMetric.monthly.map(m => ({
      name: m.monthName,
      value: m.hasData ? m.breakdownCount : null
    })),
    {
      name: `YTD-${yearShort}`,
      value: roomMetric.ytd.breakdownCount
    }
  ];

  return (
    <div className="space-y-8 select-none" id={`room-view-${room.id}`}>
      {/* Top Breadcrumb & Room Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0b1325]/90 border border-slate-800 p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToSum}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>กลับหน้า SUM</span>
          </button>
          <div className="border-l border-slate-700 h-6" />
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span>{room.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-cyan-950 border border-cyan-800/50 text-cyan-400 font-normal">
                {room.machines.length} เครื่องจักร
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs flex-wrap">
          {onResetRoomMachines && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`ต้องการคืนค่ารายการเครื่องจักรของ "${room.name}" กลับเป็นค่ามาตรฐานหรือไม่?`)) {
                  onResetRoomMachines(room.id);
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 flex items-center gap-1.5 transition cursor-pointer"
              title="คืนค่าเครื่องจักรในห้องนี้กลับสู่ค่าเริ่มต้นมาตรฐาน"
            >
              <RotateCcw size={13} />
              <span className="hidden sm:inline">คืนค่าเครื่องจักรเริ่มต้น</span>
            </button>
          )}
          {onOpenProductionTimeModal && (
            <button
              type="button"
              onClick={onOpenProductionTimeModal}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Clock size={13} className="text-cyan-400" />
              <span>แก้ไข Production Time ห้องนี้</span>
            </button>
          )}
        </div>
      </div>

      {/* 2 HORIZONTAL CHARTS FOR ROOM */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MtbfBarChart
          title={`Breakdown ${room.name} (min)`}
          data={roomChart1Data}
          unit="นาที"
          decimalPlaces={0}
          height={230}
          barColor="#00B0F0"
        />
        <MtbfBarChart
          title={`จำนวนครั้ง Breakdown ${room.name}`}
          data={roomChart2Data}
          unit="ครั้ง"
          decimalPlaces={0}
          height={230}
          barColor="#00B0F0"
        />
      </div>

      {/* TABLE 1: ตารางคำนวณ Breakdown ของทั้งห้อง */}
      <div className="bg-[#0b1325]/90 border border-slate-800 rounded-2xl p-5 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              ตารางคำนวณ Breakdown: {room.name} (ปี {year})
            </h3>
          </div>
          <span className="text-xs text-slate-400">ภาพรวมทั้งห้อง (รวมทุกเครื่อง)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-300 border-b border-slate-700">
                <th className="py-2.5 px-3 min-w-[180px] font-bold sticky left-0 bg-slate-900 z-10">หัวข้อตัวชี้วัด</th>
                {roomMetric.monthly.map(m => (
                  <th key={`rm-hd-${m.monthIndex}`} className="py-2.5 px-2 text-right font-mono min-w-[65px]">
                    {m.monthName}
                  </th>
                ))}
                <th className="py-2.5 px-3 text-right font-mono min-w-[80px] text-cyan-300 font-bold bg-cyan-950/40">
                  YTD-{yearShort}
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1: Production Time */}
              <tr className="border-b border-slate-800/60 hover:bg-slate-800/30 transition">
                <td className="py-2.5 px-3 font-semibold text-slate-200 sticky left-0 bg-[#0b1325] z-10 flex items-center justify-between">
                  <span>Production Time (Hour)</span>
                  <span className="text-[10px] text-slate-500 font-mono">ชม.</span>
                </td>
                {roomMetric.monthly.map(m => (
                  <td key={`pt-${m.monthIndex}`} className="py-2.5 px-2 text-right font-mono text-slate-300">
                    {m.productionTime.toLocaleString()}
                  </td>
                ))}
                <td className="py-2.5 px-3 text-right font-mono font-bold text-cyan-300 bg-cyan-950/20">
                  {roomMetric.ytd.productionTime.toLocaleString()}
                </td>
              </tr>

              {/* Row 2: Breakdown (min) */}
              <tr className="border-b border-slate-800/60 hover:bg-slate-800/30 transition">
                <td className="py-2.5 px-3 font-semibold text-slate-200 sticky left-0 bg-[#0b1325] z-10 flex items-center justify-between">
                  <span>Breakdown (min)</span>
                  <span className="text-[10px] text-slate-500 font-mono">นาที</span>
                </td>
                {roomMetric.monthly.map(m => {
                  const hasCases = (m.repairIds && m.repairIds.length > 0) || m.breakdownCount > 0;
                  return (
                    <td key={`bd-${m.monthIndex}`} className="py-1.5 px-1.5 text-right font-mono text-rose-300">
                      <button
                        type="button"
                        disabled={!hasCases || !onDrillDown}
                        onClick={() => {
                          if (hasCases && onDrillDown) {
                            onDrillDown({
                              title: `${room.name} - Breakdown (min) ${m.monthName}`,
                              scopeLabel: room.name,
                              timeLabel: m.monthName,
                              metricLabel: 'Breakdown (min)',
                              cellValue: m.breakdownMin,
                              repairIds: m.repairIds || []
                            });
                          }
                        }}
                        className={`w-full text-right font-mono py-1 px-1.5 rounded transition inline-flex items-center justify-end gap-1 ${
                          hasCases && onDrillDown
                            ? 'cursor-pointer hover:bg-rose-500/20 hover:text-white group' 
                            : 'cursor-default'
                        }`}
                        title={hasCases ? `คลิกเพื่อดูประวัติงานซ่อม (${m.breakdownCount} ครั้ง)` : undefined}
                      >
                        <span className={hasCases && onDrillDown ? 'group-hover:underline underline-offset-2' : ''}>
                          {m.hasData ? m.breakdownMin.toLocaleString() : '-'}
                        </span>
                        {hasCases && onDrillDown && (
                          <ExternalLink size={9} className="opacity-0 group-hover:opacity-100 text-cyan-400 shrink-0 transition" />
                        )}
                      </button>
                    </td>
                  );
                })}
                <td className="py-1.5 px-1.5 text-right font-mono font-bold text-rose-400 bg-cyan-950/20">
                  <button
                    type="button"
                    disabled={roomMetric.ytd.breakdownCount === 0 || !onDrillDown}
                    onClick={() => {
                      if (roomMetric.ytd.breakdownCount > 0 && onDrillDown) {
                        onDrillDown({
                          title: `${room.name} - Breakdown (min) YTD ${year}`,
                          scopeLabel: room.name,
                          timeLabel: `YTD ${year}`,
                          metricLabel: 'Breakdown (min)',
                          cellValue: roomMetric.ytd.breakdownMin,
                          repairIds: roomMetric.ytd.repairIds || []
                        });
                      }
                    }}
                    className={`w-full text-right font-mono py-1 px-1.5 rounded transition inline-flex items-center justify-end gap-1 ${
                      roomMetric.ytd.breakdownCount > 0 && onDrillDown
                        ? 'cursor-pointer hover:bg-rose-500/20 hover:text-white group' 
                        : 'cursor-default'
                    }`}
                    title={roomMetric.ytd.breakdownCount > 0 ? `คลิกเพื่อดูประวัติงานซ่อม (${roomMetric.ytd.breakdownCount} ครั้ง)` : undefined}
                  >
                    <span className={roomMetric.ytd.breakdownCount > 0 && onDrillDown ? 'group-hover:underline underline-offset-2' : ''}>
                      {roomMetric.ytd.breakdownMin.toLocaleString()}
                    </span>
                    {roomMetric.ytd.breakdownCount > 0 && onDrillDown && (
                      <ExternalLink size={9} className="opacity-0 group-hover:opacity-100 text-cyan-400 shrink-0 transition" />
                    )}
                  </button>
                </td>
              </tr>

              {/* Row 3: จำนวนครั้ง Breakdown */}
              <tr className="border-b border-slate-800/60 hover:bg-slate-800/30 transition">
                <td className="py-2.5 px-3 font-semibold text-slate-200 sticky left-0 bg-[#0b1325] z-10 flex items-center justify-between">
                  <span>จำนวนครั้ง Breakdown</span>
                  <span className="text-[10px] text-slate-500 font-mono">ครั้ง</span>
                </td>
                {roomMetric.monthly.map(m => {
                  const hasCases = (m.repairIds && m.repairIds.length > 0) || m.breakdownCount > 0;
                  return (
                    <td key={`cnt-${m.monthIndex}`} className="py-1.5 px-1.5 text-right font-mono text-amber-300">
                      <button
                        type="button"
                        disabled={!onDrillDown}
                        onClick={() => {
                          if (onDrillDown) {
                            onDrillDown({
                              title: `${room.name} - จำนวนครั้ง Breakdown ${m.monthName}`,
                              scopeLabel: room.name,
                              timeLabel: m.monthName,
                              metricLabel: 'จำนวนครั้ง Breakdown',
                              cellValue: m.breakdownCount,
                              repairIds: m.repairIds || []
                            });
                          }
                        }}
                        className="w-full text-right font-mono py-1 px-1.5 rounded transition inline-flex items-center justify-end gap-1 cursor-pointer hover:bg-amber-500/20 hover:text-white group"
                        title={`คลิกเพื่อดูประวัติงานซ่อม (${m.breakdownCount} ครั้ง)`}
                      >
                        <span className="group-hover:underline underline-offset-2">
                          {m.hasData ? m.breakdownCount : '-'}
                        </span>
                        <ExternalLink size={9} className="opacity-0 group-hover:opacity-100 text-cyan-400 shrink-0 transition" />
                      </button>
                    </td>
                  );
                })}
                <td className="py-1.5 px-1.5 text-right font-mono font-bold text-amber-300 bg-cyan-950/20">
                  <button
                    type="button"
                    disabled={!onDrillDown}
                    onClick={() => {
                      if (onDrillDown) {
                        onDrillDown({
                          title: `${room.name} - จำนวนครั้ง Breakdown YTD ${year}`,
                          scopeLabel: room.name,
                          timeLabel: `YTD ${year}`,
                          metricLabel: 'จำนวนครั้ง Breakdown',
                          cellValue: roomMetric.ytd.breakdownCount,
                          repairIds: roomMetric.ytd.repairIds || []
                        });
                      }
                    }}
                    className="w-full text-right font-mono py-1 px-1.5 rounded transition inline-flex items-center justify-end gap-1 cursor-pointer hover:bg-amber-500/20 hover:text-white group"
                    title={`คลิกเพื่อดูประวัติงานซ่อม (${roomMetric.ytd.breakdownCount} ครั้ง)`}
                  >
                    <span className="group-hover:underline underline-offset-2">
                      {roomMetric.ytd.breakdownCount}
                    </span>
                    <ExternalLink size={9} className="opacity-0 group-hover:opacity-100 text-cyan-400 shrink-0 transition" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLE 2: ตารางรายเครื่อง พร้อมกราฟ 2 ตัวต่อเครื่อง */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Wrench size={16} className="text-cyan-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              ตารางตัวชี้วัดรายเครื่องจักร ({machinesMetrics.length} เครื่อง)
            </h3>
          </div>
          <div className="flex items-center gap-2.5">
            {onUpdateRoomMachines && (
              <button
                type="button"
                onClick={handleOpenAddMachine}
                className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-500/20"
                title="เพิ่มเครื่องจักรตัวใหม่เข้าแดชบอร์ดห้องนี้ เพื่อแทร็ก Breakdown"
              >
                <Plus size={14} />
                <span>+ เพิ่มเครื่องจักรในห้องนี้</span>
              </button>
            )}
            <span className="text-xs text-slate-400 hidden sm:inline">ตารางสถิติ & กราฟ Breakdown แยกเครื่อง</span>
          </div>
        </div>

        {machinesMetrics.map((mach, idx) => {
          // Prepare machine 2 charts: Breakdown min & Breakdown count
          const machBdChartData = [
            ...mach.monthly.map(m => ({
              name: m.monthName,
              value: m.hasData ? m.breakdownMin : null
            })),
            {
              name: `YTD-${yearShort}`,
              value: mach.ytd.breakdownMin
            }
          ];

          const machCntChartData = [
            ...mach.monthly.map(m => ({
              name: m.monthName,
              value: m.hasData ? m.breakdownCount : null
            })),
            {
              name: `YTD-${yearShort}`,
              value: mach.ytd.breakdownCount
            }
          ];

          return (
            <div
              key={mach.machineId}
              className="bg-[#0b1325]/90 border border-slate-800 rounded-2xl p-5 shadow-xl grid grid-cols-1 xl:grid-cols-12 gap-5"
            >
              {/* Left Column: Machine Table (7 cols) */}
              <div className="xl:col-span-7 flex flex-col justify-between overflow-x-auto">
                <div>
                  {/* Machine Header details */}
                  <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5 flex-wrap gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-xs">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                          <span>{mach.machineName}</span>
                          <span className="font-mono text-cyan-300 font-bold bg-slate-900 px-2 py-0.5 rounded border border-cyan-800/40 text-xs">
                            {mach.machineId}
                          </span>
                          {onUpdateRoomMachines && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditMachine(mach.machineId)}
                              className="px-2 py-0.5 rounded-md bg-slate-850 hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/50 transition text-[11px] font-medium flex items-center gap-1 cursor-pointer shadow-sm"
                              title="คลิกเพื่อแก้ไขรหัส ID, ชื่อเครื่อง หรือ Mapping เพื่อให้ตรงกับทะเบียน"
                            >
                              <Edit3 size={11} className="text-cyan-400" />
                              <span>แก้ไข ID</span>
                            </button>
                          )}
                        </h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        mach.ranking === 'A' 
                          ? 'bg-rose-500/15 text-rose-300 border border-rose-500/40' 
                          : mach.ranking === 'B'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                          : 'bg-blue-500/15 text-blue-300 border border-blue-500/40'
                      }`}>
                        Ranking {mach.ranking}
                      </span>
                    </div>
                  </div>

                  {/* Machine Monthly Table */}
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                        <th className="py-2 px-2.5 min-w-[140px] font-bold">ตัวชี้วัด</th>
                        {mach.monthly.map(m => (
                          <th key={`m-hd-${mach.machineId}-${m.monthIndex}`} className="py-2 px-1.5 text-right font-mono min-w-[55px]">
                            {m.monthName}
                          </th>
                        ))}
                        <th className="py-2 px-2 text-right font-mono min-w-[65px] text-cyan-300 font-bold bg-cyan-950/30">
                          YTD-{yearShort}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* PT */}
                      <tr className="border-b border-slate-800/50 hover:bg-slate-800/20">
                        <td className="py-1.5 px-2.5 text-slate-300 font-medium">Production Time (ชม.)</td>
                        {mach.monthly.map(m => (
                          <td key={`m-pt-${mach.machineId}-${m.monthIndex}`} className="py-1.5 px-1.5 text-right font-mono text-slate-400">
                            {m.productionTime}
                          </td>
                        ))}
                        <td className="py-1.5 px-2 text-right font-mono font-bold text-cyan-300 bg-cyan-950/20">
                          {mach.ytd.productionTime}
                        </td>
                      </tr>

                      {/* BD min */}
                      <tr className="border-b border-slate-800/50 hover:bg-slate-800/20">
                        <td className="py-1.5 px-2.5 text-slate-300 font-medium">Breakdown (min)</td>
                        {mach.monthly.map(m => {
                          return (
                            <td key={`m-bd-${mach.machineId}-${m.monthIndex}`} className="py-1 px-1 text-right font-mono text-rose-300 font-semibold">
                              <button
                                type="button"
                                disabled={!onDrillDown}
                                onClick={() => {
                                  if (onDrillDown) {
                                    onDrillDown({
                                      title: `${mach.machineName} (${mach.machineId}) - Breakdown (min) ${m.monthName}`,
                                      scopeLabel: `${room.name} > ${mach.machineName}`,
                                      timeLabel: m.monthName,
                                      metricLabel: 'Breakdown (min)',
                                      cellValue: m.breakdownMin,
                                      repairIds: m.repairIds || []
                                    });
                                  }
                                }}
                                className="w-full text-right font-mono py-0.5 px-1 rounded transition inline-flex items-center justify-end gap-1 cursor-pointer hover:bg-rose-500/20 hover:text-white group"
                                title={`คลิกดูประวัติซ่อม (${m.breakdownCount} ครั้ง)`}
                              >
                                <span className="group-hover:underline underline-offset-2">
                                  {m.hasData ? m.breakdownMin : '-'}
                                </span>
                                <ExternalLink size={8} className="opacity-0 group-hover:opacity-100 text-cyan-400 shrink-0 transition" />
                              </button>
                            </td>
                          );
                        })}
                        <td className="py-1 px-1 text-right font-mono font-bold text-rose-400 bg-cyan-950/20">
                          <button
                            type="button"
                            disabled={!onDrillDown}
                            onClick={() => {
                              if (onDrillDown) {
                                onDrillDown({
                                  title: `${mach.machineName} (${mach.machineId}) - Breakdown (min) YTD ${year}`,
                                  scopeLabel: `${room.name} > ${mach.machineName}`,
                                  timeLabel: `YTD ${year}`,
                                  metricLabel: 'Breakdown (min)',
                                  cellValue: mach.ytd.breakdownMin,
                                  repairIds: mach.ytd.repairIds || []
                                });
                              }
                            }}
                            className="w-full text-right font-mono py-0.5 px-1 rounded transition inline-flex items-center justify-end gap-1 cursor-pointer hover:bg-rose-500/20 hover:text-white group"
                            title={`คลิกดูประวัติซ่อม (${mach.ytd.breakdownCount} ครั้ง)`}
                          >
                            <span className="group-hover:underline underline-offset-2">
                              {mach.ytd.breakdownMin}
                            </span>
                            <ExternalLink size={8} className="opacity-0 group-hover:opacity-100 text-cyan-400 shrink-0 transition" />
                          </button>
                        </td>
                      </tr>

                      {/* Count */}
                      <tr className="border-b border-slate-800/50 hover:bg-slate-800/20">
                        <td className="py-1.5 px-2.5 text-slate-300 font-medium">จำนวนครั้ง Breakdown</td>
                        {mach.monthly.map(m => {
                          return (
                            <td key={`m-cnt-${mach.machineId}-${m.monthIndex}`} className="py-1 px-1 text-right font-mono text-amber-300 font-semibold">
                              <button
                                type="button"
                                disabled={!onDrillDown}
                                onClick={() => {
                                  if (onDrillDown) {
                                    onDrillDown({
                                      title: `${mach.machineName} (${mach.machineId}) - จำนวนครั้ง Breakdown ${m.monthName}`,
                                      scopeLabel: `${room.name} > ${mach.machineName}`,
                                      timeLabel: m.monthName,
                                      metricLabel: 'จำนวนครั้ง Breakdown',
                                      cellValue: m.breakdownCount,
                                      repairIds: m.repairIds || []
                                    });
                                  }
                                }}
                                className="w-full text-right font-mono py-0.5 px-1 rounded transition inline-flex items-center justify-end gap-1 cursor-pointer hover:bg-amber-500/20 hover:text-white group"
                                title={`คลิกดูประวัติซ่อม (${m.breakdownCount} ครั้ง)`}
                              >
                                <span className="group-hover:underline underline-offset-2">
                                  {m.hasData ? m.breakdownCount : '-'}
                                </span>
                                <ExternalLink size={8} className="opacity-0 group-hover:opacity-100 text-cyan-400 shrink-0 transition" />
                              </button>
                            </td>
                          );
                        })}
                        <td className="py-1 px-1 text-right font-mono font-bold text-amber-300 bg-cyan-950/20">
                          <button
                            type="button"
                            disabled={!onDrillDown}
                            onClick={() => {
                              if (onDrillDown) {
                                onDrillDown({
                                  title: `${mach.machineName} (${mach.machineId}) - จำนวนครั้ง Breakdown YTD ${year}`,
                                  scopeLabel: `${room.name} > ${mach.machineName}`,
                                  timeLabel: `YTD ${year}`,
                                  metricLabel: 'จำนวนครั้ง Breakdown',
                                  cellValue: mach.ytd.breakdownCount,
                                  repairIds: mach.ytd.repairIds || []
                                });
                              }
                            }}
                            className="w-full text-right font-mono py-0.5 px-1 rounded transition inline-flex items-center justify-end gap-1 cursor-pointer hover:bg-amber-500/20 hover:text-white group"
                            title={`คลิกดูประวัติซ่อม (${mach.ytd.breakdownCount} ครั้ง)`}
                          >
                            <span className="group-hover:underline underline-offset-2">
                              {mach.ytd.breakdownCount}
                            </span>
                            <ExternalLink size={8} className="opacity-0 group-hover:opacity-100 text-cyan-400 shrink-0 transition" />
                          </button>
                        </td>
                      </tr>

                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column: 2 Machine Charts (5 cols) */}
              <div className="xl:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <MtbfBarChart
                  title={`${mach.machineName} Breakdown`}
                  data={machBdChartData}
                  unit="นาที"
                  decimalPlaces={0}
                  height={190}
                  barColor="#00B0F0"
                />
                <MtbfBarChart
                  title={`${mach.machineName} จำนวนครั้ง`}
                  data={machCntChartData}
                  unit="ครั้ง"
                  decimalPlaces={0}
                  height={190}
                  barColor="#00B0F0"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: เพิ่ม / แก้ไข ID และข้อมูลเครื่องจักร */}
      {isEditModalOpen && (
        <RoomMachineEditModal
          isOpen={isEditModalOpen}
          mode={editModalMode}
          room={room}
          machine={selectedMachineForEdit}
          allRegisteredMachines={allRegisteredMachines}
          repairs={repairs}
          year={year}
          onSave={handleSaveMachine}
          onDelete={handleDeleteMachine}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </div>
  );
};
