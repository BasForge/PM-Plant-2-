import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { WorkOrder } from '../../types';
import { 
  X, CheckCircle2, AlertTriangle, ShieldCheck, Clock, User, 
  Wrench, Package, Calendar, Play, Check, Star, ShieldAlert, 
  Printer, ArrowRight, Layers, FileText, Edit3, Trash2 
} from 'lucide-react';

interface WorkOrderDetailModalProps {
  workOrder: WorkOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (wo: WorkOrder) => void;
  onDelete?: (wo: WorkOrder) => void;
}

export const WorkOrderDetailModal: React.FC<WorkOrderDetailModalProps> = ({
  workOrder,
  isOpen,
  onClose,
  onEdit,
  onDelete
}) => {
  const { releaseWorkOrder, closeWorkOrder, currentUser, spareParts } = useApp();

  const [activeTab, setActiveTab] = useState<'details' | 'handover' | 'print'>('details');

  // Handover form state
  const [actualDurationMins, setActualDurationMins] = useState<number>(() => {
    return workOrder?.actualDurationMins || workOrder?.estimatedDurationMins || 60;
  });
  const [workSummaryNotes, setWorkSummaryNotes] = useState<string>(() => {
    return workOrder?.workSummaryNotes || '';
  });
  const [rootCauseWhy1, setRootCauseWhy1] = useState<string>(() => {
    return workOrder?.rootCauseWhy1 || '';
  });
  const [correctiveAction, setCorrectiveAction] = useState<string>(() => {
    return workOrder?.correctiveAction || '';
  });
  const [acceptedBy, setAcceptedBy] = useState<string>(() => {
    return workOrder?.productionAcceptedBy || 'หัวหน้าไลน์ผลิต';
  });
  const [satisfactionRating, setSatisfactionRating] = useState<number>(() => {
    return workOrder?.satisfactionRating || 5;
  });
  const [handoverNotes, setHandoverNotes] = useState<string>(() => {
    return workOrder?.productionHandoverNotes || 'ทดสอบเดินเครื่อง 15 นาที ระบบทำงานได้ตามมาตรฐาน QC';
  });

  const [releaseFeedback, setReleaseFeedback] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen || !workOrder) return null;

  const handleRelease = () => {
    const res = releaseWorkOrder(workOrder.id, currentUser?.name);
    setReleaseFeedback(res);
  };

  const handleCompleteAndClose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedBy.trim()) return;

    closeWorkOrder(workOrder.id, {
      actualDurationMins,
      workSummaryNotes,
      rootCauseWhy1,
      correctiveAction,
      acceptedBy: acceptedBy.trim(),
      satisfactionRating,
      handoverNotes: handoverNotes.trim()
    });

    onClose();
  };

  const handlePrint = () => {
    window.print();
  };

  const isReady = workOrder.readiness.gatePassed || workOrder.priority === 'ฉุกเฉินไลน์หยุด';
  const isReleased = workOrder.status === 'RELEASED';
  const isClosed = workOrder.status === 'CLOSED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-[#0b1325] border border-cyan-500/50 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-cyan-500/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl border ${
              workOrder.workCategory === 'PLANNED'
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
            }`}>
              <Wrench size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs sm:text-sm font-black px-2.5 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-cyan-400">
                  {workOrder.id}
                </span>
                <span className={`text-[10.5px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  workOrder.workCategory === 'PLANNED'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                }`}>
                  {workOrder.workCategory === 'PLANNED' ? '● Planned Work (ตามแผน)' : '● Unplanned Breakdown (ฉุกเฉิน)'}
                </span>
                <span className={`text-[10.5px] px-2 py-0.5 rounded-full font-bold ${
                  workOrder.status === 'CLOSED'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                    : workOrder.status === 'RELEASED'
                    ? 'bg-blue-950 text-blue-300 border border-blue-500/30'
                    : workOrder.status === 'READY_TO_RELEASE'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                    : workOrder.status === 'WAITING_PARTS'
                    ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                    : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                }`}>
                  สถานะ: {workOrder.status}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-white mt-1 leading-snug">
                {workOrder.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="พิมพ์ใบสั่งงาน"
            >
              <Printer size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Sub-tab navigation */}
        <div className="px-5 pt-3 border-b border-slate-800 flex items-center gap-2 bg-[#090f1d]">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition border-b-2 cursor-pointer ${
              activeTab === 'details'
                ? 'border-cyan-400 text-cyan-400 bg-slate-900/80'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📋 รายละเอียด & 4 เสาหลักความพร้อม
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('handover')}
            className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition border-b-2 cursor-pointer ${
              activeTab === 'handover'
                ? 'border-emerald-400 text-emerald-400 bg-slate-900/80'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            ✅ บันทึกเสร็จงาน & ตรวจรับฝ่ายผลิต (Handover)
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'details' && (
            <>
              {/* Release Feedback banner */}
              {releaseFeedback && (
                <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  releaseFeedback.success
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}>
                  {releaseFeedback.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  <span>{releaseFeedback.message}</span>
                </div>
              )}

              {/* 4 Pillars Readiness Gate Visual Cards */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-cyan-400" />
                    <span>4 เสาหลักความพร้อมก่อนปล่อยงาน (Work Release Readiness Gate)</span>
                  </h3>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    isReady
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                  }`}>
                    {isReady ? '🟢 ผ่านเกณฑ์ความพร้อมครบ' : '🔴 ยังไม่พร้อมปล่อยงาน'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Pillar 1: Start Time */}
                  <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                    workOrder.readiness.timeScheduled
                      ? 'bg-slate-900/90 border-emerald-500/30'
                      : 'bg-slate-900/60 border-rose-500/40'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">1. เวลาเริ่มงาน</span>
                      {workOrder.readiness.timeScheduled ? (
                        <CheckCircle2 size={15} className="text-emerald-400" />
                      ) : (
                        <AlertTriangle size={15} className="text-rose-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-mono text-xs font-bold text-white">
                        {workOrder.scheduledDate || '-'}
                      </div>
                      <div className="font-mono text-[11px] text-cyan-400 font-semibold">
                        {workOrder.scheduledStartTime ? `เวลา ${workOrder.scheduledStartTime} น.` : 'ยังไม่ระบุ'}
                      </div>
                    </div>
                  </div>

                  {/* Pillar 2: Duration */}
                  <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                    workOrder.readiness.estimatedDurationValid
                      ? 'bg-slate-900/90 border-emerald-500/30'
                      : 'bg-slate-900/60 border-rose-500/40'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">2. ระยะเวลาประเมิน</span>
                      {workOrder.readiness.estimatedDurationValid ? (
                        <CheckCircle2 size={15} className="text-emerald-400" />
                      ) : (
                        <AlertTriangle size={15} className="text-rose-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-mono text-base font-black text-amber-400">
                        {workOrder.estimatedDurationMins} นาที
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ({(workOrder.estimatedDurationMins / 60).toFixed(1)} ชม.)
                      </div>
                    </div>
                  </div>

                  {/* Pillar 3: Crew Assigned */}
                  <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                    workOrder.readiness.laborAssigned
                      ? 'bg-slate-900/90 border-emerald-500/30'
                      : 'bg-slate-900/60 border-rose-500/40'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">3. ช่างผู้รับผิดชอบ</span>
                      {workOrder.readiness.laborAssigned ? (
                        <CheckCircle2 size={15} className="text-emerald-400" />
                      ) : (
                        <AlertTriangle size={15} className="text-rose-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white truncate">
                        {workOrder.assignedTechnicians.join(', ') || 'ยังไม่ได้มอบหมาย'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        หัวหน้าชุด: {workOrder.leadTechnician || workOrder.assignedTechnicians[0] || '-'}
                      </div>
                    </div>
                  </div>

                  {/* Pillar 4: Spare Parts Available */}
                  <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                    workOrder.readiness.partsAvailable
                      ? 'bg-slate-900/90 border-emerald-500/30'
                      : 'bg-slate-900/60 border-rose-500/40'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">4. อะไหล่ในคลัง</span>
                      {workOrder.readiness.partsAvailable ? (
                        <CheckCircle2 size={15} className="text-emerald-400" />
                      ) : (
                        <AlertTriangle size={15} className="text-rose-400" />
                      )}
                    </div>
                    <div>
                      <div className={`text-xs font-bold ${workOrder.readiness.partsAvailable ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {workOrder.requiresParts
                          ? (workOrder.readiness.partsAvailable ? `พร้อม ${workOrder.requiredParts.length} รายการ` : 'ขาดสต็อกในคลัง')
                          : 'ไม่ต้องใช้อะไหล่'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {workOrder.requiresParts ? 'ตรวจสอบสต็อกแล้ว' : 'งานตรวจเช็ค / ปรับแต่ง'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Machine & Target Location Info */}
              <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-500 block">เครื่องจักร:</span>
                    <strong className="text-white font-mono text-sm">[{workOrder.machineId}]</strong>
                    <span className="text-slate-300 ml-1.5">{workOrder.machineName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">ไลน์ผลิต / พื้นที่:</span>
                    <strong className="text-cyan-400">{workOrder.lineGroup || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">ระดับความเร่งด่วน:</span>
                    <span className={`inline-block px-2 py-0.5 rounded font-bold mt-0.5 ${
                      workOrder.priority === 'ฉุกเฉินไลน์หยุด'
                        ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                        : workOrder.priority === 'เร่งด่วน'
                        ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {workOrder.priority}
                    </span>
                  </div>
                </div>

                {workOrder.description && (
                  <div>
                    <span className="text-slate-500 block mb-0.5">รายละเอียดงาน:</span>
                    <p className="text-slate-200 bg-slate-950/80 p-3 rounded-lg border border-slate-800 leading-relaxed">
                      {workOrder.description}
                    </p>
                  </div>
                )}

                {/* Safety & LOTO Tag */}
                {workOrder.lotoRequired && (
                  <div className="flex items-center gap-2 p-2.5 bg-amber-950/30 border border-amber-500/30 rounded-lg text-amber-200">
                    <ShieldAlert size={16} className="text-amber-400 shrink-0" />
                    <span>
                      ต้องทำมาตรการความปลอดภัย <strong>Lockout / Tagout (LOTO)</strong> หมายเลขแท็ก: <strong className="font-mono">{workOrder.lotoTag || 'ระบุหน้างาน'}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Spare Parts List Table */}
              {workOrder.requiresParts && workOrder.requiredParts && workOrder.requiredParts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Package size={14} className="text-cyan-400" />
                    <span>รายการอะไหล่สำรองที่จัดเตรียม (Parts Kitting List)</span>
                  </h4>

                  <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-900/90 text-slate-400 font-bold border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">รหัสอะไหล่</th>
                          <th className="py-2.5 px-3">ชื่ออะไหล่</th>
                          <th className="py-2.5 px-3 text-center">จำนวนที่ใช้</th>
                          <th className="py-2.5 px-3 text-center">คงคลัง</th>
                          <th className="py-2.5 px-3 text-center">สถานะความพร้อม</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {workOrder.requiredParts.map(p => (
                          <tr key={p.partId} className="hover:bg-slate-900/40">
                            <td className="py-2.5 px-3 font-mono font-bold text-cyan-400">{p.partCode}</td>
                            <td className="py-2.5 px-3 font-medium text-white">{p.partName}</td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-white">{p.quantityRequired}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400">{p.quantityAvailable}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.isAvailable
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                              }`}>
                                {p.isAvailable ? '🟢 พร้อมเบิก' : '🔴 ขาดสต็อก'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Release Actions Footer */}
              <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  ผู้สร้างใบสั่งงาน: <strong className="text-slate-200">{workOrder.createdBy}</strong> ({workOrder.createdAt.slice(0, 10)})
                </div>

                <div className="flex items-center gap-2">
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(workOrder)}
                      className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 hover:text-rose-200 border border-rose-800/40 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      title="ลบใบสั่งงานนี้ออกจากระบบ"
                    >
                      <Trash2 size={13} />
                      <span>ลบใบงาน</span>
                    </button>
                  )}

                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(workOrder)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-amber-500/20 text-slate-200 hover:text-amber-300 border border-slate-700 hover:border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      title="แก้ไขข้อมูลใบสั่งงาน"
                    >
                      <Edit3 size={13} />
                      <span>แก้ไขใบสั่งงาน</span>
                    </button>
                  )}

                  {!isReleased && !isClosed && (
                    <button
                      type="button"
                      onClick={handleRelease}
                      disabled={!isReady}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer ${
                        isReady
                          ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-blue-400 text-slate-950 shadow-lg shadow-cyan-900/40'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Play size={15} className="fill-slate-950 stroke-none" />
                      <span>ปล่อยงานให้ช่างปฏิบัติการ (Release WO)</span>
                    </button>
                  )}

                  {isReleased && !isClosed && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('handover')}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition cursor-pointer"
                    >
                      <Check size={16} className="stroke-[3]" />
                      <span>ซ่อมเสร็จแล้ว → ส่งมอบงานฝ่ายผลิต</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'handover' && (
            <form onSubmit={handleCompleteAndClose} className="space-y-4">
              <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-xs text-emerald-200 flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white">ขั้นตอนการตรวจรับและปิดงานสมบูรณ์ (Production Handover)</h4>
                  <p className="text-[11px] text-emerald-300/90 mt-0.5">
                    เมื่อช่างปฏิบัติงานเสร็จ ฝ่ายผลิตจะทดสอบเดินเครื่อง และลงชื่อตรวจรับงาน เพื่อปิด Work Order และตัดยอดอะไหล่ในคลังอัตโนมัติ
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    เวลาปฏิบัติงานจริง (Actual Duration - นาที) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={actualDurationMins}
                    onChange={(e) => setActualDurationMins(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono font-bold focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ชื่อผู้ตรวจรับงาน (ฝ่ายผลิต) *
                  </label>
                  <input
                    type="text"
                    value={acceptedBy}
                    onChange={(e) => setAcceptedBy(e.target.value)}
                    placeholder="เช่น คุณมาโนช (หัวหน้ากะ), คุณสมศรี"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  สรุปผลการซ่อมบำรุงและการทดสอบเดินเครื่อง *
                </label>
                <textarea
                  value={workSummaryNotes}
                  onChange={(e) => setWorkSummaryNotes(e.target.value)}
                  placeholder="ระบุสิ่งที่ทำ เช่น เปลี่ยนซีลยางใหม่ ล้างทำความสะอาด ทดสอบเดินเครื่อง 15 นาที ไร้เสียงผิดปกติ..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-emerald-500"
                  required
                />
              </div>

              {workOrder.sourceType === 'BREAKDOWN' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div>
                    <label className="block text-[11px] font-bold text-rose-300 mb-1">
                      สาเหตุรากเหง้า (Root Cause / Why 1)
                    </label>
                    <input
                      type="text"
                      value={rootCauseWhy1}
                      onChange={(e) => setRootCauseWhy1(e.target.value)}
                      placeholder="เช่น ลูกปืนหมดอายุ, ฝุ่นแป้งขัดเฟือง"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-300 mb-1">
                      มาตรการป้องกันการเกิดซ้ำ (Corrective Action)
                    </label>
                    <input
                      type="text"
                      value={correctiveAction}
                      onChange={(e) => setCorrectiveAction(e.target.value)}
                      placeholder="เช่น ปรับรอบ PM ให้ถี่ขึ้น, เพิ่มการ์ดกันฝุ่น"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Satisfaction rating */}
              <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">ระดับความพึงพอใจฝ่ายผลิต:</span>
                  <span className="text-[11px] text-slate-400">ประเมินคุณภาพงานและการส่งมอบ</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSatisfactionRating(star)}
                      className="p-1 hover:scale-110 transition cursor-pointer"
                    >
                      <Star
                        size={22}
                        className={star <= satisfactionRating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  ความคิดเห็นการตรวจรับเดินเครื่อง (Handover Notes)
                </label>
                <input
                  type="text"
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition cursor-pointer"
                >
                  ย้อนกลับ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  <span>บันทึกตรวจรับ & ปิด Work Order สมบูรณ์</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
