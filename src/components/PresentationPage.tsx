import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { RepairLog, SetupLog, Machine, PMScheduleItem } from '../types';
import { 
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  Presentation, Wrench, Clock, TrendingDown, Sparkles, UserCheck, 
  ShieldAlert, ChevronRight, ChevronDown, Search, ArrowRight,
  Settings, Check, LayoutGrid, AlertCircle, RefreshCw, BarChart, 
  FileText, AlertTriangle, CheckCircle2, Award, Edit3, Trash2, ShieldCheck, Heart, UserMinus
} from 'lucide-react';

export const PresentationPage: React.FC = () => {
  const { 
    repairs, 
    setupLogs, 
    machines, 
    technicians, 
    settings,
    schedules,
    pmPlans
  } = useApp();

  // Selected Presentation Navigation Mode
  // 'dashboard' | 'pm-analysis' | 'repair-analysis' | 'setup-analysis' | 'tree'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pm-analysis' | 'repair-analysis' | 'setup-analysis' | 'tree'>('dashboard');

  // Selected Machine for Repair History Modal
  const [selectedMachineForHistory, setSelectedMachineForHistory] = useState<string | null>(null);

  // Breakdown Tree Search and State
  const [treeSearch, setTreeSearch] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<string[]>(['PACKING', 'SEALER']); 
  
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => 
      prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]
    );
  };

  // State to store custom delay reasons and analyses (Persisted in localStorage)
  const [pmDelayDetails, setPmDelayDetails] = useState<Record<string, { reason: string; why1: string; why2: string; why3: string; why4: string; why5: string; countermeasure: string }>>(() => {
    const saved = localStorage.getItem('pm_delay_reasons_v2');
    return saved ? JSON.parse(saved) : {};
  });

  const [repairDelayDetails, setRepairDelayDetails] = useState<Record<string, { reason: string; why1: string; why2: string; why3: string; why4: string; why5: string; countermeasure: string }>>(() => {
    const saved = localStorage.getItem('repair_delay_reasons_v2');
    return saved ? JSON.parse(saved) : {};
  });

  const [setupDelayDetails, setSetupDelayDetails] = useState<Record<string, { reason: string; why1: string; why2: string; why3: string; why4: string; why5: string; countermeasure: string }>>(() => {
    const saved = localStorage.getItem('setup_delay_reasons_v2');
    return saved ? JSON.parse(saved) : {};
  });

  // Track currently expanded item ID for editing why-why
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Auto-save delay details to localStorage
  useEffect(() => {
    localStorage.setItem('pm_delay_reasons_v2', JSON.stringify(pmDelayDetails));
  }, [pmDelayDetails]);

  useEffect(() => {
    localStorage.setItem('repair_delay_reasons_v2', JSON.stringify(repairDelayDetails));
  }, [repairDelayDetails]);

  useEffect(() => {
    localStorage.setItem('setup_delay_reasons_v2', JSON.stringify(setupDelayDetails));
  }, [setupDelayDetails]);

  // General presets for delays to make UX very friendly and rapid
  const PM_PRESETS = [
    {
      reason: "ชิ้นส่วนเป็นสนิมเกาะแน่นขันแกะฝาช้ากว่าสิบนาที",
      why1: "น็อตยึดหน้างานขึ้นสนิมแดงและขัดสลักในตัว",
      why2: "มีความชื้นสะสมสูงในห้องบรรจุกระทบแท่นล้างน้ำยา",
      why3: "รอบทำความสะอาดไลน์ผลิตเปิดพัดลมเป่าไล่ความชื้นไม่เพียงพอ",
      why4: "เช็กลิสต์ PM รอบก่อนไม่มีสัญลักษณ์กำกับฉีดพ่นสเปรย์หล่อลื่นป้องกันสนิม",
      why5: "ไม่ได้ทบทวนมาตรฐาน SOP ป้องกันสนิมเครื่องจักรฝาสแตนเลส",
      countermeasure: "แก้ไขโดยบรรจุวาระการฉีดพ่นสเปรย์ซิลิโคนเคลือบสารกันชื้นเป็นวาระ PM หลักประจำสัปดาห์"
    },
    {
      reason: "คราบสารเหนียวสะสมแช่แน่นต้องเสียเวลาขัดเจียร",
      why1: "หัวปรับจิ๊กจ่ายกาวผลิตชำรุดทำให้น้ำหยดไหลสะสมตกลงมาที่แผ่นร้อน",
      why2: "รอบผลิตใช้งานติดต่อกันโดยไม่มีรอบหยุดเบรกทำความสะอาดระหว่างกะ (Line stop)",
      why3: "ยอดออร์เดอร์พิเศษสูงทำให้ผู้ควบคุมกดเร่งสวิตช์ข้ามจุดเคลียร์สารหล่อลื่น",
      why4: "การสื่อสารระหว่างหน้างานช่างบำรุงและหัวหน้าโรงงานไม่ประสานเวลา",
      why5: "ขาดระบบการเตือนความสะอาดหัวฉีดแบบแจ้งพิกัดอัจฉริยะ",
      countermeasure: "ติดตั้งถาดรองอะลูมิเนียมกันสะสมเพื่อยกเปลี่ยนสับถาดทดแทนรวดเร็วใน 2 นาที"
    },
    {
      reason: "ต้องถ่ายโอนสารเคมีและวัตถุดิบคงค้างเพื่อความปลอดภัยขณะเปิดระบบ",
      why1: "ระบบวาล์วปล่อยน้ำส่วนเกินไหลสวนทางย้อนกลับอุดช่องเชื่อมโยงหลัก",
      why2: "ไม่ได้ลอกระบบเซฟตี้สวิดช์ในท่อส่งตรงกำหนดกะ",
      why3: "เซ็นเซอร์ตัวจับแรงดันแจ้งสถิติมั่วนั่นทำให้ทีมซ่อมไม่แน่ใจแรงดันถัง",
      why4: "สายด้ามจับมิเตอร์สอบเทียบขาดสัญญาณนานกว่าสองสัปดาห์",
      why5: "กำหนดกาลไล่สอบเทียบเครื่องมือวัดอ้อมนานเกินเกณฑ์ 6 เดือนครั้ง",
      countermeasure: "ทำเช็กลิสต์ปรับเปลี่ยนวาล์วระบายส่วนเกินก่อนเดินเข้าหน้างานล่วงหน้า 15 นาที"
    }
  ];

  const REPAIR_PRESETS = [
    {
      reason: "รอเบิกเครื่องมือพิเศษและอะไหล่ทดแทนจากคลังกลางของโรงงาน",
      why1: "ไม่มีอะไหล่สำรอง (Safety Stock) จุดพุลเล่ย์เกียร์ในชั้นเก็บของโรงงานประจำวัน",
      why2: "อะไหล่หมดคลังนานแล้วแต่ระบบคุมคลังสถิติตกหล่นไม่ได้เตือนให้กดสั่งซื้อใหม่",
      why3: "รอบการตรวจสอบยอดขั้นต่ำรันคิวรายเดือนและไม่ได้เช็คละเอียด",
      why4: "ขาดพนักงานตรวจนับยอดสต็อกพัสดุเฉพาะทางอย่างต่อเนื่อง",
      why5: "โรงงานพยายามรัดเข็มขัดลดงบสำรองคลังต่ำเกินไปในเครื่องจักรอายุการใช้งานเกิน 5 ปี",
      countermeasure: "ปรับปรุงรหัสพารามิเตอร์เครื่องจักรเก่าแยกกลุ่ม Critical Spares บังคับสำรองสต็อกขั้นต่ำไว้อย่างน้อย 1 ชิ้นเสมอ"
    },
    {
      reason: "สายไฟวงจรไฟฟ้าภายในรางกระดูกงูพับและขาดสัญญาณแฝงหาซ่อมจุดยาก",
      why1: "เกิดความเครียดดัดตัวในรางพลาสติกระหว่างเครื่องจักรเคลื่อนที่แกน Y บ่อยครั้ง",
      why2: "ขนาดวงรัศมีช่วงโค้งรางเคเบิ้ลแคบกว่าค่ามาตรฐานสิบร้อยละของวิศวกรรม",
      why3: "ผู้ติดตั้งตอนติดตั้งโรงงานใช้สายสั้นเกินระยะเผื่อตึงดัดตัว",
      why4: "ไม่ได้ใช้สายไฟประเภททนการดัดงอพรีเมี่ยม (Flexible Chain Cable)",
      why5: "เน้นสั่งซื้อประเภทสายไฟทั่วไปทดแทนเพื่อประหยัดต้นทุนตั้งต้น",
      countermeasure: "พาดเดินสายส่งสัญญาณภายนอกใหม่ ใช้สายประเภท Super Flex ทนการเคลื่อนไหว 10 ล้านรอบพาดหุ้มสปริงเกลียวเหล็ก"
    }
  ];

  const SETUP_PRESETS = [
    {
      reason: "แกนโรลของม้วนฟิล์มเบียดขอบรางเหล็กฝืดดึงและหมุนคลายใบมีดขัดตัว",
      why1: "ขนาดความหนาแกนกระดาษล็อตใหม่เกินค่าเบิกมาตรฐานบวก 2 มิลลิเมตร",
      why2: "ฝ่ายจัดซื้อเปลี่ยนซัพพลายเออร์รายใหม่โดยไม่ส่งตัวอย่างเข้าลองเทสหน้าไลน์ล่วงหน้า",
      why3: "โปรโตคอลตรวจสอบรับอะไหล่วัตถุดิบ (IQC) ไม่ครอบคลุมมิติของมม.ข้างในแกนสวิตช์",
      why4: "คู่มือการจัดซื้อเน้นประเมินคะแนนราคาถูกสุดมากกว่าความแม่นยำทางวิศวกรรม",
      why5: "ไม่มีนโยบายร่วมเซ็นรับรองแบบเทคนิคม้วนฟิล์มระหว่างหน่วยวิศวกรกับฝ่ายจัดซื้อ",
      countermeasure: "ออกระเบียบร่วมประสานงานให้มีใบ QC ผ่านมาตรฐานขนาดแกนม้วนฟิล์มก่อนนำเข้าเก็บที่คลังพัสดุการผลิต"
    },
    {
      reason: "เซ็นเซอร์ตัวจับเป้าดวงตาดึงเพี้ยน คลาดเคลื่อน และต้องชะลอการปรับออฟเซ็ตบ่อย",
      why1: "แสงนำทางสแกนอ่อนกำลังจากฝุ่นและคราบน้ำมันเกาะหน้าต่างกระจกเลนส์ออปติกัล",
      why2: "หัวเครื่องฉีดฝอยไอเสียเป่าทิศฝอยไอน้ำมันตรงเข้าจุดรับแสงเลนส์พอดี",
      why3: "ไม่มีฝาครอบกันน้ำมันกระเซ็นที่ตัวติดตั้งเซ็นเซอร์สายพานสเตจหลัก",
      why4: "ลืมติดตั้งฝาคัพครอบเนื่องจากตอนปรับโครงสร้างใหม่เพื่อเพิ่มความกว้างไลน์",
      why5: "ช่างที่คุมไลน์ประกอบติดตั้งไม่ได้นำทีมงานตรวจสอบความปลอดภัยการกระเซ็นรอบข้าง",
      countermeasure: "ติดตั้งท่อลมอัดเล็กเป่าลมแฝงล้างฝุ่นหน้าเลนส์อัตโนมัติ (Air purge unit) ป้องกันสิ่งสกปรกสะสม"
    }
  ];

  // Helper: Retrieve Standard MTTR for a key category (from machine prefix)
  const getStandardMttr = (machineId: string): number => {
    const prefix = machineId.slice(0, 3).toUpperCase();
    return settings.stdMttr[prefix] || 60; // default 60 minutes if not configured
  };

  // Group repairs and machines into standard Line Groups
  const groupLines = () => {
    const linesMap: Record<string, {
      name: string;
      machines: Record<string, {
        machine: Machine;
        repairs: RepairLog[];
      }>
    }> = {};

    machines.forEach(m => {
      const line = m.lineGroup || 'อื่น ๆ';
      if (!linesMap[line]) {
        linesMap[line] = { name: line, machines: {} };
      }
      if (!linesMap[line].machines[m.id]) {
        linesMap[line].machines[m.id] = { machine: m, repairs: [] };
      }
    });

    repairs.forEach(rep => {
      const m = machines.find(mac => mac.id === rep.machineId);
      const line = m ? m.lineGroup : 'อื่น ๆ';
      if (!linesMap[line]) {
        linesMap[line] = { name: line, machines: {} };
      }
      if (!linesMap[line].machines[rep.machineId]) {
        linesMap[line].machines[rep.machineId] = { 
          machine: m || { id: rep.machineId, name: 'อุปกรณ์ทั่วไป', lineGroup: line },
          repairs: [] 
        };
      }
      linesMap[line].machines[rep.machineId].repairs.push(rep);
    });

    return linesMap;
  };

  const linesData = groupLines();

  // 1. PM Outcomes stats
  const completedPMs = schedules.filter(s => s.type === 'PM' && s.status === 'เสร็จสิ้น');
  const totalPMCount = completedPMs.length;
  
  const getLinkedPlan = (pm: PMScheduleItem) => {
    return pmPlans.find(p => p.id === pm.pmPlanId);
  };

  const getPMStandardTime = (pm: PMScheduleItem) => {
    const plan = getLinkedPlan(pm);
    return plan ? plan.ttm : 45;
  };

  const pmActualTotalMin = completedPMs.reduce((sum, pm) => sum + pm.duration, 0);
  const pmStandardTotalMin = completedPMs.reduce((sum, pm) => sum + getPMStandardTime(pm as PMScheduleItem), 0);
  const avgPmActual = totalPMCount > 0 ? Math.round(pmActualTotalMin / totalPMCount) : 0;
  const avgPmStandard = totalPMCount > 0 ? Math.round(pmStandardTotalMin / totalPMCount) : 45;

  const totalDelayedPMs = completedPMs.filter(pm => pm.duration > getPMStandardTime(pm as PMScheduleItem));

  // 2. Urgent Repairs (Breakdown) stats
  const totalDowntimeMin = repairs.reduce((sum, r) => sum + r.duration, 0);
  const avgActualMttr = repairs.length > 0 ? Math.round(totalDowntimeMin / repairs.length) : 0;
  const totalStandardMttrMin = repairs.reduce((sum, r) => sum + getStandardMttr(r.machineId), 0);
  const avgStandardMttr = repairs.length > 0 ? Math.round(totalStandardMttrMin / repairs.length) : 60;
  
  const totalDelayedRepairs = repairs.filter(rep => rep.duration > getStandardMttr(rep.machineId));

  // 3. Machine Setup stats
  const totalSetups = setupLogs.length;
  const totalSetupMin = setupLogs.reduce((sum, s) => sum + s.totalDuration, 0);
  const avgSetupMin = totalSetups > 0 ? Math.round(totalSetupMin / totalSetups) : 0;
  
  const BENCHMARK_SETUP_STD = 50; 
  const totalStepBenchmarks: Record<string, number> = {
    'ตั้งเครื่อง': 15,
    'ร้อยฟิล์ม': 12,
    'ตั้งฟิล์ม': 10,
    'ต่อฟิล์ม': 5,
    'ตั้งเครื่องพิมพ์วันที่': 8,
  };

  const getStepsSummary = () => {
    const stepStats: Record<string, { durationSum: number; count: number; delayedCount: number; logs: SetupLog[] }> = {};
    
    setupLogs.forEach(log => {
      log.steps.forEach(s => {
        if (s.completed && s.duration > 0) {
          if (!stepStats[s.stepName]) {
            stepStats[s.stepName] = { durationSum: 0, count: 0, delayedCount: 0, logs: [] };
          }
          stepStats[s.stepName].durationSum += s.duration;
          stepStats[s.stepName].count += 1;
          stepStats[s.stepName].logs.push(log);
          
          const std = totalStepBenchmarks[s.stepName] || 10;
          if (s.duration > std) {
            stepStats[s.stepName].delayedCount += 1;
          }
        }
      });
    });

    return Object.keys(stepStats).map(stepName => {
      const avg = Math.round(stepStats[stepName].durationSum / stepStats[stepName].count);
      const std = totalStepBenchmarks[stepName] || 10;
      return {
        stepName,
        avgActual: avg,
        stdBenchmark: std,
        diff: std - avg,
        totalRuns: stepStats[stepName].count,
        delayedRuns: stepStats[stepName].delayedCount,
        status: avg <= std ? 'optimized' : 'delayed',
        logs: stepStats[stepName].logs
      };
    });
  };

  const stepSummaries = getStepsSummary();

  // Safe handler to update PM delay detail
  const handleUpdatePmDelay = (id: string, field: string, value: string) => {
    setPmDelayDetails(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || { reason: '', why1: '', why2: '', why3: '', why4: '', why5: '', countermeasure: '' }),
        [field]: value
      }
    }));
  };

  // Safe handler to apply preset to PM Delay
  const applyPmPreset = (id: string, preset: typeof PM_PRESETS[0]) => {
    setPmDelayDetails(prev => ({
      ...prev,
      [id]: { ...preset }
    }));
  };

  // Safe handler to update Repair delay
  const handleUpdateRepairDelay = (id: string, field: string, value: string) => {
    setRepairDelayDetails(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || { reason: '', why1: '', why2: '', why3: '', why4: '', why5: '', countermeasure: '' }),
        [field]: value
      }
    }));
  };

  // Safe handler to apply preset to Repair Delay
  const applyRepairPreset = (id: string, preset: typeof REPAIR_PRESETS[0]) => {
    setRepairDelayDetails(prev => ({
      ...prev,
      [id]: { ...preset }
    }));
  };

  // Safe handler to update Setup step delay
  const handleUpdateSetupDelay = (key: string, field: string, value: string) => {
    setSetupDelayDetails(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || { reason: '', why1: '', why2: '', why3: '', why4: '', why5: '', countermeasure: '' }),
        [field]: value
      }
    }));
  };

  // Safe handler to apply preset to Setup Delay
  const applySetupPreset = (key: string, preset: typeof SETUP_PRESETS[0]) => {
    setSetupDelayDetails(prev => ({
      ...prev,
      [key]: { ...preset }
    }));
  };

  return (
    <div className="space-y-6 text-slate-100" id="executive-presentation-dashboard">
      
      {/* HEADER WITH TABS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#ab38ff]/5 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-md font-bold text-[10px] tracking-wider uppercase">
                EXECUTIVE presentation BOARD
              </span>
              <span className="px-2.5 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-md font-bold text-[10px]">
                SOP & Target KPI Analyzer 
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <Presentation className="text-[#06b6d4] shrink-0" size={24} /> 
              ศูนย์ควบคุมและวิเคราะห์นำเสนอระดับผู้บริหาร
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 max-w-3xl">
              รายงานเปรียบเทียบมาตรฐานเทียบงานจริงครบถ้วนทั้ง 3 กลุ่มงาน 
              <b className="text-cyan-400"> (1. ผลของ PM, 2. งานซ่อมด่วน Breakdown, 3. งานจัดตั้ง Setup เครื่อง) </b> 
              แสดงความล่าช้ารายขั้นตอนพร้อมระบบป้อนผลการวิเคราะห์ Why-Why Analysis และเสนอแนวทางแก้ไขให้ผู้บริหารถูกใจ
            </p>
          </div>

          {/* Tab buttons */}
          <div className="flex flex-wrap items-center bg-slate-950 border border-slate-850 p-1.5 rounded-xl gap-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 text-[11px] font-black rounded-lg transition-all ${
                activeTab === 'dashboard' 
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 font-black shadow-md' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              📊 ภาพรวมนำเสนอ
            </button>
            <button
              onClick={() => setActiveTab('pm-analysis')}
              className={`px-3 py-1.5 text-[11px] font-black rounded-lg transition-all ${
                activeTab === 'pm-analysis' 
                  ? 'bg-cyan-500 text-slate-950 font-black' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              📋 1. ผลการ PM ({totalPMCount})
            </button>
            <button
              onClick={() => setActiveTab('repair-analysis')}
              className={`px-3 py-1.5 text-[11px] font-black rounded-lg transition-all ${
                activeTab === 'repair-analysis' 
                  ? 'bg-cyan-500 text-slate-950 font-black' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              🔧 2. ซ่อมด่วน ({repairs.length})
            </button>
            <button
              onClick={() => setActiveTab('setup-analysis')}
              className={`px-3 py-1.5 text-[11px] font-black rounded-lg transition-all ${
                activeTab === 'setup-analysis' 
                  ? 'bg-cyan-500 text-slate-950 font-black' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              ⏱️ 3. ตั้งเครื่อง ({totalSetups})
            </button>
            <button
              onClick={() => setActiveTab('tree')}
              className={`px-3 py-1.5 text-[11px] font-black rounded-lg transition-all ${
                activeTab === 'tree' 
                  ? 'bg-cyan-500 text-slate-950 font-black' 
                  : 'text-indigo-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              🌳 ต้นไม้ Breakdown
            </button>
          </div>
        </div>
      </div>

      {/* ======================= TAB 0: DASHBOARD EXECUTIVE SUMMARY ======================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Main comparative metric boards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* PM Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden transition hover:-translate-y-1 shadow-lg">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex justify-between items-start">
                <span className="p-2.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-xl">
                  <CheckCircle2 size={24} />
                </span>
                <span className="text-[10px] font-black text-slate-500 uppercase">Category 01</span>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-black text-white">งานบำรุงรักษาป้องกัน PM</h3>
                <p className="text-[10px] text-slate-400 mt-1">เปรียบเทียบมาตรฐานความถี่และเวลาปิดบอร์ด</p>
                <div className="flex items-baseline gap-2.5 mt-3">
                  <span className="text-2xl font-black text-cyan-400 font-mono">{avgPmActual}m</span>
                  <span className="text-xs text-slate-400">จากเป้ามาตรฐาน {avgPmStandard}m</span>
                </div>
                <div className="mt-3.5 pt-3.5 border-t border-slate-850 flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">PM ช้ากว่าเป้ามาตรฐาน:</span>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded ${totalDelayedPMs.length > 0 ? 'bg-amber-400/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {totalDelayedPMs.length} เคส
                  </span>
                </div>
              </div>
            </div>

            {/* Breakdown Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden transition hover:-translate-y-1 shadow-lg">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex justify-between items-start">
                <span className="p-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl">
                  <Wrench size={24} />
                </span>
                <span className="text-[10px] font-black text-slate-500 uppercase">Category 02</span>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-black text-white">งานซ่อมด่วน (Breakdown / MTTR)</h3>
                <p className="text-[10px] text-slate-400 mt-1">เปรียบเทียบชั่วโมงพังชำรุดเครื่องจักรตามพิกัด</p>
                <div className="flex items-baseline gap-2.5 mt-3">
                  <span className="text-2xl font-black text-rose-400 font-mono">{avgActualMttr}m</span>
                  <span className="text-xs text-slate-400">จากเป้ามาตรฐาน {avgStandardMttr}m</span>
                </div>
                <div className="mt-3.5 pt-3.5 border-t border-slate-850 flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">พังซ่อมช้ากว่า Std MTTR:</span>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded ${totalDelayedRepairs.length > 0 ? 'bg-rose-400/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {totalDelayedRepairs.length} เครื่อง
                  </span>
                </div>
              </div>
            </div>

            {/* Setup Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden transition hover:-translate-y-1 shadow-lg">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex justify-between items-start">
                <span className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
                  <Clock size={24} />
                </span>
                <span className="text-[10px] font-black text-slate-500 uppercase">Category 03</span>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-black text-white">การลงเวลาตั้งจัดเครื่อง (Setup SOP)</h3>
                <p className="text-[10px] text-slate-400 mt-1">ยอดรวมเฉลี่ยรายด่านการสลับเปลี่ยนไลน์</p>
                <div className="flex items-baseline gap-2.5 mt-3">
                  <span className="text-2xl font-black text-emerald-400 font-mono">{avgSetupMin}m</span>
                  <span className="text-xs text-slate-400 font-medium">เป้าหมายรวม {BENCHMARK_SETUP_STD}m</span>
                </div>
                <div className="mt-3.5 pt-3.5 border-t border-slate-850 flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">ด่านย่อยเฉลี่ยที่สูงกว่ามาตรฐาน:</span>
                  <span className="font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">
                    {stepSummaries.filter(s => s.avgActual > s.stdBenchmark).length} ด่าน
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick analysis section & recommendations for executive presenting */}
          <div className="bg-[#0c1424] border border-slate-850 rounded-2xl p-6 relative overflow-hidden">
            <h3 className="text-base font-black text-white flex items-center gap-2 mb-4">
              <Sparkles className="text-amber-400" size={18} />
              สไลด์เสนอแผนวิเคราะห์สาเหตุและมาตรการป้องกันต่อสายพานการผลิต
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
                  <p className="text-xs font-black text-cyan-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></span>
                    วิเคราะห์เหตุผลทำไมการบำรุงรักษาหรือด่านทำงานขยับช้ากว่าเป้ามาตรฐาน
                  </p>
                  <p className="text-[11px] text-slate-350 leading-relaxed">
                    อ้างอิงสถิติหน้างาน ชิ้นส่วนบางรายการในโซนเปียกมักเกิดสนิมและสะสมคราบสารกาว ซึ่งทำให้งานแกะทำความสะอาดใช้เวลามากกว่าที่คาด 1.4 เท่า และการตรวจสอบสต็อกชิ้นส่วนอะไหล่ Critical Spares ที่ไม่แม่นยำส่งผลลบต่อ MTTR
                  </p>
                </div>

                <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
                  <p className="text-xs font-black text-emerald-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                    มาตรการนำเสนอผู้จัดการฝ่ายผลิต (Suggested Action Items)
                  </p>
                  <ul className="text-[11px] text-slate-350 space-y-1.5 list-disc pl-4 leading-relaxed">
                    <li>บรรจุวาระฉีดสเปรย์หล่อลื่นกันสนิมในฐานเกรด PM 100%</li>
                    <li>ติดตั้งชุดเป่าลมไล่ละอองน้ำมันหน้าเลนส์เซ็นเซอร์สำหรับกระบวนการ Setup</li>
                    <li>ปรับเปลี่ยนระบบจัดเก็บอะไหล่วิกฤต (Critical Parts) ป้องกันขัดข้องเกียร์</li>
                  </ul>
                </div>
              </div>

              {/* Graphical distribution of work standards */}
              <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>ตารางเปรียบเทียบความเร็วเฉลี่ยระดับโรงงาน</span>
                    <span className="text-[9.5px] px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 rounded">ข้อมูลอัปเดตเวลานี้</span>
                  </h4>
                  <div className="space-y-3 pt-1">
                    {/* PM Progress */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-300 font-semibold">1. เวลาทำ PM เฉลี่ย (PM Duration)</span>
                        <span className="font-mono text-cyan-400 font-bold">{avgPmActual}m <span className="text-slate-500">/ Std {avgPmStandard}m</span></span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div style={{ width: `${Math.min(100, (avgPmActual / (avgPmStandard || 1)) * 100)}%` }} className={`h-full ${avgPmActual <= avgPmStandard ? 'bg-cyan-500' : 'bg-rose-500'}`}></div>
                      </div>
                    </div>

                    {/* Breakdown Progress */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-300 font-semibold">2. เวลาเฉลี่ยกู้คืนซ่อมด่วน (MTTR)</span>
                        <span className="font-mono text-cyan-400 font-bold">{avgActualMttr}m <span className="text-slate-500">/ Std {avgStandardMttr}m</span></span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div style={{ width: `${Math.min(100, (avgActualMttr / (avgStandardMttr || 1)) * 100)}%` }} className={`h-full ${avgActualMttr <= avgStandardMttr ? 'bg-cyan-500' : 'bg-rose-500'}`}></div>
                      </div>
                    </div>

                    {/* Setup Progress */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-300 font-semibold">3. เวลารวมการจัดเตรียมตั้งเครื่อง (Setup Time)</span>
                        <span className="font-mono text-emerald-400 font-bold">{avgSetupMin}m <span className="text-slate-500">/ Std {BENCHMARK_SETUP_STD}m</span></span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div style={{ width: `${Math.min(100, (avgSetupMin / BENCHMARK_SETUP_STD) * 100)}%` }} className={`h-full ${avgSetupMin <= BENCHMARK_SETUP_STD ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[10.5px] text-slate-400 border-t border-slate-850 pt-2 text-center bg-slate-950/20 p-2 rounded">
                  💡 ลูกค้าสามารถคลิกที่แท็บเมนูด้านบนเพื่อป้อนรายละเอียดและวิเคราะห์ Why-Why สำหรับใบใบงานที่มีเวลารันเกินเป้าหมาย เพื่อจัดพิมพ์รายงานได้ตลอดเวลา
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= TAB 1: PM OUTCOMES ANALYSIS (ผลการ PM) ======================= */}
      {activeTab === 'pm-analysis' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-850 pb-4">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-1.5">
                <CheckCircle2 className="text-[#06b6d4]" size={18} />
                ประสิทธิภาพคิวงานบำรุงรักษาเชิงป้องกัน PM เทียบค่าเฉลี่ยมาตรฐาน (TTM)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                รายการ PM ที่เสร็จสิ้นทั้งหมด คัดกรองและเปรียบเทียบเวลามาตรฐาน หากผลใช้เวลานานเกินกำหนด ระบบจะขึ้นสัญลักษณ์ให้กรอกเหตุผลและการวิเคราะห์ล่าช้าทันที
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-bold">สถิติ PM ทั้งหมด</span>
              <span className="text-base font-black text-cyan-400 font-mono">{totalPMCount} ใบงาน</span>
            </div>
          </div>

          <div className="space-y-4">
            {completedPMs.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500 italic">
                ไม่พบประวัติใบงาน PM ที่ขึ้นสเตตัส "เสร็จสิ้น" ในขณะนี้
              </div>
            ) : (
              completedPMs.map(pm => {
                const plan = getLinkedPlan(pm as PMScheduleItem);
                const planStd = plan ? plan.ttm : 45;
                const actual = pm.duration;
                const isDelayed = actual > planStd;
                const delayKey = pm.id;
                const currentData = pmDelayDetails[delayKey] || { reason: '', why1: '', why2: '', why3: '', why4: '', why5: '', countermeasure: '' };

                return (
                  <div 
                    key={pm.id} 
                    className={`border rounded-xl p-4 space-y-4 transition ${
                      isDelayed 
                        ? 'bg-rose-950/10 border-rose-900/30 hover:border-rose-900/60' 
                        : 'bg-slate-950/40 border-slate-850 hover:border-slate-850'
                    }`}
                  >
                    {/* Job Details Row */}
                    <div className="flex flex-col md:flex-row justify-between gap-3 items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 bg-slate-900 text-slate-200 border border-slate-850 rounded text-[10px] font-mono">
                            ID: #{pm.id}
                          </span>
                          <span className="px-2 py-0.5 bg-cyan-500/15 text-cyan-400 rounded text-[10px] font-black uppercase">
                            ⚙️ {plan ? plan.title : 'งานบำรุงรักษาทั่วไป'}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            เครื่องจักรรหัส: <b className="text-white font-mono">{pm.machineId}</b>
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-4 flex-wrap">
                          <span>📅 วันที่ทำ: <b className="text-white font-mono">{pm.date}</b></span>
                          <span>👤 ช่างเทคนิคหลัก: <b className="text-[#38bdf8]">{pm.technician}</b></span>
                          {pm.technicians && pm.technicians.length > 0 && (
                            <span>ผู้ช่วย: <b className="text-[#ab38ff]">{pm.technicians.join(', ')}</b></span>
                          )}
                        </div>
                      </div>

                      {/* Time Comparison Badges */}
                      <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                        <div className="flex gap-2 items-center bg-slate-950/40 p-2.5 rounded-xl border border-slate-850/60 duration-badge-box shadow-inner">
                          <div className="text-center px-2.5 py-2 bg-rose-500/10 rounded-lg border border-rose-500/30 min-w-[95px] duration-accumulated-pill">
                            <div className="text-[9px] text-slate-400 font-black leading-none mb-1.5 uppercase tracking-wide">เวลาซ่อมจริง</div>
                            <div className="font-mono text-sm text-rose-400 font-black leading-none">{actual} น.</div>
                          </div>
                          <div className="text-center px-2.5 py-2 bg-slate-900/60 rounded-lg border border-slate-800 min-w-[95px] duration-target-pill">
                            <div className="text-[9px] text-slate-500 font-black leading-none mb-1.5 uppercase tracking-wide">มาตรฐานแผน</div>
                            <div className="font-mono text-sm text-slate-300 font-black leading-none">{planStd} น.</div>
                          </div>
                        </div>
                        
                        <div className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 border ${
                          isDelayed 
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {isDelayed ? (
                            <>
                              <AlertTriangle size={13} />
                              <span>ช้ากว่าแผ่ง +{actual - planStd}m</span>
                            </>
                          ) : (
                            <>
                              <Check size={13} />
                              <span>เสร็จตาม Standard</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Delay Analysis Block (RENDERED IF IS DELAYED OR ALREADY HAS REASONS IN STATE) */}
                    {(isDelayed || currentData.reason) && (
                      <div className="p-4 bg-slate-950/80 border border-slate-850 rounded-xl space-y-3.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-900 pb-2">
                          <p className="text-xs font-black text-rose-400 flex items-center gap-1.5">
                            <AlertCircle size={14} />
                            <span>วิเคราะห์สาเหตุความล่าช้า (Why-Why Analysis & Delay Reason Input)</span>
                          </p>
                          
                          {/* Apply dynamic presets */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-500 font-medium">โหลดชุดสถิติต้นแบบด่วน:</span>
                            {PM_PRESETS.map((preset, pIdx) => (
                              <button
                                key={pIdx}
                                onClick={() => applyPmPreset(pm.id, preset)}
                                className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-350 hover:text-white border border-slate-800 rounded font-bold text-[9.5px] transition cursor-pointer preset-btn"
                              >
                                ต้นแบบ {pIdx + 1}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Input Controls */}
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                            <div className="md:col-span-5 space-y-1">
                              <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">เหตุผลทำไมช้ากว่าเวลามาตรฐาน *</label>
                              <input
                                type="text"
                                value={currentData.reason}
                                onChange={(e) => handleUpdatePmDelay(pm.id, 'reason', e.target.value)}
                                placeholder="พิมพ์อธิบายเหตุผลหลัก เช่น น็อตเกลียวพัง, คราบกัมหนาแน่น..."
                                className="w-full bg-slate-950 text-xs text-slate-100 px-3 py-1.5 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-cyan-500/40 font-semibold"
                              />
                            </div>
                            
                            <div className="md:col-span-7 space-y-1">
                              <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">มาตรการแก้ไขป้องกัน (Countermeasure) *</label>
                              <input
                                type="text"
                                value={currentData.countermeasure}
                                onChange={(e) => handleUpdatePmDelay(pm.id, 'countermeasure', e.target.value)}
                                placeholder="แนวทางเพื่อไม่ให้ช้าเป้าในรอบหน้า เช่น ดัดแปลงแผ่นรองสแตนเลสกันกาวพัง, สั่งหัวน็อตรุ่นกันสนิมชั่วคราว..."
                                className="w-full bg-slate-950 text-xs text-slate-100 px-3 py-1.5 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-cyan-500/40 font-semibold"
                              />
                            </div>
                          </div>

                          {/* Collapsible/Expandable Why-Why Analysis Cascade */}
                          <div className="space-y-2 bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                            <button
                              onClick={() => setEditingItemId(editingItemId === pm.id ? null : pm.id)}
                              className="w-full flex items-center justify-between text-left text-[10px] font-extrabold text-cyan-400 uppercase tracking-widest cursor-pointer hover:text-cyan-300 transition"
                            >
                              <span>🌿 แขนบวิเคราะห์รากเหง้า Why-Why Analysis (ซ่อมช้ากว่า Std PM)</span>
                              <span className="flex items-center gap-1">
                                {editingItemId === pm.id ? 'ซ่อนการระบุด่านย่อย ▲' : 'แก้ไขด่านวิเคราะห์ 5 Why ▼'}
                              </span>
                            </button>

                            {/* Why 1-5 Inputs */}
                            {editingItemId === pm.id ? (
                              <div className="grid grid-cols-1 md:grid-cols-5 gap-2 pt-2 border-t border-slate-900">
                                <div className="space-y-1">
                                  <label className="text-[9px] text-slate-400 font-bold block">Why 1 (ทำไมลูปล่างสุด)</label>
                                  <textarea
                                    value={currentData.why1}
                                    onChange={(e) => handleUpdatePmDelay(pm.id, 'why1', e.target.value)}
                                    placeholder="ทำไมสเต็ปน็อตฝืดช้า?"
                                    className="w-full bg-slate-950 text-[10px] text-slate-200 p-1.5 border border-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500/45 h-12"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] text-slate-400 font-bold block">Why 2</label>
                                  <textarea
                                    value={currentData.why2}
                                    onChange={(e) => handleUpdatePmDelay(pm.id, 'why2', e.target.value)}
                                    placeholder="ทำไมเกิดแบบ Why 1?"
                                    className="w-full bg-slate-950 text-[10px] text-slate-200 p-1.5 border border-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500/45 h-12"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] text-slate-400 font-bold block">Why 3</label>
                                  <textarea
                                    value={currentData.why3}
                                    onChange={(e) => handleUpdatePmDelay(pm.id, 'why3', e.target.value)}
                                    placeholder="ทำไมเกิดแบบ Why 2?"
                                    className="w-full bg-slate-950 text-[10px] text-slate-200 p-1.5 border border-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500/45 h-12"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] text-slate-400 font-bold block">Why 4</label>
                                  <textarea
                                    value={currentData.why4}
                                    onChange={(e) => handleUpdatePmDelay(pm.id, 'why4', e.target.value)}
                                    placeholder="ทำไมเกิดแบบ Why 3?"
                                    className="w-full bg-slate-950 text-[10px] text-slate-200 p-1.5 border border-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500/45 h-12"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] text-slate-400 font-bold block">Why 5 (Root Cause)</label>
                                  <textarea
                                    value={currentData.why5}
                                    onChange={(e) => handleUpdatePmDelay(pm.id, 'why5', e.target.value)}
                                    placeholder="รากสาเหตุหลักคืออะไร?"
                                    className="w-full bg-slate-950 text-[10px] text-slate-200 p-1.5 border border-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500/45 h-12"
                                  />
                                </div>
                              </div>
                            ) : (
                              /* Visual diagram display of written Why-Why */
                              <div className="flex flex-wrap items-center gap-1.5 pt-1.5 text-[10px]">
                                {[currentData.why1, currentData.why2, currentData.why3, currentData.why4, currentData.why5]
                                  .filter(val => !!val)
                                  .map((val, wIdx) => (
                                    <React.Fragment key={wIdx}>
                                      {wIdx > 0 && <ChevronRight size={10} className="text-slate-600 shrink-0" />}
                                      <span className="px-2 py-1 bg-slate-950 text-slate-300 rounded border border-slate-850/65 font-medium">
                                        Why {wIdx + 1}: <b className="text-white">{val}</b>
                                      </span>
                                    </React.Fragment>
                                  ))}
                                {(!currentData.why1 && !currentData.why2 && !currentData.why3) && (
                                  <span className="text-slate-500 italic text-[9.5px]">ยังไม่ได้กรอก Why-Why สเตตัสย่อย (กดเปิดกล่องแก้ไขขวาบนเพื่อกรอกลูป)</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ======================= TAB 2: REPAIR ANALYSIS (งานซ่อมด่วน MTTR vs STD) ======================= */}
      {activeTab === 'repair-analysis' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-850 pb-4">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-1.5">
                <Wrench className="text-rose-400" size={18} />
                ประสิทธิภาพกู้คืนความพังยับเยินซ่อม Breakdown เทียบเกณฑ์มาตรฐาน MTTR
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                เปรียบเทียบระยะซ่อมด่วน (Actual Restoration Duration) กับชั่วโมงมาตรฐานประจํากลุ่มชนิดเครื่องจักร หากช้ากว่าค่ามาตรฐานจะกำหนดให้บอกสาเหตุข้ออ้างติดขัด
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-bold">แจ้งซ่อมด่วนรวม</span>
              <span className="text-base font-black text-rose-400 font-mono">{repairs.length} เคส</span>
            </div>
          </div>

          {/* CHART: Repairs by Machine */}
          {repairs.length > 0 && (
            <div className="bg-slate-950/40 p-5 border border-slate-800 rounded-2xl space-y-4" id="repair-machine-chart-container">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <Wrench className="text-rose-400" size={16} />
                    แผนภูมิวิเคราะห์และเปรียบเทียบเวลาซ่อมจริงเฉลี่ย (MTTR) กับเวลามาตรฐาน (Std MTTR) รายเครื่องจักร
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    เมื่อดูการซ่อมเครื่องจักรที่มีความล่าช้าเกินเวลาเป้าหมายมาตรฐานความพร้อมผลิต ค้นหาจุดคอขวด
                  </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10.5px] text-slate-350 self-start sm:self-auto font-medium">
                  🖱️ <span className="font-extrabold text-[#06b6d4]">ดับเบิ้ลคลิก (Double-click)</span> บนแท่งกราฟหรือแถวประวัติเพื่อดูรายละเอียดประวัติซ่อมทั้งหมด
                </div>
              </div>

              {/* Chart Plot */}
              <div className="h-[280px] w-full" id="recharts-repair-bars">
                {(() => {
                  const machineRepairMap: Record<string, { machineId: string; machineName: string; count: number; totalDuration: number; avgDuration: number; stdMttr: number }> = {};
                  repairs.forEach(rep => {
                    const matchingMachine = machines.find(m => m.id === rep.machineId);
                    const machineName = matchingMachine ? matchingMachine.name : rep.machineId;
                    const key = rep.machineId;
                    if (!machineRepairMap[key]) {
                      machineRepairMap[key] = {
                        machineId: rep.machineId,
                        machineName: machineName,
                        count: 0,
                        totalDuration: 0,
                        avgDuration: 0,
                        stdMttr: getStandardMttr(rep.machineId)
                      };
                    }
                    machineRepairMap[key].count += 1;
                    machineRepairMap[key].totalDuration += rep.duration;
                  });

                  const chartData = Object.values(machineRepairMap).map(d => ({
                    ...d,
                    avgDuration: Math.round(d.totalDuration / d.count)
                  })).sort((a, b) => b.avgDuration - a.avgDuration); // Sort by highest MTTR

                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart
                        data={chartData}
                        margin={{ top: 15, right: 10, left: -10, bottom: 5 }}
                        onDoubleClick={(state: any) => {
                          if (state && state.activePayload && state.activePayload.length > 0) {
                            const doubleClickedMachine = state.activePayload[0].payload.machineId;
                            if (doubleClickedMachine) {
                              setSelectedMachineForHistory(doubleClickedMachine);
                            }
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis 
                          dataKey="machineId" 
                          stroke="#94a3b8" 
                          tick={{ fontSize: 10.5, fill: '#cbd5e1', fontWeight: 'bold' }} 
                        />
                        <YAxis 
                          yAxisId="left"
                          stroke="#cbd5e1" 
                          tick={{ fontSize: 9.5, fill: '#cbd5e1' }}
                          label={{ value: 'เวลา (นาที)', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 10 } }}
                        />
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          stroke="#06b6d4" 
                          tick={{ fontSize: 9.5, fill: '#06b6d4' }} 
                          label={{ value: 'จำนวนครั้งเสียหาย (ครั้ง)', angle: 90, position: 'insideRight', style: { fill: '#06b6d4', fontSize: 10 } }}
                        />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const isOver = data.avgDuration > data.stdMttr;
                              const diff = Math.abs(data.avgDuration - data.stdMttr);
                              return (
                                <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs space-y-1.5 shadow-xl text-slate-100">
                                  <p className="font-extrabold text-white text-[12.5px] border-b border-slate-800 pb-1">
                                    ⚙️ {data.machineId} ({data.machineName})
                                  </p>
                                  <p className="text-slate-300 flex justify-between gap-4">
                                    <span>💥 เคสชำรุดเสียด่วน:</span>
                                    <span className="font-mono text-cyan-400 font-bold">{data.count} ครั้ง</span>
                                  </p>
                                  <p className="text-slate-350 flex justify-between gap-4">
                                    <span>⏱️ เวลารวมสะสม:</span>
                                    <span className="font-mono text-slate-300">{data.totalDuration} นาที</span>
                                  </p>
                                  <p className="text-slate-305 flex justify-between gap-4 border-t border-slate-800/60 pt-1.5">
                                    <span>⏳ ค่าเฉลี่ย MTTR จริง:</span>
                                    <span className="font-mono text-rose-400 font-bold">{data.avgDuration} นาที</span>
                                  </p>
                                  <p className="text-slate-305 flex justify-between gap-4">
                                    <span>🎯 มาตรฐาน Std MTTR:</span>
                                    <span className="font-mono text-emerald-400 font-bold">{data.stdMttr} นาที</span>
                                  </p>
                                  <p className="text-slate-400 flex justify-between gap-4">
                                    <span>🚨 สถานะความช้าเร็ว:</span>
                                    <span className={`font-bold ${isOver ? 'text-rose-400' : 'text-emerald-400'}`}>
                                      {isOver ? `ช้ากว่ามาตรฐาน +${diff} นาที` : `ตรงตามมาตรฐาน -${diff} นาที`}
                                    </span>
                                  </p>
                                  <p className="text-[10px] text-cyan-400 italic pt-1 text-center font-bold border-t border-slate-800/60 mt-1">
                                    Double-click เเพื่อเปิดประวัติซ่อมอย่างละเอียด
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10.5px' }} />
                        <Bar 
                          yAxisId="left" 
                          dataKey="avgDuration" 
                          name="เวลาเฉลี่ยซ่อมจริง (MTTR)" 
                          fill="#f43f5e" 
                          radius={[4, 4, 0, 0]}
                          maxBarSize={20}
                        />
                        <Bar 
                          yAxisId="left" 
                          dataKey="stdMttr" 
                          name="เวลามาตรฐาน (Std MTTR)" 
                          fill="#10b981" 
                          radius={[4, 4, 0, 0]}
                          maxBarSize={20}
                        />
                        <Bar 
                          yAxisId="right" 
                          dataKey="count" 
                          name="จำนวนครั้งเสียหายสะสม (ครั้ง)" 
                          fill="#06b6d4" 
                          radius={[4, 4, 0, 0]}
                          maxBarSize={20}
                        />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {repairs.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500 italic">
                ไม่พบบันทึกประวัติซ่อมพังด่วนในระบบข้อมูล
              </div>
            ) : (
              repairs.map(rep => {
                const stdMttr = getStandardMttr(rep.machineId);
                const isDelayed = rep.duration > stdMttr;
                const delayKey = rep.id;
                const currentData = repairDelayDetails[delayKey] || { 
                  reason: isDelayed ? 'รอรับผลสอบทวนพารามิเตอร์หรือเบิกเครื่องชิ้นส่วนเกียร์หน้าไลน์' : '', 
                  why1: rep.why1 || '', why2: rep.why2 || '', why3: rep.why3 || '', why4: rep.why4 || '', why5: rep.why5 || '', 
                  countermeasure: rep.correctiveAction || '' 
                };

                const allTechs = rep.technicians && rep.technicians.length > 0 
                  ? rep.technicians.join(', ')
                  : rep.technician;

                return (
                  <div 
                    key={rep.id} 
                    onDoubleClick={() => setSelectedMachineForHistory(rep.machineId)}
                    title="ดับเบิ้ลคลิกเพื่อเปิดดูรายละเอียดบันทึกประวัติซ่อมอย่างละเอียดสำหรับเครื่องนี้นอกสถานที่"
                    className={`border rounded-xl p-4 space-y-4 transition cursor-pointer select-none hover:bg-slate-900/40 hover:border-cyan-500/30 ${
                      isDelayed 
                        ? 'bg-rose-950/10 border-rose-900/30 hover:border-rose-900/60' 
                        : 'bg-slate-950/40 border-slate-850 hover:border-slate-850'
                    }`}
                  >
                    {/* Header line detail */}
                    <div className="flex flex-col md:flex-row justify-between gap-3 items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 bg-slate-900 text-slate-200 border border-slate-850 rounded text-[10px] font-mono">
                            Case: #{rep.id}
                          </span>
                          <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded text-[10px] font-black">
                            🔧 Breakdown ด่วน
                          </span>
                          <span className="text-[11px] text-slate-400">
                            เครื่องจักร: <b className="text-white font-mono">{rep.machineId}</b>
                          </span>
                          <span className="text-[9.5px] text-cyan-400 font-bold border border-cyan-500/20 bg-cyan-500/5 px-2 py-0.5 rounded animate-pulse">
                            🖱️ ดับเบิ้ลคลิกขอประวัติซ่อม
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-4 flex-wrap">
                          <span>📅 วันเวลากรอก: <b className="text-white font-mono">{rep.date} ({rep.breakdownTime.includes('T') ? rep.breakdownTime.split('T')[1] : rep.breakdownTime}น.)</b></span>
                          <span>👤 ช่างซ่อมบำรุง: <b className="text-[#38bdf8] font-bold">{allTechs}</b></span>
                        </div>
                        <p className="text-[11.5px] text-slate-300 font-bold flex items-center gap-1.5 flex-wrap mt-1">
                          <span>⚠️ อาการเสีย:</span>
                          <span className="symptom-text-highlight font-black px-2.5 py-1 rounded border text-rose-300 bg-rose-500/10 border-rose-500/20 shadow-sm leading-tight">
                            {rep.symptoms}
                          </span>
                        </p>
                      </div>

                      {/* Speed status */}
                      <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                        <div className="flex gap-2 items-center bg-slate-950/40 p-2.5 rounded-xl border border-slate-850/60 duration-badge-box shadow-inner">
                          <div className="text-center px-2.5 py-2 bg-rose-500/10 rounded-lg border border-rose-500/30 min-w-[95px] duration-accumulated-pill">
                            <div className="text-[9px] text-slate-400 font-black leading-none mb-1.5 uppercase tracking-wide">เวลาที่เสียสะสม</div>
                            <div className="font-mono text-sm text-rose-400 font-black leading-none">{rep.duration} ม.</div>
                          </div>
                          <div className="text-center px-2.5 py-2 bg-slate-900/60 rounded-lg border border-slate-800 min-w-[95px] duration-target-pill">
                            <div className="text-[9px] text-slate-500 font-black leading-none mb-1.5 uppercase tracking-wide">เป้ามาตรฐาน (Std)</div>
                            <div className="font-mono text-sm text-slate-300 font-black leading-none">{stdMttr} ม.</div>
                          </div>
                        </div>

                        <div className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 border ${
                          isDelayed 
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {isDelayed ? (
                            <>
                              <AlertTriangle size={13} />
                              <span>เกินเป้า MTTR +{rep.duration - stdMttr}m</span>
                            </>
                          ) : (
                            <>
                              <Check size={13} />
                              <span>ซ่อมเสร็จตาม Std</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Delay Analysis Block (Why/Reason layout) */}
                    {(isDelayed || currentData.reason) && (
                      <div className="p-4 bg-slate-950/80 border border-slate-850 rounded-xl space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-2">
                          <p className="text-xs font-black text-rose-400 flex items-center gap-1.5">
                            <AlertCircle size={14} />
                            <span>เหตุผลทำไมซ่อมเครื่องช้าและปิดบอร์ดเกินชั่วโมงจำกัด</span>
                          </p>

                          {/* Presets */}
                          <div className="flex items-center gap-1.5 animate-fade-in">
                            <span className="text-[10px] text-slate-500">ดึงสเปคเหตุขัดยอดนิยม:</span>
                            {REPAIR_PRESETS.map((preset, pIdx) => (
                              <button
                                key={pIdx}
                                onClick={() => applyRepairPreset(rep.id, preset)}
                                className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-350 hover:text-white border border-slate-800 rounded font-bold text-[9.5px] transition cursor-pointer preset-btn"
                              >
                                เสนอ {pIdx + 1}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Input controls */}
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                            <div className="md:col-span-5 space-y-1">
                              <label className="text-[10.5px] font-bold text-slate-400 block">ระบุส่วนติดขัด (เช่น สต็อกขาดแคลน, ลายวงจรเพี้ยน) *</label>
                              <input
                                type="text"
                                value={currentData.reason}
                                onChange={(e) => handleUpdateRepairDelay(rep.id, 'reason', e.target.value)}
                                placeholder="เช่น รอจัดซื้อสั่งแกนคีย์เพลาข้ามคืน..."
                                className="w-full bg-slate-950 text-xs text-slate-100 px-3 py-1.5 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-cyan-500/40 font-semibold"
                              />
                            </div>
                            
                            <div className="md:col-span-7 space-y-1">
                              <label className="text-[10.5px] font-bold text-slate-400 block">วิเคราะห์แนะแก้โครงสร้าง (Preventive Countermeasure)</label>
                              <input
                                type="text"
                                value={currentData.countermeasure}
                                onChange={(e) => handleUpdateRepairDelay(rep.id, 'countermeasure', e.target.value)}
                                placeholder="มาตรการแก้ไขเชิงลึกเพื่อลด MTTR รอบถัดไป..."
                                className="w-full bg-slate-950 text-xs text-slate-100 px-3 py-1.5 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-cyan-500/40 font-semibold"
                              />
                            </div>
                          </div>

                          {/* Collapsible/Expandable Why-Why Analysis */}
                          <div className="space-y-2 bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                            <div className="flex justify-between items-center text-[10px] font-bold text-cyan-300">
                              <span>🌿 แหนบวิเคราะห์ Why-Why ด่วน (คัดลอกจากการวิเคราะห์อาการ หรือเขียนเพิ่มที่นี่)</span>
                              <button
                                type="button"
                                onClick={() => setEditingItemId(editingItemId === rep.id ? null : rep.id)}
                                className="text-cyan-400 hover:underline cursor-pointer font-black"
                              >
                                {editingItemId === rep.id ? 'ซ่อน ▲' : 'แก้ไขด่านวิเคราะห์ข้อมูล ▼'}
                              </button>
                            </div>

                            {editingItemId === rep.id ? (
                              <div className="grid grid-cols-1 md:grid-cols-5 gap-2 pt-2 border-t border-slate-900">
                                {['why1', 'why2', 'why3', 'why4', 'why5'].map((wField, idx) => (
                                  <div key={wField} className="space-y-1">
                                    <label className="text-[9px] text-slate-400 font-bold block">Why {idx + 1}</label>
                                    <textarea
                                      value={currentData[wField as keyof typeof currentData] || ''}
                                      onChange={(e) => handleUpdateRepairDelay(rep.id, wField, e.target.value)}
                                      placeholder={`ระดับทำไม ${idx + 1}...`}
                                      className="w-full bg-slate-950 text-[10px] text-slate-200 p-1.5 border border-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500/45 h-12"
                                    />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                                {[currentData.why1, currentData.why2, currentData.why3, currentData.why4, currentData.why5]
                                  .filter(val => !!val)
                                  .map((val, wIdx) => (
                                    <React.Fragment key={wIdx}>
                                      {wIdx > 0 && <ChevronRight size={10} className="text-slate-650 shrink-0" />}
                                      <span className="px-2 py-1 bg-slate-950 text-slate-300 rounded border border-slate-850">
                                        Why {wIdx + 1}: <b className="text-white">{val}</b>
                                      </span>
                                    </React.Fragment>
                                  ))}
                                {(!currentData.why1 && !currentData.why2 && !currentData.why3) && (
                                  <span className="text-slate-500 italic">ไม่ได้ระบุ Why-Why ย่อย (กดแก้ไขขวาบนเพื่อระบุ)</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ======================= TAB 3: MACHINE SETUP DETAILS (งาน set up เครื่อง) ======================= */}
      {activeTab === 'setup-analysis' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="space-y-1 border-b border-slate-850 pb-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Clock className="text-emerald-400" size={18} />
              รายงานชั่วโมงการตั้งเครื่องจักร (Setup SOP) และเกณฑ์วิเคราะห์เปรียบเทียบมาตรฐานรายด่าน
            </h3>
            <p className="text-xs text-slate-400">
              วิเคราะห์รายขั้นตอนสำหรับการ Setup และปรับอุณหภูมิ (เปรียบเทียบเวลามาตรฐานด่านต่อด่าน) 
              หากตรวจพบว่าด่านเฉลี่ยจริงกินเวลา <b>สูงกว่าเป้าหมายที่โรงงานกำหนด</b> จะแสดงรายงานชี้แจงเหตุผลและ Why-Why โดยทันที
            </p>
          </div>

          {/* Grid Overview step analysis metrics */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            
            {/* Left side: Detailed step-by-step table comparing Actual vs Standard */}
            <div className="xl:col-span-7 bg-[#0a0e1a] p-5 rounded-2xl border border-slate-850 space-y-4">
              <h4 className="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                <LayoutGrid size={14} />
                <span>ตารางเปรียบเทียบเวลาขวัญใจรายขั้นตอนย่อยในกระบวนการ Setup</span>
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-extrabold uppercase bg-slate-950/60 text-[10.5px]">
                      <th className="py-3 px-3">สเต็ปขั้นตอนปฏิบัติงาน</th>
                      <th className="py-3 px-3 text-center">สถิติสุ่มตรวจ</th>
                      <th className="py-3 px-3 text-center">เวลาสัมฤทธิ์จริง (เฉลี่ย)</th>
                      <th className="py-3 px-3 text-center">พิกัด SOP มาตรฐาน</th>
                      <th className="py-3 px-3 text-right">สภาวะเวลา</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {stepSummaries.map(step => {
                      const isSlower = step.diff < 0; // standard - actual < 0 meaning actual is higher
                      
                      return (
                        <tr key={step.stepName} className="hover:bg-slate-950/30 transition">
                          <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isSlower ? 'bg-red-400 animate-pulse' : 'bg-emerald-400'}`}></span>
                            <span>{step.stepName}</span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-400">{step.totalRuns} ครั้ง</td>
                          <td className={`py-3 px-3 text-center font-mono font-extrabold text-sm ${isSlower ? 'text-red-400' : 'text-cyan-300'}`}>
                            {step.avgActual} นาที
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-white">
                            {step.stdBenchmark} นาที
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className={`px-2 py-1 rounded text-[9.5px] font-black tracking-wide ${
                              !isSlower 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' 
                                : 'bg-red-500/10 text-red-400 border border-red-500/15'
                            }`}>
                              {!isSlower ? `✔️ เร็วกว่าเป้า ${step.diff}m` : `⚠️ เกินเวลาเกณฑ์ ${Math.abs(step.diff)}m`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-cyan-950/10 border border-cyan-500/10 rounded-xl text-[11px] text-slate-400 leading-relaxed text-cyan-200">
                📌 <b>เกณฑ์เวลามาตรฐาน Setup (SOP Benchmark):</b> อ้างอิงสถิติจากคณะควบคุมวิศวกรรมการผลิต โดยแบ่งสเต็ปหลัก เช่น ร้อยฟิล์ม 12m, ปรับฟิล์ม 10m, และตั้งใบมีดความร้อน 15m หากผลการสลับไลน์ใช้เวลาเกิน แสดงว่าเครื่องจักรมีความแปรปรวนหน้าด่านสูง
              </div>
            </div>

            {/* Right side: Dynamic Explanation & Why-Why inputs for steps exceeding standard */}
            <div className="xl:col-span-5 space-y-4">
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4.5">
                <h4 className="text-xs font-black text-rose-300 uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle size={14} className="text-rose-400" />
                  <span>บันทึกชี้แจ้ง & วิเคราะห์ขั้นตอนย่อยที่ใช้เวลาเกินมาตรฐาน</span>
                </h4>
                <p className="text-[10.5px] text-slate-400 leading-relaxed">
                  คลิกระบุเหตุผลและจำลองลูปการแก้ปัญหาระดับล่างสำหรับด่านปฏิบัติงานที่มีปัญหาสถิติเฉลี่ยช้ากว่ากำหนด 
                </p>

                {/* Iterate through delayed steps */}
                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                  {stepSummaries.filter(s => s.diff < 0).map(step => {
                    const delayKey = `setup-${step.stepName}`;
                    const currentData = setupDelayDetails[delayKey] || { 
                      reason: 'ขนาดความกว้างแกนกระดาษคลาดเคลื่อนทำให้ใบมีดรัดตึงแกนดึงคลายฝืดตัวช้า', 
                      why1: 'ซัพพลายเออร์ล็อตใหม่แกนกระดาษอ้วนกว่าเกณฑ์บวกสองมิลลิเมตร', 
                      why2: 'จัดซื้อไม่ได้ส่งสเปกตัวอย่างแกนให้ฝ่ายวิศวกรเทสหน้าไลน์ก่อนผลิตจริง', 
                      why3: 'ขาดระบบ QC ชิ้นวัสดุขนาดแกนที่คลังรับฝากเก็บ', 
                      why4: 'เน้นเกณฑ์ราคาซื้อถูกสุดมากกว่าความเสถียรของคุณภาพตัวม้วน', 
                      why5: 'ไม่มีนโยบายการจัดซื้อจัดจ้างที่ประสานเสียงร่วมรับรองทางเทคนิค', 
                      countermeasure: 'ปรับปรุง SOP บัญญัติให้สลักและวัดขอบข้างแกนฟิล์มก่อนขนถ่ายเข้าพื้นที่อย่างเข้มข้น' 
                    };

                    return (
                      <div key={step.stepName} className="p-3 bg-red-950/5 border border-red-900/15 rounded-xl space-y-3">
                        <div className="flex items-center justify-between border-b border-rose-900/15 pb-1.5 flex-wrap gap-2">
                          <span className="text-xs font-black text-red-400">
                            ⚙️ ด่าน: {step.stepName} <span className="font-mono text-[10px] text-slate-400">({step.avgActual}m เทียบ Std {step.stdBenchmark}m)</span>
                          </span>
                          
                          {/* Apply Preset buttons */}
                          <div className="flex items-center gap-1">
                            {SETUP_PRESETS.map((preset, pIdx) => (
                              <button
                                key={pIdx}
                                type="button"
                                onClick={() => applySetupPreset(delayKey, preset)}
                                className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white rounded text-[8.5px] transition cursor-pointer preset-btn"
                              >
                                เสนอ {pIdx + 1}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Reason forms */}
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <label className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest block">ระบุเหตุและด่านขัดข้องที่ช้ากว่าพิกัด *</label>
                            <input
                              type="text"
                              value={currentData.reason}
                              onChange={(e) => handleUpdateSetupDelay(delayKey, 'reason', e.target.value)}
                              placeholder="..."
                              className="w-full bg-slate-950 text-xs text-slate-200 px-2 py-1.5 border border-slate-800 rounded font-semibold focus:ring-1 focus:ring-cyan-500/40"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest block">แผนงานสกัดกั้นซ้ำ (Action Plan)</label>
                            <input
                              type="text"
                              value={currentData.countermeasure}
                              onChange={(e) => handleUpdateSetupDelay(delayKey, 'countermeasure', e.target.value)}
                              placeholder="..."
                              className="w-full bg-slate-950 text-xs text-slate-200 px-2 py-1.5 border border-slate-800 rounded font-semibold focus:ring-1 focus:ring-cyan-500/40"
                            />
                          </div>

                          {/* Level 5 Why-Why analysis cascade inside setup */}
                          <div className="p-2.5 bg-slate-900/60 rounded border border-slate-850 text-[10px] space-y-1.5">
                            <div className="flex justify-between items-center text-[8.5px] font-extrabold text-slate-400 uppercase">
                              <span>ลำดับการวิเคราะห์ Why-Why ด่าน {step.stepName}</span>
                              <button
                                type="button"
                                onClick={() => setEditingItemId(editingItemId === delayKey ? null : delayKey)}
                                className="text-cyan-400 hover:underline cursor-pointer"
                              >
                                {editingItemId === delayKey ? 'ยึดคืน ▲' : 'เปิดกรอก 5-Why ▼'}
                              </button>
                            </div>

                            {editingItemId === delayKey ? (
                              <div className="space-y-1.5 pt-1.5 border-t border-slate-800">
                                {['why1', 'why2', 'why3', 'why4', 'why5'].map((wField, idx) => (
                                  <div key={wField} className="grid grid-cols-12 gap-1 items-center">
                                    <span className="col-span-2 text-[8px] font-black text-slate-500">Why {idx + 1}:</span>
                                    <input
                                      type="text"
                                      value={currentData[wField as keyof typeof currentData] || ''}
                                      onChange={(e) => handleUpdateSetupDelay(delayKey, wField, e.target.value)}
                                      placeholder={`ทำไม...`}
                                      className="col-span-10 bg-slate-950 text-[9.5px] text-slate-200 px-1.5 py-0.5 border border-slate-800 rounded"
                                    />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="space-y-1 text-slate-350 text-[9.5px]">
                                {currentData.why1 && <p><b className="text-slate-500 font-bold">Why 1:</b> {currentData.why1}</p>}
                                {currentData.why2 && <p><b className="text-slate-500 font-bold">Why 2:</b> {currentData.why2}</p>}
                                {currentData.why3 && <p><b className="text-slate-500 font-bold">Why 3:</b> {currentData.why3}</p>}
                                {currentData.why4 && <p><b className="text-slate-500 font-bold">Why 4:</b> {currentData.why4}</p>}
                                {currentData.why5 && <p><b className="text-slate-500 font-bold font-black">Why 5:</b> {currentData.why5}</p>}
                                {(!currentData.why1 && !currentData.why2) && <p className="text-slate-500 italic">ไม่มีข้อมูล Why-Why (คลิกเปิดกรอกขวาบน)</p>}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {stepSummaries.filter(s => s.diff < 0).length === 0 && (
                    <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 italic text-xs">
                      🎉 ยอดเยี่ยมมาก ทุกขั้นตอนการตั้งเครื่อง Setup ผ่านด่านและเร็วกว่าเวลามาตรฐานทั้งหมด! 
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ======================= TAB 4: INTERACTIVE HIERARCHICAL TREE ======================= */}
      {activeTab === 'tree' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-850 pb-4">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                🌳 โครงสร้างอาการชำรุดแบบสไลด์ลำดับชั้น (Breakdown Tree Diagram)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                เจาะลึกระบบหมวดไลน์การผลิต ➔ ค้นหาเครื่องจักร ➔ ไล่อาการซ่อมพร้อมชื่อช่างและเวลา Standard สำหรับการวิเคราะห์ MTTR
              </p>
            </div>

            {/* Quick search inside tree */}
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-2.5 text-slate-500" />
              <input
                type="text"
                value={treeSearch}
                onChange={(e) => setTreeSearch(e.target.value)}
                placeholder="พิมพ์ชื่อช่าง/เครื่องเพื่อตรวจหาด่วน..."
                className="bg-slate-950 text-xs text-slate-200 pl-7 pr-3 py-1.5 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Interactive Tree Box */}
          <div className="space-y-4 max-h-[650px] overflow-y-auto pr-1 animate-fade-in">
            {Object.keys(linesData).map(lineKey => {
              const lineGroup = linesData[lineKey];
              const isLineExpanded = expandedNodes.includes(lineKey);
              
              // Count total machines and repairs
              const machinesInGroup = Object.values(lineGroup.machines);
              const totalRepairsCount = machinesInGroup.reduce((sum, item) => sum + item.repairs.length, 0);

              return (
                <div key={lineKey} className="bg-[#0b1222] border border-slate-850 rounded-xl p-3 space-y-2 text-xs">
                  {/* Line Group Header (Root Node) */}
                  <button
                    onClick={() => toggleNode(lineKey)}
                    className="w-full flex items-center justify-between p-2 hover:bg-slate-950/40 rounded-lg text-left transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md">
                        {isLineExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </div>
                      <div>
                        <span className="text-xs font-black text-white uppercase tracking-wider">{lineKey}</span>
                        <span className="text-[10px] text-slate-500 font-medium ml-2 font-mono">
                          ({machinesInGroup.length} เครื่องจักร, มีประวัติพัง {totalRepairsCount} รายการ)
                        </span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 bg-slate-900 text-slate-400 border border-slate-800 rounded font-mono text-[9px]">
                      ไลน์หลักชั้นต้น
                    </span>
                  </button>

                  {/* Sub-machines list (Level 2) */}
                  {isLineExpanded && (
                    <div className="pl-6 border-l border-slate-800/80 space-y-3 mt-1.5 pb-2">
                      {machinesInGroup.map(({ machine, repairs: macRepairs }) => {
                        const mNodeId = `${lineKey}-${machine.id}`;
                        const isMExpanded = expandedNodes.includes(mNodeId);

                        // Filter repairs by user search if specified
                        const filteredRepairs = macRepairs.filter(r => {
                          if (!treeSearch) return true;
                          return (
                            r.technician.toLowerCase().includes(treeSearch.toLowerCase()) ||
                            (r.technicians || []).some(t => t.toLowerCase().includes(treeSearch.toLowerCase())) ||
                            r.symptoms.toLowerCase().includes(treeSearch.toLowerCase()) ||
                            r.machineId.toLowerCase().includes(treeSearch.toLowerCase())
                          );
                        });

                        const stdMttr = getStandardMttr(machine.id);

                        return (
                          <div key={machine.id} className="space-y-1.5">
                            {/* Machine head node */}
                            <button
                              onClick={() => toggleNode(mNodeId)}
                              className="w-full flex items-center justify-between p-1.5 hover:bg-slate-950/20 rounded transition text-left cursor-pointer"
                            >
                              <div className="flex items-center gap-1.5">
                                {isMExpanded ? <ChevronDown size={12} className="text-slate-400" /> : <ChevronRight size={12} className="text-slate-400" />}
                                <span className="text-[11px] font-bold text-slate-200">
                                  🏭 {machine.name} <span className="font-mono text-cyan-400">[{machine.id}]</span>
                                </span>
                                <span className="text-[9.5px] font-mono text-slate-500">
                                  (Std {stdMttr}m)
                                </span>
                              </div>

                              <span className="text-[10px] font-mono font-bold text-slate-500">
                                {filteredRepairs.length} ประวัติแจ้งซ่อม
                              </span>
                            </button>

                            {/* Leaves: Individual Repair logs (Level 3) */}
                            {isMExpanded && (
                              <div className="pl-4 border-l border-slate-850 space-y-2 mt-1">
                                {filteredRepairs.length === 0 ? (
                                  <p className="text-[10px] text-slate-600 italic">ไม่มีบันทึกหรืออาการที่ตรงกับคีย์เวิร์ดค้นหา</p>
                                ) : (
                                  filteredRepairs.map((rep, idx) => {
                                    const allTechs = rep.technicians && rep.technicians.length > 0 
                                      ? rep.technicians.join(', ')
                                      : rep.technician;

                                    const isQuickRepair = rep.duration <= stdMttr;

                                    return (
                                      <div 
                                        key={rep.id}
                                        className="bg-slate-950/70 border border-slate-850/80 rounded-xl p-3 space-y-2 hover:border-slate-855"
                                      >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                          {/* Time and tech */}
                                          <div className="space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="text-[10.5px] font-black text-white">
                                                📝 เคสแจ้งพังใบซ่อม #{rep.id}
                                              </span>
                                              <span className="text-[9px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-850">
                                                📅 {rep.date} ({rep.breakdownTime?.split('T')[1]?.slice(0, 5) || '09:00'}น.)
                                              </span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-medium">
                                              👤 <b>ผู้ซ่อม:</b> <span className="text-[#38bdf8] font-bold">{allTechs}</span>
                                            </p>
                                          </div>

                                          {/* Durations comparisons */}
                                          <div className="flex items-center gap-2">
                                            <div className="text-right text-[10px]">
                                              <p className="text-slate-400">เวลาซ่อมรวม: <span className="font-mono text-white font-bold">{rep.duration} น.</span></p>
                                              <p className="text-slate-500">Standard: <span className="font-mono text-slate-400">{stdMttr} น.</span></p>
                                            </div>

                                            <span className={`px-2 py-1.5 rounded-lg text-[10px] font-black flex items-center justify-center text-center ${
                                              isQuickRepair 
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                            }`}>
                                              {isQuickRepair ? '✔️ ชนะเป้า Std' : '⚠️ เกินเป้า Std'}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Symptoms & root action */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-900 text-[10.5px]">
                                          <div className="space-y-0.5">
                                            <p className="text-[9px] text-slate-500 uppercase font-extrabold tracking-wider">อาการแจ้งพัง</p>
                                            <p className="text-slate-200 font-semibold">{rep.symptoms}</p>
                                          </div>

                                          <div className="space-y-0.5">
                                            <p className="text-[9px] text-slate-500 uppercase font-extrabold tracking-wider">มาตรการซ่อมแก้ไขหน้างาน</p>
                                            <p className="text-cyan-300 font-semibold">{rep.correctiveAction}</p>
                                          </div>
                                        </div>

                                        {/* Why-Why levels display */}
                                        {(rep.why1 || rep.why2 || rep.why3) && (
                                          <div className="bg-slate-900/40 p-2 rounded-lg border border-slate-850/60 text-[10px] space-y-1">
                                            <p className="text-[8.5px] uppercase font-bold text-slate-400">ลำดับวิเคราะห์รากเหง้าสาเหตุ (Why-Why Analysis)</p>
                                            {rep.why1 && <p className="text-slate-350"><b className="text-slate-500">Why 1:</b> {rep.why1}</p>}
                                            {rep.why2 && <p className="text-slate-350"><b className="text-slate-500">Why 2:</b> {rep.why2}</p>}
                                            {rep.why3 && <p className="text-slate-350"><b className="text-slate-500">Why 3:</b> {rep.why3}</p>}
                                            {rep.why4 && <p className="text-slate-350"><b className="text-slate-500">Why 4:</b> {rep.why4}</p>}
                                            {rep.why5 && <p className="text-slate-350"><b className="text-slate-500">Why 5:</b> {rep.why5}</p>}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================= MACHINE REPAIR HISTORY DETAIL MODAL (ดับเบิ้ลคลิก) ======================= */}
      {selectedMachineForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" id="repair-history-modal-overlay">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" id="repair-history-modal">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center shrink-0">
              <div>
                <span className="px-2.5 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md font-bold text-[10px] tracking-wider uppercase">
                  REPAIR HISTORY LOG
                </span>
                <h2 className="text-lg font-black text-white mt-1">
                  ประวัติการซ่อมบำรุงรักษาอย่างละเอียดของเครื่องจักร: <span className="text-cyan-400 font-mono">{selectedMachineForHistory}</span>
                </h2>
                <p className="text-xs text-slate-400">
                  {machines.find(m => m.id === selectedMachineForHistory)?.name || 'ตำแหน่งเครื่องจักร'} | ไลน์การผลิต: {machines.find(m => m.id === selectedMachineForHistory)?.lineGroup || 'อื่น ๆ'}
                </p>
              </div>
              <button 
                onClick={() => setSelectedMachineForHistory(null)}
                className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded-lg transition font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200 scrollbar-thin">
              
              {/* KPI Stats for Machine */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-950/40 border border-slate-800 p-3 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">จำนวนครั้งซ่อมด่วน</span>
                  <span className="text-xl font-black text-rose-400 font-mono">
                    {repairs.filter(r => r.machineId === selectedMachineForHistory).length} ครั้ง
                  </span>
                </div>
                <div className="bg-slate-950/40 border border-slate-800 p-3 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">เวลารวมเครื่องหยุดซ่อม</span>
                  <span className="text-xl font-black text-amber-500 font-mono">
                    {repairs.filter(r => r.machineId === selectedMachineForHistory).reduce((sum, r) => sum + r.duration, 0)} นาที
                  </span>
                </div>
                <div className="bg-slate-950/40 border border-slate-800 p-3 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">เฉลี่ยเวลาต่อครั้ง (MTTR)</span>
                  <span className="text-xl font-black text-cyan-400 font-mono">
                    {(() => {
                      const filtered = repairs.filter(r => r.machineId === selectedMachineForHistory);
                      return filtered.length > 0 ? Math.round(filtered.reduce((sum, r) => sum + r.duration, 0) / filtered.length) : 0;
                    })()} นาที
                  </span>
                </div>
                <div className="bg-slate-950/40 border border-slate-800 p-3 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">มาตรฐานกลุ่ม (Std MTTR)</span>
                  <span className="text-xl font-black text-slate-400 font-mono">
                    {getStandardMttr(selectedMachineForHistory)} นาที
                  </span>
                </div>
              </div>

              {/* List of Repair History Cases */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                  <FileText size={14} className="text-cyan-400" />
                  <span>บันทึกประวัติซ่อมบำรุงและผลวิเคราะห์ Why-Why Analysis รายเคส</span>
                </h3>

                {(() => {
                  const machineRepairs = repairs.filter(r => r.machineId === selectedMachineForHistory);
                  if (machineRepairs.length === 0) {
                    return (
                      <div className="p-8 text-center text-xs text-slate-500 italic border border-dashed border-slate-800 rounded-xl">
                        ไม่มีประวัติการซ่อมบำรุงรักษากลุ่มทางด่วน
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-4">
                      {machineRepairs.map((rep) => {
                        const stdMttr = getStandardMttr(rep.machineId);
                        const isDelayed = rep.duration > stdMttr;
                        const delayKey = rep.id;
                        const currentData = repairDelayDetails[delayKey] || { 
                          reason: isDelayed ? 'รอรับผลสอบทวนพารามิเตอร์หรือเบิกเครื่องชิ้นส่วนเกียร์หน้าไลน์' : '', 
                          why1: rep.why1 || '', why2: rep.why2 || '', why3: rep.why3 || '', why4: rep.why4 || '', why5: rep.why5 || '', 
                          countermeasure: rep.correctiveAction || '' 
                        };

                        return (
                          <div key={rep.id} className="p-4 bg-slate-950/50 border border-slate-850 rounded-xl space-y-3">
                            <div className="flex justify-between items-start gap-2 flex-wrap text-xs">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 rounded font-mono text-[9px]">
                                  #{rep.id}
                                </span>
                                <span className="font-mono text-white text-[11.5px] font-bold">
                                  📅 {rep.date} ({rep.breakdownTime.includes('T') ? rep.breakdownTime.split('T')[1] : rep.breakdownTime} น.)
                                </span>
                                <span className="text-xs text-slate-400">
                                  | ช่างบำรุง: <b className="text-slate-300">{(rep.technicians && rep.technicians.length > 0) ? rep.technicians.join(', ') : rep.technician}</b>
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10.5px]">
                                <span className="text-slate-400">ใช้จริง: <b className="text-white font-mono">{rep.duration} ม.</b></span>
                                <span className="text-slate-500">(เป้า Std: {stdMttr} ม.)</span>
                                <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${isDelayed ? 'bg-rose-500/10 text-rose-400 border border-rose-500/10' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'}`}>
                                  {isDelayed ? `เกินเฉลี่ย +${rep.duration - stdMttr}ม.` : 'เสร็จตามเวลา'}
                                </span>
                              </div>
                            </div>

                            {/* Symptoms & Action */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-900/30 p-2.5 rounded-lg border border-slate-850/60">
                              <div>
                                <p className="font-black text-rose-300 text-[10.5px]">อาการขัดข้องเสียชำรุด:</p>
                                <p className="text-slate-200 mt-0.5 text-[11px] font-medium">{rep.symptoms}</p>
                              </div>
                              <div>
                                <p className="font-black text-emerald-300 text-[10.5px]">การดำเนินการซ่อมบำรุง / มาตรการกู้แก้:</p>
                                <p className="text-slate-200 mt-0.5 text-[11px] font-medium">
                                  {rep.correctiveAction || currentData.countermeasure || 'ดำเนินการซ่อมปรับปรุงชุดทำงานเพื่อพร้อมผลิต'}
                                </p>
                              </div>
                            </div>

                            {/* Display Why-Why Analysis */}
                            <div className="space-y-2 pt-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <span>🔍 ผลวิเคราะห์วิศวกรรม Why-Why Analysis 5ระดับ:</span>
                              </p>
                              
                              <div className="grid grid-cols-5 gap-1.5 text-[10px]">
                                <div className="p-2 bg-slate-900 border border-slate-850 rounded">
                                  <span className="text-rose-400 font-bold block text-[9px]">Why 1?</span>
                                  <p className="text-slate-350 block leading-tight text-[10px] break-words mt-0.5 whitespace-pre-line" title={currentData.why1 || rep.why1 || '-'}>
                                    {currentData.why1 || rep.why1 || '-'}
                                  </p>
                                </div>
                                <div className="p-2 bg-slate-900 border border-slate-850 rounded">
                                  <span className="text-rose-400 font-bold block text-[9px]">Why 2?</span>
                                  <p className="text-slate-350 block leading-tight text-[10px] break-words mt-0.5 whitespace-pre-line" title={currentData.why2 || rep.why2 || '-'}>
                                    {currentData.why2 || rep.why2 || '-'}
                                  </p>
                                </div>
                                <div className="p-2 bg-slate-900 border border-slate-850 rounded">
                                  <span className="text-rose-400 font-bold block text-[9px]">Why 3?</span>
                                  <p className="text-slate-350 block leading-tight text-[10px] break-words mt-0.5 whitespace-pre-line" title={currentData.why3 || rep.why3 || '-'}>
                                    {currentData.why3 || rep.why3 || '-'}
                                  </p>
                                </div>
                                <div className="p-2 bg-slate-900 border border-slate-850 rounded">
                                  <span className="text-rose-400 font-bold block text-[9px]">Why 4?</span>
                                  <p className="text-slate-350 block leading-tight text-[10px] break-words mt-0.5 whitespace-pre-line" title={currentData.why4 || rep.why4 || '-'}>
                                    {currentData.why4 || rep.why4 || '-'}
                                  </p>
                                </div>
                                <div className="p-2 bg-slate-900 border border-slate-850 rounded">
                                  <span className="text-rose-400 font-bold block text-[9px]">Why 5?</span>
                                  <p className="text-slate-350 block leading-tight text-[10px] break-words mt-0.5 whitespace-pre-line" title={currentData.why5 || rep.why5 || '-'}>
                                    {currentData.why5 || rep.why5 || '-'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex justify-end shrink-0">
              <button 
                onClick={() => setSelectedMachineForHistory(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
