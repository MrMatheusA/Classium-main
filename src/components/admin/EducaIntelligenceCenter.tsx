import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  Building,
  Bus,
  Calendar,
  CheckCircle,
  Database,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Hourglass,
  LayoutGrid,
  Lock,
  Map,
  Network,
  Send,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Users,
  Utensils,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useChartTheme } from '../../theme/PanelThemeContext';
import {
  Badge,
  BrandHero,
  Button,
  Card,
  CardHeader,
  HeroButton,
  HeroEyebrow,
  HeroStats,
  HeroText,
  HeroTitle,
  IconTile,
  PillNav,
  Toggle,
  cx,
  inputCls,
  EASE,
} from '../ui/kit';
import { CountUp } from '../landing/effects';

// Dados de exemplo (troque pela consulta real quando a rede tiver dados)
const METRICS_DB = {
  global: {
    schools: 14,
    students: 4850,
    teachers: 210,
    families: 4200,
    attendance: 91.8,
    performance: 78.4,
    disciplinaryIndex: 94.2,
    commsSent: 15240,
    digitalSignatures: 98.2,
    occurrences: 124,
    documents: 842,
    schedules: 120,
    calendars: 14,
    vehicles: 18,
    transportStudents: 820
  },
  units: [
    { id: 'sede', name: 'Unidade Sede (Centro)', schools: 1, students: 1850, teachers: 78, attendance: 93.1, performance: 81.2, EvasaoRisk: 0.8 },
    { id: 'leste', name: 'Unidade Leste (Z. Leste)', schools: 1, students: 1200, teachers: 52, attendance: 90.4, performance: 74.8, EvasaoRisk: 2.1 },
    { id: 'sul', name: 'Unidade Sul (Z. Sul)', schools: 1, students: 980, teachers: 42, attendance: 91.6, performance: 77.1, EvasaoRisk: 1.4 },
    { id: 'oeste', name: 'Unidade Oeste (Z. Oeste)', schools: 1, students: 820, teachers: 38, attendance: 92.2, performance: 80.5, EvasaoRisk: 1.1 }
  ],
  grades: [
    { id: 'fundamental_i', name: 'Ensino Fundamental I', students: 1950, attendance: 94.6, performance: 83.2, EvasaoRisk: 0.3 },
    { id: 'fundamental_ii', name: 'Ensino Fundamental II', students: 2100, attendance: 90.8, performance: 75.6, EvasaoRisk: 1.8 },
    { id: 'medio', name: 'Ensino Médio', students: 800, attendance: 88.5, performance: 74.1, EvasaoRisk: 2.5 }
  ],
  evolutionData: [
    { month: 'Jan', frequencia: 95.0, rendimento: 72.0, evasaoPrev: 1.9, engajamento: 80.0 },
    { month: 'Fev', frequencia: 94.2, rendimento: 74.5, evasaoPrev: 1.8, engajamento: 82.5 },
    { month: 'Mar', frequencia: 93.1, rendimento: 76.8, evasaoPrev: 1.6, engajamento: 84.1 },
    { month: 'Abr', frequencia: 92.4, rendimento: 77.2, evasaoPrev: 1.5, engajamento: 85.0 },
    { month: 'Mai', frequencia: 91.8, rendimento: 78.4, evasaoPrev: 1.4, engajamento: 86.2 },
    { month: 'Jun', frequencia: 92.0, rendimento: 79.1, evasaoPrev: 1.3, engajamento: 87.5 }
  ],
  subjectsPerformance: [
    { subject: 'Matemática', aprovacao: 68.2, media: 6.2, evasaoCorrelacao: 84 },
    { subject: 'Português', aprovacao: 82.4, media: 7.4, evasaoCorrelacao: 42 },
    { subject: 'História', aprovacao: 88.1, media: 7.9, evasaoCorrelacao: 25 },
    { subject: 'Ciências', aprovacao: 80.5, media: 7.2, evasaoCorrelacao: 48 },
    { subject: 'Física', aprovacao: 64.1, media: 5.9, evasaoCorrelacao: 91 },
    { subject: 'Química', aprovacao: 71.3, media: 6.4, evasaoCorrelacao: 76 }
  ],
  municipalKPIs: [
    { name: 'IDEB Esperado', rede: 6.8, mediaNacional: 5.8, estado: 6.2 },
    { name: 'Índice Evasão', rede: 1.4, mediaNacional: 3.8, estado: 2.9 },
    { name: 'Acesso Digital', rede: 92.5, mediaNacional: 64.0, estado: 78.0 },
    { name: 'Formação Docente', rede: 88.0, mediaNacional: 75.0, estado: 81.0 }
  ],
  auditLogs: [
    { timestamp: '2026-07-26 14:22:15', user: 'Dir. Marcos Silva', action: 'Exportou Relatório de Rendimento Escolar', scope: 'Unidade Sede', ip: '189.120.45.11', device: 'Chrome/Win10' },
    { timestamp: '2026-07-26 13:05:40', user: 'Ped. Ana Oliveira', action: 'Visualizou Painel Preditivo de Evasão', scope: '9º Ano B', ip: '189.120.45.12', device: 'Safari/macOS' },
    { timestamp: '2026-07-26 11:15:22', user: 'Sec. Sandra Rocha', action: 'Anonimizou Boletins p/ Exportação BI', scope: 'Geral', ip: '189.120.45.19', device: 'Firefox/Linux' },
    { timestamp: '2026-07-26 09:30:10', user: 'Super IA Agent', action: 'Gerou Alerta Automático de Infrequência', scope: '8º Ano B', ip: 'Sistema Interno', device: 'SaaS Engine' }
  ]
};

type TabKey = 'cockpit' | 'bi' | 'heatmaps' | 'predictive' | 'reports' | 'super-ia' | 'config';

const TABS: { id: TabKey; label: string; icon: LucideIcon }[] = [
  { id: 'cockpit', label: 'Visão geral', icon: LayoutGrid },
  { id: 'bi', label: 'Comparativos', icon: BarChart3 },
  { id: 'heatmaps', label: 'Mapa de calor', icon: Map },
  { id: 'predictive', label: 'Previsões', icon: TrendingUp },
  { id: 'reports', label: 'Relatórios', icon: FileSpreadsheet },
  { id: 'super-ia', label: 'Perguntar à IA', icon: Brain },
  { id: 'config', label: 'Privacidade', icon: Lock },
];

const REPORT_ITEMS: { key: 'desempenho' | 'evasao' | 'transporte' | 'merenda' | 'ocorrencias' | 'atividades'; label: string; icon: LucideIcon }[] = [
  { key: 'desempenho', label: 'Rendimento por turma', icon: GraduationCap },
  { key: 'evasao', label: 'Frequência e evasão', icon: Activity },
  { key: 'transporte', label: 'Transporte', icon: Bus },
  { key: 'merenda', label: 'Alimentação', icon: Utensils },
  { key: 'ocorrencias', label: 'Ocorrências', icon: ShieldAlert },
  { key: 'atividades', label: 'Uso do app pelas famílias', icon: Users },
];

const FORMATS: { id: 'pdf' | 'excel' | 'word' | 'csv' | 'json'; label: string }[] = [
  { id: 'pdf', label: 'PDF' },
  { id: 'excel', label: 'Excel' },
  { id: 'word', label: 'Word' },
  { id: 'csv', label: 'CSV' },
  { id: 'json', label: 'JSON' },
];

const pct = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const num = (v: number) => v.toLocaleString('pt-BR');

export function EducaIntelligenceCenter() {
  const chart = useChartTheme();
  const [activeTab, setActiveTab] = useState<TabKey>('cockpit');

  // Filtros
  const [filters, setFilters] = useState({
    year: '2026',
    period: '2º Bimestre',
    networkLevel: 'Rede Municipal',
    school: 'Todas as Unidades',
    grade: 'Todas as Séries',
  });

  // Simulações
  const [simulatedIntervention, setSimulatedIntervention] = useState<boolean>(false);
  const [comparisonTargetA, setComparisonTargetA] = useState<string>('sede');
  const [comparisonTargetB, setComparisonTargetB] = useState<string>('leste');

  // Conversa com a IA
  const [queryInput, setQueryInput] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'model'; text: string; timestamp: string }>>([
    {
      role: 'model',
      text: 'Olá! Eu analiso frequência, notas, ocorrências, transporte e comunicação da escola para apontar riscos e sugerir o que fazer. O que você quer saber hoje?',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Relatórios
  const [reportItems, setReportItems] = useState({
    desempenho: true,
    evasao: true,
    transporte: false,
    merenda: false,
    ocorrencias: true,
    atividades: false,
  });
  const [reportFormat, setReportFormat] = useState<'pdf' | 'excel' | 'word' | 'csv' | 'json'>('pdf');
  const [isCompilingReport, setIsCompilingReport] = useState<boolean>(false);
  const [reportProgress, setReportProgress] = useState<number>(0);
  const [reportMessage, setReportMessage] = useState<string>('');

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [chatHistory, isAiLoading]);

  const handleQuerySubmit = async (e?: React.FormEvent, presetQuery?: string) => {
    if (e) e.preventDefault();
    const activeQuery = presetQuery || queryInput;
    if (!activeQuery.trim() || isAiLoading) return;

    const timestamp = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setChatHistory((prev) => [...prev, { role: 'user', text: activeQuery, timestamp }]);
    if (!presetQuery) setQueryInput('');
    setIsAiLoading(true);

    try {
      const response = await fetch('/api/intelligence/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: activeQuery, dashboardData: METRICS_DB, filters }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setChatHistory((prev) => [
        ...prev,
        { role: 'model', text: data.text, timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) },
      ]);
    } catch (err: any) {
      console.error(err);
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'model',
          text: 'Não consegui responder agora. Verifique a conexão e tente de novo em instantes.',
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleGenerateReport = () => {
    setIsCompilingReport(true);
    setReportProgress(0);
    setReportMessage('Reunindo os dados…');

    const steps = [
      { p: 15, m: 'Lendo a frequência do período…' },
      { p: 35, m: 'Cruzando notas com registros disciplinares…' },
      { p: 55, m: 'Calculando riscos de evasão e distorção idade-série…' },
      { p: 80, m: 'Retirando dados pessoais (LGPD)…' },
      { p: 95, m: 'Montando o documento…' },
      { p: 100, m: 'Pronto! Baixando o arquivo…' },
    ];

    let currentStep = 0;
    const interval = window.setInterval(() => {
      if (currentStep < steps.length) {
        setReportProgress(steps[currentStep].p);
        setReportMessage(steps[currentStep].m);
        currentStep++;
      } else {
        window.clearInterval(interval);
        window.setTimeout(() => {
          setIsCompilingReport(false);
          triggerDownload();
        }, 600);
      }
    }, 700);
  };

  const triggerDownload = () => {
    let content = '';
    let filename = '';
    let mimeType = '';
    const timestamp = new Date().toISOString().slice(0, 10);

    if (reportFormat === 'csv' || reportFormat === 'excel') {
      filename = `classium_inteligencia_${timestamp}.csv`;
      mimeType = 'text/csv;charset=utf-8;';
      content = 'RELATÓRIO DE INTELIGÊNCIA PEDAGÓGICA - CLASSIUM\r\n';
      content += `Emitido em:;${new Date().toLocaleDateString('pt-BR')}\r\n`;
      content += `Filtros:;Ano ${filters.year} - ${filters.period} - ${filters.school}\r\n\r\n`;
      content += 'INDICADORES GERAIS\r\n';
      content += 'Escolas;Estudantes;Professores;Famílias;Frequência média;Aproveitamento\r\n';
      content += `${METRICS_DB.global.schools};${METRICS_DB.global.students};${METRICS_DB.global.teachers};${METRICS_DB.global.families};${METRICS_DB.global.attendance}%;${METRICS_DB.global.performance}%\r\n`;
    } else if (reportFormat === 'json') {
      filename = `classium_inteligencia_${timestamp}.json`;
      mimeType = 'application/json';
      content = JSON.stringify(
        {
          title: 'Relatório analítico consolidado',
          timestamp: new Date().toISOString(),
          filters,
          metrics: METRICS_DB.global,
          predictedModel: simulatedIntervention ? 'Com intervenção pedagógica' : 'Tendência atual',
        },
        null,
        2,
      );
    } else {
      filename = `classium_inteligencia_${timestamp}.doc`;
      mimeType = 'application/msword';
      content = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8"><title>Relatório analítico</title></head>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="text-align: center; color: #132238;">Relatório de inteligência pedagógica</h1>
          <hr/>
          <p><strong>Filtro:</strong> ${filters.networkLevel} · ${filters.year} · ${filters.period}</p>
          <h3>Unidades</h3>
          <table border="1" cellpadding="8" style="border-collapse: collapse; width:100%;">
            <tr style="background-color: #f1f5f9;"><th>Unidade</th><th>Estudantes</th><th>Professores</th><th>Frequência</th><th>Aproveitamento</th></tr>
            ${METRICS_DB.units
              .map((u) => `<tr><td>${u.name}</td><td>${u.students}</td><td>${u.teachers}</td><td>${u.attendance}%</td><td>${u.performance}%</td></tr>`)
              .join('')}
          </table>
          <p style="margin-top:20px; font-size:11px; color:#64748b;">Dados de alunos anonimizados conforme a LGPD (Lei nº 13.709/2018).</p>
        </body>
        </html>
      `;
    }

    const blob = new Blob(['﻿' + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getSimulatedEvasao = (baseValue: number) => (simulatedIntervention ? Math.max(0.2, +(baseValue * 0.15).toFixed(1)) : baseValue);
  const getSimulatedRendimento = (baseValue: number) => (simulatedIntervention ? Math.min(99.5, +(baseValue * 1.08).toFixed(1)) : baseValue);

  const unitA = METRICS_DB.units.find((u) => u.id === comparisonTargetA);
  const unitB = METRICS_DB.units.find((u) => u.id === comparisonTargetB);
  const g = METRICS_DB.global;

  return (
    <div className="space-y-6 text-left">
      {/* Hero */}
      <BrandHero>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <HeroEyebrow icon={Brain}>Inteligência pedagógica</HeroEyebrow>
            <HeroTitle highlight="antes de virar problema">Veja os riscos</HeroTitle>
            <HeroText>Frequência, notas, ocorrências e rotina da rede num só lugar, com previsões de evasão e sugestões do que fazer.</HeroText>
          </div>
          <div className="flex flex-col items-start gap-2 lg:items-end">
            <HeroButton icon={Zap} onClick={() => setSimulatedIntervention(!simulatedIntervention)} variant={simulatedIntervention ? 'solid' : 'outline'}>
              {simulatedIntervention ? 'Simulação ligada' : 'Simular intervenção'}
            </HeroButton>
            <span className="text-[12px]" style={{ color: 'var(--sidebar-muted)' }}>
              Números de exemplo até a rede ter histórico suficiente
            </span>
          </div>
        </div>

        <HeroStats
          items={[
            { label: 'Estudantes', value: <CountUp to={g.students} duration={1.2} />, hint: `${g.schools} unidades` },
            { label: 'Frequência média', value: <CountUp to={g.attendance} decimals={1} suffix="%" duration={1.2} />, hint: 'chamadas digitais' },
            { label: 'Aproveitamento', value: pct(getSimulatedRendimento(g.performance)), hint: simulatedIntervention ? 'com intervenção' : 'média das notas' },
            { label: 'Risco de evasão', value: pct(getSimulatedEvasao(1.4)), hint: simulatedIntervention ? 'com intervenção' : 'previsto no ano' },
          ]}
        />
      </BrandHero>

      {/* Filtros */}
      <Card className="!p-4 sm:!p-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <FilterSelect icon={Calendar} label="Ano" value={filters.year} onChange={(v) => setFilters({ ...filters, year: v })}>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </FilterSelect>
          <FilterSelect icon={Hourglass} label="Período" value={filters.period} onChange={(v) => setFilters({ ...filters, period: v })}>
            <option value="1º Bimestre">1º bimestre</option>
            <option value="2º Bimestre">2º bimestre</option>
            <option value="3º Bimestre">3º bimestre</option>
            <option value="4º Bimestre">4º bimestre</option>
            <option value="Geral">Ano todo</option>
          </FilterSelect>
          <FilterSelect icon={Network} label="Rede" value={filters.networkLevel} onChange={(v) => setFilters({ ...filters, networkLevel: v })}>
            <option value="Rede Municipal">Municipal</option>
            <option value="Rede Estadual">Estadual</option>
            <option value="Privada">Privada</option>
          </FilterSelect>
          <FilterSelect icon={Building} label="Unidade" value={filters.school} onChange={(v) => setFilters({ ...filters, school: v })}>
            <option value="Todas as Unidades">Todas</option>
            <option value="Unidade Sede">Sede (Centro)</option>
            <option value="Unidade Leste">Leste</option>
            <option value="Unidade Sul">Sul</option>
            <option value="Unidade Oeste">Oeste</option>
          </FilterSelect>
          <FilterSelect icon={BookOpen} label="Série" value={filters.grade} onChange={(v) => setFilters({ ...filters, grade: v })}>
            <option value="Todas as Séries">Todas</option>
            <option value="Fundamental I">Fundamental I</option>
            <option value="Fundamental II">Fundamental II</option>
            <option value="Ensino Médio">Ensino Médio</option>
            <option value="8º Ano B">8º Ano B</option>
            <option value="9º Ano A">9º Ano A</option>
          </FilterSelect>
        </div>
      </Card>

      <PillNav<TabKey> label="Seções da inteligência" items={TABS} value={activeTab} onChange={setActiveTab} />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="space-y-6"
        >
          {/* ---------------- Visão geral ---------------- */}
          {activeTab === 'cockpit' && (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                <MiniStat icon={Users} label="Professores" value={num(g.teachers)} />
                <MiniStat icon={Users} label="Famílias no app" value={num(g.families)} />
                <MiniStat icon={ShieldCheck} label="Clima escolar" value={pct(g.disciplinaryIndex)} />
                <MiniStat icon={Send} label="Comunicados" value={num(g.commsSent)} />
                <MiniStat icon={FileCheck} label="Boletins assinados" value={pct(g.digitalSignatures)} />
                <MiniStat icon={AlertTriangle} label="Ocorrências" value={num(g.occurrences)} tone="danger" />
                <MiniStat icon={FileText} label="Documentos" value={num(g.documents)} />
                <MiniStat icon={Zap} label="Grades montadas" value={num(g.schedules)} />
                <MiniStat icon={Calendar} label="Calendários" value={num(g.calendars)} />
                <MiniStat icon={Bus} label="Transporte" value={`${g.vehicles} veículos`} hint={`${num(g.transportStudents)} alunos`} />
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader icon={TrendingUp} title="Evolução mês a mês" subtitle="Frequência e aproveitamento da rede" />
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={METRICS_DB.evolutionData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                        <defs>
                          <linearGradient id="eic-freq" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={chart.accent} stopOpacity={0.25} />
                            <stop offset="100%" stopColor={chart.accent} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="eic-rend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={chart.success} stopOpacity={0.2} />
                            <stop offset="100%" stopColor={chart.success} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke={chart.grid} vertical={false} />
                        <XAxis dataKey="month" {...chart.axis} />
                        <YAxis domain={[60, 100]} {...chart.axis} />
                        <Tooltip {...chart.tooltip} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: chart.muted }} />
                        <Area type="monotone" dataKey="frequencia" name="Frequência (%)" stroke={chart.accent} strokeWidth={2.5} fill="url(#eic-freq)" />
                        <Area type="monotone" dataKey="rendimento" name="Aproveitamento (%)" stroke={chart.success} strokeWidth={2.5} fill="url(#eic-rend)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="flex flex-col">
                  <CardHeader icon={Brain} title="Alertas da IA" subtitle="O que merece atenção agora" />
                  <div className="flex-1 space-y-3">
                    <AlertRow tone="danger" title="Queda de frequência no 8º Ano B" text="Faltas concentradas nas sextas-feiras. Vale uma busca ativa com as famílias." />
                    <AlertRow tone="warning" title="Matemática pede reforço" text="As notas baixas em Matemática andam junto com o risco de evasão." />
                  </div>
                  <Button className="mt-5 w-full" variant="secondary" icon={ArrowRight} onClick={() => setActiveTab('super-ia')}>
                    Perguntar à IA
                  </Button>
                </Card>
              </div>
            </>
          )}

          {/* ---------------- Comparativos ---------------- */}
          {activeTab === 'bi' && (
            <>
              <Card>
                <CardHeader icon={BarChart3} title="Comparar unidades" subtitle="Escolha duas unidades para ver lado a lado" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <FilterSelect label="Unidade A" value={comparisonTargetA} onChange={setComparisonTargetA}>
                    {METRICS_DB.units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </FilterSelect>
                  <FilterSelect label="Unidade B" value={comparisonTargetB} onChange={setComparisonTargetB}>
                    {METRICS_DB.units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </FilterSelect>
                </div>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader icon={Activity} title="Radar de gestão" subtitle="Quanto mais longe do centro, melhor" />
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart
                        cx="50%"
                        cy="50%"
                        outerRadius="70%"
                        data={[
                          { subject: 'Frequência', A: unitA?.attendance || 90, B: unitB?.attendance || 90 },
                          { subject: 'Desempenho', A: unitA?.performance || 80, B: unitB?.performance || 80 },
                          { subject: 'Baixa evasão', A: 100 - (unitA?.EvasaoRisk || 1) * 10, B: 100 - (unitB?.EvasaoRisk || 1) * 10 },
                          { subject: 'Professores por aluno', A: 85, B: 65 },
                          { subject: 'Uso do app', A: 92, B: 78 },
                        ]}
                      >
                        <PolarGrid stroke={chart.grid} />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: chart.muted, fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name={unitA?.name || 'A'} dataKey="A" stroke={chart.accent} fill={chart.accent} fillOpacity={0.22} strokeWidth={2} />
                        <Radar name={unitB?.name || 'B'} dataKey="B" stroke={chart.warning} fill={chart.warning} fillOpacity={0.18} strokeWidth={2} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: chart.muted }} />
                        <Tooltip {...chart.tooltip} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card>
                  <CardHeader icon={GraduationCap} title="Por disciplina" subtitle="Aprovação e ligação com a evasão" />
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={METRICS_DB.subjectsPerformance} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barGap={4}>
                        <CartesianGrid stroke={chart.grid} vertical={false} />
                        <XAxis dataKey="subject" {...chart.axis} fontSize={11} />
                        <YAxis {...chart.axis} />
                        <Tooltip {...chart.tooltip} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: chart.muted }} />
                        <Bar dataKey="aprovacao" name="Aprovação (%)" fill={chart.accent} radius={[6, 6, 0, 0]} />
                        <Bar dataKey="evasaoCorrelacao" name="Ligação com evasão (%)" fill={chart.danger} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            </>
          )}

          {/* ---------------- Mapa de calor ---------------- */}
          {activeTab === 'heatmaps' && (
            <div className="grid gap-6 lg:grid-cols-12">
              <Card className="lg:col-span-7">
                <CardHeader icon={Map} title="Mapa de calor das salas" subtitle="Faltas, ocorrências e notas por sala" action={<Badge tone="danger">Atenção: zona leste</Badge>} />
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 25 }).map((_, idx) => {
                    const score = (idx * 17) % 100;
                    const level = score > 80 ? 'Crítico' : score > 55 ? 'Atenção' : score > 25 ? 'Acompanhar' : 'Normal';
                    const bg =
                      score > 80
                        ? chart.danger
                        : score > 55
                          ? chart.warning
                          : score > 25
                            ? `color-mix(in srgb, ${chart.accent} 55%, white)`
                            : 'var(--bg-card-alt)';
                    const strong = score > 25;
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.25, delay: idx * 0.015 }}
                        title={`Sala ${idx + 101} · ${level} · frequência média ${95 - Math.round(score / 5)}%`}
                        className="flex h-14 cursor-default flex-col items-center justify-center rounded-xl text-[12px] font-semibold transition-transform hover:scale-[1.06]"
                        style={{ background: bg, color: strong ? '#fff' : 'var(--text-muted)' }}
                      >
                        {idx + 101}
                        <span className="text-[10px] font-medium opacity-80">{idx % 3 === 0 ? 'Faltas' : idx % 3 === 1 ? 'Ocorr.' : 'Notas'}</span>
                      </motion.div>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-[12px] text-[var(--text-muted)]">
                  {[
                    ['Normal', 'var(--bg-card-alt)'],
                    ['Acompanhar', `color-mix(in srgb, ${chart.accent} 55%, white)`],
                    ['Atenção', chart.warning],
                    ['Crítico', chart.danger],
                  ].map(([l, c]) => (
                    <span key={l} className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded" style={{ background: c, border: '1px solid var(--border)' }} />
                      {l}
                    </span>
                  ))}
                </div>
              </Card>

              <Card className="lg:col-span-5">
                <CardHeader icon={AlertCircle} title="O que o mapa mostra" />
                <p className="text-[14px] leading-relaxed text-[var(--text-body)]">
                  A sala <strong>112</strong> (8º Ano B e salas vizinhas do Fundamental II) concentra o maior desvio do trimestre.
                </p>
                <div className="mt-4 space-y-2.5">
                  <IntensityRow label="Faltas às sextas" value={88} color={chart.danger} />
                  <IntensityRow label="Ocorrências na portaria" value={62} color={chart.warning} />
                  <IntensityRow label="Comunicação com famílias" value={94} color={chart.accent} />
                </div>
              </Card>
            </div>
          )}

          {/* ---------------- Previsões ---------------- */}
          {activeTab === 'predictive' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <HorizonCard horizon="30 dias" title="Curto prazo" tone="success" status="Sem riscos graves">
                  Frequência estável. Pode haver queda pontual no Fundamental II por causa dos recessos.
                </HorizonCard>
                <HorizonCard horizon="90 dias" title="Fim do bimestre" tone="warning" status={`${getSimulatedEvasao(4)} alunos em alerta`}>
                  Cerca de {getSimulatedEvasao(1.8)}% dos alunos com faltas em nível de risco, ligadas a notas baixas.
                </HorizonCard>
                <HorizonCard horizon="180 dias" title="Carga dos professores" tone="warning" status="Intervenção indicada">
                  12% dos professores de exatas podem ficar sobrecarregados com as recuperações.
                </HorizonCard>
                <HorizonCard horizon="1 ano" title="IDEB" tone="success" status="Tendência de alta">
                  Com as intervenções em dia, a projeção é chegar a 6,8 no IDEB.
                </HorizonCard>
              </div>

              <Card>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <IconTile icon={Zap} />
                    <div>
                      <h3 className="text-[17px] font-semibold text-[var(--text-heading)]">E se a escola agir hoje?</h3>
                      <p className="text-[13px] text-[var(--text-muted)]">Simula busca ativa e reforço escolar começando agora.</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-3 text-[14px] font-medium text-[var(--text-heading)]">
                    Simular intervenção
                    <Toggle label="Simular intervenção" checked={simulatedIntervention} onChange={setSimulatedIntervention} />
                  </label>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <CompareBox label="Evasão prevista" value={pct(getSimulatedEvasao(1.4))} note={simulatedIntervention ? 'risco 85% menor' : 'tendência atual'} good={simulatedIntervention} />
                  <CompareBox label="Notas acima da média" value={pct(getSimulatedRendimento(78.4))} note={simulatedIntervention ? '+8% com reforço' : 'sem reforço'} good={simulatedIntervention} />
                </div>
              </Card>
            </>
          )}

          {/* ---------------- Relatórios ---------------- */}
          {activeTab === 'reports' && (
            <Card>
              <CardHeader icon={FileSpreadsheet} title="Montar relatório" subtitle="Escolha o que entra e o formato do arquivo" />

              <p className="mb-3 text-[13px] font-semibold text-[var(--text-heading)]">1. O que entra no relatório</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {REPORT_ITEMS.map((it) => {
                  const on = reportItems[it.key];
                  const Icon = it.icon;
                  return (
                    <button
                      key={it.key}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => setReportItems({ ...reportItems, [it.key]: !on })}
                      className={cx(
                        'flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-[14px] font-medium transition-all',
                        on ? 'border-[var(--accent)] text-[var(--text-heading)]' : 'border-[var(--border)] text-[var(--text-body)] hover:border-[var(--accent)]',
                      )}
                      style={on ? { background: 'var(--accent-soft)' } : undefined}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" style={{ color: on ? 'var(--accent)' : 'var(--text-muted)' }} />
                      <span className="flex-1">{it.label}</span>
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded-md border"
                        style={on ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: 'var(--accent-fg)' } : { borderColor: 'var(--border)' }}
                      >
                        {on && <CheckCircle className="h-3.5 w-3.5" />}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="mb-3 mt-6 text-[13px] font-semibold text-[var(--text-heading)]">2. Formato</p>
              <div className="inline-flex flex-wrap gap-1 rounded-2xl bg-[var(--bg-card-alt)] p-1">
                {FORMATS.map((f) => {
                  const active = reportFormat === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setReportFormat(f.id)}
                      aria-pressed={active}
                      className={cx('h-9 rounded-xl px-4 text-[13px] font-semibold transition-all', active ? 'shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]')}
                      style={active ? { background: 'var(--bg-card)', color: 'var(--accent)' } : undefined}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 border-t border-[var(--border)] pt-6">
                {isCompilingReport ? (
                  <div className="max-w-lg space-y-2">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-[var(--text-body)]">{reportMessage}</span>
                      <span className="font-semibold tabular-nums text-[var(--text-heading)]">{reportProgress}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[var(--bg-card-alt)]">
                      <motion.div className="h-full rounded-full" style={{ background: 'var(--accent)' }} animate={{ width: `${reportProgress}%` }} transition={{ ease: 'easeOut', duration: 0.5 }} />
                    </div>
                  </div>
                ) : (
                  <Button icon={Download} onClick={handleGenerateReport} disabled={!Object.values(reportItems).some(Boolean)}>
                    Gerar e baixar
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* ---------------- Perguntar à IA ---------------- */}
          {activeTab === 'super-ia' && (
            <Card padded={false} className="flex h-[620px] flex-col overflow-hidden">
              <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: 'var(--sidebar-bg)', color: 'var(--sidebar-fg)' }}>
                  <Brain className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-[var(--text-heading)]">Assistente de dados</p>
                  <p className="text-[13px] text-[var(--text-muted)]">Pergunte em português, como falaria com a coordenação.</p>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto bg-[var(--bg-card-alt)] p-5">
                {chatHistory.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={cx('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cx(
                        'max-w-[85%] rounded-3xl px-4 py-3 text-[14px] leading-relaxed sm:max-w-xl',
                        msg.role === 'user' ? 'rounded-br-lg' : 'rounded-bl-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-body)]',
                      )}
                      style={msg.role === 'user' ? { background: 'var(--accent)', color: 'var(--accent-fg)' } : undefined}
                    >
                      <ChatText text={msg.text} user={msg.role === 'user'} />
                      <span className={cx('mt-1 block text-right text-[11px]', msg.role === 'user' ? 'opacity-70' : 'text-[var(--text-muted)]')}>{msg.timestamp}</span>
                    </div>
                  </motion.div>
                ))}
                {isAiLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-3xl rounded-bl-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[14px] text-[var(--text-muted)]">
                      <span className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: 'var(--accent)' }}
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                          />
                        ))}
                      </span>
                      Analisando os dados…
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              <div className="border-t border-[var(--border)] p-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  {[
                    ['Quais turmas mais perderam frequência esta semana?', 'Maior queda de frequência'],
                    ['Faça uma projeção de evasão para o próximo semestre na Unidade Sede', 'Previsão de evasão na Sede'],
                    ['Quais alunos precisam de intervenção pedagógica imediata?', 'Alunos que precisam de apoio'],
                  ].map(([q, label]) => (
                    <button
                      key={label}
                      type="button"
                      disabled={isAiLoading}
                      onClick={(e) => handleQuerySubmit(e, q)}
                      className="rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3.5 py-1.5 text-[13px] font-medium text-[var(--text-body)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <form onSubmit={handleQuerySubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={queryInput}
                    onChange={(e) => setQueryInput(e.target.value)}
                    aria-label="Pergunta para a IA"
                    placeholder="Ex.: quais disciplinas mais pesam na evasão?"
                    className={cx(inputCls, 'h-12 flex-1')}
                  />
                  <button
                    type="submit"
                    disabled={!queryInput.trim() || isAiLoading}
                    aria-label="Enviar pergunta"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
                    style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
                  >
                    <Send className="h-[18px] w-[18px]" />
                  </button>
                </form>
              </div>
            </Card>
          )}

          {/* ---------------- Privacidade ---------------- */}
          {activeTab === 'config' && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader icon={Database} title="Como os dados dos alunos são tratados" subtitle="Regras da LGPD aplicadas aqui" />
                <ul className="space-y-4">
                  {[
                    ['Anonimização', 'Notas e frequência saem sem nome nem documento do aluno antes de qualquer análise externa.'],
                    ['Criptografia', 'Os dados das famílias trafegam criptografados.'],
                    ['Consentimento', 'O responsável aceita os termos no primeiro acesso ao app.'],
                  ].map(([t, d]) => (
                    <li key={t} className="flex gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                        <CheckCircle className="h-3.5 w-3.5" />
                      </span>
                      <p className="text-[14px] leading-relaxed text-[var(--text-body)]">
                        <strong className="text-[var(--text-heading)]">{t}.</strong> {d}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card>
                <CardHeader icon={FileText} title="Quem acessou" subtitle="Últimos acessos a estes dados" action={<Badge>Exemplo</Badge>} />
                <ol className="relative ml-2 border-l border-[var(--border)]">
                  {METRICS_DB.auditLogs.map((log, idx) => (
                    <li key={idx} className="relative pb-5 pl-5 last:pb-0">
                      <span className="absolute -left-[6px] top-1.5 h-3 w-3 rounded-full border-2" style={{ background: 'var(--bg-card)', borderColor: 'var(--accent)' }} />
                      <p className="text-[14px] font-semibold text-[var(--text-heading)]">{log.action}</p>
                      <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">
                        {log.user} · {log.scope} · {log.timestamp.slice(11, 16)}
                      </p>
                    </li>
                  ))}
                </ol>
              </Card>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Peças                                                               */
/* ------------------------------------------------------------------ */

function FilterSelect({
  label,
  value,
  onChange,
  icon: Icon,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-[var(--text-muted)]">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={cx(inputCls, 'py-2 text-[13px]')}>
        {children}
      </select>
    </label>
  );
}

function MiniStat({ icon: Icon, label, value, hint, tone }: { icon: LucideIcon; label: string; value: string; hint?: string; tone?: 'danger' }) {
  return (
    <div className="group rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-26px_rgba(16,24,40,0.5)]">
      <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--text-muted)]">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={tone === 'danger' ? { background: '#FDECEC', color: '#B42318' } : { background: 'var(--accent-soft)', color: 'var(--accent)' }}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-2.5 font-serif text-[24px] font-semibold leading-none tracking-[-0.015em] text-[var(--text-heading)] tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-[12px] text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

function AlertRow({ tone, title, text }: { tone: 'danger' | 'warning'; title: string; text: string }) {
  const c = tone === 'danger' ? { bg: '#FDECEC', fg: '#B42318' } : { bg: '#FEF4E6', fg: '#A15C07' };
  return (
    <div className="flex gap-3 rounded-2xl p-3.5" style={{ background: c.bg }}>
      <AlertCircle className="mt-0.5 h-[18px] w-[18px] shrink-0" style={{ color: c.fg }} />
      <div>
        <p className="text-[14px] font-semibold" style={{ color: c.fg }}>
          {title}
        </p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--text-body)]">{text}</p>
      </div>
    </div>
  );
}

function IntensityRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[13px]">
        <span className="font-medium text-[var(--text-heading)]">{label}</span>
        <span className="tabular-nums text-[var(--text-muted)]">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-card-alt)]">
        <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.8, ease: EASE }} />
      </div>
    </div>
  );
}

function HorizonCard({
  horizon,
  title,
  tone,
  status,
  children,
}: {
  horizon: string;
  title: string;
  tone: 'success' | 'warning';
  status: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
      <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">Em {horizon}</p>
      <h4 className="mt-1 text-[16px] font-semibold text-[var(--text-heading)]">{title}</h4>
      <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-[var(--text-muted)]">{children}</p>
      <div className="mt-4">
        <Badge tone={tone}>{status}</Badge>
      </div>
    </div>
  );
}

function CompareBox({ label, value, note, good }: { label: string; value: string; note: string; good: boolean }) {
  return (
    <div className="rounded-2xl bg-[var(--bg-card-alt)] p-4">
      <p className="text-[13px] text-[var(--text-muted)]">{label}</p>
      <div className="mt-1 flex items-center gap-3">
        <motion.span key={value} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="font-serif text-[30px] font-semibold tabular-nums text-[var(--text-heading)]">
          {value}
        </motion.span>
        <Badge tone={good ? 'success' : 'neutral'}>{note}</Badge>
      </div>
    </div>
  );
}

/** Mostra o texto da IA com títulos e listas simples (### , #### , - ) */
function ChatText({ text, user }: { text: string; user: boolean }) {
  return (
    <div className="space-y-1">
      {text.split('\n').map((line, i) => {
        const clean = line.replace(/\*\*(.+?)\*\*/g, '$1');
        if (line.startsWith('### ')) return <p key={i} className="mt-2 text-[15px] font-semibold">{clean.slice(4)}</p>;
        if (line.startsWith('#### ')) return <p key={i} className={cx('mt-1.5 font-semibold', !user && 'text-[var(--accent)]')}>{clean.slice(5)}</p>;
        if (line.startsWith('- ') || line.startsWith('* ')) return <p key={i} className="ml-3 before:mr-2 before:content-['•']">{clean.slice(2)}</p>;
        if (!line.trim()) return <div key={i} className="h-1" />;
        return <p key={i}>{clean}</p>;
      })}
    </div>
  );
}