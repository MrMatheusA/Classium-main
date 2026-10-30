import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, ShieldCheck, Building2, GraduationCap, Users, Settings, LogOut } from 'lucide-react';
import { EDUCA_PORTALS } from '../../lib/portals';
import { canAccessPortal } from '../../lib/auth/access';
import { useAuth } from '../../hooks/useAuth';
import { usePlatform } from '../../context/PlatformContext';

export function PortalSwitcher() {
  const { profile, logout: authLogout } = useAuth();
  const { setMode, role, logoutPartner } = usePlatform();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const roles = profile?.role ? [profile.role] : [];
  if (role) roles.push(role);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePortalSwitch = (portalKey: string, href: string) => {
    setIsOpen(false);
    
    // Switch React Platform mode
    const modeMap: Record<string, string> = {
      gestor: 'admin',
      docente: 'professor',
      familia: 'family',
      pedagogo: 'admin', // assuming for now
    };
    
    if (modeMap[portalKey]) {
      setMode(modeMap[portalKey] as any);
    }
  };

  const handleLogout = async () => {
    setIsOpen(false);
    if (authLogout) await authLogout();
    logoutPartner();
    setMode('login');
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-gold/30 rounded-xl hover:border-gold/60 transition-all text-xs"
      >
        <span className="font-bold text-white">Portais</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gold transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 bg-[#0B0F19] border border-gold/30 rounded-xl shadow-2xl z-50 p-2 space-y-1">
          {EDUCA_PORTALS.filter(p => canAccessPortal(roles, p.key)).map(portal => (
            <button
              key={portal.key}
              onClick={() => handlePortalSwitch(portal.key, portal.href)}
              className="w-full flex items-center justify-between p-2 rounded-lg text-xs hover:bg-slate-800 transition-colors"
            >
              <span className="text-slate-300">{portal.label}</span>
            </button>
          ))}
          <div className="border-t border-slate-700 my-1" />
          <button onClick={handleLogout} className="w-full flex items-center gap-2 p-2 rounded-lg text-xs text-red-400 hover:bg-red-950/40">
            <LogOut className="w-4 h-4" /> Encerrar sessão
          </button>
        </div>
      )}
    </div>
  );
}
