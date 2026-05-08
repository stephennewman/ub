/**
 * Thin wrapper around the U.S. Department of Education's College Scorecard API.
 * Docs: https://collegescorecard.ed.gov/data/documentation/
 *
 * The API requires a free api.data.gov key. We fall back to DEMO_KEY for local
 * development, which is heavily rate-limited (30 req/hr, 50/day).
 */

const BASE = "https://api.data.gov/ed/collegescorecard/v1/schools";

export type ScorecardSchool = {
  id: number;
  name: string;
  city: string;
  state: string;
  controlLabel: "Public" | "Private nonprofit" | "Private for-profit" | "Unknown";
  size: number | null;
  admissionRate: number | null;
  satMidpoint: number | null;
  actMidpoint: number | null;
  avgNetPrice: number | null;
  completionRate4yr: number | null;
  medianEarnings10yr: number | null;
  schoolUrl: string | null;
  scorecardUrl: string;
};

export type ScorecardQuery = {
  states?: string[]; // e.g. ["NY", "NJ"]
  control?: "public" | "private" | "either";
  sizeBucket?: "small" | "medium" | "large" | "any";
  maxNetPrice?: number | null; // dollars
  perPage?: number; // default 50
};

const FIELDS = [
  "id",
  "school.name",
  "school.city",
  "school.state",
  "school.school_url",
  "school.ownership",
  "latest.student.size",
  "latest.admissions.admission_rate.overall",
  "latest.admissions.sat_scores.midpoint.critical_reading",
  "latest.admissions.sat_scores.midpoint.math",
  "latest.admissions.act_scores.midpoint.cumulative",
  "latest.cost.avg_net_price.public",
  "latest.cost.avg_net_price.private",
  "latest.completion.completion_rate_4yr_150nt",
  "latest.earnings.10_yrs_after_entry.median",
].join(",");

function ownershipLabel(code: number | null | undefined): ScorecardSchool["controlLabel"] {
  if (code === 1) return "Public";
  if (code === 2) return "Private nonprofit";
  if (code === 3) return "Private for-profit";
  return "Unknown";
}

function sizeRange(bucket: ScorecardQuery["sizeBucket"]): string | null {
  switch (bucket) {
    case "small":
      return "..3000";
    case "medium":
      return "3001..10000";
    case "large":
      return "10001..";
    default:
      return null;
  }
}

export async function searchSchools(q: ScorecardQuery): Promise<ScorecardSchool[]> {
  const apiKey = process.env.COLLEGE_SCORECARD_API_KEY || "DEMO_KEY";

  const params = new URLSearchParams();
  params.set("api_key", apiKey);
  params.set("fields", FIELDS);
  params.set("per_page", String(q.perPage ?? 50));
  // Bachelor's-predominant, currently operating, has admission rate data
  params.set("school.degrees_awarded.predominant", "3");
  params.set("school.operating", "1");
  params.set("latest.admissions.admission_rate.overall__range", "0.01..1.0");
  // Sort by admission rate ascending so we get a spread of selectivity
  params.set("sort", "latest.admissions.admission_rate.overall:asc");

  if (q.states && q.states.length > 0) {
    params.set("school.state", q.states.join(","));
  }
  if (q.control === "public") {
    params.set("school.ownership", "1");
  } else if (q.control === "private") {
    params.set("school.ownership__in", "2,3");
  }
  const sr = sizeRange(q.sizeBucket);
  if (sr) {
    params.set("latest.student.size__range", sr);
  }

  const res = await fetch(`${BASE}?${params.toString()}`, {
    // Scorecard data updates yearly; cache aggressively.
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Scorecard ${res.status}: ${detail.slice(0, 200)}`);
  }

  const json = (await res.json()) as { results?: RawResult[] };
  const rows = (json.results ?? []).map(toSchool);

  // Net-price filtering happens client-side because Scorecard splits public
  // vs private into different fields.
  if (q.maxNetPrice && q.maxNetPrice > 0) {
    return rows.filter(
      (r) => r.avgNetPrice !== null && r.avgNetPrice <= (q.maxNetPrice ?? Infinity),
    );
  }
  return rows;
}

type RawResult = {
  id: number;
  "school.name": string;
  "school.city": string;
  "school.state": string;
  "school.school_url": string | null;
  "school.ownership": number | null;
  "latest.student.size": number | null;
  "latest.admissions.admission_rate.overall": number | null;
  "latest.admissions.sat_scores.midpoint.critical_reading": number | null;
  "latest.admissions.sat_scores.midpoint.math": number | null;
  "latest.admissions.act_scores.midpoint.cumulative": number | null;
  "latest.cost.avg_net_price.public": number | null;
  "latest.cost.avg_net_price.private": number | null;
  "latest.completion.completion_rate_4yr_150nt": number | null;
  "latest.earnings.10_yrs_after_entry.median": number | null;
};

function toSchool(r: RawResult): ScorecardSchool {
  const reading = r["latest.admissions.sat_scores.midpoint.critical_reading"];
  const math = r["latest.admissions.sat_scores.midpoint.math"];
  const satMidpoint =
    typeof reading === "number" && typeof math === "number" ? reading + math : null;

  const ownership = r["school.ownership"];
  const netPrice =
    ownership === 1
      ? r["latest.cost.avg_net_price.public"]
      : r["latest.cost.avg_net_price.private"];

  return {
    id: r.id,
    name: r["school.name"],
    city: r["school.city"],
    state: r["school.state"],
    controlLabel: ownershipLabel(ownership),
    size: r["latest.student.size"],
    admissionRate: r["latest.admissions.admission_rate.overall"],
    satMidpoint,
    actMidpoint: r["latest.admissions.act_scores.midpoint.cumulative"],
    avgNetPrice: netPrice ?? null,
    completionRate4yr: r["latest.completion.completion_rate_4yr_150nt"],
    medianEarnings10yr: r["latest.earnings.10_yrs_after_entry.median"],
    schoolUrl: r["school.school_url"]
      ? r["school.school_url"].startsWith("http")
        ? r["school.school_url"]
        : `https://${r["school.school_url"]}`
      : null,
    scorecardUrl: `https://collegescorecard.ed.gov/school/?${r.id}`,
  };
}
