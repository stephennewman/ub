import { redirect } from "next/navigation";

// Deep links to /hub/essay-editor/<id> open the detail drawer on the list
// page, mirroring the notes-synthesizer routing.
export default async function EssayDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/hub/essay-editor?essay=${encodeURIComponent(id)}`);
}
