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
  writeBatch,
  disableNetwork,
  enableNetwork,
  DocumentSnapshot
} from 'firebase/firestore';
import { firestore, auth } from '../lib/firebase';
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

export type FirebaseSyncStatus = 'connected' | 'syncing' | 'offline' | 'error' | 'quota-exceeded';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Meta document to track live mutations across instances
const META_SYNC_DOC = 'meta/sync';

// Unique client/tab identifier to prevent self-triggered sync loops
export const CLIENT_ID = 'client_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();

export const FIREBASE_CONSOLE_QUOTA_URL =
  "https://console.firebase.google.com/project/bold-watch-k98sv/firestore/databases/ai-studio-pmtpmplant2-5b0cd9a2-449e-4575-92a6-f4dd212d5492/data?openUpgradeDialog=true";

export const FIREBASE_PRICING_URL =
  "https://firebase.google.com/pricing#cloud-firestore";

export function isQuotaExceededError(error: unknown): boolean {
  if (!error) return false;
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  const code = (error as any)?.code;
  return (
    code === 'resource-exhausted' ||
    code === 8 ||
    msg.includes('resource-exhausted') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota limit exceeded') ||
    msg.includes('quota metric') ||
    msg.includes('free daily write units') ||
    msg.includes('free daily read units') ||
    msg.includes('quota exceeded') ||
    msg.includes('maximum backoff delay') ||
    msg.includes('exceeded your current quota') ||
    msg.includes('rate-limit')
  );
}

const QUOTA_STORAGE_KEY = 'firestore_quota_exceeded_date';
const HASHES_STORAGE_KEY = 'maint_firestore_hashes';

// Memory and persistent state for quota exceeded
let _isQuotaExceeded = false;

// Check if quota was previously exceeded today from localStorage or sessionStorage
try {
  const today = new Date().toISOString().slice(0, 10);
  const savedQuotaDate =
    localStorage.getItem(QUOTA_STORAGE_KEY) ||
    sessionStorage.getItem(QUOTA_STORAGE_KEY);

  if (savedQuotaDate) {
    if (savedQuotaDate === today) {
      _isQuotaExceeded = true;
      disableNetwork(firestore).catch(() => {});
      console.info('Cloud Firestore network paused cleanly due to daily free quota limits (saved for today).');
    } else {
      // New day: clear previously saved quota flag to allow retesting
      localStorage.removeItem(QUOTA_STORAGE_KEY);
      sessionStorage.removeItem(QUOTA_STORAGE_KEY);
      _isQuotaExceeded = false;
    }
  }
} catch {
  // Ignore storage errors
}

export function isCloudQuotaExceeded(): boolean {
  return _isQuotaExceeded;
}

export async function markCloudQuotaExceeded(): Promise<void> {
  _isQuotaExceeded = true;
  const today = new Date().toISOString().slice(0, 10);
  try {
    localStorage.setItem(QUOTA_STORAGE_KEY, today);
    sessionStorage.setItem(QUOTA_STORAGE_KEY, today);
  } catch {}
  try {
    await disableNetwork(firestore);
    console.info('Cloud Firestore network paused cleanly due to daily free quota limits.');
  } catch (err) {
    // Already disabled or benign error
  }
}

export async function resetCloudQuotaStatus(): Promise<boolean> {
  try {
    localStorage.removeItem(QUOTA_STORAGE_KEY);
    sessionStorage.removeItem(QUOTA_STORAGE_KEY);
    await enableNetwork(firestore);
    // Ping to verify if quota is reset
    await getDoc(doc(firestore, 'meta', 'sync'));
    _isQuotaExceeded = false;
    return true;
  } catch (err) {
    if (isQuotaExceededError(err)) {
      await markCloudQuotaExceeded();
      return false;
    }
    // If not a quota error (e.g. offline), re-enable succeeded
    _isQuotaExceeded = false;
    return true;
  }
}

// Entity-level diff cache loaded from localStorage to avoid uploading unchanged collections across reloads
let lastSavedEntityHashes: Record<string, string> = {};
try {
  const stored = localStorage.getItem(HASHES_STORAGE_KEY);
  if (stored) {
    lastSavedEntityHashes = JSON.parse(stored);
  }
} catch {
  lastSavedEntityHashes = {};
}

/**
 * Loads an entity from Firestore catalog, supporting chunked documents if data exceeds 1 MiB limit.
 */
async function loadCatalogList<T>(snap: DocumentSnapshot, entityName: string): Promise<T[]> {
  if (!snap.exists()) return [];
  const data = snap.data();
  if (!data) return [];

  if (data.isChunked && typeof data.chunkCount === 'number') {
    const chunkPromises = [];
    for (let i = 0; i < data.chunkCount; i++) {
      chunkPromises.push(getDoc(doc(firestore, 'catalog', `${entityName}_chunk_${i}`)));
    }
    const chunkSnaps = await Promise.all(chunkPromises);
    const combined: T[] = [];
    for (const cSnap of chunkSnaps) {
      if (cSnap.exists() && Array.isArray(cSnap.data()?.list)) {
        combined.push(...cSnap.data()!.list);
      }
    }
    return combined;
  }

  return Array.isArray(data.list) ? (data.list as T[]) : [];
}

/**
 * Loads the complete database from Firebase Cloud Firestore.
 * Returns null if the database has not yet been initialized in Firebase or quota is exceeded.
 */
export async function loadDatabaseFromFirebase(): Promise<AppDatabaseState | null> {
  if (_isQuotaExceeded) {
    return null;
  }

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
        repairsCatalogSnap
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
        getDoc(doc(firestore, 'catalog', 'repairs'))
      ]);

      let repairs: RepairLog[] = await loadCatalogList<RepairLog>(repairsCatalogSnap, 'repairs');
      if (repairs.length === 0 && !repairsCatalogSnap.exists()) {
        // Fallback to legacy repairs collection if catalog document is not yet initialized
        try {
          const repairsCollectionSnap = await getDocs(collection(firestore, 'repairs'));
          repairsCollectionSnap.forEach((docSnap) => {
            repairs.push(docSnap.data() as RepairLog);
          });
        } catch {
          // Ignore if empty
        }
      }

      return {
        machines: await loadCatalogList<Machine>(machSnap, 'machines'),
        technicians: await loadCatalogList<string>(techSnap, 'technicians'),
        employees: await loadCatalogList<Employee>(empSnap, 'employees'),
        pmPlans: await loadCatalogList<PMPlan>(plansSnap, 'pmPlans'),
        schedules: await loadCatalogList<ScheduleItem>(schedSnap, 'schedules'),
        repairs,
        improvements: await loadCatalogList<ImprovementProject>(impSnap, 'improvements'),
        setupLogs: await loadCatalogList<SetupLog>(setSnap, 'setupLogs'),
        leaves: await loadCatalogList<TechnicianLeave>(leaveSnap, 'leaves'),
        spareParts: await loadCatalogList<SparePart>(partsSnap, 'spareParts'),
        cd5Projects: await loadCatalogList<CD5Project>(cd5Snap, 'cd5Projects'),
        users: await loadCatalogList<UserAccount>(usersSnap, 'users'),
        workRequests: await loadCatalogList<WorkRequest>(workRequestsSnap, 'workRequests'),
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
    if (isQuotaExceededError(error)) {
      console.warn('Cloud Firestore quota reached during load. Falling back to local server storage.');
      await markCloudQuotaExceeded();
      return null;
    }
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
 * Saves datasets to Cloud Firestore partitioned by entity catalog using differential writes.
 * Only entities that actually changed are written, saving massive quota.
 * Repairs are saved in catalog/repairs instead of 100+ individual documents.
 */
export async function saveDatabaseToFirebase(data: AppDatabaseState): Promise<void> {
  if (_isQuotaExceeded) {
    return;
  }

  try {
    // Sanitize all datasets to remove any undefined fields before writing to Firestore
    const cleanData = sanitizeForFirestore(data);

    const entityMap: Record<string, any> = {
      machines: { list: cleanData.machines || [] },
      technicians: { list: cleanData.technicians || [] },
      employees: { list: cleanData.employees || [] },
      pmPlans: { list: cleanData.pmPlans || [] },
      schedules: { list: cleanData.schedules || [] },
      improvements: { list: cleanData.improvements || [] },
      setupLogs: { list: cleanData.setupLogs || [] },
      leaves: { list: cleanData.leaves || [] },
      spareParts: { list: cleanData.spareParts || [] },
      cd5Projects: { list: cleanData.cd5Projects || [] },
      users: { list: cleanData.users || [] },
      workRequests: { list: cleanData.workRequests || [] },
      repairs: { list: cleanData.repairs || [] },
      settings: { data: cleanData.settings || {} }
    };

    const catalogBatch = writeBatch(firestore);
    let dirtyCount = 0;
    // Firestore hard document size limit is 1,048,576 bytes (1 MiB).
    // We chunk any list collection when its serialized representation exceeds 550 KB.
    const MAX_DOC_BYTES = 550 * 1024;

    for (const [entityName, entityDoc] of Object.entries(entityMap)) {
      if (Array.isArray(entityDoc.list) && JSON.stringify(entityDoc).length > MAX_DOC_BYTES) {
        // 1. Chunk array into sub-batches that each fit safely under 550 KB
        const chunks: any[][] = [];
        let curChunk: any[] = [];
        let curBytes = 0;

        for (const item of entityDoc.list) {
          const itemBytes = JSON.stringify(item).length;
          if (curChunk.length > 0 && curBytes + itemBytes > MAX_DOC_BYTES) {
            chunks.push(curChunk);
            curChunk = [item];
            curBytes = itemBytes;
          } else {
            curChunk.push(item);
            curBytes += itemBytes;
          }
        }
        if (curChunk.length > 0) {
          chunks.push(curChunk);
        }

        // Master index document
        const masterDoc = {
          isChunked: true,
          chunkCount: chunks.length,
          totalItems: entityDoc.list.length,
          updatedAt: new Date().toISOString()
        };
        const masterHash = JSON.stringify(masterDoc);
        if (lastSavedEntityHashes[entityName] !== masterHash) {
          catalogBatch.set(doc(firestore, 'catalog', entityName), masterDoc);
          lastSavedEntityHashes[entityName] = masterHash;
          dirtyCount++;
        }

        // Write each chunk
        for (let i = 0; i < chunks.length; i++) {
          const chunkKey = `${entityName}_chunk_${i}`;
          const chunkDoc = { list: chunks[i] };
          const chunkHash = JSON.stringify(chunkDoc);
          if (lastSavedEntityHashes[chunkKey] !== chunkHash) {
            catalogBatch.set(doc(firestore, 'catalog', chunkKey), chunkDoc);
            lastSavedEntityHashes[chunkKey] = chunkHash;
            dirtyCount++;
          }
        }

        // Clean up any surplus old chunks if chunk count decreased
        let surplusIdx = chunks.length;
        while (lastSavedEntityHashes[`${entityName}_chunk_${surplusIdx}`] !== undefined) {
          const surplusKey = `${entityName}_chunk_${surplusIdx}`;
          catalogBatch.delete(doc(firestore, 'catalog', surplusKey));
          delete lastSavedEntityHashes[surplusKey];
          dirtyCount++;
          surplusIdx++;
        }
      } else {
        // Standard non-chunked document
        const jsonHash = JSON.stringify(entityDoc);
        if (lastSavedEntityHashes[entityName] !== jsonHash) {
          catalogBatch.set(doc(firestore, 'catalog', entityName), entityDoc);
          lastSavedEntityHashes[entityName] = jsonHash;
          dirtyCount++;
        }

        // Clean up any surplus old chunks if entity was previously chunked
        let surplusIdx = 0;
        while (lastSavedEntityHashes[`${entityName}_chunk_${surplusIdx}`] !== undefined) {
          const surplusKey = `${entityName}_chunk_${surplusIdx}`;
          catalogBatch.delete(doc(firestore, 'catalog', surplusKey));
          delete lastSavedEntityHashes[surplusKey];
          dirtyCount++;
          surplusIdx++;
        }
      }
    }

    // Only commit writes if there are actual entity changes
    if (dirtyCount > 0) {
      catalogBatch.set(doc(firestore, 'meta', 'sync'), {
        lastUpdated: serverTimestamp(),
        isoUpdated: new Date().toISOString(),
        updatedBy: CLIENT_ID,
        version: 3
      });

      await catalogBatch.commit();
      try {
        localStorage.setItem(HASHES_STORAGE_KEY, JSON.stringify(lastSavedEntityHashes));
      } catch {
        // Ignore localStorage quota errors
      }
    }
  } catch (error) {
    if (isQuotaExceededError(error)) {
      console.warn('Cloud Firestore write quota reached. Gracefully pausing cloud writes for today.');
      await markCloudQuotaExceeded();
      return;
    }
    console.error('Error saving database to Cloud Firestore:', error);
    throw error;
  }
}

/**
 * Saves or updates a single repair log directly to Firestore
 */
export async function saveSingleRepairToFirebase(repair: RepairLog): Promise<void> {
  if (_isQuotaExceeded) {
    return;
  }
  try {
    const cleanRepair = sanitizeForFirestore(repair);
    await setDoc(doc(firestore, 'repairs', cleanRepair.id), cleanRepair, { merge: true });
    await setDoc(doc(firestore, 'meta', 'sync'), {
      lastUpdated: serverTimestamp(),
      isoUpdated: new Date().toISOString(),
      updatedEntity: 'repairs'
    }, { merge: true });
  } catch (error) {
    if (isQuotaExceededError(error)) {
      await markCloudQuotaExceeded();
      return;
    }
    console.error('Error saving single repair to Firestore:', error);
    throw error;
  }
}

/**
 * Deletes a single repair log from Firestore
 */
export async function deleteSingleRepairFromFirebase(repairId: string): Promise<void> {
  if (_isQuotaExceeded) {
    return;
  }
  try {
    await deleteDoc(doc(firestore, 'repairs', repairId));
    await setDoc(doc(firestore, 'meta', 'sync'), {
      lastUpdated: serverTimestamp(),
      isoUpdated: new Date().toISOString(),
      deletedEntity: 'repairs',
      deletedId: repairId
    }, { merge: true });
  } catch (error) {
    if (isQuotaExceededError(error)) {
      await markCloudQuotaExceeded();
      return;
    }
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
  if (_isQuotaExceeded) {
    return () => {};
  }

  let isFirst = true;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  try {
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
      if (isQuotaExceededError(err)) {
        console.warn('Firebase sync listener paused due to quota limit.');
        markCloudQuotaExceeded();
      } else {
        console.warn('Firebase sync listener warning:', err);
      }
    });
  } catch (err) {
    if (isQuotaExceededError(err)) {
      markCloudQuotaExceeded();
    }
    return () => {};
  }
}
