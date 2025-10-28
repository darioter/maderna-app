// Stub minimal que evita romper el build cuando no queremos usar Supabase aún.
// Exporta una "instancia" con métodos no-op (promesas resueltas).
export const supabase = {
  from(_table: string) {
    const chain = {
      insert: async (_v: any) => ({ data: null, error: null }),
      upsert: async (_v: any) => ({ data: null, error: null }),
      select: async (_query?: string) => ({ data: [], error: null }),
      delete: async () => ({ data: null, error: null }),
      update: async (_v: any) => ({ data: null, error: null }),
      eq: (_col: string, _val: any) => chain,
      order: (_col: string, _opts?: any) => chain,
      single: async () => ({ data: null, error: null }),
    };
    return chain;
  },
};


