import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { RoomConfig, RoomMachineConfig } from '../../types/mtbf';
import { OFFICIAL_MTBF_ROOMS, DEFAULT_PRODUCTION_TIME_MONTHLY_2026, DEFAULT_BASELINE_HISTORY } from '../../data/mtbfRooms';
import { calculateMTBFMTTRData, exportMtbfMttrToExcel } from '../../utils/mtbfCalculator';
import { MtbfSumView, DrillDownCellParams } from './MtbfSumView';
import { MtbfRoomView } from './MtbfRoomView';
import { ProductionTimeModal } from './ProductionTimeModal';
import { MachineMappingModal } from './MachineMappingModal';
import { BaselineEditModal } from './BaselineEditModal';
import { BreakdownCasesModal } from './BreakdownCasesModal';
import { 
  BarChart3, Clock, Link2, History, FileSpreadsheet, 
  Filter, Calendar, ChevronRight, Layers, AlertTriangle, ShieldCheck
} from 'lucide-react';

export const MtbfMttrDashboardPage: React.FC = () => {
  const { repairs, machines, navigateToRepairs, settings, setSettings } = useApp();

  // Active view: 'SUM' or room id 'room-1'..'room-8'
  const [activeTab, setActiveTab] = useState<string>('SUM');

  // Rooms & machines configuration state (persisted to localStorage & Firestore settings)
  const [rooms, setRooms] = useState<RoomConfig[]>(() => {
    if (settings.mtbfRoomsConfig && Array.isArray(settings.mtbfRoomsConfig) && settings.mtbfRoomsConfig.length > 0) {
      return settings.mtbfRoomsConfig;
    }
    try {
      const saved = localStorage.getItem('mtbf_custom_rooms_config');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return OFFICIAL_MTBF_ROOMS;
  });

  // Sync rooms if settings change from cloud
  useEffect(() => {
    if (settings.mtbfRoomsConfig && Array.isArray(settings.mtbfRoomsConfig) && settings.mtbfRoomsConfig.length > 0) {
      setRooms(settings.mtbfRoomsConfig);
    }
  }, [settings.mtbfRoomsConfig]);

  const handleUpdateRoomMachines = (roomId: string, newMachines: RoomMachineConfig[]) => {
    const updated = rooms.map(r => r.id === roomId ? { ...r, machines: newMachines } : r);
    setRooms(updated);
    try {
      localStorage.setItem('mtbf_custom_rooms_config', JSON.stringify(updated));
    } catch {
      // ignore
    }
    setSettings(prev => ({ ...prev, mtbfRoomsConfig: updated }));
  };

  const handleResetRoomMachines = (roomId: string) => {
    const defaultRoom = OFFICIAL_MTBF_ROOMS.find(r => r.id === roomId);
    if (!defaultRoom) return;
    handleUpdateRoomMachines(roomId, defaultRoom.machines);
  };

  // Year selector (default = 2026)
  const currentActualYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // Stoppage Type filter:
  // - ALL_BREAKDOWNS: นับเฉพาะ Breakdown (ไม่รวม Minor stoppage และ Adjustment loss ตามคำสั่งและมาตรฐาน TPM/CPRAM)
  // - PARTS_ONLY: นับเฉพาะ Breakdown ที่มีการเปลี่ยนอะไหล่
  const [stoppageFilter, setStoppageFilter] = useState<'ALL_BREAKDOWNS' | 'PARTS_ONLY'>('ALL_BREAKDOWNS');

  // Drilldown cases modal state
  const [activeDrillDown, setActiveDrillDown] = useState<DrillDownCellParams | null>(null);

  // Modals state
  const [showPTModal, setShowPTModal] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [showBaselineModal, setShowBaselineModal] = useState(false);

  // Production Time State (stored in localStorage)
  const [productionTimes, setProductionTimes] = useState<Record<string, number[]>>(() => {
    try {
      const saved = localStorage.getItem(`mtbf_pt_${selectedYear}`);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    const def: Record<string, number[]> = {};
    OFFICIAL_MTBF_ROOMS.forEach(r => {
      def[r.id] = [...DEFAULT_PRODUCTION_TIME_MONTHLY_2026];
    });
    return def;
  });

  // Reload PT when year changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`mtbf_pt_${selectedYear}`);
      if (saved) {
        setProductionTimes(JSON.parse(saved));
        return;
      }
    } catch {
      // ignore
    }
    const def: Record<string, number[]> = {};
    OFFICIAL_MTBF_ROOMS.forEach(r => {
      def[r.id] = [...DEFAULT_PRODUCTION_TIME_MONTHLY_2026];
    });
    setProductionTimes(def);
  }, [selectedYear]);

  // Save Production Times handler
  const handleSaveProductionTimes = (updated: Record<string, number[]>) => {
    setProductionTimes(updated);
    try {
      localStorage.setItem(`mtbf_pt_${selectedYear}`, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Custom Machine Mappings State (stored in localStorage)
  const [customMappings, setCustomMappings] = useState<Record<string, { roomId: string; machineId: string }>>(() => {
    try {
      const saved = localStorage.getItem('mtbf_machine_mappings');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });

  const handleSaveMappings = (newMappings: Record<string, { roomId: string; machineId: string }>) => {
    setCustomMappings(newMappings);
    try {
      localStorage.setItem('mtbf_machine_mappings', JSON.stringify(newMappings));
    } catch {
      // ignore
    }
  };

  // Baseline History State (stored in localStorage)
  const [baselineHistory, setBaselineHistory] = useState<typeof DEFAULT_BASELINE_HISTORY>(() => {
    try {
      const saved = localStorage.getItem('mtbf_baseline_history');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_BASELINE_HISTORY;
  });

  const handleSaveBaseline = (newBaseline: typeof DEFAULT_BASELINE_HISTORY) => {
    setBaselineHistory(newBaseline);
    try {
      localStorage.setItem('mtbf_baseline_history', JSON.stringify(newBaseline));
    } catch {
      // ignore
    }
  };

  // Run Calculations memoized
  const { roomMetrics, machineMetrics, sumMetrics, unmappedRepairs } = useMemo(() => {
    return calculateMTBFMTTRData({
      year: selectedYear,
      repairs,
      rooms,
      productionTimes,
      customMappings,
      stoppageFilter,
      baselineHistory
    });
  }, [selectedYear, repairs, rooms, productionTimes, customMappings, stoppageFilter, baselineHistory]);

  const activeRoom = rooms.find(r => r.id === activeTab) || null;
  const activeRoomMetric = roomMetrics.find(r => r.roomId === activeTab) || null;
  const activeRoomMachMetrics = activeRoom ? (machineMetrics[activeRoom.id] || []) : [];

  const handleExportExcel = () => {
    exportMtbfMttrToExcel({
      year: selectedYear,
      rooms,
      roomMetrics,
      sumMetrics,
      activeRoomId: activeTab === 'SUM' ? null : activeTab
    });
  };

  return (
    <div className="space-y-6 select-none" id="mtbf-dashboard-root">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="bg-[#0b1325]/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title & Brand */}
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400 shadow-inner">
              <BarChart3 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  แดชบอร์ด Breakdown เครื่องจักรสะสม
                </h1>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 font-bold border border-cyan-800/40">
                  ระบบวิเคราะห์เวลาหยุดเครื่องจักร (Breakdown Dashboard)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                คำนวณจากประวัติงานซ่อมบำรุงจริง (Repair Logs) เฉพาะกรณี Breakdown (ไม่นำ Minor stoppage และ Adjustment loss มาคิด MTTR / MTBF)
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Year selector */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs">
              <Calendar size={14} className="text-cyan-400 shrink-0" />
              <span className="text-slate-400 font-medium">ปี:</span>
              <select
                id="select-mtbf-year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="bg-transparent text-white font-mono font-bold focus:outline-none cursor-pointer"
              >
                <option value={2026} className="bg-slate-900">2026 (ปีปัจจุบัน)</option>
                <option value={2025} className="bg-slate-900">2025</option>
                <option value={2024} className="bg-slate-900">2024</option>
                <option value={2023} className="bg-slate-900">2023</option>
              </select>
            </div>

            {/* Breakdown Filter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs">
              <Filter size={14} className="text-cyan-400 shrink-0" />
              <span className="text-slate-400 font-medium">เกณฑ์นับ:</span>
              <select
                id="select-stoppage-filter"
                value={stoppageFilter}
                onChange={(e) => setStoppageFilter(e.target.value as any)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer max-w-[210px] truncate"
              >
                <option value="ALL_BREAKDOWNS" className="bg-slate-900">เฉพาะ Breakdown (ไม่รวม Minor/Adjust)</option>
                <option value="PARTS_ONLY" className="bg-slate-900">เฉพาะ Breakdown ที่เปลี่ยนอะไหล่</option>
              </select>
            </div>

            {/* Production Time button */}
            <button
              type="button"
              id="btn-open-pt-modal"
              onClick={() => setShowPTModal(true)}
              className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="ตั้งค่าชั่วโมงการผลิตรายห้องรายเดือน"
            >
              <Clock size={14} className="text-cyan-400" />
              <span>Production Time</span>
            </button>

            {/* Mapping button */}
            <button
              type="button"
              id="btn-open-mapping-modal"
              onClick={() => setShowMappingModal(true)}
              className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="ตั้งค่าจับคู่เครื่องจักรกับห้อง"
            >
              <Link2 size={14} className="text-cyan-400" />
              <span>Mapping เครื่อง</span>
              {unmappedRepairs.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-slate-950 font-bold text-[10px]">
                  {unmappedRepairs.length}
                </span>
              )}
            </button>

            {/* Baseline button */}
            <button
              type="button"
              id="btn-open-baseline-modal"
              onClick={() => setShowBaselineModal(true)}
              className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="ตรวจสอบและแก้ไข Baseline ย้อนหลัง 2023-2025"
            >
              <History size={14} className="text-amber-400" />
              <span>Baseline</span>
            </button>

            {/* Export Excel button */}
            <button
              type="button"
              id="btn-export-mtbf-excel"
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition cursor-pointer"
            >
              <FileSpreadsheet size={15} />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* 2. NAVIGATION TABS: SUM + 8 ROOMS */}
        <div className="border-t border-slate-800/80 pt-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin" id="mtbf-tabs-nav">
            {/* SUM Tab */}
            <button
              type="button"
              id="tab-btn-sum"
              onClick={() => setActiveTab('SUM')}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'SUM'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/25 ring-1 ring-cyan-300'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers size={16} />
              <span>SUM (ภาพรวมทุกห้อง)</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                activeTab === 'SUM' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-cyan-400'
              }`}>
                8 ห้อง
              </span>
            </button>

            {/* 8 Room Tabs */}
            {OFFICIAL_MTBF_ROOMS.map((rm, idx) => {
              const isSelected = activeTab === rm.id;
              const rMetric = roomMetrics.find(r => r.roomId === rm.id);
              const bdCount = rMetric ? rMetric.ytd.breakdownCount : 0;

              return (
                <button
                  key={rm.id}
                  id={`tab-btn-${rm.id}`}
                  onClick={() => setActiveTab(rm.id)}
                  className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/25 ring-1 ring-cyan-300'
                      : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span className="text-[11px] opacity-75 font-mono">0{idx + 1}</span>
                  <span>{rm.name}</span>
                  {bdCount > 0 && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                      isSelected ? 'bg-slate-950 text-cyan-300 font-bold' : 'bg-slate-800 text-rose-300'
                    }`}>
                      {bdCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Unmapped repairs warning banner (if any) */}
      {unmappedRepairs.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-xs text-amber-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={16} className="text-amber-400 shrink-0" />
            <span>
              พบประวัติงานซ่อม <strong>{unmappedRepairs.length} รายการ</strong> ที่รหัสเครื่องจักรยังไม่ถูกจับคู่เข้าห้อง
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowMappingModal(true)}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition cursor-pointer whitespace-nowrap"
          >
            เปิดหน้าตั้งค่า Mapping
          </button>
        </div>
      )}

      {/* 3. MAIN CONTENT: SUM OR ROOM VIEW */}
      {activeTab === 'SUM' ? (
        <MtbfSumView
          year={selectedYear}
          rooms={rooms}
          roomMetrics={roomMetrics}
          sumMetrics={sumMetrics}
          onSelectRoom={(roomId) => setActiveTab(roomId)}
          onDrillDown={(params) => {
            navigateToRepairs({
              targetRepairIds: params.repairIds || [],
              filterTitle: params.title,
              sourcePage: 16,
              isBaseline: params.isBaseline,
              baselineYear: params.baselineYear,
              baselineBDMin: params.baselineBDMin,
              baselineCount: params.baselineCount
            });
          }}
        />
      ) : (
        activeRoom && activeRoomMetric && (
          <MtbfRoomView
            year={selectedYear}
            room={activeRoom}
            roomMetric={activeRoomMetric}
            machinesMetrics={activeRoomMachMetrics}
            allRegisteredMachines={machines}
            repairs={repairs}
            onBackToSum={() => setActiveTab('SUM')}
            onOpenProductionTimeModal={() => setShowPTModal(true)}
            onUpdateRoomMachines={handleUpdateRoomMachines}
            onResetRoomMachines={handleResetRoomMachines}
            onDrillDown={(params) => {
              navigateToRepairs({
                targetRepairIds: params.repairIds || [],
                filterTitle: params.title,
                sourcePage: 16,
                isBaseline: params.isBaseline,
                baselineYear: params.baselineYear,
                baselineBDMin: params.baselineBDMin,
                baselineCount: params.baselineCount
              });
            }}
          />
        )
      )}

      {/* 4. MODALS */}
      {activeDrillDown && (
        <BreakdownCasesModal
          isOpen={Boolean(activeDrillDown)}
          onClose={() => setActiveDrillDown(null)}
          title={activeDrillDown.title}
          scopeLabel={activeDrillDown.scopeLabel}
          timeLabel={activeDrillDown.timeLabel}
          metricLabel={activeDrillDown.metricLabel}
          cellValue={activeDrillDown.cellValue}
          repairIds={activeDrillDown.repairIds}
          allRepairs={repairs}
          machines={machines}
          isBaseline={activeDrillDown.isBaseline}
          baselineYear={activeDrillDown.baselineYear}
          baselineBDMin={activeDrillDown.baselineBDMin}
          baselineCount={activeDrillDown.baselineCount}
          onNavigateToRepairsPage={(targetIds, filterTitle) => {
            navigateToRepairs({
              targetRepairIds: targetIds,
              filterTitle: filterTitle,
              sourcePage: 16
            });
          }}
        />
      )}
      {showPTModal && (
        <ProductionTimeModal
          isOpen={showPTModal}
          onClose={() => setShowPTModal(false)}
          year={selectedYear}
          rooms={rooms}
          productionTimes={productionTimes}
          onSave={handleSaveProductionTimes}
        />
      )}

      {showMappingModal && (
        <MachineMappingModal
          isOpen={showMappingModal}
          onClose={() => setShowMappingModal(false)}
          rooms={rooms}
          repairs={repairs}
          customMappings={customMappings}
          onSaveMappings={handleSaveMappings}
        />
      )}

      {showBaselineModal && (
        <BaselineEditModal
          isOpen={showBaselineModal}
          onClose={() => setShowBaselineModal(false)}
          rooms={rooms}
          baselineHistory={baselineHistory}
          onSaveBaseline={handleSaveBaseline}
        />
      )}
    </div>
  );
};
