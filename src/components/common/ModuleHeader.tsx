import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { BrandHero, HeroEyebrow, HeroText } from '../ui/kit';
import { motion } from 'motion/react';

/**
 * Topo dos módulos (Pedagógico e outros) no mesmo estilo do hero da landing:
 * faixa na cor da escola, grade de caderno e título em serifa.
 */
export interface ModuleHeaderProps {
  icon?: LucideIcon;
  /** etiqueta pequena acima do título */
  moduleTag?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** mantido por compatibilidade; a cor vem do tema */
  variant?: string;
  actionButtons?: React.ReactNode;
  children?: React.ReactNode;
  [key: string]: unknown;
}

/** "CENTRAL DA GESTÃO PEDAGÓGICA • CLASSIUM" -> "Central da gestão pedagógica" */
function prettyTag(tag?: string) {
  if (!tag) return null;
  const first = tag.split(/[•|·]/)[0].trim();
  if (!first) return null;
  const isUpper = first === first.toUpperCase();
  return isUpper ? first.charAt(0) + first.slice(1).toLowerCase() : first;
}

export function ModuleHeader({ icon: Icon, moduleTag, title, description, actionButtons, children }: ModuleHeaderProps) {
  const tag = prettyTag(moduleTag);
  return (
    <BrandHero>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {tag && <HeroEyebrow icon={Icon}>{tag}</HeroEyebrow>}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 font-serif text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[40px]"
          >
            {title}
          </motion.h1>
          {description && <HeroText>{description}</HeroText>}
        </div>
        {actionButtons && <div className="flex shrink-0 flex-wrap items-center gap-2">{actionButtons}</div>}
      </div>
      {children}
    </BrandHero>
  );
}

export default ModuleHeader;