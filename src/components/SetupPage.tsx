import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SetupLog, SetupStepLog, Machine } from '../types';
import { 
  Plus, Search, Trash2, Edit2, X, Check, Save, Clock, Users, 
  Settings, CheckSquare, Play, HelpCircle, Info, FileSpreadsheet,
  Activity, ArrowRight, ClipboardCheck
} from 'lucide-react';
import { notifySetupLogged } from '../utils/lineNotify';

// Standard Setup Time and Steps Guidelines for each Machine Type
export const STANDARD_SETUP_GUIDES: Record<string, { title: string; desc: string; steps: { name: string; stdTime: number; detail: string }[] }> = {
  FFS: {
    title: 'เครื่องบรรจุแนวนอน (Horizontal Form Fill Seal)',
    desc: 'เครื่องจักรสำหรับบรรจุหีบห่อและหุ้มกล่องสินค้าด้วยระบบฟิล์มความร้อนแบบม้วนสม่ำเสมอ',
    steps: [
      { name: 'ตั้งเครื่อง', stdTime: 15, detail: 'ทำความสะอาดกระบอกลม ปรับไกด์นำฟิล์มตามขนาดกล่อง' },
      { name: 'ร้อยฟิล์ม', stdTime: 10, detail: 'ร้อยม้วนฟิล์มผ่านชุดพูลเล่ย์และตัวแกนปรับความตึง' },
      { name: 'ตั้งฟิล์ม/จูนซีล', stdTime: 10, detail: 'ตรวจสอบและปรับระยะแกนซีลแนวตั้งและแนวนอน ความร้อน 130°C' },
      { name: 'ต่อฟิล์ม', stdTime: 5, detail: 'ต่อปลายม้วนเก่ากับม้วนใหม่ด้วยเทปกาวทนความร้อน' },
      { name: 'ตั้งเครื่องพิมพ์วันที่', stdTime: 10, detail: 'ปรับระยะเวลาส่งสัญญาณและแรงลมหัวยิง Inkjet' }
    ]
  },
  ATS: {
    title: 'เครื่องปิดฝาถาดกึ่งอัตโนมัติ (Automatic Top Sealer)',
    desc: 'เครื่องซีลปิดฝาถาดแก้ว/คัพสำหรับสินค้าไลน์อาหารแช่แข็งและพร้อมทาน',
    steps: [
      { name: 'ตั้งเครื่อง/เปลี่ยนโมลด์', stdTime: 15, detail: 'ถอดประกอบหัวซีลตรงรุ่น ปลดล็อกถาดเลื่อนคู่' },
      { name: 'ร้อยฟิล์มปิดฝา', stdTime: 10, detail: 'ร้อยฟิล์มผ่านตาแมวอ่านเซนเซอร์สีตัด (Eye-mark)' },
      { name: 'ตั้งแกนฟิล์ม', stdTime: 10, detail: 'ปรับความตึงฟิล์มและแรงดันลูกกลิ้งรีดฟิล์มรอบข้าง' },
      { name: 'ต่อฟิล์มรอยต่อ', stdTime: 5, detail: 'รอยต่อม้วนฟิล์มด้วยเทปทนความร้อนอย่างแน่นหนา' },
      { name: 'เซ็ตพารามิเตอร์พิมพ์วันที่', stdTime: 10, detail: 'ทดสอบยิงพิมพ์วันที่บนผิวฝา ตรวจสอบความเข้มและตำแหน่ง' }
    ]
  },
  RIM: {
    title: 'เครื่องผสมข้าว (Rice Mixer / Rice Feeder)',
    desc: 'เครื่องจักรผสมน้ำปรุงรสและน้ำมันเคลือบเมล็ดข้าวประจำต้นไลน์ผลิต',
    steps: [
      { name: 'ทำความสะอาดถังผสม', stdTime: 10, detail: 'เช็ดล้างภายในถังผสม ตรวจสอบความสะอาดหัวฉีดละอองปรุงรส' },
      { name: 'ประกอบใบมีด/ใบพัด', stdTime: 10, detail: 'ขันเกลียวยึดใบพัด ตรวจสอบซีลยางป้องกันการซึมลึก' },
      { name: 'ตั้งค่าระบบควบคุมความเร็ว', stdTime: 5, detail: 'ตั้งค่า Inverter วัดความเร็วรอบตาม Standard Recipe' },
      { name: 'ทดสอบการทำงานเปล่า', stdTime: 5, detail: 'รันเบาไร้โหลดเช็คเสียงผิดปกติ แรงสั่นสะเทือน และการรั่ว' }
    ]
  },
  VAC: {
    title: 'เครื่องลดอุณหภูมิสูญญากาศ (Vacuum Cooler / Blast Chiller)',
    desc: 'ระบบลดอุณหภูมิด้วยแรงดันสุญญากาศแบบเฉียบพลัน เพื่อรักษาคุณภาพอาหารและยับยั้งแบคทีเรีย',
    steps: [
      { name: 'ตรวจเช็คซีลยางหน้าตู้', stdTime: 5, detail: 'ตรวจเช็คขอบยางประตู ปัดทำความสะอาดฝุ่นและตรวจสอบรอยฉีกขาด' },
      { name: 'ตรวจสอบแรงดันน้ำหล่อเย็น', stdTime: 10, detail: 'เช็คแรงดันน้ำหล่อเย็น หรี่วาล์วน้ำขากลับให้ได้สัดส่วนมาตรฐาน' },
      { name: 'วอร์มระบบปั๊มสูญญากาศ', stdTime: 15, detail: 'วอร์มอัพปั๊มสูญญากาศเพื่อเตรียมอุณหภูมิน้ำมันปั๊มให้สม่ำเสมอ' },
      { name: 'ดึงแรงดันลบ (Leak Test)', stdTime: 10, detail: 'รันระบบสุญญากาศเปล่าเพื่อตรวจสอบอัตราการรั่วไหล (Leak Rate)' }
    ]
  },
  MTD: {
    title: 'เครื่องตรวจจับโลหะ (Metal Detector)',
    desc: 'เครื่องตรวจสอบสิ่งแปลกปลอมโลหะในตัวสินค้าก่อนบรรจุลงกล่อง',
    steps: [
      { name: 'เปิดเครื่องและคาลิเบรต', stdTime: 10, detail: 'เปิดวอร์มระบบเซนเซอร์และรันโปรแกรม Auto-Learn ของสินค้า' },
      { name: 'ทดสอบ Fe (Iron)', stdTime: 5, detail: 'สไลด์การ์ดทดสอบ Fe ขนาด 1.5mm เพื่อเช็คการส่งเสียงแจ้งเตือน' },
      { name: 'ทดสอบ Non-Fe', stdTime: 5, detail: 'สไลด์การ์ดทดสอบ Non-Fe ขนาด 2.0mm ผ่านจุดศูนย์กลางอุโมงค์ตรวจ' },
      { name: 'ทดสอบ SUS (Stainless)', stdTime: 5, detail: 'สไลด์การ์ดทดสอบ SUS 316 ขนาด 2.5mm เช็คความไวรับสัญญาณ' },
      { name: 'ตรวจทดสอบตัวผลักออก', stdTime: 5, detail: 'เช็คกระบอกลมผลักเป้าหมายทดสอบออกนอกไลน์คัดทิ้งได้สมบูรณ์' }
    ]
  },
  XRA: {
    title: 'เครื่องตรวจเอ็กซ์เรย์สิ่งแปลกปลอม (X-Ray Inspection)',
    desc: 'อุปกรณ์เอ็กซ์เรย์เทคโนโลยีชั้นสูงเพื่อตรวจกระดูก แก้ว และหินแปลกปลอมในตัวบรรจุภัณฑ์',
    steps: [
      { name: 'วอร์มอัพหลอดเอ็กซ์เรย์', stdTime: 15, detail: 'รันกระบวนการ Warm-up หลอดรังสีเอ็กซ์เรย์ตามข้อกำหนดความปลอดภัย' },
      { name: 'ทดสอบการ์ดทดสอบความแม่นยำ', stdTime: 10, detail: 'รันบัตรทดสอบโลหะ แก้ว และหิน ตรวจจับตามความดันแรงสูง' },
      { name: 'ตรวจสอบเซนเซอร์ประตูนิรภัย', stdTime: 5, detail: 'เช็คสวิตช์อินเตอร์ล็อกด้านข้างและม่านยางตะกั่วป้องกันรังสีรั่ว' }
    ]
  },
  BAN: {
    title: 'เครื่องรัดสายพานกล่อง (Banding & Strapping)',
    desc: 'ระบบรัดสายรัดความร้อนความเร็วสูง เพื่อรวมกล่องเตรียมขนส่ง',
    steps: [
      { name: 'ทำความสะอาดฝุ่นผงสายรัด', stdTime: 5, detail: 'เป่าลมทำความสะอาดชุดทำความร้อนและชุดดึงสายรัด' },
      { name: 'ปรับความตึงและป้อนสาย', stdTime: 10, detail: 'ร้อยสายพานเข้าเครื่อง ปรับระดับความแน่นหนาของการรัดกล่อง' },
      { name: 'ตั้งเซนเซอร์ระยะกล่อง', stdTime: 5, detail: 'ปรับแต่งระยะตัวตรวจวัดจับโฟโต้อิเล็กทริคเซนเซอร์' },
      { name: 'ทดสอบรัดกล่องตัวอย่าง', stdTime: 5, detail: 'ทดลองรัดกล่องตัวอย่าง 3 รอบเพื่อดูคุณภาพรอยประสานละลายความร้อน' }
    ]
  },
  DEFAULT: {
    title: 'เครื่องจักรมาตรฐานทั่วไป (Standard Industrial Equipment)',
    desc: 'ระบบเครื่องจักรและชุดอุปกรณ์สนับสนุนทั่วไปในสายการผลิตโรงงาน',
    steps: [
      { name: 'ทำความสะอาดและตรวจสอบความปลอดภัย', stdTime: 10, detail: 'ทำความสะอาดทั่วไปและตรวจความปลอดภัยรอบเครื่องจักร' },
      { name: 'ตั้งค่าโปรแกรมและปรับแต่งฟีดเดอร์', stdTime: 15, detail: 'ปรับพารามิเตอร์การตั้งค่าผ่านตู้ควบคุม HMI และหน้างาน' },
      { name: 'ทดสอบการเดินเครื่องเปล่า (Trial Run)', stdTime: 10, detail: 'ทดลองสับสวิตช์เดินเครื่องตัวเปล่า ตรวจสอบทิศทางและการเคลื่อนไหว' }
    ]
  }
};

export const getStandardSetupGuideKey = (machineId: string, machineName: string, guides?: Record<string, any>): string => {
  const mIdUpper = (machineId || '').toUpperCase();
  const mNameUpper = (machineName || '').toUpperCase();
  
  if (guides) {
    const keys = Object.keys(guides).filter(k => k !== 'DEFAULT');
    for (const k of keys) {
      if (mIdUpper.startsWith(k) || mNameUpper.includes(k)) return k;
    }
  }
  
  if (mIdUpper.startsWith('FFS') || mNameUpper.includes('FORM FILL SEAL') || mNameUpper.includes('PACKING')) return 'FFS';
  if (mIdUpper.startsWith('ATS') || mNameUpper.includes('TOP SEALER') || mNameUpper.includes('SEALER')) return 'ATS';
  if (mIdUpper.startsWith('RIM') || mNameUpper.includes('MIXER')) return 'RIM';
  if (mIdUpper.startsWith('VAC') || mNameUpper.includes('VACUUM')) return 'VAC';
  if (mIdUpper.startsWith('MTD') || mNameUpper.includes('METAL')) return 'MTD';
  if (mIdUpper.startsWith('XRA') || mNameUpper.includes('X-RAY')) return 'XRA';
  if (mIdUpper.startsWith('BAN') || mNameUpper.includes('BANDING')) return 'BAN';
  return 'DEFAULT';
};

export const SetupPage: React.FC = () => {
  const { 
    machines, 
    setMachines,
    technicians, 
    setupLogs, 
    setSetupLogs 
  } = useApp();

  // Load standard guides state
  const [standardGuides, setStandardGuides] = useState<Record<string, { title: string; desc: string; steps: { name: string; stdTime: number; detail: string }[] }>>(() => {
    const stored = localStorage.getItem('maint_standard_setup_guides');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error("Error reading stored guides", e);
      }
    }
    return STANDARD_SETUP_GUIDES;
  });

  const saveStandardGuides = (updated: Record<string, { title: string; desc: string; steps: { name: string; stdTime: number; detail: string }[] }>) => {
    setStandardGuides(updated);
    localStorage.setItem('maint_standard_setup_guides', JSON.stringify(updated));
  };

  // Machine Quick Modal states
  const [machineModalOpen, setMachineModalOpen] = useState(false);
  const [editingMachineObj, setEditingMachineObj] = useState<Machine | null>(null);
  const [machineToDeleteObj, setMachineToDeleteObj] = useState<string | null>(null);

  // Form states for adding/editing machine
  const [mId, setMId] = useState('');
  const [mName, setMName] = useState('');
  const [mLineGroup, setMLineGroup] = useState('LINE A');
  const [mStatus, setMStatus] = useState<'ปกติ' | 'เสีย/ซ่อม'>('ปกติ');

  // Sync machine form states when editingMachineObj changes
  React.useEffect(() => {
    if (editingMachineObj) {
      setMId(editingMachineObj.id);
      setMName(editingMachineObj.name);
      setMLineGroup(editingMachineObj.lineGroup || 'LINE A');
      setMStatus(editingMachineObj.status || 'ปกติ');
    } else {
      setMId('');
      setMName('');
      setMLineGroup('LINE A');
      setMStatus('ปกติ');
    }
  }, [editingMachineObj]);

  const handleSaveMachine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mId || !mName || !mLineGroup) {
      showAlert('error', '⚠️ กรุณากรอกข้อมูลรหัสและชื่อเครื่องจักรให้ครบถ้วน!');
      return;
    }

    const machineData: Machine = {
      id: mId.trim().toUpperCase(),
      name: mName.trim(),
      lineGroup: mLineGroup.trim(),
      status: mStatus
    };

    if (editingMachineObj) {
      // Edit existing machine
      setMachines(prev => prev.map(m => m.id === editingMachineObj.id ? machineData : m));
      showAlert('success', `✏️ แก้ไขข้อมูลเครื่องจักร ${machineData.name} สำเร็จ!`);
    } else {
      // Check duplicate ID
      if (machines.some(m => m.id.toUpperCase() === machineData.id)) {
        showAlert('error', `⚠️ รหัสเครื่องจักร ${machineData.id} ซ้ำในระบบ!`);
        return;
      }
      setMachines(prev => [...prev, machineData]);
      setMachineId(machineData.id); // select the newly added machine
      showAlert('success', `✨ เพิ่มเครื่องจักรใหม่ ${machineData.name} สำเร็จ!`);
    }

    setMachineModalOpen(false);
    setEditingMachineObj(null);
  };

  const handleDeleteMachine = () => {
    if (machineToDeleteObj) {
      const remaining = machines.filter(m => m.id !== machineToDeleteObj);
      setMachines(remaining);
      showAlert('success', `🗑️ ลบเครื่องจักร ${machineToDeleteObj} ออกจากระบบแล้ว!`);
      if (machineId === machineToDeleteObj) {
        setMachineId(remaining[0]?.id || '');
      }
      setMachineToDeleteObj(null);
    }
  };

  // SOP Guide Modal States
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [editingGuideKey, setEditingGuideKey] = useState<string | null>(null);
  const [gKey, setGKey] = useState('');
  const [gTitle, setGTitle] = useState('');
  const [gDesc, setGDesc] = useState('');
  const [gSteps, setGSteps] = useState<{ name: string; stdTime: number; detail: string }[]>([]);

  // Helpers for adding/editing steps in guide
  const [newGStepName, setNewGStepName] = useState('');
  const [newGStepTime, setNewGStepTime] = useState<number>(10);
  const [newGStepDetail, setNewGStepDetail] = useState('');

  const handleAddGuideStep = () => {
    if (!newGStepName.trim()) {
      showAlert('error', '⚠️ กรุณาระบุชื่อขั้นตอนมาตรฐาน!');
      return;
    }
    setGSteps(prev => [...prev, {
      name: newGStepName.trim(),
      stdTime: newGStepTime,
      detail: newGStepDetail.trim()
    }]);
    setNewGStepName('');
    setNewGStepTime(10);
    setNewGStepDetail('');
  };

  const handleRemoveGuideStep = (idx: number) => {
    setGSteps(prev => prev.filter((_, i) => i !== idx));
  };

  const handleOpenAddGuide = () => {
    setEditingGuideKey(null);
    setGKey('');
    setGTitle('');
    setGDesc('');
    setGSteps([]);
    setGuideModalOpen(true);
  };

  const handleOpenEditGuide = (key: string) => {
    const guide = standardGuides[key];
    if (guide) {
      setEditingGuideKey(key);
      setGKey(key);
      setGTitle(guide.title);
      setGDesc(guide.desc);
      setGSteps([...guide.steps]);
      setGuideModalOpen(true);
    }
  };

  const handleDeleteGuide = (key: string) => {
    if (key === 'DEFAULT') {
      showAlert('error', '⚠️ ไม่สามารถลบคู่มือมาตรฐานทั่วไป (DEFAULT) ได้');
      return;
    }
    const updated = { ...standardGuides };
    delete updated[key];
    saveStandardGuides(updated);
    
    // Select another active tab
    const remainingKeys = Object.keys(updated);
    setSelectedGuideTab(remainingKeys[0] || 'DEFAULT');
    showAlert('success', `🗑️ ลบคู่มือมาตรฐาน ${key} สำเร็จ!`);
  };

  const handleSaveGuide = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gKey.trim() || !gTitle.trim()) {
      showAlert('error', '⚠️ กรุณากรอกรหัสกลุ่มเครื่องจักรและชื่อคู่มือมาตรฐาน!');
      return;
    }
    if (gSteps.length === 0) {
      showAlert('error', '⚠️ กรุณาเพิ่มขั้นตอนดำเนินการอย่างน้อย 1 ขั้นตอน!');
      return;
    }

    const keyUpper = gKey.trim().toUpperCase();
    const updatedGuides = { ...standardGuides };

    if (editingGuideKey) {
      if (editingGuideKey !== keyUpper) {
        delete updatedGuides[editingGuideKey];
      }
      updatedGuides[keyUpper] = {
        title: gTitle.trim(),
        desc: gDesc.trim(),
        steps: gSteps
      };
      saveStandardGuides(updatedGuides);
      setSelectedGuideTab(keyUpper);
      showAlert('success', `✏️ แก้ไขคู่มือมาตรฐาน ${gTitle} สำเร็จ!`);
    } else {
      if (updatedGuides[keyUpper]) {
        showAlert('error', `⚠️ รหัสกลุ่มเครื่องจักร ${keyUpper} ซ้ำในคู่มือ!`);
        return;
      }
      updatedGuides[keyUpper] = {
        title: gTitle.trim(),
        desc: gDesc.trim(),
        steps: gSteps
      };
      saveStandardGuides(updatedGuides);
      setSelectedGuideTab(keyUpper);
      showAlert('success', `✨ เพิ่มคู่มือมาตรฐาน ${gTitle} สำเร็จ!`);
    }

    setGuideModalOpen(false);
  };

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [machineFilter, setMachineFilter] = useState<string>('all');

  // Form States for Add / Edit
  const [selectedLogForDetail, setSelectedLogForDetail] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [machineId, setMachineId] = useState<string>(machines[0]?.id || '');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'Setupก่อนผลิต' | 'ปรับเครื่องระหว่างวัน'>('Setupก่อนผลิต');
  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const [note, setNote] = useState<string>('');
  const [deviationReason, setDeviationReason] = useState<string>('');

  // 5 Standard default steps (used as initial template)
  const DEFAULT_STEPS = [
    { stepName: 'ตั้งเครื่อง', duration: 15, completed: true },
    { stepName: 'ร้อยฟิล์ม', duration: 10, completed: true },
    { stepName: 'ตั้งฟิล์ม', duration: 10, completed: true },
    { stepName: 'ต่อฟิล์ม', duration: 5, completed: true },
    { stepName: 'ตั้งเครื่องพิมพ์วันที่', duration: 10, completed: true }
  ];

  const [steps, setSteps] = useState<SetupStepLog[]>(DEFAULT_STEPS);
  const [customStepName, setCustomStepName] = useState('');
  const [customStepDuration, setCustomStepDuration] = useState<string>('10');

  // Track the current machine standard setup steps to load dynamically
  const handleLoadStandardSteps = (targetMachineId: string) => {
    const selectedMac = machines.find(m => m.id === targetMachineId);
    if (selectedMac) {
      const key = getStandardSetupGuideKey(targetMachineId, selectedMac.name, standardGuides);
      const guide = standardGuides[key] || standardGuides.DEFAULT;
      setSteps(guide.steps.map(s => ({
        stepName: s.name,
        duration: s.stdTime,
        completed: true
      })));
      showAlert('success', `🔄 โหลดสเต็ปและเวลามาตรฐานสำหรับ ${selectedMac.name} แล้ว!`);
    }
  };

  // Trigger loading when changing machine in create-new mode
  const handleMachineChange = (newMachineId: string) => {
    setMachineId(newMachineId);
    if (!isEditing) {
      const selectedMac = machines.find(m => m.id === newMachineId);
      if (selectedMac) {
        const key = getStandardSetupGuideKey(newMachineId, selectedMac.name, standardGuides);
        const guide = standardGuides[key] || standardGuides.DEFAULT;
        setSteps(guide.steps.map(s => ({
          stepName: s.name,
          duration: s.stdTime,
          completed: true
        })));
      }
    }
  };

  // Run on mount or when machines list becomes available to initialize first machine's steps
  React.useEffect(() => {
    if (machines.length > 0 && !machineId) {
      const initialId = machines[0].id;
      setMachineId(initialId);
      const selectedMac = machines[0];
      const key = getStandardSetupGuideKey(initialId, selectedMac.name, standardGuides);
      const guide = standardGuides[key] || standardGuides.DEFAULT;
      setSteps(guide.steps.map(s => ({
        stepName: s.name,
        duration: s.stdTime,
        completed: true
      })));
    }
  }, [machines]);

  // SOP Reference Guide States
  const [selectedGuideTab, setSelectedGuideTab] = useState<string>('FFS');

  // Sync reference guide tab when machine is changed
  React.useEffect(() => {
    if (machineId) {
      const selectedMac = machines.find(m => m.id === machineId);
      if (selectedMac) {
        const key = getStandardSetupGuideKey(machineId, selectedMac.name, standardGuides);
        setSelectedGuideTab(key);
      }
    }
  }, [machineId, machines]);

  // UI Toast State
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  // Helper to toggle step active status
  const handleToggleStepCompleted = (index: number) => {
    setSteps(prev => prev.map((s, idx) => {
      if (idx === index) {
        return { ...s, completed: !s.completed, duration: !s.completed ? s.duration || 10 : 0 };
      }
      return s;
    }));
  };

  // Helper to add custom setup steps dynamically
  const handleAddCustomStep = () => {
    if (!customStepName.trim()) {
      showAlert('error', 'กรุณาระบุชื่อขั้นตอนใหม่!');
      return;
    }
    if (steps.some(s => s.stepName.toLowerCase() === customStepName.trim().toLowerCase())) {
      showAlert('error', 'มีขั้นตอนนี้ในฟอร์มแล้ว!');
      return;
    }
    const duration = Number(customStepDuration) || 10;
    setSteps(prev => [...prev, {
      stepName: customStepName.trim(),
      duration: Math.max(0, duration),
      completed: true
    }]);
    setCustomStepName('');
    setCustomStepDuration('10');
    showAlert('success', '➕ เพิ่มขั้นตอนย่อยเรียบร้อยแล้ว!');
  };

  // Helper to delete step dynamically
  const handleDeleteStep = (index: number) => {
    setSteps(prev => prev.filter((_, idx) => idx !== index));
    showAlert('success', '🗑️ ลบขั้นตอนย่อยเรียบร้อย!');
  };

  // Helper to change step minutes
  const handleChangeStepDuration = (index: number, mins: number) => {
    setSteps(prev => prev.map((s, idx) => {
      if (idx === index) {
        return { ...s, duration: Math.max(0, mins), completed: mins > 0 ? true : s.completed };
      }
      return s;
    }));
  };

  // Toggle tech selection
  const handleToggleTech = (tech: string) => {
    setSelectedTechs(prev => 
      prev.includes(tech) ? prev.filter(t => t !== tech) : [...prev, tech]
    );
  };

  // Calculate sum of active steps duration
  const currentTotalDuration = steps.reduce(
    (sum, s) => sum + (s.completed ? Number(s.duration) : 0), 0
  );

  // Form Submit (Add or Save Edit)
  const handleSubmitLog = (e: React.FormEvent) => {
    e.preventDefault();

    if (!machineId) {
      showAlert('error', 'กรุณาระบุอุปกรณ์/เครื่องจักร!');
      return;
    }
    if (selectedTechs.length === 0) {
      showAlert('error', 'กรุณาระบุช่างผู้รับผิดชอบอย่างน้อย 1 คนเพื่อลง Workload!');
      return;
    }
    if (currentTotalDuration <= 0) {
      showAlert('error', 'ระยะเวลารวมในทุกสเต็ปต้องมากกว่า 0 นาที!');
      return;
    }

    // Save
    if (isEditing && editingId) {
      setSetupLogs(prev => prev.map(log => {
        if (log.id === editingId) {
          return {
            ...log,
            machineId,
            date,
            type,
            technicians: selectedTechs,
            steps: steps.map(s => ({ ...s, duration: s.completed ? Number(s.duration) : 0 })),
            totalDuration: currentTotalDuration,
            note,
            deviationReason
          };
        }
        return log;
      }));
      showAlert('success', '💾 บันทึกการแก้ไขข้อมูลเรียบร้อยแล้ว!');
      resetForm();
    } else {
      // Add new
      const newLog: SetupLog = {
        id: `setup-log-${Date.now()}`,
        machineId,
        date,
        type,
        technicians: selectedTechs,
        steps: steps.map(s => ({ ...s, duration: s.completed ? Number(s.duration) : 0 })),
        totalDuration: currentTotalDuration,
        note,
        deviationReason
      };
      setSetupLogs(prev => [newLog, ...prev]);
      showAlert('success', '✨ เพิ่มรายการบันทึกเวลา Setup เครื่องและปรับเครื่องใหม่สำเร็จ!');
      
      // Notify LINE if enabled
      const machineObj = machines.find(m => m.id === machineId);
      notifySetupLogged(newLog, machineObj?.name || '').catch(console.error);

      resetForm();
    }
  };

  // Start Edit Mode
  const handleStartEdit = (log: SetupLog) => {
    setIsEditing(true);
    setEditingId(log.id);
    setMachineId(log.machineId);
    setDate(log.date);
    setType(log.type);
    setSelectedTechs(log.technicians);
    setNote(log.note || '');
    setDeviationReason(log.deviationReason || '');

    // Load saved steps directly (allowing full dynamic custom additions/deletions)
    setSteps(log.steps.map(s => ({
      stepName: s.stepName,
      duration: s.duration,
      completed: s.completed !== undefined ? s.completed : (s.duration > 0)
    })));
  };

  // Reset Form fields
  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setMachineId(machines[0]?.id || '');
    setDate(new Date().toISOString().split('T')[0]);
    setType('Setupก่อนผลิต');
    setSelectedTechs([]);
    setNote('');
    setDeviationReason('');
    setSteps(DEFAULT_STEPS);
  };

  // Delete Log
  const handleDeleteLog = (id: string) => {
    setDeleteTargetId(id);
  };

  // Filtered logs list
  const filteredLogs = setupLogs.filter(log => {
    const matchSearch = 
      log.machineId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (machines.find(m => m.id === log.machineId)?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.note?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchType = typeFilter === 'all' ? true : log.type === typeFilter;
    const matchMachine = machineFilter === 'all' ? true : log.machineId === machineFilter;

    return matchSearch && matchType && matchMachine;
  });

  // Calculate high-level KPIs
  const totalSetupLogsCount = setupLogs.length;
  const totalMinutesSpent = setupLogs.reduce((sum, log) => sum + log.totalDuration, 0);
  const avgDurationPerLog = totalSetupLogsCount > 0 ? Math.round(totalMinutesSpent / totalSetupLogsCount) : 0;
  
  // Setup vs. Mid-day tuning breakdown
  const beforeUseCount = setupLogs.filter(l => l.type === 'Setupก่อนผลิต').length;
  const middayCount = setupLogs.filter(l => l.type === 'ปรับเครื่องระหว่างวัน').length;

  // Selected Machine's standard SOP time calculations for dynamic comparison
  const activeMachine = machines.find(m => m.id === machineId);
  const selectedMachineGuideKey = activeMachine ? getStandardSetupGuideKey(machineId, activeMachine.name, standardGuides) : 'DEFAULT';
  const selectedMachineStandardGuide = standardGuides[selectedMachineGuideKey] || standardGuides.DEFAULT;
  const selectedMachineStdTotalDuration = selectedMachineStandardGuide ? selectedMachineStandardGuide.steps.reduce((sum, s) => sum + s.stdTime, 0) : 0;
  const formTimeDiff = currentTotalDuration - selectedMachineStdTotalDuration;

  return (
    <div className="space-y-6 text-slate-100" id="setup-workload-container">
      {/* 1. Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-md font-bold text-[10px] uppercase">
                Setup Workload Recorder
              </span>
              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md font-bold text-[10px]">
                ปรับแก้หน้างานตารางกละ
              </span>
            </div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              ⏱ บันทึกเวลา Setup & ปรับตั้งเครื่องระหว่างวัน (Workload)
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              บันทึกระยะเวลาดำเนินการของทั้ง 5 สเต็ปหลัก (ตั้งเครื่อง, ร้อยฟิล์ม, ตั้งฟิล์ม, ต่อฟิล์ม, ตั้งเครื่องพิมพ์วันที่) 
              ระบุผู้ปฏิบัติงาน และลงภาระเวลาช่างอัตโนมัติ เพื่อนำไปสรุปเป็นเปอร์เซ็นต์ Workload ประจำวันของกลุ่มช่าง
            </p>
          </div>
          
          <button
            onClick={() => {
              resetForm();
              document.getElementById('setup-form-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl shadow-lg shadow-cyan-500/10 transition cursor-pointer self-start md:self-auto"
          >
            <Plus size={15} />
            <span>สร้างรายการบันทึกใหม่</span>
          </button>
        </div>
      </div>

      {/* Alert Notifications */}
      {alert && (
        <div className={`p-4 rounded-xl border text-xs shadow-xl animate-in fade-in duration-300 flex items-center gap-2.5 ${
          alert.type === 'success' 
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
        }`}>
          <div className={`w-2 h-2 rounded-full ${alert.type === 'success' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400 animate-pulse'}`} />
          <span className="font-semibold">{alert.message}</span>
        </div>
      )}

      {/* 2. Statistical KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5 shadow-md">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl">
            <ClipboardCheck size={20} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">รายการบันทึกทั้งหมด</p>
            <p className="text-xl font-bold text-white mt-0.5">{totalSetupLogsCount} รายการ</p>
            <p className="text-[9px] text-slate-400 font-medium mt-0.5">กระจายตามกะผลิตและการตั้งโรงงาน</p>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5 shadow-md">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">เวลาภาระงานสะสม (Workload)</p>
            <p className="text-xl font-bold text-white mt-0.5">{totalMinutesSpent} นาที</p>
            <p className="text-[9px] text-slate-400 font-medium mt-0.5">{(totalMinutesSpent / 60).toFixed(1)} ชั่วโมงของการทำงาน</p>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5 shadow-md">
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
            <Activity size={20} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">เฉลี่ยเวลาดำเนินการต่อรอบ</p>
            <p className="text-xl font-bold text-white mt-0.5">{avgDurationPerLog} นาที</p>
            <p className="text-[9px] text-slate-400 font-medium mt-0.5">ต่อเครื่องจักรเครื่องพิมพ์และฟิล์ม</p>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5 shadow-md">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <Settings size={20} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">สัดส่วนกิจกรรม Setup / Tuning</p>
            <p className="text-xl font-bold text-white mt-0.5">{beforeUseCount} / {middayCount}</p>
            <p className="text-[9px] text-slate-400 font-medium mt-0.5">Setup ก่อนเริ่มงาน vs. ปรับจูนหน้างาน</p>
          </div>
        </div>
      </div>

      {/* 3. Main Form and List split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Form Container (5 out of 12 columns) */}
        <div className="lg:col-span-5 space-y-4" id="setup-form-section">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-slate-950 border-b border-slate-800 px-5 py-3.5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Settings size={15} className="text-cyan-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  {isEditing ? '✏️ แก้ไขบันทึกประวัติการ Setup' : '✨ บันทึกเวลางาน Setup ของช่าง'}
                </h2>
              </div>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 p-1 rounded transition text-[10px] flex items-center gap-0.5"
                >
                  <X size={12} />
                  <span>ยกเลิกเขียนใหม่</span>
                </button>
              )}
            </div>

            <form onSubmit={handleSubmitLog} className="p-5 space-y-4 text-xs">
              
              {/* Form Input Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Date */}
                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-350">📅 วันที่ปฏิบัติงาน *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  />
                </div>

                {/* Type */}
                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-350">🔧 ประเภทงานเข้าทำ *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  >
                    <option value="Setupก่อนผลิต">⚙️ Setup ก่อนเริ่มเดินเครื่อง</option>
                    <option value="ปรับเครื่องระหว่างวัน">🛠 ปรับปรุง/Tuning ระหว่างวัน</option>
                  </select>
                </div>
              </div>

              {/* Machine Selection */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center mb-1">
                  <label className="font-extrabold text-slate-350 flex items-center gap-1">
                    <span>🏭 อุปกรณ์/เครื่องจักรสายไลน์ผลิต *</span>
                    <span className="text-[9px] text-slate-500 font-mono font-bold">
                      ({machines.find(m => m.id === machineId)?.lineGroup || 'ไม่ระบุกลุ่ม'})
                    </span>
                  </label>
                  {machineId && (
                    <button
                      type="button"
                      onClick={() => handleLoadStandardSteps(machineId)}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-black flex items-center gap-1 bg-cyan-500/10 hover:bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/20 transition-all cursor-pointer"
                      title="กดเพื่ออัปเดตสเต็ปในฟอร์มเป็นขั้นตอนและเวลามาตรฐาน (SOP Benchmark) ของเครื่องนี้"
                    >
                      <span>🔄 โหลดสเต็ปมาตรฐาน SOP</span>
                    </button>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <select
                    value={machineId}
                    onChange={(e) => handleMachineChange(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  >
                    <option value="" disabled>-- เลือกเครื่องจักร --</option>
                    {machines.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} [{m.id}] - {m.lineGroup}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMachineObj(null);
                        setMachineModalOpen(true);
                      }}
                      className="px-2 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 rounded-lg transition-all cursor-pointer"
                      title="เพิ่มเครื่องจักรใหม่"
                    >
                      <Plus size={14} />
                    </button>
                    {machineId && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const found = machines.find(m => m.id === machineId);
                            if (found) {
                              setEditingMachineObj(found);
                              setMachineModalOpen(true);
                            }
                          }}
                          className="px-2 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/20 rounded-lg transition-all cursor-pointer"
                          title="แก้ไขข้อมูลเครื่องจักรนี้"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMachineToDeleteObj(machineId);
                          }}
                          className="px-2 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/20 rounded-lg transition-all cursor-pointer"
                          title="ลบเครื่องจักรนี้ออกจากระบบ"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Multi Technicians Selection */}
              <div className="space-y-1.5 bg-slate-950/45 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <label className="font-extrabold text-[#38bdf8] flex items-center gap-1">
                    👥 รายชื่อช่างปฏิบัติการผู้รับผิดชอบ *
                  </label>
                  <span className="font-mono text-[10px] text-cyan-400 font-black">
                    เลือก {selectedTechs.length} คน
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-[110px] overflow-y-auto border border-slate-850/60 bg-slate-950 p-2 rounded-lg scrollbar-thin">
                  {technicians.map(tech => {
                    const isSelected = selectedTechs.includes(tech);
                    return (
                      <label
                        key={tech}
                        className={`flex items-center gap-2 p-1.5 rounded border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 font-black' 
                            : 'bg-slate-900/40 border-slate-850 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleTech(tech)}
                          className="w-3.5 h-3.5 rounded accent-cyan-500"
                        />
                        <span className="text-[10px] truncate">{tech}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Steps configuration details (Fully dynamic custom additions & deletions) */}
              <div className="space-y-2.5 bg-slate-950/20 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center">
                  <label className="font-extrabold text-white flex items-center gap-1.5">
                    <Clock size={13} className="text-cyan-400" />
                    <span>บันทึกระยะเวลารายขั้นตอนย่อย (ในสเต็ปการทำ) *</span>
                  </label>
                  <span className="text-[9.5px] font-bold text-slate-400">
                    ({steps.length} ขั้นตอน)
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-none">
                  กรอกเวลาปฏิบัติจริงเป็นนาที หรือกดกากบาทปิดส่วนที่ไม่ได้ทำ หรือกดถังขยะลบทิ้งได้ทันที
                </p>

                <div className="space-y-2.5 mt-2 max-h-[220px] overflow-y-auto pr-1">
                  {steps.map((step, idx) => (
                    <div 
                      key={`${step.stepName}-${idx}`}
                      className={`flex items-center justify-between p-2 rounded-lg border transition-all duration-200 ${
                        step.completed 
                          ? 'bg-slate-900 border-slate-800' 
                          : 'bg-slate-950/40 border-slate-850/40 opacity-55'
                      }`}
                    >
                      {/* Checkbox and name */}
                      <div className="flex items-center gap-2 max-w-[180px]">
                        <button
                          type="button"
                          onClick={() => handleToggleStepCompleted(idx)}
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${
                            step.completed
                              ? 'bg-cyan-500 border-cyan-400 text-slate-900'
                              : 'border-slate-700 bg-slate-950 text-transparent'
                          }`}
                        >
                          {step.completed && <Check size={11} strokeWidth={4} />}
                        </button>
                        <span className={`text-[11px] truncate font-semibold ${step.completed ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
                          {step.stepName}
                        </span>
                      </div>

                      {/* Minutes input & Delete action */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          disabled={!step.completed}
                          value={step.completed ? step.duration : ''}
                          onChange={(e) => handleChangeStepDuration(idx, Number(e.target.value))}
                          placeholder="0"
                          min="0"
                          className={`w-12 text-center bg-slate-950 border rounded px-1.5 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-500/50 font-mono font-bold ${
                            step.completed 
                              ? 'border-slate-850 text-cyan-300' 
                              : 'border-slate-900 text-slate-700'
                          }`}
                        />
                        <span className="text-[10px] text-slate-500">นาที</span>

                        {/* Inline delete button to remove this step completely */}
                        <button
                          type="button"
                          onClick={() => handleDeleteStep(idx)}
                          title="ลบขั้นตอนย่อยนี้"
                          className="p-1 text-slate-550 hover:text-red-400 hover:bg-slate-800 rounded transition"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {steps.length === 0 && (
                    <div className="p-4 border border-dashed border-slate-800 rounded-lg text-center text-[10px] text-slate-500 italic">
                      ไม่มีขั้นตอนย่อย กรุณาเพิ่มขั้นตอนใหม่ที่ปุ่มด้านล่าง
                    </div>
                  )}
                </div>

                {/* DYNAMIC NEW STEP ROW INPUT */}
                <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-850 space-y-2 mt-3">
                  <p className="text-[10px] font-black text-cyan-300 flex items-center gap-1">
                    <Plus size={11} />
                    <span>เพิ่มขั้นตอนย่อยแบบกำหนดเอง (Custom Steps)</span>
                  </p>
                  <div className="grid grid-cols-12 gap-1.5 items-center">
                    <div className="col-span-7">
                      <input
                        type="text"
                        placeholder="ชื่อขั้นตอนย่อย เช่น เทสหัวพิมพ์"
                        value={customStepName}
                        onChange={(e) => setCustomStepName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10.5px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="นาที"
                        value={customStepDuration}
                        onChange={(e) => setCustomStepDuration(e.target.value)}
                        min="0"
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10.5px] text-center text-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 font-mono font-bold"
                      />
                    </div>
                    <div className="col-span-2">
                      <button
                        type="button"
                        onClick={handleAddCustomStep}
                        className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[10.5px] font-black py-1 rounded transition text-center flex items-center justify-center cursor-pointer"
                        title="กดเพื่อเพิ่มในลิสต์"
                      >
                        เพิ่ม
                      </button>
                    </div>
                  </div>
                </div>

                {/* Live total workload summary in form */}
                <div className="flex justify-between items-center pt-2.5 border-t border-slate-800/80 mt-2">
                  <span className="font-extrabold text-slate-400 text-[10.5px]">เวลารวมลงชั่วโมงภาระภาระงาน:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-base font-black text-white">{currentTotalDuration}</span>
                    <span className="text-[10px] text-slate-400">นาที/คน</span>
                  </div>
                </div>

                {/* SOP Standard Comparison block */}
                {machineId && (
                  <div className="mt-3 p-3 bg-slate-950/45 rounded-lg border border-slate-850 space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                      <span>📋 เปรียบเทียบกับมาตรฐาน SOP:</span>
                      <span className="font-mono text-cyan-400 font-bold">เกณฑ์ {selectedMachineStdTotalDuration} นาที</span>
                    </div>
                    
                    {/* Progress Bar comparison */}
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden flex">
                      <div 
                        style={{ width: `${Math.min(100, (currentTotalDuration / (selectedMachineStdTotalDuration || 1)) * 100)}%` }} 
                        className={`h-full transition-all duration-300 ${
                          formTimeDiff > 0 ? 'bg-amber-500' : formTimeDiff < 0 ? 'bg-teal-400' : 'bg-emerald-500'
                        }`}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-semibold">สถานะผลต่าง:</span>
                      {formTimeDiff === 0 ? (
                        <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9.5px] font-black rounded flex items-center gap-1">
                          🟢 ตรงตามมาตรฐานพอดี
                        </span>
                      ) : formTimeDiff > 0 ? (
                        <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9.5px] font-black rounded flex items-center gap-1">
                          ⚠️ ช้ากว่ามาตรฐาน {formTimeDiff} นาที (ช้า)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9.5px] font-black rounded flex items-center gap-1">
                          ⚡ เร็วกว่ามาตรฐาน {Math.abs(formTimeDiff)} นาที (เร็ว)
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Deviation Reason field ("เพราะอะไร") */}
              {machineId && formTimeDiff !== 0 && (
                <div className="space-y-1.5 bg-amber-500/5 p-3 rounded-xl border border-amber-500/15 animate-in slide-in-from-top-2 duration-200">
                  <label className="font-extrabold text-amber-400 flex items-center gap-1 text-[10.5px]">
                    ❓ ระบุสาเหตุความต่างจากมาตรฐาน (เพราะอะไร) *
                  </label>
                  <textarea
                    value={deviationReason}
                    onChange={(e) => setDeviationReason(e.target.value)}
                    required
                    placeholder="กรุณาระบุสาเหตุที่ล่าช้าหรือทำเสร็จเร็ว เช่น 'ฟิล์มติดขัดเนื่องจากหน้าม้วนบิดงอ', 'ช่างช่วยกันสองคนช่วยเพิ่มฟีด', 'หัวพิมพ์วันที่ติดคราบฝุ่นเคลียร์ยาก'"
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none text-[11px]"
                  />
                </div>
              )}

              {/* Observation note */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-350">📝 บันทึกผล/ข้อเสนอแนะเพิ่มเติม</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="เช่น ฟิล์มหมดพอดีจึงเปลี่ยนเพิ่มช้า, ชุดวันที่หมึกหมด, เคลียร์หน้างานเรียบ"
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none"
                />
              </div>

              {/* Submit and reset */}
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-[11px] bg-slate-950 hover:bg-slate-850 border border-slate-800 font-bold rounded-xl transition cursor-pointer text-slate-400"
                >
                  ล้างค่าฟอร์ม
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-[11px] bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/5"
                >
                  <Save size={13} />
                  <span>{isEditing ? '💾 บันทึกการแก้ไขข้อมูล' : '💾 บันทึกตารางเวลางาน'}</span>
                </button>
              </div>

            </form>
          </div>

          {/* ข้อมูลมาตรฐานการเซทอัพเครื่องจักร (SOP Standard Setup Benchmarks) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden mt-4">
            <div className="bg-slate-950 border-b border-slate-800 px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet size={16} className="text-cyan-400" />
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">📚 คู่มือและเกณฑ์เวลามาตรฐานการ Setup (SOP Benchmarks)</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">มาตรฐานขั้นตอนและชั่วโมงเวลาอ้างอิงแต่ละเครื่องจักรในโรงงาน</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddGuide}
                  className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-lg text-[9.5px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                  title="สร้างคู่มือมาตรฐานเครื่องจักรใหม่"
                >
                  <Plus size={12} />
                  <span>เพิ่มคู่มือใหม่</span>
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Category horizontal scrolling selector tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
                {Object.keys(standardGuides).map(key => {
                  const isActive = selectedGuideTab === key;
                  const g = standardGuides[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedGuideTab(key)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold whitespace-nowrap border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/10'
                          : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200 hover:border-slate-800'
                      }`}
                    >
                      {key} ({g.steps.length} ขั้นตอน)
                    </button>
                  );
                })}
              </div>

              {/* Guide details panel */}
              {(() => {
                const guide = standardGuides[selectedGuideTab] || standardGuides.DEFAULT;
                if (!guide) return null;
                const totalStdTime = guide.steps.reduce((acc, s) => acc + s.stdTime, 0);

                return (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="bg-slate-950/65 p-3.5 rounded-xl border border-slate-850 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-[11.5px] font-extrabold text-[#38bdf8] flex items-center gap-1.5 flex-wrap">
                          <span>{guide.title}</span>
                          <span className="text-[9px] font-mono text-slate-500 bg-slate-950 border border-slate-800 px-1 py-0.2 rounded font-bold">{selectedGuideTab}</span>
                        </h4>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditGuide(selectedGuideTab)}
                            className="p-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded transition cursor-pointer"
                            title="แก้ไขรายละเอียดคู่มือมาตรฐานนี้"
                          >
                            <Edit2 size={11} />
                          </button>
                          {selectedGuideTab !== 'DEFAULT' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteGuide(selectedGuideTab)}
                              className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded transition cursor-pointer"
                              title="ลบคู่มือมาตรฐานนี้"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">{guide.desc}</p>
                      <div className="pt-1.5 flex items-center justify-between">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">เกณฑ์เวลาและหัวจ่าย</span>
                        <span className="text-[10.5px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-mono font-black shrink-0">
                          ⏱ {totalStdTime} นาที (เกณฑ์)
                        </span>
                      </div>
                    </div>

                    {/* Step-by-step breakdown */}
                    <div className="space-y-2">
                      <p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">ขั้นตอนดำเนินงานตามมาตรฐาน (SOP Action Steps)</p>
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {guide.steps.map((s, idx) => (
                          <div key={idx} className="bg-[#0b1222]/50 border border-slate-850 rounded-lg p-2.5 flex items-start gap-2.5">
                            <span className="w-5 h-5 bg-slate-950 border border-slate-800 rounded-full flex items-center justify-center text-[10px] font-mono font-bold text-slate-400 shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div className="space-y-0.5 flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10.5px] font-extrabold text-slate-200">{s.name}</span>
                                <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/5 px-1.5 py-0.2 rounded shrink-0">{s.stdTime} นาที</span>
                              </div>
                              <p className="text-[9.5px] text-slate-400 leading-normal">{s.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Fill form with this template action button */}
                    <button
                      type="button"
                      onClick={() => {
                        setSteps(guide.steps.map(s => ({
                          stepName: s.name,
                          duration: s.stdTime,
                          completed: true
                        })));
                        // Try to find a matching machine to select
                        const matchingMachine = machines.find(m => getStandardSetupGuideKey(m.id, m.name, standardGuides) === selectedGuideTab);
                        if (matchingMachine) {
                          setMachineId(matchingMachine.id);
                        }
                        showAlert('success', `📥 โหลดแบบฟอร์มขั้นตอนมาตรฐานของ ${guide.title} แล้ว!`);
                      }}
                      className="w-full bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-200 hover:text-white py-2 rounded-xl text-[10.5px] font-extrabold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
                    >
                      <CheckSquare size={13} className="text-cyan-400" />
                      <span>📥 ใช้สเต็ปมาตรฐานนี้ในแบบฟอร์มบันทึกข้างต้น</span>
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Setup Logs History & Workload Listing Container (7 out of 12 columns) */}
        <div className="lg:col-span-7 space-y-4">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden p-5 space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-extrabold text-white">📋 ประวัติลงเวลาระบบตารางการเตรียมพร้อม (Setup & Tuning logs)</h2>
                <p className="text-[10.5px] text-slate-400">ประวัติบันทึกการจัดเตรียมเครื่องจักรและร้อยชุดฟิล์มโรงงาน</p>
              </div>
              
              <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-950 border border-slate-800 rounded-lg py-1 px-2.5">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
                <span className="text-[9.5px] font-mono text-cyan-300 font-black">{filteredLogs.length} รายการ</span>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850">
              
              {/* Type filter */}
              <div className="space-y-1">
                <span className="text-[8.5px] font-extrabold text-slate-500 uppercase tracking-wider">ตัวกรองประเภท</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-[10.5px] rounded px-2 py-1 focus:outline-none"
                >
                  <option value="all">📁 ทั้งหมด (ทุกงาน)</option>
                  <option value="Setupก่อนผลิต">⚙️ Setup ก่อนเริ่มเดินเครื่อง</option>
                  <option value="ปรับเครื่องระหว่างวัน">🛠 ปรับปรุง/Tuning ระหว่างวัน</option>
                </select>
              </div>

              {/* Machine Filter */}
              <div className="space-y-1">
                <span className="text-[8.5px] font-extrabold text-slate-500 uppercase tracking-wider">ตัวกรองเครื่องจักร</span>
                <select
                  value={machineFilter}
                  onChange={(e) => setMachineFilter(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-[10.5px] rounded px-2 py-1 focus:outline-none"
                >
                  <option value="all">🏭 ทั้งหมด (ทุกเครื่อง)</option>
                  {machines.map(m => (
                    <option key={m.id} value={m.id}>{m.id} - {m.name}</option>
                  ))}
                </select>
              </div>

              {/* Search Bar */}
              <div className="space-y-1">
                <span className="text-[8.5px] font-extrabold text-slate-500 uppercase tracking-wider">ค้นหาข้อความ</span>
                <div className="relative">
                  <Search size={11} className="absolute left-2 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="พิมพ์รหัส/ชื่อเครื่อง/โน้ต..."
                    className="w-full bg-slate-900 border border-slate-800 text-[10.5px] rounded pl-6.5 pr-2 py-1.5 focus:outline-none"
                  />
                </div>
              </div>

            </div>

            {/* Double click helper info */}
            <div className="text-[10px] text-slate-400 bg-slate-950/40 p-2.5 rounded-xl border border-slate-850 flex items-center gap-1.5">
              <HelpCircle size={13} className="text-cyan-400 shrink-0 animate-pulse" />
              <span>💡 <b>ดับเบิ้ลคลิก (Double-click) บนการ์ดประวัติ</b> เพื่อดูรายงานเปรียบเทียบมาตรฐานรายขั้นตอนอย่างละเอียด และระบุสาเหตุ</span>
            </div>

            {/* List */}
            {filteredLogs.length === 0 ? (
              <div className="py-12 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                <HelpCircle size={32} className="text-slate-600 animate-bounce" />
                <p className="font-semibold text-slate-400">ไม่พบข้อมูลบันทึกตามเงื่อนไขที่กรอง</p>
                <p className="text-[10px] text-slate-500">กรุณาคลิกสร้างบันทึกเวลางานจากฝั่งซ้ายมือ</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1 scrollbar-thin">
                {filteredLogs.map(log => {
                  const mName = machines.find(m => m.id === log.machineId)?.name || 'ไม่พบคอมโพเนนท์';
                  const mLine = machines.find(m => m.id === log.machineId)?.lineGroup || 'ไม่ทราบกลุ่ม';
                  
                  // Compute log SOP standard details
                  const logGuideKey = getStandardSetupGuideKey(log.machineId, mName, standardGuides);
                  const logGuide = standardGuides[logGuideKey] || standardGuides.DEFAULT;
                  const logStdDuration = logGuide ? logGuide.steps.reduce((sum, s) => sum + s.stdTime, 0) : 0;
                  const logTimeDiff = log.totalDuration - logStdDuration;

                  return (
                    <div 
                      key={log.id} 
                      onDoubleClick={() => setSelectedLogForDetail(log)}
                      className="bg-[#0b1222] border border-slate-800 rounded-xl p-4 hover:border-slate-700/60 transition duration-200 space-y-3 shadow-md cursor-pointer select-none hover:shadow-lg hover:shadow-cyan-500/5 relative group"
                      title="ดับเบิ้ลคลิกเพื่อดูรายละเอียดความเบี่ยงเบน"
                    >
                      {/* Double click absolute badge helper */}
                      <span className="absolute top-2 right-16 opacity-0 group-hover:opacity-100 transition duration-200 text-[8px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/20">
                        🖱️ Double-click to expand
                      </span>

                      {/* Top bar info */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-850 pb-2.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-white leading-none">
                              {mName} [{log.machineId}]
                            </span>
                            <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 rounded text-[9px] font-mono font-medium">
                              {mLine}
                            </span>
                            <span className={`px-2 py-0.5 text-[8.5px] font-extrabold border rounded ${
                              log.type === 'Setupก่อนผลิต'
                                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {log.type === 'Setupก่อนผลิต' ? '⚙️ Setup ก่อนผลิต' : '🛠 ปรับเครื่องหน้างาน'}
                            </span>
                            {/* SOP Comparison Badge */}
                            <span className={`px-2 py-0.5 text-[8.5px] font-extrabold border rounded flex items-center gap-1 ${
                              logTimeDiff === 0 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : logTimeDiff > 0 
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}>
                              {logTimeDiff === 0 
                                ? '⏱️ ตรงเกณฑ์มาตรฐาน' 
                                : logTimeDiff > 0 
                                  ? `⏱️ ช้ากว่าเกณฑ์ +${logTimeDiff} นาที` 
                                  : `⏱️ เร็วกว่าเกณฑ์ ${logTimeDiff} นาที`}
                            </span>
                          </div>
                          
                          {/* Tech list tag */}
                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <Users size={11} className="text-slate-500" />
                            <span className="font-semibold text-cyan-300/90">
                              ช่างที่ปฏิบัติงาน: {log.technicians.join(', ')}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons + Date */}
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">
                            📅 {log.date}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(log);
                            }}
                            className="p-1 px-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 border border-slate-850 hover:border-slate-700 rounded transition text-[10px] flex items-center gap-0.5"
                            title="แก้ไขประวัติ"
                          >
                            <Edit2 size={11} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLog(log.id);
                            }}
                            className="p-1 px-1.5 bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-850 hover:border-red-900 rounded transition text-[10px] flex items-center gap-0.5"
                            title="ลบรายงาน"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>

                      {/* Display Steps block */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-2 bg-slate-950/40 rounded-lg border border-slate-850/60">
                        {log.steps.map(step => (
                          <div 
                            key={step.stepName}
                            className={`p-1 px-1.5 rounded flex flex-col border ${
                              step.completed 
                                ? 'bg-cyan-500/5 border-cyan-500/10 text-cyan-300' 
                                : 'bg-slate-900/30 border-slate-900/10 text-slate-600 opacity-45'
                            }`}
                          >
                            <span className="text-[8.5px] truncate max-w-full font-semibold">{step.stepName}</span>
                            <span className="text-[11px] font-mono font-black mt-0.5">
                              {step.completed ? `${step.duration} นาที` : '-(ข้าม)'}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Detailed comparison banner directly in history item */}
                      <div className="text-[10px] bg-slate-950/45 p-2.5 rounded-lg border border-slate-850/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 font-medium">📋 เกณฑ์มาตรฐาน SOP:</span>
                          <span className="font-mono text-cyan-400 font-black bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/15">{logStdDuration} นาที</span>
                        </div>
                        <div className="hidden sm:block text-slate-850">|</div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 font-medium">⏱️ เวลาที่ทำจริง:</span>
                          <span className="font-mono text-white font-extrabold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">{log.totalDuration} นาที</span>
                        </div>
                        <div className="hidden sm:block text-slate-850">|</div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 font-medium">สถานะรวม:</span>
                          {logTimeDiff === 0 ? (
                            <span className="text-emerald-400 font-black">🟢 ตรงมาตรฐานพอดี</span>
                          ) : logTimeDiff > 0 ? (
                            <span className="text-amber-400 font-black">⚠️ ช้ากว่าเกณฑ์ +{logTimeDiff} นาที</span>
                          ) : (
                            <span className="text-emerald-400 font-black">⚡ เร็วกว่าเกณฑ์ {Math.abs(logTimeDiff)} นาที</span>
                          )}
                        </div>
                      </div>

                      {/* Total and notes */}
                      <div className="flex flex-col gap-2 pt-1.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          {/* Note statement */}
                          <div className="text-[10px] text-slate-400 italic font-medium flex items-start gap-1">
                            <Info size={12} className="text-slate-500 shrink-0 mt-0.5" />
                            <span><b>บันทึกช่าง:</b> {log.note || '(ไม่มีบันทึกข้อเสนอแนะเพิ่มเติม)'}</span>
                          </div>

                          {/* Total Duration block loaded */}
                          <div className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-lg self-end sm:self-auto">
                            <Clock size={11} className="text-cyan-400" />
                            <span className="text-[10px] text-slate-400 font-bold">เวลารวมโหลด:</span>
                            <span className="font-mono text-xs font-black text-cyan-300">{log.totalDuration} นาที</span>
                          </div>
                        </div>

                        {/* Deviation explanation (Why discrepancies happened) */}
                        {logTimeDiff !== 0 && (
                          <div className="text-[10px] bg-slate-950/45 border border-slate-850 p-2.5 rounded-lg flex items-start gap-1.5">
                            <HelpCircle size={12} className="text-amber-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <span className="font-extrabold text-amber-400">❓ สาเหตุความต่างจากมาตรฐาน: </span>
                              <span className="text-slate-300 font-medium">{log.deviationReason || '(ไม่มีประวัติบันทึกสาเหตุไว้)'}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Standard Instruction Info Card */}
            <div className="bg-slate-950/50 border border-slate-850/80 p-3.5 rounded-xl text-[10px] text-slate-400 space-y-1.5">
              <div className="flex items-center gap-1 text-slate-200 font-bold text-xs mb-1">
                <ClipboardCheck size={14} className="text-[#38bdf8]" />
                <span>คำชี้แจงมาตรฐาน SOP การตั้งเครื่องจักรอบผลิต (Standard Operating Procedure)</span>
              </div>
              <p>
                1. <b>การเตรียมพร้อม (Setupก่อนผลิต):</b> ดำเนินการโดยกลุ่มช่างเทคนิคก่อนเวลาเริ่มสายกะ 15 นาที เพื่อลดปัญหารถผลิตหยุดชะงัก (Downtime)
              </p>
              <p>
                2. <b>การต่อม้วนและการปรับฟิล์ม (ต่อฟิล์ม / ตั้งฟิล์ม):</b> ช่างผู้รับผิดชอบต้องคำนวณระยะรอยต่อฟิล์มให้ลงล็อค และลงบันทึกเวลาเพื่อลงระบบคำนวณ workload ลิคมิตการตรวจรับประจำสัปดาห์
              </p>
            </div>

          </div>
        </div>

      </div>

      {/* ==========================================
          === 1. CUSTOM EDIT MODAL OVERLAY ===
          ========================================== */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" id="setup-edit-modal-overlay">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" id="setup-edit-modal">
            {/* Modal Header */}
            <div className="bg-slate-950 border-b border-slate-800 px-5 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Edit2 size={16} className="text-cyan-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  ✏️ แก้ไขบันทึกประวัติการ Setup & Tuning
                </h2>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 scrollbar-thin text-xs text-slate-200">
              <form onSubmit={handleSubmitLog} className="space-y-4">
                {/* Form Input Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Date */}
                  <div className="space-y-1.5">
                    <label className="font-extrabold text-slate-350">📅 วันที่ปฏิบัติงาน *</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                    />
                  </div>

                  {/* Type */}
                  <div className="space-y-1.5">
                    <label className="font-extrabold text-slate-350">🔧 ประเภทงานเข้าทำ *</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                    >
                      <option value="Setupก่อนผลิต">⚙️ Setup ก่อนเริ่มเดินเครื่อง</option>
                      <option value="ปรับเครื่องระหว่างวัน">🛠 ปรับปรุง/Tuning ระหว่างวัน</option>
                    </select>
                  </div>
                </div>

                {/* Machine Selection */}
                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-350 flex justify-between">
                    <span>🏭 อุปกรณ์/เครื่องจักรสายไลน์ผลิต *</span>
                    <span className="text-[10px] text-cyan-400 font-mono font-bold">
                      ({machines.find(m => m.id === machineId)?.lineGroup || 'ไม่ระบุกลุ่ม'})
                    </span>
                  </label>
                  <select
                    value={machineId}
                    onChange={(e) => setMachineId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  >
                    <option value="" disabled>-- เลือกเครื่องจักร --</option>
                    {machines.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} [{m.id}] - {m.lineGroup}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Multi Technicians Selection */}
                <div className="space-y-1.5 bg-slate-950/45 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-extrabold text-[#38bdf8] flex items-center gap-1">
                      👥 รายชื่อช่างปฏิบัติการผู้รับผิดชอบ *
                    </label>
                    <span className="font-mono text-[10px] text-cyan-400 font-black">
                      เลือก {selectedTechs.length} คน
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-[110px] overflow-y-auto border border-slate-850/60 bg-slate-950 p-2 rounded-lg scrollbar-thin">
                    {technicians.map(tech => {
                      const isSelected = selectedTechs.includes(tech);
                      return (
                        <label
                          key={tech}
                          className={`flex items-center gap-2 p-1.5 rounded border transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 font-black' 
                              : 'bg-slate-900/40 border-slate-850 text-slate-400 hover:text-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleTech(tech)}
                            className="w-3.5 h-3.5 rounded accent-cyan-500"
                          />
                          <span className="text-[10px] truncate">{tech}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Steps configuration details */}
                <div className="space-y-2.5 bg-slate-950/20 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center">
                    <label className="font-extrabold text-white flex items-center gap-1.5">
                      <Clock size={13} className="text-cyan-400" />
                      <span>บันทึกระยะเวลารายขั้นตอนย่อย (ในสเต็ปการทำ) *</span>
                    </label>
                    <span className="text-[9.5px] font-bold text-slate-400">
                      ({steps.length} ขั้นตอน)
                    </span>
                  </div>
                  
                  {/* Step entries list */}
                  <div className="space-y-1.5">
                    {steps.map((s, index) => (
                      <div 
                        key={s.stepName}
                        className={`grid grid-cols-12 gap-2 items-center p-2 rounded border transition duration-200 ${
                          s.completed 
                            ? 'bg-cyan-500/5 border-cyan-500/15 text-cyan-300' 
                            : 'bg-slate-950/50 border-slate-850 text-slate-500 opacity-60'
                        }`}
                      >
                        <div className="col-span-1 flex justify-center">
                          <input
                            type="checkbox"
                            checked={s.completed}
                            onChange={() => handleToggleStepCompleted(index)}
                            className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
                          />
                        </div>
                        <div className="col-span-5 flex flex-col">
                          <span className="font-extrabold text-[10.5px]">{s.stepName}</span>
                          <span className="text-[8.5px] text-slate-400">สเต็ปปฏิบัติการที่ {index + 1}</span>
                        </div>
                        <div className="col-span-4 flex items-center gap-1">
                          <input
                            type="number"
                            value={s.completed ? s.duration : ''}
                            disabled={!s.completed}
                            onChange={(e) => handleChangeStepDuration(index, Number(e.target.value))}
                            min="0"
                            placeholder="ข้าม"
                            className="w-16 bg-slate-950 border border-slate-800 text-slate-200 text-xs text-center rounded py-1 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-40 font-mono font-bold"
                          />
                          <span className="text-[9px] text-slate-400">นาที</span>
                        </div>
                        <div className="col-span-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleDeleteStep(index)}
                            className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-950/20 rounded transition"
                            title="ลบขั้นตอนนี้"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Custom Setup Step inline */}
                  <div className="p-2.5 bg-slate-950/50 border border-slate-850/80 rounded-lg space-y-1.5 mt-2">
                    <span className="text-[9.5px] font-black text-cyan-300 uppercase block">➕ เพิ่มขั้นตอนย่อย (Custom setup steps)</span>
                    <div className="grid grid-cols-7 gap-1.5">
                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder="ชื่อสเต็ปใหม่..."
                          value={customStepName}
                          onChange={(e) => setCustomStepName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10.5px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                        />
                      </div>
                      <div className="col-span-2 flex items-center gap-1">
                        <input
                          type="number"
                          placeholder="นาที"
                          value={customStepDuration}
                          onChange={(e) => setCustomStepDuration(e.target.value)}
                          min="0"
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10.5px] text-center text-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 font-mono font-bold"
                        />
                      </div>
                      <div className="col-span-2">
                        <button
                          type="button"
                          onClick={handleAddCustomStep}
                          className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[10.5px] font-black py-1 rounded transition text-center flex items-center justify-center cursor-pointer"
                        >
                          เพิ่ม
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Live total workload summary */}
                  <div className="flex justify-between items-center pt-2.5 border-t border-slate-800/80 mt-2">
                    <span className="font-extrabold text-slate-400 text-[10.5px]">เวลารวมลงชั่วโมงภาระงาน:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-base font-black text-white">{currentTotalDuration}</span>
                      <span className="text-[10px] text-slate-400">นาที/คน</span>
                    </div>
                  </div>
                </div>

                {/* Observation note */}
                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-350">📝 บันทึกผล/ข้อเสนอแนะเพิ่มเติม</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="ระบุข้อสังเกตและปัญหาเพิ่มเติม"
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none"
                  />
                </div>

                {/* Modal actions */}
                <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-[11px] bg-slate-950 hover:bg-slate-850 border border-slate-800 font-bold rounded-xl transition cursor-pointer text-slate-400"
                  >
                    ยกเลิกการแก้ไข
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-[11px] bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/5"
                  >
                    <Save size={13} />
                    <span>💾 บันทึกการแก้ไขข้อมูล</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          === 2. CUSTOM DELETE MODAL OVERLAY ===
          ========================================== */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" id="setup-delete-modal-overlay">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl" id="setup-delete-modal">
            <div className="flex items-center gap-3 text-red-400">
              <Trash2 size={24} className="animate-pulse" />
              <h3 className="text-sm font-black text-white">ยืนยันการลบประวัติเวลา Setup เครื่อง</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              คุณแน่ใจหรือไม่ว่าจะลบประวัติเวลา Setup เครื่องนี้? การลบข้อมูลนี้จะทำให้อัตราคำนวณ Workload และสถิติของเครื่องจักรหายไปด้วย
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 text-[11px] bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 font-bold rounded-xl transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  setSetupLogs(prev => prev.filter(log => log.id !== deleteTargetId));
                  setDeleteTargetId(null);
                  showAlert('success', '🗑 ลบรายการประวัติลงเวลานวัตกรรม Setup เรียบร้อย!');
                }}
                className="px-5 py-2 text-[11px] bg-red-600 hover:bg-red-500 text-white font-black rounded-xl transition cursor-pointer shadow-lg shadow-red-600/10"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          === 3. QUICK MACHINE ADD/EDIT MODAL ===
          ========================================== */}
      {machineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" id="machine-quick-modal-overlay">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col" id="machine-quick-modal">
            <div className="bg-slate-950 border-b border-slate-800 px-5 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Settings size={16} className="text-emerald-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  {editingMachineObj ? '✏️ แก้ไขข้อมูลเครื่องจักร' : '➕ ลงทะเบียนเครื่องจักรใหม่'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setMachineModalOpen(false)}
                className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMachine} className="p-5 space-y-4 text-xs text-slate-200">
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-350">🆔 รหัสเครื่องจักร * (เช่น RIM02, FFS05)</label>
                <input
                  type="text"
                  required
                  disabled={!!editingMachineObj}
                  value={mId}
                  onChange={(e) => setMId(e.target.value)}
                  placeholder="รหัสเครื่องจักรเป็นภาษาอังกฤษพิมพ์ใหญ่"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-350">🏭 ชื่อเครื่องจักรภาษาไทย/อังกฤษ *</label>
                <input
                  type="text"
                  required
                  value={mName}
                  onChange={(e) => setMName(e.target.value)}
                  placeholder="เช่น เครื่องผสมข้าว, Horizontal Form Fill Seal"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-350">📍 ไลน์ผลิต/กลุ่ม *</label>
                  <select
                    value={mLineGroup}
                    onChange={(e) => setMLineGroup(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  >
                    <option value="LINE A">LINE A</option>
                    <option value="LINE B">LINE B</option>
                    <option value="LINE C">LINE C</option>
                    <option value="LINE D">LINE D</option>
                    <option value="OFFLINE">OFFLINE / บำรุงภายนอก</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-350">⚙️ สถานะทำงานปกติ</label>
                  <select
                    value={mStatus}
                    onChange={(e) => setMStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  >
                    <option value="ปกติ">🟢 ปกติ (พร้อมเดินงาน)</option>
                    <option value="เสีย/ซ่อม">🔴 เสีย / อยู่ระหว่างซ่อม</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setMachineModalOpen(false)}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 font-bold rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/5"
                >
                  <Save size={13} />
                  <span>บันทึกข้อมูลเครื่องจักร</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          === 4. CONFIRM DELETE MACHINE MODAL ===
          ========================================== */}
      {machineToDeleteObj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" id="machine-delete-modal-overlay">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl" id="machine-delete-modal">
            <div className="flex items-center gap-3 text-rose-400">
              <Trash2 size={24} className="animate-pulse" />
              <h3 className="text-sm font-black text-white">ลบข้อมูลทะเบียนเครื่องจักร</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              คุณแน่ใจหรือไม่ว่าต้องการลบเครื่องจักร <span className="text-white font-bold font-mono">[{machineToDeleteObj}]</span> ออกจากสารบบ? 
              (การลบข้อมูลนี้จะไม่ส่งผลต่อประวัติบันทึกการทำงานในอดีต แต่เครื่องจักรนี้จะหายไปจากแบบฟอร์มการเลือก)
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMachineToDeleteObj(null)}
                className="px-4 py-2 text-[11px] bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 font-bold rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteMachine}
                className="px-5 py-2 text-[11px] bg-red-600 hover:bg-red-500 text-white font-black rounded-xl transition cursor-pointer"
              >
                ยืนยันการลบออก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          === 5. SOP GUIDE ADD/EDIT MODAL ===
          ========================================== */}
      {guideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" id="guide-modal-overlay">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" id="guide-modal">
            <div className="bg-slate-950 border-b border-slate-800 px-5 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-cyan-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  {editingGuideKey ? '✏️ แก้ไขคู่มือและเวลาเกณฑ์อ้างอิง SOP' : '➕ เพิ่มคู่มือมาตรฐานเวลางาน SOP ใหม่'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setGuideModalOpen(false)}
                className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveGuide} className="p-5 space-y-4 overflow-y-auto flex-1 scrollbar-thin text-xs text-slate-200">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1 space-y-1.5">
                  <label className="font-extrabold text-slate-350">🏷️ รหัสย่อคีย์กลุ่ม *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingGuideKey && editingGuideKey === 'DEFAULT'}
                    value={gKey}
                    onChange={(e) => setGKey(e.target.value)}
                    placeholder="เช่น RIM, VAC, XYZ"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 disabled:opacity-50 uppercase"
                  />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="font-extrabold text-slate-350">📚 ชื่อหัวข้อคู่มือมาตรฐาน *</label>
                  <input
                    type="text"
                    required
                    value={gTitle}
                    onChange={(e) => setGTitle(e.target.value)}
                    placeholder="เช่น เครื่องซีลแก้วกึ่งอัตโนมัติ"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-350">📝 คำอธิบายสั้นๆ เกี่ยวกับเครื่องจักร</label>
                <input
                  type="text"
                  value={gDesc}
                  onChange={(e) => setGDesc(e.target.value)}
                  placeholder="เช่น อุปกรณ์ลดอุณหภูมิสินค้าด้วยแรงกดและไอน้ำเย็นด่วน"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                />
              </div>

              {/* Steps management inside the guide */}
              <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                <label className="font-extrabold text-white block mb-1">📋 รายละเอียดขั้นตอนมาตรฐาน ({gSteps.length} สเต็ป)</label>
                
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {gSteps.map((step, idx) => (
                    <div key={idx} className="bg-slate-900 border border-slate-800 rounded p-2 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 font-bold text-slate-200">
                          <span className="text-[10px] text-slate-500">#{idx+1}</span>
                          <span>{step.name}</span>
                          <span className="text-[9px] text-cyan-400 bg-cyan-500/5 px-1.5 rounded font-mono">⏱️ {step.stdTime} นาที</span>
                        </div>
                        {step.detail && <p className="text-[9.5px] text-slate-400 truncate">{step.detail}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveGuideStep(idx)}
                        className="p-1 hover:bg-slate-800 text-slate-500 hover:text-red-400 rounded transition"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {gSteps.length === 0 && (
                    <p className="text-center text-[10px] text-slate-500 italic py-2">ยังไม่มีขั้นตอนย่อย กรุณาเพิ่มสเต็ปที่ช่องกรอกข้อมูลด้านล่าง</p>
                  )}
                </div>

                {/* Inline form to append a step */}
                <div className="pt-2 border-t border-slate-800 space-y-2 mt-2">
                  <span className="text-[9px] font-black text-cyan-300 uppercase block">➕ เพิ่มขั้นตอนมาตรฐานย่อย (Add SOP Step)</span>
                  <div className="grid grid-cols-12 gap-1.5">
                    <div className="col-span-7">
                      <input
                        type="text"
                        placeholder="ชื่อสเต็ป เช่น ปรับแกนดึงกระดาษ"
                        value={newGStepName}
                        onChange={(e) => setNewGStepName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-200 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="เวลา"
                        value={newGStepTime}
                        onChange={(e) => setNewGStepTime(Number(e.target.value))}
                        min="1"
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-center text-cyan-300 focus:outline-none font-mono"
                      />
                    </div>
                    <div className="col-span-2">
                      <button
                        type="button"
                        onClick={handleAddGuideStep}
                        className="w-full bg-cyan-500 text-slate-950 text-[10px] font-black py-1 rounded transition text-center cursor-pointer"
                      >
                        บวกสเต็ป
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="รายละเอียดเพิ่มเติม (เช่น ปรับระดับน็อตเบอร์ 14 ความร้อน 130 องศา)"
                    value={newGStepDetail}
                    onChange={(e) => setNewGStepDetail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setGuideModalOpen(false)}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 font-bold rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-cyan-500/5"
                >
                  <Save size={13} />
                  <span>บันทึกคู่มือ SOP</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Detailed Setup Log Deviation Modal */}
      {selectedLogForDetail && (() => {
        const detailMachineName = machines.find(m => m.id === selectedLogForDetail.machineId)?.name || 'ไม่พบคอมโพเนนท์';
        const detailMachineLine = machines.find(m => m.id === selectedLogForDetail.machineId)?.lineGroup || 'ไม่ทราบกลุ่ม';
        const detailGuideKey = getStandardSetupGuideKey(selectedLogForDetail.machineId, detailMachineName, standardGuides);
        const detailGuide = standardGuides[detailGuideKey] || standardGuides.DEFAULT;
        const detailStdTotalDuration = detailGuide ? detailGuide.steps.reduce((sum, s) => sum + s.stdTime, 0) : 0;
        const detailTimeDiff = selectedLogForDetail.totalDuration - detailStdTotalDuration;

        return (
          <div 
            id="setup-log-detail-modal-overlay"
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedLogForDetail(null)}
          >
            <div 
              id="setup-log-detail-modal"
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    📋 รายงานเปรียบเทียบค่ามาตรฐานรายขั้นตอน (SOP Deviation Report)
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    เปรียบเทียบเวลามาตรฐาน (SOP Standard) กับเวลาบันทึกการทำงานจริงของเครื่องจักร
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedLogForDetail(null)}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4 overflow-y-auto">
                {/* Machine Card Header */}
                <div className="bg-slate-950/65 border border-slate-850 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-black text-cyan-300">
                        {detailMachineName} [{selectedLogForDetail.machineId}]
                      </span>
                      <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 rounded text-[9px] font-mono">
                        {detailMachineLine}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9.5px] text-slate-400">
                      <span>📅 วันที่: <b>{selectedLogForDetail.date}</b></span>
                      <span>|</span>
                      <span>👤 ผู้บันทึก: <b>{selectedLogForDetail.technicians.join(', ')}</b></span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span className={`px-2.5 py-1 text-[9.5px] font-extrabold border rounded-lg ${
                      selectedLogForDetail.type === 'Setupก่อนผลิต'
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {selectedLogForDetail.type === 'Setupก่อนผลิต' ? '⚙️ Setup ก่อนเริ่มเดินเครื่อง' : '🛠 ปรับปรุง/Tuning ระหว่างวัน'}
                    </span>
                  </div>
                </div>

                {/* Overall comparison summary card */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850 flex flex-col items-center justify-center text-center">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase">เวลารวมมาตรฐาน (SOP)</span>
                    <span className="text-xl font-mono font-black text-cyan-400 mt-0.5">{detailStdTotalDuration} <span className="text-xs">นาที</span></span>
                  </div>
                  <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850 flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-mono font-black text-white mt-0.5">{selectedLogForDetail.totalDuration} <span className="text-xs">นาที</span></span>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase mt-0.5">เวลารวมที่ทำจริง</span>
                  </div>
                  <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850 flex flex-col items-center justify-center text-center">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase">ความต่างเบี่ยงเบน (Deviation)</span>
                    <span className="mt-0.5">
                      {detailTimeDiff === 0 ? (
                        <span className="text-sm font-black text-emerald-400">🟢 ตรงเกณฑ์พอดี</span>
                      ) : detailTimeDiff > 0 ? (
                        <span className="text-sm font-black text-amber-400">⚠️ ช้ากว่าเกณฑ์ +{detailTimeDiff} นาที</span>
                      ) : (
                        <span className="text-sm font-black text-teal-400">⚡ เร็วกว่าเกณฑ์ {Math.abs(detailTimeDiff)} นาที</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Steps Detailed Table */}
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">🔬 รายละเอียดเปรียบเทียบรายขั้นตอน (Step-by-step analysis)</h4>
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/30">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] font-bold text-slate-400">
                          <th className="p-2.5 pl-3">ขั้นตอนการทำงาน</th>
                          <th className="p-2.5 text-center w-28">มาตรฐาน SOP</th>
                          <th className="p-2.5 text-center w-28">เวลาทำจริง</th>
                          <th className="p-2.5 text-center w-28">ผลต่าง</th>
                        </tr>
                      </thead>
                      <tbody className="text-[10.5px]">
                        {selectedLogForDetail.steps.map((step: any, sIdx: number) => {
                          const stdStep = detailGuide?.steps.find((s: any) => s.name === step.stepName);
                          const stdTime = stdStep ? stdStep.stdTime : 0;
                          const actualTime = step.completed ? step.duration : 0;
                          const diff = step.completed ? (actualTime - stdTime) : 0;

                          return (
                            <tr key={sIdx} className="border-b border-slate-850/50 hover:bg-slate-950/20">
                              <td className="p-2.5 pl-3">
                                <div className="font-extrabold text-slate-200">{step.stepName}</div>
                                {stdStep?.detail && (
                                  <div className="text-[9.5px] text-slate-400 mt-0.5 line-clamp-1" title={stdStep.detail}>
                                    📌 {stdStep.detail}
                                  </div>
                                )}
                              </td>
                              <td className="p-2.5 text-center font-mono font-bold text-cyan-400">
                                {stdStep ? `${stdTime} นาที` : '-(ไม่มีเกณฑ์)'}
                              </td>
                              <td className="p-2.5 text-center font-mono text-slate-200">
                                {step.completed ? `${actualTime} นาที` : <span className="text-slate-500 italic">ข้ามขั้นตอน</span>}
                              </td>
                              <td className="p-2.5 text-center font-mono">
                                {!step.completed ? (
                                  <span className="text-slate-500">-</span>
                                ) : diff === 0 ? (
                                  <span className="text-emerald-400 font-bold">0</span>
                                ) : diff > 0 ? (
                                  <span className="text-amber-400 font-bold">+{diff} นาที</span>
                                ) : (
                                  <span className="text-teal-400 font-bold">{diff} นาที</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Deviation explanation (Why discrepancy happened) */}
                <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3.5 space-y-1">
                  <h4 className="text-[10.5px] font-black text-amber-400 flex items-center gap-1">
                    ❓ สาเหตุความเบี่ยงเบนจากเกณฑ์เวลามาตรฐาน (เพราะอะไร):
                  </h4>
                  <p className="text-[11px] text-slate-200 leading-relaxed bg-slate-950/40 p-2 rounded border border-slate-850 mt-1 font-medium">
                    {selectedLogForDetail.deviationReason || '🟢 ขั้นตอนทั้งหมดเสร็จสิ้นภายในเกณฑ์มาตรฐาน หรือไม่มีการระบุสาเหตุความต่าง'}
                  </p>
                </div>

                {/* Additional Technician Note */}
                <div className="bg-slate-950/30 border border-slate-850 rounded-xl p-3 space-y-1">
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase">📝 บันทึกเพิ่มเติมของช่าง:</span>
                  <p className="text-[10.5px] text-slate-300 italic font-medium">
                    "{selectedLogForDetail.note || 'ไม่มีข้อสังเกตหรือบันทึกเพิ่มเติม'}"
                  </p>
                </div>
              </div>

              {/* Close footer */}
              <div className="p-3 bg-slate-950 border-t border-slate-850 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedLogForDetail(null)}
                  className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs transition cursor-pointer shadow-lg shadow-cyan-500/5"
                >
                  ตกลง / ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
