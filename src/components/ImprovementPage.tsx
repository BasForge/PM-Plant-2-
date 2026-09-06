import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ImprovementProject, KaizenCategory, PDFFileAttachment } from '../types';
import { 
  Wrench, BookOpen, Search as SearchIcon, HelpCircle, Plus, 
  BarChart3, Filter, FileText, Image as ImageIcon, Sparkles, Layers 
} from 'lucide-react';
import { KaizenKanbanView } from './kaizen/KaizenKanbanView';
import { OPLView } from './kaizen/OPLView';
import { FailureAnalysisView } from './kaizen/FailureAnalysisView';
import { WhyWhyAnalysisView } from './kaizen/WhyWhyAnalysisView';
import { KaizenOverviewView } from './kaizen/KaizenOverviewView';
import { CreateEditKaizenModal } from './kaizen/CreateEditKaizenModal';
import { KaizenDetailModal } from './kaizen/KaizenDetailModal';
import { PDFViewerModal } from './kaizen/PDFViewerModal';
import { PhotoLightboxModal } from './kaizen/PhotoLightboxModal';

type ActiveTab = 'kaizen' | 'opl' | 'fa' | 'why_why' | 'overview';

export const ImprovementPage: React.FC = () => {
  const { improvements, setImprovements, machines, technicians } = useApp();

  // Active Tab Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('kaizen');

  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTechnician, setFilterTechnician] = useState<string>('all');
  const [filterMachine, setFilterMachine] = useState<string>('all');

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
        const matchWhy = item.whyWhyData?.problemStatement?.toLowerCase().includes(query);

        if (!matchTitle && !matchDesc && !matchMachine && !matchTech && !matchPart && !matchSop && !matchWhy) {
          return false;
        }
      }
      return true;
    });
  }, [improvements, filterTechnician, filterMachine, searchTerm]);

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
    return filteredImprovements.filter(i => i.category === 'WHY_WHY');
  }, [filteredImprovements]);

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
        : `imp-${Date.now()}`;

      const newProj: ImprovementProject = {
        id: newId,
        type: 'Improvement',
        category: projData.category || 'KAIZEN',
        title: projData.title || 'งานพัฒนาใหม่',
        description: projData.description || '',
        startDate: projData.startDate || new Date().toISOString().split('T')[0],
        plannedEndDate: projData.plannedEndDate || new Date().toISOString().split('T')[0],
        technician: projData.technician || technicians[0] || 'ช่าง 1',
        technicians: projData.technicians || [projData.technician || 'ช่าง 1'],
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
        ...(projData.whyWhyData ? { whyWhyData: projData.whyWhyData } : {})
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
    setImprovements(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelectedProject(updated);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
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
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          
          <button
            onClick={() => setActiveTab('kaizen')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
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

          <button
            onClick={() => setActiveTab('opl')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'opl'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BookOpen size={15} />
            <span>One Point Lesson (OPL)</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
              activeTab === 'opl' ? 'bg-blue-800 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {oplProjects.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('fa')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
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

          <button
            onClick={() => setActiveTab('why_why')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'why_why'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <HelpCircle size={15} />
            <span>Why-Why Analysis</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
              activeTab === 'why_why' ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {whyWhyProjects.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
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

    </div>
  );
};
