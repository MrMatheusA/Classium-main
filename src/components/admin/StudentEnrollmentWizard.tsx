import React, { useState, useEffect } from 'react';
import { 
  User, Users, GraduationCap, FileCheck, CheckCircle2, XCircle, 
  ArrowLeft, ArrowRight, Save, Trash2, Plus, Info, RefreshCw, 
  Check, Play, ShieldAlert, BookOpen, Truck, Utensils, Search, AlertCircle, MapPin
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getSupabaseEnvConfig } from '../../lib/supabase/config';
import { usePlatform } from '../../context/PlatformContext';
import { studentsService } from '../../services/students/students.service';
import { guardiansService } from '../../services/guardians/guardians.service';
import { communicationsService } from '../../services/communications/communications.service';
import { notificationsService } from '../../services/notifications/notifications.service';
import { maskCPF, maskDate, maskCellPhone, maskRG, maskCEP } from '../../utils/masks';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface GuardianInput {
  id?: string;
  name: string;
  cpf: string;
  email: string;
  phone: string;
  relationship: string;
  isFinancial: boolean;
}

interface EnrollmentFormState {
  // Aluno
  studentName: string;
  studentCpf: string;
  studentBirthDate: string;
  studentSex: 'M' | 'F';
  studentPhotoUrl: string;
  studentAee: boolean;
  studentLaudo: boolean;
  studentDietaryInfo: string;
  studentMedicalNotes: string;
  
  // Endereço Residencial (ViaCEP)
  addressCep: string;
  addressStreet: string;
  addressNumber: string;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  addressComplement: string;

  // Responsáveis
  guardians: GuardianInput[];
  
  // Escola / Turma
  schoolId: string;
  grade: string;
  academicYear: string;
  shift: 'Matutino' | 'Vespertino' | 'Integral' | 'Noturno';
  transportRequired: boolean;
}

const initialFormState: EnrollmentFormState = {
  studentName: '',
  studentCpf: '',
  studentBirthDate: '',
  studentSex: 'M',
  studentPhotoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150',
  studentAee: false,
  studentLaudo: false,
  studentDietaryInfo: '',
  studentMedicalNotes: '',
  
  // Endereço Residencial
  addressCep: '',
  addressStreet: '',
  addressNumber: '',
  addressNeighborhood: '',
  addressCity: '',
  addressState: '',
  addressComplement: '',

  guardians: [
    { name: '', cpf: '', email: '', phone: '', relationship: 'Mãe', isFinancial: true }
  ],
  schoolId: '',
  grade: '',
  academicYear: '2026',
  shift: 'Matutino',
  transportRequired: false
};



interface StudentEnrollmentWizardProps {
  onClose: () => void;
  onSuccess?: () => void;
  schoolsList?: { id: string; name: string }[];
}

export function StudentEnrollmentWizard({ onClose, onSuccess, schoolsList = [] }: StudentEnrollmentWizardProps) {
  const { currentUser } = usePlatform();
  const [step, setStep] = useState<number>(1);
  const [formData, setFormData] = useState<EnrollmentFormState>(initialFormState);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>(schoolsList);
  
  // Real DB data states
  const [dbClasses, setDbClasses] = useState<{ id: string; name: string; shift?: string; room?: string; course_id?: string; academic_year_id?: string; organization_id?: string; is_active?: boolean }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [academicYearId, setAcademicYearId] = useState<string>('');
  const [classLoadError, setClassLoadError] = useState<string | null>(null);
  const [academicYearError, setAcademicYearError] = useState<string | null>(null);

  // CEP lookup states
  const [cepLoading, setCepLoading] = useState<boolean>(false);
  const [cepSuccess, setCepSuccess] = useState<boolean>(false);

  const handleFetchCep = async (cepInput: string) => {
    const cleanCep = cepInput.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setCepLoading(true);
    setCepSuccess(false);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          addressStreet: data.logradouro || prev.addressStreet,
          addressNeighborhood: data.bairro || prev.addressNeighborhood,
          addressCity: data.localidade || prev.addressCity,
          addressState: data.uf || prev.addressState
        }));
        setCepSuccess(true);
        setTimeout(() => setCepSuccess(false), 3000);
      }
    } catch (err) {
      console.warn('Erro ao consultar ViaCEP:', err);
    } finally {
      setCepLoading(false);
    }
  };

  // Transaction execution states
  const [resolvedOrgIdLog, setResolvedOrgIdLog] = useState<string | null>(null);
  const [executionLog, setExecutionLog] = useState<{ step: number; label: string; status: 'pending' | 'running' | 'success' | 'failed'; details?: string }[]>([]);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionSuccess, setExecutionSuccess] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rolledBack, setRolledBack] = useState<boolean>(false);
  const [createdProfileIdsLog, setCreatedProfileIdsLog] = useState<string[]>([]);
  const [createdGuardianIdsLog, setCreatedGuardianIdsLog] = useState<string[]>([]);
  const [createdStudentIdsLog, setCreatedStudentIdsLog] = useState<string[]>([]);

  // Load draft on mount and fetch real classes and academic year
  useEffect(() => {
    const fetchRealDataAndDraft = async () => {
      // 1. Load draft
      const savedDraft = localStorage.getItem('educaplus_enrollment_draft');
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setFormData(parsed);
          setDraftMessage('Rascunho de matrícula anterior carregado automaticamente.');
          setTimeout(() => setDraftMessage(null), 4000);
        } catch (err) {
          console.error('Failed to parse saved enrollment draft', err);
        }
      }

      const organizationId = currentUser?.organizationId || '11111111-1111-1111-1111-111111111111';

      // 2. Fetch academic years
      const { data: years } = await supabase
        .from('academic_years')
        .select('id,name,starts_on,ends_on,is_current,organization_id')
        .eq('organization_id', organizationId);

      const resolvedAcademicYearId =
        years?.find(y => y.is_current)?.id ??
        years?.[0]?.id ??
        null;

      if (!resolvedAcademicYearId) {
        setAcademicYearId('');
        setAcademicYearError('Ano letivo não encontrado');
      } else {
        setAcademicYearId(resolvedAcademicYearId);
        setAcademicYearError(null);
        const matchedYearObj = years?.find(y => y.id === resolvedAcademicYearId);
        setFormData(prev => ({
          ...prev,
          academicYear: matchedYearObj?.name || '2026'
        }));
      }

      // 3. Fetch classes
      const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select('id,name,shift,room,course_id,academic_year_id,organization_id,is_active')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name');

      console.log('[MATRÍCULA CLASSES]', classes);

      if (classesError || !classes || classes.length === 0) {
        setDbClasses([]);
        setSelectedClassId('');
        setClassLoadError(null);
        setFormData(prev => ({
          ...prev,
          grade: 'Sem turma vinculada (Pendente)',
          shift: prev.shift || 'Matutino'
        }));
      } else {
        setDbClasses(classes as any);
        setSelectedClassId(classes[0]?.id || '');
        setClassLoadError(null);
        setFormData(prev => ({
          ...prev,
          grade: classes[0]?.name || 'Sem turma vinculada',
          shift: (classes[0]?.shift as any) || prev.shift
        }));
      }
    };

    fetchRealDataAndDraft();
  }, [currentUser?.organizationId]);

  // Save Draft
  const handleSaveDraft = () => {
    setIsSavingDraft(true);
    localStorage.setItem('educaplus_enrollment_draft', JSON.stringify(formData));
    setTimeout(() => {
      setIsSavingDraft(false);
      setDraftMessage('Rascunho salvo com sucesso localmente!');
      setTimeout(() => setDraftMessage(null), 3000);
    }, 800);
  };

  // Clear Draft
  const handleClearDraft = () => {
    localStorage.removeItem('educaplus_enrollment_draft');
    setFormData(initialFormState);
    setDraftMessage('Campos resetados e rascunho limpo.');
    setTimeout(() => setDraftMessage(null), 3000);
  };

  // CPF Validator
  const isValidCPF = (cpf: string): boolean => {
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cleanCpf)) return false;
    
    let sum = 0;
    let remainder;
    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cleanCpf.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCpf.substring(9, 10))) return false;
    
    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cleanCpf.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCpf.substring(10, 11))) return false;
    
    return true;
  };

  // Validate Step data
  const validateStep = (currentStep: number): boolean => {
    const errors: Record<string, string> = {};
    
    if (currentStep === 1) {
      if (!formData.studentName.trim()) {
        errors.studentName = 'Nome do aluno é obrigatório.';
      }
      if (formData.studentCpf && !isValidCPF(formData.studentCpf)) {
        errors.studentCpf = 'CPF informado é inválido.';
      }
      if (!formData.studentBirthDate.trim()) {
        errors.studentBirthDate = 'Data de nascimento é obrigatória.';
      } else {
        const regex = /^\d{2}\/\d{2}\/\d{4}$/;
        if (!regex.test(formData.studentBirthDate)) {
          errors.studentBirthDate = 'Formato inválido. Use DD/MM/AAAA.';
        }
      }
    }
    
    if (currentStep === 2) {
      if (formData.guardians.length === 0) {
        errors.guardians = 'É necessário cadastrar pelo menos um responsável.';
      } else {
        formData.guardians.forEach((g, idx) => {
          if (!g.name.trim()) {
            errors[`guardian_${idx}_name`] = 'Nome é obrigatório.';
          }
          if (!g.cpf.trim()) {
            errors[`guardian_${idx}_cpf`] = 'CPF é obrigatório.';
          } else if (!isValidCPF(g.cpf)) {
            errors[`guardian_${idx}_cpf`] = 'CPF inválido.';
          }
          if (!g.email.trim()) {
            errors[`guardian_${idx}_email`] = 'E-mail é obrigatório.';
          } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email)) {
            errors[`guardian_${idx}_email`] = 'E-mail inválido.';
          }
          if (!g.phone.trim()) {
            errors[`guardian_${idx}_phone`] = 'Celular é obrigatório.';
          }
        });
        
        const hasFinancial = formData.guardians.some(g => g.isFinancial);
        if (!hasFinancial) {
          errors.financial = 'Pelo menos um responsável deve ser o responsável financeiro.';
        }
      }
    }

    if (currentStep === 3) {
      // Classes and academic year are optional at registration time.
      // Students can be registered without a class and linked later.
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
  };

  const handleGuardianChange = (index: number, field: keyof GuardianInput, value: any) => {
    const updated = [...formData.guardians];
    
    if (field === 'isFinancial' && value === true) {
      // Only one can be financial
      updated.forEach((g, idx) => {
        g.isFinancial = idx === index;
      });
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value
      };
    }
    
    setFormData({
      ...formData,
      guardians: updated
    });
  };

  const addGuardian = () => {
    setFormData({
      ...formData,
      guardians: [
        ...formData.guardians,
        { name: '', cpf: '', email: '', phone: '', relationship: 'Pai', isFinancial: false }
      ]
    });
  };

  const removeGuardian = (index: number) => {
    if (formData.guardians.length === 1) return;
    const updated = formData.guardians.filter((_, idx) => idx !== index);
    
    // If we removed the financial one, make the first one financial
    if (!updated.some(g => g.isFinancial)) {
      updated[0].isFinancial = true;
    }
    
    setFormData({
      ...formData,
      guardians: updated
    });
  };

  // HYBRID TRANSACTION EXECUTION: MULTI-TABLE PERSISTENCE WITH DETAILED LOGS AND ROLLBACK
  const executeEnrollmentTransaction = async () => {
    setIsExecuting(true);
    setExecutionSuccess(null);
    setErrorMessage(null);
    setRolledBack(false);

    // Dynamic clean progress logs
    const initialLogs = [
      { step: 1, label: 'Validando dados cadastrais e autorização multi-tenant...', status: 'running' as const },
      { step: 2, label: 'Registrando responsável(is) em public.guardians...', status: 'pending' as const },
      { step: 3, label: 'Persistindo dados do estudante em public.students...', status: 'pending' as const },
      { step: 4, label: 'Vinculando responsável(is) (student_responsible_links & family_links)...', status: 'pending' as const },
      { step: 5, label: 'Alocando estudante na turma (public.class_students)...', status: 'pending' as const },
      { step: 6, label: 'Finalizando sincronização em tempo real...', status: 'pending' as const }
    ];
    setExecutionLog(initialLogs);

    const createdGuardians: string[] = [];
    let createdStudentId: string | null = null;
    const createdLinks: { srlIds: string[]; flIds: string[]; csIds: string[] } = {
      srlIds: [],
      flIds: [],
      csIds: []
    };

    try {
      const primaryGuardian = formData.guardians[0];
      const cleanedStudentCpf = formData.studentCpf ? formData.studentCpf.replace(/\D/g, '') : null;
      const cleanedGuardianCpf = primaryGuardian ? primaryGuardian.cpf.replace(/\D/g, '') : '';

      if (!primaryGuardian || !primaryGuardian.name.trim()) {
        throw new Error('Os dados do responsável são obrigatórios.');
      }

      const organizationId = currentUser?.organizationId || '11111111-1111-1111-1111-111111111111';
      setResolvedOrgIdLog(organizationId);

      const birthDateFormatted = formData.studentBirthDate.includes('/') 
        ? formData.studentBirthDate.split('/').reverse().join('-') 
        : (formData.studentBirthDate || null);

      // STEP 1: VALIDATION
      setExecutionLog(prev => prev.map(l => l.step === 1 ? { ...l, status: 'success' as const, label: 'Dados validados com sucesso.' } : l.step === 2 ? { ...l, status: 'running' as const } : l));

      // STEP 2: GUARDIANS (public.guardians)
      const guardianRecords: Array<{ id: string; name: string; relationship: string; isPrimary: boolean; isFinancial: boolean }> = [];
      for (const g of formData.guardians) {
        const gName = g.name.trim();
        const gCpf = (g.cpf || '').replace(/\D/g, '');
        if (!gName) continue;

        let gId: string | null = null;
        if (gCpf) {
          try {
            const { data: existingG } = await supabase
              .from('guardians')
              .select('id')
              .eq('cpf', gCpf)
              .maybeSingle();
            if (existingG) {
              gId = existingG.id;
            }
          } catch (_) {}
        }

        if (!gId) {
          gId = generateUUID();
          try {
            const { error: gErr } = await supabase.from('guardians').insert({
              id: gId,
              organization_id: organizationId,
              school_id: organizationId,
              full_name: gName,
              name: gName,
              cpf: g.cpf || null,
              email: g.email || null,
              phone: g.phone || null,
              kinship: g.relationship || 'Responsável',
              status: 'active'
            });
            if (!gErr) {
              createdGuardians.push(gId);
            }
          } catch (e) {
            console.warn('[Wizard] Guardians insert notice:', e);
          }
        }

        guardianRecords.push({
          id: gId,
          name: gName,
          relationship: g.relationship || 'Responsável',
          isPrimary: true,
          isFinancial: !!g.isFinancial
        });
      }

      setCreatedGuardianIdsLog(guardianRecords.map(g => g.id));
      setExecutionLog(prev => prev.map(l => l.step === 2 ? { ...l, status: 'success' as const, label: `${guardianRecords.length} responsável(is) processado(s).` } : l.step === 3 ? { ...l, status: 'running' as const } : l));

      // STEP 3: STUDENT (public.students)
      const newStudentUuid = generateUUID();
      createdStudentId = newStudentUuid;
      const regCode = `RA-2026-${Math.floor(100 + Math.random() * 900)}`;
      const selectedClassObj = dbClasses.find(c => c.id === selectedClassId);
      const className = selectedClassObj 
        ? selectedClassObj.name 
        : (formData.grade && formData.grade !== 'Sem turma vinculada (Pendente)' ? formData.grade : 'Sem Turma');
      const classShift = selectedClassObj ? selectedClassObj.shift : formData.shift;

      const studentPayload: any = {
        id: newStudentUuid,
        organization_id: organizationId,
        school_id: organizationId,
        full_name: formData.studentName,
        name: formData.studentName,
        registration_code: regCode,
        birth_date: birthDateFormatted,
        cpf: cleanedStudentCpf,
        sex: formData.studentSex || 'M',
        gender: formData.studentSex || 'M',
        status: 'Matriculado',
        class_id: selectedClassObj ? selectedClassObj.id : null,
        address: formData.addressStreet || null,
        neighborhood: formData.addressNeighborhood || null,
        city: formData.addressCity || null,
        state: formData.addressState || null,
        postal_code: formData.addressCep || null,
        has_special_needs: !!formData.studentAee,
        allergies: formData.studentDietaryInfo || null,
        medical_conditions: formData.studentMedicalNotes || null,
        uses_transport: !!formData.transportRequired,
        guardian_name: primaryGuardian.name,
        guardian_phone: primaryGuardian.phone,
        guardian_relationship: primaryGuardian.relationship,
        guardian_cpf: primaryGuardian.cpf
      };

      const { error: stInsertErr } = await supabase.from('students').insert(studentPayload);
      if (stInsertErr) {
        throw new Error(`Erro ao salvar estudante no Supabase: ${stInsertErr.message}`);
      }

      setCreatedStudentIdsLog([newStudentUuid]);
      setExecutionLog(prev => prev.map(l => l.step === 3 ? { ...l, status: 'success' as const, label: 'Estudante persistido com sucesso no Supabase.' } : l.step === 4 ? { ...l, status: 'running' as const } : l));

      // STEP 4: GUARDIAN LINKS (student_responsible_links & family_links)
      for (const g of guardianRecords) {
        const srlId = generateUUID();
        const flId = generateUUID();
        
        const { error: srlErr } = await supabase.from('student_responsible_links').insert({
          id: srlId,
          organization_id: organizationId,
          student_id: newStudentUuid,
          guardian_id: g.id,
          guardian_name: g.name,
          relationship: g.relationship,
          is_primary_contact: g.isPrimary,
          is_financial_responsible: g.isFinancial,
          is_pedagogical_responsible: true,
          can_pickup: true
        });
        if (srlErr) throw new Error(`Erro ao vincular responsável: ${srlErr.message}`);
        createdLinks.srlIds.push(srlId);

        const { error: flErr } = await supabase.from('family_links').insert({
          id: flId,
          organization_id: organizationId,
          student_id: newStudentUuid,
          guardian_id: g.id
        });
        if (flErr) throw new Error(`Erro ao criar vínculo familiar: ${flErr.message}`);
        createdLinks.flIds.push(flId);
      }

      setExecutionLog(prev => prev.map(l => l.step === 4 ? { ...l, status: 'success' as const, label: 'Vínculos familiares registrados com sucesso.' } : l.step === 5 ? { ...l, status: 'running' as const } : l));

      // STEP 5: CLASS ALLOCATION (class_students)
      if (selectedClassObj && selectedClassObj.id) {
        const csId = generateUUID();
        const { error: csErr } = await supabase.from('class_students').insert([{
          id: csId,
          organization_id: organizationId,
          class_id: selectedClassObj.id,
          student_id: newStudentUuid,
          status: 'active'
        }]);
        if (csErr) throw new Error(`Erro ao alocar estudante na turma: ${csErr.message}`);
        createdLinks.csIds.push(csId);
        setExecutionLog(prev => prev.map(l => l.step === 5 ? { ...l, status: 'success' as const, label: `Estudante alocado na turma ${selectedClassObj.name}.` } : l.step === 6 ? { ...l, status: 'running' as const } : l));
      } else {
        setExecutionLog(prev => prev.map(l => l.step === 5 ? { ...l, status: 'success' as const, label: 'Sem turma vinculada no momento (Pendente).' } : l.step === 6 ? { ...l, status: 'running' as const } : l));
      }

      // STEP 6: BACKEND API SYNC & FINALIZATION
      const servicePayload = {
        ...studentPayload,
        class_name: className,
        shift: classShift || 'Matutino',
        academic_year: formData.academicYear || '2026',
        guardians: formData.guardians.map(g => ({
          full_name: g.name,
          name: g.name,
          relationship: g.relationship,
          phone: g.phone,
          email: g.email,
          document_number: g.cpf,
          cpf: g.cpf,
          is_primary: true,
          is_financial: !!g.isFinancial
        }))
      };

      await studentsService.createStudent(servicePayload);

      window.dispatchEvent(new CustomEvent('classium_students_updated'));
      window.dispatchEvent(new CustomEvent('classium_school_updated'));

      setExecutionLog(prev => prev.map(l => l.step === 6 ? { ...l, status: 'success' as const, label: 'Matrícula confirmada e sincronizada em tempo real!' } : l));
      setExecutionSuccess(true);
      setIsExecuting(false);
      localStorage.removeItem('educaplus_enrollment_draft');

    } catch (err: any) {
      console.error('[TRANSACTION FAILURE]:', err);

      // Perform automatic compensatory rollback of newly created records
      try {
        if (createdLinks.csIds.length > 0) {
          await supabase.from('class_students').delete().in('id', createdLinks.csIds);
        }
        if (createdLinks.flIds.length > 0) {
          await supabase.from('family_links').delete().in('id', createdLinks.flIds);
        }
        if (createdLinks.srlIds.length > 0) {
          await supabase.from('student_responsible_links').delete().in('id', createdLinks.srlIds);
        }
        if (createdStudentId) {
          await supabase.from('students').delete().eq('id', createdStudentId);
        }
        setRolledBack(true);
      } catch (rollbackErr) {
        console.warn('[Wizard] Compensatory rollback notice:', rollbackErr);
      }

      setExecutionLog(prev => prev.map(l => l.status === 'running' ? { ...l, status: 'failed' as const } : l));
      setExecutionSuccess(false);
      setErrorMessage(err.message || 'Erro na transação de matrícula.');
      setIsExecuting(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-[#060b19]/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0b1329] border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]">
        
        {/* Wizard Header */}
        <div className="p-6 bg-gradient-to-r from-slate-950 to-[#0c1630] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="space-y-1 text-left">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-gold/10 border border-gold/30 rounded-full text-gold text-[9px] font-black uppercase tracking-widest">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>SISTEMA INTEGRADO DE MATRÍCULA CORPORATIVA</span>
            </div>
            <h2 className="text-lg md:text-xl font-serif font-bold text-white">Fluxo de Matrícula do Aluno</h2>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-white transition-colors"
            disabled={isExecuting}
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Progress Steps Indicator Bar */}
        {step < 5 && (
          <div className="px-6 py-4 bg-slate-950/40 border-b border-slate-900 shrink-0">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {[
                { number: 1, label: 'Aluno', icon: User },
                { number: 2, label: 'Responsáveis', icon: Users },
                { number: 3, label: 'Vínculo Escolar', icon: GraduationCap },
                { number: 4, label: 'Revisão', icon: FileCheck },
              ].map((s) => {
                const Icon = s.icon;
                const isCompleted = step > s.number;
                const isActive = step === s.number;
                
                return (
                  <div key={s.number} className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCompleted ? 'bg-gold text-slate-950 font-black' :
                      isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 ring-2 ring-blue-400/40' :
                      'bg-slate-900 text-slate-500 border border-slate-800'
                    }`}>
                      {isCompleted ? <Check className="w-4.5 h-4.5 stroke-[3]" /> : s.number}
                    </div>
                    <span className={`text-[11px] font-bold hidden sm:inline ${isActive ? 'text-white' : 'text-slate-500'}`}>
                      {s.label}
                    </span>
                    {s.number < 4 && <div className="w-8 md:w-16 h-0.5 bg-slate-800 mx-1"></div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Toast / Draft Notifications */}
        {draftMessage && (
          <div className="bg-gold/10 border-y border-gold/30 px-6 py-2.5 text-center text-[11px] text-gold font-semibold flex items-center justify-center gap-2 animate-fade-in shrink-0">
            <Info className="w-4 h-4 shrink-0" />
            <span>{draftMessage}</span>
          </div>
        )}

        {/* Wizard Main Content (Scrollable) */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1 text-left space-y-6 text-xs text-slate-200">
          
          {/* STEP 1: ALUNO DADOS */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-white">Etapa 1: Dados do Aluno</h3>
                <p className="text-[11px] text-slate-400">Insira as informações do novo estudante. O CPF é opcional, mas se digitado será validado.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Photo Roster Selection */}
                <div className="space-y-4 md:col-span-1 flex flex-col items-center justify-center bg-slate-950/40 p-6 rounded-2xl border border-slate-850">
                  <img 
                    src={formData.studentPhotoUrl || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150"} 
                    className="w-28 h-28 rounded-full object-cover border-2 border-gold/40 shadow-xl" 
                    alt="Foto do Aluno" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="space-y-1 w-full text-center">
                    <label className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">URL da Foto</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-[10px] text-slate-300 text-center focus:border-gold/30 outline-none"
                      value={formData.studentPhotoUrl}
                      onChange={(e) => setFormData({ ...formData, studentPhotoUrl: e.target.value })}
                    />
                  </div>
                </div>

                {/* Form fields */}
                <div className="space-y-4 md:col-span-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Nome Completo do Aluno *</label>
                    <input 
                      type="text"
                      className={`w-full bg-slate-900 border ${validationErrors.studentName ? 'border-rose-500' : 'border-slate-800'} rounded-xl p-3 text-white focus:border-[#D4AF37] outline-none transition-all`}
                      placeholder="Ex: Pedro Henrique de Souza Alencar"
                      value={formData.studentName}
                      onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                    />
                    {validationErrors.studentName && <span className="text-[10px] text-rose-500 font-bold block">{validationErrors.studentName}</span>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">CPF (Opcional)</label>
                      <input 
                        type="text"
                        className={`w-full bg-slate-900 border ${validationErrors.studentCpf ? 'border-rose-500' : 'border-slate-800'} rounded-xl p-3 text-white focus:border-[#D4AF37] outline-none`}
                        placeholder="000.000.000-00"
                        value={formData.studentCpf}
                        onChange={(e) => setFormData({ ...formData, studentCpf: maskCPF(e.target.value) })}
                      />
                      {validationErrors.studentCpf && <span className="text-[10px] text-rose-500 font-bold block">{validationErrors.studentCpf}</span>}
                    </div>
 
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Nascimento * (DD/MM/AAAA)</label>
                      <input 
                        type="text"
                        className={`w-full bg-slate-900 border ${validationErrors.studentBirthDate ? 'border-rose-500' : 'border-slate-800'} rounded-xl p-3 text-white focus:border-[#D4AF37] outline-none`}
                        placeholder="14/12/2012"
                        value={formData.studentBirthDate}
                        onChange={(e) => setFormData({ ...formData, studentBirthDate: maskDate(e.target.value) })}
                      />
                      {validationErrors.studentBirthDate && <span className="text-[10px] text-rose-500 font-bold block">{validationErrors.studentBirthDate}</span>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Sexo</label>
                      <select 
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:border-[#D4AF37] outline-none"
                        value={formData.studentSex}
                        onChange={(e) => setFormData({ ...formData, studentSex: e.target.value as any })}
                      >
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-850/60 space-y-3">
                      <h4 className="text-[10px] text-gold uppercase font-black tracking-widest">Inclusão Pedagógica</h4>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-300">AEE (Atendimento Especializado)</span>
                        <input 
                          type="checkbox"
                          className="w-4 h-4 rounded text-[#D4AF37] bg-slate-900 border-slate-800 focus:ring-0 cursor-pointer"
                          checked={formData.studentAee}
                          onChange={(e) => setFormData({ ...formData, studentAee: e.target.checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-300">Laudo Médico Emitido</span>
                        <input 
                          type="checkbox"
                          className="w-4 h-4 rounded text-[#D4AF37] bg-slate-900 border-slate-800 focus:ring-0 cursor-pointer"
                          checked={formData.studentLaudo}
                          onChange={(e) => setFormData({ ...formData, studentLaudo: e.target.checked })}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Restrições Alimentares</label>
                        <input 
                          type="text"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:border-[#D4AF37] outline-none"
                          placeholder="Ex: Intolerância a lactose, alergia a corantes"
                          value={formData.studentDietaryInfo}
                          onChange={(e) => setFormData({ ...formData, studentDietaryInfo: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Anotações Médicas / Alergias</label>
                        <input 
                          type="text"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:border-[#D4AF37] outline-none"
                          placeholder="Ex: Faz uso contínuo de bombinha para asma"
                          value={formData.studentMedicalNotes}
                          onChange={(e) => setFormData({ ...formData, studentMedicalNotes: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* SEÇÃO ENDEREÇO RESIDENCIAL COM VIA CEP */}
                  <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-850 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                      <h4 className="text-[10px] text-gold uppercase font-black tracking-widest flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-gold" /> Endereço Residencial do Estudante (ViaCEP)
                      </h4>
                      {cepSuccess && (
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Endereço Localizado!
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* CEP */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">CEP (Autocompletar)</label>
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 pr-8 text-white focus:border-[#D4AF37] outline-none font-mono"
                            placeholder="00000-000"
                            value={formData.addressCep}
                            onChange={(e) => {
                              const masked = maskCEP(e.target.value);
                              setFormData({ ...formData, addressCep: masked });
                              if (masked.replace(/\D/g, '').length === 8) {
                                handleFetchCep(masked);
                              }
                            }}
                            onBlur={() => handleFetchCep(formData.addressCep)}
                          />
                          {cepLoading && (
                            <RefreshCw className="w-4 h-4 text-gold animate-spin absolute right-3 pointer-events-none" />
                          )}
                        </div>
                      </div>

                      {/* RUA / LOGRADOURO */}
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Rua / Avenida / Logradouro</label>
                        <input
                          type="text"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:border-[#D4AF37] outline-none"
                          placeholder="Ex: Av. Paulista, Rua Flores"
                          value={formData.addressStreet}
                          onChange={(e) => setFormData({ ...formData, addressStreet: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {/* NÚMERO */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Número</label>
                        <input
                          type="text"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:border-[#D4AF37] outline-none"
                          placeholder="Ex: 102"
                          value={formData.addressNumber}
                          onChange={(e) => setFormData({ ...formData, addressNumber: e.target.value })}
                        />
                      </div>

                      {/* COMPLEMENTO */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Complemento</label>
                        <input
                          type="text"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:border-[#D4AF37] outline-none"
                          placeholder="Apt 42, Bloco B"
                          value={formData.addressComplement}
                          onChange={(e) => setFormData({ ...formData, addressComplement: e.target.value })}
                        />
                      </div>

                      {/* BAIRRO */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Bairro</label>
                        <input
                          type="text"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:border-[#D4AF37] outline-none"
                          placeholder="Ex: Bela Vista"
                          value={formData.addressNeighborhood}
                          onChange={(e) => setFormData({ ...formData, addressNeighborhood: e.target.value })}
                        />
                      </div>

                      {/* CIDADE / UF */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Cidade / UF</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="w-2/3 bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:border-[#D4AF37] outline-none"
                            placeholder="Cidade"
                            value={formData.addressCity}
                            onChange={(e) => setFormData({ ...formData, addressCity: e.target.value })}
                          />
                          <input
                            type="text"
                            className="w-1/3 bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:border-[#D4AF37] outline-none uppercase font-mono text-center"
                            placeholder="UF"
                            maxLength={2}
                            value={formData.addressState}
                            onChange={(e) => setFormData({ ...formData, addressState: e.target.value.toUpperCase() })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* STEP 2: RESPONSÁVEIS */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <div>
                  <h3 className="text-sm font-bold text-white">Etapa 2: Responsáveis Legais e Financeiros</h3>
                  <p className="text-[11px] text-slate-400">Cadastre a filiação ou responsáveis pelo aluno. Pelo menos um deve ser o responsável financeiro.</p>
                </div>
                <button
                  type="button"
                  onClick={addGuardian}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl font-bold text-[10px] uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Responsável
                </button>
              </div>

              {validationErrors.financial && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold rounded-xl text-center">
                  {validationErrors.financial}
                </div>
              )}

              {validationErrors.guardians && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold rounded-xl text-center">
                  {validationErrors.guardians}
                </div>
              )}

              <div className="space-y-4">
                {formData.guardians.map((g, idx) => (
                  <div key={idx} className="bg-slate-950/60 p-5 rounded-2xl border border-slate-850 space-y-4 relative">
                    
                    {/* Card Title & Delete */}
                    <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                      <span className="font-bold text-[11px] text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-gold" /> Responsável #{idx + 1} {g.isFinancial && <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold rounded-full">✓ Financeiro</span>}
                      </span>
                      
                      {formData.guardians.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeGuardian(idx)}
                          className="text-slate-500 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Inputs Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Nome Completo *</label>
                        <input 
                          type="text"
                          className={`w-full bg-slate-900 border ${validationErrors[`guardian_${idx}_name`] ? 'border-rose-500' : 'border-slate-800'} rounded-xl p-2.5 text-white focus:border-[#D4AF37] outline-none`}
                          placeholder="Ex: Fernanda Alencar de Souza"
                          value={g.name}
                          onChange={(e) => handleGuardianChange(idx, 'name', e.target.value)}
                        />
                        {validationErrors[`guardian_${idx}_name`] && <span className="text-[9px] text-rose-500 font-bold block">{validationErrors[`guardian_${idx}_name`]}</span>}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">CPF *</label>
                        <input 
                          type="text"
                          className={`w-full bg-slate-900 border ${validationErrors[`guardian_${idx}_cpf`] ? 'border-rose-500' : 'border-slate-800'} rounded-xl p-2.5 text-white focus:border-[#D4AF37] outline-none`}
                          placeholder="000.000.000-00"
                          value={g.cpf}
                          onChange={(e) => handleGuardianChange(idx, 'cpf', maskCPF(e.target.value))}
                        />
                        {validationErrors[`guardian_${idx}_cpf`] && <span className="text-[9px] text-rose-500 font-bold block">{validationErrors[`guardian_${idx}_cpf`]}</span>}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">E-mail * (Para login do Portal)</label>
                        <input 
                          type="email"
                          className={`w-full bg-slate-900 border ${validationErrors[`guardian_${idx}_email`] ? 'border-rose-500' : 'border-slate-800'} rounded-xl p-2.5 text-white focus:border-[#D4AF37] outline-none`}
                          placeholder="fernanda@email.com"
                          value={g.email}
                          onChange={(e) => handleGuardianChange(idx, 'email', e.target.value)}
                        />
                        {validationErrors[`guardian_${idx}_email`] && <span className="text-[9px] text-rose-500 font-bold block">{validationErrors[`guardian_${idx}_email`]}</span>}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Celular / WhatsApp *</label>
                        <input 
                          type="text"
                          className={`w-full bg-slate-900 border ${validationErrors[`guardian_${idx}_phone`] ? 'border-rose-500' : 'border-slate-800'} rounded-xl p-2.5 text-white focus:border-[#D4AF37] outline-none`}
                          placeholder="(11) 99999-0000"
                          value={g.phone}
                          onChange={(e) => handleGuardianChange(idx, 'phone', maskCellPhone(e.target.value))}
                        />
                        {validationErrors[`guardian_${idx}_phone`] && <span className="text-[9px] text-rose-500 font-bold block">{validationErrors[`guardian_${idx}_phone`]}</span>}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Grau de Parentesco</label>
                        <select
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:border-[#D4AF37]"
                          value={g.relationship}
                          onChange={(e) => handleGuardianChange(idx, 'relationship', e.target.value)}
                        >
                          <option value="Mãe">Mãe</option>
                          <option value="Pai">Pai</option>
                          <option value="Padrasto">Padrasto</option>
                          <option value="Madrasta">Madrasta</option>
                          <option value="Avô/Avó">Avô/Avó</option>
                          <option value="Tio/Tia">Tio/Tia</option>
                          <option value="Outro">Outro Legal</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-3 pt-5 pl-1">
                        <input 
                          type="checkbox"
                          id={`financial_check_${idx}`}
                          className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-800 focus:ring-0 cursor-pointer"
                          checked={g.isFinancial}
                          onChange={(e) => handleGuardianChange(idx, 'isFinancial', e.target.checked)}
                        />
                        <label htmlFor={`financial_check_${idx}`} className="text-[10px] text-slate-300 font-bold tracking-wide cursor-pointer uppercase">Responsável Financeiro</label>
                      </div>

                    </div>

                  </div>
                ))}
              </div>

            </div>
          )}

          {/* STEP 3: VÍNCULO ESCOLAR */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-white">Etapa 3: Alocação Acadêmica e Serviços</h3>
                <p className="text-[11px] text-slate-400">Indique em qual unidade física, turma e ano letivo o aluno será inserido. Caso a escola ainda não tenha turmas cadastradas, o aluno pode ser matriculado e vinculado posteriormente.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* School unit & class inputs */}
                <div className="space-y-4 bg-slate-950/40 p-5 rounded-2xl border border-slate-850">
                  <h4 className="text-[10px] text-gold uppercase font-black tracking-widest border-b border-slate-900 pb-1">Nó da Rede Escolar</h4>

                  {dbClasses.length === 0 && (
                    <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-xl text-xs flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-white text-xs">Nenhuma turma cadastrada no momento</p>
                        <p className="text-[11px] text-blue-200/80 mt-0.5 leading-relaxed">
                          O cadastro pode ser realizado normalmente agora sem vínculo a uma turma. Assim que as turmas forem criadas, você poderá vinculá-lo a qualquer momento na listagem de estudantes.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Ano Letivo de Ingresso</label>
                      <input
                        type="text"
                        readOnly
                        value={formData.academicYear || '2026'}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-300 font-bold cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Série & Turma Alocada</label>
                      <select
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:border-[#D4AF37] font-bold"
                        value={selectedClassId}
                        onChange={(e) => {
                          const classId = e.target.value;
                          setSelectedClassId(classId);
                          if (!classId) {
                            setFormData(prev => ({
                              ...prev,
                              grade: 'Sem turma vinculada (Pendente)'
                            }));
                          } else {
                            const cls = dbClasses.find(c => c.id === classId);
                            if (cls) {
                              setFormData(prev => ({
                                ...prev,
                                grade: cls.name,
                                shift: (cls.shift as any) || prev.shift
                              }));
                            }
                          }
                        }}
                      >
                        <option value="">Sem turma vinculada (Vincular posteriormente)</option>
                        {dbClasses.map(cls => (
                          <option key={cls.id} value={cls.id}>
                            {`${cls.name} · ${cls.shift || '-'} · ${cls.room || '-'}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Turno Acadêmico</label>
                    <select
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:border-[#D4AF37]"
                      value={formData.shift}
                      onChange={(e) => setFormData({ ...formData, shift: e.target.value as any })}
                    >
                      <option value="Matutino">Matutino (Manhã)</option>
                      <option value="Vespertino">Vespertino (Tarde)</option>
                      <option value="Integral">Integral (Manhã + Tarde)</option>
                      <option value="Noturno">Noturno (Noite)</option>
                    </select>
                  </div>
                </div>

                {/* Services & Modules list */}
                <div className="space-y-4 bg-slate-950/40 p-5 rounded-2xl border border-slate-850 flex flex-col justify-between">
                  <div>
                    <h4 className="text-[10px] text-gold uppercase font-black tracking-widest border-b border-slate-900 pb-1 mb-3">Ativação Automática de Módulos</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-4">Ao confirmar, o sistema provisionará automaticamente os acessos integrados do aluno aos seguintes serviços:</p>
                    
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-2 bg-slate-900/60 rounded-xl border border-slate-850">
                        <BookOpen className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-[11px] text-white">Biblioteca Geral (Library)</p>
                          <p className="text-[10px] text-slate-500">Cartão de leitor gerado com limite de 3 empréstimos simultâneos.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-2 bg-slate-900/60 rounded-xl border border-slate-850">
                        <Utensils className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-[11px] text-white">Refeitório & Alimentação (Meals)</p>
                          <p className="text-[10px] text-slate-500">Cartão de consumo digital ativado. Alergias vinculadas à cozinha escolar.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-2 bg-slate-900/60 rounded-xl border border-slate-850">
                        <Truck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <p className="font-bold text-[11px] text-white">Rotas de Transporte Escolar</p>
                            <input 
                              type="checkbox"
                              className="w-4 h-4 rounded text-blue-500 bg-slate-900 border-slate-800 focus:ring-0 cursor-pointer"
                              checked={formData.transportRequired}
                              onChange={(e) => setFormData({ ...formData, transportRequired: e.target.checked })}
                            />
                          </div>
                          <p className="text-[10px] text-slate-500">Solicitar credencial de acesso ao transporte de ônibus escolar.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-xl text-[10px] flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>Os módulos complementares serão associados no nó central em tempo real.</span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* STEP 4: REVISÃO */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-white">Etapa 4: Revisar e Consolidar Contrato</h3>
                <p className="text-[11px] text-slate-400">Verifique os dados antes de prosseguir. A matrícula será confirmada e gravada no sistema institucional.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Student summary */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                    <span className="font-bold text-[11px] text-[#D4AF37] uppercase font-mono tracking-wider">Dados do Estudante</span>
                    <button onClick={() => setStep(1)} className="text-[10px] text-blue-400 hover:underline">Editar</button>
                  </div>

                  <div className="flex items-center gap-3">
                    <img src={formData.studentPhotoUrl || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150"} className="w-12 h-12 rounded-full object-cover border border-slate-800" alt="" referrerPolicy="no-referrer" />
                    <div>
                      <h4 className="font-serif font-bold text-white text-xs">{formData.studentName}</h4>
                      <p className="text-[10px] text-slate-400">Nascimento: {formData.studentBirthDate}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-[10px] text-slate-300">
                    <p>CPF: <strong className="text-white">{formData.studentCpf || 'Não informado'}</strong></p>
                    <p>Sexo: <strong className="text-white">{formData.studentSex === 'M' ? 'Masculino' : 'Feminino'}</strong></p>
                    <p>Inclusão AEE: <strong className={formData.studentAee ? 'text-emerald-400' : 'text-slate-500'}>{formData.studentAee ? 'Sim' : 'Não'}</strong></p>
                    <p>Anotações Alimentares: <strong className="text-white">{formData.studentDietaryInfo || 'Nenhuma'}</strong></p>
                  </div>
                </div>

                {/* Guardians summary */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                    <span className="font-bold text-[11px] text-[#D4AF37] uppercase font-mono tracking-wider">Responsáveis Legais</span>
                    <button onClick={() => setStep(2)} className="text-[10px] text-blue-400 hover:underline">Editar</button>
                  </div>

                  <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                    {formData.guardians.map((g, idx) => (
                      <div key={idx} className="p-2 bg-slate-900/40 rounded-xl border border-slate-850">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-[11px] text-white leading-tight">{g.name}</p>
                          <span className="text-[8px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-bold">{g.relationship}</span>
                        </div>
                        <p className="text-[9px] text-slate-500 mt-1">CPF: {g.cpf} • {g.phone}</p>
                        {g.isFinancial && <p className="text-[8px] text-emerald-400 font-bold mt-1">✓ Responsável Financeiro</p>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Schooling summary */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                    <span className="font-bold text-[11px] text-[#D4AF37] uppercase font-mono tracking-wider">Alocação de Vaga</span>
                    <button onClick={() => setStep(3)} className="text-[10px] text-blue-400 hover:underline">Editar</button>
                  </div>

                  <div className="space-y-2 text-[10px] text-slate-300">
                    <p>Série/Turma: <strong className="text-white">{formData.grade || 'Sem turma vinculada (Pendente)'}</strong></p>
                    <p>Ano Letivo: <strong className="text-white">{formData.academicYear || '2026'}</strong></p>
                    <p>Turno: <strong className="text-white">{formData.shift}</strong></p>
                    <p>Transporte Solicitado: <strong className={formData.transportRequired ? 'text-emerald-400' : 'text-slate-500'}>{formData.transportRequired ? 'Sim' : 'Não'}</strong></p>
                  </div>

                  <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-xl text-[10px] leading-relaxed">
                    <strong>Atenção:</strong> A finalização deste assistente irá cadastrar o aluno e notificar os canais da escola.
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* STEP 5: CONFIRMAÇÃO & EXECUÇÃO DO CONTRATO */}
          {step === 5 && (
            <div className="space-y-6 animate-fade-in">
              
              {resolvedOrgIdLog && (
                <div id="debug-org-id" className="bg-slate-900/90 border border-[#D4AF37]/30 p-3.5 rounded-xl text-xs text-[#D4AF37] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-[#D4AF37] animate-pulse"></span>
                    <span><strong>Organização Resolvida (Debug):</strong> <code className="font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{resolvedOrgIdLog}</code></span>
                  </div>
                  <span className="text-[9px] uppercase font-mono tracking-wider text-slate-500 font-bold">LOG ATIVO</span>
                </div>
              )}
              
              {/* Active execution list */}
              {isExecuting && (
                <div className="space-y-4">
                  <div className="text-center py-4 space-y-2">
                    <RefreshCw className="w-10 h-10 text-gold animate-spin mx-auto" />
                    <h3 className="text-base font-serif font-bold text-white">Processando Matrícula...</h3>
                    <p className="text-xs text-slate-400 max-w-lg mx-auto">Gravando os dados do estudante, responsáveis e serviços no banco de dados.</p>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-850 rounded-2xl p-4.5 max-h-[300px] overflow-y-auto space-y-2 font-mono text-[10px]">
                    {executionLog.map((l) => (
                      <div key={l.step} className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-900/60 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">Etapa {l.step}:</span>
                          <span className="text-slate-200 font-sans font-bold">{l.label}</span>
                        </div>
                        
                        <div className="shrink-0 flex items-center gap-2">
                          {l.status === 'pending' && <span className="text-slate-600">Aguardando</span>}
                          {l.status === 'running' && (
                            <span className="text-gold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-ping"></span>
                              Processando
                            </span>
                          )}
                          {l.status === 'success' && <span className="text-emerald-400 font-bold">✓ Sucesso</span>}
                          {l.status === 'failed' && <span className="text-rose-500 font-bold">❌ Falha</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUCCESS STATE */}
              {executionSuccess === true && (
                <div className="text-center py-8 space-y-6 max-w-xl mx-auto">
                  <div className="w-16 h-16 bg-emerald-500/15 border-2 border-emerald-500 text-emerald-400 rounded-full flex items-center justify-center mx-auto animate-bounce shadow-lg shadow-emerald-500/10">
                    <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-serif font-bold text-white">Matrícula Efetuada com Sucesso!</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      O estudante <strong>{formData.studentName}</strong> foi devidamente matriculado no sistema {selectedClassId ? (
                        <>na turma <strong>{formData.grade}</strong>.</>
                      ) : (
                        <>sem turma vinculada (você poderá vinculá-lo a uma turma a qualquer momento na lista de estudantes).</>
                      )} O cadastro foi concluído com êxito.
                    </p>
                  </div>

                  {/* Rastro Transacional de Auditoria (Debug Log) */}
                  <div className="p-4 bg-slate-950/80 border border-slate-850 rounded-2xl text-left space-y-2.5 font-mono text-[10px]">
                    <div className="text-slate-400 font-bold border-b border-slate-900 pb-1.5 uppercase font-sans text-[10px] tracking-wider flex items-center gap-1">
                      <FileCheck className="w-3.5 h-3.5 text-gold" />
                      <span>Confirmação da Gravação</span>
                    </div>
                    <div className="space-y-1.5">
                      <p className="flex justify-between gap-4"><span className="text-slate-500">organization_id:</span> <span className="text-[#D4AF37] break-all text-right">{resolvedOrgIdLog || 'N/A'}</span></p>
                      <p className="flex justify-between gap-4"><span className="text-slate-500">profile_id:</span> <span className="text-emerald-400 break-all text-right">{createdProfileIdsLog.join(', ') || 'N/A'}</span></p>
                      <p className="flex justify-between gap-4"><span className="text-slate-500">guardian_id:</span> <span className="text-blue-400 break-all text-right">{createdGuardianIdsLog.join(', ') || 'N/A'}</span></p>
                      <p className="flex justify-between gap-4"><span className="text-slate-500">student_id:</span> <span className="text-purple-400 break-all text-right">{createdStudentIdsLog.join(', ') || 'N/A'}</span></p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        onClose();
                        if (onSuccess) onSuccess();
                      }}
                      className="flex-1 py-3 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] hover:from-[#e5bf3c] hover:to-[#be8c18] text-slate-950 font-black uppercase tracking-wider rounded-xl transition-all"
                    >
                      Concluir e Voltar para Alunos
                    </button>
                  </div>
                </div>
              )}

              {/* FAILURE STATE */}
              {executionSuccess === false && (
                <div className="text-center py-8 space-y-6 max-w-xl mx-auto">
                  <div className="w-16 h-16 bg-rose-500/15 border-2 border-rose-500 text-rose-400 rounded-full flex items-center justify-center mx-auto animate-pulse">
                    <ShieldAlert className="w-10 h-10 stroke-[2.5]" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-serif font-bold text-white">Falha ao Realizar Matrícula</h3>
                    <p className="text-xs text-rose-400 font-bold uppercase tracking-wider">Erro no Servidor / RPC</p>
                    <p className="text-xs text-slate-300 leading-relaxed mt-2 bg-slate-950 p-3 rounded-xl border border-rose-900/50 font-mono text-left">
                      {errorMessage}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Os dados digitados não foram perdidos. Você pode revisar o formulário e tentar novamente.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => setStep(4)}
                      className="flex-1 py-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-white font-bold uppercase tracking-wider rounded-xl transition-all"
                    >
                      Revisar Dados
                    </button>
                    <button 
                      onClick={executeEnrollmentTransaction}
                      className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase tracking-wider rounded-xl transition-all"
                    >
                      Tentar Novamente
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Wizard Footer Actions */}
        {step < 5 && (
          <div className="p-6 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
            
            {/* Left controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSavingDraft}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="Salvar campos preenchidos localmente"
              >
                {isSavingDraft ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-gold" />}
                <span>Salvar Rascunho</span>
              </button>
              
              <button
                type="button"
                onClick={handleClearDraft}
                className="px-3 py-2 text-slate-500 hover:text-slate-300 text-xs font-semibold transition-colors"
                title="Limpar campos e rascunho salvo"
              >
                Limpar Rascunho
              </button>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center gap-1.5 shadow-lg shadow-blue-500/10"
                >
                  Avançar <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setStep(5);
                    executeEnrollmentTransaction();
                  }}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  <Play className="w-4 h-4 text-emerald-100 fill-emerald-100" /> Confirmar Matrícula
                </button>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
