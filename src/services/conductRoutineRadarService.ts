import { supabase } from '../lib/supabase';

export interface ConductRecordPayload {
  studentId: string;
  classId?: string;
  teacherId?: string;
  organizationId?: string;
  schoolId?: string;
  academicYearId?: string;
  termNumber?: number;
  recordType: 'leve' | 'media' | 'gravissima' | 'elogio';
  severity?: string;
  title: string;
  description: string;
  actionsTaken?: string;
  actionTaken?: string;
  occurrenceDate?: string;
  quarter?: number;
  year?: number;
  recordedByName?: string;
  idempotencyKey?: string;
}

export interface ConductRecordResult {
  success: boolean;
  occurrenceId?: string;
  conductRecordId?: string;
  studentId?: string;
  studentName?: string;
  severity?: string;
  pointsDeducted?: number;
  balanceBefore?: number;
  newBalance?: number;
  pointsLost?: number;
  milestone10Triggered?: boolean;
  milestone15Triggered?: boolean;
  milestone20Triggered?: boolean;
  message?: string;
  error?: string;
}

export interface QuarterlyConductScore {
  basePoints: number;
  pointsLost: number;
  currentBalance: number;
  milestone10: boolean;
  milestone15: boolean;
  milestone20: boolean;
  totalLeve?: number;
  totalMedia?: number;
  totalGravissima?: number;
  totalElogio?: number;
}

export interface ConductMovement {
  id: string;
  studentId: string;
  year: number;
  quarter: number;
  movementType: string;
  severity?: string;
  pointsApplied: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  createdBy?: string;
  createdAt: string;
}

export interface FamilyConductOccurrence {
  id: string;
  studentId: string;
  studentName?: string;
  recordedByName: string;
  recordType: 'leve' | 'media' | 'gravissima' | 'elogio';
  severity: string;
  title: string;
  description: string;
  pointsDeducted: number;
  isPositive: boolean;
  isUrgent: boolean;
  occurrenceDate: string;
  quarter: number;
  year: number;
  guardianAcknowledged: boolean;
  guardianAcknowledgedAt?: string;
  guardianNotes?: string;
  status: string;
  createdAt: string;
}

export interface PedagogicalStudentRadarItem {
  id: string;
  name: string;
  grade: string;
  occurrencesCount: number;
  level: 'verde' | 'amarelo' | 'laranja' | 'vermelho' | 'roxo';
  colorHex: string;
  levelLabel: string;
  registrationCode?: string;
  lastOccurrenceDate?: string;
  pointsLost?: number;
  currentBalance?: number;
}

export interface PedagogicalClassRadarItem {
  id: string;
  name: string;
  grade: string;
  studentsCount: number;
  occurrencesCount: number;
  occurrencesPerStudent: number;
  level: 'verde' | 'amarelo' | 'laranja' | 'vermelho' | 'roxo';
  colorHex: string;
  hasActiveIntervention?: boolean;
}

/**
 * 1. Registra Ocorrência de Conduta (via RPC atômica transacional no Supabase)
 */
export async function createConductOccurrence(payload: ConductRecordPayload): Promise<ConductRecordResult> {
  const idempotencyKey = payload.idempotencyKey || `occ_${payload.studentId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const occurrenceDate = payload.occurrenceDate || new Date().toISOString().split('T')[0];
  const quarter = payload.quarter || payload.termNumber || 1;
  const year = payload.year || new Date().getFullYear();

  try {
    // 1. Tentar executar a RPC atômica oficial
    const { data, error } = await supabase.rpc('fn_record_classium_occurrence', {
      p_student_id: payload.studentId,
      p_class_id: payload.classId || null,
      p_teacher_id: payload.teacherId || null,
      p_record_type: payload.recordType,
      p_title: payload.title,
      p_description: payload.description,
      p_actions_taken: payload.actionsTaken || payload.actionTaken || '',
      p_occurrence_date: occurrenceDate,
      p_quarter: quarter,
      p_year: year,
      p_recorded_by_name: payload.recordedByName || 'Professor Docente',
      p_idempotency_key: idempotencyKey,
      p_organization_id: payload.organizationId || null,
      p_school_id: payload.schoolId || null,
      p_academic_year_id: payload.academicYearId || null,
      p_term_number: quarter,
      p_severity: payload.severity || (payload.recordType === 'elogio' ? 'Elogio' : payload.recordType === 'gravissima' ? 'Gravíssima' : payload.recordType === 'media' ? 'Média' : 'Leve'),
      p_action_taken: payload.actionsTaken || payload.actionTaken || ''
    });

    if (!error && data) {
      return {
        success: true,
        occurrenceId: data.occurrence_id,
        conductRecordId: data.conduct_record_id,
        studentId: data.student_id || payload.studentId,
        studentName: data.student_name,
        severity: data.severity,
        pointsDeducted: data.points_deducted,
        balanceBefore: data.balance_before,
        newBalance: data.new_balance,
        pointsLost: data.points_lost,
        milestone10Triggered: data.milestone_10_triggered,
        milestone15Triggered: data.milestone_15_triggered,
        milestone20Triggered: data.milestone_20_triggered,
        message: data.message
      };
    }
  } catch (rpcErr) {
    console.warn('[createConductOccurrence] RPC fn_record_classium_occurrence fallback to direct insert:', rpcErr);
  }

  // 2. Fallback resiliente direto no Supabase
  try {
    let deduction = 0.5;
    let severity = 'Leve';
    let isPositive = false;
    let isUrgent = false;

    if (payload.recordType === 'elogio') {
      deduction = 0.0;
      severity = 'Elogio';
      isPositive = true;
    } else if (payload.recordType === 'gravissima') {
      deduction = 2.0;
      severity = 'Gravíssima';
      isUrgent = true;
    } else if (payload.recordType === 'media') {
      deduction = 1.0;
      severity = 'Média';
    }

    // 2.1 Inserir em occurrences
    const { data: occData, error: occError } = await supabase.from('occurrences').insert([{
      organization_id: payload.organizationId || null,
      school_id: payload.schoolId || null,
      student_id: payload.studentId,
      class_id: payload.classId || null,
      teacher_id: payload.teacherId || null,
      recorded_by_name: payload.recordedByName || 'Professor Docente',
      occurrence_type: payload.recordType,
      record_type: payload.recordType,
      severity,
      title: payload.title,
      description: payload.description,
      actions_taken: payload.actionsTaken || payload.actionTaken || (isPositive ? 'Elogio no Diário Oficial' : 'Registro de Conduta'),
      points_deducted: deduction,
      is_positive: isPositive,
      is_urgent: isUrgent,
      occurrence_date: occurrenceDate,
      quarter,
      year,
      idempotency_key: idempotencyKey,
      status: 'Registrada'
    }]).select().single();

    if (occError) {
      console.warn('Direct occurrences insert notice:', occError);
    }

    const occId = occData?.id || `occ_${Date.now()}`;

    // 2.2 Inserir em student_conduct_records para compatibilidade
    try {
      await supabase.from('student_conduct_records').insert([{
        organization_id: payload.organizationId || null,
        school_id: payload.schoolId || null,
        student_id: payload.studentId,
        class_id: payload.classId || null,
        teacher_id: payload.teacherId || null,
        date: occurrenceDate,
        type: payload.recordType,
        title: payload.title,
        description: payload.description,
        action_taken: payload.actionsTaken || payload.actionTaken || '',
        parent_notified: true,
        severity,
        points_deducted: deduction,
        is_positive: isPositive,
        status: 'Registrada',
        academic_year_id: payload.academicYearId || null,
        term_number: quarter
      }]);
    } catch (_) {}

    // 2.3 Calcular total de perdas e atualizar saldo
    let totalPointsLost = deduction;
    try {
      const { data: allStudentOccs } = await supabase
        .from('occurrences')
        .select('points_deducted, is_positive')
        .eq('student_id', payload.studentId)
        .eq('quarter', quarter)
        .eq('year', year);

      if (allStudentOccs && Array.isArray(allStudentOccs)) {
        totalPointsLost = allStudentOccs
          .filter((o: any) => !o.is_positive && typeof o.points_deducted === 'number')
          .reduce((acc: number, curr: any) => acc + Number(curr.points_deducted), 0);
      }

      const newBalance = Math.max(0, 20.0 - totalPointsLost);
      const balanceBefore = 20.0 - (totalPointsLost - deduction);
      const milestone10 = totalPointsLost >= 10.0;
      const milestone15 = totalPointsLost >= 15.0;
      const milestone20 = totalPointsLost >= 20.0;

      await supabase.from('student_conduct_quarterly_scores').upsert({
        organization_id: payload.organizationId || null,
        school_id: payload.schoolId || null,
        student_id: payload.studentId,
        quarter,
        year,
        base_points: 20.0,
        points_lost: totalPointsLost,
        current_balance: newBalance,
        milestone_10_notified: milestone10,
        milestone_15_notified: milestone15,
        milestone_20_notified: milestone20,
        updated_at: new Date().toISOString()
      }, { onConflict: 'student_id,quarter,year' });

      // Upsert espelho student_conduct_scores
      try {
        await supabase.from('student_conduct_scores').upsert({
          organization_id: payload.organizationId || null,
          school_id: payload.schoolId || null,
          student_id: payload.studentId,
          class_id: payload.classId || null,
          academic_year_id: payload.academicYearId || null,
          term_number: quarter,
          base_score: 20.0,
          points_lost: totalPointsLost,
          current_score: newBalance,
          milestone_10_notified: milestone10,
          milestone_15_notified: milestone15,
          milestone_20_notified: milestone20,
          updated_at: new Date().toISOString()
        }, { onConflict: 'student_id,term_number' });
      } catch (_) {}

      // 2.4 Gravar movimento
      if (deduction > 0 || isPositive) {
        try {
          await supabase.from('student_conduct_movements').insert([{
            organization_id: payload.organizationId || null,
            school_id: payload.schoolId || null,
            student_id: payload.studentId,
            occurrence_id: occId,
            quarter,
            year,
            movement_type: isPositive ? 'elogio' : 'deduction',
            severity,
            points_applied: deduction,
            points_amount: deduction,
            points_change: -deduction,
            previous_score: balanceBefore,
            new_score: newBalance,
            balance_before: balanceBefore,
            balance_after: newBalance,
            reason: payload.title || `Advertência ${severity}`,
            created_by: payload.recordedByName || 'Professor Docente',
            created_at: new Date().toISOString()
          }]);
        } catch (movErr) {
          console.warn('Direct conduct movement insert notice:', movErr);
        }
      }
    } catch (scoreUpsertErr) {
      console.warn('Direct quarterly score upsert notice:', scoreUpsertErr);
    }

    // 2.5 Criar Comunicação para os Responsáveis
    try {
      const commTitle = isPositive 
        ? `⭐ Elogio Pedagógico Registrado` 
        : `⚠️ Registro de Conduta: Advertência ${severity} (-${deduction.toFixed(1)} pts)`;

      const commContent = `Informamos que foi lançado um novo registro no Diário de Bordo escolar para o estudante.\n\n` +
        `• Motivo: ${payload.title}\n` +
        `• Detalhes: ${payload.description}\n` +
        `• Ações: ${payload.actionsTaken || payload.actionTaken || 'Registro pedagógico'}\n` +
        `• Saldo Atual do Trimestre: ${(20.0 - totalPointsLost).toFixed(1)} / 20.0 pontos.`;

      const { data: commData } = await supabase.from('communications').insert([{
        organization_id: payload.organizationId || null,
        school_id: payload.schoolId || null,
        title: commTitle,
        content: commContent,
        type: isUrgent ? 'urgent' : (isPositive ? 'general' : 'behavior'),
        target_type: 'student',
        target_student_id: payload.studentId,
        class_id: payload.classId || null,
        created_by_name: payload.recordedByName || 'Professor Docente',
        status: 'published',
        created_at: new Date().toISOString()
      }]).select('id').maybeSingle();

      if (commData?.id) {
        const { data: srlLinks } = await supabase
          .from('student_responsible_links')
          .select('guardian_id')
          .eq('student_id', payload.studentId);

        if (srlLinks && srlLinks.length > 0) {
          const recipientsPayload = srlLinks.map((link: any) => ({
            communication_id: commData.id,
            recipient_type: 'guardian',
            recipient_id: link.guardian_id,
            status: 'delivered',
            read_at: null,
            created_at: new Date().toISOString()
          }));

          await supabase.from('communication_recipients').insert(recipientsPayload);
        }
      }
    } catch (commErr) {
      console.warn('Communication creation notice:', commErr);
    }

    return {
      success: true,
      occurrenceId: occId,
      studentId: payload.studentId,
      severity,
      pointsDeducted: deduction,
      balanceBefore: 20.0 - (totalPointsLost - deduction),
      newBalance: Math.max(0, 20.0 - totalPointsLost),
      pointsLost: totalPointsLost
    };
  } catch (fbErr: any) {
    console.error('Error saving occurrence:', fbErr);
    return {
      success: false,
      error: fbErr?.message || 'Falha ao gravar ocorrência'
    };
  }
}

/**
 * 2. Consulta Saldo de Conduta do Estudante
 */
export async function getStudentConductScore(studentId: string, quarter: number = 1, year: number = 2026): Promise<QuarterlyConductScore> {
  let score: QuarterlyConductScore = {
    basePoints: 20.0,
    pointsLost: 0.0,
    currentBalance: 20.0,
    milestone10: false,
    milestone15: false,
    milestone20: false,
    totalLeve: 0,
    totalMedia: 0,
    totalGravissima: 0,
    totalElogio: 0
  };

  try {
    const { data: scoreData } = await supabase
      .from('student_conduct_quarterly_scores')
      .select('*')
      .eq('student_id', studentId)
      .eq('quarter', quarter)
      .eq('year', year)
      .maybeSingle();

    if (scoreData) {
      score.basePoints = Number(scoreData.base_points) || 20.0;
      score.pointsLost = Number(scoreData.points_lost) || 0.0;
      score.currentBalance = Number(scoreData.current_balance) || 20.0;
      score.milestone10 = Boolean(scoreData.milestone_10_notified);
      score.milestone15 = Boolean(scoreData.milestone_15_notified);
      score.milestone20 = Boolean(scoreData.milestone_20_notified);
    }

    // Busca contadores de ocorrências
    const { data: occs } = await supabase
      .from('occurrences')
      .select('severity, is_positive, points_deducted')
      .eq('student_id', studentId)
      .eq('quarter', quarter)
      .eq('year', year);

    if (occs && Array.isArray(occs)) {
      let l = 0, m = 0, g = 0, e = 0, calcLost = 0;
      occs.forEach((o: any) => {
        if (o.is_positive || o.severity === 'Elogio') e++;
        else if (o.severity === 'Gravíssima') { g++; calcLost += Number(o.points_deducted || 2.0); }
        else if (o.severity === 'Média') { m++; calcLost += Number(o.points_deducted || 1.0); }
        else { l++; calcLost += Number(o.points_deducted || 0.5); }
      });

      score.totalLeve = l;
      score.totalMedia = m;
      score.totalGravissima = g;
      score.totalElogio = e;

      if (!scoreData || score.pointsLost !== calcLost) {
        score.pointsLost = calcLost;
        score.currentBalance = Math.max(0, 20.0 - calcLost);
        score.milestone10 = calcLost >= 10.0;
        score.milestone15 = calcLost >= 15.0;
        score.milestone20 = calcLost >= 20.0;
      }
    }
  } catch (err) {
    console.warn('[getStudentConductScore] error:', err);
  }

  return score;
}

/**
 * 3. Consulta Movimentos de Pontos de Conduta
 */
export async function getStudentConductMovements(studentId: string, quarter: number = 1, year: number = 2026): Promise<ConductMovement[]> {
  try {
    const { data, error } = await supabase
      .from('student_conduct_movements')
      .select('*')
      .eq('student_id', studentId)
      .eq('quarter', quarter)
      .eq('year', year)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((m: any) => ({
      id: m.id,
      studentId: m.student_id,
      year: m.year,
      quarter: m.quarter,
      movementType: m.movement_type,
      severity: m.severity,
      pointsApplied: Number(m.points_applied || m.points_amount || 0),
      balanceBefore: Number(m.balance_before || m.previous_score || 20.0),
      balanceAfter: Number(m.balance_after || m.new_score || 20.0),
      reason: m.reason || '',
      createdBy: m.created_by,
      createdAt: m.created_at
    }));
  } catch (err) {
    console.warn('[getStudentConductMovements] error:', err);
    return [];
  }
}

/**
 * 4. Consulta Ocorrências e Histórico do Diário de Bordo
 */
export async function getStudentConductRecords(studentId: string, quarter?: number, year: number = 2026): Promise<FamilyConductOccurrence[]> {
  try {
    let query = supabase
      .from('occurrences')
      .select('*')
      .eq('student_id', studentId)
      .or('status.eq.Homologada,status.eq.Compartilhada,status.eq.Publicada')
      .order('occurrence_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (quarter) {
      query = query.eq('quarter', quarter);
    }
    if (year) {
      query = query.eq('year', year);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((o: any) => ({
      id: o.id,
      studentId: o.student_id,
      recordedByName: o.recorded_by_name || 'Coordenação Pedagógica',
      recordType: (o.occurrence_type || o.record_type || 'leve') as any,
      severity: o.severity || 'Leve',
      title: o.title || 'Registro de Conduta',
      description: o.description || '',
      pointsDeducted: Number(o.points_deducted) || 0.0,
      isPositive: Boolean(o.is_positive),
      isUrgent: Boolean(o.is_urgent),
      occurrenceDate: o.occurrence_date || o.created_at,
      quarter: Number(o.quarter) || 1,
      year: Number(o.year) || 2026,
      guardianAcknowledged: Boolean(o.guardian_acknowledged),
      guardianAcknowledgedAt: o.guardian_acknowledged_at,
      guardianNotes: o.guardian_notes,
      status: o.status || 'Registrada',
      createdAt: o.created_at
    }));
  } catch (err) {
    console.warn('[getStudentConductRecords] error:', err);
    return [];
  }
}

/**
 * 5. Consulta Estudantes Vinculados ao Responsável Autenticado
 */
export async function getFamilyStudents(userId?: string): Promise<any[]> {
  try {
    let targetUserId = userId;
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      targetUserId = user?.id;
    }

    if (!targetUserId) return [];

    // Busca guardiões vinculados a este auth user
    const { data: guardianRows } = await supabase
      .from('guardians')
      .select('id')
      .eq('user_id', targetUserId);

    const guardianIds = guardianRows?.map((g: any) => g.id) || [];
    guardianIds.push(targetUserId);

    // Consulta vínculos em student_responsible_links
    const { data: links } = await supabase
      .from('student_responsible_links')
      .select('student_id, students(*)')
      .in('guardian_id', guardianIds);

    if (links && links.length > 0) {
      return links.map((l: any) => l.students).filter(Boolean);
    }

    // Fallback: consulta direta em students vinculados ao user_id
    const { data: directStudents } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', targetUserId);

    return directStudents || [];
  } catch (err) {
    console.warn('[getFamilyStudents] error:', err);
    return [];
  }
}

/**
 * 6. Subscreve a atualizações Realtime de Conduta
 */
export function subscribeToConductRealtime(options: {
  studentId?: string;
  onUpdate: () => void;
}) {
  const channelName = `conduct-sub-${options.studentId || 'all'}-${Date.now()}`;
  const filter = options.studentId ? `student_id=eq.${options.studentId}` : undefined;

  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'occurrences', filter }, () => options.onUpdate())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'student_conduct_records', filter }, () => options.onUpdate())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'student_conduct_quarterly_scores', filter }, () => options.onUpdate())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'student_conduct_scores', filter }, () => options.onUpdate())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'student_conduct_movements', filter }, () => options.onUpdate())
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * 7. Consulta Período / Trimestre Letivo Atual
 */
export function getCurrentAcademicTerm(): { quarter: number; year: number; termName: string } {
  const now = new Date();
  const month = now.getMonth() + 1; // 1 to 12
  const year = now.getFullYear();

  let quarter = 1;
  let termName = '1º Trimestre';

  if (month >= 5 && month <= 8) {
    quarter = 2;
    termName = '2º Trimestre';
  } else if (month >= 9) {
    quarter = 3;
    termName = '3º Trimestre';
  }

  return { quarter, year, termName };
}

/**
 * Objeto unificado com suporte retrocompatível
 */
export const conductRoutineRadarService = {
  recordOccurrence: createConductOccurrence,
  fetchStudentConductData: async (studentId: string, quarter: number = 1, year: number = 2026) => {
    const score = await getStudentConductScore(studentId, quarter, year);
    const occurrences = await getStudentConductRecords(studentId, quarter, year);
    return { score, occurrences };
  },
  getConductMovements: getStudentConductMovements,
  getFamilyStudents,
  subscribeToConductRealtime,
  getCurrentAcademicTerm,

  async acknowledgeConductRecord(occurrenceId: string, notes?: string, guardianName: string = 'Responsável Legal'): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('fn_acknowledge_student_conduct', {
        p_occurrence_id: occurrenceId,
        p_guardian_notes: notes || null,
        p_guardian_name: guardianName
      });

      if (error) {
        console.error('[acknowledgeConductRecord] RPC error:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('[acknowledgeConductRecord] Failed to invoke fn_acknowledge_student_conduct RPC:', e);
      return false;
    }
  },

  async saveClassInterventionProject(classId: string, title: string, goal: string, strategy: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('class_conduct_interventions').insert([{
        class_id: classId,
        title,
        goal,
        strategy,
        status: 'Em Andamento',
        created_at: new Date().toISOString()
      }]);
      return !error;
    } catch (e) {
      console.error('Error saving class intervention:', e);
      return false;
    }
  },

  async saveStudentPedagogicalAction(studentId: string, actionType: 'conversa' | 'reuniao' | 'intervencao', notes: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('student_pedagogical_actions').insert([{
        student_id: studentId,
        action_type: actionType,
        notes,
        created_at: new Date().toISOString()
      }]);
      return !error;
    } catch (e) {
      console.error('Error saving student action:', e);
      return false;
    }
  }
};
