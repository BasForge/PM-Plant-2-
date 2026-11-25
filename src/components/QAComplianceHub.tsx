import React, { useMemo, useState } from 'react';
import { SlidersHorizontal, Cpu, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LevelingFootDashboardPage } from './LevelingFootDashboardPage';
import { IAssureDashboardPage } from './IAssureDashboardPage';

type QATab = 'levelingFoot' | 'iAssure';

export const QAComplianceHub: React.FC = () => {
  const { levelingFootItems, iAssureItems } = useApp();
  const [activeTab, setActiveTab] = useState<QATab>('levelingFoot');

  const summary = useMemo(() => {
    const lfTargets = levelingFootItems.filter((i) => i.rowType === 'ITEM');
    const lfDone = lfTargets.filter((i) => i.status === 'COMPLETED').length;
    const lfPct = lfTargets.length > 0 ? Math.round((lfDone / lfTargets.length) * 100) : 0;

    const iaTotal = iAssureItems.length;
    const iaActive = iAssureItems.filter((i) => i.status === 'ACTIVE').length;
    const iaPct = iaTotal > 0 ? Math.round((iaActive / iaTotal) * 100) : 0;

    return {
      lfDone,
      lfTotal: lfTargets.length,
      lfPct,
      iaActive,
      iaTotal,
      iaPct
    };
  }, [levelingFootItems, iAssureItems]);

  return (
    <div id="qa-compliance-hub-root" className="space-y-4">
      {/* Top QA Hub Tab Switcher */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-white tracking-tight">
              ศูนย์ติดตามงาน QA — ขาฉิ่ง &amp; iAssure
            </h2>
            <p className="text-[11px] text-slate-400">
              สลับดู Dashboard ความคืบหน้าแยกตามโครงการ QA ได้ทันที
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="qa-tab-leveling-foot"
            onClick={() => setActiveTab('levelingFoot')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'levelingFoot'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-slate-950/60 text-slate-300 border border-slate-800 hover:border-slate-600'
            }`}
          >
            <SlidersHorizontal size={14} />
            <span>สำรวจ &amp; เปลี่ยนขาฉิ่ง</span>
            <span
              className={`font-mono text-[11px] ${
                activeTab === 'levelingFoot' ? 'text-slate-900 font-extrabold' : 'text-cyan-400'
              }`}
            >
              {summary.lfDone}/{summary.lfTotal} ({summary.lfPct}%)
            </span>
          </button>

          <button
            type="button"
            id="qa-tab-iassure"
            onClick={() => setActiveTab('iAssure')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'iAssure'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-950/60 text-slate-300 border border-slate-800 hover:border-slate-600'
            }`}
          >
            <Cpu size={14} />
            <span>iAssure Videojet 6530</span>
            <span
              className={`font-mono text-[11px] ${
                activeTab === 'iAssure' ? 'text-slate-900 font-extrabold' : 'text-emerald-400'
              }`}
            >
              {summary.iaActive}/{summary.iaTotal} ({summary.iaPct}%)
            </span>
          </button>
        </div>
      </div>

      {/* Active Tab Content */}
      {activeTab === 'levelingFoot' ? <LevelingFootDashboardPage /> : <IAssureDashboardPage />}
    </div>
  );
};
