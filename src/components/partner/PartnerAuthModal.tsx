import React, { useEffect, useId, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { usePlatform } from '../../context/PlatformContext';
import { maskCPFOrCNPJ } from '../../utils/masks';
import { BrandShield } from '../BrandShield';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  UserCheck,
  X,
  type LucideIcon,
} from 'lucide-react';

/*
 * Acesso ao Portal do Parceiro (profissionais, empresas e fornecedores).
 * Mesma lógica de antes (loginPartner, primeiro acesso, recuperação por código),
 * agora no visual da marca: as cores vêm do tema (variáveis --accent, --bg-card...).
 */

interface PartnerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRegisterFlow: () => void;
  onSuccessLogin: () => void;
}

type View = 'login' | 'first-access' | 'recovery-request' | 'recovery-verify';
const EASE = [0.22, 1, 0.36, 1] as const;

export function PartnerAuthModal({ isOpen, onClose, onOpenRegisterFlow, onSuccessLogin }: PartnerAuthModalProps) {
  const { loginPartner, changePartnerPassword, requestPasswordRecovery, resetPasswordWithCode } = usePlatform();

  const [view, setView] = useState<View>('login');

  // login
  const [loginDoc, setLoginDoc] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [attempts, setAttempts] = useState(0);

  // primeiro acesso
  const [tempPartnerId, setTempPartnerId] = useState('');
  const [tempPartnerName, setTempPartnerName] = useState('');
  const [tempPartnerDoc, setTempPartnerDoc] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  // recuperação
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email');
  const [recoveryTarget, setRecoveryTarget] = useState('');
  const [code, setCode] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');

  // fecha com Esc e trava a rolagem do fundo
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  const goTo = (next: View) => {
    setError('');
    setView(next);
  };

  const handleDocChange = (val: string) => {
    if (val.includes('@') || /[a-zA-Z]/.test(val)) setLoginDoc(val);
    else setLoginDoc(maskCPFOrCNPJ(val));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (attempts >= 5) return setError('Muitas tentativas seguidas. Aguarde alguns instantes e tente de novo.');
    if (!loginDoc.trim() || !password.trim()) return setError('Informe seu CPF, CNPJ ou e-mail e a senha.');

    const res = loginPartner(loginDoc, password);
    if (!res.success) {
      setAttempts((n) => n + 1);
      return setError(res.error || 'Dados de acesso incorretos.');
    }

    if (res.isFirstAccess && res.partner) {
      setTempPartnerId(res.partner.id);
      setTempPartnerName(res.partner.name || 'Parceiro');
      setTempPartnerDoc(res.partner.cpfCnpj || loginDoc);
      setNewPassword('');
      setConfirmPassword('');
      goTo('first-access');
      return;
    }

    onSuccessLogin();
    onClose();
  };

  const handleFirstAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const pass = newPassword.trim();
    if (pass.length < 8) return setError('A nova senha precisa ter pelo menos 8 caracteres.');
    if (pass !== confirmPassword.trim()) return setError('As senhas não são iguais.');

    setSaving(true);
    try {
      const res = await Promise.resolve(changePartnerPassword(tempPartnerId, pass));
      if (!res || !res.success) return setError(res?.error || 'Não foi possível salvar a senha. Tente de novo.');

      setSuccess('Senha criada. Agora entre com a nova senha.');
      if (tempPartnerDoc) setLoginDoc(tempPartnerDoc);
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      goTo('login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a senha. Tente de novo.');
    } finally {
      setSaving(false);
    }
  };

  const handleRecoveryRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!loginDoc.trim()) return setError('Informe o CPF ou CNPJ cadastrado.');
    const res = requestPasswordRecovery(loginDoc, channel);
    if (!res.success) return setError(res.error || 'Não encontramos uma conta com esses dados.');
    setRecoveryTarget(res.target || '');
    setCode('');
    setRecoveryPassword('');
    goTo('recovery-verify');
  };

  const handleRecoveryVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (code.replace(/\D/g, '').length !== 6) return setError('Digite os 6 números do código.');
    if (recoveryPassword.length < 8) return setError('A nova senha precisa ter pelo menos 8 caracteres.');
    const res = resetPasswordWithCode(loginDoc, code, recoveryPassword);
    if (!res.success) return setError(res.error || 'Código incorreto ou expirado.');
    setSuccess('Senha redefinida. Agora entre com a nova senha.');
    setPassword('');
    goTo('login');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-lenis-prevent
        >
          {/* fundo */}
          <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 cursor-default bg-[#0B1220]/55 backdrop-blur-sm" />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="partner-auth-title"
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="relative w-full max-w-[460px] overflow-hidden rounded-t-[28px] bg-[var(--bg-card)] text-left text-[var(--text-body)] shadow-[0_40px_100px_-30px_rgba(0,0,0,0.5)] sm:rounded-[28px]"
          >
            {/* faixa na cor da marca */}
            <div className="relative overflow-hidden px-7 pb-6 pt-7" style={{ background: 'var(--sidebar-bg)', color: 'var(--sidebar-fg)' }}>
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl"
                style={{ background: 'var(--accent)', opacity: 0.55 }}
              />
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="absolute right-4 top-4 rounded-full p-2 transition-colors"
                style={{ background: 'var(--sidebar-bg-hover)', color: 'var(--sidebar-fg)' }}
              >
                <X className="h-4 w-4" />
              </button>
              <div className="relative flex items-center gap-3">
                <span className="h-11 w-11 rounded-2xl p-2" style={{ background: 'var(--sidebar-active-bg)' }}>
                  <BrandShield size="100%" />
                </span>
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--sidebar-muted)' }}>
                    Rede Classium
                  </p>
                  <h2 id="partner-auth-title" className="font-serif text-[24px] font-semibold leading-tight">
                    Portal do parceiro
                  </h2>
                </div>
              </div>
              <p className="relative mt-3 text-[14px] leading-relaxed" style={{ color: 'var(--sidebar-muted)' }}>
                Gerencie seu perfil, seus anúncios e os contatos que chegam pelo Classium.
              </p>
            </div>

            <div className="px-7 pb-7 pt-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={view}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.25, ease: EASE }}
                >
                  <Feedback error={error} success={view === 'login' ? success : ''} />

                  {/* ===== ENTRAR ===== */}
                  {view === 'login' && (
                    <form onSubmit={handleLogin} className="space-y-4" noValidate>
                      <Field
                        label="CPF, CNPJ ou e-mail"
                        icon={UserCheck}
                        value={loginDoc}
                        onChange={handleDocChange}
                        placeholder="O mesmo usado no cadastro"
                        autoComplete="username"
                      />
                      <PasswordField
                        label="Senha"
                        value={password}
                        onChange={setPassword}
                        autoComplete="current-password"
                        action={
                          <button
                            type="button"
                            onClick={() => {
                              setSuccess('');
                              goTo('recovery-request');
                            }}
                            className="text-[13px] font-semibold text-[var(--accent)] hover:underline"
                          >
                            Esqueci a senha
                          </button>
                        }
                      />
                      <p className="flex items-start gap-2 rounded-xl bg-[var(--bg-card-alt)] px-3 py-2.5 text-[12px] leading-relaxed text-[var(--text-muted)]">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                        No primeiro acesso, a senha é o seu CPF ou CNPJ, só os números. Em seguida você cria uma senha nova.
                      </p>
                      <Submit label="Entrar no portal" />
                      <p className="pt-1 text-center text-[14px] text-[var(--text-muted)]">
                        Ainda não é parceiro?{' '}
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenRegisterFlow();
                          }}
                          className="font-semibold text-[var(--accent)] hover:underline"
                        >
                          Cadastre-se
                        </button>
                      </p>
                    </form>
                  )}

                  {/* ===== PRIMEIRO ACESSO ===== */}
                  {view === 'first-access' && (
                    <form onSubmit={handleFirstAccess} className="space-y-4" noValidate>
                      <div>
                        <h3 className="font-serif text-[22px] font-semibold text-[var(--text-heading)]">Olá, {tempPartnerName.split(' ')[0]}!</h3>
                        <p className="mt-1 text-[14px] leading-relaxed text-[var(--text-muted)]">
                          É o seu primeiro acesso. Crie uma senha só sua para continuar.
                        </p>
                      </div>
                      <PasswordField label="Nova senha" value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
                      <PasswordField label="Repita a nova senha" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
                      <Submit label="Salvar senha" busy={saving} busyLabel="Salvando…" />
                      <BackButton onClick={() => goTo('login')} disabled={saving} />
                    </form>
                  )}

                  {/* ===== PEDIR CÓDIGO ===== */}
                  {view === 'recovery-request' && (
                    <form onSubmit={handleRecoveryRequest} className="space-y-4" noValidate>
                      <div>
                        <h3 className="font-serif text-[22px] font-semibold text-[var(--text-heading)]">Recuperar senha</h3>
                        <p className="mt-1 text-[14px] text-[var(--text-muted)]">Vamos enviar um código de 6 números.</p>
                      </div>
                      <Field
                        label="CPF ou CNPJ"
                        icon={UserCheck}
                        value={loginDoc}
                        onChange={(v) => setLoginDoc(maskCPFOrCNPJ(v))}
                        placeholder="000.000.000-00"
                        inputMode="numeric"
                      />
                      <fieldset>
                        <legend className="mb-2 text-[13px] font-semibold text-[var(--text-heading)]">Receber o código por</legend>
                        <div className="grid grid-cols-2 gap-2">
                          {([
                            ['email', Mail, 'E-mail'],
                            ['whatsapp', Phone, 'WhatsApp'],
                          ] as const).map(([value, Icon, label]) => {
                            const active = channel === value;
                            return (
                              <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                onClick={() => setChannel(value)}
                                className="flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-[14px] font-semibold transition-colors"
                                style={
                                  active
                                    ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)', color: 'var(--accent)' }
                                    : { borderColor: 'var(--border)', color: 'var(--text-body)' }
                                }
                              >
                                <Icon className="h-4 w-4" />
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </fieldset>
                      <Submit label="Enviar código" />
                      <BackButton onClick={() => goTo('login')} />
                    </form>
                  )}

                  {/* ===== VALIDAR CÓDIGO ===== */}
                  {view === 'recovery-verify' && (
                    <form onSubmit={handleRecoveryVerify} className="space-y-4" noValidate>
                      <div>
                        <h3 className="font-serif text-[22px] font-semibold text-[var(--text-heading)]">Digite o código</h3>
                        <p className="mt-1 text-[14px] text-[var(--text-muted)]">
                          Enviamos para <span className="font-semibold text-[var(--text-heading)]">{recoveryTarget}</span>.
                        </p>
                      </div>
                      <CodeInput value={code} onChange={setCode} />
                      <PasswordField label="Nova senha" value={recoveryPassword} onChange={setRecoveryPassword} autoComplete="new-password" />
                      <Submit label="Redefinir senha" />
                      <BackButton onClick={() => goTo('recovery-request')} />
                    </form>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* Peças                                                               */
/* ------------------------------------------------------------------ */

const inputWrap =
  'flex h-12 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3.5 transition-all focus-within:border-[var(--accent)] focus-within:ring-4 focus-within:ring-[var(--accent-soft)]';
const inputCls = 'h-full min-w-0 flex-1 border-none bg-transparent text-[15px] text-[var(--text-heading)] outline-none placeholder:text-[var(--text-muted)]';

function Feedback({ error, success }: { error: string; success: string }) {
  const msg = error || success;
  if (!msg) return null;
  return (
    <div
      role={error ? 'alert' : 'status'}
      className="mb-5 flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-[14px] leading-relaxed"
      style={
        error
          ? { background: '#FEF3F2', borderColor: '#FECDCA', color: '#B42318' }
          : { background: 'var(--accent-soft)', borderColor: 'transparent', color: 'var(--text-heading)' }
      }
    >
      {error ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />}
      <span>{msg}</span>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  value,
  onChange,
  ...rest
}: {
  label: string;
  icon: LucideIcon;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-[var(--text-heading)]">
        {label}
      </label>
      <div className={inputWrap}>
        <Icon className="h-[18px] w-[18px] shrink-0 text-[var(--text-muted)]" />
        <input id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} {...rest} />
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  action,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  action?: React.ReactNode;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
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
    </div>
  );
}

/** Código de 6 números em caixinhas, aceita colar */
function CodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const id = useId();
  const digits = value.replace(/\D/g, '').slice(0, 6);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-[var(--text-heading)]">
        Código
      </label>
      <div className="relative">
        <input
          id={id}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={digits}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
          aria-describedby={`${id}-hint`}
        />
        <div className="grid grid-cols-6 gap-2" aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className="flex h-14 items-center justify-center rounded-xl border-2 font-serif text-[24px] font-semibold text-[var(--text-heading)] transition-colors"
              style={{ borderColor: i === digits.length ? 'var(--accent)' : 'var(--border)', background: 'var(--bg-card)' }}
            >
              {digits[i] ?? ''}
            </span>
          ))}
        </div>
      </div>
      <p id={`${id}-hint`} className="sr-only">
        Digite os 6 números recebidos
      </p>
    </div>
  );
}

function Submit({ label, busy = false, busyLabel }: { label: string; busy?: boolean; busyLabel?: string }) {
  return (
    <motion.button
      type="submit"
      disabled={busy}
      whileTap={{ scale: 0.98 }}
      className="group flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold disabled:opacity-70"
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

function BackButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-1.5 py-2 text-[14px] font-medium text-[var(--text-muted)] hover:text-[var(--text-heading)] disabled:opacity-50"
    >
      <ArrowLeft className="h-4 w-4" />
      Voltar
    </button>
  );
}