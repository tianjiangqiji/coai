const DB_NAME = "coai_drawing_db";
const STORE_NAME = "drawing_history";
const DB_VERSION = 1;

export interface DrawingHistoryItem {
  id: string;
  time: number;
  status: string;
  images: string[];
  message: string;
  modelName?: string;
  params: any;
}

export class DrawingDB {
  private db: IDBDatabase | null = null;

  async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
    });
  }

  async getAll(): Promise<DrawingHistoryItem[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result as DrawingHistoryItem[];
        // 按时间倒序排序
        resolve(results.sort((a, b) => b.time - a.time));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveAll(
    items: DrawingHistoryItem[],
    maxCount: number = 100,
  ): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      // 先清空再保存，或者按需清理
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        const limitedItems = items.slice(0, maxCount);
        let completed = 0;
        if (limitedItems.length === 0) {
          resolve();
          return;
        }

        limitedItems.forEach((item) => {
          const addRequest = store.add(item);
          addRequest.onsuccess = () => {
            completed++;
            if (completed === limitedItems.length) resolve();
          };
          addRequest.onerror = () => reject(addRequest.error);
        });
      };
      clearRequest.onerror = () => reject(clearRequest.error);
    });
  }

  async add(item: DrawingHistoryItem, maxCount: number = 100): Promise<void> {
    await this.open();
    const items = await this.getAll();
    items.unshift(item);
    await this.saveAll(items, maxCount);
  }

  async delete(id: string): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const drawingDB = new DrawingDB();
