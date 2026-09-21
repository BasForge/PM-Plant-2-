import React, { useState, useMemo } from 'react';
import { 
  Printer, 
  Search, 
  Plus, 
  Download, 
  FileText, 
  Edit, 
  Trash2, 
  Wrench, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Filter,
  Check,
  AlertTriangle
} from 'lucide-react';
import { WorkRequest, WorkRequestStatus } from '../../types';

interface PrintheadHistoryTabProps {
  workRequests: WorkRequest[];
  onOpenDetailModal: (req: WorkRequest) => void;
  onOpenPrintheadModal: (req: WorkRequest) => void;
  onRemoveFromPrinthead: (requestId: string) => void;
  onOpenSelectorModal: () => void;
  showToast: (msg: string) => void;
  renderStatusBadge?: (status: WorkRequestStatus) => React.ReactNode;
}

const defaultStatusBadge = (status: WorkRequestStatus) => {
  switch (status) {
    case 'รอตอบรับ':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-2xs">
          <Clock className="w-3 h-3 animate-spin" />
          รอตอบรับ
        </span>
      );
    case 'ตอบรับแล้ว/มีแผนงาน':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-2xs">
          <CheckCircle2 className="w-3 h-3" />
          มีแผนงานแล้ว
        </span>
      );
    case 'กำลังดำเนินการซ่อม':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-2xs">
          <Wrench className="w-3 h-3 animate-bounce" />
          กำลังซ่อม
        </span>
      );
    case 'รออะไหล่/สั่งของ':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-300">
          รออะไหล่
        </span>
      );
    case 'ซ่อมเสร็จ/รอฝ่ายผลิตตรวจรับ':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-600 text-white shadow-2xs animate-pulse">
          <CheckCircle2 className="w-3 h-3" />
          รอตรวจรับ
        </span>
      );
    case 'ปิดงานสมบูรณ์':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-700 text-white shadow-2xs">
          <Check className="w-3 h-3" />
          ปิดงานสมบูรณ์
        </span>
      );
    case 'ยกเลิก/ปฏิเสธ':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800 border border-rose-300">
          ยกเลิก
        </span>
      );
  }
};

export const PrintheadHistoryTab: React.FC<PrintheadHistoryTabProps> = ({
  workRequests,
  onOpenDetailModal,
  onOpenPrintheadModal,
  onRemoveFromPrinthead,
  onOpenSelectorModal,
  showToast,
  renderStatusBadge = defaultStatusBadge,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [machineFilter, setMachineFilter] = useState<string>('ทั้งหมด');

  // Printhead work requests
  const printheadRequests = useMemo(() => {
    return workRequests.filter((r) => r.isPrintheadReplacement);
  }, [workRequests]);

  // Unique machines that have had printhead replacements
  const uniqueMachines = useMemo(() => {
    const map = new Map<string, string>();
    printheadRequests.forEach((r) => {
      map.set(r.machineId, r.machineName || r.machineId);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [printheadRequests]);

  // KPIs
  const stats = useMemo(() => {
    const total = printheadRequests.length;
    // Count per machine to find top machine
    const machCount: Record<string, number> = {};
    printheadRequests.forEach((r) => {
      machCount[r.machineId] = (machCount[r.machineId] || 0) + 1;
    });
    let topMach = '-';
    let topCount = 0;
    Object.entries(machCount).forEach(([m, cnt]) => {
      if (cnt > topCount) {
        topCount = cnt;
        topMach = m;
      }
    });

    // Latest replacement
    let latestDate = '-';
    if (total > 0) {
      const sorted = [...printheadRequests].sort((a, b) => {
        const d1 = a.printheadDetails?.replacedDate || a.requestDate;
        const d2 = b.printheadDetails?.replacedDate || b.requestDate;
        return d2.localeCompare(d1);
      });
      latestDate = sorted[0].printheadDetails?.replacedDate || sorted[0].requestDate;
    }

    const closed = printheadRequests.filter((r) => r.status === 'ปิดงานสมบูรณ์').length;
    const inProgress = total - closed;

    return { total, topMach, topCount, latestDate, closed, inProgress };
  }, [printheadRequests]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return printheadRequests.filter((r) => {
      if (machineFilter !== 'ทั้งหมด' && r.machineId !== machineFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const ticket = (r.ticketNo || '').toLowerCase();
        const id = r.id.toLowerCase();
        const machine = (r.machineId || '').toLowerCase() + ' ' + (r.machineName || '').toLowerCase();
        const model = (r.printheadDetails?.model || '').toLowerCase();
        const newSerial = (r.printheadDetails?.newSerial || '').toLowerCase();
        const oldSerial = (r.printheadDetails?.oldSerial || '').toLowerCase();
        const reason = (r.printheadDetails?.reason || r.problemTitle || '').toLowerCase();
        const tech = (r.printheadDetails?.technician || '').toLowerCase();
        const seq = r.sequenceNo !== undefined ? String(r.sequenceNo) : '';

        return (
          ticket.includes(term) ||
          id.includes(term) ||
          machine.includes(term) ||
          model.includes(term) ||
          newSerial.includes(term) ||
          oldSerial.includes(term) ||
          reason.includes(term) ||
          tech.includes(term) ||
          seq === term
        );
      }
      return true;
    });
  }, [printheadRequests, machineFilter, searchTerm]);

  // Export Printhead History CSV
  const handleExportPrintheadCSV = () => {
    if (printheadRequests.length === 0) {
      showToast('ไม่มีข้อมูลการเปลี่ยนหัวพิมพ์เพื่อส่งออก');
      return;
    }

    const headers = [
      'ลำดับ',
      'เลขที่แจ้งซ่อม',
      'รหัสเครื่องจักร',
      'ชื่อเครื่องจักร',
      'ไลน์ผลิต/แผนก',
      'วันที่เปลี่ยนหัวพิมพ์',
      'รุ่นหัวพิมพ์',
      'ซีเรียลหัวพิมพ์ใหม่',
      'ซีเรียลหัวพิมพ์เดิม',
      'ค่าความต้านทาน/Dot',
      'แรงดันไฟ',
      'ช่างผู้เปลี่ยน',
      'สาเหตุการเปลี่ยน',
      'หมายเหตุ',
      'สถานะใบแจ้งซ่อม'
    ];

    const rows = filteredRequests.map((r, idx) => {
      const d = r.printheadDetails || {};
      return [
        r.sequenceNo !== undefined ? r.sequenceNo : idx + 1,
        `"${r.ticketNo || r.id}"`,
        `"${r.machineId}"`,
        `"${r.machineName || ''}"`,
        `"${r.lineGroup || ''}"`,
        `"${d.replacedDate || r.requestDate}"`,
        `"${d.model || ''}"`,
        `"${d.newSerial || ''}"`,
        `"${d.oldSerial || ''}"`,
        `"${d.resistance || ''}"`,
        `"${d.voltage || ''}"`,
        `"${d.technician || ''}"`,
        `"${(d.reason || r.problemTitle).replace(/"/g, '""')}"`,
        `"${(d.notes || '').replace(/"/g, '""')}"`,
        `"${r.status}"`
      ].join(',');
    });

    const bom = '\uFEFF';
    const csvContent = bom + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `printhead_replacement_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('📥 ส่งออกไฟล์ประวัติการเปลี่ยนหัวพิมพ์ CSV เรียบร้อยแล้ว');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top KPI Cards for Printhead History */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-purple-50/70 border border-purple-200 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-700">การเปลี่ยนหัวพิมพ์ทั้งหมด</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-950 mt-2">{stats.total}</div>
          <div className="text-[11px] text-purple-600 mt-0.5">บันทึกจากงานแจ้งซ่อม</div>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">เครื่องที่เปลี่ยนบ่อยที่สุด</span>
            <div className="w-8 h-8 rounded-xl bg-slate-200/70 text-slate-700 flex items-center justify-center font-mono font-bold text-xs">
              TOP
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-2 truncate">
            {stats.topMach !== '-' ? stats.topMach : 'ยังไม่มีข้อมูล'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {stats.topCount > 0 ? `เปลี่ยนไปแล้ว ${stats.topCount} ครั้ง` : 'ไม่มีประวัติ'}
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">เปลี่ยนหัวพิมพ์ล่าสุด</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 mt-2 font-mono">
            {stats.latestDate}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">วันที่บันทึกล่าสุด</div>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">สถานะปิดงานสมบูรณ์</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-2">
            {stats.closed} <span className="text-xs text-slate-500 font-normal">/ {stats.total}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {stats.inProgress > 0 ? `รอดำเนินการ ${stats.inProgress} งาน` : 'ปิดงานทั้งหมดแล้ว'}
          </div>
        </div>
      </div>

      {/* Filter and Action Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="ค้นหาเลขที่, รหัสเครื่อง, ซีเรียลหัวพิมพ์..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          {/* Machine filter */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={machineFilter}
              onChange={(e) => setMachineFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-purple-500/20 w-full sm:w-auto"
            >
              <option value="ทั้งหมด">-- เครื่องจักรทั้งหมด ({uniqueMachines.length} เครื่อง) --</option>
              {uniqueMachines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id} - {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={onOpenSelectorModal}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="เลือกงานแจ้งซ่อมที่มีอยู่เพื่อบันทึกเป็นงานเปลี่ยนหัวพิมพ์"
          >
            <Plus className="w-4 h-4" />
            <span>+ เลือกจากงานแจ้งซ่อม</span>
          </button>

          <button
            type="button"
            onClick={handleExportPrintheadCSV}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="ส่งออกรายงานประวัติการเปลี่ยนหัวพิมพ์ CSV"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>ส่งออก CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="พิมพ์หน้านี้"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>พิมพ์</span>
          </button>
        </div>
      </div>

      {/* Printhead Records Table */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3">
            <Printer className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {printheadRequests.length === 0
              ? 'ยังไม่มีรายการแจ้งซ่อมที่ถูกติ๊กเป็นงานเปลี่ยนหัวพิมพ์'
              : 'ไม่พบข้อมูลที่ตรงกับคำค้นหาหรือตัวกรอง'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {printheadRequests.length === 0
              ? 'คุณสามารถคลิกปุ่มด้านล่างเพื่อเลือกงานแจ้งซ่อมเข้าระบบ หรือกดติ๊กไอคอนรูปหัวพิมพ์ในตารางงานแจ้งซ่อมหลัก'
              : 'ลองเปลี่ยนคำค้นหา หรือเลือกเครื่องจักรทั้งหมด'}
          </p>
          {printheadRequests.length === 0 && (
            <button
              type="button"
              onClick={onOpenSelectorModal}
              className="mt-4 px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs transition inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ ติ๊กเลือกงานแจ้งซ่อมเข้าประวัติเปลี่ยนหัวพิมพ์</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1060px]">
              <thead>
                <tr className="bg-purple-50/60 border-b border-purple-200 text-purple-900 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3 text-center w-12">ลำดับ</th>
                  <th className="py-3 px-3.5 w-36">เลขที่แจ้งซ่อม</th>
                  <th className="py-3 px-3.5 w-44">เครื่องจักร & ไลน์</th>
                  <th className="py-3 px-3.5 w-28">วันที่เปลี่ยน</th>
                  <th className="py-3 px-4 min-w-[240px]">ข้อมูลหัวพิมพ์ (รุ่น / ซีเรียล)</th>
                  <th className="py-3 px-4 min-w-[220px]">อาการ / สาเหตุที่เปลี่ยน</th>
                  <th className="py-3 px-3.5 w-32">ช่างผู้เปลี่ยน</th>
                  <th className="py-3 px-3.5 w-32 text-center">สถานะงาน</th>
                  <th className="py-3 px-3.5 w-36 text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((req, idx) => {
                  const d = req.printheadDetails || {};
                  return (
                    <tr
                      key={`ph-${req.id}-${idx}`}
                      className="hover:bg-purple-50/40 transition cursor-pointer group"
                      onClick={() => onOpenDetailModal(req)}
                    >
                      {/* ลำดับ */}
                      <td className="py-3.5 px-3 text-center font-mono font-bold">
                        <span className="w-6 h-6 rounded bg-purple-100 text-purple-800 inline-flex items-center justify-center text-xs border border-purple-200">
                          {req.sequenceNo !== undefined ? req.sequenceNo : idx + 1}
                        </span>
                      </td>

                      {/* เลขที่แจ้งซ่อม */}
                      <td className="py-3.5 px-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded text-xs border border-slate-200">
                            {req.ticketNo || req.id}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ID: {req.id}
                        </div>
                      </td>

                      {/* เครื่องจักร & ไลน์ */}
                      <td className="py-3.5 px-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono font-bold text-xs">
                            {req.machineId}
                          </span>
                        </div>
                        <div className="font-medium text-slate-800 text-xs mt-1 truncate max-w-[170px]" title={req.machineName}>
                          {req.machineName || req.machineId}
                        </div>
                        {req.lineGroup && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[170px]">
                            {req.lineGroup}
                          </div>
                        )}
                      </td>

                      {/* วันที่เปลี่ยน */}
                      <td className="py-3.5 px-3.5 font-mono text-[11px] whitespace-nowrap text-slate-700">
                        <div className="font-semibold text-purple-950">
                          {d.replacedDate || req.requestDate}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ขอเมื่อ {req.requestTime} น.
                        </div>
                      </td>

                      {/* ข้อมูลหัวพิมพ์ (รุ่น / ซีเรียล) */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-1">
                          {d.model ? (
                            <div className="font-bold text-purple-900 flex items-center gap-1">
                              <Printer size={12} className="text-purple-600" />
                              <span>{d.model}</span>
                            </div>
                          ) : (
                            <div className="text-slate-400 italic text-[11px]">ไม่ได้ระบุรุ่นหัวพิมพ์</div>
                          )}

                          <div className="flex flex-wrap gap-2 text-[11px]">
                            {d.newSerial && (
                              <span className="bg-purple-100/80 text-purple-900 px-1.5 py-0.5 rounded font-mono font-bold">
                                ใหม่: {d.newSerial}
                              </span>
                            )}
                            {d.oldSerial && (
                              <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                                เดิม: {d.oldSerial}
                              </span>
                            )}
                            {d.resistance && (
                              <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                                R: {d.resistance}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* อาการ / สาเหตุที่เปลี่ยน */}
                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="font-semibold text-slate-900 line-clamp-1">
                          {d.reason || req.problemTitle}
                        </div>
                        {d.notes && (
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            หมายเหตุ: {d.notes}
                          </div>
                        )}
                      </td>

                      {/* ช่างผู้เปลี่ยน */}
                      <td className="py-3.5 px-3.5 text-slate-700">
                        <div className="font-medium text-slate-800">
                          {d.technician || req.engineeringResponse?.assignedTechnicians?.[0] || '-'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ผู้แจ้ง: {req.requesterName}
                        </div>
                      </td>

                      {/* สถานะงาน */}
                      <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                        {renderStatusBadge(req.status)}
                      </td>

                      {/* การจัดการ */}
                      <td className="py-3.5 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onOpenDetailModal(req)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition"
                            title="ดูใบสั่งซ่อมฉบับเต็ม"
                          >
                            <FileText size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenPrintheadModal(req)}
                            className="p-1.5 rounded-lg text-purple-600 hover:text-purple-800 hover:bg-purple-100 transition"
                            title="แก้ไขข้อมูลหัวพิมพ์ (ซีเรียล / รุ่น / ความต้านทาน)"
                          >
                            <Edit size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => onRemoveFromPrinthead(req.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="ปลดออกจากประวัติการเปลี่ยนหัวพิมพ์"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
