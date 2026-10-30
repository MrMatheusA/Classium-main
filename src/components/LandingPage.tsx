import React, { useEffect, useRef, useState } from 'react';
import { motion, MotionConfig, useMotionValueEvent, useScroll, useSpring } from 'motion/react';
import { usePlatform, UserRole } from '../context/PlatformContext';
import { useBrandTheme } from '../theme/BrandThemeContext';
import { Logo } from './Logo';
import { BrandShield } from './BrandShield';
import { AdvertiserDashboardModal } from './commercial/AdvertiserDashboardModal';
import { PartnerAuthModal } from './partner/PartnerAuthModal';
import { PartnerPortalDashboard } from './partner/PartnerPortalDashboard';
import { PartnerOnboardingWizard, OnboardingWizardCategory } from './partner/PartnerOnboardingWizard';
import {
  CountUp,
  EASE,
  HeroPattern,
  Marquee,
  Reveal,
  SpotlightCard,
  Stagger,
  StaggerItem,
  TiltCard,
  WordsReveal,
  useLenis,
} from './landing/effects';
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  GraduationCap,
  Heart,
  Users,
  ClipboardCheck,
  BookOpenCheck,
  MessageSquare,
  ShieldAlert,
  FileText,
  BarChart3,
  Check,
  CalendarDays,
  Home,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react';

/*
 * Todas as cores vêm do tema da marca (theme/BrandThemeContext):
 *   --sidebar-bg / --sidebar-fg / --sidebar-muted / --sidebar-border  → faixas na cor da marca (hero, CTA)
 *   --sidebar-active-bg / --sidebar-active-fg                          → botão principal sobre a cor da marca
 *   --accent / --accent-soft / --accent-fg                            → destaques no fundo claro
 *   --bg-app / --bg-card / --bg-card-alt / --border                   → fundo e cards
 *   --text-heading / --text-body / --text-muted                       → textos
 *   --hero-highlight                                                   → traço desenhado no título
 * Trocar a cor da marca (futura área administrativa) muda a página inteira.
 */

/* ------------------------------------------------------------------ */
/* Botões                                                              */
/* ------------------------------------------------------------------ */

type Surface = 'brand' | 'light';

function PrimaryButton({
  children,
  onClick,
  size = 'md',
  id,
  surface = 'light',
}: {
  children: React.ReactNode;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
  id?: string;
  surface?: Surface;
}) {
  const sizes = { sm: 'h-10 px-4 text-sm', md: 'h-11 px-5 text-sm', lg: 'h-[52px] px-7 text-[15px]' };
  const style =
    surface === 'brand'
      ? { background: 'var(--sidebar-active-bg)', color: 'var(--sidebar-active-fg)' }
      : { background: 'var(--accent)', color: 'var(--accent-fg)' };
  return (
    <motion.button
      id={id}
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      style={style}
      className={`group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-semibold shadow-[0_10px_30px_-10px_rgba(16,24,40,0.45)] transition-shadow hover:shadow-[0_16px_40px_-12px_rgba(16,24,40,0.55)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-soft)] ${sizes[size]}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[450%]"
      />
      <span className="relative flex items-center gap-2">{children}</span>
    </motion.button>
  );
}

interface FamilyRegisterButtonProps {
  onRegister: () => void;
  className?: string;
  fullWidth?: boolean;
  id?: string;
  size?: 'normal' | 'large';
  /** 'dark' = sobre a cor da marca (hero/CTA); 'light' = sobre fundo claro */
  tone?: 'light' | 'dark';
}

export function FamilyRegisterButton({
  onRegister,
  className = '',
  fullWidth = false,
  id,
  size = 'normal',
  tone = 'light',
}: FamilyRegisterButtonProps) {
  const style =
    tone === 'dark'
      ? { borderColor: 'var(--sidebar-border)', color: 'var(--sidebar-fg)', background: 'var(--sidebar-bg-hover)' }
      : { borderColor: 'var(--border)', color: 'var(--text-heading)', background: 'var(--bg-card)' };

  return (
    <motion.button
      id={id}
      type="button"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={(e) => {
        e.preventDefault();
        onRegister();
      }}
      style={style}
      className={`group inline-flex items-center justify-center gap-2 rounded-full border-2 font-semibold backdrop-blur-sm transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-soft)] ${
        size === 'large' ? 'h-[52px] px-7 text-[15px]' : 'h-11 px-5 text-sm'
      } ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      <Heart className="h-4 w-4" />
      Criar conta família
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */
/* Conteúdo                                                            */
/* ------------------------------------------------------------------ */

const ROUTINES = [
  'Chamada',
  'Boletim',
  'Comunicados',
  'Agenda escolar',
  'Ocorrências',
  'Matrículas',
  'Declarações',
  'Calendário',
  'Recados do professor',
  'Prontuários',
  'Indicadores por turma',
  'Reunião de pais',
];

const PORTALS: { icon: LucideIcon; name: string; who: string; items: string[] }[] = [
  {
    icon: Building2,
    name: 'Gestão',
    who: 'Direção e mantenedora',
    items: ['Indicadores de frequência e desempenho', 'Turmas, matrículas e calendário', 'Acesso e permissões da equipe'],
  },
  {
    icon: GraduationCap,
    name: 'Professor',
    who: 'Corpo docente',
    items: ['Chamada em poucos toques', 'Notas e avaliações por turma', 'Recados direto para a família'],
  },
  {
    icon: Heart,
    name: 'Família',
    who: 'Pais e responsáveis',
    items: ['Frequência, notas e agenda do dia', 'Mais de um filho na mesma conta', 'Comunicados sem grupo de WhatsApp'],
  },
  {
    icon: Users,
    name: 'Equipe',
    who: 'Secretaria, coordenação, disciplinar',
    items: ['Documentos e prontuários', 'Acompanhamento pedagógico', 'Registro de ocorrências'],
  },
];

const STEPS = [
  { n: '1', title: 'A escola configura', text: 'Turmas, alunos, responsáveis e calendário são cadastrados uma única vez pela gestão.' },
  { n: '2', title: 'A equipe registra', text: 'Professores lançam chamada e notas; secretaria e coordenação registram o que é delas.' },
  { n: '3', title: 'A família acompanha', text: 'Cada responsável vê só o que diz respeito ao seu filho, no mesmo dia do lançamento.' },
];

const PARTNERS: {
  category: OnboardingWizardCategory;
  label: string;
  title: string;
  text: string;
  audience: string;
  perks: string[];
  cta: string;
}[] = [
  {
    category: 'profissional',
    label: 'Profissionais',
    title: 'Atendimento especializado',
    text: 'Para quem atende alunos e famílias fora da sala de aula.',
    audience: 'Professores particulares, psicopedagogos, psicólogos, fonoaudiólogos, professores de idiomas e música.',
    perks: ['Perfil público com avaliações', 'Contato direto pelo WhatsApp', 'Agenda de atendimentos'],
    cta: 'Cadastrar perfil profissional',
  },
  {
    category: 'empresa',
    label: 'Empresas',
    title: 'Produtos e formação',
    text: 'Para marcas que falam com professores e gestores.',
    audience: 'Faculdades, editoras, livrarias, edtechs, softwares educacionais, robótica e instituições financeiras.',
    perks: ['Espaço no portal do professor', 'Campanhas e cupons', 'Leads com contato direto'],
    cta: 'Divulgar empresa',
  },
  {
    category: 'prestador',
    label: 'Fornecedores',
    title: 'Serviços para escolas',
    text: 'Para quem mantém a escola funcionando.',
    audience: 'Reforma, limpeza, dedetização, segurança, uniformes, mobiliário, informática, alimentação e transporte.',
    perks: ['Visibilidade para gestores', 'Portfólio e avaliações', 'Pedidos de orçamento'],
    cta: 'Cadastrar fornecedor',
  },
];

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

export function LandingPage() {
  const { setMode, setRole, setLoginFlow, currentPartner } = usePlatform();
  const { cssVars } = useBrandTheme();

  const [isPartnerAuthModalOpen, setIsPartnerAuthModalOpen] = useState(false);
  const [isPartnerPortalDashboardOpen, setIsPartnerPortalDashboardOpen] = useState(false);
  const [isOnboardingWizardOpen, setIsOnboardingWizardOpen] = useState(false);
  const [onboardingCategory, setOnboardingCategory] = useState<OnboardingWizardCategory>('profissional');
  const [isAdvertiserDashboardOpen, setIsAdvertiserDashboardOpen] = useState(false);

  const lenisRef = useLenis();

  // Pausa a rolagem suave enquanto algum modal estiver aberto
  const anyModalOpen =
    isPartnerAuthModalOpen || isPartnerPortalDashboardOpen || isOnboardingWizardOpen || isAdvertiserDashboardOpen;
  useEffect(() => {
    const lenis = lenisRef.current;
    if (!lenis) return;
    if (anyModalOpen) lenis.stop();
    else lenis.start();
  }, [anyModalOpen, lenisRef]);

  const handleNav = (role: UserRole, flow: 'login' | 'register-gestor' | 'register-family') => {
    setRole(role);
    setLoginFlow(flow);
    setMode('login');
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (lenisRef.current) lenisRef.current.scrollTo(el, { offset: -80 });
    else el.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => {
    if (lenisRef.current) lenisRef.current.scrollTo(0);
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openPartnerArea = () => {
    if (currentPartner) setIsPartnerPortalDashboardOpen(true);
    else setIsPartnerAuthModalOpen(true);
  };

  const openOnboarding = (category: OnboardingWizardCategory) => {
    setOnboardingCategory(category);
    setIsOnboardingWizardOpen(true);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div
        style={{ ...cssVars, background: 'var(--bg-app)', color: 'var(--text-body)' }}
        className="flex min-h-screen flex-col overflow-x-hidden font-sans antialiased selection:bg-[var(--accent-soft)]"
      >
        <NavBar
          currentPartner={!!currentPartner}
          onLogo={scrollToTop}
          onSection={scrollToSection}
          onPartner={openPartnerArea}
          onLogin={() => handleNav('admin', 'login')}
          onRegister={() => handleNav('admin', 'register-gestor')}
        />

        <main className="flex-1">
          {/* ================= HERO ================= */}
          <section className="px-3 pt-2 sm:px-4">
            <div
              className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[28px] sm:rounded-[36px]"
              style={{ background: 'var(--sidebar-bg)', color: 'var(--sidebar-fg)' }}
            >
              <HeroPattern />

              <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-14 sm:px-10 lg:grid-cols-12 lg:gap-6 lg:pb-24 lg:pt-20">
                {/* texto */}
                <div className="lg:col-span-7">
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: EASE }}
                    className="inline-flex items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-4 text-[13px] font-medium backdrop-blur"
                    style={{ borderColor: 'var(--sidebar-border)', background: 'var(--sidebar-bg-hover)' }}
                  >
                    <span className="h-7 w-7 rounded-full p-1" style={{ background: 'var(--sidebar-active-bg)' }}>
                      <BrandShield size="100%" />
                    </span>
                    Classium
                    <span className="h-3.5 w-px" style={{ background: 'var(--sidebar-border)' }} />
                    <span style={{ color: 'var(--sidebar-muted)' }}>Gestão escolar conectada</span>
                  </motion.div>

                  <h1 className="mt-8 font-serif text-[42px] font-semibold leading-[1.04] tracking-[-0.025em] sm:text-[60px] lg:text-[72px]">
                    <WordsReveal text="A escola inteira," delay={0.1} />
                    <br />
                    <WordsReveal text="na" delay={0.3} />{' '}
                    <span className="relative inline-block whitespace-nowrap">
                      <WordsReveal text="mesma página." delay={0.37} wordClassName="italic" />
                      <HandUnderline delay={1.0} />
                    </span>
                  </h1>

                  <motion.p
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.65, ease: EASE }}
                    className="mt-7 max-w-xl text-[17px] leading-relaxed sm:text-lg"
                    style={{ color: 'var(--sidebar-muted)' }}
                  >
                    Gestão, sala de aula e família em uma só plataforma. O que a secretaria registra, o professor vê. O que o
                    professor lança, a família acompanha no mesmo dia.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.8, ease: EASE }}
                    className="mt-10 flex flex-col gap-3 sm:flex-row"
                  >
                    <PrimaryButton size="lg" surface="brand" onClick={() => handleNav('admin', 'register-gestor')}>
                      Criar conta da escola
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </PrimaryButton>
                    <FamilyRegisterButton
                      id="hero-btn-criar-conta-familia"
                      size="large"
                      tone="dark"
                      onRegister={() => handleNav('family', 'register-family')}
                    />
                  </motion.div>

                  <motion.ul
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 1.0 }}
                    className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-[14px]"
                    style={{ color: 'var(--sidebar-muted)' }}
                  >
                    {['Acesso separado por perfil', 'Navegador e celular', 'Vários filhos em uma conta'].map((t) => (
                      <li key={t} className="flex items-center gap-2">
                        <span
                          className="flex h-5 w-5 items-center justify-center rounded-full"
                          style={{ background: 'var(--sidebar-bg-hover)', color: 'var(--hero-highlight)' }}
                        >
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                        {t}
                      </li>
                    ))}
                  </motion.ul>
                </div>

                {/* logomarca em órbita */}
                <div className="lg:col-span-5">
                  <LogoOrbit />
                </div>
              </div>
            </div>
          </section>

          {/* ================= FAIXA DE ROTINAS ================= */}
          <section className="py-8">
            <Marquee duration={50}>
              {ROUTINES.map((r) => (
                <span
                  key={r}
                  className="mx-2 flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-[14px] font-medium"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-body)' }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                  {r}
                </span>
              ))}
            </Marquee>
          </section>

          {/* ================= POR DENTRO ================= */}
          <section className="mx-auto max-w-6xl px-4 pb-8 pt-12 sm:px-6 lg:pt-16">
            <Reveal className="mx-auto max-w-2xl text-center">
              <Eyebrow>Por dentro do Classium</Eyebrow>
              <h2 className="mt-4 font-serif text-4xl font-semibold leading-[1.08] tracking-[-0.02em] text-[var(--text-heading)] sm:text-5xl">
                Tudo o que acontece na escola, numa tela só.
              </h2>
            </Reveal>
            <Reveal delay={0.15} className="mt-14">
              <ProductPreview />
            </Reveal>
          </section>

          {/* ================= PORTAIS ================= */}
          <section id="plataforma" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-6 lg:py-28">
            <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
              <Reveal className="lg:col-span-6">
                <Eyebrow>Plataforma</Eyebrow>
                <h2 className="mt-4 font-serif text-4xl font-semibold leading-[1.08] tracking-[-0.02em] text-[var(--text-heading)] sm:text-5xl">
                  Um portal para cada pessoa da escola.
                </h2>
              </Reveal>
              <Reveal delay={0.1} className="lg:col-span-5 lg:col-start-8">
                <p className="text-[16px] leading-relaxed text-[var(--text-muted)]">
                  Cada perfil entra no próprio ambiente, com as ferramentas do seu trabalho e acesso só ao que precisa ver.
                  Os dados são os mesmos para todos, então ninguém trabalha com informação desatualizada.
                </p>
              </Reveal>
            </div>

            <Stagger className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PORTALS.map(({ icon: Icon, name, who, items }) => (
                <StaggerItem key={name} className="h-full">
                  <SpotlightCard className="h-full p-6 sm:p-7">
                    <IconTile icon={Icon} />
                    <h3 className="mt-6 font-serif text-[22px] font-semibold text-[var(--text-heading)]">Classium {name}</h3>
                    <p className="mt-1 text-[13px] text-[var(--text-muted)]">{who}</p>
                    <ul className="mt-6 space-y-3 border-t border-[var(--border)] pt-6">
                      {items.map((it) => (
                        <li key={it} className="flex gap-2.5 text-[14px] leading-snug text-[var(--text-body)]">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" strokeWidth={2.5} />
                          {it}
                        </li>
                      ))}
                    </ul>
                  </SpotlightCard>
                </StaggerItem>
              ))}
            </Stagger>
          </section>

          {/* ================= COMO FUNCIONA ================= */}
          <StepsSection />

          {/* ================= RECURSOS (mosaico) ================= */}
          <section id="recursos" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-6 lg:py-28">
            <Reveal className="max-w-2xl">
              <Eyebrow>Recursos</Eyebrow>
              <h2 className="mt-4 font-serif text-4xl font-semibold leading-[1.08] tracking-[-0.02em] text-[var(--text-heading)] sm:text-5xl">
                O dia a dia da escola, sem planilha paralela.
              </h2>
              <p className="mt-5 text-[16px] leading-relaxed text-[var(--text-muted)]">
                As rotinas que mais consomem tempo da equipe, organizadas para que o registro seja rápido e a consulta, imediata.
              </p>
            </Reveal>

            <Stagger className="mt-14 grid gap-4 lg:grid-cols-3">
              <StaggerItem className="lg:col-span-2">
                <SpotlightCard className="h-full p-7">
                  <div className="grid h-full gap-8 md:grid-cols-2">
                    <FeatureText
                      icon={ClipboardCheck}
                      title="Frequência"
                      text="Chamada por aula ou por dia, com alerta de faltas recorrentes para a coordenação."
                    />
                    <AttendanceDemo />
                  </div>
                </SpotlightCard>
              </StaggerItem>

              <StaggerItem>
                <SpotlightCard className="h-full p-7">
                  <FeatureText
                    icon={BookOpenCheck}
                    title="Notas e boletim"
                    text="Avaliações por etapa, médias calculadas e boletim disponível para a família."
                  />
                  <div className="mt-8 flex items-end gap-3">
                    <CountUp to={8.4} decimals={1} className="font-serif text-5xl font-semibold text-[var(--text-heading)]" />
                    <span className="pb-2 text-[13px] font-medium text-[var(--accent)]">média da turma</span>
                  </div>
                </SpotlightCard>
              </StaggerItem>

              {[
                { icon: MessageSquare, title: 'Comunicação', text: 'Comunicados para a escola, a turma ou um responsável, com confirmação de leitura.' },
                { icon: ShieldAlert, title: 'Ocorrências', text: 'Registro disciplinar com histórico do aluno e encaminhamentos documentados.' },
                { icon: FileText, title: 'Secretaria', text: 'Matrículas, declarações e prontuários organizados em um só lugar.' },
              ].map((f) => (
                <StaggerItem key={f.title}>
                  <SpotlightCard className="h-full p-7">
                    <FeatureText {...f} />
                  </SpotlightCard>
                </StaggerItem>
              ))}

              <StaggerItem className="lg:col-span-3">
                <SpotlightCard className="p-7">
                  <div className="grid items-center gap-10 md:grid-cols-5">
                    <div className="md:col-span-2">
                      <FeatureText
                        icon={BarChart3}
                        title="Indicadores"
                        text="Visão por turma e por série para decidir com base em dados, não em impressão."
                      />
                    </div>
                    <div className="md:col-span-3">
                      <BarsDemo />
                    </div>
                  </div>
                </SpotlightCard>
              </StaggerItem>
            </Stagger>
          </section>

          {/* ================= PARCEIROS ================= */}
          <section id="parceiros" className="scroll-mt-24 border-y border-[var(--border)] bg-[var(--bg-card)]">
            <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-28">
              <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                <Reveal className="max-w-2xl">
                  <Eyebrow>Rede Classium</Eyebrow>
                  <h2 className="mt-4 font-serif text-4xl font-semibold leading-[1.08] tracking-[-0.02em] text-[var(--text-heading)] sm:text-5xl">
                    Atende escolas ou famílias? Esteja onde elas já estão.
                  </h2>
                  <p className="mt-5 text-[16px] leading-relaxed text-[var(--text-muted)]">
                    Profissionais, empresas e fornecedores podem se cadastrar e aparecer para gestores, professores e
                    responsáveis que usam o Classium.
                  </p>
                </Reveal>
                <Reveal delay={0.1}>
                  <button
                    onClick={openPartnerArea}
                    className="group inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent)] hover:underline"
                  >
                    {currentPartner ? 'Abrir portal do parceiro' : 'Já sou parceiro'}
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </button>
                </Reveal>
              </div>

              <Stagger className="mt-14 grid gap-4 lg:grid-cols-3">
                {PARTNERS.map((p) => (
                  <StaggerItem key={p.category} className="h-full">
                    <SpotlightCard className="h-full bg-[var(--bg-app)] p-7">
                      <div className="flex h-full flex-col">
                        <span
                          className="self-start rounded-full px-3 py-1 text-[12px] font-semibold"
                          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                        >
                          {p.label}
                        </span>
                        <h3 className="mt-4 font-serif text-[26px] font-semibold leading-tight text-[var(--text-heading)]">{p.title}</h3>
                        <p className="mt-2 text-[15px] text-[var(--text-body)]">{p.text}</p>
                        <p className="mt-4 text-[13px] leading-relaxed text-[var(--text-muted)]">{p.audience}</p>

                        <ul className="mt-6 space-y-2.5 border-t border-[var(--border)] pt-6">
                          {p.perks.map((perk) => (
                            <li key={perk} className="flex items-center gap-2.5 text-[14px] text-[var(--text-body)]">
                              <Check className="h-4 w-4 shrink-0 text-[var(--accent)]" strokeWidth={2.5} />
                              {perk}
                            </li>
                          ))}
                        </ul>

                        <div className="mt-auto pt-8">
                          <button
                            onClick={() => openOnboarding(p.category)}
                            className="group inline-flex h-11 w-full items-center justify-between rounded-full border-2 border-[var(--border)] bg-[var(--bg-card)] px-5 text-sm font-semibold text-[var(--text-heading)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                          >
                            {p.cta}
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                          </button>
                        </div>
                      </div>
                    </SpotlightCard>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </section>

          {/* ================= CHAMADA FINAL ================= */}
          <section className="px-3 py-24 sm:px-4 lg:py-28">
            <Reveal>
              <div
                className="relative mx-auto max-w-6xl overflow-hidden rounded-[28px] px-6 py-16 text-center sm:rounded-[36px] sm:px-12 lg:py-20"
                style={{ background: 'var(--sidebar-bg)', color: 'var(--sidebar-fg)' }}
              >
                <HeroPattern />
                <div className="relative">
                  <div className="mx-auto h-14 w-14 rounded-2xl p-2.5" style={{ background: 'var(--sidebar-active-bg)' }}>
                    <BrandShield size="100%" />
                  </div>
                  <h2 className="mx-auto mt-6 max-w-3xl font-serif text-4xl font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[56px]">
                    Comece pela <span className="italic">sua escola.</span>
                  </h2>
                  <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed" style={{ color: 'var(--sidebar-muted)' }}>
                    Crie a conta da gestão, cadastre as turmas e convide professores e famílias quando estiver pronto.
                  </p>
                  <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <PrimaryButton size="lg" surface="brand" onClick={() => handleNav('admin', 'register-gestor')}>
                      Criar conta da escola
                      <ArrowRight className="h-4 w-4" />
                    </PrimaryButton>
                    <FamilyRegisterButton
                      id="cta-btn-criar-conta-familia"
                      size="large"
                      tone="dark"
                      onRegister={() => handleNav('family', 'register-family')}
                    />
                  </div>
                  <p className="mt-8 text-sm" style={{ color: 'var(--sidebar-muted)' }}>
                    Já usa o Classium?{' '}
                    <button
                      onClick={() => handleNav('admin', 'login')}
                      className="font-semibold underline underline-offset-4"
                      style={{ color: 'var(--sidebar-fg)' }}
                    >
                      Entrar na plataforma
                    </button>
                  </p>
                </div>
              </div>
            </Reveal>
          </section>
        </main>

        {/* ================= RODAPÉ ================= */}
        <footer id="contato" className="border-t border-[var(--border)] bg-[var(--bg-card)]">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-12">
            <div className="md:col-span-5">
              <Logo size="sm" variant="portal" surface="light" />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-[var(--text-muted)]">
                Gestão escolar que conecta direção, professores, equipe e famílias.
              </p>
            </div>
            <FooterCol
              title="Plataforma"
              links={[
                { label: 'Portais', onClick: () => scrollToSection('plataforma') },
                { label: 'Recursos', onClick: () => scrollToSection('recursos') },
                { label: 'Parceiros', onClick: () => scrollToSection('parceiros') },
              ]}
            />
            <FooterCol title="Ajuda" links={[{ label: 'Central de ajuda' }, { label: 'Contato' }, { label: 'Status' }]} />
            <FooterCol title="Legal" links={[{ label: 'Termos de uso' }, { label: 'Privacidade e LGPD' }, { label: 'Cookies' }]} />
          </div>
          <div className="border-t border-[var(--border)]">
            <div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 px-4 py-6 text-[13px] text-[var(--text-muted)] sm:flex-row sm:px-6">
              <p>© {new Date().getFullYear()} Classium. Todos os direitos reservados.</p>
              <p>Feito para escolas brasileiras.</p>
            </div>
          </div>
        </footer>

        {/* ================= MODAIS (inalterados) ================= */}
        <PartnerOnboardingWizard
          isOpen={isOnboardingWizardOpen}
          onClose={() => setIsOnboardingWizardOpen(false)}
          initialCategory={onboardingCategory}
          onOpenPartnerDashboard={() => setIsPartnerPortalDashboardOpen(true)}
        />
        <AdvertiserDashboardModal
          isOpen={isAdvertiserDashboardOpen}
          onClose={() => setIsAdvertiserDashboardOpen(false)}
          onOpenNewRegistration={() => openOnboarding('profissional')}
        />
        <PartnerAuthModal
          isOpen={isPartnerAuthModalOpen}
          onClose={() => setIsPartnerAuthModalOpen(false)}
          onOpenRegisterFlow={() => openOnboarding('profissional')}
          onSuccessLogin={() => setIsPartnerPortalDashboardOpen(true)}
        />
        <PartnerPortalDashboard
          isOpen={isPartnerPortalDashboardOpen}
          onClose={() => setIsPartnerPortalDashboardOpen(false)}
        />
      </div>
    </MotionConfig>
  );
}

/* ------------------------------------------------------------------ */
/* Navegação                                                           */
/* ------------------------------------------------------------------ */

function NavBar({
  currentPartner,
  onLogo,
  onSection,
  onPartner,
  onLogin,
  onRegister,
}: {
  currentPartner: boolean;
  onLogo: () => void;
  onSection: (id: string) => void;
  onPartner: () => void;
  onLogin: () => void;
  onRegister: () => void;
}) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 16));

  const links = [
    { id: 'plataforma', label: 'Plataforma' },
    { id: 'recursos', label: 'Recursos' },
    { id: 'parceiros', label: 'Parceiros' },
  ];
  const go = (id: string) => {
    setOpen(false);
    onSection(id);
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="sticky top-0 z-50 px-3 pt-2 sm:px-4"
    >
      <div
        className={`mx-auto flex h-16 max-w-[1400px] items-center justify-between rounded-2xl px-4 transition-all duration-300 sm:px-6 ${
          scrolled || open ? 'border border-[var(--border)] shadow-[0_8px_30px_-12px_rgba(16,24,40,0.18)] backdrop-blur-xl' : 'border border-transparent'
        }`}
        style={{ background: scrolled || open ? 'color-mix(in srgb, var(--bg-card) 85%, transparent)' : 'transparent' }}
      >
        <button onClick={onLogo} aria-label="Início">
          <Logo size="sm" variant="portal" surface="light" />
        </button>

        <nav className="hidden items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-card)] p-1 md:flex">
          {links.map((l) => (
            <button
              key={l.id}
              onClick={() => go(l.id)}
              className="rounded-full px-4 py-1.5 text-sm font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onPartner}
            className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-heading)] lg:block"
          >
            {currentPartner ? 'Portal do parceiro' : 'Área do parceiro'}
          </button>
          <button
            id="header-btn-entrar"
            onClick={onLogin}
            className="hidden h-10 rounded-full px-4 text-sm font-semibold text-[var(--text-heading)] transition-colors hover:bg-[var(--bg-card-alt)] sm:block"
          >
            Entrar
          </button>
          <PrimaryButton size="sm" id="header-btn-registrar" onClick={onRegister}>
            Criar conta
          </PrimaryButton>
          <button
            onClick={() => setOpen((o) => !o)}
            className="ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-heading)] hover:bg-[var(--bg-card-alt)] md:hidden"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* menu móvel */}
      <motion.div
        initial={false}
        animate={open ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="mx-auto mt-2 max-w-[1400px] overflow-hidden rounded-2xl bg-[var(--bg-card)] shadow-[0_16px_40px_-16px_rgba(16,24,40,0.25)] md:hidden"
      >
        <div className="space-y-1 p-3">
          {links.map((l) => (
            <button
              key={l.id}
              onClick={() => go(l.id)}
              className="block w-full rounded-xl px-3 py-2.5 text-left text-[15px] font-medium text-[var(--text-heading)] hover:bg-[var(--bg-card-alt)]"
            >
              {l.label}
            </button>
          ))}
          <button
            onClick={() => {
              setOpen(false);
              onPartner();
            }}
            className="block w-full rounded-xl px-3 py-2.5 text-left text-[15px] font-medium text-[var(--text-heading)] hover:bg-[var(--bg-card-alt)]"
          >
            {currentPartner ? 'Portal do parceiro' : 'Área do parceiro'}
          </button>
          <button
            onClick={onLogin}
            className="mt-2 block w-full rounded-full border-2 border-[var(--border)] px-3 py-2.5 text-center text-[15px] font-semibold text-[var(--text-heading)]"
          >
            Entrar
          </button>
        </div>
      </motion.div>
    </motion.header>
  );
}

/* ------------------------------------------------------------------ */
/* Hero: traço desenhado e logomarca em órbita                         */
/* ------------------------------------------------------------------ */

function HandUnderline({ delay = 0 }: { delay?: number }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 300 14"
      preserveAspectRatio="none"
      className="absolute -bottom-1 left-0 h-[0.28em] w-full"
      fill="none"
    >
      <motion.path
        d="M3 9.5C55 4 120 2.5 180 4.5C220 5.8 262 7.5 297 6"
        stroke="var(--hero-highlight)"
        strokeWidth="5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay, duration: 0.9, ease: EASE }}
      />
    </svg>
  );
}

const ORBIT_CHIPS: { icon: LucideIcon; label: string; angle: number }[] = [
  { icon: Building2, label: 'Gestão', angle: -90 },
  { icon: GraduationCap, label: 'Professor', angle: 0 },
  { icon: Heart, label: 'Família', angle: 90 },
  { icon: Users, label: 'Equipe', angle: 180 },
];

/** A logomarca no centro, com os quatro portais girando em volta: a escola conectada. */
function LogoOrbit() {
  const R = 44; // raio em % do container

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.1, delay: 0.3, ease: EASE }}
      className="relative mx-auto aspect-square w-full max-w-[300px] sm:max-w-[440px]"
    >
      {/* anéis */}
      {[100, 72, 44].map((size, i) => (
        <div
          key={size}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border"
          style={{
            width: `${size}%`,
            height: `${size}%`,
            borderColor: 'var(--sidebar-border)',
            borderStyle: i === 0 ? 'dashed' : 'solid',
            background: i === 2 ? 'var(--sidebar-bg-hover)' : 'transparent',
          }}
        />
      ))}

      {/* pulso */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[44%] w-[44%] rounded-full border-2"
        style={{ borderColor: 'var(--hero-highlight)', x: '-50%', y: '-50%' }}
        animate={{ scale: [1, 1.65], opacity: [0.55, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeOut' }}
      />

      {/* logomarca */}
      <div
        className="absolute left-1/2 top-1/2 flex h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[28%] shadow-[0_24px_60px_-16px_rgba(0,0,0,0.45)]"
        style={{ background: 'var(--sidebar-active-bg)' }}
      >
        <motion.div
          className="h-[68%] w-[68%]"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <BrandShield size="100%" />
        </motion.div>
      </div>

      {/* portais girando */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      >
        {ORBIT_CHIPS.map(({ icon: Icon, label, angle }, i) => {
          const rad = (angle * Math.PI) / 180;
          const left = 50 + R * Math.cos(rad);
          const top = 50 + R * Math.sin(rad);
          return (
            <div key={label} className="absolute" style={{ left: `${left}%`, top: `${top}%` }}>
              {/* gira ao contrário para o chip ficar sempre de pé */}
              <motion.div
                style={{ x: '-50%', y: '-50%' }}
                animate={{ rotate: -360 }}
                transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.9 + i * 0.12, type: 'spring', stiffness: 260, damping: 18 }}
                  className="flex items-center gap-2 whitespace-nowrap rounded-full bg-[var(--bg-card)] py-1.5 pl-1.5 pr-3.5 text-[12px] font-semibold text-[var(--text-heading)] shadow-[0_12px_30px_-10px_rgba(0,0,0,0.4)] sm:text-[13px]"
                >
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full"
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
                  </span>
                  {label}
                </motion.div>
              </motion.div>
            </div>
          );
        })}
      </motion.div>

    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Como funciona — linha que avança com a rolagem                      */
/* ------------------------------------------------------------------ */

function StepsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 55%'] });
  const progress = useSpring(scrollYProgress, { stiffness: 110, damping: 28 });

  return (
    <section className="border-y border-[var(--border)] bg-[var(--bg-card)]">
      <div ref={ref} className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Como funciona</Eyebrow>
          <h2 className="mt-4 font-serif text-4xl font-semibold leading-[1.08] tracking-[-0.02em] text-[var(--text-heading)] sm:text-5xl">
            Registrou uma vez, chegou a quem precisa.
          </h2>
        </Reveal>

        <div className="relative mt-16">
          <div className="absolute left-[16%] right-[16%] top-7 hidden h-[3px] rounded-full bg-[var(--bg-card-alt)] md:block" />
          <motion.div
            style={{ scaleX: progress, background: 'var(--accent)' }}
            className="absolute left-[16%] right-[16%] top-7 hidden h-[3px] origin-left rounded-full md:block"
          />

          <Stagger className="grid gap-12 md:grid-cols-3 md:gap-8">
            {STEPS.map((s) => (
              <StaggerItem key={s.n} className="text-center">
                <div
                  className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl font-serif text-xl font-semibold shadow-[0_10px_24px_-10px_rgba(16,24,40,0.45)]"
                  style={{ background: 'var(--sidebar-bg)', color: 'var(--sidebar-fg)' }}
                >
                  {s.n}
                </div>
                <h3 className="mt-6 text-xl font-semibold text-[var(--text-heading)]">{s.title}</h3>
                <p className="mx-auto mt-3 max-w-xs text-[15px] leading-relaxed text-[var(--text-muted)]">{s.text}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Peças menores                                                       */
/* ------------------------------------------------------------------ */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.14em]"
      style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
    >
      {children}
    </p>
  );
}

function IconTile({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div
      className="flex h-12 w-12 items-center justify-center rounded-2xl"
      style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
    >
      <Icon className="h-5 w-5" strokeWidth={2} />
    </div>
  );
}

function FeatureText({ icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div>
      <IconTile icon={icon} />
      <h3 className="mt-5 text-lg font-semibold text-[var(--text-heading)]">{title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-[var(--text-muted)]">{text}</p>
    </div>
  );
}

function AttendanceDemo() {
  const students = [
    { name: 'Ana Beatriz', present: true },
    { name: 'Bruno Lima', present: true },
    { name: 'Carla Souza', present: false },
    { name: 'Davi Rocha', present: true },
  ];
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-app)] p-4">
      <div className="mb-3 flex items-center justify-between text-[12px] text-[var(--text-muted)]">
        <span>7º B · 2ª aula</span>
        <span>Matemática</span>
      </div>
      <ul className="space-y-2">
        {students.map((s, i) => (
          <motion.li
            key={s.name}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 + i * 0.12, duration: 0.5, ease: EASE }}
            className="flex items-center justify-between rounded-xl bg-[var(--bg-card)] px-3 py-2 text-[13px] shadow-[0_1px_2px_rgba(16,24,40,0.05)]"
          >
            <span className="text-[var(--text-heading)]">{s.name}</span>
            <motion.span
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 + i * 0.12, type: 'spring', stiffness: 400, damping: 18 }}
              className="inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold"
              style={s.present ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : { background: '#FDECEC', color: '#B42318' }}
            >
              {s.present ? 'Presente' : 'Falta'}
            </motion.span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function BarsDemo() {
  const data = [
    { label: '6º A', v: 92 },
    { label: '6º B', v: 88 },
    { label: '7º A', v: 95 },
    { label: '7º B', v: 81 },
    { label: '8º A', v: 90 },
    { label: '8º B', v: 86 },
    { label: '9º A', v: 93 },
  ];
  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-[12px] text-[var(--text-muted)]">
        <span>Frequência média por turma</span>
        <span>Outubro</span>
      </div>
      <div className="flex h-40 items-end gap-3">
        {data.map((d, i) => (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="relative flex h-32 w-full items-end">
              <motion.div
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.07, duration: 0.9, ease: EASE }}
                style={{ height: `${d.v}%`, background: d.v < 85 ? '#F2994A' : 'var(--accent)' }}
                className="w-full origin-bottom rounded-t-lg"
              />
            </div>
            <span className="text-[11px] text-[var(--text-muted)]">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; onClick?: () => void }[] }) {
  return (
    <div className="md:col-span-2">
      <h4 className="text-[13px] font-semibold text-[var(--text-heading)]">{title}</h4>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            {l.onClick ? (
              <button onClick={l.onClick} className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]">
                {l.label}
              </button>
            ) : (
              <span className="text-sm text-[var(--text-muted)]">{l.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Prévia do produto: o painel com a barra lateral na cor da marca     */
/* ------------------------------------------------------------------ */

function ProductPreview() {
  const nav: [LucideIcon, string][] = [
    [Home, 'Início'],
    [Users, 'Turmas'],
    [ClipboardCheck, 'Frequência'],
    [BookOpenCheck, 'Notas'],
    [MessageSquare, 'Comunicados'],
    [CalendarDays, 'Calendário'],
  ];

  return (
    <TiltCard max={4} className="relative mx-auto max-w-5xl">
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[48px] opacity-60 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, var(--accent-soft), transparent)' }}
      />
      <div className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--bg-card)] shadow-[0_40px_100px_-30px_rgba(16,24,40,0.35)]">
        {/* barra do navegador */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-card-alt)] px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          </div>
          <span className="mx-auto rounded-md bg-[var(--bg-card)] px-6 py-1 text-[11px] text-[var(--text-muted)]">classium.app/gestao</span>
          <span className="w-10" />
        </div>

        <div className="flex">
          {/* barra lateral na cor da marca */}
          <aside className="hidden w-48 shrink-0 flex-col px-3 py-4 sm:flex" style={{ background: 'var(--sidebar-bg)', color: 'var(--sidebar-fg)' }}>
            <div className="flex items-center gap-2 px-2 pb-5">
              <span className="h-6 w-6">
                <BrandShield size="100%" />
              </span>
              <span className="font-serif text-[15px] font-semibold">Classium</span>
            </div>
            {nav.map(([Icon, label], i) => (
              <span
                key={label}
                className="mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px]"
                style={i === 2 ? { background: 'var(--sidebar-active-bg)', color: 'var(--sidebar-active-fg)', fontWeight: 600 } : undefined}
              >
                <Icon className="h-4 w-4" strokeWidth={1.8} />
                {label}
              </span>
            ))}
          </aside>

          {/* conteúdo */}
          <div className="min-w-0 flex-1 bg-[var(--bg-app)] p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-serif text-[18px] font-semibold text-[var(--text-heading)]">Frequência</p>
                <p className="text-[12px] text-[var(--text-muted)]">Quinta-feira, 29 de outubro</p>
              </div>
              <span className="rounded-full px-3 py-1.5 text-[12px] font-semibold" style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
                Nova chamada
              </span>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { label: 'Presença hoje', node: <CountUp to={94} suffix="%" /> },
                { label: 'Média do bimestre', node: <CountUp to={8.4} decimals={1} /> },
                { label: 'Alertas de faltas', node: <CountUp to={5} /> },
              ].map((m) => (
                <div key={m.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 sm:p-4">
                  <p className="truncate text-[11px] text-[var(--text-muted)] sm:text-[12px]">{m.label}</p>
                  <p className="mt-1 font-serif text-[22px] font-semibold leading-none text-[var(--text-heading)] sm:text-[28px]">{m.node}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
              {[
                ['Ana Beatriz', true],
                ['Bruno Lima', true],
                ['Carla Souza', false],
              ].map(([n, ok]) => (
                <div key={n as string} className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5 text-[13px] last:border-0">
                  <span className="text-[var(--text-heading)]">{n}</span>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                    style={ok ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : { background: '#FDECEC', color: '#B42318' }}
                  >
                    {ok ? 'Presente' : 'Falta'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* cartão flutuante */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -bottom-8 -right-6 hidden w-64 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_20px_50px_-12px_rgba(16,24,40,0.3)] lg:block"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Boletim</p>
        <p className="mt-1 text-[13px] font-medium text-[var(--text-heading)]">3º bimestre publicado</p>
        <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">Disponível para 212 famílias</p>
      </motion.div>
    </TiltCard>
  );
}