import { createClient } from "@/lib/supabase/server";

type StudentSeed = {
  id: string;
  first_name: string;
  grade_level: string | null;
  major_interest: string | null;
};

/**
 * If the active franchise has students but zero sessions, drop in a small
 * varied set of demo sessions so the Notes Synthesizer feels populated on
 * first visit. Idempotent in two ways: a row probe short-circuits the
 * common case, and a partial unique index on
 * (franchise_id, student_id, meeting_date) where model='demo-seed' makes
 * duplicate inserts impossible at the DB level even under races.
 */
export async function ensureSeededSessions(
  userId: string,
  franchiseId: string,
): Promise<boolean> {
  const supabase = await createClient();

  // Use a row probe instead of `count`. Supabase's HEAD-mode count has
  // returned `null` in past renders, which made `(count ?? 0) > 0` falsy
  // and caused repeat-insert bursts. A `limit(1)` row probe is unambiguous.
  const { data: existing, error: existsError } = await supabase
    .from("sessions")
    .select("id")
    .eq("franchise_id", franchiseId)
    .limit(1);
  if (existsError) {
    console.warn("ensureSeededSessions probe failed:", existsError.message);
    return false;
  }
  if ((existing?.length ?? 0) > 0) return false;

  const { data: studentsData, error: studentsError } = await supabase
    .from("students")
    .select("id, first_name, grade_level, major_interest")
    .eq("franchise_id", franchiseId)
    .order("first_name", { ascending: true });
  if (studentsError) {
    console.warn("ensureSeededSessions students fetch failed:", studentsError.message);
    return false;
  }
  const students = (studentsData ?? []) as StudentSeed[];
  if (students.length === 0) return false;

  // Two sessions per student, each pulled from a different scenario so the
  // table shows variety. Scenario assignment is deterministic by student
  // index so re-runs (after manual deletes) stay consistent.
  const now = new Date();
  const rows = students.flatMap((student, idx) => {
    return [0, 1].map((occurrence) => {
      const scenarioIdx = (idx * 2 + occurrence) % SCENARIOS.length;
      const scenario = SCENARIOS[scenarioIdx];
      const daysAgo = (idx * 5) + (occurrence * 14) + 3;
      const meetingDate = new Date(now);
      meetingDate.setDate(meetingDate.getDate() - daysAgo);
      const iso = meetingDate.toISOString().slice(0, 10);
      return {
        user_id: userId,
        franchise_id: franchiseId,
        student_id: student.id,
        student_first_name: student.first_name,
        grade_level: student.grade_level,
        meeting_date: iso,
        transcript: scenario.transcript(student, iso),
        summary: scenario.summary(student, iso),
        model: "demo-seed",
      };
    });
  });

  // Plain insert. The partial unique index on
  // (franchise_id, student_id, meeting_date) where model='demo-seed' makes
  // a race-loser's insert fail with a constraint error rather than create a
  // duplicate row — exactly the safety net we want. We swallow the error
  // because the only way to hit it is a near-simultaneous second seed
  // attempt, which is harmless.
  const { error: insertError } = await supabase.from("sessions").insert(rows);
  if (insertError) {
    if (!/duplicate key value/i.test(insertError.message)) {
      console.warn("ensureSeededSessions insert failed:", insertError.message);
    }
    return false;
  }
  return true;
}

type Scenario = {
  key: string;
  transcript: (s: StudentSeed, iso: string) => string;
  summary: (s: StudentSeed, iso: string) => string;
};

// ---------- Scenarios ------------------------------------------------------
// Distinct advising scenes so the seeded sessions don't all read the same.
// Each one emphasises a different planning pillar.

const SCENARIOS: Scenario[] = [
  // 1. Test prep heavy — early-year cadence-setting
  {
    key: "test-prep-cadence",
    transcript: (s, iso) => {
      const focus = s.major_interest || "your interests";
      return `[Demo seed transcript · ${iso}]

Counselor: Good to see you, ${s.first_name}. Let's spend most of today on testing.

${s.first_name}: That's the part stressing me out, honestly.

Counselor: Where are you starting? Tell me about your last full-length.

${s.first_name}: 26 composite. Reading was 22, English was 28, Math was 27, Science was 27.

Counselor: Reading is the lever then. We'll do a daily 10-minute drill — short passages, timed, no notes. Three days a week we'll add a section practice.

${s.first_name}: Will that actually move the score?

Counselor: For Reading, the gain comes from pacing and confidence, not new content. Most students see 3–5 points in eight weeks with that cadence.

${s.first_name}: Okay. What test date are we aiming at?

Counselor: December. That gives us nine weeks of structured prep plus one buffer week.

${s.first_name}: My parents asked about prep classes.

Counselor: For your profile, self-paced with a coach is more efficient. Save the class money for an essay editor later if you need one.

${s.first_name}: That makes sense. School is fine — APs are heavy but I'm keeping up.

Counselor: Great. Don't drop study time from school for ACT prep. Cut social stuff first.

${s.first_name}: Noted.

Counselor: Bring your December registration confirmation next time, plus your score-send strategy. We'll keep college-list work light until after the test.`;
    },
    summary: (s, iso) => `## Session Summary
Testing-focused check-in with ${s.first_name} on ${iso}. Diagnostic ACT was a 26 composite with Reading as the clear weak section. We set a structured nine-week prep plan and locked in the December sitting.

## Key Decisions
- Target the December ACT
- 10-minute daily Reading drills + 3 timed sections per week
- Skip prep classes; self-paced with coach support

## Next Steps for the Student
- Register for the December ACT (this week)
- Start the daily Reading drill tomorrow
- Bring a completed full-length to the next session

## Next Steps for Parents
- Hold off on prep-class spend; revisit after the December score
- Confirm test-day logistics

## Pillar Coverage
- 🟡 Academics — Light touch
- ✅ Test Prep — Covered
- ⚪ College List — Not covered
- ⚪ Essays — Not covered
- ⚪ Activities & Resume — Not covered
- ⚪ Scholarships & Financial Aid — Not covered

## Suggested Focus for Next Session
- Review the first full-length under the new plan
- Begin a working college list
- Light essay-topic brainstorm`,
  },

  // 2. College list build — exploratory
  {
    key: "list-build",
    transcript: (s, iso) => {
      const focus = s.major_interest || "your academic interests";
      return `[Demo seed transcript · ${iso}]

Counselor: Today is mostly list day. I asked you to come with five.

${s.first_name}: I have seven, actually. I overshot.

Counselor: Walk me through them in tiers — what feels like a reach, target, and safety to you?

${s.first_name}: Reach: Vanderbilt, Duke. Target: UNC, Wake Forest, Furman. Safety: Clemson, App State.

Counselor: Decent geographic clustering — that's intentional?

${s.first_name}: Yeah, my parents want me within driving distance of home.

Counselor: Fair. Two issues. Furman and Wake aren't really targets at your current GPA — they're lower-end reaches. Clemson is a high target, not a safety. App State is your real safety.

${s.first_name}: So I need a true target?

Counselor: Yes. Let's add UofSC and Charleston. Both are strong fits academically and admissions-wise, and ${focus} has good options at both.

${s.first_name}: Okay. I didn't know UofSC was that strong.

Counselor: It is. Visit if you can.

${s.first_name}: We're driving down in two weeks for break.

Counselor: Add a campus tour. While you're there, sit in on a class if they offer it.

${s.first_name}: For deadlines — when do I need decisions?

Counselor: We'll formalize the list by your next session. Early Action deadlines start November 1, so we have time, but not much.

${s.first_name}: Got it.`;
    },
    summary: (s, iso) => `## Session Summary
List-building session with ${s.first_name} on ${iso}. Working draft is seven schools with good geographic coherence; we recalibrated tiers and added two genuine targets.

## Key Decisions
- Added UofSC and College of Charleston as targets
- Reclassified Furman and Wake Forest as lower reaches
- Treat App State as the true safety; Clemson is a high target

## Next Steps for the Student
- Confirm the 9-school working list before next session
- Add a UofSC campus visit during the upcoming trip
- Begin reading admissions pages for each school's ${s.major_interest ? "interest area" : "core programs"}

## Next Steps for Parents
- Coordinate the campus visit logistics
- Review the working list before the next meeting

## Pillar Coverage
- ⚪ Academics — Not covered
- ⚪ Test Prep — Not covered
- ✅ College List — Covered
- ⚪ Essays — Not covered
- ⚪ Activities & Resume — Not covered
- ⚪ Scholarships & Financial Aid — Not covered

## Suggested Focus for Next Session
- Lock the final list with deadlines mapped
- Begin essay topic brainstorming
- Quick activities-resume check`,
  },

  // 3. Essay brainstorming
  {
    key: "essay-brainstorm",
    transcript: (s, iso) => {
      return `[Demo seed transcript · ${iso}]

Counselor: Today is essay day. Did you bring three angles?

${s.first_name}: I have two strong ones and one that I'm not sure about.

Counselor: Walk me through them.

${s.first_name}: First: my grandmother teaching me to bake bread on weekends, and what I learned about patience. Second: rebuilding the lawnmower with my dad after it died. Third: feeling out of place at my new school last year.

Counselor: Honest feedback. The bread one is a cliché trap — every reader has seen "grandparent taught me values" essays. The lawnmower has real material because it's specific and the failure was real. The new-school one could go either way depending on how you frame it.

${s.first_name}: I figured the bread one was risky.

Counselor: It can work, but only if you find a non-obvious angle. I'd start with the lawnmower draft instead.

${s.first_name}: Okay. What does a draft look like?

Counselor: 700–800 words, no edits, just get the story out. Don't try to "be a writer" — write how you talk. We'll polish in the next round.

${s.first_name}: Should the lawnmower angle have a "lesson learned" part?

Counselor: It should have a moment of insight, but don't telegraph it. Show, don't tell.

${s.first_name}: I'll have the draft by Tuesday.

Counselor: Good. Bring it in Markdown or pasted into a doc — we'll workshop it live.`;
    },
    summary: (s, iso) => `## Session Summary
Essay brainstorming session with ${s.first_name} on ${iso}. Three angles on the table; we narrowed to the lawnmower-with-dad story as the strongest first draft, with new-school as a possible Plan B.

## Key Decisions
- Lead with the lawnmower angle for the personal statement draft
- Skip the grandmother/baking angle — too cliché-prone
- Hold the new-school angle as a backup

## Next Steps for the Student
- Draft 700–800 words on the lawnmower story by Tuesday
- Bring the draft as plain text or shared doc
- Resist editing until the full draft is down

## Next Steps for Parents
- Give the student space to draft without input this week

## Pillar Coverage
- ⚪ Academics — Not covered
- ⚪ Test Prep — Not covered
- ⚪ College List — Not covered
- ✅ Essays — Covered
- ⚪ Activities & Resume — Not covered
- ⚪ Scholarships & Financial Aid — Not covered

## Suggested Focus for Next Session
- Workshop the personal statement first draft
- Begin supplement inventory across the list
- Quick test-prep status check`,
  },

  // 4. Activities and resume tightening
  {
    key: "activities-resume",
    transcript: (s, iso) => {
      const focus = s.major_interest || "your interests";
      return `[Demo seed transcript · ${iso}]

Counselor: Let's pull up your activities list. How many are you tracking right now?

${s.first_name}: Maybe twelve? Some of them I've barely touched.

Counselor: That's the issue. The Common App allows ten, and "barely touched" reads as filler. Quality beats volume here.

${s.first_name}: How do I decide what to cut?

Counselor: Three filters. First: did you spend real time on it — at least 30 hours over a year? Second: did you grow a role over time, or stay flat? Third: does it tie to ${focus} or a clearly-articulated personal thread?

${s.first_name}: Okay. By that I'd cut Math Club, the random volunteering days, and probably the church youth group since I'm not active anymore.

Counselor: Good. That gets us to nine. We can leave the tenth slot open or fill it with something specific you do this summer.

${s.first_name}: For descriptions — how detailed?

Counselor: 150 characters per activity, action verb first, quantify when you can. "Tutored 8 middle schoolers weekly in algebra; built shared problem set used by 3 grade-level teachers."

${s.first_name}: Got it.

Counselor: Honors section. What's there?

${s.first_name}: AP Scholar, National Honor Society, county art show finalist.

Counselor: Solid. We'll order honors by selectivity — keep the most selective up top.`;
    },
    summary: (s, iso) => `## Session Summary
Activities and honors review with ${s.first_name} on ${iso}. Pruned the activity list from twelve to nine focused entries and tightened the framing of the honors section.

## Key Decisions
- Cut Math Club, sporadic volunteering, and inactive church youth group
- Reserve tenth activity slot for a summer-specific entry
- Order honors by selectivity, most selective first

## Next Steps for the Student
- Rewrite each activity description as 150-character action verb statements
- Quantify impact (hours, people, output) wherever possible
- Identify a summer commitment to fill the open slot

## Next Steps for Parents
- Help track summer hours toward the open slot

## Pillar Coverage
- ⚪ Academics — Not covered
- ⚪ Test Prep — Not covered
- ⚪ College List — Not covered
- ⚪ Essays — Not covered
- ✅ Activities & Resume — Covered
- ⚪ Scholarships & Financial Aid — Not covered

## Suggested Focus for Next Session
- Review tightened activity descriptions
- Begin scholarship search aligned with profile
- Check progress on essay drafts`,
  },

  // 5. Scholarship + financial aid
  {
    key: "scholarship-aid",
    transcript: (s, iso) => {
      const focus = s.major_interest || "your area of interest";
      return `[Demo seed transcript · ${iso}]

Counselor: Today's about money. We need a real scholarship plan.

${s.first_name}: My parents have been asking. I haven't done much.

Counselor: That's why we're starting now. Three buckets: institutional, local, national. Institutional is biggest — it's the merit money the schools on your list automatically consider you for.

${s.first_name}: Do I have to apply separately?

Counselor: Sometimes. UofSC and Clemson have priority deadlines that gate full scholarship review — those are firm dates we cannot miss. I'll send you the list.

${s.first_name}: What about local?

Counselor: Local is volume work. Your state and county have small scholarships ($500–$5,000) where the applicant pool is thin. The ROI is excellent if you're disciplined.

${s.first_name}: How many should I apply to?

Counselor: Ten over the next twelve weeks. One per week pace. Some will recycle the personal statement; some need new short essays.

${s.first_name}: Okay.

Counselor: National is the wildest. Big scholarships like Coca-Cola Scholars are essentially national contests — apply if eligible, but don't bank on them.

${s.first_name}: Got it.

Counselor: Last thing — FAFSA opens October 1. Your parents need their tax info ready. I'll send the document checklist tonight.

${s.first_name}: They'll be ready.`;
    },
    summary: (s, iso) => `## Session Summary
Scholarship and financial-aid planning with ${s.first_name} on ${iso}. Three-bucket approach (institutional, local, national) with a 10-application target over twelve weeks and FAFSA prep on the parent side.

## Key Decisions
- Apply to 10 local scholarships over the next 12 weeks (1/week pace)
- Treat institutional priority deadlines as firm (UofSC, Clemson)
- Pursue national scholarships opportunistically only

## Next Steps for the Student
- Start the first local scholarship application this week
- Re-use the personal statement draft where appropriate
- Confirm priority-scholarship deadlines for all schools on the list

## Next Steps for Parents
- Gather tax documents for FAFSA (October 1 opening)
- Review the priority-deadline list

## Pillar Coverage
- ⚪ Academics — Not covered
- ⚪ Test Prep — Not covered
- 🟡 College List — Light touch
- ⚪ Essays — Not covered
- ⚪ Activities & Resume — Not covered
- ✅ Scholarships & Financial Aid — Covered

## Suggested Focus for Next Session
- Review the first scholarship application
- Confirm FAFSA submission status
- Map essay reuse across applications`,
  },
];
