import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  DoorOpen,
  FileDown,
  Layers,
  Printer,
  Repeat,
  Send,
  Share2,
  Sliders,
  Sparkles,
  Users,
  Wand2,
  type LucideIcon,
} from 'lucide-react';
import { Badge, BrandHero, Button, Card, CardHeader, HeroButton, HeroEyebrow, HeroText, HeroTitle, cx, EASE } from '../../ui/kit';

interface SmartHorariosPrimeLandingProps {
  onStartGenerator: () => void;
}

/* ------------------------------------------------------------------ */
/* Conteúdo                                                            */
/* ------------------------------------------------------------------ */

const STEPS: { title: string; text: string; icon: LucideIcon }[] = [
  { title: 'Turmas e disciplinas', text: 'Turnos, duração das aulas e quantas aulas de cada disciplina por semana.', icon: Sliders },
  { title: 'Professores', text: 'Dias livres, planejamento, limite de aulas por dia e preferências.', icon: Users },
  { title: 'Gerar e publicar', text: 'A grade sai sem choques. Você ajusta o que quiser e publica para todos.', icon: Sparkles },
];

const FEATURES: { title: string; text: string; icon: LucideIcon }[] = [
  { title: 'Sem choque de horário', text: 'Nenhum professor, turma ou sala em dois lugares ao mesmo tempo.', icon: CheckCircle2 },
  { title: 'Carga equilibrada', text: 'Evita sequências longas de aulas e janelas vazias para o professor.', icon: Repeat },
  { title: 'Disciplinas espalhadas', text: 'Matemática e Português distribuídas ao longo da semana.', icon: Layers },
  { title: 'Salas e laboratórios', text: 'Reserva o espaço certo para cada aula.', icon: DoorOpen },
  { title: 'Integral e contraturno', text: 'Monta grades de período integral e aulas no outro turno.', icon: Clock },
  { title: 'Substituições', text: 'Encontra um professor livre quando alguém falta.', icon: Wand2 },
];

const EXPORTS: { label: string; icon: LucideIcon }[] = [
  { label: 'Impressão', icon: Printer },
  { label: 'PDF', icon: FileDown },
  { label: 'Planilha', icon: BookOpen },
  { label: 'Link para compartilhar', icon: Share2 },
];

/* ------------------------------------------------------------------ */
/* Componente                                                          */
/* ------------------------------------------------------------------ */

export function SmartHorariosPrimeLanding({ onStartGenerator }: SmartHorariosPrimeLandingProps) {
  const [resolvedConflict, setResolvedConflict] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [syncedUsers, setSyncedUsers] = useState(false);

  const handleResolveConflict = () => {
    setIsResolving(true);
    window.setTimeout(() => {
      setIsResolving(false);
      setResolvedConflict(true);
    }, 1200);
  };

  const handlePublishSync = () => {
    setSyncedUsers(true);
    window.setTimeout(() => setSyncedUsers(false), 4000);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Hero */}
      <BrandHero>
        <div className="grid items-center gap-8 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <HeroEyebrow icon={CalendarClock}>Montar horários</HeroEyebrow>
            <HeroTitle highlight="sem choques">A grade da escola inteira,</HeroTitle>
            <HeroText>
              Cadastre turmas, disciplinas e a disponibilidade dos professores. O Classium monta a grade, aponta conflitos e
              publica para professores e famílias de uma vez.
            </HeroText>
            <div className="mt-7 flex flex-wrap gap-2">
              <HeroButton icon={Sparkles} onClick={onStartGenerator}>
                Abrir o gerador
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </HeroButton>
            </div>
          </div>

          {/* mini grade ilustrativa */}
          <MiniTimetable />
        </div>
      </BrandHero>

      {/* Como funciona */}
      <div className="grid gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 + i * 0.08, ease: EASE }}
              className="group relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-28px_rgba(16,24,40,0.5)]"
            >
              <span aria-hidden className="absolute -right-3 -top-6 font-serif text-[110px] font-semibold leading-none text-[var(--accent-soft)]">
                {i + 1}
              </span>
              <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                <Icon className="h-5 w-5" />
              </span>
              <p className="relative mt-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Passo {i + 1}</p>
              <h3 className="relative mt-1 text-[17px] font-semibold text-[var(--text-heading)]">{s.title}</h3>
              <p className="relative mt-1.5 text-[14px] leading-relaxed text-[var(--text-muted)]">{s.text}</p>
            </motion.div>
          );
        })}
      </div>

      {/* O que o gerador cuida */}
      <Card>
        <CardHeader icon={Wand2} title="O que o gerador cuida para você" subtitle="Regras que a coordenação conferia na mão, agora automáticas" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="flex gap-3 rounded-2xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--accent)]">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-card-alt)] text-[var(--accent)]">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <p className="text-[14px] font-semibold text-[var(--text-heading)]">{f.title}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--text-muted)]">{f.text}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-5">
          <span className="mr-1 text-[13px] text-[var(--text-muted)]">Sai em:</span>
          {EXPORTS.map((e) => {
            const Icon = e.icon;
            return (
              <Badge key={e.label}>
                <Icon className="h-3.5 w-3.5" />
                {e.label}
              </Badge>
            );
          })}
        </div>
      </Card>

      {/* Demonstrações */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* conflito */}
        <Card>
          <CardHeader icon={AlertTriangle} title="Conflito encontrado" subtitle="Veja como o gerador resolve" action={<Badge>Exemplo</Badge>} />
          <AnimatePresence mode="wait" initial={false}>
            {!resolvedConflict ? (
              <motion.div
                key="conflict"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl border border-[#F5D9B0] bg-[#FEF8EF] p-4"
              >
                <div className="flex items-center justify-between gap-2 text-[14px]">
                  <span className="font-semibold text-[var(--text-heading)]">Prof. Carlos · Matemática</span>
                  <Badge tone="warning">Choque</Badge>
                </div>
                <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-body)]">
                  Está no <strong>7º Ano A</strong> e no <strong>7º Ano C</strong> na segunda-feira às 08:00.
                </p>
                <Button className="mt-4 w-full" icon={Sparkles} loading={isResolving} onClick={handleResolveConflict}>
                  {isResolving ? 'Resolvendo…' : 'Resolver automaticamente'}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="solved"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl border border-[#BFE5D2] bg-[#EEF9F3] p-4"
              >
                <p className="flex items-center gap-2 text-[14px] font-semibold text-[#0E5A38]">
                  <CheckCircle2 className="h-4 w-4" />
                  Conflito resolvido
                </p>
                <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-body)]">
                  A aula do 7º C foi para <strong>terça-feira às 09:00</strong>, um horário livre do professor e da turma.
                </p>
                <button type="button" onClick={() => setResolvedConflict(false)} className="mt-3 text-[13px] font-semibold text-[var(--accent)] hover:underline">
                  Ver de novo
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* publicar */}
        <Card>
          <CardHeader icon={Send} title="Publicar para todos" subtitle="Um clique atualiza diários, agenda e o app das famílias" action={<Badge>Exemplo</Badge>} />
          <div className="space-y-2">
            {['Gestão', 'Professores', 'Coordenação', 'Secretaria', 'Famílias'].map((who, i) => (
              <div key={who} className="flex items-center justify-between rounded-2xl border border-[var(--border)] px-4 py-2.5 text-[14px]">
                <span className="font-medium text-[var(--text-heading)]">{who}</span>
                <motion.span
                  initial={false}
                  animate={syncedUsers ? { scale: [0.6, 1.15, 1], opacity: 1 } : { scale: 1, opacity: 0.45 }}
                  transition={{ duration: 0.35, delay: syncedUsers ? i * 0.12 : 0 }}
                  className={cx('flex h-6 w-6 items-center justify-center rounded-full')}
                  style={syncedUsers ? { background: 'var(--accent)', color: 'var(--accent-fg)' } : { background: 'var(--bg-card-alt)', color: 'var(--text-muted)' }}
                >
                  <Check className="h-3.5 w-3.5" />
                </motion.span>
              </div>
            ))}
          </div>
          <Button className="mt-4 w-full" variant={syncedUsers ? 'secondary' : 'primary'} icon={syncedUsers ? CheckCircle2 : Send} onClick={handlePublishSync}>
            {syncedUsers ? 'Grade publicada' : 'Publicar grade'}
          </Button>
        </Card>
      </div>

      {/* Chamada final */}
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)] p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--accent-soft) 1px, transparent 1px), linear-gradient(to bottom, var(--accent-soft) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
            maskImage: 'radial-gradient(ellipse 60% 90% at 100% 50%, black, transparent)',
            WebkitMaskImage: 'radial-gradient(ellipse 60% 90% at 100% 50%, black, transparent)',
          }}
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-serif text-[24px] font-semibold tracking-[-0.015em] text-[var(--text-heading)]">Pronto para montar a grade?</h3>
            <p className="mt-1 max-w-xl text-[15px] text-[var(--text-muted)]">Comece pelas turmas. Dá para salvar e continuar depois.</p>
          </div>
          <Button size="lg" icon={Sparkles} onClick={onStartGenerator}>
            Abrir o gerador
          </Button>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ilustração: uma semana montando sozinha                             */
/* ------------------------------------------------------------------ */

const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
const SLOTS: (string | null)[][] = [
  ['Mat', 'Port', 'Hist', 'Mat', 'Ciên'],
  ['Port', 'Mat', 'Geo', 'Ing', 'Port'],
  ['Ciên', 'Ed.F', 'Mat', 'Port', 'Arte'],
  ['Hist', 'Ciên', 'Port', 'Geo', 'Mat'],
];

function MiniTimetable() {
  return (
    <div
      aria-hidden
      className="rounded-3xl border p-4 backdrop-blur-sm"
      style={{ borderColor: 'var(--sidebar-border)', background: 'var(--sidebar-bg-hover)' }}
    >
      <div className="mb-3 flex items-center justify-between text-[12px]" style={{ color: 'var(--sidebar-muted)' }}>
        <span className="font-semibold" style={{ color: 'var(--sidebar-fg)' }}>
          7º Ano A · manhã
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--hero-highlight)' }} />
          sem conflitos
        </span>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {DAYS.map((d) => (
          <p key={d} className="pb-1 text-center text-[11px] font-semibold" style={{ color: 'var(--sidebar-muted)' }}>
            {d}
          </p>
        ))}
        {SLOTS.flatMap((row, r) =>
          row.map((cell, c) => (
            <motion.span
              key={`${r}-${c}`}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.4 + (r * 5 + c) * 0.035, ease: EASE }}
              className="flex h-9 items-center justify-center rounded-lg text-[11px] font-semibold"
              style={
                cell === 'Mat'
                  ? { background: 'var(--sidebar-active-bg)', color: 'var(--sidebar-active-fg)' }
                  : { background: 'var(--sidebar-bg-hover)', color: 'var(--sidebar-fg)', border: '1px solid var(--sidebar-border)' }
              }
            >
              {cell}
            </motion.span>
          )),
        )}
      </div>
    </div>
  );
}