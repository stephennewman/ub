import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_STUDENT_COOKIE, type Student } from "./types";
import { getActiveFranchiseId } from "@/lib/franchises/queries";

type DbStudent = {
  id: string;
  first_name: string;
  last_name: string | null;
  grade_level: string | null;
  gpa: number | null;
  sat_total: number | null;
  act_composite: number | null;
  major_interest: string | null;
  notes: string | null;
  created_at: string;
};

function toStudent(row: DbStudent): Student {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    gradeLevel: row.grade_level,
    gpa: row.gpa,
    satTotal: row.sat_total,
    actComposite: row.act_composite,
    majorInterest: row.major_interest,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

const SELECT_FIELDS =
  "id, first_name, last_name, grade_level, gpa, sat_total, act_composite, major_interest, notes, created_at";

export async function listStudents(): Promise<Student[]> {
  const supabase = await createClient();
  // RLS allows reading students from any franchise the user belongs to,
  // but the picker should only show students for the *active* franchise.
  const franchiseId = await getActiveFranchiseId();
  if (!franchiseId) return [];

  const { data, error } = await supabase
    .from("students")
    .select(SELECT_FIELDS)
    .eq("franchise_id", franchiseId)
    .order("first_name", { ascending: true });
  if (error) {
    console.warn("listStudents failed:", error.message);
    return [];
  }
  return (data ?? []).map((d) => toStudent(d as DbStudent));
}

export async function getStudentById(id: string): Promise<Student | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select(SELECT_FIELDS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.warn("getStudentById failed:", error.message);
    return null;
  }
  return data ? toStudent(data as DbStudent) : null;
}

/**
 * Resolve the active student from cookie. Returns null if unset, or if the
 * cookie points at a student the current user no longer owns (RLS will hide
 * the row, in which case we silently clear stale state on read).
 */
export async function getActiveStudent(): Promise<Student | null> {
  const cookieStore = await cookies();
  const id = cookieStore.get(ACTIVE_STUDENT_COOKIE)?.value;
  if (!id) return null;
  const student = await getStudentById(id);
  return student;
}

const SEED_STUDENTS: Array<Omit<DbStudent, "id" | "created_at">> = [
  {
    first_name: "Maya",
    last_name: "Rivera",
    grade_level: "11th grade",
    gpa: 3.7,
    sat_total: 1320,
    act_composite: null,
    major_interest: "Computer science",
    notes: null,
  },
  {
    first_name: "Jordan",
    last_name: "Mitchell",
    grade_level: "12th grade",
    gpa: 3.5,
    sat_total: null,
    act_composite: 27,
    major_interest: "Business",
    notes: null,
  },
  {
    first_name: "Lila",
    last_name: "Wong",
    grade_level: "10th grade",
    gpa: 3.9,
    sat_total: 1450,
    act_composite: null,
    major_interest: "Pre-med (biology)",
    notes: null,
  },
  {
    first_name: "Ben",
    last_name: "Thompson",
    grade_level: "Super Junior",
    gpa: 3.2,
    sat_total: null,
    act_composite: 22,
    major_interest: "Undecided",
    notes: null,
  },
];

/**
 * If the current franchise has zero students, insert the demo seed list.
 * Idempotent. Safe to call on every hub-layout render.
 */
export async function ensureSeededStudents(
  userId: string,
  franchiseId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("franchise_id", franchiseId);
  if (countError) {
    console.warn("ensureSeededStudents count failed:", countError.message);
    return false;
  }
  if ((count ?? 0) > 0) return false;

  const rows = SEED_STUDENTS.map((s) => ({
    ...s,
    user_id: userId,
    franchise_id: franchiseId,
  }));
  const { error: insertError } = await supabase.from("students").insert(rows);
  if (insertError) {
    console.warn("ensureSeededStudents insert failed:", insertError.message);
    return false;
  }
  return true;
}
