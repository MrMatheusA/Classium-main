import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Settings, Cpu, Server, Shield, DollarSign, Activity, History, CheckCircle, 
  AlertCircle, ChevronRight, Key, ShieldCheck, RefreshCw, BarChart2
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface ModelProvider {
  id: string;
  name: string;
  provider: 'Google' | 'OpenAI' | 'Anthropic' | 'Local';
  status: 'Ativo' | 'Inativo' | 'Standby';
  latency: string;
  costPerMillion: string;
  description: string;
  isSelected: boolean;
}

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  module: string;
  ip: string;
}

const INITIAL_PROVIDERS: ModelProvider[] = [
  { id: 'm1', name: 'Gemini 2.5 Flash (Default)', provider: 'Google', status: 'Ativo', latency: '0.6s', costPerMillion: '$0.075', description: 'Modelo ideal para tarefas rápidas, resumos de frequências e automações de avisos.', isSelected: true },
  { id: 'm2', name: 'Gemini 2.5 Pro (High Precision)', provider: 'Google', status: 'Ativo', latency: '1.4s', costPerMillion: '$1.25', description: 'Recomendado para pareceres jurídicos, orquestrações complexas e análise da BNCC.', isSelected: false },
  { id: 'm3', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', status: 'Standby', latency: '1.6s', costPerMillion: '$3.00', description: 'Alternativa externa de altíssima precisão pedagógica em standby.', isSelected: false },
  { id: 'm4', name: 'GPT-4o mini', provider: 'OpenAI', status: 'Standby', latency: '1.1s', costPerMillion: '$0.15', description: 'Modelo leve para triagem inicial de correspondência.', isSelected: false },
  { id: 'm5', name: 'Llama 3.1 8B (On-Premises)', provider: 'Local', status: 'Inativo', latency: '0.4s', costPerMillion: '$0.00', description: 'Instância local off-line para garantia total de sigilo institucional.', isSelected: false }
];

const INITIAL_AUDITS: AuditLog[] = [
  { id: 'a1', timestamp: 'Hoje, 15:42:10', user: 'Ana Paula (Secretária)', action: 'Consulta Ficha do Aluno', module: 'Secretaria', ip: '192.168.1.42' },
  { id: 'a2', timestamp: 'Hoje, 14:11:05', user: 'Marcos Souza (Diretor)', action: 'Análise de evasão consolidada', module: 'Analytics', ip: '192.168.1.10' },
  { id: 'a3', timestamp: 'Ontem, 16:22:45', user: 'Pr. Gilberto (Professor)', action: 'Criação Plano de Aula BNCC', module: 'Pedagógico', ip: '10.0.0.12' },
  { id: 'a4', timestamp: '24/07/2026, 11:30:12', user: 'Super IA Orchestrator', action: 'Injeção de Contexto RAG', module: 'Frequência', ip: 'localhost' }
];

const costTrendData = [
  { date: '19/07', custo: 0.12, tokens: 420000 },
  { date: '20/07', custo: 0.45, tokens: 1800000 },
  { date: '21/07', custo: 0.38, tokens: 1500000 },
  { date: '22/07', custo: 0.82, tokens: 3200000 },
  { date: '23/07', custo: 1.15, tokens: 4600000 },
  { date: '24/07', custo: 0.95, tokens: 3800000 },
  { date: '25/07', custo: 1.45, tokens: 5800000 }
];

export function IaModelsSettings() {
  const [activeSubTab, setActiveSubTab] = useState<'models' | 'monitoring' | 'audits'>('models');
  const [providers, setProviders] = useState<ModelProvider[]>(INITIAL_PROVIDERS);
  const [audits, setAudits] = useState<AuditLog[]>(INITIAL_AUDITS);
  
  // Custom states
  const [temperature, setTemperature] = useState<number>(0.2);
  const [maxTokens, setMaxTokens] = useState<number>(2048);

  const handleSelectModel = (id: string) => {
    setProviders(prev => prev.map(p => ({
      ...p,
      isSelected: p.id === id
    })));
  };

  return (
    <div id="ia_models_settings_subview" className="space-y-6 text-left">
      
      {/* Subnavigation tab */}
      <div className="flex gap-2 border-b border-slate-800/60 pb-3">
        <button 
          onClick={() => setActiveSubTab('models')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'models' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          Modelos & Provedores
        </button>
        <button 
          onClick={() => setActiveSubTab('monitoring')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'monitoring' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          Análise de Custos & API
        </button>
        <button 
          onClick={() => setActiveSubTab('audits')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'audits' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          Segurança, Auditoria & LGPD
        </button>
      </div>

      {activeSubTab === 'models' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Models selection panel */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-indigo-400 animate-pulse" /> Selecionar Roteador de Modelos
              </h4>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono">Conexão Segura</span>
            </div>

            <div className="space-y-3 pr-1">
              {providers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectModel(p.id)}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${
                    p.isSelected 
                      ? 'bg-indigo-950/20 border-indigo-500 shadow-lg' 
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-750'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h5 className="text-xs font-bold text-white flex items-center gap-2">
                        {p.name}
                        {p.isSelected && <span className="bg-indigo-500 text-white font-mono text-[8px] font-bold px-1.5 py-0.2 rounded-full">ACTIVE</span>}
                      </h5>
                      <p className="text-[10px] text-slate-400 leading-relaxed pr-6">{p.description}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full block ${
                        p.status === 'Ativo' ? 'bg-emerald-500/10 text-emerald-400' : p.status === 'Standby' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {p.status}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono mt-1.5 block">Custos: {p.costPerMillion} / 1M tkn</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Hyperparameters tuning card */}
          <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-indigo-400" /> Parâmetros de Resposta
              </h4>

              <div className="space-y-4">
                {/* Temperature slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono text-slate-400">
                    <span>Temperatura (Criatividade)</span>
                    <span className="font-bold text-[#D4AF37]">{temperature}</span>
                  </div>
                  <input 
                    type="range" 
                    min={0.0} 
                    max={1.0} 
                    step={0.1}
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                    <span>Determinístico (Fatos/Leis)</span>
                    <span>Criativo (Ideias/Planos)</span>
                  </div>
                </div>

                {/* Token cap */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono text-slate-400">
                    <span>Limite de Tokens por Chamada</span>
                    <span className="font-bold text-indigo-400">{maxTokens}</span>
                  </div>
                  <input 
                    type="range" 
                    min={256} 
                    max={8192} 
                    step={256}
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                    <span>Respostas Curtas (256)</span>
                    <span>Conselhos Longos (8192)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[10px] bg-indigo-950/20 border border-indigo-500/20 p-3 rounded-xl mt-6 space-y-1">
              <p className="font-bold text-indigo-400 flex items-center gap-1">
                <Server className="w-3.5 h-3.5" /> Fallback Automatizado
              </p>
              <p className="text-[9px] text-slate-400 leading-relaxed">Se o provedor padrão (Gemini 2.5 Flash) falhar por instabilidade ou atingir o rate limit, o Orquestrador chaveará automaticamente para o Gemini 2.5 Pro sem interromper a experiência.</p>
            </div>
          </div>

        </div>
      )}

      {activeSubTab === 'monitoring' && (
        <div className="space-y-6">
          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-indigo-400 animate-pulse" /> Consumo Mensal Acumulado (Tokens & Custos)
              </h4>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono">Total Acumulado: $4.94</span>
            </div>

            {/* Area chart of API costs */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={costTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', fontSize: '11px' }} />
                  <Area type="monotone" dataKey="custo" name="Custo Diário ($)" stroke="#818cf8" fillOpacity={1} fill="url(#colorCost)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'audits' && (
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#D4AF37]" /> Registros de Auditoria LGPD
              </h4>
              <p className="text-[10px] text-slate-400">Cada consulta realizada à Super IA é permanentemente registrada para auditoria e controle de sigilo de informações de menores.</p>
            </div>
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Encriptado AES-256
            </span>
          </div>

          <div className="space-y-2.5">
            {audits.map((a) => (
              <div key={a.id} className="bg-slate-950 border border-slate-900 p-3 rounded-xl flex flex-col md:flex-row justify-between text-xs md:items-center hover:border-slate-850 transition-all">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{a.user}</span>
                    <span className="bg-slate-800 text-slate-400 text-[9px] px-1.5 py-0.2 rounded font-mono">{a.module}</span>
                  </div>
                  <p className="text-slate-400 font-mono text-[10px]">Ação: {a.action}</p>
                </div>

                <div className="text-left md:text-right text-[10px] text-slate-500 font-mono shrink-0 mt-2 md:mt-0">
                  <p>{a.timestamp}</p>
                  <p className="text-[9px] text-slate-600">IP Origem: {a.ip}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
