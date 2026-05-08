import { CollegeListBuilder } from "./college-list-builder";
import { PageHeader } from "@/components/page-header";
import { ListIcon } from "@/components/module-icons";

export default function CollegeListPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-5 py-4 sm:px-8 sm:py-6">
      <div className="mb-6">
        <PageHeader
          icon={<ListIcon size={22} />}
          title="College List"
          subtitle="Find U.S. Department of Education College Scorecard data and use it as a draft."
        />
      </div>
      <CollegeListBuilder />
    </div>
  );
}
