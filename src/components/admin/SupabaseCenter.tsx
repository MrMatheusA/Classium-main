import React, { useState, useEffect } from 'react';
import { 
  Database, ShieldCheck, Zap, Key, RefreshCw, Terminal, CheckCircle2, 
  AlertTriangle, Lock, Server, Cpu, Copy, Check, Radio, FileText, 
  UserCheck, HardDrive, Sparkles, ExternalLink, Activity, Layers, Download
} from 'lucide-react';
import { getSupabaseEnvConfig } from '../../lib/supabase/config';
import { supabaseManager } from '../../lib/supabase/client';
import { supabaseAuth } from '../../lib/supabase/auth';
import { supabaseQA, QASuiteSummary } from '../../lib/supabase/qa';
import { supabaseStorage } from '../../lib/supabase/storage';

export function SupabaseCenter() {
  const envConfig = getSupabaseEnvConfig();
  const [qaSummary, setQaSummary] = useState<QASuiteSummary | null>(null);
  const [isRunningQA, setIsRunningQA] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [testEmail, setTestEmail] = useState('gestor@educaplus.com');
  const [testPassword, setTestPassword] = useState('••••••••');
  const [authMsg, setAuthMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const runDiagnostics = async () => {
    setIsRunningQA(true);
    try {
      const summary = await supabaseQA.runFullSuite();
      setQaSummary(summary);
    } finally {
      setIsRunningQA(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const handleTestLogin = async () => {
    setIsAuthLoading(true);
    setAuthMsg(null);
    try {
      const res = await supabaseAuth.signIn({ email: testEmail, password: testPassword });
      if (res.success) {
        setAuthMsg({
          type: 'success',
          text: res.isSimulated 
            ? 'Login simulado com sucesso (Modo de demonstração local ativo).' 
            : `Login efetuado com sucesso no Supabase Auth! User ID: ${res.user?.id}`
        });
      } else {
        setAuthMsg({ type: 'error', text: res.error || 'Erro no teste de login.' });
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleCopySql = () => {
    const sqlText = `-- CLASSIUM SAAS PLATFORM — PRODUCTION SUPABASE POSTGRESQL SCHEMA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Strict Multi-Tenant Isolation for Profiles"
  ON public.profiles FOR ALL
  USING (school_id = (auth.jwt() -> 'user_metadata' ->> 'school_id')::UUID);`;

    navigator.clipboard.writeText(sqlText);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="space-y-6 text-left animate-fade-in text-slate-100 pb-16">
      
      {/* HEADER HERO */}
      <div className="bg-[#08142d] border border-gold/30 rounded-3xl p-6 shadow-2xl space-y-4 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-[10px] font-black uppercase tracking-widest">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>CENTRAL DE INTEGRAÇÃO SUPABASE POSTGRESQL & AUTH</span>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono">
            {envConfig.isConfigured ? (
              <span className="bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                SUPABASE REMOTO CONECTADO
              </span>
            ) : (
              <span className="bg-amber-950/90 border border-amber-500/60 text-amber-300 px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                MODO DE SIMULAÇÃO RESILIENTE LOCAL ATIVO
              </span>
            )}
          </div>
        </div>

        <div>
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-white tracking-wide">
            Painel de Controle e Auditoria Supabase
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-4xl mt-1.5">
            Ambiente de produção preparado para <strong>PostgreSQL, Authentication (GoTrue), Realtime, Storage e Row Level Security (RLS)</strong>.
            As credenciais são lidas exclusivamente por variáveis de ambiente seguras (<code>SUPABASE_URL</code> e <code>SUPABASE_ANON_KEY</code>).
          </p>
        </div>

        {/* Quick Config Pills */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-4 text-slate-300">
            <span>URL: <strong className="text-emerald-400">{envConfig.url}</strong></span>
            <span>Anon Key: <strong className="text-gold">{envConfig.anonKey.slice(0, 14)}...</strong></span>
            <span>Ambiente: <strong className="text-purple-400">{envConfig.environment.toUpperCase()}</strong></span>
          </div>

          <button
            onClick={runDiagnostics}
            disabled={isRunningQA}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunningQA ? 'animate-spin' : ''}`} />
            <span>Executar Bateria de Testes QA</span>
          </button>
        </div>
      </div>

      {/* SYSTEM ARCHITECTURE METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1 shadow">
          <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            <span>Banco de Dados</span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-lg font-mono font-bold text-white">PostgreSQL 15+</p>
          <p className="text-[10px] text-slate-400">Multi-tenant via RLS Enabled</p>
        </div>

        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1 shadow">
          <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            <span>Autenticação</span>
            <Lock className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-lg font-mono font-bold text-white">GoTrue JWT Auth</p>
          <p className="text-[10px] text-slate-400">Sessão Persistente & Refresh</p>
        </div>

        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1 shadow">
          <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            <span>Sincronização</span>
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          </div>
          <p className="text-lg font-mono font-bold text-white">Supabase Realtime</p>
          <p className="text-[10px] text-slate-400">WebSockets & Broadcast Stream</p>
        </div>

        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1 shadow">
          <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            <span>Storage Buckets</span>
            <HardDrive className="w-4 h-4 text-gold" />
          </div>
          <p className="text-lg font-mono font-bold text-white">6 Buckets Ativos</p>
          <p className="text-[10px] text-slate-400">Fotos, PDFs, Logos, Cardápios</p>
        </div>
      </div>

      {/* AUTOMATED QA HEALTHCHECK RESULTS */}
      {qaSummary && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white font-serif flex items-center gap-2">
                <Activity className="w-5 h-5 text-gold" /> Relatório Automático de Diagnóstico QA (Supabase)
              </h3>
              <p className="text-xs text-slate-400">Verificação automática de conexões, auth, realtime, storage e políticas RLS.</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">Última auditoria: {qaSummary.timestamp}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
                qaSummary.overallHealth === 'HEALTHY' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                qaSummary.overallHealth === 'SIMULATED' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                {qaSummary.overallHealth} ({qaSummary.passedCount}/{qaSummary.totalTests} Passaram)
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {qaSummary.results.map((test) => (
              <div 
                key={test.id}
                className="p-4 bg-slate-950 border border-slate-800/90 rounded-2xl space-y-1 text-xs hover:border-gold/30 transition-all"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {test.status === 'passed' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {test.status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                    {test.status === 'failed' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
                    <span className="font-serif font-bold text-white text-xs">{test.name}</span>
                    <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded uppercase font-mono">{test.category}</span>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400">{test.latencyMs}ms</span>
                </div>

                <p className="text-slate-300 text-xs leading-relaxed">{test.details}</p>

                {test.recommendation && (
                  <p className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-500/30 p-2 rounded-xl mt-2 font-mono">
                    💡 <strong>Recomendação:</strong> {test.recommendation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TWO COLUMN INTERACTIVE SUPABASE TESTER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* AUTH TESTER */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white font-serif flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-purple-400" /> Teste Rápido de Autenticação Supabase Auth
            </h3>
            <p className="text-xs text-slate-400">Valide requisições de login e gerenciamento de token JWT.</p>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-mono">E-mail de Usuário</label>
              <input 
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-mono">Senha</label>
              <input 
                type="password"
                value={testPassword}
                onChange={(e) => setTestPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              onClick={handleTestLogin}
              disabled={isAuthLoading}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white rounded-xl font-bold transition-all shadow flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>{isAuthLoading ? 'Autenticando no Supabase...' : 'Testar Autenticação'}</span>
            </button>

            {authMsg && (
              <div className={`p-3 rounded-xl border text-xs font-mono ${
                authMsg.type === 'success' ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40' : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
              }`}>
                {authMsg.text}
              </div>
            )}
          </div>
        </div>

        {/* SCHEMA SQL EXPORTER */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white font-serif flex items-center gap-2">
                <FileText className="w-5 h-5 text-gold" /> Script SQL DDL de Produção para Supabase
              </h3>
              <p className="text-xs text-slate-400">Copie o script completo e execute no SQL Editor do seu projeto Supabase.</p>
            </div>

            <button
              onClick={handleCopySql}
              className="px-3 py-1.5 bg-gold/15 hover:bg-gold/25 text-gold border border-gold/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'Copiado!' : 'Copiar SQL'}</span>
            </button>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 max-h-52 overflow-y-auto text-[11px] font-mono text-slate-300 scrollbar-thin">
            <pre>
{`-- SUPABASE POSTGRESQL MULTI-TENANT SCHEMA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  school_id UUID REFERENCES public.schools(id),
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;`}
            </pre>
          </div>
          <p className="text-[10px] text-slate-400 font-mono">
            O arquivo completo <code>supabase/schema.sql</code> já está salvo no seu repositório.
          </p>
        </div>

      </div>

    </div>
  );
}
