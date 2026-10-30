import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Palette } from 'lucide-react';
import { BACKGROUNDS, SIDEBAR_COLORS } from './panelThemes';
import { usePanelTheme } from './PanelThemeContext';

/**
 * Botão de paleta para o Header. Abre um painel com:
 *  - cor da barra lateral
 *  - fundo da área de trabalho
 * A mudança é aplicada na hora e fica salva para o usuário.
 */
export function ThemePicker({ className = '' }: { className?: string }) {
  const { sidebar, background, setSidebar, setBackground, isCustom, reset } = usePanelTheme();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // fecha ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Cores do painel"
        title="Cores do painel"
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-black/[0.05] hover:text-[var(--text-heading)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        <Palette className="h-[18px] w-[18px]" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Cores do painel"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-12 z-50 w-[320px] origin-top-right rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_20px_50px_-12px_rgba(16,24,40,0.25)]"
          >
            <p className="text-[13px] font-semibold text-[var(--text-heading)]">Cor da barra lateral</p>
            <div role="radiogroup" aria-label="Cor da barra lateral" className="mt-3 grid grid-cols-5 gap-2">
              {SIDEBAR_COLORS.map((c) => {
                const selected = c.id === sidebar;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setSidebar(c.id)}
                    title={`${c.label} · ${c.hint}`}
                    className="group flex flex-col items-center gap-1.5 focus-visible:outline-none"
                  >
                    <span
                      className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-transform group-hover:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-offset-2 ${
                        selected ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-card)]' : ''
                      }`}
                      style={{ backgroundColor: c.sidebarBg, ['--tw-ring-color' as string]: c.sidebarBg }}
                    >
                      {selected && <Check className="h-4 w-4" style={{ color: c.sidebarFg }} strokeWidth={2.5} />}
                    </span>
                    <span
                      className={`text-[11px] ${selected ? 'font-semibold text-[var(--text-heading)]' : 'text-[var(--text-muted)]'}`}
                    >
                      {c.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="my-4 h-px bg-[var(--border)]" />

            <p className="text-[13px] font-semibold text-[var(--text-heading)]">Fundo</p>
            <div role="radiogroup" aria-label="Fundo" className="mt-3 grid grid-cols-2 gap-2">
              {BACKGROUNDS.map((b) => {
                const selected = b.id === background;
                return (
                  <button
                    key={b.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setBackground(b.id)}
                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                      selected
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-medium text-[var(--text-heading)]'
                        : 'border-[var(--border)] text-[var(--text-body)] hover:bg-[var(--bg-card-alt)]'
                    }`}
                  >
                    <span
                      className="h-7 w-7 shrink-0 rounded-md border border-black/10"
                      style={{ backgroundColor: b.app }}
                    />
                    {b.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-start justify-between gap-3">
              <p className="text-[12px] leading-snug text-[var(--text-muted)]">
                A escolha vale só para você e fica salva neste navegador.
              </p>
              {isCustom && (
                <button
                  type="button"
                  onClick={reset}
                  className="shrink-0 text-[12px] font-medium text-[var(--accent)] hover:underline"
                >
                  Usar cor padrão
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}