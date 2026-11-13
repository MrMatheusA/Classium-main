import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, CalendarCheck, HandHeart, Megaphone, NotebookPen, type LucideIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { EASE, cx } from '../ui/kit';
import { fmtRelativo, mensagemErro, useCarregar, useRealtime, type Aviso } from '../../services/escolaEscuta/api';

/* =====================================================================
 * Sino de avisos do Escola Escuta (Gestor, Docente e Família).
 *   <AvisosSino onAbrir={(modulo, refId) => navegar(modulo, refId)} />
 * Mostra só os avisos do usuário logado (o banco filtra).
 * ===================================================================== */

const MODULO: Record<Aviso['modulo'], { label: string; icon: LucideIcon }> = {
  mural: { label: 'Mural', icon: Megaphone },
  agenda: { label: 'Agenda Família', icon: CalendarCheck },
  diario: { label: 'Agenda Diária', icon: NotebookPen },
  participa: { label: 'Participa', icon: HandHeart },
};

export function AvisosSino({ onAbrir }: { onAbrir?: (modulo: Aviso['modulo'], refId: string | null) => void }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const avisos = useCarregar<Aviso[]>(
    async () => {
      const { data, error } = await supabase.from('ee_avisos').select('*').order('created_at', { ascending: false }).limit(40);
      return error ? { error: mensagemErro(error) } : { data: (data as Aviso[]) || [] };
    },
    [],
    [],
  );
  useRealtime(['ee_avisos'], () => avisos.recarregar(true));
  const naoLidos = avisos.data.filter((a) => !a.lido_em).length;

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setAberto(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', esc);
    };
  }, [aberto]);

  const marcarTodos = async () => {
    const ids = avisos.data.filter((a) => !a.lido_em).map((a) => a.id);
    if (!ids.length) return;
    avisos.setData(avisos.data.map((a) => (a.lido_em ? a : { ...a, lido_em: new Date().toISOString() })));
    await supabase.from('ee_avisos').update({ lido_em: new Date().toISOString() }).in('id', ids);
  };

  const abrir = async (a: Aviso) => {
    setAberto(false);
    if (!a.lido_em) {
      avisos.setData(avisos.data.map((x) => (x.id === a.id ? { ...x, lido_em: new Date().toISOString() } : x)));
      await supabase.from('ee_avisos').update({ lido_em: new Date().toISOString() }).eq('id', a.id);
    }
    onAbrir?.(a.modulo, a.ref_id);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label={naoLidos ? `Avisos: ${naoLidos} não lidos` : 'Avisos'}
        aria-expanded={aberto}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-body)] transition-colors hover:bg-[var(--bg-card-alt)]"
      >
        <Bell className="h-[18px] w-[18px]" />
        {naoLidos > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#D92D20] px-1 text-[10px] font-semibold tabular-nums text-white">
            {naoLidos > 9 ? '9+' : naoLidos}
          </span>
        )}
      </button>
      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: EASE }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 z-50 mt-2 w-[340px] overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--bg-card)] text-left shadow-[0_24px_60px_-28px_rgba(16,24,40,0.45)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <p className="text-[14px] font-semibold text-[var(--text-heading)]">Avisos</p>
              {naoLidos > 0 && (
                <button type="button" onClick={marcarTodos} className="text-[12px] font-medium text-[var(--accent)] hover:underline">
                  Marcar todos como lidos
                </button>
              )}
            </div>
            <ul className="max-h-[420px] overflow-y-auto">
              {avisos.data.length === 0 && <li className="px-4 py-8 text-center text-[13px] text-[var(--text-muted)]">Nenhum aviso por enquanto.</li>}
              {avisos.data.map((a) => {
                const m = MODULO[a.modulo] || MODULO.mural;
                const Icon = m.icon;
                return (
                  <li key={a.id}>
                    <button type="button" onClick={() => abrir(a)} className={cx('flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--bg-card-alt)]', !a.lido_em && 'bg-[var(--accent-soft)]')}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-card-alt)] text-[var(--text-muted)]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-[var(--text-heading)]">{a.titulo}</span>
                        {a.corpo && <span className="line-clamp-2 block text-[12px] text-[var(--text-muted)]">{a.corpo}</span>}
                        <span className="mt-0.5 block text-[11px] text-[var(--text-muted)]">
                          {m.label} · {fmtRelativo(a.created_at)}
                        </span>
                      </span>
                      {!a.lido_em && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" aria-label="Não lido" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
