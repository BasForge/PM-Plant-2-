import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Settings, Users, Clock, AlertTriangle, FileJson, RefreshCw, X, Wrench, Upload, Bell, Cloud, Database, CheckCircle2 } from 'lucide-react';
import { sendLineNotification } from '../utils/lineNotify';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { 
    technicians, setTechnicians, 
    setSchedules, setRepairs, setImprovements,
    settings, setSettings, 
    firebaseStatus, lastFirebaseSync, syncWithFirebaseNow,
    resetToDefaults, exportData, importData 
  } = useApp();

  // Active sub-tab inside settings
  const [subTab, setSubTab] = useState<'techs' | 'hours' | 'std-mttr' | 'export-import' | 'line-notify' | 'firebase'>('techs');
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [cloudSyncMsg, setCloudSyncMsg] = useState<string | null>(null);

  // LINE Notify state
  const [lineEnabled, setLineEnabled] = useState<boolean>(settings.lineNotifyEnabled || false);
  const [lineToken, setLineToken] = useState<string>(settings.lineNotifyToken || '');
  const [testMessage, setTestMessage] = useState<string>('🚨 ทดสอบระบบแจ้งเตือน LINE จากระบบ FoodFab Maintenance!');
  const [testStatus, setTestStatus] = useState<{ type: 'idle' | 'success' | 'error'; msg: string }>({ type: 'idle', msg: '' });
  const [isTesting, setIsTesting] = useState<boolean>(false);

  // Technician input state
  const [tempTechs, setTempTechs] = useState<string[]>([...technicians]);
  const [newTechName, setNewTechName] = useState('');

  // Shift working hours inputs
  const [workingHours, setWorkingHours] = useState<number>(settings.workingHoursPerDay);

  // Std.MTTR edit values
  const [tempStdMttr, setTempStdMttr] = useState<Record<string, number>>({ ...settings.stdMttr });

  // Import JSON textarea
  const [jsonImportStr, setJsonImportStr] = useState('');
  const [importStatus, setImportStatus] = useState<{ type: 'idle' | 'success' | 'error'; msg: string }>({ type: 'idle', msg: '' });
  const modalFileRef = useRef<HTMLInputElement>(null);

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    fileReader.readAsText(files[0], "UTF-8");
    fileReader.onload = e => {
      try {
        const target = e.target;
        if (!target || !target.result) {
          setImportStatus({ type: 'error', msg: "ไม่พบข้อมูลในไฟล์ที่เลือก" });
          return;
        }
        
        const content = target.result as string;
        const success = importData(content);
        if (success) {
          setImportStatus({ type: 'success', msg: 'กู้คืนฐานข้อมูลจากไฟล์สำรองสำเร็จเสร็จสิ้น! ทุกเพจพร้อมโหลดใหม่' });
          setTimeout(() => {
            onClose();
            window.location.reload();
          }, 1000);
        } else {
          setImportStatus({ type: 'error', msg: 'รูปแบบข้อมูลไม่ถูกต้อง ไม่สามารถนำเข้าข้อมูลได้' });
        }
      } catch (err) {
        setImportStatus({ type: 'error', msg: 'เกิดข้อผิดพลาดในการอ่านไฟล์: ' + (err as Error).message });
      }
    };
  };

  // Add a technician name
  const handleAddTech = () => {
    if (!newTechName.trim()) return;
    if (tempTechs.includes(newTechName.trim())) {
      alert("มีชื่อช่างพนักงานนี้ในระบบแล้ว");
      return;
    }
    setTempTechs(prev => [...prev, newTechName.trim()]);
    setNewTechName('');
  };

  // Remove technician
  const handleRemoveTech = (idx: number) => {
    if (tempTechs.length <= 1) {
      alert("ต้องมีอย่างน้อย 1 ช่างประจำการในระบบ");
      return;
    }
    setTempTechs(prev => prev.filter((_, i) => i !== idx));
  };

  // Save technician names changes
  const handleSaveTechs = () => {
    const updatedTechs = tempTechs.map(t => t.trim()).filter(Boolean);
    if (updatedTechs.length === 0) {
      alert("ต้องมีอย่างน้อย 1 ช่างประจำการในระบบและห้ามเว้นสายเปล่า");
      return;
    }

    // Find any renames by matching index
    const renamedMap: Record<string, string> = {};
    technicians.forEach((oldName, idx) => {
      const newName = updatedTechs[idx];
      if (newName && oldName !== newName) {
        renamedMap[oldName] = newName;
      }
    });

    const hasRenames = Object.keys(renamedMap).length > 0;

    if (hasRenames) {
      // Propagate to schedules
      setSchedules(prev => prev.map(s => {
        if (renamedMap[s.technician]) {
          return { ...s, technician: renamedMap[s.technician] };
        }
        return s;
      }));

      // Propagate to repairs
      setRepairs(prev => prev.map(r => {
        if (renamedMap[r.technician]) {
          return { ...r, technician: renamedMap[r.technician] };
        }
        return r;
      }));

      // Propagate to improvements
      setImprovements(prev => prev.map(imp => {
        if (renamedMap[imp.technician]) {
          return { ...imp, technician: renamedMap[imp.technician] };
        }
        return imp;
      }));
    }

    setTechnicians(updatedTechs);
    alert("บันทึกรายชื่อช่างหลักและแก้ไขเชื่อมโยงประวัติงานเรียบร้อยแล้ว");
  };

  // Save hours/shift changes
  const handleSaveHours = () => {
    if (workingHours <= 0 || workingHours > 24) {
      alert("กรุณากรอกเวลาทำงานที่สมเหตุสมผล (1 - 24 ชั่วโมงต่อของรอบปฏิบัติการ)");
      return;
    }
    setSettings(prev => ({
      ...prev,
      workingHoursPerDay: workingHours
    }));
    alert(`ปรับเปลี่ยนเวลากำลังทำงานมาตรฐานสำเร็จเป็น ${workingHours} ชั่วโมง (${workingHours * 60} นาที) ต่อวัน`);
  };

  // Edit custom Std.MTTR parameter value
  const handleStdMttrChange = (prefix: string, value: string) => {
    const mins = Math.max(0, Number(value) || 0);
    setTempStdMttr(prev => ({
      ...prev,
      [prefix]: mins
    }));
  };

  // Save Custom Std.MTTR changes
  const handleSaveStdMttr = () => {
    setSettings(prev => ({
      ...prev,
      stdMttr: tempStdMttr
    }));
    alert("บันทึกค่าเวลาซ่อมมาตรฐาน (Std.MTTR) เรียบร้อยแล้ว");
  };

  // JSON Database export download trigger
  const triggerDownloadJson = () => {
    const dataStr = exportData();
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'food-maint-factory-backup.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // JSON Database import trigger
  const handleImportJson = () => {
    if (!jsonImportStr.trim()) {
      setImportStatus({ type: 'error', msg: 'กรุณาวางโค้ด JSON กู้คืนระบบที่เป็นโมเดลโครงสร้างก่อนทำการกู้คืน' });
      return;
    }

    const success = importData(jsonImportStr);
    if (success) {
      setImportStatus({ type: 'success', msg: 'กู้คืนฐานข้อมูลสำรองด่วนสากล สำเร็จเสร็จสิ้น! ทุกเพจพร้อมโหลดใหม่' });
      setTimeout(() => {
        onClose();
        window.location.reload(); // Hard reload to mount standard context accurately
      }, 1000);
    } else {
      setImportStatus({ type: 'error', msg: 'โครงสร้างไฟล์ล้มเหลว กรุณาตรวจสอบโค้ด JSON ปลายทางและลองอีกครั้ง' });
    }
  };

  // Reset database warning trigger
  const triggerResetDatabase = () => {
    if (window.confirm('🚨 คำเตือนรุนแรงระดับความมั่นคง! คุณต้องการตั้งค่าระบบใหม่ทั้งหมดใช่หรือไม่? ประวัติการแจ้งประเมินวิเคราะห์ชำรุด งาน PM โครงการ Kaizen ทั้งหมดจะถูกลบกลายเป็นดีฟอลต์พรีโหลด')) {
      resetToDefaults();
      alert("รีเซ็ตระบบเข้าตั้งต้นสำเร็จ!");
      onClose();
      window.location.reload();
    }
  };

  // Save LINE Notify configuration
  const handleSaveLineConfig = () => {
    setSettings(prev => ({
      ...prev,
      lineNotifyEnabled: lineEnabled,
      lineNotifyToken: lineToken
    }));
    alert("บันทึกการตั้งค่าระบบแจ้งเตือน LINE เรียบร้อยแล้ว");
  };

  // Test LINE Notify call
  const handleTestLineNotify = async () => {
    if (!lineToken.trim()) {
      setTestStatus({ type: 'error', msg: 'กรุณาระบุ LINE Notify Token ก่อนทำการทดสอบ' });
      return;
    }
    setIsTesting(true);
    setTestStatus({ type: 'idle', msg: '' });
    
    try {
      const res = await sendLineNotification(testMessage, lineToken);
      if (res.success) {
        setTestStatus({ type: 'success', msg: 'ส่งข้อความแจ้งเตือนทดสอบสำเร็จ! โปรดตรวจสอบในกลุ่ม LINE ของคุณ' });
      } else {
        setTestStatus({ type: 'error', msg: res.message || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ' });
      }
    } catch (err) {
      setTestStatus({ type: 'error', msg: 'ข้อผิดพลาดเครือข่าย: ' + (err as Error).message });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4" id="settings-modal-overlay">
      <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-2xl w-full h-[600px] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-155" id="settings-modal">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700/80 p-5 shrink-0 flex justify-between items-center">
          <h3 className="text-base font-bold text-cyan-400 flex items-center gap-2 font-sans tracking-tight">
            <Settings className="animate-spin duration-9000" size={18} />
            จัดการระบบ และการกำหนดเกณฑ์ (System Settings Panel)
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-full hover:bg-slate-900 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Structure Splitter */}
        <div className="flex-1 flex min-h-0">
          
          {/* Modal Sidebar Tab Selection (Width 200px) */}
          <div className="w-48 bg-slate-900/50 border-r border-slate-700/60 p-4 space-y-1.5 shrink-0 select-none">
            
            <button
              id="sub-tab-techs"
              onClick={() => setSubTab('techs')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                subTab === 'techs' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Users size={14} />
              จัดการรายชื่อช่าง
            </button>

            <button
              id="sub-tab-hours"
              onClick={() => setSubTab('hours')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                subTab === 'hours' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Clock size={14} />
              กะชั่วโมงการทำงาน
            </button>

            <button
              id="sub-tab-std-mttr"
              onClick={() => setSubTab('std-mttr')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                subTab === 'std-mttr' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Wrench size={14} />
              เวลาแก้ไขซ่อม Std.MTTR
            </button>

            <button
              id="sub-tab-export-import"
              onClick={() => setSubTab('export-import')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                subTab === 'export-import' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <FileJson size={14} />
              สำรองกู้ข้อมูลสำรอง
            </button>

            <button
              id="sub-tab-line-notify"
              onClick={() => setSubTab('line-notify')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                subTab === 'line-notify' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Bell size={14} />
              ตั้งค่าแจ้งเตือน LINE
            </button>

            <button
              id="sub-tab-firebase"
              onClick={() => setSubTab('firebase')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                subTab === 'firebase' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Cloud size={14} />
              คลาวด์ Firebase
            </button>

            <div className="pt-4 border-t border-slate-800 mt-6 shrink-0">
              <button
                id="btn-settings-reset-all"
                onClick={triggerResetDatabase}
                className="w-full text-left text-[11px] font-sans font-bold text-rose-400 hover:text-white hover:bg-rose-500 transition px-3 py-2 rounded-xl flex items-center gap-1.5"
              >
                <RefreshCw size={12} className="animate-spin duration-900" />
                รีเซ็ตล้างระบบด่วน
              </button>
            </div>
          </div>

          {/* Active Modal Sub-Tab Content Workspace Panel (Flex-1) */}
          <div className="flex-1 p-6 overflow-y-auto bg-slate-900/10 text-xs">
            
            {/* SUB-TAB 1: MANAGING TECHNICIANS LIST */}
            {subTab === 'techs' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                    <Users size={15} className="text-cyan-400" />
                    บัญชีชื่อพนักงานช่างประจำโรงงาน
                  </h4>
                  <p className="text-slate-400 text-[10px] mt-0.5">เปลี่ยนหรือตั้งชื่อจริง ลบ และเพิ่มจำนวนยอดช่างได้แบบทันตาเห็นในปฏิทินงาน</p>
                </div>

                {/* Adding form */}
                <div className="flex gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-700/80">
                  <input
                    id="sett-new-tech-input"
                    type="text"
                    placeholder="ป้อนชื่อช่างใหม่..."
                    value={newTechName}
                    onChange={(e) => setNewTechName(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddTech}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs px-4 py-1.5 rounded transition"
                  >
                    + เพิ่มรายชื่อ
                  </button>
                </div>

                {/* Table of techs */}
                <div className="border border-slate-700/60 rounded-xl overflow-hidden max-h-[240px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-700 text-slate-400 font-semibold uppercase text-[10px]">
                        <th className="py-2 px-4 w-12 text-center">ลำดับ</th>
                        <th className="py-2 px-4">ชื่อเรียก / ประจำเครื่อง</th>
                        <th className="py-2 px-4 w-16 text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/40 text-slate-300">
                      {tempTechs.map((tName, i) => (
                        <tr key={i} className="hover:bg-slate-900/40">
                          <td className="py-2 px-4 text-center text-slate-500 font-mono">{i + 1}</td>
                          <td className="py-2 px-4 font-bold text-slate-205">
                            <input
                              type="text"
                              value={tName}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTempTechs(prev => {
                                  const cloned = [...prev];
                                  cloned[i] = val;
                                  return cloned;
                                });
                              }}
                              className="w-full bg-slate-950/60 border border-slate-700/80 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-sans font-medium"
                            />
                          </td>
                          <td className="py-2 px-4 text-center">
                            <button
                              onClick={() => handleRemoveTech(i)}
                              className="text-slate-400 hover:text-rose-400 text-sm transition bg-slate-950/20 hover:bg-slate-900 p-1 rounded"
                              title="ลบรายชื่อช่างคนนี้"
                            >
                              &times;
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-3 border-t border-slate-850 flex items-center justify-end">
                  <button
                    onClick={handleSaveTechs}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-5 py-2 rounded-xl transition shadow"
                  >
                    บันทึกรายชื่อช่างหลัก
                  </button>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: CONFIGURATION OF CAPACITY HOURS / SHIFTS */}
            {subTab === 'hours' && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                    <Clock size={15} className="text-cyan-400" />
                    กำหนดระยะเวลาพิกัดการทำงานในรอบ 1 กะ
                  </h4>
                  <p className="text-slate-400 text-[10px] mt-0.5">เปลี่ยนพิกัดชั่วโมงทํางานเฉลี่ยเพื่อพิจารณาความตึงเครียดโหลดในปฏิทินปฏิบัติงาน</p>
                </div>

                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-700/80 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div>
                      <p className="text-xs font-bold text-slate-205">เวลากำหนดทำงานปกติ (ชั่วโมง / วันต่อกะ)*</p>
                      <p className="text-[10px] text-slate-400 mt-1">ดีฟอลต์สากลคือ 8 ชม. (480 นาที), สามารถตั้งเป็น 16 ชม. (960 นาที) สำหรับ 2 กะได้</p>
                    </div>

                    <div className="flex items-center gap-2 justify-end shrink-0">
                      <input
                        id="sett-working-hours"
                        type="number"
                        min={1}
                        max={24}
                        value={workingHours}
                        onChange={(e) => setWorkingHours(Math.max(1, Number(e.target.value) || 0))}
                        className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-center text-sm text-slate-100 font-mono font-bold focus:outline-none"
                      />
                      <span className="text-slate-400 font-medium">ชั่วโมง/วัน</span>
                    </div>
                  </div>

                  <div className="bg-slate-950/40 p-3.5 rounded-lg border border-slate-805 text-[11px] text-slate-400 font-mono">
                    <p className="text-slate-300 font-bold">สรุปศักยภาพเวลากำลังสูงสุด:</p>
                    <ul className="list-disc pl-4 space-y-1 mt-1 text-xs">
                      <li>เวลาความถนัดรวมเฉลี่ย: <strong>{workingHours * 60} นาทีต่อวัน</strong></li>
                      <li>สะสมพิจารณารายสัปดาห์: <strong>{workingHours * 7} ชั่วโมง / คน</strong></li>
                    </ul>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-850 flex items-center justify-end">
                  <button
                    onClick={handleSaveHours}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-5 py-2 rounded-xl transition shadow"
                  >
                    บันทึกพิกัดชั่วโมง
                  </button>
                </div>
              </div>
            )}

            {/* SUB-TAB 3: SET STANDARD MTTR PER MACHINE TYPE */}
            {subTab === 'std-mttr' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-205 flex items-center gap-1.5">
                    <Wrench size={15} className="text-cyan-400" />
                    กำหนดระบุเวลากู้หน้าซ่อมจริงแยกตามประเภทเครื่องประเภทจักร
                  </h4>
                  <p className="text-slate-400 text-[10px] mt-0.5">ใช้ระบุค่าเกณฑ์ประเมิน Std.MTTR (นาที) หากเวลาซ่อมเกิน 120% ของเกณฑ์แถวในเพจ 4 จะขึ้นไฟแจ้งเตือนสีแดง</p>
                </div>

                <div className="border border-slate-700/60 rounded-xl overflow-hidden max-h-[280px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-700 text-slate-400 font-semibold uppercase text-[10px]">
                        <th className="py-2.5 px-4">กลุ่มจำพวกอักษรย่อ</th>
                        <th className="py-2.5 px-4">ชื่อประเภทเครื่องสากล</th>
                        <th className="py-2.5 px-4 text-center w-28">Std.MTTR (นาที)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/40 text-slate-310">
                      {[
                        { prefix: "RIM", label: "MIXER VERTICAL / RICE MIXER" },
                        { prefix: "TOC", label: "RICE TAKE-OUT CONVEYOR / CONVEYOR" },
                        { prefix: "VAC", label: "VACUUM COOLER SYSTEMS" },
                        { prefix: "FFS", label: "HORIZONTAL FORM FILL SEAL (PACKING)" },
                        { prefix: "ATS", label: "AUTOMATIC TOP SEALERS" },
                        { prefix: "MTD", label: "METAL DETECTORS (QC)" },
                        { prefix: "XRA", label: "X-RAY INSPECTION DEVICES" },
                        { prefix: "BCF", label: "BLAST CHILLERS & FREEZERS" },
                        { prefix: "CDU", label: "UTILITIES / CONDENSING UNITS" },
                        { prefix: "TLP", label: "THERMAL LABEL PRINTERS" }
                      ].map(item => (
                        <tr key={item.prefix} className="hover:bg-slate-900/40">
                          <td className="py-2 px-4 font-mono font-bold text-rose-400">{item.prefix}</td>
                          <td className="py-2 px-4 text-slate-300 font-sans">{item.label}</td>
                          <td className="py-2 px-4 text-center">
                            <input
                              type="number"
                              min={1}
                              value={tempStdMttr[item.prefix] || 60}
                              onChange={(e) => handleStdMttrChange(item.prefix, e.target.value)}
                              className="w-16 bg-slate-950 border border-slate-700 rounded text-center text-xs text-slate-100 font-mono p-1"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 border-t border-slate-850 flex items-center justify-end">
                  <button
                    onClick={handleSaveStdMttr}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-5 py-2 rounded-xl transition shadow"
                  >
                    บันทึกเกณฑ์ซ่อม Std.MTTR
                  </button>
                </div>
              </div>
            )}

            {/* SUB-TAB 4: DATA EXPORT AND IMPORT DATABASE */}
            {subTab === 'export-import' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-205 flex items-center gap-1.5">
                    <FileJson size={15} className="text-cyan-400" />
                    ระบบสากลสำรองฐานข้อมูล & ดึงกู้ข้อมูล (Export/Import Local Database)
                  </h4>
                  <p className="text-slate-400 text-[10px] mt-0.5 font-sans">ส่งออกเพื่อกระจายงาน หรือวางโค้ดกู้ประวัติตะแกรงเวลาได้ทันทีโดยไม่ต้องเชื่อมต่อคลาวด์</p>
                </div>

                {/* Database Backup Trigger */}
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700/80 space-y-3">
                  <p className="text-xs font-bold text-slate-200">1. ส่งออกสำรองฐานข้อมูลทั้งหมด (JSON Export)</p>
                  <p className="text-[10px] text-slate-400 font-sans">บันทึกทั้งประวัติการแจ้งซ่อม, งาน PM ค้าง, ชาร์ตบอร์ดยอดสะสม, พิกัดช่าง ตระเตรียมเป็นไฟล์เซฟฟิสิกส์</p>
                  <button
                    type="button"
                    onClick={triggerDownloadJson}
                    className="flex items-center gap-1.5 bg-cyan-500/10 hover:bg-cyan-455 border border-cyan-500/20 text-cyan-400 hover:text-slate-950 font-bold px-4 py-2 rounded-lg transition"
                  >
                    ดาวน์โหลดไฟล์แบ็คอัพ .json
                  </button>
                </div>

                {/* Data Restoration panel */}
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700/80 space-y-3">
                  <p className="text-xs font-bold text-slate-200">2. นำเข้ากู้คืนระบบ (JSON Import / Restoration)</p>
                  
                  {importStatus.type !== 'idle' && (
                    <div className={`p-2.5 rounded border text-[10px] ${
                      importStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}>
                      {importStatus.msg}
                    </div>
                  )}

                  <div className="flex flex-col gap-2 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                    <p className="text-[10px] text-slate-400 font-sans">
                      💡 <strong>วิธีที่ 1 (แนะนำ):</strong> เลือกไฟล์ .json สำรองโดยตรงจากคอมพิวเตอร์ของคุณ
                    </p>
                    <input
                      type="file"
                      ref={modalFileRef}
                      onChange={handleFileImport}
                      accept=".json"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => modalFileRef.current?.click()}
                      className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow transition"
                    >
                      <Upload size={13} />
                      <span>เลือกไฟล์สำรองข้อมูล (.json) เพื่อกู้คืน</span>
                    </button>
                  </div>

                  <div className="space-y-2 pt-1">
                    <p className="text-[10px] text-slate-400 font-sans">
                      💡 <strong>วิธีที่ 2:</strong> วางเนื้อหาโค้ด JSON สำรองทั้งหมดในกล่องด้านล่างนี้
                    </p>
                    <textarea
                      rows={2}
                      placeholder="วางโค้ด JSON สำรองทั้งหมดที่นี่..."
                      value={jsonImportStr}
                      onChange={(e) => setJsonImportStr(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-[10px] text-slate-300 font-mono focus:outline-none"
                    />

                    <button
                      type="button"
                      onClick={handleImportJson}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-lg transition shadow-md"
                    >
                      เริ่มกระบวนการกู้ประวัติระบบ (จากโค้ดที่วาง)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 5: LINE NOTIFICATION SETTINGS */}
            {subTab === 'line-notify' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-205 flex items-center gap-1.5 font-sans">
                    <Bell size={15} className="text-cyan-400" />
                    ตั้งค่าการแจ้งเตือนผ่าน LINE Group (LINE Notify Integration)
                  </h4>
                  <p className="text-slate-400 text-[10px] mt-0.5 font-sans">
                    ส่งข้อความแจ้งเตือนเข้ากลุ่ม LINE อัตโนมัติเมื่อเกิดเหตุการณ์ในโรงงาน เช่น แจ้งซ่อมเครื่องจักร ทำใบงานซ่อมสำเร็จ หรือยืนยันการตั้งเครื่อง
                  </p>
                </div>

                {/* Status Toggle & Explanation */}
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-200">เปิดใช้งานการแจ้งเตือน LINE</span>
                      <p className="text-[10px] text-slate-400">ส่งแจ้งเตือนด่วนสากลเมื่อแจ้งซ่อม ปิดใบงาน หรือเริ่มบำรุงรักษา</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={lineEnabled} 
                        onChange={(e) => setLineEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                  </div>

                  {/* Token input */}
                  {lineEnabled && (
                    <div className="space-y-2 animate-in fade-in duration-200">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">LINE Notify Token ของกลุ่มคุณ</label>
                        <input
                          type="password"
                          placeholder="วาง Token ของคุณที่นี่ (เช่น L2q7Y...)"
                          value={lineToken}
                          onChange={(e) => setLineToken(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800 space-y-1 text-slate-400 font-sans text-[10px] leading-relaxed">
                        <p className="font-bold text-slate-300">💡 วิธีรับ Token ฟรีใน 3 ขั้นตอน:</p>
                        <ol className="list-decimal pl-4 space-y-1">
                          <li>เข้าไปที่เว็บ <a href="https://notify-bot.line.me/" target="_blank" rel="noreferrer" className="text-cyan-400 underline hover:text-cyan-300">notify-bot.line.me</a> แล้วเข้าสู่ระบบด้วยบัญชี LINE ของคุณ</li>
                          <li>ไปที่หน้า "หน้าของฉัน" (My Page) แล้วคลิกปุ่ม "ออก Token" (Generate Token)</li>
                          <li>ตั้งชื่อแจ้งเตือน เลือกกลุ่ม LINE ที่ต้องการรับแจ้ง แล้วคัดลอก Token มาวางในช่องด้านบนนี้ (และอย่าลืมดึง LINE Notify บอทเข้ากลุ่มด้วยนะ)</li>
                        </ol>
                      </div>
                    </div>
                  )}
                </div>

                {/* Test Notification Section */}
                {lineEnabled && (
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-700/80 space-y-3">
                    <span className="text-xs font-bold text-slate-200 block">ทดสอบส่งแจ้งเตือน (Test Connection)</span>
                    
                    {testStatus.type !== 'idle' && (
                      <div className={`p-2.5 rounded border text-[10px] ${
                        testStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                      }`}>
                        {testStatus.msg}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                        placeholder="ข้อความทดสอบ..."
                      />
                      <button
                        type="button"
                        onClick={handleTestLineNotify}
                        disabled={isTesting}
                        className="bg-cyan-500/10 hover:bg-cyan-500 border border-cyan-500/30 text-cyan-400 hover:text-slate-950 font-bold px-4 rounded-lg transition disabled:opacity-50 text-xs shrink-0"
                      >
                        {isTesting ? 'กำลังส่ง...' : 'ทดสอบส่ง'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-850 flex items-center justify-end">
                  <button
                    onClick={handleSaveLineConfig}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-5 py-2 rounded-xl transition shadow"
                  >
                    บันทึกการตั้งค่าระบบแจ้งเตือน
                  </button>
                </div>
              </div>
            )}

            {/* Sub-tab: Firebase Cloud Sync */}
            {subTab === 'firebase' && (
              <div className="space-y-4 animate-in fade-in duration-150" id="panel-settings-firebase">
                <div>
                  <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Cloud className="text-cyan-400" size={18} />
                    ฐานข้อมูลคลาวด์ Firebase Firestore (Cloud Database)
                  </h4>
                  <p className="text-slate-400 text-xs mt-1">
                    เชื่อมต่อฐานข้อมูล Google Cloud Firestore เพื่อให้ช่างและหัวหน้างานเปิดดูหรือบันทึกข้อมูลพร้อมกันได้แบบเรียลไทม์ (Multi-device Realtime Sync)
                  </p>
                </div>

                {/* Status card */}
                <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                  firebaseStatus === 'connected'
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : firebaseStatus === 'syncing'
                    ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full shrink-0 ${
                      firebaseStatus === 'connected'
                        ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse'
                        : firebaseStatus === 'syncing'
                        ? 'bg-amber-400 animate-spin'
                        : 'bg-slate-500'
                    }`} />
                    <div>
                      <p className="font-bold text-xs text-white">
                        {firebaseStatus === 'connected' && 'สถานะ: เชื่อมต่อ Firebase Cloud สำเร็จ (ออนไลน์)'}
                        {firebaseStatus === 'syncing' && 'สถานะ: กำลังซิงค์ข้อมูลกับคลาวด์...'}
                        {firebaseStatus === 'offline' && 'สถานะ: โหมดออฟไลน์ (ใช้งานฐานข้อมูลเครื่องนี้)'}
                        {firebaseStatus === 'error' && 'สถานะ: มีข้อผิดพลาดในการเชื่อมต่อ'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {lastFirebaseSync ? `ซิงค์ล่าสุดเมื่อเวลา ${lastFirebaseSync}` : 'ยังไม่มีประวัติการซิงค์ล่าสุด'}
                      </p>
                    </div>
                  </div>

                  <button
                    id="btn-modal-manual-firebase-sync"
                    disabled={isSyncingCloud}
                    onClick={async () => {
                      setIsSyncingCloud(true);
                      setCloudSyncMsg(null);
                      try {
                        const ok = await syncWithFirebaseNow();
                        if (ok) {
                          setCloudSyncMsg('ซิงค์ข้อมูลกับ Cloud Firestore เรียบร้อยแล้ว!');
                        } else {
                          setCloudSyncMsg('ซิงค์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
                        }
                      } catch {
                        setCloudSyncMsg('เกิดข้อผิดพลาดในการเชื่อมต่อ');
                      } finally {
                        setIsSyncingCloud(false);
                      }
                    }}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 text-xs shadow disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    <RefreshCw size={12} className={isSyncingCloud ? 'animate-spin' : ''} />
                    {isSyncingCloud ? 'กำลังซิงค์...' : 'บังคับซิงค์เดี๋ยวนี้'}
                  </button>
                </div>

                {cloudSyncMsg && (
                  <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />
                    <span>{cloudSyncMsg}</span>
                  </div>
                )}

                {/* Cloud Config Details */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                    ข้อมูลการเชื่อมต่อโครงการ (Firebase Project Details)
                  </h5>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">PROJECT ID</span>
                      <span className="font-mono text-slate-200 font-bold">bold-watch-k98sv</span>
                    </div>
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">DATABASE ENGINE</span>
                      <span className="font-mono text-slate-200 font-bold">Cloud Firestore</span>
                    </div>
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">SECURITY RULES</span>
                      <span className="text-emerald-400 font-bold">Deployed (Active)</span>
                    </div>
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">FREE QUOTA TIER</span>
                      <span className="text-cyan-300 font-bold">ฟรี (Free Spark Tier)</span>
                    </div>
                  </div>
                </div>

                {/* Benefits & Quota explanation */}
                <div className="bg-slate-850/50 border border-slate-800 rounded-2xl p-3.5 text-[11px] space-y-1.5 text-slate-350">
                  <p className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Database size={13} className="text-cyan-400" />
                    คุณสมบัติและการทำงานของระบบคลาวด์:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                    <li><strong className="text-slate-350">ซิงค์อัตโนมัติ 3 ทาง:</strong> บันทึกลงเครื่อง (LocalStorage) + เซิร์ฟเวอร์ LAN + Google Cloud Firestore ทุกครั้งที่มีการแก้ไข</li>
                    <li><strong className="text-slate-350">ทำงานร่วมกันแบบ Real-time:</strong> เมื่อช่างท่านอื่นเพิ่มงานซ่อม หรืออัปเดตสถานะ PM หน้าจอของท่านจะอัปเดตอัตโนมัติ</li>
                    <li><strong className="text-slate-350">ไม่มีค่าใช้จ่ายรายเดือน:</strong> ใช้งานภายใต้โควต้าฟรีของ Google Cloud (เขียน 20,000 ครั้ง/วัน, อ่าน 50,000 ครั้ง/วัน) ซึ่งเกินพอสำหรับโรงงาน</li>
                    <li><strong className="text-slate-350">ความปลอดภัย:</strong> ป้องกันข้อมูลสูญหายแม้คอมพิวเตอร์พัง ล้างแคชเบราว์เซอร์ หรือเปลี่ยนอุปกรณ์</li>
                  </ul>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
