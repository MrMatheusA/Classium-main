import React, { useState } from 'react';
import { Sparkles, MessageSquare, Send, X, Bot, Check, AlertCircle, RefreshCw, Command } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AIAssistantWidgetProps {
  onTriggerCommand: (commandText: string) => void;
}

export function AIAssistantWidget({ onTriggerCommand }: AIAssistantWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<{ sender: 'user' | 'bot'; text: string; logs?: string[] }[]>([
    {
      sender: 'bot',
      text: 'Olá! Sou a Inteligência Artificial do Classium focada em Logística Horária. Como posso otimizar a rotina escolar hoje?'
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const predefinedCommands = [
    "Monte o horário do Ensino Fundamental I.",
    "Evite aulas geminadas de Matemática.",
    "Distribua Educação Física em dias alternados.",
    "Mostre os conflitos do professor Carlos.",
    "Encontre um substituto para a professora Ana na quarta-feira.",
    "Otimize a grade para reduzir janelas dos professores."
  ];

  const handleCommandSubmit = (command: string) => {
    if (!command.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { sender: 'user', text: command }]);
    setInputText('');
    setIsTyping(true);

    // Simulate AI thinking and executing the command
    setTimeout(() => {
      let botResponse = '';
      let logs: string[] = [];

      if (command.includes('Ensino Fundamental')) {
        botResponse = 'Comando processado com sucesso. Montei o pré-cronograma do Ensino Fundamental I respeitando todas as cargas semanais e preferências.';
        logs = [
          '✔ Lendo disciplinas curriculares do EF-I',
          '✔ Analisando 12 restrições de disponibilidade',
          '✔ Otimizando distribuição das aulas de artes e inglês',
          '✔ Salvo na grade rascunho com 100% de aproveitamento'
        ];
      } else if (command.includes('geminadas')) {
        botResponse = 'Entendido. Ajustei as heurísticas de penalidade para aulas geminadas de Matemática. A IA reorganizou a grade priorizando blocos únicos intercalados.';
        logs = [
          '✔ Varrendo turmas: 5º A, 6º A, 7º A',
          '✔ Dissolvendo 4 blocos de aulas geminadas excessivas',
          '✔ Realocando períodos de Matemática no 2º e 4º horários',
          '✔ Zero novos conflitos gerados'
        ];
      } else if (command.includes('Educação Física')) {
        botResponse = 'Comando executado. As aulas de Educação Física foram distribuídas em dias alternados para garantir a absorção pedagógica e o descanso físico dos estudantes.';
        logs = [
          '✔ Identificado padrão semanal de Educação Física',
          '✔ Espaçando aulas entre Quarta e Sexta para o 5º Ano A',
          '✔ Ajustado vínculo de disponibilidade do Prof. Roberto',
          '✔ Grade de turmas atualizada'
        ];
      } else if (command.includes('conflitos') || command.includes('Carlos')) {
        botResponse = 'Análise concluída. O professor Carlos possui 1 conflito potencial na terça-feira por indisponibilidade declarada, mas a IA já sugeriu a correção.';
        logs = [
          '⚠ Terça 07:00: Carlos Eduardo alocado na turma 5º A, mas possui bloqueio médico.',
          '💡 Recomendação: Permutar com Matemática da Profa. Ana.'
        ];
      } else if (command.includes('substituto') || command.includes('Ana')) {
        botResponse = 'Sua solicitação de substituição foi atendida. Encontrei 3 professores qualificados e totalmente disponíveis para cobrir a professora Ana na quarta-feira.';
        logs = [
          '🔎 Buscando docentes qualificados em Ciências Exatas...',
          '👤 Candidato 1: Prof. Marcos (Disponível quarta-feira 09:00) - Recomendado!',
          '👤 Candidato 2: Prof. Elaine (Disponível quarta-feira 10:40)',
          '🔗 Clique em "Substituir" no painel para confirmar o vínculo temporário.'
        ];
      } else {
        botResponse = 'Otimização avançada concluída! Reduzi em 14% a ocorrência de janelas (períodos vagos) para todo o corpo docente.';
        logs = [
          '✔ Varrendo matriz de horários gerais',
          '✔ Compactando blocos de aula de 8 professores',
          '✔ Reduzido tempo ocioso total de 18h para 2h semanais',
          '✔ Grade visual reestruturada com sucesso!'
        ];
      }

      setMessages(prev => [...prev, { sender: 'bot', text: botResponse, logs }]);
      setIsTyping(false);
      onTriggerCommand(command);
    }, 1500);
  };

  return (
    <>
      {/* Floating launcher trigger */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center gap-2 group transition-all hover:scale-105 active:scale-95 border border-purple-400/35"
          title="IA Classium Horários"
        >
          <Bot className="w-5 h-5 animate-bounce group-hover:scale-110 transition-transform" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 font-bold text-xs whitespace-nowrap">
            🤖 IA Classium Horários
          </span>
        </button>
      </div>

      {/* Expanded assistant panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            className="fixed bottom-22 right-6 w-full max-w-sm bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden max-h-[550px] animate-fade-in"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-b border-slate-850 p-4 flex items-center justify-between text-left">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/10">
                  <Bot className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-white text-xs font-bold font-serif flex items-center gap-1">
                    IA Classium Horários
                  </h4>
                  <span className="text-[9px] text-purple-400 font-mono uppercase font-bold tracking-wider">Assistente Inteligente</span>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[300px]">
              {messages.map((m, idx) => {
                const isBot = m.sender === 'bot';
                return (
                  <div key={idx} className={`flex ${isBot ? 'justify-start' : 'justify-end'} text-xs text-left`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl space-y-2 ${isBot ? 'bg-slate-900 border border-slate-850 text-slate-300' : 'bg-purple-600 text-white font-medium'}`}>
                      <p className="leading-relaxed">{m.text}</p>
                      
                      {isBot && m.logs && m.logs.length > 0 && (
                        <div className="pt-2 border-t border-slate-800 space-y-1 text-[10px] font-mono text-slate-400">
                          <span className="text-[8px] uppercase font-bold text-slate-500 flex items-center gap-1"><Command className="w-3 h-3" /> Logs de Execução:</span>
                          {m.logs.map((log, lIdx) => (
                            <p key={lIdx} className="leading-tight">{log}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex justify-start text-xs text-left">
                  <div className="bg-slate-900 border border-slate-850 text-slate-400 p-3 rounded-2xl flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                    <span>IA Classium orquestrando e ajustando as matrizes de conflito...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Predefined prompt commands tags */}
            <div className="p-3 border-t border-slate-850/60 bg-slate-950/40 text-left space-y-1.5">
              <span className="text-[8px] uppercase font-bold text-slate-500 tracking-wider">Sugestões de comandos em linguagem natural</span>
              <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto">
                {predefinedCommands.map(cmd => (
                  <button
                    key={cmd}
                    onClick={() => handleCommandSubmit(cmd)}
                    className="p-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white rounded-lg text-[9px] text-left border border-slate-850/60 transition-colors block w-full truncate font-medium"
                  >
                    💡 {cmd}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Input form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCommandSubmit(inputText);
              }}
              className="p-3 border-t border-slate-850 flex gap-2"
            >
              <input
                type="text"
                placeholder="Ex: Evite aulas geminadas de Português..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
              <button
                type="submit"
                className="p-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl shadow-md flex items-center justify-center shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
