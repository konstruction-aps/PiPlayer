import { prisma } from "@/lib/db";
import { requireSession, jsonError, jsonOk } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { error } = await requireSession();
  if (error) return error;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid body");

  const screen = await prisma.screen.update({
    where: { id },
    data: {
      name: body.name !== undefined ? String(body.name) : undefined,
      location: body.location !== undefined ? String(body.location) : undefined,
      layoutId: body.layoutId !== undefined ? body.layoutId || null : undefined,
    },
    include: { layout: { select: { id: true, name: true } } },
  });
  return jsonOk(screen);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { error } = await requireSession();
  if (error) return error;
  const { id } = await ctx.params;
  await prisma.screen.delete({ where: { id } }).catch(() => null);
  return jsonOk({ ok: true });
}
