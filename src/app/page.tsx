import { redirect } from "next/navigation";
import { getOrgSettings } from "@/lib/org-settings";

export default function Home() {
  const settings = getOrgSettings();
  if (settings.openingBalanceStatus !== "Posted-Locked") {
    redirect("/opening-setup");
  }
  redirect("/dashboard");
}
