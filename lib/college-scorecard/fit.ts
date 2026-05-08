import type { ScorecardSchool } from "./client";

export type FitTier = "reach" | "target" | "likely";

export type StudentStats = {
  satTotal?: number | null;
  actComposite?: number | null;
};

/**
 * Classify a school as Reach / Target / Likely for the given student.
 * Strategy:
 * - Prefer SAT comparison when both school and student have SAT data.
 * - Fall back to ACT, then admission rate alone.
 *
 * This is a simple heuristic and intentionally not "admissions advice."
 * The UI surfaces it as a starting point, with school-level data alongside.
 */
export function classifyFit(
  school: ScorecardSchool,
  student: StudentStats,
): FitTier {
  // SAT-based when possible
  if (school.satMidpoint && student.satTotal) {
    const delta = student.satTotal - school.satMidpoint;
    if (delta < -100) return "reach";
    if (delta > 80) return "likely";
    // fall through to admit-rate refinement
  } else if (school.actMidpoint && student.actComposite) {
    const delta = student.actComposite - school.actMidpoint;
    if (delta < -3) return "reach";
    if (delta > 2) return "likely";
  }

  // Admission-rate fallback / refinement
  const rate = school.admissionRate ?? 0.5;
  if (rate < 0.25) return "reach";
  if (rate > 0.65) return "likely";
  return "target";
}

/**
 * Pick a balanced shortlist: up to N from each tier, preferring schools that
 * have the most data fields populated (Scorecard has gaps).
 */
export function buildShortlist(
  schools: ScorecardSchool[],
  student: StudentStats,
  perTier = 4,
): { reach: ScorecardSchool[]; target: ScorecardSchool[]; likely: ScorecardSchool[] } {
  const buckets = { reach: [] as ScorecardSchool[], target: [] as ScorecardSchool[], likely: [] as ScorecardSchool[] };
  for (const s of schools) {
    buckets[classifyFit(s, student)].push(s);
  }
  const score = (s: ScorecardSchool) =>
    [s.admissionRate, s.satMidpoint ?? s.actMidpoint, s.avgNetPrice, s.completionRate4yr, s.medianEarnings10yr].filter(
      (v) => v !== null && v !== undefined,
    ).length;

  return {
    reach: buckets.reach.sort((a, b) => score(b) - score(a)).slice(0, perTier),
    target: buckets.target.sort((a, b) => score(b) - score(a)).slice(0, perTier),
    likely: buckets.likely.sort((a, b) => score(b) - score(a)).slice(0, perTier),
  };
}
