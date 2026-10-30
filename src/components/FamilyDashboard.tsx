import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { usePlatform } from '../context/PlatformContext';
import { supabase } from '../lib/supabase';
import { usePanelTheme } from '../theme/PanelThemeContext';
import { BACKGROUNDS, SIDEBAR_COLORS } from '../theme/panelThemes';
import { StudentDataTab } from './family/StudentDataTab';
import { StudentsAndLinkingTab } from './family/StudentsAndLinkingTab';
import { CentralComunicacaoTab } from './family/CentralComunicacaoTab';
import { RoutineRadarTab } from './family/RoutineRadarTab';
import { SchoolCalendarTab } from './family/SchoolCalendarTab';
import { LostFoundTab } from './family/LostFoundTab';
import { GateQRCodeTab } from './family/GateQRCodeTab';
import { TutorsMarketplaceTab } from './family/TutorsMarketplaceTab';
import { AppointmentTab } from './family/AppointmentTab';
import { ClimateSurveyTab } from './family/ClimateSurveyTab';
import { DocsChatTab } from './family/DocsChatTab';
import { TransportTab } from './family/TransportTab';
import { StudentClassScheduleTab } from './family/StudentClassScheduleTab';
import { FoodMenuTab } from './family/FoodMenuTab';
import { Avatar, BrandHero, Card, CardHeader, EmptyState, Page, PillNav, Skeleton, EASE } from './ui/kit';
import {
  BookOpen,
  CalendarDays,
  Check,
  Clock,
  Heart,
  MessageSquare,
  Palette,
  QrCode,
  Radar,
  Shirt,
  User,
  UserCheck,
  Users,
  Utensils,
  type LucideIcon,
} from 'lucide-react';

export interface FamilyChildRPC {
  student_id: string;
  full_name: string;
  class_name: string;
  shift: string;
  room: string;
  relationship: string;
  status?: string;
  guardian_id?: string;
  guardian_name?: string;
  school_name?: string;
  registration_code?: string;
}

const TABS: { id: number; label: string; icon: LucideIcon }[] = [
  { id: 1, label: 'Visão geral', icon: User },
  { id: 2, label: 'Filhos e vínculos', icon: UserCheck },
  { id: 15, label: 'Horário de aula', icon: Clock },
  { id: 3, label: 'Recados', icon: MessageSquare },
  { id: 4, label: 'Rotina', icon: Radar },
  { id: 5, label: 'Calendário', icon: CalendarDays },
  { id: 13, label: 'Alimentação', icon: Utensils },
  { id: 7, label: 'Acesso à escola', icon: QrCode },
  { id: 6, label: 'Achados e perdidos', icon: Shirt },
  { id: 9, label: 'Especialistas', icon: BookOpen },
  { id: 14, label: 'Aparência', icon: Palette },
];

export function FamilyDashboard() {
  const { student, activeFamilyTab, setActiveFamilyTab, familyStudents, setFamilyStudents, setStudent, selectFamilyStudent } = usePlatform();

  const [children, setChildren] = useState<FamilyChildRPC[]>([]);
  const [loading, setLoading] = useState(true);
  const lastSyncKey = useRef('');

  /** Leva os filhos para o contexto da plataforma (usado pelas abas) */
  const syncContext = useCallback(
    (list: FamilyChildRPC[]) => {
      const key = list.map((c) => `${c.student_id}:${c.full_name}:${c.class_name}`).join('|');
      if (!list.length || lastSyncKey.current === key) return;
      lastSyncKey.current = key;

      const mapped = list.map((c) => ({
        id: c.student_id,
        name: c.full_name,
        photoUrl: '',
        grade: c.class_name,
        classId: c.class_name,
        ibeScore: 0,
        attendanceRate: 0,
        status: c.status === 'inativo' ? 'Inativo' : 'Ativo',
        aiAlerts: [],
        occurrences: [],
        performance: [],
        guardians: [
          {
            id: c.guardian_id || '',
            name: c.guardian_name || 'Responsável',
            relationship: c.relationship || 'Responsável',
            cpf: '',
            phone: '',
            email: '',
            hasAccess: true,
            isPrincipal: true,
          },
        ],
      }));

      setFamilyStudents?.(mapped);
      if (setStudent && !(student && mapped.some((m) => m.id === student.id))) setStudent(mapped[0]);
    },
    [setFamilyStudents, setStudent, student],
  );

  /** Os filhos vêm do banco: só aparecem os alunos ligados a esta conta */
  const loadChildren = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_my_family_children');
      const list = !error && data?.ok && Array.isArray(data.children) ? (data.children as FamilyChildRPC[]) : [];
      setChildren(list);
      syncContext(list);
    } catch (err) {
      console.warn('[FamilyDashboard] filhos', err);
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }, [syncContext]);

  useEffect(() => {
    loadChildren();
    // atualiza sozinho quando a escola liga um aluno à família
    const channel = supabase
      .channel('familia-vinculos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_guardians' }, () => loadChildren())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guardians' }, () => loadChildren())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeTab = TABS.some((t) => t.id === activeFamilyTab) || [8, 10, 11, 12].includes(activeFamilyTab) ? activeFamilyTab : 1;
  const activeChild = children.find((c) => c.student_id === student?.id) ?? children[0];

  const renderTab = () => {
    switch (activeTab) {
      case 1:
        return <StudentDataTab />;
      case 2:
        return <StudentsAndLinkingTab />;
      case 15:
        return <StudentClassScheduleTab />;
      case 3:
        return <CentralComunicacaoTab />;
      case 4:
        return <RoutineRadarTab />;
      case 5:
        return <SchoolCalendarTab />;
      case 6:
        return <LostFoundTab />;
      case 7:
        return <GateQRCodeTab />;
      case 8:
        return <TransportTab />;
      case 9:
        return <TutorsMarketplaceTab />;
      case 10:
        return <AppointmentTab />;
      case 11:
        return <ClimateSurveyTab />;
      case 12:
        return <DocsChatTab />;
      case 13:
        return <FoodMenuTab />;
      case 14:
        return <AppearanceSettings />;
      default:
        return <StudentDataTab />;
    }
  };

  return (
    <Page>
      <h1 className="sr-only">Portal da família</h1>
      {/* Faixa com o aluno ativo e a troca entre filhos */}
      {loading ? (
        <Skeleton className="h-44 rounded-[28px]" />
      ) : children.length === 0 ? (
        <Card>
          <EmptyState
            icon={Heart}
            title="Ainda não encontramos seus filhos"
            text="Assim que a escola registrar a matrícula com o seu CPF e o seu e-mail, os alunos aparecem aqui automaticamente. Se já fez a matrícula, confirme esses dados com a secretaria."
          />
        </Card>
      ) : (
        <BrandHero>
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <span className="rounded-full p-1" style={{ background: 'var(--sidebar-bg-hover)' }}>
                <span
                  className="flex h-16 w-16 items-center justify-center rounded-full font-serif text-[22px] font-semibold"
                  style={{ background: 'var(--sidebar-active-bg)', color: 'var(--sidebar-active-fg)' }}
                >
                  {(activeChild?.full_name || '?')
                    .split(/\s+/)
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </span>
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium" style={{ color: 'var(--sidebar-muted)' }}>
                  {activeChild?.school_name || 'Escola'}
                </p>
                <h2 className="truncate font-serif text-[28px] font-semibold leading-tight tracking-[-0.015em] sm:text-[32px]">
                  {activeChild?.full_name}
                </h2>
                <div className="mt-2 flex flex-wrap gap-2 text-[13px]">
                  {[activeChild?.class_name, activeChild?.shift, activeChild?.relationship].filter(Boolean).map((t) => (
                    <span key={t} className="rounded-full px-3 py-1 font-medium" style={{ background: 'var(--sidebar-bg-hover)' }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {children.length > 1 && (
              <div className="xl:max-w-[55%]">
                <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--sidebar-muted)' }}>
                  <Users className="h-3.5 w-3.5" />
                  Seus filhos
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {children.map((c) => {
                    const active = c.student_id === activeChild?.student_id;
                    return (
                      <button
                        key={c.student_id}
                        type="button"
                        onClick={() => selectFamilyStudent(c.student_id)}
                        aria-pressed={active}
                        className="flex min-w-[190px] items-center gap-3 rounded-2xl p-2.5 pr-4 text-left transition-all"
                        style={
                          active
                            ? { background: 'var(--sidebar-active-bg)', color: 'var(--sidebar-active-fg)' }
                            : { background: 'var(--sidebar-bg-hover)', color: 'var(--sidebar-fg)' }
                        }
                      >
                        <Avatar name={c.full_name} size={36} />
                        <span className="min-w-0 leading-tight">
                          <span className="block truncate text-[14px] font-semibold">{c.full_name.split(/\s+/)[0]}</span>
                          <span className="block truncate text-[12px] opacity-75">{c.class_name}</span>
                        </span>
                        {active && <Check className="ml-auto h-4 w-4" strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </BrandHero>
      )}

      {/* Seções */}
      <PillNav
        label="Seções do portal da família"
        items={TABS.map((t) => (t.id === 2 ? { ...t, badge: children.length || undefined } : t))}
        value={activeTab}
        onChange={(id) => setActiveFamilyTab(id)}
      />

      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }} className="min-h-[420px]">
        {renderTab()}
      </motion.div>
    </Page>
  );
}

/** Aba "Aparência": mesma escolha do botão de paleta do topo */
function AppearanceSettings() {
  const { sidebar, background, setSidebar, setBackground, isCustom, reset } = usePanelTheme();
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader icon={Palette} title="Cor do painel" subtitle="Muda a barra lateral e os destaques." />
        <div role="radiogroup" aria-label="Cor do painel" className="grid grid-cols-5 gap-3">
          {SIDEBAR_COLORS.map((c) => {
            const selected = c.id === sidebar;
            return (
              <button key={c.id} type="button" role="radio" aria-checked={selected} onClick={() => setSidebar(c.id)} className="group flex flex-col items-center gap-2">
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-2xl transition-transform group-hover:scale-105"
                  style={{ background: c.sidebarBg, boxShadow: selected ? `0 0 0 3px var(--bg-card), 0 0 0 5px ${c.sidebarBg}` : undefined }}
                >
                  {selected && <Check className="h-5 w-5" style={{ color: c.sidebarFg }} strokeWidth={3} />}
                </span>
                <span className={`text-[13px] ${selected ? 'font-semibold text-[var(--text-heading)]' : 'text-[var(--text-muted)]'}`}>{c.label}</span>
              </button>
            );
          })}
        </div>
      </Card>
      <Card>
        <CardHeader
          icon={Palette}
          title="Fundo"
          subtitle="A cor da área de trabalho."
          action={
            isCustom ? (
              <button type="button" onClick={reset} className="text-[13px] font-semibold text-[var(--accent)] hover:underline">
                Usar cor da escola
              </button>
            ) : undefined
          }
        />
        <div role="radiogroup" aria-label="Fundo" className="grid grid-cols-2 gap-3">
          {BACKGROUNDS.map((b) => {
            const selected = b.id === background;
            return (
              <button
                key={b.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setBackground(b.id)}
                className="flex items-center gap-3 rounded-2xl border-2 p-3 text-left text-[14px] font-medium transition-colors"
                style={selected ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : { borderColor: 'var(--border)' }}
              >
                <span className="h-10 w-10 rounded-xl border border-black/10" style={{ background: b.app }} />
                {b.label}
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-[13px] text-[var(--text-muted)]">A escolha vale só para você.</p>
      </Card>
    </div>
  );
}