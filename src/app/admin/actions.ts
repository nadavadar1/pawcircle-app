"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const ADMIN_EMAIL = "nadavadar1@gmail.com";

async function assertIsAdmin() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    throw new Error("not authorized");
  }
}

export async function approveWalker(walkerId: string) {
  await assertIsAdmin();
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("walker_profiles").update({ status: "approved" }).eq("id", walkerId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function approveIdVerification(userId: string) {
  await assertIsAdmin();
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("profiles").update({ id_verified: true }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

// Removes the walker application entirely rather than flipping a status —
// a pending applicant hasn't been visible to anyone yet, so there's no
// "hidden but exists" state worth keeping. Their profile/auth account is
// untouched; they can apply again later via "הרשמה כמטייל/ת".
export async function rejectWalker(walkerId: string) {
  await assertIsAdmin();
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("walker_profiles").delete().eq("id", walkerId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

// Suspends an already-approved walker (e.g. in response to a report) —
// hides them from search/profile pages without deleting their listing,
// since this is meant to be reversible.
export async function suspendWalker(walkerId: string) {
  await assertIsAdmin();
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("walker_profiles").update({ status: "paused" }).eq("id", walkerId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}
