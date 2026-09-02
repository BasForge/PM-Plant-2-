import React, { useState } from 'react';
import { 
  Award, PenTool, Wrench, ClipboardCheck, Clock, User, Sparkles, 
  Search, Filter, CheckCircle2, AlertCircle, Calendar, Shield, 
  ArrowUpRight, Plus, FileText, Printer, ChevronRight, Layers,
  Lightbulb, ExternalLink, Activity, Image as ImageIcon, CheckCircle,
  ThumbsUp, Target, TrendingUp, Users, ZoomIn, UploadCloud, X,
  FileSpreadsheet, Download, Loader2, Trash2, BookOpen, HelpCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useApp } from '../context/AppContext';
import { ImprovementProject, RepairLog, PMScheduleItem, SetupLog, PDFFileAttachment, KaizenCategory } from '../types';
import { compressImageFile } from '../utils/imageUtils';
import { PDFViewerModal } from './kaizen/PDFViewerModal';

export const TechnicianPortfolioPage: React.FC = () => {
  const { 
    technicians, 
    employees, 
    improvements, 
    repairs, 
    schedules, 
    setupLogs, 
    machines,
    pmPlans,
    setImprovements
  } = useApp();

  // Selected technician state - default to first technician
  const [selectedTech, setSelectedTech] = useState<string>(technicians[0] || 'ช่าง 1');
  const [activeTab, setActiveTab] = useState<'all' | 'kaizen' | 'repairs' | 'pm_setup'>('all');
  const [kaizenCategoryFilter, setKaizenCategoryFilter] = useState<'all' | 'KAIZEN' | 'OPL' | 'FA' | 'WHY_WHY'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activePDF, setActivePDF] = useState<PDFFileAttachment | null>(null);

  // PDF Preview & Download state
  const [showPDFModal, setShowPDFModal] = useState<boolean>(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const [pdfProgressText, setPdfProgressText] = useState<string>('');

  // New Kaizen Project Modal state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDesc, setNewDesc] = useState<string>('');
  const [newMachineId, setNewMachineId] = useState<string>('');
  const [newStartDate, setNewStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newEndDate, setNewEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newStatus, setNewStatus] = useState<'วางแผน' | 'กำลังดำเนินการ' | 'เสร็จแล้ว'>('กำลังดำเนินการ');
  const [newWorkHours, setNewWorkHours] = useState<number>(2);
  const [newWorkNote, setNewWorkNote] = useState<string>('');
  const [newPhotoBefore, setNewPhotoBefore] = useState<string>('');
  const [newPhotoAfter, setNewPhotoAfter] = useState<string>('');

  // Lightbox / Fullscreen Image Viewer Modal state
  const [lightboxData, setLightboxData] = useState<{
    url: string;
    title: string;
    subtitle: string;
    badge: string;
    type: 'before' | 'after';
    projId?: string;
  } | null>(null);

  // In-app Delete Confirmation Modal state (bypasses window.confirm for iframe compatibility)
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    projId: string;
    projTitle: string;
    type: 'before' | 'after';
  } | null>(null);

  // FileReader & Compression helpers for photo upload in form
  const handlePhotoBeforeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await compressImageFile(file);
        setNewPhotoBefore(base64);
      } catch (err) {
        console.error("Image upload failed:", err);
      }
    }
    e.target.value = '';
  };

  const handlePhotoAfterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await compressImageFile(file);
        setNewPhotoAfter(base64);
      } catch (err) {
        console.error("Image upload failed:", err);
      }
    }
    e.target.value = '';
  };

  // Helper for direct photo upload/update from card view
  const handleCardImageUpload = async (projId: string, type: 'before' | 'after', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await compressImageFile(file);
        setImprovements(prev => prev.map(p => {
          if (p.id === projId) {
            return type === 'before'
              ? { ...p, photoBefore: base64 }
              : { ...p, photoAfter: base64 };
          }
          return p;
        }));
      } catch (err) {
        console.error("Card image upload failed:", err);
      }
    }
    e.target.value = '';
  };

  // Helper for initiating deletion of photo from Kaizen project
  const handleRemoveImage = (projId: string, type: 'before' | 'after', title?: string) => {
    const project = improvements.find(p => p.id === projId);
    setDeleteConfirmModal({
      projId,
      projTitle: title || project?.title || 'โครงการ Kaizen',
      type
    });
  };

  // Confirm delete handler (works 100% reliably in iframes without window.confirm)
  const handleConfirmDelete = () => {
    if (!deleteConfirmModal) return;
    const { projId, type } = deleteConfirmModal;
    setImprovements(prev => prev.map(p => {
      if (p.id === projId) {
        const updated = { ...p };
        if (type === 'before') {
          updated.photoBefore = undefined;
        } else {
          updated.photoAfter = undefined;
        }
        return updated;
      }
      return p;
    }));

    // If this photo is currently open in lightbox, close it
    setLightboxData(prev => {
      if (prev && prev.projId === projId && prev.type === type) {
        return null;
      }
      return prev;
    });

    setDeleteConfirmModal(null);
  };

  // Selected Employee Details if present in employees array
  const currentEmp = employees.find(e => e.name === selectedTech);

  // Filter Kaizen/Improvement projects for selected technician
  const allTechImprovements = improvements.filter(imp => {
    const isTechInvolved = imp.technician === selectedTech || (imp.technicians && imp.technicians.includes(selectedTech));
    return isTechInvolved;
  });

  const techImprovements = allTechImprovements.filter(imp => {
    if (statusFilter !== 'all' && imp.status !== statusFilter) return false;

    if (kaizenCategoryFilter !== 'all') {
      const itemCat = imp.category || 'KAIZEN';
      if (itemCat !== kaizenCategoryFilter) return false;
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTitle = imp.title.toLowerCase().includes(q);
      const matchDesc = imp.description.toLowerCase().includes(q);
      const matchMachine = imp.machineId?.toLowerCase().includes(q) || false;
      const matchLogs = imp.workLogs?.some(w => w.note.toLowerCase().includes(q)) || false;
      const matchSOP = imp.oplData?.sopDocumentRef?.toLowerCase().includes(q) || false;
      const matchPart = imp.faData?.failurePartName?.toLowerCase().includes(q) || false;
      return matchTitle || matchDesc || matchMachine || matchLogs || matchSOP || matchPart;
    }
    return true;
  });

  // Category breakdowns for selected technician
  const techKaizenCount = allTechImprovements.filter(i => !i.category || i.category === 'KAIZEN').length;
  const techOPLCount = allTechImprovements.filter(i => i.category === 'OPL').length;
  const techFACount = allTechImprovements.filter(i => i.category === 'FA').length;
  const techWhyWhyCount = allTechImprovements.filter(i => i.category === 'WHY_WHY').length;

  // Filter Repair logs for selected technician
  const techRepairs = repairs.filter(rep => {
    const isTechInvolved = rep.technician === selectedTech || (rep.technicians && rep.technicians.includes(selectedTech));
    if (!isTechInvolved) return false;

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchSymptoms = rep.symptoms.toLowerCase().includes(q);
      const matchAction = rep.correctiveAction.toLowerCase().includes(q);
      const matchMachine = rep.machineId.toLowerCase().includes(q);
      return matchSymptoms || matchAction || matchMachine;
    }
    return true;
  });

  // Filter Completed PMs for selected technician
  const techPMs = schedules.filter(s => {
    if (s.type !== 'PM') return false;
    const pm = s as PMScheduleItem;
    const isTechInvolved = pm.technician === selectedTech || (pm.technicians && pm.technicians.includes(selectedTech));
    return isTechInvolved && pm.status === 'เสร็จสิ้น';
  }) as PMScheduleItem[];

  // Filter Setup logs for selected technician
  const techSetups = setupLogs.filter(set => {
    return set.technicians && set.technicians.includes(selectedTech);
  });

  // Calculate Aggregated Metrics for selected technician
  const totalKaizenProjects = improvements.filter(imp => imp.technician === selectedTech || imp.technicians?.includes(selectedTech)).length;
  const completedKaizen = improvements.filter(imp => (imp.technician === selectedTech || imp.technicians?.includes(selectedTech)) && imp.status === 'เสร็จแล้ว').length;
  
  const totalKaizenHours = improvements
    .filter(imp => imp.technician === selectedTech || imp.technicians?.includes(selectedTech))
    .reduce((sum, imp) => {
      const logsSum = imp.workLogs ? imp.workLogs.reduce((wSum, wl) => wSum + wl.hours, 0) : 0;
      return sum + logsSum;
    }, 0);

  const totalRepairsHandled = repairs.filter(rep => rep.technician === selectedTech || rep.technicians?.includes(selectedTech)).length;
  const avgRepairMttr = totalRepairsHandled > 0 
    ? Math.round(repairs.filter(rep => rep.technician === selectedTech || rep.technicians?.includes(selectedTech)).reduce((sum, r) => sum + r.duration, 0) / totalRepairsHandled)
    : 0;

  const totalPMCompleted = techPMs.length;
  const totalSetups = techSetups.length;

  // Function to handle adding a new Kaizen project
  const handleCreateKaizen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) {
      alert("กรุณากรอกชื่อโครงการและรายละเอียดผลงาน Kaizen");
      return;
    }

    const newProject: ImprovementProject = {
      id: `imp-${Date.now()}`,
      type: 'Improvement',
      title: newTitle.trim(),
      description: newDesc.trim(),
      machineId: newMachineId.trim() || undefined,
      startDate: newStartDate,
      plannedEndDate: newEndDate,
      status: newStatus,
      technician: selectedTech,
      technicians: [selectedTech],
      photoBefore: newPhotoBefore || undefined,
      photoAfter: newPhotoAfter || undefined,
      workLogs: newWorkNote.trim() ? [{
        id: `wl-${Date.now()}`,
        date: newStartDate,
        hours: Number(newWorkHours) || 1,
        note: newWorkNote.trim()
      }] : []
    };

    setImprovements(prev => [newProject, ...prev]);

    // Reset Form
    setNewTitle('');
    setNewDesc('');
    setNewMachineId('');
    setNewWorkNote('');
    setNewPhotoBefore('');
    setNewPhotoAfter('');
    setShowAddModal(false);

    alert(`เพิ่มผลงาน Kaizen ให้กับ ${selectedTech} เรียบร้อยแล้ว!`);
  };

  // Helper function to get machine name
  const getMachineName = (machineId?: string) => {
    if (!machineId) return 'อุปกรณ์/ทั่วไปในโรงงาน';
    const m = machines.find(mac => mac.id === machineId);
    return m ? `${m.id} - ${m.name}` : machineId;
  };

  // Export Portfolio data to Excel (.xlsx)
  const handleExportExcel = () => {
    const techKaizens = improvements.filter(imp => imp.technician === selectedTech || imp.technicians?.includes(selectedTech));
    const techRepairList = repairs.filter(rep => rep.technician === selectedTech || rep.technicians?.includes(selectedTech));
    const techPmList = techPMs;
    const techSetupList = techSetups;

    // 1. Summary Sheet
    const summaryData = [
      ['รายงานสรุปประวัติผลงานช่างซ่อมบำรุง (Technician Engineering Portfolio)'],
      ['ระบบบริหารจัดการงานซ่อมบำรุงโรงงานอาหาร (Thai Food Maint)'],
      ['วันที่ออกรายงาน:', new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })],
      [''],
      ['=== ข้อมูลช่างซ่อมบำรุง (Technician Profile) ==='],
      ['ชื่อช่าง:', selectedTech],
      ['ตำแหน่งงาน:', currentEmp?.position || 'ช่างซ่อมบำรุง'],
      ['รหัสพนักงาน:', currentEmp?.id || '-'],
      ['สังกัดฝ่าย/แผนก:', 'ฝ่ายวิศวกรรมและซ่อมบำรุง (Food Plant Maintenance)'],
      ['มาตรฐานโรงงาน:', 'ผ่านการรับรองมาตรฐาน GMP / HACCP Food Safety'],
      [''],
      ['=== สรุปดัชนีชี้วัดผลงานหลัก (Key Performance Indicators) ==='],
      ['จำนวนโครงการ Kaizen ทั้งหมด (โครงการ):', totalKaizenProjects],
      ['โครงการ Kaizen ที่สำเร็จแล้ว (โครงการ):', completedKaizen],
      ['ชั่วโมงที่ลงแรงพัฒนา Kaizen รวม (ชั่วโมง):', totalKaizenHours],
      ['จำนวนงานซ่อมเครื่องจักรที่รับผิดชอบ (งาน):', totalRepairsHandled],
      ['ค่าเฉลี่ยเวลาซ่อม MTTR (นาที):', avgRepairMttr],
      ['จำนวนงานบำรุงรักษาเชิงป้องกัน PM ที่ทำสำเร็จ (งาน):', totalPMCompleted],
      ['จำนวนงาน Setup/ปรับตั้งเครื่องจักร (งาน):', totalSetups]
    ];

    // 2. Kaizen Sheet
    const kaizenHeaders = [
      'ลำดับ',
      'รหัสโครงการ',
      'ชื่อโครงการ Kaizen / งานปรับปรุง',
      'เครื่องจักร / พื้นที่',
      'วันที่เริ่มโครงการ',
      'วันที่คาดเสร็จ / สำเร็จจริง',
      'สถานะโครงการ',
      'ช่างผู้รับผิดชอบ',
      'รายละเอียดปัญหาและการปรับปรุง',
      'ชั่วโมงทำงานรวม (ชม.)',
      'บันทึกการปฏิบัติงานล่าสุด'
    ];

    const kaizenRows = techKaizens.map((imp, idx) => {
      const totalHrs = imp.workLogs?.reduce((sum, l) => sum + l.hours, 0) || 0;
      const latestLog = imp.workLogs && imp.workLogs.length > 0 
        ? `${imp.workLogs[imp.workLogs.length - 1].date}: ${imp.workLogs[imp.workLogs.length - 1].note} (${imp.workLogs[imp.workLogs.length - 1].hours} ชม.)`
        : '-';
      const allTechs = imp.technicians && imp.technicians.length > 0 ? imp.technicians.join(', ') : (imp.technician || selectedTech);

      return [
        idx + 1,
        imp.id,
        imp.title,
        getMachineName(imp.machineId),
        imp.startDate,
        imp.plannedEndDate || '-',
        imp.status,
        allTechs,
        imp.description,
        totalHrs,
        latestLog
      ];
    });

    // 3. Repair Sheet
    const repairHeaders = [
      'ลำดับ',
      'รหัสงานซ่อม',
      'วันที่แจ้งซ่อม',
      'รหัสเครื่องจักร',
      'ชื่อเครื่องจักร',
      'อาการเสีย / ปัญหาที่พบ',
      'การวิเคราะห์สาเหตุ (Why-Why)',
      'มาตรการแก้ไขและปรับปรุง',
      'เวลาซ่อมจริง MTTR (นาที)',
      'สถานะงานซ่อม',
      'ช่างซ่อม'
    ];

    const repairRows = techRepairList.map((rep, idx) => {
      const m = machines.find(mac => mac.id === rep.machineId);
      const whyReasons = [rep.why1, rep.why2, rep.why3, rep.why4, rep.why5].filter(Boolean).join(' -> ');
      return [
        idx + 1,
        rep.id,
        rep.date,
        rep.machineId,
        m ? m.name : rep.machineId,
        rep.symptoms,
        whyReasons || '-',
        rep.correctiveAction || '-',
        rep.duration || 0,
        rep.status || 'ปิดงาน',
        rep.technicians?.join(', ') || rep.technician || selectedTech
      ];
    });

    // 4. PM Sheet
    const pmHeaders = [
      'ลำดับ',
      'รหัสงาน PM',
      'วันที่',
      'รหัสเครื่องจักร',
      'ชื่อเครื่องจักร',
      'แผนการบำรุงรักษา (PM Plan)',
      'เวลามาตรฐาน TTM (นาที)',
      'เวลาที่ใช้จริง (นาที)',
      'สถานะงาน PM',
      'ช่างผู้ปฏิบัติงาน'
    ];

    const pmRows = techPmList.map((pm, idx) => {
      const m = machines.find(mac => mac.id === pm.machineId);
      const plan = pmPlans.find(p => p.id === pm.pmPlanId);
      return [
        idx + 1,
        pm.id,
        pm.date,
        pm.machineId,
        m ? m.name : pm.machineId,
        plan?.title || pm.pmPlanId,
        pm.duration || 0,
        pm.actualDuration || pm.duration || 0,
        pm.status,
        pm.technicians?.join(', ') || pm.technician || selectedTech
      ];
    });

    // 5. Setup Sheet
    const setupHeaders = [
      'ลำดับ',
      'รหัสงาน Setup',
      'วันที่',
      'เครื่องจักร',
      'ประเภทงาน Setup',
      'เวลาที่ใช้รวม (นาที)',
      'ขั้นตอนที่ทำ',
      'หมายเหตุ / ความเบี่ยงเบน',
      'ช่างผู้ปฏิบัติงาน'
    ];

    const setupRows = techSetupList.map((s, idx) => {
      const stepSummary = s.steps?.map(st => `${st.stepName}: ${st.duration} นาที`).join(', ') || '-';
      return [
        idx + 1,
        s.id,
        s.date,
        getMachineName(s.machineId),
        s.type,
        s.totalDuration,
        stepSummary,
        s.deviationReason || s.note || '-',
        s.technicians?.join(', ') || selectedTech
      ];
    });

    // Create workbook and append sheets
    const wb = XLSX.utils.book_new();

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 42 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'สรุปภาพรวมช่าง');

    const wsKaizen = XLSX.utils.aoa_to_sheet([kaizenHeaders, ...kaizenRows]);
    wsKaizen['!cols'] = [
      { wch: 6 }, { wch: 14 }, { wch: 32 }, { wch: 25 },
      { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 22 },
      { wch: 45 }, { wch: 15 }, { wch: 40 }
    ];
    XLSX.utils.book_append_sheet(wb, wsKaizen, 'ผลงาน Kaizen');

    const wsRepair = XLSX.utils.aoa_to_sheet([repairHeaders, ...repairRows]);
    wsRepair['!cols'] = [
      { wch: 6 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 25 }, { wch: 30 }, { wch: 35 }, { wch: 35 },
      { wch: 18 }, { wch: 15 }, { wch: 22 }
    ];
    XLSX.utils.book_append_sheet(wb, wsRepair, 'ประวัติงานซ่อมบำรุง');

    const wsPM = XLSX.utils.aoa_to_sheet([pmHeaders, ...pmRows]);
    wsPM['!cols'] = [
      { wch: 6 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 25 }, { wch: 30 }, { wch: 18 }, { wch: 18 },
      { wch: 15 }, { wch: 22 }
    ];
    XLSX.utils.book_append_sheet(wb, wsPM, 'ประวัติงาน PM');

    if (setupRows.length > 0) {
      const wsSetup = XLSX.utils.aoa_to_sheet([setupHeaders, ...setupRows]);
      wsSetup['!cols'] = [
        { wch: 6 }, { wch: 14 }, { wch: 14 }, { wch: 25 },
        { wch: 20 }, { wch: 18 }, { wch: 40 }, { wch: 30 }, { wch: 22 }
      ];
      XLSX.utils.book_append_sheet(wb, wsSetup, 'ประวัติการ Setup');
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const cleanTechName = selectedTech.replace(/[^a-zA-Z0-9ก-๙]/g, '_');
    XLSX.writeFile(wb, `Portfolio_ผลงาน_${cleanTechName}_${dateStr}.xlsx`);
  };

  // Helper to build a 100% self-contained HTML document with inline CSS that never fails in print or PDF
  const buildStandalonePortfolioHTML = () => {
    const cleanTechName = selectedTech.replace(/[^a-zA-Z0-9ก-๙]/g, '_');
    const dateStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    const docId = `TFM-PORT-${selectedTech.replace(/\s+/g, '')}-${new Date().getFullYear()}`;

    // Kaizen Projects HTML
    const kaizenHTML = techImprovements.length === 0 
      ? '<p style="font-size:12px; color:#64748b; font-style:italic; padding:12px; background:#f8fafc; border-radius:6px;">ยังไม่มีประวัติโครงการ Kaizen ที่บันทึกไว้</p>'
      : techImprovements.map((imp, idx) => {
          const totalHrs = imp.workLogs?.reduce((sum, l) => sum + (Number(l.hours) || 0), 0) || 0;
          const statusBg = imp.status === 'เสร็จแล้ว' ? '#dcfce7' : '#fef3c7';
          const statusColor = imp.status === 'เสร็จแล้ว' ? '#166534' : '#92400e';
          const statusBorder = imp.status === 'เสร็จแล้ว' ? '#86efac' : '#fcd34d';

          const workLogsRows = imp.workLogs && imp.workLogs.length > 0 
            ? imp.workLogs.map(wl => `
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:4px 8px; font-size:10px; color:#475569;">${wl.date}</td>
                  <td style="padding:4px 8px; font-size:10px; font-weight:bold; color:#0f172a;">${wl.hours} ชม.</td>
                  <td style="padding:4px 8px; font-size:10px; color:#334155;">${wl.note || '-'}</td>
                </tr>
              `).join('')
            : '';

          const imagesHTML = (imp.photoBefore || imp.photoAfter) ? `
            <div style="display:flex; gap:12px; margin-top:10px; flex-wrap:wrap;">
              ${imp.photoBefore ? `
                <div style="flex:1; min-width:220px; border:1px solid #fcd34d; background:#fffbeb; padding:8px; border-radius:8px; text-align:center;">
                  <p style="margin:0 0 6px 0; font-size:10px; font-weight:bold; color:#92400e;">🔴 ภาพก่อนปรับปรุง (Before)</p>
                  <div style="height:140px; background:#ffffff; border:1px solid #fde68a; border-radius:6px; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                    <img src="${imp.photoBefore}" alt="Before" style="max-height:140px; max-width:100%; object-fit:contain;" />
                  </div>
                </div>
              ` : ''}
              ${imp.photoAfter ? `
                <div style="flex:1; min-width:220px; border:1px solid #86efac; background:#f0fdf4; padding:8px; border-radius:8px; text-align:center;">
                  <p style="margin:0 0 6px 0; font-size:10px; font-weight:bold; color:#166534;">🟢 ภาพหลังปรับปรุง (After)</p>
                  <div style="height:140px; background:#ffffff; border:1px solid #bbf7d0; border-radius:6px; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                    <img src="${imp.photoAfter}" alt="After" style="max-height:140px; max-width:100%; object-fit:contain;" />
                  </div>
                </div>
              ` : ''}
            </div>
          ` : '';

          return `
            <div style="border:1px solid #cbd5e1; border-radius:8px; padding:14px; margin-bottom:14px; background:#ffffff; page-break-inside:avoid; break-inside:avoid;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid #e2e8f0; padding-bottom:8px; margin-bottom:8px;">
                <div>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:13px; font-weight:bold; color:#0f172a;">#${idx + 1} ${imp.title}</span>
                    <span style="font-size:10px; font-weight:bold; background:${statusBg}; color:${statusColor}; border:1px solid ${statusBorder}; padding:2px 8px; border-radius:4px;">
                      ${imp.status}
                    </span>
                  </div>
                  <p style="margin:4px 0 0 0; font-size:11px; color:#475569;">
                    เครื่องจักร: <b style="color:#0f172a;">${getMachineName(imp.machineId)}</b> | วันที่เริ่ม: ${imp.startDate} ${imp.plannedEndDate ? `| เป้าหมาย: ${imp.plannedEndDate}` : ''}
                  </p>
                </div>
                <div style="text-align:right;">
                  <span style="font-size:11px; font-weight:bold; background:#fef3c7; color:#92400e; border:1px solid #fde68a; padding:3px 8px; border-radius:6px;">
                    ⏱️ ${totalHrs} ชม. ทำงาน
                  </span>
                </div>
              </div>

              <div style="font-size:11px; color:#334155; line-height:1.5; background:#f8fafc; border:1px solid #e2e8f0; padding:10px; border-radius:6px;">
                <b style="color:#0f172a;">รายละเอียดและผลลัพธ์:</b> ${imp.description}
              </div>

              ${imagesHTML}

              ${workLogsRows ? `
                <div style="margin-top:10px; border-top:1px dashed #cbd5e1; padding-top:6px;">
                  <p style="margin:0 0 4px 0; font-size:10px; font-weight:bold; color:#475569;">บันทึกการลงเวลาทำงาน:</p>
                  <table style="width:100%; border-collapse:collapse; background:#ffffff;">
                    <tbody>${workLogsRows}</tbody>
                  </table>
                </div>
              ` : ''}
            </div>
          `;
        }).join('');

    // Repair Rows HTML
    const repairRowsHTML = techRepairs.slice(0, 20).map((rep, idx) => {
      const partsText = rep.sparePartsUsed?.map(p => `${p.name} (${p.quantity} ${p.unit})`).join(', ') || '-';
      const whyReason = rep.rootCauseReasons?.filter(Boolean).join(' ➔ ') || rep.rootCauseReason || '-';
      return `
        <tr style="border-bottom:1px solid #e2e8f0; font-size:10px;">
          <td style="padding:6px 8px; text-align:center; color:#64748b;">${idx + 1}</td>
          <td style="padding:6px 8px; font-weight:bold; color:#0f172a; white-space:nowrap;">${rep.date}</td>
          <td style="padding:6px 8px; font-weight:bold; color:#0369a1;">${getMachineName(rep.machineId)}</td>
          <td style="padding:6px 8px; color:#0f172a;">${rep.symptoms}</td>
          <td style="padding:6px 8px; color:#475569;">${whyReason}</td>
          <td style="padding:6px 8px; color:#047857;">${rep.correctiveAction || '-'}</td>
          <td style="padding:6px 8px; text-align:center; font-weight:bold; color:#dc2626;">${rep.duration || 0} น.</td>
          <td style="padding:6px 8px; color:#475569; font-size:9px;">${partsText}</td>
        </tr>
      `;
    }).join('');

    // PM Rows HTML
    const pmRowsHTML = techPMs.slice(0, 15).map((pm, idx) => {
      const m = machines.find(mac => mac.id === pm.machineId);
      const plan = pmPlans.find(p => p.id === pm.pmPlanId);
      return `
        <tr style="border-bottom:1px solid #e2e8f0; font-size:10px;">
          <td style="padding:6px 8px; text-align:center; color:#64748b;">${idx + 1}</td>
          <td style="padding:6px 8px; font-weight:bold; color:#0f172a; white-space:nowrap;">${pm.date}</td>
          <td style="padding:6px 8px; font-weight:bold; color:#0369a1;">${m ? m.name : pm.machineId}</td>
          <td style="padding:6px 8px; color:#0f172a;">${plan?.title || pm.pmPlanId}</td>
          <td style="padding:6px 8px; text-align:center; color:#475569;">${pm.duration || 0} น.</td>
          <td style="padding:6px 8px; text-align:center; font-weight:bold; color:#047857;">${pm.actualDuration || pm.duration || 0} น.</td>
          <td style="padding:6px 8px; text-align:center;">
            <span style="background:#dcfce7; color:#166534; border:1px solid #86efac; padding:1px 6px; border-radius:4px; font-size:9px; font-weight:bold;">
              ${pm.status}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div style="font-family:'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#0f172a; background:#ffffff; line-height:1.4;">
        
        <!-- HEADER -->
        <div style="border-bottom:2px solid #0f172a; padding-bottom:14px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <h1 style="margin:0; font-size:18px; font-weight:900; color:#020617; text-transform:uppercase; letter-spacing:0.5px;">
              THAI FOOD MAINTENANCE ENGINEERING
            </h1>
            <p style="margin:2px 0 0 0; font-size:12px; font-weight:bold; color:#334155;">
              ระบบบริหารงานซ่อมบำรุงและวิศวกรรมโรงงานอาหาร (GMP / HACCP Certified)
            </p>
            <p style="margin:2px 0 0 0; font-size:11px; color:#64748b;">
              เอกสารประวัติผลงานช่างและนวัตกรรมการปรับปรุง (Individual Engineering & Kaizen Portfolio)
            </p>
          </div>
          <div style="text-align:right; font-size:11px; color:#475569;">
            <div style="font-family:monospace; font-weight:bold; background:#f1f5f9; border:1px solid #cbd5e1; padding:3px 8px; border-radius:4px; color:#0f172a; display:inline-block;">
              DOC: ${docId}
            </div>
            <p style="margin:4px 0 0 0; font-size:10px; color:#64748b;">วันที่ออกเอกสาร: ${dateStr}</p>
          </div>
        </div>

        <!-- PROFILE SECTION -->
        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:10px; padding:14px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:48px; height:48px; border-radius:50%; background:#0f172a; color:#38bdf8; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:900; border:2px solid #38bdf8;">
              ${selectedTech.replace('ช่าง', '').trim()}
            </div>
            <div>
              <div style="display:flex; align-items:center; gap:6px;">
                <h2 style="margin:0; font-size:15px; font-weight:900; color:#020617;">${selectedTech}</h2>
                <span style="background:#dcfce7; color:#166534; border:1px solid #86efac; padding:1px 6px; border-radius:4px; font-size:10px; font-weight:bold;">
                  ประจำการ
                </span>
              </div>
              <p style="margin:2px 0 0 0; font-size:11px; font-weight:600; color:#334155;">
                ตำแหน่ง: ${currentEmp?.position || 'ช่างซ่อมบำรุงประจำโรงงาน'}
              </p>
              <p style="margin:1px 0 0 0; font-size:10px; color:#64748b;">
                รหัสพนักงาน: ${currentEmp?.id || '-'} | สังกัด: แผนกวิศวกรรมและซ่อมบำรุง (Food Plant Maintenance)
              </p>
            </div>
          </div>

          <div style="text-align:right; font-size:10px;">
            <span style="background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; padding:3px 8px; border-radius:6px; font-weight:bold; display:inline-block;">
              🛡️ ผ่านเกณฑ์รับรอง GMP โรงงานอาหาร
            </span>
            <p style="margin:4px 0 0 0; color:#475569;">
              ความเชี่ยวชาญ: ${currentEmp?.skills?.join(', ') || 'ระบบเครื่องกล, ซ่อมบำรุงด่วน, ปรับปรุง Kaizen'}
            </p>
          </div>
        </div>

        <!-- KPI SUMMARY -->
        <div style="margin-bottom:18px;">
          <h3 style="margin:0 0 8px 0; font-size:12px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px;">
            📊 สรุปดัชนีชี้วัดผลงานหลัก (Key Performance Indicators)
          </h3>
          <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px;">
            <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:10px; text-align:center;">
              <p style="margin:0; font-size:9px; font-weight:bold; color:#92400e; text-transform:uppercase;">ผลงาน Kaizen รวม</p>
              <p style="margin:4px 0 0 0; font-size:18px; font-weight:900; color:#b45309;">${totalKaizenProjects} โครงการ</p>
              <p style="margin:2px 0 0 0; font-size:9px; color:#92400e;">เสร็จสิ้น ${completedKaizen} โครงการ</p>
            </div>
            <div style="background:#e0f2fe; border:1px solid #bae6fd; border-radius:8px; padding:10px; text-align:center;">
              <p style="margin:0; font-size:9px; font-weight:bold; color:#0369a1; text-transform:uppercase;">ชั่วโมง Kaizen</p>
              <p style="margin:4px 0 0 0; font-size:18px; font-weight:900; color:#0284c7;">${totalKaizenHours} ชม.</p>
              <p style="margin:2px 0 0 0; font-size:9px; color:#0369a1;">ลงแรงปรับปรุงสะสม</p>
            </div>
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:10px; text-align:center;">
              <p style="margin:0; font-size:9px; font-weight:bold; color:#166534; text-transform:uppercase;">งานซ่อมบำรุงที่แก้ได้</p>
              <p style="margin:4px 0 0 0; font-size:18px; font-weight:900; color:#15803d;">${totalRepairsHandled} ครั้ง</p>
              <p style="margin:2px 0 0 0; font-size:9px; color:#166534;">MTTR เฉลี่ย ${avgRepairMttr} นาที</p>
            </div>
            <div style="background:#faf5ff; border:1px solid #e9d5ff; border-radius:8px; padding:10px; text-align:center;">
              <p style="margin:0; font-size:9px; font-weight:bold; color:#6b21a8; text-transform:uppercase;">งาน PM สำเร็จ</p>
              <p style="margin:4px 0 0 0; font-size:18px; font-weight:900; color:#7e22ce;">${totalPMCompleted} ครั้ง</p>
              <p style="margin:2px 0 0 0; font-size:9px; color:#6b21a8;">บำรุงรักษาเชิงป้องกัน</p>
            </div>
          </div>
        </div>

        <!-- SECTION 1: KAIZEN -->
        <div style="margin-bottom:20px;">
          <h3 style="margin:0 0 8px 0; font-size:12px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid #cbd5e1; padding-bottom:4px;">
            💡 1. ประวัติโครงการนวัตกรรมและการปรับปรุง (Kaizen & Improvement Projects)
          </h3>
          ${kaizenHTML}
        </div>

        <!-- SECTION 2: REPAIR LOGS -->
        ${techRepairs.length > 0 ? `
          <div style="margin-bottom:20px; page-break-inside:avoid; break-inside:avoid;">
            <h3 style="margin:0 0 8px 0; font-size:12px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid #cbd5e1; padding-bottom:4px;">
              🔧 2. ประวัติการเข้าแก้ไขงานซ่อมบำรุงด่วน (Breakdown Maintenance Logs)
            </h3>
            <table style="width:100%; border-collapse:collapse; border:1px solid #cbd5e1; background:#ffffff;">
              <thead>
                <tr style="background:#0f172a; color:#ffffff; font-size:10px; text-align:left;">
                  <th style="padding:6px 8px; width:28px; text-align:center;">#</th>
                  <th style="padding:6px 8px; width:70px;">วันที่</th>
                  <th style="padding:6px 8px; width:90px;">เครื่องจักร</th>
                  <th style="padding:6px 8px;">อาการเสีย</th>
                  <th style="padding:6px 8px;">สาเหตุที่แท้จริง (5-Why)</th>
                  <th style="padding:6px 8px;">การแก้ไข</th>
                  <th style="padding:6px 8px; width:55px; text-align:center;">DT</th>
                  <th style="padding:6px 8px; width:90px;">อะไหล่</th>
                </tr>
              </thead>
              <tbody>
                ${repairRowsHTML}
              </tbody>
            </table>
          </div>
        ` : ''}

        <!-- SECTION 3: PM LOGS -->
        ${techPMs.length > 0 ? `
          <div style="margin-bottom:20px; page-break-inside:avoid; break-inside:avoid;">
            <h3 style="margin:0 0 8px 0; font-size:12px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid #cbd5e1; padding-bottom:4px;">
              📋 3. ประวัติการปฏิบัติงานบำรุงรักษาเชิงป้องกัน (Preventive Maintenance Logs)
            </h3>
            <table style="width:100%; border-collapse:collapse; border:1px solid #cbd5e1; background:#ffffff;">
              <thead>
                <tr style="background:#0f172a; color:#ffffff; font-size:10px; text-align:left;">
                  <th style="padding:6px 8px; width:28px; text-align:center;">#</th>
                  <th style="padding:6px 8px; width:70px;">วันที่</th>
                  <th style="padding:6px 8px; width:100px;">เครื่องจักร</th>
                  <th style="padding:6px 8px;">แผนการตรวจเช็ค (PM Plan)</th>
                  <th style="padding:6px 8px; width:60px; text-align:center;">TTM</th>
                  <th style="padding:6px 8px; width:60px; text-align:center;">ใช้จริง</th>
                  <th style="padding:6px 8px; width:70px; text-align:center;">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                ${pmRowsHTML}
              </tbody>
            </table>
          </div>
        ` : ''}

        <!-- SIGNATURE SIGN-OFF -->
        <div style="margin-top:28px; padding-top:16px; border-top:2px solid #0f172a; display:flex; justify-content:space-between; page-break-inside:avoid; break-inside:avoid;">
          <div style="text-align:center; width:220px;">
            <div style="border-bottom:1px solid #0f172a; height:40px; margin-bottom:6px;"></div>
            <p style="margin:0; font-size:11px; font-weight:bold; color:#0f172a;">ลงชื่อ (${selectedTech})</p>
            <p style="margin:2px 0 0 0; font-size:10px; color:#64748b;">ช่างซ่อมบำรุงผู้จัดทำรายงาน</p>
          </div>

          <div style="text-align:center; width:220px;">
            <div style="border-bottom:1px solid #0f172a; height:40px; margin-bottom:6px;"></div>
            <p style="margin:0; font-size:11px; font-weight:bold; color:#0f172a;">ลงชื่อ (....................................................)</p>
            <p style="margin:2px 0 0 0; font-size:10px; color:#64748b;">ผู้จัดการฝ่ายวิศวกรรมและซ่อมบำรุง</p>
          </div>
        </div>

      </div>
    `;
  };

  // Open a clean standalone printable window with self-contained HTML and explicit print controls
  const handleOpenPrintWindow = () => {
    const printWin = window.open('', '_blank', 'width=1000,height=900');
    if (!printWin) {
      // Fallback if popup blocked by browser
      window.print();
      return;
    }

    const cleanTechName = selectedTech.replace(/[^a-zA-Z0-9ก-๙]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    const reportHTML = buildStandalonePortfolioHTML();

    const fullPageHTML = `
      <!DOCTYPE html>
      <html lang="th">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Portfolio_${cleanTechName}_${dateStr}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            * {
              box-sizing: border-box;
              font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            html, body {
              background-color: #f1f5f9;
              color: #0f172a;
              margin: 0;
              padding: 0;
            }

            .print-bar {
              position: sticky;
              top: 0;
              z-index: 9999;
              background: #0f172a;
              color: #ffffff;
              padding: 12px 24px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              box-shadow: 0 4px 12px rgba(0,0,0,0.18);
              border-bottom: 3px solid #0284c7;
            }

            .btn-print {
              background: #e11d48;
              color: #ffffff;
              border: none;
              padding: 10px 24px;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 800;
              cursor: pointer;
              box-shadow: 0 2px 10px rgba(225,29,72,0.4);
            }
            .btn-print:hover {
              background: #be123c;
            }

            .sheet-container {
              max-width: 920px;
              margin: 24px auto;
              background: #ffffff;
              border-radius: 8px;
              padding: 36px 40px;
              box-shadow: 0 4px 24px rgba(0,0,0,0.08);
              border: 1px solid #cbd5e1;
            }

            @media print {
              html, body {
                background: #ffffff !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .no-print, .print-bar {
                display: none !important;
              }
              .sheet-container {
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
                border-radius: 0 !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-bar no-print">
            <div>
              <div style="font-size:15px; font-weight:900; color:#38bdf8;">🖨️ เอกสารประวัติผลงานช่าง (Portfolio) - ${selectedTech}</div>
              <div style="font-size:12px; color:#cbd5e1; margin-top:2px;">
                คลิกปุ่มสีแดงขวามือเพื่อสั่งพิมพ์ หรือเลือกปลายทาง (Destination) เป็น <b>"Save as PDF (บันทึกเป็น PDF)"</b>
              </div>
            </div>
            <button class="btn-print" onclick="window.print()">
              🖨️ สั่งพิมพ์ / บันทึก PDF ตอนนี้
            </button>
          </div>

          <div class="sheet-container">
            ${reportHTML}
          </div>

          <script>
            // Automatically prompt print dialog after page renders
            window.addEventListener('load', function() {
              setTimeout(function() {
                window.print();
              }, 400);
            });
          </script>
        </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(fullPageHTML);
    printWin.document.close();
  };

  // Direct PDF Download using jsPDF and offscreen clean container
  const handleDownloadPDF = async () => {
    let offscreenWrapper: HTMLDivElement | null = null;
    try {
      setIsGeneratingPDF(true);
      setPdfProgressText('กำลังเตรียมข้อมูลเอกสาร...');

      const cleanTechName = selectedTech.replace(/[^a-zA-Z0-9ก-๙]/g, '_');
      const dateStr = new Date().toISOString().split('T')[0];
      const reportHTML = buildStandalonePortfolioHTML();

      setPdfProgressText('กำลังเรนเดอร์โครงสร้างเอกสาร...');

      offscreenWrapper = document.createElement('div');
      offscreenWrapper.style.position = 'fixed';
      offscreenWrapper.style.left = '-9999px';
      offscreenWrapper.style.top = '0';
      offscreenWrapper.style.width = '820px';
      offscreenWrapper.style.padding = '32px';
      offscreenWrapper.style.backgroundColor = '#ffffff';
      offscreenWrapper.style.color = '#0f172a';
      offscreenWrapper.style.zIndex = '-9999';
      offscreenWrapper.innerHTML = reportHTML;
      document.body.appendChild(offscreenWrapper);

      // Pre-process images
      const imgElements = offscreenWrapper.querySelectorAll('img');
      imgElements.forEach(img => {
        img.crossOrigin = 'anonymous';
        img.referrerPolicy = 'no-referrer';
      });

      // Wait a tick for layout & images
      await new Promise(resolve => setTimeout(resolve, 250));

      setPdfProgressText('กำลังแปลงเอกสารเป็นไฟล์ PDF...');

      const canvasPromise = html2canvas(offscreenWrapper, {
        scale: 1.5,
        useCORS: true,
        allowTaint: false,
        imageTimeout: 4000,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 820
      });

      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('HTML2Canvas Timeout')), 10000)
      );

      const canvas = await Promise.race([canvasPromise, timeoutPromise]);

      setPdfProgressText('กำลังจัดทำหน้ากระดาษ A4...');

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // Page 1
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      // Additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }

      pdf.save(`Portfolio_ผลงาน_${cleanTechName}_${dateStr}.pdf`);

      setPdfProgressText('✅ ดาวน์โหลดไฟล์ PDF สำเร็จเรียบร้อยแล้ว!');
      setTimeout(() => setPdfProgressText(''), 3000);
    } catch (error) {
      console.warn('Direct canvas PDF encountered an issue, opening print window:', error);
      setPdfProgressText('กำลังเปิดหน้าต่างพิมพ์ให้เพื่อบันทึกเป็น PDF...');
      handleOpenPrintWindow();
      setTimeout(() => setPdfProgressText(''), 2500);
    } finally {
      if (offscreenWrapper && offscreenWrapper.parentNode) {
        document.body.removeChild(offscreenWrapper);
      }
      setIsGeneratingPDF(false);
    }
  };

  // Trigger Print view
  const handlePrint = () => {
    setShowPDFModal(true);
  };

  return (
    <div className="space-y-6 text-slate-100" id="technician-portfolio-page">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-md font-bold text-[10px] uppercase flex items-center gap-1">
                <Sparkles size={11} />
                <span>Kaizen & Engineering Portfolio</span>
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md font-bold text-[10px] uppercase">
                บอร์ดผลงานช่างซ่อมบำรุง
              </span>
            </div>
            
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              🏆 Portfolio & ผลงานพัฒนานวัตกรรมช่าง (Individual Portfolio)
            </h1>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              รวบรวมประวัติผลงานการปรับปรุงเครื่องจักร (Kaizen), โครงการเพิ่มประสิทธิภาพการผลิต, และสถิติความเชี่ยวชาญการซ่อมบำรุงรายบุคคล 
              เพื่อใช้ประเมินผลงาน สนับสนุนการเติบโต และแสดงศักยภาพทางเทคนิคในโรงงาน
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Direct Download PDF Button */}
            <button
              id="btn-export-portfolio-pdf"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition flex items-center gap-1.5 shadow-lg"
              title="สร้างและดาวน์โหลดไฟล์ PDF (.pdf) ทันที"
            >
              {isGeneratingPDF ? (
                <Loader2 size={15} className="animate-spin text-white" />
              ) : (
                <Download size={15} className="text-white" />
              )}
              <span>{isGeneratingPDF ? 'กำลังสร้าง PDF...' : 'ส่งออกเป็น PDF (.pdf)'}</span>
            </button>

            {/* Preview & Print Modal Button */}
            <button
              id="btn-preview-portfolio-pdf"
              onClick={() => setShowPDFModal(true)}
              className="bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs py-2.5 px-3.5 rounded-xl transition flex items-center gap-1.5 shadow"
              title="ดูตัวอย่างเอกสารก่อนพิมพ์หรือสั่งพิมพ์"
            >
              <FileText size={15} className="text-cyan-400" />
              <span>ดูตัวอย่าง / สั่งพิมพ์</span>
            </button>

            {/* Export Excel Button */}
            <button
              id="btn-export-portfolio-excel"
              onClick={handleExportExcel}
              className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs py-2.5 px-3.5 rounded-xl transition flex items-center gap-1.5 shadow"
              title="ดาวน์โหลดข้อมูล Portfolio ทั้งหมดเป็นไฟล์ Excel (.xlsx)"
            >
              <FileSpreadsheet size={15} className="text-emerald-400" />
              <span>ส่งออก Excel</span>
            </button>

            {/* Add New Kaizen Button */}
            <button
              id="btn-open-add-kaizen"
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs py-2.5 px-4 rounded-xl shadow-lg transition flex items-center gap-1.5"
            >
              <Plus size={16} />
              <span>+ บันทึกผลงาน Kaizen ใหม่</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Technician Selector Tabs & Profile Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
        
        {/* Selector Buttons Grid */}
        <div>
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
            <User size={14} className="text-cyan-400" />
            <span>เลือกช่างซ่อมบำรุงเพื่อดู Portfolio:</span>
          </label>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
            {technicians.map((tech) => {
              const isSelected = selectedTech === tech;
              const empInfo = employees.find(e => e.name === tech);
              const kaizenCount = improvements.filter(imp => imp.technician === tech || imp.technicians?.includes(tech)).length;

              return (
                <button
                  key={tech}
                  id={`tech-select-btn-${tech}`}
                  onClick={() => setSelectedTech(tech)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 border ${
                    isSelected 
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/10' 
                      : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-slate-800'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-extrabold text-[10px] ${
                    isSelected ? 'bg-slate-950 text-cyan-400' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {tech.replace('ช่าง', '').trim()}
                  </div>

                  <div className="text-left">
                    <p className="leading-none">{tech}</p>
                    {empInfo && <p className={`text-[9px] font-normal leading-none mt-0.5 ${isSelected ? 'text-slate-800' : 'text-slate-400'}`}>{empInfo.position}</p>}
                  </div>

                  {kaizenCount > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${
                      isSelected ? 'bg-slate-950 text-cyan-400' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    }`}>
                      {kaizenCount} Kaizen
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Technician Profile Card */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* Tech Info */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg border-2 border-cyan-300/30 shrink-0">
                {selectedTech.replace('ช่าง', '').trim() || 'T'}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white">{selectedTech}</h2>
                  {currentEmp?.id && (
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 font-mono text-[10px] rounded border border-slate-700">
                      ID: {currentEmp.id}
                    </span>
                  )}
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold">
                    วิศวกรซ่อมบำรุงประจำโรงงาน
                  </span>
                </div>

                <p className="text-xs text-slate-400">
                  ตำแหน่ง: <strong className="text-slate-200">{currentEmp?.position || 'ช่างเทคนิคซ่อมบำรุงโรงงาน'}</strong>
                </p>

                <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 text-cyan-400 font-medium">
                    <Award size={13} />
                    <span>เชี่ยวชาญ Kaizen & ปรับปรุงเครื่องจักร</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <Shield size={13} />
                    <span>พร้อมปฏิบัติงานหน้างาน</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl shrink-0">
              <div className="text-center px-3 border-r border-slate-800/80 last:border-0">
                <p className="text-[10px] text-slate-400 font-bold uppercase">ผลงาน Kaizen</p>
                <p className="text-lg font-black text-cyan-400 mt-0.5">{totalKaizenProjects} <span className="text-[10px] text-slate-400 font-normal">งาน</span></p>
                <p className="text-[9px] text-emerald-400 font-medium">เสร็จ {completedKaizen} งาน</p>
              </div>

              <div className="text-center px-3 border-r border-slate-800/80 last:border-0">
                <p className="text-[10px] text-slate-400 font-bold uppercase">ชั่วโมง Kaizen สะสม</p>
                <p className="text-lg font-black text-amber-400 mt-0.5">{totalKaizenHours} <span className="text-[10px] text-slate-400 font-normal">ชม.</span></p>
                <p className="text-[9px] text-slate-400">ประมวลผลงานจริง</p>
              </div>

              <div className="text-center px-3 border-r border-slate-800/80 last:border-0">
                <p className="text-[10px] text-slate-400 font-bold uppercase">ประวัติการซ่อม</p>
                <p className="text-lg font-black text-emerald-400 mt-0.5">{totalRepairsHandled} <span className="text-[10px] text-slate-400 font-normal">ครั้ง</span></p>
                <p className="text-[9px] text-slate-400">เฉลี่ย {avgRepairMttr} นาที/งาน</p>
              </div>

              <div className="text-center px-3">
                <p className="text-[10px] text-slate-400 font-bold uppercase">PM & Setup</p>
                <p className="text-lg font-black text-purple-400 mt-0.5">{totalPMCompleted + totalSetups} <span className="text-[10px] text-slate-400 font-normal">รายการ</span></p>
                <p className="text-[9px] text-slate-400">PM {totalPMCompleted} | Setup {totalSetups}</p>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* 3. Filter & Search Control Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-xl shadow-md">
        
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <button
            id="tab-btn-all"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'all' 
                ? 'bg-cyan-500 text-slate-950 font-bold' 
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <Layers size={14} />
            <span>ผลงานทั้งหมด ({techImprovements.length + techRepairs.length + totalPMCompleted})</span>
          </button>

          <button
            id="tab-btn-kaizen"
            onClick={() => setActiveTab('kaizen')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'kaizen' 
                ? 'bg-amber-500 text-slate-950 font-bold' 
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <PenTool size={14} />
            <span>🔨 โครงการ Kaizen/ปรับปรุง ({techImprovements.length})</span>
          </button>

          <button
            id="tab-btn-repairs"
            onClick={() => setActiveTab('repairs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'repairs' 
                ? 'bg-emerald-500 text-slate-950 font-bold' 
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <Wrench size={14} />
            <span>🔧 งานซ่อมบำรุงเด่น ({techRepairs.length})</span>
          </button>

          <button
            id="tab-btn-pm-setup"
            onClick={() => setActiveTab('pm_setup')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'pm_setup' 
                ? 'bg-purple-500 text-slate-950 font-bold' 
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <ClipboardCheck size={14} />
            <span>⏱ PM & Setup ({totalPMCompleted + totalSetups})</span>
          </button>
        </div>

        {/* Search & Status Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {activeTab === 'kaizen' && (
            <select
              id="kaizen-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">สถานะทั้งหมด</option>
              <option value="เสร็จแล้ว">เสร็จแล้ว</option>
              <option value="กำลังดำเนินการ">กำลังดำเนินการ</option>
              <option value="วางแผน">วางแผน</option>
            </select>
          )}

          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
            <input
              id="input-search-portfolio"
              type="text"
              placeholder="ค้นหาชื่อผลงาน, เครื่องจักร, รายละเอียด..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

      </div>

      {/* 4. MAIN CONTENT AREA */}
      
      {/* SECTION A: KAIZEN / IMPROVEMENT PROJECTS (Featured Section) */}
      {(activeTab === 'all' || activeTab === 'kaizen') && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
                <PenTool size={16} />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                ผลงานพัฒนา Kaizen & วิศวกรรม ({techImprovements.length} รายการ)
              </h3>
            </div>

            {/* Sub-Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setKaizenCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  kaizenCategoryFilter === 'all'
                    ? 'bg-slate-200 text-slate-900 font-extrabold shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>ทั้งหมด ({allTechImprovements.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setKaizenCategoryFilter('KAIZEN')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  kaizenCategoryFilter === 'KAIZEN'
                    ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Wrench size={12} />
                <span>Kaizen ({techKaizenCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setKaizenCategoryFilter('OPL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  kaizenCategoryFilter === 'OPL'
                    ? 'bg-blue-600 text-white font-extrabold shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen size={12} />
                <span>OPL ({techOPLCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setKaizenCategoryFilter('FA')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  kaizenCategoryFilter === 'FA'
                    ? 'bg-rose-600 text-white font-extrabold shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Search size={12} />
                <span>FA ({techFACount})</span>
              </button>
              <button
                type="button"
                onClick={() => setKaizenCategoryFilter('WHY_WHY')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  kaizenCategoryFilter === 'WHY_WHY'
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <HelpCircle size={12} />
                <span>5 Whys ({techWhyWhyCount})</span>
              </button>
            </div>
          </div>

          {techImprovements.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
              <Lightbulb className="mx-auto text-slate-600" size={36} />
              <p className="text-xs text-slate-400 font-bold">ยังไม่มีข้อมูลโครงการ Kaizen สำหรับ {selectedTech}</p>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                กดปุ่ม "+ บันทึกผลงาน Kaizen ใหม่" ด้านบนเพื่อเพิ่มผลงานนวัตกรรมและการปรับปรุงเครื่องจักรสำหรับช่างคนนี้
              </p>
              <button
                id="btn-add-first-kaizen"
                onClick={() => setShowAddModal(true)}
                className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs py-2 px-4 rounded-xl transition inline-flex items-center gap-1.5 mt-2"
              >
                <Plus size={14} />
                <span>เริ่มเพิ่มผลงาน Kaizen แรก</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {techImprovements.map((imp) => {
                const logsTotalHours = imp.workLogs ? imp.workLogs.reduce((sum, w) => sum + w.hours, 0) : 0;
                const cat = imp.category || 'KAIZEN';

                return (
                  <div 
                    key={imp.id} 
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg transition space-y-4 flex flex-col justify-between relative overflow-hidden"
                  >
                    <div className="space-y-3">
                      
                      {/* Top status & Machine Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              cat === 'OPL' 
                                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                : cat === 'FA'
                                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                : cat === 'WHY_WHY'
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                            }`}>
                              {cat === 'OPL' ? '📖 One Point Lesson' : cat === 'FA' ? '🔍 Failure Analysis' : cat === 'WHY_WHY' ? '❓ Why-Why Analysis' : '🔨 Kaizen Project'}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-[10px] font-mono text-cyan-400 inline-block">
                              ⚙️ {getMachineName(imp.machineId)}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-white leading-snug">{imp.title}</h4>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold shrink-0 border ${
                          imp.status === 'เสร็จแล้ว' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                            : imp.status === 'กำลังดำเนินการ'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {imp.status === 'เสร็จแล้ว' ? '✓ ' : ''}{imp.status}
                        </span>
                      </div>

                      {/* Specific Category Highlights */}
                      {cat === 'OPL' && imp.oplData && (
                        <div className="p-2.5 bg-blue-950/30 border border-blue-900/40 rounded-xl space-y-1 text-xs">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-blue-300 font-semibold">อ้างอิง SOP: {imp.oplData.sopDocumentRef || '-'}</span>
                            <span className="text-blue-400 font-mono">ระดับ: {imp.oplData.lessonLevel || 'ระดับพื้นฐาน'}</span>
                          </div>
                          {imp.oplData.trainingTarget && (
                            <p className="text-[11px] text-slate-300">กลุ่มเป้าหมายอบรม: {imp.oplData.trainingTarget}</p>
                          )}
                        </div>
                      )}

                      {cat === 'FA' && imp.faData && (
                        <div className="p-2.5 bg-rose-950/30 border border-rose-900/40 rounded-xl space-y-1 text-xs">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-rose-300 font-semibold">ชิ้นส่วนชำรุด: {imp.faData.failurePartName || '-'}</span>
                            <span className="text-rose-400 font-mono">กลไก: {imp.faData.failureMechanism || '-'}</span>
                          </div>
                          {imp.faData.rootCauseCategory && (
                            <p className="text-[11px] text-slate-300">หมวดสาเหตุ: {imp.faData.rootCauseCategory}</p>
                          )}
                        </div>
                      )}

                      {cat === 'WHY_WHY' && imp.whyWhyData && (
                        <div className="p-2.5 bg-amber-950/30 border border-amber-900/40 rounded-xl space-y-1 text-xs">
                          <p className="text-amber-300 font-semibold text-[11px]">โจทย์ปัญหา: {imp.whyWhyData.problemStatement}</p>
                          <div className="text-[10px] text-slate-300 font-mono space-y-0.5">
                            {imp.whyWhyData.why1 && <p>1. {imp.whyWhyData.why1}</p>}
                            {imp.whyWhyData.why2 && <p>2. {imp.whyWhyData.why2}</p>}
                            {imp.whyWhyData.why3 && <p>3. {imp.whyWhyData.why3}</p>}
                          </div>
                        </div>
                      )}

                      {/* Description */}
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                        {imp.description}
                      </p>

                      {/* Date & Hours Summary */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 bg-slate-900/50 pt-1">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-500" />
                          <span>ระยะเวลา: <strong className="text-slate-200">{imp.startDate}</strong> ถึง <strong className="text-slate-200">{imp.plannedEndDate}</strong></span>
                        </div>

                        <div className="flex items-center gap-1.5 font-mono text-amber-400 font-bold">
                          <Clock size={13} />
                          <span>{logsTotalHours} ชั่วโมงปฏิบัติการ</span>
                        </div>
                      </div>

                      {/* Work Logs Breakdown */}
                      {imp.workLogs && imp.workLogs.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">บันทึกขั้นตอนดำเนินงาน ({imp.workLogs.length} บันทึก):</p>
                          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                            {imp.workLogs.map((wl) => (
                              <div key={wl.id} className="bg-slate-950/80 border border-slate-850 rounded-lg p-2 text-[11px] flex items-start justify-between gap-2">
                                <div className="space-y-0.5">
                                  <span className="text-[10px] text-cyan-400 font-mono block">{wl.date}</span>
                                  <p className="text-slate-300 leading-tight">{wl.note}</p>
                                </div>
                                <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-mono font-bold text-[10px] shrink-0">
                                  {wl.hours} ชม.
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Kaizen Photos (Before & After) */}
                      <div className="pt-2 border-t border-slate-800/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <ImageIcon size={13} className="text-amber-400" />
                            <span>รูปภาพผลงาน Kaizen (Before & After):</span>
                          </p>
                          <span className="text-[10px] text-slate-400">คลิกเพื่อดูรูปขยาย</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          
                          {/* Before Photo Box */}
                          <div className="bg-slate-950/80 border border-slate-850 rounded-xl p-2.5 space-y-2 flex flex-col justify-between">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-bold">
                                🔴 ก่อนปรับปรุง (Before)
                              </span>
                              {imp.photoBefore && (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setLightboxData({
                                      url: imp.photoBefore!,
                                      title: imp.title,
                                      subtitle: `เครื่องจักร: ${getMachineName(imp.machineId)}`,
                                      badge: '🔴 ก่อนปรับปรุง (Before)',
                                      type: 'before',
                                      projId: imp.id
                                    })}
                                    className="text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5 font-bold"
                                  >
                                    <ZoomIn size={11} /> ดูรูปขยาย
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImage(imp.id, 'before', imp.title)}
                                    className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-0.5 font-bold transition"
                                    title="ลบรูปภาพก่อนปรับปรุงออก"
                                  >
                                    <Trash2 size={11} /> ลบรูป
                                  </button>
                                </div>
                              )}
                            </div>

                            {imp.photoBefore ? (
                              <div className="relative h-28 w-full rounded-lg overflow-hidden border border-slate-800 group bg-slate-900 flex items-center justify-center shadow-inner">
                                <img 
                                  src={imp.photoBefore} 
                                  alt="Before Kaizen" 
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300 cursor-pointer" 
                                  onClick={() => setLightboxData({
                                    url: imp.photoBefore!,
                                    title: imp.title,
                                    subtitle: `เครื่องจักร: ${getMachineName(imp.machineId)}`,
                                    badge: '🔴 ก่อนปรับปรุง (Before)',
                                    type: 'before',
                                    projId: imp.id
                                  })}
                                />
                                <div 
                                  onClick={() => setLightboxData({
                                    url: imp.photoBefore!,
                                    title: imp.title,
                                    subtitle: `เครื่องจักร: ${getMachineName(imp.machineId)}`,
                                    badge: '🔴 ก่อนปรับปรุง (Before)',
                                    type: 'before',
                                    projId: imp.id
                                  })}
                                  className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1 cursor-pointer"
                                >
                                  <ZoomIn size={16} /> ขยายรูปภาพ
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveImage(imp.id, 'before', imp.title);
                                  }}
                                  className="absolute top-1.5 right-1.5 p-1 bg-rose-600/90 hover:bg-rose-500 text-white rounded-lg opacity-85 hover:opacity-100 transition shadow z-10"
                                  title="ลบรูปภาพนี้ออก"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ) : (
                              <label className="h-28 w-full rounded-lg border border-dashed border-amber-500/30 hover:border-amber-500/60 bg-amber-950/10 hover:bg-amber-950/20 flex flex-col items-center justify-center p-2 text-center cursor-pointer transition group">
                                <UploadCloud size={22} className="text-amber-400 mb-1 group-hover:scale-110 transition" />
                                <p className="text-[10px] text-amber-300 font-bold">คลิกเพื่ออัปโหลดรูปก่อนปรับปรุง</p>
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  onChange={(e) => handleCardImageUpload(imp.id, 'before', e)} 
                                />
                              </label>
                            )}

                            <div className="flex items-center justify-center gap-3">
                              <label className="cursor-pointer">
                                <span className="text-[10px] text-slate-400 hover:text-cyan-400 underline block font-medium">
                                  {imp.photoBefore ? '📷 เปลี่ยนรูปก่อนปรับปรุง' : '➕ แนบรูปก่อนปรับปรุง'}
                                </span>
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  onChange={(e) => handleCardImageUpload(imp.id, 'before', e)} 
                                />
                              </label>
                              {imp.photoBefore && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(imp.id, 'before', imp.title)}
                                  className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline font-medium flex items-center gap-0.5 transition"
                                >
                                  <Trash2 size={10} /> ลบรูปออก
                                </button>
                              )}
                            </div>
                          </div>

                          {/* After Photo Box */}
                          <div className="bg-slate-950/80 border border-slate-850 rounded-xl p-2.5 space-y-2 flex flex-col justify-between">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-bold">
                                🟢 หลังปรับปรุง (After)
                              </span>
                              {imp.photoAfter && (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setLightboxData({
                                      url: imp.photoAfter!,
                                      title: imp.title,
                                      subtitle: `เครื่องจักร: ${getMachineName(imp.machineId)}`,
                                      badge: '🟢 หลังปรับปรุง (After)',
                                      type: 'after',
                                      projId: imp.id
                                    })}
                                    className="text-[10px] text-emerald-400 hover:underline flex items-center gap-0.5 font-bold"
                                  >
                                    <ZoomIn size={11} /> ดูรูปขยาย
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImage(imp.id, 'after', imp.title)}
                                    className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-0.5 font-bold transition"
                                    title="ลบรูปภาพหลังปรับปรุงออก"
                                  >
                                    <Trash2 size={11} /> ลบรูป
                                  </button>
                                </div>
                              )}
                            </div>

                            {imp.photoAfter ? (
                              <div className="relative h-28 w-full rounded-lg overflow-hidden border border-slate-800 group bg-slate-900 flex items-center justify-center shadow-inner">
                                <img 
                                  src={imp.photoAfter} 
                                  alt="After Kaizen" 
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300 cursor-pointer" 
                                  onClick={() => setLightboxData({
                                    url: imp.photoAfter!,
                                    title: imp.title,
                                    subtitle: `เครื่องจักร: ${getMachineName(imp.machineId)}`,
                                    badge: '🟢 หลังปรับปรุง (After)',
                                    type: 'after',
                                    projId: imp.id
                                  })}
                                />
                                <div 
                                  onClick={() => setLightboxData({
                                    url: imp.photoAfter!,
                                    title: imp.title,
                                    subtitle: `เครื่องจักร: ${getMachineName(imp.machineId)}`,
                                    badge: '🟢 หลังปรับปรุง (After)',
                                    type: 'after',
                                    projId: imp.id
                                  })}
                                  className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1 cursor-pointer"
                                >
                                  <ZoomIn size={16} /> ขยายรูปภาพ
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveImage(imp.id, 'after', imp.title);
                                  }}
                                  className="absolute top-1.5 right-1.5 p-1 bg-rose-600/90 hover:bg-rose-500 text-white rounded-lg opacity-85 hover:opacity-100 transition shadow z-10"
                                  title="ลบรูปภาพนี้ออก"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ) : (
                              <label className="h-28 w-full rounded-lg border border-dashed border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-950/10 hover:bg-emerald-950/20 flex flex-col items-center justify-center p-2 text-center cursor-pointer transition group">
                                <UploadCloud size={22} className="text-emerald-400 mb-1 group-hover:scale-110 transition" />
                                <p className="text-[10px] text-emerald-300 font-bold">คลิกเพื่ออัปโหลดรูปหลังปรับปรุง</p>
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  onChange={(e) => handleCardImageUpload(imp.id, 'after', e)} 
                                />
                              </label>
                            )}

                            <div className="flex items-center justify-center gap-3">
                              <label className="cursor-pointer">
                                <span className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold underline block">
                                  {imp.photoAfter ? '📷 เปลี่ยนรูปหลังปรับปรุง' : '➕ แนบรูปหลังปรับปรุง'}
                                </span>
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  onChange={(e) => handleCardImageUpload(imp.id, 'after', e)} 
                                />
                              </label>
                              {imp.photoAfter && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(imp.id, 'after', imp.title)}
                                  className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline font-medium flex items-center gap-0.5 transition"
                                >
                                  <Trash2 size={10} /> ลบรูปออก
                                </button>
                              )}
                            </div>
                          </div>

                        </div>
                      </div>

                      {/* PDF Documents Attachments */}
                      {imp.pdfAttachments && imp.pdfAttachments.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <FileText size={13} className="text-cyan-400" />
                            <span>เอกสาร PDF แนบ ({imp.pdfAttachments.length} ไฟล์):</span>
                          </p>
                          <div className="space-y-1">
                            {imp.pdfAttachments.map((pdf) => (
                              <div 
                                key={pdf.id}
                                className="flex items-center justify-between p-2 bg-slate-950/80 border border-slate-850 hover:border-cyan-500/40 rounded-xl transition"
                              >
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                  <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg shrink-0">
                                    <FileText size={14} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-200 truncate">{pdf.name}</p>
                                    <p className="text-[10px] text-slate-500 font-mono">
                                      {(pdf.size / 1024).toFixed(1)} KB • {pdf.uploadedAt}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setActivePDF(pdf)}
                                  className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-bold shrink-0 transition inline-flex items-center gap-1"
                                >
                                  <ZoomIn size={12} />
                                  <span>เปิดดู PDF</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Team Collaborators if any */}
                      {imp.technicians && imp.technicians.length > 1 && (
                        <div className="flex items-center gap-1.5 pt-1 text-[10px] text-slate-400">
                          <Users size={12} className="text-cyan-400" />
                          <span>ทีมงานร่วม: {imp.technicians.join(', ')}</span>
                        </div>
                      )}

                    </div>

                    {/* Footer Badge */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <CheckCircle size={12} />
                        <span>ได้รับการอนุมัติและบันทึกในระบบ</span>
                      </span>
                      <span className="font-mono text-slate-600">ID: {imp.id}</span>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION B: REPAIR LOGS & WHY-WHY ANALYSIS */}
      {(activeTab === 'all' || activeTab === 'repairs') && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                <Wrench size={16} />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                🔧 ผลงานแก้ปัญหาเครื่องจักรเสีย & การวิเคราะห์ Why-Why Analysis ({techRepairs.length} รายการ)
              </h3>
            </div>
          </div>

          {techRepairs.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
              <p className="text-xs text-slate-400">ไม่พบประวัติงานซ่อมสำหรับ {selectedTech}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {techRepairs.map((rep) => (
                <div key={rep.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono text-[10px] font-bold">
                        {rep.machineId}
                      </span>
                      <h4 className="text-xs font-bold text-white">{rep.symptoms}</h4>
                    </div>

                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-slate-400 font-mono">วันที่: {rep.date}</span>
                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 font-mono font-bold rounded border border-amber-500/20">
                        MTTR: {rep.duration} นาที
                      </span>
                    </div>
                  </div>

                  {/* Why-Why & Corrective Action */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-850 space-y-1">
                      <p className="text-[10px] font-bold text-amber-400 uppercase">วิเคราะห์สาเหตุเชิงลึก (Why-Why):</p>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        {rep.why5 || rep.why1 || "วิเคราะห์แก้ไขปัญหาเฉพาะหน้าหน้างานสำเร็จ"}
                      </p>
                    </div>

                    <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-850 space-y-1">
                      <p className="text-[10px] font-bold text-emerald-400 uppercase">มาตรการแก้ไขและป้องกันเกิดซ้ำ:</p>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        {rep.correctiveAction}
                      </p>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION C: PM & SETUP CONTRIBUTIONS */}
      {(activeTab === 'all' || activeTab === 'pm_setup') && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20">
                <ClipboardCheck size={16} />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                ⏱ ผลงานปฏิบัติการ PM & การปรับตั้งเครื่อง Setup ({techPMs.length + techSetups.length} รายการ)
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* PM Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <ClipboardCheck size={14} />
                <span>งานบำรุงรักษาเชิงป้องกัน (PM Completed): {techPMs.length} งาน</span>
              </h4>

              {techPMs.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">ยังไม่มีประวัติงาน PM ที่เสร็จสิ้น</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {techPMs.map(pm => (
                    <div key={pm.id} className="bg-slate-950/80 border border-slate-850 rounded-lg p-2.5 text-xs flex items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-white text-[11px]">{pm.machineId}</p>
                        <p className="text-[10px] text-slate-400">วันที่: {pm.date}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded font-mono font-bold text-[10px]">
                        {pm.duration} นาที
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Setup Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={14} />
                <span>งานปรับตั้งเครื่องก่อนและระหว่างวัน (Setup Logs): {techSetups.length} งาน</span>
              </h4>

              {techSetups.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">ยังไม่มีประวัติงาน Setup สำหรับช่างคนนี้</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {techSetups.map(st => (
                    <div key={st.id} className="bg-slate-950/80 border border-slate-850 rounded-lg p-2.5 text-xs flex items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-white text-[11px]">{st.machineId} ({st.type})</p>
                        <p className="text-[10px] text-slate-400">วันที่: {st.date}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded font-mono font-bold text-[10px]">
                        {st.totalDuration} นาที
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 5. ADD KAIZEN PROJECT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                  <PenTool size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">บันทึกผลงาน Kaizen & การปรับปรุงใหม่</h3>
                  <p className="text-[10px] text-slate-400">ผู้รับผิดชอบหลัก: <strong className="text-cyan-400">{selectedTech}</strong></p>
                </div>
              </div>

              <button
                id="btn-close-kaizen-modal"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateKaizen} className="space-y-4 text-xs">
              
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  ชื่อโครงการ Kaizen / การปรับปรุง <span className="text-rose-400">*</span>
                </label>
                <input
                  id="input-kaizen-title"
                  type="text"
                  required
                  placeholder="เช่น ออกแบบชุดการ์ดป้องกันเศษแป้งตกใส่ชุดเกียร์"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">เครื่องจักรที่เกี่ยวข้อง</label>
                  <select
                    id="select-kaizen-machine"
                    value={newMachineId}
                    onChange={(e) => setNewMachineId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">อุปกรณ์/ทั่วไปในโรงงาน</option>
                    {machines.map(m => (
                      <option key={m.id} value={m.id}>{m.id} - {m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">สถานะโครงการ</label>
                  <select
                    id="select-kaizen-status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="กำลังดำเนินการ">กำลังดำเนินการ</option>
                    <option value="เสร็จแล้ว">เสร็จแล้ว</option>
                    <option value="วางแผน">วางแผน</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  รายละเอียดการปรับปรุง & วัตถุประสงค์ผลลัพธ์ <span className="text-rose-400">*</span>
                </label>
                <textarea
                  id="textarea-kaizen-desc"
                  required
                  rows={3}
                  placeholder="อธิบายสิ่งที่ได้ทำการปรับปรุง ประโยชน์ที่ได้รับ และการลดอัตราสูญเสียหรือเวลาทำงาน..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">วันที่เริ่ม</label>
                  <input
                    id="input-kaizen-start-date"
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">วันที่คาดเสร็จ/เสร็จจริง</label>
                  <input
                    id="input-kaizen-end-date"
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-850 space-y-2">
                <p className="text-[10px] font-bold text-amber-400 uppercase">บันทึกชั่วโมงการทำงานแรก (Initial Work Log):</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <input
                      id="input-kaizen-log-hours"
                      type="number"
                      min="1"
                      placeholder="ชั่วโมง"
                      value={newWorkHours}
                      onChange={(e) => setNewWorkHours(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      id="input-kaizen-log-note"
                      type="text"
                      placeholder="เช่น ขึ้นรูปชิ้นงานและทดลองติดตั้งหน้างาน"
                      value={newWorkNote}
                      onChange={(e) => setNewWorkNote(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Photo Upload Section inside Modal */}
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-850 space-y-3">
                <p className="text-[10px] font-bold text-cyan-400 uppercase flex items-center gap-1">
                  <ImageIcon size={14} />
                  <span>แนบรูปภาพผลงาน Kaizen (Before & After):</span>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Photo Before Input */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-amber-400">🔴 รูปภาพก่อนปรับปรุง (Before Photo)</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      id="input-kaizen-before-photo"
                      onChange={handlePhotoBeforeUpload}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-[11px] text-slate-300 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-amber-500/20 file:text-amber-300"
                    />
                    {newPhotoBefore && (
                      <div className="relative h-24 w-full rounded-lg overflow-hidden border border-amber-500/40 bg-slate-900 mt-1">
                        <img src={newPhotoBefore} alt="Before preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setNewPhotoBefore('')}
                          className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 text-[10px] font-bold shadow"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Photo After Input */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-emerald-400">🟢 รูปภาพหลังปรับปรุง (After Photo)</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      id="input-kaizen-after-photo"
                      onChange={handlePhotoAfterUpload}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-[11px] text-slate-300 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-emerald-500/20 file:text-emerald-300"
                    />
                    {newPhotoAfter && (
                      <div className="relative h-24 w-full rounded-lg overflow-hidden border border-emerald-500/40 bg-slate-900 mt-1">
                        <img src={newPhotoAfter} alt="After preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setNewPhotoAfter('')}
                          className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 text-[10px] font-bold shadow"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  id="btn-cancel-kaizen-modal"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  id="btn-submit-kaizen-modal"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-extrabold transition shadow-lg"
                >
                  บันทึกผลงาน Kaizen
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* PDF REPORT PREVIEW & PRINT MODAL */}
      {showPDFModal && (
        <div 
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200 overflow-y-auto"
          onClick={() => setShowPDFModal(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col my-4 max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header toolbar for print dialog */}
            <div id="portfolio-pdf-modal-header" className="p-4 border-b border-slate-800 flex flex-wrap justify-between items-center bg-slate-950/95 print:hidden gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/30">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span>เอกสาร Portfolio ช่างซ่อมบำรุง (Engineering Portfolio PDF)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      {selectedTech}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {pdfProgressText ? (
                      <span className="text-amber-400 font-semibold animate-pulse">⚡ {pdfProgressText}</span>
                    ) : (
                      'คลิก "ดาวน์โหลดไฟล์ PDF" เพื่อบันทึกเป็นไฟล์ .pdf ลงเครื่องทันที หรือเลือกพิมพ์ผ่านเบราว์เซอร์'
                    )}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* 1. Direct Download PDF (.pdf) */}
                <button
                  id="modal-btn-download-pdf"
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF}
                  className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg transition"
                  title="สร้างและดาวน์โหลดไฟล์ PDF (.pdf) ทันที"
                >
                  {isGeneratingPDF ? (
                    <Loader2 size={15} className="animate-spin text-white" />
                  ) : (
                    <Download size={15} className="text-white" />
                  )}
                  <span>{isGeneratingPDF ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลดไฟล์ PDF (.pdf)'}</span>
                </button>

                {/* 2. Print / Save as PDF via Standalone Window */}
                <button
                  id="modal-btn-print-pdf"
                  onClick={handleOpenPrintWindow}
                  className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
                  title="เปิดเอกสารในหน้าต่างใหม่เพื่อสั่งพิมพ์หรือเลือก Save as PDF ได้ 100%"
                >
                  <Printer size={15} className="text-cyan-300" /> 
                  <span>เปิดหน้าพิมพ์ / บันทึก PDF (แท็บใหม่)</span>
                </button>

                {/* 3. Export Excel */}
                <button
                  id="modal-btn-export-excel"
                  onClick={handleExportExcel}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
                  title="ดาวน์โหลดเป็นไฟล์ Excel (.xlsx)"
                >
                  <FileSpreadsheet size={15} /> 
                  <span>ส่งออก Excel</span>
                </button>

                {/* 4. Close Modal */}
                <button
                  id="modal-btn-close-pdf"
                  onClick={() => setShowPDFModal(false)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                  title="ปิดหน้าต่าง"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Document Area */}
            <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-white text-slate-900 print:p-0 print:bg-white print:text-black scrollbar-thin" id="portfolio-printable-document">
              
              {/* Document Header */}
              <div className="border-b-2 border-slate-900 pb-4 mb-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-900 text-cyan-400 rounded-xl flex items-center justify-center font-bold text-xl shrink-0 shadow">
                      <Wrench size={26} />
                    </div>
                    <div>
                      <h1 className="text-lg sm:text-xl font-black text-slate-950 uppercase tracking-wide">
                        THAI FOOD MAINTENANCE ENGINEERING
                      </h1>
                      <p className="text-xs font-semibold text-slate-600">
                        ระบบบริหารงานซ่อมบำรุงและวิศวกรรมโรงงานอาหาร (GMP / HACCP Certified)
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        เอกสารประวัติผลงานช่างและนวัตกรรมการปรับปรุง (Individual Engineering & Kaizen Portfolio)
                      </p>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-slate-600 space-y-1">
                    <div className="font-mono font-bold bg-slate-100 border border-slate-300 px-2 py-1 rounded text-slate-800 inline-block">
                      DOC: TFM-PORT-{selectedTech.replace(/\s+/g, '')}-{new Date().getFullYear()}
                    </div>
                    <p className="text-slate-500">
                      วันที่ออกเอกสาร: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 1: Technician Profile */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-full bg-slate-900 text-cyan-400 border-2 border-cyan-500 flex items-center justify-center font-black text-lg shadow">
                      {selectedTech.replace('ช่าง', '').trim()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-black text-slate-950">{selectedTech}</h2>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[10px] font-bold">
                          ประจำการ
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700">
                        ตำแหน่ง: {currentEmp?.position || 'ช่างซ่อมบำรุงประจำโรงงาน'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        รหัสพนักงาน: {currentEmp?.id || '-'} | สังกัด: แผนกวิศวกรรมและซ่อมบำรุง (Food Plant Maintenance)
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right text-[11px] space-y-1">
                    <span className="inline-block px-2.5 py-1 bg-cyan-50 text-cyan-800 border border-cyan-200 rounded-lg font-bold">
                      🛡️ ผ่านเกณฑ์รับรอง GMP โรงงานอาหาร
                    </span>
                    <p className="text-slate-600">
                      ความเชี่ยวชาญ: {currentEmp?.skills?.join(', ') || 'ระบบเครื่องกล, ซ่อมบำรุงด่วน, ปรับปรุง Kaizen'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2: KPI Metrics Summary */}
              <div className="mb-6">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2.5 flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-cyan-600" />
                  <span>สรุปดัชนีชี้วัดผลงานหลัก (Key Performance Indicators)</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">ผลงาน Kaizen รวม</p>
                    <p className="text-xl font-black text-amber-600 mt-1">{totalKaizenProjects} โครงการ</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">สำเร็จแล้ว {completedKaizen} โครงการ</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">ชั่วโมงพัฒนา Kaizen</p>
                    <p className="text-xl font-black text-cyan-700 mt-1">{totalKaizenHours} ชม.</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">ลงแรงปรับปรุงสะสม</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">งานซ่อมแซมที่ปิดได้</p>
                    <p className="text-xl font-black text-slate-900 mt-1">{totalRepairsHandled} งาน</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">MTTR เฉลี่ย {avgRepairMttr} นาที</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">งาน PM & Setup</p>
                    <p className="text-xl font-black text-emerald-700 mt-1">{totalPMCompleted + totalSetups} งาน</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">PM {totalPMCompleted} / Setup {totalSetups}</p>
                  </div>
                </div>
              </div>

              {/* Section 3: Kaizen Projects Showcase */}
              <div className="mb-6 print:break-inside-avoid">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Lightbulb size={14} className="text-amber-500" />
                    <span>รายการผลงานนวัตกรรมและการปรับปรุง Kaizen (Kaizen Showcase)</span>
                  </h3>
                  <span className="text-[10px] font-bold text-slate-500">
                    จำนวน {techImprovements.length} รายการ
                  </span>
                </div>

                {techImprovements.length === 0 ? (
                  <div className="border border-dashed border-slate-300 rounded-xl p-6 text-center text-slate-500 text-xs">
                    ยังไม่มีรายการบันทึกผลงาน Kaizen สำหรับช่างคนนี้
                  </div>
                ) : (
                  <div className="space-y-4">
                    {techImprovements.map((imp, idx) => {
                      const totalHrs = imp.workLogs ? imp.workLogs.reduce((sum, w) => sum + w.hours, 0) : 0;

                      return (
                        <div 
                          key={imp.id}
                          className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 print:bg-white print:border-slate-300 print:break-inside-avoid space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900">
                                  #{idx + 1} {imp.title}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold ${
                                  imp.status === 'เสร็จแล้ว'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}>
                                  {imp.status}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 mt-0.5">
                                เครื่องจักร/จุดปรับปรุง: <span className="font-semibold text-slate-800">{getMachineName(imp.machineId)}</span> | เริ่ม: {imp.startDate} {imp.plannedEndDate ? `| เป้าหมาย/เสร็จ: ${imp.plannedEndDate}` : ''}
                              </p>
                            </div>

                            <div className="text-right">
                              <span className="px-2 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[10px] font-bold">
                                ⏱️ {totalHrs} ชั่วโมงทำงาน
                              </span>
                            </div>
                          </div>

                          <div className="text-xs text-slate-700 space-y-1">
                            <p className="font-bold text-slate-900 text-[11px]">รายละเอียดการปรับปรุงและผลลัพธ์:</p>
                            <p className="leading-relaxed bg-white border border-slate-200 p-2.5 rounded-lg text-slate-800 text-[11px]">
                              {imp.description}
                            </p>
                          </div>

                          {/* Before & After Images in Print View */}
                          {(imp.photoBefore || imp.photoAfter) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              {imp.photoBefore && (
                                <div className="border border-amber-200 bg-amber-50/50 p-2 rounded-lg text-center">
                                  <p className="text-[10px] font-bold text-amber-800 mb-1">🔴 ภาพก่อนปรับปรุง (Before)</p>
                                  <div className="h-36 w-full rounded overflow-hidden bg-white border border-amber-200 flex items-center justify-center">
                                    <img 
                                      src={imp.photoBefore} 
                                      alt="Before Kaizen" 
                                      className="max-h-36 w-full object-contain"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                </div>
                              )}

                              {imp.photoAfter && (
                                <div className="border border-emerald-200 bg-emerald-50/50 p-2 rounded-lg text-center">
                                  <p className="text-[10px] font-bold text-emerald-800 mb-1">🟢 ภาพหลังปรับปรุง (After)</p>
                                  <div className="h-36 w-full rounded overflow-hidden bg-white border border-emerald-200 flex items-center justify-center">
                                    <img 
                                      src={imp.photoAfter} 
                                      alt="After Kaizen" 
                                      className="max-h-36 w-full object-contain"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Work logs table snippet */}
                          {imp.workLogs && imp.workLogs.length > 0 && (
                            <div className="text-[10px] border-t border-slate-200 pt-2 text-slate-600">
                              <p className="font-bold text-slate-700 mb-1">บันทึกขั้นตอนการปฏิบัติงาน:</p>
                              <div className="space-y-0.5">
                                {imp.workLogs.map((log) => (
                                  <div key={log.id} className="flex items-center justify-between bg-white px-2 py-1 rounded border border-slate-200">
                                    <span>📅 {log.date}: {log.note}</span>
                                    <span className="font-bold font-mono text-slate-700">{log.hours} ชม.</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section 4: Recent Repair Highlights */}
              <div className="mb-6 print:break-inside-avoid">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2.5 flex items-center gap-1.5">
                  <Wrench size={14} className="text-cyan-600" />
                  <span>ผลงานการแก้ไขงานซ่อมแซมและบำรุงรักษาเด่น (Maintenance & Repair Records)</span>
                </h3>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2">วันที่</th>
                        <th className="p-2">เครื่องจักร</th>
                        <th className="p-2">อาการเสีย / ปัญหา</th>
                        <th className="p-2">มาตรการแก้ไข</th>
                        <th className="p-2 text-right">เวลาซ่อม (MTTR)</th>
                        <th className="p-2 text-center">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {techRepairs.slice(0, 5).map((rep) => (
                        <tr key={rep.id} className="hover:bg-slate-50">
                          <td className="p-2 font-mono text-slate-600">{rep.date}</td>
                          <td className="p-2 font-semibold text-slate-900">{getMachineName(rep.machineId)}</td>
                          <td className="p-2 text-slate-800 max-w-[180px] truncate">{rep.symptoms}</td>
                          <td className="p-2 text-slate-600 max-w-[200px] truncate">{rep.correctiveAction || '-'}</td>
                          <td className="p-2 text-right font-mono font-bold text-cyan-700">{rep.duration} นาที</td>
                          <td className="p-2 text-center">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                              {rep.status || 'ปิดงาน'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {techRepairs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-3 text-center text-slate-500">
                            ไม่มีประวัติงานซ่อมบันทึก
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 5: PM & Setup Tasks Summary */}
              <div className="mb-8 print:break-inside-avoid">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2.5 flex items-center gap-1.5">
                  <ClipboardCheck size={14} className="text-emerald-600" />
                  <span>ประวัติงานบำรุงรักษาเชิงป้องกัน (PM) และงาน Setup เครื่อง</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                    <p className="font-bold text-slate-800 mb-2">📋 งาน PM ที่ทำสำเร็จล่าสุด ({techPMs.length} รายการ):</p>
                    <div className="space-y-1.5 text-[11px]">
                      {techPMs.slice(0, 4).map((pm) => (
                        <div key={pm.id} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200">
                          <span>{pm.date} - {getMachineName(pm.machineId)}</span>
                          <span className="font-bold text-emerald-700 font-mono">สำเร็จ</span>
                        </div>
                      ))}
                      {techPMs.length === 0 && <p className="text-slate-500 text-[10px]">ไม่มีข้อมูล PM ที่บันทึก</p>}
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                    <p className="font-bold text-slate-800 mb-2">⏱️ งาน Setup / ปรับตั้งเครื่องจักรล่าสุด ({techSetups.length} รายการ):</p>
                    <div className="space-y-1.5 text-[11px]">
                      {techSetups.slice(0, 4).map((set) => (
                        <div key={set.id} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200">
                          <span>{set.date} - {getMachineName(set.machineId)} ({set.type})</span>
                          <span className="font-bold text-cyan-700 font-mono">{set.totalDuration} นาที</span>
                        </div>
                      ))}
                      {techSetups.length === 0 && <p className="text-slate-500 text-[10px]">ไม่มีข้อมูล Setup ที่บันทึก</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 6: Official Verification & Sign-off */}
              <div className="border-t-2 border-slate-900 pt-6 mt-8 print:break-inside-avoid">
                <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-8 text-center">
                  การรับรองและอนุมัติเอกสารประวัติผลงานช่าง (Verification & Approval Signatures)
                </p>

                <div className="grid grid-cols-3 gap-6 text-center text-xs">
                  <div className="space-y-6">
                    <div className="border-b border-slate-400 mx-auto w-3/4 pb-4"></div>
                    <div>
                      <p className="font-bold text-slate-900">({selectedTech})</p>
                      <p className="text-[10px] text-slate-600">ผู้จัดทำ / ช่างซ่อมบำรุงผู้รับผิดชอบ</p>
                      <p className="text-[10px] text-slate-500 mt-1">วันที่: ____/____/________</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="border-b border-slate-400 mx-auto w-3/4 pb-4"></div>
                    <div>
                      <p className="font-bold text-slate-900">(__________________________)</p>
                      <p className="text-[10px] text-slate-600">หัวหน้าแผนกซ่อมบำรุง (Maintenance Supervisor)</p>
                      <p className="text-[10px] text-slate-500 mt-1">วันที่: ____/____/________</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="border-b border-slate-400 mx-auto w-3/4 pb-4"></div>
                    <div>
                      <p className="font-bold text-slate-900">(__________________________)</p>
                      <p className="text-[10px] text-slate-600">ผู้จัดการฝ่ายวิศวกรรมโรงงาน (Plant Engineering Manager)</p>
                      <p className="text-[10px] text-slate-500 mt-1">วันที่: ____/____/________</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center text-[9px] text-slate-500">
                  <span>* เอกสารรับรองผลงานตามมาตรฐานความปลอดภัยทางอาหาร GMP / HACCP Food Processing Plant</span>
                  <span>หน้า 1 จาก 1</span>
                </div>
              </div>

              {/* Print CSS Styles */}
              <style>{`
                @media print {
                  body * {
                    visibility: hidden !important;
                  }
                  #portfolio-printable-document, #portfolio-printable-document * {
                    visibility: visible !important;
                  }
                  #portfolio-printable-document {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 20px !important;
                    background: white !important;
                    color: black !important;
                    box-shadow: none !important;
                    border: none !important;
                  }
                  .print\\:hidden {
                    display: none !important;
                  }
                  .print\\:break-inside-avoid {
                    break-inside: avoid !important;
                    page-break-inside: avoid !important;
                  }
                }
              `}</style>

            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX / FULLSCREEN IMAGE PREVIEW MODAL */}
      {lightboxData && (
        <div 
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => setLightboxData(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-5 shadow-2xl space-y-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="space-y-0.5">
                <span className={`px-2.5 py-0.5 rounded-md font-bold text-[11px] inline-block ${
                  lightboxData.type === 'after'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {lightboxData.badge}
                </span>
                <h3 className="text-base font-black text-white">{lightboxData.title}</h3>
                <p className="text-xs text-slate-400">{lightboxData.subtitle}</p>
              </div>

              <button
                onClick={() => setLightboxData(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 max-h-[65vh] flex items-center justify-center p-2">
              <img 
                src={lightboxData.url} 
                alt="Kaizen Enlarged" 
                className="max-h-[60vh] w-auto object-contain rounded-lg"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs border-t border-slate-800">
              <span className="text-slate-400 text-[11px]">คลิกพื้นที่นอกกล่องเพื่อปิด</span>
              <div className="flex items-center gap-2">
                {lightboxData.projId && (
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(lightboxData.projId!, lightboxData.type, lightboxData.title)}
                    className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 rounded-lg font-bold transition inline-flex items-center gap-1.5"
                    title="ลบรูปภาพนี้ออกจากโครงการ Kaizen"
                  >
                    <Trash2 size={13} />
                    <span>ลบรูปภาพนี้</span>
                  </button>
                )}
                <a 
                  href={lightboxData.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition inline-flex items-center gap-1.5"
                >
                  <ExternalLink size={14} />
                  <span>เปิดรูปภาพเต็มในแท็บใหม่</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deleting Kaizen Photo */}
      {deleteConfirmModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDeleteConfirmModal(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-750 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">ยืนยันการลบรูปภาพ Kaizen</h3>
                <p className="text-xs text-rose-400 font-medium">
                  {deleteConfirmModal.type === 'before' ? '🔴 รูปภาพก่อนปรับปรุง (Before)' : '🟢 รูปภาพหลังปรับปรุง (After)'}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              คุณแน่ใจหรือไม่ว่าต้องการลบรูปภาพนี้ออกจากโครงการ <br />
              <b className="text-white font-semibold">"{deleteConfirmModal.projTitle}"</b>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>ยืนยันลบรูปภาพ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {activePDF && (
        <PDFViewerModal 
          pdf={activePDF}
          onClose={() => setActivePDF(null)}
        />
      )}

    </div>
  );
};
