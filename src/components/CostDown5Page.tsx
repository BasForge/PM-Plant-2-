import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { CD5Project, CD5Category, CD5Status } from '../types';
import * as XLSX from 'xlsx';
import { 
  TrendingDown, Plus, Search, Printer, Trash2, Edit3, Eye, 
  ShieldCheck, CheckCircle2, DollarSign, Clock, Layers, 
  FileSpreadsheet, Check, X, Calculator, SlidersHorizontal, Scale,
  Calendar, History, AlertTriangle
} from 'lucide-react';
import { CD5LifespanMeter } from './cd5/CD5LifespanMeter';
import { CD5UsageHistoryModal } from './cd5/CD5UsageHistoryModal';

// Helper to compress uploaded images to prevent Firestore/LocalStorage quota errors
const compressImage = (file: File, maxWidth = 1000, quality = 0.75): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

export const CostDown5Page: React.FC = () => {
  const { cd5Projects, setCd5Projects, machines, technicians } = useApp();

  // Filters & Search States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [machineFilter, setMachineFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals & Action States
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingProject, setEditingProject] = useState<CD5Project | null>(null);
  const [viewingProject, setViewingProject] = useState<CD5Project | null>(null);
  const [historyTrackingProject, setHistoryTrackingProject] = useState<CD5Project | null>(null);
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; title: string } | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-dismiss notification
  React.useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(t);
  }, [notification]);

  // Form State for Add / Edit
  const [formTitle, setFormTitle] = useState<string>('');
  const [formCategory, setFormCategory] = useState<CD5Category>('เขียนแบบสั่งทำเอง (Custom Fabrication)');
  const [formMachineId, setFormMachineId] = useState<string>('VAC01');
  const [formPartName, setFormPartName] = useState<string>('');
  const [formPartCode, setFormPartCode] = useState<string>('');
  const [formProposer, setFormProposer] = useState<string>(technicians[0] || 'ช่าง 1');
  const [formCoTechs, setFormCoTechs] = useState<string[]>([]);
  const [formStartDate, setFormStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formApprovedDate, setFormApprovedDate] = useState<string>('');
  const [formInstalledDate, setFormInstalledDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formStatus, setFormStatus] = useState<CD5Status>('กำลังทดสอบ');

  // Original specs form
  const [formOrigSupplier, setFormOrigSupplier] = useState<string>('');
  const [formOrigPrice, setFormOrigPrice] = useState<number>(0);
  const [formOrigLifespan, setFormOrigLifespan] = useState<number>(30);
  const [formOrigLifespanUnit, setFormOrigLifespanUnit] = useState<string>('วัน');
  const [formOrigQuality, setFormOrigQuality] = useState<string>('');
  const [formPhotoOrig, setFormPhotoOrig] = useState<string>('');

  // New specs form
  const [formNewSupplier, setFormNewSupplier] = useState<string>('');
  const [formNewPrice, setFormNewPrice] = useState<number>(0);
  const [formNewLifespan, setFormNewLifespan] = useState<number>(60);
  const [formNewLifespanUnit, setFormNewLifespanUnit] = useState<string>('วัน');
  const [formNewQuality, setFormNewQuality] = useState<string>('');
  const [formPhotoNew, setFormPhotoNew] = useState<string>('');
  const [formDrawingPhoto, setFormDrawingPhoto] = useState<string>('');

  // Metrics form
  const [formAnnualUsage, setFormAnnualUsage] = useState<number>(12);
  const [formEngineeringDetails, setFormEngineeringDetails] = useState<string>('');
  const [formFoodGradeCompliance, setFormFoodGradeCompliance] = useState<boolean>(true);
  const [formSafetyNotes, setFormSafetyNotes] = useState<string>('');

  // Categories list
  const CATEGORIES: CD5Category[] = [
    'เขียนแบบสั่งทำเอง (Custom Fabrication)',
    'ยืดอายุการใช้งาน (Lifetime Extension)',
    'เทียบเคียงแบรนด์ทางเลือก (Equivalent Brand)',
    'ซ่อมฟื้นฟูสภาพ (Reconditioning)',
    'ลดต้นทุนงาน PM/ซ่อม (PM/Repair Cost Down)'
  ];

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingProject(null);
    setFormTitle('');
    setFormCategory('เขียนแบบสั่งทำเอง (Custom Fabrication)');
    setFormMachineId(machines[0]?.id || 'VAC01');
    setFormPartName('');
    setFormPartCode('');
    setFormProposer(technicians[0] || 'ช่าง 1');
    setFormCoTechs([]);
    const today = new Date().toISOString().split('T')[0];
    setFormStartDate(today);
    setFormApprovedDate('');
    setFormInstalledDate(today);
    setFormStatus('กำลังทดสอบ');

    setFormOrigSupplier('OEM เจ้าของเครื่องจักร / ผู้ผลิตต่างประเทศ');
    setFormOrigPrice(5000);
    setFormOrigLifespan(30);
    setFormOrigLifespanUnit('วัน');
    setFormOrigQuality('');
    setFormPhotoOrig('');

    setFormNewSupplier('เขียนแบบสั่งทำในประเทศ / ร้านกลึง CNC');
    setFormNewPrice(1500);
    setFormNewLifespan(90);
    setFormNewLifespanUnit('วัน');
    setFormNewQuality('');
    setFormPhotoNew('');
    setFormDrawingPhoto('');

    setFormAnnualUsage(12);
    setFormEngineeringDetails('');
    setFormFoodGradeCompliance(true);
    setFormSafetyNotes('');
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (p: CD5Project) => {
    setEditingProject(p);
    setFormTitle(p.title);
    setFormCategory(p.category);
    setFormMachineId(p.machineId || machines[0]?.id || 'VAC01');
    setFormPartName(p.partName);
    setFormPartCode(p.partCode || '');
    setFormProposer(p.proposerTechnician);
    setFormCoTechs(p.coTechnicians || []);
    setFormStartDate(p.startDate);
    setFormApprovedDate(p.approvedDate || '');
    setFormInstalledDate(p.installedDate || p.startDate);
    setFormStatus(p.status);

    setFormOrigSupplier(p.originalSupplier);
    setFormOrigPrice(p.originalPrice);
    setFormOrigLifespan(p.originalLifespanDays);
    setFormOrigLifespanUnit(p.originalLifespanUnit || 'วัน');
    setFormOrigQuality(p.originalQualityNotes);
    setFormPhotoOrig(p.photoOriginal || '');

    setFormNewSupplier(p.newSupplierOrFabricator);
    setFormNewPrice(p.newPrice);
    setFormNewLifespan(p.newLifespanDays);
    setFormNewLifespanUnit(p.newLifespanUnit || 'วัน');
    setFormNewQuality(p.newQualityNotes);
    setFormPhotoNew(p.photoNew || '');
    setFormDrawingPhoto(p.drawingPhoto || '');

    setFormAnnualUsage(p.annualUsageQty);
    setFormEngineeringDetails(p.engineeringDetails);
    setFormFoodGradeCompliance(p.foodGradeCompliance);
    setFormSafetyNotes(p.safetyNotes || '');
    setShowAddModal(true);
  };

  // Handle Save Project
  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formPartName.trim()) {
      setFormError('กรุณากรอกชื่อโครงการ และชื่อชิ้นส่วนอะไหล่ให้ครบถ้วน');
      return;
    }
    setFormError(null);

    const origPrice = Math.max(0, Number(formOrigPrice) || 0);
    const newPrice = Math.max(0, Number(formNewPrice) || 0);
    const annualQty = Math.max(1, Number(formAnnualUsage) || 1);
    const origLife = Math.max(1, Number(formOrigLifespan) || 1);
    const newLife = Math.max(1, Number(formNewLifespan) || 1);

    const annualOrigCost = origPrice * annualQty;
    const annualNewCost = newPrice * annualQty;
    const annualSavings = Math.max(0, annualOrigCost - annualNewCost);
    const savingsPercent = origPrice > 0 ? Number((((origPrice - newPrice) / origPrice) * 100).toFixed(1)) : 0;
    const lifespanExtPercent = origLife > 0 ? Number((((newLife - origLife) / origLife) * 100).toFixed(1)) : 0;

    if (editingProject) {
      const updated: CD5Project = {
        ...editingProject,
        title: formTitle.trim(),
        category: formCategory,
        machineId: formMachineId,
        partName: formPartName.trim(),
        partCode: formPartCode.trim() || undefined,
        proposerTechnician: formProposer,
        coTechnicians: formCoTechs,
        startDate: formStartDate,
        approvedDate: formApprovedDate || undefined,
        installedDate: formInstalledDate || undefined,
        status: formStatus,
        originalSupplier: formOrigSupplier.trim(),
        originalPrice: origPrice,
        originalLifespanDays: origLife,
        originalLifespanUnit: formOrigLifespanUnit,
        originalQualityNotes: formOrigQuality.trim(),
        photoOriginal: formPhotoOrig || undefined,
        newSupplierOrFabricator: formNewSupplier.trim(),
        newPrice: newPrice,
        newLifespanDays: newLife,
        newLifespanUnit: formNewLifespanUnit,
        newQualityNotes: formNewQuality.trim(),
        photoNew: formPhotoNew || undefined,
        drawingPhoto: formDrawingPhoto || undefined,
        annualUsageQty: annualQty,
        annualOriginalCost: annualOrigCost,
        annualNewCost: annualNewCost,
        annualSavings: annualSavings,
        savingsPercent: savingsPercent,
        lifespanExtensionPercent: lifespanExtPercent,
        engineeringDetails: formEngineeringDetails.trim(),
        foodGradeCompliance: formFoodGradeCompliance,
        safetyNotes: formSafetyNotes.trim() || undefined
      };

      setCd5Projects(prev => prev.map(item => item.id === updated.id ? updated : item));
      if (viewingProject?.id === updated.id) setViewingProject(updated);
      setNotification({
        type: 'success',
        message: `บันทึกการแก้ไขโครงการ "${updated.title}" สำเร็จเรียบร้อยแล้ว`
      });
    } else {
      // Calculate strictly unique sequential ID without duplicate risk
      const currentYear = new Date().getFullYear();
      const existingNums = cd5Projects.map(p => {
        const match = p.id.match(/CD5-\d+-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      });
      const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 0;
      const nextSeq = maxNum + 1;
      const newId = `CD5-${currentYear}-${String(nextSeq).padStart(3, '0')}`;

      const newProj: CD5Project = {
        id: newId,
        title: formTitle.trim(),
        category: formCategory,
        machineId: formMachineId,
        partName: formPartName.trim(),
        partCode: formPartCode.trim() || undefined,
        proposerTechnician: formProposer,
        coTechnicians: formCoTechs,
        startDate: formStartDate,
        approvedDate: formApprovedDate || undefined,
        installedDate: formInstalledDate || undefined,
        status: formStatus,
        originalSupplier: formOrigSupplier.trim(),
        originalPrice: origPrice,
        originalLifespanDays: origLife,
        originalLifespanUnit: formOrigLifespanUnit,
        originalQualityNotes: formOrigQuality.trim(),
        photoOriginal: formPhotoOrig || undefined,
        newSupplierOrFabricator: formNewSupplier.trim(),
        newPrice: newPrice,
        newLifespanDays: newLife,
        newLifespanUnit: formNewLifespanUnit,
        newQualityNotes: formNewQuality.trim(),
        photoNew: formPhotoNew || undefined,
        drawingPhoto: formDrawingPhoto || undefined,
        annualUsageQty: annualQty,
        annualOriginalCost: annualOrigCost,
        annualNewCost: annualNewCost,
        annualSavings: annualSavings,
        savingsPercent: savingsPercent,
        lifespanExtensionPercent: lifespanExtPercent,
        engineeringDetails: formEngineeringDetails.trim(),
        foodGradeCompliance: formFoodGradeCompliance,
        safetyNotes: formSafetyNotes.trim() || undefined,
        createdAt: new Date().toISOString().split('T')[0],
        usageHistory: [
          {
            id: `HIST-${Date.now()}`,
            cycleNumber: 1,
            partType: 'NEW_CUSTOM',
            installedDate: formInstalledDate || new Date().toISOString().split('T')[0],
            status: 'ACTIVE_RUNNING',
            actualRunningDays: 1,
            targetLifespanDays: newLife,
            originalOemDays: origLife,
            lifespanExtensionPercent: lifespanExtPercent,
            wearCondition: 'เริ่มติดตั้งใช้งานจริงในสายการผลิต',
            technician: formProposer,
            notes: 'รอบแรกของการติดตั้งใช้งานอะไหล่ CD5'
          }
        ]
      };

      setCd5Projects(prev => [newProj, ...prev]);
      setNotification({
        type: 'success',
        message: `บันทึกโครงการ Cost Down 5 ใหม่ "${newProj.title}" (รหัส: ${newProj.id}) เรียบร้อยแล้ว`
      });
    }

    setShowAddModal(false);
  };

  // Update history from modal
  const handleSaveHistory = (updatedProject: CD5Project) => {
    setCd5Projects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    setHistoryTrackingProject(updatedProject);
    if (viewingProject?.id === updatedProject.id) {
      setViewingProject(updatedProject);
    }
  };

  // Delete project trigger
  const handleDeleteProject = (id: string, title: string) => {
    setProjectToDelete({ id, title });
  };

  // Confirmed Delete execution
  const handleConfirmDelete = () => {
    if (!projectToDelete) return;
    const { id, title } = projectToDelete;
    setCd5Projects(prev => prev.filter(p => p.id !== id));
    if (viewingProject?.id === id) {
      setViewingProject(null);
    }
    setProjectToDelete(null);
    setNotification({
      type: 'success',
      message: `ลบโครงการ "${title}" (${id}) ออกจากระบบแล้ว`
    });
  };

  // Image Upload helper with automatic smart compression
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedDataUrl = await compressImage(file, 1000, 0.75);
      setter(compressedDataUrl);
    } catch (err) {
      console.warn("Error compressing image, fallback to standard reader:", err);
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setter(uploadEvent.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Filtered Projects
  const filteredProjects = useMemo(() => {
    return cd5Projects.filter(p => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (machineFilter !== 'all' && p.machineId !== machineFilter) return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.partName.toLowerCase().includes(q) ||
          (p.partCode && p.partCode.toLowerCase().includes(q)) ||
          (p.machineId && p.machineId.toLowerCase().includes(q)) ||
          p.proposerTechnician.toLowerCase().includes(q) ||
          p.originalSupplier.toLowerCase().includes(q) ||
          p.newSupplierOrFabricator.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [cd5Projects, categoryFilter, statusFilter, machineFilter, searchQuery]);

  // Aggregate Metrics
  const totalAnnualSavings = useMemo(() => cd5Projects.reduce((sum, p) => sum + (p.annualSavings || 0), 0), [cd5Projects]);
  const approvedAnnualSavings = useMemo(() => cd5Projects.filter(p => p.status === 'อนุมัติใช้งานจริง').reduce((sum, p) => sum + (p.annualSavings || 0), 0), [cd5Projects]);
  const avgCostReduction = useMemo(() => {
    if (cd5Projects.length === 0) return 0;
    return Number((cd5Projects.reduce((s, p) => s + (p.savingsPercent || 0), 0) / cd5Projects.length).toFixed(1));
  }, [cd5Projects]);
  const avgLifespanExtension = useMemo(() => {
    if (cd5Projects.length === 0) return 0;
    return Number((cd5Projects.reduce((s, p) => s + (p.lifespanExtensionPercent || 0), 0) / cd5Projects.length).toFixed(1));
  }, [cd5Projects]);

  const getMachineName = (id?: string) => {
    if (!id) return '-';
    const m = machines.find(mac => mac.id === id);
    return m ? `${m.id} - ${m.name}` : id;
  };

  // Export Excel
  const handleExportExcel = () => {
    const excelData = filteredProjects.map((p, index) => {
      const runningDays = p.installedDate 
        ? Math.max(0, Math.floor((new Date().getTime() - new Date(p.installedDate).getTime()) / (1000 * 3600 * 24)))
        : 0;

      return {
        'ลำดับ': index + 1,
        'รหัสโครงการ': p.id,
        'ชื่อโครงการ Cost Down': p.title,
        'หมวดหมู่งาน CD5': p.category,
        'รหัสเครื่องจักร': p.machineId || '-',
        'ชื่อเครื่องจักร': getMachineName(p.machineId),
        'ชื่อชิ้นส่วนอะไหล่': p.partName,
        'รหัสอะไหล่': p.partCode || '-',
        'ช่างผู้เสนอ/รับผิดชอบ': p.proposerTechnician,
        'สถานะโครงการ': p.status,
        'วันที่เริ่มติดตั้ง/ใช้งาน': p.installedDate || '-',
        'จำนวนวันใช้งานจริงสะสม (วัน)': runningDays,
        'ผู้ผลิตเดิม (Original OEM)': p.originalSupplier,
        'ราคาเดิมต่อชิ้น (บาท)': p.originalPrice,
        'อายุใช้งานเดิม (วัน)': p.originalLifespanDays,
        'ผู้ผลิตใหม่/ร้านสั่งทำ': p.newSupplierOrFabricator,
        'ราคาใหม่ต่อชิ้น (บาท)': p.newPrice,
        'อายุใช้งานใหม่ (วัน)': p.newLifespanDays,
        'ส่วนต่างประหยัดต่อชิ้น (บาท)': p.originalPrice - p.newPrice,
        'อัตราประหยัดต่อชิ้น (%)': `${p.savingsPercent}%`,
        'อัตรายืดอายุการใช้งาน (%)': `+${p.lifespanExtensionPercent}%`,
        'ปริมาณใช้งานต่อปี (ชิ้น)': p.annualUsageQty,
        'ต้นทุนเดิมต่อปี (บาท)': p.annualOriginalCost,
        'ต้นทุนใหม่ต่อปี (บาท)': p.annualNewCost,
        'ยอดประหยัดรวมต่อปี (บาท)': p.annualSavings,
        'จำนวนรอบประวัติสะสม': p.usageHistory?.length || 0,
        'มาตรฐาน Food Grade GMP': p.foodGradeCompliance ? 'ผ่านเกณฑ์ 100%' : 'N/A',
        'รายละเอียดวิศวกรรม/Drawing': p.engineeringDetails
      };
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cost_Down_5_Report');
    XLSX.writeFile(wb, `Cost_Down_5_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Build Self-Contained Print HTML
  const buildStandaloneCD5ReportHTML = () => {
    const dateStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const rowsHTML = filteredProjects.map((p, idx) => {
      const statusBg = p.status === 'อนุมัติใช้งานจริง' ? '#dcfce7' : p.status === 'กำลังทดสอบ' ? '#fef3c7' : '#f1f5f9';
      const statusColor = p.status === 'อนุมัติใช้งานจริง' ? '#166534' : p.status === 'กำลังทดสอบ' ? '#92400e' : '#475569';
      const runningDays = p.installedDate 
        ? Math.max(0, Math.floor((new Date().getTime() - new Date(p.installedDate).getTime()) / (1000 * 3600 * 24)))
        : 0;

      const historyRows = p.usageHistory && p.usageHistory.length > 0 
        ? p.usageHistory.map(h => {
            const isOngoing = h.status === 'ACTIVE_RUNNING' || !h.replacedDate;
            const dynamicDays = (isOngoing && h.installedDate)
              ? Math.max(1, Math.floor((new Date().getTime() - new Date(h.installedDate).getTime()) / (1000 * 3600 * 24)))
              : (h.actualRunningDays || 1);

            return `
              <tr style="border-bottom:1px solid #e2e8f0; font-size:10px;">
                <td style="padding:4px 6px; font-weight:bold;">รอบ ${h.cycleNumber}</td>
                <td style="padding:4px 6px;">${h.partType === 'NEW_CUSTOM' ? '🟢 อะไหล่ CD5' : '🔴 OEM เดิม'}</td>
                <td style="padding:4px 6px;">${h.installedDate} ➔ ${h.replacedDate || 'ปัจจุบัน (ใช้งานอยู่)'}</td>
                <td style="padding:4px 6px; font-weight:bold; color:#166534;">${dynamicDays} วัน</td>
                <td style="padding:4px 6px; color:#475569;">${h.wearCondition || '-'}</td>
                <td style="padding:4px 6px;">${h.technician}</td>
              </tr>
            `;
          }).join('')
        : '<tr><td colspan="6" style="padding:4px; text-align:center; color:#94a3b8; font-size:10px;">ยังไม่มีประวัติรอบการใช้งาน</td></tr>';

      return `
        <div style="border:1px solid #cbd5e1; border-radius:8px; padding:14px; margin-bottom:14px; background:#ffffff; page-break-inside:avoid; break-inside:avoid;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid #e2e8f0; padding-bottom:8px; margin-bottom:8px;">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:13px; font-weight:bold; color:#0f172a;">#${idx + 1} [${p.id}] ${p.title}</span>
                <span style="font-size:10px; font-weight:bold; background:${statusBg}; color:${statusColor}; padding:2px 8px; border-radius:4px; border:1px solid #cbd5e1;">
                  ${p.status}
                </span>
              </div>
              <p style="margin:4px 0 0 0; font-size:11px; color:#475569;">
                <b>อะไหล่:</b> ${p.partName} ${p.partCode ? `(${p.partCode})` : ''} | <b>เครื่องจักร:</b> ${getMachineName(p.machineId)} | <b>ผู้เสนอ:</b> ${p.proposerTechnician}
              </p>
              <p style="margin:2px 0 0 0; font-size:11px; color:#0369a1;">
                📅 <b>วันที่เริ่มติดตั้งใช้งาน:</b> ${p.installedDate || 'ไม่ระบุ'} | <b>เดินเครื่องใช้งานจริงแล้ว:</b> <b style="color:#15803d;">${runningDays} วัน</b> (เทียบ OEM เดิม ${p.originalLifespanDays} วัน)
              </p>
            </div>
            <div style="text-align:right;">
              <span style="font-size:12px; font-weight:bold; background:#dcfce7; color:#166534; border:1px solid #86efac; padding:4px 10px; border-radius:6px;">
                ประหยัด ฿${p.annualSavings.toLocaleString()}/ปี (${p.savingsPercent}%)
              </span>
            </div>
          </div>

          <!-- COMPARISON BOX -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
            <!-- ORIGINAL -->
            <div style="background:#fff1f2; border:1px solid #fecdd3; border-radius:6px; padding:10px; font-size:11px;">
              <p style="margin:0 0 4px 0; font-weight:bold; color:#9f1239; font-size:11px;">🔴 ของเดิม (Original OEM)</p>
              <p style="margin:2px 0;"><b>ผู้ผลิต:</b> ${p.originalSupplier}</p>
              <p style="margin:2px 0;"><b>ราคาต่อชิ้น:</b> <span style="font-weight:bold; color:#dc2626;">฿${p.originalPrice.toLocaleString()}</span></p>
              <p style="margin:2px 0;"><b>อายุการใช้งานเดิม:</b> ${p.originalLifespanDays} ${p.originalLifespanUnit || 'วัน'}</p>
              <p style="margin:4px 0 0 0; font-size:10px; color:#64748b;">${p.originalQualityNotes || '-'}</p>
              ${p.photoOriginal ? `<div style="margin-top:6px; height:100px; text-align:center; background:#ffffff; border:1px solid #fda4af; border-radius:4px; overflow:hidden;"><img src="${p.photoOriginal}" style="max-height:100px; max-width:100%; object-fit:contain;" /></div>` : ''}
            </div>

            <!-- NEW COST DOWN -->
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:10px; font-size:11px;">
              <p style="margin:0 0 4px 0; font-weight:bold; color:#166534; font-size:11px;">🟢 ปรับปรุงใหม่ (Cost Down / สั่งทำ CD5)</p>
              <p style="margin:2px 0;"><b>ผู้ผลิต/สั่งทำ:</b> ${p.newSupplierOrFabricator}</p>
              <p style="margin:2px 0;"><b>ราคาใหม่ต่อชิ้น:</b> <span style="font-weight:bold; color:#16a34a;">฿${p.newPrice.toLocaleString()}</span> (ลดลง ${p.savingsPercent}%)</p>
              <p style="margin:2px 0;"><b>อายุการใช้งานเป้าหมาย:</b> <span style="font-weight:bold; color:#15803d;">${p.newLifespanDays} ${p.newLifespanUnit || 'วัน'}</span> (+${p.lifespanExtensionPercent}%)</p>
              <p style="margin:4px 0 0 0; font-size:10px; color:#166534;">${p.newQualityNotes || '-'}</p>
              <div style="display:flex; gap:6px; margin-top:6px;">
                ${p.photoNew ? `<div style="flex:1; height:100px; text-align:center; background:#ffffff; border:1px solid #86efac; border-radius:4px; overflow:hidden;"><img src="${p.photoNew}" style="max-height:100px; max-width:100%; object-fit:contain;" /></div>` : ''}
                ${p.drawingPhoto ? `<div style="flex:1; height:100px; text-align:center; background:#ffffff; border:1px solid #86efac; border-radius:4px; overflow:hidden;"><img src="${p.drawingPhoto}" style="max-height:100px; max-width:100%; object-fit:contain;" /></div>` : ''}
              </div>
            </div>
          </div>

          <!-- USAGE HISTORY LOG TABLE -->
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px; margin-bottom:8px;">
            <p style="margin:0 0 4px 0; font-size:11px; font-weight:bold; color:#0f172a;">📜 ประวัติการใช้งาน & การยืดอายุอะไหล่จริง:</p>
            <table style="width:100%; border-collapse:collapse; text-align:left;">
              <thead>
                <tr style="background:#e2e8f0; font-size:10px; color:#334155;">
                  <th style="padding:4px 6px;">รอบที่</th>
                  <th style="padding:4px 6px;">ชนิด</th>
                  <th style="padding:4px 6px;">ช่วงเวลาใช้งาน</th>
                  <th style="padding:4px 6px;">วันใช้งานจริง</th>
                  <th style="padding:4px 6px;">สภาพการสึกหรอ</th>
                  <th style="padding:4px 6px;">ผู้บันทึก</th>
                </tr>
              </thead>
              <tbody>
                ${historyRows}
              </tbody>
            </table>
          </div>

          <div style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:6px 10px; font-size:10px; color:#334155;">
            <b>รายละเอียดวิศวกรรม & Drawing:</b> ${p.engineeringDetails || '-'} | <b>มาตรฐาน Food Grade GMP:</b> ${p.foodGradeCompliance ? '✅ สอดคล้อง 100%' : 'N/A'}
          </div>
        </div>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>รายงานสรุปโครงการ Cost Down 5 (CD5)</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 portrait; margin: 12mm 12mm 15mm 12mm; }
          body { margin:0; padding:0; background:#f1f5f9; font-family:'Sarabun', -apple-system, sans-serif; color:#0f172a; }
          .page-container { max-width: 820px; margin: 0 auto; background: #ffffff; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
          .no-print-bar { position:sticky; top:0; background:#0f172a; color:#ffffff; padding:12px 24px; display:flex; justify-content:space-between; align-items:center; z-index:999; }
          .btn-print { background:#16a34a; color:#ffffff; border:none; padding:8px 18px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:13px; font-family:'Sarabun', sans-serif; }
          @media print {
            .no-print-bar { display: none !important; }
            body { background: #ffffff !important; }
            .page-container { box-shadow: none !important; padding: 0 !important; width: 100% !important; max-width: 100% !important; }
          }
        </style>
      </head>
      <body>
        <div class="no-print-bar">
          <div>
            <b style="font-size:14px;">🖨️ หน้าต่างพิมพ์รายงาน Cost Down 5 (CD5)</b>
            <span style="font-size:11px; color:#94a3b8; margin-left:10px;">วิเคราะห์การยืดอายุอะไหล่จริงเทียบ Original OEM</span>
          </div>
          <button class="btn-print" onclick="window.print()">🖨️ สั่งพิมพ์ / บันทึกเป็น PDF ตอนนี้</button>
        </div>

        <div class="page-container">
          <!-- HEADER -->
          <div style="border-bottom:2px solid #0f172a; padding-bottom:12px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <h1 style="margin:0; font-size:18px; font-weight:900; color:#020617;">
                THAI FOOD MAINTENANCE ENGINEERING
              </h1>
              <p style="margin:2px 0 0 0; font-size:12px; font-weight:bold; color:#334155;">
                ระบบบริหารลดต้นทุนอะไหล่และวิศวกรรมยืดอายุการใช้งาน (Cost Down 5 - CD5 System)
              </p>
              <p style="margin:2px 0 0 0; font-size:10px; color:#64748b;">
                มาตรฐานโรงงานอาหารปลอดภัย GMP / HACCP Compliance
              </p>
            </div>
            <div style="text-align:right; font-size:10px; color:#475569;">
              <div style="background:#f1f5f9; border:1px solid #cbd5e1; padding:3px 8px; border-radius:4px; font-weight:bold; color:#0f172a; display:inline-block;">
                DOC: CD5-ANNUAL-REPORT-${new Date().getFullYear()}
              </div>
              <p style="margin:4px 0 0 0;">วันที่ออกเอกสาร: ${dateStr}</p>
            </div>
          </div>

          <!-- KPI BANNER -->
          <div style="background:#0f172a; color:#ffffff; border-radius:8px; padding:12px 16px; margin-bottom:16px; display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; text-align:center;">
            <div>
              <p style="margin:0; font-size:9px; color:#94a3b8; text-transform:uppercase;">ยอดประหยัดรวมสะสม/ปี</p>
              <p style="margin:2px 0 0 0; font-size:16px; font-weight:900; color:#4ade80;">฿${totalAnnualSavings.toLocaleString()}</p>
            </div>
            <div>
              <p style="margin:0; font-size:9px; color:#94a3b8; text-transform:uppercase;">อนุมัติใช้งานจริงแล้ว</p>
              <p style="margin:2px 0 0 0; font-size:16px; font-weight:900; color:#38bdf8;">฿${approvedAnnualSavings.toLocaleString()}</p>
            </div>
            <div>
              <p style="margin:0; font-size:9px; color:#94a3b8; text-transform:uppercase;">อัตราลดต้นทุนเฉลี่ย</p>
              <p style="margin:2px 0 0 0; font-size:16px; font-weight:900; color:#fbbf24;">${avgCostReduction}%</p>
            </div>
            <div>
              <p style="margin:0; font-size:9px; color:#94a3b8; text-transform:uppercase;">ยืดอายุอะไหล่เฉลี่ย</p>
              <p style="margin:2px 0 0 0; font-size:16px; font-weight:900; color:#a855f7;">+${avgLifespanExtension}%</p>
            </div>
          </div>

          <!-- PROJECTS LIST -->
          <div>
            ${rowsHTML}
          </div>

          <!-- SIGN-OFF -->
          <div style="margin-top:24px; padding-top:14px; border-top:2px solid #0f172a; display:flex; justify-content:space-between; page-break-inside:avoid; break-inside:avoid;">
            <div style="text-align:center; width:200px;">
              <div style="border-bottom:1px solid #0f172a; height:35px; margin-bottom:4px;"></div>
              <p style="margin:0; font-size:10px; font-weight:bold; color:#0f172a;">ผู้จัดทำ / หัวหน้าทีมช่าง CD5</p>
              <p style="margin:2px 0 0 0; font-size:9px; color:#64748b;">( .................................................... )</p>
            </div>
            <div style="text-align:center; width:200px;">
              <div style="border-bottom:1px solid #0f172a; height:35px; margin-bottom:4px;"></div>
              <p style="margin:0; font-size:10px; font-weight:bold; color:#0f172a;">ผู้จัดการแผนกวิศวกรรม & ซ่อมบำรุง</p>
              <p style="margin:2px 0 0 0; font-size:9px; color:#64748b;">( .................................................... )</p>
            </div>
            <div style="text-align:center; width:200px;">
              <div style="border-bottom:1px solid #0f172a; height:35px; margin-bottom:4px;"></div>
              <p style="margin:0; font-size:10px; font-weight:bold; color:#0f172a;">ผู้อำนวยการฝ่ายโรงงาน / อนุมัติ</p>
              <p style="margin:2px 0 0 0; font-size:9px; color:#64748b;">( .................................................... )</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handleOpenPrintWindow = () => {
    const htmlContent = buildStandaloneCD5ReportHTML();
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(htmlContent);
      printWin.document.close();
    } else {
      alert('กรุณาอนุญาตป๊อปอัปเพื่อเปิดหน้าต่างพิมพ์รายงาน');
    }
  };

  // Live Calculations in Add/Edit Modal
  const liveSavingsPerUnit = Math.max(0, (Number(formOrigPrice) || 0) - (Number(formNewPrice) || 0));
  const liveSavingsPercent = Number(formOrigPrice) > 0 ? Number((((Number(formOrigPrice) - Number(formNewPrice)) / Number(formOrigPrice)) * 100).toFixed(1)) : 0;
  const liveLifespanExtension = Number(formOrigLifespan) > 0 ? Number((((Number(formNewLifespan) - Number(formOrigLifespan)) / Number(formOrigLifespan)) * 100).toFixed(1)) : 0;
  const liveAnnualOrig = (Number(formOrigPrice) || 0) * (Number(formAnnualUsage) || 1);
  const liveAnnualNew = (Number(formNewPrice) || 0) * (Number(formAnnualUsage) || 1);
  const liveAnnualSavings = Math.max(0, liveAnnualOrig - liveAnnualNew);

  return (
    <div className="space-y-6" id="cost-down-5-page">
      
      {/* 1. TOP HEADER & ACTION BAR */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl" id="cd5-header-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/30 text-emerald-400">
                <TrendingDown size={24} className="animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                  Cost Down 5 (CD5)
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Engineering & Spare Parts Optimization
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  ยืดอายุการใช้งานอะไหล่เครื่องจักร | เก็บประวัติวันเริ่มใช้งานจริงเทียบ OEM | วิเคราะห์ผลประหยัดต้นทุน PM และซ่อมบำรุง
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleOpenPrintWindow}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition cursor-pointer"
              title="เปิดหน้าต่างพิมพ์รายงานหรือบันทึก PDF"
            >
              <Printer size={15} className="text-cyan-400" />
              <span>พิมพ์ / บันทึก PDF</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 rounded-lg border border-emerald-700/50 transition cursor-pointer"
              title="ส่งออกตารางเปรียบเทียบเป็นไฟล์ Excel"
            >
              <FileSpreadsheet size={15} />
              <span>ส่งออก Excel</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg shadow-lg shadow-emerald-500/20 transition cursor-pointer"
            >
              <Plus size={16} />
              <span>+ เสนอโครงการ CD5</span>
            </button>
          </div>
        </div>

        {/* 2. FINANCIAL KPI CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4" id="cd5-kpi-grid">
          <div className="bg-gradient-to-br from-emerald-950/40 to-slate-900/80 border border-emerald-500/30 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">ยอดเงินประหยัดรวมสะสม</p>
              <p className="text-2xl font-black text-white mt-1">฿{totalAnnualSavings.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">ต่อปี (คำนวณจากทุกโครงการ)</p>
            </div>
            <div className="p-2.5 bg-emerald-500/20 rounded-xl text-emerald-400">
              <DollarSign size={22} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-cyan-950/40 to-slate-900/80 border border-cyan-500/30 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">อนุมัติใช้งานจริงแล้ว</p>
              <p className="text-2xl font-black text-white mt-1">฿{approvedAnnualSavings.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">ลดค่าใช้จ่ายโรงงานสำเร็จ</p>
            </div>
            <div className="p-2.5 bg-cyan-500/20 rounded-xl text-cyan-400">
              <CheckCircle2 size={22} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-950/40 to-slate-900/80 border border-amber-500/30 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">อัตราลดต้นทุนเฉลี่ย</p>
              <p className="text-2xl font-black text-white mt-1">{avgCostReduction}%</p>
              <p className="text-[10px] text-slate-400 mt-0.5">เทียบราคา OEM เดิม</p>
            </div>
            <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-400">
              <Scale size={22} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-950/40 to-slate-900/80 border border-purple-500/30 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">ยืดอายุอะไหล่เฉลี่ย</p>
              <p className="text-2xl font-black text-white mt-1">+{avgLifespanExtension}%</p>
              <p className="text-[10px] text-slate-400 mt-0.5">ลดรอบและเวลาทำ PM/ซ่อม</p>
            </div>
            <div className="p-2.5 bg-purple-500/20 rounded-xl text-purple-400">
              <Clock size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* 3. FILTER & SEARCH CONTROLS */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 shadow-md" id="cd5-filter-card">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2 w-full md:w-auto flex-1 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อโครงการ, ชื่ออะไหล่, เครื่องจักร, ช่าง..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">📁 ทุกหมวดหมู่งาน CD5</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">📌 ทุกสถานะ</option>
              <option value="อนุมัติใช้งานจริง">🟢 อนุมัติใช้งานจริง</option>
              <option value="กำลังทดสอบ">🟡 กำลังทดสอบ</option>
              <option value="ประเมินผล">⚪ ประเมินผล</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 self-end md:self-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 cursor-pointer transition ${
                viewMode === 'grid' 
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers size={14} />
              <span>การ์ดเปรียบเทียบ</span>
            </button>

            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 cursor-pointer transition ${
                viewMode === 'table' 
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet size={14} />
              <span>ตารางสรุป</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. MAIN CONTENT AREA */}
      <div className="space-y-4" id="cd5-main-content">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-8">
            <TrendingDown className="mx-auto text-slate-600 mb-3" size={40} />
            <p className="text-base font-bold text-slate-300">ไม่พบโครงการ Cost Down 5 ที่ตรงกับเงื่อนไข</p>
            <p className="text-xs text-slate-500 mt-1">กดปุ่มด้านล่างเพื่อเริ่มสร้างโครงการใหม่</p>
            <button
              onClick={handleOpenAddModal}
              className="mt-4 px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg inline-flex items-center gap-1.5 transition"
            >
              <Plus size={15} />
              <span>+ เพิ่มโครงการ Cost Down 5</span>
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4" id="cd5-grid-container">
            {filteredProjects.map((p) => {
              const statusBadgeClass = 
                p.status === 'อนุมัติใช้งานจริง' 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                  : p.status === 'กำลังทดสอบ'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-700/50 text-slate-300 border-slate-600';

              return (
                <div 
                  key={p.id}
                  className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden transition shadow-xl flex flex-col justify-between"
                >
                  {/* Card Header */}
                  <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
                            {p.id}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadgeClass}`}>
                            {p.status}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                            {p.category}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white mt-1.5 line-clamp-2">
                          {p.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          ชิ้นส่วน: <b className="text-slate-200">{p.partName}</b> {p.partCode ? `[${p.partCode}]` : ''} | เครื่อง: <b className="text-cyan-300">{getMachineName(p.machineId)}</b>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-500 block">ยอดประหยัดต่อปี</span>
                        <span className="text-base font-extrabold text-emerald-400">
                          ฿{p.annualSavings.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Lifespan Meter Banner */}
                  <div className="px-4 pt-3 pb-1 bg-slate-950/30">
                    <CD5LifespanMeter project={p} />
                  </div>

                  {/* Visual Side-by-Side Specs Box */}
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/20">
                    
                    {/* LEFT: ORIGINAL OEM */}
                    <div className="bg-rose-950/10 border border-rose-900/30 rounded-xl p-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between border-b border-rose-900/30 pb-1.5 mb-2">
                          <span className="text-[11px] font-bold text-rose-400">
                            🔴 เดิม (Original OEM)
                          </span>
                          <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                            {p.originalSupplier}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-400">ราคา/ชิ้น:</span>
                            <span className="font-bold text-rose-300">฿{p.originalPrice.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">อายุใช้งานเดิม:</span>
                            <span className="font-semibold text-slate-300">{p.originalLifespanDays} {p.originalLifespanUnit || 'วัน'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">ต้นทุนต่อปี:</span>
                            <span className="font-bold text-rose-400">฿{p.annualOriginalCost.toLocaleString()}</span>
                          </div>
                        </div>

                        {p.originalQualityNotes && (
                          <p className="text-[11px] text-slate-400 mt-2 bg-slate-900/60 p-2 rounded border border-rose-900/20 italic line-clamp-2">
                            "{p.originalQualityNotes}"
                          </p>
                        )}
                      </div>

                      {p.photoOriginal && (
                        <div className="mt-3">
                          <div 
                            onClick={() => setZoomedImage({ url: p.photoOriginal!, title: `ภาพอะไหล่เดิม: ${p.partName}` })}
                            className="h-20 bg-slate-950 rounded-lg border border-rose-900/40 overflow-hidden cursor-pointer relative group flex items-center justify-center"
                          >
                            <img src={p.photoOriginal} alt="Original Part" className="h-full w-full object-contain p-1" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white text-xs font-semibold gap-1">
                              <Eye size={14} /> ดูรูป
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* RIGHT: NEW CUSTOM / COST DOWN */}
                    <div className="bg-emerald-950/10 border border-emerald-900/40 rounded-xl p-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between border-b border-emerald-900/40 pb-1.5 mb-2">
                          <span className="text-[11px] font-bold text-emerald-400">
                            🟢 ใหม่ (เขียนแบบ/สั่งทำ)
                          </span>
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
                            ลดลง {p.savingsPercent}%
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-400">ราคาใหม่/ชิ้น:</span>
                            <span className="font-bold text-emerald-300">฿{p.newPrice.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">เป้าหมายอายุใช้งาน:</span>
                            <span className="font-semibold text-emerald-400">
                              {p.newLifespanDays} {p.newLifespanUnit || 'วัน'} 
                              <span className="text-[10px] text-teal-300 ml-1">(+{p.lifespanExtensionPercent}%)</span>
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">ต้นทุนใหม่ต่อปี:</span>
                            <span className="font-bold text-emerald-400">฿{p.annualNewCost.toLocaleString()}</span>
                          </div>
                        </div>

                        {p.newQualityNotes && (
                          <p className="text-[11px] text-slate-300 mt-2 bg-slate-900/60 p-2 rounded border border-emerald-900/30 line-clamp-2">
                            "{p.newQualityNotes}"
                          </p>
                        )}
                      </div>

                      {/* Attached Photos */}
                      <div className="flex gap-2 mt-3">
                        {p.photoNew && (
                          <div 
                            onClick={() => setZoomedImage({ url: p.photoNew!, title: `ภาพอะไหล่ใหม่: ${p.partName}` })}
                            className="flex-1 h-20 bg-slate-950 rounded-lg border border-emerald-900/40 overflow-hidden cursor-pointer relative group flex items-center justify-center"
                          >
                            <img src={p.photoNew} alt="New Custom Part" className="h-full w-full object-contain p-1" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white text-[10px] font-semibold gap-0.5">
                              <Eye size={12} /> อะไหล่ใหม่
                            </div>
                          </div>
                        )}

                        {p.drawingPhoto && (
                          <div 
                            onClick={() => setZoomedImage({ url: p.drawingPhoto!, title: `แบบ Drawing CAD: ${p.partName}` })}
                            className="flex-1 h-20 bg-slate-950 rounded-lg border border-cyan-800/40 overflow-hidden cursor-pointer relative group flex items-center justify-center"
                          >
                            <img src={p.drawingPhoto} alt="CAD Drawing" className="h-full w-full object-contain p-1" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white text-[10px] font-semibold gap-0.5">
                              <Eye size={12} /> แบบ Drawing
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Card Footer */}
                  <div className="p-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span>ผู้เสนอ: <b className="text-slate-200">{p.proposerTechnician}</b></span>
                      {p.foodGradeCompliance && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <ShieldCheck size={12} /> GMP
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setHistoryTrackingProject(p)}
                        className="px-2 py-1 text-xs bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 rounded border border-emerald-800 flex items-center gap-1 transition"
                        title="ดูและบันทึกประวัติรอบการใช้งานอะไหล่"
                      >
                        <History size={13} />
                        <span>ประวัติใช้งาน ({p.usageHistory?.length || 0})</span>
                      </button>

                      <button
                        onClick={() => setViewingProject(p)}
                        className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded border border-slate-700 flex items-center gap-1 transition"
                      >
                        <Eye size={13} />
                        <span>รายละเอียด</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(p)}
                        className="p-1 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded transition"
                        title="แก้ไขโครงการ"
                      >
                        <Edit3 size={15} />
                      </button>

                      <button
                        onClick={() => handleDeleteProject(p.id, p.title)}
                        className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                        title="ลบโครงการ"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* TABULAR VIEW */
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl" id="cd5-table-container">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400">
                    <th className="p-3">รหัส / โครงการ</th>
                    <th className="p-3">เครื่องจักร</th>
                    <th className="p-3">วันที่เริ่มใช้งาน</th>
                    <th className="p-3 text-right">เดิม (OEM)</th>
                    <th className="p-3 text-right">ใหม่ (CD5)</th>
                    <th className="p-3 text-center">ลดต้นทุน</th>
                    <th className="p-3 text-center">ยืดอายุ</th>
                    <th className="p-3 text-right">ยอดประหยัด/ปี</th>
                    <th className="p-3 text-center">ประวัติสะสม</th>
                    <th className="p-3 text-center">สถานะ</th>
                    <th className="p-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredProjects.map((p) => {
                    const runningDays = p.installedDate 
                      ? Math.max(0, Math.floor((new Date().getTime() - new Date(p.installedDate).getTime()) / (1000 * 3600 * 24)))
                      : 0;

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3">
                          <div className="font-bold text-white">{p.title}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {p.id} | {p.partName} {p.partCode ? `(${p.partCode})` : ''}
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-cyan-300">{getMachineName(p.machineId)}</td>
                        <td className="p-3">
                          <div className="font-mono text-white font-semibold">{p.installedDate || '-'}</div>
                          <div className="text-[10px] text-emerald-400">เดินเครื่อง {runningDays} วัน</div>
                        </td>
                        <td className="p-3 text-right text-rose-300 font-semibold">฿{p.originalPrice.toLocaleString()}</td>
                        <td className="p-3 text-right text-emerald-300 font-bold">฿{p.newPrice.toLocaleString()}</td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                            {p.savingsPercent}%
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-teal-400">+{p.lifespanExtensionPercent}%</td>
                        <td className="p-3 text-right font-extrabold text-emerald-400">฿{p.annualSavings.toLocaleString()}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setHistoryTrackingProject(p)}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-mono text-[10px]"
                          >
                            {p.usageHistory?.length || 0} รอบ
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300">
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setViewingProject(p)}
                              className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition"
                              title="ดูรายละเอียด"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(p)}
                              className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition"
                              title="แก้ไข"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteProject(p.id, p.title)}
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                              title="ลบ"
                            >
                              <Trash2 size={15} />
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

      {/* 5. ADD / EDIT PROJECT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto" id="cd5-add-edit-modal">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30 text-emerald-400">
                  <TrendingDown size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    {editingProject ? `แก้ไขโครงการ: ${editingProject.id}` : 'เสนอโครงการ Cost Down 5 (CD5) ใหม่'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    บันทึกข้อมูลเปรียบเทียบอะไหล่ วันที่เริ่มใช้งานจริง และการคำนวณเงินประหยัด
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveProject} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs">
              
              {/* Form Validation Error Banner */}
              {formError && (
                <div className="p-3.5 bg-rose-950/80 border border-rose-500/70 rounded-xl text-rose-200 flex items-center gap-2.5 text-xs font-semibold shadow-lg shadow-rose-950/40 animate-in fade-in duration-200">
                  <AlertTriangle size={18} className="text-rose-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* SECTION 1: PROJECT OVERVIEW */}
              <div>
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <SlidersHorizontal size={14} /> 1. ข้อมูลพื้นฐานโครงการ (Project Overview)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-semibold mb-1">ชื่อโครงการ Cost Down *</label>
                    <input 
                      type="text" 
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="เช่น เขียนแบบสั่งทำชุดใบมีดตัดซีลสุญญากาศ SUS440C แทนสั่ง OEM"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">หมวดหมู่งาน CD5 *</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as CD5Category)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">เครื่องจักรที่เกี่ยวข้อง *</label>
                    <select
                      value={formMachineId}
                      onChange={(e) => setFormMachineId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      {machines.map(m => (
                        <option key={m.id} value={m.id}>{m.id} - {m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">ชื่อชิ้นส่วนอะไหล่ *</label>
                    <input 
                      type="text" 
                      required
                      value={formPartName}
                      onChange={(e) => setFormPartName(e.target.value)}
                      placeholder="เช่น ใบมีดตัดปากถุง, บูชแบริ่งเพลา, ซีลยาง"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">รหัสอะไหล่ (Part Code)</label>
                    <input 
                      type="text" 
                      value={formPartCode}
                      onChange={(e) => setFormPartCode(e.target.value)}
                      placeholder="เช่น BLD-VAC-440, SP-03"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">ช่างผู้เสนอ/รับผิดชอบหลัก *</label>
                    <select
                      value={formProposer}
                      onChange={(e) => setFormProposer(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      {technicians.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      📅 วันที่เริ่มติดตั้ง/ใช้งานอะไหล่จริง *
                    </label>
                    <input 
                      type="date" 
                      required
                      value={formInstalledDate}
                      onChange={(e) => setFormInstalledDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-emerald-300 font-mono font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">สถานะโครงการ</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as CD5Status)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="กำลังทดสอบ">🟡 กำลังทดสอบ</option>
                      <option value="อนุมัติใช้งานจริง">🟢 อนุมัติใช้งานจริง</option>
                      <option value="ประเมินผล">⚪ ประเมินผล</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: SIDE-BY-SIDE SPECS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 2.1 ORIGINAL OEM */}
                <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-3.5 space-y-3">
                  <h4 className="font-bold text-rose-400 flex items-center gap-1 border-b border-rose-900/40 pb-1.5">
                    🔴 อะไหล่เดิม (Original OEM Spec)
                  </h4>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">ผู้ผลิต / ผู้จำหน่ายเดิม</label>
                    <input 
                      type="text" 
                      value={formOrigSupplier}
                      onChange={(e) => setFormOrigSupplier(e.target.value)}
                      placeholder="เช่น OEM ญี่ปุ่น, นำเข้าจากต่างประเทศ"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">ราคาเดิม/ชิ้น (฿)</label>
                      <input 
                        type="number" 
                        min="0"
                        value={formOrigPrice}
                        onChange={(e) => setFormOrigPrice(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 font-bold text-rose-300 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">อายุใช้งานเดิม (วัน)</label>
                      <input 
                        type="number" 
                        min="1"
                        value={formOrigLifespan}
                        onChange={(e) => setFormOrigLifespan(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">ข้อจำกัด / ปัญหาเดิม</label>
                    <textarea 
                      rows={2}
                      value={formOrigQuality}
                      onChange={(e) => setFormOrigQuality(e.target.value)}
                      placeholder="เช่น รอนาน 45 วัน, สึกหรอเร็วเมื่อโดนไอน้ำเกลือ"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">รูปภาพอะไหล่เดิม</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => handleImageFileChange(e, setFormPhotoOrig)}
                      className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-rose-950 file:text-rose-300 hover:file:bg-rose-900 cursor-pointer"
                    />
                    {formPhotoOrig && (
                      <div className="mt-2 h-16 bg-slate-950 rounded border border-rose-900/40 p-1 flex items-center justify-center relative">
                        <img src={formPhotoOrig} alt="Original Preview" className="h-full object-contain" />
                        <button type="button" onClick={() => setFormPhotoOrig('')} className="absolute top-0 right-0 p-0.5 bg-rose-600 text-white rounded-full"><X size={10} /></button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2.2 NEW CUSTOM */}
                <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-3.5 space-y-3">
                  <h4 className="font-bold text-emerald-400 flex items-center gap-1 border-b border-emerald-900/40 pb-1.5">
                    🟢 อะไหล่ปรับปรุงใหม่ (Cost Down / Custom Spec)
                  </h4>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">ร้านกลึง / แหล่งสั่งทำในประเทศ</label>
                    <input 
                      type="text" 
                      value={formNewSupplier}
                      onChange={(e) => setFormNewSupplier(e.target.value)}
                      placeholder="เช่น โรงกลึง CNC ในประเทศ, สั่งตัดแผ่น PEEK"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">ราคาใหม่/ชิ้น (฿)</label>
                      <input 
                        type="number" 
                        min="0"
                        value={formNewPrice}
                        onChange={(e) => setFormNewPrice(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 font-bold text-emerald-300 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">อายุใช้งานใหม่ (วัน)</label>
                      <input 
                        type="number" 
                        min="1"
                        value={formNewLifespan}
                        onChange={(e) => setFormNewLifespan(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 font-bold text-teal-300 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">เกรดวัสดุและคุณภาพที่อัปเกรด</label>
                    <textarea 
                      rows={2}
                      value={formNewQuality}
                      onChange={(e) => setFormNewQuality(e.target.value)}
                      placeholder="เช่น Stainless SUS440C ชุบแข็ง Vacuum HRC 58-60, ทนกรดเกลือ ไม่เป็นสนิม"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Photo Upload */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">รูปอะไหล่ใหม่</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => handleImageFileChange(e, setFormPhotoNew)}
                        className="text-xs text-slate-400 file:mr-1 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-emerald-950 file:text-emerald-300 hover:file:bg-emerald-900 cursor-pointer"
                      />
                      {formPhotoNew && (
                        <div className="mt-1 h-14 bg-slate-950 rounded border border-emerald-900/40 p-1 flex items-center justify-center relative">
                          <img src={formPhotoNew} alt="New Preview" className="h-full object-contain" />
                          <button type="button" onClick={() => setFormPhotoNew('')} className="absolute top-0 right-0 p-0.5 bg-rose-600 text-white rounded-full text-[8px]"><X size={10} /></button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">แบบ Drawing CAD</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => handleImageFileChange(e, setFormDrawingPhoto)}
                        className="text-xs text-slate-400 file:mr-1 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-cyan-950 file:text-cyan-300 hover:file:bg-cyan-900 cursor-pointer"
                      />
                      {formDrawingPhoto && (
                        <div className="mt-1 h-14 bg-slate-950 rounded border border-cyan-900/40 p-1 flex items-center justify-center relative">
                          <img src={formDrawingPhoto} alt="Drawing Preview" className="h-full object-contain" />
                          <button type="button" onClick={() => setFormDrawingPhoto('')} className="absolute top-0 right-0 p-0.5 bg-rose-600 text-white rounded-full text-[8px]"><X size={10} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: ROI CALCULATOR */}
              <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
                    <Calculator size={15} /> สรุปการคำนวณผลประหยัดต้นทุน (ROI Calculator)
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="text-slate-400 text-xs">ปริมาณใช้งานต่อปี:</label>
                    <input 
                      type="number" 
                      min="1"
                      value={formAnnualUsage}
                      onChange={(e) => setFormAnnualUsage(Math.max(1, Number(e.target.value)))}
                      className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center font-bold text-white text-xs"
                    />
                    <span className="text-slate-400 text-xs">ชิ้น/ปี</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">ส่วนต่างราคาต่อชิ้น</span>
                    <span className="text-base font-extrabold text-white">฿{liveSavingsPerUnit.toLocaleString()}</span>
                    <span className="text-[10px] text-emerald-400 block mt-0.5">ลดลง {liveSavingsPercent}%</span>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">อัตราการยืดอายุ</span>
                    <span className="text-base font-extrabold text-teal-300">+{liveLifespanExtension}%</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">จาก {formOrigLifespan} ➔ {formNewLifespan} วัน</span>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">ต้นทุนเดิม vs ใหม่</span>
                    <span className="text-xs font-semibold text-rose-300 block">เดิม: ฿{liveAnnualOrig.toLocaleString()}</span>
                    <span className="text-xs font-semibold text-emerald-300 block">ใหม่: ฿{liveAnnualNew.toLocaleString()}</span>
                  </div>

                  <div className="bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-500/50">
                    <span className="text-[10px] text-emerald-300 font-bold block">💎 ประหยัดสุทธิต่อปี</span>
                    <span className="text-lg font-black text-emerald-400 block">฿{liveAnnualSavings.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* SECTION 4: DETAILS & GMP */}
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    รายละเอียดการเขียนแบบ Drawing / ขั้นตอนวิศวกรรม
                  </label>
                  <textarea 
                    rows={2}
                    value={formEngineeringDetails}
                    onChange={(e) => setFormEngineeringDetails(e.target.value)}
                    placeholder="เช่น ถอดแบบเขียน CAD ใน SolidWorks ปรับมุมคมมีด 28° ชุบแข็งสุญญากาศ..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2 p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <input 
                    type="checkbox"
                    id="foodGradeCheck"
                    checked={formFoodGradeCompliance}
                    onChange={(e) => setFormFoodGradeCompliance(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700"
                  />
                  <label htmlFor="foodGradeCheck" className="text-slate-200 font-semibold cursor-pointer">
                    🛡️ สอดคล้องกับมาตรฐาน Food Grade & GMP โรงงานอาหาร (Food Contact Safe, ไร้สนิม, ไม่ปนเปื้อน)
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5"
                >
                  <Check size={16} />
                  <span>บันทึกโครงการ Cost Down 5</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 6. DETAIL VIEW MODAL */}
      {viewingProject && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto" id="cd5-detail-modal">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                    {viewingProject.id}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {viewingProject.status}
                  </span>
                  <span className="text-xs text-slate-400">
                    {viewingProject.category}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mt-1">{viewingProject.title}</h2>
              </div>
              <button 
                onClick={() => setViewingProject(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs">
              
              {/* Financial Banner */}
              <div className="bg-gradient-to-r from-emerald-950/60 to-slate-950 border border-emerald-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] text-emerald-400 font-semibold uppercase">ผลการประหยัดต้นทุนโรงงาน</p>
                  <p className="text-2xl font-black text-emerald-300">
                    ฿{viewingProject.annualSavings.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ ปี</span>
                  </p>
                  <p className="text-xs text-slate-300 mt-0.5">
                    ประหยัดต้นทุน <b>{viewingProject.savingsPercent}%</b> | ยืดอายุการใช้งาน <b>+{viewingProject.lifespanExtensionPercent}%</b>
                  </p>
                </div>

                <div className="flex items-center gap-3 text-right">
                  <button
                    onClick={() => {
                      setHistoryTrackingProject(viewingProject);
                    }}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1.5 transition"
                  >
                    <History size={15} />
                    <span>จัดการประวัติรอบใช้งาน ({viewingProject.usageHistory?.length || 0})</span>
                  </button>
                </div>
              </div>

              {/* Detailed Lifespan Meter */}
              <div>
                <h3 className="font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                  <Clock size={15} className="text-cyan-400" />
                  การติดตามอายุการใช้งานจริงเทียบกับ Original OEM
                </h3>
                <CD5LifespanMeter project={viewingProject} showDetails={true} />
              </div>

              {/* Side-by-Side Specs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original */}
                <div className="bg-rose-950/10 border border-rose-900/30 rounded-xl p-4 space-y-2">
                  <h3 className="font-bold text-rose-400 border-b border-rose-900/30 pb-1.5 text-xs flex items-center justify-between">
                    <span>🔴 อะไหล่เดิม (Original OEM)</span>
                    <span className="text-slate-400">{viewingProject.originalSupplier}</span>
                  </h3>
                  <p><b>ราคาต่อหน่วย:</b> ฿{viewingProject.originalPrice.toLocaleString()}</p>
                  <p><b>อายุการใช้งานเดิม:</b> {viewingProject.originalLifespanDays} {viewingProject.originalLifespanUnit || 'วัน'}</p>
                  <p><b>ต้นทุนรวมต่อปี:</b> ฿{viewingProject.annualOriginalCost.toLocaleString()}</p>
                  <p className="text-slate-400 bg-slate-900/60 p-2 rounded border border-rose-900/20">
                    <b>ข้อจำกัดเดิม:</b> {viewingProject.originalQualityNotes || '-'}
                  </p>

                  {viewingProject.photoOriginal && (
                    <div className="mt-2">
                      <img 
                        src={viewingProject.photoOriginal} 
                        alt="Original" 
                        className="max-h-40 rounded border border-rose-900/40 object-contain mx-auto bg-slate-950 p-1"
                      />
                    </div>
                  )}
                </div>

                {/* New Custom */}
                <div className="bg-emerald-950/10 border border-emerald-900/40 rounded-xl p-4 space-y-2">
                  <h3 className="font-bold text-emerald-400 border-b border-emerald-900/40 pb-1.5 text-xs flex items-center justify-between">
                    <span>🟢 อะไหล่ใหม่ (เขียนแบบสั่งทำ CD5)</span>
                    <span className="font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      ลดลง {viewingProject.savingsPercent}%
                    </span>
                  </h3>
                  <p><b>แหล่งสั่งทำ:</b> {viewingProject.newSupplierOrFabricator}</p>
                  <p><b>ราคาใหม่ต่อหน่วย:</b> ฿{viewingProject.newPrice.toLocaleString()}</p>
                  <p><b>อายุการใช้งานใหม่:</b> {viewingProject.newLifespanDays} {viewingProject.newLifespanUnit || 'วัน'} (+{viewingProject.lifespanExtensionPercent}%)</p>
                  <p><b>ต้นทุนรวมใหม่ต่อปี:</b> ฿{viewingProject.annualNewCost.toLocaleString()}</p>
                  <p className="text-slate-200 bg-slate-900/60 p-2 rounded border border-emerald-900/30">
                    <b>สเปกวัสดุ/คุณภาพ:</b> {viewingProject.newQualityNotes || '-'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {viewingProject.photoNew && (
                      <img 
                        src={viewingProject.photoNew} 
                        alt="New Custom" 
                        className="h-32 w-full rounded border border-emerald-900/40 object-contain bg-slate-950 p-1"
                      />
                    )}
                    {viewingProject.drawingPhoto && (
                      <img 
                        src={viewingProject.drawingPhoto} 
                        alt="CAD Drawing" 
                        className="h-32 w-full rounded border border-cyan-800/40 object-contain bg-slate-950 p-1"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Engineering Details */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <h4 className="font-bold text-slate-200 mb-1">รายละเอียดวิศวกรรม & ขั้นตอนการปรับปรุง</h4>
                <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                  {viewingProject.engineeringDetails || 'ไม่มีรายละเอียดเพิ่มเติม'}
                </p>
              </div>

            </div>

            {/* Modal Footer with Edit and Delete options */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                ผู้เสนอโครงการ: <b className="text-slate-200">{viewingProject.proposerTechnician}</b>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const toDelete = viewingProject;
                    handleDeleteProject(toDelete.id, toDelete.title);
                  }}
                  className="px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 rounded-lg font-semibold transition flex items-center gap-1.5"
                  title="ลบโครงการนี้"
                >
                  <Trash2 size={14} />
                  <span>ลบโครงการ</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const toEdit = viewingProject;
                    setViewingProject(null);
                    handleOpenEditModal(toEdit);
                  }}
                  className="px-3 py-2 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/50 rounded-lg font-semibold transition flex items-center gap-1.5"
                  title="แก้ไขข้อมูลโครงการ"
                >
                  <Edit3 size={14} />
                  <span>แก้ไขข้อมูล</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingProject(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold transition"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. USAGE HISTORY TRACKING MODAL */}
      {historyTrackingProject && (
        <CD5UsageHistoryModal
          project={historyTrackingProject}
          technicians={technicians}
          onClose={() => setHistoryTrackingProject(null)}
          onSaveHistory={handleSaveHistory}
        />
      )}

      {/* 8. ZOOMED IMAGE VIEWER MODAL */}
      {zoomedImage && (
        <div 
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden p-2 flex flex-col items-center">
            <div className="w-full flex items-center justify-between px-3 py-2 border-b border-slate-800 text-slate-200 text-xs font-bold">
              <span>{zoomedImage.title}</span>
              <button onClick={() => setZoomedImage(null)} className="p-1 hover:text-white"><X size={16} /></button>
            </div>
            <img 
              src={zoomedImage.url} 
              alt="Zoomed" 
              className="max-h-[75vh] max-w-full object-contain p-2"
            />
          </div>
        </div>
      )}

      {/* 9. CUSTOM IN-APP DELETE CONFIRMATION MODAL (No window.confirm!) */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-800/60 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-rose-950/60 bg-rose-950/30 flex items-center gap-3">
              <div className="p-2.5 bg-rose-600/20 text-rose-400 border border-rose-600/30 rounded-xl">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">ยืนยันการลบโครงการ Cost Down 5</h3>
                <span className="text-xs text-rose-400 font-mono font-semibold">{projectToDelete.id}</span>
              </div>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <p className="text-slate-200 font-medium leading-relaxed">
                คุณต้องการลบโครงการ <span className="text-rose-300 font-bold">"{projectToDelete.title}"</span> ออกจากระบบใช่หรือไม่?
              </p>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-400 text-[11px] leading-relaxed">
                ⚠️ ข้อมูลโครงการ การคำนวณเงินประหยัด และประวัติรอบการใช้งานอะไหล่ทั้งหมดจะถูกลบออกจากฐานข้อมูลอย่างถาวร
              </div>
            </div>
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5"
              >
                <Trash2 size={15} />
                <span>ยืนยันลบโครงการ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. SUCCESS / NOTIFICATION TOAST */}
      {notification && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl border shadow-2xl flex items-center gap-3 text-xs font-bold transition-all duration-300 animate-in slide-in-from-top ${
          notification.type === 'success' 
            ? 'bg-emerald-950/95 border-emerald-500/60 text-emerald-200' 
            : 'bg-rose-950/95 border-rose-500/60 text-rose-200'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle size={18} className="text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

    </div>
  );
};
