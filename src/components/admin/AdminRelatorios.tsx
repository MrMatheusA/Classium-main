import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BookOpenCheck, CalendarCheck, Eye, FileText, Printer, ShieldAlert, Sparkles, TrendingUp, Users, type LucideIcon } from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { useChartTheme } from '../../theme/PanelThemeContext';
import { Badge, Button, Card, CardHeader, Field, Modal, cx, inputCls, EASE } from '../ui/kit';

/* ------------------------------------------------------------------ */
/* Tipos de relatório                                                  */
/* ------------------------------------------------------------------ */

type ReportType = 'boletim' | 'frequencia' | 'disciplinar' | 'desempenho';

const REPORT_TYPES: { id: ReportType; label: string; description: string; icon: LucideIcon }[] = [
  { id: 'boletim', label: 'Boletim escolar', description: 'Notas por bimestre, faltas e situação em cada disciplina.', icon: BookOpenCheck },
  { id: 'frequencia', label: 'Frequência', description: 'Presenças e faltas da turma ou do aluno no período.', icon: CalendarCheck },
  { id: 'disciplinar', label: 'Acompanhamento disciplinar', description: 'Ocorrências registradas no diário de bordo.', icon: ShieldAlert },
  { id: 'desempenho', label: 'Desempenho por competências', description: 'Evolução do aluno nas competências da BNCC.', icon: TrendingUp },
];

const GRADES = ['8º Ano B', '7º Ano A', '6º Ano C', '9º Ano A'];

/* ------------------------------------------------------------------ */
/* Dados de exemplo (troque pela consulta real quando houver)          */
/* ------------------------------------------------------------------ */

const performanceData = [
  { name: '1º bim', 'Média geral': 7.2 },
  { name: '2º bim', 'Média geral': 7.6 },
  { name: '3º bim', 'Média geral': 7.4 },
  { name: '4º bim', 'Média geral': 8.1 },
];

const coexistenceData = [
  { name: 'Fev', Ocorrências: 15, Elogios: 22 },
  { name: 'Mar', Ocorrências: 28, Elogios: 41 },
  { name: 'Abr', Ocorrências: 22, Elogios: 35 },
  { name: 'Mai', Ocorrências: 32, Elogios: 48 },
  { name: 'Jun', Ocorrências: 18, Elogios: 52 },
];

const SAMPLE_GRADES = [
  { subject: 'Matemática', b: [7.5, 8.0, 6.8, 8.2], faltas: 4 },
  { subject: 'História', b: [8.2, 8.5, 9.0, 9.2], faltas: 2 },
  { subject: 'Língua Portuguesa', b: [6.0, 6.5, 7.2, 7.0], faltas: 6 },
];

/* ------------------------------------------------------------------ */
/* Componente                                                          */
/* ------------------------------------------------------------------ */

export function AdminRelatorios() {
  const { schoolInfo } = usePlatform();
  const chart = useChartTheme();

  const [selectedReportType, setSelectedReportType] = useState<ReportType>('boletim');
  const [selectedGrade, setSelectedGrade] = useState<string>(GRADES[0]);
  const [selectedStudentName, setSelectedStudentName] = useState<string>('');
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);

  const reportMeta = REPORT_TYPES.find((r) => r.id === selectedReportType)!;
  const schoolName: string = schoolInfo?.name || 'Sua escola';

  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    window.setTimeout(() => {
      setGenerating(false);
      setPreviewOpen(true);
    }, 900);
  };

  return (
    <div className="space-y-6 text-left">
      {/* 1. Emissor */}
      <Card>
        <CardHeader icon={FileText} title="Emitir relatório" subtitle="Escolha o tipo, a turma e, se quiser, um aluno. O documento abre pronto para imprimir." />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" role="radiogroup" aria-label="Tipo de relatório">
          {REPORT_TYPES.map((r, i) => {
            const active = r.id === selectedReportType;
            const Icon = r.icon;
            return (
              <motion.button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelectedReportType(r.id)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.05, ease: EASE }}
                className={cx(
                  'group relative overflow-hidden rounded-3xl border p-4 text-left transition-all duration-300',
                  active
                    ? 'border-[var(--accent)] shadow-[0_18px_36px_-24px_rgba(16,24,40,0.55)]'
                    : 'border-[var(--border)] hover:-translate-y-0.5 hover:border-[var(--accent)]',
                )}
                style={active ? { background: 'var(--accent-soft)' } : { background: 'var(--bg-card)' }}
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-2xl transition-colors"
                  style={active ? { background: 'var(--accent)', color: 'var(--accent-fg)' } : { background: 'var(--bg-card-alt)', color: 'var(--accent)' }}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <p className="mt-3 text-[15px] font-semibold text-[var(--text-heading)]">{r.label}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-muted)]">{r.description}</p>
              </motion.button>
            );
          })}
        </div>

        <form onSubmit={handleGenerateReport} className="mt-5 grid items-end gap-4 border-t border-[var(--border)] pt-5 md:grid-cols-[1fr_1.4fr_auto]">
          <Field label="Turma">
            {(id) => (
              <select id={id} value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)} className={inputCls}>
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Aluno (opcional)">
            {(id) => (
              <input
                id={id}
                type="text"
                value={selectedStudentName}
                onChange={(e) => setSelectedStudentName(e.target.value)}
                placeholder="Deixe em branco para a turma inteira"
                className={inputCls}
              />
            )}
          </Field>
          <Button type="submit" icon={Eye} loading={generating}>
            {generating ? 'Montando…' : 'Visualizar'}
          </Button>
        </form>
      </Card>

      {/* 2. Panorama */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader icon={TrendingUp} title="Rendimento da escola" subtitle="Média geral por bimestre" action={<Badge>Exemplo</Badge>} />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="rel-media" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chart.accent} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={chart.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chart.grid} vertical={false} />
                <XAxis dataKey="name" {...chart.axis} />
                <YAxis domain={[5, 10]} {...chart.axis} />
                <Tooltip {...chart.tooltip} />
                <Area type="monotone" dataKey="Média geral" stroke={chart.accent} strokeWidth={2.5} fill="url(#rel-media)" dot={{ r: 3, fill: chart.accent }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader icon={Users} title="Convivência" subtitle="Ocorrências e elogios por mês" action={<Badge>Exemplo</Badge>} />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={coexistenceData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barGap={4}>
                <CartesianGrid stroke={chart.grid} vertical={false} />
                <XAxis dataKey="name" {...chart.axis} />
                <YAxis {...chart.axis} />
                <Tooltip {...chart.tooltip} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: chart.muted }} />
                <Bar dataKey="Elogios" fill={chart.accent} radius={[6, 6, 0, 0]} />
                <Bar dataKey="Ocorrências" fill={chart.danger} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* 3. Prévia do documento */}
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        size="lg"
        title={reportMeta.label}
        subtitle={`${selectedGrade}${selectedStudentName ? ` · ${selectedStudentName}` : ' · turma inteira'}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPreviewOpen(false)}>
              Fechar
            </Button>
            <Button icon={Printer} onClick={() => window.print()}>
              Imprimir
            </Button>
          </>
        }
      >
        <div className="rounded-2xl bg-[var(--bg-card-alt)] p-3 sm:p-5">
          {/* "folha" do documento */}
          <article className="mx-auto max-w-[680px] rounded-xl bg-white p-6 text-[#1B2230] shadow-[0_20px_50px_-30px_rgba(16,24,40,0.5)] sm:p-8">
            <header className="flex items-center justify-between gap-4 border-b-2 pb-4" style={{ borderColor: chart.accent }}>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl font-serif text-lg font-bold text-white" style={{ background: chart.accent }}>
                  {schoolName.charAt(0).toUpperCase()}
                </span>
                <div>
                  <p className="font-serif text-[15px] font-semibold">{schoolName}</p>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-[#667085]">Secretaria escolar</p>
                </div>
              </div>
              <div className="text-right text-[11px] text-[#667085]">
                <p>{selectedGrade}</p>
                <p>Emitido em {new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </header>

            <h3 className="mt-6 text-center font-serif text-[18px] font-semibold uppercase tracking-[0.06em]">{reportMeta.label}</h3>

            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg bg-[#F6F7F9] p-4 text-[13px]">
              <div>
                <dt className="text-[#667085]">Aluno</dt>
                <dd className="font-semibold">{selectedStudentName || 'Turma inteira'}</dd>
              </div>
              <div>
                <dt className="text-[#667085]">Turma</dt>
                <dd className="font-semibold">{selectedGrade}</dd>
              </div>
            </dl>

            {selectedReportType === 'boletim' ? (
              <table className="mt-5 w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b-2 border-[#1B2230] text-left">
                    <th className="py-2 pr-2">Disciplina</th>
                    {['1º', '2º', '3º', '4º'].map((b) => (
                      <th key={b} className="px-1 py-2 text-center">
                        {b} bim
                      </th>
                    ))}
                    <th className="px-1 py-2 text-center">Faltas</th>
                    <th className="py-2 pl-1 text-right">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_GRADES.map((row) => (
                    <tr key={row.subject} className="border-b border-[#E4E7EC]">
                      <td className="py-2 pr-2 font-semibold">{row.subject}</td>
                      {row.b.map((n, i) => (
                        <td key={i} className="px-1 py-2 text-center tabular-nums">
                          {n.toFixed(1).replace('.', ',')}
                        </td>
                      ))}
                      <td className="px-1 py-2 text-center tabular-nums">{row.faltas}</td>
                      <td className="py-2 pl-1 text-right font-semibold text-[#127A4B]">Aprovado</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="mt-5 space-y-2 text-[13px]">
                <p className="border-b border-[#E4E7EC] pb-1 font-semibold">Registros do período</p>
                <p className="text-[#475467]">12/03 · Advertência verbal · Uso de celular em sala</p>
                <p className="text-[#475467]">10/02 · Registro geral · Conversa durante a explicação</p>
              </div>
            )}

            <footer className="mt-10 grid grid-cols-2 gap-8 text-center text-[12px] text-[#667085]">
              <div className="border-t border-[#98A2B3] pt-2">Coordenação pedagógica</div>
              <div className="border-t border-[#98A2B3] pt-2">Secretaria escolar</div>
            </footer>
          </article>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[12px] text-[var(--text-muted)]">
            <Sparkles className="h-3.5 w-3.5" />
            Prévia com dados de exemplo. Com as notas lançadas, o documento sai com os dados reais.
          </p>
        </div>
      </Modal>
    </div>
  );
}