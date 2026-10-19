import React, { useState } from 'react';
import { 
  X, HelpCircle, CheckCircle2, AlertTriangle, Flame, ShieldAlert,
  Clock, Activity, BookOpen, Layers, Check, Search, FileSpreadsheet
} from 'lucide-react';
import { CPRAM_LOSSES_STANDARD, StoppageType, STOPPAGE_TYPE_DEFINITIONS } from '../../types';

interface CPRAMLossesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLossType?: (type: StoppageType) => void;
  currentSelectedType?: StoppageType;
}

export const CPRAMLossesModal: React.FC<CPRAMLossesModalProps> = ({
  isOpen,
  onClose,
  onSelectLossType,
  currentSelectedType
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'SHUTDOWN' | 'BREAKDOWN' | 'STARTUP' | 'ADJUSTMENT' | 'MINOR'>('ALL');

  if (!isOpen) return null;

  const losses = CPRAM_LOSSES_STANDARD.losses.filter(item => {
    if (activeTab === 'SHUTDOWN' && item.type !== 'SHUTDOWN') return false;
    if (activeTab === 'BREAKDOWN' && item.type !== 'BREAKDOWN') return false;
    if (activeTab === 'STARTUP' && item.type !== 'STARTUP') return false;
    if (activeTab === 'ADJUSTMENT' && item.type !== 'ADJUSTMENT_LOSS') return false;
    if (activeTab === 'MINOR' && item.type !== 'MINOR_STOPPAGE') return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      item.thaiName.toLowerCase().includes(q) ||
      item.definition.toLowerCase().includes(q) ||
      item.topicName.toLowerCase().includes(q) ||
      item.examples.some(ex => ex.toLowerCase().includes(q))
    );
  });

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-[#0b1325] border border-slate-700 rounded-3xl max-w-6xl w-full max-h-[94vh] flex flex-col shadow-2xl shadow-cyan-950/50 overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-rose-950/30 to-slate-900 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-rose-500/20 via-amber-500/20 to-cyan-500/20 border border-rose-500/40 text-rose-300 shadow-inner">
              <BookOpen size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  {CPRAM_LOSSES_STANDARD.title}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800/60">
                  มาตรฐานนิยามโรงงาน
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                เกณฑ์มาตรฐานสำหรับจำแนกงานบันทึกประวัติซ่อมบำรุง: Breakdown • Minor Stoppage • Adjustment Loss • Shutdown • Start Up
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer shrink-0"
            title="ปิดหน้าต่าง"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar & Filter Bar */}
        <div className="p-3 sm:px-5 border-b border-slate-800/80 bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-xs">
          {/* Quick tab filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer font-bold whitespace-nowrap ${
                activeTab === 'ALL'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              ทั้งหมด (5 หัวข้อ)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SHUTDOWN')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer font-bold whitespace-nowrap flex items-center gap-1 ${
                activeTab === 'SHUTDOWN'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-800 text-blue-300 hover:text-white'
              }`}
            >
              <span>🔵 1. Shutdown / Plan Downtime</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('BREAKDOWN')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer font-bold whitespace-nowrap flex items-center gap-1 ${
                activeTab === 'BREAKDOWN'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-slate-800 text-rose-300 hover:text-white'
              }`}
            >
              <Flame size={12} />
              <span>🔴 4. Breakdown</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('STARTUP')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer font-bold whitespace-nowrap flex items-center gap-1 ${
                activeTab === 'STARTUP'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-800 text-purple-300 hover:text-white'
              }`}
            >
              <span>🟣 5. Start up2</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ADJUSTMENT')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer font-bold whitespace-nowrap flex items-center gap-1 ${
                activeTab === 'ADJUSTMENT'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-slate-800 text-orange-300 hover:text-white'
              }`}
            >
              <span>🟠 7. Adjustment loss</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('MINOR')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer font-bold whitespace-nowrap flex items-center gap-1 ${
                activeTab === 'MINOR'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-slate-800 text-amber-300 hover:text-white'
              }`}
            >
              <Activity size={12} />
              <span>🟡 12. Minor stoppage</span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหานิยาม, ตัวอย่างอาการ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Quick Decision Rule Banner (หัวใจสำคัญตามนิยามโรงงาน) */}
        <div className="p-3.5 bg-gradient-to-r from-rose-950/30 via-slate-900 to-amber-950/20 border-b border-slate-800 text-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-[11px]">
                🔑 เกณฑ์ตัดสินหลัก
              </span>
              <span className="text-slate-300">
                จำแนกระหว่าง <strong>Breakdown (4)</strong> vs <strong>Adjustment (7)</strong> vs <strong>Minor Stoppage (12)</strong>:
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full md:w-auto text-[11px]">
              <div className="px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-700/60 text-rose-200">
                🔴 <strong>Breakdown (4):</strong> ชิ้นส่วนเสียหาย (ซ่อม/เปลี่ยนอะไหล่) <u>หรือ</u> ซ่อม &gt; 1 นาที
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-700/60 text-amber-200">
                🟡 <strong>Minor Stoppage (12):</strong> ไม่ชำรุด ปรับแต่ง &lt; 15 นาที (นับเป็นจำนวนครั้ง)
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-orange-950/60 border border-orange-700/60 text-orange-200">
                🟠 <strong>Adjustment (7):</strong> ไม่ชำรุด ปรับแต่งคุณภาพ &gt; 15 นาที (นับเป็นเวลา)
              </div>
            </div>
          </div>
        </div>

        {/* Main Table Content */}
        <div className="p-3 sm:p-5 overflow-auto flex-1 space-y-4">
          <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/60 shadow-inner">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#0f172a] text-slate-300 font-bold border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="py-3 px-3.5 w-60 border-r border-slate-800/80">
                    ประเภทความสูญเสีย (Losses Type)
                  </th>
                  <th className="py-3 px-3.5 border-r border-slate-800/80 min-w-[280px]">
                    คำนิยาม (Definition)
                  </th>
                  <th className="py-3 px-2.5 text-center w-28 border-r border-slate-800/80">
                    ชื่อหัวข้อ
                  </th>
                  <th className="py-3 px-2.5 text-center w-28 border-r border-slate-800/80">
                    Downtime Type
                  </th>
                  <th className="py-3 px-2.5 text-center w-28 border-r border-slate-800/80">
                    หน่วยวัด (Unit)
                  </th>
                  <th className="py-3 px-3.5 min-w-[240px]">
                    ตัวอย่าง (Example)
                  </th>
                  {onSelectLossType && (
                    <th className="py-3 px-3 text-center w-24">
                      เลือกใช้
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-medium">
                {losses.length === 0 ? (
                  <tr>
                    <td colSpan={onSelectLossType ? 7 : 6} className="py-8 text-center text-slate-500">
                      ไม่พบข้อมูลตามคำค้นหา "{searchTerm}"
                    </td>
                  </tr>
                ) : (
                  losses.map((item) => {
                    const isSelected = currentSelectedType === item.type;
                    const isBreakdown = item.type === 'BREAKDOWN';
                    const isMinor = item.type === 'MINOR_STOPPAGE';
                    const isAdj = item.type === 'ADJUSTMENT_LOSS';

                    return (
                      <tr 
                        key={item.lossNumber}
                        className={`transition hover:bg-slate-850/50 ${
                          isBreakdown 
                            ? 'bg-rose-950/20' 
                            : isMinor 
                            ? 'bg-amber-950/15' 
                            : isAdj
                            ? 'bg-orange-950/15'
                            : ''
                        } ${isSelected ? 'ring-2 ring-cyan-500/60' : ''}`}
                      >
                        {/* 1. ประเภทความสูญเสีย */}
                        <td className="py-3.5 px-3.5 border-r border-slate-800/80 align-top">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                isBreakdown ? 'bg-rose-500 animate-pulse' : isMinor ? 'bg-amber-400' : isAdj ? 'bg-orange-400' : 'bg-blue-400'
                              }`}></span>
                              <strong className={`font-black text-[12px] ${
                                isBreakdown ? 'text-rose-200' : isMinor ? 'text-amber-200' : isAdj ? 'text-orange-200' : 'text-slate-200'
                              }`}>
                                {item.thaiName}
                              </strong>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 inline-block">
                              Loss #{item.lossNumber}
                            </span>
                          </div>
                        </td>

                        {/* 2. คำนิยาม (Definition) */}
                        <td className="py-3.5 px-3.5 border-r border-slate-800/80 align-top leading-relaxed text-slate-200">
                          {isBreakdown ? (
                            <div>
                              <span>เวลาที่เครื่องจักรหยุดในขณะทำการผลิต อันเนื่องมาจากชิ้นส่วนเครื่องจักรเสียหาย </span>
                              <strong className="text-cyan-300 font-bold bg-cyan-950/60 px-1 py-0.5 rounded border border-cyan-800/40">
                                (มีการซ่อมแซม หรือเปลี่ยนอะไหล่)
                              </strong>
                              <span> หรือเหตุขัดข้องที่ต้องใช้เวลาซ่อม</span>
                              <strong className="text-rose-300 font-black bg-rose-950/80 px-1 py-0.5 rounded border border-rose-800/60 ml-1">
                                มากกว่า 1 นาที****
                              </strong>
                            </div>
                          ) : isAdj ? (
                            <div>
                              <span>เวลาที่เครื่องจักรหยุดในระหว่างผลิตเพื่อปรับแต่ง เนื่องจากมีผลต่อคุณภาพสินค้า นับตั้งแต่เครื่องจักรหยุดจนเริ่มผลิตสินค้าได้คุณภาพสมบูรณ์ทั้งหมด โดย</span>
                              <strong className="text-amber-300 font-bold bg-amber-950/60 px-1 py-0.5 rounded">
                                ชิ้นส่วนเครื่องจักรไม่ชำรุดเสียหาย
                              </strong>
                              <span> และใช้เวลาปรับแต่ง</span>
                              <strong className="text-orange-300 font-black bg-orange-950/80 px-1 py-0.5 rounded border border-orange-800/60 ml-1">
                                เกิน 15 นาที
                              </strong>
                            </div>
                          ) : isMinor ? (
                            <div>
                              <span>การหยุดเครื่องจักรเพื่อปรับแต่งเป็นช่วงๆ ในทุกกรณี โดย</span>
                              <strong className="text-amber-300 font-bold bg-amber-950/60 px-1 py-0.5 rounded">
                                ชิ้นส่วนเครื่องจักรไม่ชำรุดเสียหาย
                              </strong>
                              <span> และใช้เวลาปรับแต่ง</span>
                              <strong className="text-amber-300 font-black bg-amber-950/80 px-1 py-0.5 rounded border border-amber-800/60 ml-1">
                                น้อยกว่า 15 นาที
                              </strong>
                              <p className="text-[10px] text-amber-300/90 mt-1 italic font-semibold">
                                หมายเหตุ : โดยจะบันทึกเป็นจำนวนครั้งที่เครื่องหยุดเพื่อปรับแต่ง ไม่บันทึกเป็นเวลา
                              </p>
                            </div>
                          ) : (
                            <span>{item.definition}</span>
                          )}
                        </td>

                        {/* 3. ชื่อหัวข้อ */}
                        <td className="py-3.5 px-2.5 border-r border-slate-800/80 align-top text-center font-bold font-mono">
                          <span className={`px-2 py-1 rounded-lg text-[11px] block ${
                            isBreakdown ? 'bg-rose-900/60 text-rose-200 border border-rose-700/60' :
                            isMinor ? 'bg-amber-900/60 text-amber-200 border border-amber-700/60' :
                            isAdj ? 'bg-orange-900/60 text-orange-200 border border-orange-700/60' :
                            'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}>
                            {item.topicName}
                          </span>
                        </td>

                        {/* 4. Downtime Type */}
                        <td className="py-3.5 px-2.5 border-r border-slate-800/80 align-top text-center font-semibold">
                          <span className="text-[11px] text-slate-300">
                            {item.downtimeType}
                          </span>
                        </td>

                        {/* 5. หน่วยวัด (Unit) */}
                        <td className="py-3.5 px-2.5 border-r border-slate-800/80 align-top text-center font-bold font-mono">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            item.unit.includes('จำนวนครั้ง') 
                              ? 'bg-amber-950 text-amber-300 border border-amber-800/60' 
                              : 'bg-slate-800 text-cyan-300 border border-slate-700'
                          }`}>
                            {item.unit}
                          </span>
                        </td>

                        {/* 6. ตัวอย่าง (Example) */}
                        <td className="py-3.5 px-3.5 align-top leading-relaxed text-slate-300 text-[11px]">
                          <ul className="list-disc pl-4 space-y-1">
                            {item.examples.map((ex, i) => (
                              <li key={i}>{ex}</li>
                            ))}
                          </ul>
                        </td>

                        {/* Action select button if handler passed */}
                        {onSelectLossType && (
                          <td className="py-3.5 px-3 align-top text-center">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectLossType(item.type);
                                onClose();
                              }}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1 mx-auto ${
                                isSelected
                                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <Check size={12} />
                                  <span>เลือกแล้ว</span>
                                </>
                              ) : (
                                <span>เลือก</span>
                              )}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>
              อ้างอิง: <strong>{CPRAM_LOSSES_STANDARD.title}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition cursor-pointer text-xs"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
