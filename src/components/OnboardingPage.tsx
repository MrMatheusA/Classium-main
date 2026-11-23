import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Building2, Check, LogOut, MapPin, Search, ShieldCheck } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { useAuth } from '../hooks/useAuth';
import { useAccess } from '../auth/AccessProvider';
import { supabase } from '../lib/supabase';
import { SchoolInfo, SchoolUnit } from '../types';
import { BRAZILIAN_UFS, normalizeBrazilianUF } from '../lib/ufUtils';
import { Logo } from './Logo';
import { Alert, Button, Field, cx, inputCls, EASE } from './ui/kit';

/*
 * Cadastro da escola, feito pelo gestor logo depois de criar a conta.
 * A conta do gestor já existe (foi criada no login), então aqui só entram
 * os dados da escola. Quando o cadastro termina, o acesso é recarregado
 * e o App abre o painel da gestão sozinho.
 */

type StepId = 1 | 2 | 3;

const STEPS: { id: StepId; title: string; text: string }[] = [
  { id: 1, title: 'Escola', text: 'Nome e documentos' },
  { id: 2, title: 'Endereço e contato', text: 'Onde a escola fica' },
  { id: 3, title: 'Confirmar', text: 'Revise e conclua' },
];

const onlyDigits = (v: string) => v.replace(/\D/g, '');

function maskCnpj(v: string) {
  const d = onlyDigits(v).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function maskCep(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

function maskPhone(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Confere os dígitos verificadores do CNPJ */
function isValidCnpj(v: string) {
  const d = onlyDigits(v);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (len: number) => {
    const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = w.reduce((s, wi, i) => s + Number(d[i]) * wi, 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

/** Traduz as mensagens do banco para algo que o gestor entenda */
function friendlyError(raw?: string) {
  const msg = (raw || '').toLowerCase();
  if (!msg) return 'Não foi possível cadastrar a escola. Tente de novo.';
  if (msg.includes('document') || msg.includes('cnpj')) return 'Já existe uma escola cadastrada com este CNPJ. Se ela é sua, peça acesso à pessoa que fez o cadastro.';
  if (msg.includes('already') || msg.includes('duplicat') || msg.includes('já possui') || msg.includes('organização ativa') || msg.includes('vínculo') || msg.includes('vinculo'))
    return 'Sua conta já está ligada a uma escola. Saia e entre de novo para abrir o painel.';
  if (msg.includes('jwt') || msg.includes('session') || msg.includes('auth')) return 'Sua sessão expirou. Entre de novo para continuar o cadastro.';
  if (msg.includes('failed to fetch') || msg.includes('network')) return 'Sem conexão com a internet. Confira a rede e tente de novo.';
  return 'Não foi possível cadastrar a escola. Tente de novo em instantes.';
}

interface FormState {
  nomeEscola: string;
  nomeFantasia: string;
  cnpj: string;
  inep: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  telefone: string;
  emailInstitucional: string;
  site: string;
  chkAutorizacao: boolean;
  chkTermos: boolean;
}

const EMPTY: FormState = {
  nomeEscola: '',
  nomeFantasia: '',
  cnpj: '',
  inep: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  telefone: '',
  emailInstitucional: '',
  site: '',
  chkAutorizacao: false,
  chkTermos: false,
};

export function OnboardingPage() {
  const { setMode, setSchoolInfo, setSchoolUnits, setActiveAdminTab, gestorAccount } = usePlatform() as any;
  const { refreshProfile, user } = useAuth() as any;
  const { refresh } = useAccess();

  const [step, setStep] = useState<StepId>(1);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepNote, setCepNote] = useState<{ ok: boolean; text: string } | null>(null);

  const managerName = gestorAccount?.name || user?.user_metadata?.full_name || user?.user_metadata?.name || '';
  const managerEmail = gestorAccount?.email || user?.email || '';

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  /* --------------------------- CEP --------------------------- */

  const lookupCep = async (value = form.cep) => {
    const digits = onlyDigits(value);
    if (digits.length !== 8) {
      setCepNote({ ok: false, text: 'Digite os 8 números do CEP.' });
      return;
    }
    setCepLoading(true);
    setCepNote(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepNote({ ok: false, text: 'CEP não encontrado. Preencha o endereço à mão.' });
        return;
      }
      setForm(prev => ({
        ...prev,
        endereco: data.logradouro || prev.endereco,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        estado: data.uf || prev.estado,
      }));
      setErrors(prev => ({ ...prev, endereco: undefined, cidade: undefined, estado: undefined }));
      setCepNote({ ok: true, text: `Endereço encontrado em ${data.localidade} - ${data.uf}. Complete com o número.` });
    } catch {
      setCepNote({ ok: false, text: 'Não foi possível consultar o CEP agora. Preencha o endereço à mão.' });
    } finally {
      setCepLoading(false);
    }
  };

  const onCepChange = (v: string) => {
    const masked = maskCep(v);
    set('cep', masked);
    if (onlyDigits(masked).length === 8) lookupCep(masked);
  };

  /* ------------------------ Validação ------------------------ */

  const validate = (s: StepId) => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (s === 1) {
      if (!form.nomeEscola.trim()) e.nomeEscola = 'Informe o nome da escola.';
      if (!form.cnpj.trim()) e.cnpj = 'Informe o CNPJ da escola.';
      else if (!isValidCnpj(form.cnpj)) e.cnpj = 'CNPJ inválido. Confira os números.';
      if (form.inep && onlyDigits(form.inep).length !== 8) e.inep = 'O código INEP tem 8 números.';
    }
    if (s === 2) {
      if (onlyDigits(form.cep).length !== 8) e.cep = 'Informe o CEP.';
      if (!form.endereco.trim()) e.endereco = 'Informe a rua.';
      if (!form.cidade.trim()) e.cidade = 'Informe a cidade.';
      if (!normalizeBrazilianUF(form.estado)) e.estado = 'Escolha o estado.';
      const phone = onlyDigits(form.telefone);
      if (phone.length < 10) e.telefone = 'Informe um telefone com DDD.';
      if (form.emailInstitucional && !/^\S+@\S+\.\S+$/.test(form.emailInstitucional.trim())) e.emailInstitucional = 'E-mail inválido.';
    }
    if (s === 3) {
      if (!form.chkAutorizacao) e.chkAutorizacao = 'Confirme que você pode cadastrar esta escola.';
      if (!form.chkTermos) e.chkTermos = 'Aceite os termos de uso e a política de privacidade.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (validate(step)) setStep(prev => (Math.min(3, prev + 1) as StepId));
  };
  const back = () => setStep(prev => (Math.max(1, prev - 1) as StepId));

  /* ------------------------- Envio ------------------------- */

  const fullAddress = useMemo(
    () => [form.endereco, form.numero, form.complemento, form.bairro].map(v => v.trim()).filter(Boolean).join(', '),
    [form.endereco, form.numero, form.complemento, form.bairro],
  );

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (saving) return;
    setSubmitError(null);
    if (!validate(1)) return setStep(1);
    if (!validate(2)) return setStep(2);
    if (!validate(3)) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setSubmitError('Sua sessão expirou. Entre de novo para continuar o cadastro.');
      return;
    }

    setSaving(true);
    const schoolName = form.nomeEscola.trim();
    const uf = normalizeBrazilianUF(form.estado) || null;

    try {
      const { data, error } = await supabase.rpc('provision_gestor_organization', {
        p_name: schoolName,
        p_trade_name: form.nomeFantasia.trim() || null,
        p_document_number: onlyDigits(form.cnpj),
        p_inep_code: onlyDigits(form.inep) || null,
        p_email: form.emailInstitucional.trim().toLowerCase() || null,
        p_phone: form.telefone.trim() || null,
        p_address: fullAddress || null,
        p_city: form.cidade.trim() || null,
        p_state: uf,
        p_postal_code: form.cep.trim() || null,
        p_website: form.site.trim() || null,
      });

      if (error) {
        console.error('[Cadastro da escola]', error);
        setSubmitError(friendlyError(error.message));
        setSaving(false);
        return;
      }
      const res = (data && typeof data === 'object' ? data : {}) as Record<string, any>;
      if (res.ok === false || res.success === false || res.error) {
        console.error('[Cadastro da escola]', res);
        setSubmitError(friendlyError(res.error || res.message));
        setSaving(false);
        return;
      }
      const orgId = res.organization_id || res.id || res.organization?.id;
      if (!orgId) {
        setSubmitError('A escola não foi confirmada pelo sistema. Atualize a página e confira se ela já aparece no painel.');
        setSaving(false);
        return;
      }

      // dados da tela inicial do painel
      const info: SchoolInfo = {
        name: schoolName,
        razaoSocial: schoolName,
        cnpj: form.cnpj,
        inep: form.inep,
        address: fullAddress,
        municipio: form.cidade,
        estado: uf || '',
        cep: form.cep,
        telefone: form.telefone,
        whatsapp: '',
        email: form.emailInstitucional,
        site: form.site,
        logo: '',
        cover: '',
        director: managerName,
        schoolYear: `Ano letivo ${new Date().getFullYear()}`,
        city: form.cidade,
      } as SchoolInfo;
      const unit: SchoolUnit = {
        id: orgId,
        name: form.nomeFantasia.trim() || schoolName,
        inep: form.inep,
        address: fullAddress,
        director: managerName,
        students: 0,
        teachers: 0,
        classes: 0,
        shifts: '',
        phone: form.telefone,
        email: form.emailInstitucional,
        logo: '',
        cover: '',
        primaryColor: '#0F4C81',
        secondaryColor: '#D4AF37',
        status: 'Ativa',
        city: form.cidade,
      } as SchoolUnit;
      setSchoolInfo?.(info);
      setSchoolUnits?.([unit]);

      try {
        await refreshProfile?.();
      } catch (err) {
        console.warn('[Cadastro da escola] perfil não recarregado', err);
      }

      // recarrega o acesso: com a escola criada, o App abre o painel da gestão
      const access = await refresh();
      if (access.needsOnboarding) {
        setSubmitError('A escola foi cadastrada, mas o painel ainda não liberou o acesso. Aguarde alguns segundos e clique em "Concluir" de novo.');
        setSaving(false);
        return;
      }
      setActiveAdminTab?.('dashboard');
      setMode('admin');
    } catch (err: any) {
      console.error('[Cadastro da escola]', err);
      setSubmitError(friendlyError(err?.message));
      setSaving(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setMode('login');
  };

  /* ------------------------- Visual ------------------------- */

  const err = (k: keyof FormState) => (errors[k] ? <span className="text-[#B42318]">{errors[k]}</span> : undefined);
  const errCls = (k: keyof FormState) => (errors[k] ? 'border-[#B42318] focus:border-[#B42318]' : '');

  return (
    <div className="min-h-screen w-full text-left" style={{ background: 'var(--bg-app)' }}>
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo size="sm" surface="light" />
        <Button variant="ghost" size="sm" icon={LogOut} onClick={signOut}>Sair</Button>
      </header>

      <main className="mx-auto grid w-full max-w-5xl gap-8 px-5 pb-16 sm:px-8 lg:grid-cols-[260px_1fr]">
        {/* Etapas */}
        <aside className="space-y-6">
          <div>
            <h1 className="text-[26px] font-semibold leading-tight text-[var(--text-heading)]">Cadastre sua escola</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-muted)]">
              {managerName ? `${managerName.split(' ')[0]}, faltam` : 'Faltam'} só os dados da escola. Leva uns 2 minutos e dá para mudar tudo depois em Dados da escola.
            </p>
          </div>
          <ol className="flex gap-2 lg:flex-col" aria-label="Etapas do cadastro">
            {STEPS.map(s => {
              const done = s.id < step;
              const active = s.id === step;
              return (
                <li key={s.id} className="flex flex-1 items-center gap-3" aria-current={active ? 'step' : undefined}>
                  <span
                    className={cx(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold',
                      done || active ? 'text-[var(--accent-fg)]' : 'border border-[var(--border)] text-[var(--text-muted)]',
                    )}
                    style={done || active ? { background: 'var(--accent)' } : undefined}
                  >
                    {done ? <Check className="h-4 w-4" /> : s.id}
                  </span>
                  <span className="hidden min-w-0 sm:block">
                    <span className={cx('block text-[14px] font-semibold', active ? 'text-[var(--text-heading)]' : 'text-[var(--text-muted)]')}>{s.title}</span>
                    <span className="block text-[12px] text-[var(--text-muted)]">{s.text}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </aside>

        {/* Formulário */}
        <form onSubmit={submit} className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[0_24px_48px_-32px_rgba(16,24,40,0.35)] sm:p-8" noValidate>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25, ease: EASE }} className="space-y-5">
              {step === 1 && (
                <>
                  <StepTitle icon={Building2} title="Dados da escola" text="Como a escola aparece para as famílias e nos documentos." />
                  <Field label="Nome da escola" required hint={err('nomeEscola')}>
                    {id => <input id={id} className={cx(inputCls, errCls('nomeEscola'))} value={form.nomeEscola} onChange={e => set('nomeEscola', e.target.value)} placeholder="Ex.: Escola Municipal Santa Rita" autoFocus autoComplete="organization" />}
                  </Field>
                  <Field label="Nome curto" hint="Opcional. Aparece no menu e nos avisos.">
                    {id => <input id={id} className={inputCls} value={form.nomeFantasia} onChange={e => set('nomeFantasia', e.target.value)} placeholder="Ex.: Santa Rita" />}
                  </Field>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="CNPJ" required hint={err('cnpj')}>
                      {id => <input id={id} className={cx(inputCls, errCls('cnpj'))} inputMode="numeric" value={form.cnpj} onChange={e => set('cnpj', maskCnpj(e.target.value))} placeholder="00.000.000/0000-00" />}
                    </Field>
                    <Field label="Código INEP" hint={err('inep') || 'Opcional. 8 números.'}>
                      {id => <input id={id} className={cx(inputCls, errCls('inep'))} inputMode="numeric" value={form.inep} onChange={e => set('inep', onlyDigits(e.target.value).slice(0, 8))} />}
                    </Field>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <StepTitle icon={MapPin} title="Endereço e contato" text="Digite o CEP que o endereço é preenchido." />
                  <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
                    <Field label="CEP" required hint={err('cep')}>
                      {id => (
                        <div className="relative">
                          <input id={id} className={cx(inputCls, 'pr-11', errCls('cep'))} inputMode="numeric" value={form.cep} onChange={e => onCepChange(e.target.value)} placeholder="00000-000" autoFocus autoComplete="postal-code" />
                          <button type="button" onClick={() => lookupCep()} disabled={cepLoading} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-card-alt)] hover:text-[var(--accent)] disabled:opacity-50" aria-label="Buscar endereço pelo CEP">
                            <Search className={cx('h-4 w-4', cepLoading && 'animate-pulse')} />
                          </button>
                        </div>
                      )}
                    </Field>
                    <Field label="Rua" required hint={err('endereco')}>
                      {id => <input id={id} className={cx(inputCls, errCls('endereco'))} value={form.endereco} onChange={e => set('endereco', e.target.value)} autoComplete="address-line1" />}
                    </Field>
                  </div>
                  {cepNote && <p className={cx('-mt-2 text-[13px]', cepNote.ok ? 'text-[#0E5A38]' : 'text-[#B54708]')} role="status">{cepNote.text}</p>}
                  <div className="grid gap-5 sm:grid-cols-3">
                    <Field label="Número">
                      {id => <input id={id} className={inputCls} value={form.numero} onChange={e => set('numero', e.target.value)} placeholder="Ex.: 120 ou s/n" />}
                    </Field>
                    <Field label="Complemento">
                      {id => <input id={id} className={inputCls} value={form.complemento} onChange={e => set('complemento', e.target.value)} />}
                    </Field>
                    <Field label="Bairro">
                      {id => <input id={id} className={inputCls} value={form.bairro} onChange={e => set('bairro', e.target.value)} />}
                    </Field>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-[1fr_140px]">
                    <Field label="Cidade" required hint={err('cidade')}>
                      {id => <input id={id} className={cx(inputCls, errCls('cidade'))} value={form.cidade} onChange={e => set('cidade', e.target.value)} autoComplete="address-level2" />}
                    </Field>
                    <Field label="Estado" required hint={err('estado')}>
                      {id => (
                        <select id={id} className={cx(inputCls, errCls('estado'))} value={normalizeBrazilianUF(form.estado) || ''} onChange={e => set('estado', e.target.value)}>
                          <option value="">UF</option>
                          {(BRAZILIAN_UFS as any[]).map((u: any) => {
                            const code = typeof u === 'string' ? u : u.sigla || u.uf || u.value;
                            return <option key={code} value={code}>{code}</option>;
                          })}
                        </select>
                      )}
                    </Field>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Telefone da escola" required hint={err('telefone')}>
                      {id => <input id={id} className={cx(inputCls, errCls('telefone'))} inputMode="tel" value={form.telefone} onChange={e => set('telefone', maskPhone(e.target.value))} placeholder="(83) 3000-0000" autoComplete="tel" />}
                    </Field>
                    <Field label="E-mail da escola" hint={err('emailInstitucional') || 'Opcional'}>
                      {id => <input id={id} type="email" className={cx(inputCls, errCls('emailInstitucional'))} value={form.emailInstitucional} onChange={e => set('emailInstitucional', e.target.value)} placeholder="secretaria@escola.com.br" autoComplete="email" />}
                    </Field>
                  </div>
                  <Field label="Site" hint="Opcional">
                    {id => <input id={id} className={inputCls} value={form.site} onChange={e => set('site', e.target.value)} placeholder="www.escola.com.br" autoComplete="url" />}
                  </Field>
                </>
              )}

              {step === 3 && (
                <>
                  <StepTitle icon={ShieldCheck} title="Confira e conclua" text="Você será a pessoa responsável pela gestão desta escola no sistema." />
                  <dl className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
                    <Summary label="Escola" value={[form.nomeEscola, form.nomeFantasia && `(${form.nomeFantasia})`].filter(Boolean).join(' ')} onEdit={() => setStep(1)} />
                    <Summary label="CNPJ" value={[form.cnpj, form.inep && `INEP ${form.inep}`].filter(Boolean).join(' · ')} onEdit={() => setStep(1)} />
                    <Summary label="Endereço" value={[fullAddress, [form.cidade, normalizeBrazilianUF(form.estado)].filter(Boolean).join(' - '), form.cep].filter(Boolean).join(' · ')} onEdit={() => setStep(2)} />
                    <Summary label="Contato" value={[form.telefone, form.emailInstitucional].filter(Boolean).join(' · ')} onEdit={() => setStep(2)} />
                    <Summary label="Gestor responsável" value={[managerName, managerEmail].filter(Boolean).join(' · ') || 'Sua conta'} />
                  </dl>
                  <div className="space-y-3">
                    <Check2 checked={form.chkAutorizacao} onChange={v => set('chkAutorizacao', v)} error={errors.chkAutorizacao}>
                      Declaro que trabalho na gestão desta escola e posso cadastrá-la.
                    </Check2>
                    <Check2 checked={form.chkTermos} onChange={v => set('chkTermos', v)} error={errors.chkTermos}>
                      Li e aceito os termos de uso e a política de privacidade, inclusive o tratamento de dados de estudantes conforme a LGPD.
                    </Check2>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {submitError && (
            <div className="mt-5">
              <Alert tone="danger">{submitError}</Alert>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
            {step > 1 ? (
              <Button type="button" variant="ghost" icon={ArrowLeft} onClick={back} disabled={saving}>Voltar</Button>
            ) : (
              <span />
            )}
            {step < 3 ? (
              <Button type="button" onClick={next}>
                Continuar <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" loading={saving} icon={Check}>{saving ? 'Cadastrando…' : 'Concluir cadastro'}</Button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}

function StepTitle({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--accent)]" style={{ background: 'var(--accent-soft)' }}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-[18px] font-semibold text-[var(--text-heading)]">{title}</h2>
        <p className="text-[13px] text-[var(--text-muted)]">{text}</p>
      </div>
    </div>
  );
}

function Summary({ label, value, onEdit }: { label: string; value: string; onEdit?: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <dt className="text-[12px] font-medium text-[var(--text-muted)]">{label}</dt>
        <dd className="mt-0.5 break-words text-[14px] text-[var(--text-heading)]">{value || '—'}</dd>
      </div>
      {onEdit && (
        <button type="button" onClick={onEdit} className="shrink-0 text-[13px] font-semibold text-[var(--accent)] hover:underline">
          Alterar
        </button>
      )}
    </div>
  );
}

function Check2({ checked, onChange, error, children }: { checked: boolean; onChange: (v: boolean) => void; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={cx('flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors', checked ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : error ? 'border-[#B42318]' : 'border-[var(--border)] hover:border-[var(--accent)]')}>
        <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="text-[14px] leading-relaxed text-[var(--text-body)]">{children}</span>
      </label>
      {error && <p className="mt-1.5 text-[12px] text-[#B42318]">{error}</p>}
    </div>
  );
}

export default OnboardingPage;