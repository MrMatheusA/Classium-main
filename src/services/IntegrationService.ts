import { supabase } from '../lib/supabase';
import { integrationQueueService, integrationLogsService, integrationErrorsService } from './integration/integration-models.service';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { realtimeService } from './RealtimeService';

export interface IntegrationEvent {
  event_name: string;
  payload: any;
  school_id?: string;
}

export class IntegrationService {
  private static instance: IntegrationService;
  private isProcessing = false;

  private constructor() {
    this.setupQueueListener();
  }

  public static getInstance(): IntegrationService {
    if (!IntegrationService.instance) {
      IntegrationService.instance = new IntegrationService();
    }
    return IntegrationService.instance;
  }

  /**
   * Dispatch an event to the Integration Queue
   */
  public async dispatchEvent(event: IntegrationEvent): Promise<boolean> {
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;

      const error = null;
      await integrationQueueService.create({
        event_name: event.event_name,
        payload: event.payload,
        school_id: event.school_id,
        triggered_by: userId,
        status: 'PENDING',
      });

      if (error) {
        console.error('[IntegrationService] Error dispatching event:', error);
        return false;
      }

      console.log(`[IntegrationService] Event dispatched: ${event.event_name}`);
      return true;
    } catch (err) {
      console.error('[IntegrationService] Exception dispatching event:', err);
      return false;
    }
  }

  /**
   * Listen for new events in the queue via Realtime and process them
   * Note: In a real enterprise system, a backend service (Node.js/Edge Function)
   * would listen to this queue. For this client-side demo, we simulate processing.
   */
  private setupQueueListener() {
    console.log('[IntegrationService] Setting up Queue Listener...');
    realtimeService.subscribe(
      'integration_queue_channel',
      {
        table: 'integration_queue',
        schema: 'public',
        event: 'INSERT',
        filter: "status=eq.PENDING",
      },
      (payload) => {
        console.log('[IntegrationService] New event in queue:', payload.new);
        // Simulate background processing locally or trigger Edge Function
        this.processQueue();
      }
    );
  }

  /**
   * Simulates processing the queue (Idempotent worker)
   */
  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // 1. Fetch pending events
      const { data: pendingEvents, error } = await supabase
        .from('integration_queue')
        .select('*')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: true })
        .limit(10);

      if (error || !pendingEvents || pendingEvents.length === 0) {
        this.isProcessing = false;
        return;
      }

      for (const event of pendingEvents) {
        await this.processEvent(event);
      }

    } catch (err) {
      console.error('[IntegrationService] Queue processing error:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processEvent(eventRecord: any) {
    console.log(`[IntegrationService] Processing event: ${eventRecord.event_name}`);
    
    try {
      // 1. Mark as processing
      await integrationQueueService.update(eventRecord.id, { status: 'PROCESSING' });

      // 2. Fetch subscriptions for this event
      const { data: subscriptions } = await supabase
        .from('event_subscriptions')
        .select('*')
        .eq('event_name', eventRecord.event_name)
        .eq('is_active', true);

      // 3. Execute actions (Simulation)
      if (subscriptions && subscriptions.length > 0) {
         for (const sub of subscriptions) {
             console.log(`[IntegrationService] Routing event ${eventRecord.event_name} to module ${sub.subscriber_module}`);
             // Here we would call the specific module handler or Edge Function
             
             // Log execution
             await integrationLogsService.create({
                 queue_id: eventRecord.id,
                 action: `Routed to ${sub.subscriber_module}`,
                 details: `Action: ${sub.action_to_take}`
             });
         }
      }

      // 4. Mark as completed
      await integrationQueueService.update(eventRecord.id, { status: 'COMPLETED' });

    } catch (error: any) {
      console.error(`[IntegrationService] Failed to process event ${eventRecord.id}:`, error);
      
      // Mark as failed and increment retry
      const nextRetryCount = eventRecord.retry_count + 1;
      const status = nextRetryCount >= eventRecord.max_retries ? 'FAILED' : 'PENDING';
      
      await integrationQueueService.update(eventRecord.id, { 
          status, 
          retry_count: nextRetryCount,
          next_retry_at: new Date(Date.now() + 5000 * nextRetryCount).toISOString()
      } as any);

      if (status === 'FAILED') {
         await integrationErrorsService.create({
             queue_id: eventRecord.id,
             error_message: error.message || 'Unknown error',
         });
      }
    }
  }

  public async getDashboardStats() {
      // Retorna estatísticas para o dashboard técnico
      const processedCount = await integrationQueueService.count({ status: 'COMPLETED' });
      const pendingCount = await integrationQueueService.count({ status: 'PENDING' });
      const errorCount = await integrationQueueService.count({ status: 'FAILED' });

      return {
          processed: processedCount || 0,
          pending: pendingCount || 0,
          errors: errorCount || 0,
          realtimeStatus: realtimeService.getConnectionStatus() ? 'Online' : 'Offline'
      };
  }
}

export const integrationService = IntegrationService.getInstance();
