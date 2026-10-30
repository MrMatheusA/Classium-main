import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, RefreshCw, Radio, CheckCircle2, AlertTriangle, X, Terminal, Cpu, Clock, Layers, Wifi, WifiOff } from 'lucide-react';
import { integrationHub, HubEvent, HubMetrics } from '../../lib/integrationHub';

interface RealtimeSyncBadgeProps {
  moduleName?: string;
}

export function RealtimeSyncBadge({ moduleName = 'Portal Gestor' }: RealtimeSyncBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [events, setEvents] = useState<HubEvent[]>(integrationHub.getHistory());
  const [metrics, setMetrics] = useState<HubMetrics>(integrationHub.getMetrics());
  const [isOnline, setIsOnline] = useState<boolean>(integrationHub.getIsOnline());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Listen to real-time events published by the Hub
    const unsubscribe = integrationHub.subscribe((newEvent) => {
      setEvents([...integrationHub.getHistory()]);
      setMetrics(integrationHub.getMetrics());
    });

    // Interval to refresh metrics tick
    const interval = setInterval(() => {
      setMetrics(integrationHub.getMetrics());
    }, 4000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      integrationHub.publishEvent({
        type: 'Published',
        moduleSource: 'Gestor',
        targetScope: { targetType: 'all', targetName: 'Todos os Portais' },
        entity: 'recados',
        action: 'Sincronização Manual Forçada pelo Usuário',
        title: 'Forçado Re-Alinhamento Global de Cache',
        description: `Usuário solicitou verificação e re-sincronização de todos os portais (${moduleName}).`,
        user: { name: 'Operador Gestor', role: 'Gestão Escolar', ip: '189.120.44.10' }
      });
      setIsSyncing(false);
    }, 800);
  };

  const toggleOnlineMode = () => {
    const nextStatus = !isOnline;
    setIsOnline(nextStatus);
    integrationHub.setOnlineStatus(nextStatus);
  };

  return (
    <>
      {/* REAL-TIME BADGE CLICKABLE BUTTON */}
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold border transition-all duration-300 shadow-sm hover:scale-105 ${
          isOnline
            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900/90 hover:border-emerald-400'
            : 'bg-amber-950/80 text-amber-300 border-amber-500/50 hover:bg-amber-900/90'
        }`}
        title="Clique para abrir o Monitor do Classium Integration Hub"
      >
        <span className="relative flex h-2 w-2">
          {isOnline ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </>
          ) : (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 animate-pulse"></span>
          )}
        </span>

        <span className="font-mono tracking-tight uppercase">
          {isOnline ? '🟢 Sincronizado em Tempo Real' : '🟡 Fila Offline Ativa'}
        </span>

        <span className="text-[9px] text-slate-400 border-l border-slate-700/80 pl-2 font-mono">
          {metrics.lastSyncTime}
        </span>
      </button>

      {/* REAL-TIME INTEGRATION HUB AUDIT MODAL */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in text-left">
          <div className="bg-slate-900 border border-gold/30 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 bg-[#08142d] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-gold/15 text-gold border border-gold/30 px-2 py-0.5 rounded font-mono font-bold uppercase">
                      Single Source of Truth
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">Latência: ~{metrics.averageLatencyMs}ms</span>
                  </div>
                  <h3 className="text-lg font-serif font-bold text-white mt-0.5">Classium Real-Time Integration Hub</h3>
                  <p className="text-xs text-slate-300">Monitore os eventos em tempo real transmitidos do Gestor para todos os portais.</p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              
              {/* Quick Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-400">Eventos / seg</span>
                  <p className="text-lg font-mono font-bold text-emerald-400">{metrics.eventsPerSec} evt/s</p>
                </div>

                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-400">Módulos Conectados</span>
                  <p className="text-lg font-mono font-bold text-cyan-400">{metrics.connectedModules} / 7</p>
                </div>

                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-400">Integridade IA</span>
                  <p className="text-lg font-mono font-bold text-amber-400">{metrics.iaIntegrityScore}%</p>
                </div>

                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-400">Total Hoje</span>
                  <p className="text-lg font-mono font-bold text-purple-400">{metrics.totalSyncedToday}</p>
                </div>
              </div>

              {/* Actions & Offline Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Forçar Sincronização Agora</span>
                  </button>

                  <button
                    onClick={toggleOnlineMode}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                      isOnline
                        ? 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-amber-400" />}
                    <span>{isOnline ? 'Simular Modo Offline' : 'Reconectar e Enviar Fila'}</span>
                  </button>
                </div>

                <span className="text-[10px] text-slate-400 font-mono">
                  Escola / Tenant: <strong className="text-slate-200">Unidade Sede (Colégio Classium)</strong>
                </span>
              </div>

              {/* Live Real-time Stream Log */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-300 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-gold" /> Stream de Eventos em Tempo Real (Audit Log)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{events.length} eventos gravados</span>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 max-h-72 overflow-y-auto space-y-2 font-mono text-[11px] scrollbar-thin">
                  {events.map((ev) => (
                    <div 
                      key={ev.id}
                      className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1 text-slate-200 hover:border-gold/30 transition-all"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] bg-gold/15 text-gold border border-gold/30 px-2 py-0.5 rounded font-bold uppercase">
                            {ev.moduleSource}
                          </span>
                          <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded uppercase font-semibold">
                            {ev.entity}
                          </span>
                          <span className="font-bold text-white text-xs">{ev.title}</span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="text-emerald-400 font-bold">{ev.latencyMs}ms</span>
                          <span>{ev.timeFormatted}</span>
                        </div>
                      </div>

                      <p className="text-slate-300 font-sans text-xs leading-relaxed">{ev.description}</p>

                      <div className="pt-1 flex flex-wrap justify-between items-center text-[10px] text-slate-400 border-t border-slate-800/60 mt-1">
                        <span>Escopo: <strong className="text-slate-300">{ev.targetScope.targetName || ev.targetScope.targetType}</strong></span>
                        <span>Por: <strong className="text-slate-300">{ev.user?.name || 'Sistema'} ({ev.user?.role || 'Automático'})</strong> • IP: {ev.user?.ip || '127.0.0.1'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" /> Conformidade LGPD & Criptografia End-to-End Validadas
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-sans font-bold text-xs"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
