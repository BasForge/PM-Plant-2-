import React, { useState } from 'react';
import { RepairLog, Machine } from '../../types';
import { 
  X, ExternalLink, Wrench, Clock, FileSpreadsheet, 
  Calendar, Layers, CheckCircle2, AlertTriangle, Eye, ArrowRight, HelpCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';

export interface BreakdownCasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  scopeLabel: string;
  timeLabel: string;
  metricLabel: string; // 'Breakdown (min)' หรือ 'จำนวนครั้ง Breakdown'
  cellValue: number | string;
  repairIds: string[];
  allRepairs: RepairLog[];
  machines: Machine[];
  isBaseline?: boolean;
  baselineYear?: number;
  baselineBDMin?: number;
  baselineCount?: number;
  onNavigateToRepairsPage?: (targetIds: string[], filterTitle: string) => void;
}

export const BreakdownCasesModal: React.FC<BreakdownCasesModalProps> = ({
  isOpen,
  onClose,
  title,
  scopeLabel,
  timeLabel,
  metricLabel,
  cellValue,
  repairIds,
  allRepairs,
  machines,
  isBaseline = false,
  baselineYear,
  baselineBDMin = 0,
  baselineCount = 0,
  onNavigateToRepairsPage
}) => {
  const [selectedRepairDetail, setSelectedRepairDetail] = useState<RepairLog | null>(null);

  if (!isOpen) return null;

  // Filter matching repairs by repairIds
  const matchingRepairs = allRepairs.filter(r => repairIds.includes(r.id));
  
  // Sort newest first
  const sortedRepairs = [...matchingRepairs].sort((a, b) => {
    const tA = new Date(a.breakdownTime || a.date).getTime();
    const tB = new Date(b.breakdownTime || b.date).getTime();
    return tB - tA;
  });

  const totalMinutes = matchingRepairs.reduce((sum, r) => sum + (r.duration || 0), 0);
  const totalCost = matchingRepairs.reduce((sum, r) => sum + (r.otherCost || 0), 0);

  // Helper to export this specific cases list to CSV
  const handleExportCasesExcel = () => {
    if (matchingRepairs.length === 0) return;
    const rows = matchingRepairs.map((r, idx) => {
      const mach = machines.find(m => m.id === r.machineId);
      return {
        'ลำดับ': idx + 1,
        'รหัสใบงาน': r.id,
        'วันที่เกิดเหตุ': r.breakdownTime ? r.breakdownTime.replace('T', ' ') : r.date,
        'รหัสเครื่องจักร': r.machineId,
        'ชื่อเครื่องจักร': mach?.name || '-',
        'หมวดหมู่งาน': r.stoppageType || 'Breakdown',
        'เวลาหยุดเครื่อง MTTR (นาที)': r.duration || 0,
        'อาการเสียชำรุด': r.symptoms || '-',
        'การแก้ไข': r.correctiveAction || '-',
        'Why 1': r.why1 || '-',
        'ช่างผู้ปฏิบัติงาน': (r.technicians && r.technicians.length > 0) ? r.technicians.join(', ') : (r.technician || '-'),
        'สถานะ': r.status || 'ปิดงาน'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Breakdown_Cases');
    const safeTitle = title.replace(/[\/\\?%*:|"<>]/g, '_');
    XLSX.writeFile(workbook, `Breakdown_Cases_${safeTitle}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleOpenInMainPage = () => {
    if (onNavigateToRepairsPage) {
      onNavigateToRepairsPage(repairIds, `${scopeLabel} (${timeLabel})`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-[#0b1325] border border-cyan-500/40 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-cyan-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-[#0c1830] via-[#0b1426] to-[#0c1830] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5 sm:mt-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/40">
                  {metricLabel}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  {title}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                <span>ขอบเขต: <strong className="text-cyan-300">{scopeLabel}</strong></span>
                <span>•</span>
                <span>ช่วงเวลา: <strong className="text-slate-200">{timeLabel}</strong></span>
              </p>
            </div>
          </div>

          {/* Action buttons in header */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {matchingRepairs.length > 0 && onNavigateToRepairsPage && (
              <button
                type="button"
                onClick={handleOpenInMainPage}
                className="px-3 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-900/30 transition cursor-pointer"
                title="คลิกเพื่อกระโดดไปยังหน้าประวัติซ่อมหลักพร้อมตัวกรองนี้"
              >
                <span>เปิดในหน้าประวัติซ่อม</span>
                <ExternalLink size={14} />
              </button>
            )}

            {matchingRepairs.length > 0 && (
              <button
                type="button"
                onClick={handleExportCasesExcel}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 text-xs transition cursor-pointer"
                title="ส่งออกรายการนี้เป็น Excel (.xlsx)"
              >
                <FileSpreadsheet size={16} />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 2. STATS CHIPS BAR */}
        <div className="px-5 py-3 bg-[#0a101f] border-b border-slate-800/80 flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-slate-400">จำนวนครั้ง Breakdown:</span>
            <strong className="text-cyan-400 font-mono text-sm">
              {isBaseline && matchingRepairs.length === 0 ? baselineCount : matchingRepairs.length} ครั้ง
            </strong>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
            <Clock size={13} className="text-rose-400" />
            <span className="text-slate-400">รวมเวลาหยุดเครื่อง:</span>
            <strong className="text-rose-400 font-mono text-sm">
              {(isBaseline && matchingRepairs.length === 0 ? baselineBDMin : totalMinutes).toLocaleString()} นาที
            </strong>
          </div>

          {totalCost > 0 && (
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
              <span className="text-slate-400">ค่าซ่อม/อะไหล่:</span>
              <strong className="text-amber-400 font-mono text-sm">
                {totalCost.toLocaleString()} ฿
              </strong>
            </div>
          )}

          {isBaseline && matchingRepairs.length === 0 && (
            <span className="text-[11px] text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-lg flex items-center gap-1">
              <AlertTriangle size={11} /> ข้อมูลประวัติศาสตร์ตั้งต้น (Baseline Summary)
            </span>
          )}
        </div>

        {/* 3. CASES CONTENT BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Case A: Is Baseline and No Raw Slips in system */}
          {isBaseline && matchingRepairs.length === 0 ? (
            <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-6 text-center space-y-4 my-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                <Calendar className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h4 className="text-base font-bold text-amber-200">
                  ข้อมูลสรุปประวัติศาสตร์ปี {baselineYear}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  ตัวเลขยอดหยุดเครื่อง <strong className="text-white font-mono">{baselineBDMin.toLocaleString()} นาที</strong> ({baselineCount} ครั้ง) เป็นข้อมูลสรุป Baseline ที่ถูกบันทึกไว้ในระบบจากรายงานประจำปีเดิม ยังไม่มีการนำเข้าใบแจ้งซ่อมรายวันของปี {baselineYear}
                </p>
              </div>

              {onNavigateToRepairsPage && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateToRepairsPage([], `ประวัติซ่อมปี ${baselineYear}`);
                      onClose();
                    }}
                    className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-bold transition shadow-lg cursor-pointer inline-flex items-center gap-2"
                  >
                    <span>ไปหน้าประวัติซ่อม เพื่อดูหรือบันทึกข้อมูลย้อนหลัง</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          ) : matchingRepairs.length === 0 ? (
            /* Case B: No Repairs found */
            <div className="text-center py-16 text-slate-500 bg-slate-900/30 rounded-2xl border border-slate-800">
              <Wrench className="w-10 h-10 mx-auto opacity-30 mb-2" />
              <p className="text-sm font-semibold">ไม่พบข้อมูลประวัติงานซ่อมสำหรับช่วงเวลานี้</p>
              <p className="text-xs text-slate-500 mt-1">เครื่องจักรไม่มีประวัติ Breakdown ในเงื่อนไขที่เลือก (0 ครั้ง)</p>
            </div>
          ) : (
            /* Case C: Matching Repairs Table */
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800/90 border-b border-slate-700 text-slate-300 font-semibold tracking-wide uppercase">
                      <th className="py-3 px-3 w-12 text-center">#</th>
                      <th className="py-3 px-3 w-28">วันที่เสีย</th>
                      <th className="py-3 px-3 w-24 font-mono">เครื่อง (ID)</th>
                      <th className="py-3 px-3">ชื่อเครื่องจักร</th>
                      <th className="py-3 px-2 text-center w-28">ประเภท</th>
                      <th className="py-3 px-3 text-center">MTTR (นาที)</th>
                      <th className="py-3 px-3 text-center">Std. MTTR</th>
                      <th className="py-3 px-4 min-w-[200px]">อาการเสียชำรุด</th>
                      <th className="py-3 px-3 min-w-[150px]">WHY 1</th>
                      <th className="py-3 px-3 text-center">ช่างซ่อม</th>
                      <th className="py-3 px-2 text-center w-20">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {sortedRepairs.map((r, idx) => {
                      const mach = machines.find(m => m.id === r.machineId);
                      const isHighMttr = (r.duration || 0) > 120;
                      return (
                        <tr 
                          key={r.id} 
                          className="hover:bg-cyan-950/20 transition group"
                        >
                          <td className="py-3 px-3 text-center text-slate-500 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-200">
                            <div>{r.breakdownTime ? r.breakdownTime.slice(0, 10) : r.date}</div>
                            {r.breakdownTime && r.breakdownTime.includes('T') && (
                              <div className="text-[10px] text-slate-500">{r.breakdownTime.slice(11, 16)} น.</div>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-cyan-400">
                            {r.machineId}
                          </td>
                          <td className="py-3 px-3 font-medium text-white">
                            {mach?.name || r.machineId}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-950/80 text-rose-300 border border-rose-500/40">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                              Breakdown
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold">
                            <span className={`px-2 py-0.5 rounded ${isHighMttr ? 'text-rose-300 bg-rose-950/60 font-black' : 'text-slate-200'}`}>
                              {r.duration || 0} นาที
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-400 text-[11px]">
                            60 นาที
                          </td>
                          <td className="py-3 px-4 text-slate-200 leading-snug">
                            {r.symptoms || '-'}
                          </td>
                          <td className="py-3 px-3 text-slate-400 italic text-[11px]">
                            {r.why1 || '-'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-800 text-cyan-300 font-semibold text-[11px] border border-slate-700">
                              {(r.technicians && r.technicians.length > 0) ? r.technicians.join(', ') : (r.technician || 'ช่างประจำกะ')}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedRepairDetail(r)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white transition cursor-pointer"
                              title="ดูรายละเอียดใบงานซ่อม"
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 4. MODAL FOOTER */}
        <div className="p-4 border-t border-slate-800 bg-[#0c1830] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400">
            แสดงข้อมูลประวัติงานซ่อมจริงจากฐานข้อมูลโรงงาน ({matchingRepairs.length} รายการ)
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {matchingRepairs.length > 0 && onNavigateToRepairsPage && (
              <button
                type="button"
                onClick={handleOpenInMainPage}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer"
              >
                <span>เปิดในหน้าประวัติซ่อมหลัก</span>
                <ExternalLink size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              ปิด
            </button>
          </div>
        </div>

        {/* 5. SUB-MODAL: INDIVIDUAL REPAIR SLIP DETAIL VIEW */}
        {selectedRepairDetail && (
          <div 
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
            onClick={() => setSelectedRepairDetail(null)}
          >
            <div 
              className="bg-[#0f172a] border border-cyan-500/50 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-5 shadow-2xl text-xs space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <Wrench className="text-cyan-400 w-5 h-5" />
                  <h4 className="text-sm font-bold text-white">รายละเอียดใบงานซ่อม: {selectedRepairDetail.id}</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRepairDetail(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
                <div>
                  <span className="text-slate-400">รหัสเครื่องจักร:</span>
                  <div className="font-bold text-cyan-300 font-mono text-sm">{selectedRepairDetail.machineId}</div>
                </div>
                <div>
                  <span className="text-slate-400">วันที่และเวลาเสีย:</span>
                  <div className="font-medium text-white">{selectedRepairDetail.breakdownTime || selectedRepairDetail.date}</div>
                </div>
                <div>
                  <span className="text-slate-400">เวลาซ่อม MTTR:</span>
                  <div className="font-bold text-rose-400 text-sm font-mono">{selectedRepairDetail.duration} นาที</div>
                </div>
                <div>
                  <span className="text-slate-400">ช่างผู้รับผิดชอบ:</span>
                  <div className="font-medium text-emerald-400">
                    {selectedRepairDetail.technicians?.join(', ') || selectedRepairDetail.technician}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-300">อาการเสียชำรุด:</span>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-slate-200">
                  {selectedRepairDetail.symptoms || '-'}
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-300">การแก้ไขและมาตรการ:</span>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-slate-200">
                  {selectedRepairDetail.correctiveAction || '-'}
                </div>
              </div>

              {(selectedRepairDetail.why1 || selectedRepairDetail.why2) && (
                <div className="space-y-2">
                  <span className="font-bold text-cyan-300">ผลการวิเคราะห์สาเหตุ (Why-Why Analysis):</span>
                  <div className="space-y-1.5 p-3 bg-slate-900 rounded-xl border border-cyan-500/20">
                    {selectedRepairDetail.why1 && <div><strong>Why 1:</strong> <span className="text-slate-300">{selectedRepairDetail.why1}</span></div>}
                    {selectedRepairDetail.why2 && <div><strong>Why 2:</strong> <span className="text-slate-300">{selectedRepairDetail.why2}</span></div>}
                    {selectedRepairDetail.why3 && <div><strong>Why 3:</strong> <span className="text-slate-300">{selectedRepairDetail.why3}</span></div>}
                    {selectedRepairDetail.why4 && <div><strong>Why 4:</strong> <span className="text-slate-300">{selectedRepairDetail.why4}</span></div>}
                    {selectedRepairDetail.why5 && <div><strong>Why 5:</strong> <span className="text-slate-300">{selectedRepairDetail.why5}</span></div>}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedRepairDetail(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold transition"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
