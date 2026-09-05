import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import {
  Machine,
  ScheduleItem,
  PMPlan,
  RepairLog,
  ImprovementProject,
  SetupLog,
  SparePart,
  TechnicianLeave,
  CD5Project,
  SystemSettings,
  Employee
} from '../types';

export interface AppDatabaseState {
  machines: Machine[];
  technicians: string[];
  employees: Employee[];
  pmPlans: PMPlan[];
  schedules: ScheduleItem[];
  repairs: RepairLog[];
  improvements: ImprovementProject[];
  setupLogs: SetupLog[];
  leaves: TechnicianLeave[];
  spareParts: SparePart[];
  cd5Projects: CD5Project[];
  settings: SystemSettings;
}

export type FirebaseSyncStatus = 'connected' | 'syncing' | 'offline' | 'error';

// Meta document to track live mutations across instances
const META_SYNC_DOC = 'meta/sync';

// Unique client/tab identifier to prevent self-triggered sync loops
export const CLIENT_ID = 'client_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();

/**
 * Loads the complete database from Firebase Cloud Firestore.
 * Returns null if the database has not yet been initialized in Firebase.
 */
export async function loadDatabaseFromFirebase(): Promise<AppDatabaseState | null> {
  try {
    // 1. Try unified fast document 'factory/main'
    const factorySnap = await getDoc(doc(firestore, 'factory', 'main'));
    if (factorySnap.exists()) {
      const data = factorySnap.data() as AppDatabaseState;
      if (data && data.machines && data.machines.length > 0) {
        return {
          machines: data.machines || [],
          technicians: data.technicians || [],
          employees: data.employees || [],
          pmPlans: data.pmPlans || [],
          schedules: data.schedules || [],
          repairs: data.repairs || [],
          improvements: data.improvements || [],
          setupLogs: data.setupLogs || [],
          leaves: data.leaves || [],
          spareParts: data.spareParts || [],
          cd5Projects: data.cd5Projects || [],
          settings: data.settings || {} as SystemSettings,
        };
      }
    }

    // 2. Check if meta sync doc exists (legacy fallback)
    const metaSnap = await getDoc(doc(firestore, 'meta', 'sync'));
    if (!metaSnap.exists()) {
      return null;
    }

    // 3. Fallback: Read individual catalog documents in parallel
    const [
      machSnap,
      techSnap,
      empSnap,
      plansSnap,
      schedSnap,
      impSnap,
      setSnap,
      leaveSnap,
      partsSnap,
      cd5Snap,
      settingSnap,
      repairsCollectionSnap
    ] = await Promise.all([
      getDoc(doc(firestore, 'catalog', 'machines')),
      getDoc(doc(firestore, 'catalog', 'technicians')),
      getDoc(doc(firestore, 'catalog', 'employees')),
      getDoc(doc(firestore, 'catalog', 'pmPlans')),
      getDoc(doc(firestore, 'catalog', 'schedules')),
      getDoc(doc(firestore, 'catalog', 'improvements')),
      getDoc(doc(firestore, 'catalog', 'setupLogs')),
      getDoc(doc(firestore, 'catalog', 'leaves')),
      getDoc(doc(firestore, 'catalog', 'spareParts')),
      getDoc(doc(firestore, 'catalog', 'cd5Projects')),
      getDoc(doc(firestore, 'catalog', 'settings')),
      getDocs(collection(firestore, 'repairs'))
    ]);

    const repairs: RepairLog[] = [];
    repairsCollectionSnap.forEach((docSnap) => {
      repairs.push(docSnap.data() as RepairLog);
    });

    return {
      machines: machSnap.exists() ? (machSnap.data().list || []) : [],
      technicians: techSnap.exists() ? (techSnap.data().list || []) : [],
      employees: empSnap.exists() ? (empSnap.data().list || []) : [],
      pmPlans: plansSnap.exists() ? (plansSnap.data().list || []) : [],
      schedules: schedSnap.exists() ? (schedSnap.data().list || []) : [],
      repairs,
      improvements: impSnap.exists() ? (impSnap.data().list || []) : [],
      setupLogs: setSnap.exists() ? (setSnap.data().list || []) : [],
      leaves: leaveSnap.exists() ? (leaveSnap.data().list || []) : [],
      spareParts: partsSnap.exists() ? (partsSnap.data().list || []) : [],
      cd5Projects: cd5Snap.exists() ? (cd5Snap.data().list || []) : [],
      settings: settingSnap.exists() ? (settingSnap.data().data || {}) : {} as SystemSettings,
    };
  } catch (error) {
    console.error('Error loading data from Cloud Firestore:', error);
    throw error;
  }
}

/**
 * Saves all datasets to Cloud Firestore using an atomic 2-document batch.
 * This guarantees atomic updates and prevents write queue exhaustion.
 */
export async function saveDatabaseToFirebase(data: AppDatabaseState): Promise<void> {
  try {
    const batch = writeBatch(firestore);

    // Document 1: Unified factory state
    const factoryRef = doc(firestore, 'factory', 'main');
    batch.set(factoryRef, {
      ...data,
      lastUpdated: new Date().toISOString(),
      updatedBy: CLIENT_ID
    });

    // Document 2: Sync metadata
    const syncRef = doc(firestore, 'meta', 'sync');
    batch.set(syncRef, {
      lastUpdated: serverTimestamp(),
      isoUpdated: new Date().toISOString(),
      updatedBy: CLIENT_ID,
      version: 2
    });

    // Commit single atomic batch
    await batch.commit();
  } catch (error) {
    console.error('Error saving database to Cloud Firestore:', error);
    throw error;
  }
}

/**
 * Saves or updates a single repair log directly to Firestore
 */
export async function saveSingleRepairToFirebase(repair: RepairLog): Promise<void> {
  try {
    await setDoc(doc(firestore, 'repairs', repair.id), repair, { merge: true });
    await setDoc(doc(firestore, 'meta', 'sync'), {
      lastUpdated: serverTimestamp(),
      isoUpdated: new Date().toISOString(),
      updatedEntity: 'repairs'
    }, { merge: true });
  } catch (error) {
    console.error('Error saving single repair to Firestore:', error);
    throw error;
  }
}

/**
 * Deletes a single repair log from Firestore
 */
export async function deleteSingleRepairFromFirebase(repairId: string): Promise<void> {
  try {
    await deleteDoc(doc(firestore, 'repairs', repairId));
    await setDoc(doc(firestore, 'meta', 'sync'), {
      lastUpdated: serverTimestamp(),
      isoUpdated: new Date().toISOString(),
      deletedEntity: 'repairs',
      deletedId: repairId
    }, { merge: true });
  } catch (error) {
    console.error('Error deleting repair from Firestore:', error);
    throw error;
  }
}

/**
 * Real-time listener: Subscribes to live database updates made by other clients
 */
export function subscribeToFirebaseSync(
  onRemoteUpdate: () => void
): () => void {
  let isFirst = true;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  return onSnapshot(doc(firestore, 'meta', 'sync'), (snapshot) => {
    if (isFirst) {
      isFirst = false;
      return;
    }
    if (!snapshot.exists()) return;

    const data = snapshot.data();
    // Ignore events generated by THIS client/tab to eliminate self-triggering feedback loops
    if (data?.updatedBy === CLIENT_ID) {
      return;
    }

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      onRemoteUpdate();
    }, 400);
  }, (err) => {
    console.warn('Firebase sync listener warning:', err);
  });
}
