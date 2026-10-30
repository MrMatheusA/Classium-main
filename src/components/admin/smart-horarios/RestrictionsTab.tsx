import React, { useState } from 'react';
import { SmartConstraint, SmartAlert } from './types';
import { ShieldCheck, AlertTriangle, Info, Plus, Trash2, CheckCircle, Sparkles, AlertOctagon } from 'lucide-react';

interface RestrictionsTabProps {
  constraints: SmartConstraint[];
  setConstraints: React.Dispatch<React.SetStateAction<SmartConstraint[]>>;
  alerts: SmartAlert[];
  setAlerts: React.Dispatch<React.SetStateAction<SmartAlert[]>>;
}

export function RestrictionsTab({
  constraints,
  setConstraints,
  alerts,
  setAlerts,
}: RestrictionsTabProps) {
  const [newConstraint, setNewConstraint] = useState<Partial<SmartConstraint>>({ title: '', description: '', type: 'general' });
  const [isAdding, setIsAdding] = useState(false);

  const handleAddConstraint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConstraint.title || !newConstraint.description) return;
    setConstraints(prev => [...prev, {
      id: `ct-${Date.now()}`,
      title: newConstraint.title!,
      description: newConstraint.description!,
      type: newConstraint.type as any || 'general',
      active: true
    }]);
    setNewConstraint({ title: '', description: '', type: 'general' });
    setIsAdding(false);
  };

  const toggleConstraintActive = (id: string) => {
    setConstraints(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c));
  };

  const deleteConstraint = (id: string) => {
    setConstraints(prev => prev.filter(c => c.id !== id));
  };

  const getAlertStyleClasses = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-950/20 border-green-900/40 text-green-400';
      case 'warning': return 'bg-yellow-950/20 border-yellow-900/40 text-yellow-400';
      case 'danger': return 'bg-red-950/20 border-red-900/40 text-red-400';
      case 'info': return 'bg-blue-950/20 border-blue-900/40 text-blue-400';
      default: return 'bg-slate-900/50 border-slate-850 text-slate-300';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4.5 h-4.5 text-green-400 shrink-0 mt-0.5" />;
      case 'warning': return <AlertTriangle className="w-4.5 h-4.5 text-yellow-400 shrink-0 mt-0.5" />;
      case 'danger': return <AlertOctagon className="w-4.5 h-4.5 text-red-400 shrink-0 mt-0.5" />;
      default: return <Info className="w-4.5 h-4.5 text-blue-400 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Constraints configuration panel (Left) */}
      <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800 p-5 rounded-3xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-850">
          <div className="text-left">
            <h3 className="font-serif text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4.5 h-4.5 text-blue-400" /> Restrições Ativas (Coração da IA)
            </h3>
            <p className="text-[11px] text-slate-500">Defina regras que a IA irá respeitar estritamente ao gerar a grade.</p>
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-[10px] font-bold border border-slate-850 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-[#D4AF37]" /> Nova Restrição
          </button>
        </div>

        {/* Adding form */}
        {isAdding && (
          <form onSubmit={handleAddConstraint} className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-3 text-xs text-left animate-fade-in">
            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider font-mono">Configurar Regra de Validação</span>
            
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase">Título da Restrição</label>
              <input
                type="text"
                required
                placeholder="Ex: Professor Max - 4 aulas seguidas"
                value={newConstraint.title}
                onChange={(e) => setNewConstraint({ ...newConstraint, title: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Categoria da Regra</label>
                <select
                  value={newConstraint.type}
                  onChange={(e) => setNewConstraint({ ...newConstraint, type: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  <option value="general">Geral / Regra de Negócio</option>
                  <option value="teacher">Por Docente</option>
                  <option value="class">Por Turma</option>
                  <option value="room">Por Sala Física</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Status Inicial</label>
                <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-center text-green-400 font-semibold">
                  ✓ Ativa de Imediato
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase">Descrição da Condição</label>
              <textarea
                required
                placeholder="Descreva minuciosamente o que a IA deve respeitar..."
                value={newConstraint.description}
                onChange={(e) => setNewConstraint({ ...newConstraint, description: e.target.value })}
                rows={2}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 text-[10px]">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md"
              >
                Ativar Restrição
              </button>
            </div>
          </form>
        )}

        {/* List of active constraints */}
        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 text-left">
          {constraints.map(c => (
            <div
              key={c.id}
              className={`p-4 rounded-2xl border flex items-start justify-between gap-3 text-xs transition-all ${
                c.active
                  ? 'bg-slate-950/60 border-slate-850 text-slate-300'
                  : 'bg-slate-950/20 border-slate-900 text-slate-600'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${c.active ? 'bg-blue-400' : 'bg-slate-700'}`}></span>
                  <h4 className={`font-semibold ${c.active ? 'text-white' : 'text-slate-600'}`}>{c.title}</h4>
                  <span className="text-[8px] uppercase tracking-wider font-mono font-bold bg-slate-900 px-1.5 py-0.5 rounded text-slate-500 border border-slate-850">
                    {c.type}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">{c.description}</p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleConstraintActive(c.id)}
                  className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase border transition-all ${
                    c.active
                      ? 'bg-blue-950 border-blue-900 text-blue-400'
                      : 'bg-slate-900 border-slate-850 text-slate-600 hover:text-slate-400'
                  }`}
                >
                  {c.active ? 'Ativa' : 'Pausada'}
                </button>

                <button
                  onClick={() => deleteConstraint(c.id)}
                  className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-600 hover:text-rose-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detector Inteligente (Right) */}
      <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800 p-5 rounded-3xl space-y-4">
        <div className="space-y-1 pb-2 border-b border-slate-850 text-left">
          <h3 className="font-serif text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5 text-amber-500 animate-pulse" /> Detector Inteligente IA
          </h3>
          <p className="text-[11px] text-slate-500">Alertas de incompatibilidades e diagnósticos em tempo real.</p>
        </div>

        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 text-left">
          {alerts.length === 0 ? (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-2.5 text-xs text-green-400">
              <CheckCircle className="w-4.5 h-4.5" />
              <span>✓ Tudo certo! Nenhum conflito de horário ou excesso de carga detectado.</span>
            </div>
          ) : (
            alerts.map(a => (
              <div
                key={a.id}
                className={`p-3.5 rounded-2xl border flex items-start gap-3 text-[11px] leading-relaxed transition-all ${getAlertStyleClasses(a.type)}`}
              >
                {getAlertIcon(a.type)}
                <div className="space-y-0.5">
                  <span className="text-[8px] uppercase tracking-wider font-mono font-bold block opacity-65">Inconsistência identificada</span>
                  <p className="font-medium">{a.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
