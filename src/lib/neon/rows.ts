/**
 * Row normalisation for the migration from the Supabase REST client to the
 * Postgres wire protocol.
 *
 * The two clients disagree on how they hand back values, and the differences are
 * silent — the code typechecks either way and only breaks at runtime:
 *
 *   timestamptz  Supabase REST -> ISO string   |  pg driver -> Date object
 *   bigint       Supabase REST -> number       |  pg driver -> string
 *
 * `normalizeRows` fixes the timestamp half globally. The bigint half is fixed
 * per query by casting in SQL (`view_count::float8`), because only the query
 * knows which columns are counts.
 */

function normalizeValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalizeValue);
  return value;
}

export function normalizeRow<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    out[key] = normalizeValue(row[key]);
  }
  return out as T;
}

export function normalizeRows<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map((row) => normalizeRow<T>(row));
}
