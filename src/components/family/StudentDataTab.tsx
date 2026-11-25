import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, GraduationCap, Lock, Mail, MapPin, Pencil, Phone, Shield, Star, Users } from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { supabase } from '../../lib/supabase';
import { maskCPF } from '../../utils/masks';
import { FamilyAttendanceView } from './FamilyAttendanceView';
import { Alert, Badge, Button, Card, CardHeader, EmptyState, Field, Modal, Skeleton, Toast, cx, inputCls } from '../ui/kit';

/*
 * Dados cadastrais do filho no Portal da Família.
 * Mostra só estudantes vinculados à conta (nada inventado): ficha, endereço e
 * responsáveis cadastrados pela escola. A família pode atualizar o endereço;
 * o resto é alterado pela secretaria.
 */

interface ChildItem {
  student_id: string;
  full_name: string;
  class_name?: string;
  shift?: string;
}

interface Details {
  student: {
    id: string;
    full_name: string;
    registration_code?: string | null;
    cpf?: string | null;
    rg?: string | null;
    birth_date?: string | null;
    sex?: string | null;
    status?: string | null;
    class_name?: string | null;
    grade?: string | null;
    shift?: string | null;
    room?: string | null;
    school_name?: string | null;
  };
  address: { zip_code?: string | null; street?: string | null; neighborhood?: string | null; city?: string | null; state?: string | null };
  guardians: { id: string; name: string; relationship: string; phone?: string | null; email?: string | null; is_primary: boolean; can_pickup: boolean; is_me: boolean }[];
}

interface AddressForm {
  zip_code: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

const EMPTY_ADDRESS: AddressForm = { zip_code: '', street: '', neighborhood: '', city: '', state: '' };

function fmtDate(iso?: string | null) {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : '';
}

function age(iso?: string | null) {
  if (!iso) return null;
  const b = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(b.getTime())) return null;
  const t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
  return a >= 0 ? a : null;
}

function sexLabel(v?: string | null) {
  const s = (v || '').toLowerCase();
  if (s.startsWith('f')) return 'Feminino';
  if (s.startsWith('m')) return 'Masculino';
  return v || '';
}

function maskCep(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function StudentDataTab() {
  const { student: activeContextStudent, selectFamilyStudent } = usePlatform() as any;

  const [children, setChildren] = useState<ChildItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [details, setDetails] = useState<Details | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'danger' } | null>(null);

  const [editingAddress, setEditingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressForm>(EMPTY_ADDRESS);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [cepNote, setCepNote] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  /* ------------------------ filhos vinculados ------------------------ */
  const loadChildren = useCallback(async () => {
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('classium_family_my_students');
    if (rpcError) {
      setError('Não foi possível carregar os dados agora. Tente de novo em instantes.');
      setChildren([]);
    } else {
      const list = (Array.isArray(data) ? data : []) as ChildItem[];
      setChildren(list);
      setActiveId((prev) => {
        if (prev && list.some((c) => c.student_id === prev)) return prev;
        if (activeContextStudent?.id && list.some((c) => c.student_id === activeContextStudent.id)) return activeContextStudent.id;
        return list[0]?.student_id || '';
      });
    }
    setLoadingList(false);
  }, [activeContextStudent?.id]);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  // acompanha a troca de filho feita no topo da página
  useEffect(() => {
    if (activeContextStudent?.id && children.some((c) => c.student_id === activeContextStudent.id)) setActiveId(activeContextStudent.id);
  }, [activeContextStudent?.id, children]);

  /* ---------------------------- ficha ---------------------------- */
  const loadDetails = useCallback(async (id: string, silent = false) => {
    if (!id) {
      setDetails(null);
      return;
    }
    if (!silent) setLoadingDetails(true);
    const { data, error: rpcError } = await supabase.rpc('classium_family_student_details', { p_student_id: id });
    const res = (data || {}) as any;
    if (rpcError || res.success === false) {
      setError(res.error || 'Não foi possível carregar a ficha do estudante.');
      setDetails(null);
    } else {
      setDetails(res as Details);
    }
    setLoadingDetails(false);
  }, []);

  useEffect(() => {
    loadDetails(activeId);
  }, [activeId, loadDetails]);

  // a escola mudou algo (turma, responsáveis, vínculo): atualiza sozinho
  useEffect(() => {
    const channel = supabase
      .channel('familia-dados-cadastrais')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_responsible_links' }, () => loadChildren())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'students' }, () => activeId && loadDetails(activeId, true))
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeId, loadChildren, loadDetails]);

  const selectChild = (id: string) => {
    setActiveId(id);
    selectFamilyStudent?.(id);
  };

  /* --------------------------- endereço --------------------------- */
  const openAddress = () => {
    const a = details?.address || {};
    setAddressForm({
      zip_code: a.zip_code || '',
      street: a.street || '',
      neighborhood: a.neighborhood || '',
      city: a.city || '',
      state: a.state || '',
    });
    setAddressError(null);
    setCepNote(null);
    setEditingAddress(true);
  };

  const lookupCep = async (value: string) => {
    const d = value.replace(/\D/g, '');
    if (d.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const data = await res.json();
      if (data.erro) return setCepNote('CEP não encontrado. Preencha à mão.');
      setAddressForm((f) => ({
        ...f,
        street: data.logradouro ? `${data.logradouro}${f.street.includes(',') ? f.street.slice(f.street.indexOf(',')) : ''}` : f.street,
        neighborhood: data.bairro || f.neighborhood,
        city: data.localidade || f.city,
        state: data.uf || f.state,
      }));
      setCepNote('Endereço encontrado. Complete com o número.');
    } catch {
      setCepNote('Não foi possível consultar o CEP agora. Preencha à mão.');
    }
  };

  const saveAddress = async () => {
    if (!activeId) return;
    setAddressError(null);
    if (!addressForm.street.trim() || !addressForm.city.trim()) return setAddressError('Informe pelo menos a rua com número e a cidade.');
    setSavingAddress(true);
    const { data, error: rpcError } = await supabase.rpc('classium_family_update_address', { p_student_id: activeId, p_payload: addressForm });
    setSavingAddress(false);
    const res = (data || {}) as any;
    if (rpcError || res.success === false) return setAddressError(res.error || 'Não foi possível salvar o endereço. Tente de novo.');
    setEditingAddress(false);
    setToast({ message: 'Endereço atualizado. A escola já vê o endereço novo.', tone: 'success' });
    loadDetails(activeId, true);
  };

  /* ---------------------------- visual ---------------------------- */
  const st = details?.student;
  const studentAge = useMemo(() => age(st?.birth_date), [st?.birth_date]);

  if (loadingList) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-[28px]" />
        <Skeleton className="h-40 w-full rounded-[28px]" />
      </div>
    );
  }

  if (error && children.length === 0) {
    return (
      <Alert tone="danger" action={<Button variant="secondary" size="sm" onClick={loadChildren}>Tentar de novo</Button>}>
        {error}
      </Alert>
    );
  }

  if (children.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={GraduationCap}
          title="Nenhum estudante vinculado"
          text='Vincule seu filho em "Filhos e vínculos", informando o seu nome e o nome completo dele como estão na matrícula. Se não encontrar, fale com a secretaria.'
        />
      </Card>
    );
  }

  const address = details?.address || {};
  const hasAddress = !!(address.street || address.city || address.zip_code);

  return (
    <div className="space-y-6 text-left">
      {children.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Escolha o filho">
          {children.map((c) => {
            const on = c.student_id === activeId;
            return (
              <button
                key={c.student_id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => selectChild(c.student_id)}
                className={cx(
                  'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[13px] font-semibold transition-colors',
                  on ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-heading)]',
                )}
              >
                {on && <Check className="h-4 w-4" />}
                {c.full_name.split(/\s+/)[0]}
                {c.class_name && <span className="font-normal opacity-75">· {c.class_name}</span>}
              </button>
            );
          })}
        </div>
      )}

      {error && <Alert tone="danger">{error}</Alert>}

      {/* Ficha */}
      <Card>
        <CardHeader icon={GraduationCap} title="Ficha escolar" subtitle="Dados registrados pela secretaria da escola." />
        {loadingDetails || !st ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-[20px] font-semibold" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                {st.full_name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[20px] font-semibold text-[var(--text-heading)]">{st.full_name}</h3>
                  {st.status && <Badge tone="success">{st.status}</Badge>}
                </div>
                <p className="mt-0.5 text-[14px] text-[var(--text-muted)]">
                  {[st.class_name || 'Sem turma', st.shift, st.school_name].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>

            <dl className="grid gap-x-6 gap-y-4 rounded-2xl border border-[var(--border)] p-4 sm:grid-cols-2 lg:grid-cols-3">
              <Info label="Matrícula" value={st.registration_code} />
              <Info label="Data de nascimento" value={st.birth_date ? `${fmtDate(st.birth_date)}${studentAge !== null ? ` · ${studentAge} anos` : ''}` : ''} />
              <Info label="Sexo" value={sexLabel(st.sex)} />
              <Info label="CPF" value={st.cpf ? maskCPF(st.cpf) : ''} />
              <Info label="RG" value={st.rg} />
              <Info label="Turma e sala" value={[st.class_name, st.room].filter(Boolean).join(' · ')} />
            </dl>
            <p className="flex items-center gap-1.5 text-[12px] text-[var(--text-muted)]">
              <Lock className="h-3.5 w-3.5" /> Para corrigir algum dado da ficha, fale com a secretaria.
            </p>
          </div>
        )}
      </Card>

      {/* Endereço */}
      <Card>
        <CardHeader
          icon={MapPin}
          title="Endereço"
          subtitle="Mantenha atualizado: a escola usa para transporte e contato."
          action={
            <Button variant="secondary" size="sm" icon={Pencil} onClick={openAddress} disabled={!st}>
              {hasAddress ? 'Atualizar' : 'Cadastrar'}
            </Button>
          }
        />
        {hasAddress ? (
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="CEP" value={address.zip_code} />
            <Info label="Rua e número" value={address.street} className="lg:col-span-2" />
            <Info label="Bairro" value={address.neighborhood} />
            <Info label="Cidade" value={[address.city, address.state].filter(Boolean).join(' - ')} />
          </dl>
        ) : (
          <p className="text-[14px] text-[var(--text-muted)]">Nenhum endereço cadastrado ainda.</p>
        )}
      </Card>

      {/* Responsáveis */}
      <Card>
        <CardHeader icon={Users} title="Responsáveis" subtitle="Cadastrados pela escola na matrícula." action={<Badge>{details?.guardians.length ?? 0}</Badge>} />
        {details && details.guardians.length > 0 ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {details.guardians.map((g) => (
              <li key={g.id} className="rounded-2xl border border-[var(--border)] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[15px] font-semibold text-[var(--text-heading)]">{g.name}</p>
                  <Badge>{g.relationship}</Badge>
                  {g.is_primary && (
                    <Badge tone="success">
                      <Star className="h-3 w-3" /> Principal
                    </Badge>
                  )}
                  {g.is_me && <Badge tone="accent">Você</Badge>}
                </div>
                <div className="mt-2 space-y-1 text-[13px] text-[var(--text-muted)]">
                  {g.phone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" /> {g.phone}
                    </p>
                  )}
                  {g.email && (
                    <p className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" /> {g.email}
                    </p>
                  )}
                  <p className={cx('text-[12px] font-medium', g.can_pickup ? 'text-[#067647]' : 'text-[#B42318]')}>
                    {g.can_pickup ? 'Autorizado a retirar o estudante' : 'Não autorizado a retirar'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-[var(--text-muted)]">Nenhum responsável cadastrado.</p>
        )}
        <p className="mt-4 flex items-start gap-1.5 text-[12px] text-[var(--text-muted)]">
          <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Para incluir alguém autorizado a retirar o estudante, ou mudar um responsável, fale com a secretaria.
        </p>
      </Card>

      {activeId && <FamilyAttendanceView studentId={activeId} />}

      <Modal
        open={editingAddress}
        onClose={() => setEditingAddress(false)}
        icon={<MapPin className="h-5 w-5" />}
        title="Endereço"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditingAddress(false)} disabled={savingAddress}>
              Cancelar
            </Button>
            <Button onClick={saveAddress} loading={savingAddress}>
              Salvar endereço
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {addressError && <Alert tone="danger">{addressError}</Alert>}
          <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
            <Field label="CEP">
              {(id) => (
                <input
                  id={id}
                  className={inputCls}
                  inputMode="numeric"
                  value={addressForm.zip_code}
                  onChange={(e) => {
                    const v = maskCep(e.target.value);
                    setAddressForm((f) => ({ ...f, zip_code: v }));
                    if (v.replace(/\D/g, '').length === 8) lookupCep(v);
                  }}
                  placeholder="00000-000"
                  autoComplete="postal-code"
                />
              )}
            </Field>
            <Field label="Rua e número" required>
              {(id) => <input id={id} className={inputCls} value={addressForm.street} onChange={(e) => setAddressForm((f) => ({ ...f, street: e.target.value }))} placeholder="Ex.: Rua das Flores, 120" autoComplete="address-line1" />}
            </Field>
          </div>
          {cepNote && <p className="-mt-2 text-[13px] text-[var(--text-muted)]" role="status">{cepNote}</p>}
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_90px]">
            <Field label="Bairro">
              {(id) => <input id={id} className={inputCls} value={addressForm.neighborhood} onChange={(e) => setAddressForm((f) => ({ ...f, neighborhood: e.target.value }))} />}
            </Field>
            <Field label="Cidade" required>
              {(id) => <input id={id} className={inputCls} value={addressForm.city} onChange={(e) => setAddressForm((f) => ({ ...f, city: e.target.value }))} autoComplete="address-level2" />}
            </Field>
            <Field label="UF">
              {(id) => <input id={id} className={cx(inputCls, 'text-center uppercase')} maxLength={2} value={addressForm.state} onChange={(e) => setAddressForm((f) => ({ ...f, state: e.target.value.toUpperCase() }))} />}
            </Field>
          </div>
        </div>
      </Modal>

      <Toast message={toast?.message ?? null} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}

function Info({ label, value, className }: { label: string; value?: string | null; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[12px] font-medium text-[var(--text-muted)]">{label}</dt>
      <dd className={cx('mt-0.5 text-[14px]', value ? 'text-[var(--text-heading)]' : 'text-[var(--text-muted)]')}>{value || 'Não informado'}</dd>
    </div>
  );
}

export default StudentDataTab;