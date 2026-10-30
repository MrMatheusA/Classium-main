import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CornerDownLeft, Search, X } from 'lucide-react';
import { usePortalNav, type TabId } from '../../navigation/portalNav';

/*
 * Busca de módulos (Ctrl+K / ⌘K).
 * Fica montada uma vez no Header; qualquer botão abre com openCommandPalette().
 */

const OPEN_EVENT = 'classium:open-palette';

export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

const EASE = [0.22, 1, 0.36, 1] as const;

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export function CommandPalette() {
  const nav = usePortalNav();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // atalho de teclado + evento para abrir de qualquer lugar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setCursor(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    const all = nav.sections.flatMap((s) => s.items.map((item) => ({ item, section: s.title })));
    if (!q) return all;
    return all
      .map((r) => {
        const label = normalize(r.item.label);
        const score = label.startsWith(q)
          ? 4
          : label.includes(q)
            ? 3
            : normalize(r.section).includes(q)
              ? 2
              : normalize(r.item.description || '').includes(q)
                ? 1
                : 0;
        return { ...r, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [query, nav.sections]);

  useEffect(() => setCursor(0), [query]);

  // mantém o item escolhido visível ao usar as setas
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const pick = (id: TabId) => {
    nav.go(id);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter' && results[cursor]) {
      pick(results[cursor].item.id);
    }
  };

  // agrupa por seção quando não há busca
  let lastSection = '';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-start justify-center p-4 pt-[10vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button aria-label="Fechar" onClick={() => setOpen(false)} className="absolute inset-0 cursor-default bg-[#0B1220]/45 backdrop-blur-sm" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Buscar módulo"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: EASE }}
            onKeyDown={onKeyDown}
            className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[0_40px_100px_-30px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-5">
              <Search className="h-5 w-5 shrink-0 text-[var(--accent)]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Buscar em ${nav.portalLabel}…`}
                className="h-14 flex-1 bg-transparent text-[15px] text-[var(--text-heading)] outline-none placeholder:text-[var(--text-muted)]"
                role="combobox"
                aria-expanded="true"
                aria-controls="palette-results"
                aria-activedescendant={results[cursor] ? `palette-${String(results[cursor].item.id)}` : undefined}
              />
              <button onClick={() => setOpen(false)} aria-label="Fechar" className="rounded-full p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-card-alt)]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <ul id="palette-results" ref={listRef} role="listbox" className="max-h-[56vh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <li className="px-4 py-10 text-center text-[14px] text-[var(--text-muted)]">Nada encontrado com esse nome.</li>
              ) : (
                results.map(({ item, section }, i) => {
                  const active = i === cursor;
                  const isOpen = item.id === nav.activeId;
                  const Icon = item.icon;
                  const showSection = !query && section !== lastSection;
                  lastSection = section;
                  return (
                    <React.Fragment key={String(item.id)}>
                      {showSection && (
                        <li role="presentation" className="px-3.5 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                          {section}
                        </li>
                      )}
                      <li role="option" id={`palette-${String(item.id)}`} aria-selected={active} data-index={i}>
                        <button
                          type="button"
                          onMouseMove={() => setCursor(i)}
                          onClick={() => pick(item.id)}
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors"
                          style={active ? { background: 'var(--accent-soft)' } : undefined}
                        >
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                            style={active ? { background: 'var(--accent)', color: 'var(--accent-fg)' } : { background: 'var(--bg-card-alt)', color: 'var(--text-muted)' }}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="text-[14px] font-semibold text-[var(--text-heading)]">{item.label}</span>
                              {query && <span className="text-[12px] text-[var(--text-muted)]">{section}</span>}
                              {isOpen && <span className="text-[11px] font-semibold text-[var(--accent)]">aberto</span>}
                            </span>
                            {item.description && <span className="block truncate text-[13px] text-[var(--text-muted)]">{item.description}</span>}
                          </span>
                          {active && <CornerDownLeft className="h-4 w-4 shrink-0 text-[var(--accent)]" />}
                        </button>
                      </li>
                    </React.Fragment>
                  );
                })
              )}
            </ul>

            <div className="flex items-center gap-4 border-t border-[var(--border)] px-5 py-2.5 text-[12px] text-[var(--text-muted)]">
              <span>↑ ↓ para escolher</span>
              <span>Enter para abrir</span>
              <span>Esc para fechar</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}