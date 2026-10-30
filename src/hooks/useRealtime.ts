import { useEffect, useRef } from 'react';
import { realtimeService } from '../services/RealtimeService';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseRealtimeOptions<T = any> {
  table: string;
  channelName: string;
  schema?: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  onInsert?: (payload: RealtimePostgresChangesPayload<T>) => void;
  onUpdate?: (payload: RealtimePostgresChangesPayload<T>) => void;
  onDelete?: (payload: RealtimePostgresChangesPayload<T>) => void;
  onAny?: (payload: RealtimePostgresChangesPayload<T>) => void;
  enabled?: boolean;
}

export function useRealtime<T = any>(options: UseRealtimeOptions<T>) {
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    if (options.enabled === false) return;

    const { table, channelName, schema = 'public', filter, event = '*' } = optionsRef.current;

    const unsubscribe = realtimeService.subscribe<T>(
      channelName,
      { table, schema, filter, event },
      (payload) => {
        const { onInsert, onUpdate, onDelete, onAny } = optionsRef.current;
        
        if (onAny) onAny(payload);
        
        switch (payload.eventType) {
          case 'INSERT':
            if (onInsert) onInsert(payload);
            break;
          case 'UPDATE':
            if (onUpdate) onUpdate(payload);
            break;
          case 'DELETE':
            if (onDelete) onDelete(payload);
            break;
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [options.table, options.channelName, options.schema, options.filter, options.event, options.enabled]);
}
