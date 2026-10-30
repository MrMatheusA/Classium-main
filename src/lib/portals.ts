export const EDUCA_PORTALS = [
  { key: 'gestor', label: 'Classium Gestor', href: '/gestor', roles: ['superadmin','admin','diretor','gestor'] },
  { key: 'docente', label: 'Classium Docente', href: '/docente', roles: ['superadmin','admin','diretor','gestor','docente'] },
  { key: 'familia', label: 'Classium Família', href: '/familia', roles: ['superadmin','admin','diretor','gestor','familia'] },
  { key: 'pedagogo', label: 'Classium Pedagogo', href: '/pedagogo', roles: ['superadmin','admin','diretor','gestor','pedagogo'] },
  { key: 'secretaria', label: 'Classium Secretaria', href: '/secretaria', roles: ['superadmin','admin','diretor','gestor','secretaria'] },
  { key: 'disciplinar', label: 'Classium Disciplinar', href: '/disciplinar', roles: ['superadmin','admin','diretor','gestor','disciplinar'] },
  { key: 'financeiro', label: 'Classium Financeiro', href: '/financeiro', roles: ['superadmin','admin','diretor','gestor','financeiro'] },
] as const;
