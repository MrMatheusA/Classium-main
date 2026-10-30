import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { usePlatform } from '../context/PlatformContext';
import { useFamilyContext } from '../contexts/FamilyContext';
import { useMasterPortal } from '../context/MasterPortalContext';
import { MasterPortalSwitcher } from './master/MasterPortalSwitcher';
import { PortalSwitcher } from './header/PortalSwitcher';
import { openCommandPalette } from './header/CommandPalette';
import { ThemePicker } from '../theme/ThemePicker';
import { useAccess } from '../auth/AccessProvider';
import { usePortalNav, DEFAULT_TAB } from '../navigation/portalNav';
import { Bell, BellOff, Building2, CalendarDays, ChevronDown, ChevronRight, LogOut, Search, type LucideIcon } from 'lucide-react';
import { isAdminRole } from '../lib/auth/access';
import { useAuth } from '../hooks/useAuth';

/* ------------------------------------------------------------------ */
/* utilidades                                                          */
/* ------------------------------------------------------------------ */

function initialsFrom(name: unknown): string | null {
  if (typeof name !== 'string' || !name.trim()) return null;
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.trim().substring(0, 2).toUpperCase();
}

function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function todayLabel(date = new Date()) {
  const s = date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Fecha popovers ao clicar fora ou apertar Esc */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  return ref;
}

const popoverMotion = {
  initial: { opacity: 0, y: -6, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.98 },
  transition: { duration: 0.16, ease: [0.22, 1, 0.36, 1] as const },
};

const popoverCls =
  'absolute right-0 top-[calc(100%+10px)] z-50 origin-top-right rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[0_24px_60px_-18px_rgba(16,24,40,0.3)]';

const iconBtn =
  'relative inline-flex h-10 w-10 items-center justify-center rounded-2xl text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-card)] hover:text-[var(--text-heading)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]';

const TEAM_ROLES = ['pedagogo', 'secretaria', 'disciplinario'] as const;
type TeamRole = (typeof TEAM_ROLES)[number];

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

export function Header() {
  const { student, mode, familyStudents, selectFamilyStudent, currentUser, role } = usePlatform();
  const { currentSchool, schools, changeCurrentSchool, students, changeCurrentStudent, guardian } = useFamilyContext();
  const { isAdminMaster } = useMasterPortal();
  const { access } = useAccess();
  const nav = usePortalNav();
  const auth = useAuth() as ReturnType<typeof useAuth> & { signOut?: () => unknown; logout?: () => unknown };
  const { profile } = auth;

  const roles = profile?.role ? [profile.role] : [];
  if (role) roles.push(role);
  const isAdmin = isAdminRole(roles);
  const isFamily = mode === 'family';

  const userName = (() => {
    if (access?.fullName) return access.fullName;
    if (isFamily && typeof guardian?.name === 'string' && guardian.name) return guardian.name;
    if (typeof currentUser?.name === 'string' && currentUser.name) return currentUser.name;
    if (isFamily) return 'Responsável';
    if (mode === 'professor') return 'Professor';
    return 'Gestão';
  })();
  const firstName = userName.split(/\s+/)[0];
  const initials = initialsFrom(userName) ?? (isFamily ? 'R' : mode === 'professor' ? 'P' : 'G');

  const roleLabel = (() => {
    if (isFamily) return 'Responsável';
    if (mode === 'professor') return 'Professor';
    if (role === 'admin') return 'Administração';
    if (role === 'pedagogo') return 'Coordenação pedagógica';
    if (role === 'secretaria') return 'Secretaria';
    if (role === 'disciplinario') return 'Disciplinar';
    if (TEAM_ROLES.includes(role as TeamRole)) return 'Equipe';
    return 'Gestão';
  })();

  const activeStudentList = (students.length > 0 ? students : familyStudents).filter(Boolean);

  // Título: no início, a saudação; nos módulos, o nome do módulo
  const onHome = nav.activeId === DEFAULT_TAB[nav.portal] || !nav.current;
  const title = mode === 'commands' ? 'Comandos' : onHome ? `${greeting()}, ${firstName}` : nav.current!.item.label;
  const crumbs = [access?.schoolName || nav.portalLabel, onHome ? null : nav.current?.section.title].filter(Boolean) as string[];

  const handleSignOut = auth.logout ?? auth.signOut;

  return (
    <>
      <header
        className="sticky top-0 z-30 flex h-[80px] shrink-0 items-center gap-4 border-b px-6 backdrop-blur-xl lg:px-8"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--bg-app) 82%, transparent)',
          borderColor: 'var(--border)',
          color: 'var(--text-heading)',
        }}
      >
        {/* Onde estou + título */}
        <div className="min-w-0 flex-1">
          <nav aria-label="Você está em" className="flex min-w-0 items-center gap-1.5 text-[12px] font-medium text-[var(--text-muted)]">
            {crumbs.map((c, i) => (
              <React.Fragment key={c + i}>
                {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
                <span className="truncate">{c}</span>
              </React.Fragment>
            ))}
            {onHome && (
              <>
                <span aria-hidden className="mx-1 h-1 w-1 shrink-0 rounded-full bg-[var(--text-muted)] opacity-50" />
                <span className="hidden items-center gap-1 truncate sm:flex">
                  <CalendarDays className="h-3 w-3" />
                  {todayLabel()}
                </span>
              </>
            )}
          </nav>
          <AnimatePresence mode="wait" initial={false}>
            <motion.h1
              key={title}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="mt-0.5 truncate font-serif text-[24px] font-semibold leading-tight tracking-[-0.015em] text-[var(--text-heading)]"
            >
              {title}
            </motion.h1>
          </AnimatePresence>
        </div>

        {/* Família: escola e aluno */}
        {isFamily && (
          <div className="hidden items-center gap-2 lg:flex">
            {(currentSchool?.school_name || schools.length > 1) && (
              <SchoolSwitch schools={schools} currentId={currentSchool?.school_id} currentName={currentSchool?.school_name} onChange={changeCurrentSchool} />
            )}
            <StudentSwitch
              students={activeStudentList}
              current={student}
              onChange={(id) => {
                selectFamilyStudent(id);
                changeCurrentStudent(id);
              }}
            />
          </div>
        )}

        {/* Busca de módulos */}
        <SearchButton />

        {/* Ações */}
        <div className="flex shrink-0 items-center gap-1 rounded-[20px] border border-[var(--border)] bg-[var(--bg-card-alt)] p-1">
          <button type="button" onClick={openCommandPalette} className={`${iconBtn} xl:hidden`} title="Buscar (Ctrl+K)" aria-label="Buscar">
            <Search className="h-[18px] w-[18px]" />
          </button>
          <ThemePicker />
          <NotificationsButton />
        </div>

        {isAdminMaster ? (
          <div className="flex items-center gap-3">
            <div className="hidden text-right 2xl:block">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">Administração global</p>
              <p className="text-[13px] font-medium text-[var(--text-heading)]">Classium</p>
            </div>
            <MasterPortalSwitcher />
          </div>
        ) : isAdmin ? (
          <PortalSwitcher />
        ) : (
          <UserMenu name={userName} role={roleLabel} initials={initials} onSignOut={handleSignOut} />
        )}
      </header>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Peças                                                               */
/* ------------------------------------------------------------------ */

function SearchButton() {
  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);
  return (
    <button
      type="button"
      onClick={openCommandPalette}
      className="group hidden h-11 w-[280px] shrink-0 items-center gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] pl-3.5 pr-2 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all hover:border-[var(--accent)] hover:shadow-[0_10px_24px_-18px_rgba(16,24,40,0.5)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-soft)] xl:flex"
    >
      <Search className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-colors group-hover:text-[var(--accent)]" />
      <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--text-muted)]">Buscar ou ir para…</span>
      <kbd className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--bg-card-alt)] px-1.5 py-0.5 font-sans text-[11px] font-medium text-[var(--text-muted)]">
        {isMac ? '⌘K' : 'Ctrl K'}
      </kbd>
    </button>
  );
}

function SchoolSwitch({
  schools,
  currentId,
  currentName,
  onChange,
}: {
  schools: { school_id: string; school_name: string }[];
  currentId?: string;
  currentName?: string;
  onChange: (id: string) => void;
}) {
  const multiple = schools.length > 1;
  return (
    <span
      className={`relative flex h-11 min-w-0 max-w-[220px] items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-3 text-[13px] text-[var(--text-heading)] ${
        multiple ? 'cursor-pointer transition-colors hover:border-[var(--accent)]' : ''
      }`}
    >
      <Building2 className="h-4 w-4 shrink-0 text-[var(--accent)]" />
      <span className="truncate font-medium">{currentName || 'Escola'}</span>
      {multiple && (
        <>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
          {/* select nativo invisível por cima: acessível e funciona no celular */}
          <select aria-label="Trocar de escola" value={currentId || ''} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0">
            {schools.map((s) => (
              <option key={s.school_id} value={s.school_id}>
                {s.school_name}
              </option>
            ))}
          </select>
        </>
      )}
    </span>
  );
}

type StudentLike = { id?: string; name?: string; grade?: string } | null | undefined;

function StudentSwitch({ students, current, onChange }: { students: StudentLike[]; current: StudentLike; onChange: (id: string) => void }) {
  const multiple = students.length > 1;
  return (
    <div
      className={`relative flex h-11 shrink-0 items-center gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] pl-1.5 pr-3 ${
        multiple ? 'cursor-pointer transition-colors hover:border-[var(--accent)]' : ''
      }`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-xl text-[12px] font-semibold" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
        {initialsFrom(current?.name) ?? 'AL'}
      </span>
      <span className="leading-tight">
        <span className="block max-w-[150px] truncate text-[13px] font-semibold text-[var(--text-heading)]">{current?.name || 'Estudante'}</span>
        <span className="block text-[11px] text-[var(--text-muted)]">
          {current?.grade || 'Aluno'}
          {multiple && ` · ${students.length} filhos`}
        </span>
      </span>
      {multiple && (
        <>
          <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
          <select aria-label="Trocar de aluno" value={current?.id || ''} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0">
            {students.map((st) => (
              <option key={st?.id || 'st'} value={st?.id || ''}>
                {st?.name || 'Estudante'}
                {st?.grade ? ` · ${st.grade}` : ''}
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}

function NotificationsButton() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const ref = useDismiss(open, close);

  return (
    <div ref={ref} className="relative">
      <button
        className={iconBtn}
        title="Notificações"
        aria-label="Notificações"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={open ? { background: 'var(--bg-card)', color: 'var(--text-heading)' } : undefined}
      >
        <Bell className="h-[18px] w-[18px]" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div {...popoverMotion} role="dialog" aria-label="Notificações" className={`${popoverCls} w-[340px] overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <p className="text-[15px] font-semibold text-[var(--text-heading)]">Notificações</p>
            </div>
            {/* Ligue aqui a lista real quando o backend de notificações existir */}
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                <BellOff className="h-5 w-5" />
              </span>
              <p className="mt-3 text-[14px] font-semibold text-[var(--text-heading)]">Tudo em dia</p>
              <p className="mt-1 text-[13px] text-[var(--text-muted)]">Avisos de faltas, notas e comunicados aparecem aqui.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UserMenu({ name, role, initials, onSignOut }: { name: string; role: string; initials: string; onSignOut?: () => unknown }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const ref = useDismiss(open, close);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-12 items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] py-1 pl-1.5 pr-2.5 transition-colors hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        <Avatar initials={initials} />
        <span className="hidden text-left leading-tight xl:block">
          <span className="block max-w-[150px] truncate text-[13px] font-semibold text-[var(--text-heading)]">{name}</span>
          <span className="block text-[12px] text-[var(--text-muted)]">{role}</span>
        </span>
        <ChevronDown className={`h-4 w-4 text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div {...popoverMotion} role="menu" className={`${popoverCls} w-[270px] overflow-hidden`}>
            {/* faixa na cor da marca */}
            <div className="relative overflow-hidden px-4 py-4" style={{ background: 'var(--sidebar-bg)', color: 'var(--sidebar-fg)' }}>
              <div className="flex items-center gap-3">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[14px] font-bold"
                  style={{ background: 'var(--sidebar-active-bg)', color: 'var(--sidebar-active-fg)' }}
                >
                  {initials}
                </span>
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-[14px] font-semibold">{name}</p>
                  <p className="text-[12px]" style={{ color: 'var(--sidebar-muted)' }}>
                    {role}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-2">
              {onSignOut && (
                <MenuItem
                  icon={LogOut}
                  label="Sair"
                  danger
                  onClick={() => {
                    close();
                    onSignOut();
                  }}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <span
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[12px] font-semibold"
      style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
      aria-hidden
    >
      {initials}
      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#22A06B]" style={{ boxShadow: '0 0 0 2px var(--bg-card)' }} />
    </span>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger = false }: { icon: LucideIcon; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
        danger ? 'text-[#B42318] hover:bg-[#FDECEC]' : 'text-[var(--text-body)] hover:bg-[var(--bg-card-alt)]'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}