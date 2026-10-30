import { Occurrence } from '../types';
import { CheckCircle2, AlertOctagon, HeartPulse, Bus } from 'lucide-react';
import { cn } from '../lib/utils';

interface OccurrencesListProps {
  occurrences: Occurrence[];
}

export function OccurrencesList({ occurrences }: OccurrencesListProps) {
  return (
    <div className="bg-dark-panel rounded-2xl border border-gold/10 overflow-hidden flex-1 flex flex-col shadow-lg shadow-black/20">
      <div className="px-6 py-5 border-b border-gold/10 flex items-center justify-between">
        <h4 className="text-gold font-serif flex items-center justify-between w-full">
          <span>Comportamento & Rotina</span>
          <span className="text-[10px] opacity-60 uppercase tracking-widest text-gold">Histórico</span>
        </h4>
      </div>
      
      <div className="p-6 flex-1 overflow-y-auto space-y-6">
        {occurrences.map((occ, idx) => {
          let Icon = AlertOctagon;
          let indicatorColor = 'bg-gray-500';
          let textColor = 'text-gray-400';
          
          if (occ.type === 'positive') {
            Icon = CheckCircle2;
            indicatorColor = 'bg-green-500';
            textColor = 'text-green-400';
          } else if (occ.type === 'negative') {
            Icon = AlertOctagon;
            indicatorColor = 'bg-bordeaux';
            textColor = 'text-red-400';
          } else if (occ.type === 'health') {
            Icon = HeartPulse;
            indicatorColor = 'bg-blue-400';
            textColor = 'text-blue-400';
          } else if (occ.type === 'transport') {
            Icon = Bus;
            indicatorColor = 'bg-yellow-500';
            textColor = 'text-yellow-400';
          }

          return (
            <div key={occ.id} className="flex gap-4 group">
              <div className="flex flex-col items-center">
                <div className={cn("w-1 h-full min-h-[3rem] rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]", indicatorColor, 
                  occ.type === 'positive' && 'shadow-green-500/50',
                  occ.type === 'negative' && 'shadow-bordeaux/50',
                  occ.type === 'health' && 'shadow-blue-400/50',
                  occ.type === 'transport' && 'shadow-yellow-500/50'
                )}></div>
              </div>
              
              <div className="flex-1 pb-2">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-xs font-bold text-ice">{occ.title}</p>
                </div>
                <p className="text-[11px] text-ice/60 mb-2 leading-relaxed">
                  {occ.description}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-[9px] text-gold uppercase tracking-widest">
                    {occ.reporter} • {new Date(occ.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às {occ.time}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
