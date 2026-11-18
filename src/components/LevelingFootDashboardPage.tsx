import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  BarChart
} from 'recharts';
import {
  Plus,
  Search,
  Download,
  RotateCcw,
  CheckCircle2,
  Clock,
  Ban,
  Wrench,
  Edit3,
  Trash2,
  Camera,
  X,
  Filter,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Calculator,
  CalendarCheck,
  AlertCircle,
  Layers,
  Banknote,
  SlidersHorizontal
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  LevelingFootItem,
  LevelingFootRowType,
  LevelingFootStatus,
  LEVELING_FOOT_SIZE_OPTIONS,
  LEVELING_FOOT_THAI_MONTHS
} from '../types/levelingFoot';
import { PRELOADED_LEVELING_FOOT_ITEMS } from '../data/preloadedLevelingFoot';
import { compressImageFile } from '../utils/imageUtils';

type StatusFilterOption = 'ALL' | 'TARGET_ONLY' | 'COMPLETED' | 'PENDING' | 'EXCLUDED';

const SHORT_ENG_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const DEFAULT_BASELINE_START_YM = '2026-05';
const DEFAULT_BASELINE_END_YM = '2027-11';

function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatYearMonthLabel(ym: string): string {
  const [yStr, mStr] = ym.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  if (!y || !m || m < 1 || m > 12) return ym;
  return `${SHORT_ENG_MONTHS[m - 1]}-${String(y).slice(-2)}`;
}

function formatThaiDisplayDate(isoDate: string): string {
  if (!isoDate) return '-';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return isoDate;
  const yearBeShort = String(Number(match[1]) + 543).slice(-2);
  const monthIdx = Number(match[2]);
  const day = Number(match[3]);
  const monthLabel = LEVELING_FOOT_THAI_MONTHS[monthIdx] || match[2];
  return `${day} ${monthLabel} ${yearBeShort}`;
}

function generateYearMonthSequence(startYm: string, endYm: string): string[] {
  const [sy, sm] = startYm.split('-').map(Number);
  const [ey, em] = endYm.split('-').map(Number);
  if (!sy || !sm || !ey || !em) return [];
  const result: string[] = [];
  let cy = sy;
  let cm = sm;
  let guard = 0;
  while ((cy < ey || (cy === ey && cm <= em)) && guard < 120) {
    result.push(`${cy}-${String(cm).padStart(2, '0')}`);
    cm += 1;
    if (cm > 12) {
      cm = 1;
      cy += 1;
    }
    guard += 1;
  }
  return result;
}

function getRowTypeLabel(rowType: LevelingFootRowType): string {
  switch (rowType) {
    case 'ITEM': return 'เครื่องเป้าหมาย';
    case 'CANNOT_REPLACE': return 'เปลี่ยนไม่ได้';
    case 'SOLID_FOOT': return 'ขาตัน';
    case 'NO_BELT': return 'ไม่มีสายพาน';
    default: return rowType;
  }
}

interface FormState {
  id?: string;
  orderNo: number;
  zone: string;
  area: string;
  lineGroup: string;
  machineName: string;
  rowType: LevelingFootRowType;
  footType: string;
  sizeCode: string;
  customSizeCode: string;
  footCount: number;
  canImprove: boolean;
  qaPlanMonth: string;
  completedDate: string;
  note: string;
  status: LevelingFootStatus;
  unitPrice: number;
  totalCost: number;
  autoCalcTotal: boolean;
  photo: string;
}

export const LevelingFootDashboardPage: React.FC = () => {
  const { levelingFootItems, setLevelingFootItems, canEdit, canDelete, currentUser } = useApp();

  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [zoneFilter, setZoneFilter] = useState<string>('ALL');
  const [areaFilter, setAreaFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>('ALL');
  const [qaMonthFilter, setQaMonthFilter] = useState<string>('ALL');
  const [sizeFilter, setSizeFilter] = useState<string>('ALL');

  // UI states
  const [showMonthlyTable, setShowMonthlyTable] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; title: string } | null>(null);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<LevelingFootItem | null>(null);
  const [formState, setFormState] = useState<FormState | null>(null);

  const [quickCompleteItem, setQuickCompleteItem] = useState<LevelingFootItem | null>(null);
  const [quickDate, setQuickDate] = useState<string>(getTodayIsoDate());
  const [quickFootCount, setQuickFootCount] = useState<number>(4);
  const [quickUnitPrice, setQuickUnitPrice] = useState<number>(280);
  const [quickNote, setQuickNote] = useState<string>('เปลี่ยนแล้ว');
  const [quickPhoto, setQuickPhoto] = useState<string>('');

  const [deleteTarget, setDeleteTarget] = useState<LevelingFootItem | null>(null);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    window.setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 3600);
  };

  // Unique filter option lists derived dynamically
  const filterOptions = useMemo(() => {
    const zones = Array.from(new Set(levelingFootItems.map((i) => i.zone).filter(Boolean)));
    const areas = Array.from(new Set(levelingFootItems.map((i) => i.area).filter(Boolean)));
    const qaMonths = Array.from(new Set(levelingFootItems.map((i) => i.qaPlanMonth).filter(Boolean)));
    const sizes = Array.from(new Set(levelingFootItems.map((i) => i.sizeCode || '-')));
    return { zones, areas, qaMonths, sizes };
  }, [levelingFootItems]);

  // Core KPI metrics computed strictly from target machines (rowType === 'ITEM')
  const stats = useMemo(() => {
    const targetItems = levelingFootItems.filter((item) => item.rowType === 'ITEM');
    const excludedItems = levelingFootItems.filter((item) => item.rowType !== 'ITEM');

    const totalMachines = targetItems.length;
    const completedItems = targetItems.filter((item) => item.status === 'COMPLETED');
    const pendingItems = targetItems.filter((item) => item.status !== 'COMPLETED');

    const completedCount = completedItems.length;
    const pendingCount = pendingItems.length;
    const completedPct = totalMachines > 0 ? Math.round((completedCount / totalMachines) * 100) : 0;
    const pendingPct = totalMachines > 0 ? Math.max(0, 100 - completedPct) : 0;

    const totalLegs = targetItems.reduce((sum, item) => sum + (Number(item.footCount) || 0), 0);
    const completedLegs = completedItems.reduce((sum, item) => sum + (Number(item.footCount) || 0), 0);
    const pendingLegs = Math.max(0, totalLegs - completedLegs);
    const completedLegsPct = totalLegs > 0 ? Math.round((completedLegs / totalLegs) * 100) : 0;

    const actualSpentCost = completedItems.reduce((sum, item) => {
      const explicitCost = Number(item.totalCost) || 0;
      if (explicitCost > 0) return sum + explicitCost;
      return sum + (Number(item.footCount) || 0) * (Number(item.unitPrice) || 280);
    }, 0);

    const estimatedRemainingCost = pendingItems.reduce((sum, item) => {
      const unit = Number(item.unitPrice) > 0 ? Number(item.unitPrice) : 280;
      return sum + (Number(item.footCount) || 0) * unit;
    }, 0);

    const totalEstimatedBudget = actualSpentCost + estimatedRemainingCost;

    return {
      totalRows: levelingFootItems.length,
      totalMachines,
      completedCount,
      pendingCount,
      completedPct,
      pendingPct,
      excludedCount: excludedItems.length,
      cannotReplaceCount: excludedItems.filter((i) => i.rowType === 'CANNOT_REPLACE').length,
      solidFootCount: excludedItems.filter((i) => i.rowType === 'SOLID_FOOT').length,
      noBeltCount: excludedItems.filter((i) => i.rowType === 'NO_BELT').length,
      totalLegs,
      completedLegs,
      pendingLegs,
      completedLegsPct,
      actualSpentCost,
      estimatedRemainingCost,
      totalEstimatedBudget
    };
  }, [levelingFootItems]);

  // Donut Chart Data
  const donutData = useMemo(
    () => [
      { name: 'แก้ไขแล้ว (% แล้วเสร็จ)', value: stats.completedCount, pct: stats.completedPct, color: '#10b981' },
      { name: 'คงเหลือ (% ยังไม่แก้ไข)', value: stats.pendingCount, pct: stats.pendingPct, color: '#f43f5e' }
    ],
    [stats]
  );

  // Monthly Combo Chart Data (May-26 .. Nov-27 + auto-expand if dates fall outside)
  const monthlyComboData = useMemo(() => {
    const targetItems = levelingFootItems.filter((item) => item.rowType === 'ITEM');
    const totalTarget = targetItems.length;

    const monthCounts: Record<string, number> = {};
    let minYm = DEFAULT_BASELINE_START_YM;
    let maxYm = DEFAULT_BASELINE_END_YM;

    targetItems.forEach((item) => {
      if (item.status === 'COMPLETED' && item.completedDate) {
        const match = /^(\d{4}-\d{2})/.exec(item.completedDate.trim());
        if (match) {
          const ym = match[1];
          monthCounts[ym] = (monthCounts[ym] || 0) + 1;
          if (ym < minYm) minYm = ym;
          if (ym > maxYm) maxYm = ym;
        }
      }
    });

    const sequence = generateYearMonthSequence(minYm, maxYm);
    let cumulative = 0;

    return sequence.map((ym) => {
      const monthlyDone = monthCounts[ym] || 0;
      cumulative += monthlyDone;
      const cumulativePct = totalTarget > 0 ? Math.round((cumulative / totalTarget) * 100) : 0;
      return {
        ym,
        label: formatYearMonthLabel(ym),
        monthlyDone,
        cumulativeDone: cumulative,
        cumulativePct
      };
    });
  }, [levelingFootItems]);

  // Room / Area breakdown for target items
  const areaBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { area: string; total: number; completed: number; pending: number; totalLegs: number; completedLegs: number }
    >();

    levelingFootItems
      .filter((item) => item.rowType === 'ITEM')
      .forEach((item) => {
        const key = item.area || 'ไม่ระบุห้อง';
        const existing = map.get(key) || {
          area: key,
          total: 0,
          completed: 0,
          pending: 0,
          totalLegs: 0,
          completedLegs: 0
        };
        existing.total += 1;
        const legs = Number(item.footCount) || 0;
        existing.totalLegs += legs;
        if (item.status === 'COMPLETED') {
          existing.completed += 1;
          existing.completedLegs += legs;
        } else {
          existing.pending += 1;
        }
        map.set(key, existing);
      });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [levelingFootItems]);

  // Size Code procurement breakdown (for target items)
  const sizeBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        sizeCode: string;
        machineCount: number;
        totalLegs: number;
        replacedLegs: number;
        remainingLegs: number;
        estimatedRemainingCost: number;
      }
    >();

    levelingFootItems
      .filter((item) => item.rowType === 'ITEM')
      .forEach((item) => {
        const key = item.sizeCode && item.sizeCode.trim() ? item.sizeCode.trim() : '-';
        const existing = map.get(key) || {
          sizeCode: key,
          machineCount: 0,
          totalLegs: 0,
          replacedLegs: 0,
          remainingLegs: 0,
          estimatedRemainingCost: 0
        };
        const legs = Number(item.footCount) || 0;
        const unit = Number(item.unitPrice) > 0 ? Number(item.unitPrice) : 280;
        existing.machineCount += 1;
        existing.totalLegs += legs;
        if (item.status === 'COMPLETED') {
          existing.replacedLegs += legs;
        } else {
          existing.remainingLegs += legs;
          existing.estimatedRemainingCost += legs * unit;
        }
        map.set(key, existing);
      });

    return Array.from(map.values()).sort((a, b) => {
      if (a.sizeCode === '-' && b.sizeCode !== '-') return 1;
      if (b.sizeCode === '-' && a.sizeCode !== '-') return -1;
      return b.totalLegs - a.totalLegs;
    });
  }, [levelingFootItems]);

  // Filtered table items
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return levelingFootItems
      .filter((item) => {
        if (zoneFilter !== 'ALL' && item.zone !== zoneFilter) return false;
        if (areaFilter !== 'ALL' && item.area !== areaFilter) return false;
        if (qaMonthFilter !== 'ALL' && (item.qaPlanMonth || '-') !== qaMonthFilter) return false;
        if (sizeFilter !== 'ALL' && (item.sizeCode || '-') !== sizeFilter) return false;

        if (statusFilter === 'TARGET_ONLY' && item.rowType !== 'ITEM') return false;
        if (statusFilter === 'COMPLETED' && !(item.rowType === 'ITEM' && item.status === 'COMPLETED')) return false;
        if (statusFilter === 'PENDING' && !(item.rowType === 'ITEM' && item.status !== 'COMPLETED')) return false;
        if (statusFilter === 'EXCLUDED' && item.rowType === 'ITEM') return false;

        if (q) {
          const hay = [
            item.orderNo,
            item.zone,
            item.area,
            item.lineGroup || '',
            item.machineName,
            item.footType,
            item.sizeCode,
            item.qaPlanMonth,
            item.completedDate,
            item.note,
            getRowTypeLabel(item.rowType)
          ]
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => a.orderNo - b.orderNo);
  }, [levelingFootItems, searchQuery, zoneFilter, areaFilter, statusFilter, qaMonthFilter, sizeFilter]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    zoneFilter !== 'ALL' ||
    areaFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    qaMonthFilter !== 'ALL' ||
    sizeFilter !== 'ALL';

  const clearAllFilters = () => {
    setSearchQuery('');
    setZoneFilter('ALL');
    setAreaFilter('ALL');
    setStatusFilter('ALL');
    setQaMonthFilter('ALL');
    setSizeFilter('ALL');
  };

  // Open Add Modal
  const openAddModal = () => {
    const nextOrder = levelingFootItems.reduce((max, item) => Math.max(max, item.orderNo || 0), 0) + 1;
    setEditingItem(null);
    setFormState({
      orderNo: nextOrder,
      zone: 'High case',
      area: filterOptions.areas[0] || 'ห้องขึ้นรูปข้าวกล่อง',
      lineGroup: '',
      machineName: '',
      rowType: 'ITEM',
      footType: 'แบบกลวง',
      sizeCode: 'M20x250',
      customSizeCode: '',
      footCount: 4,
      canImprove: true,
      qaPlanMonth: '',
      completedDate: '',
      note: '',
      status: 'PENDING',
      unitPrice: 280,
      totalCost: 0,
      autoCalcTotal: true,
      photo: ''
    });
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (item: LevelingFootItem) => {
    const isPresetSize = (LEVELING_FOOT_SIZE_OPTIONS as readonly string[]).includes(item.sizeCode || '-');
    setEditingItem(item);
    setFormState({
      id: item.id,
      orderNo: item.orderNo,
      zone: item.zone,
      area: item.area,
      lineGroup: item.lineGroup || '',
      machineName: item.machineName,
      rowType: item.rowType,
      footType: item.footType || 'แบบกลวง',
      sizeCode: isPresetSize ? item.sizeCode || '-' : '__CUSTOM__',
      customSizeCode: isPresetSize ? '' : item.sizeCode || '',
      footCount: item.footCount,
      canImprove: item.canImprove,
      qaPlanMonth: item.qaPlanMonth || '',
      completedDate: item.completedDate || '',
      note: item.note || '',
      status: item.status,
      unitPrice: item.unitPrice,
      totalCost: item.totalCost,
      autoCalcTotal: true,
      photo: item.photo || ''
    });
    setIsFormModalOpen(true);
  };

  const handleFormFieldChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormState((prev) => {
      if (!prev) return prev;
      const next: FormState = { ...prev, [field]: value };

      if (field === 'rowType') {
        const rt = value as LevelingFootRowType;
        if (rt !== 'ITEM') {
          next.canImprove = false;
          next.status = 'CANNOT_REPLACE';
          next.unitPrice = 0;
          next.totalCost = 0;
          if (!next.note) {
            next.note = rt === 'CANNOT_REPLACE' ? 'เปลี่ยนไม่ได้' : rt === 'SOLID_FOOT' ? 'ขาตัน' : 'ไม่มีสายพาน';
          }
        } else {
          next.canImprove = true;
          if (next.status === 'CANNOT_REPLACE') next.status = 'PENDING';
          if (next.unitPrice === 0) next.unitPrice = 280;
        }
      }

      if (field === 'status') {
        const st = value as LevelingFootStatus;
        if (st === 'COMPLETED' && !next.completedDate) {
          next.completedDate = getTodayIsoDate();
        }
        if (st === 'PENDING') {
          next.completedDate = '';
        }
      }

      if (next.autoCalcTotal) {
        if (next.status === 'COMPLETED' && next.rowType === 'ITEM') {
          next.totalCost = (Number(next.footCount) || 0) * (Number(next.unitPrice) || 0);
        } else {
          next.totalCost = 0;
        }
      }

      return next;
    });
  };

  const handleFormPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 960, 960, 0.72);
      setFormState((prev) => (prev ? { ...prev, photo: compressed } : prev));
    } catch {
      showToast('ไม่สามารถอัปโหลดรูปภาพได้ กรุณาลองไฟล์อื่น', 'error');
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState) return;
    if (!formState.machineName.trim()) {
      showToast('กรุณาระบุชื่อรายการเครื่องจักร', 'error');
      return;
    }

    const resolvedSize =
      formState.sizeCode === '__CUSTOM__'
        ? formState.customSizeCode.trim() || '-'
        : formState.sizeCode || '-';

    const finalStatus: LevelingFootStatus =
      formState.rowType !== 'ITEM' ? 'CANNOT_REPLACE' : formState.status;

    const computedCost =
      finalStatus === 'COMPLETED'
        ? formState.autoCalcTotal
          ? (Number(formState.footCount) || 0) * (Number(formState.unitPrice) || 0)
          : Number(formState.totalCost) || 0
        : 0;

    const payload: LevelingFootItem = {
      id: editingItem?.id || `lf-${Date.now()}`,
      orderNo: Number(formState.orderNo) || 1,
      zone: formState.zone.trim() || 'High case',
      area: formState.area.trim() || '-',
      lineGroup: formState.lineGroup.trim(),
      machineName: formState.machineName.trim(),
      rowType: formState.rowType,
      footType: formState.footType.trim() || 'แบบกลวง',
      sizeCode: resolvedSize,
      footCount: Math.max(0, Number(formState.footCount) || 0),
      canImprove: formState.rowType === 'ITEM' ? formState.canImprove : false,
      qaPlanMonth: formState.qaPlanMonth.trim(),
      completedDate: finalStatus === 'COMPLETED' ? formState.completedDate || getTodayIsoDate() : '',
      note: formState.note.trim(),
      status: finalStatus,
      unitPrice: Math.max(0, Number(formState.unitPrice) || 0),
      totalCost: computedCost,
      photo: formState.photo || undefined,
      updatedAt: new Date().toISOString()
    };

    if (editingItem) {
      setLevelingFootItems((prev) => prev.map((it) => (it.id === editingItem.id ? payload : it)));
      showToast(`อัปเดต "${payload.machineName}" เรียบร้อยแล้ว`);
    } else {
      setLevelingFootItems((prev) => [...prev, payload]);
      showToast(`เพิ่ม "${payload.machineName}" เข้า Dashboard เรียบร้อยแล้ว`);
    }

    setIsFormModalOpen(false);
    setEditingItem(null);
    setFormState(null);
  };

  // Quick 1-click Complete
  const openQuickComplete = (item: LevelingFootItem) => {
    setQuickCompleteItem(item);
    setQuickDate(getTodayIsoDate());
    setQuickFootCount(item.footCount > 0 ? item.footCount : 4);
    setQuickUnitPrice(item.unitPrice > 0 ? item.unitPrice : 280);
    setQuickNote(item.note && item.note !== '' ? item.note : 'เปลี่ยนแล้ว');
    setQuickPhoto(item.photo || '');
  };

  const handleQuickPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 960, 960, 0.72);
      setQuickPhoto(compressed);
    } catch {
      showToast('ไม่สามารถอัปโหลดรูปภาพได้', 'error');
    }
  };

  const handleConfirmQuickComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCompleteItem) return;
    const count = Math.max(0, Number(quickFootCount) || 0);
    const price = Math.max(0, Number(quickUnitPrice) || 0);
    const total = count * price;

    setLevelingFootItems((prev) =>
      prev.map((it) =>
        it.id === quickCompleteItem.id
          ? {
              ...it,
              status: 'COMPLETED',
              footCount: count,
              unitPrice: price,
              totalCost: total,
              completedDate: quickDate || getTodayIsoDate(),
              note: quickNote.trim() || 'เปลี่ยนแล้ว',
              photo: quickPhoto || it.photo,
              updatedAt: new Date().toISOString()
            }
          : it
      )
    );
    showToast(`บันทึกเปลี่ยนขาฉิ่ง "${quickCompleteItem.machineName}" สำเร็จ (${total.toLocaleString()} บ.)`);
    setQuickCompleteItem(null);
  };

  // Delete handler
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    setLevelingFootItems((prev) => prev.filter((it) => it.id !== deleteTarget.id));
    showToast(`ลบรายการ "${deleteTarget.machineName}" แล้ว`);
    setDeleteTarget(null);
  };

  // Reset to PDF baseline
  const handleConfirmReset = () => {
    setLevelingFootItems(PRELOADED_LEVELING_FOOT_ITEMS);
    clearAllFilters();
    setShowResetModal(false);
    showToast('รีเซ็ตข้อมูลกลับสู่ค่าตั้งต้นจากเอกสาร PDF (49 รายการ / เป้าหมาย 36 เครื่อง) เรียบร้อย');
  };

  // Excel Export
  const handleExportExcel = () => {
    const exportRows = filteredItems.map((item) => ({
      'ลำดับ': item.orderNo,
      'Zone': item.zone,
      'พื้นที่ / ห้อง': item.area,
      'กลุ่มไลน์': item.lineGroup || '',
      'รายการเครื่องจักร': item.machineName,
      'ประเภท': getRowTypeLabel(item.rowType),
      'ลักษณะขาฉิ่ง': item.footType,
      'เบอร์ขาฉิ่ง': item.sizeCode,
      'จำนวนขา': item.footCount,
      'แพลน QA': item.qaPlanMonth || '-',
      'วันที่แล้วเสร็จจริง': item.completedDate || '-',
      'หมายเหตุ': item.note || '',
      'สถานะ':
        item.status === 'COMPLETED' ? 'OK (แล้วเสร็จ)' : item.status === 'PENDING' ? 'ยังไม่แก้ไข' : 'เปลี่ยนไม่ได้',
      'ราคาต่อชิ้น (บาท)': item.unitPrice,
      'ราคารวม (บาท)': item.totalCost
    }));

    const summaryRows = [
      { หัวข้อ: 'เครื่องเป้าหมายทั้งหมด (รายการ)', จำนวน: stats.totalMachines },
      { หัวข้อ: 'แก้ไขแล้ว (รายการ)', จำนวน: stats.completedCount },
      { หัวข้อ: 'คงเหลือ (รายการ)', จำนวน: stats.pendingCount },
      { หัวข้อ: '% แล้วเสร็จ', จำนวน: `${stats.completedPct}%` },
      { หัวข้อ: '% ยังไม่แก้ไข', จำนวน: `${stats.pendingPct}%` },
      { หัวข้อ: 'จำนวนขาฉิ่งทั้งหมด (ขา)', จำนวน: stats.totalLegs },
      { หัวข้อ: 'ขาที่เปลี่ยนแล้ว (ขา)', จำนวน: stats.completedLegs },
      { หัวข้อ: 'ขาคงเหลือ (ขา)', จำนวน: stats.pendingLegs },
      { หัวข้อ: 'ค่าใช้จ่ายดำเนินการแล้ว (บาท)', จำนวน: stats.actualSpentCost },
      { หัวข้อ: 'งบประมาณประมาณการคงเหลือ (บาท)', จำนวน: stats.estimatedRemainingCost }
    ];

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    const wsItems = XLSX.utils.json_to_sheet(exportRows);
    const wsSizes = XLSX.utils.json_to_sheet(
      sizeBreakdown.map((s) => ({
        'เบอร์ขาฉิ่ง': s.sizeCode,
        'จำนวนเครื่อง': s.machineCount,
        'จำนวนขารวม': s.totalLegs,
        'เปลี่ยนแล้ว (ขา)': s.replacedLegs,
        'คงเหลือ (ขา)': s.remainingLegs,
        'งบประมาณคงเหลือ (บาท)': s.estimatedRemainingCost
      }))
    );

    XLSX.utils.book_append_sheet(wb, wsSummary, 'สรุปภาพรวม');
    XLSX.utils.book_append_sheet(wb, wsItems, 'รายการสำรวจขาฉิ่ง');
    XLSX.utils.book_append_sheet(wb, wsSizes, 'สรุปตามเบอร์ขาฉิ่ง');
    XLSX.writeFile(wb, `Leveling_Foot_HighCase_${getTodayIsoDate()}.xlsx`);
    showToast('ส่งออกไฟล์ Excel (.xlsx) เรียบร้อยแล้ว');
  };

  return (
    <div id="leveling-foot-dashboard-root" className="space-y-4 pb-10">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-2xl text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/60 text-emerald-200'
              : 'bg-rose-950/95 border-rose-500/60 text-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 shadow-lg">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <SlidersHorizontal size={20} />
            </span>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                Dashboard สำรวจและแผนเปลี่ยนขาฉิ่ง (ฝั่ง High case)
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                ติดตามความคืบหน้าการเปลี่ยนขาฉิ่งแบบกลวง • สรุปจำนวนขาตามเบอร์ • กราฟอัปเดตอัตโนมัติ &amp; ซิงค์ Cloud Firestore
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <button
              type="button"
              id="btn-add-leveling-foot"
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/15 transition cursor-pointer"
            >
              <Plus size={15} />
              <span>เพิ่มรายการเครื่องจักร / ขาฉิ่ง</span>
            </button>
          )}

          <button
            type="button"
            id="btn-export-leveling-foot-excel"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition cursor-pointer"
          >
            <Download size={14} />
            <span>Export Excel</span>
          </button>

          {canDelete && (
            <button
              type="button"
              id="btn-reset-leveling-foot"
              onClick={() => setShowResetModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/50 border border-slate-700 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 font-semibold text-xs transition cursor-pointer"
              title="รีเซ็ตข้อมูลกลับสู่ค่าตั้งต้นจากไฟล์ PDF"
            >
              <RotateCcw size={14} />
              <span>รีเซ็ตค่าตั้งต้น PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {/* Card 1: Target Machines */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">เครื่องเป้าหมายปรับปรุง</span>
            <Layers size={16} className="text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{stats.totalMachines}</span>
            <span className="text-xs text-slate-400">รายการ</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            ข้อมูลทั้งหมด {stats.totalRows} แถว (ยกเว้น {stats.excludedCount} แถว)
          </p>
        </div>

        {/* Card 2: Completed */}
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">แก้ไขแล้ว (OK)</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">{stats.completedCount}</span>
            <span className="text-xs font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md font-mono">
              {stats.completedPct}%
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${stats.completedPct}%` }}
            />
          </div>
        </div>

        {/* Card 3: Pending */}
        <div className="bg-slate-900/90 border border-rose-500/30 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">คงเหลือรอเปลี่ยน</span>
            <Clock size={16} className="text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-400 font-mono">{stats.pendingCount}</span>
            <span className="text-xs font-bold text-rose-300 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-md font-mono">
              {stats.pendingPct}%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            จากเป้าหมายทั้งหมด {stats.totalMachines} เครื่อง
          </p>
        </div>

        {/* Card 4: Total Legs */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">จำนวนขาฉิ่งรวม</span>
            <Wrench size={16} className="text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{stats.totalLegs}</span>
            <span className="text-xs text-slate-400">ขา</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            เปลี่ยนแล้ว <span className="text-emerald-400 font-bold">{stats.completedLegs}</span> • คงเหลือ{' '}
            <span className="text-rose-400 font-bold">{stats.pendingLegs}</span> ขา ({stats.completedLegsPct}%)
          </p>
        </div>

        {/* Card 5: Budget / Cost */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">ค่าใช้จ่ายจริง &amp; แผนงบ</span>
            <Banknote size={16} className="text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-cyan-400 font-mono">
              {stats.actualSpentCost.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">บาท</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            ประมาณการคงเหลือ <span className="text-amber-400 font-bold">{stats.estimatedRemainingCost.toLocaleString()}</span> บ.
          </p>
        </div>
      </div>

      {/* Main Charts Section (Row 1: Donut + Summary Table & Monthly Combo Chart) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left: Progress Donut + 5-Column PDF Summary Table */}
        <div className="xl:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-lg">
          <div>
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              สัดส่วนความคืบหน้าการเปลี่ยนขาฉิ่ง (Progress Summary)
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              คำนวณเฉพาะเครื่องจักรเป้าหมายที่ปรับปรุงได้ ({stats.totalMachines} รายการ)
            </p>
          </div>

          <div className="relative h-56 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={84}
                  paddingAngle={3}
                  stroke="none"
                >
                  {donutData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
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
            {/* Donut center readout */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase">แล้วเสร็จ</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">{stats.completedPct}%</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {stats.completedCount}/{stats.totalMachines} เครื่อง
              </span>
            </div>
          </div>

          {/* 5-Column Summary Table matching PDF */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-center text-xs">
              <thead className="bg-slate-800/80 text-slate-300 font-bold">
                <tr>
                  <th className="py-2 px-2">หมวด</th>
                  <th className="py-2 px-2">ทั้งหมด</th>
                  <th className="py-2 px-2 text-emerald-400">แก้ไขแล้ว</th>
                  <th className="py-2 px-2 text-rose-400">คงเหลือ</th>
                  <th className="py-2 px-2 text-emerald-400">% แล้วเสร็จ</th>
                  <th className="py-2 px-2 text-rose-400">% ยังไม่แก้ไข</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/50 font-mono">
                <tr>
                  <td className="py-2 px-2 font-sans font-semibold text-slate-300">เครื่องจักร</td>
                  <td className="py-2 px-2 font-bold text-white">{stats.totalMachines}</td>
                  <td className="py-2 px-2 font-bold text-emerald-400">{stats.completedCount}</td>
                  <td className="py-2 px-2 font-bold text-rose-400">{stats.pendingCount}</td>
                  <td className="py-2 px-2 font-bold text-emerald-400">{stats.completedPct}%</td>
                  <td className="py-2 px-2 font-bold text-rose-400">{stats.pendingPct}%</td>
                </tr>
                <tr>
                  <td className="py-2 px-2 font-sans font-semibold text-slate-300">จำนวนขา</td>
                  <td className="py-2 px-2 font-bold text-white">{stats.totalLegs}</td>
                  <td className="py-2 px-2 font-bold text-emerald-400">{stats.completedLegs}</td>
                  <td className="py-2 px-2 font-bold text-rose-400">{stats.pendingLegs}</td>
                  <td className="py-2 px-2 font-bold text-emerald-400">{stats.completedLegsPct}%</td>
                  <td className="py-2 px-2 font-bold text-rose-400">{Math.max(0, 100 - stats.completedLegsPct)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Monthly Combo Chart (Bar + Line) */}
        <div className="xl:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <div>
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                <CalendarCheck size={16} className="text-cyan-400" />
                กราฟติดตามผลงานรายเดือน &amp; ยอดสะสม (Monthly &amp; Cumulative %)
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                อัปเดตอัตโนมัติเมื่อบันทึกวันที่แล้วเสร็จจริง (ช่วงหลัก May-26 – Nov-27 และขยายตามวันที่กรอก)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowMonthlyTable((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition self-start sm:self-auto cursor-pointer"
            >
              {showMonthlyTable ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              <span>{showMonthlyTable ? 'ซ่อนตารางรายเดือน' : 'ดูตารางตัวเลขรายเดือน'}</span>
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyComboData} margin={{ top: 10, right: 12, left: -12, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={45} />
                <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: '#fbbf24', fontSize: 11 }} unit="%" />
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
                <Bar yAxisId="left" dataKey="monthlyDone" name="แล้วเสร็จเดือนนี้ (เครื่อง)" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar yAxisId="left" dataKey="cumulativeDone" name="สะสมทั้งหมด (เครื่อง)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={22} opacity={0.45} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulativePct"
                  name="% สะสม"
                  stroke="#fbbf24"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#fbbf24' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {showMonthlyTable && (
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-[11px] text-center font-mono">
                <thead className="bg-slate-800/80 text-slate-300">
                  <tr>
                    <th className="py-1.5 px-2 text-left font-sans">หัวข้อ</th>
                    {monthlyComboData.map((m) => (
                      <th key={m.ym} className="py-1.5 px-2 whitespace-nowrap">
                        {m.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-950/40">
                  <tr>
                    <td className="py-1.5 px-2 text-left font-sans text-cyan-300 font-semibold whitespace-nowrap">รายเดือน</td>
                    {monthlyComboData.map((m) => (
                      <td key={m.ym} className={`py-1.5 px-2 ${m.monthlyDone > 0 ? 'text-cyan-400 font-bold' : 'text-slate-500'}`}>
                        {m.monthlyDone}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 text-left font-sans text-emerald-300 font-semibold whitespace-nowrap">สะสม</td>
                    {monthlyComboData.map((m) => (
                      <td key={m.ym} className="py-1.5 px-2 text-emerald-400 font-bold">
                        {m.cumulativeDone}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 text-left font-sans text-amber-300 font-semibold whitespace-nowrap">% สะสม</td>
                    {monthlyComboData.map((m) => (
                      <td key={m.ym} className="py-1.5 px-2 text-amber-300">
                        {m.cumulativePct}%
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Main Charts Section (Row 2: Area/Room Breakdown & Size Code Procurement Summary) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Room / Area Breakdown */}
        <div className="xl:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-extrabold text-white">ความคืบหน้าแยกตามพื้นที่ / ห้อง (คลิกเพื่อกรอง)</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                แสดงจำนวนเครื่องที่แก้ไขแล้วเทียบกับคงเหลือในแต่ละห้อง
              </p>
            </div>
            {areaFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setAreaFilter('ALL')}
                className="text-[11px] px-2 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 cursor-pointer"
              >
                ล้างตัวกรองห้อง
              </button>
            )}
          </div>

          <div className="h-56 w-full mb-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={areaBreakdown} layout="vertical" margin={{ top: 4, right: 16, left: 10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="area" width={135} tick={{ fill: '#cbd5e1', fontSize: 11 }} />
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
                <Bar dataKey="completed" stackId="a" name="แก้ไขแล้ว" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="pending" stackId="a" name="คงเหลือ" fill="#f43f5e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
            {areaBreakdown.map((room) => {
              const pct = room.total > 0 ? Math.round((room.completed / room.total) * 100) : 0;
              const active = areaFilter === room.area;
              return (
                <button
                  key={room.area}
                  type="button"
                  onClick={() => setAreaFilter(active ? 'ALL' : room.area)}
                  className={`text-left p-2.5 rounded-xl border transition cursor-pointer ${
                    active
                      ? 'bg-cyan-500/15 border-cyan-500/60'
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-200 truncate">{room.area}</span>
                    <span className="text-[11px] font-mono font-bold text-cyan-400">
                      {room.completed}/{room.total} ({pct}%)
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 text-[10px] text-slate-400 font-mono">
                    ขารวม {room.totalLegs} ขา (เปลี่ยนแล้ว {room.completedLegs})
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Size Code Procurement Table */}
        <div className="xl:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-extrabold text-white">สรุปจำนวนขาฉิ่งแยกตามเบอร์ (เพื่อวางแผนสั่งซื้ออะไหล่)</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                คลิกที่แถวเบอร์ขาฉิ่งเพื่อกรองตารางรายการด้านล่างได้ทันที
              </p>
            </div>
            {sizeFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSizeFilter('ALL')}
                className="text-[11px] px-2 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 cursor-pointer"
              >
                ล้างตัวกรองเบอร์
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 flex-1">
            <table className="w-full text-xs">
              <thead className="bg-slate-800/80 text-slate-300 font-bold">
                <tr>
                  <th className="py-2.5 px-3 text-left">เบอร์ขาฉิ่ง</th>
                  <th className="py-2.5 px-2 text-center">จำนวนเครื่อง</th>
                  <th className="py-2.5 px-2 text-center">ขารวม</th>
                  <th className="py-2.5 px-2 text-center text-emerald-400">เปลี่ยนแล้ว</th>
                  <th className="py-2.5 px-2 text-center text-rose-400">ต้องสั่ง/คงเหลือ</th>
                  <th className="py-2.5 px-3 text-right text-amber-400">งบคงเหลือ (บ.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/40 font-mono">
                {sizeBreakdown.map((row) => {
                  const selected = sizeFilter === row.sizeCode;
                  return (
                    <tr
                      key={row.sizeCode}
                      onClick={() => setSizeFilter(selected ? 'ALL' : row.sizeCode)}
                      className={`cursor-pointer transition ${
                        selected ? 'bg-cyan-500/15' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-2 px-3 font-bold text-cyan-300">
                        {row.sizeCode === '-' ? 'ยังไม่ระบุเบอร์ (-)' : row.sizeCode}
                      </td>
                      <td className="py-2 px-2 text-center text-slate-200">{row.machineCount}</td>
                      <td className="py-2 px-2 text-center font-bold text-white">{row.totalLegs}</td>
                      <td className="py-2 px-2 text-center font-bold text-emerald-400">{row.replacedLegs}</td>
                      <td className="py-2 px-2 text-center font-bold text-rose-400">{row.remainingLegs}</td>
                      <td className="py-2 px-3 text-right text-amber-300">
                        {row.estimatedRemainingCost.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-800/60 font-mono font-extrabold text-white border-t border-slate-700">
                <tr>
                  <td className="py-2 px-3 font-sans">รวมทั้งหมด</td>
                  <td className="py-2 px-2 text-center">{stats.totalMachines}</td>
                  <td className="py-2 px-2 text-center">{stats.totalLegs}</td>
                  <td className="py-2 px-2 text-center text-emerald-400">{stats.completedLegs}</td>
                  <td className="py-2 px-2 text-center text-rose-400">{stats.pendingLegs}</td>
                  <td className="py-2 px-3 text-right text-amber-400">
                    {stats.estimatedRemainingCost.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar + Quick Status Tabs */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'ALL', label: `ทั้งหมด (${stats.totalRows})` },
                { id: 'TARGET_ONLY', label: `เฉพาะเป้าหมาย (${stats.totalMachines})` },
                { id: 'COMPLETED', label: `แล้วเสร็จ (${stats.completedCount})` },
                { id: 'PENDING', label: `ยังไม่แก้ไข (${stats.pendingCount})` },
                { id: 'EXCLUDED', label: `ข้อยกเว้น/เปลี่ยนไม่ได้ (${stats.excludedCount})` }
              ] as { id: StatusFilterOption; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                    : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:border-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>แสดงผล {filteredItems.length} จาก {stats.totalRows} รายการ</span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 font-semibold hover:bg-rose-500/25 cursor-pointer"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          <div className="relative lg:col-span-2">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อเครื่อง, ห้อง, ไลน์, เบอร์ขาฉิ่ง, หมายเหตุ..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-slate-400 shrink-0" />
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Zone: ทั้งหมด</option>
              {filterOptions.zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>

          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">พื้นที่/ห้อง: ทั้งหมด</option>
            {filterOptions.areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={qaMonthFilter}
              onChange={(e) => setQaMonthFilter(e.target.value)}
              className="w-full px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">QA: ทั้งหมด</option>
              {filterOptions.qaMonths.map((qm) => (
                <option key={qm} value={qm}>
                  QA {qm}
                </option>
              ))}
            </select>

            <select
              value={sizeFilter}
              onChange={(e) => setSizeFilter(e.target.value)}
              className="w-full px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">เบอร์: ทั้งหมด</option>
              {filterOptions.sizes.map((s) => (
                <option key={s} value={s}>
                  {s === '-' ? 'ไม่ระบุ (-)' : s}
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
                <th className="py-3 px-2.5 text-center w-12">ลำดับ</th>
                <th className="py-3 px-2.5 whitespace-nowrap">Zone</th>
                <th className="py-3 px-2.5 whitespace-nowrap">พื้นที่ / ห้อง</th>
                <th className="py-3 px-3 min-w-[220px]">ไลน์ / รายการเครื่องจักร</th>
                <th className="py-3 px-2.5 whitespace-nowrap">ประเภท &amp; ลักษณะ</th>
                <th className="py-3 px-2.5 text-center whitespace-nowrap">เบอร์ขาฉิ่ง</th>
                <th className="py-3 px-2 text-center whitespace-nowrap">จำนวนขา</th>
                <th className="py-3 px-2 text-center whitespace-nowrap">แพลน QA</th>
                <th className="py-3 px-2.5 whitespace-nowrap">วันที่แล้วเสร็จ</th>
                <th className="py-3 px-3 min-w-[140px]">หมายเหตุ</th>
                <th className="py-3 px-2.5 text-center whitespace-nowrap">สถานะ</th>
                <th className="py-3 px-2.5 text-right whitespace-nowrap">ราคา/ชิ้น</th>
                <th className="py-3 px-2.5 text-right whitespace-nowrap">ราคารวม</th>
                <th className="py-3 px-2 text-center whitespace-nowrap">รูป</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-400">
                    ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isExcluded = item.rowType !== 'ITEM';
                  const isDone = item.status === 'COMPLETED';
                  return (
                    <tr
                      key={item.id}
                      className={`transition ${
                        isDone
                          ? 'bg-emerald-950/10 hover:bg-emerald-950/20'
                          : isExcluded
                          ? 'bg-slate-950/50 opacity-80 hover:bg-slate-900/60'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-2.5 px-2.5 text-center font-mono font-bold text-slate-400">
                        {item.orderNo}
                      </td>
                      <td className="py-2.5 px-2.5 whitespace-nowrap text-slate-300">{item.zone}</td>
                      <td className="py-2.5 px-2.5 whitespace-nowrap font-semibold text-slate-200">{item.area}</td>
                      <td className="py-2.5 px-3">
                        {item.lineGroup && (
                          <span className="inline-block text-[10px] font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/25 px-1.5 py-0.5 rounded mb-0.5 mr-1.5">
                            {item.lineGroup}
                          </span>
                        )}
                        <span className="font-semibold text-white">{item.machineName}</span>
                      </td>
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <span className="text-slate-300">{item.footType || '-'}</span>
                        {isExcluded && (
                          <span className="block text-[10px] text-amber-400 font-semibold">
                            ({getRowTypeLabel(item.rowType)})
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-mono font-bold text-cyan-300 whitespace-nowrap">
                        {item.sizeCode || '-'}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-white">
                        {item.footCount}
                      </td>
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        {item.qaPlanMonth ? (
                          <span className="px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-semibold">
                            {item.qaPlanMonth}
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2.5 whitespace-nowrap font-mono text-slate-300">
                        {item.completedDate ? formatThaiDisplayDate(item.completedDate) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 max-w-[200px] break-words">
                        {item.note || '-'}
                      </td>
                      <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold text-[11px]">
                            <CheckCircle2 size={12} /> OK
                          </span>
                        ) : isExcluded ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 font-semibold text-[11px]">
                            <Ban size={12} /> ยกเว้น
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-500/15 border border-rose-500/35 text-rose-300 font-bold text-[11px]">
                            <Clock size={12} /> รอเปลี่ยน
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-slate-300">
                        {item.unitPrice > 0 ? item.unitPrice.toLocaleString() : '-'}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-bold text-amber-300">
                        {item.totalCost > 0 ? item.totalCost.toLocaleString() : '-'}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {item.photo ? (
                          <button
                            type="button"
                            onClick={() => setLightboxImage({ src: item.photo!, title: item.machineName })}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg overflow-hidden border border-cyan-500/40 hover:scale-110 transition cursor-pointer"
                            title="ดูรูปภาพ"
                          >
                            <img src={item.photo} alt={item.machineName} className="w-full h-full object-cover" />
                          </button>
                        ) : (
                          <span className="text-slate-600 inline-flex items-center justify-center">
                            <ImageIcon size={14} />
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {canEdit && item.rowType === 'ITEM' && item.status !== 'COMPLETED' && (
                            <button
                              type="button"
                              onClick={() => openQuickComplete(item)}
                              className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/40 text-emerald-300 font-bold text-[11px] transition cursor-pointer"
                              title="บันทึกเปลี่ยนขาฉิ่งแล้วเสร็จ (OK)"
                            >
                              บันทึกเสร็จ
                            </button>
                          )}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition cursor-pointer"
                              title="แก้ไขข้อมูล"
                            >
                              <Edit3 size={13} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 transition cursor-pointer"
                              title="ลบรายการ"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                          {!canEdit && !canDelete && (
                            <span className="text-[10px] text-slate-500">ดูอย่างเดียว ({currentUser?.role})</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Item Modal */}
      {isFormModalOpen && formState && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#0b1222] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 z-10 bg-[#0b1222] border-b border-slate-800 px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {editingItem ? `แก้ไขรายการ #${editingItem.orderNo}` : 'เพิ่มรายการสำรวจ / เปลี่ยนขาฉิ่งใหม่'}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  ข้อมูลจะซิงค์ขึ้น Dashboard, กราฟ และ Cloud Firestore ทันทีเมื่อบันทึก
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">ลำดับที่</label>
                  <input
                    type="number"
                    min={1}
                    value={formState.orderNo}
                    onChange={(e) => handleFormFieldChange('orderNo', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Zone</label>
                  <input
                    type="text"
                    value={formState.zone}
                    onChange={(e) => handleFormFieldChange('zone', e.target.value)}
                    placeholder="เช่น High case"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">พื้นที่ / ห้อง *</label>
                  <input
                    type="text"
                    list="leveling-foot-area-suggestions"
                    value={formState.area}
                    onChange={(e) => handleFormFieldChange('area', e.target.value)}
                    required
                    placeholder="เช่น ห้องขึ้นรูปข้าวกล่อง"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                  <datalist id="leveling-foot-area-suggestions">
                    {filterOptions.areas.map((a) => (
                      <option key={a} value={a} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">กลุ่มไลน์ผลิต (ถ้ามี)</label>
                  <input
                    type="text"
                    value={formState.lineGroup}
                    onChange={(e) => handleFormFieldChange('lineGroup', e.target.value)}
                    placeholder="เช่น ไลน์ขึ้นรูป No.1"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">รายการเครื่องจักร *</label>
                  <input
                    type="text"
                    value={formState.machineName}
                    onChange={(e) => handleFormFieldChange('machineName', e.target.value)}
                    required
                    placeholder="เช่น สายพาน Out feed"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">ประเภทการนับ KPI</label>
                  <select
                    value={formState.rowType}
                    onChange={(e) => handleFormFieldChange('rowType', e.target.value as LevelingFootRowType)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  >
                    <option value="ITEM">เครื่องเป้าหมาย (นับ KPI)</option>
                    <option value="CANNOT_REPLACE">ข้อยกเว้น: เปลี่ยนไม่ได้</option>
                    <option value="SOLID_FOOT">ข้อยกเว้น: ขาตัน</option>
                    <option value="NO_BELT">ข้อยกเว้น: ไม่มีสายพาน</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">ลักษณะขาฉิ่ง</label>
                  <select
                    value={formState.footType}
                    onChange={(e) => handleFormFieldChange('footType', e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  >
                    <option value="แบบกลวง">แบบกลวง</option>
                    <option value="แบบตัน">แบบตัน</option>
                    <option value="-">ไม่ระบุ (-)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">เบอร์ขาฉิ่ง</label>
                  <select
                    value={formState.sizeCode}
                    onChange={(e) => handleFormFieldChange('sizeCode', e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  >
                    {LEVELING_FOOT_SIZE_OPTIONS.map((sz) => (
                      <option key={sz} value={sz}>
                        {sz}
                      </option>
                    ))}
                    <option value="__CUSTOM__">กำหนดเบอร์เอง...</option>
                  </select>
                  {formState.sizeCode === '__CUSTOM__' && (
                    <input
                      type="text"
                      value={formState.customSizeCode}
                      onChange={(e) => handleFormFieldChange('customSizeCode', e.target.value)}
                      placeholder="เช่น M24x350"
                      className="mt-1.5 w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-cyan-500/40 text-white font-mono"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">จำนวนขา (ขา)</label>
                  <input
                    type="number"
                    min={0}
                    value={formState.footCount}
                    onChange={(e) => handleFormFieldChange('footCount', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">สถานะงาน</label>
                  <select
                    value={formState.status}
                    disabled={formState.rowType !== 'ITEM'}
                    onChange={(e) => handleFormFieldChange('status', e.target.value as LevelingFootStatus)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white disabled:opacity-50"
                  >
                    <option value="PENDING">ยังไม่แก้ไข (รอดำเนินการ)</option>
                    <option value="COMPLETED">OK - เปลี่ยนแล้วเสร็จ</option>
                    <option value="CANNOT_REPLACE">เปลี่ยนไม่ได้ / ยกเว้น</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">แพลน QA (เดือน)</label>
                  <input
                    type="text"
                    value={formState.qaPlanMonth}
                    onChange={(e) => handleFormFieldChange('qaPlanMonth', e.target.value)}
                    placeholder="เช่น ก.ย., ต.ค., ธ.ค."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">วันที่แล้วเสร็จจริง</label>
                  <input
                    type="date"
                    value={formState.completedDate}
                    disabled={formState.status !== 'COMPLETED'}
                    onChange={(e) => handleFormFieldChange('completedDate', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono disabled:opacity-40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">ราคาต่อชิ้น (บาท)</label>
                  <input
                    type="number"
                    min={0}
                    value={formState.unitPrice}
                    onChange={(e) => handleFormFieldChange('unitPrice', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1 flex items-center justify-between">
                    <span>ราคารวม (บาท)</span>
                    <Calculator size={12} className="text-cyan-400" />
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formState.totalCost}
                    disabled={formState.autoCalcTotal}
                    onChange={(e) => handleFormFieldChange('totalCost', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold disabled:opacity-75"
                  />
                </div>

                <label className="flex items-center gap-2 pb-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={formState.autoCalcTotal}
                    onChange={(e) => handleFormFieldChange('autoCalcTotal', e.target.checked)}
                    className="rounded border-slate-600"
                  />
                  <span>คำนวณอัตโนมัติ (จำนวนขา x ราคา)</span>
                </label>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">หมายเหตุ</label>
                <textarea
                  rows={2}
                  value={formState.note}
                  onChange={(e) => handleFormFieldChange('note', e.target.value)}
                  placeholder="ระบุรายละเอียดเพิ่มเติม เช่น เปลี่ยนแล้ว, ล็อคขาตัน, รออะไหล่..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                />
              </div>

              {/* Compressed Photo Upload */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Camera size={14} className="text-cyan-400" />
                    รูปภาพประกอบหน้างาน (บีบอัดอัตโนมัติ)
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 font-bold cursor-pointer">
                      อัปโหลดรูปภาพ
                      <input type="file" accept="image/*" onChange={handleFormPhotoUpload} className="hidden" />
                    </label>
                    {formState.photo && (
                      <button
                        type="button"
                        onClick={() => handleFormFieldChange('photo', '')}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 font-semibold cursor-pointer"
                      >
                        ลบรูป
                      </button>
                    )}
                  </div>
                </div>
                {formState.photo && (
                  <div className="mt-3">
                    <img
                      src={formState.photo}
                      alt="Preview"
                      className="max-h-40 rounded-xl border border-slate-700 object-contain"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold shadow-lg cursor-pointer"
                >
                  {editingItem ? 'บันทึกการแก้ไข' : 'เพิ่มรายการเข้า Dashboard'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick 1-Click Complete Modal */}
      {quickCompleteItem && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1222] border border-emerald-500/40 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-emerald-950/20">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-400" />
                <h3 className="text-sm font-extrabold text-white">บันทึกเปลี่ยนขาฉิ่งแล้วเสร็จ (OK)</h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickCompleteItem(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmQuickComplete} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <p className="text-[11px] text-slate-400">{quickCompleteItem.area}</p>
                <p className="font-bold text-white text-sm mt-0.5">{quickCompleteItem.machineName}</p>
                <p className="text-[11px] text-cyan-400 font-mono mt-0.5">เบอร์: {quickCompleteItem.sizeCode || '-'}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">วันที่แล้วเสร็จจริง</label>
                  <input
                    type="date"
                    required
                    value={quickDate}
                    onChange={(e) => setQuickDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">จำนวนขาที่เปลี่ยน</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={quickFootCount}
                    onChange={(e) => setQuickFootCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">ราคา/ชิ้น (บาท)</label>
                  <input
                    type="number"
                    min={0}
                    value={quickUnitPrice}
                    onChange={(e) => setQuickUnitPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">ราคารวมอัตโนมัติ</label>
                  <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 font-mono font-extrabold">
                    {((Number(quickFootCount) || 0) * (Number(quickUnitPrice) || 0)).toLocaleString()} บาท
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">หมายเหตุ</label>
                <input
                  type="text"
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold cursor-pointer">
                  <Camera size={14} />
                  <span>{quickPhoto ? 'เปลี่ยนรูปถ่าย' : 'แนบรูปหลังเปลี่ยน'}</span>
                  <input type="file" accept="image/*" onChange={handleQuickPhotoUpload} className="hidden" />
                </label>
                {quickPhoto && (
                  <img src={quickPhoto} alt="Quick preview" className="h-10 w-10 rounded-lg object-cover border border-slate-700" />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuickCompleteItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold cursor-pointer"
                >
                  ยืนยันเสร็จสิ้น (OK)
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
            <div className="flex items-center gap-2.5 text-rose-400">
              <Trash2 size={20} />
              <h3 className="text-base font-extrabold text-white">ยืนยันการลบรายการ</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              ต้องการลบรายการ <span className="font-bold text-white">"{deleteTarget.machineName}"</span> ({deleteTarget.area}) ใช่หรือไม่? การกระทำนี้จะอัปเดตกราฟและยอดรวมทันที
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
            <div className="flex items-center gap-2.5 text-amber-400">
              <RotateCcw size={20} />
              <h3 className="text-base font-extrabold text-white">รีเซ็ตข้อมูลกลับสู่ต้นฉบับ PDF</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              ระบบจะคืนค่าข้อมูลทั้งหมดเป็น 49 รายการ (เป้าหมาย 36 เครื่อง / 156 ขา / เสร็จแล้ว 4 เครื่อง) ตามเอกสารต้นฉบับ รายการที่เพิ่มหรือแก้ไขไว้จะถูกแทนที่ ยืนยันดำเนินการหรือไม่?
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

      {/* Photo Lightbox Modal */}
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
