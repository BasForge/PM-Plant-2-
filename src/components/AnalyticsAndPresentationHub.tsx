import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { DashboardPage } from './DashboardPage';
import { PresentationPage } from './PresentationPage';
import { BarChart3, Presentation, TrendingUp, Sparkles, Award, ShieldCheck } from 'lucide-react';

interface AnalyticsAndPresentationHubProps {
  defaultTab?: 'analytics' | 'presentation';
}

export const AnalyticsAndPresentationHub: React.FC<AnalyticsAndPresentationHubProps> = ({ defaultTab = 'analytics' }) => {
  const { repairs, machines, pmPlans, schedules } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'presentation'>(defaultTab);

  useEffect(() => {
    setActiveSubTab(defaultTab);
  }, [defaultTab]);

  // Quick statistics
  const totalRepairs = repairs.length;
  const completedPM = schedules.filter(s => s.status === 'Completed' || s.actualDate).length;
  const totalMachines = machines.length;

  return (
    <div className="space-y-5" id="analytics-presentation-hub">
      {/* 1. TOP SUB-TAB NAVIGATION BAR */}
      <div className="bg-slate-900/95 border border-slate-800 p-2.5 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Sub-tab Switcher Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0" id="hub-analytics-subtabs">
          
          {/* Sub-tab 1: ระบบสถิติ & Dashboard */}
          <button
            type="button"
            id="btn-subtab-analytics"
            onClick={() => setActiveSubTab('analytics')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer select-none ${
              activeSubTab === 'analytics'
                ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 text-slate-950 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <BarChart3 size={16} className={activeSubTab === 'analytics' ? 'text-slate-950 stroke-[2.5]' : 'text-cyan-400'} />
            <span>📊 ระบบสถิติ & MTTR/MTBF</span>
            <span 
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeSubTab === 'analytics' 
                  ? 'bg-slate-950/20 text-slate-950' 
                  : 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/30'
              }`}
            >
              KPI Dashboard
            </span>
          </button>

          {/* Sub-tab 2: สรุปนำเสนอผู้บริหาร */}
          <button
            type="button"
            id="btn-subtab-presentation"
            onClick={() => setActiveSubTab('presentation')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer select-none ${
              activeSubTab === 'presentation'
                ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-rose-600 text-white shadow-lg shadow-purple-500/20 ring-1 ring-purple-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Presentation size={16} className={activeSubTab === 'presentation' ? 'text-white stroke-[2.5]' : 'text-purple-400'} />
            <span>📈 สรุปผลงาน & บอร์ดนำเสนอ</span>
            <span 
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeSubTab === 'presentation' 
                  ? 'bg-purple-950/40 text-purple-200' 
                  : 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
              }`}
            >
              Executive Deck
            </span>
          </button>
        </div>

        {/* Info badge on the right */}
        <div className="hidden lg:flex items-center gap-3 px-3.5 py-1.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs text-slate-300">
          {activeSubTab === 'analytics' ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
                <TrendingUp size={13} />
                เครื่องจักรในระบบ: <strong className="text-white font-mono">{totalMachines}</strong> เครื่อง
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <ShieldCheck size={13} />
                ประวัติงานซ่อมวิเคราะห์: <strong className="text-white font-mono">{totalRepairs}</strong> เคส
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-purple-300 font-medium">
                <Award size={13} />
                รายงานผลการดำเนินงานซ่อมบำรุงประจำเดือน
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1.5 text-pink-300 font-medium">
                <Sparkles size={13} />
                พร้อมส่งออกและสรุปผู้บริหาร
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. SUB-TAB VIEWPORT */}
      <div className="animate-in fade-in duration-200" key={activeSubTab}>
        {activeSubTab === 'analytics' && <DashboardPage />}
        {activeSubTab === 'presentation' && <PresentationPage />}
      </div>
    </div>
  );
};
