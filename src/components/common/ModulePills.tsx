import React from 'react';
import { motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';

/** Abas em pílula dos módulos (mesmo visual do PillNav do kit) */
export interface ModuleTabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  badge?: React.ReactNode | null;
  /** mantido por compatibilidade; a cor vem do tema */
  badgeColor?: string;
  disabled?: boolean;
}

export interface ModulePillsProps {
  tabs: ModuleTabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  /** nome lido por leitores de tela */
  label?: string;
}

let counter = 0;

export function ModulePills({ tabs, activeTab, onChange, className = '', label = 'Seções do módulo' }: ModulePillsProps) {
  // id estável por instância para a animação da pílula
  const [layoutId] = React.useState(() => `module-pill-${++counter}`);

  return (
    <nav aria-label={label} className={`-mx-1 overflow-x-auto pb-1 ${className}`}>
      <div className="flex w-max gap-1 rounded-[22px] bg-[var(--bg-card-alt)] p-1">
        {tabs.map(({ id, label: text, icon: Icon, badge, disabled }) => {
          const active = id === activeTab;
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(id)}
              aria-current={active ? 'page' : undefined}
              className={[
                'relative flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-colors disabled:opacity-50',
                active ? '' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-heading)]',
              ].join(' ')}
              style={active ? { color: 'var(--accent-fg)' } : undefined}
            >
              {active && (
                <motion.span
                  layoutId={layoutId}
                  className="absolute inset-0 rounded-full shadow-[0_8px_18px_-12px_rgba(16,24,40,0.6)]"
                  style={{ background: 'var(--accent)' }}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative flex items-center gap-2">
                {Icon && <Icon className="h-4 w-4" />}
                {text}
                {badge !== undefined && badge !== null && badge !== '' && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={active ? { background: 'rgba(255,255,255,0.22)' } : { background: 'var(--accent-soft)', color: 'var(--accent)' }}
                  >
                    {badge}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default ModulePills;