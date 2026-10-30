import { supabase } from '../lib/supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type RealtimeCallback<T = any> = (payload: RealtimePostgresChangesPayload<T>) => void;

export interface SubscriptionOptions {
  table: string;
  schema?: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
}

interface ChannelMeta {
  channel: RealtimeChannel;
  channelName: string;
  options: SubscriptionOptions;
  callback: RealtimeCallback;
  retryCount: number;
  retryTimeout?: any;
}

export class RealtimeService {
  private static instance: RealtimeService;
  private channels: Map<string, ChannelMeta> = new Map();
  private isConnected = true;

  private constructor() {
    this.setupConnectionMonitor();
  }

  public static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService();
    }
    return RealtimeService.instance;
  }

  private setupConnectionMonitor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isConnected = true;
        this.reconnectAll();
      });

      window.addEventListener('offline', () => {
        this.isConnected = false;
      });
    }
  }

  private getChannelKey(channelName: string, options: SubscriptionOptions): string {
    const schema = options.schema || 'public';
    const event = options.event || '*';
    const filter = options.filter || 'all';
    return `${channelName}_${schema}:${options.table}:${event}:${filter}`;
  }

  public subscribe<T>(
    channelName: string,
    options: SubscriptionOptions,
    callback: RealtimeCallback<T>
  ): () => void {
    const key = this.getChannelKey(channelName, options);

    // If an existing subscription exists, clean it up first before creating a fresh one
    if (this.channels.has(key)) {
      this.unsubscribe(key);
    }

    this.createAndSubscribeChannel(key, channelName, options, callback);

    return () => this.unsubscribe(key);
  }

  private createAndSubscribeChannel<T>(
    key: string,
    channelName: string,
    options: SubscriptionOptions,
    callback: RealtimeCallback<T>
  ) {
    try {
      // Use unique internal channel identifier to avoid collision in Supabase realtime registry
      const uniqueChannelId = `${channelName}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const channel = supabase
        .channel(uniqueChannelId)
        .on(
          'postgres_changes' as any,
          {
            event: options.event || '*',
            schema: options.schema || 'public',
            table: options.table,
            filter: options.filter,
          },
          (payload) => {
            if (this.isConnected) {
              try {
                callback(payload as RealtimePostgresChangesPayload<T>);
              } catch (cbErr) {
                console.warn(`[RealtimeService] Callback error on ${key}:`, cbErr);
              }
            }
          }
        )
        .subscribe((status, err) => {
          const meta = this.channels.get(key);
          if (status === 'SUBSCRIBED') {
            if (meta) meta.retryCount = 0;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            // Graceful handling of transport errors (e.g., sandbox websocket limitations or temporary disconnects)
            if (meta && meta.retryCount < 3 && this.isConnected) {
              const delay = Math.min(1000 * Math.pow(2, meta.retryCount), 10000);
              meta.retryCount += 1;
              if (meta.retryTimeout) clearTimeout(meta.retryTimeout);
              meta.retryTimeout = setTimeout(() => {
                if (this.channels.has(key)) {
                  this.createAndSubscribeChannel(key, channelName, options, callback);
                }
              }, delay);
            }
          }
        });

      const meta: ChannelMeta = {
        channel,
        channelName,
        options,
        callback: callback as RealtimeCallback,
        retryCount: (this.channels.get(key)?.retryCount || 0)
      };

      this.channels.set(key, meta);
    } catch (err) {
      console.warn(`[RealtimeService] Falha ao inicializar canal ${key}:`, err);
    }
  }

  private unsubscribe(key: string) {
    const meta = this.channels.get(key);
    if (meta) {
      if (meta.retryTimeout) clearTimeout(meta.retryTimeout);
      try {
        supabase.removeChannel(meta.channel);
      } catch (err) {
        // Silently ignore removal issues
      }
      this.channels.delete(key);
    }
  }

  public unsubscribeAll() {
    this.channels.forEach((meta, key) => {
      if (meta.retryTimeout) clearTimeout(meta.retryTimeout);
      try {
        supabase.removeChannel(meta.channel);
      } catch (err) {
        // Silently ignore
      }
    });
    this.channels.clear();
  }

  private reconnectAll() {
    this.channels.forEach((meta, key) => {
      this.createAndSubscribeChannel(key, meta.channelName, meta.options, meta.callback);
    });
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const realtimeService = RealtimeService.getInstance();
