import { describe, it, expect, beforeEach, vi } from 'vitest';
import { studentsService, deduplicateStudents, Student } from './students.service';

describe('StudentsService & Deduplication Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('deduplicateStudents', () => {
    it('should correctly deduplicate students by ID, registration code, CPF, and normalized name', () => {
      const students: Partial<Student>[] = [
        { id: '1', registration_code: 'MAT001', cpf: '11122233344', full_name: 'Ana Silva', birth_date: '2010-05-12' },
        { id: '1', registration_code: 'MAT001', cpf: '11122233344', full_name: 'Ana Silva', birth_date: '2010-05-12' }, // Exact duplicate
        { id: '2', registration_code: 'mat001', cpf: '99999999999', full_name: 'Ana Silva', birth_date: '2010-05-12' }, // Duplicate code & name
        { id: '3', registration_code: 'MAT002', cpf: '22233344455', full_name: 'Outra Ana', birth_date: '2010-05-12' }, // Unique CPF & Code
      ];

      const result = deduplicateStudents(students as Student[]);
      expect(result.length).toBe(2);
      expect(result.map(s => s.id)).toEqual(['1', '3']);
    });

    it('should handle empty or non-array inputs gracefully', () => {
      expect(deduplicateStudents(null as any)).toEqual([]);
      expect(deduplicateStudents(undefined as any)).toEqual([]);
      expect(deduplicateStudents([] as any)).toEqual([]);
    });
  });

  describe('StudentsService API methods', () => {
    it('should successfully fetch students list', async () => {
      const mockItems = [
        { id: 's1', full_name: 'Estudante Teste 1', registration_code: 'REG1' }
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: mockItems, total: 1, canManage: true })
      });

      const res = await studentsService.getStudents('org-123', { search: 'Teste' });
      expect(res.error).toBeNull();
      expect(res.items).toEqual(mockItems);
      expect(res.total).toBe(1);
      expect(res.canManage).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/students'),
        expect.any(Object)
      );
    });

    it('should return authentication error on 401 response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      });

      const res = await studentsService.getStudents();
      expect(res.items).toEqual([]);
      expect(res.error).toBe('Unauthorized');
    });

    it('should successfully create a student', async () => {
      const newStudentPayload = { full_name: 'Novo Aluno', registration_code: 'REG999', organization_id: 'org-123' };
      const createdRecord = { id: 's-new', ...newStudentPayload };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, student: createdRecord })
      });

      const res = await studentsService.createStudent(newStudentPayload);
      expect(res.error).toBeNull();
      expect(res.student).toEqual(createdRecord);
    });

    it('should handle network error gracefully when fetching student by ID', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network failure'));

      const res = await studentsService.getStudentById('s1');
      expect(res.student).toBeNull();
      expect(res.error).toBe('Não foi possível comunicar com o servidor.');
    });
  });
});
