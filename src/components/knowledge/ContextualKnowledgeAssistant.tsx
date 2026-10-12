import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { KnowledgeItem } from '../../types/knowledge';
import { 
  BookOpen, Sparkles, Zap, CheckCircle2, ChevronDown, 
  ChevronUp, ExternalLink, Eye, Wrench, ShieldCheck, 
  BookMarked, HelpCircle, X, ArrowUpRight
} from 'lucide-react';

interface ContextualKnowledgeAssistantProps {
  machineId: string;
  machineName?: string;
  symptoms?: string;
  onOpenFullKnowledge?: (item: KnowledgeItem) => void;
  className?: string;
}

export const ContextualKnowledgeAssistant: React.FC<ContextualKnowledgeAssistantProps> = ({
  machineId,
  machineName,
  symptoms,
  onOpenFullKnowledge,
  className = ''
}) => {
  const { knowledgeItems, improvements, setActivePage } = useApp();
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'MANUAL' | 'WI' | 'TROUBLESHOOTING' | 'WHY_WHY'>('ALL');
  const [selectedItemToRead, setSelectedItemToRead] = useState<KnowledgeItem | null>(null);

  // Match items for this machine or symptom
  const matchedItems = useMemo(() => {
    if (!machineId) return [];

    const normMid = machineId.trim().toUpperCase();
    const qSymptom = (symptoms || '').toLowerCase();

    // 1. From knowledgeItems
    const directMatches = knowledgeItems.filter(item => {
      const matchMachine = item.machineId.toUpperCase() === normMid;
      const matchSymptom = qSymptom && (
        item.title.toLowerCase().includes(qSymptom) ||
        item.troubleshootingData?.symptom.toLowerCase().includes(qSymptom) ||
        item.whyWhyData?.problemStatement.toLowerCase().includes(qSymptom) ||
        item.tags.some(t => qSymptom.includes(t.toLowerCase()))
      );
      return matchMachine || matchSymptom;
    });

    // 2. Also check why-why improvements
    const whyMatches: KnowledgeItem[] = [];
    improvements
      .filter(imp => imp.category === 'WHY_WHY' && imp.machineId?.toUpperCase() === normMid)
      .forEach(imp => {
        if (!directMatches.some(m => m.id === `imp-why-${imp.id}`)) {
          whyMatches.push({
            id: `imp-why-${imp.id}`,
            type: 'WHY_WHY',
            title: imp.title,
            machineId: imp.machineId || normMid,
            machineName: machineName || normMid,
            tags: ['Why-Why', 'Breakdown Case'],
            author: imp.technician || 'วิศวกรซ่อมบำรุง',
            createdAt: imp.startDate || '2026-06-01',
            updatedAt: imp.plannedEndDate || '2026-06-01',
            isVerified: true,
            whyWhyData: {
              problemStatement: imp.whyWhyData?.problemStatement || imp.description,
              phenomenon: imp.whyWhyData?.phenomenon || '',
              why1: imp.whyWhyData?.why1 || '',
              why2: imp.whyWhyData?.why2 || '',
              why3: imp.whyWhyData?.why3 || '',
              why4: imp.whyWhyData?.why4 || '',
              why5: imp.whyWhyData?.why5 || imp.whyWhyData?.rootCauseSummary || '',
              rootCauseSummary: imp.whyWhyData?.rootCauseSummary || '',
              countermeasure: imp.whyWhyData?.countermeasure || ''
            }
          });
        }
      });

    return [...directMatches, ...whyMatches];
  }, [machineId, symptoms, knowledgeItems, improvements, machineName]);

  const filteredItems = useMemo(() => {
    if (activeTab === 'ALL') return matchedItems;
    return matchedItems.filter(i => i.type === activeTab);
  }, [matchedItems, activeTab]);

  if (matchedItems.length === 0) {
    return (
      <div className={`p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 flex items-center justify-between ${className}`}>
        <div className="flex items-center gap-2">
          <BookOpen size={15} className="text-slate-500" />
          <span>Active CMMS Knowledge: ยังไม่มีเอกสารคู่มือหรือเคส Why-Why สำหรับเครื่อง {machineId}</span>
        </div>
        <button
          type="button"
          onClick={() => setActivePage(18)}
          className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 transition cursor-pointer"
        >
          <span>ไปที่คลังความรู้</span>
          <ArrowUpRight size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/20 via-slate-900/90 to-slate-950 p-4 shadow-xl text-xs space-y-3 ${className}`}>
      {/* Header Strip */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Sparkles size={16} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-white text-xs sm:text-sm">
                💡 Active CMMS Knowledge: องค์ความรู้ประจำเครื่อง {machineId}
              </h4>
              <span className="px-2 py-0.2 rounded-full bg-indigo-950 text-indigo-300 font-bold font-mono text-[10px] border border-indigo-800">
                พบ {matchedItems.length} รายการ
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              ดึงคู่มือ, WI และเคส Why-Why แนะนำอัตโนมัติสำหรับช่างหน้างาน
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActivePage(18)}
            className="hidden sm:flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-bold px-2 py-1 rounded-lg bg-slate-900 border border-slate-700/80 transition cursor-pointer"
            title="เปิดศูนย์คลังความรู้เต็มหน้าจอ"
          >
            <span>เปิดคลังความรู้</span>
            <ExternalLink size={12} />
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800 transition cursor-pointer"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-2.5 pt-1 border-t border-slate-800/80 animate-in fade-in">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${
                activeTab === 'ALL' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              ทั้งหมด ({matchedItems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('TROUBLESHOOTING')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${
                activeTab === 'TROUBLESHOOTING' ? 'bg-amber-600 text-white shadow' : 'bg-slate-900 text-amber-400 hover:text-white'
              }`}
            >
              ⚡ วิเคราะห์อาการเสีย ({matchedItems.filter(i => i.type === 'TROUBLESHOOTING').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('WI')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${
                activeTab === 'WI' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-900 text-emerald-400 hover:text-white'
              }`}
            >
              📋 WI/SOP ({matchedItems.filter(i => i.type === 'WI').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('WHY_WHY')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${
                activeTab === 'WHY_WHY' ? 'bg-purple-600 text-white shadow' : 'bg-slate-900 text-purple-400 hover:text-white'
              }`}
            >
              🧠 Why-Why ({matchedItems.filter(i => i.type === 'WHY_WHY').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('MANUAL')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${
                activeTab === 'MANUAL' ? 'bg-blue-600 text-white shadow' : 'bg-slate-900 text-blue-400 hover:text-white'
              }`}
            >
              📖 Manual ({matchedItems.filter(i => i.type === 'MANUAL').length})
            </button>
          </div>

          {/* List of recommendations */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {filteredItems.map(item => (
              <div 
                key={item.id}
                className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 transition flex items-center justify-between gap-3 group"
              >
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-black uppercase tracking-wider ${
                      item.type === 'MANUAL'
                        ? 'bg-blue-950 text-blue-300 border border-blue-800'
                        : item.type === 'WI'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : item.type === 'TROUBLESHOOTING'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-purple-950 text-purple-300 border border-purple-800'
                    }`}>
                      {item.type}
                    </span>
                    <span className="font-bold text-white text-xs truncate max-w-[280px]">
                      {item.title}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-1">
                    {item.troubleshootingData?.symptom || item.whyWhyData?.problemStatement || item.manualData?.summary || item.wiData?.precautions}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (onOpenFullKnowledge) {
                      onOpenFullKnowledge(item);
                    } else {
                      setSelectedItemToRead(item);
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 font-bold flex items-center gap-1 transition cursor-pointer text-[11px] shrink-0"
                >
                  <Eye size={12} />
                  <span>อ่าน</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Embedded Quick Reader Modal if not handled externally */}
      {selectedItemToRead && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1325] border border-slate-700 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-xs">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
              <div className="flex items-center gap-2">
                <span className="font-mono text-cyan-400 font-bold">{selectedItemToRead.machineId}</span>
                <h4 className="font-bold text-white text-sm truncate max-w-md">{selectedItemToRead.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItemToRead(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-900"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3">
              {selectedItemToRead.troubleshootingData && (
                <div className="space-y-2">
                  <div className="p-2.5 bg-amber-950/30 border border-amber-800/40 rounded-xl text-amber-200">
                    <strong>อาการ:</strong> {selectedItemToRead.troubleshootingData.symptom}
                  </div>
                  <h5 className="font-bold text-white">สาเหตุและวิธีแก้ไข:</h5>
                  {selectedItemToRead.troubleshootingData.probableCauses.map((pc, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-slate-300">
                        <strong>สาเหตุ: {pc.cause}</strong>
                        <span className="text-[10px] text-amber-400 font-bold">{pc.probability}</span>
                      </div>
                      <div className="text-emerald-300"><strong>วิธีแก้:</strong> {pc.solution}</div>
                      {pc.sparePartNeeded && <div className="text-amber-300 font-mono text-[10px]">อะไหล่: {pc.sparePartNeeded}</div>}
                    </div>
                  ))}
                </div>
              )}

              {selectedItemToRead.wiData && (
                <div className="space-y-2">
                  <div className="p-2.5 bg-rose-950/30 border border-rose-800/40 rounded-xl text-rose-200">
                    <strong>ข้อควรระวัง:</strong> {selectedItemToRead.wiData.precautions}
                  </div>
                  <h5 className="font-bold text-white">ขั้นตอนปฏิบัติ:</h5>
                  {selectedItemToRead.wiData.steps.map(st => (
                    <div key={st.stepNo} className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                      <div className="font-bold text-white">{st.stepNo}. {st.title}</div>
                      <div className="text-slate-300 mt-0.5">{st.description}</div>
                      {st.standard && <div className="text-emerald-400 text-[11px] mt-0.5">มาตรฐาน: {st.standard}</div>}
                    </div>
                  ))}
                </div>
              )}

              {selectedItemToRead.whyWhyData && (
                <div className="space-y-2">
                  <div className="p-2.5 bg-purple-950/30 border border-purple-800/40 rounded-xl text-purple-200">
                    <strong>ปัญหา:</strong> {selectedItemToRead.whyWhyData.problemStatement}
                  </div>
                  <div className="p-2.5 bg-rose-950/30 border border-rose-800/40 rounded-xl text-rose-200">
                    <strong>สาเหตุรากเหง้า:</strong> {selectedItemToRead.whyWhyData.why5 || selectedItemToRead.whyWhyData.rootCauseSummary}
                  </div>
                  <div className="p-2.5 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-emerald-200">
                    <strong>มาตรการป้องกัน:</strong> {selectedItemToRead.whyWhyData.countermeasure}
                  </div>
                </div>
              )}

              {selectedItemToRead.manualData && (
                <div className="space-y-2">
                  <div className="p-2.5 bg-blue-950/30 border border-blue-800/40 rounded-xl text-blue-200">
                    <strong>รหัสเอกสาร:</strong> {selectedItemToRead.manualData.docCode} (Rev.{selectedItemToRead.manualData.revision})
                  </div>
                  <p className="text-slate-300 leading-relaxed">{selectedItemToRead.manualData.summary}</p>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-900/60 text-right">
              <button
                type="button"
                onClick={() => setSelectedItemToRead(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-200 font-bold"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
