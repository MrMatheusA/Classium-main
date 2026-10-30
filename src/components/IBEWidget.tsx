import { motion } from 'motion/react';
import { Info } from 'lucide-react';

interface IBEWidgetProps {
  score: number;
}

export function IBEWidget({ score }: IBEWidgetProps) {
  // Determine color based on score
  let colorClass = 'text-oxford';
  let strokeClass = 'stroke-oxford';
  let statusText = 'Excelente';
  let badgeClass = 'bg-oxford text-gold';
  
  if (score < 60) {
    colorClass = 'text-bordeaux';
    strokeClass = 'stroke-bordeaux';
    statusText = 'Atenção Necessária';
    badgeClass = 'bg-bordeaux text-white';
  } else if (score < 80) {
    colorClass = 'text-yellow-700';
    strokeClass = 'stroke-yellow-600';
    statusText = 'Estável';
    badgeClass = 'bg-yellow-600/20 text-yellow-700';
  }

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-ice rounded-2xl p-6 shadow-lg shadow-black/20 border-t-4 border-gold flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-serif text-lg font-bold text-oxford">Índice de Bem-Estar</h3>
          <Info className="w-4 h-4 text-oxford/40" />
        </div>
        <p className="text-xs text-oxford/70 leading-snug italic max-w-[180px]">
          Cálculo preditivo baseado em frequência, notas e comportamento.
        </p>
        <div className={`mt-4 inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${badgeClass}`}>
          Status: {statusText}
        </div>
      </div>

      <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
        {/* Background Circle */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="6"
            className="text-oxford/10"
          />
          {/* Progress Circle */}
          <motion.circle
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            className={strokeClass}
            style={{ strokeDasharray: circumference }}
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className={`text-2xl font-serif font-bold ${colorClass}`}>{score}</span>
        </div>
      </div>
    </div>
  );
}
