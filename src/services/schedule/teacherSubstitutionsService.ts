import { supabase } from '../../lib/supabase';

export interface TeacherSubstitution {
  id: string;
  organization_id: string;
  absent_teacher_id: string;
  absent_teacher_name: string;
  substitute_teacher_id?: string;
  substitute_teacher_name?: string;
  class_id: string;
  class_name: string;
  subject_name: string;
  substitution_date: string; // YYYY-MM-DD
  time_slot: string; // e.g. "07:30 - 08:15"
  period_number: number;
  reason: string;
  status: 'pendente' | 'aceita' | 'recusada' | 'concluida' | 'cancelada';
  created_at?: string;
  updated_at?: string;
  synced?: boolean;
}

const LOCAL_STORAGE_KEY = 'classium_teacher_substitutions_v1';

// Seed data when no records exist yet
const getSeedSubstitutions = (organizationId: string): TeacherSubstitution[] => {
  const today = new Date().toISOString().split('T')[0];
  return [
    {
      id: 'sub-seed-1',
      organization_id: organizationId,
      absent_teacher_id: 'abs-carlos-1',
      absent_teacher_name: 'Carlos Eduardo',
      substitute_teacher_id: 'sub-fernando-1',
      substitute_teacher_name: 'Fernando Dias',
      class_id: 'c-6a',
      class_name: '6º Ano A',
      subject_name: 'Português',
      substitution_date: today,
      time_slot: '07:30 - 08:15',
      period_number: 1,
      reason: 'Afastamento médico / Licença saúde',
      status: 'aceita',
      synced: false,
      created_at: new Date().toISOString()
    },
    {
      id: 'sub-seed-2',
      organization_id: organizationId,
      absent_teacher_id: 'abs-carlos-1',
      absent_teacher_name: 'Carlos Eduardo',
      substitute_teacher_id: 'sub-juliana-1',
      substitute_teacher_name: 'Juliana Souza',
      class_id: 'c-7b',
      class_name: '7º Ano B',
      subject_name: 'Português',
      substitution_date: today,
      time_slot: '08:15 - 09:00',
      period_number: 2,
      reason: 'Afastamento médico / Licença saúde',
      status: 'aceita',
      synced: false,
      created_at: new Date().toISOString()
    },
    {
      id: 'sub-seed-3',
      organization_id: organizationId,
      absent_teacher_id: 'abs-carlos-1',
      absent_teacher_name: 'Carlos Eduardo',
      substitute_teacher_id: 'sub-marcos-1',
      substitute_teacher_name: 'Marcos Vinicius',
      class_id: 'c-9c',
      class_name: '9º Ano C',
      subject_name: 'Português',
      substitution_date: today,
      time_slot: '10:45 - 11:30',
      period_number: 5,
      reason: 'Afastamento médico / Licença saúde',
      status: 'pendente',
      synced: false,
      created_at: new Date().toISOString()
    }
  ];
};

function readLocal(organizationId: string): TeacherSubstitution[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(`${LOCAL_STORAGE_KEY}_${organizationId}`);
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch (e) {
    console.warn('[TeacherSubstitutions] LocalStorage read failed:', e);
  }
  return [];
}

function writeLocal(organizationId: string, items: TeacherSubstitution[]) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(`${LOCAL_STORAGE_KEY}_${organizationId}`, JSON.stringify(items));
    }
  } catch (e) {
    console.warn('[TeacherSubstitutions] LocalStorage write failed:', e);
  }
}

export const teacherSubstitutionsService = {
  async getSubstitutions(organizationId: string): Promise<TeacherSubstitution[]> {
    // 1. Try Supabase
    try {
      const { data, error } = await supabase
        .from('teacher_substitutions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('substitution_date', { ascending: false });

      if (!error && data && data.length > 0) {
        const syncedItems = (data as TeacherSubstitution[]).map(item => ({ ...item, synced: true }));
        writeLocal(organizationId, syncedItems);
        return syncedItems;
      }
    } catch (_) {
      // Supabase table does not exist or schema cache missing; proceed silently to local storage
    }

    // 2. Fallback to LocalStorage
    const local = readLocal(organizationId);
    if (local.length > 0) {
      return local;
    }

    // 3. Initialize seed data if completely empty
    const seeded = getSeedSubstitutions(organizationId);
    writeLocal(organizationId, seeded);
    return seeded;
  },

  async createSubstitution(sub: Omit<TeacherSubstitution, 'id' | 'created_at'>): Promise<TeacherSubstitution> {
    const newRecord: TeacherSubstitution = {
      ...sub,
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      created_at: new Date().toISOString(),
      synced: false
    };

    // Try Supabase insert
    try {
      const { data, error } = await supabase
        .from('teacher_substitutions')
        .insert([{ ...newRecord, synced: undefined }])
        .select()
        .single();

      if (!error && data) {
        newRecord.synced = true;
      }
    } catch (_) {
      // Silently fall back to local storage
    }

    // Always persist to local storage
    const current = readLocal(sub.organization_id);
    const updated = [newRecord, ...current.filter(item => item.id !== newRecord.id)];
    writeLocal(sub.organization_id, updated);

    window.dispatchEvent(new CustomEvent('classium_substitutions_updated'));
    return newRecord;
  },

  async updateStatus(
    organizationId: string, 
    substitutionId: string, 
    status: TeacherSubstitution['status'], 
    substituteTeacherId?: string, 
    substituteTeacherName?: string
  ): Promise<boolean> {
    const updates: any = { status, updated_at: new Date().toISOString() };
    if (substituteTeacherId) updates.substitute_teacher_id = substituteTeacherId;
    if (substituteTeacherName) updates.substitute_teacher_name = substituteTeacherName;

    // Try Supabase update
    try {
      await supabase
        .from('teacher_substitutions')
        .update(updates)
        .eq('id', substitutionId)
        .eq('organization_id', organizationId);
    } catch (_) {
      // Silently fallback to local storage
    }

    // Update in local storage
    const current = readLocal(organizationId);
    const updated = current.map(item => {
      if (item.id === substitutionId) {
        return { ...item, ...updates };
      }
      return item;
    });
    writeLocal(organizationId, updated);

    window.dispatchEvent(new CustomEvent('classium_substitutions_updated'));
    return true;
  },

  async deleteSubstitution(organizationId: string, substitutionId: string): Promise<boolean> {
    // Try Supabase delete
    try {
      await supabase
        .from('teacher_substitutions')
        .delete()
        .eq('id', substitutionId)
        .eq('organization_id', organizationId);
    } catch (_) {
      // Silently fallback to local storage
    }

    // Remove from local storage
    const current = readLocal(organizationId);
    const updated = current.filter(item => item.id !== substitutionId);
    writeLocal(organizationId, updated);

    window.dispatchEvent(new CustomEvent('classium_substitutions_updated'));
    return true;
  }
};
