import Link from "next/link";
import { prisma } from "@/lib/db";
import { NewPageButton } from "@/components/NewPageButton";

export default async function PagesIndex() {
  const pages = await prisma.layout.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      elements: { take: 3, orderBy: { zIndex: "asc" } },
      _count: { select: { elements: true, screens: true } },
    },
  });

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1>Pages</h1>
          <p className="muted">Your screen designs — click one to edit like a simple webpage.</p>
        </div>
        <NewPageButton />
      </div>

      <div className="page-grid">
        {pages.map((p) => {
          const title = p.elements.find((e) => e.type === "text" && e.content)?.content;
          return (
            <Link key={p.id} href={`/pages/${p.id}`} className="page-card">
              <div className="thumb" style={{ background: p.backgroundColor }}>
                {title && (
                  <span
                    style={{
                      display: "grid",
                      placeItems: "center",
                      height: "100%",
                      padding: "0.75rem",
                      textAlign: "center",
                      fontFamily: "Georgia, serif",
                      fontSize: "1.05rem",
                      color: "rgba(255,255,255,0.88)",
                      lineHeight: 1.2,
                    }}
                  >
                    {title.slice(0, 48)}
                  </span>
                )}
              </div>
              <div className="meta">
                <h3>{p.name}</h3>
                <p className="muted">
                  {p._count.elements} items
                  {p._count.screens
                    ? ` · on ${p._count.screens} screen${p._count.screens === 1 ? "" : "s"}`
                    : ""}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
      {pages.length === 0 && (
        <p className="muted">No pages yet. Create one and start placing text and pictures.</p>
      )}
    </main>
  );
}
