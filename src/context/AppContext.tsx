import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  Machine, PMPlan, PMScheduleItem, OperationScheduleItem, 
  RepairLog, ImprovementProject, SystemSettings, ScheduleItem, SetupLog, Employee,
  TechnicianLeave, SparePart, CD5Project, UserAccount, UserRole,
  WorkRequest, EngineeringResponse, WorkRequestStatus,
  WorkOrder
} from '../types';
import { 
  PRELOADED_MACHINES, PRELOADED_TECHNICIANS, PRELOADED_PM_PLANS, 
  PRELOADED_REPAIRS, PRELOADED_IMPROVEMENTS, PRELOADED_SCHEDULES, PRELOADED_SETUPS,
  PRELOADED_SPARE_PARTS, PRELOADED_CD5_PROJECTS
} from '../data/preloaded';
import { PRELOADED_WORK_REQUESTS } from '../data/preloadedRequests';
import { PRELOADED_WORK_ORDERS } from '../data/preloadedWorkOrders';
import { evaluateWorkOrderReadiness, generateWorkOrderNo } from '../utils/workOrderUtils';
import { DEFAULT_USER_ACCOUNTS } from '../data/preloadedUsers';
import { 
  loadDatabaseFromFirebase, 
  saveDatabaseToFirebase, 
  subscribeToFirebaseSync, 
  FirebaseSyncStatus,
  AppDatabaseState,
  isCloudQuotaExceeded,
  markCloudQuotaExceeded,
  resetCloudQuotaStatus,
  isQuotaExceededError
} from '../services/firebaseDb';

export interface RepairFilterNavigation {
  targetRepairIds?: string[];
  filterTitle?: string;
  sourcePage?: number;
  isBaseline?: boolean;
  baselineYear?: number;
  baselineBDMin?: number;
  baselineCount?: number;
}

export interface AppContextType {
  activePage: number;
  setActivePage: React.Dispatch<React.SetStateAction<number>>;
  repairNavigationFilter: RepairFilterNavigation | null;
  setRepairNavigationFilter: React.Dispatch<React.SetStateAction<RepairFilterNavigation | null>>;
  navigateToRepairs: (filter: RepairFilterNavigation) => void;
  clearRepairNavigationFilter: () => void;
  machines: Machine[];
  setMachines: React.Dispatch<React.SetStateAction<Machine[]>>;
  technicians: string[];
  setTechnicians: React.Dispatch<React.SetStateAction<string[]>>;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  pmPlans: PMPlan[];
  setPmPlans: React.Dispatch<React.SetStateAction<PMPlan[]>>;
  schedules: ScheduleItem[];
  setSchedules: React.Dispatch<React.SetStateAction<ScheduleItem[]>>;
  repairs: RepairLog[];
  setRepairs: React.Dispatch<React.SetStateAction<RepairLog[]>>;
  improvements: ImprovementProject[];
  setImprovements: React.Dispatch<React.SetStateAction<ImprovementProject[]>>;
  setupLogs: SetupLog[];
  setSetupLogs: React.Dispatch<React.SetStateAction<SetupLog[]>>;
  leaves: TechnicianLeave[];
  setLeaves: React.Dispatch<React.SetStateAction<TechnicianLeave[]>>;
  settings: SystemSettings;
  setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
  spareParts: SparePart[];
  setSpareParts: React.Dispatch<React.SetStateAction<SparePart[]>>;
  cd5Projects: CD5Project[];
  setCd5Projects: React.Dispatch<React.SetStateAction<CD5Project[]>>;
  users: UserAccount[];
  setUsers: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  workRequests: WorkRequest[];
  setWorkRequests: React.Dispatch<React.SetStateAction<WorkRequest[]>>;
  workOrders: WorkOrder[];
  setWorkOrders: React.Dispatch<React.SetStateAction<WorkOrder[]>>;
  addWorkOrder: (wo: Omit<WorkOrder, 'id' | 'createdAt'>) => WorkOrder;
  updateWorkOrder: (id: string, updates: Partial<WorkOrder>) => void;
  deleteWorkOrder: (id: string) => void;
  releaseWorkOrder: (id: string, operatorName?: string) => { success: boolean; message: string };
  closeWorkOrder: (id: string, completionData: {
    actualDurationMins?: number;
    workSummaryNotes?: string;
    rootCauseWhy1?: string;
    correctiveAction?: string;
    acceptedBy: string;
    satisfactionRating?: number;
    handoverNotes?: string;
  }) => void;
  createEmergencyBreakdownWorkOrder: (params: {
    machineId: string;
    title: string;
    symptoms: string;
    leadTech: string;
    targetDurationMins?: number;
    lotoTag?: string;
  }) => WorkOrder;
  updateMachinePlannedTime: (machineId: string, plannedHours: number) => void;
  updateAllMachinesPlannedTime: (plannedHours: number) => void;
  addWorkRequest: (req: Omit<WorkRequest, 'id' | 'createdAt' | 'status'>) => WorkRequest;
  addWorkRequestsBatch: (reqs: Array<Omit<WorkRequest, 'id' | 'createdAt' | 'status'>>) => WorkRequest[];
  updateWorkRequest: (id: string, updates: Partial<WorkRequest>) => void;
  deleteWorkRequest: (id: string) => void;
  deleteWorkRequestsBatch: (ids: string[]) => void;
  respondToWorkRequest: (id: string, response: EngineeringResponse, newStatus?: WorkRequestStatus) => void;
  completeWorkRequest: (id: string, summary: { actualDurationMins: number; repairSummaryNotes: string }) => void;
  acceptWorkRequestHandover: (id: string, handover: { acceptedBy: string; handoverNotes: string; satisfactionRating: number }) => void;
  currentUser: UserAccount | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserAccount | null>>;
  login: (username: string, password: string) => { success: boolean; message?: string };
  loginAsViewer: () => void;
  loginAsProduction: () => void;
  logout: () => void;
  addUser: (account: Omit<UserAccount, 'id' | 'createdAt'>) => { success: boolean; message?: string };
  updateUser: (id: string, updates: Partial<UserAccount>) => { success: boolean; message?: string };
  deleteUser: (id: string) => { success: boolean; message?: string };
  isAdmin: boolean;
  isTechnician: boolean;
  isProduction: boolean;
  isViewer: boolean;
  canEdit: boolean;
  canDelete: boolean;
  firebaseStatus: FirebaseSyncStatus;
  lastFirebaseSync: string | null;
  syncWithFirebaseNow: () => Promise<boolean>;
  retestFirebaseQuota: () => Promise<boolean>;
  isQuotaExceeded: boolean;
  resetToDefaults: () => void;
  exportData: () => string;
  importData: (jsonStr: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePage, setActivePage] = useState<number>(3);
  const [repairNavigationFilter, setRepairNavigationFilter] = useState<RepairFilterNavigation | null>(null);

  const navigateToRepairs = (filter: RepairFilterNavigation) => {
    setRepairNavigationFilter(filter);
    setActivePage(4);
  };

  const clearRepairNavigationFilter = () => {
    setRepairNavigationFilter(null);
  };

  const [machines, setMachines] = useState<Machine[]>([]);
  const [technicians, setTechnicians] = useState<string[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pmPlans, setPmPlans] = useState<PMPlan[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [repairs, setRepairs] = useState<RepairLog[]>([]);
  const [improvements, setImprovements] = useState<ImprovementProject[]>([]);
  const [setupLogs, setSetupLogs] = useState<SetupLog[]>([]);
  const [leaves, setLeaves] = useState<TechnicianLeave[]>([]);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [cd5Projects, setCd5Projects] = useState<CD5Project[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [workRequests, setWorkRequests] = useState<WorkRequest[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const storedId = localStorage.getItem('foodfab_current_user_id');
      const storedUsersStr = localStorage.getItem('maint_users');
      if (storedId && storedUsersStr) {
        const parsedUsers: UserAccount[] = JSON.parse(storedUsersStr);
        const match = parsedUsers.find(u => u.id === storedId);
        if (match) return match;
      }
    } catch {
      // ignore
    }
    return null;
  });
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [firebaseStatus, setFirebaseStatus] = useState<FirebaseSyncStatus>('syncing');
  const [lastFirebaseSync, setLastFirebaseSync] = useState<string | null>(null);

  // Synchronization protection refs to completely prevent infinite write loops
  const isApplyingRemoteRef = useRef<boolean>(false);
  const lastSavedJsonRef = useRef<string>('');
  const isWritingCloudRef = useRef<boolean>(false);
  const hasPendingSaveRef = useRef<boolean>(false);
  const pendingDataRef = useRef<AppDatabaseState | null>(null);
  
  const [settings, setSettings] = useState<SystemSettings>({
    workingHoursPerDay: 8, // 8 hours * 60 = 480 mins
    defaultPlannedProductionHours: 600, // ค่ามาตรฐาน 600 ชม./เดือน (ตามเอกสารมาตรฐาน TPM CPRAM PM Pillar)
    lineNotifyEnabled: false,
    lineNotifyToken: '',
    stdMttr: {
      "RIM": 60,
      "TOC": 45,
      "VAC": 90,
      "FFS": 60,
      "ATS": 60,
      "MTD": 30,
      "XRA": 45,
      "RFD": 45,
      "BAN": 45,
      "BCF": 120,
      "CDU": 120,
      "TLP": 30,
      "INK": 30,
      "STK": 45,
      "OFR": 90,
      "RJT": 30,
      "PAC": 60,
    }
  });

  // Helper to ensure machine IDs are strictly unique, fix legacy duplicates, and clear model/vendor/serialNumber fields
  const isLegacyMachinesList = (list?: Machine[]): boolean => {
    if (!list || list.length === 0) return true;
    if (list.length !== 182) return true;
    if (list.some(m => m.id === 'MCH-001' || m.id === 'CNC-001' || m.id === 'CHL-001' || m.id === 'PMP-005')) return true;
    return false;
  };

  const sanitizeMachines = (machineList: Machine[]): Machine[] => {
    const targetList = isLegacyMachinesList(machineList) ? PRELOADED_MACHINES : machineList;
    const seen = new Set<string>();
    const shouldStrip = typeof window !== 'undefined' ? localStorage.getItem('cpram_cleared_machine_fields_v1') !== 'migrated' : true;
    return targetList.map((m, idx) => {
      let id = m.id;
      // Fix known duplicates from original CPRAM registry sheet where Assembly room reused codes
      if (m.orderNo === 121 && id === 'TOC01') id = 'TOC-AS01';
      else if (m.orderNo === 125 && id === 'TOC02') id = 'TOC-AS02';
      else if (m.orderNo === 134 && (id === 'TOC3' || id === 'TOC03')) id = 'TOC-AS03';
      else if (m.orderNo === 135 && id === 'TLP01') id = 'TLP-AS01';
      else if (m.orderNo === 136 && id === 'TLP02') id = 'TLP-AS02';
      else if (m.orderNo === 137 && id === 'TLP03') id = 'TLP-AS03';

      // General fallback for any unexpected duplicates to guarantee uniqueness
      if (seen.has(id)) {
        id = `${id}-${m.orderNo || idx + 1}`;
      }
      seen.add(id);

      if (shouldStrip) {
        return {
          ...m,
          id,
          model: '',
          vendor: '',
          serialNumber: ''
        };
      }
      return id !== m.id ? { ...m, id } : m;
    });
  };

  // Helper to detect artificial / placeholder technician names
  const isFakeTechnician = (name: any): boolean => {
    if (!name || typeof name !== 'string') return false;
    const t = name.trim();
    if (['ช่างสมชาย', 'ช่างวิชัย', 'ช่างประสิทธิ์', 'Outsource (ซัพพลายเออร์)', 'ช่างกิตติศักดิ์'].includes(t)) return true;
    if (/^ช่าง\s*\d+$/.test(t)) return true;
    return false;
  };

  // Helper to ensure all default user accounts (including 17 factory technicians) exist and no fake users linger
  const ensureAllDefaultUsers = (existingUsers?: UserAccount[] | null): UserAccount[] => {
    if (!Array.isArray(existingUsers) || existingUsers.length === 0) {
      return DEFAULT_USER_ACCOUNTS;
    }
    const filtered = existingUsers.filter(u => {
      if (!u || !u.name) return false;
      if (isFakeTechnician(u.name)) return false;
      if (u.username && /^tech\d+$/.test(u.username)) return false;
      return true;
    });

    const map = new Map<string, UserAccount>();
    DEFAULT_USER_ACCOUNTS.forEach(u => map.set(u.id, u));
    filtered.forEach(u => {
      if (!map.has(u.id)) {
        map.set(u.id, u);
      } else {
        map.set(u.id, { ...map.get(u.id)!, ...u });
      }
    });
    return Array.from(map.values());
  };

  // Helper to ensure only genuine plant technician names exist
  const sanitizeTechnicians = (techs?: string[] | null): string[] => {
    if (!Array.isArray(techs) || techs.length === 0) {
      return PRELOADED_TECHNICIANS;
    }
    const filtered = techs.filter(t => typeof t === 'string' && t.trim() && !isFakeTechnician(t));
    if (filtered.length === 0) {
      return PRELOADED_TECHNICIANS;
    }
    const set = new Set([...PRELOADED_TECHNICIANS, ...filtered]);
    return Array.from(set).filter(t => !isFakeTechnician(t));
  };

  // Helper to ensure repair history only uses plant technicians
  const sanitizeRepairs = (reps: any[] | undefined | null): RepairLog[] => {
    if (!Array.isArray(reps) || reps.length === 0) {
      return PRELOADED_REPAIRS;
    }
    const hasCpram = reps.some(r => r.id && r.id.startsWith('rep-cpram-'));
    const sourceReps = (!hasCpram && reps.every(r => r.id === 'rep-01' || r.id === 'rep-02' || r.id === 'rep-03' || r.id === 'rep-04'))
      ? PRELOADED_REPAIRS
      : reps;

    return sourceReps.map((r, idx) => {
      let tech = r.technician;
      if (!tech || isFakeTechnician(tech)) {
        tech = PRELOADED_TECHNICIANS[idx % PRELOADED_TECHNICIANS.length];
      }
      let techList = Array.isArray(r.technicians) ? r.technicians : [tech];
      techList = techList.map(t => isFakeTechnician(t) ? tech : t).filter(t => !isFakeTechnician(t));
      if (techList.length === 0) techList = [tech];
      return {
        ...r,
        technician: tech,
        technicians: techList
      };
    });
  };

  // Helper to ensure schedules only use plant technicians
  const sanitizeSchedules = (scheds: any[] | undefined | null): ScheduleItem[] => {
    if (!Array.isArray(scheds) || scheds.length === 0) {
      return PRELOADED_SCHEDULES;
    }
    return scheds.map((s, idx) => {
      let tech = s.technician;
      if (!tech || isFakeTechnician(tech)) {
        tech = PRELOADED_TECHNICIANS[idx % PRELOADED_TECHNICIANS.length];
      }
      let techList = Array.isArray(s.technicians) ? s.technicians : [tech];
      techList = techList.map(t => isFakeTechnician(t) ? tech : t).filter(t => !isFakeTechnician(t));
      if (techList.length === 0) techList = [tech];
      return {
        ...s,
        technician: tech,
        technicians: techList
      };
    });
  };

  // Helper to ensure leaves only use plant technicians
  const sanitizeLeaves = (lvs: any[] | undefined | null): any[] => {
    if (!Array.isArray(lvs) || lvs.length === 0) {
      return [
        { id: 'lv-001', technician: 'ช่างอุ้ย', date: '2026-06-08', type: 'ลากิจ', note: 'ติดต่อราชการครอบครัว' },
        { id: 'lv-002', technician: 'ช่างโอเว่น', date: '2026-06-11', type: 'ลาป่วย', note: 'ปวดศีรษะ เป็นไข้หวัด' },
        { id: 'lv-003', technician: 'ช่างปอ', date: '2026-06-12', type: 'ลาพักร้อน', note: 'พักผ่อนประจำปีต่างจังหวัด (ภูเก็ต)' },
        { id: 'lv-004', technician: 'ช่างเซฟ', date: '2026-06-14', type: 'วันหยุดประจำสัปดาห์', note: 'สลับวันหยุดประจำโรงงาน' },
      ];
    }
    return lvs.map((lv, idx) => {
      let tech = lv.technician;
      if (!tech || isFakeTechnician(tech)) {
        tech = PRELOADED_TECHNICIANS[idx % PRELOADED_TECHNICIANS.length];
      }
      return { ...lv, technician: tech };
    });
  };

  // Helper to ensure only genuine plant technician and system accounts exist
  const sanitizeUsers = (currentList?: UserAccount[]): UserAccount[] => {
    if (!currentList || !Array.isArray(currentList) || currentList.length === 0) {
      return DEFAULT_USER_ACCOUNTS;
    }
    const filtered = currentList.filter(u => {
      if (!u) return false;
      if (u.id === 'usr-tech-01' || u.id === 'usr-tech-02') return false;
      if (isFakeTechnician(u.name)) return false;
      if (u.name.includes('สมชาย') || u.name.includes('วิชัย') || u.name.includes('ประสิทธิ์')) return false;
      if (/^ช่าง\s*\d+/.test(u.name)) return false;
      if (/^tech[1-9]\d*$/.test(u.username)) return false;
      return true;
    });

    const merged = [...filtered];
    for (const def of DEFAULT_USER_ACCOUNTS) {
      if (!merged.some(u => u.username.toLowerCase() === def.username.toLowerCase())) {
        merged.push(def);
      }
    }
    return merged;
  };

  // Helper to ensure sequenceNo is mapped into ticketNo and all IDs are strictly unique
  const sanitizeWorkRequests = (reqList?: WorkRequest[]): WorkRequest[] => {
    if (!reqList || !Array.isArray(reqList)) return [];
    const seenIds = new Set<string>();

    return reqList.map((r, idx) => {
      // เอาลำดับที่ ไปใส่เลขแจ้งซ่อม: if ticketNo is missing or auto-generated, fallback to sequenceNo
      let ticketNo = r.ticketNo;
      if (r.sequenceNo !== undefined && (!ticketNo || ticketNo.startsWith('REQ-'))) {
        ticketNo = String(r.sequenceNo);
      }

      // Ensure each item has a guaranteed unique id
      let id = r.id;
      if (!id || seenIds.has(id)) {
        const yearMonth = r.requestDate ? r.requestDate.slice(0, 7).replace('-', '') : new Date().toISOString().slice(0, 7).replace('-', '');
        const nextSuffix = String(idx + 1).padStart(3, '0');
        const randTag = Math.random().toString(36).substring(2, 6);
        id = `${r.id || `REQ-${yearMonth}`}-${nextSuffix}-${randTag}`;
      }
      seenIds.add(id);

      return {
        ...r,
        id,
        ticketNo
      };
    });
  };

  // Load from Firebase Cloud Firestore or fall back to Server / LocalStorage / preloads
  useEffect(() => {
    const initDb = async () => {
      let loadedFromCloud = false;

      // 1. Check if Cloud Firestore quota is already marked as exceeded
      if (isCloudQuotaExceeded()) {
        setFirebaseStatus('quota-exceeded');
      } else {
        // Try loading from Firebase Cloud Firestore first
        try {
          setFirebaseStatus('syncing');
          const cloudData = await loadDatabaseFromFirebase();
          if (cloudData && cloudData.machines && cloudData.machines.length > 0) {
            setMachines(sanitizeMachines(cloudData.machines));
            setTechnicians(cloudData.technicians && cloudData.technicians.length > 0 ? cloudData.technicians : PRELOADED_TECHNICIANS);
            setEmployees(cloudData.employees || []);
            setPmPlans(cloudData.pmPlans || PRELOADED_PM_PLANS);
            setSchedules(cloudData.schedules || PRELOADED_SCHEDULES);
            setRepairs(sanitizeRepairs(cloudData.repairs));
            setImprovements(cloudData.improvements || PRELOADED_IMPROVEMENTS);
            setSetupLogs(cloudData.setupLogs || PRELOADED_SETUPS);
            setSpareParts(cloudData.spareParts || PRELOADED_SPARE_PARTS);
            setLeaves(cloudData.leaves || []);
            setCd5Projects(cloudData.cd5Projects && cloudData.cd5Projects.length > 0 ? cloudData.cd5Projects : PRELOADED_CD5_PROJECTS);
            setWorkRequests(sanitizeWorkRequests(cloudData.workRequests && cloudData.workRequests.length > 0 ? cloudData.workRequests : PRELOADED_WORK_REQUESTS));
            setWorkOrders(cloudData.workOrders && cloudData.workOrders.length > 0 ? cloudData.workOrders : PRELOADED_WORK_ORDERS);
            const userList = ensureAllDefaultUsers(cloudData.users);
            setUsers(userList);
            
            // Check saved session
            const storedUserId = localStorage.getItem('foodfab_current_user_id');
            if (storedUserId) {
              const matched = userList.find(u => u.id === storedUserId);
              if (matched) setCurrentUser(matched);
            }

            if (cloudData.settings && Object.keys(cloudData.settings).length > 0) {
              setSettings(cloudData.settings);
            }

            lastSavedJsonRef.current = JSON.stringify(cloudData);
            setFirebaseStatus('connected');
            setLastFirebaseSync(new Date().toLocaleTimeString('th-TH'));
            setIsLoaded(true);
            loadedFromCloud = true;
            return;
          }
        } catch (cloudErr) {
          if (isQuotaExceededError(cloudErr)) {
            await markCloudQuotaExceeded();
            setFirebaseStatus('quota-exceeded');
          } else {
            console.warn("Cloud Firestore initial load note:", cloudErr);
          }
        }
      }

      // 2. Fallback: Load from Server or LocalStorage/preloads
      let resolvedData: AppDatabaseState | null = null;
      try {
        const response = await fetch("/api/db");
        if (response.ok) {
          const serverData = await response.json();
          if (serverData && serverData.machines) {
            const machs = (!serverData.machines || serverData.machines.length === 0)
              ? sanitizeMachines(PRELOADED_MACHINES)
              : sanitizeMachines(serverData.machines);
            const techs = serverData.technicians || PRELOADED_TECHNICIANS;
            const emps = serverData.employees || [];
            const plans = serverData.pmPlans || PRELOADED_PM_PLANS;
            const scheds = serverData.schedules || PRELOADED_SCHEDULES;
            const reps = sanitizeRepairs(serverData.repairs);
            const imps = serverData.improvements || PRELOADED_IMPROVEMENTS;
            const setups = serverData.setupLogs || PRELOADED_SETUPS;
            const parts = serverData.spareParts || PRELOADED_SPARE_PARTS;
            const lvs = serverData.leaves || [];
            const cd5 = serverData.cd5Projects || PRELOADED_CD5_PROJECTS;
            const reqs = sanitizeWorkRequests(serverData.workRequests || PRELOADED_WORK_REQUESTS);
            const wos = serverData.workOrders || PRELOADED_WORK_ORDERS;
            const userList = ensureAllDefaultUsers(serverData.users);
            const stt = serverData.settings || settings;

            setMachines(machs);
            setTechnicians(techs);
            setEmployees(emps);
            setPmPlans(plans);
            setSchedules(scheds);
            setRepairs(reps);
            setImprovements(imps);
            setSetupLogs(setups);
            setSpareParts(parts);
            setLeaves(lvs);
            setCd5Projects(cd5);
            setWorkRequests(reqs);
            setWorkOrders(wos);
            setUsers(userList);
            setSettings(stt);

            const storedUserId = localStorage.getItem('foodfab_current_user_id');
            if (storedUserId) {
              const matched = userList.find(u => u.id === storedUserId);
              if (matched) setCurrentUser(matched);
            }

            resolvedData = {
              machines: machs,
              technicians: techs,
              employees: emps,
              pmPlans: plans,
              schedules: scheds,
              repairs: reps,
              improvements: imps,
              setupLogs: setups,
              spareParts: parts,
              leaves: lvs,
              cd5Projects: cd5,
              workRequests: reqs,
              workOrders: wos,
              users: userList,
              settings: stt
            };
          }
        }
      } catch (err) {
        console.error("Failed to load database from server, falling back to localStorage", err);
      }

      // 3. LocalStorage fallback if server had no data
      if (!resolvedData) {
        try {
          const storedMachines = localStorage.getItem('maint_machines');
          const storedTechs = localStorage.getItem('maint_technicians');
          const storedPlans = localStorage.getItem('maint_pm_plans');
          const storedSchedules = localStorage.getItem('maint_schedule');
          const storedRepairs = localStorage.getItem('maint_repairs');
          const storedImprovements = localStorage.getItem('maint_improvements');
          const storedSetups = localStorage.getItem('maint_setup_logs');
          const storedSettings = localStorage.getItem('maint_settings');
          const storedEmployees = localStorage.getItem('maint_employees');
          const storedSpareParts = localStorage.getItem('maint_spare_parts');
          const storedLeaves = localStorage.getItem('maint_leaves');
          const storedCd5 = localStorage.getItem('maint_cd5_projects');
          const storedWorkRequests = localStorage.getItem('maint_work_requests');
          const storedWorkOrders = localStorage.getItem('maint_work_orders');
          const storedUsers = localStorage.getItem('maint_users');

          const machs = storedMachines
            ? sanitizeMachines(JSON.parse(storedMachines))
            : sanitizeMachines(PRELOADED_MACHINES);
          const techs = storedTechs ? JSON.parse(storedTechs) : PRELOADED_TECHNICIANS;
          const emps = storedEmployees ? JSON.parse(storedEmployees) : PRELOADED_TECHNICIANS.map((tech, idx) => ({
            id: `ENG-${String(idx + 1).padStart(3, '0')}`,
            name: tech,
            position: 'ช่างบำรุงรักษา',
            password: '1234'
          }));
          const plans = storedPlans ? JSON.parse(storedPlans) : PRELOADED_PM_PLANS;
          const scheds = storedSchedules ? JSON.parse(storedSchedules) : PRELOADED_SCHEDULES;
          const reps = sanitizeRepairs(storedRepairs ? JSON.parse(storedRepairs) : undefined);
          const imps = storedImprovements ? JSON.parse(storedImprovements) : PRELOADED_IMPROVEMENTS;
          const setups = storedSetups ? JSON.parse(storedSetups) : PRELOADED_SETUPS;
          const parts = storedSpareParts ? JSON.parse(storedSpareParts) : PRELOADED_SPARE_PARTS;
          const cd5 = storedCd5 ? JSON.parse(storedCd5) : PRELOADED_CD5_PROJECTS;
          const reqs = storedWorkRequests ? JSON.parse(storedWorkRequests) : PRELOADED_WORK_REQUESTS;
          const wos = storedWorkOrders ? JSON.parse(storedWorkOrders) : PRELOADED_WORK_ORDERS;
          const userList: UserAccount[] = ensureAllDefaultUsers(storedUsers ? JSON.parse(storedUsers) : DEFAULT_USER_ACCOUNTS);
          const lvs = storedLeaves ? JSON.parse(storedLeaves) : [
            { id: 'lv-001', technician: 'ช่างอุ้ย', date: '2026-06-08', type: 'ลากิจ' as const, note: 'ติดต่อราชการครอบครัว' },
            { id: 'lv-002', technician: 'ช่างโอเว่น', date: '2026-06-11', type: 'ลาป่วย' as const, note: 'ปวดศีรษะ เป็นไข้หวัด' },
            { id: 'lv-003', technician: 'ช่างปอ', date: '2026-06-12', type: 'ลาพักร้อน' as const, note: 'พักผ่อนประจำปีต่างจังหวัด (ภูเก็ต)' },
            { id: 'lv-004', technician: 'ช่างเซฟ', date: '2026-06-14', type: 'วันหยุดประจำสัปดาห์' as const, note: 'สลับวันหยุดประจำโรงงาน' },
          ];
          const stt = storedSettings ? JSON.parse(storedSettings) : settings;

          setMachines(machs);
          setTechnicians(techs);
          setEmployees(emps);
          setPmPlans(plans);
          setSchedules(scheds);
          setRepairs(reps);
          setImprovements(imps);
          setSetupLogs(setups);
          setSpareParts(parts);
          setLeaves(lvs);
          setCd5Projects(cd5);
          setWorkRequests(reqs);
          setWorkOrders(wos);
          setUsers(userList);
          setSettings(stt);

          const storedUserId = localStorage.getItem('foodfab_current_user_id');
          if (storedUserId) {
            const matched = userList.find(u => u.id === storedUserId);
            if (matched) setCurrentUser(matched);
          }

          resolvedData = {
            machines: machs,
            technicians: techs,
            employees: emps,
            pmPlans: plans,
            schedules: scheds,
            repairs: reps,
            improvements: imps,
            setupLogs: setups,
            spareParts: parts,
            leaves: lvs,
            cd5Projects: cd5,
            workRequests: reqs,
            workOrders: wos,
            users: userList,
            settings: stt
          };
        } catch (e) {
          console.error("Error reading localStorage values. Resetting to defaults.", e);
        }
      }

      if (resolvedData) {
        lastSavedJsonRef.current = JSON.stringify(resolvedData);
      }
      try {
        localStorage.setItem('cpram_cleared_machine_fields_v1', 'migrated');
      } catch (e) {
        // ignore
      }
      setIsLoaded(true);

      // If Cloud Firestore was empty, automatically seed all initial factory data to Cloud Firestore!
      if (!loadedFromCloud && resolvedData && !isCloudQuotaExceeded()) {
        try {
          await saveDatabaseToFirebase(resolvedData);
          lastSavedJsonRef.current = JSON.stringify(resolvedData);
          if (isCloudQuotaExceeded()) {
            setFirebaseStatus('quota-exceeded');
          } else {
            setFirebaseStatus('connected');
            setLastFirebaseSync(new Date().toLocaleTimeString('th-TH'));
          }
          console.log("Successfully seeded initial data to Cloud Firestore.");
        } catch (seedErr) {
          if (isQuotaExceededError(seedErr)) {
            await markCloudQuotaExceeded();
            setFirebaseStatus('quota-exceeded');
          } else {
            console.warn("Could not seed to Cloud Firestore:", seedErr);
            setFirebaseStatus('offline');
          }
        }
      } else if (isCloudQuotaExceeded()) {
        setFirebaseStatus('quota-exceeded');
      }
    };

    initDb();
  }, []);

  // Save changes to LocalStorage, Server, and Cloud Firestore only AFTER initial load is done
  useEffect(() => {
    if (!isLoaded) return;
    if (isApplyingRemoteRef.current) return;

    // Save to localStorage as local backup safely
    try {
      localStorage.setItem('maint_machines', JSON.stringify(machines));
      localStorage.setItem('maint_technicians', JSON.stringify(technicians));
      localStorage.setItem('maint_employees', JSON.stringify(employees));
      localStorage.setItem('maint_pm_plans', JSON.stringify(pmPlans));
      localStorage.setItem('maint_schedule', JSON.stringify(schedules));
      localStorage.setItem('maint_repairs', JSON.stringify(repairs));
      localStorage.setItem('maint_improvements', JSON.stringify(improvements));
      localStorage.setItem('maint_setup_logs', JSON.stringify(setupLogs));
      localStorage.setItem('maint_leaves', JSON.stringify(leaves));
      localStorage.setItem('maint_spare_parts', JSON.stringify(spareParts));
      localStorage.setItem('maint_cd5_projects', JSON.stringify(cd5Projects));
      localStorage.setItem('maint_work_requests', JSON.stringify(workRequests));
      localStorage.setItem('maint_work_orders', JSON.stringify(workOrders));
      localStorage.setItem('maint_settings', JSON.stringify(settings));
      localStorage.setItem('maint_users', JSON.stringify(users));
    } catch (e) {
      console.warn("LocalStorage quota warning:", e);
    }

    const dataToSave: AppDatabaseState = {
      machines,
      technicians,
      employees,
      pmPlans,
      schedules,
      repairs,
      improvements,
      setupLogs,
      leaves,
      spareParts,
      cd5Projects,
      workRequests,
      workOrders,
      settings,
      users
    };

    // Check if the data has actually changed compared to the last saved state
    const currentJson = JSON.stringify(dataToSave);
    if (currentJson === lastSavedJsonRef.current) {
      return;
    }

    const syncToBackends = async () => {
      // 1. Save to local Express server
      try {
        await fetch("/api/db", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: currentJson
        });
      } catch (error) {
        console.error("Error syncing with LAN server:", error);
      }

      // If Cloud Firestore quota is reached, do not make cloud calls and use local storage safely
      if (isCloudQuotaExceeded()) {
        lastSavedJsonRef.current = currentJson;
        setFirebaseStatus('quota-exceeded');
        return;
      }

      // 2. Save to Cloud Firestore with queueing so rapid edits/deletes are never dropped
      if (isWritingCloudRef.current) {
        hasPendingSaveRef.current = true;
        pendingDataRef.current = dataToSave;
        return;
      }

      const executeSave = async (payload: AppDatabaseState, jsonStr: string) => {
        isWritingCloudRef.current = true;
        hasPendingSaveRef.current = false;
        try {
          setFirebaseStatus('syncing');
          await saveDatabaseToFirebase(payload);
          lastSavedJsonRef.current = jsonStr;
          if (isCloudQuotaExceeded()) {
            setFirebaseStatus('quota-exceeded');
          } else {
            setFirebaseStatus('connected');
            setLastFirebaseSync(new Date().toLocaleTimeString('th-TH'));
          }
        } catch (cloudErr) {
          if (isQuotaExceededError(cloudErr)) {
            await markCloudQuotaExceeded();
            setFirebaseStatus('quota-exceeded');
          } else {
            console.warn("Firebase Cloud Firestore sync error:", cloudErr);
            setFirebaseStatus('offline');
          }
        } finally {
          isWritingCloudRef.current = false;
          if (hasPendingSaveRef.current && pendingDataRef.current && !isCloudQuotaExceeded()) {
            const nextPayload = pendingDataRef.current;
            pendingDataRef.current = null;
            hasPendingSaveRef.current = false;
            executeSave(nextPayload, JSON.stringify(nextPayload));
          }
        }
      };

      await executeSave(dataToSave, currentJson);
    };

    const timerId = setTimeout(syncToBackends, 1500);
    return () => clearTimeout(timerId);
  }, [
    machines, technicians, employees, pmPlans, schedules,
    repairs, improvements, setupLogs, leaves, spareParts, cd5Projects, workRequests, workOrders, settings, users, isLoaded
  ]);

  // Real-time listener for multi-user collaboration via Cloud Firestore
  useEffect(() => {
    if (!isLoaded) return;

    const unsubscribe = subscribeToFirebaseSync(async () => {
      try {
        const cloudData = await loadDatabaseFromFirebase();
        if (cloudData && cloudData.machines && cloudData.machines.length > 0) {
          const newJson = JSON.stringify(cloudData);
          if (newJson === lastSavedJsonRef.current) {
            return;
          }

          // Lock autosave to avoid saving back identical state
          isApplyingRemoteRef.current = true;
          lastSavedJsonRef.current = newJson;

          setMachines(sanitizeMachines(cloudData.machines));
          setTechnicians(cloudData.technicians && cloudData.technicians.length > 0 ? cloudData.technicians : PRELOADED_TECHNICIANS);
          setEmployees(cloudData.employees || []);
          setPmPlans(cloudData.pmPlans || PRELOADED_PM_PLANS);
          setSchedules(cloudData.schedules || PRELOADED_SCHEDULES);
          setRepairs(sanitizeRepairs(cloudData.repairs));
          setImprovements(cloudData.improvements || PRELOADED_IMPROVEMENTS);
          setSetupLogs(cloudData.setupLogs || PRELOADED_SETUPS);
          setSpareParts(cloudData.spareParts || PRELOADED_SPARE_PARTS);
          setLeaves(cloudData.leaves || []);
          if (cloudData.cd5Projects && cloudData.cd5Projects.length > 0) {
            setCd5Projects(cloudData.cd5Projects);
          }
          if (cloudData.workRequests && cloudData.workRequests.length > 0) {
            setWorkRequests(sanitizeWorkRequests(cloudData.workRequests));
          }
          if (cloudData.workOrders && cloudData.workOrders.length > 0) {
            setWorkOrders(cloudData.workOrders);
          }
          if (cloudData.users && cloudData.users.length > 0) {
            setUsers(ensureAllDefaultUsers(cloudData.users));
          }
          if (cloudData.settings && Object.keys(cloudData.settings).length > 0) {
            setSettings(cloudData.settings);
          }
          setFirebaseStatus('connected');
          setLastFirebaseSync(new Date().toLocaleTimeString('th-TH'));

          // Release lock after React completes batch render
          setTimeout(() => {
            isApplyingRemoteRef.current = false;
          }, 600);
        }
      } catch (syncErr) {
        console.warn("Realtime Firestore listener update warning:", syncErr);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isLoaded]);

  // Manual one-click trigger to force-sync with Cloud Firestore
  const syncWithFirebaseNow = async (): Promise<boolean> => {
    if (isCloudQuotaExceeded()) {
      setFirebaseStatus('quota-exceeded');
      return false;
    }
    try {
      setFirebaseStatus('syncing');
      const cloudData = await loadDatabaseFromFirebase();
      if (cloudData && cloudData.machines && cloudData.machines.length > 0) {
        setMachines(sanitizeMachines(cloudData.machines));
        setTechnicians(cloudData.technicians && cloudData.technicians.length > 0 ? cloudData.technicians : PRELOADED_TECHNICIANS);
        setEmployees(cloudData.employees || []);
        setPmPlans(cloudData.pmPlans || PRELOADED_PM_PLANS);
        setSchedules(cloudData.schedules || PRELOADED_SCHEDULES);
        setRepairs(sanitizeRepairs(cloudData.repairs));
        setImprovements(cloudData.improvements || PRELOADED_IMPROVEMENTS);
        setSetupLogs(cloudData.setupLogs || PRELOADED_SETUPS);
        setSpareParts(cloudData.spareParts || PRELOADED_SPARE_PARTS);
        setLeaves(cloudData.leaves || []);
        setCd5Projects(cloudData.cd5Projects || PRELOADED_CD5_PROJECTS);
        if (cloudData.workRequests && cloudData.workRequests.length > 0) {
          setWorkRequests(sanitizeWorkRequests(cloudData.workRequests));
        }
        if (cloudData.workOrders && cloudData.workOrders.length > 0) {
          setWorkOrders(cloudData.workOrders);
        }
        if (cloudData.users && cloudData.users.length > 0) {
          setUsers(cloudData.users);
        }
        if (cloudData.settings && Object.keys(cloudData.settings).length > 0) {
          setSettings(cloudData.settings);
        }
        lastSavedJsonRef.current = JSON.stringify(cloudData);
      } else {
        const payload = {
          machines, technicians, employees, pmPlans, schedules,
          repairs, improvements, setupLogs, leaves, spareParts, cd5Projects, workRequests, settings, users
        };
        await saveDatabaseToFirebase(payload);
        lastSavedJsonRef.current = JSON.stringify(payload);
      }

      if (isCloudQuotaExceeded()) {
        setFirebaseStatus('quota-exceeded');
        return false;
      }

      setFirebaseStatus('connected');
      setLastFirebaseSync(new Date().toLocaleTimeString('th-TH'));
      return true;
    } catch (err) {
      if (isQuotaExceededError(err)) {
        await markCloudQuotaExceeded();
        setFirebaseStatus('quota-exceeded');
        return false;
      }
      console.error("Manual Firebase sync failed:", err);
      setFirebaseStatus('error');
      return false;
    }
  };

  const retestFirebaseQuota = async (): Promise<boolean> => {
    setFirebaseStatus('syncing');
    const ok = await resetCloudQuotaStatus();
    if (ok) {
      setFirebaseStatus('connected');
      setLastFirebaseSync(new Date().toLocaleTimeString('th-TH'));
      return true;
    } else {
      setFirebaseStatus('quota-exceeded');
      return false;
    }
  };

  // Authentication & Permission Methods
  const login = (usernameInput: string, passwordInput: string): { success: boolean; message?: string } => {
    const cleanUsername = usernameInput.trim().toLowerCase();
    const cleanPassword = passwordInput.trim();

    if (!cleanUsername || !cleanPassword) {
      return { success: false, message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน' };
    }

    const matchedUser = users.find(u => u.username.toLowerCase().trim() === cleanUsername);
    if (!matchedUser) {
      return { success: false, message: 'ไม่พบชื่อผู้ใช้นี้ในระบบ โปรดตรวจสอบอีกครั้ง' };
    }

    if (matchedUser.password !== cleanPassword) {
      return { success: false, message: 'รหัสผ่านไม่ถูกต้อง โปรดลองใหม่อีกครั้ง' };
    }

    setCurrentUser(matchedUser);
    try {
      localStorage.setItem('foodfab_current_user_id', matchedUser.id);
    } catch {
      // ignore
    }
    return { success: true };
  };

  const loginAsViewer = () => {
    let viewerUser = users.find(u => u.role === 'viewer') || DEFAULT_USER_ACCOUNTS.find(u => u.role === 'viewer');
    if (!viewerUser) {
      viewerUser = {
        id: 'usr-viewer',
        username: 'viewer',
        password: '',
        name: 'ผู้ดูข้อมูล (Viewer)',
        role: 'viewer',
        department: 'ฝ่ายผลิตอาหารและแปรรูป',
        createdAt: new Date().toISOString().split('T')[0]
      };
    }
    setCurrentUser(viewerUser);
    try {
      localStorage.setItem('foodfab_current_user_id', viewerUser.id);
    } catch {
      // ignore
    }
  };

  const loginAsProduction = () => {
    let prodUser = users.find(u => u.role === 'production' || u.username.toLowerCase() === 'production');
    if (!prodUser) {
      prodUser = DEFAULT_USER_ACCOUNTS.find(u => u.role === 'production') || {
        id: 'usr-prod-01',
        username: 'production',
        password: '1234',
        name: 'หัวหน้ากะ/ฝ่ายผลิต (Production)',
        role: 'production',
        department: 'ฝ่ายผลิต/สายการผลิต',
        phone: '085-333-7788',
        createdAt: new Date().toISOString().split('T')[0]
      };
    }
    setCurrentUser(prodUser);
    try {
      localStorage.setItem('foodfab_current_user_id', prodUser.id);
    } catch {
      // ignore
    }
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('foodfab_current_user_id');
    } catch {
      // ignore
    }
  };

  const addUser = (account: Omit<UserAccount, 'id' | 'createdAt'>): { success: boolean; message?: string } => {
    const cleanUsername = account.username.trim().toLowerCase();
    const cleanPassword = account.password.trim();
    const cleanName = account.name.trim();

    if (!cleanUsername) return { success: false, message: 'กรุณาระบุชื่อผู้ใช้ (Username)' };
    if (!cleanPassword) return { success: false, message: 'กรุณาระบุรหัสผ่าน (Password)' };
    if (!cleanName) return { success: false, message: 'กรุณาระบุชื่อ-นามสกุล' };

    if (users.some(u => u.username.toLowerCase().trim() === cleanUsername)) {
      return { success: false, message: `ชื่อผู้ใช้ "${account.username}" มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น` };
    }

    const newUser: UserAccount = {
      ...account,
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      username: cleanUsername,
      password: cleanPassword,
      name: cleanName,
      department: account.department?.trim() || 'แผนกซ่อมบำรุง',
      createdAt: new Date().toISOString().split('T')[0]
    };

    setUsers(prev => [...prev, newUser]);
    return { success: true };
  };

  const updateUser = (id: string, updates: Partial<UserAccount>): { success: boolean; message?: string } => {
    if (updates.username) {
      const cleanUsername = updates.username.trim().toLowerCase();
      if (users.some(u => u.id !== id && u.username.toLowerCase().trim() === cleanUsername)) {
        return { success: false, message: `ชื่อผู้ใช้ "${updates.username}" ถูกใช้งานโดยบัญชีอื่นแล้ว` };
      }
    }

    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        const updated = { ...u, ...updates };
        if (updates.username) updated.username = updates.username.trim().toLowerCase();
        if (updates.password) updated.password = updates.password.trim();
        if (updates.name) updated.name = updates.name.trim();
        if (currentUser?.id === id) {
          setCurrentUser(updated);
        }
        return updated;
      }
      return u;
    }));

    return { success: true };
  };

  const deleteUser = (id: string): { success: boolean; message?: string } => {
    if (currentUser?.id === id) {
      return { success: false, message: 'ไม่สามารถลบบัญชีที่กำลังล็อกอินใช้งานอยู่ในขณะนี้ได้' };
    }

    const targetUser = users.find(u => u.id === id);
    if (!targetUser) {
      return { success: false, message: 'ไม่พบบัญชีผู้ใช้ที่ต้องการลบ' };
    }

    if (targetUser.role === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        return { success: false, message: 'ระบบต้องมีผู้ดูแลระบบ (Admin) อย่างน้อย 1 บัญชี ไม่สามารถลบได้' };
      }
    }

    setUsers(prev => prev.filter(u => u.id !== id));
    return { success: true };
  };

  // RBAC Permission shortcuts
  const isAdmin = currentUser?.role === 'admin';
  const isTechnician = currentUser?.role === 'technician';
  const isProduction = currentUser?.role === 'production';
  const isViewer = currentUser?.role === 'viewer';
  const canEdit = !!currentUser && (isAdmin || isTechnician);
  const canDelete = !!currentUser && isAdmin;

  // Work Request CRUD & State Operations
  const addWorkRequest = (req: Omit<WorkRequest, 'id' | 'createdAt' | 'status'>): WorkRequest => {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    let maxNum = workRequests.length;
    for (const r of workRequests) {
      if (r.id && r.id.startsWith(`REQ-${yearMonth}-`)) {
        const parts = r.id.split('-');
        const parsed = parseInt(parts[2], 10);
        if (!isNaN(parsed) && parsed > maxNum) {
          maxNum = parsed;
        }
      }
    }
    const nextNum = maxNum + 1;
    const id = `REQ-${yearMonth}-${String(nextNum).padStart(3, '0')}-${Math.random().toString(36).substring(2, 6)}`;
    // เอาลำดับที่ ไปใส่เลขแจ้งซ่อม: if ticketNo is missing or was auto-generated REQ-..., fallback to sequenceNo
    const resolvedTicketNo = (req.ticketNo && !req.ticketNo.startsWith('REQ-'))
      ? req.ticketNo
      : (req.sequenceNo !== undefined ? String(req.sequenceNo) : req.ticketNo);
    const newReq: WorkRequest = {
      ...req,
      ticketNo: resolvedTicketNo,
      id,
      status: 'รอตอบรับ',
      createdAt: now.toISOString(),
    };
    setWorkRequests(prev => sanitizeWorkRequests([newReq, ...prev]));
    return newReq;
  };

  const addWorkRequestsBatch = (reqs: Array<Omit<WorkRequest, 'id' | 'createdAt' | 'status'>>): WorkRequest[] => {
    if (reqs.length === 0) return [];
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    let maxNum = workRequests.length;
    for (const r of workRequests) {
      if (r.id && r.id.startsWith(`REQ-${yearMonth}-`)) {
        const parts = r.id.split('-');
        const parsed = parseInt(parts[2], 10);
        if (!isNaN(parsed) && parsed > maxNum) {
          maxNum = parsed;
        }
      }
    }

    const createdList: WorkRequest[] = reqs.map((req, idx) => {
      const nextNum = maxNum + idx + 1;
      const id = `REQ-${yearMonth}-${String(nextNum).padStart(3, '0')}-${Math.random().toString(36).substring(2, 6)}`;
      const resolvedTicketNo = (req.ticketNo && !req.ticketNo.startsWith('REQ-'))
        ? req.ticketNo
        : (req.sequenceNo !== undefined ? String(req.sequenceNo) : req.ticketNo);

      return {
        ...req,
        ticketNo: resolvedTicketNo,
        id,
        status: 'รอตอบรับ',
        createdAt: new Date(now.getTime() + idx * 10).toISOString(),
      };
    });

    setWorkRequests(prev => sanitizeWorkRequests([...createdList, ...prev]));
    return createdList;
  };

  const updateWorkRequest = (id: string, updates: Partial<WorkRequest>) => {
    setWorkRequests(prev => prev.map(r => r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r));
  };

  const deleteWorkRequest = (id: string) => {
    setWorkRequests(prev => prev.filter(r => r.id !== id));
  };

  const deleteWorkRequestsBatch = (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    setWorkRequests(prev => prev.filter(r => !idSet.has(r.id)));
  };

  const respondToWorkRequest = (id: string, response: EngineeringResponse, newStatus: WorkRequestStatus = 'ตอบรับแล้ว/มีแผนงาน') => {
    setWorkRequests(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          status: newStatus,
          engineeringResponse: response,
          updatedAt: new Date().toISOString()
        };
      }
      return r;
    }));
  };

  const completeWorkRequest = (id: string, summary: { actualDurationMins: number; repairSummaryNotes: string }) => {
    const now = new Date();
    const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setWorkRequests(prev => prev.map(r => {
      if (r.id === id) {
        const existingResp = r.engineeringResponse || {
          respondedAt: nowStr,
          respondedBy: currentUser?.name || 'ทีมวิศวกรรม',
          targetStartDate: nowStr.split(' ')[0],
          targetStartTime: '08:00',
          targetFinishDate: nowStr.split(' ')[0],
          targetFinishTime: nowStr.split(' ')[1],
          estimatedDurationMins: summary.actualDurationMins,
          actionPlan: 'ซ่อมบำรุงแก้ไขตามอาการ',
          assignedTechnicians: [],
          sparePartStatus: 'มีอะไหล่พร้อมในคลัง' as const
        };
        return {
          ...r,
          status: 'ซ่อมเสร็จ/รอฝ่ายผลิตตรวจรับ',
          engineeringResponse: {
            ...existingResp,
            completedAt: nowStr,
            actualDurationMins: summary.actualDurationMins,
            repairSummaryNotes: summary.repairSummaryNotes
          },
          updatedAt: now.toISOString()
        };
      }
      return r;
    }));
  };

  const acceptWorkRequestHandover = (id: string, handover: { acceptedBy: string; handoverNotes: string; satisfactionRating: number }) => {
    const now = new Date();
    const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setWorkRequests(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          status: 'ปิดงานสมบูรณ์',
          acceptedBy: handover.acceptedBy,
          acceptedAt: nowStr,
          handoverNotes: handover.handoverNotes,
          satisfactionRating: handover.satisfactionRating,
          updatedAt: now.toISOString()
        };
      }
      return r;
    }));
  };

  const updateMachinePlannedTime = (machineId: string, plannedHours: number) => {
    setMachines(prev => prev.map(m => m.id === machineId ? { ...m, plannedProductionHours: plannedHours } : m));
  };

  const updateAllMachinesPlannedTime = (plannedHours: number) => {
    setMachines(prev => prev.map(m => ({ ...m, plannedProductionHours: plannedHours })));
    setSettings(prev => ({ ...prev, defaultPlannedProductionHours: plannedHours }));
  };

  const addWorkOrder = (woData: Omit<WorkOrder, 'id' | 'createdAt'>): WorkOrder => {
    const newId = generateWorkOrderNo(workOrders);
    const stockMap: Record<string, number> = {};
    spareParts.forEach(p => { stockMap[p.id] = p.stock; });
    const readiness = evaluateWorkOrderReadiness(woData, stockMap);
    
    // Auto status determination based on 4-pillar readiness gate
    let initialStatus = woData.status || 'DRAFT';
    if (!woData.status || woData.status === 'DRAFT' || woData.status === 'PENDING_SCHEDULE') {
      if (readiness.gatePassed) {
        initialStatus = 'READY_TO_RELEASE';
      } else if (!readiness.partsAvailable) {
        initialStatus = 'WAITING_PARTS';
      } else {
        initialStatus = 'PENDING_SCHEDULE';
      }
    }

    const newWO: WorkOrder = {
      ...woData,
      id: newId,
      workOrderNo: newId,
      status: initialStatus,
      readiness,
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.name || 'หัวหน้างานซ่อมบำรุง'
    };

    setWorkOrders(prev => [newWO, ...prev]);
    return newWO;
  };

  const updateWorkOrder = (id: string, updates: Partial<WorkOrder>) => {
    const stockMap: Record<string, number> = {};
    spareParts.forEach(p => { stockMap[p.id] = p.stock; });
    
    setWorkOrders(prev => prev.map(wo => {
      if (wo.id === id) {
        const merged = { ...wo, ...updates };
        const readiness = evaluateWorkOrderReadiness(merged, stockMap);
        let updatedStatus = merged.status;
        if (updatedStatus === 'DRAFT' || updatedStatus === 'PENDING_SCHEDULE' || updatedStatus === 'READY_TO_RELEASE' || updatedStatus === 'WAITING_PARTS') {
          if (readiness.gatePassed) {
            updatedStatus = 'READY_TO_RELEASE';
          } else if (!readiness.partsAvailable) {
            updatedStatus = 'WAITING_PARTS';
          } else {
            updatedStatus = 'PENDING_SCHEDULE';
          }
        }
        return {
          ...merged,
          status: updatedStatus,
          readiness
        };
      }
      return wo;
    }));
  };

  const deleteWorkOrder = (id: string) => {
    setWorkOrders(prev => prev.filter(wo => wo.id !== id));
  };

  const releaseWorkOrder = (id: string, operatorName?: string): { success: boolean; message: string } => {
    const target = workOrders.find(w => w.id === id);
    if (!target) return { success: false, message: 'ไม่พบใบสั่งงาน' };

    const stockMap: Record<string, number> = {};
    spareParts.forEach(p => { stockMap[p.id] = p.stock; });
    const readiness = evaluateWorkOrderReadiness(target, stockMap);

    const isEmergency = target.priority === 'ฉุกเฉินไลน์หยุด' || target.sourceType === 'BREAKDOWN';

    if (!readiness.gatePassed && !isEmergency) {
      return { 
        success: false, 
        message: `ไม่สามารถปล่อยงานได้เนื่องจากยังไม่ผ่านเกณฑ์ความพร้อม: ${readiness.missingReasons.join(', ')}` 
      };
    }

    const nowIso = new Date().toISOString();
    setWorkOrders(prev => prev.map(wo => {
      if (wo.id === id) {
        return {
          ...wo,
          status: 'RELEASED',
          releasedAt: nowIso,
          releasedBy: operatorName || currentUser?.name || 'หัวหน้างานซ่อมบำรุง',
          actualStartTime: wo.actualStartTime || nowIso.slice(11, 16)
        };
      }
      return wo;
    }));

    return { success: true, message: `ปล่อยใบสั่งงาน ${target.id} ให้ทีมช่างเริ่มปฏิบัติงานเรียบร้อยแล้ว` };
  };

  const closeWorkOrder = (id: string, completionData: {
    actualDurationMins?: number;
    workSummaryNotes?: string;
    rootCauseWhy1?: string;
    correctiveAction?: string;
    acceptedBy: string;
    satisfactionRating?: number;
    handoverNotes?: string;
  }) => {
    const target = workOrders.find(w => w.id === id);
    if (!target) return;

    const now = new Date();
    const nowIso = now.toISOString();
    const nowTimeStr = now.toTimeString().slice(0, 5);

    // Deduct required spare parts from stock if not already deducted
    if (target.requiresParts && target.requiredParts && target.requiredParts.length > 0) {
      setSpareParts(prevParts => prevParts.map(sp => {
        const req = target.requiredParts.find(rp => rp.partId === sp.id);
        if (req && req.quantityRequired > 0) {
          return {
            ...sp,
            stock: Math.max(0, sp.stock - req.quantityRequired),
            lastUsedDate: nowIso.slice(0, 10),
            lastWorkRequestNo: target.workRequestNo || target.id
          };
        }
        return sp;
      }));
    }

    // Two-way synchronization: If this Work Order was from a PM plan/schedule, mark PM Schedule as completed ('เสร็จสิ้น')
    if (target.sourceType === 'PM') {
      const targetDateMonth = (target.scheduledDate || nowIso).slice(0, 7); // YYYY-MM
      setSchedules(prevScheds => prevScheds.map(sch => {
        if (
          sch.type === 'PM' &&
          sch.machineId === target.machineId &&
          (sch.date.startsWith(targetDateMonth) || (target.sourceRefId && sch.pmPlanId === target.sourceRefId))
        ) {
          return {
            ...sch,
            status: 'เสร็จสิ้น',
            actualDuration: completionData.actualDurationMins || sch.duration
          };
        }
        return sch;
      }));
    }

    setWorkOrders(prev => prev.map(wo => {
      if (wo.id === id) {
        return {
          ...wo,
          status: 'CLOSED',
          actualDurationMins: completionData.actualDurationMins || wo.estimatedDurationMins,
          actualEndTime: nowTimeStr,
          workSummaryNotes: completionData.workSummaryNotes || wo.workSummaryNotes,
          rootCauseWhy1: completionData.rootCauseWhy1 || wo.rootCauseWhy1,
          correctiveAction: completionData.correctiveAction || wo.correctiveAction,
          productionAcceptedBy: completionData.acceptedBy,
          productionAcceptedAt: nowIso,
          productionHandoverNotes: completionData.handoverNotes,
          satisfactionRating: completionData.satisfactionRating || 5,
          closedAt: nowIso,
          closedBy: currentUser?.name || 'หัวหน้างานซ่อมบำรุง'
        };
      }
      return wo;
    }));
  };

  const createEmergencyBreakdownWorkOrder = (params: {
    machineId: string;
    title: string;
    symptoms: string;
    leadTech: string;
    targetDurationMins?: number;
    lotoTag?: string;
  }): WorkOrder => {
    const newId = generateWorkOrderNo(workOrders);
    const now = new Date();
    const nowDate = now.toISOString().slice(0, 10);
    const nowTime = now.toTimeString().slice(0, 5);
    const mach = machines.find(m => m.id === params.machineId);

    const newWO: WorkOrder = {
      id: newId,
      workOrderNo: newId,
      sourceType: 'BREAKDOWN',
      workCategory: 'UNPLANNED',
      title: `⚡ [ฉุกเฉิน] ${params.title}`,
      description: params.symptoms,
      machineId: params.machineId,
      machineName: mach?.name || params.machineId,
      lineGroup: mach?.lineGroup || '-',
      priority: 'ฉุกเฉินไลน์หยุด',
      status: 'RELEASED', // 1-Click Fast Track: Auto-released for emergency
      readiness: {
        timeScheduled: true,
        estimatedDurationValid: true,
        laborAssigned: true,
        partsAvailable: true,
        gatePassed: true,
        missingReasons: []
      },
      scheduledDate: nowDate,
      scheduledStartTime: nowTime,
      estimatedDurationMins: params.targetDurationMins || 45,
      actualStartTime: nowTime,
      assignedTechnicians: [params.leadTech],
      leadTechnician: params.leadTech,
      requiresParts: false,
      requiredParts: [],
      lotoRequired: Boolean(params.lotoTag),
      lotoTag: params.lotoTag,
      lotoActive: Boolean(params.lotoTag),
      createdAt: now.toISOString(),
      createdBy: currentUser?.name || 'ระบบฉุกเฉินไลน์หยุด (Auto-WO Fast-Track)',
      releasedAt: now.toISOString(),
      releasedBy: params.leadTech
    };

    setWorkOrders(prev => [newWO, ...prev]);
    return newWO;
  };

  const resetToDefaults = () => {
    setMachines(PRELOADED_MACHINES);
    setTechnicians(PRELOADED_TECHNICIANS);
    const defaultEmployees = PRELOADED_TECHNICIANS.map((tech, idx) => ({
      id: `ENG-${String(idx + 1).padStart(3, '0')}`,
      name: tech,
      position: 'ช่างบำรุงรักษา',
      password: '1234'
    }));
    setEmployees(defaultEmployees);
    setPmPlans(PRELOADED_PM_PLANS);
    setSchedules(PRELOADED_SCHEDULES);
    setRepairs(PRELOADED_REPAIRS);
    setImprovements(PRELOADED_IMPROVEMENTS);
    setSetupLogs(PRELOADED_SETUPS);
    setCd5Projects(PRELOADED_CD5_PROJECTS);
    setWorkRequests(PRELOADED_WORK_REQUESTS);
    setUsers(DEFAULT_USER_ACCOUNTS);
    const preloadingLeaves = [
      { id: 'lv-001', technician: 'ช่างอุ้ย', date: '2026-06-08', type: 'ลากิจ' as const, note: 'ติดต่อราชการครอบครัว' },
      { id: 'lv-002', technician: 'ช่างโอเว่น', date: '2026-06-11', type: 'ลาป่วย' as const, note: 'ปวดศีรษะ เป็นไข้หวัด' },
      { id: 'lv-003', technician: 'ช่างปอ', date: '2026-06-12', type: 'ลาพักร้อน' as const, note: 'พักผ่อนประจำปีต่างจังหวัด (ภูเก็ต)' },
      { id: 'lv-004', technician: 'ช่างเซฟ', date: '2026-06-14', type: 'วันหยุดประจำสัปดาห์' as const, note: 'สลับวันหยุดประจำโรงงาน' },
    ];
    setLeaves(preloadingLeaves);
    setSettings({
      workingHoursPerDay: 8,
      defaultPlannedProductionHours: 600,
      lineNotifyEnabled: false,
      lineNotifyToken: '',
      stdMttr: {
        "RIM": 60,
        "TOC": 45,
        "VAC": 90,
        "FFS": 60,
        "ATS": 60,
        "MTD": 30,
        "XRA": 45,
        "RFD": 45,
        "BAN": 45,
        "BCF": 120,
        "CDU": 120,
        "TLP": 30,
        "INK": 30,
        "STK": 45,
        "OFR": 90,
        "RJT": 30,
        "PAC": 60,
      }
    });

    localStorage.setItem('maint_machines', JSON.stringify(PRELOADED_MACHINES));
    localStorage.setItem('maint_technicians', JSON.stringify(PRELOADED_TECHNICIANS));
    localStorage.setItem('maint_employees', JSON.stringify(defaultEmployees));
    localStorage.setItem('maint_pm_plans', JSON.stringify(PRELOADED_PM_PLANS));
    localStorage.setItem('maint_schedule', JSON.stringify(PRELOADED_SCHEDULES));
    localStorage.setItem('maint_repairs', JSON.stringify(PRELOADED_REPAIRS));
    localStorage.setItem('maint_improvements', JSON.stringify(PRELOADED_IMPROVEMENTS));
    localStorage.setItem('maint_setup_logs', JSON.stringify(PRELOADED_SETUPS));
    localStorage.setItem('maint_leaves', JSON.stringify(preloadingLeaves));
    localStorage.setItem('maint_users', JSON.stringify(DEFAULT_USER_ACCOUNTS));
    localStorage.setItem('maint_work_requests', JSON.stringify(PRELOADED_WORK_REQUESTS));
    setSpareParts(PRELOADED_SPARE_PARTS);
    localStorage.setItem('maint_spare_parts', JSON.stringify(PRELOADED_SPARE_PARTS));
    localStorage.setItem('maint_cd5_projects', JSON.stringify(PRELOADED_CD5_PROJECTS));
    localStorage.removeItem('maint_settings');
  };

  const exportData = () => {
    const dataObj = {
      machines,
      technicians,
      employees,
      pmPlans,
      schedules,
      repairs,
      improvements,
      setupLogs,
      leaves,
      spareParts,
      cd5Projects,
      workRequests,
      workOrders,
      settings,
      users
    };
    return JSON.stringify(dataObj, null, 2);
  };

  const importData = (jsonStr: string) => {
    try {
      const dataObj = JSON.parse(jsonStr);
      if (dataObj.machines) setMachines(dataObj.machines);
      if (dataObj.technicians) setTechnicians(dataObj.technicians);
      if (dataObj.employees) setEmployees(dataObj.employees);
      if (dataObj.pmPlans) setPmPlans(dataObj.pmPlans);
      if (dataObj.schedules) setSchedules(dataObj.schedules);
      if (dataObj.repairs) setRepairs(dataObj.repairs);
      if (dataObj.improvements) setImprovements(dataObj.improvements);
      if (dataObj.setupLogs) setSetupLogs(dataObj.setupLogs);
      if (dataObj.leaves) setLeaves(dataObj.leaves);
      if (dataObj.spareParts) setSpareParts(dataObj.spareParts);
      if (dataObj.cd5Projects) setCd5Projects(dataObj.cd5Projects);
      if (dataObj.workRequests && Array.isArray(dataObj.workRequests)) setWorkRequests(sanitizeWorkRequests(dataObj.workRequests));
      if (dataObj.workOrders && Array.isArray(dataObj.workOrders)) setWorkOrders(dataObj.workOrders);
      if (dataObj.settings) setSettings(dataObj.settings);
      if (dataObj.users && Array.isArray(dataObj.users)) setUsers(dataObj.users);
      
      return true;
    } catch (e) {
      console.error("Invalid database JSON import.", e);
      return false;
    }
  };

  return (
    <AppContext.Provider value={{
      activePage, setActivePage,
      repairNavigationFilter, setRepairNavigationFilter,
      navigateToRepairs, clearRepairNavigationFilter,
      machines, setMachines,
      technicians, setTechnicians,
      employees, setEmployees,
      pmPlans, setPmPlans,
      schedules, setSchedules,
      repairs, setRepairs,
      improvements, setImprovements,
      setupLogs, setSetupLogs,
      leaves, setLeaves,
      settings, setSettings,
      spareParts, setSpareParts,
      cd5Projects, setCd5Projects,
      users, setUsers,
      workRequests, setWorkRequests,
      workOrders, setWorkOrders,
      addWorkOrder, updateWorkOrder, deleteWorkOrder,
      releaseWorkOrder, closeWorkOrder, createEmergencyBreakdownWorkOrder,
      updateMachinePlannedTime, updateAllMachinesPlannedTime,
      addWorkRequest, addWorkRequestsBatch, updateWorkRequest, deleteWorkRequest, deleteWorkRequestsBatch,
      respondToWorkRequest, completeWorkRequest, acceptWorkRequestHandover,
      currentUser, setCurrentUser,
      login, loginAsViewer, loginAsProduction, logout,
      addUser, updateUser, deleteUser,
      isAdmin, isTechnician, isProduction, isViewer,
      canEdit, canDelete,
      firebaseStatus,
      lastFirebaseSync,
      syncWithFirebaseNow,
      retestFirebaseQuota,
      isQuotaExceeded: isCloudQuotaExceeded(),
      resetToDefaults,
      exportData,
      importData
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
