import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Shirt, CheckCircle, Clock, Tag, Search, MapPin, Calendar, 
  User, Phone, Eye, X, AlertCircle, ShieldCheck, Sparkles, Filter, Package, Loader2, RefreshCw
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { RealtimeSyncBadge } from '../common/RealtimeSyncBadge';
import { supabase } from '../../lib/supabase';
import { 
  LostAndFoundService, 
  LostAndFoundDbItem, 
  DEFAULT_PHOTOS 
} from '../../services/lostFoundService';
import { integrationHub } from '../../lib/integrationHub';
import { playNotificationChime } from '../../utils/audioNotification';

export interface LinkedStudentOption {
  id: string;
  name: string;
  grade: string;
  photoUrl: string;
  schoolId?: string;
}

export function LostFoundTab() {
  const { 
    lostAndFoundItems, 
    reserveLostAndFoundItem, 
    currentFamilyStudent, 
    familyStudents,
    user 
  } = usePlatform();

  // Supabase items state
  const [supabaseItems, setSupabaseItems] = useState<LostAndFoundDbItem[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  // Real Students State
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Modals state
  const [claimingItem, setClaimingItem] = useState<LostAndFoundDbItem | null>(null);
  const [selectedDetailItem, setSelectedDetailItem] = useState<LostAndFoundDbItem | null>(null);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState<boolean>(false);
  const [successReservation, setSuccessReservation] = useState<{
    itemName: string;
    studentName: string;
    guardianName: string;
  } | null>(null);

  // Form state
  const [guardianNameInput, setGuardianNameInput] = useState(
    user?.name || currentFamilyStudent?.guardians?.[0]?.name || 'Maria das Graças Silva'
  );
  const [responsiblePhone, setResponsiblePhone] = useState('(11) 98765-4321');

  // Categories list exactly matching mockup
  const categories = [
    'Todas',
    'Vestuário',
    'Material Escolar',
    'Acessórios/Eletrônicos',
    'Garrafas/Utensílios',
    'Outros'
  ];

  // Active School ID for School-level isolation
  const selectedStudentObj = linkedStudents.find(s => s.id === selectedStudentId);
  const activeSchoolId = selectedStudentObj?.schoolId || currentFamilyStudent?.schoolId || user?.schoolId || '';

  // 1. Fetch Supabase Items with School-level Isolation
  const fetchDbItems = useCallback(async () => {
    if (!activeSchoolId) {
      setIsLoading(false);
      return;
    }
    try {
      setIsSyncing(true);
      const dbItems = await LostAndFoundService.getItems(activeSchoolId);
      setSupabaseItems(dbItems || []);
    } catch (err) {
      console.error('Erro ao buscar itens de achados e perdidos:', err);
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  }, [activeSchoolId]);

  // 2. Fetch Real Linked Students for Logged User
  const fetchLinkedStudents = useCallback(async () => {
    try {
      const { data: linkedData } = await supabase
        .from('student_guardians')
        .select(`
          student_id,
          guardian_profile_id,
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
            photoUrl: item.students.photo_url || item.students.avatar_url || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150',
            schoolId: item.students.school_id || activeSchoolId
          }));

        const unique = Array.from(new Map(mapped.map(s => [s.id, s])).values());
        if (unique.length > 0) {
          setLinkedStudents(unique);
          setSelectedStudentId(unique[0].id);
        }

        const firstGuardian = linkedData[0];
        if (firstGuardian.guardian_name) {
          setGuardianNameInput(firstGuardian.guardian_name);
        }
        if (firstGuardian.guardian_phone) {
          setResponsiblePhone(firstGuardian.guardian_phone);
        }
      } else if (familyStudents && familyStudents.length > 0) {
        const mapped = familyStudents.map(s => ({
          id: s.id,
          name: s.name,
          grade: s.grade,
          photoUrl: s.avatarUrl || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150',
          schoolId: s.schoolId || activeSchoolId
        }));
        setLinkedStudents(mapped);
        setSelectedStudentId(mapped[0]?.id || '');
      } else if (currentFamilyStudent) {
        setLinkedStudents([{
          id: currentFamilyStudent.id,
          name: currentFamilyStudent.name,
          grade: currentFamilyStudent.grade,
          photoUrl: currentFamilyStudent.avatarUrl || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150',
          schoolId: currentFamilyStudent.schoolId || activeSchoolId
        }]);
        setSelectedStudentId(currentFamilyStudent.id);
      }
    } catch (err) {
      console.warn('Erro ao carregar estudantes vinculados:', err);
    }
  }, [familyStudents, currentFamilyStudent, activeSchoolId]);

  // Reset state and refetch when student or school changes
  useEffect(() => {
    setSupabaseItems([]);
    setClaimingItem(null);
    setSelectedDetailItem(null);
    setSuccessReservation(null);
    setSelectedCategory('Todas');
    setSearchQuery('');
    setIsLoading(true);

    if (activeSchoolId) {
      fetchDbItems();
    } else {
      setIsLoading(false);
    }
  }, [selectedStudentId, activeSchoolId, fetchDbItems]);

  useEffect(() => {
    fetchLinkedStudents();
  }, [fetchLinkedStudents]);

  // 3. Realtime Supabase Subscription & Integration Hub
  useEffect(() => {
    const channel = supabase
      .channel(`lost_found_family_realtime_${activeSchoolId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lost_and_found_items' },
        () => {
          fetchDbItems();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lost_and_found_reservations' },
        () => {
          fetchDbItems();
        }
      )
      .subscribe();

    const unsubHub = integrationHub.subscribe((event) => {
      if (event.entity === 'achados_perdidos') {
        fetchDbItems();
      }
    });

    return () => {
      supabase.removeChannel(channel);
      unsubHub();
    };
  }, [fetchDbItems, activeSchoolId]);

  // Phone Formatter
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    let formatted = raw;
    if (raw.length > 2 && raw.length <= 7) formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    else if (raw.length > 7) formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
    setResponsiblePhone(formatted.substring(0, 15));
  };

  // Filter items based on category and search query (excluding arquivado)
  const filteredItems = useMemo(() => {
    return supabaseItems.filter(item => {
      if (item.status === 'arquivado' || item.status === 'discarded') return false;

      const catLower = (item.category || '').toLowerCase();
      const selLower = selectedCategory.toLowerCase();

      let matchesCategory = selectedCategory === 'Todas';
      if (!matchesCategory) {
        if (selLower === 'vestuário' && (catLower.includes('vestu') || catLower.includes('roupa') || catLower.includes('moletom') || catLower.includes('casaco'))) {
          matchesCategory = true;
        } else if (selLower === 'material escolar' && (catLower.includes('material') || catLower.includes('estojo') || catLower.includes('bolsa') || catLower.includes('caderno') || catLower.includes('mochila'))) {
          matchesCategory = true;
        } else if (selLower === 'garrafas/utensílios' && (catLower.includes('garrafa') || catLower.includes('lancheira') || catLower.includes('utens') || catLower.includes('copo') || catLower.includes('térmica'))) {
          matchesCategory = true;
        } else if (selLower === 'acessórios/eletrônicos' && (catLower.includes('acess') || catLower.includes('eletr') || catLower.includes('fone') || catLower.includes('óculos') || catLower.includes('relógio'))) {
          matchesCategory = true;
        } else if (selLower === 'outros' && catLower === 'outros') {
          matchesCategory = true;
        } else if (catLower === selLower) {
          matchesCategory = true;
        }
      }

      const query = (searchQuery || '').toLowerCase().trim();
      const itemName = (item.name || '').toLowerCase();
      const itemDesc = (item.description || '').toLowerCase();
      const itemLoc = (item.location_found || '').toLowerCase();
      const itemSetor = (item.setor || '').toLowerCase();
      const itemCat = (item.category || '').toLowerCase();

      const matchesSearch = 
        !query ||
        itemName.includes(query) ||
        itemDesc.includes(query) ||
        itemLoc.includes(query) ||
        itemSetor.includes(query) ||
        itemCat.includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [supabaseItems, selectedCategory, searchQuery]);

  // Handle Reservation Submission
  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimingItem) return;

    const chosenStudent = linkedStudents.find(s => s.id === selectedStudentId) || linkedStudents[0] || {
      id: 'std-1',
      name: currentFamilyStudent?.name || 'João Silva de Alencar',
      grade: currentFamilyStudent?.grade || '7º Ano A',
      photoUrl: ''
    };

    setIsSubmittingClaim(true);

    try {
      // 1. Update Platform Context state (instant feedback & integration Hub)
      reserveLostAndFoundItem(
        claimingItem.id,
        chosenStudent.id,
        chosenStudent.name,
        chosenStudent.grade,
        guardianNameInput || 'Maria das Graças Silva',
        responsiblePhone || '(11) 98765-4321'
      );

      // 2. Persist in Supabase DB via LostAndFoundService
      await LostAndFoundService.reserveItem({
        itemId: claimingItem.id,
        studentId: chosenStudent.id,
        guardianProfileId: user?.id,
        responsibleName: guardianNameInput || 'Maria das Graças Silva',
        studentName: chosenStudent.name,
        studentGrade: chosenStudent.grade,
        responsiblePhone: responsiblePhone || '(11) 98765-4321'
      });

      playNotificationChime('info');
      
      setSuccessReservation({
        itemName: claimingItem.name,
        studentName: chosenStudent.name,
        guardianName: guardianNameInput || 'Maria das Graças Silva'
      });
      setClaimingItem(null);
      await fetchDbItems();
    } catch (err) {
      console.error('Erro na submissão da reserva:', err);
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-6">
        
        {/* HEADER SECTION */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm">
              <Shirt className="w-5 h-5 text-blue-900" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-bold text-oxford">Achados e Perdidos Digital</h3>
                <RealtimeSyncBadge moduleName="Portal Família" />
              </div>
              <p className="text-xs text-gray-500">
                Esqueceu algo na escola? Veja fotos dos objetos catalogados pela gestão e solicite a reserva para seu filho.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* SYNC BUTTON */}
            <button
              onClick={() => fetchDbItems()}
              disabled={isSyncing}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-all"
              title="Atualizar catálogo"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-900' : ''}`} />
            </button>

            {/* SEARCH BAR */}
            <div className="relative flex-1 sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Buscar por casaco, garrafa, setor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-2xl pl-10 pr-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-blue-900 transition-all font-medium"
              />
            </div>
          </div>
        </div>

        {/* CATEGORY FILTER PILLS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mr-1">
            <Filter className="w-3.5 h-3.5 text-slate-600" /> CATEGORIA:
          </span>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-blue-900 text-white border-blue-900 shadow-sm font-bold'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* ACTIVE GRID ITEMS */}
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-blue-900 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-gray-500">Carregando catálogo de achados e perdidos...</p>
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map(item => {
              const isAvailable = item.status === 'disponivel' || item.status === 'available';
              const isReserved = item.status === 'reservado' || item.status === 'reserved';
              const isReturned = item.status === 'entregue' || item.status === 'returned';

              const displayPhoto = item.photo_url || item.image_url || DEFAULT_PHOTOS[item.category] || DEFAULT_PHOTOS['Outros'];
              const displayLocation = item.location_found || 'Pátio Central';
              const displaySetor = item.setor || 'Geral';
              const displayDate = item.found_date || item.date_found || 'Recente';

              return (
                <div 
                  key={item.id} 
                  className={`border rounded-3xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all relative flex flex-col justify-between ${
                    isReserved ? 'border-amber-300 bg-amber-50/10' :
                    isReturned ? 'border-emerald-200 bg-emerald-50/10' :
                    'border-gray-200 hover:border-blue-900/30'
                  }`}
                >
                  {/* PHOTO HEADER WITH STATUS BADGE & CATEGORY PILL */}
                  <div className="relative">
                    {/* Status Badge Top-Right */}
                    <div className="absolute top-3 right-3 z-10">
                      <span className={`text-xs uppercase font-bold px-3 py-1 rounded-full border shadow-sm flex items-center gap-1.5 ${
                        isAvailable ? 'bg-emerald-50 text-emerald-900 border-emerald-300' :
                        isReserved ? 'bg-amber-100 text-amber-950 border-amber-400 font-black animate-pulse' :
                        'bg-blue-50 text-blue-950 border-blue-200 font-bold'
                      }`}>
                        {isAvailable ? (
                          <><CheckCircle className="w-3.5 h-3.5 text-emerald-700" /> DISPONÍVEL NA SECRETARIA</>
                        ) : isReserved ? (
                          <><Clock className="w-3.5 h-3.5 text-amber-700" /> RESERVADO PARA RETIRADA</>
                        ) : (
                          <><CheckCircle className="w-3.5 h-3.5 text-blue-700" /> ITEM DEVOLVIDO / RETIRADO</>
                        )}
                      </span>
                    </div>

                    {/* Photo Container */}
                    <div 
                      className="h-48 bg-slate-100 relative overflow-hidden flex items-center justify-center cursor-pointer group"
                      onClick={() => setSelectedDetailItem(item)}
                    >
                      <img 
                        src={displayPhoto} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Category Label Bottom-Left */}
                      <span className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md text-white text-xs uppercase font-bold px-2.5 py-1 rounded-lg border border-white/10 tracking-wider">
                        {item.category}
                      </span>

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <span className="bg-white/95 text-slate-900 text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-blue-900" /> Ver Detalhes
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* DETAILS & METADATA SECTION */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2 text-left">
                      <h4 
                        onClick={() => setSelectedDetailItem(item)}
                        className="text-base font-bold text-slate-900 leading-snug line-clamp-2 hover:text-blue-900 cursor-pointer transition-colors"
                      >
                        {item.name}
                      </h4>
                      <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                        {item.description || 'Sem descrição cadastrada.'}
                      </p>
                      
                      {/* Location and Date */}
                      <div className="space-y-1 text-xs text-slate-700 pt-2 border-t border-gray-100">
                        <p className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-blue-900 shrink-0" /> 
                          <span>Local: <strong className="font-semibold text-slate-900">{displayLocation} ({displaySetor})</strong></span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-900 shrink-0" /> 
                          <span>Encontrado em: <strong className="font-semibold text-slate-900">{displayDate}</strong></span>
                        </p>
                      </div>

                      {/* RESERVATION INFO BOX */}
                      {isReserved && (
                        <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 mt-2 space-y-1 animate-fade-in">
                          <p className="font-bold flex items-center gap-1.5 text-amber-900 uppercase tracking-wider text-xs">
                            <Clock className="w-3.5 h-3.5 text-amber-700" /> Reserva Efetuada:
                          </p>
                          <p>Solicitado por: <strong className="text-slate-900">{item.reservation?.responsible_name || 'Maria das Graças Silva'}</strong></p>
                          <p>Aluno: <strong className="text-slate-900">{item.reservation?.student_name || 'João Silva de Alencar'}</strong> {item.reservation?.student_grade ? `(${item.reservation.student_grade})` : ''}</p>
                          <p className="text-xs text-amber-900 font-mono">
                            Data da reserva: {item.reservation?.reservation_date || displayDate} {item.reservation?.reservation_time ? `às ${item.reservation.reservation_time}` : ''}
                          </p>
                        </div>
                      )}

                      {/* DELIVERED INFO BOX */}
                      {isReturned && (
                        <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 mt-2 space-y-1 animate-fade-in">
                          <p className="font-bold flex items-center gap-1.5 text-emerald-900 uppercase tracking-wider text-xs">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-700" /> Item Devolvido:
                          </p>
                          <p>Retirado em: <strong className="text-slate-900">{item.delivered_date || '13/07/2026'}</strong></p>
                          <p>Atendido por: <strong className="text-slate-900">{item.delivered_by_staff || item.delivered_by || 'Secretaria'}</strong></p>
                        </div>
                      )}
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => setSelectedDetailItem(item)}
                        className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold transition-colors cursor-pointer min-h-[42px]"
                        title="Ver Detalhes do Item"
                      >
                        <Eye className="w-4 h-4 text-slate-700" />
                      </button>

                      {isAvailable && (
                        <button 
                          onClick={() => {
                            setClaimingItem(item);
                            if (linkedStudents.length > 0) {
                              setSelectedStudentId(linkedStudents[0].id);
                            }
                          }}
                          className="flex-1 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] min-h-[42px]"
                        >
                          <Tag className="w-3.5 h-3.5 text-amber-300" /> É DO MEU FILHO (RESERVAR)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center text-gray-500 space-y-2">
            <Package className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="font-semibold text-gray-700 text-sm">Nenhum objeto encontrado.</p>
            <p className="text-xs text-gray-400">Tente buscar por outro termo ou mude o filtro de categoria selecionado.</p>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* MODAL 1: CONFIRMAR RESERVA COM SELEÇÃO DE FILHO */}
      {/* ==================================================================== */}
      {claimingItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 text-left space-y-5 border border-gray-200 shadow-2xl relative">
            <button
              onClick={() => setClaimingItem(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Modal */}
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
                <Tag className="w-5 h-5 text-blue-900" />
              </div>
              <div>
                <h4 className="font-serif text-base font-bold text-oxford">Confirmar Reserva de Objeto</h4>
                <p className="text-xs text-gray-500">Solicitar que a equipe escolar separe este item na secretaria.</p>
              </div>
            </div>

            {/* Resumo do Objeto */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-gray-200 flex gap-3.5 items-center">
              <img 
                src={claimingItem.photo_url || claimingItem.image_url || DEFAULT_PHOTOS[claimingItem.category]} 
                alt={claimingItem.name} 
                className="w-16 h-16 rounded-xl object-cover border border-gray-200 shadow-sm"
              />
              <div className="text-xs space-y-0.5 text-gray-700">
                <p className="font-bold text-oxford text-sm">{claimingItem.name}</p>
                <p className="text-gray-500">Categoria: <strong>{claimingItem.category}</strong></p>
                <p className="text-gray-500">Encontrado em: {claimingItem.location_found} ({claimingItem.setor || 'Geral'})</p>
              </div>
            </div>

            <form onSubmit={handleClaimSubmit} className="space-y-4 text-xs">
              
              {/* Seleção do Filhos/Alunos da Família */}
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
                  Selecione de qual Filho/Aluno é o Objeto *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
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
                        src={student?.photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"} 
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

              {/* Responsável Solicitante */}
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
                  Nome do Responsável Solicitante
                </label>
                <div className="flex items-center bg-slate-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-800">
                  <User className="w-4 h-4 text-gray-400 mr-2" />
                  <input
                    type="text"
                    required
                    value={guardianNameInput}
                    onChange={(e) => setGuardianNameInput(e.target.value)}
                    className="w-full bg-transparent outline-none text-xs text-oxford font-medium"
                  />
                </div>
              </div>

              {/* Telefone para Contato */}
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
                  Telefone para Contato/Avisos
                </label>
                <div className="flex items-center bg-slate-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-800">
                  <Phone className="w-4 h-4 text-gray-400 mr-2" />
                  <input
                    type="text"
                    required
                    value={responsiblePhone}
                    onChange={handlePhoneChange}
                    className="w-full bg-transparent outline-none text-xs text-oxford font-mono font-medium"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 text-blue-900 rounded-2xl text-[10px] leading-relaxed flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-900 shrink-0 mt-0.5" />
                <span>
                  O item ficará guardado na secretaria em nome do aluno selecionado. Apresente documento com foto ou o aplicativo no momento da retirada.
                </span>
              </div>

              {/* Botões do Modal */}
              <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setClaimingItem(null)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClaim}
                  className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold uppercase text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingClaim ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Confirmando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 text-amber-300" />
                      <span>Confirmar Reserva</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: DETALHES DO OBJETO (FOTO EM ALTA RESOLUÇÃO) */}
      {/* ==================================================================== */}
      {selectedDetailItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 text-left space-y-5 border border-gray-200 shadow-2xl relative overflow-hidden">
            <button
              onClick={() => setSelectedDetailItem(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
                <Eye className="w-5 h-5 text-blue-900" />
              </div>
              <div>
                <h4 className="font-serif text-base font-bold text-oxford">{selectedDetailItem.name}</h4>
                <p className="text-xs text-gray-500">Detalhes completos do objeto catalogado na escola.</p>
              </div>
            </div>

            {/* Photo Preview */}
            <div className="h-64 bg-slate-900 rounded-2xl overflow-hidden relative border border-gray-200 shadow-inner flex items-center justify-center">
              <img 
                src={selectedDetailItem.photo_url || selectedDetailItem.image_url || DEFAULT_PHOTOS[selectedDetailItem.category]} 
                alt={selectedDetailItem.name} 
                className="w-full h-full object-contain"
              />
              <span className="absolute bottom-3 left-3 bg-black/70 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg border border-white/20">
                {selectedDetailItem.category}
              </span>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-gray-200">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Local Encontrado</p>
                <p className="font-bold text-oxford">{selectedDetailItem.location_found || 'Pátio Central'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Setor da Escola</p>
                <p className="font-bold text-oxford">{selectedDetailItem.setor || 'Geral'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Data do Achado</p>
                <p className="font-bold text-oxford">{selectedDetailItem.found_date || selectedDetailItem.date_found || 'Recente'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Registrado por</p>
                <p className="font-bold text-oxford">{selectedDetailItem.registered_by || 'Inspetor de Pátio'}</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Descrição do Objeto</p>
              <p className="text-xs text-gray-700 bg-white p-3 rounded-xl border border-gray-200 leading-relaxed font-medium">
                {selectedDetailItem.description || 'Sem descrição detalhada.'}
              </p>
            </div>

            {/* Action Footer */}
            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => setSelectedDetailItem(null)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Fechar
              </button>
              {(selectedDetailItem.status === 'disponivel' || selectedDetailItem.status === 'available') && (
                <button
                  onClick={() => {
                    const it = selectedDetailItem;
                    setSelectedDetailItem(null);
                    setClaimingItem(it);
                  }}
                  className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold uppercase text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5 text-amber-300" /> Reservar Objeto
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: FEEDBACK DE SUCESSO DE RESERVA */}
      {/* ==================================================================== */}
      {successReservation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 border border-gray-200 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-300 mx-auto flex items-center justify-center shadow-inner">
              <CheckCircle className="w-10 h-10 text-emerald-700" />
            </div>

            <div className="space-y-1">
              <h4 className="font-serif text-lg font-bold text-oxford">Reserva Confirmada com Sucesso!</h4>
              <p className="text-xs text-gray-500">
                O objeto foi sinalizado no sistema e guardado na secretaria da escola.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl text-xs text-left space-y-2 border border-gray-200 text-gray-700">
              <p><strong>Item Reservado:</strong> {successReservation.itemName}</p>
              <p><strong>Aluno Beneficiário:</strong> {successReservation.studentName}</p>
              <p><strong>Responsável:</strong> {successReservation.guardianName}</p>
              <p className="text-[11px] text-blue-900 font-semibold pt-1 border-t border-gray-200">
                📍 Retirada: Apresente-se na Secretaria da Escola no horário escolar das 07h às 18h.
              </p>
            </div>

            <button
              onClick={() => setSuccessReservation(null)}
              className="w-full py-3 bg-blue-900 hover:bg-blue-800 text-white font-bold uppercase text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
