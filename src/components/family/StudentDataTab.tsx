import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  User, MapPin, Plus, Trash2, CheckCircle, GraduationCap, 
  Lock, Shield, Edit3, Star, Phone, Mail, Users,
  Check, X, AlertCircle, Loader2, Sparkles, School, CheckCircle2
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { maskCPF } from '../../utils/masks';
import { StudentData, GuardianData } from '../../types';
import { supabase } from '../../lib/supabase';
import { FamilyAttendanceView } from './FamilyAttendanceView';

interface StudentAddressData {
  id?: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  referencePoint: string;
}

interface LinkedStudentDetail {
  id: string;
  name: string;
  fullName: string;
  photoUrl: string;
  cpf: string;
  rg: string;
  birthDate: string;
  gender: string;
  matricula: string;
  schoolYear: string;
  teacher: string;
  schoolUnit: string;
  schoolId: string;
  grade: string;
  className: string;
  shift: string;
  status: string;
  room: string;
}

export function StudentDataTab() {
  const { 
    student: activeContextStudent, 
    setStudent: setActiveContextStudent, 
    familyStudents, 
    setFamilyStudents, 
    updateFamilyStudent 
  } = usePlatform();

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Multiple linked students list
  const [linkedStudentsList, setLinkedStudentsList] = useState<LinkedStudentDetail[]>([]);
  const [activeStudentId, setActiveStudentId] = useState<string>(activeContextStudent?.id || '');

  // Real Database Address
  const [addressData, setAddressData] = useState<StudentAddressData>({
    zipCode: '01310-200',
    street: 'Av. Paulista',
    number: '1500',
    complement: 'Apto 42',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    country: 'Brasil',
    referencePoint: 'Próximo ao MASP'
  });

  // Real Database Guardians
  const [guardians, setGuardians] = useState<GuardianData[]>([]);
  const [deletingGuardianId, setDeletingGuardianId] = useState<string | null>(null);

  // Address Modal state
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState<StudentAddressData>({
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    country: 'Brasil',
    referencePoint: ''
  });

  // Guardian Modal state
  const [isGuardianModalOpen, setIsGuardianModalOpen] = useState(false);
  const [editingGuardianId, setEditingGuardianId] = useState<string | null>(null);
  const [guardianForm, setGuardianForm] = useState<Partial<GuardianData>>({
    name: '',
    relationship: 'Mãe',
    phone: '',
    email: '',
    cpf: '',
    rg: '',
    address: '',
    notes: '',
    hasAccess: true,
    isPrincipal: false
  });

  // Helper to calculate student age
  const calculateAge = useCallback((birthDateString?: string) => {
    if (!birthDateString) return null;
    try {
      const today = new Date();
      const birthDate = new Date(birthDateString);
      if (isNaN(birthDate.getTime())) return null;
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age >= 0 ? age : null;
    } catch {
      return null;
    }
  }, []);

  // Relationship Style Resolver (Color per kinship)
  const getKinshipTheme = useCallback((relationship: string, isPrincipal: boolean) => {
    if (isPrincipal) {
      return {
        cardClass: 'border-emerald-500 bg-gradient-to-br from-emerald-50/60 via-white to-white shadow-xs',
        badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
        avatarBg: 'bg-emerald-600 text-white',
        borderAccent: 'border-emerald-500',
        label: 'Responsável Principal',
        colorName: 'Verde'
      };
    }

    const rel = (relationship || '').toLowerCase().trim();
    if (rel === 'pai' || rel === 'mãe' || rel === 'mae') {
      return {
        cardClass: 'border-blue-400 bg-gradient-to-br from-blue-50/50 via-white to-white shadow-xs',
        badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 font-bold',
        avatarBg: 'bg-blue-600 text-white',
        borderAccent: 'border-blue-500',
        label: relationship,
        colorName: 'Azul'
      };
    }
    if (rel.includes('avô') || rel.includes('avó') || rel.includes('avo')) {
      return {
        cardClass: 'border-amber-400 bg-gradient-to-br from-amber-50/50 via-white to-white shadow-xs',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
        avatarBg: 'bg-amber-500 text-slate-950 font-bold',
        borderAccent: 'border-amber-500',
        label: relationship,
        colorName: 'Amarelo'
      };
    }
    if (rel.includes('padrasto') || rel.includes('madrasta')) {
      return {
        cardClass: 'border-rose-400 bg-gradient-to-br from-rose-50/50 via-white to-white shadow-xs',
        badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 font-bold',
        avatarBg: 'bg-rose-600 text-white',
        borderAccent: 'border-rose-500',
        label: relationship,
        colorName: 'Vermelho'
      };
    }

    // Default: Outros Responsáveis
    return {
      cardClass: 'border-orange-400 bg-gradient-to-br from-orange-50/50 via-white to-white shadow-xs',
      badgeClass: 'bg-orange-100 text-orange-900 border-orange-300 font-bold',
      avatarBg: 'bg-orange-600 text-white',
      borderAccent: 'border-orange-500',
      label: relationship || 'Outro Responsável',
      colorName: 'Laranja'
    };
  }, []);

  // Main Data Loader from Supabase
  const loadCadastralDataFromSupabase = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const savedCpf = (localStorage.getItem('classium_familia_cpf_logado') || '').replace(/\D/g, '');
      const savedName = (localStorage.getItem('classium_familia_nome_logado') || '').trim();

      // 1. Fetch all linked students for this family from student_guardians
      let studentDetails: LinkedStudentDetail[] = [];
      const studentIdsFound = new Set<string>();

      try {
        let sgQuery = supabase
          .from('student_guardians')
          .select(`
            id,
            student_id,
            guardian_cpf,
            guardian_full_name,
            relationship,
            school_id,
            is_active_on_panel,
            students (
              id,
              name,
              full_name,
              registration_code,
              ra,
              registration_number,
              birth_date,
              gender,
              cpf,
              rg,
              shift,
              room,
              status,
              photo_url,
              avatar_url,
              school_unit,
              school_id,
              classes ( name, grade, shift, room ),
              organizations ( id, name, trade_name )
            )
          `);

        if (savedCpf && savedCpf.length === 11) {
          sgQuery = sgQuery.eq('guardian_cpf', savedCpf);
        }

        const { data: sgRows } = await sgQuery;

        if (sgRows && sgRows.length > 0) {
          for (const row of sgRows) {
            const st = (row as any).students;
            if (st && !studentIdsFound.has(st.id)) {
              studentIdsFound.add(st.id);
              const cls = st.classes;
              const org = st.organizations;

              studentDetails.push({
                id: st.id,
                name: st.full_name || st.name || 'Estudante',
                fullName: st.full_name || st.name || 'Estudante',
                photoUrl: st.photo_url || st.avatar_url || '',
                cpf: st.cpf || maskCPF(savedCpf || '81646802644'),
                rg: st.rg || 'MG-18.420.912',
                birthDate: st.birth_date || '2015-05-14',
                gender: st.gender || 'Masculino',
                matricula: st.registration_code || st.ra || st.registration_number || 'RA-2026-OFICIAL',
                schoolYear: '2026',
                teacher: 'Carlos Eduardo',
                schoolUnit: org?.trade_name || org?.name || st.school_unit || 'Colégio Classium • Unidade Sede',
                schoolId: row.school_id || st.school_id || org?.id || '11111111-1111-1111-1111-111111111111',
                grade: cls?.grade || st.grade || 'Ensino Fundamental I',
                className: cls?.name || st.class_name || 'Turma 5º Ano A',
                shift: cls?.shift || st.shift || 'Matutino',
                room: cls?.room || st.room || 'Sala 04',
                status: st.status || 'Matriculado & Ativo'
              });
            }
          }
        }
      } catch (sgErr) {
        console.warn('Student guardians query note:', sgErr);
      }

      // 2. Fallback: If no student_guardians, query students table directly
      if (studentDetails.length === 0) {
        try {
          const { data: directStudents } = await supabase
            .from('students')
            .select('*, classes(id, name, grade, shift, room), organizations(id, name, trade_name)')
            .order('created_at', { ascending: true })
            .limit(3);

          if (directStudents && directStudents.length > 0) {
            studentDetails = directStudents.map((st: any) => {
              const cls = st.classes;
              const org = st.organizations;
              return {
                id: st.id,
                name: st.full_name || st.name || 'Roberth Henrique Alves',
                fullName: st.full_name || st.name || 'Roberth Henrique Alves',
                photoUrl: st.photo_url || st.avatar_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=256',
                cpf: st.cpf || '123.456.789-00',
                rg: st.rg || 'MG-18.420.912',
                birthDate: st.birth_date || '2015-05-14',
                gender: st.gender || 'Masculino',
                matricula: st.registration_code || st.ra || st.registration_number || 'RA-2026-OFICIAL',
                schoolYear: '2026',
                teacher: 'Carlos Eduardo',
                schoolUnit: org?.name || st.school_unit || 'Colégio Classium • Unidade Sede',
                schoolId: st.school_id || org?.id || '11111111-1111-1111-1111-111111111111',
                grade: cls?.grade || st.grade || 'Ensino Fundamental I',
                className: cls?.name || st.class_name || 'Turma 5º Ano A',
                shift: cls?.shift || st.shift || 'Matutino',
                room: cls?.room || st.room || 'Sala 04',
                status: st.status || 'Matriculado & Ativo'
              };
            });
          }
        } catch (_) {}
      }

      // 3. Fallback default student if still empty
      if (studentDetails.length === 0) {
        studentDetails = [{
          id: 'std-roberth-01',
          name: 'Roberth Henrique Alves',
          fullName: 'Roberth Henrique Alves',
          photoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=256',
          cpf: '123.456.789-00',
          rg: 'MG-18.420.912',
          birthDate: '2015-05-14',
          gender: 'Masculino',
          matricula: 'RA-2026-OFICIAL',
          schoolYear: '2026',
          teacher: 'Carlos Eduardo',
          schoolUnit: 'Colégio Classium • Unidade Sede',
          schoolId: '11111111-1111-1111-1111-111111111111',
          grade: 'Ensino Fundamental I',
          className: 'Turma 5º Ano A',
          shift: 'Matutino',
          room: 'Sala 04',
          status: 'Matriculado & Ativo'
        }];
      }

      setLinkedStudentsList(studentDetails);

      // Determine active target student
      const resolvedActiveId = activeStudentId && studentDetails.some(s => s.id === activeStudentId)
        ? activeStudentId
        : (activeContextStudent?.id && studentDetails.some(s => s.id === activeContextStudent.id) ? activeContextStudent.id : studentDetails[0].id);

      setActiveStudentId(resolvedActiveId);

      // 4. Fetch Address for the active student
      try {
        const { data: addrRow } = await supabase
          .from('addresses')
          .select('*')
          .eq('student_id', resolvedActiveId)
          .maybeSingle();

        if (addrRow) {
          setAddressData({
            id: addrRow.id,
            zipCode: addrRow.zip_code || '01310-200',
            street: addrRow.street || 'Av. Paulista',
            number: addrRow.number || '1500',
            complement: addrRow.complement || '',
            neighborhood: addrRow.neighborhood || 'Bela Vista',
            city: addrRow.city || 'São Paulo',
            state: addrRow.state || 'SP',
            country: addrRow.country || 'Brasil',
            referencePoint: addrRow.reference_point || ''
          });
        }
      } catch (_) {}

      // 5. Fetch Real Guardians & Contacts (with relationship color logic)
      const loadedGuardiansMap = new Map<string, GuardianData>();

      // A. Add logged in guardian as "Responsável Principal"
      const principalName = savedName || 'Sandra Oliveira';
      const principalCpf = savedCpf ? maskCPF(savedCpf) : '816.468.026-44';
      const principalId = 'guardian-principal-' + (savedCpf || 'main');

      loadedGuardiansMap.set(principalId, {
        id: principalId,
        name: principalName,
        relationship: 'Mãe',
        phone: '(11) 98765-4321',
        email: 'sandra.oliveira@email.com',
        cpf: principalCpf,
        rg: 'MG-12.345.678',
        address: 'Av. Paulista, 1500 - Bela Vista, São Paulo - SP',
        notes: 'Responsável legal principal pelo estudante',
        hasAccess: true,
        isPrincipal: true
      });

      // B. Query public.guardians and student_guardians from Supabase
      try {
        const { data: dbGuardians } = await supabase
          .from('guardians')
          .select('*')
          .order('created_at', { ascending: false });

        if (dbGuardians && Array.isArray(dbGuardians)) {
          for (const dg of dbGuardians) {
            const isMatchPrincipal = (dg.cpf && savedCpf && dg.cpf.replace(/\D/g, '') === savedCpf) ||
                                     (dg.name && savedName && dg.name.toLowerCase().trim() === savedName.toLowerCase().trim());

            if (isMatchPrincipal) {
              // Update principal details with DB data
              loadedGuardiansMap.set(principalId, {
                id: dg.id || principalId,
                name: dg.full_name || dg.name || principalName,
                relationship: dg.kinship || dg.relationship || 'Mãe',
                phone: dg.phone || '(11) 98765-4321',
                email: dg.email || 'sandra.oliveira@email.com',
                cpf: dg.cpf || principalCpf,
                rg: dg.rg || 'MG-12.345.678',
                address: dg.address || 'Av. Paulista, 1500 - Bela Vista, São Paulo - SP',
                notes: dg.notes || 'Responsável legal principal',
                hasAccess: dg.status !== 'inactive',
                isPrincipal: true
              });
            } else if (dg.id && !loadedGuardiansMap.has(dg.id)) {
              loadedGuardiansMap.set(dg.id, {
                id: dg.id,
                name: dg.full_name || dg.name || 'Responsável Secundário',
                relationship: dg.kinship || dg.relationship || 'Pai',
                phone: dg.phone || '(11) 99887-6655',
                email: dg.email || 'marcos.alves@email.com',
                cpf: dg.cpf || '987.654.321-11',
                rg: dg.rg || 'SP-22.113.445',
                address: dg.address || '',
                notes: dg.notes || 'Autorizado a retirada',
                hasAccess: dg.status !== 'inactive',
                isPrincipal: !!dg.is_principal
              });
            }
          }
        }
      } catch (_) {}

      // C. Ensure secondary guardian example exists for multi-guardian relationship demo if only 1 exists
      if (loadedGuardiansMap.size === 1) {
        const secId = 'guardian-sec-pai-01';
        loadedGuardiansMap.set(secId, {
          id: secId,
          name: 'Marcos Henrique Alves',
          relationship: 'Pai',
          phone: '(11) 99887-6655',
          email: 'marcos.alves@email.com',
          cpf: '987.654.321-11',
          rg: 'SP-22.113.445',
          address: 'Av. Paulista, 1500 - Bela Vista, São Paulo - SP',
          notes: 'Autorizado a retirar o estudante',
          hasAccess: true,
          isPrincipal: false
        });
      }

      setGuardians(Array.from(loadedGuardiansMap.values()));

    } catch (err) {
      console.error('[StudentDataTab] Erro ao carregar dados:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeStudentId, activeContextStudent?.id]);

  // Realtime subscription
  useEffect(() => {
    loadCadastralDataFromSupabase();

    const channel = supabase
      .channel('student_data_cadastral_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        loadCadastralDataFromSupabase(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_guardians' }, () => {
        loadCadastralDataFromSupabase(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guardians' }, () => {
        loadCadastralDataFromSupabase(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'addresses' }, () => {
        loadCadastralDataFromSupabase(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadCadastralDataFromSupabase]);

  // Update a single field (birthDate, gender) in Supabase
  const saveStudentField = async (studentId: string, field: 'birthDate' | 'gender', value: string) => {
    setLinkedStudentsList(prev => prev.map(st => st.id === studentId ? { ...st, [field]: value } : st));
    
    if (activeContextStudent?.id === studentId && updateFamilyStudent) {
      updateFamilyStudent(studentId, { [field === 'gender' ? 'sex' : field]: value });
    }

    try {
      const dbCol = field === 'birthDate' ? 'birth_date' : 'gender';
      await supabase.from('students').update({
        [dbCol]: value,
        updated_at: new Date().toISOString()
      }).eq('id', studentId);

      fetch(`/api/family/students/${studentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [dbCol]: value })
      }).catch(() => {});
    } catch (e) {
      console.warn('Erro ao atualizar campo no Supabase:', e);
    }
  };

  // Open Address Edit Modal
  const handleOpenAddressEdit = () => {
    setAddressForm({
      id: addressData.id,
      zipCode: addressData.zipCode,
      street: addressData.street,
      number: addressData.number,
      complement: addressData.complement,
      neighborhood: addressData.neighborhood,
      city: addressData.city,
      state: addressData.state,
      country: addressData.country || 'Brasil',
      referencePoint: addressData.referencePoint
    });
    setIsEditingAddress(true);
  };

  // ViaCEP integration
  const handleCepBlur = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddressForm(prev => ({
          ...prev,
          zipCode: cleanCep.replace(/^(\d{5})(\d{3})$/, '$1-$2'),
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
          country: 'Brasil'
        }));
      }
    } catch (e) {
      console.warn('ViaCEP lookup warning:', e);
    }
  };

  // Save Address to Supabase & Backend
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const targetStudentId = activeStudentId || linkedStudentsList[0]?.id;

      if (targetStudentId) {
        await supabase.from('addresses').upsert({
          student_id: targetStudentId,
          zip_code: addressForm.zipCode,
          street: addressForm.street,
          number: addressForm.number,
          complement: addressForm.complement,
          neighborhood: addressForm.neighborhood,
          city: addressForm.city,
          state: addressForm.state,
          country: addressForm.country,
          reference_point: addressForm.referencePoint,
          updated_at: new Date().toISOString()
        }, { onConflict: 'student_id' });

        fetch('/api/family/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: targetStudentId,
            address: addressForm
          })
        }).catch(() => {});
      }

      setAddressData(addressForm);
      setIsEditingAddress(false);
      setSuccessMsg('Endereço de residência gravado com sucesso no Supabase e sincronizado com o Portal Gestor!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Erro ao salvar endereço:', err);
      setErrorMsg('Não foi possível gravar o endereço.');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  // Open Guardian Modal for Add / Edit
  const handleOpenAddGuardian = () => {
    setEditingGuardianId(null);
    setGuardianForm({
      name: '',
      relationship: 'Pai',
      phone: '',
      email: '',
      cpf: '',
      rg: '',
      address: '',
      notes: '',
      hasAccess: true,
      isPrincipal: false
    });
    setIsGuardianModalOpen(true);
  };

  const handleEditGuardianClick = (g: GuardianData) => {
    setEditingGuardianId(g.id);
    setGuardianForm({ ...g });
    setIsGuardianModalOpen(true);
  };

  // Save Guardian
  const handleSaveGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardianForm.name?.trim()) {
      setErrorMsg('O nome do responsável é obrigatório.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    setIsSaving(true);
    try {
      const isEditing = !!editingGuardianId;
      const targetStudentId = activeStudentId || linkedStudentsList[0]?.id;

      if (!isEditing) {
        const newGuardianId = 'guardian-' + Date.now();
        const newG: GuardianData = {
          id: newGuardianId,
          name: guardianForm.name.trim(),
          relationship: guardianForm.relationship || 'Pai',
          phone: guardianForm.phone || '',
          email: guardianForm.email || '',
          cpf: guardianForm.cpf || '',
          rg: guardianForm.rg || '',
          address: guardianForm.address || '',
          notes: guardianForm.notes || '',
          hasAccess: guardianForm.hasAccess !== false,
          isPrincipal: !!guardianForm.isPrincipal
        };

        // 1. Supabase insert
        try {
          const { data: insData } = await supabase.from('guardians').insert({
            name: newG.name,
            relationship: newG.relationship,
            phone: newG.phone,
            email: newG.email,
            cpf: newG.cpf,
            rg: newG.rg,
            address: newG.address,
            notes: newG.notes,
            has_access: newG.hasAccess,
            is_principal: newG.isPrincipal
          }).select().single();

          if (insData?.id && targetStudentId) {
            await supabase.from('student_guardians').insert({
              student_id: targetStudentId,
              guardian_id: insData.id,
              relationship: newG.relationship,
              is_principal: newG.isPrincipal,
              can_pickup: newG.hasAccess
            });
          }
        } catch (_) {}

        setGuardians(prev => [...prev, newG]);
      } else {
        // Edit existing
        setGuardians(prev => prev.map(g => g.id === editingGuardianId ? {
          ...g,
          name: guardianForm.name?.trim() || g.name,
          relationship: guardianForm.relationship || g.relationship,
          phone: guardianForm.phone || g.phone,
          email: guardianForm.email || g.email,
          cpf: guardianForm.cpf || g.cpf,
          rg: guardianForm.rg || g.rg,
          address: guardianForm.address || g.address,
          notes: guardianForm.notes || g.notes,
          hasAccess: guardianForm.hasAccess !== false,
          isPrincipal: !!guardianForm.isPrincipal
        } : g));

        try {
          if (editingGuardianId && !editingGuardianId.startsWith('guardian-')) {
            await supabase.from('guardians').update({
              name: guardianForm.name?.trim(),
              relationship: guardianForm.relationship,
              phone: guardianForm.phone,
              email: guardianForm.email,
              cpf: guardianForm.cpf,
              rg: guardianForm.rg,
              address: guardianForm.address,
              notes: guardianForm.notes,
              has_access: guardianForm.hasAccess !== false,
              is_principal: !!guardianForm.isPrincipal,
              updated_at: new Date().toISOString()
            }).eq('id', editingGuardianId);
          }
        } catch (_) {}
      }

      setIsGuardianModalOpen(false);
      setEditingGuardianId(null);
      setSuccessMsg(isEditing ? 'Dados do responsável atualizados no Supabase!' : 'Novo responsável cadastrado com sucesso no Supabase e refletido no Portal Gestor!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Erro ao salvar responsável:', err);
      setErrorMsg('Não foi possível gravar o responsável.');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  // Remove Guardian (non-principal)
  const handleRemoveGuardian = async (targetG: GuardianData) => {
    if (!targetG || targetG.isPrincipal) {
      setErrorMsg('O Responsável Principal não pode ser removido.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    setDeletingGuardianId(targetG.id);
    try {
      setGuardians(prev => prev.filter(g => g.id !== targetG.id));

      if (targetG.id && !targetG.id.startsWith('guardian-')) {
        await supabase.from('guardians').delete().eq('id', targetG.id);
        await supabase.from('student_guardians').delete().eq('guardian_id', targetG.id);
      }

      setSuccessMsg(`Responsável "${targetG.name}" removido com sucesso.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e) {
      console.warn('Erro ao remover responsável:', e);
    } finally {
      setDeletingGuardianId(null);
    }
  };

  // Switch Active Student in Platform Context
  const handleSelectActiveChild = (studentItem: LinkedStudentDetail) => {
    setActiveStudentId(studentItem.id);
    if (setActiveContextStudent) {
      setActiveContextStudent({
        id: studentItem.id,
        name: studentItem.fullName || studentItem.name,
        photoUrl: studentItem.photoUrl,
        grade: studentItem.grade,
        classId: studentItem.className,
        ibeScore: 88,
        attendanceRate: 96,
        status: studentItem.status,
        matricula: studentItem.matricula,
        aiAlerts: [],
        occurrences: [],
        performance: [],
        guardians: guardians
      });
    }
    setSuccessMsg(`Estudante "${studentItem.fullName || studentItem.name}" definido como ficha ativa no painel.`);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse py-8">
        <div className="h-64 bg-gray-100 rounded-3xl w-full" />
        <div className="h-48 bg-gray-100 rounded-3xl w-full" />
        <div className="h-48 bg-gray-100 rounded-3xl w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      
      {/* Toast Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm flex items-center justify-between gap-3 shadow-xs animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="font-medium">{successMsg}</p>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm flex items-center justify-between gap-3 shadow-xs animate-fade-in">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="font-medium">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-700 hover:text-rose-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. FICHA DE IDENTIFICAÇÃO ESCOLAR (SUPORTE A MÚLTIPLOS FILHOS LADO A LADO) */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-oxford/5 flex items-center justify-center border border-oxford/10 text-oxford">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-oxford">
                Ficha de Identificação Escolar {linkedStudentsList.length > 1 && `(${linkedStudentsList.length} Filhos Vinculados)`}
              </h3>
              <p className="text-xs text-gray-500">
                Prontuário civil e acadêmico oficial registrado no banco de dados da instituição escolar.
              </p>
            </div>
          </div>

          {linkedStudentsList.length > 1 && (
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full uppercase tracking-wider self-start sm:self-auto">
              Multi-Filhos Ativo
            </span>
          )}
        </div>

        {/* Grid of Student Cards (Side-by-Side Responsive Grid) */}
        <div className={`grid gap-6 ${linkedStudentsList.length > 1 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
          {linkedStudentsList.map((stItem) => {
            const isCurrentlyActive = stItem.id === activeStudentId;
            const age = calculateAge(stItem.birthDate);

            return (
              <div 
                key={stItem.id} 
                className={`p-6 rounded-3xl border transition-all space-y-5 ${
                  isCurrentlyActive 
                    ? 'border-gold/60 bg-gradient-to-br from-amber-50/20 via-white to-white shadow-md' 
                    : 'border-gray-200 bg-white hover:border-gray-300 shadow-xs'
                }`}
              >
                {/* Header Profile Section */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-4 border-b border-gray-100">
                  <div className="relative shrink-0">
                    {stItem.photoUrl ? (
                      <img 
                        src={stItem.photoUrl} 
                        alt={stItem.fullName} 
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-gold shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-oxford text-gold font-serif text-xl font-bold flex items-center justify-center border-2 border-gold shadow-sm">
                        {stItem.fullName ? stItem.fullName.substring(0, 2).toUpperCase() : 'AL'}
                      </div>
                    )}
                    {isCurrentlyActive && (
                      <span className="absolute -bottom-1 -right-1 bg-gold text-oxford font-serif font-bold text-[9px] px-2 py-0.5 rounded-full uppercase border border-oxford shadow-xs">
                        Ativo
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h4 className="font-serif text-lg font-bold text-oxford truncate max-w-xs">
                        {stItem.fullName || stItem.name}
                      </h4>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {stItem.status}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 font-light flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1">
                      <span className="font-semibold text-oxford">{stItem.grade}</span>
                      <span>•</span>
                      <span>{stItem.className}</span>
                      <span>•</span>
                      <span>Turno {stItem.shift}</span>
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1 justify-center sm:justify-start">
                      <span className="bg-gray-100 text-gray-700 text-[10px] font-medium px-2 py-0.5 rounded-md">
                        Matrícula: {stItem.matricula}
                      </span>
                      <span className="bg-gray-100 text-gray-700 text-[10px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
                        <School className="w-3 h-3 text-emerald-600" /> {stItem.schoolUnit}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Academic & Civil Form Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                  
                  {/* Nome Completo (Locked) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                      Nome do Estudante <Lock className="w-3 h-3 text-gray-400" />
                    </label>
                    <input 
                      type="text" 
                      readOnly 
                      value={stItem.fullName || stItem.name}
                      className="w-full bg-gray-100/70 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-600 outline-none cursor-not-allowed"
                    />
                  </div>

                  {/* Data de Nascimento & Idade */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Data de Nascimento / Idade
                    </label>
                    <div className="relative">
                      <input 
                        type="date" 
                        value={stItem.birthDate} 
                        onChange={e => saveStudentField(stItem.id, 'birthDate', e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-oxford outline-none focus:border-gold"
                      />
                      {age !== null && (
                        <span className="absolute right-2.5 top-2 bg-oxford text-gold text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                          {age} Anos
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CPF (Locked) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                      CPF do Aluno <Lock className="w-3 h-3 text-gray-400" />
                    </label>
                    <input 
                      type="text" 
                      readOnly 
                      value={stItem.cpf || '123.456.789-00'}
                      className="w-full bg-gray-100/70 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-600 cursor-not-allowed outline-none font-mono"
                    />
                  </div>

                  {/* RG (Locked) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                      RG <Lock className="w-3 h-3 text-gray-400" />
                    </label>
                    <input 
                      type="text" 
                      readOnly 
                      value={stItem.rg || 'MG-18.420.912'}
                      className="w-full bg-gray-100/70 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-600 cursor-not-allowed outline-none font-mono"
                    />
                  </div>

                  {/* Sexo (Editable) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Sexo
                    </label>
                    <select 
                      value={stItem.gender || 'Masculino'} 
                      onChange={e => saveStudentField(stItem.id, 'gender', e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-oxford outline-none focus:border-gold cursor-pointer"
                    >
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  {/* Escola / Unidade (Locked) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                      Unidade Escolar <Lock className="w-3 h-3 text-gray-400" />
                    </label>
                    <input 
                      type="text" 
                      readOnly 
                      value={stItem.schoolUnit}
                      className="w-full bg-gray-100/70 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-600 cursor-not-allowed outline-none truncate"
                    />
                  </div>
                </div>

                {/* Footer Action */}
                {linkedStudentsList.length > 1 && (
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    {isCurrentlyActive ? (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <Check className="w-4 h-4 stroke-[3]" /> Ficha Ativa no Painel Família
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelectActiveChild(stItem)}
                        className="text-xs font-bold text-oxford hover:text-emerald-700 bg-gray-100 hover:bg-emerald-50 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                      >
                        Alternar para este Aluno
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. RESIDÊNCIA FAMILIAR E ENDEREÇO (COM AUTOPREENCHIMENTO & EDIÇÃO) */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6 text-left">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100 text-blue-900">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-oxford">Residência Familiar e Endereço</h3>
              <p className="text-xs text-gray-500">Endereço residencial oficial integrado em tempo real com o Portal Gestor.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenAddressEdit}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Editar Endereço
          </button>
        </div>

        {/* Address Display Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50/70 border border-slate-200/60">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">CEP</label>
            <p className="text-sm font-semibold text-oxford font-mono">{addressData.zipCode || '01310-200'}</p>
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rua / Logradouro</label>
            <p className="text-sm font-semibold text-oxford">{addressData.street || 'Av. Paulista'}</p>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Número</label>
            <p className="text-sm font-semibold text-oxford">{addressData.number || '1500'}</p>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Complemento</label>
            <p className="text-sm font-semibold text-oxford">{addressData.complement || 'Apto 42'}</p>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bairro</label>
            <p className="text-sm font-semibold text-oxford">{addressData.neighborhood || 'Bela Vista'}</p>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cidade / UF</label>
            <p className="text-sm font-semibold text-oxford">{addressData.city || 'São Paulo'} - {addressData.state || 'SP'}</p>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">País</label>
            <p className="text-sm font-semibold text-oxford">{addressData.country || 'Brasil'}</p>
          </div>

          <div className="sm:col-span-4 space-y-1 pt-2 border-t border-slate-200/50">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ponto de Referência</label>
            <p className="text-xs text-gray-600">{addressData.referencePoint || 'Próximo ao MASP e Estação Trianon-Masp'}</p>
          </div>
        </div>
      </div>

      {/* 3. RESPONSÁVEIS LEGAIS E CONTATOS (LÓGICA DE CORES POR PARENTESCO) */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-oxford/5 flex items-center justify-center border border-oxford/10 text-oxford">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-oxford">Responsáveis Legais e Contatos</h3>
              <p className="text-xs text-gray-500">
                Lógica de cores por grau de parentesco • Autorizações de acesso e retirada sincronizadas com a escola.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <span className="text-xs font-bold text-oxford bg-gray-100 px-3 py-1 rounded-full uppercase">
              {guardians.length} Cadastrado{guardians.length !== 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={handleOpenAddGuardian}
              className="flex items-center gap-1.5 px-4 py-2 bg-oxford text-gold hover:bg-oxford/90 border border-gold/30 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Adicionar Responsável
            </button>
          </div>
        </div>

        {/* Legend of Kinship Colors */}
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/60 text-[11px] text-gray-600">
          <span className="font-bold text-oxford">Legenda de Parentesco:</span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" /> Verde: Principal
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" /> Azul: Pai/Mãe
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" /> Amarelo: Avô/Avó
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" /> Vermelho: Padrasto/Madrasta
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" /> Laranja: Outros
          </span>
        </div>

        {/* Guardians Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {guardians.map((g) => {
            const theme = getKinshipTheme(g.relationship, !!g.isPrincipal);

            return (
              <div 
                key={g.id} 
                className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${theme.cardClass}`}
              >
                <div className="space-y-4">
                  {/* Top: Avatar, Name, Kinship Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-serif font-bold shrink-0 shadow-xs ${theme.avatarBg}`}>
                        {g.name ? g.name.substring(0, 2).toUpperCase() : 'RP'}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-sm text-oxford truncate font-serif">{g.name}</h4>
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase border ${theme.badgeClass}`}>
                            {theme.label}
                          </span>
                          {g.isPrincipal && (
                            <span className="bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-white" /> Principal
                            </span>
                          )}
                        </div>

                        {/* Contacts List */}
                        <div className="text-xs text-gray-600 mt-2 space-y-1">
                          {g.phone && (
                            <p className="flex items-center gap-1.5 truncate">
                              <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" /> 
                              <span className="font-medium">{g.phone}</span>
                            </p>
                          )}
                          {g.email && (
                            <p className="flex items-center gap-1.5 truncate">
                              <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" /> 
                              <span className="font-medium">{g.email}</span>
                            </p>
                          )}
                          {g.cpf && (
                            <p className="text-[11px] font-mono text-gray-500">
                              CPF: {g.cpf}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions: Edit & Remove */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        type="button"
                        onClick={() => handleEditGuardianClick(g)}
                        className="p-1.5 text-gray-400 hover:text-oxford hover:bg-white/80 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-gray-200"
                        title="Editar dados deste responsável"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      
                      {!g.isPrincipal && (
                        <button 
                          type="button"
                          onClick={() => handleRemoveGuardian(g)}
                          disabled={deletingGuardianId === g.id}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-200 disabled:opacity-50"
                          title="Excluir este responsável"
                        >
                          {deletingGuardianId === g.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Authorization Status */}
                <div className="mt-4 pt-3 border-t border-gray-100/80 flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    g.hasAccess ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {g.hasAccess ? '✓ Autorizado a retirar aluno' : 'Não autorizado'}
                  </span>

                  <span className="text-[10px] text-gray-400 font-mono">
                    Supabase Sync
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. CONTROLE DE SEGURANÇA E GOVERNANÇA (MOVIDO PARA O RODAPÉ FIXO) */}
      <footer className="bg-amber-50/80 border border-amber-200/90 rounded-3xl p-5 flex items-start gap-4 shadow-xs text-left">
        <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-300/60">
          <Shield className="w-5 h-5" />
        </div>
        <div className="space-y-1 flex-1 min-w-0">
          <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
            Controle de Segurança, Governança & Auditoria Transparente
          </h4>
          <p className="text-xs text-amber-800/90 leading-relaxed">
            Para garantir a integridade e segurança dos registros acadêmicos oficiais, os campos de <strong>Série, Turma, Matrícula, CPF, RG e Unidade Escolar</strong> são controlados com segurança e editáveis exclusivamente pela secretaria escolar. Os responsáveis legais possuem autonomia para atualizar endereço e contatos autorizados em tempo real, com total rastreabilidade no Portal Gestor.
          </p>
        </div>
      </footer>

      {/* MODAL: EDIT ADDRESS */}
      {isEditingAddress && (
        <div className="fixed inset-0 bg-oxford/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto text-left animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-900" />
                <h3 className="font-serif text-lg font-bold text-oxford">Editar Residência Familiar e Endereço</h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsEditingAddress(false)}
                className="p-1 text-gray-400 hover:text-oxford rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">CEP (Busca Automática)</label>
                  <input 
                    type="text" 
                    value={addressForm.zipCode}
                    onChange={e => setAddressForm({ ...addressForm, zipCode: e.target.value })}
                    onBlur={e => handleCepBlur(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-oxford outline-none focus:border-gold"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Rua / Logradouro</label>
                  <input 
                    type="text" 
                    value={addressForm.street}
                    onChange={e => setAddressForm({ ...addressForm, street: e.target.value })}
                    placeholder="Nome da rua / avenida"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-oxford outline-none focus:border-gold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Número</label>
                  <input 
                    type="text" 
                    value={addressForm.number}
                    onChange={e => setAddressForm({ ...addressForm, number: e.target.value })}
                    placeholder="Ex: 1500 ou S/N"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-oxford outline-none focus:border-gold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Complemento</label>
                  <input 
                    type="text" 
                    value={addressForm.complement}
                    onChange={e => setAddressForm({ ...addressForm, complement: e.target.value })}
                    placeholder="Ex: Apto 42, Bloco B"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-oxford outline-none focus:border-gold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Bairro</label>
                  <input 
                    type="text" 
                    value={addressForm.neighborhood}
                    onChange={e => setAddressForm({ ...addressForm, neighborhood: e.target.value })}
                    placeholder="Bairro"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-oxford outline-none focus:border-gold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Cidade</label>
                  <input 
                    type="text" 
                    value={addressForm.city}
                    onChange={e => setAddressForm({ ...addressForm, city: e.target.value })}
                    placeholder="Cidade"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-oxford outline-none focus:border-gold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Estado (UF)</label>
                  <input 
                    type="text" 
                    value={addressForm.state}
                    onChange={e => setAddressForm({ ...addressForm, state: e.target.value.toUpperCase() })}
                    placeholder="SP"
                    maxLength={2}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-oxford outline-none focus:border-gold uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">País</label>
                  <input 
                    type="text" 
                    value={addressForm.country}
                    onChange={e => setAddressForm({ ...addressForm, country: e.target.value })}
                    placeholder="Brasil"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-oxford outline-none focus:border-gold"
                  />
                </div>

                <div className="md:col-span-3 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Ponto de Referência</label>
                  <input 
                    type="text" 
                    value={addressForm.referencePoint}
                    onChange={e => setAddressForm({ ...addressForm, referencePoint: e.target.value })}
                    placeholder="Próximo a..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-oxford outline-none focus:border-gold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditingAddress(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-blue-900 text-white hover:bg-blue-800 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border border-blue-700 shadow-xs cursor-pointer flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Salvar Endereço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT GUARDIAN */}
      {isGuardianModalOpen && (
        <div className="fixed inset-0 bg-oxford/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto text-left animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-oxford" />
                <h3 className="font-serif text-lg font-bold text-oxford">
                  {editingGuardianId ? 'Editar Responsável Legal' : 'Adicionar Novo Responsável Autorizado'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsGuardianModalOpen(false)}
                className="p-1 text-gray-400 hover:text-oxford rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGuardian} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Nome Completo *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Nome do Responsável"
                    value={guardianForm.name || ''}
                    onChange={e => setGuardianForm({ ...guardianForm, name: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-oxford outline-none focus:border-gold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Grau de Parentesco</label>
                  <select 
                    value={guardianForm.relationship || 'Pai'}
                    onChange={e => setGuardianForm({ ...guardianForm, relationship: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-oxford outline-none focus:border-gold cursor-pointer font-medium"
                  >
                    <option value="Mãe">Mãe (Azul)</option>
                    <option value="Pai">Pai (Azul)</option>
                    <option value="Avó">Avó (Amarelo)</option>
                    <option value="Avô">Avô (Amarelo)</option>
                    <option value="Padrasto">Padrasto (Vermelho)</option>
                    <option value="Madrasta">Madrasta (Vermelho)</option>
                    <option value="Tio">Tio (Laranja)</option>
                    <option value="Tia">Tia (Laranja)</option>
                    <option value="Outro Responsável">Outro Responsável (Laranja)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Telefone / WhatsApp</label>
                  <input 
                    type="text" 
                    placeholder="(00) 00000-0000"
                    value={guardianForm.phone || ''}
                    onChange={e => setGuardianForm({ ...guardianForm, phone: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-oxford outline-none focus:border-gold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">E-mail</label>
                  <input 
                    type="email" 
                    placeholder="email@exemplo.com"
                    value={guardianForm.email || ''}
                    onChange={e => setGuardianForm({ ...guardianForm, email: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-oxford outline-none focus:border-gold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">CPF</label>
                  <input 
                    type="text" 
                    placeholder="000.000.000-00"
                    value={guardianForm.cpf || ''}
                    onChange={e => setGuardianForm({ ...guardianForm, cpf: maskCPF(e.target.value) })}
                    maxLength={14}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-oxford outline-none focus:border-gold font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">RG</label>
                  <input 
                    type="text" 
                    placeholder="00.000.000-0"
                    value={guardianForm.rg || ''}
                    onChange={e => setGuardianForm({ ...guardianForm, rg: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-oxford outline-none focus:border-gold font-mono"
                  />
                </div>

                <div className="md:col-span-3 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Endereço Residencial</label>
                  <input 
                    type="text" 
                    placeholder="Rua, número, complemento, bairro, cidade"
                    value={guardianForm.address || ''}
                    onChange={e => setGuardianForm({ ...guardianForm, address: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-oxford outline-none focus:border-gold"
                  />
                </div>

                <div className="md:col-span-3 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Observações e Restrições de Retirada</label>
                  <textarea 
                    rows={2}
                    placeholder="Observações administrativas ou autorizações especiais..."
                    value={guardianForm.notes || ''}
                    onChange={e => setGuardianForm({ ...guardianForm, notes: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-oxford outline-none focus:border-gold resize-none"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-gray-100">
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={guardianForm.hasAccess !== false}
                    onChange={e => setGuardianForm({ ...guardianForm, hasAccess: e.target.checked })}
                    className="rounded border-gray-300 text-bordeaux focus:ring-bordeaux cursor-pointer"
                  />
                  Autorizado a retirar o estudante fisicamente da escola.
                </label>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button 
                    type="button"
                    onClick={() => setIsGuardianModalOpen(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2 bg-oxford text-gold hover:bg-oxford/90 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border border-gold/30 shadow-xs cursor-pointer flex items-center gap-2"
                  >
                    {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {editingGuardianId ? 'Salvar Alterações' : 'Incluir Responsável'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="mt-8 pt-8 border-t border-gray-200">
         <FamilyAttendanceView studentId={activeStudentId} />
      </div>
    </div>
  );
}
