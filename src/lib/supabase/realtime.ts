// CLASSIUM SUPABASE REALTIME SYNC ENGINE
// Subscribes to Supabase Realtime Postgres Channels and bridges events to EducaIntegrationHub

import { getSupabase } from './client';
import { getSupabaseEnvConfig } from './config';
import { integrationHub, HubEvent } from '../integrationHub';
import { RealtimeChannel } from '@supabase/supabase-js';

export class SupabaseRealtimeService {
  private channel: RealtimeChannel | null = null;
  private isSubscribed: boolean = false;

  // Initialize and subscribe to global Classium Realtime Broadcast Channel
  public initRealtimeSync(): () => void {
    const config = getSupabaseEnvConfig();

    if (!config.isConfigured) {
      console.log('[Supabase Realtime] Modo local ativo (Integration Hub EventBus fallback).');
      return () => {};
    }

    try {
      const supabase = getSupabase();
      
      // Subscribe to Postgres changes & broadcast events on channel 'educa_plus_realtime'
      this.channel = supabase
        .channel('educa_plus_global_channel')
        .on(
          'broadcast',
          { event: 'hub_event' },
          (payload) => {
            if (payload && payload.payload) {
              const event: HubEvent = payload.payload;
              // Broadcast locally to Integration Hub
              integrationHub.publishEvent(event);
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public' },
          (payload) => {
            console.log('[Supabase Realtime Change Detected]:', payload);
            integrationHub.publishEvent({
              type: 'ItemUpdated',
              moduleSource: 'Gestor',
              targetScope: { targetType: 'all', targetName: 'Toda a Plataforma' },
              entity: (payload.table as any) || 'recados',
              action: `Sincronização Realtime (${payload.eventType})`,
              title: `Tabela ${payload.table} atualizada via Supabase`,
              description: `Registro alterado em tempo real no banco PostgreSQL Supabase.`,
              user: { name: 'Supabase Realtime Engine', role: 'PostgreSQL Sync', ip: '127.0.0.1' }
            });
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.isSubscribed = true;
            console.log('🟢 [Supabase Realtime Channel Subscribed]: Classium Global Event Stream');
          }
        });

      return () => {
        if (this.channel) {
          try {
            supabase.removeChannel(this.channel);
          } catch (e) {}
          this.isSubscribed = false;
        }
      };
    } catch (err) {
      console.warn('[Supabase Realtime Subscription Warning]:', err);
      return () => {};
    }
  }

  // Broadcast an event over Supabase Realtime
  public async broadcastEvent(event: HubEvent): Promise<boolean> {
    const config = getSupabaseEnvConfig();
    if (!config.isConfigured || !this.channel) {
      return false;
    }

    try {
      await this.channel.send({
        type: 'broadcast',
        event: 'hub_event',
        payload: event
      });
      return true;
    } catch (err) {
      console.warn('[Supabase Realtime Broadcast Warning]:', err);
      return false;
    }
  }

  public getStatus() {
    return {
      isSubscribed: this.isSubscribed,
      channelName: 'educa_plus_global_channel'
    };
  }
}

export const supabaseRealtime = new SupabaseRealtimeService();
