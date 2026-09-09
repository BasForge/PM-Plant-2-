import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  WorkRequest, 
  WorkRequestPriority, 
  WorkRequestStatus, 
  EngineeringResponse,
  RepairLog 
} from '../types';
import { 
  notifyWorkRequestSubmitted, 
  notifyEngineeringResponse, 
  notifyWorkRequestCompleted, 
  notifyWorkRequestAccepted 
} from '../utils/lineNotify';
import { 
  BellRing, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  Wrench, 
  User, 
  Phone, 
  Building, 
  Camera, 
  Search, 
  Filter, 
  Plus, 
  Printer, 
  Download, 
  RefreshCw, 
  Star, 
  MessageSquare, 
  ArrowRight, 
  FileText, 
  Check, 
  X, 
  SlidersHorizontal,
  Package,
  CalendarCheck,
  Timer,
  ChevronRight,
  ShieldAlert,
  Send,
  ExternalLink,
  Edit,
  Trash2,
  MapPin
} from 'lucide-react';

export const WorkRequestPage: React.FC = () => {
  const { 
    workRequests, 
    machines, 
    technicians, 
    currentUser, 
    isAdmin, 
    isTechnician, 
    isProduction,
    addWorkRequest, 
    updateWorkRequest, 
    deleteWorkRequest, 
    respondToWorkRequest, 
    completeWorkRequest, 
    acceptWorkRequestHandover,
    setRepairs,
    syncWithFirebaseNow,
    firebaseStatus,
    lastFirebaseSync
  } = useApp();

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ทั้งหมด');
  const [priorityFilter, setPriorityFilter] = useState<string>('ทั้งหมด');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ทั้งหมด');

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<WorkRequest | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<WorkRequest | null>(null);

  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState<WorkRequest | null>(null);

  // Quick toast feedback message
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // --- Form States for New Request (Production) ---
  const [newMachineMode, setNewMachineMode] = useState<'select' | 'custom'>('select');
  const [newMachineId, setNewMachineId] = useState('');
  const [newCustomMachineId, setNewCustomMachineId] = useState('');
  const [newCustomMachineName, setNewCustomMachineName] = useState('');
  const [newCustomLineGroup, setNewCustomLineGroup] = useState('');
  const [newLocationPoint, setNewLocationPoint] = useState('');
  const [newPriority, setNewPriority] = useState<WorkRequestPriority>('ฉุกเฉินไลน์หยุด');
  const [newProblemTitle, setNewProblemTitle] = useState('');
  const [newProblemDetails, setNewProblemDetails] = useState('');
  const [newProductionDept, setNewProductionDept] = useState(currentUser?.department || 'ฝ่ายผลิตอาหารพร้อมทาน (กะเช้า)');
  const [newRequesterName, setNewRequesterName] = useState(currentUser?.name || 'หัวหน้าไลน์ผลิต');
  const [newRequesterPhone, setNewRequesterPhone] = useState(currentUser?.phone || '');
  const [newPhotoUrl, setNewPhotoUrl] = useState<string | undefined>(undefined);
  const [notifyLineOnSubmit, setNotifyLineOnSubmit] = useState(true);

  // --- Form States for Edit Request ---
  const [editMachineMode, setEditMachineMode] = useState<'select' | 'custom'>('select');
  const [editMachineId, setEditMachineId] = useState('');
  const [editMachineName, setEditMachineName] = useState('');
  const [editLineGroup, setEditLineGroup] = useState('');
  const [editLocationPoint, setEditLocationPoint] = useState('');
  const [editPriority, setEditPriority] = useState<WorkRequestPriority>('ปกติ');
  const [editStatus, setEditStatus] = useState<WorkRequestStatus>('รอตอบรับ');
  const [editProblemTitle, setEditProblemTitle] = useState('');
  const [editProblemDetails, setEditProblemDetails] = useState('');
  const [editProductionDept, setEditProductionDept] = useState('');
  const [editRequesterName, setEditRequesterName] = useState('');
  const [editRequesterPhone, setEditRequesterPhone] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState<string | undefined>(undefined);

  // Engineering edit fields
  const [editTargetStartDate, setEditTargetStartDate] = useState('');
  const [editTargetStartTime, setEditTargetStartTime] = useState('');
  const [editTargetFinishDate, setEditTargetFinishDate] = useState('');
  const [editTargetFinishTime, setEditTargetFinishTime] = useState('');
  const [editEstimatedDuration, setEditEstimatedDuration] = useState(60);
  const [editActionPlan, setEditActionPlan] = useState('');
  const [editAssignedTechs, setEditAssignedTechs] = useState<string[]>([]);
  const [editSparePartStatus, setEditSparePartStatus] = useState<'มีอะไหล่พร้อมในคลัง' | 'เบิกอะไหล่ด่วน' | 'สั่งซื้อรออะไหล่' | 'ไม่ต้องใช้อะไหล่'>('มีอะไหล่พร้อมในคลัง');
  const [editSparePartNotes, setEditSparePartNotes] = useState('');
  const [editMessageToProd, setEditMessageToProd] = useState('');

  // --- Form States for Engineering Response ---
  const [respTargetStartDate, setRespTargetStartDate] = useState('');
  const [respTargetStartTime, setRespTargetStartTime] = useState('08:30');
  const [respTargetFinishDate, setRespTargetFinishDate] = useState('');
  const [respTargetFinishTime, setRespTargetFinishTime] = useState('11:30');
  const [respEstimatedDuration, setRespEstimatedDuration] = useState(180);
  const [respActionPlan, setRespActionPlan] = useState('');
  const [respAssignedTechs, setRespAssignedTechs] = useState<string[]>([]);
  const [respSparePartStatus, setRespSparePartStatus] = useState<'มีอะไหล่พร้อมในคลัง' | 'เบิกอะไหล่ด่วน' | 'สั่งซื้อรออะไหล่' | 'ไม่ต้องใช้อะไหล่'>('มีอะไหล่พร้อมในคลัง');
  const [respSparePartNotes, setRespSparePartNotes] = useState('');
  const [respCoordinationNotes, setRespCoordinationNotes] = useState('');
  const [respMessageToProd, setRespMessageToProd] = useState('');
  const [respStatus, setRespStatus] = useState<WorkRequestStatus>('ตอบรับแล้ว/มีแผนงาน');
  const [notifyLineOnRespond, setNotifyLineOnRespond] = useState(true);

  // --- Form States for Completion ---
  const [compActualDuration, setCompActualDuration] = useState(60);
  const [compSummaryNotes, setCompSummaryNotes] = useState('');

  // --- Form States for Handover / Acceptance ---
  const [handoverAcceptedBy, setHandoverAcceptedBy] = useState(currentUser?.name || '');
  const [handoverNotes, setHandoverNotes] = useState('ทดสอบเดินเครื่อง 15 นาที อุณหภูมิและความเร็วได้ตามมาตรฐาน ไม่พบสิ่งผิดปกติ');
  const [handoverRating, setHandoverRating] = useState(5);

  // Helper to find machine name
  const getMachineInfo = (machineId: string) => {
    return machines.find(m => m.id === machineId);
  };

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return workRequests.filter(req => {
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchId = req.id.toLowerCase().includes(query);
        const matchMachine = req.machineId.toLowerCase().includes(query) || (req.machineName && req.machineName.toLowerCase().includes(query));
        const matchTitle = req.problemTitle.toLowerCase().includes(query);
        const matchDetails = req.problemDetails.toLowerCase().includes(query);
        const matchRequester = req.requesterName.toLowerCase().includes(query);
        const matchDept = req.productionDepartment.toLowerCase().includes(query);
        if (!matchId && !matchMachine && !matchTitle && !matchDetails && !matchRequester && !matchDept) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'ทั้งหมด' && req.status !== statusFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== 'ทั้งหมด' && req.priority !== priorityFilter) {
        return false;
      }

      // Department filter
      if (departmentFilter !== 'ทั้งหมด' && req.productionDepartment !== departmentFilter) {
        return false;
      }

      return true;
    });
  }, [workRequests, searchTerm, statusFilter, priorityFilter, departmentFilter]);

  // Counts for top cards
  const stats = useMemo(() => {
    const total = workRequests.length;
    const pending = workRequests.filter(r => r.status === 'รอตอบรับ').length;
    const acknowledged = workRequests.filter(r => r.status === 'ตอบรับแล้ว/มีแผนงาน').length;
    const inProgress = workRequests.filter(r => r.status === 'กำลังดำเนินการซ่อม').length;
    const waitingParts = workRequests.filter(r => r.status === 'รออะไหล่/สั่งของ').length;
    const completedWaitHandover = workRequests.filter(r => r.status === 'ซ่อมเสร็จ/รอฝ่ายผลิตตรวจรับ').length;
    const closed = workRequests.filter(r => r.status === 'ปิดงานสมบูรณ์').length;
    const emergency = workRequests.filter(r => r.priority === 'ฉุกเฉินไลน์หยุด' && r.status !== 'ปิดงานสมบูรณ์').length;

    return { total, pending, acknowledged, inProgress, waitingParts, completedWaitHandover, closed, emergency };
  }, [workRequests]);

  // Open Response Modal with prefilled values
  const handleOpenResponseModal = (req: WorkRequest) => {
    setActiveRequest(req);
    const today = new Date().toISOString().split('T')[0];
    const existing = req.engineeringResponse;

    setRespTargetStartDate(existing?.targetStartDate || today);
    setRespTargetStartTime(existing?.targetStartTime || '09:00');
    setRespTargetFinishDate(existing?.targetFinishDate || today);
    setRespTargetFinishTime(existing?.targetFinishTime || '12:00');
    setRespEstimatedDuration(existing?.estimatedDurationMins || 120);
    setRespActionPlan(existing?.actionPlan || `1. เข้าตรวจสอบอาการ ${req.problemTitle}\n2. ตรวจเช็คระบบกลไกและสัญญาณเซนเซอร์\n3. ปรับตั้งค่าและทดสอบการทำงาน`);
    setRespAssignedTechs(existing?.assignedTechnicians || (technicians.length > 0 ? [technicians[0]] : []));
    setRespSparePartStatus(existing?.sparePartStatus || 'มีอะไหล่พร้อมในคลัง');
    setRespSparePartNotes(existing?.sparePartNotes || '');
    setRespCoordinationNotes(existing?.productionCoordinationNotes || 'ประสานงานหัวหน้าไลน์เพื่อหยุดเครื่องช่วงสลับกะ/พักเบรก');
    setRespMessageToProd(existing?.messageToProduction || `รับทราบปัญหาแล้วครับ ทีมช่างกำลังเตรียมเครื่องมือและจะเข้าซ่อมตามเวลาที่กำหนดครับ`);
    setRespStatus(req.status === 'รอตอบรับ' ? 'ตอบรับแล้ว/มีแผนงาน' : req.status);

    setIsResponseModalOpen(true);
  };

  // Open Completion Modal
  const handleOpenCompleteModal = (req: WorkRequest) => {
    setActiveRequest(req);
    setCompActualDuration(req.engineeringResponse?.estimatedDurationMins || 60);
    setCompSummaryNotes(`ดำเนินการแก้ไขปัญหา ${req.problemTitle} เรียบร้อยแล้ว ชิ้นส่วนทำงานได้ตามปกติ ทดสอบรันเครื่องเบื้องต้นผ่านเกณฑ์`);
    setIsCompleteModalOpen(true);
  };

  // Open Handover Modal
  const handleOpenHandoverModal = (req: WorkRequest) => {
    setActiveRequest(req);
    setHandoverAcceptedBy(currentUser?.name || req.requesterName);
    setHandoverNotes('ฝ่ายผลิตร่วมทดสอบเดินเครื่องกับช่าง ไม่พบอาการเดิม เครื่องทำงานได้ราบรื่นตามมาตรฐาน');
    setHandoverRating(5);
    setIsHandoverModalOpen(true);
  };

  // Submit New Request
  const handleSubmitNewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalMachineId = '';
    let finalMachineName = '';
    let finalLineGroup = '';
    const isCustom = newMachineMode === 'custom';

    if (newMachineMode === 'select') {
      if (!newMachineId) {
        alert('กรุณาเลือกรหัสเครื่องจักรจากฐานข้อมูล หรือสลับเป็นพิมพ์ระบุจุดเอง');
        return;
      }
      finalMachineId = newMachineId;
      const mach = getMachineInfo(newMachineId);
      finalMachineName = mach ? `${mach.name} ${mach.model ? `(${mach.model})` : ''}` : newMachineId;
      finalLineGroup = mach?.lineGroup || mach?.department || newProductionDept || 'สายการผลิต';
    } else {
      if (!newCustomMachineId.trim()) {
        alert('กรุณาระบุรหัสเครื่องจักร หรือ จุดที่ต้องการแจ้งซ่อม');
        return;
      }
      finalMachineId = newCustomMachineId.trim();
      finalMachineName = newCustomMachineName.trim() || finalMachineId;
      finalLineGroup = newCustomLineGroup.trim() || newProductionDept || 'สายการผลิต';
    }

    if (!newProblemTitle.trim()) {
      alert('กรุณาระบุหัวข้อปัญหา');
      return;
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const created = addWorkRequest({
      requestDate: dateStr,
      requestTime: timeStr,
      machineId: finalMachineId,
      machineName: finalMachineName,
      lineGroup: finalLineGroup,
      locationPoint: newLocationPoint.trim(),
      isCustomLocation: isCustom,
      priority: newPriority,
      problemTitle: newProblemTitle.trim(),
      problemDetails: newProblemDetails.trim() || newProblemTitle.trim(),
      productionDepartment: newProductionDept.trim(),
      requesterName: newRequesterName.trim() || (currentUser?.name || 'หัวหน้ากะผลิต'),
      requesterPhone: newRequesterPhone.trim(),
      photoUrl: newPhotoUrl
    });

    if (notifyLineOnSubmit) {
      notifyWorkRequestSubmitted(created);
    }

    showToast(`✅ ส่งใบแจ้งซ่อม ${created.id} เรียบร้อยแล้ว! ระบบกำลังส่งต่อให้ฝ่ายวิศวกรรม`);
    setIsNewModalOpen(false);

    // Reset fields
    setNewMachineMode('select');
    setNewMachineId('');
    setNewCustomMachineId('');
    setNewCustomMachineName('');
    setNewCustomLineGroup('');
    setNewLocationPoint('');
    setNewProblemTitle('');
    setNewProblemDetails('');
    setNewPhotoUrl(undefined);
  };

  // Submit Engineering Response
  const handleSubmitResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequest) return;

    if (!respTargetFinishDate || !respTargetFinishTime) {
      alert('กรุณาระบุวันที่และเวลาที่คาดว่าจะแล้วเสร็จ');
      return;
    }
    if (!respActionPlan.trim()) {
      alert('กรุณาระบุแผนงานและขั้นตอนวิธีการซ่อม');
      return;
    }

    const now = new Date();
    const respondedAtStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const responsePayload: EngineeringResponse = {
      respondedAt: respondedAtStr,
      respondedBy: currentUser?.name || 'ทีมวิศวกรรมซ่อมบำรุง',
      targetStartDate: respTargetStartDate,
      targetStartTime: respTargetStartTime,
      targetFinishDate: respTargetFinishDate,
      targetFinishTime: respTargetFinishTime,
      estimatedDurationMins: Number(respEstimatedDuration) || 60,
      actionPlan: respActionPlan.trim(),
      assignedTechnicians: respAssignedTechs,
      sparePartStatus: respSparePartStatus,
      sparePartNotes: respSparePartNotes.trim(),
      productionCoordinationNotes: respCoordinationNotes.trim(),
      messageToProduction: respMessageToProd.trim()
    };

    respondToWorkRequest(activeRequest.id, responsePayload, respStatus);

    if (notifyLineOnRespond) {
      notifyEngineeringResponse({
        ...activeRequest,
        engineeringResponse: responsePayload
      });
    }

    showToast(`🛠️ ตอบรับงานซ่อม ${activeRequest.id} และกำหนดวันแล้วเสร็จเรียบร้อย!`);
    setIsResponseModalOpen(false);
  };

  // Submit Completion
  const handleSubmitComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequest) return;

    completeWorkRequest(activeRequest.id, {
      actualDurationMins: Number(compActualDuration) || 60,
      repairSummaryNotes: compSummaryNotes.trim()
    });

    notifyWorkRequestCompleted({
      ...activeRequest,
      engineeringResponse: {
        ...(activeRequest.engineeringResponse as any),
        actualDurationMins: Number(compActualDuration),
        repairSummaryNotes: compSummaryNotes.trim()
      }
    });

    showToast(`✅ บันทึกช่างซ่อมเสร็จแล้ว แจ้งเตือนฝ่ายผลิตร่วมตรวจรับงาน`);
    setIsCompleteModalOpen(false);
  };

  // Submit Handover Acceptance
  const handleSubmitHandover = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequest) return;

    acceptWorkRequestHandover(activeRequest.id, {
      acceptedBy: handoverAcceptedBy.trim() || 'ฝ่ายผลิต',
      handoverNotes: handoverNotes.trim(),
      satisfactionRating: handoverRating
    });

    notifyWorkRequestAccepted({
      ...activeRequest,
      status: 'ปิดงานสมบูรณ์',
      acceptedBy: handoverAcceptedBy.trim(),
      handoverNotes: handoverNotes.trim(),
      satisfactionRating: handoverRating
    });

    showToast(`🎉 ตรวจรับมอบงาน ${activeRequest.id} สำเร็จ! ปิดงานเรียบร้อย`);
    setIsHandoverModalOpen(false);
  };

  // Open Edit Modal
  const handleOpenEditModal = (req: WorkRequest) => {
    setEditingRequest(req);
    const isCustom = req.isCustomLocation || !machines.some(m => m.id === req.machineId);
    setEditMachineMode(isCustom ? 'custom' : 'select');
    setEditMachineId(req.machineId);
    setEditMachineName(req.machineName || '');
    setEditLineGroup(req.lineGroup || '');
    setEditLocationPoint(req.locationPoint || '');
    setEditPriority(req.priority);
    setEditStatus(req.status);
    setEditProblemTitle(req.problemTitle);
    setEditProblemDetails(req.problemDetails);
    setEditProductionDept(req.productionDepartment || '');
    setEditRequesterName(req.requesterName || '');
    setEditRequesterPhone(req.requesterPhone || '');
    setEditPhotoUrl(req.photoUrl);

    if (req.engineeringResponse) {
      setEditTargetStartDate(req.engineeringResponse.targetStartDate || '');
      setEditTargetStartTime(req.engineeringResponse.targetStartTime || '');
      setEditTargetFinishDate(req.engineeringResponse.targetFinishDate || '');
      setEditTargetFinishTime(req.engineeringResponse.targetFinishTime || '');
      setEditEstimatedDuration(req.engineeringResponse.estimatedDurationMins || 60);
      setEditActionPlan(req.engineeringResponse.actionPlan || '');
      setEditAssignedTechs(req.engineeringResponse.assignedTechnicians || []);
      setEditSparePartStatus(req.engineeringResponse.sparePartStatus || 'มีอะไหล่พร้อมในคลัง');
      setEditSparePartNotes(req.engineeringResponse.sparePartNotes || '');
      setEditMessageToProd(req.engineeringResponse.messageToProduction || '');
    } else {
      setEditTargetStartDate('');
      setEditTargetStartTime('');
      setEditTargetFinishDate('');
      setEditTargetFinishTime('');
      setEditEstimatedDuration(60);
      setEditActionPlan('');
      setEditAssignedTechs([]);
      setEditSparePartStatus('มีอะไหล่พร้อมในคลัง');
      setEditSparePartNotes('');
      setEditMessageToProd('');
    }

    setIsEditModalOpen(true);
  };

  // Submit Edit
  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequest) return;

    const finalMachineId = editMachineId.trim();
    if (!finalMachineId) {
      alert('กรุณาระบุรหัสเครื่องจักร หรือ จุดที่ต้องการแจ้งซ่อม');
      return;
    }
    if (!editProblemTitle.trim()) {
      alert('กรุณาระบุหัวข้อปัญหา');
      return;
    }

    let finalMachineName = editMachineName.trim();
    let finalLineGroup = editLineGroup.trim();

    if (editMachineMode === 'select') {
      const mach = getMachineInfo(finalMachineId);
      if (mach) {
        finalMachineName = `${mach.name} ${mach.model ? `(${mach.model})` : ''}`.trim();
        if (!finalLineGroup) finalLineGroup = mach.lineGroup || mach.department || '';
      }
    }

    let updatedResponse = editingRequest.engineeringResponse;
    if (updatedResponse || editTargetFinishDate || editActionPlan.trim()) {
      updatedResponse = {
        ...(updatedResponse || {
          respondedAt: new Date().toLocaleTimeString('th-TH'),
          respondedBy: currentUser?.name || 'ทีมวิศวกรรม'
        }),
        targetStartDate: editTargetStartDate,
        targetStartTime: editTargetStartTime,
        targetFinishDate: editTargetFinishDate,
        targetFinishTime: editTargetFinishTime,
        estimatedDurationMins: Number(editEstimatedDuration) || 60,
        actionPlan: editActionPlan.trim(),
        assignedTechnicians: editAssignedTechs,
        sparePartStatus: editSparePartStatus,
        sparePartNotes: editSparePartNotes.trim(),
        messageToProduction: editMessageToProd.trim()
      };
    }

    const updatedData: Partial<WorkRequest> = {
      machineId: finalMachineId,
      machineName: finalMachineName || finalMachineId,
      lineGroup: finalLineGroup,
      locationPoint: editLocationPoint.trim(),
      isCustomLocation: editMachineMode === 'custom',
      priority: editPriority,
      status: editStatus,
      problemTitle: editProblemTitle.trim(),
      problemDetails: editProblemDetails.trim() || editProblemTitle.trim(),
      productionDepartment: editProductionDept.trim(),
      requesterName: editRequesterName.trim(),
      requesterPhone: editRequesterPhone.trim(),
      photoUrl: editPhotoUrl,
      engineeringResponse: updatedResponse
    };

    updateWorkRequest(editingRequest.id, updatedData);

    showToast(`✅ บันทึกการแก้ไขใบแจ้งซ่อม ${editingRequest.id} สำเร็จเรียบร้อย`);
    setIsEditModalOpen(false);

    if (activeRequest?.id === editingRequest.id) {
      setActiveRequest({
        ...activeRequest,
        ...updatedData
      });
    }
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (req: WorkRequest) => {
    setRequestToDelete(req);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!requestToDelete) return;
    const targetId = requestToDelete.id;
    deleteWorkRequest(targetId);
    showToast(`🗑️ ลบใบแจ้งซ่อม ${targetId} สำเร็จเรียบร้อย`);
    setIsDeleteModalOpen(false);
    if (activeRequest?.id === targetId) {
      setIsDetailModalOpen(false);
      setActiveRequest(null);
    }
    setRequestToDelete(null);
  };

  // Photo upload handler for editing
  const handleEditPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1024;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.75);
          setEditPhotoUrl(compressed);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Convert Work Request to Repair Log
  const handleConvertToRepairLog = (req: WorkRequest) => {
    const today = req.requestDate || new Date().toISOString().split('T')[0];
    const techName = req.engineeringResponse?.assignedTechnicians?.[0] || technicians[0] || 'ช่าง 1';
    
    const newLog: RepairLog = {
      id: `rep-req-${req.id.toLowerCase()}`,
      type: 'Repair',
      technician: techName,
      technicians: req.engineeringResponse?.assignedTechnicians || [techName],
      date: today,
      machineId: req.machineId,
      breakdownTime: `${today}T${req.requestTime || '08:00'}`,
      repairDoneTime: `${today}T${req.engineeringResponse?.targetFinishTime || '11:00'}`,
      symptoms: `${req.problemTitle} - ${req.problemDetails}`,
      why1: req.problemTitle,
      why2: 'ชิ้นส่วนสึกหรอหรือการปรับตั้งค่าคลาดเคลื่อนจากการใช้งาน',
      why3: '',
      why4: '',
      why5: '',
      correctiveAction: req.engineeringResponse?.repairSummaryNotes || req.engineeringResponse?.actionPlan || 'ดำเนินการตรวจซ่อม ปรับตั้งค่า และทดสอบเดินเครื่องตามมาตรฐาน',
      duration: req.engineeringResponse?.actualDurationMins || req.engineeringResponse?.estimatedDurationMins || 60,
      status: req.status === 'ปิดงานสมบูรณ์' ? 'ปิดงาน' : 'กำลังซ่อม'
    };

    setRepairs(prev => [newLog, ...prev]);
    updateWorkRequest(req.id, { linkedRepairLogId: newLog.id });
    showToast(`📋 แปลงเป็นประวัติซ่อมบำรุงในระบบเรียบร้อย (รหัส: ${newLog.id})`);
  };

  // Photo upload handler with image compression to avoid giant payloads
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1024;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.75);
          setNewPhotoUrl(compressed);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredRequests.length === 0) {
      alert('ไม่มีข้อมูลสำหรับส่งออก');
      return;
    }

    const headers = [
      'เลขที่ใบแจ้ง', 'วันที่แจ้ง', 'เวลาที่แจ้ง', 'รหัสเครื่องจักร', 'ชื่อเครื่องจักร',
      'ไลน์ผลิต/แผนก', 'ระดับความเร่งด่วน', 'หัวข้อปัญหา', 'สถานะ',
      'ผู้แจ้งซ่อม', 'เบอร์ติดต่อ', 'วิศวกรผู้ตอบรับ', 'วันเวลาเริ่มซ่อม', 'คาดว่าจะเสร็จ',
      'เวลาประเมิน(นาที)', 'แผนงานการซ่อม', 'ช่างผู้รับผิดชอบ', 'สถานะอะไหล่',
      'เวลาซ่อมจริง(นาที)', 'ผู้ตรวจรับ', 'คะแนนประเมิน'
    ];

    const rows = filteredRequests.map(r => [
      `"${r.id}"`,
      `"${r.requestDate}"`,
      `"${r.requestTime}"`,
      `"${r.machineId}"`,
      `"${(r.machineName || '').replace(/"/g, '""')}"`,
      `"${(r.lineGroup || '').replace(/"/g, '""')}"`,
      `"${r.priority}"`,
      `"${r.problemTitle.replace(/"/g, '""')}"`,
      `"${r.status}"`,
      `"${r.requesterName}"`,
      `"${r.requesterPhone || ''}"`,
      `"${r.engineeringResponse?.respondedBy || ''}"`,
      `"${r.engineeringResponse?.targetStartDate ? `${r.engineeringResponse.targetStartDate} ${r.engineeringResponse.targetStartTime}` : ''}"`,
      `"${r.engineeringResponse?.targetFinishDate ? `${r.engineeringResponse.targetFinishDate} ${r.engineeringResponse.targetFinishTime}` : ''}"`,
      `"${r.engineeringResponse?.estimatedDurationMins || ''}"`,
      `"${(r.engineeringResponse?.actionPlan || '').replace(/"/g, '""')}"`,
      `"${(r.engineeringResponse?.assignedTechnicians || []).join(', ')}"`,
      `"${r.engineeringResponse?.sparePartStatus || ''}"`,
      `"${r.engineeringResponse?.actualDurationMins || ''}"`,
      `"${r.acceptedBy || ''}"`,
      `"${r.satisfactionRating || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `work_requests_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper styling for Priority Badge
  const renderPriorityBadge = (priority: WorkRequestPriority) => {
    switch (priority) {
      case 'ฉุกเฉินไลน์หยุด':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            ฉุกเฉินไลน์หยุด
          </span>
        );
      case 'เร่งด่วน':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            เร่งด่วน
          </span>
        );
      case 'ปกติ':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            ปกติ
          </span>
        );
      case 'ตามแผนนัดหมาย':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
            <Calendar className="w-3.5 h-3.5 text-purple-600" />
            ตามแผนนัดหมาย
          </span>
        );
    }
  };

  // Helper styling for Status Badge
  const renderStatusBadge = (status: WorkRequestStatus) => {
    switch (status) {
      case 'รอตอบรับ':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-xs">
            <Clock className="w-3 h-3 animate-spin" />
            รอวิศวกรรมตอบรับ
          </span>
        );
      case 'ตอบรับแล้ว/มีแผนงาน':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
            <CalendarCheck className="w-3 h-3" />
            ตอบรับแล้ว/มีแผนเสร็จ
          </span>
        );
      case 'กำลังดำเนินการซ่อม':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-xs">
            <Wrench className="w-3 h-3 animate-bounce" />
            กำลังซ่อมบำรุง
          </span>
        );
      case 'รออะไหล่/สั่งของ':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-300">
            <Package className="w-3 h-3 text-orange-600" />
            รออะไหล่/สั่งซื้อ
          </span>
        );
      case 'ซ่อมเสร็จ/รอฝ่ายผลิตตรวจรับ':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-600 text-white shadow-xs animate-pulse">
            <CheckCircle2 className="w-3 h-3" />
            ซ่อมเสร็จ/รอตรวจรับ
          </span>
        );
      case 'ปิดงานสมบูรณ์':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <Check className="w-3 h-3 text-emerald-600" />
            ปิดงานสมบูรณ์
          </span>
        );
      case 'ยกเลิก/ปฏิเสธ':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200">
            <X className="w-3 h-3" />
            ยกเลิก/ปฏิเสธ
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl border border-slate-700 text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 text-xs font-semibold tracking-wider text-slate-500 uppercase mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                <BellRing className="w-3 h-3 text-blue-600" />
                Work Order & Request SLA
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-600">
                <Building className="w-3 h-3 text-slate-400" />
                ระบบแจ้งซ่อมฝ่ายผลิต และตอบรับวันแล้วเสร็จโดยวิศวกรรม
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              ระบบรับแจ้งซ่อมและกำหนดวันแล้วเสร็จ (Production & Engineering)
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-3xl">
              ฝ่ายผลิตแจ้งอาการเสียและเครื่องจักรหยุดชะงัก — วิศวกรรมตอบกลับแผนงาน กำหนดวันที่และเวลาที่จะแล้วเสร็จอย่างชัดเจน พร้อมระบบตรวจรับมอบงานและแจ้งเตือนผ่าน LINE ทันที
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              + แจ้งซ่อมใหม่ (ฝ่ายผลิต)
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 rounded-xl text-sm font-medium border border-slate-300 shadow-xs transition-colors"
              title="ส่งออกไฟล์ Excel/CSV"
            >
              <Download className="w-4 h-4 text-slate-500" />
              ส่งออก CSV
            </button>
            <button
              onClick={syncWithFirebaseNow}
              disabled={firebaseStatus === 'syncing'}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-medium border border-slate-300 shadow-xs transition-colors disabled:opacity-50"
              title="ซิงค์ข้อมูลกับคลาวด์"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 ${firebaseStatus === 'syncing' ? 'animate-spin' : ''}`} />
              {firebaseStatus === 'syncing' ? 'กำลังซิงค์...' : 'รีเฟรช'}
            </button>
          </div>
        </div>

        {/* Status Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div 
            onClick={() => setStatusFilter('ทั้งหมด')}
            className={`cursor-pointer p-3.5 rounded-xl border transition-all ${statusFilter === 'ทั้งหมด' ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20' : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'}`}
          >
            <div className="text-xs font-medium text-slate-500">ใบแจ้งซ่อมทั้งหมด</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">ทุกสถานะในระบบ</div>
          </div>

          <div 
            onClick={() => setStatusFilter('รอตอบรับ')}
            className={`cursor-pointer p-3.5 rounded-xl border transition-all ${statusFilter === 'รอตอบรับ' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20' : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-700">รอตอบรับงาน</span>
              {stats.emergency > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                  {stats.emergency} ฉุกเฉิน
                </span>
              )}
            </div>
            <div className="text-2xl font-bold text-amber-900 mt-1">{stats.pending}</div>
            <div className="text-[11px] text-amber-600 mt-0.5">รอวิศวกรรมระบุวันเสร็จ</div>
          </div>

          <div 
            onClick={() => setStatusFilter('ตอบรับแล้ว/มีแผนงาน')}
            className={`cursor-pointer p-3.5 rounded-xl border transition-all ${statusFilter === 'ตอบรับแล้ว/มีแผนงาน' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20' : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'}`}
          >
            <div className="text-xs font-medium text-emerald-700">มีแผนงานแล้ว</div>
            <div className="text-2xl font-bold text-emerald-900 mt-1">{stats.acknowledged}</div>
            <div className="text-[11px] text-emerald-600 mt-0.5">ระบุเวลาเสร็จชัดเจน</div>
          </div>

          <div 
            onClick={() => setStatusFilter('กำลังดำเนินการซ่อม')}
            className={`cursor-pointer p-3.5 rounded-xl border transition-all ${statusFilter === 'กำลังดำเนินการซ่อม' ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20' : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'}`}
          >
            <div className="text-xs font-medium text-indigo-700">กำลังซ่อมแซม</div>
            <div className="text-2xl font-bold text-indigo-900 mt-1">{stats.inProgress}</div>
            <div className="text-[11px] text-indigo-600 mt-0.5">ทีมช่างกำลังปฏิบัติงาน</div>
          </div>

          <div 
            onClick={() => setStatusFilter('ซ่อมเสร็จ/รอฝ่ายผลิตตรวจรับ')}
            className={`cursor-pointer p-3.5 rounded-xl border transition-all ${statusFilter === 'ซ่อมเสร็จ/รอฝ่ายผลิตตรวจรับ' ? 'bg-teal-50 border-teal-300 ring-2 ring-teal-500/20' : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'}`}
          >
            <div className="text-xs font-medium text-teal-700">รอตรวจรับงาน</div>
            <div className="text-2xl font-bold text-teal-900 mt-1">{stats.completedWaitHandover}</div>
            <div className="text-[11px] text-teal-600 mt-0.5">ผลิตทดสอบเดินเครื่อง</div>
          </div>

          <div 
            onClick={() => setStatusFilter('ปิดงานสมบูรณ์')}
            className={`cursor-pointer p-3.5 rounded-xl border transition-all ${statusFilter === 'ปิดงานสมบูรณ์' ? 'bg-slate-200 border-slate-400 ring-2 ring-slate-500/20' : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'}`}
          >
            <div className="text-xs font-medium text-slate-700">ปิดงานสมบูรณ์</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.closed}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">ตรวจรับและให้คะแนนแล้ว</div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาตามเลขที่ใบแจ้ง, รหัสเครื่องจักร (เช่น ATS03), ชื่อเครื่อง, อาการ, ผู้แจ้ง..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">กรองสถานะ:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="ทั้งหมด">สถานะทั้งหมด</option>
            <option value="รอตอบรับ">รอตอบรับ</option>
            <option value="ตอบรับแล้ว/มีแผนงาน">ตอบรับแล้ว/มีแผนงาน</option>
            <option value="กำลังดำเนินการซ่อม">กำลังดำเนินการซ่อม</option>
            <option value="รออะไหล่/สั่งของ">รออะไหล่/สั่งของ</option>
            <option value="ซ่อมเสร็จ/รอฝ่ายผลิตตรวจรับ">ซ่อมเสร็จ/รอตรวจรับ</option>
            <option value="ปิดงานสมบูรณ์">ปิดงานสมบูรณ์</option>
            <option value="ยกเลิก/ปฏิเสธ">ยกเลิก/ปฏิเสธ</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="ทั้งหมด">ความเร่งด่วนทั้งหมด</option>
            <option value="ฉุกเฉินไลน์หยุด">ฉุกเฉินไลน์หยุด</option>
            <option value="เร่งด่วน">เร่งด่วน</option>
            <option value="ปกติ">ปกติ</option>
            <option value="ตามแผนนัดหมาย">ตามแผนนัดหมาย</option>
          </select>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">ไม่พบรายการแจ้งซ่อมที่ตรงกับเงื่อนไข</h3>
            <p className="text-sm text-slate-500 mt-1">ลองเปลี่ยนคำค้นหา หรือกดปุ่มแจ้งซ่อมใหม่เพื่อสร้างรายการแจ้งซ่อม</p>
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('ทั้งหมด'); setPriorityFilter('ทั้งหมด'); }}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-colors"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        ) : (
          filteredRequests.map((req) => {
            const resp = req.engineeringResponse;
            const isPending = req.status === 'รอตอบรับ';
            const isCompletedWaitingAccept = req.status === 'ซ่อมเสร็จ/รอฝ่ายผลิตตรวจรับ';
            const isClosed = req.status === 'ปิดงานสมบูรณ์';

            return (
              <div 
                key={req.id} 
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md ${
                  req.priority === 'ฉุกเฉินไลน์หยุด' && isPending ? 'border-rose-400 ring-2 ring-rose-500/10' : 'border-slate-200'
                }`}
              >
                {/* Header row */}
                <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                      {req.id}
                    </span>
                    {renderPriorityBadge(req.priority)}
                    {renderStatusBadge(req.status)}
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      แจ้งเมื่อ {req.requestDate} เวลา {req.requestTime} น.
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => { setActiveRequest(req); setIsDetailModalOpen(true); }}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 shadow-2xs transition-colors flex items-center gap-1"
                      title="ดูรายละเอียดฉบับเต็ม / พิมพ์ใบงาน"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      ดูรายละเอียด/พิมพ์
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(req)}
                      className="px-2.5 py-1.5 bg-white hover:bg-amber-50 text-amber-700 hover:text-amber-800 text-xs font-medium rounded-lg border border-amber-200 shadow-2xs transition-colors flex items-center gap-1"
                      title="แก้ไขข้อมูลใบแจ้งซ่อม"
                    >
                      <Edit className="w-3.5 h-3.5 text-amber-600" />
                      แก้ไข
                    </button>

                    <button
                      onClick={() => handleOpenDeleteModal(req)}
                      className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 text-xs font-medium rounded-lg border border-rose-200 shadow-2xs transition-colors flex items-center gap-1"
                      title="ลบใบแจ้งซ่อมนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      ลบ
                    </button>
                  </div>
                </div>

                {/* Main Content Body */}
                <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Production Problem Details (5 cols) */}
                  <div className="lg:col-span-5 space-y-4">
                    <div>
                      <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5" />
                        ข้อมูลเครื่องจักรและปัญหาจากฝ่ายผลิต
                      </div>
                      <div className="flex items-start gap-2.5 mt-2">
                        <span className="px-2 py-0.5 bg-slate-900 text-white font-mono font-bold text-sm rounded-md shrink-0">
                          {req.machineId}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900 text-base leading-tight">
                              {req.machineName || req.machineId}
                            </span>
                            {req.isCustomLocation && (
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-medium">
                                จุดระบุเอง
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {req.lineGroup || 'สายการผลิต'}
                          </div>
                          {req.locationPoint && (
                            <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[11px] font-medium">
                              <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                              จุดที่แจ้งซ่อม: <span className="font-semibold">{req.locationPoint}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Problem Description */}
                    <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
                      <div className="font-semibold text-slate-900 text-sm mb-1">
                        {req.problemTitle}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                        {req.problemDetails}
                      </p>
                    </div>

                    {/* Requester Info */}
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-600 pt-1">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>ผู้แจ้ง: <strong>{req.requesterName}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span>{req.productionDepartment}</span>
                      </div>
                      {req.requesterPhone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-blue-600 font-medium">{req.requesterPhone}</span>
                        </div>
                      )}
                    </div>

                    {/* Photo thumbnail if uploaded */}
                    {req.photoUrl && (
                      <div className="pt-1">
                        <div className="text-[11px] font-medium text-slate-500 mb-1 flex items-center gap-1">
                          <Camera className="w-3 h-3" />
                          รูปถ่ายจุดชำรุด / อาการเสีย:
                        </div>
                        <img 
                          src={req.photoUrl} 
                          alt="จุดชำรุด" 
                          className="h-28 w-auto rounded-lg border border-slate-300 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => {
                            const w = window.open("");
                            w?.document.write(`<img src="${req.photoUrl}" style="max-width:100%; height:auto;" />`);
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Right Column: Engineering Response & Plan (7 cols) */}
                  <div className="lg:col-span-7 bg-slate-50/60 rounded-2xl p-4.5 border border-slate-200/90 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5" />
                          การตอบรับจากวิศวกรรม (Engineering Response & Target Schedule)
                        </div>

                        {resp && (
                          <span className="text-[11px] text-slate-400">
                            ตอบรับเมื่อ {resp.respondedAt}
                          </span>
                        )}
                      </div>

                      {/* If Still Pending Response */}
                      {isPending && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center my-4">
                          <Clock className="w-8 h-8 text-amber-500 mx-auto mb-2 animate-pulse" />
                          <div className="text-sm font-bold text-amber-900">
                            ยังไม่มีการตอบรับแผนงานจากฝ่ายวิศวกรรม
                          </div>
                          <p className="text-xs text-amber-700 mt-1 max-w-md mx-auto">
                            ฝ่ายผลิตกำลังรอทีมวิศวกรรมตรวจสอบอาการ ระบุวันเวลาที่จะแล้วเสร็จ และระบุขั้นตอนการเข้าซ่อมแซม
                          </p>
                          {!isProduction ? (
                            <button
                              onClick={() => handleOpenResponseModal(req)}
                              className="mt-3.5 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                            >
                              <CalendarCheck className="w-4 h-4" />
                              วิศวกรรมคลิกเพื่อตอบรับงานและกำหนดวันแล้วเสร็จ
                            </button>
                          ) : (
                            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100/90 border border-amber-300 text-amber-900 text-xs font-semibold">
                              <span>⏳ รอยืนยันแผนงานจากทีมวิศวกรรม (เมื่อทีมช่างตอบรับแล้ว กำหนดวันเสร็จจะแสดงที่นี่)</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* If Response Exists: The Core Requirement */}
                      {resp && (
                        <div className="space-y-3.5">
                          {/* "ว่าจะแล้วเสร็จวันไหน เมื่อไหร่" (Highlight Banner) */}
                          <div className="bg-emerald-50/90 border border-emerald-300/80 rounded-xl p-3.5 shadow-2xs">
                            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
                              กำหนดเวลาปฏิบัติงานและวันที่จะแล้วเสร็จ (Target Schedule)
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                              <div className="bg-white/90 p-2.5 rounded-lg border border-emerald-200/80">
                                <span className="text-[10px] text-slate-500 block">วันเวลาเริ่มเข้าซ่อม:</span>
                                <strong className="text-xs text-slate-900">
                                  {resp.targetStartDate} ({resp.targetStartTime} น.)
                                </strong>
                              </div>

                              <div className="bg-white/90 p-2.5 rounded-lg border border-emerald-200/80">
                                <span className="text-[10px] text-emerald-700 font-bold block">🎯 คาดว่าจะแล้วเสร็จ:</span>
                                <strong className="text-xs text-emerald-900 font-bold">
                                  {resp.targetFinishDate} ({resp.targetFinishTime} น.)
                                </strong>
                              </div>

                              <div className="bg-white/90 p-2.5 rounded-lg border border-emerald-200/80">
                                <span className="text-[10px] text-slate-500 block">ระยะเวลาประเมิน:</span>
                                <strong className="text-xs text-slate-900">
                                  {resp.estimatedDurationMins} นาที ({Math.round(resp.estimatedDurationMins / 60 * 10) / 10} ชม.)
                                </strong>
                              </div>
                            </div>
                          </div>

                          {/* "อย่างไร" (Action Plan & Spare Parts) */}
                          <div className="space-y-2 text-xs">
                            <div className="bg-white p-3 rounded-xl border border-slate-200">
                              <div className="font-semibold text-slate-900 mb-1 flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5 text-slate-500" />
                                แผนงานและวิธีการซ่อม (Action Plan / How-To):
                              </div>
                              <p className="text-slate-700 whitespace-pre-line leading-relaxed pl-1">
                                {resp.actionPlan}
                              </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                                <span className="text-[11px] text-slate-500 block">ช่างผู้รับผิดชอบ:</span>
                                <div className="font-semibold text-slate-900 mt-0.5">
                                  {resp.assignedTechnicians && resp.assignedTechnicians.length > 0 
                                    ? resp.assignedTechnicians.join(', ')
                                    : 'ทีมช่างซ่อมบำรุง'}
                                </div>
                              </div>

                              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                                <span className="text-[11px] text-slate-500 block">สถานะอะไหล่:</span>
                                <div className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1">
                                  <Package className="w-3.5 h-3.5 text-blue-600" />
                                  <span>{resp.sparePartStatus}</span>
                                </div>
                                {resp.sparePartNotes && (
                                  <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                                    {resp.sparePartNotes}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Message / Advice to Production */}
                            {resp.messageToProduction && (
                              <div className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-200 text-blue-900">
                                <span className="text-[10px] font-bold text-blue-700 block uppercase">
                                  💬 ข้อความถึงฝ่ายผลิต / การประสานงาน:
                                </span>
                                <p className="text-xs mt-0.5 italic">
                                  "{resp.messageToProduction}"
                                </p>
                              </div>
                            )}

                            {/* Actual repair summary if completed */}
                            {resp.completedAt && (
                              <div className="bg-teal-50/80 p-2.5 rounded-xl border border-teal-200 text-teal-900">
                                <div className="flex items-center justify-between text-[11px] font-bold text-teal-800">
                                  <span>✅ ซ่อมเสร็จจริงเมื่อ: {resp.completedAt}</span>
                                  <span>เวลาจริง: {resp.actualDurationMins || '-'} นาที</span>
                                </div>
                                {resp.repairSummaryNotes && (
                                  <p className="text-xs mt-1 text-teal-950">
                                    ผลการซ่อม: {resp.repairSummaryNotes}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Handover & Customer Rating Box */}
                      {isCompletedWaitingAccept && (
                        <div className="mt-3 bg-teal-50 border border-teal-300 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                          <div className="text-xs text-teal-900">
                            <strong className="block font-bold">📢 งานซ่อมเสร็จแล้ว รอฝ่ายผลิตตรวจรับงาน:</strong>
                            กรุณาทดสอบเดินเครื่องจักรจริง และกดตรวจรับมอบงานในระบบ
                          </div>
                          <button
                            onClick={() => handleOpenHandoverModal(req)}
                            className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shrink-0 shadow-xs transition-colors"
                          >
                            🤝 ทดสอบและตรวจรับงาน
                          </button>
                        </div>
                      )}

                      {isClosed && (
                        <div className="mt-3 bg-slate-100/90 rounded-xl p-2.5 border border-slate-200 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-slate-500">ผู้ตรวจรับงาน: </span>
                            <strong>{req.acceptedBy}</strong> ({req.acceptedAt})
                            {req.handoverNotes && (
                              <div className="text-slate-600 italic text-[11px] mt-0.5">
                                "{req.handoverNotes}"
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-3.5 h-3.5 ${i < (req.satisfactionRating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} 
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Buttons for Engineers / Technicians */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-200">
                      <div className="flex items-center gap-1.5">
                        {!isProduction && (
                          req.linkedRepairLogId ? (
                            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              บันทึกในประวัติซ่อมแล้ว ({req.linkedRepairLogId})
                            </span>
                          ) : (
                            <button
                              onClick={() => handleConvertToRepairLog(req)}
                              className="text-xs text-slate-600 hover:text-blue-700 hover:bg-blue-50 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors flex items-center gap-1"
                              title="นำใบงานนี้เข้าสู่ระบบประวัติการซ่อมบำรุงโรงงาน"
                            >
                              <ExternalLink className="w-3 h-3" />
                              นำเข้าตารางประวัติซ่อม
                            </button>
                          )
                        )}
                        {isProduction && (
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            ใบแจ้งซ่อม: <strong>{req.id}</strong>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Engineer can edit/update response anytime */}
                        {!isProduction && resp && req.status !== 'ปิดงานสมบูรณ์' && (
                          <button
                            onClick={() => handleOpenResponseModal(req)}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-slate-300 shadow-2xs transition-colors"
                          >
                            แก้ไขแผนงาน/วันเสร็จ
                          </button>
                        )}

                        {/* Engineer can mark as Completed */}
                        {!isProduction && resp && req.status !== 'ซ่อมเสร็จ/รอฝ่ายผลิตตรวจรับ' && req.status !== 'ปิดงานสมบูรณ์' && (
                          <button
                            onClick={() => handleOpenCompleteModal(req)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            รายงานซ่อมเสร็จ
                          </button>
                        )}

                        {/* Production Handover button */}
                        {isCompletedWaitingAccept && (
                          <button
                            onClick={() => handleOpenHandoverModal(req)}
                            className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors flex items-center gap-1 animate-pulse"
                          >
                            🤝 ตรวจรับมอบงาน (ฝ่ายผลิต)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: New Work Request (Production) */}
      {/* ========================================================================= */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-4 bg-blue-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BellRing className="w-5 h-5" />
                <h3 className="font-bold text-lg">แบบฟอร์มฝ่ายผลิตแจ้งซ่อมเครื่องจักร (New Request)</h3>
              </div>
              <button 
                onClick={() => setIsNewModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewRequest} className="p-6 space-y-4 text-sm">
              {/* Machine / Point Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-800 text-sm">
                    เครื่องจักร หรือ จุดที่ต้องการแจ้งซ่อม <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setNewMachineMode('select')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        newMachineMode === 'select'
                          ? 'bg-white text-blue-700 font-bold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 font-medium'
                      }`}
                    >
                      🏭 เลือกจากฐานข้อมูล
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewMachineMode('custom')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        newMachineMode === 'custom'
                          ? 'bg-white text-blue-700 font-bold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 font-medium'
                      }`}
                    >
                      ✏️ พิมพ์ระบุจุดเอง
                    </button>
                  </div>
                </div>

                {newMachineMode === 'select' ? (
                  <div className="space-y-2">
                    <select
                      value={newMachineId}
                      onChange={(e) => {
                        const mId = e.target.value;
                        if (mId === '__CUSTOM__') {
                          setNewMachineMode('custom');
                          return;
                        }
                        setNewMachineId(mId);
                        const mach = getMachineInfo(mId);
                        if (mach) {
                          setNewProductionDept(mach.department || mach.lineGroup || newProductionDept);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-xs sm:text-sm"
                    >
                      <option value="">-- เลือกรหัสเครื่องจักร (จากฐานข้อมูลโรงงาน) --</option>
                      {machines.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.id} : {m.name} {m.model ? `(${m.model})` : ''} - [{m.lineGroup || m.department || 'โรงงาน'}]
                        </option>
                      ))}
                      <option value="__CUSTOM__">
                        ➕ ✏️ พิมพ์ระบุจุดแจ้งซ่อม / เครื่องจักรเอง (ไม่ได้อยู่ในฐานข้อมูล)...
                      </option>
                    </select>

                    <div>
                      <input
                        type="text"
                        placeholder="ระบุจุดย่อย หรือตำแหน่งที่เกิดปัญหา เช่น สายพานหน้าเครื่อง, หัวซีลที่ 2, มอเตอร์ขับ (ไม่บังคับ)"
                        value={newLocationPoint}
                        onChange={(e) => setNewLocationPoint(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 bg-blue-50/50 p-3.5 rounded-xl border border-blue-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          รหัสเครื่องจักร หรือ จุดที่ต้องการแจ้งซ่อม <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required={newMachineMode === 'custom'}
                          placeholder="เช่น โต๊ะตัดซีล, สายพานหน้าไลน์ 2, ท่อลมรั่ว, ATS03"
                          value={newCustomMachineId}
                          onChange={(e) => setNewCustomMachineId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          ชื่อเครื่องจักร หรือ รายละเอียดจุดติดตั้ง
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น โต๊ะตัดขอบถุง, จุดลำเลียงข้าวเข้าหม้อหุง, ปั๊มน้ำยา"
                          value={newCustomMachineName}
                          onChange={(e) => setNewCustomMachineName(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          จุดหรือตำแหน่งย่อยที่พบปัญหา
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น ฮีตเตอร์หัวขวา, ใบมีดตัด, บริเวณข้อต่อท่อ"
                          value={newLocationPoint}
                          onChange={(e) => setNewLocationPoint(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          ไลน์ผลิต / บริเวณที่ตั้ง (Production Area)
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น ไลน์ 2 แผนกบรรจุ, ห้องปรุงสุก, ห้องหุงต้ม"
                          value={newCustomLineGroup}
                          onChange={(e) => setNewCustomLineGroup(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  ระดับความเร่งด่วน <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'ฉุกเฉินไลน์หยุด', label: 'ฉุกเฉินไลน์หยุด', color: 'border-rose-500 bg-rose-50 text-rose-800' },
                    { id: 'เร่งด่วน', label: 'เร่งด่วน (ความเร็วตก)', color: 'border-amber-500 bg-amber-50 text-amber-800' },
                    { id: 'ปกติ', label: 'ปกติ (แจ้งล่วงหน้า)', color: 'border-blue-500 bg-blue-50 text-blue-800' },
                    { id: 'ตามแผนนัดหมาย', label: 'ตามแผนนัดหมาย', color: 'border-purple-500 bg-purple-50 text-purple-800' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setNewPriority(p.id as WorkRequestPriority)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                        newPriority === p.id 
                          ? `${p.color} ring-2 ring-blue-500/20` 
                          : 'border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Problem Title */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  หัวข้อปัญหา / อาการที่พบ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ฟองอากาศบนขอบถ้วย ซีลไม่ติด, สติกเกอร์หลังขึ้น Alarm บ่อย"
                  value={newProblemTitle}
                  onChange={(e) => setNewProblemTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Problem Details */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  รายละเอียดปัญหาและผลกระทบต่อไลน์การผลิต
                </label>
                <textarea
                  rows={3}
                  placeholder="ระบุรายละเอียด เช่น พบฟองอากาศทุกๆ 5 ถ้วย ความเร็วตกจาก 40 เหลือ 20 ชิ้น/นาที ไลน์ต้องหยุดชั่วคราว..."
                  value={newProblemDetails}
                  onChange={(e) => setNewProblemDetails(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                />
              </div>

              {/* Requester Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 text-xs mb-1">
                    ชื่อผู้แจ้งซ่อม <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newRequesterName}
                    onChange={(e) => setNewRequesterName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 text-xs mb-1">
                    แผนก/ไลน์ผลิต
                  </label>
                  <input
                    type="text"
                    value={newProductionDept}
                    onChange={(e) => setNewProductionDept(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 text-xs mb-1">
                    เบอร์โทร/เบอร์ภายใน
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น 4102 หรือ 081-xxx"
                    value={newRequesterPhone}
                    onChange={(e) => setNewRequesterPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block font-medium text-slate-700 text-xs mb-1">
                  แนบรูปถ่ายจุดชำรุด (ไม่บังคับ)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {newPhotoUrl && (
                    <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                      <Check className="w-3.5 h-3.5" /> แนบรูปภาพแล้ว
                    </span>
                  )}
                </div>
              </div>

              {/* Line Notify toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="notifyLineSubmit"
                  checked={notifyLineOnSubmit}
                  onChange={(e) => setNotifyLineOnSubmit(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="notifyLineSubmit" className="text-xs text-slate-700 cursor-pointer">
                  ส่งข้อความแจ้งเตือนเข้ากลุ่ม LINE Notify ของทีมวิศวกรรมทันที
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  ยืนยันส่งใบแจ้งซ่อม
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Engineering Response (วิศวกรรมตอบรับงานและกำหนดวันเสร็จ/แผนงาน) */}
      {/* ========================================================================= */}
      {isResponseModalOpen && activeRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-4 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Wrench className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-lg">วิศวกรรมตอบรับงานซ่อม และระบุวันแล้วเสร็จ</h3>
                  <div className="text-xs text-white/80">
                    ใบแจ้งซ่อม {activeRequest.id} • เครื่องจักร {activeRequest.machineId} ({activeRequest.machineName})
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsResponseModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitResponse} className="p-6 space-y-4 text-sm">
              {/* Summary of Production Request */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="text-xs font-semibold text-slate-700 mb-1">
                  ปัญหาที่ฝ่ายผลิตแจ้งมา:
                </div>
                <div className="font-bold text-slate-900 text-sm">{activeRequest.problemTitle}</div>
                <div className="text-xs text-slate-600 mt-1">{activeRequest.problemDetails}</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  ผู้แจ้ง: {activeRequest.requesterName} ({activeRequest.productionDepartment})
                </div>
              </div>

              {/* CORE REQUIREMENT 1: "ว่าจะแล้วเสร็จวันไหน เมื่อไหร่" */}
              <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-300">
                <div className="font-bold text-emerald-900 text-sm mb-3 flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-emerald-600" />
                  1. กำหนดเวลาเข้าซ่อม และคาดว่าจะแล้วเสร็จเมื่อไหร่
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Start Date / Time */}
                  <div className="bg-white p-3 rounded-lg border border-emerald-200">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      วันที่และเวลาเริ่มเข้าซ่อม <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        required
                        value={respTargetStartDate}
                        onChange={(e) => setRespTargetStartDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                      />
                      <input
                        type="time"
                        required
                        value={respTargetStartTime}
                        onChange={(e) => setRespTargetStartTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  {/* Target Finish Date / Time (THE PROMPT'S KEY ASK) */}
                  <div className="bg-white p-3 rounded-lg border border-emerald-300 ring-2 ring-emerald-500/10">
                    <label className="block text-xs font-bold text-emerald-800 mb-1">
                      🎯 วันที่และเวลาคาดว่าจะแล้วเสร็จ <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        required
                        value={respTargetFinishDate}
                        onChange={(e) => setRespTargetFinishDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-emerald-50/50 border border-emerald-400 rounded-lg text-xs font-bold text-emerald-900"
                      />
                      <input
                        type="time"
                        required
                        value={respTargetFinishTime}
                        onChange={(e) => setRespTargetFinishTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-emerald-50/50 border border-emerald-400 rounded-lg text-xs font-bold text-emerald-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <label className="text-xs font-medium text-slate-700 whitespace-nowrap">
                    ระยะเวลาประเมินโดยรวม (นาที):
                  </label>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={respEstimatedDuration}
                    onChange={(e) => setRespEstimatedDuration(Number(e.target.value))}
                    className="w-28 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                  <span className="text-xs text-slate-500">
                    (ประมาณ {Math.round((respEstimatedDuration / 60) * 10) / 10} ชั่วโมง)
                  </span>
                </div>
              </div>

              {/* CORE REQUIREMENT 2: "อย่างไร" (แผนงาน และวิธีการซ่อม) */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  2. แผนงานและขั้นตอนวิธีการซ่อม (จะดำเนินการแก้ไขอย่างไร) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="เช่น 1. ตรวจเช็ค alignment เซนเซอร์ 2. เปลี่ยนซีลยางและลูกกลิ้ง 3. รันทดสอบความเร็วสูง..."
                  value={respActionPlan}
                  onChange={(e) => setRespActionPlan(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs leading-relaxed focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Assigned Technicians */}
              <div>
                <label className="block font-medium text-slate-700 text-xs mb-1">
                  มอบหมายช่างผู้รับผิดชอบงาน
                </label>
                <div className="flex flex-wrap gap-2">
                  {technicians.map(tech => (
                    <button
                      key={tech}
                      type="button"
                      onClick={() => {
                        if (respAssignedTechs.includes(tech)) {
                          setRespAssignedTechs(respAssignedTechs.filter(t => t !== tech));
                        } else {
                          setRespAssignedTechs([...respAssignedTechs, tech]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        respAssignedTechs.includes(tech)
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {respAssignedTechs.includes(tech) ? `✓ ${tech}` : tech}
                    </button>
                  ))}
                </div>
              </div>

              {/* Spare Parts Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 text-xs mb-1">
                    สถานะความพร้อมของอะไหล่
                  </label>
                  <select
                    value={respSparePartStatus}
                    onChange={(e) => setRespSparePartStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                  >
                    <option value="มีอะไหล่พร้อมในคลัง">มีอะไหล่พร้อมในคลัง (พร้อมทำทันที)</option>
                    <option value="เบิกอะไหล่ด่วน">เบิกอะไหล่ด่วนจากสโตร์กลาง</option>
                    <option value="สั่งซื้อรออะไหล่">สั่งซื้อรออะไหล่จากผู้ขายภายนอก</option>
                    <option value="ไม่ต้องใช้อะไหล่">ไม่ต้องใช้อะไหล่ (ปรับตั้งค่าทางกล/ซอฟต์แวร์)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 text-xs mb-1">
                    รายการอะไหล่ที่ต้องใช้ / หมายเหตุอะไหล่
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ซีลยาง OMRON, ตลับลูกปืน SUS304..."
                    value={respSparePartNotes}
                    onChange={(e) => setRespSparePartNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Message to Production */}
              <div>
                <label className="block font-medium text-slate-700 text-xs mb-1">
                  ข้อความตอบกลับถึงฝ่ายผลิต / นัดหมายเวลาหยุดเครื่อง
                </label>
                <input
                  type="text"
                  placeholder="เช่น รับทราบแล้วครับ ขอหยุดเครื่องช่วงเวลา 15:00 น. ไม่กระทบยอดผลิตรวมครับ"
                  value={respMessageToProd}
                  onChange={(e) => setRespMessageToProd(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              {/* Status transition */}
              <div className="flex items-center gap-3 pt-1">
                <label className="text-xs font-semibold text-slate-700">
                  เปลี่ยนสถานะเป็น:
                </label>
                <select
                  value={respStatus}
                  onChange={(e) => setRespStatus(e.target.value as WorkRequestStatus)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                >
                  <option value="ตอบรับแล้ว/มีแผนงาน">ตอบรับแล้ว/มีแผนงาน</option>
                  <option value="กำลังดำเนินการซ่อม">กำลังดำเนินการซ่อม (เข้างานทันที)</option>
                  <option value="รออะไหล่/สั่งของ">รออะไหล่/สั่งของ</option>
                </select>
              </div>

              {/* LINE Notify toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="notifyLineResp"
                  checked={notifyLineOnRespond}
                  onChange={(e) => setNotifyLineOnRespond(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="notifyLineResp" className="text-xs text-slate-700 cursor-pointer">
                  ส่งข้อความตอบรับและวันแล้วเสร็จแจ้งเตือนเข้ากลุ่ม LINE ฝ่ายผลิตทันที
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResponseModalOpen(false)}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
                >
                  <CalendarCheck className="w-4 h-4" />
                  บันทึกการตอบรับและส่งแผนงาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Repair Completion (วิศวกรรมรายงานผลซ่อมเสร็จ) */}
      {/* ========================================================================= */}
      {isCompleteModalOpen && activeRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="font-bold text-base">รายงานการซ่อมเสร็จสิ้น (Ready for Handover)</h3>
              </div>
              <button 
                onClick={() => setIsCompleteModalOpen(false)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitComplete} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-800 text-xs mb-1">
                  ระยะเวลาที่ใช้ซ่อมแซมจริง (นาที) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={compActualDuration}
                  onChange={(e) => setCompActualDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 text-xs mb-1">
                  สรุปผลการซ่อมแซม / สิ่งที่ดำเนินการแก้ไข <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="เช่น เปลี่ยนซีลยางและปรับความตึงสายพาน ทดสอบแรงดันสุญญากาศทำได้ -0.095 MPa ผ่านเกณฑ์"
                  value={compSummaryNotes}
                  onChange={(e) => setCompSummaryNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs leading-relaxed"
                />
              </div>

              <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-xs text-teal-800">
                เมื่อกดยืนยัน ระบบจะปรับสถานะเป็น <strong>"ซ่อมเสร็จ/รอฝ่ายผลิตตรวจรับ"</strong> และส่งข้อความแจ้งเตือนให้ฝ่ายผลิตร่วมทดสอบเดินเครื่อง
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCompleteModalOpen(false)}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  บันทึกซ่อมเสร็จและแจ้งตรวจรับ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: Handover & Acceptance (ฝ่ายผลิตตรวจรับมอบงาน) */}
      {/* ========================================================================= */}
      {isHandoverModalOpen && activeRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-teal-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="font-bold text-base">ฝ่ายผลิตทดสอบเดินเครื่องและตรวจรับมอบงาน</h3>
              </div>
              <button 
                onClick={() => setIsHandoverModalOpen(false)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitHandover} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-800 text-xs mb-1">
                  ชื่อผู้ตรวจรับงาน (ตัวแทนฝ่ายผลิต) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={handoverAcceptedBy}
                  onChange={(e) => setHandoverAcceptedBy(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 text-xs mb-1">
                  ผลการทดสอบเดินเครื่องจริง / ความเห็นการส่งมอบ
                </label>
                <textarea
                  rows={3}
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder="เช่น ทดสอบรัน 15 นาที อาการฟองอากาศหายไป ซีลติดแน่นหนาดี เครื่องพร้อมผลิตต่อเนื่อง"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 text-xs mb-1.5">
                  ระดับความพึงพอใจการให้บริการของทีมวิศวกรรม
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setHandoverRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star 
                        className={`w-7 h-7 ${star <= handoverRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} 
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-700 ml-2">
                    {handoverRating} จาก 5 ดาว
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsHandoverModalOpen(false)}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  ยืนยันตรวจรับและปิดงานสมบูรณ์
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: Printable Detailed View */}
      {/* ========================================================================= */}
      {isDetailModalOpen && activeRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 print:shadow-none print:border-none print:m-0">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base">ใบสั่งซ่อมและตอบรับแผนงาน (Work Order Sheet)</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenEditModal(activeRequest);
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                  title="แก้ไขข้อมูลใบแจ้งซ่อมนี้"
                >
                  <Edit className="w-3.5 h-3.5" />
                  แก้ไขข้อมูล
                </button>
                <button
                  onClick={() => {
                    handleOpenDeleteModal(activeRequest);
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                  title="ลบใบแจ้งซ่อมนี้"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  ลบใบงาน
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  พิมพ์ใบงาน
                </button>
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="text-white/80 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content Area */}
            <div className="p-8 space-y-6 text-slate-800 print:p-4">
              {/* Sheet Header */}
              <div className="border-b-2 border-slate-800 pb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold uppercase tracking-tight text-slate-900">
                    ใบแจ้งซ่อมและตอบรับงานซ่อมบำรุง
                  </h2>
                  <div className="text-xs text-slate-500 mt-1">
                    CPRAM MAINTENANCE MANAGEMENT & ENGINEERING WORK ORDER
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold font-mono text-slate-900 bg-slate-100 px-3 py-1 rounded border border-slate-300 inline-block">
                    เลขที่: {activeRequest.id}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    วันที่: {activeRequest.requestDate} {activeRequest.requestTime}
                  </div>
                </div>
              </div>

              {/* Section 1: Production info */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800 bg-blue-50 px-3 py-1 rounded">
                  ส่วนที่ 1: ข้อมูลการแจ้งซ่อมจากฝ่ายผลิต (Production Request)
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <strong>เครื่องจักร:</strong> {activeRequest.machineId} - {activeRequest.machineName}
                    {activeRequest.isCustomLocation && (
                      <span className="ml-1 text-[11px] text-blue-600">(จุดระบุเอง)</span>
                    )}
                  </div>
                  <div><strong>ไลน์ผลิต/แผนก:</strong> {activeRequest.lineGroup}</div>
                  {activeRequest.locationPoint && (
                    <div><strong>จุดที่พบปัญหา:</strong> {activeRequest.locationPoint}</div>
                  )}
                  <div><strong>ระดับความเร่งด่วน:</strong> {activeRequest.priority}</div>
                  <div><strong>ผู้แจ้ง:</strong> {activeRequest.requesterName} ({activeRequest.requesterPhone || '-'})</div>
                  <div><strong>สถานะปัจจุบัน:</strong> {activeRequest.status}</div>
                </div>
                <div className="bg-slate-50 p-3 rounded text-xs border border-slate-200 mt-2">
                  <div className="font-bold text-slate-900 mb-1">หัวข้อปัญหา: {activeRequest.problemTitle}</div>
                  <div className="text-slate-700 whitespace-pre-line">{activeRequest.problemDetails}</div>
                </div>
                {activeRequest.photoUrl && (
                  <div className="mt-3">
                    <span className="text-xs font-semibold text-slate-700 block mb-1">รูปถ่ายปัญหาที่แนบมา:</span>
                    <img
                      src={activeRequest.photoUrl}
                      alt="รูปถ่ายจุดชำรุด"
                      className="w-48 h-36 object-cover rounded-lg border border-slate-200"
                    />
                  </div>
                )}
              </div>

              {/* Section 2: Engineering Response */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded">
                  ส่วนที่ 2: การตอบรับและกำหนดเวลาแล้วเสร็จโดยวิศวกรรม (Engineering Response)
                </h4>
                {activeRequest.engineeringResponse ? (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-3 gap-3 bg-emerald-50/50 p-3 rounded border border-emerald-200">
                      <div>
                        <span className="text-slate-500 block text-[10px]">วันเวลาเข้าซ่อม:</span>
                        <strong>{activeRequest.engineeringResponse.targetStartDate} {activeRequest.engineeringResponse.targetStartTime}</strong>
                      </div>
                      <div>
                        <span className="text-emerald-700 font-bold block text-[10px]">🎯 วันเวลาที่คาดว่าจะแล้วเสร็จ:</span>
                        <strong className="text-emerald-900 font-bold">
                          {activeRequest.engineeringResponse.targetFinishDate} {activeRequest.engineeringResponse.targetFinishTime}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">เวลาประเมิน:</span>
                        <strong>{activeRequest.engineeringResponse.estimatedDurationMins} นาที</strong>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded border border-slate-200">
                      <div className="font-bold mb-1">แผนงานและขั้นตอนวิธีการซ่อม:</div>
                      <div className="whitespace-pre-line text-slate-700">
                        {activeRequest.engineeringResponse.actionPlan}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div><strong>ช่างผู้รับผิดชอบ:</strong> {activeRequest.engineeringResponse.assignedTechnicians?.join(', ') || '-'}</div>
                      <div><strong>สถานะอะไหล่:</strong> {activeRequest.engineeringResponse.sparePartStatus}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic py-2">
                    ยังไม่มีข้อมูลการตอบรับแผนงาน
                  </div>
                )}
              </div>

              {/* Section 3: Handover & Signatures */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-3 py-1 rounded">
                  ส่วนที่ 3: การตรวจรับมอบงานและการลงนาม (Handover & Sign-Off)
                </h4>
                <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs">
                  <div>
                    <div className="border-b border-slate-400 w-48 mx-auto mb-2"></div>
                    <div>( ............................................................ )</div>
                    <div className="text-slate-500 mt-1">ผู้รายงานผลการซ่อม (วิศวกรรม)</div>
                    <div className="text-[11px] text-slate-400">วันที่ ......./......./.......</div>
                  </div>

                  <div>
                    <div className="border-b border-slate-400 w-48 mx-auto mb-2">
                      {activeRequest.acceptedBy && <span className="font-bold text-slate-900">{activeRequest.acceptedBy}</span>}
                    </div>
                    <div>( ............................................................ )</div>
                    <div className="text-slate-500 mt-1">ผู้ตรวจรับมอบงาน (ฝ่ายผลิต)</div>
                    <div className="text-[11px] text-slate-400">วันที่ ......./......./.......</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: Edit Work Request (แก้ไขข้อมูลใบแจ้งซ่อม) */}
      {/* ========================================================================= */}
      {isEditModalOpen && editingRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-4 bg-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Edit className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-lg">แก้ไขข้อมูลใบแจ้งซ่อม</h3>
                  <div className="text-xs text-white/80">
                    เลขที่ใบแจ้ง: {editingRequest.id}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="p-6 space-y-5 text-sm max-h-[80vh] overflow-y-auto">
              {/* Section: Machine / Repair Point */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    1. ข้อมูลเครื่องจักร / จุดที่ต้องการแจ้งซ่อม <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setEditMachineMode('select')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        editMachineMode === 'select'
                          ? 'bg-blue-600 text-white font-bold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 font-medium'
                      }`}
                    >
                      🏭 เลือกจากฐานข้อมูล
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditMachineMode('custom')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        editMachineMode === 'custom'
                          ? 'bg-blue-600 text-white font-bold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 font-medium'
                      }`}
                    >
                      ✏️ พิมพ์ระบุจุดเอง
                    </button>
                  </div>
                </div>

                {editMachineMode === 'select' ? (
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        เลือกรหัสเครื่องจักรจากฐานข้อมูล
                      </label>
                      <select
                        value={editMachineId}
                        onChange={(e) => {
                          const mId = e.target.value;
                          if (mId === '__CUSTOM__') {
                            setEditMachineMode('custom');
                            return;
                          }
                          setEditMachineId(mId);
                          const mach = getMachineInfo(mId);
                          if (mach) {
                            setEditMachineName(`${mach.name} ${mach.model ? `(${mach.model})` : ''}`.trim());
                            setEditLineGroup(mach.lineGroup || mach.department || editLineGroup);
                          }
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      >
                        <option value="">-- เลือกรหัสเครื่องจักร (จากฐานข้อมูลโรงงาน) --</option>
                        {machines.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.id} : {m.name} {m.model ? `(${m.model})` : ''} - [{m.lineGroup || m.department || 'โรงงาน'}]
                          </option>
                        ))}
                        <option value="__CUSTOM__">
                          ➕ ✏️ สลับเป็นพิมพ์ระบุจุดแจ้งซ่อมเอง (ไม่อยู่ในฐานข้อมูล)...
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        จุดย่อยหรือตำแหน่งที่พบปัญหา (Specific Point)
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น ฮีตเตอร์หัวซีลตัวที่ 2, สายพานหน้าเครื่อง, กระบอกสูบลม"
                        value={editLocationPoint}
                        onChange={(e) => setEditLocationPoint(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          รหัส หรือ จุดที่ต้องการแจ้งซ่อม <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="เช่น โต๊ะตัดซีล, สายพานหน้าไลน์ 2, ท่อลมรั่ว, ATS03"
                          value={editMachineId}
                          onChange={(e) => setEditMachineId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          ชื่อเครื่องจักร หรือ รายละเอียดจุดติดตั้ง
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น เครื่องตัดขอบถุง, จุดลำเลียงข้าวสาร, ปั๊มน้ำยา"
                          value={editMachineName}
                          onChange={(e) => setEditMachineName(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          จุดย่อยหรือตำแหน่งที่พบปัญหา
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น ฮีตเตอร์หัวขวา, ใบมีดตัด, บริเวณข้อต่อท่อ"
                          value={editLocationPoint}
                          onChange={(e) => setEditLocationPoint(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          ไลน์ผลิต / บริเวณที่ตั้ง (Area)
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น ไลน์ 2 แผนกบรรจุ, ห้องปรุงสุก, ห้องหุงต้ม"
                          value={editLineGroup}
                          onChange={(e) => setEditLineGroup(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section: Priority & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">
                    ระดับความเร่งด่วน <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'ฉุกเฉินไลน์หยุด', label: 'ฉุกเฉินไลน์หยุด', color: 'border-rose-500 bg-rose-50 text-rose-800' },
                      { id: 'เร่งด่วน', label: 'เร่งด่วน (ความเร็วตก)', color: 'border-amber-500 bg-amber-50 text-amber-800' },
                      { id: 'ปกติ', label: 'ปกติ (แจ้งล่วงหน้า)', color: 'border-blue-500 bg-blue-50 text-blue-800' },
                      { id: 'ตามแผนนัดหมาย', label: 'ตามแผนนัดหมาย', color: 'border-purple-500 bg-purple-50 text-purple-800' }
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setEditPriority(p.id as WorkRequestPriority)}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-semibold text-center transition-all ${
                          editPriority === p.id 
                            ? `${p.color} ring-2 ring-amber-500/20 font-bold` 
                            : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-100'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">
                    สถานะของใบแจ้งซ่อม <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as WorkRequestStatus)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="รอตอบรับ">รอตอบรับ (Pending)</option>
                    <option value="ตอบรับแล้ว/มีแผนงาน">ตอบรับแล้ว/มีแผนงาน (Acknowledged)</option>
                    <option value="กำลังดำเนินการซ่อม">กำลังดำเนินการซ่อม (In Progress)</option>
                    <option value="รออะไหล่/สั่งของ">รออะไหล่/สั่งของ (Waiting Spare Parts)</option>
                    <option value="ซ่อมเสร็จ/รอฝ่ายผลิตตรวจรับ">ซ่อมเสร็จ/รอตรวจรับ (Completed - Pending Acceptance)</option>
                    <option value="ปิดงานสมบูรณ์">ปิดงานสมบูรณ์ (Closed)</option>
                    <option value="ยกเลิก/ปฏิเสธ">ยกเลิก/ปฏิเสธ (Cancelled)</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    สามารถปรับเปลี่ยนสถานะตามขั้นตอนการปฏิบัติงานจริงในโรงงาน
                  </p>
                </div>
              </div>

              {/* Section: Problem Details */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block font-bold text-slate-800 text-xs uppercase tracking-wider">
                  2. รายละเอียดอาการชำรุด <span className="text-rose-500">*</span>
                </label>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    หัวข้อปัญหา / อาการที่พบ
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ฟองอากาศบนขอบถ้วย ซีลไม่ติด, สติกเกอร์หลังขึ้น Alarm บ่อย"
                    value={editProblemTitle}
                    onChange={(e) => setEditProblemTitle(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    รายละเอียดปัญหาและผลกระทบต่อไลน์การผลิต
                  </label>
                  <textarea
                    rows={3}
                    placeholder="ระบุรายละเอียดอาการ สาเหตุที่สังเกตเห็น และผลกระทบต่อไลน์ผลิต"
                    value={editProblemDetails}
                    onChange={(e) => setEditProblemDetails(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs leading-relaxed focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Section: Requester Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-800 text-xs uppercase tracking-wider mb-1">
                    ชื่อผู้แจ้งซ่อม <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editRequesterName}
                    onChange={(e) => setEditRequesterName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 text-xs uppercase tracking-wider mb-1">
                    แผนก/ไลน์ผลิต
                  </label>
                  <input
                    type="text"
                    value={editProductionDept}
                    onChange={(e) => setEditProductionDept(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 text-xs uppercase tracking-wider mb-1">
                    เบอร์โทร/เบอร์ภายใน
                  </label>
                  <input
                    type="text"
                    value={editRequesterPhone}
                    onChange={(e) => setEditRequesterPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Section: Photo */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <label className="block font-bold text-slate-800 text-xs uppercase tracking-wider mb-1">
                  รูปถ่ายจุดชำรุด
                </label>
                {editPhotoUrl ? (
                  <div className="flex items-center gap-4">
                    <img
                      src={editPhotoUrl}
                      alt="รูปจุดชำรุด"
                      className="w-24 h-24 object-cover rounded-xl border border-slate-300 shadow-2xs"
                    />
                    <div className="space-y-2">
                      <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                        <Check className="w-4 h-4" /> มีรูปภาพแนบในระบบ
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditPhotoUrl(undefined)}
                        className="px-2.5 py-1 text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> ลบรูปถ่ายนี้
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEditPhotoUpload}
                      className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                    />
                  </div>
                )}
              </div>

              {/* Section: Engineering Response Plan & ETA (Optional / Collapsible) */}
              <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-emerald-700" />
                  <label className="font-bold text-emerald-900 text-xs uppercase tracking-wider">
                    3. ข้อมูลการตอบรับแผนงานและวันแล้วเสร็จ (Engineering Plan & ETA)
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-emerald-900 mb-1">
                      🎯 วันที่คาดว่าจะแล้วเสร็จ
                    </label>
                    <input
                      type="date"
                      value={editTargetFinishDate}
                      onChange={(e) => setEditTargetFinishDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-emerald-900 mb-1">
                      🎯 เวลาที่คาดว่าจะแล้วเสร็จ
                    </label>
                    <input
                      type="time"
                      value={editTargetFinishTime}
                      onChange={(e) => setEditTargetFinishTime(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      วันที่เริ่มเข้าซ่อม
                    </label>
                    <input
                      type="date"
                      value={editTargetStartDate}
                      onChange={(e) => setEditTargetStartDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      เวลาเริ่มเข้าซ่อม
                    </label>
                    <input
                      type="time"
                      value={editTargetStartTime}
                      onChange={(e) => setEditTargetStartTime(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      เวลาประเมิน (นาที)
                    </label>
                    <input
                      type="number"
                      min={5}
                      value={editEstimatedDuration}
                      onChange={(e) => setEditEstimatedDuration(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    แผนงานและขั้นตอนวิธีการซ่อม
                  </label>
                  <textarea
                    rows={2}
                    placeholder="เช่น 1. ตรวจสอบเซนเซอร์ 2. เปลี่ยนซีล 3. ทดสอบการทำงาน"
                    value={editActionPlan}
                    onChange={(e) => setEditActionPlan(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs leading-relaxed"
                  />
                </div>

                {/* Assigned Technicians */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    มอบหมายช่างผู้รับผิดชอบ
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {technicians.map(tech => (
                      <button
                        key={tech}
                        type="button"
                        onClick={() => {
                          if (editAssignedTechs.includes(tech)) {
                            setEditAssignedTechs(editAssignedTechs.filter(t => t !== tech));
                          } else {
                            setEditAssignedTechs([...editAssignedTechs, tech]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                          editAssignedTechs.includes(tech)
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {editAssignedTechs.includes(tech) ? `✓ ${tech}` : tech}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Spare parts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      สถานะอะไหล่
                    </label>
                    <select
                      value={editSparePartStatus}
                      onChange={(e) => setEditSparePartStatus(e.target.value as any)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="มีอะไหล่พร้อมในคลัง">มีอะไหล่พร้อมในคลัง (พร้อมทำทันที)</option>
                      <option value="เบิกอะไหล่ด่วน">เบิกอะไหล่ด่วนจากสโตร์กลาง</option>
                      <option value="สั่งซื้อรออะไหล่">สั่งซื้อรออะไหล่จากภายนอก</option>
                      <option value="ไม่ต้องใช้อะไหล่">ไม่ต้องใช้อะไหล่</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      หมายเหตุอะไหล่
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น ระบุเบอร์อะไหล่ หรือ spec"
                      value={editSparePartNotes}
                      onChange={(e) => setEditSparePartNotes(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    ข้อความสื่อสารถึงฝ่ายผลิต
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น นัดหมายหยุดเครื่องเวลา 14:00 น."
                    value={editMessageToProd}
                    onChange={(e) => setEditMessageToProd(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  บันทึกการแก้ไขข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: Delete Confirmation (ยืนยันการลบใบแจ้งซ่อม) */}
      {/* ========================================================================= */}
      {isDeleteModalOpen && requestToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                ยืนยันการลบใบแจ้งซ่อม?
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                คุณแน่ใจหรือไม่ว่าต้องการลบใบแจ้งซ่อมรายการนี้? ข้อมูลจะถูกลบออกจากระบบและ Cloud Firestore ทันที
              </p>

              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-left text-xs mb-5 space-y-1.5">
                <div>
                  <span className="text-slate-500">เลขที่ใบแจ้ง:</span>{' '}
                  <strong className="font-mono text-slate-800">{requestToDelete.id}</strong>
                </div>
                <div>
                  <span className="text-slate-500">เครื่องจักร/จุดแจ้งซ่อม:</span>{' '}
                  <strong className="text-slate-800">{requestToDelete.machineId}</strong> ({requestToDelete.machineName || '-'})
                </div>
                {requestToDelete.locationPoint && (
                  <div>
                    <span className="text-slate-500">จุดที่พบปัญหา:</span>{' '}
                    <span className="text-slate-700 font-semibold">{requestToDelete.locationPoint}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500">อาการ/ปัญหา:</span>{' '}
                  <span className="text-slate-700">{requestToDelete.problemTitle}</span>
                </div>
                <div>
                  <span className="text-slate-500">ผู้แจ้ง:</span>{' '}
                  <span className="text-slate-700">{requestToDelete.requesterName}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { setIsDeleteModalOpen(false); setRequestToDelete(null); }}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  ยืนยันลบข้อมูล
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
