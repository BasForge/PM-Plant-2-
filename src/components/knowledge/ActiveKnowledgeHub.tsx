import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { KnowledgeItem, KnowledgeType } from '../../types/knowledge';
import { 
  BookOpen, FileText, Wrench, Sparkles, Search, Filter, 
  Plus, Eye, Download, CheckCircle2, AlertTriangle, ShieldCheck, 
  Zap, Layers, ChevronRight, X, ExternalLink, Calendar, 
  User, Tag, Clock, HelpCircle, Flame, ArrowUpRight, Copy, Check,
  BookMarked, HelpCircle as QuestionIcon, ShieldAlert, FileSpreadsheet
} from 'lucide-react';
import { PDFViewerModal } from '../kaizen/PDFViewerModal';

export const ActiveKnowledgeHub: React.FC = () => {
  const { 
    knowledgeItems, 
    addKnowledgeItem, 
    deleteKnowledgeItem, 
    updateKnowledgeItem,
    machines, 
    currentUser, 
    canEdit, 
    canDelete,
    improvements,
    repairs,
    setActivePage
  } = useApp();

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTypeTab, setActiveTypeTab] = useState<'ALL' | KnowledgeType>('ALL');
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

  // Aggregate Knowledge Items (Preloaded + dynamic from why-why improvements)
  const combinedItems = useMemo(() => {
    const list: KnowledgeItem[] = [...knowledgeItems];

    // Also pull why-why cases from improvements that might not be in knowledgeItems yet
    improvements
      .filter(imp => imp.category === 'WHY_WHY' && imp.whyWhyData)
      .forEach(imp => {
        if (!list.some(k => k.id === `imp-why-${imp.id}`)) {
          const mach = machines.find(m => m.id === imp.machineId);
          list.push({
            id: `imp-why-${imp.id}`,
            type: 'WHY_WHY',
            title: imp.title,
            machineId: imp.machineId || 'N/A',
            machineName: mach?.name || imp.machineId || 'เครื่องจักรโรงงาน',
            lineGroup: mach?.lineGroup || 'ฝ่ายผลิต',
            tags: ['Why-Why', 'Kaizen', 'Root Cause'],
            author: imp.technician || 'วิศวกรซ่อมบำรุง',
            createdAt: imp.startDate || '2026-06-01',
            updatedAt: imp.plannedEndDate || '2026-06-01',
            isVerified: true,
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

    return list;
  }, [knowledgeItems, improvements, machines]);

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

  // Statistics
  const stats = useMemo(() => {
    const total = combinedItems.length;
    const manualCount = combinedItems.filter(k => k.type === 'MANUAL').length;
    const wiCount = combinedItems.filter(k => k.type === 'WI').length;
    const tbCount = combinedItems.filter(k => k.type === 'TROUBLESHOOTING').length;
    const whyCount = combinedItems.filter(k => k.type === 'WHY_WHY').length;
    return { total, manualCount, wiCount, tbCount, whyCount };
  }, [combinedItems]);

  const handleCopyLink = (item: KnowledgeItem) => {
    navigator.clipboard?.writeText?.(`${window.location.origin}/knowledge/${item.id}`);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
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
        fileName: manualFileName,
        fileType: 'pdf',
        fileContent: 'sample_pdf',
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
    setTbSymptom('');
    setTbCause1('');
    setTbSolution1('');
    setWhyProblem('');
    setWhy1('');
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

      {/* 3. KNOWLEDGE CARDS GRID */}
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
                        : 'bg-purple-950 text-purple-300 border-purple-800/60'
                    }`}>
                      {isManual && <BookMarked size={11} />}
                      {isWI && <CheckCircle2 size={11} />}
                      {isTB && <Zap size={11} />}
                      {isWhy && <Sparkles size={11} />}
                      <span>{isManual ? 'MANUAL' : isWI ? 'WI / SOP' : isTB ? 'TROUBLESHOOT' : 'WHY-WHY'}</span>
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
                      onClick={() => setSelectedItemForView(item)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-1 transition cursor-pointer text-xs shadow-md"
                    >
                      <Eye size={13} className="text-cyan-400" />
                      <span>เปิดอ่านคู่มือ</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

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
                          content: 'sample_pdf',
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
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleCopyLink(selectedItemForView)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedId === selectedItemForView.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copiedId === selectedItemForView.id ? 'คัดลอกลิงก์แล้ว' : 'คัดลอกลิงก์อ้างอิง'}</span>
              </button>

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
                    onClick={() => setNewType('WHY_WHY')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition cursor-pointer ${
                      newType === 'WHY_WHY' ? 'bg-purple-600 text-white border-purple-400' : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    🧠 Why-Why
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
                      </select>
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
