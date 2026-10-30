import { BaseService } from '../shared/base.service';

export interface NotificationQueueItem {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data?: any;
  status: string;
  created_at?: string;
  updated_at?: string;
}

class NotificationsService extends BaseService<NotificationQueueItem> {
  constructor() {
    super('notification_queue');
  }
}

export const notificationsService = new NotificationsService();
