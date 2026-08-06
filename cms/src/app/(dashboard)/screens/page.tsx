import { prisma } from "@/lib/db";
import { ScreensManager } from "@/components/ScreensManager";

export default async function ScreensPage() {
  const [screens, layouts] = await Promise.all([
    prisma.screen.findMany({
      orderBy: { updatedAt: "desc" },
      include: { layout: { select: { id: true, name: true } } },
    }),
    prisma.layout.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1>Screens</h1>
          <p className="muted">
            Add a screen, give it a pairing code, and choose which page it shows.
          </p>
        </div>
      </div>
      <ScreensManager initialScreens={screens} layouts={layouts} />
      <p className="muted" style={{ marginTop: "1.5rem" }}>
        On a TV or Pi browser, open <code>/pair</code> and type the code. Or preview with the Preview
        button.
      </p>
    </main>
  );
}
