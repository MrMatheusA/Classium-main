import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  QrCode,
  RefreshCw,
  ScanLine,
  Search,
  ShieldAlert,
  Trash2,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import {
  AccessControlService,
  PickupAuthorizationData,
  GateAccessLogData,
  PortariaData,
  InspectorData,
  GateMetricsData,
  maskCpfDisplay,
} from '../../services/accessControlService';
import { playNotificationChime } from '../../utils/audioNotification';
import { maskCPF, maskCellPhone } from '../../utils/masks';
import { Alert, Avatar, Badge, Button, Card, CardHeader, EmptyState, Field, Modal, TableShell, Toast, cx, inputCls, tdCls, thCls } from '../ui/kit';
import { ConfirmModal, InfoRow, MetricStrip, ModuleHeader, RoundIconButton, Segmented } from '../ui/ModuleParts';

interface AdminGateQRCodeProps {
  selectedUnit?: string;
}

const REJECT_REASONS = [
  'Documento de identificação com divergência',
  'Pessoa não autorizada na lista familiar',
  'Horário não compatível com a autorização',
  'Desistência comunicada pelo responsável',
  'Outro motivo de segurança',
];

const RELATIONS = [
  { value: 'Pai/Mãe', label: 'Pai / mãe' },
  { value: 'Avô/Avó', label: 'Avô / avó' },
  { value: 'Tio/Tia', label: 'Tio / tia' },
  { value: 'Irmão/Irmã Maior', label: 'Irmão / irmã maior de idade' },
  { value: 'Transporte / Motorista', label: 'Transporte / motorista' },
  { value: 'Outro Autorizado', label: 'Outra pessoa autorizada' },
];

export function AdminGateQRCode({ selectedUnit: propUnit }: AdminGateQRCodeProps = {}) {
  const { schoolInfo, selectedUnit: contextUnit, user, students } = usePlatform();
  const activeSchoolId = propUnit || contextUnit || schoolInfo?.id || user?.schoolId || undefined;

  const [metrics, setMetrics] = useState<GateMetricsData>({
    authorizedToday: 0,
    pendingTokens: 0,
    refusedToday: 0,
    activePortariaName: '',
    activeInspectorName: '',
  });

  const [portarias, setPortarias] = useState<PortariaData[]>([]);
  const [selectedPortariaId, setSelectedPortariaId] = useState<string>('');
  const [inspectors, setInspectors] = useState<InspectorData[]>([]);
  const [selectedInspectorId, setSelectedInspectorId] = useState<string>('');

  const [inputToken, setInputToken] = useState<string>('');
  const [scannedAuth, setScannedAuth] = useState<PickupAuthorizationData | null>(null);
  const [tokenNotFound, setTokenNotFound] = useState(false);
  const [isSearchingToken, setIsSearchingToken] = useState<boolean>(false);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);
  const tokenInputRef = useRef<HTMLInputElement>(null);

  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>(REJECT_REASONS[0]);

  const [isNewPortariaModalOpen, setIsNewPortariaModalOpen] = useState<boolean>(false);
  const [newPortariaName, setNewPortariaName] = useState<string>('');
  const [newPortariaLocation, setNewPortariaLocation] = useState<string>('');
  const [isSavingPortaria, setIsSavingPortaria] = useState(false);

  const [isEmitTokenModalOpen, setIsEmitTokenModalOpen] = useState<boolean>(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [emitPickerName, setEmitPickerName] = useState<string>('');
  const [emitPickerCpf, setEmitPickerCpf] = useState<string>('');
  const [emitPickerPhone, setEmitPickerPhone] = useState<string>('');
  const [emitPickerRelation, setEmitPickerRelation] = useState<string>('Pai/Mãe');
  const [emitReason, setEmitReason] = useState<string>('');
  const [emitError, setEmitError] = useState<string | null>(null);
  const [isEmittingToken, setIsEmittingToken] = useState<boolean>(false);
  const [emittedTokenSuccess, setEmittedTokenSuccess] = useState<string | null>(null);

  const [logs, setLogs] = useState<GateAccessLogData[]>([]);
  const [logFilterResult, setLogFilterResult] = useState<'all' | 'LIBERADO' | 'RECUSADO'>('all');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isPurgingLogs, setIsPurgingLogs] = useState<boolean>(false);
  const [confirmPurge, setConfirmPurge] = useState(false);

  const [toast, setToast] = useState<{ text: string; type: 'success' | 'danger' | 'info' } | null>(null);
  const showToast = (text: string, type: 'success' | 'danger' | 'info' = 'success') => setToast({ text, type });

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const loadData = useCallback(async () => {
    try {
      setIsSyncing(true);
      const [pts, ins, met, lgData] = await Promise.all([
        AccessControlService.getPortarias(activeSchoolId),
        AccessControlService.getInspectors(activeSchoolId),
        AccessControlService.getMetrics(activeSchoolId),
        AccessControlService.getAuditLogs(activeSchoolId),
      ]);
      setPortarias(pts);
      if (pts.length > 0 && !selectedPortariaId) setSelectedPortariaId(pts[0].id);
      setInspectors(ins);
      if (ins.length > 0 && !selectedInspectorId) setSelectedInspectorId(ins[0].id);
      setMetrics(met);
      setLogs(lgData);
    } catch (err) {
      console.warn('[AdminGateQRCode] Error loading data:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [activeSchoolId, selectedPortariaId, selectedInspectorId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsub = AccessControlService.subscribeToGateChanges(() => loadData(), activeSchoolId);
    return () => unsub();
  }, [loadData, activeSchoolId]);

  const activePortariaObj = portarias.find((p) => p.id === selectedPortariaId) || portarias[0];
  const activeInspectorObj = inspectors.find((i) => i.id === selectedInspectorId) || inspectors[0];
  const portariaName = activePortariaObj?.name || 'Portaria';
  const inspectorName = activeInspectorObj?.name || user?.name || 'Portaria';

  const handleSearchToken = async (e?: React.FormEvent, directCode?: string) => {
    if (e) e.preventDefault();
    const tokenToSearch = (directCode || inputToken).trim();
    if (!tokenToSearch) return;
    try {
      setIsSearchingToken(true);
      setTokenNotFound(false);
      const auth = await AccessControlService.getAuthorizationByToken(tokenToSearch, activeSchoolId);
      if (auth) {
        setScannedAuth(auth);
        playNotificationChime('info');
      } else {
        setScannedAuth(null);
        setTokenNotFound(true);
      }
    } catch {
      showToast('Não foi possível conferir o código. Tente de novo.', 'danger');
    } finally {
      setIsSearchingToken(false);
    }
  };

  const clearInspection = () => {
    setScannedAuth(null);
    setInputToken('');
    setTokenNotFound(false);
    window.setTimeout(() => tokenInputRef.current?.focus(), 50);
  };

  const handleApprovePickup = async () => {
    if (!scannedAuth) return;
    try {
      setIsProcessingAction(true);
      const res = await AccessControlService.validateAndConfirmPickup({
        tokenCode: scannedAuth.token_code,
        inspectorName,
        portariaName,
        action: 'APPROVE',
        schoolId: activeSchoolId,
      });
      if (res.success) {
        playNotificationChime('success');
        showToast('Saída liberada e registrada no histórico.');
        clearInspection();
        await loadData();
      } else {
        showToast(res.message || 'Não foi possível liberar a saída.', 'danger');
      }
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível liberar a saída.', 'danger');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRejectPickupSubmit = async () => {
    if (!scannedAuth) return;
    try {
      setIsProcessingAction(true);
      const res: any = await AccessControlService.validateAndConfirmPickup({
        tokenCode: scannedAuth.token_code,
        inspectorName,
        portariaName,
        action: 'REJECT',
        rejectionReason,
        schoolId: activeSchoolId,
      });
      if (res && res.success === false) throw new Error(res.message || 'Não foi possível registrar a recusa.');
      setIsRejectModalOpen(false);
      playNotificationChime('warning');
      showToast('Saída recusada e registrada no histórico.', 'info');
      clearInspection();
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível registrar a recusa.', 'danger');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleCreatePortariaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPortariaName.trim()) return;
    setIsSavingPortaria(true);
    try {
      const created = await AccessControlService.createPortaria({ name: newPortariaName, location: newPortariaLocation, schoolId: activeSchoolId });
      setPortarias((prev) => [...prev, created]);
      setSelectedPortariaId(created.id);
      setIsNewPortariaModalOpen(false);
      setNewPortariaName('');
      setNewPortariaLocation('');
      showToast('Posto de portaria cadastrado.');
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível cadastrar o posto.', 'danger');
    } finally {
      setIsSavingPortaria(false);
    }
  };

  const openEmit = () => {
    setEmittedTokenSuccess(null);
    setEmitError(null);
    setSelectedStudentId('');
    setEmitPickerName('');
    setEmitPickerCpf('');
    setEmitPickerPhone('');
    setEmitPickerRelation('Pai/Mãe');
    setEmitReason('');
    setIsEmitTokenModalOpen(true);
  };

  const handleEmitTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const stObj = students?.find((s: any) => s.id === selectedStudentId);
    if (!stObj) return setEmitError('Escolha o estudante.');
    if (!emitPickerName.trim()) return setEmitError('Informe quem vai buscar.');
    if (emitPickerCpf.replace(/\D/g, '').length !== 11) return setEmitError('Confira o CPF de quem vai buscar.');
    setEmitError(null);

    setIsEmittingToken(true);
    try {
      const todayISO = new Date().toISOString().split('T')[0];
      const validUntil = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(); // vale por 6 horas

      const res = await AccessControlService.createAuthorization({
        studentIds: [stObj.id],
        studentsData: [
          {
            id: stObj.id,
            name: stObj.name,
            grade: stObj.grade || (stObj as any).turma || '',
            photoUrl: (stObj as any).avatarUrl || (stObj as any).photo_url || '',
          },
        ],
        retireeName: emitPickerName,
        retireeCpf: emitPickerCpf,
        retireePhone: emitPickerPhone,
        retireeRelationship: emitPickerRelation,
        authorizationDate: todayISO,
        validUntil,
        reason: emitReason || 'Saída autorizada pela secretaria',
        guardianName: user?.name || 'Secretaria',
        schoolId: activeSchoolId,
      });

      if (res.success && res.tokenCode) {
        setEmittedTokenSuccess(res.tokenCode);
        await loadData();
      } else {
        setEmitError(res.error || 'Não foi possível gerar o código.');
      }
    } catch (err: any) {
      setEmitError(err?.message || 'Não foi possível gerar o código.');
    } finally {
      setIsEmittingToken(false);
    }
  };

  const handlePurgeLogs = async () => {
    setIsPurgingLogs(true);
    try {
      const res = await AccessControlService.purgeOldLogs(activeSchoolId, 30);
      showToast(res.message || 'Registros com mais de 30 dias foram apagados.', 'info');
      setConfirmPurge(false);
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível apagar os registros antigos.', 'danger');
    } finally {
      setIsPurgingLogs(false);
    }
  };

  const filteredLogs = useMemo(
    () =>
      logs.filter((l) => {
        const matchesResult = logFilterResult === 'all' || l.result === logFilterResult;
        const q = logSearchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          (l.student_name || '').toLowerCase().includes(q) ||
          (l.picker_name || '').toLowerCase().includes(q) ||
          (l.token_code && l.token_code.toLowerCase().includes(q)) ||
          (l.inspector_name && l.inspector_name.toLowerCase().includes(q)) ||
          (l.picker_cpf && l.picker_cpf.includes(q));
        return matchesResult && matchesSearch;
      }),
    [logs, logFilterResult, logSearchQuery],
  );

  const approvedCount = logs.filter((l) => l.result === 'LIBERADO').length;
  const refusedCount = logs.filter((l) => l.result === 'RECUSADO').length;
  const scannedStudent = scannedAuth?.students_payload?.[0];

  return (
    <div className="space-y-6 text-left">
      <ModuleHeader
        icon={QrCode}
        title="Portaria"
        text="Confira o código de saída que a família gerou no app, veja quem está autorizado a buscar e libere ou recuse a saída."
        actions={
          <>
            <Button icon={Plus} onClick={openEmit}>
              Gerar código na secretaria
            </Button>
            <RoundIconButton icon={RefreshCw} label="Atualizar" onClick={loadData} spinning={isSyncing} disabled={isSyncing} />
          </>
        }
      />

      <MetricStrip
        items={[
          { label: 'Saídas liberadas hoje', value: metrics.authorizedToday, icon: CheckCircle2, tone: 'success' },
          { label: 'Códigos aguardando', value: metrics.pendingTokens, icon: Clock, tone: metrics.pendingTokens > 0 ? 'warning' : 'neutral', hint: 'Ainda não passaram na portaria' },
          { label: 'Saídas recusadas hoje', value: metrics.refusedToday, icon: XCircle, tone: metrics.refusedToday > 0 ? 'danger' : 'neutral' },
          { label: 'Posto atual', value: <span className="block truncate font-sans text-[16px] leading-tight">{portariaName}</span>, icon: Building2, hint: inspectorName },
        ]}
      />

      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* Conferir código */}
        <Card className="lg:col-span-5">
          <CardHeader icon={ScanLine} title="Conferir código" subtitle="Digite o código ou use o leitor de QR" />

          <form onSubmit={handleSearchToken} className="space-y-2">
            <label htmlFor="gate-token" className="text-[13px] font-semibold text-[var(--text-heading)]">
              Código de saída
            </label>
            <div className="flex gap-2">
              <input
                id="gate-token"
                ref={tokenInputRef}
                autoComplete="off"
                autoFocus
                placeholder="EDU-2026-XXXX-XXXX"
                value={inputToken}
                onChange={(e) => {
                  setInputToken(e.target.value.toUpperCase());
                  setTokenNotFound(false);
                }}
                className={cx(inputCls, 'h-12 font-mono text-[16px] font-semibold tracking-wider')}
              />
              <Button type="submit" icon={Search} loading={isSearchingToken} disabled={!inputToken.trim()} className="h-12" aria-label="Conferir">
                <span className="hidden sm:inline">Conferir</span>
              </Button>
            </div>
            <p className="text-[12px] text-[var(--text-muted)]">Leitores de QR por USB funcionam neste campo: aponte para o código e ele é conferido sozinho.</p>
          </form>

          {tokenNotFound && (
            <div className="mt-4">
              <Alert tone="danger" title="Código não encontrado">
                Confira se foi digitado certo. O código pode ter expirado ou já ter sido usado.
              </Alert>
            </div>
          )}

          <div className="mt-6 space-y-4 border-t border-[var(--border)] pt-5">
            <Field
              label="Posto de portaria"
              hint={
                <button type="button" onClick={() => setIsNewPortariaModalOpen(true)} className="font-semibold text-[var(--accent)] hover:underline">
                  + Cadastrar outro posto
                </button>
              }
            >
              {(id) => (
                <select id={id} value={selectedPortariaId} onChange={(e) => setSelectedPortariaId(e.target.value)} className={inputCls} disabled={portarias.length === 0}>
                  {portarias.length === 0 && <option value="">Nenhum posto cadastrado</option>}
                  {portarias.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.location ? ` — ${p.location}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Quem está na portaria">
              {(id) => (
                <select id={id} value={selectedInspectorId} onChange={(e) => setSelectedInspectorId(e.target.value)} className={inputCls} disabled={inspectors.length === 0}>
                  {inspectors.length === 0 && <option value="">{user?.name || 'Nenhum inspetor cadastrado'}</option>}
                  {inspectors.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                      {i.role ? ` — ${i.role}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
        </Card>

        {/* Autorização */}
        <Card className="lg:col-span-7">
          <CardHeader
            icon={UserCheck}
            title="Autorização de saída"
            subtitle={scannedAuth ? 'Confira a pessoa antes de liberar' : 'Aparece aqui depois de conferir o código'}
            action={scannedAuth ? <Badge tone="accent" className="font-mono">{scannedAuth.token_code}</Badge> : undefined}
          />

          {scannedAuth ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-5 sm:flex-row">
                <div className="flex shrink-0 flex-col items-center gap-2 text-center">
                  {scannedStudent?.photo_url || scannedStudent?.avatar_url ? (
                    <img
                      src={scannedStudent.photo_url || scannedStudent.avatar_url}
                      alt={`Foto de ${scannedStudent?.name || 'estudante'}`}
                      className="h-28 w-28 rounded-2xl object-cover ring-2 ring-[var(--accent)]"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Avatar name={scannedStudent?.name} size={112} />
                  )}
                  {(scannedStudent?.grade || scannedStudent?.room) && <Badge>{scannedStudent?.grade || scannedStudent?.room}</Badge>}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-[var(--text-muted)]">Estudante</p>
                  <h3 className="font-serif text-[22px] font-semibold leading-tight text-[var(--text-heading)]">{scannedStudent?.name || 'Estudante'}</h3>
                  {(scannedAuth.students_payload?.length || 0) > 1 && (
                    <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                      + {(scannedAuth.students_payload?.length || 1) - 1} estudante(s) no mesmo código:{' '}
                      {scannedAuth.students_payload
                        ?.slice(1)
                        .map((s: any) => s.name)
                        .join(', ')}
                    </p>
                  )}

                  <div className="mt-4 rounded-2xl bg-[var(--bg-card-alt)] px-4 py-2">
                    <p className="pt-1 text-[12px] font-semibold text-[var(--accent)]">Quem vai buscar</p>
                    <p className="text-[16px] font-semibold text-[var(--text-heading)]">{scannedAuth.retiree_name}</p>
                    <div className="divide-y divide-[var(--border)]">
                      <InfoRow label="Vínculo">{scannedAuth.retiree_relationship || 'Responsável'}</InfoRow>
                      <InfoRow label="CPF">
                        <span className="font-mono">{maskCpfDisplay(scannedAuth.retiree_cpf)}</span>
                      </InfoRow>
                      {scannedAuth.retiree_phone && <InfoRow label="Telefone">{scannedAuth.retiree_phone}</InfoRow>}
                      <InfoRow label="Motivo">{scannedAuth.reason || 'Saída autorizada'}</InfoRow>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
                <Button variant="ghost" onClick={clearInspection} disabled={isProcessingAction}>
                  Cancelar
                </Button>
                <Button variant="danger" icon={XCircle} onClick={() => setIsRejectModalOpen(true)} disabled={isProcessingAction}>
                  Recusar saída
                </Button>
                <Button icon={CheckCircle2} onClick={handleApprovePickup} loading={isProcessingAction} style={{ background: '#127A4B', color: '#fff' }}>
                  Liberar saída
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState icon={QrCode} title="Nenhum código conferido" text="Digite ou leia o código de saída ao lado para ver o estudante e quem vai buscar." compact />
          )}
        </Card>
      </div>

      {/* Histórico */}
      <Card padded={false} className="overflow-hidden">
        <div className="p-5 pb-0 sm:p-6 sm:pb-0">
          <CardHeader
            icon={FileText}
            title="Histórico da portaria"
            subtitle="Saídas liberadas e recusadas. Registros com mais de 30 dias são apagados."
            action={
              <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setConfirmPurge(true)}>
                <span className="hidden sm:inline">Apagar antigos</span>
              </Button>
            }
          />
        </div>
        <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 pb-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Segmented
            label="Resultado"
            value={logFilterResult}
            onChange={setLogFilterResult}
            items={[
              { id: 'all', label: 'Todos', count: logs.length },
              { id: 'LIBERADO', label: 'Liberadas', count: approvedCount },
              { id: 'RECUSADO', label: 'Recusadas', count: refusedCount },
            ]}
          />
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="search"
              aria-label="Buscar no histórico"
              placeholder="Estudante, quem buscou ou CPF"
              value={logSearchQuery}
              onChange={(e) => setLogSearchQuery(e.target.value)}
              className={cx(inputCls, 'pl-10')}
            />
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-5">
            <EmptyState icon={FileText} title={logs.length === 0 ? 'Nenhuma saída registrada ainda' : 'Nada encontrado com esses filtros'} compact />
          </div>
        ) : (
          <TableShell minWidth={880}>
            <thead className="bg-[var(--bg-card-alt)]">
              <tr>
                <th className={thCls}>Data e hora</th>
                <th className={thCls}>Estudante</th>
                <th className={thCls}>Quem buscou</th>
                <th className={thCls}>Posto</th>
                <th className={thCls}>Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="transition-colors hover:bg-[var(--bg-card-alt)]">
                  <td className={cx(tdCls, 'whitespace-nowrap text-[13px] tabular-nums')}>{log.access_time}</td>
                  <td className={tdCls}>
                    <p className="font-semibold text-[var(--text-heading)]">{log.student_name}</p>
                    {log.student_grade && <p className="text-[12px] text-[var(--text-muted)]">{log.student_grade}</p>}
                  </td>
                  <td className={tdCls}>
                    <p className="text-[var(--text-heading)]">{log.picker_name}</p>
                    <p className="text-[12px] text-[var(--text-muted)]">
                      {log.picker_relation || 'Responsável'} · <span className="font-mono">{maskCpfDisplay(log.picker_cpf)}</span>
                    </p>
                  </td>
                  <td className={tdCls}>
                    <p className="text-[var(--text-heading)]">{log.portaria_name}</p>
                    {log.inspector_name && <p className="text-[12px] text-[var(--text-muted)]">{log.inspector_name}</p>}
                  </td>
                  <td className={tdCls}>
                    {log.result === 'LIBERADO' ? (
                      <Badge tone="success">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Liberada
                      </Badge>
                    ) : (
                      <Badge tone="danger">
                        <XCircle className="h-3.5 w-3.5" /> Recusada
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>

      {/* Recusar */}
      <Modal
        open={isRejectModalOpen}
        onClose={() => !isProcessingAction && setIsRejectModalOpen(false)}
        size="sm"
        icon={<ShieldAlert className="h-5 w-5" />}
        title="Recusar saída"
        subtitle="O motivo fica no histórico da portaria"
        footer={
          <>
            <Button variant="secondary" disabled={isProcessingAction} onClick={() => setIsRejectModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" loading={isProcessingAction} onClick={handleRejectPickupSubmit}>
              Recusar saída
            </Button>
          </>
        }
      >
        <fieldset className="space-y-2">
          <legend className="mb-2 text-[13px] font-semibold text-[var(--text-heading)]">Motivo</legend>
          {REJECT_REASONS.map((r) => (
            <label
              key={r}
              className={cx(
                'flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-[14px] transition-colors',
                rejectionReason === r ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-heading)]' : 'border-[var(--border)] text-[var(--text-body)] hover:border-[var(--accent)]',
              )}
            >
              <input type="radio" name="reject-reason" value={r} checked={rejectionReason === r} onChange={() => setRejectionReason(r)} className="accent-[var(--accent)]" />
              {r}
            </label>
          ))}
        </fieldset>
      </Modal>

      {/* Novo posto */}
      <Modal
        open={isNewPortariaModalOpen}
        onClose={() => !isSavingPortaria && setIsNewPortariaModalOpen(false)}
        size="sm"
        icon={<Building2 className="h-5 w-5" />}
        title="Cadastrar posto de portaria"
        footer={
          <>
            <Button variant="secondary" disabled={isSavingPortaria} onClick={() => setIsNewPortariaModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="portaria-form" loading={isSavingPortaria}>
              Salvar posto
            </Button>
          </>
        }
      >
        <form id="portaria-form" onSubmit={handleCreatePortariaSubmit} className="space-y-4">
          <Field label="Nome do posto" required>
            {(id) => <input id={id} required placeholder="Ex.: Portão 3 — Rua de trás" value={newPortariaName} onChange={(e) => setNewPortariaName(e.target.value)} className={inputCls} />}
          </Field>
          <Field label="Referência">
            {(id) => <input id={id} placeholder="Ex.: Ao lado do ginásio" value={newPortariaLocation} onChange={(e) => setNewPortariaLocation(e.target.value)} className={inputCls} />}
          </Field>
        </form>
      </Modal>

      {/* Gerar código */}
      <Modal
        open={isEmitTokenModalOpen}
        onClose={() => !isEmittingToken && setIsEmitTokenModalOpen(false)}
        size="md"
        icon={<QrCode className="h-5 w-5" />}
        title={emittedTokenSuccess ? 'Código gerado' : 'Gerar código de saída'}
        subtitle={emittedTokenSuccess ? 'Vale por 6 horas' : 'Para quando a família pede a saída pela secretaria'}
        footer={
          emittedTokenSuccess ? (
            <Button onClick={() => setIsEmitTokenModalOpen(false)}>Concluir</Button>
          ) : (
            <>
              <Button variant="secondary" disabled={isEmittingToken} onClick={() => setIsEmitTokenModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" form="emit-form" icon={QrCode} loading={isEmittingToken}>
                Gerar código
              </Button>
            </>
          )
        }
      >
        {emittedTokenSuccess ? (
          <div className="space-y-4 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ background: '#E7F6EE', color: '#127A4B' }}>
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <p className="text-[14px] text-[var(--text-body)]">Informe este código na portaria. Ele já aparece em “Códigos aguardando”.</p>
            <p className="rounded-2xl border-2 border-dashed border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-5 font-mono text-[24px] font-bold tracking-wider text-[var(--text-heading)]">
              {emittedTokenSuccess}
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                navigator.clipboard?.writeText(emittedTokenSuccess).then(
                  () => showToast('Código copiado.', 'info'),
                  () => undefined,
                );
              }}
            >
              Copiar código
            </Button>
          </div>
        ) : (
          <form id="emit-form" onSubmit={handleEmitTokenSubmit} className="space-y-4">
            {emitError && <Alert tone="danger">{emitError}</Alert>}
            <Field label="Estudante" required>
              {(id) => (
                <select id={id} required value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className={inputCls}>
                  <option value="">{students?.length ? 'Escolha o estudante' : 'Nenhum estudante carregado'}</option>
                  {students?.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.turma || s.grade ? ` — ${s.turma || s.grade}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Quem vai buscar" required>
                {(id) => <input id={id} required placeholder="Nome completo" value={emitPickerName} onChange={(e) => setEmitPickerName(e.target.value)} className={inputCls} />}
              </Field>
              <Field label="CPF" required>
                {(id) => (
                  <input
                    id={id}
                    required
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    value={emitPickerCpf}
                    onChange={(e) => setEmitPickerCpf(maskCPF(e.target.value))}
                    className={cx(inputCls, 'font-mono')}
                  />
                )}
              </Field>
              <Field label="Vínculo">
                {(id) => (
                  <select id={id} value={emitPickerRelation} onChange={(e) => setEmitPickerRelation(e.target.value)} className={inputCls}>
                    {RELATIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Telefone">
                {(id) => (
                  <input
                    id={id}
                    inputMode="tel"
                    placeholder="(00) 00000-0000"
                    value={emitPickerPhone}
                    onChange={(e) => setEmitPickerPhone(maskCellPhone(e.target.value))}
                    className={inputCls}
                  />
                )}
              </Field>
            </div>
            <Field label="Motivo da saída">
              {(id) => <input id={id} placeholder="Ex.: Consulta médica" value={emitReason} onChange={(e) => setEmitReason(e.target.value)} className={inputCls} />}
            </Field>
          </form>
        )}
      </Modal>

      <ConfirmModal
        open={confirmPurge}
        onClose={() => setConfirmPurge(false)}
        onConfirm={handlePurgeLogs}
        loading={isPurgingLogs}
        title="Apagar registros antigos?"
        confirmLabel="Apagar"
        icon={Trash2}
      >
        Os registros da portaria com mais de 30 dias serão apagados agora. Isso já acontece sozinho; use só se precisar limpar antes.
      </ConfirmModal>

      <Toast message={toast?.text ?? null} tone={toast?.type} onClose={() => setToast(null)} />
    </div>
  );
}