import { describe, it, expect } from 'vitest';
import { 
  filterRadarItems, 
  normalizeSearchText, 
  RadarFilterCriteria 
} from './PedagogicalAbsenceRadarTab';
import { 
  calculateAttendanceMilestone, 
  AttendanceRadarItem 
} from '../../services/attendanceFrequencyService';

const mockStudents: AttendanceRadarItem[] = [
  {
    studentId: 'std-1',
    studentName: 'Roberth Henrique Alves',
    ra: 'RA-2026-320',
    className: '522',
    shift: 'Matutino',
    totalAbsences: 17,
    justifiedCount: 0,
    unjustifiedCount: 17,
    consecutiveCount: 2,
    milestone: 'atencao',
    milestoneLabel: 'Marco 16 Faltas — Atenção',
    milestoneColor: 'amber',
    responsibleStaff: 'Coordenação Pedagógica',
    caseStatus: 'aberto',
    history: []
  },
  {
    studentId: 'std-2',
    studentName: 'Ryan Gabriell',
    ra: 'RA-2026-911',
    className: '522',
    shift: 'Matutino',
    totalAbsences: 0,
    justifiedCount: 0,
    unjustifiedCount: 0,
    consecutiveCount: 0,
    milestone: 'regular',
    milestoneLabel: 'Frequência Regular',
    milestoneColor: 'emerald',
    responsibleStaff: 'Equipe Escolar',
    caseStatus: 'concluido',
    history: []
  },
  {
    studentId: 'std-3',
    studentName: 'Beatriz Vasconcelos',
    ra: 'RA-2026-104',
    className: '523',
    shift: 'Vespertino',
    totalAbsences: 35,
    justifiedCount: 5,
    unjustifiedCount: 30,
    consecutiveCount: 4,
    milestone: 'alerta',
    milestoneLabel: 'Marco 32 Faltas — Alerta Elevado',
    milestoneColor: 'orange',
    responsibleStaff: 'Coordenação Pedagógica',
    caseStatus: 'em_acompanhamento',
    history: []
  },
  {
    studentId: 'std-4',
    studentName: 'Lucas Fagundes',
    ra: 'RA-2026-888',
    className: '524',
    shift: 'Integral',
    totalAbsences: 56,
    justifiedCount: 2,
    unjustifiedCount: 54,
    consecutiveCount: 10,
    milestone: 'adicional',
    milestoneLabel: 'Marco 54 — Avaliação Pedagógica Necessária',
    milestoneColor: 'purple',
    responsibleStaff: 'Conselho Pedagógico',
    caseStatus: 'relatorio_elaboracao',
    history: []
  },
  {
    studentId: 'std-5',
    studentName: 'Camila Cristina Moreira',
    ra: 'RA-2026-444',
    className: '523',
    shift: 'Vespertino',
    totalAbsences: 49,
    justifiedCount: 1,
    unjustifiedCount: 48,
    consecutiveCount: 5,
    milestone: 'critico',
    milestoneLabel: 'Marco 48 Faltas — Crítico',
    milestoneColor: 'red',
    responsibleStaff: 'Coordenação Pedagógica',
    caseStatus: 'aberto',
    history: []
  }
];

describe('PedagogicalAbsenceRadarTab — Suíte de Regras e Conformidade do Radar', () => {

  describe('1. Normalização de Busca', () => {
    it('deve normalizar strings removendo acentos e maiúsculas', () => {
      expect(normalizeSearchText('Roberth')).toBe('roberth');
      expect(normalizeSearchText('Álves')).toBe('alves');
      expect(normalizeSearchText('  Beatriz   ')).toBe('beatriz');
      expect(normalizeSearchText('CONSELHO PEDAGÓGICO')).toBe('conselho pedagogico');
      expect(normalizeSearchText('')).toBe('');
      expect(normalizeSearchText(null as any)).toBe('');
    });
  });

  describe('2. Filtragem Cumulativa por Marcos (totalAbsences >= marco)', () => {
    it('Marco "all" deve retornar todos os estudantes', () => {
      const results = filterRadarItems(mockStudents, { milestoneFilter: 'all' });
      expect(results.length).toBe(5);
    });

    it('Marco 16 (Atenção) deve incluir estudantes com 16 ou mais faltas cumulativas', () => {
      const results = filterRadarItems(mockStudents, { milestoneFilter: '16' });
      // Roberth (17), Beatriz (35), Lucas (56), Camila (49) -> 4 estudantes
      expect(results.length).toBe(4);
      expect(results.find(s => s.studentId === 'std-2')).toBeUndefined(); // Ryan (0) ausente
      expect(results.map(s => s.studentId)).toEqual(
        expect.arrayContaining(['std-1', 'std-3', 'std-4', 'std-5'])
      );
    });

    it('Marco 32 (Alerta) deve incluir estudantes com 32 ou mais faltas cumulativas', () => {
      const results = filterRadarItems(mockStudents, { milestoneFilter: '32' });
      // Beatriz (35), Lucas (56), Camila (49) -> 3 estudantes
      expect(results.length).toBe(3);
      expect(results.find(s => s.studentId === 'std-1')).toBeUndefined(); // Roberth (17) ausente
      expect(results.find(s => s.studentId === 'std-2')).toBeUndefined(); // Ryan (0) ausente
    });

    it('Marco 48 (Crítico) deve incluir estudantes com 48 ou mais faltas cumulativas', () => {
      const results = filterRadarItems(mockStudents, { milestoneFilter: '48' });
      // Camila (49), Lucas (56) -> 2 estudantes
      expect(results.length).toBe(2);
      expect(results.map(s => s.studentId)).toEqual(
        expect.arrayContaining(['std-4', 'std-5'])
      );
    });

    it('Marco 54 (Deliberação) deve incluir estudantes com 54 ou mais faltas', () => {
      const results = filterRadarItems(mockStudents, { milestoneFilter: '54' });
      // Lucas (56) -> 1 estudante
      expect(results.length).toBe(1);
      expect(results[0].studentId).toBe('std-4');
    });

    it('Filtro "regular" deve retornar estudantes com menos de 16 faltas', () => {
      const results = filterRadarItems(mockStudents, { milestoneFilter: 'regular' });
      // Ryan (0) -> 1 estudante
      expect(results.length).toBe(1);
      expect(results[0].studentId).toBe('std-2');
    });
  });

  describe('3. Busca por Nome e RA Combinada com Filtros', () => {
    it('deve localizar por fragmento de nome insensível a maiúsculas e acentos', () => {
      const results = filterRadarItems(mockStudents, { search: 'alves' });
      expect(results.length).toBe(1);
      expect(results[0].studentName).toBe('Roberth Henrique Alves');
    });

    it('deve localizar por fragmento de RA', () => {
      const results = filterRadarItems(mockStudents, { search: '2026-911' });
      expect(results.length).toBe(1);
      expect(results[0].studentName).toBe('Ryan Gabriell');
    });

    it('deve combinar busca, turma, turno e marco cumulativo', () => {
      const results = filterRadarItems(mockStudents, {
        search: 'Beatriz',
        shift: 'Vespertino',
        className: '523',
        milestoneFilter: '32'
      });
      expect(results.length).toBe(1);
      expect(results[0].studentName).toBe('Beatriz Vasconcelos');

      // Se o turno não bater, deve retornar vazio sem estourar exceção
      const emptyShift = filterRadarItems(mockStudents, {
        search: 'Beatriz',
        shift: 'Matutino'
      });
      expect(emptyShift.length).toBe(0);
    });
  });

  describe('4. Resolução Canônica dos Marcos e Divergência 51 vs 54', () => {
    it('deve calcular corretamente os marcos de assiduidade segundo a escala institucional', () => {
      expect(calculateAttendanceMilestone(10).milestone).toBe('regular');
      expect(calculateAttendanceMilestone(16).milestone).toBe('atencao');
      expect(calculateAttendanceMilestone(31).milestone).toBe('atencao');
      expect(calculateAttendanceMilestone(32).milestone).toBe('alerta');
      expect(calculateAttendanceMilestone(47).milestone).toBe('alerta');
      expect(calculateAttendanceMilestone(48).milestone).toBe('critico');
      expect(calculateAttendanceMilestone(53).milestone).toBe('critico');
      expect(calculateAttendanceMilestone(54).milestone).toBe('adicional');
    });

    it('não deve emitir retenção ou notificação de forma automática nas descrições de marco', () => {
      const m16 = calculateAttendanceMilestone(16);
      const m32 = calculateAttendanceMilestone(32);
      const m48 = calculateAttendanceMilestone(48);
      const m54 = calculateAttendanceMilestone(54);

      // Descrições pedagógicas com foco em acompanhamento, busca ativa e conselho
      expect(m16.description).toContain('Primeiro marco');
      expect(m32.description).toContain('Alerta pedagógico elevado');
      expect(m48.description).toContain('busca ativa');
      expect(m54.description).toContain('Conselho Pedagógico');
    });
  });
});
