import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface UseConductRealtimeOptions {
  studentId?: string;
  organizationId?: string;
  academicYearId?: string;
  termNumber?: number;
  onUpdate?: () => void;
  enabled?: boolean;
}

/**
 * Hook reutilizável para escuta de eventos Realtime de Conduta, Ocorrências e Saldo Trimestral
 * Monitora tabelas: occurrences, student_conduct_records, student_conduct_quarterly_scores,
 * student_conduct_scores, student_conduct_movements e communications.
 */
export function useConductRealtime({
  studentId,
  organizationId,
  academicYearId,
  termNumber,
  onUpdate,
  enabled = true
}: UseConductRealtimeOptions) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!enabled) return;

    let channel: RealtimeChannel | null = null;
    const channelName = `conduct-sync-${studentId || 'all'}-${termNumber || '1'}-${Date.now()}`;

    try {
      channel = supabase.channel(channelName);

      // 1. Escuta ocorrências / student_conduct_records
      const occFilter = studentId ? `student_id=eq.${studentId}` : undefined;

      channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'occurrences',
            filter: occFilter
          },
          () => {
            if (onUpdateRef.current) {
              onUpdateRef.current();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'student_conduct_records',
            filter: occFilter
          },
          () => {
            if (onUpdateRef.current) {
              onUpdateRef.current();
            }
          }
        )
        // 2. Escuta saldos trimestrais
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'student_conduct_quarterly_scores',
            filter: occFilter
          },
          () => {
            if (onUpdateRef.current) {
              onUpdateRef.current();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'student_conduct_scores',
            filter: occFilter
          },
          () => {
            if (onUpdateRef.current) {
              onUpdateRef.current();
            }
          }
        )
        // 3. Escuta movimentos de conduta
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'student_conduct_movements',
            filter: occFilter
          },
          () => {
            if (onUpdateRef.current) {
              onUpdateRef.current();
            }
          }
        )
        // 4. Escuta comunicações direcionadas
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'communications'
          },
          () => {
            if (onUpdateRef.current) {
              onUpdateRef.current();
            }
          }
        );

      channel.subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[useConductRealtime] Channel subscription error for', channelName);
        }
      });
    } catch (err) {
      console.warn('[useConductRealtime] Failed to initialize Realtime listener:', err);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [studentId, organizationId, academicYearId, termNumber, enabled]);
}
