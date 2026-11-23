import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Copy, KeyRound, Lock, MessageCircle, Pencil, Plus, RefreshCw, Search, ShieldCheck, Unlock, UserMinus, UserRoundCheck, Users, X,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { staffService, StaffMember, StaffInput, StaffSystemRole, STAFF_ROLE_OPTIONS, roleLabel } from '../../services/staffService';
import { isValidCPF, maskCPF, maskCPFSecret, maskCellPhone } from '../../utils/masks';
import { Alert, Avatar, Badge, Button, EmptyState, Field, Modal, Skeleton, TableShell, Toast, Toggle, cx, inputCls, tdCls, thCls } from '../ui/kit';
import { ConfirmModal, MetricStrip, ModuleHeader, RoundIconButton, Segmented } from '../ui/ModuleParts';
import { useActiveOrgId } from '../../hooks/useActiveOrgId';

/*
 * Funcionários da escola.
 * Quem precisa entrar no sistema recebe um acesso: e-mail + senha provisória.
 * Na primeira entrada o sistema pede para a pessoa criar a própria senha.
 */

type Filter = 'todos' | 'docente' | 'gestao' | 'apoio';
type Credentials = { name: string; email: string; password: string; phone?: string | null; isReset: boolean };

const SHIFTS = ['Manhã', 'Tarde', 'Noite'];
const GESTAO: string[] = ['gestor', 'secretaria', 'coordenacao'];

interface FormState {
  full_name: string;
  cpf: string;
  email: string;
  phone: string;
  role: StaffSystemRole;
  job_title: string;
  shifts: string[];
  createAccess: boolean;
}

const EMPTY_FORM: FormState = {
  full_name: '', cpf: '', email: '', phone: '', role: 'docente', job_title: '', shifts: [], createAccess: true,
};

export function AdminFuncionarios() {
  const { currentOrganization, schoolInfo } = usePlatform();
  const { orgId: organizationId, resolving: resolvingOrg } = useActiveOrgId(currentOrganization?.id, schoolInfo?.id);
  const schoolName: string = currentOrganization?.name || schoolInfo?.name || 'a escola';

  const [items, setItems] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [showInactive, setShowInactive] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'danger' } | null>(null);

  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [copied, setCopied] = useState(false);

  const [grantFor, setGrantFor] = useState<StaffMember | null>(null);
  const [grantEmail, setGrantEmail] = useState('');
  const [grantError, setGrantError] = useState<string | null>(null);
  const [granting, setGranting] = useState(false);

  const [confirm, setConfirm] = useState<{ kind: 'reset' | 'block' | 'unblock' | 'deactivate' | 'reactivate'; staff: StaffMember } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const load = useCallback(async () => {
    if (resolvingOrg) return;
    setLoading(true);
    const res = await staffService.list(organizationId || undefined);
    setItems(res.items);
    setLoadError(res.error);
    setLoading(false);
  }, [organizationId, resolvingOrg]);

  useEffect(() => {
    load();
  }, [load]);

  const active = useMemo(() => items.filter(i => i.status !== 'inativo'), [items]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    return items
      .filter(i => (showInactive ? i.status === 'inativo' : i.status !== 'inativo'))
      .filter(i => {
        if (filter === 'docente') return i.role === 'docente';
        if (filter === 'gestao') return GESTAO.includes(i.role);
        if (filter === 'apoio') return i.role === 'portaria' || i.role === 'funcionario';
        return true;
      })
      .filter(i => {
        if (!q) return true;
        return (
          i.full_name.toLowerCase().includes(q) ||
          (i.email || '').toLowerCase().includes(q) ||
          (i.job_title || '').toLowerCase().includes(q) ||
          (!!digits && (i.cpf || '').includes(digits))
        );
      });
  }, [items, search, filter, showInactive]);

  /* ----------------------------- Formulário ----------------------------- */

  const openNew = () => {
    setEditing(null);
    setFormError(null);
    setForm({ ...EMPTY_FORM });
  };

  const openEdit = (s: StaffMember) => {
    setEditing(s);
    setFormError(null);
    setForm({
      full_name: s.full_name,
      cpf: s.cpf ? maskCPF(s.cpf) : '',
      email: s.email || '',
      phone: s.phone ? maskCellPhone(s.phone) : '',
      role: (STAFF_ROLE_OPTIONS.some(r => r.id === s.role) ? s.role : 'funcionario') as StaffSystemRole,
      job_title: s.job_title || '',
      shifts: s.shifts || [],
      createAccess: false,
    });
  };

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(prev => (prev ? { ...prev, [k]: v } : prev));

  const save = async () => {
    if (!form) return;
    setFormError(null);
    const cpf = form.cpf.replace(/\D/g, '');
    if (cpf && !isValidCPF(cpf)) return setFormError('CPF inválido. Confira os números.');

    const input: StaffInput = {
      full_name: form.full_name,
      cpf,
      email: form.email,
      phone: form.phone,
      role: form.role,
      job_title: form.job_title,
      shifts: form.shifts,
    };

    setSaving(true);
    try {
      if (editing) {
        const res = await staffService.update(editing, input);
        if (!res.success) return setFormError(res.error);
        setForm(null);
        setToast({ message: 'Cadastro salvo.', tone: 'success' });
      } else if (form.createAccess) {
        const res = await staffService.createWithAccess(input, organizationId || undefined);
        if (!res.success || !res.data) return setFormError(res.error);
        setForm(null);
        setCredentials({ name: res.data.staff.full_name, email: res.data.email, password: res.data.temporaryPassword, phone: res.data.staff.phone, isReset: false });
      } else {
        const res = await staffService.create(input, organizationId || undefined);
        if (!res.success) return setFormError(res.error);
        setForm(null);
        setToast({ message: `${form.full_name.trim()} foi cadastrado.`, tone: 'success' });
      }
      await load();
    } finally {
      setSaving(false);
    }
  };

  /* ----------------------------- Acesso ----------------------------- */

  const grant = async () => {
    if (!grantFor) return;
    setGrantError(null);
    setGranting(true);
    const res = await staffService.grantAccess(grantFor, grantEmail);
    setGranting(false);
    if (!res.success || !res.data) return setGrantError(res.error);
    setCredentials({ name: grantFor.full_name, email: res.data.email, password: res.data.temporaryPassword, phone: grantFor.phone, isReset: false });
    setGrantFor(null);
    await load();
  };

  const runConfirm = async () => {
    if (!confirm) return;
    const { kind, staff } = confirm;
    setBusy(true);
    try {
      if (kind === 'reset') {
        const res = await staffService.resetPassword(staff.id, staff.organization_id);
        if (!res.success || !res.data) {
          setToast({ message: res.error || 'Não foi possível gerar a senha.', tone: 'danger' });
        } else {
          setCredentials({ name: staff.full_name, email: res.data.email, password: res.data.temporaryPassword, phone: staff.phone, isReset: true });
        }
      } else if (kind === 'block' || kind === 'unblock') {
        const res = await staffService.setAccess(staff.id, kind === 'unblock', staff.organization_id);
        setToast(res.success
          ? { message: kind === 'block' ? `${staff.full_name} não consegue mais entrar no sistema.` : `${staff.full_name} pode entrar de novo.`, tone: 'success' }
          : { message: res.error || 'Não foi possível alterar o acesso.', tone: 'danger' });
      } else if (kind === 'deactivate') {
        const res = await staffService.deactivate(staff);
        setToast(res.success ? { message: `${staff.full_name} foi desligado.`, tone: 'success' } : { message: res.error || 'Não foi possível desligar.', tone: 'danger' });
      } else if (kind === 'reactivate') {
        const res = await staffService.reactivate(staff);
        setToast(res.success ? { message: `${staff.full_name} voltou para a equipe.`, tone: 'success' } : { message: res.error || 'Não foi possível reativar.', tone: 'danger' });
      }
      await load();
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const copyCredentials = async () => {
    if (!credentials) return;
    const text = `Acesso ao sistema da escola\nE-mail: ${credentials.email}\nSenha provisória: ${credentials.password}\nNa primeira entrada, crie a sua senha.`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setToast({ message: 'Não foi possível copiar. Selecione o texto e copie à mão.', tone: 'danger' });
    }
  };

  const whatsappLink = (c: Credentials) => {
    const digits = (c.phone || '').replace(/\D/g, '');
    if (digits.length < 10) return null;
    const text = encodeURIComponent(
      `Olá, ${c.name.split(' ')[0]}! Seu acesso ao sistema de ${schoolName}:\nE-mail: ${c.email}\nSenha provisória: ${c.password}\nNa primeira entrada, o sistema vai pedir para você criar a sua senha.`
    );
    return `https://wa.me/55${digits}?text=${text}`;
  };

  /* ----------------------------- Visual ----------------------------- */

  const accessBadge = (s: StaffMember) => {
    if (!s.user_id) return <Badge>Sem acesso</Badge>;
    if (!s.access_enabled) return <Badge tone="danger">Bloqueado</Badge>;
    return <Badge tone="success">Com acesso</Badge>;
  };

  const counts = {
    total: active.length,
    docentes: active.filter(i => i.role === 'docente').length,
    comAcesso: active.filter(i => i.user_id && i.access_enabled).length,
    semAcesso: active.filter(i => !i.user_id).length,
  };

  const confirmText: Record<string, { title: string; label: string; body: string; danger: boolean }> = {
    reset: { title: 'Gerar nova senha?', label: 'Gerar senha', body: 'A senha atual deixa de funcionar. A pessoa vai entrar com a senha provisória e criar uma nova.', danger: false },
    block: { title: 'Bloquear o acesso?', label: 'Bloquear', body: 'A pessoa não consegue mais entrar no sistema. O cadastro e o histórico continuam.', danger: true },
    unblock: { title: 'Liberar o acesso?', label: 'Liberar', body: 'A pessoa volta a entrar com a senha que já tinha.', danger: false },
    deactivate: { title: 'Desligar da escola?', label: 'Desligar', body: 'A pessoa sai da lista de funcionários e perde o acesso ao sistema. O que ela registrou continua no histórico.', danger: true },
    reactivate: { title: 'Trazer de volta?', label: 'Reativar', body: 'A pessoa volta para a lista de funcionários. Se tinha acesso, libere de novo depois.', danger: false },
  };

  return (
    <div className="space-y-6 pb-16 text-left">
      <ModuleHeader
        icon={Users}
        title="Funcionários"
        count={loading ? undefined : counts.total}
        text="Professores, gestão e equipe de apoio. Quem precisa entrar no sistema recebe um acesso com senha provisória."
        actions={
          <>
            <RoundIconButton icon={RefreshCw} label="Atualizar" onClick={load} spinning={loading} disabled={loading} />
            <Button icon={Plus} onClick={openNew}>Novo funcionário</Button>
          </>
        }
      >
        <MetricStrip
          items={[
            { label: 'Na equipe', value: counts.total, icon: Users },
            { label: 'Professores', value: counts.docentes, icon: UserRoundCheck, tone: 'accent' },
            { label: 'Com acesso', value: counts.comAcesso, icon: ShieldCheck, tone: 'success' },
            { label: 'Sem acesso', value: counts.semAcesso, icon: KeyRound, tone: counts.semAcesso ? 'warning' : 'neutral' },
          ]}
        />
      </ModuleHeader>

      {loadError && (
        <Alert tone="danger" action={<Button size="sm" variant="secondary" onClick={load}>Tentar de novo</Button>}>{loadError}</Alert>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented<Filter>
          label="Função"
          value={filter}
          onChange={setFilter}
          items={[
            { id: 'todos', label: 'Todos' },
            { id: 'docente', label: 'Professores', count: active.filter(i => i.role === 'docente').length },
            { id: 'gestao', label: 'Gestão e secretaria', count: active.filter(i => GESTAO.includes(i.role)).length },
            { id: 'apoio', label: 'Apoio', count: active.filter(i => i.role === 'portaria' || i.role === 'funcionario').length },
          ]}
        />
        <div className="flex items-center gap-2">
          <div className="relative w-full lg:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" aria-hidden />
            <input
              className={cx(inputCls, 'h-10 py-0 pl-10 pr-9')}
              placeholder="Buscar por nome, e-mail ou CPF"
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Buscar funcionário"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" aria-label="Limpar busca">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button variant={showInactive ? 'secondary' : 'ghost'} size="sm" onClick={() => setShowInactive(v => !v)} className="shrink-0">
            {showInactive ? 'Ver ativos' : 'Desligados'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Users}
          title={items.length === 0 ? 'Nenhum funcionário cadastrado' : showInactive ? 'Ninguém desligado' : 'Ninguém encontrado'}
          text={items.length === 0 ? 'Cadastre professores e equipe. Quem precisa usar o sistema já recebe o acesso.' : 'Tente outra busca ou outro filtro.'}
          action={items.length === 0 ? <Button icon={Plus} onClick={openNew}>Cadastrar o primeiro</Button> : undefined}
        />
      ) : (
        <TableShell minWidth={900}>
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg-card-alt)]">
              <th className={thCls}>Nome</th>
              <th className={thCls}>Função</th>
              <th className={thCls}>Contato</th>
              <th className={thCls}>Acesso</th>
              <th className={cx(thCls, 'text-right')}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(s => (
              <tr key={s.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-card-alt)]">
                <td className={tdCls}>
                  <div className="flex items-center gap-3">
                    <Avatar name={s.full_name} size={36} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--text-heading)]">{s.full_name}</p>
                      <p className="truncate text-[12px] text-[var(--text-muted)]">{s.cpf ? `CPF ${maskCPFSecret(s.cpf)}` : 'CPF não informado'}</p>
                    </div>
                  </div>
                </td>
                <td className={tdCls}>
                  <p className="font-medium text-[var(--text-heading)]">{roleLabel(s.role)}</p>
                  <p className="text-[12px] text-[var(--text-muted)]">
                    {[s.job_title, s.shifts.length ? s.shifts.join(', ') : null].filter(Boolean).join(' · ') || '—'}
                  </p>
                </td>
                <td className={tdCls}>
                  <p className="truncate text-[13px]">{s.email || <span className="text-[var(--text-muted)]">Sem e-mail</span>}</p>
                  <p className="text-[12px] tabular-nums text-[var(--text-muted)]">{s.phone ? maskCellPhone(s.phone) : '—'}</p>
                </td>
                <td className={tdCls}>{accessBadge(s)}</td>
                <td className={cx(tdCls, 'text-right')}>
                  <div className="flex justify-end gap-1">
                    {s.status === 'inativo' ? (
                      <Button size="sm" variant="secondary" onClick={() => setConfirm({ kind: 'reactivate', staff: s })}>Reativar</Button>
                    ) : (
                      <>
                        <IconAction icon={Pencil} label="Editar" onClick={() => openEdit(s)} />
                        {!s.user_id ? (
                          <IconAction
                            icon={KeyRound}
                            label="Dar acesso ao sistema"
                            onClick={() => {
                              setGrantFor(s);
                              setGrantEmail(s.email || '');
                              setGrantError(null);
                            }}
                          />
                        ) : (
                          <>
                            <IconAction icon={KeyRound} label="Gerar nova senha" onClick={() => setConfirm({ kind: 'reset', staff: s })} disabled={!s.access_enabled} />
                            {s.access_enabled ? (
                              <IconAction icon={Lock} label="Bloquear acesso" onClick={() => setConfirm({ kind: 'block', staff: s })} />
                            ) : (
                              <IconAction icon={Unlock} label="Liberar acesso" onClick={() => setConfirm({ kind: 'unblock', staff: s })} />
                            )}
                          </>
                        )}
                        <IconAction icon={UserMinus} label="Desligar da escola" danger onClick={() => setConfirm({ kind: 'deactivate', staff: s })} />
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      {/* Cadastro */}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        size="lg"
        icon={<Users className="h-5 w-5" />}
        title={editing ? 'Editar funcionário' : 'Novo funcionário'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setForm(null)} disabled={saving}>Cancelar</Button>
            <Button onClick={save} loading={saving}>
              {editing ? 'Salvar' : form?.createAccess ? 'Cadastrar e criar acesso' : 'Cadastrar'}
            </Button>
          </>
        }
      >
        {form && (
          <div className="space-y-4">
            {formError && <Alert tone="danger">{formError}</Alert>}
            <Field label="Nome completo" required>
              {id => <input id={id} className={inputCls} value={form.full_name} onChange={e => set('full_name', e.target.value)} autoComplete="name" autoFocus />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="CPF">
                {id => <input id={id} className={inputCls} inputMode="numeric" placeholder="000.000.000-00" value={form.cpf} onChange={e => set('cpf', maskCPF(e.target.value))} />}
              </Field>
              <Field label="E-mail" required={!editing && form.createAccess} hint={editing?.user_id ? 'É o login da pessoa. Para trocar, fale com o suporte.' : undefined}>
                {id => <input id={id} type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} disabled={!!editing?.user_id} />}
              </Field>
              <Field label="Celular">
                {id => <input id={id} className={inputCls} inputMode="tel" placeholder="(00) 00000-0000" value={form.phone} onChange={e => set('phone', maskCellPhone(e.target.value))} />}
              </Field>
            </div>

            <div>
              <p className="mb-2 text-[13px] font-semibold text-[var(--text-heading)]">Papel no sistema</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {STAFF_ROLE_OPTIONS.map(r => {
                  const selected = form.role === r.id;
                  const locked = !!editing?.user_id && !selected;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => !locked && set('role', r.id)}
                      disabled={locked}
                      aria-pressed={selected}
                      className={cx(
                        'rounded-2xl border p-3 text-left transition-colors disabled:opacity-40',
                        selected ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] hover:border-[var(--accent)]'
                      )}
                    >
                      <p className="text-[14px] font-semibold text-[var(--text-heading)]">{r.label}</p>
                      <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">{r.hint}</p>
                    </button>
                  );
                })}
              </div>
              {editing?.user_id && <p className="mt-2 text-[12px] text-[var(--text-muted)]">Quem já tem acesso não muda de papel por aqui, porque isso muda o que a pessoa vê ao entrar.</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cargo ou disciplina" hint={form.role === 'docente' ? 'Ex.: Matemática e Ciências' : 'Ex.: Merendeira, Inspetor de pátio'}>
                {id => <input id={id} className={inputCls} value={form.job_title} onChange={e => set('job_title', e.target.value)} />}
              </Field>
              <div>
                <p className="mb-1.5 text-[13px] font-semibold text-[var(--text-heading)]">Turnos</p>
                <div className="flex gap-2">
                  {SHIFTS.map(t => {
                    const on = form.shifts.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => set('shifts', on ? form.shifts.filter(x => x !== t) : [...form.shifts, t])}
                        aria-pressed={on}
                        className={cx(
                          'h-10 flex-1 rounded-xl border text-[13px] font-semibold transition-colors',
                          on ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-heading)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]'
                        )}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {!editing && (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-alt)] p-4">
                <label className="flex cursor-pointer items-center gap-3"><Toggle checked={form.createAccess} onChange={v => set('createAccess', v)} label="Criar acesso ao sistema agora" /><span className="text-[14px] font-medium text-[var(--text-heading)]">Criar acesso ao sistema agora</span></label>
                <p className="mt-2 text-[12px] text-[var(--text-muted)]">
                  {form.createAccess
                    ? 'Você recebe uma senha provisória para entregar à pessoa. Na primeira entrada ela cria a própria senha.'
                    : 'A pessoa fica só no cadastro. Dá para criar o acesso depois, pelo botão da chave.'}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Dar acesso a quem já está cadastrado */}
      <Modal
        open={!!grantFor}
        onClose={() => setGrantFor(null)}
        icon={<KeyRound className="h-5 w-5" />}
        title="Dar acesso ao sistema"
        subtitle={grantFor ? `${grantFor.full_name} · ${roleLabel(grantFor.role)}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setGrantFor(null)} disabled={granting}>Cancelar</Button>
            <Button onClick={grant} loading={granting}>Criar acesso</Button>
          </>
        }
      >
        <div className="space-y-4">
          {grantError && <Alert tone="danger">{grantError}</Alert>}
          <Field label="E-mail de acesso" hint="É com este e-mail que a pessoa entra no sistema.">
            {id => <input id={id} type="email" className={inputCls} value={grantEmail} onChange={e => setGrantEmail(e.target.value)} autoFocus />}
          </Field>
        </div>
      </Modal>

      {/* Senha provisória: aparece uma vez só */}
      <Modal
        open={!!credentials}
        onClose={() => setCredentials(null)}
        icon={<ShieldCheck className="h-5 w-5" />}
        title={credentials?.isReset ? 'Nova senha provisória' : 'Acesso criado'}
        subtitle={credentials?.name}
        footer={<Button onClick={() => setCredentials(null)}>Já entreguei</Button>}
      >
        {credentials && (
          <div className="space-y-4">
            <Alert tone="warning">Anote ou envie agora. Por segurança, esta senha não aparece de novo.</Alert>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-alt)] p-4">
              <p className="text-[12px] text-[var(--text-muted)]">E-mail</p>
              <p className="select-all break-all text-[15px] font-semibold text-[var(--text-heading)]">{credentials.email}</p>
              <p className="mt-3 text-[12px] text-[var(--text-muted)]">Senha provisória</p>
              <p className="select-all font-mono text-[22px] font-semibold tracking-wide text-[var(--text-heading)]">{credentials.password}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={Copy} onClick={copyCredentials}>{copied ? 'Copiado' : 'Copiar'}</Button>
              {whatsappLink(credentials) && (
                <a
                  href={whatsappLink(credentials)!}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--border)] px-5 text-[14px] font-semibold text-[var(--text-heading)] hover:border-[var(--accent)]"
                >
                  <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
                </a>
              )}
            </div>
            <p className="text-[12px] text-[var(--text-muted)]">Na primeira entrada, o sistema pede para a pessoa criar a própria senha.</p>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
        loading={busy}
        danger={confirm ? confirmText[confirm.kind].danger : true}
        title={confirm ? confirmText[confirm.kind].title : ''}
        confirmLabel={confirm ? confirmText[confirm.kind].label : 'Confirmar'}
      >
        {confirm && (
          <p>
            <strong>{confirm.staff.full_name}</strong>. {confirmText[confirm.kind].body}
          </p>
        )}
      </ConfirmModal>

      <Toast message={toast?.message ?? null} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}

function IconAction({ icon: Icon, label, onClick, danger, disabled }: { icon: typeof Pencil; label: string; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cx(
        'flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors disabled:opacity-40',
        danger ? 'hover:bg-[#FDECEC] hover:text-[#B42318]' : 'hover:bg-[var(--bg-card-alt)] hover:text-[var(--accent)]'
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export default AdminFuncionarios;