"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_STUDENT_COOKIE, type Student } from "./types";
import { getActiveFranchiseId } from "@/lib/franchises/queries";

export type CreateStudentInput = {
  firstName: string;
  lastName?: string;
  gradeLevel?: string;
  gpa?: number | null;
  satTotal?: number | null;
  actComposite?: number | null;
  majorInterest?: string;
};

export type CreateStudentResult =
  | { ok: true; student: Student }
  | { ok: false; error: string };

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setActiveStudent(id: string | null): Promise<void> {
  const cookieStore = await cookies();
  if (!id) {
    cookieStore.delete(ACTIVE_STUDENT_COOKIE);
  } else {
    cookieStore.set(ACTIVE_STUDENT_COOKIE, id, {
      httpOnly: false, // readable from client for context hydration
      sameSite: "lax",
      path: "/",
      maxAge: ONE_YEAR,
    });
  }
  revalidatePath("/hub", "layout");
}

export async function createStudent(
  input: CreateStudentInput,
): Promise<CreateStudentResult> {
  const firstName = input.firstName.trim();
  if (!firstName) return { ok: false, error: "First name is required." };

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return { ok: false, error: "Not signed in." };

  const franchiseId = await getActiveFranchiseId();
  if (!franchiseId) {
    return { ok: false, error: "No active franchise. Refresh and try again." };
  }

  const { data, error } = await supabase
    .from("students")
    .insert({
      user_id: userId,
      franchise_id: franchiseId,
      first_name: firstName,
      last_name: input.lastName?.trim() || null,
      grade_level: input.gradeLevel || null,
      gpa: input.gpa ?? null,
      sat_total: input.satTotal ?? null,
      act_composite: input.actComposite ?? null,
      major_interest: input.majorInterest?.trim() || null,
    })
    .select(
      "id, first_name, last_name, grade_level, gpa, sat_total, act_composite, major_interest, notes, created_at",
    )
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not create student." };
  }

  // Auto-select the freshly-created student.
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_STUDENT_COOKIE, data.id, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });

  revalidatePath("/hub", "layout");

  return {
    ok: true,
    student: {
      id: data.id,
      firstName: data.first_name,
      lastName: data.last_name,
      gradeLevel: data.grade_level,
      gpa: data.gpa,
      satTotal: data.sat_total,
      actComposite: data.act_composite,
      majorInterest: data.major_interest,
      notes: data.notes,
      createdAt: data.created_at,
    },
  };
}
