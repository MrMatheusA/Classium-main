import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bus,
  Eye,
  FileSpreadsheet,
  GraduationCap,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { maskCellPhone, maskPlaca } from '../../utils/masks';
import { usePlatform } from '../../context/PlatformContext';
import {
  fetchOrganizationTransportData,
  saveTransportVehicle,
  deleteTransportVehicle as rpcDeleteTransportVehicle,
  linkStudentToTransport,
  unlinkStudentFromTransport,
  updateStudentBoardingStatus as rpcUpdateStudentBoardingStatus,
  subscribeToTransportChanges,
  TransportVehicleData,
  TransportStudentData,
} from '../../services/transportRpcService';
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Field, Modal, PillNav, Skeleton, Toast, cx, inputCls } from '../ui/kit';
import { ConfirmModal, InfoRow, MetricStrip, ModuleHeader, ProgressBar, RoundIconButton, Segmented } from '../ui/ModuleParts';

interface AdminTransporteProps {
  selectedUnit?: string;
}

type Turno = '1º Turno' | '2º Turno' | '3º Turno' | 'Educação Infantil' | 'EJA';
type Boarding = 'Embarcado' | 'Aguardando' | 'Ausente';

interface VehicleForm {
  numero: string;
  tipo: 'Ônibus' | 'Van' | 'Micro-ônibus';
  driverName: string;
  driverPhone: string;
  driverCnh: string;
  monitorName: string;
  monitorPhone: string;
  placa: string;
  rota: string;
  turno: Turno;
  capacidade: number;
  observacoes: string;
}

const EMPTY_FORM: VehicleForm = {
  numero: '',
  tipo: 'Ônibus',
  driverName: '',
  driverPhone: '',
  driverCnh: '',
  monitorName: '',
  monitorPhone: '',
  placa: '',
  rota: '',
  turno: '1º Turno',
  capacidade: 48,
  observacoes: '',
};

const TURNOS: { id: Turno; label: string }[] = [
  { id: '1º Turno', label: '1º turno (manhã)' },
  { id: '2º Turno', label: '2º turno (tarde)' },
  { id: '3º Turno', label: '3º turno (noite)' },
  { id: 'Educação Infantil', label: 'Educação Infantil' },
  { id: 'EJA', label: 'EJA' },
];

const BOARDING: { id: Boarding; label: string; tone: 'success' | 'warning' | 'danger' }[] = [
  { id: 'Embarcado', label: 'Embarcou', tone: 'success' },
  { id: 'Aguardando', label: 'Aguardando', tone: 'warning' },
  { id: 'Ausente', label: 'Faltou', tone: 'danger' },
];

const BOARDING_COLORS = { success: { bg: '#E7F6EE', fg: '#127A4B' }, warning: { bg: '#FEF4E6', fg: '#A15C07' }, danger: { bg: '#FDECEC', fg: '#B42318' } };

export function AdminTransporte({ selectedUnit: propUnit }: AdminTransporteProps = {}) {
  const {
    schoolInfo,
    selectedUnit: contextUnit,
    transportVehicles: contextVehicles,
    setTransportVehicles: setContextVehicles,
    transportStudents: contextStudents,
    setTransportStudents: setContextStudents,
    addTransportVehicle: contextAddVehicle,
    updateTransportVehicle: contextUpdateVehicle,
    deleteTransportVehicle: contextDeleteVehicle,
    linkStudentToVehicle: contextLinkStudent,
    unlinkStudentFromVehicle: contextUnlinkStudent,
    updateStudentBoardingStatus: contextUpdateBoarding,
  } = usePlatform();

  const activeUnit = propUnit || contextUnit || undefined;

  const [vehicles, setVehicles] = useState<TransportVehicleData[]>(contextVehicles || []);
  const [students, setStudents] = useState<TransportStudentData[]>(contextStudents || []);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'danger' | 'info' } | null>(null);

  // Visão e filtros
  const [view, setView] = useState<'vehicles' | 'students'>('vehicles');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('Todos');
  const [searchVehicleQuery, setSearchVehicleQuery] = useState<string>('');
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [studentSearchStatusFilter, setStudentSearchStatusFilter] = useState<'todos' | 'vinculados' | 'aguardando'>('todos');

  // Janelas
  const [isAddVehicleModalOpen, setIsAddVehicleModalOpen] = useState<boolean>(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vehicleToDeleteId, setVehicleToDeleteId] = useState<string | null>(null);
  const [viewingVehicleId, setViewingVehicleId] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [activeReportTab, setActiveReportTab] = useState<'drivers' | 'capacity' | 'unlinked' | 'routes'>('drivers');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const [selectedVehicleForStudent, setSelectedVehicleForStudent] = useState<Record<string, string>>({});
  const [vehicleForm, setVehicleForm] = useState<VehicleForm>(EMPTY_FORM);

  const showToast = (text: string, type: 'success' | 'danger' | 'info' = 'success') => setToast({ text, type });

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetchOrganizationTransportData(activeUnit);
      if (!res.error) {
        setVehicles(res.vehicles || []);
        setContextVehicles((res.vehicles || []) as any);
        setStudents(res.students || []);
        setContextStudents((res.students || []) as any);
      } else {
        console.warn('[AdminTransporte] fetchOrganizationTransportData error:', res.error);
      }
    } catch (e) {
      console.error('[AdminTransporte] Error loading data:', e);
    } finally {
      setIsLoading(false);
      setFirstLoad(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToTransportChanges(() => loadData(), activeUnit);
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUnit]);

  const set = <K extends keyof VehicleForm>(key: K, value: VehicleForm[K]) => setVehicleForm((f) => ({ ...f, [key]: value }));

  const openCreate = () => {
    setEditingVehicleId(null);
    setVehicleForm(EMPTY_FORM);
    setFormError(null);
    setIsAddVehicleModalOpen(true);
  };

  const openEdit = (veh: TransportVehicleData) => {
    setEditingVehicleId(veh.id);
    setVehicleForm({
      numero: veh.numero,
      tipo: veh.tipo,
      driverName: veh.driverName,
      driverPhone: veh.driverPhone,
      driverCnh: veh.driverCnh,
      monitorName: veh.monitorName,
      monitorPhone: veh.monitorPhone,
      placa: veh.placa,
      rota: veh.rota,
      turno: veh.turno as Turno,
      capacidade: veh.capacidade,
      observacoes: veh.observacoes || '',
    });
    setFormError(null);
    setIsAddVehicleModalOpen(true);
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleForm.numero.trim() || !vehicleForm.driverName.trim() || !vehicleForm.placa.trim()) {
      setFormError('Preencha o número, a placa e o nome do motorista.');
      return;
    }
    setFormError(null);

    const payload = {
      id: editingVehicleId || undefined,
      numero: vehicleForm.numero,
      tipo: vehicleForm.tipo,
      placa: vehicleForm.placa,
      capacidade: Number(vehicleForm.capacidade) || 40,
      rota: vehicleForm.rota,
      turno: vehicleForm.turno,
      driverName: vehicleForm.driverName,
      driverPhone: vehicleForm.driverPhone,
      driverCnh: vehicleForm.driverCnh,
      monitorName: vehicleForm.monitorName,
      monitorPhone: vehicleForm.monitorPhone,
      observacoes: vehicleForm.observacoes,
    };

    setIsSaving(true);
    const res = await saveTransportVehicle(payload);
    setIsSaving(false);

    if (!res.success && res.error) {
      setFormError(res.error);
      return;
    }

    if (editingVehicleId) {
      contextUpdateVehicle({ ...payload, id: editingVehicleId, studentsIds: vehicles.find((v) => v.id === editingVehicleId)?.studentsIds || [] } as any);
      showToast('Veículo atualizado.');
    } else {
      contextAddVehicle(payload as any);
      showToast('Veículo cadastrado.');
    }
    setIsAddVehicleModalOpen(false);
    setEditingVehicleId(null);
    loadData();
  };

  const handleConfirmDelete = async () => {
    if (!vehicleToDeleteId) return;
    setIsSaving(true);
    const res = await rpcDeleteTransportVehicle(vehicleToDeleteId);
    setIsSaving(false);
    if (!res.success && res.error) {
      showToast(res.error, 'danger');
      return;
    }
    contextDeleteVehicle(vehicleToDeleteId);
    if (viewingVehicleId === vehicleToDeleteId) setViewingVehicleId(null);
    setVehicleToDeleteId(null);
    showToast('Veículo excluído. Os estudantes voltaram para “sem veículo”.', 'info');
    loadData();
  };

  const handleLinkStudent = async (studentId: string, vehicleId: string) => {
    const veh = currentVehicles.find((v) => v.id === vehicleId);
    if (veh && veh.studentsIds.length >= veh.capacidade) {
      showToast('Esse veículo está lotado.', 'danger');
      return;
    }
    const ok = contextLinkStudent(studentId, vehicleId);
    if (ok === false) {
      showToast('Esse veículo está lotado.', 'danger');
      return;
    }
    setSelectedVehicleForStudent((prev) => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });

    const res = await linkStudentToTransport(studentId, vehicleId);
    if (!res.success && res.error) {
      showToast(res.error, 'danger');
    } else {
      showToast(`Estudante incluído em ${veh ? `${veh.tipo} ${veh.numero}` : 'veículo'}.`);
    }
    loadData();
  };

  const handleUnlinkStudent = async (studentId: string) => {
    contextUnlinkStudent(studentId);
    const res = await unlinkStudentFromTransport(studentId);
    if (!res.success && res.error) showToast(res.error, 'danger');
    else showToast('Estudante retirado do veículo.', 'info');
    loadData();
  };

  const handleUpdateBoarding = async (studentId: string, status: Boarding) => {
    contextUpdateBoarding(studentId, status);
    const res = await rpcUpdateStudentBoardingStatus(studentId, status);
    if (!res.success && res.error) showToast(res.error, 'danger');
    loadData();
  };

  // Números
  const currentVehicles: TransportVehicleData[] = vehicles.length > 0 ? vehicles : contextVehicles || [];
  const currentStudents: TransportStudentData[] = students.length > 0 ? students : contextStudents || [];
  const totalCapacityCount = currentVehicles.reduce((acc, v) => acc + v.capacidade, 0);
  const linkedStudents = currentStudents.filter((s) => s.status === 'Vinculado');
  const unlinkedStudentsList = currentStudents.filter((s) => s.status === 'Aguardando Vinculação');
  const globalOccupancyPct = totalCapacityCount > 0 ? Math.round((linkedStudents.length / totalCapacityCount) * 100) : 0;

  const filteredVehicles = useMemo(() => {
    const query = searchVehicleQuery.toLowerCase();
    return currentVehicles.filter((v) => {
      const matchesShift = selectedShiftFilter === 'Todos' || v.turno === selectedShiftFilter;
      const matchesQuery =
        !query ||
        v.numero.toLowerCase().includes(query) ||
        v.tipo.toLowerCase().includes(query) ||
        v.driverName.toLowerCase().includes(query) ||
        v.rota.toLowerCase().includes(query) ||
        v.placa.toLowerCase().includes(query);
      return matchesShift && matchesQuery;
    });
  }, [currentVehicles, selectedShiftFilter, searchVehicleQuery]);

  const filteredStudents = useMemo(() => {
    const q = studentSearchQuery.toLowerCase().trim();
    return currentStudents.filter((st) => {
      const matchesStatus =
        studentSearchStatusFilter === 'todos' ||
        (studentSearchStatusFilter === 'vinculados' && st.status === 'Vinculado') ||
        (studentSearchStatusFilter === 'aguardando' && st.status === 'Aguardando Vinculação');
      const matchesQuery =
        !q ||
        st.name.toLowerCase().includes(q) ||
        (st.matricula || '').toLowerCase().includes(q) ||
        (st.grade || '').toLowerCase().includes(q) ||
        (st.parentName || '').toLowerCase().includes(q) ||
        (st.address || '').toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [currentStudents, studentSearchQuery, studentSearchStatusFilter]);

  const vehicleOptionLabel = (v: TransportVehicleData) => {
    const free = v.capacidade - v.studentsIds.length;
    return `${v.tipo} ${v.numero} · ${v.turno} · ${free <= 0 ? 'lotado' : `${free} ${free === 1 ? 'vaga' : 'vagas'}`}`;
  };

  const viewingVehicle = viewingVehicleId ? currentVehicles.find((v) => v.id === viewingVehicleId) || null : null;
  const viewingPassengers = viewingVehicle ? currentStudents.filter((s) => viewingVehicle.studentsIds.includes(s.id)) : [];
  const deletingVehicle = vehicleToDeleteId ? currentVehicles.find((v) => v.id === vehicleToDeleteId) : null;

  /** Imprime só o relatório (não a tela inteira) */
  const printReport = () => {
    const html = reportRef.current?.innerHTML;
    if (!html) return;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) {
      window.print();
      return;
    }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Relatório de transporte</title>
      <style>body{font:13px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#101828;margin:32px}
      h2{font:600 20px Georgia,serif;margin:0}h3{font-size:13px;margin:20px 0 8px;text-transform:uppercase;letter-spacing:.04em}
      table{width:100%;border-collapse:collapse;margin-bottom:12px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #E4E7EC;vertical-align:top}
      th{background:#F2F4F7;font-size:12px}small,.muted{color:#667085}.box{border:1px solid #D0D5DD;border-radius:8px;padding:10px;margin-bottom:12px}
      .no-print{display:none}</style></head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="space-y-6 text-left" id="module_transporte_container">
      <ModuleHeader
        icon={Bus}
        title="Transporte escolar"
        text="Veículos, motoristas, rotas e quem vai em cada um. Os estudantes aparecem aqui quando a opção de transporte é marcada na matrícula."
        actions={
          <>
            <Button icon={Plus} onClick={openCreate}>
              Cadastrar veículo
            </Button>
            <Button variant="secondary" icon={FileSpreadsheet} onClick={() => setIsReportModalOpen(true)}>
              Relatórios
            </Button>
            <RoundIconButton icon={RefreshCw} label="Atualizar" onClick={loadData} spinning={isLoading} disabled={isLoading} />
          </>
        }
      />

      <MetricStrip
        items={[
          { label: 'Veículos', value: currentVehicles.length, icon: Bus },
          { label: 'Vagas no total', value: totalCapacityCount, icon: Users },
          {
            label: 'Ocupação',
            value: `${globalOccupancyPct}%`,
            icon: BarChart3,
            tone: globalOccupancyPct > 90 ? 'danger' : globalOccupancyPct > 75 ? 'warning' : 'neutral',
            hint: `${linkedStudents.length} estudantes com veículo`,
          },
          {
            label: 'Sem veículo',
            value: unlinkedStudentsList.length,
            icon: AlertTriangle,
            tone: unlinkedStudentsList.length > 0 ? 'warning' : 'neutral',
            hint: 'Pediram transporte na matrícula',
          },
        ]}
      />

      {/* Pendentes */}
      {unlinkedStudentsList.length > 0 && (
        <Card>
          <CardHeader
            icon={AlertTriangle}
            title={`${unlinkedStudentsList.length} ${unlinkedStudentsList.length === 1 ? 'estudante precisa' : 'estudantes precisam'} de veículo`}
            subtitle="Escolha um veículo com vaga para cada um"
          />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {unlinkedStudentsList.map((st) => {
              const selectedVehId = selectedVehicleForStudent[st.id] || '';
              const selectedVehicle = currentVehicles.find((v) => v.id === selectedVehId);
              return (
                <div key={st.id} className="flex flex-col rounded-2xl border border-[var(--border)] p-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={st.name} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[var(--text-heading)]" title={st.name}>
                        {st.name}
                      </p>
                      <p className="text-[12px] text-[var(--text-muted)]">
                        {st.grade} · {st.shift}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 text-[12px] text-[var(--text-muted)]">
                    <p className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" /> {st.parentName || 'Responsável não informado'}
                      {st.parentPhone ? ` · ${st.parentPhone}` : ''}
                    </p>
                    {st.address && (
                      <p className="flex items-center gap-1.5 truncate" title={st.address}>
                        <MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{st.address}</span>
                      </p>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <select
                      aria-label={`Veículo para ${st.name}`}
                      value={selectedVehId}
                      onChange={(e) => setSelectedVehicleForStudent((prev) => ({ ...prev, [st.id]: e.target.value }))}
                      className={cx(inputCls, 'h-10 py-0 text-[13px]')}
                    >
                      <option value="">{currentVehicles.length ? 'Escolha o veículo' : 'Cadastre um veículo antes'}</option>
                      {currentVehicles.map((v) => (
                        <option key={v.id} value={v.id} disabled={v.studentsIds.length >= v.capacidade}>
                          {vehicleOptionLabel(v)}
                        </option>
                      ))}
                    </select>
                    <Button size="sm" disabled={!selectedVehId} onClick={() => handleLinkStudent(st.id, selectedVehId)}>
                      Incluir
                    </Button>
                  </div>
                  {selectedVehicle && (
                    <p className="mt-2 text-[12px] text-[var(--text-muted)]">
                      Motorista {selectedVehicle.driverName} · {selectedVehicle.rota}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Veículos / estudantes */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <PillNav
          label="Visão do transporte"
          value={view}
          onChange={setView}
          items={[
            { id: 'vehicles', label: 'Veículos', icon: Bus, badge: currentVehicles.length },
            { id: 'students', label: 'Estudantes', icon: GraduationCap, badge: currentStudents.length },
          ]}
        />
        <div className="relative md:w-80">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          {view === 'vehicles' ? (
            <input
              type="search"
              aria-label="Buscar veículo"
              placeholder="Veículo, motorista, rota ou placa"
              value={searchVehicleQuery}
              onChange={(e) => setSearchVehicleQuery(e.target.value)}
              className={cx(inputCls, 'pl-10')}
            />
          ) : (
            <input
              type="search"
              aria-label="Buscar estudante"
              placeholder="Nome, matrícula, turma ou responsável"
              value={studentSearchQuery}
              onChange={(e) => setStudentSearchQuery(e.target.value)}
              className={cx(inputCls, 'pl-10')}
            />
          )}
        </div>
      </div>

      {view === 'vehicles' ? (
        <>
          <Segmented
            label="Turno"
            value={selectedShiftFilter}
            onChange={setSelectedShiftFilter}
            items={[{ id: 'Todos', label: 'Todos', count: currentVehicles.length }, ...TURNOS.map((t) => ({ id: t.id as string, label: t.id === 'Educação Infantil' || t.id === 'EJA' ? t.id : t.id.replace(' Turno', ' turno'), count: currentVehicles.filter((v) => v.turno === t.id).length }))]}
          />

          {firstLoad && isLoading ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-72 rounded-3xl" />
              ))}
            </div>
          ) : filteredVehicles.length === 0 ? (
            <EmptyState
              icon={Bus}
              title={currentVehicles.length === 0 ? 'Nenhum veículo cadastrado' : 'Nenhum veículo com esses filtros'}
              text={currentVehicles.length === 0 ? 'Cadastre os ônibus e vans da escola para organizar as rotas.' : 'Troque o turno ou a busca.'}
              action={
                currentVehicles.length === 0 ? (
                  <Button icon={Plus} onClick={openCreate}>
                    Cadastrar veículo
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredVehicles.map((veh) => {
                const occupied = veh.studentsIds.length;
                const freeSlots = veh.capacidade - occupied;
                const isFull = occupied >= veh.capacidade;
                const occPercent = veh.capacidade > 0 ? Math.round((occupied / veh.capacidade) * 100) : 0;
                return (
                  <article
                    key={veh.id}
                    className="flex flex-col rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-26px_rgba(16,24,40,0.45)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                          <Bus className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="truncate font-serif text-[18px] font-semibold leading-tight text-[var(--text-heading)]">
                            {veh.tipo} {veh.numero}
                          </h3>
                          <p className="truncate text-[12px] text-[var(--text-muted)]">
                            <span className="font-mono">{veh.placa}</span> · {veh.turno}
                          </p>
                        </div>
                      </div>
                      {isFull ? <Badge tone="danger">Lotado</Badge> : <Badge tone="success">{freeSlots} {freeSlots === 1 ? 'vaga' : 'vagas'}</Badge>}
                    </div>

                    <p className="mt-3 flex items-center gap-1.5 text-[13px] text-[var(--text-body)]">
                      <MapPin className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                      <span className="truncate">{veh.rota || 'Rota não informada'}</span>
                    </p>

                    <div className="mt-4 divide-y divide-[var(--border)] rounded-2xl bg-[var(--bg-card-alt)] px-4 py-1">
                      <InfoRow label="Motorista">{veh.driverName}</InfoRow>
                      {veh.driverPhone && <InfoRow label="Telefone">{veh.driverPhone}</InfoRow>}
                      <InfoRow label="Monitora">{veh.monitorName || '—'}</InfoRow>
                    </div>

                    <div className="mt-4 space-y-1.5">
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-[var(--text-muted)]">Ocupação</span>
                        <span className="font-semibold tabular-nums text-[var(--text-heading)]">
                          {occupied}/{veh.capacidade} <span className="font-normal text-[var(--text-muted)]">({occPercent}%)</span>
                        </span>
                      </div>
                      <ProgressBar value={occupied} max={veh.capacidade} />
                    </div>

                    {veh.observacoes && <p className="mt-3 text-[12px] leading-relaxed text-[var(--text-muted)]">{veh.observacoes}</p>}

                    <div className="min-h-[16px] flex-1" aria-hidden />
                    <div className="flex items-center gap-2 border-t border-[var(--border)] pt-4">
                      <Button size="sm" variant="secondary" icon={Eye} onClick={() => setViewingVehicleId(veh.id)}>
                        Passageiros
                      </Button>
                      <div className="ml-auto flex">
                        <IconAction icon={Pencil} label="Editar" onClick={() => openEdit(veh)} />
                        <IconAction icon={Trash2} label="Excluir" danger onClick={() => setVehicleToDeleteId(veh.id)} />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <Segmented
            label="Situação"
            value={studentSearchStatusFilter}
            onChange={setStudentSearchStatusFilter}
            items={[
              { id: 'todos', label: 'Todos', count: currentStudents.length },
              { id: 'vinculados', label: 'Com veículo', count: linkedStudents.length },
              { id: 'aguardando', label: 'Sem veículo', count: unlinkedStudentsList.length },
            ]}
          />

          {filteredStudents.length === 0 ? (
            <EmptyState
              icon={Users}
              title={currentStudents.length === 0 ? 'Nenhum estudante usa transporte' : 'Nenhum estudante encontrado'}
              text={currentStudents.length === 0 ? 'Marque “Transporte escolar” no cadastro do estudante para ele aparecer aqui.' : 'Confira o nome, a matrícula ou o responsável.'}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredStudents.map((st) => {
                const linkedVehicle = st.vehicleId ? currentVehicles.find((v) => v.id === st.vehicleId) : null;
                return (
                  <article key={st.id} className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
                    <div className="flex items-start gap-3">
                      <Avatar name={st.name} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[var(--text-heading)]">{st.name}</p>
                        <p className="text-[12px] text-[var(--text-muted)]">
                          {st.matricula ? `Matrícula ${st.matricula} · ` : ''}
                          {st.grade} · {st.shift}
                        </p>
                      </div>
                      {linkedVehicle ? <Badge tone="success">Com veículo</Badge> : <Badge tone="warning">Sem veículo</Badge>}
                    </div>

                    <div className="mt-3 grid gap-2 text-[12px] text-[var(--text-muted)] sm:grid-cols-2">
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" /> {st.parentName || '—'}
                        {st.parentPhone ? ` · ${st.parentPhone}` : ''}
                      </p>
                      {st.address && (
                        <p className="flex items-center gap-1.5 truncate" title={st.address}>
                          <MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{st.address}</span>
                        </p>
                      )}
                    </div>

                    {linkedVehicle ? (
                      <div className="mt-4 rounded-2xl bg-[var(--bg-card-alt)] p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-[var(--text-heading)]">
                            {linkedVehicle.tipo} {linkedVehicle.numero} <span className="font-mono text-[12px] font-normal text-[var(--text-muted)]">{linkedVehicle.placa}</span>
                          </p>
                          <span className="text-[12px] text-[var(--text-muted)]">{linkedVehicle.turno}</span>
                        </div>
                        <div className="mt-1 divide-y divide-[var(--border)]">
                          <InfoRow label="Rota">{linkedVehicle.rota}</InfoRow>
                          <InfoRow label="Motorista">
                            {linkedVehicle.driverName}
                            {linkedVehicle.driverPhone ? ` · ${linkedVehicle.driverPhone}` : ''}
                          </InfoRow>
                          {linkedVehicle.monitorName && (
                            <InfoRow label="Monitora">
                              {linkedVehicle.monitorName}
                              {linkedVehicle.monitorPhone ? ` · ${linkedVehicle.monitorPhone}` : ''}
                            </InfoRow>
                          )}
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <Button size="sm" variant="secondary" icon={Eye} onClick={() => setViewingVehicleId(linkedVehicle.id)}>
                            Ver veículo
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleUnlinkStudent(st.id)}>
                            Tirar do veículo
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <select
                          aria-label={`Veículo para ${st.name}`}
                          value=""
                          onChange={(e) => e.target.value && handleLinkStudent(st.id, e.target.value)}
                          className={cx(inputCls, 'text-[13px]')}
                        >
                          <option value="">{currentVehicles.length ? 'Incluir em um veículo…' : 'Cadastre um veículo antes'}</option>
                          {currentVehicles.map((v) => (
                            <option key={v.id} value={v.id} disabled={v.studentsIds.length >= v.capacidade}>
                              {vehicleOptionLabel(v)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Cadastro / edição */}
      <Modal
        open={isAddVehicleModalOpen}
        onClose={() => !isSaving && setIsAddVehicleModalOpen(false)}
        size="lg"
        icon={<Bus className="h-5 w-5" />}
        title={editingVehicleId ? 'Editar veículo' : 'Cadastrar veículo'}
        footer={
          <>
            <Button variant="secondary" disabled={isSaving} onClick={() => setIsAddVehicleModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="vehicle-form" loading={isSaving}>
              {editingVehicleId ? 'Salvar alterações' : 'Cadastrar'}
            </Button>
          </>
        }
      >
        <form id="vehicle-form" onSubmit={handleSaveVehicle} className="space-y-6">
          {formError && (
            <div className="rounded-2xl px-4 py-3 text-[14px]" style={{ background: '#FDECEC', color: '#8A1C13' }} role="alert">
              {formError}
            </div>
          )}

          <section className="space-y-4">
            <p className="text-[13px] font-semibold text-[var(--text-heading)]">Veículo</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Tipo" required>
                {(id) => (
                  <select id={id} value={vehicleForm.tipo} onChange={(e) => set('tipo', e.target.value as VehicleForm['tipo'])} className={inputCls}>
                    <option value="Ônibus">Ônibus</option>
                    <option value="Van">Van</option>
                    <option value="Micro-ônibus">Micro-ônibus</option>
                  </select>
                )}
              </Field>
              <Field label="Número" required>
                {(id) => <input id={id} required placeholder="Ex.: 05" value={vehicleForm.numero} onChange={(e) => set('numero', e.target.value)} className={inputCls} />}
              </Field>
              <Field label="Placa" required>
                {(id) => (
                  <input
                    id={id}
                    required
                    placeholder="ABC-1D23"
                    value={vehicleForm.placa}
                    onChange={(e) => set('placa', maskPlaca(e.target.value))}
                    className={cx(inputCls, 'font-mono uppercase')}
                  />
                )}
              </Field>
              <Field label="Turno" required>
                {(id) => (
                  <select id={id} value={vehicleForm.turno} onChange={(e) => set('turno', e.target.value as Turno)} className={inputCls}>
                    {TURNOS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Vagas" required>
                {(id) => (
                  <input
                    id={id}
                    type="number"
                    min={1}
                    max={120}
                    required
                    value={vehicleForm.capacidade}
                    onChange={(e) => set('capacidade', Number(e.target.value) || 1)}
                    className={inputCls}
                  />
                )}
              </Field>
              <Field label="Rota" required>
                {(id) => <input id={id} required placeholder="Ex.: Zona Norte — Centro" value={vehicleForm.rota} onChange={(e) => set('rota', e.target.value)} className={inputCls} />}
              </Field>
            </div>
          </section>

          <section className="space-y-4 border-t border-[var(--border)] pt-5">
            <p className="text-[13px] font-semibold text-[var(--text-heading)]">Equipe</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Motorista" required>
                {(id) => <input id={id} required placeholder="Nome completo" value={vehicleForm.driverName} onChange={(e) => set('driverName', e.target.value)} className={inputCls} />}
              </Field>
              <Field label="Telefone do motorista">
                {(id) => (
                  <input id={id} inputMode="tel" placeholder="(00) 00000-0000" value={vehicleForm.driverPhone} onChange={(e) => set('driverPhone', maskCellPhone(e.target.value))} className={inputCls} />
                )}
              </Field>
              <Field label="CNH">
                {(id) => <input id={id} inputMode="numeric" placeholder="Número da CNH" value={vehicleForm.driverCnh} onChange={(e) => set('driverCnh', e.target.value)} className={inputCls} />}
              </Field>
              <Field label="Monitora">
                {(id) => <input id={id} placeholder="Nome completo" value={vehicleForm.monitorName} onChange={(e) => set('monitorName', e.target.value)} className={inputCls} />}
              </Field>
              <Field label="Telefone da monitora">
                {(id) => (
                  <input id={id} inputMode="tel" placeholder="(00) 00000-0000" value={vehicleForm.monitorPhone} onChange={(e) => set('monitorPhone', maskCellPhone(e.target.value))} className={inputCls} />
                )}
              </Field>
            </div>
          </section>

          <Field label="Observações e acessibilidade">
            {(id) => (
              <textarea
                id={id}
                rows={2}
                placeholder="Ex.: Tem elevador para cadeira de rodas"
                value={vehicleForm.observacoes}
                onChange={(e) => set('observacoes', e.target.value)}
                className={cx(inputCls, 'resize-y')}
              />
            )}
          </Field>
        </form>
      </Modal>

      {/* Passageiros */}
      <Modal
        open={Boolean(viewingVehicle)}
        onClose={() => setViewingVehicleId(null)}
        size="lg"
        icon={<Bus className="h-5 w-5" />}
        title={viewingVehicle ? `${viewingVehicle.tipo} ${viewingVehicle.numero}` : ''}
        subtitle={viewingVehicle ? `${viewingVehicle.placa} · ${viewingVehicle.turno} · ${viewingVehicle.rota}` : ''}
        footer={<Button onClick={() => setViewingVehicleId(null)}>Fechar</Button>}
      >
        {viewingVehicle && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
                  <span className="text-[var(--text-muted)]">
                    Motorista <strong className="text-[var(--text-heading)]">{viewingVehicle.driverName}</strong>
                    {viewingVehicle.driverPhone ? ` · ${viewingVehicle.driverPhone}` : ''}
                  </span>
                  <span className="font-semibold tabular-nums text-[var(--text-heading)]">
                    {viewingVehicle.studentsIds.length}/{viewingVehicle.capacidade}
                  </span>
                </div>
                <ProgressBar value={viewingVehicle.studentsIds.length} max={viewingVehicle.capacidade} />
              </div>
              {viewingVehicle.studentsIds.length >= viewingVehicle.capacidade ? (
                <Badge tone="danger">Lotado</Badge>
              ) : (
                <select
                  aria-label="Incluir estudante neste veículo"
                  value=""
                  onChange={(e) => e.target.value && handleLinkStudent(e.target.value, viewingVehicle.id)}
                  className={cx(inputCls, 'h-10 py-0 text-[13px] sm:w-64')}
                  disabled={unlinkedStudentsList.length === 0}
                >
                  <option value="">{unlinkedStudentsList.length ? '+ Incluir estudante' : 'Ninguém aguardando veículo'}</option>
                  {unlinkedStudentsList.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} — {st.grade}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {viewingPassengers.length === 0 ? (
              <EmptyState icon={Users} title="Nenhum passageiro ainda" compact />
            ) : (
              <ul className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
                {viewingPassengers.map((st) => (
                  <li key={st.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={st.name} size={36} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[var(--text-heading)]">{st.name}</p>
                        <p className="truncate text-[12px] text-[var(--text-muted)]">
                          {st.grade} · {st.parentName}
                          {st.parentPhone ? ` · ${st.parentPhone}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div role="radiogroup" aria-label={`Embarque de ${st.name}`} className="flex rounded-full bg-[var(--bg-card-alt)] p-0.5">
                        {BOARDING.map((b) => {
                          const active = (st.boardingStatus || 'Aguardando') === b.id;
                          const c = BOARDING_COLORS[b.tone];
                          return (
                            <button
                              key={b.id}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() => handleUpdateBoarding(st.id, b.id)}
                              className="h-7 rounded-full px-2.5 text-[12px] font-semibold transition-colors"
                              style={active ? { background: c.bg, color: c.fg } : { color: 'var(--text-muted)' }}
                            >
                              {b.label}
                            </button>
                          );
                        })}
                      </div>
                      <IconAction icon={Trash2} label="Tirar do veículo" danger onClick={() => handleUnlinkStudent(st.id)} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Modal>

      {/* Relatórios */}
      <Modal
        open={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        size="lg"
        icon={<FileSpreadsheet className="h-5 w-5" />}
        title="Relatórios do transporte"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsReportModalOpen(false)}>
              Fechar
            </Button>
            <Button icon={Printer} onClick={printReport}>
              Imprimir
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <PillNav
            label="Relatório"
            value={activeReportTab}
            onChange={setActiveReportTab}
            items={[
              { id: 'drivers', label: 'Motoristas' },
              { id: 'capacity', label: 'Ocupação' },
              { id: 'unlinked', label: 'Sem veículo', badge: unlinkedStudentsList.length || undefined },
              { id: 'routes', label: 'Passageiros por rota' },
            ]}
          />

          <div ref={reportRef} className="report max-h-[55vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-white p-5 text-[13px] text-[#101828]">
            <div className="mb-4 border-b border-[#E4E7EC] pb-3">
              <h2 className="font-serif text-[18px] font-semibold">{schoolInfo?.name || 'Transporte escolar'}</h2>
              <p className="text-[12px] text-[#667085]">
                {
                  {
                    drivers: 'Veículos, motoristas e monitoras',
                    capacity: 'Capacidade e ocupação',
                    unlinked: 'Estudantes sem veículo',
                    routes: 'Passageiros por rota',
                  }[activeReportTab]
                }{' '}
                · emitido em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {activeReportTab === 'drivers' && (
              <ReportTable
                head={['Veículo', 'Placa', 'Turno', 'Motorista', 'Monitora']}
                rows={currentVehicles.map((v) => [
                  `${v.tipo} ${v.numero}`,
                  v.placa,
                  v.turno,
                  `${v.driverName}${v.driverPhone ? ` · ${v.driverPhone}` : ''}${v.driverCnh ? ` · CNH ${v.driverCnh}` : ''}`,
                  `${v.monitorName || '—'}${v.monitorPhone ? ` · ${v.monitorPhone}` : ''}`,
                ])}
              />
            )}

            {activeReportTab === 'capacity' && (
              <ReportTable
                head={['Veículo', 'Turno', 'Vagas', 'Ocupadas', 'Livres', 'Ocupação']}
                rows={currentVehicles.map((v) => {
                  const occ = v.studentsIds.length;
                  return [`${v.tipo} ${v.numero}`, v.turno, String(v.capacidade), String(occ), String(v.capacidade - occ), `${v.capacidade ? Math.round((occ / v.capacidade) * 100) : 0}%`];
                })}
              />
            )}

            {activeReportTab === 'unlinked' &&
              (unlinkedStudentsList.length === 0 ? (
                <p className="py-6 text-center text-[#667085]">Todos os estudantes que pediram transporte já têm veículo.</p>
              ) : (
                <ReportTable
                  head={['Estudante', 'Turma', 'Turno', 'Responsável', 'Telefone']}
                  rows={unlinkedStudentsList.map((st) => [st.name, st.grade, st.shift, st.parentName, st.parentPhone])}
                />
              ))}

            {activeReportTab === 'routes' && (
              <div className="space-y-4">
                {currentVehicles.length === 0 && <p className="py-6 text-center text-[#667085]">Nenhum veículo cadastrado.</p>}
                {currentVehicles.map((v) => {
                  const passengers = currentStudents.filter((s) => v.studentsIds.includes(s.id));
                  return (
                    <div key={v.id} className="box rounded-xl border border-[#D0D5DD] p-3">
                      <p className="font-semibold">
                        {v.tipo} {v.numero} — {v.rota} ({v.turno})
                      </p>
                      <p className="muted mb-2 text-[12px] text-[#667085]">
                        Motorista {v.driverName} · {passengers.length}/{v.capacidade} passageiros
                      </p>
                      {passengers.length === 0 ? (
                        <p className="text-[12px] text-[#667085]">Sem passageiros.</p>
                      ) : (
                        <ReportTable
                          head={['Estudante', 'Turma', 'Responsável', 'Telefone', 'Embarque']}
                          rows={passengers.map((p) => [p.name, p.grade, p.parentName, p.parentPhone, BOARDING.find((b) => b.id === (p.boardingStatus || 'Aguardando'))?.label || 'Aguardando'])}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={Boolean(vehicleToDeleteId)}
        onClose={() => setVehicleToDeleteId(null)}
        onConfirm={handleConfirmDelete}
        loading={isSaving}
        title="Excluir veículo?"
        confirmLabel="Excluir"
        icon={Trash2}
      >
        <strong className="text-[var(--text-heading)]">
          {deletingVehicle?.tipo} {deletingVehicle?.numero}
        </strong>{' '}
        sai da frota. {deletingVehicle && deletingVehicle.studentsIds.length > 0 ? `Os ${deletingVehicle.studentsIds.length} passageiros voltam para “sem veículo”.` : ''}
      </ConfirmModal>

      <Toast message={toast?.text ?? null} tone={toast?.type} onClose={() => setToast(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ReportTable({ head, rows }: { head: string[]; rows: (string | undefined)[][] }) {
  if (rows.length === 0) return <p className="py-6 text-center text-[#667085]">Nada para mostrar.</p>;
  return (
    <table className="w-full border-collapse text-left text-[12px]">
      <thead>
        <tr className="bg-[#F2F4F7]">
          {head.map((h) => (
            <th key={h} className="border-b border-[#E4E7EC] px-2 py-1.5 font-semibold">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j} className={cx('border-b border-[#EAECF0] px-2 py-1.5 align-top', j === 0 && 'font-semibold')}>
                {c || '—'}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function IconAction({ icon: Icon, label, onClick, danger }: { icon: React.ElementType; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cx(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors',
        danger ? 'hover:bg-[#FDECEC] hover:text-[#B42318]' : 'hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}