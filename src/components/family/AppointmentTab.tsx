import React, { useState } from 'react';
import { Calendar, Clock, Video, UserCheck, CheckCircle, MessageSquare, AlertCircle } from 'lucide-react';

interface Professional {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
  slots: string[];
}

interface MeetingBooked {
  id: string;
  professionalName: string;
  role: string;
  date: string;
  time: string;
  type: 'presencial' | 'video';
  status: 'confirmado' | 'pendente';
  notes?: string;
}

export function AppointmentTab() {
  const [professionals] = useState<Professional[]>([
    {
      id: 'prof-1',
      name: 'Prof. Carlos Eduardo',
      role: 'Professor Titular (História)',
      avatarUrl: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?auto=format&fit=crop&q=80&w=150',
      slots: ['Terça-feira • 15:00', 'Quinta-feira • 16:30']
    },
    {
      id: 'prof-2',
      name: 'Profa. Cláudia Ramos',
      role: 'Coordenadora Pedagógica',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150',
      slots: ['Segunda-feira • 14:00', 'Quarta-feira • 10:00']
    },
    {
      id: 'prof-3',
      name: 'Diretor Roberto Albuquerque',
      role: 'Diretor Geral de Ensino',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150',
      slots: ['Quarta-feira • 11:30']
    }
  ]);

  const [meetings, setMeetings] = useState<MeetingBooked[]>([
    {
      id: 'meet-1',
      professionalName: 'Profa. Cláudia Ramos',
      role: 'Coordenadora Pedagógica',
      date: '23/07/2026',
      time: '14:30',
      type: 'presencial',
      status: 'confirmado',
      notes: 'Conversar sobre o engajamento e as ocorrências de celular do João Pedro.'
    }
  ]);

  const [selectedProf, setSelectedProf] = useState<Professional>(professionals[0]);
  const [selectedSlot, setSelectedSlot] = useState<string>(professionals[0].slots[0]);
  const [meetingType, setMeetingType] = useState<'presencial' | 'video'>('presencial');
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse slot string (e.g. "Terça-feira • 15:00")
    const parts = selectedSlot.split(' • ');
    const dayName = parts[0];
    const time = parts[1] || '15:00';
    
    // Convert slot day into a plausible date next week (e.g., 21/07/2026)
    let simulatedDate = '21/07/2026';
    if (dayName.includes('Segunda')) simulatedDate = '20/07/2026';
    else if (dayName.includes('Terça')) simulatedDate = '21/07/2026';
    else if (dayName.includes('Quarta')) simulatedDate = '22/07/2026';
    else if (dayName.includes('Quinta')) simulatedDate = '23/07/2026';

    const newMeeting: MeetingBooked = {
      id: `meet-${Date.now()}`,
      professionalName: selectedProf.name,
      role: selectedProf.role,
      date: simulatedDate,
      time,
      type: meetingType,
      status: 'confirmado',
      notes: notes.trim() ? notes : 'Feedback geral sobre comportamento e aproveitamento escolar.'
    };

    setMeetings([newMeeting, ...meetings]);
    setSuccess(true);
    setNotes('');
    
    setTimeout(() => {
      setSuccess(false);
    }, 5000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
            <Calendar className="w-5 h-5 text-blue-900" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-oxford">Agendamento de Atendimento Individual</h3>
            <p className="text-xs text-gray-500">Solicite reuniões pedagógicas online ou presenciais com orientadores, coordenadores e diretores de forma automatizada.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Booking Form (Col 7) */}
          <form onSubmit={handleBook} className="lg:col-span-7 space-y-4 text-left">
            {success && (
              <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                <span>Reunião confirmada com sucesso! O profissional reservou o horário indicado na agenda oficial da escola.</span>
              </div>
            )}

            {/* Select Professional Card Row */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Selecione o Profissional</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {professionals.map(prof => (
                  <div 
                    key={prof.id}
                    onClick={() => {
                      setSelectedProf(prof);
                      setSelectedSlot(prof.slots[0]);
                    }}
                    className={`p-3 rounded-xl border-2 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 ${
                      selectedProf.id === prof.id 
                        ? 'border-blue-900 bg-blue-50/20' 
                        : 'border-gray-150 bg-white hover:border-gray-200'
                    }`}
                  >
                    <img 
                      src={prof.avatarUrl || `https://i.pravatar.cc/150?u=${prof.id}`} 
                      alt={prof.name} 
                      className="w-10 h-10 rounded-full object-cover border border-gray-150"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <p className="text-xs font-bold text-oxford truncate max-w-[120px]">{prof.name}</p>
                      <p className="text-[9px] text-gray-400 uppercase mt-0.5">{prof.role.split(' (')[0]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Select Available Slots */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Horários Disponíveis Próxima Semana</label>
              <select 
                value={selectedSlot}
                onChange={e => setSelectedSlot(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-oxford outline-none focus:border-gold"
              >
                {selectedProf.slots.map((slot, idx) => (
                  <option key={idx} value={slot}>{slot}</option>
                ))}
              </select>
            </div>

            {/* Meeting Type Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">Formato do Atendimento</label>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button"
                  onClick={() => setMeetingType('presencial')}
                  className={`py-2.5 text-xs font-bold uppercase rounded-xl transition-all border ${
                    meetingType === 'presencial' ? 'bg-blue-900 text-gold border-blue-900' : 'text-gray-500 border-gray-200 bg-white'
                  }`}
                >
                  🏫 Presencial na Escola
                </button>
                <button 
                  type="button"
                  onClick={() => setMeetingType('video')}
                  className={`py-2.5 text-xs font-bold uppercase rounded-xl transition-all border ${
                    meetingType === 'video' ? 'bg-blue-900 text-gold border-blue-900' : 'text-gray-500 border-gray-200 bg-white'
                  }`}
                >
                  🎥 Video-chamada (Meet)
                </button>
              </div>
            </div>

            {/* Agenda details */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pauta Principal / Assunto</label>
              <textarea 
                rows={2}
                placeholder="Ex: Gostaria de alinhar as lições de casa de Matemática ou entender os projetos da feira de robótica."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl p-3.5 text-xs text-oxford outline-none focus:border-gold resize-none"
              />
            </div>

            <button 
              type="submit"
              className="w-full py-3 bg-blue-900 text-gold hover:opacity-95 rounded-xl text-xs font-bold uppercase tracking-widest transition-opacity border border-gold/20 shadow-sm"
            >
              Confirmar Agendamento de Reunião
            </button>
          </form>

          {/* Quick Notice Side (Col 5) */}
          <div className="lg:col-span-5 bg-slate-50 border border-gray-150 rounded-2xl p-5 flex flex-col justify-between">
            <div className="space-y-4 text-left">
              <h4 className="text-xs font-bold text-blue-900 uppercase tracking-widest flex items-center gap-1.5">
                <Video className="w-4 h-4 text-blue-900" /> Vantagens do Atendimento Digital
              </h4>
              
              <ul className="space-y-2.5 text-xs text-gray-600 font-light leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-gold mt-0.5">•</span>
                  <span><strong>Praticidade</strong>: Sem deslocamento, a sala virtual do Google Meet é criada automaticamente e enviada por e-mail 15 minutos antes da sessão.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold mt-0.5">•</span>
                  <span><strong>Histórico</strong>: Todas as atas pedagógicas da reunião ficam arquivadas na ficha eletrônica do aluno, com acesso restrito aos responsáveis.</span>
                </li>
              </ul>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2.5 mt-6">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold uppercase tracking-wider text-[9px]">Aviso Importante</p>
                <p className="font-light mt-0.5">Cancelamentos de reuniões devem ser realizados com no mínimo 24 horas de antecedência pelo canal direto da secretaria escolar.</p>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* SCHEDULED MEETINGS LEDGER */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm text-left">
        <h4 className="font-serif text-base font-bold text-oxford mb-4 flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-blue-900" />
          Seu Registro e Histórico de Reuniões
        </h4>

        <div className="space-y-3">
          {meetings.map(meet => (
            <div key={meet.id} className="p-4 bg-gray-50 border border-gray-150 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-oxford">{meet.professionalName}</span>
                  <span className="bg-blue-100 text-blue-900 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">{meet.role}</span>
                </div>
                <p className="text-xs text-gray-500">📅 Agendado para {meet.date} às {meet.time} ({meet.type === 'video' ? '📹 Meet Virtual' : '🏫 Presencial'})</p>
                {meet.notes && <p className="text-xs italic text-gray-500 bg-white/70 p-2 border border-gray-100 rounded-lg mt-1">"Assunto: {meet.notes}"</p>}
              </div>

              <span className="bg-green-100 text-green-800 text-[10px] font-bold px-3 py-1 rounded-full uppercase self-start sm:self-center">
                Atendimento Confirmado
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
