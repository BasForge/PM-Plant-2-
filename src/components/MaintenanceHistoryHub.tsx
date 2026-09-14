import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { RepairPage } from './RepairPage';
import { PMHistoryPage } from './PMHistoryPage';
import { Wrench, ClipboardCheck, AlertTriangle, CheckCircle2, History, Clock } from 'lucide-react';
import { getTodayDateString } from '../utils/pmAlerts';
import { getRepairStoppageType } from '../types';

interface MaintenanceHistoryHubProps {
  defaultTab?: 'repair' | 'pm';
}

export const MaintenanceHistoryHub: React.FC<MaintenanceHistoryHubProps> = ({ defaultTab = 'repair' }) => {
  const { repairs, schedules, machines } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'repair' | 'pm'>(defaultTab);

  // Sync if defaultTab prop changes (e.g. navigation from modal directly to PM history)
  useEffect(() => {
    setActiveSubTab(defaultTab);
  }, [defaultTab]);

  // Statistics for quick badge display
  const completedRepairs = repairs.filter(r => r.status === 'ปิดงาน' || r.status === 'Completed' || !r.status).length;
  const ongoingRepairs = repairs.filter(r => r.status === 'กำลังซ่อม' || r.status === 'Ongoing' || r.status === 'Pending').length;

  const breakdownCount = repairs.filter(r => getRepairStoppageType(r) === 'BREAKDOWN').length;
  const minorCount = repairs.filter(r => getRepairStoppageType(r) === 'MINOR_STOPPAGE').length;
  const adjustmentCount = repairs.filter(r => getRepairStoppageType(r) === 'ADJUSTMENT_LOSS').length;

  const todayStr = getTodayDateString();
  const completedPMSchedules = schedules.filter(s => s.status === 'Completed' || (s.actualDate && s.actualDate !== ''));
  const overduePMSchedules = schedules.filter(s => {
    if (s.status === 'Completed') return false;
    const targetDate = s.rescheduledDate || s.planDate;
    return targetDate && targetDate < todayStr;
  });

  return (
    <div className="space-y-5" id="maintenance-history-hub">
      {/* 1. TOP SUB-TAB NAVIGATION BAR */}
      <div className="bg-slate-900/95 border border-slate-800 p-2.5 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Sub-tab Switcher Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0" id="hub-maintenance-subtabs">
          
          {/* Sub-tab 1: บันทึกประวัติงานซ่อม */}
          <button
            type="button"
            id="btn-subtab-repairs"
            onClick={() => setActiveSubTab('repair')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer select-none ${
              activeSubTab === 'repair'
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 ring-1 ring-amber-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Wrench size={16} className={activeSubTab === 'repair' ? 'text-slate-950 stroke-[2.5]' : 'text-amber-400'} />
            <span>🔧 บันทึกประวัติงานซ่อม</span>
            <span 
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeSubTab === 'repair' 
                  ? 'bg-slate-950/20 text-slate-950' 
                  : 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
              }`}
            >
              {repairs.length} งาน
            </span>
          </button>

          {/* Sub-tab 2: บันทึกประวัติงาน PM */}
          <button
            type="button"
            id="btn-subtab-pm-history"
            onClick={() => setActiveSubTab('pm')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer select-none ${
              activeSubTab === 'pm'
                ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 text-slate-950 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <ClipboardCheck size={16} className={activeSubTab === 'pm' ? 'text-slate-950 stroke-[2.5]' : 'text-cyan-400'} />
            <span>📋 บันทึกประวัติงาน PM</span>
            <span 
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeSubTab === 'pm' 
                  ? 'bg-slate-950/20 text-slate-950' 
                  : 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/30'
              }`}
            >
              {completedPMSchedules.length} งานเสร็จ
            </span>
            {overduePMSchedules.length > 0 && (
              <span 
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                  activeSubTab === 'pm'
                    ? 'bg-rose-950 text-rose-300'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                }`}
                title={`${overduePMSchedules.length} รายการ PM เกินกำหนด`}
              >
                <AlertTriangle size={10} />
                {overduePMSchedules.length} เกินกำหนด
              </span>
            )}
          </button>
        </div>

        {/* Info badge on the right */}
        <div className="hidden lg:flex items-center gap-3 px-3.5 py-1.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs text-slate-300">
          {activeSubTab === 'repair' ? (
            <div className="flex items-center gap-2.5 text-[11px]">
              <span className="flex items-center gap-1 text-rose-400 font-medium bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20" title="Breakdown: เครื่องเสียที่ไม่ทราบล่วงหน้า มีการเปลี่ยนอะไหล่ (หน่วยเป็นครั้ง บันทึกเวลา)">
                🔴 Breakdown: <strong className="text-white font-mono">{breakdownCount}</strong> ครั้ง
              </span>
              <span className="flex items-center gap-1 text-amber-300 font-medium bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20" title="Minor stoppage: ไม่เปลี่ยนอะไหล่ < 15 นาที (หน่วยเป็นครั้ง)">
                🟡 Minor: <strong className="text-white font-mono">{minorCount}</strong> ครั้ง
              </span>
              <span className="flex items-center gap-1 text-orange-400 font-medium bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/20" title="Adjustment loss: ไม่เปลี่ยนอะไหล่ > 15 นาที (หน่วยเป็นครั้ง)">
                🟠 Adjustment: <strong className="text-white font-mono">{adjustmentCount}</strong> ครั้ง
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle2 size={12} />
                ปิดงาน: <strong className="text-white font-mono">{completedRepairs}</strong>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
                <CheckCircle2 size={13} />
                PM ประจำเครื่องเสร็จสิ้น: <strong className="text-white font-mono">{completedPMSchedules.length}</strong>
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                <History size={13} />
                ครอบคลุม: <strong className="text-white font-mono">{machines.length}</strong> เครื่องจักร
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. SUB-TAB VIEWPORT */}
      <div className="animate-in fade-in duration-200" key={activeSubTab}>
        {activeSubTab === 'repair' && <RepairPage />}
        {activeSubTab === 'pm' && <PMHistoryPage />}
      </div>
    </div>
  );
};
