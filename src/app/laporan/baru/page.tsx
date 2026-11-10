import { redirect } from "next/navigation";

export default function LaporanBaruRedirectPage() {
  redirect("/tickets/new");
}
