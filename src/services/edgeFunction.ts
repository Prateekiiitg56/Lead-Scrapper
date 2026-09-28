import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';

/** Error from a Supabase Edge Function, with the machine-readable `code` it sent, if any. */
export class EdgeFunctionError extends Error {
  readonly code: string | null;
  constructor(message: string, code: string | null = null) {
    super(message);
    this.name = 'EdgeFunctionError';
    this.code = code;
  }
}

/** Pull the `{ error, code }` body out of a failed Edge Function call. */
export async function edgeFunctionError(error: unknown, fallback: string, fn: string): Promise<EdgeFunctionError> {
  if (error instanceof FunctionsHttpError) {
    const res = error.context as Response;
    let body: { error?: string; message?: string; code?: string } | null = null;
    try {
      body = await res.json();
    } catch { /* not JSON */ }
    if (body?.error) return new EdgeFunctionError(body.error, typeof body.code === 'string' ? body.code : null);
    if (res.status === 404) {
      return new EdgeFunctionError(`This feature needs the "${fn}" Supabase Edge Function, which is not deployed. See README → Edge Functions.`);
    }
    if (body?.message) return new EdgeFunctionError(body.message);
    return new EdgeFunctionError(`${fallback} (HTTP ${res.status})`);
  }
  if (error instanceof FunctionsFetchError) {
    // Also what an undeployed function looks like from the browser: its CORS preflight fails.
    return new EdgeFunctionError(`Could not reach the "${fn}" Edge Function. Check your connection, and that it is deployed (README → Edge Functions).`);
  }
  return new EdgeFunctionError(error instanceof Error && error.message ? error.message : fallback);
}
