import { redirect } from "next/navigation";

// Deep links to /hub/essay-editor/new open the new-polish drawer experience
// on the list page, mirroring the notes-synthesizer flow.
export default function NewEssayRedirect() {
  redirect("/hub/essay-editor?new=1");
}
