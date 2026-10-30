import React, { useEffect, useId, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { usePlatform } from '../context/PlatformContext';
import { useAuth } from '../hooks/useAuth';
import { useAccess } from '../auth/AccessProvider';
import { supabase } from '../lib/supabase';
import { maskCPF } from '../utils/masks';
import { Logo } from './Logo';
import { BrandShield } from './BrandShield';
import { HeroPattern } from './landing/effects';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Heart,
  IdCard,
  Info,
  KeyRound,
  Loader2,
  Mail,
  MailCheck,
  Phone,
  ShieldCheck,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';

/*
 * Tela de acesso do Classium.
 * A pessoa NÃO escolhe o perfil: depois do login o banco responde quem ela é
 * (função resolve_my_access) e o App leva para o painel certo.
 *
 * Telas: entrar · esqueci a senha · nova senha · cadastro da escola · cadastro da família · confirme o e-mail
 */

type Flow = 'login' | 'forgot' | 'new-password' | 'register-gestor' | 'register-family' | 'check-email';
type PlatformFlow = 'login' | 'register-gestor' | 'register-family';

const EASE = [0.22, 1, 0.36, 1] as const;

function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function isValidCPF(value: string) {
  const cpf = value.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

/** Traduz as mensagens do Supabase para algo que a pessoa entende */
function friendlyError(message?: string) {
  const m = (message || '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar. O link foi enviado para a sua caixa de entrada.';
  if (m.includes('already registered') || m.includes('already exists')) return 'Este e-mail já tem cadastro. Entre com ele ou use "Esqueci minha senha".';
  if (m.includes('invalid email') || m.includes('email format')) return 'Informe um e-mail válido.';
  if (m.includes('password should be') || m.includes('weak password')) return 'Escolha uma senha mais forte, com pelo menos 8 caracteres.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.';
  if (m.includes('same password') || m.includes('different from the old')) return 'A nova senha precisa ser diferente da atual.';
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('load failed'))
    return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
  return message || 'Algo deu errado. Tente novamente.';
}

function redirectUrl(path: string) {
  return `${window.location.origin}${path}`;
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

export function LoginPage() {
  const { setMode, loginFlow, setLoginFlow, setGestorAccount, setCurrentUser } = usePlatform();
  const { login } = useAuth();
  const { access, refresh, passwordRecovery, finishPasswordRecovery } = useAccess();

  const initialFlow: Flow = passwordRecovery || access.mustChangePassword ? 'new-password' : (loginFlow as PlatformFlow) || 'login';
  const [flow, setFlowState] = useState<Flow>(initialFlow);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkEmailFor, setCheckEmailFor] = useState('');

  // acompanha os links /entrar, /cadastro/escola, /cadastro/familia
  useEffect(() => {
    if (passwordRecovery || access.mustChangePassword) setFlowState('new-password');
    else if (loginFlow) setFlowState(loginFlow as PlatformFlow);
  }, [loginFlow, passwordRecovery, access.mustChangePassword]);

  const goTo = (next: Flow) => {
    setError('');
    setNotice('');
    setFlowState(next);
    if (next === 'login' || next === 'register-gestor' || next === 'register-family') setLoginFlow(next);
  };

  /* ---------------- entrar ---------------- */
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!email.trim() || !password) return setError('Informe seu e-mail e sua senha.');

    setBusy(true);
    try {
      const { error: loginError } = await login(email.trim().toLowerCase(), password);
      if (loginError) return setError(friendlyError(loginError.message));

      // o banco diz quem é a pessoa; o App leva ao painel certo
      const found = await refresh();
      if (!found.resolved) {
        setError('Não conseguimos confirmar o seu perfil agora. Tente de novo em instantes.');
      } else if (found.role === 'parceiro') {
        await supabase.auth.signOut();
        setError('Esta é uma conta de parceiro. Entre pela "Área do parceiro", na página inicial.');
      } else if (found.role === 'none') {
        await supabase.auth.signOut();
        setError('Sua conta ainda não tem acesso a nenhum painel. Fale com a secretaria da sua escola.');
      }
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : undefined));
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- esqueci a senha ---------------- */
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) return setError('Informe o e-mail da sua conta.');
    setBusy(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: redirectUrl('/entrar?redefinir=1'),
    });
    setBusy(false);
    if (resetError && !resetError.message.toLowerCase().includes('not found')) return setError(friendlyError(resetError.message));
    // mesma resposta exista ou não a conta, para não revelar quem está cadastrado
    setNotice(`Se houver uma conta com ${email.trim()}, você vai receber um link para criar uma nova senha.`);
  };

  /* ---------------- nova senha (link do e-mail ou senha provisória) ---------------- */
  const [newPass, setNewPass] = useState('');
  const [newPass2, setNewPass2] = useState('');

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPass.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres.');
    if (newPass !== newPass2) return setError('As senhas não são iguais.');

    setBusy(true);
    try {
      const { data, error: updError } = await supabase.auth.updateUser({ password: newPass });
      if (updError) return setError(friendlyError(updError.message));
      if (data.user) {
        await supabase.from('profiles').update({ must_change_password: false }).eq('id', data.user.id);
      }
      finishPasswordRecovery();
      setNewPass('');
      setNewPass2('');
      await refresh(); // o App leva ao painel
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- cadastro da escola (gestor) ---------------- */
  const [gName, setGName] = useState('');
  const [gEmail, setGEmail] = useState('');
  const [gTitle, setGTitle] = useState('Diretor(a)');
  const [gPass, setGPass] = useState('');
  const [gPass2, setGPass2] = useState('');
  const [gTerms, setGTerms] = useState(false);

  const handleGestorRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!gName.trim() || !gEmail.trim()) return setError('Preencha nome e e-mail.');
    if (gPass.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres.');
    if (gPass !== gPass2) return setError('As senhas não são iguais.');
    if (!gTerms) return setError('Para continuar, aceite os termos de uso e a política de privacidade.');

    setBusy(true);
    try {
      const cleanEmail = gEmail.trim().toLowerCase();
      const { data, error: signError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: gPass,
        options: {
          emailRedirectTo: redirectUrl('/entrar'),
          data: { kind: 'institucional', full_name: gName.trim(), job_title: gTitle },
        },
      });
      if (signError) return setError(friendlyError(signError.message));
      if (!data.user) return setError('Não foi possível criar a conta. Tente novamente.');

      if (!data.session) {
        // confirmação de e-mail ligada no Supabase
        setCheckEmailFor(cleanEmail);
        setFlowState('check-email');
        return;
      }

      setGestorAccount({ id: data.user.id, name: gName.trim(), email: cleanEmail });
      const found = await refresh(); // gestor sem escola → o App abre o cadastro da escola
      if (found.needsOnboarding) setMode('onboarding');
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : undefined));
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- cadastro da família ---------------- */
  const [fStep, setFStep] = useState<1 | 2 | 3>(1);
  const [fName, setFName] = useState('');
  const [fCpf, setFCpf] = useState('');
  const [fPhone, setFPhone] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fPass, setFPass] = useState('');
  const [fPass2, setFPass2] = useState('');
  const [fTerms, setFTerms] = useState(false);
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [linkMessage, setLinkMessage] = useState('');

  const handleFamilyStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (fName.trim().split(/\s+/).length < 2) return setError('Informe seu nome completo.');
    if (!isValidCPF(fCpf)) return setError('CPF inválido. Confira os números.');
    if (fPhone.replace(/\D/g, '').length < 10) return setError('Informe um celular com DDD.');
    if (!fEmail.includes('@')) return setError('Informe um e-mail válido.');
    setFStep(2);
  };

  const handleFamilyRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (fPass.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres.');
    if (fPass !== fPass2) return setError('As senhas não são iguais.');
    if (!fTerms) return setError('Para continuar, aceite os termos de uso e a política de privacidade.');

    setBusy(true);
    try {
      const cleanEmail = fEmail.trim().toLowerCase();
      const cpf = fCpf.replace(/\D/g, '');
      const { data, error: signError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: fPass,
        options: {
          emailRedirectTo: redirectUrl('/entrar'),
          data: { kind: 'familia', full_name: fName.trim(), cpf, phone: fPhone.replace(/\D/g, '') },
        },
      });
      if (signError) return setError(friendlyError(signError.message));

      if (!data.session) {
        // depois de confirmar o e-mail e entrar, os filhos são ligados automaticamente
        setCheckEmailFor(cleanEmail);
        setFlowState('check-email');
        return;
      }

      const { data: link } = await supabase.rpc('link_family_by_cpf', { p_cpf: cpf });
      const result = (link ?? {}) as { ok?: boolean; children?: ChildInfo[]; message?: string };
      setChildren(result.children ?? []);
      setLinkMessage(result.ok ? '' : result.message ?? '');
      setFStep(3);
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : undefined));
    } finally {
      setBusy(false);
    }
  };

  const enterFamilyPanel = async () => {
    setBusy(true);
    setCurrentUser({ name: fName.trim(), email: fEmail.trim().toLowerCase(), role: 'familia' } as Parameters<typeof setCurrentUser>[0]);
    await refresh(); // o App leva ao painel da família
    setBusy(false);
  };

  /* ---------------- textos do painel lateral ---------------- */
  const side = SIDE_COPY[flow === 'register-family' ? 'register-family' : flow === 'register-gestor' ? 'register-gestor' : 'login'];

  return (
    <div className="flex min-h-screen bg-[var(--bg-app)] font-sans text-[var(--text-body)] antialiased">
      {/* -------- painel da marca (desktop) -------- */}
      <aside className="relative m-3 hidden w-[44%] max-w-[640px] overflow-hidden rounded-[32px] lg:flex" style={{ background: 'var(--sidebar-bg)', color: 'var(--sidebar-fg)' }}>
        <HeroPattern />
        <div className="relative flex w-full flex-col justify-between p-12 xl:p-14">
          <button onClick={() => setMode('landing')} className="flex items-center gap-3 self-start" aria-label="Ir para a página inicial">
            <span className="h-11 w-11 rounded-2xl p-2" style={{ background: 'var(--sidebar-active-bg)' }}>
              <BrandShield size="100%" />
            </span>
            <span className="font-serif text-2xl font-semibold">Classium</span>
          </button>

          <AnimatePresence mode="wait">
            <motion.div
              key={side.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.45, ease: EASE }}
            >
              <h2 className="font-serif text-[44px] font-semibold leading-[1.05] tracking-[-0.02em] xl:text-[52px]">{side.title}</h2>
              <p className="mt-5 max-w-md text-[16px] leading-relaxed" style={{ color: 'var(--sidebar-muted)' }}>
                {side.text}
              </p>
              <ul className="mt-10 space-y-4">
                {side.points.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3.5 text-[15px]">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--sidebar-bg-hover)', color: 'var(--hero-highlight)' }}>
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>

          <p className="text-[13px]" style={{ color: 'var(--sidebar-muted)' }}>
            Seus dados ficam protegidos e cada perfil vê só o que lhe diz respeito.
          </p>
        </div>
      </aside>

      {/* -------- formulário -------- */}
      <main className="flex flex-1 flex-col">
        <div className="flex items-center justify-between px-5 py-5 sm:px-10">
          <button
            id="back-to-home"
            onClick={() => setMode('landing')}
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-card)] hover:text-[var(--text-heading)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Página inicial
          </button>
          <div className="lg:hidden">
            <Logo size="sm" variant="portal" surface="light" />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-12 sm:px-10">
          <div className="w-full max-w-[440px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={flow + (flow === 'register-family' ? fStep : '')}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                {/* ======== ENTRAR ======== */}
                {flow === 'login' && (
                  <>
                    <Heading title="Entrar no Classium" text="Use o e-mail cadastrado. Você vai direto para o seu painel." />
                    <Alerts error={error} notice={notice} />
                    <form onSubmit={handleLogin} className="space-y-4" noValidate>
                      <Field label="E-mail" icon={Mail} type="email" autoComplete="email" value={email} onChange={setEmail} placeholder="voce@exemplo.com" />
                      <PasswordField
                        label="Senha"
                        value={password}
                        onChange={setPassword}
                        autoComplete="current-password"
                        action={
                          <button type="button" onClick={() => goTo('forgot')} className="text-[13px] font-semibold text-[var(--accent)] hover:underline">
                            Esqueci minha senha
                          </button>
                        }
                      />
                      <SubmitButton busy={busy} label="Entrar" busyLabel="Entrando…" />
                    </form>

                    <Divider text="Ainda não tem conta?" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <ChoiceButton icon={Briefcase} title="Sou da escola" text="Cadastrar minha escola" onClick={() => goTo('register-gestor')} />
                      <ChoiceButton icon={Heart} title="Sou responsável" text="Acompanhar meu filho" onClick={() => goTo('register-family')} />
                    </div>
                    <p className="mt-6 flex items-start gap-2 text-[13px] leading-relaxed text-[var(--text-muted)]">
                      <Info className="mt-0.5 h-4 w-4 shrink-0" />
                      Professores e equipe recebem o acesso pela escola. Na primeira entrada, você cria a sua senha.
                    </p>
                  </>
                )}

                {/* ======== ESQUECI A SENHA ======== */}
                {flow === 'forgot' && (
                  <>
                    <BackLink onClick={() => goTo('login')} />
                    <Heading title="Recuperar senha" text="Enviaremos um link para você criar uma nova senha." />
                    <Alerts error={error} notice={notice} />
                    {!notice && (
                      <form onSubmit={handleForgot} className="space-y-4" noValidate>
                        <Field label="E-mail da conta" icon={Mail} type="email" autoComplete="email" value={email} onChange={setEmail} placeholder="voce@exemplo.com" />
                        <SubmitButton busy={busy} label="Enviar link" busyLabel="Enviando…" />
                      </form>
                    )}
                    {notice && <SecondaryButton onClick={() => goTo('login')}>Voltar para entrar</SecondaryButton>}
                  </>
                )}

                {/* ======== NOVA SENHA ======== */}
                {flow === 'new-password' && (
                  <>
                    <Heading
                      title="Crie sua nova senha"
                      text={
                        access.mustChangePassword
                          ? 'Este é seu primeiro acesso. Por segurança, troque a senha provisória que a escola enviou.'
                          : 'Escolha uma senha nova para entrar no Classium.'
                      }
                    />
                    <Alerts error={error} notice={notice} />
                    <form onSubmit={handleNewPassword} className="space-y-4" noValidate>
                      <PasswordField label="Nova senha" value={newPass} onChange={setNewPass} autoComplete="new-password" showStrength />
                      <PasswordField label="Repita a nova senha" value={newPass2} onChange={setNewPass2} autoComplete="new-password" />
                      <SubmitButton busy={busy} label="Salvar e entrar" busyLabel="Salvando…" />
                    </form>
                  </>
                )}

                {/* ======== CADASTRO DA ESCOLA ======== */}
                {flow === 'register-gestor' && (
                  <>
                    <BackLink onClick={() => goTo('login')} />
                    <Steps current={1} labels={['Sua conta', 'Dados da escola']} />
                    <Heading title="Cadastre sua escola" text="Primeiro, a conta de quem vai administrar. Depois, os dados da escola." />
                    <Alerts error={error} notice={notice} />
                    <form onSubmit={handleGestorRegister} className="space-y-4" noValidate>
                      <Field label="Nome completo" icon={User} autoComplete="name" value={gName} onChange={setGName} placeholder="Seu nome" />
                      <Field label="E-mail" icon={Mail} type="email" autoComplete="email" value={gEmail} onChange={setGEmail} placeholder="voce@suaescola.com.br" />
                      <SelectField
                        label="Seu cargo"
                        icon={Briefcase}
                        value={gTitle}
                        onChange={setGTitle}
                        options={['Diretor(a)', 'Gestor(a)', 'Vice-diretor(a)', 'Coordenador(a)', 'Mantenedor(a)']}
                      />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <PasswordField label="Senha" value={gPass} onChange={setGPass} autoComplete="new-password" showStrength />
                        <PasswordField label="Repita a senha" value={gPass2} onChange={setGPass2} autoComplete="new-password" />
                      </div>
                      <Terms checked={gTerms} onChange={setGTerms} />
                      <SubmitButton busy={busy} label="Criar conta e continuar" busyLabel="Criando conta…" />
                    </form>
                    <SwitchLine text="Já tem conta?" action="Entrar" onClick={() => goTo('login')} />
                  </>
                )}

                {/* ======== CADASTRO DA FAMÍLIA ======== */}
                {flow === 'register-family' && (
                  <>
                    {fStep < 3 && <BackLink onClick={() => (fStep === 2 ? setFStep(1) : goTo('login'))} />}
                    <Steps current={fStep} labels={['Seus dados', 'Senha', 'Seus filhos']} />

                    {fStep === 1 && (
                      <>
                        <Heading title="Conta da família" text="Use o mesmo CPF e e-mail que você informou na matrícula. É assim que encontramos seus filhos." />
                        <Alerts error={error} notice={notice} />
                        <form onSubmit={handleFamilyStep1} className="space-y-4" noValidate>
                          <Field label="Nome completo" icon={User} autoComplete="name" value={fName} onChange={setFName} placeholder="Seu nome completo" />
                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="CPF" icon={IdCard} inputMode="numeric" value={fCpf} onChange={(v) => setFCpf(maskCPF(v))} placeholder="000.000.000-00" maxLength={14} />
                            <Field label="Celular" icon={Phone} type="tel" autoComplete="tel" value={fPhone} onChange={(v) => setFPhone(maskPhone(v))} placeholder="(00) 00000-0000" />
                          </div>
                          <Field label="E-mail" icon={Mail} type="email" autoComplete="email" value={fEmail} onChange={setFEmail} placeholder="voce@exemplo.com" />
                          <SubmitButton busy={false} label="Continuar" />
                        </form>
                        <SwitchLine text="Já tem conta?" action="Entrar" onClick={() => goTo('login')} />
                      </>
                    )}

                    {fStep === 2 && (
                      <>
                        <Heading title="Crie sua senha" text={`Você vai entrar com ${fEmail.trim().toLowerCase()}.`} />
                        <Alerts error={error} notice={notice} />
                        <form onSubmit={handleFamilyRegister} className="space-y-4" noValidate>
                          <PasswordField label="Senha" value={fPass} onChange={setFPass} autoComplete="new-password" showStrength />
                          <PasswordField label="Repita a senha" value={fPass2} onChange={setFPass2} autoComplete="new-password" />
                          <Terms checked={fTerms} onChange={setFTerms} />
                          <SubmitButton busy={busy} label="Criar conta" busyLabel="Criando conta…" />
                        </form>
                      </>
                    )}

                    {fStep === 3 && (
                      <>
                        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                          <CheckCircle2 className="h-7 w-7" />
                        </div>
                        <Heading
                          title="Conta criada!"
                          text={children.length ? 'Encontramos os alunos ligados ao seu cadastro na escola.' : 'Sua conta está pronta.'}
                        />
                        {children.length > 0 ? (
                          <ul className="mb-6 space-y-2">
                            {children.map((c) => (
                              <li key={c.student_id} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl text-[13px] font-semibold" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                                  {c.full_name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                                </span>
                                <span className="min-w-0 flex-1 leading-tight">
                                  <span className="block truncate text-[14px] font-semibold text-[var(--text-heading)]">{c.full_name}</span>
                                  <span className="block truncate text-[12px] text-[var(--text-muted)]">
                                    {[c.class_name, c.shift, c.school_name].filter(Boolean).join(' · ')}
                                  </span>
                                </span>
                                <Check className="h-4 w-4 text-[var(--accent)]" strokeWidth={3} />
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-[14px] leading-relaxed text-[var(--text-body)]">
                            {linkMessage ||
                              'Ainda não encontramos alunos para este cadastro. Assim que a escola registrar, eles aparecem no seu painel automaticamente.'}
                          </div>
                        )}
                        <PrimaryAction busy={busy} onClick={enterFamilyPanel}>
                          Ir para o painel da família
                        </PrimaryAction>
                      </>
                    )}
                  </>
                )}

                {/* ======== CONFIRME O E-MAIL ======== */}
                {flow === 'check-email' && (
                  <>
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                      <MailCheck className="h-7 w-7" />
                    </div>
                    <Heading title="Confirme seu e-mail" text={`Enviamos um link para ${checkEmailFor}. Abra o e-mail e toque no link para ativar a conta.`} />
                    <p className="mb-6 text-[14px] leading-relaxed text-[var(--text-muted)]">
                      Depois é só entrar com seu e-mail e senha: o Classium reconhece o seu perfil e abre o painel certo. Não chegou? Veja a caixa de spam.
                    </p>
                    <SecondaryButton
                      onClick={() => {
                        setEmail(checkEmailFor);
                        goTo('login');
                      }}
                    >
                      Ir para entrar
                    </SecondaryButton>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Textos do painel lateral                                            */
/* ------------------------------------------------------------------ */

type ChildInfo = { student_id: string; full_name: string; class_name?: string; shift?: string; school_name?: string; relationship?: string };

const SIDE_COPY: Record<'login' | 'register-gestor' | 'register-family', { title: string; text: string; points: { icon: LucideIcon; text: string }[] }> = {
  login: {
    title: 'Que bom ter você de volta.',
    text: 'Gestão, professores e famílias entram pelo mesmo lugar. O Classium reconhece quem é você e abre o painel certo.',
    points: [
      { icon: Briefcase, text: 'Gestão e equipe da escola' },
      { icon: GraduationCap, text: 'Professores e suas turmas' },
      { icon: Users, text: 'Famílias e seus filhos' },
    ],
  },
  'register-gestor': {
    title: 'Sua escola organizada desde o primeiro dia.',
    text: 'Crie a conta da gestão, cadastre a escola e convide professores e famílias quando estiver pronto.',
    points: [
      { icon: ShieldCheck, text: 'Cada perfil vê só o que precisa' },
      { icon: GraduationCap, text: 'Turmas, chamada e notas no mesmo lugar' },
      { icon: Users, text: 'Famílias ligadas aos alunos com segurança' },
    ],
  },
  'register-family': {
    title: 'A vida escolar do seu filho, em dia.',
    text: 'Frequência, notas, recados e agenda num só lugar. Seus filhos aparecem sozinhos quando a escola registrar a matrícula.',
    points: [
      { icon: CheckCircle2, text: 'Presença e notas no mesmo dia' },
      { icon: Mail, text: 'Comunicados da escola sem grupo de WhatsApp' },
      { icon: Heart, text: 'Vários filhos na mesma conta' },
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Peças do formulário                                                 */
/* ------------------------------------------------------------------ */

function Heading({ title, text }: { title: string; text: string }) {
  return (
    <div className="mb-7">
      <h1 className="font-serif text-[32px] font-semibold leading-tight tracking-[-0.015em] text-[var(--text-heading)]">{title}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-[var(--text-muted)]">{text}</p>
    </div>
  );
}

function Alerts({ error, notice }: { error: string; notice: string }) {
  return (
    <AnimatePresence>
      {(error || notice) && (
        <motion.div
          key={error || notice}
          role={error ? 'alert' : 'status'}
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <div
            className="mb-5 flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-[14px] leading-relaxed"
            style={
              error
                ? { background: '#FEF3F2', borderColor: '#FECDCA', color: '#B42318' }
                : { background: 'var(--accent-soft)', borderColor: 'transparent', color: 'var(--text-heading)' }
            }
          >
            {error ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />}
            <span>{error || notice}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const inputWrap =
  'flex h-12 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3.5 transition-all focus-within:border-[var(--accent)] focus-within:ring-4 focus-within:ring-[var(--accent-soft)]';
const inputCls = 'h-full min-w-0 flex-1 border-none bg-transparent text-[15px] text-[var(--text-heading)] outline-none placeholder:text-[var(--text-muted)]';

function Field({
  label,
  icon: Icon,
  value,
  onChange,
  type = 'text',
  ...rest
}: {
  label: string;
  icon: LucideIcon;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  maxLength?: number;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-[var(--text-heading)]">
        {label}
      </label>
      <div className={inputWrap}>
        <Icon className="h-[18px] w-[18px] shrink-0 text-[var(--text-muted)]" />
        <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} {...rest} />
      </div>
    </div>
  );
}

function SelectField({
  label,
  icon: Icon,
  value,
  onChange,
  options,
}: {
  label: string;
  icon: LucideIcon;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-[var(--text-heading)]">
        {label}
      </label>
      <div className={inputWrap}>
        <Icon className="h-[18px] w-[18px] shrink-0 text-[var(--text-muted)]" />
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} cursor-pointer`}>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function passwordScore(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(s, 4);
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  action,
  showStrength = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  action?: React.ReactNode;
  showStrength?: boolean;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const score = passwordScore(value);
  const labels = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'];
  const colors = ['#D92D20', '#F79009', '#EAAA08', '#22A06B', '#16794C'];

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-[13px] font-semibold text-[var(--text-heading)]">
          {label}
        </label>
        {action}
      </div>
      <div className={inputWrap}>
        <KeyRound className="h-[18px] w-[18px] shrink-0 text-[var(--text-muted)]" />
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder="••••••••"
          className={inputCls}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="rounded-md p-1 text-[var(--text-muted)] hover:text-[var(--text-heading)]"
          aria-label={visible ? 'Esconder senha' : 'Mostrar senha'}
        >
          {visible ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      </div>
      {showStrength && value && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex flex-1 gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="h-1 flex-1 rounded-full transition-colors" style={{ background: i < score ? colors[score] : 'var(--border)' }} />
            ))}
          </div>
          <span className="text-[12px] font-medium" style={{ color: colors[score] }}>
            {labels[score]}
          </span>
        </div>
      )}
    </div>
  );
}

function Terms({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-xl p-1 text-[13px] leading-relaxed text-[var(--text-muted)]">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent)]" />
      <span>Li e aceito os termos de uso e a política de privacidade do Classium, de acordo com a LGPD.</span>
    </label>
  );
}

function SubmitButton({ busy, label, busyLabel }: { busy: boolean; label: string; busyLabel?: string }) {
  return (
    <motion.button
      type="submit"
      disabled={busy}
      whileTap={{ scale: 0.98 }}
      className="group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold shadow-[0_10px_24px_-12px_rgba(16,24,40,0.5)] transition-opacity disabled:opacity-70"
      style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
    >
      {busy ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {busyLabel ?? label}
        </>
      ) : (
        <>
          {label}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </>
      )}
    </motion.button>
  );
}

function PrimaryAction({ busy, onClick, children }: { busy: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={busy}
      whileTap={{ scale: 0.98 }}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold disabled:opacity-70"
      style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
      {!busy && <ArrowRight className="h-4 w-4" />}
    </motion.button>
  );
}

function SecondaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 w-full items-center justify-center rounded-full border-2 border-[var(--border)] bg-[var(--bg-card)] text-[15px] font-semibold text-[var(--text-heading)] transition-colors hover:border-[var(--accent)]"
    >
      {children}
    </button>
  );
}

function ChoiceButton({ icon: Icon, title, text, onClick }: { icon: LucideIcon; title: string; text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[0_12px_24px_-16px_rgba(16,24,40,0.35)]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="leading-tight">
        <span className="block text-[14px] font-semibold text-[var(--text-heading)]">{title}</span>
        <span className="block text-[12px] text-[var(--text-muted)]">{text}</span>
      </span>
    </button>
  );
}

function Divider({ text }: { text: string }) {
  return (
    <div className="my-7 flex items-center gap-3 text-[13px] text-[var(--text-muted)]">
      <span className="h-px flex-1 bg-[var(--border)]" />
      {text}
      <span className="h-px flex-1 bg-[var(--border)]" />
    </div>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mb-6 inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--text-muted)] hover:text-[var(--text-heading)]">
      <ArrowLeft className="h-4 w-4" />
      Voltar
    </button>
  );
}

function SwitchLine({ text, action, onClick }: { text: string; action: string; onClick: () => void }) {
  return (
    <p className="mt-6 text-center text-[14px] text-[var(--text-muted)]">
      {text}{' '}
      <button type="button" onClick={onClick} className="font-semibold text-[var(--accent)] hover:underline">
        {action}
      </button>
    </p>
  );
}

function Steps({ current, labels }: { current: number; labels: string[] }) {
  return (
    <ol className="mb-6 flex items-center gap-2" aria-label="Etapas do cadastro">
      {labels.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2" aria-current={active ? 'step' : undefined}>
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold transition-colors"
              style={
                done || active
                  ? { background: 'var(--accent)', color: 'var(--accent-fg)' }
                  : { background: 'var(--bg-card)', color: 'var(--text-muted)', boxShadow: 'inset 0 0 0 1.5px var(--border)' }
              }
            >
              {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : n}
            </span>
            <span className={`hidden text-[12px] font-medium sm:block ${active ? 'text-[var(--text-heading)]' : 'text-[var(--text-muted)]'}`}>{label}</span>
            {n < labels.length && <span className="h-px flex-1" style={{ background: done ? 'var(--accent)' : 'var(--border)' }} />}
          </li>
        );
      })}
    </ol>
  );
}