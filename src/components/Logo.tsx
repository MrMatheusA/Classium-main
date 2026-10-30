import React from 'react';
import { BrandShield } from './BrandShield';

type LogoVariant =
  | 'professor'
  | 'portal'
  | 'gestor'
  | 'family'
  | 'funcionarios'
  | 'pedagogo'
  | 'secretaria'
  | 'disciplinario'
  | 'equipe';

interface LogoProps {
  className?: string;
  showSlogan?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: LogoVariant;
  /** Superfície onde o logo aparece. 'dark' = texto claro (padrão antigo); 'light' = texto escuro. */
  surface?: 'dark' | 'light';
  /** Animação do escudo. Desligada por padrão: marca parada passa mais seriedade. */
  animated?: boolean;
}

const SIZES = {
  sm: { gap: 'gap-2', icon: 'w-7 h-7', name: 'text-[17px]', title: 'text-[10px]', slogan: 'text-[10px]', divider: 'h-3' },
  md: { gap: 'gap-2.5', icon: 'w-9 h-9', name: 'text-xl', title: 'text-[11px]', slogan: 'text-[11px]', divider: 'h-3.5' },
  lg: { gap: 'gap-3', icon: 'w-12 h-12', name: 'text-[28px]', title: 'text-xs', slogan: 'text-xs', divider: 'h-4' },
  xl: { gap: 'gap-4', icon: 'w-16 h-16', name: 'text-4xl md:text-5xl', title: 'text-sm', slogan: 'text-sm', divider: 'h-6' },
} as const;

// Título do portal (null = só a marca) e uma linha descritiva curta
const BRAND: Record<LogoVariant, { title: string | null; slogan: string }> = {
  portal: { title: null, slogan: 'Gestão escolar conectada' },
  gestor: { title: 'Gestão', slogan: 'Indicadores e operação da escola' },
  family: { title: 'Família', slogan: 'A vida escolar do seu filho, em dia' },
  funcionarios: { title: 'Funcionários', slogan: 'Operação e atendimento' },
  professor: { title: 'Professor', slogan: 'Diário, notas e turmas' },
  pedagogo: { title: 'Pedagógico', slogan: 'Acompanhamento pedagógico' },
  secretaria: { title: 'Secretaria', slogan: 'Matrículas, documentos e prontuários' },
  disciplinario: { title: 'Disciplinar', slogan: 'Ocorrências e convivência' },
  equipe: { title: 'Equipe', slogan: 'Portal dos colaboradores' },
};

export function Logo({
  className = '',
  showSlogan = false,
  size = 'md',
  variant = 'portal',
  surface = 'dark',
  animated = false,
}: LogoProps) {
  const s = SIZES[size];
  const brand = BRAND[variant] ?? BRAND.portal;

  const nameColor = surface === 'dark' ? 'text-white' : 'text-[#0F1B2D]';
  const mutedColor = surface === 'dark' ? 'text-white/55' : 'text-[#5B6472]';
  const dividerColor = surface === 'dark' ? 'bg-white/20' : 'bg-[#0F1B2D]/15';

  return (
    <div className={`flex items-center ${s.gap} ${className}`}>
      <div className={`relative ${s.icon} shrink-0`}>
        <BrandShield size="100%" animated={animated} />
      </div>

      <div className="flex flex-col text-left leading-none">
        <div className="flex items-center gap-2">
          <span className={`font-serif font-semibold tracking-[-0.01em] ${nameColor} ${s.name}`}>
            Classium
          </span>
          {brand.title && (
            <>
              <span aria-hidden className={`w-px ${s.divider} ${dividerColor}`} />
              <span className={`font-sans font-medium uppercase tracking-[0.16em] ${mutedColor} ${s.title}`}>
                {brand.title}
              </span>
            </>
          )}
        </div>
        {showSlogan && (
          <p className={`mt-1.5 font-sans ${mutedColor} ${s.slogan}`}>{brand.slogan}</p>
        )}
      </div>
    </div>
  );
}