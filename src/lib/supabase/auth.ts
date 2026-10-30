// CLASSIUM SUPABASE AUTHENTICATION SERVICE
// Full Authentication suite: Login, Logout, Session, Password Reset, Roles & Permissions

import { getSupabase } from './client';
import { getSupabaseEnvConfig } from './config';
import { User, Session, AuthError } from '@supabase/supabase-js';

export interface EducaUserCredentials {
  email: string;
  password?: string;
  name?: string;
  role?: 'admin' | 'gestor' | 'professor' | 'familia' | 'aluno';
  schoolId?: string;
}

export interface AuthResult {
  success: boolean;
  user?: User | null;
  session?: Session | null;
  error?: string;
  isSimulated?: boolean;
}

export class SupabaseAuthService {

  // Get current active session
  public async getSession(): Promise<Session | null> {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    return data.session;
  }

  // Get current active user
  public async getCurrentUser(): Promise<User | null> {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getUser();
    return data.user;
  }

  // Sign In with Email & Password
  public async signIn({ email, password }: EducaUserCredentials): Promise<AuthResult> {
    const config = getSupabaseEnvConfig();
    if (!config.isConfigured) {
      // Return simulated success for local demo mode if unconfigured
      return {
        success: true,
        user: {
          id: `sim-usr-${Date.now()}`,
          email,
          user_metadata: { name: email.split('@')[0], role: 'admin', school_id: 'escola-sede-01' },
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString()
        } as unknown as User,
        isSimulated: true
      };
    }

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: password || ''
      });

      if (error) {
        return { success: false, error: this.formatAuthError(error) };
      }

      return { success: true, user: data.user, session: data.session };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Falha na autenticação via Supabase' };
    }
  }

  // Sign Up / Register New User
  public async signUp({ email, password, name, role = 'familia', schoolId = 'escola-sede-01' }: EducaUserCredentials): Promise<AuthResult> {
    const config = getSupabaseEnvConfig();
    if (!config.isConfigured) {
      return {
        success: true,
        user: {
          id: `sim-usr-${Date.now()}`,
          email,
          user_metadata: { name: name || email.split('@')[0], role, school_id: schoolId },
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString()
        } as unknown as User,
        isSimulated: true
      };
    }

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.signUp({
        email,
        password: password || '',
        options: {
          data: {
            name: name || email.split('@')[0],
            role,
            school_id: schoolId
          }
        }
      });

      if (error) {
        return { success: false, error: this.formatAuthError(error) };
      }

      return { success: true, user: data.user, session: data.session };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Falha ao cadastrar usuário no Supabase Auth' };
    }
  }

  // Request Password Reset Link
  public async resetPassword(email: string): Promise<{ success: boolean; message: string }> {
    const config = getSupabaseEnvConfig();
    if (!config.isConfigured) {
      return {
        success: true,
        message: `Instruções de redefinição de senha enviadas para ${email} (Modo Simulado).`
      };
    }

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        return { success: false, message: this.formatAuthError(error) };
      }

      return {
        success: true,
        message: `E-mail de redefinição de senha enviado com sucesso para ${email}.`
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Erro ao solicitar redefinição de senha' };
    }
  }

  // Update Password
  public async updatePassword(newPassword: string): Promise<AuthResult> {
    const config = getSupabaseEnvConfig();
    if (!config.isConfigured) {
      return { success: true, isSimulated: true };
    }

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { success: false, error: this.formatAuthError(error) };
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao alterar senha' };
    }
  }

  // Sign Out / Logout
  public async signOut(): Promise<{ success: boolean }> {
    const config = getSupabaseEnvConfig();
    if (!config.isConfigured) {
      return { success: true };
    }

    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
      return { success: true };
    } catch {
      return { success: true };
    }
  }

  // Subscribe to Auth State Changes
  public onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    const supabase = getSupabase();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    return subscription;
  }

  private formatAuthError(error: AuthError): string {
    const msg = error.message || '';
    if (
      msg.includes('Failed to fetch') || 
      msg.toLowerCase().includes('fetch') || 
      msg.includes('network') || 
      msg.toLowerCase().includes('load failed')
    ) {
      return 'Erro de rede ao conectar ao Supabase: Não foi possível estabelecer conexão. Verifique se as variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY estão configuradas corretamente no deploy da Vercel.';
    }
    switch (error.status) {
      case 400:
        return 'Credenciais inválidas. Verifique e-mail e senha.';
      case 422:
        return 'Formato de e-mail ou senha inválido.';
      case 429:
        return 'Muitas tentativas. Por favor aguarde alguns minutos.';
      default:
        return error.message || 'Erro na autenticação com o servidor Supabase.';
    }
  }
}

export const supabaseAuth = new SupabaseAuthService();
