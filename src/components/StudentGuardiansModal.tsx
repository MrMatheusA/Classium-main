import { useCallback, useEffect, useState } from 'react';
import { Pencil, Phone, Plus, Trash2, UserRound, Users } from 'lucide-react';
import { Alert, Badge, Button, EmptyState, Field, Modal, Skeleton, Toggle, cx, inputCls } from '../components/ui/kit';
import { ConfirmModal } from '../components/ui/ModuleParts';
import { studentsService, type StudentGuardianLink } from '../services/students/students.service';
import { isValidCPF, maskCPF, maskCPFSecret, maskCellPhone } from '../utils/masks';

/*
 * Responsáveis do estudante.
 * Abre a partir da tela de Estudantes:
 *   <StudentGuardiansModal open={!!aluno} student={aluno} onClose={() => setAluno(null)} onChanged={recarregar} />
 *
 * O vínculo é gravado por uma função segura do banco, que:
 *   • reaproveita o responsável pelo CPF (irmãos ficam com o mesmo cadastro);
 *   • liga a conta do portal da família se já existir alguém com o mesmo CPF ou e-mail.
 */

const RELATIONSHIPS = ['Mãe', 'Pai', 'Avó', 'Avô', 'Tia', 'Tio', 'Irmã', 'Irmão', 'Madrasta', 'Padrasto', 'Responsável legal', 'Outro'];

interface StudentRef {
  id: string;
  name?: string;
  full_name?: string;
  class_name?: string;
}

interface FormState {
  guardianId?: string;
  fullName: string;
  relationship: string;
  cpf: string;
  phone: string;
  email: string;
  isPrimary: boolean;
  isFinancial: boolean;
  canPickup: boolean;
}

const EMPTY_FORM: FormState = {
  fullName: '',
  relationship: 'Mãe',
  cpf: '',
  phone: '',
  email: '',
  isPrimary: false,
  isFinancial: false,
  canPickup: true,
};

export function StudentGuardiansModal({
  open,
  student,
  onClose,
  onChanged,
}: {
  open: boolean;
  student: StudentRef | null;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [items, setItems] = useState<StudentGuardianLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'info'; text: string } | null>(null);

  const [toRemove, setToRemove] = useState<StudentGuardianLink | null>(null);
  const [removing, setRemoving] = useState(false);

  const studentName = student?.full_name || student?.name || 'Estudante';

  const load = useCallback(async () => {
    if (!student?.id) return;
    setLoading(true);
    setLoadError(null);
    const res = await studentsService.listGuardians(student.id);
    setItems(res.items);
    setLoadError(res.error);
    setLoading(false);
  }, [student?.id]);

  useEffect(() => {
    if (open) {
      setForm(null);
      setNotice(null);
      setFormError(null);
      load();
    }
  }, [open, load]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => (prev ? { ...prev, [key]: value } : prev));

  const startNew = () => {
    setNotice(null);
    setFormError(null);
    setForm({ ...EMPTY_FORM, isPrimary: items.length === 0, isFinancial: items.length === 0 });
  };

  const startEdit = (g: StudentGuardianLink) => {
    setNotice(null);
    setFormError(null);
    setForm({
      guardianId: g.guardian_id,
      fullName: g.full_name,
      relationship: g.relationship || 'Responsável legal',
      cpf: g.cpf ? maskCPF(g.cpf) : '',
      phone: g.phone ? maskCellPhone(g.phone) : '',
      email: g.email || '',
      isPrimary: g.is_primary_contact,
      isFinancial: g.is_financial_responsible,
      canPickup: g.can_pickup,
    });
  };

  const save = async () => {
    if (!student?.id || !form) return;
    setFormError(null);

    if (!form.fullName.trim()) return setFormError('Informe o nome do responsável.');
    const cpf = form.cpf.replace(/\D/g, '');
    if (cpf && !isValidCPF(cpf)) return setFormError('CPF inválido. Confira os números.');


    setSaving(true);
    const res = await studentsService.linkGuardian(student.id, {
      guardianId: form.guardianId,
      fullName: form.fullName,
      relationship: form.relationship,
      cpf,
      phone: form.phone,
      email: form.email,
      isPrimary: form.isPrimary,
      isFinancial: form.isFinancial,
      canPickup: form.canPickup,
    });
    setSaving(false);

    if (!res.success) return setFormError(res.error);

    setForm(null);
    setNotice(
      res.hasAppAccess
        ? { tone: 'success', text: `${form.fullName.trim()} foi vinculado e já vê ${studentName} no portal da família.` }
        : { tone: 'info', text: `${form.fullName.trim()} foi vinculado. Ainda não há conta no portal da família com este CPF ou e-mail.` }
    );
    await load();
    onChanged?.();
  };

  const confirmRemove = async () => {
    if (!student?.id || !toRemove) return;
    setRemoving(true);
    const res = await studentsService.unlinkGuardian(student.id, toRemove.guardian_id);
    setRemoving(false);
    if (!res.success) {
      setLoadError(res.error);
      setToRemove(null);
      return;
    }
    setNotice({ tone: 'success', text: `${toRemove.full_name} não é mais responsável por ${studentName}.` });
    setToRemove(null);
    await load();
    onChanged?.();
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="lg"
        icon={<Users className="h-5 w-5" />}
        title="Responsáveis"
        subtitle={student?.class_name ? `${studentName} · ${student.class_name}` : studentName}
        footer={
          form ? (
            <>
              <Button variant="ghost" onClick={() => setForm(null)} disabled={saving}>Cancelar</Button>
              <Button onClick={save} loading={saving}>{form.guardianId ? 'Salvar alterações' : 'Vincular responsável'}</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose}>Fechar</Button>
              <Button icon={Plus} onClick={startNew} disabled={loading}>Adicionar responsável</Button>
            </>
          )
        }
      >
        <div className="space-y-4">
          {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
          {loadError && <Alert tone="danger">{loadError}</Alert>}

          {form ? (
            <div className="space-y-4">
              {formError && <Alert tone="danger">{formError}</Alert>}

              <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
                <Field label="Nome completo">
                  {id => (
                    <input
                      id={id}
                      className={inputCls}
                      value={form.fullName}
                      onChange={e => set('fullName', e.target.value)}
                      autoComplete="name"
                      autoFocus
                    />
                  )}
                </Field>
                <Field label="Parentesco">
                  {id => (
                    <select id={id} className={cx(inputCls, 'h-10 py-0')} value={form.relationship} onChange={e => set('relationship', e.target.value)}>
                      {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  )}
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="CPF" hint="Opcional. Com o CPF, a família encontra o estudante ao criar a conta no portal">
                  {id => (
                    <input
                      id={id}
                      className={inputCls}
                      inputMode="numeric"
                      placeholder="000.000.000-00"
                      value={form.cpf}
                      onChange={e => set('cpf', maskCPF(e.target.value))}
                    />
                  )}
                </Field>
                <Field label="Celular">
                  {id => (
                    <input
                      id={id}
                      className={inputCls}
                      inputMode="tel"
                      placeholder="(00) 00000-0000"
                      value={form.phone}
                      onChange={e => set('phone', maskCellPhone(e.target.value))}
                      autoComplete="tel"
                    />
                  )}
                </Field>
                <Field label="E-mail">
                  {id => (
                    <input
                      id={id}
                      type="email"
                      className={inputCls}
                      value={form.email}
                      onChange={e => set('email', e.target.value)}
                      autoComplete="email"
                    />
                  )}
                </Field>
              </div>

              <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card-alt)] p-4 sm:grid-cols-3">
                <label className="flex cursor-pointer items-center gap-3"><Toggle checked={form.isPrimary} onChange={v => set('isPrimary', v)} label="Contato principal" /><span className="text-[14px] font-medium text-[var(--text-heading)]">Contato principal</span></label>
                <label className="flex cursor-pointer items-center gap-3"><Toggle checked={form.isFinancial} onChange={v => set('isFinancial', v)} label="Responsável financeiro" /><span className="text-[14px] font-medium text-[var(--text-heading)]">Responsável financeiro</span></label>
                <label className="flex cursor-pointer items-center gap-3"><Toggle checked={form.canPickup} onChange={v => set('canPickup', v)} label="Pode buscar na escola" /><span className="text-[14px] font-medium text-[var(--text-heading)]">Pode buscar na escola</span></label>
              </div>
            </div>
          ) : loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={UserRound}
              title="Nenhum responsável vinculado"
              text="Sem responsável, a família não vê este estudante no portal e não recebe comunicados."
              action={<Button icon={Plus} onClick={startNew}>Adicionar responsável</Button>}
            />
          ) : (
            <ul className="space-y-3">
              {items.map(g => (
                <li
                  key={g.guardian_id}
                  className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[15px] font-semibold text-[var(--text-heading)]">{g.full_name || 'Sem nome'}</p>
                      {g.relationship && <span className="text-[13px] text-[var(--text-muted)]">{g.relationship}</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--text-body)]">
                      {g.phone && (
                        <a href={`tel:${g.phone.replace(/\D/g, '')}`} className="inline-flex items-center gap-1 hover:text-[var(--accent)]">
                          <Phone className="h-3.5 w-3.5" aria-hidden /> {maskCellPhone(g.phone)}
                        </a>
                      )}
                      {g.cpf && <span className="tabular-nums">CPF {maskCPFSecret(g.cpf)}</span>}
                      {g.email && <span className="truncate">{g.email}</span>}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {g.is_primary_contact && <Badge tone="accent">Contato principal</Badge>}
                      {g.is_financial_responsible && <Badge>Financeiro</Badge>}
                      {g.can_pickup ? <Badge tone="success">Pode buscar</Badge> : <Badge tone="warning">Não pode buscar</Badge>}
                      {g.has_app_access ? <Badge tone="success">Usa o portal</Badge> : <Badge>Sem conta no portal</Badge>}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="secondary" size="sm" icon={Pencil} onClick={() => startEdit(g)}>Editar</Button>
                    <Button variant="danger" size="sm" icon={Trash2} onClick={() => setToRemove(g)} aria-label={`Remover ${g.full_name}`}>
                      Remover
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <ConfirmModal
        open={!!toRemove}
        onClose={() => setToRemove(null)}
        onConfirm={confirmRemove}
        loading={removing}
        title="Remover responsável?"
        confirmLabel="Remover vínculo"
      >
        {toRemove && (
          <p>
            {toRemove.full_name} deixa de ver {studentName} no portal e de receber comunicados sobre este estudante.
            O cadastro dele continua, caso seja responsável por outro estudante.
          </p>
        )}
      </ConfirmModal>
    </>
  );
}

export default StudentGuardiansModal;