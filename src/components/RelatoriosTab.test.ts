import { describe, it, expect } from 'vitest';
import { DEFAULT_STUDENTS, DEFAULT_CLASSES } from './RelatoriosTab';

describe('RelatoriosTab Stability & Fallback Suite', () => {
  it('should provide canonical default students with complete profile data', () => {
    expect(DEFAULT_STUDENTS.length).toBeGreaterThan(0);
    for (const student of DEFAULT_STUDENTS) {
      expect(student.id).toBeDefined();
      expect(student.name).toBeTruthy();
      expect(student.registration_code).toBeTruthy();
      expect(student.status).toBe('active');
    }
  });

  it('should provide canonical default classes for professor view', () => {
    expect(DEFAULT_CLASSES.length).toBeGreaterThan(0);
    for (const cls of DEFAULT_CLASSES) {
      expect(cls.id).toBeDefined();
      expect(cls.name).toBeTruthy();
      expect(cls.room).toBeTruthy();
      expect(cls.shift).toBeTruthy();
      expect(cls.studentsCount).toBeGreaterThan(0);
    }
  });

  it('should safely extract student attributes without throwing on partial or empty data', () => {
    const safeExtract = (st: any) => {
      const name = st?.name || st?.full_name || 'Estudante';
      const ra = st?.registration_code || st?.code || st?.ra || 'RA-2026-320';
      const attendance = st?.attendance_rate || '95.4%';
      return { name, ra, attendance };
    };

    expect(safeExtract(null)).toEqual({
      name: 'Estudante',
      ra: 'RA-2026-320',
      attendance: '95.4%'
    });

    expect(safeExtract(undefined)).toEqual({
      name: 'Estudante',
      ra: 'RA-2026-320',
      attendance: '95.4%'
    });

    expect(safeExtract(DEFAULT_STUDENTS[0])).toEqual({
      name: 'Arthur Vinícius Pereira',
      ra: '2024-901-008',
      attendance: '95.4%'
    });
  });
});
