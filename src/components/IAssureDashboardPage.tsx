import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  Plus,
  Search,
  Download,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Wrench,
  Edit3,
  Trash2,
  Camera,
  X,
  Image as ImageIcon,
  Cpu,
  ShieldCheck,
  Filter
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  CALIBRATION_LABELS,
  CalibrationResult,
  IASSURE_COMMON_PARTS,
  IASSURE_STATUS_LABELS,
  IAssureItem,
  IAssureStatus
} from '../types/iAssure';
import { PRELOADED_IASSURE_ITEMS } from '../data/preloadedIAssure';
import { compressImageFile } from '../utils/imageUtils';

type StatusFilter = 'ALL' | IAssureStatus | 'NEEDS_PART';

function getTodayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function formatThaiDate(iso?: string): string {
  if (!iso) return '-';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) return iso;
  const months = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${Number(m[3])} ${months[Number(m[2])] || m[2]} ${String(Number(m[1]) + 543).slice(-2)}`;
}

interface FormState {
  orderNo: number;
  machineName: string;
  status: IAssureStatus;
  partToReplace: string;
  customPart: string;
  serialNumber: string;
  testResult: string;
  lightBoxCalibrate: CalibrationResult;
  iAssureCalibrate: CalibrationResult;
  prPoNo: string;
  estimatedCost: number;
  targetDate: string;
  activatedDate: string;
  responsibleTech: string;
  photo: string;
}

export const IAssureDashboardPage: React.FC = () => {
  const { iAssureItems, setIAssureItems, technicians, canEdit, canDelete } = useApp();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [partFilter, setPartFilter] = useState<string>('ALL');

  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; title: string } | null>(null);

  // Modals
  const [editingItem, setEditingItem] = useState<IAssureItem | null>(null);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [quickActivateItem, setQuickActivateItem] = useState<IAssureItem | null>(null);
  const [quickDate, setQuickDate] = useState<string>(getTodayIso());
  const [quickTech, setQuickTech] = useState<string>('');
  const [quickNote, setQuickNote] = useState<string>('');
  const [quickClearPart, setQuickClearPart] = useState<boolean>(true);
  const [quickPhoto, setQuickPhoto] = useState<string>('');

  const [deleteTarget, setDeleteTarget] = useState<IAssureItem | null>(null);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, text });
    window.setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 3600);
  };

  // Summary metrics
  const stats = useMemo(() => {
    const total = iAssureItems.length;
    const activeCount = iAssureItems.filter((i) => i.status === 'ACTIVE').length;
    const standbyCount = iAssureItems.filter((i) => i.status === 'PASSED_STANDBY').length;
    const failedCount = iAssureItems.filter((i) => i.status === 'FAILED').length;
    const needsPartItems = iAssureItems.filter((i) => (i.partToReplace || '').trim() !== '');
    const lightBoxCount = needsPartItems.filter((i) => i.partToReplace.toLowerCase().includes('light box')).length;

    const activePct = total > 0 ? Math.round((activeCount / total) * 100) : 0;
    const standbyPct = total > 0 ? Math.round((standbyCount / total) * 100) : 0;
    const failedPct = total > 0 ? Math.max(0, 100 - activePct - standbyPct) : 0;
    const passedTotalPct = total > 0 ? Math.round(((activeCount + standbyCount) / total) * 100) : 0;

    const totalEstimatedCost = iAssureItems.reduce((sum, i) => sum + (Number(i.estimatedCost) || 0), 0);

    return {
      total,
      activeCount,
      standbyCount,
      failedCount,
      activePct,
      standbyPct,
      failedPct,
      passedTotalPct,
      needsPartCount: needsPartItems.length,
      lightBoxCount,
      totalEstimatedCost
    };
  }, [iAssureItems]);

  // Donut Chart Data
  const donutData = useMemo(
    () => [
      { name: 'เปิดใช้งานแล้ว', value: stats.activeCount, pct: stats.activePct, color: '#10b981' },
      { name: 'เทสผ่าน (รอเปิดใช้งาน)', value: stats.standbyCount, pct: stats.standbyPct, color: '#38bdf8' },
      { name: 'ไม่ผ่าน / รอแก้ไข', value: stats.failedCount, pct: stats.failedPct, color: '#f59e0b' }
    ],
    [stats]
  );

  // Calibration Diagnostic Chart Data
  const calibrationChartData = useMemo(() => {
    const lbPass = iAssureItems.filter((i) => i.lightBoxCalibrate === 'PASS').length;
    const lbFail = iAssureItems.filter((i) => i.lightBoxCalibrate === 'FAIL').length;
    const lbPending = iAssureItems.filter((i) => i.lightBoxCalibrate === 'PENDING').length;

    const iaPass = iAssureItems.filter((i) => i.iAssureCalibrate === 'PASS').length;
    const iaFail = iAssureItems.filter((i) => i.iAssureCalibrate === 'FAIL').length;
    const iaPending = iAssureItems.filter((i) => i.iAssureCalibrate === 'PENDING').length;

    return [
      { stage: 'คาลิเบท Light box', pass: lbPass, fail: lbFail, pending: lbPending },
      { stage: 'คาลิเบท iAssure', pass: iaPass, fail: iaFail, pending: iaPending }
    ];
  }, [iAssureItems]);

  // Replacement Parts Breakdown
  const partsBreakdown = useMemo(() => {
    const map = new Map<string, { part: string; count: number; machines: string[]; estimatedCost: number }>();
    iAssureItems.forEach((item) => {
      const p = (item.partToReplace || '').trim();
      if (!p) return;
      const existing = map.get(p) || { part: p, count: 0, machines: [], estimatedCost: 0 };
      existing.count += 1;
      existing.machines.push(item.machineName);
      existing.estimatedCost += Number(item.estimatedCost) || 0;
      map.set(p, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [iAssureItems]);

  const uniqueParts = useMemo(
    () => Array.from(new Set(iAssureItems.map((i) => (i.partToReplace || '').trim()).filter(Boolean))),
    [iAssureItems]
  );

  // Filtered table items
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return iAssureItems
      .filter((item) => {
        if (statusFilter === 'NEEDS_PART' && !(item.partToReplace || '').trim()) return false;
        if (statusFilter !== 'ALL' && statusFilter !== 'NEEDS_PART' && item.status !== statusFilter) return false;
        if (partFilter !== 'ALL' && (item.partToReplace || '').trim() !== partFilter) return false;

        if (q) {
          const hay = [
            item.orderNo,
            item.machineName,
            IASSURE_STATUS_LABELS[item.status],
            item.partToReplace,
            item.serialNumber,
            item.testResult,
            item.prPoNo || '',
            item.responsibleTech || ''
          ]
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => a.orderNo - b.orderNo);
  }, [iAssureItems, searchQuery, statusFilter, partFilter]);

  // Open Add Modal
  const openAddModal = () => {
    const nextOrder = iAssureItems.reduce((max, i) => Math.max(max, i.orderNo || 0), 0) + 1;
    setEditingItem(null);
    setFormState({
      orderNo: nextOrder,
      machineName: '',
      status: 'FAILED',
      partToReplace: 'Light box',
      customPart: '',
      serialNumber: '',
      testResult: '',
      lightBoxCalibrate: 'PENDING',
      iAssureCalibrate: 'PENDING',
      prPoNo: '',
      estimatedCost: 0,
      targetDate: '',
      activatedDate: '',
      responsibleTech: '',
      photo: ''
    });
  };

  // Open Edit Modal
  const openEditModal = (item: IAssureItem) => {
    const isPresetPart = (IASSURE_COMMON_PARTS as readonly string[]).includes(item.partToReplace || '');
    setEditingItem(item);
    setFormState({
      orderNo: item.orderNo,
      machineName: item.machineName,
      status: item.status,
      partToReplace: isPresetPart ? item.partToReplace || '' : '__CUSTOM__',
      customPart: isPresetPart ? '' : item.partToReplace || '',
      serialNumber: item.serialNumber || '',
      testResult: item.testResult || '',
      lightBoxCalibrate: item.lightBoxCalibrate || 'NA',
      iAssureCalibrate: item.iAssureCalibrate || 'NA',
      prPoNo: item.prPoNo || '',
      estimatedCost: item.estimatedCost || 0,
      targetDate: item.targetDate || '',
      activatedDate: item.activatedDate || '',
      responsibleTech: item.responsibleTech || '',
      photo: item.photo || ''
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'form' | 'quick') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 960, 960, 0.72);
      if (target === 'form') {
        setFormState((prev) => (prev ? { ...prev, photo: compressed } : prev));
      } else {
        setQuickPhoto(compressed);
      }
    } catch {
      showToast('ไม่สามารถอัปโหลดรูปภาพได้ กรุณาลองไฟล์อื่น', 'error');
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState) return;
    if (!formState.machineName.trim()) {
      showToast('กรุณาระบุชื่อเครื่องจักร', 'error');
      return;
    }

    const resolvedPart =
      formState.partToReplace === '__CUSTOM__'
        ? formState.customPart.trim()
        : formState.partToReplace.trim();

    const payload: IAssureItem = {
      id: editingItem?.id || `ias-${Date.now()}`,
      orderNo: Number(formState.orderNo) || 1,
      machineName: formState.machineName.trim(),
      status: formState.status,
      partToReplace: resolvedPart,
      serialNumber: formState.serialNumber.trim(),
      testResult: formState.testResult.trim(),
      lightBoxCalibrate: formState.lightBoxCalibrate,
      iAssureCalibrate: formState.iAssureCalibrate,
      prPoNo: formState.prPoNo.trim() || undefined,
      estimatedCost: Math.max(0, Number(formState.estimatedCost) || 0),
      targetDate: formState.targetDate || undefined,
      activatedDate:
        formState.status === 'ACTIVE' ? formState.activatedDate || editingItem?.activatedDate || getTodayIso() : formState.activatedDate || undefined,
      responsibleTech: formState.responsibleTech.trim() || undefined,
      photo: formState.photo || undefined,
      updatedAt: new Date().toISOString()
    };

    if (editingItem) {
      setIAssureItems((prev) => prev.map((it) => (it.id === editingItem.id ? payload : it)));
      showToast(`อัปเดต "${payload.machineName}" เรียบร้อยแล้ว`);
    } else {
      setIAssureItems((prev) => [...prev, payload]);
      showToast(`เพิ่ม "${payload.machineName}" เข้าตารางติดตาม iAssure แล้ว`);
    }

    setFormState(null);
    setEditingItem(null);
  };

  // Open Quick Activate Modal
  const openQuickActivate = (item: IAssureItem) => {
    setQuickActivateItem(item);
    setQuickDate(getTodayIso());
    setQuickTech(item.responsibleTech || technicians[0] || '');
    setQuickNote(
      item.partToReplace
        ? `เปลี่ยน ${item.partToReplace} คาลิเบท Light box + iAssure ผ่าน และเปิดใช้งานปกติ`
        : 'คาลิเบท Light box + iAssure ผ่าน และเปิดใช้งานปกติ'
    );
    setQuickClearPart(true);
    setQuickPhoto(item.photo || '');
  };

  const handleConfirmQuickActivate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickActivateItem) return;

    setIAssureItems((prev) =>
      prev.map((it) =>
        it.id === quickActivateItem.id
          ? {
              ...it,
              status: 'ACTIVE',
              partToReplace: quickClearPart ? '' : it.partToReplace,
              lightBoxCalibrate: 'PASS',
              iAssureCalibrate: 'PASS',
              activatedDate: quickDate || getTodayIso(),
              responsibleTech: quickTech.trim() || it.responsibleTech,
              testResult: quickNote.trim()
                ? it.testResult
                  ? `${it.testResult}\n[${formatThaiDate(quickDate)}] ${quickNote.trim()}`
                  : quickNote.trim()
                : it.testResult,
              photo: quickPhoto || it.photo,
              updatedAt: new Date().toISOString()
            }
          : it
      )
    );
    showToast(`บันทึกเปิดใช้งาน iAssure เครื่อง "${quickActivateItem.machineName}" สำเร็จ`);
    setQuickActivateItem(null);
  };

  // Delete & Reset
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    setIAssureItems((prev) => prev.filter((it) => it.id !== deleteTarget.id));
    showToast(`ลบรายการ "${deleteTarget.machineName}" แล้ว`);
    setDeleteTarget(null);
  };

  const handleConfirmReset = () => {
    setIAssureItems(PRELOADED_IASSURE_ITEMS);
    setSearchQuery('');
    setStatusFilter('ALL');
    setPartFilter('ALL');
    setShowResetModal(false);
    showToast('รีเซ็ตข้อมูล iAssure กลับสู่ต้นฉบับ PDF (7 เครื่อง) เรียบร้อยแล้ว');
  };

  // Excel Export
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const summaryRows = [
      { หัวข้อ: 'เครื่องทั้งหมด (เครื่อง)', จำนวน: stats.total },
      { หัวข้อ: 'เปิดใช้งานแล้ว (เครื่อง)', จำนวน: `${stats.activeCount} (${stats.activePct}%)` },
      { หัวข้อ: 'เทสผ่าน แต่ยังไม่เปิดใช้งาน (เครื่อง)', จำนวน: `${stats.standbyCount} (${stats.standbyPct}%)` },
      { หัวข้อ: 'ไม่ผ่าน / รอแก้ไข (เครื่อง)', จำนวน: `${stats.failedCount} (${stats.failedPct}%)` },
      { หัวข้อ: 'รายการที่ต้องเปลี่ยนอุปกรณ์ (เครื่อง)', จำนวน: stats.needsPartCount },
      { หัวข้อ: 'จำนวน Light box ที่ต้องเปลี่ยน (ชุด)', จำนวน: stats.lightBoxCount }
    ];

    const detailRows = filteredItems.map((it) => ({
      'ลำดับ': it.orderNo,
      'เครื่อง': it.machineName,
      'สถานะ': IASSURE_STATUS_LABELS[it.status],
      'อุปกรณ์ที่ต้องเปลี่ยน': it.partToReplace || '-',
      'S/N': it.serialNumber || '-',
      'คาลิเบท Light box': CALIBRATION_LABELS[it.lightBoxCalibrate],
      'คาลิเบท iAssure': CALIBRATION_LABELS[it.iAssureCalibrate],
      'ผลการทดสอบ': it.testResult || '-',
      'เลข PR/PO': it.prPoNo || '-',
      'งบประมาณ (บาท)': it.estimatedCost || 0,
      'กำหนดเสร็จ QA': it.targetDate || '-',
      'วันที่เปิดใช้งานจริง': it.activatedDate || '-',
      'ผู้รับผิดชอบ': it.responsibleTech || '-'
    }));

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'สรุป_iAssure');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows), 'รายการ_iAssure_Videojet_6530');
    XLSX.writeFile(wb, `QA_iAssure_Videojet_6530_${getTodayIso()}.xlsx`);
    showToast('ส่งออกไฟล์ Excel iAssure Videojet 6530 เรียบร้อยแล้ว');
  };

  return (
    <div id="iassure-dashboard-root" className="space-y-4 pb-10">
      {/* Toast Banner */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-2xl text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/60 text-emerald-200'
              : 'bg-rose-950/95 border-rose-500/60 text-rose-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle size={16} className="text-rose-400 shrink-0" />
          )}
          <span>{toast.text}</span>
          <button type="button" onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header & Actions */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
            <Cpu size={20} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              Dashboard ติดตามความคืบหน้า iAssure Videojet 6530 (งาน QA)
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              ติดตามผลการคาลิเบท Light box / iAssure · สถานะเปิดใช้งาน · รายการอุปกรณ์ที่ต้องเปลี่ยน · ซิงค์ Cloud Firestore อัตโนมัติ
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <button
              type="button"
              id="btn-add-iassure-item"
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs shadow-lg transition cursor-pointer"
            >
              <Plus size={15} />
              <span>เพิ่มเครื่อง Videojet 6530</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition cursor-pointer"
          >
            <Download size={14} />
            <span>Export Excel</span>
          </button>

          {canDelete && (
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/50 border border-slate-700 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 font-semibold text-xs transition cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>รีเซ็ตค่าตั้งต้น PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* 5 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`text-left bg-slate-900/90 border rounded-2xl p-4 transition cursor-pointer ${
            statusFilter === 'ALL' ? 'border-cyan-500/60' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>เครื่องทั้งหมด (Videojet 6530)</span>
            <ShieldCheck size={16} className="text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{stats.total}</span>
            <span className="text-xs text-slate-400">เครื่อง</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            ผ่านการทดสอบรวม <span className="text-cyan-300 font-bold font-mono">{stats.passedTotalPct}%</span>
          </p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
          className={`text-left bg-slate-900/90 border rounded-2xl p-4 transition cursor-pointer ${
            statusFilter === 'ACTIVE' ? 'border-emerald-500' : 'border-emerald-500/30 hover:border-emerald-500/60'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400">
            <span>เปิดใช้งานแล้ว (Active)</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">{stats.activeCount}</span>
            <span className="text-xs font-mono font-bold text-emerald-300">{stats.activePct}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${stats.activePct}%` }} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'PASSED_STANDBY' ? 'ALL' : 'PASSED_STANDBY')}
          className={`text-left bg-slate-900/90 border rounded-2xl p-4 transition cursor-pointer ${
            statusFilter === 'PASSED_STANDBY' ? 'border-sky-500' : 'border-sky-500/30 hover:border-sky-500/60'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-sky-400">
            <span>เทสผ่าน (ยังไม่เปิดใช้งาน)</span>
            <Clock size={16} className="text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-sky-400 font-mono">{stats.standbyCount}</span>
            <span className="text-xs font-mono font-bold text-sky-300">{stats.standbyPct}%</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">พร้อมเปิดเมื่อเปลี่ยนอุปกรณ์เสร็จ</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'FAILED' ? 'ALL' : 'FAILED')}
          className={`text-left bg-slate-900/90 border rounded-2xl p-4 transition cursor-pointer ${
            statusFilter === 'FAILED' ? 'border-amber-500' : 'border-amber-500/30 hover:border-amber-500/60'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-400">
            <span>ไม่ผ่าน / รอแก้ไข</span>
            <AlertTriangle size={16} className="text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400 font-mono">{stats.failedCount}</span>
            <span className="text-xs font-mono font-bold text-amber-300">{stats.failedPct}%</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">คาลิเบทไม่ผ่าน ต้องเปลี่ยน/ตรวจเช็ค</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'NEEDS_PART' ? 'ALL' : 'NEEDS_PART')}
          className={`text-left bg-slate-900/90 border rounded-2xl p-4 transition cursor-pointer ${
            statusFilter === 'NEEDS_PART' ? 'border-rose-500' : 'border-rose-500/30 hover:border-rose-500/60'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-rose-400">
            <span>อุปกรณ์ที่ต้องเปลี่ยน</span>
            <Wrench size={16} className="text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{stats.needsPartCount}</span>
            <span className="text-xs text-slate-400">รายการ</span>
          </div>
          <p className="text-[11px] text-rose-300 mt-1.5 font-semibold">
            Light box: {stats.lightBoxCount} ชุด
            {stats.totalEstimatedCost > 0 ? ` · งบ ${stats.totalEstimatedCost.toLocaleString()} บ.` : ''}
          </p>
        </button>
      </div>

      {/* Charts Row: Status Donut + Calibration & Parts Summary */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left: Donut Chart + Status Summary Table */}
        <div className="xl:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-lg">
          <div>
            <h2 className="text-sm font-extrabold text-white">สัดส่วนความคืบหน้าการเปิดใช้งาน iAssure</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              อัปเดตอัตโนมัติตามสถานะเครื่องพิมพ์ Videojet 6530 ทั้งหมด ({stats.total} เครื่อง)
            </p>
          </div>

          <div className="relative h-52 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={82}
                  paddingAngle={3}
                  stroke="none"
                >
                  {donutData.map((entry, idx) => (
                    <Cell key={`ias-cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#f8fafc'
                  }}
                  formatter={(value: number, name: string) => [`${value} เครื่อง`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase">เปิดใช้งานแล้ว</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">{stats.activePct}%</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {stats.activeCount}/{stats.total} เครื่อง
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-center text-xs">
              <thead className="bg-slate-800/80 text-slate-300 font-bold">
                <tr>
                  <th className="py-2 px-2">ทั้งหมด</th>
                  <th className="py-2 px-2 text-emerald-400">เปิดใช้งาน</th>
                  <th className="py-2 px-2 text-sky-400">เทสผ่าน/รอเปิด</th>
                  <th className="py-2 px-2 text-amber-400">ไม่ผ่าน</th>
                  <th className="py-2 px-2 text-emerald-400">% เปิดใช้งาน</th>
                </tr>
              </thead>
              <tbody className="bg-slate-950/50 font-mono font-bold">
                <tr>
                  <td className="py-2 px-2 text-white">{stats.total}</td>
                  <td className="py-2 px-2 text-emerald-400">{stats.activeCount}</td>
                  <td className="py-2 px-2 text-sky-400">{stats.standbyCount}</td>
                  <td className="py-2 px-2 text-amber-400">{stats.failedCount}</td>
                  <td className="py-2 px-2 text-emerald-400">{stats.activePct}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Calibration Bar Chart + Replacement Parts List */}
        <div className="xl:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4 shadow-lg">
          <div>
            <h2 className="text-sm font-extrabold text-white">วิเคราะห์ผลคาลิเบท 2 ขั้นตอน &amp; สรุปอะไหล่ที่ต้องเปลี่ยน</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              แยกดูปัญหาที่ขั้นตอน คาลิเบท Light box เทียบกับ คาลิเบท iAssure และจำนวนอะไหล่ที่ต้องจัดซื้อ
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-7 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={calibrationChartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="stage" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '10px',
                      fontSize: '12px',
                      color: '#f8fafc'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="pass" name="ผ่าน (เครื่อง)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="fail" name="ไม่ผ่าน (เครื่อง)" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="pending" name="รอทดสอบ" fill="#64748b" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="md:col-span-5 space-y-2">
              <div className="text-xs font-bold text-slate-300">สรุปอะไหล่ที่ต้องเปลี่ยน (คลิกเพื่อกรอง)</div>
              {partsBreakdown.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-300 text-center">
                  ไม่มีรายการรอเปลี่ยนอุปกรณ์
                </div>
              ) : (
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {partsBreakdown.map((p) => {
                    const selected = partFilter === p.part;
                    return (
                      <button
                        key={p.part}
                        type="button"
                        onClick={() => setPartFilter(selected ? 'ALL' : p.part)}
                        className={`w-full text-left p-3 rounded-xl border transition cursor-pointer ${
                          selected
                            ? 'bg-cyan-500/15 border-cyan-500/60'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white text-xs">{p.part}</span>
                          <span className="font-mono font-extrabold text-rose-400 text-xs">{p.count} ชุด</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                          เครื่อง: {p.machines.join(', ')}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'ALL', label: `ทั้งหมด (${stats.total})` },
                { id: 'ACTIVE', label: `เปิดใช้งาน (${stats.activeCount})` },
                { id: 'PASSED_STANDBY', label: `เทสผ่าน รอเปิด (${stats.standbyCount})` },
                { id: 'FAILED', label: `ไม่ผ่าน (${stats.failedCount})` },
                { id: 'NEEDS_PART', label: `ต้องเปลี่ยนอุปกรณ์ (${stats.needsPartCount})` }
              ] as { id: StatusFilter; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-slate-950/60 text-slate-300 border border-slate-800 hover:border-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>แสดง {filteredItems.length} จาก {stats.total} เครื่อง</span>
            {(searchQuery || statusFilter !== 'ALL' || partFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setPartFilter('ALL');
                }}
                className="text-rose-300 hover:text-rose-200 font-semibold cursor-pointer"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="relative sm:col-span-2">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อเครื่อง, S/N, อุปกรณ์ที่ต้องเปลี่ยน, ผลการทดสอบ, เลข PR/PO..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-slate-400 shrink-0" />
            <select
              value={partFilter}
              onChange={(e) => setPartFilter(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
            >
              <option value="ALL">อุปกรณ์ที่ต้องเปลี่ยน: ทั้งหมด</option>
              {uniqueParts.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800/90 text-slate-300 font-bold border-b border-slate-700">
              <tr>
                <th className="py-3 px-3 text-center w-12">ลำดับ</th>
                <th className="py-3 px-3 whitespace-nowrap">เครื่อง</th>
                <th className="py-3 px-3 whitespace-nowrap">สถานะ</th>
                <th className="py-3 px-3 whitespace-nowrap">อุปกรณ์ที่ต้องเปลี่ยน / PR-PO</th>
                <th className="py-3 px-3 whitespace-nowrap">S/N</th>
                <th className="py-3 px-3 whitespace-nowrap">ผลคาลิเบท (LB / iAssure)</th>
                <th className="py-3 px-3 min-w-[280px]">ผลการทดสอบ &amp; แนวทางแก้ไข</th>
                <th className="py-3 px-3 whitespace-nowrap">วันที่ / ผู้รับผิดชอบ</th>
                <th className="py-3 px-2 text-center">รูป</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className={`transition ${
                      item.status === 'ACTIVE'
                        ? 'bg-emerald-950/10 hover:bg-emerald-950/20'
                        : item.status === 'PASSED_STANDBY'
                        ? 'bg-sky-950/10 hover:bg-sky-950/20'
                        : 'bg-amber-950/10 hover:bg-amber-950/20'
                    }`}
                  >
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-400 align-top">
                      {item.orderNo}
                    </td>

                    <td className="py-3 px-3 font-bold text-white whitespace-nowrap align-top">
                      {item.machineName}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap align-top">
                      <span
                        className={`font-extrabold ${
                          item.status === 'ACTIVE'
                            ? 'text-emerald-400'
                            : item.status === 'PASSED_STANDBY'
                            ? 'text-sky-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {IASSURE_STATUS_LABELS[item.status]}
                      </span>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap align-top">
                      {item.partToReplace ? (
                        <div className="font-bold text-rose-300">{item.partToReplace}</div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                      {item.prPoNo && (
                        <div className="text-[11px] font-mono text-cyan-300 mt-0.5">PR/PO: {item.prPoNo}</div>
                      )}
                      {item.estimatedCost ? (
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          งบ {item.estimatedCost.toLocaleString()} บ.
                        </div>
                      ) : null}
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-slate-300 max-w-[200px] break-words align-top">
                      {item.serialNumber || '-'}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap align-top text-[11px]">
                      <div>
                        <span className="text-slate-400">Light box: </span>
                        <span
                          className={`font-bold ${
                            item.lightBoxCalibrate === 'PASS'
                              ? 'text-emerald-400'
                              : item.lightBoxCalibrate === 'FAIL'
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {CALIBRATION_LABELS[item.lightBoxCalibrate]}
                        </span>
                      </div>
                      <div className="mt-0.5">
                        <span className="text-slate-400">iAssure: </span>
                        <span
                          className={`font-bold ${
                            item.iAssureCalibrate === 'PASS'
                              ? 'text-emerald-400'
                              : item.iAssureCalibrate === 'FAIL'
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {CALIBRATION_LABELS[item.iAssureCalibrate]}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-200 whitespace-pre-line leading-relaxed align-top">
                      {item.testResult || <span className="text-slate-500">-</span>}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap align-top text-[11px]">
                      {item.activatedDate && (
                        <div className="text-emerald-300 font-mono">เปิดใช้: {formatThaiDate(item.activatedDate)}</div>
                      )}
                      {item.targetDate && (
                        <div className="text-amber-300 font-mono">แผน QA: {formatThaiDate(item.targetDate)}</div>
                      )}
                      {item.responsibleTech && <div className="text-slate-300 mt-0.5">{item.responsibleTech}</div>}
                      {!item.activatedDate && !item.targetDate && !item.responsibleTech && (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    <td className="py-3 px-2 text-center align-top">
                      {item.photo ? (
                        <button
                          type="button"
                          onClick={() => setLightboxImage({ src: item.photo!, title: item.machineName })}
                          className="inline-flex w-8 h-8 rounded-lg overflow-hidden border border-cyan-500/40 hover:scale-110 transition cursor-pointer"
                          title="ดูรูปภาพ"
                        >
                          <img src={item.photo} alt={item.machineName} className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <span className="text-slate-600 inline-flex">
                          <ImageIcon size={14} />
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap align-top">
                      <div className="flex items-center justify-center gap-1">
                        {canEdit && item.status !== 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => openQuickActivate(item)}
                            className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/40 text-emerald-300 font-bold text-[11px] transition cursor-pointer"
                            title="บันทึกเปิดใช้งาน iAssure แล้ว"
                          >
                            เปิดใช้งาน
                          </button>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500/20 border border-slate-700 text-slate-300 hover:text-cyan-300 transition cursor-pointer"
                            title="แก้ไขรายละเอียด"
                          >
                            <Edit3 size={13} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 border border-slate-700 text-slate-400 hover:text-rose-300 transition cursor-pointer"
                            title="ลบรายการ"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {formState && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#0b1222] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 z-10 bg-[#0b1222] border-b border-slate-800 px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {editingItem ? `แก้ไขรายการ iAssure #${editingItem.orderNo}` : 'เพิ่มเครื่องติดตาม iAssure Videojet 6530'}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  ข้อมูลและกราฟความคืบหน้าจะอัปเดตทันทีและซิงค์ขึ้น Cloud Firestore
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormState(null);
                  setEditingItem(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">ลำดับ</label>
                  <input
                    type="number"
                    min={1}
                    value={formState.orderNo}
                    onChange={(e) => setFormState({ ...formState, orderNo: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-slate-400 font-semibold mb-1">ชื่อเครื่อง / ไลน์ผลิต *</label>
                  <input
                    type="text"
                    required
                    value={formState.machineName}
                    onChange={(e) => setFormState({ ...formState, machineName: e.target.value })}
                    placeholder="เช่น Ulma 1, เครื่องติดสติ๊กเกอร์ 2, เครื่อง Topseal"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">สถานะงาน QA</label>
                  <select
                    value={formState.status}
                    onChange={(e) => setFormState({ ...formState, status: e.target.value as IAssureStatus })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-semibold"
                  >
                    <option value="ACTIVE">เปิดใช้งาน</option>
                    <option value="PASSED_STANDBY">เทสผ่าน แต่ยังไม่เปิดใช้งาน</option>
                    <option value="FAILED">ไม่ผ่าน</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">คาลิเบท Light box</label>
                  <select
                    value={formState.lightBoxCalibrate}
                    onChange={(e) =>
                      setFormState({ ...formState, lightBoxCalibrate: e.target.value as CalibrationResult })
                    }
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  >
                    <option value="PASS">ผ่าน</option>
                    <option value="FAIL">ไม่ผ่าน</option>
                    <option value="PENDING">รอทดสอบ</option>
                    <option value="NA">ไม่ระบุ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">คาลิเบท iAssure</label>
                  <select
                    value={formState.iAssureCalibrate}
                    onChange={(e) =>
                      setFormState({ ...formState, iAssureCalibrate: e.target.value as CalibrationResult })
                    }
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  >
                    <option value="PASS">ผ่าน</option>
                    <option value="FAIL">ไม่ผ่าน</option>
                    <option value="PENDING">รอทดสอบ</option>
                    <option value="NA">ไม่ระบุ</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">อุปกรณ์ที่ต้องเปลี่ยน</label>
                  <select
                    value={formState.partToReplace}
                    onChange={(e) => setFormState({ ...formState, partToReplace: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  >
                    <option value="">-- ไม่มี / ไม่ต้องเปลี่ยน --</option>
                    {IASSURE_COMMON_PARTS.filter(Boolean).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                    <option value="__CUSTOM__">ระบุอุปกรณ์อื่น...</option>
                  </select>
                  {formState.partToReplace === '__CUSTOM__' && (
                    <input
                      type="text"
                      value={formState.customPart}
                      onChange={(e) => setFormState({ ...formState, customPart: e.target.value })}
                      placeholder="ระบุชื่ออุปกรณ์ที่ต้องเปลี่ยน"
                      className="mt-1.5 w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-cyan-500/40 text-white"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Serial Number (S/N)</label>
                  <input
                    type="text"
                    value={formState.serialNumber}
                    onChange={(e) => setFormState({ ...formState, serialNumber: e.target.value })}
                    placeholder="เช่น S/n 2028810037TZH"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">เลข PR / PO สั่งซื้ออะไหล่</label>
                  <input
                    type="text"
                    value={formState.prPoNo}
                    onChange={(e) => setFormState({ ...formState, prPoNo: e.target.value })}
                    placeholder="เช่น PO 4053xxxxx"
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">งบประมาณอะไหล่ (บาท)</label>
                  <input
                    type="number"
                    min={0}
                    value={formState.estimatedCost}
                    onChange={(e) => setFormState({ ...formState, estimatedCost: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">ผู้รับผิดชอบ</label>
                  <input
                    type="text"
                    list="iassure-tech-list"
                    value={formState.responsibleTech}
                    onChange={(e) => setFormState({ ...formState, responsibleTech: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                  <datalist id="iassure-tech-list">
                    {technicians.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">กำหนดเสร็จตามแผน QA</label>
                  <input
                    type="date"
                    value={formState.targetDate}
                    onChange={(e) => setFormState({ ...formState, targetDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">วันที่เปิดใช้งานจริง</label>
                  <input
                    type="date"
                    value={formState.activatedDate}
                    onChange={(e) => setFormState({ ...formState, activatedDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">ผลการทดสอบ / รายละเอียดการตรวจเช็ค</label>
                <textarea
                  rows={4}
                  value={formState.testResult}
                  onChange={(e) => setFormState({ ...formState, testResult: e.target.value })}
                  placeholder="บันทึกรายละเอียดการ reset, คาลิเบท, ปรับค่าหัวพิมพ์ หรือผลการแก้ไข..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                />
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Camera size={14} className="text-cyan-400" />
                    รูปถ่ายหน้าจอคาลิเบท / อุปกรณ์หน้างาน
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 font-bold cursor-pointer">
                      อัปโหลดรูปภาพ
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoUpload(e, 'form')}
                        className="hidden"
                      />
                    </label>
                    {formState.photo && (
                      <button
                        type="button"
                        onClick={() => setFormState({ ...formState, photo: '' })}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 font-semibold cursor-pointer"
                      >
                        ลบรูป
                      </button>
                    )}
                  </div>
                </div>
                {formState.photo && (
                  <img
                    src={formState.photo}
                    alt="Preview"
                    className="mt-3 max-h-40 rounded-xl border border-slate-700 object-contain"
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setFormState(null);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold cursor-pointer"
                >
                  {editingItem ? 'บันทึกการแก้ไข' : 'เพิ่มรายการ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Activate Modal */}
      {quickActivateItem && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1222] border border-emerald-500/40 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-emerald-950/20">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-400" />
                <h3 className="text-sm font-extrabold text-white">บันทึกเปิดใช้งาน iAssure แล้ว</h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickActivateItem(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmQuickActivate} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <p className="font-bold text-white text-sm">{quickActivateItem.machineName}</p>
                {quickActivateItem.serialNumber && (
                  <p className="text-[11px] font-mono text-cyan-400 mt-0.5">{quickActivateItem.serialNumber}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">วันที่เปิดใช้งานจริง</label>
                  <input
                    type="date"
                    required
                    value={quickDate}
                    onChange={(e) => setQuickDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">ผู้ดำเนินการ</label>
                  <input
                    type="text"
                    list="iassure-quick-tech-list"
                    value={quickTech}
                    onChange={(e) => setQuickTech(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                  <datalist id="iassure-quick-tech-list">
                    {technicians.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">บันทึกผลหลังแก้ไข</label>
                <textarea
                  rows={2}
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                />
              </div>

              {quickActivateItem.partToReplace && (
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quickClearPart}
                    onChange={(e) => setQuickClearPart(e.target.checked)}
                  />
                  <span>ล้างรายการ "{quickActivateItem.partToReplace}" ออก (เปลี่ยนเสร็จแล้ว)</span>
                </label>
              )}

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold cursor-pointer">
                  <Camera size={14} />
                  <span>{quickPhoto ? 'เปลี่ยนรูปถ่าย' : 'แนบรูปผลคาลิเบท'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e, 'quick')}
                    className="hidden"
                  />
                </label>
                {quickPhoto && (
                  <img src={quickPhoto} alt="Preview" className="h-10 w-10 rounded-lg object-cover border border-slate-700" />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuickActivateItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold cursor-pointer"
                >
                  ยืนยันเปิดใช้งาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1222] border border-rose-500/40 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400">
              <Trash2 size={20} />
              <h3 className="text-base font-extrabold text-white">ยืนยันการลบรายการ</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              ต้องการลบเครื่อง <strong className="text-white">"{deleteTarget.machineName}"</strong> ออกจากตารางติดตาม iAssure ใช่หรือไม่?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold cursor-pointer"
              >
                ยืนยันลบรายการ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset to PDF Baseline Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1222] border border-amber-500/40 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-400">
              <RotateCcw size={20} />
              <h3 className="text-base font-extrabold text-white">รีเซ็ตข้อมูล iAssure กลับสู่ต้นฉบับ PDF</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              ระบบจะคืนค่าข้อมูลทั้งหมดเป็น 7 เครื่อง (เปิดใช้งาน 3 / เทสผ่านรอเปิด 1 / ไม่ผ่าน 3 / Light box 4 ชุด) ตามไฟล์ PDF ต้นฉบับ ยืนยันหรือไม่?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold cursor-pointer"
              >
                ยืนยันรีเซ็ตข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl p-3 max-w-2xl w-full space-y-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-white">{lightboxImage.title}</span>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>
            <img
              src={lightboxImage.src}
              alt={lightboxImage.title}
              className="w-full max-h-[75vh] object-contain rounded-xl bg-slate-950"
            />
          </div>
        </div>
      )}
    </div>
  );
};
