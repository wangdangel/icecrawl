export class CacheService {
  static cache: Record<string, any> = {};
  
  static get<T>(key: string): T | undefined {
    return this.cache[key];
  }
  
  static set<T>(key: string, value: T, ttl?: number): boolean {
    this.cache[key] = value;
    return true;
  }
  
  static delete(key: string): boolean {
    if (key in this.cache) {
      delete this.cache[key];
      return true;
    }
    return false;
  }
  
  static clear(): void {
    this.cache = {};
  }
  
  static getStats() {
    return {
      keys: Object.keys(this.cache).length,
      hits: 0,
      misses: 0,
      ksize: 0,
      vsize: 0,
    };
  }
}
