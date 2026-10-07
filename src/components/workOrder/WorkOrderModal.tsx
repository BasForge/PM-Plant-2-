import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  WorkOrder, WorkOrderType, WorkOrderPriority, WorkOrderPartRequirement 
} from '../../types';
import { evaluateWorkOrderReadiness } from '../../utils/workOrderUtils';
import { 
  X, CheckCircle2, AlertTriangle, ShieldCheck, Clock, User, 
  Wrench, Package, Calendar, Plus, Trash2, ShieldAlert, Sparkles 
} from 'lucide-react';

interface WorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: WorkOrder | null;
  fromWorkRequestId?: string;
  onSaved?: (wo: WorkOrder) => void;
}

export const WorkOrderModal: React.FC<WorkOrderModalProps> = ({
  isOpen,
  onClose,
  initialData,
  fromWorkRequestId,
  onSaved
}) => {
  const { machines, technicians, spareParts, currentUser, addWorkOrder, updateWorkOrder, updateWorkRequest, workRequests, pmPlans } = useApp();

  // Find linked Work Request if passed
  const linkedRequest = useMemo(() => {
    if (fromWorkRequestId) {
      return workRequests.find(r => r.id === fromWorkRequestId);
    }
    return null;
  }, [fromWorkRequestId, workRequests]);

  const [title, setTitle] = useState<string>(() => {
    if (initialData) return initialData.title;
    if (linkedRequest) return `งานแก้ไขตามใบแจ้งซ่อม #${linkedRequest.ticketNo || linkedRequest.id}: ${linkedRequest.problemTitle}`;
    return '';
  });

  const [description, setDescription] = useState<string>(() => {
    if (initialData) return initialData.description;
    if (linkedRequest) return linkedRequest.problemDetails;
    return '';
  });

  const [sourceType, setSourceType] = useState<WorkOrderType>(() => {
    if (initialData) return initialData.sourceType;
    if (linkedRequest) return linkedRequest.priority === 'ฉุกเฉินไลน์หยุด' ? 'BREAKDOWN' : 'CORRECTIVE';
    return 'PM';
  });

  const [priority, setPriority] = useState<WorkOrderPriority>(() => {
    if (initialData) return initialData.priority;
    if (linkedRequest) return linkedRequest.priority;
    return 'ตามแผนนัดหมาย';
  });

  const [machineId, setMachineId] = useState<string>(() => {
    if (initialData) return initialData.machineId;
    if (linkedRequest) return linkedRequest.machineId;
    return machines[0]?.id || 'ATS03';
  });

  const [scheduledDate, setScheduledDate] = useState<string>(() => {
    if (initialData) return initialData.scheduledDate;
    if (linkedRequest?.engineeringResponse?.targetStartDate) return linkedRequest.engineeringResponse.targetStartDate;
    return new Date().toISOString().slice(0, 10);
  });

  const [scheduledStartTime, setScheduledStartTime] = useState<string>(() => {
    if (initialData) return initialData.scheduledStartTime;
    if (linkedRequest?.engineeringResponse?.targetStartTime) return linkedRequest.engineeringResponse.targetStartTime;
    return '09:00';
  });

  const [estimatedDurationMins, setEstimatedDurationMins] = useState<number>(() => {
    if (initialData) return initialData.estimatedDurationMins;
    if (linkedRequest?.engineeringResponse?.estimatedDurationMins) return linkedRequest.engineeringResponse.estimatedDurationMins;
    return 60;
  });

  const [assignedTechnicians, setAssignedTechnicians] = useState<string[]>(() => {
    if (initialData) return initialData.assignedTechnicians;
    if (linkedRequest?.engineeringResponse?.assignedTechnicians && linkedRequest.engineeringResponse.assignedTechnicians.length > 0) {
      return linkedRequest.engineeringResponse.assignedTechnicians;
    }
    return technicians.slice(0, 2);
  });

  const [leadTechnician, setLeadTechnician] = useState<string>(() => {
    if (initialData) return initialData.leadTechnician || initialData.assignedTechnicians[0] || '';
    if (linkedRequest?.engineeringResponse?.assignedTechnicians?.[0]) return linkedRequest.engineeringResponse.assignedTechnicians[0];
    return technicians[0] || 'ช่างอุ้ย';
  });

  const [requiresParts, setRequiresParts] = useState<boolean>(() => {
    if (initialData) return initialData.requiresParts;
    return false;
  });

  const [requiredParts, setRequiredParts] = useState<WorkOrderPartRequirement[]>(() => {
    if (initialData && initialData.requiredParts) return initialData.requiredParts;
    return [];
  });

  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [selectedPartQty, setSelectedPartQty] = useState<number>(1);

  const [lotoRequired, setLotoRequired] = useState<boolean>(() => {
    if (initialData) return initialData.lotoRequired;
    return true;
  });

  const [lotoTag, setLotoTag] = useState<string>(() => {
    if (initialData) return initialData.lotoTag || '';
    return `LOTO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;
  });

  // Spare parts stock lookup
  const stockMap = useMemo(() => {
    const map: Record<string, number> = {};
    spareParts.forEach(p => {
      map[p.id] = p.stock;
    });
    return map;
  }, [spareParts]);

  // Live evaluation of 4-Pillar Readiness Gate
  const readinessPreview = useMemo(() => {
    const draft: Partial<WorkOrder> = {
      scheduledDate,
      scheduledStartTime,
      estimatedDurationMins,
      assignedTechnicians,
      requiresParts,
      requiredParts
    };
    return evaluateWorkOrderReadiness(draft, stockMap);
  }, [scheduledDate, scheduledStartTime, estimatedDurationMins, assignedTechnicians, requiresParts, requiredParts, stockMap]);

  // Synchronize form states whenever modal opens or initialData changes
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setSourceType(initialData.sourceType || 'PM');
      setPriority(initialData.priority || 'ตามแผนนัดหมาย');
      setMachineId(initialData.machineId || machines[0]?.id || 'ATS03');
      setScheduledDate(initialData.scheduledDate || new Date().toISOString().slice(0, 10));
      setScheduledStartTime(initialData.scheduledStartTime || '09:00');
      setEstimatedDurationMins(initialData.estimatedDurationMins || 60);
      setAssignedTechnicians(initialData.assignedTechnicians && initialData.assignedTechnicians.length > 0 ? initialData.assignedTechnicians : technicians.slice(0, 2));
      setLeadTechnician(initialData.leadTechnician || initialData.assignedTechnicians?.[0] || technicians[0] || 'ช่างอุ้ย');
      setRequiresParts(Boolean(initialData.requiresParts));
      setRequiredParts(initialData.requiredParts || []);
      setLotoRequired(Boolean(initialData.lotoRequired));
      setLotoTag(initialData.lotoTag || `LOTO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`);
    } else if (linkedRequest) {
      setTitle(`งานแก้ไขตามใบแจ้งซ่อม #${linkedRequest.ticketNo || linkedRequest.id}: ${linkedRequest.problemTitle}`);
      setDescription(linkedRequest.problemDetails || '');
      setSourceType(linkedRequest.priority === 'ฉุกเฉินไลน์หยุด' ? 'BREAKDOWN' : 'CORRECTIVE');
      setPriority(linkedRequest.priority || 'ปกติ');
      setMachineId(linkedRequest.machineId || machines[0]?.id || 'ATS03');
      setScheduledDate(linkedRequest.engineeringResponse?.targetStartDate || new Date().toISOString().slice(0, 10));
      setScheduledStartTime(linkedRequest.engineeringResponse?.targetStartTime || '09:00');
      setEstimatedDurationMins(linkedRequest.engineeringResponse?.estimatedDurationMins || 60);
      setAssignedTechnicians(linkedRequest.engineeringResponse?.assignedTechnicians && linkedRequest.engineeringResponse.assignedTechnicians.length > 0 ? linkedRequest.engineeringResponse.assignedTechnicians : technicians.slice(0, 2));
      setLeadTechnician(linkedRequest.engineeringResponse?.assignedTechnicians?.[0] || technicians[0] || 'ช่างอุ้ย');
      setRequiresParts(false);
      setRequiredParts([]);
      setLotoRequired(true);
      setLotoTag(`LOTO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`);
    } else {
      setTitle('');
      setDescription('');
      setSourceType('PM');
      setPriority('ตามแผนนัดหมาย');
      setMachineId(machines[0]?.id || 'ATS03');
      setScheduledDate(new Date().toISOString().slice(0, 10));
      setScheduledStartTime('09:00');
      setEstimatedDurationMins(60);
      setAssignedTechnicians(technicians.slice(0, 2));
      setLeadTechnician(technicians[0] || 'ช่างอุ้ย');
      setRequiresParts(false);
      setRequiredParts([]);
      setLotoRequired(true);
      setLotoTag(`LOTO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`);
    }
  }, [isOpen, initialData, linkedRequest, machines, technicians]);

  if (!isOpen) return null;

  const handleAddPart = () => {
    if (!selectedPartId || selectedPartQty <= 0) return;
    const part = spareParts.find(p => p.id === selectedPartId);
    if (!part) return;

    const available = part.stock;
    const isAvail = available >= selectedPartQty;

    const existingIdx = requiredParts.findIndex(p => p.partId === selectedPartId);
    if (existingIdx >= 0) {
      const updated = [...requiredParts];
      updated[existingIdx].quantityRequired += selectedPartQty;
      updated[existingIdx].isAvailable = available >= updated[existingIdx].quantityRequired;
      setRequiredParts(updated);
    } else {
      setRequiredParts(prev => [
        ...prev,
        {
          partId: part.id,
          partCode: part.code || part.id,
          partName: part.name,
          quantityRequired: selectedPartQty,
          quantityAvailable: available,
          isAvailable: isAvail,
          isReserved: true,
          unitCost: part.unitPrice || 0
        }
      ]);
    }

    setSelectedPartId('');
    setSelectedPartQty(1);
    setRequiresParts(true);
  };

  const handleRemovePart = (partId: string) => {
    const updated = requiredParts.filter(p => p.partId !== partId);
    setRequiredParts(updated);
    if (updated.length === 0) {
      setRequiresParts(false);
    }
  };

  const toggleTechnician = (techName: string) => {
    if (assignedTechnicians.includes(techName)) {
      const next = assignedTechnicians.filter(t => t !== techName);
      setAssignedTechnicians(next);
      if (leadTechnician === techName && next.length > 0) {
        setLeadTechnician(next[0]);
      }
    } else {
      setAssignedTechnicians(prev => [...prev, techName]);
      if (!leadTechnician) setLeadTechnician(techName);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !machineId) return;

    const mach = machines.find(m => m.id === machineId);
    const workCategory = (sourceType === 'BREAKDOWN' || priority === 'ฉุกเฉินไลน์หยุด')
      ? 'UNPLANNED'
      : 'PLANNED';

    if (initialData) {
      // Update existing
      updateWorkOrder(initialData.id, {
        title: title.trim(),
        description: description.trim(),
        sourceType,
        workCategory,
        priority,
        machineId,
        machineName: mach?.name || machineId,
        lineGroup: mach?.lineGroup || '-',
        scheduledDate,
        scheduledStartTime,
        estimatedDurationMins,
        assignedTechnicians,
        leadTechnician: leadTechnician || assignedTechnicians[0],
        requiresParts,
        requiredParts,
        lotoRequired,
        lotoTag: lotoRequired ? lotoTag : undefined
      });
      if (onSaved) {
        onSaved({
          ...initialData,
          title: title.trim(),
          description: description.trim(),
          sourceType,
          workCategory,
          priority,
          machineId,
          machineName: mach?.name || machineId,
          lineGroup: mach?.lineGroup || '-',
          scheduledDate,
          scheduledStartTime,
          estimatedDurationMins,
          assignedTechnicians,
          leadTechnician: leadTechnician || assignedTechnicians[0],
          requiresParts,
          requiredParts,
          lotoRequired,
          lotoTag: lotoRequired ? lotoTag : undefined,
          readiness: readinessPreview
        });
      }
    } else {
      // Create new
      const created = addWorkOrder({
        workOrderNo: '',
        title: title.trim(),
        description: description.trim(),
        sourceType,
        workCategory,
        priority,
        status: readinessPreview.gatePassed ? 'READY_TO_RELEASE' : (readinessPreview.partsAvailable ? 'PENDING_SCHEDULE' : 'WAITING_PARTS'),
        readiness: readinessPreview,
        machineId,
        machineName: mach?.name || machineId,
        lineGroup: mach?.lineGroup || '-',
        scheduledDate,
        scheduledStartTime,
        estimatedDurationMins,
        assignedTechnicians,
        leadTechnician: leadTechnician || assignedTechnicians[0],
        requiresParts,
        requiredParts,
        lotoRequired,
        lotoTag: lotoRequired ? lotoTag : undefined,
        sourceRefId: linkedRequest ? linkedRequest.id : undefined,
        workRequestNo: linkedRequest ? (linkedRequest.ticketNo || linkedRequest.id) : undefined,
        createdBy: currentUser?.name || 'หัวหน้างานซ่อมบำรุง'
      });

      if (linkedRequest) {
        updateWorkRequest(linkedRequest.id, {
          linkedWorkOrderId: created.id,
          workOrderNo: created.id,
          status: linkedRequest.status === 'รอตอบรับ' ? 'รับแจ้งแล้ว' : linkedRequest.status
        });
      }

      if (onSaved) onSaved(created);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-[#0b1325] border border-cyan-500/40 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-cyan-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-cyan-950/80 via-blue-950/60 to-slate-900 border-b border-cyan-800/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
              <Wrench size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                  {initialData ? `แก้ไขใบสั่งงาน ${initialData.id}` : 'ออกใบสั่งงานใหม่ (Create Work Order)'}
                </h2>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  readinessPreview.gatePassed 
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' 
                    : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                }`}>
                  {readinessPreview.gatePassed ? '🟢 ความพร้อมครบ 4 ด้าน' : '🟡 กำลังจัดเตรียมความพร้อม'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ยึดหลัก <strong>No Work Order - No Work</strong>: วางแผนเวลา คน และอะไหล่ให้พร้อมก่อนปล่อยงาน
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto">
          {/* Section 1: General Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>1. ข้อมูลเครื่องจักรและประเภทงาน</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">ประเภทงาน *</label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value as WorkOrderType)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:border-cyan-500 cursor-pointer"
                >
                  <option value="PM">งานบำรุงรักษาเชิงป้องกัน (PM Plan)</option>
                  <option value="CORRECTIVE">งานแก้ไขตามใบแจ้งซ่อม (Corrective)</option>
                  <option value="IMPROVEMENT">งานพัฒนาปรับปรุง / Kaizen</option>
                  <option value="OPERATION">งานประจำการคุมกะ / Daily Routine</option>
                  <option value="BREAKDOWN">งานซ่อมเบรกดาวน์ฉุกเฉิน (Breakdown)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">ระดับความเร่งด่วน *</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as WorkOrderPriority)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:border-cyan-500 cursor-pointer"
                >
                  <option value="ตามแผนนัดหมาย">ตามแผนนัดหมาย</option>
                  <option value="ปกติ">ปกติ</option>
                  <option value="เร่งด่วน">เร่งด่วน</option>
                  <option value="ฉุกเฉินไลน์หยุด">ฉุกเฉินไลน์หยุด</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">เครื่องจักรเป้าหมาย *</label>
                <select
                  value={machineId}
                  onChange={(e) => setMachineId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:border-cyan-500 cursor-pointer"
                >
                  {machines.map(m => (
                    <option key={m.id} value={m.id}>
                      [{m.id}] {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick helper if PM type: Select from PM Datamatrix */}
            {sourceType === 'PM' && (
              <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-300" />
                    <span>ดึงข้อมูลจากแผน PM Datamatrix (Time-Based Maintenance):</span>
                  </label>
                  <span className="text-[10px] text-slate-400">เลือกเพื่อกรอกข้อมูลอัตโนมัติ</span>
                </div>
                <select
                  onChange={(e) => {
                    const planId = e.target.value;
                    if (!planId) return;
                    const selectedPlan = pmPlans.find(p => p.id === planId);
                    if (selectedPlan) {
                      const mach = machines.find(m => m.id === selectedPlan.machineId);
                      setMachineId(selectedPlan.machineId);
                      setTitle(`PM ตามรอบ TBM (${selectedPlan.frequency}): ${mach?.name || selectedPlan.machineId} - ${selectedPlan.title}`);
                      setDescription(`งานบำรุงรักษาเชิงป้องกันตามรอบเวลา (TBM Datamatrix)\n- รหัสเครื่อง: ${selectedPlan.machineId}\n- แผนงาน: ${selectedPlan.title}\n- ความถี่: ${selectedPlan.frequency}\n- อะไหล่ที่ต้องใช้: ${selectedPlan.spareParts || '-'}`);
                      setEstimatedDurationMins(selectedPlan.ttm || 60);
                      if (selectedPlan.spareParts) {
                        setRequiresParts(true);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-indigo-700/50 text-white text-xs font-medium focus:border-indigo-400 cursor-pointer"
                >
                  <option value="">-- เลือกแผนงานจาก PM Datamatrix ({pmPlans.length} แผน) --</option>
                  {pmPlans.map(p => {
                    const mach = machines.find(m => m.id === p.machineId);
                    return (
                      <option key={p.id} value={p.id}>
                        [{p.machineId}] {mach?.name ? `${mach.name} - ` : ''}{p.title} ({p.frequency})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">ชื่องานสั่งการ (Work Order Title) *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น ตรวจเช็คเปลี่ยนถ่ายน้ำมันเกียร์และสายพานขับมอเตอร์..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">รายละเอียดและขั้นตอนการปฏิบัติงาน</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ระบุข้อควรระวัง หรือขั้นตอนการปฏิบัติงานอย่างละเอียด..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Section 2: 4-Pillar Scheduling & Crew Assignment */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center justify-between">
              <span>2. เสาหลักการลงตารางงาน (Schedule & Assigned Crew)</span>
              <span className="text-[11px] text-slate-400 lowercase font-normal">
                เวลาเริ่ม + ระยะเวลา + ช่างประจำกะ
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Calendar size={13} className="text-cyan-400" />
                  วันที่กำหนดเริ่มงาน *
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Clock size={13} className="text-cyan-400" />
                  เวลาที่กำหนดเริ่ม *
                </label>
                <input
                  type="time"
                  value={scheduledStartTime}
                  onChange={(e) => setScheduledStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Clock size={13} className="text-amber-400" />
                  เวลาประเมินที่ต้องใช้ (นาที) *
                </label>
                <input
                  type="number"
                  min={5}
                  max={720}
                  value={estimatedDurationMins}
                  onChange={(e) => setEstimatedDurationMins(parseInt(e.target.value, 10) || 60)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono font-bold focus:border-cyan-500"
                  required
                />
              </div>
            </div>

            {/* Technicians Tag Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <User size={13} className="text-cyan-400" />
                มอบหมายช่างผู้รับผิดชอบ ({assignedTechnicians.length} คน) *
              </label>
              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-950/60 border border-slate-800 rounded-xl max-h-28 overflow-y-auto">
                {technicians.map(t => {
                  const isAssigned = assignedTechnicians.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTechnician(t)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                        isAssigned
                          ? 'bg-cyan-600 text-slate-950 font-bold shadow-md shadow-cyan-900/40'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <span>{t}</span>
                      {isAssigned && <CheckCircle2 size={12} className="stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 3: Spare Parts Requirement & Kitting */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Package size={14} className="text-cyan-400" />
                <span>3. อะไหล่สำรองที่ต้องใช้ (Spare Parts Kitting Gate)</span>
              </h3>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={requiresParts}
                  onChange={(e) => setRequiresParts(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500"
                />
                <span>งานนี้ต้องใช้อะไหล่</span>
              </label>
            </div>

            {requiresParts && (
              <div className="space-y-3 bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                {/* Part selector */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedPartId}
                    onChange={(e) => setSelectedPartId(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs cursor-pointer"
                  >
                    <option value="">-- เลือกอะไหล่จากคลัง --</option>
                    {spareParts.map(sp => (
                      <option key={sp.id} value={sp.id}>
                        [{sp.code || sp.id}] {sp.name} (คงเหลือ: {sp.stock} {sp.unit})
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={selectedPartQty}
                      onChange={(e) => setSelectedPartQty(parseInt(e.target.value, 10) || 1)}
                      className="w-20 px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono font-bold text-center"
                      placeholder="จำนวน"
                    />

                    <button
                      type="button"
                      onClick={handleAddPart}
                      className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>เพิ่มอะไหล่</span>
                    </button>
                  </div>
                </div>

                {/* Parts list */}
                {requiredParts.length > 0 ? (
                  <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden text-xs">
                    {requiredParts.map(p => {
                      const currentStock = stockMap[p.partId] ?? p.quantityAvailable;
                      const isStockSufficient = currentStock >= p.quantityRequired;
                      return (
                        <div key={p.partId} className="p-2.5 bg-slate-900/60 flex items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-cyan-400 font-bold">{p.partCode}</span>
                              <span className="text-white font-medium">{p.partName}</span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              ต้องการใช้: <strong className="text-white font-mono">{p.quantityRequired}</strong> | 
                              คงคลังปัจจุบัน: <strong className={`font-mono ${isStockSufficient ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {currentStock}
                              </strong>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isStockSufficient
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                            }`}>
                              {isStockSufficient ? '🟢 สต็อกพร้อม' : '🔴 ขาดสต็อก'}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleRemovePart(p.partId)}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 transition cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11.5px] text-slate-500 text-center py-2">
                    ยังไม่มีการเพิ่มอะไหล่ (เลือกจากคลังและกด "เพิ่มอะไหล่")
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Section 4: Safety & LOTO */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert size={14} />
              <span>4. มาตรการความปลอดภัยและ LOTO</span>
            </h3>

            <div className="flex items-center gap-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-300">
                <input
                  type="checkbox"
                  checked={lotoRequired}
                  onChange={(e) => setLotoRequired(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <span>ต้องล็อกนิรภัย LOTO (Lockout / Tagout)</span>
              </label>

              {lotoRequired && (
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-slate-400">เลขแท็ก LOTO:</span>
                  <input
                    type="text"
                    value={lotoTag}
                    onChange={(e) => setLotoTag(e.target.value)}
                    className="px-2.5 py-1 bg-slate-900 border border-amber-500/30 text-amber-300 font-mono text-xs rounded-lg flex-1"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Live Readiness Gate Summary Bar */}
          <div className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
            readinessPreview.gatePassed
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
              : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
          }`}>
            {readinessPreview.gatePassed ? (
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-bold">
                {readinessPreview.gatePassed
                  ? '✅ ผ่านเกณฑ์ความพร้อม 4 ด้านครบถ้วน: สามารถกด "ปล่อยงาน (Release)" ให้ช่างปฏิบัติงานได้ทันที'
                  : '⚠️ ยังไม่ผ่านเกณฑ์ความพร้อม 4 ด้านก่อนปล่อยงาน:'}
              </div>
              {!readinessPreview.gatePassed && (
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-300/90">
                  {readinessPreview.missingReasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-cyan-950/50 transition cursor-pointer"
            >
              <Sparkles size={16} />
              <span>{initialData ? 'บันทึกการแก้ไขใบสั่งงาน' : 'บันทึกใบสั่งงาน (Save Work Order)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
