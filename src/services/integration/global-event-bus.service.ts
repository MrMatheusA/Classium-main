import { BaseService } from '../shared/base.service';

export interface GlobalEventBusRecord {
  id?: string;
  event_type: string;
  origin_module: string;
  destination_module: string;
  school_id?: string;
  user_id?: string;
  payload_json: any;
  status: string;
  created_at?: string;
  updated_at?: string;
}

class GlobalEventBusService extends BaseService<GlobalEventBusRecord> {
  constructor() {
    super('global_event_bus');
  }

  async getDashboardStats() {
    const pending = await this.count({ status: 'Pendente' });
    const processing = await this.count({ status: 'Em processamento' });
    const synchronized = await this.count({ status: 'Sincronizado' });
    const errors = await this.count({ status: 'Erro' });

    return {
      pending: pending || 0,
      processing: processing || 0,
      synchronized: synchronized || 0,
      errors: errors || 0,
    };
  }
}

export const globalEventBusService = new GlobalEventBusService();
