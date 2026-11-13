import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Building2, Check, ChevronDown, GraduationCap, Loader2, LogOut, ShieldCheck, Users, type LucideIcon } from 'lucide-react';
import { useMasterPortal, PortalType } from '../../context/MasterPortalContext';
import { usePlatform } from '../../context/PlatformContext';
import { useAuth } from '../../hooks/useAuth';

const PORTALS: { id: PortalType; label: string; hint: string; icon: LucideIcon; color: string; soft: string }[] = [
  { id: 'manager', label: 'Classium Gestor', hint: 'Gestão, secretaria e comunicação', icon: Building2, color: '#A15C07', soft: '#FEF4E6' },
  { id: 'teacher', label: 'Classium Docente', hint: 'Turmas, diário e notas', icon: GraduationCap, color: '#1D4ED8', soft: '#EEF4FF' },
  { id: 'family', label: 'Classium Família', hint: 'Visão dos pais e responsáveis', icon: Users, color: '#067647', soft: '#ECFDF3' },
];

function initials(name?: string) {
  const parts = (name || 'Administrador').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || 'A') + (parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[1] || 'D')).toUpperCase();
}

export function MasterPortalSwitcher() {
  const { currentPortal, switchPortal, isAdminMaster } = useMasterPortal();
  const { setMode, currentUser } = usePlatform();
  const { logout: authLogout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState<PortalType | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Fecha ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!isOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  if (!isAdminMaster) return null;

  const name = currentUser?.name || 'Administrador';
  const email = currentUser?.email || '';
  const active = PORTALS.find((p) => p.id === currentPortal) || PORTALS[0];

  const handlePortalSwitch = async (portal: PortalType) => {
    if (portal === currentPortal) return setIsOpen(false);
    setSwitching(portal);
    try {
      await switchPortal(portal);
    } finally {
      setSwitching(null);
      setIsOpen(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      if (authLogout) await authLogout();
    } finally {
      setLoggingOut(false);
      setIsOpen(false);
      setMode('login');
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Botão */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title="Trocar de portal"
        className="group flex items-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] py-1 pl-1 pr-2.5 text-left shadow-sm transition-colors hover:bg-[var(--bg-card-alt)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:pr-3"
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold"
          style={{ background: 'var(--sidebar-bg)', color: 'var(--sidebar-fg)' }}
        >
          {initials(name)}
        </span>
        <span className="hidden min-w-0 md:block">
          <span className="block max-w-[160px] truncate text-[13px] font-semibold leading-tight text-[var(--text-heading)]">{name}</span>
          <span className="flex items-center gap-1 text-[11px] leading-tight" style={{ color: active.color }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: active.color }} />
            {active.label.replace('Classium ', '')}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 text-[var(--text-muted)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: [0.2, 0, 0, 1] }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 z-50 mt-2 w-[300px] overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--bg-card)] text-left shadow-[0_24px_60px_-28px_rgba(16,24,40,0.45)]"
          >
            {/* Conta */}
            <div className="flex items-center gap-3 border-b border-[var(--border)] p-4">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[14px] font-semibold"
                style={{ background: 'var(--sidebar-bg)', color: 'var(--sidebar-fg)' }}
              >
                {initials(name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-[var(--text-heading)]">{name}</p>
                {email && <p className="truncate text-[12px] text-[var(--text-muted)]">{email}</p>}
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]">
                  <ShieldCheck className="h-3 w-3" />
                  Administrador · acesso total
                </span>
              </div>
            </div>

            {/* Portais */}
            <div className="p-2">
              <p className="px-2 pb-1.5 pt-1 text-[12px] font-medium text-[var(--text-muted)]">Ver como</p>
              <div className="space-y-1">
                {PORTALS.map((p) => {
                  const Icon = p.icon;
                  const isActive = currentPortal === p.id;
                  const isLoading = switching === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isActive}
                      disabled={!!switching}
                      onClick={() => handlePortalSwitch(p.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-colors disabled:cursor-wait ${
                        isActive ? 'bg-[var(--bg-card-alt)]' : 'hover:bg-[var(--bg-card-alt)]'
                      }`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: p.soft, color: p.color }}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold text-[var(--text-heading)]">{p.label}</span>
                        <span className="block truncate text-[12px] text-[var(--text-muted)]">{p.hint}</span>
                      </span>
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--text-muted)]" />
                      ) : isActive ? (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)]">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sair */}
            <div className="border-t border-[var(--border)] p-2">
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-[13px] font-medium text-[#B42318] transition-colors hover:bg-[#FEF3F2] disabled:opacity-60"
              >
                <span className="flex h-9 w-9 items-center justify-center">
                  {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                </span>
                Sair da conta
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}