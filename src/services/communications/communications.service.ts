import { BaseService } from '../shared/base.service';

export interface Communication {
  id: string;
  title: string;
  content: string;
  sender_id: string;
  target_audience: 'all' | 'family' | 'professor' | 'students';
  created_at?: string;
  updated_at?: string;
}

class CommunicationsService extends BaseService<Communication> {
  constructor() {
    super('communications');
  }
}

export const communicationsService = new CommunicationsService();
