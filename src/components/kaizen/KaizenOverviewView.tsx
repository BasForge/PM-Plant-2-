import React from 'react';
import { ImprovementProject, Machine } from '../../types';
import { 
  Sparkles, BookOpen, Search, HelpCircle, Wrench, Clock, 
  Users, FileText, Image as ImageIcon, CheckCircle2, TrendingUp, BarChart3 
} from 'lucide-react';

interface KaizenOverviewViewProps {
  improvements: ImprovementProject[];
  machines: Machine[];
  technicians: string[];
  onOpenPDF: (pdf: any) => void;
  onOpenPhoto: (photo: any) => void;
  onSwitchTab: (tabId: 'kaizen' | 'opl' | 'fa' | 'why_why') => void;
}

export const KaizenOverviewView: React.FC<KaizenOverviewViewProps> = ({
  improvements,
  machines,
  technicians,
  onOpenPDF,
  onOpenPhoto,
  onSwitchTab
}) => {
  // Stats by category
  const kaizenList = improvements.filter(i => !i.category || i.category === 'KAIZEN');
  const oplList = improvements.filter(i => i.category === 'OPL');
  const faList = improvements.filter(i => i.category === 'FA');
  const whyList = improvements.filter(i => i.category === 'WHY_WHY');

  const totalHours = improvements.reduce((sum, item) => {
    return sum + (item.workLogs?.reduce((wSum, l) => wSum + l.hours, 0) || 0);
  }, 0);

  const totalPdfs = improvements.reduce((sum, item) => {
    return sum + (item.pdfFiles?.length || 0);
  }, 0);

  const totalPhotos = improvements.reduce((sum, item) => {
    let count = 0;
    if (item.photoBefore) count++;
    if (item.photoAfter) count++;
    if (item.photos) count += item.photos.length;
    return sum + count;
  }, 0);

  const completedCount = improvements.filter(i => i.status === 'เสร็จแล้ว').length;

  // Technicians stats
  const techStats = technicians.map(tech => {
    const techItems = improvements.filter(i => i.technician === tech || i.technicians?.includes(tech));
    const hours = techItems.reduce((sum, item) => {
      return sum + (item.workLogs?.reduce((wSum, l) => wSum + l.hours, 0) || 0);
    }, 0);
    const kzCount = techItems.filter(i => !i.category || i.category === 'KAIZEN').length;
    const oCount = techItems.filter(i => i.category === 'OPL').length;
    const fCount = techItems.filter(i => i.category === 'FA').length;
    const wCount = techItems.filter(i => i.category === 'WHY_WHY').length;

    return {
      tech,
      totalCount: techItems.length,
      hours,
      kzCount,
      oCount,
      fCount,
      wCount
    };
  }).sort((a, b) => b.totalCount - a.totalCount);

  return (
    <div className="space-y-6">
      
      {/* 4 Category Summary Hero Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Kaizen Card */}
        <div 
          onClick={() => onSwitchTab('kaizen')}
          className="bg-slate-900/90 hover:bg-slate-850 border border-cyan-500/30 hover:border-cyan-400 rounded-2xl p-5 cursor-pointer transition-all shadow-lg group relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Wrench size={22} />
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded">
              Kaizen
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-white font-mono">{kaizenList.length}</h3>
            <p className="text-xs font-bold text-slate-300 mt-1">โครงการ Kaizen หน้างาน</p>
            <p className="text-[11px] text-slate-400 mt-0.5">ลดเวลาสูญเสีย & ปรับปรุงเครื่องจักร</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center text-[11px] text-cyan-400 font-semibold group-hover:translate-x-0.5 transition-transform">
            <span>เข้าสู่บอร์ด Kaizen</span>
            <span>→</span>
          </div>
        </div>

        {/* OPL Card */}
        <div 
          onClick={() => onSwitchTab('opl')}
          className="bg-slate-900/90 hover:bg-slate-850 border border-blue-500/30 hover:border-blue-400 rounded-2xl p-5 cursor-pointer transition-all shadow-lg group relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <BookOpen size={22} />
            </div>
            <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded">
              OPL
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-white font-mono">{oplList.length}</h3>
            <p className="text-xs font-bold text-slate-300 mt-1">One Point Lesson (OPL)</p>
            <p className="text-[11px] text-slate-400 mt-0.5">บทเรียนจุดเดียว & มาตรฐานการสอน</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center text-[11px] text-blue-400 font-semibold group-hover:translate-x-0.5 transition-transform">
            <span>เข้าสู่คลัง OPL</span>
            <span>→</span>
          </div>
        </div>

        {/* FA Card */}
        <div 
          onClick={() => onSwitchTab('fa')}
          className="bg-slate-900/90 hover:bg-slate-850 border border-rose-500/30 hover:border-rose-400 rounded-2xl p-5 cursor-pointer transition-all shadow-lg group relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Search size={22} />
            </div>
            <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded">
              FA
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-white font-mono">{faList.length}</h3>
            <p className="text-xs font-bold text-slate-300 mt-1">Failure Analysis (FA)</p>
            <p className="text-[11px] text-slate-400 mt-0.5">วินิจฉัยชิ้นส่วนชำรุด/ล้าตัว</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center text-[11px] text-rose-400 font-semibold group-hover:translate-x-0.5 transition-transform">
            <span>เข้าสู่ศูนย์ FA</span>
            <span>→</span>
          </div>
        </div>

        {/* Why-Why Card */}
        <div 
          onClick={() => onSwitchTab('why_why')}
          className="bg-slate-900/90 hover:bg-slate-850 border border-amber-500/30 hover:border-amber-400 rounded-2xl p-5 cursor-pointer transition-all shadow-lg group relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <HelpCircle size={22} />
            </div>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded">
              5 Whys
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-white font-mono">{whyList.length}</h3>
            <p className="text-xs font-bold text-slate-300 mt-1">Why-Why Analysis</p>
            <p className="text-[11px] text-slate-400 mt-0.5">สืบค้นสาเหตุรากเหง้า 5 ระดับ</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center text-[11px] text-amber-400 font-semibold group-hover:translate-x-0.5 transition-transform">
            <span>เข้าสู่กระดาน 5 Whys</span>
            <span>→</span>
          </div>
        </div>

      </div>

      {/* Aggregate Highlights & Attachment Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-lg font-bold text-white font-mono">{completedCount} / {improvements.length}</p>
            <p className="text-[11px] text-slate-400">งานที่เสร็จสมบูรณ์แล้ว</p>
          </div>
        </div>

        <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-lg font-bold text-white font-mono">{totalHours} ชม.</p>
            <p className="text-[11px] text-slate-400">เวลากิจกรรมพัฒนาสะสม</p>
          </div>
        </div>

        <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400">
            <FileText size={20} />
          </div>
          <div>
            <p className="text-lg font-bold text-white font-mono">{totalPdfs} ไฟล์</p>
            <p className="text-[11px] text-slate-400">เอกสาร PDF แนบในระบบ</p>
          </div>
        </div>

        <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400">
            <ImageIcon size={20} />
          </div>
          <div>
            <p className="text-lg font-bold text-white font-mono">{totalPhotos} ภาพ</p>
            <p className="text-[11px] text-slate-400">ภาพถ่ายก่อน-หลัง & หลักฐาน</p>
          </div>
        </div>
      </div>

      {/* Technician Contribution Ranking */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users size={16} className="text-cyan-400" />
            การมีส่วนร่วมของช่างในงานพัฒนา Kaizen, OPL, FA และ 5-Whys
          </h3>
          <span className="text-xs text-slate-400 font-mono">ช่างซ่อมบำรุงประจำแผนก</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">ช่างผู้รับผิดชอบ</th>
                <th className="py-2.5 px-3 text-center">Kaizen</th>
                <th className="py-2.5 px-3 text-center">OPL</th>
                <th className="py-2.5 px-3 text-center">FA</th>
                <th className="py-2.5 px-3 text-center">5 Whys</th>
                <th className="py-2.5 px-3 text-center">รวมผลงาน</th>
                <th className="py-2.5 px-3 text-right">ชั่วโมงรวม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {techStats.map(stat => (
                <tr key={stat.tech} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 font-semibold text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-cyan-400 font-mono font-bold flex items-center justify-center text-[10px]">
                      {stat.tech.charAt(stat.tech.length - 1)}
                    </span>
                    {stat.tech}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-cyan-400 font-bold">{stat.kzCount}</td>
                  <td className="py-3 px-3 text-center font-mono text-blue-400 font-bold">{stat.oCount}</td>
                  <td className="py-3 px-3 text-center font-mono text-rose-400 font-bold">{stat.fCount}</td>
                  <td className="py-3 px-3 text-center font-mono text-amber-400 font-bold">{stat.wCount}</td>
                  <td className="py-3 px-3 text-center font-mono font-extrabold text-white">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
                      {stat.totalCount} งาน
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-amber-300">{stat.hours} ชม.</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
