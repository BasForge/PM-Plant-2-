import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  Cell
} from 'recharts';
import {
  Package,
  Search,
  Plus,
  Edit3,
  Trash2,
  Download,
  FileSpreadsheet,
  ArrowDownCircle,
  ArrowUpCircle,
  Sliders,
  History,
  AlertTriangle,
  CheckCircle2,
  X,
  Filter,
  ShoppingCart,
  TrendingUp,
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SparePart, StockTransaction, StockTransactionType } from '../types';
import {
  formatThaiShortDate,
  getEffectiveMaxStock,
  getStockLevelStatus,
  getSuggestedOrderQty,
  getTodayIso,
  SPARE_PART_CATEGORIES,
  StockLevelStatus
} from '../utils/inventoryUtils';
import { InventoryExcelImporter } from './inventory/InventoryExcelImporter';

type ActiveInventoryTab = 'stock' | 'history' | 'import';
type StockFilterStatus = 'ALL' | StockLevelStatus;

interface PartFormState {
  id: string;
  name: string;
  category: string;
  machineText: string;
  quantity: number;
  minRequired: number;
  maxStock: number;
  unit: string;
  location: string;
  pricePerUnit: number;
  supplier: string;
  leadTimeDays: number;
  specifications: string;
}

interface MovementFormState {
  type: StockTransactionType;
  partId: string;
  date: string;
  quantity: number;
  targetBalance: number;
  unitPrice: number;
  prNo: string;
  poNo: string;
  requisitionDate: string;
  supplier: string;
  machineName: string;
  workRequestNo: string;
  operatorName: string;
  note: string;
}

export const InventoryPage: React.FC = () => {
  const {
    spareParts,
    setSpareParts,
    stockTransactions,
    setStockTransactions,
    machines,
    technicians,
    workRequests,
    currentUser,
    canEdit,
    canDelete
  } = useApp();

  // Primary navigation tabs
  const [activeTab, setActiveTab] = useState<ActiveInventoryTab>('stock');
  const [showCharts, setShowCharts] = useState<boolean>(true);

  // Toast feedback
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, text });
    window.setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 3800);
  };

  // Tab 1: Master Stock filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StockFilterStatus>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [machineFilter, setMachineFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'id' | 'name' | 'quantity' | 'value' | 'status'>('status');
  const [selectedPartIds, setSelectedPartIds] = useState<string[]>([]);

  // Tab 2: Stock Card History filters
  const [txTypeFilter, setTxTypeFilter] = useState<'ALL' | StockTransactionType>('ALL');
  const [txPartFilter, setTxPartFilter] = useState<string>('ALL');
  const [txDateFrom, setTxDateFrom] = useState<string>('');
  const [txDateTo, setTxDateTo] = useState<string>('');
  const [txSearch, setTxSearch] = useState<string>('');

  // Modals
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);
  const [partForm, setPartForm] = useState<PartFormState | null>(null);
  const [movementForm, setMovementForm] = useState<MovementFormState | null>(null);
  const [deletePartTarget, setDeletePartTarget] = useState<SparePart | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState<boolean>(false);
  const [deleteTxTarget, setDeleteTxTarget] = useState<StockTransaction | null>(null);

  // Dynamic filter dropdown options
  const filterOptions = useMemo(() => {
    const cats = Array.from(new Set([...SPARE_PART_CATEGORIES, ...spareParts.map((p) => p.category).filter(Boolean)]));
    const suppliers = Array.from(new Set(spareParts.map((p) => p.supplier || '').filter(Boolean))).sort();
    const machineNames = Array.from(
      new Set(spareParts.flatMap((p) => p.machineIds || []).filter(Boolean))
    ).sort();
    return { cats, suppliers, machineNames };
  }, [spareParts]);

  // Core KPI Summary
  const kpis = useMemo(() => {
    let totalPieces = 0;
    let totalValue = 0;
    let outCount = 0;
    let lowCount = 0;
    let okCount = 0;
    let overCount = 0;
    let totalReorderBudget = 0;
    let totalReorderPieces = 0;

    spareParts.forEach((p) => {
      const qty = Number(p.quantity) || 0;
      const price = Number(p.pricePerUnit) || 0;
      totalPieces += qty;
      totalValue += qty * price;
      const st = getStockLevelStatus(p);
      if (st === 'OUT') outCount += 1;
      else if (st === 'LOW') lowCount += 1;
      else if (st === 'OVER') overCount += 1;
      else okCount += 1;

      const orderQty = getSuggestedOrderQty(p);
      if (orderQty > 0) {
        totalReorderPieces += orderQty;
        totalReorderBudget += orderQty * price;
      }
    });

    return {
      totalSkus: spareParts.length,
      totalPieces,
      totalValue,
      outCount,
      lowCount,
      needOrderCount: outCount + lowCount,
      okCount,
      overCount,
      totalReorderPieces,
      totalReorderBudget
    };
  }, [spareParts]);

  // Chart 1: Stock Health Distribution
  const healthChartData = useMemo(
    () => [
      { label: 'ปกติ (ในเกณฑ์)', count: kpis.okCount, color: '#10b981' },
      { label: 'ต่ำกว่า Min', count: kpis.lowCount, color: '#f59e0b' },
      { label: 'หมดสต๊อก (0)', count: kpis.outCount, color: '#f43f5e' },
      { label: 'เกิน Max', count: kpis.overCount, color: '#38bdf8' }
    ],
    [kpis]
  );

  // Chart 2: Monthly Stock IN vs OUT movement
  const monthlyMovementChartData = useMemo(() => {
    const map = new Map<string, { ym: string; inQty: number; outQty: number; outValue: number }>();
    stockTransactions.forEach((tx) => {
      const ym = tx.date ? tx.date.slice(0, 7) : '';
      if (!ym) return;
      const existing = map.get(ym) || { ym, inQty: 0, outQty: 0, outValue: 0 };
      if (tx.type === 'IN') {
        existing.inQty += Math.abs(Number(tx.quantity) || 0);
      } else if (tx.type === 'OUT') {
        existing.outQty += Math.abs(Number(tx.quantity) || 0);
        existing.outValue += Number(tx.totalValue) || 0;
      }
      map.set(ym, existing);
    });
    return Array.from(map.values())
      .sort((a, b) => a.ym.localeCompare(b.ym))
      .slice(-12);
  }, [stockTransactions]);

  // Filtered & Sorted Master Parts
  const filteredParts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const statusPriority: Record<StockLevelStatus, number> = { OUT: 0, LOW: 1, OVER: 2, OK: 3 };

    return spareParts
      .filter((p) => {
        const st = getStockLevelStatus(p);
        if (statusFilter !== 'ALL' && st !== statusFilter) return false;
        if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
        if (supplierFilter !== 'ALL' && (p.supplier || '') !== supplierFilter) return false;
        if (machineFilter !== 'ALL' && !(p.machineIds || []).includes(machineFilter)) return false;

        if (q) {
          const hay = [
            p.id,
            p.name,
            p.category,
            p.supplier || '',
            p.location || '',
            p.specifications || '',
            p.lastPRNo || '',
            p.lastPONo || '',
            p.lastWorkRequestNo || '',
            p.workRequestNo || '',
            ...(p.machineIds || [])
          ]
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'status') {
          const diff = statusPriority[getStockLevelStatus(a)] - statusPriority[getStockLevelStatus(b)];
          if (diff !== 0) return diff;
          return a.id.localeCompare(b.id);
        }
        if (sortBy === 'quantity') return a.quantity - b.quantity;
        if (sortBy === 'value') return b.quantity * b.pricePerUnit - a.quantity * a.pricePerUnit;
        if (sortBy === 'name') return a.name.localeCompare(b.name, 'th');
        return a.id.localeCompare(b.id);
      });
  }, [spareParts, searchQuery, statusFilter, categoryFilter, supplierFilter, machineFilter, sortBy]);

  // Filtered Stock Card Transactions (newest date first)
  const filteredTransactions = useMemo(() => {
    const q = txSearch.trim().toLowerCase();
    return stockTransactions
      .filter((tx) => {
        if (txTypeFilter !== 'ALL' && tx.type !== txTypeFilter) return false;
        if (txPartFilter !== 'ALL' && tx.partId !== txPartFilter) return false;
        if (txDateFrom && tx.date < txDateFrom) return false;
        if (txDateTo && tx.date > txDateTo) return false;
        if (q) {
          const hay = [
            tx.partId,
            tx.partName,
            tx.prNo || '',
            tx.poNo || '',
            tx.supplier || '',
            tx.machineName || '',
            tx.workRequestNo || '',
            tx.operatorName || '',
            tx.note || ''
          ]
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dateCmp = (b.date || '').localeCompare(a.date || '');
        if (dateCmp !== 0) return dateCmp;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
  }, [stockTransactions, txTypeFilter, txPartFilter, txDateFrom, txDateTo, txSearch]);

  const txSummary = useMemo(() => {
    let inCount = 0;
    let inQty = 0;
    let inValue = 0;
    let outCount = 0;
    let outQty = 0;
    let outValue = 0;
    let adjCount = 0;

    filteredTransactions.forEach((tx) => {
      if (tx.type === 'IN') {
        inCount += 1;
        inQty += Math.abs(tx.quantity);
        inValue += tx.totalValue || 0;
      } else if (tx.type === 'OUT') {
        outCount += 1;
        outQty += Math.abs(tx.quantity);
        outValue += tx.totalValue || 0;
      } else {
        adjCount += 1;
      }
    });

    return { inCount, inQty, inValue, outCount, outQty, outValue, adjCount };
  }, [filteredTransactions]);

  // Generate next SKU ID
  const generateNextSku = (): string => {
    const maxNum = spareParts.reduce((max, p) => {
      const m = /^SP-(\d+)$/i.exec(p.id.trim());
      return m ? Math.max(max, Number(m[1])) : max;
    }, 0);
    return `SP-${String(maxNum + 1).padStart(3, '0')}`;
  };

  // Open Add / Edit Part Modal
  const openAddPartModal = () => {
    setEditingPart(null);
    setPartForm({
      id: generateNextSku(),
      name: '',
      category: SPARE_PART_CATEGORIES[0],
      machineText: '',
      quantity: 0,
      minRequired: 2,
      maxStock: 5,
      unit: 'EA',
      location: 'คลังอะไหล่กลาง',
      pricePerUnit: 0,
      supplier: '',
      leadTimeDays: 7,
      specifications: ''
    });
  };

  const openEditPartModal = (part: SparePart) => {
    setEditingPart(part);
    setPartForm({
      id: part.id,
      name: part.name,
      category: part.category || SPARE_PART_CATEGORIES[0],
      machineText: (part.machineIds || []).join(', '),
      quantity: part.quantity,
      minRequired: part.minRequired,
      maxStock: getEffectiveMaxStock(part),
      unit: part.unit || 'EA',
      location: part.location || '',
      pricePerUnit: part.pricePerUnit,
      supplier: part.supplier || '',
      leadTimeDays: part.leadTimeDays ?? 7,
      specifications: part.specifications || ''
    });
  };

  const handleSavePartForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partForm) return;

    const cleanId = partForm.id.trim().toUpperCase();
    const cleanName = partForm.name.trim();
    if (!cleanId || !cleanName) {
      showToast('กรุณาระบุรหัสอะไหล่และชื่ออะไหล่', 'error');
      return;
    }

    if (!editingPart && spareParts.some((p) => p.id.toUpperCase() === cleanId)) {
      showToast(`รหัสอะไหล่ ${cleanId} มีอยู่ในคลังแล้ว`, 'error');
      return;
    }

    const machineIds = partForm.machineText
      .split(/[,;/\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const minVal = Math.max(0, Number(partForm.minRequired) || 0);
    const maxVal = Math.max(minVal, Number(partForm.maxStock) || 0);
    const qtyVal = Math.max(0, Number(partForm.quantity) || 0);
    const priceVal = Math.max(0, Number(partForm.pricePerUnit) || 0);
    const today = getTodayIso();

    if (editingPart) {
      setSpareParts((prev) =>
        prev.map((p) =>
          p.id === editingPart.id
            ? {
                ...p,
                name: cleanName,
                category: partForm.category,
                machineIds,
                minRequired: minVal,
                maxStock: maxVal,
                unit: partForm.unit.trim() || 'EA',
                location: partForm.location.trim() || 'คลังอะไหล่กลาง',
                pricePerUnit: priceVal,
                supplier: partForm.supplier.trim() || undefined,
                leadTimeDays: Number(partForm.leadTimeDays) || undefined,
                specifications: partForm.specifications.trim() || undefined
              }
            : p
        )
      );
      showToast(`อัปเดตข้อมูลอะไหล่ ${cleanId} เรียบร้อยแล้ว`);
    } else {
      const newPart: SparePart = {
        id: cleanId,
        name: cleanName,
        category: partForm.category,
        machineIds,
        quantity: qtyVal,
        minRequired: minVal,
        maxStock: maxVal,
        unit: partForm.unit.trim() || 'EA',
        location: partForm.location.trim() || 'คลังอะไหล่กลาง',
        pricePerUnit: priceVal,
        supplier: partForm.supplier.trim() || undefined,
        leadTimeDays: Number(partForm.leadTimeDays) || undefined,
        lastRestockedDate: today,
        lastReceiveDate: qtyVal > 0 ? today : undefined,
        specifications: partForm.specifications.trim() || undefined
      };
      setSpareParts((prev) => [newPart, ...prev]);

      // If initial stock > 0, record opening balance in Stock Card
      if (qtyVal > 0) {
        const openingTx: StockTransaction = {
          id: `TX-OPEN-${Date.now()}`,
          partId: cleanId,
          partName: cleanName,
          type: 'IN',
          date: today,
          quantity: qtyVal,
          balanceBefore: 0,
          balanceAfter: qtyVal,
          unit: newPart.unit,
          unitPrice: priceVal,
          totalValue: qtyVal * priceVal,
          supplier: newPart.supplier,
          machineName: machineIds.join(', ') || undefined,
          operatorName: currentUser?.name || 'ผู้ใช้งาน',
          note: 'ยอดยกมา / เพิ่มรายการอะไหล่ใหม่',
          createdAt: new Date().toISOString()
        };
        setStockTransactions((prev) => [openingTx, ...prev]);
      }
      showToast(`เพิ่มอะไหล่ใหม่ ${cleanId} เข้าคลังเรียบร้อยแล้ว`);
    }

    setPartForm(null);
    setEditingPart(null);
  };

  // Open Receive / Issue / Adjust Modal
  const openMovementModal = (type: StockTransactionType, part?: SparePart) => {
    const target = part || spareParts[0];
    if (!target) {
      showToast('ยังไม่มีรายการอะไหล่ในคลัง กรุณาเพิ่มอะไหล่หรือนำเข้า Excel ก่อน', 'error');
      return;
    }
    setMovementForm({
      type,
      partId: target.id,
      date: getTodayIso(),
      quantity: 1,
      targetBalance: target.quantity,
      unitPrice: target.pricePerUnit || 0,
      prNo: '',
      poNo: '',
      requisitionDate: '',
      supplier: target.supplier || '',
      machineName: (target.machineIds && target.machineIds[0]) || '',
      workRequestNo: '',
      operatorName: currentUser?.name || '',
      note: ''
    });
  };

  const selectedMovementPart = useMemo(() => {
    if (!movementForm) return null;
    return spareParts.find((p) => p.id === movementForm.partId) || null;
  }, [movementForm, spareParts]);

  const handleSaveMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementForm || !selectedMovementPart) return;

    const before = Number(selectedMovementPart.quantity) || 0;
    let deltaQty = Math.abs(Number(movementForm.quantity) || 0);
    let after = before;

    if (movementForm.type === 'IN') {
      if (deltaQty <= 0) {
        showToast('กรุณาระบุจำนวนรับเข้ามากกว่า 0', 'error');
        return;
      }
      after = before + deltaQty;
    } else if (movementForm.type === 'OUT') {
      if (deltaQty <= 0) {
        showToast('กรุณาระบุจำนวนจ่ายออกมากกว่า 0', 'error');
        return;
      }
      if (deltaQty > before) {
        showToast(`จำนวนจ่ายออก (${deltaQty}) มากกว่าคงเหลือในคลัง (${before})`, 'error');
        return;
      }
      after = before - deltaQty;
    } else {
      after = Math.max(0, Number(movementForm.targetBalance) || 0);
      deltaQty = after - before;
    }

    const txPrice = Math.max(0, Number(movementForm.unitPrice) || selectedMovementPart.pricePerUnit || 0);
    const txDate = movementForm.date || getTodayIso();

    const newTx: StockTransaction = {
      id: `TX-${movementForm.type}-${Date.now()}`,
      partId: selectedMovementPart.id,
      partName: selectedMovementPart.name,
      type: movementForm.type,
      date: txDate,
      quantity: movementForm.type === 'ADJUST' ? deltaQty : Math.abs(deltaQty),
      balanceBefore: before,
      balanceAfter: after,
      unit: selectedMovementPart.unit || 'EA',
      unitPrice: txPrice,
      totalValue: Math.abs(deltaQty) * txPrice,
      prNo: movementForm.type === 'IN' ? movementForm.prNo.trim() || undefined : undefined,
      poNo: movementForm.type === 'IN' ? movementForm.poNo.trim() || undefined : undefined,
      requisitionDate: movementForm.type === 'IN' ? movementForm.requisitionDate || undefined : undefined,
      supplier: movementForm.type === 'IN' ? movementForm.supplier.trim() || undefined : undefined,
      machineName: movementForm.machineName.trim() || undefined,
      workRequestNo: movementForm.type === 'OUT' ? movementForm.workRequestNo.trim() || undefined : undefined,
      operatorName: movementForm.operatorName.trim() || currentUser?.name || undefined,
      note: movementForm.note.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    setSpareParts((prev) =>
      prev.map((p) => {
        if (p.id !== selectedMovementPart.id) return p;
        const updatedMachines =
          movementForm.machineName.trim() && !p.machineIds.includes(movementForm.machineName.trim())
            ? [...p.machineIds, movementForm.machineName.trim()]
            : p.machineIds;
        return {
          ...p,
          quantity: after,
          pricePerUnit: movementForm.type === 'IN' && txPrice > 0 ? txPrice : p.pricePerUnit,
          supplier: movementForm.type === 'IN' && movementForm.supplier.trim() ? movementForm.supplier.trim() : p.supplier,
          machineIds: updatedMachines,
          lastRestockedDate: txDate,
          lastReceiveDate: movementForm.type === 'IN' ? txDate : p.lastReceiveDate,
          lastIssueDate: movementForm.type === 'OUT' ? txDate : p.lastIssueDate,
          lastPRNo: movementForm.type === 'IN' && movementForm.prNo.trim() ? movementForm.prNo.trim() : p.lastPRNo,
          lastPONo: movementForm.type === 'IN' && movementForm.poNo.trim() ? movementForm.poNo.trim() : p.lastPONo,
          lastWorkRequestNo:
            movementForm.type === 'OUT' && movementForm.workRequestNo.trim()
              ? movementForm.workRequestNo.trim()
              : p.lastWorkRequestNo
        };
      })
    );

    setStockTransactions((prev) => [newTx, ...prev]);

    const actionText =
      movementForm.type === 'IN'
        ? `รับเข้า +${deltaQty} ${selectedMovementPart.unit}`
        : movementForm.type === 'OUT'
        ? `จ่ายออก -${deltaQty} ${selectedMovementPart.unit}`
        : `ปรับยอดเป็น ${after} ${selectedMovementPart.unit}`;
    showToast(`${selectedMovementPart.name}: ${actionText} (คงเหลือ ${after})`);
    setMovementForm(null);
  };

  // Apply Excel Import
  const handleApplyExcelImport = ({
    mode,
    parts,
    transactions,
    clearOldTransactions
  }: {
    mode: 'MERGE' | 'OVERWRITE';
    parts: SparePart[];
    transactions: StockTransaction[];
    clearOldTransactions?: boolean;
  }) => {
    if (mode === 'OVERWRITE') {
      setSpareParts(parts);
      setStockTransactions((prev) => (clearOldTransactions ? transactions : [...transactions, ...prev]));
      setSelectedPartIds([]);
      showToast(`นำเข้าและแทนที่คลังด้วย ${parts.length} รายการ (สร้างประวัติ ${transactions.length} รายการ)`);
    } else {
      setSpareParts((prev) => {
        const merged = [...prev];
        parts.forEach((incoming) => {
          const idxById = merged.findIndex((p) => p.id.toUpperCase() === incoming.id.toUpperCase());
          const idxByName =
            idxById === -1
              ? merged.findIndex((p) => p.name.trim().toLowerCase() === incoming.name.trim().toLowerCase())
              : idxById;

          if (idxByName >= 0) {
            const existing = merged[idxByName];
            const combinedMachines = Array.from(new Set([...(existing.machineIds || []), ...(incoming.machineIds || [])]));
            merged[idxByName] = {
              ...existing,
              quantity: (existing.quantity || 0) + (incoming.quantity || 0),
              minRequired: incoming.minRequired || existing.minRequired,
              maxStock: Math.max(incoming.maxStock || 0, existing.maxStock || 0) || undefined,
              pricePerUnit: incoming.pricePerUnit > 0 ? incoming.pricePerUnit : existing.pricePerUnit,
              supplier: incoming.supplier || existing.supplier,
              machineIds: combinedMachines,
              lastReceiveDate: incoming.lastReceiveDate || existing.lastReceiveDate,
              lastIssueDate: incoming.lastIssueDate || existing.lastIssueDate,
              lastRestockedDate: incoming.lastRestockedDate || existing.lastRestockedDate,
              lastPRNo: incoming.lastPRNo || existing.lastPRNo,
              lastPONo: incoming.lastPONo || existing.lastPONo,
              lastWorkRequestNo: incoming.lastWorkRequestNo || existing.lastWorkRequestNo
            };
          } else {
            merged.push(incoming);
          }
        });
        return merged;
      });

      if (transactions.length > 0) {
        setStockTransactions((prev) => [...transactions, ...prev]);
      }
      showToast(`นำเข้าและผสานข้อมูล ${parts.length} รายการ พร้อมประวัติ ${transactions.length} รายการเรียบร้อย`);
    }
    setActiveTab('stock');
  };

  // Delete handlers
  const handleConfirmDeletePart = () => {
    if (!deletePartTarget) return;
    setSpareParts((prev) => prev.filter((p) => p.id !== deletePartTarget.id));
    setSelectedPartIds((prev) => prev.filter((id) => id !== deletePartTarget.id));
    showToast(`ลบอะไหล่ ${deletePartTarget.id} ออกจากคลังแล้ว`);
    setDeletePartTarget(null);
  };

  const handleConfirmBulkDelete = () => {
    const idSet = new Set(selectedPartIds);
    setSpareParts((prev) => prev.filter((p) => !idSet.has(p.id)));
    showToast(`ลบรายการที่เลือก ${selectedPartIds.length} รายการเรียบร้อยแล้ว`);
    setSelectedPartIds([]);
    setShowBulkDeleteModal(false);
  };

  const handleConfirmDeleteTx = () => {
    if (!deleteTxTarget) return;
    setStockTransactions((prev) => prev.filter((t) => t.id !== deleteTxTarget.id));
    showToast('ลบประวัติรายการเคลื่อนไหวเรียบร้อยแล้ว (ยอดคงเหลือปัจจุบันไม่เปลี่ยนแปลง)');
    setDeleteTxTarget(null);
  };

  // Export Multi-sheet Excel
  const handleExportFullExcel = () => {
    const wb = XLSX.utils.book_new();

    const masterRows = filteredParts.map((p) => {
      const st = getStockLevelStatus(p);
      const maxVal = getEffectiveMaxStock(p);
      const orderQty = getSuggestedOrderQty(p);
      return {
        'รหัสอะไหล่ (SKU)': p.id,
        'ชื่ออะไหล่': p.name,
        'หมวดหมู่': p.category,
        'ซัพพลายเออร์': p.supplier || '-',
        'เครื่องจักร': (p.machineIds || []).join(', ') || '-',
        'ตำแหน่งเก็บ': p.location || '-',
        'คงเหลือ': p.quantity,
        'หน่วย': p.unit,
        'Min': p.minRequired,
        'Max': maxVal,
        'สถานะสต๊อก': st === 'OUT' ? 'หมดสต๊อก' : st === 'LOW' ? 'ต่ำกว่า Min' : st === 'OVER' ? 'เกิน Max' : 'ปกติ',
        'แนะนำสั่งซื้อ': orderQty,
        'ราคา/หน่วย (บาท)': p.pricePerUnit,
        'มูลค่าคงเหลือ (บาท)': p.quantity * p.pricePerUnit,
        'รับเข้าล่าสุด': p.lastReceiveDate || '-',
        'จ่ายออกล่าสุด': p.lastIssueDate || '-',
        'PO ล่าสุด': p.lastPONo || '-',
        'ใบเบิก/แจ้งซ่อมล่าสุด': p.lastWorkRequestNo || '-'
      };
    });

    const reorderRows = spareParts
      .filter((p) => {
        const st = getStockLevelStatus(p);
        return st === 'OUT' || st === 'LOW';
      })
      .map((p) => {
        const orderQty = getSuggestedOrderQty(p);
        return {
          'รหัสอะไหล่ (SKU)': p.id,
          'ชื่ออะไหล่': p.name,
          'ซัพพลายเออร์': p.supplier || '-',
          'เครื่องจักร': (p.machineIds || []).join(', ') || '-',
          'คงเหลือปัจจุบัน': p.quantity,
          'Min': p.minRequired,
          'Max': getEffectiveMaxStock(p),
          'จำนวนแนะนำสั่งซื้อ': orderQty,
          'หน่วย': p.unit,
          'ราคา/หน่วย (บาท)': p.pricePerUnit,
          'งบประมาณสั่งซื้อ (บาท)': orderQty * p.pricePerUnit
        };
      });

    const txRows = filteredTransactions.map((tx) => ({
      'วันที่': tx.date,
      'ประเภท': tx.type === 'IN' ? 'รับเข้า (IN)' : tx.type === 'OUT' ? 'จ่ายออก (OUT)' : 'ปรับยอด (ADJUST)',
      'SKU': tx.partId,
      'ชื่ออะไหล่': tx.partName,
      'จำนวน': tx.type === 'OUT' ? -Math.abs(tx.quantity) : tx.quantity,
      'หน่วย': tx.unit,
      'คงเหลือก่อน': tx.balanceBefore,
      'คงเหลือหลัง': tx.balanceAfter,
      'ราคา/หน่วย': tx.unitPrice,
      'มูลค่ารวม (บาท)': tx.totalValue,
      'เลข PR': tx.prNo || '',
      'เลข PO': tx.poNo || '',
      'ซัพพลายเออร์': tx.supplier || '',
      'เครื่องจักร': tx.machineName || '',
      'ใบเบิก / เลขที่แจ้งซ่อม': tx.workRequestNo || '',
      'ผู้ดำเนินการ': tx.operatorName || '',
      'หมายเหตุ': tx.note || ''
    }));

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(masterRows), 'สต๊อกคงเหลือ_MinMax');
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(reorderRows.length > 0 ? reorderRows : [{ ข้อความ: 'ไม่มีรายการต่ำกว่า Min ในขณะนี้' }]),
      'รายการต้องสั่งซื้อ'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(txRows.length > 0 ? txRows : [{ ข้อความ: 'ยังไม่มีประวัติรับเข้า-จ่ายออก' }]),
      'ประวัติรับเข้า_จ่ายออก'
    );

    XLSX.writeFile(wb, `SpareParts_MinMax_StockCard_${getTodayIso()}.xlsx`);
    showToast('ส่งออกไฟล์ Excel สต๊อก + ใบสั่งซื้อ + Stock Card เรียบร้อยแล้ว');
  };

  const toggleSelectAllVisible = () => {
    if (selectedPartIds.length === filteredParts.length && filteredParts.length > 0) {
      setSelectedPartIds([]);
    } else {
      setSelectedPartIds(filteredParts.map((p) => p.id));
    }
  };

  const toggleSelectPart = (id: string) => {
    setSelectedPartIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const openHistoryForPart = (partId: string) => {
    setTxPartFilter(partId);
    setTxTypeFilter('ALL');
    setActiveTab('history');
  };

  return (
    <div id="inventory-page-root" className="space-y-4 pb-10">
      {/* Toast Notification */}
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

      {/* Header & Navigation Tabs */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shrink-0">
              <Package size={20} />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                คลังอะไหล่สำรอง (Min–Max &amp; ระบบรับเข้า–จ่ายออก)
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                ควบคุมสต๊อกด้วยเกณฑ์ Min–Max · บันทึกวันที่รับเข้า (PR/PO) และจ่ายออก (ใบเบิก/แจ้งซ่อม) · นำเข้า Excel อัตโนมัติ
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={() => openMovementModal('IN')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition cursor-pointer"
                >
                  <ArrowDownCircle size={15} />
                  <span>รับเข้า (IN)</span>
                </button>
                <button
                  type="button"
                  onClick={() => openMovementModal('OUT')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs transition cursor-pointer"
                >
                  <ArrowUpCircle size={15} />
                  <span>จ่ายออก (OUT)</span>
                </button>
                <button
                  type="button"
                  onClick={openAddPartModal}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs shadow-lg transition cursor-pointer"
                >
                  <Plus size={15} />
                  <span>เพิ่มอะไหล่ใหม่</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleExportFullExcel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition cursor-pointer"
            >
              <Download size={14} className="text-cyan-400" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* 3 Segmented Functional Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'stock'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Package size={14} />
            <span>1. สต๊อกคงเหลือ &amp; Min–Max ({kpis.totalSkus})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'history'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <History size={14} />
            <span>2. ประวัติรับเข้า–จ่ายออก ({stockTransactions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'import'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-950/60 text-emerald-300 hover:bg-slate-800 border border-emerald-500/30'
            }`}
          >
            <FileSpreadsheet size={14} />
            <span>3. นำเข้าจากไฟล์ Excel</span>
          </button>
        </div>
      </div>

      {/* =========================================================
          TAB 1: MASTER STOCK & MIN-MAX
         ========================================================= */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          {/* 5 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`text-left bg-slate-900/90 border rounded-2xl p-4 transition cursor-pointer ${
                statusFilter === 'ALL' ? 'border-cyan-500/60' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span>รายการอะไหล่ทั้งหมด</span>
                <Package size={15} className="text-cyan-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-white font-mono">{kpis.totalSkus}</span>
                <span className="text-xs text-slate-400">SKU</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                รวมคงเหลือ {kpis.totalPieces.toLocaleString()} ชิ้นในคลัง
              </p>
            </button>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between text-[11px] font-bold text-cyan-400">
                <span>มูลค่าสต๊อกคงเหลือรวม</span>
                <TrendingUp size={15} className="text-cyan-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-cyan-400 font-mono">
                  {Math.round(kpis.totalValue).toLocaleString()}
                </span>
                <span className="text-xs text-slate-400">บาท</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">คำนวณจาก คงเหลือ × ราคา/หน่วย</p>
            </div>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'OUT' ? 'ALL' : 'OUT')}
              className={`text-left bg-slate-900/90 border rounded-2xl p-4 transition cursor-pointer ${
                statusFilter === 'OUT' ? 'border-rose-500' : 'border-rose-500/30 hover:border-rose-500/60'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-rose-400">
                <span>หมดสต๊อก (0 ชิ้น)</span>
                <AlertTriangle size={15} className="text-rose-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-rose-400 font-mono">{kpis.outCount}</span>
                <span className="text-xs text-slate-400">รายการ</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">คลิกเพื่อกรองรายการที่หมดทันที</p>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'LOW' ? 'ALL' : 'LOW')}
              className={`text-left bg-slate-900/90 border rounded-2xl p-4 transition cursor-pointer ${
                statusFilter === 'LOW' ? 'border-amber-500' : 'border-amber-500/30 hover:border-amber-500/60'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-400">
                <span>ต่ำกว่าจุดสั่งซื้อ (≤ Min)</span>
                <ShoppingCart size={15} className="text-amber-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-400 font-mono">{kpis.lowCount}</span>
                <span className="text-xs text-slate-400">รายการ</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                งบเติมถึง Max ~ <span className="text-amber-300 font-mono font-bold">{Math.round(kpis.totalReorderBudget).toLocaleString()}</span> บ.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'OVER' ? 'ALL' : 'OVER')}
              className={`text-left bg-slate-900/90 border rounded-2xl p-4 transition cursor-pointer ${
                statusFilter === 'OVER' ? 'border-sky-500' : 'border-slate-800 hover:border-sky-500/50'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-sky-400">
                <span>สต๊อกเกิน Max (Overstock)</span>
                <BarChart3 size={15} className="text-sky-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-sky-400 font-mono">{kpis.overCount}</span>
                <span className="text-xs text-slate-400">รายการ</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                อยู่ในเกณฑ์ปกติ <span className="text-emerald-400 font-bold">{kpis.okCount}</span> รายการ
              </p>
            </button>
          </div>

          {/* Collapsible Auto-Updating Charts */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCharts((v) => !v)}
              className="w-full px-5 py-3 flex items-center justify-between text-xs font-bold text-slate-300 hover:bg-slate-800/40 transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <BarChart3 size={15} className="text-cyan-400" />
                กราฟวิเคราะห์สถานะ Min–Max และยอดรับเข้า–จ่ายออกรายเดือน (อัปเดตอัตโนมัติ)
              </span>
              {showCharts ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {showCharts && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 pt-1 border-t border-slate-800/80">
                <div className="lg:col-span-5">
                  <p className="text-xs font-bold text-slate-300 mb-2">สรุปสถานะสต๊อกตามเกณฑ์ Min–Max (จำนวน SKU)</p>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={healthChartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '10px',
                            fontSize: '12px',
                            color: '#f8fafc'
                          }}
                          formatter={(val: number) => [`${val} รายการ`, 'จำนวน']}
                        />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={44}>
                          {healthChartData.map((entry, idx) => (
                            <Cell key={`hcell-${idx}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="lg:col-span-7">
                  <p className="text-xs font-bold text-slate-300 mb-2">ปริมาณการรับเข้า (IN) เทียบกับจ่ายออก (OUT) รายเดือน</p>
                  {monthlyMovementChartData.length === 0 ? (
                    <div className="h-48 rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center text-xs text-slate-500">
                      <Calendar size={20} className="mb-1.5 text-slate-600" />
                      <span>ยังไม่มีประวัติรับเข้า–จ่ายออก กราฟจะแสดงอัตโนมัติเมื่อบันทึกรับ/จ่าย หรือนำเข้า Excel</span>
                    </div>
                  ) : (
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyMovementChartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="ym" tick={{ fill: '#94a3b8', fontSize: 11 }} />
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
                          <Bar dataKey="inQty" name="รับเข้า (ชิ้น)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                          <Bar dataKey="outQty" name="จ่ายออก (ชิ้น)" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={28} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Filters & Bulk Actions Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'ALL', label: `ทั้งหมด (${kpis.totalSkus})` },
                    { id: 'OUT', label: `หมด (${kpis.outCount})` },
                    { id: 'LOW', label: `ต่ำกว่า Min (${kpis.lowCount})` },
                    { id: 'OK', label: `ปกติ (${kpis.okCount})` },
                    { id: 'OVER', label: `เกิน Max (${kpis.overCount})` }
                  ] as { id: StockFilterStatus; label: string }[]
                ).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStatusFilter(st.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      statusFilter === st.id
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-950/60 text-slate-300 border border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>แสดง {filteredParts.length} รายการ</span>
                {canDelete && selectedPartIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowBulkDeleteModal(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>ลบที่เลือก ({selectedPartIds.length})</span>
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
                  placeholder="ค้นหา SKU, ชื่ออะไหล่, ซัพพลายเออร์, เครื่องจักร, เลข PO, ใบแจ้งซ่อม..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
              >
                <option value="ALL">หมวดหมู่: ทั้งหมด</option>
                {filterOptions.cats.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
              >
                <option value="ALL">ซัพพลายเออร์: ทั้งหมด</option>
                {filterOptions.suppliers.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={machineFilter}
                  onChange={(e) => setMachineFilter(e.target.value)}
                  className="px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                >
                  <option value="ALL">เครื่อง: ทั้งหมด</option>
                  {filterOptions.machineNames.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                >
                  <option value="status">เรียง: เร่งด่วนก่อน</option>
                  <option value="id">เรียง: SKU</option>
                  <option value="name">เรียง: ชื่อ ก-ฮ</option>
                  <option value="quantity">เรียง: คงเหลือน้อยสุด</option>
                  <option value="value">เรียง: มูลค่าสูงสุด</option>
                </select>
              </div>
            </div>
          </div>

          {/* Master Stock Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-800/90 text-slate-300 font-bold border-b border-slate-700">
                  <tr>
                    {canDelete && (
                      <th className="py-3 px-3 w-9 text-center">
                        <input
                          type="checkbox"
                          checked={filteredParts.length > 0 && selectedPartIds.length === filteredParts.length}
                          onChange={toggleSelectAllVisible}
                        />
                      </th>
                    )}
                    <th className="py-3 px-2.5 whitespace-nowrap">SKU / ตำแหน่ง</th>
                    <th className="py-3 px-3 min-w-[230px]">รายการอะไหล่ / ซัพพลายเออร์ / เครื่องจักร</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">คงเหลือ &amp; ระดับ Min–Max</th>
                    <th className="py-3 px-2.5 text-center whitespace-nowrap">สถานะ &amp; แนะนำสั่งซื้อ</th>
                    <th className="py-3 px-2.5 text-right whitespace-nowrap">ราคา / มูลค่าคงเหลือ</th>
                    <th className="py-3 px-2.5 whitespace-nowrap">รับเข้า / จ่ายออกล่าสุด</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">จัดการสต๊อก</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredParts.length === 0 ? (
                    <tr>
                      <td colSpan={canDelete ? 8 : 7} className="py-12 text-center text-slate-400">
                        ไม่พบรายการอะไหล่ตามเงื่อนไขที่เลือก
                      </td>
                    </tr>
                  ) : (
                    filteredParts.map((part) => {
                      const status = getStockLevelStatus(part);
                      const maxVal = getEffectiveMaxStock(part);
                      const orderQty = getSuggestedOrderQty(part);
                      const stockValue = (part.quantity || 0) * (part.pricePerUnit || 0);
                      const barDenom = Math.max(maxVal, part.quantity, part.minRequired, 1);
                      const fillPct = Math.min(100, Math.round((part.quantity / barDenom) * 100));

                      return (
                        <tr
                          key={part.id}
                          className={`transition ${
                            status === 'OUT'
                              ? 'bg-rose-950/15 hover:bg-rose-950/25'
                              : status === 'LOW'
                              ? 'bg-amber-950/10 hover:bg-amber-950/20'
                              : 'hover:bg-slate-800/40'
                          }`}
                        >
                          {canDelete && (
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={selectedPartIds.includes(part.id)}
                                onChange={() => toggleSelectPart(part.id)}
                              />
                            </td>
                          )}

                          <td className="py-3 px-2.5 whitespace-nowrap align-top">
                            <div className="font-mono font-extrabold text-cyan-400">{part.id}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{part.location || '-'}</div>
                          </td>

                          <td className="py-3 px-3 align-top">
                            <div className="font-bold text-white leading-snug">{part.name}</div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400 mt-1">
                              <span>{part.category}</span>
                              {part.supplier && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-slate-300">{part.supplier}</span>
                                </>
                              )}
                              {part.machineIds && part.machineIds.length > 0 && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-cyan-300 font-medium">
                                    เครื่อง: {part.machineIds.join(', ')}
                                  </span>
                                </>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3 align-top min-w-[140px]">
                            <div className="flex items-baseline justify-center gap-1 font-mono">
                              <span
                                className={`text-base font-black ${
                                  status === 'OUT'
                                    ? 'text-rose-400'
                                    : status === 'LOW'
                                    ? 'text-amber-400'
                                    : status === 'OVER'
                                    ? 'text-sky-400'
                                    : 'text-emerald-400'
                                }`}
                              >
                                {part.quantity}
                              </span>
                              <span className="text-[11px] text-slate-400">{part.unit}</span>
                            </div>
                            <div className="mt-1 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  status === 'OUT'
                                    ? 'bg-rose-500'
                                    : status === 'LOW'
                                    ? 'bg-amber-400'
                                    : status === 'OVER'
                                    ? 'bg-sky-400'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${fillPct}%` }}
                              />
                            </div>
                            <div className="mt-1 text-[10px] font-mono text-slate-400 text-center">
                              Min {part.minRequired} / Max {part.maxStock ?? maxVal}
                            </div>
                          </td>

                          <td className="py-3 px-2.5 text-center align-top whitespace-nowrap">
                            <div
                              className={`font-extrabold text-xs ${
                                status === 'OUT'
                                  ? 'text-rose-400'
                                  : status === 'LOW'
                                  ? 'text-amber-400'
                                  : status === 'OVER'
                                  ? 'text-sky-400'
                                  : 'text-emerald-400'
                              }`}
                            >
                              {status === 'OUT'
                                ? 'หมดสต๊อก'
                                : status === 'LOW'
                                ? 'ต่ำกว่า Min'
                                : status === 'OVER'
                                ? 'เกิน Max'
                                : 'ปกติ'}
                            </div>
                            {orderQty > 0 ? (
                              <div className="text-[11px] font-mono text-amber-300 mt-0.5">
                                แนะนำสั่ง +{orderQty} {part.unit}
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-500 mt-0.5">พร้อมใช้งาน</div>
                            )}
                          </td>

                          <td className="py-3 px-2.5 text-right align-top font-mono whitespace-nowrap">
                            <div className="text-slate-200 font-semibold">
                              {part.pricePerUnit.toLocaleString(undefined, { maximumFractionDigits: 2 })} บ.
                            </div>
                            <div className="text-[11px] text-cyan-400 mt-0.5">
                              รวม {Math.round(stockValue).toLocaleString()} บ.
                            </div>
                          </td>

                          <td className="py-3 px-2.5 align-top whitespace-nowrap text-[11px]">
                            <div className="text-emerald-300 font-mono">
                              รับ: {formatThaiShortDate(part.lastReceiveDate || part.lastRestockedDate)}
                            </div>
                            <div className="text-amber-300 font-mono mt-0.5">
                              จ่าย: {formatThaiShortDate(part.lastIssueDate)}
                            </div>
                            {(part.lastPONo || part.lastWorkRequestNo) && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {[part.lastPONo ? `PO:${part.lastPONo}` : '', part.lastWorkRequestNo ? `WR:${part.lastWorkRequestNo}` : '']
                                  .filter(Boolean)
                                  .join(' · ')}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3 align-top whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              {canEdit && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openMovementModal('IN', part)}
                                    className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/40 text-emerald-300 font-bold text-[11px] transition cursor-pointer"
                                    title="บันทึกรับเข้าสต๊อก"
                                  >
                                    + รับ
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openMovementModal('OUT', part)}
                                    className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/40 text-amber-300 font-bold text-[11px] transition cursor-pointer"
                                    title="บันทึกจ่ายออก / เบิกใช้"
                                  >
                                    - จ่าย
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => openHistoryForPart(part.id)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500/20 border border-slate-700 text-slate-300 hover:text-cyan-300 transition cursor-pointer"
                                title="ดูประวัติรับเข้า-จ่ายออกของอะไหล่นี้"
                              >
                                <History size={13} />
                              </button>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => openEditPartModal(part)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500/20 border border-slate-700 text-slate-300 hover:text-cyan-300 transition cursor-pointer"
                                  title="แก้ไขข้อมูลและค่า Min–Max"
                                >
                                  <Edit3 size={13} />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => setDeletePartTarget(part)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 border border-slate-700 text-slate-400 hover:text-rose-300 transition cursor-pointer"
                                  title="ลบรายการอะไหล่"
                                >
                                  <Trash2 size={13} />
                                </button>
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
        </div>
      )}

      {/* =========================================================
          TAB 2: STOCK CARD (RECEIVE / ISSUE HISTORY WITH DATES)
         ========================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4">
              <div className="text-[11px] font-bold text-emerald-400">ยอดรับเข้า (Stock IN)</div>
              <div className="mt-1.5 flex items-baseline gap-2 font-mono">
                <span className="text-2xl font-black text-emerald-400">+{txSummary.inQty.toLocaleString()}</span>
                <span className="text-xs text-slate-400">ชิ้น ({txSummary.inCount} ครั้ง)</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                มูลค่ารับเข้า {Math.round(txSummary.inValue).toLocaleString()} บาท
              </div>
            </div>

            <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4">
              <div className="text-[11px] font-bold text-amber-400">ยอดจ่ายออก / เบิกใช้ (Stock OUT)</div>
              <div className="mt-1.5 flex items-baseline gap-2 font-mono">
                <span className="text-2xl font-black text-amber-400">-{txSummary.outQty.toLocaleString()}</span>
                <span className="text-xs text-slate-400">ชิ้น ({txSummary.outCount} ครั้ง)</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                มูลค่าเบิกใช้ {Math.round(txSummary.outValue).toLocaleString()} บาท
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="text-[11px] font-bold text-cyan-400">บันทึกรายการเคลื่อนไหวทันที</div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {canEdit && (
                  <>
                    <button
                      type="button"
                      onClick={() => openMovementModal('IN', spareParts.find((p) => p.id === txPartFilter))}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold cursor-pointer"
                    >
                      + รับเข้า
                    </button>
                    <button
                      type="button"
                      onClick={() => openMovementModal('OUT', spareParts.find((p) => p.id === txPartFilter))}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold cursor-pointer"
                    >
                      - จ่ายออก
                    </button>
                    <button
                      type="button"
                      onClick={() => openMovementModal('ADJUST', spareParts.find((p) => p.id === txPartFilter))}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                    >
                      ปรับยอด ({txSummary.adjCount})
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'ALL', label: 'ทั้งหมด' },
                    { id: 'IN', label: 'รับเข้า (IN)' },
                    { id: 'OUT', label: 'จ่ายออก (OUT)' },
                    { id: 'ADJUST', label: 'ปรับยอด (ADJUST)' }
                  ] as { id: 'ALL' | StockTransactionType; label: string }[]
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTxTypeFilter(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      txTypeFilter === t.id
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-950/60 text-slate-300 border border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {(txPartFilter !== 'ALL' || txDateFrom || txDateTo || txSearch) && (
                <button
                  type="button"
                  onClick={() => {
                    setTxPartFilter('ALL');
                    setTxDateFrom('');
                    setTxDateTo('');
                    setTxSearch('');
                  }}
                  className="text-xs text-rose-300 hover:text-rose-200 font-semibold cursor-pointer"
                >
                  ล้างตัวกรองประวัติ
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              <div className="relative lg:col-span-2">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  placeholder="ค้นหาชื่ออะไหล่, เลข PR/PO, ใบเบิก/แจ้งซ่อม, เครื่องจักร, ผู้เบิก..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <Filter size={14} className="text-slate-400 shrink-0" />
                <select
                  value={txPartFilter}
                  onChange={(e) => setTxPartFilter(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                >
                  <option value="ALL">อะไหล่: ทุกรายการ</option>
                  {spareParts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} - {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <input
                type="date"
                value={txDateFrom}
                onChange={(e) => setTxDateFrom(e.target.value)}
                title="ตั้งแต่วันที่"
                className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono"
              />
              <input
                type="date"
                value={txDateTo}
                onChange={(e) => setTxDateTo(e.target.value)}
                title="ถึงวันที่"
                className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono"
              />
            </div>
          </div>

          {/* Transaction Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-800/90 text-slate-300 font-bold border-b border-slate-700">
                  <tr>
                    <th className="py-3 px-3 whitespace-nowrap">วันที่ทำรายการ</th>
                    <th className="py-3 px-2.5 text-center whitespace-nowrap">ประเภท</th>
                    <th className="py-3 px-3 min-w-[200px]">อะไหล่ (SKU)</th>
                    <th className="py-3 px-2.5 text-center whitespace-nowrap">จำนวน</th>
                    <th className="py-3 px-2.5 text-center whitespace-nowrap">คงเหลือ (ก่อน → หลัง)</th>
                    <th className="py-3 px-2.5 text-right whitespace-nowrap">มูลค่า (บาท)</th>
                    <th className="py-3 px-3 whitespace-nowrap">เอกสารอ้างอิง (PR/PO / ใบแจ้งซ่อม)</th>
                    <th className="py-3 px-3">เครื่องจักร / ซัพพลายเออร์ / ผู้ทำรายการ</th>
                    {canDelete && <th className="py-3 px-2.5 text-center">ลบ</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={canDelete ? 9 : 8} className="py-12 text-center text-slate-400">
                        ยังไม่มีประวัติรับเข้า–จ่ายออก (กดปุ่ม "รับเข้า" / "จ่ายออก" หรือนำเข้าจากไฟล์ Excel)
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono text-slate-200 whitespace-nowrap">
                          {formatThaiShortDate(tx.date)}
                        </td>
                        <td className="py-2.5 px-2.5 text-center whitespace-nowrap font-bold">
                          {tx.type === 'IN' ? (
                            <span className="text-emerald-400">รับเข้า (IN)</span>
                          ) : tx.type === 'OUT' ? (
                            <span className="text-amber-400">จ่ายออก (OUT)</span>
                          ) : (
                            <span className="text-sky-400">ปรับยอด</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-white">{tx.partName}</div>
                          <div className="text-[11px] font-mono text-cyan-400">{tx.partId}</div>
                        </td>
                        <td className="py-2.5 px-2.5 text-center font-mono font-extrabold whitespace-nowrap">
                          <span
                            className={
                              tx.type === 'IN'
                                ? 'text-emerald-400'
                                : tx.type === 'OUT'
                                ? 'text-amber-400'
                                : 'text-sky-400'
                            }
                          >
                            {tx.type === 'IN'
                              ? `+${Math.abs(tx.quantity)}`
                              : tx.type === 'OUT'
                              ? `-${Math.abs(tx.quantity)}`
                              : tx.quantity >= 0
                              ? `+${tx.quantity}`
                              : tx.quantity}{' '}
                            {tx.unit}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 text-center font-mono text-slate-300 whitespace-nowrap">
                          {tx.balanceBefore} → <strong className="text-white">{tx.balanceAfter}</strong>
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono text-slate-200 whitespace-nowrap">
                          {Math.round(tx.totalValue || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                          {tx.type === 'IN' ? (
                            <div>
                              {tx.prNo && <div>PR: {tx.prNo}</div>}
                              {tx.poNo && <div className="text-cyan-300">PO: {tx.poNo}</div>}
                              {!tx.prNo && !tx.poNo && <span className="text-slate-500">-</span>}
                            </div>
                          ) : tx.type === 'OUT' ? (
                            tx.workRequestNo ? (
                              <span className="text-amber-300 font-bold">ใบเบิก/แจ้งซ่อม: {tx.workRequestNo}</span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )
                          ) : (
                            <span className="text-slate-400">ตรวจนับสต๊อก</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-300">
                          <div>
                            {[
                              tx.machineName ? `เครื่อง: ${tx.machineName}` : '',
                              tx.supplier ? `ผู้ขาย: ${tx.supplier}` : '',
                              tx.operatorName ? `โดย: ${tx.operatorName}` : ''
                            ]
                              .filter(Boolean)
                              .join(' · ') || '-'}
                          </div>
                          {tx.note && <div className="text-slate-400 mt-0.5">{tx.note}</div>}
                        </td>
                        {canDelete && (
                          <td className="py-2.5 px-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => setDeleteTxTarget(tx)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 cursor-pointer"
                              title="ลบประวัติรายการนี้"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 3: SMART EXCEL IMPORTER
         ========================================================= */}
      {activeTab === 'import' && (
        <InventoryExcelImporter
          existingParts={spareParts}
          operatorName={currentUser?.name || 'ผู้ใช้งาน'}
          canEdit={canEdit}
          canDelete={canDelete}
          onApplyImport={handleApplyExcelImport}
        />
      )}

      {/* =========================================================
          MODAL 1: ADD / EDIT SPARE PART (WITH MIN-MAX & SUPPLIER)
         ========================================================= */}
      {partForm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#0b1222] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 z-10 bg-[#0b1222] border-b border-slate-800 px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {editingPart ? `แก้ไขข้อมูลอะไหล่ (${editingPart.id})` : 'เพิ่มรายการอะไหล่ใหม่เข้าคลัง'}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  กำหนดค่า Min–Max, ซัพพลายเออร์, ตำแหน่งเก็บ และเครื่องจักรที่ใช้งาน
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPartForm(null);
                  setEditingPart(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePartForm} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">รหัสอะไหล่ (SKU) *</label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingPart)}
                    value={partForm.id}
                    onChange={(e) => setPartForm({ ...partForm, id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 font-mono font-bold disabled:opacity-60"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">ชื่ออะไหล่ / สเปก (Short Text) *</label>
                  <input
                    type="text"
                    required
                    value={partForm.name}
                    onChange={(e) => setPartForm({ ...partForm, name: e.target.value })}
                    placeholder="เช่น Sensor Omron E3Z-R81 หรือ สายพาน PU 480x2220"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">หมวดหมู่</label>
                  <select
                    value={partForm.category}
                    onChange={(e) => setPartForm({ ...partForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  >
                    {filterOptions.cats.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">ซัพพลายเออร์หลัก (Supplier)</label>
                  <input
                    type="text"
                    list="inventory-supplier-datalist"
                    value={partForm.supplier}
                    onChange={(e) => setPartForm({ ...partForm, supplier: e.target.value })}
                    placeholder="เช่น เยนเนอรัล ซัพพลาย แอนด์ เซอร์วิส"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                  <datalist id="inventory-supplier-datalist">
                    {filterOptions.suppliers.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">เครื่องจักรที่ใช้ (คั่นด้วยจุลภาค)</label>
                  <input
                    type="text"
                    list="inventory-machine-datalist"
                    value={partForm.machineText}
                    onChange={(e) => setPartForm({ ...partForm, machineText: e.target.value })}
                    placeholder="เช่น Ulma, Banding, FFS, เครื่องหั่นหมูแดง"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                  <datalist id="inventory-machine-datalist">
                    {machines.map((m) => (
                      <option key={m.id} value={`${m.id} (${m.name})`} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">ตำแหน่งจัดเก็บ (Location / ชั้นวาง)</label>
                  <input
                    type="text"
                    value={partForm.location}
                    onChange={(e) => setPartForm({ ...partForm, location: e.target.value })}
                    placeholder="เช่น ตู้ A ชั้น 2"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
              </div>

              {/* Min-Max & Pricing */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    {editingPart ? 'คงเหลือ (ปรับผ่านรับ/จ่าย)' : 'ยอดยกมาเริ่มต้น'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    disabled={Boolean(editingPart)}
                    value={partForm.quantity}
                    onChange={(e) => setPartForm({ ...partForm, quantity: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-amber-400 font-bold mb-1">ค่า Min (จุดสั่งซื้อ) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={partForm.minRequired}
                    onChange={(e) => setPartForm({ ...partForm, minRequired: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-amber-500/40 text-amber-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sky-400 font-bold mb-1">ค่า Max (สูงสุด) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={partForm.maxStock}
                    onChange={(e) => setPartForm({ ...partForm, maxStock: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-sky-500/40 text-sky-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">หน่วยนับ</label>
                  <input
                    type="text"
                    value={partForm.unit}
                    onChange={(e) => setPartForm({ ...partForm, unit: e.target.value })}
                    placeholder="EA / PC / ชิ้น"
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">ราคา/หน่วย (บาท)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={partForm.pricePerUnit}
                    onChange={(e) => setPartForm({ ...partForm, pricePerUnit: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Lead Time รอของ (วัน)</label>
                  <input
                    type="number"
                    min={0}
                    value={partForm.leadTimeDays}
                    onChange={(e) => setPartForm({ ...partForm, leadTimeDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">รายละเอียดสเปก / หมายเหตุเพิ่มเติม</label>
                  <input
                    type="text"
                    value={partForm.specifications}
                    onChange={(e) => setPartForm({ ...partForm, specifications: e.target.value })}
                    placeholder="ระบุขนาด, เบอร์, รุ่นเทียบเคียง ฯลฯ"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setPartForm(null);
                    setEditingPart(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold cursor-pointer"
                >
                  {editingPart ? 'บันทึกการแก้ไข' : 'เพิ่มอะไหล่เข้าคลัง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 2: STOCK MOVEMENT (RECEIVE IN / ISSUE OUT / ADJUST)
         ========================================================= */}
      {movementForm && selectedMovementPart && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#0b1222] border border-slate-700 rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 z-10 bg-[#0b1222] border-b border-slate-800 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {movementForm.type === 'IN' ? (
                  <ArrowDownCircle size={19} className="text-emerald-400" />
                ) : movementForm.type === 'OUT' ? (
                  <ArrowUpCircle size={19} className="text-amber-400" />
                ) : (
                  <Sliders size={19} className="text-sky-400" />
                )}
                <h3 className="text-base font-extrabold text-white">
                  {movementForm.type === 'IN'
                    ? 'บันทึกรับเข้าอะไหล่ (Stock IN)'
                    : movementForm.type === 'OUT'
                    ? 'บันทึกจ่ายออก / เบิกอะไหล่ (Stock OUT)'
                    : 'ปรับยอดตรวจนับสต๊อก (Stock Adjust)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMovementForm(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMovement} className="p-5 space-y-4 text-xs">
              {/* Type Switcher */}
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'IN', label: '+ รับเข้า (IN)', activeClass: 'bg-emerald-500 text-slate-950' },
                    { id: 'OUT', label: '- จ่ายออก (OUT)', activeClass: 'bg-amber-500 text-slate-950' },
                    { id: 'ADJUST', label: 'ปรับยอดตรวจนับ', activeClass: 'bg-sky-500 text-slate-950' }
                  ] as { id: StockTransactionType; label: string; activeClass: string }[]
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      setMovementForm((prev) =>
                        prev ? { ...prev, type: t.id, targetBalance: selectedMovementPart.quantity } : prev
                      )
                    }
                    className={`py-2 rounded-xl font-extrabold transition cursor-pointer ${
                      movementForm.type === t.id
                        ? t.activeClass
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Select Part */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">รายการอะไหล่ *</label>
                <select
                  value={movementForm.partId}
                  onChange={(e) => {
                    const p = spareParts.find((x) => x.id === e.target.value);
                    setMovementForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            partId: e.target.value,
                            unitPrice: p?.pricePerUnit || 0,
                            supplier: p?.supplier || '',
                            machineName: p?.machineIds?.[0] || '',
                            targetBalance: p?.quantity || 0
                          }
                        : prev
                    );
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-semibold"
                >
                  {spareParts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} — {p.name} (คงเหลือ {p.quantity} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date + Quantity + Live Balance Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                <div>
                  <label className="block text-cyan-300 font-bold mb-1">
                    {movementForm.type === 'IN'
                      ? 'วันที่รับเข้าจริง *'
                      : movementForm.type === 'OUT'
                      ? 'วันที่จ่ายออกจริง *'
                      : 'วันที่ตรวจนับ *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={movementForm.date}
                    onChange={(e) => setMovementForm({ ...movementForm, date: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>

                {movementForm.type === 'ADJUST' ? (
                  <div>
                    <label className="block text-sky-400 font-bold mb-1">ยอดตรวจนับจริงใหม่ *</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={movementForm.targetBalance}
                      onChange={(e) => setMovementForm({ ...movementForm, targetBalance: Number(e.target.value) })}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-sky-500/40 text-white font-mono font-bold"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      จำนวน ({selectedMovementPart.unit}) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={movementForm.type === 'OUT' ? Math.max(1, selectedMovementPart.quantity) : undefined}
                      required
                      value={movementForm.quantity}
                      onChange={(e) => setMovementForm({ ...movementForm, quantity: Number(e.target.value) })}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">ยอดคงเหลือหลังบันทึก</label>
                  <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 font-mono font-extrabold text-center">
                    <span className="text-slate-400">{selectedMovementPart.quantity}</span>
                    <span className="mx-1.5 text-slate-500">→</span>
                    <span
                      className={
                        movementForm.type === 'IN'
                          ? 'text-emerald-400'
                          : movementForm.type === 'OUT'
                          ? 'text-amber-400'
                          : 'text-sky-400'
                      }
                    >
                      {movementForm.type === 'IN'
                        ? selectedMovementPart.quantity + Math.abs(Number(movementForm.quantity) || 0)
                        : movementForm.type === 'OUT'
                        ? Math.max(0, selectedMovementPart.quantity - Math.abs(Number(movementForm.quantity) || 0))
                        : Math.max(0, Number(movementForm.targetBalance) || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Conditional Fields for IN vs OUT */}
              {movementForm.type === 'IN' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">เลข Purchase Requisition (PR)</label>
                    <input
                      type="text"
                      value={movementForm.prNo}
                      onChange={(e) => setMovementForm({ ...movementForm, prNo: e.target.value })}
                      placeholder="เช่น 430134553"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">เลข Purchase Order (PO)</label>
                    <input
                      type="text"
                      value={movementForm.poNo}
                      onChange={(e) => setMovementForm({ ...movementForm, poNo: e.target.value })}
                      placeholder="เช่น 405295746"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">ซัพพลายเออร์ (Supplier)</label>
                    <input
                      type="text"
                      list="inventory-supplier-datalist-tx"
                      value={movementForm.supplier}
                      onChange={(e) => setMovementForm({ ...movementForm, supplier: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                    />
                    <datalist id="inventory-supplier-datalist-tx">
                      {filterOptions.suppliers.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">ราคา/หน่วยรอบนี้ (บาท)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={movementForm.unitPrice}
                      onChange={(e) => setMovementForm({ ...movementForm, unitPrice: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                    />
                  </div>
                </div>
              )}

              {movementForm.type === 'OUT' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-amber-300 font-semibold mb-1">ใบเบิก / เลขที่แจ้งซ่อม</label>
                    <input
                      type="text"
                      list="inventory-work-requests-datalist"
                      value={movementForm.workRequestNo}
                      onChange={(e) => setMovementForm({ ...movementForm, workRequestNo: e.target.value })}
                      placeholder="เช่น 164567, 171380"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                    />
                    <datalist id="inventory-work-requests-datalist">
                      {workRequests.slice(0, 60).map((wr) => (
                        <option key={wr.id} value={wr.ticketNo}>
                          {wr.machineName} - {wr.problemDetail?.slice(0, 40)}
                        </option>
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">เครื่องจักรที่เบิกไปติดตั้ง</label>
                    <input
                      type="text"
                      list="inventory-machines-tx-datalist"
                      value={movementForm.machineName}
                      onChange={(e) => setMovementForm({ ...movementForm, machineName: e.target.value })}
                      placeholder="เช่น Ulma, Reject, เครื่องหั่นหมูแดง"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                    />
                    <datalist id="inventory-machines-tx-datalist">
                      {filterOptions.machineNames.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    {movementForm.type === 'OUT' ? 'ช่างผู้เบิก' : 'ผู้รับของ / ผู้บันทึก'}
                  </label>
                  <input
                    type="text"
                    list="inventory-tech-datalist"
                    value={movementForm.operatorName}
                    onChange={(e) => setMovementForm({ ...movementForm, operatorName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                  <datalist id="inventory-tech-datalist">
                    {technicians.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">หมายเหตุ</label>
                  <input
                    type="text"
                    value={movementForm.note}
                    onChange={(e) => setMovementForm({ ...movementForm, note: e.target.value })}
                    placeholder="ระบุรายละเอียดเพิ่มเติม..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setMovementForm(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl font-extrabold cursor-pointer ${
                    movementForm.type === 'IN'
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      : movementForm.type === 'OUT'
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                  }`}
                >
                  ยืนยันบันทึกรายการ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Part Confirmation Modal */}
      {deletePartTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1222] border border-rose-500/40 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400">
              <Trash2 size={20} />
              <h3 className="text-base font-extrabold text-white">ยืนยันการลบอะไหล่</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              ต้องการลบรายการ <strong className="text-white">{deletePartTarget.id} — {deletePartTarget.name}</strong> ออกจากคลังใช่หรือไม่?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletePartTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePart}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold cursor-pointer"
              >
                ยืนยันลบรายการ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1222] border border-rose-500/40 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400">
              <Trash2 size={20} />
              <h3 className="text-base font-extrabold text-white">ยืนยันลบอะไหล่หลายรายการ</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              ต้องการลบอะไหล่ที่เลือกทั้งหมด <strong className="text-rose-300">{selectedPartIds.length} รายการ</strong> ออกจากคลังใช่หรือไม่?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold cursor-pointer"
              >
                ยืนยันลบทั้งหมด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Transaction Confirmation Modal */}
      {deleteTxTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1222] border border-rose-500/40 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400">
              <Trash2 size={20} />
              <h3 className="text-base font-extrabold text-white">ยืนยันลบประวัติเคลื่อนไหว</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              ต้องการลบประวัติรายการ <strong className="text-white">{deleteTxTarget.partName}</strong> วันที่ {formatThaiShortDate(deleteTxTarget.date)} ใช่หรือไม่? (ยอดคงเหลือปัจจุบันในคลังจะไม่ถูกเปลี่ยนแปลง)
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTxTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTx}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold cursor-pointer"
              >
                ยืนยันลบประวัติ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
