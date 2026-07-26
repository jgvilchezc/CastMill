import { getSql } from "@/lib/neon/db";
import { normalizeRow, normalizeRows } from "@/lib/neon/rows";
import type { ConnectedAccountsRow, ProfilesRow } from "@/lib/neon/types";

/**
 * Shared queries for the patterns that repeat across API routes.
 *
 * These run through `getSql()` (owner role), so RLS does NOT apply — every
 * function scopes by user_id explicitly. Do not add one that doesn't.
 */

export type Platform = "instagram" | "tiktok";

export async function getConnectedAccount(
  userId: string,
  platform: Platform,
): Promise<ConnectedAccountsRow | null> {
  const rows = await getSql()`
    select * from connected_accounts
    where user_id = ${userId} and platform = ${platform}
  `;
  const row = (rows as Record<string, unknown>[])[0];
  return row ? normalizeRow<ConnectedAccountsRow>(row) : null;
}

export async function listConnectedAccounts(
  userId: string,
): Promise<ConnectedAccountsRow[]> {
  const rows = await getSql()`
    select * from connected_accounts where user_id = ${userId}
  `;
  return normalizeRows<ConnectedAccountsRow>(rows as Record<string, unknown>[]);
}

export async function upsertConnectedAccount(input: {
  userId: string;
  platform: Platform;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: string | Date | null;
  platformUserId?: string | null;
  platformUsername?: string | null;
  platformMeta?: Record<string, unknown> | null;
}): Promise<void> {
  await getSql()`
    insert into connected_accounts
      (user_id, platform, access_token, refresh_token, expires_at,
       platform_user_id, platform_username, platform_meta, updated_at)
    values (
      ${input.userId}, ${input.platform}, ${input.accessToken},
      ${input.refreshToken ?? null},
      ${input.expiresAt ? new Date(input.expiresAt).toISOString() : null},
      ${input.platformUserId ?? null}, ${input.platformUsername ?? null},
      ${JSON.stringify(input.platformMeta ?? {})}::jsonb, now()
    )
    on conflict (user_id, platform) do update set
      access_token      = excluded.access_token,
      refresh_token     = excluded.refresh_token,
      expires_at        = excluded.expires_at,
      platform_user_id  = excluded.platform_user_id,
      platform_username = excluded.platform_username,
      platform_meta     = excluded.platform_meta,
      updated_at        = now()
  `;
}

export async function updateConnectedAccountMeta(
  userId: string,
  platform: Platform,
  meta: Record<string, unknown>,
): Promise<void> {
  await getSql()`
    update connected_accounts
    set platform_meta = ${JSON.stringify(meta)}::jsonb, updated_at = now()
    where user_id = ${userId} and platform = ${platform}
  `;
}

export async function deleteConnectedAccount(
  userId: string,
  platform: Platform,
): Promise<void> {
  await getSql()`
    delete from connected_accounts
    where user_id = ${userId} and platform = ${platform}
  `;
}

export async function getProfile(userId: string): Promise<ProfilesRow | null> {
  const rows = await getSql()`select * from profiles where id = ${userId}`;
  const row = (rows as Record<string, unknown>[])[0];
  return row ? normalizeRow<ProfilesRow>(row) : null;
}

/** True when the account's stored token has an expiry that already passed. */
export function isTokenExpired(expiresAt: string | null): boolean {
  return !!expiresAt && new Date(expiresAt) < new Date();
}
