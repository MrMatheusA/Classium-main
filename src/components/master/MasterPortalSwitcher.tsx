import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, 
  Building2, 
  GraduationCap, 
  Users, 
  ChevronDown, 
  Shield, 
  LogOut, 
  Check, 
  User
} from 'lucide-react';
import { useMasterPortal, PortalType } from '../../context/MasterPortalContext';
import { usePlatform } from '../../context/PlatformContext';
import { useAuth } from '../../hooks/useAuth';

export function MasterPortalSwitcher() {
  const { currentPortal, switchPortal, isAdminMaster } = useMasterPortal();
  const { setMode, currentUser } = usePlatform();
  const { logout: authLogout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAdminMaster) {
    return null;
  }

  const handlePortalSwitch = async (portal: PortalType) => {
    setIsOpen(false);
    await switchPortal(portal);
  };

  const handleLogout = async () => {
    setIsOpen(false);
    if (authLogout) {
      await authLogout();
    }
    setMode('login');
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-2 bg-slate-900/90 hover:bg-slate-850 border border-gold/30 hover:border-gold/60 rounded-xl transition-all text-left shadow-lg group cursor-pointer"
        title="Menu Master Portal Switcher"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7F1D1D] via-[#B91C1C] to-[#D4AF37] text-white font-serif font-bold text-xs flex items-center justify-center border border-[#D4AF37]/40 shadow-inner shrink-0 group-hover:scale-105 transition-transform">
          AD
        </div>
        <div className="hidden md:block text-xs">
          <div className="font-serif font-bold text-white leading-tight group-hover:text-gold transition-colors flex items-center gap-1.5">
            Administrador
          </div>
          <div className="text-[9px] text-gold font-mono font-bold tracking-wider uppercase">
            ACESSO TOTAL
          </div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-gold/80 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-[#0B0F19] border border-gold/30 rounded-2xl shadow-2xl z-50 p-3 text-left space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header Info */}
          <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gold" />
                <span className="text-xs font-serif font-bold text-white">
                  {currentUser?.name || 'Administrador Geral'}
                </span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Sessão Ativa" />
            </div>
            <p className="text-[10px] text-slate-400 font-mono truncate">
              {currentUser?.email || 'renatotcheka29@gmail.com'}
            </p>
            <div className="pt-1 flex items-center gap-1.5 text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/80">
              <Shield className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>Acesso Pleno Garantido</span>
            </div>
          </div>

          <div className="border-t border-slate-800/80 my-1" />

          {/* Portals Section */}
          <div className="space-y-1">
            <span className="text-[9px] font-mono text-gold uppercase tracking-widest px-2 font-bold block">
              Alternar Portal Unificado
            </span>

            {/* 1. Classium Gestor */}
            <button
              onClick={() => handlePortalSwitch('manager')}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all ${
                currentPortal === 'manager' 
                  ? 'bg-amber-950/40 text-white border border-amber-800/50 shadow-md font-bold' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Building2 className={`w-4 h-4 ${currentPortal === 'manager' ? 'text-gold' : 'text-amber-400'}`} />
                <span>Classium Gestor</span>
              </div>
              {currentPortal === 'manager' && <Check className="w-4 h-4 text-gold shrink-0" />}
            </button>

            {/* 2. Classium Docente */}
            <button
              onClick={() => handlePortalSwitch('teacher')}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all ${
                currentPortal === 'teacher' 
                  ? 'bg-blue-950/40 text-white border border-blue-800/50 shadow-md font-bold' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <GraduationCap className={`w-4 h-4 ${currentPortal === 'teacher' ? 'text-gold' : 'text-blue-400'}`} />
                <span>Classium Docente</span>
              </div>
              {currentPortal === 'teacher' && <Check className="w-4 h-4 text-gold shrink-0" />}
            </button>

            {/* 3. Classium Família */}
            <button
              onClick={() => handlePortalSwitch('family')}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all ${
                currentPortal === 'family' 
                  ? 'bg-emerald-950/40 text-white border border-emerald-800/50 shadow-md font-bold' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className={`w-4 h-4 ${currentPortal === 'family' ? 'text-gold' : 'text-emerald-400'}`} />
                <span>Classium Família</span>
              </div>
              {currentPortal === 'family' && <Check className="w-4 h-4 text-gold shrink-0" />}
            </button>
          </div>

          <div className="border-t border-slate-800/80 my-1" />

          {/* Logout */}
          <div className="space-y-1 text-xs">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-red-400 hover:bg-red-950/40 transition-colors font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span>Encerrar sessão</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
