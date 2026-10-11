import React, { useState, useRef, useMemo } from 'react';
import { Machine, PMPlan, PMFrequency, PMStep, PMScheduleItem } from '../types';
import { useApp } from '../context/AppContext';
import { 
  FileSpreadsheet, Upload, Download, Sparkles, X, CheckCircle2, 
  AlertTriangle, Search, Check, Layers, ArrowRight, ShieldCheck,
  Calendar, Clock, Wrench, Plus, Trash2, Edit3, Filter, RefreshCw,
  Eye, FileText, CheckSquare, Square
} from 'lucide-react';
import { 
  parsePMExcelMultiMode, 
  downloadPMMasterTableTemplateExcel,
  downloadPMTemplateExcel,
  FQMS_SAMPLE_STEPS,
  ParsedPMPlanItem,
  matchMachineFromDatabase
} from '../utils/pmExcelParser';
import { getTodayDateString } from '../utils/pmAlerts';

interface PMExcelImportModalProps {
  machines?: Machine[];
  selectedMachineId?: string;
  onClose: () => void;
  onImport?: (plans: PMPlan[]) => void;
}

export const PMExcelImportModal: React.FC<PMExcelImportModalProps> = ({
  machines: propMachines,
  selectedMachineId: propSelectedMachineId,
  onClose,
  onImport
}) => {
  const { machines: appMachines, setMachines, setPmPlans, setSchedules, currentUser } = useApp();
  const machines = propMachines || appMachines;
  const initialMachineId = propSelectedMachineId || machines[0]?.id || 'ATS01';

  // Import Mode / Source
  const [activeTab, setActiveTab] = useState<'upload' | 'sample'>('upload');
  
  // Drag & drop / File state
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [parseError, setParseError] = useState<string>('');
  const [detectionMode, setDetectionMode] = useState<'master_table' | 'fqms_doc'>('master_table');

  // Parsed and Editable Plans List
  const [parsedPlans, setParsedPlans] = useState<ParsedPMPlanItem[]>([]);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);

  // Search & Filters in preview table
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFrequency, setFilterFrequency] = useState<string>('ALL');

  // Bulk Settings & Registry Sync
  const [bulkDate, setBulkDate] = useState<string>(getTodayDateString());
  const [autoCreateSchedule, setAutoCreateSchedule] = useState<boolean>(true);
  const [syncRanksToRegistry, setSyncRanksToRegistry] = useState<boolean>(true);

  // Detail Steps Editor Modal
  const [editingPlanStepsIndex, setEditingPlanStepsIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Process file buffer with multi-mode parser
  const processBuffer = (buffer: ArrayBuffer, fileName: string, targetSheet?: string) => {
    try {
      setParseError('');
      setUploadedFileName(fileName);
      setFileBuffer(buffer);

      const result = parsePMExcelMultiMode(buffer, machines, targetSheet);
      setSheetNames(result.sheetNames);
      setSelectedSheet(result.selectedSheet);
      setDetectionMode(result.mode);
      setParsedPlans(result.plans);
      setSelectedPlanIds(result.plans.map(p => p.tempId));
    } catch (err: any) {
      console.error(err);
      setParseError(err.message || 'เกิดข้อผิดพลาดในการอ่านไฟล์ Excel กรุณาตรวจสอบรูปแบบไฟล์');
      setParsedPlans([]);
      setSelectedPlanIds([]);
    }
  };

  const handleFileProcess = async (file: File) => {
    const buffer = await file.arrayBuffer();
    processBuffer(buffer, file.name);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.match(/\.(xlsx|xls|csv)$/i)) {
        handleFileProcess(file);
      } else {
        setParseError('รองรับเฉพาะไฟล์ .xlsx, .xls หรือ .csv เท่านั้น');
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleSheetChange = (sheetName: string) => {
    if (!fileBuffer) return;
    processBuffer(fileBuffer, uploadedFileName, sheetName);
  };

  // Quick Load Demo 1: Multi-Machine Master PM Plan (Mapping to app's machines)
  const handleLoadSampleMasterTable = () => {
    setParseError('');
    setUploadedFileName('ตัวอย่าง_แผนงาน_PM_Master_Table_หลายเครื่องจักร.xlsx');
    setDetectionMode('master_table');
    setSheetNames(['PM_Master_Plan']);
    setSelectedSheet('PM_Master_Plan');

    const today = getTodayDateString();
    const demoPlans: ParsedPMPlanItem[] = [
      {
        tempId: `demo-1-${Date.now()}`,
        machineId: 'ATS01',
        machineName: 'เครื่อง AUTOMATIC TOPSEAL',
        location: 'Line 2',
        lineGroup: 'Line 2',
        machineRank: 'A',
        detectedRankParen: '(1)',
        detectedRankNum: 1,
        title: 'ตรวจเช็คระบบฮีตเตอร์และใบมีดซีลถาด (Heater & Blade Inspection)',
        frequency: 'รายเดือน',
        scheduledDate: today,
        ttm: 60,
        spareParts: 'ซีลยาง Food Grade, ใบมีดตัดฟิล์ม, ลวดฮีตเตอร์สำรอง',
        signTech: 'ช่างอุ้ย',
        steps: [
          { itemNo: 1, title: 'ตรวจสอบสภาพใบมีดตัดฟิล์ม และ Seal Plate', method: 'มือ สายตา', standard: 'สะอาดไม่มีคราบ สะบัดคมดี', frequency: '1 เดือน/ครั้ง', stdTime: 15, remark: '' },
          { itemNo: 2, title: 'ตรวจเช็ค Heater และวัดอุณหภูมิความร้อน', method: 'เครื่องมือวัด', standard: 'อุณหภูมิอยู่ในเกณฑ์ 130-140C ไม่แกว่ง', frequency: '1 เดือน/ครั้ง', stdTime: 20, remark: '' },
          { itemNo: 3, title: 'ตรวจเช็คสายพาน In-Out Feed และมอเตอร์', method: 'ดูด้วยสายตา', standard: 'สายพานตึงเหมาะสม ไม่ฉีกขาด', frequency: '1 เดือน/ครั้ง', stdTime: 15, remark: '' },
          { itemNo: 4, title: 'ทดสอบเดินเครื่องวัด Cycle การทำงานและระบบ Safety', method: 'ประสาทสัมผัสทั้ง 5', standard: 'Sensor ทำงานปกติ ปุ่ม Emergency ตัดไฟสมบูรณ์', frequency: '1 เดือน/ครั้ง', stdTime: 10, remark: '' }
        ],
        mappingStatus: 'exact',
        originalMachineCode: 'ATS01 (1)',
        originalMachineName: 'AUTOMATIC TOPSEAL Line 2 (1)'
      },
      {
        tempId: `demo-2-${Date.now()}`,
        machineId: 'RIM01',
        machineName: 'RICE MIXER 01',
        location: 'Rice Room',
        lineGroup: 'Rice Room',
        machineRank: 'A',
        detectedRankParen: '(1)',
        detectedRankNum: 1,
        title: 'ตรวจเช็คชุดเกียร์ขับและลูกปืนเพลาผสมข้าว (Rice Mixer Gearbox & Bearing)',
        frequency: 'ราย 3 เดือน',
        scheduledDate: today,
        ttm: 90,
        spareParts: 'น้ำมันเกียร์สังเคราะห์ Food Grade, ซีลยางเพลา NBR',
        signTech: 'ช่างโอเว่น',
        steps: [
          { itemNo: 1, title: 'ตรวจเช็คระดับน้ำมันเกียร์และจุดรั่วซึมรอบซีลเพลา', method: 'ดูด้วยสายตา', standard: 'ระดับน้ำมันอยู่ในเกณฑ์ ไม่รั่วซึม', frequency: '3 เดือน/ครั้ง', stdTime: 20, remark: '' },
          { itemNo: 2, title: 'อัดจาระบีสังเคราะห์ชุดลูกปืนเพลาผสมข้าว', method: 'เครื่องมือ', standard: 'อัดจาระบีจนเต็มเบ้า หมุนลื่น', frequency: '3 เดือน/ครั้ง', stdTime: 30, remark: '' },
          { itemNo: 3, title: 'ตรวจสอบใบกวนผสมข้าว และทำความสะอาดคราบแป้ง', method: 'มือ สายตา', standard: 'ใบกวนไม่สึกหรอ ผิวเรียบ', frequency: '3 เดือน/ครั้ง', stdTime: 20, remark: '' },
          { itemNo: 4, title: 'ตรวจเช็คกระแสไฟฟ้ามอเตอร์และทดสอบวัดอุณหภูมิ', method: 'เครื่องมือวัด', standard: 'กระแสไม่เกิน 8.5 A อุณหภูมิ < 65C', frequency: '3 เดือน/ครั้ง', stdTime: 20, remark: '' }
        ],
        mappingStatus: 'exact',
        originalMachineCode: 'RIM01 (1)',
        originalMachineName: 'เครื่องผสมข้าว RICE MIXER 01 (1)'
      },
      {
        tempId: `demo-3-${Date.now()}`,
        machineId: 'BCH01',
        machineName: 'BLAST CHILLER',
        location: 'Blast Room',
        lineGroup: 'Blast Room',
        machineRank: 'B',
        detectedRankParen: '(2)',
        detectedRankNum: 2,
        title: 'ล้างทำความสะอาดคอนเดนเซอร์และเช็คน้ำยาทำความเย็น (Condenser Cleaning & Freon Check)',
        frequency: 'รายเดือน',
        scheduledDate: today,
        ttm: 45,
        spareParts: 'ฟิลเตอร์แอร์, น้ำยาทำความสะอาดคอยล์',
        signTech: 'ช่างเซฟ',
        steps: [
          { itemNo: 1, title: 'ล้างทำความสะอาดแผงคอยล์ร้อนคอนเดนเซอร์', method: 'น้ำยา/สายลม', standard: 'แผงสะอาด ไม่มีฝุ่นเกาะระบายความร้อนได้ดี', frequency: '1 เดือน/ครั้ง', stdTime: 20, remark: '' },
          { itemNo: 2, title: 'ตรวจวัดแรงดันน้ำยาทำความเย็น Hi/Low Pressure', method: 'เกจวัดแรงดัน', standard: 'แรงดันอยู่ในช่วงมาตรฐาน R404A', frequency: '1 เดือน/ครั้ง', stdTime: 15, remark: '' },
          { itemNo: 3, title: 'ตรวจสอบพัดลมระบายความร้อนและเสียงลูกปืน', method: 'ประสาทสัมผัส', standard: 'พัดลมหมุนคล่อง ไม่มีเสียงดังผิดปกติ', frequency: '1 เดือน/ครั้ง', stdTime: 10, remark: '' }
        ],
        mappingStatus: 'exact',
        originalMachineCode: 'BCH01 (2)',
        originalMachineName: 'BLAST CHILLER (2)'
      },
      {
        tempId: `demo-4-${Date.now()}`,
        machineId: 'VEG01',
        machineName: 'VEGETABLE WASHER',
        location: 'Vegetable Processing',
        lineGroup: 'Vegetable Processing',
        machineRank: 'C',
        detectedRankParen: '(3)',
        detectedRankNum: 3,
        title: 'ตรวจเช็คปั๊มน้ำวนและระบบเป่าลมสะเด็ดน้ำ (Wash Pump & Air Knife)',
        frequency: 'รายสัปดาห์',
        scheduledDate: today,
        ttm: 30,
        spareParts: 'โอริงปั๊มน้ำ, ซีลกันน้ำสแตนเลส',
        signTech: 'ช่างปอ',
        steps: [
          { itemNo: 1, title: 'ตรวจสอบการทำงานของปั๊มน้ำวนและแรงดันน้ำ', method: 'ดูด้วยสายตา', standard: 'แรงดันน้ำสม่ำเสมอ ปั๊มไม่สั่นสะเทือน', frequency: '1 สัปดาห์/ครั้ง', stdTime: 10, remark: '' },
          { itemNo: 2, title: 'ล้างทำความสะอาดตะแกรงกรองเศษผักและหัวฉีด', method: 'สายตา/มือ', standard: 'ไม่มีเศษผักอุดตัน น้ำไหลผ่านสะดวก', frequency: '1 สัปดาห์/ครั้ง', stdTime: 10, remark: '' },
          { itemNo: 3, title: 'ตรวจเช็คพัดลมเป่าลมสะเด็ดน้ำ Air Blower', method: 'เครื่องมือวัด', standard: 'แรงลมสม่ำเสมอ แผ่นกรองลมสะอาด', frequency: '1 สัปดาห์/ครั้ง', stdTime: 10, remark: '' }
        ],
        mappingStatus: 'exact',
        originalMachineCode: 'VEG01 (3)',
        originalMachineName: 'เครื่องล้างผัก VEGETABLE WASHER (3)'
      }
    ];

    setParsedPlans(demoPlans);
    setSelectedPlanIds(demoPlans.map(p => p.tempId));
  };

  // Quick Load Demo 2: Standard F-QMS-011/12 (21 Steps)
  const handleLoadSampleFQMS = () => {
    setParseError('');
    setUploadedFileName('ตัวอย่าง_ใบรายงาน_PM_FQMS_011_12_ATS01.xlsx');
    setDetectionMode('fqms_doc');
    setSheetNames(['PM_Plan_F-QMS-011-12']);
    setSelectedSheet('PM_Plan_F-QMS-011-12');

    const machObj = machines.find(m => m.id === initialMachineId) || machines[0];
    const targetId = machObj?.id || 'ATS01';
    const targetName = machObj?.name || 'เครื่อง AUTOMATIC TOPSEAL';
    const targetLoc = machObj?.lineGroup || machObj?.location || 'Line 2';

    const fqmsPlan: ParsedPMPlanItem = {
      tempId: `fqms-${Date.now()}`,
      machineId: targetId,
      machineName: targetName,
      location: targetLoc,
      lineGroup: targetLoc,
      title: `ใบรายงาน Preventive Maintenance (PM) - ${targetName}`,
      frequency: 'รายเดือน',
      scheduledDate: getTodayDateString(),
      ttm: FQMS_SAMPLE_STEPS.reduce((sum, s) => sum + s.stdTime, 0),
      spareParts: 'จาระบีลูกปืนเกรดอาหาร NSF-H1, ซีลยาง, ซีล Plate, ใบมีดตัดฟิล์ม, ลวดฮีตเตอร์สำรอง',
      signTech: 'ทีมช่างซ่อมบำรุง',
      signProd: 'ฝ่ายผลิต',
      signLeader: 'หัวหน้าหน่วย PM',
      docCode: 'F-QMS-011/12',
      revision: '00',
      effectiveDate: '16-07-2019',
      steps: FQMS_SAMPLE_STEPS.map(s => ({ ...s })),
      mappingStatus: 'exact',
      originalMachineCode: targetId,
      originalMachineName: targetName
    };

    setParsedPlans([fqmsPlan]);
    setSelectedPlanIds([fqmsPlan.tempId]);
  };

  // Toggle selection
  const handleToggleSelectPlan = (tempId: string) => {
    setSelectedPlanIds(prev => 
      prev.includes(tempId) ? prev.filter(id => id !== tempId) : [...prev, tempId]
    );
  };

  const handleSelectAll = () => {
    if (selectedPlanIds.length === filteredPlans.length) {
      setSelectedPlanIds([]);
    } else {
      setSelectedPlanIds(filteredPlans.map(p => p.tempId));
    }
  };

  // Inline edit plan field
  const handleUpdatePlanField = (tempId: string, field: keyof ParsedPMPlanItem, value: any) => {
    setParsedPlans(prev => prev.map(p => {
      if (p.tempId !== tempId) return p;

      if (field === 'machineId') {
        const selectedMach = machines.find(m => m.id === value);
        return {
          ...p,
          machineId: value,
          machineName: selectedMach?.name || p.machineName,
          location: selectedMach?.lineGroup || selectedMach?.location || p.location,
          lineGroup: selectedMach?.lineGroup || selectedMach?.location || p.lineGroup,
          machineRank: (selectedMach?.ranking as any) || p.machineRank,
          mappingStatus: 'exact'
        };
      }

      if (field === 'machineRank') {
        const rVal = value as 'A' | 'B' | 'C';
        return {
          ...p,
          machineRank: rVal,
          detectedRankNum: rVal === 'A' ? 1 : rVal === 'B' ? 2 : 3
        };
      }

      return { ...p, [field]: value };
    }));
  };

  // Apply Bulk Date
  const handleApplyBulkDate = () => {
    if (!bulkDate) return;
    setParsedPlans(prev => prev.map(p => ({
      ...p,
      scheduledDate: bulkDate
    })));
  };

  // Delete plan row
  const handleDeletePlanRow = (tempId: string) => {
    setParsedPlans(prev => prev.filter(p => p.tempId !== tempId));
    setSelectedPlanIds(prev => prev.filter(id => id !== tempId));
  };

  // Add a manual blank plan row
  const handleAddManualRow = () => {
    const firstMach = machines[0] || { id: 'ATS01', name: 'AUTOMATIC TOPSEAL', lineGroup: 'Line 2' };
    const newPlan: ParsedPMPlanItem = {
      tempId: `manual-pm-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      machineId: firstMach.id,
      machineName: firstMach.name,
      location: firstMach.lineGroup || 'Line 2',
      lineGroup: firstMach.lineGroup || 'Line 2',
      title: 'แผนการตรวจเช็คบำรุงรักษาใหม่',
      frequency: 'รายเดือน',
      scheduledDate: bulkDate || getTodayDateString(),
      ttm: 30,
      spareParts: 'จาระบี Food Grade, ซีลยางสำรอง',
      signTech: currentUser?.name || 'ทีมช่างซ่อมบำรุง',
      steps: [
        { itemNo: 1, title: 'ตรวจสอบสภาพภายนอกและโครงสร้าง', method: 'ดูด้วยสายตา', standard: 'โครงสร้างสมบูรณ์', frequency: '1 เดือน/ครั้ง', stdTime: 10, remark: '' },
        { itemNo: 2, title: 'ตรวจเช็คระบบไฟและจุดยึด', method: 'เครื่องมือ', standard: 'จุดเชื่อมต่อแน่นหนา', frequency: '1 เดือน/ครั้ง', stdTime: 10, remark: '' },
        { itemNo: 3, title: 'ทดสอบการทำงานของเครื่องจักร', method: 'ประสาทสัมผัส', standard: 'ทำงานปกติ ไม่มีเสียงดัง', frequency: '1 เดือน/ครั้ง', stdTime: 10, remark: '' }
      ],
      mappingStatus: 'exact'
    };
    setParsedPlans(prev => [newPlan, ...prev]);
    setSelectedPlanIds(prev => [newPlan.tempId, ...prev]);
  };

  // Filtered plans
  const filteredPlans = useMemo(() => {
    return parsedPlans.filter(p => {
      const matchSearch = 
        p.machineId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.machineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.location && p.location.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchFreq = filterFrequency === 'ALL' || p.frequency === filterFrequency;
      return matchSearch && matchFreq;
    });
  }, [parsedPlans, searchQuery, filterFrequency]);

  // Execute Import
  const handleExecuteImport = () => {
    const plansToImport = parsedPlans.filter(p => selectedPlanIds.includes(p.tempId));
    if (plansToImport.length === 0) {
      alert('กรุณาเลือกรายการแผนงาน PM อย่างน้อย 1 รายการเพื่อนำเข้า');
      return;
    }

    const createdPMPlans: PMPlan[] = [];
    const createdSchedules: PMScheduleItem[] = [];

    plansToImport.forEach((item, idx) => {
      const planId = `plan-pm-${Date.now()}-${item.machineId}-${idx}`;
      
      const newPlan: PMPlan = {
        id: planId,
        machineId: item.machineId,
        machineName: item.machineName,
        title: item.title,
        frequency: item.frequency,
        steps: item.steps.map(s => ({ ...s })),
        spareParts: item.spareParts || '',
        ttm: item.ttm || item.steps.reduce((sum, s) => sum + (s.stdTime || 0), 0),
        docCode: item.docCode || 'F-QMS-011/12',
        revision: item.revision || '00',
        effectiveDate: item.effectiveDate || '16-07-2019',
        signTech: item.signTech || 'ทีมช่างซ่อมบำรุง',
        signProd: item.signProd || 'ฝ่ายผลิต',
        signLeader: item.signLeader || 'หัวหน้าหน่วย PM',
        nextDueDate: item.scheduledDate || getTodayDateString(),
        intervalDays: item.frequency === 'รายวัน' ? 1 :
                      item.frequency === 'รายสัปดาห์' ? 7 :
                      item.frequency === 'ราย 2 สัปดาห์' ? 14 :
                      item.frequency === 'รายเดือน' ? 30 :
                      item.frequency === 'ราย 3 เดือน' ? 90 :
                      item.frequency === 'ราย 6 เดือน' ? 180 : 365
      };

      createdPMPlans.push(newPlan);

      // Auto create PMScheduleItem if requested
      if (autoCreateSchedule && item.scheduledDate) {
        createdSchedules.push({
          id: `sched-pm-${Date.now()}-${item.machineId}-${idx}`,
          type: 'PM',
          machineId: item.machineId,
          pmPlanId: planId,
          technician: item.signTech || currentUser?.name || 'ช่างซ่อมบำรุง',
          technicians: [item.signTech || currentUser?.name || 'ช่างซ่อมบำรุง'],
          date: item.scheduledDate,
          duration: item.ttm || 30,
          status: 'รอดำเนินการ',
          title: item.title,
          notes: item.notes || `นำเข้าจากไฟล์ Excel ${uploadedFileName || ''}`
        });
      }
    });

    // Save PM Plans and Schedules into state
    setPmPlans(prev => [...prev, ...createdPMPlans]);
    if (createdSchedules.length > 0) {
      setSchedules(prev => [...prev, ...createdSchedules]);
    }

    // Sync Machine Ranks into Machine Registry (ทะเบียนเครื่องจักร)
    const plansWithRanks = plansToImport.filter(p => p.machineRank);
    if (syncRanksToRegistry && plansWithRanks.length > 0) {
      setMachines(prevMachines => {
        const updated = prevMachines.map(m => {
          const matchedPlan = plansWithRanks.find(p => p.machineId.toUpperCase() === m.id.toUpperCase());
          if (matchedPlan && matchedPlan.machineRank) {
            return {
              ...m,
              ranking: matchedPlan.machineRank
            };
          }
          return m;
        });

        // Auto-register any brand new machines discovered in the imported plans
        plansToImport.forEach(p => {
          const exists = updated.some(m => m.id.toUpperCase() === p.machineId.toUpperCase());
          if (!exists && p.machineId) {
            updated.push({
              id: p.machineId.trim().toUpperCase(),
              name: p.machineName.trim() || p.machineId.trim().toUpperCase(),
              lineGroup: p.location || p.lineGroup || 'ทั่วไป',
              location: p.location || p.lineGroup || 'ทั่วไป',
              ranking: p.machineRank || 'B',
              status: 'ปกติ',
              plannedProductionHours: 600
            });
          }
        });

        return updated;
      });
    }

    if (onImport) {
      onImport(createdPMPlans);
    }

    const rankMsg = syncRanksToRegistry && plansWithRanks.length > 0
      ? `\n✨ อัปเดต Rank เข้าสู่ทะเบียนเครื่องจักรแล้ว ${plansWithRanks.length} เครื่อง!`
      : '';

    alert(`นำเข้าแผนงาน PM สำเร็จจำนวน ${createdPMPlans.length} รายการ!\n${createdSchedules.length > 0 ? `พร้อมลงกำหนดการทำ PM ในปฏิทิน & TBM Datamatrix แล้ว ${createdSchedules.length} งาน!` : ''}${rankMsg}`);
    onClose();
  };

  // Step editing helper
  const editingPlan = editingPlanStepsIndex !== null ? parsedPlans[editingPlanStepsIndex] : null;

  const handleUpdateStep = (stepIdx: number, field: keyof PMStep, val: any) => {
    if (editingPlanStepsIndex === null) return;
    setParsedPlans(prev => {
      const copy = [...prev];
      const plan = { ...copy[editingPlanStepsIndex] };
      const stepsCopy = [...plan.steps];
      stepsCopy[stepIdx] = { ...stepsCopy[stepIdx], [field]: val };
      plan.steps = stepsCopy;
      plan.ttm = stepsCopy.reduce((sum, s) => sum + (Number(s.stdTime) || 0), 0);
      copy[editingPlanStepsIndex] = plan;
      return copy;
    });
  };

  const handleAddStepToPlan = () => {
    if (editingPlanStepsIndex === null) return;
    setParsedPlans(prev => {
      const copy = [...prev];
      const plan = { ...copy[editingPlanStepsIndex] };
      plan.steps = [
        ...plan.steps,
        {
          itemNo: plan.steps.length + 1,
          title: 'การตรวจเช็คขั้นตอนใหม่',
          method: 'ดูด้วยสายตา',
          standard: 'สภาพสมบูรณ์ พร้อมใช้งาน',
          frequency: plan.frequency || '1 เดือน/ครั้ง',
          stdTime: 10,
          remark: ''
        }
      ];
      plan.ttm = plan.steps.reduce((sum, s) => sum + (Number(s.stdTime) || 0), 0);
      copy[editingPlanStepsIndex] = plan;
      return copy;
    });
  };

  const handleDeleteStepFromPlan = (stepIdx: number) => {
    if (editingPlanStepsIndex === null) return;
    setParsedPlans(prev => {
      const copy = [...prev];
      const plan = { ...copy[editingPlanStepsIndex] };
      if (plan.steps.length <= 1) return prev; // Keep at least one
      plan.steps = plan.steps.filter((_, idx) => idx !== stepIdx);
      plan.ttm = plan.steps.reduce((sum, s) => sum + (Number(s.stdTime) || 0), 0);
      copy[editingPlanStepsIndex] = plan;
      return copy;
    });
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-7xl w-full max-h-[96vh] flex flex-col shadow-2xl text-slate-200 overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-slate-950 border-b border-slate-800 px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  นำเข้าแผน PM จากไฟล์ Excel (PM Excel Import)
                </h2>
                <span className="text-[11px] bg-cyan-500/10 text-cyan-400 px-2.5 py-0.5 rounded-full font-mono font-bold border border-cyan-500/20">
                  รองรับฟอร์มเดิม + กำหนดวันทำได้ทันที + แก้ไขได้ในตัว
                </span>
              </div>
              <p className="text-xs text-slate-400">
                รองรับไฟล์ตารางแผน PM Master Table และแบบฟอร์ม F-QMS-011/12 พร้อมระบบจับคู่รหัสเครื่องจักรอัตโนมัติจากฐานข้อมูล
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Sub-Header Toolbar: Templates & Quick Demos */}
        <div className="bg-slate-900/90 border-b border-slate-800/80 px-5 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">📥 ดาวน์โหลดเทมเพลต:</span>
            <button
              type="button"
              onClick={() => downloadPMMasterTableTemplateExcel(machines)}
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer"
              title="ดาวน์โหลดไฟล์ Template แบบตารางแผน PM รวมหลายเครื่องจักร (มีคอลัมน์รหัสเครื่อง, วันที่, ขั้นตอน)"
            >
              <Download size={13} />
              <span>ตารางแผน PM Master (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={() => downloadPMTemplateExcel(initialMachineId, machines.find(m => m.id === initialMachineId)?.name)}
              className="inline-flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer"
              title="ดาวน์โหลดเทมเพลตแบบฟอร์มมาตรฐาน F-QMS-011/12"
            >
              <Download size={13} />
              <span>แบบฟอร์ม F-QMS-011/12 (.xlsx)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">💡 โหลดตัวอย่างทดสอบ:</span>
            <button
              type="button"
              onClick={handleLoadSampleMasterTable}
              className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer"
            >
              <Sparkles size={13} />
              <span>ตัวอย่างแผนรวม 4 เครื่อง</span>
            </button>

            <button
              type="button"
              onClick={handleLoadSampleFQMS}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer"
            >
              <Sparkles size={13} />
              <span>ตัวอย่าง F-QMS 21 ขั้นตอน</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* UPLOAD / DROP ZONE */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-5 sm:p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2.5 ${
              isDragging 
                ? 'border-emerald-500 bg-emerald-500/10 scale-[0.99]' 
                : uploadedFileName
                  ? 'border-emerald-500/50 bg-slate-950/70 hover:border-emerald-400'
                  : 'border-slate-700 bg-slate-950/40 hover:border-slate-600 hover:bg-slate-950/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Upload size={24} />
            </div>

            {uploadedFileName ? (
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                  <CheckCircle2 size={14} />
                  <span>โหลดไฟล์สำเร็จ: {uploadedFileName}</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">
                    {detectionMode === 'fqms_doc' ? 'ฟอร์ม F-QMS-011/12' : 'ตารางแผน PM Master'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  พบข้อมูล <strong className="text-white">{parsedPlans.length} รายการ</strong> • คลิกหรือลากไฟล์ใหม่มาวางเพื่อสลับไฟล์
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-bold text-slate-200">
                  ลากไฟล์ Excel (.xlsx, .xls) หรือ .csv มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
                </p>
                <p className="text-[11px] text-slate-400">
                  ระบบจะตรวจหารหัสเครื่องจักร, ชื่อเครื่อง, ตำแหน่ง, ความถี่, วันที่จะทำ, และขั้นตอนย่อยให้อัตโนมัติ
                </p>
              </div>
            )}

            {/* Sheet Selector if multiple sheets exist */}
            {sheetNames.length > 1 && (
              <div className="mt-2 flex items-center gap-2 text-xs bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg" onClick={(e) => e.stopPropagation()}>
                <span className="text-slate-400 font-medium">เลือกแผ่นงาน (Sheet):</span>
                <select
                  value={selectedSheet}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                >
                  {sheetNames.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {parseError && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose-400 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* PARSED PLANS REVIEW, EDIT, & MAPPING SECTION */}
          {parsedPlans.length > 0 && (
            <div className="space-y-3 pt-2">
              
              {/* Toolbar: Stats & Bulk Actions */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="p-1 rounded text-cyan-400 hover:text-cyan-300 cursor-pointer"
                      title="เลือก/ยกเลิกทั้งหมด"
                    >
                      {selectedPlanIds.length === filteredPlans.length && filteredPlans.length > 0 ? (
                        <CheckSquare size={18} />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                    <span className="text-xs font-bold text-white">
                      เลือกแล้ว <strong className="text-emerald-400 font-mono">{selectedPlanIds.length}</strong> / {parsedPlans.length} รายการ
                    </span>
                  </div>

                  <span className="text-slate-700">|</span>

                  {/* Bulk Date Setter */}
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar size={14} className="text-cyan-400" />
                    <span className="text-slate-300 font-medium">กำหนดวันที่จะทำทั้งหมด:</span>
                    <input
                      type="date"
                      value={bulkDate}
                      onChange={(e) => setBulkDate(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={handleApplyBulkDate}
                      className="px-2 py-1 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 rounded font-semibold transition cursor-pointer"
                      title="นำวันที่นี้ไปใช้กับทุกแถว"
                    >
                      ปรับใช้ทุกแถว
                    </button>
                  </div>
                </div>

                {/* Right options: Auto Schedule & Add Row */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-750 hover:border-slate-650 transition">
                    <input
                      type="checkbox"
                      checked={syncRanksToRegistry}
                      onChange={(e) => setSyncRanksToRegistry(e.target.checked)}
                      className="rounded text-rose-500 focus:ring-rose-500/30"
                    />
                    <span className="font-semibold text-rose-300">🏷️ บันทึก Rank ไปยังทะเบียนเครื่องจักร</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-750 hover:border-slate-650 transition">
                    <input
                      type="checkbox"
                      checked={autoCreateSchedule}
                      onChange={(e) => setAutoCreateSchedule(e.target.checked)}
                      className="rounded text-emerald-500 focus:ring-emerald-500/30"
                    />
                    <span>📅 ลงกำหนดการในปฏิทิน & TBM ทันที</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleAddManualRow}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer"
                  >
                    <Plus size={14} className="text-emerald-400" />
                    <span>เพิ่มแถวใหม่</span>
                  </button>
                </div>
              </div>

              {/* Filter / Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="relative flex-1 w-full sm:max-w-xs">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="ค้นหารหัสเครื่อง, ชื่องาน, ไลน์ผลิต..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs">
                  <Filter size={14} className="text-slate-500" />
                  <span className="text-slate-400">กรองความถี่:</span>
                  <select
                    value={filterFrequency}
                    onChange={(e) => setFilterFrequency(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ALL">ทั้งหมด ({parsedPlans.length})</option>
                    <option value="รายวัน">รายวัน</option>
                    <option value="รายสัปดาห์">รายสัปดาห์</option>
                    <option value="ราย 2 สัปดาห์">ราย 2 สัปดาห์</option>
                    <option value="รายเดือน">รายเดือน</option>
                    <option value="ราย 3 เดือน">ราย 3 เดือน</option>
                    <option value="ราย 6 เดือน">ราย 6 เดือน</option>
                    <option value="รายปี">รายปี</option>
                  </select>
                </div>
              </div>

              {/* PREVIEW TABLE WITH INLINE EDIT & MAPPING */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <div className="max-h-[50vh] overflow-x-auto overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-[11px] font-bold text-slate-300 z-10">
                      <tr>
                        <th className="p-2.5 text-center w-10">เลือก</th>
                        <th className="p-2.5 w-12 text-center">#</th>
                        <th className="p-2.5 w-56">เครื่องจักรเป้าหมาย (Auto-Mapped)</th>
                        <th className="p-2.5 w-32 text-center">Rank (ในวงเล็บ)</th>
                        <th className="p-2.5 min-w-[200px]">หัวข้องาน PM</th>
                        <th className="p-2.5 w-28 text-center">ความถี่</th>
                        <th className="p-2.5 w-36">วันที่จะทำ (Scheduled)</th>
                        <th className="p-2.5 w-20 text-center">เวลา TTM</th>
                        <th className="p-2.5 w-28 text-center">ขั้นตอนงาน</th>
                        <th className="p-2.5 w-40">อะไหล่ที่ต้องใช้</th>
                        <th className="p-2.5 w-12 text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {filteredPlans.map((plan, idx) => {
                        const isSelected = selectedPlanIds.includes(plan.tempId);
                        const actualIdx = parsedPlans.findIndex(p => p.tempId === plan.tempId);

                        return (
                          <tr 
                            key={plan.tempId} 
                            className={`transition ${isSelected ? 'bg-slate-900/40 hover:bg-slate-900/70' : 'bg-slate-950 opacity-60 hover:opacity-100'}`}
                          >
                            {/* Checkbox */}
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectPlan(plan.tempId)}
                                className="rounded text-cyan-500 focus:ring-cyan-500/30 cursor-pointer"
                              />
                            </td>

                            {/* Row Index */}
                            <td className="p-2.5 text-center font-mono text-slate-500 text-[11px]">
                              {idx + 1}
                            </td>

                            {/* Target Machine Mapping Dropdown */}
                            <td className="p-2.5">
                              <div className="space-y-1">
                                <select
                                  value={plan.machineId}
                                  onChange={(e) => handleUpdatePlanField(plan.tempId, 'machineId', e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-500"
                                >
                                  {machines.map(m => (
                                    <option key={m.id} value={m.id}>
                                      [{m.id}] {m.name} ({m.lineGroup || m.location || 'Line 2'})
                                    </option>
                                  ))}
                                </select>

                                {/* Mapping Badge */}
                                <div className="flex items-center gap-1.5 text-[10px]">
                                  {plan.mappingStatus === 'exact' ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-medium">
                                      <Check size={10} /> แมปตรงในระบบ
                                    </span>
                                  ) : plan.mappingStatus === 'fuzzy' ? (
                                    <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 font-medium">
                                      แมปคล้ายคลึง
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700 font-medium">
                                      เลือกจาก Dropdown
                                    </span>
                                  )}
                                  {plan.location && (
                                    <span className="text-slate-400 truncate">({plan.location})</span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Machine Rank Column (ตัวเลขในวงเล็บ) */}
                            <td className="p-2.5 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <select
                                  value={plan.machineRank || 'B'}
                                  onChange={(e) => handleUpdatePlanField(plan.tempId, 'machineRank', e.target.value)}
                                  className={`text-xs font-bold font-mono rounded-lg px-2 py-1 border transition-all cursor-pointer focus:outline-none shadow-sm ${
                                    (plan.machineRank === 'A' || plan.machineRank === '1')
                                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                      : (plan.machineRank === 'B' || plan.machineRank === '2')
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                        : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                                  }`}
                                  title="คลิกเพื่อเปลี่ยน Rank ของเครื่องจักรนี้"
                                >
                                  <option value="A" className="bg-slate-900 text-rose-300">Rank 1 (A - วิกฤต)</option>
                                  <option value="B" className="bg-slate-900 text-amber-300">Rank 2 (B - สำคัญ)</option>
                                  <option value="C" className="bg-slate-900 text-sky-300">Rank 3 (C - ทั่วไป)</option>
                                </select>
                                {plan.detectedRankParen && (
                                  <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/60 border border-cyan-500/30 px-1.5 py-0.2 rounded" title="ตรวจพบจากวงเล็บในไฟล์ Excel">
                                    {plan.detectedRankParen}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Plan Title */}
                            <td className="p-2.5">
                              <input
                                type="text"
                                value={plan.title}
                                onChange={(e) => handleUpdatePlanField(plan.tempId, 'title', e.target.value)}
                                className="w-full bg-slate-900/80 border border-slate-700/80 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-medium"
                                placeholder="ชื่องานหรือหัวข้อการบำรุงรักษา PM"
                              />
                            </td>

                            {/* Frequency Dropdown */}
                            <td className="p-2.5 text-center">
                              <select
                                value={plan.frequency}
                                onChange={(e) => handleUpdatePlanField(plan.tempId, 'frequency', e.target.value as PMFrequency)}
                                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 text-center"
                              >
                                <option value="รายวัน">รายวัน</option>
                                <option value="รายสัปดาห์">รายสัปดาห์</option>
                                <option value="ราย 2 สัปดาห์">ราย 2 สัปดาห์</option>
                                <option value="รายเดือน">รายเดือน</option>
                                <option value="ราย 3 เดือน">ราย 3 เดือน</option>
                                <option value="ราย 6 เดือน">ราย 6 เดือน</option>
                                <option value="รายปี">รายปี</option>
                              </select>
                            </td>

                            {/* Scheduled Date Picker */}
                            <td className="p-2.5">
                              <input
                                type="date"
                                value={plan.scheduledDate || ''}
                                onChange={(e) => handleUpdatePlanField(plan.tempId, 'scheduledDate', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-cyan-500"
                              />
                            </td>

                            {/* TTM (Minutes) */}
                            <td className="p-2.5 text-center">
                              <div className="inline-flex items-center gap-1 font-mono">
                                <input
                                  type="number"
                                  min="1"
                                  value={plan.ttm}
                                  onChange={(e) => handleUpdatePlanField(plan.tempId, 'ttm', Number(e.target.value) || 0)}
                                  className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-cyan-400 text-right focus:outline-none focus:border-cyan-500"
                                />
                                <span className="text-[10px] text-slate-500">น.</span>
                              </div>
                            </td>

                            {/* Steps Button with Count */}
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => setEditingPlanStepsIndex(actualIdx)}
                                className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer"
                              >
                                <Edit3 size={11} />
                                <span>{plan.steps.length} ขั้นตอน</span>
                              </button>
                            </td>

                            {/* Spare Parts */}
                            <td className="p-2.5">
                              <input
                                type="text"
                                value={plan.spareParts || ''}
                                onChange={(e) => handleUpdatePlanField(plan.tempId, 'spareParts', e.target.value)}
                                className="w-full bg-slate-900/60 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-cyan-500 truncate"
                                placeholder="อะไหล่ที่ต้องใช้..."
                              />
                            </td>

                            {/* Actions (Delete) */}
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeletePlanRow(plan.tempId)}
                                className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition cursor-pointer"
                                title="ลบแถวนี้"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 border-t border-slate-800 px-5 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 text-center sm:text-left">
            {parsedPlans.length > 0 ? (
              <span>
                พร้อมนำเข้า <strong className="text-emerald-400 font-bold font-mono">{selectedPlanIds.length}</strong> แผน 
                {autoCreateSchedule && (
                  <span className="text-cyan-300 font-medium"> (พร้อมสร้างกำหนดการในปฏิทิน & TBM Datamatrix อัตโนมัติ)</span>
                )}
              </span>
            ) : (
              <span>โยนไฟล์ Excel หรือคลิกโหลดตัวอย่างแผน PM ด้านบนเพื่อเริ่มต้น</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={selectedPlanIds.length === 0}
              className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <CheckCircle2 size={16} />
              <span>ยืนยันนำเข้าแผนงาน PM ({selectedPlanIds.length} แผน)</span>
            </button>
          </div>
        </div>

      </div>

      {/* DETAIL STEPS EDITOR SUB-MODAL */}
      {editingPlan !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Steps Modal Header */}
            <div className="bg-slate-950 border-b border-slate-800 px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>แก้ไขขั้นตอนการบำรุงรักษา:</span>
                  <span className="text-cyan-400 font-mono">[{editingPlan.machineId}] {editingPlan.title}</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  รวมเวลามาตรฐาน TTM: <strong className="text-cyan-400 font-mono">{editingPlan.ttm} นาที</strong> • ทั้งหมด {editingPlan.steps.length} ขั้นตอน
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingPlanStepsIndex(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Steps Modal Table */}
            <div className="p-4 overflow-y-auto max-h-[65vh] space-y-3">
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-900 border-b border-slate-800 text-[11px] font-bold text-slate-300">
                    <tr>
                      <th className="p-2 text-center w-10">ลำดับ</th>
                      <th className="p-2 w-48">หัวข้อขั้นตอน PM</th>
                      <th className="p-2 w-32">วิธีการ</th>
                      <th className="p-2">มาตรฐาน / เกณฑ์ยอมรับ</th>
                      <th className="p-2 w-20 text-center">เวลา (นาที)</th>
                      <th className="p-2 w-10 text-center">ลบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {editingPlan.steps.map((step, sIdx) => (
                      <tr key={sIdx} className="hover:bg-slate-900/50">
                        <td className="p-2 text-center font-bold text-slate-400">
                          {step.itemNo || sIdx + 1}
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={step.title}
                            onChange={(e) => handleUpdateStep(sIdx, 'title', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-medium"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={step.method || ''}
                            onChange={(e) => handleUpdateStep(sIdx, 'method', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                            placeholder="ดูด้วยสายตา, เครื่องมือวัด..."
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={step.standard || ''}
                            onChange={(e) => handleUpdateStep(sIdx, 'standard', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                            placeholder="โครงสร้างสมบูรณ์, ไม่รั่วซึม..."
                          />
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="1"
                            value={step.stdTime}
                            onChange={(e) => handleUpdateStep(sIdx, 'stdTime', Math.max(1, Number(e.target.value) || 0))}
                            className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-cyan-400 text-right font-mono focus:outline-none focus:border-cyan-500"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteStepFromPlan(sIdx)}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded transition cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={handleAddStepToPlan}
                className="w-full py-2 bg-slate-950 border border-dashed border-slate-700 hover:border-cyan-500/50 hover:bg-slate-900 text-cyan-400 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>เพิ่มขั้นตอนการตรวจเช็คย่อย</span>
              </button>
            </div>

            {/* Steps Modal Footer */}
            <div className="bg-slate-950 border-t border-slate-800 px-5 py-3 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setEditingPlanStepsIndex(null)}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs transition cursor-pointer"
              >
                เสร็จสิ้นการแก้ไขขั้นตอน
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
