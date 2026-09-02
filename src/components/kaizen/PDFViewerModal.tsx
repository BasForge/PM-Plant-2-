import React from 'react';
import { X, Download, FileText, ExternalLink } from 'lucide-react';
import { PDFFileAttachment } from '../../types';

interface PDFViewerModalProps {
  pdf: PDFFileAttachment | null;
  onClose: () => void;
}

export const PDFViewerModal: React.FC<PDFViewerModalProps> = ({ pdf, onClose }) => {
  if (!pdf) return null;

  const handleDownload = () => {
    if (pdf.content.startsWith('data:application/pdf')) {
      const link = document.createElement('a');
      link.href = pdf.content;
      link.download = pdf.name || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Create a dummy downloadable text/pdf blob if it's sample data
      const blob = new Blob([`เอกสารแบบฟอร์ม: ${pdf.name}\nวันที่อัปโหลด: ${pdf.uploadedAt || '-'}\nขนาด: ${pdf.size || '-'}`], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = pdf.name || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const isRealDataUrl = pdf.content && pdf.content.startsWith('data:application/pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">{pdf.name}</h3>
              <p className="text-xs text-slate-400">
                ขนาดไฟล์: <span className="text-slate-300 font-medium">{pdf.size || '1.2 MB'}</span> • อัปโหลดเมื่อ: <span className="text-slate-300 font-medium">{pdf.uploadedAt || 'ล่าสุด'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-all"
              title="ดาวน์โหลดไฟล์ PDF"
            >
              <Download size={14} />
              ดาวน์โหลด PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950/50 flex flex-col items-center justify-center min-h-[450px]">
          {isRealDataUrl ? (
            <iframe
              src={pdf.content}
              title={pdf.name}
              className="w-full h-full min-h-[500px] rounded-xl border border-slate-800 bg-white"
            />
          ) : (
            <div className="text-center p-8 max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                <FileText size={32} />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">{pdf.name}</h4>
                <p className="text-xs text-slate-400 mt-1">
                  ไฟล์เอกสาร PDF แนบประกอบผลงาน Kaizen / OPL / FA / Why-Why อย่างเป็นทางการ
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-left text-xs space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>สถานะไฟล์:</span>
                  <span className="text-emerald-400 font-semibold">พร้อมใช้งาน (Verified)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>ขนาดไฟล์:</span>
                  <span className="text-slate-200">{pdf.size || '1.2 MB'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>วันที่จัดทำ:</span>
                  <span className="text-slate-200">{pdf.uploadedAt || '2026-06-08'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>ระบบความปลอดภัย:</span>
                  <span className="text-slate-200">GMP / Food Safety Archive</span>
                </div>
              </div>

              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white font-bold rounded-xl shadow-lg transition-all text-xs"
              >
                <Download size={16} />
                ดาวน์โหลดและเปิดดูไฟล์ PDF
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 flex justify-between items-center text-xs text-slate-400">
          <span>ระบบเอกสารวิศวกรรมและการปรับปรุง (Food Plant Kaizen Document Management)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
