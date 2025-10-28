// src/lib/supabase.ts
// Stub encadenable para compilar sin @supabase/supabase-js ni import.meta.env.
// Soporta: from().select().insert().upsert().update().delete().eq().order().single()
// y supabase.rpc(). Es "thenable" para poder usar `await`.

type StubResult<T = any> = { data: T; error: null };

function makeThenable<T = any>(result: StubResult<T>) {
  return {
    ...chain,                            // mantiene métodos encadenables disponibles
    then: (resolve: (v: StubResult<T>) => void) => resolve(result),
    catch: (_: any) => ({ data: null, error: null } as StubResult),
    finally: (_: any) => undefined,
  };
}

const chain = {
  // Métodos de lectura/escritura
  select(_q?: string) {
    return makeThenable<any[]>({ data: [], error: null });
  },
  insert(_v: any) {
    return makeThenable({ data: null, error: null });
  },
  upsert(_v: any) {
    return makeThenable({ data: null, error: null });
  },
  update(_v: any) {
    return makeThenable({ data: null, error: null });
  },
  delete() {
    return makeThenable({ data: null, error: null });
  },
  single() {
    return makeThenable({ data: null, error: null });
  },

  // Filtros/orden (encadenables)
  eq(_col: string, _val: any) {
    return this;
  },
  order(_col: string, _opts?: any) {
    return this;
  },
};

export const supabase = {
  from(_table: string) {
    return chain;
  },

  // RPC también soportado
  rpc(_fn: string, _params?: any) {
    return makeThenable({ data: null, error: null });
  },
};

