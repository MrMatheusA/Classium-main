import { useContext } from 'react';
import { AuthContext, ExtendedAuthContextType } from '../auth/AuthProvider';

export const useAuth = (): ExtendedAuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
