import { supabase } from '../../lib/supabase';

/**
 * WhatsApp pela ClarixZapBrasil — via funções do banco (SQL Editor), sem Edge Function.
 * O token da ClarixZap fica no Vault do Supabase; o navegador nunca vê.
 *
 *   rpc('whatsapp_enviar')  → coloca na fila e já dispara (urgente / poucos números)
 *   rpc('whatsapp_status')  → quantas foram, quantas falharam
 */

export type WhatsAppOrigem = 'urgente' | 'assinatura' | 'convocacao' | 'informativo' | 'manual';

export interface WhatsAppDestinatario {
  telefone: string;
  nome?: string | null;
  guardian_id?: string | null;
  student_id?: string | null;
}

export interface WhatsAppEnvioResultado {
  lote_id: string;
  enviados: number;
  falhas: number;
  na_fila: number;
  invalidos: string[];
}

interface StatusResumo {
  total: number;
  pending: number;
  sending: number;
  sent: number;
  failed: number;
  erros: { telefone: string; status_http: number | null; resposta: string | null }[];
}

/** Telefone BR → só dígitos com 55 na frente. null se não for válido. */
export function normalizarTelefoneBR(raw?: string | null): string | null {
  let d = String(raw ?? '').replace(/\D/g, '').replace(/^0+/, '');
  if (!d) return null;
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  if (!d.startsWith('55') || (d.length !== 12 && d.length !== 13)) return null;
  return d;
}

/** (82) 99999-0000 a partir de 5582999990000 */
export function formatarTelefoneBR(digits?: string | null): string {
  const d = normalizarTelefoneBR(digits);
  if (!d) return digits || '';
  const n = d.slice(2);
  return n.length === 11 ? `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}` : `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
}

/** Destinatários a partir dos estudantes do público de comunicação (todos os responsáveis com celular, sem repetir número). */
export function destinatariosDosEstudantes(students: Array<Record<string, any>>): WhatsAppDestinatario[] {
  const out: WhatsAppDestinatario[] = [];
  const vistos = new Set<string>();
  const push = (telefone: any, nome: any, guardian_id: any, student_id: any) => {
    const tel = normalizarTelefoneBR(telefone);
    if (!tel || vistos.has(tel)) return;
    vistos.add(tel);
    out.push({ telefone: tel, nome: nome || null, guardian_id: guardian_id || null, student_id: student_id || null });
  };
  for (const s of students) {
    if (!s) continue;
    const guardians: any[] = Array.isArray(s.guardians) ? s.guardians : [];
    for (const g of guardians) push(g?.phone ?? g?.telefone ?? g?.whatsapp, g?.full_name ?? g?.name, g?.id, s.id);
    push(s.guardian_phone, s.guardian_name, s.guardian_id, s.id);
  }
  return out;
}

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

function mensagemDeErro(error: any): string {
  const msg: string = error?.message || 'Falha ao enviar WhatsApp.';
  if (/whatsapp_enviar|whatsapp_status/.test(msg) && /schema cache|does not exist|Could not find/i.test(msg)) {
    return 'O WhatsApp ainda não foi instalado no banco. Rode o arquivo whatsapp_clarixzap_SQL_EDITOR.sql no SQL Editor.';
  }
  return msg;
}

export async function statusWhatsApp(params: { announcementId?: string; loteId?: string }): Promise<{ data?: StatusResumo; error?: string }> {
  const { data, error } = await supabase.rpc('whatsapp_status', {
    p_lote_id: params.loteId ?? null,
    p_announcement_id: params.announcementId ?? null,
  });
  if (error) return { error: mensagemDeErro(error) };
  return { data: data as StatusResumo };
}

/**
 * Envia (ou enfileira) as mensagens.
 * Para envios imediatos, espera alguns segundos a resposta da ClarixZap para já mostrar enviado/falhou.
 */
export async function enviarWhatsApp(params: {
  texto: string;
  destinatarios: WhatsAppDestinatario[];
  origem: WhatsAppOrigem;
  organizationId?: string | null;
  announcementId?: string | null;
  loteId?: string;
}): Promise<{ data?: WhatsAppEnvioResultado; error?: string }> {
  if (!params.destinatarios.length) return { error: 'Nenhum responsável com celular cadastrado.' };

  const { data, error } = await supabase.rpc('whatsapp_enviar', {
    p_texto: params.texto,
    p_destinatarios: params.destinatarios,
    p_origem: params.origem,
    p_organization_id: params.organizationId ?? null,
    p_announcement_id: params.announcementId ?? null,
    p_lote_id: params.loteId ?? null,
  });
  if (error) return { error: mensagemDeErro(error) };

  const r = data as { lote_id: string; total: number; disparados: number; na_fila: number; invalidos: string[] };
  const base: WhatsAppEnvioResultado = { lote_id: r.lote_id, enviados: 0, falhas: 0, na_fila: r.total, invalidos: r.invalidos || [] };
  if (!r.disparados) return { data: base };

  // A ClarixZap responde em 1–5 s: confere algumas vezes antes de devolver
  for (let i = 0; i < 6; i++) {
    await sleep(i === 0 ? 2500 : 2000);
    const st = await statusWhatsApp({ loteId: r.lote_id });
    if (st.error || !st.data) break;
    const { sent, failed, pending, sending } = st.data;
    base.enviados = sent;
    base.falhas = failed;
    base.na_fila = pending + sending;
    if (sending === 0) break;
  }
  return { data: base };
}

/** Converte o texto do comunicado (que pode ter HTML do editor) para texto de WhatsApp. */
export function textoParaWhatsApp(params: { titulo?: string; corpo: string; escola?: string; assinatura?: string }) {
  const corpo = params.corpo
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const partes = [
    params.titulo ? `*${params.titulo.trim()}*` : '',
    corpo,
    params.assinatura ? `— ${params.assinatura.trim()}` : '',
    params.escola ? `_${params.escola.trim()}_` : '',
  ].filter(Boolean);
  return partes.join('\n\n');
}
