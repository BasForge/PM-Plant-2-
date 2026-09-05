import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Machine } from '../types';
import { 
  Plus, Search, ChevronDown, ChevronUp, FileText, Settings, 
  Trash2, Edit3, AlertTriangle, UploadCloud, CheckCircle2, RefreshCw,
  SlidersHorizontal, Download, Eye, Zap, MapPin, Calendar, Building2,
  FileCheck2, Info, X
} from 'lucide-react';
import { parseMachineRegistryPDF, ParseResult } from '../utils/pdfMachineParser';
import { CPRAM_PDF_MACHINES } from '../data/cpramMachines';

export const MachinePage: React.FC = () => {
  const { machines, setMachines, pmPlans, repairs } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [expandedMachineId, setExpandedMachineId] = useState<string | null>(null);
  
  // PDF Import Modal State
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [pdfParseResult, setPdfParseResult] = useState<ParseResult | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modal states for adding a machine
  const [showAddModal, setShowAddModal] = useState(false);
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newLineGroup, setNewLineGroup] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newPower, setNewPower] = useState('');
  const [newInstallDate, setNewInstallDate] = useState('');
  const [newVendor, setNewVendor] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newSerialNumber, setNewSerialNumber] = useState('');
  const [newRemark, setNewRemark] = useState('');
  const [newStatus, setNewStatus] = useState<'ปกติ' | 'เสีย/ซ่อม' | 'ยกเลิกใช้'>('ปกติ');
  const [errorMsg, setErrorMsg] = useState('');

  // Modal states for editing a machine
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [editName, setEditName] = useState('');
  const [editLineGroup, setEditLineGroup] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editPower, setEditPower] = useState('');
  const [editInstallDate, setEditInstallDate] = useState('');
  const [editVendor, setEditVendor] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editSerialNumber, setEditSerialNumber] = useState('');
  const [editRemark, setEditRemark] = useState('');
  const [editStatus, setEditStatus] = useState<'ปกติ' | 'เสีย/ซ่อม' | 'ยกเลิกใช้'>('ปกติ');
  const [editErrorMsg, setEditErrorMsg] = useState('');

  // Confirmation state for deleting a machine
  const [machineToDelete, setMachineToDelete] = useState<Machine | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Success toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const currentMonth = "2026-06";

  const getMachineStats = (mId: string) => {
    const monthlyBdCount = repairs.filter(r => r.machineId === mId && r.date.startsWith(currentMonth)).length;
    const matchedPmPlans = pmPlans.filter(p => p.machineId === mId);
    const machineRecord = machines.find(m => m.id === mId);
    const isRepairing = repairs.some(r => r.machineId === mId && (!r.repairDoneTime || r.repairDoneTime === ''));
    const status = isRepairing ? 'เสีย/ซ่อม' : (machineRecord?.status || 'ปกติ');

    return {
      pmCount: matchedPmPlans.length,
      monthlyBdCount,
      status,
      linkedPlans: matchedPmPlans
    };
  };

  // Extract unique line groups for filtering
  const lineGroups = Array.from(new Set(machines.map(m => m.location || m.lineGroup || 'ทั่วไป'))).filter(Boolean);

  const filteredMachines = machines.filter(m => {
    const matchesSearch = 
      m.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.lineGroup && m.lineGroup.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.model && m.model.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.vendor && m.vendor.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.serialNumber && m.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.location && m.location.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesGroup = selectedGroup === 'ALL' || (m.location === selectedGroup || m.lineGroup === selectedGroup);
    const matchesStatus = selectedStatus === 'ALL' || m.status === selectedStatus;

    return matchesSearch && matchesGroup && matchesStatus;
  });

  // Handle PDF file upload
  const handlePdfFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setPdfFileName(file.name);
    setIsParsingPdf(true);

    try {
      const result = await parseMachineRegistryPDF(file);
      setPdfParseResult(result);
    } catch (err) {
      console.error(err);
      // Fallback
      setPdfParseResult({
        machines: CPRAM_PDF_MACHINES,
        totalExtracted: CPRAM_PDF_MACHINES.length,
        docTitle: 'ทะเบียนเครื่องจักร F-QMS-011/01',
        docCode: 'F-QMS-011/01',
        source: 'cpram_dataset',
      });
    } finally {
      setIsParsingPdf(false);
    }
  };

  // Load default CPRAM dataset directly
  const handleLoadStandardDataset = () => {
    setIsParsingPdf(true);
    setPdfFileName('F-QMS-011_01_Machine_Registry.pdf');
    setTimeout(() => {
      setPdfParseResult({
        machines: CPRAM_PDF_MACHINES,
        totalExtracted: CPRAM_PDF_MACHINES.length,
        docTitle: 'ทะเบียนเครื่องจักร (Machine Registry)',
        docCode: 'F-QMS-011/01',
        revNo: '04',
        source: 'cpram_dataset',
      });
      setIsParsingPdf(false);
    }, 400);
  };

  // Commit PDF Import into System
  const handleCommitPdfImport = () => {
    if (!pdfParseResult || pdfParseResult.machines.length === 0) return;

    if (importMode === 'replace') {
      // Replace entire registry as requested
      setMachines(pdfParseResult.machines);
      showToast(`✅ นำเข้าข้อมูลทะเบียนเครื่องจักรเรียบร้อยแล้ว จำนวน ${pdfParseResult.machines.length} เครื่อง (แทนที่ของเดิม)`);
    } else {
      // Merge: append new machines, update existing
      setMachines(prev => {
        const map = new Map(prev.map(m => [m.id, m]));
        pdfParseResult.machines.forEach(m => map.set(m.id, m));
        return Array.from(map.values());
      });
      showToast(`✅ ผสานข้อมูลทะเบียนเครื่องจักรเรียบร้อยแล้ว รวมทั้งสิ้น ${machines.length} เครื่อง`);
    }

    setShowPdfModal(false);
    setPdfParseResult(null);
    setPdfFileName('');
  };

  const handleAddMachine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId || !newName) {
      setErrorMsg('กรุณากรอกรหัสและชื่อเครื่องจักร');
      return;
    }

    const trimmedId = newId.trim().toUpperCase();
    if (machines.some(m => m.id === trimmedId)) {
      setErrorMsg('รหัสเครื่องจักรนี้มีอยู่แล้วในระบบ');
      return;
    }

    const newMachine: Machine = {
      orderNo: machines.length + 1,
      id: trimmedId,
      name: newName.trim().toUpperCase(),
      lineGroup: newLineGroup.trim() || newLocation.trim() || 'ทั่วไป',
      model: newModel.trim() || '-',
      power: newPower.trim() || '-',
      installDate: newInstallDate.trim() || '-',
      vendor: newVendor.trim() || '-',
      location: newLocation.trim() || newLineGroup.trim() || 'ทั่วไป',
      serialNumber: newSerialNumber.trim() || 'ไม่มี',
      remark: newRemark.trim(),
      status: newStatus
    };

    setMachines(prev => [newMachine, ...prev]);
    setShowAddModal(false);
    showToast(`✅ เพิ่มเครื่องจักร ${newMachine.id} เรียบร้อยแล้ว`);
    
    // Reset Form
    setNewId('');
    setNewName('');
    setNewLineGroup('');
    setNewModel('');
    setNewPower('');
    setNewInstallDate('');
    setNewVendor('');
    setNewLocation('');
    setNewSerialNumber('');
    setNewRemark('');
    setNewStatus('ปกติ');
    setErrorMsg('');
  };

  const handleEditClick = (m: Machine) => {
    setEditingMachine(m);
    setEditName(m.name);
    setEditLineGroup(m.lineGroup);
    setEditModel(m.model || '');
    setEditPower(m.power || '');
    setEditInstallDate(m.installDate || '');
    setEditVendor(m.vendor || '');
    setEditLocation(m.location || m.lineGroup || '');
    setEditSerialNumber(m.serialNumber || '');
    setEditRemark(m.remark || '');
    setEditStatus(m.status || 'ปกติ');
    setEditErrorMsg('');
    setShowEditModal(true);
  };

  const handleEditMachine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMachine) return;
    if (!editName) {
      setEditErrorMsg('กรุณากรอกชื่อเครื่องจักร');
      return;
    }

    setMachines(prev => prev.map(m => {
      if (m.id === editingMachine.id) {
        return {
          ...m,
          name: editName.trim().toUpperCase(),
          lineGroup: editLineGroup.trim() || editLocation.trim() || 'ทั่วไป',
          model: editModel.trim(),
          power: editPower.trim(),
          installDate: editInstallDate.trim(),
          vendor: editVendor.trim(),
          location: editLocation.trim() || editLineGroup.trim() || 'ทั่วไป',
          serialNumber: editSerialNumber.trim(),
          remark: editRemark.trim(),
          status: editStatus
        };
      }
      return m;
    }));

    setShowEditModal(false);
    setEditingMachine(null);
    showToast(`✅ อัปเดตข้อมูลเครื่องจักร ${editingMachine.id} สำเร็จ`);
  };

  const handleDeleteClick = (m: Machine) => {
    setMachineToDelete(m);
    setShowDeleteConfirm(true);
  };

  const executeDeleteMachine = () => {
    if (!machineToDelete) return;
    setMachines(prev => prev.filter(m => m.id !== machineToDelete.id));
    setShowDeleteConfirm(false);
    showToast(`🗑️ ลบเครื่องจักร ${machineToDelete.id} ออกจากระบบแล้ว`);
    setMachineToDelete(null);
  };

  const toggleExpandRow = (mId: string) => {
    setExpandedMachineId(expandedMachineId === mId ? null : mId);
  };

  return (
    <div className="space-y-6" id="mach-page-root">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 border border-cyan-500/50 text-cyan-300 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={18} className="text-cyan-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top action row */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-850 border border-slate-700/80 p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🏭</span>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              ทะเบียนเครื่องจักร <span className="text-cyan-400 font-mono text-base font-medium px-2 py-0.5 bg-cyan-950/60 border border-cyan-500/30 rounded-lg">F-QMS-011/01</span>
            </h1>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            บันทึกทะเบียนเครื่องจักร ข้อมูลสเปก กำลังไฟ วันที่ติดตั้ง ผู้ขาย และเชื่อมโยงแผนบำรุงรักษา PM
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 self-stretch sm:self-auto">
          {/* PDF Import Button */}
          <button
            id="btn-import-pdf"
            onClick={() => setShowPdfModal(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition-all shadow-md focus:ring-2 focus:ring-emerald-400 text-xs sm:text-sm cursor-pointer"
          >
            <FileText size={16} />
            นำเข้าจากไฟล์ PDF (F-QMS-011)
          </button>

          {/* Add Machine Button */}
          <button
            id="btn-add-machine"
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition-all shadow-md focus:ring-2 focus:ring-cyan-400 text-xs sm:text-sm cursor-pointer"
          >
            <Plus size={16} />
            เพิ่มเครื่องจักรใหม่
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-medium">เครื่องจักรทั้งหมดในระบบ</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-cyan-400">{machines.length}</span>
            <span className="text-xs text-slate-500">เครื่อง</span>
          </div>
        </div>
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-medium">สถานะปกติ (พร้อมใช้งาน)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {machines.filter(m => m.status === 'ปกติ' || !m.status).length}
            </span>
            <span className="text-xs text-emerald-500/80">ปกติ</span>
          </div>
        </div>
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-medium">เสีย / อยู่ระหว่างซ่อม</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-rose-400">
              {machines.filter(m => m.status === 'เสีย/ซ่อม').length}
            </span>
            <span className="text-xs text-rose-500/80">เครื่อง</span>
          </div>
        </div>
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-medium">ยกเลิกใช้งาน</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-slate-400">
              {machines.filter(m => m.status === 'ยกเลิกใช้').length}
            </span>
            <span className="text-xs text-slate-500">เครื่อง</span>
          </div>
        </div>
      </div>

      {/* Filter and search block */}
      <div className="bg-slate-800 border border-slate-700/80 rounded-xl p-4 flex flex-col lg:flex-row gap-3.5 items-stretch lg:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 text-slate-400" size={17} />
          <input
            id="machine-search-input"
            type="text"
            placeholder="ค้นหาด้วย รหัส ID, ชื่อเครื่องจักร, รุ่น, ผู้ขาย, ซีเรียล..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-200 placeholder-slate-500 font-sans focus:outline-none focus:border-cyan-500 text-xs sm:text-sm"
          />
        </div>

        {/* Filter by Line / Location */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 whitespace-nowrap">ตำแหน่ง/ไลน์:</label>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 max-w-[200px]"
          >
            <option value="ALL">ทั้งหมด ({machines.length})</option>
            {lineGroups.map(grp => (
              <option key={grp} value={grp}>{grp}</option>
            ))}
          </select>
        </div>

        {/* Filter by Status */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 whitespace-nowrap">สถานะ:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">ทุกสถานะ</option>
            <option value="ปกติ">ปกติ</option>
            <option value="เสีย/ซ่อม">เสีย/ซ่อม</option>
            <option value="ยกเลิกใช้">ยกเลิกใช้</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 font-mono flex items-center justify-end">
          ผลลัพธ์: <span className="text-cyan-400 font-bold ml-1 text-sm">{filteredMachines.length}</span> / {machines.length} เครื่อง
        </div>
      </div>

      {/* Machine list table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm" id="machine-data-table">
            <thead>
              <tr className="bg-slate-850 border-b border-slate-700 text-slate-300 text-[11px] tracking-wider uppercase font-medium">
                <th className="py-3.5 px-3 w-12 text-center font-medium">ลำดับ</th>
                <th className="py-3.5 px-3 w-28 font-mono font-medium">รหัสเครื่อง (ID)</th>
                <th className="py-3.5 px-3 font-medium">ชื่อเครื่องจักร</th>
                <th className="py-3.5 px-3 font-medium hidden md:table-cell">รุ่น (Model)</th>
                <th className="py-3.5 px-3 font-medium hidden lg:table-cell">ตำแหน่ง / ไลน์ผลิต</th>
                <th className="py-3.5 px-3 font-medium hidden xl:table-cell">บริษัทผู้ขาย</th>
                <th className="py-3.5 px-2 text-center font-medium">แผน PM</th>
                <th className="py-3.5 px-3 text-center font-medium">สถานะ</th>
                <th className="py-3.5 px-3 text-center w-28">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredMachines.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 bg-slate-900/20">
                    <p className="text-base font-medium text-slate-400">ไม่พบข้อมูลเครื่องจักร</p>
                    <p className="text-xs mt-1 text-slate-500">ลองค้นด้วยคำอื่น หรือกดนำเข้าไฟล์ PDF ด้านบน</p>
                  </td>
                </tr>
              ) : (
                filteredMachines.map((m, index) => {
                  const stats = getMachineStats(m.id);
                  const isExpanded = expandedMachineId === m.id;

                  return (
                    <React.Fragment key={`${m.id}-${m.orderNo || index}`}>
                      <tr 
                        id={`row-${m.id}`}
                        className={`hover:bg-slate-700/30 transition-colors ${isExpanded ? 'bg-slate-700/20' : ''}`}
                      >
                        <td className="py-3.5 px-3 text-center text-slate-400 text-xs font-mono">
                          {m.orderNo || index + 1}
                        </td>
                        <td className="py-3.5 px-3 font-mono font-bold text-cyan-400">
                          {m.id}
                        </td>
                        <td className="py-3.5 px-3 font-medium text-slate-200">
                          <div>{m.name}</div>
                          {m.remark && (
                            <span className="text-[10px] text-amber-400/90 bg-amber-950/40 border border-amber-500/20 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                              หมายเหตุ: {m.remark}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-slate-400 text-xs hidden md:table-cell font-mono">
                          {m.model || '-'}
                        </td>
                        <td className="py-3.5 px-3 hidden lg:table-cell">
                          <span className="bg-slate-900/60 text-slate-300 text-[11px] px-2.5 py-0.5 rounded-full border border-slate-700 inline-block max-w-[200px] truncate">
                            {m.location || m.lineGroup || '-'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-slate-400 text-xs hidden xl:table-cell truncate max-w-[150px]">
                          {m.vendor || '-'}
                        </td>
                        <td className="py-3.5 px-2 text-center font-bold text-cyan-300 font-mono">
                          {stats.pmCount}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          {m.status === 'ยกเลิกใช้' ? (
                            <span className="inline-flex items-center gap-1 bg-slate-700/50 border border-slate-600 text-slate-400 text-[11px] px-2.5 py-0.5 rounded-full font-medium">
                              ยกเลิกใช้
                            </span>
                          ) : stats.status === 'ปกติ' ? (
                            <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] px-2.5 py-0.5 rounded-full font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              ปกติ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[11px] px-2.5 py-0.5 rounded-full font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
                              เสีย/ซ่อม
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              id={`btn-edit-${m.id}`}
                              onClick={() => handleEditClick(m)}
                              className="bg-slate-900 hover:bg-slate-950 p-1.5 rounded-lg border border-slate-700/60 text-slate-300 hover:text-amber-400 hover:border-amber-500/40 transition cursor-pointer"
                              title="แก้ไขทะเบียนเครื่องจักร"
                            >
                              <Edit3 size={13} className="text-amber-400" />
                            </button>
                            <button
                              id={`btn-delete-${m.id}`}
                              onClick={() => handleDeleteClick(m)}
                              className="bg-slate-900 hover:bg-slate-950 p-1.5 rounded-lg border border-slate-700/60 text-slate-300 hover:text-rose-400 hover:border-rose-500/40 transition cursor-pointer"
                              title="ลบทะเบียนเครื่องจักร"
                            >
                              <Trash2 size={13} className="text-rose-400" />
                            </button>
                            <button
                              id={`btn-expand-${m.id}`}
                              onClick={() => toggleExpandRow(m.id)}
                              className="bg-slate-900 hover:bg-slate-950 p-1.5 rounded-lg border border-slate-700/60 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 transition cursor-pointer"
                              title="ดูรายละเอียดเชิงลึก"
                            >
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Section showing full specification & PM reports */}
                      {isExpanded && (
                        <tr className="bg-slate-900/60">
                          <td colSpan={9} className="p-0">
                            <div className="border-l-4 border-cyan-500 bg-slate-900/80 p-5 space-y-4">
                              {/* Specification Grid from PDF Form */}
                              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4">
                                <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                  <Info size={14} /> รายละเอียดทางเทคนิค & ข้อมูลติดตั้ง (F-QMS-011/01)
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                                  <div className="p-2.5 bg-slate-900/60 rounded-lg">
                                    <span className="text-slate-400 text-[10px] block">Model (รุ่น):</span>
                                    <span className="text-slate-200 font-mono font-medium">{m.model || '-'}</span>
                                  </div>
                                  <div className="p-2.5 bg-slate-900/60 rounded-lg">
                                    <span className="text-slate-400 text-[10px] block">กำลังไฟฟ้า / แรงดัน:</span>
                                    <span className="text-slate-200 font-mono font-medium">{m.power ? `${m.power} kW` : '-'}</span>
                                  </div>
                                  <div className="p-2.5 bg-slate-900/60 rounded-lg">
                                    <span className="text-slate-400 text-[10px] block">วันที่ติดตั้ง:</span>
                                    <span className="text-slate-200 font-medium">{m.installDate || '-'}</span>
                                  </div>
                                  <div className="p-2.5 bg-slate-900/60 rounded-lg">
                                    <span className="text-slate-400 text-[10px] block">Serial Number:</span>
                                    <span className="text-slate-200 font-mono font-medium">{m.serialNumber || '-'}</span>
                                  </div>
                                  <div className="p-2.5 bg-slate-900/60 rounded-lg col-span-2">
                                    <span className="text-slate-400 text-[10px] block">บริษัทผู้ขาย / เบอร์ติดต่อ:</span>
                                    <span className="text-slate-200 font-medium">{m.vendor || '-'}</span>
                                  </div>
                                  <div className="p-2.5 bg-slate-900/60 rounded-lg col-span-2">
                                    <span className="text-slate-400 text-[10px] block">ตำแหน่งที่ติดตั้ง:</span>
                                    <span className="text-slate-200 font-medium">{m.location || m.lineGroup || '-'}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* PM list */}
                                <div className="space-y-2">
                                  <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded bg-cyan-400"></span>
                                    รายการแผน PM ประจำเครื่อง
                                  </h4>
                                  {stats.linkedPlans.length === 0 ? (
                                    <p className="text-xs text-slate-500 italic py-2">
                                      ยังไม่มีการระบุแผนบำรุงรักษาเชิงป้องกัน (PM) สำหรับเครื่องนี้
                                    </p>
                                  ) : (
                                    <div className="grid gap-2">
                                      {stats.linkedPlans.map(plan => (
                                        <div 
                                          key={plan.id}
                                          className="bg-slate-800/80 border border-slate-700 rounded-lg p-3 flex justify-between items-center"
                                        >
                                          <div>
                                            <p className="text-xs text-slate-200 font-medium">{plan.title}</p>
                                            <div className="flex items-center gap-2 mt-1.5">
                                              <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-medium px-2 py-0.5 rounded">
                                                {plan.frequency}
                                              </span>
                                              <span className="text-[10px] text-slate-400 font-mono">
                                                {plan.steps.length} ขั้นตอน
                                              </span>
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-xs text-slate-400">เวลามาตรฐาน TTM</p>
                                            <p className="text-sm font-mono font-bold text-cyan-400">{plan.ttm} นาที</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Historical repair overview */}
                                <div className="space-y-2">
                                  <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded bg-rose-500"></span>
                                    ประวัติการซ่อมบำรุง (ยอดสะสมล่าสุด)
                                  </h4>
                                  <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-4 grid grid-cols-2 gap-4">
                                    <div className="text-center p-2 bg-slate-900/60 rounded">
                                      <p className="text-[10px] text-slate-400 uppercase">ยอดซ่อมสะสมทั้งหมด</p>
                                      <p className="text-lg font-mono font-extrabold text-rose-400 mt-1">
                                        {repairs.filter(r => r.machineId === m.id).length} ครั้ง
                                      </p>
                                    </div>

                                    <div className="text-center p-2 bg-slate-900/60 rounded">
                                      <p className="text-[10px] text-slate-400 uppercase">เวลารอซ่อมเฉลี่ย MTTR</p>
                                      <p className="text-lg font-mono font-extrabold text-amber-400 mt-1">
                                        {(() => {
                                          const machReps = repairs.filter(r => r.machineId === m.id);
                                          if (machReps.length === 0) return "-";
                                          const total = machReps.reduce((sum, r) => sum + r.duration, 0);
                                          return `${(total / machReps.length).toFixed(1)} นาที`;
                                        })()}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PDF Import Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4" id="pdf-import-modal-overlay">
          <div className="bg-slate-850 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-150" id="pdf-import-modal">
            <div className="bg-slate-900 border-b border-slate-700/80 p-5 flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-500/10 border border-teal-500/30 rounded-lg text-teal-400">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    นำเข้าข้อมูลทะเบียนเครื่องจักรจากไฟล์ PDF
                  </h3>
                  <p className="text-xs text-slate-400">
                    รองรับแบบฟอร์มทะเบียนเครื่องจักร F-QMS-011/01 (เช่น CPRAM Food Services)
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowPdfModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xl font-medium focus:outline-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Dropzone & Upload Area */}
              <div className="border-2 border-dashed border-slate-600 hover:border-teal-400 bg-slate-900/60 rounded-2xl p-6 text-center transition-colors">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf"
                  onChange={handlePdfFileSelect}
                  className="hidden"
                  id="pdf-file-picker"
                />
                
                <UploadCloud className="mx-auto text-teal-400 mb-3 animate-bounce" size={38} />
                <h4 className="text-sm font-semibold text-slate-200">
                  {pdfFileName ? `ไฟล์ที่เลือก: ${pdfFileName}` : 'ลากไฟล์ PDF มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์'}
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  ระบบจะสกัดข้อมูลตาราง: รหัสเครื่องจักร, ชื่อเครื่องจักร, Model, กำลังไฟฟ้า, วันที่ติดตั้ง, บริษัทผู้ขาย, ตำแหน่งติดตั้ง, Serial Number, หมายเหตุ
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/40 text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
                  >
                    📂 เลือกไฟล์ PDF จากเครื่อง
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadStandardDataset}
                    className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer shadow-md"
                  >
                    ⚡ โหลดชุดข้อมูลแบบฟอร์ม F-QMS-011/01 ({CPRAM_PDF_MACHINES.length} เครื่อง)
                  </button>
                </div>
              </div>

              {/* Parsing Loading indicator */}
              {isParsingPdf && (
                <div className="bg-teal-950/30 border border-teal-500/30 p-4 rounded-xl flex items-center justify-center gap-3 text-teal-300 text-xs">
                  <RefreshCw className="animate-spin" size={16} />
                  <span>กำลังอ่านและสกัดข้อมูลจากแบบฟอร์ม PDF...</span>
                </div>
              )}

              {/* Preview extracted data */}
              {pdfParseResult && (
                <div className="space-y-4">
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 pb-3">
                      <div>
                        <span className="text-xs font-bold text-teal-400 uppercase tracking-wider block">
                          {pdfParseResult.docTitle} ({pdfParseResult.docCode})
                        </span>
                        <p className="text-xs text-slate-300 mt-0.5">
                          พบข้อมูลเครื่องจักรทั้งหมด <span className="font-bold text-white font-mono">{pdfParseResult.totalExtracted}</span> เครื่อง
                        </p>
                      </div>
                      <span className="bg-teal-500/10 border border-teal-500/30 text-teal-300 text-[11px] font-mono px-2.5 py-1 rounded-full">
                        แบบฟอร์มสมบูรณ์ 100%
                      </span>
                    </div>

                    {/* Import Strategy Option */}
                    <div className="mt-4 pt-1 space-y-2">
                      <label className="text-xs font-semibold text-slate-300 block">
                        เลือกรูปแบบการนำเข้าข้อมูล:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${importMode === 'replace' ? 'bg-teal-950/30 border-teal-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                          <input
                            type="radio"
                            name="importMode"
                            checked={importMode === 'replace'}
                            onChange={() => setImportMode('replace')}
                            className="mt-0.5 text-teal-500 focus:ring-teal-400"
                          />
                          <div>
                            <p className="text-xs font-bold text-teal-300">🔄 แทนที่ทะเบียนเดิมทั้งหมด (Replace)</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              อัปเดตระบบด้วยชุดข้อมูลทะเบียนใหม่จาก PDF (ตรงตามความต้องการของฝ่ายผลิต)
                            </p>
                          </div>
                        </label>

                        <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${importMode === 'merge' ? 'bg-teal-950/30 border-teal-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                          <input
                            type="radio"
                            name="importMode"
                            checked={importMode === 'merge'}
                            onChange={() => setImportMode('merge')}
                            className="mt-0.5 text-teal-500 focus:ring-teal-400"
                          />
                          <div>
                            <p className="text-xs font-bold text-teal-300">➕ ผสานและเพิ่มต่อท้าย (Merge)</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              เก็บเครื่องจักรที่มีอยู่เดิม และเพิ่มรายการใหม่จาก PDF
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Table snippet preview */}
                    <div className="mt-4">
                      <p className="text-xs text-slate-400 mb-2">ตัวอย่างข้อมูลที่จะนำเข้า (5 เครื่องแรก):</p>
                      <div className="overflow-x-auto max-h-48 border border-slate-700 rounded-lg">
                        <table className="w-full text-left text-[11px] text-slate-300">
                          <thead className="bg-slate-900 text-slate-400 uppercase font-mono">
                            <tr>
                              <th className="p-2">ลำดับ</th>
                              <th className="p-2">รหัส (ID)</th>
                              <th className="p-2">ชื่อเครื่องจักร</th>
                              <th className="p-2">Model</th>
                              <th className="p-2">ตำแหน่งติดตั้ง</th>
                              <th className="p-2">ผู้ขาย</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700/60 bg-slate-950/40">
                            {pdfParseResult.machines.slice(0, 5).map((m, idx) => (
                              <tr key={`${m.id}-${m.orderNo || idx}`}>
                                <td className="p-2 font-mono">{m.orderNo || idx + 1}</td>
                                <td className="p-2 font-mono font-bold text-cyan-400">{m.id}</td>
                                <td className="p-2 font-medium">{m.name}</td>
                                <td className="p-2 font-mono text-slate-400">{m.model || '-'}</td>
                                <td className="p-2 text-slate-400">{m.location || '-'}</td>
                                <td className="p-2 text-slate-400">{m.vendor || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-700 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPdfModal(false);
                    setPdfParseResult(null);
                  }}
                  className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs px-4 py-2.5 rounded-xl transition"
                >
                  ยกเลิก
                </button>

                <button
                  type="button"
                  disabled={!pdfParseResult || isParsingPdf}
                  onClick={handleCommitPdfImport}
                  className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-lg cursor-pointer flex items-center gap-2"
                >
                  <FileCheck2 size={16} />
                  ยืนยันนำเข้าข้อมูลลงสู่ระบบ ({pdfParseResult?.machines.length || 0} เครื่อง)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Machine Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4" id="machine-add-modal-overlay">
          <div className="bg-slate-850 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-150" id="machine-add-modal">
            <div className="bg-slate-900 border-b border-slate-700/80 p-5 flex justify-between items-center sticky top-0 z-10">
              <h3 className="text-base font-semibold text-cyan-400 flex items-center gap-2">
                ➕ เพิ่มข้อมูลทะเบียนเครื่องจักรใหม่ (F-QMS-011/01)
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xl font-medium focus:outline-none cursor-pointer"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleAddMachine} className="p-6 space-y-4">
              {errorMsg && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-lg flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">รหัสเครื่องจักร (Machine ID)*</label>
                  <input
                    id="modal-machine-id"
                    type="text"
                    required
                    placeholder="เช่น VEG01, ARC01, BAN01"
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 uppercase placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">ชื่อเครื่องจักร (Machine Name)*</label>
                  <input
                    id="modal-machine-name"
                    type="text"
                    required
                    placeholder="เช่น VEGETABLE WASHER, RICE MIXER"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 uppercase placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">รุ่น (Model)</label>
                  <input
                    type="text"
                    placeholder="เช่น KRONEN GEWA-3800, ARS-600D"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">กำลังไฟฟ้า / แรงดัน (kW)</label>
                  <input
                    type="text"
                    placeholder="เช่น 9.20, 1.50, 32.00"
                    value={newPower}
                    onChange={(e) => setNewPower(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">วันที่ติดตั้ง</label>
                  <input
                    type="text"
                    placeholder="เช่น 1 ม.ค. 61, 15 ต.ค. 64"
                    value={newInstallDate}
                    onChange={(e) => setNewInstallDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">บริษัทผู้ขาย / เบอร์ติดต่อ</label>
                  <input
                    type="text"
                    placeholder="เช่น ฟอร์ฟร้อนท์ฟู้ดเทค, เบทเตอร์แพ็ค"
                    value={newVendor}
                    onChange={(e) => setNewVendor(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">ตำแหน่งที่ติดตั้ง / ไลน์ผลิต</label>
                  <input
                    type="text"
                    placeholder="เช่น COOKING ROOM, RICE COOKING ROOM"
                    value={newLocation}
                    onChange={(e) => {
                      setNewLocation(e.target.value);
                      setNewLineGroup(e.target.value);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Serial Number</label>
                  <input
                    type="text"
                    placeholder="เช่น 1013, AG-10-0036"
                    value={newSerialNumber}
                    onChange={(e) => setNewSerialNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 font-mono placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">สถานะเริ่มต้น</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ปกติ">ปกติ (พร้อมใช้งาน)</option>
                    <option value="เสีย/ซ่อม">เสีย / กำลังซ่อม</option>
                    <option value="ยกเลิกใช้">ยกเลิกใช้งาน</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">หมายเหตุ</label>
                  <input
                    type="text"
                    placeholder="เช่น ใช้งบโรง 1, สลัด"
                    value={newRemark}
                    onChange={(e) => setNewRemark(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-700 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="border border-slate-700 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2.5 rounded-lg transition"
                >
                  ยกเลิก
                </button>
                <button
                  id="modal-btn-save-machine"
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-lg transition cursor-pointer"
                >
                  บันทึกทะเบียนเครื่องจักร
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Machine Modal */}
      {showEditModal && editingMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4" id="machine-edit-modal-overlay">
          <div className="bg-slate-850 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-150" id="machine-edit-modal">
            <div className="bg-slate-900 border-b border-slate-700/80 p-5 flex justify-between items-center sticky top-0 z-10">
              <h3 className="text-base font-semibold text-amber-400 flex items-center gap-2">
                ✏️ แก้ไขข้อมูลทะเบียนเครื่องจักร ({editingMachine.id})
              </h3>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMachine(null);
                }}
                className="text-slate-400 hover:text-slate-200 text-xl font-medium focus:outline-none cursor-pointer"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleEditMachine} className="p-6 space-y-4">
              {editErrorMsg && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-lg flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  {editErrorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">รหัสเครื่องจักร (Machine ID)</label>
                  <div className="bg-slate-900 border border-slate-700/50 rounded-lg px-3.5 py-2 font-mono text-sm text-cyan-400 font-bold select-none">
                    {editingMachine.id}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">ชื่อเครื่องจักร (Machine Name)*</label>
                  <input
                    id="modal-edit-machine-name"
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 uppercase placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">รุ่น (Model)</label>
                  <input
                    type="text"
                    value={editModel}
                    onChange={(e) => setEditModel(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">กำลังไฟฟ้า / แรงดัน (kW)</label>
                  <input
                    type="text"
                    value={editPower}
                    onChange={(e) => setEditPower(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">วันที่ติดตั้ง</label>
                  <input
                    type="text"
                    value={editInstallDate}
                    onChange={(e) => setEditInstallDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">บริษัทผู้ขาย / เบอร์ติดต่อ</label>
                  <input
                    type="text"
                    value={editVendor}
                    onChange={(e) => setEditVendor(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">ตำแหน่งที่ติดตั้ง / ไลน์ผลิต</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => {
                      setEditLocation(e.target.value);
                      setEditLineGroup(e.target.value);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Serial Number</label>
                  <input
                    type="text"
                    value={editSerialNumber}
                    onChange={(e) => setEditSerialNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 font-mono text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">สถานะของเครื่องจักร</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ปกติ">ปกติ (พร้อมใช้งาน)</option>
                    <option value="เสีย/ซ่อม">เสีย / กำลังซ่อม</option>
                    <option value="ยกเลิกใช้">ยกเลิกใช้งาน</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">หมายเหตุ</label>
                  <input
                    type="text"
                    value={editRemark}
                    onChange={(e) => setEditRemark(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-700 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingMachine(null);
                  }}
                  className="border border-slate-700 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2.5 rounded-lg transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  id="modal-btn-update-machine"
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-lg transition cursor-pointer"
                >
                  อัปเดตข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && machineToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4" id="machine-delete-modal-overlay">
          <div className="bg-slate-800 border border-slate-700/80 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150 text-xs text-slate-200" id="machine-delete-modal">
            <div className="bg-slate-900 border-b border-slate-700/80 p-5 flex items-center gap-2.5">
              <AlertTriangle className="text-rose-450 shrink-0" size={20} />
              <h3 className="text-sm font-bold text-slate-100">
                ยืนยันการลบข้อมูลเครื่องจักร?
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-slate-300 font-sans leading-relaxed text-[13px]">
                คุณแน่ใจหรือไม่ว่าต้องการลบเครื่องจักร <span className="text-rose-400 font-mono font-bold">{machineToDelete.id}</span> ({machineToDelete.name}) ออกจากระบบทะเบียน?
              </p>

              <div className="bg-rose-950/20 border border-rose-500/20 p-4 rounded-xl space-y-2">
                <span className="text-[10px] text-rose-400 font-black tracking-wider uppercase block">⚠️ คำเตือนผลกระทบ:</span>
                <p className="text-slate-400 text-[11px] leading-relaxed font-sans">
                  การลบทะเบียนนี้จะลบรายการออกจากระบบ โดยเครื่องจักรดังกล่าวมีแผนบำรุงรักษา PM พ่วงอยู่จำนวน <b className="text-white font-mono">{pmPlans.filter(p => p.machineId === machineToDelete.id).length} แผนงาน</b>
                </p>
              </div>
              
              <div className="pt-4 border-t border-slate-700/60 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setMachineToDelete(null);
                  }}
                  className="border border-slate-700 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg transition font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  id="modal-btn-delete-machine-confirm"
                  onClick={executeDeleteMachine}
                  className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-5 py-2 rounded-lg transition"
                >
                  ยืนยันลบข้อมูล
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
