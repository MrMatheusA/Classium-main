import { BaseService } from '../shared/base.service';

export interface Grade {
  id: string;
  student_id: string;
  class_id: string;
  subject_id: string;
  bimester: 'b1' | 'b2' | 'b3' | 'b4';
  value: number;
  created_at?: string;
  updated_at?: string;
}

class GradesService extends BaseService<Grade> {
  constructor() {
    super('grades');
  }
}

export const gradesService = new GradesService();
