import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Machine, PMPlan, PMScheduleItem, OperationScheduleItem, 
  RepairLog, ImprovementProject, SystemSettings, ScheduleItem, SetupLog, Employee,
  TechnicianLeave, SparePart, CD5Project
} from '../types';
import { 
  PRELOADED_MACHINES, PRELOADED_TECHNICIANS, PRELOADED_PM_PLANS, 
  PRELOADED_REPAIRS, PRELOADED_IMPROVEMENTS, PRELOADED_SCHEDULES, PRELOADED_SETUPS,
  PRELOADED_SPARE_PARTS, PRELOADED_CD5_PROJECTS
} from '../data/preloaded';

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
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  
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

  // Load from Server or fall back to LocalStorage/preloads
  useEffect(() => {
    const initDb = async () => {
      try {
        const response = await fetch("/api/db");
        if (response.ok) {
          const serverData = await response.json();
          if (serverData && serverData.machines) {
            // Server has data! Load it.
            // If the server machine list is the legacy 50-item list without F-QMS-011 fields, upgrade to the 249 PDF machine registry
            if (!serverData.machines || serverData.machines.length < 100 || !serverData.machines[0]?.model) {
              setMachines(PRELOADED_MACHINES);
            } else {
              setMachines(serverData.machines);
            }
            setTechnicians(serverData.technicians || PRELOADED_TECHNICIANS);
            setEmployees(serverData.employees || []);
            setPmPlans(serverData.pmPlans || PRELOADED_PM_PLANS);
            setSchedules(serverData.schedules || PRELOADED_SCHEDULES);
            setRepairs(serverData.repairs || PRELOADED_REPAIRS);
            setImprovements(serverData.improvements || PRELOADED_IMPROVEMENTS);
            setSetupLogs(serverData.setupLogs || PRELOADED_SETUPS);
            setSpareParts(serverData.spareParts || PRELOADED_SPARE_PARTS);
            setLeaves(serverData.leaves || []);
            setCd5Projects(serverData.cd5Projects || PRELOADED_CD5_PROJECTS);
            if (serverData.settings) {
              setSettings(serverData.settings);
            }
            setIsLoaded(true);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to load database from server, falling back to localStorage", err);
      }

      // Fallback: load from LocalStorage or preloads
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

        if (storedMachines) {
          const parsed = JSON.parse(storedMachines);
          if (Array.isArray(parsed) && parsed.length >= 100 && parsed[0]?.model) {
            setMachines(parsed);
          } else {
            setMachines(PRELOADED_MACHINES);
          }
        } else {
          setMachines(PRELOADED_MACHINES);
        }

        if (storedTechs) setTechnicians(JSON.parse(storedTechs));
        else setTechnicians(PRELOADED_TECHNICIANS);

        if (storedEmployees) setEmployees(JSON.parse(storedEmployees));
        else {
          const defaultEmployees = PRELOADED_TECHNICIANS.map((tech, idx) => ({
            id: `ENG-${String(idx + 1).padStart(3, '0')}`,
            name: tech,
            position: 'ช่างบำรุงรักษา',
            password: '1234'
          }));
          setEmployees(defaultEmployees);
        }

        if (storedPlans) setPmPlans(JSON.parse(storedPlans));
        else setPmPlans(PRELOADED_PM_PLANS);

        if (storedSchedules) setSchedules(JSON.parse(storedSchedules));
        else setSchedules(PRELOADED_SCHEDULES);

        if (storedRepairs) setRepairs(JSON.parse(storedRepairs));
        else setRepairs(PRELOADED_REPAIRS);

        if (storedImprovements) setImprovements(JSON.parse(storedImprovements));
        else setImprovements(PRELOADED_IMPROVEMENTS);

        if (storedSetups) setSetupLogs(JSON.parse(storedSetups));
        else setSetupLogs(PRELOADED_SETUPS);

        if (storedSpareParts) setSpareParts(JSON.parse(storedSpareParts));
        else setSpareParts(PRELOADED_SPARE_PARTS);

        if (storedCd5) setCd5Projects(JSON.parse(storedCd5));
        else setCd5Projects(PRELOADED_CD5_PROJECTS);

        if (storedLeaves) setLeaves(JSON.parse(storedLeaves));
        else {
          const preloadingLeaves = [
            { id: 'lv-001', technician: 'ช่าง 1', date: '2026-06-08', type: 'ลากิจ' as const, note: 'ติดต่อราชการครอบครัว' },
            { id: 'lv-002', technician: 'ช่าง 2', date: '2026-06-11', type: 'ลาป่วย' as const, note: 'ปวดศีรษะ เป็นไข้หวัด' },
            { id: 'lv-003', technician: 'ช่าง 3', date: '2026-06-12', type: 'ลาพักร้อน' as const, note: 'พักผ่อนประจำปีต่างจังหวัด (ภูเก็ต)' },
            { id: 'lv-004', technician: 'ช่าง 4', date: '2026-06-14', type: 'วันหยุดประจำสัปดาห์' as const, note: 'สลับวันหยุดประจำโรงงาน' },
          ];
          setLeaves(preloadingLeaves);
        }

        if (storedSettings) setSettings(JSON.parse(storedSettings));

        setIsLoaded(true);
      } catch (e) {
        console.error("Error reading localStorage values. Resetting to defaults.", e);
        setIsLoaded(true);
      }
    };

    initDb();
  }, []);

  // Save changes to LocalStorage and Server only AFTER initial load is done
  useEffect(() => {
    if (!isLoaded) return;

    // Save to localStorage as backup safely
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
    } catch (e) {
      console.warn("LocalStorage quota warning:", e);
    }

    const dataToSave = {
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
      settings
    };

    const saveToServer = async () => {
      try {
        await fetch("/api/db", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(dataToSave)
        });
      } catch (error) {
        console.error("Error syncing with LAN server:", error);
      }
    };

    const timerId = setTimeout(saveToServer, 500);
    return () => clearTimeout(timerId);
  }, [
    machines, technicians, employees, pmPlans, schedules,
    repairs, improvements, setupLogs, leaves, spareParts, cd5Projects, settings, isLoaded
  ]);

  // Polling for updates from other LAN clients
  useEffect(() => {
    if (!isLoaded) return;

    let isPolling = false;

    const intervalId = setInterval(async () => {
      if (isPolling) return;
      isPolling = true;

      try {
        const response = await fetch("/api/db");
        if (response.ok) {
          const serverData = await response.json();
          if (serverData && serverData.machines) {
            const checkAndSet = (localVal: any, serverVal: any, setter: any) => {
              if (JSON.stringify(localVal) !== JSON.stringify(serverVal)) {
                setter(serverVal);
              }
            };

            checkAndSet(machines, serverData.machines, setMachines);
            checkAndSet(technicians, serverData.technicians, setTechnicians);
            checkAndSet(employees, serverData.employees, setEmployees);
            checkAndSet(pmPlans, serverData.pmPlans, setPmPlans);
            checkAndSet(schedules, serverData.schedules, setSchedules);
            checkAndSet(repairs, serverData.repairs, setRepairs);
            checkAndSet(improvements, serverData.improvements, setImprovements);
            checkAndSet(setupLogs, serverData.setupLogs, setSetupLogs);
            checkAndSet(leaves, serverData.leaves, setLeaves);
            checkAndSet(spareParts, serverData.spareParts, setSpareParts);
            checkAndSet(cd5Projects, serverData.cd5Projects, setCd5Projects);
            checkAndSet(settings, serverData.settings, setSettings);
          }
        }
      } catch (err) {
        console.error("LAN Polling sync error:", err);
      } finally {
        isPolling = false;
      }
    }, 4000); // poll every 4 seconds

    return () => clearInterval(intervalId);
  }, [
    isLoaded,
    machines, technicians, employees, pmPlans, schedules,
    repairs, improvements, setupLogs, leaves, spareParts, cd5Projects, settings
  ]);

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
      settings
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
