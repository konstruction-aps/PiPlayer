import { prisma } from "@/lib/db";
import { requireSession, jsonOk } from "@/lib/api";
import { THEMES } from "@/lib/themes";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;
  const layouts = await prisma.layout.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { elements: true, screens: true } } },
  });
  return jsonOk(layouts);
}

export async function POST(req: Request) {
  const { error } = await requireSession();
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "Untitled page").trim() || "Untitled page";
  const themeId = String(body.theme || "welcome");
  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0]!;

  const layout = await prisma.layout.create({
    data: {
      name,
      theme: theme.id,
      backgroundColor: theme.backgroundColor,
      elements: {
        create: theme.elements.map((e, i) => ({
          type: e.type,
          x: e.x,
          y: e.y,
          width: e.width,
          height: e.height,
          zIndex: e.zIndex || i + 1,
          content: e.content ?? null,
          fontFamily: e.fontFamily ?? null,
          fontSize: e.fontSize ?? null,
          fontWeight: e.fontWeight ?? null,
          color: e.color ?? null,
          textAlign: e.textAlign ?? null,
        })),
      },
    },
    include: { elements: true },
  });

  return jsonOk(layout, { status: 201 });
}
