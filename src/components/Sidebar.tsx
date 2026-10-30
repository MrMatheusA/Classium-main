import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronsLeft, ChevronsRight, LogOut, Search, type LucideIcon } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { useAuth } from '../hooks/useAuth';
import { useAccess } from '../auth/AccessProvider';
import { usePortalNav } from '../navigation/portalNav';
import { openCommandPalette } from './header/CommandPalette';
import { BrandShield } from './BrandShield';

/*
 * Os menus moram em src/navigation/portalNav.ts (o mesmo mapa que o Header e a URL usam).
 */

/* ------------------------------------------------------------------ */
/* Componente                                                          */
/* ------------------------------------------------------------------ */

const COLLAPSE_KEY = 'classium:sidebar-collapsed';

export function Sidebar() {
  const auth = useAuth() as ReturnType<typeof useAuth> & { logout?: () => unknown; signOut?: () => unknown };
  const { access } = useAccess();
  const { setMode, mode } = usePlatform();
  const nav = usePortalNav();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      /* navegação privada */
    }
  }, [collapsed]);

  const portalLabel = mode === 'commands' ? 'Comandos' : auth.role === 'admin' && nav.portal === 'admin' ? 'Administração' : nav.portalLabel;

  const sections = useMemo(
    () =>
      nav.sidebarSections.map((s) => ({
        title: s.title,
        items: s.items.map((i) => ({ ...i, key: String(i.id), active: nav.activeId === i.id, onClick: () => nav.go(i.id) })),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nav.sidebarSections, nav.activeId, nav.portal],
  );

  const handleLogout = async () => {
    const fn = auth.logout ?? auth.signOut;
    try {
      await fn?.();
    } finally {
      setMode('landing');
    }
  };

  const displayName = access?.fullName || 'Minha conta';
  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((p: string) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'C';

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 88 : 276 }}
      transition={{ type: 'spring', stiffness: 380, damping: 38 }}
      className="relative z-20 hidden h-screen shrink-0 flex-col overflow-hidden md:flex"
      style={{ backgroundColor: 'var(--sidebar-bg)', color: 'var(--sidebar-fg)' }}
      aria-label="Menu principal"
    >
      <SidebarPattern />

      {/* Marca */}
      <div className="relative flex h-[76px] items-center gap-3 px-5">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl p-1.5 shadow-[0_8px_20px_-10px_rgba(0,0,0,0.5)]"
          style={{ background: 'var(--sidebar-bg-hover)', border: '1px solid var(--sidebar-border)' }}
        >
          <BrandShield size="100%" />
        </span>
        {!collapsed && (
          <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className="min-w-0">
            <p className="font-serif text-[19px] font-semibold leading-none tracking-[-0.01em]">Classium</p>
            <p className="mt-1 truncate text-[12px] font-medium" style={{ color: 'var(--sidebar-muted)' }}>
              {portalLabel}
            </p>
          </motion.div>
        )}
      </div>

      {/* Escola atual */}
      {!collapsed && access?.schoolName && (
        <div className="relative mx-4 mb-2 rounded-2xl border px-3.5 py-2.5" style={{ borderColor: 'var(--sidebar-border)', background: 'var(--sidebar-bg-hover)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--sidebar-muted)' }}>
            Escola
          </p>
          <p className="mt-0.5 truncate text-[13px] font-semibold">{access.schoolName}</p>
        </div>
      )}

      {/* Busca rápida (Ctrl+K) */}
      <div className="relative px-3 pb-1">
        <button
          type="button"
          onClick={openCommandPalette}
          title="Buscar módulo (Ctrl+K)"
          aria-label="Buscar módulo"
          className={[
            'flex h-10 w-full items-center gap-2.5 rounded-2xl border text-[13px] transition-colors hover:bg-[var(--sidebar-bg-hover)]',
            collapsed ? 'justify-center' : 'px-3',
          ].join(' ')}
          style={{ borderColor: 'var(--sidebar-border)', color: 'var(--sidebar-muted)' }}
        >
          <Search className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Buscar módulo</span>
              <kbd className="rounded-md border px-1.5 py-0.5 font-sans text-[10px]" style={{ borderColor: 'var(--sidebar-border)' }}>
                Ctrl K
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* Navegação */}
      <nav className="relative flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sections.map((section) =>
          section.items.length === 0 ? null : (
            <div key={section.title} className="mb-3">
              {collapsed ? (
                <div className="mx-auto my-2 h-px w-8" style={{ background: 'var(--sidebar-border)' }} />
              ) : (
                <p className="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--sidebar-muted)' }}>
                  {section.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.key}>
                    <NavButton item={item} active={item.active} collapsed={collapsed} onClick={item.onClick} />
                  </li>
                ))}
              </ul>
            </div>
          ),
        )}
      </nav>

      {/* Rodapé: pessoa logada + recolher */}
      <div className="relative border-t px-3 py-3" style={{ borderColor: 'var(--sidebar-border)' }}>
        <div className={collapsed ? 'flex flex-col items-center gap-2' : 'flex items-center gap-3 rounded-2xl px-2 py-1.5'}>
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
            style={{ background: 'var(--sidebar-active-bg)', color: 'var(--sidebar-active-fg)' }}
            title={displayName}
          >
            {initials}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">{displayName}</p>
              <p className="truncate text-[12px]" style={{ color: 'var(--sidebar-muted)' }}>
                {portalLabel}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-[var(--sidebar-bg-hover)]"
            style={{ color: 'var(--sidebar-muted)' }}
            title="Sair"
            aria-label="Sair"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-xl text-[12px] font-medium transition-colors hover:bg-[var(--sidebar-bg-hover)]"
          style={{ color: 'var(--sidebar-muted)' }}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          {!collapsed && 'Recolher menu'}
        </button>
      </div>
    </motion.aside>
  );
}

/* ------------------------------------------------------------------ */
/* Peças                                                               */
/* ------------------------------------------------------------------ */

function NavButton({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: { label: string; icon: LucideIcon; tag?: string };
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={[
        'group relative flex h-11 w-full items-center rounded-2xl text-[14px] transition-colors',
        collapsed ? 'justify-center' : 'gap-3 px-3 text-left',
        active ? 'font-semibold' : 'font-medium hover:bg-[var(--sidebar-bg-hover)]',
      ].join(' ')}
      style={{ color: active ? 'var(--sidebar-active-fg)' : 'var(--sidebar-fg)' }}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-2xl shadow-[0_10px_24px_-14px_rgba(0,0,0,0.55)]"
          style={{ background: 'var(--sidebar-active-bg)' }}
          transition={{ type: 'spring', stiffness: 460, damping: 36 }}
        />
      )}
      <Icon
        className="relative h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110"
        style={{ opacity: active ? 1 : 0.85 }}
      />
      {!collapsed && <span className="relative min-w-0 flex-1 truncate">{item.label}</span>}
      {!collapsed && item.tag && (
        <span
          className="relative rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide"
          style={
            active
              ? { background: 'var(--accent-soft)', color: 'var(--accent)' }
              : { background: 'var(--sidebar-bg-hover)', color: 'var(--hero-highlight)', border: '1px solid var(--sidebar-border)' }
          }
        >
          {item.tag}
        </span>
      )}
    </button>
  );
}

/** Grade de caderno e luz suave, o mesmo desenho do hero da landing */
function SidebarPattern() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--sidebar-border) 1px, transparent 1px), linear-gradient(to bottom, var(--sidebar-border) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'linear-gradient(to bottom, black 0%, transparent 28%, transparent 72%, black 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 28%, transparent 72%, black 100%)',
          opacity: 0.7,
        }}
      />
      <div
        className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full blur-[80px]"
        style={{ background: 'radial-gradient(closest-side, var(--accent), transparent)', opacity: 0.4 }}
      />
      <div
        className="absolute -right-20 -top-24 h-60 w-60 rounded-full blur-[80px]"
        style={{ background: 'radial-gradient(closest-side, var(--sidebar-active-bg), transparent)', opacity: 0.12 }}
      />
    </div>
  );
}