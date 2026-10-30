import React from 'react';
import { CardapioPanel, CardapioPanelProps } from '../alimentacao/CardapioPanel';

export interface CentralAlimentacaoEscolarProps extends Partial<CardapioPanelProps> {
  readOnly?: boolean;
}

/**
 * CentralAlimentacaoEscolar — Módulo Oficial "CARDÁPIO" do Portal do Gestor CLASSIUM.
 * Reconstruído com 3 áreas limpas, integração nativa ao Supabase e visualização automática.
 */
export const CentralAlimentacaoEscolar: React.FC<CentralAlimentacaoEscolarProps> = (props) => {
  return <CardapioPanel {...props} />;
};

export default CentralAlimentacaoEscolar;
