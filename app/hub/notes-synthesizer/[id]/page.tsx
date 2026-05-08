import { redirect } from "next/navigation";

// Deep links to /hub/notes-synthesizer/<id> open the drawer experience on
// the list page instead of a separate detail page.
export default async function SessionDeepLink({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/hub/notes-synthesizer?session=${id}`);
}
