import React, { useState, useEffect } from 'react';
import { X, Download, FileText, FileSpreadsheet, Layers, Table, AlertCircle } from 'lucide-react';
import { PDFFileAttachment, isExcelAttachment } from '../../types';
import * as XLSX from 'xlsx';

interface PDFViewerModalProps {
  pdf: PDFFileAttachment | null;
  onClose: () => void;
}

export const PDFViewerModal: React.FC<PDFViewerModalProps> = ({ pdf, onClose }) => {
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [sheetData, setSheetData] = useState<{ [sheetName: string]: any[][] }>({});
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const isExcel = pdf ? isExcelAttachment(pdf) : false;

  useEffect(() => {
    if (!pdf) {
      setSheetData({});
      setSheetNames([]);
      setActiveSheet('');
      setParseError(null);
      return;
    }

    if (isExcel && pdf.content) {
      if (pdf.content.startsWith('sample_excel')) {
        const sampleType = pdf.content.split(':')[1] || 'kaizen';
        let sampleRows: any[][] = [];
        let sampleSheetName = 'Sheet1';
        if (sampleType === 'kaizen') {
          sampleSheetName = 'Kaizen_ROI_Calculation';
          sampleRows = [
            ['หัวข้อการประเมิน (Cost & Benefit Matrix)', 'ก่อนปรับปรุง (Before)', 'หลังปรับปรุง (After)', 'ผลต่าง / ประหยัดได้', 'หน่วยวัด'],
            ['เวลาทำความสะอาดลูกรีดต่อวัน', 35, 5, 30, 'นาที/วัน'],
            ['เวลาหยุดเครื่องสะสมต่อเดือน (Downtime)', 750, 95, 655, 'นาที/เดือน'],
            ['ค่าสูญเสียวัตถุดิบแป้งติดลูกรีดสะสม', 12500, 1200, 11300, 'บาท/เดือน'],
            ['ค่าแรงช่างและพนักงานประจำกะ', 8400, 1200, 7200, 'บาท/เดือน'],
            ['รวมมูลค่าประหยัดต่อปี (Estimated Annual Saving)', '', '', 222000, 'บาท/ปี'],
            ['ต้นทุนการดัดแปลงติดตั้ง (One-time Investment)', '', '', 15000, 'บาท'],
            ['ระยะเวลาคืนทุน (Payback Period)', '', '', '0.81 เดือน (ประมาณ 25 วัน)', 'เดือน']
          ];
        } else if (sampleType === 'opl') {
          sampleSheetName = 'OPL_Standard_Parameters';
          sampleRows = [
            ['ลำดับ', 'พารามิเตอร์การตั้งค่า (Parameters)', 'ค่าควบคุมมาตรฐาน (Standard)', 'เกณฑ์ยอมรับ (Tolerance)', 'ความถี่ในการตรวจสอบ', 'เครื่องมือวัด'],
            [1, 'แรงดันลมกระบอกสูบ (Air Pressure)', '5.5 bar', '±0.2 bar', 'ทุกต้นกะผลิต', 'Pressure Gauge P-01'],
            [2, 'อุณหภูมิแท่งซีลความร้อน (Sealing Temp)', '165 °C', '±3 °C', 'ต่อเนื่องแบบ Realtime', 'Thermocouple Type K'],
            [3, 'ระยะห่างลูกรีดดึงฟิล์ม (Roller Gap)', '1.8 mm', '±0.05 mm', 'สัปดาห์ละ 1 ครั้ง', 'Feeler Gauge'],
            [4, 'ความตึงฟิล์ม (Tension Roller)', '12 N', '±1 N', 'เมื่อเปลี่ยนม้วนฟิล์มใหม่', 'Tension Meter']
          ];
        } else if (sampleType === 'fa') {
          sampleSheetName = 'FA_Fatigue_Calculation';
          sampleRows = [
            ['ตัวแปรทางวิศวกรรม (Engineering Parameter)', 'ค่าจากการวัดจริง (Measured)', 'ค่าคำนวณตามแบบ (Design Specs)', 'หน่วยวัด', 'ข้อสรุปการวิเคราะห์'],
            ['เส้นผ่านศูนย์กลางเพลา (Shaft Diameter)', 35.0, 35.0, 'mm', 'ขนาดภายนอกตรงตามแบบ'],
            ['รัศมีโค้งมนร่องลิ่มเดิม (Fillet Radius R)', 0.1, 3.0, 'mm', 'CRITICAL DEFECT: คมเกินไป (Sharp corner)'],
            ['ค่าความเค้นกระจุกตัว (Stress Conc. Factor Kt)', 3.85, 1.45, '-', 'ความเค้นสะสมสูงเกินเกณฑ์ 265%'],
            ['ความแข็งผิวเดิม (Surface Hardness)', 22, 45, 'HRC', 'เนื้อโลหะอ่อนกว่าสเปกชุบแข็ง'],
            ['เกรดวัสดุเดิม vs เกรดใหม่', 'SUS304', 'SUS420J2 ชุบแข็ง', '-', 'อนุมัติสั่งผลิตด้วยแบบปรับปรุงใหม่']
          ];
        } else {
          sampleSheetName = '5Whys_Action_Plan';
          sampleRows = [
            ['ลำดับ', 'สาเหตุรากเหง้า (Root Cause)', 'มาตรการแก้ไข / ป้องกัน (Countermeasure)', 'ผู้รับผิดชอบ', 'กำหนดเสร็จ', 'สถานะ'],
            [1, 'พัดลมตู้คอนโทรลหยุดหมุนจากฝุ่นแป้งอุดตัน', 'เปลี่ยนพัดลมใหม่เกรด IP55 พร้อมติดตั้งตะแกรงกรองฝุ่นละเอียด', 'ช่าง 2, ช่าง 4', '2026-06-10', 'เสร็จสิ้น 100%'],
            [2, 'ไม่มีรายการล้างแผ่นกรองในแผน PM เดิม', 'แก้ไขแบบฟอร์ม PM-STD-ELEC-009 เพิ่มรอบตรวจสัปดาห์ละ 1 ครั้ง', 'หัวหน้าแผนกซ่อมบำรุง', '2026-06-11', 'เสร็จสิ้น 100%'],
            [3, 'อุณหภูมิตู้สูงกว่าเกณฑ์ตัดวงจร', 'ติดตั้ง Temperature Sensor พร้อม Relay ส่งสัญญาณเตือนเมื่อ > 45°C', 'ช่าง 2', '2026-06-15', 'เสร็จสิ้น 100%']
          ];
        }

        setSheetData({ [sampleSheetName]: sampleRows });
        setSheetNames([sampleSheetName]);
        setActiveSheet(sampleSheetName);
        setParseError(null);
        return;
      }

      try {
        let workbook: XLSX.WorkBook;
        if (pdf.content.includes('base64,')) {
          const base64Data = pdf.content.split('base64,')[1];
          workbook = XLSX.read(base64Data, { type: 'base64' });
        } else if (pdf.content.startsWith('data:')) {
          const base64Data = pdf.content.split(',')[1];
          workbook = XLSX.read(base64Data, { type: 'base64' });
        } else {
          workbook = XLSX.read(pdf.content, { type: 'binary' });
        }

        const sheets: { [name: string]: any[][] } = {};
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
          sheets[sheetName] = json;
        });

        setSheetData(sheets);
        setSheetNames(workbook.SheetNames);
        if (workbook.SheetNames.length > 0) {
          setActiveSheet(workbook.SheetNames[0]);
        }
        setParseError(null);
      } catch (err: any) {
        console.warn('Failed to parse excel preview', err);
        setParseError('ไม่สามารถอ่านโครงสร้างตารางได้โดยตรง แต่ท่านสามารถดาวน์โหลดไฟล์ Excel (.xlsx) เพื่อเปิดในโปรแกรมได้ตามปกติ');
      }
    }
  }, [pdf, isExcel]);

  if (!pdf) return null;

  const handleDownload = () => {
    if (isExcel && pdf.content && pdf.content.startsWith('sample_excel')) {
      const wb = XLSX.utils.book_new();
      sheetNames.forEach(name => {
        const ws = XLSX.utils.aoa_to_sheet(sheetData[name] || []);
        XLSX.utils.book_append_sheet(wb, ws, name);
      });
      XLSX.writeFile(wb, pdf.name || 'document.xlsx');
      return;
    }

    const link = document.createElement('a');
    if (pdf.content && pdf.content.startsWith('data:')) {
      link.href = pdf.content;
      link.download = pdf.name || (isExcel ? 'document.xlsx' : 'document.pdf');
    } else {
      const mime = isExcel
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';
      const blob = new Blob([pdf.content || ''], { type: mime });
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = pdf.name || (isExcel ? 'document.xlsx' : 'document.pdf');
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isRealPdfDataUrl = pdf.content && pdf.content.startsWith('data:application/pdf');
  const currentSheetRows = activeSheet ? sheetData[activeSheet] || [] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900 shrink-0">
          <div className="flex items-center gap-3 truncate max-w-[70%]">
            <div
              className={`p-2.5 rounded-xl border ${
                isExcel
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
              }`}
            >
              {isExcel ? <FileSpreadsheet size={22} /> : <FileText size={22} />}
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isExcel
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {isExcel ? 'EXCEL SPREADSHEET' : 'PDF DOCUMENT'}
                </span>
                <h3 className="text-sm font-bold text-white tracking-wide truncate">{pdf.name}</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ขนาด: <span className="text-slate-300 font-medium">{pdf.size || '12 KB'}</span> • อัปโหลดเมื่อ: <span className="text-slate-300 font-medium">{pdf.uploadedAt || 'ล่าสุด'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownload}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all shadow-sm ${
                isExcel
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/40'
                  : 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-500/40'
              }`}
              title={isExcel ? 'ดาวน์โหลดไฟล์ Excel (.xlsx)' : 'ดาวน์โหลดไฟล์ PDF'}
            >
              <Download size={14} />
              {isExcel ? 'ดาวน์โหลด Excel (.xlsx)' : 'ดาวน์โหลด PDF'}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-950/60 min-h-[480px]">
          {isExcel ? (
            /* EXCEL VIEWER */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Sheets tabs */}
              {sheetNames.length > 0 && (
                <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 border-b border-slate-800 overflow-x-auto shrink-0">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-2 font-medium">
                    <Layers size={14} className="text-emerald-400" />
                    แผ่นงาน (Sheets):
                  </div>
                  {sheetNames.map((name) => (
                    <button
                      key={name}
                      onClick={() => setActiveSheet(name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                        activeSheet === name
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                          : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                  <div className="ml-auto text-[11px] text-slate-400 shrink-0">
                    แสดง {currentSheetRows.length} แถว
                  </div>
                </div>
              )}

              {/* Sheet Table */}
              <div className="flex-1 overflow-auto p-4">
                {parseError ? (
                  <div className="max-w-md mx-auto my-12 p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                      <AlertCircle size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">ไฟล์ Excel พร้อมใช้งาน</h4>
                      <p className="text-xs text-slate-400 mt-1">{parseError}</p>
                    </div>
                    <button
                      onClick={handleDownload}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                    >
                      <Download size={14} />
                      ดาวน์โหลดไฟล์เพื่อเปิดใช้งานทันที
                    </button>
                  </div>
                ) : currentSheetRows.length === 0 ? (
                  <div className="text-center py-20 text-slate-500 text-xs">
                    ไม่พบข้อมูลแถวในแผ่นงานนี้
                  </div>
                ) : (
                  <div className="inline-block min-w-full align-middle border border-slate-800 rounded-xl overflow-hidden bg-slate-900/90 shadow-inner">
                    <table className="min-w-full border-collapse text-xs text-left">
                      <thead>
                        {currentSheetRows[0] && (
                          <tr className="bg-slate-800/90 border-b border-slate-700 text-slate-200">
                            <th className="px-3 py-2.5 w-12 text-center text-[10px] font-bold text-slate-400 border-r border-slate-700">
                              #
                            </th>
                            {currentSheetRows[0].map((cell: any, cIdx: number) => (
                              <th
                                key={cIdx}
                                className="px-3 py-2.5 font-bold whitespace-nowrap border-r border-slate-700/60 last:border-r-0 text-slate-200"
                              >
                                {cell !== undefined && cell !== null && String(cell).trim() !== ''
                                  ? String(cell)
                                  : `Col ${cIdx + 1}`}
                              </th>
                            ))}
                          </tr>
                        )}
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {currentSheetRows.slice(1).map((row: any[], rIdx: number) => (
                          <tr
                            key={rIdx}
                            className="hover:bg-slate-800/50 transition-colors group"
                          >
                            <td className="px-3 py-2 text-center text-[10px] text-slate-500 font-mono border-r border-slate-800 bg-slate-950/40">
                              {rIdx + 2}
                            </td>
                            {currentSheetRows[0].map((_: any, cIdx: number) => {
                              const val = row ? row[cIdx] : '';
                              return (
                                <td
                                  key={cIdx}
                                  className="px-3 py-2 whitespace-nowrap text-slate-300 border-r border-slate-800/60 last:border-r-0 font-mono text-[11px]"
                                >
                                  {val !== undefined && val !== null ? String(val) : ''}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* PDF VIEWER */
            <div className="flex-1 flex flex-col items-center justify-center p-4">
              {isRealPdfDataUrl ? (
                <iframe
                  src={pdf.content}
                  title={pdf.name}
                  className="w-full h-full min-h-[520px] rounded-xl border border-slate-800 bg-white"
                />
              ) : (
                <div className="text-center p-8 max-w-md bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
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
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900 flex justify-between items-center text-xs text-slate-400 shrink-0">
          <span className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isExcel ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
            ระบบเอกสารวิศวกรรมและการปรับปรุง (Food Plant Engineering & Kaizen Archive)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
