import { supabase } from '../lib/supabase';

export type AttendanceMilestone = 'regular' | 'atencao' | 'alerta' | 'critico' | 'adicional';

export type AttendanceCaseStatus = 
  | 'aberto' 
  | 'em_acompanhamento' 
  | 'relatorio_elaboracao' 
  | 'relatorio_revisado' 
  | 'encaminhamento_registrado' 
  | 'concluido';

export interface AttendanceRecord {
  id: string;
  student_id: string;
  student_name?: string;
  class_id?: string;
  class_name?: string;
  attendance_date: string;
  status: 'PRESENT' | 'ABSENT' | 'JUSTIFIED' | 'LATE';
  observations?: string;
  justification?: string;
  attachment_url?: string;
  created_at: string;
}

export interface StudentAttendanceSummary {
  studentId: string;
  studentName: string;
  ra?: string;
  className?: string;
  year: number;
  expectedDays: number;
  absencesCount: number;
  justifiedCount: number;
  unjustifiedCount: number;
  confirmedPresences: number;
  projectedBalance: number;
  projectedBalanceDisclaimer: string;
  milestone: AttendanceMilestone;
  milestoneLabel: string;
  milestoneColor: string;
  milestoneDescription: string;
  consecutiveAbsences: number;
  history: AttendanceRecord[];
}

export interface AttendanceRadarItem {
  studentId: string;
  studentName: string;
  ra: string;
  className: string;
  shift: string;
  totalAbsences: number;
  justifiedCount: number;
  unjustifiedCount: number;
  consecutiveCount: number;
  milestone: AttendanceMilestone;
  milestoneLabel: string;
  milestoneColor: string;
  responsibleStaff: string;
  caseStatus: AttendanceCaseStatus;
  lastContactDate?: string;
  activeSearchNotes?: string;
  history: AttendanceRecord[];
}

export interface RecordAbsencePayload {
  student_id: string;
  class_id?: string;
  dates: string[]; // single date or array of dates for weekly
  status: 'ABSENT' | 'JUSTIFIED' | 'PRESENT' | 'LATE';
  observations?: string;
  justification?: string;
  attachment_url?: string;
}

export interface AttendanceCaseActionPayload {
  studentId: string;
  year?: number;
  actionType: 'busca_ativa' | 'contato_familia' | 'parecer_tecnico' | 'reuniao' | 'encaminhamento';
  status: AttendanceCaseStatus;
  notes: string;
  responsibleName: string;
  protocolNumber?: string;
  destinationEntity?: string;
}

export interface AdjustAttendanceTotalsPayload {
  studentId: string;
  year?: number;
  justifiedCount: number;
  unjustifiedCount: number;
  reason: string;
  authorName?: string;
}

// ---------------------------------------------------------
// Helper: Calculate Milestone from absence count
// Marcos: 16 (Amarelo / Atenção), 32 (Laranja / Alerta), 48 (Vermelho / Crítico), 54 (Alerta de Frequência — Avaliação Pedagógica Necessária)
// ---------------------------------------------------------
export function calculateAttendanceMilestone(absencesCount: number): {
  milestone: AttendanceMilestone;
  label: string;
  color: string;
  description: string;
} {
  if (absencesCount >= 54) {
    return {
      milestone: 'adicional',
      label: 'Marco 54 — Avaliação Pedagógica Necessária',
      color: 'rose',
      description: 'Volume extremo de ausências. Requer deliberação imediata do Conselho Pedagógico.'
    };
  }
  if (absencesCount >= 48) {
    return {
      milestone: 'critico',
      label: 'Marco 48 Faltas — Crítico',
      color: 'red',
      description: 'Nível crítico atingido. Notificação formal urgente e busca ativa intensificada.'
    };
  }
  if (absencesCount >= 32) {
    return {
      milestone: 'alerta',
      label: 'Marco 32 Faltas — Alerta Elevado',
      color: 'orange',
      description: 'Alerta pedagógico elevado. Convocação presencial dos responsáveis para alinhamento.'
    };
  }
  if (absencesCount >= 16) {
    return {
      milestone: 'atencao',
      label: 'Marco 16 Faltas — Atenção',
      color: 'amber',
      description: 'Primeiro marco de monitoramento. Contato preventivo e averiguação das causas.'
    };
  }
  return {
    milestone: 'regular',
    label: 'Frequência Regular',
    color: 'emerald',
    description: 'Frequência dentro dos parâmetros regulares previstos no ano letivo.'
  };
}

// ---------------------------------------------------------
// In-memory fallback cache for cases if backend table is absent
// ---------------------------------------------------------
const localCasesMap = new Map<string, {
  status: AttendanceCaseStatus;
  responsibleName: string;
  notes: string;
  lastContactDate?: string;
  protocolNumber?: string;
  actions: Array<{ date: string; type: string; notes: string; staff: string }>;
}>();

export const attendanceFrequencyService = {
  /**
   * Fetch annual summary for a student (Portal Família & Gestor Estudantes)
   */
  async getStudentAttendanceSummary(studentId: string, year = 2026): Promise<StudentAttendanceSummary> {
    try {
      const res = await fetch(`/api/attendance/summary/${encodeURIComponent(studentId)}?year=${year}`);
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.data) {
          return body.data;
        }
      }
    } catch (_) {
      // fallback to Supabase direct query
    }

    // Direct Supabase query fallback
    try {
      const { data: records, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', studentId)
        .gte('attendance_date', `${year}-01-01`)
        .lte('attendance_date', `${year}-12-31`)
        .order('attendance_date', { ascending: false });

      if (error) {
        console.warn('[attendanceFrequencyService] Query error:', error);
      }

      const list: AttendanceRecord[] = (records || []).map((r: any) => ({
        id: r.id || `${r.student_id}-${r.attendance_date}`,
        student_id: r.student_id,
        class_id: r.class_id,
        attendance_date: r.attendance_date,
        status: (r.status || 'PRESENT').toUpperCase() as any,
        observations: r.observations || '',
        justification: r.justification || '',
        attachment_url: r.attachment_url || '',
        created_at: r.created_at || new Date().toISOString()
      }));

      const absences = list.filter(r => r.status === 'ABSENT');
      const justified = list.filter(r => r.status === 'JUSTIFIED' || (r.status === 'ABSENT' && Boolean(r.justification)));
      const presences = list.filter(r => r.status === 'PRESENT');

      const absencesCount = absences.length;
      const justifiedCount = justified.length;
      const unjustifiedCount = Math.max(0, absencesCount - justifiedCount);
      const milestoneInfo = calculateAttendanceMilestone(absencesCount);

      // Compute consecutive absences
      let consecutive = 0;
      const sortedByDateAsc = [...list].sort((a, b) => a.attendance_date.localeCompare(b.attendance_date));
      for (let i = sortedByDateAsc.length - 1; i >= 0; i--) {
        if (sortedByDateAsc[i].status === 'ABSENT') {
          consecutive++;
        } else {
          break;
        }
      }

      return {
        studentId,
        studentName: 'Estudante',
        year,
        expectedDays: 200,
        absencesCount,
        justifiedCount,
        unjustifiedCount,
        confirmedPresences: presences.length,
        projectedBalance: Math.max(0, 200 - absencesCount),
        projectedBalanceDisclaimer: 'Dias previstos menos faltas registradas — não representa presenças realizadas',
        milestone: milestoneInfo.milestone,
        milestoneLabel: milestoneInfo.label,
        milestoneColor: milestoneInfo.color,
        milestoneDescription: milestoneInfo.description,
        consecutiveAbsences: consecutive,
        history: list
      };
    } catch (fallbackErr) {
      console.warn('[attendanceFrequencyService] Local fallback used:', fallbackErr);
      const milestoneInfo = calculateAttendanceMilestone(0);
      return {
        studentId,
        studentName: 'Estudante',
        year,
        expectedDays: 200,
        absencesCount: 0,
        justifiedCount: 0,
        unjustifiedCount: 0,
        confirmedPresences: 0,
        projectedBalance: 200,
        projectedBalanceDisclaimer: 'Dias previstos menos faltas registradas — não representa presenças realizadas',
        milestone: milestoneInfo.milestone,
        milestoneLabel: milestoneInfo.label,
        milestoneColor: milestoneInfo.color,
        milestoneDescription: milestoneInfo.description,
        consecutiveAbsences: 0,
        history: []
      };
    }
  },

  /**
   * Record individual or weekly absences for a student
   */
  async recordStudentAbsence(payload: RecordAbsencePayload): Promise<{ success: boolean; message: string; count: number }> {
    if (!payload.student_id) {
      throw new Error('Identificador do estudante é obrigatório.');
    }
    if (!payload.dates || payload.dates.length === 0) {
      throw new Error('Informe ao menos uma data letiva para lançamento.');
    }

    try {
      const res = await fetch('/api/attendance/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const body = await res.json();
        return {
          success: true,
          message: body.message || 'Lançamento registrado com sucesso!',
          count: body.recordedCount || payload.dates.length
        };
      }
    } catch (_) {
      // fallback to Supabase upsert directly
    }

    // Direct Supabase upsert
    const rows = payload.dates.map(date => ({
      student_id: payload.student_id,
      class_id: payload.class_id || null,
      attendance_date: date,
      status: payload.status,
      observations: payload.observations || (payload.status === 'ABSENT' ? 'Ausência registrada via Gestor Estudantes' : 'Presença confirmada'),
      created_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('attendance')
      .upsert(rows, { onConflict: 'student_id,class_id,attendance_date' });

    if (error) {
      throw new Error(`Falha ao persistir no Supabase: ${error.message}`);
    }

    return {
      success: true,
      message: `${rows.length} dia(s) de frequência registrado(s) com sucesso!`,
      count: rows.length
    };
  },

  /**
   * Fetch pedagogical radar of absences across school
   */
  async getSchoolAttendanceRadar(orgId?: string, year = 2026): Promise<AttendanceRadarItem[]> {
    try {
      const url = `/api/attendance/radar?year=${year}${orgId ? `&organizationId=${encodeURIComponent(orgId)}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const body = await res.json();
        if (body.success && Array.isArray(body.data)) {
          return body.data;
        }
      }
    } catch (_) {}

    // Fallback: Query students and attendance from Supabase
    try {
      let stdQuery = supabase.from('students').select('id, full_name, name, registration_code, code, class_id');
      if (orgId) {
        stdQuery = stdQuery.eq('organization_id', orgId);
      }
      const { data: students } = await stdQuery;

      if (!students || students.length === 0) {
        return [];
      }

      const { data: attRecords } = await supabase
        .from('attendance')
        .select('*')
        .gte('attendance_date', `${year}-01-01`)
        .lte('attendance_date', `${year}-12-31`);

      const recordsByStudent = new Map<string, any[]>();
      (attRecords || []).forEach((r: any) => {
        const list = recordsByStudent.get(r.student_id) || [];
        list.push(r);
        recordsByStudent.set(r.student_id, list);
      });

      return students.map((s: any) => {
        const studentRecords = recordsByStudent.get(s.id) || [];
        const absences = studentRecords.filter(r => (r.status || '').toUpperCase() === 'ABSENT');
        const justified = studentRecords.filter(r => (r.status || '').toUpperCase() === 'JUSTIFIED' || ((r.status || '').toUpperCase() === 'ABSENT' && Boolean(r.observations?.includes('justific'))));
        const absencesCount = absences.length;
        const justifiedCount = justified.length;
        const unjustifiedCount = Math.max(0, absencesCount - justifiedCount);

        const milestoneInfo = calculateAttendanceMilestone(absencesCount);
        const savedCase = localCasesMap.get(s.id);

        return {
          studentId: s.id,
          studentName: s.full_name || s.name || 'Estudante Sem Nome',
          ra: s.registration_code || s.code || 'RA-Pendente',
          className: 'Turma Regular',
          shift: 'Matutino',
          totalAbsences: absencesCount,
          justifiedCount,
          unjustifiedCount,
          consecutiveCount: 0,
          milestone: milestoneInfo.milestone,
          milestoneLabel: milestoneInfo.label,
          milestoneColor: milestoneInfo.color,
          responsibleStaff: savedCase?.responsibleName || 'Coordenação Pedagógica',
          caseStatus: savedCase?.status || (absencesCount >= 16 ? 'aberto' : 'concluido'),
          lastContactDate: savedCase?.lastContactDate,
          activeSearchNotes: savedCase?.notes,
          history: studentRecords.map((r: any) => ({
            id: r.id || `${r.student_id}-${r.attendance_date}`,
            student_id: r.student_id,
            class_id: r.class_id,
            attendance_date: r.attendance_date,
            status: r.status,
            observations: r.observations,
            created_at: r.created_at
          }))
        };
      });
    } catch (e) {
      console.warn('[attendanceFrequencyService] Fallback radar error:', e);
      return [];
    }
  },

  /**
   * Record a pedagogical case action (Busca Ativa, Contato com Família, Parecer Técnico)
   */
  async recordCaseAction(payload: AttendanceCaseActionPayload): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/attendance/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const body = await res.json();
        return { success: true, message: body.message || 'Ação registrada com sucesso!' };
      }
    } catch (_) {}

    // In-memory update
    const existing = localCasesMap.get(payload.studentId) || {
      status: 'aberto',
      responsibleName: payload.responsibleName || 'Coordenação Pedagógica',
      notes: '',
      actions: []
    };

    existing.status = payload.status;
    existing.responsibleName = payload.responsibleName || existing.responsibleName;
    existing.notes = payload.notes;
    existing.lastContactDate = new Date().toISOString();
    existing.protocolNumber = payload.protocolNumber;
    existing.actions.unshift({
      date: new Date().toISOString(),
      type: payload.actionType,
      notes: payload.notes,
      staff: payload.responsibleName
    });

    localCasesMap.set(payload.studentId, existing);

    return {
      success: true,
      message: 'Ação pedagógica e histórico de acompanhamento atualizados com sucesso!'
    };
  },

  /**
   * Adjust consolidated totals for a student with audit tracking
   */
  async adjustStudentTotals(payload: AdjustAttendanceTotalsPayload): Promise<{ success: boolean; message: string; data?: any }> {
    if (!payload.studentId) {
      throw new Error('Identificador do estudante é obrigatório.');
    }
    if (!payload.reason || !payload.reason.trim()) {
      throw new Error('A justificativa/motivo do ajuste é obrigatória para auditoria.');
    }

    try {
      const res = await fetch('/api/attendance/adjust-totals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const body = await res.json();
        return {
          success: true,
          message: body.message || 'Totais de frequência atualizados com sucesso!',
          data: body.data
        };
      } else {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || 'Erro ao ajustar totais de frequência.');
      }
    } catch (err: any) {
      console.warn('[adjustStudentTotals] Fallback error:', err);
      throw err;
    }
  }
};
