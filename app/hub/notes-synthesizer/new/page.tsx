import { redirect } from "next/navigation";

// The new-session UI is a drawer over the table view. Old /new bookmarks
// redirect into the drawer URL.
export default function NewSessionRedirect() {
  redirect("/hub/notes-synthesizer?new=1");
}
