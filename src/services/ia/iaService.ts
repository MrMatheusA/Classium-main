import { supabase } from '../../lib/supabase';

/*
 * IA do Gerador de Atividades (Gemini, Groq e OpenRouter).
 * O app NUNCA vê as chaves: pede ao banco (ia_gerar) e acompanha (ia_resultado).
 * Se uma IA falhar ou bater o limite gratuito, o banco tenta a próxima sozinho.
 */

export type MotorId = 'auto' | 'gemini' | 'groq' | 'openrouter';

export interface MotorInfo {
  id: Exclude<MotorId, 'auto'>;
  nome: string;
  modelo: string | null;
  configurado: boolean;
}

export interface MotoresIA {
  pode_usar: boolean;
  limite_diario: number;
  usados_hoje: number;
  motores: MotorInfo[];
}

export interface QuestaoIA {
  type: string;
  difficulty?: string;
  text: string;
  options?: string[];
  answer: string;
}

export interface AtividadeIA {
  title: string;
  instructions: string;
  questions: QuestaoIA[];
  estimatedTimeMinutes?: number;
  bnccHabilites?: string[];
}

export interface ProgressoIA {
  nome?: string;
  aviso?: string;
}

export interface ParametrosAtividade {
  grade: string;
  subject: string;
  topic: string;
  context?: string;
  objective?: string;
  bncc?: string;
  docType: string;
  difficulty: string;
  questionCount: number;
  questionTypes: { objetivas?: boolean; dissertativas?: boolean; vf?: boolean; associacao?: boolean; complete?: boolean };
  inclusivity: { autismo?: boolean; tdah?: boolean; baixaVisao?: boolean; dislexia?: boolean };
  instrucoesExtras?: string;
  textoBase?: string;
  organizationId?: string | null;
}

const NOMES: Record<string, string> = { gemini: 'Gemini', groq: 'Groq', openrouter: 'OpenRouter' };
export const nomeMotor = (id?: string | null) => (id ? NOMES[id] || id : 'IA');

const erroLegivel = (e: any): string => {
  const m: string = e?.message || e?.error_description || String(e || '');
  if (/function .*ia_(gerar|motores|resultado).* does not exist|Could not find the function/i.test(m)) {
    return 'A IA ainda não foi instalada no banco. Rode o arquivo CLASSIUM_09_IA_GERADOR.sql no SQL Editor.';
  }
  return m.replace(/^.*?ERROR:\s*/i, '');
};

/** Quais IAs estão configuradas e quanto já foi usado hoje */
export async function listarMotores(): Promise<{ data?: MotoresIA; error?: string }> {
  const { data, error } = await supabase.rpc('ia_motores');
  if (error) return { error: erroLegivel(error) };
  return { data: data as MotoresIA };
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Pede um texto à IA e espera ficar pronto (com troca automática de provedor) */
export async function pedirIA(opts: {
  finalidade: string;
  sistema: string;
  prompt: string;
  motor?: MotorId;
  organizationId?: string | null;
  json?: boolean;
  onProgresso?: (p: ProgressoIA) => void;
  sinal?: AbortSignal;
}): Promise<{ texto: string; provedor: string; modelo?: string }> {
  const { data: id, error } = await supabase.rpc('ia_gerar', {
    p_finalidade: opts.finalidade,
    p_sistema: opts.sistema,
    p_prompt: opts.prompt,
    p_motor: opts.motor || 'auto',
    p_org: opts.organizationId || null,
    p_json: opts.json ?? true,
  });
  if (error) throw new Error(erroLegivel(error));

  const inicio = Date.now();
  // até ~5 minutos (cobre a troca entre as 3 IAs)
  while (Date.now() - inicio < 300_000) {
    if (opts.sinal?.aborted) throw new Error('Geração cancelada.');
    await esperar(1500);
    const { data: r, error: e2 } = await supabase.rpc('ia_resultado', { p_id: id });
    if (e2) throw new Error(erroLegivel(e2));
    const res = r as any;
    if (res?.status === 'concluido') return { texto: String(res.texto || ''), provedor: res.provedor, modelo: res.modelo };
    if (res?.status === 'erro') throw new Error(res.erro || 'A IA não conseguiu gerar agora.');
    opts.onProgresso?.({ nome: res?.nome, aviso: res?.aviso });
  }
  throw new Error('A IA demorou demais para responder. Tente de novo.');
}

/** Extrai o JSON da resposta (tolera ```json, texto antes/depois e vírgulas sobrando) */
export function extrairJSON<T = any>(texto: string): T {
  let t = (texto || '').trim();
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const ini = t.search(/[[{]/);
  const fimObj = t.lastIndexOf('}');
  const fimArr = t.lastIndexOf(']');
  const fim = Math.max(fimObj, fimArr);
  if (ini >= 0 && fim > ini) t = t.slice(ini, fim + 1);
  try {
    return JSON.parse(t);
  } catch {
    const limpo = t.replace(/,\s*([}\]])/g, '$1').replace(/[“”]/g, '"');
    return JSON.parse(limpo);
  }
}

/* ------------------------------------------------------------------ */
/* Prompts                                                              */
/* ------------------------------------------------------------------ */

const SISTEMA = `Você é um(a) especialista em elaboração de materiais pedagógicos para escolas brasileiras, alinhado(a) à BNCC.
Escreva em português do Brasil, com linguagem adequada à idade, enunciados claros e sem ambiguidades.
Não invente códigos BNCC: use o informado ou um código real que corresponda ao conteúdo.
Nunca inclua dados pessoais de estudantes.
Responda SOMENTE com um objeto JSON válido, sem comentários e sem texto fora do JSON.`;

const FORMATO = `Formato do JSON:
{
  "title": "título da atividade",
  "instructions": "instruções curtas para o estudante",
  "estimatedTimeMinutes": 45,
  "bnccHabilites": ["EF06MA07"],
  "questions": [
    {
      "type": "Objetiva" | "Dissertativa" | "Verdadeiro ou Falso" | "Associação" | "Complete as lacunas",
      "difficulty": "Fácil" | "Intermediário" | "Avançado",
      "text": "enunciado completo",
      "options": ["texto da alternativa A", "texto da alternativa B", "..."],
      "answer": "gabarito para o professor, com justificativa curta"
    }
  ]
}
Regras dos tipos:
- Objetiva: exatamente 4 alternativas em "options" (sem a letra no início) e "answer" começando com "Alternativa X." seguido da justificativa.
- Dissertativa: sem "options"; "answer" com a expectativa de resposta.
- Verdadeiro ou Falso: "text" com a afirmação; "options": ["(V) Verdadeira", "(F) Falsa"]; "answer" com V ou F e justificativa.
- Associação: "text" com a coluna 1 numerada; "options" com a coluna 2 para associar; "answer" com a sequência correta.
- Complete as lacunas: "text" com lacunas marcadas por "_____"; sem "options"; "answer" com as palavras na ordem.`;

function tiposPedidos(q: ParametrosAtividade['questionTypes']) {
  const t: string[] = [];
  if (q.objetivas) t.push('Objetiva');
  if (q.dissertativas) t.push('Dissertativa');
  if (q.vf) t.push('Verdadeiro ou Falso');
  if (q.associacao) t.push('Associação');
  if (q.complete) t.push('Complete as lacunas');
  return t.length ? t : ['Objetiva', 'Dissertativa'];
}

function adaptacoes(i: ParametrosAtividade['inclusivity']) {
  const a: string[] = [];
  if (i.autismo) a.push('TEA: frases curtas e diretas, uma instrução por vez, linguagem literal (sem ironia ou metáforas), previsibilidade');
  if (i.tdah) a.push('TDAH: enunciados curtos, destaque do que deve ser feito, questões divididas em etapas, menos texto por questão');
  if (i.baixaVisao) a.push('Baixa visão: textos curtos, sem depender de imagens pequenas ou tabelas densas');
  if (i.dislexia) a.push('Dislexia: vocabulário simples, frases curtas, evitar palavras parecidas nas alternativas e duplas negações');
  return a;
}

export function montarPromptAtividade(p: ParametrosAtividade): string {
  const tipos = tiposPedidos(p.questionTypes);
  const adapt = adaptacoes(p.inclusivity);
  return [
    `Crie um(a) "${p.docType}" para ${p.grade}, componente ${p.subject}.`,
    `Tema/conteúdo: ${p.topic}.`,
    p.context ? `Foco pedagógico (o que enfatizar): ${p.context}.` : '',
    p.objective ? `Objetivo de aprendizagem: ${p.objective}.` : '',
    p.bncc ? `Habilidade BNCC de referência: ${p.bncc}.` : '',
    `Nível de dificuldade predominante: ${p.difficulty}.`,
    `Quantidade de questões: exatamente ${p.questionCount}.`,
    `Use estes tipos de questão, distribuindo de forma equilibrada: ${tipos.join(', ')}.`,
    adapt.length ? `Adaptações inclusivas obrigatórias:\n- ${adapt.join('\n- ')}` : '',
    p.textoBase ? `Use este texto-base como referência (pode citar trechos curtos nas questões):\n"""${p.textoBase.slice(0, 12000)}"""` : '',
    p.instrucoesExtras ? `Pedido específico do(a) professor(a) — siga com prioridade:\n${p.instrucoesExtras}` : '',
    FORMATO,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function normalizarAtividade(bruto: any, p: { difficulty: string }): AtividadeIA {
  const qs: any[] = Array.isArray(bruto?.questions) ? bruto.questions : Array.isArray(bruto) ? bruto : [];
  const questions: QuestaoIA[] = qs
    .filter((q) => q && (q.text || q.enunciado))
    .map((q) => {
      const opts = Array.isArray(q.options || q.alternativas) ? (q.options || q.alternativas).map((o: any) => String(o).replace(/^\s*[A-Ea-e][).]\s+/, '')) : undefined;
      return {
        type: String(q.type || q.tipo || (opts?.length ? 'Objetiva' : 'Dissertativa')),
        difficulty: String(q.difficulty || q.dificuldade || p.difficulty),
        text: String(q.text || q.enunciado),
        options: opts && opts.length ? opts : undefined,
        answer: String(q.answer || q.gabarito || q.resposta || ''),
      };
    });
  if (!questions.length) throw new Error('A IA respondeu sem questões. Tente de novo ou troque a IA.');
  return {
    title: String(bruto?.title || bruto?.titulo || ''),
    instructions: String(bruto?.instructions || bruto?.instrucoes || ''),
    questions,
    estimatedTimeMinutes: Number(bruto?.estimatedTimeMinutes) || undefined,
    bnccHabilites: Array.isArray(bruto?.bnccHabilites) ? bruto.bnccHabilites.map(String) : undefined,
  };
}

/** Gera uma atividade completa */
export async function gerarAtividade(p: ParametrosAtividade, motor: MotorId, onProgresso?: (x: ProgressoIA) => void) {
  const r = await pedirIA({
    finalidade: 'atividade',
    sistema: SISTEMA,
    prompt: montarPromptAtividade(p),
    motor,
    organizationId: p.organizationId,
    onProgresso,
  });
  let bruto: any;
  try {
    bruto = extrairJSON(r.texto);
  } catch {
    throw new Error(`${nomeMotor(r.provedor)} respondeu num formato inválido. Tente de novo ou escolha outra IA.`);
  }
  return { atividade: normalizarAtividade(bruto, p), provedor: r.provedor, modelo: r.modelo };
}

/** Ajusta a atividade atual (reescrever, facilitar, dificultar, inclusão ou pedido livre) */
export async function ajustarAtividade(
  atual: { title: string; instructions: string; questions: { type: string; difficulty?: string; text: string; options?: string[]; answer?: string }[] },
  pedido: string,
  base: Pick<ParametrosAtividade, 'grade' | 'subject' | 'difficulty' | 'organizationId'>,
  motor: MotorId,
  onProgresso?: (x: ProgressoIA) => void,
) {
  const enxuto = {
    title: atual.title,
    instructions: atual.instructions,
    questions: atual.questions.map((q) => ({ type: q.type, difficulty: q.difficulty, text: q.text, options: q.options, answer: q.answer })),
  };
  const prompt = [
    `Atividade atual (${base.grade}, ${base.subject}) em JSON:`,
    JSON.stringify(enxuto),
    `Ajuste pedido pelo(a) professor(a): ${pedido}`,
    'Mantenha a mesma quantidade de questões, salvo se o pedido disser o contrário. Devolva a atividade completa já ajustada.',
    FORMATO,
  ].join('\n\n');
  const r = await pedirIA({ finalidade: 'ajuste', sistema: SISTEMA, prompt, motor, organizationId: base.organizationId, onProgresso });
  let bruto: any;
  try {
    bruto = extrairJSON(r.texto);
  } catch {
    throw new Error(`${nomeMotor(r.provedor)} respondeu num formato inválido. Tente de novo.`);
  }
  return { atividade: normalizarAtividade(bruto, base), provedor: r.provedor };
}

/** Sugere tema, habilidade BNCC e objetivo */
export async function sugerirTema(subject: string, grade: string, motor: MotorId, organizationId?: string | null) {
  const r = await pedirIA({
    finalidade: 'tema',
    sistema: SISTEMA,
    prompt: `Sugira UM tema de aula relevante para ${subject} no ${grade}, com uma habilidade BNCC real correspondente e um objetivo de aprendizagem.
Responda no JSON: {"topic": "...", "bncc": "código", "objective": "..."}`,
    motor,
    organizationId,
  });
  const j = extrairJSON<{ topic?: string; bncc?: string; objective?: string }>(r.texto);
  return { topic: j.topic || '', bncc: j.bncc || '', objective: j.objective || '', provedor: r.provedor };
}
