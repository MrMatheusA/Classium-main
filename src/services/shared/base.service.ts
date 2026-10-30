import { supabase } from '../../lib/supabase';
import { applyQueryOptions, QueryOptions } from './query-builder';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class BaseService<T> {
  constructor(protected tableName: string) {}

  protected async withRetry<R>(operation: () => Promise<R>, retries = 3, delay = 1000): Promise<R> {
    let attempt = 0;
    while (attempt < retries) {
      try {
        return await operation();
      } catch (error: any) {
        attempt++;
        // Retry on network errors or transient 5xx errors
        if (attempt >= retries || (error?.status && error.status < 500 && error.status !== 429)) {
          throw error;
        }
        await sleep(delay * Math.pow(2, attempt - 1)); // Exponential backoff
      }
    }
    throw new Error('Max retries reached');
  }

  protected handleError(error: any, context: string): never {
    console.error(`[${this.tableName}] Error in ${context}:`, error);
    throw new Error(`Ocorreu um erro na operação: ${context}. Por favor, tente novamente.`);
  }

  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTtl = 5 * 60 * 1000; // 5 minutes

  protected getCacheKey(method: string, params: any): string {
    return `${method}:${JSON.stringify(params)}`;
  }

  protected getFromCache<R>(key: string): R | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
      return cached.data as R;
    }
    return null;
  }

  protected setCache(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  protected clearCache() {
    this.cache.clear();
  }

  async getAll(options: QueryOptions = {}): Promise<T[]> {
    const cacheKey = this.getCacheKey('getAll', options);
    const cached = this.getFromCache<T[]>(cacheKey);
    if (cached) return cached;

    try {
      return await this.withRetry(async () => {
        let query = supabase.from(this.tableName).select(options.select || '*');
        query = applyQueryOptions(query, options);
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        this.setCache(cacheKey, data);
        return data as T[];
      });
    } catch (error: any) {
      console.warn(`[${this.tableName}] Graceful fallback in getAll:`, error?.message || error);
      return [] as T[];
    }
  }

  async getById(id: string, select = '*'): Promise<T | null> {
    const cacheKey = this.getCacheKey('getById', { id, select });
    const cached = this.getFromCache<T>(cacheKey);
    if (cached) return cached;

    try {
      return await this.withRetry(async () => {
        const { data, error } = await supabase
          .from(this.tableName)
          .select(select)
          .eq('id', id)
          .single();
          
        if (error) {
          if (error.code === 'PGRST116') return null; // Not found
          throw error;
        }
        
        this.setCache(cacheKey, data);
        return data as T;
      });
    } catch (error) {
      this.handleError(error, 'getById');
    }
  }

  async create(payload: Partial<T>): Promise<T> {
    try {
      return await this.withRetry(async () => {
        const { data, error } = await supabase
          .from(this.tableName)
          .insert(payload as any)
          .select()
          .single();
          
        if (error) throw error;
        
        this.clearCache();
        return data as T;
      });
    } catch (error) {
      this.handleError(error, 'create');
    }
  }

  async update(id: string, payload: Partial<T>): Promise<T> {
    try {
      return await this.withRetry(async () => {
        const { data, error } = await supabase
          .from(this.tableName)
          .update(payload as any)
          .eq('id', id)
          .select()
          .single();
          
        if (error) throw error;
        
        this.clearCache();
        return data as T;
      });
    } catch (error) {
      this.handleError(error, 'update');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      return await this.withRetry(async () => {
        const { error } = await supabase
          .from(this.tableName)
          .delete()
          .eq('id', id);
          
        if (error) throw error;
        
        this.clearCache();
        return true;
      });
    } catch (error) {
      this.handleError(error, 'delete');
    }
  }

  async search(queryText: string, columns: string[] = ['name'], options: QueryOptions = {}): Promise<T[]> {
    const cacheKey = this.getCacheKey('search', { queryText, columns, options });
    const cached = this.getFromCache<T[]>(cacheKey);
    if (cached) return cached;

    try {
      return await this.withRetry(async () => {
        let query = supabase.from(this.tableName).select(options.select || '*');
        
        // Construct OR query for search across multiple columns
        if (queryText && columns.length > 0) {
           const orQuery = columns.map(col => `${col}.ilike.%${queryText}%`).join(',');
           query = query.or(orQuery);
        }

        query = applyQueryOptions(query, options);
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        this.setCache(cacheKey, data);
        return data as T[];
      });
    } catch (error) {
      this.handleError(error, 'search');
    }
  }

  async count(filters?: Record<string, any>): Promise<number> {
    try {
      let query = supabase.from(this.tableName).select('*', { count: 'exact', head: true });
      if (filters) {
        query = applyQueryOptions(query, { filters });
      }
      
      const { count, error } = await query;
      
      if (error) this.handleError(error, 'count');
      
      return count || 0;
    } catch (error) {
      this.handleError(error, 'count');
    }
  }

  async exists(filters: Record<string, any>): Promise<boolean> {
    const c = await this.count(filters);
    return c > 0;
  }
}
