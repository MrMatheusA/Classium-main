import { useCallback, useEffect, useState } from 'react';
import { Building2, Eye, EyeOff, KeyRound, Mail, Settings2, ShieldCheck, UserRound } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePlatform } from '../../context/PlatformContext';
import { useAccess } from '../../auth/AccessProvider';
import { Alert, Button, Card, Field, Skeleton, Toast, cx, inputCls } from '../ui/kit';
import { ModuleHeader, Segmented } from '../ui/ModuleParts';

/*
 * Configurações da conta de quem está logado.
 * O acesso da direção fica no e-mail institucional da escola: quando o diretor
 * muda, o novo diretor entra com o mesmo e-mail e só atualiza nome, cargo e
 * telefone aqui. A senha também é trocada aqui.
 */

type Aba = 'dados' | 'acesso' | 'escola';

interface Dados {
  full_name: string;
  email: string;
  cpf: string;
  phone: string;
  job_title: string;
  organization_name: string;
}

const onlyDigits = (v: string) => v.replace(/\D/g, '');

function maskCpf(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

function maskPhone(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function isValidCpf(v: string) {
  const d = onlyDigits(v);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const calc = (len: number) => {
    let s = 0;
    for (let i = 0; i < len; i++) s += Number(d[i]) * (len + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

function friendly(raw?: string) {
  const m = (raw || '').toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials')) return 'A senha atual está errada.';
  if (m.includes('same') && m.includes('password')) return 'A nova senha precisa ser diferente da atual.';
  if (m.includes('weak') || m.includes('at least')) return 'Senha fraca. Use pelo menos 8 caracteres, com letras e números.';
  if (m.includes('already') && m.includes('email')) return 'Este e-mail já é usado por outra conta.';
  if (m.includes('rate limit')) return 'Muitas tentativas seguidas. Aguarde alguns minutos.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Sem conexão com a internet. Tente de novo.';
  if (m.includes('could not find the function') || m.includes('does not exist')) return 'Esta área ainda não foi ativada no banco. Peça para rodar a atualização de Configurações.';
  return raw || 'Não foi possível salvar. Tente de novo.';
}

export function AdminConfiguracoes() {
  const { setActiveAdminTab } = usePlatform() as any;
  const { refresh } = useAccess();

  const [aba, setAba] = useState<Aba>('dados');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dados, setDados] = useState<Dados | null>(null);
  const [form, setForm] = useState<Dados | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'danger' } | null>(null);

  // acesso
  const [newEmail, setNewEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [pw, setPw] = useState({ atual: '', nova: '', confirma: '' });
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const [{ data: sess }, { data, error }] = await Promise.all([supabase.auth.getSession(), supabase.rpc('classium_get_my_settings')]);
    const res = (data || {}) as any;
    if (error || res.success === false) {
      setLoadError(friendly(error?.message || res.error));
      setLoading(false);
      return;
    }
    const d: Dados = {
      full_name: res.full_name || '',
      email: sess?.session?.user?.email || res.email || '',
      cpf: res.cpf ? maskCpf(res.cpf) : '',
      phone: res.phone || '',
      job_title: res.job_title || '',
      organization_name: res.organization_name || '',
    };
    setDados(d);
    setForm(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changed = !!(form && dados) && (['full_name', 'cpf', 'phone', 'job_title'] as const).some(k => form[k] !== dados[k]);

  /* --------------------------- Meus dados --------------------------- */

  const saveDados = async () => {
    if (!form) return;
    setFormError(null);
    if (form.full_name.trim().split(/\s+/).length < 2) return setFormError('Informe o nome completo (nome e sobrenome).');
    if (form.cpf && !isValidCpf(form.cpf)) return setFormError('CPF inválido. Confira os números.');
    if (form.phone && onlyDigits(form.phone).length < 10) return setFormError('Telefone incompleto. Use DDD e número.');

    setSaving(true);
    const { data, error } = await supabase.rpc('classium_update_my_profile', {
      p_full_name: form.full_name.trim(),
      p_phone: form.phone.trim() || null,
      p_job_title: form.job_title.trim() || null,
      p_cpf: onlyDigits(form.cpf) || null,
    });
    const res = (data || {}) as any;
    if (error || res.success === false) {
      setSaving(false);
      return setFormError(friendly(error?.message || res.error));
    }
    // mantém o nome da conta igual ao do cadastro (não impede o salvamento)
    await supabase.auth.updateUser({ data: { full_name: form.full_name.trim(), name: form.full_name.trim() } }).catch(() => null);
    setSaving(false);
    setDados(form);
    setToast({ message: 'Seus dados foram salvos.', tone: 'success' });
    refresh().catch(() => null); // atualiza o nome no topo da tela
  };

  /* ----------------------------- Acesso ----------------------------- */

  const saveEmail = async () => {
    setEmailMsg(null);
    const e = newEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(e)) return setEmailMsg({ tone: 'danger', text: 'Digite um e-mail válido.' });
    if (e === dados?.email.toLowerCase()) return setEmailMsg({ tone: 'danger', text: 'Este já é o e-mail de acesso.' });
    setEmailSaving(true);
    const { error } = await supabase.auth.updateUser({ email: e });
    setEmailSaving(false);
    if (error) return setEmailMsg({ tone: 'danger', text: friendly(error.message) });
    setNewEmail('');
    setEmailMsg({
      tone: 'success',
      text: `Enviamos um link de confirmação para ${e}. O e-mail de acesso só muda depois que o link for aberto. Até lá, continue entrando com ${dados?.email}.`,
    });
  };

  const savePassword = async () => {
    setPwMsg(null);
    if (!pw.atual) return setPwMsg({ tone: 'danger', text: 'Digite a senha atual.' });
    if (pw.nova.length < 8 || !/[a-zA-Z]/.test(pw.nova) || !/\d/.test(pw.nova))
      return setPwMsg({ tone: 'danger', text: 'A nova senha precisa ter pelo menos 8 caracteres, com letras e números.' });
    if (pw.nova !== pw.confirma) return setPwMsg({ tone: 'danger', text: 'A confirmação não é igual à nova senha.' });
    if (!dados?.email) return setPwMsg({ tone: 'danger', text: 'Não foi possível identificar sua conta. Entre de novo.' });

    setPwSaving(true);
    // confere a senha atual antes de trocar
    const check = await supabase.auth.signInWithPassword({ email: dados.email, password: pw.atual });
    if (check.error) {
      setPwSaving(false);
      return setPwMsg({ tone: 'danger', text: friendly(check.error.message) });
    }
    const { error } = await supabase.auth.updateUser({ password: pw.nova });
    setPwSaving(false);
    if (error) return setPwMsg({ tone: 'danger', text: friendly(error.message) });
    setPw({ atual: '', nova: '', confirma: '' });
    setPwMsg({ tone: 'success', text: 'Senha alterada. Use a nova senha no próximo acesso.' });
  };

  /* ----------------------------- Visual ----------------------------- */

  return (
    <div className="space-y-6 pb-16 text-left">
      <ModuleHeader icon={Settings2} title="Configurações" text="Seus dados, e-mail de acesso e senha." />

      <Segmented<Aba>
        label="Seção"
        value={aba}
        onChange={setAba}
        items={[
          { id: 'dados', label: 'Meus dados' },
          { id: 'acesso', label: 'E-mail e senha' },
          { id: 'escola', label: 'Escola' },
        ]}
      />

      {loading ? (
        <Card>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        </Card>
      ) : loadError ? (
        <Alert tone="danger" action={<Button variant="secondary" size="sm" onClick={load}>Tentar de novo</Button>}>
          {loadError}
        </Alert>
      ) : (
        form && (
          <>
            {aba === 'dados' && (
              <Card>
                <div className="space-y-5">
                  <SectionTitle icon={UserRound} title="Meus dados" text="Aparecem no topo da tela, nos comunicados e nos documentos assinados pela direção." />
                  <Alert tone="info">
                    Mudou a direção da escola? O novo diretor entra com o mesmo e-mail institucional, troca a senha em "E-mail e senha" e atualiza os dados aqui. Nada do que a escola já cadastrou se perde.
                  </Alert>
                  {formError && <Alert tone="danger">{formError}</Alert>}
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Nome completo" required>
                      {id => <input id={id} className={inputCls} value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} autoComplete="name" />}
                    </Field>
                    <Field label="Cargo" hint="Ex.: Diretora, Vice-diretor, Coordenadora">
                      {id => <input id={id} className={inputCls} value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} />}
                    </Field>
                    <Field label="CPF">
                      {id => <input id={id} className={inputCls} inputMode="numeric" value={form.cpf} onChange={e => setForm({ ...form, cpf: maskCpf(e.target.value) })} placeholder="000.000.000-00" />}
                    </Field>
                    <Field label="Telefone">
                      {id => <input id={id} className={inputCls} inputMode="tel" value={form.phone} onChange={e => setForm({ ...form, phone: maskPhone(e.target.value) })} placeholder="(83) 99999-0000" autoComplete="tel" />}
                    </Field>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] pt-5">
                    {changed && (
                      <Button variant="ghost" onClick={() => { setForm(dados); setFormError(null); }} disabled={saving}>
                        Desfazer
                      </Button>
                    )}
                    <Button onClick={saveDados} loading={saving} disabled={!changed}>
                      Salvar meus dados
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {aba === 'acesso' && (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <div className="space-y-5">
                    <SectionTitle icon={Mail} title="E-mail de acesso" text="É com ele que você entra no sistema." />
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-alt)] px-4 py-3">
                      <p className="text-[12px] text-[var(--text-muted)]">E-mail atual</p>
                      <p className="mt-0.5 break-all text-[15px] font-semibold text-[var(--text-heading)]">{dados?.email || '—'}</p>
                    </div>
                    <Alert tone="warning">Recomendamos usar o e-mail institucional da escola, e não um e-mail pessoal. Assim o acesso fica com a escola quando a direção mudar.</Alert>
                    {emailMsg && <Alert tone={emailMsg.tone}>{emailMsg.text}</Alert>}
                    <Field label="Novo e-mail">
                      {id => <input id={id} type="email" className={inputCls} value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="direcao@escola.com.br" autoComplete="email" />}
                    </Field>
                    <div className="flex justify-end">
                      <Button variant="secondary" onClick={saveEmail} loading={emailSaving} disabled={!newEmail.trim()}>
                        Trocar e-mail
                      </Button>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="space-y-5">
                    <SectionTitle icon={KeyRound} title="Senha" text="Troque a senha sempre que alguém deixar a direção." />
                    {pwMsg && <Alert tone={pwMsg.tone}>{pwMsg.text}</Alert>}
                    <Field label="Senha atual" required>
                      {id => <input id={id} type={showPw ? 'text' : 'password'} className={inputCls} value={pw.atual} onChange={e => setPw({ ...pw, atual: e.target.value })} autoComplete="current-password" />}
                    </Field>
                    <Field label="Nova senha" required hint="Pelo menos 8 caracteres, com letras e números.">
                      {id => <input id={id} type={showPw ? 'text' : 'password'} className={inputCls} value={pw.nova} onChange={e => setPw({ ...pw, nova: e.target.value })} autoComplete="new-password" />}
                    </Field>
                    <Field label="Confirme a nova senha" required>
                      {id => <input id={id} type={showPw ? 'text' : 'password'} className={inputCls} value={pw.confirma} onChange={e => setPw({ ...pw, confirma: e.target.value })} autoComplete="new-password" />}
                    </Field>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button type="button" onClick={() => setShowPw(v => !v)} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-heading)]">
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {showPw ? 'Ocultar senhas' : 'Mostrar senhas'}
                      </button>
                      <Button onClick={savePassword} loading={pwSaving}>
                        Trocar senha
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {aba === 'escola' && (
              <Card>
                <div className="space-y-5">
                  <SectionTitle icon={Building2} title={dados?.organization_name || 'Dados da escola'} text="Razão social, CNPJ, INEP, endereço, contatos, logo e equipe gestora." />
                  <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[14px] text-[var(--text-body)]">Os dados da escola ficam na tela própria, com a equipe gestora.</p>
                    <Button variant="secondary" icon={Building2} onClick={() => setActiveAdminTab?.('instituicao')}>
                      Abrir dados da escola
                    </Button>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl bg-[var(--bg-card-alt)] p-4">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]" />
                    <p className="text-[13px] leading-relaxed text-[var(--text-body)]">
                      Os dados de estudantes e famílias são tratados conforme a LGPD. Só a equipe da escola tem acesso, e cada pessoa vê apenas o que o cargo dela permite.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </>
        )
      )}

      <Toast message={toast?.message ?? null} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}

function SectionTitle({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) {
  return (
    <div className={cx('flex items-start gap-3')}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--accent)]" style={{ background: 'var(--accent-soft)' }}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-[17px] font-semibold text-[var(--text-heading)]">{title}</h2>
        <p className="text-[13px] text-[var(--text-muted)]">{text}</p>
      </div>
    </div>
  );
}

export default AdminConfiguracoes;