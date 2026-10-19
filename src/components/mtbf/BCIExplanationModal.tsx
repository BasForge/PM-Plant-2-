import React, { useState } from 'react';
import { BadActorMachineStat } from './BadActorReportView';
import { 
  X, Flame, AlertTriangle, ShieldCheck, Calculator, HelpCircle, 
  Sparkles, Calendar, ChevronRight, Clock, DollarSign, Activity, 
  CheckCircle2, Info, ArrowUpRight, Wrench, Layers, Zap
} from 'lucide-react';

interface BCIExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMachine?: BadActorMachineStat | null;
  allMachines: BadActorMachineStat[];
  onSelectMachine?: (m: BadActorMachineStat) => void;
  onOpenWhyWhy?: (machineId: string, symptom: string) => void;
  onNavigateToTBM?: (machineId: string) => void;
}

export const BCIExplanationModal: React.FC<BCIExplanationModalProps> = ({
  isOpen,
  onClose,
  selectedMachine,
  allMachines,
  onSelectMachine,
  onOpenWhyWhy,
  onNavigateToTBM
}) => {
  // Currently inspected machine in calculator (defaults to passed selectedMachine or first in list)
  const [activeMachineId, setActiveMachineId] = useState<string>(() => {
    return selectedMachine?.machineId || allMachines[0]?.machineId || '';
  });

  // Active tab inside modal: 'formula' | 'tiers' | 'calculator'
  const [activeTab, setActiveTab] = useState<'formula' | 'tiers' | 'calculator'>('formula');

  React.useEffect(() => {
    if (selectedMachine?.machineId) {
      setActiveMachineId(selectedMachine.machineId);
      setActiveTab('calculator');
    }
  }, [selectedMachine]);

  if (!isOpen) return null;

  const currentMachine = allMachines.find(m => m.machineId === activeMachineId) || selectedMachine || allMachines[0];

  // Calculate live scores for current machine
  const maxDT = currentMachine?.maxDT || Math.max(1, ...allMachines.map(m => m.totalDowntimeMins));
  const maxCount = currentMachine?.maxCount || Math.max(1, ...allMachines.map(m => m.failureCount));
  const maxCost = currentMachine?.maxCost || Math.max(1, ...allMachines.map(m => m.totalPartsCost));

  const dtScore = currentMachine ? (currentMachine.totalDowntimeMins / maxDT) * 40 : 0;
  const freqScore = currentMachine ? (currentMachine.failureCount / maxCount) * 35 : 0;
  const costScore = currentMachine ? (currentMachine.totalPartsCost / maxCost) * 25 : 0;
  const totalBCI = Math.round(dtScore + freqScore + costScore);

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-[#0b1325] border border-slate-700/80 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl shadow-cyan-950/40 overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-rose-500/20 via-amber-500/20 to-cyan-500/20 border border-rose-500/40 text-rose-400 shadow-inner">
              <Calculator size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  BCI คืออะไร? และสูตรการคำนวณ (Bad Actor Criticality Index)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800/60">
                  มาตรฐาน TPM 80/20
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ดัชนีชี้วัดความวิกฤตของเครื่องจักรตัวร้ายเพื่อจัดลำดับสั่งการแก้ไขเชิงรุก (Action Triggers)
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

        {/* 2. Navigation Tab Switcher */}
        <div className="flex items-center gap-2 px-5 pt-3 pb-2 border-b border-slate-800/80 bg-slate-900/60 text-xs font-bold overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('formula')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'formula'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white bg-slate-800/60'
            }`}
          >
            <Calculator size={13} />
            <span>1. สูตรคำนวณ 40:35:25</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tiers')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'tiers'
                ? 'bg-rose-500 text-white shadow-md font-black'
                : 'text-slate-400 hover:text-white bg-slate-800/60'
            }`}
          >
            <Flame size={13} />
            <span>2. เกณฑ์ระดับ BCI (Criticality Tiers)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calculator')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'calculator'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white bg-slate-800/60'
            }`}
          >
            <Activity size={13} />
            <span>3. แจกแจงคะแนนจริงของเครื่อง ({currentMachine?.machineId || 'เลือกเครื่อง'})</span>
          </button>
        </div>

        {/* 3. Modal Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* TAB 1: FORMULA & DEFINITION */}
          {activeTab === 'formula' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* What is BCI summary banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-500/30 space-y-2">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                  <Info size={16} />
                  <span>BCI คืออะไร? (Bad Actor Criticality Index)</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-xs">
                  <strong>BCI (Bad Actor Criticality Index)</strong> คือ <strong>ดัชนีชี้วัดความวิกฤตของเครื่องจักรตัวร้าย</strong> คำนวณเป็นคะแนนรวม <strong>0 - 100 คะแนน</strong> ตามมาตรฐานวิศวกรรมความน่าเชื่อถือ (Reliability Engineering & TPM) 
                  เพื่อแก้ไขข้อจำกัดเดิมที่มักดูเฉพาะเวลาหยุด (Downtime) เพียงอย่างเดียว ซึ่งทำให้มองไม่เห็นเครื่องจักรที่มีปัญหาหยุดจุกจิกซ้ำซาก (Chronic Micro-stoppage) หรือเครื่องจักรที่ผลาญงบประมาณค่าซ่อมบำรุงสูง
                </p>
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11.5px] text-slate-400 flex items-center gap-2">
                  <span className="text-amber-400 font-bold shrink-0">💡 วัตถุประสงค์หลัก:</span>
                  <span>ช่วยให้วิศวกรและผู้จัดการโรงงานชี้เป้าเครื่องจักรที่ต้อง <strong>"สั่งการแก้ไขเชิงรุก (Action Triggers)"</strong> ก่อนเกิด Breakdown ร้ายแรงซ้ำซาก</span>
                </div>
              </div>

              {/* Master Formula Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-white text-xs sm:text-sm flex items-center gap-2">
                    <Calculator size={15} className="text-cyan-400" />
                    <span>สูตรคำนวณมาตรฐาน BCI (ถ่วงน้ำหนัก 3 มิติ)</span>
                  </h4>
                  <span className="font-mono text-[10px] bg-cyan-950 text-cyan-300 px-2.5 py-0.5 rounded-full border border-cyan-800/60 font-bold">
                    คะแนนเต็ม 100 คะแนน
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#070d19] border border-cyan-500/30 text-center space-y-1">
                  <p className="text-[11px] text-slate-400 font-medium">สมการหลัก:</p>
                  <p className="text-sm sm:text-base font-black font-mono bg-gradient-to-r from-cyan-400 via-amber-300 to-rose-400 bg-clip-text text-transparent">
                    BCI Score = Downtime Score (40%) + Frequency Score (35%) + Cost Score (25%)
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    = Round( (Downtime / maxDT × 40) + (Count / maxCount × 35) + (Cost / maxCost × 25) )
                  </p>
                </div>

                {/* 3 Pillar Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  
                  {/* Pillar 1: Downtime (40%) */}
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-rose-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-300 text-xs flex items-center gap-1.5">
                        <Clock size={13} className="text-rose-400" />
                        1. เวลาหยุดเครื่อง (Downtime)
                      </span>
                      <span className="text-[11px] font-mono font-black text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/40">
                        40 คะแนน
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      สะท้อนผลกระทบต่อกำลังการผลิตรวม (Production Capacity Loss)
                    </p>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[10.5px] text-rose-200">
                      (เวลาหยุดเครื่อง / maxDT) × 40
                    </div>
                    <p className="text-[10px] text-slate-500">
                      * maxDT = เวลาหยุดรวมสูงสุดของเครื่องจักรในกลุ่ม
                    </p>
                  </div>

                  {/* Pillar 2: Frequency (35%) */}
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                        <Zap size={13} className="text-amber-400" />
                        2. ความถี่เสีย (Frequency)
                      </span>
                      <span className="text-[11px] font-mono font-black text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/40">
                        35 คะแนน
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      สะท้อนปัญหาอาการซ้ำซาก (Chronic Failures) ที่หยุดเครื่องบ่อย
                    </p>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[10.5px] text-amber-200">
                      (จำนวนครั้งเสีย / maxCount) × 35
                    </div>
                    <p className="text-[10px] text-slate-500">
                      * maxCount = จำนวนครั้งเสียสูงสุดของเครื่องในกลุ่ม
                    </p>
                  </div>

                  {/* Pillar 3: Cost (25%) */}
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-cyan-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                        <DollarSign size={13} className="text-cyan-400" />
                        3. ค่าซ่อมและอะไหล่ (Cost)
                      </span>
                      <span className="text-[11px] font-mono font-black text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/40">
                        25 คะแนน
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      สะท้อนต้นทุนงบประมาณอะไหล่และค่าบริการซ่อมบำรุง
                    </p>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[10.5px] text-cyan-200">
                      (ค่าอะไหล่ซ่อมรวม / maxCost) × 25
                    </div>
                    <p className="text-[10px] text-slate-500">
                      * maxCost = มูลค่าซ่อมสูงสุดของเครื่องในกลุ่ม
                    </p>
                  </div>

                </div>
              </div>

              {/* Quick Jump to Live Calculator */}
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-400 shrink-0" />
                  <span className="text-amber-200">
                    ต้องการดูตัวอย่างตัวเลขจริงของเครื่องจักรในโรงงานของคุณ?
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('calculator')}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition flex items-center gap-1 shrink-0"
                >
                  <span>ดูการแจกแจงสด</span>
                  <ChevronRight size={13} />
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: CRITICALITY TIERS & ACTION TRIGGERS */}
          {activeTab === 'tiers' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              <div className="text-slate-300 leading-relaxed">
                ระบบแบ่งระดับความวิกฤตของเครื่องจักรออกเป็น <strong>3 ระดับ (Tiers)</strong> ตามคะแนน BCI และเงื่อนไข Cutoff สำคัญ 
                โดยแต่ละระดับมี <strong>"มาตรการบังคับปฏิบัติการ (Action Triggers)"</strong> เพื่อให้ช่างและวิศวกรดำเนินการทันที:
              </div>

              {/* 3 Tier Cards */}
              <div className="space-y-3">
                
                {/* 1. CRITICAL TIER */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/70 to-slate-900 border border-rose-500/50 space-y-3 shadow-lg shadow-rose-950/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-500/30 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40">
                        <Flame size={18} className="animate-pulse" />
                      </span>
                      <div>
                        <span className="text-sm font-black text-rose-300">
                          ระดับ 1: วิกฤตสูง (CRITICAL)
                        </span>
                        <p className="text-[10px] text-rose-400/80 font-mono">Bad Actor ระดับวิกฤต ต้องหยุดความสูญเสียทันที</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-rose-900/60 text-rose-200 border border-rose-700">BCI ≥ 55</span>
                      <span className="text-slate-400">หรือ</span>
                      <span className="px-2 py-0.5 rounded bg-rose-900/60 text-rose-200 border border-rose-700">Downtime ≥ 10 ชม.</span>
                      <span className="text-slate-400">หรือ</span>
                      <span className="px-2 py-0.5 rounded bg-rose-900/60 text-rose-200 border border-rose-700">เสีย ≥ 5 ครั้ง</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-[11.5px] text-slate-300">
                    <p className="font-bold text-rose-300">⚡ มาตรการสั่งการบังคับ (Action Triggers):</p>
                    <ul className="list-disc list-inside space-y-1 pl-1 text-slate-300">
                      <li><strong>ทำ Why-Why Analysis ทันที:</strong> หาสาเหตุรากเหง้า (5 Whys) ร่วมกับทีมงานซ่อมบำรุงและฝ่ายผลิต</li>
                      <li><strong>ออกเอกสาร Failure Analysis (FA):</strong> ตรวจวิเคราะห์ชิ้นส่วนที่แตกหักเสียหายเชิงลึก</li>
                      <li><strong>ปรับทบทวนรอบ TBM Matrix:</strong> ปรับระยะเวลาเปลี่ยนชิ้นส่วนตามเวลา (Time-Based) ให้สั้นลงเพื่อดักหน้าการเสีย</li>
                      <li><strong>นำเข้าวาระประชุมด่วนประจำสัปดาห์ (Weekly Reliability Meeting)</strong></li>
                    </ul>
                  </div>
                </div>

                {/* 2. WATCHLIST TIER */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/70 to-slate-900 border border-amber-500/50 space-y-3 shadow-lg shadow-amber-950/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/30 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
                        <AlertTriangle size={18} />
                      </span>
                      <div>
                        <span className="text-sm font-black text-amber-300">
                          ระดับ 2: เฝ้าระวังพิเศษ (WATCHLIST)
                        </span>
                        <p className="text-[10px] text-amber-400/80 font-mono">มีความเสี่ยงสูงหรือเริ่มพบอาการเสียซ้ำซาก</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-amber-900/60 text-amber-200 border border-amber-700">BCI ≥ 30</span>
                      <span className="text-slate-400">หรือ</span>
                      <span className="px-2 py-0.5 rounded bg-amber-900/60 text-amber-200 border border-amber-700">Downtime ≥ 4 ชม.</span>
                      <span className="text-slate-400">หรือ</span>
                      <span className="px-2 py-0.5 rounded bg-amber-900/60 text-amber-200 border border-amber-700">เสีย ≥ 3 ครั้ง</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-[11.5px] text-slate-300">
                    <p className="font-bold text-amber-300">⚡ มาตรการสั่งการบังคับ (Action Triggers):</p>
                    <ul className="list-disc list-inside space-y-1 pl-1 text-slate-300">
                      <li><strong>จัดทำ One Point Lesson (OPL):</strong> อบรมพนักงานหน้างานเรื่องการสังเกตจุดผิดปกติก่อนเครื่องดับ</li>
                      <li><strong>เช็ค Safety Stock อะไหล่สำรอง:</strong> ตรวจสอบอะไหล่สำคัญในคลังไม่ให้ขาดมือ</li>
                      <li><strong>เฝ้าระวังอาการซ้ำซาก (Chronic Patterns):</strong> ติดตามอาการเสียบ่อย เช่น เซนเซอร์เลื่อน, ความร้อนตก</li>
                    </ul>
                  </div>
                </div>

                {/* 3. MODERATE TIER */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/50 to-slate-900 border border-cyan-500/40 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                        <ShieldCheck size={18} />
                      </span>
                      <div>
                        <span className="text-sm font-black text-cyan-300">
                          ระดับ 3: ทั่วไป / ควบคุมได้ (MODERATE)
                        </span>
                        <p className="text-[10px] text-cyan-400/80 font-mono">อยู่ในเกณฑ์ปกติ ดำเนินการตามแผนมาตรฐาน</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">BCI &lt; 30</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11.5px] text-slate-300">
                    <p className="font-bold text-cyan-300">⚡ มาตรการปฏิบัติ:</p>
                    <p>ดำเนินการบำรุงรักษาเชิงป้องกันตามรอบปกติ (Preventive Maintenance - PM) และระบบ Autonomous Maintenance (AM) ประจำวัน</p>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: LIVE MACHINE BREAKDOWN & CALCULATOR */}
          {activeTab === 'calculator' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Machine Selector */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="font-bold text-white flex items-center gap-2 text-xs">
                  <Wrench size={15} className="text-cyan-400" />
                  <span>เลือกเครื่องจักรเพื่อดูการคำนวณคะแนน BCI:</span>
                </label>

                <select
                  value={activeMachineId}
                  onChange={(e) => setActiveMachineId(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  {allMachines.map((m, idx) => (
                    <option key={m.machineId} value={m.machineId}>
                      #{idx + 1} [{m.machineId}] {m.machineName} - BCI: {m.bciScore} ({m.bciTier})
                    </option>
                  ))}
                </select>
              </div>

              {currentMachine ? (
                <div className="space-y-4">
                  
                  {/* Current Machine Overview Card */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-750 space-y-4 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-black text-cyan-400">
                            {currentMachine.machineId}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            currentMachine.ranking === 'A' 
                              ? 'bg-rose-900/60 text-rose-300 border border-rose-700/50' 
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            Rank {currentMachine.ranking}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({currentMachine.roomName})
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-0.5">
                          {currentMachine.machineName}
                        </h4>
                      </div>

                      {/* Total BCI Badge */}
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">คะแนน BCI รวม</span>
                        <div className="flex items-center gap-2 justify-end mt-0.5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-mono font-black ${
                            currentMachine.bciTier === 'CRITICAL'
                              ? 'bg-rose-950 text-rose-300 border border-rose-500/60 shadow-lg shadow-rose-950/50'
                              : currentMachine.bciTier === 'WATCHLIST'
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/60'
                              : 'bg-cyan-950 text-cyan-300 border border-cyan-700/50'
                          }`}>
                            {currentMachine.bciTier === 'CRITICAL' && <Flame size={14} className="animate-pulse" />}
                            {currentMachine.bciTier === 'WATCHLIST' && <AlertTriangle size={14} />}
                            {currentMachine.bciTier === 'MODERATE' && <ShieldCheck size={14} />}
                            <span>BCI {totalBCI}</span>
                          </span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            currentMachine.bciTier === 'CRITICAL' ? 'text-rose-400 bg-rose-900/30' :
                            currentMachine.bciTier === 'WATCHLIST' ? 'text-amber-400 bg-amber-900/30' :
                            'text-cyan-400 bg-cyan-900/30'
                          }`}>
                            {currentMachine.bciTier}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Step-by-Step Mathematical Computation */}
                    <div className="space-y-3">
                      <p className="font-bold text-white flex items-center gap-1.5 text-xs">
                        <Calculator size={14} className="text-amber-400" />
                        <span>การคำนวณคะแนนทั้ง 3 มิติของเครื่อง [{currentMachine.machineId}]:</span>
                      </p>

                      {/* 1. Downtime Breakdown */}
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-rose-500/30 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-rose-300">
                          <span className="flex items-center gap-1.5">
                            <Clock size={13} />
                            <span>1. คะแนนเวลาหยุดเครื่อง (Downtime Score)</span>
                          </span>
                          <span className="font-mono text-sm font-black text-rose-400">
                            {dtScore.toFixed(1)} / 40.0 คะแนน
                          </span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                          <div 
                            className="bg-gradient-to-r from-rose-500 to-pink-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(100, (dtScore / 40) * 100)}%` }}
                          />
                        </div>
                        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[10px] text-slate-300 flex items-center justify-between flex-wrap gap-1">
                          <span>
                            (หยุด {currentMachine.totalDowntimeMins.toLocaleString()} นาที ÷ สูงสุด {maxDT.toLocaleString()} นาที) × 40
                          </span>
                          <span className="text-rose-400 font-bold">
                            = {dtScore.toFixed(1)} คะแนน ({currentMachine.totalDowntimeHours} ชม.)
                          </span>
                        </div>
                      </div>

                      {/* 2. Frequency Breakdown */}
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-amber-500/30 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                          <span className="flex items-center gap-1.5">
                            <Zap size={13} />
                            <span>2. คะแนนความถี่ในการหยุด (Frequency Score)</span>
                          </span>
                          <span className="font-mono text-sm font-black text-amber-400">
                            {freqScore.toFixed(1)} / 35.0 คะแนน
                          </span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                          <div 
                            className="bg-gradient-to-r from-amber-500 to-yellow-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(100, (freqScore / 35) * 100)}%` }}
                          />
                        </div>
                        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[10px] text-slate-300 flex items-center justify-between flex-wrap gap-1">
                          <span>
                            (หยุด {currentMachine.failureCount} ครั้ง ÷ สูงสุด {maxCount} ครั้ง) × 35
                          </span>
                          <span className="text-amber-400 font-bold">
                            = {freqScore.toFixed(1)} คะแนน
                          </span>
                        </div>
                      </div>

                      {/* 3. Cost Breakdown */}
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-cyan-500/30 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
                          <span className="flex items-center gap-1.5">
                            <DollarSign size={13} />
                            <span>3. คะแนนค่าใช้จ่ายอะไหล่ซ่อม (Cost Score)</span>
                          </span>
                          <span className="font-mono text-sm font-black text-cyan-400">
                            {costScore.toFixed(1)} / 25.0 คะแนน
                          </span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                          <div 
                            className="bg-gradient-to-r from-cyan-500 to-teal-400 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(100, (costScore / 25) * 100)}%` }}
                          />
                        </div>
                        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[10px] text-slate-300 flex items-center justify-between flex-wrap gap-1">
                          <span>
                            (ค่าอะไหล่ {currentMachine.totalPartsCost.toLocaleString()} ฿ ÷ สูงสุด {maxCost.toLocaleString()} ฿) × 25
                          </span>
                          <span className="text-cyan-400 font-bold">
                            = {costScore.toFixed(1)} คะแนน
                          </span>
                        </div>
                      </div>

                      {/* Grand Total Box */}
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-cyan-500/40 flex items-center justify-between flex-wrap gap-2 text-xs">
                        <span className="font-bold text-white">
                          สูตรคำนวณคะแนนรวม: Round( {dtScore.toFixed(1)} + {freqScore.toFixed(1)} + {costScore.toFixed(1)} )
                        </span>
                        <span className="text-cyan-300 font-mono font-black text-sm">
                          = {totalBCI} คะแนน (0 - 100)
                        </span>
                      </div>
                    </div>

                    {/* Action Triggers for this machine */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
                      <div className="text-[11px] text-slate-400">
                        {currentMachine.bciTier === 'CRITICAL' ? (
                          <span className="text-rose-400 font-bold flex items-center gap-1">
                            <Flame size={13} />
                            เครื่องนี้จัดอยู่ในระดับวิกฤตสูง แนะนำให้เปิดทำ Why-Why Analysis ทันที!
                          </span>
                        ) : currentMachine.bciTier === 'WATCHLIST' ? (
                          <span className="text-amber-400 font-bold flex items-center gap-1">
                            <AlertTriangle size={13} />
                            เครื่องนี้อยู่ในระดับเฝ้าระวังพิเศษ แนะนำตรวจสอบอะไหล่และจัดทำ OPL
                          </span>
                        ) : (
                          <span className="text-cyan-400 font-bold flex items-center gap-1">
                            <ShieldCheck size={13} />
                            เครื่องนี้อยู่ในระดับปกติ ดำเนินการตามแผน PM ปกติ
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {onOpenWhyWhy && (
                          <button
                            type="button"
                            onClick={() => {
                              onOpenWhyWhy(
                                currentMachine.machineId, 
                                currentMachine.chronicPatterns[0]?.symptomKey || currentMachine.topSymptom
                              );
                              onClose();
                            }}
                            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-1 transition cursor-pointer text-xs shadow-md"
                          >
                            <Sparkles size={13} />
                            <span>เปิดเคส Why-Why เครื่องนี้</span>
                          </button>
                        )}

                        {onNavigateToTBM && (
                          <button
                            type="button"
                            onClick={() => {
                              onNavigateToTBM(currentMachine.machineId);
                              onClose();
                            }}
                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1 transition cursor-pointer text-xs"
                          >
                            <Calendar size={13} />
                            <span>แผน TBM/PM</span>
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  ไม่พบข้อมูลเครื่องจักร
                </div>
              )}

            </div>
          )}

        </div>

        {/* 4. Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>สูตร BCI พัฒนาขึ้นตามหลักการ TPM & Food Reliability Matrix</span>
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
