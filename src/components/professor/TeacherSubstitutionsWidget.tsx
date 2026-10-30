import React, { useState, useEffect, useCallback } from 'react';
import { Users, CheckCircle2, XCircle, Clock, Calendar, Check, X, ShieldCheck } from 'lucide-react';
import { teacherSubstitutionsService, TeacherSubstitution } from '../../services/schedule/teacherSubstitutionsService';

interface TeacherSubstitutionsWidgetProps {
  organizationId: string;
  teacherName?: string;
}

export function TeacherSubstitutionsWidget({ organizationId, teacherName }: TeacherSubstitutionsWidgetProps) {
  const [substitutions, setSubstitutions] = useState<TeacherSubstitution[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadSubs = useCallback(async () => {
    try {
      const data = await teacherSubstitutionsService.getSubstitutions(organizationId);
      // Filter substitutions assigned to this teacher or pending review
      setSubstitutions(data);
    } catch (e) {
      console.warn('Error loading teacher subs widget:', e);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    loadSubs();
    const handleSync = () => loadSubs();
    window.addEventListener('classium_substitutions_updated', handleSync);
    return () => window.removeEventListener('classium_substitutions_updated', handleSync);
  }, [loadSubs]);

  const [actionError, setActionError] = useState<string | null>(null);

  const handleAction = async (id: string, status: 'aceita' | 'recusada') => {
    try {
      setActionError(null);
      await teacherSubstitutionsService.updateStatus(organizationId, id, status);
      loadSubs();
    } catch (e) {
      console.warn('Error updating substitution status:', e);
      setActionError('Não foi possível atualizar o status no momento.');
    }
  };

  if (loading) return null;
  if (substitutions.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-3xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="p-2 bg-white/10 text-amber-300 rounded-xl">
            <Users className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-serif font-bold text-base">Solicitações de Substituição Docente</h3>
            <p className="text-[11px] text-blue-200">Coberturas de aula designadas pela coordenação pedagógica</p>
          </div>
        </div>
        <span className="text-xs font-mono bg-amber-400 text-slate-950 font-bold px-3 py-1 rounded-full">
          {substitutions.filter(s => s.status === 'pendente').length} Pendentes
        </span>
      </div>

      <div className="space-y-3">
        {substitutions.map((sub) => (
          <div 
            key={sub.id} 
            className="p-4 bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  sub.status === 'aceita' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  sub.status === 'recusada' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                  'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {sub.status.toUpperCase()}
                </span>
                <span className="font-mono text-xs text-blue-200">
                  {sub.substitution_date} • {sub.time_slot}
                </span>
                <span className="text-xs font-bold text-white bg-white/15 px-2 py-0.5 rounded">
                  {sub.class_name} ({sub.subject_name})
                </span>
              </div>

              <p className="text-xs text-blue-100">
                Professor Titular Ausente: <strong className="text-white">{sub.absent_teacher_name}</strong>
              </p>
              <p className="text-[11px] text-blue-300 italic">
                Motivo: {sub.reason}
              </p>
            </div>

            {sub.status === 'pendente' && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleAction(sub.id, 'aceita')}
                  className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Aceitar</span>
                </button>
                <button
                  onClick={() => handleAction(sub.id, 'recusada')}
                  className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                >
                  <X className="w-4 h-4" />
                  <span>Recusar</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
