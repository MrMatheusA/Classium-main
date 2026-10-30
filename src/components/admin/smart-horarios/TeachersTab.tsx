import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { SmartTeacher, SmartClass, TimePeriod } from './types';
import { User, Calendar, AlertTriangle, Plus, Trash2, Edit3, Clock, Check, X, Sparkles, Phone, Mail, Award, CheckSquare, Settings, Minus, Search, Filter } from 'lucide-react';

interface TeachersTabProps {
  teachers: SmartTeacher[];
  setTeachers: React.Dispatch<React.SetStateAction<SmartTeacher[]>>;
  classes: SmartClass[];
  setClasses?: React.Dispatch<React.SetStateAction<SmartClass[]>>;
  hours: TimePeriod[];
}

// Helper to determine class segment
function getSegment(className: string): string {
  if (className.includes('EM') || className.includes('Médio')) return 'Ensino Médio';
  if (className.includes('EJA')) return 'EJA';
  const match = className.match(/^(\d+)º/);
  if (match) {
    const gradeNum = parseInt(match[1]);
    if (gradeNum >= 1 && gradeNum <= 5) return 'Fundamental I';
    if (gradeNum >= 6 && gradeNum <= 9) return 'Fundamental II';
  }
  return 'Fundamental I';
}

export function TeachersTab({ teachers, setTeachers, classes, setClasses, hours }: TeachersTabProps) {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<SmartTeacher | null>(null);
  
  // Modal for quick registration
  const [isNewTeacherModalOpen, setIsNewTeacherModalOpen] = useState(false);
  const [newTeacherForm, setNewTeacherForm] = useState<Partial<SmartTeacher>>({
    name: '',
    subject: 'Matemática',
    weeklyClasses: 20,
    grades: [],
    availableDays: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'],
    unavailableTimes: [],
    maxClassesPerDay: 5,
    avoidSplitClasses: false,
    acceptWindows: true,
    preference: 'Nenhuma'
  });

  // Global filters for teachers grid
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalShiftFilter, setGlobalShiftFilter] = useState('Todos');

  // Modal for linking teacher to class ("Vincular Docente à Turma")
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkingTeacher, setLinkingTeacher] = useState<SmartTeacher | null>(null);
  const [linkForm, setLinkForm] = useState({
    grade: '',
    subject: '',
    shift: 'Matutino',
    room: '',
    weeklyClasses: 4,
    year: '2026'
  });

  // Modal for quick class allocations ("Turmas / Aulas")
  const [allocatingTeacher, setAllocatingTeacher] = useState<SmartTeacher | null>(null);
  
  // Real-time allocation state for the modal
  const [tempAllocations, setTempAllocations] = useState<Record<string, number>>({});
  const [allocatingSearchTerm, setAllocatingSearchTerm] = useState('');
  const [shiftFilter, setShiftFilter] = useState('Todos');
  const [segmentFilter, setSegmentFilter] = useState('Todos');

  useEffect(() => {
    if (allocatingTeacher) {
      setTempAllocations(allocatingTeacher.classAllocations || {});
      setAllocatingSearchTerm('');
      setShiftFilter('Todos');
      setSegmentFilter('Todos');
    }
  }, [allocatingTeacher]);

  const daysList = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

  const handleCardClick = (t: SmartTeacher) => {
    setSelectedTeacherId(t.id);
    setEditingTeacher({ ...t });
  };

  const handleSaveTeacherDetails = () => {
    if (!editingTeacher) return;
    setTeachers(prev => prev.map(t => t.id === editingTeacher.id ? { ...editingTeacher } : t));
    setSelectedTeacherId(null);
    setEditingTeacher(null);
  };

  const handleCreateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherForm.name) return;

    const created: SmartTeacher = {
      id: `t-${Date.now()}`,
      name: newTeacherForm.name,
      subject: newTeacherForm.subject || 'Geral',
      weeklyClasses: Number(newTeacherForm.weeklyClasses) || 20,
      grades: newTeacherForm.grades || [],
      availableDays: newTeacherForm.availableDays || ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'],
      unavailableTimes: newTeacherForm.unavailableTimes || [],
      maxClassesPerDay: Number(newTeacherForm.maxClassesPerDay) || 5,
      avoidSplitClasses: !!newTeacherForm.avoidSplitClasses,
      acceptWindows: !!newTeacherForm.acceptWindows,
      preference: newTeacherForm.preference as any || 'Nenhuma',
      avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 100000)}?w=150&h=150&fit=crop`
    };

    setTeachers(prev => [...prev, created]);
    setIsNewTeacherModalOpen(false);
    setNewTeacherForm({
      name: '',
      subject: 'Matemática',
      weeklyClasses: 20,
      grades: [],
      availableDays: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'],
      unavailableTimes: [],
      maxClassesPerDay: 5,
      avoidSplitClasses: false,
      acceptWindows: true,
      preference: 'Nenhuma'
    });
  };

  const handleDeleteTeacher = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Tem certeza de que deseja remover este docente?')) {
      setTeachers(prev => prev.filter(t => t.id !== id));
      if (selectedTeacherId === id) {
        setSelectedTeacherId(null);
        setEditingTeacher(null);
      }
    }
  };

  const toggleDayAvailability = (day: string) => {
    if (!editingTeacher) return;
    const isAvailable = editingTeacher.availableDays.includes(day);
    let newDays = [...editingTeacher.availableDays];
    if (isAvailable) {
      newDays = newDays.filter(d => d !== day);
    } else {
      newDays.push(day);
    }
    setEditingTeacher({ ...editingTeacher, availableDays: newDays });
  };

  const toggleUnavailableTime = (day: string, time: string) => {
    if (!editingTeacher) return;
    const isMatched = editingTeacher.unavailableTimes.some(ut => ut.day === day && ut.time === time);
    let newUT = [...editingTeacher.unavailableTimes];
    if (isMatched) {
      newUT = newUT.filter(ut => !(ut.day === day && ut.time === time));
    } else {
      newUT.push({ day, time });
    }
    setEditingTeacher({ ...editingTeacher, unavailableTimes: newUT });
  };

  // Class allocation handles
  const handleToggleClass = (className: string) => {
    const isSelected = !!tempAllocations[className];
    if (isSelected) {
      setTempAllocations(prev => {
        const copy = { ...prev };
        delete copy[className];
        return copy;
      });
    } else {
      setTempAllocations(prev => ({
        ...prev,
        [className]: 2
      }));
    }
  };

  const handleIncrement = (className: string) => {
    setTempAllocations(prev => ({
      ...prev,
      [className]: (prev[className] || 0) + 1
    }));
  };

  const handleDecrement = (className: string) => {
    const current = tempAllocations[className] || 0;
    if (current <= 1) {
      setTempAllocations(prev => {
        const copy = { ...prev };
        delete copy[className];
        return copy;
      });
    } else {
      setTempAllocations(prev => ({
        ...prev,
        [className]: current - 1
      }));
    }
  };

  const handleSaveLinkClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingTeacher) return;

    try {
      const payload = {
        teacher_id: linkingTeacher.id,
        grade: linkForm.grade,
        subject: linkForm.subject,
        shift: linkForm.shift,
        room: linkForm.room,
        weekly_classes: linkForm.weeklyClasses,
        year: parseInt(linkForm.year) || 2026
      };

      const { error } = await supabase.from('class_teachers').insert(payload);
      if (error) {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const res = await fetch('/api/classes/link-teacher', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            class_id: linkForm.grade,
            teacher_id: linkingTeacher.id,
            subject: linkForm.subject,
            grade: linkForm.grade,
            shift: linkForm.shift
          })
        });

        if (!res.ok) {
          console.warn('[handleSaveLinkClass] Fallback to /api/classes/link-teacher returned non-ok status:', res.status);
        }
      }

      setTeachers(prev => prev.map(t => {
        if (t.id === linkingTeacher.id) {
          const newGrades = Array.from(new Set([...t.grades, linkForm.grade]));
          const newShifts = Array.from(new Set([...(t.shifts || []), linkForm.shift]));
          const newDisciplines = Array.from(new Set([...(t.disciplines || []), linkForm.subject]));
          const newWeekly = (t.weeklyClasses || 0) + Number(linkForm.weeklyClasses);

          return {
            ...t,
            grades: newGrades,
            shifts: newShifts,
            disciplines: newDisciplines,
            weeklyClasses: newWeekly
          };
        }
        return t;
      }));

      setIsLinkModalOpen(false);
    } catch (err) {
      console.error('Error linking teacher to class:', err);
    }
  };

  const getActiveSlots = () => {
    return hours.filter(h => !h.isInterval).map(h => `${h.start} - ${h.end}`);
  };

  return (
    <div className="space-y-5">
      
      {/* Header and Add Button */}
      <div className="bg-slate-900/30 border border-slate-850 p-4 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-left space-y-1">
          <h4 className="text-white text-xs font-bold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" /> Corpo Docente do Classium
          </h4>
          <p className="text-[10px] text-slate-400">
            Gerencie disponibilidade, contatos, cargas horárias e vincule as disciplinas com as turmas.
          </p>
        </div>
        
        <button
          onClick={() => setIsNewTeacherModalOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.01]"
        >
          <Plus className="w-4 h-4" /> + Novo Professor
        </button>
      </div>

      {/* Grid of teachers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {teachers.map(t => {
          // Fallback fields for display
          const cargo = 'Professor Regente';
          const email = `${(t.name || 'professor').toLowerCase().replace(/\s+/g, '')}@educamais.com.br`;
          const phone = '(83) 99888-7711';

          return (
            <div
              key={t.id}
              onClick={() => handleCardClick(t)}
              className="bg-slate-900/40 border border-slate-800 hover:border-[#D4AF37]/50 rounded-3xl p-4 cursor-pointer hover:bg-slate-900/60 transition-all duration-300 flex flex-col justify-between space-y-3.5 text-left group relative"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {t.avatar ? (
                    <img referrerPolicy="no-referrer" src={t.avatar} alt={t.name} className="w-11 h-11 rounded-full object-cover border border-slate-800" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-[#D4AF37] font-serif font-bold text-sm">
                      {(t.name || 'P').charAt(0)}
                    </div>
                  )}

                  <div className="space-y-0.5">
                    <h4 className="text-white font-bold text-xs group-hover:text-blue-400 transition-colors flex items-center gap-1">
                      {t.name}
                    </h4>
                    <p className="text-[9.5px] text-blue-400 font-mono uppercase font-bold flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 shrink-0" /> {t.subject}
                    </p>
                    <p className="text-[9px] text-slate-400 font-medium">{cargo}</p>
                  </div>
                </div>

                <button
                  onClick={(e) => handleDeleteTeacher(t.id, e)}
                  className="p-1 text-slate-600 hover:text-red-400 rounded-lg hover:bg-slate-950 transition-all"
                  title="Excluir Docente"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Contact and Workload Info */}
              <div className="space-y-1.5 text-[10px] text-slate-400 bg-slate-950/40 p-2.5 rounded-2xl border border-slate-850/40">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-slate-500" />
                  <span className="truncate">{email}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-slate-500" />
                  <span>{phone}</span>
                </div>
                <div className="flex items-center justify-between pt-1 mt-1 border-t border-slate-900 font-mono text-[9px]">
                  <span className="text-slate-500 uppercase font-bold">Carga Semanal:</span>
                  <span className="text-green-400 font-bold">{t.weeklyClasses} horas / sem</span>
                </div>
              </div>

              {/* Class association summary and action buttons */}
              <div className="space-y-2 text-[10px]">
                <div>
                  <span className="text-slate-500 block font-bold uppercase tracking-wider text-[8px] font-mono">Turmas Alocadas</span>
                  <div className="flex flex-wrap gap-1 mt-1 min-h-[1.5rem]">
                    {t.grades.length > 0 ? (
                      t.grades.map(g => (
                        <span key={g} className="px-1.5 py-0.5 bg-slate-950 border border-slate-850 rounded text-slate-300 font-semibold">{g}</span>
                      ))
                    ) : (
                      <span className="text-[9px] text-slate-600 italic">Sem turmas vinculadas</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-1.5 pt-1.5 border-t border-slate-900">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAllocatingTeacher(t);
                    }}
                    className="flex-1 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-300 hover:text-white rounded-lg font-bold text-[9px] transition-all flex items-center justify-center gap-1"
                  >
                    <CheckSquare className="w-3 h-3" /> Turmas / Aulas
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick(t);
                    }}
                    className="px-2.5 py-1.5 bg-blue-950/20 hover:bg-blue-900/30 border border-blue-900/30 text-blue-400 rounded-lg font-bold text-[9px] transition-all flex items-center justify-center gap-1"
                  >
                    <Settings className="w-3 h-3" /> Disponibilidade
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* QUICK REGISTRATION MODAL */}
      {isNewTeacherModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateTeacher} className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-sm p-6 text-left space-y-4 shadow-2xl animate-fade-in text-white">
            <div className="flex items-center justify-between border-b border-slate-850 pb-2">
              <h3 className="font-serif text-base font-bold text-[#D4AF37] uppercase tracking-wide">
                Cadastrar Novo Professor
              </h3>
              <button 
                type="button"
                onClick={() => setIsNewTeacherModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold font-mono">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Prof. Rebeca Andrade"
                  value={newTeacherForm.name}
                  onChange={(e) => setNewTeacherForm({ ...newTeacherForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold font-mono">Disciplina Principal</label>
                  <select
                    value={newTeacherForm.subject}
                    onChange={(e) => setNewTeacherForm({ ...newTeacherForm, subject: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white outline-none"
                  >
                    <option value="Português">Português</option>
                    <option value="Matemática">Matemática</option>
                    <option value="História">História</option>
                    <option value="Geografia">Geografia</option>
                    <option value="Ciências">Ciências</option>
                    <option value="Arte">Arte</option>
                    <option value="Educação Física">Educação Física</option>
                    <option value="Inglês">Inglês</option>
                    <option value="Química">Química</option>
                    <option value="Física">Física</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold font-mono">Carga Semanal (Hrs)</label>
                  <input
                    type="number"
                    value={newTeacherForm.weeklyClasses}
                    onChange={(e) => setNewTeacherForm({ ...newTeacherForm, weeklyClasses: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold font-mono">Vincular Turmas</label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-900 border border-slate-800 rounded-xl max-h-24 overflow-y-auto">
                  {classes.map(c => {
                    const isSelected = newTeacherForm.grades?.includes(c.name);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          const current = newTeacherForm.grades || [];
                          const next = current.includes(c.name) ? current.filter(g => g !== c.name) : [...current, c.name];
                          setNewTeacherForm({ ...newTeacherForm, grades: next });
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${
                          isSelected ? 'bg-blue-600/20 border-blue-500 text-blue-300' : 'bg-slate-950 border-slate-850 text-slate-500'
                        }`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-850">
              <button
                type="button"
                onClick={() => setIsNewTeacherModalOpen(false)}
                className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl text-xs shadow-lg"
              >
                Cadastrar Docente
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CLASS ALLOCATION ("TURMAS / AULAS") MODAL */}
      {allocatingTeacher && (() => {
        const contracted: number = allocatingTeacher.weeklyClasses;
        const linked: number = Object.values(tempAllocations).reduce<number>((sum: number, v: any) => sum + Number(v), 0);
        const available: number = contracted - linked;
        
        // Filter classes
        const filteredClasses = classes.filter(c => {
          const matchesSearch = (c.name || '').toLowerCase().includes((allocatingSearchTerm || '').toLowerCase());
          const matchesShift = shiftFilter === 'Todos' || c.shift === shiftFilter;
          const matchesSegment = segmentFilter === 'Todos' || getSegment(c.name) === segmentFilter;
          return matchesSearch && matchesShift && matchesSegment;
        });

        // Group by Turno
        const groupedClasses: Record<string, SmartClass[]> = {};
        filteredClasses.forEach(c => {
          if (!groupedClasses[c.shift]) {
            groupedClasses[c.shift] = [];
          }
          groupedClasses[c.shift].push(c);
        });

        const handleSaveAllocations = () => {
          const updatedGrades = Object.keys(tempAllocations).filter(name => tempAllocations[name] > 0);
          const updatedTeachers = teachers.map(t => {
            if (t.id === allocatingTeacher.id) {
              return {
                ...t,
                grades: updatedGrades,
                classAllocations: tempAllocations
              };
            }
            return t;
          });
          setTeachers(updatedTeachers);

          if (setClasses) {
            const updatedClasses = classes.map(c => {
              const totalAllocated = updatedTeachers.reduce((sum, t) => {
                return sum + (t.classAllocations?.[c.name] || 0);
              }, 0);
              return {
                ...c,
                weeklyClasses: totalAllocated > 0 ? totalAllocated : (c.weeklyClasses || 28)
              };
            });
            setClasses(updatedClasses);
          }
          setAllocatingTeacher(null);
        };

        return (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-slate-950 border border-slate-850 rounded-3xl w-full max-w-2xl p-6 text-left shadow-2xl animate-fade-in text-white max-h-[90vh] flex flex-col space-y-4">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                <div className="space-y-0.5">
                  <h3 className="font-serif text-sm font-bold text-[#D4AF37] uppercase tracking-wide flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-[#D4AF37]" /> Vincular Turmas e Carga Horária
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-2 text-[10.5px] text-slate-400">
                    <span>Professor: <strong className="text-white">{allocatingTeacher.name}</strong></span>
                    <span className="text-slate-600">•</span>
                    <span>Disciplina: <strong className="text-blue-400">{allocatingTeacher.subject}</strong></span>
                  </div>
                </div>
                <button 
                  onClick={() => setAllocatingTeacher(null)}
                  className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress and Stats Block */}
              <div className="bg-slate-900/50 border border-slate-850/60 p-4 rounded-2xl space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 text-center space-y-0.5">
                    <span className="text-[8.5px] uppercase font-bold text-slate-500 font-mono tracking-wider block">Carga Contratada</span>
                    <span className="text-xs font-bold text-white font-mono">{contracted} aulas</span>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 text-center space-y-0.5">
                    <span className="text-[8.5px] uppercase font-bold text-slate-500 font-mono tracking-wider block">Carga Vinculada</span>
                    <span className={`text-xs font-bold font-mono ${linked > contracted ? 'text-rose-400' : 'text-green-400'}`}>{linked} aulas</span>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 text-center space-y-0.5">
                    <span className="text-[8.5px] uppercase font-bold text-slate-500 font-mono tracking-wider block">Disponível</span>
                    <span className={`text-xs font-bold font-mono ${available < 0 ? 'text-rose-400' : 'text-blue-400'}`}>{available} aulas</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono uppercase font-bold">
                    <span>Progresso da Distribuição</span>
                    <span>{Math.min(100, Math.round((linked / contracted) * 100))}%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div 
                      style={{ width: `${Math.min(100, (linked / contracted) * 100)}%` }}
                      className={`transition-all duration-500 h-full ${
                        linked > contracted ? 'bg-rose-500 shadow-lg shadow-rose-500/25' : linked === contracted ? 'bg-amber-500 shadow-lg shadow-amber-500/25' : 'bg-blue-500 shadow-lg shadow-blue-500/25'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Filters Toolbar */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 bg-slate-900/30 p-2.5 rounded-2xl border border-slate-850/60 text-xs">
                {/* Search */}
                <div className="md:col-span-5 relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrar por nome de turma..."
                    value={allocatingSearchTerm}
                    onChange={(e) => setAllocatingSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-1.5 pl-8.5 pr-3 text-[11px] text-white outline-none placeholder:text-slate-500 focus:border-slate-700 transition-colors"
                  />
                </div>

                {/* Shift Filter */}
                <div className="md:col-span-4 flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                  <Filter className="w-3 h-3 text-slate-500 shrink-0" />
                  <span className="text-slate-500 font-bold uppercase text-[8.5px] font-mono shrink-0">Turno</span>
                  <select
                    value={shiftFilter}
                    onChange={(e) => setShiftFilter(e.target.value)}
                    className="bg-slate-950 text-white border-none outline-none font-semibold cursor-pointer text-[11px] py-0.5 w-full"
                  >
                    <option value="Todos" className="bg-slate-950 text-white">Todos</option>
                    <option value="1º Turno" className="bg-slate-950 text-white">1º Turno</option>
                    <option value="2º Turno" className="bg-slate-950 text-white">2º Turno</option>
                    <option value="Integral" className="bg-slate-950 text-white">Integral</option>
                    <option value="3º Turno" className="bg-slate-950 text-white">3º Turno</option>
                  </select>
                </div>

                {/* Segment Filter */}
                <div className="md:col-span-3 flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                  <span className="text-slate-500 font-bold uppercase text-[8.5px] font-mono shrink-0">Segmento</span>
                  <select
                    value={segmentFilter}
                    onChange={(e) => setSegmentFilter(e.target.value)}
                    className="bg-slate-950 text-white border-none outline-none font-semibold cursor-pointer text-[11px] py-0.5 w-full"
                  >
                    <option value="Todos" className="bg-slate-950 text-white">Todos</option>
                    <option value="Fundamental I" className="bg-slate-950 text-white">Fund. I</option>
                    <option value="Fundamental II" className="bg-slate-950 text-white">Fund. II</option>
                    <option value="Ensino Médio" className="bg-slate-950 text-white">Médio</option>
                    <option value="EJA" className="bg-slate-950 text-white">EJA</option>
                  </select>
                </div>
              </div>

              {/* Scrollable Grouped Classes List */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[40vh] min-h-[180px]">
                {Object.keys(groupedClasses).length > 0 ? (
                  Object.keys(groupedClasses).map(turnoName => (
                    <div key={turnoName} className="space-y-2">
                      {/* Group Title Header */}
                      <div className="flex items-center gap-2 px-1">
                        <span className="px-2 py-0.5 rounded text-[8.5px] uppercase font-bold bg-slate-900 border border-slate-800 text-slate-400 font-mono tracking-wider">
                          {turnoName}
                        </span>
                        <div className="h-px bg-slate-900 flex-1" />
                      </div>

                      {/* Classes in group */}
                      <div className="grid grid-cols-1 gap-2">
                        {groupedClasses[turnoName].map(c => {
                          const isAllocated = (tempAllocations[c.name] || 0) > 0;
                          
                          // Calculate class total classes: sum of this teacher's temp allocation + other teachers' allocations
                          const classTotalAulas = teachers.reduce((sum, t) => {
                            if (t.id === allocatingTeacher.id) {
                              return sum + (tempAllocations[c.name] || 0);
                            }
                            return sum + (t.classAllocations?.[c.name] || 0);
                          }, 0);

                          const teacherAllocForThisClass = tempAllocations[c.name] || 0;

                          return (
                            <div 
                              key={c.id}
                              className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                isAllocated 
                                  ? 'bg-blue-950/15 border-blue-900/40 text-white shadow-sm' 
                                  : 'bg-slate-900/40 border-slate-850 text-slate-400 hover:bg-slate-900/60'
                              }`}
                            >
                              {/* Left column: check + name */}
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => handleToggleClass(c.name)}
                                  className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                                    isAllocated 
                                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                                      : 'border-slate-800 bg-slate-950 hover:border-slate-600'
                                  }`}
                                >
                                  {isAllocated && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                                </button>
                                
                                <div className="space-y-0.5 text-left">
                                  <span className="font-serif text-xs font-bold text-white block">
                                    {c.name}
                                  </span>
                                  <div className="flex items-center gap-x-2 text-[10px] text-slate-400 font-mono">
                                    <span>Carga total turma: <strong className="text-slate-300 font-bold">{classTotalAulas} aulas</strong></span>
                                    <span>•</span>
                                    <span>Docente nesta turma: <strong className="text-blue-400 font-bold">{teacherAllocForThisClass} aulas</strong></span>
                                  </div>
                                </div>
                              </div>

                              {/* Right column: count controls */}
                              <div className="flex items-center gap-2 self-end sm:self-auto">
                                <span className="text-[10px] text-slate-500 font-bold font-mono uppercase tracking-wider hidden sm:inline">Aulas Semanais:</span>
                                <div className="flex items-center gap-2.5 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
                                  <button
                                    type="button"
                                    disabled={!isAllocated}
                                    onClick={() => handleDecrement(c.name)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 disabled:opacity-20 disabled:hover:bg-transparent transition-all"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="font-mono font-bold text-xs w-6 text-center text-white">
                                    {teacherAllocForThisClass}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={!isAllocated}
                                    onClick={() => handleIncrement(c.name)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 disabled:opacity-20 disabled:hover:bg-transparent transition-all"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center bg-slate-900/30 border border-slate-850/60 rounded-3xl space-y-1">
                    <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400 font-bold">Nenhuma turma encontrada</p>
                    <p className="text-[10px] text-slate-500 font-medium">Experimente limpar a busca ou mudar os filtros de turno e segmento.</p>
                  </div>
                )}
              </div>

              {/* Bottom Sticky Area (Alerts and Action Buttons) */}
              <div className="border-t border-slate-850 pt-4 space-y-3 shrink-0">
                {linked > contracted && (
                  <div className="p-3 bg-red-950/20 border border-red-900/40 text-red-400 rounded-2xl text-[10.5px] flex items-center gap-2 animate-pulse">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                    <span><strong>Limite semanal atingido!</strong> O professor possui {contracted} aulas contratadas e foram vinculadas {linked} aulas. Não é permitido salvar até corrigir o excesso.</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAllocatingTeacher(null)}
                    className="px-4.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white text-xs font-bold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAllocations}
                    disabled={linked > contracted}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                      linked > contracted
                        ? 'bg-slate-900 text-slate-500 border border-slate-850 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/10'
                    }`}
                  >
                    Salvar Vínculos
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* TEACHER PREFERENCES & RED-CUE AVAILABILITY GRID MODAL */}
      {selectedTeacherId && editingTeacher && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 text-left space-y-5 animate-fade-in max-h-[90vh] overflow-y-auto text-white">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-850">
              <div className="flex items-center gap-3">
                {editingTeacher.avatar ? (
                  <img referrerPolicy="no-referrer" src={editingTeacher.avatar} alt={editingTeacher.name} className="w-10 h-10 rounded-full object-cover border border-slate-800" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                )}
                <div>
                  <h3 className="font-serif text-sm font-bold text-white">{editingTeacher.name}</h3>
                  <p className="text-[10px] text-blue-400 font-mono uppercase font-bold">{editingTeacher.subject}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedTeacherId(null)} 
                className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              
              {/* Left Column: Availabilities & Parameters */}
              <div className="space-y-4">
                
                {/* Available Days Checkboxes (With red unselected cues) */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Dias da Semana Disponíveis</span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {daysList.map(day => {
                      const isAvailable = editingTeacher.availableDays.includes(day);
                      return (
                        <div 
                          key={day} 
                          onClick={() => toggleDayAvailability(day)}
                          className={`flex items-center justify-between cursor-pointer p-2.5 rounded-xl border transition-all ${
                            isAvailable 
                              ? 'bg-green-950/20 border-green-500/40 text-green-300 font-semibold' 
                              : 'bg-red-950/10 border-red-500/30 text-red-400/90 font-medium'
                          }`}
                        >
                          <span className="text-[11px]">{day}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold font-mono border ${
                            isAvailable ? 'bg-green-950 text-green-400 border-green-900/30' : 'bg-red-950 text-red-500 border-red-900/30'
                          }`}>
                            {isAvailable ? 'Disponível' : 'Indisponível'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Hours constraints */}
                <div className="space-y-3 p-3 bg-slate-900/40 rounded-2xl border border-slate-850/50">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-slate-500 font-mono">Máximo de aulas por dia</label>
                    <input
                      type="number"
                      value={editingTeacher.maxClassesPerDay}
                      onChange={(e) => setEditingTeacher({ ...editingTeacher, maxClassesPerDay: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingTeacher.avoidSplitClasses}
                        onChange={(e) => setEditingTeacher({ ...editingTeacher, avoidSplitClasses: e.target.checked })}
                        className="rounded bg-slate-950 border-slate-800 text-blue-500 focus:ring-0 cursor-pointer w-4 h-4"
                      />
                      <span className="text-[10px] text-slate-300">Evitar aulas geminadas</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingTeacher.acceptWindows}
                        onChange={(e) => setEditingTeacher({ ...editingTeacher, acceptWindows: e.target.checked })}
                        className="rounded bg-slate-950 border-slate-800 text-blue-500 focus:ring-0 cursor-pointer w-4 h-4"
                      />
                      <span className="text-[10px] text-slate-300">Aceita janela (gaps)</span>
                    </label>
                  </div>
                </div>

              </div>

              {/* Right Column: Time blocks / Blocked slots */}
              <div className="space-y-4">
                
                {/* Block times slots matrix */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Grade de Horários Ocupados</span>
                  <p className="text-[9.5px] text-slate-400">Indique os blocos horários onde há conflitos e o professor <strong className="text-red-400">NÃO pode lecionar</strong>.</p>
                  
                  <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {daysList.map(d => (
                      <div key={d} className="space-y-1 p-1 bg-slate-950/40 rounded-xl border border-slate-900">
                        <span className="text-[8.5px] font-bold text-slate-400 uppercase block font-mono text-center border-b border-slate-900 pb-1">{d}</span>
                        {getActiveSlots().map(t => {
                          const isBlocked = editingTeacher.unavailableTimes.some(ut => ut.day === d && ut.time === t);
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => toggleUnavailableTime(d, t)}
                              className={`w-full p-1 text-[8px] text-center rounded border transition-all ${
                                isBlocked 
                                  ? 'bg-red-950/30 border-red-500/40 text-red-400 font-bold' 
                                  : 'bg-slate-900 border-slate-850/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                              }`}
                            >
                              {t.split(' ')[0]} {isBlocked ? '✕' : '✓'}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preference choice */}
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono block">Preferência de Carga</span>
                  <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                    {['Primeiro horário', 'Último horário', 'Nenhuma'].map(pref => {
                      const active = editingTeacher.preference === pref;
                      return (
                        <button
                          key={pref}
                          type="button"
                          onClick={() => setEditingTeacher({ ...editingTeacher, preference: pref as any })}
                          className={`p-2 rounded-xl text-center font-bold border transition-all ${
                            active 
                              ? 'bg-blue-600/10 border-blue-500 text-blue-300' 
                              : 'bg-slate-900 border-slate-850 text-slate-500 hover:bg-slate-850'
                          }`}
                        >
                          {pref}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-850 text-xs">
              <button
                onClick={() => setSelectedTeacherId(null)}
                className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTeacherDetails}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl shadow-lg"
              >
                Confirmar Configurações
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: VINCULAR DOCENTE À TURMA / HORÁRIO */}
      {isLinkModalOpen && linkingTeacher && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 text-left space-y-5 animate-fade-in text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-850">
              <div className="flex items-center gap-2.5">
                <Award className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="font-serif text-base font-bold text-white">Vincular Docente à Turma</h3>
              </div>
              <button 
                onClick={() => setIsLinkModalOpen(false)} 
                className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-400 leading-relaxed">
              Defina a turma, disciplina e atribuições semanais do professor <strong>{linkingTeacher.name}</strong>.
            </div>

            <form onSubmit={handleSaveLinkClass} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Série / Turma</label>
                  <input
                    type="text"
                    required
                    value={linkForm.grade}
                    onChange={(e) => setLinkForm({ ...linkForm, grade: e.target.value })}
                    placeholder="Ex: 9º Ano A"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Disciplina</label>
                  <input
                    type="text"
                    required
                    value={linkForm.subject}
                    onChange={(e) => setLinkForm({ ...linkForm, subject: e.target.value })}
                    placeholder="Ex: Matemática"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Turno / Período</label>
                  <select
                    value={linkForm.shift}
                    onChange={(e) => setLinkForm({ ...linkForm, shift: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#D4AF37]"
                  >
                    <option value="Matutino">Matutino</option>
                    <option value="Vespertino">Vespertino</option>
                    <option value="Noturno">Noturno</option>
                    <option value="Integral">Integral</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Sala de Aula</label>
                  <input
                    type="text"
                    value={linkForm.room}
                    onChange={(e) => setLinkForm({ ...linkForm, room: e.target.value })}
                    placeholder="Ex: Sala 14"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Aulas Semanais</label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={linkForm.weeklyClasses}
                    onChange={(e) => setLinkForm({ ...linkForm, weeklyClasses: parseInt(e.target.value) || 4 })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Ano Letivo</label>
                  <input
                    type="text"
                    value={linkForm.year}
                    onChange={(e) => setLinkForm({ ...linkForm, year: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-850 justify-end">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded-xl font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D4AF37] hover:bg-[#c5a030] text-slate-950 font-bold rounded-xl transition-all"
                >
                  Confirmar Vínculo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
