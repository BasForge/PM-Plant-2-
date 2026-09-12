import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PMPlan, PMFrequency, PMStep } from '../types';
import { 
  Search, Plus, Trash2, Edit3, CheckCircle, PackageOpen, LayoutGrid, 
  Clock, ClipboardList, Copy, Upload, Download, Check, AlertTriangle, 
  HelpCircle, Sparkles, FileSpreadsheet, ArrowLeftRight, CalendarRange
} from 'lucide-react';
import { TBMPlanSchedulePage } from './TBMPlanSchedulePage';

export const PMPlanPage: React.FC = () => {
  const { machines, pmPlans, setPmPlans, canEdit, canDelete } = useApp();
  const [pmPlanViewTab, setPmPlanViewTab] = useState<'list' | 'tbm'>('list');
  
  // Selected machine filter
  const [selectedMachineId, setSelectedMachineId] = useState<string>(machines[0]?.id || '');
  const [machineSearch, setMachineSearch] = useState('');

  // Copy plans from another machine states
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySourceMachineId, setCopySourceMachineId] = useState('');
  const [selectedPlansToCopy, setSelectedPlansToCopy] = useState<string[]>([]);

  // Excel/CSV Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importSelectedMachineOnly, setImportSelectedMachineOnly] = useState(true);
  const [importError, setImportError] = useState('');
  
  // Searchable machine selection
  const filteredMachines = machines.filter(m => 
    m.id.toLowerCase().includes(machineSearch.toLowerCase()) ||
    m.name.toLowerCase().includes(machineSearch.toLowerCase())
  );

  // Plans of the selected machine
  const activeMachinePlans = pmPlans.filter(p => p.machineId === selectedMachineId);

  // 1. Cross-Machine Copy logic
  const sourceMachinePlans = pmPlans.filter(p => p.machineId === copySourceMachineId);

  const handleToggleSelectPlanToCopy = (planId: string) => {
    setSelectedPlansToCopy(prev => 
      prev.includes(planId) ? prev.filter(id => id !== planId) : [...prev, planId]
    );
  };

  const handleSelectAllSourcePlans = () => {
    if (selectedPlansToCopy.length === sourceMachinePlans.length) {
      setSelectedPlansToCopy([]);
    } else {
      setSelectedPlansToCopy(sourceMachinePlans.map(p => p.id));
    }
  };

  const handleExecuteCopy = () => {
    if (!selectedMachineId) {
      alert("กรุณาเลือกเครื่องจักรเป้าหมายด้านซ้ายมือ");
      return;
    }
    if (!copySourceMachineId) {
      alert("กรุณาเลือกเครื่องจักรต้นทาง");
      return;
    }
    if (selectedPlansToCopy.length === 0) {
      alert("กรุณาเลือกแผนบำรุงรักษาอย่างน้อย 1 รายการเพื่อคัดลอก");
      return;
    }

    const plansToClone = pmPlans.filter(p => selectedPlansToCopy.includes(p.id));
    const newlyCloned: PMPlan[] = plansToClone.map(p => ({
      ...p,
      id: `plan-pm-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      machineId: selectedMachineId,
      steps: p.steps.map(s => ({ ...s }))
    }));

    setPmPlans(prev => [...prev, ...newlyCloned]);
    setShowCopyModal(false);
    setSelectedPlansToCopy([]);
    setCopySourceMachineId('');
    alert(`คัดลอกสำเร็จ! สั่งคัดลอกแผนงาน PM จำนวน ${newlyCloned.length} รายการ จากเครื่อง ${copySourceMachineId} เข้าสู่เครื่อง ${selectedMachineId} เรียบร้อยแล้ว`);
  };

  // 2. Excel/CSV Custom Import logic
  const parseTSVOrCSV = (text: string): { machineId: string; title: string; frequency: PMFrequency; spareParts: string; steps: PMStep[]; ttm: number; error?: string }[] => {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    const parsed: any[] = [];

    lines.forEach((line, index) => {
      // Split by Tab (Excel copy-paste) first, then falls back to comma
      let cols: string[] = [];
      if (line.includes('\t')) {
        cols = line.split('\t').map(c => c.trim());
      } else {
        // Very basic CSV splitting supporting potential simple double quoted fields
        cols = line.split(',').map(s => {
          let str = s.trim();
          if (str.startsWith('"') && str.endsWith('"')) {
            str = str.substring(1, str.length - 1).replace(/""/g, '"');
          }
          return str;
        });
      }

      if (cols.length < 2) return; // Skip too short lines

      // Skip header row if matches key titles
      const col0L = cols[0].toLowerCase();
      const col1L = cols[1].toLowerCase();
      if (
        col0L.includes('machine') || col0L.includes('เครื่องจักร') ||
        col1L.includes('title') || col1L.includes('หัวข้องาน') || col1L.includes('หัวข้อม')
      ) {
        return; // Skip headers
      }

      let machId = cols[0] ? cols[0] : '';
      let title = cols[1] ? cols[1] : '';
      let freqStr = cols[2] ? cols[2] : 'รายสัปดาห์';
      let spare = cols[3] ? cols[3] : '';
      let stepsStr = cols[4] ? cols[4] : '';

      // Fallback machine rules
      if (importSelectedMachineOnly || !machId) {
        machId = selectedMachineId;
      } else {
        // Validate machine
        const exist = machines.some(m => m.id.toUpperCase() === machId.toUpperCase());
        if (exist) {
          const matched = machines.find(m => m.id.toUpperCase() === machId.toUpperCase());
          if (matched) machId = matched.id;
        } else {
          // If machine does not exist, fallback to selectedMachineId but flag it
          machId = selectedMachineId;
        }
      }

      if (!title) {
        parsed.push({
          machineId: machId,
          title: `แถวที่ ${index + 1} ไม่มีระบุชื่อ`,
          frequency: 'รายสัปดาห์',
          spareParts: spare,
          steps: [],
          ttm: 0,
          error: 'กรุณากรอกชื่อตัวแผนบำรุงรักษาเชิงป้องกัน'
        });
        return;
      }

      // Match frequency strings representation
      let freq: PMFrequency = 'รายสัปดาห์';
      const freqNorm = freqStr.toLowerCase();
      if (freqNorm.includes('วัน') || freqNorm.includes('daily') || freqNorm.includes('day')) {
        freq = 'รายวัน';
      } else if (freqNorm.includes('สัปดาห์') || freqNorm.includes('weekly') || freqNorm.includes('week')) {
        freq = 'รายสัปดาห์';
      } else if (freqNorm.includes('เดือน') || freqNorm.includes('monthly') || freqNorm.includes('month')) {
        freq = 'รายเดือน';
      } else if (freqNorm.includes('ปี') || freqNorm.includes('yearly') || freqNorm.includes('year')) {
        freq = 'รายปี';
      }

      // stepsStr format: "เป่าฝุ่นบอร์ดควบคุม:10; วัดอุณหภูมิ:15; ทาจาระบีซีลยาง:5"
      const steps: PMStep[] = [];
      if (stepsStr) {
        const stepPieces = stepsStr.split(';');
        stepPieces.forEach(p => {
          const trimmedPiece = p.trim();
          if (!trimmedPiece) return;
          
          if (trimmedPiece.includes(':')) {
            const lastColonIndex = trimmedPiece.lastIndexOf(':');
            const stepTitle = trimmedPiece.substring(0, lastColonIndex).trim();
            const timeStr = trimmedPiece.substring(lastColonIndex + 1).replace(/[^0-9]/g, '');
            const mins = parseInt(timeStr) || 10;
            if (stepTitle) {
              steps.push({ title: stepTitle, stdTime: mins });
            }
          } else {
            steps.push({ title: trimmedPiece, stdTime: 10 });
          }
        });
      }

      if (steps.length === 0) {
        steps.push({ title: 'ขั้นตอนตรวจสอบทั่วไป', stdTime: 15 });
      }

      const calculatedTtm = steps.reduce((sum, s) => sum + s.stdTime, 0);

      parsed.push({
        machineId: machId,
        title,
        frequency: freq,
        spareParts: spare,
        steps,
        ttm: calculatedTtm
      });
    });

    return parsed;
  };

  // Preview generated from imports text
  const previewedImports = parseTSVOrCSV(importText);

  // Parse file content
  const handleCSVFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = () => {
    if (previewedImports.length === 0) {
      alert("ไม่พบรายการแผ่นบำรุงรักษาใดๆ ที่สามารถนำเข้าได้ กรุณาใส่ข้อมูลหรืออัปโหลดไฟล์ตัวอย่างให้ถูกต้อง");
      return;
    }

    const hasError = previewedImports.some(p => p.error);
    if (hasError) {
      if (!confirm("พบข้อมูลบางแถวไม่ตรงตามข้อกำหนดของแถบเทมเพลต คุณต้องการข้ามแถวที่คลาดเคลื่อนเหล่านั้นแล้วดำเนินการต่อใช่หรือไม่?")) {
        return;
      }
    }

    const validImports = previewedImports.filter(p => !p.error);
    const databaseFormedImports: PMPlan[] = validImports.map((p, idx) => ({
      id: `plan-pm-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
      machineId: p.machineId,
      title: p.title,
      frequency: p.frequency,
      spareParts: p.spareParts,
      steps: p.steps.map(s => ({ ...s })),
      ttm: p.ttm
    }));

    setPmPlans(prev => [...prev, ...databaseFormedImports]);
    setShowImportModal(false);
    setImportText('');
    alert(`นำเข้าเรียบร้อย! นำแผน PM จำนวน ${databaseFormedImports.length} รายการเข้าสู่พิกัดเครื่องจักรสำเร็จแล้ว`);
  };

  // Add/Edit Plan Form States
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [planTitle, setPlanTitle] = useState('');
  const [planFrequency, setPlanFrequency] = useState<PMFrequency>('รายสัปดาห์');
  const [planSpareParts, setPlanSpareParts] = useState('');
  const [planSteps, setPlanSteps] = useState<PMStep[]>([{ title: 'ตรวจสอบภายนอกเบื้องต้น', stdTime: 10 }]);
  const [formError, setFormError] = useState('');

  // Live sum of Std.Time
  const liveTtm = planSteps.reduce((sum, step) => sum + (step.stdTime || 0), 0);

  const handleAddStepField = () => {
    setPlanSteps(prev => [...prev, { title: '', stdTime: 10 }]);
  };

  const handleRemoveStepField = (index: number) => {
    if (planSteps.length === 1) return; // Keep at least one
    setPlanSteps(prev => prev.filter((_, i) => i !== index));
  };

  const handleStepValueChange = (index: number, field: keyof PMStep, value: string | number) => {
    setPlanSteps(prev => {
      const updated = [...prev];
      if (field === 'stdTime') {
        updated[index] = { ...updated[index], stdTime: Math.max(0, Number(value) || 0) };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  const handleOpenNewForm = () => {
    if (!selectedMachineId) {
      alert("กรุณาเลือกเครื่องจักรทางหน้าต่างด้านซ้ายก่อน");
      return;
    }
    setEditingPlanId(null);
    setPlanTitle('');
    setPlanFrequency('รายสัปดาห์');
    setPlanSpareParts('');
    setPlanSteps([{ title: 'ตรวจสอบทั่วไปและสายพาน', stdTime: 15 }]);
    setFormError('');
    setShowFormModal(true);
  };

  const handleOpenEditForm = (plan: PMPlan) => {
    setEditingPlanId(plan.id);
    setPlanTitle(plan.title);
    setPlanFrequency(plan.frequency);
    setPlanSpareParts(plan.spareParts || '');
    setPlanSteps([...plan.steps]);
    setFormError('');
    setShowFormModal(true);
  };

  const handleDeletePlan = (planId: string) => {
    setDeleteConfirmId(planId);
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planTitle.trim()) {
      setFormError('กรุณากรอกชื่อหัวข้องาน PM');
      return;
    }

    const invalidSteps = planSteps.some(step => !step.title.trim());
    if (invalidSteps) {
      setFormError('กรุณากรอกรายละเอียดขั้นตอนถ้วนในทุกแถว');
      return;
    }

    const calculatedTtm = planSteps.reduce((sum, step) => sum + step.stdTime, 0);

    if (editingPlanId) {
      // Edit existing
      setPmPlans(prev => prev.map(p => {
        if (p.id === editingPlanId) {
          return {
            ...p,
            title: planTitle.trim(),
            frequency: planFrequency,
            spareParts: planSpareParts.trim(),
            steps: planSteps.map(s => ({ ...s, title: s.title.trim() })),
            ttm: calculatedTtm
          };
        }
        return p;
      }));
    } else {
      // Add new
      const newPlan: PMPlan = {
        id: `plan-pm-${Date.now()}`,
        machineId: selectedMachineId,
        title: planTitle.trim(),
        frequency: planFrequency,
        spareParts: planSpareParts.trim(),
        steps: planSteps.map(s => ({ ...s, title: s.title.trim() })),
        ttm: calculatedTtm
      };
      setPmPlans(prev => [...prev, newPlan]);
    }

    setShowFormModal(false);
  };

  return (
    <div className="space-y-6" id="pmplan-page-root">
      {/* Tab Switcher: PM Plan Task List vs TBM Plan Schedule Matrix */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-1.5 border border-slate-700/80 rounded-2xl shadow-sm" id="pmplan-tabs-bar">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            id="tab-btn-pm-tasks"
            onClick={() => setPmPlanViewTab('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              pmPlanViewTab === 'list'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <ClipboardList size={16} />
            📋 รายการหัวข้องานและขั้นตอน PM
          </button>
          <button
            type="button"
            id="tab-btn-pm-tbm"
            onClick={() => setPmPlanViewTab('tbm')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              pmPlanViewTab === 'tbm'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <CalendarRange size={16} />
            📅 ตารางแผน PM ตาม Time-Based Maintenance (TBM Matrix)
          </button>
        </div>

        {pmPlanViewTab === 'list' && selectedMachineId && (
          <button
            type="button"
            onClick={() => setPmPlanViewTab('tbm')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            <CalendarRange size={14} />
            ดูตารางแผน TBM เครื่อง <span className="font-mono text-white font-bold">{selectedMachineId}</span>
          </button>
        )}
      </div>

      {pmPlanViewTab === 'tbm' ? (
        <div className="space-y-6 animate-in fade-in duration-150">
          <TBMPlanSchedulePage 
            initialMachineId={selectedMachineId || 'ALL'}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* LEFT COLUMN: Searchable machine select */}
      <div id="pm-left-machine-selector" className="col-span-1 lg:col-span-4 bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col h-[650px]">
        <h3 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
          🏭 ค้นหาตัวเลือกเครื่องจักร
        </h3>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            id="pm-machine-search"
            type="text"
            placeholder="รหัส หรือ ชื่อเครื่อง..."
            value={machineSearch}
            onChange={(e) => setMachineSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1" id="pm-machine-list">
          {filteredMachines.map(m => {
            const planCount = pmPlans.filter(p => p.machineId === m.id).length;
            const isSelected = selectedMachineId === m.id;

            return (
              <button
                key={m.id}
                id={`pm-mach-btn-${m.id}`}
                onClick={() => setSelectedMachineId(m.id)}
                className={`w-full text-left p-3 rounded-xl border transition flex justify-between items-center ${
                  isSelected 
                    ? 'bg-slate-900/80 border-cyan-500 text-cyan-400' 
                    : 'bg-slate-900/20 border-slate-700/50 hover:border-slate-600 text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold tracking-wider">{m.id}</span>
                    <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded">
                      {m.lineGroup}
                    </span>
                  </div>
                  <p className="text-xs font-medium mt-1 truncate max-w-[160px]">{m.name}</p>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    planCount > 0 ? 'bg-cyan-500/15 text-cyan-400' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {planCount} งาน PM
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: PM plans cards */}
      <div className="col-span-1 lg:col-span-8 flex flex-col space-y-5 h-[650px]">
        {/* Machine header display and call to action */}
        {(() => {
          const machData = machines.find(m => m.id === selectedMachineId);
          return (
            <div id="pm-right-machine-header" className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono font-bold px-2 py-0.5 rounded">
                    {machData?.id}
                  </span>
                  <span className="text-slate-400 font-sans text-xs">หมวดหมู่: {machData?.lineGroup}</span>
                </div>
                <h2 className="text-base font-bold font-sans text-slate-100 mt-1">
                  {machData?.name || 'กรุณาเลือกเครื่องจักร'}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                {canEdit ? (
                  <>
                    <button
                      id="btn-copy-pm-plans"
                      onClick={() => {
                        if (!selectedMachineId) {
                          alert("กรุณาเลือกเครื่องจักรปลายทางก่อน");
                          return;
                        }
                        setCopySourceMachineId('');
                        setSelectedPlansToCopy([]);
                        setShowCopyModal(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-700/60 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl text-[11px] font-bold transition cursor-pointer"
                      title="คัดลอกแผน PM ทั้งหมดหรือบางส่วนจากเครื่องจักรอื่นมาที่เครื่องนี้"
                    >
                      <Copy size={13} className="text-cyan-400" />
                      <span>คัดลอกแผนจากเครื่องอื่น</span>
                    </button>

                    <button
                      id="btn-import-pm-excel"
                      onClick={() => {
                        if (!selectedMachineId) {
                          alert("กรุณาเลือกเครื่องจักรที่จะให้นำเข้าแผนลงไปก่อน");
                          return;
                        }
                        setImportText('');
                        setShowImportModal(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-755 text-slate-200 hover:bg-slate-755 hover:border-slate-600 rounded-xl text-[11px] font-bold transition cursor-pointer"
                      title="นำเข้าแผน PM และขั้นตอนด้วยไฟล์ Excel/CSV หรือแปะจากคลิปบอร์ดได้เลย"
                    >
                      <Upload size={13} className="text-emerald-400" />
                      <span>นำเข้า Excel / วางแปะ</span>
                    </button>

                    <button
                      id="btn-add-pm-plan"
                      onClick={handleOpenNewForm}
                      className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold rounded-xl text-[11px] transition"
                    >
                      <Plus size={13} strokeWidth={2.5} />
                      <span>เพิ่มงานแผน PM ใหม่</span>
                    </button>

                    <button
                      type="button"
                      id="btn-view-machine-tbm"
                      onClick={() => setPmPlanViewTab('tbm')}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-600/30 to-cyan-600/30 hover:from-blue-600/50 hover:to-cyan-600/50 border border-cyan-500/40 text-cyan-300 rounded-xl text-[11px] font-bold transition cursor-pointer"
                      title="ดูตารางแผน PM ตามรอบเวลา (TBM) ของเครื่องนี้"
                    >
                      <CalendarRange size={13} className="text-cyan-400" />
                      <span>ตารางแผน TBM</span>
                    </button>
                  </>
                ) : (
                  <div className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs border border-slate-700">
                    🔒 สิทธิ์ดูอย่างเดียว (Viewer)
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* List of plans */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1" id="pm-plan-container">
          {activeMachinePlans.length === 0 ? (
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-12 text-center text-slate-500 h-full flex flex-col justify-center items-center">
              <PackageOpen size={48} className="text-slate-600 mb-3" />
              <p className="text-sm font-semibold">ไม่พบแผนบำรุงรักษาเชิงป้องกัน (PM) ใดๆ</p>
              <p className="text-xs text-slate-400 mt-1">คุณสามารถเพิ่มระบบตรวจสอบความชำรุด โดยการกดเพิ่มงานแผน PM ใหม่ ด้านบน</p>
            </div>
          ) : (
            activeMachinePlans.map(plan => (
              <div 
                key={plan.id} 
                id={`pm-plan-card-${plan.id}`}
                className="bg-slate-800 border border-slate-700/80 rounded-2xl p-5 space-y-4 hover:border-slate-600/80 transition-all shadow-md relative group"
              >
                {/* Heading details */}
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        plan.frequency === 'รายวัน' ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400' :
                        plan.frequency === 'รายสัปดาห์' ? 'bg-teal-500/10 border-teal-500/25 text-teal-400' :
                        plan.frequency === 'รายเดือน' ? 'bg-amber-500/10 border-amber-500/25 text-amber-400' :
                        'bg-rose-500/10 border-rose-500/25 text-rose-400'
                      }`}>
                        ความถี่: {plan.frequency}
                      </span>
                      <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                        <Clock size={12} /> {plan.steps.length} ขั้นตอน
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-250 font-sans">
                      {plan.title}
                    </h3>
                  </div>
                  
                  {/* Standard calculated time */}
                  <div className="bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-1.5 text-right shrink-0">
                    <p className="text-[9px] uppercase text-slate-400 tracking-wider">เวลามาตรฐาน PM</p>
                    <p className="text-base font-mono font-bold text-cyan-400">{plan.ttm} <span className="text-[10px] text-slate-300">นาที</span></p>
                  </div>
                </div>

                {/* Steps Details */}
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-3.5 space-y-2">
                  <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase flex items-center gap-1">
                    <ClipboardList size={12} className="text-cyan-400" />
                    ขั้นตอนทดสอบและตรวจวัดมาตรฐาน
                  </p>
                  <ol className="list-decimal pl-4 space-y-1 text-slate-300 text-xs">
                    {plan.steps.map((st, i) => (
                      <li key={i}>
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-sans py-0.5">{st.title}</span>
                          <span className="text-cyan-400 font-mono text-xs">{st.stdTime} นาที</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Spare parts optional block */}
                {plan.spareParts && (
                  <div className="text-xs text-slate-300 bg-slate-900/30 border border-dashed border-slate-700/50 p-3 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">🛠 อะไหล่ที่จำเป็นต้องจัดหาล่วงหน้า:</p>
                    <p className="font-sans mt-1 text-slate-300 italic">{plan.spareParts}</p>
                  </div>
                )}

                {/* Interactive controller button */}
                <div className="flex items-center justify-end gap-2 border-t border-slate-700/50 pt-3">
                  {canEdit && (
                    <button
                      id={`btn-edit-plan-${plan.id}`}
                      onClick={() => handleOpenEditForm(plan)}
                      className="flex items-center gap-1 border border-slate-700 hover:bg-slate-700/60 text-slate-300 text-xs px-3 py-1.5 rounded-lg transition"
                    >
                      <Edit3 size={12} />
                      แก้ไขข้อมูล
                    </button>
                  )}
                  {canDelete && (
                    <button
                      id={`btn-delete-plan-${plan.id}`}
                      onClick={() => handleDeletePlan(plan.id)}
                      className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white text-xs px-3 py-1.5 rounded-lg transition"
                      title="ลบแผนงาน PM (เฉพาะ Admin)"
                    >
                      <Trash2 size={12} />
                      ลบแผนงาน
                    </button>
                  )}
                  {!canEdit && !canDelete && (
                    <span className="text-[10px] text-slate-500 italic">ดูอย่างเดียว</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      </div>
      )}

      {/* Form Dialog Modal for Adding or Editing PM Plan */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div id="pm-form-modal" className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-155">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700/80 p-5 flex justify-between items-center shrink-0">
              <h3 className="text-sm font-semibold text-cyan-400">
                {editingPlanId ? '📝 แก้ไขข้อมูลแผนบำรุงรักษา PM' : '➕ เพิ่มแผนระบบบำรุงรักษาเชิงป้องกัน (PM)'}
              </h3>
              
              <div className="flex items-center gap-4">
                <div className="bg-slate-950 border border-slate-700/55 rounded-lg px-3 py-1 text-right shrink-0">
                  <span className="text-[9px] text-slate-400 uppercase font-bold mr-2">ผลรวม TTM:</span>
                  <span className="text-sm font-mono font-bold text-cyan-400">{liveTtm} นาที</span>
                </div>
                <button 
                  onClick={() => setShowFormModal(false)}
                  className="text-slate-400 hover:text-slate-200 text-xl font-medium focus:outline-none"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Scrollable form body */}
            <form onSubmit={handleSavePlan} className="flex-1 overflow-y-auto p-6 space-y-4">
              {formError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-lg flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="col-span-1 md:col-span-8 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">ชื่อหัวข้องาน PM*</label>
                  <input
                    id="form-pm-title"
                    type="text"
                    required
                    placeholder="ความสะอาด ลูบพัดลม, ตรวจวัดความขนานบิดตัว"
                    value={planTitle}
                    onChange={(e) => setPlanTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="col-span-1 md:col-span-4 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">ความถี่ (Frequency)*</label>
                  <select
                    id="form-pm-frequency"
                    value={planFrequency}
                    onChange={(e) => setPlanFrequency(e.target.value as PMFrequency)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="รายวัน">รายวัน (Daily)</option>
                    <option value="รายสัปดาห์">รายสัปดาห์ (Weekly)</option>
                    <option value="รายเดือน">รายเดือน (Monthly)</option>
                    <option value="รายปี">รายปี (Yearly)</option>
                  </select>
                </div>
              </div>

              {/* Steps Dynamic Box */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-300">ขั้นตอนการบำรุงและเวลามาตรฐาน (Std. Time)*</label>
                  <button
                    id="btn-add-step-row"
                    type="button"
                    onClick={handleAddStepField}
                    className="flex items-center gap-1 text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500 hover:text-slate-950 px-2 py-1 rounded transition"
                  >
                    <Plus size={12} />
                    เพิ่มขั้นตอนถัดไป
                  </button>
                </div>

                <div className="space-y-2" id="form-steps-container">
                  {planSteps.map((step, index) => (
                    <div key={index} className="flex items-center gap-2 bg-slate-900/50 p-2 border border-slate-700/80 rounded-xl">
                      <span className="text-xs font-mono font-bold text-slate-400 px-2">{index + 1}</span>
                      
                      <input
                        id={`step-title-${index}`}
                        type="text"
                        required
                        placeholder="กรุณากรอกรายละเอียดขั้นตอน..."
                        value={step.title}
                        onChange={(e) => handleStepValueChange(index, 'title', e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      />

                      <div className="w-28 flex items-center gap-1 shrink-0">
                        <input
                          id={`step-time-${index}`}
                          type="number"
                          required
                          min={1}
                          value={step.stdTime || ''}
                          onChange={(e) => handleStepValueChange(index, 'stdTime', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-200 font-mono text-center focus:outline-none focus:border-cyan-500"
                        />
                        <span className="text-[10px] text-slate-400">นาที</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveStepField(index)}
                        disabled={planSteps.length === 1}
                        className="p-1.5 border border-slate-700 text-slate-500 hover:text-rose-400 hover:border-rose-500/30 rounded disabled:opacity-40"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Spare parts */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">อะไหล่หรือวัสดุสิ้นเปลืองอุปกรณ์ที่ต้องการจัดหาระหว่างซ่อม (ใส่หรือไม่ใส่ก็ได้)</label>
                <textarea
                  id="form-pm-spare-parts"
                  rows={2}
                  placeholder="ตัวอย่างเช่น จาระบีเกรดอาหาร NSF-H1, ลวดพันความร้อนเตาอบเบอร์ 3"
                  value={planSpareParts}
                  onChange={(e) => setPlanSpareParts(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-700/60 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="border border-slate-700 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2.5 rounded-lg transition"
                >
                  ยกเลิก
                </button>
                <button
                  id="form-btn-save-pm"
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-lg transition shadow-md"
                >
                  บันทึกแบบร่างแผนงาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in duration-100">
          <div className="bg-slate-900 border border-slate-755 p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-100 text-xs">
            <div className="flex items-center gap-3 text-rose-500 border-b border-slate-800 pb-3">
              <span className="text-xl">🚨</span>
              <h3 className="text-sm font-extrabold text-slate-100">ยืนยันการลบแผนบำรุงรักษา PM</h3>
            </div>
            <p className="text-slate-300 leading-relaxed font-sans">
              คุณแน่ใจว่าต้องการลบแผนบำรุงรักษาเชิงป้องกัน (PM) นี้ใช่หรือไม่? ขั้นตอนและรายการแนวทางดำเนินการทั้งหมดจะถูกนำออกอย่างถาวร
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
                id="btn-confirm-delete-pm"
                onClick={() => {
                  setPmPlans(prev => prev.filter(p => p.id !== deleteConfirmId));
                  setDeleteConfirmId(null);
                }}
                className="bg-rose-600 hover:bg-rose-555 text-white font-extrabold text-xs px-4.5 py-2 rounded-lg transition"
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. CLONE / COPY PM PLANS FROM ANOTHER MACHINE MODAL */}
      {showCopyModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/90 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div id="pm-copy-modal" className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl text-xs text-slate-200">
            {/* Modal Header */}
            <div className="bg-slate-900 border-b border-slate-700 p-4.5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="text-cyan-400" size={16} />
                <h3 className="font-bold text-slate-100 text-sm">📋 คัดลอกสูตรแผน PM ข้ามจากเครื่องจักรอื่น</h3>
              </div>
              <button 
                onClick={() => setShowCopyModal(false)}
                className="px-2.5 py-1 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg font-bold"
              >
                &times; ปิด
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              
              {/* Alert context target */}
              <div className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 p-3 rounded-xl">
                เป้าหมายการก๊อปปี้มาลง: <span className="font-mono bg-black/30 px-1 py-0.5 rounded font-black text-cyan-400">{selectedMachineId}</span> 
                {' '}({machines.find(m => m.id === selectedMachineId)?.name})
              </div>

              {/* Selector Source Machine */}
              <div className="space-y-1.5 flex flex-col">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">1. เลือกเครื่องจักรต้นทาง (Source Machine)</label>
                <select
                  value={copySourceMachineId}
                  onChange={(e) => {
                    setCopySourceMachineId(e.target.value);
                    setSelectedPlansToCopy([]); // Reset chosen lists
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- เลือกเครื่องจักรเครื่องอื่น --</option>
                  {machines
                    .filter(m => m.id !== selectedMachineId)
                    .map(m => {
                      const plansOfThis = pmPlans.filter(p => p.machineId === m.id);
                      return (
                        <option key={m.id} value={m.id} disabled={plansOfThis.length === 0}>
                          {m.id} - {m.name} ({plansOfThis.length} แผนที่มีต้นแบบ)
                        </option>
                      );
                    })}
                </select>
              </div>

              {/* Plans checklist panel */}
              {copySourceMachineId && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-extrabold px-1">
                    <span>2. เลือกรายละเอียดรายการแผน PM ที่จะเอา</span>
                    {sourceMachinePlans.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSelectAllSourcePlans}
                        className="text-cyan-400 hover:underline"
                      >
                        {selectedPlansToCopy.length === sourceMachinePlans.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                      </button>
                    )}
                  </div>

                  <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl max-h-[220px] overflow-y-auto divide-y divide-slate-800">
                    {sourceMachinePlans.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 font-sans">
                        ไม่มีแบบแผนงานตั้งต้นสำหรับเครื่องนี้
                      </div>
                    ) : (
                      sourceMachinePlans.map((plan) => {
                        const isChecked = selectedPlansToCopy.includes(plan.id);
                        return (
                          <div 
                            key={plan.id}
                            onClick={() => handleToggleSelectPlanToCopy(plan.id)}
                            className="p-3 flex items-start gap-2.5 hover:bg-slate-800/40 cursor-pointer transition select-none"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // Controlled by outer div click
                              className="mt-0.5 rounded text-cyan-500 focus:ring-cyan-500/20"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <span className="font-extrabold text-slate-200 truncate pr-2">{plan.title}</span>
                                <span className="font-mono text-cyan-400 font-bold shrink-0">{plan.ttm} นาที</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5 font-sans">
                                ความถี่: {plan.frequency} | {plan.steps.length} ขั้นตอนตรวจสอบย่อย
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer actions */}
            <div className="bg-slate-900 border-t border-slate-700/60 p-4 shrink-0 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                เลือกแล้ว <b className="text-cyan-400 font-mono text-xs">{selectedPlansToCopy.length}</b> รายการแผนซ่อมบำรุง
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCopyModal(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-400 hover:text-white rounded-lg transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleExecuteCopy}
                  disabled={selectedPlansToCopy.length === 0}
                  className="px-4.5 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-slate-950 font-black rounded-lg transition shadow-lg shadow-cyan-500/5 cursor-pointer"
                >
                  สั่งก๊อปปี้และบันทึก
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 2. EXCEL / CSV BULK PLANS IMPORTATION AND PASTE MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/90 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div id="pm-import-modal" className="bg-slate-800 border border-slate-750/90 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl text-xs text-slate-200">
            
            {/* Modal Header */}
            <div className="bg-slate-900 border-b border-slate-700 p-4.5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="text-emerald-400" size={17} />
                <h3 className="font-bold text-slate-100 text-sm">📥 นำเข้าแผนงาน PM จากไฟล์ Excel / วางคัดลอกข้อมูลจำนวนมาก</h3>
              </div>
              <button 
                onClick={() => setShowImportModal(false)}
                className="px-2.5 py-1 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg font-bold"
              >
                &times; ปิดหน้าต่าง
              </button>
            </div>

            {/* Modal Layout scroll center */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              
              {/* Detailed Guidelines with Example copy-paste text */}
              <div className="bg-[#050a14] border border-slate-700 p-4 rounded-xl space-y-2">
                <h4 className="font-extrabold text-emerald-400 flex items-center gap-1.5 text-xs">
                  <Sparkles size={13} className="text-emerald-400" />
                  ข้อกำหนดโครงสร้างตารางคอลัมน์ Excel (คัดลอกมาวางตรงตารางด้านขวาได้ด้วย)
                </h4>
                <p className="text-slate-400 leading-relaxed text-[11px] font-sans">
                  หากท่านต้องการนำเข้าแผนบำรุงรักษาในปริมาณมาก สามารถกรอกรายละเอียดลงตาราง Excel 5 คอลัมน์ <b>(เรียงตามลำดับด้านล่าง)</b> แล้วสั่ง Copy แถวทั้งหมดจากหน้าสมุดงานแล้วกดวางคีย์แปรงลงในกล่องข้อความได้โดยตรง:
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 pt-1.5 font-mono text-[9px] text-slate-400">
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <b className="text-white block mb-0.5">คอลัมน์ A (เลี่ยงได้)</b>
                    <span>รหัสเครื่องจักร (เช่น: <code>RIM01</code> หรือเว้นว่างให้ใช้เครื่องที่เลือกปัจจุบัน)</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <b className="text-white block mb-0.5">คอลัมน์ B (จำเป็น)</b>
                    <span>หัวข้องาน PM (เช่น: <code>ตรวจระบบทำความร้อน</code>)</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <b className="text-white block mb-0.5">คอลัมน์ C (ระบุความถี่)</b>
                    <span>ความถี่ (เช่น: <code>รายวัน</code>, <code>รายสัปดาห์</code>, <code>รายเดือน</code>, <code>รายปี</code>)</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <b className="text-white block mb-0.5">คอลัมน์ D (อะไหล่)</b>
                    <span>อะไหล่ที่ต้องเคลียร์ล่วงหน้า (เว้นว่างได้)</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <b className="text-white block mb-0.5">คอลัมน์ E (รายการย่อย)</b>
                    <span>ขั้นตอนและค่าตรวจ (คั่นด้วยเซมิโคลอน <code>;</code> เช่น: <code>เป่าทำความสะอาดฝุ่น:10;เช็คขั้วปลั๊กไฟ:15</code>)</span>
                  </div>
                </div>

                {/* Example Quick Paste Helper */}
                <div className="bg-black/35 p-2 rounded-lg text-[10.5px] font-mono flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <span className="text-slate-500 overflow-x-auto whitespace-nowrap py-1">
                    ตัวอย่างเทมเพลต: <code>{selectedMachineId}	ทำความสะอาดถาดกรองน้ำมัน	รายสัปดาห์	ถาดโฟมความร้อนเบอร์ 4	ล้างตะแกรงชั้นในด้วยกระแสลม:15;เปลี่ยนตัวถ่วงน้ำหนัก:10</code>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const templateRow = `${selectedMachineId}\tทำความสะอาดถาดกรองน้ำมัน\tรายสัปดาห์\tถาดโฟมความร้อนเบอร์ 4\tล้างตะแกรงชั้นในด้วยกระแสลม:15;เปลี่ยนตัวถ่วงน้ำหนัก:10\n${selectedMachineId}\tเป่าลมหน้าหลอดตู้ควบคุม\tรายเดือน\t\tเช็คแรงดันสะสม:10;ขัดกระจกสะท้อน:20`;
                      setImportText(templateRow);
                    }}
                    className="text-[9.5px] shrink-0 px-2 py-0.8 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 font-bold rounded border border-emerald-500/20 font-sans"
                  >
                    💡 ใช้ข้อมูลจำลองตัวอย่าง
                  </button>
                </div>
              </div>

              {/* Upload input and controls */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* Inputs block Left (Text Area & Upload) */}
                <div className="col-span-1 md:col-span-7 space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">
                      ช่องว่างคัดลอกวาง / สั่งอ่านข้อมูล Excel
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">หรือ อัปโหลดไฟล์ .CSV ของคุณ:</span>
                      <input
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleCSVFileUpload}
                        className="text-[10px] text-slate-300 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10.5px] file:font-bold file:bg-emerald-500/15 file:text-emerald-400 hover:file:bg-emerald-500/30 cursor-pointer w-[150px]"
                      />
                    </div>
                  </div>

                  <textarea
                    rows={8}
                    placeholder="คลิกที่นี่แล้วกด Ctrl+V เพื่อวางแถวคัดลอกจาก Excel หรือพิมพ์แมนนวลก็ทำได้..."
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    className="w-full bg-[#050a14] border border-slate-700 rounded-xl p-3 text-slate-200 font-mono text-[11px] placeholder-slate-650 focus:outline-none focus:border-emerald-500 leading-normal"
                  />

                  {/* Target configuration checkbox rules */}
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex flex-col gap-2 font-sans">
                    <div className="flex items-center gap-2">
                      <input
                        id="check-force-selected-machine"
                        type="checkbox"
                        checked={importSelectedMachineOnly}
                        onChange={(e) => setImportSelectedMachineOnly(e.target.checked)}
                        className="rounded text-emerald-500 focus:ring-emerald-500/20"
                      />
                      <label htmlFor="check-force-selected-machine" className="font-bold text-slate-300">
                        บังคับให้นำเข้าสูตรแผน PM ลงในเครื่องที่เลือก ({selectedMachineId}) เท่านั้น
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-500 pl-5 leading-normal">
                      หากเปิดสเตตัสนี้ ระบบจะละเว้นรหัสเครื่องจักรในคอลัมน์แรก และโยนรายการแผน PM ทั้งหมดเข้าสู่พิกัดเครื่องจักร <b>{selectedMachineId}</b> ในทันที หากเอาติ๊กออก จะอิงตาม คอลัมน์ A (Machine ID) ที่เขียนมาในไฟล์ตารางแทน
                    </p>
                  </div>
                </div>

                {/* Live Preview List Right */}
                <div className="col-span-1 md:col-span-5 flex flex-col h-[280px] md:h-auto">
                  <div className="flex justify-between items-center pb-2 text-[10px] text-slate-400 font-extrabold uppercase tracking-wide shrink-0">
                    <span>ตารางพรีวิวทวนสอบข้อมูลแถว ({previewedImports.length} แถวที่คำนวณ)</span>
                    <span className="text-emerald-400">Live Validator</span>
                  </div>

                  <div className="flex-1 bg-[#050a14] border border-slate-700 rounded-xl overflow-hidden flex flex-col">
                    {previewedImports.length === 0 ? (
                      <div className="flex-1 p-6 text-center text-slate-605 flex flex-col justify-center items-center font-sans gap-2">
                        <AlertTriangle size={24} className="text-slate-700" />
                        <p className="text-[11px]">ไม่มีข้อมูลแสดงพรีวิว</p>
                        <p className="text-[9.5px]">กรุณากรอกแปะข้อมูล Excel หรือใช้ชุดข้อมูลจำลองเพื่อพรีวิวขั้นตอนตาราง</p>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-y-auto divide-y divide-slate-850 p-2 space-y-1">
                        {previewedImports.map((imp, idx) => (
                          <div key={idx} className="p-2 hover:bg-slate-900/65 rounded-lg flex flex-col gap-1 text-[10px]">
                            <div className="flex justify-between items-start gap-1">
                              <span className="font-black text-slate-200 truncate pr-2" title={imp.title}>
                                {idx + 1}. {imp.title}
                              </span>
                              {imp.error ? (
                                <span className="text-[9px] bg-rose-500/10 border border-rose-500/20 text-rose-450 px-1 py-0.2 rounded shrink-0 font-bold">Error</span>
                              ) : (
                                <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 px-1 py-0.2 rounded shrink-0 font-bold">ผ่าน</span>
                              )}
                            </div>

                            <div className="flex justify-between items-center text-[9px] text-slate-500">
                              <span>เครื่องจักร: <b className="text-slate-300 font-mono">{imp.machineId}</b></span>
                              <span>ความถี่: <b className="text-cyan-400">{imp.frequency}</b></span>
                            </div>

                            <div className="flex justify-between items-center text-[9px] text-slate-400 px-1.5 py-0.5 bg-black/25 rounded border border-slate-900 mt-1">
                              <span>มี {imp.steps.length} ด่าน</span>
                              <span>เวลารวม: <b className="font-mono text-cyan-400">{imp.ttm} นาที</b></span>
                            </div>

                            {imp.error && (
                              <p className="text-[9px] text-rose-400 font-bold mt-1 font-sans">{imp.error}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>

            {/* Modal Footer actions */}
            <div className="bg-slate-900 border-t border-slate-700/60 p-4 shrink-0 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-sans">
                สูตรแผนงาน PM ที่ผ่านการตรวจสอบ: <b className="text-emerald-400 font-mono text-xs">{previewedImports.filter(p => !p.error).length}</b> / {previewedImports.length} แถว
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-400 hover:text-white rounded-lg transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={previewedImports.filter(p => !p.error).length === 0}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-slate-950 font-black rounded-lg transition shadow-lg shadow-emerald-500/5 cursor-pointer"
                >
                  📥 นำเข้าสู่ระบบบอร์ดแผนงาน PM
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
