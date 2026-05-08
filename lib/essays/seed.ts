import { createClient } from "@/lib/supabase/server";

type StudentSeed = {
  id: string;
  first_name: string;
};

/**
 * Drop one polished demo essay into a franchise the first time a user
 * lands in it. The intent is to give the Essay Editor list page
 * something to click into so the side-by-side view is discoverable.
 *
 * Idempotent in two ways: a row probe short-circuits the common case,
 * and the partial unique index on (franchise_id, student_id, model)
 * where model='demo-seed' makes duplicate inserts impossible at the
 * DB level under races. We attach one demo essay per student so the
 * sample is reachable regardless of which student is active.
 */
export async function ensureSeededEssays(
  userId: string,
  franchiseId: string,
): Promise<boolean> {
  const supabase = await createClient();

  const { data: existing, error: existsError } = await supabase
    .from("essays")
    .select("id")
    .eq("franchise_id", franchiseId)
    .limit(1);
  if (existsError) {
    console.warn("ensureSeededEssays probe failed:", existsError.message);
    return false;
  }
  if ((existing?.length ?? 0) > 0) return false;

  const { data: studentsData, error: studentsError } = await supabase
    .from("students")
    .select("id, first_name")
    .eq("franchise_id", franchiseId)
    .order("first_name", { ascending: true });
  if (studentsError) {
    console.warn("ensureSeededEssays students fetch failed:", studentsError.message);
    return false;
  }
  const students = (studentsData ?? []) as StudentSeed[];
  if (students.length === 0) return false;

  const rows = students.map((student) => buildDemoEssay(userId, franchiseId, student));

  const { error: insertError } = await supabase.from("essays").insert(rows);
  if (insertError) {
    if (!/duplicate key value/i.test(insertError.message)) {
      console.warn("ensureSeededEssays insert failed:", insertError.message);
    }
    return false;
  }
  return true;
}

// ---------- Demo content ---------------------------------------------------

const DEMO_PROMPT =
  "Some students have a background, identity, interest, or talent that is so meaningful they believe their application would be incomplete without it. If this sounds like you, please share your story.";

const DEMO_ORIGINAL = `Ever since I was little, I have always loved to play soccer. Soccer has taught me so many important life lessons like teamwork, hard work, and never giving up. When I was 12, I joined my first travel team and I learned that being part of a team is one of the most important things in life. We won a lot of games and we lost a lot of games, but through it all, I kept going. I think soccer has shaped me into the person I am today and I am very grateful for everything it has given me. In conclusion, soccer is more than just a sport to me — it is a way of life.`;

const DEMO_REVISED = `I didn't choose soccer — my dad did. At six, I hated the early Saturday mornings and the way my shins stung after every practice. But by twelve, when I made my first travel team, something shifted. I wasn't just running drills anymore; I was solving problems.

Our coach used to say, "Soccer is chess at full sprint." I didn't get it until our semifinal against a team that had beaten us twice that season. They were faster and more aggressive. But in the second half, I noticed their left back kept drifting too far upfield on corners. I called it out to our striker, and two plays later, we caught them on the counter. We won 2–1.

That moment taught me something I carry into everything now: patterns matter. Whether I'm troubleshooting a stubborn line of code or figuring out why a project plan keeps slipping, I look for the gap — the thing everyone else is missing. Soccer trained me to see systems, not just pieces.

I still play, but the lens has widened. The same instinct that helped me read a backline now helps me read a problem set, a research paper, or a teammate having a bad week. Soccer taught me to move fast and think faster. I'm learning that "fast" and "thoughtful" don't have to trade against each other — and that the most interesting work happens where they meet.`;

const DEMO_SUMMARY = `- Replaced the generic opening and clichés ("ever since I was little," "life lessons") with a specific, surprising detail (hating soccer at first)
- Cut filler phrases ("In conclusion," "I am very grateful") and vague abstractions in favor of a concrete game anecdote
- Added a bridge from soccer to a transferable thinking habit (pattern recognition) so the essay says something about the writer beyond the sport
- Tightened sentences and varied rhythm; removed the formulaic conclusion`;

const DEMO_COMMENTS = [
  {
    type: "strength",
    title: "You have a real story to tell",
    body: "The travel-team experience and the semifinal moment are specific and memorable. Admissions readers see hundreds of soccer essays — yours stands out because you zoom in on one play and what you noticed.",
  },
  {
    type: "fix",
    title: "The original leaned heavily on clichés",
    body: "Phrases like 'life lessons,' 'never giving up,' and 'soccer is a way of life' are so common they become invisible. The revision shows what soccer taught you through action, not by naming abstract values.",
  },
  {
    type: "fix",
    title: "The draft didn't connect outward",
    body: "Personal statements need to tell the reader something about how you think — not just what you've done. The revision bridges soccer to pattern recognition so the story has a takeaway beyond the sport.",
  },
  {
    type: "consider",
    title: "You could go deeper on one transfer moment",
    body: "If you have a specific instance where the soccer instinct showed up in an academic or personal context, that moment could expand. It's the most distinctive part of the essay and the easiest to make uniquely yours.",
  },
];

function buildDemoEssay(
  userId: string,
  franchiseId: string,
  student: StudentSeed,
) {
  const audienceContext = [
    "Type: Common App personal statement",
    "Word limit: 650",
    "Notes: Voice should stay reflective; the cliché-heavy draft needs tightening.",
  ].join(" | ");

  return {
    user_id: userId,
    franchise_id: franchiseId,
    student_id: student.id,
    title: "Common App personal statement",
    prompt: DEMO_PROMPT,
    audience_context: audienceContext,
    original_draft: DEMO_ORIGINAL,
    revised_draft: DEMO_REVISED,
    summary_of_changes: DEMO_SUMMARY,
    comments_json: DEMO_COMMENTS,
    model: "demo-seed",
  };
}
