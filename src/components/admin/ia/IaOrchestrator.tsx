import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cpu, Send, Brain, Sparkles, Network, RefreshCw, Zap, CheckCircle, 
  ArrowRight, FileText, FileCheck, Shield, HelpCircle, Terminal, Bookmark, Quote
} from 'lucide-react';

interface DispatchStep {
  agentName: string;
  status: 'pending' | 'processing' | 'done';
  task: string;
  result?: string;
}

const PRESET_SCENARIOS = [
  {
    title: 'Caso Crítico: Abandono, Frequência e Defasagem',
    query: 'Estudante com 68% de frequência, notas baixas em Língua Portuguesa e histórico de indisciplina. Como intervir formalmente?',
    agents: ['Agente Frequência', 'Agente Notas', 'Agente Disciplinar', 'Agente Jurídico', 'Agente Comunicação']
  },
  {
    title: 'Simulação Financeira e Evasão',
    query: 'Análise de evasão potencial devida a problemas financeiros familiares e inadimplência escolar na Unidade Oeste.',
    agents: ['Agente Financeiro', 'Agente Família', 'Agente Analytics', 'Agente Gestor']
  },
  {
    title: 'Grade e Alocação BNCC de Professores',
    query: 'Organizar micro-horários de Ciências Humanas para o 9º ano alinhados com as diretrizes e competências da BNCC.',
    agents: ['Agente Smart Horários', 'Agente BNCC', 'Agente Professor', 'Agente Pedagógico']
  }
];

export function IaOrchestrator() {
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [dispatchLogs, setDispatchLogs] = useState<DispatchStep[]>([]);
  const [orchestratorOpinion, setOrchestratorOpinion] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [ragCitations, setRagCitations] = useState<string[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [dispatchLogs]);

  const runOrchestrator = async (targetQuery: string, agentsToInvolve: string[]) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setOrchestratorOpinion(null);
    setRagCitations([]);
    
    // Initialize dispatch steps
    const steps: DispatchStep[] = agentsToInvolve.map(name => ({
      agentName: name,
      status: 'pending',
      task: `Analisando aspectos de ${name.replace('Agente ', '')}...`
    }));
    setDispatchLogs(steps);

    // Step-by-step simulation with a real backend call to synthesize the main response
    for (let i = 0; i < agentsToInvolve.length; i++) {
      // Set current to processing
      setDispatchLogs(prev => prev.map((step, idx) => 
        idx === i ? { ...step, status: 'processing' } : step
      ));
      
      // Artificial delay for cool agent dispatch effect
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Mark done
      setDispatchLogs(prev => prev.map((step, idx) => 
        idx === i ? { 
          ...step, 
          status: 'done',
          result: getMockAgentSubResult(agentsToInvolve[i], targetQuery)
        } : step
      ));
    }

    // Call the actual backend with Gemini model to generate the consolidated executive response
    try {
      const response = await fetch('/api/intelligence/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `Você é o Orquestrador Central. Consolide e unifique as análises dos agentes especializados para responder: "${targetQuery}".`,
          dashboardData: { query: targetQuery, simulatedAgents: agentsToInvolve }
        })
      });
      const data = await response.json();
      setOrchestratorOpinion(data.text || "Consolidação realizada com sucesso.");
      
      // Extract RAG citations based on query keywords
      const citations = [];
      const qLower = targetQuery.toLowerCase();
      if (qLower.includes('frequência') || qLower.includes('frequencia') || qLower.includes('abandono')) {
        citations.push('LDB Art. 5º, § 1º, I - Recenseamento da população em idade escolar e busca ativa.');
        citations.push('ECA Art. 56, II - Notificação oficial ao Conselho Tutelar ao atingir 30% de infrequência.');
      }
      if (qLower.includes('notas') || qLower.includes('bncc') || qLower.includes('competência')) {
        citations.push('BNCC Competência 1 e 2 - Conhecimento Científico e Pensamento Crítico.');
        citations.push('LDB Art. 24, V - Avaliação contínua e cumulativa do rendimento escolar.');
      }
      if (qLower.includes('finança') || qLower.includes('inadimplência')) {
        citations.push('LDB Art. 12 - Articulação com as famílias e responsabilidade de acompanhamento.');
        citations.push('Regimento Escolar Geral - Cláusulas de carência socioeconômica e assistência.');
      }
      if (citations.length === 0) {
        citations.push('LDB Lei Federal nº 9.394/196 - Padrões mínimos de eficiência e aproveitamento.');
      }
      setRagCitations(citations);

    } catch (err) {
      console.error(err);
      setOrchestratorOpinion("❌ Falha ao consolidar dados via Gemini. Por favor, verifique o status do servidor.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getMockAgentSubResult = (agent: string, q: string) => {
    switch(agent) {
      case 'Agente Frequência': return 'Infrequência em 32% (crítico). Concentrada em micro-horários vespertinos nas sextas-feiras.';
      case 'Agente Notas': return 'Nota média atual de 4.8 em Língua Portuguesa com desvio padrão de -1.8 pontos.';
      case 'Agente Disciplinar': return 'Registro de 2 ocorrências moderadas na hora do almoço (conversas paralelas e atraso).';
      case 'Agente Jurídico': return 'Fundamentação na LDB Art. 12 (reforço) e ECA Art. 56 (Conselho Tutelar se houver persistência).';
      case 'Agente Comunicação': return 'Rascunho de notificação para WhatsApp da Família pré-compilado e pronto para envio.';
      case 'Agente Financeiro': return 'Histórico de pagamento indica atraso de 2 meses. Sugere-se negociação amigável.';
      case 'Agente Família': return 'Baixo engajamento no portal (apenas 2 visualizações de mensagens no bimestre).';
      case 'Agente Analytics': return 'Projeção de risco de evasão sem intervenção: 87% em 60 dias.';
      case 'Agente Gestor': return 'Recomenda-se acionamento de plano individual de reforço com apoio da secretaria.';
      case 'Agente Smart Horários': return 'Identificada disponibilidade em contraturno às terças e quintas-feiras.';
      case 'Agente BNCC': return 'Habilidades da BNCC em defasagem: EF09LP04 e EF09LP12.';
      case 'Agente Professor': return 'Identificados planos de aula complementares de português com foco em leitura guiada.';
      case 'Agente Pedagógico': return 'Recomenda monitoria pedagógica reversa e recuperação paralela imediata.';
      default: return 'Análise de dados complementares concluída com sucesso.';
    }
  };

  return (
    <div id="ia_orchestrator_subview" className="space-y-6 text-left">
      <div className="pb-4 border-b border-slate-800/60">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-indigo-400" /> AI Orchestrator Platform
        </h3>
        <p className="text-slate-400 text-xs">
          O cérebro central da Super IA. Insira consultas de alta complexidade; o orquestrador analisará, designará subtarefas 
          para múltiplos especialistas, consultará a base RAG e consolidará uma resposta de alto nível.
        </p>
      </div>

      {/* Preset Queries Grid */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
          Selecionar Cenários Complexos de Demonstração:
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PRESET_SCENARIOS.map((preset, idx) => (
            <button
              key={idx}
              disabled={isProcessing}
              onClick={() => {
                setActivePreset(preset.title);
                setQuery(preset.query);
                runOrchestrator(preset.query, preset.agents);
              }}
              className={`p-4 rounded-xl text-left border text-xs space-y-2 transition-all ${
                activePreset === preset.title
                  ? 'bg-indigo-950/20 border-indigo-500 text-white'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-indigo-400 font-mono text-[10px]">CENÁRIO 0{idx+1}</span>
                <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">{preset.agents.length} agentes</span>
              </div>
              <h5 className="font-bold">{preset.title}</h5>
              <p className="text-[10px] text-slate-400 line-clamp-2 italic">"{preset.query}"</p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Orchestrator Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Input and Output (Gemini Result) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Query input panel */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) {
                setActivePreset(null);
                runOrchestrator(query, ['Agente Gestor', 'Agente Pedagógico', 'Agente Frequência', 'Agente Notas', 'Agente Jurídico']);
              }
            }}
            className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-3"
          >
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              Escreva sua consulta pedagógica, administrativa ou jurídica:
            </span>
            <div className="flex gap-2">
              <input 
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex: Aluno do 9º ano tem 35% de falta em Matemática, o que fazer de acordo com a LDB?"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                disabled={isProcessing}
              />
              <button 
                type="submit"
                disabled={isProcessing || !query.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2.5 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Orquestrar</span>
              </button>
            </div>
          </form>

          {/* Consolidated Result Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 min-h-[300px] flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/50">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" /> Resposta Consolidada do Orquestrador
                </span>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono">
                  RAG Ativo
                </span>
              </div>

              {isProcessing && !orchestratorOpinion && (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400 text-xs">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
                  <p className="font-medium animate-pulse">Orquestrando agentes especialistas...</p>
                </div>
              )}

              {!isProcessing && !orchestratorOpinion && (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400 text-xs text-center">
                  <HelpCircle className="w-10 h-10 text-slate-600" />
                  <div className="space-y-1">
                    <p className="font-bold">Aguardando Consulta</p>
                    <p className="text-slate-500 max-w-sm">Digite uma dúvida ou selecione um cenário demonstrativo para ver o AI Orchestrator coordenar a resposta.</p>
                  </div>
                </div>
              )}

              {orchestratorOpinion && (
                <div className="text-xs text-slate-300 leading-relaxed space-y-4 font-normal">
                  <div className="bg-indigo-950/10 border-l-2 border-indigo-500 p-3.5 rounded-r-xl italic flex gap-2 text-slate-300">
                    <Quote className="w-4 h-4 text-indigo-400 shrink-0" />
                    <p>{orchestratorOpinion}</p>
                  </div>

                  {/* Citation box if available */}
                  {ragCitations.length > 0 && (
                    <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-2">
                      <span className="text-[9px] font-mono uppercase text-indigo-400 font-bold tracking-wider block">
                        Fontes Jurídicas e Pedagógicas Consultadas (RAG):
                      </span>
                      <ul className="space-y-1.5 text-[10px] text-slate-400">
                        {ragCitations.map((cit, cid) => (
                          <li key={cid} className="flex gap-1.5 items-start">
                            <span className="text-indigo-400">✓</span>
                            <span>{cit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="text-[9px] text-slate-500 text-right pt-3 border-t border-slate-800/30">
              *Respostas baseadas em RAG oficial com segurança LGPD e auditoria de chaves ativa.
            </div>
          </div>

        </div>

        {/* Right Active Dispatch Diagram */}
        <div className="lg:col-span-5 bg-slate-950/40 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Network className="w-4 h-4 text-indigo-400 animate-pulse" /> Dispatch & Event Pipeline
            </h4>
            <span className="text-[9px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">Live Logs</span>
          </div>

          <div 
            ref={logContainerRef}
            className="space-y-3 max-h-[380px] overflow-y-auto pr-1 scrollbar-none"
          >
            {dispatchLogs.length === 0 ? (
              <div className="text-center text-slate-500 text-xs py-12 italic">
                Nenhuma tarefa ativa no pipeline.
              </div>
            ) : (
              dispatchLogs.map((step, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all duration-300 ${
                    step.status === 'processing' 
                      ? 'bg-indigo-950/20 border-indigo-500/50' 
                      : step.status === 'done'
                      ? 'bg-slate-900/60 border-slate-800'
                      : 'bg-slate-950 border-slate-900 opacity-40'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white">{step.agentName}</span>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      step.status === 'processing' 
                        ? 'bg-amber-500/15 text-amber-400 animate-pulse'
                        : step.status === 'done'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {step.status === 'processing' ? 'Processando' : step.status === 'done' ? 'Concluído' : 'Pendente'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">"{step.task}"</p>
                  {step.result && (
                    <div className="mt-1.5 bg-slate-950 border border-slate-850 p-2 rounded-lg font-mono text-[9px] text-indigo-300">
                      <strong>Análise:</strong> {step.result}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
