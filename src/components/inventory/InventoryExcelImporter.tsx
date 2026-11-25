import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Layers,
  History
} from 'lucide-react';
import { SparePart, StockTransaction } from '../../types';
import {
  autoDetectInventoryColumns,
  buildInventoryImportPreview,
  EMPTY_IMPORT_MAP,
  formatThaiShortDate,
  getTodayIso,
  InventoryImportColumnMap
} from '../../utils/inventoryUtils';

interface InventoryExcelImporterProps {
  existingParts: SparePart[];
  operatorName: string;
  canEdit: boolean;
  canDelete: boolean;
  onApplyImport: (params: {
    mode: 'MERGE' | 'OVERWRITE';
    parts: SparePart[];
    transactions: StockTransaction[];
    clearOldTransactions?: boolean;
  }) => void;
}

const COLUMN_MAPPING_FIELDS: {
  key: keyof InventoryImportColumnMap;
  label: string;
  group: 'core' | 'prpo' | 'stock';
  required?: boolean;
}[] = [
  { key: 'name', label: 'ชื่ออะไหล่ (Short Text) *', group: 'core', required: true },
  { key: 'sku', label: 'รหัสอะไหล่ (SKU) [เว้นว่าง=สร้างอัตโนมัติ]', group: 'core' },
  { key: 'unit', label: 'หน่วยนับ (Unit of Measure)', group: 'core' },
  { key: 'pricePerUnit', label: 'ราคาต่อหน่วย (Valuation Price)', group: 'core' },
  { key: 'supplier', label: 'ซัพพลายเออร์ (Desired Supplier)', group: 'core' },
  { key: 'machine', label: 'เครื่องจักรที่ใช้ (เครื่อง)', group: 'core' },
  { key: 'category', label: 'หมวดหมู่ (เว้นว่าง=จัดอัตโนมัติ)', group: 'core' },
  { key: 'location', label: 'ตำแหน่งเก็บ (Location)', group: 'core' },
  { key: 'receivedQty', label: 'จำนวนรับเข้า (รับเข้า)', group: 'stock' },
  { key: 'issuedQty', label: 'จำนวนจ่ายออก (จ่าย)', group: 'stock' },
  { key: 'remainingQty', label: 'จำนวนคงเหลือ (จำนวนคงเหลือ)', group: 'stock' },
  { key: 'minRequired', label: 'ค่า Min (จุดสั่งซื้อ)', group: 'stock' },
  { key: 'maxStock', label: 'ค่า Max (สต๊อกสูงสุด)', group: 'stock' },
  { key: 'receiveDate', label: 'วันที่รับเข้าจริง', group: 'stock' },
  { key: 'issueDate', label: 'วันที่จ่ายออกจริง', group: 'stock' },
  { key: 'requisitionDate', label: 'วันที่ขอซื้อ (Requisition date)', group: 'prpo' },
  { key: 'prNo', label: 'เลข PR (Purchase Requisition)', group: 'prpo' },
  { key: 'poNo', label: 'เลข PO (Purchase order)', group: 'prpo' },
  { key: 'qtyRequested', label: 'จำนวนสั่งซื้อ (Quantity requested)', group: 'prpo' },
  { key: 'status', label: 'สถานะรับของ (สถานะ)', group: 'prpo' },
  { key: 'workRequestNo', label: 'ใบเบิก / เลขที่แจ้งซ่อม', group: 'prpo' }
];

export const InventoryExcelImporter: React.FC<InventoryExcelImporterProps> = ({
  existingParts,
  operatorName,
  canEdit,
  canDelete,
  onApplyImport
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [workbookRef, setWorkbookRef] = useState<XLSX.WorkBook | null>(null);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<InventoryImportColumnMap>(EMPTY_IMPORT_MAP);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Import behavior options
  const [importMode, setImportMode] = useState<'MERGE' | 'OVERWRITE'>('MERGE');
  const [clearOldTxOnOverwrite, setClearOldTxOnOverwrite] = useState<boolean>(false);
  const [fillDownSupplier, setFillDownSupplier] = useState<boolean>(true);
  const [groupSamePartName, setGroupSamePartName] = useState<boolean>(true);
  const [generateStockTransactions, setGenerateStockTransactions] = useState<boolean>(true);
  const [autoMinMaxWhenMissing, setAutoMinMaxWhenMissing] = useState<boolean>(true);
  const [defaultMin, setDefaultMin] = useState<number>(2);
  const [defaultMaxMultiplier, setDefaultMaxMultiplier] = useState<number>(2);
  const [defaultLocation, setDefaultLocation] = useState<string>('คลังอะไหล่กลาง');
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState<boolean>(false);

  const loadSheetFromWorkbook = (wb: XLSX.WorkBook, sheetName: string) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      defval: '',
      raw: true
    });
    const detectedHeaders = rows.length > 0 ? Object.keys(rows[0]) : [];
    setSelectedSheet(sheetName);
    setRawRows(rows);
    setHeaders(detectedHeaders);
    setColumnMap(autoDetectInventoryColumns(detectedHeaders));
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('');
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: false });
      if (!wb.SheetNames || wb.SheetNames.length === 0) {
        setErrorMessage('ไม่พบชีตข้อมูลในไฟล์ Excel นี้');
        return;
      }
      setFileName(file.name);
      setWorkbookRef(wb);
      setSheetNames(wb.SheetNames);
      loadSheetFromWorkbook(wb, wb.SheetNames[0]);
    } catch {
      setErrorMessage('ไม่สามารถอ่านไฟล์ Excel ได้ กรุณาตรวจสอบว่าเป็นไฟล์ .xlsx, .xls หรือ .csv ที่ถูกต้อง');
    }
  };

  const previewResult = useMemo(() => {
    if (rawRows.length === 0 || !columnMap.name) return null;
    return buildInventoryImportPreview(rawRows, columnMap, {
      fillDownSupplier,
      groupSamePartName,
      generateStockTransactions,
      autoMinMaxWhenMissing,
      defaultMin,
      defaultMaxMultiplier,
      defaultLocation,
      operatorName,
      existingParts: importMode === 'MERGE' ? existingParts : []
    });
  }, [
    rawRows,
    columnMap,
    fillDownSupplier,
    groupSamePartName,
    generateStockTransactions,
    autoMinMaxWhenMissing,
    defaultMin,
    defaultMaxMultiplier,
    defaultLocation,
    operatorName,
    existingParts,
    importMode
  ]);

  const handleDownloadTemplate = (variant: 'prpo' | 'minmax') => {
    const wb = XLSX.utils.book_new();
    if (variant === 'prpo') {
      const sampleRows = [
        {
          'Requisition date': '7/15/2026',
          'Purchase Requisition': '430134553',
          'Purchase order': '405295746',
          'Short Text': 'สายพาน PU สีน้ำเงิน 480x2220xT0.7 mm.',
          'Quantity requested': 2,
          'Unit of Measure': 'EA',
          'Valuation Price': 1750,
          'Total Value': 3500,
          'Name of Desired Supplier': 'เยนเนอรัล ซัพพลาย แอนด์ เซอร์วิส',
          'เครื่อง': 'สายพานเครื่องหั่นหมูแดง',
          'สถานะ': 'รับแล้ว',
          'รับเข้า': 2,
          'จ่าย': 0,
          'จำนวนคงเหลือ': 2,
          'ใบเบิก เลขที่แจ้งซ่อม': '',
          'Min': 1,
          'Max': 4,
          'ตำแหน่งเก็บ': 'ชั้น A-01'
        },
        {
          'Requisition date': '8/30/2026',
          'Purchase Requisition': '430136279',
          'Purchase order': '405300710',
          'Short Text': 'ใบมีดสไลด์หมู Dia. 220x18x3 มม.',
          'Quantity requested': 4,
          'Unit of Measure': 'EA',
          'Valuation Price': 3400,
          'Total Value': 13600,
          'Name of Desired Supplier': 'จรัสบริการ',
          'เครื่อง': 'เครื่องหั่นหมูแดง',
          'สถานะ': 'รับแล้ว',
          'รับเข้า': 4,
          'จ่าย': 2,
          'จำนวนคงเหลือ': 2,
          'ใบเบิก เลขที่แจ้งซ่อม': '171380',
          'Min': 2,
          'Max': 6,
          'ตำแหน่งเก็บ': 'ตู้ B-02'
        }
      ];
      const ws = XLSX.utils.json_to_sheet(sampleRows);
      XLSX.utils.book_append_sheet(wb, ws, 'PR_PO_Stock');
      XLSX.writeFile(wb, `Template_Stock_PR_PO_${getTodayIso()}.xlsx`);
    } else {
      const sampleRows = [
        {
          'รหัสอะไหล่ (SKU)': 'SP-001',
          'ชื่ออะไหล่': 'Sensor Omron E3Z-R81',
          'หมวดหมู่': 'อุปกรณ์ไฟฟ้าและเซนเซอร์',
          'เครื่องจักร': 'Banding',
          'ซัพพลายเออร์': 'ตรีศักดิ์ ออโตเมชั่น',
          'หน่วยนับ': 'EA',
          'ราคาต่อหน่วย': 2400,
          'จำนวนคงเหลือ': 2,
          'Min': 2,
          'Max': 5,
          'ตำแหน่งเก็บ': 'ตู้ไฟฟ้า A1',
          'วันที่รับเข้า': getTodayIso(),
          'เลข PO': '405296032'
        }
      ];
      const ws = XLSX.utils.json_to_sheet(sampleRows);
      XLSX.utils.book_append_sheet(wb, ws, 'Master_MinMax');
      XLSX.writeFile(wb, `Template_Stock_MinMax_${getTodayIso()}.xlsx`);
    }
  };

  const triggerConfirmImport = () => {
    if (!previewResult || previewResult.parts.length === 0) return;
    if (importMode === 'OVERWRITE') {
      setShowOverwriteConfirm(true);
      return;
    }
    executeImport();
  };

  const executeImport = () => {
    if (!previewResult) return;
    onApplyImport({
      mode: importMode,
      parts: previewResult.parts,
      transactions: previewResult.transactions,
      clearOldTransactions: importMode === 'OVERWRITE' && clearOldTxOnOverwrite
    });
    setShowOverwriteConfirm(false);
    setRawRows([]);
    setHeaders([]);
    setFileName('');
    setSheetNames([]);
    setWorkbookRef(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Upload & Template Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-emerald-400" />
              นำเข้าข้อมูลสต๊อกอะไหล่จากไฟล์ Excel (.xlsx / .xls / .csv)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              รองรับไฟล์รายงาน PR/PO แบบในรูปของคุณโดยตรง (จับคู่คอลัมน์ <span className="text-cyan-300">Short Text, PR, PO, Valuation Price, Supplier, เครื่อง, รับเข้า, จ่าย, คงเหลือ, ใบเบิก/เลขที่แจ้งซ่อม</span> อัตโนมัติ) พร้อมสร้างประวัติ Stock Card และตั้งค่า Min–Max ให้ทันที
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleDownloadTemplate('prpo')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
            >
              <Download size={14} className="text-cyan-400" />
              <span>โหลดต้นแบบ PR/PO</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownloadTemplate('minmax')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
            >
              <Download size={14} className="text-emerald-400" />
              <span>โหลดต้นแบบ Min–Max</span>
            </button>
          </div>
        </div>

        {/* File Drop/Choose Box */}
        <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-2xl p-6 text-center bg-slate-950/40 transition">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelected}
            disabled={!canEdit}
            className="hidden"
            id="inventory-excel-upload-input"
          />
          <label
            htmlFor="inventory-excel-upload-input"
            className={`inline-flex flex-col items-center gap-2 ${canEdit ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
          >
            <div className="p-3 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Upload size={24} />
            </div>
            <div className="text-sm font-bold text-white">
              {fileName ? `เลือกไฟล์แล้ว: ${fileName}` : 'คลิกเพื่อเลือกไฟล์ Excel สต๊อกอะไหล่ของคุณ'}
            </div>
            <div className="text-xs text-slate-400">
              รองรับไฟล์ .xlsx, .xls, .csv • แถวที่เว้นว่างซัพพลายเออร์ใน PO เดียวกัน ระบบเติมให้จากแถวบนอัตโนมัติ
            </div>
          </label>

          {sheetNames.length > 1 && workbookRef && (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs">
              <span className="text-slate-400 font-semibold">เลือกชีตที่ต้องการนำเข้า:</span>
              <select
                value={selectedSheet}
                onChange={(e) => loadSheetFromWorkbook(workbookRef, e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-semibold"
              >
                {sheetNames.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {errorMessage && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-semibold">
              <AlertTriangle size={14} />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Column Mapping & Import Options */}
      {rawRows.length > 0 && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            {/* Left: Column Mapping */}
            <div className="xl:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-white">1. ตรวจสอบการจับคู่คอลัมน์ (Auto-Mapped)</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    พบ {rawRows.length} แถว / {headers.length} คอลัมน์ จากไฟล์ {fileName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setColumnMap(autoDetectInventoryColumns(headers))}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-cyan-300 font-semibold cursor-pointer"
                >
                  <RefreshCw size={12} />
                  <span>จับคู่อัตโนมัติใหม่</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                {COLUMN_MAPPING_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-1">
                    <label className={`block text-[11px] font-semibold ${field.required ? 'text-cyan-300' : 'text-slate-400'}`}>
                      {field.label}
                    </label>
                    <select
                      value={columnMap[field.key]}
                      onChange={(e) => setColumnMap((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      className={`w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border text-xs ${
                        columnMap[field.key]
                          ? 'border-emerald-500/40 text-white'
                          : field.required
                          ? 'border-rose-500/50 text-rose-300'
                          : 'border-slate-800 text-slate-400'
                      }`}
                    >
                      <option value="">-- ไม่นำเข้าคอลัมน์นี้ --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Import Rules & Smart Options */}
            <div className="xl:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-extrabold text-white">2. ตั้งค่าการแปลงเป็นระบบสต๊อก Min–Max</h3>

              <div className="space-y-2.5 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fillDownSupplier}
                    onChange={(e) => setFillDownSupplier(e.target.checked)}
                    className="mt-0.5 rounded border-slate-600"
                  />
                  <div>
                    <span className="font-bold text-slate-200">เติมชื่อซัพพลายเออร์ในแถวที่เว้นว่างอัตโนมัติ (Fill-Down)</span>
                    <p className="text-[11px] text-slate-400">
                      เหมาะกับไฟล์ PO ที่มีหลายรายการแล้วใส่ชื่อซัพพลายเออร์ไว้แค่แถวแรกของ PO
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={groupSamePartName}
                    onChange={(e) => setGroupSamePartName(e.target.checked)}
                    className="mt-0.5 rounded border-slate-600"
                  />
                  <div>
                    <span className="font-bold text-slate-200">รวมอะไหล่ชื่อเดียวกันเป็น 1 รายการ (บวกยอดรวม)</span>
                    <p className="text-[11px] text-slate-400">
                      ถ้ามีหลาย PO ที่สั่งอะไหล่ตัวเดียวกัน จะรวมเป็น 1 SKU เดียวเพื่อคุม Min–Max ได้แม่นยำ
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generateStockTransactions}
                    onChange={(e) => setGenerateStockTransactions(e.target.checked)}
                    className="mt-0.5 rounded border-slate-600"
                  />
                  <div>
                    <span className="font-bold text-slate-200">สร้างประวัติรับเข้า–จ่ายออก (Stock Card) อัตโนมัติ</span>
                    <p className="text-[11px] text-slate-400">
                      แปลงคอลัมน์ รับเข้า, จ่าย, PR/PO, Requisition date และเลขที่แจ้งซ่อม ไปเก็บในแท็บประวัติ
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoMinMaxWhenMissing}
                    onChange={(e) => setAutoMinMaxWhenMissing(e.target.checked)}
                    className="mt-0.5 rounded border-slate-600"
                  />
                  <div>
                    <span className="font-bold text-slate-200">คำนวณ Min / Max ตั้งต้นอัตโนมัติ (ถ้าใน Excel ยังไม่มี)</span>
                    <p className="text-[11px] text-slate-400">
                      คำนวณตามขนาดล็อตสั่งซื้อ (สามารถแก้ไข Min–Max รายตัวภายหลังได้ตลอด)
                    </p>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Min เริ่มต้น</label>
                  <input
                    type="number"
                    min={0}
                    value={defaultMin}
                    onChange={(e) => setDefaultMin(Math.max(0, Number(e.target.value)))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Max (เท่าของ Min)</label>
                  <input
                    type="number"
                    min={1}
                    value={defaultMaxMultiplier}
                    onChange={(e) => setDefaultMaxMultiplier(Math.max(1, Number(e.target.value)))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">ตำแหน่งเก็บเริ่มต้น</label>
                  <input
                    type="text"
                    value={defaultLocation}
                    onChange={(e) => setDefaultLocation(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              {/* Merge vs Overwrite mode */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="block text-xs font-bold text-slate-300">โหมดการบันทึกเข้าฐานข้อมูล</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setImportMode('MERGE')}
                    className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                      importMode === 'MERGE'
                        ? 'bg-cyan-500/15 border-cyan-500 text-cyan-200 font-bold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div>เพิ่ม/ผสานกับของเดิม</div>
                    <div className="text-[10px] font-normal opacity-80 mt-0.5">เก็บรายการเดิมไว้และเพิ่ม/บวกยอดใหม่</div>
                  </button>
                  <button
                    type="button"
                    disabled={!canDelete}
                    onClick={() => setImportMode('OVERWRITE')}
                    className={`p-2.5 rounded-xl border text-left text-xs transition ${
                      !canDelete
                        ? 'opacity-40 cursor-not-allowed bg-slate-950 border-slate-800 text-slate-500'
                        : importMode === 'OVERWRITE'
                        ? 'bg-rose-500/15 border-rose-500 text-rose-200 font-bold cursor-pointer'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-600 cursor-pointer'
                    }`}
                  >
                    <div>แทนที่คลังเดิมทั้งหมด</div>
                    <div className="text-[10px] font-normal opacity-80 mt-0.5">ล้างรายการเก่าแล้วใช้ไฟล์นี้แทน</div>
                  </button>
                </div>

                {importMode === 'OVERWRITE' && (
                  <label className="flex items-center gap-2 text-[11px] text-amber-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={clearOldTxOnOverwrite}
                      onChange={(e) => setClearOldTxOnOverwrite(e.target.checked)}
                    />
                    <span>ล้างประวัติ Stock Card เดิมด้วย แล้วใช้เฉพาะประวัติจากไฟล์นี้</span>
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Preview Summary & Table */}
          {previewResult && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    3. ตัวอย่างข้อมูลก่อนนำเข้าจริง (Preview)
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Layers size={13} className="text-cyan-400" />
                      อะไหล่หลัก <strong className="text-white font-mono">{previewResult.parts.length}</strong> SKU (จาก {previewResult.rawRowCount} แถว)
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1">
                      <History size={13} className="text-emerald-400" />
                      ประวัติรับเข้า/จ่ายออก <strong className="text-emerald-300 font-mono">{previewResult.transactions.length}</strong> รายการ
                    </span>
                    {previewResult.filledSupplierCount > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-cyan-300">
                          เติมซัพพลายเออร์อัตโนมัติ {previewResult.filledSupplierCount} แถว
                        </span>
                      </>
                    )}
                    {previewResult.mergedDuplicateCount > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-300">
                          รวมรายการชื่อซ้ำ {previewResult.mergedDuplicateCount} แถว
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!canEdit || previewResult.parts.length === 0}
                  onClick={triggerConfirmImport}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs shadow-lg cursor-pointer transition"
                >
                  <span>ยืนยันนำเข้า {previewResult.parts.length} รายการเข้าคลัง</span>
                  <ArrowRight size={15} />
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-96 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-800/90 text-slate-300 font-bold sticky top-0">
                    <tr>
                      <th className="py-2.5 px-2.5">SKU</th>
                      <th className="py-2.5 px-3 min-w-[200px]">ชื่ออะไหล่</th>
                      <th className="py-2.5 px-2.5">หมวดหมู่</th>
                      <th className="py-2.5 px-2.5">ซัพพลายเออร์</th>
                      <th className="py-2.5 px-2.5">เครื่องจักร</th>
                      <th className="py-2.5 px-2 text-center">คงเหลือ</th>
                      <th className="py-2.5 px-2 text-center">Min / Max</th>
                      <th className="py-2.5 px-2.5 text-right">ราคา/หน่วย</th>
                      <th className="py-2.5 px-2.5 whitespace-nowrap">รับเข้าล่าสุด</th>
                      <th className="py-2.5 px-2.5 whitespace-nowrap">PO / ใบแจ้งซ่อม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-950/40">
                    {previewResult.parts.slice(0, 100).map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/40">
                        <td className="py-2 px-2.5 font-mono font-bold text-cyan-400 whitespace-nowrap">{p.id}</td>
                        <td className="py-2 px-3 font-semibold text-white">{p.name}</td>
                        <td className="py-2 px-2.5 text-slate-300 whitespace-nowrap">{p.category}</td>
                        <td className="py-2 px-2.5 text-slate-300">{p.supplier || '-'}</td>
                        <td className="py-2 px-2.5 text-slate-300">{p.machineIds.join(', ') || '-'}</td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-white">
                          {p.quantity} <span className="text-slate-400 font-normal">{p.unit}</span>
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-amber-300">
                          {p.minRequired} / {p.maxStock ?? '-'}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono text-slate-200">
                          {p.pricePerUnit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-2.5 font-mono text-slate-300 whitespace-nowrap">
                          {formatThaiShortDate(p.lastReceiveDate)}
                        </td>
                        <td className="py-2 px-2.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {[p.lastPONo ? `PO:${p.lastPONo}` : '', p.lastWorkRequestNo ? `WR:${p.lastWorkRequestNo}` : '']
                            .filter(Boolean)
                            .join(' · ') || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewResult.parts.length > 100 && (
                <p className="text-[11px] text-slate-400 text-right">
                  แสดงตัวอย่าง 100 รายการแรก จากทั้งหมด {previewResult.parts.length} รายการ
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Overwrite Confirmation Modal */}
      {showOverwriteConfirm && previewResult && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1222] border border-rose-500/50 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle size={20} />
              <h3 className="text-base font-extrabold text-white">ยืนยันแทนที่ข้อมูลสต๊อกทั้งหมด</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              โหมด <strong className="text-rose-300">แทนที่คลังเดิมทั้งหมด</strong> จะลบรายการอะไหล่เดิม ({existingParts.length} รายการ) และแทนที่ด้วยข้อมูลจากไฟล์ Excel ({previewResult.parts.length} รายการ) ดำเนินการต่อหรือไม่?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowOverwriteConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={executeImport}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold cursor-pointer"
              >
                ยืนยันแทนที่ทั้งหมด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
