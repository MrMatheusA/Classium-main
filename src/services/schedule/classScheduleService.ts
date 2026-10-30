import { supabase } from '../../lib/supabase';
import { RealtimeService } from '../RealtimeService';

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
  day_of_week: number; // 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta
  period_number: number; // 1, 2, 3, 4, 5, 6
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
  teachers?: string[];
  teacher_id?: string;
}

export interface ScheduleTimeSlot {
  id: string;
  organization_id: string;
  school_id?: string;
  shift: string; // '1º Turno (Matutino)', '2º Turno (Vespertino)', '3º Turno (Noturno)'
  slot_order: number; // 1, 2, 3, 4, 5, 6
  slot_type: 'aula' | 'recreio';
  label: string; // '1ª Aula', 'Intervalo Escolar / Recreio'
  start_time: string; // '07:30' or '07:30:00'
  end_time: string; // '08:15' or '08:15:00'
  academic_year: number | string;
  period_number: number; // 1, 2, 99 (recreio), 3, 4, 5
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
  { name: 'Português', color: '#F8FAFC', tag: 'PORT.' },
  { name: 'Matemática', color: '#FACC15', tag: 'MAT.' },
  { name: 'Geografia', color: '#38BDF8', tag: 'GEO.' },
  { name: 'História', color: '#F87171', tag: 'HIST.' },
  { name: 'Inglês', color: '#C084FC', tag: 'ING.' },
  { name: 'Artes', color: '#F472B6', tag: 'ARTES' },
  { name: 'Educação Física', color: '#4ADE80', tag: 'ED.F.' },
  { name: 'Ensino Religioso', color: '#EAB308', tag: 'ENS.REL.' },
  { name: 'Ciências', color: '#22D3EE', tag: 'CIÊN.' },
  { name: 'Outro', color: '#94A3B8', tag: 'OUTRO' },
];

export const DEFAULT_INITIAL_SLOTS: Record<string, Array<Omit<ScheduleTimeSlot, 'id' | 'organization_id'>>> = {
  '1º Turno (Matutino)': [
    { shift: '1º Turno (Matutino)', slot_order: 1, slot_type: 'aula', label: '1ª Aula', start_time: '07:30', end_time: '08:15', academic_year: '2026', period_number: 1 },
    { shift: '1º Turno (Matutino)', slot_order: 2, slot_type: 'aula', label: '2ª Aula', start_time: '08:15', end_time: '08:50', academic_year: '2026', period_number: 2 },
    { shift: '1º Turno (Matutino)', slot_order: 3, slot_type: 'recreio', label: 'Intervalo Escolar / Recreio', start_time: '08:50', end_time: '09:10', academic_year: '2026', period_number: 99 },
    { shift: '1º Turno (Matutino)', slot_order: 4, slot_type: 'aula', label: '3ª Aula', start_time: '09:10', end_time: '09:55', academic_year: '2026', period_number: 3 },
    { shift: '1º Turno (Matutino)', slot_order: 5, slot_type: 'aula', label: '4ª Aula', start_time: '09:55', end_time: '10:40', academic_year: '2026', period_number: 4 },
    { shift: '1º Turno (Matutino)', slot_order: 6, slot_type: 'aula', label: '5ª Aula', start_time: '10:40', end_time: '11:30', academic_year: '2026', period_number: 5 },
  ],
  '2º Turno (Vespertino)': [
    { shift: '2º Turno (Vespertino)', slot_order: 1, slot_type: 'aula', label: '1ª Aula', start_time: '13:00', end_time: '13:45', academic_year: '2026', period_number: 1 },
    { shift: '2º Turno (Vespertino)', slot_order: 2, slot_type: 'aula', label: '2ª Aula', start_time: '13:45', end_time: '14:30', academic_year: '2026', period_number: 2 },
    { shift: '2º Turno (Vespertino)', slot_order: 3, slot_type: 'recreio', label: 'Intervalo Escolar / Recreio', start_time: '14:50', end_time: '15:10', academic_year: '2026', period_number: 99 },
    { shift: '2º Turno (Vespertino)', slot_order: 4, slot_type: 'aula', label: '3ª Aula', start_time: '15:10', end_time: '15:55', academic_year: '2026', period_number: 3 },
    { shift: '2º Turno (Vespertino)', slot_order: 5, slot_type: 'aula', label: '4ª Aula', start_time: '15:55', end_time: '16:40', academic_year: '2026', period_number: 4 },
    { shift: '2º Turno (Vespertino)', slot_order: 6, slot_type: 'aula', label: '5ª Aula', start_time: '16:40', end_time: '17:30', academic_year: '2026', period_number: 5 },
  ],
  '3º Turno (Noturno)': [
    { shift: '3º Turno (Noturno)', slot_order: 1, slot_type: 'aula', label: '1ª Aula', start_time: '18:30', end_time: '19:15', academic_year: '2026', period_number: 1 },
    { shift: '3º Turno (Noturno)', slot_order: 2, slot_type: 'aula', label: '2ª Aula', start_time: '19:15', end_time: '20:00', academic_year: '2026', period_number: 2 },
    { shift: '3º Turno (Noturno)', slot_order: 3, slot_type: 'recreio', label: 'Intervalo Escolar / Recreio', start_time: '20:10', end_time: '20:30', academic_year: '2026', period_number: 99 },
    { shift: '3º Turno (Noturno)', slot_order: 4, slot_type: 'aula', label: '3ª Aula', start_time: '20:30', end_time: '21:15', academic_year: '2026', period_number: 3 },
    { shift: '3º Turno (Noturno)', slot_order: 5, slot_type: 'aula', label: '4ª Aula', start_time: '21:15', end_time: '22:00', academic_year: '2026', period_number: 4 },
    { shift: '3º Turno (Noturno)', slot_order: 6, slot_type: 'aula', label: '5ª Aula', start_time: '22:00', end_time: '22:30', academic_year: '2026', period_number: 5 },
  ]
};

// Helper: Normalize time string to HH:MM
const formatTimeHHMM = (timeStr?: string): string => {
  if (!timeStr) return '07:30';
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return timeStr;
};

// Helper: Check time overlap between two [startA, endA] and [startB, endB]
const checkTimeOverlap = (startA: string, endA: string, startB: string, endB: string): boolean => {
  return (startA < endB && endA > startB);
};

const STORAGE_SLOTS_KEY = 'classium_schedule_time_slots_store_v1';

const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return '';
  }
  return process.env.VITE_APP_URL || 'http://localhost:3000';
};

class ClassScheduleService {
  private localSlotsMemory: Record<string, ScheduleTimeSlot[]> = {};

  constructor() {
    this.initSlotsFromLocalStorage();
  }

  private initSlotsFromLocalStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(STORAGE_SLOTS_KEY);
        if (stored) {
          this.localSlotsMemory = JSON.parse(stored);
        }
      }
    } catch (e) {
      console.warn('[ClassScheduleService] LocalStorage read error:', e);
    }
  }

  private persistSlotsLocally(orgId: string, slots: ScheduleTimeSlot[]) {
    this.localSlotsMemory[orgId] = slots;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_SLOTS_KEY, JSON.stringify(this.localSlotsMemory));
      }
    } catch (e) {
      console.warn('[ClassScheduleService] LocalStorage save error:', e);
    }
  }

  /**
   * Obtém a lista unificada de time slots para o turno e organização (Fonte Única da Verdade)
   */
  async getShiftTimeSlots(organizationId: string, shiftKey: string, academicYear = '2026'): Promise<ScheduleTimeSlot[]> {
    // 1. Tentar carregar do Supabase a partir da tabela schedule_time_slots
    try {
      let query = supabase
        .from('schedule_time_slots')
        .select('*')
        .eq('organization_id', organizationId)
        .order('slot_order', { ascending: true });

      // Tenta filtrar por shift_name
      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        // Filtrar pelo turno solicitado (compatibilidade com shift_name ou shift)
        const matching = data.filter((d: any) => {
          const sName = d.shift_name || d.shift || '';
          return sName.toLowerCase().includes(shiftKey.toLowerCase().replace(/[^a-z0-9]/g, '')) ||
                 shiftKey.toLowerCase().includes(sName.toLowerCase().replace(/[^a-z0-9]/g, '')) ||
                 (shiftKey.includes('Matutino') && (sName.includes('Matutino') || sName.includes('1º'))) ||
                 (shiftKey.includes('Vespertino') && (sName.includes('Vespertino') || sName.includes('2º'))) ||
                 (shiftKey.includes('Noturno') && (sName.includes('Noturno') || sName.includes('3º')));
        });

        if (matching.length > 0) {
          const formatted: ScheduleTimeSlot[] = matching.map((d: any) => ({
            id: d.id,
            organization_id: d.organization_id || organizationId,
            school_id: d.school_id,
            shift: shiftKey,
            slot_order: Number(d.slot_order),
            slot_type: d.is_break ? 'recreio' : (d.slot_type || 'aula'),
            label: d.label,
            start_time: formatTimeHHMM(d.start_time),
            end_time: formatTimeHHMM(d.end_time),
            academic_year: d.academic_year || academicYear,
            period_number: d.period_number ?? (d.is_break ? 99 : Number(d.slot_order))
          }));
          this.persistSlotsLocally(organizationId, formatted);
          return formatted.sort((a, b) => a.slot_order - b.slot_order);
        }
      }
    } catch (err) {
      console.warn('[ClassScheduleService] Supabase schedule_time_slots query fallback:', err);
    }

    // 2. Verificar memória local
    const orgSlots = this.localSlotsMemory[organizationId] || [];
    const matchingShiftSlots = orgSlots.filter(s => s.shift === shiftKey && String(s.academic_year) === String(academicYear));
    if (matchingShiftSlots.length > 0) {
      return matchingShiftSlots.sort((a, b) => a.slot_order - b.slot_order);
    }

    // 3. Fallback para slots padrão oficiais
    const baseTemplates = DEFAULT_INITIAL_SLOTS[shiftKey] || DEFAULT_INITIAL_SLOTS['1º Turno (Matutino)'];
    const generatedSlots: ScheduleTimeSlot[] = baseTemplates.map((t) => ({
      id: `slot_${shiftKey.replace(/[^a-zA-Z0-9]/g, '_')}_${t.slot_order}`,
      organization_id: organizationId,
      shift: shiftKey,
      slot_order: t.slot_order,
      slot_type: t.slot_type,
      label: t.label,
      start_time: formatTimeHHMM(t.start_time),
      end_time: formatTimeHHMM(t.end_time),
      academic_year: academicYear,
      period_number: t.period_number
    }));

    // Persiste no cache local
    const allOrgSlots = (this.localSlotsMemory[organizationId] || []).filter(s => s.shift !== shiftKey);
    this.persistSlotsLocally(organizationId, [...allOrgSlots, ...generatedSlots]);

    return generatedSlots;
  }

  /**
   * Converte os slots de um turno na estrutura ShiftInfo com Início das Aulas, Recreio e Término
   * calculados DINAMICAMENTE dos slots reais (Fonte Única da Verdade)
   */
  async getShiftInfo(organizationId: string, shiftKey: string, academicYear = '2026'): Promise<ShiftInfo> {
    const slots = await this.getShiftTimeSlots(organizationId, shiftKey, academicYear);
    
    // Slots normais de aula
    const classSlots = slots.filter(s => s.slot_type === 'aula');
    // Slot de intervalo / recreio
    const breakSlot = slots.find(s => s.slot_type === 'recreio');

    // Início das Aulas = Menor start_time das aulas
    let minStart = '07:30';
    let maxEnd = '11:30';

    if (classSlots.length > 0) {
      const sortedStart = [...classSlots].sort((a, b) => a.start_time.localeCompare(b.start_time));
      const sortedEnd = [...classSlots].sort((a, b) => b.end_time.localeCompare(a.end_time));
      minStart = sortedStart[0].start_time;
      maxEnd = sortedEnd[0].end_time;
    }

    const breakStart = breakSlot ? breakSlot.start_time : '09:40';
    const breakEnd = breakSlot ? breakSlot.end_time : '09:55';

    let label = '1º Turno — Manhã';
    if (shiftKey.includes('Vespertino') || shiftKey.includes('2º')) label = '2º Turno — Tarde';
    if (shiftKey.includes('Noturno') || shiftKey.includes('3º')) label = '3º Turno — Noite';

    const periods: ShiftPeriodConfig[] = slots.map(s => ({
      id: s.id,
      periodNumber: s.period_number,
      startTime: s.start_time,
      endTime: s.end_time,
      label: s.label,
      isBreak: s.slot_type === 'recreio',
      slotOrder: s.slot_order
    }));

    return {
      id: shiftKey,
      name: shiftKey,
      label,
      startTime: minStart,
      endTime: maxEnd,
      breakStart,
      breakEnd,
      periods
    };
  }

  /**
   * Adiciona um novo período/slot ao turno (Fase 5 - Botão Adicionar Horário)
   * - Valida consistência de horários e não sobreposição
   * - Insere em schedule_time_slots no Supabase
   * - Sincroniza em tempo real
   */
  async addShiftTimeSlot(
    organizationId: string,
    shiftKey: string,
    newSlotData: {
      label: string;
      startTime: string;
      endTime: string;
      isBreak?: boolean;
      academicYear?: string;
    }
  ): Promise<{ success: boolean; error?: string; shiftInfo?: ShiftInfo; slot?: ScheduleTimeSlot }> {
    const formattedStart = formatTimeHHMM(newSlotData.startTime);
    const formattedEnd = formatTimeHHMM(newSlotData.endTime);
    const academicYear = newSlotData.academicYear || '2026';

    // 1. Validação básica de horário
    if (formattedStart >= formattedEnd) {
      return { 
        success: false, 
        error: 'Horário inválido: O horário de início deve ser anterior ao horário de término.' 
      };
    }

    // 2. Carregar slots atuais
    const currentSlots = await this.getShiftTimeSlots(organizationId, shiftKey, academicYear);

    // 3. Validação de Sobreposição (overlaps)
    for (const other of currentSlots) {
      if (checkTimeOverlap(formattedStart, formattedEnd, other.start_time, other.end_time)) {
        return {
          success: false,
          error: `Conflito de horário: O intervalo ${formattedStart} às ${formattedEnd} sobrepõe a "${other.label}" (${other.start_time} às ${other.end_time}) no turno ${shiftKey}.`
        };
      }
    }

    // 4. Determinar próxima ordem e número do período
    const nextSlotOrder = currentSlots.length > 0 ? Math.max(...currentSlots.map(s => s.slot_order)) + 1 : 1;
    const classSlots = currentSlots.filter(s => s.slot_type === 'aula');
    const nextPeriodNumber = newSlotData.isBreak ? 99 : (classSlots.length > 0 ? Math.max(...classSlots.map(s => s.period_number)) + 1 : 1);

    const newRecord = {
      organization_id: organizationId,
      shift_name: shiftKey,
      slot_order: nextSlotOrder,
      period_number: newSlotData.isBreak ? null : nextPeriodNumber,
      label: newSlotData.label.trim() || (newSlotData.isBreak ? 'Intervalo' : `${nextPeriodNumber}ª Aula`),
      start_time: `${formattedStart}:00`,
      end_time: `${formattedEnd}:00`,
      is_break: Boolean(newSlotData.isBreak),
      academic_year: academicYear
    };

    try {
      const { data, error } = await supabase
        .from('schedule_time_slots')
        .insert([newRecord])
        .select()
        .single();

      if (error) {
        console.warn('[ClassScheduleService] Erro ao inserir slot no Supabase:', error);
      }

      // Atualizar cache local
      const createdSlot: ScheduleTimeSlot = {
        id: data?.id || `slot_${Date.now()}`,
        organization_id: organizationId,
        shift: shiftKey,
        slot_order: nextSlotOrder,
        slot_type: newSlotData.isBreak ? 'recreio' : 'aula',
        label: newRecord.label,
        start_time: formattedStart,
        end_time: formattedEnd,
        academic_year: academicYear,
        period_number: nextPeriodNumber
      };

      const updatedSlots = [...currentSlots, createdSlot].sort((a, b) => a.start_time.localeCompare(b.start_time));
      // Re-ordenar slot_order baseado no horário de início
      const reordered = updatedSlots.map((s, idx) => ({ ...s, slot_order: idx + 1 }));
      const otherOrgSlots = (this.localSlotsMemory[organizationId] || []).filter(s => s.shift !== shiftKey);
      this.persistSlotsLocally(organizationId, [...otherOrgSlots, ...reordered]);

      // Broadcast Realtime
      try {
        const broadcastChannel = supabase.channel(`schedule_sync_${organizationId}`);
        broadcastChannel.send({
          type: 'broadcast',
          event: 'schedule_slots_updated',
          payload: { shift: shiftKey, action: 'add', timestamp: Date.now() }
        });
      } catch (_) {}

      const updatedShiftInfo = await this.getShiftInfo(organizationId, shiftKey, academicYear);
      return { success: true, shiftInfo: updatedShiftInfo, slot: createdSlot };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Falha ao adicionar horário' };
    }
  }

  /**
   * Remove um período/slot de horário do turno
   */
  async deleteShiftTimeSlot(
    organizationId: string,
    shiftKey: string,
    slotOrder: number,
    academicYear = '2026'
  ): Promise<{ success: boolean; error?: string; shiftInfo?: ShiftInfo }> {
    try {
      // 1. Obter slots
      const currentSlots = await this.getShiftTimeSlots(organizationId, shiftKey, academicYear);
      const targetSlot = currentSlots.find(s => s.slot_order === slotOrder);
      if (!targetSlot) {
        return { success: false, error: 'Horário não encontrado.' };
      }

      // 2. Deletar do Supabase se ID for UUID
      if (targetSlot.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetSlot.id)) {
        await supabase.from('schedule_time_slots').delete().eq('id', targetSlot.id);
      } else {
        await supabase
          .from('schedule_time_slots')
          .delete()
          .eq('organization_id', organizationId)
          .eq('shift_name', shiftKey)
          .eq('slot_order', slotOrder);
      }

      // 3. Atualizar cache local
      const filtered = currentSlots.filter(s => s.slot_order !== slotOrder);
      const otherOrgSlots = (this.localSlotsMemory[organizationId] || []).filter(s => s.shift !== shiftKey);
      this.persistSlotsLocally(organizationId, [...otherOrgSlots, ...filtered]);

      // 4. Broadcast Realtime
      try {
        const broadcastChannel = supabase.channel(`schedule_sync_${organizationId}`);
        broadcastChannel.send({
          type: 'broadcast',
          event: 'schedule_slots_updated',
          payload: { shift: shiftKey, action: 'delete', timestamp: Date.now() }
        });
      } catch (_) {}

      const updatedShiftInfo = await this.getShiftInfo(organizationId, shiftKey, academicYear);
      return { success: true, shiftInfo: updatedShiftInfo };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Falha ao excluir horário do turno.' };
    }
  }

  /**
   * Atualiza o horário de início e fim de um slot específico da grade
   * - Valida consistência (startTime < endTime)
   * - Valida sobreposição (overlaps) com outros slots do mesmo turno
   * - Atualiza a fonte de dados schedule_time_slots
   * - Atualiza os registros existentes em class_schedules para todas as turmas desse turno
   * - Emite broadcast em tempo real
   */
  async updateShiftTimeSlot(
    organizationId: string,
    shiftKey: string,
    slotOrder: number,
    newStartTime: string,
    newEndTime: string,
    academicYear = '2026'
  ): Promise<{ success: boolean; error?: string; shiftInfo?: ShiftInfo }> {
    const formattedStart = formatTimeHHMM(newStartTime);
    const formattedEnd = formatTimeHHMM(newEndTime);

    // 1. Validação básica de horário
    if (formattedStart >= formattedEnd) {
      return { 
        success: false, 
        error: 'Horário inválido: O horário de início deve ser anterior ao horário de término.' 
      };
    }

    // 2. Carregar slots atuais
    const currentSlots = await this.getShiftTimeSlots(organizationId, shiftKey, academicYear);
    const targetSlot = currentSlots.find(s => s.slot_order === slotOrder);
    if (!targetSlot) {
      return { success: false, error: 'Slot de horário não encontrado.' };
    }

    // 3. Validação de Sobreposição com outros slots do mesmo turno
    const otherSlots = currentSlots.filter(s => s.slot_order !== slotOrder);
    for (const other of otherSlots) {
      if (checkTimeOverlap(formattedStart, formattedEnd, other.start_time, other.end_time)) {
        return {
          success: false,
          error: `Conflito de horário: O intervalo ${formattedStart} às ${formattedEnd} sobrepõe a "${other.label}" (${other.start_time} às ${other.end_time}) no turno ${shiftKey}.`
        };
      }
    }

    // 4. Atualizar o slot
    const updatedSlots = currentSlots.map(s => {
      if (s.slot_order === slotOrder) {
        return {
          ...s,
          start_time: formattedStart,
          end_time: formattedEnd,
        };
      }
      return s;
    });

    // 5. Persistir localmente
    const otherOrgSlots = (this.localSlotsMemory[organizationId] || []).filter(s => s.shift !== shiftKey);
    this.persistSlotsLocally(organizationId, [...otherOrgSlots, ...updatedSlots]);

    // 6. Atualizar no Supabase schedule_time_slots
    try {
      if (targetSlot.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetSlot.id)) {
        await supabase
          .from('schedule_time_slots')
          .update({
            start_time: `${formattedStart}:00`,
            end_time: `${formattedEnd}:00`,
            updated_at: new Date().toISOString()
          })
          .eq('id', targetSlot.id);
      } else {
        await supabase
          .from('schedule_time_slots')
          .update({
            start_time: `${formattedStart}:00`,
            end_time: `${formattedEnd}:00`,
            updated_at: new Date().toISOString()
          })
          .eq('organization_id', organizationId)
          .eq('shift_name', shiftKey)
          .eq('slot_order', slotOrder);
      }
    } catch (e) {
      console.warn('[ClassScheduleService] Erro ao atualizar slot no Supabase:', e);
    }

    // 7. Atualizar as linhas existentes em class_schedules para todas as turmas vinculadas ao turno
    try {
      const { data: shiftClasses } = await supabase
        .from('classes')
        .select('id')
        .eq('organization_id', organizationId)
        .ilike('shift', `%${shiftKey.includes('Matutino') ? 'Matutino' : shiftKey.includes('Vespertino') ? 'Vespertino' : 'Noturno'}%`);

      if (shiftClasses && shiftClasses.length > 0) {
        const classIds = shiftClasses.map(c => c.id);
        // Atualiza os registros do period_number correspondente
        await supabase
          .from('class_schedules')
          .update({
            start_time: `${formattedStart}:00`,
            end_time: `${formattedEnd}:00`
          })
          .in('class_id', classIds)
          .eq('period_number', targetSlot.period_number);
      }
    } catch (e) {
      console.warn('[ClassScheduleService] Atualização cascata em class_schedules:', e);
    }

    // 8. Tentar atualizar school_shifts
    try {
      const shiftInfo = await this.getShiftInfo(organizationId, shiftKey, academicYear);
      await supabase
        .from('school_shifts')
        .update({
          start_time: `${shiftInfo.startTime}:00`,
          end_time: `${shiftInfo.endTime}:00`
        })
        .eq('organization_id', organizationId)
        .ilike('name', `%${shiftKey.includes('Matutino') ? 'Matutino' : shiftKey.includes('Vespertino') ? 'Vespertino' : 'Noturno'}%`);
    } catch (e) {
      // ignore
    }

    // 9. Emitir notificação Realtime
    try {
      const broadcastChannel = supabase.channel(`schedule_sync_${organizationId}`);
      broadcastChannel.send({
        type: 'broadcast',
        event: 'schedule_slots_updated',
        payload: { shift: shiftKey, updatedSlot: targetSlot, timestamp: Date.now() }
      });
    } catch (e) {
      // ignore
    }

    const updatedShiftInfo = await this.getShiftInfo(organizationId, shiftKey, academicYear);
    return { success: true, shiftInfo: updatedShiftInfo };
  }

  /**
   * Buscar turmas da organização com filtro opcional por turno
   */
  async getClasses(organizationId: string, shiftFilter?: string): Promise<SimpleClassEntity[]> {
    let rawClasses: any[] = [];

    // 1. Tentar consulta direta ao Supabase
    try {
      let query = supabase
        .from('classes')
        .select('id, name, code, grade, shift, room, academic_year, organization_id, status, is_active, teacher_id')
        .eq('organization_id', organizationId)
        .neq('status', 'inativa')
        .neq('is_active', false)
        .order('name', { ascending: true });

      if (shiftFilter && shiftFilter !== 'ALL') {
        query = query.ilike('shift', `%${shiftFilter}%`);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        rawClasses = data;
      } else if (error) {
        // Se for restrição de permissão RLS/anon (ex: 42501), registra aviso informativo e aciona API proxy
        if (error.code === '42501' || error.message?.includes('permission denied')) {
          console.warn('[ClassScheduleService] Permissão direta ao banco restrita para tabela classes (código 42501). Buscando via API proxy...');
        } else {
          console.warn('[ClassScheduleService] Aviso ao buscar turmas no Supabase:', error.message || error);
        }
      }
    } catch (err: any) {
      console.warn('[ClassScheduleService] Exceção ao consultar turmas no Supabase:', err?.message || err);
    }

    // 2. Se vazio ou restrito, consultar API Proxy (/api/classes)
    if (rawClasses.length === 0) {
      try {
        const queryParams = new URLSearchParams();
        if (organizationId) queryParams.set('organization_id', organizationId);
        if (shiftFilter && shiftFilter !== 'ALL') queryParams.set('shift', shiftFilter);

        const res = await fetch(`/api/classes?${queryParams.toString()}`, {
          headers: { 'x-organization-id': organizationId }
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            rawClasses = json.data;
          }
        }
      } catch (apiErr: any) {
        console.warn('[ClassScheduleService] Falha ao consultar turmas via API proxy:', apiErr?.message || apiErr);
      }
    }

    // 3. Contagem real de estudantes matriculados em cada turma da organização
    const studentCounts: Record<string, number> = {};
    try {
      const { data: stData, error: stErr } = await supabase
        .from('students')
        .select('class_id')
        .eq('organization_id', organizationId)
        .not('class_id', 'is', null);

      if (!stErr && stData) {
        stData.forEach((st: any) => {
          if (st.class_id) {
            studentCounts[st.class_id] = (studentCounts[st.class_id] || 0) + 1;
          }
        });
      }
    } catch (e) {
      console.warn('[ClassScheduleService] Erro ao buscar contagem de alunos:', e);
    }

    // 4. Professores alocados na grade horária de cada turma
    const teachersMap: Record<string, string[]> = {};
    try {
      const { data: schData, error: schErr } = await supabase
        .from('class_schedules')
        .select('class_id, teacher_name')
        .eq('organization_id', organizationId)
        .not('teacher_name', 'is', null);

      if (!schErr && schData) {
        schData.forEach((s: any) => {
          if (s.class_id && s.teacher_name) {
            if (!teachersMap[s.class_id]) teachersMap[s.class_id] = [];
            if (!teachersMap[s.class_id].includes(s.teacher_name)) {
              teachersMap[s.class_id].push(s.teacher_name);
            }
          }
        });
      }
    } catch (e) {
      console.warn('[ClassScheduleService] Erro ao buscar professores da grade:', e);
    }

    const enriched: SimpleClassEntity[] = rawClasses.map(c => ({
      ...c,
      students_count: studentCounts[c.id] ?? c.students_count ?? 0,
      teachers: (teachersMap[c.id] && teachersMap[c.id].length > 0) ? teachersMap[c.id] : (c.teachers || [])
    }));

    return enriched;
  }

  /**
   * Buscar turma por ID
   */
  async getClassById(classId: string): Promise<SimpleClassEntity | null> {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, code, grade, shift, room, academic_year, organization_id, status, is_active')
        .eq('id', classId)
        .maybeSingle();

      if (!error && data) {
        return data as SimpleClassEntity;
      }
      if (error) {
        console.warn('[ClassScheduleService] Aviso ao buscar turma por ID no Supabase:', error.message || error);
      }
    } catch (err: any) {
      console.warn('[ClassScheduleService] Exceção ao buscar turma por ID:', err?.message || err);
    }

    // Fallback via API proxy
    try {
      const res = await fetch(`/api/classes/${encodeURIComponent(classId)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data as SimpleClassEntity;
        }
      }
    } catch (apiErr: any) {
      console.warn('[ClassScheduleService] Falha ao buscar turma por ID via API proxy:', apiErr?.message || apiErr);
    }

    return null;
  }

  /**
   * Criar nova Turma (CRUD - Create)
   */
  async createClass(organizationId: string, classData: {
    name: string;
    shift: string;
    room: string;
    grade?: string;
    code?: string;
    academic_year?: string;
  }): Promise<{ success: boolean; data?: SimpleClassEntity; error?: string }> {
    const newClassPayload = {
      organization_id: organizationId,
      name: classData.name.trim(),
      shift: classData.shift,
      room: classData.room.trim(),
      grade: classData.grade?.trim() || classData.name.trim().split(' ')[0] || '7º Ano',
      code: classData.code?.trim() || `TURMA-${Date.now().toString().slice(-4)}`,
      academic_year: classData.academic_year || '2026',
      status: 'active',
      is_active: true,
      school_days: 200,
      max_capacity: 35,
      max_students: 35
    };

    try {
      const { data, error } = await supabase
        .from('classes')
        .insert([newClassPayload])
        .select()
        .single();

      if (!error && data) {
        return { success: true, data: data as SimpleClassEntity };
      }

      if (error) {
        console.warn('[ClassScheduleService] Supabase insert classes notice:', error.message);
      }
    } catch (e: any) {
      console.warn('[ClassScheduleService] Supabase insert classes exception:', e?.message || e);
    }

    // Fallback via API proxy
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organizationId
        },
        body: JSON.stringify(newClassPayload)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return { success: true, data: json.data as SimpleClassEntity };
        }
      }
    } catch (apiErr: any) {
      console.warn('[ClassScheduleService] Falha ao criar turma via API proxy:', apiErr?.message || apiErr);
    }

    return { success: false, error: 'Não foi possível cadastrar a turma.' };
  }

  /**
   * Atualizar Turma existente (CRUD - Update)
   */
  async updateClass(classId: string, classData: {
    name: string;
    shift: string;
    room: string;
    grade?: string;
    code?: string;
  }): Promise<{ success: boolean; data?: SimpleClassEntity; error?: string }> {
    const updatePayload: any = {
      name: classData.name.trim(),
      shift: classData.shift,
      room: classData.room.trim(),
      updated_at: new Date().toISOString()
    };

    if (classData.grade) updatePayload.grade = classData.grade.trim();
    if (classData.code) updatePayload.code = classData.code.trim();

    try {
      const { data, error } = await supabase
        .from('classes')
        .update(updatePayload)
        .eq('id', classId)
        .select()
        .single();

      if (!error && data) {
        return { success: true, data: data as SimpleClassEntity };
      }

      if (error) {
        console.warn('[ClassScheduleService] Supabase update classes notice:', error.message);
      }
    } catch (e: any) {
      console.warn('[ClassScheduleService] Supabase update classes exception:', e?.message || e);
    }

    // Fallback via API proxy
    try {
      const res = await fetch(`/api/classes/${encodeURIComponent(classId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatePayload)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return { success: true, data: json.data as SimpleClassEntity };
        }
      }
    } catch (apiErr: any) {
      console.warn('[ClassScheduleService] Falha ao atualizar turma via API proxy:', apiErr?.message || apiErr);
    }

    return { success: false, error: 'Erro ao atualizar turma' };
  }

  /**
   * Excluir Turma (CRUD - Delete com Soft Delete Inteligente)
   * Se a turma possuir estudantes matriculados ou histórico -> Soft Delete (status: 'inativa', is_active: false)
   * Se for uma turma sem estudantes nem histórico -> Hard Delete (delete row)
   */
  async deleteClass(classId: string): Promise<{ 
    success: boolean; 
    wasSoftDeleted: boolean; 
    studentsCount: number; 
    error?: string; 
    message?: string;
  }> {
    try {
      // 1. Verificar se existem estudantes vinculados a esta turma
      const { data: students, count: studentCount } = await supabase
        .from('students')
        .select('id', { count: 'exact' })
        .eq('class_id', classId);

      const totalStudents = studentCount || (students ? students.length : 0);

      // 2. Verificar se existem notas, frequências ou ocorrências vinculadas
      let hasPedagogicalHistory = false;
      try {
        const { count: attendanceCount } = await supabase
          .from('attendances')
          .select('id', { count: 'exact', head: true })
          .eq('class_id', classId);
        if (attendanceCount && attendanceCount > 0) hasPedagogicalHistory = true;
      } catch (e) {
        // ignore
      }

      if (totalStudents > 0 || hasPedagogicalHistory) {
        // SOFT DELETE: Inativa a turma para preservar dados históricos
        const { error: softDelErr } = await supabase
          .from('classes')
          .update({
            status: 'inativa',
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', classId);

        if (softDelErr) {
          // Fallback via API proxy
          try {
            const res = await fetch(`/api/classes/${encodeURIComponent(classId)}`, {
              method: 'DELETE'
            });
            if (res.ok) {
              return { success: true, wasSoftDeleted: true, studentsCount: totalStudents, message: 'Turma inativada com sucesso.' };
            }
          } catch (_) {}
          return { success: false, wasSoftDeleted: false, studentsCount: totalStudents, error: softDelErr.message };
        }

        return { 
          success: true, 
          wasSoftDeleted: true, 
          studentsCount: totalStudents, 
          message: `A turma possui ${totalStudents} estudante(s) e histórico registrado. Foi inativada com segurança (soft delete), preservando os dados pedagógicos.` 
        };
      } else {
        // HARD DELETE: Turma sem vínculos pode ser excluída definitivamente
        // Remove horários associados
        try {
          await supabase.from('class_schedules').delete().eq('class_id', classId);
        } catch (_) {}
        
        const { error: hardDelErr } = await supabase
          .from('classes')
          .delete()
          .eq('id', classId);

        if (hardDelErr) {
          // Fallback via API proxy
          try {
            const res = await fetch(`/api/classes/${encodeURIComponent(classId)}`, {
              method: 'DELETE'
            });
            if (res.ok) {
              return { success: true, wasSoftDeleted: false, studentsCount: 0, message: 'Turma excluída definitivamente do sistema.' };
            }
          } catch (_) {}
          return { success: false, wasSoftDeleted: false, studentsCount: 0, error: hardDelErr.message };
        }

        return { 
          success: true, 
          wasSoftDeleted: false, 
          studentsCount: 0, 
          message: 'Turma excluída definitivamente do sistema.' 
        };
      }
    } catch (e: any) {
      return { success: false, wasSoftDeleted: false, studentsCount: 0, error: e?.message || 'Erro ao excluir turma' };
    }
  }

  /**
   * Buscar os horários da turma
   */
  async getClassSchedules(classId: string): Promise<ClassScheduleRecord[]> {
    try {
      const { data, error } = await supabase
        .from('class_schedules')
        .select('*')
        .eq('class_id', classId)
        .order('day_of_week', { ascending: true })
        .order('period_number', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as ClassScheduleRecord[];
      }
      if (error) {
        console.warn('[ClassScheduleService] Aviso ao carregar horários da turma no Supabase:', error.message || error);
      }
    } catch (err: any) {
      console.warn('[ClassScheduleService] Exceção ao carregar horários da turma:', err?.message || err);
    }

    // Fallback via API proxy
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/classes/${encodeURIComponent(classId)}/schedules`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data as ClassScheduleRecord[];
        }
      }
    } catch (apiErr: any) {
      console.warn('[ClassScheduleService] Falha ao carregar horários via API proxy:', apiErr?.message || apiErr);
    }

    return [];
  }

  /**
   * Validar conflitos de professor, sala e horários antes de salvar
   */
  async validateScheduleConflicts(
    organizationId: string,
    classId: string,
    schedules: Array<Omit<ClassScheduleRecord, 'id' | 'created_at'>>
  ): Promise<{ valid: boolean; conflicts: ScheduleConflict[] }> {
    const conflicts: ScheduleConflict[] = [];

    // 1. Validação interna de integridade dos slots enviados
    const seenSlots = new Set<string>();
    for (const s of schedules) {
      // 1.1 Início maior ou igual ao término
      if (s.start_time && s.end_time) {
        const [startH, startM] = s.start_time.split(':').map(Number);
        const [endH, endM] = s.end_time.split(':').map(Number);
        const startTotal = (startH || 0) * 60 + (startM || 0);
        const endTotal = (endH || 0) * 60 + (endM || 0);
        if (startTotal >= endTotal) {
          conflicts.push({
            type: 'invalid_time',
            day_of_week: s.day_of_week,
            period_number: s.period_number,
            message: `Horário inválido no ${s.period_number}º período: início (${s.start_time}) deve ser anterior ao término (${s.end_time}).`
          });
        }
      }

      // 1.2 Duplicidade de dia e período no mesmo payload
      const slotKey = `${s.day_of_week}_${s.period_number}`;
      if (seenSlots.has(slotKey)) {
        conflicts.push({
          type: 'overlap',
          day_of_week: s.day_of_week,
          period_number: s.period_number,
          message: `Período duplicado detectado para o dia ${s.day_of_week}, período ${s.period_number}.`
        });
      }
      seenSlots.add(slotKey);
    }

    // 2. Validação cruzada com outras turmas da mesma instituição
    try {
      const { data: otherSchedules, error: schedError } = await supabase
        .from('class_schedules')
        .select('id, class_id, day_of_week, period_number, start_time, end_time, teacher_name, room, discipline_name')
        .eq('organization_id', organizationId)
        .neq('class_id', classId);

      if (!schedError && otherSchedules && otherSchedules.length > 0) {
        // Buscar nomes das turmas para mensagens informativas e claras
        const { data: allClasses } = await supabase
          .from('classes')
          .select('id, name')
          .eq('organization_id', organizationId);

        const classNameMap = new Map<string, string>();
        allClasses?.forEach(c => classNameMap.set(c.id, c.name));

        for (const s of schedules) {
          const teacherClean = s.teacher_name?.trim().toLowerCase();
          const roomClean = s.room?.trim().toLowerCase();

          for (const other of otherSchedules) {
            if (other.day_of_week !== s.day_of_week || other.period_number !== s.period_number) {
              continue;
            }

            const otherClassName = classNameMap.get(other.class_id) || 'outra turma';

            // 2.1 Conflito de Professor
            if (
              teacherClean &&
              teacherClean !== 'sem professor' &&
              teacherClean !== 'a definir' &&
              other.teacher_name?.trim().toLowerCase() === teacherClean
            ) {
              conflicts.push({
                type: 'teacher',
                day_of_week: s.day_of_week,
                period_number: s.period_number,
                conflictingClassId: other.class_id,
                conflictingClassName: otherClassName,
                message: `Conflito de Professor: O docente "${s.teacher_name}" já está alocado na turma "${otherClassName}" no mesmo dia (${s.day_of_week}) e ${s.period_number}º período.`
              });
            }

            // 2.2 Conflito de Sala
            if (
              roomClean &&
              roomClean !== 'sem sala' &&
              roomClean !== 'a definir' &&
              other.room?.trim().toLowerCase() === roomClean
            ) {
              conflicts.push({
                type: 'room',
                day_of_week: s.day_of_week,
                period_number: s.period_number,
                conflictingClassId: other.class_id,
                conflictingClassName: otherClassName,
                message: `Conflito de Espaço/Sala: A "${s.room}" já está ocupada pela turma "${otherClassName}" no mesmo dia (${s.day_of_week}) e ${s.period_number}º período.`
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('[ClassScheduleService] Aviso ao verificar conflitos cruzados no Supabase:', e);
    }

    return {
      valid: conflicts.length === 0,
      conflicts
    };
  }

  /**
   * Salvar/Atualizar a grade semanal da turma no Supabase com validação atômica
   */
  async saveClassSchedules(
    organizationId: string,
    classId: string,
    schedules: Array<Omit<ClassScheduleRecord, 'id' | 'created_at'>>
  ): Promise<{ success: boolean; error?: string; conflicts?: ScheduleConflict[] }> {
    try {
      // 1. Validação de conflitos antes de alterar o banco
      const validation = await this.validateScheduleConflicts(organizationId, classId, schedules);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.conflicts.map(c => c.message).join(' \n '),
          conflicts: validation.conflicts
        };
      }

      // 2. Tentar gravação direta no Supabase
      let directWriteSuccess = false;
      try {
        const { error: delError } = await supabase
          .from('class_schedules')
          .delete()
          .eq('class_id', classId);

        if (!delError) {
          if (!schedules || schedules.length === 0) {
            directWriteSuccess = true;
          } else {
            const recordsToInsert = schedules.map(s => ({
              organization_id: organizationId,
              class_id: classId,
              day_of_week: Number(s.day_of_week),
              period_number: Number(s.period_number),
              start_time: s.start_time,
              end_time: s.end_time,
              discipline_name: s.discipline_name?.trim() || 'Sem aula',
              teacher_name: s.teacher_name?.trim() || null,
              room: s.room?.trim() || null
            }));

            const { error: insError } = await supabase
              .from('class_schedules')
              .insert(recordsToInsert);

            if (!insError) {
              directWriteSuccess = true;
            } else {
              console.warn('[ClassScheduleService] Supabase insert warning, trying server proxy:', insError.message);
            }
          }
        }
      } catch (sbErr) {
        console.warn('[ClassScheduleService] Supabase direct write exception, fallback to API proxy:', sbErr);
      }

      // 3. Fallback via API proxy (/api/classes/:classId/schedules)
      if (!directWriteSuccess) {
        const res = await fetch(`${getApiBaseUrl()}/api/classes/${encodeURIComponent(classId)}/schedules`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-organization-id': organizationId
          },
          body: JSON.stringify({ organizationId, schedules })
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          return { success: false, error: errJson.error || 'Falha ao persistir horários na base de dados.' };
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('classium_schedule_updated', { detail: { classId, organizationId } }));
        window.dispatchEvent(new CustomEvent('classium_classes_updated'));
        window.dispatchEvent(new CustomEvent('classium_school_updated'));
      }

      return { success: true };
    } catch (err: any) {
      console.warn('[ClassScheduleService] Exceção ao salvar horários:', err?.message || err);
      return { success: false, error: err?.message || 'Falha desconhecida' };
    }
  }

  /**
   * Limpar toda a grade de uma turma
   */
  async clearClassSchedules(classId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('class_schedules')
        .delete()
        .eq('class_id', classId);

      if (error) {
        // Fallback via API proxy
        const res = await fetch(`${getApiBaseUrl()}/api/classes/${encodeURIComponent(classId)}/schedules`, {
          method: 'DELETE'
        });
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          return { success: false, error: errJson.error || error.message };
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('classium_schedule_updated', { detail: { classId } }));
        window.dispatchEvent(new CustomEvent('classium_classes_updated'));
        window.dispatchEvent(new CustomEvent('classium_school_updated'));
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Erro ao limpar grade.' };
    }
  }

  /**
   * Duplicar grade de uma turma para outra
   */
  async duplicateSchedule(
    sourceClassId: string,
    targetClassId: string,
    organizationId: string
  ): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      const sourceSchedules = await this.getClassSchedules(sourceClassId);
      if (sourceSchedules.length === 0) {
        return { success: false, error: 'A turma de origem não possui horários cadastrados.' };
      }

      // Validar conflitos na turma de destino
      const validation = await this.validateScheduleConflicts(organizationId, targetClassId, sourceSchedules);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.conflicts.map(c => c.message).join(' \n ')
        };
      }

      // Deletar horários existentes na turma de destino
      await supabase.from('class_schedules').delete().eq('class_id', targetClassId);

      // Inserir os horários copiados
      const copiedSchedules = sourceSchedules.map(item => ({
        organization_id: organizationId,
        class_id: targetClassId,
        day_of_week: item.day_of_week,
        period_number: item.period_number,
        start_time: item.start_time,
        end_time: item.end_time,
        discipline_name: item.discipline_name,
        teacher_name: item.teacher_name,
        room: item.room
      }));

      const { error } = await supabase.from('class_schedules').insert(copiedSchedules);
      if (error) {
        return { success: false, error: error.message };
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('classium_schedule_updated', { detail: { classId: targetClassId, organizationId } }));
        window.dispatchEvent(new CustomEvent('classium_classes_updated'));
      }

      return { success: true, count: copiedSchedules.length };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao duplicar grade' };
    }
  }

  /**
   * Buscar disciplinas cadastradas na organização
   */
  async getDisciplines(organizationId: string) {
    try {
      const { data, error } = await supabase
        .from('disciplines')
        .select('id, name, color')
        .eq('organization_id', organizationId)
        .order('name', { ascending: true });
      if (!error && data) return data;
      if (error) console.warn('[ClassScheduleService] Aviso ao buscar disciplinas:', error.message || error);
    } catch (e: any) {
      console.warn('[ClassScheduleService] Exceção ao buscar disciplinas:', e?.message || e);
    }
    return [];
  }

  /**
   * Buscar professores da organização
   */
  async getTeachers(organizationId: string) {
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('id, name')
        .eq('organization_id', organizationId)
        .order('name', { ascending: true });
      if (!error && data) return data;
      if (error) console.warn('[ClassScheduleService] Aviso ao buscar professores:', error.message || error);
    } catch (e: any) {
      console.warn('[ClassScheduleService] Exceção ao buscar professores:', e?.message || e);
    }
    return [];
  }

  /**
   * Realtime subscription centralizada para atualizações da grade
   */
  subscribeToClassSchedule(classId: string, onUpdate: () => void) {
    const unsub = realtimeService.subscribe(
      `class_schedules_${classId}`,
      { table: 'class_schedules', filter: `class_id=eq.${classId}` },
      () => {
        onUpdate();
      }
    );

    return () => {
      unsub();
    };
  }

  /**
   * Realtime subscription centralizada para mudanças de turmas e slots
   */
  subscribeToClassesAndSlots(organizationId: string, onUpdate: () => void) {
    const unsubClasses = realtimeService.subscribe('classes_sched_sub', { table: 'classes' }, onUpdate);
    const unsubStudents = realtimeService.subscribe('students_sched_sub', { table: 'students' }, onUpdate);
    const unsubShifts = realtimeService.subscribe('shifts_sched_sub', { table: 'school_shifts' }, onUpdate);
    const unsubSlots = realtimeService.subscribe('slots_sched_sub', { table: 'schedule_time_slots' }, onUpdate);
    const unsubDisciplines = realtimeService.subscribe('disc_sched_sub', { table: 'disciplines' }, onUpdate);
    const unsubTeachers = realtimeService.subscribe('teach_sched_sub', { table: 'teachers' }, onUpdate);

    return () => {
      unsubClasses();
      unsubStudents();
      unsubShifts();
      unsubSlots();
      unsubDisciplines();
      unsubTeachers();
    };
  }
}

export const classScheduleService = new ClassScheduleService();
