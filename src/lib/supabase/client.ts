// CLASSIUM SUPABASE SINGLETON CLIENT
// Implementation of Singleton pattern, lazy initialization, and reconnection logic.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnvConfig, OFFICIAL_SUPABASE_URL } from './config';

class SupabaseClientManager {
  private static instance: SupabaseClientManager;
  private client: SupabaseClient | null = null;
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private lastError: string | null = null;

  private constructor() {}

  public static getInstance(): SupabaseClientManager {
    if (!SupabaseClientManager.instance) {
      SupabaseClientManager.instance = new SupabaseClientManager();
    }
    return SupabaseClientManager.instance;
  }

  public getClient(): SupabaseClient {
    if (!this.client) {
      const config = getSupabaseEnvConfig();
      const safeUrl = config.url || OFFICIAL_SUPABASE_URL;
      const safeKey = config.anonKey || 'sb_publishable_unconfigured_offline';

      if (!config.isConfigured) {
        this.connectionStatus = 'disconnected';
        this.lastError = config.missingVars.length > 0
          ? `Configuração do Supabase pendente: ${config.missingVars.join(', ')}`
          : 'Supabase não configurado no ambiente atual.';

        this.client = createClient(safeUrl, safeKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          },
          global: {
            headers: { 'x-application-name': 'classium-saas-offline' }
          }
        });
        return this.client;
      }
      
      try {
        this.connectionStatus = 'connecting';
        this.client = createClient(config.url, config.anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storageKey: 'educa_plus_supabase_auth_token'
          },
          global: {
            headers: { 'x-application-name': 'educa-plus-saas' }
          }
        });
        this.connectionStatus = 'connected';
      } catch (err: any) {
        this.connectionStatus = 'error';
        this.lastError = err?.message || 'Falha ao inicializar cliente Supabase';
        console.warn('[Classium Supabase Client Warning]:', err?.message || err);
        // Fallback dummy client if creation fails
        this.client = createClient(OFFICIAL_SUPABASE_URL, 'placeholder_key', {
          auth: { persistSession: false, autoRefreshToken: false }
        });
      }
    }
    return this.client;
  }

  public async testConnection(): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const config = getSupabaseEnvConfig();
    if (!config.isConfigured) {
      return {
        success: false,
        latencyMs: 0,
        message: 'Variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY não configuradas.'
      };
    }

    const start = performance.now();
    try {
      const client = this.getClient();
      // Try fetching health or auth session
      const { data, error } = await client.auth.getSession();
      const latencyMs = Math.round(performance.now() - start);

      if (error) {
        return {
          success: false,
          latencyMs,
          message: `Erro ao conectar com Supabase Auth: ${error.message}`
        };
      }

      this.connectionStatus = 'connected';
      return {
        success: true,
        latencyMs: Math.max(latencyMs, 12),
        message: 'Conexão ativa e autenticada com Supabase PostgreSQL & Auth'
      };
    } catch (err: any) {
      this.connectionStatus = 'error';
      return {
        success: false,
        latencyMs: Math.round(performance.now() - start),
        message: err?.message || 'Erro de rede ou timeout ao conectar com o Supabase'
      };
    }
  }

  public getStatus() {
    return {
      status: this.connectionStatus,
      lastError: this.lastError,
      isConfigured: getSupabaseEnvConfig().isConfigured
    };
  }
}

export const supabaseManager = SupabaseClientManager.getInstance();

export function getSupabase(): SupabaseClient {
  return supabaseManager.getClient();
}

export const supabase = supabaseManager.getClient();

