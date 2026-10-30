export interface QueryOptions {
  select?: string;
  filters?: Record<string, any>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}

export function applyQueryOptions(query: any, options: QueryOptions = {}) {
  let q = query;

  if (options.filters) {
    Object.entries(options.filters).forEach(([key, value]) => {
      q = q.eq(key, value);
    });
  }

  if (options.orderBy) {
    q = q.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
  }

  if (options.limit !== undefined) {
    q = q.limit(options.limit);
  }

  if (options.offset !== undefined) {
    const limit = options.limit || 10;
    q = q.range(options.offset, options.offset + limit - 1);
  }

  return q;
}
