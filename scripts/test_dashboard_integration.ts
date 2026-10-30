import { createClient } from '@supabase/supabase-js';
import { fetchLiveWeather } from '../src/services/weatherService';
import dotenv from 'dotenv';
dotenv.config();

const rawUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const rawKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const OFFICIAL_HOST = 'flfqjlrjnvkrstqsknxc.supabase.co';
let isUrlValid = false;
if (rawUrl && rawUrl.startsWith('https://')) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname === OFFICIAL_HOST) {
      isUrlValid = true;
    }
  } catch {}
}

if (!isUrlValid) {
  console.error('[ERRO DE SEGURANÇA] URL do Supabase ausente, inválida ou não apontando para o host oficial ' + OFFICIAL_HOST);
  process.exit(1);
}

if (!rawKey || !rawKey.startsWith('sb_publishable_')) {
  console.error('[ERRO DE SEGURANÇA] Chave pública do Supabase ausente ou com formato inválido (deve iniciar com sb_publishable_).');
  process.exit(1);
}

const supabase = createClient(rawUrl, rawKey);

const REAL_ORG_ID = '11111111-1111-1111-1111-111111111111';
const FAKE_OTHER_ORG_ID = '99999999-9999-9999-9999-999999999999';

async function runTests() {
  console.log('=================================================================');
  console.log('FASE 7 — BATERIA DE TESTES E2E: DASHBOARD DO GESTOR CLASSIUM');
  console.log('=================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(name: string, condition: boolean, detail: string = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] Test #${totalTests}: ${name}`);
      if (detail) console.log(`       Detalhe: ${detail}`);
    } else {
      console.error(`[FAIL] Test #${totalTests}: ${name}`);
      if (detail) console.error(`       Falha: ${detail}`);
    }
  }

  // 1. TESTE DE ESTUDANTES REAIS E ISOLAMENTO MULTI-ESCOLA
  console.log('--- TESTE 1: Consulta e Isolamento de Estudantes (KPI Total Alunos) ---');
  const { count: realStudentCount, error: studErr } = await supabase
    .from('students')
    .select('id', { count: 'exact', head: true })
    .or(`school_id.eq.${REAL_ORG_ID},organization_id.eq.${REAL_ORG_ID}`);

  assert('Consulta real de estudantes sem erro', !studErr, studErr?.message);
  assert('Contagem real de estudantes >= 2', (realStudentCount ?? 0) >= 2, `Encontrados: ${realStudentCount}`);

  const { count: fakeStudentCount } = await supabase
    .from('students')
    .select('id', { count: 'exact', head: true })
    .or(`school_id.eq.${FAKE_OTHER_ORG_ID},organization_id.eq.${FAKE_OTHER_ORG_ID}`);

  assert('Isolamento Multi-Escola: Outra escola retorna 0 estudantes', fakeStudentCount === 0, `Contagem isolada: ${fakeStudentCount}`);

  // 2. TESTE DE RESPONSÁVEIS REAIS E ISOLAMENTO
  console.log('\n--- TESTE 2: Consulta e Isolamento de Responsáveis (KPI Responsáveis) ---');
  const { count: realGuardiansCount, error: guardErr } = await supabase
    .from('guardians')
    .select('id', { count: 'exact', head: true })
    .or(`school_id.eq.${REAL_ORG_ID},organization_id.eq.${REAL_ORG_ID}`);

  assert('Consulta real de responsáveis sem erro', !guardErr, guardErr?.message);
  assert('Contagem real de responsáveis >= 1', (realGuardiansCount ?? 0) >= 1, `Encontrados: ${realGuardiansCount}`);

  const { count: fakeGuardiansCount } = await supabase
    .from('guardians')
    .select('id', { count: 'exact', head: true })
    .or(`school_id.eq.${FAKE_OTHER_ORG_ID},organization_id.eq.${FAKE_OTHER_ORG_ID}`);

  assert('Isolamento Multi-Escola: Outra escola retorna 0 responsáveis', fakeGuardiansCount === 0, `Contagem isolada: ${fakeGuardiansCount}`);

  // 3. TESTE DE COMUNICADOS (LEGÍTIMO ZERO, SEM MOCK)
  console.log('\n--- TESTE 3: Consulta de Comunicados (Eliminação de Mock) ---');
  const { count: realAnnouncementsCount, error: annErr } = await supabase
    .from('announcements')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', REAL_ORG_ID);

  assert('Consulta real de comunicados sem erro', !annErr, annErr?.message);
  assert('Tabela sem mock: retorna zero legítimo', realAnnouncementsCount === 0, `Contagem: ${realAnnouncementsCount}`);

  // 4. TESTE DE EQUIPE GESTORA REAL E ELIMINAÇÃO DE FAKE
  console.log('\n--- TESTE 4: Equipe Gestora e Eliminação de Nomes Fictícios ---');
  const { data: orgData, error: orgErr } = await supabase
    .from('organizations')
    .select('id, name, trade_name, settings')
    .eq('id', REAL_ORG_ID)
    .maybeSingle();

  assert('Consulta de organização sem erro', !orgErr && !!orgData, orgErr?.message);
  const team = orgData?.settings?.management_team || [];
  assert('Equipe gestora possui integrantes cadastrados', team.length >= 1, `Membros reais: ${team.length}`);
  
  const hasMockCarlos = team.some((m: any) => m.name.includes('Carlos Alberto Ramos'));
  assert('Eliminação de Fake: "Prof. Carlos Alberto Ramos" NÃO está na equipe', !hasMockCarlos, 'Membro fake banido');

  const hasRealPaola = team.some((m: any) => m.name.includes('Paola Oliveira da Fonseca'));
  assert('Equipe real contém Paola Oliveira da Fonseca', hasRealPaola, 'Membro real verificado');

  // 5. TESTE DE DADOS CADASTRAIS DA ESCOLA (BENTO GRID & HEADER)
  console.log('\n--- TESTE 5: Sincronização de Dados Cadastrais (Tabelas schools e organizations) ---');
  const { data: schoolData, error: schoolErr } = await supabase
    .from('schools')
    .select('id, name, inep_code, city, state, address, postal_code')
    .eq('id', REAL_ORG_ID)
    .maybeSingle();

  assert('Consulta da tabela schools sem erro', !schoolErr && !!schoolData, schoolErr?.message);
  assert('Escola possui nome real cadastrado', !!schoolData?.name, `Nome: ${schoolData?.name}`);
  assert('Escola possui código INEP real cadastrado', !!schoolData?.inep_code, `INEP: ${schoolData?.inep_code}`);

  // 6. TESTE DA API EXTERNA DE CLIMA (OPEN-METEO)
  console.log('\n--- TESTE 6: Consulta de Clima Real via Open-Meteo API ---');
  try {
    const weather = await fetchLiveWeather(schoolData?.city || 'Contagem');
    assert('API de Clima Open-Meteo respondeu com sucesso', !!weather && typeof weather.temp === 'number', 
      `Temp: ${weather.temp}°C, Descrição: ${weather.description}, Fonte: ${weather.source}`);
  } catch (wErr: any) {
    assert('API de Clima Open-Meteo', false, wErr.message);
  }

  // 7. TESTE DO ENDPOINT DE BACKEND /api/dashboard/metrics
  console.log('\n--- TESTE 7: Endpoint HTTP /api/dashboard/metrics (Segurança e Isolamento) ---');
  try {
    const resReal = await fetch(`http://localhost:3000/api/dashboard/metrics?organization_id=${REAL_ORG_ID}`);
    const jsonReal = await resReal.json();
    assert('Endpoint /api/dashboard/metrics respondeu 200 OK', resReal.ok, `Status: ${resReal.status}`);
    assert('Métricas reais: total_students = 2', jsonReal.metrics?.total_students === 2, `Alunos: ${jsonReal.metrics?.total_students}`);
    assert('Métricas reais: total_guardians = 1', jsonReal.metrics?.total_guardians === 1, `Responsáveis: ${jsonReal.metrics?.total_guardians}`);
    assert('Métricas reais: total_management_team > 0', jsonReal.metrics?.total_management_team > 0, `Equipe: ${jsonReal.metrics?.total_management_team}`);

    const resFake = await fetch(`http://localhost:3000/api/dashboard/metrics?organization_id=${FAKE_OTHER_ORG_ID}`);
    const jsonFake = await resFake.json();
    assert('Isolamento Multi-Escola no Backend: Outro ID retorna métricas zeradas', 
      jsonFake.metrics?.total_students === 0 && jsonFake.metrics?.total_guardians === 0 && jsonFake.metrics?.total_management_team === 0,
      `Alunos: ${jsonFake.metrics?.total_students}, Responsáveis: ${jsonFake.metrics?.total_guardians}, Equipe: ${jsonFake.metrics?.total_management_team}`);
  } catch (apiErr: any) {
    assert('Endpoint /api/dashboard/metrics', false, apiErr.message);
  }

  // RESUMO FINAL
  console.log('\n=================================================================');
  console.log(`TOTAL DE TESTES: ${totalTests} | APROVADOS: ${passedTests} | FALHAS: ${totalTests - passedTests}`);
  console.log('=================================================================');

  if (passedTests === totalTests) {
    console.log('>> TODOS OS TESTES PASSARAM COM 100% DE SUCESSO! <<\n');
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
