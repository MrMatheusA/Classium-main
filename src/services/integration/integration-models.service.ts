import { BaseService } from '../shared/base.service';

export interface IntegrationQueue {
  id?: string;
  event_name: string;
  payload: any;
  school_id?: string;
  triggered_by?: string;
  status: string;
  created_at?: string;
}

export interface IntegrationLog {
  queue_id: string;
  action: string;
  details: string;
  created_at?: string;
}

export interface IntegrationError {
  queue_id: string;
  error_message: string;
  stack_trace?: string;
  created_at?: string;
}

class IntegrationQueueService extends BaseService<IntegrationQueue> {
  constructor() {
    super('integration_queue');
  }
}

class IntegrationLogsService extends BaseService<IntegrationLog> {
  constructor() {
    super('integration_logs');
  }
}

class IntegrationErrorsService extends BaseService<IntegrationError> {
  constructor() {
    super('integration_errors');
  }
}

export const integrationQueueService = new IntegrationQueueService();
export const integrationLogsService = new IntegrationLogsService();
export const integrationErrorsService = new IntegrationErrorsService();
