import React from 'react';
import { motion } from 'motion/react';
import { 
  MessageSquare, HelpCircle, Clock, FileText, Cpu, Zap, Target, BarChart3, 
  TrendingUp, Activity, Award, ArrowUpRight, ArrowDownRight, RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell 
} from 'recharts';

interface IaDashboardProps {
  demoMode?: boolean;
}

const mockStats = [
  { label: 'Conversas Ativas', value: '1,248', change: '+12.4%', up: true, desc: 'Sessões simultâneas hoje', icon: MessageSquare, color: 'text-indigo-400 bg-indigo-500/10' },
  { label: 'Perguntas Respondidas', value: '15,820', change: '+18.2%', up: true, desc: 'Consultas resolvidas por IA', icon: HelpCircle, color: 'text-emerald-400 bg-emerald-500/10' },
  { label: 'Tempo Médio Resposta', value: '1.45s', change: '-12.5%', up: true, desc: 'Latência do orquestrador', icon: Clock, color: 'text-amber-400 bg-amber-500/10' },
  { label: 'Documentos Indexados', value: '142', change: '+15.6%', up: true, desc: 'Arquivos na Base de Conhecimento', icon: FileText, color: 'text-cyan-400 bg-cyan-500/10' },
  { label: 'Fluxos Orquestrados', value: '312', change: '+24.1%', up: true, desc: 'Decisões multi-agentes', icon: Cpu, color: 'text-purple-400 bg-purple-500/10' },
  { label: 'Automações Realizadas', value: '840', change: '+8.3%', up: true, desc: 'Ações diretas disparadas', icon: Zap, color: 'text-orange-400 bg-orange-500/10' },
  { label: 'Precisão Avaliada', value: '99.45%', change: '+0.15%', up: true, desc: 'Fator de acerto do RAG', icon: Target, color: 'text-pink-400 bg-pink-500/10' }
];

const moduleUsageData = [
  { name: 'Pedagógico', chamadas: 4850, custo: 2.12 },
  { name: 'Secretaria', chamadas: 3200, custo: 1.45 },
  { name: 'Frequência', chamadas: 2900, custo: 0.98 },
  { name: 'Notas', chamadas: 2450, custo: 0.85 },
  { name: 'Financeiro', chamadas: 1800, custo: 0.95 },
  { name: 'Comunicação', chamadas: 1500, custo: 0.45 },
  { name: 'Estúdio', chamadas: 1200, custo: 1.15 }
];

const performanceOverTime = [
  { hour: '08:00', requisicoes: 140, latencia: 1.1 },
  { hour: '10:00', requisicoes: 380, latencia: 1.3 },
  { hour: '12:00', requisicoes: 290, latencia: 1.5 },
  { hour: '14:00', requisicoes: 520, latencia: 1.4 },
  { hour: '16:00', requisicoes: 410, latencia: 1.2 },
  { hour: '18:00', requisicoes: 190, latencia: 1.1 }
];

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#a855f7', '#f97316', '#ec4899'];

export function IaDashboard({ demoMode }: IaDashboardProps) {
  return (
    <div id="ia_dashboard_subview" className="space-y-6 text-left">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" /> Dashboard Analítico IA
          </h3>
          <p className="text-slate-400 text-xs">Visão em tempo real do volume, desempenho e eficiência operacional da Super IA Classium.</p>
        </div>
        <span className="text-[10px] bg-slate-800 px-2.5 py-1 rounded text-slate-400 font-mono flex items-center gap-1.5 border border-slate-700/50">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" /> Atualizando Live Metrics
        </span>
      </div>

      {/* Grid of 7 Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {mockStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div 
              key={idx} 
              className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-all duration-300"
            >
              <div className="flex justify-between items-start">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider font-mono">
                  {stat.label}
                </span>
                <div className={`${stat.color} p-1.5 rounded-lg shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <h4 className="text-2xl font-black text-white">{stat.value}</h4>
                  <span className={`text-[10px] font-bold flex items-center ${stat.up ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {stat.change}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{stat.desc}</p>
              </div>
            </div>
          );
        })}
        {/* Fill last slot with summary indicator */}
        <div className="bg-gradient-to-br from-indigo-950/40 to-slate-950 border border-indigo-500/20 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-indigo-400 text-[10px] font-bold uppercase tracking-wider font-mono flex items-center gap-1">
            <Award className="w-3.5 h-3.5 animate-pulse" /> S-Level SLA
          </span>
          <div className="mt-2">
            <p className="text-xs text-white font-bold">Disponibilidade Geral</p>
            <h4 className="text-2xl font-black text-indigo-400 mt-1">99.98%</h4>
            <p className="text-[9px] text-slate-400">Tempo de atividade garantido por redundância multi-modelos</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Usage by Module (BarChart) */}
        <div className="md:col-span-7 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-indigo-400" /> Chamadas por Módulo Operacional
            </h4>
            <span className="text-[9px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">Bimestral</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={moduleUsageData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', fontSize: '11px' }} />
                <Bar dataKey="chamadas" name="Nº Chamadas" fill="#6366f1" radius={[4, 4, 0, 0]}>
                  {moduleUsageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Real-time Latency (AreaChart) */}
        <div className="md:col-span-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-amber-400" /> Latência Médias vs Requisições
            </h4>
            <span className="text-[9px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-mono">Live</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceOverTime} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReqs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', fontSize: '11px' }} />
                <Area type="monotone" dataKey="requisicoes" name="Requisições/h" stroke="#f59e0b" fillOpacity={1} fill="url(#colorReqs)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
