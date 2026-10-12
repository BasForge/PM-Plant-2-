import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { WorkOrder, WorkOrderStatus, WorkOrderType, WorkOrderPriority } from '../../types';
import { calculatePlannedWorkMetrics } from '../../utils/workOrderUtils';
import { WorkOrderModal } from './WorkOrderModal';
import { EmergencyWOModal } from './EmergencyWOModal';
import { WorkOrderDetailModal } from './WorkOrderDetailModal';
import { PlannedWorkAnalyticsTab } from './PlannedWorkAnalyticsTab';
import { TBMPlanSchedulePage } from '../TBMPlanSchedulePage';
import { PMExcelImportModal } from '../PMExcelImportModal';
import { 
  Wrench, Zap, Plus, Filter, Search, CheckCircle2, AlertTriangle, 
  Clock, Calendar, User, Package, ShieldCheck, ShieldAlert, 
  Layers, ArrowUpDown, Eye, Play, Check, ChevronRight, BarChart3, 
  Sparkles, RefreshCw, AlertCircle, FileText, CalendarRange, Edit3, Trash2,
  FileSpreadsheet, CheckSquare, Square, X, Flame, BookOpen
} from 'lucide-react';

export const WorkOrderHub: React.FC = () => {
  const { 
    workOrders, 
    setWorkOrders,
    repairs,
    setRepairs,
    schedules,
    setSchedules,
    releaseWorkOrder, 
    workRequests, 
    setWorkRequests,
    pmPlans, 
    machines, 
    currentUser, 
    addWorkOrder,
    deleteWorkOrder,
    updateWorkOrder,
    canEdit,
    canDelete,
    isAdmin,
    setActivePage
  } = useApp();

  const [activeMainView, setActiveMainView] = useState<'grid' | 'tbm_matrix' | 'analytics'>('grid');

  // Filter States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'PLANNED' | 'UNPLANNED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [fromWorkRequestId, setFromWorkRequestId] = useState<string | undefined>(undefined);
  const [showFromRequestModal, setShowFromRequestModal] = useState<boolean>(false);

  // Delete modal state
  const [woToDelete, setWoToDelete] = useState<WorkOrder | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showPMExcelImportModal, setShowPMExcelImportModal] = useState<boolean>(false);

  // Bulk Selection and Bulk Delete State (ระบบเลือกทั้งหมด & ลบแผนงาน WO เป็นชุด)
  const [selectedWOIds, setSelectedWOIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState<boolean>(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState<boolean>(false);
  const [bulkDeleteLinkedSchedules, setBulkDeleteLinkedSchedules] = useState<boolean>(true);

  // Notifications / feedback toast
  const [actionNotice, setActionNotice] = useState<{ text: string; isError?: boolean } | null>(null);

  const showToast = (text: string, isError = false) => {
    setActionNotice({ text, isError });
    setTimeout(() => setActionNotice(null), 4000);
  };

  // KPI Metrics Calculation
  const metrics = useMemo(() => {
    return calculatePlannedWorkMetrics(workOrders, 85);
  }, [workOrders]);

  // Filtered Work Orders list
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter(wo => {
      // Search
      const search = searchTerm.toLowerCase().trim();
      if (search) {
        const matchTitle = wo.title.toLowerCase().includes(search);
        const matchId = (wo.id || '').toLowerCase().includes(search);
        const matchMach = (wo.machineId || '').toLowerCase().includes(search) || (wo.machineName || '').toLowerCase().includes(search);
        const matchTech = wo.assignedTechnicians.some(t => t.toLowerCase().includes(search));
        if (!matchTitle && !matchId && !matchMach && !matchTech) return false;
      }

      // Status Filter
      if (statusFilter !== 'ALL' && wo.status !== statusFilter) return false;

      // Category Filter
      if (categoryFilter !== 'ALL' && wo.workCategory !== categoryFilter) return false;

      // Type Filter
      if (typeFilter !== 'ALL' && wo.sourceType !== typeFilter) return false;

      return true;
    }).sort((a, b) => {
      // Sort priority: Line stop first, then by date desc
      if (a.priority === 'ฉุกเฉินไลน์หยุด' && b.priority !== 'ฉุกเฉินไลน์หยุด') return -1;
      if (b.priority === 'ฉุกเฉินไลน์หยุด' && a.priority !== 'ฉุกเฉินไลน์หยุด') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [workOrders, searchTerm, statusFilter, categoryFilter, typeFilter]);

  const handleOpenDetail = (wo: WorkOrder) => {
    setSelectedWO(wo);
    setShowDetailModal(true);
  };

  const handleEdit = (wo: WorkOrder) => {
    setSelectedWO(wo);
    setShowDetailModal(false);
    setShowCreateModal(true);
  };

  const handleOpenDelete = (wo: WorkOrder) => {
    setWoToDelete(wo);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (!woToDelete) return;
    const woLabel = woToDelete.workOrderNo || woToDelete.id;
    const woId = woToDelete.id;
    const woNo = woToDelete.workOrderNo;

    deleteWorkOrder(woId);

    // Unlink from repairs
    setRepairs(prev => prev.map(r => {
      const matchId = r.workOrderId === woId || r.workOrderNo === woId;
      const matchNo = woNo && (r.workOrderId === woNo || r.workOrderNo === woNo);
      if (matchId || matchNo) {
        return { ...r, workOrderId: undefined, workOrderNo: undefined };
      }
      return r;
    }));

    // Unlink from workRequests
    setWorkRequests(prev => prev.map(req => {
      const matchId = req.workOrderId === woId || req.workOrderNo === woId;
      const matchNo = woNo && (req.workOrderId === woNo || req.workOrderNo === woNo);
      if (matchId || matchNo) {
        return { ...req, workOrderId: undefined, workOrderNo: undefined, status: req.status === 'IN_PROGRESS' ? 'ACCEPTED' : req.status };
      }
      return req;
    }));

    setShowDeleteModal(false);
    if (selectedWO?.id === woToDelete.id) {
      setShowDetailModal(false);
      setSelectedWO(null);
    }
    setWoToDelete(null);
    showToast(`🗑️ ลบใบสั่งงาน ${woLabel} เรียบร้อยแล้ว`);
  };

  // ---------------------------------------------------------------------------
  // BULK SELECTION & BULK DELETION LOGIC (ระบบเลือกทั้งหมด & ลบใบสั่งงาน WO เป็นชุด)
  // ---------------------------------------------------------------------------
  const isAllFilteredSelected = useMemo(() => {
    if (filteredWorkOrders.length === 0) return false;
    return filteredWorkOrders.every(wo => selectedWOIds.has(wo.id));
  }, [filteredWorkOrders, selectedWOIds]);

  const isSomeFilteredSelected = useMemo(() => {
    if (filteredWorkOrders.length === 0) return false;
    return filteredWorkOrders.some(wo => selectedWOIds.has(wo.id)) && !isAllFilteredSelected;
  }, [filteredWorkOrders, selectedWOIds, isAllFilteredSelected]);

  const handleToggleSelectWO = (woId: string) => {
    setSelectedWOIds(prev => {
      const next = new Set(prev);
      if (next.has(woId)) {
        next.delete(woId);
      } else {
        next.add(woId);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      setSelectedWOIds(prev => {
        const next = new Set(prev);
        filteredWorkOrders.forEach(wo => next.delete(wo.id));
        return next;
      });
    } else {
      setSelectedWOIds(prev => {
        const next = new Set(prev);
        filteredWorkOrders.forEach(wo => next.add(wo.id));
        return next;
      });
    }
  };

  const handleSelectAllInSystem = () => {
    const allIds = workOrders.map(wo => wo.id);
    setSelectedWOIds(new Set(allIds));
    showToast(`☑️ เลือกใบสั่งงาน WO ทั้งหมดในระบบแล้ว (${allIds.length} งาน)`);
  };

  const handleClearSelection = () => {
    setSelectedWOIds(new Set());
  };

  const handleOpenBulkDeleteModal = () => {
    if (selectedWOIds.size === 0) {
      showToast('⚠️ กรุณาเลือกใบสั่งงาน Work Order ที่ต้องการลบก่อน', true);
      return;
    }
    setShowBulkDeleteModal(true);
  };

  const handleConfirmBulkDelete = () => {
    if (selectedWOIds.size === 0) return;
    const count = selectedWOIds.size;
    const idsToDelete = new Set(selectedWOIds);
    const targetWOs = workOrders.filter(wo => idsToDelete.has(wo.id));
    const targetNumbers = new Set(targetWOs.map(w => w.workOrderNo).filter(Boolean) as string[]);

    setWorkOrders(prev => prev.filter(wo => !idsToDelete.has(wo.id)));

    // Unlink from repairs
    setRepairs(prev => prev.map(r => {
      const matchId = (r.workOrderId && idsToDelete.has(r.workOrderId)) || (r.workOrderNo && idsToDelete.has(r.workOrderNo));
      const matchNo = (r.workOrderId && targetNumbers.has(r.workOrderId)) || (r.workOrderNo && targetNumbers.has(r.workOrderNo));
      if (matchId || matchNo) {
        return { ...r, workOrderId: undefined, workOrderNo: undefined };
      }
      return r;
    }));

    // Unlink from workRequests
    setWorkRequests(prev => prev.map(req => {
      const matchId = (req.workOrderId && idsToDelete.has(req.workOrderId)) || (req.workOrderNo && idsToDelete.has(req.workOrderNo));
      const matchNo = (req.workOrderId && targetNumbers.has(req.workOrderId)) || (req.workOrderNo && targetNumbers.has(req.workOrderNo));
      if (matchId || matchNo) {
        return { ...req, workOrderId: undefined, workOrderNo: undefined, status: req.status === 'IN_PROGRESS' ? 'ACCEPTED' : req.status };
      }
      return req;
    }));

    // Clean up uncompleted linked schedules if requested
    if (bulkDeleteLinkedSchedules) {
      const deletedRefIds = new Set(targetWOs.map(w => w.sourceRefId).filter(Boolean));
      const deletedTitles = new Set(targetWOs.map(w => w.title));
      setSchedules(prev => prev.filter(s => {
        if (s.status === 'เสร็จสิ้น') return true;
        if (s.pmPlanId && deletedRefIds.has(s.pmPlanId)) return false;
        if (s.title && deletedTitles.has(s.title)) return false;
        return true;
      }));
    }

    if (selectedWO && idsToDelete.has(selectedWO.id)) {
      setShowDetailModal(false);
      setSelectedWO(null);
    }

    setSelectedWOIds(new Set());
    setShowBulkDeleteModal(false);
    showToast(`🗑️ ลบแผนงาน Work Order ที่เลือกทั้งหมด ${count} รายการ เรียบร้อยแล้ว`);
  };

  const handleConfirmDeleteAllInSystem = () => {
    const totalCount = workOrders.length;
    if (totalCount === 0) return;

    setWorkOrders([]);
    setRepairs(prev => prev.map(r => ({
      ...r,
      workOrderId: undefined,
      workOrderNo: undefined
    })));
    setWorkRequests(prev => prev.map(req => ({
      ...req,
      workOrderId: undefined,
      workOrderNo: undefined,
      status: req.status === 'IN_PROGRESS' ? 'ACCEPTED' : req.status
    })));

    if (bulkDeleteLinkedSchedules) {
      setSchedules(prev => prev.filter(s => s.status === 'เสร็จสิ้น'));
    }
    if (selectedWO) {
      setShowDetailModal(false);
      setSelectedWO(null);
    }
    setSelectedWOIds(new Set());
    setShowDeleteAllModal(false);
    showToast(`🗑️ ล้างแผนงาน Work Order ทั้งหมดในระบบเรียบร้อย (${totalCount} รายการ)`);
  };

  // Detect breakdown Work Orders whose source repair was deleted
  const orphanedBreakdownWOs = useMemo(() => {
    return workOrders.filter(wo => {
      if (wo.sourceType !== 'BREAKDOWN') return false;
      const hasRepair = repairs.some(r => 
        (wo.sourceRefId && r.id === wo.sourceRefId) ||
        r.workOrderId === wo.id ||
        r.workOrderNo === wo.id ||
        (wo.workOrderNo && (r.workOrderId === wo.workOrderNo || r.workOrderNo === wo.workOrderNo))
      );
      return !hasRepair;
    });
  }, [workOrders, repairs]);

  const handleDeleteOrphanedBreakdownWOs = () => {
    if (orphanedBreakdownWOs.length === 0) return;
    const count = orphanedBreakdownWOs.length;
    const orphanIds = new Set(orphanedBreakdownWOs.map(w => w.id));
    setWorkOrders(prev => prev.filter(w => !orphanIds.has(w.id)));
    if (bulkDeleteLinkedSchedules) {
      setSchedules(prev => prev.filter(s => {
        if (s.status === 'Completed' || s.status === 'เสร็จสิ้น') return true;
        if (s.workOrderId && orphanIds.has(s.workOrderId)) return false;
        return true;
      }));
    }
    showToast(`🧹 ลบใบสั่งงานฉุกเฉินที่งานซ่อมต้นทางถูกลบไปแล้ว ${count} รายการ เรียบร้อยแล้ว`);
  };

  const selectedWOsList = useMemo(() => {
    return workOrders.filter(wo => selectedWOIds.has(wo.id));
  }, [workOrders, selectedWOIds]);

  const handleDirectRelease = (wo: WorkOrder) => {
    const res = releaseWorkOrder(wo.id, currentUser?.name);
    if (res.success) {
      showToast(res.message);
    } else {
      showToast(res.message, true);
    }
  };

  // Convert a Work Request into a Planned Work Order
  const handleConvertRequest = (reqId: string) => {
    setFromWorkRequestId(reqId);
    setShowFromRequestModal(false);
    setShowCreateModal(true);
  };

  const [selectedBatchMonth, setSelectedBatchMonth] = useState<number>(() => new Date().getMonth() + 1);

  // PM Plans due in selected month
  const pmPlansDueInSelectedMonth = useMemo(() => {
    return pmPlans.filter(p => {
      const targetMonths = p.targetMonths || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      return targetMonths.includes(selectedBatchMonth);
    }).length;
  }, [pmPlans, selectedBatchMonth]);

  // PM Plans with active Work Order in selected month
  const pmPlansWithWOInSelectedMonth = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const monthStr = String(selectedBatchMonth).padStart(2, '0');
    const ym = `${currentYear}-${monthStr}`;
    return pmPlans.filter(p => {
      const targetMonths = p.targetMonths || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      if (!targetMonths.includes(selectedBatchMonth)) return false;
      return workOrders.some(wo => 
        wo.sourceType === 'PM' && 
        wo.machineId === p.machineId && 
        (wo.sourceRefId === p.id || wo.title.includes(p.title)) &&
        wo.scheduledDate.startsWith(ym)
      );
    }).length;
  }, [pmPlans, workOrders, selectedBatchMonth]);

  // Batch generate Planned Work Orders from TBM Matrix for the selected month
  const handleBatchCreateMonthlyPMOrders = (monthToProcess?: number) => {
    const today = new Date();
    const currentMonthNum = monthToProcess || selectedBatchMonth;
    const currentYear = today.getFullYear();
    const currentMonthStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;
    const monthNamesThai = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const currentMonthName = monthNamesThai[currentMonthNum - 1];
    
    let createdCount = 0;
    pmPlans.forEach(plan => {
      const targetMonths = plan.targetMonths || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      if (!targetMonths.includes(currentMonthNum)) return;

      const alreadyExists = workOrders.some(wo => 
        wo.sourceType === 'PM' && 
        wo.machineId === plan.machineId && 
        (wo.sourceRefId === plan.id || wo.title.includes(plan.title)) &&
        wo.scheduledDate.startsWith(currentMonthStr)
      );

      if (!alreadyExists) {
        const mach = machines.find(m => m.id === plan.machineId);
        addWorkOrder({
          workOrderNo: '',
          title: `PM ตามรอบ TBM (${plan.frequency}): ${mach?.name || plan.machineId} - ${plan.title}`,
          description: `งานบำรุงรักษาเชิงป้องกันตามรอบเวลา (TBM Datamatrix)\n- รหัสเครื่อง: ${plan.machineId}\n- แผนงาน: ${plan.title}\n- ความถี่: ${plan.frequency}`,
          sourceType: 'PM',
          workCategory: 'PLANNED',
          priority: 'ตามแผนนัดหมาย',
          status: 'READY_TO_RELEASE',
          machineId: plan.machineId,
          machineName: mach?.name || plan.machineId,
          lineGroup: mach?.lineGroup || '-',
          scheduledDate: `${currentMonthStr}-15`,
          scheduledStartTime: '08:30',
          estimatedDurationMins: plan.ttm || 60,
          assignedTechnicians: ['ช่างอุ้ย'],
          leadTechnician: 'ช่างอุ้ย',
          requiresParts: Boolean(plan.spareParts),
          requiredParts: [],
          lotoRequired: true,
          lotoTag: `LOTO-${plan.machineId}`,
          sourceRefId: plan.id,
          createdBy: currentUser?.name || 'หัวหน้างาน CMMS'
        });
        createdCount++;
      }
    });

    if (createdCount > 0) {
      showToast(`✅ ดึงแผน TBM Datamatrix ประจำเดือน ${currentMonthName} มาสร้าง Work Order สำเร็จ ${createdCount} งาน (%Planned Work เพิ่มขึ้นทันที)`);
    } else {
      showToast(`แผน PM ประจำเดือน ${currentMonthName} ทั้งหมดมีใบสั่งงาน Work Order รองรับครบถ้วนแล้ว`);
    }
  };

  return (
    <div className="space-y-6 select-none" id="cmms-work-order-hub">
      {/* 1. TOP HEADER & CMMS DISCIPLINE BANNER */}
      <div className="bg-[#0b1325]/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Brand & Subtitle */}
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400 shadow-inner">
              <Wrench size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  ระบบ CMMS ศูนย์ควบคุมใบสั่งงาน (Work Order Hub)
                </h1>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 font-bold border border-cyan-800/40">
                  หลัก No Work Order - No Work
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-bold border border-emerald-800/40">
                  %Planned Work ≥ 85%
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                วินัยการบำรุงรักษาครบวงจร: ทุกงานออกจากระบบ CMMS, ตรวจสอบความพร้อม 4 ด้าน (เวลาเริ่ม • ระยะเวลา • คน • อะไหล่) ก่อนปล่อยงาน
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Switcher Button */}
            <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveMainView('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeMainView === 'grid'
                    ? 'bg-cyan-600 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers size={13} />
                <span>ตารางใบสั่งงาน ({workOrders.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMainView('tbm_matrix')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeMainView === 'tbm_matrix'
                    ? 'bg-cyan-600 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CalendarRange size={13} />
                <span>📅 ตารางแผน PM Matrix ({pmPlans.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMainView('analytics')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeMainView === 'analytics'
                    ? 'bg-cyan-600 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BarChart3 size={13} />
                <span>แดชบอร์ด %Planned Work</span>
              </button>
              <button
                type="button"
                id="btn-goto-bad-actor-from-wo"
                onClick={() => setActivePage(16)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 text-rose-300 hover:text-white hover:bg-rose-950/40 border border-rose-900/40"
                title="วิเคราะห์เครื่องจักรวิกฤต Bad Actor (Pareto 80/20 & Chronic Failures)"
              >
                <Flame size={13} className="text-rose-400" />
                <span>🚨 รายงาน Bad Actor</span>
              </button>
              <button
                type="button"
                id="btn-goto-knowledge-from-wo"
                onClick={() => setActivePage(18)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 text-indigo-300 hover:text-white hover:bg-indigo-950/40 border border-indigo-900/40"
                title="เปิดศูนย์คลังความรู้ Active CMMS (Manual, WI, Troubleshooting, Why-Why)"
              >
                <BookOpen size={13} className="text-indigo-400" />
                <span>📚 ฐานความรู้ CMMS</span>
              </button>
            </div>

            {/* Convert from Request button */}
            <button
              type="button"
              onClick={() => setShowFromRequestModal(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md"
              title="ดึงใบแจ้งซ่อมจากฝ่ายผลิตมาออกใบสั่งงาน"
            >
              <RefreshCw size={14} className="text-cyan-400" />
              <span>แปลงแจ้งซ่อมเป็น WO</span>
            </button>

            {/* 1-Click Emergency Breakdown WO */}
            <button
              type="button"
              onClick={() => setShowEmergencyModal(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-rose-950/40 transition cursor-pointer"
              title="ออกใบสั่งงานฉุกเฉินและปล่อยงานทันทีใน 10 วินาที"
            >
              <Zap size={14} className="fill-slate-950 stroke-none" />
              <span>⚡ ออก WO ฉุกเฉินไลน์หยุด</span>
            </button>

            {/* Create Planned Work Order */}
            <button
              type="button"
              onClick={() => {
                setSelectedWO(null);
                setFromWorkRequestId(undefined);
                setShowCreateModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-cyan-950/50 transition cursor-pointer"
            >
              <Plus size={16} className="stroke-[3]" />
              <span>สร้างใบสั่งงานตามแผน</span>
            </button>
          </div>
        </div>

        {/* Action Notice Toast */}
        {actionNotice && (
          <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150 ${
            actionNotice.isError
              ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
              : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
          }`}>
            {actionNotice.isError ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            <span>{actionNotice.text}</span>
          </div>
        )}

        {/* 2. STATS SUMMARY CHIPS BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
          {/* Chip 1: % Planned Work */}
          <div className="p-3 bg-slate-950/60 border border-cyan-500/30 rounded-2xl">
            <span className="text-[10.5px] font-bold text-slate-400 block">% Planned Work</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`font-mono text-xl font-black ${
                metrics.plannedRatioPercent >= 85 ? 'text-cyan-400' : 'text-amber-400'
              }`}>
                {metrics.plannedRatioPercent}%
              </span>
              <span className="text-[10px] text-slate-500">เป้า 85%</span>
            </div>
          </div>

          {/* Chip 2: Ready to Release */}
          <div className="p-3 bg-slate-950/60 border border-emerald-500/30 rounded-2xl">
            <span className="text-[10.5px] font-bold text-emerald-400 block">🟢 พร้อมปล่อยงาน</span>
            <div className="font-mono text-xl font-black text-white mt-0.5">
              {metrics.readinessCounts.readyToRelease} <span className="text-[10px] font-normal text-slate-400">งาน</span>
            </div>
          </div>

          {/* Chip 3: Released (In Progress) */}
          <div className="p-3 bg-slate-950/60 border border-blue-500/30 rounded-2xl">
            <span className="text-[10.5px] font-bold text-blue-400 block">🚀 กำลังปฏิบัติงาน</span>
            <div className="font-mono text-xl font-black text-white mt-0.5">
              {metrics.readinessCounts.released} <span className="text-[10px] font-normal text-slate-400">งาน</span>
            </div>
          </div>

          {/* Chip 4: Waiting Parts */}
          <div className="p-3 bg-slate-950/60 border border-rose-500/30 rounded-2xl">
            <span className="text-[10.5px] font-bold text-rose-400 block">🔴 ขาดอะไหล่ (Hold)</span>
            <div className="font-mono text-xl font-black text-white mt-0.5">
              {metrics.readinessCounts.waitingParts} <span className="text-[10px] font-normal text-slate-400">งาน</span>
            </div>
          </div>

          {/* Chip 5: Pending Schedule */}
          <div className="p-3 bg-slate-950/60 border border-amber-500/30 rounded-2xl">
            <span className="text-[10.5px] font-bold text-amber-400 block">🟡 รอจัดเวลา/ช่าง</span>
            <div className="font-mono text-xl font-black text-white mt-0.5">
              {metrics.readinessCounts.pendingSchedule + metrics.readinessCounts.draft} <span className="text-[10px] font-normal text-slate-400">งาน</span>
            </div>
          </div>

          {/* Chip 6: Closed Completed */}
          <div className="p-3 bg-slate-950/60 border border-slate-700/60 rounded-2xl">
            <span className="text-[10.5px] font-bold text-slate-400 block">✅ ปิดงานสมบูรณ์</span>
            <div className="font-mono text-xl font-black text-white mt-0.5">
              {metrics.readinessCounts.closed} <span className="text-[10px] font-normal text-slate-400">งาน</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN VIEWPORT SWITCHER */}
      {activeMainView === 'analytics' ? (
        <PlannedWorkAnalyticsTab workOrders={workOrders} />
      ) : activeMainView === 'tbm_matrix' ? (
        <div className="space-y-4">
          {/* PM Datamatrix Master Plan Banner & Batch Integration Controls */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    <CalendarRange size={18} />
                  </span>
                  <h2 className="text-base font-extrabold text-white">
                    ตารางแผน PM Datamatrix (Time-Based Maintenance Master Plan)
                  </h2>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 font-bold border border-indigo-800/40">
                    Planned Work Core Database
                  </span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 font-bold border border-cyan-800/40">
                    รวมอยู่ในแผน CMMS 100%
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-3xl">
                  แผนงานบำรุงรักษาเชิงป้องกันตามรอบเวลา 12 เดือน (TBM Datamatrix) เป็นแกนหลักของ <strong>Planned Work</strong> ในระบบ CMMS 
                  ทุกรายการแผนงานสามารถเปลี่ยนเป็นใบสั่งงาน <strong>Work Order</strong> เพื่อตรวจสอบความพร้อม 4 ด้าน (เวลา • ช่าง • อะไหล่ • ความปลอดภัย) ก่อนปล่อยงานให้ช่างปฏิบัติจริงตามหลัก <em>No Work Order - No Work</em>
                </p>
              </div>

              {/* Batch Action Bar */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <Calendar size={14} className="text-indigo-400" />
                  <span>เลือกเดือน:</span>
                  <select
                    value={selectedBatchMonth}
                    onChange={(e) => setSelectedBatchMonth(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-700 text-white font-bold rounded-lg px-2 py-1 text-xs outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {[
                      'มกราคม (M1)', 'กุมภาพันธ์ (M2)', 'มีนาคม (M3)', 'เมษายน (M4)',
                      'พฤษภาคม (M5)', 'มิถุนายน (M6)', 'กรกฎาคม (M7)', 'สิงหาคม (M8)',
                      'กันยายน (M9)', 'ตุลาคม (M10)', 'พฤศจิกายน (M11)', 'ธันวาคม (M12)'
                    ].map((name, idx) => (
                      <option key={idx + 1} value={idx + 1}>{name}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => handleBatchCreateMonthlyPMOrders(selectedBatchMonth)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-950/50 transition cursor-pointer active:scale-95"
                  title="สร้าง Work Order สำหรับแผน PM ทั้งหมดในเดือนที่เลือก"
                >
                  <Sparkles size={14} className="text-amber-300" />
                  <span>⚡ ดึงแผนเดือนนี้ออก Work Order ({pmPlansDueInSelectedMonth} แผน)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPMExcelImportModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-sm"
                  title="นำเข้าแผน PM จากไฟล์ Excel (.xlsx, .xls, .csv) เข้าสู่ระบบ"
                >
                  <FileSpreadsheet size={14} className="text-emerald-400" />
                  <span>📥 นำเข้าแผน PM จาก Excel</span>
                </button>
              </div>
            </div>

            {/* Quick KPI stats between PM Matrix & Work Orders */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 border-t border-slate-800/80">
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">แผน PM ใน Datamatrix:</span>
                <span className="font-mono text-xs font-bold text-white">{pmPlans.length} แผน</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-indigo-500/30 flex items-center justify-between">
                <span className="text-[11px] text-indigo-300">แผนที่มีกำหนดในเดือน {selectedBatchMonth}:</span>
                <span className="font-mono text-xs font-bold text-indigo-200">{pmPlansDueInSelectedMonth} แผน</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-cyan-500/30 flex items-center justify-between">
                <span className="text-[11px] text-cyan-300">มี Work Order รองรับแล้ว:</span>
                <span className="font-mono text-xs font-bold text-cyan-200">{pmPlansWithWOInSelectedMonth} งาน</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-amber-500/30 flex items-center justify-between">
                <span className="text-[11px] text-amber-300">รอสร้าง Work Order:</span>
                <span className="font-mono text-xs font-bold text-amber-200">
                  {Math.max(0, pmPlansDueInSelectedMonth - pmPlansWithWOInSelectedMonth)} งาน
                </span>
              </div>
            </div>
          </div>

          {/* Full TBM Plan Schedule Matrix with CMMS Work Order mode enabled */}
          <TBMPlanSchedulePage 
            workOrderMode={true}
            onNavigateToSchedule={() => setActiveMainView('grid')}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Orphaned Breakdown Work Orders Alert Banner */}
          {orphanedBreakdownWOs.length > 0 && (
            <div 
              id="banner-orphaned-breakdown-wos"
              className="bg-rose-950/40 border-2 border-rose-500/50 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-rose-200 shadow-xl shadow-rose-950/40 animate-in fade-in"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm flex items-center gap-2">
                    <span>ตรวจพบใบสั่งงาน WO (Breakdown) ที่งานซ่อมต้นทางถูกลบไปแล้ว</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-900 text-rose-200 text-xs font-mono font-bold border border-rose-700/50">
                      {orphanedBreakdownWOs.length} รายการ
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-300/80 mt-0.5 leading-relaxed">
                    ใบสั่งงานเหล่านี้เคยถูกสร้างจากงานซ่อมเบรกดาวน์ แต่บันทึกงานซ่อมต้นทางดังกล่าวถูกลบออกจากระบบไปแล้ว (กดดูแล้วไม่มีประวัติเดิม) ท่านสามารถลบออกเพื่อรักษาความถูกต้องของวินัย CMMS
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                <button
                  type="button"
                  onClick={() => setTypeFilter('BREAKDOWN')}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700 text-xs font-semibold cursor-pointer transition"
                >
                  🔍 กรองดูงานกลุ่มนี้
                </button>
                <button
                  type="button"
                  onClick={handleDeleteOrphanedBreakdownWOs}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95 transition"
                >
                  <Trash2 size={13} />
                  <span>ลบใบงานที่ต้นทางถูกลบ ({orphanedBreakdownWOs.length})</span>
                </button>
              </div>
            </div>
          )}

          {/* Search & Filter Toolbar */}
          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหา WO, เครื่องจักร, ชื่องาน, ช่าง..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {/* Category: Planned vs Unplanned */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs">
                <span className="text-slate-400">หมวด:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as any)}
                  className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900">ทุกหมวด (All)</option>
                  <option value="PLANNED" className="bg-slate-900">Planned Work (ตามแผน)</option>
                  <option value="UNPLANNED" className="bg-slate-900">Unplanned (ฉุกเฉิน)</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs">
                <span className="text-slate-400">สถานะ:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900">ทุกสถานะ</option>
                  <option value="READY_TO_RELEASE" className="bg-slate-900">🟢 พร้อมปล่อยงาน</option>
                  <option value="RELEASED" className="bg-slate-900">🚀 กำลังปฏิบัติงาน</option>
                  <option value="WAITING_PARTS" className="bg-slate-900">🔴 รออะไหล่ (ขาดสต็อก)</option>
                  <option value="PENDING_SCHEDULE" className="bg-slate-900">🟡 รอจัดตาราง/ช่าง</option>
                  <option value="COMPLETED_PENDING_HANDOVER" className="bg-slate-900">รอตรวจรับ</option>
                  <option value="CLOSED" className="bg-slate-900">✅ ปิดงานสมบูรณ์</option>
                </select>
              </div>

              {/* Type Filter */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs">
                <span className="text-slate-400">ประเภท:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900">ทุกประเภทงาน</option>
                  <option value="PM" className="bg-slate-900">PM ตามแผน</option>
                  <option value="CORRECTIVE" className="bg-slate-900">Corrective ซ่อมตามแจ้ง</option>
                  <option value="BREAKDOWN" className="bg-slate-900">Breakdown ฉุกเฉิน</option>
                  <option value="IMPROVEMENT" className="bg-slate-900">Kaizen / ปรับปรุง</option>
                  <option value="OPERATION" className="bg-slate-900">ประจำการคุมกะ</option>
                </select>
              </div>
            </div>
          </div>

          {/* Quick Selection & Bulk Action Bar */}
          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                id="btn-wo-select-all-filtered"
                onClick={handleSelectAllFiltered}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition cursor-pointer select-none ${
                  isAllFilteredSelected
                    ? 'bg-cyan-600 text-slate-950 border-cyan-400 font-bold'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {isAllFilteredSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                <span>{isAllFilteredSelected ? `ยกเลิกเลือก (${filteredWorkOrders.length})` : `เลือกทั้งหมดที่แสดง (${filteredWorkOrders.length})`}</span>
              </button>

              {workOrders.length > filteredWorkOrders.length && (
                <button
                  type="button"
                  id="btn-wo-select-all-system"
                  onClick={handleSelectAllInSystem}
                  className="px-3 py-1.5 text-xs font-semibold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 rounded-xl transition cursor-pointer"
                >
                  ☑️ เลือกทุก WO ในระบบ ({workOrders.length})
                </button>
              )}

              {selectedWOIds.size > 0 && (
                <>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    id="btn-wo-bulk-delete-selected"
                    onClick={handleOpenBulkDeleteModal}
                    className="px-3.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-md shadow-rose-950/60 flex items-center gap-1.5 transition active:scale-95 cursor-pointer animate-in fade-in"
                  >
                    <Trash2 size={13} />
                    <span>ลบที่เลือก ({selectedWOIds.size} รายการ)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
                  >
                    ล้างการเลือก
                  </button>
                </>
              )}
            </div>

            {workOrders.length > 0 && (
              <button
                type="button"
                id="btn-wo-delete-all-system"
                onClick={() => setShowDeleteAllModal(true)}
                className="px-3 py-1.5 text-xs font-semibold bg-rose-950/30 hover:bg-rose-950/60 text-rose-300 border border-rose-800/40 rounded-xl transition cursor-pointer flex items-center gap-1.5 ml-auto active:scale-95"
                title="ลบแผนงาน Work Order ทั้งหมดในระบบ CMMS (รีเซ็ตตารางใบงาน)"
              >
                <Trash2 size={13} className="text-rose-400" />
                <span>ล้าง WO ทั้งหมดในระบบ ({workOrders.length})</span>
              </button>
            )}
          </div>

          {/* STICKY FLOATING SELECTION ACTION BAR (เมื่อมีการเลือกแผนงาน WO) */}
          {selectedWOIds.size > 0 && (
            <div 
              id="wo-floating-selection-bar"
              className="sticky top-2 z-40 bg-slate-900/95 border-2 border-cyan-500/80 backdrop-blur-md rounded-2xl p-3.5 shadow-2xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>เลือกอยู่ <span className="text-amber-400 font-mono text-sm font-bold">{selectedWOIds.size}</span> จาก {filteredWorkOrders.length} แผนงาน WO ที่แสดง</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-slate-400">ทั้งหมดในระบบ {workOrders.length} รายการ</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    คุณสามารถเลือกลบแผนงาน WO เป็นชุด หรือเลือกลบทุกใบสั่งงานในระบบพร้อมกัน
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition cursor-pointer"
                >
                  {isAllFilteredSelected ? 'ยกเลิกเลือกที่แสดง' : `เลือกทั้งหมดที่แสดง (${filteredWorkOrders.length})`}
                </button>
                {workOrders.length > filteredWorkOrders.length && (
                  <button
                    type="button"
                    onClick={handleSelectAllInSystem}
                    className="px-3 py-1.5 text-xs font-semibold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 rounded-xl border border-indigo-500/40 transition cursor-pointer"
                  >
                    เลือกทุก WO ในระบบ ({workOrders.length})
                  </button>
                )}
                <button
                  type="button"
                  id="btn-confirm-bulk-delete-bar"
                  onClick={handleOpenBulkDeleteModal}
                  className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-950/60 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>ลบแผนงาน WO ที่เลือก ({selectedWOIds.size} รายการ)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteAllModal(true)}
                  className="px-3 py-1.5 text-xs font-semibold bg-rose-950/40 hover:bg-rose-950/70 text-rose-300 border border-rose-800/50 rounded-xl transition cursor-pointer"
                >
                  ล้างทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer ml-1"
                  title="ยกเลิกการเลือกทั้งหมด"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Work Orders Grid / Table */}
          {filteredWorkOrders.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <FileText size={24} />
              </div>
              <h3 className="text-sm font-bold text-white">ไม่พบใบสั่งงานที่ตรงกับเงื่อนไข</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                ลองปรับเปลี่ยนตัวกรอง หรือกดปุ่ม <strong>"สร้างใบสั่งงานตามแผน"</strong> เพื่อเพิ่มงานใหม่เข้าสู่ระบบ CMMS
              </p>
            </div>
          ) : (
            <div className="bg-[#0b1325] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#0f1b33] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[11px]">
                    <tr>
                      <th className="py-3 px-3 text-center w-10">
                        <input
                          type="checkbox"
                          checked={isAllFilteredSelected}
                          ref={(input) => {
                            if (input) input.indeterminate = isSomeFilteredSelected;
                          }}
                          onChange={handleSelectAllFiltered}
                          className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 cursor-pointer accent-cyan-500"
                          title={isAllFilteredSelected ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมดที่แสดง'}
                        />
                      </th>
                      <th className="py-3 px-3.5">เลขที่ใบสั่งงาน</th>
                      <th className="py-3 px-3">หมวดวินัย</th>
                      <th className="py-3 px-3">เครื่องจักร & พื้นที่</th>
                      <th className="py-3 px-3.5">ชื่องานสั่งการ</th>
                      <th className="py-3 px-3 text-center">4 เสาหลัก Readiness</th>
                      <th className="py-3 px-3 text-center">กำหนดเวลา</th>
                      <th className="py-3 px-3 text-center">ช่างผู้รับผิดชอบ</th>
                      <th className="py-3 px-3 text-center">สถานะ</th>
                      <th className="py-3 px-3 text-center w-28">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-300">
                    {filteredWorkOrders.map((wo) => {
                      const isRowSelected = selectedWOIds.has(wo.id);
                      const isReadyToRelease = wo.readiness.gatePassed || wo.priority === 'ฉุกเฉินไลน์หยุด';
                      const isLineStop = wo.priority === 'ฉุกเฉินไลน์หยุด';
                      return (
                        <tr 
                          key={wo.id}
                          className={`hover:bg-cyan-950/20 transition cursor-pointer group ${
                            isRowSelected
                              ? 'bg-cyan-950/35 ring-1 ring-cyan-500/40 border-l-2 border-l-cyan-400'
                              : isLineStop
                              ? 'bg-rose-950/10'
                              : ''
                          }`}
                          onClick={() => handleOpenDetail(wo)}
                        >
                          {/* Checkbox Column */}
                          <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isRowSelected}
                              onChange={() => handleToggleSelectWO(wo.id)}
                              className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 cursor-pointer accent-cyan-500"
                            />
                          </td>

                          {/* WO Number */}
                          <td className="py-3 px-3.5 font-mono">
                            <span className="font-bold text-cyan-400 group-hover:underline">
                              {wo.id}
                            </span>
                            {wo.workRequestNo && (
                              <div className="text-[10px] text-slate-500">
                                ใบแจ้ง: #{wo.workRequestNo}
                              </div>
                            )}
                          </td>

                          {/* Work Category */}
                          <td className="py-3 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              wo.workCategory === 'PLANNED'
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                                : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                            }`}>
                              {wo.workCategory === 'PLANNED' ? 'Planned (ตามแผน)' : 'Unplanned (ฉุกเฉิน)'}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {wo.sourceType}
                            </div>
                            {orphanedBreakdownWOs.some(o => o.id === wo.id) && (
                              <span 
                                className="inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-800/60 font-sans whitespace-nowrap" 
                                title="งานซ่อมเบรกดาวน์ต้นทางของใบงานนี้ถูกลบออกจากระบบแล้ว"
                              >
                                ⚠️ ต้นทางถูกลบ
                              </span>
                            )}
                          </td>

                          {/* Machine & Line */}
                          <td className="py-3 px-3">
                            <div className="font-mono font-bold text-white">[{wo.machineId}]</div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                              {wo.machineName || '-'}
                            </div>
                          </td>

                          {/* Title */}
                          <td className="py-3 px-3.5">
                            <div className="font-semibold text-white group-hover:text-cyan-300 transition line-clamp-1 max-w-[240px]">
                              {wo.title}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              {wo.lotoRequired && (
                                <div className="inline-flex items-center gap-1 text-[10px] text-amber-400">
                                  <ShieldAlert size={11} />
                                  <span>LOTO: {wo.lotoTag || 'Active'}</span>
                                </div>
                              )}
                              {wo.failureCode && (
                                <div className="inline-flex items-center gap-1.5 flex-wrap">
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                                    {wo.failureCode.symptomCode}
                                  </span>
                                  <span className="text-[10px] text-slate-400 truncate max-w-[130px]" title={wo.failureCode.symptomLabel}>
                                    {wo.failureCode.symptomLabel}
                                  </span>
                                  {wo.totalPartsCost !== undefined && wo.totalPartsCost > 0 && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800/60">
                                      ฿{wo.totalPartsCost.toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 4 Pillars Readiness Mini Badges */}
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
                              {/* 1. Time */}
                              <span 
                                title={`1. เวลาเริ่ม: ${wo.readiness.timeScheduled ? 'ระบุแล้ว' : 'ยังไม่ระบุ'}`}
                                className={`p-1 rounded-md text-[10px] ${
                                  wo.readiness.timeScheduled ? 'text-emerald-400 bg-emerald-950/60' : 'text-slate-600 bg-slate-950'
                                }`}
                              >
                                <Calendar size={12} />
                              </span>

                              {/* 2. Duration */}
                              <span 
                                title={`2. ระยะเวลา: ${wo.estimatedDurationMins} นาที`}
                                className={`p-1 rounded-md text-[10px] ${
                                  wo.readiness.estimatedDurationValid ? 'text-emerald-400 bg-emerald-950/60' : 'text-slate-600 bg-slate-950'
                                }`}
                              >
                                <Clock size={12} />
                              </span>

                              {/* 3. Crew */}
                              <span 
                                title={`3. ช่าง: ${wo.assignedTechnicians.join(', ') || 'ยังไม่ระบุ'}`}
                                className={`p-1 rounded-md text-[10px] ${
                                  wo.readiness.laborAssigned ? 'text-emerald-400 bg-emerald-950/60' : 'text-slate-600 bg-slate-950'
                                }`}
                              >
                                <User size={12} />
                              </span>

                              {/* 4. Spare Parts */}
                              <span 
                                title={`4. อะไหล่: ${wo.requiresParts ? (wo.readiness.partsAvailable ? 'พร้อมในคลัง' : 'ขาดสต็อก!') : 'ไม่ต้องใช้อะไหล่'}`}
                                className={`p-1 rounded-md text-[10px] ${
                                  wo.readiness.partsAvailable ? 'text-emerald-400 bg-emerald-950/60' : 'text-rose-400 bg-rose-950/60'
                                }`}
                              >
                                <Package size={12} />
                              </span>
                            </div>
                          </td>

                          {/* Schedule */}
                          <td className="py-3 px-3 text-center font-mono">
                            <div className="text-slate-200">{wo.scheduledDate}</div>
                            <div className="text-[10px] text-cyan-400">{wo.scheduledStartTime} น.</div>
                          </td>

                          {/* Tech Crew */}
                          <td className="py-3 px-3 text-center">
                            <div className="font-semibold text-white truncate max-w-[120px]">
                              {wo.leadTechnician || wo.assignedTechnicians[0] || '-'}
                            </div>
                            {wo.assignedTechnicians.length > 1 && (
                              <div className="text-[10px] text-slate-400">
                                + อีก {wo.assignedTechnicians.length - 1} คน
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[10.5px] font-bold ${
                              wo.status === 'CLOSED'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                                : wo.status === 'RELEASED'
                                ? 'bg-blue-950 text-blue-300 border border-blue-500/30 animate-pulse'
                                : wo.status === 'READY_TO_RELEASE'
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                                : wo.status === 'WAITING_PARTS'
                                ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                                : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                            }`}>
                              {wo.status === 'CLOSED' && '✅ ปิดสมบูรณ์'}
                              {wo.status === 'RELEASED' && '🚀 กำลังทำ'}
                              {wo.status === 'READY_TO_RELEASE' && '🟢 พร้อมปล่อย'}
                              {wo.status === 'WAITING_PARTS' && '🔴 รออะไหล่'}
                              {wo.status === 'PENDING_SCHEDULE' && '🟡 รอเวลา/คน'}
                              {wo.status === 'COMPLETED_PENDING_HANDOVER' && 'รอตรวจรับ'}
                              {wo.status === 'DRAFT' && 'แบบร่าง'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              {wo.status !== 'RELEASED' && wo.status !== 'CLOSED' && (
                                <button
                                  type="button"
                                  onClick={() => handleDirectRelease(wo)}
                                  disabled={!isReadyToRelease}
                                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                                    isReadyToRelease
                                      ? 'bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold'
                                      : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                  }`}
                                  title={isReadyToRelease ? "ปล่อยงานให้ช่างเริ่มปฏิบัติงาน" : "ยังไม่ผ่านเกณฑ์ 4 เสาหลัก"}
                                >
                                  <Play size={13} className="fill-current" />
                                </button>
                              )}

                              {wo.status === 'RELEASED' && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenDetail(wo)}
                                  className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black transition cursor-pointer"
                                  title="ปิดงานและตัดสต็อกอะไหล่ (Close WO)"
                                >
                                  <Check size={13} className="stroke-[3]" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenDetail(wo)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                                title="ดูรายละเอียดใบสั่งงาน"
                              >
                                <Eye size={13} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleEdit(wo)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-transparent hover:border-amber-500/30 transition cursor-pointer"
                                title="แก้ไขใบสั่งงาน Work Order"
                              >
                                <Edit3 size={13} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenDelete(wo)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-transparent hover:border-rose-500/30 transition cursor-pointer"
                                title="ลบใบสั่งงาน Work Order"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
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
      )}

      {/* 4. MODALS */}
      {/* Create / Edit Work Order Modal */}
      {showCreateModal && (
        <WorkOrderModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedWO(null);
            setFromWorkRequestId(undefined);
          }}
          initialData={selectedWO}
          fromWorkRequestId={fromWorkRequestId}
          onSaved={(savedWO) => {
            showToast(`บันทึกใบสั่งงาน ${savedWO.workOrderNo || savedWO.id} เรียบร้อยแล้ว`);
            setSelectedWO(null);
          }}
        />
      )}

      {/* 1-Click Emergency Breakdown Modal */}
      {showEmergencyModal && (
        <EmergencyWOModal
          isOpen={showEmergencyModal}
          onClose={() => setShowEmergencyModal(false)}
          onCreated={(woId) => {
            showToast(`⚡ ออกใบสั่งงานฉุกเฉิน ${woId} และปล่อยงานให้ทีมช่างเรียบร้อยแล้ว`);
          }}
        />
      )}

      {/* Detail & Handover Modal */}
      {showDetailModal && selectedWO && (
        <WorkOrderDetailModal
          isOpen={showDetailModal}
          workOrder={selectedWO}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedWO(null);
          }}
          onEdit={(wo) => handleEdit(wo)}
          onDelete={(wo) => handleOpenDelete(wo)}
        />
      )}

      {/* Convert from Work Request Selector Modal */}
      {showFromRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-[#0b1325] border border-cyan-500/40 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  เลือกใบแจ้งซ่อมจากฝ่ายผลิตเพื่อออก Work Order
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  เชื่อมโยงคำขอแจ้งซ่อม (Work Request) เข้าสู่วินัยใบสั่งงาน (Work Order)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFromRequestModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2.5 max-h-[60vh]">
              {workRequests.filter(r => r.status !== 'ปิดงานสมบูรณ์' && r.status !== 'ยกเลิก/ปฏิเสธ').length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">ไม่มีใบแจ้งซ่อมที่รอการออกใบสั่งงาน</p>
              ) : (
                workRequests
                  .filter(r => r.status !== 'ปิดงานสมบูรณ์' && r.status !== 'ยกเลิก/ปฏิเสธ')
                  .map(req => (
                    <div 
                      key={req.id} 
                      className="p-3 bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 rounded-xl flex items-center justify-between gap-3 transition cursor-pointer"
                      onClick={() => handleConvertRequest(req.id)}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-cyan-400">#{req.ticketNo || req.id}</span>
                          <span className="font-mono text-xs text-slate-300">[{req.machineId}]</span>
                          <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                            req.priority === 'ฉุกเฉินไลน์หยุด' ? 'bg-rose-950 text-rose-300' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {req.priority}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-white">{req.problemTitle}</div>
                        <div className="text-[11px] text-slate-400">
                          ผู้แจ้ง: {req.requesterName} ({req.requestDate} {req.requestTime})
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConvertRequest(req.id);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs shrink-0 cursor-pointer"
                      >
                        แปลงเป็น WO →
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && woToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-[#0b1325] border border-rose-500/50 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4 ring-1 ring-rose-500/30 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 shrink-0">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  ยืนยันการลบใบสั่งงาน Work Order
                </h3>
                <p className="text-xs text-rose-300/80">
                  การดำเนินการนี้ไม่สามารถเรียกคืนได้
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">เลขที่ใบสั่งงาน:</span>
                <span className="font-mono font-bold text-cyan-400">
                  {woToDelete.workOrderNo || woToDelete.id}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">เครื่องจักร:</span>
                <span className="font-bold text-white">
                  [{woToDelete.machineId}] {woToDelete.machineName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">ชื่องานสั่งการ:</span>
                <span className="font-semibold text-slate-200 truncate max-w-[200px]" title={woToDelete.title}>
                  {woToDelete.title}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">สถานะปัจจุบัน:</span>
                <span className="font-bold text-amber-300">
                  {woToDelete.status}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              ต้องการลบใบสั่งงานนี้ออกจากระบบ CMMS ใช่หรือไม่? สถิติ Planned Work และประวัติที่เกี่ยวข้องจะถูกปรับปรุง
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setWoToDelete(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-950/50 transition cursor-pointer active:scale-95"
              >
                <Trash2 size={14} />
                <span>ยืนยันลบใบงาน</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE WORK ORDERS MODAL (ลบแผนงาน WO แบบเลือกหลายรายการ / ทั้งหมด) */}
      {showBulkDeleteModal && (
        <div 
          id="modal-bulk-delete-wo"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div 
            className="bg-[#0b1325] border-2 border-rose-500/60 rounded-3xl w-full max-w-xl p-5 sm:p-6 shadow-2xl space-y-4 ring-1 ring-rose-500/30 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 shrink-0">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    ยืนยันการลบแผนงาน Work Order ที่เลือก ({selectedWOIds.size} รายการ)
                  </h3>
                  <p className="text-xs text-rose-300/80">
                    รายการที่เลือกจะถูกลบออกจากระบบ CMMS ถาวร
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Summary badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 font-bold">
                จำนวนที่เลือกลบ: {selectedWOIds.size} แผนงาน
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                จากทั้งหมดในระบบ {workOrders.length} รายการ
              </span>
            </div>

            {/* Preview of items to be deleted */}
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 text-xs max-h-52 overflow-y-auto custom-scrollbar">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                รายการแผนงาน WO ที่จะถูกลบ:
              </div>
              {selectedWOsList.slice(0, 10).map(wo => (
                <div key={wo.id} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-slate-300">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-cyan-400 font-bold shrink-0">{wo.id}</span>
                    <span className="text-slate-400 shrink-0">[{wo.machineId}]</span>
                    <span className="truncate text-white" title={wo.title}>{wo.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      wo.workCategory === 'PLANNED'
                        ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/30'
                        : 'bg-rose-950/60 text-rose-300 border-rose-500/30'
                    }`}>
                      {wo.sourceType}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {wo.status}
                    </span>
                  </div>
                </div>
              ))}
              {selectedWOsList.length > 10 && (
                <div className="text-center text-[11px] text-slate-500 pt-1">
                  ... และอีก {selectedWOsList.length - 10} รายการ
                </div>
              )}
            </div>

            {/* Optional checkbox to also remove uncompleted schedules */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={bulkDeleteLinkedSchedules}
                onChange={(e) => setBulkDeleteLinkedSchedules(e.target.checked)}
                className="w-4 h-4 rounded text-rose-500 bg-slate-950 border-slate-700 cursor-pointer accent-rose-500 mt-0.5"
              />
              <div>
                <span className="font-bold text-white">ลบรายการนัดหมายในตารางงานช่างที่เกี่ยวข้องด้วย</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  ลบคิวนัดหมายของแผนงานเหล่านี้ในตารางงานช่าง (เฉพาะงานที่ยังไม่เสร็จสิ้น)
                </p>
              </div>
            </label>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                id="btn-confirm-bulk-delete-action"
                onClick={handleConfirmBulkDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-950/50 transition cursor-pointer active:scale-95"
              >
                <Trash2 size={14} />
                <span>ยืนยันลบ {selectedWOIds.size} รายการ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ALL WORK ORDERS IN SYSTEM MODAL (ล้างแผนงาน WO ทั้งหมดในระบบ) */}
      {showDeleteAllModal && (
        <div 
          id="modal-delete-all-wo"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div 
            className="bg-[#0b1325] border-2 border-rose-600 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4 ring-2 ring-rose-500/40 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="p-3 rounded-2xl bg-rose-600/20 text-rose-400 border border-rose-600/40 shrink-0">
                <AlertTriangle size={26} />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  ล้างแผนงาน Work Order ทั้งหมดในระบบ
                </h3>
                <p className="text-xs text-rose-300">
                  คำเตือน: การกระทำนี้จะล้างใบสั่งงาน WO ทุกใบในระบบ
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-950/30 border border-rose-500/40 rounded-xl space-y-2 text-xs text-rose-200">
              <div className="font-bold flex items-center gap-1.5">
                <Trash2 size={14} className="text-rose-400" />
                <span>จำนวนใบสั่งงานที่จะถูกลบทั้งหมด: {workOrders.length} รายการ</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                ระบบจะล้างตารางใบสั่งงาน Work Order ทั้งหมดเป็น 0 รายการ 
                สถิติและตัวชี้วัด %Planned Work จะถูกรีเซ็ตตามข้อมูลใหม่
              </p>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={bulkDeleteLinkedSchedules}
                onChange={(e) => setBulkDeleteLinkedSchedules(e.target.checked)}
                className="w-4 h-4 rounded text-rose-500 bg-slate-950 border-slate-700 cursor-pointer accent-rose-500 mt-0.5"
              />
              <div>
                <span className="font-bold text-white">ล้างคิวนัดหมายในตารางงานช่างด้วย</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  รีเซ็ตตารางนัดหมายงานช่างที่ไม่ใช่ประวัติเสร็จสิ้น
                </p>
              </div>
            </label>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteAllModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                id="btn-confirm-delete-all-wo-action"
                onClick={handleConfirmDeleteAllInSystem}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-950/60 transition cursor-pointer active:scale-95"
              >
                <Trash2 size={14} />
                <span>ยืนยันล้างทั้งหมด ({workOrders.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel PM Import Modal */}
      {showPMExcelImportModal && (
        <PMExcelImportModal
          machines={machines}
          onClose={() => setShowPMExcelImportModal(false)}
        />
      )}
    </div>
  );
};
