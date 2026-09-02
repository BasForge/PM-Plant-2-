import React from 'react';
import { X, ZoomIn, Download, Image as ImageIcon } from 'lucide-react';

interface PhotoLightboxModalProps {
  photo: {
    url: string;
    title?: string;
    subtitle?: string;
    badge?: string;
  } | null;
  onClose: () => void;
}

export const PhotoLightboxModal: React.FC<PhotoLightboxModalProps> = ({ photo, onClose }) => {
  if (!photo) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = photo.url;
    link.download = `${photo.title || 'kaizen-photo'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <ImageIcon size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">{photo.title || 'ภาพผลงาน'}</h3>
                {photo.badge && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {photo.badge}
                  </span>
                )}
              </div>
              {photo.subtitle && (
                <p className="text-xs text-slate-400 mt-0.5">{photo.subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg transition-all"
              title="บันทึกรูปภาพ"
            >
              <Download size={14} />
              บันทึกภาพ
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Image Preview Canvas */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950 flex items-center justify-center min-h-[400px]">
          <img
            src={photo.url}
            alt={photo.title || 'Photo'}
            className="max-h-[70vh] max-w-full object-contain rounded-lg border border-slate-800 shadow-xl"
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 flex justify-between items-center text-xs text-slate-400">
          <span>หลักฐานภาพถ่ายผลงาน Kaizen / OPL / FA / Why-Why</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
          >
            ปิด
          </button>
        </div>

      </div>
    </div>
  );
};
