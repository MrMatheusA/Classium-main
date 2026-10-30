import { supabase } from '../lib/supabase';
import { SchoolTemplate, initialSchoolTemplates } from '../data/comunicacaoTemplates';

export interface GeneratedDocumentRecord {
  id: string;
  template_id: string;
  template_title: string;
  category: string;
  subject: string;
  student_name?: string;
  student_id?: string;
  grade?: string;
  responsible_name?: string;
  recipient_audience?: string;
  content_html: string;
  requires_signature: boolean;
  status: 'emitido' | 'assinado' | 'pendente_assinatura';
  signed_at?: string;
  signature_hash?: string;
  signed_by?: string;
  created_at: string;
  fields_data?: Record<string, string>;
}

const LOCAL_STORAGE_CUSTOM_TEMPLATES_KEY = 'classium_custom_document_templates';
const LOCAL_STORAGE_GENERATED_DOCS_KEY = 'classium_generated_documents_history';

class DocumentTemplateService {
  /**
   * Obtém a lista consolidada de modelos (padrão do sistema + personalizados)
   */
  async getTemplates(): Promise<SchoolTemplate[]> {
    try {
      // 1. Tentar buscar da API Backend
      const res = await fetch('/api/documents/templates');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch (e) {
      console.warn('[DocumentTemplateService] Falha ao consultar backend, usando fallback local:', e);
    }

    // Fallback: carregar customizados do LocalStorage mesclados aos padrões
    const customJson = localStorage.getItem(LOCAL_STORAGE_CUSTOM_TEMPLATES_KEY);
    const customTemplates: SchoolTemplate[] = customJson ? JSON.parse(customJson) : [];
    
    // Mesclar garantindo que IDs não colidam
    const customIds = new Set(customTemplates.map(t => t.id));
    const defaults = initialSchoolTemplates.filter(t => !customIds.has(t.id));

    return [...customTemplates, ...defaults];
  }

  /**
   * Salva ou atualiza um modelo personalizado no banco de dados e localmente
   */
  async saveTemplate(template: SchoolTemplate): Promise<SchoolTemplate> {
    try {
      const res = await fetch('/api/documents/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      });
      if (res.ok) {
        const saved = await res.json();
        return saved;
      }
    } catch (e) {
      console.warn('[DocumentTemplateService] Erro ao salvar modelo via API:', e);
    }

    // Persistência local segura
    const customJson = localStorage.getItem(LOCAL_STORAGE_CUSTOM_TEMPLATES_KEY);
    let customTemplates: SchoolTemplate[] = customJson ? JSON.parse(customJson) : [];
    const index = customTemplates.findIndex(t => t.id === template.id);

    if (index >= 0) {
      customTemplates[index] = template;
    } else {
      customTemplates.unshift(template);
    }

    localStorage.setItem(LOCAL_STORAGE_CUSTOM_TEMPLATES_KEY, JSON.stringify(customTemplates));
    return template;
  }

  /**
   * Remove um modelo customizado
   */
  async deleteTemplate(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/documents/templates/${id}`, { method: 'DELETE' });
      if (res.ok) return true;
    } catch (e) {
      console.warn('[DocumentTemplateService] Erro ao deletar modelo via API:', e);
    }

    const customJson = localStorage.getItem(LOCAL_STORAGE_CUSTOM_TEMPLATES_KEY);
    if (customJson) {
      const customTemplates: SchoolTemplate[] = JSON.parse(customJson);
      const filtered = customTemplates.filter(t => t.id !== id);
      localStorage.setItem(LOCAL_STORAGE_CUSTOM_TEMPLATES_KEY, JSON.stringify(filtered));
    }
    return true;
  }

  /**
   * Registra a emissão de um documento oficial gerado
   */
  async recordGeneratedDocument(doc: Omit<GeneratedDocumentRecord, 'id' | 'created_at'>): Promise<GeneratedDocumentRecord> {
    const newRecord: GeneratedDocumentRecord = {
      ...doc,
      id: `DOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      created_at: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('[DocumentTemplateService] Erro ao registrar documento gerado no backend:', e);
    }

    // Fallback LocalStorage
    const historyJson = localStorage.getItem(LOCAL_STORAGE_GENERATED_DOCS_KEY);
    const history: GeneratedDocumentRecord[] = historyJson ? JSON.parse(historyJson) : [];
    history.unshift(newRecord);
    localStorage.setItem(LOCAL_STORAGE_GENERATED_DOCS_KEY, JSON.stringify(history.slice(0, 100)));

    return newRecord;
  }

  /**
   * Lista os documentos emitidos / gerados
   */
  async getGeneratedDocuments(): Promise<GeneratedDocumentRecord[]> {
    try {
      const res = await fetch('/api/documents/generated');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (e) {
      console.warn('[DocumentTemplateService] Erro ao buscar documentos gerados:', e);
    }

    const historyJson = localStorage.getItem(LOCAL_STORAGE_GENERATED_DOCS_KEY);
    return historyJson ? JSON.parse(historyJson) : [];
  }

  /**
   * Assina digitalmente um documento emitido
   */
  async signDocument(documentId: string, signerName: string): Promise<GeneratedDocumentRecord | null> {
    const signatureHash = `ICP-CLS-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${Date.now()}`;
    const signedAt = new Date().toISOString();

    try {
      const res = await fetch('/api/documents/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, signerName, signatureHash, signedAt })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('[DocumentTemplateService] Erro ao assinar digitalmente via API:', e);
    }

    // Fallback Local
    const historyJson = localStorage.getItem(LOCAL_STORAGE_GENERATED_DOCS_KEY);
    if (historyJson) {
      const history: GeneratedDocumentRecord[] = JSON.parse(historyJson);
      const target = history.find(d => d.id === documentId);
      if (target) {
        target.status = 'assinado';
        target.signed_at = signedAt;
        target.signed_by = signerName;
        target.signature_hash = signatureHash;
        localStorage.setItem(LOCAL_STORAGE_GENERATED_DOCS_KEY, JSON.stringify(history));
        return target;
      }
    }
    return null;
  }
}

export const documentTemplateService = new DocumentTemplateService();
