import { supabase } from '../../lib/supabase';

export async function getActiveOrganizationId(userId: string) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching active organization:', error);
    return null;
  }
  return data?.organization_id || null;
}

export async function getActiveOrganizationDetails(orgId: string) {
  if (!orgId) return null;
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, trade_name')
    .eq('id', orgId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching organization details:', error);
    return null;
  }
  return data ? {
    id: data.id,
    name: data.name,
    legal_name: data.name,
    trade_name: data.trade_name
  } : null;
}

export async function getGestorKpis(orgId: string) {
  console.log('[DEBUG] getGestorKpis orgId:', orgId);
  
  const [
    { count: totalAlunos, error: err1 },
    { count: totalProfessores, error: err2 },
    { count: totalTurmas, error: err3 },
    { count: totalResponsaveis, error: err4 },
    { count: totalDisciplinas, error: err5 },
    { count: aulasAtivas, error: err6 },
    { count: comunicados, error: err7 }
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('classes').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('guardians').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('subjects').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('lessons').select('id, classes!inner(organization_id)', { count: 'exact', head: true }).eq('classes.organization_id', orgId),
    supabase.from('announcements').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
  ]);

  if (err1 || err2 || err3 || err4 || err5 || err6 || err7) {
    console.error('[DEBUG] Query errors:', { err1, err2, err3, err4, err5, err6, err7 });
  }

  return {
    totalAlunos: totalAlunos || 0,
    totalProfessores: totalProfessores || 0,
    totalTurmas: totalTurmas || 0,
    totalResponsaveis: totalResponsaveis || 0,
    totalDisciplinas: totalDisciplinas || 0,
    aulasAtivas: aulasAtivas || 0,
    comunicados: comunicados || 0,
  };
}

export async function getGestorComunicados(orgId: string) {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, body, target, published_at')
    .eq('organization_id', orgId)
    .order('published_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error('Error fetching announcements:', error);
    return [];
  }
  return data || [];
}

export async function createAnnouncement(orgId: string, authorId: string, title: string, body: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado no Supabase.");

  const { error } = await supabase
    .from('announcements')
    .insert({
      organization_id: orgId,
      author_id: user.id,
      title,
      body,
      target: 'all',
      published_at: new Date().toISOString(),
    });
    
  if (error) {
    console.error('Error creating announcement:', error);
    throw new Error(error.message);
  }
}
