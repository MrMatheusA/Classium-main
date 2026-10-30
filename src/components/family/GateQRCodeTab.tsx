import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ShieldCheck, QrCode, Plus, Clock, CheckCircle, XCircle, Copy, Check, 
  Trash2, AlertCircle, User, Phone, Calendar, Sparkles, Filter, Package, Loader2, RefreshCw, X, Eye
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { RealtimeSyncBadge } from '../common/RealtimeSyncBadge';
import { supabase } from '../../lib/supabase';
import { 
  AccessControlService, 
  PickupAuthorizationData, 
  maskCpfDisplay 
} from '../../services/accessControlService';
import { playNotificationChime } from '../../utils/audioNotification';

export interface LinkedStudentOption {
  id: string;
  name: string;
  grade: string;
  photoUrl: string;
  schoolId?: string;
}

export function GateQRCodeTab() {
  const { currentFamilyStudent, familyStudents, user } = usePlatform();
  const activeSchoolId = currentFamilyStudent?.schoolId || user?.schoolId || undefined;

  // Authorizations State
  const [authorizations, setAuthorizations] = useState<PickupAuthorizationData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Real Linked Students
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [retireeName, setRetireeName] = useState<string>('');
  const [retireeCpf, setRetireeCpf] = useState<string>('');
  const [retireePhone, setRetireePhone] = useState<string>('(11) 98765-4321');
  const [retireeRelationship, setRetireeRelationship] = useState<string>('Pai/Mãe');
  const [authDate, setAuthDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [authTimeWindowEnd, setAuthTimeWindowEnd] = useState<string>('17:30');
  const [reason, setReason] = useState<string>('Saída Regular Autorizada');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Details Modal
  const [selectedDetailAuth, setSelectedDetailAuth] = useState<PickupAuthorizationData | null>(null);

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Fetch Real Linked Students
  const fetchLinkedStudents = useCallback(async () => {
    try {
      const { data: linkedData } = await supabase
        .from('student_guardians')
        .select(`
          student_id,
          guardian_name,
          guardian_phone,
          students (
            id,
            name,
            full_name,
            room,
            photo_url,
            avatar_url,
            school_id,
            classes ( name )
          )
        `);

      if (linkedData && linkedData.length > 0) {
        const mapped: LinkedStudentOption[] = linkedData
          .filter((item: any) => item.students)
          .map((item: any) => ({
            id: item.students.id,
            name: item.students.full_name || item.students.name || 'Estudante',
            grade: item.students.room || item.students.classes?.name || '7º Ano A',
            photoUrl: item.students.photo_url || item.students.avatar_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200',
            schoolId: item.students.school_id || activeSchoolId
          }));

        const unique = Array.from(new Map(mapped.map(s => [s.id, s])).values());
        if (unique.length > 0) {
          setLinkedStudents(unique);
          setSelectedStudentId(unique[0].id);
        }
      } else if (familyStudents && familyStudents.length > 0) {
        const mapped = familyStudents.map(s => ({
          id: s.id,
          name: s.name,
          grade: s.grade,
          photoUrl: s.avatarUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200',
          schoolId: s.schoolId || activeSchoolId
        }));
        setLinkedStudents(mapped);
        setSelectedStudentId(mapped[0]?.id || '');
      } else if (currentFamilyStudent) {
        setLinkedStudents([{
          id: currentFamilyStudent.id,
          name: currentFamilyStudent.name,
          grade: currentFamilyStudent.grade,
          photoUrl: currentFamilyStudent.avatarUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200',
          schoolId: currentFamilyStudent.schoolId || activeSchoolId
        }]);
        setSelectedStudentId(currentFamilyStudent.id);
      }
    } catch (err) {
      console.warn('Erro ao carregar estudantes vinculados:', err);
    }
  }, [familyStudents, currentFamilyStudent, activeSchoolId]);

  // 2. Fetch Authorizations
  const fetchAuthorizations = useCallback(async () => {
    try {
      setIsSyncing(true);
      const authList = await AccessControlService.getAuthorizations(activeSchoolId);
      setAuthorizations(authList);
    } catch (err) {
      console.warn('Erro ao carregar autorizações da família:', err);
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  }, [activeSchoolId]);

  useEffect(() => {
    fetchLinkedStudents();
    fetchAuthorizations();
  }, [fetchLinkedStudents, fetchAuthorizations]);

  // 3. Realtime Subscription
  useEffect(() => {
    const unsub = AccessControlService.subscribeToGateChanges(() => {
      fetchAuthorizations();
    }, activeSchoolId);

    return () => unsub();
  }, [fetchAuthorizations, activeSchoolId]);

  // Copy token to clipboard
  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    showToast('Código do token copiado com sucesso!', 'info');
    setTimeout(() => setCopiedToken(null), 3000);
  };

  // Submit new authorization
  const handleCreateAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !retireeName.trim()) {
      showToast('Preencha os campos obrigatórios do formulário.', 'error');
      return;
    }

    const stObj = linkedStudents.find(s => s.id === selectedStudentId) || linkedStudents[0];
    if (!stObj) return;

    setIsSubmitting(true);
    try {
      const validUntilISO = `${authDate}T${authTimeWindowEnd}:00.000Z`;

      const res = await AccessControlService.createAuthorization({
        studentIds: [stObj.id],
        studentsData: [{
          id: stObj.id,
          name: stObj.name,
          grade: stObj.grade,
          photoUrl: stObj.photoUrl
        }],
        retireeName,
        retireeCpf,
        retireePhone,
        retireeRelationship,
        authorizationDate: authDate,
        validUntil: validUntilISO,
        reason,
        guardianName: user?.name || 'Responsável Titular',
        schoolId: activeSchoolId
      });

      if (res.success) {
        playNotificationChime('success');
        showToast('Autorização de saída emitida com sucesso!', 'success');
        setIsCreateModalOpen(false);
        setRetireeName('');
        setRetireeCpf('');
        await fetchAuthorizations();
      } else {
        showToast(res.error || 'Falha ao emitir autorização.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro durante a submissão.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel authorization
  const handleCancelAuth = async (id: string) => {
    if (confirm('Deseja cancelar esta autorização de saída? O token deixará de ser aceito na portaria.')) {
      const res = await AccessControlService.cancelAuthorization(id);
      if (res.success) {
        playNotificationChime('warning');
        showToast('Autorização cancelada.', 'info');
        await fetchAuthorizations();
      } else {
        showToast(res.error || 'Erro ao cancelar autorização.', 'error');
      }
    }
  };

  const activeAuthorizations = useMemo(() => {
    return authorizations.filter(a => a.status === 'pending' || a.status === 'ativo');
  }, [authorizations]);

  const pastAuthorizations = useMemo(() => {
    return authorizations.filter(a => a.status !== 'pending' && a.status !== 'ativo');
  }, [authorizations]);

  return (
    <div className="space-y-6 text-left animate-fade-in">
      
      {/* TOAST FEEDBACK */}
      {toastMessage && (
        <div className={`p-4 rounded-2xl border shadow-lg flex items-center justify-between transition-all ${
          toastMessage.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-950' :
          toastMessage.type === 'error' ? 'bg-rose-50 border-rose-300 text-rose-950' :
          'bg-blue-50 border-blue-300 text-blue-950'
        }`}>
          <div className="flex items-center gap-3">
            {toastMessage.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> :
             toastMessage.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-600" /> :
             <Sparkles className="w-5 h-5 text-blue-600" />}
            <span className="text-xs font-bold uppercase tracking-wider">{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="p-1 text-slate-500 hover:text-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-6">
        
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm">
              <ShieldCheck className="w-5 h-5 text-blue-900" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-bold text-oxford">Portaria Segura & QR Code</h3>
                <RealtimeSyncBadge moduleName="Portal Família" />
              </div>
              <p className="text-xs text-gray-500">
                Emita autorizações digitais com QR Code e acompanhe em tempo real quem retira seus filhos na escola.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchAuthorizations()}
              disabled={isSyncing}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl transition-all"
              title="Atualizar lista"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-900' : ''}`} />
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold uppercase text-xs rounded-2xl transition-all shadow-md flex items-center gap-1.5 min-h-[42px]"
            >
              <Plus className="w-4 h-4" /> Nova Autorização de Saída
            </button>
          </div>
        </div>

        {/* ACTIVE AUTHORIZATIONS CARDS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-serif text-base font-bold text-oxford flex items-center gap-2">
              <span>Tokens e QR Codes Ativos</span>
              <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">
                {activeAuthorizations.length} Ativos
              </span>
            </h4>
          </div>

          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-900 animate-spin mx-auto" />
              <p className="text-xs font-semibold text-gray-500">Carregando autorizações vigentes...</p>
            </div>
          ) : activeAuthorizations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeAuthorizations.map(auth => {
                const student = auth.students_payload?.[0] || { name: 'Aluno', grade: '7º Ano' };

                return (
                  <div
                    key={auth.id}
                    className="border-2 border-emerald-300 rounded-3xl p-5 bg-gradient-to-br from-emerald-50/40 via-white to-white shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-all relative overflow-hidden"
                  >
                    <div className="space-y-3">
                      
                      {/* Top Header: Badge & Actions */}
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 flex items-center gap-1 shadow-sm">
                          <Clock className="w-3 h-3 text-emerald-700 animate-pulse" /> Válido para Hoje
                        </span>

                        <button
                          onClick={() => handleCancelAuth(auth.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Cancelar esta autorização"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Student Info */}
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                          <img 
                            src={student?.photo_url || (student as any)?.avatar_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200'} 
                            alt={student?.name || 'Aluno'}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="overflow-hidden text-left">
                          <p className="font-bold text-oxford text-sm truncate">{student?.name || 'Aluno'}</p>
                          <p className="text-xs text-slate-500">{student?.grade || '7º Ano A'}</p>
                        </div>
                      </div>

                      {/* Retirante Details */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1 text-slate-800">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Retirante Autorizado:</p>
                        <p className="font-bold text-slate-900">{auth.retiree_name}</p>
                        <p>Vínculo: <strong>{auth.retiree_relationship || 'Responsável'}</strong></p>
                        <p>CPF: <span className="font-mono">{maskCpfDisplay(auth.retiree_cpf)}</span></p>
                      </div>

                      {/* Token Code Display Box */}
                      <div className="p-3 bg-blue-900 text-white rounded-2xl flex items-center justify-between shadow-inner">
                        <div>
                          <p className="text-[9px] font-bold text-blue-200 uppercase tracking-wider">Código de Portaria</p>
                          <p className="font-mono text-sm font-black tracking-wider">{auth.token_code}</p>
                        </div>
                        <button
                          onClick={() => handleCopyToken(auth.token_code)}
                          className="p-2 bg-blue-800 hover:bg-blue-700 text-white rounded-xl transition-all"
                          title="Copiar código do token"
                        >
                          {copiedToken === auth.token_code ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>

                    </div>

                    {/* Footer Date & Validity */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Data: {auth.authorization_date}</span>
                      <button
                        onClick={() => setSelectedDetailAuth(auth)}
                        className="text-blue-900 font-bold hover:underline flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Ver QR Code
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 bg-slate-50 border border-slate-200 rounded-3xl text-center space-y-3 p-6">
              <Package className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-800">Nenhuma autorização ativa no momento.</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Precisa que um parente ou responsável busque seu filho hoje? Clique em <strong>Nova Autorização de Saída</strong>.
              </p>
            </div>
          )}
        </div>

        {/* HISTORIC AUTHORIZATIONS SECTION */}
        {pastAuthorizations.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-gray-100">
            <h4 className="font-serif text-base font-bold text-oxford">Histórico de Autorizações Anteriores</h4>
            
            <div className="overflow-x-auto border border-gray-200 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-gray-200">
                    <th className="p-3">Data</th>
                    <th className="p-3">Estudante</th>
                    <th className="p-3">Retirante</th>
                    <th className="p-3">Código</th>
                    <th className="p-3">Portaria / Atendimento</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pastAuthorizations.map(auth => (
                    <tr key={auth.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 text-slate-600 whitespace-nowrap">{auth.authorization_date}</td>
                      <td className="p-3 font-bold text-slate-900">{auth.students_payload?.[0]?.name || 'Aluno'}</td>
                      <td className="p-3 font-medium text-slate-800">{auth.retiree_name}</td>
                      <td className="p-3 font-mono text-slate-600">{auth.token_code}</td>
                      <td className="p-3 text-slate-600">
                        {auth.validated_by ? `${auth.portaria_name || 'Portaria'} (por ${auth.validated_by})` : '—'}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase border shadow-sm ${
                          auth.status === 'used' || auth.status === 'usado'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {auth.status === 'used' || auth.status === 'usado' ? 'Saída Concluída' : 'Cancelado / Expirado'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* MODAL: NOVA AUTORIZAÇÃO DE SAÍDA */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 text-left space-y-5 border border-gray-200 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
                <ShieldCheck className="w-5 h-5 text-blue-900" />
              </div>
              <div>
                <h4 className="font-serif text-base font-bold text-oxford">Autorizar Saída de Estudante</h4>
                <p className="text-xs text-gray-500">Gere um token seguro com QR Code para apresentação na portaria.</p>
              </div>
            </div>

            <form onSubmit={handleCreateAuthSubmit} className="space-y-4 text-xs">
              
              {/* Seleção do Filho */}
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
                  Selecione o Filho / Estudante *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {linkedStudents.filter(Boolean).map(student => (
                    <div
                      key={student?.id || 'std'}
                      onClick={() => student?.id && setSelectedStudentId(student.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                        selectedStudentId === student?.id
                          ? 'border-blue-900 bg-blue-50/60 ring-2 ring-blue-900/20 shadow-sm'
                          : 'border-gray-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <img 
                        src={student?.photoUrl} 
                        alt={student?.name || 'Estudante'} 
                        className="w-9 h-9 rounded-full object-cover border border-gray-300"
                      />
                      <div className="text-left overflow-hidden">
                        <p className="font-bold text-oxford truncate text-xs">{student?.name || 'Estudante'}</p>
                        <p className="text-[10px] text-gray-500 font-medium">{student?.grade || 'Turma'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Retirante & CPF */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
                    Nome Completo do Retirante *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Tio Roberto da Silva"
                    value={retireeName}
                    onChange={(e) => setRetireeName(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-300 rounded-xl p-3 text-xs text-oxford font-medium focus:border-blue-900 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
                    CPF do Retirante (com máscara) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="000.000.000-00"
                    value={retireeCpf}
                    onChange={(e) => setRetireeCpf(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-300 rounded-xl p-3 text-xs text-oxford font-mono font-medium focus:border-blue-900 outline-none"
                  />
                </div>
              </div>

              {/* Vínculo & Telefone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
                    Grau de Parentesco / Vínculo
                  </label>
                  <select
                    value={retireeRelationship}
                    onChange={(e) => setRetireeRelationship(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-300 rounded-xl p-3 text-xs text-oxford font-medium focus:border-blue-900 outline-none"
                  >
                    <option value="Pai/Mãe">Pai / Mãe</option>
                    <option value="Avô/Avó">Avô / Avó</option>
                    <option value="Tio/Tia">Tio / Tia</option>
                    <option value="Irmão/Irmã Maior">Irmão / Irmã Maior de Idade</option>
                    <option value="Transporte / Motorista">Transporte Escolar / Motorista</option>
                    <option value="Outro Autorizado">Outro Autorizado</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
                    Telefone para Contato
                  </label>
                  <input
                    type="text"
                    value={retireePhone}
                    onChange={(e) => setRetireePhone(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-300 rounded-xl p-3 text-xs text-oxford font-mono font-medium focus:border-blue-900 outline-none"
                  />
                </div>
              </div>

              {/* Data & Horário Limite */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
                    Data da Retirada
                  </label>
                  <input
                    type="date"
                    value={authDate}
                    onChange={(e) => setAuthDate(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-300 rounded-xl p-3 text-xs text-oxford font-medium focus:border-blue-900 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
                    Horário Limite de Saída
                  </label>
                  <input
                    type="time"
                    value={authTimeWindowEnd}
                    onChange={(e) => setAuthTimeWindowEnd(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-300 rounded-xl p-3 text-xs text-oxford font-medium focus:border-blue-900 outline-none"
                  />
                </div>
              </div>

              {/* Motivo */}
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
                  Motivo da Saída
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-300 rounded-xl p-3 text-xs text-oxford font-medium focus:border-blue-900 outline-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold uppercase text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Emitir Autorização</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL: VISUALIZADOR DE QR CODE & DETALHES */}
      {selectedDetailAuth && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 border border-gray-200 shadow-2xl relative">
            <button
              onClick={() => setSelectedDetailAuth(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h4 className="font-serif text-lg font-bold text-oxford">QR Code de Portaria</h4>
              <p className="text-xs text-gray-500">Apresente este código no leitor óptico da portaria escolar.</p>
            </div>

            {/* QR Visualizer Box */}
            <div className="p-6 bg-slate-900 text-white rounded-3xl border border-slate-800 space-y-3">
              <div className="w-40 h-40 bg-white p-3 rounded-2xl mx-auto flex items-center justify-center shadow-lg">
                <QrCode className="w-32 h-32 text-slate-950" />
              </div>
              <p className="font-mono text-base font-black text-emerald-400 tracking-wider">
                {selectedDetailAuth.token_code}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl text-xs text-left space-y-1.5 border border-gray-200 text-gray-700">
              <p><strong>Estudante:</strong> {selectedDetailAuth.students_payload?.[0]?.name || 'Aluno'}</p>
              <p><strong>Retirante Autorizado:</strong> {selectedDetailAuth.retiree_name}</p>
              <p><strong>CPF:</strong> {maskCpfDisplay(selectedDetailAuth.retiree_cpf)}</p>
              <p><strong>Válido em:</strong> {selectedDetailAuth.authorization_date}</p>
            </div>

            <button
              onClick={() => setSelectedDetailAuth(null)}
              className="w-full py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold uppercase text-xs rounded-xl shadow"
            >
              Fechar Visualizador
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
