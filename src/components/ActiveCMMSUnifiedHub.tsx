import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ActiveKnowledgeHub } from './knowledge/ActiveKnowledgeHub';
import { CostDown5Page } from './CostDown5Page';
import { 
  BookOpen, TrendingDown, Layers, Sparkles, 
  HelpCircle, ShieldCheck, DollarSign, ArrowUpRight
} from 'lucide-react';

export interface ActiveCMMSUnifiedHubProps {
  defaultTab?: 'knowledge' | 'costdown' | 'kaizen';
}

export const ActiveCMMSUnifiedHub: React.FC<ActiveCMMSUnifiedHubProps> = ({ defaultTab = 'knowledge' }) => {
  const { 
    knowledgeItems, 
    improvements, 
    cd5Projects, 
    kaizenNavigationFilter 
  } = useApp();

  const [activeMainTab, setActiveMainTab] = useState<'knowledge' | 'costdown'>(() => {
    if (defaultTab === 'costdown') return 'costdown';
    return 'knowledge';
  });

  // Calculate live summary
  const totalCd5Savings = (cd5Projects || []).reduce((sum, p) => sum + (p.annualSavings || 0), 0);
  const totalItemsCount = (knowledgeItems?.length || 0) + (improvements?.length || 0);

  return (
    <div className="space-y-5" id="active-cmms-unified-hub-root">
      {/* 1. TOP MASTER UNIFIED HEADER & TABS BAR */}
      <div className="bg-[#0b1325]/95 border border-slate-800 p-3 sm:p-4 rounded-3xl shadow-2xl backdrop-blur-xl space-y-4">
        {/* Top Header Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-blue-500/20 to-teal-500/20 border border-indigo-500/40 text-cyan-400 shadow-inner">
              <BookOpen size={24} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                  ศูนย์คลังความรู้ Active CMMS (Unified Knowledge Hub)
                </h1>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 font-bold border border-indigo-800/60">
                  Manual • WI • Troubleshoot • Why-Why • FA • OPL • Kaizen • MP
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-teal-950 text-teal-300 font-bold border border-teal-800/60">
                  ลดต้นทุน ฿{(totalCd5Savings / 1000).toFixed(0)}k/ปี
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ศูนย์กลางฐานความรู้ดิจิทัลเต็มรูปแบบ รวมคู่มือ, ขั้นตอนมาตรฐาน, วิเคราะห์อาการเสีย, สืบค้นเมื่อเคส Why-Why, FA, OPL, Kaizen และโครงการลดต้นทุน
              </p>
            </div>
          </div>
        </div>

        {/* 2-Tab Switcher: 1. Active CMMS (Full Knowledge Base including Kaizen, Why-Why, FA, OPL, MP) | 2. Cost Down 5 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Tab 1: Active CMMS Unified Hub */}
          <button
            type="button"
            id="btn-unified-tab-knowledge"
            onClick={() => setActiveMainTab('knowledge')}
            className={`p-3.5 rounded-2xl border transition-all text-left cursor-pointer flex items-center justify-between ${
              activeMainTab === 'knowledge'
                ? 'bg-gradient-to-r from-blue-950/90 via-indigo-950/80 to-blue-900/60 border-cyan-400 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/50'
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${activeMainTab === 'knowledge' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                <BookOpen size={20} />
              </div>
              <div>
                <span className={`text-sm font-black block ${activeMainTab === 'knowledge' ? 'text-white' : 'text-slate-300'}`}>
                  ศูนย์คลังความรู้ Active CMMS
                </span>
                <span className="text-[11px] text-slate-400">
                  Manual • WI/SOP • Troubleshoot • Why-Why • FA • OPL • Kaizen • MP
                </span>
              </div>
            </div>
            <span className={`text-xs font-mono font-black px-2.5 py-1 rounded-full ${
              activeMainTab === 'knowledge' ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}>
              {totalItemsCount} รายการ
            </span>
          </button>

          {/* Tab 2: Cost Down 5 */}
          <button
            type="button"
            id="btn-unified-tab-costdown"
            onClick={() => setActiveMainTab('costdown')}
            className={`p-3.5 rounded-2xl border transition-all text-left cursor-pointer flex items-center justify-between ${
              activeMainTab === 'costdown'
                ? 'bg-gradient-to-r from-teal-950/90 via-emerald-950/80 to-teal-900/60 border-teal-400 shadow-lg shadow-teal-500/20 ring-1 ring-teal-400/50'
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${activeMainTab === 'costdown' ? 'bg-teal-400 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                <TrendingDown size={20} />
              </div>
              <div>
                <span className={`text-sm font-black block ${activeMainTab === 'costdown' ? 'text-white' : 'text-slate-300'}`}>
                  Cost Down 5 (ลดต้นทุนอะไหล่)
                </span>
                <span className="text-[11px] text-teal-300 font-medium">
                  ประหยัดสะสม ฿{totalCd5Savings.toLocaleString()} / ปี
                </span>
              </div>
            </div>
            <span className={`text-xs font-mono font-black px-2.5 py-1 rounded-full ${
              activeMainTab === 'costdown' ? 'bg-teal-400 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}>
              {(cd5Projects || []).length} โครงการ
            </span>
          </button>
        </div>
      </div>

      {/* 2. BODY CONTENT */}
      <div id="unified-hub-active-panel">
        {activeMainTab === 'knowledge' && (
          <ActiveKnowledgeHub 
            onNavigateToKaizenTab={(tab) => {
              if (tab === 'costdown') {
                setActiveMainTab('costdown');
              }
            }}
          />
        )}

        {activeMainTab === 'costdown' && (
          <CostDown5Page />
        )}
      </div>
    </div>
  );
};
