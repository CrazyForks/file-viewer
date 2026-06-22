const DB_NAME = 'flyfish-file-viewer-cache';
const STORE_NAME = 'archiveEntries';
const DB_VERSION = 1;
const MAX_CACHE_ENTRY_BYTES = 24 * 1024 * 1024;
const MAX_CACHE_TOTAL_BYTES = 96 * 1024 * 1024;
let dbPromise = null;
const canUseIndexedDB = () => typeof indexedDB !== 'undefined';
const openCacheDb = () => {
    if (!canUseIndexedDB()) {
        return Promise.reject(new Error('IndexedDB 不可用'));
    }
    if (dbPromise) {
        return dbPromise;
    }
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
                store.createIndex('updatedAt', 'updatedAt');
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    return dbPromise;
};
const runStore = async (mode, runner) => {
    const db = await openCacheDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const request = runner(transaction.objectStore(STORE_NAME));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.onerror = () => reject(transaction.error);
    });
};
export const readArchiveCache = async (key) => {
    try {
        const cached = await runStore('readonly', store => store.get(key));
        return cached || null;
    }
    catch {
        return null;
    }
};
const pruneArchiveCache = async () => {
    try {
        const db = await openCacheDb();
        await new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('updatedAt');
            const entries = [];
            let total = 0;
            index.openCursor().onsuccess = event => {
                const cursor = event.target.result;
                if (!cursor) {
                    while (total > MAX_CACHE_TOTAL_BYTES && entries.length) {
                        const entry = entries.shift();
                        if (entry) {
                            total -= entry.size;
                            store.delete(entry.key);
                        }
                    }
                    return;
                }
                const value = cursor.value;
                total += value.size || 0;
                entries.push({ key: value.key, size: value.size || 0 });
                cursor.continue();
            };
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }
    catch {
        // Cache pruning is a best-effort optimization and must not block preview.
    }
};
export const writeArchiveCache = async (entry) => {
    if (entry.size > MAX_CACHE_ENTRY_BYTES) {
        return;
    }
    try {
        await runStore('readwrite', store => store.put({
            ...entry,
            updatedAt: Date.now(),
        }));
        await pruneArchiveCache();
    }
    catch {
        // Quota, private-mode, or browser policy errors simply disable cache writes.
    }
};
