"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ACTIVE_FRANCHISE_COOKIE } from "./types";
import { ACTIVE_STUDENT_COOKIE } from "@/lib/students/types";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setActiveFranchise(id: string | null): Promise<void> {
  const cookieStore = await cookies();
  if (!id) {
    cookieStore.delete(ACTIVE_FRANCHISE_COOKIE);
  } else {
    cookieStore.set(ACTIVE_FRANCHISE_COOKIE, id, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: ONE_YEAR,
    });
  }
  // Previously-selected student probably belongs to a different franchise;
  // clear it so the picker doesn't show a stale name.
  cookieStore.delete(ACTIVE_STUDENT_COOKIE);
  revalidatePath("/hub", "layout");
}
