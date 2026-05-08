import { CollegeListBuilder } from "./college-list-builder";

export default function CollegeListPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-5 py-4 sm:px-8 sm:py-6">
      <div className="mb-6 space-y-1.5">
        <h1 className="text-2xl tracking-tight text-ink sm:text-3xl">
          Search colleges for a student.
        </h1>
        <p className="max-w-4xl text-sm text-ink-soft sm:text-base">
          Find U.S. Department of Education College Scorecard data and use
          it as a draft.
        </p>
      </div>
      <CollegeListBuilder />
    </div>
  );
}
