import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  Machine, PMPlan, PMScheduleItem, OperationScheduleItem, 
  RepairLog, ImprovementProject, SystemSettings, ScheduleItem, SetupLog, Employee,
  TechnicianLeave, SparePart, CD5Project, UserAccount, UserRole
} from '../types';
import { 
  PRELOADED_MACHINES, PRELOADED_TECHNICIANS, PRELOADED_PM_PLANS, 
  PRELOADED_REPAIRS, PRELOADED_IMPROVEMENTS, PRELOADED_SCHEDULES, PRELOADED_SETUPS,
  PRELOADED_SPARE_PARTS, PRELOADED_CD5_PROJECTS
} from '../data/preloaded';
import { DEFAULT_USER_ACCOUNTS } from '../data/preloadedUsers';
import { 
  loadDatabaseFromFirebase, 
  saveDatabaseToFirebase, 
  subscribeToFirebaseSync, 
  FirebaseSyncStatus,
  AppDatabaseState
} from '../services/firebaseDb';

interface AppContextType {
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
  currentUser: UserAccount | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserAccount | null>>;
  login: (username: string, password: string) => { success: boolean; message?: string };
  loginAsViewer: () => void;
  logout: () => void;
  addUser: (account: Omit<UserAccount, 'id' | 'createdAt'>) => { success: boolean; message?: string };
  updateUser: (id: string, updates: Partial<UserAccount>) => { success: boolean; message?: string };
  deleteUser: (id: string) => { success: boolean; message?: string };
  isAdmin: boolean;
  isTechnician: boolean;
  isViewer: boolean;
  canEdit: boolean;
  canDelete: boolean;
  firebaseStatus: 'connected' | 'syncing' | 'offline' | 'error';
  lastFirebaseSync: string | null;
  syncWithFirebaseNow: () => Promise<boolean>;
  resetToDefaults: () => void;
  exportData: () => string;
  importData: (jsonStr: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  // Helper to ensure machine IDs are strictly unique and fix legacy duplicates
  const sanitizeMachines = (machineList: Machine[]): Machine[] => {
    const seen = new Set<string>();
    return machineList.map((m, idx) => {
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
      return id !== m.id ? { ...m, id } : m;
    });
  };

  // Load from Firebase Cloud Firestore or fall back to Server / LocalStorage / preloads
  useEffect(() => {
    const initDb = async () => {
      let loadedFromCloud = false;

      // 1. Try loading from Firebase Cloud Firestore first
      try {
        setFirebaseStatus('syncing');
        const cloudData = await loadDatabaseFromFirebase();
        if (cloudData && cloudData.machines && cloudData.machines.length > 0) {
          setMachines(sanitizeMachines(cloudData.machines));
          setTechnicians(cloudData.technicians && cloudData.technicians.length > 0 ? cloudData.technicians : PRELOADED_TECHNICIANS);
          setEmployees(cloudData.employees || []);
          setPmPlans(cloudData.pmPlans || PRELOADED_PM_PLANS);
          setSchedules(cloudData.schedules || PRELOADED_SCHEDULES);
          setRepairs(cloudData.repairs || PRELOADED_REPAIRS);
          setImprovements(cloudData.improvements || PRELOADED_IMPROVEMENTS);
          setSetupLogs(cloudData.setupLogs || PRELOADED_SETUPS);
          setSpareParts(cloudData.spareParts || PRELOADED_SPARE_PARTS);
          setLeaves(cloudData.leaves || []);
          setCd5Projects(cloudData.cd5Projects && cloudData.cd5Projects.length > 0 ? cloudData.cd5Projects : PRELOADED_CD5_PROJECTS);
          const userList = (cloudData.users && cloudData.users.length > 0) ? cloudData.users : DEFAULT_USER_ACCOUNTS;
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
        console.warn("Cloud Firestore initial load note:", cloudErr);
      }

      // 2. Fallback: Load from Server or LocalStorage/preloads
      let resolvedData: AppDatabaseState | null = null;
      try {
        const response = await fetch("/api/db");
        if (response.ok) {
          const serverData = await response.json();
          if (serverData && serverData.machines) {
            const machs = (!serverData.machines || serverData.machines.length < 100 || !serverData.machines[0]?.model)
              ? sanitizeMachines(PRELOADED_MACHINES)
              : sanitizeMachines(serverData.machines);
            const techs = serverData.technicians || PRELOADED_TECHNICIANS;
            const emps = serverData.employees || [];
            const plans = serverData.pmPlans || PRELOADED_PM_PLANS;
            const scheds = serverData.schedules || PRELOADED_SCHEDULES;
            const reps = serverData.repairs || PRELOADED_REPAIRS;
            const imps = serverData.improvements || PRELOADED_IMPROVEMENTS;
            const setups = serverData.setupLogs || PRELOADED_SETUPS;
            const parts = serverData.spareParts || PRELOADED_SPARE_PARTS;
            const lvs = serverData.leaves || [];
            const cd5 = serverData.cd5Projects || PRELOADED_CD5_PROJECTS;
            const userList = (serverData.users && serverData.users.length > 0) ? serverData.users : DEFAULT_USER_ACCOUNTS;
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
          const reps = storedRepairs ? JSON.parse(storedRepairs) : PRELOADED_REPAIRS;
          const imps = storedImprovements ? JSON.parse(storedImprovements) : PRELOADED_IMPROVEMENTS;
          const setups = storedSetups ? JSON.parse(storedSetups) : PRELOADED_SETUPS;
          const parts = storedSpareParts ? JSON.parse(storedSpareParts) : PRELOADED_SPARE_PARTS;
          const cd5 = storedCd5 ? JSON.parse(storedCd5) : PRELOADED_CD5_PROJECTS;
          const userList: UserAccount[] = storedUsers ? JSON.parse(storedUsers) : DEFAULT_USER_ACCOUNTS;
          const lvs = storedLeaves ? JSON.parse(storedLeaves) : [
            { id: 'lv-001', technician: 'ช่าง 1', date: '2026-06-08', type: 'ลากิจ' as const, note: 'ติดต่อราชการครอบครัว' },
            { id: 'lv-002', technician: 'ช่าง 2', date: '2026-06-11', type: 'ลาป่วย' as const, note: 'ปวดศีรษะ เป็นไข้หวัด' },
            { id: 'lv-003', technician: 'ช่าง 3', date: '2026-06-12', type: 'ลาพักร้อน' as const, note: 'พักผ่อนประจำปีต่างจังหวัด (ภูเก็ต)' },
            { id: 'lv-004', technician: 'ช่าง 4', date: '2026-06-14', type: 'วันหยุดประจำสัปดาห์' as const, note: 'สลับวันหยุดประจำโรงงาน' },
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
      setIsLoaded(true);

      // If Cloud Firestore was empty, automatically seed all initial factory data to Cloud Firestore!
      if (!loadedFromCloud && resolvedData) {
        try {
          await saveDatabaseToFirebase(resolvedData);
          lastSavedJsonRef.current = JSON.stringify(resolvedData);
          setFirebaseStatus('connected');
          setLastFirebaseSync(new Date().toLocaleTimeString('th-TH'));
          console.log("Successfully seeded initial data to Cloud Firestore.");
        } catch (seedErr) {
          console.warn("Could not seed to Cloud Firestore:", seedErr);
          setFirebaseStatus('offline');
        }
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
          setFirebaseStatus('connected');
          setLastFirebaseSync(new Date().toLocaleTimeString('th-TH'));
        } catch (cloudErr) {
          console.warn("Firebase Cloud Firestore sync error:", cloudErr);
          setFirebaseStatus('offline');
        } finally {
          isWritingCloudRef.current = false;
          if (hasPendingSaveRef.current && pendingDataRef.current) {
            const nextPayload = pendingDataRef.current;
            pendingDataRef.current = null;
            hasPendingSaveRef.current = false;
            executeSave(nextPayload, JSON.stringify(nextPayload));
          }
        }
      };

      await executeSave(dataToSave, currentJson);
    };

    const timerId = setTimeout(syncToBackends, 400);
    return () => clearTimeout(timerId);
  }, [
    machines, technicians, employees, pmPlans, schedules,
    repairs, improvements, setupLogs, leaves, spareParts, cd5Projects, settings, users, isLoaded
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
          setRepairs(cloudData.repairs || PRELOADED_REPAIRS);
          setImprovements(cloudData.improvements || PRELOADED_IMPROVEMENTS);
          setSetupLogs(cloudData.setupLogs || PRELOADED_SETUPS);
          setSpareParts(cloudData.spareParts || PRELOADED_SPARE_PARTS);
          setLeaves(cloudData.leaves || []);
          if (cloudData.cd5Projects && cloudData.cd5Projects.length > 0) {
            setCd5Projects(cloudData.cd5Projects);
          }
          if (cloudData.users && cloudData.users.length > 0) {
            setUsers(cloudData.users);
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
    try {
      setFirebaseStatus('syncing');
      const cloudData = await loadDatabaseFromFirebase();
      if (cloudData && cloudData.machines && cloudData.machines.length > 0) {
        setMachines(sanitizeMachines(cloudData.machines));
        setTechnicians(cloudData.technicians && cloudData.technicians.length > 0 ? cloudData.technicians : PRELOADED_TECHNICIANS);
        setEmployees(cloudData.employees || []);
        setPmPlans(cloudData.pmPlans || PRELOADED_PM_PLANS);
        setSchedules(cloudData.schedules || PRELOADED_SCHEDULES);
        setRepairs(cloudData.repairs || PRELOADED_REPAIRS);
        setImprovements(cloudData.improvements || PRELOADED_IMPROVEMENTS);
        setSetupLogs(cloudData.setupLogs || PRELOADED_SETUPS);
        setSpareParts(cloudData.spareParts || PRELOADED_SPARE_PARTS);
        setLeaves(cloudData.leaves || []);
        setCd5Projects(cloudData.cd5Projects || PRELOADED_CD5_PROJECTS);
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
          repairs, improvements, setupLogs, leaves, spareParts, cd5Projects, settings, users
        };
        await saveDatabaseToFirebase(payload);
        lastSavedJsonRef.current = JSON.stringify(payload);
      }
      setFirebaseStatus('connected');
      setLastFirebaseSync(new Date().toLocaleTimeString('th-TH'));
      return true;
    } catch (err) {
      console.error("Manual Firebase sync failed:", err);
      setFirebaseStatus('error');
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
  const isViewer = currentUser?.role === 'viewer';
  const canEdit = !!currentUser && (isAdmin || isTechnician);
  const canDelete = !!currentUser && isAdmin;

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
    setUsers(DEFAULT_USER_ACCOUNTS);
    const preloadingLeaves = [
      { id: 'lv-001', technician: 'ช่าง 1', date: '2026-06-08', type: 'ลากิจ' as const, note: 'ติดต่อราชการครอบครัว' },
      { id: 'lv-002', technician: 'ช่าง 2', date: '2026-06-11', type: 'ลาป่วย' as const, note: 'ปวดศีรษะ เป็นไข้หวัด' },
      { id: 'lv-003', technician: 'ช่าง 3', date: '2026-06-12', type: 'ลาพักร้อน' as const, note: 'พักผ่อนประจำปีต่างจังหวัด (ภูเก็ต)' },
      { id: 'lv-004', technician: 'ช่าง 4', date: '2026-06-14', type: 'วันหยุดประจำสัปดาห์' as const, note: 'สลับวันหยุดประจำโรงงาน' },
    ];
    setLeaves(preloadingLeaves);
    setSettings({
      workingHoursPerDay: 8,
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
      currentUser, setCurrentUser,
      login, loginAsViewer, logout,
      addUser, updateUser, deleteUser,
      isAdmin, isTechnician, isViewer,
      canEdit, canDelete,
      firebaseStatus,
      lastFirebaseSync,
      syncWithFirebaseNow,
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
