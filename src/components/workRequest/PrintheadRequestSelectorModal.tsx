import React, { useState, useMemo, useEffect } from 'react';
import { Printer, Search, X, Check, CheckSquare, Square, Filter } from 'lucide-react';
import { WorkRequest } from '../../types';

export interface PrintheadRequestSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  workRequests: WorkRequest[];
  onSelectRequests?: (selectedIds: string[]) => void;
  onSelectRequest?: (req: WorkRequest) => void;
  onToggleRequest?: (req: WorkRequest) => void;
}

export const PrintheadRequestSelectorModal: React.FC<PrintheadRequestSelectorModalProps> = ({
  isOpen,
  onClose,
  workRequests,
  onSelectRequests,
  onSelectRequest,
  onToggleRequest,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set());
      setSearchTerm('');
    }
  }, [isOpen]);

  // Candidates: only work requests not yet marked as printhead replacement
  const candidates = useMemo(() => {
    return workRequests.filter((r) => !r.isPrintheadReplacement);
  }, [workRequests]);

  const filteredCandidates = useMemo(() => {
    if (!searchTerm.trim()) return candidates;
    const term = searchTerm.toLowerCase();
    return candidates.filter((r) => {
      const ticket = (r.ticketNo || '').toLowerCase();
      const id = r.id.toLowerCase();
      const machine = (r.machineId || '').toLowerCase() + ' ' + (r.machineName || '').toLowerCase();
      const title = (r.problemTitle || '').toLowerCase();
      const details = (r.problemDetails || '').toLowerCase();
      const seq = r.sequenceNo !== undefined ? String(r.sequenceNo) : '';
      return (
        ticket.includes(term) ||
        id.includes(term) ||
        machine.includes(term) ||
        title.includes(term) ||
        details.includes(term) ||
        seq === term
      );
    });
  }, [candidates, searchTerm]);

  if (!isOpen) return null;

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    const next = new Set(selectedIds);
    filteredCandidates.forEach((r) => next.add(r.id));
    setSelectedIds(next);
  };

  const handleClearAll = () => {
    setSelectedIds(new Set());
  };

  const handleConfirm = () => {
    if (selectedIds.size === 0) {
      onClose();
      return;
    }
    const ids = Array.from(selectedIds);
    if (typeof onSelectRequests === 'function') {
      onSelectRequests(ids);
    } else if (typeof onToggleRequest === 'function') {
      ids.forEach((id) => {
        const req = workRequests.find((r) => r.id === id);
        if (req) onToggleRequest(req);
      });
    } else if (typeof onSelectRequest === 'function') {
      ids.forEach((id) => {
        const req = workRequests.find((r) => r.id === id);
        if (req) onSelectRequest(req);
      });
    }
    setSelectedIds(new Set());
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 bg-purple-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">เลือกงานแจ้งซ่อมเข้าประวัติเปลี่ยนหัวพิมพ์</h3>
              <p className="text-xs text-purple-200">
                ติ๊กเลือกรายการแจ้งซ่อมที่มีการเปลี่ยนหัวพิมพ์เพื่อบันทึกประวัติ
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="ค้นหาเลขที่, รหัสเครื่อง, หรืออาการ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleSelectAllVisible}
              className="px-2.5 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-100/70 rounded-lg transition"
            >
              เลือกทั้งหมดที่ค้นพบ ({filteredCandidates.length})
            </button>
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-200 rounded-lg transition"
              >
                ล้างการเลือก
              </button>
            )}
          </div>
        </div>

        {/* List of candidate requests */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
          {filteredCandidates.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              ไม่พบงานแจ้งซ่อมที่ตรงกับคำค้นหา
            </div>
          ) : (
            filteredCandidates.map((req, idx) => {
              const isChecked = selectedIds.has(req.id);
              const mentionsPrinthead =
                (req.problemTitle || '').toLowerCase().includes('หัวพิมพ์') ||
                (req.problemTitle || '').toLowerCase().includes('printhead') ||
                (req.problemDetails || '').toLowerCase().includes('หัวพิมพ์');

              return (
                <div
                  key={req.id}
                  onClick={() => handleToggle(req.id)}
                  className={`p-3 rounded-xl transition cursor-pointer flex items-center justify-between gap-3 ${
                    isChecked
                      ? 'bg-purple-50 border border-purple-200'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggle(req.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 text-xs">
                          {req.ticketNo || req.id}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono font-bold text-[11px] border border-blue-200">
                          {req.machineId}
                        </span>
                        <span className="text-xs text-slate-500">
                          {req.machineName}
                        </span>
                        {mentionsPrinthead && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                            🔍 ข้อความมีคำว่าหัวพิมพ์
                          </span>
                        )}
                      </div>
                      <div className="font-medium text-xs text-slate-800 mt-1 truncate">
                        {req.problemTitle}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>วันที่: {req.requestDate}</span>
                        <span>•</span>
                        <span>ผู้แจ้ง: {req.requesterName}</span>
                        <span>•</span>
                        <span>สถานะ: {req.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-xs font-semibold text-purple-900">
            เลือกอยู่: <span className="font-bold">{selectedIds.size}</span> รายการ
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              id="btn-confirm-add-printhead-modal"
              disabled={selectedIds.size === 0}
              onClick={handleConfirm}
              className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>เพิ่มเข้าประวัติเปลี่ยนหัวพิมพ์ ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
