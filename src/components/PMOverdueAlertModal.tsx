import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PMScheduleItem } from '../types';
import { 
  AlertTriangle, RefreshCw, CheckCircle2, Clock, Calendar, 
  Send, X, Search, Filter, ArrowRight, User, Wrench, ShieldAlert,
  ChevronRight, ExternalLink, HelpCircle
} from 'lucide-react';
import { 
  getTodayDateString, getPMOverdueDays, isPMOverdue, isPMRescheduled,
  getOverdueAndRescheduledSummary, formatOverduePMLineMessage
} from '../utils/pmAlerts';
import { PMRescheduleModal } from './PMRescheduleModal';

interface PMOverdueAlertModalProps {
  onClose: () => void;
  onNavigateToPMHistory?: () => void;
  onNavigateToSchedule?: () => void;
}

export const PMOverdueAlertModal: React.FC<PMOverdueAlertModalProps> = ({
  onClose,
  onNavigateToPMHistory,
  onNavigateToSchedule
}) => {
  const { schedules, setSchedules, machines, pmPlans, technicians, settings } = useApp();
  const todayStr = getTodayDateString();

  const [activeTab, setActiveTab] = useState<'overdue' | 'rescheduled'>('overdue');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTech, setSelectedTech] = useState('');
  const [reschedulingJob, setReschedulingJob] = useState<PMScheduleItem | null>(null);
  const [isSendingLine, setIsSendingLine] = useState(false);
  const [lineStatusMessage, setLineStatusMessage] = useState<string | null>(null);

  const { overdueJobs, rescheduledJobs, totalOverdueCount, totalRescheduledCount, criticalCount } = 
    getOverdueAndRescheduledSummary(schedules, todayStr);

  const currentList = activeTab === 'overdue' ? overdueJobs : rescheduledJobs;

  const filteredList = currentList.filter(job => {
    const machObj = machines.find(m => m.id === job.machineId);
    const planObj = pmPlans.find(p => p.id === job.pmPlanId);

    const matchQuery = searchQuery
      ? job.machineId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (machObj?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (planObj?.title || '').toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    const matchTech = selectedTech ? job.technician === selectedTech || (job.technicians && job.technicians.includes(selectedTech)) : true;

    return matchQuery && matchTech;
  });

  // Handle Send LINE alert for all overdue jobs
  const handleBroadcastLineAlert = async () => {
    if (overdueJobs.length === 0) {
      alert('ไม่มีงาน PM ที่เลยกำหนดในขณะนี้');
      return;
    }

    if (!settings.lineNotifyEnabled || !settings.lineNotifyToken) {
      alert('กรุณาเปิดใช้งาน LINE Notify และระบุ Token ในหน้าต่างตั้งค่า (ไอคอนฟันเฟือง)');
      return;
    }

    setIsSendingLine(true);
    setLineStatusMessage(null);

    try {
      const msg = formatOverduePMLineMessage(overdueJobs, machines, pmPlans, todayStr);
      const res = await fetch('/api/line-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          token: settings.lineNotifyToken
        })
      });

      if (res.ok) {
        setLineStatusMessage('✅ ส่งการแจ้งเตือนงาน PM เลยกำหนดเข้า LINE เรียบร้อยแล้ว!');
      } else {
        const data = await res.json();
        setLineStatusMessage(`❌ ส่งไม่สำเร็จ: ${data.message || 'Error'}`);
      }
    } catch (err) {
      setLineStatusMessage(`❌ เกิดข้อผิดพลาดในการเชื่อมต่อ: ${(err as Error).message}`);
    } finally {
      setIsSendingLine(false);
      setTimeout(() => setLineStatusMessage(null), 5000);
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto"
        id="pm-overdue-alert-modal-overlay"
        onClick={onClose}
      >
        <div 
          className="w-full max-w-3xl bg-[#0b1222] border border-rose-500/30 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 text-slate-100 my-6 flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
          id="pm-overdue-alert-modal-container"
        >
          {/* Header */}
          <div className="p-4 bg-[#080d1a] border-b border-slate-800 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/15 rounded-xl border border-rose-500/30 text-rose-400">
                <ShieldAlert size={22} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-sm font-black tracking-wide text-white flex items-center gap-2">
                  ศูนย์ตรวจเช็คและแจ้งเตือนงาน PM เลยกำหนด / เลื่อนแผน
                  {totalOverdueCount > 0 && (
                    <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full text-xs font-mono font-bold">
                      {totalOverdueCount} งานค้าง
                    </span>
                  )}
                </h2>
                <p className="text-[10.5px] text-slate-400 mt-0.5">
                  ตรวจสอบแผนบำรุงรักษาเชิงป้องกันที่เลยกำหนดวันนัดหมาย จัดการเลื่อนแผน หรือส่งแจ้งเตือนทีมช่าง
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Quick Stats Banner Bar */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-slate-900/50 border-b border-slate-800 shrink-0">
            <div 
              onClick={() => setActiveTab('overdue')}
              className={`p-3 rounded-xl border cursor-pointer transition ${
                activeTab === 'overdue' 
                  ? 'bg-rose-500/10 border-rose-500/40 text-rose-300' 
                  : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold tracking-wider">🚨 งานเลยกำหนดแผน (Overdue)</span>
                <span className="text-lg font-black font-mono text-rose-400">{totalOverdueCount}</span>
              </div>
              <p className="text-[9px] text-slate-400 mt-1">
                {criticalCount > 0 ? `⚠️ มี ${criticalCount} งานเลยกำหนดเกิน 7 วัน` : 'ต้องดำเนินการหรือเลื่อนแผน'}
              </p>
            </div>

            <div 
              onClick={() => setActiveTab('rescheduled')}
              className={`p-3 rounded-xl border cursor-pointer transition ${
                activeTab === 'rescheduled' 
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300' 
                  : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold tracking-wider">🔄 งานที่เคยเลื่อนแผน</span>
                <span className="text-lg font-black font-mono text-cyan-400">{totalRescheduledCount}</span>
              </div>
              <p className="text-[9px] text-slate-400 mt-1">มีการบันทึกสาเหตุการเลื่อนแล้ว</p>
            </div>

            <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">📱 แจ้งเตือน LINE</span>
                <button
                  onClick={handleBroadcastLineAlert}
                  disabled={isSendingLine || totalOverdueCount === 0}
                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-lg text-[10px] transition cursor-pointer disabled:opacity-50"
                  title="ส่งสรุปงานที่เลยกำหนดเข้า LINE Notify"
                >
                  <Send size={11} />
                  <span>{isSendingLine ? 'กำลังส่ง...' : 'แจ้งเตือนช่าง'}</span>
                </button>
              </div>
              <p className="text-[9px] text-slate-400 mt-1">
                {settings.lineNotifyEnabled ? 'เปิดใช้งาน LINE Notify แล้ว' : 'ตั้งค่าในเมนูการตั้งค่า'}
              </p>
            </div>
          </div>

          {/* Status message after broadcast */}
          {lineStatusMessage && (
            <div className="p-2.5 bg-slate-900 text-center text-xs font-bold text-cyan-300 border-b border-slate-800">
              {lineStatusMessage}
            </div>
          )}

          {/* Filter Toolbar */}
          <div className="p-3 bg-[#080d1a] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="ค้นหาเครื่องจักร, แผน PM..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#050a14] border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
                />
                <Search className="absolute left-2.5 top-2 text-slate-500" size={13} />
              </div>

              <select
                value={selectedTech}
                onChange={(e) => setSelectedTech(e.target.value)}
                className="bg-[#050a14] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-cyan-500"
              >
                <option value="">-- ช่างทั้งหมด --</option>
                {technicians.map((t, idx) => (
                  <option key={idx} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {onNavigateToPMHistory && (
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToPMHistory();
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 cursor-pointer"
                >
                  <span>เปิดหน้าประวัติ PM ทั้งหมด</span>
                  <ChevronRight size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Jobs List Body */}
          <div className="p-4 overflow-y-auto flex-1 space-y-3">
            {filteredList.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <CheckCircle2 size={40} className="mx-auto block text-emerald-500 mb-2" />
                <p className="text-sm font-bold text-slate-300">
                  {activeTab === 'overdue' 
                    ? 'ยอดเยี่ยม! ไม่พบงาน PM ที่เลยกำหนดในระบบ' 
                    : 'ไม่พบรายการงาน PM ที่มีการเลื่อนแผน'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  ทุกรายการได้รับการดำเนินการตรงตามกำหนดเวลามาตรฐาน
                </p>
              </div>
            ) : (
              filteredList.map((job) => {
                const machObj = machines.find(m => m.id === job.machineId);
                const planObj = pmPlans.find(p => p.id === job.pmPlanId);
                const overdueDays = getPMOverdueDays(job, todayStr);
                const isItemOverdue = isPMOverdue(job, todayStr);

                return (
                  <div 
                    key={job.id}
                    className={`p-4 rounded-xl border transition ${
                      isItemOverdue 
                        ? overdueDays >= 7 
                          ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500/60' 
                          : 'bg-amber-950/15 border-amber-500/30 hover:border-amber-500/50'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-xs font-mono font-bold text-cyan-400">
                            {job.machineId}
                          </span>
                          <span className="font-bold text-white text-xs">
                            {planObj?.title || 'งานบำรุงรักษา PM'}
                          </span>
                          <span className="text-[10px] text-slate-400 px-1.5 py-0.2 bg-slate-800/80 rounded font-sans">
                            {machObj?.name || ''}
                          </span>
                          
                          {/* Overdue Badge */}
                          {isItemOverdue && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 ${
                              overdueDays >= 7 
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse' 
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              <AlertTriangle size={10} />
                              <span>เลยกำหนด {overdueDays} วัน</span>
                            </span>
                          )}

                          {/* Rescheduled Badge */}
                          {(job.rescheduledCount || 0) > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                              <RefreshCw size={9} />
                              <span>เลื่อนแผน {job.rescheduledCount} ครั้ง (เดิม: {job.rescheduledFromDate})</span>
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} className="text-slate-500" />
                            <span>วันที่ตามแผน: <b className="font-mono text-slate-200">{job.date}</b></span>
                          </span>

                          <span className="flex items-center gap-1">
                            <Clock size={12} className="text-slate-500" />
                            <span>มาตรฐาน: <b className="font-mono text-slate-200">{job.duration} นาที</b></span>
                          </span>

                          <span className="flex items-center gap-1">
                            <User size={12} className="text-slate-500" />
                            <span>ผู้รับผิดชอบ: <b className="text-slate-200">{job.technician}</b></span>
                          </span>
                        </div>

                        {/* Reschedule reason text */}
                        {job.rescheduledReason && (
                          <div className="mt-2 p-2 bg-slate-950/60 rounded-lg border border-slate-800/80 text-[10.5px]">
                            <span className="text-amber-400 font-bold">📌 สาเหตุที่เลื่อนแผน: </span>
                            <span className="text-slate-300">{job.rescheduledReason}</span>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center mt-2 sm:mt-0">
                        <button
                          onClick={() => setReschedulingJob(job)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-black transition cursor-pointer shadow-md shadow-cyan-500/10"
                          title="เลื่อนแผนและนัดหมายวันใหม่"
                        >
                          <RefreshCw size={13} />
                          <span>เลื่อนแผนนัดหมายใหม่</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3.5 bg-[#080d1a] border-t border-slate-800 flex justify-between items-center text-xs text-slate-400 shrink-0">
            <span className="text-[11px]">
              แสดง {filteredList.length} จากทั้งหมด {currentList.length} รายการ
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>

        </div>
      </div>

      {/* Sub-modal: PM Reschedule Modal */}
      {reschedulingJob && (
        <PMRescheduleModal
          job={reschedulingJob}
          onClose={() => setReschedulingJob(null)}
          onSuccess={(updated) => {
            setReschedulingJob(null);
          }}
        />
      )}
    </>
  );
};
