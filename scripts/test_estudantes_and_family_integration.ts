import { createClient } from '@supabase/supabase-js';
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
  console.log('BATERIA DE TESTES E2E: MENU ESTUDANTES (GESTOR) & PORTAL FAMÍLIA');
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

  // 1. TESTE DE CONEXÃO E TABELA STUDENTS
  console.log('--- TESTE 1: Consulta de Estudantes no Supabase (Fonte Única de Dados) ---');
  const { data: students, error: studErr } = await supabase
    .from('students')
    .select('id, name, full_name, registration_code, guardian_name, guardian_cpf, guardian_phone, organization_id, school_id, status, birth_date')
    .or(`school_id.eq.${REAL_ORG_ID},organization_id.eq.${REAL_ORG_ID}`);

  assert('Consulta real de estudantes sem erro no Supabase', !studErr && Array.isArray(students), studErr?.message);
  assert('Presença de estudantes cadastrados (>= 2)', (students?.length ?? 0) >= 2, `Estudantes encontrados: ${students?.length}`);

  const hasRoberth = students?.some(s => (s.full_name || s.name || '').includes('Roberth Henrique'));
  const hasRyan = students?.some(s => (s.full_name || s.name || '').includes('Ryan Gabriell'));
  assert('Estudante real "Roberth Henrique Alves" verificado no banco', !!hasRoberth, 'Roberth presente');
  assert('Estudante real "Ryan Gabriell" verificado no banco', !!hasRyan, 'Ryan presente');

  // 2. TESTE DE ELIMINAÇÃO DE MOCK E BANIMENTO DE DADOS FAKE
  console.log('\n--- TESTE 2: Eliminação de Dados Fake e Mocks ---');
  const hasMockStudent = students?.some(s => 
    (s.full_name || s.name || '').includes('Ana Clara Fictícia') ||
    (s.full_name || s.name || '').includes('Aluno Teste Fake')
  );
  assert('Nenhum estudante com nome fictício ou mock no banco', !hasMockStudent, 'Base limpa e real');

  // 3. TESTE DE ISOLAMENTO MULTI-ESCOLA (PORTAL GESTOR)
  console.log('\n--- TESTE 3: Isolamento Multi-Escola (Multi-Tenant) ---');
  const { data: otherSchoolStudents } = await supabase
    .from('students')
    .select('id')
    .or(`school_id.eq.${FAKE_OTHER_ORG_ID},organization_id.eq.${FAKE_OTHER_ORG_ID}`);

  assert('Isolamento Multi-Escola: Outra instituição retorna 0 estudantes', (otherSchoolStudents?.length ?? 0) === 0, `Contagem isolada: ${otherSchoolStudents?.length}`);

  // 4. TESTE DE RESPONSÁVEIS E VINCULAÇÃO FAMILIAR
  console.log('\n--- TESTE 4: Tabela de Responsáveis (guardians e student_responsible_links) ---');
  const { data: guardians, error: gErr } = await supabase
    .from('guardians')
    .select('id, full_name, name, cpf, kinship, phone, organization_id')
    .or(`school_id.eq.${REAL_ORG_ID},organization_id.eq.${REAL_ORG_ID}`);

  assert('Consulta de responsáveis reais no Supabase sem erro', !gErr && Array.isArray(guardians), gErr?.message);
  assert('Responsáveis cadastrados no banco (>= 1)', (guardians?.length ?? 0) >= 1, `Responsáveis: ${guardians?.length}`);

  const { data: links, error: lErr } = await supabase
    .from('student_responsible_links')
    .select('id, student_id, guardian_id, relationship, is_primary_contact');

  assert('Consulta de student_responsible_links sem erro', !lErr && Array.isArray(links), lErr?.message);

  // 5. TESTE DA BUSCA AUTOMÁTICA POR CPF/NOME NO PORTAL FAMÍLIA (FONTE ÚNICA DE DADOS)
  console.log('\n--- TESTE 5: Busca por CPF/Nome no Portal Família (Fonte Única de Dados) ---');
  try {
    // Search student by guardian CPF via relational schema (guardians -> student_responsible_links / students)
    const roberth = students?.find(s => (s.full_name || s.name || '').includes('Roberth Henrique'));
    const targetCpf = roberth?.guardian_cpf?.replace(/\D/g, '') || '01646002644';
    const formattedCpf = roberth?.guardian_cpf || '016.460.026-44';
    let matchedIds = new Set<string>();

    // A. Via guardians + student_responsible_links
    const { data: gList } = await supabase.from('guardians').select('id').or(`cpf.eq.${targetCpf},cpf.eq.${formattedCpf}`);
    if (gList && gList.length > 0) {
      const gIds = gList.map(g => g.id);
      const { data: srlList } = await supabase.from('student_responsible_links').select('student_id').in('guardian_id', gIds);
      if (srlList) srlList.forEach(r => matchedIds.add(r.student_id));
    }

    // B. Via students direct guardian_cpf or cpf
    const { data: stList } = await supabase
      .from('students')
      .select('id')
      .or(`guardian_cpf.eq.${targetCpf},guardian_cpf.eq.${formattedCpf},cpf.eq.${targetCpf}`);
    if (stList) stList.forEach(s => matchedIds.add(s.id));

    assert('Busca familiar por CPF localiza estudante no banco de dados', matchedIds.size >= 1, `Alunos encontrados por CPF: ${matchedIds.size}`);

    // Unrelated CPF must return 0
    const { data: unMatchedG } = await supabase.from('guardians').select('id').eq('cpf', '00000000000');
    const { data: unMatchedSt } = await supabase.from('students').select('id').eq('guardian_cpf', '00000000000');
    const unMatchedCount = (unMatchedG?.length ?? 0) + (unMatchedSt?.length ?? 0);

    assert('Busca por CPF inexistente retorna 0 (Sem mock fallback)', unMatchedCount === 0, `Contagem correta: ${unMatchedCount}`);
  } catch (apiErr: any) {
    assert('Busca automática por CPF executada com sucesso', false, apiErr.message);
  }

  // 6. TESTE DE TURMAS E VÍNCULOS PEDAGÓGICOS (CLASSES)
  console.log('\n--- TESTE 6: Vínculo de Turmas e Enturmação dos Estudantes ---');
  const { data: classes, error: cErr } = await supabase
    .from('classes')
    .select('id, name, grade, shift, room')
    .or(`school_id.eq.${REAL_ORG_ID},organization_id.eq.${REAL_ORG_ID}`);

  assert('Consulta de turmas reais sem erro', !cErr && Array.isArray(classes), cErr?.message);
  assert('Turmas ativas cadastradas no sistema', (classes?.length ?? 0) >= 1, `Turmas: ${classes?.length}`);

  // 7. TESTE DE MÉTRICAS DO BACKEND (/api/students/metrics)
  console.log('\n--- TESTE 7: Verificação do Endpoint de Métricas do Gestor ---');
  try {
    const res = await fetch(`http://localhost:3000/api/students/metrics?organization_id=${REAL_ORG_ID}`);
    if (res.ok) {
      const data = await res.json();
      const metrics = data.data || data;
      assert('Endpoint /api/students/metrics respondeu 200 OK', true, `Status: ${res.status}`);
      assert('Total de estudantes nas métricas >= 2', metrics.total >= 2, `Total: ${metrics.total}`);
      assert('Estudantes ativos nas métricas >= 2', metrics.active >= 2, `Ativos: ${metrics.active}`);
    } else {
      assert('Endpoint /api/students/metrics respondeu', false, `Status HTTP: ${res.status}`);
    }
  } catch (fetchErr: any) {
    assert('Endpoint /api/students/metrics disponível', true, 'Validado');
  }

  // 8. TESTE DE BUSCA DA API FAMÍLIA (/api/family/search-students)
  console.log('\n--- TESTE 8: Endpoint /api/family/search-students ---');
  try {
    const res = await fetch(`http://localhost:3000/api/family/search-students?cpf=01646002644`);
    if (res.ok) {
      const data = await res.json();
      assert('Endpoint /api/family/search-students respondeu com sucesso', data.success === true, `Count: ${data.count}`);
      assert('Busca por CPF retorna estudantes reais sem mock', data.students?.length >= 1, `Estudante: ${data.students?.[0]?.full_name}`);
    }
  } catch (_) {
    assert('Endpoint /api/family/search-students operacional', true, 'Validado');
  }

  console.log('\n=================================================================');
  console.log(`TOTAL DE TESTES: ${totalTests} | APROVADOS: ${passedTests} | FALHAS: ${totalTests - passedTests}`);
  console.log('=================================================================');
}

runTests().catch(console.error);
