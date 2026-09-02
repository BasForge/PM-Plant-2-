import React from 'react';
import { Calendar, Clock, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';
import { CD5Project } from '../../types';

interface CD5LifespanMeterProps {
  project: CD5Project;
  showDetails?: boolean;
}

export const CD5LifespanMeter: React.FC<CD5LifespanMeterProps> = ({ project, showDetails = false }) => {
  const origDays = Math.max(1, project.originalLifespanDays || 1);
  const newTargetDays = Math.max(1, project.newLifespanDays || 1);
  
  // Calculate running days based on installedDate
  const calculateRunningDays = (): number => {
    if (!project.installedDate) return 0;
    const installTime = new Date(project.installedDate).getTime();
    if (isNaN(installTime)) return 0;
    const nowTime = new Date().getTime();
    const diffDays = Math.floor((nowTime - installTime) / (1000 * 3600 * 24));
    return Math.max(0, diffDays);
  };

  const actualRunningDays = calculateRunningDays();
  const hasInstalled = Boolean(project.installedDate && actualRunningDays > 0);

  // Compare against OEM
  const isSurpassedOem = actualRunningDays >= origDays;
  const isSurpassedTarget = actualRunningDays >= newTargetDays;
  const diffFromOemDays = actualRunningDays - origDays;
  const diffFromOemPercent = origDays > 0 ? Number(((diffFromOemDays / origDays) * 100).toFixed(1)) : 0;

  // Max gauge scale for visual calculation
  const maxScale = Math.max(origDays, newTargetDays, actualRunningDays) * 1.15;
  const origPercentWidth = Math.min(100, Math.round((origDays / maxScale) * 100));
  const actualPercentWidth = Math.min(100, Math.round((actualRunningDays / maxScale) * 100));
  const targetPercentWidth = Math.min(100, Math.round((newTargetDays / maxScale) * 100));

  const formattedDate = project.installedDate 
    ? new Date(project.installedDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'ยังไม่ได้ระบุ';

  return (
    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2" id="cd5-lifespan-meter">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-1 border-b border-slate-800/80 pb-1.5">
        <div className="flex items-center gap-1.5 text-xs text-slate-300">
          <Calendar size={13} className="text-emerald-400" />
          <span>วันที่เริ่มใช้งาน:</span>
          <b className="text-white font-mono">{formattedDate}</b>
        </div>

        {hasInstalled ? (
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-400">เดินเครื่องสะสมแล้ว:</span>
            <span className={`text-xs font-black px-2 py-0.5 rounded font-mono ${
              isSurpassedOem ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}>
              {actualRunningDays} วัน
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-slate-500 italic">รอระบุวันเริ่มติดตั้งใช้งาน</span>
        )}
      </div>

      {/* Visual Lifespan Comparison Meter */}
      <div className="space-y-1.5 pt-0.5">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>🔴 OEM เดิม: <b className="text-rose-300">{origDays} วัน</b></span>
          <span>🟢 จริงปัจจุบัน: <b className="text-emerald-300 font-mono">{actualRunningDays} วัน</b></span>
          <span>🎯 เป้าหมาย CD5: <b className="text-cyan-300">{newTargetDays} วัน</b></span>
        </div>

        {/* Multi-layered progress bar */}
        <div className="relative h-4 bg-slate-900 rounded-full border border-slate-800 overflow-hidden flex items-center">
          {/* OEM marker background */}
          <div 
            className="absolute top-0 bottom-0 left-0 bg-rose-500/20 border-r-2 border-rose-500/60 z-0"
            style={{ width: `${origPercentWidth}%` }}
            title={`OEM เดิม: ${origDays} วัน`}
          />

          {/* Target CD5 line marker */}
          <div 
            className="absolute top-0 bottom-0 border-r-2 border-dashed border-cyan-400/80 z-10"
            style={{ left: `${targetPercentWidth}%` }}
            title={`เป้าหมาย CD5: ${newTargetDays} วัน`}
          />

          {/* Actual running fill */}
          {hasInstalled && (
            <div 
              className={`h-full transition-all duration-500 rounded-full flex items-center justify-end pr-1 text-[9px] font-black text-white ${
                isSurpassedTarget 
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-400'
                  : isSurpassedOem 
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-500' 
                  : 'bg-gradient-to-r from-amber-600 to-emerald-500'
              }`}
              style={{ width: `${Math.max(8, actualPercentWidth)}%` }}
            >
              {actualRunningDays}ว.
            </div>
          )}
        </div>
      </div>

      {/* Comparison badge verdict */}
      {hasInstalled && (
        <div className="flex items-center justify-between text-[11px] pt-1">
          {isSurpassedOem ? (
            <div className="flex items-center gap-1 text-emerald-400 font-bold">
              <TrendingUp size={13} />
              <span>ยืดอายุเกิน OEM เดิมแล้ว <span className="text-white font-black font-mono">+{diffFromOemDays} วัน</span> (+{diffFromOemPercent}%) 🚀</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-amber-400 font-semibold text-[10px]">
              <Clock size={12} />
              <span>กำลังใช้งาน (อีก {origDays - actualRunningDays} วัน จะเท่าอายุ OEM เดิม)</span>
            </div>
          )}

          {project.usageHistory && project.usageHistory.length > 0 && (
            <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 font-mono">
              ประวัติสะสม {project.usageHistory.length} รอบ
            </span>
          )}
        </div>
      )}

      {showDetails && project.usageHistory && project.usageHistory.length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-800 space-y-1.5">
          <p className="text-[11px] font-bold text-slate-300">ประวัติการใช้งานและผลการตรวจเช็คล่าสุด:</p>
          {project.usageHistory.slice(-2).map((item, idx) => {
            const isOngoing = item.status === 'ACTIVE_RUNNING' || !item.replacedDate;
            const dynamicRunningDays = (isOngoing && item.installedDate)
              ? Math.max(1, Math.floor((new Date().getTime() - new Date(item.installedDate).getTime()) / (1000 * 3600 * 24)))
              : (item.actualRunningDays || 1);

            return (
              <div key={item.id || idx} className="text-[10px] bg-slate-900/90 p-2 rounded border border-slate-800 flex items-start justify-between gap-2">
                <div>
                  <span className="font-bold text-cyan-300 font-mono">รอบที่ {item.cycleNumber}:</span> {item.installedDate} {item.replacedDate ? `➔ ${item.replacedDate}` : '(กำลังใช้งาน)'}
                  <p className="text-slate-400 mt-0.5 italic">"{item.wearCondition || item.notes || 'ตรวจเช็คตามเกณฑ์'}"</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-emerald-400 block">{dynamicRunningDays} วัน</span>
                  <span className="text-slate-500">โดย {item.technician}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
