import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { RepairLog } from '../types';
import { 
  Plus, Search, SlidersHorizontal, Image as ImageIcon, 
  Trash2, AlertTriangle, CheckCircle, HelpCircle, ArrowUpDown,
  Edit, FileSpreadsheet, Upload, X
} from 'lucide-react';
import { notifyRepairOpened, notifyRepairClosed, sendLineNotification } from '../utils/lineNotify';
import { compressImageFile } from '../utils/imageUtils';
import { getTodayDateString } from '../utils/pmAlerts';
import * as XLSX from 'xlsx';

export const RepairPage: React.FC = () => {
  const { repairs, setRepairs, machines, technicians, spareParts, setSpareParts, settings, canEdit, canDelete } = useApp();

  // Search/Filters states
  const [machineFilter, setMachineFilter] = useState('');
  const [techFilter, setTechFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [mttrFilter, setMttrFilter] = useState<number>(0); // MTTR > X minutes
  const [sortBy, setSortBy] = useState<'date' | 'duration'>('date'); // default to date descending (newest first)

  // Add Repair Form visibility
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Excel Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [excelData, setExcelData] = useState<any[][]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [columnMap, setColumnMap] = useState<Record<string, string>>({
    machineId: '',
    symptoms: '',
    breakdownTime: '',
    repairDoneTime: '',
    correctiveAction: '',
    primaryTech: '',
    why1: '',
    why2: '',
    why3: '',
    why4: '',
    why5: '',
    otherCost: '',
    status: ''
  });
  const [importPreview, setImportPreview] = useState<RepairLog[]>([]);
  const [importError, setImportError] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // View Details Modal state
  const [selectedRepairDetail, setSelectedRepairDetail] = useState<RepairLog | null>(null);

  // Custom Delete Confirm state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form Inputs
  const [formMachine, setFormMachine] = useState(machines[0]?.id || '');
  const [formBreakdown, setFormBreakdown] = useState(() => `${getTodayDateString()}T09:00`);
  const [formDone, setFormDone] = useState(() => `${getTodayDateString()}T11:30`);
  const [formSymptoms, setFormSymptoms] = useState('');
  const [formTechnician, setFormTechnician] = useState(technicians[0] || 'ช่าง 1');
  const [formTechnicians, setFormTechnicians] = useState<string[]>([]);
  const [formCorrection, setFormCorrection] = useState('');
  const [formStatus, setFormStatus] = useState<'กำลังซ่อม' | 'ปิดงาน'>('ปิดงาน');
  
  // Spare parts in form state
  const [formUsedParts, setFormUsedParts] = useState<{ partId: string; quantity: number; pricePerUnit: number; totalCost: number }[]>([]);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partSearchQuery, setPartSearchQuery] = useState('');
  const [selectedPartQty, setSelectedPartQty] = useState<number>(1);
  const [selectedPartPrice, setSelectedPartPrice] = useState<number>(0);
  const [formOtherCost, setFormOtherCost] = useState<number>(0);

  // Helper companion to add part to current list
  const handleAddPartToForm = () => {
    if (!selectedPartId) {
      alert("กรุณาเลือกอะไหล่ก่อน");
      return;
    }
    if (selectedPartQty <= 0) {
      alert("จำนวนอะไหล่ต้องมากกว่า 0");
      return;
    }
    const partObj = spareParts.find(p => p.id === selectedPartId);
    if (!partObj) return;

    // Check if part already in list
    const existingIndex = formUsedParts.findIndex(p => p.partId === selectedPartId);
    if (existingIndex >= 0) {
      setFormUsedParts(prev => prev.map((item, idx) => {
        if (idx === existingIndex) {
          const newQty = item.quantity + selectedPartQty;
          return {
            ...item,
            quantity: newQty,
            totalCost: newQty * item.pricePerUnit
          };
        }
        return item;
      }));
    } else {
      const price = selectedPartPrice > 0 ? selectedPartPrice : partObj.pricePerUnit;
      setFormUsedParts(prev => [...prev, {
        partId: selectedPartId,
        quantity: selectedPartQty,
        pricePerUnit: price,
        totalCost: selectedPartQty * price
      }]);
    }

    // Reset part inputs
    setSelectedPartId('');
    setSelectedPartQty(1);
    setSelectedPartPrice(0);
  };

  const handleRemovePartFromForm = (partId: string) => {
    setFormUsedParts(prev => prev.filter(p => p.partId !== partId));
  };
  
  // Why-Why Analysis inputs
  const [why1, setWhy1] = useState('');
  const [why2, setWhy2] = useState('');
  const [why3, setWhy3] = useState('');
  const [why4, setWhy4] = useState('');
  const [why5, setWhy5] = useState('');
  const [whyCount, setWhyCount] = useState(1); // Click to add Why levels up to 5

  // Photo
  const [photoBase64, setPhotoBase64] = useState<string>('');

  // Attached Excel File
  const [formExcelName, setFormExcelName] = useState<string>('');
  const [formExcelContent, setFormExcelContent] = useState<string>('');

  // Live MTTR calculation (minutes)
  const getLiveMttr = (): number => {
    if (!formBreakdown || !formDone) return 0;
    const startObj = new Date(formBreakdown);
    const endObj = new Date(formDone);
    const diff = endObj.getTime() - startObj.getTime();
    return diff > 0 ? Math.floor(diff / 60000) : 0;
  };

  const toggleTechnician = (techName: string) => {
    setFormTechnicians(prev => 
      prev.includes(techName) 
        ? prev.filter(t => t !== techName) 
        : [...prev, techName]
    );
  };

  // Image loading base64 helper
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await compressImageFile(file);
        setPhotoBase64(base64);
      } catch (err) {
        console.error("Image compression failed:", err);
      }
    }
    e.target.value = '';
  };

  // Excel file attachment helper
  const handleExcelAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormExcelName(file.name);
        setFormExcelContent(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveRepair = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMachine) {
      alert("กรุณาเลือกเครื่องจักร");
      return;
    }

    const calculatedDuration = getLiveMttr();
    if (calculatedDuration <= 0) {
      alert("กรุณาป้อนเวลาซ่อมเสร็จหลังจากเวลาชำรุดเครื่องจักร");
      return;
    }

    if (!formSymptoms.trim()) {
      alert("กรุณากรอกอาการเสียชำรุดหน้างาน");
      return;
    }

    if (formTechnicians.length === 0) {
      alert("กรุณาเลือกช่างผู้ปฏิบัติการอย่างน้อย 1 คน");
      return;
    }

    const primaryTech = formTechnicians[0] || formTechnician || 'ช่าง 1';

    // Adjust inventory stock
    let tempSpareParts = [...spareParts];
    if (editingId) {
      const oldRepair = repairs.find(r => r.id === editingId);
      if (oldRepair && oldRepair.usedParts) {
        for (const op of oldRepair.usedParts) {
          tempSpareParts = tempSpareParts.map(sp => {
            if (sp.id === op.partId) {
              return { ...sp, quantity: sp.quantity + op.quantity };
            }
            return sp;
          });
        }
      }
    }
    // Deduct new parts
    for (const np of formUsedParts) {
      tempSpareParts = tempSpareParts.map(sp => {
        if (sp.id === np.partId) {
          return { ...sp, quantity: Math.max(0, sp.quantity - np.quantity) };
        }
        return sp;
      });
    }
    setSpareParts(tempSpareParts);

    if (editingId) {
      const oldRepair = repairs.find(r => r.id === editingId);
      const isStatusChangedToClosed = oldRepair && oldRepair.status === 'กำลังซ่อม' && formStatus === 'ปิดงาน';

      const updatedRepair: RepairLog = {
        id: editingId,
        type: 'Repair',
        technician: primaryTech,
        technicians: formTechnicians,
        date: formBreakdown.split('T')[0],
        machineId: formMachine,
        breakdownTime: formBreakdown,
        repairDoneTime: formDone,
        symptoms: formSymptoms.trim(),
        why1: why1.trim(),
        why2: why2.trim(),
        why3: why3.trim(),
        why4: why4.trim(),
        why5: why5.trim(),
        correctiveAction: formCorrection.trim() || 'ทำความสะอาดเครื่องและทดสอบเดินระบบ',
        photo: photoBase64 || undefined,
        duration: calculatedDuration,
        status: formStatus,
        usedParts: formUsedParts,
        otherCost: Number(formOtherCost) || 0,
        excelFile: formExcelName && formExcelContent ? { name: formExcelName, content: formExcelContent } : undefined
      };

      setRepairs(prev => prev.map(r => r.id === editingId ? updatedRepair : r));

      if (isStatusChangedToClosed) {
        const machineObj = machines.find(m => m.id === formMachine);
        const prefix = formMachine.substring(0, 3);
        const stdMttr = settings.stdMttr?.[prefix] || 60;
        notifyRepairClosed(updatedRepair, machineObj?.name || '', stdMttr).catch(console.error);
      }
    } else {
      const newLog: RepairLog = {
        id: `rep-${Date.now()}`,
        type: 'Repair',
        technician: primaryTech,
        technicians: formTechnicians,
        date: formBreakdown.split('T')[0],
        machineId: formMachine,
        breakdownTime: formBreakdown,
        repairDoneTime: formDone,
        symptoms: formSymptoms.trim(),
        why1: why1.trim(),
        why2: why2.trim(),
        why3: why3.trim(),
        why4: why4.trim(),
        why5: why5.trim(),
        correctiveAction: formCorrection.trim() || 'ทำความสะอาดเครื่องและทดสอบเดินระบบ',
        photo: photoBase64 || undefined,
        duration: calculatedDuration,
        status: formStatus,
        usedParts: formUsedParts,
        otherCost: Number(formOtherCost) || 0,
        excelFile: formExcelName && formExcelContent ? { name: formExcelName, content: formExcelContent } : undefined
      };
      setRepairs(prev => [newLog, ...prev]);

      // Notify LINE if enabled
      const machineObj = machines.find(m => m.id === formMachine);
      if (formStatus === 'กำลังซ่อม') {
        notifyRepairOpened(newLog, machineObj?.name || '').catch(console.error);
      } else {
        const prefix = formMachine.substring(0, 3);
        const stdMttr = settings.stdMttr?.[prefix] || 60;
        notifyRepairClosed(newLog, machineObj?.name || '', stdMttr).catch(console.error);
      }
    }

    setShowFormModal(false);

    // Reset Form
    setEditingId(null);
    setFormSymptoms('');
    setFormCorrection('');
    setWhy1(''); setWhy2(''); setWhy3(''); setWhy4(''); setWhy5('');
    setWhyCount(1);
    photoBase64 && setPhotoBase64('');
    setFormExcelName('');
    setFormExcelContent('');
    setFormTechnicians([]);
    setFormStatus('ปิดงาน');
    setFormUsedParts([]);
    setFormOtherCost(0);
    setSelectedPartId('');
    setPartSearchQuery('');
    setSelectedPartQty(1);
    setSelectedPartPrice(0);
  };

  const handleEditClick = (log: RepairLog) => {
    setEditingId(log.id);
    setFormMachine(log.machineId);
    setFormBreakdown(log.breakdownTime);
    setFormDone(log.repairDoneTime);
    setFormSymptoms(log.symptoms);
    setFormTechnician(log.technician);
    setFormTechnicians(log.technicians || (log.technician ? [log.technician] : []));
    setFormCorrection(log.correctiveAction);
    setFormStatus(log.status || 'ปิดงาน');
    setWhy1(log.why1 || '');
    setWhy2(log.why2 || '');
    setWhy3(log.why3 || '');
    setWhy4(log.why4 || '');
    setWhy5(log.why5 || '');
    
    // count active why levels
    let count = 1;
    if (log.why5) count = 5;
    else if (log.why4) count = 4;
    else if (log.why3) count = 3;
    else if (log.why2) count = 2;
    setWhyCount(count);

    setPhotoBase64(log.photo || '');
    setFormExcelName(log.excelFile?.name || '');
    setFormExcelContent(log.excelFile?.content || '');
    setFormUsedParts(log.usedParts || []);
    setFormOtherCost(log.otherCost || 0);
    setSelectedPartId('');
    setPartSearchQuery('');
    setSelectedPartQty(1);
    setSelectedPartPrice(0);
    
    setShowFormModal(true);
  };

  const handleDeleteRepair = (id: string) => {
    setDeleteConfirmId(id);
  };

  // Get machine standard MTTR by prefix or fallback
  const getStandardMttr = (mId: string): number => {
    // Find matching prefix in machine id like "RIM", "VAC", "FFS"
    const prefix = mId.slice(0, 3).toUpperCase();
    const defaults: Record<string, number> = {
      "RIM": 60, "TOC": 45, "VAC": 90, "FFS": 60, "ATS": 60, 
      "MTD": 30, "XRA": 45, "RFD": 45, "BAN": 45, "BCF": 120, 
      "CDU": 120, "TLP": 30, "INK": 30, "STK": 45, "OFR": 90, 
      "RJT": 30, "PAC": 60, "BCH": 90, "LSE": 45, "CLM": 60, 
      "SEH": 60, "CUC": 30, "RST": 90, "RSW": 90, "CUF": 60, 
      "RPT": 60, "WDV": 30, "WDR": 30, "TTB": 30, "FDJ": 30, 
      "FMC": 30
    };
    return defaults[prefix] || 60; // 60 mins fallback standard
  };

  // Export All Filtered Repairs to Excel/CSV with dynamic Thai BOM support
  const handleExportAllToExcel = () => {
    const headers = [
      'รหัสใบงาน',
      'รหัสเครื่องจักร',
      'ชื่อเครื่องจักร',
      'กลุ่มระบบสายผลิต',
      'อาการเสียชำรุด',
      'เวลารายงานเสีย',
      'เวลาซ่อมเสร็จ',
      'ระยะเวลา (นาที)',
      'เกณฑ์มาตรฐาน (MTTR)',
      'ช่างเทคนิคปฏิบัติการ',
      'มาตรการแก้และป้องกันถาวร',
      'Why 1',
      'Why 2',
      'Why 3',
      'Why 4',
      'Why 5',
      'สถานะใบงาน'
    ];

    const csvRows = [headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',')];

    filteredRepairs.forEach(r => {
      const machDetail = machines.find(m => m.id === r.machineId);
      const machName = machDetail ? machDetail.name : 'เครื่องจักรทั่วไป';
      const dept = machDetail ? machDetail.lineGroup : '-';
      const techsStr = r.technicians && r.technicians.length > 0 ? r.technicians.join(' / ') : r.technician;
      
      const row = [
        r.id,
        r.machineId,
        machName,
        dept,
        r.symptoms,
        r.breakdownTime || r.date,
        r.repairDoneTime || '-',
        r.duration,
        `${getStandardMttr(r.machineId)} นาที`,
        techsStr,
        r.correctiveAction,
        r.why1 || '',
        r.why2 || '',
        r.why3 || '',
        r.why4 || '',
        r.why5 || '',
        r.status
      ];
      
      csvRows.push(row.map(val => {
        const str = String(val === null || val === undefined ? '' : val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(','));
    });

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `MTTR_Repair_History_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export single selected repair detail report to Excel/CSV with dynamic Thai BOM support
  const handleExportSingleToExcel = (r: RepairLog) => {
    const machDetail = machines.find(m => m.id === r.machineId);
    const machName = machDetail ? machDetail.name : 'เครื่องจักรทั่วไป';
    const dept = machDetail ? machDetail.lineGroup : '-';
    
    const rows = [
      ['รายงานผลวิเคราะห์การชำรุดและการหยุดงานเครื่องจักร (Breakdown Analysis File)'],
      [],
      ['รหัสเอกสารการซ่อม', r.id],
      ['สถานะของใบงาน', r.status === 'กำลังซ่อม' ? 'อยู่ระหว่างดำเนินการซ่อมบำรุง' : 'ปิดประวัติซ่อมสมบูรณ์'],
      [],
      ['รายละเอียดหน่วยขัดข้องเครื่องจักร'],
      ['รหัสเครื่องจักร (Machine ID)', r.machineId],
      ['ชื่อเครื่องจักรผู้ประสบเหตุ', machName],
      ['แผนก/สายการผลิต (Classification)', dept],
      [],
      ['แดชบอร์ดช่วงเวลาและกระทบขัดข้อง (MTTR Metrics)'],
      ['เวลาเกิดสัญญาณเสียขัดข้อง', r.breakdownTime ? r.breakdownTime.replace('T', ' ') : r.date],
      ['เวลาวิชาการซ่อมแล้วเสร็จคืนผลิต', r.repairDoneTime ? r.repairDoneTime.replace('T', ' ') : '-'],
      ['รวมระยะเวลารวบหยุดเครื่องปฏิบัติซ่อมจริง (นาที)', r.duration],
      ['อัตราตรวจซ่อมตามมาตรฐาน (Target MTTR)', `${getStandardMttr(r.machineId)} นาที`],
      [],
      ['รายละเอียดอาการแจ้งขัดข้องจริง', r.symptoms],
      ['มาตรการแก้ไขและป้องกันเชิงรับถาวร (Action Taken)', r.correctiveAction],
      [],
      ['การวิเคราะห์หาสาเหตุขีดสุดรากเหง้า (Why-Why Analysis)'],
      ['ทำไมชั้นที่ 1 (Why 1)', r.why1 || '-'],
      ['ทำไมชั้นที่ 2 (Why 2)', r.why2 || '-'],
      ['ทำไมชั้นที่ 3 (Why 3)', r.why3 || '-'],
      ['ทำไมชั้นที่ 4 (Why 4)', r.why4 || '-'],
      ['ทำไมชั้นที่ 5 (Why 5)', r.why5 || '-'],
      [],
      ['พนักงานรักษาการ/ทีมช่างเทคนิคผู้ดูแลคุมซ่อม', (r.technicians && r.technicians.length > 0 ? r.technicians.join(', ') : r.technician)]
    ];

    const csvContent = '\uFEFF' + rows.map(row => row.map(val => {
      const str = String(val === null || val === undefined ? '' : val);
      return `"${str.replace(/"/g, '""')}"`;
    }).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Why_Why_Analysis_Report_${r.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- EXCEL IMPORT LOGIC ---

  // Generate preview items when excelData or columnMap changes
  useEffect(() => {
    if (excelData.length === 0) {
      setImportPreview([]);
      return;
    }

    const headers = excelHeaders;
    const rows = excelData.slice(1);

    const parsedLogs: RepairLog[] = rows.map((row, rowIdx) => {
      const rowObj: Record<string, any> = {};
      headers.forEach((h, colIdx) => {
        rowObj[h] = row[colIdx];
      });

      const getVal = (key: string) => {
        const colName = columnMap[key];
        if (!colName) return '';
        const v = rowObj[colName];
        return v !== undefined && v !== null ? String(v).trim() : '';
      };

      const machineIdInput = getVal('machineId');
      const symptomsInput = getVal('symptoms') || 'แจ้งซ่อมบำรุงผ่านการนำเข้าไฟล์';
      const breakdownTimeInput = getVal('breakdownTime');
      const repairDoneTimeInput = getVal('repairDoneTime');
      const correctiveInput = getVal('correctiveAction') || 'ทำความสะอาดเครื่องและตรวจสอบเดินระบบ';
      const primaryTechInput = getVal('primaryTech') || technicians[0] || 'ช่างทั่วไป';
      
      const why1Val = getVal('why1');
      const why2Val = getVal('why2');
      const why3Val = getVal('why3');
      const why4Val = getVal('why4');
      const why5Val = getVal('why5');
      const otherCostVal = Number(getVal('otherCost')) || 0;
      const statusInput = getVal('status');

      // Standardize status: defaults to 'ปิดงาน' unless specified as 'กำลังซ่อม'
      let status: 'กำลังซ่อม' | 'ปิดงาน' = 'ปิดงาน';
      if (statusInput.includes('ซ่อม') || statusInput.toLowerCase().includes('pending') || statusInput.toLowerCase().includes('repair')) {
        status = 'กำลังซ่อม';
      }

      // Handle times
      let breakdownTime = breakdownTimeInput;
      if (!breakdownTime) {
        breakdownTime = new Date().toISOString().slice(0, 16);
      } else {
        breakdownTime = breakdownTime.replace(' ', 'T');
      }

      let repairDoneTime = repairDoneTimeInput;
      if (repairDoneTime) {
        repairDoneTime = repairDoneTime.replace(' ', 'T');
      } else {
        repairDoneTime = '';
      }

      // Calculate duration
      let duration = 60;
      if (breakdownTime && repairDoneTime && status === 'ปิดงาน') {
        const t1 = new Date(breakdownTime).getTime();
        const t2 = new Date(repairDoneTime).getTime();
        if (!isNaN(t1) && !isNaN(t2) && t2 > t1) {
          duration = Math.round((t2 - t1) / 1000 / 60);
        }
      }

      return {
        id: `rep-${Date.now()}-${rowIdx}`,
        type: 'Repair',
        technician: primaryTechInput,
        technicians: [primaryTechInput],
        date: breakdownTime.split('T')[0] || new Date().toISOString().slice(0, 10),
        machineId: machineIdInput || 'UNKNOWN',
        breakdownTime,
        repairDoneTime: status === 'ปิดงาน' ? repairDoneTime : '',
        symptoms: symptomsInput,
        why1: why1Val,
        why2: why2Val,
        why3: why3Val,
        why4: why4Val,
        why5: why5Val,
        correctiveAction: correctiveInput,
        duration,
        status,
        usedParts: [],
        otherCost: otherCostVal
      };
    });

    setImportPreview(parsedLogs);
  }, [excelData, columnMap, technicians]);

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>, isDrop: boolean = false) => {
    if (isDrop) {
      e.preventDefault();
    }
    
    let files: FileList | null = null;
    if (isDrop) {
      const de = e as React.DragEvent<HTMLDivElement>;
      files = de.dataTransfer.files;
    } else {
      const ce = e as React.ChangeEvent<HTMLInputElement>;
      files = ce.target.files;
    }

    if (!files || files.length === 0) return;
    const file = files[0];
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        if (data.length === 0) {
          alert('ไม่พบข้อมูลแถวใดๆ ในไฟล์ Excel ที่เลือก');
          return;
        }

        const headers = (data[0] as any[]).map(h => String(h || '').trim());
        setExcelHeaders(headers);
        setExcelData(data as any[][]);

        // Smart map guesser
        const map: Record<string, string> = {
          machineId: '',
          symptoms: '',
          breakdownTime: '',
          repairDoneTime: '',
          correctiveAction: '',
          primaryTech: '',
          why1: '',
          why2: '',
          why3: '',
          why4: '',
          why5: '',
          otherCost: '',
          status: ''
        };

        headers.forEach((h: string) => {
          const hLower = h.toLowerCase().trim();
          
          if (hLower.includes('machine') || hLower.includes('เครื่องจักร') || hLower.includes('รหัสเครื่อง') || hLower.includes('เครื่อง')) {
            map.machineId = h;
          }
          else if (hLower.includes('symptom') || hLower.includes('อาการ') || hLower.includes('ชำรุด') || hLower.includes('ปัญหา')) {
            map.symptoms = h;
          }
          else if (hLower.includes('breakdown') || hLower.includes('เวลารายงาน') || hLower.includes('เวลาเสีย') || hLower.includes('แจ้งซ่อม')) {
            map.breakdownTime = h;
          }
          else if (hLower.includes('done') || hLower.includes('เสร็จ') || hLower.includes('เวลาคืนผลิต') || hLower.includes('เวลาซ่อมเสร็จ')) {
            map.repairDoneTime = h;
          }
          else if (hLower.includes('action') || hLower.includes('corrective') || hLower.includes('แก้ไข') || hLower.includes('มาตรการ')) {
            map.correctiveAction = h;
          }
          else if (hLower.includes('tech') || hLower.includes('ช่าง') || hLower.includes('ผู้ซ่อม')) {
            map.primaryTech = h;
          }
          else if (hLower.includes('why 1') || hLower.includes('why1') || hLower.includes('ทำไม 1') || hLower.includes('ทำไมที่ 1') || hLower.includes('ทำไมชั้นที่ 1')) {
            map.why1 = h;
          }
          else if (hLower.includes('why 2') || hLower.includes('why2') || hLower.includes('ทำไม 2') || hLower.includes('ทำไมที่ 2') || hLower.includes('ทำไมชั้นที่ 2')) {
            map.why2 = h;
          }
          else if (hLower.includes('why 3') || hLower.includes('why3') || hLower.includes('ทำไม 3') || hLower.includes('ทำไมที่ 3') || hLower.includes('ทำไมชั้นที่ 3')) {
            map.why3 = h;
          }
          else if (hLower.includes('why 4') || hLower.includes('why4') || hLower.includes('ทำไม 4') || hLower.includes('ทำไมที่ 4') || hLower.includes('ทำไมชั้นที่ 4')) {
            map.why4 = h;
          }
          else if (hLower.includes('why 5') || hLower.includes('why5') || hLower.includes('ทำไม 5') || hLower.includes('ทำไมที่ 5') || hLower.includes('ทำไมชั้นที่ 5')) {
            map.why5 = h;
          }
          else if (hLower.includes('cost') || hLower.includes('ค่าแรง') || hLower.includes('ค่าใช้จ่าย') || hLower.includes('บาท')) {
            map.otherCost = h;
          }
          else if (hLower.includes('status') || hLower.includes('สถานะ') || hLower.includes('สเตตัส')) {
            map.status = h;
          }
        });

        setColumnMap(map);
        setImportError('');
      } catch (err) {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์: ' + (err as Error).message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImportSubmit = () => {
    if (importPreview.length === 0) {
      alert('ไม่มีข้อมูลสำหรับนำเข้า กรุณาเลือกไฟล์และตรวจสอบแมปคอลัมน์');
      return;
    }

    const finalRepairs = importPreview.map(rep => {
      const exists = machines.some(m => m.id.toLowerCase() === rep.machineId.toLowerCase());
      if (!exists) {
        const found = machines.find(m => m.id.toLowerCase().trim() === rep.machineId.toLowerCase().trim());
        if (found) {
          rep.machineId = found.id;
        } else {
          rep.machineId = machines[0]?.id || 'RIM01';
        }
      }
      return rep;
    });

    setRepairs(prev => [...finalRepairs, ...prev]);

    alert(`นำเข้าประวัติงานซ่อมด่วนจากไฟล์ Excel สำเร็จจำนวน ${finalRepairs.length} รายการ!`);
    
    if (finalRepairs.length > 0) {
      const activeSummary = `📥 [นำเข้าประวัติซ่อมบำรุง]
📊 นำเข้าสำเร็จ: ${finalRepairs.length} รายการ
🛠️ ช่างนำเข้าข้อมูล: ${finalRepairs[0]?.technician || 'ระบบ'}
📅 วันที่ทำรายการ: ${new Date().toLocaleDateString('th-TH')}
⏰ อัพเดทเข้าระบบเรียบร้อยแล้ว`;
      sendLineNotification(activeSummary).catch(console.error);
    }

    setExcelData([]);
    setExcelHeaders([]);
    setFileName('');
    setImportPreview([]);
    setShowImportModal(false);
  };

  const downloadImportTemplate = () => {
    const headers = [
      'รหัสเครื่องจักร *',
      'อาการเสียชำรุด *',
      'เวลารายงานเสีย (YYYY-MM-DD HH:MM) *',
      'เวลาซ่อมเสร็จ (YYYY-MM-DD HH:MM)',
      'มาตรการแก้ไขและป้องกันเชิงรับถาวร',
      'ช่างผู้รับผิดชอบหลัก *',
      'ทำไมชั้นที่ 1 (Why 1)',
      'ทำไมชั้นที่ 2 (Why 2)',
      'ทำไมชั้นที่ 3 (Why 3)',
      'ทำไมชั้นที่ 4 (Why 4)',
      'ทำไมชั้นที่ 5 (Why 5)',
      'ค่าใช้จ่ายอื่นๆ (บาท)',
      'สถานะ (กำลังซ่อม/ปิดงาน)'
    ];
    const sampleData = [
      [
        'RIM01',
        'มีกลิ่นไหม้และควันออกจากตู้คุมมอเตอร์',
        '2026-06-10 09:00',
        '2026-06-10 11:30',
        'ทำความสะอาดหน้าสัมผัสคอนแทคเตอร์และปรับปรุงระบบระบายอากาศ',
        'ช่าง 1',
        'คอนแทคเตอร์ทำงานเกินพิกัด',
        'กระแสไฟฟ้าเกินเนื่องจากมอเตอร์ติดขัด',
        'ตลับลูกปืนมอเตอร์ชำรุด',
        'ขาดการอัดจารบีตามระยะเวลาบำรุงรักษา',
        'ไม่มีระบบแจ้งเตือนรอบการอัดจารบีบำรุงรักษาเชิงป้องกัน',
        '0',
        'ปิดงาน'
      ],
      [
        'FFS01',
        'กระบอกลมซีลไม่ทำงาน',
        '2026-06-12 14:15',
        '',
        '',
        'ช่าง 2',
        'ลมรั่วที่โซลินอยด์วาล์ว',
        'ซีลยางด้านในเสื่อมสภาพ',
        'ใช้งานเกินอายุงานสัญญา',
        '',
        '',
        '500',
        'กำลังซ่อม'
      ]
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RepairTemplate");
    XLSX.writeFile(wb, "maintenance_repair_import_template.xlsx");
  };

  // Filter & Sort core logs
  const filteredRepairs = repairs
    .filter(r => {
      const matchMachine = machineFilter ? r.machineId.toLowerCase().includes(machineFilter.toLowerCase()) : true;
      const matchTech = techFilter 
        ? (r.technicians ? r.technicians.includes(techFilter) : r.technician === techFilter) 
        : true;
      const matchMonth = monthFilter ? r.date.startsWith(monthFilter) : true;
      const matchMttr = mttrFilter ? r.duration > mttrFilter : true;
      return matchMachine && matchTech && matchMonth && matchMttr;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        const timeA = new Date(a.breakdownTime || a.date).getTime();
        const timeB = new Date(b.breakdownTime || b.date).getTime();
        return timeB - timeA; // Newest first
      } else {
        return b.duration - a.duration; // MTTR Descending
      }
    }); // Default sorted by Date Desc (ล่าสุดก่อน) or MTTR Desc

  return (
    <div className="space-y-6" id="repair-page-root">
      
      {/* Header action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-cyan-400 tracking-tight flex items-center gap-2">
            🔧 บันทึกประวัติและวิเคราะห์งานซ่อมด่วน (Breakdown Logs)
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            ลงด่วนรายงานการทำงานซ่อมบำรุง วิเคราะห์หาปัจจัยรากเหง้า Why-Why อนุมัติบันทึกเข้าตารางปฏิบัติงาน
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 self-stretch sm:self-auto shrink-0">
          {canEdit && (
            <button
              type="button"
              id="btn-import-repairs-excel"
              onClick={() => {
                setExcelData([]);
                setExcelHeaders([]);
                setFileName('');
                setImportPreview([]);
                setShowImportModal(true);
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold px-4 py-2.5 rounded-lg transition-all shadow-md focus:outline-none text-xs cursor-pointer"
              title="นำเข้าประวัติการซ่อมบำรุงจากไฟล์ Excel"
            >
              <Upload size={16} />
              นำเข้า Excel ประวัติซ่อม
            </button>
          )}

          <button
            type="button"
            id="btn-export-repairs-excel"
            onClick={handleExportAllToExcel}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold px-4 py-2.5 rounded-lg transition-all shadow-md focus:outline-none text-xs cursor-pointer"
            title="ส่งออกบันทึกการซ่อมด่วนไปเป็น Excel (CSV) สดประมวลข้อมูล Thai Language เรียบร้อย"
          >
            <FileSpreadsheet size={16} />
            ส่งออก Excel ประวัติซ่อม
          </button>

          {canEdit ? (
            <button
              id="btn-add-repair"
              onClick={() => {
                setEditingId(null);
                setPartSearchQuery('');
                setFormMachine(machines[0]?.id || '');
                setFormBreakdown(`${getTodayDateString()}T09:00`);
                setFormDone(`${getTodayDateString()}T11:30`);
                setFormSymptoms('');
                setFormTechnician(technicians[0] || 'ช่าง 1');
                setFormTechnicians([technicians[0] || 'ช่าง 1']);
                setFormCorrection('');
                setWhy1(''); setWhy2(''); setWhy3(''); setWhy4(''); setWhy5('');
                setWhyCount(1);
                setPhotoBase64('');
                setShowFormModal(true);
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-red-650 hover:from-rose-400 hover:to-red-500 text-white font-bold px-4 py-2.5 rounded-lg transition-all shadow-md focus:outline-none text-xs cursor-pointer"
            >
              <Plus size={18} />
              บันทึกแจ้งซ่อมด่วน
            </button>
          ) : (
            <div className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs flex items-center gap-1.5 border border-slate-700">
              <span>🔒 สิทธิ์ดูอย่างเดียว (Viewer)</span>
            </div>
          )}
        </div>
      </div>

      {/* SEARCH FILTERS BLOCK */}
      <div id="repair-filter-container" className="bg-slate-800 border border-slate-700/80 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5 mb-2">
          <SlidersHorizontal size={14} className="text-cyan-400" />
          ตัวกรองตรวจสอบประวัติละเอียด
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400">ค้นหารหัสเครื่องจักร</label>
            <input
              id="filter-rep-machine"
              type="text"
              placeholder="เช่น RIM01, FFS..."
              value={machineFilter}
              onChange={(e) => setMachineFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400">ช่างผู้รับผิดชอบ</label>
            <select
              id="filter-rep-tech"
              value={techFilter}
              onChange={(e) => setTechFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-[#dee2e6] focus:outline-none focus:border-cyan-500"
            >
              <option value="">-- ทั้งหมด --</option>
              {technicians.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400">ประจำเดือนปี</label>
            <input
              id="filter-rep-month"
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400">MTTR นานกว่า (นาที)</label>
            <select
              id="filter-rep-mttr"
              value={mttrFilter}
              onChange={(e) => setMttrFilter(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value={0}>-- ตารางทั้งหมด --</option>
              <option value={30}>&gt; 30 นาที</option>
              <option value={60}>&gt; 60 นาที (1 ชม.)</option>
              <option value={120}>&gt; 120 นาที (2 ชม.)</option>
              <option value={240}>&gt; 240 นาที (4 ชม.)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-cyan-400">เรียงตาม (Sort by)</label>
            <select
              id="filter-rep-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'duration')}
              className="w-full bg-slate-900 border border-slate-750/90 rounded-lg px-3 py-1.5 text-xs text-cyan-300 font-bold focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="date">📅 วันที่เสียล่าสุดก่อน</option>
              <option value="duration">⏱ เวลากระทบเสียนานสุด (MTTR)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Informational double-click guide */}
      <div className="bg-cyan-950/40 border border-cyan-800/30 rounded-xl p-3.5 flex items-center justify-between text-xs text-cyan-300">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>💡 <strong>คำแนะนำการใช้งาน:</strong> สามารถ <strong>ดับเบิ้ลคลิก (Double-click)</strong> แถวรายการซ่อมบำรุงในตารางด้านล่าง เพื่อเรียกดูหน้าต่างรายละเอียดเชิงลึก วิเคราะห์ Why-Why พร้อมรูปถ่าย หรือเลือก ลบ/แก้ไขข้อมูล ได้ทันที</span>
        </div>
      </div>

      {/* REPAIR HISTORICAL LOGS TABLE */}
      <div id="repair-table-container" className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs" id="repairs-history-table">
            <thead>
              <tr className="bg-slate-800/90 border-b border-slate-700 text-slate-300 font-medium tracking-wide uppercase py-4">
                <th className="py-4 px-4 w-28">วันที่เสีย</th>
                <th className="py-4 px-3 w-28 font-mono">เครื่อง (ID)</th>
                <th className="py-4 px-4">ชื่อเครื่องจักร</th>
                <th className="py-4 px-3 text-center">MTTR (นาที)</th>
                <th className="py-4 px-3 text-center">Std. MTTR</th>
                <th className="py-4 px-4">อาการเสียชำรุด</th>
                <th className="py-4 px-4">Why 1 (วิเคราะห์แรกพบ)</th>
                <th className="py-4 px-3 text-right">ค่าซ่อมทั้งหมด</th>
                <th className="py-4 px-3 text-center">ช่างซ่อม</th>
                <th className="py-4 px-3 text-center w-24 font-semibold text-slate-350">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredRepairs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 bg-slate-900/10">
                    ไม่พบข้อมูลแจ้งซ่อมสำหรับตัวกรองที่เลือก
                  </td>
                </tr>
              ) : (
                filteredRepairs.map((r) => {
                  const std = getStandardMttr(r.machineId);
                  const mach = machines.find(m => m.id === r.machineId);
                  const isExceed120Percent = r.duration > std * 1.2;
                  const isRedRow = r.duration > 120; // Row highlight red if MTTR > 120 นาที

                  return (
                    <tr 
                      key={r.id}
                      id={`repair-row-${r.id}`}
                      className={`hover:bg-slate-750/90 transition-colors cursor-pointer select-none ${
                        isRedRow ? 'bg-red-500/10 border-l-4 border-l-red-500' : ''
                      }`}
                      onDoubleClick={() => setSelectedRepairDetail(r)}
                      title="ดับเบิ้ลคลิก (Double-click) เพื่อดูรายละเอียด Why-Why เชิงลึก"
                    >
                      <td className="py-4 px-4 text-slate-400 font-mono">
                        <div className="flex flex-col gap-1">
                          <span>{r.date}</span>
                          {r.status === 'กำลังซ่อม' ? (
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 py-0.5 rounded text-[9px] font-bold text-center animate-pulse">
                              กำลังซ่อม
                            </span>
                          ) : (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 py-0.5 rounded text-[9px] font-bold text-center">
                              ปิดสำเร็จ
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-3 font-mono font-bold text-red-400">
                        {r.machineId}
                      </td>
                      <td className="py-4 px-4 font-medium text-slate-200">
                        {mach?.name || 'เครื่องจักรทั่วไป'}
                      </td>
                      <td className="py-4 px-3 text-center font-mono font-bold">
                        <span className={isExceed120Percent ? "text-rose-400 font-extrabold" : "text-slate-300"}>
                          {r.duration} นาที
                        </span>
                      </td>
                      <td className="py-4 px-3 text-center font-mono text-slate-450 text-[11px]">
                        {std} นาที
                      </td>
                      <td className="py-4 px-4 max-w-[160px] truncate" title={r.symptoms}>
                        <div className="flex flex-col gap-1">
                          <span className="truncate">{r.symptoms}</span>
                          {r.excelFile && (
                            <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-medium self-start font-sans">
                              <FileSpreadsheet size={11} />
                              แนบไฟล์ Excel
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 max-w-[180px] truncate text-slate-350 italic" title={r.why1}>
                        {r.why1 || "-"}
                      </td>
                      <td className="py-4 px-3 text-right font-mono font-semibold text-cyan-400 whitespace-nowrap">
                        {((r.usedParts?.reduce((sum, item) => sum + item.totalCost, 0) || 0) + (r.otherCost || 0)).toLocaleString()} ฿
                      </td>
                      <td className="py-4 px-3 text-center">
                        <div className="flex flex-wrap gap-1 justify-center max-w-[140px] mx-auto">
                          {(r.technicians && r.technicians.length > 0 ? r.technicians : [r.technician]).map(tech => (
                            <span key={tech} className="bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-750 text-[10.5px] whitespace-nowrap">
                              {tech}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {canEdit && (
                            <button
                              id={`btn-edit-rep-${r.id}`}
                              onClick={() => handleEditClick(r)}
                              className="text-slate-500 hover:text-cyan-400 p-1 rounded-md transition hover:bg-slate-900"
                              title="แก้ไขประวัติงานซ่อม"
                            >
                              <Edit size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              id={`btn-delete-rep-${r.id}`}
                              onClick={() => handleDeleteRepair(r.id)}
                              className="text-slate-500 hover:text-rose-400 p-1 rounded-md transition hover:bg-slate-900"
                              title="ลบประวัติงานซ่อม (เฉพาะ Admin)"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          {!canEdit && !canDelete && (
                            <span className="text-[10px] text-slate-500 italic">ดูอย่างเดียว</span>
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

      {/* [+ บันทึกงานซ่อม] FORM MODAL DIALOG */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div id="repair-form-modal" className="bg-slate-800 border border-slate-700 rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-155">
            {/* Header info */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700/85 p-5 shrink-0 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-rose-400 flex items-center gap-1.5">
                  {editingId ? "✏️ แก้ไขประวัติงานซ่อมด่วนและการวิเคราะห์หน้างาน" : "🚨 บันทึกซ่อมด่วนและการวิเคราะห์หน้างาน"}
                </h3>
                <p className="text-slate-450 text-[11px] mt-0.5">
                  {editingId ? "ปรับปรุงข้อมูลรายงานการทำงานซ่อมบำรุงและวิเคราะห์รากเหง้าแฝง" : "กรอกข้อมูลให้ประณีตเพื่อการคำนวณและวิเคราะห์ที่ถูกต้อง"}
                </p>
              </div>

              {/* Live MTTR badge */}
              <div className="bg-slate-950 border border-slate-700 px-3.5 py-1.5 rounded-lg text-right h-12 flex flex-col justify-center shrink-0">
                <span className="text-[8px] text-slate-400 uppercase tracking-widest font-bold">LIVE MTTR:</span>
                <span className="text-sm font-mono font-bold text-rose-450">{getLiveMttr()} นาที</span>
              </div>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveRepair} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              
              {/* Row 1: Machine Select */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300">เลือกเครื่องจักร*</label>
                <select
                  id="frm-rep-machine"
                  required
                  value={formMachine}
                  onChange={(e) => setFormMachine(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                >
                  {machines.map(m => (
                    <option key={m.id} value={m.id}>{m.id} : {m.name}</option>
                  ))}
                </select>
              </div>

              {/* Row 1.5: Multi-Technician Select Checkboxes */}
              <div className="space-y-1.5 bg-slate-900/40 p-3 rounded-xl border border-slate-700">
                <div className="flex justify-between items-center text-[11px] font-semibold">
                  <span className="text-slate-300">ช่างเทคนิคผู้รับผิดชอบงานซ่อม (รับผิดชอบงานได้หลายคน)*</span>
                  <span className="text-cyan-400 font-bold font-mono">เลือกแล้ว: {formTechnicians.length} คน</span>
                </div>
                
                {/* Scrollable grid area */}
                <div className="mt-1.5 max-h-[140px] overflow-y-auto border border-slate-750 bg-slate-950 rounded-lg p-2.5 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {technicians.map(t => {
                    const isChecked = formTechnicians.includes(t);
                    return (
                      <label 
                        key={t} 
                        className={`flex items-center gap-1.5 p-1.5 rounded-md border cursor-pointer select-none transition-all ${
                          isChecked 
                            ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 font-bold' 
                            : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-300 hover:border-slate-750'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleTechnician(t)}
                          className="w-3.5 h-3.5 rounded accent-cyan-500 cursor-pointer"
                        />
                        <span className="text-[11px] truncate">{t}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Row 2: Breakdown time -> Done time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-300">วันเวลาที่เกิดแจ้งเสีย (Breakdown Time)*</label>
                  <input
                    id="frm-rep-breakdown"
                    type="datetime-local"
                    required
                    value={formBreakdown}
                    onChange={(e) => setFormBreakdown(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-center focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-300">วันเวลาที่ซ่อมเสร็จเดินเครื่องได้ (Done)*</label>
                  <input
                    id="frm-rep-done"
                    type="datetime-local"
                    required
                    value={formDone}
                    onChange={(e) => setFormDone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-center focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Row 3: Symptoms */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300">รายละเอียดอาการเสียที่พบ*</label>
                <input
                  id="frm-rep-symptoms"
                  type="text"
                  required
                  placeholder="เช่น ลูกปืนพัดลมฝืดจัดและหน้าจอละลายควันขึ้น"
                  value={formSymptoms}
                  onChange={(e) => setFormSymptoms(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 focus:outline-none"
                />
              </div>

              {/* Row 4: Why-Why analysis 1-5 (Cascading dynamic display) */}
              <div className="bg-slate-900/40 p-4 border border-slate-700 rounded-xl space-y-3">
                <div className="flex justify-between items-center select-none pb-1.5 border-b border-slate-700/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    ❓ วิเคราะห์ Why-Why หาปัจจัยรากเหง้าแฝง
                  </span>
                  <button
                    type="button"
                    onClick={() => setWhyCount(prev => Math.min(5, prev + 1))}
                    disabled={whyCount === 5}
                    className="text-[10px] font-bold bg-cyan-500/10 hover:bg-cyan-550 border border-cyan-550/20 text-cyan-400 hover:text-slate-950 px-2.5 py-1 rounded transition disabled:opacity-40"
                  >
                    + เพิ่มคำถาม Why ({whyCount}/5)
                  </button>
                </div>

                <div className="space-y-2 pt-1" id="why-cascading-inputs">
                  {whyCount >= 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-red-400 w-12 shrink-0">Why 1 :</span>
                      <input
                        type="text"
                        placeholder="ทำไมจึงแจ้งเสีย? (เช่น ตัวเซ็นเซอร์ไม่ตัดรอบแกนลูกถ้วย)"
                        value={why1}
                        onChange={(e) => setWhy1(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 focus:outline-none"
                      />
                    </div>
                  )}
                  {whyCount >= 2 && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                      <span className="text-[10px] font-bold text-red-400 w-12 shrink-0">Why 2 :</span>
                      <input
                        type="text"
                        placeholder="ทำไมไม่ตัดรอบ? (เช่น คราบจาระบีเกาะแห้งหนาก็เลยบังลำแสง)"
                        value={why2}
                        onChange={(e) => setWhy2(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 focus:outline-none"
                      />
                    </div>
                  )}
                  {whyCount >= 3 && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                      <span className="text-[10px] font-bold text-red-400 w-12 shrink-0">Why 3 :</span>
                      <input
                        type="text"
                        placeholder="ทำไมมีคราบบังแสง? (เช่น ฝาครอบเซ็นเซอร์บิดตัวเปิดกว้างออก)"
                        value={why3}
                        onChange={(e) => setWhy3(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 focus:outline-none"
                      />
                    </div>
                  )}
                  {whyCount >= 4 && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                      <span className="text-[10px] font-bold text-red-400 w-12 shrink-0">Why 4 :</span>
                      <input
                        type="text"
                        placeholder="ทำไมฝาบิดตัว? (เช่น ช่างซ่อมคนก่อนยึดสลักเกลียวแค่ตัวเดียวเวลาขันเกลียว)"
                        value={why4}
                        onChange={(e) => setWhy4(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 focus:outline-none"
                      />
                    </div>
                  )}
                  {whyCount >= 5 && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                      <span className="text-[10px] font-bold text-red-400 w-12 shrink-0">Why 5 :</span>
                      <input
                        type="text"
                        placeholder="ทำไมช่างไม่ตรวจ? (เช่น ขอบเขตการยึดน็อตเซ็นเซอร์ไม่มีระบุในขั้นตอนมาตรฐาน)"
                        value={why5}
                        onChange={(e) => setWhy5(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Row 5: Corrective action */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300">มาตรการแก้ไขแนวทางป้องกันถาวร*</label>
                <textarea
                  id="frm-rep-correction"
                  required
                  rows={2}
                  placeholder="เช่น ทำความสะอาดหัวจิกและซีลขั้วด้วยเทปยืดพิเศษ พร้อมบันทึกแผนขันสลักให้ครบ 2 ตัวลงใบ PM สากล"
                  value={formCorrection}
                  onChange={(e) => setFormCorrection(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-205 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Row 5.5: Status of Ticket */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300">สถานะใบงานซ่อมบำรุง*</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as 'กำลังซ่อม' | 'ปิดงาน')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-250 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ปิดงาน">ปิดสำเร็จ (การดำเนินการเสร็จสิ้นเรียบร้อย)</option>
                  <option value="กำลังซ่อม">กำลังซ่อม (อยู่ระหว่างซ่อม/งานยังค้างอยู่)</option>
                </select>
              </div>

              {/* SPARE PARTS AND REPAIR COSTS SECTION */}
              <div className="bg-slate-900/50 p-4 border border-slate-700/80 rounded-xl space-y-3">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wide flex items-center gap-1 select-none">
                  🛠️ อะไหล่ที่ใช้และค่าใช้จ่าย (Spare Parts & Repair Costs)
                </span>
                
                {/* Add spare part widget */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                  <div className="sm:col-span-7 space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold flex justify-between items-center">
                      <span>เลือกรายการอะไหล่ในคลัง</span>
                      {partSearchQuery && (
                        <button 
                          type="button" 
                          onClick={() => setPartSearchQuery('')} 
                          className="text-[9px] text-cyan-400 hover:underline"
                        >
                          ล้างค้นหา ✕
                        </button>
                      )}
                    </label>
                    <div className="space-y-1">
                      <input
                        type="text"
                        placeholder="🔍 พิมพ์ค้นหาอะไหล่ (ชื่อ หรือ รหัส)..."
                        value={partSearchQuery}
                        onChange={(e) => setPartSearchQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10.5px] text-slate-200 focus:outline-none focus:border-cyan-500 placeholder-slate-500 font-sans"
                      />
                      <select
                        value={selectedPartId}
                        onChange={(e) => {
                          const pid = e.target.value;
                          setSelectedPartId(pid);
                          const found = spareParts.find(p => p.id === pid);
                          if (found) {
                            setSelectedPartPrice(found.pricePerUnit);
                          } else {
                            setSelectedPartPrice(0);
                          }
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
                      >
                        <option value="">
                          {partSearchQuery ? `-- อะไหล่ที่ตรงค้นหา (${spareParts.filter(sp => sp.name.toLowerCase().includes(partSearchQuery.toLowerCase()) || sp.id.toLowerCase().includes(partSearchQuery.toLowerCase())).length} รายการ) --` : "-- เลือกอะไหล่ --"}
                        </option>
                        {spareParts
                          .filter(sp => {
                            if (!partSearchQuery) return true;
                            const q = partSearchQuery.toLowerCase();
                            return sp.name.toLowerCase().includes(q) || sp.id.toLowerCase().includes(q);
                          })
                          .map(sp => {
                            // Highlight if part matches this machine
                            const isMatch = sp.machineIds?.includes(formMachine);
                            return (
                              <option key={sp.id} value={sp.id}>
                                {isMatch ? "⭐ " : ""}{sp.name} [{sp.id}] - {sp.pricePerUnit.toLocaleString()} บาท/หน่วย (คงเหลือ: {sp.quantity} {sp.unit})
                              </option>
                            );
                          })}
                      </select>
                    </div>
                  </div>

                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[10px] text-slate-400 text-center block">จำนวน</label>
                    <input
                      type="number"
                      min="1"
                      value={selectedPartQty}
                      onChange={(e) => setSelectedPartQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-500 text-center font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1 flex flex-col justify-end">
                    <button
                      type="button"
                      onClick={handleAddPartToForm}
                      className="w-full bg-cyan-500/20 hover:bg-cyan-500 border border-cyan-500/30 hover:text-slate-950 text-cyan-400 font-bold text-[11px] py-1.5 rounded transition flex items-center justify-center"
                    >
                      เพิ่ม
                    </button>
                  </div>
                </div>

                {/* Used spare parts list */}
                {formUsedParts.length > 0 ? (
                  <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
                    <table className="w-full text-left text-[10px] text-slate-350">
                      <thead className="bg-slate-900 text-slate-400 text-[9px] uppercase border-b border-slate-800 select-none">
                        <tr>
                          <th className="p-2 pl-3">รายการอะไหล่</th>
                          <th className="p-2 text-center w-16">จำนวน</th>
                          <th className="p-2 text-right w-20">หน่วยละ</th>
                          <th className="p-2 text-right w-20">ราคารวม</th>
                          <th className="p-2 text-center w-10">ลบ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {formUsedParts.map(item => {
                          const originalPart = spareParts.find(p => p.id === item.partId);
                          return (
                            <tr key={item.partId} className="hover:bg-slate-900/50">
                              <td className="p-2 pl-3">
                                <p className="font-semibold text-slate-200">{originalPart?.name || item.partId}</p>
                                <p className="text-[8px] text-slate-500 font-mono">{item.partId}</p>
                              </td>
                              <td className="p-2 text-center font-mono text-slate-300">{item.quantity} {originalPart?.unit}</td>
                              <td className="p-2 text-right font-mono text-slate-350">{item.pricePerUnit.toLocaleString()} ฿</td>
                              <td className="p-2 text-right font-mono text-cyan-400 font-semibold">{item.totalCost.toLocaleString()} ฿</td>
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemovePartFromForm(item.partId)}
                                  className="text-slate-500 hover:text-rose-400 p-0.5 rounded hover:bg-slate-900"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-500 italic text-center py-2 bg-slate-950/30 rounded border border-slate-850/60 select-none">
                    ยังไม่มีการใช้อะไหล่ในใบงานนี้
                  </p>
                )}

                {/* Other costs like labor, contractor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/60">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-300 font-semibold">ค่าแรง/ค่าบริการอื่นๆ (บาท)</label>
                    <input
                      type="number"
                      min="0"
                      value={formOtherCost || ""}
                      onChange={(e) => setFormOtherCost(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="เช่น 0"
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <div className="flex flex-col justify-center items-end pr-2">
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">รวมค่าซ่อมทั้งสิ้น</span>
                    <span className="text-sm font-black font-mono text-cyan-400 mt-1">
                      {(formUsedParts.reduce((sum, item) => sum + item.totalCost, 0) + Number(formOtherCost || 0)).toLocaleString()} บาท
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 6: Photo Attachment base64 */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300">แนบรูปภาพรายงานชำรุดเครื่องจักร (ถ้าต้องการ)</label>
                <div className="border border-dashed border-slate-700/60 hover:border-cyan-500/50 p-4 rounded-xl flex items-center justify-center bg-slate-900/10 cursor-pointer text-center relative group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  
                  {photoBase64 ? (
                    <div className="flex flex-col items-center space-y-2">
                      <img 
                      src={photoBase64} 
                      alt="breakdown attachment" 
                      className="w-24 h-24 object-cover rounded border border-slate-700" 
                      referrerPolicy="no-referrer"
                      />
                      <span className="text-[10px] text-emerald-400 font-bold">✓ อัปโหลดสำเร็จแล้ว (รูปภาพบันทึกเรียบร้อย)</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-1 text-slate-400 group-hover:text-slate-300">
                      <ImageIcon size={22} className="text-slate-500" />
                      <p className="font-sans font-medium text-[11px]">คลิก หรือ ลากวางเพื่อแนบรูปภาพหน้างานจริง</p>
                      <p className="text-[9px] text-slate-500">รองรับระบบประจักษ์หลักฐานซ่อม JPG, PNG (.base64)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 6.5: Excel Attachment */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <FileSpreadsheet size={15} className="text-emerald-400" />
                  แนบไฟล์ตาราง Excel / เอกสารประกอบใบงาน (ถ้าต้องการ)
                </label>
                <div className="border border-dashed border-slate-700/60 hover:border-emerald-500/50 p-4 rounded-xl flex items-center justify-center bg-slate-900/10 cursor-pointer text-center relative group">
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv, .pdf, .doc, .docx"
                    onChange={handleExcelAttachmentUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  
                  {formExcelName ? (
                    <div className="flex flex-col items-center space-y-2">
                      <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs p-2.5 rounded-lg flex items-center gap-2 font-mono">
                        <FileSpreadsheet size={16} />
                        <span>{formExcelName}</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold">✓ แนบไฟล์สำเร็จแล้ว</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-1 text-slate-400 group-hover:text-slate-300">
                      <Upload size={22} className="text-slate-500" />
                      <p className="font-sans font-medium text-[11px]">คลิก หรือ ลากวางเพื่อแนบไฟล์ Excel (.xlsx, .xls, .csv)</p>
                      <p className="text-[9px] text-slate-500">รองรับไฟล์ตารางคำนวณหรือแผนงานเพื่อแนบเข้าบันทึกซ่อม</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="pt-4 border-t border-slate-700 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="border border-slate-700 hover:bg-slate-700/80 text-slate-300 text-xs px-4 py-2.5 rounded-lg transition"
                >
                  ยกเลิก
                </button>
                <button
                  id="frm-btn-save-repair"
                  type="submit"
                  className="bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition shadow-md"
                >
                  {editingId ? "บันทึกการแก้ไข" : "อนุมัติรายงานวิเคราะห์ซ่อม"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details modal */}
      {selectedRepairDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div id="repair-detail-modal" className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-850 border-b border-slate-700 p-5 shrink-0 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="p-1 px-2.5 bg-rose-500/10 border border-rose-500/20 rounded-full text-[10px] font-extrabold text-rose-400 font-mono">
                  BREAKDOWN LOG DETAILS
                </span>
                <span className="text-slate-400 text-xs">| รหัสใบงาน: {selectedRepairDetail.id}</span>
              </div>
              <button 
                onClick={() => setSelectedRepairDetail(null)}
                className="text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-700/60 w-7 h-7 flex items-center justify-center rounded-lg transition"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-200 text-xs">
              
              {/* Machine & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-750">
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">เครื่องจักรที่เกิดอาการเสีย</p>
                  <p className="text-sm font-bold text-cyan-450 mt-1 font-mono">
                    {selectedRepairDetail.machineId} : {machines.find(m => m.id === selectedRepairDetail.machineId)?.name || 'เครื่องจักรทั่วไป'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    แผนก/กลุ่มสายผลิต: {machines.find(m => m.id === selectedRepairDetail.machineId)?.lineGroup || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">สถานะใบงานซ่อม</p>
                  <div className="mt-1">
                    {selectedRepairDetail.status === 'กำลังซ่อม' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full font-bold">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping"></span>
                        อยู่ระหว่างดำเนินการซ่อม
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-bold">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                        ปิดประวัติซ่อมสำเร็จแล้ว
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Time Indicators */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/30 p-4 rounded-xl border border-slate-755 text-center">
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">เวลาที่เกิดแจ้งเสีย (Breakdown)</p>
                  <p className="text-xs font-mono font-bold text-rose-400 mt-1">
                    {selectedRepairDetail.breakdownTime ? selectedRepairDetail.breakdownTime.replace('T', ' ') : selectedRepairDetail.date}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">เวลาซ่อมเดินเครื่องได้ (Done)</p>
                  <p className="text-xs font-mono font-bold text-emerald-400 mt-1">
                    {selectedRepairDetail.repairDoneTime ? selectedRepairDetail.repairDoneTime.replace('T', ' ') : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold">รวมเวลายึดเครื่อง (MTTR)</p>
                  <p className="text-xs font-mono font-bold text-slate-100 mt-1">
                    <span className="text-rose-450 font-extrabold">{selectedRepairDetail.duration} นาที</span>
                    <span className="text-slate-450 font-normal"> (เป้าหมาย: {getStandardMttr(selectedRepairDetail.machineId)} นาที)</span>
                  </p>
                </div>
              </div>

              {/* Problem Symptoms & Corrective Action */}
              <div className="space-y-4">
                <div className="bg-slate-900/20 p-4 rounded-xl border border-slate-750">
                  <h4 className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 mb-2">
                    🚨 อาการเสียชำรุดที่พบหน้างานจริง
                  </h4>
                  <p className="text-slate-200 leading-relaxed pl-4 border-l-2 border-red-500 bg-slate-950/40 p-2.5 rounded-r-lg">{selectedRepairDetail.symptoms}</p>
                </div>

                <div className="bg-slate-900/20 p-4 rounded-xl border border-slate-750">
                  <h4 className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 mb-2">
                    🛠 มาตรการซ่อมแซมและป้องกันถาวร (Action Taken)
                  </h4>
                  <p className="text-slate-200 leading-relaxed pl-4 border-l-2 border-cyan-500 bg-slate-950/40 p-2.5 rounded-r-lg">{selectedRepairDetail.correctiveAction}</p>
                </div>
              </div>

              {/* Why Why Analysis */}
              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-750 space-y-3">
                <h4 className="text-[11px] font-bold text-slate-300 tracking-wide uppercase flex items-center gap-1.5 border-b border-slate-700/60 pb-2">
                  ❓ ลำดับการวิเคราะห์หาสาเหตุรากเหง้าแฝง (Why-Why Analysis)
                </h4>
                
                <div className="space-y-2.5 pl-2 font-mono">
                  {selectedRepairDetail.why1 ? (
                    <div className="flex items-start gap-2.5">
                      <span className="text-[11px] font-bold text-red-400 shrink-0 w-14">Why 1 :</span>
                      <p className="text-slate-300 italic">{selectedRepairDetail.why1}</p>
                    </div>
                  ) : (
                    <p className="text-slate-500 italic text-[11px]">ไม่ได้บันทึกข้อมูลวิเคราะห์ Why 1</p>
                  )}

                  {selectedRepairDetail.why2 && (
                    <div className="flex items-start gap-2.5 border-t border-slate-800/65 pt-2">
                      <span className="text-[11px] font-bold text-red-400 shrink-0 w-14">Why 2 :</span>
                      <p className="text-slate-300 italic">{selectedRepairDetail.why2}</p>
                    </div>
                  )}

                  {selectedRepairDetail.why3 && (
                    <div className="flex items-start gap-2.5 border-t border-slate-800/65 pt-2">
                      <span className="text-[11px] font-bold text-red-400 shrink-0 w-14">Why 3 :</span>
                      <p className="text-slate-300 italic">{selectedRepairDetail.why3}</p>
                    </div>
                  )}

                  {selectedRepairDetail.why4 && (
                    <div className="flex items-start gap-2.5 border-t border-slate-800/65 pt-2">
                      <span className="text-[11px] font-bold text-red-400 shrink-0 w-14">Why 4 :</span>
                      <p className="text-slate-300 italic">{selectedRepairDetail.why4}</p>
                    </div>
                  )}

                  {selectedRepairDetail.why5 && (
                    <div className="flex items-start gap-2.5 border-t border-slate-800/65 pt-2">
                      <span className="text-[11px] font-bold text-red-400 shrink-0 w-14">Why 5 :</span>
                      <p className="text-slate-300 italic">{selectedRepairDetail.why5}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Used Spare Parts & Cost breakdown in Detail Modal */}
              <div className="bg-slate-900/30 border border-slate-750 p-4 rounded-xl space-y-3">
                <h4 className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 border-b border-slate-800 pb-2 select-none">
                  🛠️ รายการอะไหล่ที่เปลี่ยนและมูลค่าซ่อมบำรุง
                </h4>
                
                {selectedRepairDetail.usedParts && selectedRepairDetail.usedParts.length > 0 ? (
                  <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/80">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-900/80 text-slate-400 text-[10px] uppercase border-b border-slate-800 select-none">
                        <tr>
                          <th className="p-2.5 pl-3">ชื่ออะไหล่ / SKU</th>
                          <th className="p-2.5 text-center w-20">จำนวน</th>
                          <th className="p-2.5 text-right w-24">หน่วยละ</th>
                          <th className="p-2.5 text-right w-24">ราคารวม</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {selectedRepairDetail.usedParts.map(item => {
                          const partInfo = spareParts.find(p => p.id === item.partId);
                          return (
                            <tr key={item.partId} className="hover:bg-slate-900/40 text-slate-300">
                              <td className="p-2.5 pl-3">
                                <p className="font-semibold">{partInfo?.name || item.partId}</p>
                                <p className="text-[9px] text-slate-500 font-mono">{item.partId}</p>
                              </td>
                              <td className="p-2.5 text-center font-mono">{item.quantity} {partInfo?.unit}</td>
                              <td className="p-2.5 text-right font-mono">{item.pricePerUnit.toLocaleString()} ฿</td>
                              <td className="p-2.5 text-right font-mono text-cyan-400 font-bold">{item.totalCost.toLocaleString()} ฿</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic text-center py-2 bg-slate-950/20 rounded border border-slate-850 select-none">
                    ไม่มีรายงานการเบิกเปลี่ยนอะไหล่สำหรับประวัติซ่อมนี้
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4 pt-1.5 text-xs">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold">ค่าแรง / ค่าซ่อมบำรุงอื่นๆ</span>
                    <span className="font-mono text-slate-200 mt-0.5 font-bold">
                      {(selectedRepairDetail.otherCost || 0).toLocaleString()} บาท
                    </span>
                  </div>
                  <div className="flex flex-col items-end pr-2">
                    <span className="text-[10px] text-slate-400 font-bold">รวมค่าใช้จ่ายทั้งสิ้น</span>
                    <span className="text-sm font-black text-cyan-400 font-mono mt-0.5">
                      {((selectedRepairDetail.usedParts?.reduce((sum, i) => sum + i.totalCost, 0) || 0) + (selectedRepairDetail.otherCost || 0)).toLocaleString()} บาท
                    </span>
                  </div>
                </div>
              </div>

              {/* Technicians & Image attachment */}
              <div className="flex flex-col sm:flex-row gap-5 bg-slate-900/20 p-4 rounded-xl border border-slate-750">
                <div className="flex-1">
                  <p className="text-slate-400 text-[10px] uppercase font-bold mb-2">👥 ทีมช่างเทคนิคผู้เข้าปฏิบัติการณ์</p>
                  <div className="flex flex-wrap gap-2">
                    {(selectedRepairDetail.technicians && selectedRepairDetail.technicians.length > 0 
                      ? selectedRepairDetail.technicians 
                      : [selectedRepairDetail.technician]
                    ).map(t => (
                      <span key={t} className="bg-slate-950 border border-slate-750 text-slate-300 px-3 py-1.5 rounded-lg font-semibold text-xs">
                        🔧 {t}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedRepairDetail.photo && (
                  <div className="shrink-0 flex flex-col items-center">
                    <p className="text-slate-400 text-[10px] uppercase font-bold mb-2 text-center">หลักฐานแนบการซ่อม</p>
                    <img 
                      src={selectedRepairDetail.photo} 
                      alt="breakdown" 
                      className="w-24 h-24 object-cover rounded-lg border border-slate-700 hover:scale-[1.05] transition cursor-zoom-in" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>

              {selectedRepairDetail.excelFile && (
                <div className="bg-emerald-950/20 border border-emerald-900/40 p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <FileSpreadsheet className="text-emerald-400 shrink-0" size={24} />
                    <div className="text-left">
                      <p className="text-[11px] font-bold text-emerald-300">ไฟล์แนบประกอบใบงาน</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate max-w-[280px]" title={selectedRepairDetail.excelFile.name}>
                        {selectedRepairDetail.excelFile.name}
                      </p>
                    </div>
                  </div>
                  <a
                    href={selectedRepairDetail.excelFile.content}
                    download={selectedRepairDetail.excelFile.name}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] px-3.5 py-2 rounded-lg transition shadow-md whitespace-nowrap cursor-pointer"
                  >
                    <Upload size={14} className="rotate-180" />
                    ดาวน์โหลดไฟล์แนบ
                  </a>
                </div>
              )}

            </div>

            {/* Footer control buttons */}
            <div className="p-5 bg-slate-900/80 border-t border-slate-700/80 flex justify-between items-center shrink-0">
              <button
                type="button"
                id={`detail-delete-btn-${selectedRepairDetail.id}`}
                onClick={() => {
                  const targetId = selectedRepairDetail.id;
                  setSelectedRepairDetail(null);
                  handleDeleteRepair(targetId);
                }}
                className="flex items-center gap-1.5 border border-rose-500/30 hover:bg-rose-600 hover:border-rose-500 hover:text-white text-rose-400 font-bold text-xs px-4 py-2 my-1 rounded-lg transition"
              >
                <Trash2 size={13} />
                ลบบันทึกประวัตินี้
              </button>

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  id={`detail-export-single-excel-${selectedRepairDetail.id}`}
                  onClick={() => handleExportSingleToExcel(selectedRepairDetail)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition shadow-md cursor-pointer"
                  title="ดาวน์โหลดใบบันทึกเชิงวิเคราะห์และสรุป Why-Why นี้ออกเป็นไฟล์ Excel (CSV)"
                >
                  <FileSpreadsheet size={13} />
                  ส่งออกใบวิเคราะห์ Excel
                </button>
                <button
                  type="button"
                  id={`detail-edit-btn-${selectedRepairDetail.id}`}
                  onClick={() => {
                    const currentLog = selectedRepairDetail;
                    setSelectedRepairDetail(null);
                    handleEditClick(currentLog);
                  }}
                  className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs px-4.5 py-2 rounded-lg transition shadow-md"
                >
                  <Edit size={13} />
                  แก้ไขประวัติซ่อม
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRepairDetail(null)}
                  className="border border-slate-700 hover:bg-slate-700/90 text-slate-300 text-xs px-4 py-2 rounded-lg transition"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXCEL IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div id="repair-import-modal" className="bg-slate-900 border border-slate-750 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-slate-100">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-950 border-b border-slate-750 p-5 shrink-0 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-cyan-400 flex items-center gap-2">
                  <Upload size={20} className="text-cyan-400" />
                  นำเข้าประวัติงานซ่อมด่วนจากไฟล์ Excel (.xlsx, .xls, .csv)
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  อัพโหลดไฟล์ตารางบันทึกการแจ้งซ่อมเพื่อนำเข้าประวัติปริมาณมากเข้าระบบได้ทันที
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 p-1.5 rounded-lg transition shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Template Download & Drag-drop Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="md:col-span-1 bg-slate-950/40 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider mb-2">ขั้นตอนนำเข้าข้อมูล</h4>
                    <ul className="text-xs text-slate-400 space-y-2 list-decimal list-inside leading-relaxed">
                      <li>ดาวน์โหลดไฟล์ฟอร์แมตมาตรฐาน</li>
                      <li>กรอกข้อมูลประวัติการซ่อมบำรุง</li>
                      <li>อัปโหลดไฟล์เข้าระบบ</li>
                      <li>จับคู่คอลัมน์และตรวจสอบตัวอย่าง</li>
                      <li>กดยืนยันเพื่อบันทึกประวัติ</li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={downloadImportTemplate}
                    className="w-full flex items-center justify-center gap-1.8 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white font-bold py-2 rounded-lg transition text-xs cursor-pointer shadow-sm"
                  >
                    <FileSpreadsheet size={15} className="text-emerald-400" />
                    ดาวน์โหลดไฟล์ตัวอย่าง (.xlsx)
                  </button>
                </div>

                <div 
                  className={`md:col-span-2 border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition ${
                    isDragging ? 'border-cyan-500 bg-cyan-950/10' : 'border-slate-800 bg-slate-950/20 hover:border-slate-700'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { setIsDragging(false); handleExcelUpload(e, true); }}
                >
                  <Upload size={38} className="text-slate-500 mb-2.5" />
                  <span className="text-xs font-bold text-slate-200">
                    {fileName ? `ไฟล์ที่เลือก: ${fileName}` : 'ลากไฟล์ Excel มาวางที่นี่ หรือ คลิกเพื่อเลือกไฟล์'}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    รองรับไฟล์นามสกุล .xlsx, .xls, .csv เท่านั้น
                  </span>
                  
                  <label className="mt-4 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition shadow-md">
                    เลือกไฟล์ในเครื่อง
                    <input 
                      type="file" 
                      accept=".xlsx, .xls, .csv" 
                      className="hidden" 
                      onChange={(e) => handleExcelUpload(e, false)} 
                    />
                  </label>
                </div>
              </div>

              {/* Column Mapping Section */}
              {excelHeaders.length > 0 && (
                <div className="bg-slate-950/35 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <h4 className="text-xs font-extrabold text-cyan-400 uppercase tracking-wide flex items-center gap-1.5">
                      ⚙️ ตรวจจับคอลัมน์อัจฉริยะ (Column Mapping)
                    </h4>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono">
                      พบคอลัมน์ในไฟล์: {excelHeaders.length}
                    </span>
                  </div>
                  
                  <p className="text-[10.5px] text-slate-400">
                    ระบบพยายามเดาจับคู่คอลัมน์ให้อัตโนมัติ โปรดตรวจทานหรือปรับเปลี่ยนให้ตรงกับตาราง Excel ของคุณ
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-2">
                    {[
                      { key: 'machineId', label: 'รหัสเครื่องจักร *', required: true },
                      { key: 'symptoms', label: 'อาการเสียชำรุด *', required: true },
                      { key: 'breakdownTime', label: 'เวลาเสีย (บกพร่อง) *', required: true },
                      { key: 'repairDoneTime', label: 'เวลาซ่อมเสร็จคืนผลิต', required: false },
                      { key: 'correctiveAction', label: 'มาตรการแก้ไขและป้องกัน', required: false },
                      { key: 'primaryTech', label: 'ช่างปฏิบัติการหลัก *', required: true },
                      { key: 'why1', label: 'วิเคราะห์ Why 1', required: false },
                      { key: 'why2', label: 'วิเคราะห์ Why 2', required: false },
                      { key: 'why3', label: 'วิเคราะห์ Why 3', required: false },
                      { key: 'why4', label: 'วิเคราะห์ Why 4', required: false },
                      { key: 'why5', label: 'วิเคราะห์ Why 5', required: false },
                      { key: 'otherCost', label: 'ค่าใช้จ่ายอื่นๆ (บาท)', required: false },
                      { key: 'status', label: 'สถานะใบงาน', required: false }
                    ].map(field => (
                      <div key={field.key} className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                          {field.label}
                          {field.required && <span className="text-rose-500 font-extrabold">*</span>}
                        </label>
                        <select
                          value={columnMap[field.key] || ''}
                          onChange={(e) => setColumnMap(prev => ({ ...prev, [field.key]: e.target.value }))}
                          className="w-full bg-slate-900 border border-slate-750 text-xs text-slate-200 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-cyan-500"
                        >
                          <option value="">-- ไม่ระบุ --</option>
                          {excelHeaders.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Import Preview Section */}
              {importPreview.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-250 uppercase tracking-wide flex items-center gap-1.5">
                    👀 พรีวิวตัวอย่างข้อมูลนำเข้า (แรกเริ่ม {Math.min(5, importPreview.length)} จาก {importPreview.length} รายการ)
                  </h4>
                  
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/20">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-[10px] text-slate-400 border-b border-slate-800 uppercase tracking-wider font-mono">
                          <th className="py-2.5 px-3">วันที่ / เวลาเสีย</th>
                          <th className="py-2.5 px-3">รหัสเครื่องจักร</th>
                          <th className="py-2.5 px-3">อาการเสียชำรุด</th>
                          <th className="py-2.5 px-3">ช่างซ่อมบำรุง</th>
                          <th className="py-2.5 px-3">เวลารวม (นาที)</th>
                          <th className="py-2.5 px-3 text-center">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-xs">
                        {importPreview.slice(0, 5).map((preview, idx) => {
                          const machineObj = machines.find(m => m.id.toLowerCase() === preview.machineId.toLowerCase());
                          return (
                            <tr key={idx} className="hover:bg-slate-800/20 text-slate-300">
                              <td className="py-2 px-3 font-mono text-[11px] text-slate-400">
                                {preview.breakdownTime.replace('T', ' ')}
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-mono text-cyan-400 font-bold">{preview.machineId}</span>
                                <span className="text-[10px] text-slate-400 block">{machineObj?.name || 'ไม่พบในทะเบียน'}</span>
                              </td>
                              <td className="py-2 px-3 truncate max-w-[180px]" title={preview.symptoms}>
                                {preview.symptoms}
                              </td>
                              <td className="py-2 px-3 text-slate-350">
                                {preview.technician}
                              </td>
                              <td className="py-2 px-3 font-mono text-center text-slate-400">
                                {preview.status === 'ปิดงาน' ? `${preview.duration} นาที` : '-'}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                  preview.status === 'กำลังซ่อม' 
                                    ? 'bg-rose-500/10 text-rose-450 border border-rose-500/20' 
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}>
                                  {preview.status}
                                </span>
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

            {/* Modal Footer */}
            <div className="bg-slate-950 border-t border-slate-750 p-4 shrink-0 flex gap-3 justify-end items-center">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="border border-slate-700 hover:bg-slate-850 text-slate-300 font-bold text-xs px-5 py-2.5 rounded-lg transition"
              >
                ยกเลิก
              </button>
              
              <button
                type="button"
                onClick={handleImportSubmit}
                disabled={importPreview.length === 0}
                className={`flex items-center gap-1.5 font-bold text-xs px-6 py-2.5 rounded-lg transition shadow-md ${
                  importPreview.length > 0 
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white cursor-pointer' 
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-750'
                }`}
              >
                <CheckCircle size={15} />
                นำเข้าข้อมูลสู่ระบบ ({importPreview.length} รายการ)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in duration-100">
          <div id="repair-delete-modal" className="bg-slate-900 border border-slate-750 p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-100">
            <div className="flex items-center gap-3 text-rose-500 border-b border-slate-800 pb-3">
              <AlertTriangle size={24} className="text-rose-500 shrink-0" />
              <h3 className="text-sm font-extrabold text-slate-100">🚨 ยืนยันการลบประวัติงานซ่อม</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              คุณต้องการลบบันทึกวิเคราะห์งานซ่อมด่วนนี้ ใช่หรือไม่? ประวัติอาการเกิดเหตุและวิเคราะห์ Why-Why ทั้งหมดจะสูญหายอย่างถาวร
            </p>
            <div className="flex gap-2.5 justify-end pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="border border-slate-700 hover:bg-slate-850 text-slate-300 text-xs px-4 py-2 rounded-lg transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                id="btn-confirm-delete-action"
                onClick={() => {
                  const logToDelete = repairs.find(r => r.id === deleteConfirmId);
                  if (logToDelete && logToDelete.usedParts) {
                    let tempSpareParts = [...spareParts];
                    for (const op of logToDelete.usedParts) {
                      tempSpareParts = tempSpareParts.map(sp => {
                        if (sp.id === op.partId) {
                          return { ...sp, quantity: sp.quantity + op.quantity };
                        }
                        return sp;
                      });
                    }
                    setSpareParts(tempSpareParts);
                  }
                  setRepairs(prev => prev.filter(r => r.id !== deleteConfirmId));
                  setDeleteConfirmId(null);
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs px-4.5 py-2 rounded-lg transition"
              >
                ยืนยันลบเด็ดขาด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
