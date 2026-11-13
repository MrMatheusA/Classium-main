import { useEffect, useState } from 'react';
import {
  createOrUpdateCalendarEvent,
  fetchOrganizationCalendarEvents,
  getCategoryConfig,
  type CalendarEventFromDb,
} from '../../services/calendarRpcService';

/*
 * Ligação da Escola Escuta com o Calendário Escolar do Classium.
 * Usa as MESMAS funções do EducaSharedCalendar, então o evento é um só
 * (nada de cadastrar a mesma data em dois lugares).
 */

export interface EventoCalendario {
  id: string;
  titulo: string;
  data: string; // YYYY-MM-DD
  categoria: string;
}

const hoje = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const somarDias = (iso: string, dias: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};

/** Categorias do calendário ligadas a avaliações */
export const CATEGORIAS_AVALIACAO = ['avaliacoes', 'provas_internas', 'recuperacao', 'antecipacao'];

/** Eventos já publicados pela gestão (próximos meses), opcionalmente só algumas categorias */
export function useEventosCalendario(org: string | null | undefined, categorias?: string[], ativo = true) {
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const chaveCat = (categorias || []).join(',');

  useEffect(() => {
    if (!org || !ativo) return;
    let vivo = true;
    setCarregando(true);
    const de = somarDias(hoje(), -30);
    const ate = somarDias(hoje(), 240);
    fetchOrganizationCalendarEvents(de, ate, { organizationId: org })
      .then((res: any) => {
        if (!vivo) return;
        if (res?.error) setErro(String(res.error));
        const lista: CalendarEventFromDb[] = res?.data || [];
        setEventos(
          lista
            .filter((e: any) => !categorias?.length || categorias.includes(e.event_type || e.category))
            .filter((e: any) => !String(e.event_type || e.category || '').startsWith('recesso'))
            .map((e: any) => ({ id: String(e.id), titulo: e.title || 'Evento', data: e.start_date, categoria: e.event_type || e.category || '' }))
            .sort((a, b) => a.data.localeCompare(b.data)),
        );
      })
      .catch((e: any) => vivo && setErro(e?.message || 'Não foi possível ler o calendário.'))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org, chaveCat, ativo]);

  return { eventos, carregando, erro };
}

const CATEGORIA_DO_ENCONTRO: Record<string, string> = {
  reuniao: 'reuniao_pais',
  palestra: 'evento_escolar',
  oficina: 'atividade_pratica',
  encontro: 'evento_escolar',
  projeto: 'projeto_pedagogico',
  assembleia: 'evento_escolar',
  conselho: 'evento_escolar',
};

const dataLocal = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const horaLocal = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false });

/** Publica (ou atualiza) um encontro/assembleia do Participa no Calendário Escolar. Devolve o id do evento. */
export async function publicarEncontroNoCalendario(org: string, e: {
  evento_calendario_id?: string | null;
  tipo: string;
  titulo: string;
  descricao?: string | null;
  pauta?: string | null;
  inicio?: string | null;
  fim?: string | null;
  local?: string | null;
}): Promise<{ id?: string; error?: string }> {
  if (!e.inicio) return { error: 'Defina a data e o horário do encontro para publicar no calendário.' };
  const categoria = CATEGORIA_DO_ENCONTRO[e.tipo] || 'evento_escolar';
  const cfg: any = (() => {
    try {
      return getCategoryConfig(categoria) || {};
    } catch {
      return {};
    }
  })();
  try {
    const res: any = await createOrUpdateCalendarEvent({
      eventId: e.evento_calendario_id || undefined,
      title: e.titulo,
      description: [e.descricao, e.pauta ? `Pauta: ${e.pauta}` : null, 'Inscrições pelo menu Participa.'].filter(Boolean).join('\n\n'),
      startDate: dataLocal(e.inicio),
      endDate: dataLocal(e.fim || e.inicio),
      eventType: categoria,
      category: categoria,
      colorHex: cfg.hexColor,
      isLetivo: cfg.isLetivo,
      academicYear: Number(dataLocal(e.inicio).slice(0, 4)),
      startTime: horaLocal(e.inicio),
      endTime: e.fim ? horaLocal(e.fim) : null,
      isAllDay: false,
      location: e.local || '',
      targetAudience: 'all',
      organizationId: org,
      schoolId: org,
    } as any);
    if (res?.error || !res?.data?.id) return { error: String(res?.error || 'O calendário não confirmou a gravação.') };
    return { id: String(res.data.id) };
  } catch (err: any) {
    return { error: err?.message || 'Não foi possível publicar no calendário.' };
  }
}
