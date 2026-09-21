import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { WorkRequest } from '../../types';

interface BulkDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedRequests: WorkRequest[];
  totalCount: number;
}

export const BulkDeleteConfirmModal: React.FC<BulkDeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedRequests,
  totalCount,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">ยืนยันการลบรายการแจ้งซ่อมแบบกลุ่ม</h3>
              <p className="text-xs text-rose-100">ลบรายการที่เลือกทั้งหมด {totalCount} รายการ</p>
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

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-amber-950 mb-0.5">
                คำเตือน: การกระทำนี้ไม่สามารถย้อนกลับได้
              </div>
              <div>
                คุณกำลังจะลบรายการแจ้งซ่อมจำนวน <strong className="text-rose-600 font-black">{totalCount} รายการ</strong> ออกจากระบบและฐานข้อมูลถาวร
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
              <span>รายการที่จะถูกลบ (ตัวอย่าง):</span>
              <span className="text-[11px] text-slate-500 font-normal">แสดงสูงสุด 5 รายการ</span>
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50">
              {selectedRequests.slice(0, 5).map((req, idx) => (
                <div key={req.id || idx} className="p-2.5 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                      {req.ticketNo || req.id}
                    </span>
                    <span className="truncate text-slate-700 font-medium">{req.problemTitle}</span>
                  </div>
                  <span className="text-slate-500 font-mono text-[11px] shrink-0">{req.machineId}</span>
                </div>
              ))}
              {selectedRequests.length > 5 && (
                <div className="p-2 text-center text-xs text-slate-500 font-medium bg-slate-100/70">
                  ... และอีก {selectedRequests.length - 5} รายการ
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>ยืนยันลบ {totalCount} รายการ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
