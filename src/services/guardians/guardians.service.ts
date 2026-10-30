import { BaseService } from '../shared/base.service';

export interface Guardian {
  id: string;
  profile_id?: string;
  school_id?: string;
  name: string;
  cpf?: string;
  email?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

class GuardiansService extends BaseService<Guardian> {
  constructor() {
    super('guardians');
  }
}
export const guardiansService = new GuardiansService();
