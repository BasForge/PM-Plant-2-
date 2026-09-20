import React, { useState } from 'react';
import { PMPlan, Machine } from '../types';
import { Printer, Download, X, CheckCircle2, AlertCircle, FileText, Sparkles, Wrench } from 'lucide-react';
import { downloadPMTemplateExcel } from '../utils/pmExcelParser';

interface PMDocumentViewModalProps {
  plan: PMPlan;
  machine?: Machine;
  onClose: () => void;
}

export const PMDocumentViewModal: React.FC<PMDocumentViewModalProps> = ({ plan, machine, onClose }) => {
  const [checkResults, setCheckResults] = useState<Record<number, 'ปกติ' | 'ไม่ปกติ'>>({});
  const [abnormalNotes, setAbnormalNotes] = useState<Record<number, string>>({});
  const [interactiveMode, setInteractiveMode] = useState(false);

  const docCode = plan.docCode || 'F-QMS-011/12';
  const revision = plan.revision || '00';
  const effectiveDate = plan.effectiveDate || '16-07-2019';
  const machineName = plan.machineName || machine?.name || 'เครื่องจักร';
  const machineId = plan.machineId || machine?.id || '-';

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    downloadPMTemplateExcel(machineId, machineName);
  };

  const getMethodBadge = (method?: string) => {
    if (!method) return null;
    if (method.includes('สายตา')) {
      return <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-medium border border-blue-200">👁️ {method}</span>;
    }
    if (method.includes('เครื่องมือวัด')) {
      return <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">📏 {method}</span>;
    }
    if (method.includes('ประสาทสัมผัส')) {
      return <span className="inline-flex items-center gap-1 text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-medium border border-purple-200">🧠 {method}</span>;
    }
    if (method.includes('มือ') && method.includes('เครื่องมือ')) {
      return <span className="inline-flex items-center gap-1 text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-medium border border-amber-200">🔧 {method}</span>;
    }
    return <span className="inline-flex items-center gap-1 text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-medium border border-slate-200">{method}</span>;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl max-w-5xl w-full max-h-[95vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden print:m-0 print:p-0 print:border-none print:shadow-none print:max-w-none print:w-full">
        
        {/* Top Action Bar (Hidden when printing) */}
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between border-b border-slate-800 print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <FileText className="text-cyan-400" size={18} />
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2 text-white">
                แบบฟอร์มทางการ: ใบรายงาน Preventive Maintenance (PM)
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-mono font-bold border border-cyan-500/30">
                  {docCode}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                เครื่องจักร: <b className="text-white">{machineId}</b> - {machineName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setInteractiveMode(!interactiveMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                interactiveMode 
                  ? 'bg-emerald-500 text-slate-950 font-bold' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <Sparkles size={13} />
              <span>{interactiveMode ? 'โหมดทดลองติ๊กตรวจ' : 'เปิดโหมดติ๊กตรวจ'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Download size={13} />
              <span>นำออก Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer size={13} />
              <span>สั่งพิมพ์</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white font-sans text-xs print:p-2 print:overflow-visible">
          
          {/* Header Block matching F-QMS-011/12 */}
          <div className="border border-slate-900 mb-0">
            <div className="grid grid-cols-12 border-b border-slate-900">
              {/* Document Title box */}
              <div className="col-span-8 p-3 flex flex-col justify-center items-center border-r border-slate-900">
                <span className="text-[11px] font-bold text-slate-700">ชื่อเอกสาร :</span>
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-950 mt-0.5">
                  ใบรายงาน Preventive Maintenance (PM)
                </h1>
              </div>

              {/* Doc Control box */}
              <div className="col-span-4 p-2.5 text-[11px] divide-y divide-slate-300">
                <div className="pb-1 flex justify-between">
                  <span className="font-bold text-slate-700">รหัสเอกสาร :</span>
                  <span className="font-mono font-bold text-slate-950">{docCode}</span>
                </div>
                <div className="py-1 flex justify-between">
                  <span className="font-bold text-slate-700">แก้ไขครั้งที่ :</span>
                  <span className="font-mono text-slate-900">{revision}</span>
                </div>
                <div className="pt-1 flex justify-between">
                  <span className="font-bold text-slate-700">วันที่เริ่มใช้ :</span>
                  <span className="font-mono text-slate-900">{effectiveDate}</span>
                </div>
              </div>
            </div>

            {/* Machine & Date Meta row */}
            <div className="grid grid-cols-12 text-[11px] p-2 bg-slate-50 border-t border-slate-900 gap-2">
              <div className="col-span-4 flex items-center gap-1.5">
                <span className="font-bold text-slate-700">ชื่อเครื่องจักร :</span>
                <span className="font-semibold text-slate-950 truncate">{machineName}</span>
              </div>
              <div className="col-span-4 flex items-center gap-1.5">
                <span className="font-bold text-slate-700">รหัสเครื่องจักร :</span>
                <span className="font-mono font-black text-slate-950 bg-white px-2 py-0.5 border border-slate-300 rounded">
                  {machineId}
                </span>
              </div>
              <div className="col-span-4 flex items-center justify-end gap-1.5">
                <span className="font-bold text-slate-700">วันที่ทำ PM :</span>
                <span className="border-b border-dotted border-slate-600 px-3 text-slate-500">
                  ...............................................
                </span>
              </div>
            </div>
          </div>

          {/* Checklist Table */}
          <div className="overflow-x-auto border-x border-b border-slate-900">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-950 border-b border-slate-900 text-[11px] font-bold text-center">
                  <th className="p-2 border-r border-slate-400 w-12 shrink-0">ลำดับ</th>
                  <th className="p-2 border-r border-slate-400 w-44 text-left">หัวข้อ PM</th>
                  <th className="p-2 border-r border-slate-400 w-28 text-center">วิธีการ</th>
                  <th className="p-2 border-r border-slate-400 text-left">มาตรฐาน</th>
                  <th className="p-2 border-r border-slate-400 w-24 text-center">ความถี่</th>
                  <th className="p-2 border-r border-slate-400 w-20 text-center" colSpan={2}>ผลการ PM</th>
                  <th className="p-2 border-r border-slate-400 w-36 text-left">รายละเอียดสิ่งที่ผิดปกติ</th>
                  <th className="p-2 w-24 text-center">หมายเหตุ</th>
                </tr>
                <tr className="bg-slate-200/80 text-[10px] font-bold text-center border-b border-slate-900">
                  <th className="border-r border-slate-400"></th>
                  <th className="border-r border-slate-400"></th>
                  <th className="border-r border-slate-400"></th>
                  <th className="border-r border-slate-400"></th>
                  <th className="border-r border-slate-400"></th>
                  <th className="p-1 border-r border-slate-300 w-10 text-emerald-800">ปกติ</th>
                  <th className="p-1 border-r border-slate-400 w-10 text-rose-800">ไม่ปกติ</th>
                  <th className="border-r border-slate-400"></th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 text-[11px]">
                {plan.steps.map((step, idx) => {
                  const stepNo = step.itemNo || idx + 1;
                  const currentResult = checkResults[idx];
                  const currentNote = abnormalNotes[idx] || '';

                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      {/* 1. ลำดับ */}
                      <td className="p-2 text-center font-bold text-slate-800 border-r border-slate-300 align-top">
                        {stepNo}
                      </td>

                      {/* 2. หัวข้อ PM */}
                      <td className="p-2 font-semibold text-slate-950 border-r border-slate-300 align-top">
                        {step.title}
                      </td>

                      {/* 3. วิธีการ */}
                      <td className="p-2 text-center border-r border-slate-300 align-top">
                        {getMethodBadge(step.method)}
                      </td>

                      {/* 4. มาตรฐาน */}
                      <td className="p-2 text-slate-800 border-r border-slate-300 align-top leading-relaxed">
                        {step.standard || 'โครงสร้างสมบูรณ์ ไม่มีส่วนชำรุด'}
                      </td>

                      {/* 5. ความถี่ */}
                      <td className="p-2 text-center font-medium text-slate-700 border-r border-slate-300 align-top">
                        <span className={step.frequency?.includes('6') ? 'bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold' : ''}>
                          {step.frequency || plan.frequency || '1 เดือน/ครั้ง'}
                        </span>
                      </td>

                      {/* 6. ผลตรวจ ปกติ */}
                      <td className="p-1 text-center border-r border-slate-300 align-middle">
                        {interactiveMode ? (
                          <button
                            type="button"
                            onClick={() => setCheckResults(prev => ({ ...prev, [idx]: prev[idx] === 'ปกติ' ? (undefined as any) : 'ปกติ' }))}
                            className={`w-6 h-6 mx-auto rounded border flex items-center justify-center transition cursor-pointer ${
                              currentResult === 'ปกติ' 
                                ? 'bg-emerald-600 border-emerald-700 text-white' 
                                : 'border-slate-300 hover:border-emerald-500'
                            }`}
                          >
                            {currentResult === 'ปกติ' && '✓'}
                          </button>
                        ) : (
                          <div className="w-5 h-5 mx-auto border border-slate-400 rounded-sm"></div>
                        )}
                      </td>

                      {/* 7. ผลตรวจ ไม่ปกติ */}
                      <td className="p-1 text-center border-r border-slate-300 align-middle">
                        {interactiveMode ? (
                          <button
                            type="button"
                            onClick={() => setCheckResults(prev => ({ ...prev, [idx]: prev[idx] === 'ไม่ปกติ' ? (undefined as any) : 'ไม่ปกติ' }))}
                            className={`w-6 h-6 mx-auto rounded border flex items-center justify-center transition cursor-pointer ${
                              currentResult === 'ไม่ปกติ' 
                                ? 'bg-rose-600 border-rose-700 text-white' 
                                : 'border-slate-300 hover:border-rose-500'
                            }`}
                          >
                            {currentResult === 'ไม่ปกติ' && '✕'}
                          </button>
                        ) : (
                          <div className="w-5 h-5 mx-auto border border-slate-400 rounded-sm"></div>
                        )}
                      </td>

                      {/* 8. รายละเอียดสิ่งที่ผิดปกติ */}
                      <td className="p-1.5 border-r border-slate-300 align-top">
                        {interactiveMode ? (
                          <input
                            type="text"
                            placeholder="ระบุสิ่งที่ผิดปกติ..."
                            value={currentNote}
                            onChange={(e) => setAbnormalNotes(prev => ({ ...prev, [idx]: e.target.value }))}
                            className="w-full text-[10px] p-1 border border-slate-300 rounded focus:outline-none focus:border-cyan-600"
                          />
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">{step.abnormalityDetail || '-'}</span>
                        )}
                      </td>

                      {/* 9. หมายเหตุ */}
                      <td className="p-1.5 text-center align-top text-slate-600 text-[10.5px]">
                        {step.remark || (step.stdTime ? `(${step.stdTime} นาที)` : '-')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Signatures & Spare Parts Section */}
          <div className="border-x border-b border-slate-900 p-4 space-y-4 bg-slate-50/50">
            {/* Signatures */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-[11px]">
              <div className="p-3 bg-white border border-slate-300 rounded-lg text-center space-y-2">
                <p className="text-slate-700 font-bold">ผู้ทำการ PM</p>
                <p className="border-b border-dotted border-slate-400 pb-1 text-slate-500">
                  {plan.signTech || '...................................................'}
                </p>
                <p className="text-[10px] text-slate-500">ทีมช่างซ่อมบำรุง</p>
              </div>

              <div className="p-3 bg-white border border-slate-300 rounded-lg text-center space-y-2">
                <p className="text-slate-700 font-bold">ผู้รับทราบทำการ PM</p>
                <p className="border-b border-dotted border-slate-400 pb-1 text-slate-500">
                  {plan.signProd || '...................................................'}
                </p>
                <p className="text-[10px] text-slate-500">ฝ่ายผลิต</p>
              </div>

              <div className="p-3 bg-white border border-slate-300 rounded-lg text-center space-y-2">
                <p className="text-slate-700 font-bold">ผู้ตรวจสอบทำการ PM</p>
                <p className="border-b border-dotted border-slate-400 pb-1 text-slate-500">
                  {plan.signLeader || '...................................................'}
                </p>
                <p className="text-[10px] text-slate-500">หัวหน้าหน่วย PM</p>
              </div>
            </div>

            {/* Spare parts to be prepared */}
            <div className="border border-slate-300 rounded-lg bg-white p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-800 font-bold text-[11px]">
                <Wrench size={14} className="text-cyan-600" />
                <span>รายการอะไหล่ที่เตรียมแก้ไข / บันทึกอะไหล่บำรุงรักษา:</span>
              </div>
              <p className="text-[11px] text-slate-700 italic pl-5">
                {plan.spareParts || plan.repairPartsNotes || '- ไม่มีรายการอะไหล่ต้องจัดหาเพิ่มเติม -'}
              </p>
            </div>
          </div>

        </div>

        {/* Footer info (Modal bottom) */}
        <div className="bg-slate-100 px-5 py-2.5 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <span>มาตรฐานเอกสารระบบคุณภาพ: <strong className="text-slate-800 font-mono">{docCode}</strong></span>
            <span>•</span>
            <span>ทั้งหมด {plan.steps.length} รายการตรวจเช็ค</span>
            <span>•</span>
            <span>เวลารวมมาตรฐาน TTM: <strong className="text-cyan-700 font-mono">{plan.ttm} นาที</strong></span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
