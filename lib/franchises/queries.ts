import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  ACTIVE_FRANCHISE_COOKIE,
  type Franchise,
  type FranchiseRole,
  type Membership,
} from "./types";

type DbMembershipRow = {
  role: FranchiseRole;
  franchises: {
    id: string;
    name: string;
    slug: string | null;
    city: string | null;
    state: string | null;
  } | null;
};

/**
 * All franchises the signed-in user is a member of, in stable order.
 */
export async function listMyMemberships(): Promise<Membership[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("role, franchises ( id, name, slug, city, state )")
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("listMyMemberships failed:", error.message);
    return [];
  }
  const rows = (data ?? []) as unknown as DbMembershipRow[];
  return rows
    .filter((r) => r.franchises)
    .map((r) => ({
      role: r.role,
      franchise: {
        id: r.franchises!.id,
        name: r.franchises!.name,
        slug: r.franchises!.slug,
        city: r.franchises!.city,
        state: r.franchises!.state,
      },
    }));
}

/**
 * Resolve the active franchise from cookie, falling back to the first
 * membership. Returns null only if the user has no memberships at all.
 */
export async function getActiveFranchise(
  memberships?: Membership[],
): Promise<Membership | null> {
  const list = memberships ?? (await listMyMemberships());
  if (list.length === 0) return null;

  const cookieStore = await cookies();
  const cookieId = cookieStore.get(ACTIVE_FRANCHISE_COOKIE)?.value;
  if (cookieId) {
    const match = list.find((m) => m.franchise.id === cookieId);
    if (match) return match;
  }
  return list[0];
}

/**
 * Bootstrap: if the signed-in user has no memberships, create a personal
 * "<email-localpart>'s workspace" franchise and add them as owner.
 *
 * This is the day-1 path before invites exist. Once an invite system is
 * built, new users will be added directly to an existing franchise and this
 * function will only fire for true self-serve sign-ups.
 *
 * Uses RLS-bound queries — the insert into `franchises` is allowed because
 * the table has no INSERT policy (i.e. denied), so we route through a
 * SECURITY DEFINER RPC. For the preview, we accept that the user inserts
 * directly: `franchises_insert_self` policy is added below.
 */
export async function ensureBootstrapMembership(
  userId: string,
  email: string,
): Promise<void> {
  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("memberships")
    .select("franchise_id", { count: "exact", head: true });
  if (countError) {
    console.warn("ensureBootstrapMembership count failed:", countError.message);
    return;
  }
  if ((count ?? 0) > 0) return;

  const local = email.split("@")[0] || "Counselor";
  const name = `${local}'s workspace`;

  const { data: franchise, error: insertError } = await supabase
    .from("franchises")
    .insert({ name, slug: `user-${userId}` })
    .select("id")
    .single();
  if (insertError || !franchise) {
    console.warn(
      "ensureBootstrapMembership franchise insert failed:",
      insertError?.message,
    );
    return;
  }

  const { error: memberError } = await supabase
    .from("memberships")
    .insert({
      user_id: userId,
      franchise_id: franchise.id,
      role: "owner",
    });
  if (memberError) {
    console.warn(
      "ensureBootstrapMembership membership insert failed:",
      memberError.message,
    );
  }
}

/**
 * Server-side helper used by API routes & server actions to know which
 * franchise to stamp on writes.
 */
export async function getActiveFranchiseId(): Promise<string | null> {
  const active = await getActiveFranchise();
  return active?.franchise.id ?? null;
}

export type { Franchise, Membership, FranchiseRole };
