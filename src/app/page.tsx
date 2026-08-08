import { redirect } from "next/navigation";

/** Always the real app's search screen. This used to send logged-out
 * visitors to the external marketing landing page instead — but that meant
 * anyone sent the direct app link (e.g. "https://pawcircle-app.vercel.app"
 * in a personal message) got silently bounced to the landing page's lead
 * form instead of the real signup flow, without realizing it. Intentional
 * traffic to the app must land in the app. */
export default function Home() {
  redirect("/search");
}
