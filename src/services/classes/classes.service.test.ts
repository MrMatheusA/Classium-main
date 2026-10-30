import { describe, it, expect, beforeEach, vi } from 'vitest';
import { classesService } from './classes.service';

describe('ClassesService & Student Enrollment Canonical Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    
    // URL-based mock dispatcher
    vi.stubGlobal('fetch', vi.fn((url: string, opts?: any) => {
      const urlStr = String(url);
      
      // 1. Link / Unlink Student
      if (urlStr.includes('/api/classes/link-student')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, message: 'Operação realizada com sucesso.' })
        });
      }

      // 2. Class Students Roster
      if (urlStr.includes('/api/classes/') && urlStr.includes('/students')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                id: 'st-1',
                student_id: 'st-1',
                name: 'Mariana Lima',
                full_name: 'Mariana Lima',
                registration_code: 'RA-001234',
                status: 'Matriculado',
                class_id: 'cls-1'
              }
            ]
          })
        });
      }

      // 3. Classes CRUD
      if (urlStr.includes('/api/classes')) {
        if (opts?.method === 'POST') {
          const body = JSON.parse(opts?.body || '{}');
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                id: 'cls-new',
                name: body.name || 'Nova Turma',
                shift: body.shift || 'Matutino',
                room: body.room || '01',
                max_students: 35
              }
            })
          });
        }
        if (opts?.method === 'PUT') {
          const body = JSON.parse(opts?.body || '{}');
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: { id: 'cls-1', ...body }
            })
          });
        }
        if (opts?.method === 'DELETE') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true })
          });
        }
        // GET /api/classes
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                id: 'cls-1',
                name: '7º Ano A',
                grade: '7º Ano',
                shift: 'Matutino',
                room: 'Sala 03',
                max_capacity: 35,
                students_count: 28
              }
            ]
          })
        });
      }

      // 4. Students API
      if (urlStr.includes('/api/students')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            items: [
              { id: 'st-1', full_name: 'Lucas Rocha', registration_code: 'RA-111' },
              { id: 'st-2', full_name: 'Beatriz Costa', registration_code: 'RA-222' }
            ]
          })
        });
      }

      // 5. Disciplines API
      if (urlStr.includes('/api/disciplines')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: [
              { id: 'd-1', name: 'Matemática', code: 'MAT' },
              { id: 'd-2', name: 'Língua Portuguesa', code: 'POR' }
            ]
          })
        });
      }

      // Default mock for PostgREST remote calls during unit test
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ error: 'PostgREST mock fallback' }),
        text: async () => ''
      });
    }));
  });

  it('1. should be defined and expose canonical methods', () => {
    expect(classesService).toBeDefined();
    expect(typeof classesService.getClassesByOrganization).toBe('function');
    expect(typeof classesService.getClassStudents).toBe('function');
    expect(typeof classesService.getAvailableStudents).toBe('function');
    expect(typeof classesService.linkStudent).toBe('function');
    expect(typeof classesService.unlinkStudent).toBe('function');
    expect(typeof classesService.createClass).toBe('function');
    expect(typeof classesService.updateClass).toBe('function');
    expect(typeof classesService.deleteClass).toBe('function');
  });

  describe('getClassesByOrganization', () => {
    it('2. should fetch and map classes from API fallback', async () => {
      const classes = await classesService.getClassesByOrganization('org-123');
      expect(Array.isArray(classes)).toBe(true);
      expect(classes.length).toBeGreaterThanOrEqual(1);
      expect(classes[0].name).toBe('7º Ano A');
      expect(classes[0].shift).toBe('Matutino');
    });

    it('3. should return empty array gracefully when API throws network error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
        if (String(url).includes('/api/classes')) {
          return Promise.reject(new Error('Network offline'));
        }
        return Promise.resolve({
          ok: false,
          status: 500,
          json: async () => ({ error: 'DB offline' }),
          text: async () => ''
        });
      }));

      const classes = await classesService.getClassesByOrganization('org-fail');
      expect(Array.isArray(classes)).toBe(true);
      expect(classes).toEqual([]);
    });
  });

  describe('createClass & updateClass & deleteClass', () => {
    it('4. should validate required name before creating class', async () => {
      const res = await classesService.createClass({ name: '' }, 'org-123');
      expect(res.success).toBe(false);
      expect(res.error).toBe('O nome da turma é obrigatório.');
    });

    it('5. should create class and call /api/classes endpoint on fallback', async () => {
      const res = await classesService.createClass({
        name: '9º Ano B',
        shift: 'Vespertino',
        room: 'Sala 05'
      }, 'org-123');

      expect(res.success).toBe(true);
      expect(res.data?.name).toBe('9º Ano B');
      expect(res.data?.shift).toBe('Vespertino');
    });

    it('6. should update class and return updated model', async () => {
      const res = await classesService.updateClass('cls-1', { name: '8º Ano A Alterado' }, 'org-123');
      expect(res.success).toBe(true);
      expect(res.data?.name).toBe('8º Ano A Alterado');
    });

    it('7. should delete class when no students enrolled', async () => {
      const res = await classesService.deleteClass('cls-empty', 'org-123');
      expect(res.success).toBe(true);
    });
  });

  describe('getClassStudents & Student Roster', () => {
    it('8. should return empty array if classId is empty', async () => {
      const res = await classesService.getClassStudents('', 'org-123');
      expect(res).toEqual([]);
    });

    it('9. should fetch students from /api/classes/:id/students fallback', async () => {
      const res = await classesService.getClassStudents('cls-1', 'org-123');
      expect(res.length).toBe(1);
      expect(res[0].full_name).toBe('Mariana Lima');
      expect(res[0].registration_code).toBe('RA-001234');
    });
  });

  describe('linkStudent & unlinkStudent (Canonical Enrollment)', () => {
    it('10. should validate classId and studentId before linking', async () => {
      const res1 = await classesService.linkStudent('', 'st-1', 'org-123');
      expect(res1.success).toBe(false);
      expect(res1.error).toContain('obrigatórios');

      const res2 = await classesService.linkStudent('cls-1', '', 'org-123');
      expect(res2.success).toBe(false);
      expect(res2.error).toContain('obrigatórios');
    });

    it('11. should link student and synchronize with /api/classes/link-student', async () => {
      const res = await classesService.linkStudent('cls-1', 'st-99', 'org-123');
      expect(res.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/classes/link-student',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ class_id: 'cls-1', student_id: 'st-99' })
        })
      );
    });

    it('12. should validate classId and studentId before unlinking', async () => {
      const res = await classesService.unlinkStudent('', '', 'org-123');
      expect(res.success).toBe(false);
      expect(res.error).toContain('obrigatórios');
    });

    it('13. should unlink student and synchronize with DELETE /api/classes/link-student', async () => {
      const res = await classesService.unlinkStudent('cls-1', 'st-99', 'org-123');
      expect(res.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/classes/link-student',
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({ class_id: 'cls-1', student_id: 'st-99' })
        })
      );
    });
  });

  describe('getAvailableStudents', () => {
    it('14. should return available students with enrollment indicators', async () => {
      const students = await classesService.getAvailableStudents('org-123');
      expect(Array.isArray(students)).toBe(true);
      expect(students.length).toBe(2);
      expect(students[0].name).toBe('Lucas Rocha');
      expect(typeof students[0].is_enrolled).toBe('boolean');
    });
  });

  describe('Disciplines methods', () => {
    it('15. should handle getDisciplines via API', async () => {
      const res = await classesService.getDisciplines('org-123');
      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBe(2);
      expect(res[0].name).toBe('Matemática');
    });
  });
});
