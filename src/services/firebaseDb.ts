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
  Employee,
  UserAccount,
  WorkRequest
} from '../types';

export interface AppDatabaseState {
  machines: Machine[];
  technicians: string[];
  employees: Employee[];
  users?: UserAccount[];
  pmPlans: PMPlan[];
  schedules: ScheduleItem[];
  repairs: RepairLog[];
  improvements: ImprovementProject[];
  setupLogs: SetupLog[];
  leaves: TechnicianLeave[];
  spareParts: SparePart[];
  cd5Projects: CD5Project[];
  workRequests?: WorkRequest[];
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
    // 1. Check if catalog exists or meta sync exists
    const [machSnap, metaSnap] = await Promise.all([
      getDoc(doc(firestore, 'catalog', 'machines')),
      getDoc(doc(firestore, 'meta', 'sync'))
    ]);

    if (machSnap.exists()) {
      // Load individual catalog documents in parallel
      const [
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
        usersSnap,
        workRequestsSnap,
        repairsCollectionSnap
      ] = await Promise.all([
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
        getDoc(doc(firestore, 'catalog', 'users')),
        getDoc(doc(firestore, 'catalog', 'workRequests')),
        getDocs(collection(firestore, 'repairs'))
      ]);

      const repairs: RepairLog[] = [];
      repairsCollectionSnap.forEach((docSnap) => {
        repairs.push(docSnap.data() as RepairLog);
      });

      return {
        machines: machSnap.data().list || [],
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
        users: usersSnap.exists() ? (usersSnap.data().list || []) : [],
        workRequests: workRequestsSnap.exists() ? (workRequestsSnap.data().list || []) : [],
        settings: settingSnap.exists() ? (settingSnap.data().data || {}) : {} as SystemSettings,
      };
    }

    // 2. Legacy fallback for single doc if it was small and exists
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
          users: data.users || [],
          settings: data.settings || {} as SystemSettings,
        };
      }
    }

    if (!metaSnap.exists()) {
      return null;
    }

    return null;
  } catch (error) {
    console.error('Error loading data from Cloud Firestore:', error);
    throw error;
  }
}

/**
 * Recursively cleans any object or array so that no field has `undefined` as a value.
 * Firestore strictly rejects documents containing `undefined` values.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return null as unknown as T;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter(item => item !== undefined)
      .map(item => sanitizeForFirestore(item)) as unknown as T;
  }
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value !== undefined) {
      result[key] = sanitizeForFirestore(value);
    }
  }
  return result as unknown as T;
}

/**
 * Saves all datasets to Cloud Firestore partitioned by entity catalog
 * and stores repairs as individual documents in 'repairs' collection.
 * This guarantees individual document sizes stay well below the 1MB limit.
 */
export async function saveDatabaseToFirebase(data: AppDatabaseState): Promise<void> {
  try {
    // Sanitize all datasets to remove any undefined fields before writing to Firestore
    const cleanData = sanitizeForFirestore(data);

    // 1. Batch write standard catalog collections
    const catalogBatch = writeBatch(firestore);

    catalogBatch.set(doc(firestore, 'catalog', 'machines'), { list: cleanData.machines || [] });
    catalogBatch.set(doc(firestore, 'catalog', 'technicians'), { list: cleanData.technicians || [] });
    catalogBatch.set(doc(firestore, 'catalog', 'employees'), { list: cleanData.employees || [] });
    catalogBatch.set(doc(firestore, 'catalog', 'pmPlans'), { list: cleanData.pmPlans || [] });
    catalogBatch.set(doc(firestore, 'catalog', 'schedules'), { list: cleanData.schedules || [] });
    catalogBatch.set(doc(firestore, 'catalog', 'improvements'), { list: cleanData.improvements || [] });
    catalogBatch.set(doc(firestore, 'catalog', 'setupLogs'), { list: cleanData.setupLogs || [] });
    catalogBatch.set(doc(firestore, 'catalog', 'leaves'), { list: cleanData.leaves || [] });
    catalogBatch.set(doc(firestore, 'catalog', 'spareParts'), { list: cleanData.spareParts || [] });
    catalogBatch.set(doc(firestore, 'catalog', 'cd5Projects'), { list: cleanData.cd5Projects || [] });
    catalogBatch.set(doc(firestore, 'catalog', 'users'), { list: cleanData.users || [] });
    catalogBatch.set(doc(firestore, 'catalog', 'workRequests'), { list: cleanData.workRequests || [] });
    catalogBatch.set(doc(firestore, 'catalog', 'settings'), { data: cleanData.settings || {} });

    // Sync metadata
    catalogBatch.set(doc(firestore, 'meta', 'sync'), {
      lastUpdated: serverTimestamp(),
      isoUpdated: new Date().toISOString(),
      updatedBy: CLIENT_ID,
      version: 3
    });

    await catalogBatch.commit();

    // 2. Batch write repairs to 'repairs' collection in chunks of 100 to stay well under batch limits
    if (cleanData.repairs && cleanData.repairs.length > 0) {
      const CHUNK_SIZE = 100;
      for (let i = 0; i < cleanData.repairs.length; i += CHUNK_SIZE) {
        const chunk = cleanData.repairs.slice(i, i + CHUNK_SIZE);
        const repairBatch = writeBatch(firestore);
        chunk.forEach(repair => {
          if (repair.id) {
            repairBatch.set(doc(firestore, 'repairs', repair.id), repair, { merge: true });
          }
        });
        await repairBatch.commit();
      }
    }
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
    const cleanRepair = sanitizeForFirestore(repair);
    await setDoc(doc(firestore, 'repairs', cleanRepair.id), cleanRepair, { merge: true });
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
