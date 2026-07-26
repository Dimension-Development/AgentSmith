import { createHash, randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { ServiceError } from "@/lib/types";

export type ApiKeyPublic = {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
};

export type CreatedApiKey = ApiKeyPublic & {
  /** Full secret — only returned once at creation */
  key: string;
};

function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function generateRawKey(): string {
  // asm_ + 32 bytes hex = distinctive, hard to guess
  return `asm_${randomBytes(32).toString("hex")}`;
}

export async function listApiKeys(
  supabase: SupabaseClient,
  userId: string
): Promise<ApiKeyPublic[]> {
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, created_at, revoked_at, last_used_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new ServiceError(error.message, 500);
  }

  return (data ?? []) as ApiKeyPublic[];
}

export async function createApiKey(
  supabase: SupabaseClient,
  userId: string,
  name: string
): Promise<CreatedApiKey> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new ServiceError("Name is required", 400);
  }

  const raw = generateRawKey();
  const key_hash = hashKey(raw);
  const key_prefix = raw.slice(0, 12);

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      user_id: userId,
      name: trimmed,
      key_prefix,
      key_hash,
    })
    .select("id, name, key_prefix, created_at, revoked_at, last_used_at")
    .single();

  if (error) {
    throw new ServiceError(error.message, 500);
  }

  return {
    ...(data as ApiKeyPublic),
    key: raw,
  };
}

export async function revokeApiKey(
  supabase: SupabaseClient,
  userId: string,
  keyId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("user_id", userId)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new ServiceError(error.message, 500);
  }
  if (!data) {
    throw new ServiceError("API key not found or already revoked", 404);
  }
}

/**
 * Validate a raw API key and return the owning user id.
 * Uses service role (hash lookup must not depend on caller RLS).
 */
export async function authenticateApiKey(
  rawKey: string
): Promise<{ userId: string; keyId: string }> {
  if (!rawKey.startsWith("asm_")) {
    throw new ServiceError("Invalid API key", 401);
  }

  const admin = createAdminClient();
  const key_hash = hashKey(rawKey);

  const { data, error } = await admin
    .from("api_keys")
    .select("id, user_id, revoked_at")
    .eq("key_hash", key_hash)
    .maybeSingle();

  if (error) {
    throw new ServiceError(error.message, 500);
  }
  if (!data || data.revoked_at) {
    throw new ServiceError("Invalid or revoked API key", 401);
  }

  // Best-effort last_used_at (ignore errors)
  void admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return { userId: data.user_id as string, keyId: data.id as string };
}
