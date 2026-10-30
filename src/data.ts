import { StudentData } from './types';

export const emptyStudent: StudentData = {
  id: '',
  name: '',
  photoUrl: '',
  grade: '',
  classId: '',
  ibeScore: 0,
  attendanceRate: 0,
  aiAlerts: [],
  occurrences: [],
  performance: [],
  guardians: []
};

// Aliased for backward compatibility with empty fallback
export const mockStudent: StudentData = emptyStudent;
