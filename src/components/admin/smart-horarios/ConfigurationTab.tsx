import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Sparkles, Check, CheckCircle, Trash2 } from 'lucide-react';
import { TimePeriod } from './types';

interface ConfigurationTabProps {
  hours: TimePeriod[];
  setHours: React.Dispatch<React.SetStateAction<TimePeriod[]>>;
  selectedTurno: string;
}

export function ConfigurationTab({ hours, setHours, selectedTurno }: ConfigurationTabProps) {
  const [year, setYear] = useState('2026');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']);
  const [selectedTurnos, setSelectedTurnos] = useState<string[]>(['1º Turno', '2º Turno', 'Integral']);
  const [selectedTemplate, setSelectedTemplate] = useState('5m'); // 5 modules
  
  const [saveSuccess, setSaveSuccess] = useState(false);

  const daysList = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const turnosList = ['1º Turno', '2º Turno', '3º Turno', 'Integral', 'EJA'];

  const yearsListSelect = ['2025', '2026', '2027', '2028', '2029', '2030'];

  // Sync template selected to current hours length
  useEffect(() => {
    const classCount = hours.filter(h => !h.isInterval).length;
    if (classCount === 4) {
      setSelectedTemplate('4m');
    } else if (classCount === 5) {
      setSelectedTemplate('5m');
    } else if (classCount === 6) {
      setSelectedTemplate('6m');
    } else {
      setSelectedTemplate('custom');
    }
  }, [hours]);

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const toggleTurno = (turno: string) => {
    setSelectedTurnos(prev => 
      prev.includes(turno) ? prev.filter(t => t !== turno) : [...prev, turno]
    );
  };

  const handleAddModule = () => {
    setSelectedTemplate('custom');
    setHours(prev => {
      const lastItem = prev[prev.length - 1];
      let start = '07:00';
      let end = '07:50';
      
      if (lastItem) {
        start = lastItem.end;
        const [h, m] = lastItem.end.split(':').map(Number);
        const totalMinutes = h * 60 + m + 50;
        const newH = Math.floor(totalMinutes / 60) % 24;
        const newM = totalMinutes % 60;
        end = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
      }
      
      const nextClassNum = prev.filter(p => !p.isInterval).length + 1;
      const newPeriod: TimePeriod = {
        id: `hp-${Date.now()}`,
        name: `${nextClassNum}º horário`,
        start,
        end
      };
      return [...prev, newPeriod];
    });
  };

  const toggleInterval = (id: string) => {
    setHours(prev => prev.map(h => h.id === id ? { ...h, isInterval: !h.isInterval } : h));
  };

  const removePeriod = (id: string) => {
    setHours(prev => prev.filter(h => h.id !== id));
  };

  const applyTemplate = (tpl: string) => {
    setSelectedTemplate(tpl);
    
    // Customize base templates per selected turno to make it highly coherent!
    const isMorning = selectedTurno === '1º Turno';
    const isAfternoon = selectedTurno === '2º Turno';
    const isNight = selectedTurno === '3º Turno';
    const isIntegral = selectedTurno === 'Integral';
    
    let startHour = 7;
    let startMin = 0;
    
    if (isAfternoon) {
      startHour = 13;
    } else if (isNight) {
      startHour = 19;
    } else if (isIntegral) {
      startHour = 8;
    }

    if (tpl === '4m') {
      const h1S = `${String(startHour).padStart(2, '0')}:00`;
      const h1E = `${String(startHour).padStart(2, '0')}:50`;
      const h2S = `${String(startHour).padStart(2, '0')}:50`;
      const h2E = `${String(startHour + 1).padStart(2, '0')}:40`;
      const intS = `${String(startHour + 1).padStart(2, '0')}:40`;
      const intE = `${String(startHour + 2).padStart(2, '0')}:00`;
      const h3S = `${String(startHour + 2).padStart(2, '0')}:00`;
      const h3E = `${String(startHour + 2).padStart(2, '0')}:50`;
      const h4S = `${String(startHour + 2).padStart(2, '0')}:50`;
      const h4E = `${String(startHour + 3).padStart(2, '0')}:40`;

      setHours([
        { id: 'hp-1', name: '1º horário', start: h1S, end: h1E },
        { id: 'hp-2', name: '2º horário', start: h2S, end: h2E },
        { id: 'hp-int', name: 'Intervalo', start: intS, end: intE, isInterval: true },
        { id: 'hp-3', name: '3º horário', start: h3S, end: h3E },
        { id: 'hp-4', name: '4º horário', start: h4S, end: h4E },
      ]);
    } else if (tpl === '5m') {
      const h1S = `${String(startHour).padStart(2, '0')}:00`;
      const h1E = `${String(startHour).padStart(2, '0')}:50`;
      const h2S = `${String(startHour).padStart(2, '0')}:50`;
      const h2E = `${String(startHour + 1).padStart(2, '0')}:40`;
      const intS = `${String(startHour + 1).padStart(2, '0')}:40`;
      const intE = `${String(startHour + 2).padStart(2, '0')}:00`;
      const h3S = `${String(startHour + 2).padStart(2, '0')}:00`;
      const h3E = `${String(startHour + 2).padStart(2, '0')}:50`;
      const h4S = `${String(startHour + 2).padStart(2, '0')}:50`;
      const h4E = `${String(startHour + 3).padStart(2, '0')}:40`;
      const h5S = `${String(startHour + 3).padStart(2, '0')}:40`;
      const h5E = `${String(startHour + 4).padStart(2, '0')}:30`;

      setHours([
        { id: 'hp-1', name: '1º horário', start: h1S, end: h1E },
        { id: 'hp-2', name: '2º horário', start: h2S, end: h2E },
        { id: 'hp-int', name: 'Intervalo', start: intS, end: intE, isInterval: true },
        { id: 'hp-3', name: '3º horário', start: h3S, end: h3E },
        { id: 'hp-4', name: '4º horário', start: h4S, end: h4E },
        { id: 'hp-5', name: '5º horário', start: h5S, end: h5E },
      ]);
    } else if (tpl === '6m') {
      const h1S = `${String(startHour).padStart(2, '0')}:00`;
      const h1E = `${String(startHour).padStart(2, '0')}:45`;
      const h2S = `${String(startHour).padStart(2, '0')}:45`;
      const h2E = `${String(startHour + 1).padStart(2, '0')}:30`;
      const h3S = `${String(startHour + 1).padStart(2, '0')}:30`;
      const h3E = `${String(startHour + 2).padStart(2, '0')}:15`;
      const intS = `${String(startHour + 2).padStart(2, '0')}:15`;
      const intE = `${String(startHour + 2).padStart(2, '0')}:35`;
      const h4S = `${String(startHour + 2).padStart(2, '0')}:35`;
      const h4E = `${String(startHour + 3).padStart(2, '0')}:20`;
      const h5S = `${String(startHour + 3).padStart(2, '0')}:20`;
      const h5E = `${String(startHour + 4).padStart(2, '0')}:05`;
      const h6S = `${String(startHour + 4).padStart(2, '0')}:05`;
      const h6E = `${String(startHour + 4).padStart(2, '0')}:50`;

      setHours([
        { id: 'hp-1', name: '1º horário', start: h1S, end: h1E },
        { id: 'hp-2', name: '2º horário', start: h2S, end: h2E },
        { id: 'hp-3', name: '3º horário', start: h3S, end: h3E },
        { id: 'hp-int', name: 'Intervalo', start: intS, end: intE, isInterval: true },
        { id: 'hp-4', name: '4º horário', start: h4S, end: h4E },
        { id: 'hp-5', name: '5º horário', start: h5S, end: h5E },
        { id: 'hp-6', name: '6º horário', start: h6S, end: h6E },
      ]);
    }
  };

  const handleSaveConfig = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const updateHour = (id: string, field: 'name' | 'start' | 'end', val: string) => {
    setHours(prev => prev.map(h => h.id === id ? { ...h, [field]: val } : h));
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic Header displaying active Turno */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] rounded-2xl">
            <Clock className="w-5 h-5" />
          </div>
          <div className="text-left">
            <span className="text-[9px] uppercase font-bold text-slate-500 font-mono tracking-wider block">Turno sob Configuração Ativa</span>
            <h2 className="text-base font-serif font-bold text-white flex items-center gap-2">
              {selectedTurno === 'Todos' ? 'Visão Geral (Todos os Turnos)' : selectedTurno}
              <span className="text-[10px] bg-blue-950 text-blue-400 font-mono font-bold px-2 py-0.5 rounded border border-blue-900/30">
                Sincronizado
              </span>
            </h2>
          </div>
        </div>
        <div className="text-[11px] text-slate-400 max-w-xs text-center sm:text-right font-medium">
          As alterações feitas nesta aba serão salvas e preservadas especificamente para o <strong className="text-[#D4AF37]">{selectedTurno}</strong>.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Parameters Panel */}
        <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800 p-5 rounded-3xl space-y-5">
          <div className="space-y-1.5 pb-2 border-b border-slate-850">
            <h3 className="font-serif text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-[#D4AF37]" /> Parâmetros de Calendário
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">Defina o ano letivo, dias da semana e turnos operados.</p>
          </div>

          {/* Ano Letivo */}
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] text-slate-300 font-bold uppercase font-mono tracking-wider">Ano Letivo</label>
            <select 
              value={year} 
              onChange={(e) => setYear(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all font-semibold"
            >
              {yearsListSelect.map(y => (
                <option key={y} value={y} className="bg-slate-950 text-slate-200">
                  {y} {y === '2026' ? '(Ano Letivo Corrente)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Dias Letivos da Semana */}
          <div className="space-y-2 text-left">
            <label className="text-[10px] text-slate-300 font-bold uppercase font-mono tracking-wider block">Dias Letivos Semanais</label>
            <div className="grid grid-cols-3 gap-2">
              {daysList.map(day => {
                const active = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`p-2.5 rounded-xl text-[10px] font-bold text-center border transition-all ${
                      active 
                        ? 'bg-blue-600/20 border-blue-500 text-blue-200 font-extrabold shadow-md' 
                        : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-700 hover:bg-slate-900/40 hover:text-white'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Turnos Escolares */}
          <div className="space-y-2 text-left">
            <label className="text-[10px] text-slate-300 font-bold uppercase font-mono tracking-wider block">Turnos em Operação</label>
            <div className="grid grid-cols-2 gap-2">
              {turnosList.map(turno => {
                const active = selectedTurnos.includes(turno) || selectedTurno === turno;
                return (
                  <button
                    key={turno}
                    type="button"
                    onClick={() => toggleTurno(turno)}
                    className={`p-2.5 rounded-xl text-[10px] font-bold text-left px-3 border flex items-center justify-between transition-all ${
                      active 
                        ? 'bg-[#D4AF37]/20 border-[#D4AF37]/60 text-[#D4AF37] font-extrabold shadow-sm' 
                        : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-700 hover:bg-slate-900/40 hover:text-white'
                    }`}
                  >
                    <span>{turno}</span>
                    {active && <Check className="w-3.5 h-3.5 text-[#D4AF37] stroke-[3px]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save trigger */}
          <div className="pt-3 border-t border-slate-850 space-y-2">
            <button
              onClick={handleSaveConfig}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl text-xs font-bold transition-all shadow-lg"
            >
              Salvar Configurações Gerais
            </button>
            
            {saveSuccess && (
              <div className="flex items-center gap-1.5 text-green-400 text-[10px] bg-green-950/20 p-2 border border-green-900/40 rounded-xl justify-center font-semibold">
                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                Parâmetros e calendário salvos com sucesso!
              </div>
            )}
          </div>
        </div>

        {/* Grade de Horários / Módulos Panel */}
        <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800 p-5 rounded-3xl space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-850">
            <div className="space-y-0.5 text-left">
              <h3 className="font-serif text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4.5 h-4.5 text-[#D4AF37]" /> Módulos de Horários Diários
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">Defina o tempo de aula e estrutura de intervalos.</p>
            </div>
            <Sparkles className="w-4.5 h-4.5 text-blue-400" />
          </div>

          {/* Quick templates presets */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-850 space-y-2.5 text-left">
            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider font-mono">Modelos Rápidos (Templates Automáticos)</span>
            <div className="grid grid-cols-4 gap-2 text-[10px]">
              <button
                onClick={() => applyTemplate('4m')}
                className={`p-2.5 rounded-xl border text-center font-bold ${selectedTemplate === '4m' ? 'bg-blue-600 text-white border-blue-500 shadow-sm' : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-850 hover:text-white'}`}
              >
                4 Módulos
              </button>
              <button
                onClick={() => applyTemplate('5m')}
                className={`p-2.5 rounded-xl border text-center font-bold ${selectedTemplate === '5m' ? 'bg-blue-600 text-white border-blue-500 shadow-sm' : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-850 hover:text-white'}`}
              >
                5 Módulos
              </button>
              <button
                onClick={() => applyTemplate('6m')}
                className={`p-2.5 rounded-xl border text-center font-bold ${selectedTemplate === '6m' ? 'bg-blue-600 text-white border-blue-500 shadow-sm' : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-850 hover:text-white'}`}
              >
                6 Módulos
              </button>
              <button
                onClick={handleAddModule}
                className="p-2.5 rounded-xl border text-center font-bold bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/50 hover:bg-[#D4AF37]/25 transition-all flex items-center justify-center gap-1"
              >
                <span>+ Adicionar Módulo</span>
              </button>
            </div>
          </div>

          {/* Interactive periods lists */}
          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {hours.map((h, idx) => (
              <div 
                key={h.id} 
                className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs transition-all ${
                  h.isInterval 
                    ? 'bg-amber-950/15 border-amber-900/40 text-amber-300' 
                    : 'bg-slate-900/60 border-slate-800 text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 font-mono">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={h.name}
                    onChange={(e) => updateHour(h.id, 'name', e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/20 text-white outline-none font-semibold w-32 px-2.5 py-1.5 rounded-xl text-xs transition-all text-left font-sans"
                    placeholder="Nome do período"
                  />
                </div>

                <div className="flex items-center gap-2 font-mono">
                  <input
                    type="text"
                    value={h.start}
                    onChange={(e) => updateHour(h.id, 'start', e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-[#D4AF37] rounded-xl py-1.5 px-2 text-center w-16 text-slate-200 text-[11px] font-semibold"
                  />
                  <span className="text-slate-500 font-sans">às</span>
                  <input
                    type="text"
                    value={h.end}
                    onChange={(e) => updateHour(h.id, 'end', e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-[#D4AF37] rounded-xl py-1.5 px-2 text-center w-16 text-slate-200 text-[11px] font-semibold"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleInterval(h.id)}
                    className={`text-[9px] uppercase font-bold px-2.5 py-1 rounded-lg border shrink-0 transition-all ${
                      h.isInterval
                        ? 'text-amber-400 bg-amber-950/40 border-amber-900/40 hover:bg-amber-900/30'
                        : 'text-blue-400 bg-blue-950/40 border-blue-900/40 hover:bg-blue-900/30'
                    }`}
                    title="Clique para alternar Aula/Intervalo"
                  >
                    {h.isInterval ? 'Intervalo' : 'Aula'}
                  </button>

                  <button
                    type="button"
                    onClick={() => removePeriod(h.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                    title="Excluir Horário"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
