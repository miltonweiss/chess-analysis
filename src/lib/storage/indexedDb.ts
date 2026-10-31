const DB_NAME = "chess-analysis";
const DB_VERSION = 1;

export type StoreName = "games" | "pgns" | "analyses" | "sync";

let dbPromise: Promise<IDBDatabase> | null = null;

export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDatabase(): Promise<IDBDatabase> {
  if (!isIndexedDbAvailable()) {
    return Promise.reject(new Error("IndexedDB is not available"));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains("games")) {
          const games = db.createObjectStore("games", { keyPath: "id" });
          games.createIndex("endTime", "endTime", { unique: false });
          games.createIndex("timeClass", "timeClass", { unique: false });
          games.createIndex("userColor", "userColor", { unique: false });
          games.createIndex("source", "source", { unique: false });
        }

        if (!db.objectStoreNames.contains("pgns")) {
          db.createObjectStore("pgns", { keyPath: "gameId" });
        }

        if (!db.objectStoreNames.contains("analyses")) {
          db.createObjectStore("analyses", { keyPath: "gameId" });
        }

        if (!db.objectStoreNames.contains("sync")) {
          db.createObjectStore("sync", { keyPath: "key" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
    });
  }

  return dbPromise;
}

export function resetDatabaseConnection(): void {
  dbPromise = null;
}

function runTransaction<T>(
  storeNames: StoreName | StoreName[],
  mode: IDBTransactionMode,
  callback: (stores: Record<StoreName, IDBObjectStore>) => Promise<T> | T,
): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const names = Array.isArray(storeNames) ? storeNames : [storeNames];
        const transaction = db.transaction(names, mode);
        const stores = Object.fromEntries(
          names.map((name) => [name, transaction.objectStore(name)]),
        ) as Record<StoreName, IDBObjectStore>;

        Promise.resolve(callback(stores))
          .then(resolve)
          .catch(reject);

        transaction.onerror = () => reject(transaction.error ?? new Error("Transaction failed"));
        transaction.onabort = () => reject(transaction.error ?? new Error("Transaction aborted"));
      }),
  );
}

export async function idbGet<T>(storeName: StoreName, key: IDBValidKey): Promise<T | undefined> {
  return runTransaction(storeName, "readonly", (stores) =>
    new Promise<T | undefined>((resolve, reject) => {
      const request = stores[storeName].get(key);
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error ?? new Error("get failed"));
    }),
  );
}

export async function idbPut<T>(storeName: StoreName, value: T): Promise<void> {
  return runTransaction(storeName, "readwrite", (stores) =>
    new Promise<void>((resolve, reject) => {
      const request = stores[storeName].put(value);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("put failed"));
    }),
  );
}

export async function idbPutMany<T>(storeName: StoreName, values: T[]): Promise<void> {
  if (values.length === 0) {
    return;
  }

  return runTransaction(storeName, "readwrite", (stores) =>
    new Promise<void>((resolve, reject) => {
      const store = stores[storeName];
      let completed = 0;

      for (const value of values) {
        const request = store.put(value);
        request.onerror = () => reject(request.error ?? new Error("putMany failed"));
        request.onsuccess = () => {
          completed += 1;
          if (completed === values.length) {
            resolve();
          }
        };
      }
    }),
  );
}

export async function idbGetAll<T>(storeName: StoreName): Promise<T[]> {
  return runTransaction(storeName, "readonly", (stores) =>
    new Promise<T[]>((resolve, reject) => {
      const request = stores[storeName].getAll();
      request.onsuccess = () => resolve((request.result ?? []) as T[]);
      request.onerror = () => reject(request.error ?? new Error("getAll failed"));
    }),
  );
}

export async function idbDelete(storeName: StoreName, key: IDBValidKey): Promise<void> {
  return runTransaction(storeName, "readwrite", (stores) =>
    new Promise<void>((resolve, reject) => {
      const request = stores[storeName].delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("delete failed"));
    }),
  );
}

export async function idbCount(storeName: StoreName): Promise<number> {
  return runTransaction(storeName, "readonly", (stores) =>
    new Promise<number>((resolve, reject) => {
      const request = stores[storeName].count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("count failed"));
    }),
  );
}

export async function idbClear(storeName: StoreName): Promise<void> {
  return runTransaction(storeName, "readwrite", (stores) =>
    new Promise<void>((resolve, reject) => {
      const request = stores[storeName].clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("clear failed"));
    }),
  );
}
