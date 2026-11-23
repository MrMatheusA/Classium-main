import { supabase } from '../../lib/supabase';
import { RealtimeService } from '../RealtimeService';
import { friendlyDbError, isUuid } from '../tenant';

const realtimeService = RealtimeService.getInstance();

export interface ScheduleConflict {
  type: 'teacher' | 'room' | 'invalid_time' | 'overlap';
  day_of_week: number;
  period_number: number;
  message: string;
  conflictingClassId?: string;
  conflictingClassName?: string;
}

export interface ClassScheduleRecord {
  id?: string;
  organization_id: string;
  class_id: string;
  day_of_week: number; // 1 = segunda … 5 = sexta
  period_number: number;
  start_time: string;
  end_time: string;
  discipline_name: string;
  teacher_name?: string;
  room?: string;
  created_at?: string;
}

export interface SimpleClassEntity {
  id: string;
  name: string;
  code?: string;
  grade?: string;
  shift?: string;
  room?: string;
  academic_year?: string | number;
  organization_id: string;
  status?: string;
  is_active?: boolean;
  students_count?: number;
  capacity?: number | null;
  teachers?: string[];
  teacher_id?: string;
}

export interface ScheduleTimeSlot {
  id: string;
  organization_id: string;
  school_id?: string;
  shift: string; // '1º Turno (Matutino)', '2º Turno (Vespertino)', '3º Turno (Noturno)'
  slot_order: number;
  slot_type: 'aula' | 'recreio';
  label: string;
  start_time: string; // HH:MM
  end_time: string;
  academic_year: number | string;
  period_number: number; // intervalo = 99
}

export interface ShiftPeriodConfig {
  id: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  label: string;
  isBreak?: boolean;
  slotOrder: number;
}

export interface ShiftInfo {
  id: string;
  name: string;
  label: string;
  startTime: string;
  endTime: string;
  breakStart: string;
  breakEnd: string;
  periods: ShiftPeriodConfig[];
}

export const STANDARD_DISCIPLINES = [
  { name: 'Português', color: '#2563EB', tag: 'PORT.' },
  { name: 'Matemática', color: '#EAB308', tag: 'MAT.' },
  { name: 'Geografia', color: '#0EA5E9', tag: 'GEO.' },
  { name: 'História', color: '#EF4444', tag: 'HIST.' },
  { name: 'Inglês', color: '#A855F7', tag: 'ING.' },
  { name: 'Artes', color: '#EC4899', tag: 'ARTES' },
  { name: 'Educação Física', color: '#22C55E', tag: 'ED.F.' },
  { name: 'Ensino Religioso', color: '#CA8A04', tag: 'ENS.REL.' },
  { name: 'Ciências', color: '#14B8A6', tag: 'CIÊN.' },
  { name: 'Outro', color: '#94A3B8', tag: 'OUTRO' },
];

/**
 * Modelos de horário. Só são gravados quando a escola escolhe "usar modelo";
 * nunca aparecem como se fossem o horário da escola.
 */
export const DEFAULT_INITIAL_SLOTS: Record<string, Array<{ slot_order: number; slot_type: 'aula' | 'recreio'; label: string; start_time: string; end_time: string; period_number: number }>> = {
  '1º Turno (Matutino)': [
    { slot_order: 1, slot_type: 'aula', label: '1ª aula', start_time: '07:30', end_time: '08:15', period_number: 1 },
    { slot_order: 2, slot_type: 'aula', label: '2ª aula', start_time: '08:15', end_time: '09:00', period_number: 2 },
    { slot_order: 3, slot_type: 'recreio', label: 'Intervalo', start_time: '09:00', end_time: '09:20', period_number: 99 },
    { slot_order: 4, slot_type: 'aula', label: '3ª aula', start_time: '09:20', end_time: '10:05', period_number: 3 },
    { slot_order: 5, slot_type: 'aula', label: '4ª aula', start_time: '10:05', end_time: '10:50', period_number: 4 },
    { slot_order: 6, slot_type: 'aula', label: '5ª aula', start_time: '10:50', end_time: '11:35', period_number: 5 },
  ],
  '2º Turno (Vespertino)': [
    { slot_order: 1, slot_type: 'aula', label: '1ª aula', start_time: '13:00', end_time: '13:45', period_number: 1 },
    { slot_order: 2, slot_type: 'aula', label: '2ª aula', start_time: '13:45', end_time: '14:30', period_number: 2 },
    { slot_order: 3, slot_type: 'recreio', label: 'Intervalo', start_time: '14:30', end_time: '14:50', period_number: 99 },
    { slot_order: 4, slot_type: 'aula', label: '3ª aula', start_time: '14:50', end_time: '15:35', period_number: 3 },
    { slot_order: 5, slot_type: 'aula', label: '4ª aula', start_time: '15:35', end_time: '16:20', period_number: 4 },
    { slot_order: 6, slot_type: 'aula', label: '5ª aula', start_time: '16:20', end_time: '17:05', period_number: 5 },
  ],
  '3º Turno (Noturno)': [
    { slot_order: 1, slot_type: 'aula', label: '1ª aula', start_time: '18:30', end_time: '19:15', period_number: 1 },
    { slot_order: 2, slot_type: 'aula', label: '2ª aula', start_time: '19:15', end_time: '20:00', period_number: 2 },
    { slot_order: 3, slot_type: 'recreio', label: 'Intervalo', start_time: '20:00', end_time: '20:15', period_number: 99 },
    { slot_order: 4, slot_type: 'aula', label: '3ª aula', start_time: '20:15', end_time: '21:00', period_number: 3 },
    { slot_order: 5, slot_type: 'aula', label: '4ª aula', start_time: '21:00', end_time: '21:45', period_number: 4 },
  ],
};

/** "07:30:00" → "07:30" (vazio continua vazio) */
const hhmm = (time?: string | null): string => {
  if (!time) return '';
  const [h, m] = time.split(':');
  return h && m ? `${h.padStart(2, '0')}:${m.padStart(2, '0')}` : time;
};

const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) => aStart < bEnd && aEnd > bStart;

/** Turno escrito de qualquer jeito → chave do turno */
function shiftKeyOf(value?: string | null): string | null {
  const s = (value || '').toLowerCase();
  if (!s) return null;
  if (s.includes('matut') || s.includes('manh') || s.startsWith('1')) return '1º Turno (Matutino)';
  if (s.includes('vesp') || s.includes('tard') || s.startsWith('2')) return '2º Turno (Vespertino)';
  if (s.includes('not') || s.includes('noit') || s.startsWith('3')) return '3º Turno (Noturno)';
  return null;
}

function notify(...events: string[]) {
  if (typeof window === 'undefined') return;
  events.forEach(e => window.dispatchEvent(new CustomEvent(e)));
}

type SlotResult = { success: boolean; error?: string; shiftInfo?: ShiftInfo; slot?: ScheduleTimeSlot };

class ClassScheduleService {
  /** Horários do turno gravados pela escola. Sem cadastro, a lista vem vazia. */
  async getShiftTimeSlots(organizationId: string, shiftKey: string, academicYear: string | number = new Date().getFullYear()): Promise<ScheduleTimeSlot[]> {
    if (!isUuid(organizationId)) return [];

    const { data, error } = await supabase
      .from('schedule_time_slots')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('academic_year', Number(academicYear))
      .order('slot_order', { ascending: true });

    if (error) throw new Error(friendlyDbError(error.message, 'Não foi possível carregar os horários do turno.'));

    return ((data || []) as any[])
      .filter(d => shiftKeyOf(d.shift_name) === shiftKey)
      .map(d => ({
        id: d.id,
        organization_id: d.organization_id,
        school_id: d.school_id,
        shift: shiftKey,
        slot_order: Number(d.slot_order),
        slot_type: d.is_break ? 'recreio' : 'aula',
        label: d.label || (d.is_break ? 'Intervalo' : `${d.period_number}ª aula`),
        start_time: hhmm(d.start_time),
        end_time: hhmm(d.end_time),
        academic_year: d.academic_year,
        period_number: d.is_break ? 99 : Number(d.period_number ?? d.slot_order),
      } as ScheduleTimeSlot))
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  /** Resumo do turno calculado dos horários gravados (sem valores inventados) */
  async getShiftInfo(organizationId: string, shiftKey: string, academicYear: string | number = new Date().getFullYear()): Promise<ShiftInfo> {
    const slots = await this.getShiftTimeSlots(organizationId, shiftKey, academicYear);
    const lessons = slots.filter(s => s.slot_type === 'aula');
    const breakSlot = slots.find(s => s.slot_type === 'recreio');

    const label = shiftKey.includes('Vespertino') ? 'Tarde' : shiftKey.includes('Noturno') ? 'Noite' : 'Manhã';

    return {
      id: shiftKey,
      name: shiftKey,
      label,
      startTime: lessons.length ? [...lessons].sort((a, b) => a.start_time.localeCompare(b.start_time))[0].start_time : '',
      endTime: lessons.length ? [...lessons].sort((a, b) => b.end_time.localeCompare(a.end_time))[0].end_time : '',
      breakStart: breakSlot?.start_time || '',
      breakEnd: breakSlot?.end_time || '',
      periods: slots.map(s => ({
        id: s.id,
        periodNumber: s.period_number,
        startTime: s.start_time,
        endTime: s.end_time,
        label: s.label,
        isBreak: s.slot_type === 'recreio',
        slotOrder: s.slot_order,
      })),
    };
  }

  /** Grava o modelo de horário no turno (só quando ainda não há horários) */
  async seedDefaultSlots(organizationId: string, shiftKey: string, academicYear: string | number = new Date().getFullYear()): Promise<SlotResult> {
    const template = DEFAULT_INITIAL_SLOTS[shiftKey];
    if (!template) return { success: false, error: 'Turno sem modelo de horário.' };

    const existing = await this.getShiftTimeSlots(organizationId, shiftKey, academicYear);
    if (existing.length > 0) return { success: false, error: 'Este turno já tem horários cadastrados.' };

    const { error } = await supabase.from('schedule_time_slots').insert(
      template.map(t => ({
        organization_id: organizationId,
        shift_name: shiftKey,
        slot_order: t.slot_order,
        period_number: t.slot_type === 'recreio' ? null : t.period_number,
        label: t.label,
        start_time: `${t.start_time}:00`,
        end_time: `${t.end_time}:00`,
        is_break: t.slot_type === 'recreio',
        slot_type: t.slot_type,
        academic_year: Number(academicYear),
      }))
    );
    if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível gravar o modelo de horário.') };

    notify('classium_schedule_updated');
    return { success: true, shiftInfo: await this.getShiftInfo(organizationId, shiftKey, academicYear) };
  }

  async addShiftTimeSlot(
    organizationId: string,
    shiftKey: string,
    data: { label: string; startTime: string; endTime: string; isBreak?: boolean; academicYear?: string }
  ): Promise<SlotResult> {
    const start = hhmm(data.startTime);
    const end = hhmm(data.endTime);
    const year = data.academicYear || String(new Date().getFullYear());
    if (!start || !end || start >= end) return { success: false, error: 'O fim precisa ser depois do início.' };

    try {
      const current = await this.getShiftTimeSlots(organizationId, shiftKey, year);
      const clash = current.find(o => overlaps(start, end, o.start_time, o.end_time));
      if (clash) return { success: false, error: `Esse horário bate com "${clash.label}" (${clash.start_time} às ${clash.end_time}).` };

      const lessons = current.filter(s => s.slot_type === 'aula');
      const nextPeriod = data.isBreak ? null : (lessons.length ? Math.max(...lessons.map(s => s.period_number)) + 1 : 1);
      const nextOrder = current.length ? Math.max(...current.map(s => s.slot_order)) + 1 : 1;

      const { data: row, error } = await supabase
        .from('schedule_time_slots')
        .insert([{
          organization_id: organizationId,
          shift_name: shiftKey,
          slot_order: nextOrder,
          period_number: nextPeriod,
          label: data.label.trim() || (data.isBreak ? 'Intervalo' : `${nextPeriod}ª aula`),
          start_time: `${start}:00`,
          end_time: `${end}:00`,
          is_break: !!data.isBreak,
          slot_type: data.isBreak ? 'recreio' : 'aula',
          academic_year: Number(year),
        }])
        .select()
        .single();

      if (error || !row) return { success: false, error: friendlyDbError(error?.message, 'Não foi possível adicionar o horário.') };

      notify('classium_schedule_updated');
      return { success: true, shiftInfo: await this.getShiftInfo(organizationId, shiftKey, year) };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Não foi possível adicionar o horário.' };
    }
  }

  async deleteShiftTimeSlot(organizationId: string, shiftKey: string, slotOrder: number, academicYear: string | number = new Date().getFullYear()): Promise<SlotResult> {
    try {
      const current = await this.getShiftTimeSlots(organizationId, shiftKey, academicYear);
      const target = current.find(s => s.slot_order === slotOrder);
      if (!target) return { success: false, error: 'Horário não encontrado. Atualize a tela.' };

      const { data, error } = await supabase.from('schedule_time_slots').delete().eq('id', target.id).select('id');
      if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível remover o horário.') };
      if (!data || data.length === 0) return { success: false, error: 'Seu usuário não pode remover horários.' };

      // As aulas marcadas nesse horário saem das grades do turno
      if (target.slot_type === 'aula') {
        const classIds = await this.classIdsOfShift(organizationId, shiftKey);
        if (classIds.length) {
          await supabase.from('class_schedules').delete().in('class_id', classIds).eq('period_number', target.period_number);
        }
      }

      notify('classium_schedule_updated');
      return { success: true, shiftInfo: await this.getShiftInfo(organizationId, shiftKey, academicYear) };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Não foi possível remover o horário.' };
    }
  }

  async updateShiftTimeSlot(
    organizationId: string,
    shiftKey: string,
    slotOrder: number,
    newStartTime: string,
    newEndTime: string,
    academicYear: string | number = new Date().getFullYear()
  ): Promise<SlotResult> {
    const start = hhmm(newStartTime);
    const end = hhmm(newEndTime);
    if (!start || !end || start >= end) return { success: false, error: 'O fim precisa ser depois do início.' };

    try {
      const current = await this.getShiftTimeSlots(organizationId, shiftKey, academicYear);
      const target = current.find(s => s.slot_order === slotOrder);
      if (!target) return { success: false, error: 'Horário não encontrado. Atualize a tela.' };

      const clash = current.find(o => o.slot_order !== slotOrder && overlaps(start, end, o.start_time, o.end_time));
      if (clash) return { success: false, error: `Esse horário bate com "${clash.label}" (${clash.start_time} às ${clash.end_time}).` };

      const { data, error } = await supabase
        .from('schedule_time_slots')
        .update({ start_time: `${start}:00`, end_time: `${end}:00` })
        .eq('id', target.id)
        .select('id');
      if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível salvar o horário.') };
      if (!data || data.length === 0) return { success: false, error: 'Seu usuário não pode alterar horários.' };

      // As aulas já marcadas nesse horário acompanham a mudança
      if (target.slot_type === 'aula') {
        const classIds = await this.classIdsOfShift(organizationId, shiftKey);
        if (classIds.length) {
          const { error: cascadeErr } = await supabase
            .from('class_schedules')
            .update({ start_time: `${start}:00`, end_time: `${end}:00` })
            .in('class_id', classIds)
            .eq('period_number', target.period_number);
          if (cascadeErr) console.warn('[ClassScheduleService] Grades não atualizadas:', cascadeErr.message);
        }
      }

      notify('classium_schedule_updated');
      return { success: true, shiftInfo: await this.getShiftInfo(organizationId, shiftKey, academicYear) };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Não foi possível salvar o horário.' };
    }
  }

  private async classIdsOfShift(organizationId: string, shiftKey: string): Promise<string[]> {
    const { data } = await supabase.from('classes').select('id, shift').eq('organization_id', organizationId);
    return ((data || []) as any[]).filter(c => shiftKeyOf(c.shift) === shiftKey).map(c => c.id);
  }

  /** Turmas ativas da escola, com número real de estudantes e professores da grade */
  async getClasses(organizationId: string, shiftFilter?: string): Promise<SimpleClassEntity[]> {
    if (!isUuid(organizationId)) throw new Error('Não foi possível identificar a escola.');

    const { data, error } = await supabase
      .from('classes')
      .select('id, name, code, grade, shift, room, academic_year, organization_id, status, is_active, teacher_id, capacity')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error) throw new Error(friendlyDbError(error.message, 'Não foi possível carregar as turmas.'));

    let classes = ((data || []) as any[]).filter(c => c.is_active !== false && !['inativa', 'inactive'].includes(String(c.status || '').toLowerCase()));
    if (shiftFilter && shiftFilter !== 'ALL') {
      const key = shiftKeyOf(shiftFilter);
      classes = classes.filter(c => shiftKeyOf(c.shift) === key);
    }
    if (classes.length === 0) return [];

    const ids = classes.map(c => c.id);
    const [stRes, schRes] = await Promise.all([
      supabase.from('students').select('class_id, status').in('class_id', ids),
      supabase.from('class_schedules').select('class_id, teacher_name').in('class_id', ids).not('teacher_name', 'is', null),
    ]);

    const counts: Record<string, number> = {};
    ((stRes.data || []) as any[]).forEach(s => {
      if (s.class_id && !['inativo', 'transferido', 'cancelado'].includes(String(s.status || '').toLowerCase())) {
        counts[s.class_id] = (counts[s.class_id] || 0) + 1;
      }
    });

    const teachers: Record<string, Set<string>> = {};
    ((schRes.data || []) as any[]).forEach(s => {
      if (s.class_id && s.teacher_name) (teachers[s.class_id] ||= new Set()).add(s.teacher_name);
    });

    return classes.map(c => ({
      ...c,
      students_count: counts[c.id] || 0,
      teachers: Array.from(teachers[c.id] || []),
    }));
  }

  async getClassById(classId: string): Promise<SimpleClassEntity | null> {
    if (!isUuid(classId)) return null;
    const { data, error } = await supabase
      .from('classes')
      .select('id, name, code, grade, shift, room, academic_year, organization_id, status, is_active, capacity')
      .eq('id', classId)
      .maybeSingle();
    if (error) console.warn('[ClassScheduleService] getClassById:', error.message);
    return (data as SimpleClassEntity) || null;
  }

  async createClass(
    organizationId: string,
    classData: { name: string; shift: string; room: string; grade?: string; code?: string; academic_year?: string; capacity?: number }
  ): Promise<{ success: boolean; data?: SimpleClassEntity; error?: string }> {
    if (!isUuid(organizationId)) return { success: false, error: 'Não foi possível identificar a escola.' };
    if (!classData.name?.trim()) return { success: false, error: 'Informe o nome da turma.' };

    const year = Number(classData.academic_year);
    const { data, error } = await supabase
      .from('classes')
      .insert([{
        organization_id: organizationId,
        name: classData.name.trim(),
        shift: classData.shift,
        room: classData.room?.trim() || null,
        grade: classData.grade?.trim() || null,
        code: classData.code?.trim() || null,
        academic_year: Number.isFinite(year) && year > 2000 ? year : new Date().getFullYear(),
        capacity: classData.capacity && classData.capacity > 0 ? classData.capacity : null,
        status: 'active',
        is_active: true,
      }])
      .select()
      .single();

    if (error || !data) {
      const msg = error?.message?.includes('classes_org_code_uq')
        ? 'Já existe uma turma com este código.'
        : friendlyDbError(error?.message, 'Não foi possível cadastrar a turma.');
      return { success: false, error: msg };
    }

    notify('classium_classes_updated');
    return { success: true, data: { ...(data as any), students_count: 0, teachers: [] } };
  }

  async updateClass(
    classId: string,
    classData: { name: string; shift: string; room: string; grade?: string; code?: string; capacity?: number }
  ): Promise<{ success: boolean; data?: SimpleClassEntity; error?: string }> {
    if (!isUuid(classId)) return { success: false, error: 'Turma inválida. Atualize a tela.' };
    if (!classData.name?.trim()) return { success: false, error: 'Informe o nome da turma.' };

    const payload: Record<string, any> = {
      name: classData.name.trim(),
      shift: classData.shift,
      room: classData.room?.trim() || null,
    };
    if (classData.grade !== undefined) payload.grade = classData.grade.trim() || null;
    if (classData.code !== undefined) payload.code = classData.code.trim() || null;
    if (classData.capacity !== undefined) payload.capacity = classData.capacity > 0 ? classData.capacity : null;

    const { data, error } = await supabase.from('classes').update(payload).eq('id', classId).select().maybeSingle();
    if (error) {
      const msg = error.message?.includes('classes_org_code_uq')
        ? 'Já existe uma turma com este código.'
        : friendlyDbError(error.message, 'Não foi possível salvar a turma.');
      return { success: false, error: msg };
    }
    if (!data) return { success: false, error: 'Turma não encontrada ou sem permissão.' };

    notify('classium_classes_updated');
    return { success: true, data: data as SimpleClassEntity };
  }

  /** Só exclui turma sem estudantes. A grade dela sai junto. */
  async deleteClass(classId: string): Promise<{ success: boolean; wasSoftDeleted: boolean; studentsCount: number; error?: string; message?: string }> {
    if (!isUuid(classId)) return { success: false, wasSoftDeleted: false, studentsCount: 0, error: 'Turma inválida. Atualize a tela.' };

    const { count, error: countErr } = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', classId);
    if (countErr) return { success: false, wasSoftDeleted: false, studentsCount: 0, error: friendlyDbError(countErr.message) };

    const studentsCount = count || 0;
    if (studentsCount > 0) {
      return {
        success: false,
        wasSoftDeleted: false,
        studentsCount,
        error: `Esta turma tem ${studentsCount} estudante(s). Mude os estudantes de turma antes de excluir.`,
      };
    }

    const { data, error } = await supabase.from('classes').delete().eq('id', classId).select('id');
    if (error) return { success: false, wasSoftDeleted: false, studentsCount: 0, error: friendlyDbError(error.message, 'Não foi possível excluir a turma.') };
    if (!data || data.length === 0) return { success: false, wasSoftDeleted: false, studentsCount: 0, error: 'Turma não encontrada ou sem permissão.' };

    notify('classium_classes_updated', 'classium_schedule_updated');
    return { success: true, wasSoftDeleted: false, studentsCount: 0, message: 'Turma excluída.' };
  }

  async getClassSchedules(classId: string): Promise<ClassScheduleRecord[]> {
    if (!isUuid(classId)) return [];
    const { data, error } = await supabase
      .from('class_schedules')
      .select('*')
      .eq('class_id', classId)
      .order('day_of_week', { ascending: true })
      .order('period_number', { ascending: true });

    if (error) throw new Error(friendlyDbError(error.message, 'Não foi possível carregar a grade.'));

    return ((data || []) as any[]).map(r => ({
      ...r,
      day_of_week: Number(r.day_of_week),
      period_number: Number(r.period_number),
      start_time: hhmm(r.start_time),
      end_time: hhmm(r.end_time),
      discipline_name: r.discipline_name || r.subject_name || '',
      room: r.room || r.room_name || undefined,
    }));
  }

  /** Confere horário, aulas repetidas e professor/sala ocupados em outra turma no mesmo horário */
  async validateScheduleConflicts(
    organizationId: string,
    classId: string,
    schedules: Array<Omit<ClassScheduleRecord, 'id' | 'created_at'>>
  ): Promise<{ valid: boolean; conflicts: ScheduleConflict[] }> {
    const conflicts: ScheduleConflict[] = [];
    const dayName = (d: number) => ['', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'][Number(d)] || `dia ${d}`;
    const seen = new Set<string>();

    for (const s of schedules) {
      const start = hhmm(s.start_time);
      const end = hhmm(s.end_time);
      if (start && end && start >= end) {
        conflicts.push({ type: 'invalid_time', day_of_week: s.day_of_week, period_number: s.period_number, message: `${s.period_number}ª aula de ${dayName(s.day_of_week)}: o fim precisa ser depois do início.` });
      }
      const key = `${Number(s.day_of_week)}_${Number(s.period_number)}`;
      if (seen.has(key)) {
        conflicts.push({ type: 'overlap', day_of_week: s.day_of_week, period_number: s.period_number, message: `${s.period_number}ª aula de ${dayName(s.day_of_week)} aparece duas vezes.` });
      }
      seen.add(key);
    }

    const { data: others, error } = await supabase
      .from('class_schedules')
      .select('class_id, day_of_week, period_number, start_time, end_time, teacher_name, room')
      .eq('organization_id', organizationId)
      .neq('class_id', classId);

    if (error) throw new Error(friendlyDbError(error.message, 'Não foi possível conferir conflitos de horário.'));

    if (others && others.length > 0) {
      const { data: classRows } = await supabase.from('classes').select('id, name').eq('organization_id', organizationId);
      const names = new Map<string, string>(((classRows || []) as any[]).map(c => [c.id, c.name]));
      const ignore = ['', 'sem professor', 'a definir', 'sem sala'];

      for (const s of schedules) {
        const teacher = (s.teacher_name || '').trim().toLowerCase();
        const room = (s.room || '').trim().toLowerCase();
        const sStart = hhmm(s.start_time);
        const sEnd = hhmm(s.end_time);

        for (const o of others as any[]) {
          if (Number(o.day_of_week) !== Number(s.day_of_week)) continue;
          // Compara pelo horário real (turnos diferentes podem ter a mesma "2ª aula")
          const oStart = hhmm(o.start_time);
          const oEnd = hhmm(o.end_time);
          const sameTime = sStart && sEnd && oStart && oEnd ? overlaps(sStart, sEnd, oStart, oEnd) : Number(o.period_number) === Number(s.period_number);
          if (!sameTime) continue;

          const otherName = names.get(o.class_id) || 'outra turma';
          if (!ignore.includes(teacher) && (o.teacher_name || '').trim().toLowerCase() === teacher) {
            conflicts.push({
              type: 'teacher', day_of_week: s.day_of_week, period_number: s.period_number,
              conflictingClassId: o.class_id, conflictingClassName: otherName,
              message: `${s.teacher_name} já dá aula em ${otherName} na ${dayName(s.day_of_week)}, das ${oStart} às ${oEnd}.`,
            });
          }
          if (!ignore.includes(room) && (o.room || '').trim().toLowerCase() === room) {
            conflicts.push({
              type: 'room', day_of_week: s.day_of_week, period_number: s.period_number,
              conflictingClassId: o.class_id, conflictingClassName: otherName,
              message: `${s.room} já está com ${otherName} na ${dayName(s.day_of_week)}, das ${oStart} às ${oEnd}.`,
            });
          }
        }
      }
    }

    return { valid: conflicts.length === 0, conflicts };
  }

  /** Confere conflitos e grava a grade inteira de uma vez */
  async saveClassSchedules(
    organizationId: string,
    classId: string,
    schedules: Array<Omit<ClassScheduleRecord, 'id' | 'created_at'>>
  ): Promise<{ success: boolean; error?: string; conflicts?: ScheduleConflict[] }> {
    try {
      const validation = await this.validateScheduleConflicts(organizationId, classId, schedules);
      if (!validation.valid) {
        return { success: false, error: validation.conflicts.map(c => c.message).join('\n'), conflicts: validation.conflicts };
      }

      const { data, error } = await supabase.rpc('classium_save_class_schedule', {
        p_class_id: classId,
        p_rows: schedules.map(s => ({
          day_of_week: Number(s.day_of_week),
          period_number: Number(s.period_number),
          start_time: s.start_time,
          end_time: s.end_time,
          discipline_name: s.discipline_name,
          teacher_name: s.teacher_name || null,
          room: s.room || null,
        })),
      });

      if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível salvar a grade.') };
      if (!data?.success) return { success: false, error: data?.error || 'Não foi possível salvar a grade.' };

      notify('classium_schedule_updated', 'classium_classes_updated');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Não foi possível salvar a grade.' };
    }
  }

  async clearClassSchedules(classId: string): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase.rpc('classium_save_class_schedule', { p_class_id: classId, p_rows: [] });
    if (error) throw new Error(friendlyDbError(error.message, 'Não foi possível apagar a grade.'));
    if (!data?.success) throw new Error(data?.error || 'Não foi possível apagar a grade.');
    notify('classium_schedule_updated', 'classium_classes_updated');
    return { success: true };
  }

  async duplicateSchedule(sourceClassId: string, targetClassId: string, organizationId: string): Promise<{ success: boolean; count?: number; error?: string }> {
    const source = await this.getClassSchedules(sourceClassId);
    if (source.length === 0) return { success: false, error: 'A turma de origem não tem aulas na grade.' };
    const res = await this.saveClassSchedules(organizationId, targetClassId, source.map(s => ({ ...s, class_id: targetClassId })));
    return res.success ? { success: true, count: source.length } : { success: false, error: res.error };
  }

  async getDisciplines(organizationId: string): Promise<{ id: string; name: string; color?: string }[]> {
    if (!isUuid(organizationId)) return [];
    const { data, error } = await supabase
      .from('disciplines')
      .select('id, name, color')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name', { ascending: true });
    if (error) {
      console.warn('[ClassScheduleService] Disciplinas:', error.message);
      return [];
    }
    return (data || []) as { id: string; name: string; color?: string }[];
  }

  async getTeachers(organizationId: string): Promise<{ id: string; name: string }[]> {
    if (!isUuid(organizationId)) return [];
    const { data, error } = await supabase
      .from('teachers')
      .select('id, full_name, name')
      .eq('organization_id', organizationId)
      .is('deleted_at', null);
    if (error) {
      console.warn('[ClassScheduleService] Professores:', error.message);
      return [];
    }
    return ((data || []) as any[])
      .map(t => ({ id: t.id, name: t.full_name || t.name || '' }))
      .filter(t => t.name)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  subscribeToClassSchedule(classId: string, onUpdate: () => void) {
    return realtimeService.subscribe(`class_schedules_${classId}`, { table: 'class_schedules', filter: `class_id=eq.${classId}` }, () => onUpdate());
  }

  /** Atualiza quando turmas, horários, disciplinas ou professores da escola mudam */
  subscribeToClassesAndSlots(organizationId: string, onUpdate: () => void) {
    const filter = isUuid(organizationId) ? `organization_id=eq.${organizationId}` : undefined;
    const key = organizationId || 'escola';
    const unsubs = [
      realtimeService.subscribe(`classes_sched_${key}`, { table: 'classes', filter }, onUpdate),
      realtimeService.subscribe(`slots_sched_${key}`, { table: 'schedule_time_slots', filter }, onUpdate),
      realtimeService.subscribe(`disc_sched_${key}`, { table: 'disciplines', filter }, onUpdate),
      realtimeService.subscribe(`teach_sched_${key}`, { table: 'teachers', filter }, onUpdate),
    ];
    return () => unsubs.forEach(u => u());
  }
}

export const classScheduleService = new ClassScheduleService();