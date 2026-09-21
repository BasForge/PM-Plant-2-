import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { RepairPage } from './RepairPage';
import { PMHistoryPage } from './PMHistoryPage';
import { PrintheadHistoryTab } from './workRequest/PrintheadHistoryTab';
import { PrintheadDetailsModal } from './workRequest/PrintheadDetailsModal';
import { PrintheadRequestSelectorModal } from './workRequest/PrintheadRequestSelectorModal';
import { Wrench, ClipboardCheck, AlertTriangle, CheckCircle2, History, Clock, Printer, X, FileText, ArrowLeft, Check } from 'lucide-react';
import { getTodayDateString } from '../utils/pmAlerts';
import { getRepairStoppageType, WorkRequest } from '../types';

interface MaintenanceHistoryHubProps {
  defaultTab?: 'repair' | 'pm' | 'printhead';
}

export const MaintenanceHistoryHub: React.FC<MaintenanceHistoryHubProps> = ({ defaultTab = 'repair' }) => {
  const { repairs, schedules, machines, workRequests, updateWorkRequest, technicians, currentUser } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'repair' | 'pm' | 'printhead'>(defaultTab);

  // Modals for Printhead history
  const [isPrintheadModalOpen, setIsPrintheadModalOpen] = useState(false);
  const [targetPrintheadReq, setTargetPrintheadReq] = useState<WorkRequest | null>(null);
  const [isSelectorModalOpen, setIsSelectorModalOpen] = useState(false);
  const [selectedDetailRequest, setSelectedDetailRequest] = useState<WorkRequest | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Sync if defaultTab prop changes (e.g. navigation from modal directly to PM history)
  useEffect(() => {
    setActiveSubTab(defaultTab);
  }, [defaultTab]);

  // Statistics for quick badge display
  const completedRepairs = repairs.filter(r => r.status === 'ปิดงาน' || r.status === 'Completed' || !r.status).length;
  const ongoingRepairs = repairs.filter(r => r.status === 'กำลังซ่อม' || r.status === 'Ongoing' || r.status === 'Pending').length;

  const breakdownCount = repairs.filter(r => getRepairStoppageType(r) === 'BREAKDOWN').length;
  const minorCount = repairs.filter(r => getRepairStoppageType(r) === 'MINOR_STOPPAGE').length;
  const adjustmentCount = repairs.filter(r => getRepairStoppageType(r) === 'ADJUSTMENT_LOSS').length;

  const todayStr = getTodayDateString();
  const completedPMSchedules = schedules.filter(s => s.status === 'Completed' || (s.actualDate && s.actualDate !== ''));
  const overduePMSchedules = schedules.filter(s => {
    if (s.status === 'Completed') return false;
    const targetDate = s.rescheduledDate || s.planDate;
    return targetDate && targetDate < todayStr;
  });

  const printheadCount = workRequests.filter(r => r.isPrintheadReplacement).length;

  return (
    <div className="space-y-5" id="maintenance-history-hub">
      {/* Toast feedback */}
      {toastMsg && (
        <div className="fixed top-20 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3">
          <Check className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-medium">{toastMsg}</span>
        </div>
      )}

      {/* 1. TOP SUB-TAB NAVIGATION BAR */}
      <div className="bg-slate-900/95 border border-slate-800 p-2.5 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Sub-tab Switcher Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0" id="hub-maintenance-subtabs">
          
          {/* Sub-tab 1: บันทึกประวัติงานซ่อม */}
          <button
            type="button"
            id="btn-subtab-repairs"
            onClick={() => setActiveSubTab('repair')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer select-none ${
              activeSubTab === 'repair'
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 ring-1 ring-amber-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Wrench size={16} className={activeSubTab === 'repair' ? 'text-slate-950 stroke-[2.5]' : 'text-amber-400'} />
            <span>🔧 บันทึกประวัติงานซ่อม</span>
            <span 
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeSubTab === 'repair' 
                  ? 'bg-slate-950/20 text-slate-950' 
                  : 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
              }`}
            >
              {repairs.length} งาน
            </span>
          </button>

          {/* Sub-tab 2: บันทึกประวัติงาน PM */}
          <button
            type="button"
            id="btn-subtab-pm-history"
            onClick={() => setActiveSubTab('pm')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer select-none ${
              activeSubTab === 'pm'
                ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 text-slate-950 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <ClipboardCheck size={16} className={activeSubTab === 'pm' ? 'text-slate-950 stroke-[2.5]' : 'text-cyan-400'} />
            <span>📋 บันทึกประวัติงาน PM</span>
            <span 
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeSubTab === 'pm' 
                  ? 'bg-slate-950/20 text-slate-950' 
                  : 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/30'
              }`}
            >
              {completedPMSchedules.length} งานเสร็จ
            </span>
            {overduePMSchedules.length > 0 && (
              <span 
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                  activeSubTab === 'pm'
                    ? 'bg-rose-950 text-rose-300'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                }`}
                title={`${overduePMSchedules.length} รายการ PM เกินกำหนด`}
              >
                <AlertTriangle size={10} />
                {overduePMSchedules.length} เกินกำหนด
              </span>
            )}
          </button>

          {/* Sub-tab 3: ประวัติการเปลี่ยนหัวพิมพ์ (ติ๊กเลือกจากงานแจ้งซ่อม) */}
          <button
            type="button"
            id="btn-subtab-printhead-history"
            onClick={() => setActiveSubTab('printhead')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer select-none ${
              activeSubTab === 'printhead'
                ? 'bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-600 text-white shadow-lg shadow-purple-500/20 ring-1 ring-purple-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Printer size={16} className={activeSubTab === 'printhead' ? 'text-white stroke-[2.5]' : 'text-purple-400'} />
            <span>🖨️ ประวัติการเปลี่ยนหัวพิมพ์</span>
            <span 
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeSubTab === 'printhead' 
                  ? 'bg-purple-950/40 text-white' 
                  : 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
              }`}
            >
              {printheadCount} งาน
            </span>
          </button>
        </div>

        {/* Info badge on the right */}
        <div className="hidden lg:flex items-center gap-3 px-3.5 py-1.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs text-slate-300">
          {activeSubTab === 'repair' ? (
            <div className="flex items-center gap-2.5 text-[11px]">
              <span className="flex items-center gap-1 text-rose-400 font-medium bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20" title="Breakdown: เครื่องเสียที่ไม่ทราบล่วงหน้า มีการเปลี่ยนอะไหล่ (หน่วยเป็นครั้ง บันทึกเวลา)">
                🔴 Breakdown: <strong className="text-white font-mono">{breakdownCount}</strong> ครั้ง
              </span>
              <span className="flex items-center gap-1 text-amber-300 font-medium bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20" title="Minor stoppage: ไม่เปลี่ยนอะไหล่ < 15 นาที (หน่วยเป็นครั้ง)">
                🟡 Minor: <strong className="text-white font-mono">{minorCount}</strong> ครั้ง
              </span>
              <span className="flex items-center gap-1 text-orange-400 font-medium bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/20" title="Adjustment loss: ไม่เปลี่ยนอะไหล่ > 15 นาที (หน่วยเป็นครั้ง)">
                🟠 Adjustment: <strong className="text-white font-mono">{adjustmentCount}</strong> ครั้ง
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle2 size={12} />
                ปิดงาน: <strong className="text-white font-mono">{completedRepairs}</strong>
              </span>
            </div>
          ) : activeSubTab === 'pm' ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
                <CheckCircle2 size={13} />
                PM ประจำเครื่องเสร็จสิ้น: <strong className="text-white font-mono">{completedPMSchedules.length}</strong>
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                <History size={13} />
                ครอบคลุม: <strong className="text-white font-mono">{machines.length}</strong> เครื่องจักร
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-purple-300 font-medium">
                <Printer size={13} />
                งานเปลี่ยนหัวพิมพ์ที่เชื่อมโยง: <strong className="text-white font-mono">{printheadCount}</strong> งาน
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-[11px] text-slate-400">
                ติ๊กเลือกได้จากรายการแจ้งซ่อม
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. SUB-TAB VIEWPORT */}
      <div className="animate-in fade-in duration-200" key={activeSubTab}>
        {activeSubTab === 'repair' && <RepairPage />}
        {activeSubTab === 'pm' && <PMHistoryPage />}
        {activeSubTab === 'printhead' && (
          <PrintheadHistoryTab
            workRequests={workRequests}
            onOpenDetailModal={(req) => setSelectedDetailRequest(req)}
            onOpenPrintheadModal={(req) => {
              setTargetPrintheadReq(req);
              setIsPrintheadModalOpen(true);
            }}
            onRemoveFromPrinthead={(id) => {
              updateWorkRequest(id, { isPrintheadReplacement: false });
              showToast('↩️ ปลดออกจากประวัติการเปลี่ยนหัวพิมพ์แล้ว');
            }}
            onOpenSelectorModal={() => setIsSelectorModalOpen(true)}
            showToast={showToast}
          />
        )}
      </div>

      {/* Printhead details modal */}
      <PrintheadDetailsModal
        isOpen={isPrintheadModalOpen}
        onClose={() => {
          setIsPrintheadModalOpen(false);
          setTargetPrintheadReq(null);
        }}
        workRequest={targetPrintheadReq}
        technicians={technicians}
        onSave={(requestId, details) => {
          updateWorkRequest(requestId, {
            isPrintheadReplacement: true,
            printheadDetails: details
          });
          showToast(`✅ บันทึกข้อมูลหัวพิมพ์สำเร็จ`);
        }}
        onRemoveFromPrinthead={(requestId) => {
          updateWorkRequest(requestId, {
            isPrintheadReplacement: false
          });
          showToast(`↩️ ปลดออกจากประวัติการเปลี่ยนหัวพิมพ์แล้ว`);
        }}
      />

      {/* Printhead request selector modal (allows picking from existing work requests) */}
      <PrintheadRequestSelectorModal
        isOpen={isSelectorModalOpen}
        onClose={() => setIsSelectorModalOpen(false)}
        workRequests={workRequests}
        onSelectRequests={(selectedIds) => {
          selectedIds.forEach((id) => {
            const target = workRequests.find((r) => r.id === id);
            if (target) {
              updateWorkRequest(id, {
                isPrintheadReplacement: true,
                printheadDetails: target.printheadDetails || {
                  replacedDate: target.requestDate || getTodayDateString(),
                  technician: target.engineeringResponse?.assignedTechnicians?.[0] || currentUser?.name || '',
                  reason: target.problemTitle
                }
              });
            }
          });
          showToast(`🖨️ บันทึกงานแจ้งซ่อม ${selectedIds.length} รายการเข้าประวัติการเปลี่ยนหัวพิมพ์แล้ว`);
        }}
      />

      {/* Detail view modal for printhead request */}
      {selectedDetailRequest && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedDetailRequest(null);
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedDetailRequest(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-cyan-400" />
                  <span>กลับหน้าเดิม</span>
                </button>
                <h3 className="font-bold text-sm sm:text-base">รายละเอียดงานแจ้งซ่อม #{selectedDetailRequest.ticketNo || selectedDetailRequest.id}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailRequest(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm text-purple-900 block">
                    เครื่อง {selectedDetailRequest.machineId} - {selectedDetailRequest.machineName}
                  </span>
                  <span className="text-slate-500">{selectedDetailRequest.lineGroup}</span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 font-bold font-mono">
                  {selectedDetailRequest.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-slate-700">
                <div><strong>วันที่แจ้ง:</strong> {selectedDetailRequest.requestDate} {selectedDetailRequest.requestTime} น.</div>
                <div><strong>ผู้แจ้ง:</strong> {selectedDetailRequest.requesterName}</div>
                <div><strong>ความเร่งด่วน:</strong> {selectedDetailRequest.priority}</div>
                <div><strong>แผนก:</strong> {selectedDetailRequest.productionDepartment}</div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="font-bold text-slate-900 mb-1">ปัญหาที่แจ้ง: {selectedDetailRequest.problemTitle}</div>
                <div className="text-slate-600 whitespace-pre-line">{selectedDetailRequest.problemDetails}</div>
              </div>

              {selectedDetailRequest.printheadDetails && (
                <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-xl space-y-2">
                  <div className="font-bold text-purple-900 flex items-center gap-1.5 text-sm">
                    <Printer className="w-4 h-4 text-purple-700" />
                    <span>ข้อมูลการเปลี่ยนหัวพิมพ์</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-700 pt-1">
                    <div><strong>รุ่นหัวพิมพ์:</strong> {selectedDetailRequest.printheadDetails.model || '-'}</div>
                    <div><strong>วันที่เปลี่ยน:</strong> {selectedDetailRequest.printheadDetails.replacedDate || '-'}</div>
                    <div><strong>ซีเรียลใหม่:</strong> {selectedDetailRequest.printheadDetails.newSerial || '-'}</div>
                    <div><strong>ซีเรียลเดิม:</strong> {selectedDetailRequest.printheadDetails.oldSerial || '-'}</div>
                    <div><strong>ความต้านทาน:</strong> {selectedDetailRequest.printheadDetails.resistance || '-'}</div>
                    <div><strong>ช่างผู้เปลี่ยน:</strong> {selectedDetailRequest.printheadDetails.technician || '-'}</div>
                  </div>
                  {selectedDetailRequest.printheadDetails.reason && (
                    <div className="pt-1">
                      <strong>สาเหตุที่เปลี่ยน:</strong> {selectedDetailRequest.printheadDetails.reason}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setTargetPrintheadReq(selectedDetailRequest);
                    setIsPrintheadModalOpen(true);
                  }}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>แก้ไขข้อมูลหัวพิมพ์</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDetailRequest(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

