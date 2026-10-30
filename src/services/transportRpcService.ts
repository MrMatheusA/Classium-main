import { supabase } from '../lib/supabase';
import { RealtimeService } from './RealtimeService';

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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(id: string | null | undefined): boolean {
  if (!id) return false;
  return UUID_REGEX.test(id);
}

export const DEFAULT_TRANSPORT_ORG_ID = '11111111-1111-1111-1111-111111111111';

export function getResolvedOrganizationId(providedOrgId?: string): string {
  if (providedOrgId && isUuid(providedOrgId)) {
    return providedOrgId;
  }
  return DEFAULT_TRANSPORT_ORG_ID;
}

/**
 * Helper to decompose model column (e.g. "Ônibus 01" -> tipo: "Ônibus", numero: "01")
 */
function parseVehicleModel(modelStr?: string | null): { tipo: string; numero: string } {
  if (!modelStr) return { tipo: 'Ônibus', numero: '01' };
  const trimmed = modelStr.trim();
  if (trimmed.toLowerCase().startsWith('van')) {
    const num = trimmed.replace(/van/i, '').replace(/escolar/i, '').trim();
    return { tipo: 'Van', numero: num || '01' };
  }
  if (trimmed.toLowerCase().startsWith('micro')) {
    const num = trimmed.replace(/micro-ônibus/i, '').replace(/micro/i, '').trim();
    return { tipo: 'Micro-ônibus', numero: num || '01' };
  }
  if (trimmed.toLowerCase().startsWith('ônibus') || trimmed.toLowerCase().startsWith('onibus')) {
    const num = trimmed.replace(/ônibus/i, '').replace(/onibus/i, '').trim();
    return { tipo: 'Ônibus', numero: num || '01' };
  }
  return { tipo: 'Ônibus', numero: trimmed };
}

/**
 * Fallback seed vehicles if table is empty in new environments
 */
const DEFAULT_FALLBACK_VEHICLES: TransportVehicleData[] = [
  {
    id: 'veh-001',
    numero: '01',
    tipo: 'Ônibus',
    placa: 'KJB-1892',
    capacidade: 48,
    rota: 'Rota Norte 1 (Centro / Bessa)',
    neighborhoodsServed: ['Centro', 'Bessa', 'Manaira', 'Aeroclube'],
    turno: '1º Turno',
    driverName: 'Seu Jorge da Silva',
    driverPhone: '(83) 98844-3322',
    driverCnh: '88492019382',
    monitorName: 'Tia Júlia Santos',
    monitorPhone: '(83) 99911-2233',
    observacoes: 'Ar-condicionado e rampa de acessibilidade.',
    status: 'Ativo',
    studentsIds: [],
    occupiedCount: 0,
    freeSpots: 48,
    year: 2026
  },
  {
    id: 'veh-002',
    numero: '01A',
    tipo: 'Ônibus',
    placa: 'ABC-5810',
    capacidade: 43,
    rota: 'Rota Conjunto Habitacional',
    neighborhoodsServed: ['Conjunto Habitacional', 'Mangabeira', 'Valentina'],
    turno: '1º Turno',
    driverName: 'Antônio Carlos',
    driverPhone: '(31) 9111-2345',
    driverCnh: '12345678902',
    monitorName: 'Liliane Santos',
    monitorPhone: '(31) 98765-4321',
    observacoes: '',
    status: 'Ativo',
    studentsIds: [],
    occupiedCount: 0,
    freeSpots: 43,
    year: 2026
  },
  {
    id: 'veh-003',
    numero: '01',
    tipo: 'Ônibus',
    placa: 'QFX-8911',
    capacidade: 48,
    rota: 'Rota Norte 1 (Centro / Bessa)',
    neighborhoodsServed: ['Centro', 'Bessa', 'Intermares'],
    turno: '1º Turno',
    driverName: 'Enoque Jorge da Silva',
    driverPhone: '(83) 98844-1122',
    driverCnh: '12345678901',
    monitorName: 'Tia Júlia Santos',
    monitorPhone: '(83) 99922-2211',
    observacoes: '',
    status: 'Ativo',
    studentsIds: [],
    occupiedCount: 0,
    freeSpots: 48,
    year: 2026
  },
  {
    id: 'veh-004',
    numero: '02',
    tipo: 'Ônibus',
    placa: 'ELI-2022',
    capacidade: 43,
    rota: 'Rota Conjunto Residencial',
    neighborhoodsServed: ['Conjunto Residencial', 'Bancários', 'Castelo Branco'],
    turno: '1º Turno',
    driverName: 'Antônio Carlos Santos',
    driverPhone: '(83) 98811-2505',
    driverCnh: '98765432102',
    monitorName: 'Liliane Bastos',
    monitorPhone: '(83) 98745-4321',
    observacoes: '',
    status: 'Ativo',
    studentsIds: [],
    occupiedCount: 0,
    freeSpots: 43,
    year: 2026
  }
];

/**
 * Fetch all transport vehicles, agreements, routes and students from Supabase
 */
export async function fetchOrganizationTransportData(
  organizationId?: string,
  shift?: string,
  _search?: string
): Promise<{
  vehicles: TransportVehicleData[];
  students: TransportStudentData[];
  stats: TransportStatsData;
  error: string | null;
}> {
  try {
    const resolvedOrgId = getResolvedOrganizationId(organizationId);

    // 1. Query transport_vehicles
    let vehQuery = supabase
      .from('transport_vehicles')
      .select('*')
      .order('created_at', { ascending: true });

    if (resolvedOrgId) {
      vehQuery = vehQuery.or(`organization_id.eq.${resolvedOrgId},school_id.eq.${resolvedOrgId}`);
    }
    if (shift && shift !== 'Todos') {
      vehQuery = vehQuery.eq('shift', shift);
    }

    const { data: rawVehicles, error: vehErr } = await vehQuery;
    if (vehErr) {
      console.warn('[TransportRpcService] Warning querying transport_vehicles:', vehErr.message);
    }

    // 2. Query transport_agreements (primary table)
    let agreementsMap = new Map<string, any>();
    try {
      let agrQuery = supabase.from('transport_agreements').select('*');
      if (resolvedOrgId) {
        agrQuery = agrQuery.eq('school_id', resolvedOrgId);
      }
      const { data: rawAgreements, error: agrErr } = await agrQuery;
      if (!agrErr && rawAgreements) {
        rawAgreements.forEach((agr: any) => {
          if (agr.student_id) {
            agreementsMap.set(agr.student_id, agr);
          }
        });
      }
    } catch (e) {
      console.warn('[TransportRpcService] transport_agreements table not available yet:', e);
    }

    // 3. Query transport_students (fallback/mirror link table)
    let linksMap = new Map<string, any>();
    try {
      let linkQuery = supabase.from('transport_students').select('*');
      if (resolvedOrgId) {
        linkQuery = linkQuery.or(`organization_id.eq.${resolvedOrgId},school_id.eq.${resolvedOrgId}`);
      }
      const { data: rawLinks, error: linkErr } = await linkQuery;
      if (!linkErr && rawLinks) {
        rawLinks.forEach((link: any) => {
          if (link.student_id) {
            linksMap.set(link.student_id, link);
          }
        });
      }
    } catch (e) {
      console.warn('[TransportRpcService] transport_students query notice:', e);
    }

    // 4. Query transport_routes
    let routesMap = new Map<string, any>();
    try {
      const { data: rawRoutes } = await supabase.from('transport_routes').select('*');
      (rawRoutes || []).forEach((r: any) => {
        if (r.id) routesMap.set(r.id, r);
        if (r.name) routesMap.set(r.name.toLowerCase().trim(), r);
      });
    } catch (e) {
      console.warn('[TransportRpcService] transport_routes notice:', e);
    }

    // 5. Query students with transport demand
    let studQuery = supabase
      .from('students')
      .select('*')
      .order('name', { ascending: true });

    if (resolvedOrgId) {
      studQuery = studQuery.or(`organization_id.eq.${resolvedOrgId},school_id.eq.${resolvedOrgId}`);
    }

    const { data: rawStudents, error: studErr } = await studQuery;
    if (studErr) {
      console.warn('[TransportRpcService] Error querying students table:', studErr.message);
    }

    // 6. Query classes for readable grade/turma labels
    const { data: rawClasses } = await supabase.from('classes').select('id, name, grade, shift');
    const classMap = new Map<string, { id: string; name: string; grade: string; shift?: string }>();
    (rawClasses || []).forEach((c: any) => {
      classMap.set(c.id, c);
    });

    // Map eligible students (uses_transport, uses_school_transport, transport_required, or has active agreement/link)
    const eligibleStudents = (rawStudents || []).filter((s: any) => {
      const agr = agreementsMap.get(s.id);
      const link = linksMap.get(s.id);
      const hasAgreement = agr && agr.status !== 'cancelado';
      const hasLink = link && link.is_active !== false;
      const flagsActive = Boolean(s.uses_transport || s.uses_school_transport || s.transport_required);
      return flagsActive || hasAgreement || hasLink;
    });

    const vehicleOccupantsMap = new Map<string, string[]>();

    const transportStudentsList: TransportStudentData[] = eligibleStudents.map((s: any) => {
      const agr = agreementsMap.get(s.id);
      const link = linksMap.get(s.id);
      const cls = s.class_id ? classMap.get(s.class_id) : null;

      // Status determination:
      // Status is 'Vinculado' if agreement.status === 'vinculado' OR if there is an active vehicle_id
      const linkedVehicleId = agr?.vehicle_id || (agr?.status === 'vinculado' ? agr?.vehicle_id : null) || (link?.vehicle_id && link?.is_active !== false ? link.vehicle_id : null);
      const isLinked = Boolean(linkedVehicleId && (agr?.status === 'vinculado' || !agr));

      const status: 'Vinculado' | 'Aguardando Vinculação' = isLinked ? 'Vinculado' : 'Aguardando Vinculação';

      if (isLinked && linkedVehicleId) {
        const list = vehicleOccupantsMap.get(linkedVehicleId) || [];
        list.push(s.id);
        vehicleOccupantsMap.set(linkedVehicleId, list);
      }

      const neighborhood = s.neighborhood || s.address_neighborhood || '';
      const street = s.address_street || s.address || s.street || '';
      const city = s.address_city || s.city || '';
      const addressParts = [street, neighborhood, city].filter(Boolean);
      const addressFormatted = addressParts.length > 0 ? addressParts.join(', ') : 'Endereço não informado';

      return {
        id: s.id,
        name: s.full_name || s.name || 'Estudante',
        grade: cls?.grade || s.grade || 'Ensino Fundamental',
        classId: s.class_id || '',
        className: cls?.name || s.class_name || 'Sem Turma',
        shift: cls?.shift || s.shift || '1º Turno',
        schoolUnit: 'Unidade Sede',
        matricula: s.registration_code || s.matricula || s.code || s.id.substring(0, 8),
        parentName: s.guardian_name || 'Responsável Legal',
        parentPhone: s.guardian_phone || '(83) 98888-0000',
        address: addressFormatted,
        neighborhood: neighborhood,
        status: status,
        vehicleId: isLinked ? linkedVehicleId : null,
        routeId: agr?.route_id || link?.route_id || null,
        matchType: agr?.match_type || 'manual',
        boardingStatus: link?.boarding_status || 'Aguardando',
        pickupPoint: link?.pickup_point || agr?.pickup_point || s.transport_route || 'Portaria Principal',
        linkedAt: agr?.linked_at || link?.created_at
      };
    });

    // Map vehicles
    let vehicles: TransportVehicleData[] = [];
    if (rawVehicles && rawVehicles.length > 0) {
      vehicles = rawVehicles.map((v: any) => {
        const parsed = parseVehicleModel(v.model);
        const occupants = vehicleOccupantsMap.get(v.id) || [];
        const cap = Number(v.capacity) || 40;
        const occupied = occupants.length;

        return {
          id: v.id,
          numero: parsed.numero || v.route_code || '01',
          tipo: parsed.tipo || 'Ônibus',
          placa: v.plate || 'N/A',
          capacidade: cap,
          rota: v.route_name || 'Rota Principal',
          routeId: v.route_id || undefined,
          neighborhoodsServed: v.neighborhoods_served || ['Centro', 'Bessa'],
          turno: v.shift || '1º Turno',
          driverName: v.driver_name || 'Motorista Não Atribuído',
          driverPhone: v.driver_phone || '',
          driverCnh: v.driver_cnh || '',
          monitorName: v.monitor_name || '',
          monitorPhone: v.monitor_phone || '',
          observacoes: v.metadata?.observacoes || '',
          status: v.status || 'Ativo',
          year: v.year || new Date().getFullYear(),
          studentsIds: occupants,
          occupiedCount: occupied,
          freeSpots: Math.max(0, cap - occupied)
        };
      });
    } else {
      // Use standard default vehicles with populated occupants if any
      vehicles = DEFAULT_FALLBACK_VEHICLES.map(v => {
        const occupants = vehicleOccupantsMap.get(v.id) || [];
        const cap = v.capacidade;
        const occupied = occupants.length;
        return {
          ...v,
          studentsIds: occupants,
          occupiedCount: occupied,
          freeSpots: Math.max(0, cap - occupied)
        };
      });
    }

    // Calculate aggregated metrics
    const totalVehicles = vehicles.length;
    const totalCapacity = vehicles.reduce((acc, v) => acc + (v.capacidade || 0), 0);
    const totalLinked = transportStudentsList.filter(s => s.status === 'Vinculado').length;
    const totalUnlinked = transportStudentsList.filter(s => s.status === 'Aguardando Vinculação').length;
    const globalOccupancy = totalCapacity > 0 ? Math.round((totalLinked / totalCapacity) * 100) : 0;

    const stats: TransportStatsData = {
      totalVehicles,
      totalCapacity,
      totalLinked,
      totalUnlinked,
      globalOccupancy
    };

    return {
      vehicles,
      students: transportStudentsList,
      stats,
      error: null
    };
  } catch (err: any) {
    console.error('[TransportRpcService] fetchOrganizationTransportData error:', err);
    return {
      vehicles: DEFAULT_FALLBACK_VEHICLES,
      students: [],
      stats: { totalVehicles: 4, totalCapacity: 182, totalLinked: 0, totalUnlinked: 0, globalOccupancy: 0 },
      error: err.message || 'Erro ao carregar dados de transporte.'
    };
  }
}

/**
 * Save or update a transport vehicle in Supabase public.transport_vehicles
 */
export async function saveTransportVehicle(
  input: SaveTransportVehicleInput
): Promise<{ success: boolean; vehicleId?: string; error: string | null }> {
  try {
    const orgId = getResolvedOrganizationId(input.organizationId || input.schoolId);
    const validVehId = input.id && isUuid(input.id) ? input.id : null;

    const modelFormatted = input.numero 
      ? (input.tipo ? `${input.tipo} ${input.numero.replace(input.tipo, '').trim()}` : input.numero)
      : (input.tipo || 'Ônibus 01');

    const payload: any = {
      school_id: orgId,
      organization_id: orgId,
      route_name: (input.rota || 'Rota Principal').trim(),
      plate: (input.placa || '').trim().toUpperCase(),
      model: modelFormatted,
      year: input.year || new Date().getFullYear(),
      driver_name: (input.driverName || 'Motorista').trim(),
      driver_phone: input.driverPhone ? input.driverPhone.trim() : null,
      driver_cnh: input.driverCnh ? input.driverCnh.trim() : null,
      monitor_name: input.monitorName ? input.monitorName.trim() : null,
      monitor_phone: input.monitorPhone ? input.monitorPhone.trim() : null,
      capacity: Number(input.capacidade) || 40,
      status: input.status || 'Ativo',
      shift: input.turno || '1º Turno',
      updated_at: new Date().toISOString()
    };

    if (validVehId) {
      const { error: updErr } = await supabase
        .from('transport_vehicles')
        .update(payload)
        .eq('id', validVehId);

      if (updErr) {
        console.error('[TransportRpcService] Error updating transport_vehicle:', updErr);
        return { success: false, error: updErr.message };
      }
      return { success: true, vehicleId: validVehId, error: null };
    } else {
      const { data: insData, error: insErr } = await supabase
        .from('transport_vehicles')
        .insert([payload])
        .select('id')
        .single();

      if (insErr) {
        console.error('[TransportRpcService] Error inserting transport_vehicle:', insErr);
        return { success: false, error: insErr.message };
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('classium_transport_updated', { detail: { action: 'insert', vehicleId: insData?.id } }));
      }
      return { success: true, vehicleId: insData?.id, error: null };
    }
  } catch (err: any) {
    console.error('[TransportRpcService] saveTransportVehicle error:', err);
    return { success: false, error: err.message || 'Erro ao salvar veículo de transporte.' };
  }
}

/**
 * Delete a transport vehicle with safety validation (cannot delete if it has active students)
 */
export async function deleteTransportVehicle(
  vehicleId: string,
  _organizationId?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const validVehId = isUuid(vehicleId) ? vehicleId : null;
    if (!validVehId) {
      return { success: true, error: null };
    }

    // 1. Check if vehicle has active linked agreements or students
    let countActive = 0;
    try {
      const { count: agrCount } = await supabase
        .from('transport_agreements')
        .select('*', { count: 'exact', head: true })
        .eq('vehicle_id', validVehId)
        .eq('status', 'vinculado');

      if (agrCount && agrCount > 0) countActive += agrCount;
    } catch (e) {
      // ignore
    }

    try {
      const { count: studCount } = await supabase
        .from('transport_students')
        .select('*', { count: 'exact', head: true })
        .eq('vehicle_id', validVehId)
        .eq('is_active', true);

      if (studCount && studCount > 0) countActive = Math.max(countActive, studCount);
    } catch (e) {
      // ignore
    }

    if (countActive > 0) {
      return {
        success: false,
        error: `Não é possível excluir o veículo pois existem ${countActive} estudante(s) vinculado(s) a ele. Por favor, redistribua ou desvincule os passageiros antes de excluir.`
      };
    }

    // 2. Delete vehicle
    const { error: delErr } = await supabase
      .from('transport_vehicles')
      .delete()
      .eq('id', validVehId);

    if (delErr) {
      console.error('[TransportRpcService] Error deleting transport_vehicle:', delErr);
      return { success: false, error: delErr.message };
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('classium_transport_updated', { detail: { action: 'delete', vehicleId: validVehId } }));
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('[TransportRpcService] deleteTransportVehicle exception:', err);
    return { success: false, error: err.message || 'Erro ao excluir veículo.' };
  }
}

/**
 * Attempt automatic link of student by address/neighborhood to an available route/vehicle
 */
export async function tryAutoLinkStudentTransport(
  studentId: string,
  neighborhood?: string,
  organizationId?: string
): Promise<{ linked: boolean; vehicleId?: string; vehicleName?: string; error?: string | null }> {
  try {
    const orgId = getResolvedOrganizationId(organizationId);
    if (!isUuid(studentId)) return { linked: false };

    // Try executing database RPC if exists
    try {
      const { error: rpcErr } = await supabase.rpc('try_auto_link_transport', {
        p_student_id: studentId
      });
      if (!rpcErr) {
        // Check if agreement was linked
        const { data: agr } = await supabase
          .from('transport_agreements')
          .select('vehicle_id, status')
          .eq('student_id', studentId)
          .single();

        if (agr && agr.status === 'vinculado' && agr.vehicle_id) {
          return { linked: true, vehicleId: agr.vehicle_id };
        }
      }
    } catch (e) {
      console.warn('[TransportRpcService] RPC try_auto_link_transport failed, running client fallback:', e);
    }

    // Client-side fallback matching
    const b = (neighborhood || '').toLowerCase().trim();
    if (!b) return { linked: false };

    // Fetch vehicles of organization
    const { data: vehs } = await supabase
      .from('transport_vehicles')
      .select('*')
      .or(`organization_id.eq.${orgId},school_id.eq.${orgId}`)
      .eq('status', 'Ativo');

    if (!vehs || vehs.length === 0) return { linked: false };

    // Find vehicle whose route matches or serves the neighborhood and has free capacity
    for (const v of vehs) {
      const routeLower = (v.route_name || '').toLowerCase();
      const servesNeighborhood = routeLower.includes(b) || (v.neighborhoods_served && Array.isArray(v.neighborhoods_served) && v.neighborhoods_served.some((n: string) => n.toLowerCase().includes(b) || b.includes(n.toLowerCase())));

      if (servesNeighborhood) {
        // Check capacity
        const { count } = await supabase
          .from('transport_agreements')
          .select('*', { count: 'exact', head: true })
          .eq('vehicle_id', v.id)
          .eq('status', 'vinculado');

        const occupied = count || 0;
        if (occupied < (v.capacity || 40)) {
          // Link student to this vehicle
          await linkStudentToTransport(studentId, v.id, orgId, undefined, 'Portaria Principal', 'automatico_endereco');
          return { linked: true, vehicleId: v.id, vehicleName: v.model || v.route_name };
        }
      }
    }

    return { linked: false };
  } catch (err: any) {
    console.error('[TransportRpcService] tryAutoLinkStudentTransport error:', err);
    return { linked: false, error: err.message };
  }
}

/**
 * Link student to a transport vehicle in Supabase (updates transport_agreements and transport_students)
 */
export async function linkStudentToTransport(
  studentId: string,
  vehicleId: string,
  organizationId?: string,
  routeId?: string,
  pickupPoint: string = 'Portaria Principal',
  matchType: 'automatico_endereco' | 'manual' = 'manual'
): Promise<{ success: boolean; error: string | null }> {
  try {
    const orgId = getResolvedOrganizationId(organizationId);
    const validStudId = isUuid(studentId) ? studentId : null;
    const validVehId = isUuid(vehicleId) ? vehicleId : null;

    if (!validStudId || !validVehId) {
      return { success: true, error: null };
    }

    // 1. Capacity check
    const { data: veh } = await supabase
      .from('transport_vehicles')
      .select('capacity')
      .eq('id', validVehId)
      .single();

    let currentOccupied = 0;
    try {
      const { count } = await supabase
        .from('transport_agreements')
        .select('*', { count: 'exact', head: true })
        .eq('vehicle_id', validVehId)
        .eq('status', 'vinculado')
        .neq('student_id', validStudId);

      currentOccupied = count || 0;
    } catch (e) {
      // fallback
    }

    if (veh && veh.capacity && currentOccupied >= veh.capacity) {
      return { success: false, error: 'Veículo Lotado! A capacidade máxima de vagas deste veículo já foi atingida.' };
    }

    const nowIso = new Date().toISOString();

    // 2. Upsert in transport_agreements
    try {
      const { error: agrErr } = await supabase
        .from('transport_agreements')
        .upsert({
          school_id: orgId,
          student_id: validStudId,
          vehicle_id: validVehId,
          route_id: routeId || null,
          status: 'vinculado',
          match_type: matchType,
          linked_at: nowIso,
          updated_at: nowIso
        }, { onConflict: 'student_id, school_id' });

      if (agrErr) {
        console.warn('[TransportRpcService] Warning upserting transport_agreements:', agrErr.message);
      }
    } catch (e) {
      console.warn('[TransportRpcService] Error with transport_agreements table:', e);
    }

    // 3. Upsert in transport_students (for schema backwards-compatibility)
    try {
      const { data: existingLink } = await supabase
        .from('transport_students')
        .select('id')
        .eq('student_id', validStudId);

      if (existingLink && existingLink.length > 0) {
        await supabase
          .from('transport_students')
          .update({
            vehicle_id: validVehId,
            organization_id: orgId,
            school_id: orgId,
            route_id: routeId || null,
            status: 'Vinculado',
            pickup_point: pickupPoint,
            is_active: true,
            updated_at: nowIso
          })
          .eq('student_id', validStudId);
      } else {
        await supabase
          .from('transport_students')
          .insert([{
            school_id: orgId,
            organization_id: orgId,
            student_id: validStudId,
            vehicle_id: validVehId,
            route_id: routeId || null,
            status: 'Vinculado',
            pickup_point: pickupPoint,
            is_active: true,
            created_at: nowIso,
            updated_at: nowIso
          }]);
      }
    } catch (e) {
      console.warn('[TransportRpcService] Notice with transport_students table:', e);
    }

    // 4. Mark student as uses_transport and uses_school_transport
    try {
      await supabase
        .from('students')
        .update({
          uses_transport: true,
          uses_school_transport: true,
          updated_at: nowIso
        })
        .eq('id', validStudId);
    } catch (e) {
      console.warn('[TransportRpcService] Error updating students flags:', e);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('classium_transport_updated', { detail: { action: 'link', studentId: validStudId, vehicleId: validVehId } }));
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('[TransportRpcService] linkStudentToTransport exception:', err);
    return { success: false, error: err.message || 'Erro ao vincular estudante ao transporte.' };
  }
}

/**
 * Unlink student from transport vehicle (sets status to aguardando_vinculacao)
 */
export async function unlinkStudentFromTransport(
  studentId: string,
  organizationId?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const orgId = getResolvedOrganizationId(organizationId);
    const validStudId = isUuid(studentId) ? studentId : null;
    if (!validStudId) {
      return { success: true, error: null };
    }

    const nowIso = new Date().toISOString();

    // 1. Update transport_agreements to aguardando_vinculacao
    try {
      await supabase
        .from('transport_agreements')
        .update({
          vehicle_id: null,
          route_id: null,
          status: 'aguardando_vinculacao',
          match_type: null,
          linked_at: null,
          updated_at: nowIso
        })
        .eq('student_id', validStudId);
    } catch (e) {
      console.warn('[TransportRpcService] Error unlinking transport_agreements:', e);
    }

    // 2. Update transport_students
    try {
      await supabase
        .from('transport_students')
        .update({
          vehicle_id: null,
          status: 'Aguardando Vinculação',
          updated_at: nowIso
        })
        .eq('student_id', validStudId);
    } catch (e) {
      console.warn('[TransportRpcService] Error unlinking transport_students:', e);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('classium_transport_updated', { detail: { action: 'unlink', studentId: validStudId } }));
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('[TransportRpcService] unlinkStudentFromTransport exception:', err);
    return { success: false, error: err.message || 'Erro ao desvincular estudante.' };
  }
}

/**
 * Toggle student transport demand (activate or deactivate completely)
 */
export async function toggleStudentTransportDemand(
  studentId: string,
  enable: boolean,
  organizationId?: string,
  neighborhood?: string
): Promise<{ success: boolean; autoLinked?: boolean; vehicleName?: string; error: string | null }> {
  try {
    const orgId = getResolvedOrganizationId(organizationId);
    const validStudId = isUuid(studentId) ? studentId : null;
    if (!validStudId) {
      return { success: true, error: null };
    }

    const nowIso = new Date().toISOString();

    if (enable) {
      // 1. Enable in students table
      await supabase
        .from('students')
        .update({
          uses_transport: true,
          uses_school_transport: true,
          updated_at: nowIso
        })
        .eq('id', validStudId);

      // 2. Insert into transport_agreements
      try {
        await supabase
          .from('transport_agreements')
          .upsert({
            school_id: orgId,
            student_id: validStudId,
            status: 'aguardando_vinculacao',
            requested_at: nowIso,
            updated_at: nowIso
          }, { onConflict: 'student_id, school_id' });
      } catch (e) {
        console.warn('[TransportRpcService] transport_agreements upsert notice:', e);
      }

      // 3. Try automatic link by address
      const autoRes = await tryAutoLinkStudentTransport(validStudId, neighborhood, orgId);
      return {
        success: true,
        autoLinked: autoRes.linked,
        vehicleName: autoRes.vehicleName,
        error: null
      };
    } else {
      // Disable transport
      await supabase
        .from('students')
        .update({
          uses_transport: false,
          uses_school_transport: false,
          updated_at: nowIso
        })
        .eq('id', validStudId);

      try {
        await supabase
          .from('transport_agreements')
          .update({
            status: 'cancelado',
            vehicle_id: null,
            route_id: null,
            updated_at: nowIso
          })
          .eq('student_id', validStudId);
      } catch (e) {
        console.warn('[TransportRpcService] cancel transport_agreements notice:', e);
      }

      try {
        await supabase
          .from('transport_students')
          .delete()
          .eq('student_id', validStudId);
      } catch (e) {
        console.warn('[TransportRpcService] delete transport_students notice:', e);
      }

      return { success: true, autoLinked: false, error: null };
    }
  } catch (err: any) {
    console.error('[TransportRpcService] toggleStudentTransportDemand error:', err);
    return { success: false, error: err.message || 'Erro ao alterar transporte.' };
  }
}

/**
 * Update student boarding status and record boarding log
 */
export async function updateStudentBoardingStatus(
  studentId: string,
  status: 'Embarcado' | 'Aguardando' | 'Ausente',
  organizationId?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const orgId = getResolvedOrganizationId(organizationId);
    const validStudId = isUuid(studentId) ? studentId : null;
    if (!validStudId) {
      return { success: true, error: null };
    }

    const eventType = status === 'Embarcado' ? 'boarded' : status === 'Ausente' ? 'absent' : 'waiting';
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      await supabase
        .from('transport_students')
        .update({
          boarding_status: status,
          last_boarding_at: new Date().toISOString()
        })
        .eq('student_id', validStudId);
    } catch (e) {
      // ignore
    }

    const { error: logErr } = await supabase
      .from('transport_boarding_logs')
      .insert([{
        organization_id: orgId,
        school_id: orgId,
        student_id: validStudId,
        date: todayStr,
        event_type: eventType,
        recorded_at: new Date().toISOString()
      }]);

    if (logErr) {
      console.warn('[TransportRpcService] Error inserting boarding log:', logErr);
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('[TransportRpcService] updateStudentBoardingStatus exception:', err);
    return { success: false, error: err.message || 'Erro ao atualizar status de embarque.' };
  }
}

/**
 * Realtime channel subscription for all transport changes with multi-tenant filtering
 */
export function subscribeToTransportChanges(
  onUpdate: () => void,
  organizationId?: string
): () => void {
  const realtimeService = RealtimeService.getInstance();
  const filter = organizationId && isUuid(organizationId) ? `organization_id=eq.${organizationId}` : undefined;

  const unsubVehicles = realtimeService.subscribe(
    `transport_vehicles_${organizationId || 'global'}`,
    { table: 'transport_vehicles', filter },
    () => onUpdate()
  );

  const unsubAgreements = realtimeService.subscribe(
    `transport_agreements_${organizationId || 'global'}`,
    { table: 'transport_agreements' },
    () => onUpdate()
  );

  const unsubStudentsTransport = realtimeService.subscribe(
    `transport_students_${organizationId || 'global'}`,
    { table: 'transport_students', filter },
    () => onUpdate()
  );

  const unsubStudents = realtimeService.subscribe(
    `students_transport_${organizationId || 'global'}`,
    { table: 'students', filter },
    () => onUpdate()
  );

  const unsubLogs = realtimeService.subscribe(
    `transport_logs_${organizationId || 'global'}`,
    { table: 'transport_boarding_logs', filter },
    () => onUpdate()
  );

  const handleLocalSync = () => {
    onUpdate();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('classium_transport_updated', handleLocalSync);
  }

  return () => {
    unsubVehicles();
    unsubAgreements();
    unsubStudentsTransport();
    unsubStudents();
    unsubLogs();
    if (typeof window !== 'undefined') {
      window.removeEventListener('classium_transport_updated', handleLocalSync);
    }
  };
}
