import { prisma } from "@/lib/db";
import { requireSession, jsonError, jsonOk } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { error } = await requireSession();
  if (error) return error;
  const { id } = await ctx.params;
  const layout = await prisma.layout.findUnique({
    where: { id },
    include: { elements: { orderBy: { zIndex: "asc" } } },
  });
  if (!layout) return jsonError("Not found", 404);
  return jsonOk(layout);
}

export async function PUT(req: Request, ctx: Ctx) {
  const { error } = await requireSession();
  if (error) return error;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid body");

  const existing = await prisma.layout.findUnique({ where: { id } });
  if (!existing) return jsonError("Not found", 404);

  const elements = Array.isArray(body.elements) ? body.elements : [];

  await prisma.$transaction(async (tx) => {
    await tx.layoutElement.deleteMany({ where: { layoutId: id } });
    await tx.layout.update({
      where: { id },
      data: {
        name: String(body.name || existing.name),
        backgroundColor: String(body.backgroundColor || existing.backgroundColor),
        backgroundImage: body.backgroundImage ?? existing.backgroundImage,
        theme: String(body.theme || existing.theme),
        elements: {
          create: elements.map(
            (
              el: {
                type: string;
                x: number;
                y: number;
                width: number;
                height: number;
                rotation?: number;
                zIndex?: number;
                content?: string | null;
                fontFamily?: string | null;
                fontSize?: number | null;
                fontWeight?: string | null;
                color?: string | null;
                textAlign?: string | null;
                imageUrl?: string | null;
                objectFit?: string | null;
              },
              i: number,
            ) => ({
              type: el.type === "image" ? "image" : "text",
              x: Number(el.x) || 0,
              y: Number(el.y) || 0,
              width: Number(el.width) || 100,
              height: Number(el.height) || 100,
              rotation: Number(el.rotation) || 0,
              zIndex: Number(el.zIndex) || i + 1,
              content: el.content ?? null,
              fontFamily: el.fontFamily ?? null,
              fontSize: el.fontSize ?? null,
              fontWeight: el.fontWeight ?? null,
              color: el.color ?? null,
              textAlign: el.textAlign ?? null,
              imageUrl: el.imageUrl ?? null,
              objectFit: el.objectFit ?? null,
            }),
          ),
        },
      },
    });
  });

  const layout = await prisma.layout.findUnique({
    where: { id },
    include: { elements: { orderBy: { zIndex: "asc" } } },
  });
  return jsonOk(layout);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { error } = await requireSession();
  if (error) return error;
  const { id } = await ctx.params;
  await prisma.layout.delete({ where: { id } }).catch(() => null);
  return jsonOk({ ok: true });
}
