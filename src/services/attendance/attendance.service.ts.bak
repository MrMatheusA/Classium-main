import { BaseService } from '../shared/base.service';

export interface Attendance {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

class AttendanceService extends BaseService<Attendance> {
  constructor() {
    super('attendance');
  }
}

export const attendanceService = new AttendanceService();
