import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { DispatchPage } from './DispatchPage';
import { SetupPage } from './SetupPage';
import { Send, Clock, Users, Activity, CheckCircle2, SlidersHorizontal } from 'lucide-react';

interface SetupAndDispatchHubProps {
  defaultTab?: 'dispatch' | 'setup';
}

export const SetupAndDispatchHub: React.FC<SetupAndDispatchHubProps> = ({ defaultTab = 'dispatch' }) => {
  const { technicians, setupLogs, repairs } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'dispatch' | 'setup'>(defaultTab);

  useEffect(() => {
    setActiveSubTab(defaultTab);
  }, [defaultTab]);

  // Quick stats
  const activeTechnicians = technicians.filter(t => t.status === 'Active' || t.status === 'พร้อมปฏิบัติงาน' || !t.status).length;
  const activeRepairsCount = repairs.filter(r => r.status === 'Ongoing' || r.status === 'Pending').length;

  return (
    <div className="space-y-5" id="setup-dispatch-hub">
      {/* 1. TOP SUB-TAB NAVIGATION BAR */}
      <div className="bg-slate-900/95 border border-slate-800 p-2.5 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Sub-tab Switcher Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0" id="hub-dispatch-subtabs">
          
          {/* Sub-tab 1: ระบบจ่ายงาน */}
          <button
            type="button"
            id="btn-subtab-dispatch"
            onClick={() => setActiveSubTab('dispatch')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer select-none ${
              activeSubTab === 'dispatch'
                ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 text-slate-950 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Send size={16} className={activeSubTab === 'dispatch' ? 'text-slate-950 stroke-[2.5]' : 'text-cyan-400'} />
            <span>📋 ระบบควบคุมสั่งจ่ายงาน</span>
            <span 
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeSubTab === 'dispatch' 
                  ? 'bg-slate-950/20 text-slate-950' 
                  : 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/30'
              }`}
            >
              {technicians.length} ช่าง
            </span>
          </button>

          {/* Sub-tab 2: บันทึก Setup เครื่อง */}
          <button
            type="button"
            id="btn-subtab-setup"
            onClick={() => setActiveSubTab('setup')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer select-none ${
              activeSubTab === 'setup'
                ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-slate-950 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Clock size={16} className={activeSubTab === 'setup' ? 'text-slate-950 stroke-[2.5]' : 'text-emerald-400'} />
            <span>⏱ งาน Setup เครื่องจักร</span>
            <span 
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeSubTab === 'setup' 
                  ? 'bg-slate-950/20 text-slate-950' 
                  : 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {setupLogs.length} บันทึก
            </span>
          </button>
        </div>

        {/* Info badge on the right */}
        <div className="hidden lg:flex items-center gap-3 px-3.5 py-1.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs text-slate-300">
          {activeSubTab === 'dispatch' ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
                <Users size={13} />
                ช่างพร้อมปฏิบัติงาน: <strong className="text-white font-mono">{activeTechnicians}</strong> คน
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                <Activity size={13} />
                งานซ่อมค้างจ่าย/ดำเนินการ: <strong className="text-white font-mono">{activeRepairsCount}</strong> งาน
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 size={13} />
                บันทึกการตั้งเครื่องสะสม: <strong className="text-white font-mono">{setupLogs.length}</strong> รายการ
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                <SlidersHorizontal size={13} />
                เทียบเวลามาตรฐาน STD vs Actual
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. SUB-TAB VIEWPORT */}
      <div className="animate-in fade-in duration-200" key={activeSubTab}>
        {activeSubTab === 'dispatch' && <DispatchPage />}
        {activeSubTab === 'setup' && <SetupPage />}
      </div>
    </div>
  );
};
