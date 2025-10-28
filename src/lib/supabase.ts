// src/lib/supabase.ts
// Stub encadenable para compilar sin @supabase/supabase-js.
// Soporta: from().select().insert().upsert().update().delete().eq().order().single()
// y supabase.rpc().  Es "thenable" para poder usar `await` sin romper.

type StubResult<T = any> = { data: T; error: null };

function makeThenable<T = any>(result: StubResult<T>) {
  // Un objeto con método `then` es "thenable": `await` funciona.
  return {
    ...chain, // mantiene los métodos encadenables disponibles
    then: (resolve: (v: StubResult<T>) => void) => resolve(result),
    catch: (_: any) => ({ data: null, error: null } as StubResult),
    finally: (_: any) => undefined,
  };
}

const chain = {
  // Métodos “terminales” que devuelven un thenable con data vacía
  select(_q?: string) {
    return makeThenable<{ [k: string]: any }[]>({ data: [], error: null });
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

  // Filtros/orden: devuelven el propio builder para permitir chaining
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

  // También soportamos supabase.rpc('func', params)
  rpc(_fn: string, _params?: any) {
    return makeThenable({ data: null, error: null });
  },
};
