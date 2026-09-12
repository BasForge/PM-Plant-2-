import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MachinePage } from './MachinePage';
import { PMPlanPage } from './PMPlanPage';
import { TBMPlanSchedulePage } from './TBMPlanSchedulePage';
import { Activity, ClipboardList, CalendarRange, Factory, CheckCircle2, AlertTriangle } from 'lucide-react';

interface MachineAndPMPlanHubProps {
  defaultTab?: 'machines' | 'plans' | 'tbm';
  onNavigateToSchedule?: () => void;
  onNavigateToHistory?: () => void;
}

export const MachineAndPMPlanHub: React.FC<MachineAndPMPlanHubProps> = ({ 
  defaultTab = 'machines',
  onNavigateToSchedule,
  onNavigateToHistory
}) => {
  const { machines, pmPlans } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'machines' | 'plans' | 'tbm'>(defaultTab);
  const [focusMachineId, setFocusMachineId] = useState<string>('ALL');

  const handleNavigateToTbmForMachine = (machineId?: string) => {
    if (machineId) {
      setFocusMachineId(machineId);
    } else {
      setFocusMachineId('ALL');
    }
    setActiveSubTab('tbm');
  };

  // Quick calculations for status badge
  const normalMachinesCount = machines.filter(m => m.status === 'ปกติ' || !m.status).length;
  const brokenMachinesCount = machines.filter(m => m.status === 'เสีย/ซ่อม').length;

  return (
    <div className="space-y-5" id="machine-pmplan-hub">
      {/* 1. TOP SUB-TAB NAVIGATION BAR */}
      <div className="bg-slate-900/95 border border-slate-800 p-2.5 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Sub-tab Switcher Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0" id="hub-machine-subtabs">
          
          {/* Sub-tab 1: ทะเบียนเครื่องจักร */}
          <button
            type="button"
            id="btn-subtab-machines"
            onClick={() => setActiveSubTab('machines')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer select-none ${
              activeSubTab === 'machines'
                ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-600 text-slate-950 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Activity size={17} className={activeSubTab === 'machines' ? 'text-slate-950 stroke-[2.5]' : 'text-cyan-400'} />
            <span>🏭 ทะเบียนเครื่องจักร</span>
            <span 
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeSubTab === 'machines' 
                  ? 'bg-slate-950/20 text-slate-950' 
                  : 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/30'
              }`}
            >
              {machines.length} เครื่อง
            </span>
          </button>

          {/* Sub-tab 2: แผน PM (หัวข้องาน) */}
          <button
            type="button"
            id="btn-subtab-pm-plans"
            onClick={() => setActiveSubTab('plans')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer select-none ${
              activeSubTab === 'plans'
                ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-600 text-slate-950 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <ClipboardList size={16} className={activeSubTab === 'plans' ? 'text-slate-950 stroke-[2.5]' : 'text-cyan-400'} />
            <span>⏱ แผน PM (หัวข้องาน)</span>
            <span 
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeSubTab === 'plans' 
                  ? 'bg-slate-950/20 text-slate-950' 
                  : 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/30'
              }`}
            >
              {pmPlans.length} แผน
            </span>
          </button>

          {/* Sub-tab 3: ตารางแผน PM (TBM Matrix) */}
          <button
            type="button"
            id="btn-subtab-tbm-matrix"
            onClick={() => setActiveSubTab('tbm')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer select-none ${
              activeSubTab === 'tbm'
                ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <CalendarRange size={16} className={activeSubTab === 'tbm' ? 'text-white stroke-[2.5]' : 'text-indigo-400'} />
            <span>📅 ตารางแผน PM (TBM Matrix)</span>
          </button>
        </div>

        {/* Info / Metric badge on the right */}
        <div className="hidden lg:flex items-center gap-3 px-3 py-1 bg-slate-800/50 border border-slate-700/60 rounded-xl text-xs">
          {activeSubTab === 'machines' ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <CheckCircle2 size={13} /> พร้อมใช้ {normalMachinesCount}
              </span>
              {brokenMachinesCount > 0 && (
                <span className="flex items-center gap-1 text-rose-400 font-semibold">
                  <AlertTriangle size={13} /> เสีย/ซ่อม {brokenMachinesCount}
                </span>
              )}
            </div>
          ) : activeSubTab === 'plans' ? (
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>มาสเตอร์ขั้นตอนและเวลามาตรฐาน (TTM) ประจำเครื่อง</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-indigo-300">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span>Time-Based Maintenance (TBM) รายปี/รายเดือน</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. SUB-PAGE CONTENT RENDER */}
      <div className="transition-opacity duration-200">
        {activeSubTab === 'machines' && (
          <div className="animate-fadeIn">
            <MachinePage onNavigateToTbm={handleNavigateToTbmForMachine} />
          </div>
        )}
        {activeSubTab === 'plans' && (
          <div className="animate-fadeIn">
            <PMPlanPage />
          </div>
        )}
        {activeSubTab === 'tbm' && (
          <div className="animate-fadeIn">
            <TBMPlanSchedulePage 
              initialMachineId={focusMachineId}
              onNavigateToSchedule={onNavigateToSchedule}
              onNavigateToHistory={onNavigateToHistory}
            />
          </div>
        )}
      </div>
    </div>
  );
};
