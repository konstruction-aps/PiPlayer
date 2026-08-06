import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/pages");

  return (
    <main className="hero-landing">
      <div className="hero-card">
        <p className="brand-mark">Lumen</p>
        <p className="tag">Make a page. Drop in text and pictures. Show it on any screen.</p>
        <LoginForm />
      </div>
    </main>
  );
}
