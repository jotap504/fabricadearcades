/**
 * Loosely-typed database row.
 *
 * The Supabase client in this project has no generated `Database` types, so rows
 * (and the JSON columns inside them) arrive untyped. `Row` names that single,
 * deliberate escape hatch instead of scattering `any` across the codebase.
 * Replace it with generated types (`supabase gen types`) when that is set up.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>

/** Safe message extraction for `catch (err)` blocks (err is `unknown`). */
export function getErrorMessage(err: unknown, fallback = 'Error desconocido'): string {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'string' && err) return err
  return fallback
}
