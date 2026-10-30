import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Rodapé discreto de "dados atualizados".
 * Os textos técnicos antigos (Supabase, tenant...) não aparecem mais para o usuário;
 * as props continuam aceitas para não quebrar quem já usa.
 */
export interface SyncStatusBarProps {
  text?: string;
  badgeText?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
  [key: string]: unknown;
}

export function SyncStatusBar({ onRefresh, isLoading = false, className = '' }: SyncStatusBarProps) {
  const [updatedAt, setUpdatedAt] = useState(() => new Date());

  // quando termina de carregar, marca o horário
  useEffect(() => {
    if (!isLoading) setUpdatedAt(new Date());
  }, [isLoading]);

  const time = updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 text-[13px] ${className}`}>
      <span className="flex items-center gap-2 text-[var(--text-muted)]">
        <span className="relative flex h-2 w-2">
          {!isLoading && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
          <span className={`relative inline-flex h-2 w-2 rounded-full ${isLoading ? 'bg-amber-500' : 'bg-emerald-500'}`} />
        </span>
        {isLoading ? 'Atualizando…' : `Dados atualizados às ${time}`}
      </span>
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--accent-soft)] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      )}
    </div>
  );
}

export default SyncStatusBar;