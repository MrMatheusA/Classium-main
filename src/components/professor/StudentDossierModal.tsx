import React, { useState, useEffect } from 'react';
import { 
  X, User, Award, CheckSquare, Activity, AlertCircle, 
  Send, RefreshCw, CheckCircle2, Phone, Calendar, 
  ShieldAlert, Star, TrendingUp, BookOpen, Clock,
  FileText, Sparkles, Plus, AlertTriangle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface StudentDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    id: string;
    name: string;
    ra?: string;
    photoUrl?: string;
    points: number;
    attendanceRate?: string;
    attendance?: string;
  } | null;
  currentClass: {
    id: string;
    name: string;
    subject?: string;
    room?: string;
    shift?: string;
  } | null;
  teacherId: string;
  teacherName: string;
  onStudentUpdated?: (updatedStudent: any) => void;
}

export function StudentDossierModal({
  isOpen,
  onClose,
  student,
  currentClass,
  teacherId,
  teacherName,
  onStudentUpdated
}: StudentDossierModalProps) {
  const [activeTab, setActiveTab] = useState<'behavior' | 'occurrences'>('behavior');
  const [loading, setLoading] = useState(false);
  const [studentDetails, setStudentDetails] = useState<any>(null);

  // Form states for Occurrences tab
  const [occCategory, setOccCategory] = useState('pedagogica');
  const [occPoints, setOccPoints] = useState(0.0);
  const [occDescription, setOccDescription] = useState('');
  const [occNotifyFamily, setOccNotifyFamily] = useState(true);
  const [isSavingOcc, setIsSavingOcc] = useState(false);
  const [occSuccess, setOccSuccess] = useState('');

  // Behavior observation
  const [behaviorNote, setBehaviorNote] = useState('');
  const [isSavingBehavior, setIsSavingBehavior] = useState(false);
  const [behaviorSuccess, setBehaviorSuccess] = useState('');

  useEffect(() => {
    if (!isOpen || !student) return;

    async function fetchDetails() {
      setLoading(true);
      try {
        // Fetch from API
        const res = await fetch(`/api/teacher/students/${student?.id}/details`);
        const json = await res.json();
        if (json?.student) {
          setStudentDetails(json.student);
        } else {
          // Fallback defaults
          setStudentDetails({
            id: student?.id,
            name: student?.name,
            ra: student?.ra || 'RA • 2026.09A.001',
            responsibleName: 'Responsável Legal',
            responsiblePhone: '(11) 98765-4321',
            points: student?.points || 20.0,
            attendanceRate: student?.attendanceRate || '98.5%',
            grades: [
              { id: 'g1', type: 'Prova Mensal', term: '1º Trimestre', score: 9.5, maxScore: 10.0, weight: 1.0, date: '15/03/2026' },
              { id: 'g2', type: 'Trabalho Maker', term: '1º Trimestre', score: 10.0, maxScore: 10.0, weight: 1.0, date: '22/03/2026' }
            ],
            occurrences: [
              { id: 'occ1', type: 'elogio', pointsDeducted: 0, description: 'Excelente participação e postura colaborativa nas aulas.', date: '20/08/2026' }
            ],
            attendanceRecords: [
              { date: '24/08/2026', status: 'present', label: 'Presente' },
              { date: '21/08/2026', status: 'present', label: 'Presente' },
              { date: '19/08/2026', status: 'present', label: 'Presente' },
              { date: '17/08/2026', status: 'justified', label: 'Falta Justificada (Atestado)' },
              { date: '14/08/2026', status: 'present', label: 'Presente' }
            ],
            behaviorLogs: [
              { date: '22/08/2026', note: 'Engajamento exemplar nos projetos práticos de Robótica.', author: teacherName }
            ]
          });
        }
      } catch (err) {
        console.warn('Error fetching student details:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDetails();
  }, [isOpen, student?.id]);

  if (!isOpen || !student) return null;

  // Handle Save Occurrence
  const handleSaveOcc = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingOcc(true);
    try {
      await fetch(`/api/teacher/students/${student.id}/occurrences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: occCategory,
          pointsDeducted: occPoints,
          description: occDescription,
          notifyFamily: occNotifyFamily
        })
      });

      try {
        await supabase.from('occurrences').insert([{
          student_id: student.id,
          class_id: currentClass?.id,
          teacher_id: teacherId,
          type: occCategory,
          points_deducted: occPoints,
          description: occDescription,
          notified_family: occNotifyFamily,
          created_at: new Date().toISOString()
        }]);
      } catch (_) {}

      const newOccItem = {
        id: `occ-${Date.now()}`,
        type: occCategory,
        pointsDeducted: occPoints,
        description: occDescription,
        date: new Date().toLocaleDateString('pt-BR')
      };

      const updatedPoints = Number(Math.max(0, student.points - occPoints + (occCategory === 'elogio' ? 0.5 : 0)).toFixed(1));

      setStudentDetails((prev: any) => ({
        ...prev,
        points: updatedPoints,
        occurrences: [newOccItem, ...(prev?.occurrences || [])]
      }));

      setOccSuccess('Ocorrência lançada e enviada para os responsáveis!');
      setOccDescription('');
      setTimeout(() => setOccSuccess(''), 3000);

      if (onStudentUpdated) {
        onStudentUpdated({
          ...student,
          points: updatedPoints
        });
      }
    } catch (err) {
      console.warn('Erro ao salvar ocorrência:', err);
    } finally {
      setIsSavingOcc(false);
    }
  };

  // Handle Save Behavior Note
  const handleSaveBehavior = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!behaviorNote.trim()) return;
    setIsSavingBehavior(true);
    try {
      await fetch(`/api/teacher/students/${student.id}/behavior`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: behaviorNote,
          author: teacherName
        })
      });

      const newLog = {
        date: new Date().toLocaleDateString('pt-BR'),
        note: behaviorNote,
        author: teacherName
      };

      setStudentDetails((prev: any) => ({
        ...prev,
        behaviorLogs: [newLog, ...(prev?.behaviorLogs || [])]
      }));

      setBehaviorSuccess('Observação de conduta salva com sucesso!');
      setBehaviorNote('');
      setTimeout(() => setBehaviorSuccess(''), 3000);
    } catch (err) {
      console.warn('Erro ao salvar conduta:', err);
    } finally {
      setIsSavingBehavior(false);
    }
  };

  const currentPoints = studentDetails?.points ?? student.points ?? 20.0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in text-left overflow-y-auto">
      <div className="bg-[#0e2149] border-2 border-gold/40 rounded-3xl max-w-4xl w-full p-5 sm:p-7 space-y-6 shadow-2xl relative max-h-[92vh] overflow-y-auto my-auto text-ice">
        
        {/* Header with Student Bio */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-4">
            <img 
              src={student.photoUrl || `https://i.pravatar.cc/150?u=${student.id}`} 
              alt={student.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-gold shadow-md"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-gold uppercase font-mono font-bold tracking-widest bg-gold/10 px-2 py-0.5 rounded border border-gold/20">
                  Ficha Acadêmica Individual
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  {student.ra || 'RA • 2026.09A.001'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-white mt-1">{student.name}</h2>
              <p className="text-xs text-gray-300 font-light mt-0.5">
                Turma: <strong className="text-gold">{currentClass?.name || '9º Ano A'}</strong> • Disciplina: <strong className="text-gray-200">{currentClass?.subject || 'Robótica & IA'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            {/* Quick Metrics Badges */}
            <div className="text-right">
              <span className="text-[9px] text-gray-400 block uppercase font-bold">Conduta</span>
              <span className="text-xs font-mono font-bold text-gold bg-bordeaux/40 border border-gold/30 px-2 py-0.5 rounded">
                {currentPoints.toFixed(1)} / 20.0 PTS
              </span>
            </div>

            <button 
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all ml-2"
              title="Fechar Ficha"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Responsible Info Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-3.5 bg-[#08142d] border border-gold/15 rounded-2xl text-xs">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gold shrink-0" />
            <div>
              <span className="text-[10px] text-gray-400 block">Responsável Principal</span>
              <span className="font-bold text-white">{studentDetails?.responsibleName || 'Responsável Legal Cadastrado'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gold shrink-0" />
            <div>
              <span className="text-[10px] text-gray-400 block">Telefone de Contato</span>
              <span className="font-mono text-gray-200">{studentDetails?.responsiblePhone || '(11) 98765-4321'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gold shrink-0" />
            <div>
              <span className="text-[10px] text-gray-400 block">Turno & Sala</span>
              <span className="text-gray-200 font-medium">{currentClass?.shift || 'Matutino'} • {currentClass?.room || 'Laboratório Maker 02'}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex gap-2 border-b border-white/10 pb-2 overflow-x-auto">
          {[
            { id: 'behavior', label: 'Comportamento & Conduta', icon: Activity },
            { id: 'occurrences', label: 'Ocorrências & Diário', icon: AlertCircle }
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  isSelected 
                    ? 'bg-bordeaux text-white shadow-md ring-1 ring-gold/40 font-extrabold' 
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-gold' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB: COMPORTAMENTO & CONDUTA */}
        {activeTab === 'behavior' && (
          <div className="space-y-6">
            {/* Conduct Score Overview */}
            <div className="p-4 bg-[#08142d] border border-gold/20 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-gold" /> Painel de Conduta Disciplinar
                </span>
                <p className="text-xs text-gray-300 mt-1 font-light">
                  Sistema de pontuação contínua e bonificação por engajamento pedagógico.
                </p>
              </div>

              <div className="px-5 py-3 bg-bordeaux/30 border border-gold/30 rounded-2xl text-center">
                <span className="text-[10px] text-gold uppercase font-mono font-bold block">Pontuação Atual</span>
                <span className="text-xl font-bold font-mono text-white mt-0.5 block">{currentPoints.toFixed(1)} / 20.0 PTS</span>
              </div>
            </div>

            {/* Add Behavior Feedback Form */}
            <div className="p-4 bg-[#08142d] border border-white/10 rounded-2xl space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-300 block">
                Adicionar Parecer Pedagógico de Comportamento
              </span>

              {behaviorSuccess && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-500 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{behaviorSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSaveBehavior} className="space-y-3">
                <textarea 
                  rows={3}
                  required
                  placeholder="Descreva a evolução do estudante, atitude em grupo ou pontos de atenção pedagógica..."
                  value={behaviorNote}
                  onChange={(e) => setBehaviorNote(e.target.value)}
                  className="w-full bg-[#0e2149] border border-gold/20 rounded-xl p-3 text-xs text-white outline-none focus:border-gold resize-none"
                />
                <button
                  type="submit"
                  disabled={isSavingBehavior}
                  className="px-5 py-2.5 bg-bordeaux hover:bg-bordeaux/90 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSavingBehavior ? <RefreshCw className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
                  <span>Salvar Parecer de Conduta</span>
                </button>
              </form>
            </div>

            {/* Behavior Logs List */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-300 block">
                Histórico de Observações Docentes
              </span>

              <div className="space-y-2">
                {(studentDetails?.behaviorLogs || []).map((bLog: any, bIdx: number) => (
                  <div key={bIdx} className="p-3.5 bg-[#08142d] border border-gold/10 rounded-2xl space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
                      <span>Registrado por: <strong className="text-gold">{bLog.author || teacherName}</strong></span>
                      <span>{bLog.date || '22/08/2026'}</span>
                    </div>
                    <p className="text-xs text-gray-200 font-light leading-relaxed">{bLog.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: OCORRÊNCIAS & DIÁRIO */}
        {activeTab === 'occurrences' && (
          <div className="space-y-6">
            {/* Quick Occurrence Entry Form */}
            <div className="p-4 bg-[#08142d] border border-gold/20 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-gold" /> Registrar Ocorrência com Notificação Familiar
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Supabase Realtime</span>
              </div>

              {occSuccess && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-500 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{occSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSaveOcc} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-300 uppercase block">Categoria</label>
                    <select
                      value={occCategory}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOccCategory(val);
                        if (val === 'leve') setOccPoints(0.5);
                        else if (val === 'media') setOccPoints(1.0);
                        else if (val === 'gravissima') setOccPoints(2.0);
                        else setOccPoints(0.0);
                      }}
                      className="w-full bg-[#0e2149] border border-gold/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-gold"
                    >
                      <option value="pedagogica">Anotação Pedagógica</option>
                      <option value="elogio">⭐ Elogio / Postura Exemplar</option>
                      <option value="saude">Atendimento de Saúde</option>
                      <option value="leve">Infração Leve (-0.5 pt)</option>
                      <option value="media">Infração Média (-1.0 pt)</option>
                      <option value="gravissima">🔴 Infração Gravíssima (-2.0 pts)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-300 uppercase block">Dedução de Pontos</label>
                    <input 
                      type="number"
                      step="0.5"
                      min="0"
                      max="5"
                      value={occPoints}
                      onChange={(e) => setOccPoints(parseFloat(e.target.value) || 0.0)}
                      className="w-full bg-[#0e2149] border border-gold/20 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-gold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-300 uppercase block">Descrição Detalhada</label>
                  <textarea 
                    rows={3}
                    required
                    placeholder="Descreva o acontecimento ocorrido em sala de aula para registro no diário e ciência da família..."
                    value={occDescription}
                    onChange={(e) => setOccDescription(e.target.value)}
                    className="w-full bg-[#0e2149] border border-gold/20 rounded-xl p-3 text-xs text-white outline-none focus:border-gold resize-none"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-[#0e2149] rounded-xl border border-white/5 text-xs">
                  <span className="text-gray-300">Notificar responsáveis no Painel Familiar em tempo real?</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={occNotifyFamily}
                      onChange={(e) => setOccNotifyFamily(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold"></div>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSavingOcc}
                  className="px-5 py-2.5 bg-bordeaux hover:bg-bordeaux/90 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSavingOcc ? <RefreshCw className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
                  <span>Registrar Ocorrência</span>
                </button>
              </form>
            </div>

            {/* List of Registered Occurrences */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-300 block">
                Histórico de Ocorrências no Diário
              </span>

              {(!studentDetails?.occurrences || studentDetails.occurrences.length === 0) ? (
                <div className="p-6 bg-[#08142d] rounded-2xl border border-white/5 text-center text-xs text-gray-400">
                  Nenhuma ocorrência registrada no período.
                </div>
              ) : (
                <div className="space-y-2">
                  {studentDetails.occurrences.map((occ: any, oIdx: number) => (
                    <div key={occ.id || oIdx} className="p-3.5 bg-[#08142d] border border-gold/15 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded ${
                          occ.type === 'elogio' 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : occ.type === 'gravissima'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {occ.type || 'Ocorrência'}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">{occ.date || 'Hoje'}</span>
                      </div>
                      <p className="text-xs text-gray-200 font-light leading-relaxed">{occ.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
