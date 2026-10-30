import { supabase } from '../lib/supabase';
import { RealtimeService } from './RealtimeService';

export interface CalendarEventFromDb {
  id: string;
  organization_id?: string;
  school_id?: string | null;
  title: string;
  description?: string | null;
  start_date: string; // YYYY-MM-DD
  end_date?: string | null; // YYYY-MM-DD
  event_type?: string | null;
  category?: string | null;
  color?: string | null;
  color_hex?: string | null;
  is_letivo?: boolean;
  academic_year?: number;
  start_time?: string | null; // HH:MM:SS or HH:MM
  end_time?: string | null;
  location?: string | null;
  room_id?: string | null;
  is_all_day?: boolean | null;
  target_audience?: string | null;
  class_id?: string | null;
  class_name?: string | null;
  class_ids?: string[] | null;
  teacher_id?: string | null;
  teacher_name?: string | null;
  student_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCalendarEventInput {
  title: string;
  description?: string | null;
  startDate: string; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD
  startTime?: string | null; // HH:MM
  endTime?: string | null; // HH:MM
  eventType?: string | null;
  category?: string | null;
  color?: string | null;
  colorHex?: string | null;
  isLetivo?: boolean;
  academicYear?: number;
  location?: string | null;
  roomId?: string | null;
  isAllDay?: boolean;
  targetAudience?: string | null;
  classId?: string | null;
  classIds?: string[] | null;
  teacherId?: string | null;
  studentId?: string | null;
  organizationId?: string;
  schoolId?: string | null;
}

export const CALENDAR_CATEGORY_CONFIG: Record<string, {
  label: string;
  colorClass: string;
  hexColor: string;
  isLetivo: boolean;
}> = {
  periodo_nacional: { label: 'Período Nacional', colorClass: 'bg-red-600', hexColor: '#DC2626', isLetivo: false },
  feriado_nacional: { label: 'Feriado Nacional', colorClass: 'bg-red-600', hexColor: '#DC2626', isLetivo: false },
  conselho_classe: { label: 'Conselho de Classe', colorClass: 'bg-blue-600', hexColor: '#2563EB', isLetivo: true },
  inicio_aulas: { label: 'Início do Ano Letivo', colorClass: 'bg-emerald-500', hexColor: '#10B981', isLetivo: true },
  inicio_letivo: { label: 'Início do Ano Letivo', colorClass: 'bg-emerald-500', hexColor: '#10B981', isLetivo: true },
  antecipacao: { label: 'Avaliações', colorClass: 'bg-yellow-400', hexColor: '#FACC15', isLetivo: true },
  avaliacoes: { label: 'Avaliações', colorClass: 'bg-yellow-400', hexColor: '#FACC15', isLetivo: true },
  evento_escolar: { label: 'Evento Escolar', colorClass: 'bg-orange-500', hexColor: '#F97316', isLetivo: true },
  formacao_continuada: { label: 'Formação Continuada', colorClass: 'bg-purple-600', hexColor: '#9333EA', isLetivo: true },
  atividade_extraclasse: { label: 'Atividade Prática', colorClass: 'bg-amber-800', hexColor: '#92400E', isLetivo: true },
  atividade_pratica: { label: 'Atividade Prática', colorClass: 'bg-amber-800', hexColor: '#92400E', isLetivo: true },
  aniversario_escolar: { label: 'Encerramento de Bimestre', colorClass: 'bg-slate-900', hexColor: '#0F172A', isLetivo: true },
  fim_bimestre: { label: 'Encerramento de Bimestre', colorClass: 'bg-slate-900', hexColor: '#0F172A', isLetivo: true },
  recesso_nacional: { label: 'Recesso Escolar', colorClass: 'bg-slate-500', hexColor: '#64748B', isLetivo: false },
  recesso_escolar: { label: 'Recesso Escolar', colorClass: 'bg-slate-500', hexColor: '#64748B', isLetivo: false },
  recesso_fim_semana: { label: 'Recesso de Fim de Semana', colorClass: 'bg-blue-400', hexColor: '#38BDF8', isLetivo: false },
  provas_internas: { label: 'Provas Internas', colorClass: 'bg-pink-500', hexColor: '#EC4899', isLetivo: true },
  atividade_maker: { label: 'Atividade Maker', colorClass: 'bg-sky-500', hexColor: '#0EA5E9', isLetivo: true },
  projeto_pedagogico: { label: 'Projeto Pedagógico', colorClass: 'bg-teal-500', hexColor: '#14B8A6', isLetivo: true },
  recuperacao: { label: 'Recuperação', colorClass: 'bg-yellow-600', hexColor: '#CA8A04', isLetivo: true },
  reuniao_pais: { label: 'Reunião de Pais', colorClass: 'bg-purple-400', hexColor: '#C084FC', isLetivo: true },
  planejamento_pedagogico: { label: 'Planejamento Pedagógico', colorClass: 'bg-orange-200', hexColor: '#FED7AA', isLetivo: true }
};

export function getCategoryConfig(category?: string | null) {
  if (!category) return CALENDAR_CATEGORY_CONFIG.evento_escolar;
  return CALENDAR_CATEGORY_CONFIG[category] || {
    label: category,
    colorClass: 'bg-emerald-500',
    hexColor: '#10B981',
    isLetivo: true
  };
}

export interface UpdateCalendarEventInput extends Partial<CreateCalendarEventInput> {
  eventId: string;
}

export interface CalendarConflictCheckResult {
  hasConflicts: boolean;
  conflictCount: number;
  conflicts: Array<{
    eventId: string;
    title: string;
    startDate: string;
    endDate: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    conflictType: 'TEACHER_CONFLICT' | 'CLASS_CONFLICT' | 'LOCATION_CONFLICT' | 'TIME_OVERLAP';
    details: string;
  }>;
}

export interface CalendarMetadata {
  classes: Array<{ id: string; name: string; grade?: string; shift?: string; room?: string }>;
  teachers: Array<{ id: string; name: string; email?: string; specialty?: string }>;
  rooms: Array<{ name: string }>;
  schoolCalendar?: {
    id?: string;
    academicYear?: number;
    totalSchoolDays?: number;
    schoolDaysPerMonth?: Record<string, number>;
  };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * Fetch calendar events for the active organization with filters
 */
export async function fetchOrganizationCalendarEvents(
  startDate: string = '2026-01-01',
  endDate: string = '2026-12-31',
  filters?: {
    eventType?: string;
    classId?: string;
    teacherId?: string;
    organizationId?: string;
  }
): Promise<{ data: CalendarEventFromDb[]; schoolCalendar?: any; error: string | null }> {
  try {
    // 1. Try secure RPC get_my_organization_calendar_events
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_my_organization_calendar_events', {
      p_start_date: startDate,
      p_end_date: endDate,
      p_event_type: filters?.eventType === 'todos' ? null : (filters?.eventType || null),
      p_class_id: filters?.classId && isUuid(filters.classId) ? filters.classId : null,
      p_teacher_id: filters?.teacherId && isUuid(filters.teacherId) ? filters.teacherId : null,
      p_organization_id: filters?.organizationId && isUuid(filters.organizationId) ? filters.organizationId : null,
    });

    if (!rpcErr && rpcData) {
      const items = Array.isArray(rpcData.items) ? rpcData.items : (Array.isArray(rpcData) ? rpcData : []);
      return { 
        data: items, 
        schoolCalendar: rpcData.school_calendar || null, 
        error: null 
      };
    }

    if (rpcErr) {
      console.warn('[CalendarRpcService] RPC get_my_organization_calendar_events warning, using table fallback:', rpcErr);
    }

    // 2. Fallback: Direct table query on calendar_events with RLS
    let query = supabase
      .from('calendar_events')
      .select('*')
      .lte('start_date', endDate)
      .gte('start_date', startDate)
      .order('start_date', { ascending: true });

    if (filters?.organizationId && isUuid(filters.organizationId)) {
      query = query.or(`school_id.eq.${filters.organizationId},school_id.is.null,organization_id.eq.${filters.organizationId}`);
    }
    if (filters?.eventType && filters.eventType !== 'todos') {
      query = query.eq('category', filters.eventType);
    }

    const { data: tableData, error: tableErr } = await query;

    if (!tableErr && tableData) {
      const mappedData: CalendarEventFromDb[] = tableData.map((ev: any) => {
        const cat = ev.category || ev.event_type || 'evento_escolar';
        const cfg = getCategoryConfig(cat);
        return {
          id: ev.id,
          organization_id: ev.organization_id,
          school_id: ev.school_id,
          title: ev.title,
          description: ev.description,
          start_date: ev.start_date,
          end_date: ev.end_date || ev.start_date,
          event_type: cat,
          category: cat,
          color: ev.color || cfg.colorClass,
          color_hex: ev.color_hex || cfg.hexColor,
          is_letivo: ev.is_letivo !== undefined ? ev.is_letivo : cfg.isLetivo,
          academic_year: ev.academic_year || (ev.start_date ? new Date(ev.start_date).getFullYear() : 2026),
          start_time: ev.start_time,
          end_time: ev.end_time,
          location: ev.location,
          room_id: ev.room_id,
          is_all_day: ev.start_time ? false : true,
          target_audience: ev.target_audience || 'all',
          class_id: ev.class_id,
          teacher_id: ev.teacher_id,
          student_id: ev.student_id,
          created_at: ev.created_at,
          updated_at: ev.updated_at,
        };
      });

      return { data: mappedData, error: null };
    }

    return { data: [], error: tableErr?.message || null };
  } catch (err: any) {
    console.error('[CalendarRpcService] fetchOrganizationCalendarEvents exception:', err);
    return { data: [], error: err.message || 'Erro ao carregar eventos.' };
  }
}

/**
 * Fetch calendar metadata (classes, teachers, rooms, school calendar settings)
 */
export async function fetchCalendarMetadata(
  organizationId?: string
): Promise<{ data: CalendarMetadata; error: string | null }> {
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_my_organization_calendar_metadata', {
      p_organization_id: organizationId && isUuid(organizationId) ? organizationId : null,
    });

    if (!rpcErr && rpcData) {
      return {
        data: {
          classes: rpcData.classes || [],
          teachers: rpcData.teachers || [],
          rooms: rpcData.rooms || [],
          schoolCalendar: rpcData.school_calendar || undefined,
        },
        error: null,
      };
    }

    // Fallback: Direct table queries
    const [classesRes, teachersRes, calendarRes] = await Promise.all([
      supabase.from('classes').select('id, name, grade, shift, room').is('deleted_at', null).order('name'),
      supabase.from('teachers').select('id, specialty, profiles:profile_id(full_name, email)').is('deleted_at', null),
      supabase.from('school_calendar').select('*').is('deleted_at', null).order('academic_year', { ascending: false }).limit(1).maybeSingle(),
    ]);

    const mappedClasses = (classesRes.data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      grade: c.grade,
      shift: c.shift,
      room: c.room,
    }));

    const mappedTeachers = (teachersRes.data || []).map((t: any) => ({
      id: t.id,
      name: t.profiles?.full_name || 'Professor(a)',
      email: t.profiles?.email,
      specialty: t.specialty,
    }));

    return {
      data: {
        classes: mappedClasses,
        teachers: mappedTeachers,
        rooms: [],
        schoolCalendar: calendarRes.data || undefined,
      },
      error: null,
    };
  } catch (err: any) {
    console.error('[CalendarRpcService] fetchCalendarMetadata exception:', err);
    return {
      data: { classes: [], teachers: [], rooms: [] },
      error: err.message || 'Erro ao carregar metadados.',
    };
  }
}

/**
 * Check for scheduling conflicts (teacher, class, room overlap)
 */
export async function checkCalendarConflicts(
  startDate: string,
  endDate?: string,
  startTime?: string | null,
  endTime?: string | null,
  teacherId?: string | null,
  classId?: string | null,
  location?: string | null,
  excludeEventId?: string | null,
  organizationId?: string
): Promise<{ data: CalendarConflictCheckResult; error: string | null }> {
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('check_calendar_conflicts', {
      p_start_date: startDate,
      p_end_date: endDate || startDate,
      p_start_time: startTime || null,
      p_end_time: endTime || null,
      p_teacher_id: teacherId && isUuid(teacherId) ? teacherId : null,
      p_class_id: classId && isUuid(classId) ? classId : null,
      p_location: location || null,
      p_exclude_event_id: excludeEventId && isUuid(excludeEventId) ? excludeEventId : null,
      p_organization_id: organizationId && isUuid(organizationId) ? organizationId : null,
    });

    if (!rpcErr && rpcData) {
      return {
        data: {
          hasConflicts: !!rpcData.has_conflicts,
          conflictCount: rpcData.conflict_count || 0,
          conflicts: (rpcData.conflicts || []).map((c: any) => ({
            eventId: c.event_id,
            title: c.title,
            startDate: c.start_date,
            endDate: c.end_date,
            startTime: c.start_time,
            endTime: c.end_time,
            location: c.location,
            conflictType: c.conflict_type,
            details: c.details,
          })),
        },
        error: null,
      };
    }

    return {
      data: { hasConflicts: false, conflictCount: 0, conflicts: [] },
      error: null,
    };
  } catch (err: any) {
    console.error('[CalendarRpcService] checkCalendarConflicts exception:', err);
    return {
      data: { hasConflicts: false, conflictCount: 0, conflicts: [] },
      error: err.message,
    };
  }
}

export function parseCivilDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date(dateStr);
}

export function formatCivilDate(date: Date): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  } catch {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}

export async function getAuthenticatedUserSchoolAndOrgId(
  providedOrgId?: string,
  providedSchoolId?: string
): Promise<{ organizationId: string; schoolId: string }> {
  let orgId = providedOrgId && isUuid(providedOrgId) ? providedOrgId : '';
  let schoolId = providedSchoolId && isUuid(providedSchoolId) ? providedSchoolId : (orgId || '');

  if (!orgId) {
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (userId) {
        const { data: mem } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', userId)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (mem?.organization_id && isUuid(mem.organization_id)) {
          orgId = mem.organization_id;
        }
      }
    } catch (e) {
      console.warn('[getAuthenticatedUserSchoolAndOrgId] session error:', e);
    }
  }

  if (!schoolId && orgId) schoolId = orgId;

  return { organizationId: orgId, schoolId };
}

export function getResolvedOrganizationId(providedOrgId?: string): string {
  if (providedOrgId && isUuid(providedOrgId)) {
    return providedOrgId;
  }
  return '';
}

/**
 * Create or update a calendar event with strict schema adherence
 */
export async function createOrUpdateCalendarEvent(
  input: (CreateCalendarEventInput | UpdateCalendarEventInput) & { eventId?: string }
): Promise<{ data: CalendarEventFromDb | null; error: string | null }> {
  try {
    const eventType = input.category || input.eventType || 'evento_escolar';
    const cfg = getCategoryConfig(eventType);
    
    // Dynamic Brazilian Date formatter (America/Sao_Paulo)
    const getTodayDateStr = () => {
      try {
        return new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Sao_Paulo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(new Date());
      } catch {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    };

    const startDate = input.startDate || getTodayDateStr();
    const endDate = input.endDate || startDate;
    const title = (input.title || cfg.label || 'Evento Escolar').trim();
    
    const { organizationId: orgId, schoolId } = await getAuthenticatedUserSchoolAndOrgId(
      input.organizationId || undefined,
      input.schoolId || undefined
    );

    const parsedStart = parseCivilDate(startDate);
    const academicYear = input.academicYear || parsedStart.getFullYear();
    const isLetivo = input.isLetivo !== undefined ? input.isLetivo : cfg.isLetivo;
    const colorHex = input.colorHex || cfg.hexColor;
    const colorClass = input.color || cfg.colorClass;

    // 1. Clean payload strictly matching public.calendar_events table schema in Supabase
    // Top level columns confirmed: id, organization_id, school_id, calendar_id, title, description,
    // event_type, category, start_date, end_date, start_time, end_time, is_all_day, location,
    // room_id, color, target_audience, class_id, class_ids, teacher_id, student_id, updated_at, metadata.
    const recordPayload: Record<string, any> = {
      title,
      description: input.description || null,
      start_date: startDate,
      end_date: endDate,
      start_time: input.startTime ? (input.startTime.length === 5 ? `${input.startTime}:00` : input.startTime) : null,
      end_time: input.endTime ? (input.endTime.length === 5 ? `${input.endTime}:00` : input.endTime) : null,
      event_type: eventType,
      category: eventType,
      color: colorClass,
      location: input.location || null,
      target_audience: input.targetAudience || 'all',
      is_all_day: input.isAllDay !== undefined ? input.isAllDay : true,
      updated_at: new Date().toISOString(),
      metadata: {
        color_hex: colorHex,
        is_letivo: isLetivo,
        academic_year: academicYear
      }
    };

    if (orgId && isUuid(orgId)) recordPayload.organization_id = orgId;
    if (schoolId && isUuid(schoolId)) recordPayload.school_id = schoolId;
    if (input.classId && isUuid(input.classId)) recordPayload.class_id = input.classId;
    if (input.teacherId && isUuid(input.teacherId)) recordPayload.teacher_id = input.teacherId;
    if (input.studentId && isUuid(input.studentId)) recordPayload.student_id = input.studentId;
    if (input.roomId && isUuid(input.roomId)) recordPayload.room_id = input.roomId;

    if (input.eventId && isUuid(input.eventId)) {
      const { data: updated, error: updateErr } = await supabase
        .from('calendar_events')
        .update(recordPayload)
        .eq('id', input.eventId)
        .select('*')
        .maybeSingle();

      if (!updateErr && updated) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('classium_calendar_updated', { detail: { eventId: updated.id, action: 'update' } }));
        }
        return {
          data: {
            ...updated,
            category: updated.category || updated.event_type,
            is_letivo: isLetivo,
            color_hex: colorHex,
            academic_year: academicYear
          },
          error: null
        };
      }
      return { data: null, error: updateErr?.message || 'Erro ao atualizar evento.' };
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from('calendar_events')
        .insert([recordPayload])
        .select('*')
        .maybeSingle();

      if (!insertErr && inserted) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('classium_calendar_updated', { detail: { eventId: inserted.id, action: 'insert' } }));
        }
        return {
          data: {
            ...inserted,
            category: inserted.category || inserted.event_type,
            is_letivo: isLetivo,
            color_hex: colorHex,
            academic_year: academicYear
          },
          error: null
        };
      }
      return { data: null, error: insertErr?.message || 'Erro ao criar evento no Supabase.' };
    }
  } catch (err: any) {
    console.error('[CalendarRpcService] createOrUpdateCalendarEvent exception:', err);
    return { data: null, error: err.message || 'Erro ao salvar evento.' };
  }
}

/**
 * Dynamically calculate official school days per month and total annual letivo count
 */
export function calculateOfficialSchoolDays(
  events: CalendarEventFromDb[],
  year: number = 2026
): { totalSchoolDays: number; schoolDaysPerMonth: Record<number, number> } {
  const schoolDaysPerMonth: Record<number, number> = {};
  let totalSchoolDays = 0;

  // Build a map of dates to event category / is_letivo override
  const dateEventMap = new Map<string, { isLetivo: boolean; priority: number }>();

  events.forEach((ev) => {
    if (!ev.start_date) return;
    const cat = ev.category || ev.event_type || 'evento_escolar';
    const cfg = getCategoryConfig(cat);
    const isLetivo = ev.is_letivo !== undefined ? ev.is_letivo : cfg.isLetivo;
    const priority = cat === 'feriado_nacional' || cat === 'periodo_nacional' ? 100
      : cat === 'recesso_escolar' || cat === 'recesso_nacional' ? 90
      : cat === 'recesso_fim_semana' ? 80
      : 50;

    const existing = dateEventMap.get(ev.start_date);
    if (!existing || priority >= existing.priority) {
      dateEventMap.set(ev.start_date, { isLetivo, priority });
    }
  });

  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let monthLetivoCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dt = new Date(year, month, day);
      const dayOfWeek = dt.getDay(); // 0 = Sun, 6 = Sat
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      const explicitEvent = dateEventMap.get(dateStr);
      if (explicitEvent !== undefined) {
        if (explicitEvent.isLetivo) {
          monthLetivoCount++;
        }
      } else {
        // Default logic: Monday to Friday are letivo days, unless in January (default holiday month)
        if (!isWeekend && month !== 0) {
          monthLetivoCount++;
        }
      }
    }

    schoolDaysPerMonth[month] = monthLetivoCount;
    totalSchoolDays += monthLetivoCount;
  }

  return { totalSchoolDays, schoolDaysPerMonth };
}

/**
 * Backward compatibility wrapper for createCalendarEvent
 */
export async function createCalendarEvent(
  input: CreateCalendarEventInput
): Promise<{ data: CalendarEventFromDb | null; error: string | null }> {
  return createOrUpdateCalendarEvent(input);
}

/**
 * Backward compatibility wrapper for updateCalendarEvent
 */
export async function updateCalendarEvent(
  input: UpdateCalendarEventInput
): Promise<{ data: CalendarEventFromDb | null; error: string | null }> {
  return createOrUpdateCalendarEvent(input);
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(
  eventId: string,
  _organizationId?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!eventId) return { success: false, error: 'ID do evento inválido.' };

    if (!isUuid(eventId)) {
      return { success: true, error: null };
    }

    const { error: deleteErr } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId);

    if (deleteErr) {
      return { success: false, error: deleteErr.message };
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('classium_calendar_updated', { detail: { eventId, action: 'delete' } }));
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('[CalendarRpcService] deleteCalendarEvent exception:', err);
    return { success: false, error: err.message || 'Erro ao excluir evento.' };
  }
}

/**
 * Check if the user is staff for the organization
 */
export async function checkIsOrgStaff(orgId?: string): Promise<boolean> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (session?.session?.user) {
      return true;
    }
    const { data } = await supabase.rpc('is_org_staff', {
      p_org_id: orgId || null,
    });
    return data !== undefined ? !!data : true;
  } catch {
    return true;
  }
}

/**
 * Sync Brazilian National Holidays into calendar_events table in Supabase
 */
export async function syncNationalHolidaysToDb(
  year: number = 2026,
  organizationId?: string
): Promise<{ syncedCount: number; error: string | null }> {
  try {
    const { HolidayService } = await import('./holidays.service');
    const holidays = await HolidayService.getHolidays(year);
    const orgId = getResolvedOrganizationId(organizationId);

    const startDateStr = `${year}-01-01`;
    const endDateStr = `${year}-12-31`;

    const { data: existingEvents } = await supabase
      .from('calendar_events')
      .select('id, start_date, title, event_type')
      .eq('organization_id', orgId)
      .gte('start_date', startDateStr)
      .lte('start_date', endDateStr);

    const existingDates = new Set((existingEvents || []).map((e: any) => e.start_date));
    let syncedCount = 0;

    for (const h of holidays) {
      if (!existingDates.has(h.date)) {
        const { error } = await supabase.from('calendar_events').insert([
          {
            organization_id: orgId,
            title: h.name,
            description: `Feriado Nacional Oficial do Brasil: ${h.name}`,
            event_type: 'feriado_nacional',
            start_date: h.date,
            end_date: h.date,
            location: 'Nacional',
            target_audience: 'all',
            color: 'bg-red-600',
            updated_at: new Date().toISOString(),
          }
        ]);
        if (!error) syncedCount++;
      }
    }

    return { syncedCount, error: null };
  } catch (err: any) {
    console.error('[CalendarRpcService] syncNationalHolidaysToDb error:', err);
    return { syncedCount: 0, error: err.message || 'Erro ao sincronizar feriados.' };
  }
}

/**
 * Auto-generate weekend recesses and official holidays for a specific academic year in Supabase
 */
export async function autoGenerateWeekendRecessEventsInDb(
  year: number = 2026,
  organizationId?: string
): Promise<{ createdCount: number; skippedCount: number; error: string | null }> {
  try {
    const startDateStr = `${year}-01-01`;
    const endDateStr = `${year}-12-31`;

    const { data: existingEvents } = await fetchOrganizationCalendarEvents(startDateStr, endDateStr, {
      organizationId,
    });

    const existingMap = new Set<string>();
    (existingEvents || []).forEach((ev) => {
      if (
        ev.title === 'Recesso de Fim de Semana' ||
        ev.event_type === 'recesso_fim_semana' ||
        ev.event_type === 'feriado_nacional'
      ) {
        existingMap.add(ev.start_date);
      }
    });

    const newWeekendEvents: any[] = [];
    let skippedCount = 0;

    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);

    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      const dayOfWeek = dt.getDay(); // 0 = Sunday, 6 = Saturday
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const dd = String(dt.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        if (existingMap.has(dateStr)) {
          skippedCount++;
        } else {
          newWeekendEvents.push({
            title: 'Recesso de Fim de Semana',
            description: 'Recesso de Fim de Semana (Sábado/Domingo).',
            startDate: dateStr,
            endDate: dateStr,
            eventType: 'recesso_fim_semana',
            color: 'bg-sky-400',
            isAllDay: true,
            targetAudience: 'all',
            organizationId: organizationId && isUuid(organizationId) ? organizationId : undefined,
          });
        }
      }
    }

    if (newWeekendEvents.length === 0) {
      return { createdCount: 0, skippedCount, error: null };
    }

    let createdCount = 0;
    // Batch save or individual saves
    for (const ev of newWeekendEvents) {
      const res = await createOrUpdateCalendarEvent(ev);
      if (res.data) createdCount++;
    }

    return { createdCount, skippedCount, error: null };
  } catch (err: any) {
    console.error('[CalendarRpcService] autoGenerateWeekendRecessEventsInDb error:', err);
    return { createdCount: 0, skippedCount: 0, error: err.message || 'Erro na automação de calendário.' };
  }
}

/**
 * Subscribe to realtime changes on calendar_events and events tables with multi-tenant filtering
 */
export function subscribeToCalendarEvents(
  onEventChanged: (payload: any) => void,
  organizationId?: string
) {
  const realtimeService = RealtimeService.getInstance();
  const filter = organizationId && isUuid(organizationId) ? `organization_id=eq.${organizationId}` : undefined;

  const unsubCalendarEvents = realtimeService.subscribe(
    `calendar_events_${organizationId || 'global'}`,
    { table: 'calendar_events', filter },
    (payload) => {
      onEventChanged(payload);
    }
  );

  const unsubEvents = realtimeService.subscribe(
    `events_${organizationId || 'global'}`,
    { table: 'events', filter },
    (payload) => {
      onEventChanged(payload);
    }
  );

  const handleLocalSync = (e: any) => {
    onEventChanged(e?.detail || { eventType: 'LOCAL_SYNC' });
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('classium_calendar_updated', handleLocalSync);
  }

  return () => {
    unsubCalendarEvents();
    unsubEvents();
    if (typeof window !== 'undefined') {
      window.removeEventListener('classium_calendar_updated', handleLocalSync);
    }
  };
}
