import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  FileCheck,
  GraduationCap,
  HeartPulse,
  Info,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Save,
  ShieldAlert,
  Trash2,
  Truck,
  User,
  Users,
  Utensils,
  X,
  type LucideIcon,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePlatform } from '../../context/PlatformContext';
import { studentsService } from '../../services/students/students.service';
import { maskCPF, maskDate, maskCellPhone, maskCEP } from '../../utils/masks';
import { Alert, Badge, Field, cx, inputCls, EASE } from '../ui/kit';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
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
  studentName: string;
  studentCpf: string;
  studentBirthDate: string;
  studentSex: 'M' | 'F';
  studentPhotoUrl: string;
  studentAee: boolean;
  studentLaudo: boolean;
  studentDietaryInfo: string;
  studentMedicalNotes: string;

  addressCep: string;
  addressStreet: string;
  addressNumber: string;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  addressComplement: string;

  guardians: GuardianInput[];

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
  studentPhotoUrl: '',
  studentAee: false,
  studentLaudo: false,
  studentDietaryInfo: '',
  studentMedicalNotes: '',
  addressCep: '',
  addressStreet: '',
  addressNumber: '',
  addressNeighborhood: '',
  addressCity: '',
  addressState: '',
  addressComplement: '',
  guardians: [{ name: '', cpf: '', email: '', phone: '', relationship: 'Mãe', isFinancial: true }],
  schoolId: '',
  grade: '',
  academicYear: '2026',
  shift: 'Matutino',
  transportRequired: false,
};

const DRAFT_KEY = 'educaplus_enrollment_draft';
const NO_CLASS_LABEL = 'Sem turma (vincular depois)';

const STEPS: { number: number; label: string; hint: string; icon: LucideIcon }[] = [
  { number: 1, label: 'Estudante', hint: 'Dados pessoais e endereço', icon: User },
  { number: 2, label: 'Responsáveis', hint: 'Quem responde pelo aluno', icon: Users },
  { number: 3, label: 'Turma', hint: 'Turma, turno e serviços', icon: GraduationCap },
  { number: 4, label: 'Revisão', hint: 'Confira e confirme', icon: FileCheck },
];

const RELATIONSHIPS = ['Mãe', 'Pai', 'Padrasto', 'Madrasta', 'Avô/Avó', 'Tio/Tia', 'Outro'];

/* ------------------------------------------------------------------ */
/* Peças de layout                                                     */
/* ------------------------------------------------------------------ */

function Section({ icon: Icon, title, subtitle, action, children }: { icon: LucideIcon; title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[22px] border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-[15px] font-semibold text-[var(--text-heading)]">{title}</h3>
            {subtitle && <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--text-muted)]">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function OkPill({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-full bg-[#ECFDF3] px-2.5 py-0.5 text-[12px] font-medium text-[#067647]">{children}</span>;
}

function ErrorText({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-1 flex items-center gap-1 text-[12px] font-medium text-[#B42318]">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      {children}
    </p>
  );
}

function SwitchRow({ label, hint, checked, onChange, icon: Icon }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; icon?: LucideIcon }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card-alt)] px-3.5 py-3 transition-colors hover:border-[var(--accent)]">
      <span className="flex min-w-0 items-center gap-3">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />}
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold text-[var(--text-heading)]">{label}</span>
          {hint && <span className="block text-[12px] text-[var(--text-muted)]">{hint}</span>}
        </span>
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span aria-hidden className={cx('flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors', checked ? 'bg-[var(--accent)]' : 'bg-[var(--border)]')}>
        <span className={cx('h-4 w-4 rounded-full bg-white shadow transition-transform', checked && 'translate-x-4')} />
      </span>
    </label>
  );
}

function SummaryRow({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'ok' | 'muted' }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-[13px]">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className={cx('text-right font-medium', tone === 'ok' ? 'text-[#067647]' : tone === 'muted' ? 'text-[var(--text-muted)]' : 'text-[var(--text-heading)]')}>{value}</dd>
    </div>
  );
}

function Avatar({ name, url, size = 'lg' }: { name: string; url?: string; size?: 'lg' | 'sm' }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'E';
  const cls = size === 'lg' ? 'h-24 w-24 text-[26px]' : 'h-11 w-11 text-[14px]';
  return url ? (
    <img src={url} alt="" referrerPolicy="no-referrer" className={cx(cls, 'rounded-[22px] border border-[var(--border)] object-cover')} />
  ) : (
    <span className={cx(cls, 'flex items-center justify-center rounded-[22px] bg-[var(--accent-soft)] font-semibold text-[var(--accent)]')}>{initials}</span>
  );
}

const btnPrimary =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 text-[14px] font-semibold text-[var(--accent-fg)] shadow-sm transition-[filter,transform] hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60';
const btnSecondary =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-5 text-[14px] font-semibold text-[var(--text-body)] transition-colors hover:bg-[var(--bg-card-alt)] disabled:cursor-not-allowed disabled:opacity-60';
const btnGhost = 'inline-flex h-10 items-center justify-center gap-2 rounded-full px-3 text-[13px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-card-alt)] hover:text-[var(--text-heading)]';

/* ------------------------------------------------------------------ */
/* Componente                                                          */
/* ------------------------------------------------------------------ */

interface StudentEnrollmentWizardProps {
  onClose: () => void;
  onSuccess?: () => void;
  schoolsList?: { id: string; name: string }[];
}

type LogStatus = 'pending' | 'running' | 'success' | 'failed';

export function StudentEnrollmentWizard({ onClose, onSuccess }: StudentEnrollmentWizardProps) {
  const { currentUser } = usePlatform();
  const organizationId = currentUser?.organizationId || '11111111-1111-1111-1111-111111111111';

  const [step, setStep] = useState<number>(1);
  const [formData, setFormData] = useState<EnrollmentFormState>(initialFormState);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);

  const [dbClasses, setDbClasses] = useState<{ id: string; name: string; shift?: string; room?: string }[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  const [cepLoading, setCepLoading] = useState(false);
  const [cepStatus, setCepStatus] = useState<'ok' | 'notfound' | null>(null);

  const [executionLog, setExecutionLog] = useState<{ step: number; label: string; status: LogStatus }[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionSuccess, setExecutionSuccess] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdRegCode, setCreatedRegCode] = useState<string>('');

  const update = <K extends keyof EnrollmentFormState>(key: K, value: EnrollmentFormState[K]) => setFormData((prev) => ({ ...prev, [key]: value }));

  const flash = (msg: string) => {
    setDraftMessage(msg);
    window.setTimeout(() => setDraftMessage(null), 3500);
  };

  // Esc fecha (menos durante a gravação)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isExecuting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isExecuting, onClose]);

  // Rascunho + ano letivo + turmas
  useEffect(() => {
    let cancelled = false;
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData({ ...initialFormState, ...parsed, guardians: parsed.guardians?.length ? parsed.guardians : initialFormState.guardians });
        flash('Rascunho anterior carregado.');
      } catch {
        localStorage.removeItem(DRAFT_KEY);
      }
    }

    (async () => {
      const [{ data: years }, { data: classes }] = await Promise.all([
        supabase.from('academic_years').select('id,name,is_current').eq('organization_id', organizationId),
        supabase.from('classes').select('id,name,shift,room').eq('organization_id', organizationId).eq('is_active', true).order('name'),
      ]);
      if (cancelled) return;

      const year = years?.find((y: any) => y.is_current) ?? years?.[0];
      if (year?.name) setFormData((prev) => ({ ...prev, academicYear: year.name }));

      const list = (classes as any[]) || [];
      setDbClasses(list);
      setClassesLoading(false);
      // não pré-seleciona turma: evita matricular na turma errada sem perceber
      setSelectedClassId('');
    })();

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  const handleFetchCep = async (cepInput: string) => {
    const cleanCep = cepInput.replace(/\D/g, '');
    if (cleanCep.length !== 8 || cepLoading) return;
    setCepLoading(true);
    setCepStatus(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepStatus('notfound');
      } else {
        setFormData((prev) => ({
          ...prev,
          addressStreet: data.logradouro || prev.addressStreet,
          addressNeighborhood: data.bairro || prev.addressNeighborhood,
          addressCity: data.localidade || prev.addressCity,
          addressState: data.uf || prev.addressState,
        }));
        setCepStatus('ok');
      }
    } catch {
      setCepStatus('notfound');
    } finally {
      setCepLoading(false);
    }
  };

  const handleSaveDraft = () => {
    setIsSavingDraft(true);
    localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    window.setTimeout(() => {
      setIsSavingDraft(false);
      flash('Rascunho salvo neste navegador.');
    }, 400);
  };

  const handleClearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setFormData((prev) => ({ ...initialFormState, academicYear: prev.academicYear }));
    setValidationErrors({});
    setStep(1);
    flash('Formulário limpo.');
  };

  const isValidCPF = (cpf: string): boolean => {
    const c = cpf.replace(/\D/g, '');
    if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
    let sum = 0;
    for (let i = 1; i <= 9; i++) sum += parseInt(c.substring(i - 1, i)) * (11 - i);
    let rem = (sum * 10) % 11;
    if (rem === 10 || rem === 11) rem = 0;
    if (rem !== parseInt(c.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum += parseInt(c.substring(i - 1, i)) * (12 - i);
    rem = (sum * 10) % 11;
    if (rem === 10 || rem === 11) rem = 0;
    return rem === parseInt(c.substring(10, 11));
  };

  const validateStep = (currentStep: number): boolean => {
    const errors: Record<string, string> = {};
    if (currentStep === 1) {
      if (!formData.studentName.trim()) errors.studentName = 'Informe o nome completo.';
      if (formData.studentCpf && !isValidCPF(formData.studentCpf)) errors.studentCpf = 'CPF inválido.';
      if (!formData.studentBirthDate.trim()) errors.studentBirthDate = 'Informe a data de nascimento.';
      else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(formData.studentBirthDate)) errors.studentBirthDate = 'Use o formato DD/MM/AAAA.';
    }
    if (currentStep === 2) {
      if (formData.guardians.length === 0) errors.guardians = 'Cadastre pelo menos um responsável.';
      formData.guardians.forEach((g, idx) => {
        if (!g.name.trim()) errors[`guardian_${idx}_name`] = 'Informe o nome.';
        if (!g.cpf.trim()) errors[`guardian_${idx}_cpf`] = 'Informe o CPF.';
        else if (!isValidCPF(g.cpf)) errors[`guardian_${idx}_cpf`] = 'CPF inválido.';
        if (!g.email.trim()) errors[`guardian_${idx}_email`] = 'Informe o e-mail.';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email)) errors[`guardian_${idx}_email`] = 'E-mail inválido.';
        if (g.phone.replace(/\D/g, '').length < 10) errors[`guardian_${idx}_phone`] = 'Informe o celular com DDD.';
      });
      if (!formData.guardians.some((g) => g.isFinancial)) errors.financial = 'Marque quem é o responsável financeiro.';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const goTo = (target: number) => {
    // só avança se as etapas anteriores estiverem válidas
    if (target > step) {
      for (let s = step; s < target; s++) {
        if (!validateStep(s)) {
          setStep(s);
          return;
        }
      }
    }
    setValidationErrors({});
    setStep(target);
  };

  const handleGuardianChange = (index: number, field: keyof GuardianInput, value: any) => {
    setFormData((prev) => {
      const updated = prev.guardians.map((g, i) => {
        if (field === 'isFinancial') return { ...g, isFinancial: value ? i === index : i === index ? false : g.isFinancial };
        return i === index ? { ...g, [field]: value } : g;
      });
      return { ...prev, guardians: updated };
    });
  };

  const addGuardian = () =>
    setFormData((prev) => ({ ...prev, guardians: [...prev.guardians, { name: '', cpf: '', email: '', phone: '', relationship: 'Pai', isFinancial: false }] }));

  const removeGuardian = (index: number) =>
    setFormData((prev) => {
      if (prev.guardians.length === 1) return prev;
      const updated = prev.guardians.filter((_, i) => i !== index);
      if (!updated.some((g) => g.isFinancial)) updated[0] = { ...updated[0], isFinancial: true };
      return { ...prev, guardians: updated };
    });

  const selectedClass = useMemo(() => dbClasses.find((c) => c.id === selectedClassId) || null, [dbClasses, selectedClassId]);

  /* ---------------- gravação (mesma sequência de antes, com rollback completo) ---------------- */
  const executeEnrollmentTransaction = async () => {
    setIsExecuting(true);
    setExecutionSuccess(null);
    setErrorMessage(null);

    setExecutionLog([
      { step: 1, label: 'Conferindo os dados', status: 'running' },
      { step: 2, label: 'Salvando responsáveis', status: 'pending' },
      { step: 3, label: 'Salvando o estudante', status: 'pending' },
      { step: 4, label: 'Vinculando responsáveis ao estudante', status: 'pending' },
      { step: 5, label: 'Colocando na turma', status: 'pending' },
      { step: 6, label: 'Atualizando as outras telas', status: 'pending' },
    ]);
    const advance = (done: number, label?: string) =>
      setExecutionLog((prev) =>
        prev.map((l) => (l.step === done ? { ...l, status: 'success', label: label || l.label } : l.step === done + 1 ? { ...l, status: 'running' } : l)),
      );

    const createdGuardians: string[] = [];
    let createdStudentId: string | null = null;
    const created = { srl: [] as string[], fl: [] as string[], cs: [] as string[] };

    try {
      const primaryGuardian = formData.guardians[0];
      if (!primaryGuardian?.name.trim()) throw new Error('Os dados do responsável são obrigatórios.');

      const birthDate = formData.studentBirthDate.includes('/') ? formData.studentBirthDate.split('/').reverse().join('-') : formData.studentBirthDate || null;
      advance(1);

      // 2. Responsáveis — reaproveita quem já existe (CPF com ou sem máscara, na mesma escola)
      const guardianRecords: { id: string; name: string; relationship: string; isPrimary: boolean; isFinancial: boolean }[] = [];
      for (const [idx, g] of formData.guardians.entries()) {
        const gName = g.name.trim();
        if (!gName) continue;
        const cpfDigits = g.cpf.replace(/\D/g, '');
        let gId: string | null = null;

        if (cpfDigits) {
          const { data: existing } = await supabase
            .from('guardians')
            .select('id')
            .eq('organization_id', organizationId)
            .or(`cpf.eq.${cpfDigits},cpf.eq.${maskCPF(cpfDigits)}`)
            .limit(1);
          if (existing && existing.length > 0) gId = existing[0].id;
        }

        if (!gId) {
          gId = generateUUID();
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
            status: 'active',
          });
          if (gErr) throw new Error(`Não foi possível salvar o responsável ${gName}: ${gErr.message}`);
          createdGuardians.push(gId);
        }

        guardianRecords.push({ id: gId, name: gName, relationship: g.relationship || 'Responsável', isPrimary: idx === 0, isFinancial: !!g.isFinancial });
      }
      advance(2, `${guardianRecords.length} responsável(is) salvo(s)`);

      // 3. Estudante
      const newStudentId = generateUUID();
      createdStudentId = newStudentId;
      const regCode = `RA-${(formData.academicYear || '2026').replace(/\D/g, '').slice(0, 4) || '2026'}-${Math.floor(1000 + Math.random() * 9000)}`;
      const className = selectedClass ? selectedClass.name : 'Sem Turma';
      const classShift = selectedClass?.shift || formData.shift;

      const studentPayload: any = {
        id: newStudentId,
        organization_id: organizationId,
        school_id: organizationId,
        full_name: formData.studentName.trim(),
        name: formData.studentName.trim(),
        registration_code: regCode,
        birth_date: birthDate,
        cpf: formData.studentCpf ? formData.studentCpf.replace(/\D/g, '') : null,
        sex: formData.studentSex || 'M',
        gender: formData.studentSex || 'M',
        status: 'Matriculado',
        class_id: selectedClass ? selectedClass.id : null,
        address: formData.addressStreet ? [formData.addressStreet, formData.addressNumber, formData.addressComplement].filter(Boolean).join(', ') : null,
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
        guardian_cpf: primaryGuardian.cpf,
      };
      if (formData.studentPhotoUrl.trim()) studentPayload.avatar_url = formData.studentPhotoUrl.trim();

      let { error: stErr } = await supabase.from('students').insert(studentPayload);
      if (stErr && /avatar_url/.test(stErr.message)) {
        delete studentPayload.avatar_url; // coluna opcional
        ({ error: stErr } = await supabase.from('students').insert(studentPayload));
      }
      if (stErr) throw new Error(`Não foi possível salvar o estudante: ${stErr.message}`);
      advance(3);

      // 4. Vínculos
      for (const g of guardianRecords) {
        const srlId = generateUUID();
        const { error: srlErr } = await supabase.from('student_responsible_links').insert({
          id: srlId,
          organization_id: organizationId,
          student_id: newStudentId,
          guardian_id: g.id,
          guardian_name: g.name,
          relationship: g.relationship,
          is_primary_contact: g.isPrimary,
          is_financial_responsible: g.isFinancial,
          is_pedagogical_responsible: true,
          can_pickup: true,
        });
        if (srlErr) throw new Error(`Erro ao vincular responsável: ${srlErr.message}`);
        created.srl.push(srlId);

        const flId = generateUUID();
        const { error: flErr } = await supabase.from('family_links').insert({ id: flId, organization_id: organizationId, student_id: newStudentId, guardian_id: g.id });
        if (flErr) throw new Error(`Erro ao criar vínculo familiar: ${flErr.message}`);
        created.fl.push(flId);
      }
      advance(4);

      // 5. Turma
      if (selectedClass) {
        const csId = generateUUID();
        const { error: csErr } = await supabase
          .from('class_students')
          .insert([{ id: csId, organization_id: organizationId, class_id: selectedClass.id, student_id: newStudentId, status: 'active' }]);
        if (csErr) throw new Error(`Erro ao colocar na turma: ${csErr.message}`);
        created.cs.push(csId);
        advance(5, `Na turma ${selectedClass.name}`);
      } else {
        advance(5, 'Sem turma por enquanto');
      }

      // 6. Sincronização do serviço. O estudante já está salvo: se esta etapa falhar,
      // não desfazemos a matrícula — só registramos o aviso.
      try {
        await studentsService.createStudent({
          ...studentPayload,
          class_name: className,
          shift: classShift || 'Matutino',
          academic_year: formData.academicYear || '2026',
          guardians: formData.guardians.map((g, i) => ({
            full_name: g.name,
            name: g.name,
            relationship: g.relationship,
            phone: g.phone,
            email: g.email,
            document_number: g.cpf,
            cpf: g.cpf,
            is_primary: i === 0,
            is_financial: !!g.isFinancial,
          })),
        });
      } catch (syncErr) {
        console.warn('[Matrícula] studentsService.createStudent falhou (estudante já salvo):', syncErr);
      }

      window.dispatchEvent(new CustomEvent('classium_students_updated'));
      window.dispatchEvent(new CustomEvent('classium_school_updated'));
      advance(6, 'Tudo atualizado');

      setCreatedRegCode(regCode);
      setExecutionSuccess(true);
      localStorage.removeItem(DRAFT_KEY);
    } catch (err: any) {
      console.error('[Matrícula] falhou:', err);
      // Desfaz o que foi criado nesta tentativa, na ordem inversa
      try {
        if (created.cs.length) await supabase.from('class_students').delete().in('id', created.cs);
        if (created.fl.length) await supabase.from('family_links').delete().in('id', created.fl);
        if (created.srl.length) await supabase.from('student_responsible_links').delete().in('id', created.srl);
        if (createdStudentId) await supabase.from('students').delete().eq('id', createdStudentId);
        if (createdGuardians.length) await supabase.from('guardians').delete().in('id', createdGuardians);
      } catch (rollbackErr) {
        console.warn('[Matrícula] rollback parcial:', rollbackErr);
      }
      setExecutionLog((prev) => prev.map((l) => (l.status === 'running' ? { ...l, status: 'failed' } : l)));
      setExecutionSuccess(false);
      setErrorMessage(err?.message || 'Não foi possível concluir a matrícula.');
    } finally {
      setIsExecuting(false);
    }
  };

  const doneCount = executionLog.filter((l) => l.status === 'success').length;
  const progress = executionLog.length ? Math.round((doneCount / executionLog.length) * 100) : 0;

  /* ------------------------------------------------------------------ */

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[rgba(16,24,40,0.45)] p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="enroll-title">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: EASE }}
        className="my-auto flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)] shadow-[0_32px_80px_-32px_rgba(16,24,40,0.45)]"
      >
        {/* Cabeçalho */}
        <header className="relative shrink-0 border-b border-[var(--border)] px-5 pb-4 pt-5 sm:px-7">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: 'linear-gradient(to right, var(--accent-soft) 1px, transparent 1px), linear-gradient(to bottom, var(--accent-soft) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
              maskImage: 'radial-gradient(ellipse 55% 90% at 100% 0%, black, transparent)',
              WebkitMaskImage: 'radial-gradient(ellipse 55% 90% at 100% 0%, black, transparent)',
            }}
          />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-[0_12px_24px_-14px_rgba(16,24,40,0.6)]" style={{ background: 'var(--sidebar-bg)', color: 'var(--sidebar-fg)' }}>
                <GraduationCap className="h-5 w-5" />
              </span>
              <div>
                <h2 id="enroll-title" className="font-serif text-[22px] font-semibold leading-tight tracking-[-0.015em] text-[var(--text-heading)]">
                  Nova matrícula
                </h2>
                <p className="mt-0.5 text-[14px] text-[var(--text-muted)]">Cadastre o estudante, os responsáveis e a turma em 4 passos.</p>
              </div>
            </div>
            <button type="button" onClick={onClose} disabled={isExecuting} aria-label="Fechar" className="rounded-full p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-card-alt)] hover:text-[var(--text-heading)] disabled:opacity-40">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Passos */}
          {step < 5 && (
            <ol className="relative mt-5 grid grid-cols-4 gap-1.5 rounded-[20px] bg-[var(--bg-card-alt)] p-1">
              {STEPS.map((s) => {
                const Icon = s.icon;
                const done = step > s.number;
                const active = step === s.number;
                return (
                  <li key={s.number}>
                    <button
                      type="button"
                      onClick={() => goTo(s.number)}
                      aria-current={active ? 'step' : undefined}
                      className={cx(
                        'flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2 text-left transition-colors sm:px-3',
                        active ? 'bg-[var(--bg-card)] shadow-sm' : 'hover:bg-[var(--bg-card)]/60',
                      )}
                    >
                      <span
                        className={cx(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold',
                          done ? 'bg-[#067647] text-white' : active ? 'bg-[var(--accent)] text-[var(--accent-fg)]' : 'border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)]',
                        )}
                      >
                        {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Icon className="h-3.5 w-3.5" />}
                      </span>
                      <span className="hidden min-w-0 sm:block">
                        <span className={cx('block truncate text-[13px] font-semibold', active ? 'text-[var(--text-heading)]' : 'text-[var(--text-body)]')}>{s.label}</span>
                        <span className="hidden truncate text-[11px] text-[var(--text-muted)] lg:block">{s.hint}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </header>

        <AnimatePresence>
          {draftMessage && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="shrink-0 overflow-hidden">
              <p className="flex items-center justify-center gap-2 border-b border-[var(--border)] bg-[var(--accent-soft)] px-6 py-2 text-[13px] font-medium text-[var(--accent)]">
                <Info className="h-4 w-4" />
                {draftMessage}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto bg-[var(--bg-card-alt)] px-4 py-5 text-left sm:px-7 sm:py-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18, ease: EASE }} className="space-y-4">
              {/* PASSO 1 */}
              {step === 1 && (
                <>
                  <Section icon={User} title="Dados do estudante" subtitle="O CPF é opcional; se for digitado, é conferido.">
                    <div className="grid gap-5 md:grid-cols-[160px_1fr]">
                      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-card-alt)] p-4">
                        <Avatar name={formData.studentName} url={formData.studentPhotoUrl} />
                        <input
                          type="url"
                          value={formData.studentPhotoUrl}
                          onChange={(e) => update('studentPhotoUrl', e.target.value)}
                          placeholder="Link da foto (opcional)"
                          aria-label="Link da foto do estudante"
                          className={cx(inputCls, 'h-9 text-center text-[12px]')}
                        />
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Field label="Nome completo *">
                            {(id) => (
                              <input
                                id={id}
                                type="text"
                                autoFocus
                                value={formData.studentName}
                                onChange={(e) => update('studentName', e.target.value)}
                                placeholder="Ex.: Pedro Henrique de Souza"
                                aria-invalid={!!validationErrors.studentName}
                                className={cx(inputCls, validationErrors.studentName && 'border-[#F04438]')}
                              />
                            )}
                          </Field>
                          <ErrorText>{validationErrors.studentName}</ErrorText>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3">
                          <div>
                            <Field label="Data de nascimento *">
                              {(id) => (
                                <input
                                  id={id}
                                  type="text"
                                  inputMode="numeric"
                                  value={formData.studentBirthDate}
                                  onChange={(e) => update('studentBirthDate', maskDate(e.target.value))}
                                  placeholder="DD/MM/AAAA"
                                  aria-invalid={!!validationErrors.studentBirthDate}
                                  className={cx(inputCls, 'tabular-nums', validationErrors.studentBirthDate && 'border-[#F04438]')}
                                />
                              )}
                            </Field>
                            <ErrorText>{validationErrors.studentBirthDate}</ErrorText>
                          </div>
                          <div>
                            <Field label="CPF (opcional)">
                              {(id) => (
                                <input
                                  id={id}
                                  type="text"
                                  inputMode="numeric"
                                  value={formData.studentCpf}
                                  onChange={(e) => update('studentCpf', maskCPF(e.target.value))}
                                  placeholder="000.000.000-00"
                                  aria-invalid={!!validationErrors.studentCpf}
                                  className={cx(inputCls, 'tabular-nums', validationErrors.studentCpf && 'border-[#F04438]')}
                                />
                              )}
                            </Field>
                            <ErrorText>{validationErrors.studentCpf}</ErrorText>
                          </div>
                          <Field label="Sexo">
                            {(id) => (
                              <select id={id} value={formData.studentSex} onChange={(e) => update('studentSex', e.target.value as 'M' | 'F')} className={inputCls}>
                                <option value="M">Masculino</option>
                                <option value="F">Feminino</option>
                              </select>
                            )}
                          </Field>
                        </div>
                      </div>
                    </div>
                  </Section>

                  <Section icon={HeartPulse} title="Saúde e inclusão" subtitle="Aparece para a equipe e para a cozinha (alergias).">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <SwitchRow label="Atendimento Educacional Especializado (AEE)" checked={formData.studentAee} onChange={(v) => update('studentAee', v)} />
                      <SwitchRow label="Possui laudo médico" checked={formData.studentLaudo} onChange={(v) => update('studentLaudo', v)} />
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <Field label="Restrições alimentares">
                        {(id) => (
                          <input id={id} type="text" value={formData.studentDietaryInfo} onChange={(e) => update('studentDietaryInfo', e.target.value)} placeholder="Ex.: intolerância à lactose" className={inputCls} />
                        )}
                      </Field>
                      <Field label="Observações médicas e alergias">
                        {(id) => (
                          <input id={id} type="text" value={formData.studentMedicalNotes} onChange={(e) => update('studentMedicalNotes', e.target.value)} placeholder="Ex.: usa bombinha para asma" className={inputCls} />
                        )}
                      </Field>
                    </div>
                  </Section>

                  <Section
                    icon={MapPin}
                    title="Endereço"
                    subtitle="Digite o CEP para preencher o resto."
                    action={
                      cepLoading ? (
                        <Badge>
                          <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> Buscando
                        </Badge>
                      ) : cepStatus === 'ok' ? (
                        <OkPill>Endereço encontrado</OkPill>
                      ) : cepStatus === 'notfound' ? (
                        <Badge tone="warning">CEP não encontrado</Badge>
                      ) : null
                    }
                  >
                    <div className="grid gap-4 sm:grid-cols-[160px_1fr_120px]">
                      <Field label="CEP">
                        {(id) => (
                          <input
                            id={id}
                            type="text"
                            inputMode="numeric"
                            value={formData.addressCep}
                            onChange={(e) => {
                              const masked = maskCEP(e.target.value);
                              update('addressCep', masked);
                              if (masked.replace(/\D/g, '').length === 8) handleFetchCep(masked);
                            }}
                            placeholder="00000-000"
                            className={cx(inputCls, 'tabular-nums')}
                          />
                        )}
                      </Field>
                      <Field label="Rua">
                        {(id) => <input id={id} type="text" value={formData.addressStreet} onChange={(e) => update('addressStreet', e.target.value)} className={inputCls} />}
                      </Field>
                      <Field label="Número">
                        {(id) => <input id={id} type="text" value={formData.addressNumber} onChange={(e) => update('addressNumber', e.target.value)} className={inputCls} />}
                      </Field>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_1fr_90px]">
                      <Field label="Complemento">
                        {(id) => <input id={id} type="text" value={formData.addressComplement} onChange={(e) => update('addressComplement', e.target.value)} placeholder="Apto, bloco…" className={inputCls} />}
                      </Field>
                      <Field label="Bairro">
                        {(id) => <input id={id} type="text" value={formData.addressNeighborhood} onChange={(e) => update('addressNeighborhood', e.target.value)} className={inputCls} />}
                      </Field>
                      <Field label="Cidade">
                        {(id) => <input id={id} type="text" value={formData.addressCity} onChange={(e) => update('addressCity', e.target.value)} className={inputCls} />}
                      </Field>
                      <Field label="UF">
                        {(id) => (
                          <input id={id} type="text" maxLength={2} value={formData.addressState} onChange={(e) => update('addressState', e.target.value.toUpperCase())} className={cx(inputCls, 'text-center uppercase')} />
                        )}
                      </Field>
                    </div>
                  </Section>
                </>
              )}

              {/* PASSO 2 */}
              {step === 2 && (
                <>
                  {(validationErrors.financial || validationErrors.guardians) && <Alert tone="warning">{validationErrors.financial || validationErrors.guardians}</Alert>}

                  {formData.guardians.map((g, idx) => {
                    const err = (f: string) => validationErrors[`guardian_${idx}_${f}`];
                    return (
                      <Section
                        key={idx}
                        icon={Users}
                        title={g.name.trim() || `Responsável ${idx + 1}`}
                        subtitle={idx === 0 ? 'Contato principal: recebe os avisos e o acesso ao Portal da Família' : 'Responsável adicional'}
                        action={
                          <div className="flex items-center gap-2">
                            {g.isFinancial && <OkPill>Financeiro</OkPill>}
                            {formData.guardians.length > 1 && (
                              <button type="button" onClick={() => removeGuardian(idx)} aria-label={`Remover responsável ${idx + 1}`} className="rounded-full p-2 text-[var(--text-muted)] transition-colors hover:bg-[#FEF3F2] hover:text-[#B42318]">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        }
                      >
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          <div className="lg:col-span-2">
                            <Field label="Nome completo *">
                              {(id) => (
                                <input id={id} type="text" value={g.name} onChange={(e) => handleGuardianChange(idx, 'name', e.target.value)} placeholder="Ex.: Fernanda Alencar de Souza" aria-invalid={!!err('name')} className={cx(inputCls, err('name') && 'border-[#F04438]')} />
                              )}
                            </Field>
                            <ErrorText>{err('name')}</ErrorText>
                          </div>
                          <Field label="Parentesco">
                            {(id) => (
                              <select id={id} value={g.relationship} onChange={(e) => handleGuardianChange(idx, 'relationship', e.target.value)} className={inputCls}>
                                {RELATIONSHIPS.map((r) => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </select>
                            )}
                          </Field>
                          <div>
                            <Field label="CPF *">
                              {(id) => (
                                <input id={id} type="text" inputMode="numeric" value={g.cpf} onChange={(e) => handleGuardianChange(idx, 'cpf', maskCPF(e.target.value))} placeholder="000.000.000-00" aria-invalid={!!err('cpf')} className={cx(inputCls, 'tabular-nums', err('cpf') && 'border-[#F04438]')} />
                              )}
                            </Field>
                            <ErrorText>{err('cpf')}</ErrorText>
                          </div>
                          <div>
                            <Field label="Celular / WhatsApp *">
                              {(id) => (
                                <input id={id} type="tel" value={g.phone} onChange={(e) => handleGuardianChange(idx, 'phone', maskCellPhone(e.target.value))} placeholder="(82) 99999-0000" aria-invalid={!!err('phone')} className={cx(inputCls, 'tabular-nums', err('phone') && 'border-[#F04438]')} />
                              )}
                            </Field>
                            <ErrorText>{err('phone')}</ErrorText>
                          </div>
                          <div>
                            <Field label="E-mail * (login do portal)">
                              {(id) => (
                                <input id={id} type="email" value={g.email} onChange={(e) => handleGuardianChange(idx, 'email', e.target.value)} placeholder="nome@email.com" aria-invalid={!!err('email')} className={cx(inputCls, err('email') && 'border-[#F04438]')} />
                              )}
                            </Field>
                            <ErrorText>{err('email')}</ErrorText>
                          </div>
                        </div>
                        <div className="mt-4">
                          <SwitchRow label="Responsável financeiro" hint="Recebe boletos e avisos de mensalidade" checked={g.isFinancial} onChange={(v) => handleGuardianChange(idx, 'isFinancial', v)} />
                        </div>
                      </Section>
                    );
                  })}

                  <button type="button" onClick={addGuardian} className="flex w-full items-center justify-center gap-2 rounded-[22px] border border-dashed border-[var(--border)] bg-[var(--bg-card)] py-4 text-[14px] font-semibold text-[var(--accent)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]">
                    <Plus className="h-4 w-4" /> Adicionar outro responsável
                  </button>
                </>
              )}

              {/* PASSO 3 */}
              {step === 3 && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <Section icon={GraduationCap} title="Turma" subtitle="Se a turma ainda não existir, matricule agora e vincule depois.">
                    {!classesLoading && dbClasses.length === 0 && (
                      <div className="mb-4">
                        <Alert tone="info">Nenhuma turma cadastrada ainda. O estudante fica como “Sem turma” e você vincula depois na lista.</Alert>
                      </div>
                    )}
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Ano letivo">
                          {(id) => <input id={id} type="text" readOnly value={formData.academicYear || '2026'} className={cx(inputCls, 'cursor-not-allowed bg-[var(--bg-card-alt)] tabular-nums')} />}
                        </Field>
                        <Field label="Turno">
                          {(id) => (
                            <select id={id} value={selectedClass?.shift || formData.shift} disabled={!!selectedClass?.shift} onChange={(e) => update('shift', e.target.value as EnrollmentFormState['shift'])} className={inputCls}>
                              <option value="Matutino">Matutino</option>
                              <option value="Vespertino">Vespertino</option>
                              <option value="Integral">Integral</option>
                              <option value="Noturno">Noturno</option>
                            </select>
                          )}
                        </Field>
                      </div>

                      <div>
                        <p className="mb-2 text-[13px] font-medium text-[var(--text-body)]">Escolha a turma</p>
                        {classesLoading ? (
                          <div className="space-y-2">
                            {[0, 1, 2].map((i) => (
                              <div key={i} className="h-12 animate-pulse rounded-2xl bg-[var(--bg-card-alt)]" />
                            ))}
                          </div>
                        ) : (
                          <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                            {[{ id: '', name: NO_CLASS_LABEL, shift: '', room: '' }, ...dbClasses].map((c) => {
                              const active = selectedClassId === c.id;
                              return (
                                <button
                                  key={c.id || 'none'}
                                  type="button"
                                  onClick={() => {
                                    setSelectedClassId(c.id);
                                    setFormData((prev) => ({ ...prev, grade: c.id ? c.name : '', shift: ((c.shift as any) || prev.shift) as EnrollmentFormState['shift'] }));
                                  }}
                                  aria-pressed={active}
                                  className={cx(
                                    'flex w-full items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-colors',
                                    active ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-alt)]',
                                  )}
                                >
                                  <span className="min-w-0">
                                    <span className={cx('block truncate text-[14px] font-semibold', c.id ? 'text-[var(--text-heading)]' : 'text-[var(--text-muted)]')}>{c.name}</span>
                                    {c.id && <span className="block truncate text-[12px] text-[var(--text-muted)]">{[c.shift, c.room].filter(Boolean).join(' · ') || 'Turno não informado'}</span>}
                                  </span>
                                  {active && <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--accent)]" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </Section>

                  <Section icon={BookOpen} title="Serviços" subtitle="Liberados junto com a matrícula.">
                    <div className="space-y-2.5">
                      <div className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card-alt)] px-3.5 py-3">
                        <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                        <div>
                          <p className="text-[13px] font-semibold text-[var(--text-heading)]">Biblioteca</p>
                          <p className="text-[12px] text-[var(--text-muted)]">Cartão de leitor com até 3 empréstimos.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card-alt)] px-3.5 py-3">
                        <Utensils className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                        <div>
                          <p className="text-[13px] font-semibold text-[var(--text-heading)]">Alimentação</p>
                          <p className="text-[12px] text-[var(--text-muted)]">As alergias informadas vão para a cozinha.</p>
                        </div>
                      </div>
                      <SwitchRow icon={Truck} label="Usa transporte escolar" hint="O aluno aparece no menu Transporte para alocar na rota" checked={formData.transportRequired} onChange={(v) => update('transportRequired', v)} />
                    </div>
                  </Section>
                </div>
              )}

              {/* PASSO 4 */}
              {step === 4 && (
                <>
                  <div className="flex items-center gap-4 rounded-[22px] border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:p-5">
                    <Avatar name={formData.studentName} url={formData.studentPhotoUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif text-[20px] font-semibold text-[var(--text-heading)]">{formData.studentName || 'Sem nome'}</p>
                      <p className="text-[13px] text-[var(--text-muted)]">
                        {formData.studentBirthDate || '—'} · {selectedClass ? selectedClass.name : 'Sem turma'} · {selectedClass?.shift || formData.shift}
                      </p>
                    </div>
                    <Badge tone="accent">Ano {formData.academicYear || '2026'}</Badge>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <Section icon={User} title="Estudante" action={<button type="button" onClick={() => goTo(1)} className={btnGhost}>Editar</button>}>
                      <dl className="divide-y divide-[var(--border)]">
                        <SummaryRow label="CPF" value={formData.studentCpf || 'Não informado'} tone={formData.studentCpf ? undefined : 'muted'} />
                        <SummaryRow label="Sexo" value={formData.studentSex === 'M' ? 'Masculino' : 'Feminino'} />
                        <SummaryRow label="AEE" value={formData.studentAee ? 'Sim' : 'Não'} tone={formData.studentAee ? 'ok' : 'muted'} />
                        <SummaryRow label="Laudo" value={formData.studentLaudo ? 'Sim' : 'Não'} tone={formData.studentLaudo ? 'ok' : 'muted'} />
                        <SummaryRow label="Alimentação" value={formData.studentDietaryInfo || 'Sem restrição'} tone={formData.studentDietaryInfo ? undefined : 'muted'} />
                        <SummaryRow
                          label="Endereço"
                          value={formData.addressStreet ? `${formData.addressStreet}, ${formData.addressNumber || 's/n'} — ${formData.addressCity || ''}/${formData.addressState || ''}` : 'Não informado'}
                          tone={formData.addressStreet ? undefined : 'muted'}
                        />
                      </dl>
                    </Section>

                    <Section icon={Users} title="Responsáveis" action={<button type="button" onClick={() => goTo(2)} className={btnGhost}>Editar</button>}>
                      <ul className="space-y-2.5">
                        {formData.guardians.map((g, idx) => (
                          <li key={idx} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-alt)] p-3">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[14px] font-semibold text-[var(--text-heading)]">{g.name}</p>
                              <Badge>{g.relationship}</Badge>
                            </div>
                            <p className="mt-1 text-[12px] tabular-nums text-[var(--text-muted)]">
                              {g.phone} · {g.email}
                            </p>
                            {g.isFinancial && <p className="mt-1 text-[12px] font-medium text-[#067647]">Responsável financeiro</p>}
                          </li>
                        ))}
                      </ul>
                    </Section>

                    <Section icon={GraduationCap} title="Turma e serviços" action={<button type="button" onClick={() => goTo(3)} className={btnGhost}>Editar</button>}>
                      <dl className="divide-y divide-[var(--border)]">
                        <SummaryRow label="Turma" value={selectedClass ? selectedClass.name : 'Sem turma'} tone={selectedClass ? undefined : 'muted'} />
                        <SummaryRow label="Turno" value={selectedClass?.shift || formData.shift} />
                        <SummaryRow label="Ano letivo" value={formData.academicYear || '2026'} />
                        <SummaryRow label="Transporte" value={formData.transportRequired ? 'Sim' : 'Não'} tone={formData.transportRequired ? 'ok' : 'muted'} />
                      </dl>
                    </Section>
                  </div>

                  <Alert tone="info">Ao confirmar, o estudante é matriculado e os responsáveis passam a receber os comunicados da escola.</Alert>
                </>
              )}

              {/* PASSO 5: gravação */}
              {step === 5 && (
                <div className="mx-auto max-w-xl py-4">
                  {executionSuccess === null && (
                    <div className="rounded-[22px] border border-[var(--border)] bg-[var(--bg-card)] p-6">
                      <div className="flex items-center gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
                        <div>
                          <p className="text-[16px] font-semibold text-[var(--text-heading)]">Matriculando {formData.studentName.split(' ')[0]}…</p>
                          <p className="text-[13px] text-[var(--text-muted)]">Não feche esta janela.</p>
                        </div>
                      </div>
                      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[var(--bg-card-alt)]">
                        <div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300" style={{ width: `${progress}%` }} />
                      </div>
                      <ol className="mt-5 space-y-2.5">
                        {executionLog.map((l) => (
                          <li key={l.step} className="flex items-center gap-3 text-[14px]">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                              {l.status === 'success' && <CheckCircle2 className="h-5 w-5 text-[#067647]" />}
                              {l.status === 'running' && <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />}
                              {l.status === 'pending' && <span className="h-2 w-2 rounded-full bg-[var(--border)]" />}
                              {l.status === 'failed' && <AlertCircle className="h-5 w-5 text-[#B42318]" />}
                            </span>
                            <span className={l.status === 'pending' ? 'text-[var(--text-muted)]' : 'text-[var(--text-heading)]'}>{l.label}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {executionSuccess === true && (
                    <div className="rounded-[22px] border border-[var(--border)] bg-[var(--bg-card)] p-6 text-center sm:p-8">
                      <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#ECFDF3] text-[#067647]">
                        <CheckCircle2 className="h-9 w-9" />
                      </motion.span>
                      <h3 className="mt-4 font-serif text-[22px] font-semibold text-[var(--text-heading)]">Matrícula concluída</h3>
                      <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-body)]">
                        <strong>{formData.studentName}</strong> foi matriculado(a) {selectedClass ? <>na turma <strong>{selectedClass.name}</strong>.</> : <>sem turma — vincule na lista de estudantes quando quiser.</>}
                      </p>
                      {createdRegCode && (
                        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--bg-card-alt)] px-3 py-1.5 text-[13px] text-[var(--text-muted)]">
                          Matrícula <strong className="tabular-nums text-[var(--text-heading)]">{createdRegCode}</strong>
                        </p>
                      )}
                      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                        <button
                          type="button"
                          className={btnSecondary}
                          onClick={() => {
                            setFormData((prev) => ({ ...initialFormState, academicYear: prev.academicYear }));
                            setSelectedClassId('');
                            setExecutionSuccess(null);
                            setExecutionLog([]);
                            setStep(1);
                          }}
                        >
                          <Plus className="h-4 w-4" /> Matricular outro
                        </button>
                        <button
                          type="button"
                          className={btnPrimary}
                          onClick={() => {
                            onClose();
                            onSuccess?.();
                          }}
                        >
                          Voltar para a lista
                        </button>
                      </div>
                    </div>
                  )}

                  {executionSuccess === false && (
                    <div className="rounded-[22px] border border-[#F5C2C0] bg-[var(--bg-card)] p-6 text-center sm:p-8">
                      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FEF3F2] text-[#B42318]">
                        <ShieldAlert className="h-8 w-8" />
                      </span>
                      <h3 className="mt-4 font-serif text-[22px] font-semibold text-[var(--text-heading)]">Não deu para concluir</h3>
                      <p className="mx-auto mt-3 max-w-md rounded-2xl bg-[#FEF3F2] p-3 text-left text-[13px] text-[#B42318]">{errorMessage}</p>
                      <p className="mt-3 text-[13px] text-[var(--text-muted)]">Nada ficou pela metade e o que você digitou continua aqui.</p>
                      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                        <button type="button" className={btnSecondary} onClick={() => setStep(4)}>
                          Revisar dados
                        </button>
                        <button type="button" className={btnPrimary} onClick={executeEnrollmentTransaction}>
                          <RefreshCw className="h-4 w-4" /> Tentar de novo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Rodapé */}
        {step < 5 && (
          <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-[var(--border)] bg-[var(--bg-card)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div className="flex items-center gap-1">
              <button type="button" onClick={handleSaveDraft} disabled={isSavingDraft} className={btnGhost}>
                {isSavingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar rascunho
              </button>
              <button type="button" onClick={handleClearDraft} className={btnGhost}>
                Limpar
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="mr-2 hidden text-[13px] tabular-nums text-[var(--text-muted)] md:inline">Passo {step} de 4</span>
              {step > 1 && (
                <button type="button" onClick={() => goTo(step - 1)} className={btnSecondary}>
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </button>
              )}
              {step < 4 ? (
                <button type="button" onClick={() => goTo(step + 1)} className={btnPrimary}>
                  Continuar <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setStep(5);
                    executeEnrollmentTransaction();
                  }}
                  className={cx(btnPrimary, 'bg-[#067647] text-white')}
                >
                  <Check className="h-4 w-4" /> Confirmar matrícula
                </button>
              )}
            </div>
          </footer>
        )}
      </motion.div>
    </div>
  );
}
