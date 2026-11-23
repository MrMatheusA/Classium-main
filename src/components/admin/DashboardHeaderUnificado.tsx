import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Award, Building, CloudSun, ImagePlus, Mail, MapPin, Pencil, Phone, Plus, School, Trash2, Users } from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { useAuth } from '../../hooks/useAuth';
import {
  institutionService,
  InstitutionData,
  ManagementTeamMember,
  ManagementRole,
  MANAGEMENT_ROLES,
} from '../../services/institutionService';
import { RealtimeService } from '../../services/RealtimeService';
import { fetchLiveWeather } from '../../services/weatherService';
import { isValidCNPJ, maskCEP, maskCNPJ, maskCellPhone } from '../../utils/masks';
import { Alert, Badge, Button, EmptyState, Field, Modal, PillNav, Skeleton, Toast, cx, inputCls } from '../ui/kit';
import { ConfirmModal } from '../ui/ModuleParts';
import { useActiveOrgId } from '../../hooks/useActiveOrgId';

const realtimeService = RealtimeService.getInstance();

type ModalTab = 'cadastrais' | 'endereco' | 'termos' | 'gestao';

interface DashboardHeaderUnificadoProps {
  className?: string;
  onDataUpdated?: () => void;
  openTabRequested?: ModalTab | null;
}

interface FormState {
  officialName: string;
  fantasyName: string;
  cnpj: string;
  stateRegistration: string;
  inepCode: string;
  phoneFixed: string;
  phoneMobile: string;
  email: string;
  website: string;
  logoUrl: string;
  postalCode: string;
  address: string;
  city: string;
  state: string;
}

const EMPTY_FORM: FormState = {
  officialName: '', fantasyName: '', cnpj: '', stateRegistration: '', inepCode: '',
  phoneFixed: '', phoneMobile: '', email: '', website: '', logoUrl: '',
  postalCode: '', address: '', city: '', state: '',
};

const TAB_TITLES: Record<ModalTab, string> = {
  cadastrais: 'Dados cadastrais',
  endereco: 'Endereço',
  termos: 'INEP',
  gestao: 'Equipe gestora',
};

function formFrom(org: InstitutionData): FormState {
  return {
    officialName: org.official_name || org.name || '',
    fantasyName: org.fantasy_name || org.trade_name || '',
    cnpj: org.cnpj ? maskCNPJ(org.cnpj) : '',
    stateRegistration: org.state_registration || '',
    inepCode: org.inep_code || '',
    phoneFixed: org.phone_fixed ? maskCellPhone(org.phone_fixed) : '',
    phoneMobile: org.phone_mobile ? maskCellPhone(org.phone_mobile) : '',
    email: org.email || '',
    website: org.website || '',
    logoUrl: org.logo_url || '',
    postalCode: org.postal_code ? maskCEP(org.postal_code) : '',
    address: org.address || '',
    city: org.city || '',
    state: org.state || '',
  };
}

const roleLabel = (m: ManagementTeamMember) => (m.role === 'Outro' && m.custom_role_title ? m.custom_role_title : m.role);

export function DashboardHeaderUnificado({ className = '', onDataUpdated, openTabRequested }: DashboardHeaderUnificadoProps) {
  const { currentUser } = usePlatform();
  const { profile } = useAuth();
  const { orgId: activeOrgId, resolving: resolvingOrg } = useActiveOrgId(
    profile?.organization_id,
    profile?.school_id,
    currentUser?.organization_id,
    currentUser?.school_id,
    currentUser?.organizationId
  );

  const [org, setOrg] = useState<InstitutionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'danger' } | null>(null);
  const [weather, setWeather] = useState<{ temp: number; description: string } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState<ModalTab>('cadastrais');

  const [cepLoading, setCepLoading] = useState(false);
  const [cepNote, setCepNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);

  const [team, setTeam] = useState<ManagementTeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [memberForm, setMemberForm] = useState<{ id?: string; name: string; role: ManagementRole; custom: string; email: string; phone: string } | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [savingMember, setSavingMember] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<ManagementTeamMember | null>(null);
  const [removing, setRemoving] = useState(false);

  const canEdit = org?.can_edit === true;
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(prev => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  /* ---------------------------- Carregar ---------------------------- */

  const loadOrg = useCallback(async () => {
    if (!activeOrgId) {
      if (resolvingOrg) return;
      setLoading(false);
      setLoadError('Não foi possível identificar a escola deste usuário.');
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const data = await institutionService.getOrganization(activeOrgId);
      setOrg(data);
      setForm(formFrom(data));
    } catch (err: any) {
      setLoadError(err?.message || 'Não foi possível carregar os dados da escola.');
    } finally {
      setLoading(false);
    }
  }, [activeOrgId, resolvingOrg]);

  const loadTeam = useCallback(async () => {
    if (!activeOrgId) return;
    setTeamLoading(true);
    setTeamError(null);
    try {
      setTeam(await institutionService.getManagementTeam(activeOrgId));
    } catch (err: any) {
      setTeamError(err?.message || 'Não foi possível carregar a equipe gestora.');
    } finally {
      setTeamLoading(false);
    }
  }, [activeOrgId]);

  useEffect(() => {
    loadOrg();
    loadTeam();
    if (!activeOrgId) return;
    const unsubs = [
      realtimeService.subscribe(`header_org_${activeOrgId}`, { table: 'organizations', filter: `id=eq.${activeOrgId}` }, () => {
        if (!modalOpen) loadOrg();
      }),
      realtimeService.subscribe(`header_staff_${activeOrgId}`, { table: 'school_staff', filter: `organization_id=eq.${activeOrgId}` }, () => loadTeam()),
    ];
    return () => unsubs.forEach(u => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId, loadOrg, loadTeam]);

  useEffect(() => {
    const city = org?.city;
    if (!city) {
      setWeather(null);
      return;
    }
    fetchLiveWeather(city)
      .then(w => setWeather(w ? { temp: w.temp, description: w.description } : null))
      .catch(() => setWeather(null));
  }, [org?.city]);

  /* ---------------------------- Abrir janela ---------------------------- */

  const openModal = (t: ModalTab) => {
    if (org) setForm(formFrom(org));
    setFormError(null);
    setCepNote(null);
    setTab(t);
    setModalOpen(true);
  };

  useEffect(() => {
    if (openTabRequested) openModal(openTabRequested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTabRequested]);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ tab?: ModalTab }>).detail;
      openModal(detail?.tab || 'cadastrais');
    };
    window.addEventListener('classium_open_school_modal', onOpen);
    return () => window.removeEventListener('classium_open_school_modal', onOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org]);

  /* ---------------------------- CEP ---------------------------- */

  const onCepChange = async (value: string) => {
    const masked = maskCEP(value);
    set('postalCode', masked);
    setCepNote(null);
    const digits = masked.replace(/\D/g, '');
    if (digits.length !== 8) return;

    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepNote({ ok: false, text: 'CEP não encontrado. Preencha o endereço à mão.' });
        return;
      }
      setForm(prev => ({
        ...prev,
        address: [data.logradouro, data.bairro].filter(Boolean).join(' - ') || prev.address,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
      }));
      setCepNote({ ok: true, text: `Endereço encontrado em ${data.localidade} - ${data.uf}. Complete com o número.` });
    } catch {
      setCepNote({ ok: false, text: 'Não foi possível consultar o CEP agora. Preencha o endereço à mão.' });
    } finally {
      setCepLoading(false);
    }
  };

  /* ---------------------------- Logo ---------------------------- */

  const onLogoPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLogoUploading(true);
    setFormError(null);
    try {
      set('logoUrl', await institutionService.uploadLogo(activeOrgId, file));
    } catch (err: any) {
      setFormError(err?.message || 'Não foi possível enviar o logo.');
    } finally {
      setLogoUploading(false);
    }
  };

  /* ---------------------------- Salvar ---------------------------- */

  const save = async () => {
    setFormError(null);
    if (!form.officialName.trim()) {
      setTab('cadastrais');
      return setFormError('Informe o nome oficial da escola.');
    }
    if (form.cnpj && !isValidCNPJ(form.cnpj)) {
      setTab('cadastrais');
      return setFormError('CNPJ inválido. Confira os números.');
    }

    setSaving(true);
    const res = await institutionService.updateOrganization(activeOrgId, {
      official_name: form.officialName,
      fantasy_name: form.fantasyName,
      cnpj: form.cnpj,
      state_registration: form.stateRegistration,
      inep_code: form.inepCode,
      phone_fixed: form.phoneFixed,
      phone_mobile: form.phoneMobile,
      email: form.email,
      website: form.website,
      logo_url: form.logoUrl,
      postal_code: form.postalCode,
      address: form.address,
      city: form.city,
      state: form.state,
    });
    setSaving(false);

    if (!res.success || !res.data) return setFormError(res.error || 'Não foi possível salvar.');
    setOrg(res.data);
    setForm(formFrom(res.data));
    setModalOpen(false);
    setToast({ message: 'Dados da escola salvos.', tone: 'success' });
    onDataUpdated?.();
  };

  /* ---------------------------- Equipe ---------------------------- */

  const saveMember = async () => {
    if (!memberForm) return;
    setMemberError(null);
    setSavingMember(true);
    const data = {
      name: memberForm.name,
      role: memberForm.role,
      custom_role_title: memberForm.custom,
      email: memberForm.email,
      phone: memberForm.phone,
    };
    const res = memberForm.id
      ? await institutionService.updateManagementTeamMember(activeOrgId, memberForm.id, data)
      : await institutionService.addManagementTeamMember(activeOrgId, data);
    setSavingMember(false);

    if (!res.success) return setMemberError(res.error || 'Não foi possível salvar.');
    setMemberForm(null);
    await loadTeam();
    setToast({ message: memberForm.id ? 'Cadastro atualizado.' : `${memberForm.name.trim()} entrou na equipe gestora.`, tone: 'success' });
    onDataUpdated?.();
  };

  const removeMember = async () => {
    if (!memberToRemove) return;
    setRemoving(true);
    const res = await institutionService.deleteManagementTeamMember(activeOrgId, memberToRemove.id);
    setRemoving(false);
    if (!res.success) {
      setToast({ message: res.error || 'Não foi possível remover.', tone: 'danger' });
    } else {
      setToast({ message: `${memberToRemove.name} saiu da equipe gestora.`, tone: 'success' });
      await loadTeam();
      onDataUpdated?.();
    }
    setMemberToRemove(null);
  };

  /* ---------------------------- Visual ---------------------------- */

  const schoolName = org?.fantasy_name || org?.official_name || '';
  const userName = (profile?.name || profile?.full_name || currentUser?.name || '').split(' ')[0];
  const today = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const disabled = !canEdit || saving;

  return (
    <div className={cx('w-full', className)}>
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)] p-5 sm:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(to right, var(--accent-soft) 1px, transparent 1px), linear-gradient(to bottom, var(--accent-soft) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse 55% 90% at 100% 0%, black, transparent)',
            WebkitMaskImage: 'radial-gradient(ellipse 55% 90% at 100% 0%, black, transparent)',
          }}
        />

        <div className="relative space-y-5">
          {loading ? (
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
          ) : loadError ? (
            <Alert tone="danger" action={<Button size="sm" variant="secondary" onClick={loadOrg}>Tentar de novo</Button>}>{loadError}</Alert>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
                  {org?.logo_url ? (
                    <img src={org.logo_url} alt="" className="h-full w-full object-contain p-1" />
                  ) : (
                    <School className="h-6 w-6 text-[var(--accent)]" />
                  )}
                </span>
                <div className="min-w-0">
                  <h1 className="truncate font-serif text-[24px] font-semibold leading-tight tracking-[-0.015em] text-[var(--text-heading)] sm:text-[28px]">
                    {schoolName || 'Escola sem nome cadastrado'}
                  </h1>
                  <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">
                    {[org?.cnpj && `CNPJ ${org.cnpj}`, org?.inep_code && `INEP ${org.inep_code}`, [org?.city, org?.state].filter(Boolean).join(' - ')]
                      .filter(Boolean)
                      .join(' · ') || 'Complete os dados da escola para aparecerem nos documentos.'}
                  </p>
                </div>
              </div>
              {!canEdit && <Badge>Somente leitura</Badge>}
            </div>
          )}

          <div>
            <p className="text-[17px] font-semibold text-[var(--text-heading)]">{userName ? `Olá, ${userName}.` : 'Olá.'}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--text-muted)]">
              <span className="first-letter:uppercase">{today}</span>
              {weather && org?.city && (
                <span className="inline-flex items-center gap-1.5">
                  <CloudSun className="h-4 w-4" aria-hidden /> {org.city}: {Math.round(weather.temp)}°C, {weather.description}
                </span>
              )}
            </p>
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {([
              { t: 'cadastrais', label: 'Dados cadastrais', icon: Building },
              { t: 'endereco', label: 'Endereço', icon: MapPin },
              { t: 'termos', label: 'INEP', icon: Award },
              { t: 'gestao', label: 'Equipe gestora', icon: Users },
            ] as const).map(({ t, label, icon: Icon }) => (
              <button
                key={t}
                type="button"
                onClick={() => openModal(t)}
                disabled={!org}
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 text-[13px] font-semibold text-[var(--text-body)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
              >
                <Icon className="h-4 w-4" aria-hidden /> {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        size="lg"
        icon={<Building className="h-5 w-5" />}
        title={TAB_TITLES[tab]}
        subtitle={schoolName || undefined}
        footer={
          tab === 'gestao' ? (
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Fechar</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={save} loading={saving} disabled={!canEdit || logoUploading}>Salvar</Button>
            </>
          )
        }
      >
        <div className="space-y-5">
          <PillNav<ModalTab>
            label="Seções"
            value={tab}
            onChange={setTab}
            items={[
              { id: 'cadastrais', label: 'Dados cadastrais', icon: Building },
              { id: 'endereco', label: 'Endereço', icon: MapPin },
              { id: 'termos', label: 'INEP', icon: Award },
              { id: 'gestao', label: 'Equipe gestora', icon: Users, badge: team.length || undefined },
            ]}
          />

          {!canEdit && tab !== 'gestao' && <Alert tone="info">Só a direção ou a secretaria pode alterar estes dados.</Alert>}
          {formError && tab !== 'gestao' && <Alert tone="danger">{formError}</Alert>}

          {tab === 'cadastrais' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-2xl border border-[var(--border)] p-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card-alt)]">
                  {form.logoUrl ? <img src={form.logoUrl} alt="Logo da escola" className="h-full w-full object-contain p-1" /> : <School className="h-6 w-6 text-[var(--text-muted)]" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-[var(--text-heading)]">Logo da escola</p>
                  <p className="text-[12px] text-[var(--text-muted)]">Aparece no painel, nos documentos e no portal da família. PNG ou SVG, até 5 MB.</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {form.logoUrl && (
                    <Button variant="ghost" size="sm" onClick={() => set('logoUrl', '')} disabled={disabled}>Remover</Button>
                  )}
                  <Button variant="secondary" size="sm" icon={ImagePlus} onClick={() => logoInput.current?.click()} loading={logoUploading} disabled={disabled}>
                    {form.logoUrl ? 'Trocar' : 'Enviar'}
                  </Button>
                  <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={onLogoPicked} />
                </div>
              </div>

              <Field label="Nome oficial (razão social)" required>
                {id => <input id={id} className={inputCls} value={form.officialName} onChange={e => set('officialName', e.target.value)} disabled={disabled} />}
              </Field>
              <Field label="Nome usado no dia a dia" hint="É o nome que aparece no topo do painel e para as famílias.">
                {id => <input id={id} className={inputCls} value={form.fantasyName} onChange={e => set('fantasyName', e.target.value)} disabled={disabled} />}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="CNPJ">
                  {id => <input id={id} className={inputCls} inputMode="numeric" placeholder="00.000.000/0000-00" value={form.cnpj} onChange={e => set('cnpj', maskCNPJ(e.target.value))} disabled={disabled} />}
                </Field>
                <Field label="Inscrição estadual" hint="Deixe em branco se a escola for isenta.">
                  {id => <input id={id} className={inputCls} value={form.stateRegistration} onChange={e => set('stateRegistration', e.target.value)} disabled={disabled} />}
                </Field>
                <Field label="Telefone">
                  {id => <input id={id} className={inputCls} inputMode="tel" placeholder="(00) 0000-0000" value={form.phoneFixed} onChange={e => set('phoneFixed', maskCellPhone(e.target.value))} disabled={disabled} />}
                </Field>
                <Field label="Celular ou WhatsApp">
                  {id => <input id={id} className={inputCls} inputMode="tel" placeholder="(00) 00000-0000" value={form.phoneMobile} onChange={e => set('phoneMobile', maskCellPhone(e.target.value))} disabled={disabled} />}
                </Field>
                <Field label="E-mail">
                  {id => <input id={id} type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} disabled={disabled} />}
                </Field>
                <Field label="Site">
                  {id => <input id={id} className={inputCls} placeholder="https://" value={form.website} onChange={e => set('website', e.target.value)} disabled={disabled} />}
                </Field>
              </div>
            </div>
          )}

          {tab === 'endereco' && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[180px_1fr_100px]">
                <Field label="CEP" hint={cepLoading ? 'Buscando…' : undefined}>
                  {id => <input id={id} className={inputCls} inputMode="numeric" placeholder="00000-000" value={form.postalCode} onChange={e => onCepChange(e.target.value)} disabled={disabled} />}
                </Field>
                <Field label="Cidade">
                  {id => <input id={id} className={inputCls} value={form.city} onChange={e => set('city', e.target.value)} disabled={disabled} />}
                </Field>
                <Field label="UF">
                  {id => <input id={id} className={cx(inputCls, 'uppercase')} maxLength={2} value={form.state} onChange={e => set('state', e.target.value.toUpperCase())} disabled={disabled} />}
                </Field>
              </div>
              <Field label="Endereço" hint="Rua, número e bairro.">
                {id => <input id={id} className={inputCls} value={form.address} onChange={e => set('address', e.target.value)} disabled={disabled} />}
              </Field>
              {cepNote && <Alert tone={cepNote.ok ? 'success' : 'warning'}>{cepNote.text}</Alert>}
            </div>
          )}

          {tab === 'termos' && (
            <Field label="Código INEP" hint="Código da escola no Censo Escolar. Aparece em históricos, diários e relatórios.">
              {id => (
                <input
                  id={id}
                  className={cx(inputCls, 'max-w-xs tabular-nums')}
                  inputMode="numeric"
                  maxLength={8}
                  value={form.inepCode}
                  onChange={e => set('inepCode', e.target.value.replace(/\D/g, '').slice(0, 8))}
                  disabled={disabled}
                />
              )}
            </Field>
          )}

          {tab === 'gestao' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] text-[var(--text-muted)]">Direção e coordenação. Aparecem no painel e nos documentos.</p>
                {canEdit && (
                  <Button
                    size="sm"
                    icon={Plus}
                    onClick={() => {
                      setMemberError(null);
                      setMemberForm({ name: '', role: team.some(m => m.role === 'Diretor(a) Geral') ? 'Vice-Diretor(a)' : 'Diretor(a) Geral', custom: '', email: '', phone: '' });
                    }}
                  >
                    Adicionar
                  </Button>
                )}
              </div>

              {teamError && <Alert tone="danger" action={<Button size="sm" variant="secondary" onClick={loadTeam}>Tentar de novo</Button>}>{teamError}</Alert>}

              {teamLoading ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                </div>
              ) : team.length === 0 ? (
                <EmptyState compact icon={Users} title="Ninguém na equipe gestora" text="Adicione direção, vice-direção e coordenação." />
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {team.map(m => (
                    <li key={m.id} className="rounded-2xl border border-[var(--border)] p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold text-[var(--text-heading)]">{m.name}</p>
                          <div className="mt-1"><Badge tone="accent">{roleLabel(m)}</Badge></div>
                        </div>
                        {canEdit && (
                          <div className="flex shrink-0 gap-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setMemberError(null);
                                setMemberForm({ id: m.id, name: m.name, role: m.role, custom: m.custom_role_title || '', email: m.email || '', phone: m.phone || '' });
                              }}
                              className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-card-alt)] hover:text-[var(--text-heading)]"
                              aria-label={`Editar ${m.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setMemberToRemove(m)}
                              className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[#FDECEC] hover:text-[#B42318]"
                              aria-label={`Remover ${m.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      {(m.email || m.phone) && (
                        <div className="mt-3 space-y-1 border-t border-[var(--border)] pt-3 text-[13px] text-[var(--text-body)]">
                          {m.email && <p className="flex items-center gap-2 truncate"><Mail className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" /> {m.email}</p>}
                          {m.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" /> {m.phone}</p>}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={!!memberForm}
        onClose={() => setMemberForm(null)}
        icon={<Users className="h-5 w-5" />}
        title={memberForm?.id ? 'Editar integrante' : 'Novo integrante'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setMemberForm(null)} disabled={savingMember}>Cancelar</Button>
            <Button onClick={saveMember} loading={savingMember}>Salvar</Button>
          </>
        }
      >
        {memberForm && (
          <div className="space-y-4">
            {memberError && <Alert tone="danger">{memberError}</Alert>}
            <Field label="Nome completo" required>
              {id => <input id={id} className={inputCls} value={memberForm.name} onChange={e => setMemberForm({ ...memberForm, name: e.target.value })} autoFocus />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cargo">
                {id => (
                  <select id={id} className={cx(inputCls, 'h-10 py-0')} value={memberForm.role} onChange={e => setMemberForm({ ...memberForm, role: e.target.value as ManagementRole })}>
                    {MANAGEMENT_ROLES.map(r => <option key={r} value={r}>{r === 'Outro' ? 'Outro cargo' : r}</option>)}
                  </select>
                )}
              </Field>
              {memberForm.role === 'Outro' && (
                <Field label="Nome do cargo" required>
                  {id => <input id={id} className={inputCls} value={memberForm.custom} onChange={e => setMemberForm({ ...memberForm, custom: e.target.value })} placeholder="Ex.: Orientador(a) educacional" />}
                </Field>
              )}
              <Field label="E-mail">
                {id => <input id={id} type="email" className={inputCls} value={memberForm.email} onChange={e => setMemberForm({ ...memberForm, email: e.target.value })} />}
              </Field>
              <Field label="Telefone">
                {id => <input id={id} className={inputCls} inputMode="tel" value={memberForm.phone} onChange={e => setMemberForm({ ...memberForm, phone: maskCellPhone(e.target.value) })} />}
              </Field>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={removeMember}
        loading={removing}
        title={`Tirar ${memberToRemove?.name || ''} da equipe gestora?`}
        confirmLabel="Tirar da equipe"
      >
        <p>A pessoa deixa de aparecer na equipe gestora e nos documentos. O cadastro dela em Funcionários continua.</p>
      </ConfirmModal>

      <Toast message={toast?.message ?? null} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}

export default DashboardHeaderUnificado;