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
