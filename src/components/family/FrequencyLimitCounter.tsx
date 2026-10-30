import React from 'react';

export interface FrequencyLimitCounterProps {
  totalAbsences: number;
  limit?: number;
  subtitle?: string;
  footerText?: string;
}

export function FrequencyLimitCounter({ 
  totalAbsences, 
  limit = 51,
  subtitle = 'Restante para possível retenção',
  footerText = 'Retenção sujeita à análise da escola, conforme as regras aplicáveis.'
}: FrequencyLimitCounterProps) {
  const remaining = Math.max(0, limit - totalAbsences);
  
  // Color determination based on totalAbsences
  let colorClass = 'text-emerald-500 stroke-emerald-500';
  if (totalAbsences >= 51) {
    colorClass = 'text-rose-600 stroke-rose-600';
  } else if (totalAbsences >= 48) {
    colorClass = 'text-rose-500 stroke-rose-500';
  } else if (totalAbsences >= 32) {
    colorClass = 'text-orange-500 stroke-orange-500';
  } else if (totalAbsences >= 16) {
    colorClass = 'text-amber-500 stroke-amber-500';
  }

  // Circular progress calculation
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  // Progress bar represents how much of the limit is used
  const percentage = Math.min(100, (totalAbsences / limit) * 100);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-between w-full h-full text-center">
      <div 
        className="relative flex items-center justify-center w-28 h-28 my-1" 
        role="img" 
        aria-label={`Faltas registradas: ${totalAbsences}. Faltas restantes até o limite de ${limit}: ${remaining}. ${subtitle}`}
      >
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
          {/* Background Circle */}
          <circle
            className="text-rose-100/80 stroke-current"
            strokeWidth="7"
            fill="transparent"
            r={radius}
            cx="50"
            cy="50"
          />
          {/* Progress Circle */}
          <circle
            className={`${colorClass} transition-all duration-500 ease-out`}
            strokeWidth="7"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            r={radius}
            cx="50"
            cy="50"
          />
        </svg>

        {/* Informação no centro: Número + (Restante para possível retenção) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-1 pointer-events-none">
          <span className="text-2xl font-black font-mono text-slate-900 leading-none">
            {remaining}
          </span>
          <span className="text-[8px] font-bold uppercase tracking-tight text-slate-700 mt-1 leading-tight max-w-[76px] text-center">
            {subtitle}
          </span>
        </div>
      </div>

      <div className="mt-1">
        <span className="text-[10px] font-mono text-slate-600 block uppercase tracking-wider font-semibold">
          Faltas Totais
        </span>
        <span className="text-lg font-bold text-slate-900 font-mono">
          {totalAbsences}
        </span>
      </div>

      {footerText && (
        <p className="text-[10px] text-slate-600 mt-2 pt-2 border-t border-rose-200/80 leading-relaxed font-medium w-full">
          {footerText}
        </p>
      )}
    </div>
  );
}
