import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Users, UserPlus, Trash2, Search, CheckCircle2, 
  AlertCircle, RefreshCw, GraduationCap, ArrowRight, ShieldCheck
} from 'lucide-react';
import { classesService, AvailableStudentItem } from '../../services/classes/classes.service';
import { ClassEnrolledStudent } from '../../types/class.types';
import { SimpleClassEntity } from '../../services/schedule/classScheduleService';

interface ClassStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  classItem: SimpleClassEntity | null;
  organizationId: string;
  onRosterUpdated?: () => void;
}

export const ClassStudentsModal: React.FC<ClassStudentsModalProps> = ({
  isOpen,
  onClose,
  classItem,
  organizationId,
  onRosterUpdated
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [enrolledStudents, setEnrolledStudents] = useState<ClassEnrolledStudent[]>([]);
  const [availableStudents, setAvailableStudents] = useState<AvailableStudentItem[]>([]);
  const [searchEnrolled, setSearchEnrolled] = useState<string>('');
  const [selectedStudentToLink, setSelectedStudentToLink] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load students for this class and available students
  const loadClassData = async () => {
    if (!classItem) return;
    setLoading(true);
    setFeedback(null);
    try {
      const [classRoster, schoolStudents] = await Promise.all([
        classesService.getClassStudents(classItem.id, organizationId),
        classesService.getAvailableStudents(organizationId)
      ]);
      setEnrolledStudents(classRoster || []);
      setAvailableStudents(schoolStudents || []);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Não foi possível carregar os estudantes da turma: ' + (err?.message || err)
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && classItem) {
      loadClassData();
      setSelectedStudentToLink('');
      setSearchEnrolled('');
    }
  }, [isOpen, classItem?.id]);

  // Filter enrolled students by search
  const filteredEnrolled = useMemo(() => {
    if (!searchEnrolled.trim()) return enrolledStudents;
    const term = searchEnrolled.toLowerCase().trim();
    return enrolledStudents.filter(s => 
      (s.full_name || s.name || '').toLowerCase().includes(term) ||
      (s.registration_code || '').toLowerCase().includes(term)
    );
  }, [enrolledStudents, searchEnrolled]);

  // Filter school students who are NOT in this class
  const unlinkedStudents = useMemo(() => {
    const enrolledIds = new Set(enrolledStudents.map(s => s.id || s.student_id));
    return availableStudents.filter(s => !enrolledIds.has(s.id));
  }, [availableStudents, enrolledStudents]);

  const maxCapacity = 35;
  const occupancyPercentage = Math.min(100, Math.round((enrolledStudents.length / maxCapacity) * 100));

  // Handle Link Student
  const handleLinkStudent = async () => {
    if (!classItem || !selectedStudentToLink) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await classesService.linkStudent(classItem.id, selectedStudentToLink, organizationId);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: 'Estudante enturmado com sucesso!'
        });
        setSelectedStudentToLink('');
        await loadClassData();
        if (onRosterUpdated) onRosterUpdated();
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Erro ao enturmar estudante.'
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Falha na enturmação: ' + (err?.message || err)
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Unlink Student
  const handleUnlinkStudent = async (studentId: string, studentName: string) => {
    if (!classItem || !studentId) return;
    const confirmed = window.confirm(`Deseja realmente desvincular o estudante "${studentName}" da turma ${classItem.name}?`);
    if (!confirmed) return;

    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await classesService.unlinkStudent(classItem.id, studentId, organizationId);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Estudante "${studentName}" desvinculado da turma.`
        });
        await loadClassData();
        if (onRosterUpdated) onRosterUpdated();
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Erro ao desvincular estudante.'
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Falha ao desvincular: ' + (err?.message || err)
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen || !classItem) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Top Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-50 to-blue-50/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                <Users className="w-5 h-5" />
              </span>
              <div>
                <h2 id="modal-title" className="text-lg font-bold text-slate-900 font-serif">
                  Enturmação e Relação de Alunos
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Turma: <strong className="text-slate-800">{classItem.name}</strong> • Turno: {classItem.shift || 'Matutino'} • Sala: {classItem.room || '01'}
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Capacity & Occupancy Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-600 font-semibold">
              Ocupação da Turma:
            </span>
            <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
              {enrolledStudents.length} / {maxCapacity} vagas ({occupancyPercentage}%)
            </span>
          </div>
          <div className="w-36 bg-slate-200 rounded-full h-2.5 overflow-hidden">
            <div 
              className={`h-2.5 rounded-full transition-all duration-300 ${
                occupancyPercentage >= 100 
                  ? 'bg-rose-500' 
                  : occupancyPercentage >= 80 
                    ? 'bg-amber-500' 
                    : 'bg-blue-600'
              }`}
              style={{ width: `${occupancyPercentage}%` }}
            />
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`mx-6 mt-4 p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setFeedback(null)} 
              className="p-1 hover:opacity-70 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section: Enturmar Novo Aluno */}
          <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-blue-700" /> Enturmar Novo Estudante
              </span>
              <span className="text-[11px] text-blue-700 font-medium">
                {unlinkedStudents.length} aluno(s) disponível(is) na escola
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="flex-1">
                <select
                  value={selectedStudentToLink}
                  onChange={(e) => setSelectedStudentToLink(e.target.value)}
                  disabled={actionLoading || loading}
                  aria-label="Selecione um estudante para enturmar"
                  className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-blue-600 rounded-xl text-xs font-medium text-slate-800 focus:outline-none transition-all"
                >
                  <option value="">Selecione um aluno para enturmar nesta turma...</option>
                  {unlinkedStudents.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.full_name} ({st.registration_code}) {st.is_enrolled ? '• Já em outra turma' : '• Sem turma'}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleLinkStudent}
                disabled={!selectedStudentToLink || actionLoading || loading}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 shadow-xs ${
                  selectedStudentToLink && !actionLoading
                    ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                    : 'bg-slate-300 cursor-not-allowed opacity-70'
                }`}
              >
                {actionLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Enturmar</span>
              </button>
            </div>
          </div>

          {/* Section: Relação de Estudantes da Turma */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-slate-500" />
                Relação Nominal dos Estudantes ({filteredEnrolled.length})
              </h3>
              
              {/* Search within class */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchEnrolled}
                  onChange={(e) => setSearchEnrolled(e.target.value)}
                  placeholder="Filtrar por nome ou RA..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* List / Table */}
            {loading ? (
              <div className="space-y-2 py-4">
                {[1, 2, 3].map(n => (
                  <div key={n} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredEnrolled.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-700">Nenhum estudante enturmado</h4>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  {searchEnrolled ? 'Nenhum estudante corresponde à pesquisa.' : 'Selecione um estudante acima para incluí-lo nesta turma.'}
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">Nº</th>
                      <th className="py-2.5 px-3">Estudante</th>
                      <th className="py-2.5 px-3">Matrícula (RA)</th>
                      <th className="py-2.5 px-3">Situação</th>
                      <th className="py-2.5 px-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredEnrolled.map((st, idx) => {
                      const studentId = st.id || st.student_id;
                      const studentName = st.full_name || st.name || 'Estudante';
                      return (
                        <tr key={studentId || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {studentName}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                            {st.registration_code || `RA-${studentId.substring(0, 6)}`}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {st.status || 'Ativo'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleUnlinkStudent(studentId, studentName)}
                              disabled={actionLoading}
                              title="Desvincular estudante da turma"
                              className="px-2.5 py-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Desvincular</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Persistência vinculada à tabela canônica de enturmação (class_students).</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
