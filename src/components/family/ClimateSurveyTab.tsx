import React, { useState } from 'react';
import { Star, Send, CheckCircle, Info, Sparkles } from 'lucide-react';

export function ClimateSurveyTab() {
  const [q1, setQ1] = useState(0); // Safety
  const [q2, setQ2] = useState(0); // Comm
  const [q3, setQ3] = useState(0); // Quality
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q1 === 0 || q2 === 0 || q3 === 0) {
      alert('Por favor, avalie todas as perguntas antes de enviar.');
      return;
    }
    setSubmitted(true);
    alert('Agradecemos imensamente seu feedback! Sua pesquisa de clima escolar foi transmitida de forma totalmente anônima para o Comitê de Governança da Escola.');
  };

  const renderStars = (rating: number, setRating: (r: number) => void) => {
    return (
      <div className="flex items-center gap-1.5 mt-2">
        {Array.from({ length: 5 }).map((_, i) => {
          const starVal = i + 1;
          return (
            <button
              type="button"
              key={i}
              onClick={() => setRating(starVal)}
              className="p-1 focus:outline-none transition-transform hover:scale-110"
            >
              <Star 
                className={`w-6 h-6 ${
                  starVal <= rating ? 'fill-current text-gold' : 'text-gray-300'
                }`} 
              />
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
            <Sparkles className="w-5 h-5 text-blue-900" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-oxford">Pesquisa de Clima Escolar — Voz da Família</h3>
            <p className="text-xs text-gray-500">Sua opinião constrói a escola do futuro. Responda ao questionário anual e envie sugestões de melhoria (100% anônimo).</p>
          </div>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-4 max-w-md mx-auto animate-fade-in">
            <div className="w-14 h-14 bg-green-50 rounded-full border border-green-200 flex items-center justify-center mx-auto text-green-600 shadow-md">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-serif text-lg font-bold text-oxford">Obrigado pelo seu Feedback!</h4>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">Sua avaliação anônima foi gravada com sucesso. Os relatórios de clima escolar são consolidados mensalmente para guiar as decisões administrativas e melhorias pedagógicas.</p>
            </div>
            <button 
              onClick={() => {
                setQ1(0); setQ2(0); setQ3(0); setComment(''); setSubmitted(false);
              }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-blue-900 rounded-full text-xs font-bold uppercase tracking-wider transition-colors"
            >
              Responder Novamente
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 text-left">
            
            {/* Disclaimer */}
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-gray-600 leading-relaxed flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-900 shrink-0 mt-0.5" />
              <span>Garantia de Confidencialidade: O Classium Família não salva credenciais de usuários em questionários de pesquisa. Suas respostas são enviadas em pacotes agregados de dados não associados ao seu login.</span>
            </div>

            {/* Q1 */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-oxford uppercase tracking-wide">
                1. Como você avalia a segurança física e o bem-estar dos estudantes nas dependências da escola?
              </label>
              <p className="text-[11px] text-gray-400">Envolve portaria eletrônica, controle de retirantes e monitoramento dos inspetores de recreio.</p>
              {renderStars(q1, setQ1)}
            </div>

            {/* Q2 */}
            <div className="space-y-1 mt-4">
              <label className="text-xs font-bold text-oxford uppercase tracking-wide">
                2. Como você avalia a qualidade da comunicação digital Família-Escola?
              </label>
              <p className="text-[11px] text-gray-400">Envolve o uso deste aplicativo, alertas de urgência em tempo real e tempo de resposta da secretaria.</p>
              {renderStars(q2, setQ2)}
            </div>

            {/* Q3 */}
            <div className="space-y-1 mt-4">
              <label className="text-xs font-bold text-oxford uppercase tracking-wide">
                3. Como você avalia o ensino de inovação e robótica da escola?
              </label>
              <p className="text-[11px] text-gray-400">Envolve os laboratórios pedagógicos, feira de ciências e metodologias escolares adotadas.</p>
              {renderStars(q3, setQ3)}
            </div>

            {/* Comments block */}
            <div className="space-y-1 mt-4">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sugestões de melhoria ou elogio geral (Opcional)</label>
              <textarea 
                rows={3}
                placeholder="Ex: Gostaria de sugerir mais feiras de robótica aos finais de semana para os pais participarem..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl p-3.5 text-xs text-oxford outline-none focus:border-gold resize-none"
              />
            </div>

            <button 
              type="submit"
              className="w-full py-3 bg-blue-900 text-gold hover:opacity-95 rounded-xl text-xs font-bold uppercase tracking-widest transition-opacity border border-gold/20 flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Send className="w-4 h-4 text-gold" /> Enviar Pesquisa Anônima
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
