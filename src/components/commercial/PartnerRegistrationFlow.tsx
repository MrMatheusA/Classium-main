import React from 'react';
import { PartnerOnboardingWizard, OnboardingWizardCategory } from '../partner/PartnerOnboardingWizard';

interface PartnerRegistrationFlowProps {
  onClose: () => void;
  initialCategory?: string;
  onOpenPartnerDashboard?: () => void;
}

export function PartnerRegistrationFlow({ 
  onClose, 
  initialCategory = 'profissional',
  onOpenPartnerDashboard
}: PartnerRegistrationFlowProps) {
  const cat: OnboardingWizardCategory = 
    initialCategory === 'empresa' 
      ? 'empresa' 
      : initialCategory === 'prestador' 
      ? 'prestador' 
      : 'profissional';

  return (
    <PartnerOnboardingWizard
      isOpen={true}
      onClose={onClose}
      initialCategory={cat}
      onOpenPartnerDashboard={onOpenPartnerDashboard}
    />
  );
}
