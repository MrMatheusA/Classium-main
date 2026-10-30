import { supabase } from '../../lib/supabase';
import { globalEventBusService } from './global-event-bus.service';
import { GlobalEvent } from '../../types/integration';

export class GlobalEventBus {
  private static instance: GlobalEventBus;

  private constructor() {}

  public static getInstance(): GlobalEventBus {
    if (!GlobalEventBus.instance) {
      GlobalEventBus.instance = new GlobalEventBus();
    }
    return GlobalEventBus.instance;
  }

  public async publishEvent(
    eventType: string,
    originModule: string,
    payload: any,
    schoolId?: string,
    destinationModule: string = '*'
  ): Promise<boolean> {
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;

      const error = null;
      await globalEventBusService.create({
        event_type: eventType,
        origin_module: originModule,
        destination_module: destinationModule,
        school_id: schoolId,
        user_id: userId,
        payload_json: payload,
        status: 'Pendente'
      });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[GlobalEventBus] Publish Error:', err);
      return false;
    }
  }

  public async getDashboardStats() {
    return await globalEventBusService.getDashboardStats();
  }
}

export const globalEventBus = GlobalEventBus.getInstance();
