import { AIAlert } from '../types';
import { AlertTriangle, Info, ShieldAlert, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface AIAlertPanelProps {
  alerts: AIAlert[];
}

export function AIAlertPanel({ alerts }: AIAlertPanelProps) {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="bg-bordeaux rounded-2xl border border-gold/30 overflow-hidden relative shadow-lg shadow-bordeaux/10">
      <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
      
      <div className="relative z-10 p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-white font-serif text-xl">Insight Preventivo da IA</h3>
          <span className="ml-auto bg-oxford/50 border border-gold/30 text-gold text-[10px] uppercase font-bold px-3 py-1. rounded-full tracking-widest shadow-sm">
            {alerts.length} Detectados
          </span>
        </div>

        {alerts.map((alert, index) => {
          const isCritical = alert.severity === 'critical';
          const isWarning = alert.severity === 'warning';
          
          return (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              key={alert.id}
              className={cn(
                "p-4 rounded-xl border flex items-start gap-4 shadow-sm",
                isCritical ? "bg-black/20 border-red-500/30" : 
                isWarning ? "bg-black/10 border-gold/20" : 
                "bg-black/10 border-blue-500/20"
              )}
            >
              <div className={cn(
                "p-2 rounded-full mt-0.5",
                isCritical ? "bg-red-500/20 text-red-300" : 
                isWarning ? "bg-gold/20 text-gold" : 
                "bg-blue-500/20 text-blue-300"
              )}>
                {isCritical ? <ShieldAlert className="w-5 h-5" /> : 
                 isWarning ? <AlertTriangle className="w-5 h-5" /> : 
                 <Info className="w-5 h-5" />}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className={cn(
                    "text-[10px] font-bold uppercase tracking-widest",
                    isCritical ? "text-red-300" : 
                    isWarning ? "text-gold" : 
                    "text-blue-300"
                  )}>
                    {alert.type === 'pedagogical' ? 'Alerta Pedagógico' : 
                     alert.type === 'emotional' ? 'Atenção Socioemocional' : 
                     'Risco de Evasão'}
                  </h4>
                  <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest">
                    {new Date(alert.date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <p className="text-sm text-white/90 leading-relaxed font-light">
                  {alert.message}
                </p>
                <div className="mt-4 flex gap-3">
                  <button className="text-[10px] font-bold uppercase tracking-widest bg-transparent border border-white/30 px-5 py-2 rounded-full text-white hover:bg-white/10 transition-colors">
                    Revisar
                  </button>
                  <button className="text-[10px] font-bold uppercase tracking-widest bg-oxford text-gold px-5 py-2 rounded-full border border-gold/50 hover:bg-oxford/80 transition-colors shadow-sm">
                    Acionar Equipe
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
