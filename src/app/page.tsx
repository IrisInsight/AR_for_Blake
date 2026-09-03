import { redirect } from "next/navigation";

// Single-reader app: the front door is Blake's dashboard.
export default function Home() {
  redirect("/k/blake");
}
