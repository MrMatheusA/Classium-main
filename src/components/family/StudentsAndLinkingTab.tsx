import React, { useState, useEffect, useCallback, useId } from 'react';
import {
  Search,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Building2,
  Sparkles,
  ShieldCheck,
  Loader2,
  HelpCircle,
  Info,
  ExternalLink,
  UserMinus,
  GraduationCap,
  Clock,
  Calendar,
  ChevronRight,
  Plus,
  Trash2,
  Users,
  RefreshCw,
  FileText,
  Clock3,
  AlertTriangle,
  HeartHandshake
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { supabase } from '../../lib/supabase';

export interface LinkedStudent {
  link_id: string;
  student_id: string;
  name: string;
  full_name: string;
  registration_code: string;
  ra: string;
  class_name: string;
  grade: string;
  shift: string;
  room: string;
  school_id: string;
  school_name: string;
  relationship: string;
  status: string;
  is_active: boolean;
  photo_url?: string;
  is_active_on_panel?: boolean;
}

export interface CandidateStudent {
  student_id: string;
  name: string;
  full_name: string;
  registration_code: string;
  ra: string;
  class_name: string;
  grade: string;
  shift: string;
  room: string;
  school_id: string;
  school_name: string;
  relationship: string;
  status: string;
  is_active: boolean;
  photo_url?: string;
  is_linked: boolean;
  is_eligible: boolean;
  is_pending: boolean;
  is_ambiguous: boolean;
  is_sibling_match: boolean;
  link_id?: string | null;
}

export function StudentsAndLinkingTab() {
  const { userProfile, activeChild, setActiveChild, organization } = usePlatform();
  const formBaseId = useId();

  // Search state (STRICTLY NO CPF)
  const [guardianName, setGuardianName] = useState<string>('');
  const [studentNames, setStudentNames] = useState<string[]>(['']);

  // Data state
  const [linkedChildren, setLinkedChildren] = useState<LinkedStudent[]>([]);
  const [candidateStudents, setCandidateStudents] = useState<CandidateStudent[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [hasSiblingMatch, setHasSiblingMatch] = useState<boolean>(false);

  // Loading & status states
  const [isLoadingLinked, setIsLoadingLinked] = useState<boolean>(true);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isLinkingId, setIsLinkingId] = useState<string | null>(null);
  const [isLinkingAll, setIsLinkingAll] = useState<boolean>(false);
  const [isUnlinking, setIsUnlinking] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals state
  const [candidateToConfirm, setCandidateToConfirm] = useState<CandidateStudent | null>(null);
  const [studentToUnlink, setStudentToUnlink] = useState<{ linkId: string; studentId: string; studentName: string } | null>(null);

  // Initialize Guardian Name from logged-in profile
  useEffect(() => {
    if (userProfile?.full_name && !guardianName) {
      setGuardianName(userProfile.full_name);
    }
  }, [userProfile?.full_name]);

  // Auth header helper
  const getAuthHeaders = useCallback(async () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch (_) {}
    return headers;
  }, []);

  // 1. Fetch currently linked children for this family
  const fetchLinkedChildren = useCallback(async () => {
    setIsLoadingLinked(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/family/linked-students', {
        headers,
        cache: 'no-store'
      });

      if (res.ok) {
        const json = await res.json();
        const list: LinkedStudent[] = json.children || [];
        setLinkedChildren(list);

        // Sync with platform context active child if not set
        if (list.length > 0 && (!activeChild || !list.some(c => c.student_id === activeChild.id))) {
          const first = list[0];
          setActiveChild({
            id: first.student_id,
            name: first.name,
            class: first.class_name,
            grade: first.grade,
            shift: first.shift,
            photoUrl: first.photo_url || `https://images.unsplash.com/photo-1544717305-2782549b5136?w=150`
          });
        }
      }
    } catch (err) {
      console.warn('[StudentsAndLinkingTab] Erro ao buscar dependentes vinculados:', err);
    } finally {
      setIsLoadingLinked(false);
    }
  }, [getAuthHeaders, activeChild, setActiveChild]);

  // Initial load
  useEffect(() => {
    fetchLinkedChildren();
  }, [fetchLinkedChildren]);

  // 2. Supabase Realtime synchronization
  useEffect(() => {
    const channel = supabase
      .channel('family-student-links-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_responsible_links' },
        () => {
          fetchLinkedChildren();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'guardians' },
        () => {
          fetchLinkedChildren();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'students' },
        () => {
          fetchLinkedChildren();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLinkedChildren]);

  // 3. Dynamic student name fields management
  const handleAddStudentField = () => {
    setStudentNames(prev => [...prev, '']);
  };

  const handleRemoveStudentField = (indexToRemove: number) => {
    if (studentNames.length <= 1) return;
    setStudentNames(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleStudentNameChange = (index: number, value: string) => {
    setStudentNames(prev => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  // 4. Search Handler
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setSearchError(null);
    setActionSuccess(null);
    setActionError(null);

    const cleanGuardian = guardianName.trim();
    const cleanStudents = studentNames.map(s => s.trim()).filter(s => s.length > 0);

    if (!cleanGuardian || cleanGuardian.length < 3) {
      setSearchError('Informe o nome completo do responsável cadastrado na escola.');
      return;
    }

    if (cleanStudents.length === 0) {
      setSearchError('Informe ao menos um nome completo de estudante para realizar a pesquisa.');
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setCandidateStudents([]);
    setHasSiblingMatch(false);

    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      params.append('guardian_name', cleanGuardian);
      cleanStudents.forEach(st => params.append('student_names[]', st));

      const res = await fetch(`/api/family/search-students?${params.toString()}`, {
        headers,
        cache: 'no-store'
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('Muitas tentativas em pouco tempo. Por segurança, aguarde 1 minuto.');
        }
        throw new Error('Falha ao comunicar com o servidor escolar.');
      }

      const json = await res.json();

      if (json.invalid_guardian) {
        setSearchError(json.message || 'Nome do responsável inválido ou muito curto.');
        return;
      }

      if (json.invalid_student) {
        setSearchError(json.message || 'Nome do estudante inválido ou não informado.');
        return;
      }

      const results: CandidateStudent[] = json.students || [];
      setCandidateStudents(results);
      setHasSiblingMatch(Boolean(json.has_siblings || results.some(r => r.is_sibling_match)));

      if (results.length === 0) {
        setSearchError(
          'Nenhum estudante foi localizado nesta unidade com os nomes informados. Verifique a grafia conforme o cadastro da secretaria escolar.'
        );
      }
    } catch (err: any) {
      setSearchError(err.message || 'Ocorreu um erro ao consultar os registros escolares.');
    } finally {
      setIsSearching(false);
    }
  };

  // 5. Execute Link (Single student)
  const executeLink = async (candidate: CandidateStudent) => {
    setIsLinkingId(candidate.student_id);
    setActionSuccess(null);
    setActionError(null);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/family/link-student', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          guardian_name: guardianName.trim() || userProfile?.full_name,
          student_id: candidate.student_id
        })
      });

      const json = await res.json();

      if (!res.ok || json.success === false) {
        throw new Error(json.message || 'Não foi possível vincular o estudante.');
      }

      setCandidateToConfirm(null);

      if (json.status === 'pending') {
        setActionSuccess(
          `Solicitação enviada! Como o vínculo cadastral de ${candidate.name} necessita de conferência documental, a secretaria escolar analisará o pedido.`
        );
      } else {
        setActionSuccess(`Estudante ${candidate.name} vinculado(a) com sucesso à sua conta familiar!`);
      }

      // Refresh linked children and candidate flags
      await fetchLinkedChildren();
      setCandidateStudents(prev =>
        prev.map(c =>
          c.student_id === candidate.student_id
            ? { ...c, is_linked: json.status === 'approved', is_pending: json.status === 'pending' }
            : c
        )
      );
    } catch (err: any) {
      setActionError(err.message || 'Erro ao processar a vinculação.');
    } finally {
      setIsLinkingId(null);
    }
  };

  // 6. Execute Batch Link (All eligible unlinked)
  const executeLinkAll = async () => {
    const unlinkedEligible = candidateStudents.filter(c => !c.is_linked);
    if (unlinkedEligible.length === 0) return;

    setIsLinkingAll(true);
    setActionSuccess(null);
    setActionError(null);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/family/link-student', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          guardian_name: guardianName.trim() || userProfile?.full_name,
          student_ids: unlinkedEligible.map(c => c.student_id)
        })
      });

      const json = await res.json();

      if (!res.ok || json.success === false) {
        throw new Error(json.message || 'Falha ao vincular estudantes selecionados.');
      }

      setActionSuccess(json.message || 'Vínculos processados com sucesso.');
      await fetchLinkedChildren();

      // Update candidates state
      setCandidateStudents(prev =>
        prev.map(c => ({
          ...c,
          is_linked: true
        }))
      );
    } catch (err: any) {
      setActionError(err.message || 'Erro ao processar vinculações em lote.');
    } finally {
      setIsLinkingAll(false);
    }
  };

  // 7. Unlink Student Confirmation
  const confirmUnlinkChild = async () => {
    if (!studentToUnlink) return;

    setIsUnlinking(true);
    setActionSuccess(null);
    setActionError(null);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/family/unlink-student', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          student_id: studentToUnlink.studentId,
          link_id: studentToUnlink.linkId
        })
      });

      const json = await res.json();

      if (!res.ok || json.success === false) {
        throw new Error(json.message || 'Erro ao desvincular estudante.');
      }

      setActionSuccess(`Estudante ${studentToUnlink.studentName} desvinculado(a) com sucesso.`);
      setStudentToUnlink(null);
      await fetchLinkedChildren();

      // Update any searched candidate state
      setCandidateStudents(prev =>
        prev.map(c =>
          c.student_id === studentToUnlink.studentId
            ? { ...c, is_linked: false }
            : c
        )
      );
    } catch (err: any) {
      setActionError(err.message || 'Erro ao desvincular aluno.');
    } finally {
      setIsUnlinking(false);
    }
  };

  // 8. Set student active on panel
  const handleSetActive = (child: LinkedStudent) => {
    setActiveChild({
      id: child.student_id,
      name: child.name,
      class: child.class_name,
      grade: child.grade,
      shift: child.shift,
      photoUrl: child.photo_url || `https://images.unsplash.com/photo-1544717305-2782549b5136?w=150`
    });

    fetch('/api/family/set-active-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: child.student_id })
    }).catch(() => {});
  };

  return (
    <div className="space-y-8 animate-fade-in text-oxford">
      {/* HEADER HERO */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-saffron/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-oxford/5 border border-oxford/10 text-oxford text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Portal Família • Classium Segurança</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-oxford tracking-tight">
              Alunos & Vinculação Familiar
            </h1>
            <p className="text-sm text-gray-600 max-w-2xl leading-relaxed">
              Consulte e vincule seus filhos utilizando o <strong>nome completo do estudante</strong> e o{' '}
              <strong>nome completo do responsável cadastrado</strong>. A busca é restrita com isolamento total à escola vinculada à sua conta.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchLinkedChildren}
              disabled={isLoadingLinked}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gray-50 hover:bg-gray-100 text-oxford border border-gray-200 text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              title="Recarregar vínculos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLinked ? 'animate-spin text-emerald-600' : 'text-gray-500'}`} />
              <span>Sincronizar</span>
            </button>

            <div className="px-4 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>{linkedChildren.length} {linkedChildren.length === 1 ? 'Filho Vinculado' : 'Filhos Vinculados'}</span>
            </div>
          </div>
        </div>

        {/* FEEDBACK BANNERS */}
        {actionSuccess && (
          <div className="mt-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-medium flex items-start gap-3 animate-fade-in" role="status" aria-live="polite">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Operação concluída com sucesso</p>
              <p className="mt-0.5 text-emerald-800">{actionSuccess}</p>
            </div>
            <button
              type="button"
              onClick={() => setActionSuccess(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-bold underline cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}

        {actionError && (
          <div className="mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm font-medium flex items-start gap-3 animate-fade-in" role="alert">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Aviso do Sistema</p>
              <p className="mt-0.5 text-rose-800">{actionError}</p>
            </div>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-rose-700 hover:text-rose-900 text-xs font-bold underline cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}
      </div>

      {/* SECTION 1: SEARCH FOR STUDENTS TO LINK (NO CPF, FULL NAME BASED, MULTI-STUDENT) */}
      <section aria-labelledby="search-section-title" className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-saffron mb-1">
              <Search className="w-4 h-4" />
              <span>Etapa 1 • Localizar Estudantes da Escola</span>
            </div>
            <h2 id="search-section-title" className="font-serif text-xl sm:text-2xl font-bold text-oxford">
              Pesquisar Estudantes para Vincular
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Informe o nome completo do estudante e o nome completo do responsável cadastrado. A busca é restrita à escola vinculada à sua conta.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 text-xs font-medium">
            <Building2 className="w-3.5 h-3.5 text-oxford" />
            <span>Unidade: <strong>{organization?.trade_name || organization?.name || 'Classium Colégio Modelo'}</strong></span>
          </div>
        </div>

        <form onSubmit={handleSearch} className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* FIELD: GUARDIAN FULL NAME */}
            <div className="space-y-2">
              <label
                htmlFor={`${formBaseId}-guardian-name`}
                className="block text-xs font-bold uppercase tracking-wider text-oxford"
              >
                Nome completo do responsável <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id={`${formBaseId}-guardian-name`}
                  type="text"
                  required
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  placeholder="Ex: Sandra Cristina da Silva"
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50/70 border border-gray-200 text-sm font-medium text-oxford placeholder-gray-400 focus:bg-white focus:border-oxford focus:ring-2 focus:ring-oxford/10 transition-all outline-none"
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xs text-gray-500">
                Nome do pai, mãe ou responsável legal registrado na matrícula escolar.
              </p>
            </div>

            {/* FIELD: DYNAMIC STUDENT NAMES */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={`${formBaseId}-student-name-0`}
                  className="block text-xs font-bold uppercase tracking-wider text-oxford"
                >
                  Nome completo do estudante a vincular <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddStudentField}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-oxford hover:text-emerald-700 transition-colors cursor-pointer"
                  aria-label="Adicionar outro estudante para pesquisar em lote"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar outro estudante</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {studentNames.map((nameVal, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        id={`${formBaseId}-student-name-${idx}`}
                        type="text"
                        required={idx === 0}
                        value={nameVal}
                        onChange={(e) => handleStudentNameChange(idx, e.target.value)}
                        placeholder={idx === 0 ? "Ex: Roberth dos Santos Silva" : "Ex: Ryan dos Santos Silva"}
                        className="w-full px-4 py-3 rounded-2xl bg-gray-50/70 border border-gray-200 text-sm font-medium text-oxford placeholder-gray-400 focus:bg-white focus:border-oxford focus:ring-2 focus:ring-oxford/10 transition-all outline-none"
                        aria-label={`Nome completo do estudante ${idx + 1}`}
                      />
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                    </div>

                    {studentNames.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveStudentField(idx)}
                        className="p-3 rounded-2xl bg-gray-100 hover:bg-rose-50 text-gray-500 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                        title={`Remover campo do estudante ${idx + 1}`}
                        aria-label={`Remover campo do estudante ${idx + 1}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-2xs text-gray-500">
                Você pode pesquisar múltiplos estudantes de uma só vez adicionando novos campos.
              </p>
            </div>
          </div>

          {/* SEARCH ERROR NOTICE */}
          {searchError && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm font-medium flex items-start gap-3" role="alert">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                {searchError}
              </div>
            </div>
          )}

          {/* SEARCH BUTTON & NOTICE */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2 text-2xs text-gray-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Isolamento escolar garantido: somente dados da unidade autorizada são consultados.</span>
            </div>

            <button
              type="submit"
              disabled={isSearching}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-oxford hover:bg-oxford-dark text-white text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-saffron" />
                  <span>Consultando Escola...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 text-saffron" />
                  <span>Consultar Cadastro Escolar</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* CANDIDATES RESULTS SECTION */}
        {hasSearched && (
          <div className="mt-8 pt-8 border-t border-gray-100 space-y-6 animate-fade-in" aria-live="polite">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-oxford flex items-center gap-2">
                  <span>Estudantes Encontrados</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-oxford/10 text-oxford text-xs font-bold">
                    {candidateStudents.length}
                  </span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Resultados filtrados com base no nome do responsável e estudantes informados.
                </p>
              </div>

              {candidateStudents.some(c => !c.is_linked) && (
                <button
                  type="button"
                  onClick={executeLinkAll}
                  disabled={isLinkingAll}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isLinkingAll ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserCheck className="w-3.5 h-3.5" />
                  )}
                  <span>Vincular Todos os Elegíveis</span>
                </button>
              )}
            </div>

            {/* SIBLING NOTIFICATION BANNER */}
            {hasSiblingMatch && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs sm:text-sm flex items-start gap-3">
                <HeartHandshake className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-emerald-900">
                    Dependentes adicionais identificados pelo cadastro do responsável
                  </p>
                  <p className="text-xs text-emerald-800">
                    O sistema identificou automaticamente outros estudantes matriculados nesta mesma escola que compartilham o mesmo responsável cadastrado.
                  </p>
                </div>
              </div>
            )}

            {/* CANDIDATES CARDS GRID */}
            {candidateStudents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {candidateStudents.map((candidate) => (
                  <div
                    key={candidate.student_id}
                    className={`p-5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                      candidate.is_linked
                        ? 'bg-emerald-50/40 border-emerald-200/80 shadow-xs'
                        : candidate.is_sibling_match
                        ? 'bg-amber-50/30 border-amber-200/80 hover:border-amber-300'
                        : 'bg-white border-gray-200 hover:border-oxford/30 shadow-xs'
                    }`}
                  >
                    {/* TOP BADGES */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      {candidate.is_linked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-2xs font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Já Vinculado</span>
                        </span>
                      ) : candidate.is_pending ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-2xs font-bold">
                          <Clock3 className="w-3 h-3 text-amber-600" />
                          <span>Aguardando Secretaria</span>
                        </span>
                      ) : candidate.is_sibling_match ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-2xs font-bold">
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          <span>Irmão / Co-dependente</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-oxford/5 text-oxford text-2xs font-bold">
                          <GraduationCap className="w-3 h-3 text-oxford" />
                          <span>Estudante Localizado</span>
                        </span>
                      )}

                      <span className="text-2xs font-mono font-medium text-gray-400">
                        {candidate.registration_code}
                      </span>
                    </div>

                    {/* STUDENT INFO */}
                    <div className="flex items-start gap-3.5 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-oxford/5 border border-oxford/10 flex items-center justify-center text-oxford font-serif font-bold text-lg shrink-0 overflow-hidden">
                        {candidate.photo_url ? (
                          <img src={candidate.photo_url} alt={candidate.name} className="w-full h-full object-cover" />
                        ) : (
                          candidate.name.charAt(0)
                        )}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <h4 className="font-bold text-sm text-oxford truncate" title={candidate.name}>
                          {candidate.name}
                        </h4>
                        <p className="text-xs text-gray-600 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="truncate">{candidate.class_name} • {candidate.grade}</span>
                        </p>
                        <p className="text-2xs text-gray-500">
                          {candidate.shift} • {candidate.room}
                        </p>
                      </div>
                    </div>

                    {/* HOMONYM AMBIGUITY WARNING */}
                    {candidate.is_ambiguous && (
                      <div className="mb-3 p-2 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-2xs flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>Homônimo detectado. Confirmação manual necessária pela secretaria.</span>
                      </div>
                    )}

                    {/* ACTION BUTTON */}
                    <div className="pt-3 border-t border-gray-100/80">
                      {candidate.is_linked ? (
                        <div className="w-full py-2 px-3 rounded-xl bg-emerald-50 text-emerald-700 text-2xs font-bold flex items-center justify-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Ativo na Sua Conta Familiar</span>
                        </div>
                      ) : candidate.is_pending ? (
                        <div className="w-full py-2 px-3 rounded-xl bg-amber-50 text-amber-700 text-2xs font-bold flex items-center justify-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Solicitação em Análise pela Escola</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCandidateToConfirm(candidate)}
                          disabled={!!isLinkingId}
                          className="w-full py-2 px-3 rounded-xl bg-oxford hover:bg-oxford-dark text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-saffron" />
                          <span>Vincular Estudante</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100">
                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="font-bold text-sm text-oxford">Nenhum estudante localizado</p>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  Verifique a grafia dos nomes informados. Caso o estudante tenha ingressado recentemente, solicite à secretaria a confirmação do cadastro escolar.
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* SECTION 2: CURRENTLY LINKED STUDENTS LIST */}
      <section aria-labelledby="linked-section-title" className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
              <UserCheck className="w-4 h-4" />
              <span>Estudantes Sob Sua Responsabilidade</span>
            </div>
            <h2 id="linked-section-title" className="font-serif text-xl sm:text-2xl font-bold text-oxford">
              Seus Filhos Vinculados
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Estudantes ativos com acesso liberado a boletim, frequência, ocorrências e comunicados pedagógicos.
            </p>
          </div>

          <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-100">
            {linkedChildren.length} {linkedChildren.length === 1 ? 'dependente' : 'dependentes'}
          </span>
        </div>

        <div className="mt-6">
          {isLoadingLinked ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-oxford" />
              <p className="text-xs font-medium text-gray-500">Consultando vínculos no Supabase...</p>
            </div>
          ) : linkedChildren.length === 0 ? (
            <div className="py-12 px-6 text-center bg-gray-50/70 rounded-3xl border border-dashed border-gray-200">
              <div className="w-14 h-14 rounded-2xl bg-oxford/5 flex items-center justify-center text-oxford mx-auto mb-3">
                <Users className="w-7 h-7 text-oxford/60" />
              </div>
              <h3 className="font-serif text-base font-bold text-oxford">Nenhum estudante vinculado no momento</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 leading-relaxed">
                Utilize o formulário de pesquisa acima com seu nome e o nome do seu filho para solicitar a vinculação segura com a secretaria escolar.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {linkedChildren.map((child) => {
                const isSelectedOnPanel = activeChild?.id === child.student_id;

                return (
                  <div
                    key={child.link_id || child.student_id}
                    className={`rounded-3xl p-5 border transition-all relative overflow-hidden flex flex-col justify-between ${
                      isSelectedOnPanel
                        ? 'bg-gradient-to-b from-oxford/5 to-white border-oxford shadow-sm ring-1 ring-oxford/10'
                        : 'bg-white border-gray-100 hover:border-gray-200 shadow-xs'
                    }`}
                  >
                    <div>
                      {/* TOP BADGE */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-2xs font-mono font-bold text-gray-500">
                          RA: {child.registration_code || child.ra}
                        </span>

                        {isSelectedOnPanel ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-2xs font-bold flex items-center gap-1 shadow-xs">
                            <Sparkles className="w-2.5 h-2.5 text-saffron" />
                            <span>Ativo no Painel</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-2xs font-bold">
                            Vinculado
                          </span>
                        )}
                      </div>

                      {/* STUDENT AVATAR & NAME */}
                      <div className="flex items-start gap-3.5 mb-4">
                        <div className="w-13 h-13 rounded-2xl bg-oxford text-white font-serif font-bold text-xl flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                          {child.photo_url ? (
                            <img src={child.photo_url} alt={child.name} className="w-full h-full object-cover" />
                          ) : (
                            child.name.charAt(0)
                          )}
                        </div>

                        <div className="space-y-1 min-w-0">
                          <h4 className="font-serif font-bold text-base text-oxford leading-snug truncate" title={child.name}>
                            {child.name}
                          </h4>
                          <p className="text-xs text-gray-600 font-medium truncate">
                            {child.class_name} • {child.grade}
                          </p>
                          <p className="text-2xs text-gray-400">
                            {child.shift} • {child.room}
                          </p>
                        </div>
                      </div>

                      {/* SCHOOL TAG */}
                      <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 mb-4 flex items-center gap-2 text-2xs text-gray-600">
                        <Building2 className="w-3.5 h-3.5 text-oxford shrink-0" />
                        <span className="truncate">{child.school_name || 'Classium Colégio Modelo'}</span>
                      </div>
                    </div>

                    {/* CARD FOOTER ACTIONS */}
                    <div className="pt-3 border-t border-gray-100 flex items-center gap-2">
                      {!isSelectedOnPanel ? (
                        <button
                          type="button"
                          onClick={() => handleSetActive(child)}
                          className="flex-1 py-2 px-3 rounded-xl bg-oxford/5 hover:bg-oxford hover:text-white text-oxford text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>Selecionar</span>
                        </button>
                      ) : (
                        <div className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Visualizando</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setStudentToUnlink({
                            linkId: child.link_id,
                            studentId: child.student_id,
                            studentName: child.name
                          })
                        }
                        className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Desvincular estudante"
                        aria-label={`Desvincular estudante ${child.name}`}
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* SECTION 3: INSTRUCTIONS & FAQ */}
      <section className="bg-gray-50/80 rounded-3xl p-6 sm:p-8 border border-gray-200/70">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-oxford/10 text-oxford flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5 text-oxford" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-oxford">Como Funciona a Vinculação no Classium</h3>
            <p className="text-xs text-gray-500">Regras de segurança, privacidade e validação escolar</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-gray-600">
          <div className="space-y-1.5 p-4 rounded-2xl bg-white border border-gray-100 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-oxford">
              <span className="w-5 h-5 rounded-full bg-saffron text-oxford font-serif flex items-center justify-center text-xs">1</span>
              <span>Busca por Nomes Oficiais</span>
            </div>
            <p className="leading-relaxed text-gray-500">
              Digite seu nome completo e o nome completo do estudante exatamente como constam na certidão ou ficha de matrícula entregue à escola.
            </p>
          </div>

          <div className="space-y-1.5 p-4 rounded-2xl bg-white border border-gray-100 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-oxford">
              <span className="w-5 h-5 rounded-full bg-saffron text-oxford font-serif flex items-center justify-center text-xs">2</span>
              <span>Irmãos e Co-dependentes</span>
            </div>
            <p className="leading-relaxed text-gray-500">
              Ao validar a relação com um estudante, o Classium identifica automaticamente outros filhos vinculados ao mesmo responsável nesta unidade escolar.
            </p>
          </div>

          <div className="space-y-1.5 p-4 rounded-2xl bg-white border border-gray-100 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-oxford">
              <span className="w-5 h-5 rounded-full bg-saffron text-oxford font-serif flex items-center justify-center text-xs">3</span>
              <span>Aprovação da Secretaria</span>
            </div>
            <p className="leading-relaxed text-gray-500">
              Caso o vínculo ainda não esteja confirmado nos registros da secretaria, a solicitação é encaminhada para conferência da equipe escolar.
            </p>
          </div>
        </div>
      </section>

      {/* CONFIRMATION MODAL: SINGLE STUDENT LINK */}
      {candidateToConfirm && (
        <div className="fixed inset-0 bg-oxford/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 text-left animate-scale-in text-oxford">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-oxford">Confirmar Vinculação</h3>
                <p className="text-xs text-gray-500">Validação com a secretaria escolar</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-4 space-y-1">
              <p className="text-sm font-bold text-oxford">{candidateToConfirm.name}</p>
              <p className="text-xs text-gray-600">{candidateToConfirm.class_name} • {candidateToConfirm.grade}</p>
              <p className="text-2xs text-gray-400 font-mono">RA: {candidateToConfirm.registration_code}</p>
            </div>

            <p className="text-xs text-gray-600 mb-6 leading-relaxed">
              Você confirma o vínculo com o(a) estudante acima como responsável legal? Uma vez confirmado, você terá acesso completo às notas, frequências e comunicados escolares.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setCandidateToConfirm(null)}
                disabled={!!isLinkingId}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => executeLink(candidateToConfirm)}
                disabled={!!isLinkingId}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLinkingId ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Vinculação</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: UNLINK STUDENT */}
      {studentToUnlink && (
        <div className="fixed inset-0 bg-oxford/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 text-left animate-scale-in text-oxford">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <UserMinus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-oxford">Desvincular Aluno</h3>
                <p className="text-xs text-gray-500">Remoção do vínculo escolar</p>
              </div>
            </div>

            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 mb-4">
              <p className="text-sm font-bold text-oxford">{studentToUnlink.studentName}</p>
            </div>

            <p className="text-xs text-gray-600 mb-6 leading-relaxed">
              Deseja realmente desvincular o estudante <strong className="text-oxford">{studentToUnlink.studentName}</strong> da sua conta familiar? O vínculo será removido de forma segura na base de dados da escola.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setStudentToUnlink(null)}
                disabled={!!isUnlinking}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmUnlinkChild}
                disabled={!!isUnlinking}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2 shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isUnlinking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Desvinculando...</span>
                  </>
                ) : (
                  <>
                    <UserMinus className="w-4 h-4" />
                    <span>Confirmar Desvinculação</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
