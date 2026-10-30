import React, { useState } from 'react';
import { 
  X, CheckSquare, Award, Activity, MessageSquare, 
  Send, CheckCircle2, Shield, Trash2, FileText,
  Clock, AlertCircle, RefreshCw, Star, Heart
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ClassroomStudentActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    id: string;
    name: string;
    ra?: string;
    photoUrl?: string;
    points: number;
    attendanceRate?: string;
    attendance?: string; // 'P' | 'F' | 'A'
  } | null;
  seatNumber: number | null;
  currentClass: {
    id: string;
    name: string;
    subject?: string;
    room?: string;
    shift?: string;
  } | null;
  teacherId: string;
  teacherName: string;
  isSupervised: boolean;
  onToggleSupervision: (seatNumber: number) => void;
  onUnseatStudent: (seatNumber: number) => void;
  onOpenDossier: (student: any) => void;
  onStudentUpdated: (updatedStudent: any) => void;
}

export function ClassroomStudentActionModal({
  isOpen,
  onClose,
  student,
  seatNumber,
  currentClass,
  teacherId,
  teacherName,
  isSupervised,
  onToggleSupervision,
  onUnseatStudent,
  onOpenDossier,
  onStudentUpdated
}: ClassroomStudentActionModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'behavior' | 'grade' | 'message'>('behavior');

  // Behavior state
  const [behaviorType, setBehaviorType] = useState<'elogio' | 'participacao' | 'advertencia' | 'indisciplina'>('elogio');
  const [behaviorNote, setBehaviorNote] = useState('');
  const [isSavingBehavior, setIsSavingBehavior] = useState(false);
  const [behaviorMsg, setBehaviorMsg] = useState('');

  // Quick Grade state
  const [quickScore, setQuickScore] = useState('10.0');
  const [quickGradeType, setQuickGradeType] = useState('participacao');
  const [quickGradeComment, setQuickGradeComment] = useState('Atividade prática em sala');
  const [isSavingGrade, setIsSavingGrade] = useState(false);
  const [gradeMsg, setGradeMsg] = useState('');

  // Direct Message state
  const [directMsg, setDirectMsg] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const [directMsgSuccess, setDirectMsgSuccess] = useState('');

  if (!isOpen || !student) return null;

  // Handle Quick Behavior Log
  const handleSaveBehavior = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBehavior(true);
    try {
      const pointsDelta = behaviorType === 'elogio' ? 0.5 : behaviorType === 'participacao' ? 0.2 : behaviorType === 'advertencia' ? -0.5 : -1.0;
      const updatedPts = Number(Math.min(20, Math.max(0, student.points + pointsDelta)).toFixed(1));

      await fetch(`/api/teacher/students/${student.id}/behavior`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: behaviorNote || `Registro de ${behaviorType} em sala de aula`,
          author: teacherName,
          classId: currentClass?.id,
          type: behaviorType
        })
      });

      const updated = {
        ...student,
        points: updatedPts
      };
      onStudentUpdated(updated);
      setBehaviorMsg('Conduta registrada e pontuação atualizada!');
      setBehaviorNote('');
      setTimeout(() => setBehaviorMsg(''), 2500);
    } catch (err) {
      console.warn('Erro ao salvar comportamento:', err);
    } finally {
      setIsSavingBehavior(false);
    }
  };

  // Handle Quick Grade
  const handleSaveQuickGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGrade(true);
    try {
      const numScore = parseFloat(quickScore) || 10.0;
      await fetch(`/api/teacher/students/${student.id}/quick-grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: numScore,
          type: quickGradeType,
          classId: currentClass?.id,
          comments: quickGradeComment
        })
      });

      setGradeMsg(`Nota ${numScore.toFixed(1)} lançada com sucesso no boletim!`);
      setTimeout(() => setGradeMsg(''), 2500);
    } catch (err) {
      console.warn('Erro ao lançar nota rápida:', err);
    } finally {
      setIsSavingGrade(false);
    }
  };

  // Handle Direct Message
  const handleSendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directMsg.trim()) return;
    setIsSendingMsg(true);
    try {
      await fetch(`/api/teacher/students/${student.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: student.name,
          message: directMsg,
          target: 'student_family'
        })
      });

      setDirectMsgSuccess('Mensagem enviada para o aplicativo do estudante e responsáveis!');
      setDirectMsg('');
      setTimeout(() => setDirectMsgSuccess(''), 3000);
    } catch (err) {
      console.warn('Erro ao enviar mensagem:', err);
    } finally {
      setIsSendingMsg(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in text-left overflow-y-auto">
      <div className="bg-[#0e2149] border-2 border-gold/40 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto text-ice my-auto">
        
        {/* Header with Student Bio & Seat Number */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={student.photoUrl || `https://i.pravatar.cc/150?u=${student.id}`} 
                alt={student.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-gold shadow-md"
                referrerPolicy="no-referrer"
              />
              {seatNumber && (
                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white text-oxford flex items-center justify-center text-[10px] font-extrabold shadow-md border border-gold">
                  {seatNumber.toString().padStart(2, '0')}
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gold uppercase font-mono font-bold tracking-widest bg-gold/10 px-2 py-0.5 rounded border border-gold/20">
                  Carteira #{seatNumber?.toString().padStart(2, '0') || 'N/A'}
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  {student.ra || 'RA • 2026.09A.001'}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-serif font-bold text-white mt-0.5">{student.name}</h3>
              <p className="text-xs text-gray-300 font-light">
                {currentClass?.name} • {currentClass?.subject || 'Robótica & IA'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {seatNumber && (
              <button
                type="button"
                onClick={() => onToggleSupervision(seatNumber)}
                className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                  isSupervised
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
                title={isSupervised ? "Desativar supervisão pedagógica" : "Ativar supervisão direta"}
              >
                <Shield className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">{isSupervised ? 'Supervisionado' : 'Supervisionar'}</span>
              </button>
            )}

            {seatNumber && (
              <button
                type="button"
                onClick={() => {
                  onUnseatStudent(seatNumber);
                  onClose();
                }}
                className="p-2 bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 rounded-xl transition-all"
                title="Desocupar carteira"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button 
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Metrics Strip */}
        <div className="grid grid-cols-3 gap-2 text-center p-2.5 bg-[#08142d] border border-gold/15 rounded-2xl text-xs">
          <div>
            <span className="text-[9px] text-gray-400 block uppercase font-bold">Conduta</span>
            <span className="font-mono font-bold text-gold">{student.points?.toFixed(1) || '20.0'} / 20.0</span>
          </div>
          <div>
            <span className="text-[9px] text-gray-400 block uppercase font-bold">Situação</span>
            <span className="font-mono font-bold text-emerald-400">Regular</span>
          </div>
          <div>
            <span className="text-[9px] text-gray-400 block uppercase font-bold">Turma</span>
            <span className="font-mono font-bold text-blue-400">{currentClass?.name || 'Turma'}</span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex gap-1.5 border-b border-white/10 pb-2 overflow-x-auto">
          {[
            { id: 'behavior', label: 'Comportamento', icon: Activity },
            { id: 'grade', label: 'Nota Rápida', icon: Award },
            { id: 'message', label: 'Mensagem', icon: MessageSquare }
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  isSelected 
                    ? 'bg-bordeaux text-white shadow-md ring-1 ring-gold/40' 
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-gold' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB: COMPORTAMENTO */}
        {activeSubTab === 'behavior' && (
          <form onSubmit={handleSaveBehavior} className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-gold block">
              Registrar Observação de Comportamento em Sala
            </span>

            {behaviorMsg && (
              <div className="p-2.5 bg-emerald-950/60 border border-emerald-500 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{behaviorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'elogio', label: '⭐ Elogio (+0.5)', color: 'border-emerald-500 text-emerald-300' },
                { id: 'participacao', label: '💡 Engajado (+0.2)', color: 'border-blue-500 text-blue-300' },
                { id: 'advertencia', label: '⚠️ Advertência (-0.5)', color: 'border-amber-500 text-amber-300' },
                { id: 'indisciplina', label: '🔴 Indisciplina (-1.0)', color: 'border-rose-500 text-rose-300' }
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setBehaviorType(item.id as any)}
                  className={`p-2 rounded-xl text-[11px] font-bold border transition-all text-center ${
                    behaviorType === item.id 
                      ? 'bg-white/10 ring-1 ring-gold shadow-md ' + item.color
                      : 'bg-[#08142d] border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              placeholder="Descreva a atitude ou motivo do registro..."
              value={behaviorNote}
              onChange={(e) => setBehaviorNote(e.target.value)}
              className="w-full bg-[#08142d] border border-gold/15 rounded-xl p-3 text-xs text-white outline-none focus:border-gold resize-none"
            />

            <button
              type="submit"
              disabled={isSavingBehavior}
              className="w-full py-2.5 bg-bordeaux hover:bg-bordeaux/90 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSavingBehavior ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
              <span>Salvar Comportamento</span>
            </button>
          </form>
        )}

        {/* TAB: NOTA RÁPIDA */}
        {activeSubTab === 'grade' && (
          <form onSubmit={handleSaveQuickGrade} className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-gold block">
              Atribuir Nota Rápida de Sala de Aula
            </span>

            {gradeMsg && (
              <div className="p-2.5 bg-emerald-950/60 border border-emerald-500 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{gradeMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-300 uppercase block">Nota (0 a 10.0)</label>
                <div className="flex items-center gap-1">
                  {['10.0', '9.5', '9.0', '8.5', '8.0'].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setQuickScore(val)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                        quickScore === val ? 'bg-gold text-oxford' : 'bg-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-300 uppercase block">Tipo de Atividade</label>
                <select
                  value={quickGradeType}
                  onChange={(e) => setQuickGradeType(e.target.value)}
                  className="w-full bg-[#08142d] border border-gold/15 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-gold"
                >
                  <option value="participacao">Participação em Sala</option>
                  <option value="exercicio">Exercício Prático / Maker</option>
                  <option value="seminario">Apresentação Oral</option>
                  <option value="tarefa">Lição de Casa</option>
                </select>
              </div>
            </div>

            <input 
              type="text"
              placeholder="Observação da nota (opcional)..."
              value={quickGradeComment}
              onChange={(e) => setQuickGradeComment(e.target.value)}
              className="w-full bg-[#08142d] border border-gold/15 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-gold"
            />

            <button
              type="submit"
              disabled={isSavingGrade}
              className="w-full py-2.5 bg-bordeaux hover:bg-bordeaux/90 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSavingGrade ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
              <span>Lançar Nota Rápida</span>
            </button>
          </form>
        )}

        {/* TAB: MENSAGEM DIRETA */}
        {activeSubTab === 'message' && (
          <form onSubmit={handleSendDirectMessage} className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-gold block">
              Enviar Mensagem Direta para o Aluno e Responsáveis
            </span>

            {directMsgSuccess && (
              <div className="p-2.5 bg-emerald-950/60 border border-emerald-500 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{directMsgSuccess}</span>
              </div>
            )}

            <textarea
              rows={4}
              required
              placeholder="Escreva uma mensagem ou recado direto que aparecerá no aplicativo dos responsáveis..."
              value={directMsg}
              onChange={(e) => setDirectMsg(e.target.value)}
              className="w-full bg-[#08142d] border border-gold/15 rounded-xl p-3 text-xs text-white outline-none focus:border-gold resize-none"
            />

            <button
              type="submit"
              disabled={isSendingMsg}
              className="w-full py-2.5 bg-bordeaux hover:bg-bordeaux/90 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSendingMsg ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Enviar Mensagem em Tempo Real</span>
            </button>
          </form>
        )}

        {/* Footer with Open Complete Dossier button */}
        <div className="pt-3 border-t border-white/10 flex justify-between items-center">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenDossier(student);
            }}
            className="px-4 py-2 bg-white/5 hover:bg-gold/10 border border-white/10 hover:border-gold/30 text-gold rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Abrir Ficha Completa (Dossiê)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-bold transition-all"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
