const isBrowser = typeof window !== "undefined";

const DB_NAME = "teacher-depth";
const DB_VERSION = 1;
const STORE_NAME = "teaching-engine-files";
const STORE_KEY = "attached-files";

type StoredTeachingEngineFile = {
  name: string;
  type: string;
  lastModified: number;
  blob: Blob;
};

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!isBrowser) {
      reject(new Error("IndexedDB is not available outside the browser."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open teaching engine storage."));
  });
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function transactionToPromise(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
  });
}

function toFile(record: File | StoredTeachingEngineFile) {
  if (record instanceof File) {
    return record;
  }

  return new File([record.blob], record.name, {
    type: record.type,
    lastModified: record.lastModified,
  });
}

function toStoredFile(file: File): StoredTeachingEngineFile {
  return {
    name: file.name,
    type: file.type,
    lastModified: file.lastModified,
    blob: file,
  };
}

export async function loadTeachingEngineFiles() {
  if (!isBrowser) return [] as File[];

  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const result = await requestToPromise<File[] | StoredTeachingEngineFile[] | undefined>(store.get(STORE_KEY));
    await transactionToPromise(transaction);

    if (!Array.isArray(result)) {
      return [];
    }

    return result.map(toFile);
  } catch {
    return [] as File[];
  } finally {
    database.close();
  }
}

export async function saveTeachingEngineFiles(files: File[]) {
  if (!isBrowser) return;

  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.put(files.map(toStoredFile), STORE_KEY);
    await transactionToPromise(transaction);
  } catch {
    // Ignore persistence failures so the editor stays usable offline.
  } finally {
    database.close();
  }
}

export async function clearTeachingEngineFiles() {
  if (!isBrowser) return;

  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.delete(STORE_KEY);
    await transactionToPromise(transaction);
  } catch {
    // Ignore persistence failures so clearing still succeeds in the UI.
  } finally {
    database.close();
  }
}