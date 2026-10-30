import React, { useState } from 'react';
import { Bus, MapPin, User, Phone, Shield, Clock, CheckCircle, AlertTriangle, Send } from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';

interface BoardingLog {
  id: string;
  type: 'embarque' | 'desembarque';
  time: string;
  location: string;
  status: 'confirmado' | 'atrasado';
}

export function TransportTab() {
  const { student } = usePlatform();
  const studentShort = student?.name ? student.name.split(' ')[0] : 'Estudante';

  const [notUsingToday, setNotUsingToday] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState('Rota 14 - Pinheiros / Jardins');
  const [absenceReason, setAbsenceReason] = useState('');
  const [absenceSubmitted, setAbsenceSubmitted] = useState(false);

  // Simulated static info
  const driverInfo = {
    name: 'Seu Jorge Silva',
    phone: '(11) 97123-4567',
    avatar: 'https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?auto=format&fit=crop&q=80&w=150',
    licensePlate: 'ABC-5D89',
    busModel: 'Mercedes-Benz LO 916 (Amarelo)'
  };

  const monitorInfo = {
    name: 'Tia Júlia Ramos',
    phone: '(11) 98222-3344',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150'
  };

  const [boardingLogs, setBoardingLogs] = useState<BoardingLog[]>([
    { id: '1', type: 'desembarque', time: '07:42', location: 'Portaria Principal da Escola', status: 'confirmado' },
    { id: '2', type: 'embarque', time: '07:12', location: 'Ponto Residencial (Av. Rebouças, 1200)', status: 'confirmado' },
    { id: '3', type: 'desembarque', time: 'Ontem 18:15', location: 'Ponto Residencial (Av. Rebouças, 1200)', status: 'confirmado' },
    { id: '4', type: 'embarque', time: 'Ontem 17:35', location: 'Portaria Secundária (Saída Escolar)', status: 'confirmado' }
  ]);

  const handleAbsenceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAbsenceSubmitted(true);
    setNotUsingToday(true);
    alert('Aviso enviado ao motorista Seu Jorge e à monitora Tia Júlia em tempo real. O transporte não fará parada em sua residência hoje.');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm text-left">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100">
            <Bus className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-oxford">Gestão e Rastreamento de Transporte Escolar</h3>
            <p className="text-xs text-gray-500">Acompanhe a rota do ônibus de {studentShort} em tempo real, veja horários de embarque/desembarque e notifique ausências.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Status & Live Route Timeline (Col 7) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Live Status Card */}
            <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 rounded-lg text-amber-800">
                  <Bus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Status Atual do Trajeto</h4>
                  <p className="text-sm font-bold text-oxford mt-0.5">
                    {notUsingToday ? 'Ausência Notificada - Não passará hoje' : 'Rota Escolar Finalizada com Sucesso'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {notUsingToday ? 'Você informou que o aluno não utilizará o transporte.' : `${studentShort} já se encontra em sala de aula (Entrada registrada às 07:42).`}
                  </p>
                </div>
              </div>

              {/* Progress Timeline representation */}
              {!notUsingToday && (
                <div className="mt-6 pt-4 border-t border-gray-150/60">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Linha do Tempo da Rota Matutina</p>
                  
                  <div className="relative pl-6 space-y-4">
                    {/* Vertical line connector */}
                    <div className="absolute left-[7px] top-1.5 bottom-1.5 w-[2px] bg-green-200"></div>

                    {/* Step 1 */}
                    <div className="relative">
                      <div className="absolute left-[-23px] top-1 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white shadow-sm flex items-center justify-center"></div>
                      <div className="text-xs">
                        <span className="font-bold text-oxford">07:12 • Embarque Residencial</span>
                        <p className="text-gray-500 font-light text-[11px]">Realizado com identificação digital (QR Code/RFiD do crachá).</p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="relative">
                      <div className="absolute left-[-23px] top-1 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white shadow-sm flex items-center justify-center"></div>
                      <div className="text-xs">
                        <span className="font-bold text-oxford">07:28 • Trânsito em Via Expressa</span>
                        <p className="text-gray-500 font-light text-[11px]">Ônibus trafegando normalmente pela Av. Brigadeiro Luis Antônio.</p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="relative">
                      <div className="absolute left-[-23px] top-1 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white shadow-sm flex items-center justify-center"></div>
                      <div className="text-xs">
                        <span className="font-bold text-oxford">07:42 • Desembarque e Entrada Escolar</span>
                        <p className="text-gray-500 font-light text-[11px]">Entrada autorizada e integrada com a portaria eletrônica Classium.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Boarding Ledger */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-oxford uppercase tracking-widest">Histórico de Embarques de {studentShort}</h4>
              
              <div className="space-y-2">
                {boardingLogs.map((log) => (
                  <div key={log.id} className="p-3.5 bg-slate-50 border border-gray-150 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${log.type === 'embarque' ? 'bg-blue-50 text-blue-800' : 'bg-emerald-50 text-emerald-800'}`}>
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-oxford uppercase text-[10px] tracking-wider block">
                          {log.type === 'embarque' ? '⬆️ Embarque' : '⬇️ Desembarque / Chegada'}
                        </span>
                        <span className="text-gray-600 font-medium">{log.location}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-oxford block">{log.time}</span>
                      <span className="text-[10px] text-green-600 font-bold uppercase">Confirmado</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Side Info & Absence form (Col 5) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Team Contacts */}
            <div className="p-5 bg-slate-50 border border-gray-150 rounded-2xl space-y-4">
              <h4 className="text-xs font-bold text-blue-900 uppercase tracking-widest flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-900" /> Equipe de Transporte Credenciada
              </h4>

              {/* Driver info */}
              <div className="flex items-center gap-3.5 bg-white p-3 border border-gray-150 rounded-xl">
                <img src={driverInfo.avatar} alt={driverInfo.name} className="w-11 h-11 rounded-full object-cover border border-gray-200" referrerPolicy="no-referrer" />
                <div className="text-xs space-y-0.5">
                  <span className="font-bold text-oxford block">{driverInfo.name}</span>
                  <span className="text-[10px] text-gray-400 block uppercase font-medium">Motorista • Placa: {driverInfo.licensePlate}</span>
                  <span className="text-[11px] text-blue-900 font-semibold block">{driverInfo.phone}</span>
                </div>
              </div>

              {/* Monitor info */}
              <div className="flex items-center gap-3.5 bg-white p-3 border border-gray-150 rounded-xl">
                <img src={monitorInfo.avatar} alt={monitorInfo.name} className="w-11 h-11 rounded-full object-cover border border-gray-200" referrerPolicy="no-referrer" />
                <div className="text-xs space-y-0.5">
                  <span className="font-bold text-oxford block">{monitorInfo.name}</span>
                  <span className="text-[10px] text-gray-400 block uppercase font-medium">Monitora Auxiliar</span>
                  <span className="text-[11px] text-blue-900 font-semibold block">{monitorInfo.phone}</span>
                </div>
              </div>
            </div>

            {/* Notify Absence Form */}
            <div className="p-5 bg-white border border-gray-200 rounded-2xl space-y-4">
              <div>
                <h4 className="text-xs font-bold text-red-700 uppercase tracking-widest flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-700" /> Comunicar Ausência de Hoje
                </h4>
                <p className="text-[11px] text-gray-400 mt-1">
                  Se {studentShort} for faltar ou for embora de carro particular com os pais hoje, avise a equipe imediatamente para evitar paradas desnecessárias na rota escolar.
                </p>
              </div>

              {absenceSubmitted ? (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
                  <CheckCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Ausência registrada! A equipe de transporte já foi alertada para seguir viagem.</span>
                </div>
              ) : (
                <form onSubmit={handleAbsenceSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Motivo da Ausência (Opcional)</label>
                    <textarea 
                      rows={2}
                      placeholder="Ex: Aluno doente ou voltará com o pai hoje..."
                      value={absenceReason}
                      onChange={(e) => setAbsenceReason(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl p-3 text-xs text-oxford outline-none focus:border-gold resize-none"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-2.5 bg-red-700 text-white hover:bg-red-800 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5 text-white" />
                    <span>Confirmar Ausência Hoje</span>
                  </button>
                </form>
              )}

              {notUsingToday && (
                <button
                  type="button"
                  onClick={() => { setNotUsingToday(false); setAbsenceSubmitted(false); setAbsenceReason(''); }}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-oxford rounded-xl text-xs font-bold uppercase transition-colors"
                >
                  Reativar Transporte Hoje
                </button>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
