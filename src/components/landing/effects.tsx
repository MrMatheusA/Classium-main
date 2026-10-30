import React, { useEffect, useRef } from 'react';
import {
  motion,
  animate,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type Variants,
} from 'motion/react';
import Lenis from 'lenis';

/* Curva usada em todas as entradas: rápida no início, assenta devagar */
export const EASE = [0.22, 1, 0.36, 1] as const;

/* ------------------------------------------------------------------ */
/* Rolagem suave (Lenis)                                               */
/* ------------------------------------------------------------------ */
export function useLenis() {
  const lenisRef = useRef<Lenis | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenisRef.current = lenis;

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reduce]);

  return lenisRef;
}

/* ------------------------------------------------------------------ */
/* Entrada ao rolar                                                    */
/* ------------------------------------------------------------------ */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

export function Stagger({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={staggerParent}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={staggerChild}>
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Título palavra por palavra                                          */
/* ------------------------------------------------------------------ */
export function WordsReveal({
  text,
  delay = 0,
  wordClassName = '',
}: {
  text: string;
  delay?: number;
  wordClassName?: string;
}) {
  const words = text.split(' ');
  return (
    <>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span
            className={`inline-block ${wordClassName}`}
            initial={{ y: '110%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            transition={{ duration: 0.9, delay: delay + i * 0.07, ease: EASE }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 && '\u00A0'}
        </span>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Número que conta quando aparece                                     */
/* ------------------------------------------------------------------ */
export function CountUp({
  to,
  decimals = 0,
  prefix = '',
  suffix = '',
  duration = 1.8,
  className = '',
}: {
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();

  const format = (v: number) =>
    `${prefix}${v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;

  useEffect(() => {
    if (!inView || !ref.current) return;
    if (reduce) {
      ref.current.textContent = format(to);
      return;
    }
    const controls = animate(0, to, {
      duration,
      ease: EASE,
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = format(v);
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {format(0)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Faixa infinita                                                      */
/* ------------------------------------------------------------------ */
export function Marquee({
  children,
  duration = 40,
  className = '',
}: {
  children: React.ReactNode;
  duration?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
      }}
    >
      <motion.div
        className="flex w-max"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration, ease: 'linear', repeat: Infinity }}
      >
        <div className="flex shrink-0">{children}</div>
        <div className="flex shrink-0" aria-hidden>
          {children}
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card com luz que segue o mouse (usa as cores do tema)               */
/* ------------------------------------------------------------------ */
export function SpotlightCard({
  children,
  className = '',
  glow = 'var(--accent-soft)',
}: {
  children: React.ReactNode;
  className?: string;
  glow?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--x', `${e.clientX - r.left}px`);
    el.style.setProperty('--y', `${e.clientY - r.top}px`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={`group relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-[box-shadow,transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[0_18px_40px_-18px_rgba(16,24,40,0.22)] ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `radial-gradient(420px circle at var(--x, 50%) var(--y, 50%), ${glow}, transparent 60%)` }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Inclinação 3D suave                                                  */
/* ------------------------------------------------------------------ */
export function TiltCard({
  children,
  className = '',
  max = 6,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
}) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const spring = { stiffness: 140, damping: 18, mass: 0.6 };
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [max, -max]), spring);
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-max, max]), spring);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <div className={className} style={{ perspective: 1400 }}>
      <motion.div
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fundo do hero na cor da marca: grade, luzes e feixes               */
/* Usa --sidebar-* do tema, então funciona nas 5 cores (até no amarelo) */
/* ------------------------------------------------------------------ */
export function HeroPattern() {
  const beams = [12, 30, 55, 74, 90];

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* grade quadriculada, como folha de caderno */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--sidebar-border) 1px, transparent 1px), linear-gradient(to bottom, var(--sidebar-border) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 70% 40%, black 20%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 70% 40%, black 20%, transparent 80%)',
        }}
      />

      {/* luzes suaves */}
      <motion.div
        className="absolute rounded-full blur-[100px]"
        style={{ right: '-6%', top: '-20%', width: 620, height: 620, background: 'radial-gradient(closest-side, var(--sidebar-active-bg), transparent)', opacity: 0.16 }}
        animate={{ x: [0, -40, 0], y: [0, 30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute rounded-full blur-[110px]"
        style={{ left: '-10%', bottom: '-30%', width: 560, height: 560, background: 'radial-gradient(closest-side, var(--accent), transparent)', opacity: 0.55 }}
        animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* feixes que descem */}
      {beams.map((left, i) => (
        <div key={left} className="absolute top-0 h-full w-px" style={{ left: `${left}%`, background: 'var(--sidebar-border)' }}>
          <motion.div
            className="absolute left-0 h-32 w-px"
            style={{ background: 'linear-gradient(to bottom, transparent, var(--hero-highlight), transparent)' }}
            initial={{ top: '-20%' }}
            animate={{ top: '120%' }}
            transition={{ duration: 6 + (i % 3) * 1.5, delay: i * 1.2, repeat: Infinity, repeatDelay: 2.5, ease: 'linear' }}
          />
        </div>
      ))}
    </div>
  );
}