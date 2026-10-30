export interface GlobalEvent {
  event_id: string;
  event_type: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  origin_module: string;
  destination_module?: string;
  school_id?: string;
  user_id?: string;
  payload_json: any;
  status: 'Pendente' | 'Em processamento' | 'Sincronizado' | 'Erro' | 'Reprocessando';
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface SyncLog {
  id: string;
  event_id: string;
  user_id?: string;
  ip_address?: string;
  panel?: string;
  module: string;
  table_name: string;
  record_id?: string;
  execution_time_ms: number;
  created_at: string;
}
