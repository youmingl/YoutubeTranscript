// LRUCache.ts
class LRUCache {
    private keys: string[];
    private cacheSize: number;
  
    constructor(cacheSize: number) {
      this.keys = [];
      this.cacheSize = cacheSize;
    }
  
    async get(key: string): Promise<any> {
      const data = await new Promise<any>((resolve) => {
        chrome.storage.local.get([key], (result) => {
          resolve(result[key]);
        });
      });
  
      if (data) {
        this.keys = this.keys.filter((k) => k !== key);
        this.keys.push(key);
      }
  
      return data;
    }
  
    async set(key: string, value: any): Promise<void> {
      if (this.keys.length >= this.cacheSize) {
        const lruKey = this.keys.shift();
        if (lruKey) {
          chrome.storage.local.remove(lruKey);
        }
      }
  
      this.keys.push(key);
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({ [key]: value }, resolve);
      });
    }
  }
  
  export default LRUCache;