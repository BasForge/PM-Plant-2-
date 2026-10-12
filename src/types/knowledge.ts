export type KnowledgeType = 'MANUAL' | 'WI' | 'TROUBLESHOOTING' | 'WHY_WHY' | 'KAIZEN' | 'OPL' | 'FA' | 'MP_INFO' | 'CD5';

export interface ManualData {
  docCode: string;
  revision: string;
  category: 'Operation Manual' | 'Maintenance Manual' | 'Electrical Diagram' | 'Pneumatic Diagram' | 'Spare Parts Catalog' | 'Safety Standard';
  fileName: string;
  fileSize?: string;
  fileType: 'pdf' | 'excel' | 'image' | 'link';
  fileContent?: string; // Base64 or sample identifier
  externalUrl?: string;
  summary: string;
  manufacturer?: string;
  modelNumber?: string;
}

export interface WIStepItem {
  stepNo: number;
  title: string;
  description: string;
  standard?: string;
  caution?: string;
  estimatedMins?: number;
  imageUrl?: string;
}

export interface WIData {
  docCode: string;
  revision: string;
  effectiveDate: string;
  department: string;
  targetAudience: string;
  safetyAlerts: string[];
  toolsRequired: string[];
  ppeRequired: string[];
  steps: WIStepItem[];
  precautions: string;
  sopDocumentRef?: string;
}

export interface TroubleshootingProbableCause {
  id: string;
  cause: string;
  probability: 'สูง (High)' | 'ปานกลาง (Medium)' | 'ต่ำ (Low)';
  checkMethod: string;
  solution: string;
  sparePartNeeded?: string;
  estimatedFixTimeMins?: number;
}

export interface TroubleshootingData {
  symptom: string;
  subsystem: 'เครื่องกล (Mechanical)' | 'ระบบไฟฟ้า (Electrical)' | 'ระบบลม (Pneumatic)' | 'เซนเซอร์ & คอนโทรล (Control/Sensor)' | 'ความร้อน & ซีล (Thermal/Sealing)' | 'ระบบสุญญากาศ (Vacuum)';
  urgency: 'วิกฤตไลน์หยุด (Critical)' | 'เร่งด่วน (Urgent)' | 'ทั่วไป (Normal)';
  probableCauses: TroubleshootingProbableCause[];
  requiredTools: string[];
  safetyNotes: string;
  quickChecklist: string[];
}

export interface KnowledgeWhyWhyData {
  problemStatement: string;
  phenomenon: string;
  why1: string;
  why2: string;
  why3: string;
  why4: string;
  why5: string;
  rootCauseSummary: string;
  countermeasure: string;
  standardizationRef?: string;
  effectivenessVerification?: string;
  sourceRepairId?: string;
  sourceWorkOrderId?: string;
}

export interface KnowledgeItem {
  id: string;
  type: KnowledgeType;
  title: string;
  machineId: string;
  machineName: string;
  lineGroup?: string;
  tags: string[];
  author: string;
  createdAt: string;
  updatedAt: string;
  viewCount?: number;
  isVerified?: boolean;
  
  // Specific payload by type
  manualData?: ManualData;
  wiData?: WIData;
  troubleshootingData?: TroubleshootingData;
  whyWhyData?: KnowledgeWhyWhyData;

  // Synced metadata from Improvement / Kaizen / CD5
  sourceCategory?: 'KAIZEN' | 'OPL' | 'FA' | 'WHY_WHY' | 'MP_INFO' | 'CD5';
  sourceImprovementId?: string;
  sourceCd5Id?: string;
  costSavings?: number;
  description?: string;
  photoBefore?: string;
  photoAfter?: string;
  pdfFilesCount?: number;
  fileName?: string;
  fileContent?: string;
}
