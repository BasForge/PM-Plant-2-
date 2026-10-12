import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  WorkOrder, UsedPartItem, WorkOrderFailureCode, WorkOrderFailureSubsystem 
} from '../../types';
import { 
  FAILURE_SUBSYSTEMS, FAILURE_SYMPTOMS, FAILURE_CAUSES, FAILURE_ACTIONS,
  getSymptomsBySubsystem, findSymptomByCode, findCauseByCode, findActionByCode, findSubsystemDef
} from '../../data/failureCodes';
import { 
  X, CheckCircle2, AlertTriangle, ShieldCheck, Clock, User, 
  Wrench, Package, Calendar, Play, Check, Star, ShieldAlert, 
  Printer, ArrowRight, Layers, FileText, Edit3, Trash2,
  Plus, Trash, Sparkles, BookOpen, AlertCircle, Coins, Search,
  ExternalLink, ChevronRight, CheckSquare, Square, CornerDownRight, Tag
} from 'lucide-react';
import { ContextualKnowledgeAssistant } from '../knowledge/ContextualKnowledgeAssistant';

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
  const { 
    releaseWorkOrder, 
    closeWorkOrder, 
    currentUser, 
    spareParts, 
    repairs, 
    navigateToRepairs,
    setActivePage
  } = useApp();

  const [activeTab, setActiveTab] = useState<'details' | 'handover' | 'print'>('details');

  // Handover form states
  const [actualDurationMins, setActualDurationMins] = useState<number>(60);
  const [workSummaryNotes, setWorkSummaryNotes] = useState<string>('');
  const [rootCauseWhy1, setRootCauseWhy1] = useState<string>('');
  const [correctiveAction, setCorrectiveAction] = useState<string>('');
  const [acceptedBy, setAcceptedBy] = useState<string>('หัวหน้าไลน์ผลิต');
  const [satisfactionRating, setSatisfactionRating] = useState<number>(5);
  const [handoverNotes, setHandoverNotes] = useState<string>('ทดสอบเดินเครื่อง 15 นาที ระบบทำงานได้ตามมาตรฐาน QC');

  // Failure Codes States (Phase 3)
  const [failureSubsystem, setFailureSubsystem] = useState<WorkOrderFailureSubsystem>('MECHANICAL');
  const [symptomCode, setSymptomCode] = useState<string>('FS-M01');
  const [customSymptom, setCustomSymptom] = useState<string>('');
  const [causeCode, setCauseCode] = useState<string>('FC-01');
  const [customCause, setCustomCause] = useState<string>('');
  const [actionCode, setActionCode] = useState<string>('AC-02');
  const [customAction, setCustomAction] = useState<string>('');
  const [failureSeverity, setFailureSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');

  // Spare Parts Deduction States (Phase 3)
  const [usedPartsList, setUsedPartsList] = useState<UsedPartItem[]>([]);
  const [showAddPartModal, setShowAddPartModal] = useState<boolean>(false);
  const [partSearchQuery, setPartSearchQuery] = useState<string>('');
  const [showAddCustomPart, setShowAddCustomPart] = useState<boolean>(false);
  const [customPartName, setCustomPartName] = useState<string>('');
  const [customPartQty, setCustomPartQty] = useState<number>(1);
  const [customPartPrice, setCustomPartPrice] = useState<number>(0);
  const [customPartUnit, setCustomPartUnit] = useState<string>('ชิ้น');

  // Knowledge & Sync Options (Phase 3)
  const [saveToKnowledge, setSaveToKnowledge] = useState<boolean>(true);
  const [knowledgeType, setKnowledgeType] = useState<'WHY_WHY' | 'TROUBLESHOOTING'>('WHY_WHY');
  const [syncToRepairLog, setSyncToRepairLog] = useState<boolean>(true);

  const [releaseFeedback, setReleaseFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Initialize or reset form when workOrder changes or modal opens
  useEffect(() => {
    if (!workOrder) return;

    setActualDurationMins(workOrder.actualDurationMins || workOrder.estimatedDurationMins || 60);
    setWorkSummaryNotes(workOrder.workSummaryNotes || (workOrder.description ? `ดำเนินการ: ${workOrder.description}` : ''));
    setRootCauseWhy1(workOrder.rootCauseWhy1 || '');
    setCorrectiveAction(workOrder.correctiveAction || '');
    setAcceptedBy(workOrder.productionAcceptedBy || 'คุณมาโนช (หัวหน้ากะผลิต)');
    setSatisfactionRating(workOrder.satisfactionRating || 5);
    setHandoverNotes(workOrder.productionHandoverNotes || 'ทดสอบเดินเครื่อง 15 นาที ระบบทำงานได้ตามมาตรฐาน QC เรียบร้อยดี');

    // Initialize Failure Codes
    if (workOrder.failureCode) {
      setFailureSubsystem(workOrder.failureCode.subsystem);
      setSymptomCode(workOrder.failureCode.symptomCode);
      setCustomSymptom(workOrder.failureCode.symptomLabel);
      setCauseCode(workOrder.failureCode.causeCode);
      setCustomCause(workOrder.failureCode.causeLabel);
      setActionCode(workOrder.failureCode.actionCode);
      setCustomAction(workOrder.failureCode.actionLabel);
      setFailureSeverity(workOrder.failureCode.severity || 'MEDIUM');
    } else {
      // Default to appropriate subsystem
      const isBreakdown = workOrder.sourceType === 'BREAKDOWN';
      setFailureSubsystem('MECHANICAL');
      setSymptomCode(isBreakdown ? 'FS-M02' : 'FS-M01');
      setCauseCode('FC-01');
      setActionCode(workOrder.requiresParts ? 'AC-02' : 'AC-01');
      setFailureSeverity(workOrder.priority === 'ฉุกเฉินไลน์หยุด' ? 'CRITICAL' : (workOrder.priority === 'เร่งด่วน' ? 'HIGH' : 'MEDIUM'));
    }

    // Initialize Used Parts
    if (workOrder.actualPartsUsed && workOrder.actualPartsUsed.length > 0) {
      setUsedPartsList(workOrder.actualPartsUsed);
    } else if (workOrder.requiresParts && workOrder.requiredParts && workOrder.requiredParts.length > 0) {
      const initialParts: UsedPartItem[] = workOrder.requiredParts.map(rp => {
        const foundSp = spareParts.find(s => s.id === rp.partId);
        const unitPrice = rp.unitCost || foundSp?.pricePerUnit || 0;
        return {
          partId: rp.partId,
          partName: rp.partName,
          quantity: rp.quantityRequired,
          pricePerUnit: unitPrice,
          totalCost: rp.quantityRequired * unitPrice,
          unit: foundSp?.unit || 'ชิ้น'
        };
      });
      setUsedPartsList(initialParts);
    } else {
      setUsedPartsList([]);
    }

    setSaveToKnowledge(workOrder.sourceType === 'BREAKDOWN');
    setKnowledgeType(workOrder.sourceType === 'BREAKDOWN' ? 'WHY_WHY' : 'TROUBLESHOOTING');
  }, [workOrder, isOpen]);

  // When subsystem changes, auto-set symptomCode to first in subsystem
  const availableSymptoms = useMemo(() => {
    return getSymptomsBySubsystem(failureSubsystem);
  }, [failureSubsystem]);

  useEffect(() => {
    if (availableSymptoms.length > 0 && !availableSymptoms.some(s => s.code === symptomCode)) {
      setSymptomCode(availableSymptoms[0].code);
    }
  }, [availableSymptoms, symptomCode]);

  // When causeCode or actionCode changes, offer to auto-populate Why-1 & Corrective Action if empty
  const selectedCauseDef = useMemo(() => findCauseByCode(causeCode), [causeCode]);
  const selectedActionDef = useMemo(() => findActionByCode(actionCode), [actionCode]);
  const selectedSymptomDef = useMemo(() => findSymptomByCode(symptomCode), [symptomCode]);

  const handleApplyCauseToAction = () => {
    if (selectedCauseDef && !rootCauseWhy1) {
      setRootCauseWhy1(selectedCauseDef.label);
    }
    if (selectedActionDef && !correctiveAction) {
      setCorrectiveAction(selectedActionDef.label);
    }
  };

  if (!isOpen || !workOrder) return null;

  const handleRelease = () => {
    const res = releaseWorkOrder(workOrder.id, currentUser?.name);
    setReleaseFeedback(res);
  };

  // Spare parts management helpers
  const handleUpdatePartQty = (partId: string, newQty: number) => {
    const validQty = Math.max(0, newQty);
    setUsedPartsList(prev => prev.map(p => {
      if (p.partId === partId) {
        return {
          ...p,
          quantity: validQty,
          totalCost: validQty * (p.pricePerUnit || 0)
        };
      }
      return p;
    }));
  };

  const handleRemovePart = (partId: string) => {
    setUsedPartsList(prev => prev.filter(p => p.partId !== partId));
  };

  const handleAddStockPart = (sp: (typeof spareParts)[0]) => {
    if (usedPartsList.some(p => p.partId === sp.id)) {
      // If already present, increment quantity
      handleUpdatePartQty(sp.id, (usedPartsList.find(p => p.partId === sp.id)?.quantity || 1) + 1);
    } else {
      const newItem: UsedPartItem = {
        partId: sp.id,
        partName: sp.name,
        quantity: 1,
        pricePerUnit: sp.pricePerUnit || 0,
        totalCost: sp.pricePerUnit || 0,
        unit: sp.unit || 'ชิ้น'
      };
      setUsedPartsList(prev => [...prev, newItem]);
    }
    setShowAddPartModal(false);
  };

  const handleAddCustomPartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPartName.trim()) return;
    const customId = `custom-part-${Date.now()}`;
    const newItem: UsedPartItem = {
      partId: customId,
      partName: customPartName.trim(),
      quantity: Math.max(1, customPartQty),
      pricePerUnit: Math.max(0, customPartPrice),
      totalCost: Math.max(1, customPartQty) * Math.max(0, customPartPrice),
      isCustom: true,
      unit: customPartUnit || 'ชิ้น'
    };
    setUsedPartsList(prev => [...prev, newItem]);
    setCustomPartName('');
    setCustomPartQty(1);
    setCustomPartPrice(0);
    setShowAddCustomPart(false);
  };

  // Filter available spare parts for dropdown modal
  const filteredSpareParts = useMemo(() => {
    const q = partSearchQuery.toLowerCase().trim();
    if (!q) return spareParts.slice(0, 30);
    return spareParts.filter(sp => 
      sp.name.toLowerCase().includes(q) ||
      sp.id.toLowerCase().includes(q) ||
      sp.category.toLowerCase().includes(q)
    );
  }, [spareParts, partSearchQuery]);

  const totalPartsCost = useMemo(() => {
    return usedPartsList.reduce((acc, p) => acc + (p.totalCost || (p.quantity * (p.pricePerUnit || 0))), 0);
  }, [usedPartsList]);

  // Construct Failure Code object
  const computedFailureCode: WorkOrderFailureCode = {
    subsystem: failureSubsystem,
    subsystemLabel: findSubsystemDef(failureSubsystem).label,
    symptomCode,
    symptomLabel: customSymptom.trim() || selectedSymptomDef?.label || symptomCode,
    causeCode,
    causeLabel: customCause.trim() || selectedCauseDef?.label || causeCode,
    actionCode,
    actionLabel: customAction.trim() || selectedActionDef?.label || actionCode,
    severity: failureSeverity
  };

  const handleCompleteAndClose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedBy.trim()) return;

    closeWorkOrder(workOrder.id, {
      actualDurationMins,
      workSummaryNotes: workSummaryNotes.trim() || (workOrder.description ? `ซ่อมเสร็จ: ${workOrder.description}` : 'งานบำรุงรักษาเสร็จสิ้น'),
      rootCauseWhy1: rootCauseWhy1.trim() || computedFailureCode.causeLabel,
      correctiveAction: correctiveAction.trim() || computedFailureCode.actionLabel,
      acceptedBy: acceptedBy.trim(),
      satisfactionRating,
      handoverNotes: handoverNotes.trim(),
      // Phase 3 attributes
      failureCode: computedFailureCode,
      actualPartsUsed: usedPartsList,
      syncToRepairLog,
      saveToKnowledge,
      knowledgeType
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-[#0b1325] border border-cyan-500/50 rounded-2xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-cyan-500/30"
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
                  {workOrder.workCategory === 'PLANNED' ? 'Planned Work' : 'Unplanned (Breakdown)'}
                </span>
                <span className={`text-[10.5px] px-2 py-0.5 rounded-full font-bold ${
                  workOrder.status === 'CLOSED'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                    : workOrder.status === 'RELEASED'
                    ? 'bg-blue-950 text-blue-300 border border-blue-500/40 animate-pulse'
                    : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                }`}>
                  {workOrder.status === 'CLOSED' && '✅ ปิดงานสมบูรณ์'}
                  {workOrder.status === 'RELEASED' && '🚀 ปล่อยงานแล้ว (กำลังทำ)'}
                  {workOrder.status === 'READY_TO_RELEASE' && '🟢 พร้อมปล่อยงาน'}
                  {workOrder.status === 'WAITING_PARTS' && '🔴 รออะไหล่'}
                  {workOrder.status === 'PENDING_SCHEDULE' && '🟡 รอเวลา/คน'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white mt-1 leading-snug">
                {workOrder.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="พิมพ์ใบสั่งงาน Work Order"
            >
              <Printer size={18} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 bg-slate-900/90 border-b border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'details'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FileText size={15} />
            <span>รายละเอียดใบงาน</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('handover')}
            className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'handover'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 size={15} />
            <span>
              {isClosed ? 'ผลลัพธ์การปิดงาน & Failure Codes' : 'ปิดงาน & ตัดสต็อกอะไหล่ (Handover)'}
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {releaseFeedback && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
              releaseFeedback.success
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}>
              {releaseFeedback.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{releaseFeedback.message}</span>
            </div>
          )}

          {activeTab === 'details' && (
            <>
              {/* 4 Pillars Readiness Status (Readiness Gate) */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck size={16} className={isReady ? 'text-emerald-400' : 'text-amber-400'} />
                    <span>เกณฑ์ความพร้อม 4 เสาหลัก (Readiness Gate)</span>
                  </h3>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    isReady
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                  }`}>
                    {isReady ? 'ผ่านเกณฑ์ความพร้อม 100%' : 'ยังไม่พร้อมปล่อยงาน'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Pillar 1: Time Scheduled */}
                  <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                    workOrder.readiness.timeScheduled
                      ? 'bg-slate-900/90 border-emerald-500/30'
                      : 'bg-slate-900/60 border-rose-500/40'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">1. กำหนดเวลาเริ่ม</span>
                      {workOrder.readiness.timeScheduled ? (
                        <CheckCircle2 size={15} className="text-emerald-400" />
                      ) : (
                        <AlertTriangle size={15} className="text-rose-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-mono text-xs font-bold text-white">
                        {workOrder.scheduledDate}
                      </div>
                      <div className="text-[10px] text-cyan-400 font-mono">
                        {workOrder.scheduledStartTime} {workOrder.scheduledEndTime ? `- ${workOrder.scheduledEndTime}` : ''} น.
                      </div>
                    </div>
                  </div>

                  {/* Pillar 2: Duration Valid */}
                  <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                    workOrder.readiness.estimatedDurationValid
                      ? 'bg-slate-900/90 border-emerald-500/30'
                      : 'bg-slate-900/60 border-rose-500/40'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">2. ประมาณเวลา</span>
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

              {/* If already Closed, show Closed Summary Banner */}
              {isClosed && (
                <div className="bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900 border border-emerald-500/40 p-4 rounded-xl space-y-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-emerald-400" />
                      <h4 className="font-black text-sm text-white">บันทึกผลการปิดงานสมบูรณ์ (Closed Record)</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">ตรวจรับโดย:</span>
                      <strong className="text-emerald-300 text-xs">{workOrder.productionAcceptedBy || '-'}</strong>
                      <div className="flex items-center text-amber-400 ml-2">
                        {[1, 2, 3, 4, 5].map(st => (
                          <Star 
                            key={st} 
                            size={13} 
                            className={st <= (workOrder.satisfactionRating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-600'} 
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Failure Code Badge Display */}
                  {workOrder.failureCode && (
                    <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                          🏷️ รหัสการชำรุด (CMMS Failure Codes):
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          workOrder.failureCode.severity === 'CRITICAL' ? 'bg-rose-900/80 text-rose-300 border border-rose-500/40' :
                          workOrder.failureCode.severity === 'HIGH' ? 'bg-amber-900/80 text-amber-300 border border-amber-500/40' :
                          'bg-cyan-900/80 text-cyan-300 border border-cyan-500/40'
                        }`}>
                          ความรุนแรง: {workOrder.failureCode.severity}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="bg-slate-900 p-2 rounded border border-slate-800">
                          <span className="text-slate-500 text-[10px] block">อาการผิดปกติ (Symptom):</span>
                          <strong className="text-cyan-400 font-mono text-xs">{workOrder.failureCode.symptomCode}</strong>
                          <div className="text-slate-200 text-[11px] truncate">{workOrder.failureCode.symptomLabel}</div>
                        </div>
                        <div className="bg-slate-900 p-2 rounded border border-slate-800">
                          <span className="text-slate-500 text-[10px] block">สาเหตุรากเหง้า (Cause):</span>
                          <strong className="text-amber-400 font-mono text-xs">{workOrder.failureCode.causeCode}</strong>
                          <div className="text-slate-200 text-[11px] truncate">{workOrder.failureCode.causeLabel}</div>
                        </div>
                        <div className="bg-slate-900 p-2 rounded border border-slate-800">
                          <span className="text-slate-500 text-[10px] block">วิธีแก้ไขจัดการ (Action):</span>
                          <strong className="text-emerald-400 font-mono text-xs">{workOrder.failureCode.actionCode}</strong>
                          <div className="text-slate-200 text-[11px] truncate">{workOrder.failureCode.actionLabel}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Consumed parts in closed work order */}
                  {workOrder.actualPartsUsed && workOrder.actualPartsUsed.length > 0 && (
                    <div className="text-xs">
                      <div className="flex items-center justify-between text-slate-400 mb-1 font-bold">
                        <span>📦 อะไหล่ที่เบิกใช้จริงและตัดสต็อกแล้ว ({workOrder.actualPartsUsed.length} รายการ):</span>
                        <span className="text-emerald-400 font-mono">
                          มูลค่ารวม: ฿{(workOrder.totalPartsCost || 0).toLocaleString()} บาท
                        </span>
                      </div>
                      <div className="bg-slate-950/60 rounded-lg border border-slate-800 p-2 space-y-1">
                        {workOrder.actualPartsUsed.map((ap, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-800/50 last:border-none">
                            <span className="text-slate-300 font-medium">{ap.partName}</span>
                            <span className="font-mono text-slate-400">
                              {ap.quantity} {ap.unit || 'ชิ้น'} × ฿{(ap.pricePerUnit || 0).toLocaleString()} = <strong className="text-amber-400">฿{(ap.totalCost || (ap.quantity * (ap.pricePerUnit || 0))).toLocaleString()}</strong>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {workOrder.savedToKnowledge && (
                    <div className="p-2.5 bg-cyan-950/40 border border-cyan-500/30 rounded-lg flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-cyan-300">
                        <Sparkles size={15} className="text-cyan-400" />
                        <span>บันทึกเป็นกรณีศึกษาใน <strong>Active Knowledge Center</strong> เรียบร้อยแล้ว</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActivePage(7); // Switch to Active Knowledge Center page
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[11px] font-bold transition flex items-center gap-1"
                      >
                        <span>เปิดคลังความรู้</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Breakdown Source Reference */}
              {workOrder.sourceType === 'BREAKDOWN' && (() => {
                const linkedRepair = repairs.find(r => 
                  (workOrder.sourceRefId && r.id === workOrder.sourceRefId) ||
                  r.workOrderId === workOrder.id || 
                  r.workOrderNo === workOrder.id ||
                  (workOrder.workOrderNo && (r.workOrderId === workOrder.workOrderNo || r.workOrderNo === workOrder.workOrderNo))
                );

                if (linkedRepair) {
                  return (
                    <div className="bg-slate-900/90 border border-cyan-500/40 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-md">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-mono font-bold shrink-0">
                          #{linkedRepair.id}
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>เชื่อมโยงจากงานซ่อมเบรกดาวน์: {linkedRepair.symptoms}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            ช่างผู้ซ่อม: <strong className="text-slate-300">{linkedRepair.technician}</strong> • เวลาหยุดเดินเครื่อง: <strong className="text-amber-400 font-mono">{linkedRepair.duration} นาที</strong>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigateToRepairs({ targetRepairIds: [linkedRepair.id], filterTitle: `งานซ่อม ${linkedRepair.id}` });
                          onClose();
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition cursor-pointer shrink-0 self-end sm:self-auto"
                      >
                        ดูบันทึกงานซ่อม →
                      </button>
                    </div>
                  );
                }

                return null;
              })()}

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

              {/* Active CMMS Contextual Knowledge Assistant */}
              <ContextualKnowledgeAssistant
                machineId={workOrder.machineId}
                machineName={workOrder.machineName || workOrder.title}
                symptoms={workOrder.description || workOrder.title}
              />

              {/* Spare Parts List Table (Kitting) */}
              {!isClosed && workOrder.requiresParts && workOrder.requiredParts && workOrder.requiredParts.length > 0 && (
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

              {/* Actions Footer */}
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
                    >
                      <Trash2 size={13} />
                      <span>ลบใบงาน</span>
                    </button>
                  )}

                  {onEdit && !isClosed && (
                    <button
                      type="button"
                      onClick={() => onEdit(workOrder)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-amber-500/20 text-slate-200 hover:text-amber-300 border border-slate-700 hover:border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
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
                      <span>ซ่อมเสร็จแล้ว → บันทึกปิดงาน & ตัดอะไหล่</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'handover' && (
            <form onSubmit={handleCompleteAndClose} className="space-y-5">
              {/* Top Banner */}
              <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white text-sm">
                    {isClosed ? 'ข้อมูลการปิดงานสมบูรณ์ (Closed Work Order Details)' : 'สถานีปิดใบงาน & ตัดอะไหล่สมบูรณ์แบบ (CMMS Closure Station)'}
                  </h4>
                  <p className="text-[11px] text-emerald-300/90 mt-0.5">
                    บันทึก Failure Codes ตามมาตรฐาน ISO 14224 ตรวจสอบและตัดยอดอะไหล่จริง และซิงก์ข้อมูลอัตโนมัติเข้า MTBF/Bad Actor และคลังความรู้ Active CMMS
                  </p>
                </div>
              </div>

              {/* SECTION 1: DURATION & WORK SUMMARY */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Clock size={15} className="text-cyan-400" />
                  <span>1. สรุปผลงาน & เวลาปฏิบัติงานจริง</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      เวลาปฏิบัติงานจริง (Actual Duration - นาที) *
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={actualDurationMins}
                        onChange={(e) => setActualDurationMins(parseInt(e.target.value, 10) || 1)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono font-bold focus:border-emerald-500"
                        required
                        disabled={isClosed}
                      />
                      {!isClosed && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setActualDurationMins(prev => Math.max(5, prev - 15))}
                            className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
                            title="-15 นาที"
                          >
                            -15m
                          </button>
                          <button
                            type="button"
                            onClick={() => setActualDurationMins(prev => prev + 15)}
                            className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
                            title="+15 นาที"
                          >
                            +15m
                          </button>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      ประมาณการเดิม: {workOrder.estimatedDurationMins} นาที • ผลต่าง: {actualDurationMins - workOrder.estimatedDurationMins > 0 ? `+${actualDurationMins - workOrder.estimatedDurationMins} นาที` : `${actualDurationMins - workOrder.estimatedDurationMins} นาที`}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      ชื่อผู้ตรวจรับงาน (ตัวแทนฝ่ายผลิต) *
                    </label>
                    <input
                      type="text"
                      value={acceptedBy}
                      onChange={(e) => setAcceptedBy(e.target.value)}
                      placeholder="เช่น คุณมาโนช (หัวหน้ากะ), คุณสมศรี"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs sm:text-sm focus:border-emerald-500"
                      required
                      disabled={isClosed}
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
                    placeholder="ระบุสิ่งที่ทำ เช่น เปลี่ยนสายพานใหม่ ล้างทำความสะอาดร่องเฟือง ทดสอบเดินเครื่อง 15 นาที ไร้เสียงผิดปกติ..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-emerald-500"
                    required
                    disabled={isClosed}
                  />
                </div>
              </div>

              {/* SECTION 2: FAILURE CODES ENGINE (ISO 14224 / CMMS) */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-cyan-500/30 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                    <Tag size={15} />
                    <span>2. รหัสจำแนกการชำรุด (CMMS Failure Codes Standard)</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">ระดับความรุนแรง:</span>
                    <select
                      value={failureSeverity}
                      onChange={(e) => setFailureSeverity(e.target.value as any)}
                      disabled={isClosed}
                      className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs font-bold text-white focus:border-cyan-500"
                    >
                      <option value="LOW">ต่ำ (Low Loss)</option>
                      <option value="MEDIUM">ปานกลาง (Medium)</option>
                      <option value="HIGH">สูง (High - สายพานชะลอ)</option>
                      <option value="CRITICAL">วิกฤตไลน์หยุด (Critical Stop)</option>
                    </select>
                  </div>
                </div>

                {/* Subsystem Tabs */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
                    กลุ่มระบบเครื่องจักร (Subsystem):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
                    {FAILURE_SUBSYSTEMS.map(sub => (
                      <button
                        key={sub.key}
                        type="button"
                        disabled={isClosed}
                        onClick={() => setFailureSubsystem(sub.key)}
                        className={`p-2 rounded-xl text-center border transition cursor-pointer flex flex-col items-center gap-1 ${
                          failureSubsystem === sub.key
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                      >
                        <span className="text-base">{sub.icon}</span>
                        <span className="text-[10px] leading-tight line-clamp-1">{sub.label.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Symptoms, Causes, and Actions Pickers */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Failure Symptom */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-cyan-300">
                      อาการผิดปกติ (Symptom Code) *
                    </label>
                    <select
                      value={symptomCode}
                      onChange={(e) => {
                        setSymptomCode(e.target.value);
                        const s = findSymptomByCode(e.target.value);
                        if (s) setCustomSymptom(s.label);
                      }}
                      disabled={isClosed}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono font-medium focus:border-cyan-500"
                    >
                      {availableSymptoms.map(sym => (
                        <option key={sym.code} value={sym.code}>
                          [{sym.code}] {sym.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={customSymptom}
                      onChange={(e) => setCustomSymptom(e.target.value)}
                      placeholder="ระบุอาการเพิ่มเติม..."
                      disabled={isClosed}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-200 text-[11px] focus:border-cyan-500"
                    />
                  </div>

                  {/* Failure Cause */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-amber-300">
                      สาเหตุการชำรุด (Cause Code) *
                    </label>
                    <select
                      value={causeCode}
                      onChange={(e) => {
                        setCauseCode(e.target.value);
                        const c = findCauseByCode(e.target.value);
                        if (c) {
                          setCustomCause(c.label);
                          if (!rootCauseWhy1) setRootCauseWhy1(c.label);
                        }
                      }}
                      disabled={isClosed}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono font-medium focus:border-amber-500"
                    >
                      {FAILURE_CAUSES.map(c => (
                        <option key={c.code} value={c.code}>
                          [{c.code}] {c.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={customCause}
                      onChange={(e) => setCustomCause(e.target.value)}
                      placeholder="ระบุสาเหตุเพิ่มเติม..."
                      disabled={isClosed}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-200 text-[11px] focus:border-amber-500"
                    />
                  </div>

                  {/* Remedy Action */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-emerald-300">
                      วิธีแก้ไขจัดการ (Action Code) *
                    </label>
                    <select
                      value={actionCode}
                      onChange={(e) => {
                        setActionCode(e.target.value);
                        const a = findActionByCode(e.target.value);
                        if (a) {
                          setCustomAction(a.label);
                          if (!correctiveAction) setCorrectiveAction(a.label);
                        }
                      }}
                      disabled={isClosed}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono font-medium focus:border-emerald-500"
                    >
                      {FAILURE_ACTIONS.map(a => (
                        <option key={a.code} value={a.code}>
                          [{a.code}] {a.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={customAction}
                      onChange={(e) => setCustomAction(e.target.value)}
                      placeholder="ระบุวิธีแก้ไขเพิ่มเติม..."
                      disabled={isClosed}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-200 text-[11px] focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Live Failure Code Preview Badge */}
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400">รหัสที่สร้าง:</span>
                    <span className="px-2 py-0.5 rounded font-mono font-black bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                      {symptomCode}
                    </span>
                    <span className="text-slate-600">/</span>
                    <span className="px-2 py-0.5 rounded font-mono font-black bg-amber-950 text-amber-400 border border-amber-800/60">
                      {causeCode}
                    </span>
                    <span className="text-slate-600">/</span>
                    <span className="px-2 py-0.5 rounded font-mono font-black bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                      {actionCode}
                    </span>
                  </div>
                  {!isClosed && (
                    <button
                      type="button"
                      onClick={handleApplyCauseToAction}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                    >
                      นำเข้าฟิลด์ Why-Why อัตโนมัติ
                    </button>
                  )}
                </div>
              </div>

              {/* SECTION 3: COMPLETE SPARE PARTS DEDUCTION */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package size={15} className="text-amber-400" />
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      3. รายการอะไหล่ที่เบิกใช้จริงและตัดสต็อก (Inventory Consumption)
                    </h3>
                  </div>

                  {!isClosed && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddPartModal(true)}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>เบิกจากคลัง</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddCustomPart(true)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>อะไหล่นอกคลัง</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Parts Table */}
                {usedPartsList.length === 0 ? (
                  <div className="bg-slate-950/60 border border-dashed border-slate-800 p-4 rounded-xl text-center text-xs text-slate-500">
                    ไม่มีการเบิกใช้อะไหล่ในใบงานนี้ (หากมีการเปลี่ยนชิ้นส่วน สามารถกด &quot;เบิกจากคลัง&quot; เพื่อตัดสต็อกได้)
                  </div>
                ) : (
                  <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-3">รายการอะไหล่</th>
                          <th className="py-2 px-3 text-center">ราคาต่อหน่วย</th>
                          <th className="py-2 px-3 text-center">จำนวนใช้จริง</th>
                          <th className="py-2 px-3 text-right">รวมเงิน (฿)</th>
                          {!isClosed && <th className="py-2 px-2 text-center w-10">ลบ</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-slate-300">
                        {usedPartsList.map(p => {
                          const stockItem = spareParts.find(s => s.id === p.partId);
                          const currentStock = stockItem ? stockItem.quantity : undefined;
                          const isOverStock = currentStock !== undefined && p.quantity > currentStock;

                          return (
                            <tr key={p.partId} className="hover:bg-slate-950/40">
                              <td className="py-2.5 px-3">
                                <div className="font-medium text-white">{p.partName}</div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-2 font-mono">
                                  <span>รหัส: {p.partId}</span>
                                  {currentStock !== undefined && (
                                    <span className={isOverStock ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                                      (ในคลังคงเหลือ: {currentStock} {p.unit || 'ชิ้น'})
                                    </span>
                                  )}
                                  {p.isCustom && <span className="text-amber-400">(อะไหล่นอกคลัง)</span>}
                                </div>
                              </td>

                              <td className="py-2.5 px-3 text-center font-mono">
                                ฿{(p.pricePerUnit || 0).toLocaleString()}
                              </td>

                              <td className="py-2.5 px-3 text-center">
                                {isClosed ? (
                                  <span className="font-mono font-bold text-white">{p.quantity} {p.unit || 'ชิ้น'}</span>
                                ) : (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdatePartQty(p.partId, p.quantity - 1)}
                                      className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min={0}
                                      value={p.quantity}
                                      onChange={(e) => handleUpdatePartQty(p.partId, parseInt(e.target.value, 10) || 0)}
                                      className="w-14 px-1.5 py-1 rounded bg-slate-950 border border-slate-700 text-center font-mono font-bold text-white text-xs"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleUpdatePartQty(p.partId, p.quantity + 1)}
                                      className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs"
                                    >
                                      +
                                    </button>
                                    <span className="text-[10px] text-slate-400 ml-1">{p.unit || 'ชิ้น'}</span>
                                  </div>
                                )}
                              </td>

                              <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                                ฿{(p.totalCost || (p.quantity * (p.pricePerUnit || 0))).toLocaleString()}
                              </td>

                              {!isClosed && (
                                <td className="py-2.5 px-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePart(p.partId)}
                                    className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                                  >
                                    <Trash size={14} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Total Cost Card */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Coins size={16} className="text-amber-400" />
                    <span>ยอดรวมค่าอะไหล่ที่จะตัดสต็อก:</span>
                  </div>
                  <div className="text-base font-mono font-black text-amber-400">
                    ฿{totalPartsCost.toLocaleString()} บาท
                  </div>
                </div>
              </div>

              {/* SECTION 4: WHY-WHY ROOT CAUSE & CORRECTIVE ACTION */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-rose-300 mb-1">
                    สาเหตุรากเหง้า (Root Cause / Why 1)
                  </label>
                  <input
                    type="text"
                    value={rootCauseWhy1}
                    onChange={(e) => setRootCauseWhy1(e.target.value)}
                    placeholder="เช่น ลูกปืนหมดอายุ, ฝุ่นแป้งขัดเฟืองโซ่ขับ"
                    disabled={isClosed}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-rose-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    ใช้เป็นข้อมูลสืบค้นสำหรับระบบ Why-Why Analysis
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-300 mb-1">
                    มาตรการป้องกันการเกิดซ้ำ (Corrective Action)
                  </label>
                  <input
                    type="text"
                    value={correctiveAction}
                    onChange={(e) => setCorrectiveAction(e.target.value)}
                    placeholder="เช่น ปรับรอบ PM ให้ถี่ขึ้น, เสริมการ์ดกันฝุ่น"
                    disabled={isClosed}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    แนวทางป้องกันไม่ให้เครื่องจักรหยุดซ้ำจุดเดิม
                  </span>
                </div>
              </div>

              {/* SECTION 5: KNOWLEDGE CAPTURE & HISTORY SYNCHRONIZATION */}
              {!isClosed && (
                <div className="bg-cyan-950/20 border border-cyan-500/30 p-4 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={15} className="text-cyan-400" />
                    <span>การเชื่อมโยงระบบอัจฉริยะ (Smart Active Integration)</span>
                  </h4>

                  <div className="space-y-2">
                    <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-200">
                      <input
                        type="checkbox"
                        checked={saveToKnowledge}
                        onChange={(e) => setSaveToKnowledge(e.target.checked)}
                        className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-0"
                      />
                      <div>
                        <strong className="text-white block">
                          💡 บันทึกเข้าศูนย์คลังความรู้ Active Knowledge Center
                        </strong>
                        <span className="text-[11px] text-slate-400">
                          แปลงเคสนี้เป็นกรณีศึกษาให้ทีมสืบค้นอัตโนมัติ (Manual, WI, Troubleshooting, Why-Why)
                        </span>
                      </div>
                    </label>

                    {saveToKnowledge && (
                      <div className="pl-6 flex items-center gap-3 pt-1">
                        <span className="text-[11px] text-cyan-400 font-bold">ประเภทองค์ความรู้:</span>
                        <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            name="ktype"
                            value="WHY_WHY"
                            checked={knowledgeType === 'WHY_WHY'}
                            onChange={() => setKnowledgeType('WHY_WHY')}
                            className="text-cyan-500"
                          />
                          <span>กรณีศึกษา Why-Why Analysis</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            name="ktype"
                            value="TROUBLESHOOTING"
                            checked={knowledgeType === 'TROUBLESHOOTING'}
                            onChange={() => setKnowledgeType('TROUBLESHOOTING')}
                            className="text-cyan-500"
                          />
                          <span>คู่มือแก้ปัญหา (Troubleshooting)</span>
                        </label>
                      </div>
                    )}

                    <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-200 pt-1">
                      <input
                        type="checkbox"
                        checked={syncToRepairLog}
                        onChange={(e) => setSyncToRepairLog(e.target.checked)}
                        className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-0"
                      />
                      <div>
                        <strong className="text-white block">
                          📊 บันทึกประวัติซ่อมบำรุงและรายงาน Bad Actor อัตโนมัติ
                        </strong>
                        <span className="text-[11px] text-slate-400">
                          อัปเดตสถิติ MTBF/MTTR, Pareto 80/20 และการจัดอันดับเครื่องจักรวิกฤตแบบ Real-time
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* SECTION 6: HANDOVER SIGN-OFF & SATISFACTION */}
              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">ระดับความพึงพอใจฝ่ายผลิต:</span>
                    <span className="text-[11px] text-slate-400">ประเมินคุณภาพงานและการส่งมอบเครื่องจักร</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        disabled={isClosed}
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
                    disabled={isClosed}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition cursor-pointer"
                >
                  ย้อนกลับ
                </button>

                {!isClosed && (
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition cursor-pointer"
                  >
                    <CheckCircle2 size={16} />
                    <span>บันทึกตรวจรับ ตัดสต็อก & ปิด Work Order สมบูรณ์</span>
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* MODAL: ADD PART FROM INVENTORY */}
        {showAddPartModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#0b1325] border border-cyan-500/50 rounded-2xl w-full max-w-lg shadow-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                  <Package size={17} />
                  <span>เลือกอะไหล่จากคลังเพื่อเบิกตัดยอด</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddPartModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={partSearchQuery}
                  onChange={(e) => setPartSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่ออะไหล่ รหัส SKU หรือหมวดหมู่..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-cyan-500"
                  autoFocus
                />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1 divide-y divide-slate-800/60">
                {filteredSpareParts.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-500">
                    ไม่พบรายการอะไหล่ที่ค้นหา
                  </div>
                ) : (
                  filteredSpareParts.map(sp => (
                    <div 
                      key={sp.id}
                      onClick={() => handleAddStockPart(sp)}
                      className="py-2 px-2.5 hover:bg-slate-900/80 rounded-lg flex items-center justify-between cursor-pointer transition"
                    >
                      <div>
                        <div className="font-semibold text-white text-xs">{sp.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          รหัส: {sp.id} • หมวด: {sp.category}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-cyan-400 font-bold text-xs">
                          ฿{(sp.pricePerUnit || 0).toLocaleString()}
                        </div>
                        <div className={`text-[10px] ${sp.quantity > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          คงคลัง: {sp.quantity} {sp.unit}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddPartModal(false)}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: ADD CUSTOM PART */}
        {showAddCustomPart && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#0b1325] border border-cyan-500/50 rounded-2xl w-full max-w-md shadow-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <Wrench size={17} />
                  <span>ระบุอะไหล่นอกคลัง / งานสั่งทำพิเศษ</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddCustomPart(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddCustomPartSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">ชื่ออะไหล่ / ชิ้นส่วน *</label>
                  <input
                    type="text"
                    value={customPartName}
                    onChange={(e) => setCustomPartName(e.target.value)}
                    placeholder="เช่น น็อตหกเหลี่ยม SUS316 M8x25, บูชทองเหลืองกลึง"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-500"
                    required
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">จำนวน *</label>
                    <input
                      type="number"
                      min={1}
                      value={customPartQty}
                      onChange={(e) => setCustomPartQty(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-2 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-center font-mono font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">หน่วยนับ</label>
                    <input
                      type="text"
                      value={customPartUnit}
                      onChange={(e) => setCustomPartUnit(e.target.value)}
                      placeholder="ชิ้น/ตัว"
                      className="w-full px-2 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-center text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">ราคาต่อหน่วย (฿)</label>
                    <input
                      type="number"
                      min={0}
                      value={customPartPrice}
                      onChange={(e) => setCustomPartPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-right font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCustomPart(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                  >
                    เพิ่มรายการ
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
