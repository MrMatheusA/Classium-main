import { supabase } from '../lib/supabase';
import { RealtimeService } from './RealtimeService';
import { resolveOrgId, NO_SCHOOL_ERROR, friendlyDbError, isUuid as isUuidBase, todayLocalISO } from './tenant';

export interface TransportVehicleData {
  id: string;
  numero: string;
  tipo: 'Ônibus' | 'Van' | 'Micro-ônibus' | string;
  placa: string;
  capacidade: number;
  rota: string;
  routeId?: string;
  neighborhoodsServed?: string[];
  turno: '1º Turno' | '2º Turno' | '3º Turno' | 'Educação Infantil' | 'EJA' | string;
  driverName: string;
  driverPhone: string;
  driverCnh: string;
  monitorName: string;
  monitorPhone: string;
  observacoes: string;
  status: string;
  studentsIds: string[];
  occupiedCount: number;
  freeSpots: number;
  year?: number;
}

export interface TransportStudentData {
  id: string;
  name: string;
  grade: string;
  classId: string;
  className?: string;
  shift: string;
  schoolUnit: string;
  matricula: string;
  parentName: string;
  parentPhone: string;
  address: string;
  neighborhood?: string;
  status: 'Vinculado' | 'Aguardando Vinculação' | string;
  vehicleId: string | null;
  routeId?: string | null;
  matchType?: 'automatico_endereco' | 'manual' | string;
  boardingStatus?: 'Embarcado' | 'Aguardando' | 'Ausente' | string;
  pickupPoint?: string;
  notes?: string;
  linkedAt?: string;
}

export interface TransportStatsData {
  totalVehicles: number;
  totalCapacity: number;
  totalLinked: number;
  totalUnlinked: number;
  globalOccupancy: number;
}

export interface SaveTransportVehicleInput {
  id?: string;
  numero: string;
  tipo: 'Ônibus' | 'Van' | 'Micro-ônibus' | string;
  placa: string;
  capacidade: number;
  rota: string;
  routeId?: string;
  neighborhoodsServed?: string[];
  turno: '1º Turno' | '2º Turno' | '3º Turno' | 'Educação Infantil' | 'EJA' | string;
  driverName: string;
  driverPhone?: string;
  driverCnh?: string;
  monitorName?: string;
  monitorPhone?: string;
  observacoes?: string;
  organizationId?: string;
  schoolId?: string;
  status?: string;
  year?: number;
}

type OpResult = { success: boolean; error: string | null };

export function isUuid(id: string | null | undefined): boolean {
  return isUuidBase(id);
}

/** Devolve o id só se for válido. Nunca devolve uma escola padrão inventada. */
export function getResolvedOrganizationId(providedOrgId?: string): string {
  return isUuidBase(providedOrgId) ? providedOrgId : '';
}

const EMPTY_STATS: TransportStatsData = {
  totalVehicles: 0,
  totalCapacity: 0,
  totalLinked: 0,
  totalUnlinked: 0,
  globalOccupancy: 0,
};

/** "Ônibus 01" → { tipo: 'Ônibus', numero: '01' } */
function parseVehicleModel(modelStr?: string | null): { tipo: string; numero: string } {
  const trimmed = (modelStr || '').trim();
  if (!trimmed) return { tipo: 'Ônibus', numero: '' };
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('van')) return { tipo: 'Van', numero: trimmed.replace(/van/i, '').replace(/escolar/i, '').trim() };
  if (lower.startsWith('micro')) return { tipo: 'Micro-ônibus', numero: trimmed.replace(/micro-ônibus|micro-onibus|micro/i, '').trim() };
  if (lower.startsWith('ônibus') || lower.startsWith('onibus')) return { tipo: 'Ônibus', numero: trimmed.replace(/ônibus|onibus/i, '').trim() };
  return { tipo: 'Ônibus', numero: trimmed };
}

function notify(detail: Record<string, any>) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('classium_transport_updated', { detail }));
  }
}

async function countLinked(vehicleId: string, exceptStudentId?: string): Promise<number> {
  let q = supabase
    .from('transport_agreements')
    .select('id', { count: 'exact', head: true })
    .eq('vehicle_id', vehicleId)
    .eq('status', 'vinculado');
  if (exceptStudentId) q = q.neq('student_id', exceptStudentId);
  const { count, error } = await q;
  if (error) throw new Error(friendlyDbError(error.message, 'Não foi possível conferir as vagas do veículo.'));
  return count || 0;
}

/**
 * Veículos, estudantes que usam transporte e números gerais da escola.
 * Sem veículos cadastrados, a lista vem vazia (não há mais veículos de exemplo).
 */
export async function fetchOrganizationTransportData(
  organizationId?: string,
  shift?: string,
  _search?: string
): Promise<{ vehicles: TransportVehicleData[]; students: TransportStudentData[]; stats: TransportStatsData; error: string | null }> {
  try {
    const orgId = await resolveOrgId(organizationId);
    if (!orgId) return { vehicles: [], students: [], stats: EMPTY_STATS, error: NO_SCHOOL_ERROR };

    let vehQuery = supabase
      .from('transport_vehicles')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true });
    if (shift && shift !== 'Todos') vehQuery = vehQuery.eq('shift', shift);

    const [vehRes, agrRes, linkRes, studRes, classRes, guardRes] = await Promise.all([
      vehQuery,
      supabase.from('transport_agreements').select('*').eq('organization_id', orgId),
      supabase.from('transport_students').select('*').eq('organization_id', orgId),
      supabase.from('students').select('*').eq('organization_id', orgId).order('full_name', { ascending: true }),
      supabase.from('classes').select('id, name, grade, shift').eq('organization_id', orgId),
      supabase
        .from('student_responsible_links')
        .select('student_id, is_primary_contact, guardians ( full_name, name, phone )')
        .eq('organization_id', orgId),
    ]);

    const firstError = vehRes.error || agrRes.error || studRes.error;
    if (firstError) {
      return {
        vehicles: [],
        students: [],
        stats: EMPTY_STATS,
        error: friendlyDbError(firstError.message, 'Não foi possível carregar o transporte.'),
      };
    }

    const agreements = new Map<string, any>();
    (agrRes.data || []).forEach((a: any) => a.student_id && agreements.set(a.student_id, a));

    const links = new Map<string, any>();
    (linkRes.data || []).forEach((l: any) => l.student_id && links.set(l.student_id, l));

    const classMap = new Map<string, any>();
    (classRes.data || []).forEach((c: any) => classMap.set(c.id, c));

    const guardianMap = new Map<string, { name: string; phone: string }>();
    (guardRes.data || [])
      .sort((a: any, b: any) => Number(b.is_primary_contact) - Number(a.is_primary_contact))
      .forEach((l: any) => {
        if (!l.student_id || guardianMap.has(l.student_id)) return;
        const g = Array.isArray(l.guardians) ? l.guardians[0] : l.guardians;
        if (g) guardianMap.set(l.student_id, { name: g.full_name || g.name || '', phone: g.phone || '' });
      });

    const occupants = new Map<string, string[]>();

    const students: TransportStudentData[] = (studRes.data || [])
      .filter((s: any) => {
        const agr = agreements.get(s.id);
        const hasAgreement = agr && agr.status !== 'cancelado';
        return Boolean(s.uses_transport || s.uses_school_transport || s.transport_required || hasAgreement);
      })
      .map((s: any) => {
        const agr = agreements.get(s.id);
        const link = links.get(s.id);
        const cls = s.class_id ? classMap.get(s.class_id) : null;
        const guardian = guardianMap.get(s.id);

        const linkedVehicleId: string | null = agr?.status === 'vinculado' && agr.vehicle_id ? agr.vehicle_id : null;
        if (linkedVehicleId) {
          const list = occupants.get(linkedVehicleId) || [];
          list.push(s.id);
          occupants.set(linkedVehicleId, list);
        }

        const neighborhood = s.address_neighborhood || s.neighborhood || '';
        const street = [s.address_street, s.address_number].filter(Boolean).join(', ');
        const address = [street, neighborhood, s.address_city].filter(Boolean).join(' · ');

        return {
          id: s.id,
          name: s.full_name || s.name || 'Estudante sem nome',
          grade: cls?.grade || s.grade || '',
          classId: s.class_id || '',
          className: cls?.name || s.class_name || '',
          shift: cls?.shift || s.shift || '',
          schoolUnit: '',
          matricula: s.registration_code || '',
          parentName: guardian?.name || s.guardian_name || '',
          parentPhone: guardian?.phone || s.guardian_phone || '',
          address,
          neighborhood,
          status: linkedVehicleId ? 'Vinculado' : 'Aguardando Vinculação',
          vehicleId: linkedVehicleId,
          routeId: agr?.route_id || null,
          matchType: agr?.match_type || undefined,
          boardingStatus: link?.boarding_status || 'Aguardando',
          pickupPoint: agr?.pickup_point || link?.pickup_point || '',
          notes: link?.notes || undefined,
          linkedAt: agr?.linked_at || undefined,
        };
      });

    const vehicles: TransportVehicleData[] = (vehRes.data || []).map((v: any) => {
      const parsed = parseVehicleModel(v.model);
      const ids = occupants.get(v.id) || [];
      const cap = Number(v.capacity) || 0;
      return {
        id: v.id,
        numero: parsed.numero || v.route_code || '',
        tipo: parsed.tipo,
        placa: v.plate || '',
        capacidade: cap,
        rota: v.route_name || '',
        routeId: v.route_id || undefined,
        neighborhoodsServed: Array.isArray(v.neighborhoods_served) ? v.neighborhoods_served : [],
        turno: v.shift || '',
        driverName: v.driver_name || '',
        driverPhone: v.driver_phone || '',
        driverCnh: v.driver_cnh || '',
        monitorName: v.monitor_name || '',
        monitorPhone: v.monitor_phone || '',
        observacoes: v.metadata?.observacoes || '',
        status: v.status || 'Ativo',
        year: v.year || undefined,
        studentsIds: ids,
        occupiedCount: ids.length,
        freeSpots: Math.max(0, cap - ids.length),
      };
    });

    const totalCapacity = vehicles.reduce((acc, v) => acc + (v.capacidade || 0), 0);
    const totalLinked = students.filter(s => s.status === 'Vinculado').length;

    return {
      vehicles,
      students,
      stats: {
        totalVehicles: vehicles.length,
        totalCapacity,
        totalLinked,
        totalUnlinked: students.length - totalLinked,
        globalOccupancy: totalCapacity > 0 ? Math.round((totalLinked / totalCapacity) * 100) : 0,
      },
      error: null,
    };
  } catch (err: any) {
    console.error('[TransportRpcService] fetchOrganizationTransportData:', err);
    return { vehicles: [], students: [], stats: EMPTY_STATS, error: friendlyDbError(err?.message, 'Não foi possível carregar o transporte.') };
  }
}

export async function saveTransportVehicle(
  input: SaveTransportVehicleInput
): Promise<{ success: boolean; vehicleId?: string; error: string | null }> {
  try {
    const orgId = await resolveOrgId(input.organizationId || input.schoolId);
    if (!orgId) return { success: false, error: NO_SCHOOL_ERROR };

    const capacity = Number(input.capacidade);
    if (!Number.isFinite(capacity) || capacity <= 0) {
      return { success: false, error: 'Informe a capacidade do veículo.' };
    }
    if (!input.placa?.trim()) return { success: false, error: 'Informe a placa do veículo.' };
    if (!input.driverName?.trim()) return { success: false, error: 'Informe o nome do motorista.' };

    const numero = (input.numero || '').replace(input.tipo || '', '').trim();
    const model = [input.tipo || 'Ônibus', numero].filter(Boolean).join(' ');

    const payload: Record<string, any> = {
      organization_id: orgId,
      school_id: isUuidBase(input.schoolId) ? input.schoolId : orgId,
      route_name: input.rota?.trim() || null,
      route_code: numero || null,
      route_id: isUuidBase(input.routeId) ? input.routeId : null,
      plate: input.placa.trim().toUpperCase(),
      model,
      year: input.year || null,
      driver_name: input.driverName.trim(),
      driver_phone: input.driverPhone?.trim() || null,
      driver_cnh: input.driverCnh?.trim() || null,
      monitor_name: input.monitorName?.trim() || null,
      monitor_phone: input.monitorPhone?.trim() || null,
      capacity,
      status: input.status || 'Ativo',
      shift: input.turno || null,
      neighborhoods_served: (input.neighborhoodsServed || []).map(n => n.trim()).filter(Boolean),
      metadata: { observacoes: input.observacoes?.trim() || '' },
    };

    if (isUuidBase(input.id)) {
      const occupied = await countLinked(input.id);
      if (capacity < occupied) {
        return { success: false, error: `Este veículo já tem ${occupied} estudante(s). A capacidade não pode ser menor que isso.` };
      }
      const { data, error } = await supabase.from('transport_vehicles').update(payload).eq('id', input.id).select('id');
      if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível salvar o veículo.') };
      if (!data || data.length === 0) return { success: false, error: 'Veículo não encontrado ou sem permissão.' };
      notify({ action: 'update', vehicleId: input.id });
      return { success: true, vehicleId: input.id, error: null };
    }

    const { data, error } = await supabase.from('transport_vehicles').insert([payload]).select('id').single();
    if (error || !data) return { success: false, error: friendlyDbError(error?.message, 'Não foi possível cadastrar o veículo.') };
    notify({ action: 'insert', vehicleId: data.id });
    return { success: true, vehicleId: data.id, error: null };
  } catch (err: any) {
    return { success: false, error: friendlyDbError(err?.message, 'Não foi possível salvar o veículo.') };
  }
}

export async function deleteTransportVehicle(vehicleId: string, _organizationId?: string): Promise<OpResult> {
  try {
    if (!isUuidBase(vehicleId)) return { success: false, error: 'Veículo inválido. Atualize a tela.' };

    const occupied = await countLinked(vehicleId);
    if (occupied > 0) {
      return {
        success: false,
        error: `Este veículo tem ${occupied} estudante(s) vinculado(s). Desvincule ou mude os estudantes de veículo antes de excluir.`,
      };
    }

    const { data, error } = await supabase.from('transport_vehicles').delete().eq('id', vehicleId).select('id');
    if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível excluir o veículo.') };
    if (!data || data.length === 0) return { success: false, error: 'Veículo não encontrado ou sem permissão.' };

    notify({ action: 'delete', vehicleId });
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: friendlyDbError(err?.message, 'Não foi possível excluir o veículo.') };
  }
}

/** Procura um veículo ativo, com vaga, que atenda o bairro do estudante */
export async function tryAutoLinkStudentTransport(
  studentId: string,
  neighborhood?: string,
  organizationId?: string
): Promise<{ linked: boolean; vehicleId?: string; vehicleName?: string; error?: string | null }> {
  try {
    const orgId = await resolveOrgId(organizationId);
    if (!orgId || !isUuidBase(studentId)) return { linked: false };

    const bairro = (neighborhood || '').toLowerCase().trim();
    if (!bairro) return { linked: false };

    const { data: vehicles, error } = await supabase
      .from('transport_vehicles')
      .select('id, model, route_name, capacity, neighborhoods_served')
      .eq('organization_id', orgId)
      .eq('status', 'Ativo');
    if (error || !vehicles) return { linked: false, error: error ? friendlyDbError(error.message) : null };

    for (const v of vehicles as any[]) {
      const served: string[] = Array.isArray(v.neighborhoods_served) ? v.neighborhoods_served : [];
      const matches = served.some(n => n.toLowerCase().trim() === bairro) || (v.route_name || '').toLowerCase().includes(bairro);
      if (!matches) continue;

      const occupied = await countLinked(v.id, studentId);
      if (occupied >= (Number(v.capacity) || 0)) continue;

      const res = await linkStudentToTransport(studentId, v.id, orgId, undefined, '', 'automatico_endereco');
      if (res.success) return { linked: true, vehicleId: v.id, vehicleName: v.model || v.route_name };
    }
    return { linked: false };
  } catch (err: any) {
    return { linked: false, error: friendlyDbError(err?.message) };
  }
}

export async function linkStudentToTransport(
  studentId: string,
  vehicleId: string,
  organizationId?: string,
  routeId?: string,
  pickupPoint = '',
  matchType: 'automatico_endereco' | 'manual' = 'manual'
): Promise<OpResult> {
  try {
    const orgId = await resolveOrgId(organizationId);
    if (!orgId) return { success: false, error: NO_SCHOOL_ERROR };
    if (!isUuidBase(studentId) || !isUuidBase(vehicleId)) {
      return { success: false, error: 'Estudante ou veículo inválido. Atualize a tela.' };
    }

    const { data: veh, error: vehErr } = await supabase
      .from('transport_vehicles')
      .select('capacity, status')
      .eq('id', vehicleId)
      .maybeSingle();
    if (vehErr) return { success: false, error: friendlyDbError(vehErr.message) };
    if (!veh) return { success: false, error: 'Veículo não encontrado.' };
    if (veh.status && veh.status !== 'Ativo') return { success: false, error: 'Este veículo não está ativo.' };

    const occupied = await countLinked(vehicleId, studentId);
    if (occupied >= (Number(veh.capacity) || 0)) {
      return { success: false, error: 'Veículo lotado. Todas as vagas já estão ocupadas.' };
    }

    const now = new Date().toISOString();
    const { error: agrErr } = await supabase.from('transport_agreements').upsert({
      organization_id: orgId,
      school_id: orgId,
      student_id: studentId,
      vehicle_id: vehicleId,
      route_id: isUuidBase(routeId) ? routeId : null,
      status: 'vinculado',
      match_type: matchType,
      pickup_point: pickupPoint.trim() || null,
      linked_at: now,
    }, { onConflict: 'student_id,school_id' });
    if (agrErr) return { success: false, error: friendlyDbError(agrErr.message, 'Não foi possível vincular o estudante.') };

    const { error: tsErr } = await supabase.from('transport_students').upsert({
      organization_id: orgId,
      school_id: orgId,
      student_id: studentId,
      vehicle_id: vehicleId,
      route_id: isUuidBase(routeId) ? routeId : null,
      status: 'Vinculado',
      pickup_point: pickupPoint.trim() || null,
      is_active: true,
    }, { onConflict: 'student_id' });
    if (tsErr) console.warn('[TransportRpcService] transport_students não atualizado:', tsErr.message);

    const { error: stErr } = await supabase
      .from('students')
      .update({ uses_transport: true, uses_school_transport: true })
      .eq('id', studentId);
    if (stErr) console.warn('[TransportRpcService] Marcação de transporte no estudante não salva:', stErr.message);

    notify({ action: 'link', studentId, vehicleId });
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: friendlyDbError(err?.message, 'Não foi possível vincular o estudante.') };
  }
}

export async function unlinkStudentFromTransport(studentId: string, _organizationId?: string): Promise<OpResult> {
  try {
    if (!isUuidBase(studentId)) return { success: false, error: 'Estudante inválido. Atualize a tela.' };

    const { data, error } = await supabase
      .from('transport_agreements')
      .update({ vehicle_id: null, route_id: null, status: 'aguardando_vinculacao', match_type: null, linked_at: null })
      .eq('student_id', studentId)
      .select('id');
    if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível desvincular.') };
    if (!data || data.length === 0) return { success: false, error: 'Este estudante não estava vinculado.' };

    const { error: tsErr } = await supabase
      .from('transport_students')
      .update({ vehicle_id: null, status: 'Aguardando Vinculação' })
      .eq('student_id', studentId);
    if (tsErr) console.warn('[TransportRpcService] transport_students não atualizado:', tsErr.message);

    notify({ action: 'unlink', studentId });
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: friendlyDbError(err?.message, 'Não foi possível desvincular.') };
  }
}

/** Liga ou desliga o uso de transporte do estudante */
export async function toggleStudentTransportDemand(
  studentId: string,
  enable: boolean,
  organizationId?: string,
  neighborhood?: string
): Promise<{ success: boolean; autoLinked?: boolean; vehicleName?: string; error: string | null }> {
  try {
    const orgId = await resolveOrgId(organizationId);
    if (!orgId) return { success: false, error: NO_SCHOOL_ERROR };
    if (!isUuidBase(studentId)) return { success: false, error: 'Estudante inválido. Atualize a tela.' };

    const { error: stErr } = await supabase
      .from('students')
      .update({ uses_transport: enable, uses_school_transport: enable })
      .eq('id', studentId);
    if (stErr) return { success: false, error: friendlyDbError(stErr.message) };

    if (enable) {
      // Pedido cancelado antes volta para a fila
      await supabase
        .from('transport_agreements')
        .update({ status: 'aguardando_vinculacao', requested_at: new Date().toISOString() })
        .eq('student_id', studentId)
        .eq('status', 'cancelado');

      const { error: agrErr } = await supabase.from('transport_agreements').upsert({
        organization_id: orgId,
        school_id: orgId,
        student_id: studentId,
        status: 'aguardando_vinculacao',
        requested_at: new Date().toISOString(),
      }, { onConflict: 'student_id,school_id', ignoreDuplicates: true });
      if (agrErr) return { success: false, error: friendlyDbError(agrErr.message) };

      const auto = await tryAutoLinkStudentTransport(studentId, neighborhood, orgId);
      notify({ action: 'enable', studentId });
      return { success: true, autoLinked: auto.linked, vehicleName: auto.vehicleName, error: null };
    }

    const { error: cancelErr } = await supabase
      .from('transport_agreements')
      .update({ status: 'cancelado', vehicle_id: null, route_id: null, linked_at: null })
      .eq('student_id', studentId);
    if (cancelErr) return { success: false, error: friendlyDbError(cancelErr.message) };

    await supabase.from('transport_students').delete().eq('student_id', studentId);
    notify({ action: 'disable', studentId });
    return { success: true, autoLinked: false, error: null };
  } catch (err: any) {
    return { success: false, error: friendlyDbError(err?.message, 'Não foi possível alterar o transporte.') };
  }
}

/** Marca embarque, espera ou falta e grava no histórico do dia */
export async function updateStudentBoardingStatus(
  studentId: string,
  status: 'Embarcado' | 'Aguardando' | 'Ausente',
  organizationId?: string
): Promise<OpResult> {
  try {
    const orgId = await resolveOrgId(organizationId);
    if (!orgId) return { success: false, error: NO_SCHOOL_ERROR };
    if (!isUuidBase(studentId)) return { success: false, error: 'Estudante inválido. Atualize a tela.' };

    const now = new Date().toISOString();
    const { data: link, error: upErr } = await supabase
      .from('transport_students')
      .update({ boarding_status: status, last_boarding_at: now })
      .eq('student_id', studentId)
      .select('vehicle_id')
      .maybeSingle();
    if (upErr) return { success: false, error: friendlyDbError(upErr.message) };

    const { error: logErr } = await supabase.from('transport_boarding_logs').insert([{
      organization_id: orgId,
      school_id: orgId,
      student_id: studentId,
      vehicle_id: link?.vehicle_id || null,
      date: todayLocalISO(),
      event_type: status === 'Embarcado' ? 'boarded' : status === 'Ausente' ? 'absent' : 'waiting',
      recorded_at: now,
    }]);
    if (logErr) return { success: false, error: friendlyDbError(logErr.message, 'O embarque não foi registrado.') };

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: friendlyDbError(err?.message, 'Não foi possível registrar o embarque.') };
  }
}

export function subscribeToTransportChanges(onUpdate: () => void, organizationId?: string): () => void {
  const realtime = RealtimeService.getInstance();
  const filter = isUuidBase(organizationId) ? `organization_id=eq.${organizationId}` : undefined;
  const key = organizationId || 'escola';

  const unsubs = [
    realtime.subscribe(`transport_vehicles_${key}`, { table: 'transport_vehicles', filter }, () => onUpdate()),
    realtime.subscribe(`transport_agreements_${key}`, { table: 'transport_agreements', filter }, () => onUpdate()),
    realtime.subscribe(`transport_students_${key}`, { table: 'transport_students', filter }, () => onUpdate()),
    realtime.subscribe(`transport_logs_${key}`, { table: 'transport_boarding_logs', filter }, () => onUpdate()),
  ];

  const handleLocal = () => onUpdate();
  if (typeof window !== 'undefined') window.addEventListener('classium_transport_updated', handleLocal);

  return () => {
    unsubs.forEach(u => u());
    if (typeof window !== 'undefined') window.removeEventListener('classium_transport_updated', handleLocal);
  };
}