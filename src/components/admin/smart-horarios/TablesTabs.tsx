import React, { useState } from 'react';
import { SmartClass, SmartSubject, SmartRoom, SmartTeacher } from './types';
import { Plus, Search, Trash2, Edit3, CheckCircle, HelpCircle, Warehouse, GraduationCap, BookOpen, SwatchBook, ShieldAlert } from 'lucide-react';

interface TablesTabsProps {
  classes: SmartClass[];
  subjects: SmartSubject[];
  rooms: SmartRoom[];
  teachers: SmartTeacher[];
  setClasses: React.Dispatch<React.SetStateAction<SmartClass[]>>;
  setSubjects: React.Dispatch<React.SetStateAction<SmartSubject[]>>;
  setRooms: React.Dispatch<React.SetStateAction<SmartRoom[]>>;
  subTab: 'turmas' | 'disciplinas' | 'salas';
}

const PREDEFINED_SUBJECTS = [
  'Português',
  'Matemática',
  'História',
  'Geografia',
  'Ciências',
  'Arte',
  'Educação Física',
  'Inglês',
  'Física',
  'Química',
  'Biologia',
  'Filosofia',
  'Sociologia',
  'Literatura',
  'Redação',
  'Ensino Religioso',
  'Informática',
  'Robótica',
  'Projeto de Vida',
  'Outros (editável)'
];

const COLORS_LIST = [
  { value: 'blue', label: 'Azul' },
  { value: 'darkblue', label: 'Azul Escuro' },
  { value: 'lightblue', label: 'Azul Claro' },
  { value: 'teal', label: 'Turquesa' },
  { value: 'green', label: 'Verde' },
  { value: 'darkgreen', label: 'Verde Escuro' },
  { value: 'lime', label: 'Verde Limão' },
  { value: 'yellow', label: 'Amarelo' },
  { value: 'orange', label: 'Laranja' },
  { value: 'red', label: 'Vermelho' },
  { value: 'bordeau', label: 'Bordô' },
  { value: 'purple', label: 'Roxo' },
  { value: 'lilas', label: 'Lilás' },
  { value: 'gray', label: 'Cinza' },
  { value: 'brown', label: 'Marrom' },
  { value: 'pink', label: 'Rosa' },
  { value: 'black', label: 'Preto' },
  { value: 'white', label: 'Branco' },
  { value: 'cyan', label: 'Ciano' },
  { value: 'gold', label: 'Dourado' }
];

export function TablesTabs({
  classes,
  subjects,
  rooms,
  teachers,
  setClasses,
  setSubjects,
  setRooms,
  subTab,
}: TablesTabsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states for adding/editing items
  const [newClass, setNewClass] = useState<Partial<SmartClass>>({
    name: '',
    anoCiclo: '5º Ano',
    shift: '1º Turno',
    room: 'Sala 08',
    studentsCount: 30,
    coordinator: '',
    status: 'Ativa',
    weeklyClasses: 28
  });

  const [newSubject, setNewSubject] = useState<Partial<SmartSubject>>({
    name: 'Português',
    weeklyClasses: 4,
    defaultTeacherId: '',
    mandatory: true,
    color: 'blue',
    observations: ''
  });

  const [customSubjectName, setCustomSubjectName] = useState('');

  const [newRoom, setNewRoom] = useState<Partial<SmartRoom>>({
    name: '',
    capacity: 30,
    type: 'Sala comum'
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();

    if (subTab === 'turmas' && newClass.name) {
      if (editingId) {
        setClasses(prev => prev.map(c => c.id === editingId ? {
          ...c,
          name: newClass.name!,
          anoCiclo: newClass.anoCiclo || '5º Ano',
          shift: newClass.shift!,
          room: newClass.room || 'Sala 08',
          studentsCount: Number(newClass.studentsCount) || 30,
          coordinator: newClass.coordinator || '',
          weeklyClasses: Number(newClass.weeklyClasses) || 28
        } : c));
      } else {
        setClasses(prev => [...prev, {
          id: `c-${Date.now()}`,
          name: newClass.name!,
          anoCiclo: newClass.anoCiclo || '5º Ano',
          shift: newClass.shift!,
          room: newClass.room || 'Sala 08',
          studentsCount: Number(newClass.studentsCount) || 30,
          coordinator: newClass.coordinator || '',
          status: 'Ativa',
          weeklyClasses: Number(newClass.weeklyClasses) || 28
        }]);
      }
    } else if (subTab === 'disciplinas') {
      const finalSubjectName = newSubject.name === 'Outros (editável)' ? customSubjectName : newSubject.name;
      if (finalSubjectName) {
        if (editingId) {
          setSubjects(prev => prev.map(s => s.id === editingId ? {
            ...s,
            name: finalSubjectName,
            weeklyClasses: Number(newSubject.weeklyClasses) || 4,
            defaultTeacherId: newSubject.defaultTeacherId || '',
            mandatory: !!newSubject.mandatory,
            color: newSubject.color || 'blue',
            observations: newSubject.observations || ''
          } : s));
        } else {
          setSubjects(prev => [...prev, {
            id: `s-${Date.now()}`,
            name: finalSubjectName,
            weeklyClasses: Number(newSubject.weeklyClasses) || 4,
            defaultTeacherId: newSubject.defaultTeacherId || '',
            mandatory: !!newSubject.mandatory,
            color: newSubject.color || 'blue',
            observations: newSubject.observations || ''
          }]);
        }
      }
    } else if (subTab === 'salas' && newRoom.name) {
      if (editingId) {
        setRooms(prev => prev.map(r => r.id === editingId ? {
          ...r,
          name: newRoom.name!,
          capacity: Number(newRoom.capacity) || 30,
          type: newRoom.type as any || 'Sala comum'
        } : r));
      } else {
        setRooms(prev => [...prev, {
          id: `r-${Date.now()}`,
          name: newRoom.name!,
          capacity: Number(newRoom.capacity) || 30,
          type: newRoom.type as any || 'Sala comum'
        }]);
      }
    }

    setIsModalOpen(false);
    setEditingId(null);
    // Reset forms
    setNewClass({ name: '', anoCiclo: '5º Ano', shift: '1º Turno', room: 'Sala 08', studentsCount: 30, coordinator: '', status: 'Ativa', weeklyClasses: 28 });
    setNewSubject({ name: 'Português', weeklyClasses: 4, defaultTeacherId: '', mandatory: true, color: 'blue', observations: '' });
    setCustomSubjectName('');
    setNewRoom({ name: '', capacity: 30, type: 'Sala comum' });
  };

  const startEditClass = (c: SmartClass) => {
    setNewClass({
      name: c.name,
      anoCiclo: c.anoCiclo || '5º Ano',
      shift: c.shift,
      room: c.room,
      studentsCount: c.studentsCount,
      coordinator: c.coordinator,
      status: c.status,
      weeklyClasses: c.weeklyClasses || 28
    });
    setEditingId(c.id);
    setIsModalOpen(true);
  };

  const startEditSubject = (s: SmartSubject) => {
    const isPredefined = PREDEFINED_SUBJECTS.includes(s.name);
    setNewSubject({
      name: isPredefined ? s.name : 'Outros (editável)',
      weeklyClasses: s.weeklyClasses,
      defaultTeacherId: s.defaultTeacherId,
      mandatory: s.mandatory,
      color: s.color,
      observations: s.observations || ''
    });
    if (!isPredefined) {
      setCustomSubjectName(s.name);
    }
    setEditingId(s.id);
    setIsModalOpen(true);
  };

  const startEditRoom = (r: SmartRoom) => {
    setNewRoom({
      name: r.name,
      capacity: r.capacity,
      type: r.type
    });
    setEditingId(r.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (subTab === 'turmas') setClasses(prev => prev.filter(c => c.id !== id));
    if (subTab === 'disciplinas') setSubjects(prev => prev.filter(s => s.id !== id));
    if (subTab === 'salas') setRooms(prev => prev.filter(r => r.id !== id));
  };

  const getSubjectColorClasses = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-600/20 border-blue-500/45 text-blue-300';
      case 'darkblue': return 'bg-indigo-600/20 border-indigo-500/45 text-indigo-300';
      case 'lightblue': return 'bg-cyan-600/20 border-cyan-500/45 text-cyan-300';
      case 'teal': return 'bg-teal-600/20 border-teal-500/45 text-teal-300';
      case 'green': return 'bg-green-600/20 border-green-500/45 text-green-300';
      case 'darkgreen': return 'bg-emerald-600/20 border-emerald-500/45 text-emerald-300';
      case 'lime': return 'bg-lime-600/20 border-lime-500/45 text-lime-300';
      case 'yellow': return 'bg-yellow-600/20 border-yellow-500/45 text-yellow-300';
      case 'orange': return 'bg-orange-600/20 border-orange-500/45 text-orange-300';
      case 'red': return 'bg-red-600/20 border-red-500/45 text-red-300';
      case 'bordeau': return 'bg-rose-950/40 border-rose-800/50 text-rose-300';
      case 'purple': return 'bg-purple-600/20 border-purple-500/45 text-purple-300';
      case 'lilas': return 'bg-fuchsia-600/20 border-fuchsia-500/45 text-fuchsia-300';
      case 'gray': return 'bg-slate-600/20 border-slate-500/45 text-slate-300';
      case 'brown': return 'bg-amber-950/20 border-amber-900/40 text-amber-200';
      case 'pink': return 'bg-pink-600/20 border-pink-500/45 text-pink-300';
      case 'black': return 'bg-slate-950 border border-slate-800 text-slate-400';
      case 'white': return 'bg-slate-100/10 border-slate-200/30 text-white';
      case 'cyan': return 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200';
      case 'gold': return 'bg-yellow-500/10 border-yellow-400/40 text-yellow-200';
      default: return 'bg-slate-800/20 border-slate-700/45 text-slate-300';
    }
  };

  // Filter teachers by the currently selected discipline name
  const filteredTeachersForSubject = teachers.filter(t => {
    const currentSubName = newSubject.name === 'Outros (editável)' ? customSubjectName : newSubject.name;
    return !currentSubName || (t.subject || '').toLowerCase() === (currentSubName || '').toLowerCase();
  });

  return (
    <div className="space-y-4">
      {/* Search and add toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/20 border border-slate-850 p-3 rounded-2xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={`Buscar por nome de ${subTab === 'turmas' ? 'turma' : subTab === 'disciplinas' ? 'disciplina' : 'sala'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 pl-9 pr-4 text-xs text-white outline-none placeholder:text-slate-500"
          />
        </div>
        
        <button
          onClick={() => {
            setEditingId(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-500/25 transition-all"
        >
          <Plus className="w-4 h-4" /> Cadastrar {subTab === 'turmas' ? 'Turma' : subTab === 'disciplinas' ? 'Disciplina' : 'Sala'}
        </button>
      </div>

      {/* Render tables */}
      <div className="overflow-x-auto border border-slate-850 rounded-2xl bg-slate-950/20">
        
        {/* 1. TURMAS TABLE */}
        {subTab === 'turmas' && (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[9px] tracking-wider border-b border-slate-850">
                <th className="p-3">Turma</th>
                <th className="p-3">Ano Letivo / Ciclo</th>
                <th className="p-3">Turno</th>
                <th className="p-3">Nº de Aulas</th>
                <th className="p-3">Sala Física</th>
                <th className="p-3">Alunos</th>
                <th className="p-3">Coordenador / Referência</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {classes
                .filter(c => (c.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()))
                .map(c => (
                  <tr key={c.id} className="hover:bg-slate-900/40 text-slate-300">
                    <td className="p-3 font-serif font-bold text-white text-sm flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-[#D4AF37]" />
                      {c.name}
                    </td>
                    <td className="p-3 font-mono text-[10px] text-blue-400 font-bold">{c.anoCiclo || '5º Ano'}</td>
                    <td className="p-3 font-medium">{c.shift}</td>
                    <td className="p-3 font-bold font-mono text-[#D4AF37]">{c.weeklyClasses || 28} aulas / sem</td>
                    <td className="p-3 font-mono text-[10px] text-slate-400">{c.room}</td>
                    <td className="p-3 font-bold font-mono">{c.studentsCount} alunos</td>
                    <td className="p-3 text-slate-400 font-medium">{c.coordinator || 'Não definido'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[9px] uppercase font-bold bg-green-950 text-green-400 border border-green-900/35">
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => startEditClass(c)}
                          className="px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-800 transition-all flex items-center gap-1 font-bold"
                          title="Editar Turma"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> <span>Editar</span>
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1 text-slate-500 hover:text-rose-500 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {/* 2. DISCIPLINAS TABLE */}
        {subTab === 'disciplinas' && (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[9px] tracking-wider border-b border-slate-850">
                <th className="p-3">Disciplina</th>
                <th className="p-3">Carga Semanal</th>
                <th className="p-3">Professor Principal</th>
                <th className="p-3">Obrigatória</th>
                <th className="p-3">Cor Visual</th>
                <th className="p-3">Observações</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {subjects
                .filter(s => (s.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()))
                .map(s => {
                  const profName = teachers.find(t => t.id === s.defaultTeacherId)?.name || 'Sem docente';
                  return (
                    <tr key={s.id} className="hover:bg-slate-900/40 text-slate-300">
                      <td className="p-3 font-bold text-white flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-blue-400" />
                        {s.name}
                      </td>
                      <td className="p-3 font-semibold font-mono text-slate-300">{s.weeklyClasses} aulas</td>
                      <td className="p-3 text-slate-400 font-medium">{profName}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${s.mandatory ? 'bg-blue-950 text-blue-400 border border-blue-900/30' : 'bg-slate-950 text-slate-500'}`}>
                          {s.mandatory ? 'Sim' : 'Não'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold border ${getSubjectColorClasses(s.color)}`}>
                          {s.color}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 max-w-[150px] truncate">{s.observations || '-'}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => startEditSubject(s)}
                            className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
                            title="Editar Disciplina"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="p-1 text-slate-500 hover:text-rose-500 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        )}

        {/* 3. SALAS TABLE */}
        {subTab === 'salas' && (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[9px] tracking-wider border-b border-slate-850">
                <th className="p-3">Nome da Sala</th>
                <th className="p-3">Capacidade</th>
                <th className="p-3">Tipo de Ambiente</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {rooms
                .filter(r => (r.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()))
                .map(r => (
                  <tr key={r.id} className="hover:bg-slate-900/40 text-slate-300">
                    <td className="p-3 font-serif font-bold text-white text-sm flex items-center gap-1.5">
                      <Warehouse className="w-4 h-4 text-purple-400" />
                      {r.name}
                    </td>
                    <td className="p-3 font-bold font-mono">{r.capacity} alunos</td>
                    <td className="p-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] uppercase font-bold bg-slate-900 text-slate-400 border border-slate-800">
                        {r.type}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => startEditRoom(r)}
                          className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
                          title="Editar Sala"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-1 text-slate-500 hover:text-rose-500 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      {/* POPUP MODAL FOR ADDING/EDITING ITEM */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddItem} className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-sm p-6 text-left space-y-4 shadow-2xl animate-fade-in text-white">
            <h3 className="font-serif text-base font-bold text-[#D4AF37] border-b border-slate-850 pb-2 uppercase tracking-wide text-center">
              {editingId ? '✏ Editar Cadastro:' : '✨ Novo Cadastro:'} {subTab === 'turmas' ? 'Turma' : subTab === 'disciplinas' ? 'Disciplina' : 'Sala'}
            </h3>

            {subTab === 'turmas' && (
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold font-mono">Nome da Turma</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 5º Ano A"
                    value={newClass.name}
                    onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl p-2.5 text-white placeholder:text-slate-600 outline-none focus:border-[#D4AF37]/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold font-mono">Ano Letivo / Ciclo</label>
                    <input
                      type="text"
                      placeholder="Ex: 5º Ano"
                      value={newClass.anoCiclo}
                      onChange={(e) => setNewClass({ ...newClass, anoCiclo: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl p-2.5 text-white outline-none focus:border-[#D4AF37]/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold font-mono">Turno</label>
                    <select
                      value={newClass.shift}
                      onChange={(e) => setNewClass({ ...newClass, shift: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl p-2.5 text-white outline-none focus:border-[#D4AF37]/50"
                    >
                      <option value="1º Turno">1º Turno</option>
                      <option value="2º Turno">2º Turno</option>
                      <option value="3º Turno">3º Turno</option>
                      <option value="Integral">Integral</option>
                      <option value="EJA">EJA</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold font-mono">Estudantes</label>
                    <input
                      type="number"
                      value={newClass.studentsCount}
                      onChange={(e) => setNewClass({ ...newClass, studentsCount: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl p-2.5 text-white outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold font-mono">Aulas Semanais</label>
                    <input
                      type="number"
                      placeholder="Ex: 28"
                      value={newClass.weeklyClasses}
                      onChange={(e) => setNewClass({ ...newClass, weeklyClasses: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl p-2.5 text-white outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold font-mono">Coordenador / Referência da Turma</label>
                  <input
                    type="text"
                    placeholder="Ex: Prof. Carlos / Coord. Amanda"
                    value={newClass.coordinator}
                    onChange={(e) => setNewClass({ ...newClass, coordinator: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl p-2.5 text-white placeholder:text-slate-600 outline-none"
                  />
                </div>
              </div>
            )}

            {subTab === 'disciplinas' && (
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold font-mono">Nome da Disciplina</label>
                  <select
                    value={newSubject.name}
                    onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl p-2.5 text-white outline-none focus:border-[#D4AF37]/50"
                  >
                    {PREDEFINED_SUBJECTS.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                {newSubject.name === 'Outros (editável)' && (
                  <div className="space-y-1 animate-fade-in">
                    <label className="text-[10px] text-blue-400 uppercase font-bold font-mono">Especifique o Nome</label>
                    <input
                      type="text"
                      required
                      placeholder="Digite o nome da disciplina"
                      value={customSubjectName}
                      onChange={(e) => setCustomSubjectName(e.target.value)}
                      className="w-full bg-slate-900 border border-blue-900 rounded-xl p-2.5 text-white outline-none"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold font-mono">Aulas Semanais</label>
                  <input
                    type="number"
                    value={newSubject.weeklyClasses}
                    onChange={(e) => setNewSubject({ ...newSubject, weeklyClasses: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl p-2.5 text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold font-mono">Professor Principal</label>
                  <select
                    value={newSubject.defaultTeacherId}
                    onChange={(e) => setNewSubject({ ...newSubject, defaultTeacherId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl p-2.5 text-white outline-none focus:border-[#D4AF37]/50"
                  >
                    <option value="">Selecione um professor</option>
                    {filteredTeachersForSubject.length > 0 ? (
                      <optgroup label="Professores Especialistas">
                        {filteredTeachersForSubject.map(t => (
                          <option key={t.id} value={t.id}>{t.name} (Especialista)</option>
                        ))}
                      </optgroup>
                    ) : null}
                    <optgroup label="Todos os Professores">
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.subject})</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold font-mono">Etiqueta de Cor</label>
                  <select
                    value={newSubject.color}
                    onChange={(e) => setNewSubject({ ...newSubject, color: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl p-2.5 text-white outline-none"
                  >
                    {COLORS_LIST.map(col => (
                      <option key={col.value} value={col.value}>{col.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold font-mono">Observações / Recomendações</label>
                  <input
                    type="text"
                    placeholder="Ex: Necessita projetor"
                    value={newSubject.observations || ''}
                    onChange={(e) => setNewSubject({ ...newSubject, observations: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl p-2.5 text-white outline-none placeholder:text-slate-600"
                  />
                </div>
              </div>
            )}

            {subTab === 'salas' && (
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold font-mono">Nome/Nº da Sala</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Laboratório Maker"
                    value={newRoom.name}
                    onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl p-2.5 text-white placeholder:text-slate-600 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold font-mono">Capacidade Física</label>
                  <input
                    type="number"
                    value={newRoom.capacity}
                    onChange={(e) => setNewRoom({ ...newRoom, capacity: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl p-2.5 text-white outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold font-mono">Tipo de Ambiente</label>
                  <select
                    value={newRoom.type}
                    onChange={(e) => setNewRoom({ ...newRoom, type: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl p-2.5 text-white outline-none"
                  >
                    <option value="Sala comum">Sala comum</option>
                    <option value="Laboratório">Laboratório</option>
                    <option value="Informática">Informática</option>
                    <option value="Quadra">Quadra</option>
                    <option value="Biblioteca">Biblioteca</option>
                    <option value="Sala Maker">Sala Maker</option>
                    <option value="Laboratório Ciências">Laboratório Ciências</option>
                  </select>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 text-xs border-t border-slate-850">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl shadow-lg"
              >
                {editingId ? 'Salvar Alterações' : 'Confirmar Cadastro'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
