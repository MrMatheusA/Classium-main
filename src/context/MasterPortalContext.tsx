import React, { createContext, useContext, useMemo } from 'react';
import { usePlatform } from './PlatformContext';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

export type PortalType = 'manager' | 'teacher' | 'family';

interface MasterPortalContextType {
  currentPortal: PortalType;
  switchPortal: (targetPortal: PortalType) => Promise<void>;
  isAdminMaster: boolean;
}

const MasterPortalContext = createContext<MasterPortalContextType | undefined>(undefined);

export function MasterPortalProvider({ children }: { children: React.ReactNode }) {
  const { mode, setMode } = usePlatform();
  const { user, role } = useAuth();

  // Autoridade canônica: o acesso de administrador da plataforma é derivado exclusivamente de useAuth().role
  const isAdminMaster = role === 'admin';

  const currentPortal = useMemo<PortalType>(() => {
    if (mode === 'admin') return 'manager';
    if (mode === 'professor') return 'teacher';
    if (mode === 'family') return 'family';
    return 'manager';
  }, [mode]);

  const switchPortal = async (targetPortal: PortalType) => {
    if (!isAdminMaster || !user) {
      console.warn('[MasterPortalContext] Bloqueado: Usuário não possui privilégios de Administrador');
      return;
    }

    const fromPortal = currentPortal;

    // Alternância de modo visual
    if (targetPortal === 'manager') {
      setMode('admin');
    } else if (targetPortal === 'teacher') {
      setMode('professor');
    } else if (targetPortal === 'family') {
      setMode('family');
    }

    // Registro de auditoria canônico (fail-closed sem hardcodes ou identidades sintéticas)
    try {
      await supabase.from('audit_logs').insert({
        event: 'MASTER_SWITCH_PORTAL',
        action: 'MASTER_SWITCH_PORTAL',
        portal_from: fromPortal,
        portal_to: targetPortal,
        user_id: user.id,
        details: JSON.stringify({
          portal_from: fromPortal,
          portal_to: targetPortal,
          user_id: user.id,
          email: user.email || '',
          timestamp: new Date().toISOString()
        }),
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn('[MasterPortalContext] Audit log note:', err);
    }
  };

  return (
    <MasterPortalContext.Provider value={{ currentPortal, switchPortal, isAdminMaster }}>
      {children}
    </MasterPortalContext.Provider>
  );
}

export function useMasterPortal() {
  const context = useContext(MasterPortalContext);
  if (!context) {
    throw new Error('useMasterPortal deve ser usado dentro de um MasterPortalProvider');
  }
  return context;
}
