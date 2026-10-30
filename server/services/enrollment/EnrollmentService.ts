import { SupabaseClient } from '@supabase/supabase-js';

export interface EnrollmentPayload {
  studentData: {
    fullName: string;
    cpf?: string;
    birthDate: string;
    gender?: string;
    schoolId: string;
    registration: string;
    profileId?: string;
    email?: string;
  };
  guardianData: {
    fullName: string;
    cpf: string;
    email: string;
    phone: string;
    relationship: string;
    financialResponsible?: boolean;
    educationalResponsible?: boolean;
  };
  enrollmentData: {
    classId: string;
    academicYear: string;
    shift: string;
  };
}

export class EnrollmentService {
  private supabase: SupabaseClient;
  private transactionContext: any;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
    this.transactionContext = {};
  }

  /**
   * Main entry point for full student enrollment transaction
   */
  public async createFullEnrollment(payload: EnrollmentPayload): Promise<{ success: boolean; studentId?: string; error?: string }> {
    try {
      await this.validateData(payload);

      const guardianId = await this.findGuardian(payload.guardianData.cpf);
      const finalGuardianId = guardianId || (await this.createGuardian(payload.guardianData));

      const studentId = await this.createStudent(payload.studentData);
      await this.createEnrollment(studentId, payload.enrollmentData);
      await this.linkGuardian(
        studentId, 
        finalGuardianId, 
        payload.guardianData.relationship,
        payload.guardianData.financialResponsible ?? true,
        payload.guardianData.educationalResponsible ?? true
      );

      const familyAccount = await this.createFamilyAccount(
        { ...payload.guardianData, profileId: finalGuardianId },
        payload.studentData.schoolId
      );
      if (familyAccount) {
        await this.assignFamilyRole(finalGuardianId, payload.studentData.schoolId);
      }

      await this.registerAudit('ENROLLMENT_CREATED', { studentId, guardianId: finalGuardianId });
      await this.sendWelcomeNotification(payload.guardianData.email);

      await this.commit();
      return { success: true, studentId };
    } catch (error: any) {
      console.error('[EnrollmentService] Error during full enrollment transaction:', error);
      await this.rollback(error);
      return { success: false, error: error.message || 'Erro desconhecido na matrícula' };
    }
  }

  private async validateData(payload: EnrollmentPayload): Promise<void> {
    if (!payload || !payload.studentData || !payload.guardianData) {
      throw new Error('Dados de matrícula incompletos.');
    }

    const { guardianData, studentData } = payload;

    // Validate Guardian CPF
    if (!guardianData.cpf) {
      throw new Error('CPF do responsável é obrigatório.');
    }
    const cleanGuardianCpf = guardianData.cpf.replace(/\D/g, '');
    if (cleanGuardianCpf.length !== 11) {
      throw new Error('CPF do responsável inválido (deve conter 11 dígitos).');
    }
    guardianData.cpf = cleanGuardianCpf;

    // Validate Guardian Email
    if (!guardianData.email) {
      throw new Error('E-mail do responsável é obrigatório.');
    }
    const cleanEmail = guardianData.email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new Error('Formato de e-mail do responsável inválido.');
    }
    guardianData.email = cleanEmail;

    // Validate Guardian Name
    if (!guardianData.fullName) {
      throw new Error('Nome do responsável é obrigatório.');
    }
    const cleanGuardianName = guardianData.fullName.replace(/\s+/g, ' ').trim();
    if (cleanGuardianName.length < 5) {
      throw new Error('Nome do responsável deve ter no mínimo 5 caracteres.');
    }
    guardianData.fullName = cleanGuardianName;

    // Validate Student School ID
    if (!studentData.schoolId) {
      throw new Error('ID da escola (school_id) é obrigatório para o aluno.');
    }

    // Validate Student Registration (Matrícula)
    if (!studentData.registration) {
      throw new Error('Número de matrícula é obrigatório.');
    }
    studentData.registration = studentData.registration.trim();

    // Validate Student Name
    if (!studentData.fullName) {
      throw new Error('Nome do aluno é obrigatório.');
    }
    const cleanStudentName = studentData.fullName.replace(/\s+/g, ' ').trim();
    if (cleanStudentName.length < 5) {
      throw new Error('Nome do aluno deve ter no mínimo 5 caracteres.');
    }
    studentData.fullName = cleanStudentName;

    // Validate Student Birth Date
    if (!studentData.birthDate) {
      throw new Error('Data de nascimento do aluno é obrigatória.');
    }
    const birthDateObj = new Date(studentData.birthDate);
    if (isNaN(birthDateObj.getTime())) {
      throw new Error('Data de nascimento do aluno inválida.');
    }
    if (birthDateObj > new Date()) {
      throw new Error('Data de nascimento não pode ser no futuro.');
    }

    // Validate Student CPF (Optional)
    if (studentData.cpf) {
      const cleanStudentCpf = studentData.cpf.replace(/\D/g, '');
      if (cleanStudentCpf.length !== 11) {
        throw new Error('CPF do aluno inválido (deve conter 11 dígitos).');
      }
      studentData.cpf = cleanStudentCpf;
    }

    // Validate Student Email (Optional)
    if (studentData.email) {
      const cleanStudentEmail = studentData.email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanStudentEmail)) {
        throw new Error('Formato de e-mail do aluno inválido.');
      }
      studentData.email = cleanStudentEmail;
    }
  }

  private async findGuardian(cpf: string): Promise<string | null> {
    const cleanCpf = cpf.replace(/\D/g, '');
    const { data, error } = await this.supabase
      .from('guardians')
      .select('id')
      .eq('cpf', cleanCpf)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar responsável por CPF: ${error.message}`);
    }

    return data ? (data.id as string) : null;
  }

  private async createGuardian(guardianData: EnrollmentPayload['guardianData']): Promise<string> {
    const cleanCpf = guardianData.cpf.replace(/\D/g, '');
    
    // Check if guardian already exists by CPF to prevent duplicate key error
    const existingId = await this.findGuardian(cleanCpf);
    if (existingId) {
      return existingId;
    }

    const now = new Date().toISOString();
    const insertPayload = {
      full_name: guardianData.fullName,
      cpf: cleanCpf,
      email: guardianData.email,
      phone: guardianData.phone || '',
      active: true,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await this.supabase
      .from('guardians')
      .insert(insertPayload)
      .select('id')
      .single();

    if (error) {
      throw new Error(`Falha ao criar responsável: ${error.message}`);
    }

    if (!data || !data.id) {
      throw new Error('Responsável criado, mas ID não retornado.');
    }

    return data.id as string;
  }

  private async createStudent(studentData: EnrollmentPayload['studentData']): Promise<string> {
    // Check if student already exists by school_id + registration
    const { data: existingStudent, error: searchError } = await this.supabase
      .from('students')
      .select('id')
      .eq('school_id', studentData.schoolId)
      .eq('registration', studentData.registration)
      .maybeSingle();

    if (searchError) {
      throw new Error(`Erro ao verificar duplicidade de matrícula: ${searchError.message}`);
    }

    if (existingStudent) {
      throw new Error('Aluno já matriculado nesta escola.');
    }

    const now = new Date().toISOString();
    const insertPayload: Record<string, any> = {
      school_id: studentData.schoolId,
      registration: studentData.registration,
      full_name: studentData.fullName,
      birth_date: studentData.birthDate,
      gender: studentData.gender || null,
      active: true,
      created_at: now,
      updated_at: now,
    };

    if (studentData.cpf) {
      insertPayload.cpf = studentData.cpf;
    }

    if (studentData.email) {
      insertPayload.email = studentData.email;
    }

    if (studentData.profileId) {
      insertPayload.profile_id = studentData.profileId;
    }

    const { data, error } = await this.supabase
      .from('students')
      .insert(insertPayload)
      .select('id')
      .single();

    if (error) {
      throw new Error(`Falha ao cadastrar aluno: ${error.message}`);
    }

    if (!data || !data.id) {
      throw new Error('Aluno cadastrado, mas ID não retornado.');
    }

    return data.id as string;
  }

  private async createEnrollment(studentId: string, enrollmentData: EnrollmentPayload['enrollmentData']): Promise<void> {
    // TODO: Insert enrollment record linking student and class
  }

  private async linkGuardian(
    studentId: string, 
    guardianId: string, 
    relationship: string, 
    financialResponsible: boolean = true, 
    educationalResponsible: boolean = true
  ): Promise<{ student_id: string; guardian_id: string; relationship: string }> {
    if (!studentId) {
      throw new Error('ID do aluno é obrigatório para vincular responsável.');
    }
    if (!guardianId) {
      throw new Error('ID do responsável é obrigatório para vinculação.');
    }

    // Verify student exists
    const { data: studentCheck, error: studentError } = await this.supabase
      .from('students')
      .select('id')
      .eq('id', studentId)
      .maybeSingle();

    if (studentError) {
      throw new Error(`Erro ao verificar existência do aluno: ${studentError.message}`);
    }
    if (!studentCheck) {
      throw new Error('Aluno não encontrado para vinculação.');
    }

    // Verify guardian exists
    const { data: guardianCheck, error: guardianError } = await this.supabase
      .from('guardians')
      .select('id')
      .eq('id', guardianId)
      .maybeSingle();

    if (guardianError) {
      throw new Error(`Erro ao verificar existência do responsável: ${guardianError.message}`);
    }
    if (!guardianCheck) {
      throw new Error('Responsável não encontrado para vinculação.');
    }

    // Check if relationship already exists
    const { data: existingLink, error: linkSearchError } = await this.supabase
      .from('student_guardians')
      .select('student_id, guardian_id, relationship')
      .eq('student_id', studentId)
      .eq('guardian_id', guardianId)
      .maybeSingle();

    if (linkSearchError) {
      throw new Error(`Erro ao verificar relacionamento existente: ${linkSearchError.message}`);
    }

    if (existingLink) {
      return {
        student_id: existingLink.student_id,
        guardian_id: existingLink.guardian_id,
        relationship: existingLink.relationship,
      };
    }

    // Validate relationship
    const validRelationships = ['Pai', 'Mãe', 'Responsável Legal', 'Avó', 'Avô', 'Tio', 'Tia', 'Outro'];
    const normalizedRelationship = relationship && validRelationships.includes(relationship.trim()) 
      ? relationship.trim() 
      : 'Responsável Legal';

    const now = new Date().toISOString();
    const insertPayload = {
      student_id: studentId,
      guardian_id: guardianId,
      relationship: normalizedRelationship,
      financial_responsible: financialResponsible ?? true,
      educational_responsible: educationalResponsible ?? true,
      created_at: now,
    };

    const { data: insertedLink, error: insertError } = await this.supabase
      .from('student_guardians')
      .insert(insertPayload)
      .select('student_id, guardian_id, relationship')
      .single();

    if (insertError) {
      throw new Error(`Falha ao vincular responsável ao aluno: ${insertError.message}`);
    }

    if (!insertedLink) {
      throw new Error('Relacionamento criado, mas dados não retornados.');
    }

    return {
      student_id: insertedLink.student_id,
      guardian_id: insertedLink.guardian_id,
      relationship: insertedLink.relationship,
    };
  }

  private async createFamilyAccount(
    guardian: { id?: string; profileId?: string; email: string; fullName?: string; cpf?: string }, 
    schoolId: string
  ): Promise<any> {
    const profileId = guardian.profileId || guardian.id;
    if (!profileId) {
      throw new Error('ID ou profile_id do responsável é obrigatório para conta familiar.');
    }
    if (!schoolId) {
      throw new Error('school_id é obrigatório para conta familiar.');
    }

    // PASSO 1: Verificar se já existe um user_account para o profile_id e school_id
    const { data: existingAccount, error: searchError } = await this.supabase
      .from('user_accounts')
      .select('*')
      .eq('profile_id', profileId)
      .eq('school_id', schoolId)
      .maybeSingle();

    if (searchError) {
      console.warn('Aviso ao consultar user_accounts:', searchError.message);
    }

    if (existingAccount) {
      return existingAccount;
    }

    // PASSO 2: Caso não exista, criar user_account
    const now = new Date().toISOString();
    const insertPayload = {
      auth_user_id: guardian.id || null,
      profile_id: profileId,
      school_id: schoolId,
      is_active: true,
      is_blocked: false,
      email_verified: false,
      created_at: now,
      updated_at: now,
    };

    const { data: newAccount, error: insertError } = await this.supabase
      .from('user_accounts')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertError) {
      console.warn('Falha ao inserir em user_accounts (retornando objeto virtual):', insertError.message);
      return insertPayload;
    }

    return newAccount;
  }

  private async assignFamilyRole(
    profileId: string, 
    schoolId: string
  ): Promise<{ user_account: any; role: string; school_id: string }> {
    if (!profileId) {
      throw new Error('profile_id é obrigatório para atribuir role.');
    }
    if (!schoolId) {
      throw new Error('school_id é obrigatório para atribuir role.');
    }

    // PASSO 3: Verificar se já existe user_role com profile_id, role = 'familia', school_id
    const { data: existingRole, error: roleSearchError } = await this.supabase
      .from('user_roles')
      .select('*')
      .eq('profile_id', profileId)
      .eq('role', 'familia')
      .eq('school_id', schoolId)
      .maybeSingle();

    if (roleSearchError) {
      console.warn('Aviso ao consultar user_roles:', roleSearchError.message);
    }

    if (!existingRole) {
      // PASSO 4: Caso não exista, criar em user_roles
      const now = new Date().toISOString();
      const rolePayload = {
        profile_id: profileId,
        user_id: profileId,
        role: 'familia',
        role_id: 'familia',
        school_id: schoolId,
        active: true,
        created_at: now,
      };

      const { error: roleInsertError } = await this.supabase
        .from('user_roles')
        .insert(rolePayload);

      if (roleInsertError) {
        console.warn('Falha ao inserir em user_roles:', roleInsertError.message);
      }
    }

    // PASSO 5: Retornar user_account, role, school_id
    const { data: userAccount } = await this.supabase
      .from('user_accounts')
      .select('*')
      .eq('profile_id', profileId)
      .eq('school_id', schoolId)
      .maybeSingle();

    return {
      user_account: userAccount || { profile_id: profileId, school_id: schoolId },
      role: 'familia',
      school_id: schoolId,
    };
  }

  private async registerAudit(action: string, details: any): Promise<void> {
    // TODO: Insert audit log into public.audit_logs
  }

  private async sendWelcomeNotification(email: string): Promise<void> {
    // TODO: Dispatch welcome email / push notification
  }

  private async commit(): Promise<void> {
    // TODO: Finalize transaction state
  }

  private async rollback(error: any): Promise<void> {
    // TODO: Execute compensatory compensation / rollback steps
  }
}
