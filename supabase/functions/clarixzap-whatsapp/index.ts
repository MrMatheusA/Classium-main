// Edge Function: clarixzap-whatsapp
// Envia mensagens de WhatsApp pela API pública da ClarixZapBrasil.
//
// Ações (campo "action" no corpo):
//   enviar    → chamada pelo app (usuário logado da equipe). Coloca na fila e,
//               se for urgente ou poucos destinatários, já envia na hora.
//   processar → chamada pelo pg_cron (header x-cron-token). Envia um lote da fila.
//   status    → chamada pelo app. Resumo de um envio (por announcement_id ou lote_id).
//
// Secrets necessários (supabase secrets set ...):
//   CLARIXZAP_TOKEN        token da API ClarixZap (Bearer)
//   CLARIXZAP_CRON_TOKEN   qualquer texto longo e aleatório, usado só pelo cron
//   CLARIXZAP_ALLOWED_ROLES (opcional) papéis que podem disparar, separados por vírgula
//
// Deploy:  supabase functions deploy clarixzap-whatsapp --no-verify-jwt
// (o JWT é conferido aqui dentro; o cron entra só com o x-cron-token)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const API = "https://clarixzapbrasil.com.br/api/public/v1/enviar";
const PAUSA_MS = 2500;            // mesma pausa usada no ClarixZap Cobranças
const PAUSA_URGENTE_MS = 800;     // poucos números: pausa menor
const LOTE_CRON = 20;             // 20 × 2,5 s ≈ 50 s por execução
const LIMITE_IMEDIATO = 6;        // até 6 números sai na hora, sem esperar o cron
const MAX_DESTINATARIOS = 3000;
const MAX_TENTATIVAS = 3;

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const DEFAULT_ROLES = "admin,super_admin,gestor,gestao,diretor,direcao,coordenador,coordenacao,secretaria,secretario,staff,manager,school_admin";
const allowedRoles = new Set(
  (Deno.env.get("CLARIXZAP_ALLOWED_ROLES") || DEFAULT_ROLES).split(",").map((r) => r.trim().toLowerCase()).filter(Boolean),
);

/** Telefone BR → só dígitos com DDI 55. Devolve null se não der para usar. */
export function normalizarTelefone(raw: unknown): string | null {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (!d) return null;
  d = d.replace(/^0+/, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;      // DDD + número
  if (!d.startsWith("55") || (d.length !== 12 && d.length !== 13)) return null;
  return d;
}

// deno-lint-ignore no-explicit-any
type Any = any;

interface Destinatario {
  telefone: string;
  nome?: string | null;
  guardian_id?: string | null;
  student_id?: string | null;
}

async function usuarioDaEquipe(req: Request): Promise<{ id: string; organization_id?: string | null } | Response> {
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "Faça login para enviar mensagens." }, 401);
  const { data, error } = await db.auth.getUser(jwt);
  if (error || !data?.user) return json({ error: "Sessão expirada. Entre de novo." }, 401);

  const user = data.user;
  // Papel: tenta a tabela profiles; cai para o app_metadata do Auth.
  let role: string | null = (user.app_metadata as Any)?.role ?? (user.user_metadata as Any)?.role ?? null;
  let orgId: string | null = (user.app_metadata as Any)?.organization_id ?? null;
  try {
    const { data: p } = await db.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (p) {
      role = p.role ?? p.user_role ?? p.tipo ?? role;
      orgId = p.organization_id ?? p.school_id ?? orgId;
    }
  } catch (_) { /* tabela pode não existir */ }

  if (!role || !allowedRoles.has(String(role).toLowerCase())) {
    return json({ error: "Seu perfil não tem permissão para enviar WhatsApp pela escola." }, 403);
  }
  return { id: user.id, organization_id: orgId };
}

async function enviarUma(token: string, row: Any) {
  let status = 0;
  let resposta = "";
  try {
    const r = await fetch(API, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ telefone: row.telefone, nome: row.nome || "", texto: row.texto, referencia: row.referencia, melhorar: false }),
      signal: AbortSignal.timeout(15000),
    });
    status = r.status;
    resposta = (await r.text()).slice(0, 1000);
  } catch (e) {
    resposta = String(e).slice(0, 1000);
  }
  const ok = status >= 200 && status < 300;
  // 4xx (exceto 429) é erro do pedido: não adianta repetir.
  const definitivo = ok || (status >= 400 && status < 500 && status !== 429) || row.tentativas >= MAX_TENTATIVAS;
  await db.from("whatsapp_outbox").update({
    status: ok ? "sent" : definitivo ? "failed" : "pending",
    status_http: status,
    resposta,
    enviado_em: ok ? new Date().toISOString() : null,
    proxima_tentativa_em: new Date(Date.now() + 2 * 60_000 * Math.max(1, row.tentativas)).toISOString(),
  }).eq("id", row.id);
  return { id: row.id, telefone: row.telefone, ok, status };
}

async function processarLote(token: string, limite: number, pausa: number, ids?: string[]) {
  let rows: Any[] = [];
  if (ids?.length) {
    // envio imediato: só as linhas recém-criadas por esta chamada
    const { data } = await db.from("whatsapp_outbox")
      .update({ status: "sending", tentativas: 1 })
      .in("id", ids).eq("status", "pending").select("*");
    rows = data ?? [];
  } else {
    const { data, error } = await db.rpc("whatsapp_outbox_claim", { p_limit: limite });
    if (error) throw new Error(error.message);
    rows = data ?? [];
  }
  const resultados = [];
  for (let i = 0; i < rows.length; i++) {
    resultados.push(await enviarUma(token, rows[i]));
    if (i < rows.length - 1) await sleep(pausa);
  }
  return resultados;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  const token = Deno.env.get("CLARIXZAP_TOKEN");
  if (!token) return json({ error: "CLARIXZAP_TOKEN não configurado na função." }, 500);

  let body: Any = {};
  try { body = await req.json(); } catch (_) { /* corpo vazio */ }
  const action = body.action ?? "enviar";

  // ---------------- cron ----------------
  if (action === "processar") {
    const cron = Deno.env.get("CLARIXZAP_CRON_TOKEN");
    if (!cron || req.headers.get("x-cron-token") !== cron) return json({ error: "não autorizado" }, 401);
    const resultados = await processarLote(token, LOTE_CRON, PAUSA_MS);
    return json({ processados: resultados.length, resultados });
  }

  const user = await usuarioDaEquipe(req);
  if (user instanceof Response) return user;

  // ---------------- status ----------------
  if (action === "status") {
    let q = db.from("whatsapp_outbox").select("status");
    if (body.announcement_id) q = q.eq("announcement_id", body.announcement_id);
    else if (body.lote_id) q = q.like("referencia", `${body.lote_id}-%`);
    else return json({ error: "Informe announcement_id ou lote_id." }, 400);
    const { data, error } = await q;
    if (error) return json({ error: error.message }, 500);
    const resumo = { pending: 0, sending: 0, sent: 0, failed: 0, skipped: 0 } as Record<string, number>;
    for (const r of data ?? []) resumo[r.status] = (resumo[r.status] ?? 0) + 1;
    return json({ resumo, total: data?.length ?? 0 });
  }

  // ---------------- enviar ----------------
  if (action !== "enviar") return json({ error: `Ação desconhecida: ${action}` }, 400);

  const texto = String(body.texto ?? "").trim();
  if (!texto) return json({ error: "A mensagem está vazia." }, 400);
  if (texto.length > 4000) return json({ error: "A mensagem passou de 4.000 caracteres." }, 400);

  const lista: Destinatario[] = Array.isArray(body.destinatarios) ? body.destinatarios : [];
  if (lista.length === 0) return json({ error: "Nenhum destinatário com telefone." }, 400);
  if (lista.length > MAX_DESTINATARIOS) return json({ error: `Máximo de ${MAX_DESTINATARIOS} destinatários por envio.` }, 400);

  const orgId = body.organization_id ?? user.organization_id ?? null;
  if (user.organization_id && body.organization_id && user.organization_id !== body.organization_id) {
    return json({ error: "Você não pode enviar em nome de outra escola." }, 403);
  }

  const urgente = body.origem === "urgente" || body.urgente === true;
  const loteId = String(body.lote_id || crypto.randomUUID());
  const vistos = new Set<string>();
  const invalidos: string[] = [];
  const linhas: Any[] = [];

  for (const d of lista) {
    const tel = normalizarTelefone(d?.telefone);
    if (!tel) { invalidos.push(String(d?.nome || d?.telefone || "?")); continue; }
    if (vistos.has(tel)) continue;           // mesmo número em dois alunos (irmãos): manda uma vez
    vistos.add(tel);
    const nome = (d.nome || "").toString().trim();
    linhas.push({
      organization_id: orgId,
      announcement_id: body.announcement_id ?? null,
      origem: String(body.origem || "comunicacao"),
      prioridade: urgente ? 10 : 0,
      student_id: d.student_id ?? null,
      guardian_id: d.guardian_id ?? null,
      telefone: tel,
      nome: nome || null,
      // {nome} no texto vira o primeiro nome do responsável
      texto: texto.replace(/\{nome\}/g, nome.split(/\s+/)[0] || "").trim(),
      referencia: `${loteId}-${tel}`,
      created_by: user.id,
    });
  }

  if (linhas.length === 0) return json({ error: "Nenhum telefone válido.", invalidos }, 400);

  const { data: inseridas, error: insErr } = await db.from("whatsapp_outbox")
    .upsert(linhas, { onConflict: "referencia", ignoreDuplicates: true })
    .select("id");
  if (insErr) return json({ error: `Não foi possível registrar o envio: ${insErr.message}` }, 500);

  const ids = (inseridas ?? []).map((r: Any) => r.id);
  let resultados: Any[] = [];
  if (urgente || ids.length <= LIMITE_IMEDIATO) {
    // urgente: envia já (até 30 números de uma vez; o resto o cron pega)
    const agora = ids.slice(0, urgente ? 30 : LIMITE_IMEDIATO);
    resultados = await processarLote(token, agora.length, urgente ? PAUSA_URGENTE_MS : PAUSA_MS, agora);
  }

  const enviados = resultados.filter((r) => r.ok).length;
  const falhas = resultados.filter((r) => !r.ok).length;
  return json({
    lote_id: loteId,
    na_fila: ids.length - resultados.length,
    enviados,
    falhas,
    invalidos,
    resultados,
  });
});