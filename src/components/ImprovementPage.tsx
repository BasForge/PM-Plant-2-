import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ImprovementProject, KaizenCategory, PDFFileAttachment, RepairAttachmentItem } from '../types';
import { 
  Wrench, BookOpen, Search as SearchIcon, HelpCircle, Plus, 
  BarChart3, Filter, FileText, Image as ImageIcon, Sparkles, Layers, FileCheck,
  Trash2, CheckSquare, AlertTriangle
} from 'lucide-react';
import { KaizenKanbanView } from './kaizen/KaizenKanbanView';
import { OPLView } from './kaizen/OPLView';
import { FailureAnalysisView } from './kaizen/FailureAnalysisView';
import { WhyWhyAnalysisView } from './kaizen/WhyWhyAnalysisView';
import { MPInformationView } from './kaizen/MPInformationView';
import { KaizenOverviewView } from './kaizen/KaizenOverviewView';
import { CreateEditKaizenModal } from './kaizen/CreateEditKaizenModal';
import { KaizenDetailModal } from './kaizen/KaizenDetailModal';
import { PDFViewerModal } from './kaizen/PDFViewerModal';
import { PhotoLightboxModal } from './kaizen/PhotoLightboxModal';

type ActiveTab = 'kaizen' | 'opl' | 'fa' | 'why_why' | 'mp_info' | 'overview';

export interface ImprovementPageProps {
  initialTab?: 'kaizen' | 'opl' | 'fa' | 'why_why' | 'mp_info' | 'overview';
}

export const ImprovementPage: React.FC<ImprovementPageProps> = ({ initialTab }) => {
  const { 
    improvements, 
    setImprovements, 
    machines, 
    technicians, 
    repairs,
    setRepairs,
    kaizenNavigationFilter, 
    clearKaizenNavigationFilter 
  } = useApp();

  // Active Tab Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (kaizenNavigationFilter?.category === 'FA') return 'fa';
    if (kaizenNavigationFilter?.category === 'OPL') return 'opl';
    if (kaizenNavigationFilter?.category === 'WHY_WHY') return 'why_why';
    if (kaizenNavigationFilter?.category === 'MP_INFO') return 'mp_info';
    if (initialTab) return initialTab;
    return 'kaizen';
  });

  // Search and Filters
  const [searchTerm, setSearchTerm] = useState(kaizenNavigationFilter?.searchQuery || '');
  const [filterTechnician, setFilterTechnician] = useState<string>('all');
  const [filterMachine, setFilterMachine] = useState<string>(kaizenNavigationFilter?.machineId || 'all');

  // Automatically link Why-Why analysis & files from breakdown repair records into Kaizen Why-Why
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
        if (r.repairAttachments) {
          r.repairAttachments
            .filter(a => a.category === 'WHY_WHY' || /why/i.test(a.name) || a.fileType === 'excel')
            .forEach(a => {
              if (!files.some(f => f.name === a.name)) {
                files.push({
                  id: a.id,
                  name: a.name,
                  size: a.size || 'ไฟล์แนบ',
                  uploadedAt: a.uploadedAt || r.date,
                  content: a.content,
                  fileType: a.fileType === 'excel' ? 'excel' : 'pdf'
                });
              }
            });
        }

        const isWhyExcelNamed = r.excelFile && /why/i.test(r.excelFile.name);
        const title = isWhyExcelNamed
          ? `[Why-Why เบรกดาวน์] ${r.machineId}: ${r.excelFile!.name.replace(/\.[^/.]+$/, "")}`
          : `[Why-Why เบรกดาวน์] ${r.machineId}: ${r.symptoms}`;

        const project: ImprovementProject = {
          id: projId,
          type: 'Improvement',
          category: 'WHY_WHY',
          title,
          description: `การสืบค้นวิเคราะห์สาเหตุรากเหง้า Why-Why Analysis เชื่อมโยงจากประวัติงานซ่อม #${r.id} (เครื่อง ${r.machineId}) วันที่ ${r.date}`,
          machineId: r.machineId,
          startDate: r.date,
          plannedEndDate: r.date,
          status: 'เสร็จแล้ว',
          technician: r.technician || 'ช่างประจำกะ',
          technicians: r.technicians || [r.technician || 'ช่างประจำกะ'],
          workLogs: [],
          photoBefore: r.photo,
          pdfFiles: files,
          whyWhyData: {
            problemStatement: r.symptoms,
            phenomenon: r.symptoms,
            why1: r.why1 || '',
            why2: r.why2 || '',
            why3: r.why3 || '',
            why4: r.why4 || '',
            why5: r.why5 || '',
            rootCauseSummary: r.why5 || r.why4 || r.why3 || r.why2 || r.why1 || 'วิเคราะห์สาเหตุรากเหง้าตามลำดับ 5 Whys',
            countermeasure: r.correctiveAction || 'มาตรการแก้ไขและป้องกันการเกิดซ้ำ',
            standardizationRef: r.workOrderNo || r.workOrderId || `ใบงานซ่อม #${r.id}`
          }
        };
        return project;
      })
      .filter((p): p is ImprovementProject => p !== null);
  }, [repairs, improvements]);

  // Handle incoming kaizenNavigationFilter (run only when a new filter is received)
  useEffect(() => {
    if (!kaizenNavigationFilter) return;

    if (kaizenNavigationFilter.category === 'FA') setActiveTab('fa');
    else if (kaizenNavigationFilter.category === 'OPL') setActiveTab('opl');
    else if (kaizenNavigationFilter.category === 'WHY_WHY') setActiveTab('why_why');
    else if (kaizenNavigationFilter.category === 'MP_INFO') setActiveTab('mp_info');
    else if (kaizenNavigationFilter.category === 'KAIZEN') setActiveTab('kaizen');

    if (kaizenNavigationFilter.machineId) {
      setFilterMachine(kaizenNavigationFilter.machineId);
    }
    if (kaizenNavigationFilter.searchQuery) {
      setSearchTerm(kaizenNavigationFilter.searchQuery);
    }
    if (kaizenNavigationFilter.projectId) {
      const found = improvements.find(i => i.id === kaizenNavigationFilter.projectId)
        || linkedBreakdownWhyProjects.find(i => i.id === kaizenNavigationFilter.projectId);
      if (found) {
        setSelectedProject(found);
      }
    } else if (kaizenNavigationFilter.sourceRepairId) {
      const found = improvements.find(i => i.id === `why-breakdown-${kaizenNavigationFilter.sourceRepairId}` || i.id === `imp-${kaizenNavigationFilter.sourceRepairId}` || i.description?.includes(kaizenNavigationFilter.sourceRepairId))
        || linkedBreakdownWhyProjects.find(i => i.id === `why-breakdown-${kaizenNavigationFilter.sourceRepairId}`);
      if (found) {
        setSelectedProject(found);
      }
    }

    // Clear filter immediately after applying so subsequent edits/uploads don't reset state
    clearKaizenNavigationFilter();
  }, [kaizenNavigationFilter, improvements, linkedBreakdownWhyProjects, clearKaizenNavigationFilter]);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ImprovementProject | null>(null);
  const [selectedProject, setSelectedProject] = useState<ImprovementProject | null>(null);
  const [activePDF, setActivePDF] = useState<PDFFileAttachment | null>(null);
  const [activePhoto, setActivePhoto] = useState<{
    url: string;
    title?: string;
    subtitle?: string;
    badge?: string;
  } | null>(null);

  // Category mapping
  const activeCategoryForCreate: KaizenCategory = useMemo(() => {
    if (activeTab === 'opl') return 'OPL';
    if (activeTab === 'fa') return 'FA';
    if (activeTab === 'why_why') return 'WHY_WHY';
    if (activeTab === 'mp_info') return 'MP_INFO';
    return 'KAIZEN';
  }, [activeTab]);

  // Filtered Improvements
  const filteredImprovements = useMemo(() => {
    return improvements.filter(item => {
      // Technician filter
      if (filterTechnician !== 'all') {
        const hasTech = item.technician === filterTechnician || item.technicians?.includes(filterTechnician);
        if (!hasTech) return false;
      }
      // Machine filter
      if (filterMachine !== 'all' && item.machineId !== filterMachine) {
        return false;
      }
      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(query);
        const matchDesc = item.description?.toLowerCase().includes(query);
        const matchMachine = item.machineId?.toLowerCase().includes(query);
        const matchTech = item.technician?.toLowerCase().includes(query);
        const matchPart = item.faData?.failurePartName?.toLowerCase().includes(query);
        const matchSop = item.oplData?.sopDocumentRef?.toLowerCase().includes(query);
        const matchWhy = item.whyWhyData?.problemStatement?.toLowerCase().includes(query) || item.whyWhyData?.rootCauseSummary?.toLowerCase().includes(query);
        const matchMp = item.mpData?.issueDescription?.toLowerCase().includes(query) || item.mpData?.proposedDesignChange?.toLowerCase().includes(query) || item.mpData?.mpCategory?.toLowerCase().includes(query);
        const matchFile = item.pdfFiles?.some(f => f.name.toLowerCase().includes(query));

        if (!matchTitle && !matchDesc && !matchMachine && !matchTech && !matchPart && !matchSop && !matchWhy && !matchMp && !matchFile) {
          return false;
        }
      }
      return true;
    });
  }, [improvements, filterTechnician, filterMachine, searchTerm]);

  // Filter linked breakdown Why-Why projects
  const filteredLinkedBreakdownWhy = useMemo(() => {
    return linkedBreakdownWhyProjects.filter(item => {
      if (filterTechnician !== 'all') {
        const hasTech = item.technician === filterTechnician || item.technicians?.includes(filterTechnician);
        if (!hasTech) return false;
      }
      if (filterMachine !== 'all' && item.machineId !== filterMachine) {
        return false;
      }
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(query);
        const matchDesc = item.description?.toLowerCase().includes(query);
        const matchMachine = item.machineId?.toLowerCase().includes(query);
        const matchTech = item.technician?.toLowerCase().includes(query);
        const matchWhy = item.whyWhyData?.problemStatement?.toLowerCase().includes(query) || item.whyWhyData?.rootCauseSummary?.toLowerCase().includes(query);
        const matchFile = item.pdfFiles?.some(f => f.name.toLowerCase().includes(query));
        if (!matchTitle && !matchDesc && !matchMachine && !matchTech && !matchWhy && !matchFile) {
          return false;
        }
      }
      return true;
    });
  }, [linkedBreakdownWhyProjects, filterTechnician, filterMachine, searchTerm]);

  // Separate by Category
  const kaizenProjects = useMemo(() => {
    return filteredImprovements.filter(i => !i.category || i.category === 'KAIZEN');
  }, [filteredImprovements]);

  const oplProjects = useMemo(() => {
    return filteredImprovements.filter(i => i.category === 'OPL');
  }, [filteredImprovements]);

  const faProjects = useMemo(() => {
    return filteredImprovements.filter(i => i.category === 'FA');
  }, [filteredImprovements]);

  const whyWhyProjects = useMemo(() => {
    return [
      ...filteredImprovements.filter(i => i.category === 'WHY_WHY'),
      ...filteredLinkedBreakdownWhy
    ];
  }, [filteredImprovements, filteredLinkedBreakdownWhy]);

  const mpProjects = useMemo(() => {
    return filteredImprovements.filter(i => i.category === 'MP_INFO');
  }, [filteredImprovements]);

  // Current projects list according to active tab
  const currentTabProjects = useMemo<ImprovementProject[]>(() => {
    if (activeTab === 'why_why') return whyWhyProjects;
    if (activeTab === 'fa') return faProjects;
    if (activeTab === 'opl') return oplProjects;
    if (activeTab === 'kaizen') return kaizenProjects;
    if (activeTab === 'mp_info') return mpProjects;
    return filteredImprovements;
  }, [activeTab, whyWhyProjects, faProjects, oplProjects, kaizenProjects, mpProjects, filteredImprovements]);

  // Multi-Selection and Bulk Deletion System (ระบบการลบแบบเลือกทั้งหมด เลือกทีละตัวงานได้)
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState<boolean>(false);

  const handleSelectAllTabProjects = () => {
    if (currentTabProjects.length === 0) return;
    const allSelected = currentTabProjects.every(p => selectedProjectIds.has(p.id));
    const next = new Set(selectedProjectIds);
    if (allSelected) {
      currentTabProjects.forEach(p => next.delete(p.id));
    } else {
      currentTabProjects.forEach(p => next.add(p.id));
    }
    setSelectedProjectIds(next);
  };

  const handleClearProjectSelection = () => {
    setSelectedProjectIds(new Set());
  };

  const handleConfirmBulkDeleteProjects = () => {
    if (selectedProjectIds.size === 0) return;
    setImprovements(prev => prev.filter(p => !selectedProjectIds.has(p.id) && !selectedProjectIds.has(`why-breakdown-${p.id}`)));
    setSelectedProjectIds(new Set());
    setIsBulkDeleteModalOpen(false);
  };

  // Handlers for Save (Create & Edit)
  const handleSaveProject = (projData: Partial<ImprovementProject>) => {
    if (editingProject) {
      // Update existing
      const rawUpdated = {
        ...editingProject,
        ...projData,
        id: editingProject.id
      };
      // Clean undefined values
      const updated = Object.fromEntries(
        Object.entries(rawUpdated).filter(([_, v]) => v !== undefined)
      ) as unknown as ImprovementProject;

      setImprovements(prev => prev.map(p => p.id === editingProject.id ? updated : p));
      setEditingProject(null);
      if (selectedProject?.id === editingProject.id) {
        setSelectedProject(updated);
      }
    } else {
      // Create new
      const newId = projData.category === 'OPL' 
        ? `opl-${Date.now()}` 
        : projData.category === 'FA'
        ? `fa-${Date.now()}`
        : projData.category === 'WHY_WHY'
        ? `why-${Date.now()}`
        : projData.category === 'MP_INFO'
        ? `mp-${Date.now()}`
        : `imp-${Date.now()}`;

      const newProj: ImprovementProject = {
        id: newId,
        type: 'Improvement',
        category: projData.category || 'KAIZEN',
        title: projData.title || 'งานพัฒนาใหม่',
        description: projData.description || '',
        startDate: projData.startDate || new Date().toISOString().split('T')[0],
        plannedEndDate: projData.plannedEndDate || new Date().toISOString().split('T')[0],
        technician: projData.technician || technicians[0] || 'ช่างอุ้ย',
        technicians: projData.technicians || [projData.technician || (technicians[0] || 'ช่างอุ้ย')],
        status: projData.status || 'กำลังดำเนินการ',
        pdfFiles: projData.pdfFiles || [],
        photos: projData.photos || [],
        workLogs: [
          {
            id: `wl-${Date.now()}`,
            date: projData.startDate || new Date().toISOString().split('T')[0],
            hours: 2,
            note: 'เริ่มต้นบันทึกและจัดทำเอกสาร'
          }
        ],
        ...(projData.machineId ? { machineId: projData.machineId } : {}),
        ...(projData.photoBefore ? { photoBefore: projData.photoBefore } : {}),
        ...(projData.photoAfter ? { photoAfter: projData.photoAfter } : {}),
        ...(projData.oplData ? { oplData: projData.oplData } : {}),
        ...(projData.faData ? { faData: projData.faData } : {}),
        ...(projData.whyWhyData ? { whyWhyData: projData.whyWhyData } : {}),
        ...(projData.mpData ? { mpData: projData.mpData } : {})
      };

      setImprovements(prev => [newProj, ...prev]);
    }
  };

  const handleDeleteProject = (id: string) => {
    if (confirm('คุณแน่ใจว่าต้องการลบรายการนี้ใช่หรือไม่?')) {
      setImprovements(prev => prev.filter(p => p.id !== id));
      if (selectedProject?.id === id) {
        setSelectedProject(null);
      }
    }
  };

  const handleUpdateSelectedProject = (updated: ImprovementProject) => {
    setImprovements(prev => {
      const exists = prev.some(p => p.id === updated.id);
      if (exists) {
        return prev.map(p => p.id === updated.id ? updated : p);
      }
      return [updated, ...prev];
    });
    setSelectedProject(updated);

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

  const handleUpdateProject = (updated: ImprovementProject) => {
    setImprovements(prev => {
      const exists = prev.some(p => p.id === updated.id);
      if (exists) {
        return prev.map(p => p.id === updated.id ? updated : p);
      }
      return [updated, ...prev];
    });
    if (selectedProject?.id === updated.id) {
      setSelectedProject(updated);
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

  const handleEditProject = (proj: ImprovementProject) => {
    setSelectedProject(null);
    setEditingProject(proj);
    setIsCreateModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Kaizen Navigation from Repair Filter Banner */}
      {kaizenNavigationFilter && (
        <div 
          id="banner-kaizen-navigation-linked"
          className="bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 border-2 border-cyan-500/70 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xl animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <span>📍 กำลังแสดงผลงานเชื่อมโยงจากประวัติงานซ่อมเบรกดาวน์</span>
                {kaizenNavigationFilter.machineId && (
                  <span className="font-mono text-cyan-300 bg-slate-900 px-2 py-0.5 rounded-md border border-cyan-500/30 text-xs">
                    [{kaizenNavigationFilter.machineId}]
                  </span>
                )}
                {kaizenNavigationFilter.category && (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-500/40 text-xs font-bold">
                    {kaizenNavigationFilter.category}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                เปิดตรงจากหน้าประวัติงานซ่อมเบรกดาวน์เพื่อตรวจสอบเอกสาร FA, OPL หรือผลงาน Kaizen
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              clearKaizenNavigationFilter();
              setFilterMachine('all');
              setSearchTerm('');
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition cursor-pointer shrink-0 self-end sm:self-auto"
          >
            ✕ ล้างตัวกรองและดูทั้งหมด
          </button>
        </div>
      )}
      
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-sm">
              <Sparkles size={14} />
              ENGINEERING & KAIZEN SUITE
            </span>
            <span className="text-xs text-slate-400">ระบบบริหารงานพัฒนา Kaizen, OPL, FA และ Why-Why ประจำโรงงาน</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide">
            งานพัฒนา Kaizen & คลังความรู้วิศวกรรม
          </h1>
          <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
            ศูนย์รวมผลงาน Kaizen หน้างาน, เอกสารบทเรียนจุดเดียว (One Point Lesson), รายงานวิเคราะห์ชิ้นส่วนชำรุด (Failure Analysis) และการสืบค้นรากเหง้า (Why-Why Analysis) พร้อมแนบไฟล์ Excel (.xlsx, .xls), PDF และภาพถ่ายประกอบ
          </p>
        </div>

        {/* Global Create Button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              setEditingProject(null);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-xl hover:shadow-cyan-500/20 transition-all active:scale-95"
          >
            <Plus size={16} />
            สร้างงานพัฒนาใหม่
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-slate-900/90 border border-slate-800 p-2 rounded-2xl shadow-lg">
        
        {/* Navigation Tabs */}
        {/* Navigation Tabs (Why-Why ตามด้วยแถบ FA, OPL, Kaizen, MP) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 sm:pb-1 scrollbar-thin scrollbar-thumb-cyan-500/50 scrollbar-track-slate-900 scroll-smooth">
          
          {/* 1. แถบ Why-Why Analysis */}
          <button
            id="tab-kaizen-why-why"
            onClick={() => setActiveTab('why_why')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'why_why'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <HelpCircle size={15} />
            <span>Why-Why Analysis</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
              activeTab === 'why_why' ? 'bg-purple-800 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {whyWhyProjects.length}
            </span>
          </button>

          {/* 2. แถบ FA ต่อจาก why why */}
          <button
            id="tab-kaizen-fa"
            onClick={() => setActiveTab('fa')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'fa'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <SearchIcon size={15} />
            <span>Failure Analysis (FA)</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
              activeTab === 'fa' ? 'bg-rose-800 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {faProjects.length}
            </span>
          </button>

          {/* 3. แถบ OPL ต่อจาก why why */}
          <button
            id="tab-kaizen-opl"
            onClick={() => setActiveTab('opl')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'opl'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BookOpen size={15} />
            <span>One Point Lesson (OPL)</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
              activeTab === 'opl' ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {oplProjects.length}
            </span>
          </button>

          {/* 4. แถบ Kaizen ต่อจาก why why */}
          <button
            id="tab-kaizen-kaizen"
            onClick={() => setActiveTab('kaizen')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'kaizen'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Wrench size={15} />
            <span>โครงการ Kaizen</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
              activeTab === 'kaizen' ? 'bg-cyan-700 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {kaizenProjects.length}
            </span>
          </button>

          {/* 5. แถบ MP ต่อจาก why why */}
          <button
            id="tab-kaizen-mp"
            onClick={() => setActiveTab('mp_info')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'mp_info'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileCheck size={15} />
            <span>MP Information sheet</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
              activeTab === 'mp_info' ? 'bg-emerald-800 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {mpProjects.length}
            </span>
          </button>

          {/* 6. แถบ Overview */}
          <button
            id="tab-kaizen-overview"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BarChart3 size={15} />
            <span>ภาพรวม & สถิติ</span>
          </button>

        </div>

      </div>

      {/* BULK ACTION & SELECTION TOOLBAR (ระบบการลบแบบเลือกทั้งหมด เลือกทีละตัวงานได้) */}
      {activeTab !== 'overview' && (
        <div 
          id="kaizen-bulk-action-bar"
          className={`p-3.5 sm:p-4 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3 border transition-all ${
            selectedProjectIds.size > 0
              ? 'bg-gradient-to-r from-slate-900 via-rose-950/70 to-slate-900 text-white border-rose-500/50 shadow-rose-950/30'
              : 'bg-slate-900/90 text-slate-300 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
              selectedProjectIds.size > 0 
                ? 'bg-rose-500/20 border-rose-400/40 text-rose-300' 
                : 'bg-slate-800/80 border-slate-750 text-slate-400'
            }`}>
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold flex items-center gap-2">
                {selectedProjectIds.size > 0 ? (
                  <>
                    <span className="text-white">เลือกรายการงานปรับปรุงอยู่:</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-slate-950 font-black font-mono text-xs">
                      {selectedProjectIds.size} รายการ
                    </span>
                    <span className="text-slate-400 text-xs font-normal hidden sm:inline">
                      (จากในหมวดนี้ {currentTabProjects.length} รายการ / ทั้งหมด {improvements.length} รายการ)
                    </span>
                  </>
                ) : (
                  <>
                    <span>ระบบจัดการและลบรายการ (เลือกทั้งหมด / เลือกทีละตัวงาน)</span>
                    <span className="text-slate-400 text-xs font-normal hidden sm:inline">
                      (มี {currentTabProjects.length} รายการในหมวดหมู่นี้)
                    </span>
                  </>
                )}
              </div>
              <div className="text-[11px] text-slate-400">
                {selectedProjectIds.size > 0
                  ? 'สามารถกดเลือกลบรายการที่เลือกทั้งหมดพร้อมกัน หรือยกเลิกการเลือกได้ทันที'
                  : 'สามารถกดปุ่มเพื่อเลือกทั้งหมดในหมวดหมู่นี้ หรือลบทีละตัวงานได้จากปุ่มถังขยะบนการ์ดแต่ละใบ'}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="btn-kaizen-select-all"
              onClick={handleSelectAllTabProjects}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition border cursor-pointer ${
                currentTabProjects.length > 0 && currentTabProjects.every(p => selectedProjectIds.has(p.id))
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              {currentTabProjects.length > 0 && currentTabProjects.every(p => selectedProjectIds.has(p.id))
                ? '✓ ยกเลิกเลือกทั้งหมดในหมวดนี้'
                : `☑ เลือกทั้งหมดในหมวดนี้ (${currentTabProjects.length})`}
            </button>

            {selectedProjectIds.size > 0 && (
              <button
                type="button"
                id="btn-kaizen-clear-selection"
                onClick={handleClearProjectSelection}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition border border-slate-700 cursor-pointer"
              >
                ล้างการเลือก
              </button>
            )}

            {selectedProjectIds.size > 0 ? (
              <button
                type="button"
                id="btn-bulk-delete-kaizen"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-rose-600/30 cursor-pointer animate-pulse"
                title="ลบรายการที่เลือกทั้งหมด"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ลบรายการที่เลือก ({selectedProjectIds.size})</span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="px-4 py-1.5 bg-slate-800/60 text-slate-500 text-xs font-semibold rounded-xl border border-slate-750 flex items-center gap-1.5 cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ลบรายการที่เลือก (0)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter and Search Bar (shown on list tabs) */}
      {activeTab !== 'overview' && (
        <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
          
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <SearchIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาหัวข้อ, เครื่องจักร, ช่าง, เอกสาร SOP, ปัญหา..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Machine Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-semibold hidden md:inline">เครื่องจักร:</span>
            <select
              value={filterMachine}
              onChange={(e) => setFilterMachine(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">ทุกเครื่องจักร</option>
              {machines.map(m => (
                <option key={m.id} value={m.id}>{m.id} - {m.name}</option>
              ))}
            </select>
          </div>

          {/* Technician Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-semibold hidden md:inline">ช่าง:</span>
            <select
              value={filterTechnician}
              onChange={(e) => setFilterTechnician(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">ช่างทุกคน</option>
              {technicians.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {(searchTerm || filterMachine !== 'all' || filterTechnician !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterMachine('all');
                setFilterTechnician('all');
              }}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2 py-1"
            >
              ล้างตัวกรอง
            </button>
          )}

        </div>
      )}

      {/* Main View Area Switcher */}
      <div>
        {activeTab === 'kaizen' && (
          <KaizenKanbanView
            projects={kaizenProjects}
            machines={machines}
            onSelectProject={(proj) => setSelectedProject(proj)}
            onOpenPDF={(pdf) => setActivePDF(pdf)}
            onOpenPhoto={(photo) => setActivePhoto(photo)}
            onOpenCreateModal={() => {
              setEditingProject(null);
              setIsCreateModalOpen(true);
            }}
            onEditProject={handleEditProject}
          />
        )}

        {activeTab === 'opl' && (
          <OPLView
            oplList={oplProjects}
            machines={machines}
            onSelectProject={(proj) => setSelectedProject(proj)}
            onOpenPDF={(pdf) => setActivePDF(pdf)}
            onOpenPhoto={(photo) => setActivePhoto(photo)}
            onOpenCreateModal={() => {
              setEditingProject(null);
              setIsCreateModalOpen(true);
            }}
            onDeleteProject={handleDeleteProject}
            onEditProject={handleEditProject}
            onUpdateProject={handleUpdateProject}
          />
        )}

        {activeTab === 'fa' && (
          <FailureAnalysisView
            faList={faProjects}
            machines={machines}
            onSelectProject={(proj) => setSelectedProject(proj)}
            onOpenPDF={(pdf) => setActivePDF(pdf)}
            onOpenPhoto={(photo) => setActivePhoto(photo)}
            onOpenCreateModal={() => {
              setEditingProject(null);
              setIsCreateModalOpen(true);
            }}
            onDeleteProject={handleDeleteProject}
            onEditProject={handleEditProject}
            onUpdateProject={handleUpdateProject}
          />
        )}

        {activeTab === 'why_why' && (
          <WhyWhyAnalysisView
            whyList={whyWhyProjects}
            machines={machines}
            onSelectProject={(proj) => setSelectedProject(proj)}
            onOpenPDF={(pdf) => setActivePDF(pdf)}
            onOpenPhoto={(photo) => setActivePhoto(photo)}
            onOpenCreateModal={() => {
              setEditingProject(null);
              setIsCreateModalOpen(true);
            }}
            onDeleteProject={handleDeleteProject}
            onEditProject={handleEditProject}
            onUpdateProject={handleUpdateProject}
          />
        )}

        {activeTab === 'mp_info' && (
          <MPInformationView
            mpList={mpProjects}
            machines={machines}
            onSelectProject={(proj) => setSelectedProject(proj)}
            onOpenPDF={(pdf) => setActivePDF(pdf)}
            onOpenPhoto={(photo) => setActivePhoto(photo)}
            onOpenCreateModal={() => {
              setEditingProject(null);
              setIsCreateModalOpen(true);
            }}
            onDeleteProject={handleDeleteProject}
            onEditProject={handleEditProject}
            onUpdateProject={handleUpdateProject}
          />
        )}

        {activeTab === 'overview' && (
          <KaizenOverviewView
            improvements={filteredImprovements}
            machines={machines}
            technicians={technicians}
            onOpenPDF={(pdf) => setActivePDF(pdf)}
            onOpenPhoto={(photo) => setActivePhoto(photo)}
            onSwitchTab={(tab) => setActiveTab(tab)}
          />
        )}
      </div>

      {/* Create / Edit Modal */}
      <CreateEditKaizenModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
        machines={machines}
        technicians={technicians}
        initialProject={editingProject}
        defaultCategory={activeCategoryForCreate}
      />

      {/* Kaizen & Project Details Modal */}
      <KaizenDetailModal
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
        onUpdate={handleUpdateSelectedProject}
        onEdit={(proj) => {
          setSelectedProject(null);
          setEditingProject(proj);
          setIsCreateModalOpen(true);
        }}
        onDelete={handleDeleteProject}
        machines={machines}
        onOpenPDF={(pdf) => setActivePDF(pdf)}
        onOpenPhoto={(photo) => setActivePhoto(photo)}
      />

      {/* PDF Viewer & Download Modal */}
      <PDFViewerModal
        pdf={activePDF}
        onClose={() => setActivePDF(null)}
      />

      {/* Photo Lightbox Modal */}
      <PhotoLightboxModal
        photo={activePhoto}
        onClose={() => setActivePhoto(null)}
      />

      {/* Bulk Delete Confirmation Modal (ระบบการลบแบบเลือกทั้งหมด) */}
      {isBulkDeleteModalOpen && selectedProjectIds.size > 0 && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0b1325] border border-rose-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 shrink-0">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  ยืนยันการลบรายการปรับปรุงแบบกลุ่ม (Bulk Delete)?
                </h3>
                <p className="text-xs text-rose-300 font-semibold">
                  ลบทั้งหมด {selectedProjectIds.size} รายการที่เลือก
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 text-xs space-y-2 max-h-56 overflow-y-auto">
              <span className="text-slate-400 block text-[11px] font-bold">รายการที่จะถูกลบ:</span>
              <div className="space-y-1.5 divide-y divide-slate-800">
                {improvements
                  .filter(p => selectedProjectIds.has(p.id))
                  .map(p => (
                    <div key={p.id} className="pt-1.5 flex items-center justify-between text-slate-300 text-[11px]">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 font-mono text-[9px]">{p.machineId || 'ALL'}</span>
                        <span className="truncate">{p.title}</span>
                      </div>
                      <span className="text-slate-500 text-[10px] shrink-0">{p.category || 'KAIZEN'}</span>
                    </div>
                  ))}
              </div>
            </div>

            <p className="text-xs text-rose-400/90 leading-relaxed bg-rose-950/20 p-2.5 rounded-xl border border-rose-900/30">
              ⚠️ การลบนี้จะมีผลถาวร รายการที่เลือกทั้งหมดจะถูกลบออกจากระบบทันที
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                id="btn-confirm-bulk-delete-kaizen"
                onClick={handleConfirmBulkDeleteProjects}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-950/50 transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>ยืนยันลบทั้งหมด {selectedProjectIds.size} รายการ</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
