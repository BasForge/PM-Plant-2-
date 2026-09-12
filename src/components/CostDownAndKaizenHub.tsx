import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CostDown5Page } from './CostDown5Page';
import { ImprovementPage } from './ImprovementPage';
import { TrendingDown, PenTool, Sparkles, Layers, DollarSign, BookOpen } from 'lucide-react';

interface CostDownAndKaizenHubProps {
  defaultTab?: 'costdown' | 'kaizen';
}

export const CostDownAndKaizenHub: React.FC<CostDownAndKaizenHubProps> = ({ defaultTab = 'costdown' }) => {
  const { cd5Projects, improvements } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'costdown' | 'kaizen'>(defaultTab);

  // Calculate live summary for badges
  const totalAnnualSavings = cd5Projects.reduce((sum, p) => sum + (p.annualSavings || 0), 0);

  return (
    <div className="space-y-5" id="costdown-kaizen-hub">
      {/* 1. TOP SUB-TAB NAVIGATION BAR */}
      <div className="bg-slate-900/95 border border-slate-800 p-2.5 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Sub-tab Switcher Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0" id="hub-subtabs-group">
          
          {/* Sub-tab 1: Cost Down 5 (CD5) */}
          <button
            type="button"
            id="btn-subtab-costdown"
            onClick={() => setActiveSubTab('costdown')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer select-none ${
              activeSubTab === 'costdown'
                ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-slate-950 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <TrendingDown size={17} className={activeSubTab === 'costdown' ? 'text-slate-950 stroke-[2.5]' : 'text-emerald-400'} />
            <span>💰 Cost Down 5 (CD5)</span>
            <span 
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeSubTab === 'costdown' 
                  ? 'bg-slate-950/20 text-slate-950' 
                  : 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {cd5Projects.length} โครงการ
            </span>
          </button>

          {/* Sub-tab 2: งานพัฒนา Kaizen */}
          <button
            type="button"
            id="btn-subtab-kaizen"
            onClick={() => setActiveSubTab('kaizen')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer select-none ${
              activeSubTab === 'kaizen'
                ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 text-slate-950 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <PenTool size={16} className={activeSubTab === 'kaizen' ? 'text-slate-950 stroke-[2.5]' : 'text-cyan-400'} />
            <span>🔨 งานพัฒนา Kaizen & คลังความรู้</span>
            <span 
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeSubTab === 'kaizen' 
                  ? 'bg-slate-950/20 text-slate-950' 
                  : 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/30'
              }`}
            >
              {improvements.length} ผลงาน
            </span>
          </button>
        </div>

        {/* Info / Metric badge on the right */}
        <div className="hidden lg:flex items-center gap-3 px-3 py-1 bg-slate-800/50 border border-slate-700/60 rounded-xl text-xs">
          {activeSubTab === 'costdown' ? (
            <>
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <DollarSign size={14} />
                ยอดประหยัดรวม:
              </span>
              <span className="font-mono font-extrabold text-white text-sm">
                ฿{totalAnnualSavings.toLocaleString()} /ปี
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                <Sparkles size={14} />
                ศูนย์ความรู้:
              </span>
              <span className="text-slate-300">
                Kaizen, OPL, Failure Analysis & Why-Why
              </span>
            </>
          )}
        </div>
      </div>

      {/* 2. SUB-PAGE CONTENT RENDER */}
      <div className="transition-opacity duration-200">
        {activeSubTab === 'costdown' ? (
          <div className="animate-fadeIn">
            <CostDown5Page />
          </div>
        ) : (
          <div className="animate-fadeIn">
            <ImprovementPage />
          </div>
        )}
      </div>
    </div>
  );
};
