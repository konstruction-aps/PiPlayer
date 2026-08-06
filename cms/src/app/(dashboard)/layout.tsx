import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, clearSessionCookie } from "@/lib/auth";

async function logout() {
  "use server";
  await clearSessionCookie();
  redirect("/");
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <div className="app-shell">
      <header className="topnav">
        <Link href="/pages" className="brand">
          Lumen
        </Link>
        <nav>
          <Link href="/pages">Pages</Link>
          <Link href="/screens">Screens</Link>
          <Link href="/pictures">Pictures</Link>
        </nav>
        <form action={logout}>
          <button type="submit" className="btn soft">
            Sign out
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}
