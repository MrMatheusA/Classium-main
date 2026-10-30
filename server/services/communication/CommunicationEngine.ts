import { SupabaseClient } from '@supabase/supabase-js';

export interface CommunicationPayload {
  schoolId: string;
  title: string;
  message: string;
  targetType: 'ALL_SCHOOL' | 'GRADE' | 'CLASS' | 'STUDENT' | 'TEACHER' | 'EMPLOYEE' | 'GUARDIAN';
  targetId?: string; // grade name, class id, student id, etc.
  senderId: string;
  priority?: 'normal' | 'high' | 'urgent';
  requiresSignature?: boolean;
  expiresAt?: string;
}

export interface RecipientInfo {
  userId: string;
  profileId: string;
  role: string;
  email?: string;
  phone?: string;
}

export class CommunicationEngine {
  private supabase: SupabaseClient;
  private cache: Map<string, any>;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
    this.cache = new Map<string, any>();
  }

  /**
   * Main entry point to create and dispatch communication
   */
  public async createCommunication(payload: CommunicationPayload): Promise<{ success: boolean; communicationId?: string; totalRecipients?: number; error?: string }> {
    try {
      this.validatePayload(payload);

      // 1. Insert communication record
      const now = new Date().toISOString();
      const { data: commData, error: commError } = await this.supabase
        .from('communications')
        .insert({
          school_id: payload.schoolId,
          title: payload.title,
          message: payload.message,
          target_type: payload.targetType,
          target_id: payload.targetId || null,
          sender_id: payload.senderId,
          priority: payload.priority || 'normal',
          requires_signature: payload.requiresSignature || false,
          expires_at: payload.expiresAt || null,
          status: 'created',
          created_at: now,
          updated_at: now,
        })
        .select('id')
        .single();

      if (commError || !commData) {
        throw new Error(`Falha ao criar comunicado: ${commError?.message || 'Erro desconhecido'}`);
      }

      const communicationId = commData.id as string;

      // 2. Resolve Recipients
      const recipients = await this.resolveRecipients(payload.schoolId, payload.targetType, payload.targetId);

      // 3. Register notifications for each recipient
      await this.registerNotification(communicationId, recipients);

      // 4. Update status to 'sent'
      await this.supabase
        .from('communications')
        .update({ status: 'sent', updated_at: new Date().toISOString() })
        .eq('id', communicationId);

      // 5. Send real-time broadcast
      await this.sendRealtime(communicationId, payload.schoolId, recipients);

      return {
        success: true,
        communicationId,
        totalRecipients: recipients.length,
      };
    } catch (error: any) {
      console.error('[CommunicationEngine] Error in createCommunication:', error.message || error);
      return { success: false, error: error.message || 'Erro ao processar comunicado' };
    }
  }

  /**
   * Resolve recipients based on school_id and target type
   */
  public async resolveRecipients(
    schoolId: string, 
    targetType: CommunicationPayload['targetType'], 
    targetId?: string
  ): Promise<RecipientInfo[]> {
    const cacheKey = `recipients_${schoolId}_${targetType}_${targetId || 'all'}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) as RecipientInfo[];
    }

    const recipients: RecipientInfo[] = [];

    try {
      if (targetType === 'ALL_SCHOOL') {
        // Fetch all active user accounts for this school
        const { data: accounts, error } = await this.supabase
          .from('user_accounts')
          .select('profile_id, auth_user_id')
          .eq('school_id', schoolId)
          .eq('is_active', true);

        if (!error && accounts) {
          for (const acc of accounts) {
            recipients.push({
              userId: acc.auth_user_id || acc.profile_id,
              profileId: acc.profile_id,
              role: 'school_member',
            });
          }
        }
      } else if (targetType === 'STUDENT' && targetId) {
        // Fetch guardians linked to specific student
        const { data: links, error } = await this.supabase
          .from('student_guardians')
          .select('guardian_id')
          .eq('student_id', targetId);

        if (!error && links) {
          for (const link of links) {
            recipients.push({
              userId: link.guardian_id,
              profileId: link.guardian_id,
              role: 'guardian',
            });
          }
        }
      } else if (targetType === 'GUARDIAN') {
        // Fetch guardians across the school
        const { data: guardians, error } = await this.supabase
          .from('guardians')
          .select('id, email, phone')
          .eq('active', true);

        if (!error && guardians) {
          for (const g of guardians) {
            recipients.push({
              userId: g.id,
              profileId: g.id,
              email: g.email,
              phone: g.phone,
              role: 'guardian',
            });
          }
        }
      } else {
        // Default fallback: get users from school accounts
        const { data: accounts } = await this.supabase
          .from('user_accounts')
          .select('profile_id, auth_user_id')
          .eq('school_id', schoolId)
          .eq('is_active', true)
          .limit(50);

        if (accounts) {
          for (const acc of accounts) {
            recipients.push({
              userId: acc.auth_user_id || acc.profile_id,
              profileId: acc.profile_id,
              role: targetType.toLowerCase(),
            });
          }
        }
      }

      this.cache.set(cacheKey, recipients);
      return recipients;
    } catch (error: any) {
      console.error('[CommunicationEngine] Error resolving recipients:', error.message || error);
      return [];
    }
  }

  /**
   * Broadcast communication via Supabase Realtime
   */
  public async sendRealtime(communicationId: string, schoolId: string, recipients: RecipientInfo[]): Promise<void> {
    try {
      const channel = this.supabase.channel(`school_${schoolId}_communications`);
      await channel.subscribe();
      await channel.send({
        type: 'broadcast',
        event: 'new_communication',
        payload: {
          communicationId,
          schoolId,
          timestamp: new Date().toISOString(),
          recipientCount: recipients.length,
        },
      });
      await this.supabase.removeChannel(channel);
    } catch (error: any) {
      console.warn('[CommunicationEngine] Realtime broadcast warning:', error.message || error);
    }
  }

  /**
   * Register communication notifications for each recipient
   */
  public async registerNotification(communicationId: string, recipients: RecipientInfo[]): Promise<void> {
    if (!recipients || recipients.length === 0) return;

    const now = new Date().toISOString();
    const notificationRecords = recipients.map(rec => ({
      communication_id: communicationId,
      recipient_id: rec.profileId,
      status: 'delivered',
      delivered_at: now,
      created_at: now,
    }));

    const { error } = await this.supabase
      .from('communication_notifications')
      .insert(notificationRecords);

    if (error) {
      console.warn('[CommunicationEngine] Warning inserting notifications batch:', error.message);
    }

    // Also register delivery audit for each
    for (const rec of recipients) {
      await this.registerDelivery(communicationId, rec.profileId);
    }
  }

  /**
   * Register delivery confirmation
   */
  public async registerDelivery(communicationId: string, recipientId: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      await this.supabase
        .from('communication_deliveries')
        .insert({
          communication_id: communicationId,
          recipient_id: recipientId,
          status: 'delivered',
          delivered_at: now,
          created_at: now,
        });
    } catch (err) {
      // Non-blocking telemetry log
    }
  }

  /**
   * Confirm reading with user agent, IP and timestamp
   */
  public async confirmReading(
    communicationId: string, 
    recipientId: string, 
    meta?: { ip?: string; device?: string; userAgent?: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date().toISOString();
      const { error } = await this.supabase
        .from('communication_notifications')
        .update({
          status: 'viewed',
          read_at: now,
          ip_address: meta?.ip || '127.0.0.1',
          device_info: meta?.device || meta?.userAgent || 'Web Client',
          updated_at: now,
        })
        .eq('communication_id', communicationId)
        .eq('recipient_id', recipientId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('[CommunicationEngine] Error confirming reading:', error.message || error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Confirm digital signature for mandatory notices
   */
  public async confirmDigitalSignature(
    communicationId: string, 
    recipientId: string, 
    signatureToken: string,
    meta?: { ip?: string; device?: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!signatureToken) {
        throw new Error('Token de assinatura digital é obrigatório.');
      }

      const now = new Date().toISOString();
      const { error } = await this.supabase
        .from('communication_notifications')
        .update({
          status: 'confirmed',
          signature_token: signatureToken,
          signed_at: now,
          ip_address: meta?.ip || '127.0.0.1',
          device_info: meta?.device || 'Secure Web Terminal',
          updated_at: now,
        })
        .eq('communication_id', communicationId)
        .eq('recipient_id', recipientId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('[CommunicationEngine] Error confirming digital signature:', error.message || error);
      return { success: false, error: error.message };
    }
  }

  private validatePayload(payload: CommunicationPayload): void {
    if (!payload.schoolId) {
      throw new Error('school_id é obrigatório para disparar comunicados.');
    }
    if (!payload.title || payload.title.trim().length < 3) {
      throw new Error('Título do comunicado deve ter no mínimo 3 caracteres.');
    }
    if (!payload.message || payload.message.trim().length < 5) {
      throw new Error('Mensagem do comunicado deve ter no mínimo 5 caracteres.');
    }
    if (!payload.senderId) {
      throw new Error('ID do remetente é obrigatório.');
    }
  }
}
