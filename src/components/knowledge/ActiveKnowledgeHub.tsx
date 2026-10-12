import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { KnowledgeItem, KnowledgeType } from '../../types/knowledge';
import { 
  BookOpen, FileText, Wrench, Sparkles, Search, Filter, 
  Plus, Eye, Download, CheckCircle2, AlertTriangle, ShieldCheck, 
  Zap, Layers, ChevronRight, X, ExternalLink, Calendar, 
  User, Tag, Clock, HelpCircle, Flame, ArrowUpRight, Copy, Check,
  BookMarked, HelpCircle as QuestionIcon, ShieldAlert, FileSpreadsheet,
  Edit2, Trash2, UploadCloud, Paperclip, TrendingDown
} from 'lucide-react';
import { PDFViewerModal } from '../kaizen/PDFViewerModal';
import { WhyWhyAnalysisView } from '../kaizen/WhyWhyAnalysisView';
import { CreateEditKaizenModal } from '../kaizen/CreateEditKaizenModal';
import { KaizenDetailModal } from '../kaizen/KaizenDetailModal';
import { PhotoLightboxModal } from '../kaizen/PhotoLightboxModal';
import { ImprovementProject, PDFFileAttachment, RepairAttachmentItem } from '../../types';

export interface ActiveKnowledgeHubProps {
  initialFilterType?: KnowledgeType | 'ALL';
  onNavigateToKaizenTab?: (tab: 'kaizen' | 'opl' | 'fa' | 'why_why' | 'mp_info' | 'costdown') => void;
}

export const ActiveKnowledgeHub: React.FC<ActiveKnowledgeHubProps> = ({ initialFilterType, onNavigateToKaizenTab }) => {
  const { 
    knowledgeItems, 
    addKnowledgeItem, 
    deleteKnowledgeItem, 
    updateKnowledgeItem,
    machines, 
    technicians,
    currentUser, 
    canEdit, 
    canDelete,
    improvements,
    setImprovements,
    repairs,
    setRepairs,
    cd5Projects,
    setActivePage
  } = useApp();

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTypeTab, setActiveTypeTab] = useState<'ALL' | KnowledgeType>(initialFilterType || 'ALL');

  // Kaizen Why-Why System Integration States
  const [isKaizenCreateModalOpen, setIsKaizenCreateModalOpen] = useState(false);
  const [editingKaizenProject, setEditingKaizenProject] = useState<ImprovementProject | null>(null);
  const [selectedKaizenProject, setSelectedKaizenProject] = useState<ImprovementProject | null>(null);
  const [activePhoto, setActivePhoto] = useState<{
    url: string;
    title?: string;
    subtitle?: string;
    badge?: string;
  } | null>(null);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('ALL');
  const [selectedSubsystem, setSelectedSubsystem] = useState<string>('ALL');

  // Modals
  const [selectedItemForView, setSelectedItemForView] = useState<KnowledgeItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [viewPdfModal, setViewPdfModal] = useState<{ name: string; content: string; fileType?: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Item Form State
  const [newType, setNewType] = useState<KnowledgeType>('TROUBLESHOOTING');
  const [newTitle, setNewTitle] = useState<string>('');
  const [newMachineId, setNewMachineId] = useState<string>('');
  const [newTags, setNewTags] = useState<string>('');
  
  // Specific form states
  // Manual
  const [manualDocCode, setManualDocCode] = useState<string>('');
  const [manualCategory, setManualCategory] = useState<any>('Maintenance Manual');
  const [manualSummary, setManualSummary] = useState<string>('');
  const [manualFileName, setManualFileName] = useState<string>('Document.pdf');
  const [manualFileSize, setManualFileSize] = useState<string>('PDF Format');
  const [manualFileContent, setManualFileContent] = useState<string>('sample_pdf');

  // Edit Knowledge State
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editMachineId, setEditMachineId] = useState<string>('');
  const [editTags, setEditTags] = useState<string>('');

  // Edit Manual fields
  const [editManualDocCode, setEditManualDocCode] = useState<string>('');
  const [editManualCategory, setEditManualCategory] = useState<any>('Maintenance Manual');
  const [editManualSummary, setEditManualSummary] = useState<string>('');
  const [editManualFileName, setEditManualFileName] = useState<string>('');
  const [editManualFileSize, setEditManualFileSize] = useState<string>('');
  const [editManualFileContent, setEditManualFileContent] = useState<string>('');

  // Edit WI fields
  const [editWiDocCode, setEditWiDocCode] = useState<string>('');
  const [editWiTools, setEditWiTools] = useState<string>('');
  const [editWiSafetyAlerts, setEditWiSafetyAlerts] = useState<string>('');
  const [editWiStep1Title, setEditWiStep1Title] = useState<string>('');
  const [editWiStep1Desc, setEditWiStep1Desc] = useState<string>('');
  const [editWiStep2Title, setEditWiStep2Title] = useState<string>('');
  const [editWiStep2Desc, setEditWiStep2Desc] = useState<string>('');

  // Edit TB fields
  const [editTbSymptom, setEditTbSymptom] = useState<string>('');
  const [editTbSubsystem, setEditTbSubsystem] = useState<any>('เครื่องกล (Mechanical)');
  const [editTbUrgency, setEditTbUrgency] = useState<any>('เร่งด่วน (Urgent)');
  const [editTbCause1, setEditTbCause1] = useState<string>('');
  const [editTbSolution1, setEditTbSolution1] = useState<string>('');
  const [editTbPartNeeded1, setEditTbPartNeeded1] = useState<string>('');

  // Edit Why-Why fields
  const [editWhyProblem, setEditWhyProblem] = useState<string>('');
  const [editWhy1, setEditWhy1] = useState<string>('');
  const [editWhy2, setEditWhy2] = useState<string>('');
  const [editWhy3, setEditWhy3] = useState<string>('');
  const [editWhy5, setEditWhy5] = useState<string>('');
  const [editWhyCountermeasure, setEditWhyCountermeasure] = useState<string>('');

  // Delete Confirmation State
  const [itemToDelete, setItemToDelete] = useState<KnowledgeItem | null>(null);

  // WI
  const [wiDocCode, setWiDocCode] = useState<string>('');
  const [wiTools, setWiTools] = useState<string>('');
  const [wiSafetyAlerts, setWiSafetyAlerts] = useState<string>('');
  const [wiStep1Title, setWiStep1Title] = useState<string>('');
  const [wiStep1Desc, setWiStep1Desc] = useState<string>('');
  const [wiStep2Title, setWiStep2Title] = useState<string>('');
  const [wiStep2Desc, setWiStep2Desc] = useState<string>('');

  // Troubleshooting
  const [tbSymptom, setTbSymptom] = useState<string>('');
  const [tbSubsystem, setTbSubsystem] = useState<any>('เครื่องกล (Mechanical)');
  const [tbUrgency, setTbUrgency] = useState<any>('เร่งด่วน (Urgent)');
  const [tbCause1, setTbCause1] = useState<string>('');
  const [tbSolution1, setTbSolution1] = useState<string>('');
  const [tbPartNeeded1, setTbPartNeeded1] = useState<string>('');

  // Why-Why
  const [whyProblem, setWhyProblem] = useState<string>('');
  const [why1, setWhy1] = useState<string>('');
  const [why2, setWhy2] = useState<string>('');
  const [why3, setWhy3] = useState<string>('');
  const [why5, setWhy5] = useState<string>('');
  const [whyCountermeasure, setWhyCountermeasure] = useState<string>('');

  // Aggregate Knowledge Items (Preloaded + Real-time Bi-directional Synced from Kaizen, OPL, FA, Why-Why & Cost Down 5)
  const combinedItems = useMemo(() => {
    const list: KnowledgeItem[] = [...knowledgeItems];

    // 1. Sync All Why-Why Cases from Improvements & Breakdown repairs
    improvements
      .filter(imp => imp.category === 'WHY_WHY')
      .forEach(imp => {
        const syncId = `imp-why-${imp.id}`;
        if (!list.some(k => k.id === syncId || k.id === imp.id)) {
          const mach = machines.find(m => m.id === imp.machineId);
          list.push({
            id: syncId,
            type: 'WHY_WHY',
            title: imp.title,
            machineId: imp.machineId || 'ALL',
            machineName: mach?.name || imp.machineId || 'เครื่องจักรโรงงาน',
            lineGroup: mach?.lineGroup || 'ฝ่ายผลิต',
            tags: ['Why-Why', 'Kaizen', 'Root Cause', ...(imp.machineId ? [imp.machineId] : [])],
            author: imp.technician || 'วิศวกรซ่อมบำรุง',
            createdAt: imp.startDate || '2026-06-01',
            updatedAt: imp.plannedEndDate || imp.startDate || '2026-06-01',
            isVerified: true,
            sourceCategory: 'WHY_WHY',
            sourceImprovementId: imp.id,
            description: imp.description,
            photoBefore: imp.photoBefore,
            photoAfter: imp.photoAfter,
            pdfFilesCount: imp.pdfFiles?.length || 0,
            whyWhyData: {
              problemStatement: imp.whyWhyData?.problemStatement || imp.description || imp.title,
              phenomenon: imp.whyWhyData?.phenomenon || imp.description || '',
              why1: imp.whyWhyData?.why1 || '',
              why2: imp.whyWhyData?.why2 || '',
              why3: imp.whyWhyData?.why3 || '',
              why4: imp.whyWhyData?.why4 || '',
              why5: imp.whyWhyData?.why5 || imp.whyWhyData?.rootCauseSummary || '',
              rootCauseSummary: imp.whyWhyData?.rootCauseSummary || '',
              countermeasure: imp.whyWhyData?.countermeasure || '',
              effectivenessVerification: imp.whyWhyData?.effectivenessVerification || ''
            }
          });
        }
      });

    // 2. Sync Kaizen Projects (โครงการ Kaizen หน้างาน)
    improvements
      .filter(imp => !imp.category || imp.category === 'KAIZEN')
      .forEach(imp => {
        const syncId = `imp-kz-${imp.id}`;
        if (!list.some(k => k.id === syncId || k.id === imp.id)) {
          const mach = machines.find(m => m.id === imp.machineId);
          list.push({
            id: syncId,
            type: 'KAIZEN',
            title: imp.title,
            machineId: imp.machineId || 'ALL',
            machineName: mach?.name || imp.machineId || 'งานพัฒนา Kaizen',
            lineGroup: mach?.lineGroup || 'ฝ่ายปรับปรุงวิศวกรรม',
            tags: ['Kaizen', 'ปรับปรุงหน้างาน', ...(imp.machineId ? [imp.machineId] : [])],
            author: imp.technician || 'ทีมวิศวกรรมบำรุงรักษา',
            createdAt: imp.startDate || '2026-06-01',
            updatedAt: imp.plannedEndDate || imp.startDate || '2026-06-01',
            isVerified: true,
            sourceCategory: 'KAIZEN',
            sourceImprovementId: imp.id,
            description: imp.description,
            photoBefore: imp.photoBefore,
            photoAfter: imp.photoAfter,
            pdfFilesCount: imp.pdfFiles?.length || 0
          });
        }
      });

    // 3. Sync One Point Lessons (OPL) -> Map as OPL Knowledge
    improvements
      .filter(imp => imp.category === 'OPL')
      .forEach(imp => {
        const syncId = `imp-opl-${imp.id}`;
        if (!list.some(k => k.id === syncId || k.id === imp.id)) {
          const mach = machines.find(m => m.id === imp.machineId);
          const oplSteps = (imp.oplData?.keyPoints || []).map((kp, idx) => ({
            stepNo: idx + 1,
            title: kp,
            description: imp.oplData?.reasons?.[idx] || kp,
            standard: 'มาตรฐานการปฏิบัติงาน OPL',
            caution: imp.oplData?.cautionPoints
          }));
          list.push({
            id: syncId,
            type: 'OPL',
            title: imp.title,
            machineId: imp.machineId || 'ALL',
            machineName: mach?.name || imp.machineId || 'บทเรียนจุดเดียว OPL',
            lineGroup: mach?.lineGroup || 'ฝ่ายผลิต',
            tags: ['OPL', 'One Point Lesson', 'มาตรฐานงาน', ...(imp.machineId ? [imp.machineId] : [])],
            author: imp.technician || 'วิศวกรจัดทำ OPL',
            createdAt: imp.startDate || '2026-06-01',
            updatedAt: imp.plannedEndDate || imp.startDate || '2026-06-01',
            isVerified: true,
            sourceCategory: 'OPL',
            sourceImprovementId: imp.id,
            description: imp.description || imp.oplData?.purpose,
            photoBefore: imp.photoBefore,
            photoAfter: imp.photoAfter,
            pdfFilesCount: imp.pdfFiles?.length || 0,
            wiData: {
              docCode: imp.oplData?.sopDocumentRef || `OPL-${imp.id}`,
              revision: '01',
              effectiveDate: imp.startDate || '2026-06-01',
              department: 'ฝ่ายวิศวกรรมบำรุงรักษา',
              targetAudience: 'ช่างเทคนิคและพนักงานไลน์ผลิต',
              safetyAlerts: imp.oplData?.cautionPoints ? [imp.oplData.cautionPoints] : ['ปฏิบัติตามมาตรฐานความปลอดภัย'],
              toolsRequired: ['เครื่องมือช่างและเอกสารมาตรฐาน'],
              ppeRequired: ['หมวกนิรภัย', 'ถุงมือ', 'รองเท้าเซฟตี้'],
              precautions: imp.oplData?.cautionPoints || 'ระมัดระวังตามมาตรฐาน OPL',
              steps: oplSteps.length > 0 ? oplSteps : [{ stepNo: 1, title: imp.title, description: imp.description }]
            }
          });
        }
      });

    // 4. Sync Failure Analysis (FA) -> Map as FA Knowledge & Troubleshooting
    improvements
      .filter(imp => imp.category === 'FA')
      .forEach(imp => {
        const syncId = `imp-fa-${imp.id}`;
        if (!list.some(k => k.id === syncId || k.id === imp.id)) {
          const mach = machines.find(m => m.id === imp.machineId);
          list.push({
            id: syncId,
            type: 'FA',
            title: imp.title,
            machineId: imp.machineId || 'ALL',
            machineName: mach?.name || imp.machineId || 'วิเคราะห์ชิ้นส่วนชำรุด',
            lineGroup: mach?.lineGroup || 'ฝ่ายผลิต',
            tags: ['FA', 'Failure Analysis', imp.faData?.failurePartName || 'ชิ้นส่วนชำรุด', ...(imp.machineId ? [imp.machineId] : [])],
            author: imp.technician || 'วิศวกรวิเคราะห์ความเสียหาย',
            createdAt: imp.startDate || '2026-06-01',
            updatedAt: imp.plannedEndDate || imp.startDate || '2026-06-01',
            isVerified: true,
            sourceCategory: 'FA',
            sourceImprovementId: imp.id,
            description: imp.description,
            photoBefore: imp.photoBefore,
            photoAfter: imp.photoAfter,
            pdfFilesCount: imp.pdfFiles?.length || 0,
            troubleshootingData: {
              symptom: imp.faData?.failurePartName ? `${imp.faData.failurePartName} - ชำรุด (${imp.faData.failureMode || 'เสียหาย'})` : imp.title,
              subsystem: 'เครื่องกล (Mechanical)',
              urgency: 'เร่งด่วน (Urgent)',
              probableCauses: [
                {
                  id: `fa-cause-${imp.id}`,
                  cause: imp.faData?.mechanismDescription || imp.description || 'เกิดความเสียหายจากการใช้งานหรือการล้าตัว',
                  probability: 'สูง (High)',
                  checkMethod: 'ตรวจสอบผิวสัมผัสและชิ้นส่วนด้วยสายตา/เครื่องมือวัด',
                  solution: imp.faData?.preventiveAction || 'เปลี่ยนชิ้นส่วนใหม่และปรับตั้งตามมาตรฐาน',
                  sparePartNeeded: imp.faData?.failurePartCode || imp.faData?.failurePartName
                }
              ],
              requiredTools: ['เครื่องมือวิเคราะห์ชิ้นส่วน', 'เวอร์เนียร์คาลิปเปอร์'],
              safetyNotes: 'สวมใส่อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคล',
              quickChecklist: ['1. ตรวจสอบชิ้นส่วนที่ชำรุด', '2. บันทึกและปฏิบัติตามมาตรการป้องกัน']
            }
          });
        }
      });

    // 5. Sync Cost Down 5 (CD5 Projects) -> Map as CD5 Knowledge
    (cd5Projects || []).forEach(cd => {
      const syncId = `cd5-${cd.id}`;
      if (!list.some(k => k.id === syncId || k.id === cd.id)) {
        const mach = machines.find(m => m.id === cd.machineId);
        list.push({
          id: syncId,
          type: 'CD5',
          title: `[CD5] ${cd.title}`,
          machineId: cd.machineId || 'ALL',
          machineName: mach?.name || cd.machineId || 'โครงการลดต้นทุนอะไหล่',
          lineGroup: mach?.lineGroup || 'ฝ่ายวิศวกรรมบำรุงรักษา',
          tags: ['Cost Down', 'CD5', cd.partName, cd.category, ...(cd.machineId ? [cd.machineId] : [])],
          author: cd.proposerTechnician || 'ช่างผู้เสนอโครงการ',
          createdAt: cd.startDate || '2026-06-01',
          updatedAt: cd.approvedDate || cd.startDate || '2026-06-01',
          isVerified: cd.status === 'อนุมัติใช้งานจริง' || cd.status === 'กำลังทดสอบ',
          sourceCategory: 'CD5',
          sourceCd5Id: cd.id,
          costSavings: cd.annualSavings || 0,
          description: `โครงการ Cost Down 5: ${cd.partName} (${cd.partCode || 'รหัสอะไหล่'}) ประหยัดได้ ฿${(cd.annualSavings || 0).toLocaleString()}/ปี สถานะ: ${cd.status}`,
          photoBefore: cd.drawingUrl,
          photoAfter: cd.evidencePhotoUrl,
          pdfFilesCount: cd.specPdfUrl ? 1 : 0
        });
      }
    });

    return list;
  }, [knowledgeItems, improvements, machines, cd5Projects]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return combinedItems.filter(item => {
      // Type Tab
      if (activeTypeTab !== 'ALL' && item.type !== activeTypeTab) {
        return false;
      }
      // Machine
      if (selectedMachineId !== 'ALL' && item.machineId.toUpperCase() !== selectedMachineId.toUpperCase()) {
        return false;
      }
      // Subsystem
      if (selectedSubsystem !== 'ALL') {
        if (item.troubleshootingData && item.troubleshootingData.subsystem !== selectedSubsystem) {
          return false;
        }
      }
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchId = item.machineId.toLowerCase().includes(q);
        const matchName = item.machineName.toLowerCase().includes(q);
        const matchTags = item.tags.some(t => t.toLowerCase().includes(q));
        const matchSymptom = item.troubleshootingData?.symptom.toLowerCase().includes(q) || false;
        const matchWhy = item.whyWhyData?.problemStatement.toLowerCase().includes(q) || false;
        const matchSummary = item.manualData?.summary.toLowerCase().includes(q) || false;

        if (!matchTitle && !matchId && !matchName && !matchTags && !matchSymptom && !matchWhy && !matchSummary) {
          return false;
        }
      }
      return true;
    });
  }, [combinedItems, activeTypeTab, selectedMachineId, selectedSubsystem, searchTerm]);

  // Statistics across all integrated pillars (Manual, WI, TB, Why-Why, Kaizen, OPL, FA, CD5)
  const stats = useMemo(() => {
    const total = combinedItems.length;
    const manualCount = combinedItems.filter(k => k.type === 'MANUAL').length;
    const wiCount = combinedItems.filter(k => k.type === 'WI').length;
    const tbCount = combinedItems.filter(k => k.type === 'TROUBLESHOOTING').length;
    const whyCount = combinedItems.filter(k => k.type === 'WHY_WHY').length;
    const kaizenCount = combinedItems.filter(k => k.type === 'KAIZEN').length;
    const oplCount = combinedItems.filter(k => k.type === 'OPL').length;
    const faCount = combinedItems.filter(k => k.type === 'FA').length;
    const cd5Count = combinedItems.filter(k => k.type === 'CD5').length;
    const totalSavings = combinedItems.reduce((sum, k) => sum + (k.costSavings || 0), 0);
    return { total, manualCount, wiCount, tbCount, whyCount, kaizenCount, oplCount, faCount, cd5Count, totalSavings };
  }, [combinedItems]);

  const handleCopyLink = (item: KnowledgeItem) => {
    navigator.clipboard?.writeText?.(`${window.location.origin}/knowledge/${item.id}`);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // File upload reader for Manual PDF
  const handlePdfFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeFormatted = file.size > 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
      : `${Math.round(file.size / 1024)} KB`;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const base64 = loadEvent.target?.result as string;
      if (isEdit) {
        setEditManualFileName(file.name);
        setEditManualFileSize(sizeFormatted);
        setEditManualFileContent(base64);
      } else {
        setManualFileName(file.name);
        setManualFileSize(sizeFormatted);
        setManualFileContent(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  // Open Edit Modal and pre-fill form
  const handleOpenEdit = (item: KnowledgeItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditMachineId(item.machineId);
    setEditTags(item.tags.join(', '));

    if (item.type === 'MANUAL' && item.manualData) {
      setEditManualDocCode(item.manualData.docCode || '');
      setEditManualCategory(item.manualData.category || 'Maintenance Manual');
      setEditManualSummary(item.manualData.summary || '');
      setEditManualFileName(item.manualData.fileName || 'Manual.pdf');
      setEditManualFileSize(item.manualData.fileSize || 'PDF Format');
      setEditManualFileContent(item.manualData.fileContent || 'sample_pdf');
    } else if (item.type === 'WI' && item.wiData) {
      setEditWiDocCode(item.wiData.docCode || '');
      setEditWiTools(item.wiData.toolsRequired?.join(', ') || '');
      setEditWiSafetyAlerts(item.wiData.safetyAlerts?.join(', ') || '');
      setEditWiStep1Title(item.wiData.steps?.[0]?.title || '');
      setEditWiStep1Desc(item.wiData.steps?.[0]?.description || '');
      setEditWiStep2Title(item.wiData.steps?.[1]?.title || '');
      setEditWiStep2Desc(item.wiData.steps?.[1]?.description || '');
    } else if (item.type === 'TROUBLESHOOTING' && item.troubleshootingData) {
      setEditTbSymptom(item.troubleshootingData.symptom || '');
      setEditTbSubsystem(item.troubleshootingData.subsystem || 'เครื่องกล (Mechanical)');
      setEditTbUrgency(item.troubleshootingData.urgency || 'เร่งด่วน (Urgent)');
      setEditTbCause1(item.troubleshootingData.probableCauses?.[0]?.cause || '');
      setEditTbSolution1(item.troubleshootingData.probableCauses?.[0]?.solution || '');
      setEditTbPartNeeded1(item.troubleshootingData.probableCauses?.[0]?.sparePartNeeded || '');
    } else if (item.type === 'WHY_WHY' && item.whyWhyData) {
      setEditWhyProblem(item.whyWhyData.problemStatement || '');
      setEditWhy1(item.whyWhyData.why1 || '');
      setEditWhy2(item.whyWhyData.why2 || '');
      setEditWhy3(item.whyWhyData.why3 || '');
      setEditWhy5(item.whyWhyData.why5 || '');
      setEditWhyCountermeasure(item.whyWhyData.countermeasure || '');
    }
  };

  // Submit Edit updates
  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editTitle.trim() || !editMachineId.trim()) return;

    const mach = machines.find(m => m.id === editMachineId);
    const tagsArray = editTags.split(',').map(t => t.trim()).filter(Boolean);

    let specificUpdates: Partial<KnowledgeItem> = {};

    if (editingItem.type === 'MANUAL') {
      specificUpdates.manualData = {
        ...editingItem.manualData,
        docCode: editManualDocCode || editingItem.manualData?.docCode || `MAN-${editMachineId}-001`,
        revision: editingItem.manualData?.revision || '01',
        category: editManualCategory,
        fileName: editManualFileName || editingItem.manualData?.fileName || 'Manual.pdf',
        fileSize: editManualFileSize || editingItem.manualData?.fileSize || 'PDF Format',
        fileType: 'pdf',
        fileContent: editManualFileContent || editingItem.manualData?.fileContent || 'sample_pdf',
        summary: editManualSummary || editTitle
      };
    } else if (editingItem.type === 'WI') {
      const steps = [];
      if (editWiStep1Title) {
        steps.push({
          stepNo: 1,
          title: editWiStep1Title,
          description: editWiStep1Desc || editWiStep1Title,
          standard: 'ปฏิบัติตามมาตรฐานงาน',
          estimatedMins: 15
        });
      }
      if (editWiStep2Title) {
        steps.push({
          stepNo: 2,
          title: editWiStep2Title,
          description: editWiStep2Desc || editWiStep2Title,
          standard: 'ตรวจสอบความเรียบร้อย',
          estimatedMins: 10
        });
      }
      specificUpdates.wiData = {
        ...editingItem.wiData,
        docCode: editWiDocCode || editingItem.wiData?.docCode || `WI-MNT-${editMachineId}-001`,
        revision: editingItem.wiData?.revision || '01',
        effectiveDate: editingItem.wiData?.effectiveDate || new Date().toISOString().split('T')[0],
        department: editingItem.wiData?.department || 'ฝ่ายวิศวกรรมบำรุงรักษา',
        targetAudience: editingItem.wiData?.targetAudience || 'ช่างเทคนิคซ่อมบำรุง',
        safetyAlerts: editWiSafetyAlerts ? editWiSafetyAlerts.split(',').map(s => s.trim()) : (editingItem.wiData?.safetyAlerts || ['สวมใส่อุปกรณ์ PPE ครบถ้วน']),
        toolsRequired: editWiTools ? editWiTools.split(',').map(t => t.trim()) : (editingItem.wiData?.toolsRequired || ['เครื่องมือช่างพื้นฐาน']),
        ppeRequired: editingItem.wiData?.ppeRequired || ['แว่นตานิรภัย', 'ถุงมือกันบาด', 'รองเท้าเซฟตี้'],
        precautions: editingItem.wiData?.precautions || 'ตัดไฟ LOTO ก่อนเริ่มปฏิบัติงานทุกครั้ง',
        steps: steps.length > 0 ? steps : (editingItem.wiData?.steps || [{ stepNo: 1, title: 'ปฏิบัติงานตามคู่มือ', description: editTitle }])
      };
    } else if (editingItem.type === 'TROUBLESHOOTING') {
      specificUpdates.troubleshootingData = {
        ...editingItem.troubleshootingData,
        symptom: editTbSymptom || editTitle,
        subsystem: editTbSubsystem,
        urgency: editTbUrgency,
        requiredTools: editingItem.troubleshootingData?.requiredTools || ['เครื่องมือตรวจวัดไฟฟ้า/ลม', 'เครื่องมือช่างพื้นฐาน'],
        safetyNotes: editingItem.troubleshootingData?.safetyNotes || 'สับสวิตช์ความปลอดภัยก่อนสัมผัสชิ้นส่วนเคลื่อนที่',
        quickChecklist: editingItem.troubleshootingData?.quickChecklist || ['1. ตรวจสอบไฟสัญญาณเตือน', '2. ตรวจสอบแรงดันลม/ไฟฟ้า'],
        probableCauses: [
          {
            id: editingItem.troubleshootingData?.probableCauses?.[0]?.id || `pc-${Date.now()}`,
            cause: editTbCause1 || 'ชิ้นส่วนเสื่อมสภาพหรือสึกหรอ',
            probability: 'สูง (High)',
            checkMethod: 'ตรวจสอบด้วยสายตาและเครื่องมือวัด',
            solution: editTbSolution1 || 'ทำความสะอาด ปรับตั้ง หรือเปลี่ยนชิ้นส่วนใหม่',
            sparePartNeeded: editTbPartNeeded1 || undefined,
            estimatedFixTimeMins: 30
          }
        ]
      };
    } else if (editingItem.type === 'WHY_WHY') {
      specificUpdates.whyWhyData = {
        ...editingItem.whyWhyData,
        problemStatement: editWhyProblem || editTitle,
        phenomenon: editWhyProblem || editTitle,
        why1: editWhy1 || '',
        why2: editWhy2 || '',
        why3: editWhy3 || '',
        why4: editingItem.whyWhyData?.why4 || '',
        why5: editWhy5 || '',
        rootCauseSummary: editWhy5 || editWhy1 || '',
        countermeasure: editWhyCountermeasure || '',
        effectivenessVerification: editingItem.whyWhyData?.effectivenessVerification || 'ติดตามผล 30 วัน ไม่พบปัญหาเกิดซ้ำ'
      };
    }

    const updatedItem: KnowledgeItem = {
      ...editingItem,
      title: editTitle,
      machineId: editMachineId,
      machineName: mach?.name || editMachineId,
      lineGroup: mach?.lineGroup || editingItem.lineGroup || 'ฝ่ายผลิต',
      tags: tagsArray.length > 0 ? tagsArray : editingItem.tags,
      ...specificUpdates
    };

    updateKnowledgeItem(editingItem.id, updatedItem);

    // If currently viewing this item in view modal, update it in real-time
    if (selectedItemForView?.id === editingItem.id) {
      setSelectedItemForView(updatedItem);
    }

    setEditingItem(null);
  };

  // Linked breakdown repair records into Kaizen Why-Why projects (identical to Kaizen system)
  const linkedBreakdownWhyProjects = useMemo<ImprovementProject[]>(() => {
    const existingWhyIds = new Set(
      improvements.filter(i => i.category === 'WHY_WHY').map(i => i.id)
    );

    return repairs
      .filter(r => {
        const hasWhys = Boolean(r.why1 && r.why1.trim().length > 0);
        const hasWhyExcel = Boolean(r.excelFile);
        const hasWhyAtt = Boolean(r.repairAttachments?.some(a => a.category === 'WHY_WHY' || /why/i.test(a.name)));
        const hasWhyFile = Boolean(r.whyWhyFile);
        return hasWhys || hasWhyExcel || hasWhyAtt || hasWhyFile;
      })
      .map(r => {
        const projId = `why-breakdown-${r.id}`;
        if (existingWhyIds.has(projId) || existingWhyIds.has(r.id)) {
          return null;
        }

        const files: PDFFileAttachment[] = [];
        if (r.whyWhyFile) {
          files.push({
            id: r.whyWhyFile.id,
            name: r.whyWhyFile.name,
            size: r.whyWhyFile.size || 'เอกสาร Why-Why',
            uploadedAt: r.whyWhyFile.uploadedAt || r.date,
            content: r.whyWhyFile.content,
            fileType: r.whyWhyFile.fileType === 'excel' ? 'excel' : 'pdf'
          });
        }
        if (r.excelFile && !files.some(f => f.name === r.excelFile!.name)) {
          files.push({
            id: `excel-${r.id}`,
            name: r.excelFile.name,
            size: 'ไฟล์แนบ Excel',
            uploadedAt: r.date,
            content: r.excelFile.content,
            fileType: 'excel'
          });
        }

        const mach = machines.find(m => m.id === r.machineId);

        return {
          id: projId,
          type: 'Improvement' as const,
          category: 'WHY_WHY' as const,
          title: `[ใบงานซ่อม ${r.id}] ${r.cause || r.action || 'วิเคราะห์สาเหตุอาการเสีย'}`,
          description: `งานซ่อมเครื่องจักร ${mach?.name || r.machineId} วันที่ ${r.date} โดย ${r.technician}: ${r.action || ''}`,
          machineId: r.machineId,
          startDate: r.date,
          plannedEndDate: r.date,
          status: 'เสร็จแล้ว' as const,
          technician: r.technician,
          technicians: [r.technician],
          pdfFiles: files,
          photoBefore: r.photo,
          photos: r.photo ? [{
            id: `photo-repair-${r.id}`,
            url: r.photo,
            caption: 'ภาพหน้างานซ่อม',
            uploadedAt: r.date,
            type: 'before' as const
          }] : [],
          workLogs: [
            {
              id: `wl-repair-${r.id}`,
              date: r.date,
              hours: (r.actualDowntimeMinutes || 60) / 60,
              note: `ช่าง ${r.technician} ดำเนินการวิเคราะห์ Why-Why และซ่อมเสร็จสิ้น`
            }
          ],
          whyWhyData: {
            problemStatement: r.cause || `ปัญหาหน้างานเครื่องจักร ${r.machineId}`,
            phenomenon: r.cause || '',
            why1: r.why1 || '',
            why2: r.why2 || '',
            why3: r.why3 || '',
            why4: r.why4 || '',
            why5: r.why5 || r.cause || '',
            rootCauseSummary: r.why5 || r.cause || 'สาเหตุรากเหง้าจากการวิเคราะห์งานซ่อม',
            countermeasure: r.action || 'ดำเนินการแก้ไขและฟื้นฟูสภาพเครื่องจักร',
            targetCompletionDate: r.date,
            effectivenessVerification: 'ตรวจสอบหลังซ่อม ไม่พบปัญหาเกิดซ้ำ'
          }
        };
      })
      .filter(Boolean) as ImprovementProject[];
  }, [repairs, improvements, machines]);

  // Combined full Why-Why list for WhyWhyAnalysisView
  const allKaizenWhyWhyList = useMemo<ImprovementProject[]>(() => {
    const directWhyList = improvements.filter(i => i.category === 'WHY_WHY');
    const combined = [...directWhyList, ...linkedBreakdownWhyProjects];
    
    // Apply search filter if any
    if (!searchTerm.trim() && selectedMachineId === 'ALL') {
      return combined;
    }

    return combined.filter(item => {
      if (selectedMachineId !== 'ALL' && item.machineId !== selectedMachineId) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q);
        const matchMach = item.machineId?.toLowerCase().includes(q);
        const matchTech = item.technician?.toLowerCase().includes(q);
        const matchWhy = item.whyWhyData?.problemStatement?.toLowerCase().includes(q) 
          || item.whyWhyData?.rootCauseSummary?.toLowerCase().includes(q);
        return matchTitle || matchDesc || matchMach || matchTech || matchWhy;
      }
      return true;
    });
  }, [improvements, linkedBreakdownWhyProjects, searchTerm, selectedMachineId]);

  // Kaizen handlers for Save/Edit/Delete
  const handleSaveKaizenProject = (projData: Partial<ImprovementProject>) => {
    if (editingKaizenProject) {
      const updated = {
        ...editingKaizenProject,
        ...projData,
        id: editingKaizenProject.id
      } as ImprovementProject;

      setImprovements(prev => prev.map(p => p.id === editingKaizenProject.id ? updated : p));
      setEditingKaizenProject(null);
      if (selectedKaizenProject?.id === editingKaizenProject.id) {
        setSelectedKaizenProject(updated);
      }
    } else {
      const newId = `why-${Date.now()}`;
      const newProj: ImprovementProject = {
        id: newId,
        type: 'Improvement',
        category: 'WHY_WHY',
        title: projData.title || 'การวิเคราะห์ Why-Why ใหม่',
        description: projData.description || '',
        startDate: projData.startDate || new Date().toISOString().split('T')[0],
        plannedEndDate: projData.plannedEndDate || new Date().toISOString().split('T')[0],
        technician: projData.technician || currentUser?.name || (technicians?.[0] || 'ช่างเทคนิค'),
        technicians: projData.technicians || [projData.technician || currentUser?.name || 'ช่างเทคนิค'],
        status: projData.status || 'กำลังดำเนินการ',
        pdfFiles: projData.pdfFiles || [],
        photos: projData.photos || [],
        workLogs: [
          {
            id: `wl-${Date.now()}`,
            date: projData.startDate || new Date().toISOString().split('T')[0],
            hours: 2,
            note: 'จัดทำผังการวิเคราะห์หาสาเหตุรากเหง้า (Why-Why Analysis)'
          }
        ],
        ...(projData.machineId ? { machineId: projData.machineId } : {}),
        ...(projData.whyWhyData ? { whyWhyData: projData.whyWhyData } : {})
      };
      setImprovements(prev => [newProj, ...prev]);
    }
    setIsKaizenCreateModalOpen(false);
  };

  const handleDeleteKaizenProject = (id: string) => {
    if (confirm('คุณแน่ใจว่าต้องการลบรายการ Why-Why นี้ใช่หรือไม่?')) {
      setImprovements(prev => prev.filter(p => p.id !== id));
      if (selectedKaizenProject?.id === id) {
        setSelectedKaizenProject(null);
      }
    }
  };

  const handleUpdateKaizenProject = (updated: ImprovementProject) => {
    setImprovements(prev => {
      const exists = prev.some(p => p.id === updated.id);
      if (exists) {
        return prev.map(p => p.id === updated.id ? updated : p);
      }
      return [updated, ...prev];
    });
    if (selectedKaizenProject?.id === updated.id) {
      setSelectedKaizenProject(updated);
    }
    // Sync back to repair record if linked from breakdown
    if (updated.id.startsWith('why-breakdown-')) {
      const repairId = updated.id.replace('why-breakdown-', '');
      setRepairs(prev => prev.map(r => {
        if (r.id !== repairId) return r;
        const newAttachments: RepairAttachmentItem[] = (updated.pdfFiles || []).map(f => ({
          id: f.id,
          category: 'WHY_WHY',
          name: f.name,
          content: f.content,
          fileType: f.fileType === 'excel' ? 'excel' : 'pdf',
          size: f.size,
          uploadedAt: f.uploadedAt
        }));
        return {
          ...r,
          photo: updated.photoBefore || r.photo,
          whyWhyFile: newAttachments.find(a => a.category === 'WHY_WHY') || r.whyWhyFile,
          repairAttachments: [
            ...(r.repairAttachments?.filter(a => !newAttachments.some(na => na.name === a.name)) || []),
            ...newAttachments
          ]
        };
      }));
    }
  };

  // Delete knowledge item permanently
  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    deleteKnowledgeItem(itemToDelete.id);
    if (selectedItemForView?.id === itemToDelete.id) {
      setSelectedItemForView(null);
    }
    setItemToDelete(null);
  };

  const handleCreateKnowledge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMachineId.trim()) return;

    const mach = machines.find(m => m.id === newMachineId);
    const tagsArray = newTags.split(',').map(t => t.trim()).filter(Boolean);

    let specificData: Partial<KnowledgeItem> = {};

    if (newType === 'MANUAL') {
      specificData.manualData = {
        docCode: manualDocCode || `MAN-${newMachineId}-${Date.now().toString().slice(-4)}`,
        revision: '01',
        category: manualCategory,
        fileName: manualFileName || 'Manual.pdf',
        fileSize: manualFileSize || 'PDF Format',
        fileType: 'pdf',
        fileContent: manualFileContent || 'sample_pdf',
        summary: manualSummary || newTitle
      };
    } else if (newType === 'WI') {
      const steps = [];
      if (wiStep1Title) {
        steps.push({
          stepNo: 1,
          title: wiStep1Title,
          description: wiStep1Desc || wiStep1Title,
          standard: 'ปฏิบัติตามมาตรฐานงาน',
          estimatedMins: 15
        });
      }
      if (wiStep2Title) {
        steps.push({
          stepNo: 2,
          title: wiStep2Title,
          description: wiStep2Desc || wiStep2Title,
          standard: 'ตรวจสอบความเรียบร้อย',
          estimatedMins: 10
        });
      }
      specificData.wiData = {
        docCode: wiDocCode || `WI-MNT-${newMachineId}-001`,
        revision: '01',
        effectiveDate: new Date().toISOString().split('T')[0],
        department: 'ฝ่ายวิศวกรรมบำรุงรักษา',
        targetAudience: 'ช่างเทคนิคซ่อมบำรุง',
        safetyAlerts: wiSafetyAlerts ? wiSafetyAlerts.split(',').map(s => s.trim()) : ['สวมใส่อุปกรณ์ PPE ครบถ้วน'],
        toolsRequired: wiTools ? wiTools.split(',').map(t => t.trim()) : ['เครื่องมือช่างพื้นฐาน'],
        ppeRequired: ['แว่นตานิรภัย', 'ถุงมือกันบาด', 'รองเท้าเซฟตี้'],
        precautions: 'ตัดไฟ LOTO ก่อนเริ่มปฏิบัติงานทุกครั้ง',
        steps: steps.length > 0 ? steps : [{ stepNo: 1, title: 'ปฏิบัติงานตามคู่มือ', description: newTitle }]
      };
    } else if (newType === 'TROUBLESHOOTING') {
      specificData.troubleshootingData = {
        symptom: tbSymptom || newTitle,
        subsystem: tbSubsystem,
        urgency: tbUrgency,
        requiredTools: ['เครื่องมือตรวจวัดไฟฟ้า/ลม', 'เครื่องมือช่างพื้นฐาน'],
        safetyNotes: 'สับสวิตช์ความปลอดภัยก่อนสัมผัสชิ้นส่วนเคลื่อนที่',
        quickChecklist: ['1. ตรวจสอบไฟสัญญาณเตือน', '2. ตรวจสอบแรงดันลม/ไฟฟ้า'],
        probableCauses: [
          {
            id: `pc-${Date.now()}`,
            cause: tbCause1 || 'ชิ้นส่วนเสื่อมสภาพหรือสึกหรอ',
            probability: 'สูง (High)',
            checkMethod: 'ตรวจสอบด้วยสายตาและเครื่องมือวัด',
            solution: tbSolution1 || 'ทำความสะอาด ปรับตั้ง หรือเปลี่ยนชิ้นส่วนใหม่',
            sparePartNeeded: tbPartNeeded1 || undefined,
            estimatedFixTimeMins: 30
          }
        ]
      };
    } else if (newType === 'WHY_WHY') {
      specificData.whyWhyData = {
        problemStatement: whyProblem || newTitle,
        phenomenon: whyProblem || newTitle,
        why1: why1 || 'เกิดความผิดปกติในระบบ',
        why2: why2 || '',
        why3: why3 || '',
        why4: '',
        why5: why5 || 'ขาดการตรวจสอบเชิงป้องกันตามรอบเวลา',
        rootCauseSummary: why5 || why1,
        countermeasure: whyCountermeasure || 'ทบทวนแผนบำรุงรักษาและจัดทำมาตรฐานการตรวจสอบ',
        effectivenessVerification: 'ติดตามผล 30 วัน ไม่พบปัญหาเกิดซ้ำ'
      };
    }

    addKnowledgeItem({
      type: newType,
      title: newTitle,
      machineId: newMachineId,
      machineName: mach?.name || newMachineId,
      lineGroup: mach?.lineGroup || 'ฝ่ายผลิต',
      tags: tagsArray.length > 0 ? tagsArray : [newType, newMachineId],
      author: currentUser?.name || 'ช่างเทคนิค',
      ...specificData
    });

    // Reset & close
    setShowCreateModal(false);
    setNewTitle('');
    setNewMachineId('');
    setNewTags('');
    setManualDocCode('');
    setManualSummary('');
    setManualFileName('Document.pdf');
    setManualFileSize('PDF Format');
    setManualFileContent('sample_pdf');
    setWiDocCode('');
    setWiTools('');
    setWiSafetyAlerts('');
    setWiStep1Title('');
    setWiStep1Desc('');
    setWiStep2Title('');
    setWiStep2Desc('');
    setTbSymptom('');
    setTbCause1('');
    setTbSolution1('');
    setTbPartNeeded1('');
    setWhyProblem('');
    setWhy1('');
    setWhy2('');
    setWhy3('');
    setWhy5('');
    setWhyCountermeasure('');
  };

  return (
    <div className="space-y-6" id="active-knowledge-hub-root">
      {/* 1. TOP HEADER & KPI HERO */}
      <div className="bg-[#0b1325]/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-blue-500/20 to-cyan-500/20 border border-indigo-500/30 text-indigo-400 shadow-inner">
              <BookOpen size={26} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  ศูนย์คลังความรู้ Active CMMS Knowledge Base
                </h1>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 font-bold border border-indigo-800/40">
                  Manual • WI • Troubleshooting • Why-Why Case
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-bold border border-emerald-800/40">
                  Phase 2 Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ฐานความรู้ดิจิทัลสืบค้นได้ทันที และแนะนำอัตโนมัติที่หน้างานจริงเมื่อเปิดใบสั่งงาน Work Order หรือบันทึกซ่อม
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              id="btn-goto-bad-actor"
              onClick={() => setActivePage(16)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Flame size={14} className="text-rose-400" />
              <span>🚨 ดู Bad Actor Report</span>
            </button>

            {canEdit && (
              <button
                type="button"
                id="btn-create-knowledge"
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-slate-950 text-xs font-black shadow-lg shadow-indigo-950/50 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus size={16} className="stroke-[3]" />
                <span>เพิ่มองค์ความรู้ใหม่</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Pillars Stats Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80 text-xs">
          {/* Manual */}
          <button
            type="button"
            onClick={() => setActiveTypeTab(activeTypeTab === 'MANUAL' ? 'ALL' : 'MANUAL')}
            className={`p-3 rounded-2xl border transition text-left cursor-pointer ${
              activeTypeTab === 'MANUAL'
                ? 'bg-blue-950/60 border-blue-500 shadow-md shadow-blue-500/20'
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center justify-between text-blue-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Machine Manuals</span>
              <BookMarked size={16} />
            </div>
            <div className="text-xl font-black text-white font-mono">{stats.manualCount}</div>
            <span className="text-[11px] text-slate-400">คู่มือ & แผนภาพวงจร</span>
          </button>

          {/* WI */}
          <button
            type="button"
            onClick={() => setActiveTypeTab(activeTypeTab === 'WI' ? 'ALL' : 'WI')}
            className={`p-3 rounded-2xl border transition text-left cursor-pointer ${
              activeTypeTab === 'WI'
                ? 'bg-emerald-950/60 border-emerald-500 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center justify-between text-emerald-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Work Instructions</span>
              <CheckCircle2 size={16} />
            </div>
            <div className="text-xl font-black text-white font-mono">{stats.wiCount}</div>
            <span className="text-[11px] text-slate-400">ขั้นตอนมาตรฐาน SOP/WI</span>
          </button>

          {/* Troubleshooting */}
          <button
            type="button"
            onClick={() => setActiveTypeTab(activeTypeTab === 'TROUBLESHOOTING' ? 'ALL' : 'TROUBLESHOOTING')}
            className={`p-3 rounded-2xl border transition text-left cursor-pointer ${
              activeTypeTab === 'TROUBLESHOOTING'
                ? 'bg-amber-950/60 border-amber-500 shadow-md shadow-amber-500/20'
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center justify-between text-amber-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Troubleshooting</span>
              <Zap size={16} />
            </div>
            <div className="text-xl font-black text-white font-mono">{stats.tbCount}</div>
            <span className="text-[11px] text-slate-400">คู่มือวิเคราะห์อาการเสีย</span>
          </button>

          {/* Why-Why */}
          <button
            type="button"
            onClick={() => setActiveTypeTab(activeTypeTab === 'WHY_WHY' ? 'ALL' : 'WHY_WHY')}
            className={`p-3 rounded-2xl border transition text-left cursor-pointer ${
              activeTypeTab === 'WHY_WHY'
                ? 'bg-purple-950/60 border-purple-500 shadow-md shadow-purple-500/20'
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center justify-between text-purple-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Why-Why Library</span>
              <Sparkles size={16} />
            </div>
            <div className="text-xl font-black text-white font-mono">{stats.whyCount}</div>
            <span className="text-[11px] text-slate-400">เคสวิเคราะห์สาเหตุรากเหง้า</span>
          </button>
        </div>
      </div>

      {/* 2. UNIVERSAL SEARCH & ACTIVE FILTER BAR */}
      <div className="bg-[#0b1325]/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Universal Fast Search Bar */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400" />
            <input
              type="text"
              id="input-knowledge-search"
              placeholder="ค้นหาด่วน: รหัสเครื่อง (เช่น RIM01, FFS01, VCA01), อาการเสีย (ซีลรั่ว, ฟิล์มย่น, มอเตอร์ไหม้), หรือคำสำคัญ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-2xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 shadow-inner"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Machine Filter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs">
              <Filter size={13} className="text-cyan-400 shrink-0" />
              <span className="text-slate-400 font-medium">เครื่อง:</span>
              <select
                id="select-knowledge-machine"
                value={selectedMachineId}
                onChange={(e) => setSelectedMachineId(e.target.value)}
                className="bg-transparent text-white font-mono font-bold focus:outline-none cursor-pointer max-w-[150px] truncate"
              >
                <option value="ALL" className="bg-slate-900">ทุกเครื่องจักร</option>
                {machines.map(m => (
                  <option key={m.id} value={m.id} className="bg-slate-900">
                    {m.id} - {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subsystem filter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs">
              <Layers size={13} className="text-purple-400 shrink-0" />
              <span className="text-slate-400 font-medium">ระบบย่อย:</span>
              <select
                id="select-knowledge-subsystem"
                value={selectedSubsystem}
                onChange={(e) => setSelectedSubsystem(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer max-w-[150px] truncate"
              >
                <option value="ALL" className="bg-slate-900">ทุกระบบย่อย</option>
                <option value="เครื่องกล (Mechanical)" className="bg-slate-900">เครื่องกล (Mechanical)</option>
                <option value="ระบบไฟฟ้า (Electrical)" className="bg-slate-900">ระบบไฟฟ้า (Electrical)</option>
                <option value="ระบบลม (Pneumatic)" className="bg-slate-900">ระบบลม (Pneumatic)</option>
                <option value="ความร้อน & ซีล (Thermal/Sealing)" className="bg-slate-900">ความร้อน & ซีล</option>
                <option value="ระบบสุญญากาศ (Vacuum)" className="bg-slate-900">ระบบสุญญากาศ</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Pill Type Filter switcher */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTypeTab('ALL')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTypeTab === 'ALL'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white bg-slate-900/60'
            }`}
          >
            🌟 ทั้งหมด ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setActiveTypeTab('MANUAL')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTypeTab === 'MANUAL'
                ? 'bg-blue-500 text-slate-950 shadow-md font-black'
                : 'text-blue-300 hover:text-white bg-blue-950/40 border border-blue-900/40'
            }`}
          >
            <BookMarked size={13} />
            <span>📖 คู่มือเครื่องจักร ({stats.manualCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTypeTab('WI')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTypeTab === 'WI'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-emerald-300 hover:text-white bg-emerald-950/40 border border-emerald-900/40'
            }`}
          >
            <CheckCircle2 size={13} />
            <span>📋 ขั้นตอนมาตรฐาน WI ({stats.wiCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTypeTab('TROUBLESHOOTING')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTypeTab === 'TROUBLESHOOTING'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-amber-300 hover:text-white bg-amber-950/40 border border-amber-900/40'
            }`}
          >
            <Zap size={13} />
            <span>⚡ คู่มือวิเคราะห์อาการเสีย ({stats.tbCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTypeTab('WHY_WHY')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTypeTab === 'WHY_WHY'
                ? 'bg-purple-500 text-slate-950 shadow-md font-black'
                : 'text-purple-300 hover:text-white bg-purple-950/40 border border-purple-900/40'
            }`}
          >
            <Sparkles size={13} />
            <span>🧠 เคส Why-Why ในอดีต ({stats.whyCount})</span>
          </button>
        </div>
      </div>

      {/* 3. WHY-WHY FULL SYSTEM VIEW OR KNOWLEDGE CARDS GRID */}
      {activeTypeTab === 'WHY_WHY' ? (
        <div className="space-y-4" id="kaizen-why-why-full-suite">
          {/* Header Banner for Why-Why Full System */}
          <div className="bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/70 border border-purple-500/40 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <HelpCircle size={22} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                  <span>ผังการวิเคราะห์หาสาเหตุรากเหง้า (Why-Why Analysis Full Suite)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-500/40">
                    {allKaizenWhyWhyList.length} เคสวิเคราะห์
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ระบบวิเคราะห์ 5 Whys พร้อมผังไดอะแกรม (Cause & Effect Tree), แนบเอกสาร Excel/PDF, รูปภาพหน้างาน และเชื่อมโยงงานซ่อมเบรกดาวน์อัตโนมัติ
                </p>
              </div>
            </div>

            <button
              type="button"
              id="btn-create-kaizen-why-why"
              onClick={() => {
                setEditingKaizenProject(null);
                setIsKaizenCreateModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg transition cursor-pointer shrink-0"
            >
              <Plus size={16} />
              <span>สร้าง Why-Why ใหม่</span>
            </button>
          </div>

          {/* Mount the complete WhyWhyAnalysisView from Kaizen suite */}
          <WhyWhyAnalysisView
            whyList={allKaizenWhyWhyList}
            machines={machines}
            onSelectProject={(proj) => setSelectedKaizenProject(proj)}
            onOpenPDF={(pdf) => setViewPdfModal(pdf)}
            onOpenPhoto={(photo) => setActivePhoto(photo)}
            onOpenCreateModal={() => {
              setEditingKaizenProject(null);
              setIsKaizenCreateModalOpen(true);
            }}
            onDeleteProject={handleDeleteKaizenProject}
            onEditProject={(proj) => {
              setSelectedKaizenProject(null);
              setEditingKaizenProject(proj);
              setIsKaizenCreateModalOpen(true);
            }}
            onUpdateProject={handleUpdateKaizenProject}
          />
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="knowledge-cards-grid">
        {filteredItems.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
            <BookOpen size={40} className="mx-auto text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">ไม่พบข้อมูลองค์ความรู้ตามเงื่อนไขที่ค้นหา</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              ลองพิมพ์คำค้นหาใหม่ หรือกดเพิ่มองค์ความรู้ใหม่สำหรับเครื่องจักรนี้เพื่อสะสมเป็นฐานความรู้ประจำโรงงาน
            </p>
          </div>
        ) : (
          filteredItems.map(item => {
            const isManual = item.type === 'MANUAL';
            const isWI = item.type === 'WI';
            const isTB = item.type === 'TROUBLESHOOTING';
            const isWhy = item.type === 'WHY_WHY';

            return (
              <div 
                key={item.id}
                className="bg-[#0b1325] border border-slate-800 hover:border-slate-700 rounded-3xl p-5 shadow-xl hover:shadow-2xl transition flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Header Row: Type Badge & Machine ID */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    {/* Pillar Badge */}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      isManual 
                        ? 'bg-blue-950 text-blue-300 border-blue-800/60'
                        : isWI
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800/60'
                        : isTB
                        ? 'bg-amber-950 text-amber-300 border-amber-800/60'
                        : isWhy
                        ? 'bg-purple-950 text-purple-300 border-purple-800/60'
                        : item.type === 'KAIZEN'
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-800/60'
                        : item.type === 'OPL'
                        ? 'bg-indigo-950 text-indigo-300 border-indigo-800/60'
                        : item.type === 'FA'
                        ? 'bg-rose-950 text-rose-300 border-rose-800/60'
                        : 'bg-teal-950 text-teal-300 border-teal-800/60'
                    }`}>
                      {isManual && <BookMarked size={11} />}
                      {isWI && <CheckCircle2 size={11} />}
                      {isTB && <Zap size={11} />}
                      {isWhy && <Sparkles size={11} />}
                      {item.type === 'KAIZEN' && <Wrench size={11} />}
                      {item.type === 'OPL' && <BookOpen size={11} />}
                      {item.type === 'FA' && <ShieldAlert size={11} />}
                      {item.type === 'CD5' && <TrendingDown size={11} />}
                      <span>{
                        isManual ? 'MANUAL' : 
                        isWI ? 'WI / SOP' : 
                        isTB ? 'TROUBLESHOOT' : 
                        isWhy ? 'WHY-WHY' :
                        item.type === 'KAIZEN' ? 'KAIZEN' :
                        item.type === 'OPL' ? 'OPL' :
                        item.type === 'FA' ? 'FA ANALYSIS' : 'COST DOWN 5'
                      }</span>
                    </span>

                    {/* Machine Badge */}
                    <span className="font-mono text-cyan-400 font-extrabold text-xs bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-700">
                      {item.machineId}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition line-clamp-2 mb-1.5">
                    {item.title}
                  </h3>

                  {/* Machine Name & Line */}
                  <p className="text-[11px] text-slate-400 font-medium mb-3">
                    {item.machineName} {item.lineGroup && `• ${item.lineGroup}`}
                  </p>

                  {/* Core Preview Snippet */}
                  <div className="bg-slate-900/80 rounded-2xl p-3 border border-slate-800/80 mb-3 text-xs text-slate-300 space-y-1.5">
                    {isManual && item.manualData && (
                      <>
                        <div className="text-[10px] text-blue-400 font-mono font-bold flex items-center justify-between">
                          <span>{item.manualData.docCode} (Rev.{item.manualData.revision})</span>
                          <span>{item.manualData.fileSize || 'PDF'}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 line-clamp-2">
                          {item.manualData.summary}
                        </p>
                      </>
                    )}

                    {isWI && item.wiData && (
                      <>
                        <div className="text-[10px] text-emerald-400 font-mono font-bold flex items-center justify-between">
                          <span>{item.wiData.docCode}</span>
                          <span>{item.wiData.steps.length} ขั้นตอนมาตรฐาน</span>
                        </div>
                        <p className="text-[11px] text-slate-300 line-clamp-2">
                          {item.wiData.steps[0]?.description || item.wiData.precautions}
                        </p>
                      </>
                    )}

                    {isTB && item.troubleshootingData && (
                      <>
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-amber-400 font-medium">{item.troubleshootingData.subsystem}</span>
                          <span className="text-rose-400 font-mono">{item.troubleshootingData.probableCauses.length} สาเหตุที่พบบ่อย</span>
                        </div>
                        <p className="text-[11px] text-slate-200 font-medium line-clamp-2">
                          <strong>อาการ:</strong> {item.troubleshootingData.symptom}
                        </p>
                      </>
                    )}

                    {isWhy && item.whyWhyData && (
                      <>
                        <div className="text-[10px] text-purple-400 font-bold flex items-center justify-between">
                          <span>5-Whys Root Cause</span>
                          <span className="text-emerald-400">มาตรการแก้ไขสมบูรณ์</span>
                        </div>
                        <p className="text-[11px] text-slate-300 line-clamp-2">
                          <strong>สาเหตุรากเหง้า:</strong> {item.whyWhyData.why5 || item.whyWhyData.rootCauseSummary}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {item.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-800">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-500 font-mono">
                    ผู้จัดทำ: {item.author}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Open Full Document / Details */}
                    <button
                      type="button"
                      id={`btn-view-knowledge-${item.id}`}
                      onClick={() => {
                        if (item.type === 'WHY_WHY' && item.sourceImprovementId) {
                          const matchedKaizen = allKaizenWhyWhyList.find(w => w.id === item.sourceImprovementId || w.id === item.id);
                          if (matchedKaizen) {
                            setSelectedKaizenProject(matchedKaizen);
                            return;
                          }
                        }
                        setSelectedItemForView(item);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-1 transition cursor-pointer text-xs shadow-md"
                    >
                      <Eye size={13} className="text-cyan-400" />
                      <span>{item.type === 'WHY_WHY' ? 'เปิดผัง 5 Whys' : 'เปิดอ่านคู่มือ'}</span>
                    </button>

                    {/* Edit Button */}
                    {canEdit && (
                      <button
                        type="button"
                        id={`btn-edit-knowledge-${item.id}`}
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 border border-transparent hover:border-amber-500/40 transition cursor-pointer"
                        title="แก้ไขเนื้อหาองค์ความรู้"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}

                    {/* Delete Button */}
                    {canDelete && (
                      <button
                        type="button"
                        id={`btn-delete-knowledge-${item.id}`}
                        onClick={() => setItemToDelete(item)}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-500/40 transition cursor-pointer"
                        title="ลบองค์ความรู้นี้ออกจากคลัง"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      )}

      {/* 4. DETAIL VIEWER MODAL */}
      {selectedItemForView && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
          <div className="bg-[#0b1325] border border-slate-700 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl border ${
                  selectedItemForView.type === 'MANUAL'
                    ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                    : selectedItemForView.type === 'WI'
                    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                    : selectedItemForView.type === 'TROUBLESHOOTING'
                    ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                    : 'bg-purple-500/20 border-purple-500/30 text-purple-400'
                }`}>
                  {selectedItemForView.type === 'MANUAL' && <BookMarked size={22} />}
                  {selectedItemForView.type === 'WI' && <CheckCircle2 size={22} />}
                  {selectedItemForView.type === 'TROUBLESHOOTING' && <Zap size={22} />}
                  {selectedItemForView.type === 'WHY_WHY' && <Sparkles size={22} />}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-cyan-400 font-extrabold text-xs bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-700">
                      {selectedItemForView.machineId}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
                      {selectedItemForView.type}
                    </span>
                    {selectedItemForView.isVerified && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold flex items-center gap-1">
                        <ShieldCheck size={11} /> ผ่านการรับรองวิศวกรรม
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-extrabold text-white mt-1">
                    {selectedItemForView.title}
                  </h3>
                  <p className="text-xs text-slate-400">
                    เครื่องจักร: {selectedItemForView.machineName} • ผู้จัดทำ: {selectedItemForView.author}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItemForView(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-700 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
              {/* Type 1: MANUAL DETAILS */}
              {selectedItemForView.type === 'MANUAL' && selectedItemForView.manualData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-500 uppercase text-[10px] block">รหัสเอกสาร</span>
                      <strong className="text-white font-mono">{selectedItemForView.manualData.docCode}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase text-[10px] block">Revision</span>
                      <strong className="text-cyan-400 font-mono">Rev.{selectedItemForView.manualData.revision}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase text-[10px] block">หมวดหมู่</span>
                      <strong className="text-white">{selectedItemForView.manualData.category}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase text-[10px] block">ผู้ผลิต (Maker)</span>
                      <strong className="text-slate-300">{selectedItemForView.manualData.manufacturer || '-'}</strong>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <h4 className="font-bold text-white flex items-center gap-1.5">
                      <FileText size={16} className="text-blue-400" />
                      สาระสำคัญของเอกสารและคู่มือ (Summary & Scope)
                    </h4>
                    <p className="text-slate-300 leading-relaxed text-xs sm:text-sm">
                      {selectedItemForView.manualData.summary}
                    </p>
                  </div>

                  {/* PDF Preview Frame Card */}
                  <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-800/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400">
                        <FileText size={24} />
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs sm:text-sm">
                          {selectedItemForView.manualData.fileName}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          ไฟล์เอกสารต้นฉบับ ({selectedItemForView.manualData.fileSize || 'PDF Format'})
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setViewPdfModal({
                          name: selectedItemForView.manualData?.fileName || 'Manual.pdf',
                          content: selectedItemForView.manualData?.fileContent || 'sample_pdf',
                          fileType: 'pdf'
                        });
                      }}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5 transition cursor-pointer text-xs"
                    >
                      <Eye size={14} />
                      <span>เปิดพรีวิว PDF</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Type 2: WORK INSTRUCTION (WI / SOP) */}
              {selectedItemForView.type === 'WI' && selectedItemForView.wiData && (
                <div className="space-y-4">
                  {/* Meta Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-500 uppercase text-[10px] block">รหัส WI</span>
                      <strong className="text-emerald-400 font-mono">{selectedItemForView.wiData.docCode}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase text-[10px] block">อ้างอิง SOP</span>
                      <strong className="text-white font-mono">{selectedItemForView.wiData.sopDocumentRef || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase text-[10px] block">วันเริ่มบังคับใช้</span>
                      <strong className="text-slate-300">{selectedItemForView.wiData.effectiveDate}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase text-[10px] block">กลุ่มเป้าหมาย</span>
                      <strong className="text-slate-300">{selectedItemForView.wiData.targetAudience}</strong>
                    </div>
                  </div>

                  {/* Safety & Tools Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Safety Alert */}
                    <div className="bg-rose-950/30 border border-rose-800/40 p-3.5 rounded-2xl space-y-2">
                      <div className="font-bold text-rose-300 flex items-center gap-1.5">
                        <ShieldAlert size={15} />
                        ข้อควรระวังความปลอดภัย & LOTO:
                      </div>
                      <ul className="list-disc pl-4 space-y-1 text-slate-300">
                        {selectedItemForView.wiData.safetyAlerts.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Tools Required */}
                    <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl space-y-2">
                      <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                        <Wrench size={15} />
                        เครื่องมือและอุปกรณ์ที่ต้องเตรียม:
                      </div>
                      <ul className="list-disc pl-4 space-y-1 text-slate-300">
                        {selectedItemForView.wiData.toolsRequired.map((t, idx) => (
                          <li key={idx}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Step by Step Table */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      ลำดับขั้นตอนการปฏิบัติงานมาตรฐาน ({selectedItemForView.wiData.steps.length} ขั้นตอน):
                    </h4>

                    <div className="space-y-2.5">
                      {selectedItemForView.wiData.steps.map(st => (
                        <div key={st.stepNo} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/90 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black text-xs inline-flex items-center justify-center font-mono">
                                {st.stepNo}
                              </span>
                              {st.title}
                            </span>
                            {st.estimatedMins && (
                              <span className="text-[11px] font-mono text-cyan-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                                ⏱️ {st.estimatedMins} นาที
                              </span>
                            )}
                          </div>
                          <p className="text-slate-300 text-xs pl-7">
                            {st.description}
                          </p>
                          {st.standard && (
                            <div className="text-emerald-400 text-xs pl-7 font-medium">
                              ✓ <strong>เกณฑ์ยอมรับ/มาตรฐาน:</strong> {st.standard}
                            </div>
                          )}
                          {st.caution && (
                            <div className="text-amber-400 text-xs pl-7 font-medium">
                              ⚠️ <strong>ข้อควรระวัง:</strong> {st.caution}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Type 3: TROUBLESHOOTING MATRIX */}
              {selectedItemForView.type === 'TROUBLESHOOTING' && selectedItemForView.troubleshootingData && (
                <div className="space-y-4">
                  {/* Symptom Banner */}
                  <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-amber-400">อาการผิดปกติที่ตรวจพบ (Symptom)</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-rose-950 text-rose-300 border border-rose-800">
                        {selectedItemForView.troubleshootingData.urgency}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white">
                      {selectedItemForView.troubleshootingData.symptom}
                    </p>
                    <div className="text-xs text-slate-300">
                      ระบบย่อย: <strong className="text-amber-300">{selectedItemForView.troubleshootingData.subsystem}</strong>
                    </div>
                  </div>

                  {/* Quick Checklist */}
                  {selectedItemForView.troubleshootingData.quickChecklist.length > 0 && (
                    <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
                      <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                        <CheckCircle2 size={14} />
                        การตรวจเช็กเบื้องต้นหน้างานด่วน (Quick Checklist):
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {selectedItemForView.troubleshootingData.quickChecklist.map((c, i) => (
                          <div key={i} className="p-2 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
                            {c}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Probable Causes & Solutions Table */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-white flex items-center gap-1.5">
                      <Zap size={16} className="text-amber-400" />
                      ตารางสาเหตุที่เป็นไปได้ & แนวทางแก้ไข (Root Causes & Actions):
                    </h4>

                    <div className="overflow-x-auto rounded-2xl border border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold">
                          <tr>
                            <th className="py-2.5 px-3">โอกาสเกิด</th>
                            <th className="py-2.5 px-3">สาเหตุที่เป็นไปได้</th>
                            <th className="py-2.5 px-3">วิธีการตรวจเช็ก</th>
                            <th className="py-2.5 px-3">ขั้นตอนแก้ไข / วิธีทำ</th>
                            <th className="py-2.5 px-3">อะไหล่ที่ต้องใช้</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {selectedItemForView.troubleshootingData.probableCauses.map(pc => (
                            <tr key={pc.id} className="hover:bg-slate-800/40">
                              <td className="py-3 px-3 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  pc.probability.includes('สูง') 
                                    ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                                    : pc.probability.includes('ปานกลาง')
                                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                    : 'bg-slate-800 text-slate-300'
                                }`}>
                                  {pc.probability}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-semibold text-slate-200">
                                {pc.cause}
                              </td>
                              <td className="py-3 px-3 text-slate-300">
                                {pc.checkMethod}
                              </td>
                              <td className="py-3 px-3 text-emerald-300 font-medium">
                                {pc.solution}
                              </td>
                              <td className="py-3 px-3 font-mono text-[11px] text-amber-300">
                                {pc.sparePartNeeded || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Type 4: WHY-WHY ANALYSIS CASE */}
              {selectedItemForView.type === 'WHY_WHY' && selectedItemForView.whyWhyData && (
                <div className="space-y-4">
                  {/* Problem Statement */}
                  <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-800/50 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-purple-400">ปัญหาที่เกิดขึ้นจริง (Problem Statement)</span>
                    <p className="text-sm font-bold text-white">
                      {selectedItemForView.whyWhyData.problemStatement}
                    </p>
                  </div>

                  {/* 5-Whys Chain Cards */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-white flex items-center gap-1.5">
                      <Sparkles size={16} className="text-purple-400" />
                      การสืบค้นหาสาเหตุรากเหง้า 5 ระดับ (5-Whys Chain):
                    </h4>

                    <div className="space-y-2">
                      {selectedItemForView.whyWhyData.why1 && (
                        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-start gap-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono font-bold text-xs shrink-0">Why 1</span>
                          <span className="text-slate-200 text-xs">{selectedItemForView.whyWhyData.why1}</span>
                        </div>
                      )}
                      {selectedItemForView.whyWhyData.why2 && (
                        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-start gap-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono font-bold text-xs shrink-0">Why 2</span>
                          <span className="text-slate-200 text-xs">{selectedItemForView.whyWhyData.why2}</span>
                        </div>
                      )}
                      {selectedItemForView.whyWhyData.why3 && (
                        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-start gap-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono font-bold text-xs shrink-0">Why 3</span>
                          <span className="text-slate-200 text-xs">{selectedItemForView.whyWhyData.why3}</span>
                        </div>
                      )}
                      {selectedItemForView.whyWhyData.why4 && (
                        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-start gap-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono font-bold text-xs shrink-0">Why 4</span>
                          <span className="text-slate-200 text-xs">{selectedItemForView.whyWhyData.why4}</span>
                        </div>
                      )}
                      {selectedItemForView.whyWhyData.why5 && (
                        <div className="p-3 bg-rose-950/40 rounded-xl border border-rose-800/80 flex items-start gap-3">
                          <span className="px-2 py-0.5 rounded bg-rose-600 text-slate-950 font-mono font-black text-xs shrink-0">Why 5 (Root Cause)</span>
                          <span className="text-rose-200 font-bold text-xs">{selectedItemForView.whyWhyData.why5}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Countermeasure Card */}
                  <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-800/60 space-y-1.5">
                    <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <ShieldCheck size={16} />
                      มาตรการแก้ไขและป้องกันการเกิดซ้ำถาวร (Countermeasures):
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                      {selectedItemForView.whyWhyData.countermeasure}
                    </p>
                    {selectedItemForView.whyWhyData.standardizationRef && (
                      <div className="text-[11px] text-cyan-400 pt-1">
                        📌 การกำหนดเป็นมาตรฐาน: <strong>{selectedItemForView.whyWhyData.standardizationRef}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}
            

              {/* Type 5: KAIZEN PROJECT DETAILS (Synced) */}
              {selectedItemForView.type === 'KAIZEN' && (
                <div className="space-y-4">
                  <div className="p-4 bg-cyan-950/20 border border-cyan-800/40 rounded-2xl space-y-2">
                    <h4 className="font-bold text-cyan-300 flex items-center gap-1.5 text-xs sm:text-sm">
                      <Wrench size={16} />
                      รายละเอียดผลงานการปรับปรุง Kaizen หน้างาน:
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                      {selectedItemForView.description || selectedItemForView.title}
                    </p>
                  </div>

                  {/* Before / After Photos if available */}
                  {(selectedItemForView.photoBefore || selectedItemForView.photoAfter) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedItemForView.photoBefore && (
                        <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-1.5">
                          <span className="text-[11px] font-bold text-rose-400 block">ภาพก่อนปรับปรุง (Before)</span>
                          <img 
                            src={selectedItemForView.photoBefore} 
                            alt="Before Kaizen" 
                            className="w-full h-44 object-cover rounded-xl border border-slate-800"
                          />
                        </div>
                      )}
                      {selectedItemForView.photoAfter && (
                        <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-1.5">
                          <span className="text-[11px] font-bold text-emerald-400 block">ภาพหลังปรับปรุง (After)</span>
                          <img 
                            src={selectedItemForView.photoAfter} 
                            alt="After Kaizen" 
                            className="w-full h-44 object-cover rounded-xl border border-slate-800"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">เชื่อมโยงจากโมดูล: โครงการ Kaizen หน้างาน</span>
                    {onNavigateToKaizenTab && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedItemForView(null);
                          onNavigateToKaizenTab('kaizen');
                        }}
                        className="text-cyan-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                      >
                        เปิดดูในห้อง Kaizen Suite <ArrowUpRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Type 6: COST DOWN 5 PROJECT DETAILS (Synced) */}
              {selectedItemForView.type === 'CD5' && (
                <div className="space-y-4">
                  {selectedItemForView.costSavings ? (
                    <div className="p-4 bg-teal-950/30 border border-teal-500/50 rounded-2xl flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <span className="text-teal-400 text-xs font-bold block flex items-center gap-1.5">
                          <TrendingDown size={16} /> ยอดประหยัดต้นทุนอะไหล่ต่อปี (Annual Cost Reduction)
                        </span>
                        <strong className="text-2xl font-black text-white font-mono mt-0.5 block">
                          ฿{selectedItemForView.costSavings.toLocaleString()} / ปี
                        </strong>
                      </div>
                      <span className="px-3 py-1 rounded-xl bg-teal-500 text-slate-950 font-black text-xs">
                        CD5 Certified
                      </span>
                    </div>
                  ) : null}

                  <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2 text-xs sm:text-sm">
                    <h4 className="font-bold text-white">รายละเอียดโครงการทดแทน/ปรับปรุงอะไหล่:</h4>
                    <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                      {selectedItemForView.description}
                    </p>
                  </div>

                  {(selectedItemForView.photoBefore || selectedItemForView.photoAfter) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedItemForView.photoBefore && (
                        <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-1.5">
                          <span className="text-[11px] font-bold text-teal-400 block">แบบวิศวกรรม / ดรอว์อิ้ง (Drawing/Spec)</span>
                          <img 
                            src={selectedItemForView.photoBefore} 
                            alt="Drawing" 
                            className="w-full h-44 object-contain bg-slate-950 rounded-xl border border-slate-800"
                          />
                        </div>
                      )}
                      {selectedItemForView.photoAfter && (
                        <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-1.5">
                          <span className="text-[11px] font-bold text-emerald-400 block">รูปถ่ายอะไหล่จริง (Actual Part)</span>
                          <img 
                            src={selectedItemForView.photoAfter} 
                            alt="Actual Part" 
                            className="w-full h-44 object-cover rounded-xl border border-slate-800"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">เชื่อมโยงจากระบบ: Cost Down 5 (CD5)</span>
                    {onNavigateToKaizenTab && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedItemForView(null);
                          onNavigateToKaizenTab('costdown');
                        }}
                        className="text-teal-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                      >
                        เปิดดูในระบบ Cost Down 5 <ArrowUpRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )}
</div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyLink(selectedItemForView)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedId === selectedItemForView.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedId === selectedItemForView.id ? 'คัดลอกลิงก์แล้ว' : 'คัดลอกลิงก์อ้างอิง'}</span>
                </button>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(selectedItemForView)}
                    className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Edit2 size={13} />
                    <span>แก้ไข</span>
                  </button>
                )}

                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setItemToDelete(selectedItemForView)}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>ลบรายการ</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedItemForView(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. CREATE KNOWLEDGE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
          <div className="bg-[#0b1325] border border-slate-700 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  เพิ่มองค์ความรู้ใหม่ใน Active CMMS
                </h3>
                <p className="text-xs text-slate-400">
                  เลือกประเภทองค์ความรู้ กรอกข้อมูลสำหรับสืบค้นและแสดงแนะนำอัตโนมัติที่หน้างาน
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateKnowledge} className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Type Selector */}
              <div>
                <label className="text-slate-300 font-bold block mb-1">ประเภทองค์ความรู้</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewType('MANUAL')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition cursor-pointer ${
                      newType === 'MANUAL' ? 'bg-blue-600 text-white border-blue-400' : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    📖 Manual
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType('WI')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition cursor-pointer ${
                      newType === 'WI' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    📋 WI / SOP
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType('TROUBLESHOOTING')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition cursor-pointer ${
                      newType === 'TROUBLESHOOTING' ? 'bg-amber-600 text-white border-amber-400' : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    ⚡ Troubleshoot
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingKaizenProject(null);
                      setIsKaizenCreateModalOpen(true);
                    }}
                    className="p-2.5 rounded-xl border text-center font-bold transition cursor-pointer bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border-purple-800/60 flex items-center justify-center gap-1"
                    title="สร้างด้วยระบบ Why-Why Analysis เต็มรูปแบบของ Kaizen"
                  >
                    <span>🧠 Why-Why</span>
                    <span className="text-[10px] px-1 bg-purple-500/30 rounded text-purple-200">Full</span>
                  </button>
                </div>
              </div>

              {/* Title & Machine ID */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-slate-300 font-bold block mb-1">ชื่อหัวข้อองค์ความรู้ *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น คู่มือการซ่อมบำรุง, ขั้นตอนการเปลี่ยนซีล, ปัญหาเครื่องดูดไม่ลง..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">เครื่องจักรที่เกี่ยวข้อง *</label>
                  <select
                    required
                    value={newMachineId}
                    onChange={(e) => setNewMachineId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="">-- เลือกรหัสเครื่อง --</option>
                    {machines.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.id} - {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="text-slate-300 font-bold block mb-1">แท็กช่วยสืบค้น (คั่นด้วยจุลภาค)</label>
                <input
                  type="text"
                  placeholder="เช่น ซีลยาง, นิวเมติกส์, ฮีตเตอร์, โซลินอยด์"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Form by Type */}
              {newType === 'MANUAL' && (
                <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="font-bold text-blue-400">รายละเอียดคู่มือ (Manual Specs)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">รหัสเอกสาร</label>
                      <input
                        type="text"
                        placeholder="MAN-2026-001"
                        value={manualDocCode}
                        onChange={(e) => setManualDocCode(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">หมวดหมู่คู่มือ</label>
                      <select
                        value={manualCategory}
                        onChange={(e) => setManualCategory(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                      >
                        <option value="Maintenance Manual">Maintenance Manual</option>
                        <option value="Operation Manual">Operation Manual</option>
                        <option value="Electrical Diagram">Electrical Diagram</option>
                        <option value="Pneumatic Diagram">Pneumatic Diagram</option>
                        <option value="Spare Parts Catalog">Spare Parts Catalog</option>
                        <option value="Safety Standard">Safety Standard</option>
                      </select>
                    </div>
                  </div>

                  {/* PDF File Upload Input */}
                  <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-xl space-y-2">
                    <label className="text-blue-300 font-bold block flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <UploadCloud size={15} />
                        แนบไฟล์คู่มือ PDF (Machine Manual PDF File)
                      </span>
                      {manualFileContent && manualFileContent !== 'sample_pdf' && (
                        <span className="text-emerald-400 text-[11px] font-normal flex items-center gap-1">
                          <CheckCircle2 size={12} /> อัปโหลดสำเร็จแล้ว
                        </span>
                      )}
                    </label>
                    <input
                      type="file"
                      id="input-manual-file-upload"
                      accept=".pdf,application/pdf"
                      onChange={(e) => handlePdfFileUpload(e, false)}
                      className="block w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span className="truncate max-w-[320px]">
                        📄 ไฟล์ปัจจุบัน: <strong className="text-slate-200">{manualFileName}</strong> ({manualFileSize})
                      </span>
                      {manualFileContent && manualFileContent !== 'sample_pdf' && (
                        <button
                          type="button"
                          onClick={() => setViewPdfModal({ name: manualFileName, content: manualFileContent, fileType: 'pdf' })}
                          className="text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Eye size={12} /> ทดสอบเปิดดู
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">สาระสำคัญโดยย่อ</label>
                    <textarea
                      rows={2}
                      placeholder="อธิบายสรุปสาระสำคัญของคู่มือฉบับนี้..."
                      value={manualSummary}
                      onChange={(e) => setManualSummary(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>
                </div>
              )}

              {/* WI / SOP Form Section for Create */}
              {newType === 'WI' && (
                <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="font-bold text-emerald-400">รายละเอียดขั้นตอนการปฏิบัติงานมาตรฐาน (WI / SOP Specs)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">รหัสเอกสาร WI</label>
                      <input
                        type="text"
                        placeholder="WI-MNT-VAC-001"
                        value={wiDocCode}
                        onChange={(e) => setWiDocCode(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">เครื่องมือที่จำเป็น (คั่นด้วยจุลภาค)</label>
                      <input
                        type="text"
                        placeholder="ประแจแหวน, เกจวัดแรงดัน, มัลติมิเตอร์"
                        value={wiTools}
                        onChange={(e) => setWiTools(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">ข้อควรระวังความปลอดภัย (Safety Alerts)</label>
                    <input
                      type="text"
                      placeholder="สวมถุงมือกันบาด, ล็อคเบรกเกอร์ LOTO ก่อนเริ่มงาน"
                      value={wiSafetyAlerts}
                      onChange={(e) => setWiSafetyAlerts(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>
                  <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 space-y-2">
                    <span className="font-bold text-slate-300 block text-xs">ขั้นตอนหลักที่ 1 (Step 1)</span>
                    <input
                      type="text"
                      placeholder="หัวข้อขั้นตอนที่ 1 เช่น ตรวจเช็คแรงดันลมและทำความสะอาดหน้าสัมผัส"
                      value={wiStep1Title}
                      onChange={(e) => setWiStep1Title(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                    <textarea
                      rows={2}
                      placeholder="รายละเอียดวิธีการและเกณฑ์มาตรฐานที่ยอมรับได้..."
                      value={wiStep1Desc}
                      onChange={(e) => setWiStep1Desc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>
                  <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 space-y-2">
                    <span className="font-bold text-slate-300 block text-xs">ขั้นตอนหลักที่ 2 (Step 2 - ถ้ามี)</span>
                    <input
                      type="text"
                      placeholder="หัวข้อขั้นตอนที่ 2 เช่น ตรวจสอบการทำงานหลังประกอบและทดสอบเดินเครื่อง"
                      value={wiStep2Title}
                      onChange={(e) => setWiStep2Title(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                    <textarea
                      rows={2}
                      placeholder="รายละเอียดวิธีการและเกณฑ์มาตรฐาน..."
                      value={wiStep2Desc}
                      onChange={(e) => setWiStep2Desc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>
                </div>
              )}

              {newType === 'TROUBLESHOOTING' && (
                <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="font-bold text-amber-400">รายละเอียดคู่มือวิเคราะห์อาการเสีย (Troubleshooting Details)</h4>
                  <div>
                    <label className="text-slate-400 block mb-1">อาการผิดปกติ (Symptom)</label>
                    <input
                      type="text"
                      placeholder="เช่น อุณหภูมิหน้าซีลไม่ขึ้น, ฟิล์มย่น, มอเตอร์ทริป..."
                      value={tbSymptom}
                      onChange={(e) => setTbSymptom(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">สาเหตุที่เป็นไปได้</label>
                      <input
                        type="text"
                        placeholder="เช่น เทอร์โมคัปเปิลหลวม, ขดลวดฮีตเตอร์ขาด"
                        value={tbCause1}
                        onChange={(e) => setTbCause1(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">วิธีตรวจสอบและแก้ไข</label>
                      <input
                        type="text"
                        placeholder="เช่น ขันขั้วต่อใหม่ หรือเปลี่ยน Cartridge Heater"
                        value={tbSolution1}
                        onChange={(e) => setTbSolution1(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">อะไหล่ที่ต้องใช้ (ถ้ามี)</label>
                    <input
                      type="text"
                      placeholder="เช่น CARTRIDGE HEATER 400W"
                      value={tbPartNeeded1}
                      onChange={(e) => setTbPartNeeded1(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>
              )}

              {newType === 'WHY_WHY' && (
                <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="font-bold text-purple-400">การวิเคราะห์ 5 Whys (Root Cause Analysis)</h4>
                  <div>
                    <label className="text-slate-400 block mb-1">ปัญหาหน้างานจริง (Problem)</label>
                    <input
                      type="text"
                      placeholder="เช่น เครื่องหยุดกะทันหัน อุณหภูมิตู้สูงเกิน"
                      value={whyProblem}
                      onChange={(e) => setWhyProblem(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">ทำไม 1</label>
                      <input
                        type="text"
                        value={why1}
                        onChange={(e) => setWhy1(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">ทำไม 5 (Root Cause)</label>
                      <input
                        type="text"
                        value={why5}
                        onChange={(e) => setWhy5(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">มาตรการแก้ไขและป้องกันเกิดซ้ำ (Countermeasure)</label>
                    <textarea
                      rows={2}
                      value={whyCountermeasure}
                      onChange={(e) => setWhyCountermeasure(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-slate-950 font-black shadow-lg"
                >
                  บันทึกลงฐานความรู้ CMMS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5.1 EDIT KNOWLEDGE MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
          <div className="bg-[#0b1325] border border-amber-500/40 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <Edit2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    แก้ไขข้อมูลองค์ความรู้ (Edit Knowledge Base)
                  </h3>
                  <p className="text-xs text-slate-400">
                    หมวดหมู่: <strong className="text-amber-300 font-mono">{editingItem.type}</strong> • รหัสอ้างอิง: <strong className="text-slate-300 font-mono">{editingItem.id}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Title & Machine ID */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-slate-300 font-bold block mb-1">ชื่อหัวข้อองค์ความรู้ *</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">เครื่องจักรที่เกี่ยวข้อง *</label>
                  <select
                    required
                    value={editMachineId}
                    onChange={(e) => setEditMachineId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="">-- เลือกรหัสเครื่อง --</option>
                    {machines.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.id} - {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="text-slate-300 font-bold block mb-1">แท็กช่วยสืบค้น (คั่นด้วยจุลภาค)</label>
                <input
                  type="text"
                  placeholder="เช่น ซีลยาง, นิวเมติกส์, ฮีตเตอร์"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Category-specific fields */}
              {editingItem.type === 'MANUAL' && (
                <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="font-bold text-blue-400">แก้ไขข้อมูลคู่มือเครื่องจักร (Manual Specs & PDF)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">รหัสเอกสาร</label>
                      <input
                        type="text"
                        value={editManualDocCode}
                        onChange={(e) => setEditManualDocCode(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">หมวดหมู่คู่มือ</label>
                      <select
                        value={editManualCategory}
                        onChange={(e) => setEditManualCategory(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                      >
                        <option value="Maintenance Manual">Maintenance Manual</option>
                        <option value="Operation Manual">Operation Manual</option>
                        <option value="Electrical Diagram">Electrical Diagram</option>
                        <option value="Pneumatic Diagram">Pneumatic Diagram</option>
                        <option value="Spare Parts Catalog">Spare Parts Catalog</option>
                        <option value="Safety Standard">Safety Standard</option>
                      </select>
                    </div>
                  </div>

                  {/* PDF Upload / Replace Input */}
                  <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-xl space-y-2">
                    <label className="text-blue-300 font-bold block flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <UploadCloud size={15} />
                        เปลี่ยนหรือแนบไฟล์ PDF ใหม่ (Update Manual PDF)
                      </span>
                      {editManualFileContent && editManualFileContent !== 'sample_pdf' && (
                        <span className="text-emerald-400 text-[11px] font-normal flex items-center gap-1">
                          <CheckCircle2 size={12} /> แนบไฟล์ใหม่แล้ว
                        </span>
                      )}
                    </label>
                    <input
                      type="file"
                      id="input-edit-manual-file-upload"
                      accept=".pdf,application/pdf"
                      onChange={(e) => handlePdfFileUpload(e, true)}
                      className="block w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span className="truncate max-w-[320px]">
                        📄 ไฟล์: <strong className="text-slate-200">{editManualFileName}</strong> ({editManualFileSize})
                      </span>
                      <button
                        type="button"
                        onClick={() => setViewPdfModal({ name: editManualFileName, content: editManualFileContent || 'sample_pdf', fileType: 'pdf' })}
                        className="text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Eye size={12} /> ทดสอบเปิดดู
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">สาระสำคัญโดยย่อ</label>
                    <textarea
                      rows={2}
                      value={editManualSummary}
                      onChange={(e) => setEditManualSummary(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>
                </div>
              )}

              {editingItem.type === 'WI' && (
                <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="font-bold text-emerald-400">แก้ไขขั้นตอนการปฏิบัติงานมาตรฐาน (WI / SOP)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">รหัสเอกสาร WI</label>
                      <input
                        type="text"
                        value={editWiDocCode}
                        onChange={(e) => setEditWiDocCode(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">เครื่องมือที่จำเป็น (คั่นด้วยจุลภาค)</label>
                      <input
                        type="text"
                        value={editWiTools}
                        onChange={(e) => setEditWiTools(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">ข้อควรระวังความปลอดภัย (Safety Alerts)</label>
                    <input
                      type="text"
                      value={editWiSafetyAlerts}
                      onChange={(e) => setEditWiSafetyAlerts(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>
                  <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 space-y-2">
                    <span className="font-bold text-slate-300 block text-xs">ขั้นตอนหลักที่ 1 (Step 1)</span>
                    <input
                      type="text"
                      value={editWiStep1Title}
                      onChange={(e) => setEditWiStep1Title(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                    <textarea
                      rows={2}
                      value={editWiStep1Desc}
                      onChange={(e) => setEditWiStep1Desc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>
                  <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 space-y-2">
                    <span className="font-bold text-slate-300 block text-xs">ขั้นตอนหลักที่ 2 (Step 2)</span>
                    <input
                      type="text"
                      value={editWiStep2Title}
                      onChange={(e) => setEditWiStep2Title(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                    <textarea
                      rows={2}
                      value={editWiStep2Desc}
                      onChange={(e) => setEditWiStep2Desc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>
                </div>
              )}

              {editingItem.type === 'TROUBLESHOOTING' && (
                <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="font-bold text-amber-400">แก้ไขคู่มือวิเคราะห์อาการเสีย (Troubleshooting Details)</h4>
                  <div>
                    <label className="text-slate-400 block mb-1">อาการผิดปกติ (Symptom)</label>
                    <input
                      type="text"
                      value={editTbSymptom}
                      onChange={(e) => setEditTbSymptom(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">ระบบย่อย</label>
                      <select
                        value={editTbSubsystem}
                        onChange={(e) => setEditTbSubsystem(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                      >
                        <option value="เครื่องกล (Mechanical)">เครื่องกล (Mechanical)</option>
                        <option value="ระบบไฟฟ้า (Electrical)">ระบบไฟฟ้า (Electrical)</option>
                        <option value="ระบบลม (Pneumatic)">ระบบลม (Pneumatic)</option>
                        <option value="เซนเซอร์ & คอนโทรล (Control/Sensor)">เซนเซอร์ & คอนโทรล (Control/Sensor)</option>
                        <option value="ความร้อน & ซีล (Thermal/Sealing)">ความร้อน & ซีล (Thermal/Sealing)</option>
                        <option value="ระบบสุญญากาศ (Vacuum)">ระบบสุญญากาศ (Vacuum)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">ระดับความเร่งด่วน</label>
                      <select
                        value={editTbUrgency}
                        onChange={(e) => setEditTbUrgency(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                      >
                        <option value="วิกฤตไลน์หยุด (Critical)">วิกฤตไลน์หยุด (Critical)</option>
                        <option value="เร่งด่วน (Urgent)">เร่งด่วน (Urgent)</option>
                        <option value="ทั่วไป (Normal)">ทั่วไป (Normal)</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">สาเหตุที่เป็นไปได้</label>
                      <input
                        type="text"
                        value={editTbCause1}
                        onChange={(e) => setEditTbCause1(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">วิธีตรวจสอบและแก้ไข</label>
                      <input
                        type="text"
                        value={editTbSolution1}
                        onChange={(e) => setEditTbSolution1(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">อะไหล่ที่ต้องใช้</label>
                    <input
                      type="text"
                      value={editTbPartNeeded1}
                      onChange={(e) => setEditTbPartNeeded1(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>
              )}

              {editingItem.type === 'WHY_WHY' && (
                <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="font-bold text-purple-400">แก้ไขการวิเคราะห์ 5 Whys (Root Cause Analysis)</h4>
                  <div>
                    <label className="text-slate-400 block mb-1">ปัญหาหน้างานจริง (Problem)</label>
                    <input
                      type="text"
                      value={editWhyProblem}
                      onChange={(e) => setEditWhyProblem(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">ทำไม 1</label>
                      <input
                        type="text"
                        value={editWhy1}
                        onChange={(e) => setEditWhy1(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">ทำไม 5 (Root Cause)</label>
                      <input
                        type="text"
                        value={editWhy5}
                        onChange={(e) => setEditWhy5(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">มาตรการแก้ไขและป้องกันเกิดซ้ำ (Countermeasure)</label>
                    <textarea
                      rows={2}
                      value={editWhyCountermeasure}
                      onChange={(e) => setEditWhyCountermeasure(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-lg cursor-pointer"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5.2 DELETE CONFIRMATION MODAL */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0b1325] border border-rose-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 shrink-0">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  ยืนยันการลบองค์ความรู้?
                </h3>
                <p className="text-xs text-rose-300">
                  หมวดหมู่ {itemToDelete.type} • เครื่องจักร {itemToDelete.machineId}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 text-xs space-y-1.5">
              <span className="text-slate-400 block text-[11px]">หัวข้อที่ต้องการลบ:</span>
              <p className="font-bold text-white leading-relaxed">
                {itemToDelete.title}
              </p>
              <div className="text-[11px] text-slate-400 pt-1">
                สร้างโดย: {itemToDelete.author} • อัปเดตล่าสุด: {itemToDelete.updatedAt}
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              เมื่อลบแล้ว รายการนี้จะถูกลบออกจากฐานข้อมูลคลังความรู้ และจะไม่ปรากฏในการแนะนำอัตโนมัติหน้างานซ่อม
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                id="btn-confirm-delete-knowledge"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-950/50 transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>ยืนยันลบถาวร</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5.3 KAIZEN WHY-WHY CREATE/EDIT MODAL */}
      <CreateEditKaizenModal
        isOpen={isKaizenCreateModalOpen}
        onClose={() => {
          setIsKaizenCreateModalOpen(false);
          setEditingKaizenProject(null);
        }}
        onSave={handleSaveKaizenProject}
        machines={machines}
        technicians={technicians || []}
        initialProject={editingKaizenProject}
        defaultCategory="WHY_WHY"
      />

      {/* 5.4 KAIZEN WHY-WHY DETAIL MODAL */}
      <KaizenDetailModal
        project={selectedKaizenProject}
        onClose={() => setSelectedKaizenProject(null)}
        onUpdate={handleUpdateKaizenProject}
        onEdit={(proj) => {
          setSelectedKaizenProject(null);
          setEditingKaizenProject(proj);
          setIsKaizenCreateModalOpen(true);
        }}
        onDelete={handleDeleteKaizenProject}
        machines={machines}
        onOpenPDF={(pdf) => setViewPdfModal(pdf)}
        onOpenPhoto={(photo) => setActivePhoto(photo)}
      />

      {/* 5.5 PHOTO LIGHTBOX MODAL */}
      <PhotoLightboxModal
        photo={activePhoto}
        onClose={() => setActivePhoto(null)}
      />

      {/* 6. PDF PREVIEW MODAL */}
      {viewPdfModal && (
        <PDFViewerModal
          pdf={{
            id: 'temp-preview',
            name: viewPdfModal.name,
            content: viewPdfModal.content,
            fileType: 'pdf'
          }}
          onClose={() => setViewPdfModal(null)}
        />
      )}
    </div>
  );
};
